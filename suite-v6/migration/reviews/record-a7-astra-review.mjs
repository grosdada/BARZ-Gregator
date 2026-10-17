// Records the source-scoped decisions read by Astra on 2026-09-12.
// This is a review oracle, never a runtime compiler or automatic approval tool.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { validateAstraReview } from './validate-astra-review.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
async function pinned(relative, digest) {
  const bytes = await readFile(new URL(relative, import.meta.url));
  assert.equal(sha(bytes), digest, `Reviewed input changed: ${relative}`);
  return JSON.parse(bytes.toString('utf8'));
}
const bundleDigest = '049c4e94e5984b0f7ba1a3e36b5974500c966cace3815fa4a4503a1bd54a1f63';
const fixtureDigest = '54dbd96b3c1a8adf3edb6dd79d3ed6ed635ac99e98bd63519fe7378cda61053b';
const corpusDigest = 'bd15fa2df1b2effbf833d1ac484e9306b76e6f9945e372d2697ce86ebf79a126';
const bundle = JSON.parse(await readFile(new URL(
  '../atlas-v5/semantic-review/astra-bundles/a7-character-sheet.json', import.meta.url)));
assert.equal(bundle.bundleDigest, bundleDigest);
assert.equal(bundle.items.length, 41);
const fixture = await pinned('./a7-legacy-fixtures.json', fixtureDigest);
const corpus = await pinned('../atlas-v5/prompt-literals.json', corpusDigest);
const a4Digest = '074384fd6dddf491b84b0d1ec0319f15f97934e42f0994e626f1340d84115a1c';
const a4 = await pinned('./a4-astra-supplement.review.json', a4Digest);
const sheet = fixture.sheet;
const scoped = item => item.occurrences.filter(o => o.sourcePath === fixture.source.path);
const ids = new Set(bundle.items.map(x => x.id));
const extra = corpus.literals.filter(x => !ids.has(x.id) && scoped(x).length)
  .sort((a, b) => a.id.localeCompare(b.id));
assert.equal(extra.length, 345);
const compact = text => text.replace(/\s+/g, ' ').trim();

const headReplacements = [
  ['Preserve the same head angle, crop, lens, lighting and background across all panels',
    'Preserve the same camera position, crop, lens, lighting and background across all panels. Keep the head angle consistent except where the selected action explicitly requires a head movement'],
  ['Consistent head angle, eyes at the same height across each row',
    'Consistent framing and baseline eye height across each row; allow only the head and eye displacement required by the selected action']
];
function edits(value, replacements) {
  return replacements.reduce((text, [before, after]) => {
    assert.equal(text.split(before).length, 2, `Expected one occurrence: ${before}`);
    return text.replace(before, () => after);
  }, value);
}
const bodies = new Set([0, 2, 3, 6, 11, 21, 22, 26, 28, 33]);
const fragments = new Set([1, 4, 5, 7, 8, 16, 17, 25, 35]);
const metadata = new Set([9, 10, 13, 14, 18, 23, 29, 30, 31, 34, 40]);
const runtime = new Set([15, 20, 24, 27, 32, 36, 37, 38]);
const decisions = bundle.items.map((item, index) => {
  const base = { id: item.id, sourceIndex: index, originalValue: item.value,
    occurrences: scoped(item) };
  if (index === 12) return { ...base, action: 'correct', role: 'prompt-body',
    correctedValue: edits(item.value, headReplacements),
    reason: 'Le catalogue propose des rotations, inclinaisons et translations de tête. Les deux verrous absolus les contredisent ; conserver la caméra et autoriser le seul déplacement demandé.' };
  if (index === 39) return { ...base, action: 'correct', role: 'compiler-template',
    correctedValue: '${index + 1}. **${unit.label} — ${unit.name}:** ${unit.visible || unit.name}',
    reason: 'Utiliser le label canonique A4 avec variante deep, et la description BZ Sheet associée à son ID stable. Ne plus supprimer B : AU58 gauche et AU58B arrière ne doivent pas se confondre.' };
  const role = bodies.has(index) ? 'prompt-body' : fragments.has(index)
    ? 'prompt-fragment' : index === 19 ? 'compiler-placeholder' : null;
  if (role) return { ...base, action: 'preserve', role };
  assert.ok(metadata.has(index) || runtime.has(index), `Unreviewed item ${index}`);
  return { ...base, action: 'exclude-non-prompt',
    role: metadata.has(index) ? 'interface-metadata' : 'interface-or-runtime',
    reason: 'Libellé, résumé de carte, compteur, recherche ou identifiant lu dans son usage. Garder la fonction hors du texte de génération.' };
});

// Exact fields read in the fixture, not a prose-classification heuristic.
const preservedValues = new Map();
function retain(values, role) {
  values.filter(Boolean).forEach(value => preservedValues.set(value, role));
}
retain(sheet.facs.flatMap(u => [u.code, u.name, u.visible]), 'facs-catalog-field');
retain(Object.values(sheet.backgrounds), 'background-fragment');
retain(sheet.weaponOptions.filter(o => !['none', 'ref', 'neutral'].includes(o.value))
  .map(o => o.value), 'pose-option-fragment');
retain(['the weapon from [IMG_2]', 'bare hands / empty-hand combat'], 'pose-fragment');
retain([...Object.values(sheet.lightingTexts), ...Object.values(sheet.multiRefTexts),
  ...Object.values(sheet.subjectTexts), ...Object.values(sheet.accessoryTexts)],
  'dormant-prompt-fragment');
retain(['[POSE_GRID_DIRECTIVE]', '[POSE_WEAPON_DIRECTIVE]', '[WEAPON_LABEL]',
  '[FACS_SELECTION_PLACEHOLDER]', '[BG_COLOR_PLACEHOLDER]', '[LIGHTING_PLACEHOLDER]',
  '[MULTI_IMAGE_PLACEHOLDER]', '[ACCESSORY_PLACEHOLDER]', '[SUBJECT_PLACEHOLDER]'],
  'compiler-placeholder');
const optionCorrections = new Map([
  ['Flame trower', 'Flamethrower'], ['agjustable wrench', 'adjustable wrench']
]);
const extraDecisions = extra.map((item, index) => {
  const base = { id: item.id, sourceIndex: index, originalValue: item.value,
    occurrences: scoped(item) };
  if (optionCorrections.has(item.value)) return { ...base, action: 'correct',
    role: 'pose-option-fragment', correctedValue: optionCorrections.get(item.value),
    reason: 'Corriger une faute de frappe du nom de l’objet dans le texte et son libellé. Conserver la valeur historique comme clé de compatibilité.' };
  if (preservedValues.has(item.value)) return { ...base, action: 'preserve',
    role: preservedValues.get(item.value) };
  return { ...base, action: 'exclude-non-prompt', role: 'interface-or-runtime',
    reason: 'Valeur complémentaire lue dans BZ Sheet : interface, stockage, sélection, dessin SVG ou rendu HTML. Fonction conservée hors prompt ; cette décision ne valide aucun autre propriétaire du même ID.' };
});
const review = {
  schemaVersion: '1.0', bundleId: bundle.id, bundleDigest, status: 'reviewed',
  reviewerModel: 'gpt-6-astra', reviewedAt: '2026-09-12',
  scope: '41 bundle values, 345 additional source-scoped values, 11 full card bodies, 49 FACS rows, 19 pose options and source composition/events read. Legacy output fixtures mechanically checked. Runtime port pending.',
  decisions
};
const summary = validateAstraReview(bundle, review);
const allDecisions = new Map([...decisions, ...extraDecisions].map(d => [d.id, d]));
function provenance(value, normalized = false) {
  const literal = corpus.literals.find(x => scoped(x).length
    && (normalized ? compact(x.value) === compact(value) : x.value === value));
  assert.ok(literal, `No source provenance for ${value.slice(0, 90)}`);
  assert.ok(allDecisions.has(literal.id));
  return { literalId: literal.id, occurrences: scoped(literal) };
}
const cards = sheet.cards.map(card => ({ ...card,
  ...provenance(card.prompt, true), originalPrompt: card.prompt,
  prompt: card.id === 'complexexpressionboard' ? edits(card.prompt, headReplacements) : card.prompt,
  settings: card.id === 'tech-car' ? { aspectRatio: '3:4' }
    : card.id === 'master-reference' ? { aspectRatio: '4:3' } : {}
}));
const facs = sheet.facs.map(unit => {
  const canonical = a4.catalog.find(x => x.legacySheetCode === unit.code);
  assert.ok(canonical);
  assert.equal(canonical.name, unit.name);
  assert.equal(canonical.sheetPosition, unit.n);
  return { id: canonical.id, label: canonical.label, canonicalCode: canonical.canonicalCode,
    variant: canonical.variant, name: unit.name, category: unit.cat, sheetPosition: unit.n,
    legacySheetCode: unit.code, visible: unit.visible, ...provenance(unit.visible) };
});
assert.equal(new Set(facs.map(u => u.id)).size, 49);
const weapons = sheet.weaponOptions.map(option => ({ ...option,
  promptValue: optionCorrections.get(option.value) ?? option.value,
  label: option.value === 'neutral' ? 'Mains nues (combat)'
    : optionCorrections.get(option.value) ?? option.label
}));
const neutralGrid = `**ROW 1 — EMPTY-HAND LOCOMOTION / APPROACH:**
1. Guarded idle with empty hands | 2. Advancing step in a bare-hand guard | 3. Defensive side-step | 4. Low evasive run | 5. Full sprint with empty hands

**ROW 2 — EMPTY-HAND ATTACK / THREAT READABILITY:**
1. Ready punch stance | 2. Straight punch at full extension | 3. Crouched fighting stance | 4. Open-hand strike | 5. Victory / intimidation stance with empty hands

**ROW 3 — EMPTY-HAND GUARD / RECOVERY:**
1. Forward guard with empty hands | 2. Side-facing guard with empty hands | 3. Two-hand protective guard | 4. Taking cover with empty hands | 5. Recovering balance and resetting the guard

**ROW 4 — EMPTY-HAND EXPRESSIONS / EMOTIONS:**
1. Confident smile in a bare-hand guard | 2. Dejected defensive posture | 3. Angry attack glare with empty hands | 4. Surprised defensive reaction | 5. Fearful retreat with empty hands

**ROW 5 — EMPTY-HAND DEFENSE / IMPACT:**
1. Bare-hand fighting stance | 2. Punch or palm strike | 3. Evasive kick or body shift | 4. Bare-hand block or parry | 5. Knocked-back / hit reaction with empty hands`;
assert.equal((neutralGrid.match(/^\*\*ROW /gm) ?? []).length, 5);
assert.equal((neutralGrid.match(/(?:^|\| )\d\. /gm) ?? []).length, 25);
const defaultGrid = bundle.items[35].value;
const armedGrid = bundle.items[16].value;
const emptyDirective = bundle.items[5].value;
const weaponDirective = bundle.items[17].value;

function oracle(id, state, legacy = false) {
  const card = cards.find(c => c.id === id);
  assert.ok(card);
  let prompt = legacy ? card.originalPrompt : card.prompt;
  if (id === 'posesheet') {
    const option = weapons.find(o => o.value === state.weapon);
    assert.ok(option);
    const label = option.value === 'ref' ? 'the weapon from [IMG_2]'
      : option.value === 'neutral' ? 'bare hands / empty-hand combat'
      : legacy ? option.value : option.promptValue;
    const directive = option.value === 'none' ? '' : option.value === 'neutral'
      ? emptyDirective : weaponDirective.replace('${label}', () => label);
    const grid = option.value === 'none' ? defaultGrid
      : option.value === 'neutral' && !legacy ? neutralGrid
      : armedGrid.replaceAll('[WEAPON_LABEL]', () => label);
    prompt = prompt.replace('[POSE_WEAPON_DIRECTIVE]', () => directive)
      .replace('[POSE_GRID_DIRECTIVE]', () => grid);
  }
  if (id === 'complexexpressionboard') {
    assert.equal(state.facs.length, 8, 'Exactly eight selections required to compile');
    assert.equal(new Set(state.facs).size, 8);
    const lines = state.facs.map((code, index) => {
      const unit = facs.find(u => u.legacySheetCode === code);
      assert.ok(unit, `Unknown FACS ${code}`);
      const label = legacy ? code.replace(/B$/, '') : unit.label;
      return `${index + 1}. **${label} — ${unit.name}:** ${unit.visible}`;
    });
    prompt = prompt.replace('[FACS_SELECTION_PLACEHOLDER]', () => lines.join('\n'));
  }
  const background = sheet.backgrounds[state.backgrounds[id]];
  assert.ok(background);
  return legacy ? prompt.replace('[BG_COLOR_PLACEHOLDER]', () => background)
    : prompt.replaceAll('[BG_COLOR_PLACEHOLDER]', () => background);
}
const outputs = state => Object.fromEntries(cards.map(c => [c.id, oracle(c.id, state)]));
for (const stateName of ['default', 'configured']) {
  const state = sheet[`${stateName}State`];
  for (const card of cards) {
    assert.equal(oracle(card.id, state, true), sheet[`${stateName}Outputs`][card.id]);
    if (!['objectsheet', 'complexexpressionboard'].includes(card.id)) {
      assert.equal(oracle(card.id, state), sheet[`${stateName}Outputs`][card.id]);
    }
  }
}
const weaponCases = weapons.map(option => ({ weapon: option.value,
  output: oracle('posesheet', { ...sheet.defaultState, weapon: option.value }) }));
const backgroundCases = cards.flatMap(card => Object.keys(sheet.backgrounds).map(color => ({
  cardId: card.id, background: color,
  digest: sha(oracle(card.id, { ...sheet.defaultState,
    backgrounds: { ...sheet.defaultState.backgrounds, [card.id]: color } }))
})));
const headCodes = ['AU58', 'AU58B', 'AU56', 'AU56B', 'AU57', 'AU57B', 'AU53', 'AU54'];
const headOutput = oracle('complexexpressionboard', { ...sheet.defaultState, facs: headCodes });
assert.match(headOutput, /1\. \*\*AU51 — Head Turn Left/);
assert.match(headOutput, /2\. \*\*AU58 — Head Back/);
assert.match(headOutput, /4\. \*\*AU56 \(deep\)/);
assert.doesNotMatch(weaponCases.find(x => x.weapon === 'neutral').output,
  /WEAPON HANDLING|ARMED LOCOMOTION|Reloading|aimed or presented/);
assert.ok(weaponCases.every(x => !x.output.includes('[POSE_')));
assert.ok(backgroundCases.length === 44);
for (const invalid of [[], ['AU1'], Array(8).fill('AU1'), [...headCodes, 'AU2']]) {
  assert.throws(() => oracle('complexexpressionboard', { ...sheet.defaultState, facs: invalid }));
}
const supplement = {
  schemaVersion: '1.0', status: 'reviewed', reviewerModel: 'gpt-6-astra',
  reviewedAt: '2026-09-12', source: fixture.source, fixtureDigest, corpusDigest, a4Digest,
  additionalLiteralCount: extra.length, decisions: extraDecisions,
  scope: 'Only barzy_sheet.html occurrences. Dormant fragments preserved in review archive; shared IDs do not approve other tools.',
  catalog: { title: 'BZ Sheet', tabs: sheet.tabs, cards, backgrounds: sheet.backgrounds,
    weapons, facs, defaultState: { ...sheet.defaultState,
      facs: sheet.defaultState.facs.map(code => facs.find(u => u.legacySheetCode === code).id),
      facsSearch: '', expandedCardIds: [], customOutputs: {} } },
  metadataCorrections: [{ originalValue: 'neutral (main nu)',
    value: 'Mains nues (combat)', ...provenance('neutral (main nu)'),
    reason: 'Corriger la faute française et distinguer le combat mains nues du mode standard None.' }],
  approvedComposition: { neutralGrid, defaultGrid, armedGrid, emptyDirective, weaponDirective,
    background: 'Replace every built-in background placeholder; render/copy/bridge use one output.',
    facs: 'Shared A4 identities and labels, source-specific A7 visible descriptions. Zero to eight saved selections, exactly eight unique known IDs for generated FACS board. No silent filling or truncation.',
    options: 'Persist the 19 legacy option keys; use reviewed promptValue/label. No freeform weapon field required.',
    reference: 'Keep original reference markers and Scene Description/STYLE placeholders literal in compiled built-ins. Final prompt editing remains possible. Do not infer actual asset IDs.',
    customOutputs: 'Keep final custom text verbatim until explicit recompile; reset preserves customOutputs. Structured FACS validation applies only when compiling from controls. A custom final can be copied/sent unchanged even with an incomplete current selection.',
    settings: 'Only built-in tech-car specifies 3:4 and master-reference 4:3. Other cards send no inferred ratio. Custom finals do not infer settings from stale card text.',
    dormant: 'Archive lighting/multiref/subject/accessory fragments; no active controls or injection for targets absent from BZ Sheet.' },
  approvedExpectedOutputs: {
    defaultOutputs: outputs(sheet.defaultState), configuredOutputs: outputs(sheet.configuredState),
    weaponCases, backgroundCases, headCase: { legacyCodes: headCodes, output: headOutput }
  },
  fixtureLimitations: [
    'Source SHA matched at review. Fixture retained unchanged, including first-only background replacement.',
    'Fixtures isolate source data/functions, but hand-copy clipboard composition; oracle checks equality to all 22 fixture outputs, not browser execution.',
    'VM is not a security sandbox. The known local source was inspected; never use this extraction method for imported user scripts.',
    'FACS identity and labels reuse A4; descriptions are a BZ Sheet projection, not silent replacements of A4 descriptions.',
    'Theme normalization is not part of the output contract; V6 preserves the fixture formatting.',
    'Storage, UI, bridge, setup versions and runtime migration still require Sol verification.'
  ]
};
for (const relative of ['./a7-astra.review.json',
  '../atlas-v5/semantic-review/astra-reviews/a7-character-sheet.review.json']) {
  await writeFile(new URL(relative, import.meta.url), `${JSON.stringify(review, null, 2)}\n`);
}
await writeFile(new URL('./a7-astra-supplement.review.json', import.meta.url),
  `${JSON.stringify(supplement, null, 2)}\n`);
console.log(JSON.stringify({ ...summary, supplemental: extra.length,
  supplementalCounts: extraDecisions.reduce((out, d) => {
    out[d.action] = (out[d.action] ?? 0) + 1; return out;
  }, {}), cards: cards.length, weapons: weapons.length, facs: facs.length,
  backgroundCases: backgroundCases.length }, null, 2));
