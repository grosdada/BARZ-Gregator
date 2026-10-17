import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const fixture = JSON.parse(readFileSync(
  new URL("../migration/reviews/a8-legacy-fixtures.json", import.meta.url),
  "utf8"
));

test("A8 fixtures preserve BZ Designer categories, tabs and card order", () => {
  const designer = fixture.designer;
  assert.equal(fixture.status, "legacy-fixture-before-astra-review");
  assert.equal(fixture.source.owner, "barz-designer");
  assert.equal(designer.categoryCount, 3);
  assert.equal(designer.cardCount, 55);
  assert.deepEqual(designer.countsByCategory, { sketch: 49, body: 3, useful: 3 });
  assert.deepEqual(designer.categories[0].tabs.map(({ id, cardCount }) => ({
    id,
    cardCount
  })), [
    { id: "photo", cardCount: 9 },
    { id: "clay", cardCount: 10 },
    { id: "manga", cardCount: 10 },
    { id: "comics", cardCount: 10 },
    { id: "kids", cardCount: 10 }
  ]);
  assert.equal(designer.cards[0].title, "Puppeteer Convert");
  assert.equal(designer.cards.at(-1).title, "Pencil Line Drawing");
});

test("A8 fixtures preserve drawing-weight compilation and its four labels", () => {
  const designer = fixture.designer;
  assert.equal(designer.defaultState.drawingWeight, 55);
  assert.equal(designer.defaultState.drawingWeightLabel, "balanced style freedom");
  assert.match(designer.defaultOutputs["sketch-clay-0"], /55% \(balanced style freedom\)/);
  assert.equal(designer.configuredState.drawingWeight, 85);
  assert.equal(designer.configuredState.drawingWeightLabel, "strict source fidelity");
  assert.match(designer.configuredOutputs["sketch-clay-0"], /85% \(strict source fidelity\)/);
  assert.deepEqual(designer.weightCases, [
    { value: 20, label: "style-led reinterpretation" },
    { value: 40, label: "style-led reinterpretation" },
    { value: 45, label: "balanced style freedom" },
    { value: 65, label: "source-led style transfer" },
    { value: 85, label: "strict source fidelity" },
    { value: 95, label: "strict source fidelity" }
  ]);
});

test("A8 frozen fixture captures pre-render color state, not the visible V5 default", () => {
  const designer = fixture.designer;
  assert.match(designer.defaultOutputs["body-1"], /\[BG_COLOR\]/);
  assert.match(designer.configuredOutputs["body-1"], /Pink #DE7C68/);
  assert.doesNotMatch(designer.configuredOutputs["body-1"], /\[BG_COLOR\]/);
  assert.equal(
    // Historical preparation claim retained in the signed fixture; corrected by A8 review.
    designer.legacyQuirks.visuallyActiveColorIsNotCompiledUntilClicked,
    true
  );
});

test("A8 fixtures preserve the historical placeholder cleanup", () => {
  const designer = fixture.designer;
  assert.match(designer.cards.find(({ id }) => id === "sketch-photo-8").prompt,
    /\[Scene Description\]/);
  assert.doesNotMatch(designer.defaultOutputs["sketch-photo-8"],
    /\[Scene Description\]/);
  assert.deepEqual(designer.legacyQuirks.strippedPlaceholders, [
    "[Scene Description]",
    "[DESCRIBE YOUR NEW SUBJECT HERE]",
    "[Details]"
  ]);
});
