import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { validateAstraReview } from '../migration/reviews/validate-astra-review.mjs';

const read = relative => readFileSync(new URL(relative, import.meta.url));
const json = relative => JSON.parse(read(relative));
const bundle = json('../migration/atlas-v5/semantic-review/astra-bundles/a8-bz-designer.json');
const review = json('../migration/reviews/a8-astra.review.json');
const supplement = json('../migration/reviews/a8-astra-supplement.review.json');
const fixtureBytes = read('../migration/reviews/a8-legacy-fixtures.json');
const fixture = JSON.parse(fixtureBytes);

test('A8 review is complete, source scoped and tied to the unchanged fixture', () => {
  assert.deepEqual(validateAstraReview(bundle, review).counts,
    { preserve: 97, correct: 11, 'exclude-non-prompt': 95 });
  assert.deepEqual(review, json(
    '../migration/atlas-v5/semantic-review/astra-reviews/a8-bz-designer.review.json'));
  assert.equal(createHash('sha256').update(fixtureBytes).digest('hex'),
    supplement.fixtureDigest);
  const decisions = [...review.decisions, ...supplement.decisions];
  assert.equal(new Set(decisions.map(d => d.id)).size, 317);
  assert.ok(decisions.every(d => d.occurrences.length && d.occurrences.every(
    occurrence => occurrence.sourcePath === fixture.source.path)));
  const approvedIds = new Set(decisions.filter(d => d.action !== 'exclude-non-prompt')
    .map(d => d.id));
  assert.ok(supplement.catalog.cards.every(c => c.literalIds.length
    && c.literalIds.every(id => approvedIds.has(id))));
  assert.equal(supplement.archivedCards.filter(c => c.status === 'dormant-card').length, 7);
  assert.equal(supplement.archivedCards.filter(c => c.status === 'superseded-variant').length, 3);
});

test('A8 approved oracle corrects initialization and covers all controls and literal input', () => {
  const { catalog, approvedExpectedOutputs: outputs } = supplement;
  assert.deepEqual(catalog.cards.map(c => c.id), fixture.designer.cards.map(c => c.id));
  assert.equal(catalog.cards.filter(c => c.usesDrawingWeight).length, 40);
  assert.deepEqual(catalog.defaultState.selectedColors['body-1'],
    { name: 'Beige', hex: '#B3A089' });
  assert.match(outputs.defaultOutputs['body-1'], /Beige #B3A089/);
  assert.doesNotMatch(outputs.defaultOutputs['body-1'], /\[BG_COLOR\]/);
  assert.match(outputs.configuredOutputs['body-1'], /Pink #DE7C68/);
  assert.equal(Object.keys(outputs.defaultOutputs).length, 55);
  assert.equal(Object.keys(outputs.configuredOutputs).length, 55);
  assert.equal(outputs.colorCases.length, 4);
  assert.equal(outputs.weightCases.length, 16);
  assert.ok(outputs.weightCases.every(c => Object.keys(c.outputs).length === 40));
  assert.ok(outputs.sceneCase.output.includes(outputs.sceneCase.scene));
  assert.ok(supplement.manualSourceValues.some(v => v.value === '#515973' && v.line === 89));
});
