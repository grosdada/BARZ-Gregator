// Reprojection / silhouette-IoU math for the Auto-Blocking engine — pure ESM, zero
// dependencies, runs in Node AND the browser (shared by the pipeline and the bench).
//
// Camera model: three.js convention — the camera looks down its LOCAL -Z, +Y up.
// A pose is {position:[x,y,z], quaternion:[x,y,z,w] (camera->world), fovYDeg, width, height}.
// All silhouettes are convex (every primitive we place is convex in projection), so a
// silhouette = filled convex hull of the projected surface samples.

import { applyQuat } from "./blocking-fit.js";

// Conjugate (inverse for unit quats).
export function quatConjugate(q) { return [-q[0], -q[1], -q[2], q[3]]; }

// Hamilton product a⊗b (apply b first, then a) — matches THREE.Quaternion.multiply.
export function quatMul(a, b) {
  const [ax, ay, az, aw] = a, [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz
  ];
}

// Roll-free look-at orientation (the studio's aimRigAt): YXZ euler with z=0, camera
// forward = local -Z toward the target. Returns [x,y,z,w].
export function lookAtQuatYXZ(pos, target) {
  const fx = target[0] - pos[0], fy = target[1] - pos[1], fz = target[2] - pos[2];
  const L = Math.hypot(fx, fy, fz) || 1;
  const pitch = Math.asin(Math.max(-1, Math.min(1, fy / L)));
  const yaw = Math.atan2(-fx, -fz);
  const qY = [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)];
  const qX = [Math.sin(pitch / 2), 0, 0, Math.cos(pitch / 2)];
  return quatMul(qY, qX);
}

// Ground-relative camera angles from a world quaternion: pitch (deg, + up), roll (deg),
// and ground yaw (deg) of the view direction. Gauge-invariant vs world yaw for pitch/roll.
export function cameraGroundAngles(q) {
  const f = applyQuat(q, 0, 0, -1);
  const r = applyQuat(q, 1, 0, 0);
  const pitch = Math.asin(Math.max(-1, Math.min(1, f[1]))) * 180 / Math.PI;
  const roll = Math.asin(Math.max(-1, Math.min(1, r[1]))) * 180 / Math.PI;
  const yaw = Math.atan2(-f[0], -f[2]) * 180 / Math.PI;
  return { pitch, roll, yaw };
}

// Angle (deg) between two unit quaternions (rotation distance, sign/double-cover safe).
export function quatAngleDeg(a, b) {
  const dot = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]);
  return Math.acos(Math.min(1, dot)) * 2 * 180 / Math.PI;
}

// Make a pinhole projector for a pose. Returns {project(x,y,z) -> [u,v]|null, fPx}.
// Points behind the camera (cam-space z >= -1e-6) return null.
export function makeProjector({ position, quaternion, fovYDeg, width, height }) {
  const qInv = quatConjugate(quaternion);
  const fPx = (height / 2) / Math.tan((fovYDeg * Math.PI / 180) / 2);
  const [px, py, pz] = position;
  return {
    fPx,
    project(x, y, z) {
      const c = applyQuat(qInv, x - px, y - py, z - pz);
      if (c[2] >= -1e-6) return null;                    // behind the lens (-Z is forward)
      const d = -c[2];
      return [width / 2 + fPx * (c[0] / d), height / 2 - fPx * (c[1] / d)];
    }
  };
}

/* ---------------- primitive surface sampling ---------------- */

// Sample the surface of a canonical primitive in LOCAL space (unit dims, base at y=0),
// then scale by dims [sx, sy, sz], yaw-rotate (radians, around +Y) and translate to
// base position [bx, by, bz]. Matches the scene JSON convention (position = base centre,
// scale = full metric extents, rotation = yaw). Curved prims are sampled as ring stacks.
export function samplePrimitiveWorld(type, dims, yawRad, base, density = 8) {
  const [sx, sy, sz] = dims, [bx, by, bz] = base;
  const local = [];
  const push = (x, y, z) => local.push([x * sx, (y + 0.5) * sy, z * sz]); // canonical y in [-0.5,0.5] -> base at 0
  const t = String(type || "box").toLowerCase();
  if (t === "sphere") {
    const R = 6, S = Math.max(6, density);
    for (let i = 0; i <= R; i++) {
      const ph = (i / R) * Math.PI, cy = Math.cos(ph) / 2, r = Math.sin(ph) / 2;
      for (let j = 0; j < S; j++) { const th = (j / S) * 2 * Math.PI; push(r * Math.cos(th), cy, r * Math.sin(th)); }
    }
  } else if (t === "cylinder" || t === "human" || t === "cone" || t === "pyramid" || t === "dome" || t === "torus") {
    // ring stacks: full radius at each level (cone/pyramid taper, dome shrinks upward)
    const L = 5, S = Math.max(8, density * 2);
    for (let i = 0; i <= L; i++) {
      const v = i / L;                                     // 0 base -> 1 top
      let r = 0.5;
      if (t === "cone" || t === "pyramid") r = 0.5 * (1 - v);
      else if (t === "dome") r = 0.5 * Math.cos(v * Math.PI / 2);
      for (let j = 0; j < S; j++) { const th = (j / S) * 2 * Math.PI; push(r * Math.cos(th), v - 0.5, r * Math.sin(th)); }
    }
  } else if (t === "car" || t === "bus") {
    // Vehicle: lower body over the FULL length (local z, front = +z, studio convention)
    // + a cab over the rear-biased mid section only. The missing front-top corner makes
    // the silhouette ASYMMETRIC, which is what lets the 4-way yaw test tell 0° from 180°.
    const g = 3;
    for (let i = 0; i <= g; i++) for (let j = 0; j <= g; j++) for (let k = 0; k <= g; k++) {
      if (i > 0 && i < g && j > 0 && j < g && k > 0 && k < g) continue;
      const y = j / g, z = k / g - 0.5;
      if (y > 0.62 && (z > 0.15 || z < -0.42)) continue;   // no bonnet/boot at cab height
      push(i / g - 0.5, y - 0.5, z);
    }
  } else {
    // box family (box/facade/plane/...): corners + edge/face midpoints
    const g = Math.max(2, Math.min(4, density / 2));
    for (let i = 0; i <= g; i++) for (let j = 0; j <= g; j++) for (let k = 0; k <= g; k++) {
      if (i > 0 && i < g && j > 0 && j < g && k > 0 && k < g) continue;   // surface only
      push(i / g - 0.5, j / g - 0.5, k / g - 0.5);
    }
  }
  const cy2 = Math.cos(yawRad), sy2 = Math.sin(yawRad);
  return local.map(([x, y, z]) => [bx + x * cy2 + z * sy2, by + y, bz - x * sy2 + z * cy2]);
}

/* ---------------- convex hull + rasterisation + IoU ---------------- */

// Andrew monotone chain. pts = [[x,y],...] -> hull (CCW, no duplicate endpoint).
export function convexHull(pts) {
  const P = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (P.length <= 2) return P;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], hi = [];
  for (const p of P) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (hi.length >= 2 && cross(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}

// Scanline-fill a convex polygon into a Uint8 buffer (bw×bh), coordinates already in
// buffer space. Marks 1 inside. Returns pixel count.
export function fillConvex(hull, buf, bw, bh) {
  if (hull.length < 3) return 0;
  let y0 = Infinity, y1 = -Infinity;
  for (const [, y] of hull) { if (y < y0) y0 = y; if (y > y1) y1 = y; }
  y0 = Math.max(0, Math.floor(y0)); y1 = Math.min(bh - 1, Math.ceil(y1));
  let filled = 0;
  for (let y = y0; y <= y1; y++) {
    const yc = y + 0.5;
    let xin = Infinity, xout = -Infinity;
    for (let i = 0; i < hull.length; i++) {
      const [ax, ay] = hull[i], [bx2, by2] = hull[(i + 1) % hull.length];
      if ((ay <= yc && by2 > yc) || (by2 <= yc && ay > yc)) {
        const x = ax + (yc - ay) * (bx2 - ax) / (by2 - ay);
        if (x < xin) xin = x; if (x > xout) xout = x;
      }
    }
    if (xin > xout) continue;
    const xa = Math.max(0, Math.round(xin)), xb = Math.min(bw - 1, Math.round(xout));
    for (let x = xa; x <= xb; x++) { const p = y * bw + x; if (!buf[p]) { buf[p] = 1; filled++; } }
  }
  return filled;
}

// Project one scene object and rasterise its silhouette into a fresh buffer at `scale`
// (buffer = image dims × scale). Returns {buf, bw, bh, count} or null (fully behind).
export function projectSilhouette(obj, pose, scale = 0.5) {
  const yaw = ((obj.rotation?.[1] || 0) * Math.PI) / 180;
  const pts = samplePrimitiveWorld(obj.type, obj.scale || [1, 1, 1], yaw, obj.position || [0, 0, 0]);
  const proj = makeProjector(pose);
  const uv = [];
  for (const [x, y, z] of pts) { const p = proj.project(x, y, z); if (p) uv.push([p[0] * scale, p[1] * scale]); }
  if (uv.length < 3) return null;
  const bw = Math.max(1, Math.round(pose.width * scale)), bh = Math.max(1, Math.round(pose.height * scale));
  const buf = new Uint8Array(bw * bh);
  const count = fillConvex(convexHull(uv), buf, bw, bh);
  return { buf, bw, bh, count, hull: convexHull(uv) };
}

// IoU between a silhouette buffer and a mask (Uint8 W*H, 0/255), mask sampled at the
// buffer's scale (nearest neighbour).
export function silhouetteMaskIoU(sil, mask, W, H) {
  if (!sil) return 0;
  const { buf, bw, bh } = sil;
  const fx = W / bw, fy = H / bh;
  let inter = 0, uni = 0;
  for (let y = 0; y < bh; y++) {
    const sy = Math.min(H - 1, (y * fy) | 0);
    for (let x = 0; x < bw; x++) {
      const s = buf[y * bw + x];
      const m = mask[sy * W + Math.min(W - 1, (x * fx) | 0)] ? 1 : 0;
      if (s && m) inter++;
      if (s || m) uni++;
    }
  }
  return uni ? inter / uni : 0;
}

/* ---------------- horizon + ground grid ---------------- */

// Ground-plane (y=0) horizon line in image space: v(u) solved from (Q·rayDir).y = 0.
// Returns {a, b} with v = a·u + b, or null when the horizon is out of frame/undefined.
export function horizonLine(pose) {
  const { quaternion: q, width: W, height: H, fovYDeg } = pose;
  const f = (H / 2) / Math.tan((fovYDeg * Math.PI / 180) / 2);
  // world-Y row of the rotation matrix from the quaternion (camera->world)
  const [x, y, z, w] = q;
  const r21 = 2 * (x * y + w * z), r22 = 1 - 2 * (x * x + z * z), r23 = 2 * (y * z - w * x);
  // dir_cam(u,v) = ((u-W/2)/f, (H/2-v)/f, -1); world y = r21*dx + r22*dy + r23*dz = 0
  // r21*(u-W/2)/f + r22*(H/2-v)/f - r23 = 0  ->  v = H/2 + (r21*(u-W/2) - r23*f) / r22
  if (Math.abs(r22) < 1e-6) return null;
  const vAt = (u) => H / 2 + (r21 * (u - W / 2) - r23 * f) / r22;
  const v0 = vAt(0), v1 = vAt(W);
  return { a: (v1 - v0) / W, b: v0, vAt };
}

// Sample the y=0 grid (extent±E, step) as projected image segments for overlays.
export function groundGridSegments(pose, E = 10, step = 1) {
  const proj = makeProjector(pose);
  const segs = [];
  const line = (x0, z0, x1, z1) => {
    // subdivide so clipping at the camera plane keeps partial lines
    let prev = null;
    for (let i = 0; i <= 24; i++) {
      const t = i / 24, p = proj.project(x0 + (x1 - x0) * t, 0, z0 + (z1 - z0) * t);
      if (p && prev) segs.push([prev, p]);
      prev = p;
    }
  };
  for (let k = -E; k <= E; k += step) { line(-E, k, E, k); line(k, -E, k, E); }
  return segs;
}
