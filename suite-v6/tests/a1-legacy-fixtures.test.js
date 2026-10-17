import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const fixture = JSON.parse(readFileSync(
  new URL("../migration/reviews/a1-legacy-fixtures.json", import.meta.url),
  "utf8"
));

test("A1 Beauty fixtures preserve every legacy category and gender transformation", () => {
  assert.equal(fixture.status, "legacy-fixture-before-astra-review");
  assert.equal(fixture.beauty.categoryCount, 7);
  assert.equal(fixture.beauty.entryCount, 42);
  const portraitCategories = fixture.beauty.categories.filter(({ id }) => id.startsWith("portrait-"));
  assert.equal(portraitCategories.length, 2);
  assert.ok(portraitCategories.every(({ entries }) => entries.every(({ text }) => !/selfie/i.test(text))));
});

test("A1 Realism fixtures cover every card and resolve compiler placeholders", () => {
  assert.equal(fixture.realism.tabCount, 9);
  assert.equal(fixture.realism.cardCount, fixture.realism.defaultOutputs.length);
  assert.ok(fixture.realism.cardCount > 20);
  assert.ok(fixture.realism.defaultOutputs.every(({ output }) =>
    output.startsWith("CAMERA: ") && !/\$(?:flash|grain|imperf)/.test(output)));
  assert.match(fixture.realism.edgeFixture.output, /PRINT AGING:/);
  assert.match(fixture.realism.edgeFixture.output, /SUBJECT: a violinist/);
});
