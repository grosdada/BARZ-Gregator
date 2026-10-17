// Reprojection-driven refinement of an assembled Auto-Blocking scene — pure ESM,
// zero dependencies (imports the shared projector/IoU). Server-side today; written
// against plain scene JSON so the browser tool can adopt it later.
//
// P3: 4-way yaw disambiguation — the PCA axis has no sign (and near-square footprints
// barely have a direction), so each yaw-carrying object is tested at yaw + {0,90,180,270}°
// against its ground-stripped SAM mask and the best-reprojecting labeling wins. 90/270
// swap the footprint extents so all four hypotheses describe the SAME fitted OBB.

import { projectSilhouette, silhouetteMaskIoU } from "./reproject.js";

const YAWLESS = new Set(["cylinder", "human", "sphere", "dome", "cone", "null"]);

function iouFor(obj, mask, pose, scale = 0.5) {
  const sil = projectSilhouette(obj, pose, scale);
  return sil ? silhouetteMaskIoU(sil, mask, pose.width, pose.height) : 0;
}

// The four labelings of one fitted OBB: k=odd swaps x/z extents so the box stays the same.
function yawHypothesis(obj, k) {
  const o = { ...obj, rotation: [...(obj.rotation || [0, 0, 0])], scale: [...(obj.scale || [1, 1, 1])] };
  o.rotation[1] = ((o.rotation[1] || 0) + 90 * k) % 360;
  if (k % 2 === 1) { const t = o.scale[0]; o.scale[0] = o.scale[2]; o.scale[2] = t; }
  return o;
}

// Pose from the P1 camera fields. Returns null when the scene lacks them (no refinement).
export function poseFromCamera(camera, width, height) {
  const c = camera || {};
  if (!Array.isArray(c.quaternion) || c.quaternion.length !== 4 || !Number.isFinite(c.fov_deg)) return null;
  return { position: c.position || [0, 0, 0], quaternion: c.quaternion, fovYDeg: c.fov_deg, width, height };
}

// P3 entry point. `masks[i]` must align with `objects[i]` (caller maps via
// meta.objectDetIndex). Mutates the objects in place; returns per-object reports.
export function refineYaw4Way({ objects, masks, pose, minGain = 0.005 }) {
  const reports = [];
  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i], mask = masks[i];
    if (!mask || YAWLESS.has(String(obj.type || "").toLowerCase())) { reports.push(null); continue; }
    let bestK = 0, bestIoU = iouFor(obj, mask, pose);
    const iou0 = bestIoU;
    for (let k = 1; k < 4; k++) {
      const iou = iouFor(yawHypothesis(obj, k), mask, pose);
      if (iou > bestIoU + minGain) { bestIoU = iou; bestK = k; }
    }
    if (bestK !== 0) {
      const h = yawHypothesis(obj, bestK);
      obj.rotation = h.rotation; obj.scale = h.scale;
    }
    reports.push({ label: obj.label, k: bestK, iouBefore: iou0, iouAfter: bestIoU });
  }
  return reports;
}

/* ================= P6 — metric class priors =================
   Monocular clouds only cover the VISIBLE shell: the extent along the viewing ray is
   underestimated and the centre is pulled toward the camera. Silhouette IoU cannot see
   along the ray either — so this is fixed with metric priors per class, not optimisation:
   - too-thin extents grow AWAY from the camera (the visible face stays where observed),
   - implausible extents clamp toward the prior range (base stays pinned for heights),
   - detected humans give a global metric-scale check (median height vs 1.72 m). */
export const CLASS_PRIORS = {
  // length = the LARGER ground extent (axis-agnostic: the 4-way may emit either labeling),
  // width = the smaller one, height = y.
  car: { width: [1.55, 2.10], height: [1.25, 1.95], length: [3.60, 5.20] },
  bus: { width: [2.20, 2.60], height: [2.60, 3.60], length: [6.00, 13.0] },
  human: { width: [0.35, 0.85], height: [1.45, 1.95], length: [0.25, 0.70] }
};

export function applyClassPriors({ objects, camera }) {
  const camPos = camera?.position || [0, 0, 0];
  const reports = [];
  for (const obj of objects) {
    const prior = CLASS_PRIORS[String(obj.type || "").toLowerCase()];
    if (!prior) { reports.push(null); continue; }
    const yaw = ((obj.rotation?.[1] || 0) * Math.PI) / 180;
    // Ry(yaw) maps (x,z) -> (x cosθ + z sinθ, -x sinθ + z cosθ): local axes on the ground.
    const ex = [Math.cos(yaw), -Math.sin(yaw)];   // local +x in world (x, z)
    const ez = [Math.sin(yaw), Math.cos(yaw)];    // local +z in world (x, z)
    const away = [obj.position[0] - camPos[0], obj.position[2] - camPos[2]];
    const L = Math.hypot(away[0], away[1]) || 1; away[0] /= L; away[1] /= L;
    // Axis-agnostic role assignment: the larger ground extent is the LENGTH.
    const lengthIdx = (obj.scale[0] >= obj.scale[2]) ? 0 : 2;
    const widthIdx = lengthIdx === 0 ? 2 : 0;
    const axisOf = { 0: ex, 2: ez };
    const changed = [];
    const fixAxis = (idx, axis2d, key) => {
      const [lo, hi] = prior[key];
      const v = obj.scale[idx];
      let nv = v;
      if (v < lo) nv = lo; else if (v > hi) nv = hi;
      if (nv === v) return;
      if (axis2d) {
        // ground axis: keep the NEAR (visible) face fixed — shift the centre away from
        // the camera by half the growth, along ±axis (whichever points away).
        const s = Math.sign(axis2d[0] * away[0] + axis2d[1] * away[1]) || 1;
        const shift = s * (nv - v) / 2;
        obj.position[0] = Math.round((obj.position[0] + axis2d[0] * shift) * 1000) / 1000;
        obj.position[2] = Math.round((obj.position[2] + axis2d[1] * shift) * 1000) / 1000;
      }
      obj.scale[idx] = Math.round(nv * 1000) / 1000;   // heights grow up (base pinned)
      changed.push(`${key} ${v.toFixed(2)}→${nv.toFixed(2)}`);
    };
    fixAxis(lengthIdx, axisOf[lengthIdx], "length");
    fixAxis(widthIdx, axisOf[widthIdx], "width");
    fixAxis(1, null, "height");
    reports.push(changed.length ? { label: obj.label, changed } : null);
  }
  return reports;
}

// Global metric-scale correction from "meter-stick" classes: MoGe's metric_scale drifts
// by ±20-40%; detected humans (~1.72 m) and cars/buses (roof height ~1.48/3.1 m) anchor
// the true scale. Median ratio over all sticks, humans counted twice (most reliable).
// Reprojection-INVARIANT (everything scales along the rays) — never fights the IoU.
const METER_STICKS = { human: { h: 1.72, min: 0.8, max: 2.8, w: 2 }, car: { h: 1.48, min: 0.5, max: 2.6, w: 1 }, bus: { h: 3.1, min: 1.2, max: 5.5, w: 1 } };

export function scaleFromMeterSticks({ objects, camera }) {
  const ratios = [];
  for (const o of objects) {
    const stick = METER_STICKS[String(o.type).toLowerCase()];
    const h = o.scale?.[1];
    if (!stick || !(h > stick.min && h < stick.max)) continue;
    for (let i = 0; i < stick.w; i++) ratios.push(stick.h / h);
  }
  if (!ratios.length) return null;
  ratios.sort((a, b) => a - b);
  const k = ratios[ratios.length >> 1];
  if (Math.abs(k - 1) < 0.12) return null;                       // within tolerance: leave
  const kc = Math.max(0.6, Math.min(1.8, k));
  const r3v = (v) => Math.round(v * 1000) / 1000;
  for (const o of objects) {
    o.position = o.position.map((v) => r3v(v * kc));
    o.scale = o.scale.map((v) => r3v(v * kc));
  }
  if (camera?.position) camera.position = camera.position.map((v) => r3v(v * kc));
  if (camera?.target) camera.target = camera.target.map((v) => r3v(v * kc));
  return kc;
}
export { scaleFromMeterSticks as scaleFromHumans };   // back-compat alias

/* ================= P4 — bounded coordinate descent on the reprojection IoU =================
   Per object: greedy hill-climb over (x, z, yawDeg, sx, sy, sz) with shrinking steps.
   The base stays pinned (y untouched); every parameter is bounded around the fit so the
   optimizer polishes rather than reinvents. ~60-120 IoU evaluations per object, each on a
   reduced buffer -> a few tens of ms. Yawless prims skip the yaw axis. */
const P4_BOUNDS = { posM: 0.6, dimLo: 0.7, dimHi: 1.4 };
// Yaw is deliberately NOT descended: the bench showed continuous yaw optimisation drifts
// toward mask-erosion artefacts (contact/shadow bands) — GT yaw error got WORSE while IoU
// rose. The discrete 4-way test (P3) stays the only yaw mechanism.

export function refineDescent({ objects, masks, pose, passes = 3 }) {
  const reports = [];
  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i], mask = masks[i];
    if (!mask) { reports.push(null); continue; }
    const p0 = [...obj.position], s0 = [...obj.scale];
    const clampDim = (v, ref) => Math.max(ref * P4_BOUNDS.dimLo, Math.min(ref * P4_BOUNDS.dimHi, v));
    // Height (sy) is NOT descended: the ground-stripped mask is eroded at the bottom, so
    // the IoU rewards shrinking heights (same artefact class as yaw drift) while the top
    // edge — the reliable evidence — gets misaligned. Footprint + position only.
    const state = { x: p0[0], z: p0[2], sx: s0[0], sz: s0[2] };
    const evalState = () => iouFor({
      ...obj,
      position: [state.x, obj.position[1], state.z],
      scale: [state.sx, s0[1], state.sz]
    }, mask, pose);
    let cur = evalState();
    const iou0 = cur;
    // parameter spec: [key, initial step, clamp]
    const params = [
      ["x", 0.20, (v) => Math.max(p0[0] - P4_BOUNDS.posM, Math.min(p0[0] + P4_BOUNDS.posM, v))],
      ["z", 0.20, (v) => Math.max(p0[2] - P4_BOUNDS.posM, Math.min(p0[2] + P4_BOUNDS.posM, v))],
      ["sx", 0.15, (v) => clampDim(v, s0[0])],
      ["sz", 0.15, (v) => clampDim(v, s0[2])]
    ];
    for (let pass = 0; pass < passes; pass++) {
      const shrink = Math.pow(0.5, pass);
      for (const [key, step0, clamp] of params) {
        const step = step0 * shrink;
        for (const dir of [+1, -1]) {
          // walk while it improves (max 3 steps per direction per pass)
          for (let s = 0; s < 3; s++) {
            const prev = state[key];
            state[key] = clamp(prev + dir * step);
            if (state[key] === prev) break;
            const iou = evalState();
            if (iou > cur + 1e-4) { cur = iou; }
            else { state[key] = prev; break; }
          }
        }
      }
    }
    if (cur > iou0 + 1e-3) {
      obj.position[0] = Math.round(state.x * 1000) / 1000;
      obj.position[2] = Math.round(state.z * 1000) / 1000;
      obj.scale = [state.sx, s0[1], state.sz].map((v) => Math.round(v * 1000) / 1000);
    }
    reports.push({ label: obj.label, iouBefore: iou0, iouAfter: Math.max(cur, iou0) });
  }
  return reports;
}
