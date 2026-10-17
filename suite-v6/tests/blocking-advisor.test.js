import assert from "node:assert/strict";
import test from "node:test";

import { extractBlockingStudioPlan } from "../apps/atlas/blocking-engine-v5.js";

test("Blocking Studio plan is extracted even when the closing fence is missing", () => {
  const response = [
    "Voici une orbite simple autour du personnage.",
    "```barz-blocking-scene",
    '{"title":"Orbite","duration":8,"characters":[{"name":"Subject"}],"cameras":[{"name":"Cam A","path":[{"t":0,"position":[0,1.6,4]},{"t":1,"position":[4,1.6,0]}]}]}'
  ].join("\n");

  const result = extractBlockingStudioPlan(response);

  assert.equal(result.answer, "Voici une orbite simple autour du personnage.");
  assert.equal(result.plan.title, "Orbite");
  assert.equal(result.plan.cameras[0].path.length, 2);
});

test("Incomplete Blocking Studio JSON is hidden behind a useful retry message", () => {
  const result = extractBlockingStudioPlan([
    "Je prépare la scène.",
    "```barz-blocking-scene",
    '{"title":"Orbite","cameras":['
  ].join("\n"));

  assert.equal(result.plan, null);
  assert.match(result.answer, /Relance la demande/);
  assert.doesNotMatch(result.answer, /barz-blocking-scene|\{"title"/);
});
