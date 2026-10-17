import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const fixture = JSON.parse(readFileSync(
  new URL("../migration/reviews/a5-legacy-fixtures.json", import.meta.url),
  "utf8"
));

test("A5 fixtures preserve every VEO Precision family, card and intensity", () => {
  const veo = fixture.veoPrecision;
  assert.equal(fixture.status, "legacy-fixture-before-astra-review");
  assert.equal(fixture.source.owner, "veo-suite");
  assert.equal(veo.sectionCount, 7);
  assert.equal(veo.cardCount, 22);
  assert.equal(veo.promptCount, 110);
  assert.equal(veo.uniqueKeyCount, veo.cardCount);
  assert.ok(veo.cards.every(({ labels, prompts }) => labels.length === 5 && prompts.length === 5));
  assert.ok(Object.values(veo.defaultState.values).every((value) => value === 2));
  assert.ok(Object.values(veo.defaultState.collapsed).every(Boolean));
  assert.equal(veo.defaultOutputs.length, veo.cardCount);
});

test("A5 fixtures preserve composite ordering and the incoming Blocking Studio layer", () => {
  const veo = fixture.veoPrecision;
  const expected = [
    veo.configuredState.incoming,
    veo.cards.find(({ key }) => key === "dolly").prompts[4],
    veo.cards.find(({ key }) => key === "macro").prompts[0],
    veo.cards.find(({ key }) => key === "super8").prompts[3],
    veo.cards.find(({ key }) => key === "focus").prompts[2]
  ].join(", ");
  assert.equal(veo.configuredComposite, expected);
  assert.match(veo.configuredComposite, /^slow blocking move received from Blocking Studio,/);
  assert.match(veo.configuredComposite, /aggressive dolly rush/);
  assert.match(veo.configuredComposite, /damaged Super 8 film print/);
  assert.match(veo.configuredComposite, /rack focus/);
});
