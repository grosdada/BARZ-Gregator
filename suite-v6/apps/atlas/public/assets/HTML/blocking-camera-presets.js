// Shared deterministic choreography: thumbnails and editable camera keys use these samples.
const mix = (a, b, t) => a + (b - a) * t;
const vector = (a, b, t) => a.map((v, i) => mix(v, b[i], t));
const pose = (position, target = [0, 1, 0], focal = 35) => ({ position, target, focal });
const move = (a, b, target = [0, 1, 0], focal = 35) => (t) => pose(vector(a, b, t), target, focal);
const aim = (a, b) => (t) => pose([0, 1.4, 5], vector(a, b, t), 35);
const orbit = (angle, start = -45) => (t) => {
  const r = (start + angle * t) * Math.PI / 180;
  return pose([Math.sin(r) * 4, 1.25, Math.cos(r) * 4]);
};
const actor = (position, yaw = 0) => ({ position, rotation: [0, yaw * Math.PI / 180, 0] });
const ship = (position, rotation = [0, 0, 0], scale = [1, 1, 3], color = '#9aa9b4') => ({ position, rotation, scale, color });

export const CAMERA_PRESETS = [
  { id: 'dolly-in', name: 'Dolly in', family: 'Dolly', duration: 6, description: 'A measured approach from full figure to portrait.', at: move([0, 1.4, 6], [0, 1.4, 2.1], [0, 1.35, 0], 50) },
  { id: 'dolly-out', name: 'Dolly out', family: 'Dolly', duration: 6, description: 'Pull away to reveal the space around the character.', at: move([0, 1.4, 2.1], [0, 1.4, 6], [0, 1.35, 0], 50) },
  { id: 'truck-left', name: 'Truck left', family: 'Dolly', duration: 7, description: 'Lateral tracking with a steady forward heading and visible parallax.', at: (t) => pose([mix(2, -2, t), 1.25, 4], [mix(2, -2, t), 1.25, 0], 28) },
  { id: 'truck-right', name: 'Truck right', family: 'Dolly', duration: 7, description: 'Lateral tracking from left to right.', at: (t) => pose([mix(-2, 2, t), 1.25, 4], [mix(-2, 2, t), 1.25, 0], 28) },
  { id: 'pedestal-up', name: 'Pedestal up', family: 'Vertical', duration: 5, description: 'Raise the camera while keeping the optical axis level.', at: (t) => pose([0, mix(.35, 2.1, t), 3.5], [0, mix(.35, 2.1, t), 0], 28) },
  { id: 'pedestal-down', name: 'Pedestal down', family: 'Vertical', duration: 5, description: 'Descend smoothly from eye level toward the ground.', at: (t) => pose([0, mix(2.1, .35, t), 3.5], [0, mix(2.1, .35, t), 0], 28) },
  { id: 'pan-left', name: 'Pan left', family: 'Pan / Tilt', duration: 5, description: 'A horizontal pivot from a locked tripod position.', at: aim([2, 1.1, 0], [-2, 1.1, 0]) },
  { id: 'pan-right', name: 'Pan right', family: 'Pan / Tilt', duration: 5, description: 'Scan the scene from left to right without translating.', at: aim([-2, 1.1, 0], [2, 1.1, 0]) },
  { id: 'tilt-up', name: 'Tilt up', family: 'Pan / Tilt', duration: 5, description: 'Discover the character from feet to face.', at: (t) => pose([0, 1, 2.7], [0, mix(.05, 1.65, t), 0], 50) },
  { id: 'tilt-down', name: 'Tilt down', family: 'Pan / Tilt', duration: 5, description: 'Tilt from face down toward the feet.', at: (t) => pose([0, 1, 2.7], [0, mix(1.65, .05, t), 0], 50) },
  { id: 'orbit-quarter', name: 'Quarter orbit · 90°', family: 'Orbit', duration: 6, description: 'A gentle arc with the subject held in the frame.', at: orbit(90) },
  { id: 'orbit-half', name: 'Half orbit · 180°', family: 'Orbit', duration: 10, description: 'Travel from the front around to the back of the subject.', at: orbit(180, 0) },
  { id: 'orbit-full', name: 'Full orbit · 360°', family: 'Orbit', duration: 15, description: 'A complete circular move around the mannequin.', samples: 49, at: orbit(360, 0) },
  { id: 'zoom-in', name: 'Optical zoom in', family: 'Zoom', duration: 6, description: 'Change focal length from 24 to 85 mm with a stationary camera.', at: (t) => pose([0, 1.4, 4], [0, 1.35, 0], mix(24, 85, t)) },
  { id: 'zoom-out', name: 'Optical zoom out', family: 'Zoom', duration: 6, description: 'Widen from 85 to 24 mm without moving the camera.', at: (t) => pose([0, 1.4, 4], [0, 1.35, 0], mix(85, 24, t)) },
  { id: 'dolly-zoom', name: 'Dolly zoom · Vertigo', family: 'Zoom', duration: 8, description: 'Pull back while zooming in: the subject stays the same size as perspective shifts.', at: (t) => { const d = mix(2.4, 7.2, t); return pose([0, 1.2, d], [0, 1.2, 0], 24 * d / 2.4); } },
  { id: 'crane-reveal', name: 'Crane reveal', family: 'Vertical', duration: 9, description: 'Rise and retreat from an intimate view to a high wide shot.', at: move([0, 1.4, 2.8], [0, 7, 8], [0, .9, 0], 35) },
  { id: 'low-arc', name: 'Low-angle rising arc', family: 'Orbit', duration: 8, description: 'A low heroic arc that rises gradually to eye level.', at: (t) => { const p = orbit(100, -50)(t); p.position[1] = mix(.2, 1.7, t); return p; } },
  { id: 'city-flyover', name: 'City aerial travelling', family: 'City', stage: 'city', duration: 15, description: 'A long aerial pass above a miniature city built from editable cubes.', at: (t) => pose([mix(-4, 4, t), 12, mix(22, -22, t)], [mix(-4, 4, t), 2, mix(10, -34, t)], 24) },
  { id: 'city-street', name: 'City street tracking', family: 'City', stage: 'city', duration: 12, description: 'Travel along a clear avenue between primitive buildings.', at: (t) => pose([0, 1.7, mix(20, -20, t)], [0, 1.7, mix(10, -30, t)], 28) },
  { id: 'duo-master-push', name: 'Dialogue master push-in', family: 'Two characters', stage: 'duo', blocking: 'dialogue', duration: 8, description: 'A balanced two-shot that slowly closes in on both speakers.', at: move([0, 1.45, 6.8], [0, 1.45, 3.4], [0, 1.25, 0], 45) },
  { id: 'duo-master-pull', name: 'Dialogue master pull-out', family: 'Two characters', stage: 'duo', blocking: 'dialogue', duration: 8, description: 'Begin intimate, then reveal the distance and environment between two characters.', at: move([0, 1.45, 3.3], [0, 1.6, 7.2], [0, 1.25, 0], 45) },
  { id: 'duo-ots-a', name: 'Over shoulder · character A', family: 'Two characters', stage: 'duo', blocking: 'dialogue', duration: 6, description: 'Settle from a loose master into an over-the-shoulder angle on character A.', at: (t) => pose(vector([0, 1.5, 5.2], [1.15, 1.55, 3.1], t), [-.8, 1.35, 0], mix(40, 58, t)) },
  { id: 'duo-ots-b', name: 'Over shoulder · character B', family: 'Two characters', stage: 'duo', blocking: 'dialogue', duration: 6, description: 'Mirror coverage that lands over character A on character B.', at: (t) => pose(vector([0, 1.5, 5.2], [-1.15, 1.55, 3.1], t), [.8, 1.35, 0], mix(40, 58, t)) },
  { id: 'duo-profile-track', name: 'Profile dialogue track', family: 'Two characters', stage: 'duo', blocking: 'dialogue', duration: 8, description: 'Travel laterally across a face-to-face profile composition.', at: (t) => pose([mix(-3.6, 3.6, t), 1.45, 3.7], [mix(-.45, .45, t), 1.3, 0], 50) },
  { id: 'duo-cross-axis', name: 'Controlled axis cross', family: 'Two characters', stage: 'duo', blocking: 'dialogue', duration: 9, description: 'Arc deliberately across the eyeline to establish a new screen direction.', at: (t) => { const a = mix(-55, 55, t) * Math.PI / 180; return pose([Math.sin(a) * 4.3, 1.45, Math.cos(a) * 4.3], [0, 1.25, 0], 42); } },
  { id: 'duo-orbit-half', name: 'Two-character half orbit', family: 'Two characters', stage: 'duo', blocking: 'dialogue', duration: 11, description: 'A 180-degree orbit that keeps the pair as one dramatic unit.', at: (t) => { const a = mix(-90, 90, t) * Math.PI / 180; return pose([Math.sin(a) * 5, 1.6, Math.cos(a) * 5], [0, 1.2, 0], 38); } },
  { id: 'duo-orbit-full', name: 'Two-character full orbit', family: 'Two characters', stage: 'duo', blocking: 'dialogue', duration: 16, samples: 49, description: 'Circle the full relationship space while both characters stay readable.', at: (t) => { const a = t * Math.PI * 2; return pose([Math.sin(a) * 5.2, 1.5, Math.cos(a) * 5.2], [0, 1.2, 0], 40); } },
  { id: 'duo-walk-side', name: 'Walk-and-talk side track', family: 'Two characters', stage: 'duo', blocking: 'walk', duration: 10, description: 'Parallel side tracking for a walking conversation.', at: (t) => pose([4.2, 1.55, mix(-4, 4, t)], [0, 1.25, mix(-4, 4, t)], 40) },
  { id: 'duo-walk-retreat', name: 'Walk-and-talk retreat', family: 'Two characters', stage: 'duo', blocking: 'walk', duration: 10, description: 'Dolly backward while the pair advances toward camera.', at: (t) => pose([0, 1.45, mix(4.5, 10.5, t)], [0, 1.3, mix(0, 6, t)], 38) },
  { id: 'duo-crossing', name: 'Crossing paths', family: 'Two characters', stage: 'duo', blocking: 'cross', duration: 8, description: 'Hold a composed wide angle as the characters exchange sides.', at: (t) => pose([0, 2.1, mix(6.2, 4.6, t)], [0, 1.15, 0], mix(35, 48, t)) },
  { id: 'duo-confrontation', name: 'Confrontation pressure-in', family: 'Two characters', stage: 'duo', blocking: 'confrontation', duration: 7, description: 'A low, tightening move that increases tension between opponents.', at: (t) => pose([mix(-.8, 0, t), mix(.65, 1.2, t), mix(5.5, 3.1, t)], [0, 1.35, 0], mix(32, 58, t)) },
  { id: 'duo-separation', name: 'Separation reveal', family: 'Two characters', stage: 'duo', blocking: 'separate', duration: 9, description: 'Pull back as the two characters move apart and the empty space grows.', at: move([0, 1.4, 3.2], [0, 2.6, 8.4], [0, 1.1, 0], 38) },
  { id: 'duo-reunion', name: 'Reunion arc-in', family: 'Two characters', stage: 'duo', blocking: 'reunion', duration: 9, description: 'Arc inward as two separated characters converge.', at: (t) => { const a = mix(-35, 8, t) * Math.PI / 180; const r = mix(6.5, 3.4, t); return pose([Math.sin(a) * r, 1.45, Math.cos(a) * r], [0, 1.25, 0], mix(35, 55, t)); } },
  { id: 'duo-handshake-reveal', name: 'Handshake reveal', family: 'Two characters', stage: 'duo', blocking: 'reunion', duration: 7, description: 'Tilt from joined hands to a composed two-shot.', at: (t) => pose([0, 1.25, 3.6], [0, mix(.8, 1.45, t), 0], 52) },
  { id: 'duo-power-shift', name: 'Power shift rise', family: 'Two characters', stage: 'duo', blocking: 'confrontation', duration: 8, description: 'Rise from a low dominant angle to a neutral shared frame.', at: (t) => pose([mix(-1.2, 0, t), mix(.35, 1.55, t), mix(3.1, 4.6, t)], [mix(-.55, 0, t), 1.25, 0], mix(55, 42, t)) },
  { id: 'duo-intimate-creep', name: 'Intimate two-shot creep', family: 'Two characters', stage: 'duo', blocking: 'close', duration: 12, description: 'An almost imperceptible push that preserves a close shared composition.', at: move([0, 1.5, 3.4], [0, 1.5, 2.65], [0, 1.38, 0], 70) },
  { id: 'duo-crane-tableau', name: 'Crane over the pair', family: 'Two characters', stage: 'duo', blocking: 'dialogue', duration: 10, description: 'Lift from eye level into an overhead tableau of the relationship.', at: (t) => pose([0, mix(1.5, 7.5, t), mix(4.2, 2.2, t)], [0, .8, 0], mix(45, 28, t)) },
  { id: 'duo-foreground-reveal', name: 'Foreground character reveal', family: 'Two characters', stage: 'duo', blocking: 'dialogue', duration: 7, description: 'Slide from behind one character to reveal the other in depth.', at: (t) => pose([mix(-2.4, .2, t), 1.5, 3.1], [.75, 1.35, 0], 62) },
  { id: 'duo-symmetry-break', name: 'Symmetry break', family: 'Two characters', stage: 'duo', blocking: 'cross', duration: 8, description: 'Start in formal symmetry, then drift off-axis as the balance changes.', at: (t) => pose([mix(0, 2.5, t), 1.45, mix(5.2, 4.2, t)], [mix(0, .35, t), 1.25, 0], 45) },
  { id: 'western-ecu-a', name: 'Western extreme close-up · A', family: 'Western coverage', stage: 'duo', blocking: 'western', duration: 6, description: 'Locked Leone-style eye close-up on character A, with a restrained final creep.', at: (t) => pose([-.85, 1.58, mix(1.7, 1.42, t)], [-.85, 1.55, 0], mix(76, 85, t)) },
  { id: 'western-ecu-b', name: 'Western extreme close-up · B', family: 'Western coverage', stage: 'duo', blocking: 'western', duration: 6, description: 'Matching eye close-up on character B for a precise western cut.', at: (t) => pose([.85, 1.58, mix(1.7, 1.42, t)], [.85, 1.55, 0], mix(76, 85, t)) },
  { id: 'western-cu-a', name: 'Western close-up · A', family: 'Western coverage', stage: 'duo', blocking: 'western', duration: 7, description: 'Tight single on A with B held as a soft foreground edge.', at: (t) => pose([mix(1.05, .92, t), 1.52, mix(2.25, 1.9, t)], [-.85, 1.42, 0], mix(65, 78, t)) },
  { id: 'western-cu-b', name: 'Western close-up · B', family: 'Western coverage', stage: 'duo', blocking: 'western', duration: 7, description: 'Reverse tight single on B, matched for shot/reverse-shot cutting.', at: (t) => pose([mix(-1.05, -.92, t), 1.52, mix(2.25, 1.9, t)], [.85, 1.42, 0], mix(65, 78, t)) },
  { id: 'western-ots-a', name: 'Western OTS · A', family: 'Western coverage', stage: 'duo', blocking: 'western', duration: 7, description: 'Over B toward A with compressed telephoto tension.', at: (t) => pose([mix(.62, .78, t), 1.48, mix(2.9, 2.45, t)], [-.85, 1.36, 0], mix(58, 72, t)) },
  { id: 'western-ots-b', name: 'Western OTS · B', family: 'Western coverage', stage: 'duo', blocking: 'western', duration: 7, description: 'Matching reverse over A toward B without breaking the eyeline.', at: (t) => pose([mix(-.62, -.78, t), 1.48, mix(2.9, 2.45, t)], [.85, 1.36, 0], mix(58, 72, t)) },
  { id: 'western-holster-tilt', name: 'Holster-to-eyes tilt', family: 'Western coverage', stage: 'duo', blocking: 'western-draw', duration: 8, description: 'Begin on the gun hand, then tilt slowly to the duelist’s eyes.', at: (t) => pose([-.55, 1.05, 2.7], [-.72, mix(.52, 1.55, t), 0], 70) },
  { id: 'western-standoff', name: 'Western standoff push', family: 'Western coverage', stage: 'duo', blocking: 'western-standoff', duration: 10, description: 'A wide duel tableau that pushes toward the charged space between both opponents.', at: (t) => pose([0, mix(1.25, 1.45, t), mix(8.5, 4.7, t)], [0, 1.15, 0], mix(38, 52, t)) },
  { id: 'western-pass-and-turn', name: 'Pass, stop and turn', family: 'Western coverage', stage: 'duo', blocking: 'western-pass', duration: 10, description: 'The rivals cross, stop back-to-back, then turn into a tense profile two-shot.', at: (t) => pose([mix(-3.2, 2.2, t), 1.45, 4.4], [mix(-.45, .45, t), 1.25, 0], 52) },
  { id: 'space-fixed-flyby', name: 'Fixed lateral ship flyby', family: 'Spaceship', stage: 'space', blocking: 'space-flyby', duration: 8, description: 'A locked camera lets a fast ship slash across frame with pure screen-direction energy.', at: () => pose([0, 3.2, 12], [0, 1.4, 0], 42) },
  { id: 'space-overhead-pass', name: 'Overhead hull pass', family: 'Spaceship', stage: 'space', blocking: 'space-overhead', duration: 9, description: 'A vessel roars over a low fixed camera, exposing its underside and scale.', at: () => pose([0, .55, 2.2], [0, 1.4, -7], 24) },
  { id: 'space-giant-tilt', name: 'Giant ship tilt follow', family: 'Spaceship', stage: 'space', blocking: 'space-giant', duration: 13, description: 'A slow majestic tilt follows an enormous capital ship as it eclipses the frame.', at: (t) => pose([0, 1, 7], [0, mix(-3, 7, t), mix(2, -12, t)], 28) },
  { id: 'space-convoy-parallax', name: 'Convoy parallax track', family: 'Spaceship', stage: 'space', blocking: 'space-convoy', duration: 12, description: 'Track alongside a three-ship convoy while distant escorts drift at different speeds.', at: (t) => pose([mix(-8, 8, t), 4, 13], [mix(-7, 7, t), 1.5, 0], 50) },
  { id: 'space-docking-approach', name: 'Docking approach', family: 'Spaceship', stage: 'space', blocking: 'space-docking', duration: 12, description: 'Follow behind a shuttle on a controlled approach toward a docking gate.', at: (t) => pose([0, 2.8, mix(16, 1, t)], [0, 1.6, mix(4, -13, t)], 35) },
  { id: 'space-battle-chase', name: 'Space battle pursuit', family: 'Spaceship', stage: 'space', blocking: 'space-chase', duration: 11, description: 'A close chase camera banks behind two fighters through a moving battle line.', at: (t) => pose([mix(-2, 3, t), mix(2.5, 4, t), mix(12, -5, t)], [mix(-1.5, 2.5, t), mix(1.4, 3, t), mix(0, -18, t)], 30) },
  { id: 'space-crossfire', name: 'Crossfire intersection', family: 'Spaceship', stage: 'space', blocking: 'space-crossfire', duration: 9, description: 'Opposing fighters cross a fixed wide frame on colliding vectors.', at: () => pose([0, 7, 15], [0, 0, 0], 32) },
  { id: 'space-battle-orbit', name: 'Flagship battle orbit', family: 'Spaceship', stage: 'space', blocking: 'space-orbit', duration: 14, description: 'Orbit a damaged flagship while fighters streak through foreground and background.', at: (t) => { const a = mix(-45, 190, t) * Math.PI / 180; return pose([Math.sin(a) * 14, 5 + Math.sin(t * Math.PI) * 3, Math.cos(a) * 14], [0, 1.5, 0], 38); } },
  { id: 'space-torpedo-run', name: 'Torpedo trench run', family: 'Spaceship', stage: 'space', blocking: 'space-trench', duration: 10, description: 'Race just above primitive trench walls with the fighter pinned ahead.', at: (t) => pose([mix(-.5, .7, t), 1.2, mix(18, -18, t)], [mix(-.3, .5, t), .8, mix(8, -28, t)], 24) },
  { id: 'space-debris-weave', name: 'Debris-field weave', family: 'Spaceship', stage: 'space', blocking: 'space-debris', duration: 11, description: 'Weave laterally through a debris field while keeping the escaping ship readable.', at: (t) => pose([Math.sin(t * Math.PI * 3) * 2.4, mix(2, 4, t), mix(16, -14, t)], [Math.sin(t * Math.PI * 3 + .4) * 2, 1.5, mix(5, -25, t)], 30) },
];

export function cameraPresetFrames(preset) {
  const count = preset.samples || 25;
  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    return { t, ...preset.at(t * t * (3 - 2 * t)) };
  });
}

export function cameraPresetBuildings() {
  const buildings = [];
  for (let row = 0; row < 9; row++) for (let col = 0; col < 4; col++) {
    const height = 2 + ((row * 7 + col * 3) % 9) * .65;
    buildings.push({ position: [(col < 2 ? -1 : 1) * (5 + (col % 2) * 5), height / 2, 20 - row * 5], scale: [3, height, 3], color: ['#7d939c', '#acb5b2', '#b9a78d'][(row + col) % 3] });
  }
  return buildings;
}

export function cameraPresetActors(preset, t) {
  const u = t * t * (3 - 2 * t);
  let a = actor([-.85, 0, 0], -90), b = actor([.85, 0, 0], 90);
  if (preset.blocking === 'walk') {
    const z = mix(-3, 3, u), bob = Math.sin(t * Math.PI * 12) * .025;
    a = actor([-.65, bob, z], 0); b = actor([.65, -bob, z], 0);
  } else if (preset.blocking === 'cross') {
    a = actor([mix(-1.6, 1.6, u), 0, -.18], 90); b = actor([mix(1.6, -1.6, u), 0, .18], -90);
  } else if (preset.blocking === 'separate') {
    a = actor([mix(-.55, -2.4, u), 0, 0], -90); b = actor([mix(.55, 2.4, u), 0, 0], 90);
  } else if (preset.blocking === 'reunion') {
    a = actor([mix(-2.4, -.55, u), 0, 0], -90); b = actor([mix(2.4, .55, u), 0, 0], 90);
  } else if (preset.blocking === 'western-draw') {
    a = actor([-.85, 0, 0], mix(-90, -72, u)); b = actor([.85, 0, 0], 90);
  } else if (preset.blocking === 'western-standoff') {
    a = actor([mix(-2.4, -1.85, u), 0, 0], -90); b = actor([mix(2.4, 1.85, u), 0, 0], 90);
  } else if (preset.blocking === 'western-pass') {
    const first = Math.min(1, u / .62), turn = Math.max(0, (u - .62) / .38);
    a = actor([mix(-2.3, .55, first), 0, -.25], mix(90, -45, turn));
    b = actor([mix(2.3, -.55, first), 0, .25], mix(-90, 135, turn));
  }
  return [a, b];
}

export function cameraPresetShips(preset, t) {
  const u = t * t * (3 - 2 * t);
  if (preset.blocking === 'space-flyby') return [ship([mix(-18, 18, u), 1.8, 0], [0, Math.PI / 2, 0], [1.2, .55, 4.8], '#b8c5cc')];
  if (preset.blocking === 'space-overhead') return [ship([0, mix(-2, 8, u), mix(12, -18, u)], [mix(-.08, .12, u), 0, 0], [2.8, 1.1, 8], '#aeb7c4')];
  if (preset.blocking === 'space-giant') return [ship([0, mix(-5, 9, u), mix(5, -15, u)], [.12, 0, 0], [6.5, 2.1, 15], '#8999aa')];
  if (preset.blocking === 'space-convoy') return [
    ship([mix(-7, 7, u), 1.5, 0], [0, .05, 0], [2.1, .8, 5.5], '#b5c1c8'),
    ship([mix(-10, 4, u), 4.2, -8], [0, .05, 0], [1, .4, 3.3], '#8297ab'),
    ship([mix(-3, 11, u), -.3, -13], [0, .05, 0], [.9, .35, 3], '#7e8d99')
  ];
  if (preset.blocking === 'space-docking') return [ship([0, 1.5, mix(5, -16, u)], [0, 0, 0], [1.2, .5, 3.8], '#c2a879')];
  if (preset.blocking === 'space-chase') return [
    ship([mix(-1, 2.5, u), mix(1.5, 3, u), mix(2, -18, u)], [0, .15, -.12], [.8, .3, 2.6], '#d6a35d'),
    ship([mix(2, -1.5, u), mix(3.5, 1, u), mix(-4, -23, u)], [0, -.12, .15], [.75, .28, 2.4], '#7aa4c5')
  ];
  if (preset.blocking === 'space-crossfire') return [
    ship([mix(-16, 16, u), 2.5, mix(-4, 4, u)], [0, Math.PI / 2, 0], [.75, .3, 2.5], '#d6a35d'),
    ship([mix(16, -16, u), -.5, mix(5, -5, u)], [0, -Math.PI / 2, 0], [.75, .3, 2.5], '#7aa4c5'),
    ship([mix(-7, 8, u), mix(-5, 7, u), -8], [-.5, .8, .2], [.55, .22, 1.9], '#b7c4ca')
  ];
  if (preset.blocking === 'space-orbit') return [
    ship([0, 1.4, 0], [0, 0, 0], [4.8, 1.5, 11], '#8796a5'),
    ship([mix(-12, 12, u), 5, mix(4, -4, u)], [0, Math.PI / 2, -.15], [.6, .25, 2.1], '#d3a25f'),
    ship([mix(10, -13, u), -1, mix(-6, 3, u)], [0, -Math.PI / 2, .2], [.55, .22, 2], '#78a0bd')
  ];
  if (preset.blocking === 'space-trench') return [ship([mix(-.2, .5, u), .7, mix(7, -23, u)], [0, 0, Math.sin(t * Math.PI * 4) * .08], [.75, .25, 2.4], '#c9a267')];
  if (preset.blocking === 'space-debris') return [ship([Math.sin(t * Math.PI * 3 + .3) * 1.8, 1.2, mix(5, -24, u)], [0, 0, Math.sin(t * Math.PI * 3) * .35], [.7, .26, 2.5], '#bdc8cf')];
  return [];
}
