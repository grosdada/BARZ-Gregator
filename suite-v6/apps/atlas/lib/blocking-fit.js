// Shared Blocking-fit math — pure ESM, no dependencies, runs in Node AND the browser.
// Single source of truth for the geometry the Blocking Solver does: select MoGe points under a
// SAM mask, trim outliers, fit a ground-projected oriented box (PCA -> yaw, extents -> size),
// RANSAC the floor plane and re-orient to Y-up, and emit the docs/AUTO-BLOCKING.md scene schema.
//
// World convention: three.js space — x-right, y-up, z-back. "Ground" is the horizontal x-z
// plane; y is up. Callers feed points already converted from MoGe/OpenCV (x, -y, -z).

// Detection label -> primitive type (defaults; the queries that yield these labels are editable
// upstream). Anything unmapped falls back to "box".
export const PRIM_MAP = {
  person: "human", car: "car", truck: "bus", bus: "bus", van: "bus", motorcycle: "box", bicycle: "box",
  building: "facade", wall: "facade", door: "facade", window: "facade", facade: "facade",
  tree: "cylinder", plant: "cylinder", pole: "cylinder", "street sign": "cylinder", "traffic light": "cylinder",
  ball: "sphere", box: "box", crate: "box", container: "box", barrel: "box",
  table: "box", chair: "box", bench: "box"
};
export function primitiveForLabel(label) { return PRIM_MAP[String(label || "").toLowerCase()] || "box"; }

// P5: sanity-check the label-chosen primitive against the fitted dimensions. A "car"
// whose footprint is square or tiny is NOT a car (usually a part/cab misdetection) — a
// plain box misleads less than a wrongly-oriented vehicle. Same for implausible humans.
export function sanitizePrimitive(primitive, fit) {
  const major = Math.max(fit.sizeU, fit.sizeV), minor = Math.min(fit.sizeU, fit.sizeV);
  if ((primitive === "car" || primitive === "bus") && (major < 1.8 || major / Math.max(minor, 1e-3) < 1.35)) return "box";
  if (primitive === "human" && (fit.sizeY < 0.8 || fit.sizeY > 2.6)) return "box";
  return primitive;
}

export const r3 = (v) => Math.round(v * 1000) / 1000;
export const r1 = (v) => Math.round(v * 10) / 10;
export const radToDeg = (r) => r * 180 / Math.PI;
export function rgbToHex(c) { return "#" + c.map((x) => Math.max(0, Math.min(255, x | 0)).toString(16).padStart(2, "0")).join(""); }

export function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const i = (sorted.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

// Smallest-eigenvalue eigenvector of a symmetric 3x3 covariance [cxx,cxy,cxz,cyy,cyz,czz] =
// best-fit plane normal. Power-iterate on (trace*I - C) so the smallest eigenpair dominates.
export function smallestEigvec3(C) {
  const [cxx, cxy, cxz, cyy, cyz, czz] = C, k = cxx + cyy + czz + 1e-9;
  const m = [k - cxx, -cxy, -cxz, -cxy, k - cyy, -cyz, -cxz, -cyz, k - czz];
  let vx = 0, vy = 1, vz = 0;
  for (let it = 0; it < 50; it++) {
    const x = m[0] * vx + m[1] * vy + m[2] * vz, y = m[3] * vx + m[4] * vy + m[5] * vz, z = m[6] * vx + m[7] * vy + m[8] * vz;
    const L = Math.hypot(x, y, z) || 1; vx = x / L; vy = y / L; vz = z / L;
  }
  return [vx, vy, vz];
}

// Quaternion rotating unit a -> unit b, matching THREE.Quaternion.setFromUnitVectors. Returns
// [x,y,z,w]. So the browser solver and Node produce identical rotations.
export function quatFromUnitVectors(ax, ay, az, bx, by, bz) {
  let r = ax * bx + ay * by + az * bz + 1, x, y, z;
  if (r < 1e-8) { r = 0; if (Math.abs(ax) > Math.abs(az)) { x = -ay; y = ax; z = 0; } else { x = 0; y = -az; z = ay; } }
  else { x = ay * bz - az * by; y = az * bx - ax * bz; z = ax * by - ay * bx; }
  const L = Math.hypot(x, y, z, r) || 1;
  return [x / L, y / L, z / L, r / L];
}
// Rotate vector (x,y,z) by quaternion [qx,qy,qz,qw]. Matches THREE.Vector3.applyQuaternion.
export function applyQuat(q, x, y, z) {
  const [qx, qy, qz, qw] = q;
  const ix = qw * x + qy * z - qz * y, iy = qw * y + qz * x - qx * z, iz = qw * z + qx * y - qy * x, iw = -qx * x - qy * y - qz * z;
  return [
    ix * qw + iw * -qx + iy * -qz - iz * -qy,
    iy * qw + iw * -qy + iz * -qx - ix * -qz,
    iz * qw + iw * -qz + ix * -qy - iy * -qx
  ];
}

// Collect cloud points whose source pixel falls under a mask (Uint8 W*H, 0/255).
export function selectMaskPoints(pos, coords, W, H, mask) {
  const xs = [], ys = [], zs = [], n = coords.length / 2;
  for (let i = 0; i < n; i++) {
    const px = coords[i * 2], py = coords[i * 2 + 1];
    if (px >= W || py >= H) continue;
    if (mask[py * W + px]) { xs.push(pos[i * 3]); ys.push(pos[i * 3 + 1]); zs.push(pos[i * 3 + 2]); }
  }
  return { xs, ys, zs };
}

// Outlier-trimmed, ground-projected oriented box. Returns {error} when too few points.
// minPts: the automated pipeline raises it (P5) — a fit on a handful of cloud points is
// noise; the interactive tool keeps the permissive default.
export function fitObject(xs, ys, zs, minPts = 12) {
  const total = xs.length;
  if (total < minPts) return { error: `only ${total} pts under mask` };
  let mx = 0, my = 0, mz = 0;
  for (let i = 0; i < total; i++) { mx += xs[i]; my += ys[i]; mz += zs[i]; }
  mx /= total; my /= total; mz /= total;
  const d2 = new Array(total);
  for (let i = 0; i < total; i++) { const dx = xs[i] - mx, dy = ys[i] - my, dz = zs[i] - mz; d2[i] = dx * dx + dy * dy + dz * dz; }
  const dcut = percentile([...d2].sort((a, b) => a - b), 0.90);
  const kx = [], ky = [], kz = [];
  for (let i = 0; i < total; i++) if (d2[i] <= dcut) { kx.push(xs[i]); ky.push(ys[i]); kz.push(zs[i]); }
  const k = kx.length;
  let cmx = 0, cmz = 0;
  for (let i = 0; i < k; i++) { cmx += kx[i]; cmz += kz[i]; }
  cmx /= k; cmz /= k;
  let sxx = 0, sxz = 0, szz = 0;
  for (let i = 0; i < k; i++) { const dx = kx[i] - cmx, dz = kz[i] - cmz; sxx += dx * dx; sxz += dx * dz; szz += dz * dz; }
  sxx /= k; sxz /= k; szz /= k;
  const tr = sxx + szz, det = sxx * szz - sxz * sxz, disc = Math.sqrt(Math.max(0, tr * tr / 4 - det)), l1 = tr / 2 + disc;
  let ux, uz;
  if (Math.abs(sxz) > 1e-9) { ux = l1 - szz; uz = sxz; } else if (sxx >= szz) { ux = 1; uz = 0; } else { ux = 0; uz = 1; }
  const ul = Math.hypot(ux, uz) || 1; ux /= ul; uz /= ul;
  const vx = -uz, vz = ux;
  const pu = [], pv = [];
  for (let i = 0; i < k; i++) { const dx = kx[i] - cmx, dz = kz[i] - cmz; pu.push(dx * ux + dz * uz); pv.push(dx * vx + dz * vz); }
  const us = [...pu].sort((a, b) => a - b), vs = [...pv].sort((a, b) => a - b), ysrt = [...ky].sort((a, b) => a - b);
  const uLo = percentile(us, 0.02), uHi = percentile(us, 0.98);
  const vLo = percentile(vs, 0.02), vHi = percentile(vs, 0.98);
  const yLo = percentile(ysrt, 0.02), yHi = percentile(ysrt, 0.98);
  const sizeU = Math.max(uHi - uLo, 1e-3), sizeV = Math.max(vHi - vLo, 1e-3), sizeY = Math.max(yHi - yLo, 1e-3);
  const cU = (uHi + uLo) / 2, cV = (vHi + vLo) / 2;
  const yaw = Math.atan2(-uz, ux);
  return {
    sizeU, sizeV, sizeY, yaw, kept: k, total,
    center: { x: cmx + cU * ux + cV * vx, z: cmz + cU * uz + cV * vz, baseY: yLo, topY: yHi, midY: (yLo + yHi) / 2 }
  };
}

// RANSAC the dominant near-horizontal floor plane, refine its normal by least squares, and
// return the transform that rotates that normal -> +Y and drops the floor to y=0. Does NOT
// mutate `pos`. randFn defaults to Math.random (override for determinism).
export function groundTransform(pos, randFn = Math.random) {
  const n = pos.length / 3;
  if (n < 24) return { ok: false, error: "too few points" };
  let minX = 1e9, minY = 1e9, minZ = 1e9, maxX = -1e9, maxY = -1e9, maxZ = -1e9;
  const ys = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2]; ys[i] = y;
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  const diag = Math.hypot(maxX - minX, maxY - minY, maxZ - minZ);
  const eps = Math.max(1e-3, diag * 0.012);
  const medY = [...ys].sort((a, b) => a - b)[n >> 1];
  const rnd = () => (randFn() * n) | 0, step = Math.max(1, (n / 4000) | 0);
  let best = null;
  for (let it = 0; it < 500; it++) {
    const a = rnd(), b = rnd(), c = rnd(); if (a === b || b === c || a === c) continue;
    const ax = pos[a * 3], ay = pos[a * 3 + 1], az = pos[a * 3 + 2];
    const e1x = pos[b * 3] - ax, e1y = pos[b * 3 + 1] - ay, e1z = pos[b * 3 + 2] - az;
    const e2x = pos[c * 3] - ax, e2y = pos[c * 3 + 1] - ay, e2z = pos[c * 3 + 2] - az;
    let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
    const nl = Math.hypot(nx, ny, nz); if (nl < 1e-9) continue; nx /= nl; ny /= nl; nz /= nl;
    if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
    if (ny < 0.80) continue;
    const d = nx * ax + ny * ay + nz * az;
    if (d > medY) continue;
    let cnt = 0;
    for (let i = 0; i < n; i += step) { const dist = nx * pos[i * 3] + ny * pos[i * 3 + 1] + nz * pos[i * 3 + 2] - d; if (dist < eps && dist > -eps) cnt++; }
    if (!best || cnt > best.cnt) best = { nx, ny, nz, d, cnt };
  }
  if (!best || best.cnt < 20) return { ok: false, error: "no dominant floor plane" };
  let { nx, ny, nz, d } = best, sx = 0, sy = 0, sz = 0, ni = 0;
  for (let i = 0; i < n; i++) { const dist = nx * pos[i * 3] + ny * pos[i * 3 + 1] + nz * pos[i * 3 + 2] - d; if (dist < eps && dist > -eps) { sx += pos[i * 3]; sy += pos[i * 3 + 1]; sz += pos[i * 3 + 2]; ni++; } }
  sx /= ni; sy /= ni; sz /= ni;
  let cxx = 0, cxy = 0, cxz = 0, cyy = 0, cyz = 0, czz = 0;
  for (let i = 0; i < n; i++) { const dist = nx * pos[i * 3] + ny * pos[i * 3 + 1] + nz * pos[i * 3 + 2] - d; if (dist < eps && dist > -eps) { const dx = pos[i * 3] - sx, dy = pos[i * 3 + 1] - sy, dz = pos[i * 3 + 2] - sz; cxx += dx * dx; cxy += dx * dy; cxz += dx * dz; cyy += dy * dy; cyz += dy * dz; czz += dz * dz; } }
  let [rnx, rny, rnz] = smallestEigvec3([cxx, cxy, cxz, cyy, cyz, czz]);
  if (rny < 0) { rnx = -rnx; rny = -rny; rnz = -rnz; }
  const rd = rnx * sx + rny * sy + rnz * sz;
  const quat = quatFromUnitVectors(rnx, rny, rnz, 0, 1, 0);
  return { ok: true, quat, d: rd, eps, normal: [rnx, rny, rnz], inliers: best.cnt, tiltDeg: radToDeg(Math.acos(Math.min(1, ny))) };
}
// Apply a groundTransform result to a flat positions array in place; returns the x-z centroid.
export function applyTransformToArray(pos, quat, d) {
  const n = pos.length / 3; let cx = 0, cz = 0;
  for (let i = 0; i < n; i++) {
    const r = applyQuat(quat, pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
    pos[i * 3] = r[0]; pos[i * 3 + 1] = r[1] - d; pos[i * 3 + 2] = r[2]; cx += r[0]; cz += r[2];
  }
  return { cx: cx / n, cz: cz / n };
}

// Metric extents of each primitive along its LOCAL axes (export scale, meters).
// Vehicles (car/bus): the FIT's major axis is U (local x by construction), but the
// studio's car/bus geometry is LONG ALONG LOCAL Z (front = +Z). P3: give z the major
// extent and yaw+90° so the vehicle's length — and its front/back asymmetry — actually
// lie along the fitted long axis (this was the structural half of the "car backwards"
// bug; the sign half is resolved by the 4-way reprojection test).
export function primDims(type, fit) {
  const { sizeU, sizeV, sizeY } = fit, rH = Math.max(sizeU, sizeV);
  switch (type) {
    case "box": case "facade": return [sizeU, sizeY, sizeV];
    case "car": case "bus": return [sizeV, sizeY, sizeU];
    case "cylinder": case "human": case "cone": case "pyramid": return [rH, sizeY, rH];
    case "sphere": { const dd = Math.max(sizeU, sizeV, sizeY); return [dd, dd, dd]; }
    case "dome": return [rH, rH / 2, rH];
    case "torus": return [rH, rH * 0.6, rH];
    case "plane": return [sizeU, sizeY, 0.02];
    default: return [sizeU, sizeY, sizeV];
  }
}
// Euler rotation (degrees, XYZ) matching the solver's mesh build for each primitive.
export function primRotation(type, yaw) {
  const y = radToDeg(yaw);
  switch (type) {
    case "cylinder": case "human": return [0, 0, 0];
    case "car": case "bus": return [0, radToDeg(yaw + Math.PI / 2), 0];   // local z = fitted major axis
    case "pyramid": return [0, radToDeg(yaw + Math.PI / 4), 0];
    case "torus": return [90, y, 0];
    default: return [0, y, 0];   // box/facade/sphere/dome/cone/plane
  }
}
// Mean RGB of an image (Uint8 W*H*3) under a mask (Uint8 W*H).
export function meanColor(rgb, W, H, mask) {
  let r = 0, g = 0, b = 0, c = 0;
  for (let i = 0; i < W * H; i++) if (mask[i]) { r += rgb[i * 3]; g += rgb[i * 3 + 1]; b += rgb[i * 3 + 2]; c++; }
  if (!c) return [180, 180, 180];
  return [Math.round(r / c), Math.round(g / c), Math.round(b / c)];
}

// One docs/AUTO-BLOCKING.md object record (base on the ground, metric scale, degrees, hex,
// normalized image anchor).
export function objectRecord({ label, primitive, fit, color, bbox, width, height }) {
  const anchor = bbox ? [r3(((bbox[0] + bbox[2]) / 2) / width), r3(((bbox[1] + bbox[3]) / 2) / height)] : [0.5, 0.5];
  return {
    type: primitive, label,
    position: [r3(fit.center.x), r3(fit.center.baseY), r3(fit.center.z)],
    rotation: primRotation(primitive, fit.yaw).map(r1),
    scale: primDims(primitive, fit).map(r3),
    color: rgbToHex(color),
    image_anchor: anchor
  };
}
// MoGe vertical FoV -> 35mm-equivalent focal (full-frame 24mm sensor height).
export function focalMmFromFov(fovDeg) {
  const fovY = (fovDeg || 50) * Math.PI / 180;
  return Math.max(8, Math.min(200, 12 / Math.tan(fovY / 2)));
}

// Full pipeline assembly from already-computed geometry + detections+masks. `points` are in
// three world space (caller converted MoGe OpenCV -> three). `detections` = [{label, box,
// mask(Uint8 W*H), score?}]. Returns { scene, meta }.
export function assembleScene({ width, height, fovDeg, points, coords, rgb, detections, randFn, minPts = 12 }) {
  const pos = points instanceof Float32Array ? points : Float32Array.from(points);
  const gt = groundTransform(pos, randFn);
  let camPos, target, camQuat;
  if (gt.ok) {
    const c = applyTransformToArray(pos, gt.quat, gt.d);
    const o = applyQuat(gt.quat, 0, 0, 0);
    camPos = [r3(o[0]), r3(o[1] - gt.d), r3(o[2])];
    // Exact camera orientation (P1): the MoGe camera IS the origin with identity axes in
    // three space, so after ground alignment its world orientation is exactly gt.quat.
    camQuat = gt.quat.map(r3);
    // aligned cloud centroid (y) for the look-at target
    let cy = 0; const n = pos.length / 3; for (let i = 0; i < n; i++) cy += pos[i * 3 + 1]; cy /= n;
    target = [r3(c.cx), r3(cy), r3(c.cz)];
  } else {
    let cx = 0, cy = 0, cz = 0; const n = pos.length / 3;
    for (let i = 0; i < n; i++) { cx += pos[i * 3]; cy += pos[i * 3 + 1]; cz += pos[i * 3 + 2]; }
    cx /= n; cy /= n; cz /= n; camPos = [0, 0, 0]; target = [r3(cx), r3(cy), r3(cz)];
    camQuat = [0, 0, 0, 1];   // raw MoGe frame: camera at origin looking down -Z
  }
  const objects = [], skipped = [], objectDetIndex = [];
  // P2: the ground band to strip from object masks — SAM box prompts routinely include a
  // strip of floor/shadow around the contact, which drags baseY down, stretches the
  // footprint and pollutes the PCA yaw. The plane is known; the band must stay PHYSICAL
  // (a few cm) — the RANSAC eps scales with the cloud diagonal and would swallow whole
  // objects on open scenes, so it only bounds the band from below.
  const groundBand = gt.ok ? Math.max(0.02, Math.min(0.08, (gt.eps || 0.03) * 0.5)) : 0;
  for (let di = 0; di < detections.length; di++) {
    const d = detections[di];
    let primitive = d.primitive || primitiveForLabel(d.label);
    let { xs, ys, zs } = selectMaskPoints(pos, coords, width, height, d.mask);
    if (groundBand > 0) {
      const fx = [], fy = [], fz = [];
      for (let i = 0; i < ys.length; i++) if (ys[i] > groundBand) { fx.push(xs[i]); fy.push(ys[i]); fz.push(zs[i]); }
      // keep the strip only if enough of the object survives (thin/flat objects keep all)
      if (fy.length >= 12 && fy.length >= ys.length * 0.25) { xs = fx; ys = fy; zs = fz; }
    }
    const fit = fitObject(xs, ys, zs, minPts);
    if (fit.error) { skipped.push({ label: d.label, reason: fit.error }); continue; }
    primitive = sanitizePrimitive(primitive, fit);   // P5: dims veto the label's primitive
    // P2: objects rest ON the ground — pin the base at y=0 (keeps the observed top).
    if (gt.ok && fit.center.baseY < 0.4 && fit.center.baseY > -0.4) {
      fit.sizeY = Math.max(0.05, fit.center.topY);
      fit.center.baseY = 0;
    }
    const color = meanColor(rgb, width, height, d.mask);
    objects.push(objectRecord({ label: d.label, primitive, fit, color, bbox: d.box, width, height }));
    objectDetIndex.push(di);
  }
  const scene = {
    objects,
    // P1: `quaternion` (exact orientation) + `fov_deg` (the measured vertical FOV — the
    // quantity the solver actually recovers) travel alongside the legacy `target` +
    // `focal_mm` so older consumers keep working.
    camera: { focal_mm: r1(focalMmFromFov(fovDeg)), fov_deg: r1(fovDeg || 50), quaternion: camQuat, position: camPos, target },
    notes: `Blocking Solver engine · ${objects.length} object(s)${gt.ok ? ` · ground y=0 (tilt ${r1(gt.tiltDeg)}°)` : " · ground not found"}`
  };
  return { scene, meta: { grounded: gt.ok, inliers: gt.ok ? gt.inliers : 0, skipped, objectDetIndex, groundBand } };
}

// Erase from a SAM mask the pixels that sit on the GROUND (cloud point within `band` of
// y=0 after alignment): SAM box prompts bleed onto the floor/shadow around the contact,
// which pollutes both the fit and any IoU scored against the raw mask. `pos` must be the
// ground-aligned cloud, `coords` its source pixels; each ground point blanks a
// stride-sized block. Returns a new Uint8 mask.
export function stripGroundFromMask(mask, pos, coords, width, height, band, stride = 4) {
  const out = Uint8Array.from(mask);
  const n = coords.length / 2, r = Math.max(1, Math.floor(stride / 2));
  for (let i = 0; i < n; i++) {
    if (pos[i * 3 + 1] > band) continue;
    const px = coords[i * 2], py = coords[i * 2 + 1];
    for (let dy = -r; dy <= r; dy++) {
      const y = py + dy; if (y < 0 || y >= height) continue;
      for (let dx = -r; dx <= r; dx++) {
        const x = px + dx; if (x < 0 || x >= width) continue;
        out[y * width + x] = 0;
      }
    }
  }
  return out;
}
