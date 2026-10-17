import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const review = JSON.parse(await readFile(
  new URL("../migration/reviews/barz-enhancer.review.json", import.meta.url), "utf8"
));
const corpus = JSON.parse(await readFile(
  new URL("../migration/atlas-v5/prompt-literals.json", import.meta.url), "utf8"
));

test("Enhancer review preserves all 20 source cards and their provenance", () => {
  assert.equal(review.cards.length, 20);
  assert.equal(new Set(review.cards.map(card => card.id)).size, 20);
  assert.deepEqual(review.cards.map(card => card.sourceLine), [
    681, 687, 693, 699, 705, 711, 717, 723, 729, 735, 741,
    822, 828, 834, 849, 855, 861, 876, 882, 888
  ]);
  for (const card of review.cards) {
    const source = corpus.literals.find(item => item.id === card.corpusId);
    assert.ok(source, card.id);
    assert.equal(card.original, source.value);
    assert.equal(createHash("sha256").update(card.original).digest("hex"), source.sha256);
    assert.ok(source.occurrences.some(item =>
      item.sourcePath === review.source.path && item.line === card.sourceLine
    ));
  }
});

test("only the three recorded grammar corrections change prompt text", () => {
  assert.deepEqual(review.cards.filter(card => card.corrections.length)
    .map(card => card.sourceLine), [729, 735, 741]);
  for (const card of review.cards) {
    let expected = card.original;
    for (const correction of card.corrections) {
      assert.equal(correction.before, "No text on image.");
      assert.equal(correction.after, "No text on the image.");
      assert.equal(expected.split(correction.before).length, 2);
      expected = expected.replace(correction.before, correction.after);
    }
    assert.equal(card.text, expected);
  }
});

test("angle inventory retains grid order, eight selectable cells and four modes", () => {
  assert.deepEqual(review.angles.map(angle => angle.id), [
    "high-left", "high-center", "high-right", "eye-left", "center",
    "eye-right", "low-left", "low-center", "low-right"
  ]);
  assert.equal(review.angles.filter(angle => angle.selectable).length, 8);
  assert.equal(review.angles.find(angle => angle.id === "center").selectable, false);
  assert.deepEqual(review.preservationModes.map(mode => mode.value), [
    "", "Same subject, same style, same lighting. ",
    "Maintain exact character design and color palette. ",
    "Preserve scene composition and atmospheric mood. "
  ]);
  assert.equal(review.composition.separator, "\n\n");
  assert.equal(review.composition.emptySubject, "[your subject/reference]");
});

test("review records repaired extraction gaps and tracks completed runtime migration", () => {
  const sourceValues = corpus.literals.filter(item =>
    item.occurrences.some(occurrence => occurrence.sourcePath === review.source.path)
  ).map(item => item.value);
  assert.equal(review.extractionFindings.missingSelectableAngles, 8);
  assert.equal(review.extractionFindings.missingNonemptyPrefixes, 3);
  assert.equal(review.angles.filter(angle =>
    angle.selectable && !sourceValues.includes(angle.prompt)
  ).length, 0);
  assert.equal(review.preservationModes.filter(mode =>
    mode.value && !sourceValues.includes(mode.value)
  ).length, 0);
  assert.equal(review.status.runtimeFixtures, "implemented-and-tested");
  assert.equal(review.status.migration, "integrated-v6");
  assert.match(review.renderPassDisclaimer, /not pixel-accurate/);
});
