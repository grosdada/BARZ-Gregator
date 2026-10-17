import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const fixture = JSON.parse(readFileSync(
  new URL("../migration/reviews/a7-legacy-fixtures.json", import.meta.url),
  "utf8"
));

test("A7 fixtures preserve the BZ Sheet cards, tabs and defaults", () => {
  const sheet = fixture.sheet;
  assert.equal(fixture.status, "legacy-fixture-before-astra-review");
  assert.equal(fixture.source.owner, "barzy-sheet");
  assert.equal(sheet.cardCount, 11);
  assert.deepEqual(sheet.countsByTab, { techboard: 5, charsheet: 6 });
  assert.equal(sheet.facs.length, 49);
  assert.equal(sheet.weaponOptions.length, 19);
  assert.deepEqual(sheet.defaultState.facs, [
    "AU1", "AU4", "AU5", "AU6", "AU9", "AU12", "AU15", "AU26"
  ]);
  assert.match(sheet.defaultOutputs.objectsheet, /Blue \(#515973\) cyclorama/);
  assert.match(sheet.defaultOutputs.posesheet, /ROW 1 — LOCOMOTION/);
  assert.doesNotMatch(sheet.defaultOutputs.posesheet, /POSE_WEAPON_DIRECTIVE/);
  assert.match(sheet.defaultOutputs.complexexpressionboard, /AU1 — Inner Brow Raiser/);
});

test("A7 fixtures preserve configured backgrounds, weapon and ordered FACS", () => {
  const sheet = fixture.sheet;
  assert.equal(sheet.configuredState.weapon, "ref");
  assert.match(sheet.configuredOutputs.objectsheet, /Pink \(#DE7C68\) cyclorama/);
  assert.match(sheet.configuredOutputs["master-reference"], /Beige \(#B3A089\)/);
  assert.match(sheet.configuredOutputs.posesheet, /weapon from \[IMG_2\]/);
  assert.match(sheet.configuredOutputs.posesheet, /ARMED LOCOMOTION/);
  const expression = sheet.configuredOutputs.complexexpressionboard;
  assert.ok(expression.indexOf("AU2 — Outer Brow Raiser") < expression.indexOf("AU85 — Tongue Out"));
  assert.doesNotMatch(expression, /FACS_SELECTION_PLACEHOLDER/);
});

test("A7 fixture records legacy controls that no longer target active cards", () => {
  const dormant = fixture.sheet.dormantControls;
  assert.deepEqual(dormant.lightingTargets, ["apose", "acting"]);
  assert.deepEqual(dormant.multiReferenceTargets, [
    "4pov", "360", "freepov", "locreconstruct"
  ]);
  assert.deepEqual(dormant.accessoryTargets, ["dresschar"]);
});
