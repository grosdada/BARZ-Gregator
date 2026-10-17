import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const fixture = JSON.parse(readFileSync(
  new URL("../migration/reviews/a4-legacy-fixtures.json", import.meta.url),
  "utf8"
));

test("A4 fixtures preserve the FACS Sheet catalog, compilers and board payload", () => {
  assert.equal(fixture.status, "legacy-fixture-before-astra-review");
  assert.equal(fixture.facsSheet.unitCount, 49);
  assert.equal(Object.keys(fixture.facsSheet.visibleByCode).length, 49);
  assert.equal(fixture.facsSheet.payload.type, "barzy:facs-payload");
  assert.equal(fixture.facsSheet.payload.target, "motion");
  assert.equal(fixture.facsSheet.payload.items.length, fixture.facsSheet.selectedCodes.length);
  assert.match(fixture.facsSheet.defaultActing, /^FACS acting layer: AU1 /);
  assert.match(fixture.facsSheet.defaultFullBoardPrompt, /flat 7x7 contact sheet, 49 equal portrait tiles/);
  assert.match(fixture.facsSheet.fullBoardPrompt, /Subject lock: \[IMG_9\], angular heroine/);
  assert.match(fixture.facsSheet.configuredPrompts[0].prompt, /angular heroine with a silver bob/);
});

test("A4 fixtures preserve BZ Board Story and all three Motion compilers", () => {
  assert.equal(fixture.board.facsUnitCount, 47);
  assert.match(fixture.board.story, /Create a 16:9 storyboard sheet with 12 cinematic panels/);
  assert.match(fixture.board.story, /Facial acting \/ FACS cues: AU1 \(Inner Brow Raiser\)/);
  assert.deepEqual(fixture.board.motionByModel.map(({ model }) => model), ["seedance", "kling", "veo"]);
  assert.match(fixture.board.motionByModel[0].prompt, /^REFERENCES:/);
  assert.match(fixture.board.motionByModel[0].prompt, /Seedance 2\.0 Prompt:/);
  assert.match(fixture.board.motionByModel[1].prompt, /Kling Prompt:/);
  assert.match(fixture.board.motionByModel[2].prompt, /Veo 3\.1 Prompt:/);
  assert.match(fixture.board.motionOwnFacs, /AU62 \(Eyes Turn Right\)/);
  assert.doesNotMatch(fixture.board.motionOwnFacs, /AU1 \(Inner Brow Raiser\)/);
});

test("A4 exposes the legacy FACS interoperability mismatch for Astra review", () => {
  assert.deepEqual(fixture.compatibility.sheetOnlyCodes, ["AU56B", "AU57B", "AU58B"]);
  assert.deepEqual(fixture.compatibility.boardOnlyCodes, ["AU51"]);
  assert.deepEqual(fixture.compatibility.conflictingNames, [{
    code: "AU58",
    sheetName: "Head Turn Left",
    boardName: "Head Back"
  }]);
});
