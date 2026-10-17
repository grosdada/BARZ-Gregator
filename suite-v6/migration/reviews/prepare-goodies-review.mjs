// Reproducible, read-only capture of the Astra-reviewed source. Outputs JSON
// artifacts to stdout; the caller saves them with apply_patch. No app/API runs.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { compileRecipe } from '../../packages/prompt-runtime/src/index.js';

const sourcePath = 'Barzy App/public/assets/HTML/banana_helper.html';
const sourceHash = '3d29b8158aa51b5dbf45dbb9d6c2ebb868c4539d825209fd8b7bde606fb1bc7c';
const source = readFileSync(resolve(process.argv[2], sourcePath), 'utf8');
const hash = value => createHash('sha256').update(value).digest('hex');
assert.equal(hash(source), sourceHash, 'Legacy source changed: review before recapturing');
const dataText = source.match(/const DATA = (\{[\s\S]*?\n    \});/)[1];
const data = JSON.parse(dataText); // Data is strict JSON; never evaluate the HTML.
const suffix = JSON.parse(source.match(/const suffix = ("[^\r\n]*");/)[1]);
const legacyFunction = source.match(/    function finalPrompt\(item, detail\) \{[\s\S]*?\n    \}/)[0].trim();
const corpus = JSON.parse(readFileSync(new URL('../atlas-v5/prompt-literals.json', import.meta.url), 'utf8')).literals;
const literals = corpus.filter(item => item.occurrences.some(o => o.sourcePath === sourcePath));
const provenance = value => {
  const item = literals.find(item => item.value === value);
  assert.ok(item, `Missing source literal: ${value.slice(0,80)}`);
  return { corpusId: item.id, sourceLine: item.occurrences.find(o => o.sourcePath === sourcePath).line };
};
const categories = Object.entries(data).map(([id, items], order) => ({ id, title: id === 'fun' ? 'Fun' : id, order, count: items.length }));
const entries = Object.entries(data).flatMap(([categoryId, items]) => items.map(([title, original], order) => {
  const id = `goodies-${categoryId}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
  let text = original;
  const corrections = [];
  for (const [before, after, reason] of [
    ['a 1980s', 'an 1980s', 'The spoken decade begins with a vowel sound (eighties).'],
    ['No text on image.', 'No text on the image.', 'Restore the missing definite article.'],
    ['Generate character design for me', 'Generate a character design for me', 'Restore the missing indefinite article.']
  ]) {
    if (!text.includes(before)) continue;
    text = text.replaceAll(before, after);
    corrections.push({ kind: 'grammar', before, after, reason });
  }
  const recipe = {
    schemaVersion: '1.0', id: `${id}-v1`, revision: 1, title,
    fields: [{ id: 'scene', label: 'Détails', type: 'text', maxLength: 4000, default: '[Details]' }],
    outputs: [{ id: 'main', mediaType: 'image', template: (text + suffix).replaceAll('[Scene Description]', '{{scene}}'), negativePrompt: '', settings: {} }],
    referenceSlots: [], origin: 'builtin'
  };
  compileRecipe(recipe);
  return { id, categoryId, order, title, classification: 'prompt-template', ...provenance(original), original, text, corrections, recipe };
}));
assert.equal(entries.length, 77);
assert.equal(new Set(entries.map(e => e.id)).size, 77);
assert.equal(entries.filter(e => e.corrections.length).length, 16);
assert.equal(entries.reduce((n, e) => n + e.corrections.length, 0), 17);

// Execute ONLY the reviewed three-line pure function with fixed input and suffix.
const context = vm.createContext({ suffix }, { codeGeneration: { strings: false, wasm: false } });
new vm.Script(legacyFunction).runInContext(context, { timeout: 1000 });
const legacyCompile = (entry, detail) => {
  context.item = { prompt: entry.original }; context.detail = detail;
  return new vm.Script('finalPrompt(item, detail)').runInContext(context, { timeout: 1000 });
};
// Independent literal-substitution oracle for the desired behavior.
const v6Compile = (entry, detail) => (entry.text + suffix).split('[Scene Description]').join(detail.trim() || '[Details]');
const inputs = categories.flatMap(({ id }) => {
  const first = entries.find(e => e.categoryId === id);
  return ['', '  A brass robot holding a blue umbrella  '].map((detail, i) => ({ id: `${id}-${i ? 'filled' : 'empty'}`, operation: 'compile', entryId: first.id, detail }));
});
for (const entry of entries.filter(e => e.categoryId === 'fun').slice(1)) {
  inputs.push({ id: `fun-${entry.id}`, operation: 'compile', entryId: entry.id, detail: 'A toy fox with a red scarf' });
}
for (const [id, detail] of [
  ['whitespace', ' \t\r\n '], ['literal-markup-unicode', "  <b>L’atelier</b>  café\nseconde ligne {{scene}} [Scene Description]  "],
  ['dollar-match', '$&'], ['dollar-dollar', '$$'], ['dollar-prefix', '$`'], ['dollar-suffix', "$'"],
  ['literal-references', '[Image1] beside @image2'], ['maximum-details', 'x'.repeat(4000)]
]) inputs.push({ id, operation: 'compile', entryId: entries[0].id, detail });
for (const { id } of categories) inputs.push({ id: `category-${id}`, operation: 'copy-category-without-details', categoryId: id });
inputs.push({ id: 'catalog-all', operation: 'copy-all-without-details' });
function output(input, compile) {
  if (input.operation === 'compile') return compile(entries.find(e => e.id === input.entryId), input.detail);
  const selected = input.categoryId ? entries.filter(e => e.categoryId === input.categoryId) : entries;
  return selected.map(e => `${e.categoryId} / ${e.title}\n${compile(e, '')}`).join('\n\n');
}
const cases = inputs.map(input => ({ ...input, legacyExpected: output(input, legacyCompile), v6Expected: output(input, v6Compile) }));
for (const entry of entries) {
  for (const detail of ['', 'Un sujet, du texte <b>brut</b>, $& $$', '  détail\n  double espace  ']) {
    assert.equal(compileRecipe(entry.recipe, { scene: detail.trim() || '[Details]' })[0].prompt, v6Compile(entry, detail));
  }
}
const roles = new Map(entries.flatMap(e => [[e.original, 'prompt-template'], [e.title, 'entry-title']]));
for (const c of categories) roles.set(c.id, 'category-id');
roles.set(suffix, 'composition-suffix'); roles.set('[Details]', 'composition-fallback');
roles.set('[Scene Description]', 'composition-marker');
const classification = literals.map(item => ({ corpusId: item.id, role: roles.get(item.value) ?? 'ui-or-runtime-context', sourceLines: [...new Set(item.occurrences.filter(o => o.sourcePath === sourcePath).map(o => o.line))] }));
const review = {
  schemaVersion: '1.0', artifactType: 'semantic-review-staging', toolId: 'banana-helper', title: 'BZ Goodies', reviewer: 'Astra', reviewedAt: '2026-09-11',
  status: { content: 'reviewed', referenceFixtures: 'captured-and-checked', v6Runtime: 'not-integrated' },
  source: { path: sourcePath, sha256: sourceHash, contentLines: [235, 330], behaviorLines: [332, 438] },
  dependency: { path: 'Barzy App/public/assets/barzy-theme.js', sha256: '5870fa2856910bef1fc8d130aecb72383b89e8d1c22540ca11af13c3bf5963d0', finding: 'cleanText and MutationObserver can alter displayed prompt whitespace or branding without changing clipboard output. Do not port them into the prompt renderer.' },
  categories, entries,
  composition: { suffix, ...provenance(suffix), marker: '[Scene Description]', fallback: '[Details]', trimOuterWhitespace: true, preserveInteriorWhitespace: true, replacement: 'literal-single-pass', legacyFunction, legacyFunctionSha256: hash(legacyFunction), bulkEntryHeader: 'categoryId / title\nprompt', bulkSeparator: '\n\n', bulkIncludesDetails: false },
  decisions: [
    { id: 'identity', decision: 'Keep stable toolId banana-helper; expose BZ Goodies. Use adapterId prompt-library for the generic library renderer. No duplicate registration under bz-goodies.' },
    { id: 'copy-without-details', decision: 'Preserve the actual legacy operation: compile with [Details] and common suffix. Keep label Copier sans détails, correct misleading Raw prompt copied toast. This label is not itself a defect. No extra raw-copy control is needed.' },
    { id: 'text-constraints', decision: 'Preserve both constraints and their order, including typography exception in the common suffix. Removing either would change the creative contract. The seven Fun entries remain explicitly text-free; expose full editable text in the future library editor.' },
    { id: 'stable-entry-state', decision: 'Persist detailsByPrompt using entry IDs, never filtered indexes. Preserve edits across search, categories, tool switches, setup duplicates and saved versions.' },
    { id: 'literal-input', decision: 'Repair dollar replacement-token expansion by using the existing callback-based V6 recipe compiler. Only the detail boundary is trimmed; inner spaces, line breaks, dollar signs and markup stay literal.' },
    { id: 'bulk', decision: 'Keep category and full-catalog copy in canonical order with blank details. Label Copier la catégorie sans détails / Tout copier sans détails. Search changes visible cards only, not these explicit bulk scopes.' },
    { id: 'references', decision: 'Retain historical [Image1], [Image2], [Image3] as prompt text. They are not V6 referenceSlot IDs and do not attach images. Do not silently remap them to @imageN without an explicit reference binding.' },
    { id: 'creative-fidelity', decision: 'All entries emit image prompts, including VHS and video-still themes. Preserve all decades (no invented 1990s category), scene motifs, suffix and distinct Fun uses; apply only the 17 recorded grammar substitutions.' }
  ],
  verification: { promptCount: entries.length, correctedEntryCount: 16, grammarSubstitutions: 17, fixtureCount: cases.length, recipeCompileChecks: entries.length * 3, providerCalls: 0, browserChecked: false, scope: 'Offline source/review/compiler checks; runtime UI and persistence remain for Sol.' },
  corpusClassification: classification
};
const fixtures = { schemaVersion: '1.0', sourceSha256: sourceHash, methodology: 'legacyExpected captured from reviewed legacy function in a restricted VM; v6Expected built with independent split/join oracle and compared to existing V6 compiler. Neither is a browser capture.', cases };
const artifacts = { 'banana-goodies.review.json': review, 'banana-goodies.fixtures.json': fixtures };
if (process.argv[3]) {
  assert.ok(Object.hasOwn(artifacts, process.argv[3]));
  process.stdout.write(JSON.stringify(artifacts[process.argv[3]], null, 2) + '\n');
} else {
  process.stdout.write(JSON.stringify({ entries: entries.length, corrected: 16, substitutions: 17, fixtures: cases.length, literalFixCases: cases.filter(c => c.id.startsWith('dollar-')).map(c => ({ id: c.id, changed: c.legacyExpected !== c.v6Expected })), classifiedLiterals: classification.length, sourceSha256: sourceHash }));
}
