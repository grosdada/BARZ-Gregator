import { mountImageSlicerProV2 } from "./image-slicer-pro.js";

const textEncoder = new TextEncoder();

function element(tag, className = "", text = undefined) {
  const value = document.createElement(tag);
  if (className) value.className = className;
  if (text !== undefined) value.textContent = text;
  return value;
}

function controlButton(label, className = "") {
  const value = element("button", className, label);
  value.type = "button";
  return value;
}

function equalLines(count) {
  return Array.from({ length: count - 1 }, (_, index) => (index + 1) / count);
}

let guideSequence = 0;
function movableLines(count) {
  return equalLines(count).map((fraction) => ({ id: `guide-${++guideSequence}`, fraction }));
}

function safeStem(value, fallback) {
  const cleaned = value.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/[. ]+$/g, "").slice(0, 80);
  return cleaned || fallback;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  return {
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    time: (date.getHours() << 11) | (date.getMinutes() << 5)
      | Math.floor(date.getSeconds() / 2)
  };
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function uint16(value) {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}

function uint32(value) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return bytes;
}

function joinBytes(parts) {
  const output = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

export async function buildStoredZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const stamp = dosDateTime();
  for (const entry of entries) {
    const name = textEncoder.encode(entry.name);
    const data = new Uint8Array(await entry.blob.arrayBuffer());
    const checksum = crc32(data);
    const common = [uint16(20), uint16(0x0800), uint16(0), uint16(stamp.time),
      uint16(stamp.date), uint32(checksum), uint32(data.length), uint32(data.length),
      uint16(name.length), uint16(0)];
    const local = joinBytes([uint32(0x04034b50), ...common, name, data]);
    localParts.push(local);
    centralParts.push(joinBytes([
      uint32(0x02014b50), uint16(20), ...common, uint16(0), uint16(0), uint16(0),
      uint32(0), uint32(offset), name
    ]));
    offset += local.length;
  }
  const central = joinBytes(centralParts);
  const end = joinBytes([
    uint32(0x06054b50), uint16(0), uint16(0), uint16(entries.length),
    uint16(entries.length), uint32(central.length), uint32(offset), uint16(0)
  ]);
  return new Blob([...localParts, central, end], { type: "application/zip" });
}

export async function writeEntriesToDirectory(entries, directoryHandle, onProgress = () => {}, concurrency = 1) {
  let next = 0; let done = 0;
  const worker = async () => {
    while (next < entries.length) {
      const entry = entries[next++];
      const fileHandle = await directoryHandle.getFileHandle(entry.name, { create: true });
      const writable = await fileHandle.createWritable();
      try { await writable.write(entry.blob); } finally { await writable.close(); }
      done += 1; onProgress(done, entries.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(Math.max(1, concurrency), entries.length || 1) }, worker));
}

function canvasBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error(`Le navigateur ne peut pas encoder ${type}.`));
    }, type, quality);
  });
}

async function tileBlob(image, sx, sy, width, height, type, quality) {
  if (typeof OffscreenCanvas === "function") {
    const canvas = new OffscreenCanvas(width, height);
    canvas.getContext("2d", { alpha: type !== "image/jpeg" }).drawImage(image, sx, sy, width, height, 0, 0, width, height);
    return canvas.convertToBlob({ type, quality });
  }
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  canvas.getContext("2d", { alpha: type !== "image/jpeg" }).drawImage(image, sx, sy, width, height, 0, 0, width, height);
  return canvasBlob(canvas, type, quality);
}

export function createReusableTileEncoder(image, type, quality) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: type !== "image/jpeg" });
  return async ({ sx, sy, width, height }) => {
    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);
    context.drawImage(image, sx, sy, width, height, 0, 0, width, height);
    return canvasBlob(canvas, type, quality);
  };
}

export async function streamTilesToDirectory(tiles, directoryHandle, encodeTile, onProgress = () => {}) {
  let done = 0;
  for (const tile of tiles) {
    const blob = await encodeTile(tile);
    const fileHandle = await directoryHandle.getFileHandle(tile.name, { create: true });
    const writable = await fileHandle.createWritable();
    try { await writable.write(blob); } finally { await writable.close(); }
    done += 1;
    onProgress(done, tiles.length);
  }
}

export function packFastSliceRequest(sourceBlob, tiles, format, quality) {
  const metadata = new TextEncoder().encode(JSON.stringify({ format, quality, tiles }));
  const prefix = new Uint8Array(4);
  new DataView(prefix.buffer).setUint32(0, metadata.length, false);
  return new Blob([prefix, metadata, sourceBlob], { type: "application/vnd.barz-slicer-request" });
}

export function unpackFastSliceResponse(payload) {
  const bytes = payload instanceof Uint8Array ? payload : new Uint8Array(payload);
  if (bytes.byteLength < 6) throw new Error("Réponse incomplète du moteur de découpe rapide.");
  const headerLength = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, false);
  if (headerLength < 2 || 4 + headerLength > bytes.byteLength) throw new Error("Réponse invalide du moteur de découpe rapide.");
  let manifest;
  try { manifest = JSON.parse(new TextDecoder().decode(bytes.subarray(4, 4 + headerLength))); }
  catch { throw new Error("Manifeste invalide du moteur de découpe rapide."); }
  if (!Array.isArray(manifest.files)) throw new Error("Aucune découpe reçue du moteur rapide.");
  let offset = 4 + headerLength;
  return manifest.files.map(({ name, length }) => {
    if (typeof name !== "string" || !Number.isInteger(length) || length < 0 || offset + length > bytes.byteLength) {
      throw new Error("Découpe corrompue reçue du moteur rapide.");
    }
    const blob = new Blob([bytes.slice(offset, offset + length)]);
    offset += length;
    return { name, blob };
  });
}

export async function renderTilesFast(sourceBlob, tiles, format, quality, fetchImplementation = fetch) {
  if (!sourceBlob) throw new Error("Image source indisponible pour le moteur rapide.");
  const response = await fetchImplementation("/api/v1/tools/image-slicer/render", {
    method: "POST",
    headers: { "Content-Type": "application/vnd.barz-slicer-request" },
    body: packFastSliceRequest(sourceBlob, tiles, format, quality)
  });
  if (!response.ok) throw new Error(`Le moteur rapide a répondu ${response.status}.`);
  return unpackFastSliceResponse(await response.arrayBuffer());
}

export async function chooseNativeSliceDestination(fetchImplementation = fetch) {
  const response = await fetchImplementation("/api/v1/tools/image-slicer/destination", { method: "POST" });
  if (!response.ok) throw new Error(`Le sélecteur de dossier rapide a répondu ${response.status}.`);
  const destination = await response.json();
  if (destination.cancelled) return null;
  if (!destination.token || !destination.name) throw new Error("Destination rapide invalide.");
  return destination;
}

export async function renderTilesToNativeDirectory(sourceBlob, tiles, format, quality, destinationToken, fetchImplementation = fetch) {
  if (!destinationToken) throw new Error("Destination rapide manquante.");
  const response = await fetchImplementation("/api/v1/tools/image-slicer/render-to-directory", {
    method: "POST",
    headers: {
      "Content-Type": "application/vnd.barz-slicer-request",
      "X-Barz-Destination-Token": destinationToken
    },
    body: packFastSliceRequest(sourceBlob, tiles, format, quality)
  });
  if (!response.ok) throw new Error(`L’écriture native a répondu ${response.status}.`);
  return response.json();
}

async function mapConcurrent(items, concurrency, mapper) {
  const output = new Array(items.length); let next = 0;
  const worker = async () => {
    while (next < items.length) { const index = next++; output[index] = await mapper(items[index], index); }
  };
  await Promise.all(Array.from({ length: Math.min(Math.max(1, concurrency), items.length || 1) }, worker));
  return output;
}

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function gridField(labelText, value, onChange) {
  const label = element("label", "slicer-field", labelText);
  const controls = element("span", "slicer-grid-field");
  const range = document.createElement("input");
  range.type = "range";
  range.min = "1";
  range.max = "20";
  range.step = "1";
  range.value = String(Math.min(value, 20));
  const input = document.createElement("input");
  input.type = "number";
  input.min = "1";
  input.max = "100";
  input.value = String(value);
  const commit = (raw) => {
    const next = Math.max(1, Math.min(100, Number.parseInt(raw, 10) || 1));
    input.value = String(next);
    range.value = String(Math.min(next, 20));
    onChange(next);
  };
  range.addEventListener("input", () => commit(range.value));
  input.addEventListener("input", () => commit(input.value));
  controls.append(range, input);
  label.append(controls);
  return label;
}

function mountImageSlicerClassic({ host, header, configuration, onDirty, toast }) {
  host.replaceChildren();
  if (header) host.append(header);
  const state = {
    image: null,
    sourceFile: null,
    imageUrl: "",
    sourceName: "image",
    sourceFileHandle: null,
    sourceDirectoryHandle: null,
    destinationHandle: null,
    nativeDestination: null,
    colLines: movableLines(configuration.columns),
    rowLines: movableLines(configuration.rows),
    dragging: null
  };

  const layout = element("div", "slicer-layout");
  const work = element("section", "slicer-work");
  const controls = element("aside", "slicer-controls");
  const dropZone = element("label", "slicer-drop");
  dropZone.tabIndex = 0;
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/png,image/jpeg,image/webp,image/gif";
  dropZone.append(
    fileInput,
    element("span", "slicer-drop-icon", "▧"),
    element("b", "", "Dépose une image ou clique pour la choisir"),
    element("small", "", "PNG · JPG · WEBP · GIF — traitement entièrement local")
  );

  const preview = element("div", "slicer-preview");
  preview.hidden = true;
  const previewHead = element("div", "slicer-preview-head");
  const imageInfo = element("span", "", "—");
  const clear = controlButton("Changer d’image", "quiet-button");
  previewHead.append(imageInfo, clear);
  const stage = element("div", "slicer-stage");
  const imageFrame = element("div", "slicer-image-frame");
  const image = document.createElement("img");
  image.alt = "Aperçu de l’image à découper";
  const overlay = element("div", "slicer-grid-overlay");
  imageFrame.append(image, overlay);
  stage.append(imageFrame);
  preview.append(previewHead, stage);
  work.append(dropZone, preview);

  const title = element("div", "slicer-control-head");
  title.append(element("span", "", "DÉCOUPE"), element("b", "", "Grille ajustable"));
  const grid = element("div", "slicer-control-grid");
  const tileCount = element("b", "slicer-count", "—");
  const formatLabel = element("label", "slicer-field", "Format");
  const format = document.createElement("select");
  for (const value of ["png", "jpeg", "webp"]) {
    const option = element("option", "", value === "jpeg" ? "JPG" : value.toUpperCase());
    option.value = value;
    option.selected = configuration.format === value;
    format.append(option);
  }
  formatLabel.append(format);
  const prefixLabel = element("label", "slicer-field", "Préfixe");
  const prefix = document.createElement("input");
  prefix.type = "text";
  prefix.maxLength = 80;
  prefix.value = configuration.prefix;
  prefixLabel.append(prefix);
  const qualityLabel = element("label", "slicer-field slicer-quality", "Qualité JPG / WEBP");
  const quality = document.createElement("input");
  quality.type = "range";
  quality.min = "0.1";
  quality.max = "1";
  quality.step = "0.01";
  quality.value = String(configuration.quality);
  const qualityValue = element("span", "", `${Math.round(configuration.quality * 100)} %`);
  qualityLabel.append(quality, qualityValue);

  const destination = element("div", "slicer-destination");
  const destinationCopy = element("div", "slicer-destination-copy");
  destinationCopy.append(
    element("span", "", "Destination"),
    element("b", "", "Dossier de l’image source")
  );
  const destinationPath = destinationCopy.lastElementChild;
  const browseDestination = controlButton("Parcourir…", "quiet-button");
  const resetDestination = controlButton("Revenir au dossier source", "quiet-button");
  const openFolder = controlButton("Open Folder", "quiet-button slicer-open-folder");
  openFolder.disabled = true;
  resetDestination.hidden = true;
  destination.append(destinationCopy, browseDestination, resetDestination, openFolder);

  const status = element("div", "slicer-status");
  const statusText = element("span", "", "Charge une image pour commencer.");
  const progress = document.createElement("progress");
  progress.max = 100;
  progress.value = 0;
  status.append(statusText, progress);
  const exportButton = controlButton("Découper et enregistrer", "primary-action slicer-export");
  exportButton.disabled = true;

  function updateCount() {
    const total = configuration.columns * configuration.rows;
    tileCount.textContent = `${total} tuile${total > 1 ? "s" : ""}`;
    tileCount.classList.toggle("is-warning", total > 400);
    tileCount.title = total > 400
      ? "Une grille très dense peut demander beaucoup de mémoire et de temps."
      : "";
  }

  function updateConfiguration(key, value) {
    configuration[key] = value;
    onDirty();
    updateCount();
  }

  function resetLines(axis) {
    if (axis === "columns") state.colLines = movableLines(configuration.columns);
    else state.rowLines = movableLines(configuration.rows);
    renderGrid();
  }

  grid.append(
    gridField("Colonnes", configuration.columns, (value) => {
      updateConfiguration("columns", value);
      resetLines("columns");
    }),
    gridField("Lignes", configuration.rows, (value) => {
      updateConfiguration("rows", value);
      resetLines("rows");
    })
  );
  format.addEventListener("change", () => updateConfiguration("format", format.value));
  prefix.addEventListener("input", () => updateConfiguration("prefix", prefix.value));
  quality.addEventListener("input", () => {
    const value = Number(quality.value);
    qualityValue.textContent = `${Math.round(value * 100)} %`;
    updateConfiguration("quality", value);
  });
  controls.append(title, grid, tileCount, formatLabel, prefixLabel, qualityLabel, destination,
    status, exportButton);
  layout.append(work, controls);
  host.append(layout);
  updateCount();

  function syncGuidePositions(axis) {
    const values = axis === "column" ? state.colLines : state.rowLines;
    values.forEach((guide) => {
      const control = overlay.querySelector(`[data-guide-id="${guide.id}"]`);
      if (control) control.style[axis === "column" ? "left" : "top"] = `${guide.fraction * 100}%`;
    });
  }

  function lineElement(axis, guide, index) {
    const line = element("button", `slicer-line slicer-line-${axis}`);
    line.type = "button";
    line.dataset.guideId = guide.id;
    line.setAttribute("aria-label", `Déplacer la séparation ${axis} ${index + 1}`);
    line.style[axis === "column" ? "left" : "top"] = `${guide.fraction * 100}%`;
    line.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      line.setPointerCapture(event.pointerId);
      state.dragging = { axis, id: guide.id };
    });
    line.addEventListener("pointermove", (event) => {
      if (!state.dragging || state.dragging.axis !== axis || state.dragging.id !== guide.id) return;
      const rect = overlay.getBoundingClientRect();
      const raw = axis === "column"
        ? (event.clientX - rect.left) / rect.width
        : (event.clientY - rect.top) / rect.height;
      const values = axis === "column" ? state.colLines : state.rowLines;
      guide.fraction = Math.max(0.005, Math.min(0.995, raw));
      values.sort((a, b) => a.fraction - b.fraction);
      syncGuidePositions(axis);
    });
    line.addEventListener("pointerup", () => { state.dragging = null; });
    line.addEventListener("pointercancel", () => { state.dragging = null; });
    return line;
  }

  function renderGrid() {
    overlay.replaceChildren();
    state.colLines.forEach((guide, index) => {
      overlay.append(lineElement("column", guide, index));
    });
    state.rowLines.forEach((guide, index) => {
      overlay.append(lineElement("row", guide, index));
    });
  }

  function setDestination(handle) {
    state.nativeDestination = null;
    state.destinationHandle = handle;
    openFolder.disabled = !handle && !state.sourceDirectoryHandle;
    if (handle) {
      destinationPath.textContent = `${handle.name}/`;
      destinationPath.title = `Enregistrement direct dans ${handle.name}`;
      resetDestination.hidden = false;
      browseDestination.textContent = "Changer…";
    } else {
      destinationPath.textContent = "Dossier de l’image source";
      destinationPath.title = "Le navigateur demandera une confirmation au premier export.";
      resetDestination.hidden = true;
      browseDestination.textContent = "Parcourir…";
    }
  }

  function setNativeDestination(destination) {
    state.destinationHandle = null;
    state.sourceDirectoryHandle = null;
    state.nativeDestination = destination;
    destinationPath.textContent = `${destination.name}/ · écriture native rapide`;
    destinationPath.title = "BARZ écrit directement dans ce dossier, sans passer par le navigateur.";
    resetDestination.hidden = false;
    browseDestination.textContent = "Changer…";
    openFolder.disabled = true;
  }

  async function chooseDirectory({ source = false } = {}) {
    if (typeof window.showDirectoryPicker !== "function") return null;
    const options = { mode: "readwrite", id: source ? "atlas-slicer-source" : "atlas-slicer-output" };
    const startIn = state.destinationHandle || state.sourceDirectoryHandle || state.sourceFileHandle;
    if (startIn) options.startIn = startIn;
    return window.showDirectoryPicker(options);
  }

  async function ensureDirectoryPermission(handle) {
    if (!handle) return false;
    const options = { mode: "readwrite" };
    if (typeof handle.queryPermission !== "function") return true;
    if (await handle.queryPermission(options) === "granted") return true;
    return typeof handle.requestPermission === "function" && await handle.requestPermission(options) === "granted";
  }

  async function showFolderContents() {
    const handle = state.destinationHandle || state.sourceDirectoryHandle;
    if (!handle) return toast("Aucun dossier de sortie n’est encore autorisé.", true);
    const names = [];
    try {
      for await (const [name, entry] of handle.entries()) if (entry.kind === "file") names.push(name);
    } catch (error) { return toast(`Impossible de lire le dossier : ${error.message}`, true); }
    const dialog = element("dialog", "runtime-dialog slicer-folder-dialog");
    const panel = element("div", "dialog-form"); const head = element("div", "dialog-head");
    head.append(element("h2", "", `Dossier ${handle.name}/`)); const close = controlButton("×", "quiet-button"); close.setAttribute("aria-label", "Fermer"); close.addEventListener("click", () => dialog.close()); head.append(close);
    const list = element("div", "slicer-folder-list");
    const relevant = names.sort((a, b) => a.localeCompare(b, "fr", { numeric: true }));
    list.append(...(relevant.length ? relevant.map((name) => element("div", "", name)) : [element("p", "", "Le dossier est vide.")]));
    panel.append(head, element("p", "", `${relevant.length} fichier${relevant.length > 1 ? "s" : ""} visible${relevant.length > 1 ? "s" : ""}.`), list); dialog.append(panel); document.body.append(dialog);
    dialog.addEventListener("close", () => dialog.remove(), { once: true }); dialog.showModal();
  }

  browseDestination.addEventListener("click", async () => {
    try {
      const destination = await chooseNativeSliceDestination();
      if (destination) setNativeDestination(destination);
    } catch (error) {
      try {
        const handle = await chooseDirectory();
        if (handle) setDestination(handle);
      } catch (fallbackError) {
        if (fallbackError.name !== "AbortError") toast(`Impossible d’ouvrir ce dossier : ${fallbackError.message}`, true);
      }
    }
  });
  resetDestination.addEventListener("click", () => { state.nativeDestination = null; setDestination(null); });
  openFolder.addEventListener("click", showFolderContents);

  async function loadFile(file, fileHandle = null) {
    if (!file?.type.startsWith("image/")) {
      toast("Choisis un fichier image valide.", true);
      return;
    }
    if (state.imageUrl) URL.revokeObjectURL(state.imageUrl);
    state.imageUrl = URL.createObjectURL(file);
    const loaded = new Image();
    loaded.decoding = "async";
    loaded.src = state.imageUrl;
    try {
      await loaded.decode();
    } catch {
      toast("Cette image ne peut pas être décodée.", true);
      return;
    }
    state.image = loaded;
    state.sourceFile = file;
    state.sourceFileHandle = fileHandle;
    state.sourceName = safeStem(file.name.replace(/\.[^.]+$/, ""), "image");
    image.src = state.imageUrl;
    imageInfo.textContent = `${file.name} · ${Math.round(file.size / 1024)} KB · ${loaded.naturalWidth} × ${loaded.naturalHeight}px`;
    state.colLines = movableLines(configuration.columns);
    state.rowLines = movableLines(configuration.rows);
    renderGrid();
    dropZone.hidden = true;
    preview.hidden = false;
    exportButton.disabled = false;
    statusText.textContent = "Prêt. Les séparateurs orange peuvent être déplacés.";
  }

  fileInput.addEventListener("change", () => loadFile(fileInput.files[0]));
  dropZone.addEventListener("click", (event) => {
    if (event.target === fileInput) return;
    event.preventDefault(); fileInput.click();
  });
  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("is-over");
  });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("is-over"));
  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("is-over");
    const item = event.dataTransfer.items?.[0];
    if (item?.getAsFileSystemHandle) {
      item.getAsFileSystemHandle().then(async (handle) => {
        if (handle?.kind === "file") await loadFile(await handle.getFile(), handle);
        else loadFile(event.dataTransfer.files[0]);
      }).catch(() => loadFile(event.dataTransfer.files[0]));
    } else loadFile(event.dataTransfer.files[0]);
  });
  clear.addEventListener("click", () => {
    if (state.imageUrl) URL.revokeObjectURL(state.imageUrl);
    state.imageUrl = "";
    state.image = null;
    state.sourceFile = null;
    state.sourceFileHandle = null;
    image.removeAttribute("src");
    fileInput.value = "";
    preview.hidden = true;
    dropZone.hidden = false;
    exportButton.disabled = true;
    statusText.textContent = "Charge une image pour commencer.";
    progress.value = 0;
  });

  exportButton.addEventListener("click", async () => {
    if (!state.image) return;
    exportButton.disabled = true;
    progress.value = 0;
    const imageWidth = state.image.naturalWidth;
    const imageHeight = state.image.naturalHeight;
    const columns = [0, ...state.colLines.map(({ fraction }) => Math.round(fraction * imageWidth)),
      imageWidth];
    const rows = [0, ...state.rowLines.map(({ fraction }) => Math.round(fraction * imageHeight)),
      imageHeight];
    const total = configuration.columns * configuration.rows;
    const extension = configuration.format === "jpeg" ? "jpg" : configuration.format;
    const mimeType = `image/${configuration.format}`;
    const stem = safeStem(state.sourceName, "image");
    const outputPrefix = safeStem(configuration.prefix, "slice");
    try {
      let target = state.destinationHandle || state.sourceDirectoryHandle;
      if (!target && !state.nativeDestination) {
        try {
          const destination = await chooseNativeSliceDestination();
          if (!destination) {
            statusText.textContent = "Enregistrement annulé — aucune tuile écrite.";
            progress.value = 0;
            return;
          }
          setNativeDestination(destination);
        } catch (error) {
          if (typeof window.showDirectoryPicker === "function") {
            try {
              target = await chooseDirectory({ source: true });
              state.sourceDirectoryHandle = target;
              openFolder.disabled = false;
              destinationPath.textContent = `${target.name}/ (source)`;
              destinationPath.title = "Dossier source confirmé pour cette image.";
            } catch (fallbackError) {
              if (fallbackError.name === "AbortError") {
                statusText.textContent = "Enregistrement annulé — aucune tuile écrite.";
                progress.value = 0;
                return;
              }
              throw fallbackError;
            }
          } else {
            console.warn("Native folder selection unavailable; ZIP fallback will be used.", error);
          }
        }
      }
      if (target && !await ensureDirectoryPermission(target)) throw new Error("Autorisation d’écriture refusée pour ce dossier.");
      const tiles = [];
      for (let row = 0; row < configuration.rows; row += 1) {
        for (let column = 0; column < configuration.columns; column += 1) {
          const sx = columns[column];
          const sy = rows[row];
          const width = columns[column + 1] - sx;
          const height = rows[row + 1] - sy;
          const index = row * configuration.columns + column + 1;
          const name = `${stem}_${outputPrefix}_${String(index).padStart(2, "0")}.${extension}`;
          tiles.push({ sx, sy, width, height, name });
        }
      }
      if (state.nativeDestination) {
        statusText.textContent = `Découpe + écriture native de ${total} fichiers…`;
        const timing = await renderTilesToNativeDirectory(state.sourceFile, tiles, configuration.format, configuration.quality, state.nativeDestination.token);
        progress.value = 100;
        statusText.textContent = `${timing.count} fichiers enregistrés dans ${state.nativeDestination.name}/ · ${(timing.totalMs / 1000).toFixed(2)} s`;
        toast(`${timing.count} tuiles enregistrées en ${(timing.totalMs / 1000).toFixed(2)} s.`);
        return;
      }
      if (target) {
        let fastEntries = null;
        try {
          statusText.textContent = `Découpe rapide de ${total} fichiers…`;
          fastEntries = await renderTilesFast(state.sourceFile, tiles, configuration.format, configuration.quality);
        } catch (fastError) {
          console.warn("Fast slicer unavailable, using browser fallback.", fastError);
        }
        if (fastEntries) {
          await writeEntriesToDirectory(fastEntries, target, (done) => {
            const percent = Math.round((done / total) * 100); progress.value = percent; statusText.textContent = `Écriture ${done} / ${total} · ${percent} %`;
          }, Math.min(4, navigator.hardwareConcurrency || 4));
        } else {
          const encodeTile = createReusableTileEncoder(state.image, mimeType, configuration.quality);
          await streamTilesToDirectory(tiles, target, encodeTile, (done) => {
            const percent = Math.round((done / total) * 100); progress.value = percent; statusText.textContent = `Création + écriture ${done} / ${total} · ${percent} %`;
          });
        }
        progress.value = 100;
        statusText.textContent = `${total} fichiers enregistrés dans ${target.name}/ · 100 %`;
        toast(`${total} tuiles enregistrées dans ${target.name}/.`);
      } else {
        let entries;
        try {
          statusText.textContent = `Découpe rapide de ${total} fichiers…`;
          entries = await renderTilesFast(state.sourceFile, tiles, configuration.format, configuration.quality);
        } catch (fastError) {
          console.warn("Fast slicer unavailable, using browser fallback.", fastError);
          let encoded = 0;
          entries = await mapConcurrent(tiles, Math.min(2, navigator.hardwareConcurrency || 2), async (tile) => {
            const blob = await tileBlob(state.image, tile.sx, tile.sy, tile.width, tile.height, mimeType, configuration.quality);
            encoded += 1; const percent = Math.round((encoded / total) * 90); progress.value = percent; statusText.textContent = `Encodage ${encoded} / ${total} · ${percent} %`;
            return { name: tile.name, blob };
          });
        }
        statusText.textContent = "Création du ZIP · 95 %";
        progress.value = 95;
        const archive = await buildStoredZip(entries);
        download(archive, `${stem}_${outputPrefix}_slices.zip`);
        progress.value = 100;
        statusText.textContent = `${total} fichiers prêts dans un ZIP · 100 %`;
        toast(`${total} tuiles téléchargées dans un ZIP.`);
      }
    } catch (error) {
      statusText.textContent = "Échec de la découpe.";
      toast(error.message, true);
    } finally {
      exportButton.disabled = false;
    }
  });
}

let proSegmentSequence = 0;
const evenProCuts = (count) => Array.from({ length: Math.max(0, count - 1) }, (_, index) => (index + 1) / count);
const proSpan = (from, to) => Number((to - from).toFixed(12));
const proLeaf = () => ({ id: `pro-segment-${++proSegmentSequence}`, locked: false, children: null, columns: 1, rows: 1, columnCuts: [], rowCuts: [] });

export function createProSlicerTree() {
  return proLeaf();
}

export function findProSlicerSegment(root, id, parent = null) {
  if (!root) return null;
  if (root.id === id) return { node: root, parent };
  for (const child of root.children || []) {
    const found = findProSlicerSegment(child, id, root);
    if (found) return found;
  }
  return null;
}

export function splitProSlicerSegment(root, id, columns, rows) {
  const found = findProSlicerSegment(root, id);
  if (!found || found.node.locked || found.node.children) return false;
  const cols = Math.max(1, Math.min(20, Number.parseInt(columns, 10) || 1));
  const rowCount = Math.max(1, Math.min(20, Number.parseInt(rows, 10) || 1));
  if (cols * rowCount === 1) return false;
  found.node.columns = cols;
  found.node.rows = rowCount;
  found.node.columnCuts = evenProCuts(cols);
  found.node.rowCuts = evenProCuts(rowCount);
  found.node.children = Array.from({ length: cols * rowCount }, proLeaf);
  return true;
}

export function collectProSlicerLeaves(root, rect = { x: 0, y: 0, width: 1, height: 1 }, output = []) {
  if (!root.children) {
    output.push({ ...rect, id: root.id, locked: root.locked });
    return output;
  }
  const columnStops = [0, ...(root.columnCuts?.length === root.columns - 1 ? root.columnCuts : evenProCuts(root.columns)), 1];
  const rowStops = [0, ...(root.rowCuts?.length === root.rows - 1 ? root.rowCuts : evenProCuts(root.rows)), 1];
  for (let row = 0; row < root.rows; row += 1) for (let column = 0; column < root.columns; column += 1) {
    const child = root.children[row * root.columns + column];
    collectProSlicerLeaves(child, {
      x: rect.x + rect.width * columnStops[column],
      y: rect.y + rect.height * rowStops[row],
      width: rect.width * proSpan(columnStops[column], columnStops[column + 1]),
      height: rect.height * proSpan(rowStops[row], rowStops[row + 1])
    }, output);
  }
  return output;
}

function proTreeHasLock(node) {
  return node.locked || (node.children || []).some(proTreeHasLock);
}

export function collectProSlicerGuides(root, rect = { x: 0, y: 0, width: 1, height: 1 }, output = []) {
  if (!root?.children) return output;
  const columnCuts = root.columnCuts?.length === root.columns - 1 ? root.columnCuts : evenProCuts(root.columns);
  const rowCuts = root.rowCuts?.length === root.rows - 1 ? root.rowCuts : evenProCuts(root.rows);
  const columnStops = [0, ...columnCuts, 1];
  const rowStops = [0, ...rowCuts, 1];
  columnCuts.forEach((fraction, cutIndex) => {
    const locked = Array.from({ length: root.rows }, (_, row) => [
      root.children[row * root.columns + cutIndex],
      root.children[row * root.columns + cutIndex + 1]
    ]).flat().some(proTreeHasLock);
    output.push({ id: `${root.id}:column:${cutIndex}`, nodeId: root.id, axis: 'column', cutIndex, fraction, locked, parentRect: { ...rect }, x: rect.x + rect.width * fraction, y: rect.y, width: 0, height: rect.height });
  });
  rowCuts.forEach((fraction, cutIndex) => {
    const locked = [
      ...root.children.slice(cutIndex * root.columns, (cutIndex + 1) * root.columns),
      ...root.children.slice((cutIndex + 1) * root.columns, (cutIndex + 2) * root.columns)
    ].some(proTreeHasLock);
    output.push({ id: `${root.id}:row:${cutIndex}`, nodeId: root.id, axis: 'row', cutIndex, fraction, locked, parentRect: { ...rect }, x: rect.x, y: rect.y + rect.height * fraction, width: rect.width, height: 0 });
  });
  for (let row = 0; row < root.rows; row += 1) for (let column = 0; column < root.columns; column += 1) {
    collectProSlicerGuides(root.children[row * root.columns + column], {
      x: rect.x + rect.width * columnStops[column],
      y: rect.y + rect.height * rowStops[row],
      width: rect.width * proSpan(columnStops[column], columnStops[column + 1]),
      height: rect.height * proSpan(rowStops[row], rowStops[row + 1])
    }, output);
  }
  return output;
}

export function moveProSlicerGuide(root, nodeId, axis, cutIndex, fraction) {
  const node = findProSlicerSegment(root, nodeId)?.node;
  if (!node?.children) return false;
  const guides = collectProSlicerGuides(node).filter((guide) => guide.nodeId === node.id && guide.axis === axis);
  const guide = guides.find((item) => item.cutIndex === cutIndex);
  if (!guide || guide.locked) return false;
  const key = axis === 'column' ? 'columnCuts' : 'rowCuts';
  const count = axis === 'column' ? node.columns : node.rows;
  if (!Array.isArray(node[key]) || node[key].length !== count - 1) node[key] = evenProCuts(count);
  const min = cutIndex ? node[key][cutIndex - 1] + .01 : .01;
  const max = cutIndex < node[key].length - 1 ? node[key][cutIndex + 1] - .01 : .99;
  node[key][cutIndex] = Math.max(min, Math.min(max, Number(fraction) || min));
  return true;
}

export function collapseProSlicerSegment(root, id) {
  const found = findProSlicerSegment(root, id);
  if (!found?.parent || proTreeHasLock(found.parent)) return false;
  found.parent.children = null;
  found.parent.columns = 1;
  found.parent.rows = 1;
  found.parent.columnCuts = [];
  found.parent.rowCuts = [];
  return true;
}

function mountImageSlicerPro({ host, configuration, onDirty, toast }) {
  host.replaceChildren();
  const state = { tree: createProSlicerTree(), zones: [], selected: new Set(), image: null, imageUrl: '', sourceName: 'image', drawingZone: null };
  const layout = element('div', 'slicer-layout slicer-pro-layout');
  const work = element('section', 'slicer-work');
  const controls = element('aside', 'slicer-controls');
  const intro = element('div', 'slicer-pro-intro');
  intro.append(
    element('b', '', 'SÉLECTION LIBRE'),
    element('span', '', 'Les séparations vertes pointillées se déplacent directement. Les rouges pleines sont verrouillées. Clique une zone pour la déplacer ou la redimensionner.')
  );
  const dropZone = element('label', 'slicer-drop');
  const fileInput = document.createElement('input');
  fileInput.type = 'file'; fileInput.accept = 'image/png,image/jpeg,image/webp,image/gif';
  dropZone.append(fileInput, element('span', 'slicer-drop-icon', '▧'), element('b', '', 'Dépose une planche complexe'), element('small', '', 'Chaque zone peut recevoir sa propre subdivision X / Y'));
  const preview = element('div', 'slicer-preview'); preview.hidden = true;
  const previewHead = element('div', 'slicer-preview-head');
  const imageInfo = element('span', '', '—');
  const clear = controlButton('Changer d’image', 'quiet-button'); previewHead.append(imageInfo, clear);
  const stage = element('div', 'slicer-stage');
  const frame = element('div', 'slicer-image-frame');
  const image = document.createElement('img'); image.alt = 'Aperçu Image Slicer Pro';
  const overlay = element('div', 'slicer-grid-overlay slicer-pro-overlay');
  frame.append(image, overlay); stage.append(frame); preview.append(previewHead, stage); work.append(dropZone, preview);

  const heading = element('div', 'slicer-control-head');
  heading.append(element('span', '', 'IMAGE SLICER PRO'), element('b', '', 'Découpes imbriquées'));
  const selectedCopy = element('div', 'slicer-pro-selection', 'Aucun segment sélectionné');
  const actions = element('div', 'slicer-pro-actions');
  const lock = controlButton('Lock segment', 'quiet-button');
  const remove = controlButton('Delete segment', 'quiet-button');
  const sliceZone = controlButton('Slice Zone', 'quiet-button slicer-zone-tool');
  actions.append(lock, remove, sliceZone);
  const subdivision = element('fieldset', 'slicer-pro-subdivide');
  const legend = element('legend', '', 'Add segments');
  const xLabel = element('label', '', 'X'); const xInput = document.createElement('input'); xInput.type = 'number'; xInput.min = '1'; xInput.max = '20'; xInput.value = '2'; xLabel.append(xInput);
  const yLabel = element('label', '', 'Y'); const yInput = document.createElement('input'); yInput.type = 'number'; yInput.min = '1'; yInput.max = '20'; yInput.value = '1'; yLabel.append(yInput);
  const add = controlButton('Add segments', 'primary-action'); subdivision.append(legend, xLabel, yLabel, add);
  const count = element('b', 'slicer-count', '1 segment');
  const formatLabel = element('label', 'slicer-field', 'Format');
  const format = document.createElement('select');
  for (const value of ['png', 'jpeg', 'webp']) { const option = element('option', '', value === 'jpeg' ? 'JPG' : value.toUpperCase()); option.value = value; option.selected = configuration.format === value; format.append(option); }
  formatLabel.append(format);
  const prefixLabel = element('label', 'slicer-field', 'Préfixe'); const prefix = document.createElement('input'); prefix.value = configuration.prefix; prefix.maxLength = 80; prefixLabel.append(prefix);
  const status = element('div', 'slicer-status'); const statusText = element('span', '', 'Charge une image pour commencer.'); const progress = document.createElement('progress'); progress.max = 100; progress.value = 0; status.append(statusText, progress);
  const exportButton = controlButton('Exporter les segments (ZIP)', 'primary-action slicer-export'); exportButton.disabled = true;
  controls.append(heading, selectedCopy, actions, subdivision, count, formatLabel, prefixLabel, status, exportButton);
  layout.append(work, controls); host.append(intro, layout);

  const menu = element('div', 'slicer-pro-menu'); menu.hidden = true;
  const menuLock = controlButton('Lock segment'); const menuAdd = controlButton('Add segments…'); const menuDelete = controlButton('Delete segment');
  menu.append(menuLock, menuAdd, menuDelete); document.body.append(menu);

  function treeLeaves() { return collectProSlicerLeaves(state.tree); }
  function visibleSegments() { return [...treeLeaves(), ...state.zones]; }
  function exportSegments() {
    const output = [...treeLeaves()];
    state.zones.forEach((zone) => {
      const columnStops = [0, ...(zone.columnCuts?.length === zone.columns - 1 ? zone.columnCuts : evenProCuts(zone.columns)), 1];
      const rowStops = [0, ...(zone.rowCuts?.length === zone.rows - 1 ? zone.rowCuts : evenProCuts(zone.rows)), 1];
      for (let row = 0; row < zone.rows; row += 1) for (let column = 0; column < zone.columns; column += 1) {
        output.push({
          id: `${zone.id}:${column}:${row}`,
          x: zone.x + zone.width * columnStops[column],
          y: zone.y + zone.height * rowStops[row],
          width: zone.width * proSpan(columnStops[column], columnStops[column + 1]),
          height: zone.height * proSpan(rowStops[row], rowStops[row + 1]),
          locked: zone.locked,
          zone: true
        });
      }
    });
    return output;
  }
  function selectedItems() {
    return [...state.selected].map((id) => state.zones.find((zone) => zone.id === id) || findProSlicerSegment(state.tree, id)?.node).filter(Boolean);
  }
  function updateSelectionCopy() {
    const amount = state.selected.size;
    selectedCopy.textContent = amount ? `${amount} segment${amount > 1 ? 's' : ''} sélectionné${amount > 1 ? 's' : ''}` : 'Aucun segment sélectionné';
    lock.disabled = !amount; remove.disabled = !amount; add.disabled = amount !== 1;
    const selectedNodes = selectedItems();
    lock.textContent = selectedNodes.length && selectedNodes.every((node) => node.locked) ? 'Unlock segment' : 'Lock segment';
  }
  function renderSegments() {
    const items = visibleSegments();
    const exported = exportSegments().length;
    count.textContent = `${exported} segment${exported > 1 ? 's' : ''}${state.zones.length ? ` · ${state.zones.length} zone${state.zones.length > 1 ? 's' : ''}` : ''}`;
    const cells = items.map((segment, index) => {
      const isZone = Boolean(segment.zone);
      const cell = controlButton('', `slicer-pro-segment${isZone ? ' is-zone' : ''}${state.selected.has(segment.id) ? ' is-selected' : ''}${segment.locked ? ' is-locked' : ''}`);
      cell.dataset.segmentId = segment.id;
      cell.style.left = `${segment.x * 100}%`; cell.style.top = `${segment.y * 100}%`; cell.style.width = `${segment.width * 100}%`; cell.style.height = `${segment.height * 100}%`;
      cell.innerHTML = `<span>${segment.locked ? '🔒 ' : ''}${isZone ? 'ZONE' : index + 1}${isZone && (segment.columns > 1 || segment.rows > 1) ? ` · ${segment.columns}×${segment.rows}` : ''}</span>`;
      cell.addEventListener('click', (event) => {
        if (!(event.ctrlKey || event.metaKey)) state.selected.clear();
        if (state.selected.has(segment.id) && (event.ctrlKey || event.metaKey)) state.selected.delete(segment.id); else state.selected.add(segment.id);
        renderSegments();
      });
      cell.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        if (!state.selected.has(segment.id)) { state.selected.clear(); state.selected.add(segment.id); renderSegments(); }
        menu.hidden = false; menu.style.left = `${Math.min(event.clientX, innerWidth - 210)}px`; menu.style.top = `${Math.min(event.clientY, innerHeight - 150)}px`;
      });
      if (isZone && state.selected.has(segment.id) && !segment.locked) {
        for (const edge of ['nw', 'ne', 'sw', 'se']) {
          const handle = element('i', `slicer-zone-handle is-${edge}`);
          handle.dataset.zoneEdge = edge;
          handle.addEventListener('pointerdown', (event) => startZoneTransform(event, segment, edge));
          cell.append(handle);
        }
      }
      if (isZone && !segment.locked) cell.addEventListener('pointerdown', (event) => {
        if (event.button !== 0 || event.target.closest('.slicer-zone-handle')) return;
        startZoneTransform(event, segment, 'move');
      });
      return cell;
    });
    const guides = [
      ...collectProSlicerGuides(state.tree),
      ...state.zones.flatMap((zone) => {
        const columnCuts = zone.columnCuts?.length === zone.columns - 1 ? zone.columnCuts : evenProCuts(zone.columns);
        const rowCuts = zone.rowCuts?.length === zone.rows - 1 ? zone.rowCuts : evenProCuts(zone.rows);
        return [
          ...columnCuts.map((fraction, cutIndex) => ({ id: `${zone.id}:column:${cutIndex}`, nodeId: zone.id, axis: 'column', cutIndex, fraction, locked: zone.locked, zone: true, parentRect: { x: zone.x, y: zone.y, width: zone.width, height: zone.height }, x: zone.x + zone.width * fraction, y: zone.y, width: 0, height: zone.height })),
          ...rowCuts.map((fraction, cutIndex) => ({ id: `${zone.id}:row:${cutIndex}`, nodeId: zone.id, axis: 'row', cutIndex, fraction, locked: zone.locked, zone: true, parentRect: { x: zone.x, y: zone.y, width: zone.width, height: zone.height }, x: zone.x, y: zone.y + zone.height * fraction, width: zone.width, height: 0 }))
        ];
      })
    ];
    const guideElements = guides.map((guide) => {
      const line = element('button', `slicer-pro-guide slicer-pro-guide-${guide.axis}${guide.locked ? ' is-locked' : ''}${guide.zone ? ' is-zone-guide' : ''}`);
      line.type = 'button'; line.dataset.guideId = guide.id;
      line.title = guide.locked ? 'Séparation verrouillée' : 'Glisser pour déplacer cette séparation';
      Object.assign(line.style, guide.axis === 'column'
        ? { left: `${guide.x * 100}%`, top: `${guide.y * 100}%`, height: `${guide.height * 100}%` }
        : { top: `${guide.y * 100}%`, left: `${guide.x * 100}%`, width: `${guide.width * 100}%` });
      if (!guide.locked) line.addEventListener('pointerdown', (event) => {
        event.preventDefault(); event.stopPropagation(); line.setPointerCapture(event.pointerId);
        const move = (pointerEvent) => {
          const rect = overlay.getBoundingClientRect();
          const absolute = guide.axis === 'column' ? (pointerEvent.clientX - rect.left) / rect.width : (pointerEvent.clientY - rect.top) / rect.height;
          const parentStart = guide.axis === 'column' ? guide.parentRect.x : guide.parentRect.y;
          const parentSize = guide.axis === 'column' ? guide.parentRect.width : guide.parentRect.height;
          const local = (absolute - parentStart) / parentSize;
          if (guide.zone) {
            const zone = state.zones.find((item) => item.id === guide.nodeId);
            const key = guide.axis === 'column' ? 'columnCuts' : 'rowCuts';
            const cuts = zone?.[key];
            if (!zone || zone.locked || !cuts) return;
            const min = guide.cutIndex ? cuts[guide.cutIndex - 1] + .01 : .01;
            const max = guide.cutIndex < cuts.length - 1 ? cuts[guide.cutIndex + 1] - .01 : .99;
            cuts[guide.cutIndex] = Math.max(min, Math.min(max, local));
            line.style[guide.axis === 'column' ? 'left' : 'top'] = `${(parentStart + parentSize * cuts[guide.cutIndex]) * 100}%`;
          } else if (moveProSlicerGuide(state.tree, guide.nodeId, guide.axis, guide.cutIndex, local)) {
            const node = findProSlicerSegment(state.tree, guide.nodeId).node;
            const cuts = guide.axis === 'column' ? node.columnCuts : node.rowCuts;
            line.style[guide.axis === 'column' ? 'left' : 'top'] = `${(parentStart + parentSize * cuts[guide.cutIndex]) * 100}%`;
          }
        };
        const finish = () => { line.removeEventListener('pointermove', move); renderSegments(); };
        line.addEventListener('pointermove', move); line.addEventListener('pointerup', finish, { once: true }); line.addEventListener('pointercancel', finish, { once: true });
      });
      return line;
    });
    overlay.replaceChildren(...cells, ...guideElements);
    updateSelectionCopy();
  }
  function startZoneTransform(event, zone, mode) {
    if (zone.locked || state.drawingZone) return;
    event.preventDefault(); event.stopPropagation();
    const target = event.currentTarget; target.setPointerCapture(event.pointerId);
    const rect = overlay.getBoundingClientRect();
    const start = { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
    const original = { x: zone.x, y: zone.y, width: zone.width, height: zone.height };
    state.selected.clear(); state.selected.add(zone.id); updateSelectionCopy();
    const move = (pointerEvent) => {
      const point = { x: (pointerEvent.clientX - rect.left) / rect.width, y: (pointerEvent.clientY - rect.top) / rect.height };
      const dx = point.x - start.x; const dy = point.y - start.y; const minimum = .02;
      if (mode === 'move') {
        zone.x = Math.max(0, Math.min(1 - original.width, original.x + dx));
        zone.y = Math.max(0, Math.min(1 - original.height, original.y + dy));
      } else {
        let left = original.x; let right = original.x + original.width; let top = original.y; let bottom = original.y + original.height;
        if (mode.includes('w')) left = Math.max(0, Math.min(right - minimum, original.x + dx));
        if (mode.includes('e')) right = Math.min(1, Math.max(left + minimum, original.x + original.width + dx));
        if (mode.includes('n')) top = Math.max(0, Math.min(bottom - minimum, original.y + dy));
        if (mode.includes('s')) bottom = Math.min(1, Math.max(top + minimum, original.y + original.height + dy));
        zone.x = left; zone.y = top; zone.width = right - left; zone.height = bottom - top;
      }
      const cell = overlay.querySelector(`[data-segment-id="${zone.id}"]`);
      if (cell) Object.assign(cell.style, { left: `${zone.x * 100}%`, top: `${zone.y * 100}%`, width: `${zone.width * 100}%`, height: `${zone.height * 100}%` });
    };
    const finish = () => { target.removeEventListener('pointermove', move); renderSegments(); };
    target.addEventListener('pointermove', move); target.addEventListener('pointerup', finish, { once: true }); target.addEventListener('pointercancel', finish, { once: true });
  }
  function toggleLocks() {
    const nodes = selectedItems();
    const next = !nodes.every((node) => node.locked); nodes.forEach((node) => { node.locked = next; }); renderSegments();
  }
  function addSegments() {
    const id = [...state.selected][0];
    if (!id) return;
    const zone = state.zones.find((item) => item.id === id);
    if (zone) {
      if (zone.locked) return toast('Cette zone est verrouillée.', true);
      zone.columns = Math.max(1, Math.min(20, Number.parseInt(xInput.value, 10) || 1));
      zone.rows = Math.max(1, Math.min(20, Number.parseInt(yInput.value, 10) || 1));
      zone.columnCuts = evenProCuts(zone.columns); zone.rowCuts = evenProCuts(zone.rows);
    } else {
      const selectedNode = findProSlicerSegment(state.tree, id)?.node;
      if (!splitProSlicerSegment(state.tree, id, xInput.value, yInput.value)) return toast('Ce segment est verrouillé ou déjà subdivisé.', true);
      state.selected.clear();
      if (selectedNode?.children?.[0]) state.selected.add(selectedNode.children[0].id);
    }
    renderSegments(); toast('Subdivision ajoutée. Les séparations vertes peuvent être déplacées.');
  }
  function deleteSegments() {
    const ids = [...state.selected]; let changed = false;
    ids.forEach((id) => {
      const zoneIndex = state.zones.findIndex((zone) => zone.id === id);
      if (zoneIndex >= 0 && !state.zones[zoneIndex].locked) { state.zones.splice(zoneIndex, 1); changed = true; }
      else changed = collapseProSlicerSegment(state.tree, id) || changed;
    });
    state.selected.clear(); renderSegments();
    if (!changed) toast('Impossible : la racine ou une découpe verrouillée protège cette zone.', true);
  }
  lock.addEventListener('click', toggleLocks); remove.addEventListener('click', deleteSegments); add.addEventListener('click', addSegments);
  sliceZone.addEventListener('click', () => {
    state.drawingZone = state.drawingZone ? null : { armed: true };
    sliceZone.classList.toggle('is-active', Boolean(state.drawingZone));
    overlay.classList.toggle('is-zone-drawing', Boolean(state.drawingZone));
    statusText.textContent = state.drawingZone ? 'Trace un rectangle sur l’image. L’original restera intact.' : 'Slice Zone annulé.';
  });
  menuLock.addEventListener('click', () => { toggleLocks(); menu.hidden = true; });
  menuAdd.addEventListener('click', () => { menu.hidden = true; xInput.focus(); });
  menuDelete.addEventListener('click', () => { deleteSegments(); menu.hidden = true; });
  document.addEventListener('pointerdown', (event) => { if (!menu.hidden && !menu.contains(event.target)) menu.hidden = true; });

  async function loadFile(file) {
    if (!file?.type.startsWith('image/')) return toast('Choisis un fichier image valide.', true);
    if (state.imageUrl) URL.revokeObjectURL(state.imageUrl);
    state.imageUrl = URL.createObjectURL(file);
    const loaded = new Image(); loaded.decoding = 'async'; loaded.src = state.imageUrl;
    try { await loaded.decode(); } catch { return toast('Cette image ne peut pas être décodée.', true); }
    state.image = loaded; state.sourceName = safeStem(file.name.replace(/\.[^.]+$/, ''), 'image'); state.tree = createProSlicerTree(); state.zones = []; state.selected.clear(); state.selected.add(state.tree.id);
    image.src = state.imageUrl; imageInfo.textContent = `${file.name} · ${loaded.naturalWidth} × ${loaded.naturalHeight}px`;
    dropZone.hidden = true; preview.hidden = false; exportButton.disabled = false; statusText.textContent = 'Sélectionne puis subdivise. Glisse les traits verts; verrouille en rouge les découpes à protéger.'; renderSegments();
  }
  fileInput.addEventListener('change', () => loadFile(fileInput.files[0]));
  dropZone.addEventListener('dragover', (event) => { event.preventDefault(); dropZone.classList.add('is-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('is-over'));
  dropZone.addEventListener('drop', (event) => { event.preventDefault(); dropZone.classList.remove('is-over'); loadFile(event.dataTransfer.files[0]); });
  clear.addEventListener('click', () => { if (state.imageUrl) URL.revokeObjectURL(state.imageUrl); state.imageUrl = ''; state.image = null; fileInput.value = ''; preview.hidden = true; dropZone.hidden = false; exportButton.disabled = true; statusText.textContent = 'Charge une image pour commencer.'; });
  format.addEventListener('change', () => { configuration.format = format.value; onDirty(); });
  prefix.addEventListener('input', () => { configuration.prefix = prefix.value; onDirty(); });
  overlay.addEventListener('pointerdown', (event) => {
    if (!state.drawingZone) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const rect = overlay.getBoundingClientRect();
    const startX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const startY = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    const draft = element('div', 'slicer-zone-draft'); overlay.append(draft); overlay.setPointerCapture(event.pointerId);
    state.drawingZone = { startX, startY, x: startX, y: startY, width: 0, height: 0, draft };
  }, true);
  overlay.addEventListener('pointermove', (event) => {
    if (!state.drawingZone?.draft) return;
    const rect = overlay.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    state.drawingZone.x = Math.min(state.drawingZone.startX, x); state.drawingZone.y = Math.min(state.drawingZone.startY, y);
    state.drawingZone.width = Math.abs(x - state.drawingZone.startX); state.drawingZone.height = Math.abs(y - state.drawingZone.startY);
    Object.assign(state.drawingZone.draft.style, { left: `${state.drawingZone.x * 100}%`, top: `${state.drawingZone.y * 100}%`, width: `${state.drawingZone.width * 100}%`, height: `${state.drawingZone.height * 100}%` });
  }, true);
  const finishZone = (event) => {
    if (!state.drawingZone?.draft) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const zone = state.drawingZone; zone.draft.remove();
    if (zone.width > .01 && zone.height > .01) {
      const item = { id: `pro-zone-${++proSegmentSequence}`, x: zone.x, y: zone.y, width: zone.width, height: zone.height, columns: 1, rows: 1, columnCuts: [], rowCuts: [], locked: false, zone: true };
      state.zones.push(item); state.selected.clear(); state.selected.add(item.id); toast('Slice Zone ajoutée : la découpe originale est conservée.');
    }
    state.drawingZone = null; sliceZone.classList.remove('is-active'); overlay.classList.remove('is-zone-drawing'); renderSegments();
  };
  overlay.addEventListener('pointerup', finishZone, true); overlay.addEventListener('pointercancel', finishZone, true);
  exportButton.addEventListener('click', async () => {
    if (!state.image) return;
    exportButton.disabled = true; progress.value = 0;
    const segments = exportSegments(); const extension = configuration.format === 'jpeg' ? 'jpg' : configuration.format; const mime = `image/${configuration.format}`;
    try {
      const entries = await mapConcurrent(segments, Math.min(4, navigator.hardwareConcurrency || 4), async (segment, index) => {
        const sx = Math.round(segment.x * state.image.naturalWidth), sy = Math.round(segment.y * state.image.naturalHeight);
        const ex = Math.round((segment.x + segment.width) * state.image.naturalWidth), ey = Math.round((segment.y + segment.height) * state.image.naturalHeight);
        const blob = await tileBlob(state.image, sx, sy, Math.max(1, ex - sx), Math.max(1, ey - sy), mime, configuration.quality);
        progress.value = Math.round((index + 1) / segments.length * 80); statusText.textContent = `Encodage ${index + 1} / ${segments.length}`;
        return { name: `${state.sourceName}_${safeStem(configuration.prefix, 'slice')}_${String(index + 1).padStart(2, '0')}.${extension}`, blob };
      });
      const archive = await buildStoredZip(entries); progress.value = 100; download(archive, `${state.sourceName}_${safeStem(configuration.prefix, 'slice')}_pro.zip`);
      statusText.textContent = `${segments.length} segments exportés · 100 %`; toast(`${segments.length} segments exportés dans un ZIP.`);
    } catch (error) { statusText.textContent = 'Échec de la découpe.'; toast(error.message, true); }
    finally { exportButton.disabled = false; }
  });
  renderSegments();
}

export function mountImageSlicer({ host, header, configuration, onDirty, toast }) {
  host.replaceChildren(header);
  const tabs = element('div', 'slicer-mode-tabs');
  const classicTab = controlButton('Image Slicer', 'is-active');
  const proTab = controlButton('Image Slicer Pro');
  classicTab.setAttribute('aria-selected', 'true'); proTab.setAttribute('aria-selected', 'false');
  tabs.append(classicTab, proTab);
  const panes = element('div', 'slicer-mode-panes');
  const classicPane = element('div', 'slicer-mode-pane');
  const proPane = element('div', 'slicer-mode-pane'); proPane.hidden = true;
  panes.append(classicPane, proPane); host.append(tabs, panes);
  mountImageSlicerClassic({ host: classicPane, header: null, configuration, onDirty, toast });
  mountImageSlicerProV2({
    host: proPane,
    configuration,
    onDirty,
    toast,
    helpers: { chooseNativeSliceDestination, createReusableTileEncoder, renderTilesFast, renderTilesToNativeDirectory, safeStem, streamTilesToDirectory, writeEntriesToDirectory }
  });
  const selectTab = (pro) => {
    classicPane.hidden = pro; proPane.hidden = !pro;
    classicTab.classList.toggle('is-active', !pro); proTab.classList.toggle('is-active', pro);
    classicTab.setAttribute('aria-selected', String(!pro)); proTab.setAttribute('aria-selected', String(pro));
  };
  classicTab.addEventListener('click', () => selectTab(false)); proTab.addEventListener('click', () => selectTab(true));
}
