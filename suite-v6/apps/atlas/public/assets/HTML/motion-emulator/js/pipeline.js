/**
 * pipeline.js — frame-accurate batch processing.
 *
 * Decoupled from real-time playback: we seek the source <video> to each
 * frame's timestamp, wait for the decoder, then run pose (+ depth when
 * selected) and push the rendered frames into the encoders.
 *
 * Robustness:
 *  - no person in a frame  -> hold the last pose for up to HOLD_FRAMES, then blank
 *  - seek/decoder failure  -> abort with a clear codec message
 *  - cancel                -> encoders disposed, video position restored
 */
import { createEncoder } from './encoder.js';
import { renderSkeleton, renderBlank } from './skeleton2d.js';
import { seekTo, fitRect, formatEta } from './utils.js';

const HOLD_SECONDS = 0.6; // how long a lost pose is held before blanking

export class Cancellation extends Error {
  constructor() { super('Processing cancelled'); this.isCancel = true; }
}

/**
 * @param {object} cfg
 * @param {HTMLVideoElement} cfg.video source video (already loaded)
 * @param {import('./pose.js').PoseEngine} cfg.pose
 * @param {import('./depth.js').DepthEngine|null} cfg.depth null when not needed
 * @param {object} cfg.settings {fps,width,height,mode,sideBySide,colormap}
 * @param {(info)=>void} cfg.onProgress
 * @param {(canvas)=>void} cfg.onPreview called with the canvas to mirror in the UI
 * @param {{cancelled:boolean}} cfg.flag cooperative cancellation flag
 * @returns {Promise<{blobs:Object, poseFrames:Array, stats:Object}>}
 */
export async function runPipeline({ video, pose, depth, settings, onProgress, onPreview, flag }) {
  const { fps, width: w, height: h, mode, sideBySide, colormap } = settings;
  const wantDepth = mode === 'depth' || mode === 'both';
  const wantSkeleton = mode === 'skeleton' || mode === 'both';
  const wantComposite = mode === 'both' && sideBySide;

  const totalFrames = Math.max(1, Math.floor(video.duration * fps));
  const holdFrames = Math.round(HOLD_SECONDS * fps);

  // --- canvases -----------------------------------------------------------
  const frameCanvas = mkCanvas(w, h); // letterboxed source frame (pose + depth input)
  const frameCtx = frameCanvas.getContext('2d', { willReadFrequently: true });
  const rect = fitRect(video.videoWidth, video.videoHeight, w, h);

  const skelCanvas = wantSkeleton ? mkCanvas(w, h) : null;
  const depthCanvas = wantDepth ? mkCanvas(w, h) : null;
  const compCanvas = wantComposite ? mkCanvas(w * 2, h) : null;

  // --- encoders ------------------------------------------------------------
  const encoders = {};
  if (wantDepth) encoders.depth = await createEncoder(depthCanvas, { fps, label: 'depth' });
  if (wantSkeleton) encoders.skeleton = await createEncoder(skelCanvas, { fps, label: 'skeleton' });
  if (wantComposite) encoders.sidebyside = await createEncoder(compCanvas, { fps, label: 'side-by-side' });

  const poseFrames = [];
  const wasPaused = video.paused;
  const originalTime = video.currentTime;
  video.pause();
  pose.newSequence();
  depth?.resetNormalization();

  let lastLandmarks = null;
  let lastWorld = null;
  let heldFor = 0;
  let missedFrames = 0;
  const t0 = performance.now();

  try {
    for (let f = 0; f < totalFrames; f++) {
      if (flag.cancelled) throw new Cancellation();

      // Sample at the frame center to dodge edge-of-frame decoder ambiguity.
      const t = Math.min((f + 0.5) / fps, video.duration - 0.001);
      await seekTo(video, t);

      // Letterbox the decoded frame into the export-resolution canvas.
      frameCtx.fillStyle = '#000';
      frameCtx.fillRect(0, 0, w, h);
      frameCtx.drawImage(video, rect.x, rect.y, rect.w, rect.h);

      // --- pose (always: feeds the skeleton, the JSON and motion analysis)
      const { landmarks, world } = pose.detect(frameCanvas, f * (1000 / fps));
      let drawLandmarks = landmarks;
      if (landmarks) {
        lastLandmarks = landmarks;
        lastWorld = world;
        heldFor = 0;
      } else {
        missedFrames++;
        heldFor++;
        drawLandmarks = heldFor <= holdFrames ? lastLandmarks : null;
      }
      poseFrames.push({
        frame: f,
        timestamp: +(f / fps).toFixed(4),
        detected: !!landmarks,
        landmarks: world ? world.map(compactLm) : null,
        normalizedLandmarks: landmarks ? landmarks.map(compactLm) : null,
      });

      // --- renders + encode
      if (wantSkeleton) {
        const ctx = skelCanvas.getContext('2d');
        if (drawLandmarks) renderSkeleton(ctx, w, h, drawLandmarks);
        else renderBlank(ctx, w, h);
        await encoders.skeleton.addFrame();
      }
      if (wantDepth) {
        await depth.renderTo(frameCanvas, depthCanvas.getContext('2d'), w, h, colormap);
        await encoders.depth.addFrame();
      }
      if (wantComposite) {
        const ctx = compCanvas.getContext('2d');
        ctx.drawImage(depthCanvas, 0, 0);
        ctx.drawImage(skelCanvas, w, 0);
        await encoders.sidebyside.addFrame();
      }

      onPreview?.(compCanvas || depthCanvas || skelCanvas, drawLandmarks, lastWorld);

      // --- progress
      const elapsed = performance.now() - t0;
      const perFrame = elapsed / (f + 1);
      onProgress?.({
        frame: f + 1,
        total: totalFrames,
        fps: 1000 / perFrame,
        eta: formatEta(perFrame * (totalFrames - f - 1)),
      });
    }

    // --- finalize -----------------------------------------------------------
    const blobs = {};
    for (const [name, enc] of Object.entries(encoders)) blobs[name] = await enc.finalize();

    return {
      blobs,
      poseFrames,
      stats: {
        frames: totalFrames,
        fps,
        width: w,
        height: h,
        missedFrames,
        seconds: +(performance.now() - t0).toFixed(0) / 1000,
      },
    };
  } catch (err) {
    Object.values(encoders).forEach((e) => e.dispose());
    throw err;
  } finally {
    // Restore where the user was.
    try { await seekTo(video, originalTime, 2000); } catch { /* best effort */ }
    if (!wasPaused) video.play().catch(() => {});
  }
}

/**
 * Process one still image through the same pose and depth renderers as video.
 * The returned PNG blobs are ready to download without a video encoder.
 * @param {object} cfg
 * @returns {Promise<{imageBlobs:Object, poseFrames:Array, stats:Object}>}
 */
export async function runImagePipeline({ image, pose, depth, settings, onProgress, onPreview, flag }) {
  const { width: w, height: h, mode, sideBySide, colormap } = settings;
  const wantDepth = mode === 'depth' || mode === 'both';
  const wantSkeleton = mode === 'skeleton' || mode === 'both';
  const wantComposite = mode === 'both' && sideBySide;
  if (flag.cancelled) throw new Cancellation();

  const frameCanvas = mkCanvas(w, h);
  const frameCtx = frameCanvas.getContext('2d', { willReadFrequently: true });
  const rect = fitRect(image.naturalWidth, image.naturalHeight, w, h);
  frameCtx.fillStyle = '#000';
  frameCtx.fillRect(0, 0, w, h);
  frameCtx.drawImage(image, rect.x, rect.y, rect.w, rect.h);

  const skelCanvas = wantSkeleton ? mkCanvas(w, h) : null;
  const depthCanvas = wantDepth ? mkCanvas(w, h) : null;
  const compCanvas = wantComposite ? mkCanvas(w * 2, h) : null;
  const t0 = performance.now();
  pose.newSequence();
  depth?.resetNormalization();

  const { landmarks, world } = pose.detect(frameCanvas, 0);
  if (wantSkeleton) {
    const ctx = skelCanvas.getContext('2d');
    if (landmarks) renderSkeleton(ctx, w, h, landmarks);
    else renderBlank(ctx, w, h);
  }
  if (wantDepth) {
    await depth.renderTo(frameCanvas, depthCanvas.getContext('2d'), w, h, colormap);
  }
  if (wantComposite) {
    const ctx = compCanvas.getContext('2d');
    ctx.drawImage(depthCanvas, 0, 0);
    ctx.drawImage(skelCanvas, w, 0);
  }
  if (flag.cancelled) throw new Cancellation();

  const imageBlobs = {};
  if (wantDepth) imageBlobs.depth = await canvasToBlob(depthCanvas);
  if (wantSkeleton) imageBlobs.skeleton = await canvasToBlob(skelCanvas);
  if (wantComposite) imageBlobs.sidebyside = await canvasToBlob(compCanvas);

  onPreview?.(compCanvas || depthCanvas || skelCanvas, landmarks, world);
  onProgress?.({ frame: 1, total: 1, fps: 0, eta: '' });
  return {
    imageBlobs,
    poseFrames: [{
      frame: 0,
      timestamp: 0,
      detected: !!landmarks,
      landmarks: world ? world.map(compactLm) : null,
      normalizedLandmarks: landmarks ? landmarks.map(compactLm) : null,
    }],
    stats: {
      frames: 1,
      fps: 0,
      width: w,
      height: h,
      missedFrames: landmarks ? 0 : 1,
      seconds: +(performance.now() - t0).toFixed(0) / 1000,
    },
  };
}

function mkCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Could not encode the processed image as PNG.'));
    }, 'image/png');
  });
}

const compactLm = (lm) => ({
  x: +lm.x.toFixed(5),
  y: +lm.y.toFixed(5),
  z: +lm.z.toFixed(5),
  visibility: +(lm.visibility ?? 0).toFixed(3),
});
