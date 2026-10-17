/** utils.js — small shared helpers. */

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Yield to the event loop so the UI can paint during heavy loops. */
export const nextTick = () =>
  new Promise((r) => ('requestIdleCallback' in window ? requestIdleCallback(r, { timeout: 32 }) : setTimeout(r, 0)));

/** Format seconds as m:ss.cc */
export function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, '0')}`;
}

/** Format milliseconds as a friendly duration ("1m 24s", "18s"). */
export function formatEta(ms) {
  if (!isFinite(ms) || ms <= 0) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 ** 2).toFixed(1)} MB`;
}

/**
 * Compute a letterboxed draw rectangle that fits (srcW × srcH) inside
 * (dstW × dstH) preserving aspect ratio.
 */
export function fitRect(srcW, srcH, dstW, dstH) {
  const scale = Math.min(dstW / srcW, dstH / srcH);
  const w = Math.round(srcW * scale);
  const h = Math.round(srcH * scale);
  return { x: Math.round((dstW - w) / 2), y: Math.round((dstH - h) / 2), w, h, scale };
}

/** Round down to the nearest even number (video encoders want even dims). */
export const even = (n) => Math.max(2, 2 * Math.floor(n / 2));

/** Trigger a browser download of a Blob. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the download a moment to start before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Seek a <video> to `t` seconds and resolve once the frame is available. */
export function seekTo(video, t, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const target = Math.max(0, Math.min(t, Math.max(0, (video.duration || t) - 0.001)));
    // Setting currentTime to its current value never fires "seeked".
    if (!video.seeking && Math.abs(video.currentTime - target) < 0.0005) return resolve();
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Seek timed out — the video codec may not be seekable in this browser.'));
    }, timeoutMs);
    const onSeeked = () => { cleanup(); resolve(); };
    const onError = () => { cleanup(); reject(new Error('Video decode error while seeking.')); };
    function cleanup() {
      clearTimeout(timer);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
    }
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
    video.currentTime = target;
  });
}
