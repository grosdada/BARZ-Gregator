/**
 * constants.js — pinned CDN URLs, pose topology, colors and colormaps.
 * Everything the rest of the app treats as configuration lives here.
 */

// ---------------------------------------------------------------------------
// Local vendored endpoints (Prompt Atlas integration — everything OFFLINE).
// Originally pinned CDN URLs; now resolved against assets/vendor/ so the app
// works with no network inside the Electron shell. The ffmpeg.wasm entries are
// gone on purpose: its @ffmpeg/core bundles libx264 (GPL) — MP4 conversion now
// goes through the app server's LGPL ffmpeg (see mp4.js).
// ---------------------------------------------------------------------------
const V = (p) => new URL("../../../vendor/" + p, import.meta.url).href;
export const CDN = {
  mediapipeVision: V('mediapipe/tasks-vision/vision_bundle.mjs'),
  mediapipeWasm: V('mediapipe/tasks-vision/wasm'),
  poseModel: V('models/mediapipe/pose_landmarker_full.task'),
  transformers: V('transformers/transformers.min.js'),
  transformersModels: V('models/'),
  transformersWasm: V('transformers/'),
  depthModel: 'onnx-community/depth-anything-v2-small',
  webmMuxer: V('webm-muxer/webm-muxer.mjs'),
};

// ---------------------------------------------------------------------------
// MediaPipe Pose: 33 landmarks
// ---------------------------------------------------------------------------
export const LANDMARK_NAMES = [
  'nose', 'left_eye_inner', 'left_eye', 'left_eye_outer', 'right_eye_inner',
  'right_eye', 'right_eye_outer', 'left_ear', 'right_ear', 'mouth_left',
  'mouth_right', 'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
  'left_wrist', 'right_wrist', 'left_pinky', 'right_pinky', 'left_index',
  'right_index', 'left_thumb', 'right_thumb', 'left_hip', 'right_hip',
  'left_knee', 'right_knee', 'left_ankle', 'right_ankle', 'left_heel',
  'right_heel', 'left_foot_index', 'right_foot_index',
];

/**
 * Full 33-landmark skeleton topology (POSE_CONNECTIONS) with an
 * OpenPose-style color per bone. Grouped: head, torso, arms, legs.
 * Each entry: [a, b, cssColor]
 */
export const POSE_CONNECTIONS = [
  // Head — magentas / violets
  [0, 1, '#d946ef'], [1, 2, '#e879f9'], [2, 3, '#f0abfc'], [3, 7, '#f5d0fe'],
  [0, 4, '#8b5cf6'], [4, 5, '#a78bfa'], [5, 6, '#c4b5fd'], [6, 8, '#ddd6fe'],
  [9, 10, '#f43f5e'],
  // Torso — warm reds / ambers
  [11, 12, '#ef4444'], [11, 23, '#f97316'], [12, 24, '#f59e0b'], [23, 24, '#eab308'],
  // Left arm — greens
  [11, 13, '#16a34a'], [13, 15, '#22c55e'],
  [15, 17, '#4ade80'], [15, 19, '#4ade80'], [15, 21, '#86efac'], [17, 19, '#bbf7d0'],
  // Right arm — yellows / oranges
  [12, 14, '#facc15'], [14, 16, '#fbbf24'],
  [16, 18, '#fde047'], [16, 20, '#fde047'], [16, 22, '#fef08a'], [18, 20, '#fef9c3'],
  // Left leg — cyans
  [23, 25, '#0891b2'], [25, 27, '#06b6d4'],
  [27, 29, '#22d3ee'], [29, 31, '#67e8f9'], [27, 31, '#a5f3fc'],
  // Right leg — blues
  [24, 26, '#2563eb'], [26, 28, '#3b82f6'],
  [28, 30, '#60a5fa'], [30, 32, '#93c5fd'], [28, 32, '#bfdbfe'],
];

/** Joint dot colors (index-aligned with landmarks). Head white, body per side. */
export const JOINT_COLORS = LANDMARK_NAMES.map((name, i) => {
  if (i <= 10) return '#f8fafc'; // face
  if (name.startsWith('left')) return '#34d399';
  if (name.startsWith('right')) return '#fbbf24';
  return '#f8fafc';
});

// Landmarks that matter for motion analysis
export const LM = {
  NOSE: 0, L_SHOULDER: 11, R_SHOULDER: 12, L_ELBOW: 13, R_ELBOW: 14,
  L_WRIST: 15, R_WRIST: 16, L_HIP: 23, R_HIP: 24, L_KNEE: 25, R_KNEE: 26,
  L_ANKLE: 27, R_ANKLE: 28,
};

// ---------------------------------------------------------------------------
// Output presets
// ---------------------------------------------------------------------------
export const RESOLUTIONS = [
  { id: 'source', label: 'Match source (≤1280)' },
  { id: '1920x1080', label: '1920 × 1080', w: 1920, h: 1080 },
  { id: '1280x720', label: '1280 × 720', w: 1280, h: 720 },
  { id: '1024x576', label: '1024 × 576', w: 1024, h: 576 },
  { id: '768x768', label: '768 × 768', w: 768, h: 768 },
  { id: '512x512', label: '512 × 512', w: 512, h: 512 },
];

export const FPS_OPTIONS = [8, 12, 16, 24, 30];

// ---------------------------------------------------------------------------
// Colormaps — 256-entry RGB LUTs built once at module load
// ---------------------------------------------------------------------------
function buildLUT(fn) {
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const [r, g, b] = fn(i / 255);
    lut[i * 3] = r * 255;
    lut[i * 3 + 1] = g * 255;
    lut[i * 3 + 2] = b * 255;
  }
  return lut;
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Google "Turbo" colormap, 5th-order polynomial approximation. */
function turbo(t) {
  const r = 0.13572138 + t * (4.6153926 + t * (-42.66032258 + t * (132.13108234 + t * (-152.94239396 + t * 59.28637943))));
  const g = 0.09140261 + t * (2.19418839 + t * (4.84296658 + t * (-14.18503333 + t * (4.27729857 + t * 2.82956604))));
  const b = 0.1066733 + t * (12.64194608 + t * (-60.58204836 + t * (110.36276771 + t * (-89.90310912 + t * 27.34824973))));
  return [clamp01(r), clamp01(g), clamp01(b)];
}

/** Matplotlib "Inferno", piecewise-linear over sampled anchors. */
const INFERNO_ANCHORS = [
  [0, 0, 4], [22, 11, 57], [66, 10, 104], [106, 23, 110], [147, 38, 103],
  [188, 55, 84], [221, 81, 58], [243, 120, 25], [252, 165, 10], [246, 215, 70],
  [252, 255, 164],
];
function inferno(t) {
  const pos = clamp01(t) * (INFERNO_ANCHORS.length - 1);
  const i = Math.min(Math.floor(pos), INFERNO_ANCHORS.length - 2);
  const f = pos - i;
  const a = INFERNO_ANCHORS[i];
  const b = INFERNO_ANCHORS[i + 1];
  return [
    (a[0] + (b[0] - a[0]) * f) / 255,
    (a[1] + (b[1] - a[1]) * f) / 255,
    (a[2] + (b[2] - a[2]) * f) / 255,
  ];
}

export const COLORMAPS = {
  gray: buildLUT((t) => [t, t, t]),
  turbo: buildLUT(turbo),
  inferno: buildLUT(inferno),
};
