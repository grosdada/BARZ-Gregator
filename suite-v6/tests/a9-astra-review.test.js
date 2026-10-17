import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { validateAstraReview } from '../migration/reviews/validate-astra-review.mjs';

const read = p => readFileSync(new URL(p, import.meta.url));
const json = p => JSON.parse(read(p));
const bundle = json('../migration/atlas-v5/semantic-review/astra-bundles/a9-knolling-board.json');
const review = json('../migration/reviews/a9-astra.review.json');
const supplement = json('../migration/reviews/a9-astra-supplement.review.json');
const fixtureBytes = read('../migration/reviews/a9-legacy-fixtures.json');
const fixture = JSON.parse(fixtureBytes);

test('A9 review covers every scoped literal and preserves the signed historical fixture', () => {
  assert.deepEqual(validateAstraReview(bundle, review).counts,
    { preserve: 15, correct: 9, 'exclude-non-prompt': 29 });
  assert.deepEqual(review, json(
    '../migration/atlas-v5/semantic-review/astra-reviews/a9-knolling-board.review.json'));
  assert.equal(createHash('sha256').update(fixtureBytes).digest('hex'), supplement.fixtureDigest);
  const decisions = [...review.decisions, ...supplement.decisions];
  assert.equal(new Set(decisions.map(d => d.id)).size, 279);
  assert.ok(decisions.every(d => d.occurrences.length && d.occurrences.every(
    o => o.sourcePath === fixture.source.path)));
  const approved = new Set(decisions.filter(d => d.action !== 'exclude-non-prompt').map(d => d.id));
  assert.ok(supplement.catalog.cards.every(c => c.literalIds.length
    && c.literalIds.every(id => approved.has(id))));
  assert.deepEqual(supplement.manualSourceValues.map(v => v.value),
    fixture.knolling.controls.tattooZones);
});

test('A9 approved outputs preserve card order and contain only resolved compiler slots', () => {
  const { catalog, approvedExpectedOutputs: outputs } = supplement;
  assert.deepEqual(catalog.cards.map(c => c.id), fixture.knolling.cards.map(c => c.id));
  assert.equal(Object.keys(outputs.defaultOutputs).length, 17);
  assert.equal(Object.keys(outputs.configuredOutputs).length, 17);
  assert.equal(outputs.cases.length, 64);
  const texts = [...Object.values(outputs.defaultOutputs), ...Object.values(outputs.configuredOutputs),
    ...outputs.cases.map(c => c.output)];
  for (const text of texts) assert.doesNotMatch(text, /\[[A-Z_]*PLACEHOLDER\]|\$\{/);
  for (const id of ['outfit', 'object', 'scene', 'var1', 'var2', 'var3']) {
    assert.equal(outputs.defaultOutputs[id], fixture.knolling.defaultOutputs[id]);
    assert.equal(outputs.configuredOutputs[id], outputs.defaultOutputs[id]);
  }
});

test('A9 tattoo modes reserve the body reference and keep each selected zone in order', () => {
  const cases = supplement.approvedExpectedOutputs.cases;
  const withBody = cases.find(c => c.id === 'tattoocharacter'
    && c.state.tattooBodyMode === 'provided-body' && c.state.tattooZones.length === 3);
  const withoutBody = cases.find(c => c.id === 'tattoocharacter'
    && c.state.tattooBodyMode === 'tattoos-only' && c.state.tattooZones.length === 3);
  assert.match(withBody.output, /\[IMG_1\] is the character\/body source, never a tattoo design/);
  assert.match(withBody.output, /\[IMG_2\] tattoo reference goes on: right forearm/);
  assert.match(withBody.output, /\[IMG_3\] tattoo reference goes on: left shoulder/);
  assert.match(withBody.output, /\[IMG_4\] tattoo reference goes on: neck and throat/);
  assert.match(withoutBody.output, /No body source is supplied/);
  assert.match(withoutBody.output, /\[IMG_1\] tattoo reference goes on: right forearm/);
  assert.match(withoutBody.output, /\[IMG_3\] tattoo reference goes on: neck and throat/);
});

test('A9 panorama and multi-reference corrections eliminate conflicting instructions', () => {
  const outputs = supplement.approvedExpectedOutputs;
  for (const id of ['panoCompact', 'panoFreePov']) {
    assert.match(outputs.defaultOutputs[id], /HFOV 45° per output panel/);
    assert.match(outputs.defaultOutputs[id], /A2 right ↔ A3 left/);
    assert.match(outputs.configuredOutputs[id], /Use supplied references for all evidenced regions/);
    assert.doesNotMatch(outputs.configuredOutputs[id], /This is NOT creative extrapolation/);
    assert.doesNotMatch(outputs.defaultOutputs[id], /NONE of A1's buildings/);
  }
  assert.match(outputs.configuredOutputs.locreconstruct,
    /unless the selected output explicitly requires replacement lighting/);
  assert.match(outputs.defaultOutputs.dresschar, /underwear → shirt → jacket/);
  assert.match(outputs.defaultOutputs['360'], /a 2:1 layout alone does not provide it/);
});
