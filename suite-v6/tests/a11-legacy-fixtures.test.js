import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const fixture = JSON.parse(readFileSync(
  new URL("../migration/reviews/a11-legacy-fixtures.json", import.meta.url),
  "utf8"
));

test("A11 fixtures preserve the complete director catalog and control bounds", () => {
  const framing = fixture.seedanceFraming;
  assert.equal(fixture.status, "legacy-fixture-before-astra-review");
  assert.equal(fixture.source.owner, "seedance");
  assert.equal(framing.templateCount, framing.templates.length);
  assert.deepEqual(framing.controls.modes, ["stills", "moving"]);
  assert.deepEqual(framing.controls.providers, ["kling", "seedance", "wan"]);
  assert.deepEqual(framing.controls.goActionModes, ["continuity", "abstract", "biologique"]);
  assert.equal(framing.controls.referenceSlots, 9);
  assert.deepEqual(framing.controls.duration, { min: 1, max: 15, default: 14 });
  assert.deepEqual(framing.controls.shotCount, { min: 1, max: 30, default: 7 });
});

test("A11 templates preserve ordered still and moving shot banks", () => {
  const { templates } = fixture.seedanceFraming;
  assert.equal(templates[0].id, "standard");
  assert.ok(templates.every(({ stills, moving }) => stills.shots.length === 10 && moving.shots.length === 7));
  assert.deepEqual(templates.filter(({ aliasesStandardShots }) => aliasesStandardShots).map(({ id }) => id),
    ["wes", "coppola"]);
});

test("A11 compiler fixtures keep provider dialects and exact duration splits", () => {
  for (const scenario of Object.values(fixture.seedanceFraming.scenarios)) {
    assert.equal(scenario.stills.shots.length, 10);
    assert.deepEqual(scenario.stills.shots.map(({ label }) => label),
      Array.from({ length: 10 }, (_, index) => `Still ${index + 1}`));
    assert.equal(scenario.moving.seedance.shots.length, 5);
    assert.ok(scenario.moving.seedance.shots.every(({ label }) => label === "Cut to"));
    for (const provider of ["kling", "wan"]) {
      assert.equal(scenario.moving[provider].shots.length, 5);
      assert.equal(scenario.moving[provider].shots[0].label,
        "Sequence shot 1 (00:00.00-00:02.60)");
      assert.equal(scenario.moving[provider].shots.at(-1).label,
        "Sequence shot 5 (00:10.40-00:13.00)");
    }
  }
});

test("A11 configured fixtures preserve multi-reference coexistence and placeholder replacement", () => {
  for (const scenario of Object.values(fixture.seedanceFraming.scenarios)) {
    for (const output of [scenario.stills, ...Object.values(scenario.moving)]) {
      assert.match(output.coexistence, /secondary subject/);
      assert.match(output.coexistence, /not a collage/);
      assert.match(output.shots.map(({ description }) => description).join("\n"),
        /@image1 clockwork diver/);
      for (const shot of output.shots) {
        assert.doesNotMatch(shot.description, /\[(?:SUBJECT|CONTEXT|STYLE)\]/);
      }
    }
  }
});
