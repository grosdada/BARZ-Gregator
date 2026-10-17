import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const fixture = JSON.parse(readFileSync(
  new URL("../migration/reviews/a12-legacy-fixtures.json", import.meta.url),
  "utf8"
));
const cinema = fixture.cinemaHelper;

test("A12 fixture freezes the complete Cinema Helper catalog", () => {
  assert.equal(fixture.status, "legacy-fixture-before-astra-review");
  assert.equal(fixture.source.owner, "cinema-helper");
  assert.equal(Object.keys(cinema.catalogs).length, 20);
  assert.equal(Object.values(cinema.catalogCounts).reduce((sum, count) => sum + count, 0), 2848);
  assert.equal(cinema.catalogCounts.artists, 866);
  assert.equal(cinema.catalogCounts.artStyles, 474);
  assert.equal(cinema.catalogCounts.videoTemplates, 16);
  assert.equal(cinema.catalogCounts.genrePresets, 19);
});

test("A12 fixture preserves deck identity, order and legacy category gap", () => {
  assert.deepEqual(cinema.deckContract.identity, ["item", "category"]);
  assert.equal(cinema.deckContract.copySeparator, ", ");
  assert.equal(cinema.deckContract.restoredEntryLimit, 80);
  assert.equal(cinema.deckContract.liveEntryLimit, null);
  assert.deepEqual(cinema.localComposer.silentlyIgnoredCategories,
    ["artist", "artstyle", "genre", "templates"]);
  assert.equal(cinema.scenarios.ignoredCategories.localOutput, "");
});

test("A12 local-composer scenarios retain source ordering and grammar", () => {
  assert.equal(cinema.scenarios.coherent.localOutput,
    "35mm camera, ARRI Alexa, Dolly In Medium Shot (MS), an adult female the subject walks elegantly with an umbrella, the subject looks confident, in city street, Golden Hour");
  assert.equal(cinema.scenarios.noSubject.localOutput,
    "The subject runs, violin, nervously");
  assert.match(cinema.negativePrompts.realistic, /MULTIPLE LIMBS/);
  assert.match(cinema.negativePrompts.anim, /PHOTOREALISTIC/);
});

test("A12 fixture keeps explicit AI and bridge provenance", () => {
  assert.equal(cinema.aiVerbalizer.endpoint, "/api/ai/refine");
  assert.equal(cinema.aiVerbalizer.enabledUnlessExplicitlyFalse, true);
  assert.deepEqual(cinema.bridgeTargets,
    ["apg", "cccp-b", "barz-dna-transformer", "seedance"]);
});
