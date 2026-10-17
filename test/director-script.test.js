import test from "node:test";
import assert from "node:assert/strict";
import {
  compileDirectorScript,
  normalizeDirectorStoryboard,
  validateDirectorStoryboard
} from "../public/director-script.js";

const reference = (id) => ({ id: `resource:${id}`, url: `/api/resources/${id}/content` });

test("normalizes a Director storyboard and fixes its opening offset", () => {
  const result = normalizeDirectorStoryboard([
    { reference: reference("one"), offset: 12, prompt: " opening " },
    { reference: reference("two"), offset: 5, prompt: "arrival" }
  ]);
  assert.equal(result[0].offset, 0);
  assert.equal(result[1].offset, 5);
});

test("rejects keyframes closer than three seconds", () => {
  assert.throws(() => validateDirectorStoryboard([
    { reference: reference("one"), offset: 0 },
    { reference: reference("two"), offset: 2 }
  ]), /au moins 3 secondes/);
});

test("compiles the first image separately and timed targets into native beats", () => {
  const result = compileDirectorScript([
    { reference: reference("one"), offset: 0, prompt: "Begin" },
    { reference: reference("two"), offset: 5, prompt: "Continue" },
    { reference: reference("three"), offset: 10, prompt: "End" }
  ], ["https://fal.media/one.png", "https://fal.media/two.png", "https://fal.media/three.png"]);
  assert.equal(result.imageUrl, "https://fal.media/one.png");
  assert.deepEqual(result.script, [
    { offset: 0, prompt: "Begin" },
    { offset: 5, prompt: "Continue", end_image_url: "https://fal.media/two.png" },
    { offset: 10, prompt: "End", end_image_url: "https://fal.media/three.png" }
  ]);
});
