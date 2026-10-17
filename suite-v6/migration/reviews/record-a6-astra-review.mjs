// Serializes decisions manually read by Astra; never infers approval from a heuristic.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { validateAstraReview } from './validate-astra-review.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
async function pinned(relative, digest) {
  const bytes = await readFile(new URL(relative, import.meta.url));
  assert.equal(sha(bytes), digest, `Reviewed input changed: ${relative}`);
  return JSON.parse(bytes.toString('utf8'));
}
const bundleDigest = '9a77383da0be29b0be771788c4c611454a58983bdf835b8aba9e98f223fdb8ae';
const fixtureDigest = 'ba42759e53c446976d8a998e81b9a0fa1b2b64aff3bc1867b60e4a913d5ba727';
const corpusDigest = 'bd15fa2df1b2effbf833d1ac484e9306b76e6f9945e372d2697ce86ebf79a126';
const bundle = JSON.parse(await readFile(new URL('../atlas-v5/semantic-review/astra-bundles/a6-consistent-character-process.json', import.meta.url), 'utf8'));
assert.equal(bundle.bundleDigest, bundleDigest);
assert.equal(bundle.items.length, 44);
const fixture = await pinned('./a6-legacy-fixtures.json', fixtureDigest);
const corpus = await pinned('../atlas-v5/prompt-literals.json', corpusDigest);
const ccp = fixture.ccp;
const sourcePath = fixture.source.path;
const scoped = item => item.occurrences.filter(o => o.sourcePath === sourcePath);
const bundleIds = new Set(bundle.items.map(x => x.id));
const extra = corpus.literals.filter(x => !bundleIds.has(x.id) && scoped(x).length)
  .sort((a, b) => a.id.localeCompare(b.id));
assert.equal(extra.length, 51);

function edits(value, replacements) {
  return replacements.reduce((text, [before, after]) => {
    assert.equal(text.split(before).length, 2, `Expected one reviewed occurrence: ${before}`);
    return text.replace(before, () => after);
  }, value);
}
const correctionSpecs = new Map([
  [10, {
    role: 'compiler-template',
    replacements: [[
      'PROMPT ATLAS GRID OVERRIDE: Use exactly ${atlasGrid.total} panels in a ${gridLabel} grid. Number panels row by row from left to right. If an older shot list names 9 panels, keep its cinematic intent but adapt it to the selected grid.',
      'OUTPUT GRID: Generate exactly ${atlasGrid.total} panels in a ${gridLabel} grid. Label panels row by row from left to right, in this order: ${panelCodes.join(", ")}. Only these panel labels may appear.'
    ]],
    reason: 'Remplacer le rattrapage ambigu de neuf panneaux par la liste exacte des codes. Ce suffixe est réservé aux sorties A1/B ; il est supprimé de C qui produit une seule image. Les templates sont adaptés séparément selon leur rôle.'
  }],
  [22, {
    role: 'prompt-fragment',
    replacements: [['in a reallocation', 'in a real location'], ['intentionalnon-realistic', 'intentional non-realistic']],
    reason: 'Deux mots accidentellement fusionnés : lieu réel et proportions intentionnellement non réalistes. La contrainte de figurine est inchangée.'
  }],
  [32, {
    role: 'prompt-body',
    replacements: [
      ['framing, posing. lighting and render.', 'framing, posing, lighting and render.'],
      ['This are references for a practical puppet/figurine characters.', 'These are references for a practical puppet/figurine character.'],
      ['No text on image.', 'No text on the image.']
    ],
    reason: 'Corriger la ponctuation cassée, les accords du démonstratif/verbe et du personnage singulier, et ajouter l’article manquant. Fidélité, proportions et interdiction de texte conservées.'
  }]
]);
const bodyIndices = new Set([1, 11, 29, 35]);
const fragmentIndices = new Set([0, 7, 15, 18, 19, 25, 40]);
const compilerIndices = new Set([2, 9, 12, 13, 14, 17, 21, 23, 33, 34, 43]);
const metadataIndices = new Set([3, 6, 16, 26, 28, 37]);
const runtimeIndices = new Set([4, 5, 8, 20, 24, 27, 30, 31, 36, 38, 39, 41, 42]);
const decisions = bundle.items.map((item, index) => {
  const base = { id: item.id, sourceIndex: index, originalValue: item.value, occurrences: scoped(item) };
  const correction = correctionSpecs.get(index);
  if (correction) return { ...base, action: 'correct', role: correction.role,
    correctedValue: edits(item.value, correction.replacements), reason: correction.reason };
  const role = bodyIndices.has(index) ? 'prompt-body' : fragmentIndices.has(index) ? 'prompt-fragment'
    : compilerIndices.has(index) ? 'compiler-template' : null;
  if (role) return { ...base, action: 'preserve', role };
  assert.ok(metadataIndices.has(index) || runtimeIndices.has(index), `Unreviewed bundle item ${index}`);
  return { ...base, action: 'exclude-non-prompt', role: metadataIndices.has(index) ? 'interface-metadata' : 'interface-or-runtime',
    reason: 'Valeur lue dans son usage : libellé, message ou identifiant du parcours. Conserver sa fonction dans l’interface/adaptateur ; ne pas la concaténer comme recette.' };
});
const supplementalCompiler = new Set([11, 22, 29, 43]);
const supplementalMetadata = new Set([0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 14, 16, 17, 20, 24, 25, 30, 31, 32, 34, 36, 37, 42, 50]);
const supplementalRuntime = new Set([3, 7, 13, 15, 18, 19, 21, 23, 26, 27, 28, 33, 35, 38, 39, 40, 41, 44, 45, 46, 47, 48, 49]);
const extraDecisions = extra.map((item, index) => {
  const base = { id: item.id, sourceIndex: index, originalValue: item.value, occurrences: scoped(item) };
  if (supplementalCompiler.has(index)) return { ...base, action: 'preserve', role: 'compiler-template' };
  assert.ok(supplementalMetadata.has(index) || supplementalRuntime.has(index), `Unreviewed extra item ${index}`);
  return { ...base, action: 'exclude-non-prompt', role: supplementalMetadata.has(index) ? 'interface-metadata' : 'interface-or-runtime',
    reason: 'Occurrence CCP lue : navigation, mode, stockage, message ou rendu de page. Conservation fonctionnelle hors texte compilé ; cette décision ne concerne aucun autre propriétaire du même ID.' };
});
const review = {
  schemaVersion: '1.0', bundleId: bundle.id, bundleDigest, status: 'reviewed',
  reviewerModel: 'gpt-6-astra', reviewedAt: '2026-09-12',
  scope: 'All 44 bundle values and 51 additional source-scoped literals read, five fixture templates, four resolved mode texts, four variations, eight fixture outputs, source composition and event handlers. Runtime port pending.',
  decisions
};
const summary = validateAstraReview(bundle, review);
const byId = new Map([...decisions, ...extraDecisions].map(d => [d.id, d]));
function catalogEntry(id, value) {
  const literal = corpus.literals.find(x => x.value === value && scoped(x).length);
  assert.ok(literal, `No source provenance for ${id}`);
  const decision = byId.get(literal.id);
  assert.ok(decision && decision.action !== 'exclude-non-prompt', `Unreviewed catalog text ${id}`);
  return { id, literalId: literal.id, originalPrompt: value,
    prompt: decision.correctedValue ?? value, occurrences: scoped(literal) };
}
const templates = Object.entries(ccp.promptTemplates).map(([key, body]) => ({ key, ...catalogEntry(`cccp-${key}`, body) }));
const variants = ccp.storyboardVariations.map((v, index) => ({ index, ...catalogEntry(`cccp-variation-${index}`, v) }));
const puppetFragment = bundle.items[22].value;
const correctedPuppet = decisions[22].correctedValue;
const modes = Object.entries(ccp.modeTexts).flatMap(([stage, values]) => Object.entries(values).map(([mode, body]) => {
  if (stage !== 'a2' || mode !== 'puppet') return { stage, mode, ...catalogEntry(`cccp-${stage}-${mode}`, body) };
  assert.equal(body, `MODE: Puppet / figurine character. ${puppetFragment}`);
  return { id: 'cccp-a2-puppet', stage, mode, originalPrompt: body,
    prompt: `MODE: Puppet / figurine character. ${correctedPuppet}`,
    literalIds: [bundle.items[34].id, bundle.items[22].id],
    occurrences: [...scoped(bundle.items[34]), ...scoped(bundle.items[22])] };
}));

// Review-only output oracle. No runtime imports this recorder or executes source templates.
const baseTemplates = Object.fromEntries(templates.map(t => [t.key, t.prompt]));
const outputSuffix = 'OUTPUT GRID: Generate exactly {{total}} panels in a {{grid}} grid. Label panels row by row from left to right, in this order: {{codes}}. Only these panel labels may appear.';
const coverageInstruction = 'Shot coverage palette (not a panel count or a fixed layout):\nSelect and adapt the following framing ideas to fill exactly {{total}} distinct panels. For fewer panels, choose a balanced subset; for more panels, vary these framings. Preserve character identity in every panel.';
function gridInfo(grid) {
  assert.ok([grid.cols, grid.rows].every(v => Number.isInteger(v) && v >= 2 && v <= 4));
  const codes = Array.from({ length: grid.rows }, (_, row) => Array.from({ length: grid.cols }, (_, col) => `${String.fromCharCode(65 + row)}${col + 1}`)).flat();
  return { spec: `${grid.cols}x${grid.rows}`, total: codes.length, codes, last: codes.at(-1) };
}
function gridOutput(stage, grid) {
  const g = gridInfo(grid);
  let text = baseTemplates[stage];
  if (stage === 'b') text = edits(text, [[' (3x3 Grid 1)', '']]).replace(/\nUSER SCENE INPUT:\s*$/, '');
  // A non-3x3 output retains all nine framing ideas as a palette, without invalid cell codes.
  if (stage === 'a1' && g.spec !== '3x3') {
    text = edits(text, [['The 9-Panel Shot List:', coverageInstruction.replace('{{total}}', () => String(g.total))]])
      .replace(/^Row [ABC] \(([^\n]+)\):\n/gm, '')
      .replace(/^- Panel [ABC][123]: /gm, '- ');
  }
  text = text.replaceAll('3x3', g.spec)
    .replace(/\b9-panel\b/gi, `${g.total}-panel`)
    .replace(/\b9 panels\b/g, `${g.total} panels`)
    .replace(/\b9 distinct\b/g, `${g.total} distinct`)
    .replace(/\ball nine\b/g, `all ${g.total}`)
    .replace(/\b9 frames\b/g, `${g.total} frames`)
    .replace('3-row by 3-column', `${grid.rows}-row by ${grid.cols}-column`)
    .replace('from A1 to C3', `from A1 to ${g.last}`);
  return `${text}\n\n${outputSuffix.replace('{{total}}', () => String(g.total)).replace('{{grid}}', () => g.spec).replace('{{codes}}', () => g.codes.join(', '))}`;
}
function expectedOutputs(state) {
  const g = gridInfo(state.grid);
  const mode = stage => modes.find(m => m.stage === stage && m.mode === state.modes[stage]).prompt;
  const code = state.panelCode.trim().toUpperCase() || 'A1';
  assert.ok(g.codes.includes(code));
  let b = `${gridOutput('b', state.grid)}\n\n${mode('b')}\n\nUSER SCENE INPUT:\n${state.scene}`;
  if (state.iterationTake > 0) b += `\n\nITERATION - Take ${state.iterationTake + 1}: Generate a NEW variation of this ${g.total}-panel storyboard. ${variants[(state.iterationTake - 1) % variants.length].prompt}. Do not reproduce the previous layout; deliver a genuinely different take on the same scene.`;
  return {
    a1: gridOutput('a1', state.grid),
    a2: `${baseTemplates.a2}\n\n${mode('a2')}`,
    b,
    c: baseTemplates[state.modes.c === 'puppet' ? 'c_puppet' : 'c'].replaceAll('3x3', g.spec)
      .replace('[PANEL_CODE]', () => code).replace('[INSERT PANEL CODE HERE, e.g., A2]', () => code)
  };
}
const defaultOutputs = expectedOutputs(ccp.defaultState);
const configuredOutputs = expectedOutputs(ccp.configuredState);
assert.equal(configuredOutputs.a2, ccp.configuredOutputs.a2);
assert.equal(configuredOutputs.c, ccp.configuredOutputs.c.split('\n\nPROMPT ATLAS GRID OVERRIDE:')[0]);
assert.ok(!configuredOutputs.a1.includes('Panel C3') && !configuredOutputs.a1.includes('3-row by 3-column'));
assert.ok(!configuredOutputs.b.includes('Grid 1'));
assert.ok(!defaultOutputs.c.includes('OUTPUT GRID') && !defaultOutputs.c.includes('GRID OVERRIDE'));
const gridCases = [];
for (const rows of [2, 3, 4]) for (const cols of [2, 3, 4]) {
  const grid = { cols, rows };
  const g = gridInfo(grid);
  const out = expectedOutputs({ ...ccp.configuredState, grid, panelCode: g.last });
  assert.ok(out.a1.includes(`from A1 to ${g.last}`));
  assert.ok(out.a1.includes(`${rows}-row by ${cols}-column`));
  assert.ok(out.b.includes(g.codes.join(', ')));
  assert.ok(out.c.includes(`code: ${g.last}`));
  gridCases.push({ grid, panelCodes: g.codes, outputDigests: Object.fromEntries(Object.entries(out).map(([k, v]) => [k, sha(v)])) });
}
const supplement = {
  schemaVersion: '1.0', status: 'reviewed', reviewerModel: 'gpt-6-astra', reviewedAt: '2026-09-12',
  source: fixture.source, fixtureDigest, corpusDigest, additionalLiteralCount: extra.length,
  scope: 'All decisions apply only to cccp.html occurrences. UI exclusions retain their functional role. No other owner is approved by shared IDs.',
  decisions: extraDecisions,
  catalog: { stages: ccp.stages, templates, modes, variations: variants },
  metadataCorrections: [
    { id: extra[17].id, before: extra[17].value, after: 'Consistent Character Process', reason: 'Processus est français ; Process est le nom anglais.' },
    { id: extra[1].id, before: extra[1].value, after: 'CCP - Consistent Character Process', reason: 'Même correction du sous-titre dans le titre de page.' }
  ],
  approvedComposition: {
    outputSuffix, coverageInstruction,
    a1: '3x3 retains the nine numbered source shots. Other grids remove row headings and panel prefixes from that list, retaining all nine framing bodies as an explicitly unnumbered palette. Adapt count, rows/columns and label range; append exact row-major codes.',
    a2: 'Always seven views (four full-body plus three portraits), independent of grid. Append only its selected mode. Puppet mode inherits the corrected source fragment.',
    b: 'Remove the reference-only parenthesis (3x3 Grid 1) before adapting the OUTPUT dimensions. Append output suffix, mode, USER SCENE INPUT, intact user scene, then optional iteration. Reference sheet dimensions are never inferred from output dimensions.',
    c: 'Substitute selected SOURCE grid and valid panel in the selected human/puppet body. Never append any output-grid suffix. One standalone image, no labels.',
    userText: 'Adapt built-in templates before inserting user text. Render user values literally. Custom final prompts stay unchanged until explicit recompile.'
  },
  approvedExpectedOutputs: { defaultOutputs, configuredOutputs, gridCases },
  fixtureLimitations: [
    'Fixtures execute isolated data and selected compiler functions, not full DOM, clipboard, postMessage or persistence.',
    'Legacy source hash verified at review time. Fixture JSON remains unchanged and deliberately preserves the single-image/grid contradiction.',
    'Eight fixture outputs do not prove transitions. Sol must test mode independence, iteration cycle/reset, invalid inputs, per-setup persistence and bridge.',
    'The review oracle creates expected texts only. It is not a runtime implementation or evidence of successful image generation.'
  ]
};
for (const relative of ['./a6-astra.review.json', '../atlas-v5/semantic-review/astra-reviews/a6-consistent-character-process.review.json']) {
  await writeFile(new URL(relative, import.meta.url), `${JSON.stringify(review, null, 2)}\n`);
}
await writeFile(new URL('./a6-astra-supplement.review.json', import.meta.url), `${JSON.stringify(supplement, null, 2)}\n`);
console.log(JSON.stringify({ ...summary, supplemental: extra.length,
  supplementalPreserved: extraDecisions.filter(d => d.action === 'preserve').length,
  templates: templates.length, modes: modes.length, variations: variants.length, gridCases: gridCases.length }, null, 2));
