/**
 * motion.js — derives a natural-language motion description from pose data.
 *
 * Works on the per-frame world landmarks (metric meters, hip-centered) that
 * the pipeline collects. Strategy: compute per-frame kinematic features,
 * classify one-second windows, merge adjacent windows with the same label,
 * then verbalize the segments as a cinematic motion timeline.
 */
import { LM } from './constants.js';

const avg = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 });
const dist3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/**
 * @param {Array} poseFrames pipeline output: [{timestamp, landmarks|null, ...}]
 * @param {number} fps
 * @returns {{text:string, segments:Array}}
 */
export function analyzeMotion(poseFrames, fps) {
  const frames = poseFrames.filter((p) => p.landmarks);
  if (frames.length < Math.max(4, fps / 2)) {
    return {
      text:
        'The subject holds a mostly static pose with subtle natural sway and micro-movements.',
      segments: [],
    };
  }

  // ---- per-frame features --------------------------------------------------
  const feats = [];
  for (let i = 1; i < frames.length; i++) {
    const a = frames[i - 1].landmarks;
    const b = frames[i].landmarks;
    const dt = Math.max(1e-3, frames[i].timestamp - frames[i - 1].timestamp);

    const hipA = avg(a[LM.L_HIP], a[LM.R_HIP]);
    const hipB = avg(b[LM.L_HIP], b[LM.R_HIP]);

    // Torso yaw from the shoulder line projected on the ground plane.
    const yaw = (lm) =>
      Math.atan2(lm[LM.R_SHOULDER].z - lm[LM.L_SHOULDER].z, lm[LM.R_SHOULDER].x - lm[LM.L_SHOULDER].x);
    let dyaw = yaw(b) - yaw(a);
    if (dyaw > Math.PI) dyaw -= 2 * Math.PI;
    if (dyaw < -Math.PI) dyaw += 2 * Math.PI;

    // Ankles move relative to the hips (world space is hip-centered, so
    // locomotion shows up as leg motion rather than root translation).
    const ankleSpeed =
      (dist3(a[LM.L_ANKLE], b[LM.L_ANKLE]) + dist3(a[LM.R_ANKLE], b[LM.R_ANKLE])) / 2 / dt;
    // Opposition: walking swings ankles in anti-phase along z.
    const opposition =
      Math.abs(
        (b[LM.L_ANKLE].z - a[LM.L_ANKLE].z) - (b[LM.R_ANKLE].z - a[LM.R_ANKLE].z)
      ) / dt;

    const wristSpeed =
      (dist3(a[LM.L_WRIST], b[LM.L_WRIST]) + dist3(a[LM.R_WRIST], b[LM.R_WRIST])) / 2 / dt;

    const shoulderY = (b[LM.L_SHOULDER].y + b[LM.R_SHOULDER].y) / 2;
    const armsRaised =
      b[LM.L_WRIST].y < shoulderY - 0.05 || b[LM.R_WRIST].y < shoulderY - 0.05; // y is down

    feats.push({
      t: frames[i].timestamp,
      yawRate: dyaw / dt,
      ankleSpeed,
      opposition,
      wristSpeed,
      hipRise: -(hipB.y - hipA.y) / dt, // + = moving up
      armsRaised,
    });
  }

  // ---- classify 1-second windows -------------------------------------------
  const duration = frames[frames.length - 1].timestamp;
  const windows = [];
  for (let start = 0; start < duration; start += 1) {
    const fs = feats.filter((f) => f.t >= start && f.t < start + 1);
    if (!fs.length) continue;
    const mean = (k) => fs.reduce((s, f) => s + f[k], 0) / fs.length;
    const ankle = mean('ankleSpeed');
    const opp = mean('opposition');
    const wrist = mean('wristSpeed');
    const yawRate = mean('yawRate');
    const hipRise = mean('hipRise');
    const raised = fs.filter((f) => f.armsRaised).length / fs.length > 0.5;

    const labels = [];
    if (ankle > 0.9 && opp > 0.7) labels.push('running');
    else if (ankle > 0.35 && opp > 0.25) labels.push('walking');
    if (Math.abs(yawRate) > 0.7)
      labels.push(yawRate > 0 ? 'turning-left' : 'turning-right');
    if (Math.abs(hipRise) > 0.35) labels.push(hipRise > 0 ? 'rising' : 'lowering');
    if (raised) labels.push('arms-raised');
    else if (wrist > 0.45) labels.push('gesturing');
    if (!labels.length) labels.push('standing');

    windows.push({ start, end: Math.min(start + 1, duration), labels });
  }

  // ---- merge adjacent windows with identical labels -------------------------
  const segments = [];
  for (const wdw of windows) {
    const key = wdw.labels.join('+');
    const last = segments[segments.length - 1];
    if (last && last.key === key) last.end = wdw.end;
    else segments.push({ key, start: wdw.start, end: wdw.end, labels: wdw.labels });
  }

  // ---- verbalize -------------------------------------------------------------
  const phrase = (labels) => {
    const parts = [];
    if (labels.includes('running')) parts.push('runs with long, energetic strides');
    else if (labels.includes('walking')) parts.push('walks with a natural, steady gait');
    if (labels.includes('turning-left')) parts.push('turning the torso toward screen-left');
    if (labels.includes('turning-right')) parts.push('turning the torso toward screen-right');
    if (labels.includes('rising')) parts.push('rising upward');
    if (labels.includes('lowering')) parts.push('lowering into a crouch');
    if (labels.includes('arms-raised')) parts.push('with arms lifted above shoulder height');
    else if (labels.includes('gesturing')) parts.push('gesturing expressively with the hands');
    if (!parts.length) parts.push('stands nearly still with relaxed, natural sway');
    return parts.join(', ');
  };

  const lines = segments.map(
    (s) => `from ${s.start.toFixed(1)}s to ${s.end.toFixed(1)}s the subject ${phrase(s.labels)}`
  );
  let text =
    lines.length === 1
      ? `Across the whole shot, ${lines[0].replace(/^from [\d.]+s to [\d.]+s /, '')}.`
      : `${capitalize(lines.join('; '))}.`;
  text += ' Motion is continuous and physically grounded, with believable weight shifts and momentum.';

  return { text, segments };
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
