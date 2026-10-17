import test from "node:test";
import assert from "node:assert/strict";

import { buildAstraReviewTemplate } from "../migration/reviews/prepare-astra-review-template.mjs";

test("Astra template pins the bundle and creates one undecided row per item", () => {
  const template = buildAstraReviewTemplate({
    schemaVersion: "1.0",
    id: "a1-realism-beauty",
    bundleDigest: "abc123",
    items: [{ id: "first" }, { id: "second" }]
  });
  assert.equal(template.bundleId, "a1-realism-beauty");
  assert.equal(template.bundleDigest, "abc123");
  assert.equal(template.status, "pending-astra-review");
  assert.equal(template.reviewerModel, "gpt-6-astra");
  assert.deepEqual(template.decisions, [
    { id: "first", action: null },
    { id: "second", action: null }
  ]);
});
