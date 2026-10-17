import { buildStoredZip } from "./image-slicer.js";

const ICONS = {
  import: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
  analyze: '<path d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
  clear: '<path d="M5 7h14M9 7V4h6v3M7 7l1 14h8l1-14"/>',
  copy: '<rect x="8" y="8" width="11" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1z"/>',
  chevron: '<path d="M7 10l5 5 5-5"/>',
  send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>',
  film: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 9h4M3 15h4M17 9h4M17 15h4"/>'
};

export const DIRECTOR_PROMPT_TYPES = Object.freeze([
  Object.freeze({ id: "seedance", label: "Seedance 2", field: "seedancePrompt", slug: "seedance-2" }),
  Object.freeze({ id: "kling", label: "Kling 3", field: "klingPrompt", slug: "kling-3", negative: true }),
  Object.freeze({ id: "minimax-h3", label: "MiniMax H3", field: "minimaxH3Prompt", slug: "minimax-h3" }),
  Object.freeze({ id: "flux-3", label: "FLUX 3", field: "flux3Prompt", slug: "flux-3" }),
  Object.freeze({ id: "wan-3", label: "Wan 3", field: "wan3Prompt", slug: "wan-3" })
]);

function icon(name) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
}

function node(tag, className = "", text = undefined) {
  const value = document.createElement(tag);
  if (className) value.className = className;
  if (text !== undefined) value.textContent = text;
  return value;
}

function action(label, iconName, className = "") {
  const value = node("button", `director-action ${className}`.trim());
  value.type = "button"; value.title = label; value.setAttribute("aria-label", label);
  value.innerHTML = `${icon(iconName)}<span>${label}</span>`;
  return value;
}

function safeStem(value) {
  return String(value || "video").normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 90) || "video";
}

export function formatDirectorTime(seconds) {
  if (!Number.isFinite(Number(seconds)) || Number(seconds) < 0) return "00:00.000";
  const value = Number(seconds);
  return `${Math.floor(value / 60).toString().padStart(2, "0")}:${Math.floor(value % 60).toString().padStart(2, "0")}.${Math.floor((value % 1) * 1000).toString().padStart(3, "0")}`;
}

export function directorSampleTimes(start, duration, count) {
  const safeCount = Math.min(8, Math.max(3, Math.round(Number(count) || 6)));
  const safeStart = Math.max(0, Number(start) || 0);
  const safeDuration = Math.min(15, Math.max(0.5, Number(duration) || 15));
  return Array.from({ length: safeCount }, (_, index) => safeStart + safeDuration * (index + 0.5) / safeCount);
}

export function isSupportedDirectorMedia(file) {
  if (!file) return false;
  const type = String(file.type || "");
  return type.startsWith("video/") || type.startsWith("audio/")
    || /\.(mp4|m4v|mov|webm|ogv|avi|mkv|mp3|wav|m4a|aac|ogg|flac)$/i.test(String(file.name || ""));
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob); const link = document.createElement("a");
  link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
}

function fileDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onerror = () => reject(new Error("Lecture du média impossible."));
    reader.onload = () => resolve(String(reader.result || "")); reader.readAsDataURL(file);
  });
}

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Capture impossible.")), "image/jpeg", 0.86));
}

function providerLabel(provider) {
  return ({ openai: "OpenAI", anthropic: "Anthropic", google: "Google" })[provider] || provider;
}

function outputPanel(title, placeholder, { negative = false } = {}) {
  const section = node("section", `director-output ${negative ? "is-negative" : ""}`.trim());
  const head = node("div", "director-output-head"); const heading = node("h3", "", title);
  const copy = action(`Copier ${title}`, "copy"); head.append(heading, copy);
  const textarea = node("textarea"); textarea.rows = negative ? 4 : 9; textarea.spellcheck = false; textarea.placeholder = placeholder;
  section.append(head, textarea); return { section, textarea, copy, head, heading };
}

function menuButton(label, entries) {
  const wrap = node("div", "director-menu-wrap"); const trigger = action(label, "chevron");
  trigger.setAttribute("aria-haspopup", "true"); trigger.setAttribute("aria-expanded", "false");
  const menu = node("div", "director-menu"); menu.hidden = true; menu.setAttribute("role", "menu");
  entries.forEach((entry) => { entry.button.setAttribute("role", "menuitem"); menu.append(entry.button); });
  const close = () => { menu.hidden = true; trigger.setAttribute("aria-expanded", "false"); };
  trigger.addEventListener("click", (event) => { event.stopPropagation(); const opening = menu.hidden; document.querySelectorAll(".director-menu").forEach((item) => { item.hidden = true; }); menu.hidden = !opening; trigger.setAttribute("aria-expanded", opening ? "true" : "false"); });
  entries.forEach((entry) => entry.button.addEventListener("click", () => { close(); entry.run(); }));
  wrap.append(trigger, menu); return { wrap, trigger, menu, close };
}

export function mountVideoDirector({ host, header, configuration, onDirty, toast, api, copyText, onSendToAggregator }) {
  const state = { file: null, url: "", mediaReady: false, frames: [], busy: false, settings: { models: [], keyStates: {} }, transcriptWarning: "", prompts: {} };
  const suite = node("section", "director-suite");
  const shell = node("section", "director-shell");
  const command = node("div", "director-command");
  const importLabel = node("label", "director-import"); importLabel.innerHTML = `${icon("import")}<span>Importer un média</span>`;
  const input = node("input"); input.type = "file"; input.accept = "video/*,audio/mpeg,audio/wav,audio/x-wav,.mp3,.wav,.m4a"; importLabel.append(input);
  const analyze = action("Analyser la mise en scène", "analyze", "is-primary");
  const clear = action("Clear", "clear");
  const model = node("select"); model.setAttribute("aria-label", "Modèle d’analyse vidéo");
  const keyStatus = node("span", "director-key-status", "Vérification de la clé…");
  const configure = action("Configurer les clés IA", "settings");
  const originalAudio = action("Audio original", "download"); const trimmedAudio = action("Audio sélectionné", "download");
  const originalBlack = action("Black MP4 original", "download"); const trimmedBlack = action("Black MP4 sélectionné", "download");
  const originalMp4 = action("Vidéo originale", "download"); const trimmedMp4 = action("Vidéo sélectionnée", "download");
  const mp3Menu = menuButton("Export MP3", [{ button: originalAudio, run: () => exportMedia("mp3", false) }, { button: trimmedAudio, run: () => exportMedia("mp3", true) }]);
  const blackMenu = menuButton("Export Black MP4", [{ button: originalBlack, run: () => exportMedia("black-mp4", false) }, { button: trimmedBlack, run: () => exportMedia("black-mp4", true) }]);
  const mp4Menu = menuButton("Export MP4", [{ button: originalMp4, run: exportOriginal }, { button: trimmedMp4, run: () => exportMedia("mp4-trimmed", true) }]);
  command.append(importLabel, analyze, mp3Menu.wrap, blackMenu.wrap, mp4Menu.wrap, clear);
  const commandEnd = node("div", "director-command-end"); commandEnd.append(model, keyStatus, configure); command.append(commandEnd);

  const progress = node("section", "director-progress"); const progressHead = node("div", "director-progress-head");
  const progressText = node("span", "", "Prêt"); const progressPercent = node("output", "", "0%"); progressHead.append(progressText, progressPercent);
  const progressTrack = node("div", "director-progress-track"); const progressBar = node("div", "director-progress-bar"); progressTrack.append(progressBar); progress.append(progressHead, progressTrack);

  const workbench = node("div", "director-workbench"); const sourceColumn = node("section", "director-source");
  const sourceHead = node("div", "director-section-head"); sourceHead.append(node("h3", "", "Source et sélection"), node("span", "director-status", "Aucun média chargé"));
  const drop = node("div", "director-drop"); drop.tabIndex = 0; drop.setAttribute("role", "button"); drop.setAttribute("aria-label", "Importer un média vidéo ou audio");
  const video = node("video"); video.controls = true; video.playsInline = true; video.preload = "metadata";
  const empty = node("div", "director-empty"); empty.innerHTML = `${icon("film")}<b>Dépose une vidéo ou un audio</b><span>La fenêtre analysée est limitée à 15 secondes.</span>`;
  drop.append(video, empty);

  const trimPanel = node("div", "director-trim-panel"); const trimReadout = node("div", "director-trim-readout");
  const inValue = node("output", "", "00:00.000"); const spanValue = node("strong", "", "15.000 s"); const outValue = node("output", "", "00:15.000");
  trimReadout.append(node("span", "", "IN "), inValue, spanValue, node("span", "", "OUT "), outValue);
  const loopLabel = node("label", "director-loop"); const loop = node("input"); loop.type = "checkbox"; loop.checked = Boolean(configuration.loop); loopLabel.append(loop, node("span", "", "Boucler la sélection"));
  const rails = node("div", "director-trim-rails"); const trimWindow = node("div", "director-trim-window");
  const trimStart = node("input"); trimStart.type = "range"; trimStart.min = "0"; trimStart.max = "0"; trimStart.step = "0.001"; trimStart.value = "0"; trimStart.setAttribute("aria-label", "Point d’entrée");
  const trimOut = node("input"); trimOut.type = "range"; trimOut.min = "0"; trimOut.max = "0"; trimOut.step = "0.001"; trimOut.value = "0"; trimOut.setAttribute("aria-label", "Point de sortie");
  rails.append(trimWindow, trimStart, trimOut); trimPanel.append(trimReadout, loopLabel, rails);
  sourceColumn.append(sourceHead, drop, trimPanel);

  const direction = node("section", "director-direction");
  direction.append(node("h3", "", "Adaptation du prompt généré"), node("p", "director-direction-help", "Ces champs remplacent le sujet et le décor dans tous les prompts, sans modifier la vidéo source."));
  const subject = node("textarea"); subject.rows = 3; subject.placeholder = "Changer le sujet tout en conservant ses gestes et son timing…";
  const background = node("textarea"); background.rows = 3; background.placeholder = "Changer le décor tout en conservant cadrages, lumière et coupes…";
  const notes = node("textarea"); notes.rows = 3; notes.placeholder = "Contraintes de jeu, rythme, son ou intention supplémentaire…";
  [["Sujet de remplacement", subject], ["Décor de remplacement", background], ["Instructions supplémentaires", notes]].forEach(([label, field]) => { const row = node("label"); row.append(node("span", "", label), field); direction.append(row); });
  sourceColumn.append(direction);

  const outputColumn = node("section", "director-outputs");
  const prompt = outputPanel("Prompt vidéo", "Le prompt Seedance apparaîtra ici.");
  prompt.section.classList.add("is-main-prompt");
  const promptType = node("select", "director-prompt-type");
  promptType.setAttribute("aria-label", "Format du prompt vidéo");
  DIRECTOR_PROMPT_TYPES.forEach((item) => { const option = node("option", "", item.label); option.value = item.id; promptType.append(option); });
  promptType.value = "seedance";
  const activeDownload = action("Télécharger Seedance 2", "download");
  const activeSend = action("Envoyer Seedance 2 à BZ", "send");
  prompt.heading.replaceWith(promptType);
  prompt.head.append(activeDownload, activeSend);
  const negative = outputPanel("Kling · négatif", "Le prompt négatif apparaîtra ici.", { negative: true });
  negative.section.hidden = true;
  const transcript = outputPanel("Transcript audio", "Le transcript apparaîtra ici.", { negative: true });
  const breakdown = outputPanel("Director Breakdown", "L’analyse plan par plan apparaîtra ici.");
  outputColumn.append(prompt.section, negative.section, transcript.section, breakdown.section);
  workbench.append(sourceColumn, outputColumn);

  const framesSection = node("section", "director-frames-section"); const framesHead = node("div", "director-frames-head");
  framesHead.append(node("h3", "", "Photogrammes de continuité")); const frameActions = node("div", "director-frame-actions");
  const selectAll = action("Tout sélectionner", "download"); const zipLabel = node("label", "director-zip"); const zip = node("input"); zip.type = "checkbox"; zipLabel.append(zip, node("span", "", ".zip"));
  const selectedFrames = action("Télécharger la sélection", "download"); const analysisDoc = action("Document d’analyse", "download"); const story = action("Récit d’analyse", "download"); const all = action("Tout télécharger", "download");
  const downloadMenu = menuButton("Télécharger", [
    { button: selectedFrames, run: downloadSelectedFrames }, { button: analysisDoc, run: downloadAnalysisDoc },
    { button: story, run: downloadStory }, { button: all, run: downloadAll }
  ]);
  frameActions.append(selectAll, zipLabel, downloadMenu.wrap); framesHead.append(frameActions);
  const frameStrip = node("div", "director-frame-strip"); const frameEmpty = node("p", "director-frame-empty", "Les images-clés apparaîtront ici après l’analyse.");
  framesSection.append(framesHead, frameEmpty, frameStrip);
  shell.append(command, progress, workbench, framesSection);
  suite.append(shell);
  host.replaceChildren(header, suite);

  function range() {
    const start = Math.max(0, Number(trimStart.value) || 0); const out = Math.max(start + 0.5, Number(trimOut.value) || start + 0.5);
    return { start, out, duration: Math.min(15, out - start) };
  }

  function setProgress(value, label) {
    const percent = Math.max(0, Math.min(100, Math.round(value))); progressBar.style.width = `${percent}%`; progressPercent.textContent = `${percent}%`; progressText.textContent = label;
    progress.dataset.working = percent > 0 && percent < 100 ? "true" : "false";
  }

  function selectedModel() { return state.settings.models.find((item) => item.id === model.value); }
  function syncKey() {
    const current = selectedModel(); const ready = Boolean(current && state.settings.keyStates?.[current.provider]);
    keyStatus.textContent = current ? `${providerLabel(current.provider)} · ${ready ? "clé prête" : "clé manquante"}` : "Modèle indisponible"; keyStatus.dataset.ready = ready ? "true" : "false";
    analyze.disabled = !state.file || !state.mediaReady || !ready || state.busy;
  }

  function syncTrim(reset = false) {
    const duration = Number(video.duration) || 0;
    trimStart.max = String(Math.max(0, duration - 0.5)); trimOut.max = String(duration);
    if (reset) { trimStart.value = "0"; trimOut.value = String(Math.min(15, duration)); }
    let start = Math.max(0, Number(trimStart.value) || 0); let out = Math.max(start + 0.5, Number(trimOut.value) || Math.min(15, duration));
    if (out - start > 15) out = start + 15;
    if (out > duration) { out = duration; start = Math.max(0, out - 15); }
    trimStart.value = String(start); trimOut.value = String(out);
    inValue.textContent = formatDirectorTime(start); outValue.textContent = formatDirectorTime(out); spanValue.textContent = `${Math.max(0, out - start).toFixed(3)} s`;
    const width = duration ? ((out - start) / duration) * 100 : 0; const left = duration ? (start / duration) * 100 : 0;
    trimWindow.style.left = `${left}%`; trimWindow.style.width = `${width}%`;
  }

  function setBusy(value) {
    state.busy = value;
    [input, clear, model, configure].forEach((control) => { control.disabled = value; });
    mp3Menu.trigger.disabled = value || !state.file;
    blackMenu.trigger.disabled = value || !state.file;
    mp4Menu.trigger.disabled = value || !state.file || state.file.type.startsWith("audio/");
    syncKey();
  }

  function clearOutputs() {
    state.frames = []; state.transcriptWarning = ""; frameStrip.replaceChildren(); frameEmpty.hidden = false;
    state.prompts = {};
    [prompt.textarea, negative.textarea, transcript.textarea, breakdown.textarea].forEach((field) => { field.value = ""; });
    setProgress(0, "Prêt");
  }

  function activePromptType() { return DIRECTOR_PROMPT_TYPES.find(({ id }) => id === promptType.value) || DIRECTOR_PROMPT_TYPES[0]; }
  function syncActivePrompt() {
    const type = activePromptType();
    prompt.textarea.value = state.prompts[type.id] || "";
    prompt.textarea.placeholder = `Le prompt ${type.label} apparaîtra ici.`;
    prompt.copy.title = `Copier ${type.label}`; prompt.copy.setAttribute("aria-label", `Copier ${type.label}`); prompt.copy.querySelector("span").textContent = `Copier ${type.label}`;
    activeDownload.title = `Télécharger ${type.label}`; activeDownload.setAttribute("aria-label", `Télécharger ${type.label}`); activeDownload.querySelector("span").textContent = `Télécharger ${type.label}`;
    activeSend.title = `Envoyer ${type.label} à BZ`; activeSend.setAttribute("aria-label", `Envoyer ${type.label} à BZ`); activeSend.querySelector("span").textContent = `Envoyer ${type.label} à BZ`;
    negative.section.hidden = !type.negative;
  }

  function reset() {
    clearOutputs(); if (state.url) URL.revokeObjectURL(state.url); state.url = ""; state.file = null; state.mediaReady = false; input.value = ""; video.removeAttribute("src"); video.load(); empty.hidden = false;
    trimStart.max = "0"; trimOut.max = "0"; trimStart.value = "0"; trimOut.value = "0"; syncTrim(); sourceHead.querySelector(".director-status").textContent = "Aucun média chargé"; syncKey();
  }

  async function loadFile(file) {
    if (!isSupportedDirectorMedia(file)) return toast("Choisis une vidéo ou un fichier audio compatible.", true);
    if (file.size > 80 * 1024 * 1024) return toast("Ce média dépasse la limite locale de 80 Mo.", true);
    reset(); state.file = file; state.url = URL.createObjectURL(file); video.src = state.url; video.muted = false; empty.hidden = true;
    sourceHead.querySelector(".director-status").textContent = `Chargement… ${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} Mo`; video.load(); syncKey();
  }

  function seek(time) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { cleanup(); reject(new Error("La lecture n’a pas atteint le timecode demandé.")); }, 7000);
      const cleanup = () => { clearTimeout(timer); video.removeEventListener("seeked", done); video.removeEventListener("error", failed); };
      const done = () => { cleanup(); resolve(); }; const failed = () => { cleanup(); reject(new Error("Décodage vidéo impossible.")); };
      video.addEventListener("seeked", done, { once: true }); video.addEventListener("error", failed, { once: true }); video.currentTime = Math.max(0, Math.min(Number(video.duration) || time, time));
    });
  }

  async function captureInBrowser() {
    if (!video.videoWidth || !video.videoHeight) throw new Error("Pas de piste vidéo décodable dans le navigateur.");
    const selected = range(); const times = directorSampleTimes(selected.start, selected.duration, configuration.frameCount); const canvas = node("canvas"); const ctx = canvas.getContext("2d");
    const scale = Math.min(1, 960 / video.videoWidth); canvas.width = Math.max(2, Math.round(video.videoWidth * scale)); canvas.height = Math.max(2, Math.round(video.videoHeight * scale));
    const frames = [];
    for (let index = 0; index < times.length; index += 1) {
      setProgress(8 + (index / times.length) * 24, `Capture ${index + 1}/${times.length}`); await seek(times[index]); ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push({ time: times[index] - selected.start, sourceTime: times[index], dataUrl: canvas.toDataURL("image/jpeg", 0.84) });
    }
    return frames;
  }

  async function mediaData() { return fileDataUrl(state.file); }

  async function captureFrames(mediaDataUrl) {
    try { return await captureInBrowser(); } catch {
      if (state.file.type.startsWith("audio/")) return [];
      setProgress(12, "Extraction FFmpeg…");
      const result = await api("/api/v1/video-director/sample-frames", { method: "POST", body: JSON.stringify({ mediaDataUrl, fileName: state.file.name, trimStart: range().start, duration: range().duration, frameCount: configuration.frameCount }) });
      return result.frames || [];
    }
  }

  function renderFrames() {
    frameStrip.replaceChildren(); frameEmpty.hidden = Boolean(state.frames.length);
    state.frames.forEach((frame, index) => {
      const card = node("article", "director-frame"); const image = node("img"); image.src = frame.dataUrl; image.alt = `Photogramme ${index + 1}`;
      const meta = node("div", "director-frame-meta"); const check = node("input"); check.type = "checkbox"; check.checked = true; check.setAttribute("aria-label", `Sélectionner le photogramme ${index + 1}`);
      const time = node("span", "", `F${String(index + 1).padStart(2, "0")} · ${formatDirectorTime(frame.sourceTime ?? frame.time)}`); const one = action(`Télécharger F${index + 1}`, "download"); one.addEventListener("click", () => downloadFrame(index));
      meta.append(check, time, one); card.append(image, meta); frameStrip.append(card); frame.selected = true; check.addEventListener("change", () => { frame.selected = check.checked; });
    });
  }

  async function runAnalysis() {
    if (!state.file) return toast("Importe d’abord un média.", true);
    setBusy(true); clearOutputs();
    try {
      setProgress(3, "Lecture du média…"); const data = await mediaData();
      state.frames = await captureFrames(data); renderFrames();
      setProgress(38, "Transcription audio…");
      try {
        const result = await api("/api/v1/video-director/transcribe", { method: "POST", body: JSON.stringify({ mediaDataUrl: data, fileName: state.file.name, trimStart: range().start, duration: range().duration }) });
        transcript.textarea.value = result.transcript || ""; state.transcriptWarning = result.warning || "";
      } catch (error) { state.transcriptWarning = error.message; }
      setProgress(58, "Analyse du langage de mise en scène…");
      const result = await api("/api/v1/video-director/analyze", { method: "POST", body: JSON.stringify({ frames: state.frames, duration: range().duration, trimStart: range().start, fileName: state.file.name, transcript: transcript.textarea.value, subjectChange: subject.value, backgroundChange: background.value, notes: notes.value, model: model.value }) });
      state.prompts = Object.fromEntries(DIRECTOR_PROMPT_TYPES.map((type) => [type.id, result[type.field] || ""]));
      negative.textarea.value = result.klingNegativePrompt || ""; breakdown.textarea.value = [result.warning ? `Note : ${result.warning}` : "", state.transcriptWarning ? `Transcript : ${state.transcriptWarning}` : "", result.analysis || ""].filter(Boolean).join("\n\n");
      syncActivePrompt();
      setProgress(100, `Prêt · ${result.model}`); toast("Analyse Director terminée.");
    } catch (error) { setProgress(0, "Analyse interrompue"); toast(error.message, true); }
    finally { setBusy(false); }
  }

  async function exportMedia(exportType, useTrim) {
    if (!state.file) return toast("Importe d’abord un média.", true);
    setBusy(true);
    try {
      setProgress(18, "Préparation du média…"); const data = await mediaData(); const sourceDuration = Number(video.duration) || 15; const selected = useTrim ? range() : { start: 0, duration: sourceDuration };
      setProgress(52, "Encodage FFmpeg…"); const response = await fetch("/api/v1/video-director/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mediaDataUrl: data, fileName: state.file.name, exportType, trimStart: selected.start, duration: selected.duration, original: !useTrim, sourceDuration, width: video.videoWidth, height: video.videoHeight }) });
      if (!response.ok) { const payload = await response.json().catch(() => ({})); throw new Error(payload?.error?.message || "Export impossible."); }
      const disposition = response.headers.get("Content-Disposition") || ""; const name = /filename="?([^";]+)"?/i.exec(disposition)?.[1] || `${safeStem(state.file.name)}.${exportType === "mp3" ? "mp3" : "mp4"}`;
      download(await response.blob(), name); setProgress(100, "Export prêt"); toast("Export terminé.");
    } catch (error) { setProgress(0, "Export interrompu"); toast(error.message, true); }
    finally { setBusy(false); }
  }

  function exportOriginal() {
    if (!state.file) return toast("Importe d’abord une vidéo.", true); download(state.file, state.file.name); toast("Vidéo originale téléchargée.");
  }

  async function frameBlob(frame) { return fetch(frame.dataUrl).then((response) => response.blob()); }
  async function downloadFrame(index) { const frame = state.frames[index]; if (!frame) return; download(await frameBlob(frame), `${safeStem(state.file?.name)}_F${String(index + 1).padStart(2, "0")}_${formatDirectorTime(frame.sourceTime ?? frame.time).replace(/[:.]/g, "-")}.jpg`); }
  function chosenFrames() { return state.frames.map((frame, index) => ({ frame, index })).filter(({ frame }) => frame.selected !== false); }

  async function downloadSelectedFrames() {
    const selected = chosenFrames(); if (!selected.length) return toast("Sélectionne au moins un photogramme.", true);
    const entries = await Promise.all(selected.map(async ({ frame, index }) => ({ name: `${safeStem(state.file?.name)}_F${String(index + 1).padStart(2, "0")}.jpg`, blob: await frameBlob(frame) })));
    if (zip.checked || entries.length > 1) download(await buildStoredZip(entries), `${safeStem(state.file?.name)}_frames.zip`); else download(entries[0].blob, entries[0].name);
  }

  function analysisMarkdown() {
    const type = activePromptType();
    return [`# Prompt Atlas Video Director Analysis`, "", `Source: ${state.file?.name || "—"}`, `Window: ${formatDirectorTime(range().start)} → ${formatDirectorTime(range().out)}`, `Analysis model: ${model.value}`, `Active prompt: ${type.label}`, "", "## Director Breakdown", breakdown.textarea.value || "—", "", "## Audio Transcript", transcript.textarea.value || state.transcriptWarning || "—", "", `## ${type.label}`, prompt.textarea.value || "—", ...(type.negative ? ["", "## Kling Negative Prompt", negative.textarea.value || "—"] : []), ""].join("\n");
  }
  function storyText() { return ["VIDEO ANALYSIS STORY", "", breakdown.textarea.value || "No director breakdown.", "", transcript.textarea.value ? `Dialogue / audio:\n${transcript.textarea.value}` : "", "", "The sequence should preserve the sampled pacing, cuts, camera logic, performance rhythm and continuity anchors."].filter(Boolean).join("\n"); }
  function downloadAnalysisDoc() { download(new Blob([analysisMarkdown()], { type: "text/markdown;charset=utf-8" }), `${safeStem(state.file?.name)}_director-analysis.md`); }
  function downloadActivePrompt() { const type = activePromptType(); download(new Blob([prompt.textarea.value || ""], { type: "text/plain;charset=utf-8" }), `${safeStem(state.file?.name)}_${type.slug}.txt`); }
  function downloadStory() { download(new Blob([storyText()], { type: "text/plain;charset=utf-8" }), `${safeStem(state.file?.name)}_analysis-story.txt`); }
  async function downloadAll() {
    const entries = [{ name: "director-analysis.md", blob: new Blob([analysisMarkdown()], { type: "text/markdown" }) }, { name: "analysis-story.txt", blob: new Blob([storyText()], { type: "text/plain" }) }];
    for (const { frame, index } of chosenFrames()) entries.push({ name: `frames/F${String(index + 1).padStart(2, "0")}.jpg`, blob: await frameBlob(frame) });
    download(await buildStoredZip(entries), `${safeStem(state.file?.name)}_director-package.zip`);
  }

  async function openSettings() {
    const dialog = node("dialog", "runtime-dialog analyzer-settings-dialog"); const form = node("form", "dialog-form"); form.method = "dialog";
    const head = node("div", "dialog-head"); const close = node("button", "", "×"); close.type = "button"; close.setAttribute("aria-label", "Fermer"); close.addEventListener("click", () => dialog.close()); head.append(node("h2", "", "Clés d’analyse vidéo"), close);
    form.append(head, node("p", "", "Les clés restent dans le backend local. OpenAI sert aussi à la transcription audio.")); const inputs = {};
    [["openaiApiKey", "OpenAI", "sk-…"], ["anthropicApiKey", "Anthropic", "sk-ant-…"], ["googleApiKey", "Google", "AIza…"]].forEach(([field, label, placeholder]) => { const row = node("label", "analyzer-key-field"); const provider = field.replace("ApiKey", ""); row.append(node("span", "", `${label} ${state.settings.keyStates?.[provider] ? "· configurée" : "· absente"}`)); const value = node("input"); value.type = "password"; value.placeholder = placeholder; value.autocomplete = "off"; row.append(value); form.append(row); inputs[field] = value; });
    const actions = node("div", "dialog-actions"); const erase = node("button", "quiet-button", "Effacer la clé active"); erase.type = "button"; const cancel = node("button", "quiet-button", "Annuler"); cancel.type = "button"; cancel.addEventListener("click", () => dialog.close()); const save = node("button", "primary", "Enregistrer"); save.type = "submit"; actions.append(erase, cancel, save); form.append(actions); dialog.append(form); document.body.append(dialog);
    erase.addEventListener("click", async () => { const provider = selectedModel()?.provider; if (!provider) return; state.settings = await api("/api/v1/image-analyzer/settings", { method: "PUT", body: JSON.stringify({ model: model.value, clearProvider: provider }) }); dialog.close(); syncKey(); toast(`Clé ${providerLabel(provider)} effacée.`); });
    form.addEventListener("submit", async (event) => { event.preventDefault(); const body = { model: model.value }; Object.entries(inputs).forEach(([field, value]) => { if (value.value.trim()) body[field] = value.value.trim(); }); state.settings = await api("/api/v1/image-analyzer/settings", { method: "PUT", body: JSON.stringify(body) }); dialog.close(); syncKey(); toast("Clés IA enregistrées localement."); });
    dialog.addEventListener("close", () => dialog.remove(), { once: true }); dialog.showModal();
  }

  async function loadSettings() {
    state.settings = await api("/api/v1/image-analyzer/settings"); model.replaceChildren(...state.settings.models.map((item) => { const option = node("option", "", `${item.name} · ${providerLabel(item.provider)}`); option.value = item.id; return option; }));
    model.value = state.settings.models.some((item) => item.id === configuration.model) ? configuration.model : state.settings.model; configuration.model = model.value; syncKey();
  }

  input.addEventListener("change", () => { loadFile(input.files?.[0]); input.value = ""; });
  drop.addEventListener("click", (event) => { if (event.target === video || video.contains(event.target)) return; input.click(); });
  drop.addEventListener("keydown", (event) => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); input.click(); } });
  ["dragenter", "dragover"].forEach((type) => drop.addEventListener(type, (event) => { event.preventDefault(); drop.classList.add("is-over"); }));
  ["dragleave", "drop"].forEach((type) => drop.addEventListener(type, () => drop.classList.remove("is-over")));
  drop.addEventListener("drop", (event) => { event.preventDefault(); loadFile(event.dataTransfer.files?.[0]); });
  video.addEventListener("loadedmetadata", () => {
    if (!state.file) return;
    state.mediaReady = true; empty.hidden = true; syncTrim(true);
    sourceHead.querySelector(".director-status").textContent = `${state.file.name} · ${(state.file.size / 1024 / 1024).toFixed(1)} Mo · prêt`;
    mp3Menu.trigger.disabled = false; blackMenu.trigger.disabled = false; mp4Menu.trigger.disabled = state.file?.type.startsWith("audio/"); syncKey();
    toast("Média prêt dans Video Analyser.");
  });
  video.addEventListener("error", () => {
    if (!state.file) return;
    const failedName = state.file.name;
    if (state.url) URL.revokeObjectURL(state.url);
    state.url = ""; state.file = null; state.mediaReady = false; video.removeAttribute("src"); empty.hidden = false;
    sourceHead.querySelector(".director-status").textContent = "Média illisible · essaie un MP4 H.264, WebM, MP3 ou WAV";
    syncTrim(); syncKey(); toast(`Impossible de décoder « ${failedName} ». Essaie un MP4 H.264 ou un WebM.`, true);
  });
  video.addEventListener("timeupdate", () => { if (loop.checked && video.currentTime >= range().out) video.currentTime = range().start; });
  trimStart.addEventListener("input", () => { if (Number(trimOut.value) - Number(trimStart.value) > 15) trimOut.value = String(Number(trimStart.value) + 15); syncTrim(); });
  trimOut.addEventListener("input", () => { if (Number(trimOut.value) - Number(trimStart.value) > 15) trimStart.value = String(Number(trimOut.value) - 15); syncTrim(); });
  loop.addEventListener("change", () => { configuration.loop = loop.checked; onDirty(); });
  analyze.addEventListener("click", runAnalysis); clear.addEventListener("click", reset); configure.addEventListener("click", openSettings);
  model.addEventListener("change", async () => { configuration.model = model.value; onDirty(); state.settings = await api("/api/v1/image-analyzer/settings", { method: "PUT", body: JSON.stringify({ model: model.value }) }); syncKey(); });
  [prompt, negative, transcript, breakdown].forEach((panel) => panel.copy.addEventListener("click", () => copyText(panel.textarea.value, "Texte copié.")));
  promptType.addEventListener("change", syncActivePrompt);
  prompt.textarea.addEventListener("input", () => { state.prompts[activePromptType().id] = prompt.textarea.value; });
  activeDownload.addEventListener("click", downloadActivePrompt);
  activeSend.addEventListener("click", () => { const type = activePromptType(); onSendToAggregator(prompt.textarea.value, type.negative ? negative.textarea.value : "", type.label); });
  selectAll.addEventListener("click", () => { const shouldSelect = state.frames.some((frame) => frame.selected === false); state.frames.forEach((frame) => { frame.selected = shouldSelect; }); frameStrip.querySelectorAll('input[type="checkbox"]').forEach((check) => { check.checked = shouldSelect; }); selectAll.querySelector("span").textContent = shouldSelect ? "Tout désélectionner" : "Tout sélectionner"; });
  shell.addEventListener("click", (event) => {
    if (event.target.closest(".director-menu-wrap")) return;
    mp3Menu.close(); blackMenu.close(); mp4Menu.close(); downloadMenu.close();
  });
  reset(); loadSettings().catch((error) => toast(error.message, true));
}
