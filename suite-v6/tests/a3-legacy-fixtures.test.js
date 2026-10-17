import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const fixture = JSON.parse(readFileSync(
  new URL("../migration/reviews/a3-legacy-fixtures.json", import.meta.url),
  "utf8"
));

test("A3 fixtures preserve the Acting Gen core hierarchy", () => {
  assert.equal(fixture.status, "legacy-fixture-before-astra-review");
  assert.ok(fixture.acting.groupCount >= 10);
  assert.ok(fixture.acting.entryCount >= 100);
  assert.ok(fixture.acting.groups.every(({ section, category, entries }) =>
    section && category && entries.length && entries.every(({ title, text }) => title && text)));
});

test("A3 fixtures preserve all 160 external dance prompts and their order", () => {
  assert.equal(fixture.dance.categoryCount, 8);
  assert.equal(fixture.dance.entryCount, 160);
  assert.ok(fixture.dance.categories.every(({ entries }) =>
    entries.length === 20 && entries.every(({ order }, index) => order === index + 1)));
  assert.equal(fixture.totalEntryCount, fixture.acting.entryCount + 160);
});
