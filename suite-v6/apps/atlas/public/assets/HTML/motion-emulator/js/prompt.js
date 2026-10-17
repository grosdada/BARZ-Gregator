/**
 * prompt.js — Seedance prompt assembly.
 *
 * Combines the editable creative fields with the auto-derived motion
 * description into one precise cinematic paragraph, then appends the
 * control-signal instruction telling Seedance to follow the exported
 * depth map / pose skeleton.
 */

export const DEFAULT_FIELDS = {
  subject: 'a young dancer with an athletic build and expressive presence',
  wardrobe: 'a flowing charcoal-grey costume with subtle metallic accents',
  setting: 'a vast, minimal soundstage with a polished dark floor and drifting haze',
  lighting: 'dramatic low-key lighting: a warm key from camera-left, cool teal rim light from behind, soft volumetric beams',
  camera: 'slow, smooth dolly-in with a gentle parallax drift, locked horizon, no handheld shake',
  lens: '35mm anamorphic look, shallow depth of field, subtle lens breathing',
  style: 'photorealistic cinematic film still, rich color grading, fine film grain, high dynamic range',
  motion: 'The subject holds a mostly static pose with subtle natural sway and micro-movements.',
};

/**
 * @param {object} f fields (see DEFAULT_FIELDS keys)
 * @param {'depth'|'skeleton'|'both'} mode which control videos exist
 * @param {'video'|'image'|null} sourceKind source media type
 * @returns {string}
 */
export function assemblePrompt(f, mode, sourceKind = 'video') {
  const imageControls = {
    depth:
      'STRUCTURAL CONTROL: Use the provided depth-map image as a hard structural reference — ' +
      'scene geometry, subject silhouette, spatial layout and camera perspective must match it ' +
      '(control strength: high).',
    skeleton:
      'POSE CONTROL: Use the provided pose-skeleton image (OpenPose format) as a hard pose ' +
      'reference — the subject’s body position and limb articulation must match it exactly ' +
      '(control strength: high).',
    both:
      'STRUCTURAL & POSE CONTROL: Use the provided depth-map image as a hard structural ' +
      'reference for scene geometry, silhouette and camera perspective, and the provided ' +
      'pose-skeleton image (OpenPose format) as a hard reference for body position and limb ' +
      'articulation. Both control images must be followed exactly (control strength: high).',
  };
  const videoControls = {
    depth:
      'STRUCTURAL CONTROL: Use the provided depth-map video as a hard structural reference — scene geometry, subject silhouette, spatial layout and camera perspective must match it frame by frame (control strength: high).',
    skeleton:
      'MOTION CONTROL: Use the provided pose-skeleton video (OpenPose format) as a hard motion reference — the subject’s body position, limb articulation and timing must follow it exactly, frame by frame (control strength: high).',
    both:
      'STRUCTURAL & MOTION CONTROL: Use the provided depth-map video as a hard structural reference for scene geometry, silhouette and camera perspective, and the provided pose-skeleton video (OpenPose format) as a hard motion reference for body position and limb timing. Both control signals must be followed exactly, frame by frame (control strength: high).',
  };
  const controlLine = (sourceKind === 'image' ? imageControls : videoControls)[mode];

  const para =
    `${sentence(f.style)} of ${clean(f.subject)}, wearing ${clean(f.wardrobe)}, ` +
    `in ${clean(f.setting)}. Lighting: ${clean(f.lighting)}. ` +
    `Camera: ${clean(f.camera)}; ${clean(f.lens)}. ` +
    `Motion: ${f.motion.trim()} ` +
    `Preserve consistent identity, wardrobe and environment across every frame; no morphing, no extra limbs, no flicker.`;

  return `${para}\n\n${controlLine}`;
}

const clean = (s) => s.trim().replace(/[.\s]+$/, '');
const sentence = (s) => {
  const t = clean(s);
  return t.charAt(0).toUpperCase() + t.slice(1);
};
