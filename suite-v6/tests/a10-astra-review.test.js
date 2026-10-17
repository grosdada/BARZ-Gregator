import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { validateAstraReview } from '../migration/reviews/validate-astra-review.mjs';

const read = file => readFileSync(new URL(file, import.meta.url));
const json = file => JSON.parse(read(file));
const bundle = json('../migration/atlas-v5/semantic-review/astra-bundles/a10-multishot.json');
const review = json('../migration/reviews/a10-astra.review.json');
const supplement = json('../migration/reviews/a10-astra-supplement.review.json');

test('A10 decisions cover the source and preserve the signed historical fixture', () => {
  assert.deepEqual(validateAstraReview(bundle, review).counts,
    { preserve: 61, correct: 15, 'exclude-non-prompt': 78 });
  assert.deepEqual(review,
    json('../migration/atlas-v5/semantic-review/astra-reviews/a10-multishot.review.json'));
  assert.equal(createHash('sha256').update(read('../migration/reviews/a10-legacy-fixtures.json'))
    .digest('hex'), supplement.fixtureDigest);
  const decisions = [...review.decisions, ...supplement.decisions];
  assert.equal(new Set(decisions.map(d => d.id)).size, 243);
  for (const decision of supplement.decisions) {
    assert.ok(decision.reason);
    assert.ok(decision.occurrences.every(o => o.sourcePath === supplement.source.path));
  }
  assert.equal(supplement.legacyComparison.outputCount, 120);
  assert.equal(supplement.legacyComparison.identical, true);
});

test('A10 panel plans have exact counts, chronological mappings and consistent grids', () => {
  const cases = supplement.approvedExpectedOutputs.cases;
  assert.equal(cases.length, 162);
  for (const entry of cases.filter(c => c.id !== 'multi-angle' && c.id !== 'multishot-0')) {
    const {cols, rows} = entry.state;
    const total = cols * rows;
    assert.equal(entry.panelPlan.length, total);
    assert.ok(entry.output.startsWith(`Generate one ${cols}x${rows} contact-sheet image:`));
    const body = entry.output.split('Panel plan:\n')[1]
      .split(/\n\n(?:Continuity &|Style:|Aesthetic:|\*\*Technical )/)[0];
    assert.deepEqual([...body.matchAll(/^(\d+)\. /gm)].map(m => Number(m[1])),
      Array.from({length: total}, (_, i) => i + 1));
    assert.doesNotMatch(entry.output, /GRID OVERRIDE|FLASH_OPTION|\*\*Row |six-panel selection/);
    const announced = [...entry.output.matchAll(/\b(\d+) (?:frames|keyframes|panels)\b/g)];
    assert.ok(announced.every(match => Number(match[1]) === total));
    for (let i = 1; i < entry.panelPlan.length; i++) {
      assert.ok(entry.panelPlan[i].sourceBeat >= entry.panelPlan[i-1].sourceBeat);
      if (entry.panelPlan[i].alternate) {
        assert.equal(entry.panelPlan[i].sourceBeat, entry.panelPlan[i-1].sourceBeat);
        assert.equal(entry.panelPlan[i-1].alternate, undefined);
      }
    }
    const last = entry.panelPlan.at(-1);
    assert.equal(last.sourceBeat, total <= 6 ? 6 : entry.id === 'multishot-5' && total === 8 ? 8 : 9);
  }
});

test('A10 flash affects only its card and literal multi-angle input stays literal', () => {
  const cases = supplement.approvedExpectedOutputs.cases;
  for (const cols of [2,3,4]) for (const rows of [2,3,4]) {
    const flashCases = cases.filter(c => c.id === 'multishot-1'
      && c.state.cols === cols && c.state.rows === rows);
    assert.equal(flashCases.length, 2);
    assert.equal(flashCases[0].output.replace(' with a hard flash', ''), flashCases[1].output);
    const literal = cases.find(c => c.id === 'multi-angle' && c.state.cols === cols
      && c.state.rows === rows && c.state.subject.startsWith('<b>'));
    assert.ok(literal.output.includes('Subject: <b>$& ${angleList} [character]</b>'));
  }
  const single = cases.filter(c => c.id === 'multishot-0');
  assert.equal(new Set(single.map(c => c.output)).size, 1);
  assert.match(single[0].output, /Fuji Velvia/);
  assert.doesNotMatch(single[0].output, /the a full body|past the camera slightly|over exposed/);
});

test('A10 oracle keeps catalog aids separate and corrects only recorded defects', () => {
  const catalog = supplement.catalog;
  assert.equal(catalog.camera.length, 24);
  assert.equal(catalog.cards.length, 14);
  assert.equal(catalog.cards.find(c => c.id === 'board-0').title, 'Image Board - Template');
  const western = catalog.cards.find(c => c.id === 'board-5');
  assert.doesNotMatch(western.prompt_3x3, /High noon/);
  assert.match(western.prompt_3x3, /Late afternoon/);
  assert.match(catalog.cards.find(c => c.id === 'board-4').prompt_3x3, /cornea/);
  assert.match(catalog.multiAngleTemplate, /viewpoint and framing/);
  assert.match(catalog.multiAngleTemplate, /source image's rendering style/);
  assert.equal(supplement.legacyComparison.staleCopyAfterIterationConfirmed, true);
  assert.equal(supplement.architecture.runtimePortStatus, 'pending-sol');
});
