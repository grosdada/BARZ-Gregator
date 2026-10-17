import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { validateAstraReview } from "../migration/reviews/validate-astra-review.mjs";

const read = (path) => readFileSync(new URL(path, import.meta.url));
const json = (path) => JSON.parse(read(path));
const bundle = json("../migration/atlas-v5/semantic-review/astra-bundles/a12-cinema-helper.json");
const review = json("../migration/reviews/a12-astra.review.json");
const supplement = json("../migration/reviews/a12-astra-supplement.review.json");

test("A12 decisions cover the signed bundle and full source", () => {
  assert.deepEqual(validateAstraReview(bundle, review).counts,
    { preserve: 869, correct: 11, "exclude-non-prompt": 152 });
  assert.deepEqual(review,
    json("../migration/atlas-v5/semantic-review/astra-reviews/a12-cinema-helper.review.json"));
  assert.equal(createHash("sha256").update(read("../migration/reviews/a12-legacy-fixtures.json"))
    .digest("hex"), supplement.fixtureDigest);
  const all = [...review.decisions, ...supplement.decisions];
  assert.equal(all.length, 3792);
  assert.equal(new Set(all.map(({ id }) => id)).size, 3792);
  assert.equal(supplement.sourceCoverage.complementaryValues, 2760);
  assert.ok(supplement.decisions.every(({ occurrences }) =>
    occurrences.every(({ sourcePath }) => sourcePath === supplement.source.path)));
});

test("A12 correction overlay is bounded and justified", () => {
  const corrections = review.decisions.filter(({ action }) => action === "correct");
  assert.equal(corrections.length, 11);
  assert.ok(corrections.every(({ correctedValue, reason }) => correctedValue && reason));
  const byOriginal = new Map(corrections.map((decision) =>
    [decision.originalValue, decision.correctedValue]));
  assert.equal(byOriginal.get("sahel archecture"), "sahel architecture");
  assert.equal(byOriginal.get("daguerrotype"), "daguerreotype");
  assert.match(byOriginal.get("3D LIDAR scanner of a forest, the scanned forest is surounded by a deep black void, wireframe particle dot scanner"),
    /surrounded/);
  assert.equal(supplement.correctionOverlay.length, 11);
});

test("A12 handoff prevents silent loss in the legacy composer", () => {
  const ignored = supplement.approvedExpectedOutputs.legacyLocal.ignoredCategories;
  assert.equal(ignored.localOutput, "");
  assert.equal(supplement.approvedExpectedOutputs.losslessFallbackForIgnoredCategories,
    "Perfectly symmetrical composition, in the style of Adrian Ghenie, oil painting, [DOUGHMOTION PROMPT EXPANDER]");
  assert.equal(supplement.architecture.runtimePortStatus, "pending-sol");
  assert.equal(supplement.architecture.suggestedWorkshop, "prompt-forge");
  assert.match(supplement.architecture.bridge, /BZ Aggregator/);
});

test("A12 excludes implementation strings while retaining prompt catalogs", () => {
  const decisions = new Map(review.decisions.map((decision) =>
    [decision.originalValue, decision.action]));
  assert.equal(decisions.get("simplePromptBuilderDeckV2"), "exclude-non-prompt");
  assert.equal(decisions.get("#camera-movements-items .item"), "exclude-non-prompt");
  assert.equal(decisions.get("the subject does a parkour vault"), "preserve");
  assert.equal(decisions.get("ARRI Alexa camera - Industry standard for cinema, used in major Hollywood productions. Known for exceptional color science and dynamic range."), "preserve");
});
