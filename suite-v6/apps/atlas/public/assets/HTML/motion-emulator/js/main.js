/**
 * main.js — application orchestrator.
 * Wires the UI to the pose/depth engines, the batch pipeline, the 3D
 * viewport and the prompt generator.
 */
import { FPS_OPTIONS, RESOLUTIONS } from './constants.js';
import { formatTime, formatBytes, fitRect, even, downloadBlob } from './utils.js';
import { toast, setModelStatus, setProgress, initTabs } from './ui.js';
import { PoseEngine } from './pose.js';
import { DepthEngine } from './depth.js';
import { Viewport3D } from './viewport3d.js';
import { runPipeline, runImagePipeline } from './pipeline.js';
import { renderSkeleton, renderBlank } from './skeleton2d.js';
import { analyzeMotion } from './motion.js';
import { DEFAULT_FIELDS, assemblePrompt } from './prompt.js';

const params = new URLSearchParams(location.search);
if (params.has('probe')) await import('./dev/probe.js'); // dev/test instrumentation only

const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const pose = new PoseEngine();
const depth = new DepthEngine();
let viewport = null;
let fileName = null;
let videoUrl = null; // active object URL, revoked on clear/replace
let imageUrl = null;
let sourceKind = null;
let results = null; // { blobs, poseFrames, stats, settings }
let processing = false;
let cancelFlag = null;

const video = $('video');
const sourceImage = $('source-image');
const outCanvas = $('out-canvas');
const outCtx = outCanvas.getContext('2d');

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
init();

async function init() {
  // Selects
  for (const f of FPS_OPTIONS) $('fps-select').add(new Option(`${f} fps`, f, f === 24, f === 24));
  for (const r of RESOLUTIONS) $('res-select').add(new Option(r.label, r.id, r.id === '1280x720', r.id === '1280x720'));

  initTabs();
  viewport = new Viewport3D($('viewport3d'));

  wireFileInput();
  wireTransport();
  wireProcessing();
  wirePrompt();
  wireShortcuts();

  // Load the pose model immediately — it powers the live preview.
  window.__poseReady = pose
    .load((state, detail) => setModelStatus('chip-pose', state, detail))
    .then(() => {
      toast('Pose model ready — live skeleton preview enabled.', 'success');
      updateProcessEnabled();
      if (sourceKind === 'image') previewCurrentFrame();
    })
    .catch((err) => {
      setModelStatus('chip-pose', 'error');
      toast(`Pose model failed to load: ${err.message}`, 'error', 8000);
      throw err;
    });

  startLivePreview();

  // Expose a small API for the automated self-test / debugging.
  window.__me = {
    pose,
    depth,
    loadSourceFile,
    loadVideoFile,
    loadImageFile,
    clearSource,
    clearVideo: clearSource,
    process: startProcessing,
    getResults: () => results,
    video,
    sourceImage,
  };
  if (params.has('autotest')) {
    const m = await import('./dev/autotest.js');
    m.run(window.__me);
  }
}

// ---------------------------------------------------------------------------
// File loading
// ---------------------------------------------------------------------------
function wireFileInput() {
  const zone = $('drop-zone');
  const input = $('file-input');
  zone.addEventListener('click', () => input.click());
  $('btn-clear').addEventListener('click', clearSource);
  input.addEventListener('change', () => input.files[0] && loadSourceFile(input.files[0]));
  ['dragover', 'dragenter'].forEach((ev) =>
    zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add('drop-active'); })
  );
  ['dragleave', 'drop'].forEach((ev) =>
    zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove('drop-active'); })
  );
  zone.addEventListener('drop', (e) => {
    const file = [...e.dataTransfer.files].find(isSupportedSource);
    if (file) loadSourceFile(file);
    else toast('Please drop a supported video or image file.', 'warn');
  });

  video.addEventListener('error', () => {
    const err = video.error;
    toast(
      `Could not decode this video (${err?.message || 'unsupported codec'}). ` +
        'Try re-encoding to H.264 MP4.',
      'error',
      8000
    );
  });
}

function sourceType(file) {
  const name = file.name.toLowerCase();
  if (file.type.startsWith('video/') || /\.(mp4|webm|mov)$/.test(name)) return 'video';
  if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|avif)$/.test(name)) return 'image';
  return null;
}

function isSupportedSource(file) {
  return sourceType(file) !== null;
}

function loadSourceFile(file) {
  const kind = sourceType(file);
  if (kind === 'video') return loadVideoFile(file);
  if (kind === 'image') return loadImageFile(file);
  toast('This file is not a supported video or image.', 'warn');
  return Promise.resolve();
}

async function loadVideoFile(file) {
  if (processing) return toast('Cancel the current processing run first.', 'warn');
  releaseImage();
  fileName = file.name.replace(/\.[^.]+$/, '');
  if (videoUrl) URL.revokeObjectURL(videoUrl);
  videoUrl = URL.createObjectURL(file);
  video.src = videoUrl;
  video.muted = true;

  await new Promise((resolve, reject) => {
    video.addEventListener('loadedmetadata', resolve, { once: true });
    video.addEventListener('error', () => reject(new Error('unsupported codec')), { once: true });
  }).catch(() => null);

  // Streamed WebM (e.g. MediaRecorder output) reports Infinity — force a
  // duration fix by seeking far past the end once.
  if (video.duration === Infinity) {
    await new Promise((resolve) => {
      video.addEventListener('durationchange', resolve, { once: true });
      video.currentTime = 1e7;
    });
    video.currentTime = 0;
  }
  if (!isFinite(video.duration) || !video.videoWidth) {
    return toast('This file could not be read as a video.', 'error');
  }

  sourceKind = 'video';
  video.classList.remove('hidden');
  $('video-empty').classList.add('hidden');
  $('video-meta').textContent =
    `${file.name}\n${video.videoWidth}×${video.videoHeight} · ${formatTime(video.duration)} · ${formatBytes(file.size)}`;
  $('scrub').disabled = false;
  $('btn-play').disabled = false;
  $('btn-clear').classList.remove('hidden');
  $('btn-clear').innerHTML = '&#10005; Clear video';
  $('btn-process').textContent = 'Process video';
  $('transport').classList.remove('hidden');
  sizeOutCanvasToSource();
  renderBlank(outCtx, outCanvas.width, outCanvas.height);
  results = null;
  renderExports();
  refreshPrompt();
  updateProcessEnabled();
  updateTransportUI();
  toast(`Loaded ${file.name}`, 'success');
}

async function loadImageFile(file) {
  if (processing) return toast('Cancel the current processing run first.', 'warn');
  releaseVideo();
  fileName = file.name.replace(/\.[^.]+$/, '');
  if (imageUrl) URL.revokeObjectURL(imageUrl);
  imageUrl = URL.createObjectURL(file);
  sourceImage.src = imageUrl;
  await new Promise((resolve, reject) => {
    sourceImage.addEventListener('load', resolve, { once: true });
    sourceImage.addEventListener('error', reject, { once: true });
  }).catch(() => null);
  if (!sourceImage.naturalWidth) {
    releaseImage();
    return toast('This file could not be read as an image.', 'error');
  }

  sourceKind = 'image';
  sourceImage.classList.remove('hidden');
  $('video-empty').classList.add('hidden');
  $('video-meta').textContent =
    `${file.name}\n${sourceImage.naturalWidth}×${sourceImage.naturalHeight} · ${formatBytes(file.size)}`;
  $('btn-clear').classList.remove('hidden');
  $('btn-clear').innerHTML = '&#10005; Clear image';
  $('btn-process').textContent = 'Process image';
  $('transport').classList.add('hidden');
  sizeOutCanvasToSource();
  renderBlank(outCtx, outCanvas.width, outCanvas.height);
  results = null;
  renderExports();
  refreshPrompt();
  updateProcessEnabled();
  if (pose.ready) previewCurrentFrame();
  toast(`Loaded ${file.name}`, 'success');
}

/** Unload the current source and reset the workspace to its initial state. */
function clearSource() {
  if (processing) return toast('Cancel the current processing run first.', 'warn');
  if (!sourceKind) return;
  const clearedKind = sourceKind;
  releaseVideo();
  releaseImage();
  sourceKind = null;
  fileName = null;
  results = null;

  $('video-empty').classList.remove('hidden');
  $('video-meta').textContent = '';
  $('btn-clear').classList.add('hidden');
  $('file-input').value = '';
  const scrub = $('scrub');
  scrub.value = 0;
  scrub.style.setProperty('--fill', '0%');
  scrub.disabled = true;
  $('btn-play').disabled = true;
  $('time-label').textContent = '0:00.00 / 0:00.00';
  $('transport').classList.remove('hidden');
  $('btn-process').textContent = 'Process source';
  $('out-label').textContent = 'Output (live skeleton)';
  renderBlank(outCtx, outCanvas.width, outCanvas.height);
  viewport.update(null);
  renderExports();
  refreshPrompt();
  updateProcessEnabled();
  toast(`${clearedKind === 'image' ? 'Image' : 'Video'} cleared.`, 'info');
}

function releaseVideo() {
  video.pause();
  if (videoUrl) URL.revokeObjectURL(videoUrl);
  videoUrl = null;
  video.removeAttribute('src');
  video.load();
  video.classList.add('hidden');
}

function releaseImage() {
  if (imageUrl) URL.revokeObjectURL(imageUrl);
  imageUrl = null;
  sourceImage.removeAttribute('src');
  sourceImage.classList.add('hidden');
}

function sourceWidth() {
  return sourceKind === 'image' ? sourceImage.naturalWidth : video.videoWidth;
}

function sourceHeight() {
  return sourceKind === 'image' ? sourceImage.naturalHeight : video.videoHeight;
}

function sourceElement() {
  return sourceKind === 'image' ? sourceImage : video;
}

function sizeOutCanvasToSource() {
  const r = fitRect(sourceWidth(), sourceHeight(), 720, 480);
  outCanvas.width = even(r.w);
  outCanvas.height = even(r.h);
}

function updateProcessEnabled() {
  $('btn-process').disabled = processing || !sourceWidth() || !pose.ready;
}

// ---------------------------------------------------------------------------
// Transport (play / pause / scrub / time)
// ---------------------------------------------------------------------------
function wireTransport() {
  const scrub = $('scrub');
  $('btn-play').addEventListener('click', togglePlay);
  video.addEventListener('play', updateTransportUI);
  video.addEventListener('pause', updateTransportUI);
  video.addEventListener('timeupdate', updateTransportUI);
  video.addEventListener('seeked', () => { if (!processing) previewCurrentFrame(); });

  scrub.addEventListener('input', () => {
    if (!video.duration || processing) return;
    video.currentTime = (scrub.value / 1000) * video.duration;
  });
}

function togglePlay() {
  if (sourceKind !== 'video' || !video.src || processing) return;
  if (video.paused) video.play().catch(() => {});
  else video.pause();
}

function updateTransportUI() {
  const playing = !video.paused && !video.ended;
  $('icon-play').classList.toggle('hidden', playing);
  $('icon-pause').classList.toggle('hidden', !playing);
  $('time-label').textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration || 0)}`;
  if (video.duration && !processing) {
    const v = Math.round((video.currentTime / video.duration) * 1000);
    const scrub = $('scrub');
    scrub.value = v;
    scrub.style.setProperty('--fill', `${v / 10}%`);
  }
}

function wireShortcuts() {
  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.code === 'Space' && sourceKind === 'video') { e.preventDefault(); togglePlay(); }
    if (e.code === 'ArrowRight' && video.duration && !processing) {
      video.currentTime += 1 / getSettings().fps;
    }
    if (e.code === 'ArrowLeft' && video.duration && !processing) {
      video.currentTime -= 1 / getSettings().fps;
    }
  });
}

// ---------------------------------------------------------------------------
// Live preview (real-time pose while playing / scrubbing)
// ---------------------------------------------------------------------------
function startLivePreview() {
  const loop = () => {
    if (!processing && pose.ready && video.videoWidth && video.readyState >= 2) previewCurrentFrame();
    video.requestVideoFrameCallback ? video.requestVideoFrameCallback(loop) : requestAnimationFrame(loop);
  };
  video.requestVideoFrameCallback ? video.requestVideoFrameCallback(loop) : requestAnimationFrame(loop);
}

function previewCurrentFrame() {
  if (!pose.ready || !sourceWidth()) return;
  try {
    const timestamp = sourceKind === 'video' ? video.currentTime * 1000 : 0;
    const { landmarks, world } = pose.detect(sourceElement(), timestamp);
    renderSkeleton(outCtx, outCanvas.width, outCanvas.height, landmarks, { glow: true });
    viewport.update(world);
  } catch (err) {
    console.warn('Live preview detect failed:', err);
  }
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
function getSettings() {
  const fps = Number($('fps-select').value) || 24;
  const resId = $('res-select').value;
  let w;
  let h;
  if (resId === 'source') {
    const scale = Math.min(1, 1280 / sourceWidth() || 1);
    w = even(sourceWidth() * scale);
    h = even(sourceHeight() * scale);
  } else {
    const r = RESOLUTIONS.find((r) => r.id === resId);
    w = r.w;
    h = r.h;
  }
  const mode = document.querySelector('input[name="mode"]:checked').value;
  return { fps, width: w, height: h, mode, sideBySide: $('sbs-check').checked, colormap: $('cmap-select').value };
}

// ---------------------------------------------------------------------------
// Processing
// ---------------------------------------------------------------------------
function wireProcessing() {
  $('btn-process').addEventListener('click', () => startProcessing());
  $('btn-cancel').addEventListener('click', () => {
    if (cancelFlag) cancelFlag.cancelled = true;
  });
  $('btn-test-depth').addEventListener('click', testDepthFrame);
  document.querySelectorAll('input[name="mode"]').forEach((r) =>
    r.addEventListener('change', () => {
      $('sbs-check').disabled = document.querySelector('input[name="mode"]:checked').value !== 'both';
      refreshPrompt();
    })
  );
}

async function ensureDepthLoaded() {
  if (depth.ready) return;
  toast('Loading depth model (first time only — it will be cached)…', 'info', 6000);
  await depth.load((state, detail) => setModelStatus('chip-depth', state, detail));
  toast(`Depth model ready (${depth.device === 'webgpu' ? 'WebGPU' : 'WASM fallback'}).`, 'success');
}

async function testDepthFrame() {
  if (!sourceWidth()) return toast('Load a video or image first.', 'warn');
  if (processing) return;
  const btn = $('btn-test-depth');
  btn.disabled = true;
  try {
    await ensureDepthLoaded();
    const { width: w, height: h, colormap } = { ...getSettings() };
    const frame = document.createElement('canvas');
    frame.width = w;
    frame.height = h;
    const fctx = frame.getContext('2d');
    const r = fitRect(sourceWidth(), sourceHeight(), w, h);
    fctx.fillStyle = '#000';
    fctx.fillRect(0, 0, w, h);
    fctx.drawImage(sourceElement(), r.x, r.y, r.w, r.h);
    depth.resetNormalization();
    outCanvas.width = w;
    outCanvas.height = h;
    await depth.renderTo(frame, outCtx, w, h, colormap);
    $('out-label').textContent = 'Output (depth test)';
    toast('Depth test rendered.', 'success');
  } catch (err) {
    console.error(err);
    toast(`Depth test failed: ${err.message}`, 'error', 7000);
  } finally {
    btn.disabled = false;
  }
}

async function startProcessing() {
  if (processing || !sourceWidth()) return;
  const settings = getSettings();
  const totalFrames = sourceKind === 'image' ? 1 : Math.floor(video.duration * settings.fps);
  if (totalFrames > 9000) {
    const mins = Math.round(totalFrames / 60 / settings.fps);
    if (!confirm(`This clip is long (~${totalFrames} frames / ${mins}+ min of video). Processing may take a while. Continue?`)) return;
  }

  processing = true;
  cancelFlag = { cancelled: false };
  updateProcessEnabled();
  $('btn-cancel').classList.remove('hidden');
  $('scrub').disabled = true;
  $('btn-play').disabled = true;
  if (sourceKind === 'video') video.pause();
  setProgress({ frame: 0, total: totalFrames });
  $('out-label').textContent = 'Output (processing…)';

  try {
    await window.__poseReady;
    const wantDepth = settings.mode !== 'skeleton';
    if (wantDepth) await ensureDepthLoaded();

    const common = {
      pose,
      depth: wantDepth ? depth : null,
      settings,
      flag: cancelFlag,
      onProgress: setProgress,
      onPreview: (canvas, landmarks, world) => {
        if (outCanvas.width !== canvas.width || outCanvas.height !== canvas.height) {
          outCanvas.width = canvas.width;
          outCanvas.height = canvas.height;
        }
        outCtx.drawImage(canvas, 0, 0);
        viewport.update(world);
      },
    };
    const run = sourceKind === 'image'
      ? await runImagePipeline({ ...common, image: sourceImage })
      : await runPipeline({ ...common, video });

    results = { ...run, settings, sourceKind };
    renderExports();
    deriveMotion();
    const missed = run.stats.missedFrames;
    toast(
      sourceKind === 'image'
        ? `Done — image processed${missed ? ' (no person detected for the skeleton)' : ''}.`
        : `Done — ${run.stats.frames} frames processed` +
          `${missed ? ` (${missed} without a detected person)` : ''}.`,
      'success',
      6000
    );
    $('out-label').textContent = 'Output (processed)';
  } catch (err) {
    if (err.isCancel) {
      toast('Processing cancelled.', 'warn');
      $('out-label').textContent = 'Output (cancelled)';
    } else {
      console.error(err);
      toast(`Processing failed: ${err.message}`, 'error', 9000);
      $('out-label').textContent = 'Output';
    }
  } finally {
    processing = false;
    cancelFlag = null;
    $('btn-cancel').classList.add('hidden');
    setProgress(null);
    $('scrub').disabled = sourceKind !== 'video' || !video.videoWidth;
    $('btn-play').disabled = sourceKind !== 'video' || !video.videoWidth;
    updateProcessEnabled();
    updateTransportUI();
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
const EXPORT_LABELS = {
  depth: 'Depth map',
  skeleton: 'Pose skeleton',
  sidebyside: 'Side-by-side',
};

function renderExports() {
  const list = $('exports-list');
  list.innerHTML = '';
  if (!results) {
    list.innerHTML = '<p class="me-hint">Process a video or image to generate downloads.</p>';
    return;
  }
  const base = fileName || 'output';

  if (results.sourceKind === 'image') {
    for (const [key, blob] of Object.entries(results.imageBlobs)) {
      const name = `${base}_${key}.png`;
      list.appendChild(exportRow(`${EXPORT_LABELS[key]} · ${formatBytes(blob.size)}`, [
        btn('PNG ⬇', () => downloadBlob(blob, name)),
        btn('Send → Aggregator', () => sendOutputToAggregator(blob, name)),
      ]));
    }
  } else {
    for (const [key, blob] of Object.entries(results.blobs)) {
      const name = `${base}_${key}.webm`;
      list.appendChild(exportRow(`${EXPORT_LABELS[key]} · ${formatBytes(blob.size)}`, [
        btn('WebM ⬇', () => downloadBlob(blob, name)),
        btn('Send → Aggregator', () => sendOutputToAggregator(blob, name)),
        btn(
          'MP4',
          (b) => convertMp4(blob, `${base}_${key}.mp4`, b),
          'converted by the app server (LGPL ffmpeg)'
        ),
      ]));
    }
  }

  // Pose JSON
  list.appendChild(exportRow('Pose world landmarks (JSON)', [
    btn('JSON ⬇', () => {
      const payload = {
        source: fileName,
        sourceType: results.sourceKind,
        fps: results.sourceKind === 'video' ? results.settings.fps : null,
        width: results.settings.width,
        height: results.settings.height,
        landmarkModel: 'mediapipe_pose_landmarker_full (33 world landmarks, meters, hip-centered)',
        frames: results.poseFrames,
      };
      downloadBlob(new Blob([JSON.stringify(payload)], { type: 'application/json' }), `${base}_pose_worldlandmarks.json`);
    }),
  ]));

  // Prompt
  list.appendChild(exportRow('Seedance prompt (TXT)', [
    btn('TXT ⬇', () => downloadBlob(new Blob([$('prompt-out').value], { type: 'text/plain' }), 'seedance_prompt.txt')),
  ]));
}

function sendOutputToAggregator(blob, name) {
  window.parent.postMessage({
    type: 'barz:motion-emulator-reference',
    schemaVersion: '1.0',
    name,
    mimeType: blob.type || (name.endsWith('.png') ? 'image/png' : 'video/webm'),
    blob,
  }, location.origin);
  toast(`${name} sent to the Aggregator reference deck.`, 'success');
}

function exportRow(label, buttons) {
  const row = document.createElement('div');
  row.className = 'me-export-row';
  const span = document.createElement('span');
  span.className = 'me-export-label';
  span.textContent = label;
  row.appendChild(span);
  const wrap = document.createElement('div');
  wrap.className = 'me-export-btns';
  buttons.forEach((b) => wrap.appendChild(b));
  row.appendChild(wrap);
  return row;
}

function btn(label, onClick, title = '') {
  const b = document.createElement('button');
  b.className = 'me-mini-btn';
  b.textContent = label;
  b.title = title;
  b.addEventListener('click', () => onClick(b));
  return b;
}

async function convertMp4(blob, name, buttonEl) {
  buttonEl.disabled = true;
  const original = buttonEl.textContent;
  try {
    buttonEl.textContent = 'loading…';
    const { webmToMp4 } = await import('./mp4.js');
    const mp4 = await webmToMp4(blob, (p) => {
      buttonEl.textContent = `${Math.round(p * 100)}%`;
    });
    downloadBlob(mp4, name);
    toast(`MP4 ready: ${name}`, 'success');
  } catch (err) {
    console.error(err);
    toast(`MP4 conversion failed (${err.message}). The WebM export works everywhere Seedance accepts video.`, 'error', 8000);
  } finally {
    buttonEl.disabled = false;
    buttonEl.textContent = original;
  }
}

// ---------------------------------------------------------------------------
// Prompt panel
// ---------------------------------------------------------------------------
function wirePrompt() {
  for (const [key, value] of Object.entries(DEFAULT_FIELDS)) {
    const el = $(`f-${key}`);
    el.value = value;
    el.addEventListener('input', refreshPrompt);
  }
  refreshPrompt();

  $('btn-copy-prompt').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('prompt-out').value);
      toast('Prompt copied to clipboard.', 'success');
    } catch {
      $('prompt-out').select();
      document.execCommand('copy');
      toast('Prompt copied.', 'success');
    }
  });
  $('btn-download-prompt').addEventListener('click', () =>
    downloadBlob(new Blob([$('prompt-out').value], { type: 'text/plain' }), 'seedance_prompt.txt')
  );
  $('btn-remotion').addEventListener('click', () => {
    if (!results) {
      return toast(
        'Process a video or image first — motion is derived from the extracted pose data.',
        'warn'
      );
    }
    deriveMotion();
    toast('Motion description re-derived from pose data.', 'success');
  });
}

function deriveMotion() {
  if (!results) return;
  const { text } = analyzeMotion(results.poseFrames, results.settings.fps);
  $('f-motion').value = text;
  refreshPrompt();
}

function refreshPrompt() {
  const fields = {};
  for (const key of Object.keys(DEFAULT_FIELDS)) fields[key] = $(`f-${key}`).value;
  const mode = document.querySelector('input[name="mode"]:checked').value;
  $('prompt-out').value = assemblePrompt(fields, mode, sourceKind);
}
