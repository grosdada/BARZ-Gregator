// Records the bounded source review performed by Astra, 2026-09-12.
// Review oracle only; never execute imported user scripts or use this as a runtime.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { validateAstraReview } from './validate-astra-review.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
async function pinned(relative, digest) {
  const bytes = await readFile(new URL(relative, import.meta.url));
  assert.equal(sha(bytes), digest, `Changed review input: ${relative}`);
  return JSON.parse(bytes.toString('utf8'));
}
const bundleDigest = 'df03eadd319a6a5f88f2a4c8b12a90101c4f79d8cbdc0a2e0adff88ccd0160e3';
const fixtureDigest = 'b06ba4ad206addce3328ea57cb8ba03ac3825aa51309ab2cf99adea661d663f0';
const corpusDigest = 'bd15fa2df1b2effbf833d1ac484e9306b76e6f9945e372d2697ce86ebf79a126';
const fixture = await pinned('./a8-legacy-fixtures.json', fixtureDigest);
const corpus = await pinned('../atlas-v5/prompt-literals.json', corpusDigest);
const bundle = JSON.parse(await readFile(new URL(
  '../atlas-v5/semantic-review/astra-bundles/a8-bz-designer.json', import.meta.url)));
assert.equal(bundle.bundleDigest, bundleDigest);
assert.equal(bundle.items.length, 203);
const source = await readFile(
  'E:/Fable 5-Project/Meat Journey/' + fixture.source.path, 'utf8');
assert.equal(sha(source), fixture.source.sha256);
const scoped = item => item.occurrences.filter(o => o.sourcePath === fixture.source.path);
const ids = new Set(bundle.items.map(x => x.id));
const extra = corpus.literals.filter(x => !ids.has(x.id) && scoped(x).length)
  .sort((a, b) => a.id.localeCompare(b.id));
assert.equal(extra.length, 114);
const designer = fixture.designer;

// Exact semantic classification of the 203 values read, by signed bundle index.
const preserved = new Set([
  2,9,10,11,21,22,25,27,29,33,35,37,38,40,41,42,46,48,50,51,52,53,55,57,59,
  63,64,69,71,74,75,77,78,81,83,84,85,86,87,88,89,92,94,96,98,99,100,101,
  103,105,109,111,112,114,116,117,119,121,122,124,125,126,128,131,135,139,142,
  144,145,150,151,152,153,154,155,156,158,159,161,166,172,173,175,176,178,179,
  182,184,185,188,189,190,191,196,199,201,202
]);
const excluded = new Set([
  0,1,3,4,6,12,13,14,15,16,17,18,19,20,23,24,26,28,30,32,34,36,39,43,44,45,
  47,49,54,56,60,61,62,65,66,67,68,70,72,73,76,79,80,82,90,91,93,95,97,102,
  104,106,107,110,113,115,118,123,127,129,130,132,133,134,136,137,138,140,141,
  143,146,147,148,149,160,162,163,164,165,167,168,169,171,174,177,180,181,183,
  186,187,193,194,195,197,198
]);
const corrections = new Map([
  [5, { reason: 'Ancienne variante archivée : réparer les mots collés et reallocation, sans changer la scène.',
    edits: [['proportions,head', 'proportions, head'], ['in a reallocation', 'on location'],
      ['NOTa human', 'NOT a human'], ['intentionalnon-realistic', 'intentional non-realistic'],
      ['proportions.Full', 'proportions. Full'], ['in a L.A', 'in an L.A'],
      ['day.High', 'day. High']] }],
  [7, { reason: 'Réparer la phrase et séparer le titre Goal ; même objectif de copie du dessin.',
    edits: [['Make it a photo with same pixel-perfect design replica Goal:',
      'Make it a photo with the same pixel-perfect design. Goal:']] }],
  [8, { reason: 'Corriger les articles et subtil textured ; conserver la référence artistique.',
    edits: [['like 80 mm macro photo of hyperrealistic sculpture',
      'like an 80 mm macro photo of a hyperrealistic sculpture'],
      ['" Ron Mueck"', '"Ron Mueck"'], ['subtil textured', 'subtly textured']] }],
  [31, { reason: 'Ajouter l’article manquant devant 35 mm photo.',
    edits: [['like 35 mm photo', 'like a 35 mm photo']] }],
  [58, { reason: 'Corriger proportions et retirer les guillemets accidentels autour de la fin du prompt.',
    edits: [['Respect the weird  proportion,', 'Respect the weird proportions,'],
      ['"Body and Lighting Adaptation:', 'Body and Lighting Adaptation:'],
      ['Pure cinematic imagery only."', 'Pure cinematic imagery only.']] }],
  [108, { reason: 'Ajouter le possessif anglais à character skin.',
    edits: [['The character skin,', "The character's skin,"]] }],
  [120, { reason: 'Corriger la faute sillustration, sans modifier les contraintes de fidélité.',
    edits: [['sillustration', 'illustration']] }],
  [157, { reason: 'reallocation est une corruption de on location confirmée par la carte Puppet Integration.',
    edits: [['in a reallocation', 'on location']] }],
  [170, { reason: 'Corriger les fautes de frappe et la référence IMG_ 1 mal espacée ; conserver le parti pris figurine.',
    edits: [['sillustration', 'illustration'], ['proportions,head', 'proportions, head'],
      ['in a reallocation', 'on location'], ['NOTa human', 'NOT a human'],
      ['intentionalnon-realistic', 'intentional non-realistic'],
      ['[IMG_ 1]', '[IMG_1]'], ['color grader. apply', 'color grader. Apply']] }],
  [192, { reason: 'Réparer modify any way en modify it in any way.',
    edits: [['or modify any way,', 'or modify it in any way,']] }],
  [200, { reason: 'Ajouter l’article manquant devant 80 mm macro photo.',
    edits: [['like 80 mm macro photo', 'like an 80 mm macro photo']] }]
]);
function edited(value, changes) {
  return changes.reduce((text, [before, after]) => {
    assert.ok(text.includes(before), `Missing correction target: ${before}`);
    return text.replaceAll(before, () => after);
  }, value);
}
const decisions = bundle.items.map((item, index) => {
  const base = { id: item.id, sourceIndex: index, originalValue: item.value,
    occurrences: scoped(item) };
  assert.equal(Number(preserved.has(index)) + Number(excluded.has(index))
    + Number(corrections.has(index)), 1, `Unclassified index: ${index}`);
  if (corrections.has(index)) {
    const change = corrections.get(index);
    return { ...base, action: 'correct', role: 'prompt-body',
      correctedValue: edited(item.value, change.edits), reason: change.reason,
      replacements: change.edits };
  }
  if (preserved.has(index)) return { ...base, action: 'preserve',
    role: [64,139,172,191].includes(index) ? 'compiler-token'
      : [96,105,109,178].includes(index) ? 'weight-label-in-prompt'
      : index === 99 ? 'style-template' : 'prompt-body-or-fragment' };
  return { ...base, action: 'exclude-non-prompt', role: 'interface-or-runtime',
    reason: 'Titre, description d’aide, clé de navigation ou fragment HTML lu dans son usage. Conserver comme métadonnée ou fonction ; ne pas injecter dans le prompt.' };
});
const extraPreserved = new Set([0,5,6,14,15,18,23,24,31,41,42,69,82,84,85,106]);
const extraDecisions = extra.map((item, index) => ({
  id: item.id, sourceIndex: index, originalValue: item.value, occurrences: scoped(item),
  action: extraPreserved.has(index) ? 'preserve' : 'exclude-non-prompt',
  role: [5,14,23,31,41,84].includes(index) ? 'dormant-prompt-body'
    : [0,6,85].includes(index) ? 'compiler-placeholder'
    : extraPreserved.has(index) ? 'background-fragment' : 'interface-or-runtime',
  ...(!extraPreserved.has(index) ? { reason:
    'Valeur complémentaire lue : interface, résumé, événement ou rendu HTML. Décision limitée aux occurrences BZ Designer ; conserver hors texte de génération.' } : {})
}));
const review = {
  schemaVersion: '1.0', bundleId: bundle.id, bundleDigest, status: 'reviewed',
  reviewerModel: 'gpt-6-astra', reviewedAt: '2026-09-12', decisions,
  scope: '203 bundle entries, 114 additional source-scoped literals, 55 cards, 80 style fragments, compiler and render initialization reviewed. Runtime port pending.'
};
const summary = validateAstraReview(bundle, review);
const all = [...decisions, ...extraDecisions];
const decisionByValue = new Map(all.map(d => [d.originalValue, d]));
const getDecision = value => {
  const d = decisionByValue.get(value);
  assert.ok(d, `Missing provenance: ${value.slice(0, 80)}`);
  assert.notEqual(d.action, 'exclude-non-prompt');
  return d;
};
const originalTemplate = bundle.items[99].value;
const cards = designer.cards.map(card => {
  let prompt = card.prompt;
  let provenance;
  if (prompt.includes('Style priority: ')) {
    const [, direction, craft] = prompt.match(
      /Style priority: ([\s\S]*?)\nCraft details: ([\s\S]*?)\nLet the chosen style/);
    const directions = getDecision(direction);
    const details = getDecision(craft);
    assert.equal(originalTemplate.replace('${styleDirection}', () => direction)
      .replace('${craftDetails}', () => craft), prompt);
    provenance = [bundle.items[99].id, directions.id, details.id];
  } else {
    const d = getDecision(prompt);
    provenance = [d.id];
    prompt = d.correctedValue ?? prompt;
  }
  return { ...card, originalPrompt: card.prompt, prompt, literalIds: provenance,
    usesDrawingWeight: card.prompt.includes('[DRAWING_WEIGHT]') };
});
assert.equal(cards.length, 55);
assert.equal(cards.filter(c => c.usesDrawingWeight).length, 40);

// The fixture skipped renderSections(), where the actual initial Beige is assigned.
assert.ok(source.includes('if(item.colors&&!selectedColors[id])selectedColors[id]=item.colors[0];'));
const normalizedSource = source.replaceAll('\r\n', '\n');
const originalCategories = JSON.parse(normalizedSource.slice(
  normalizedSource.indexOf('const designerCategories = ') + 'const designerCategories = '.length,
  normalizedSource.indexOf(';\nlet activeKey')));
const dormantTitles = new Set([
  'Character Design Sheet', '3D Action Figure', 'Character Combat', 'Pet as Human',
  'Realistic Origami', 'Food Explosion', 'Multiple Image Fusion'
]);
const archivedCards = originalCategories.useful.prompts.map((card, index) => {
  const d = getDecision(card.prompt);
  return { ...card, id: `legacy-useful-${index}`, originalPrompt: card.prompt,
    prompt: d.correctedValue ?? card.prompt, literalId: d.id,
    status: dormantTitles.has(card.title) ? 'dormant-card' : 'superseded-variant' };
});
assert.equal(archivedCards.filter(c => c.status === 'dormant-card').length, 7);
const colors = cards.find(c => c.id === 'body-1').colors;
assert.deepEqual(colors, [
  { name: 'Beige', hex: '#B3A089' }, { name: 'Blue', hex: '#515973' },
  { name: 'Pink', hex: '#DE7C68' }, { name: 'White', hex: '#F2ECCA' }
]);
const labels = weight => weight >= 82 ? 'strict source fidelity'
  : weight >= 64 ? 'source-led style transfer'
  : weight >= 42 ? 'balanced style freedom' : 'style-led reinterpretation';
const clean = text => text.replace(/\s+MANDATORY:/g, ' MANDATORY:')
  .replace(/ {2,}/g, ' ').trim();
function oracle(card, state, legacy = false) {
  let prompt = legacy ? card.originalPrompt : card.prompt;
  const color = state.selectedColors[card.id];
  if (color) prompt = prompt.replaceAll('[BG_COLOR]', () => color.name + ' ' + color.hex);
  prompt = prompt.replaceAll('[DRAWING_WEIGHT]', () => String(state.drawingWeight))
    .replaceAll('[DRAWING_WEIGHT_LABEL]', () => labels(state.drawingWeight));
  // Clean the built-in template before inserting literal user text.
  const sceneSlot = '__A8_SCENE_SLOT__';
  const hasScene = !legacy && card.id === 'sketch-photo-8' && Boolean(state.scene);
  prompt = clean(prompt.replaceAll('[Scene Description]', hasScene ? sceneSlot : '')
    .replaceAll('[DESCRIBE YOUR NEW SUBJECT HERE]', '')
    .replaceAll('[Details]', ''));
  return hasScene ? prompt.replace(sceneSlot, () => state.scene) : prompt;
}
for (const key of ['default', 'configured']) {
  for (const card of cards) assert.equal(oracle(card, designer[`${key}State`], true),
    designer[`${key}Outputs`][card.id], `Legacy equivalence: ${key}/${card.id}`);
}
const defaultState = { ...designer.defaultState,
  selectedColors: { 'body-1': colors[0] }, scene: '', expandedCardIds: [], customOutputs: {} };
const outputs = state => Object.fromEntries(cards.map(c => [c.id, oracle(c, state)]));
const defaultOutputs = outputs(defaultState);
assert.match(defaultOutputs['body-1'], /Beige #B3A089/);
const colorCases = colors.map(color => ({ color,
  output: oracle(cards.find(c => c.id === 'body-1'), {
    ...defaultState, selectedColors: { 'body-1': color }
  }) }));
const weightCases = Array.from({ length: 16 }, (_, i) => 20 + i * 5).map(weight => ({
  weight, label: labels(weight), outputs: Object.fromEntries(
    cards.filter(c => c.usesDrawingWeight).map(c => [c.id,
      sha(oracle(c, { ...defaultState, drawingWeight: weight }))]))
}));
const scene = '<b>rain</b>  $& $1\n[Details] @image2';
const sceneOutput = oracle(cards.find(c => c.id === 'sketch-photo-8'), {
  ...defaultState, scene
});
assert.ok(sceneOutput.includes(scene));
const supplement = {
  schemaVersion: '1.0', status: 'reviewed', reviewerModel: 'gpt-6-astra',
  reviewedAt: '2026-09-12', source: fixture.source, fixtureDigest, corpusDigest,
  additionalLiteralCount: extra.length, decisions: extraDecisions,
  scope: 'Source-scoped BZ Designer only; shared literal decisions do not approve other tools.',
  catalog: { title: 'BZ Designer', categories: designer.categories, cards, colors, defaultState },
  archivedCards,
  approvedComposition: {
    placement: 'Character & Asset Lab; tool barz-designer; movable/renameable through Build.',
    cards: '55 independent outputs, stable source card IDs and category/tab ordering.',
    weight: '55 default, integer 20..95 in steps of 5. Apply only to the 40 style cards; hide on Photo/Body/Useful. Text instruction only, no inferred provider parameter.',
    colors: 'Beige #B3A089 at first render and reset. Persist selected color for body-1; active swatch must follow state after every rerender.',
    scene: 'Only Wax Figurine (sketch-photo-8) gets an optional scene field, empty by default. Clean built-in template first, then insert the exact literal field. Never clean user text.',
    markers: 'Keep IMG_1/IMG_2 and the Puppet Integration scene/style placeholders literal; final editing supported. Do not invent asset assignments or perform broad token replacements.',
    archive: 'Seven dormant cards and three superseded Useful variants remain in the review archive; do not add active runtime cards.',
    customOutputs: 'Final text persists per card and setup verbatim until explicit recompile. Reset preserves custom finals. Preview/copy/bridge use the same selected final.',
    validation: 'Known card/category/tab/color IDs only; finite integer weight in the 16 allowed values, no silent clamp. Reject invalid API controls. Preserve user HTML-like text and dollar sequences literally.',
    bridge: 'One explicit image draft for the selected card; no inferred model, ratio, resolution, asset IDs or generation.',
    migration: 'Adopt next defaults after backed-up migration; preserve user placements, titles and overlays. Deck/Backstage fixed.'
  },
  manualSourceValues: [{ value: '#515973', role: 'background-fragment', action: 'preserve',
    sourcePath: fixture.source.path, line: 89,
    reason: 'Present in the signed source and fixture colors but absent from the literal corpus.' }],
  approvedExpectedOutputs: { defaultOutputs,
    configuredOutputs: outputs(designer.configuredState), colorCases, weightCases,
    sceneCase: { cardId: 'sketch-photo-8', scene, output: sceneOutput } },
  fixtureLimitations: [
    'Original fixture remains unchanged for provenance; its defaultState is PRE-render initialization, not the visible UI default.',
    'Source renderSections sets first color Beige before compiling outputs. After rerender it always marks first swatch active, even when selectedColors retains Pink/Blue/White.',
    'Source hash matched. All 110 pre-render/configured fixture outputs checked mechanically; no browser execution performed in this review.',
    '55 full cards mapped to reviewed literals; 40 styles each prove exact composition of the shared template and two reviewed fragments.',
    '7 dormant cards and 3 superseded variants are review archives, not runtime placements.',
    'Blue hex missing from corpus is manually recorded from the signed source, not inferred.',
    'UI, persistence, Build migration, resets, custom finals and bridge must be tested during Sol port.'
  ]
};
for (const relative of ['./a8-astra.review.json',
  '../atlas-v5/semantic-review/astra-reviews/a8-bz-designer.review.json']) {
  await writeFile(new URL(relative, import.meta.url), JSON.stringify(review, null, 2) + '\n');
}
await writeFile(new URL('./a8-astra-supplement.review.json', import.meta.url),
  JSON.stringify(supplement, null, 2) + '\n');
console.log(JSON.stringify({ ...summary, supplemental: extra.length,
  supplementalCounts: extraDecisions.reduce((out, d) => {
    out[d.action] = (out[d.action] ?? 0) + 1; return out;
  }, {}), cards: cards.length, archived: archivedCards.length,
  weightCases: weightCases.length, colors: colorCases.length }, null, 2));
