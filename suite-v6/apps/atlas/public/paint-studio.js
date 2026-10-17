const PROJECT_VERSION = 1;
const CANVAS_PRESETS = {
  "16:9": [1200, 675],
  "9:16": [675, 1200],
  "1:1": [900, 900],
  "3:2": [1200, 800],
  "2:3": [800, 1200]
};

const COLOR_PALETTES = [
  [
    ["Ivoire", "#F2ECCA"], ["Beige", "#B3A089"], ["Taupe", "#766D63"],
    ["Graphite", "#34383C"], ["Bleu ardoise", "#515973"], ["Pétrole", "#496B6D"]
  ],
  [
    ["Corail rosé", "#DE7C68"], ["Terre cuite", "#A66F5B"], ["Ocre", "#A58A52"],
    ["Olive", "#6F7654"], ["Sauge", "#7F9181"], ["Lavande grisée", "#777083"]
  ]
];

const TOOLS = [
  ["select", "Sélection", "V", "cursor"],
  ["hand", "Main", "H", "hand"],
  ["pen", "Crayon", "P", "pencil"],
  ["eraser", "Gomme", "E", "eraser"],
  ["eyedropper", "Pipette", "I", "dropper"],
  ["line", "Ligne", "L", "line"],
  ["arrow", "Flèche", "A", "arrow"],
  ["lasso", "Lasso", "Q", "lasso"],
  ["rect", "Rectangle", "R", "rectangle"],
  ["ellipse", "Ellipse", "O", "circle"],
  ["text", "Texte", "T", "text"]
];

const ICONS = {
  cursor: '<path d="M5 3l12 9-6 1.4 3.6 6.2-2.6 1.4-3.5-6.1L5 19V3z"/>',
  hand: '<path d="M8 11V6a1.5 1.5 0 013 0v4-6a1.5 1.5 0 013 0v6-5a1.5 1.5 0 013 0v6-3a1.5 1.5 0 013 0v6c0 4-2.7 7-7 7h-1.2c-2.1 0-3.6-.8-4.8-2.5L2.3 14A1.7 1.7 0 015 12.1L8 15"/>',
  pencil: '<path d="M4 16l-1 5 5-1L20 8l-4-4L4 16zM14 6l4 4"/>',
  eraser: '<path d="M4 15l8-10a2 2 0 013 0l4 3a2 2 0 010 3l-7 9H7l-3-3a2 2 0 010-2zM10 20l-5-5"/>',
  dropper: '<path d="M14 4l6 6M17 3l4 4-9 9-3-3 8-10zM9 13l-6 6v2h2l6-6"/>',
  line: '<path d="M4 20L20 4"/>',
  arrow: '<path d="M4 20L20 4M13 4h7v7"/>',
  lasso: '<path d="M5 7l5-3 7 2 3 6-4 7-8 1-5-6 2-7z"/><path d="M5 7l15 5" stroke-dasharray="2 2"/>',
  rectangle: '<rect x="4" y="5" width="16" height="14" rx="1"/>',
  circle: '<circle cx="12" cy="12" r="8"/>',
  text: '<path d="M5 5h14M12 5v15M8 20h8"/>',
  undo: '<path d="M9 7H4v-5M4 7c3-4 10-5 14-1s3 11-2 14"/>',
  redo: '<path d="M15 7h5v-5M20 7c-3-4-10-5-14-1s-3 11 2 14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  fit: '<path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5"/>',
  import: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
  save: '<path d="M5 3h12l3 3v15H4V3h1zm3 0v6h8V3M8 21v-8h8v8"/>',
  export: '<path d="M12 15V3M7 8l5-5 5 5M4 13v8h16v-8"/>',
  trash: '<path d="M5 7h14M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M3 3l18 18M10.6 5.2A10 10 0 0112 5c6 0 10 7 10 7a18 18 0 01-2.1 3M6.2 6.2C3.6 8.1 2 12 2 12s4 7 10 7c1.7 0 3.2-.5 4.5-1.2M9.9 9.9a3 3 0 004.2 4.2"/>',
  duplicate: '<rect x="8" y="8" width="11" height="12" rx="1"/><path d="M5 16H4V4h11v1"/>',
  up: '<path d="M12 20V4M6 10l6-6 6 6"/>',
  down: '<path d="M12 4v16M6 14l6 6 6-6"/>',
  flip: '<path d="M4 7h10M10 3l4 4-4 4M20 17H10M14 13l-4 4 4 4"/>'
};

function icon(name) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
}

function clone(value) {
  return structuredClone(value);
}

function uid(prefix = "paint") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function safeName(value, fallback = "paint-studio") {
  const cleaned = String(value || "").trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-");
  return cleaned || fallback;
}

export function normalizePaintProject(input) {
  if (!input || typeof input !== "object") throw new TypeError("Projet Paint invalide.");
  const width = Math.round(Number(input.canvas?.width));
  const height = Math.round(Number(input.canvas?.height));
  if (input.version !== PROJECT_VERSION || width < 64 || height < 64 || width > 8000 || height > 8000) {
    throw new TypeError("Format de projet Paint non pris en charge.");
  }
  const layers = Array.isArray(input.layers) ? input.layers.slice(0, 100).map((layer, index) => ({
    id: typeof layer.id === "string" ? layer.id : `layer-${index + 1}`,
    name: String(layer.name || `Calque ${index + 1}`).slice(0, 100),
    visible: layer.visible !== false
  })) : [];
  if (!layers.length) layers.push({ id: "layer-1", name: "Calque 1", visible: true });
  const layerIds = new Set(layers.map(({ id }) => id));
  const objects = Array.isArray(input.objects) ? input.objects.slice(0, 10_000)
    .filter((object) => object && typeof object === "object" && layerIds.has(object.layerId))
    .map((object) => clone(object)) : [];
  return {
    version: PROJECT_VERSION,
    name: String(input.name || "Projet sans titre").slice(0, 100),
    canvas: {
      width, height,
      background: ["transparent", "black", "white", "custom"].includes(input.canvas.background) ? input.canvas.background : "transparent",
      backgroundColor: /^#[0-9a-f]{6}$/i.test(input.canvas.backgroundColor || "") ? input.canvas.backgroundColor : "#ffffff"
    },
    layers,
    objects
  };
}

export function createPaintSnapshot(state) {
  return normalizePaintProject({
    version: PROJECT_VERSION,
    name: state.name,
    canvas: { width: state.width, height: state.height, background: state.background, backgroundColor: state.backgroundColor },
    layers: state.layers,
    objects: state.objects
  });
}

export function paintProjectBlob(state) {
  return new Blob([JSON.stringify(createPaintSnapshot(state), null, 2)], { type: "application/json" });
}

export async function savePaintProjectNative(project, suggestedName, fetchImplementation = fetch) {
  const response = await fetchImplementation("/api/v1/tools/paint-studio/save-project", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project, suggestedName })
  });
  if (!response.ok) throw new Error(`L’enregistrement natif a répondu ${response.status}.`);
  return response.json();
}

function element(tag, className = "", text = "") {
  const result = document.createElement(tag);
  if (className) result.className = className;
  if (text) result.textContent = text;
  return result;
}

function iconButton(label, iconName, className = "") {
  const control = element("button", `paint-icon-button ${className}`.trim());
  control.type = "button";
  control.setAttribute("aria-label", label);
  control.title = label;
  control.innerHTML = `${icon(iconName)}<span>${label}</span>`;
  return control;
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function hexFromPixel(data) {
  return `#${[data[0], data[1], data[2]].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

const PAINT_SHAPES = new Set(["rect", "ellipse", "lasso"]);
const TRANSPARENT_PAINT = "transparent";

export function paintLassoIsClosed(object) {
  return object?.closed !== false;
}

export function paintObjectStyle(object) {
  const fallback = object?.color || "#ff5b3a";
  if (!object || object.type === "image") return { strokeColor: TRANSPARENT_PAINT, fillColor: TRANSPARENT_PAINT };
  if (object.type === "text") return { strokeColor: TRANSPARENT_PAINT, fillColor: object.fillColor || fallback };
  if (PAINT_SHAPES.has(object.type)) {
    if (typeof object.strokeColor === "string" || typeof object.fillColor === "string") {
      return { strokeColor: object.strokeColor || TRANSPARENT_PAINT, fillColor: object.fillColor || TRANSPARENT_PAINT };
    }
    return object.filled
      ? { strokeColor: TRANSPARENT_PAINT, fillColor: fallback }
      : { strokeColor: fallback, fillColor: TRANSPARENT_PAINT };
  }
  return { strokeColor: object.strokeColor || fallback, fillColor: TRANSPARENT_PAINT };
}

export function setPaintObjectStrokeEnabled(object, enabled, enabledColor = "#ff5b3a") {
  if (!object || !["path", "line", "arrow", "rect", "ellipse", "lasso"].includes(object.type)) return false;
  const fillColor = paintObjectStyle(object).fillColor;
  object.strokeColor = enabled ? enabledColor : TRANSPARENT_PAINT;
  object.color = enabled ? enabledColor : (fillColor === TRANSPARENT_PAINT ? enabledColor : fillColor);
  return true;
}

export function setPaintObjectFillEnabled(object, enabled, enabledColor = "#F2ECCA") {
  if (!object || !PAINT_SHAPES.has(object.type)) return false;
  const strokeColor = paintObjectStyle(object).strokeColor;
  object.fillColor = enabled ? enabledColor : TRANSPARENT_PAINT;
  object.filled = enabled;
  object.color = strokeColor === TRANSPARENT_PAINT ? enabledColor : strokeColor;
  return true;
}

export function pointInPaintPolygon(points, point) {
  if (!Array.isArray(points) || points.length < 3) return false;
  let inside = false;
  for (let current = 0, previous = points.length - 1; current < points.length; previous = current, current += 1) {
    const a = points[current]; const b = points[previous];
    const intersects = ((a.y > point.y) !== (b.y > point.y))
      && point.x < ((b.x - a.x) * (point.y - a.y)) / ((b.y - a.y) || Number.EPSILON) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function paintLassoFillContainsPoint(object, point) {
  return object?.type === "lasso"
    && paintObjectStyle(object).fillColor !== TRANSPARENT_PAINT
    && pointInPaintPolygon(object.points, point);
}

function rotatePoint(point, center, angle) {
  const cosine = Math.cos(angle); const sine = Math.sin(angle);
  const dx = point.x - center.x; const dy = point.y - center.y;
  return { x: center.x + dx * cosine - dy * sine, y: center.y + dx * sine + dy * cosine };
}

function bounds(object) {
  if (["path", "eraser", "lasso"].includes(object.type)) {
    if (!object.points?.length) return { x: 0, y: 0, w: 1, h: 1 };
    const xs = object.points.map(({ x }) => x);
    const ys = object.points.map(({ y }) => y);
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }
  if (["line", "arrow"].includes(object.type)) {
    return { x: Math.min(object.x1, object.x2), y: Math.min(object.y1, object.y2), w: Math.abs(object.x2 - object.x1), h: Math.abs(object.y2 - object.y1) };
  }
  const box = { x: object.x, y: object.y, w: object.w || 1, h: object.h || 1 };
  const angle = Number(object.rotation) || 0;
  if (!angle) return box;
  const center = { x: box.x + box.w / 2, y: box.y + box.h / 2 };
  const corners = [
    { x: box.x, y: box.y }, { x: box.x + box.w, y: box.y },
    { x: box.x + box.w, y: box.y + box.h }, { x: box.x, y: box.y + box.h }
  ].map((point) => rotatePoint(point, center, angle));
  const xs = corners.map(({ x }) => x); const ys = corners.map(({ y }) => y);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

export function paintSelectionBounds(objects) {
  if (!Array.isArray(objects) || !objects.length) return null;
  const boxes = objects.map(bounds);
  const left = Math.min(...boxes.map(({ x }) => x)); const top = Math.min(...boxes.map(({ y }) => y));
  const right = Math.max(...boxes.map(({ x, w }) => x + w)); const bottom = Math.max(...boxes.map(({ y, h }) => y + h));
  return { x: left, y: top, w: right - left, h: bottom - top };
}

export function scalePaintObjectFromAnchor(object, anchor, scaleX, scaleY) {
  const result = clone(object);
  const scalePoint = (point) => ({ x: anchor.x + (point.x - anchor.x) * scaleX, y: anchor.y + (point.y - anchor.y) * scaleY });
  if (["path", "eraser", "lasso"].includes(result.type)) result.points = result.points.map(scalePoint);
  else if (["line", "arrow"].includes(result.type)) {
    const start = scalePoint({ x: result.x1, y: result.y1 }); const end = scalePoint({ x: result.x2, y: result.y2 });
    result.x1 = start.x; result.y1 = start.y; result.x2 = end.x; result.y2 = end.y;
  } else {
    const origin = scalePoint({ x: result.x, y: result.y });
    result.x = origin.x; result.y = origin.y; result.w = Math.max(1, result.w * scaleX); result.h = Math.max(1, result.h * scaleY);
    if (result.type === "text") result.fontSize = Math.max(8, (result.fontSize || 42) * Math.sqrt(Math.abs(scaleX * scaleY)));
  }
  return result;
}

export function rotatePaintObjectAround(object, center, angle) {
  const result = clone(object);
  if (["path", "eraser", "lasso"].includes(result.type)) result.points = result.points.map((point) => rotatePoint(point, center, angle));
  else if (["line", "arrow"].includes(result.type)) {
    const start = rotatePoint({ x: result.x1, y: result.y1 }, center, angle); const end = rotatePoint({ x: result.x2, y: result.y2 }, center, angle);
    result.x1 = start.x; result.y1 = start.y; result.x2 = end.x; result.y2 = end.y;
  } else {
    const objectCenter = rotatePoint({ x: result.x + result.w / 2, y: result.y + result.h / 2 }, center, angle);
    result.x = objectCenter.x - result.w / 2; result.y = objectCenter.y - result.h / 2;
    result.rotation = (Number(result.rotation) || 0) + angle;
  }
  return result;
}

export function paintObjectIntersectsMarquee(object, start, end) {
  if (!object || !start || !end) return false;
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const right = Math.max(start.x, end.x);
  const bottom = Math.max(start.y, end.y);
  const box = bounds(object);
  return box.x + Math.max(1, box.w) >= left
    && box.x <= right
    && box.y + Math.max(1, box.h) >= top
    && box.y <= bottom;
}

function pointDistanceToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const denominator = dx * dx + dy * dy;
  const t = denominator ? Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / denominator)) : 0;
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

function hitObject(object, point) {
  if (["line", "arrow"].includes(object.type)) return pointDistanceToSegment(point, { x: object.x1, y: object.y1 }, { x: object.x2, y: object.y2 }) <= Math.max(10, object.width + 6);
  if (["path", "eraser", "lasso"].includes(object.type)) {
    if (paintLassoFillContainsPoint(object, point)) return true;
    for (let index = 1; index < object.points.length; index += 1) {
      if (pointDistanceToSegment(point, object.points[index - 1], object.points[index]) <= Math.max(10, object.width + 6)) return true;
    }
    if (object.type === "lasso" && paintLassoIsClosed(object) && object.points.length > 2) {
      return pointDistanceToSegment(point, object.points.at(-1), object.points[0]) <= Math.max(10, object.width + 6);
    }
    return false;
  }
  const box = bounds(object);
  return point.x >= box.x - 8 && point.x <= box.x + box.w + 8 && point.y >= box.y - 8 && point.y <= box.y + box.h + 8;
}

function translateObject(object, dx, dy) {
  if (["path", "eraser", "lasso"].includes(object.type)) object.points.forEach((point) => { point.x += dx; point.y += dy; });
  else if (["line", "arrow"].includes(object.type)) { object.x1 += dx; object.x2 += dx; object.y1 += dy; object.y2 += dy; }
  else { object.x += dx; object.y += dy; }
}

function drawArrowHead(ctx, from, to, size) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - size * Math.cos(angle - Math.PI / 6), to.y - size * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - size * Math.cos(angle + Math.PI / 6), to.y - size * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
}

function wrappedTextLines(ctx, text, maxWidth) {
  const result = [];
  String(text || "").split("\n").forEach((paragraph) => {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) { result.push(""); return; }
    let line = words.shift();
    words.forEach((word) => {
      const candidate = `${line} ${word}`;
      if (ctx.measureText(candidate).width <= maxWidth || !line) line = candidate;
      else { result.push(line); line = word; }
    });
    result.push(line);
  });
  return result;
}

function drawObject(ctx, object, imageCache) {
  ctx.save();
  ctx.globalAlpha = object.opacity ?? 1;
  if (Number(object.rotation) && ["rect", "ellipse", "text", "image"].includes(object.type)) {
    const centerX = object.x + object.w / 2; const centerY = object.y + object.h / 2;
    ctx.translate(centerX, centerY); ctx.rotate(Number(object.rotation)); ctx.translate(-centerX, -centerY);
  }
  const style = paintObjectStyle(object);
  ctx.strokeStyle = style.strokeColor === TRANSPARENT_PAINT ? "rgba(0,0,0,0)" : style.strokeColor;
  ctx.fillStyle = style.fillColor === TRANSPARENT_PAINT ? "rgba(0,0,0,0)" : style.fillColor;
  ctx.lineWidth = object.width || 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (object.dashed) ctx.setLineDash([
    Math.max(1, Number(object.dashLength) || Math.max(8, ctx.lineWidth * 2)),
    Math.max(1, Number(object.dashGap) || Math.max(6, ctx.lineWidth * 1.5))
  ]);
  if (object.type === "eraser") ctx.globalCompositeOperation = "destination-out";
  if (["path", "eraser"].includes(object.type)) {
    ctx.beginPath();
    object.points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    ctx.stroke();
  } else if (["line", "arrow"].includes(object.type)) {
    ctx.beginPath(); ctx.moveTo(object.x1, object.y1); ctx.lineTo(object.x2, object.y2); ctx.stroke();
    if (object.type === "arrow") {
      if (object.arrowStart) drawArrowHead(ctx, { x: object.x2, y: object.y2 }, { x: object.x1, y: object.y1 }, Math.max(14, object.width * 3));
      if (object.arrowEnd !== false) drawArrowHead(ctx, { x: object.x1, y: object.y1 }, { x: object.x2, y: object.y2 }, Math.max(14, object.width * 3));
    }
  } else if (object.type === "lasso") {
    ctx.beginPath();
    object.points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    if (paintLassoIsClosed(object)) ctx.closePath();
    // Canvas fill closes the surface geometrically without adding the missing
    // closing edge to the stroked path. An open lasso therefore stays filled
    // while its visible contour remains open.
    if (style.fillColor !== TRANSPARENT_PAINT) ctx.fill();
    if (style.strokeColor !== TRANSPARENT_PAINT) ctx.stroke();
  } else if (object.type === "rect") {
    if (style.fillColor !== TRANSPARENT_PAINT) ctx.fillRect(object.x, object.y, object.w, object.h);
    if (style.strokeColor !== TRANSPARENT_PAINT) ctx.strokeRect(object.x, object.y, object.w, object.h);
  } else if (object.type === "ellipse") {
    ctx.beginPath();
    ctx.ellipse(object.x + object.w / 2, object.y + object.h / 2, Math.abs(object.w / 2), Math.abs(object.h / 2), 0, 0, Math.PI * 2);
    if (style.fillColor !== TRANSPARENT_PAINT) ctx.fill();
    if (style.strokeColor !== TRANSPARENT_PAINT) ctx.stroke();
  } else if (object.type === "text") {
    ctx.font = `${object.fontSize || 42}px ${object.fontFamily || "Arial"}`;
    ctx.textBaseline = "top";
    const lineHeight = (object.fontSize || 42) * 1.15;
    ctx.beginPath(); ctx.rect(object.x, object.y, Math.max(1, object.w || 220), Math.max(1, object.h || lineHeight)); ctx.clip();
    wrappedTextLines(ctx, object.text || "Texte", Math.max(1, object.w || 220)).forEach((line, index) => {
      if ((index + 1) * lineHeight <= (object.h || lineHeight) + .5) ctx.fillText(line, object.x, object.y + index * lineHeight);
    });
  } else if (object.type === "image") {
    const image = imageCache.get(object.src);
    if (image?.complete) ctx.drawImage(image, object.x, object.y, object.w, object.h);
  }
  ctx.restore();
}

export function mountPaintStudio({ host, header, configuration, onDirty, toast, incomingImage = null, onIncomingConsumed = () => {} }) {
  configuration.backgroundColor ||= "#ffffff";
  configuration.strokeColor ||= configuration.color || "#ff5b3a";
  configuration.fillColor ||= "#F2ECCA";
  // One-time migration from the former built-in 8px default. Deliberate custom
  // widths remain untouched after this marker has been written.
  try {
    const widthMigrationKey = "barz-paint-default-width-3px-v1";
    if (!localStorage.getItem(widthMigrationKey)) {
      if (configuration.strokeWidth === 8) { configuration.strokeWidth = 3; onDirty(); }
      localStorage.setItem(widthMigrationKey, "1");
    }
  } catch {}
  const [initialWidth, initialHeight] = CANVAS_PRESETS[configuration.canvasPreset] || CANVAS_PRESETS["16:9"];
  const firstLayer = { id: uid("layer"), name: "Calque 1", visible: true };
  const state = {
    name: "Projet sans titre", width: initialWidth, height: initialHeight,
    background: configuration.background, backgroundColor: configuration.backgroundColor, tool: "select", zoom: 0.72,
    layers: [firstLayer], activeLayerId: firstLayer.id, objects: [], selectedId: null, selectedIds: [],
    strokeEnabled: true, filled: true, dashed: false, lassoClosed: true, arrowStart: false, arrowEnd: true,
    history: [], historyIndex: -1, historyLabels: [], interaction: null
  };
  const imageCache = new Map();
  let renderQueued = false;

  const shell = element("section", "paint-studio");
  const documentBar = element("div", "paint-document-bar");
  const titleGroup = element("div", "paint-document-title");
  const titleInput = element("input");
  titleInput.value = state.name;
  titleInput.setAttribute("aria-label", "Nom du projet");
  titleInput.placeholder = "Nom du projet";
  const projectNameLabel = element("label", "paint-project-name-field");
  projectNameLabel.append(element("span", "", "Nom du projet"), titleInput);
  const dimensions = element("small", "", `${state.width} × ${state.height} px`);
  const projectPath = element("small", "paint-project-path", "Non enregistré");
  titleGroup.append(projectNameLabel, dimensions, projectPath);
  documentBar.append(titleGroup);

  const fileInput = element("input"); fileInput.type = "file"; fileInput.accept = "image/*"; fileInput.hidden = true;
  const projectInput = element("input"); projectInput.type = "file"; projectInput.accept = ".barzpaint,application/json"; projectInput.hidden = true;
  const importButton = iconButton("Importer une image", "import", "paint-button-wide");
  const loadButton = iconButton("Ouvrir un projet", "import", "paint-button-wide");
  const saveButton = iconButton("Enregistrer le projet", "save", "paint-button-wide");
  const clearButton = iconButton("Effacer le canevas", "trash", "paint-button-wide");
  const exportButton = iconButton("Exporter l’image", "export", "paint-button-wide paint-primary");
  const documentActions = element("div", "paint-document-actions");
  documentActions.append(importButton, loadButton, saveButton, clearButton, exportButton, fileInput, projectInput);
  documentBar.append(documentActions);

  const contextBar = element("div", "paint-context-bar");
  const undo = iconButton("Annuler · Ctrl Z", "undo");
  const redo = iconButton("Rétablir · Ctrl Shift Z", "redo");
  const historyButtons = element("div", "paint-context-group"); historyButtons.append(undo, redo);

  const strokeLabel = element("label", "paint-color-control paint-style-control");
  const strokeToggle = element("input"); strokeToggle.type = "checkbox"; strokeToggle.checked = state.strokeEnabled; strokeToggle.setAttribute("aria-label", "Activer le contour");
  const strokeTitle = element("span", "", "Contour");
  const color = element("input"); color.type = "color"; color.value = configuration.strokeColor; color.setAttribute("aria-label", "Couleur du contour");
  strokeLabel.append(strokeToggle, strokeTitle, color);
  const fillLabel = element("label", "paint-color-control paint-style-control");
  const filled = element("input"); filled.type = "checkbox"; filled.checked = state.filled; filled.setAttribute("aria-label", "Activer le fond");
  const fillTitle = element("span", "", "Fond");
  const fillColor = element("input"); fillColor.type = "color"; fillColor.value = configuration.fillColor; fillColor.setAttribute("aria-label", "Couleur du fond de l’objet");
  fillLabel.append(filled, fillTitle, fillColor);
  const palettes = element("div", "paint-palettes"); palettes.setAttribute("aria-label", "Palettes de couleurs");
  COLOR_PALETTES.forEach((values, paletteIndex) => {
    const row = element("div", "paint-palette-row"); row.setAttribute("aria-label", `Palette ${paletteIndex + 1}`);
    values.forEach(([name, value]) => {
      const swatch = element("button", "paint-swatch"); swatch.type = "button"; swatch.title = `${name} · ${value}`; swatch.setAttribute("aria-label", `Choisir ${name}, ${value}`); swatch.style.setProperty("--paint-swatch", value); swatch.dataset.color = value; row.append(swatch);
    });
    palettes.append(row);
  });
  const widthLabel = element("label", "paint-range-control");
  widthLabel.append(element("span", "", "Taille"));
  const width = element("input"); width.type = "range"; width.min = "1"; width.max = "100"; width.value = String(configuration.strokeWidth);
  const widthValue = element("output", "", `${configuration.strokeWidth} px`); widthLabel.append(width, widthValue);
  const opacityLabel = element("label", "paint-range-control");
  opacityLabel.append(element("span", "", "Opacité"));
  const opacity = element("input"); opacity.type = "range"; opacity.min = "5"; opacity.max = "100"; opacity.value = String(Math.round(configuration.opacity * 100));
  const opacityValue = element("output", "", `${Math.round(configuration.opacity * 100)}%`); opacityLabel.append(opacity, opacityValue);
  const dashedLabel = element("label", "paint-check"); const dashed = element("input"); dashed.type = "checkbox"; dashedLabel.append(dashed, element("span", "", "Pointillé"));
  const lassoClosedLabel = element("label", "paint-check"); const lassoClosed = element("input"); lassoClosed.type = "checkbox"; lassoClosed.checked = true; lassoClosedLabel.append(lassoClosed, element("span", "", "Closed shape")); lassoClosedLabel.hidden = true;
  const dashLengthLabel = element("label", "paint-range-control paint-dash-control");
  dashLengthLabel.append(element("span", "", "Trait"));
  const dashLength = element("input"); dashLength.type = "range"; dashLength.min = "1"; dashLength.max = "80"; dashLength.value = "12";
  const dashLengthValue = element("output", "", "12 px"); dashLengthLabel.append(dashLength, dashLengthValue);
  const dashGapLabel = element("label", "paint-range-control paint-dash-control");
  dashGapLabel.append(element("span", "", "Espace"));
  const dashGap = element("input"); dashGap.type = "range"; dashGap.min = "1"; dashGap.max = "80"; dashGap.value = "8";
  const dashGapValue = element("output", "", "8 px"); dashGapLabel.append(dashGap, dashGapValue);
  const toolOptions = element("div", "paint-context-group paint-context-options");
  toolOptions.append(strokeLabel, fillLabel, palettes, widthLabel, opacityLabel, dashedLabel, dashLengthLabel, dashGapLabel, lassoClosedLabel);
  contextBar.append(historyButtons, toolOptions);

  const body = element("div", "paint-body");
  const rail = element("nav", "paint-tool-rail"); rail.setAttribute("aria-label", "Outils Paint");
  const toolButtons = new Map();
  for (const [id, label, shortcut, iconName] of TOOLS) {
    const control = iconButton(`${label} · ${shortcut}`, iconName);
    control.dataset.tool = id;
    const badge = element("kbd", "", shortcut); control.append(badge);
    toolButtons.set(id, control); rail.append(control);
  }

  const stage = element("section", "paint-stage");
  const viewport = element("div", "paint-viewport");
  const canvasWrap = element("div", "paint-canvas-wrap");
  const canvas = element("canvas");
  canvas.width = state.width; canvas.height = state.height; canvas.tabIndex = 0; canvas.setAttribute("aria-label", "Canevas Paint Studio");
  canvasWrap.append(canvas); viewport.append(canvasWrap);
  const stageFooter = element("div", "paint-stage-footer");
  const status = element("span", "paint-status", "Prêt");
  const zoomControls = element("div", "paint-zoom-controls");
  const zoomOut = iconButton("Réduire", "minus"); const zoomValue = element("button", "paint-zoom-value", "72%"); zoomValue.type = "button";
  const zoomIn = iconButton("Agrandir", "plus"); const fit = iconButton("Ajuster", "fit");
  zoomControls.append(zoomOut, zoomValue, zoomIn, fit); stageFooter.append(status, zoomControls);
  stage.append(viewport, stageFooter);

  const inspector = element("aside", "paint-inspector");
  const tabs = element("div", "paint-inspector-tabs");
  const panels = new Map();
  const tabButtons = new Map();
  for (const [id, label] of [["layers", "Calques"], ["properties", "Propriétés"], ["history", "Historique"]]) {
    const control = element("button", "", label); control.type = "button"; control.dataset.panel = id; tabs.append(control); tabButtons.set(id, control);
    const panel = element("section", "paint-inspector-panel"); panel.dataset.panel = id; panels.set(id, panel);
  }
  inspector.append(tabs, ...panels.values());
  body.append(rail, stage, inspector);
  shell.append(documentBar, contextBar, body);
  host.replaceChildren(header, shell);

  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  function setStatus(text) { status.textContent = text; }
  function activeLayer() { return state.layers.find(({ id }) => id === state.activeLayerId) || state.layers[0]; }
  function selectedObjects() {
    if (!state.selectedId) return [];
    const ids = Array.isArray(state.selectedIds) && state.selectedIds.includes(state.selectedId)
      ? new Set(state.selectedIds)
      : new Set([state.selectedId]);
    return state.objects.filter(({ id }) => ids.has(id));
  }
  function selectedObject() { return state.objects.find(({ id }) => id === state.selectedId) || null; }
  function setSelection(objects) {
    const selected = [...new Map((objects || []).map((object) => [object.id, object])).values()];
    state.selectedIds = selected.map(({ id }) => id);
    state.selectedId = selected[0]?.id || null;
  }
  function clearSelection() { state.selectedId = null; state.selectedIds = []; }
  function selectionHandles(objects = selectedObjects()) {
    const box = paintSelectionBounds(objects); if (!box) return null;
    const padding = 6 / state.zoom; const offset = 34 / state.zoom;
    const frame = { x: box.x - padding, y: box.y - padding, w: Math.max(12 / state.zoom, box.w + padding * 2), h: Math.max(12 / state.zoom, box.h + padding * 2) };
    return {
      frame,
      scale: {
        nw: { x: frame.x, y: frame.y }, ne: { x: frame.x + frame.w, y: frame.y },
        sw: { x: frame.x, y: frame.y + frame.h }, se: { x: frame.x + frame.w, y: frame.y + frame.h }
      },
      rotate: { x: frame.x + frame.w / 2, y: frame.y - offset },
      center: { x: frame.x + frame.w / 2, y: frame.y + frame.h / 2 }
    };
  }
  function selectionHandleAt(point) {
    const handles = selectionHandles(); if (!handles) return null;
    const radius = 13 / state.zoom;
    if (Math.hypot(point.x - handles.rotate.x, point.y - handles.rotate.y) <= radius) return { type: "rotate", handles };
    for (const [corner, position] of Object.entries(handles.scale)) {
      if (Math.abs(point.x - position.x) <= radius && Math.abs(point.y - position.y) <= radius) return { type: "scale", corner, handles };
    }
    return null;
  }
  let textEditor = null;
  function closeTextEditor({ commit = true } = {}) {
    if (!textEditor) return;
    const { node, object } = textEditor;
    if (commit) {
      object.text = node.value;
      object.w = Math.max(48 / state.zoom, node.offsetWidth / state.zoom);
      object.h = Math.max(28 / state.zoom, node.offsetHeight / state.zoom);
      snapshot("Texte modifié");
    }
    node.remove(); textEditor = null; renderProperties(); requestRender();
  }
  function openTextEditor(object) {
    if (!object || object.type !== "text") return;
    closeTextEditor();
    state.selectedId = object.id; state.activeLayerId = object.layerId; state.tool = "select";
    const editor = element("textarea", "paint-text-editor");
    editor.value = object.text || "";
    Object.assign(editor.style, {
      left: `${object.x * state.zoom}px`, top: `${object.y * state.zoom}px`,
      width: `${Math.max(48, (object.w || 220) * state.zoom)}px`, height: `${Math.max(28, (object.h || 60) * state.zoom)}px`,
      fontFamily: object.fontFamily || "Arial", fontSize: `${(object.fontSize || 42) * state.zoom}px`
    });
    editor.addEventListener("input", () => { object.text = editor.value; requestRender(); });
    editor.addEventListener("keydown", (event) => {
      if (event.key === "Escape") { event.preventDefault(); closeTextEditor({ commit: false }); }
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); closeTextEditor(); }
    });
    editor.addEventListener("blur", () => closeTextEditor(), { once: true });
    canvasWrap.append(editor); textEditor = { node: editor, object };
    syncToolbarFromSelection(); selectPanel("properties"); renderLayers(); renderProperties(); requestRender();
    editor.focus(); editor.select();
  }
  function syncToolbarFromSelection() {
    const selected = selectedObject();
    if (!selected) return;
    const selectedStyle = paintObjectStyle(selected);
    if (["path", "line", "arrow", "rect", "ellipse", "lasso"].includes(selected.type)) {
      strokeToggle.checked = selectedStyle.strokeColor !== TRANSPARENT_PAINT;
      state.strokeEnabled = strokeToggle.checked;
      if (/^#[0-9a-f]{6}$/i.test(selectedStyle.strokeColor)) color.value = selectedStyle.strokeColor;
    }
    if (PAINT_SHAPES.has(selected.type)) {
      filled.checked = selectedStyle.fillColor !== TRANSPARENT_PAINT;
      state.filled = filled.checked;
      if (/^#[0-9a-f]{6}$/i.test(selectedStyle.fillColor)) fillColor.value = selectedStyle.fillColor;
    }
    if (Number.isFinite(Number(selected.width))) width.value = String(selected.width);
    if (Number.isFinite(Number(selected.opacity))) opacity.value = String(Math.round(selected.opacity * 100));
    dashed.checked = Boolean(selected.dashed);
    state.dashed = dashed.checked;
    dashLength.value = String(Math.max(1, Number(selected.dashLength) || 12));
    dashGap.value = String(Math.max(1, Number(selected.dashGap) || 8));
    widthValue.textContent = `${width.value} px`;
    opacityValue.textContent = `${opacity.value}%`;
    dashLengthValue.textContent = `${dashLength.value} px`;
    dashGapValue.textContent = `${dashGap.value} px`;
    dashLengthLabel.hidden = !dashed.checked;
    dashGapLabel.hidden = !dashed.checked;
    syncLassoClosedControl();
  }
  function updateConfiguration() {
    configuration.background = state.background;
    configuration.backgroundColor = state.backgroundColor;
    configuration.color = color.value;
    configuration.strokeColor = color.value;
    configuration.fillColor = fillColor.value;
    configuration.opacity = Number(opacity.value) / 100;
    configuration.strokeWidth = Number(width.value);
    configuration.canvasPreset = Object.entries(CANVAS_PRESETS).find(([, size]) => size[0] === state.width && size[1] === state.height)?.[0] || configuration.canvasPreset;
    onDirty();
  }

  function cacheImage(src) {
    if (!src || imageCache.has(src)) return;
    const image = new Image();
    image.onload = () => requestRender();
    image.src = src;
    imageCache.set(src, image);
  }

  function applyCanvasSize() {
    canvas.width = state.width; canvas.height = state.height;
    dimensions.textContent = `${state.width} × ${state.height} px`;
    canvasWrap.style.width = `${state.width * state.zoom}px`;
    canvasWrap.style.height = `${state.height * state.zoom}px`;
    canvas.style.width = "100%"; canvas.style.height = "100%";
    zoomValue.textContent = `${Math.round(state.zoom * 100)}%`;
  }

  function renderCanvas(showSelection = true) {
    renderQueued = false;
    ctx.clearRect(0, 0, state.width, state.height);
    if (state.background !== "transparent") {
      ctx.fillStyle = state.background === "black" ? "#050606" : state.background === "white" ? "#ffffff" : state.backgroundColor;
      ctx.fillRect(0, 0, state.width, state.height);
    }
    for (const layer of state.layers) {
      if (!layer.visible) continue;
      const layerCanvas = document.createElement("canvas"); layerCanvas.width = state.width; layerCanvas.height = state.height;
      const layerCtx = layerCanvas.getContext("2d");
      state.objects.filter((object) => object.layerId === layer.id).forEach((object) => drawObject(layerCtx, object, imageCache));
      ctx.drawImage(layerCanvas, 0, 0);
    }
    const selection = selectedObjects();
    if (showSelection && selection.length && state.tool === "select") {
      const handles = selectionHandles(selection); const size = 11 / state.zoom; const radius = 6 / state.zoom;
      ctx.save(); ctx.strokeStyle = "#84aebe"; ctx.lineWidth = 2 / state.zoom; ctx.setLineDash([8 / state.zoom, 6 / state.zoom]);
      ctx.strokeRect(handles.frame.x, handles.frame.y, handles.frame.w, handles.frame.h);
      ctx.beginPath(); ctx.moveTo(handles.frame.x + handles.frame.w / 2, handles.frame.y); ctx.lineTo(handles.rotate.x, handles.rotate.y); ctx.stroke();
      ctx.setLineDash([]); ctx.fillStyle = "#f7fbff"; ctx.strokeStyle = "#4f8296";
      Object.values(handles.scale).forEach((handle) => { ctx.beginPath(); ctx.rect(handle.x - size / 2, handle.y - size / 2, size, size); ctx.fill(); ctx.stroke(); });
      ctx.beginPath(); ctx.arc(handles.rotate.x, handles.rotate.y, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    if (showSelection && state.interaction?.type === "marquee") {
      const { start, current } = state.interaction;
      const x = Math.min(start.x, current.x); const y = Math.min(start.y, current.y);
      const w = Math.abs(current.x - start.x); const h = Math.abs(current.y - start.y);
      ctx.save(); ctx.fillStyle = "rgba(132,174,190,0.12)"; ctx.strokeStyle = "#84aebe";
      ctx.lineWidth = 2 / state.zoom; ctx.setLineDash([8 / state.zoom, 6 / state.zoom]);
      ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h); ctx.restore();
    }
    updateButtons();
  }

  function requestRender() {
    if (!renderQueued) { renderQueued = true; requestAnimationFrame(renderCanvas); }
  }

  function snapshot(label, { replace = false } = {}) {
    const value = createPaintSnapshot(state);
    if (replace && state.historyIndex >= 0) {
      state.history[state.historyIndex] = value; state.historyLabels[state.historyIndex] = label;
    } else {
      state.history = state.history.slice(0, state.historyIndex + 1);
      state.historyLabels = state.historyLabels.slice(0, state.historyIndex + 1);
      state.history.push(value); state.historyLabels.push(label); state.historyIndex += 1;
      if (state.history.length > 80) { state.history.shift(); state.historyLabels.shift(); state.historyIndex -= 1; }
    }
    renderHistory(); updateButtons();
  }

  function restore(snapshotValue) {
    const value = normalizePaintProject(snapshotValue);
    state.name = value.name; state.width = value.canvas.width; state.height = value.canvas.height; state.background = value.canvas.background; state.backgroundColor = value.canvas.backgroundColor;
    state.layers = value.layers; state.objects = value.objects; state.activeLayerId = state.layers[0].id; state.selectedId = null;
    titleInput.value = state.name; state.objects.filter(({ type }) => type === "image").forEach(({ src }) => cacheImage(src));
    applyCanvasSize(); requestRender(); renderLayers(); renderProperties(); updateConfiguration();
  }

  function undoAction() { if (state.historyIndex > 0) { state.historyIndex -= 1; restore(state.history[state.historyIndex]); renderHistory(); } }
  function redoAction() { if (state.historyIndex < state.history.length - 1) { state.historyIndex += 1; restore(state.history[state.historyIndex]); renderHistory(); } }

  function selectPanel(id) {
    for (const [panelId, panel] of panels) panel.hidden = panelId !== id;
    for (const [panelId, control] of tabButtons) control.classList.toggle("is-active", panelId === id);
  }

  function updateButtons() {
    for (const [id, control] of toolButtons) control.classList.toggle("is-active", id === state.tool);
    undo.disabled = state.historyIndex <= 0; redo.disabled = state.historyIndex >= state.history.length - 1;
    canvas.dataset.tool = state.tool;
  }

  function renderLayers() {
    const panel = panels.get("layers"); panel.replaceChildren();
    const head = element("div", "paint-panel-head"); head.append(element("div", "", "PILE DE CALQUES"));
    const add = iconButton("Ajouter un calque", "plus"); head.append(add); panel.append(head);
    const list = element("div", "paint-layer-list");
    [...state.layers].reverse().forEach((layer) => {
      const row = element("div", `paint-layer-row${layer.id === state.activeLayerId ? " is-active" : ""}`);
      row.draggable = true; row.dataset.layerId = layer.id;
      const visibility = iconButton(layer.visible ? "Masquer le calque" : "Afficher le calque", layer.visible ? "eye" : "eyeOff");
      const name = element("button", "paint-layer-name", layer.name); name.type = "button";
      const count = element("small", "", String(state.objects.filter((object) => object.layerId === layer.id).length));
      visibility.addEventListener("click", (event) => { event.stopPropagation(); layer.visible = !layer.visible; snapshot(layer.visible ? "Calque affiché" : "Calque masqué"); renderLayers(); requestRender(); });
      name.addEventListener("click", () => { state.activeLayerId = layer.id; renderLayers(); renderProperties(); });
      name.addEventListener("dblclick", () => {
        const input = element("input", "paint-layer-rename"); input.value = layer.name; row.replaceChild(input, name); input.focus(); input.select();
        const commit = () => { layer.name = input.value.trim().slice(0, 100) || layer.name; snapshot("Calque renommé"); renderLayers(); };
        input.addEventListener("blur", commit, { once: true }); input.addEventListener("keydown", (event) => { if (event.key === "Enter") input.blur(); });
      });
      row.addEventListener("click", () => { state.activeLayerId = layer.id; renderLayers(); renderProperties(); });
      row.addEventListener("dragstart", (event) => event.dataTransfer.setData("text/plain", layer.id));
      row.addEventListener("dragover", (event) => event.preventDefault());
      row.addEventListener("drop", (event) => {
        event.preventDefault(); const sourceId = event.dataTransfer.getData("text/plain"); const source = state.layers.findIndex(({ id }) => id === sourceId); const target = state.layers.findIndex(({ id }) => id === layer.id);
        if (source >= 0 && target >= 0 && source !== target) { const [moved] = state.layers.splice(source, 1); state.layers.splice(target, 0, moved); snapshot("Calques réordonnés"); renderLayers(); requestRender(); }
      });
      row.append(visibility, name, count); list.append(row);
    });
    const actions = element("div", "paint-layer-actions");
    const duplicate = iconButton("Dupliquer le calque", "duplicate"); const up = iconButton("Monter", "up"); const down = iconButton("Descendre", "down"); const remove = iconButton("Supprimer le calque", "trash");
    actions.append(duplicate, up, down, remove); panel.append(list, actions);
    add.addEventListener("click", () => { const layer = { id: uid("layer"), name: `Calque ${state.layers.length + 1}`, visible: true }; state.layers.push(layer); state.activeLayerId = layer.id; snapshot("Calque ajouté"); renderLayers(); });
    duplicate.addEventListener("click", () => {
      const source = activeLayer(); const layer = { id: uid("layer"), name: `${source.name} copie`, visible: source.visible }; const index = state.layers.indexOf(source);
      state.layers.splice(index + 1, 0, layer); state.objects.filter(({ layerId }) => layerId === source.id).forEach((object) => state.objects.push({ ...clone(object), id: uid("object"), layerId: layer.id }));
      state.activeLayerId = layer.id; snapshot("Calque dupliqué"); renderLayers(); requestRender();
    });
    const moveLayer = (direction) => { const index = state.layers.findIndex(({ id }) => id === state.activeLayerId); const target = index + direction; if (target >= 0 && target < state.layers.length) { [state.layers[index], state.layers[target]] = [state.layers[target], state.layers[index]]; snapshot("Calque déplacé"); renderLayers(); requestRender(); } };
    up.addEventListener("click", () => moveLayer(1)); down.addEventListener("click", () => moveLayer(-1));
    remove.addEventListener("click", () => {
      if (state.layers.length === 1) { toast("Le document doit garder au moins un calque.", true); return; }
      state.objects = state.objects.filter(({ layerId }) => layerId !== state.activeLayerId); state.layers = state.layers.filter(({ id }) => id !== state.activeLayerId); state.activeLayerId = state.layers.at(-1).id; state.selectedId = null;
      snapshot("Calque supprimé"); renderLayers(); renderProperties(); requestRender();
    });
  }

  function field(labelText, control) { const label = element("label", "paint-property-field"); label.append(element("span", "", labelText), control); return label; }

  function renderProperties() {
    const panel = panels.get("properties"); panel.replaceChildren();
    panel.append(element("div", "paint-panel-kicker", "DOCUMENT"));
    const preset = element("select"); Object.keys(CANVAS_PRESETS).forEach((value) => { const option = element("option", "", value); option.value = value; option.selected = CANVAS_PRESETS[value][0] === state.width && CANVAS_PRESETS[value][1] === state.height; preset.append(option); });
    const background = element("select"); [["transparent", "Transparent"], ["black", "Noir"], ["white", "Blanc"], ["custom", "Couleur personnalisée"]].forEach(([value, label]) => { const option = element("option", "", label); option.value = value; option.selected = state.background === value; background.append(option); });
    panel.append(field("Format", preset), field("Fond", background));
    if (state.background === "custom") {
      const backgroundColor = element("input"); backgroundColor.type = "color"; backgroundColor.value = state.backgroundColor;
      panel.append(field("Couleur du fond", backgroundColor));
      backgroundColor.addEventListener("input", () => { state.backgroundColor = backgroundColor.value; updateConfiguration(); requestRender(); });
      backgroundColor.addEventListener("change", () => snapshot("Couleur du fond modifiée"));
    }
    preset.addEventListener("change", () => { [state.width, state.height] = CANVAS_PRESETS[preset.value]; applyCanvasSize(); snapshot("Format modifié"); updateConfiguration(); requestRender(); });
    background.addEventListener("change", () => { state.background = background.value; snapshot("Fond modifié"); updateConfiguration(); renderProperties(); requestRender(); });
    const selection = selectedObjects();
    const selected = selectedObject();
    panel.append(element("div", "paint-panel-kicker", selection.length > 1 ? `${selection.length} OBJETS SÉLECTIONNÉS` : selected ? "OBJET SÉLECTIONNÉ" : "SÉLECTION"));
    if (!selected) { panel.append(element("p", "paint-panel-empty", "Sélectionne un objet sur le canevas pour modifier précisément ses propriétés.")); return; }
    if (selection.length > 1) {
      panel.append(element("p", "paint-panel-empty", "Déplace la sélection groupée sur le canevas. Les réglages de la barre supérieure s’appliquent à tous les objets compatibles."));
      const deleteSelection = iconButton("Supprimer la sélection", "trash", "paint-property-action paint-danger");
      panel.append(deleteSelection); deleteSelection.addEventListener("click", removeSelected);
      return;
    }
    const objectOpacity = element("input"); objectOpacity.type = "range"; objectOpacity.min = "5"; objectOpacity.max = "100"; objectOpacity.value = String(Math.round((selected.opacity ?? 1) * 100));
    const commitObject = (label) => { snapshot(label, { replace: false }); requestRender(); };
    const objectStyle = paintObjectStyle(selected);
    if (PAINT_SHAPES.has(selected.type)) {
      const styleGrid = element("div", "paint-object-style-grid");
      const strokeRow = element("div", "paint-object-style-row");
      const objectStrokeEnabled = element("input"); objectStrokeEnabled.type = "checkbox"; objectStrokeEnabled.checked = objectStyle.strokeColor !== TRANSPARENT_PAINT;
      const objectStrokeColor = element("input"); objectStrokeColor.type = "color"; objectStrokeColor.value = objectStyle.strokeColor === TRANSPARENT_PAINT ? color.value : objectStyle.strokeColor;
      strokeRow.append(objectStrokeEnabled, element("span", "", "Contour"), objectStrokeColor);
      const fillRow = element("div", "paint-object-style-row");
      const objectFillEnabled = element("input"); objectFillEnabled.type = "checkbox"; objectFillEnabled.checked = objectStyle.fillColor !== TRANSPARENT_PAINT;
      const objectFillColor = element("input"); objectFillColor.type = "color"; objectFillColor.value = objectStyle.fillColor === TRANSPARENT_PAINT ? fillColor.value : objectStyle.fillColor;
      fillRow.append(objectFillEnabled, element("span", "", "Intérieur"), objectFillColor);
      styleGrid.append(strokeRow, fillRow); panel.append(styleGrid);
      const applyObjectStyle = (label) => {
        if (!objectStrokeEnabled.checked && !objectFillEnabled.checked) {
          toast("Garde au moins le contour ou l’intérieur visible.", true); objectStrokeEnabled.checked = true;
        }
        selected.strokeColor = objectStrokeEnabled.checked ? objectStrokeColor.value : TRANSPARENT_PAINT;
        selected.fillColor = objectFillEnabled.checked ? objectFillColor.value : TRANSPARENT_PAINT;
        selected.color = objectStrokeEnabled.checked ? objectStrokeColor.value : objectFillColor.value;
        selected.filled = objectFillEnabled.checked;
        commitObject(label);
      };
      objectStrokeColor.addEventListener("input", () => { selected.strokeColor = objectStrokeColor.value; selected.color = objectStrokeColor.value; requestRender(); });
      objectFillColor.addEventListener("input", () => { selected.fillColor = objectFillColor.value; requestRender(); });
      objectStrokeColor.addEventListener("change", () => applyObjectStyle("Couleur du contour modifiée"));
      objectFillColor.addEventListener("change", () => applyObjectStyle("Couleur intérieure modifiée"));
      objectStrokeEnabled.addEventListener("change", () => applyObjectStyle("Contour modifié"));
      objectFillEnabled.addEventListener("change", () => applyObjectStyle("Intérieur modifié"));
    } else if (selected.type !== "image" && selected.type !== "eraser") {
      const objectColor = element("input"); objectColor.type = "color";
      objectColor.value = selected.type === "text" ? objectStyle.fillColor : objectStyle.strokeColor;
      panel.append(field(selected.type === "text" ? "Couleur du texte" : "Couleur du contour", objectColor));
      objectColor.addEventListener("input", () => {
        selected.color = objectColor.value;
        if (selected.type === "text") selected.fillColor = objectColor.value; else selected.strokeColor = objectColor.value;
        requestRender();
      });
      objectColor.addEventListener("change", () => commitObject("Couleur modifiée"));
    }
    panel.append(field("Opacité", objectOpacity));
    objectOpacity.addEventListener("input", () => { selected.opacity = Number(objectOpacity.value) / 100; opacity.value = objectOpacity.value; opacityValue.textContent = `${objectOpacity.value}%`; requestRender(); }); objectOpacity.addEventListener("change", () => commitObject("Opacité modifiée"));
    if (!["path", "eraser", "lasso", "line", "arrow"].includes(selected.type)) {
      const transformGrid = element("div", "paint-transform-grid");
      const controls = {};
      for (const [key, label, minimum] of [["x", "X", -8000], ["y", "Y", -8000], ["w", "Largeur", 1], ["h", "Hauteur", 1]]) {
        const input = element("input"); input.type = "number"; input.min = String(minimum); input.max = "8000"; input.value = String(Math.round(selected[key] || (minimum === 1 ? 1 : 0))); controls[key] = input;
        transformGrid.append(field(label, input));
        input.addEventListener("change", () => { selected[key] = Math.max(minimum, Math.min(8000, Number(input.value) || 0)); commitObject("Transformation modifiée"); });
      }
      panel.append(transformGrid);
    }
    if (selected.type === "text") {
      const text = element("textarea"); text.rows = 4; text.value = selected.text;
      const font = element("select"); ["Arial", "Georgia", "Courier New"].forEach((value) => { const option = element("option", "", value); option.value = value; option.selected = selected.fontFamily === value; font.append(option); });
      const fontSize = element("input"); fontSize.type = "number"; fontSize.min = "8"; fontSize.max = "300"; fontSize.value = String(selected.fontSize || 42);
      panel.append(field("Texte", text), field("Police", font), field("Taille", fontSize));
      text.addEventListener("input", () => { selected.text = text.value; requestRender(); }); text.addEventListener("change", () => commitObject("Texte modifié"));
      font.addEventListener("change", () => { selected.fontFamily = font.value; commitObject("Police modifiée"); });
      fontSize.addEventListener("change", () => { selected.fontSize = Math.max(8, Math.min(300, Number(fontSize.value))); commitObject("Taille du texte modifiée"); });
    }
    if (["arrow"].includes(selected.type)) {
      const reverse = iconButton("Inverser", "flip", "paint-property-action");
      const double = element("label", "paint-check"); const box = element("input"); box.type = "checkbox"; box.checked = selected.arrowStart; double.append(box, element("span", "", "Double flèche"));
      panel.append(reverse, double);
      reverse.addEventListener("click", () => { [selected.x1, selected.x2] = [selected.x2, selected.x1]; [selected.y1, selected.y2] = [selected.y2, selected.y1]; commitObject("Flèche inversée"); });
      box.addEventListener("change", () => { selected.arrowStart = box.checked; commitObject("Flèche modifiée"); });
    }
    if (["path", "line", "arrow", "rect", "ellipse", "lasso"].includes(selected.type)) {
      const strokeWidth = element("input"); strokeWidth.type = "range"; strokeWidth.min = "1"; strokeWidth.max = "100"; strokeWidth.value = String(selected.width || 3);
      const dash = element("label", "paint-check"); const dashBox = element("input"); dashBox.type = "checkbox"; dashBox.checked = Boolean(selected.dashed); dash.append(dashBox, element("span", "", "Contour pointillé"));
      panel.append(field("Épaisseur du contour", strokeWidth), dash);
      const selectedDashLength = element("input"); selectedDashLength.type = "range"; selectedDashLength.min = "1"; selectedDashLength.max = "80"; selectedDashLength.value = String(selected.dashLength || 12);
      const selectedDashGap = element("input"); selectedDashGap.type = "range"; selectedDashGap.min = "1"; selectedDashGap.max = "80"; selectedDashGap.value = String(selected.dashGap || 8);
      const selectedDashFields = element("div", "paint-dash-fields"); selectedDashFields.hidden = !selected.dashed;
      selectedDashFields.append(field("Longueur des traits", selectedDashLength), field("Espacement", selectedDashGap));
      panel.append(selectedDashFields);
      strokeWidth.addEventListener("input", () => { selected.width = Number(strokeWidth.value); width.value = strokeWidth.value; widthValue.textContent = `${strokeWidth.value} px`; requestRender(); });
      strokeWidth.addEventListener("change", () => commitObject("Épaisseur modifiée"));
      dashBox.addEventListener("change", () => { selected.dashed = dashBox.checked; selectedDashFields.hidden = !selected.dashed; syncToolbarFromSelection(); commitObject("Style du contour modifié"); });
      selectedDashLength.addEventListener("input", () => { selected.dashLength = Number(selectedDashLength.value); requestRender(); });
      selectedDashGap.addEventListener("input", () => { selected.dashGap = Number(selectedDashGap.value); requestRender(); });
      selectedDashLength.addEventListener("change", () => { syncToolbarFromSelection(); commitObject("Longueur des pointillés modifiée"); });
      selectedDashGap.addEventListener("change", () => { syncToolbarFromSelection(); commitObject("Espacement des pointillés modifié"); });
    }
    const order = element("div", "paint-order-grid");
    const front = element("button", "quiet-button", "Tout devant"); const forward = element("button", "quiet-button", "Avancer"); const backward = element("button", "quiet-button", "Reculer"); const back = element("button", "quiet-button", "Tout derrière");
    [front, forward, backward, back].forEach((control) => { control.type = "button"; order.append(control); }); panel.append(order);
    const reorder = (mode) => { const layerObjects = state.objects.filter(({ layerId }) => layerId === selected.layerId); const current = layerObjects.indexOf(selected); let target = current; if (mode === "front") target = layerObjects.length - 1; if (mode === "forward") target = Math.min(layerObjects.length - 1, current + 1); if (mode === "backward") target = Math.max(0, current - 1); if (mode === "back") target = 0; if (target === current) return; const globalCurrent = state.objects.indexOf(selected); state.objects.splice(globalCurrent, 1); const anchor = layerObjects.filter((object) => object !== selected)[target]; const globalTarget = anchor ? state.objects.indexOf(anchor) + (target > current ? 1 : 0) : state.objects.length; state.objects.splice(globalTarget, 0, selected); snapshot("Ordre modifié"); requestRender(); };
    front.addEventListener("click", () => reorder("front")); forward.addEventListener("click", () => reorder("forward")); backward.addEventListener("click", () => reorder("backward")); back.addEventListener("click", () => reorder("back"));
    const objectActions = element("div", "paint-object-actions");
    const duplicateObject = iconButton("Dupliquer l’objet", "duplicate", "paint-property-action");
    const deleteObject = iconButton("Supprimer l’objet", "trash", "paint-property-action paint-danger");
    objectActions.append(duplicateObject, deleteObject); panel.append(objectActions);
    duplicateObject.addEventListener("click", () => { const copy = { ...clone(selected), id: uid("object") }; translateObject(copy, 24, 24); state.objects.push(copy); state.selectedId = copy.id; snapshot("Objet dupliqué"); renderLayers(); renderProperties(); requestRender(); });
    deleteObject.addEventListener("click", removeSelected);
  }

  function renderHistory() {
    const panel = panels.get("history"); panel.replaceChildren(element("div", "paint-panel-kicker", "HISTORIQUE DU DOCUMENT"));
    const list = element("div", "paint-history-list");
    state.historyLabels.forEach((label, index) => {
      const item = element("button", `paint-history-item${index === state.historyIndex ? " is-active" : ""}`); item.type = "button";
      item.append(element("span", "", index === 0 ? "●" : "↳"), element("span", "", label));
      item.addEventListener("click", () => { state.historyIndex = index; restore(state.history[index]); renderHistory(); }); list.append(item);
    }); panel.append(list);
  }

  function syncLassoClosedControl() {
    const selected = selectedObject();
    const active = state.tool === "lasso" || selected?.type === "lasso";
    lassoClosedLabel.hidden = !active;
    if (selected?.type === "lasso") {
      lassoClosed.checked = paintLassoIsClosed(selected);
      state.lassoClosed = lassoClosed.checked;
    } else lassoClosed.checked = state.lassoClosed;
  }
  function setTool(tool) { state.tool = tool; state.selectedId = tool === "select" ? state.selectedId : null; setStatus(TOOLS.find(([id]) => id === tool)?.[1] || "Prêt"); syncLassoClosedControl(); renderProperties(); requestRender(); }
  function pointFromEvent(event) { const rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left) * state.width / rect.width, y: (event.clientY - rect.top) * state.height / rect.height }; }
  function pickObject(point) {
    const visibleIds = new Set(state.layers.filter(({ visible }) => visible).map(({ id }) => id));
    return [...state.objects].reverse().find((object) => visibleIds.has(object.layerId) && hitObject(object, point)) || null;
  }
  function baseObject(type) {
    const shape = PAINT_SHAPES.has(type);
    return {
      id: uid("object"), type, layerId: activeLayer().id,
      color: color.value,
      strokeColor: type === "text" ? TRANSPARENT_PAINT : (state.strokeEnabled ? color.value : TRANSPARENT_PAINT),
      fillColor: type === "text" ? fillColor.value : (shape && state.filled ? fillColor.value : TRANSPARENT_PAINT),
      opacity: Number(opacity.value) / 100, width: Number(width.value), dashed: state.dashed,
      dashLength: Number(dashLength.value), dashGap: Number(dashGap.value), filled: shape && state.filled,
      ...(type === "lasso" ? { closed: state.lassoClosed } : {})
    };
  }

  function addImageSource(src, label = "Image") {
    const image = new Image();
    image.onload = () => {
      imageCache.set(src, image);
      const scale = Math.min(state.width / image.width, state.height / image.height, 1);
      const object = { ...baseObject("image"), src, x: (state.width - image.width * scale) / 2, y: (state.height - image.height * scale) / 2, w: image.width * scale, h: image.height * scale, opacity: 1 };
      state.objects.push(object); state.selectedId = object.id; snapshot(`${label} importée`); setTool("select"); renderLayers(); renderProperties(); requestRender(); toast(`${label} ajoutée au calque actif.`);
    };
    image.onerror = () => toast("Cette image ne peut pas être ouverte.", true);
    image.src = src;
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (textEditor) closeTextEditor();
    canvas.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event);
    if (state.tool === "hand") { state.interaction = { type: "pan", x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop }; return; }
    if (state.tool === "eyedropper") { const pixel = ctx.getImageData(Math.round(point.x), Math.round(point.y), 1, 1).data; if (pixel[3]) { color.value = hexFromPixel(pixel); configuration.color = color.value; onDirty(); setStatus(`Couleur ${color.value}`); } return; }
    if (state.tool === "select") {
      const selectedHandle = selectionHandleAt(point);
      if (selectedHandle) {
        const objects = selectedObjects(); const initialBounds = paintSelectionBounds(objects);
        const initialObjects = objects.map((object) => clone(object));
        if (selectedHandle.type === "rotate") {
          const center = { x: initialBounds.x + initialBounds.w / 2, y: initialBounds.y + initialBounds.h / 2 };
          state.interaction = { type: "rotate-selection", start: point, center, startAngle: Math.atan2(point.y - center.y, point.x - center.x), objects, initialObjects };
        } else {
          const { corner } = selectedHandle;
          const horizontalRight = corner.includes("e"); const verticalBottom = corner.includes("s");
          const handleBase = { x: horizontalRight ? initialBounds.x + initialBounds.w : initialBounds.x, y: verticalBottom ? initialBounds.y + initialBounds.h : initialBounds.y };
          const anchor = { x: horizontalRight ? initialBounds.x : initialBounds.x + initialBounds.w, y: verticalBottom ? initialBounds.y : initialBounds.y + initialBounds.h };
          state.interaction = { type: "scale-selection", start: point, anchor, handleBase, objects, initialObjects };
        }
        requestRender(); return;
      }
      const selected = pickObject(point);
      if (selected) {
        const currentSelection = selectedObjects();
        if (!currentSelection.some(({ id }) => id === selected.id)) setSelection([selected]);
        state.activeLayerId = selected.layerId; syncToolbarFromSelection();
        state.interaction = { type: "move", start: point, last: point, objects: selectedObjects() };
      } else {
        clearSelection();
        state.interaction = { type: "marquee", start: point, current: point };
      }
      renderLayers(); renderProperties(); requestRender(); return;
    }
    let object;
    if (["pen", "eraser", "lasso"].includes(state.tool)) object = { ...baseObject(state.tool === "pen" ? "path" : state.tool), points: [point] };
    else if (["line", "arrow"].includes(state.tool)) object = { ...baseObject(state.tool), x1: point.x, y1: point.y, x2: point.x, y2: point.y, arrowStart: state.arrowStart, arrowEnd: state.arrowEnd };
    else if (["rect", "ellipse"].includes(state.tool)) object = { ...baseObject(state.tool), x: point.x, y: point.y, w: 0, h: 0 };
    else if (state.tool === "text") object = { ...baseObject("text"), x: point.x, y: point.y, w: 220, h: 60, text: "Votre texte", fontFamily: configuration.fontFamily, fontSize: Math.max(24, Number(width.value) * 4) };
    if (!object) return;
    state.objects.push(object); state.selectedId = object.id; state.interaction = { type: "draw", start: point, object };
    if (state.tool === "text") { snapshot("Texte ajouté"); selectPanel("properties"); renderLayers(); renderProperties(); }
    requestRender();
  });

  canvas.addEventListener("dblclick", (event) => {
    const object = pickObject(pointFromEvent(event));
    if (object?.type === "text") { event.preventDefault(); event.stopPropagation(); openTextEditor(object); }
  });

  canvas.addEventListener("pointermove", (event) => {
    const interaction = state.interaction;
    if (!interaction) {
      if (state.tool === "select") {
        const handle = selectionHandleAt(pointFromEvent(event));
        canvas.style.cursor = handle?.type === "rotate" ? "grab" : handle?.type === "scale" ? "nwse-resize" : "default";
      }
      return;
    }
    if (interaction.type === "pan") { viewport.scrollLeft = interaction.left - (event.clientX - interaction.x); viewport.scrollTop = interaction.top - (event.clientY - interaction.y); return; }
    const point = pointFromEvent(event);
    if (interaction.type === "marquee") {
      interaction.current = point;
      const visibleIds = new Set(state.layers.filter(({ visible }) => visible).map(({ id }) => id));
      setSelection(state.objects.filter((object) => visibleIds.has(object.layerId) && paintObjectIntersectsMarquee(object, interaction.start, point)));
      requestRender(); return;
    }
    if (interaction.type === "scale-selection") {
      let scaleX = (interaction.handleBase.x + point.x - interaction.start.x - interaction.anchor.x) / ((interaction.handleBase.x - interaction.anchor.x) || 1);
      let scaleY = (interaction.handleBase.y + point.y - interaction.start.y - interaction.anchor.y) / ((interaction.handleBase.y - interaction.anchor.y) || 1);
      scaleX = Math.max(0.05, scaleX); scaleY = Math.max(0.05, scaleY);
      if (event.shiftKey) { const uniform = Math.max(scaleX, scaleY); scaleX = uniform; scaleY = uniform; }
      interaction.objects.forEach((object, index) => Object.assign(object, scalePaintObjectFromAnchor(interaction.initialObjects[index], interaction.anchor, scaleX, scaleY)));
      requestRender(); return;
    }
    if (interaction.type === "rotate-selection") {
      let angle = Math.atan2(point.y - interaction.center.y, point.x - interaction.center.x) - interaction.startAngle;
      if (event.shiftKey) angle = Math.round(angle / (Math.PI / 12)) * (Math.PI / 12);
      interaction.objects.forEach((object, index) => Object.assign(object, rotatePaintObjectAround(interaction.initialObjects[index], interaction.center, angle)));
      requestRender(); return;
    }
    const object = interaction.object;
    if (interaction.type === "move") {
      const dx = point.x - interaction.last.x; const dy = point.y - interaction.last.y;
      interaction.objects.forEach((selected) => translateObject(selected, dx, dy)); interaction.last = point;
    }
    else if (["path", "eraser", "lasso"].includes(object.type)) {
      const previous = object.points.at(-1);
      if (!previous || Math.hypot(point.x - previous.x, point.y - previous.y) >= 2) object.points.push(point);
    }
    else if (["line", "arrow"].includes(object.type)) { object.x2 = point.x; object.y2 = point.y; }
    else { object.w = point.x - interaction.start.x; object.h = point.y - interaction.start.y; }
    requestRender();
  });

  canvas.addEventListener("pointerup", () => {
    const interaction = state.interaction; state.interaction = null; if (!interaction || interaction.type === "pan") return;
    if (interaction.type === "marquee") {
      if (selectedObjects().length) syncToolbarFromSelection();
      renderLayers(); renderProperties(); requestRender(); return;
    }
    if (["scale-selection", "rotate-selection"].includes(interaction.type)) {
      snapshot(interaction.type === "scale-selection" ? "Sélection redimensionnée" : "Sélection pivotée");
      renderLayers(); renderProperties(); requestRender(); return;
    }
    const object = interaction.object; if (object && ["rect", "ellipse"].includes(object.type)) { if (object.w < 0) { object.x += object.w; object.w = Math.abs(object.w); } if (object.h < 0) { object.y += object.h; object.h = Math.abs(object.h); } }
    if (object?.type === "lasso" && object.points.length < (object.closed === false ? 2 : 3)) {
      state.objects = state.objects.filter(({ id }) => id !== object.id); state.selectedId = null; requestRender(); return;
    }
    snapshot(interaction.type === "move" ? "Objet déplacé" : "Objet créé");
    if (interaction.type === "draw") syncToolbarFromSelection();
    renderLayers(); renderProperties(); requestRender();
  });

  function setZoom(next, anchor = null) {
    const old = state.zoom; state.zoom = Math.max(0.25, Math.min(4, next));
    if (anchor) { const ratio = state.zoom / old; viewport.scrollLeft = (viewport.scrollLeft + anchor.x) * ratio - anchor.x; viewport.scrollTop = (viewport.scrollTop + anchor.y) * ratio - anchor.y; }
    applyCanvasSize(); requestRender();
  }
  function fitCanvas() { const availableWidth = Math.max(200, viewport.clientWidth - 64); const availableHeight = Math.max(200, viewport.clientHeight - 64); setZoom(Math.min(1, availableWidth / state.width, availableHeight / state.height)); }
  viewport.addEventListener("wheel", (event) => { if (!event.ctrlKey) return; event.preventDefault(); const rect = viewport.getBoundingClientRect(); setZoom(state.zoom * (event.deltaY < 0 ? 1.1 : 0.9), { x: event.clientX - rect.left, y: event.clientY - rect.top }); }, { passive: false });

  const deselectOutsidePaint = (event) => {
    if (!shell.isConnected) { window.removeEventListener("pointerdown", deselectOutsidePaint, true); return; }
    if (!shell.contains(event.target) && state.selectedId) {
      closeTextEditor(); clearSelection(); renderProperties(); requestRender();
    }
  };
  window.addEventListener("pointerdown", deselectOutsidePaint, true);

  function removeSelected() {
    const selection = selectedObjects(); if (!selection.length) return;
    const ids = new Set(selection.map(({ id }) => id));
    state.objects = state.objects.filter(({ id }) => !ids.has(id)); clearSelection();
    snapshot(selection.length > 1 ? "Objets supprimés" : "Objet supprimé"); renderLayers(); renderProperties(); requestRender();
  }
  let clipboard = null;
  shell.addEventListener("keydown", (event) => {
    if (["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)) return;
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === "z") { event.preventDefault(); event.shiftKey ? redoAction() : undoAction(); return; }
    if ((event.ctrlKey || event.metaKey) && key === "y") { event.preventDefault(); redoAction(); return; }
    if ((event.ctrlKey || event.metaKey) && key === "c" && selectedObject()) { clipboard = clone(selectedObject()); return; }
    if ((event.ctrlKey || event.metaKey) && key === "x" && selectedObject()) { clipboard = clone(selectedObject()); removeSelected(); return; }
    if ((event.ctrlKey || event.metaKey) && key === "v" && clipboard) { const copy = { ...clone(clipboard), id: uid("object"), layerId: activeLayer().id }; translateObject(copy, 24, 24); state.objects.push(copy); state.selectedId = copy.id; snapshot("Objet collé"); renderLayers(); renderProperties(); requestRender(); return; }
    if (["delete", "backspace"].includes(key)) { event.preventDefault(); removeSelected(); return; }
    const tool = TOOLS.find(([, , shortcut]) => shortcut.toLowerCase() === key)?.[0]; if (tool) { event.preventDefault(); setTool(tool); return; }
    const selection = selectedObjects(); if (selection.length && ["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) { event.preventDefault(); const amount = event.shiftKey ? 10 : 1; selection.forEach((selected) => translateObject(selected, key === "arrowleft" ? -amount : key === "arrowright" ? amount : 0, key === "arrowup" ? -amount : key === "arrowdown" ? amount : 0)); snapshot(selection.length > 1 ? "Objets déplacés" : "Objet déplacé"); requestRender(); }
  });

  for (const [id, control] of toolButtons) control.addEventListener("click", () => setTool(id));
  undo.addEventListener("click", undoAction); redo.addEventListener("click", redoAction);
  zoomOut.addEventListener("click", () => setZoom(state.zoom / 1.2)); zoomIn.addEventListener("click", () => setZoom(state.zoom * 1.2)); fit.addEventListener("click", fitCanvas); zoomValue.addEventListener("click", () => setZoom(1));
  tabs.addEventListener("click", (event) => { const id = event.target.closest("button")?.dataset.panel; if (id) selectPanel(id); });
  let activeColorTarget = "stroke";
  function markActiveColorTarget(target) {
    activeColorTarget = target;
    strokeLabel.classList.toggle("is-active", target === "stroke");
    fillLabel.classList.toggle("is-active", target === "fill");
  }
  function applyMainColor(value, historyLabel = "Couleur modifiée") {
    const target = activeColorTarget === "fill" ? fillColor : color;
    target.value = value;
    configuration.strokeColor = color.value; configuration.fillColor = fillColor.value; configuration.color = color.value; onDirty();
    const selection = selectedObjects().filter(({ type }) => type !== "image" && type !== "eraser");
    if (selection.length) {
      selection.forEach((selected) => {
        if (PAINT_SHAPES.has(selected.type)) {
          if (activeColorTarget === "fill") { selected.fillColor = value; selected.filled = true; }
          else { selected.strokeColor = value; selected.color = value; }
        } else if (selected.type === "text") selected.fillColor = selected.color = value;
        else selected.strokeColor = selected.color = value;
      });
      snapshot(historyLabel); renderProperties(); requestRender();
    }
  }
  color.addEventListener("focus", () => markActiveColorTarget("stroke"));
  fillColor.addEventListener("focus", () => markActiveColorTarget("fill"));
  strokeLabel.addEventListener("pointerdown", () => markActiveColorTarget("stroke"));
  fillLabel.addEventListener("pointerdown", () => markActiveColorTarget("fill"));
  color.addEventListener("input", () => { configuration.color = color.value; configuration.strokeColor = color.value; onDirty(); selectedObjects().filter(({ type }) => type !== "image" && type !== "eraser" && type !== "text").forEach((selected) => { selected.color = color.value; selected.strokeColor = color.value; }); requestRender(); });
  fillColor.addEventListener("input", () => { configuration.fillColor = fillColor.value; onDirty(); selectedObjects().filter((selected) => PAINT_SHAPES.has(selected.type) || selected.type === "text").forEach((selected) => { selected.fillColor = fillColor.value; if (selected.type === "text") selected.color = fillColor.value; }); requestRender(); });
  color.addEventListener("change", () => { if (selectedObject()) snapshot("Couleur du contour modifiée"); });
  fillColor.addEventListener("change", () => { if (selectedObject()) snapshot("Couleur intérieure modifiée"); });
  palettes.addEventListener("click", (event) => { const value = event.target.closest("button")?.dataset.color; if (value) applyMainColor(value, "Couleur de palette appliquée"); });
  width.addEventListener("input", () => {
    widthValue.textContent = `${width.value} px`; updateConfiguration();
    const selection = selectedObjects().filter(({ type }) => type !== "image");
    if (selection.length) { selection.forEach((selected) => { selected.width = Number(width.value); }); requestRender(); }
  });
  width.addEventListener("change", () => { if (selectedObject()) snapshot("Épaisseur modifiée"); });
  opacity.addEventListener("input", () => {
    opacityValue.textContent = `${opacity.value}%`; updateConfiguration();
    const selection = selectedObjects();
    if (selection.length) { selection.forEach((selected) => { selected.opacity = Number(opacity.value) / 100; }); requestRender(); }
  });
  opacity.addEventListener("change", () => { if (selectedObject()) snapshot("Opacité modifiée"); });
  strokeToggle.addEventListener("change", () => {
    if (!strokeToggle.checked && !filled.checked) { strokeToggle.checked = true; return toast("Garde au moins le contour ou le fond actif.", true); }
    state.strokeEnabled = strokeToggle.checked;
    const changed = selectedObjects().filter((selected) => setPaintObjectStrokeEnabled(selected, state.strokeEnabled, color.value));
    if (changed.length) {
      snapshot(state.strokeEnabled ? "Contour activé" : "Contour désactivé");
      renderProperties(); requestRender();
    }
  });
  filled.addEventListener("change", () => {
    if (!filled.checked && !strokeToggle.checked) { filled.checked = true; return toast("Garde au moins le contour ou le fond actif.", true); }
    state.filled = filled.checked;
    const changed = selectedObjects().filter((selected) => setPaintObjectFillEnabled(selected, state.filled, fillColor.value));
    if (changed.length) {
      snapshot(state.filled ? "Fond activé" : "Fond désactivé");
      renderProperties(); requestRender();
    }
  });
  dashed.addEventListener("change", () => {
    state.dashed = dashed.checked;
    dashLengthLabel.hidden = !state.dashed; dashGapLabel.hidden = !state.dashed;
    const selection = selectedObjects().filter(({ type }) => type !== "image" && type !== "text");
    if (selection.length) {
      selection.forEach((selected) => { selected.dashed = state.dashed; selected.dashLength = Number(dashLength.value); selected.dashGap = Number(dashGap.value); });
      snapshot("Style du contour modifié"); renderProperties(); requestRender();
    }
  });
  lassoClosed.addEventListener("change", () => {
    state.lassoClosed = lassoClosed.checked;
    const selected = selectedObject();
    if (selected?.type === "lasso") {
      selected.closed = state.lassoClosed;
      snapshot(state.lassoClosed ? "Lasso fermé" : "Lasso ouvert");
      renderProperties(); requestRender();
    }
  });
  dashLength.addEventListener("input", () => {
    dashLengthValue.textContent = `${dashLength.value} px`;
    const selection = selectedObjects(); if (selection.length) { selection.forEach((selected) => { selected.dashLength = Number(dashLength.value); }); requestRender(); }
  });
  dashGap.addEventListener("input", () => {
    dashGapValue.textContent = `${dashGap.value} px`;
    const selection = selectedObjects(); if (selection.length) { selection.forEach((selected) => { selected.dashGap = Number(dashGap.value); }); requestRender(); }
  });
  dashLength.addEventListener("change", () => { if (selectedObject()) snapshot("Longueur des pointillés modifiée"); });
  dashGap.addEventListener("change", () => { if (selectedObject()) snapshot("Espacement des pointillés modifié"); });
  titleInput.addEventListener("change", () => { state.name = titleInput.value.trim() || "Projet sans titre"; titleInput.value = state.name; snapshot("Projet renommé"); });
  importButton.addEventListener("click", () => fileInput.click()); loadButton.addEventListener("click", () => projectInput.click());
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0]; if (!file) return; const reader = new FileReader();
    reader.onload = () => addImageSource(reader.result, "Image");
    reader.readAsDataURL(file); fileInput.value = "";
  });
  projectInput.addEventListener("change", async () => {
    try { const file = projectInput.files?.[0]; if (!file) return; const project = normalizePaintProject(JSON.parse(await file.text())); restore(project); state.history = []; state.historyLabels = []; state.historyIndex = -1; projectPath.textContent = `Ouvert : ${file.name}`; snapshot("Projet ouvert"); toast("Projet Paint chargé."); }
    catch (error) { toast(error.message, true); } finally { projectInput.value = ""; }
  });
  saveButton.addEventListener("click", async () => {
    const nextName = titleInput.value.trim() || "Projet sans titre";
    if (nextName !== state.name) { state.name = nextName; titleInput.value = nextName; snapshot("Projet renommé"); }
    const suggestedName = `${safeName(state.name)}.barzpaint`;
    const project = createPaintSnapshot(state);
    try {
      const result = await savePaintProjectNative(project, suggestedName);
      if (result.cancelled) return;
      projectPath.textContent = result.path;
      projectPath.title = result.path;
      toast(`Projet enregistré : ${result.path}`);
    } catch (nativeError) {
      try {
        if (typeof window.showSaveFilePicker === "function") {
          const handle = await window.showSaveFilePicker({ suggestedName, types: [{ description: "Projet BARZ Paint", accept: { "application/json": [".barzpaint"] } }] });
          const writable = await handle.createWritable();
          try { await writable.write(new Blob([JSON.stringify(project, null, 2)], { type: "application/json" })); } finally { await writable.close(); }
          projectPath.textContent = `Enregistré : ${handle.name}`;
          projectPath.title = "Le navigateur masque le chemin complet.";
          toast(`Projet Paint enregistré : ${handle.name}`);
        } else {
          download(new Blob([JSON.stringify(project, null, 2)], { type: "application/json" }), suggestedName);
          projectPath.textContent = `Téléchargements/${suggestedName}`;
          toast(`Projet Paint téléchargé : ${suggestedName}`);
        }
      } catch (fallbackError) {
        if (fallbackError.name !== "AbortError") toast(fallbackError.message || nativeError.message, true);
      }
    }
  });
  clearButton.addEventListener("click", () => {
    if (!state.objects.length) return toast("Le canevas est déjà vide.");
    state.objects = []; state.selectedId = null;
    snapshot("Canevas effacé"); renderLayers(); renderProperties(); requestRender();
    toast("Canevas effacé. Annuler reste disponible.");
  });
  exportButton.addEventListener("click", () => {
    const format = configuration.exportFormat; const mime = format === "png" ? "image/png" : `image/${format}`;
    renderCanvas(false);
    canvas.toBlob((blob) => { requestRender(); if (!blob) return; download(blob, `${safeName(state.name)}.${format === "jpeg" ? "jpg" : format}`); toast("Image exportée."); }, mime, configuration.exportQuality);
  });

  markActiveColorTarget("stroke");
  dashLengthLabel.hidden = true; dashGapLabel.hidden = true;
  selectPanel("layers"); applyCanvasSize(); renderLayers(); renderProperties(); snapshot("Nouveau document"); setTool("select");
  if (incomingImage?.src) { addImageSource(incomingImage.src, incomingImage.name || "Capture"); onIncomingConsumed(); }
  requestAnimationFrame(fitCanvas);
}
