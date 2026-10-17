import * as THREE from "./assets/vendor/three/three.module.min.js";

const LIGHT_LABELS = { point: "Point", area: "Area", sun: "Sun", spot: "Spot" };
const CAMERA_DEFAULT = { azimuth: 25, elevation: 8, distance: 4.5, focalLength: 50 };
const LIGHT_DEFAULTS = {
  point: { intensity: 4, size: 1, spread: 36 },
  area: { intensity: 3.2, size: 2.4, spread: 36 },
  sun: { intensity: 2.4, size: 1, spread: 36 },
  spot: { intensity: 5, size: 1, spread: 32 }
};

function el(tag, className = "", text) {
  const result = document.createElement(tag);
  if (className) result.className = className;
  if (text !== undefined) result.textContent = text;
  return result;
}

function action(text, className = "") {
  const result = el("button", className, text);
  result.type = "button";
  return result;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function sphericalPosition({ azimuth, elevation, distance }) {
  const azimuthRadians = THREE.MathUtils.degToRad(azimuth);
  const elevationRadians = THREE.MathUtils.degToRad(elevation);
  const horizontal = Math.cos(elevationRadians) * distance;
  return new THREE.Vector3(
    Math.sin(azimuthRadians) * horizontal,
    Math.sin(elevationRadians) * distance,
    Math.cos(azimuthRadians) * horizontal
  );
}

function rangeControl(label, value, min, max, step, unit, onInput) {
  const wrapper = el("label", "studio-range");
  const header = el("span", "studio-range-head");
  const caption = el("span", "", label);
  const readout = el("output", "", `${Number(value).toFixed(step < 1 ? 1 : 0)}${unit}`);
  const input = document.createElement("input");
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.addEventListener("input", () => {
    const next = Number(input.value);
    readout.value = `${next.toFixed(step < 1 ? 1 : 0)}${unit}`;
    onInput(next);
  });
  header.append(caption, readout);
  wrapper.append(header, input);
  return wrapper;
}

export function isAcceptedSpatialImage(file) {
  return Boolean(file && (file.type?.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(file.name || "")));
}

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    if (!isAcceptedSpatialImage(file)) return reject(new Error("Choisis une image PNG, JPEG ou WebP."));
    if (file.size > 24_000_000) return reject(new Error("L’image dépasse 24 Mo."));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lecture de l’image impossible."));
    reader.onload = () => resolve({ src: String(reader.result), name: file.name });
    reader.readAsDataURL(file);
  });
}

export function imageFileFromDataTransfer(dataTransfer) {
  if (!dataTransfer) return null;
  for (const item of Array.from(dataTransfer.items || [])) {
    if (item.kind !== "file" || !item.getAsFile) continue;
    const file = item.getAsFile();
    if (isAcceptedSpatialImage(file)) return file;
  }
  return Array.from(dataTransfer.files || []).find(isAcceptedSpatialImage) || null;
}

function nextLight(type, existing) {
  let suffix = 1;
  const ids = new Set(existing.map(({ id }) => id));
  while (ids.has(`light-${suffix}`)) suffix += 1;
  return {
    id: `light-${suffix}`,
    type,
    color: type === "sun" ? "#fff0cf" : type === "spot" ? "#c4dcff" : "#ffd2a1",
    azimuth: type === "sun" ? 45 : -35 + existing.length * 28,
    elevation: type === "point" ? 10 : 35,
    distance: type === "sun" ? 7 : 4.5,
    ...LIGHT_DEFAULTS[type]
  };
}

function makeLightObject(light, target) {
  const color = new THREE.Color(light.color);
  let source;
  let helper;
  if (light.type === "sun") {
    source = new THREE.DirectionalLight(color, light.intensity);
    source.target = target;
    helper = new THREE.DirectionalLightHelper(source, 0.5, color);
  } else if (light.type === "spot") {
    source = new THREE.SpotLight(color, light.intensity, 0, THREE.MathUtils.degToRad(light.spread), 0.25, 1.3);
    source.target = target;
    helper = new THREE.SpotLightHelper(source, color);
  } else if (light.type === "area") {
    source = new THREE.RectAreaLight(color, light.intensity, light.size, Math.max(0.25, light.size * 0.65));
    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(light.size, Math.max(0.25, light.size * 0.65))),
      new THREE.LineBasicMaterial({ color })
    );
    helper = outline;
  } else {
    source = new THREE.PointLight(color, light.intensity, Math.max(12, light.distance * 3), 1.6);
    helper = new THREE.PointLightHelper(source, 0.22, color);
  }
  source.position.copy(sphericalPosition(light));
  if (light.type === "area") source.lookAt(0, 0, 0);
  if (helper && light.type === "area") helper.position.copy(source.position), helper.lookAt(0, 0, 0);
  const group = new THREE.Group();
  group.add(source);
  if (helper) group.add(helper);
  const beam = new THREE.ArrowHelper(
    new THREE.Vector3().subVectors(new THREE.Vector3(0, 0, 0), source.position).normalize(),
    source.position,
    Math.max(0.5, source.position.length() - 0.35),
    color,
    0.22,
    0.12
  );
  group.add(beam);
  return { group, source, helper };
}

export function mountAngleRelightingStudio({
  container,
  mode,
  cameraState,
  lightsState,
  image,
  onImageChange,
  onCameraChange,
  onLightsChange,
  onError
}) {
  const isLighting = mode === "relighting";
  const camera = { ...CAMERA_DEFAULT, ...(cameraState ?? {}) };
  let lights = (lightsState?.length ? lightsState : [nextLight("area", [])]).map((light) => ({ ...light }));
  let activeLightId = lights[0]?.id;
  let currentImage = image ?? null;
  let disposed = false;
  let frameId = 0;
  let texture = null;
  let drag = null;

  const root = el("div", `spatial-studio ${isLighting ? "is-lighting" : "is-angle"}`);
  const stage = el("section", "spatial-stage");
  const stageHead = el("div", "spatial-stage-head");
  const titleBlock = el("div");
  titleBlock.append(
    el("span", "spatial-kicker", isLighting ? "LIGHT LAB · THREE.JS" : "CAMERA LAB · THREE.JS"),
    el("h3", "", isLighting ? "Relighting spatial" : "Angle spatial")
  );
  const refChip = el("span", "reference-chip", "@image1");
  stageHead.append(titleBlock, refChip);
  const viewport = el("div", "spatial-viewport");
  const empty = el("div", "spatial-empty");
  empty.tabIndex = 0;
  empty.setAttribute("role", "button");
  empty.setAttribute("aria-label", "Importer une image de référence");
  empty.append(el("strong", "", "Dépose une image au centre du plateau"), el("span", "", "PNG · JPEG · WebP"));
  const canvasHost = el("div", "spatial-canvas");
  const hud = el("div", "spatial-hud");
  const hudPrimary = el("strong", "");
  const hudSecondary = el("span", "", isLighting ? "Glisse pour déplacer la lumière sélectionnée · molette pour la distance" : "Glisse pour orbiter la caméra · molette pour la distance");
  hud.append(hudPrimary, hudSecondary);
  viewport.append(canvasHost, empty, hud);
  stage.append(stageHead, viewport);

  const side = el("aside", "spatial-controls");
  const imageSection = el("section", "spatial-panel");
  imageSection.append(el("h4", "", "Référence visuelle"));
  const imageRow = el("div", "spatial-image-row");
  const thumb = document.createElement("img");
  thumb.alt = "Aperçu de @image1";
  const imageMeta = el("div", "spatial-image-meta");
  const imageName = el("strong", "", currentImage?.name || "Aucune image");
  imageMeta.append(imageName, el("span", "reference-token", "@image1"));
  const choose = action(currentImage ? "Remplacer" : "Importer", "secondary compact");
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/png,image/jpeg,image/webp";
  fileInput.hidden = true;
  async function loadImageFile(file) {
    try {
      const next = await fileToImage(file);
      currentImage = next;
      imageName.textContent = next.name;
      choose.textContent = "Remplacer";
      onImageChange(next);
      updateTexture();
      return true;
    } catch (error) {
      onError(error.message);
      return false;
    }
  }
  choose.addEventListener("click", () => fileInput.click());
  empty.addEventListener("click", () => fileInput.click());
  empty.addEventListener("keydown", (event) => {
    if (!["Enter", " "].includes(event.key)) return;
    event.preventDefault(); fileInput.click();
  });
  fileInput.addEventListener("change", async () => {
    await loadImageFile(fileInput.files?.[0]);
    fileInput.value = "";
  });
  let dragDepth = 0;
  viewport.addEventListener("dragenter", (event) => {
    event.preventDefault(); dragDepth += 1; viewport.classList.add("is-drop-target");
  });
  viewport.addEventListener("dragover", (event) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    viewport.classList.add("is-drop-target");
  });
  viewport.addEventListener("dragleave", (event) => {
    event.preventDefault(); dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) viewport.classList.remove("is-drop-target");
  });
  viewport.addEventListener("drop", async (event) => {
    event.preventDefault(); event.stopPropagation(); dragDepth = 0; viewport.classList.remove("is-drop-target");
    const file = imageFileFromDataTransfer(event.dataTransfer);
    if (!file) return onError("Dépose une image PNG, JPEG ou WebP.");
    await loadImageFile(file);
  });
  imageRow.append(thumb, imageMeta, choose, fileInput);
  imageSection.append(imageRow);
  side.append(imageSection);
  const dynamic = el("div", "spatial-dynamic-controls");
  side.append(dynamic);
  root.append(stage, side);
  container.append(root);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x090d10);
  scene.fog = new THREE.Fog(0x090d10, 12, 22);
  const observer = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  observer.position.set(7.2, 4.6, 8.8);
  observer.lookAt(0, 0, 0);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  canvasHost.append(renderer.domElement);

  const target = new THREE.Object3D();
  scene.add(target);
  const grid = new THREE.GridHelper(15, 30, isLighting ? 0x6d5520 : 0x15566b, 0x182126);
  grid.position.y = -2.2;
  scene.add(grid);
  const verticalRing = new THREE.LineLoop(
    new THREE.CircleGeometry(4.5, 96).deleteAttribute("normal").deleteAttribute("uv"),
    new THREE.LineBasicMaterial({ color: isLighting ? 0x715b24 : 0x174f62, transparent: true, opacity: 0.55 })
  );
  verticalRing.geometry.rotateX(Math.PI / 2);
  scene.add(verticalRing);
  const horizontalRing = verticalRing.clone();
  horizontalRing.rotation.x = Math.PI / 2;
  scene.add(horizontalRing);

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(4.5, 3, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x151c20, roughness: 0.65, metalness: 0.3 })
  );
  scene.add(frame);
  const imageMaterial = new THREE.MeshStandardMaterial({ color: 0x232b30, roughness: 0.78, metalness: 0, side: THREE.DoubleSide });
  const imagePlane = new THREE.Mesh(new THREE.PlaneGeometry(4.25, 2.75), imageMaterial);
  imagePlane.position.z = 0.07;
  scene.add(imagePlane);
  const ambient = new THREE.HemisphereLight(0xaac8d5, 0x11100d, isLighting ? 0.28 : 1.6);
  scene.add(ambient);
  const fill = new THREE.DirectionalLight(0xffffff, isLighting ? 0.12 : 2.2);
  fill.position.set(4, 5, 6);
  fill.target = target;
  scene.add(fill);

  let rigGroup = new THREE.Group();
  scene.add(rigGroup);

  function updateTexture() {
    if (texture) texture.dispose();
    texture = null;
    if (!currentImage?.src) {
      thumb.removeAttribute("src");
      empty.hidden = false;
      imageMaterial.map = null;
      imageMaterial.color.set(0x232b30);
      imageMaterial.needsUpdate = true;
      return;
    }
    thumb.src = currentImage.src;
    empty.hidden = true;
    new THREE.TextureLoader().load(currentImage.src, (loaded) => {
      if (disposed) return loaded.dispose();
      texture = loaded;
      texture.colorSpace = THREE.SRGBColorSpace;
      const width = loaded.image?.naturalWidth || loaded.image?.width || 1;
      const height = loaded.image?.naturalHeight || loaded.image?.height || 1;
      const ratio = width / height;
      const maxWidth = 4.25;
      const maxHeight = 2.75;
      const planeWidth = ratio > maxWidth / maxHeight ? maxWidth : maxHeight * ratio;
      const planeHeight = ratio > maxWidth / maxHeight ? maxWidth / ratio : maxHeight;
      imagePlane.scale.set(planeWidth / 4.25, planeHeight / 2.75, 1);
      imageMaterial.map = loaded;
      imageMaterial.color.set(0xffffff);
      imageMaterial.needsUpdate = true;
    }, undefined, () => onError("La texture 3D n’a pas pu être chargée."));
  }

  function rebuildRig() {
    scene.remove(rigGroup);
    rigGroup.traverse((object) => {
      object.geometry?.dispose?.();
      if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose?.());
      else object.material?.dispose?.();
    });
    rigGroup = new THREE.Group();
    scene.add(rigGroup);
    if (isLighting) {
      lights.forEach((light) => {
        const item = makeLightObject(light, target);
        item.group.userData.lightId = light.id;
        item.group.traverse((child) => { child.userData.lightId = light.id; });
        rigGroup.add(item.group);
      });
      const active = lights.find(({ id }) => id === activeLightId) ?? lights[0];
      hudPrimary.textContent = active
        ? `${LIGHT_LABELS[active.type]} · ${active.color.toUpperCase()} · ${active.azimuth.toFixed(0)}° / ${active.elevation.toFixed(0)}°`
        : "Aucune lumière";
    } else {
      const shotCamera = new THREE.PerspectiveCamera(camera.focalLength < 35 ? 58 : camera.focalLength > 85 ? 22 : 38, 16 / 9, 0.15, 2.2);
      shotCamera.position.copy(sphericalPosition(camera));
      shotCamera.lookAt(0, 0, 0);
      shotCamera.updateProjectionMatrix();
      shotCamera.updateMatrixWorld();
      const helper = new THREE.CameraHelper(shotCamera);
      helper.material.color.set(0x48d2ff);
      rigGroup.add(shotCamera, helper);
      const direction = new THREE.Vector3().subVectors(new THREE.Vector3(), shotCamera.position).normalize();
      rigGroup.add(new THREE.ArrowHelper(direction, shotCamera.position, Math.max(0.5, camera.distance - 0.35), 0x48d2ff, 0.22, 0.12));
      hudPrimary.textContent = `AZ ${camera.azimuth.toFixed(1)}° · EL ${camera.elevation.toFixed(1)}° · ${camera.distance.toFixed(2)} m · ${camera.focalLength.toFixed(0)} mm`;
    }
  }

  function emitCamera() {
    onCameraChange({ ...camera });
    rebuildRig();
  }

  function emitLights({ render = false } = {}) {
    onLightsChange(lights.map((light) => ({ ...light })));
    rebuildRig();
    if (render) renderDynamicControls();
  }

  function renderCameraControls() {
    dynamic.replaceChildren();
    const panel = el("section", "spatial-panel");
    panel.append(el("h4", "", "Position caméra"));
    const presets = el("div", "spatial-presets");
    [
      ["Face", 0, 0], ["¾ D", 45, 5], ["Profil D", 90, 0], ["Dos", 180, 0],
      ["Profil G", -90, 0], ["Plongée", 20, 45], ["Contre-plongée", 20, -35]
    ].forEach(([label, azimuth, elevation]) => {
      const preset = action(label, "chip-button");
      preset.addEventListener("click", () => {
        camera.azimuth = azimuth;
        camera.elevation = elevation;
        emitCamera();
        renderCameraControls();
      });
      presets.append(preset);
    });
    panel.append(
      presets,
      rangeControl("Azimut", camera.azimuth, -180, 180, 1, "°", (value) => { camera.azimuth = value; emitCamera(); }),
      rangeControl("Élévation", camera.elevation, -85, 85, 1, "°", (value) => { camera.elevation = value; emitCamera(); }),
      rangeControl("Distance", camera.distance, 2, 10, 0.1, " m", (value) => { camera.distance = value; emitCamera(); }),
      rangeControl("Focale", camera.focalLength, 18, 135, 1, " mm", (value) => { camera.focalLength = value; emitCamera(); })
    );
    dynamic.append(panel);
  }

  function renderLightControls() {
    dynamic.replaceChildren();
    const panel = el("section", "spatial-panel");
    const heading = el("div", "spatial-panel-heading");
    heading.append(el("h4", "", `Lumières · ${lights.length}/8`));
    const addMenu = el("details", "light-add-menu");
    const summary = el("summary", "primary compact", "+ Ajouter une lumière");
    const choices = el("div", "light-add-choices");
    Object.entries(LIGHT_LABELS).forEach(([type, label]) => {
      const choice = action(label);
      choice.setAttribute("aria-label", `Ajouter une lumière ${label}`);
      choice.addEventListener("click", () => {
        if (lights.length >= 8) return onError("Le rig accepte 8 lumières maximum.");
        const light = nextLight(type, lights);
        lights.push(light);
        activeLightId = light.id;
        addMenu.open = false;
        emitLights({ render: true });
      });
      choices.append(choice);
    });
    addMenu.append(summary, choices);
    heading.append(addMenu);
    panel.append(heading);
    const list = el("div", "light-stack");
    lights.forEach((light, index) => {
      const card = el("button", `light-card${light.id === activeLightId ? " is-active" : ""}`);
      card.type = "button";
      const swatch = el("span", "light-swatch");
      swatch.style.background = light.color;
      card.append(swatch, el("strong", "", `${index + 1}. ${LIGHT_LABELS[light.type]}`), el("span", "", `${light.azimuth.toFixed(0)}° / ${light.elevation.toFixed(0)}°`));
      card.addEventListener("click", () => { activeLightId = light.id; renderLightControls(); rebuildRig(); });
      list.append(card);
    });
    panel.append(list);
    const active = lights.find(({ id }) => id === activeLightId);
    if (active) {
      const edit = el("div", "light-editor");
      const colorLabel = el("label", "color-field");
      colorLabel.append(el("span", "", "Couleur"));
      const color = document.createElement("input");
      color.type = "color";
      color.value = active.color;
      color.addEventListener("input", () => { active.color = color.value; emitLights(); });
      colorLabel.append(color);
      const typeLabel = el("label", "select-field");
      typeLabel.append(el("span", "", "Type"));
      const select = document.createElement("select");
      Object.entries(LIGHT_LABELS).forEach(([value, label]) => {
        const option = el("option", "", label);
        option.value = value;
        option.selected = value === active.type;
        select.append(option);
      });
      select.addEventListener("change", () => { active.type = select.value; Object.assign(active, LIGHT_DEFAULTS[active.type]); emitLights({ render: true }); });
      typeLabel.append(select);
      const remove = action("Supprimer", "danger-link");
      remove.disabled = lights.length === 1;
      remove.addEventListener("click", () => {
        lights = lights.filter(({ id }) => id !== active.id);
        activeLightId = lights[0]?.id;
        emitLights({ render: true });
      });
      const row = el("div", "light-editor-head");
      row.append(typeLabel, colorLabel, remove);
      edit.append(
        row,
        rangeControl("Azimut", active.azimuth, -180, 180, 1, "°", (value) => { active.azimuth = value; emitLights(); }),
        rangeControl("Élévation", active.elevation, -85, 85, 1, "°", (value) => { active.elevation = value; emitLights(); }),
        rangeControl("Distance", active.distance, 1, 12, 0.1, " m", (value) => { active.distance = value; emitLights(); }),
        rangeControl("Intensité", active.intensity, 0, 20, 0.1, "", (value) => { active.intensity = value; emitLights(); })
      );
      if (active.type === "area") edit.append(rangeControl("Taille", active.size, 0.25, 8, 0.05, " m", (value) => { active.size = value; emitLights(); }));
      if (active.type === "spot") edit.append(rangeControl("Ouverture", active.spread, 5, 90, 1, "°", (value) => { active.spread = value; emitLights(); }));
      panel.append(edit);
    }
    dynamic.append(panel);
  }

  function renderDynamicControls() {
    if (isLighting) renderLightControls();
    else renderCameraControls();
  }

  renderer.domElement.addEventListener("pointerdown", (event) => {
    renderer.domElement.setPointerCapture(event.pointerId);
    drag = { x: event.clientX, y: event.clientY };
  });
  renderer.domElement.addEventListener("pointermove", (event) => {
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    drag = { x: event.clientX, y: event.clientY };
    if (isLighting) {
      const active = lights.find(({ id }) => id === activeLightId);
      if (!active) return;
      active.azimuth = clamp(active.azimuth + dx * 0.45, -180, 180);
      active.elevation = clamp(active.elevation - dy * 0.35, -85, 85);
      onLightsChange(lights.map((light) => ({ ...light })));
    } else {
      camera.azimuth = clamp(camera.azimuth + dx * 0.45, -180, 180);
      camera.elevation = clamp(camera.elevation - dy * 0.35, -85, 85);
      onCameraChange({ ...camera });
    }
    rebuildRig();
  });
  renderer.domElement.addEventListener("pointerup", () => { drag = null; renderDynamicControls(); });
  renderer.domElement.addEventListener("pointercancel", () => { drag = null; });
  renderer.domElement.addEventListener("wheel", (event) => {
    event.preventDefault();
    if (isLighting) {
      const active = lights.find(({ id }) => id === activeLightId);
      if (!active) return;
      active.distance = clamp(active.distance + Math.sign(event.deltaY) * 0.25, 1, 12);
      onLightsChange(lights.map((light) => ({ ...light })));
    } else {
      camera.distance = clamp(camera.distance + Math.sign(event.deltaY) * 0.25, 2, 10);
      onCameraChange({ ...camera });
    }
    rebuildRig();
    renderDynamicControls();
  }, { passive: false });

  const resize = new ResizeObserver(() => {
    const width = Math.max(320, canvasHost.clientWidth);
    const height = Math.max(360, canvasHost.clientHeight);
    observer.aspect = width / height;
    observer.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  });
  resize.observe(canvasHost);

  function animate() {
    if (disposed) return;
    frameId = requestAnimationFrame(animate);
    renderer.render(scene, observer);
  }

  updateTexture();
  renderDynamicControls();
  rebuildRig();
  animate();

  return () => {
    disposed = true;
    cancelAnimationFrame(frameId);
    resize.disconnect();
    texture?.dispose();
    scene.traverse((object) => {
      object.geometry?.dispose?.();
      if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose?.());
      else object.material?.dispose?.();
    });
    renderer.dispose();
  };
}
