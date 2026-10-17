import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const fixture = JSON.parse(readFileSync(
  new URL("../migration/reviews/a10-legacy-fixtures.json", import.meta.url),
  "utf8"
));

test("A10 fixtures preserve the MD Multishot inventory", () => {
  const multishot = fixture.multishot;
  assert.equal(fixture.status, "legacy-fixture-before-astra-review");
  assert.equal(fixture.source.owner, "multishot");
  assert.deepEqual(multishot.tabs, ["camera", "multishot", "actionboard"]);
  assert.deepEqual(multishot.camera.countsByType, { Shots: 12, Movements: 12 });
  assert.equal(multishot.sequences.count, 6);
  assert.equal(multishot.actionBoards.count, 8);
  assert.equal(multishot.camera.entries[0].name, "Close-Up");
  assert.equal(multishot.camera.entries.at(-1).name, "Crash Zoom");
});

test("A10 fixtures preserve sequence-specific controls", () => {
  const entries = fixture.multishot.sequences.entries;
  assert.equal(entries[0].title, "Initial Model Prompt");
  assert.equal(entries[0].noGridAdapt, true);
  assert.equal(entries[1].title, "Multishot 01 - High-Fashion Beauty Editorial");
  assert.equal(entries[1].hasFlashToggle, true);
  assert.equal(entries.at(-1).title, "Multishot 05 - 360° Product & Construction Detail");
  assert.equal(fixture.multishot.actionBoards.entries[0].title, " Image Board - Template");
  assert.equal(
    fixture.multishot.actionBoards.entries.at(-1).title,
    "Board-07 - Horror Creature Encounter"
  );
});

test("A10 grid scenarios preserve source selection and exact overrides", () => {
  const scenarios = fixture.multishot.scenarios;
  assert.equal(scenarios["2x2"].sourceGridKey, "2x3");
  assert.equal(scenarios["2x3"].sourceGridKey, "2x3");
  assert.equal(scenarios["3x3"].sourceGridKey, "3x3");
  assert.equal(scenarios["4x4"].sourceGridKey, "3x3");
  assert.match(
    scenarios["2x2"].actionBoards[0].prompt,
    /Use exactly 4 frames in a 2x2 grid/
  );
  assert.match(
    scenarios["4x4"].actionBoards[0].prompt,
    /Use exactly 16 frames in a 4x4 grid/
  );
  assert.doesNotMatch(
    scenarios["3x3"].multishotFlashOn[0].prompt,
    /PROMPT ATLAS GRID OVERRIDE/
  );
});

test("A10 fixtures preserve multi-angle and hard-flash compilation", () => {
  const scenarios = fixture.multishot.scenarios;
  const multiAngle = scenarios["4x4"].multiAngleConfigured;
  assert.match(multiAngle, /16 panels/);
  assert.match(multiAngle, /16\. POV \/ detail insert/);
  assert.match(multiAngle, /a clockwork diver in a copper pressure suit/);

  const flashOn = scenarios["3x3"].multishotFlashOn[1].prompt;
  const flashOff = scenarios["3x3"].multishotFlashOff[1].prompt;
  assert.match(flashOn, /shot on Fuji Velvia film with a hard flash/);
  assert.doesNotMatch(flashOff, /with a hard flash/);
  assert.doesNotMatch(flashOn, /FLASH_OPTION/);
  assert.doesNotMatch(flashOff, /FLASH_OPTION/);
});

test("A10 fixtures preserve the LLM iteration contract without executing it", () => {
  const contract = fixture.multishot.iterationContract;
  assert.equal(contract.endpoint, "/api/ai/refine");
  assert.equal(contract.outputType, "image");
  assert.ok(contract.preserves.includes("character morphology consistency"));
  assert.ok(contract.preserves.includes("no-text constraints"));
});
