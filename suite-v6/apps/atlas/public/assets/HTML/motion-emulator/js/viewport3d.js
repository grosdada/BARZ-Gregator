/**
 * viewport3d.js — Three.js 3D stick-figure viewport.
 *
 * Renders the 33 MediaPipe *world* landmarks (metric, origin at hip center)
 * as spheres + colored bone segments, with an orbitable camera, ground grid
 * and soft studio lighting. MediaPipe world space has +y pointing down and
 * +z away from the camera, so we map (x, y, z) -> (x, -y, -z) for Three.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { POSE_CONNECTIONS, JOINT_COLORS } from './constants.js';

export class Viewport3D {
  constructor(container) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setClearColor(0x0b0f17);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x0b0f17, 4, 10);

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.05, 100);
    this.camera.position.set(0.9, 0.6, 2.2);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 8;

    // Lights
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(2, 3, 2);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x7dd3fc, 0.5);
    rim.position.set(-2, 1, -2);
    this.scene.add(rim);

    // Ground grid, roughly at foot height for a standing subject
    const grid = new THREE.GridHelper(4, 24, 0x334155, 0x1e293b);
    grid.position.y = -1.0;
    this.scene.add(grid);

    // 33 joint spheres
    const sphereGeo = new THREE.SphereGeometry(0.022, 12, 12);
    this.joints = JOINT_COLORS.map((hex) => {
      const m = new THREE.Mesh(
        sphereGeo,
        new THREE.MeshStandardMaterial({ color: hex, roughness: 0.4, metalness: 0.1 })
      );
      m.visible = false;
      this.scene.add(m);
      return m;
    });

    // Bones as a LineSegments buffer, one segment per connection, vertex colors
    const positions = new Float32Array(POSE_CONNECTIONS.length * 2 * 3);
    const colors = new Float32Array(POSE_CONNECTIONS.length * 2 * 3);
    const c = new THREE.Color();
    POSE_CONNECTIONS.forEach(([, , hex], i) => {
      c.set(hex);
      for (const k of [0, 1]) {
        colors[(i * 2 + k) * 3] = c.r;
        colors[(i * 2 + k) * 3 + 1] = c.g;
        colors[(i * 2 + k) * 3 + 2] = c.b;
      }
    });
    const boneGeo = new THREE.BufferGeometry();
    boneGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    boneGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.bones = new THREE.LineSegments(
      boneGeo,
      new THREE.LineBasicMaterial({ vertexColors: true })
    );
    this.bones.frustumCulled = false;
    this.scene.add(this.bones);

    this._posAttr = boneGeo.getAttribute('position');
    this._resize = this._resize.bind(this);
    new ResizeObserver(this._resize).observe(container);
    this._resize();

    this._animate = this._animate.bind(this);
    requestAnimationFrame(this._animate);
  }

  _resize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  _animate() {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this._animate);
  }

  /** Update the figure from MediaPipe world landmarks (or null to hide). */
  update(world) {
    if (!world) {
      this.joints.forEach((j) => (j.visible = false));
      this.bones.visible = false;
      return;
    }
    this.bones.visible = true;
    const map = (lm) => ({ x: lm.x, y: -lm.y, z: -lm.z, v: lm.visibility ?? 1 });

    for (let i = 0; i < this.joints.length; i++) {
      const p = map(world[i]);
      const j = this.joints[i];
      j.visible = p.v > 0.35;
      j.position.set(p.x, p.y, p.z);
    }
    const arr = this._posAttr.array;
    POSE_CONNECTIONS.forEach(([a, b], i) => {
      const pa = map(world[a]);
      const pb = map(world[b]);
      arr[i * 6] = pa.x; arr[i * 6 + 1] = pa.y; arr[i * 6 + 2] = pa.z;
      arr[i * 6 + 3] = pb.x; arr[i * 6 + 4] = pb.y; arr[i * 6 + 5] = pb.z;
    });
    this._posAttr.needsUpdate = true;
  }
}
