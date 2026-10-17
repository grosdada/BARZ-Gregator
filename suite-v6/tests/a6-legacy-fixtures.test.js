import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const fixture = JSON.parse(readFileSync(
  new URL("../migration/reviews/a6-legacy-fixtures.json", import.meta.url),
  "utf8"
));

test("A6 fixtures preserve the complete CCP workflow and defaults", () => {
  const ccp = fixture.ccp;
  assert.equal(fixture.status, "legacy-fixture-before-astra-review");
  assert.equal(fixture.source.owner, "cccp");
  assert.equal(ccp.stageCount, 4);
  assert.equal(ccp.templateCount, 5);
  assert.equal(ccp.variationCount, 4);
  assert.deepEqual(ccp.stages.map(({ id }) => id), ["a1", "a2", "b", "c"]);
  assert.deepEqual(ccp.defaultState.modes, { a2: "puppet", b: "puppet", c: "puppet" });
  assert.match(ccp.defaultOutputs.a1, /Use exactly 9 panels in a 3x3 grid/);
  assert.match(ccp.defaultOutputs.a2, /MODE: Puppet \/ figurine character/);
  assert.match(ccp.defaultOutputs.b, /USER SCENE INPUT:\n$/);
  assert.match(ccp.defaultOutputs.c, /panel code: A1/);
});

test("A6 fixtures preserve grid adaptation, human modes, iteration and panel extraction", () => {
  const ccp = fixture.ccp;
  assert.deepEqual(ccp.configuredState.grid, { cols: 4, rows: 2, total: 8, spec: "4x2" });
  assert.deepEqual(ccp.configuredState.modes, { a2: "human", b: "human", c: "human" });
  assert.equal(ccp.configuredState.iterationTake, 2);
  assert.match(ccp.configuredOutputs.a1, /Use exactly 8 panels in a 4x2 grid/);
  assert.match(ccp.configuredOutputs.a2, /MODE: Human character/);
  assert.match(ccp.configuredOutputs.b, /ITERATION - Take 3:/);
  assert.match(ccp.configuredOutputs.b, /alternate pacing:/);
  assert.match(ccp.configuredOutputs.b, /A courier crosses a flooded archive/);
  assert.match(ccp.configuredOutputs.c, /panel\s+code: B2/);
  assert.deepEqual(ccp.normalizationCases, [
    { cols: 2, rows: 4, total: 8, spec: "2x4" },
    { cols: 4, rows: 2, total: 8, spec: "4x2" },
    { cols: 3, rows: 3, total: 9, spec: "3x3" }
  ]);
});
