import test from "node:test";
import assert from "node:assert/strict";

import { ContractValidationError, validateRecipe, validateRegistry } from "../packages/contracts/src/index.js";
import { DEFAULT_REGISTRY, freshDefaults } from "../packages/registry/src/defaults.js";
import { orderedNavigation } from "../packages/registry/src/index.js";

function exampleRecipe() {
  return {
    schemaVersion: "1.0",
    id: "moonlit-gate-v1",
    revision: 1,
    title: "Moonlit Gate",
    fields: [
      { id: "subject", type: "text", required: true, maxLength: 2_000 },
      { id: "motion", type: "enum", values: ["Locked-off", "Slow dolly"], default: "Slow dolly" }
    ],
    outputs: [{ id: "main", mediaType: "video", template: "{{subject}}. {{motion}}.", settings: { aspectRatio: "16:9" } }],
    referenceSlots: []
  };
}

test("the V6 defaults contain five configurable workshops, integrated tools and three immutable system tabs", () => {
  const registry = freshDefaults();
  assert.equal(registry.workshops.length, 5);
  assert.deepEqual(registry.systemTabs.map(({ id }) => id), ["deck", "utilities", "build"]);
  assert.ok(registry.systemTabs.every((tab) => tab.mutable === false));
  assert.equal(registry.tools.length, 32);
  assert.equal(registry.tools[0].adapterId, "apg");
  assert.equal(registry.tools[1].recipeId, "pilot-cinematic-shot-v1");
  assert.deepEqual(registry.tools.slice(2).map(({ adapterId }) => adapterId), [
    "cinema-helper", "image-slicer", "paint-studio", "image-grabber", "image-analyzer", "angle-3d", "relighting-3d", "video-director", "motion-emulator", "video-editor", "blocking-studio", "object-scale-chart", "youtube-extractor", "barz-enhancer", "imperfection", "prompt-library", "barz-beauty", "realism-forge",
    "cinematic-shoot", "prompt-library", "facs-sheet-generator", "barzy-board", "cccp",
    "veo-suite", "barzy-sheet", "barz-designer", "knolling", "workflow-3d", "multishot", "seedance"
  ]);
  assert.equal(registry.placements.find(({ toolId }) => toolId === "apg").targetId, "prompt-forge");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "cinema-helper").targetId, "prompt-forge");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "image-slicer").targetId, "utilities");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "paint-studio").targetId, "utilities");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "image-grabber").targetId, "utilities");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "image-analyzer").targetId, "utilities");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "angle-3d").targetId, "utilities");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "relighting-3d").targetId, "utilities");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "video-director").targetId, "utilities");
  assert.equal(registry.tools.find(({ id }) => id === "video-director").title, "Video Analyser");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "motion-emulator").targetId, "utilities");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "video-editor").targetId, "utilities");
  assert.equal(registry.tools.find(({ id }) => id === "video-editor").title, "Video Director");
  assert.ok(registry.placements.find(({ toolId }) => toolId === "video-editor").order > registry.placements.find(({ toolId }) => toolId === "video-director").order);
  assert.equal(registry.placements.find(({ toolId }) => toolId === "blocking-studio").targetId, "utilities");
  assert.ok(registry.placements.find(({ toolId }) => toolId === "blocking-studio").order > registry.placements.find(({ toolId }) => toolId === "video-editor").order);
  assert.equal(registry.placements.find(({ toolId }) => toolId === "object-scale-chart").targetId, "utilities");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "youtube-extractor").targetId, "utilities");
  const objectScale = registry.placements.find(({ toolId }) => toolId === "object-scale-chart");
  const facs = registry.placements.find(({ toolId }) => toolId === "facs-sheet-generator");
  const youtube = registry.placements.find(({ toolId }) => toolId === "youtube-extractor");
  assert.ok(objectScale.order < facs.order && facs.order < youtube.order);
  assert.equal(registry.placements.find(({ toolId }) => toolId === "banana-helper").targetId, "image-looks");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "cinematic-shoot").targetId, "grid-generation");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "acting-gen").targetId, "video-builder");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "workflow-3d").targetId, "character-lab");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "facs-sheet-generator").targetId, "utilities");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "barzy-board").targetId, "grid-generation");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "cccp").targetId, "grid-generation");
  assert.equal(registry.tools.find(({ id }) => id === "veo-suite").title, "Camera Control");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "veo-suite").targetId, "video-builder");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "veo-suite").order, 0);
  assert.equal(registry.placements.find(({ toolId }) => toolId === "barzy-sheet").targetId, "character-lab");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "barz-designer").targetId, "character-lab");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "knolling").targetId, "character-lab");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "multishot").targetId, "grid-generation");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "seedance").targetId, "video-builder");
  assert.deepEqual(orderedNavigation(registry).map(({ id }) => id), [
    "deck", "prompt-forge", "image-looks", "character-lab", "grid-generation",
    "video-builder", "utilities", "build"
  ]);
  assert.doesNotThrow(() => validateRegistry(registry));
  assert.ok(Object.isFrozen(DEFAULT_REGISTRY));
  assert.ok(Object.isFrozen(DEFAULT_REGISTRY.workshops));
  assert.ok(Object.isFrozen(DEFAULT_REGISTRY.workshops[0]));
});

test("system tab identity, title, anchor, and order are contract invariants", () => {
  const registry = freshDefaults();
  registry.systemTabs[2].title = "Builder renamed";
  assert.throws(() => validateRegistry(registry), (error) => {
    assert.equal(error.code, "INVALID_CONTRACT");
    assert.match(error.message, /systemTabs\[2\]\.title/);
    return true;
  });
});

test("recipes reject unknown template variables and unknown properties", () => {
  const recipe = exampleRecipe();
  recipe.outputs[0].template = "{{missing}}";
  assert.throws(() => validateRecipe(recipe), /unknown field/);

  const second = exampleRecipe();
  second.script = "alert(1)";
  assert.throws(() => validateRecipe(second), /unknown property "script"/);
});

test("registry rejects dangling references and duplicate tool/target placements", () => {
  const registry = freshDefaults();
  registry.recipes.push(exampleRecipe());
  registry.tools.push({ id: "moonlit-gate", title: "Moonlit Gate", kind: "recipe", recipeId: "moonlit-gate-v1" });
  registry.placements.push(
    { id: "gate-a", toolId: "moonlit-gate", targetId: "prompt-forge", order: 0 },
    { id: "gate-b", toolId: "moonlit-gate", targetId: "prompt-forge", order: 1 }
  );
  assert.throws(() => validateRegistry(registry), /duplicates an existing tool\/target placement/);

  registry.placements.pop();
  registry.placements[0].targetId = "missing-workshop";
  assert.throws(() => validateRegistry(registry), /target must be a workshop, Deck, or Backstage/);
});

test("validation errors expose a stable code and path", () => {
  const registry = freshDefaults();
  registry.workshops[0].title = "";
  assert.throws(() => validateRegistry(registry), (error) => {
    assert.ok(error instanceof ContractValidationError);
    assert.equal(error.code, "INVALID_CONTRACT");
    assert.equal(error.path, "registry.workshops[0].title");
    return true;
  });
});
