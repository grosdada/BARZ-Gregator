import test from "node:test";
import assert from "node:assert/strict";

import { computeReviewBundleDigest } from "../migration/prepare-semantic-review.mjs";
import { validateAstraReview } from "../migration/reviews/validate-astra-review.mjs";

function sourceBundle() {
  const items = [
    { id: "one", owner: "barz-beauty", reviewKind: "prompt-review", value: "Render natural skin." },
    { id: "two", owner: "barz-beauty", reviewKind: "manual-triage", triageKind: "short-atom-candidate", value: "copy" },
    { id: "three", owner: "realism-forge", reviewKind: "fragment-review", value: "Preserve the camera angle." }
  ];
  return {
    schemaVersion: "1.0",
    id: "a1-realism-beauty",
    bundleDigest: computeReviewBundleDigest(items),
    items
  };
}

function validReview(bundle) {
  return {
    schemaVersion: "1.0",
    bundleId: bundle.id,
    bundleDigest: bundle.bundleDigest,
    status: "reviewed",
    reviewerModel: "gpt-6-astra",
    decisions: [
      { id: "one", action: "correct", correctedValue: "Render lifelike natural skin.", reason: "Grammar and specificity." },
      { id: "two", action: "exclude-non-prompt", reason: "Interface command." },
      { id: "three", action: "preserve" }
    ]
  };
}

test("Astra review contract requires explicit, complete and traceable decisions", () => {
  const bundle = sourceBundle();
  assert.deepEqual(validateAstraReview(bundle, validReview(bundle)), {
    bundleId: bundle.id,
    bundleDigest: bundle.bundleDigest,
    itemCount: 3,
    counts: { preserve: 1, correct: 1, "exclude-non-prompt": 1 }
  });
});

test("Astra review contract rejects stale, partial and silent corrections", () => {
  const bundle = sourceBundle();
  const stale = validReview(bundle);
  stale.bundleDigest = "0".repeat(64);
  assert.throws(() => validateAstraReview(bundle, stale), { code: "INVALID_ASTRA_REVIEW", path: "bundleDigest" });

  const partial = validReview(bundle);
  partial.decisions.pop();
  assert.throws(() => validateAstraReview(bundle, partial), { code: "INVALID_ASTRA_REVIEW", path: "decisions" });

  const silent = validReview(bundle);
  delete silent.decisions[0].reason;
  assert.throws(() => validateAstraReview(bundle, silent), {
    code: "INVALID_ASTRA_REVIEW", path: "decisions[0].reason"
  });
});
