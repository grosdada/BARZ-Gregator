const ICONS = {
  import: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
  play: '<path d="M8 5l11 7-11 7V5z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  previous: '<path d="M18 5L8 12l10 7V5zM5 5v14"/>',
  next: '<path d="M6 5l10 7-10 7V5zM19 5v14"/>',
  capture: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M8 6l2-3h4l2 3"/><circle cx="12" cy="13" r="4"/>',
  export: '<path d="M12 15V3M7 8l5-5 5 5M4 13v8h16v-8"/>',
  paint: '<path d="M5 19l1-5L16 4l4 4-10 10-5 1zM14 6l4 4"/>',
  aggregator: '<path d="M4 6h16v12H4zM8 10h8M8 14h5"/><path d="M17 3v6M14 6h6"/>',
  chevron: '<path d="M7 10l5 5 5-5"/>',
  trash: '<path d="M5 7h14M9 7V4h6v3M7 7l1 14h8l1-14"/>',
  film: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 9h4M3 15h4M17 9h4M17 15h4"/>'
};

function icon(name) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
}

function node(tag, className = "", text = "") {
  const result = document.createElement(tag);
  if (className) result.className = className;
  if (text) result.textContent = text;
  return result;
}

function action(label, iconName, className = "") {
  const button = node("button", `grabber-action ${className}`.trim());
  button.type = "button"; button.setAttribute("aria-label", label); button.title = label;
  button.innerHTML = `${icon(iconName)}<span>${label}</span>`;
  return button;
}

function safeName(value) {
  return String(value || "video")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "video";
}

export function formatGrabberTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00.000";
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const wholeSeconds = Math.floor(seconds % 60).toString().padStart(2, "0");
  const millis = Math.floor((seconds % 1) * 1000).toString().padStart(3, "0");
  return `${minutes}:${wholeSeconds}.${millis}`;
}

export function frameNumberAtTime(seconds, fps) {
  return Math.max(1, Math.floor(Math.max(0, Number(seconds) || 0) * Math.max(1, Number(fps) || 1)) + 1);
}

export function captureFilename(name, seconds, fps, format = "png") {
  const frame = frameNumberAtTime(seconds, fps).toString().padStart(6, "0");
  const extension = format === "jpeg" ? "jpg" : format;
  return `${safeName(name)}_frame-${frame}.${extension}`;
}

export function isSupportedVideoFile(file) {
  if (!file) return false;
  return String(file.type || "").startsWith("video/") || /\.(mp4|m4v|mov|webm|ogv|avi|mkv)$/i.test(String(file.name || ""));
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function mountImageGrabber({ host, header, configuration, onDirty, toast, onSendToPaint, onSendToAggregator }) {
  const state = { url: null, file: null, fileName: "video", captures: [], currentCaptureId: null, dragging: false };
  const shell = node("section", "grabber-shell");
  const commandBar = node("div", "grabber-command-bar");
  const importLabel = node("label", "grabber-import"); importLabel.innerHTML = `${icon("import")}<span>Importer une vidéo</span>`;
  const fileInput = node("input"); fileInput.type = "file"; fileInput.accept = "video/*"; importLabel.append(fileInput);
  const play = action("Lire", "play", "grabber-play");
  const previousTen = action("Reculer de 10 images", "previous", "grabber-step"); previousTen.dataset.count = "−10";
  const previous = action("Image précédente", "previous", "grabber-step"); previous.dataset.count = "−1";
  const next = action("Image suivante", "next", "grabber-step"); next.dataset.count = "+1";
  const nextTen = action("Avancer de 10 images", "next", "grabber-step"); nextTen.dataset.count = "+10";
  const transport = node("div", "grabber-transport"); transport.append(previousTen, previous, play, next, nextTen);
  const mainActions = node("div", "grabber-main-actions");
  const capture = action("Ajouter aux captures", "capture");
  const exportCurrent = action("Exporter l’image", "export");
  const sendWrap = node("div", "grabber-send-wrap");
  const send = action("Envoyer", "paint", "grabber-primary");
  const sendToggle = action("Choisir la destination", "chevron", "grabber-send-toggle");
  const sendMenu = node("div", "grabber-send-menu"); sendMenu.hidden = true; sendMenu.setAttribute("role", "menu");
  const sendPaint = action("Paint Studio", "paint", "grabber-send-choice");
  const sendAggregator = action("BZ Aggregator · Références", "aggregator", "grabber-send-choice");
  sendPaint.setAttribute("role", "menuitem"); sendAggregator.setAttribute("role", "menuitem");
  sendMenu.append(sendPaint, sendAggregator); sendWrap.append(send, sendToggle, sendMenu);
  mainActions.append(capture, exportCurrent, sendWrap); commandBar.append(importLabel, transport, mainActions);

  const workspace = node("div", "grabber-workspace");
  const player = node("section", "grabber-player");
  const drop = node("div", "grabber-drop"); drop.tabIndex = 0;
  const video = node("video"); video.playsInline = true; video.muted = true; video.preload = "metadata";
  const empty = node("div", "grabber-empty"); empty.innerHTML = `${icon("film")}<b>Dépose une vidéo</b><span>ou utilise “Importer une vidéo”</span>`;
  const timeBadge = node("div", "grabber-time-badge", "00:00.000"); const frameBadge = node("div", "grabber-frame-badge", "IMAGE 000001");
  drop.append(video, empty, timeBadge, frameBadge); player.append(drop);

  const timeline = node("div", "grabber-timeline");
  const currentTime = node("output", "", "00:00.000");
  const scrub = node("input"); scrub.type = "range"; scrub.min = "0"; scrub.max = "0"; scrub.step = "0.001"; scrub.value = "0"; scrub.setAttribute("aria-label", "Position dans la vidéo");
  const duration = node("output", "", "00:00.000"); timeline.append(currentTime, scrub, duration); player.append(timeline);

  const inspector = node("aside", "grabber-inspector");
  inspector.append(node("div", "grabber-inspector-title", "Moniteur de capture"));
  const canvasWrap = node("div", "grabber-canvas-wrap"); const canvas = node("canvas"); canvas.width = 16; canvas.height = 9; canvasWrap.append(canvas); inspector.append(canvasWrap);
  const metadata = node("dl", "grabber-metadata"); inspector.append(metadata);
  const settings = node("div", "grabber-settings");
  const fps = node("input"); fps.type = "number"; fps.min = "1"; fps.max = "240"; fps.value = String(configuration.fps); fps.setAttribute("aria-label", "Images par seconde");
  const format = node("select"); format.setAttribute("aria-label", "Format d’export"); [["png", "PNG"], ["jpeg", "JPG"], ["webp", "WEBP"]].forEach(([value, label]) => { const option = node("option", "", label); option.value = value; option.selected = configuration.exportFormat === value; format.append(option); });
  const fpsField = node("label", "grabber-setting"); fpsField.append(node("span", "", "FPS"), fps);
  const formatField = node("label", "grabber-setting"); formatField.append(node("span", "", "Export"), format);
  settings.append(fpsField, formatField); inspector.append(settings);
  workspace.append(player, inspector);

  const captureSection = node("section", "grabber-captures");
  const captureHead = node("div", "grabber-capture-head");
  const captureTitle = node("div", "", "Captures");
  const captureHeadActions = node("div", "grabber-capture-head-actions");
  const captureCount = node("small", "", "0 image");
  const clearCaptures = action("Vider les captures", "trash", "grabber-clear-captures");
  captureHeadActions.append(captureCount, clearCaptures); captureHead.append(captureTitle, captureHeadActions);
  const captureList = node("div", "grabber-capture-list"); const captureEmpty = node("p", "grabber-capture-empty", "Les images capturées apparaîtront ici et resteront disponibles jusqu’au changement d’outil.");
  captureSection.append(captureHead, captureEmpty, captureList);
  shell.append(commandBar, workspace, captureSection); host.replaceChildren(header, shell);

  const ctx = canvas.getContext("2d");

  function isReady() { return Boolean(video.src && video.videoWidth && video.readyState >= 2); }
  function frameNumber() { return frameNumberAtTime(video.currentTime, configuration.fps); }
  function updateTransport() {
    const ready = isReady(); [play, previousTen, previous, next, nextTen, capture, exportCurrent, send, sendToggle, scrub].forEach((control) => { control.disabled = !ready; });
    timeBadge.textContent = formatGrabberTime(video.currentTime); currentTime.textContent = timeBadge.textContent;
    frameBadge.textContent = `IMAGE ${frameNumber().toString().padStart(6, "0")}`;
    duration.textContent = formatGrabberTime(video.duration);
    if (!state.dragging && ready) scrub.value = String(video.currentTime);
    play.innerHTML = `${icon(video.paused ? "play" : "pause")}<span>${video.paused ? "Lire" : "Pause"}</span>`;
  }

  function drawFrame() {
    if (!isReady()) { updateTransport(); return; }
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) { canvas.width = video.videoWidth; canvas.height = video.videoHeight; }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height); updateTransport(); updateMetadata();
  }

  function updateMetadata() {
    const entries = isReady() ? [
      ["Fichier", state.file?.name || state.fileName],
      ["Format", state.file?.type || "vidéo"],
      ["Définition", `${video.videoWidth} × ${video.videoHeight}`],
      ["Durée", formatGrabberTime(video.duration)],
      ["Navigation", `${configuration.fps} i/s`]
    ] : [["État", "Aucune vidéo chargée"]];
    metadata.replaceChildren(...entries.flatMap(([term, value]) => [node("dt", "", term), node("dd", "", value)]));
  }

  function loadFile(file) {
    if (!isSupportedVideoFile(file)) { toast("Choisis un fichier vidéo compatible.", true); return; }
    if (state.url) URL.revokeObjectURL(state.url);
    state.file = file; state.fileName = safeName(file.name); state.url = URL.createObjectURL(file); video.src = state.url; video.load();
    empty.hidden = false; empty.innerHTML = `${icon("film")}<b>Chargement de la vidéo…</b><span>${file.name}</span>`; updateMetadata();
  }

  function stepFrames(amount) {
    if (!isReady()) return; video.pause(); const maximum = Number.isFinite(video.duration) ? video.duration : video.currentTime + 1;
    video.currentTime = Math.max(0, Math.min(maximum, video.currentTime + amount / configuration.fps)); updateTransport();
  }

  function currentDataUrl() { drawFrame(); return canvas.toDataURL("image/png"); }
  function exportDataUrl(dataUrl, seconds) {
    const image = new Image(); image.onload = () => { const output = document.createElement("canvas"); output.width = image.width; output.height = image.height; output.getContext("2d").drawImage(image, 0, 0); const mime = configuration.exportFormat === "png" ? "image/png" : `image/${configuration.exportFormat}`; output.toBlob((blob) => { if (blob) download(blob, captureFilename(state.fileName, seconds, configuration.fps, configuration.exportFormat)); }, mime, configuration.exportQuality); }; image.src = dataUrl;
  }

  function addCapture() {
    if (!isReady()) return; const item = { id: `capture-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, src: currentDataUrl(), time: video.currentTime, frame: frameNumber() };
    state.captures.push(item); state.currentCaptureId = item.id; renderCaptures(); toast(`Image ${String(item.frame).padStart(6, "0")} ajoutée aux captures.`);
  }

  function renderCaptures() {
    captureList.replaceChildren(); captureEmpty.hidden = state.captures.length > 0;
    captureCount.textContent = `${state.captures.length} image${state.captures.length > 1 ? "s" : ""}`;
    clearCaptures.disabled = state.captures.length === 0;
    state.captures.forEach((item) => {
      const card = node("article", `grabber-capture-card${item.id === state.currentCaptureId ? " is-active" : ""}`);
      const image = node("img"); image.src = item.src; image.alt = `Capture à ${formatGrabberTime(item.time)}`;
      const caption = node("div", "grabber-capture-caption"); caption.append(node("b", "", `#${String(item.frame).padStart(6, "0")}`), node("span", "", formatGrabberTime(item.time)));
      const actions = node("div", "grabber-capture-actions");
      const toPaint = action("Envoyer dans Paint", "paint");
      const toAggregator = action("Envoyer dans BZ Aggregator · Références", "aggregator");
      const save = action("Exporter", "export"); const remove = action("Retirer", "trash"); actions.append(toPaint, toAggregator, save, remove);
      image.addEventListener("click", () => { state.currentCaptureId = item.id; video.pause(); video.currentTime = item.time; renderCaptures(); });
      toPaint.addEventListener("click", () => onSendToPaint({ src: item.src, name: `Capture ${String(item.frame).padStart(6, "0")}` }));
      toAggregator.addEventListener("click", () => onSendToAggregator({ src: item.src, name: `Capture ${String(item.frame).padStart(6, "0")}` }));
      save.addEventListener("click", () => exportDataUrl(item.src, item.time));
      remove.addEventListener("click", () => { state.captures = state.captures.filter(({ id }) => id !== item.id); if (state.currentCaptureId === item.id) state.currentCaptureId = null; renderCaptures(); });
      card.append(image, caption, actions); captureList.append(card);
    });
  }

  fileInput.addEventListener("change", () => { if (fileInput.files?.[0]) loadFile(fileInput.files[0]); fileInput.value = ""; });
  drop.addEventListener("dragover", (event) => { event.preventDefault(); drop.classList.add("is-over"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("is-over"));
  drop.addEventListener("drop", (event) => { event.preventDefault(); drop.classList.remove("is-over"); loadFile(event.dataTransfer.files?.[0]); });
  drop.addEventListener("dblclick", () => fileInput.click());
  play.addEventListener("click", () => { if (!isReady()) return; video.paused ? video.play().catch((error) => toast(error.message, true)) : video.pause(); });
  previousTen.addEventListener("click", () => stepFrames(-10)); previous.addEventListener("click", () => stepFrames(-1)); next.addEventListener("click", () => stepFrames(1)); nextTen.addEventListener("click", () => stepFrames(10));
  capture.addEventListener("click", addCapture); exportCurrent.addEventListener("click", () => isReady() && exportDataUrl(currentDataUrl(), video.currentTime));
  const currentImage = () => ({ src: currentDataUrl(), name: `Capture ${String(frameNumber()).padStart(6, "0")}` });
  function closeSendMenu() { sendMenu.hidden = true; sendToggle.setAttribute("aria-expanded", "false"); }
  function closeSendMenuFromOutside(event) {
    if (!sendWrap.contains(event.target)) closeSendMenu();
    else document.addEventListener("click", closeSendMenuFromOutside, { once: true });
  }
  function openSendMenu() {
    sendMenu.hidden = false; sendToggle.setAttribute("aria-expanded", "true"); sendPaint.focus();
    document.addEventListener("click", closeSendMenuFromOutside, { once: true });
  }
  send.addEventListener("click", () => { if (isReady()) onSendToPaint(currentImage()); });
  sendToggle.setAttribute("aria-haspopup", "menu"); sendToggle.setAttribute("aria-expanded", "false");
  sendToggle.addEventListener("click", () => sendMenu.hidden ? openSendMenu() : closeSendMenu());
  sendPaint.addEventListener("click", () => { closeSendMenu(); if (isReady()) onSendToPaint(currentImage()); });
  sendAggregator.addEventListener("click", () => { closeSendMenu(); if (isReady()) onSendToAggregator(currentImage()); });
  clearCaptures.addEventListener("click", () => {
    state.captures = []; state.currentCaptureId = null; renderCaptures(); toast("Captures vidées.");
  });
  scrub.addEventListener("pointerdown", () => { state.dragging = true; }); scrub.addEventListener("pointerup", () => { state.dragging = false; });
  scrub.addEventListener("input", () => { if (isReady()) { video.pause(); video.currentTime = Number(scrub.value); updateTransport(); } });
  fps.addEventListener("change", () => { configuration.fps = Math.max(1, Math.min(240, Math.round(Number(fps.value) || 30))); fps.value = String(configuration.fps); onDirty(); updateTransport(); updateMetadata(); });
  format.addEventListener("change", () => { configuration.exportFormat = format.value; onDirty(); });
  video.addEventListener("loadedmetadata", () => {
    scrub.max = String(Number.isFinite(video.duration) ? video.duration : 0); video.currentTime = 0; empty.hidden = true; updateMetadata(); updateTransport();
    toast("Vidéo chargée localement.");
  });
  video.addEventListener("error", () => {
    if (!state.file) return;
    const failedName = state.file.name;
    if (state.url) URL.revokeObjectURL(state.url);
    state.url = null; state.file = null; video.removeAttribute("src");
    empty.hidden = false; empty.innerHTML = `${icon("film")}<b>Vidéo illisible</b><span>Essaie un MP4 H.264 ou un WebM.</span>`;
    updateMetadata(); updateTransport(); toast(`Impossible de décoder « ${failedName} ». Essaie un MP4 H.264 ou un WebM.`, true);
  });
  video.addEventListener("loadeddata", drawFrame); video.addEventListener("seeked", drawFrame); video.addEventListener("timeupdate", drawFrame); video.addEventListener("play", updateTransport); video.addEventListener("pause", drawFrame); video.addEventListener("ended", updateTransport);
  shell.tabIndex = -1;
  shell.addEventListener("keydown", (event) => { if (["INPUT", "SELECT"].includes(event.target.tagName)) return; if (event.code === "Space") { event.preventDefault(); play.click(); } if (event.key === "ArrowLeft") { event.preventDefault(); stepFrames(event.shiftKey ? -10 : -1); } if (event.key === "ArrowRight") { event.preventDefault(); stepFrames(event.shiftKey ? 10 : 1); } if (event.key.toLowerCase() === "c") { event.preventDefault(); addCapture(); } });

  renderCaptures(); updateMetadata(); updateTransport();
}
