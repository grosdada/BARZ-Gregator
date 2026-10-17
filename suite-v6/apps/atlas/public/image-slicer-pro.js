let guideSequence = 0;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const countValue = (value) => Math.max(1, Math.min(100, Number.parseInt(value, 10) || 1));
const equalCuts = (count) => Array.from({ length: Math.max(0, countValue(count) - 1) }, (_, index) => (index + 1) / countValue(count));
const nextId = (prefix) => `${prefix}-${++guideSequence}`;

function makeGuide(axis, position, start = 0, end = 1, options = {}) {
  return {
    id: nextId("pro-guide"),
    groupId: options.groupId || nextId("pro-group"),
    axis,
    position: clamp(Number(position) || .5, .005, .995),
    start: clamp(Math.min(start, end), 0, 1),
    end: clamp(Math.max(start, end), 0, 1),
    isolated: Boolean(options.isolated),
    duplicate: Boolean(options.duplicate)
  };
}

export function createProGuideGrid(columns = 1, rows = 1) {
  return [
    ...equalCuts(columns).map((position) => makeGuide("column", position)),
    ...equalCuts(rows).map((position) => makeGuide("row", position))
  ];
}

function crossingPositions(guides, guide) {
  const epsilon = 1e-8;
  return guides
    .filter((candidate) => candidate.axis !== guide.axis
      && candidate.position > guide.start + epsilon
      && candidate.position < guide.end - epsilon
      && guide.position >= candidate.start - epsilon
      && guide.position <= candidate.end + epsilon)
    .map((candidate) => candidate.position)
    .sort((a, b) => a - b)
    .filter((value, index, values) => index === 0 || Math.abs(value - values[index - 1]) > epsilon);
}

export function isolateProGuide(guides, id, along = .5) {
  const index = guides.findIndex((guide) => guide.id === id);
  if (index < 0) return null;
  const source = guides[index];
  if (source.isolated) return source;
  const stops = [source.start, ...crossingPositions(guides, source), source.end];
  const coordinate = clamp(Number(along) || .5, source.start, source.end);
  const pieces = [];
  let isolated = null;
  for (let stopIndex = 0; stopIndex < stops.length - 1; stopIndex += 1) {
    const start = stops[stopIndex];
    const end = stops[stopIndex + 1];
    if (end - start < 1e-6) continue;
    const ownsPointer = coordinate >= start - 1e-8 && coordinate <= end + 1e-8 && !isolated;
    const piece = makeGuide(source.axis, source.position, start, end, {
      groupId: ownsPointer ? nextId("pro-group") : source.groupId,
      isolated: ownsPointer,
      duplicate: source.duplicate
    });
    if (ownsPointer) isolated = piece;
    pieces.push(piece);
  }
  if (!isolated) {
    isolated = pieces[0] || makeGuide(source.axis, source.position, source.start, source.end, { isolated: true, duplicate: source.duplicate });
    isolated.isolated = true;
    isolated.groupId = nextId("pro-group");
    if (!pieces.length) pieces.push(isolated);
  }
  guides.splice(index, 1, ...pieces);
  return isolated;
}

export function duplicateProGuide(guides, id, offset = .025) {
  const source = guides.find((guide) => guide.id === id);
  if (!source) return [];
  const originals = source.isolated ? [source] : guides.filter((guide) => guide.groupId === source.groupId);
  const groupId = nextId("pro-group");
  const delta = source.position + offset >= .995 ? -Math.abs(offset) : Math.abs(offset);
  const copies = originals.map((guide) => makeGuide(guide.axis, clamp(guide.position + delta, .005, .995), guide.start, guide.end, {
    groupId,
    isolated: source.isolated,
    duplicate: true
  }));
  guides.push(...copies);
  return copies;
}

export function deleteProGuide(guides, id) {
  const source = guides.find((guide) => guide.id === id);
  if (!source) return false;
  const before = guides.length;
  const removeIds = new Set(source.isolated ? [source.id] : guides.filter((guide) => guide.groupId === source.groupId).map((guide) => guide.id));
  guides.splice(0, guides.length, ...guides.filter((guide) => !removeIds.has(guide.id)));
  return guides.length !== before;
}

export function moveProGuide(guides, id, position) {
  const source = guides.find((guide) => guide.id === id);
  if (!source) return false;
  const value = clamp(Number(position) || .005, .005, .995);
  const targets = source.isolated ? [source] : guides.filter((guide) => guide.groupId === source.groupId);
  targets.forEach((guide) => { guide.position = value; });
  return true;
}

function sortedStops(values) {
  return [...new Set(values.map((value) => Number(clamp(value, 0, 1).toFixed(8))))].sort((a, b) => a - b);
}

function guideBlocks(guide, boundary, midpoint) {
  return Math.abs(guide.position - boundary) < 1e-6 && midpoint > guide.start + 1e-7 && midpoint < guide.end - 1e-7;
}

export function collectProGuideRegions(guides = []) {
  const columns = guides.filter((guide) => guide.axis === "column");
  const rows = guides.filter((guide) => guide.axis === "row");
  const xs = sortedStops([0, 1, ...columns.map((guide) => guide.position), ...rows.flatMap((guide) => [guide.start, guide.end])]);
  const ys = sortedStops([0, 1, ...rows.map((guide) => guide.position), ...columns.flatMap((guide) => [guide.start, guide.end])]);
  const width = xs.length - 1;
  const height = ys.length - 1;
  const parent = Array.from({ length: width * height }, (_, index) => index);
  const find = (index) => parent[index] === index ? index : (parent[index] = find(parent[index]));
  const join = (a, b) => { const left = find(a); const right = find(b); if (left !== right) parent[right] = left; };
  const cell = (x, y) => y * width + x;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    if (x < width - 1) {
      const boundary = xs[x + 1]; const midpoint = (ys[y] + ys[y + 1]) / 2;
      if (!columns.some((guide) => guideBlocks(guide, boundary, midpoint))) join(cell(x, y), cell(x + 1, y));
    }
    if (y < height - 1) {
      const boundary = ys[y + 1]; const midpoint = (xs[x] + xs[x + 1]) / 2;
      if (!rows.some((guide) => guideBlocks(guide, boundary, midpoint))) join(cell(x, y), cell(x, y + 1));
    }
  }
  const groups = new Map();
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const root = find(cell(x, y));
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push({ x, y });
  }
  const regions = [];
  for (const cells of groups.values()) {
    const minX = Math.min(...cells.map((item) => item.x)); const maxX = Math.max(...cells.map((item) => item.x));
    const minY = Math.min(...cells.map((item) => item.y)); const maxY = Math.max(...cells.map((item) => item.y));
    const rectangular = cells.length === (maxX - minX + 1) * (maxY - minY + 1);
    const parts = rectangular ? [{ x: minX, y: minY, maxX, maxY }] : cells.map((item) => ({ ...item, maxX: item.x, maxY: item.y }));
    parts.forEach((part) => regions.push({ x: xs[part.x], y: ys[part.y], width: xs[part.maxX + 1] - xs[part.x], height: ys[part.maxY + 1] - ys[part.y] }));
  }
  return regions.filter((region) => region.width > 1e-6 && region.height > 1e-6)
    .sort((a, b) => a.y - b.y || a.x - b.x);
}

function element(tag, className = "", text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function action(label, className = "") {
  const node = element("button", className, label);
  node.type = "button";
  return node;
}

function numberSlider(labelText, value, onInput) {
  const label = element("label", "slicer-field", labelText);
  const controls = element("span", "slicer-grid-field");
  const range = document.createElement("input"); range.type = "range"; range.min = "1"; range.max = "20"; range.value = String(value);
  const number = document.createElement("input"); number.type = "number"; number.min = "1"; number.max = "100"; number.value = String(value);
  const commit = (raw) => { const next = countValue(raw); range.value = String(Math.min(20, next)); number.value = String(next); onInput(next); };
  range.addEventListener("input", () => commit(range.value)); number.addEventListener("input", () => commit(number.value));
  controls.append(range, number); label.append(controls);
  label.setValue = (next) => { range.value = String(Math.min(20, next)); number.value = String(next); };
  return label;
}

export function mountImageSlicerProV2({ host, configuration, onDirty, toast, helpers }) {
  const { chooseNativeSliceDestination, createReusableTileEncoder, renderTilesFast, renderTilesToNativeDirectory, safeStem, streamTilesToDirectory, writeEntriesToDirectory } = helpers;
  host.replaceChildren();
  const state = {
    guides: createProGuideGrid(configuration.columns, configuration.rows), zones: [], selectedZoneId: "",
    image: null, sourceFile: null, imageUrl: "", sourceName: "image", zoneMode: false, drawingZone: null, menuTarget: null,
    destinationHandle: null, nativeDestination: null
  };
  const layout = element("div", "slicer-layout slicer-pro-v2-layout");
  const work = element("section", "slicer-work");
  const controls = element("aside", "slicer-controls");
  const dropZone = element("label", "slicer-drop");
  const fileInput = document.createElement("input"); fileInput.type = "file"; fileInput.accept = "image/png,image/jpeg,image/webp,image/gif";
  dropZone.append(fileInput, element("span", "slicer-drop-icon", "▧"), element("b", "", "Dépose une image ou clique pour la choisir"), element("small", "", "Les découpes apparaissent en temps réel"));
  const preview = element("div", "slicer-preview"); preview.hidden = true;
  const previewHead = element("div", "slicer-preview-head"); const imageInfo = element("span", "", "—"); const clear = action("Changer d’image", "quiet-button"); previewHead.append(imageInfo, clear);
  const stage = element("div", "slicer-stage"); const frame = element("div", "slicer-image-frame"); const image = document.createElement("img"); image.alt = "Aperçu Image Slicer Pro";
  const overlay = element("div", "slicer-grid-overlay slicer-pro-v2-overlay"); frame.append(image, overlay); stage.append(frame); preview.append(previewHead, stage); work.append(dropZone, preview);

  const heading = element("div", "slicer-control-head"); heading.append(element("span", "", "DÉCOUPE PRO"), element("b", "", "Segments directs"));
  const help = element("p", "slicer-pro-v2-help", "Glisse n’importe quel trait. Clic droit : isoler, dupliquer ou supprimer.");
  const grid = element("div", "slicer-control-grid");
  const count = element("b", "slicer-count", "1 segment");
  const replaceAxis = (axis, amount) => {
    const key = axis === "column" ? "columns" : "rows"; configuration[key] = amount; onDirty();
    state.guides = state.guides.filter((guide) => guide.axis !== axis);
    const additions = axis === "column" ? createProGuideGrid(amount, 1).filter((guide) => guide.axis === axis) : createProGuideGrid(1, amount).filter((guide) => guide.axis === axis);
    state.guides.push(...additions); render();
  };
  const columnsControl = numberSlider("Colonnes", configuration.columns, (value) => replaceAxis("column", value));
  const rowsControl = numberSlider("Lignes", configuration.rows, (value) => replaceAxis("row", value));
  grid.append(columnsControl, rowsControl);
  const zoneTool = action("Slice Zone", "quiet-button slicer-zone-tool");
  const clearSlices = action("Clear slices", "quiet-button slicer-clear-slices");
  const sliceActions = element("div", "slicer-pro-v2-actions"); sliceActions.append(zoneTool, clearSlices);
  const zoneFields = element("fieldset", "slicer-pro-zone-settings"); const zoneLegend = element("legend", "", "Découpe de la zone");
  const zoneX = document.createElement("input"); zoneX.type = "number"; zoneX.min = "1"; zoneX.max = "20"; zoneX.value = "1";
  const zoneY = document.createElement("input"); zoneY.type = "number"; zoneY.min = "1"; zoneY.max = "20"; zoneY.value = "1";
  const zoneXLabel = element("label", "", "X"); zoneXLabel.append(zoneX); const zoneYLabel = element("label", "", "Y"); zoneYLabel.append(zoneY); zoneFields.append(zoneLegend, zoneXLabel, zoneYLabel); zoneFields.hidden = true;
  const formatLabel = element("label", "slicer-field", "Format"); const format = document.createElement("select");
  for (const value of ["png", "jpeg", "webp"]) { const option = element("option", "", value === "jpeg" ? "JPG" : value.toUpperCase()); option.value = value; option.selected = configuration.format === value; format.append(option); } formatLabel.append(format);
  const prefixLabel = element("label", "slicer-field", "Préfixe"); const prefix = document.createElement("input"); prefix.value = configuration.prefix; prefix.maxLength = 80; prefixLabel.append(prefix);
  const qualityLabel = element("label", "slicer-field slicer-quality", "Qualité JPG / WEBP"); const quality = document.createElement("input"); quality.type = "range"; quality.min = ".1"; quality.max = "1"; quality.step = ".01"; quality.value = String(configuration.quality); const qualityValue = element("span", "", `${Math.round(configuration.quality * 100)} %`); qualityLabel.append(quality, qualityValue);
  const destination = element("div", "slicer-destination");
  const destinationCopy = element("div", "slicer-destination-copy"); destinationCopy.append(element("span", "", "Destination"), element("b", "", "Choisir un dossier"));
  const destinationPath = destinationCopy.lastElementChild;
  const browseDestination = action("Parcourir…", "quiet-button");
  const resetDestination = action("Changer de dossier", "quiet-button"); resetDestination.hidden = true;
  destination.append(destinationCopy, browseDestination, resetDestination);
  const status = element("div", "slicer-status"); const statusText = element("span", "", "Charge une image pour commencer."); const progress = document.createElement("progress"); progress.max = 100; progress.value = 0; status.append(statusText, progress);
  const exportButton = action("Slice and save", "primary-action slicer-export"); exportButton.disabled = true;
  controls.append(heading, help, grid, count, sliceActions, zoneFields, formatLabel, prefixLabel, qualityLabel, destination, status, exportButton); layout.append(work, controls); host.append(layout);

  const menu = element("div", "slicer-pro-menu slicer-pro-v2-menu"); menu.hidden = true;
  const menuIsolate = action("Isolate"); const menuDuplicate = action("Duplicate"); const menuDelete = action("Delete segment"); const menuDeleteAll = action("Delete all segments"); menu.append(menuIsolate, menuDuplicate, menuDelete, menuDeleteAll); document.body.append(menu);

  function zoneById(id) { return state.zones.find((zone) => zone.id === id); }
  function zoneSegments(zone) {
    const xs = [0, ...equalCuts(zone.columns), 1]; const ys = [0, ...equalCuts(zone.rows), 1]; const output = [];
    for (let row = 0; row < zone.rows; row += 1) for (let column = 0; column < zone.columns; column += 1) output.push({
      x: zone.x + zone.width * xs[column], y: zone.y + zone.height * ys[row], width: zone.width * (xs[column + 1] - xs[column]), height: zone.height * (ys[row + 1] - ys[row])
    });
    return output;
  }
  function exportRegions() { return [...collectProGuideRegions(state.guides), ...state.zones.flatMap(zoneSegments)]; }
  function syncZoneFields() {
    const zone = zoneById(state.selectedZoneId); zoneFields.hidden = !zone;
    if (zone) { zoneX.value = String(zone.columns); zoneY.value = String(zone.rows); }
  }
  function showMenu(event, target) {
    state.menuTarget = target; menuIsolate.hidden = target.type !== "guide" || target.guide.isolated; menuDuplicate.textContent = target.type === "zone" ? "Duplicate zone" : "Duplicate"; menuDelete.textContent = target.type === "zone" ? "Delete zone" : "Delete segment";
    menu.hidden = false; menu.style.left = `${Math.min(event.clientX, innerWidth - 220)}px`; menu.style.top = `${Math.min(event.clientY, innerHeight - 190)}px`;
  }
  function render() {
    const regions = collectProGuideRegions(state.guides);
    count.textContent = `${regions.length + state.zones.flatMap(zoneSegments).length} découpe${regions.length + state.zones.flatMap(zoneSegments).length > 1 ? "s" : ""} · ${state.guides.length} trait${state.guides.length > 1 ? "s" : ""}`;
    const regionElements = regions.map((region, index) => { const cell = element("div", "slicer-pro-region", String(index + 1)); Object.assign(cell.style, { left: `${region.x * 100}%`, top: `${region.y * 100}%`, width: `${region.width * 100}%`, height: `${region.height * 100}%` }); return cell; });
    const zoneElements = state.zones.map((zone) => {
      const selected = zone.id === state.selectedZoneId; const cell = action(`ZONE · ${zone.columns}×${zone.rows}`, `slicer-pro-zone${selected ? " is-selected" : ""}`); cell.dataset.zoneId = zone.id; Object.assign(cell.style, { left: `${zone.x * 100}%`, top: `${zone.y * 100}%`, width: `${zone.width * 100}%`, height: `${zone.height * 100}%` });
      cell.addEventListener("click", (event) => { event.stopPropagation(); state.selectedZoneId = zone.id; syncZoneFields(); render(); });
      cell.addEventListener("contextmenu", (event) => { event.preventDefault(); event.stopPropagation(); state.selectedZoneId = zone.id; syncZoneFields(); showMenu(event, { type: "zone", zone }); });
      cell.addEventListener("pointerdown", (event) => { if (event.button !== 0 || event.target.closest(".slicer-zone-handle")) return; startZoneTransform(event, zone, "move"); });
      if (selected) for (const edge of ["nw", "ne", "sw", "se"]) { const handle = element("i", `slicer-zone-handle is-${edge}`); handle.addEventListener("pointerdown", (event) => startZoneTransform(event, zone, edge)); cell.append(handle); }
      return cell;
    });
    const guideElements = state.guides.map((guide) => {
      const classes = `slicer-pro-v2-guide is-${guide.axis}${guide.isolated ? " is-isolated" : ""}${guide.duplicate ? " is-duplicate" : ""}`;
      const line = action("", classes); line.dataset.guideId = guide.id; line.dataset.groupId = guide.groupId; line.title = guide.isolated ? "Segment isolé · glisser indépendamment" : guide.duplicate ? "Segment dupliqué · glisser" : "Segment continu · glisser";
      Object.assign(line.style, guide.axis === "column" ? { left: `${guide.position * 100}%`, top: `${guide.start * 100}%`, height: `${(guide.end - guide.start) * 100}%` } : { top: `${guide.position * 100}%`, left: `${guide.start * 100}%`, width: `${(guide.end - guide.start) * 100}%` });
      line.addEventListener("contextmenu", (event) => { event.preventDefault(); event.stopPropagation(); const rect = overlay.getBoundingClientRect(); const along = guide.axis === "column" ? (event.clientY - rect.top) / rect.height : (event.clientX - rect.left) / rect.width; showMenu(event, { type: "guide", guide, along }); });
      line.addEventListener("pointerdown", (event) => startGuideMove(event, guide, line)); return line;
    });
    overlay.replaceChildren(...regionElements, ...zoneElements, ...guideElements); syncZoneFields();
  }
  function startGuideMove(event, guide, line) {
    if (event.button !== 0 || state.drawingZone) return; event.preventDefault(); event.stopPropagation(); line.setPointerCapture(event.pointerId);
    const move = (pointerEvent) => { const rect = overlay.getBoundingClientRect(); const position = guide.axis === "column" ? (pointerEvent.clientX - rect.left) / rect.width : (pointerEvent.clientY - rect.top) / rect.height; moveProGuide(state.guides, guide.id, position); const source = state.guides.find((item) => item.id === guide.id); const targets = source.isolated ? [source] : state.guides.filter((item) => item.groupId === source.groupId); targets.forEach((item) => { const target = overlay.querySelector(`[data-guide-id="${item.id}"]`); if (target) target.style[item.axis === "column" ? "left" : "top"] = `${item.position * 100}%`; }); };
    const finish = () => { line.removeEventListener("pointermove", move); render(); }; line.addEventListener("pointermove", move); line.addEventListener("pointerup", finish, { once: true }); line.addEventListener("pointercancel", finish, { once: true });
  }
  function startZoneTransform(event, zone, mode) {
    if (state.drawingZone) return; event.preventDefault(); event.stopPropagation(); const target = event.currentTarget; target.setPointerCapture(event.pointerId); const rect = overlay.getBoundingClientRect(); const start = { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height }; const original = { x: zone.x, y: zone.y, width: zone.width, height: zone.height }; state.selectedZoneId = zone.id;
    const move = (pointerEvent) => { const point = { x: (pointerEvent.clientX - rect.left) / rect.width, y: (pointerEvent.clientY - rect.top) / rect.height }; const dx = point.x - start.x; const dy = point.y - start.y; const minimum = .02; if (mode === "move") { zone.x = clamp(original.x + dx, 0, 1 - original.width); zone.y = clamp(original.y + dy, 0, 1 - original.height); } else { let left = original.x; let right = original.x + original.width; let top = original.y; let bottom = original.y + original.height; if (mode.includes("w")) left = clamp(original.x + dx, 0, right - minimum); if (mode.includes("e")) right = clamp(original.x + original.width + dx, left + minimum, 1); if (mode.includes("n")) top = clamp(original.y + dy, 0, bottom - minimum); if (mode.includes("s")) bottom = clamp(original.y + original.height + dy, top + minimum, 1); Object.assign(zone, { x: left, y: top, width: right - left, height: bottom - top }); } const cell = overlay.querySelector(`[data-zone-id="${zone.id}"]`); if (cell) Object.assign(cell.style, { left: `${zone.x * 100}%`, top: `${zone.y * 100}%`, width: `${zone.width * 100}%`, height: `${zone.height * 100}%` }); };
    const finish = () => { target.removeEventListener("pointermove", move); render(); }; target.addEventListener("pointermove", move); target.addEventListener("pointerup", finish, { once: true }); target.addEventListener("pointercancel", finish, { once: true });
  }
  function setZoneMode(active) { state.zoneMode = active; state.drawingZone = null; zoneTool.classList.toggle("is-active", active); overlay.classList.toggle("is-zone-drawing", active); statusText.textContent = active ? "Trace une Slice Zone. Clique ensuite hors de la zone pour en tracer une autre." : "Mode segments : clic droit sur un trait pour l’éditer."; }
  menuIsolate.addEventListener("click", () => { if (state.menuTarget?.type === "guide") { const isolated = isolateProGuide(state.guides, state.menuTarget.guide.id, state.menuTarget.along); if (isolated) toast("Segment isolé : il se déplace maintenant indépendamment."); } menu.hidden = true; render(); });
  menuDuplicate.addEventListener("click", () => { if (state.menuTarget?.type === "guide") duplicateProGuide(state.guides, state.menuTarget.guide.id); else if (state.menuTarget?.type === "zone") { const zone = state.menuTarget.zone; state.zones.push({ ...zone, id: nextId("pro-zone"), x: clamp(zone.x + .025, 0, 1 - zone.width), y: clamp(zone.y + .025, 0, 1 - zone.height) }); } menu.hidden = true; render(); });
  menuDelete.addEventListener("click", () => { if (state.menuTarget?.type === "guide") deleteProGuide(state.guides, state.menuTarget.guide.id); else if (state.menuTarget?.type === "zone") state.zones = state.zones.filter((zone) => zone.id !== state.menuTarget.zone.id); state.selectedZoneId = ""; menu.hidden = true; render(); });
  menuDeleteAll.addEventListener("click", () => { state.guides = []; menu.hidden = true; render(); toast("Tous les segments ont été supprimés."); });
  document.addEventListener("pointerdown", (event) => { if (!menu.hidden && !menu.contains(event.target)) menu.hidden = true; });
  zoneTool.addEventListener("click", () => setZoneMode(!state.zoneMode));
  clearSlices.addEventListener("click", () => {
    state.guides = []; state.zones = []; state.selectedZoneId = ""; state.menuTarget = null;
    configuration.columns = 1; configuration.rows = 1; columnsControl.setValue(1); rowsControl.setValue(1); onDirty();
    setZoneMode(false); render(); toast("Toutes les découpes ont été effacées.");
  });
  const updateZoneGrid = () => { const zone = zoneById(state.selectedZoneId); if (!zone) return; zone.columns = countValue(zoneX.value); zone.rows = countValue(zoneY.value); render(); };
  zoneX.addEventListener("input", updateZoneGrid); zoneY.addEventListener("input", updateZoneGrid);
  format.addEventListener("change", () => { configuration.format = format.value; onDirty(); }); prefix.addEventListener("input", () => { configuration.prefix = prefix.value; onDirty(); }); quality.addEventListener("input", () => { configuration.quality = Number(quality.value); qualityValue.textContent = `${Math.round(configuration.quality * 100)} %`; onDirty(); });
  async function chooseDestination() {
    try {
      const destination = await chooseNativeSliceDestination();
      if (!destination) return null;
      state.nativeDestination = destination; state.destinationHandle = null;
      destinationPath.textContent = `${destination.name}/ · écriture native rapide`; resetDestination.hidden = false;
      return destination;
    } catch (nativeError) {
      if (typeof window.showDirectoryPicker !== "function") throw nativeError;
      const handle = await window.showDirectoryPicker({ mode: "readwrite", id: "barz-image-slicer-pro-output" });
      const permission = await handle.requestPermission?.({ mode: "readwrite" });
      if (permission && permission !== "granted") throw new Error("Autorisation d’écriture refusée pour ce dossier.");
      state.destinationHandle = handle; state.nativeDestination = null; destinationPath.textContent = `${handle.name}/`; resetDestination.hidden = false; return handle;
    }
  }
  browseDestination.addEventListener("click", async () => { try { await chooseDestination(); } catch (error) { if (error.name !== "AbortError") toast(error.message, true); } });
  resetDestination.addEventListener("click", async () => { try { await chooseDestination(); } catch (error) { if (error.name !== "AbortError") toast(error.message, true); } });
  overlay.addEventListener("pointerdown", (event) => { if (!state.zoneMode || event.target !== overlay) return; event.preventDefault(); const rect = overlay.getBoundingClientRect(); const startX = clamp((event.clientX - rect.left) / rect.width, 0, 1); const startY = clamp((event.clientY - rect.top) / rect.height, 0, 1); const draft = element("div", "slicer-zone-draft"); overlay.append(draft); overlay.setPointerCapture(event.pointerId); state.selectedZoneId = ""; state.drawingZone = { startX, startY, x: startX, y: startY, width: 0, height: 0, draft }; }, true);
  overlay.addEventListener("pointermove", (event) => { const zone = state.drawingZone; if (!zone?.draft) return; const rect = overlay.getBoundingClientRect(); const x = clamp((event.clientX - rect.left) / rect.width, 0, 1); const y = clamp((event.clientY - rect.top) / rect.height, 0, 1); zone.x = Math.min(zone.startX, x); zone.y = Math.min(zone.startY, y); zone.width = Math.abs(x - zone.startX); zone.height = Math.abs(y - zone.startY); Object.assign(zone.draft.style, { left: `${zone.x * 100}%`, top: `${zone.y * 100}%`, width: `${zone.width * 100}%`, height: `${zone.height * 100}%` }); }, true);
  const finishZone = (event) => { const draft = state.drawingZone; if (!draft?.draft) return; event.preventDefault(); draft.draft.remove(); if (draft.width > .01 && draft.height > .01) { const zone = { id: nextId("pro-zone"), x: draft.x, y: draft.y, width: draft.width, height: draft.height, columns: 1, rows: 1 }; state.zones.push(zone); state.selectedZoneId = zone.id; toast("Slice Zone ajoutée. Clique hors de la zone pour en tracer une autre."); } state.drawingZone = null; render(); };
  overlay.addEventListener("pointerup", finishZone, true); overlay.addEventListener("pointercancel", finishZone, true);

  async function loadFile(file) {
    if (!file?.type.startsWith("image/")) return toast("Choisis un fichier image valide.", true); if (state.imageUrl) URL.revokeObjectURL(state.imageUrl); state.imageUrl = URL.createObjectURL(file); const loaded = new Image(); loaded.decoding = "async"; loaded.src = state.imageUrl; try { await loaded.decode(); } catch { return toast("Cette image ne peut pas être décodée.", true); }
    state.image = loaded; state.sourceFile = file; state.sourceName = safeStem(file.name.replace(/\.[^.]+$/, ""), "image"); state.guides = createProGuideGrid(configuration.columns, configuration.rows); state.zones = []; state.selectedZoneId = ""; image.src = state.imageUrl; imageInfo.textContent = `${file.name} · ${loaded.naturalWidth} × ${loaded.naturalHeight}px`; dropZone.hidden = true; preview.hidden = false; exportButton.disabled = false; statusText.textContent = "Glisse les traits ou utilise le clic droit pour les éditer."; render();
  }
  fileInput.addEventListener("change", () => loadFile(fileInput.files[0])); dropZone.addEventListener("dragover", (event) => { event.preventDefault(); dropZone.classList.add("is-over"); }); dropZone.addEventListener("dragleave", () => dropZone.classList.remove("is-over")); dropZone.addEventListener("drop", (event) => { event.preventDefault(); dropZone.classList.remove("is-over"); loadFile(event.dataTransfer.files[0]); });
  clear.addEventListener("click", () => { if (state.imageUrl) URL.revokeObjectURL(state.imageUrl); state.imageUrl = ""; state.image = null; state.sourceFile = null; fileInput.value = ""; preview.hidden = true; dropZone.hidden = false; exportButton.disabled = true; statusText.textContent = "Charge une image pour commencer."; });
  exportButton.addEventListener("click", async () => {
    if (!state.image) return; exportButton.disabled = true; progress.value = 0; const regions = exportRegions();
    const extension = configuration.format === "jpeg" ? "jpg" : configuration.format;
    try {
      if (!regions.length) throw new Error("Ajoute au moins une découpe avant d’enregistrer.");
      if (!state.destinationHandle && !state.nativeDestination) {
        const selected = await chooseDestination();
        if (!selected) { statusText.textContent = "Enregistrement annulé."; return; }
      }
      const tiles = regions.map((region, index) => {
        const sx = Math.round(region.x * state.image.naturalWidth); const sy = Math.round(region.y * state.image.naturalHeight);
        const ex = Math.round((region.x + region.width) * state.image.naturalWidth); const ey = Math.round((region.y + region.height) * state.image.naturalHeight);
        return { sx, sy, width: Math.max(1, ex - sx), height: Math.max(1, ey - sy), name: `${state.sourceName}_${safeStem(configuration.prefix, "slice")}_${String(index + 1).padStart(2, "0")}.${extension}` };
      });
      if (state.nativeDestination) {
        statusText.textContent = `Découpe + écriture native de ${tiles.length} fichiers…`;
        const timing = await renderTilesToNativeDirectory(state.sourceFile, tiles, configuration.format, configuration.quality, state.nativeDestination.token);
        progress.value = 100; statusText.textContent = `${timing.count} fichiers enregistrés dans ${state.nativeDestination.name}/ · ${(timing.totalMs / 1000).toFixed(2)} s`; toast(`${timing.count} découpes enregistrées en ${(timing.totalMs / 1000).toFixed(2)} s.`);
        return;
      }
      const target = state.destinationHandle;
      let fastEntries = null;
      try {
        statusText.textContent = `Découpe rapide de ${tiles.length} fichiers…`;
        fastEntries = await renderTilesFast(state.sourceFile, tiles, configuration.format, configuration.quality);
      } catch (fastError) {
        console.warn("Fast slicer unavailable, using browser fallback.", fastError);
      }
      if (fastEntries) {
        await writeEntriesToDirectory(fastEntries, target, (done) => { progress.value = Math.round(done / tiles.length * 100); statusText.textContent = `Écriture ${done} / ${tiles.length}`; }, Math.min(4, navigator.hardwareConcurrency || 4));
      } else {
        const encodeTile = createReusableTileEncoder(state.image, `image/${configuration.format}`, configuration.quality);
        await streamTilesToDirectory(tiles, target, encodeTile, (done) => { progress.value = Math.round(done / tiles.length * 100); statusText.textContent = `Création + écriture ${done} / ${tiles.length}`; });
      }
      progress.value = 100; statusText.textContent = `${regions.length} fichiers enregistrés dans ${target.name}/ · 100 %`; toast(`${regions.length} découpes enregistrées dans ${target.name}/.`);
    } catch (error) {
      if (error.name !== "AbortError") { statusText.textContent = "Échec de la découpe."; toast(error.message, true); }
      else statusText.textContent = "Enregistrement annulé.";
    } finally { exportButton.disabled = false; }
  });
  render();
}
