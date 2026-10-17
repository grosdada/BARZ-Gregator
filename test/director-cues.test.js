import test from "node:test";
import assert from "node:assert/strict";

import { normalizeDirectorCues } from "../public/director-cues.js";

test("normalizes prepared Director cues while preserving their order", () => {
  assert.deepEqual(normalizeDirectorCues(["  first  ", "", null, "second"]), [
    "first", "second"
  ]);
});

test("limits a Director sequence to twenty non-empty cues", () => {
  const cues = Array.from({ length: 24 }, (_, index) => `cue ${index + 1}`);
  assert.equal(normalizeDirectorCues(cues).length, 20);
  assert.equal(normalizeDirectorCues(cues).at(-1), "cue 20");
});
