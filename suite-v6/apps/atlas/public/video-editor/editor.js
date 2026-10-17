window.__veInitVideoEditor = function initVideoEditor() {
  const els = {
    importInput: document.getElementById("videoEditorImport"),
    binList: document.getElementById("veBinList"),
    binClear: document.getElementById("veBinClear"),
    tracks: document.getElementById("veTracks"),       // lanes container
    trackHeaders: document.getElementById("veTrackHeaders"),
    scroll: document.getElementById("veScroll"),
    ruler: document.getElementById("veRuler"),
    playhead: document.getElementById("vePlayhead"),
    timeline: document.getElementById("veTimeline"),
    addVideo: document.getElementById("veAddVideoTrack"),
    addAudio: document.getElementById("veAddAudioTrack"),
    toolGrab: document.getElementById("veToolGrab"),
    toolCut: document.getElementById("veToolCut"),
    playPause: document.getElementById("vePlayPause"),
    loop: document.getElementById("veLoop"),
    goStart: document.getElementById("veGoStart"),
    goEnd: document.getElementById("veGoEnd"),
    stepBack: document.getElementById("veStepBack"),
    stepFwd: document.getElementById("veStepFwd"),
    zoom: document.getElementById("veZoom"),
    time: document.getElementById("veTime"),
    frames: document.getElementById("veFrames"),
    status: document.getElementById("veStatus"),
    previewVideo: document.getElementById("vePreviewVideo"),
    previewAudio: document.getElementById("vePreviewAudio"),
    programCanvas: document.getElementById("veProgramCanvas"),
    previewEmpty: document.getElementById("vePreviewEmpty"),
    dropzone: document.getElementById("veDropzone"),
    sourceVideo: document.getElementById("veSourceVideo"),
    sourceAudio: document.getElementById("veSourceAudio"),
    sourceEmpty: document.getElementById("veSourceEmpty"),
    save: document.getElementById("veSave"),
    load: document.getElementById("veLoad"),
    loadInput: document.getElementById("veLoadInput"),
    exportBtn: document.getElementById("veExport"),
    exportXmlBtn: document.getElementById("veExportXml"),
    exportCanvas: document.getElementById("veExportCanvas"),
    contextMenu: document.getElementById("veContextMenu"),
    trackMenu: document.getElementById("veTrackMenu"),
    trackSwatches: document.getElementById("veTrackSwatches"),
    trackColorInput: document.getElementById("veTrackColorInput"),
    trackCtxMenu: document.getElementById("veTrackCtxMenu"),
    blockMenu: document.getElementById("veBlockMenu"),
    blockSwatches: document.getElementById("veBlockSwatches"),
    blockColorInput: document.getElementById("veBlockColorInput"),
    blockReset: document.getElementById("veBlockReset"),
    markInEl: document.getElementById("veMarkIn"),
    markOutEl: document.getElementById("veMarkOut"),
    region: document.getElementById("veRegion"),
    exportModal: document.getElementById("veExportModal"),
    exportFormat: document.getElementById("veExportFormat"),
    exportRegion: document.getElementById("veExportRegion"),
    exportRegionWrap: document.getElementById("veExportRegionWrap"),
    exportStatus: document.getElementById("veExportStatus"),
    exportStart: document.getElementById("veExportStart"),
    speedModal: document.getElementById("veSpeedModal"),
    speedFactor: document.getElementById("veSpeedFactor"),
    speedDuration: document.getElementById("veSpeedDuration"),
    speedHint: document.getElementById("veSpeedHint"),
    speedApply: document.getElementById("veSpeedApply"),
    opacityPopup: document.getElementById("veOpacityPopup"),
    opacityRange: document.getElementById("veOpacityRange"),
    opacityValue: document.getElementById("veOpacityValue"),
    opacityAnim: document.getElementById("veOpacityAnim"), opacityAnimRow: document.getElementById("veOpacityAnimRow"),
    opacityInterp: document.getElementById("veOpacityInterp"), opacityAddKey: document.getElementById("veOpacityAddKey"),
    opacityDelKey: document.getElementById("veOpacityDelKey"), opacityKeys: document.getElementById("veOpacityKeys"),
    sizePopup: document.getElementById("veSizePopup"),
    sizeRange: document.getElementById("veSizeRange"), sizeValue: document.getElementById("veSizeValue"),
    sizeAnim: document.getElementById("veSizeAnim"), sizeAnimRow: document.getElementById("veSizeAnimRow"),
    sizeInterp: document.getElementById("veSizeInterp"), sizeAddKey: document.getElementById("veSizeAddKey"),
    sizeDelKey: document.getElementById("veSizeDelKey"), sizeKeys: document.getElementById("veSizeKeys"),
    ccAnim: document.getElementById("veCcAnim"), ccAnimRow: document.getElementById("veCcAnimRow"),
    ccInterp: document.getElementById("veCcInterp"), ccAddKey: document.getElementById("veCcAddKey"),
    ccDelKey: document.getElementById("veCcDelKey"), ccKeys: document.getElementById("veCcKeys"),
    wgAnim: document.getElementById("veWgAnim"), wgAnimRow: document.getElementById("veWgAnimRow"),
    wgInterp: document.getElementById("veWgInterp"), wgAddKey: document.getElementById("veWgAddKey"),
    wgDelKey: document.getElementById("veWgDelKey"), wgKeys: document.getElementById("veWgKeys"),
    nsAnim: document.getElementById("veNsAnim"), nsAnimRow: document.getElementById("veNsAnimRow"),
    nsInterp: document.getElementById("veNsInterp"), nsAddKey: document.getElementById("veNsAddKey"),
    nsDelKey: document.getElementById("veNsDelKey"), nsKeys: document.getElementById("veNsKeys"),
    textPosX: document.getElementById("veTextPosX"), textPosXVal: document.getElementById("veTextPosXVal"),
    textPosY: document.getElementById("veTextPosY"), textPosYVal: document.getElementById("veTextPosYVal"),
    effectsModal: document.getElementById("veEffectsModal"),
    fxCopy: document.getElementById("veFxCopy"),
    fxPaste: document.getElementById("veFxPaste"),
    fxClipboardInfo: document.getElementById("veFxClipboardInfo"),
    fxCcEnable: document.getElementById("veFxCcEnable"),
    fxHue: document.getElementById("veFxHue"), fxHueVal: document.getElementById("veFxHueVal"),
    fxSat: document.getElementById("veFxSat"), fxSatVal: document.getElementById("veFxSatVal"),
    fxBright: document.getElementById("veFxBright"), fxBrightVal: document.getElementById("veFxBrightVal"),
    fxGamma: document.getElementById("veFxGamma"), fxGammaVal: document.getElementById("veFxGammaVal"),
    fxWiggleEnable: document.getElementById("veFxWiggleEnable"),
    fxFreq: document.getElementById("veFxFreq"), fxFreqVal: document.getElementById("veFxFreqVal"),
    fxAmp: document.getElementById("veFxAmp"), fxAmpVal: document.getElementById("veFxAmpVal"),
    fxNoiseEnable: document.getElementById("veFxNoiseEnable"),
    fxNoiseInt: document.getElementById("veFxNoiseInt"), fxNoiseIntVal: document.getElementById("veFxNoiseIntVal"),
    fxGrain: document.getElementById("veFxGrain"), fxGrainVal: document.getElementById("veFxGrainVal"),
    fsApp: document.getElementById("veFsApp"),
    fsMonitor: document.getElementById("veFsMonitor"),
    programMonitor: document.getElementById("veProgramMonitor"),
    monitors: document.getElementById("veMonitors"),
    monHandle: document.getElementById("veMonHandle"),
    splitToggle: document.getElementById("veSplitToggle"),
    resizeMid: document.getElementById("veResizeMid"),
    resizeBottom: document.getElementById("veResizeBottom"),
    markers: document.getElementById("veMarkers"),
    markerMenu: document.getElementById("veMarkerMenu"),
    markerSwatches: document.getElementById("veMarkerSwatches"),
    markerDelete: document.getElementById("veMarkerDelete"),
    aspectBtn: document.getElementById("veAspectBtn"),
    aspectMenu: document.getElementById("veAspectMenu"),
    textBtn: document.getElementById("veTextBtn"),
    textMenu: document.getElementById("veTextMenu"),
    textModal: document.getElementById("veTextModal"),
    textInput: document.getElementById("veTextInput"),
    textColor: document.getElementById("veTextColor"),
    textSize: document.getElementById("veTextSize"), textSizeVal: document.getElementById("veTextSizeVal"),
    textBold: document.getElementById("veTextBold"),
    textFont: document.getElementById("veTextFont"),
    app: document.getElementById("videoEditorApp")
  };
  if (!els.tracks) return;

  const FPS = 30;                 // assumed frame rate for frame-stepping
  const FRAME = 1 / FPS;
  const MIN_TIMELINE = 30;        // seconds — comfortable minimum length
  const TAIL = 5;                 // seconds of padding after the last clip
  const ROW_H = 60;               // px per track lane / header (matches CSS)
  const RULER_H = 28;             // px ruler height (matches CSS)
  const DIVIDER_H = 18;           // px video/audio boundary height (matches CSS)
  const TRACK_COLORS = ["#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#a855f7", "#06b6d4", "#ec4899", "#84cc16"];
  // 10 distinct fonts (classic → hype). Offline-safe stacks: each names the wanted
  // face first, then the closest system fallback so it renders without network.
  const FONTS = [
    { key: "helvetica", label: "Helvetica / Arial", stack: "Helvetica, Arial, sans-serif" },
    { key: "times", label: "Times New Roman", stack: "'Times New Roman', Times, serif" },
    { key: "georgia", label: "Georgia", stack: "Georgia, 'Times New Roman', serif" },
    { key: "garamond", label: "Garamond", stack: "Garamond, 'Apple Garamond', 'Times New Roman', serif" },
    { key: "courier", label: "Courier New", stack: "'Courier New', Courier, monospace" },
    { key: "impact", label: "Impact", stack: "Impact, Haettenschweiler, 'Arial Black', sans-serif" },
    { key: "bebas", label: "Bebas Neue", stack: "'Bebas Neue', 'Arial Narrow', Impact, sans-serif" },
    { key: "anton", label: "Anton", stack: "Anton, 'Arial Black', Impact, sans-serif" },
    { key: "oswald", label: "Oswald", stack: "Oswald, 'Arial Narrow', 'Franklin Gothic Medium', sans-serif" },
    { key: "montserrat", label: "Montserrat", stack: "Montserrat, 'Century Gothic', 'Trebuchet MS', sans-serif" }
  ];
  function fontStack(key) { const f = FONTS.find((x) => x.key === key); return f ? f.stack : FONTS[0].stack; }
  const SOLID_DEFAULT_DUR = 3;   // seconds
  const TEXT_DEFAULT_DUR = 3;

  const state = {
    media: new Map(),   // id -> { id, name, url, kind, duration, el }
    tracks: [],         // { id, type:'video'|'audio', color, muted, clips:[] }
    tool: "grab",
    playing: false,
    loop: false,        // loop playback over IN/OUT region (or whole montage)
    playhead: 0,        // seconds
    pps: 80,            // pixels per second (zoom)
    seq: 0,
    contextClipId: null,
    menuTrackId: null,
    ctxTrackId: null,   // track whose add/delete context menu is open
    blockClipId: null,  // clip whose Block-colour menu is open
    speedClipId: null,  // clip whose Speed/Duration modal is open
    selectedClipId: null, // currently selected clip (Delete target)
    opacityClipId: null,  // clip whose opacity popup is open
    effectsClipId: null,  // clip whose Effects deck is open
    textClipId: null,     // text clip whose edit modal is open
    sourceMediaId: null,
    binSelectedId: null,
    markIn: null,       // seconds — timeline IN marker (work region)
    markOut: null,      // seconds — timeline OUT marker
    markers: [],        // [{ id, t, color, clipId|null, offset }] timeline/block markers
    aspect: "auto",     // Program/export aspect ratio key
    monoMode: false,    // Mono = Program only; Split (default) = both monitors
    monRatio: 0.5,      // Source/Program width split fraction (left share)
    extentFloor: 0,     // high-water mark so a gap never shrinks the timeline
    exporting: false,
    audioGraph: null    // lazily-built WebAudio graph for export
  };
  const nextId = (p) => `${p}-${++state.seq}`;

  function fmtTime(s) {
    s = Math.max(0, s || 0);
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    const ms = Math.floor((s - Math.floor(s)) * 1000);
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
  }
  function pad2(n) { return String(n).padStart(2, "0"); }
  // Frame-accurate timecode HH:MM:SS:FF at the reference FPS.
  function frameOf(sec) { return Math.max(0, Math.round((sec || 0) * FPS)); }
  function fmtTimecode(sec) {
    const total = frameOf(sec);
    const ff = total % FPS;
    const totalSec = Math.floor(total / FPS);
    const ss = totalSec % 60;
    const mm = Math.floor(totalSec / 60) % 60;
    const hh = Math.floor(totalSec / 3600);
    return `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}:${pad2(ff)}`;
  }
  function stamp() {
    const d = new Date();
    return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}`;
  }

  function clipTimelineDur(clip) {
    return Math.max(0.05, (clip.outPoint - clip.inPoint) / (clip.speed || 1));
  }
  // Furthest clip end in seconds (0 if empty). A gap never reduces this.
  function contentEnd() {
    let end = 0;
    state.tracks.forEach((t) => t.clips.forEach((c) => {
      end = Math.max(end, c.start + clipTimelineDur(c));
    }));
    return end;
  }
  // Full ruler length. High-water mark: it never shrinks while editing, so a gap
  // (or dragging/deleting a clip) can NEVER reduce the timeline width. Reset only
  // happens explicitly (new montage / load).
  function timelineLength() {
    const need = Math.max(MIN_TIMELINE, contentEnd() + TAIL, state.markOut || 0);
    if (need > state.extentFloor) state.extentFloor = need;
    return state.extentFloor;
  }
  function resetExtentFloor() { state.extentFloor = 0; }

  function getTrack(id) { return state.tracks.find((t) => t.id === id); }
  function getClip(id) {
    for (const t of state.tracks) {
      const c = t.clips.find((cl) => cl.id === id);
      if (c) return { clip: c, track: t };
    }
    return null;
  }
  function orderedTracks() {
    return {
      vids: state.tracks.filter((t) => t.type === "video"),
      auds: state.tracks.filter((t) => t.type === "audio")
    };
  }
  function trackLabel(track) {
    const same = state.tracks.filter((t) => t.type === track.type);
    return (track.type === "video" ? "Video " : "Audio ") + (same.indexOf(track) + 1);
  }

  /* ---- media import ---- */
  function importFiles(fileList) {
    const files = Array.from(fileList || []);
    files.forEach((file) => {
      const kind = file.type.startsWith("audio") ? "audio" : "video";
      const url = URL.createObjectURL(file);
      const probe = document.createElement(kind === "audio" ? "audio" : "video");
      probe.preload = "metadata";
      probe.src = url;
      const id = nextId("m");
      const media = { id, name: file.name, url, kind, duration: 0, el: probe };
      state.media.set(id, media);
      probe.addEventListener("loadedmetadata", () => {
        media.duration = probe.duration || 0;
        renderBin();
        renderTimeline();
      }, { once: true });
      renderBin();
    });
    if (state.media.size) els.status.textContent = `${state.media.size} media in bin`;
  }

  function renderBin() {
    els.binList.innerHTML = "";
    state.media.forEach((media) => {
      const item = document.createElement("div");
      item.className = `ve-bin-item ${media.kind}` + (media.id === state.binSelectedId ? " selected" : "");
      item.draggable = true;
      item.dataset.mediaId = media.id;
      item.innerHTML = `<span class="ve-bin-kind">${media.kind === "audio" ? "♪" : "▣"}</span>
        <span class="ve-bin-name" title="${media.name}">${media.name}</span>
        <span class="ve-bin-dur">${media.duration ? fmtTime(media.duration) : "…"}</span>`;
      item.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/ve-media", media.id);
        e.dataTransfer.effectAllowed = "copy";
      });
      // Click selects the bin media (Delete target) and loads it into Source.
      item.addEventListener("click", () => {
        state.binSelectedId = media.id;
        state.selectedClipId = null;   // bin selection and clip selection are exclusive
        loadSource(media.id);
        renderBin();
        renderTimeline();
      });
      els.binList.appendChild(item);
    });
  }

  function clearSourceMonitor() {
    state.sourceMediaId = null;
    els.sourceVideo.pause(); els.sourceAudio.pause();
    els.sourceVideo.removeAttribute("src"); els.sourceAudio.removeAttribute("src");
    els.sourceVideo.style.display = "none"; els.sourceAudio.style.display = "none";
    els.sourceEmpty.hidden = false;
  }
  // Remove one media from the bin only (placed clips are left as-is).
  function removeBinMedia(id) {
    const m = state.media.get(id);
    if (!m) return;
    const used = state.tracks.some((t) => t.clips.some((c) => c.mediaId === id));
    try { URL.revokeObjectURL(m.url); } catch (e) {}
    state.media.delete(id);
    if (state.binSelectedId === id) state.binSelectedId = null;
    if (state.sourceMediaId === id) clearSourceMonitor();
    renderBin();
    els.status.textContent = used ? "Media removed from bin (placed clips kept)" : "Media removed from bin";
  }
  function clearBin() {
    if (!state.media.size) return;
    state.media.forEach((m) => { try { URL.revokeObjectURL(m.url); } catch (e) {} });
    state.media.clear();
    state.binSelectedId = null;
    clearSourceMonitor();
    renderBin();
    els.status.textContent = "Bin cleared";
  }

  /* ---- Source / Rush monitor ---- */
  function loadSource(mediaId) {
    const media = state.media.get(mediaId);
    if (!media) return;
    state.sourceMediaId = mediaId;
    els.sourceEmpty.hidden = true;
    if (media.kind === "audio") {
      els.sourceVideo.style.display = "none";
      els.sourceVideo.pause();
      els.sourceAudio.style.display = "";
      els.sourceAudio.src = media.url;
    } else {
      els.sourceAudio.style.display = "none";
      els.sourceAudio.pause();
      els.sourceVideo.style.display = "";
      els.sourceVideo.src = media.url;
    }
    renderBin();
  }

  /* ---- tracks ---- */
  function nextColor(type) {
    const used = state.tracks.length;
    return TRACK_COLORS[used % TRACK_COLORS.length];
  }
  function addTrack(type, opts) {
    opts = opts || {};
    const track = {
      id: nextId("t"),
      type,
      color: opts.color || nextColor(type),
      muted: !!opts.muted,
      clips: []
    };
    state.tracks.push(track);
    renderTimeline();
    return track;
  }
  // Delete a track. Keeps a minimum of one video + one audio track; confirms when
  // the track still holds clips (confirm() works in Electron; prompt() does not).
  function deleteTrack(track) {
    if (!track) return;
    const sameType = state.tracks.filter((t) => t.type === track.type);
    if (sameType.length <= 1) {
      els.status.textContent = `Keep at least one ${track.type} track`;
      return;
    }
    if (track.clips.length && !window.confirm(`Delete this ${track.type} track and its ${track.clips.length} clip(s)?`)) return;
    state.tracks = state.tracks.filter((t) => t.id !== track.id);
    if (state.selectedClipId && !getClip(state.selectedClipId)) state.selectedClipId = null;
    renderTimeline();
    syncProgram(true);
    els.status.textContent = "Track deleted";
  }

  function addClipFromMedia(mediaId, trackId, startSec) {
    const media = state.media.get(mediaId);
    const track = getTrack(trackId);
    if (!media || !track) return;
    const dur = media.duration || 5;
    const clip = {
      id: nextId("c"),
      type: "media",
      mediaId,
      mediaName: media.name,
      kind: media.kind,
      start: Math.max(0, startSec),
      inPoint: 0,
      outPoint: dur,
      speed: 1,
      fadeIn: 0,
      fadeOut: 0,
      color: null,
      opacity: 1,
      scale: 1,
      effects: defaultEffects(),
      anim: {},
      linked: media.kind === "video",
      linkedAudioClipId: null,
      missing: false
    };
    track.clips.push(clip);
    renderTimeline();
  }

  function clipType(clip) { return clip.type || "media"; }

  // Generic synthetic-clip base (solid / text) — lives on a video track, no media.
  function baseSyntheticClip(start, dur) {
    return {
      id: nextId("c"), mediaId: null, mediaName: "", kind: "video",
      start: Math.max(0, start), inPoint: 0, outPoint: dur,
      speed: 1, fadeIn: 0, fadeOut: 0, color: null, opacity: 1, scale: 1,
      effects: defaultEffects(), anim: {}, linked: false, linkedAudioClipId: null, missing: false
    };
  }
  function firstVideoTrack() {
    return state.tracks.find((t) => t.type === "video") || addTrack("video");
  }
  function addSolidClip(trackId, startSec, color) {
    const track = (trackId && getTrack(trackId)) || firstVideoTrack();
    if (track.type !== "video") return null;
    const clip = baseSyntheticClip(startSec, SOLID_DEFAULT_DUR);
    clip.type = "solid";
    clip.mediaName = "Solid";
    clip.color = color || "#888888";
    track.clips.push(clip);
    selectClip(clip.id);
    renderTimeline();
    return clip;
  }
  function addTextClip(trackId, startSec, fontKey) {
    const track = (trackId && getTrack(trackId)) || firstVideoTrack();
    if (track.type !== "video") return null;
    const clip = baseSyntheticClip(startSec, TEXT_DEFAULT_DUR);
    clip.type = "text";
    clip.mediaName = "Text";
    clip.text = "Text";
    clip.fontKey = fontKey || FONTS[0].key;
    clip.font = fontStack(clip.fontKey);
    clip.fontSize = 12;     // percent of frame height
    clip.bold = true;
    clip.color = "#ffffff";
    clip.textX = 50;        // percent across the frame
    clip.textY = 50;        // percent down the frame
    track.clips.push(clip);
    selectClip(clip.id);
    renderTimeline();
    syncProgram(true);
    return clip;
  }
  // Deep clone a clip (for copy/paste + duplicate): fresh id, no audio link.
  function cloneClip(src, over) {
    const c = JSON.parse(JSON.stringify(src));
    c.id = nextId("c");
    c.linkedAudioClipId = null;
    if (clipType(c) === "media") c.effects = normEffects(c.effects);
    return Object.assign(c, over || {});
  }

  /* ---- ruler ---- */
  function tickStep() {
    const candidates = [1, 2, 5, 10, 15, 30, 60, 120, 300];
    for (const c of candidates) { if (c * state.pps >= 64) return c; }
    return 600;
  }
  function renderRuler(width) {
    els.ruler.style.width = `${width}px`;
    els.ruler.innerHTML = "";
    const len = timelineLength();
    const step = tickStep();
    for (let s = 0; s <= len + 0.001; s += step) {
      const tick = document.createElement("div");
      tick.className = "ve-tick major";
      tick.style.left = `${s * state.pps}px`;
      tick.textContent = fmtTime(s).slice(0, 5);
      els.ruler.appendChild(tick);
    }
  }

  /* ---- timeline (headers + lanes) ---- */
  let dragTrackId = null;
  // Move src before dst within their (same-type) zone; never mix video/audio.
  function reorderTrack(srcId, dstId) {
    const src = getTrack(srcId), dst = getTrack(dstId);
    if (!src || !dst || src.id === dst.id || src.type !== dst.type) return;
    const arr = state.tracks;
    arr.splice(arr.indexOf(src), 1);
    arr.splice(arr.indexOf(dst), 0, src);
    renderTimeline();
    syncProgram(true);
    els.status.textContent = "Tracks reordered";
  }
  function buildHeader(track) {
    const h = document.createElement("div");
    h.className = `ve-track-header ${track.type}` + (track.muted ? " muted" : "") + (track.hidden ? " hidden-track" : "");
    h.dataset.trackId = track.id;
    h.style.height = `${ROW_H}px`;
    h.style.borderLeftColor = track.color;

    const name = document.createElement("span");
    name.className = "ve-th-name";
    name.textContent = trackLabel(track);
    name.title = "Drag to reorder this track";
    // Drag the header name to reorder tracks within their own zone (item 3).
    name.draggable = true;
    name.addEventListener("dragstart", (e) => { dragTrackId = track.id; e.dataTransfer.setData("text/ve-track", track.id); e.dataTransfer.effectAllowed = "move"; });
    name.addEventListener("dragend", () => { dragTrackId = null; });
    h.addEventListener("dragover", (e) => {
      const srcId = (e.dataTransfer.getData("text/ve-track") || dragTrackId);
      const src = srcId && getTrack(srcId);
      if (src && src.type === track.type) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; h.classList.add("drop-target"); }
    });
    h.addEventListener("dragleave", () => h.classList.remove("drop-target"));
    h.addEventListener("drop", (e) => {
      e.preventDefault(); h.classList.remove("drop-target");
      const srcId = e.dataTransfer.getData("text/ve-track") || dragTrackId;
      reorderTrack(srcId, track.id);
    });

    // Video tracks: an eye toggle (hide/show); audio tracks: a mute toggle.
    const toggle = document.createElement("button");
    toggle.type = "button";
    if (track.type === "video") {
      toggle.className = "ve-th-eye" + (track.hidden ? " off" : "");
      toggle.title = track.hidden ? "Show track" : "Hide track";
      toggle.setAttribute("aria-label", toggle.title);
      toggle.innerHTML = track.hidden
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>`;
      toggle.addEventListener("click", (e) => {
        e.stopPropagation();
        track.hidden = !track.hidden;
        renderTimeline();
        syncProgram(true);
      });
    } else {
      toggle.className = "ve-th-mute" + (track.muted ? " on" : "");
      toggle.title = track.muted ? "Unmute track" : "Mute track";
      toggle.textContent = track.muted ? "Muted" : "Mute";
      toggle.addEventListener("click", (e) => {
        e.stopPropagation();
        track.muted = !track.muted;
        renderTimeline();
        syncProgram();
      });
    }
    const mute = toggle;

    const sw = document.createElement("button");
    sw.type = "button";
    sw.className = "ve-th-color";
    sw.title = "Track colour";
    sw.style.background = track.color;
    sw.addEventListener("click", (e) => { e.stopPropagation(); openTrackMenu(track, e.clientX, e.clientY); });

    h.appendChild(name);
    h.appendChild(mute);
    h.appendChild(sw);
    h.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openTrackContextMenu(track, e.clientX, e.clientY);
    });
    return h;
  }

  function buildClipEl(clip, track) {
    const el = document.createElement("div");
    const ct = clipType(clip);
    el.className = `ve-clip ${clip.kind} ${ct}` + (clip.missing ? " missing" : "") + (clip.id === state.selectedClipId ? " selected" : "");
    el.dataset.clipId = clip.id;
    el.style.left = `${clip.start * state.pps}px`;
    el.style.width = `${clipTimelineDur(clip) * state.pps}px`;
    if (!clip.missing) {
      if (ct === "solid") {
        el.style.background = clip.color || "#888888";
      } else {
        // text uses the track colour (clip.color is the text colour, not the block);
        // media uses its per-clip colour override when set (A3).
        const base = (ct === "text") ? track.color : (clip.color || track.color);
        el.style.background = `linear-gradient(180deg, ${base}, ${shade(base, -22)})`;
      }
    }
    // Per-block opacity reflected on the block (floored so it stays grabbable).
    const op = (clip.opacity == null) ? 1 : clip.opacity;
    el.style.opacity = String(Math.max(0.2, op));
    const label = clip.missing ? "media manquant"
      : (ct === "text" ? (clip.text || "Text") : (ct === "solid" ? "Solid" : (clip.mediaName || "clip")));
    const nameStyle = (ct === "text") ? ` style="font-family:${(clip.font || fontStack(clip.fontKey)).replace(/"/g, "&quot;")}"` : "";
    const tPct = Math.round(op * 100);
    const scPct = Math.round((clip.scale == null ? 1 : clip.scale) * 100);
    el.innerHTML = `
      <span class="ve-clip-name"${nameStyle}>${label}</span>
      ${clip.speed !== 1 ? `<span class="ve-clip-badge">${(+clip.speed.toFixed(3))}×</span>` : ""}
      ${clipHasFx(clip) ? `<span class="ve-clip-fx" title="Effects / opacity active">fx</span>` : ""}
      <button type="button" class="ve-clip-t" data-clip-t title="Opacity (${tPct}%)">${op < 1 ? tPct : "T"}</button>
      <button type="button" class="ve-clip-s" data-clip-s title="Size (${scPct}%)">S</button>
      <div class="ve-handle ve-handle-l" data-handle="trim-l"></div>
      <div class="ve-handle ve-handle-r" data-handle="trim-r"></div>
      <div class="ve-fade ve-fade-in" data-handle="fade-in" title="Fade in"></div>
      <div class="ve-fade ve-fade-out" data-handle="fade-out" title="Fade out"></div>
      <div class="ve-fade-tri ve-fade-tri-in" style="width:${clip.fadeIn * state.pps}px"></div>
      <div class="ve-fade-tri ve-fade-tri-out" style="width:${clip.fadeOut * state.pps}px"></div>`;
    return el;
  }

  function buildLane(track, width) {
    const row = document.createElement("div");
    row.className = `ve-track ${track.type}`;
    row.dataset.trackId = track.id;
    row.style.width = `${width}px`;
    row.style.height = `${ROW_H}px`;
    track.clips.forEach((clip) => row.appendChild(buildClipEl(clip, track)));

    row.addEventListener("dragover", (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; row.classList.add("drag-over"); });
    row.addEventListener("dragleave", () => row.classList.remove("drag-over"));
    row.addEventListener("drop", (e) => {
      e.preventDefault();
      row.classList.remove("drag-over");
      const mediaId = e.dataTransfer.getData("text/ve-media");
      if (!mediaId) return;
      const rect = row.getBoundingClientRect();
      const x = e.clientX - rect.left;
      addClipFromMedia(mediaId, track.id, Math.max(0, x / state.pps));
    });
    return row;
  }

  function buildDivider(forHeaders, width) {
    const d = document.createElement("div");
    d.className = forHeaders ? "ve-zone-divider" : "ve-zone-boundary";
    d.style.height = `${DIVIDER_H}px`;
    if (!forHeaders) {
      d.style.width = `${width}px`;
      d.innerHTML = `<span>VIDEO</span><span>AUDIO</span>`;
    }
    return d;
  }

  function renderTimeline() {
    const len = timelineLength();
    const width = len * state.pps;
    renderRuler(width);

    els.tracks.style.width = `${width}px`;
    els.tracks.innerHTML = "";
    els.trackHeaders.innerHTML = "";

    // Header spacer aligns header[0] with lane[0] (which sits under the ruler).
    const spacer = document.createElement("div");
    spacer.className = "ve-hd-spacer";
    spacer.style.height = `${RULER_H}px`;
    els.trackHeaders.appendChild(spacer);

    const { vids, auds } = orderedTracks();
    vids.forEach((t) => {
      els.trackHeaders.appendChild(buildHeader(t));
      els.tracks.appendChild(buildLane(t, width));
    });
    // Visible video/audio boundary, mirrored in both columns for alignment.
    els.trackHeaders.appendChild(buildDivider(true));
    els.tracks.appendChild(buildDivider(false, width));
    auds.forEach((t) => {
      els.trackHeaders.appendChild(buildHeader(t));
      els.tracks.appendChild(buildLane(t, width));
    });

    positionPlayhead();
    positionMarkers();
    renderMarkers();
  }

  function positionPlayhead() {
    els.playhead.style.left = `${state.playhead * state.pps}px`;
    els.time.textContent = fmtTime(state.playhead);
    if (els.frames) {
      const cur = frameOf(state.playhead);
      const total = Math.max(frameOf(contentEnd()), cur);
      els.frames.textContent = `${fmtTimecode(state.playhead)} · f ${cur} / ${total}`;
    }
  }

  /* ---- IN / OUT markers + work region (A4) ---- */
  function positionMarkers() {
    const inSet = state.markIn != null;
    const outSet = state.markOut != null;
    els.markInEl.hidden = !inSet;
    els.markOutEl.hidden = !outSet;
    if (inSet) els.markInEl.style.left = `${state.markIn * state.pps}px`;
    if (outSet) els.markOutEl.style.left = `${state.markOut * state.pps}px`;
    if (inSet && outSet && state.markOut > state.markIn) {
      els.region.hidden = false;
      els.region.style.left = `${state.markIn * state.pps}px`;
      els.region.style.width = `${(state.markOut - state.markIn) * state.pps}px`;
    } else {
      els.region.hidden = true;
    }
  }
  // Valid work region only when both marks set and ordered.
  function workRegion() {
    if (state.markIn != null && state.markOut != null && state.markOut > state.markIn) {
      return { start: state.markIn, end: state.markOut };
    }
    return null;
  }
  function setMark(which, sec) {
    sec = Math.max(0, sec);
    if (which === "in") state.markIn = sec;
    else state.markOut = sec;
    renderTimeline();
    els.status.textContent = `${which === "in" ? "IN" : "OUT"} at ${fmtTime(sec).slice(0, 8)}`;
  }
  function attachMarkerDrag(el, which) {
    el.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = els.ruler.getBoundingClientRect();
      const move = (ev) => {
        const sec = Math.max(0, (ev.clientX - rect.left) / state.pps);
        if (which === "in") state.markIn = sec; else state.markOut = sec;
        renderTimeline();
      };
      const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
    });
  }

  // Lighten/darken a hex colour by pct (-100..100) for the clip gradient.
  function shade(hex, pct) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "");
    if (!m) return hex;
    const adj = (v) => Math.max(0, Math.min(255, Math.round(parseInt(v, 16) + (pct / 100) * 255)));
    return `rgb(${adj(m[1])}, ${adj(m[2])}, ${adj(m[3])})`;
  }

  /* ---- Effects model + preview helpers ---- */
  function defaultEffects() {
    return {
      colorCorrection: { enabled: false, hue: 0, sat: 100, bright: 100, gamma: 1 },
      wiggle: { enabled: false, freq: 2, amp: 8 },
      noise: { enabled: false, intensity: 30, grainSize: 2 }
    };
  }
  // Merge a (possibly partial / legacy) effects object onto fresh defaults.
  function normEffects(src) {
    const d = defaultEffects();
    if (!src || typeof src !== "object") return d;
    if (src.colorCorrection) Object.assign(d.colorCorrection, src.colorCorrection);
    if (src.wiggle) Object.assign(d.wiggle, src.wiggle);
    if (src.noise) Object.assign(d.noise, src.noise);
    d.colorCorrection.enabled = !!d.colorCorrection.enabled;
    d.wiggle.enabled = !!d.wiggle.enabled;
    d.noise.enabled = !!d.noise.enabled;
    return d;
  }
  function clipHasFx(clip) {
    const fx = clip.effects;
    return (clip.opacity != null && clip.opacity < 1) || (clip.scale != null && clip.scale !== 1) ||
      (clip.anim && Object.keys(clip.anim).some((k) => clip.anim[k] && clip.anim[k].enabled)) ||
      (fx && (fx.colorCorrection.enabled || fx.wiggle.enabled || fx.noise.enabled));
  }

  /* ---- keyframe animation (item 9): per-clip clip.anim[param] = {enabled, interp, keys} ---- */
  function lerp(a, b, f) { return a + (b - a) * f; }
  function easeF(interp, f) {
    if (interp === "hold") return 0;            // step: hold the previous key
    if (interp === "bezier") return f * f * (3 - 2 * f); // smoothstep ease in/out
    return f;                                   // normal / linear
  }
  // Locate the interpolation segment for a clip-relative time, return {a,b,f} or a single key.
  function animSeg(track, localT) {
    const ks = track.keys.slice().sort((x, y) => x.t - y.t);
    if (localT <= ks[0].t) return { one: ks[0] };
    if (localT >= ks[ks.length - 1].t) return { one: ks[ks.length - 1] };
    let i = 0; while (i < ks.length - 1 && ks[i + 1].t <= localT) i++;
    const f = easeF(track.interp, (localT - ks[i].t) / ((ks[i + 1].t - ks[i].t) || 1));
    return { a: ks[i], b: ks[i + 1], f };
  }
  function animActive(clip, key) {
    const a = clip.anim && clip.anim[key];
    return !!(a && a.enabled && a.keys && a.keys.length);
  }
  // Animated scalar value (opacity / scale) or fallback when not animated.
  function animScalar(clip, key, fallback) {
    if (!animActive(clip, key)) return fallback;
    const seg = animSeg(clip.anim[key], state.playhead - clip.start);
    if (seg.one) return seg.one.v;
    return lerp(seg.a.v, seg.b.v, seg.f);
  }
  // Animated parameter object (colorCorrection / wiggle / noise) or fallback.
  function animParams(clip, key, fallback) {
    if (!animActive(clip, key)) return fallback;
    const seg = animSeg(clip.anim[key], state.playhead - clip.start);
    if (seg.one) return seg.one.params;
    const out = {}; const p0 = seg.a.params, p1 = seg.b.params;
    Object.keys(p0).forEach((k) => { out[k] = (typeof p0[k] === "number") ? lerp(p0[k], p1[k], seg.f) : p0[k]; });
    return out;
  }
  function effOpacity(clip) { return animScalar(clip, "opacity", clip.opacity == null ? 1 : clip.opacity); }
  function effScale(clip) { return animScalar(clip, "scale", clip.scale == null ? 1 : clip.scale); }
  function effCC(clip) {
    const base = (clip.effects && clip.effects.colorCorrection) || null;
    if (!base) return null;
    if (animActive(clip, "colorCorrection")) return Object.assign({ enabled: true }, animParams(clip, "colorCorrection", base));
    return base;
  }
  function effWiggle(clip) {
    const base = (clip.effects && clip.effects.wiggle) || null;
    if (!base) return null;
    if (animActive(clip, "wiggle")) return Object.assign({ enabled: true }, animParams(clip, "wiggle", base));
    return base;
  }
  function effNoise(clip) {
    const base = (clip.effects && clip.effects.noise) || null;
    if (!base) return null;
    if (animActive(clip, "noise")) return Object.assign({ enabled: true }, animParams(clip, "noise", base));
    return base;
  }

  /* ---- keyframe mutation + UI wiring (item 9) ---- */
  function ensureAnim(clip, key) {
    clip.anim = clip.anim || {};
    if (!clip.anim[key]) clip.anim[key] = { enabled: false, interp: "normal", keys: [] };
    return clip.anim[key];
  }
  function keyCountLabel(a) { return `${a.keys.length} key${a.keys.length === 1 ? "" : "s"}`; }
  function addScalarKey(clip, key, getVal) {
    const a = ensureAnim(clip, key);
    const lt = Math.max(0, state.playhead - clip.start);
    a.keys = a.keys.filter((k) => Math.abs(k.t - lt) > 0.02);
    a.keys.push({ t: lt, v: getVal() });
    a.keys.sort((x, y) => x.t - y.t);
  }
  function addParamsKey(clip, key, getParams) {
    const a = ensureAnim(clip, key);
    const lt = Math.max(0, state.playhead - clip.start);
    a.keys = a.keys.filter((k) => Math.abs(k.t - lt) > 0.02);
    a.keys.push({ t: lt, params: getParams() });
    a.keys.sort((x, y) => x.t - y.t);
  }
  function delNearestKey(clip, key) {
    const a = clip.anim && clip.anim[key];
    if (!a || !a.keys.length) return;
    const lt = state.playhead - clip.start;
    let bi = 0, bd = Infinity;
    a.keys.forEach((k, i) => { const d = Math.abs(k.t - lt); if (d < bd) { bd = d; bi = i; } });
    a.keys.splice(bi, 1);
  }
  // Wire a popup/card's Animate controls for one parameter.
  // ui = {check,row,interp,add,del,count}; addKey()/initVal handled by caller.
  function wireAnim(clip, key, ui, addKey) {
    const a = ensureAnim(clip, key);
    const refresh = () => { ui.row.hidden = !a.enabled; ui.count.textContent = keyCountLabel(a); };
    ui.check.checked = a.enabled;
    ui.interp.value = a.interp || "normal";
    refresh();
    ui.check.onchange = () => {
      a.enabled = ui.check.checked;
      if (a.enabled && a.keys.length === 0) addKey();   // seed a first key
      refresh(); renderTimeline(); syncProgram(true);
    };
    ui.interp.onchange = () => { a.interp = ui.interp.value; syncProgram(true); };
    ui.add.onclick = () => { addKey(); refresh(); renderTimeline(); syncProgram(true); els.status.textContent = `${key} key added`; };
    ui.del.onclick = () => { delNearestKey(clip, key); refresh(); renderTimeline(); syncProgram(true); };
  }

  // CSS/canvas filter string for colour correction (gamma approximated by contrast).
  function colorFilter(clip) {
    const cc = effCC(clip);
    if (!cc || !cc.enabled) return "";
    const contrast = Math.round(100 / Math.max(0.2, cc.gamma || 1)); // gamma≈contrast (approx)
    return `hue-rotate(${Math.round(cc.hue || 0)}deg) saturate(${Math.round(cc.sat ?? 100)}%) brightness(${Math.round(cc.bright ?? 100)}%) contrast(${contrast}%)`;
  }
  // Deterministic pseudo-random wiggle offset (sin + 2nd harmonic), in px.
  function wiggleOffset(clip) {
    const w = effWiggle(clip);
    if (!w || !w.enabled) return { x: 0, y: 0 };
    const t = state.playhead, f = w.freq || 0, a = w.amp || 0, T = 2 * Math.PI * f * t;
    return {
      x: a * (Math.sin(T) * 0.7 + Math.sin(T * 1.7 + 1.3) * 0.3),
      y: a * (Math.cos(T * 1.1) * 0.7 + Math.sin(T * 2.3 + 0.5) * 0.3)
    };
  }
  // One reusable grayscale noise tile (for preview overlay + export pattern).
  const NOISE_SIZE = 128, NOISE_TILES = 8;
  let _noisePool = null;
  function makeNoiseCanvas() {
    const c = document.createElement("canvas");
    c.width = c.height = NOISE_SIZE;
    const cx = c.getContext("2d");
    const img = cx.createImageData(NOISE_SIZE, NOISE_SIZE);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    cx.putImageData(img, 0, 0);
    return c;
  }
  // Pre-generate a small pool of grain tiles once; the render loop cycles through
  // them (+ a per-frame origin offset) so the grain moves like real film grain.
  function noisePool() {
    if (!_noisePool) { _noisePool = []; for (let k = 0; k < NOISE_TILES; k++) _noisePool.push(makeNoiseCanvas()); }
    return _noisePool;
  }
  function noiseTile() { return noisePool()[0]; }
  let _noiseFrame = 0;   // advances once per composited frame (preview + export)

  /* ---- clip interactions (move / trim / fade) ---- */
  let drag = null;
  els.tracks.addEventListener("mousedown", (e) => {
    const clipEl = e.target.closest(".ve-clip");
    if (!clipEl) return;
    const found = getClip(clipEl.dataset.clipId);
    if (!found) return;
    // The centred "T"/"S" buttons open their popup instead of starting a drag.
    if (e.target.dataset.clipT !== undefined) {
      e.preventDefault();
      e.stopPropagation();
      selectClip(found.clip.id);
      openOpacityPopup(found.clip, e.clientX, e.clientY);
      return;
    }
    if (e.target.dataset.clipS !== undefined) {
      e.preventDefault();
      e.stopPropagation();
      selectClip(found.clip.id);
      openSizePopup(found.clip, e.clientX, e.clientY);
      return;
    }
    selectClip(found.clip.id);
    if (state.tool === "cut") { splitClipAtPlayhead(found.clip, found.track); return; }
    const handle = e.target.dataset.handle;
    drag = {
      clip: found.clip, track: found.track, mode: handle || "move",
      startX: e.clientX,
      origStart: found.clip.start, origIn: found.clip.inPoint, origOut: found.clip.outPoint,
      origFadeIn: found.clip.fadeIn, origFadeOut: found.clip.fadeOut
    };
    e.preventDefault();
  });

  window.addEventListener("mousemove", (e) => {
    if (!drag) return;
    const dxSec = (e.clientX - drag.startX) / state.pps;
    const c = drag.clip;
    // Media clips are capped by their source length; solid/text have no source -> free.
    const srcDur = c.mediaId ? ((state.media.get(c.mediaId) || {}).duration || c.outPoint) : Infinity;
    if (drag.mode === "move") {
      c.start = Math.max(0, drag.origStart + dxSec);
    } else if (drag.mode === "trim-l") {
      const deltaSource = dxSec * (c.speed || 1);
      const newIn = Math.min(Math.max(0, drag.origIn + deltaSource), c.outPoint - 0.1);
      c.start = Math.max(0, drag.origStart + (newIn - drag.origIn) / (c.speed || 1));
      c.inPoint = newIn;
    } else if (drag.mode === "trim-r") {
      const deltaSource = dxSec * (c.speed || 1);
      c.outPoint = Math.max(c.inPoint + 0.1, Math.min(srcDur, drag.origOut + deltaSource));
    } else if (drag.mode === "fade-in") {
      c.fadeIn = Math.max(0, Math.min(clipTimelineDur(c), drag.origFadeIn + dxSec));
    } else if (drag.mode === "fade-out") {
      c.fadeOut = Math.max(0, Math.min(clipTimelineDur(c), drag.origFadeOut - dxSec));
    }
    renderTimeline();
  });
  window.addEventListener("mouseup", () => { drag = null; });

  function splitClipAtPlayhead(clip, track) {
    const dur = clipTimelineDur(clip);
    if (state.playhead <= clip.start + 0.05 || state.playhead >= clip.start + dur - 0.05) return;
    const offsetTimeline = state.playhead - clip.start;
    const splitSource = clip.inPoint + offsetTimeline * (clip.speed || 1);
    const right = Object.assign({}, clip, { id: nextId("c"), start: state.playhead, inPoint: splitSource, fadeIn: 0, linkedAudioClipId: null, effects: normEffects(clip.effects) });
    clip.outPoint = splitSource;
    clip.fadeOut = 0;
    track.clips.push(right);
    renderTimeline();
  }

  /* ---- floating menus (clip context + track colour) ---- */
  function closeMenus() {
    let was = false;
    if (!els.contextMenu.hidden) { els.contextMenu.hidden = true; was = true; }
    if (!els.trackMenu.hidden) { els.trackMenu.hidden = true; was = true; }
    if (els.blockMenu && !els.blockMenu.hidden) { els.blockMenu.hidden = true; was = true; }
    if (els.opacityPopup && !els.opacityPopup.hidden) { els.opacityPopup.hidden = true; was = true; }
    if (els.sizePopup && !els.sizePopup.hidden) { els.sizePopup.hidden = true; was = true; }
    if (els.trackCtxMenu && !els.trackCtxMenu.hidden) { els.trackCtxMenu.hidden = true; was = true; }
    if (els.textMenu && !els.textMenu.hidden) { els.textMenu.hidden = true; was = true; }
    if (els.markerMenu && !els.markerMenu.hidden) { els.markerMenu.hidden = true; was = true; }
    if (els.aspectMenu && !els.aspectMenu.hidden) { els.aspectMenu.hidden = true; was = true; }
    state.markerMenuId = null;
    state.contextClipId = null;
    state.menuTrackId = null;
    state.blockClipId = null;
    state.opacityClipId = null;
    state.sizeClipId = null;
    state.ctxTrackId = null;
    if (!was) return;
    document.removeEventListener("mousedown", onMenuOutside, true);
    document.removeEventListener("keydown", onMenuKey, true);
    window.removeEventListener("scroll", closeMenus, true);
    window.removeEventListener("resize", closeMenus, true);
    window.removeEventListener("blur", closeMenus);
  }
  function onMenuOutside(e) {
    if (!els.contextMenu.contains(e.target) && !els.trackMenu.contains(e.target)
      && !(els.blockMenu && els.blockMenu.contains(e.target))
      && !(els.opacityPopup && els.opacityPopup.contains(e.target))
      && !(els.sizePopup && els.sizePopup.contains(e.target))
      && !(els.trackCtxMenu && els.trackCtxMenu.contains(e.target))
      && !(els.textMenu && els.textMenu.contains(e.target))
      && !(els.markerMenu && els.markerMenu.contains(e.target))
      && !(els.aspectMenu && els.aspectMenu.contains(e.target))) closeMenus();
  }
  function onMenuKey(e) { if (e.key === "Escape") closeMenus(); }
  function attachMenuClose() {
    setTimeout(() => {
      document.addEventListener("mousedown", onMenuOutside, true);
      document.addEventListener("keydown", onMenuKey, true);
      window.addEventListener("scroll", closeMenus, true);
      window.addEventListener("resize", closeMenus, true);
      window.addEventListener("blur", closeMenus);
    }, 0);
  }
  function placeMenu(menu, x, y) {
    menu.hidden = false;
    menu.style.left = "0px"; menu.style.top = "0px";
    const rect = menu.getBoundingClientRect();
    const margin = 8;
    if (x + rect.width + margin > window.innerWidth) x = Math.max(margin, window.innerWidth - rect.width - margin);
    if (y + rect.height + margin > window.innerHeight) y = Math.max(margin, window.innerHeight - rect.height - margin);
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
  }
  // Expose so tab/view switches can force-close any open menu.
  els.closeContextMenu = closeMenus;
  window.__veCloseContextMenu = closeMenus;

  els.tracks.addEventListener("contextmenu", (e) => {
    const clipEl = e.target.closest(".ve-clip");
    if (!clipEl) {
      // Right-click on an empty lane body opens the track context menu.
      const laneEl = e.target.closest(".ve-track");
      if (laneEl) {
        const track = getTrack(laneEl.dataset.trackId);
        if (track) { e.preventDefault(); e.stopPropagation(); openTrackContextMenu(track, e.clientX, e.clientY); }
      }
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    closeMenus();
    state.contextClipId = clipEl.dataset.clipId;
    state._menuX = e.clientX; state._menuY = e.clientY;
    selectClip(state.contextClipId);
    const found = getClip(state.contextClipId);
    const linkBtn = els.contextMenu.querySelector('[data-ve-action="toggle-link"]');
    if (linkBtn && found) {
      const isMediaVideo = found.clip.kind === "video" && clipType(found.clip) === "media";
      linkBtn.hidden = !isMediaVideo;
      linkBtn.textContent = found.clip.linked ? "Unlink audio" : "Link audio";
    }
    const editTextBtn = els.contextMenu.querySelector('[data-ve-action="edit-text"]');
    if (editTextBtn && found) editTextBtn.hidden = clipType(found.clip) !== "text";
    placeMenu(els.contextMenu, e.clientX, e.clientY);
    attachMenuClose();
  });
  els.contextMenu.addEventListener("click", (e) => {
    const action = e.target.dataset.veAction;
    if (!action) return;
    const found = getClip(state.contextClipId);
    const menuX = state._menuX, menuY = state._menuY;
    closeMenus();
    if (!found) return;
    const { clip, track } = found;
    if (action === "delete") {
      track.clips = track.clips.filter((c) => c.id !== clip.id);
      if (clip.linkedAudioClipId) removeClipById(clip.linkedAudioClipId);
    } else if (action === "duplicate") {
      duplicateClip(clip, track);
      return;
    } else if (action === "edit-text") {
      openTextEditModal(clip);
      return;
    } else if (action === "block-color") {
      openBlockMenu(clip, track, menuX, menuY);
      return;
    } else if (action === "fade-in") {
      clip.fadeIn = clip.fadeIn > 0 ? 0 : Math.min(0.5, clipTimelineDur(clip) / 2);
    } else if (action === "fade-out") {
      clip.fadeOut = clip.fadeOut > 0 ? 0 : Math.min(0.5, clipTimelineDur(clip) / 2);
    } else if (action === "speed") {
      openSpeedModal(clip);
      return;
    } else if (action === "effects") {
      openEffectsDeck(clip);
      return;
    } else if (action === "toggle-link") {
      toggleLinkAudio(clip);
    }
    renderTimeline();
  });

  /* ---- Text: font dropdown + edit modal ---- */
  function openTextMenu(x, y) {
    closeMenus();
    els.textMenu.innerHTML = "";
    FONTS.forEach((f) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = f.label;
      b.style.fontFamily = f.stack;
      b.addEventListener("click", (ev) => {
        ev.stopPropagation();
        closeMenus();
        const clip = addTextClip(null, state.playhead, f.key);
        if (clip) openTextEditModal(clip); // open editor so the user can type
      });
      els.textMenu.appendChild(b);
    });
    placeMenu(els.textMenu, x, y);
    attachMenuClose();
  }
  function populateFontSelect(select, selectedKey) {
    select.innerHTML = "";
    FONTS.forEach((f) => {
      const o = document.createElement("option");
      o.value = f.key; o.textContent = f.label; o.style.fontFamily = f.stack;
      select.appendChild(o);
    });
    select.value = selectedKey || FONTS[0].key;
  }
  function openTextEditModal(clip) {
    if (clipType(clip) !== "text") return;
    state.textClipId = clip.id;
    selectClip(clip.id);
    // Put the playhead over the clip so the Program preview shows the text.
    const dur = clipTimelineDur(clip);
    if (state.playhead < clip.start || state.playhead >= clip.start + dur) seekTo(clip.start + 0.05, true);
    els.textInput.value = clip.text || "";
    els.textColor.value = /^#[0-9a-f]{6}$/i.test(clip.color) ? clip.color : "#ffffff";
    els.textSize.value = clip.fontSize || 12;
    els.textSizeVal.textContent = `${clip.fontSize || 12}%`;
    els.textBold.checked = !!clip.bold;
    if (clip.textX == null) clip.textX = 50;
    if (clip.textY == null) clip.textY = 50;
    els.textPosX.value = Math.round(clip.textX); els.textPosXVal.textContent = `${Math.round(clip.textX)}%`;
    els.textPosY.value = Math.round(clip.textY); els.textPosYVal.textContent = `${Math.round(clip.textY)}%`;
    populateFontSelect(els.textFont, clip.fontKey);
    els.textModal.hidden = false;
    setTimeout(() => { try { els.textInput.focus(); els.textInput.select(); } catch (e) {} }, 0);
  }
  function applyTextEditLive() {
    const f = getClip(state.textClipId);
    if (!f) return;
    const clip = f.clip;
    clip.text = els.textInput.value;
    clip.color = els.textColor.value;
    clip.fontSize = parseInt(els.textSize.value, 10) || 12;
    clip.bold = els.textBold.checked;
    clip.fontKey = els.textFont.value;
    clip.font = fontStack(clip.fontKey);
    clip.textX = Math.max(0, Math.min(100, parseInt(els.textPosX.value, 10)));
    clip.textY = Math.max(0, Math.min(100, parseInt(els.textPosY.value, 10)));
    els.textSizeVal.textContent = `${clip.fontSize}%`;
    els.textPosXVal.textContent = `${clip.textX}%`;
    els.textPosYVal.textContent = `${clip.textY}%`;
    renderTimeline();
    syncProgram(true);
  }
  function closeTextModal() { els.textModal.hidden = true; state.textClipId = null; }

  /* ---- track colour menu ---- */
  function openTrackMenu(track, x, y) {
    closeMenus();
    state.menuTrackId = track.id;
    els.trackSwatches.innerHTML = "";
    TRACK_COLORS.forEach((col) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "ve-swatch" + (col.toLowerCase() === String(track.color).toLowerCase() ? " active" : "");
      b.style.background = col;
      b.title = col;
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        track.color = col;
        closeMenus();
        renderTimeline();
      });
      els.trackSwatches.appendChild(b);
    });
    els.trackColorInput.value = /^#[0-9a-f]{6}$/i.test(track.color) ? track.color : "#3b82f6";
    els.trackColorInput.oninput = () => { track.color = els.trackColorInput.value; renderTimeline(); };
    placeMenu(els.trackMenu, x, y);
    attachMenuClose();
  }

  /* ---- track context menu (add / delete / colour) ---- */
  function openTrackContextMenu(track, x, y) {
    closeMenus();
    state.ctxTrackId = track.id;
    state._menuX = x; state._menuY = y;
    const delBtn = els.trackCtxMenu.querySelector('[data-vetrack-action="delete"]');
    if (delBtn) {
      const sameType = state.tracks.filter((t) => t.type === track.type).length;
      delBtn.disabled = sameType <= 1;
      delBtn.textContent = `Delete ${track.type} track`;
    }
    placeMenu(els.trackCtxMenu, x, y);
    attachMenuClose();
  }
  els.trackCtxMenu.addEventListener("click", (e) => {
    const action = e.target.dataset.vetrackAction;
    if (!action) return;
    const track = state.tracks.find((t) => t.id === state.ctxTrackId);
    const mx = state._menuX, my = state._menuY;
    closeMenus();
    if (action === "add-video") { addTrack("video"); }
    else if (action === "add-audio") { addTrack("audio"); }
    else if (action === "add-solid") {
      // Add a colour solid at the playhead on this (video) track, then let the
      // user pick its colour via the block-colour menu.
      const t = (track && track.type === "video") ? track : firstVideoTrack();
      const clip = addSolidClip(t.id, state.playhead, "#888888");
      if (clip) openBlockMenu(clip, t, mx, my);
      return;
    }
    else if (action === "color") { if (track) openTrackMenu(track, mx, my); return; }
    else if (action === "delete") { if (track) deleteTrack(track); }
  });

  /* ---- block (clip) colour menu (A3) ---- */
  function openBlockMenu(clip, track, x, y) {
    closeMenus();
    state.blockClipId = clip.id;
    const current = clip.color || track.color;
    els.blockSwatches.innerHTML = "";
    TRACK_COLORS.forEach((col) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "ve-swatch" + (col.toLowerCase() === String(current).toLowerCase() ? " active" : "");
      b.style.background = col;
      b.title = col;
      b.addEventListener("click", (ev) => {
        ev.stopPropagation();
        clip.color = col;
        closeMenus();
        renderTimeline();
      });
      els.blockSwatches.appendChild(b);
    });
    els.blockColorInput.value = /^#[0-9a-f]{6}$/i.test(current) ? current : "#3b82f6";
    els.blockColorInput.oninput = () => { clip.color = els.blockColorInput.value; renderTimeline(); };
    els.blockReset.onclick = (ev) => { ev.stopPropagation(); clip.color = null; closeMenus(); renderTimeline(); };
    placeMenu(els.blockMenu, x || 0, y || 0);
    attachMenuClose();
  }

  /* ---- opacity popup (T button) ---- */
  function openOpacityPopup(clip, x, y) {
    closeMenus();
    state.opacityClipId = clip.id;
    if (clip.opacity == null) clip.opacity = 1;
    els.opacityRange.value = String(Math.round(clip.opacity * 100));
    els.opacityValue.textContent = `${Math.round(clip.opacity * 100)}%`;
    els.opacityRange.oninput = () => {
      const v = Math.max(0, Math.min(100, parseInt(els.opacityRange.value, 10) || 0));
      clip.opacity = v / 100;
      els.opacityValue.textContent = `${v}%`;
      renderTimeline();
      syncProgram(true);
    };
    wireAnim(clip, "opacity", {
      check: els.opacityAnim, row: els.opacityAnimRow, interp: els.opacityInterp,
      add: els.opacityAddKey, del: els.opacityDelKey, count: els.opacityKeys
    }, () => addScalarKey(clip, "opacity", () => clip.opacity == null ? 1 : clip.opacity));
    placeMenu(els.opacityPopup, x || 0, y || 0);
    attachMenuClose();
  }

  /* ---- size popup (S button) ---- */
  function openSizePopup(clip, x, y) {
    closeMenus();
    state.sizeClipId = clip.id;
    if (clip.scale == null) clip.scale = 1;
    els.sizeRange.value = String(Math.round(clip.scale * 100));
    els.sizeValue.textContent = `${Math.round(clip.scale * 100)}%`;
    els.sizeRange.oninput = () => {
      const v = Math.max(50, Math.min(200, parseInt(els.sizeRange.value, 10) || 100));
      clip.scale = v / 100;
      els.sizeValue.textContent = `${v}%`;
      renderTimeline();
      syncProgram(true);
    };
    wireAnim(clip, "scale", {
      check: els.sizeAnim, row: els.sizeAnimRow, interp: els.sizeInterp,
      add: els.sizeAddKey, del: els.sizeDelKey, count: els.sizeKeys
    }, () => addScalarKey(clip, "scale", () => clip.scale == null ? 1 : clip.scale));
    placeMenu(els.sizePopup, x || 0, y || 0);
    attachMenuClose();
  }

  /* ---- Effects deck (modal) + copy/paste ---- */
  let effectsClipboard = null;
  const EFFECT_KEYS = ["colorCorrection", "wiggle", "noise"];
  function effectCount(obj) { return EFFECT_KEYS.filter((k) => obj && obj[k] && obj[k].enabled).length; }

  function openEffectsDeck(clip) {
    state.effectsClipId = clip.id;
    clip.effects = normEffects(clip.effects);
    renderEffectsDeck(clip);
    els.effectsModal.hidden = false;
  }
  function closeEffectsDeck() {
    els.effectsModal.hidden = true;
    state.effectsClipId = null;
  }
  function effectsPreviewRefresh() {
    renderTimeline();      // refresh fx badge + thumbnail
    syncProgram(true);     // refresh Program filter/transform/noise
  }
  // Bind one slider: writes value into clip.effects[group][prop] live.
  function bindEffectSlider(input, valEl, clip, group, prop, fmt) {
    input.oninput = () => {
      const v = parseFloat(input.value);
      clip.effects[group][prop] = v;
      if (valEl) valEl.textContent = fmt ? fmt(v) : String(v);
      effectsPreviewRefresh();
    };
  }
  function renderEffectsDeck(clip) {
    const fx = clip.effects;
    // checkboxes (enabled = selected for copy)
    els.fxCcEnable.checked = fx.colorCorrection.enabled;
    els.fxWiggleEnable.checked = fx.wiggle.enabled;
    els.fxNoiseEnable.checked = fx.noise.enabled;
    // colour correction
    els.fxHue.value = fx.colorCorrection.hue;       els.fxHueVal.textContent = `${fx.colorCorrection.hue}°`;
    els.fxSat.value = fx.colorCorrection.sat;       els.fxSatVal.textContent = `${fx.colorCorrection.sat}%`;
    els.fxBright.value = fx.colorCorrection.bright; els.fxBrightVal.textContent = `${fx.colorCorrection.bright}%`;
    els.fxGamma.value = fx.colorCorrection.gamma;   els.fxGammaVal.textContent = (+fx.colorCorrection.gamma).toFixed(2);
    // wiggle
    els.fxFreq.value = fx.wiggle.freq;              els.fxFreqVal.textContent = `${fx.wiggle.freq} Hz`;
    els.fxAmp.value = fx.wiggle.amp;                els.fxAmpVal.textContent = `${fx.wiggle.amp} px`;
    // noise
    els.fxNoiseInt.value = fx.noise.intensity;      els.fxNoiseIntVal.textContent = `${fx.noise.intensity}%`;
    els.fxGrain.value = fx.noise.grainSize;         els.fxGrainVal.textContent = String(fx.noise.grainSize);

    // wire checkboxes
    els.fxCcEnable.onchange = () => { fx.colorCorrection.enabled = els.fxCcEnable.checked; effectsPreviewRefresh(); };
    els.fxWiggleEnable.onchange = () => { fx.wiggle.enabled = els.fxWiggleEnable.checked; effectsPreviewRefresh(); };
    els.fxNoiseEnable.onchange = () => { fx.noise.enabled = els.fxNoiseEnable.checked; effectsPreviewRefresh(); };
    // wire sliders
    bindEffectSlider(els.fxHue, els.fxHueVal, clip, "colorCorrection", "hue", (v) => `${v}°`);
    bindEffectSlider(els.fxSat, els.fxSatVal, clip, "colorCorrection", "sat", (v) => `${v}%`);
    bindEffectSlider(els.fxBright, els.fxBrightVal, clip, "colorCorrection", "bright", (v) => `${v}%`);
    bindEffectSlider(els.fxGamma, els.fxGammaVal, clip, "colorCorrection", "gamma", (v) => v.toFixed(2));
    bindEffectSlider(els.fxFreq, els.fxFreqVal, clip, "wiggle", "freq", (v) => `${v} Hz`);
    bindEffectSlider(els.fxAmp, els.fxAmpVal, clip, "wiggle", "amp", (v) => `${v} px`);
    bindEffectSlider(els.fxNoiseInt, els.fxNoiseIntVal, clip, "noise", "intensity", (v) => `${v}%`);
    bindEffectSlider(els.fxGrain, els.fxGrainVal, clip, "noise", "grainSize", (v) => String(v));
    // Animate (keyframe) controls per filter — captures that filter's params at the playhead.
    wireAnim(clip, "colorCorrection", {
      check: els.ccAnim, row: els.ccAnimRow, interp: els.ccInterp, add: els.ccAddKey, del: els.ccDelKey, count: els.ccKeys
    }, () => addParamsKey(clip, "colorCorrection", () => ({ hue: +fx.colorCorrection.hue, sat: +fx.colorCorrection.sat, bright: +fx.colorCorrection.bright, gamma: +fx.colorCorrection.gamma })));
    wireAnim(clip, "wiggle", {
      check: els.wgAnim, row: els.wgAnimRow, interp: els.wgInterp, add: els.wgAddKey, del: els.wgDelKey, count: els.wgKeys
    }, () => addParamsKey(clip, "wiggle", () => ({ freq: +fx.wiggle.freq, amp: +fx.wiggle.amp })));
    wireAnim(clip, "noise", {
      check: els.nsAnim, row: els.nsAnimRow, interp: els.nsInterp, add: els.nsAddKey, del: els.nsDelKey, count: els.nsKeys
    }, () => addParamsKey(clip, "noise", () => ({ intensity: +fx.noise.intensity, grainSize: +fx.noise.grainSize })));
    updateEffectsClipboardUi();
  }
  function updateEffectsClipboardUi() {
    const n = effectsClipboard ? Object.keys(effectsClipboard).length : 0;
    els.fxPaste.disabled = !n;
    els.fxClipboardInfo.textContent = n ? `Clipboard: ${n} effect(s)` : "Clipboard empty";
  }
  function copyEffects() {
    const found = getClip(state.effectsClipId);
    if (!found) return;
    const fx = normEffects(found.clip.effects);
    const clip = {};
    EFFECT_KEYS.forEach((k) => { if (fx[k].enabled) clip[k] = JSON.parse(JSON.stringify(fx[k])); });
    if (!Object.keys(clip).length) { els.status.textContent = "Tick an effect to copy"; return; }
    effectsClipboard = clip;
    updateEffectsClipboardUi();
    els.status.textContent = `Copied ${Object.keys(clip).length} effect(s)`;
  }
  function pasteEffects() {
    const found = getClip(state.effectsClipId);
    if (!found || !effectsClipboard) return;
    found.clip.effects = normEffects(found.clip.effects);
    // Overwrite copied effects (params + enabled); leave others intact.
    Object.keys(effectsClipboard).forEach((k) => {
      found.clip.effects[k] = JSON.parse(JSON.stringify(effectsClipboard[k]));
      found.clip.effects[k].enabled = true;
    });
    renderEffectsDeck(found.clip);
    effectsPreviewRefresh();
    els.status.textContent = "Effects pasted";
  }

  function removeClipById(id) {
    state.tracks.forEach((t) => { t.clips = t.clips.filter((c) => c.id !== id); });
  }

  /* ---- selection + delete ---- */
  function selectClip(id) {
    if (state.selectedClipId === id) return;
    state.selectedClipId = id;
    if (id) { state.binSelectedId = null; renderBin(); }  // clip + bin selection are exclusive
    renderTimeline();
  }
  function deleteSelectedClip() {
    const id = state.selectedClipId;
    if (!id) return;
    const found = getClip(id);
    if (!found) { state.selectedClipId = null; return; }
    found.track.clips = found.track.clips.filter((c) => c.id !== id);
    if (found.clip.linkedAudioClipId) removeClipById(found.clip.linkedAudioClipId);
    state.selectedClipId = null;
    renderTimeline();
    syncProgram(true);
    els.status.textContent = "Clip deleted";
  }

  /* ---- copy / paste / duplicate clips ---- */
  let clipClipboard = null;
  function trackTypeForClip(clip) { return clip.kind === "audio" ? "audio" : "video"; }
  function copySelectedClip() {
    const f = getClip(state.selectedClipId);
    if (!f) return;
    clipClipboard = { tmpl: cloneClip(f.clip), trackType: trackTypeForClip(f.clip) };
    els.status.textContent = "Clip copied";
  }
  function pasteClipAtPlayhead() {
    if (!clipClipboard) return;
    let track = null;
    const sel = getClip(state.selectedClipId);
    if (sel && sel.track.type === clipClipboard.trackType) track = sel.track;
    if (!track) track = state.tracks.find((t) => t.type === clipClipboard.trackType);
    if (!track) track = addTrack(clipClipboard.trackType);
    const clip = cloneClip(clipClipboard.tmpl, { start: Math.max(0, state.playhead) });
    track.clips.push(clip);
    selectClip(clip.id);
    renderTimeline();
    syncProgram(true);
    els.status.textContent = "Clip pasted at playhead";
  }
  function duplicateClip(clip, track) {
    const copy = cloneClip(clip, { start: clip.start + clipTimelineDur(clip) });
    track.clips.push(copy);
    selectClip(copy.id);
    renderTimeline();
    els.status.textContent = "Clip duplicated";
  }

  /* ---- fullscreen ---- */
  function toggleFullscreen() {
    const el = els.app;
    if (!document.fullscreenElement) {
      if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }

  function toggleLinkAudio(clip) {
    if (clip.kind !== "video") return;
    if (clip.linked) {
      let audioTrack = state.tracks.find((t) => t.type === "audio");
      if (!audioTrack) audioTrack = addTrack("audio");
      const audioClip = {
        id: nextId("c"), mediaId: clip.mediaId, mediaName: clip.mediaName, kind: "audio",
        start: clip.start, inPoint: clip.inPoint, outPoint: clip.outPoint,
        speed: clip.speed, fadeIn: 0, fadeOut: 0, linked: false, linkedAudioClipId: null, missing: clip.missing
      };
      audioTrack.clips.push(audioClip);
      clip.linked = false;
      clip.linkedAudioClipId = audioClip.id;
    } else {
      if (clip.linkedAudioClipId) removeClipById(clip.linkedAudioClipId);
      clip.linkedAudioClipId = null;
      clip.linked = true;
    }
  }

  /* ---- Speed / Duration (real in-app modal — window.prompt is a no-op in Electron) ---- */
  const SPEED_MIN = 0.0625, SPEED_MAX = 16;
  function clampSpeed(s) { return Math.max(SPEED_MIN, Math.min(SPEED_MAX, s)); }

  function openSpeedModal(clip) {
    if (!clip) return;
    state.speedClipId = clip.id;
    const srcDur = Math.max(0.001, clip.outPoint - clip.inPoint); // trimmed source seconds
    state._speedSrcDur = srcDur;
    const speed = clip.speed || 1;
    els.speedFactor.value = (+speed.toFixed(4)).toString();
    els.speedDuration.value = (srcDur / speed).toFixed(2);
    updateSpeedHint();
    els.speedModal.hidden = false;
    setTimeout(() => { try { els.speedFactor.focus(); els.speedFactor.select(); } catch (e) {} }, 0);
  }
  function closeSpeedModal() {
    els.speedModal.hidden = true;
    state.speedClipId = null;
  }
  function updateSpeedHint() {
    const srcDur = state._speedSrcDur || 0;
    const s = parseFloat(els.speedFactor.value);
    const timelineDur = (s > 0) ? srcDur / s : 0;
    els.speedHint.textContent =
      `Source trim: ${srcDur.toFixed(2)}s · timeline length at ${(s > 0 ? +s.toFixed(3) : "—")}× = ${timelineDur ? timelineDur.toFixed(2) : "—"}s. ` +
      `(2× → half length & double rate, 0.5× → double length & half rate.)`;
  }
  function applySpeedFromModal() {
    const found = getClip(state.speedClipId);
    if (!found) { closeSpeedModal(); return; }
    let s = parseFloat(els.speedFactor.value);
    if (!(s > 0)) {
      const d = parseFloat(els.speedDuration.value);
      if (d > 0 && state._speedSrcDur) s = state._speedSrcDur / d;
    }
    if (!(s > 0)) { els.speedHint.textContent = "Enter a speed > 0 or a target duration > 0."; return; }
    found.clip.speed = clampSpeed(s);
    closeSpeedModal();
    renderTimeline();        // recomputes clip width from (out-in)/speed
    syncProgram(true);       // reflect new playbackRate / frame immediately
    els.status.textContent = `Clip speed ${(+found.clip.speed.toFixed(3))}× — timeline length ${clipTimelineDur(found.clip).toFixed(2)}s`;
  }

  /* ---- playhead scrub on ruler ---- */
  els.ruler.addEventListener("mousedown", (e) => {
    const rect = els.ruler.getBoundingClientRect();
    const scrub = (clientX) => {
      state.playhead = Math.max(0, (clientX - rect.left) / state.pps);
      positionPlayhead();
      syncProgram(true);
    };
    scrub(e.clientX);
    const move = (ev) => scrub(ev.clientX);
    const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  });

  /* ---- playback / program monitor ---- */
  // Topmost (first in zone order) clip of a kind under the playhead, with track.
  function clipAtPlayhead(type) {
    const tracks = state.tracks.filter((t) => t.type === type);
    for (const t of tracks) {
      if (type === "video" && t.hidden) continue; // hidden video tracks aren't shown
      for (const c of t.clips) {
        if (c.missing) continue;
        const end = c.start + clipTimelineDur(c);
        if (state.playhead >= c.start && state.playhead < end) return { clip: c, track: t };
      }
    }
    return null;
  }
  // Topmost visible video-track clip matching a predicate (skips hidden tracks).
  function topVisualAtPlayhead(predicate) {
    for (const t of state.tracks) {
      if (t.type !== "video" || t.hidden) continue;
      for (const c of t.clips) {
        if (c.missing) continue;
        const end = c.start + clipTimelineDur(c);
        if (state.playhead >= c.start && state.playhead < end && predicate(c)) return { clip: c, track: t };
      }
    }
    return null;
  }
  function baseVisualAtPlayhead() { return topVisualAtPlayhead((c) => clipType(c) !== "text"); }
  function textClipAtPlayhead() { return topVisualAtPlayhead((c) => clipType(c) === "text"); }

  function fadeGain(clip) {
    const dur = clipTimelineDur(clip);
    const local = state.playhead - clip.start;
    let g = 1;
    if (clip.fadeIn > 0 && local < clip.fadeIn) g = Math.min(g, local / clip.fadeIn);
    if (clip.fadeOut > 0 && local > dur - clip.fadeOut) g = Math.min(g, (dur - local) / clip.fadeOut);
    return Math.max(0, Math.min(1, g));
  }

  // First clip (any type) under the playhead on a given track.
  function clipAtTrackPlayhead(t) {
    for (const c of t.clips) {
      if (c.missing) continue;
      const end = c.start + clipTimelineDur(c);
      if (state.playhead >= c.start && state.playhead < end) return c;
    }
    return null;
  }

  /* ---- media element pool: one <video>/<audio> per track (compositing + mixing) ---- */
  const pool = new Map();
  function poolEl(track) {
    let p = pool.get(track.id);
    if (!p) {
      const el = document.createElement(track.type === "audio" ? "audio" : "video");
      el.playsInline = true; el.preload = "auto"; el.muted = false;
      el.style.display = "none";
      document.body.appendChild(el);
      p = { el }; pool.set(track.id, p);
    }
    return p;
  }

  /* ---- aspect ratio ---- */
  const ASPECTS = [
    { key: "auto", label: "Auto", r: null },
    { key: "21:9", label: "21:9", r: 21 / 9 },
    { key: "16:9", label: "16:9", r: 16 / 9 },
    { key: "3:2", label: "3:2", r: 3 / 2 },
    { key: "4:3", label: "4:3", r: 4 / 3 },
    { key: "5:4", label: "5:4", r: 5 / 4 },
    { key: "1:1", label: "1:1", r: 1 },
    { key: "4:5", label: "4:5", r: 4 / 5 },
    { key: "3:4", label: "3:4", r: 3 / 4 },
    { key: "2:3", label: "2:3", r: 2 / 3 },
    { key: "9:16", label: "9:16", r: 9 / 16 }
  ];
  function aspectDef() { return ASPECTS.find((a) => a.key === state.aspect) || ASPECTS[0]; }
  function mainMediaSize() {
    for (const m of state.media.values()) {
      if (m.kind === "video" && m.el && m.el.videoWidth) return { w: m.el.videoWidth, h: m.el.videoHeight };
    }
    return { w: 1280, h: 720 };
  }
  function programRatio() {
    const a = aspectDef();
    if (a.r) return a.r;
    const s = mainMediaSize();
    return s.h ? s.w / s.h : 16 / 9;
  }
  function exportDims() {
    const a = aspectDef();
    if (!a.r) { const s = mainMediaSize(); return { w: s.w, h: s.h }; }
    if (a.r >= 1) { const w = 1280, h = Math.max(2, Math.round(w / a.r / 2) * 2); return { w, h }; }
    const h = 1280, w = Math.max(2, Math.round(h * a.r / 2) * 2); return { w, h };
  }

  /* ---- sync every track's media element to the playhead ---- */
  function syncAllMedia(force) {
    state.tracks.forEach((t) => {
      const c = clipAtTrackPlayhead(t);
      const clip = (c && clipType(c) === "media") ? c : null;
      const existing = pool.get(t.id);
      if (!clip) { if (existing) { try { existing.el.pause(); } catch (e) {} existing.el.removeAttribute("data-media-id"); } return; }
      const media = state.media.get(clip.mediaId);
      if (!media) return;
      const el = poolEl(t).el;
      if (el.dataset.mediaId !== clip.mediaId) { el.src = media.url; el.dataset.mediaId = clip.mediaId; }
      const local = state.playhead - clip.start;
      const srcT = clip.inPoint + local * (clip.speed || 1);
      const threshold = force ? 0.012 : 0.3;
      if (Math.abs(el.currentTime - srcT) > threshold) { try { el.currentTime = srcT; } catch (e) {} }
      el.playbackRate = clampSpeed(clip.speed || 1);
      const g = fadeGain(clip);
      if (t.type === "video") { const audible = clip.linked && !t.hidden; el.muted = !audible; el.volume = audible ? g : 0; }
      else { el.muted = !!t.muted; el.volume = t.muted ? 0 : g; }
      if (state.playing || state.exporting) { if (el.paused) el.play().catch(() => {}); }
      else if (!el.paused) el.pause();
    });
  }

  /* ---- composite all visible video tracks bottom→top onto a 2D context ---- */
  function drawClip(ctx, cw, ch, t, clip) {
    const ct = clipType(clip);
    const alpha = fadeGain(clip) * Math.max(0, Math.min(1, effOpacity(clip)));
    if (alpha <= 0) return;
    if (ct === "media") {
      const el = poolEl(t).el;
      if (el.readyState < 2 || !el.videoWidth) return;
      const sc = Math.max(0.05, effScale(clip));                 // per-clip Size (S)
      const fit = Math.min(cw / el.videoWidth, ch / el.videoHeight) * sc;
      const dw = el.videoWidth * fit, dh = el.videoHeight * fit;
      const wo = wiggleOffset(clip);
      ctx.globalAlpha = alpha;
      ctx.filter = colorFilter(clip) || "none";
      ctx.drawImage(el, (cw - dw) / 2 + wo.x, (ch - dh) / 2 + wo.y, dw, dh);
      ctx.filter = "none";
      ctx.globalAlpha = 1;
      const n = effNoise(clip);
      if (n && n.enabled && n.intensity > 0) {
        const grain = Math.max(1, n.grainSize || 2);
        const pool = noisePool();
        const tile = pool[_noiseFrame % pool.length];          // cycle tiles each frame
        const ox = (_noiseFrame * 37) % NOISE_SIZE, oy = (_noiseFrame * 53) % NOISE_SIZE; // moving origin
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, n.intensity / 100));
        ctx.scale(grain, grain);
        const pat = ctx.createPattern(tile, "repeat");
        if (pat && pat.setTransform) { try { pat.setTransform(new DOMMatrix([1, 0, 0, 1, ox, oy])); } catch (e) {} }
        ctx.fillStyle = pat;
        ctx.fillRect(0, 0, cw / grain, ch / grain);
        ctx.restore();
        ctx.globalAlpha = 1;
      }
    } else if (ct === "solid") {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = clip.color || "#888888";
      ctx.fillRect(0, 0, cw, ch);
      ctx.globalAlpha = 1;
    } else if (ct === "text") {
      const px = Math.max(1, (clip.fontSize || 12) / 100 * ch * Math.max(0.05, effScale(clip)));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = clip.color || "#ffffff";
      ctx.font = `${clip.bold ? "800" : "400"} ${px}px ${clip.font || fontStack(clip.fontKey)}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const cx = (clip.textX == null ? 50 : clip.textX) / 100 * cw;
      const cy = (clip.textY == null ? 50 : clip.textY) / 100 * ch;
      const lines = String(clip.text || "").split("\n");
      const lh = px * 1.15;
      const y0 = cy - (lines.length - 1) * lh / 2;
      lines.forEach((ln, i) => ctx.fillText(ln, cx, y0 + i * lh));
      ctx.globalAlpha = 1;
    }
  }
  function composeProgram(ctx, cw, ch, bg) {
    _noiseFrame++;                 // advance film-grain animation each frame (preview + export)
    // In the Program preview the out-of-frame area (letterbox/pillarbox) is GREY so you
    // see exactly how the rush falls into the chosen format (A3); export keeps it black.
    ctx.fillStyle = bg || "#2c2c30";
    ctx.fillRect(0, 0, cw, ch);
    const vids = state.tracks.filter((t) => t.type === "video" && !t.hidden);
    // Draw bottom track first, top track last → upper opacity reveals lower track.
    for (let i = vids.length - 1; i >= 0; i--) {
      const clip = clipAtTrackPlayhead(vids[i]);
      if (clip) drawClip(ctx, cw, ch, vids[i], clip);
    }
  }
  function anyVisualAtPlayhead() {
    return state.tracks.some((t) => t.type === "video" && !t.hidden && clipAtTrackPlayhead(t));
  }
  function sizeProgramCanvas() {
    const cv = els.programCanvas;
    if (!cv) return null;
    const r = programRatio();
    let w, h;
    if (r >= 1) { w = 640; h = Math.max(2, Math.round(640 / r)); }
    else { h = 640; w = Math.max(2, Math.round(640 * r)); }
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    cv.style.aspectRatio = `${w} / ${h}`;
    return cv.getContext("2d");
  }
  // True when every visible media clip under the playhead has a decoded frame.
  function programReady() {
    return state.tracks.every((t) => {
      if (t.type !== "video" || t.hidden) return true;
      const c = clipAtTrackPlayhead(t);
      if (!c || clipType(c) !== "media") return true;
      const p = pool.get(t.id);
      return p && p.el.readyState >= 2 && p.el.videoWidth > 0;
    });
  }
  function drawProgram() {
    const ctx = sizeProgramCanvas();
    if (!ctx) return;
    // When paused, don't repaint until the just-seeked frame is decoded — this keeps
    // the previous frame on screen instead of flashing black during arrow nav (item 5).
    if (!state.playing && !state.exporting && !programReady()) return;
    composeProgram(ctx, els.programCanvas.width, els.programCanvas.height);
    if (els.previewEmpty) els.previewEmpty.hidden = anyVisualAtPlayhead();
  }

  // Back-compat wrapper used across the editor: re-sync media + redraw the canvas.
  function syncProgram(force) { syncAllMedia(force); drawProgram(); }

  let lastTs = 0, programRaf = null;
  // Playback bounds: the IN/OUT work region if defined, else the whole montage.
  function loopBounds() {
    const reg = workRegion();
    if (reg) return reg;
    return { start: 0, end: contentEnd() };
  }
  // Single continuous loop while the Editor is visible: advances the playhead
  // when playing, then re-syncs media and redraws the composite Program canvas.
  // The Editor is visible only when its panel has a layout box (its Video Director
  // wrapper is display:block). offsetParent === null ⇒ hidden by an ancestor.
  // A fullscreen element has no offsetParent, so also accept that + getClientRects.
  function editorVisible() {
    return !els.app.hidden && (document.fullscreenElement === els.app
      || els.app.offsetParent !== null || els.app.getClientRects().length > 0);
  }
  function programLoop(ts) {
    programRaf = requestAnimationFrame(programLoop);
    if (!editorVisible() || state.exporting) { if (state.playing) stop(); lastTs = 0; return; }
    if (state.playing) {
      if (!lastTs) lastTs = ts;
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;
      state.playhead += dt;
      const b = state.loop ? loopBounds() : { start: 0, end: contentEnd() };
      if (b.end > 0 && state.playhead >= b.end) {
        if (state.loop && b.end > b.start) state.playhead = b.start;
        else { state.playhead = b.end; stop(); }
      }
      positionPlayhead();
    } else {
      lastTs = 0;
    }
    syncAllMedia(false);
    drawProgram();
  }
  function startProgramLoop() { if (!programRaf) programRaf = requestAnimationFrame(programLoop); }

  function setPlayIcon(playing) {
    const pi = els.playPause.querySelector(".ve-icon-play");
    const pa = els.playPause.querySelector(".ve-icon-pause");
    if (pi) pi.hidden = playing;
    if (pa) pa.hidden = !playing;
    els.playPause.setAttribute("aria-label", playing ? "Pause" : "Play");
  }
  function play() {
    if (contentEnd() <= 0) return;
    if (state.loop) {
      const b = loopBounds();
      if (b.end > b.start && (state.playhead < b.start || state.playhead >= b.end)) {
        state.playhead = b.start;
        positionPlayhead();
      }
    }
    state.playing = true;
    setPlayIcon(true);
    lastTs = 0;
  }
  function stop() {
    state.playing = false;
    setPlayIcon(false);
    lastTs = 0;
    pool.forEach((p) => { try { p.el.pause(); } catch (e) {} });
  }
  function togglePlay() { state.playing ? stop() : play(); }
  function toggleLoop() {
    state.loop = !state.loop;
    els.loop.classList.toggle("active", state.loop);
    els.loop.setAttribute("aria-pressed", state.loop ? "true" : "false");
    const reg = workRegion();
    els.status.textContent = state.loop
      ? (reg ? "Loop ON (IN→OUT region)" : "Loop ON (whole montage)")
      : "Loop OFF";
  }

  function seekTo(sec, force) {
    state.playhead = Math.max(0, sec);
    positionPlayhead();
    syncProgram(force);
  }
  // Snap to the frame grid so repeated steps go exactly N → N±1 (no drift).
  function stepFrame(dir, big) {
    if (state.playing) stop();
    const stepFrames = (big ? 10 : 1) * dir;
    const target = Math.max(0, frameOf(state.playhead) + stepFrames) / FPS;
    seekTo(target, true);
  }

  /* ---- timeline / block markers (item 5) ---- */
  const MARKER_COLORS = ["#fbbf24", "#ef4444", "#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#ffffff"];
  function markerTime(mk) {
    if (mk.clipId) { const f = getClip(mk.clipId); if (f) return f.clip.start + (mk.offset || 0); }
    return mk.t || 0;
  }
  function renderMarkers() {
    if (!els.markers) return;
    els.markers.innerHTML = "";
    state.markers.forEach((mk) => {
      const t = markerTime(mk);
      const el = document.createElement("div");
      el.className = "ve-marker-flag";
      el.style.left = `${t * state.pps}px`;
      el.style.background = mk.color || "#fbbf24";
      el.dataset.markerId = mk.id;
      el.title = "Marker — drag to move, right-click for colour / delete";
      els.markers.appendChild(el);
    });
  }
  function addMarkerAtPlayhead() {
    const sel = state.selectedClipId ? getClip(state.selectedClipId) : null;
    const mk = { id: nextId("mk"), color: "#fbbf24" };
    if (sel) { mk.clipId = sel.clip.id; mk.offset = state.playhead - sel.clip.start; }
    else { mk.t = state.playhead; }
    state.markers.push(mk);
    renderMarkers();
    els.status.textContent = sel ? "Marker added on clip" : "Marker added";
  }
  function openMarkerMenu(mk, x, y) {
    closeMenus();
    state.markerMenuId = mk.id;
    els.markerSwatches.innerHTML = "";
    MARKER_COLORS.forEach((col) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "ve-swatch" + (col.toLowerCase() === String(mk.color).toLowerCase() ? " active" : "");
      b.style.background = col;
      b.addEventListener("click", (e) => { e.stopPropagation(); mk.color = col; closeMenus(); renderMarkers(); });
      els.markerSwatches.appendChild(b);
    });
    els.markerDelete.onclick = (e) => {
      e.stopPropagation();
      state.markers = state.markers.filter((m) => m.id !== mk.id);
      closeMenus(); renderMarkers();
    };
    placeMenu(els.markerMenu, x, y);
    attachMenuClose();
  }
  // Marker drag + right-click (delegated on the markers layer).
  if (els.markers) {
    els.markers.addEventListener("mousedown", (e) => {
      const flag = e.target.closest(".ve-marker-flag");
      if (!flag) return;
      e.preventDefault(); e.stopPropagation();
      const mk = state.markers.find((m) => m.id === flag.dataset.markerId);
      if (!mk) return;
      const rect = els.ruler.getBoundingClientRect();
      const move = (ev) => {
        const t = Math.max(0, (ev.clientX - rect.left) / state.pps);
        if (mk.clipId) { const f = getClip(mk.clipId); mk.offset = f ? t - f.clip.start : 0; }
        else mk.t = t;
        renderMarkers();
      };
      const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
    });
    els.markers.addEventListener("contextmenu", (e) => {
      const flag = e.target.closest(".ve-marker-flag");
      if (!flag) return;
      e.preventDefault(); e.stopPropagation();
      const mk = state.markers.find((m) => m.id === flag.dataset.markerId);
      if (mk) openMarkerMenu(mk, e.clientX, e.clientY);
    });
  }
  // Right-click the ruler places a marker at the playhead.
  els.ruler.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    addMarkerAtPlayhead();
  });

  /* ---- aspect ratio dropdown (item 6) ---- */
  function aspectIconDims(r) {
    const rr = r || (16 / 9);
    if (rr >= 1) return { w: 22, h: Math.max(4, Math.round(22 / rr)) };
    return { w: Math.max(4, Math.round(22 * rr)), h: 22 };
  }
  function updateAspectBtn() {
    if (els.aspectBtn) els.aspectBtn.textContent = `▤ ${aspectDef().label}`;
  }
  function aspectOptBtn(a) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "ve-aspect-opt" + (a.key === state.aspect ? " active" : "");
    const d = aspectIconDims(a.r);
    b.innerHTML = `<span class="ve-aspect-ico" style="width:${d.w}px;height:${d.h}px"></span><span>${a.label}</span>`;
    b.addEventListener("click", (e) => { e.stopPropagation(); setAspect(a.key); closeMenus(); });
    return b;
  }
  // 2-column popup: vertical formats left, horizontal right, 1:1 & Auto in the middle.
  function buildAspectMenu() {
    if (!els.aspectMenu) return;
    const verticals = ["9:16", "4:5", "3:4", "2:3"];
    const horizontals = ["16:9", "21:9", "3:2", "4:3", "5:4"];
    const get = (k) => ASPECTS.find((a) => a.key === k);
    els.aspectMenu.innerHTML = "";
    const grid = document.createElement("div"); grid.className = "ve-aspect-grid";
    const colV = document.createElement("div"); colV.className = "ve-aspect-col";
    const colMid = document.createElement("div"); colMid.className = "ve-aspect-col ve-aspect-mid";
    const colH = document.createElement("div"); colH.className = "ve-aspect-col";
    colV.innerHTML = `<div class="ve-aspect-head">Vertical</div>`;
    colH.innerHTML = `<div class="ve-aspect-head">Horizontal</div>`;
    colMid.innerHTML = `<div class="ve-aspect-head">Square / Auto</div>`;
    verticals.forEach((k) => colV.appendChild(aspectOptBtn(get(k))));
    horizontals.forEach((k) => colH.appendChild(aspectOptBtn(get(k))));
    colMid.appendChild(aspectOptBtn(get("1:1")));
    colMid.appendChild(aspectOptBtn(get("auto")));
    grid.appendChild(colV); grid.appendChild(colMid); grid.appendChild(colH);
    els.aspectMenu.appendChild(grid);
    updateAspectBtn();
  }
  function setAspect(key) {
    state.aspect = key;
    buildAspectMenu();
    drawProgram();
    els.status.textContent = `Format ${aspectDef().label}`;
  }
  function openAspectMenu(x, y) {
    closeMenus();
    buildAspectMenu();
    placeMenu(els.aspectMenu, x, y);
    attachMenuClose();
  }

  /* ---- resizable panes (item 2) ---- */
  function applyPaneHeights() {
    if (state.monitorsH && els.monitors) els.monitors.style.height = `${state.monitorsH}px`;
    if (state.timelineH && els.timeline) els.timeline.style.height = `${state.timelineH}px`;
  }
  function restorePaneHeights() {
    state.monitorsH = 300; // comfortable default so the monitor pane has a baseline height
    try {
      const m = parseInt(localStorage.getItem("veMonitorsH") || "", 10);
      const t = parseInt(localStorage.getItem("veTimelineH") || "", 10);
      if (m > 0) state.monitorsH = m;
      if (t > 0) state.timelineH = t;
    } catch (e) {}
    applyPaneHeights();
  }
  /* ---- monitors: mono/split + horizontal width split (A2/A4) ---- */
  function applyMonitorsLayout() {
    if (!els.monitors) return;
    els.monitors.classList.toggle("mono", state.monoMode);
    if (state.monoMode) {
      els.monitors.style.gridTemplateColumns = "minmax(0, 1fr)";
    } else {
      const left = Math.max(0.15, Math.min(0.85, state.monRatio || 0.5));
      els.monitors.style.gridTemplateColumns = `minmax(0, ${left}fr) 10px minmax(0, ${1 - left}fr)`;
    }
    if (els.splitToggle) {
      els.splitToggle.textContent = state.monoMode ? "Mono" : "Split";
      els.splitToggle.classList.toggle("active", !state.monoMode);
      els.splitToggle.setAttribute("aria-pressed", state.monoMode ? "false" : "true");
    }
    drawProgram();
  }
  function toggleMono() {
    state.monoMode = !state.monoMode;
    try { localStorage.setItem("veMonoMode", state.monoMode ? "1" : "0"); } catch (e) {}
    applyMonitorsLayout();
  }
  function attachMonitorWidthResize() {
    if (!els.monHandle) return;
    els.monHandle.addEventListener("mousedown", (e) => {
      if (state.monoMode) return;
      e.preventDefault();
      const rect = els.monitors.getBoundingClientRect();
      document.body.style.cursor = "col-resize";
      const move = (ev) => {
        const r = Math.max(0.15, Math.min(0.85, (ev.clientX - rect.left) / Math.max(1, rect.width)));
        state.monRatio = r;
        els.monitors.style.gridTemplateColumns = `minmax(0, ${r}fr) 10px minmax(0, ${1 - r}fr)`;
      };
      const up = () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
        document.body.style.cursor = "";
        try { localStorage.setItem("veMonRatio", String(state.monRatio)); } catch (e) {}
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
    });
  }
  function restoreMonitorsLayout() {
    try {
      state.monoMode = localStorage.getItem("veMonoMode") === "1";
      const r = parseFloat(localStorage.getItem("veMonRatio") || "");
      if (r > 0 && r < 1) state.monRatio = r;
    } catch (e) {}
    applyMonitorsLayout();
  }
  function attachPaneResize(handle, getEl, key, min) {
    if (!handle) return;
    handle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const el = getEl(); if (!el) return;
      const startY = e.clientY;
      const startH = el.getBoundingClientRect().height;
      document.body.style.cursor = "row-resize";
      const move = (ev) => { el.style.height = `${Math.max(min, startH + (ev.clientY - startY))}px`; };
      const up = () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
        document.body.style.cursor = "";
        try { localStorage.setItem(key, String(parseInt(el.style.height, 10) || 0)); } catch (e) {}
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
    });
  }

  /* ---- fullscreen (app + monitor) ---- */
  function toggleMonitorFullscreen() {
    const el = els.programMonitor;
    if (!el) return;
    if (!document.fullscreenElement) { if (el.requestFullscreen) el.requestFullscreen().catch(() => {}); }
    else if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
  }
  function syncFullscreenChecks() {
    const fsEl = document.fullscreenElement;
    if (els.fsApp) els.fsApp.checked = fsEl === els.app;
    if (els.fsMonitor) els.fsMonitor.checked = fsEl === els.programMonitor;
  }

  /* ---- Save / Load montage (JSON) ---- */
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  function saveMontage() {
    const data = {
      version: 2,
      pps: state.pps,
      playhead: state.playhead,
      media: Array.from(state.media.values()).map((m) => ({ id: m.id, name: m.name, kind: m.kind })),
      tracks: state.tracks.map((t) => ({
        type: t.type, color: t.color, muted: t.muted, hidden: !!t.hidden,
        clips: t.clips.map((c) => ({
          type: clipType(c), mediaName: c.mediaName, kind: c.kind, start: c.start, inPoint: c.inPoint,
          outPoint: c.outPoint, speed: c.speed, fadeIn: c.fadeIn, fadeOut: c.fadeOut,
          color: c.color || null, opacity: (c.opacity == null ? 1 : c.opacity),
          scale: (c.scale == null ? 1 : c.scale),
          effects: normEffects(c.effects), anim: c.anim || {}, linked: c.linked,
          text: c.text, font: c.font, fontKey: c.fontKey, fontSize: c.fontSize, bold: c.bold,
          textX: c.textX, textY: c.textY
        }))
      })),
      markIn: state.markIn,
      markOut: state.markOut,
      aspect: state.aspect,
      markers: state.markers.map((m) => ({ t: markerTime(m), color: m.color }))
    };
    downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), `montage-${stamp()}.json`);
    els.status.textContent = "Montage saved";
  }
  function loadMontage(file) {
    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try { data = JSON.parse(reader.result); } catch (e) { els.status.textContent = "Invalid montage JSON"; return; }
      if (!data || !Array.isArray(data.tracks)) { els.status.textContent = "Invalid montage JSON"; return; }
      // Match media by file name among what's currently imported.
      const byName = new Map();
      state.media.forEach((m) => { if (!byName.has(m.name)) byName.set(m.name, m); });
      resetExtentFloor();
      state.markIn = (typeof data.markIn === "number") ? data.markIn : null;
      state.markOut = (typeof data.markOut === "number") ? data.markOut : null;
      if (typeof data.aspect === "string" && ASPECTS.some((a) => a.key === data.aspect)) state.aspect = data.aspect;
      state.markers = Array.isArray(data.markers)
        ? data.markers.map((m) => ({ id: nextId("mk"), t: +m.t || 0, color: m.color || "#fbbf24" }))
        : [];
      state.tracks = [];
      let missingCount = 0;
      data.tracks.forEach((t) => {
        const track = { id: nextId("t"), type: t.type === "audio" ? "audio" : "video", color: t.color || nextColor(t.type), muted: !!t.muted, hidden: !!t.hidden, clips: [] };
        (t.clips || []).forEach((c) => {
          const ctype = (c.type === "solid" || c.type === "text") ? c.type : "media";
          const media = ctype === "media" ? byName.get(c.mediaName) : null;
          if (ctype === "media" && !media) missingCount++;
          track.clips.push({
            id: nextId("c"),
            type: ctype,
            mediaId: media ? media.id : null,
            mediaName: c.mediaName || (ctype === "text" ? "Text" : ctype === "solid" ? "Solid" : "clip"),
            kind: c.kind || track.type,
            start: +c.start || 0,
            inPoint: +c.inPoint || 0,
            outPoint: c.outPoint != null ? +c.outPoint : (media ? media.duration : 3),
            speed: +c.speed || 1,
            fadeIn: +c.fadeIn || 0,
            fadeOut: +c.fadeOut || 0,
            color: (typeof c.color === "string" && c.color) ? c.color : null,
            opacity: (c.opacity == null ? 1 : Math.max(0, Math.min(1, +c.opacity))),
            scale: (c.scale == null ? 1 : Math.max(0.05, +c.scale)),
            effects: normEffects(c.effects),
            anim: (c.anim && typeof c.anim === "object") ? c.anim : {},
            text: (typeof c.text === "string") ? c.text : (ctype === "text" ? "Text" : undefined),
            fontKey: c.fontKey || (ctype === "text" ? FONTS[0].key : undefined),
            font: c.font || (ctype === "text" ? fontStack(c.fontKey) : undefined),
            fontSize: (c.fontSize != null) ? +c.fontSize : (ctype === "text" ? 12 : undefined),
            bold: (c.bold != null) ? !!c.bold : (ctype === "text" ? true : undefined),
            textX: (c.textX != null) ? +c.textX : (ctype === "text" ? 50 : undefined),
            textY: (c.textY != null) ? +c.textY : (ctype === "text" ? 50 : undefined),
            linked: c.linked !== false && ctype === "media",
            linkedAudioClipId: null,
            missing: ctype === "media" ? !media : false
          });
        });
        state.tracks.push(track);
      });
      if (typeof data.pps === "number") { state.pps = Math.max(10, Math.min(400, data.pps)); els.zoom.value = state.pps; }
      state.playhead = +data.playhead || 0;
      buildAspectMenu();
      renderTimeline();
      syncProgram(true);
      els.status.textContent = missingCount ? `Montage loaded (${missingCount} missing media)` : "Montage loaded";
    };
    reader.readAsText(file);
  }

  /* ---- Export (real-time canvas + WebAudio + MediaRecorder) ---- */
  // Persistent WebAudio graph; each pool element is tapped once and routed to
  // both the speakers and a recording destination. (A media element can only be
  // tapped once, so we keep the graph alive for the session.)
  function ensureAudioGraph() {
    if (state.audioGraph) return state.audioGraph;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    const merger = ctx.createGain();
    merger.gain.value = 1;
    merger.connect(ctx.destination);
    const dest = ctx.createMediaStreamDestination();
    merger.connect(dest);
    state.audioGraph = { ctx, dest, merger, tapped: new Set() };
    return state.audioGraph;
  }
  function tapElement(el) {
    const g = ensureAudioGraph();
    if (!g || g.tapped.has(el)) return;
    try { const s = g.ctx.createMediaElementSource(el); s.connect(g.merger); g.tapped.add(el); } catch (e) {}
  }

  // Pick a recorder mime. MP4 first if requested (Chromium often supports
  // video/mp4;codecs=avc1 / h264); fall back to WebM with a notice (A5).
  function pickRecorderMime(format) {
    if (format === "mp4") {
      const mp4 = [
        "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
        "video/mp4;codecs=avc1.42E01E",
        "video/mp4;codecs=avc1,mp4a.40.2",
        "video/mp4;codecs=avc1",
        "video/mp4"
      ];
      const ok = mp4.find((t) => MediaRecorder.isTypeSupported(t));
      if (ok) return { mime: ok, ext: "mp4", fellBack: false };
    }
    const webm = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
    const w = webm.find((t) => MediaRecorder.isTypeSupported(t)) || "video/webm";
    return { mime: w, ext: "webm", fellBack: format === "mp4" };
  }

  function setExportStatus(msg) {
    if (els.exportStatus) els.exportStatus.textContent = msg;
    els.status.textContent = msg;
  }

  // opts: { format:'webm'|'mp4', region:bool }
  function exportMontage(opts) {
    opts = opts || {};
    if (state.exporting) return;
    if (typeof MediaRecorder === "undefined") { setExportStatus("Export not supported in this browser"); return; }
    const reg = opts.region ? workRegion() : null;
    const startSec = reg ? reg.start : 0;
    const endSec = reg ? reg.end : contentEnd();
    if (endSec <= startSec) { setExportStatus("Nothing to export"); return; }
    stop();

    // Export dimensions follow the chosen aspect ratio (Auto = main media size).
    const dims = exportDims();
    const cw = dims.w, ch = dims.h;
    const canvas = els.exportCanvas;
    canvas.width = cw;
    canvas.height = ch;
    const cctx = canvas.getContext("2d");

    // Ensure a media element + audio tap for every track so all audio is mixed.
    const graph = ensureAudioGraph();
    if (graph && graph.ctx.state === "suspended") graph.ctx.resume().catch(() => {});
    state.tracks.forEach((t) => { poolEl(t); if (graph) tapElement(pool.get(t.id).el); });

    const stream = canvas.captureStream(FPS);
    if (graph) graph.dest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));

    const picked = pickRecorderMime(opts.format || "webm");
    let rec;
    try { rec = new MediaRecorder(stream, { mimeType: picked.mime }); }
    catch (e) { setExportStatus("Export failed to start"); return; }
    if (picked.fellBack) setExportStatus("MP4 not supported by this browser — exporting WebM instead…");

    const blobType = picked.mime.split(";")[0];
    const chunks = [];
    rec.ondataavailable = (ev) => { if (ev.data && ev.data.size) chunks.push(ev.data); };
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: blobType });
      downloadBlob(blob, `montage-export-${stamp()}.${picked.ext}`);
      setExportStatus(`Export done (${picked.ext.toUpperCase()})`);
      els.exportBtn.disabled = false;
      els.exportStart.disabled = false;
    };

    state.exporting = true;
    state.playing = true;          // makes syncAllMedia keep the elements playing
    els.exportBtn.disabled = true;
    els.exportStart.disabled = true;
    state.playhead = startSec;
    positionPlayhead();
    rec.start();

    const span = endSec - startSec;
    let expLast = 0;
    function exportTick(ts) {
      if (!state.exporting) return;
      if (!expLast) expLast = ts;
      const dt = (ts - expLast) / 1000;
      expLast = ts;
      state.playhead += dt;
      syncAllMedia(false);
      composeProgram(cctx, cw, ch, "#000");   // export keeps black bars (same compositing path)
      positionPlayhead();
      const pct = Math.min(100, Math.round(((state.playhead - startSec) / span) * 100));
      setExportStatus(`Exporting… ${pct}%`);
      if (state.playhead >= endSec) {
        state.exporting = false;
        state.playing = false;
        setPlayIcon(false);
        pool.forEach((p) => { try { p.el.pause(); } catch (e) {} });
        try { rec.stop(); } catch (e) {}
        return;
      }
      requestAnimationFrame(exportTick);
    }
    requestAnimationFrame(exportTick);
  }

  /* ---- Export popup / modal (A1) ---- */
  function refreshExportRegionUi() {
    const has = !!workRegion();
    els.exportRegionWrap.hidden = !has;
    if (!has) els.exportRegion.checked = false;
  }
  function openExportModal() {
    if (contentEnd() <= 0) { els.status.textContent = "Nothing to export"; return; }
    refreshExportRegionUi();
    setExportStatus("Ready to render the program output.");
    els.exportStart.disabled = false;
    els.exportModal.hidden = false;
  }
  function closeExportModal() {
    if (state.exporting) return; // don't tear down mid-render
    els.exportModal.hidden = true;
  }

  /* ---- Premiere FCP7 XML export (A6) ---- */
  function xmlEscape(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function buildPremiereXml() {
    const tb = FPS;
    const f = (sec) => Math.max(0, Math.round(sec * tb));
    // Source resolution (first video media) for the file/format blocks.
    let vw = 1280, vh = 720;
    for (const m of state.media.values()) {
      if (m.kind === "video" && m.el && m.el.videoWidth) { vw = m.el.videoWidth; vh = m.el.videoHeight; break; }
    }
    const rate = `<rate><timebase>${tb}</timebase><ntsc>FALSE</ntsc></rate>`;
    const totalFrames = f(timelineLength());

    // Stable file ids by media name so each source is defined once.
    const fileIds = new Map();
    let fileSeq = 0, itemSeq = 0;
    function fileBlock(clip) {
      const key = clip.mediaName || "clip";
      const media = state.media.get(clip.mediaId);
      const srcDur = media ? f(media.duration || 0) : f(clip.outPoint);
      if (fileIds.has(key)) {
        return `<file id="${fileIds.get(key)}"/>`;
      }
      const id = `file-${++fileSeq}`;
      fileIds.set(key, id);
      const pathurl = "file://localhost/" + encodeURI((clip.mediaName || "clip").replace(/\\/g, "/"));
      const mediaDef = clip.kind === "audio"
        ? `<media><audio><channelcount>2</channelcount></audio></media>`
        : `<media><video><samplecharacteristics><width>${vw}</width><height>${vh}</height></samplecharacteristics></video><audio><channelcount>2</channelcount></audio></media>`;
      return `<file id="${id}"><name>${xmlEscape(key)}</name><pathurl>${xmlEscape(pathurl)}</pathurl>${rate}<duration>${srcDur}</duration>${mediaDef}</file>`;
    }
    function clipItem(clip, isAudio) {
      const inF = f(clip.inPoint);
      const outF = f(clip.outPoint);
      const startF = f(clip.start);
      const endF = f(clip.start + clipTimelineDur(clip));
      const speedPct = Math.round((clip.speed || 1) * 100);
      const timeRemap = (speedPct !== 100)
        ? `<filter><effect><name>Time Remap</name><effectid>timeremap</effectid><effectcategory>motion</effectcategory><effecttype>motion</effecttype><mediatype>video</mediatype><parameter><parameterid>speed</parameterid><name>speed</name><value>${speedPct}</value></parameter><parameter><parameterid>reverse</parameterid><name>reverse</name><value>FALSE</value></parameter></filter>`
        : "";
      const srcTrack = isAudio ? `<sourcetrack><mediatype>audio</mediatype></sourcetrack>` : "";
      return `<clipitem id="clipitem-${++itemSeq}"><name>${xmlEscape(clip.mediaName || "clip")}</name><enabled>TRUE</enabled><duration>${Math.max(1, outF - inF)}</duration>${rate}<start>${startF}</start><end>${endF}</end><in>${inF}</in><out>${outF}</out>${srcTrack}${fileBlock(clip)}${timeRemap}</clipitem>`;
    }

    const { vids, auds } = orderedTracks();
    const videoTracks = vids.map((t) => `<track>${t.clips.map((c) => clipItem(c, false)).join("")}<enabled>TRUE</enabled><locked>FALSE</locked></track>`).join("");
    const audioTracks = auds.map((t) => `<track>${t.clips.map((c) => clipItem(c, true)).join("")}<enabled>TRUE</enabled><locked>FALSE</locked></track>`).join("");

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="4">
  <sequence id="sequence-1">
    <name>Meat Journey montage ${stamp()}</name>
    <duration>${totalFrames}</duration>
    ${rate}
    <media>
      <video>
        <format><samplecharacteristics>${rate}<width>${vw}</width><height>${vh}</height></samplecharacteristics></format>
        ${videoTracks || "<track><enabled>TRUE</enabled><locked>FALSE</locked></track>"}
      </video>
      <audio>
        ${audioTracks || "<track><enabled>TRUE</enabled><locked>FALSE</locked></track>"}
      </audio>
    </media>
  </sequence>
</xmeml>`;
  }
  function exportPremiereXml() {
    if (contentEnd() <= 0) { els.status.textContent = "Nothing to export"; return; }
    const xml = buildPremiereXml();
    downloadBlob(new Blob([xml], { type: "application/xml" }), `montage-${stamp()}.xml`);
    els.status.textContent = "Premiere XML exported — re-link media inside Premiere";
  }

  /* ---- wiring ---- */
  els.importInput.addEventListener("change", (e) => { importFiles(e.target.files); e.target.value = ""; });
  if (els.binClear) els.binClear.addEventListener("click", clearBin);
  ["dragover", "dragenter"].forEach((ev) => els.dropzone.addEventListener(ev, (e) => { e.preventDefault(); els.dropzone.classList.add("drag-over"); }));
  ["dragleave", "drop"].forEach((ev) => els.dropzone.addEventListener(ev, () => els.dropzone.classList.remove("drag-over")));
  els.dropzone.addEventListener("drop", (e) => { e.preventDefault(); if (e.dataTransfer.files && e.dataTransfer.files.length) importFiles(e.dataTransfer.files); });
  els.addVideo.addEventListener("click", () => addTrack("video"));
  els.addAudio.addEventListener("click", () => addTrack("audio"));
  els.toolGrab.addEventListener("click", () => setTool("grab"));
  els.toolCut.addEventListener("click", () => setTool("cut"));
  els.playPause.addEventListener("click", togglePlay);
  if (els.loop) els.loop.addEventListener("click", toggleLoop);
  els.goStart.addEventListener("click", () => seekTo(0));
  els.goEnd.addEventListener("click", () => seekTo(contentEnd()));
  els.stepBack.addEventListener("click", () => stepFrame(-1));
  els.stepFwd.addEventListener("click", () => stepFrame(1));
  els.zoom.addEventListener("input", () => { state.pps = parseInt(els.zoom.value, 10) || 80; renderTimeline(); });
  els.save.addEventListener("click", saveMontage);
  els.load.addEventListener("click", () => els.loadInput.click());
  els.loadInput.addEventListener("change", (e) => { if (e.target.files && e.target.files[0]) loadMontage(e.target.files[0]); e.target.value = ""; });
  els.exportBtn.addEventListener("click", openExportModal);
  if (els.exportXmlBtn) els.exportXmlBtn.addEventListener("click", exportPremiereXml);
  els.exportStart.addEventListener("click", () => {
    exportMontage({ format: els.exportFormat.value, region: els.exportRegion.checked });
  });
  // Modal close (backdrop, ✕, Close button) — blocked while exporting.
  els.exportModal.querySelectorAll("[data-ve-export-close]").forEach((b) => b.addEventListener("click", closeExportModal));
  attachMarkerDrag(els.markInEl, "in");
  attachMarkerDrag(els.markOutEl, "out");

  // Speed / Duration modal wiring (two-way speed <-> target duration).
  els.speedFactor.addEventListener("input", () => {
    const s = parseFloat(els.speedFactor.value);
    if (s > 0 && state._speedSrcDur) els.speedDuration.value = (state._speedSrcDur / s).toFixed(2);
    updateSpeedHint();
  });
  els.speedDuration.addEventListener("input", () => {
    const d = parseFloat(els.speedDuration.value);
    if (d > 0 && state._speedSrcDur) els.speedFactor.value = (+(state._speedSrcDur / d).toFixed(4)).toString();
    updateSpeedHint();
  });
  els.speedApply.addEventListener("click", applySpeedFromModal);
  els.speedModal.querySelectorAll("[data-ve-speed-close]").forEach((b) => b.addEventListener("click", closeSpeedModal));
  els.speedModal.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); applySpeedFromModal(); }
    else if (e.key === "Escape") { e.preventDefault(); closeSpeedModal(); }
  });

  // Effects deck wiring (Copy/Paste + close). Slider/checkbox handlers are bound
  // per-open in renderEffectsDeck so they target the current clip.
  if (els.effectsModal) {
    els.fxCopy.addEventListener("click", copyEffects);
    els.fxPaste.addEventListener("click", pasteEffects);
    els.effectsModal.querySelectorAll("[data-ve-effects-close]").forEach((b) => b.addEventListener("click", closeEffectsDeck));
    els.effectsModal.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); closeEffectsDeck(); } });
  }

  // Fullscreen: app checkbox (item 7) + monitor checkbox (item 8).
  if (els.fsApp) els.fsApp.addEventListener("change", () => {
    if (els.fsApp.checked) toggleFullscreen(); else if (document.fullscreenElement === els.app && document.exitFullscreen) document.exitFullscreen().catch(() => {});
  });
  if (els.fsMonitor) els.fsMonitor.addEventListener("change", () => {
    if (els.fsMonitor.checked) toggleMonitorFullscreen(); else if (document.fullscreenElement === els.programMonitor && document.exitFullscreen) document.exitFullscreen().catch(() => {});
  });
  document.addEventListener("fullscreenchange", syncFullscreenChecks);
  // Aspect-ratio dropdown (bottom-centre of the Program monitor).
  if (els.aspectBtn) els.aspectBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const r = els.aspectBtn.getBoundingClientRect();
    openAspectMenu(r.left, r.top - 4);
  });
  // Resizable panes (item 2): central line (monitors) + bottom line (timeline).
  attachPaneResize(els.resizeMid, () => els.monitors, "veMonitorsH", 160);
  attachMonitorWidthResize();
  if (els.splitToggle) els.splitToggle.addEventListener("click", toggleMono);
  attachPaneResize(els.resizeBottom, () => els.timeline, "veTimelineH", 160);
  // Text font dropdown.
  if (els.textBtn) els.textBtn.addEventListener("click", (e) => {
    const r = els.textBtn.getBoundingClientRect();
    openTextMenu(r.left, r.bottom + 4);
  });
  // Text edit modal wiring (live).
  if (els.textModal) {
    ["input", "change"].forEach((ev) => {
      els.textInput.addEventListener(ev, applyTextEditLive);
      els.textColor.addEventListener(ev, applyTextEditLive);
      els.textSize.addEventListener(ev, applyTextEditLive);
      els.textBold.addEventListener(ev, applyTextEditLive);
      els.textFont.addEventListener(ev, applyTextEditLive);
      els.textPosX.addEventListener(ev, applyTextEditLive);
      els.textPosY.addEventListener(ev, applyTextEditLive);
    });
    els.textModal.querySelectorAll("[data-ve-text-close]").forEach((b) => b.addEventListener("click", closeTextModal));
    els.textModal.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); closeTextModal(); } });
  }

  // True only when typing in a text-entry field (block all shortcuts there).
  function isTextEntry(ae) {
    if (!ae) return false;
    if (ae.isContentEditable || ae.tagName === "TEXTAREA") return true;
    if (ae.tagName === "INPUT") return /^(text|number|search|email|url|tel|password|date)$/i.test(ae.type || "text");
    return false;
  }
  // Keyboard transport — active while the Editor is visible. The effects panel is
  // NON-modal so it does not block this (item 9): spacebar still plays even with a
  // slider focused, so the wiggle can be tuned while watching it move.
  document.addEventListener("keydown", (e) => {
    // Editor on screen? (fullscreen elements have no offsetParent — accept those too.)
    if (els.app.hidden || (els.app.offsetParent === null && document.fullscreenElement !== els.app && els.app.getClientRects().length === 0)) return;
    if (els.exportModal && !els.exportModal.hidden) return; // real modals own the keyboard
    if (els.speedModal && !els.speedModal.hidden) return;
    if (els.textModal && !els.textModal.hidden) return;
    const ae = document.activeElement;
    // Spacebar = play/pause: allowed unless typing in a text field (works while a
    // range/checkbox/colour control — e.g. an effects slider — is focused).
    if (e.code === "Space" || e.key === " ") {
      if (isTextEntry(ae)) return;
      e.preventDefault();
      togglePlay();
      return;
    }
    // Every other shortcut is suppressed while any form control has focus.
    if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.tagName === "SELECT" || ae.isContentEditable)) return;
    if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C")) {
      if (state.selectedClipId) { e.preventDefault(); copySelectedClip(); }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === "v" || e.key === "V")) {
      if (clipClipboard) { e.preventDefault(); pasteClipAtPlayhead(); }
      return;
    }
    if (e.key === "m" || e.key === "M") {
      e.preventDefault();
      addMarkerAtPlayhead();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      stepFrame(-1, e.shiftKey);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      stepFrame(1, e.shiftKey);
    } else if (e.key === "i" || e.key === "I") {
      e.preventDefault();
      setMark("in", state.playhead);
    } else if (e.key === "o" || e.key === "O") {
      e.preventDefault();
      setMark("out", state.playhead);
    } else if ((e.key === "c" || e.key === "C") && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // c = Cut tool (Ctrl/Cmd+C stays copy; input focus already excluded above).
      e.preventDefault();
      setTool("cut");
    } else if ((e.key === "v" || e.key === "V") && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // v = Grab tool (Ctrl/Cmd+V stays paste).
      e.preventDefault();
      setTool("grab");
    } else if (e.key === "Delete" || e.key === "Backspace") {
      if (state.binSelectedId) { e.preventDefault(); removeBinMedia(state.binSelectedId); }
      else if (state.selectedClipId) { e.preventDefault(); deleteSelectedClip(); }
    }
  });

  function setTool(tool) {
    state.tool = tool;
    els.toolGrab.classList.toggle("active", tool === "grab");
    els.toolCut.classList.toggle("active", tool === "cut");
    els.timeline.classList.toggle("cut-mode", tool === "cut");
  }

  // default tracks: one video + one audio
  els.zoom.value = state.pps;
  els.sourceVideo.style.display = "none";
  els.sourceAudio.style.display = "none";
  els.previewVideo.style.display = "none";
  addTrack("video");
  addTrack("audio");
  buildAspectMenu();
  restorePaneHeights();
  restoreMonitorsLayout();
  renderTimeline();
  drawProgram();
  startProgramLoop();   // continuous compositing loop while the Editor is visible
};

window.__veInitVideoEditor();
