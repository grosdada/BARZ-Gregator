/**
 * skeleton2d.js — OpenPose-style 2D skeleton renderer.
 *
 * Draws colored bones + joint dots on a solid black background. This is the
 * conditioning image fed to Seedance / ControlNet-style pose control, so the
 * style intentionally mimics OpenPose output: fat rounded limbs, per-limb hue.
 */
import { POSE_CONNECTIONS, JOINT_COLORS } from './constants.js';

const VISIBILITY_MIN = 0.35; // hide limbs whose endpoints MediaPipe can't see

/**
 * Render one frame.
 * @param {CanvasRenderingContext2D} ctx destination context
 * @param {number} w canvas width
 * @param {number} h canvas height
 * @param {Array<{x,y,visibility}>|null} landmarks normalized landmarks (0..1)
 * @param {{glow?:boolean}} opts
 */
export function renderSkeleton(ctx, w, h, landmarks, opts = {}) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  if (!landmarks) return;

  const boneWidth = Math.max(3, Math.round(Math.min(w, h) / 110));
  const jointR = Math.max(2.5, Math.min(w, h) / 130);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const pt = (lm) => ({ x: lm.x * w, y: lm.y * h, v: lm.visibility ?? 1 });

  // Bones
  for (const [a, b, color] of POSE_CONNECTIONS) {
    const pa = pt(landmarks[a]);
    const pb = pt(landmarks[b]);
    if (pa.v < VISIBILITY_MIN || pb.v < VISIBILITY_MIN) continue;
    ctx.strokeStyle = color;
    ctx.lineWidth = boneWidth;
    if (opts.glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = boneWidth * 1.5;
    }
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  // Joints
  for (let i = 0; i < landmarks.length; i++) {
    const p = pt(landmarks[i]);
    if (p.v < VISIBILITY_MIN) continue;
    ctx.fillStyle = JOINT_COLORS[i];
    ctx.beginPath();
    ctx.arc(p.x, p.y, jointR, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Paint the "no pose" placeholder used when a frame has no detection. */
export function renderBlank(ctx, w, h) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
}
