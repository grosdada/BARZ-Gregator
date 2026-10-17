import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const fixture = JSON.parse(readFileSync(
  new URL("../migration/reviews/a9-legacy-fixtures.json", import.meta.url),
  "utf8"
));

test("A9 fixtures preserve Knolling tabs, cards and navigation order", () => {
  const knolling = fixture.knolling;
  assert.equal(fixture.status, "legacy-fixture-before-astra-review");
  assert.equal(fixture.source.owner, "knolling");
  assert.equal(knolling.tabCount, 4);
  assert.equal(knolling.cardCount, 17);
  assert.deepEqual(knolling.countsByTab, {
    generate: 7, tattoo: 2, actor: 2, decor: 6
  });
  assert.deepEqual(knolling.tabs.map(({ id }) => id), [
    "generate", "tattoo", "actor", "decor"
  ]);
  assert.equal(knolling.cards[0].title, "Knolling Outfit");
  assert.equal(knolling.cards.at(-1).title, "Generate 4 POV");
});

test("A9 fixtures preserve all active option families and tattoo zones", () => {
  const { controls } = fixture.knolling;
  assert.deepEqual(controls.lighting, ["original", "diffuse"]);
  assert.deepEqual(controls.multiReference, ["single", "multi"]);
  assert.deepEqual(controls.accessory, ["clothes", "full"]);
  assert.deepEqual(controls.subject, ["puppet", "human"]);
  assert.deepEqual(controls.tattooPlaceIt, ["off", "on"]);
  assert.equal(controls.tattooZones.length, 19);
  assert.equal(controls.tattooZones[0], "face and head");
  assert.equal(controls.tattooZones.at(-1), "right foot");
});

test("A9 default outputs preserve legacy compilation", () => {
  const { defaultOutputs } = fixture.knolling;
  assert.match(defaultOutputs.dresschar, /PUPPET\/FIGURINE MODE/);
  assert.doesNotMatch(defaultOutputs.dresschar, /ACCESSORY_PLACEHOLDER/);
  assert.match(defaultOutputs.apose, /Original Scene-Matched/);
  assert.doesNotMatch(defaultOutputs.panoCompact, /MULTI_IMAGE_PLACEHOLDER/);
  assert.match(defaultOutputs.tattooextract, /Placement map:\*\* Disabled/);
  assert.match(defaultOutputs.tattoocharacter, /No fixed zone selected/);
});

test("A9 configured outputs preserve every dynamic branch and zone order", () => {
  const { configuredOutputs } = fixture.knolling;
  assert.doesNotMatch(configuredOutputs.dresschar, /PUPPET\/FIGURINE MODE/);
  assert.match(configuredOutputs.dresschar, /POCKET ITEMS & ACCESSORIES/);
  assert.match(configuredOutputs.apose, /Diffuse Studio/);
  assert.match(configuredOutputs.panoCompact, /MULTI-IMAGE REFERENCE MODE/);
  assert.match(configuredOutputs.tattooextract, /PLACE IT MODE/);
  const tattoo = configuredOutputs.tattoocharacter;
  assert.ok(tattoo.indexOf("right forearm") < tattoo.indexOf("left shoulder"));
  assert.ok(tattoo.indexOf("left shoulder") < tattoo.indexOf("neck and throat"));
});
