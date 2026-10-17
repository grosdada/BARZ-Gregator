import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const fixture = JSON.parse(readFileSync(
  new URL("../migration/reviews/a2-legacy-fixtures.json", import.meta.url),
  "utf8"
));

test("A2 fixtures preserve every Cinematic Shoot prompt and family", () => {
  assert.equal(fixture.status, "legacy-fixture-before-astra-review");
  assert.equal(fixture.cinematicShoot.familyCount, 7);
  assert.equal(fixture.cinematicShoot.promptCount, 41);
  assert.equal(fixture.cinematicShoot.defaultOutputs.length, fixture.cinematicShoot.promptCount);
  assert.ok(fixture.cinematicShoot.prompts.every(({ id, family, prompt }) => id && family && prompt));
});

test("A2 fixtures preserve grid, subject, mode and outfit transformations", () => {
  const defaults = fixture.cinematicShoot.defaultOutputs;
  assert.ok(defaults.every(({ output }) => output.includes("Use exactly 9 frames in a 3x3 grid")));
  assert.ok(defaults.every(({ output }) => output.includes("PUPPET MODE:")));
  const configured = fixture.cinematicShoot.configuredFixture.output;
  assert.match(configured, /Use exactly 8 frames in a 4x2 grid/);
  assert.match(configured, /a weathered marionette detective/);
  assert.match(configured, /rain-soaked station platform/);
  assert.match(configured, /OUTFIT ADAPTATION & TAILORING/);
  assert.doesNotMatch(configured, /PUPPET MODE:/);
});
