import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { compileRecipe } from '../packages/prompt-runtime/src/index.js';

const read = name => JSON.parse(readFileSync(new URL(`../migration/${name}`, import.meta.url), 'utf8'));
const review = read('reviews/banana-goodies.review.json');
const fixtures = read('reviews/banana-goodies.fixtures.json');
const corpus = read('atlas-v5/prompt-literals.json');
const manifest = read('atlas-v5/source-manifest.json');
const hash = value => createHash('sha256').update(value).digest('hex');

test('Goodies review retains all 77 source entries and only documented grammar changes', () => {
  assert.equal(review.source.sha256, manifest.sources.find(s => s.sourcePath === review.source.path).sha256);
  assert.equal(review.entries.length, 77);
  assert.equal(new Set(review.entries.map(e => e.id)).size, 77);
  assert.deepEqual(review.categories.map(c => [c.id, c.count]), [
    ['1930s', 10], ['1940s', 10], ['1950s', 10], ['1960s', 10],
    ['1970s', 10], ['1980s', 10], ['2000s', 10], ['fun', 7]
  ]);
  let changes = 0;
  for (const entry of review.entries) {
    const literal = corpus.literals.find(l => l.id === entry.corpusId);
    assert.equal(entry.original, literal.value);
    assert.ok(literal.occurrences.some(o => o.sourcePath === review.source.path && o.line === entry.sourceLine));
    let corrected = entry.original;
    for (const change of entry.corrections) {
      assert.equal(change.kind, 'grammar');
      assert.ok(corrected.includes(change.before));
      corrected = corrected.split(change.before).join(change.after);
      changes++;
    }
    assert.equal(entry.text, corrected);
    assert.equal(entry.recipe.outputs[0].template, (entry.text + review.composition.suffix).split('[Scene Description]').join('{{scene}}'));
    assert.equal(entry.recipe.outputs[0].mediaType, 'image');
    assert.deepEqual(entry.recipe.referenceSlots, []);
  }
  assert.equal(changes, 17);
  const sourceValues = corpus.literals.filter(l => l.occurrences.some(o => o.sourcePath === review.source.path));
  assert.deepEqual(new Set(review.corpusClassification.map(c => c.corpusId)), new Set(sourceValues.map(l => l.id)));
});

test('39 Goodies references agree with the isolated legacy function and the existing V6 compiler', () => {
  assert.equal(fixtures.sourceSha256, review.source.sha256);
  assert.equal(hash(review.composition.legacyFunction), review.composition.legacyFunctionSha256);
  const context = vm.createContext({ suffix: review.composition.suffix }, { codeGeneration: { strings: false, wasm: false } });
  new vm.Script(review.composition.legacyFunction).runInContext(context, { timeout: 1000 });
  const run = (entry, detail, legacy) => {
    if (!legacy) return compileRecipe(entry.recipe, { scene: detail.trim() || '[Details]' })[0].prompt;
    context.item = { prompt: entry.original }; context.detail = detail;
    return new vm.Script('finalPrompt(item, detail)').runInContext(context, { timeout: 1000 });
  };
  assert.equal(fixtures.cases.length, 39);
  for (const fixture of fixtures.cases) {
    for (const legacy of [true, false]) {
      const expected = legacy ? fixture.legacyExpected : fixture.v6Expected;
      if (fixture.operation === 'compile') {
        const entry = review.entries.find(e => e.id === fixture.entryId);
        assert.equal(run(entry, fixture.detail, legacy), expected, fixture.id);
      } else {
        const entries = review.entries.filter(e => !fixture.categoryId || fixture.categoryId === e.categoryId);
        const text = entries.map(e => `${e.categoryId} / ${e.title}\n${run(e, '', legacy)}`).join('\n\n');
        assert.equal(text, expected, fixture.id);
      }
    }
  }
});

test('Goodies literal fixes retain dollar tokens, interior whitespace and source constraints', () => {
  for (const fixture of fixtures.cases.filter(c => c.id.startsWith('dollar-'))) {
    assert.notEqual(fixture.legacyExpected, fixture.v6Expected, fixture.id);
    assert.equal(fixture.v6Expected.split(fixture.detail).length - 1, 2);
  }
  const literal = fixtures.cases.find(c => c.id === 'literal-markup-unicode');
  assert.ok(literal.v6Expected.includes('<b>L’atelier</b>  café\nseconde ligne {{scene}} [Scene Description]'));
  for (const entry of review.entries.filter(e => e.categoryId === 'fun')) {
    assert.ok(entry.text.includes('MANDATORY: No text on the image.'));
    assert.ok(entry.recipe.outputs[0].template.endsWith('unless the user explicitly asks for typography.'));
  }
  assert.throws(() => compileRecipe(review.entries[0].recipe, { scene: 'x'.repeat(4001) }), /too long/);
});
