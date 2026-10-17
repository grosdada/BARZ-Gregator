/**
 * mp4.js — WebM → MP4 conversion through the Prompt Atlas server.
 *
 * The original standalone app used ffmpeg.wasm here, but its @ffmpeg/core build
 * bundles libx264 (GPL) — excluded from this project. The app server already
 * ships an LGPL-only ffmpeg (OS-native H.264 encoder: h264_mf on Windows,
 * h264_videotoolbox on macOS), so conversion happens over one local HTTP call:
 * same button, same result, no network, no GPL.
 */

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('could not read the WebM blob'));
    r.readAsDataURL(blob);
  });
}

/**
 * Convert a WebM blob to an H.264 MP4 blob.
 * @param {Blob} webmBlob
 * @param {(p:number)=>void} onProgress 0..1 (coarse: request sent → response)
 */
export async function webmToMp4(webmBlob, onProgress) {
  onProgress?.(0.05);
  const dataUrl = await blobToDataUrl(webmBlob);
  onProgress?.(0.2);
  const resp = await fetch('/api/media/webm-to-mp4', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mediaDataUrl: dataUrl }),
  });
  onProgress?.(0.85);
  if (!resp.ok) {
    let msg = `server conversion failed (${resp.status})`;
    try { msg = (await resp.json()).error || msg; } catch { /* keep default */ }
    throw new Error(msg);
  }
  const buf = await resp.arrayBuffer();
  if (!buf.byteLength) throw new Error('empty MP4 output');
  onProgress?.(1);
  return new Blob([buf], { type: 'video/mp4' });
}
