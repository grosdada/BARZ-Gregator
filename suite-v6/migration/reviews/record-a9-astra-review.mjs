// Reproducible record of Astra's bounded review, 2026-09-13. Not a runtime adapter.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import vm from 'node:vm';
import { validateAstraReview } from './validate-astra-review.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
const normalize = value => value.replace(/\s+/g, ' ').trim();
async function pinned(relative, digest) {
  const bytes = await readFile(new URL(relative, import.meta.url));
  assert.equal(sha(bytes), digest, relative);
  return JSON.parse(bytes);
}
const fixtureDigest = '0203bec1a64326cb5b560295bc7fba123894a12a97f9076492f633e69a375044';
const bundleDigest = '27bd2578c1c68f24128acb4248c756303d08888c70097ba5f0310c91c8e57286';
const corpusDigest = 'bd15fa2df1b2effbf833d1ac484e9306b76e6f9945e372d2697ce86ebf79a126';
const fixture = await pinned('./a9-legacy-fixtures.json', fixtureDigest);
const bundle = await pinned('../atlas-v5/semantic-review/astra-bundles/a9-knolling-board.json',
  '3845c66768b40905b0372400bf9bc66cc7131242adf677821cffe488a1409770');
const corpus = await pinned('../atlas-v5/prompt-literals.json', corpusDigest);
assert.equal(bundle.bundleDigest, bundleDigest);
const source = await readFile('E:/Fable 5-Project/Meat Journey/' + fixture.source.path, 'utf8');
assert.equal(sha(source), fixture.source.sha256);
const scoped = item => item.occurrences.filter(o => o.sourcePath === fixture.source.path);
const ids = new Set(bundle.items.map(i => i.id));
const extra = corpus.literals.filter(i => !ids.has(i.id) && scoped(i).length)
  .sort((a, b) => a.id.localeCompare(b.id));
assert.equal(extra.length, 226);
const k = fixture.knolling;

// Every signed bundle index below is ONE-BASED and was read in full.
const preserved = new Set([1,5,6,8,9,10,11,19,22,24,27,47,48,50,52]);
const excluded = new Set([2,3,4,7,13,15,16,17,18,20,23,25,26,28,29,
  34,35,36,37,38,39,40,41,42,43,44,45,46,51]);
const changes = new Map();
function correction(index, reason, replacements) {
  changes.set(index, { reason, replacements });
}
correction(12, 'Préciser la projection et distinguer une image panoramique du contenu HDR réel.', [
  ['Horizontal lines (tables, horizons) stay STRAIGHT in the middle, curve toward top/bottom',
    'The level horizon stays straight; other straight horizontal scene edges generally curve under spherical projection'],
  ['Vertical lines (walls, doors) stay STRAIGHT throughout',
    'Upright vertical scene edges map to vertical meridians when the panorama is level'],
  ['Ready for: HDRI lighting, VR viewer, Blender/Unity skybox',
    'Intended for: VR viewing and equirectangular environment backgrounds. Actual HDR lighting requires high-dynamic-range image data; a 2:1 layout alone does not provide it']
]);
correction(14, 'Le placement automatique doit aussi fonctionner sans image de corps.', [
  ['of the character/body image, respecting the source pose and anatomy.',
    'of the provided or generated character/body, respecting its pose and anatomy.']
]);
correction(21, 'Réserver IMG_1 au corps lorsqu’il est fourni ; décalage explicite du premier tatouage.', [
  ['${index + 1}', '${index + firstTattooReferenceIndex}']
]);
correction(30, 'Déclarer les rôles des références et rendre la conservation du corps conditionnelle.', [
  ['Apply the tattoo reference image(s) onto the character/body image while preserving the character identity, anatomy, pose, lighting, camera angle, skin texture, wardrobe and background.',
    '[TATTOO_REFERENCE_PLACEHOLDER] Apply the tattoo reference image(s) to the provided or generated character/body. When a character/body source image is provided, preserve its identity, anatomy, pose, lighting, camera angle, skin texture, wardrobe and background.'],
  ['Same character and scene as the source.', 'When a character/body source is provided, keep that same character and scene.'],
  ['No body redesign, no clothing changes unless the chosen zone must be visible.',
    'When a character/body source is provided, do not redesign the body or change clothing. If a selected zone is hidden, keep the source unchanged and request a reference showing that zone.']
]);
correction(31, 'Le mode avec/sans corps est explicite en amont ; aucune attribution implicite IMG_n.', [
  ["If a character/body source image is also provided, preserve it exactly and use the listed [IMG_n] tattoo references as tattoo designs. If only tattoo references are provided, create a neutral character/body view that clearly shows the selected zones.",
    'Follow the reference roles above. The listed image references are tattoo designs only. For a provided body, preserve its pose and clothing; do not move a hidden-zone tattoo elsewhere. For a generated body, choose a view that clearly shows the selected zones.']
]);
correction(32, 'Réparer la flèche corrompue entre les panneaux A1 et C2.', [
  ['ROTATION VIEWS (A1 ? C2)', 'ROTATION VIEWS (A1 → C2)']
]);
const panoramaChanges = [
  ['The attached reference photo IS panel A1.',
    'Panel A1 reconstructs the attached reference direction, with the cleaning and field-of-view constraints below.'],
  ['INVENTED but coherent with the reference\'s architecture, materials, light, atmosphere.',
    'reconstructed from supplied references where available, otherwise INVENTED but coherent with the reference\'s architecture, materials, light, atmosphere.'],
  ['HFOV ~50°.', 'HFOV 45° per output panel, so eight panels cover 360° without overlapping sectors.'],
  ['Focal length, exposure, white balance, color grading all locked to the reference.',
    'Use the same focal length for all eight views, adjusted to the specified output field of view. Exposure, white balance and color grading are locked to the reference.'],
  ['A1 right → A2 left → A3 left → B1 left → B2 left → B3 left → C1 left → C2 left → A1 left (loop closes).',
    'A1 right ↔ A2 left; A2 right ↔ A3 left; A3 right ↔ B1 left; B1 right ↔ B2 left; B2 right ↔ B3 left; B3 right ↔ C1 left; C1 right ↔ C2 left; C2 right ↔ A1 left (loop closes).'],
  ["NONE of A1's buildings appear here.",
    "Do not duplicate A1's forward-facing landmarks behind the camera; a surrounding structure may remain visible where its real geometry continues."],
  ["The reference's distinctive elements (most colorful/unique buildings, specific façade colors, dominant foreground mass) appear in A1 ONLY. Their outer edge may show at the inner borders of A2 and C2 (adjacent to A1). They do NOT appear in A3, B1, B2, B3, C1. B2 especially faces the opposite side of the world — show only what was BEHIND the photographer.",
    "Keep each distinctive landmark at its correct world location. It may continue across neighboring views only where its geometry warrants it; never clone or mirror it into another direction. B2 faces behind the photographer, not back toward A1's forward scene."],
  ["New buildings share era, materials, proportions with the reference — but are PLAUSIBLE NEW STRUCTURES, never mirrored copies.",
    "For regions absent from every supplied reference, new buildings share era, materials and proportions with the reference — but are PLAUSIBLE NEW STRUCTURES, never mirrored copies."],
  ["A1's distinctive landmarks appear ONLY in A1 (and edges of A2/C2).",
    "Distinctive landmarks retain their world positions and are not duplicated across directions."],
  ['B2 = opposite side, no A1 features.', 'B2 = opposite direction; retain only geometrically justified continuations.']
];
for (const index of [33,49]) {
  correction(index, 'Corriger le raccord 360°, la chaîne des bords et la priorité des références multiples ; conserver les deux cartes historiques.', [
    [index === 33 ? '[IMG_1]= A1, the REFERENCE)' : '[IMG_1]= A1, the REFERENCE',
      '([IMG_1] = A1, the REFERENCE)'], ...panoramaChanges
  ]);
}
correction(53, 'Remplacer les séparateurs de couches corrompus par des flèches.', [
  ['underwear ? shirt ? jacket', 'underwear → shirt → jacket']
]);
function edited(value, replacements) {
  return replacements.reduce((text, [before, after]) => {
    assert.ok(text.includes(before), `Missing correction: ${before}`);
    return text.replaceAll(before, () => after);
  }, value);
}
function decision(item, index, action, change) {
  return { id: item.id, sourceIndex: index, originalValue: item.value,
    occurrences: scoped(item), action,
    ...(change ? { ...change, correctedValue: edited(item.value, change.replacements) }
      : action === 'exclude-non-prompt' ? { reason:
        'Libellé, résumé de carte, aperçu Explorer ou code d’interface : conserver hors texte compilé. Décision limitée aux occurrences Knolling.' } : {}) };
}
const decisions = bundle.items.map((item, zeroIndex) => {
  const index = zeroIndex + 1;
  assert.equal(+preserved.has(index) + +excluded.has(index) + +changes.has(index), 1);
  return decision(item, index, changes.has(index) ? 'correct'
    : preserved.has(index) ? 'preserve' : 'exclude-non-prompt', changes.get(index));
});
// Complement indices are ZERO-BASED, in lexicographic ID order.
const extraPreserved = new Set([23,30,39,53,54,102,148,174,194,200,225]);
const extraChanges = new Map([
  [91, { reason: 'Full Kit doit respecter la pose conservée par Dress Character.', replacements: [
    ['Place these items logically: in pockets (visible bulge), in hands, clipped to belt, in bag',
      'Place these items in existing pockets, bags or belt attachments without changing the source pose; use a hand only if its current grip already permits it']
  ] }],
  [132, { reason: 'Éviter le conflit avec extrapolation panoramique et rééclairage Location Reconstruct.', replacements: [
    ['Color grade must match across all source images — find the common baseline',
      'Use the primary reference color grade consistently, unless the selected output explicitly requires replacement lighting'],
    ['This is NOT creative extrapolation — you have the references, USE THEM',
      'Use supplied references for all evidenced regions. Extrapolate only regions absent from every reference, following the selected output instructions']
  ] }],
  [150, { reason: 'Les reflets spéculaires changent avec le point de vue ; conserver le dispositif lumineux.', replacements: [
    ['atmospheric qualities, specular highlight positions.',
      'atmospheric qualities and light-source positions. Specular highlights shift naturally with the viewing angle.']
  ] }]
]);
const extraDecisions = extra.map((item, index) => decision(item, index,
  extraChanges.has(index) ? 'correct' : extraPreserved.has(index) ? 'preserve'
    : 'exclude-non-prompt', extraChanges.get(index)));
const review = { schemaVersion: '1.0', bundleId: bundle.id, bundleDigest,
  status: 'reviewed', reviewerModel: 'gpt-6-astra', reviewedAt: '2026-09-13', decisions };
const summary = validateAstraReview(bundle, review);
const all = [...decisions, ...extraDecisions];
const byText = new Map(all.map(d => [normalize(d.originalValue), d]));
function approved(value) {
  if (!value) return value;
  const d = byText.get(normalize(value));
  assert.ok(d && d.action !== 'exclude-non-prompt', value.slice(0, 70));
  if (!d.replacements) return value;
  // Apply exact recorded edits while retaining V5 newlines outside replaced spans.
  let result = value;
  for (const [before, after] of d.replacements) {
    const pattern = before.split(/\s+/).map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('\\s+');
    const re = new RegExp(pattern, 'g');
    assert.ok(re.test(result), `Missing formatted correction: ${before}`);
    result = result.replace(re, () => after);
  }
  assert.equal(normalize(result), normalize(d.correctedValue));
  return result;
}

// Compare frozen outputs against the actual source copy-handler body, not the preparer's rewrite.
const model = source.slice(source.indexOf('const lightingTexts = {'), source.indexOf('// Tab Navigation'));
const copyStart = source.indexOf('let text = promptElement.textContent;');
const copyBody = source.slice(copyStart, source.indexOf('navigator.clipboard.writeText(text)', copyStart));
const context = vm.createContext(Object.create(null), { codeGeneration: { strings: false, wasm: false } });
vm.runInContext(model + '\nfunction legacyCopy(promptId, promptElement) {' + copyBody + '\nreturn text;}',
  context, { timeout: 1000 });
for (const [state, outputs] of [[k.defaultState, k.defaultOutputs], [k.configuredState, k.configuredOutputs]]) {
  context.state = state;
  vm.runInContext('currentLighting=state.lighting;currentMultiRef=state.multiReference;'
    + 'currentAccessory=state.accessory;currentSubject=state.subject;'
    + 'currentTattooPlaceIt=state.tattooPlaceIt;'
    + 'selectedTattooZones.splice(0,selectedTattooZones.length,...state.tattooZones);', context);
  for (const card of k.cards) {
    context.card = card;
    assert.equal(vm.runInContext('legacyCopy(card.id,{textContent:card.prompt})', context,
      { timeout: 1000 }), outputs[card.id]);
    const raw = source.match(new RegExp('id="prompt-' + card.id + '">([\\s\\S]*?)</div>'))?.[1];
    assert.equal(card.prompt, raw);
  }
}
const cards = k.cards.map(c => ({ ...c, originalPrompt: c.prompt, prompt: approved(c.prompt),
  literalIds: [byText.get(normalize(c.prompt)).id] }));
const optionTexts = Object.fromEntries(Object.entries(k.optionTexts).map(([family, options]) => [
  family, Object.fromEntries(Object.entries(options).map(([key, value]) => [key, approved(value)]))
]));
const roleTexts = {
  'provided-body': '**REFERENCE ROLES:** [IMG_1] is the character/body source, never a tattoo design. [IMG_2] and subsequent images are tattoo designs in deck order. Preserve the body source.',
  'tattoos-only': '**REFERENCE ROLES:** All supplied images, starting at [IMG_1], are tattoo designs in deck order. No body source is supplied. Create a neutral adult character/body view showing the requested tattoo areas.'
};
const defaultState = { ...k.defaultState, tattooBodyMode: 'provided-body' };
const configuredState = { ...k.configuredState, tattooBodyMode: 'provided-body' };
const zoneDefault = approved(bundle.items[13].value);
const zoneLine = approved(bundle.items[20].value);
const zoneTemplate = approved(bundle.items[30].value);
function compile(id, state) {
  let text = cards.find(c => c.id === id).prompt;
  const inject = (token, value) => { text = text.replace(token, () => value); };
  if (k.compilerTargets.lighting.includes(id)) inject('[LIGHTING_PLACEHOLDER]', optionTexts.lightingTexts[state.lighting]);
  if (k.compilerTargets.multiReference.includes(id)) inject('[MULTI_IMAGE_PLACEHOLDER]', optionTexts.multiRefTexts[state.multiReference]);
  if (id === 'dresschar') {
    inject('[SUBJECT_PLACEHOLDER]', optionTexts.subjectTexts[state.subject]);
    inject('[ACCESSORY_PLACEHOLDER]', optionTexts.accessoryTexts[state.accessory]);
  }
  if (id === 'tattooextract') inject('[TATTOO_PLACE_IT_PLACEHOLDER]', optionTexts.tattooPlaceItTexts[state.tattooPlaceIt]);
  if (id === 'tattoocharacter') {
    inject('[TATTOO_REFERENCE_PLACEHOLDER]', roleTexts[state.tattooBodyMode]);
    const first = state.tattooBodyMode === 'provided-body' ? 2 : 1;
    const lines = state.tattooZones.map((zone, index) => zoneLine
      .replace('${index + firstTattooReferenceIndex}', () => String(index + first))
      .replace('${zone}', () => zone));
    inject('[TATTOO_ZONE_PLACEHOLDER]', lines.length
      ? zoneTemplate.replace("${lines.join('\n')}", () => lines.join('\n')) : zoneDefault);
  }
  assert.doesNotMatch(text, /\[[A-Z_]*PLACEHOLDER\]|\$\{/);
  return text;
}
const outputsFor = state => Object.fromEntries(cards.map(c => [c.id, compile(c.id, state)]));
const cases = [];
function outputCase(name, id, patch) {
  const state = { ...defaultState, ...patch };
  cases.push({ name, id, state, output: compile(id, state) });
}
for (const subject of k.controls.subject) for (const accessory of k.controls.accessory) {
  outputCase('dress-' + subject + '-' + accessory, 'dresschar', { subject, accessory });
}
for (const id of k.compilerTargets.multiReference) for (const multiReference of k.controls.multiReference) {
  outputCase(id + '-' + multiReference, id, { multiReference });
}
for (const id of k.compilerTargets.lighting) for (const lighting of k.controls.lighting) {
  outputCase(id + '-' + lighting, id, { lighting });
}
for (const tattooPlaceIt of k.controls.tattooPlaceIt) outputCase('placement-' + tattooPlaceIt,
  'tattooextract', { tattooPlaceIt });
for (const tattooBodyMode of Object.keys(roleTexts)) {
  for (const tattooZones of [[], configuredState.tattooZones, ...k.controls.tattooZones.map(z => [z])]) {
    outputCase(tattooBodyMode + '-' + (tattooZones.join(',') || 'auto'), 'tattoocharacter',
      { tattooBodyMode, tattooZones });
  }
}
const manualSourceValues = [...source.matchAll(/class="body-zone-btn" data-zone="([^"]+)"/g)]
  .map(m => ({ value: m[1], action: 'preserve', role: 'ordered-zone-value',
    sourcePath: fixture.source.path, line: source.slice(0, m.index).split('\n').length }));
assert.deepEqual(manualSourceValues.map(v => v.value), k.controls.tattooZones);
const supplement = {
  schemaVersion: '1.0', status: 'reviewed', reviewerModel: 'gpt-6-astra',
  reviewedAt: '2026-09-13', bundleDigest, fixtureDigest, corpusDigest, source: fixture.source,
  decisions: extraDecisions, manualSourceValues,
  catalog: { title: k.title, tabs: k.tabs, cards, controls: {
    ...k.controls, tattooBodyMode: Object.keys(roleTexts)
  }, defaultState, configuredState, optionTexts, roleTexts, zoneDefault, zoneLine, zoneTemplate,
  compilerTargets: k.compilerTargets },
  approvedExpectedOutputs: { defaultOutputs: outputsFor(defaultState),
    configuredOutputs: outputsFor(configuredState), cases },
  legacyComparison: { method: 'Actual V5 copy handler evaluated in isolated VM against frozen textContent',
    outputCount: 34, identical: true },
  sourceCoverage: { bundleValues: 53, complementaryValues: 226, manualZoneValues: 19 },
  dormantControls: { targets: ['simplesheet','complexsheet','posesheet','expressionboard','objectsheet'],
    state: 'blue', colors: ['Beige (#B3A089)','Blue (#515973)','Pink (#DE7C68)','White (#F2ECCA)'],
    disposition: 'archive-only; no active card target' },
  architecture: { owner: 'knolling', workshop: 'character-lab',
    outputMediaType: 'image', composite: false, runtimePortStatus: 'pending-sol',
    referenceTokens: 'Preserve [IMG_n] in Atlas. Deck order and tokens must agree; no blind replacement of custom prompts.',
    referenceTransfer: 'Use an existing supported bridge contract only; never invent or infer attachment IDs.',
    personalization: 'Custom final per card persists across reset until explicit recompile.',
    newRoleTextsReason: 'Explicit with-body versus tattoos-only input mode resolves the conflicting V5 reference numbering.' },
  technicalReferences: [{ url: 'https://archive.blender.org/wiki/2015/index.php/Doc:UK/2.6/Manual/Render/Cycles/Camera/',
    supports: 'Equirectangular panorama covers 360 horizontal by 180 vertical degrees.' }]
};
await writeFile(new URL('./a9-astra.review.json', import.meta.url), JSON.stringify(review, null, 2) + '\n');
await writeFile(new URL('../atlas-v5/semantic-review/astra-reviews/a9-knolling-board.review.json', import.meta.url), JSON.stringify(review, null, 2) + '\n');
await writeFile(new URL('./a9-astra-supplement.review.json', import.meta.url), JSON.stringify(supplement, null, 2) + '\n');
console.log(JSON.stringify({ ...summary, complementary: extraDecisions.reduce((n, d) => {
  n[d.action] = (n[d.action] || 0) + 1; return n;
}, {}), cards: cards.length, oracleCases: cases.length, legacyOutputsCompared: 34 }, null, 2));
