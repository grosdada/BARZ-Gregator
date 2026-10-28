import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  applyImperfectionPreset,
  BOARD_CATALOG,
  BEAUTY_CATALOG,
  compileBoard,
  compileBeauty,
  compileCameraSuite,
  compileCcp,
  compileCinematicShoot,
  compileDesigner,
  compileEnhancer,
  compileFacsSheet,
  compileGoodies,
  compileImperfection,
  compileKnolling,
  compileMultishot,
  compileSeedance,
  compileRealism,
  compileSheet,
  copyAllEnhancer,
  CYCLO_PALETTE,
  defaultToolConfiguration,
  ENHANCER_CATALOG,
  FACS_CATALOG,
  GOODIES_CATALOG,
  IMAGE_SLICER_CATALOG,
  IMAGE_GRABBER_CATALOG,
  IMAGE_ANALYZER_CATALOG,
  VIDEO_DIRECTOR_CATALOG,
  WORKFLOW_3D_CATALOG,
  PAINT_STUDIO_CATALOG,
  IMPERFECTION_CATALOG,
  KNOLLING_CATALOG,
  MULTISHOT_CATALOG,
  SEEDANCE_CATALOG,
  CINEMATIC_SHOOT_CATALOG,
  DESIGNER_CATALOG,
  CAMERA_SUITE_CATALOG,
  CINEMA_HELPER_CATALOG,
  CCP_CATALOG,
  REALISM_CATALOG,
  SHEET_CATALOG,
  compileCinemaHelper,
  validateToolConfiguration
} from "../packages/tool-adapters/src/index.js";

const fixtures = JSON.parse(await readFile(new URL("../migration/reviews/imperfection.legacy-fixtures.json", import.meta.url), "utf8"));
const goodiesFixtures = JSON.parse(await readFile(new URL("../migration/reviews/banana-goodies.fixtures.json", import.meta.url), "utf8"));
const a1Fixtures = JSON.parse(await readFile(new URL("../migration/reviews/a1-legacy-fixtures.json", import.meta.url), "utf8"));
const a2Fixtures = JSON.parse(await readFile(new URL("../migration/reviews/a2-legacy-fixtures.json", import.meta.url), "utf8"));
const a5Supplement = JSON.parse(await readFile(new URL("../migration/reviews/a5-astra-supplement.review.json", import.meta.url), "utf8"));
const a6Supplement = JSON.parse(await readFile(new URL("../migration/reviews/a6-astra-supplement.review.json", import.meta.url), "utf8"));
const a7Supplement = JSON.parse(await readFile(new URL("../migration/reviews/a7-astra-supplement.review.json", import.meta.url), "utf8"));
const a8Supplement = JSON.parse(await readFile(new URL("../migration/reviews/a8-astra-supplement.review.json", import.meta.url), "utf8"));
const a9Supplement = JSON.parse(await readFile(new URL("../migration/reviews/a9-astra-supplement.review.json", import.meta.url), "utf8"));
const a10Supplement = JSON.parse(await readFile(new URL("../migration/reviews/a10-astra-supplement.review.json", import.meta.url), "utf8"));
const a11Supplement = JSON.parse(await readFile(new URL("../migration/reviews/a11-astra-supplement.review.json", import.meta.url), "utf8"));

test("A12 exposes the complete reviewed Cinema Helper catalog", () => {
  assert.equal(CINEMA_HELPER_CATALOG.sourceEntryCount, 2848);
  assert.equal(CINEMA_HELPER_CATALOG.selectableEntryCount, 2832);
  assert.equal(CINEMA_HELPER_CATALOG.items.length, 2832);
  assert.equal(CINEMA_HELPER_CATALOG.deckLimit, 80);
  assert.equal(CINEMA_HELPER_CATALOG.items.find(({ id }) => id === "cinema-artStyles-0093").label, "trompe-l'oeil art");
});

test("A12 composes legacy categories and falls back losslessly for every other category", () => {
  const configuration = defaultToolConfiguration("cinema-helper");
  const byLabel = new Map(CINEMA_HELPER_CATALOG.items.map((item) => [item.label, item]));
  configuration.deck = [
    byLabel.get("35mm"), byLabel.get("ARRI Alexa"), byLabel.get("Dolly In"),
    byLabel.get("Medium Shot (MS)"), byLabel.get("adult female"), byLabel.get("walk"),
    byLabel.get("elegantly"), byLabel.get("umbrella"), byLabel.get("look confident"),
    byLabel.get("city street"), byLabel.get("Golden Hour")
  ].map(({ id: itemId, label: item, category, copyText }) => ({ itemId, item, category, copyText }));
  let result = compileCinemaHelper(configuration);
  assert.equal(result.prompt, "35mm camera, ARRI Alexa, Dolly In Medium Shot (MS), an adult female the subject walks elegantly with an umbrella, the subject looks confident, in city street, Golden Hour");
  assert.equal(result.fallbackUsed, false);

  configuration.deck.push((({ id: itemId, label: item, category, copyText }) => ({ itemId, item, category, copyText }))(byLabel.get("a childrens drawing of")));
  result = compileCinemaHelper(configuration);
  assert.equal(result.fallbackUsed, true);
  assert.equal(result.prompt, configuration.deck.map(({ copyText }) => copyText).join(", "));
  configuration.customPrompt = "Personal $& <literal> final";
  assert.equal(compileCinemaHelper(configuration).prompt, configuration.customPrompt);
});

test("A12 rejects duplicate or oversized decks", () => {
  const configuration = defaultToolConfiguration("cinema-helper");
  const item = CINEMA_HELPER_CATALOG.items[0];
  const entry = { itemId: item.id, item: item.label, category: item.category, copyText: item.copyText };
  configuration.deck = [entry, { ...entry }];
  assert.throws(() => validateToolConfiguration("cinema-helper", configuration), /unique item IDs/);
  configuration.deck = Array.from({ length: 81 }, (_unused, index) => {
    const current = CINEMA_HELPER_CATALOG.items[index];
    return { itemId: current.id, item: current.label, category: current.category, copyText: current.copyText };
  });
  assert.throws(() => validateToolConfiguration("cinema-helper", configuration), /at most 80/);
});

test("A13 Image Slicer keeps bounded setup-local export settings", () => {
  const configuration = defaultToolConfiguration("image-slicer");
  assert.deepEqual(configuration, {
    columns: 3, rows: 3, format: "png", prefix: "slice", quality: 0.92
  });
  assert.deepEqual(IMAGE_SLICER_CATALOG.formats, ["png", "jpeg", "webp"]);
  configuration.columns = 100;
  configuration.rows = 1;
  configuration.format = "webp";
  assert.doesNotThrow(() => validateToolConfiguration("image-slicer", configuration));
  configuration.columns = 101;
  assert.throws(() => validateToolConfiguration("image-slicer", configuration), /from 1 to 100/);
});

test("A14 Paint Studio keeps bounded setup-local creative settings", () => {
  const configuration = defaultToolConfiguration("paint-studio");
  assert.deepEqual(configuration, {
    canvasPreset: "16:9", background: "transparent", backgroundColor: "#ffffff", color: "#ff5b3a", strokeColor: "#ff5b3a", fillColor: "#F2ECCA", opacity: 1,
    strokeWidth: 3, fontFamily: "Arial", exportFormat: "png", exportQuality: 0.92
  });
  assert.deepEqual(PAINT_STUDIO_CATALOG.canvasPresets, ["16:9", "9:16", "1:1", "3:2", "2:3"]);
  configuration.canvasPreset = "1:1";
  configuration.background = "white";
  configuration.strokeWidth = 100;
  assert.doesNotThrow(() => validateToolConfiguration("paint-studio", configuration));
  configuration.color = "orange";
  assert.throws(() => validateToolConfiguration("paint-studio", configuration), /hex color/);
});

test("A15 Image Grabber keeps bounded setup-local capture settings", () => {
  const configuration = defaultToolConfiguration("image-grabber");
  assert.deepEqual(configuration, {
    fps: 30, exportFormat: "png", exportQuality: 0.92
  });
  assert.deepEqual(IMAGE_GRABBER_CATALOG.formats, ["png", "jpeg", "webp"]);
  configuration.fps = 120;
  configuration.exportFormat = "webp";
  configuration.exportQuality = 0.75;
  assert.doesNotThrow(() => validateToolConfiguration("image-grabber", configuration));
  configuration.fps = 241;
  assert.throws(() => validateToolConfiguration("image-grabber", configuration), /from 1 to 240/);
});

test("A16 Image Analyser preserves every legacy destination and setup-local model choice", () => {
  const configuration = defaultToolConfiguration("image-analyzer");
  assert.deepEqual(configuration, { model: "gpt-4.1-mini", sendTarget: "apg" });
  assert.deepEqual(IMAGE_ANALYZER_CATALOG.targets, ["apg", "cccp", "seedance"]);
  configuration.model = "gemini-2.5-flash";
  configuration.sendTarget = "seedance";
  assert.doesNotThrow(() => validateToolConfiguration("image-analyzer", configuration));
  configuration.sendTarget = "nowhere";
  assert.throws(() => validateToolConfiguration("image-analyzer", configuration), /unsupported destination/);
});

test("A17 Video Director keeps bounded setup-local edit-bay settings", () => {
  const configuration = defaultToolConfiguration("video-director");
  assert.deepEqual(configuration, { model: "gpt-4.1-mini", frameCount: 6, loop: false });
  assert.equal(VIDEO_DIRECTOR_CATALOG.maximumWindowSeconds, 15);
  assert.deepEqual(VIDEO_DIRECTOR_CATALOG.outputs, ["seedance", "kling", "minimax-h3", "flux-3", "wan-3", "negative", "transcript", "breakdown"]);
  configuration.model = "claude-sonnet-4-6";
  configuration.frameCount = 8;
  configuration.loop = true;
  assert.doesNotThrow(() => validateToolConfiguration("video-director", configuration));
  configuration.frameCount = 9;
  assert.throws(() => validateToolConfiguration("video-director", configuration), /from 3 to 8/);
});

test("Motion Emulator has an independent setup-local configuration", () => {
  const configuration = defaultToolConfiguration("motion-emulator");
  assert.deepEqual(configuration, {});
  assert.doesNotThrow(() => validateToolConfiguration("motion-emulator", configuration));
});

test("A18 2D/3D workflow keeps setup-local controls and every selectable output", () => {
  const configuration = defaultToolConfiguration("workflow-3d");
  assert.deepEqual(configuration, { selectedOutput: "image", controls: {}, activeActions: [] });
  assert.deepEqual(WORKFLOW_3D_CATALOG.outputs, [
    "image", "video", "transfer2d-0", "transfer2d-1", "transfer2d-2",
    "transfer2d-3", "transfer2d-4", "transfer2d-5"
  ]);
  configuration.selectedOutput = "transfer2d-4";
  configuration.controls = { "id:scene-transfer2d-4": "A literal $& <scene>", "id:physics": true };
  configuration.activeActions = ["openWorkspace('transfer-2d', this)"];
  assert.doesNotThrow(() => validateToolConfiguration("workflow-3d", configuration));
  configuration.selectedOutput = "unknown";
  assert.throws(() => validateToolConfiguration("workflow-3d", configuration), /unsupported output/);
});

test("Imperfection V6 reproduces all 23 reviewed legacy prompts", () => {
  assert.equal(fixtures.cases.length, 23);
  for (const fixture of fixtures.cases) {
    assert.equal(compileImperfection(fixture.state), fixture.prompt, fixture.id);
  }
});

test("built-in Imperfection presets retain sections and constraints", () => {
  const current = defaultToolConfiguration("imperfection").state;
  current.sections.camera = false;
  current.antiGlitch.noMorphing = false;
  const next = applyImperfectionPreset(current, IMPERFECTION_CATALOG.presets.ugc, { builtin: true });
  assert.equal(next.sections.camera, false);
  assert.equal(next.antiGlitch.noMorphing, false);
  assert.equal(next.camera.handDrift, 3);
  assert.equal(next.human.handGesture, true);
});

test("partial custom Imperfection presets merge only supplied properties", () => {
  const current = defaultToolConfiguration("imperfection").state;
  const next = applyImperfectionPreset(current, { camera: { orbit: true }, antiGlitch: { eyeContact: true } });
  assert.equal(next.camera.orbit, true);
  assert.equal(next.camera.handDrift, current.camera.handDrift);
  assert.equal(next.antiGlitch.eyeContact, true);
});

test("Enhancer ships the 20 reviewed cards with validated grammar corrections", () => {
  assert.equal(ENHANCER_CATALOG.cards.length, 20);
  const corrected = ENHANCER_CATALOG.cards.filter(({ corrections }) => corrections.length);
  assert.equal(corrected.length, 3);
  corrected.forEach(({ prompt }) => {
    assert.match(prompt, /No text on the image\./);
    assert.doesNotMatch(prompt, /No text on image\./);
  });
});

test("Enhancer angle output preserves literal subject text and canonical grid order", () => {
  const configuration = defaultToolConfiguration("barz-enhancer");
  configuration.mode = "angles";
  configuration.subject = "  <b>L'atelier</b>   double  space  ";
  configuration.preservationMode = "Same subject, same style, same lighting. ";
  configuration.selectedAngleIds = ["low-right", "high-left"];
  const outputs = compileEnhancer(configuration);
  assert.deepEqual(outputs.map(({ id }) => id), ["high-left", "low-right"]);
  assert.match(outputs[0].prompt, /<b>L'atelier<\/b>   double  space/);
  assert.equal(copyAllEnhancer(outputs).split("\n\n").length, 2);
});

test("Enhancer spatial studios compile exact BARZ references, camera coordinates and light rigs", () => {
  const angle = defaultToolConfiguration("barz-enhancer");
  angle.mode = "angles";
  angle.selectedAngleIds = [];
  angle.angleStudio = { azimuth: -90, elevation: -22, distance: 3.4, focalLength: 85 };
  let outputs = compileEnhancer(angle);
  assert.equal(outputs[0].id, "angle-camera");
  assert.match(outputs[0].prompt, /Use @image1 as the sole visual reference/);
  assert.match(outputs[0].prompt, /left profile/);
  assert.match(outputs[0].prompt, /azimuth -90\.0°/);
  assert.match(outputs[0].prompt, /elevation -22\.0°/);
  assert.match(outputs[0].prompt, /85 mm lens/);

  const relighting = defaultToolConfiguration("barz-enhancer");
  relighting.mode = "relighting";
  relighting.relightingLights = [
    { id: "light-key", type: "spot", color: "#55aaff", intensity: 6, azimuth: 42, elevation: 30, distance: 5, size: 1, spread: 28 },
    { id: "light-rim", type: "sun", color: "#ffcc88", intensity: 2, azimuth: -140, elevation: 12, distance: 7, size: 1, spread: 36 }
  ];
  outputs = compileEnhancer(relighting);
  assert.equal(outputs[0].id, "relighting-rig");
  assert.match(outputs[0].prompt, /LIGHT 1 — SPOT/);
  assert.match(outputs[0].prompt, /color #55AAFF/);
  assert.match(outputs[0].prompt, /cone angle 28°/);
  assert.match(outputs[0].prompt, /LIGHT 2 — SUN \/ DIRECTIONAL/);
  assert.doesNotMatch(outputs[0].prompt, /\[IMG_1\]/);
});

test("tool configuration validation rejects unknown fields and invalid enums", () => {
  const valid = defaultToolConfiguration("imperfection");
  validateToolConfiguration("imperfection", valid);
  assert.throws(() => validateToolConfiguration("imperfection", { ...valid, surprise: true }), /unknown property/);
  const invalid = structuredClone(valid);
  invalid.state.camera.device = "unknown";
  assert.throws(() => validateToolConfiguration("imperfection", invalid), /unsupported value/);
});

test("Goodies compiles all reviewed cases and canonical bulk scopes", () => {
  assert.equal(GOODIES_CATALOG.entries.length, 77);
  assert.equal(GOODIES_CATALOG.categories.length, 8);
  for (const fixture of goodiesFixtures.cases) {
    const configuration = defaultToolConfiguration("banana-helper");
    if (fixture.entryId) {
      configuration.selectedEntryId = fixture.entryId;
      configuration.activeCategory = GOODIES_CATALOG.entries.find(({ id }) => id === fixture.entryId).categoryId;
      if (fixture.detail) configuration.detailsByPrompt[fixture.entryId] = fixture.detail;
    }
    if (fixture.categoryId) configuration.activeCategory = fixture.categoryId;
    const result = compileGoodies(configuration);
    const actual = fixture.operation === "compile" ? result.outputs[0].prompt
      : fixture.operation === "copy-category-without-details" ? result.copyCategory
        : result.copyAll;
    assert.equal(actual, fixture.v6Expected, fixture.id);
  }
});

test("Goodies validates persistent per-entry details and emits image output", () => {
  const configuration = defaultToolConfiguration("banana-helper");
  configuration.detailsByPrompt[configuration.selectedEntryId] = "$& <b>L’atelier</b>  double  espace";
  validateToolConfiguration("banana-helper", configuration);
  const result = compileGoodies(configuration);
  assert.equal(result.outputs[0].mediaType, "image");
  assert.equal(result.outputs[0].prompt.split("$& <b>L’atelier</b>  double  espace").length - 1, 2);
  assert.throws(() => validateToolConfiguration("banana-helper", {
    ...configuration,
    detailsByPrompt: { intrus: "texte" }
  }), /unknown prompt/);
  assert.throws(() => validateToolConfiguration("banana-helper", {
    ...configuration,
    searchQuery: "x".repeat(501)
  }), /at most 500/);
});

test("Beauty ships all 42 prompts and applies the five Astra decisions to every duplicate use", () => {
  assert.equal(BEAUTY_CATALOG.categories.length, 7);
  assert.equal(BEAUTY_CATALOG.entries.length, 42);
  const legacy = a1Fixtures.beauty.categories.flatMap(({ id, entries }) =>
    entries.map((entry, index) => [`beauty-${id}-${String(index + 1).padStart(2, "0")}`, entry.text]));
  const changed = legacy.filter(([id, text]) => BEAUTY_CATALOG.entries.find((entry) => entry.id === id).prompt !== text);
  assert.equal(changed.length, 9);
  assert.equal(changed.filter(([id]) =>
    BEAUTY_CATALOG.entries.find((entry) => entry.id === id).prompt.startsWith("Ultra-realistic editorial 3x3 photo grid")).length, 8);
  assert.match(BEAUTY_CATALOG.entries.find(({ title }) => title === "Skin Realism").prompt, /skin stretches, compresses, and shows/);
  const configuration = defaultToolConfiguration("barz-beauty");
  assert.equal(compileBeauty(configuration).outputs[0].prompt, BEAUTY_CATALOG.entries[0].prompt);
});

test("Realism Forge reproduces all 29 default legacy outputs and the configured edge case", () => {
  assert.equal(REALISM_CATALOG.tabs.length, 9);
  assert.equal(REALISM_CATALOG.tabs.flatMap(({ cards }) => cards).length, 29);
  const configuration = defaultToolConfiguration("realism-forge");
  for (const expected of a1Fixtures.realism.defaultOutputs) {
    const tab = REALISM_CATALOG.tabs.find(({ id }) => id === expected.tabId);
    configuration.activeTabId = tab.id;
    configuration.selectedCardId = tab.cards[expected.cardIndex].id;
    assert.equal(compileRealism(configuration).outputs[0].prompt, expected.output, configuration.selectedCardId);
  }
  const edge = a1Fixtures.realism.edgeFixture;
  configuration.activeTabId = edge.tabId;
  configuration.selectedCardId = REALISM_CATALOG.tabs.find(({ id }) => id === edge.tabId).cards[edge.cardIndex].id;
  Object.assign(configuration, {
    description: edge.state.desc,
    celebrity: edge.state.celeb,
    outfit: edge.state.outfit,
    customOutfit: edge.state.outfitC,
    pose: edge.state.pose,
    customPose: edge.state.poseC,
    location: edge.state.location,
    customLocation: edge.state.locationC,
    mood: edge.state.mood,
    slidersByCard: { [configuration.selectedCardId]: edge.sliders }
  });
  assert.equal(compileRealism(configuration).outputs[0].prompt, edge.output);
});

test("Realism Forge preserves literal user text and validates card-specific sliders", () => {
  const configuration = defaultToolConfiguration("realism-forge");
  configuration.description = "$& <hero>  double  space";
  const prompt = compileRealism(configuration).outputs[0].prompt;
  assert.match(prompt, /SUBJECT: \$& <hero>  double  space/);
  const invalid = structuredClone(configuration);
  invalid.slidersByCard[invalid.selectedCardId] = { flash: 10, grain: 30, dof: 30, wear: 0, imperf: 101 };
  assert.throws(() => validateToolConfiguration("realism-forge", invalid), /between 0 and 100/);
});

test("Cinematic Shoot exposes all 41 reviewed recipes, families and Astra corrections", () => {
  assert.equal(CINEMATIC_SHOOT_CATALOG.families.length, 7);
  assert.equal(CINEMATIC_SHOOT_CATALOG.prompts.length, 41);
  assert.deepEqual(CINEMATIC_SHOOT_CATALOG.prompts.map(({ id }) => id), a2Fixtures.cinematicShoot.prompts.map(({ id }) => id));
  assert.equal(CINEMATIC_SHOOT_CATALOG.prompts.find(({ id }) => id === "cinematic-33").title, "3x3 JSON: Occult Ritual");
  assert.equal(CINEMATIC_SHOOT_CATALOG.prompts.find(({ id }) => id === "cinematic-40").title, "The Abyss");
  const allText = CINEMATIC_SHOOT_CATALOG.prompts.map(({ prompt }) => prompt).join("\n");
  assert.match(allText, /Other cooks in background/);
  assert.match(allText, /Sudden spear trap/);
  assert.match(allText, /Preserve the reference character's distinctive angles precisely/);
  assert.doesNotMatch(allText, /Other cuistots|trap trap|farmhouse angles/);
  assert.match(CINEMATIC_SHOOT_CATALOG.puppetModeInstruction, /real location/);
  assert.match(CINEMATIC_SHOOT_CATALOG.puppetModeInstruction, /intentional non-realistic/);
});

test("Cinematic Shoot compiles every recipe with a strict, configurable grid contract", () => {
  const configuration = defaultToolConfiguration("cinematic-shoot");
  for (const prompt of CINEMATIC_SHOOT_CATALOG.prompts) {
    configuration.selectedPromptId = prompt.id;
    const result = compileCinematicShoot(configuration);
    assert.equal(result.outputs[0].mediaType, "image", prompt.id);
    assert.match(result.outputs[0].prompt, /Output exactly 9 frames arranged in 3 columns and 3 rows/, prompt.id);
    assert.match(result.outputs[0].prompt, /Fill every panel and order the final sequence row by row, left to right/, prompt.id);
    assert.doesNotMatch(result.outputs[0].prompt, /reallocation|intentionalnon-realistic|Other cuistots|trap trap|farmhouse angles/, prompt.id);
  }
});

test("Cinematic Shoot preserves literal scene text, separates context and supports non-square grids", () => {
  const configuration = defaultToolConfiguration("cinematic-shoot");
  configuration.grid = { cols: 4, rows: 2 };
  configuration.characterMode = "human";
  configuration.detailsByPrompt[configuration.selectedPromptId] = "Context: $& Subject \\\"quoted\\\"\nsecond line";
  const result = compileCinematicShoot(configuration);
  const prompt = result.outputs[0].prompt;
  assert.deepEqual(result.grid, { cols: 4, rows: 2, total: 8 });
  assert.match(prompt, /SUBJECT: @image1/);
  assert.match(prompt, /CONTEXT: \$& Subject \\\"quoted\\\"/);
  assert.match(prompt, /Output exactly 8 frames arranged in 4 columns and 2 rows/);
  assert.doesNotMatch(prompt, /PUPPET MODE:/);
  assert.doesNotMatch(prompt, /\$`|\$'/);
});

test("Cinematic Shoot never overwrites a custom prompt and rejects fractional grids", () => {
  const configuration = defaultToolConfiguration("cinematic-shoot");
  const custom = "$& Subject <b>custom</b>\nkeep me exactly";
  configuration.customPrompts[configuration.selectedPromptId] = custom;
  configuration.grid = { cols: 4, rows: 4 };
  const result = compileCinematicShoot(configuration);
  assert.equal(result.outputs[0].prompt, custom);
  assert.equal(result.custom, true);
  const invalid = structuredClone(configuration);
  invalid.grid.cols = 2.5;
  assert.throws(() => validateToolConfiguration("cinematic-shoot", invalid), /integer between 2 and 4/);
});

test("A4 exposes 49 stable FACS identities with corrected head directions and a complete untruncated board", () => {
  assert.equal(FACS_CATALOG.entries.length, 49);
  assert.equal(new Set(FACS_CATALOG.entries.map(({ id }) => id)).size, 49);
  assert.deepEqual(FACS_CATALOG.entries.map(({ sheetPosition }) => sheetPosition), Array.from({ length: 49 }, (_, index) => index + 1));
  assert.equal(FACS_CATALOG.entries.find(({ id }) => id === "facs-au51").legacySheetCode, "AU58");
  assert.equal(FACS_CATALOG.entries.find(({ id }) => id === "facs-au58").legacySheetCode, "AU58B");
  assert.match(FACS_CATALOG.entries.find(({ id }) => id === "facs-au56-deep").visible, /subject's right shoulder/);
  const configuration = defaultToolConfiguration("facs-sheet-generator");
  configuration.outputMode = "full-board";
  configuration.anchor = `[IMG_1] ${"identity ".repeat(90)}`;
  const output = compileFacsSheet(configuration).outputs[0].prompt;
  assert.match(output, /Use these 49 tiles in this exact left-to-right, top-to-bottom order/);
  assert.match(output, /AU85 Tongue Out/);
  assert.match(output, /professional facial acting \/ expression reference chart/);
  assert.ok(output.length > 4950);
});

test("A4 FACS compiles ordered acting and portrait outputs while preserving literal user text", () => {
  const configuration = defaultToolConfiguration("facs-sheet-generator");
  configuration.selectedIds = ["facs-au62", "facs-au1"];
  let payload = compileFacsSheet(configuration);
  assert.match(payload.outputs[0].prompt, /^FACS acting layer: AU62 Eyes Turn Right/);
  assert.ok(payload.outputs[0].prompt.indexOf("AU62") < payload.outputs[0].prompt.indexOf("AU1 "));
  configuration.outputMode = "portraits";
  configuration.anchor = "$& <hero>  double  space";
  payload = compileFacsSheet(configuration);
  assert.deepEqual(payload.outputs.map(({ id }) => id), ["facs-au62", "facs-au1"]);
  assert.match(payload.outputs[0].prompt, /^\$& <hero>  double  space\./);
});

test("A4 Board corrects Story grammar and makes Motion FACS inheritance explicit", () => {
  const configuration = defaultToolConfiguration("barzy-board");
  configuration.story.subject = "a lunar archivist";
  configuration.story.action = "crosses a flooded archive";
  configuration.story.facsCueIds = ["facs-au1", "facs-au56-deep"];
  let payload = compileBoard(configuration);
  assert.match(payload.outputs[0].prompt, /12 cinematic panels\. Action \/ choreography: crosses/);
  assert.doesNotMatch(payload.outputs[0].prompt, /focused on crosses/);
  assert.match(payload.outputs[1].prompt, /AU56 \(deep\) \(Head Tilt Right Deep\)/);
  configuration.motion.facsMode = "custom";
  configuration.motion.facsCueIds = [];
  payload = compileBoard(configuration);
  assert.doesNotMatch(payload.outputs[1].prompt, /Facial performance \/ FACS cues/);
  configuration.motion.facsCueIds = ["facs-au62", "facs-au62"];
  assert.throws(() => validateToolConfiguration("barzy-board", configuration), /unique FACS IDs/);
  assert.equal(BOARD_CATALOG.cameras.length, 5);
  assert.equal(BOARD_CATALOG.drawingStyles.length, 5);
});

test("A4 custom FACS sheets keep stable media metadata and reject reordered crops", () => {
  const configuration = defaultToolConfiguration("facs-sheet-generator");
  configuration.customCards.push({
    id: "facs-card-12345678",
    name: "Mon visage",
    boardDataUrl: "data:image/png;base64,AAAA",
    cropVersion: FACS_CATALOG.crop.version,
    createdAt: "2026-09-12T12:00:00.000Z",
    sourceName: "visage.png",
    mapping: FACS_CATALOG.entries.map(({ id }) => id)
  });
  configuration.activeReferenceId = "facs-card-12345678";
  assert.doesNotThrow(() => validateToolConfiguration("facs-sheet-generator", configuration));
  configuration.customCards[0].mapping.reverse();
  assert.throws(() => validateToolConfiguration("facs-sheet-generator", configuration), /49-position mapping/);
});

test("A4 compiles every FACS portrait in canonical sheet order without losing long literal fields", () => {
  const configuration = defaultToolConfiguration("facs-sheet-generator");
  configuration.outputMode = "portraits";
  configuration.selectedIds = FACS_CATALOG.entries.map(({ id }) => id);
  configuration.anchor = `$& <identity data-test="literal">${" visage-cohérent".repeat(700)}</identity>`;
  const payload = compileFacsSheet(configuration);
  assert.equal(payload.outputs.length, 49);
  assert.deepEqual(payload.outputs.map(({ id }) => id), configuration.selectedIds);
  assert.match(payload.outputs[0].prompt, /^\$& <identity data-test="literal">/);
  assert.match(payload.outputs[0].prompt, /<\/identity>\./);
  assert.match(payload.outputs.at(-1).prompt, /AU85|tongue extends fully past the lower lip/i);
});

test("A4 keeps all reviewed head-direction corrections on their stable identities", () => {
  const expected = {
    "facs-au51": "subject's left",
    "facs-au52": "subject's right",
    "facs-au55": "subject's left shoulder",
    "facs-au56": "subject's right shoulder",
    "facs-au56-deep": "subject's right shoulder"
  };
  for (const [id, phrase] of Object.entries(expected)) {
    assert.match(FACS_CATALOG.entries.find((entry) => entry.id === id).visible, new RegExp(phrase.replace("'", "\\'")));
  }
});

test("A4 Board covers all Motion dialects, clean Story panels and literal override fallbacks", () => {
  const configuration = defaultToolConfiguration("barzy-board");
  configuration.story.subject = "$& <astronaut>";
  configuration.story.action = "walks through the archive";
  configuration.story.env = "cyan fog";
  configuration.story.annotations = false;
  let payload = compileBoard(configuration);
  assert.match(payload.outputs[0].prompt, /No annotations, no arrows, no overlays/);
  assert.match(payload.outputs[0].prompt, /Subject: \$& <astronaut>/);
  assert.doesNotMatch(payload.outputs[0].prompt, /red arrows = body movement/);

  for (const [model, marker] of [["seedance", "Seedance 2.0 Prompt"], ["kling", "Kling Prompt"], ["veo", "Veo 3.1 Prompt"]]) {
    configuration.motion.model = model;
    payload = compileBoard(configuration);
    assert.match(payload.outputs[1].prompt, new RegExp(marker.replace(".", "\\.")));
    assert.match(payload.outputs[1].prompt, /Character: @image1 - \$& <astronaut>/);
    assert.match(payload.outputs[1].prompt, /cyan fog/);
  }

  configuration.motion.action = "custom $& <motion>\nsecond line";
  payload = compileBoard(configuration);
  assert.match(payload.outputs[1].prompt, /Action: custom \$& <motion>\nsecond line/);
  configuration.customOutputs.motion = "Manual motion prompt $& <kept>";
  assert.equal(compileBoard(configuration).outputs[1].prompt, "Manual motion prompt $& <kept>");
});

test("A5 exposes all 110 Astra-reviewed Camera Suite variants and only the recorded corrections", () => {
  assert.equal(CAMERA_SUITE_CATALOG.sections.length, 7);
  assert.equal(CAMERA_SUITE_CATALOG.cards.length, 22);
  assert.equal(CAMERA_SUITE_CATALOG.cards.flatMap(({ variants }) => variants).length, 110);
  assert.deepEqual(CAMERA_SUITE_CATALOG.cards.map(({ key }) => key), a5Supplement.catalog.map(({ key }) => key));
  for (const expectedCard of a5Supplement.catalog) {
    const card = CAMERA_SUITE_CATALOG.cards.find(({ key }) => key === expectedCard.key);
    assert.equal(card.title, expectedCard.title);
    assert.deepEqual(card.variants.map(({ prompt }) => prompt), expectedCard.variants.map(({ prompt }) => prompt));
  }
  assert.match(CAMERA_SUITE_CATALOG.cards.find(({ key }) => key === "fisheye").variants[3].prompt, /180° field of view/);
  assert.match(CAMERA_SUITE_CATALOG.cards.find(({ key }) => key === "zoom").variants[3].prompt, /extremely rapid/);
  assert.equal(CAMERA_SUITE_CATALOG.cards.find(({ key }) => key === "film16mm").variants[2].label, "Newsreel");
  assert.match(CAMERA_SUITE_CATALOG.cards.find(({ key }) => key === "tiltshift").variants[1].prompt, /extremely shallow/);
});

test("A5 compiles incoming text first and active camera cards in canonical order", () => {
  const configuration = defaultToolConfiguration("veo-suite");
  configuration.incoming = { text: "$& <scene>  double  space", source: "Idea Studio" };
  configuration.activeCardIds = ["focus", "dolly"];
  configuration.variantByCard.dolly = 4;
  configuration.variantByCard.focus = 1;
  const dolly = CAMERA_SUITE_CATALOG.cards.find(({ key }) => key === "dolly").variants[4];
  const focus = CAMERA_SUITE_CATALOG.cards.find(({ key }) => key === "focus").variants[1];
  configuration.customPrompts[focus.id] = "custom focus $& <literal>";
  const payload = compileCameraSuite(configuration);
  assert.deepEqual(payload.layers.map(({ id }) => id), ["incoming", dolly.id, focus.id]);
  assert.equal(payload.outputs[0].mediaType, "video");
  assert.equal(payload.outputs[0].prompt, `$& <scene>  double  space\n${dolly.prompt}\ncustom focus $& <literal>`);
  assert.equal(payload.layers[2].custom, true);
});

test("A5 compiles every card and variant independently and validates persistent state", () => {
  const configuration = defaultToolConfiguration("veo-suite");
  for (const card of CAMERA_SUITE_CATALOG.cards) {
    configuration.activeCardIds = [card.key];
    for (const variant of card.variants) {
      configuration.variantByCard[card.key] = variant.index;
      const payload = compileCameraSuite(configuration);
      assert.equal(payload.outputs[0].prompt, variant.prompt, variant.id);
      assert.equal(payload.layers[0].id, variant.id);
    }
  }
  const duplicate = defaultToolConfiguration("veo-suite");
  duplicate.activeCardIds = ["dolly", "dolly"];
  assert.throws(() => validateToolConfiguration("veo-suite", duplicate), /unique camera card IDs/);
  const badVariant = defaultToolConfiguration("veo-suite");
  badVariant.variantByCard.dolly = 5;
  assert.throws(() => validateToolConfiguration("veo-suite", badVariant), /integer between 0 and 4/);
  const unknownCustom = defaultToolConfiguration("veo-suite");
  unknownCustom.customPrompts["veo-suite-missing-0"] = "no";
  assert.throws(() => validateToolConfiguration("veo-suite", unknownCustom), /unknown camera variant/);
});

test("A6 compiles the four CCP defaults exactly as approved by Astra", () => {
  const configuration = defaultToolConfiguration("cccp");
  const payload = compileCcp(configuration);
  assert.equal(CCP_CATALOG.subtitle, "Consistent Character Process");
  assert.deepEqual(payload.outputs.map(({ id }) => id), ["a1", "a2", "b", "c"]);
  for (const output of payload.outputs) {
    assert.equal(output.prompt, a6Supplement.approvedExpectedOutputs.defaultOutputs[output.id], output.id);
    assert.equal(output.mediaType, "image");
  }
  assert.doesNotMatch(payload.outputs.find(({ id }) => id === "c").prompt, /OUTPUT GRID|GRID OVERRIDE/);
});

test("A6 adapts every grid oracle while keeping A2 independent and C single-image", async () => {
  const { createHash } = await import("node:crypto");
  const fixture = JSON.parse(await readFile(new URL("../migration/reviews/a6-legacy-fixtures.json", import.meta.url), "utf8"));
  const configured = fixture.ccp.configuredState;
  for (const testCase of a6Supplement.approvedExpectedOutputs.gridCases) {
    const configuration = defaultToolConfiguration("cccp");
    configuration.grid = testCase.grid;
    configuration.modes = structuredClone(configured.modes);
    configuration.scene = configured.scene;
    configuration.iterationTake = configured.iterationTake;
    configuration.panelCode = testCase.panelCodes.at(-1);
    for (const output of compileCcp(configuration).outputs) {
      const digest = createHash("sha256").update(output.prompt).digest("hex");
      assert.equal(digest, testCase.outputDigests[output.id], `${testCase.grid.cols}x${testCase.grid.rows} ${output.id}`);
    }
  }
});

test("A6 preserves literal scenes, independent modes, custom finals and targeted C validation", () => {
  const configuration = defaultToolConfiguration("cccp");
  configuration.grid = { cols: 4, rows: 2 };
  configuration.modes = { a2: "human", b: "puppet", c: "human" };
  configuration.scene = "$& <scene>  double  space\nsecond line";
  configuration.iterationTake = 5;
  let payload = compileCcp(configuration, "b");
  assert.match(payload.outputs[0].prompt, /MODE: Puppet \/ figurine/);
  assert.match(payload.outputs[0].prompt, /\$& <scene>  double  space\nsecond line/);
  assert.match(payload.outputs[0].prompt, /ITERATION - Take 6:/);
  assert.match(payload.outputs[0].prompt, /fresh coverage:/);
  assert.match(compileCcp(configuration, "a2").outputs[0].prompt, /MODE: Human character/);
  configuration.customOutputs.b = "My exact $& <custom>\ntext";
  assert.equal(compileCcp(configuration, "b").outputs[0].prompt, configuration.customOutputs.b);
  configuration.panelCode = "C3";
  assert.doesNotThrow(() => compileCcp(configuration, "a1"));
  assert.throws(() => compileCcp(configuration, "c"), /must be one of A1, A2, A3, A4, B1, B2, B3, B4/);
  configuration.grid.cols = 2.5;
  assert.throws(() => validateToolConfiguration("cccp", configuration), /integer between 2 and 4/);
});

test("A7 compiles all 11 BZ Sheet defaults exactly as approved by Astra", () => {
  const configuration = defaultToolConfiguration("barzy-sheet");
  const payload = compileSheet(configuration);
  assert.equal(SHEET_CATALOG.cards.length, 11);
  assert.deepEqual(SHEET_CATALOG.tabs.map(({ id }) => id), ["techboard", "charsheet"]);
  for (const output of payload.outputs) {
    assert.equal(output.prompt, a7Supplement.approvedExpectedOutputs.defaultOutputs[output.id], output.id);
    assert.equal(output.mediaType, "image");
  }
  assert.deepEqual(payload.outputs.find(({ id }) => id === "tech-car").settings, { aspectRatio: "3:4" });
  assert.deepEqual(payload.outputs.find(({ id }) => id === "master-reference").settings, { aspectRatio: "4:3" });
  assert.deepEqual(payload.outputs.find(({ id }) => id === "objectsheet").settings, {});
});

test("A7 uses reviewed pose modes, repeated backgrounds and canonical ordered FACS", () => {
  const configuration = defaultToolConfiguration("barzy-sheet");
  configuration.weapon = "neutral";
  let output = compileSheet(configuration, "posesheet").outputs[0].prompt;
  assert.doesNotMatch(output, /WEAPON HANDLING|ARMED LOCOMOTION|Reloading|aimed or presented/);
  assert.match(output, /EMPTY-HAND LOCOMOTION/);

  configuration.weapon = "Flame trower";
  output = compileSheet(configuration, "posesheet").outputs[0].prompt;
  assert.match(output, /Flamethrower/);
  assert.doesNotMatch(output, /Flame trower/);

  configuration.backgrounds.objectsheet = "pink";
  output = compileSheet(configuration, "objectsheet").outputs[0].prompt;
  assert.equal((output.match(/Pink \(#DE7C68\)/g) ?? []).length, 2);

  configuration.facsIds = ["facs-au51", "facs-au58", "facs-au56", "facs-au56-deep", "facs-au57", "facs-au57-deep", "facs-au53", "facs-au54"];
  output = compileSheet(configuration, "complexexpressionboard").outputs[0].prompt;
  assert.match(output, /1\. \*\*AU51 — Head Turn Left/);
  assert.match(output, /2\. \*\*AU58 — Head Back/);
  assert.match(output, /4\. \*\*AU56 \(deep\)/);
});

test("the shared cyclorama palette keeps the four legacy colors and compiles all twelve choices", () => {
  assert.equal(CYCLO_PALETTE.length, 12);
  assert.equal(new Set(CYCLO_PALETTE.map(({ id }) => id)).size, 12);
  assert.equal(new Set(CYCLO_PALETTE.map(({ hex }) => hex)).size, 12);
  assert.deepEqual(
    CYCLO_PALETTE.filter(({ id }) => ["beige", "blue", "pink", "white"].includes(id))
      .map(({ id, name, hex }) => ({ id, name, hex })),
    [
      { id: "white", name: "White", hex: "#F2ECCA" },
      { id: "beige", name: "Beige", hex: "#B3A089" },
      { id: "blue", name: "Blue", hex: "#515973" },
      { id: "pink", name: "Pink", hex: "#DE7C68" }
    ]
  );
  assert.equal(SHEET_CATALOG.backgroundPalette, CYCLO_PALETTE);
  assert.equal(DESIGNER_CATALOG.cards.find(({ id }) => id === "body-1").colors, CYCLO_PALETTE);

  const sheet = defaultToolConfiguration("barzy-sheet");
  sheet.backgrounds.objectsheet = "graphite";
  assert.equal((compileSheet(sheet, "objectsheet").outputs[0].prompt.match(/Graphite \(#34383C\)/g) ?? []).length, 2);

  const designer = defaultToolConfiguration("barz-designer");
  designer.selectedColors["body-1"] = { name: "Sage", hex: "#7F9181" };
  assert.match(compileDesigner(designer, "body-1").outputs[0].prompt, /Sage #7F9181/);
});

test("A7 preserves custom finals and validates structured recompilation state", () => {
  const configuration = defaultToolConfiguration("barzy-sheet");
  configuration.facsIds = [];
  configuration.customOutputs.complexexpressionboard = "My exact custom $& <prompt>";
  let output = compileSheet(configuration, "complexexpressionboard").outputs[0];
  assert.equal(output.prompt, "My exact custom $& <prompt>");
  assert.deepEqual(output.settings, {});
  delete configuration.customOutputs.complexexpressionboard;
  assert.throws(() => compileSheet(configuration, "complexexpressionboard"), /exactly eight/);
  configuration.facsIds = ["facs-au1", "facs-au1"];
  assert.throws(() => validateToolConfiguration("barzy-sheet", configuration), /zero to eight unique/);
});

test("A8 compiles all 55 BZ Designer defaults exactly as approved by Astra", () => {
  const configuration = defaultToolConfiguration("barz-designer");
  const payload = compileDesigner(configuration);
  assert.equal(DESIGNER_CATALOG.cards.length, 55);
  assert.deepEqual(DESIGNER_CATALOG.categories.map(({ cardCount }) => cardCount), [49, 3, 3]);
  assert.equal(DESIGNER_CATALOG.cards.filter(({ usesDrawingWeight }) => usesDrawingWeight).length, 40);
  for (const output of payload.outputs) {
    assert.equal(output.prompt, a8Supplement.approvedExpectedOutputs.defaultOutputs[output.id], output.id);
    assert.equal(output.mediaType, "image");
    assert.deepEqual(output.settings, {});
  }
});

test("A8 reproduces every reviewed color, weight and configured-output oracle", async () => {
  const configuration = defaultToolConfiguration("barz-designer");
  configuration.activeCategory = "body";
  configuration.activeTabs.sketch = "kids";
  configuration.drawingWeight = 85;
  configuration.selectedColors["body-1"] = { name: "Pink", hex: "#DE7C68" };
  for (const output of compileDesigner(configuration).outputs) {
    assert.equal(output.prompt, a8Supplement.approvedExpectedOutputs.configuredOutputs[output.id], output.id);
  }

  for (const testCase of a8Supplement.approvedExpectedOutputs.colorCases) {
    const colorConfiguration = defaultToolConfiguration("barz-designer");
    colorConfiguration.selectedColors["body-1"] = structuredClone(testCase.color);
    assert.equal(compileDesigner(colorConfiguration, "body-1").outputs[0].prompt, testCase.output);
  }

  const { createHash } = await import("node:crypto");
  for (const testCase of a8Supplement.approvedExpectedOutputs.weightCases) {
    const weightConfiguration = defaultToolConfiguration("barz-designer");
    weightConfiguration.drawingWeight = testCase.weight;
    for (const output of compileDesigner(weightConfiguration).outputs.filter(({ id }) => Object.hasOwn(testCase.outputs, id))) {
      assert.equal(createHash("sha256").update(output.prompt).digest("hex"), testCase.outputs[output.id], `${testCase.weight}/${output.id}`);
    }
  }
});

test("A8 preserves literal Wax scenes and custom finals while rejecting invalid controls", () => {
  const configuration = defaultToolConfiguration("barz-designer");
  const sceneCase = a8Supplement.approvedExpectedOutputs.sceneCase;
  configuration.scene = sceneCase.scene;
  assert.equal(compileDesigner(configuration, sceneCase.cardId).outputs[0].prompt, sceneCase.output);
  configuration.customOutputs[sceneCase.cardId] = "My exact $& <custom>  double  space";
  assert.equal(compileDesigner(configuration, sceneCase.cardId).outputs[0].prompt, configuration.customOutputs[sceneCase.cardId]);

  configuration.drawingWeight = 63;
  assert.throws(() => validateToolConfiguration("barz-designer", configuration), /steps of 5/);
  configuration.drawingWeight = 65;
  configuration.selectedColors["body-1"] = { name: "Pink", hex: "#B3A089" };
  assert.throws(() => validateToolConfiguration("barz-designer", configuration), /unknown color/);
});

test("A9 compiles all 17 Knolling cards exactly as approved by Astra", () => {
  const configuration = defaultToolConfiguration("knolling");
  const payload = compileKnolling(configuration);
  assert.equal(KNOLLING_CATALOG.cards.length, 17);
  assert.deepEqual(KNOLLING_CATALOG.tabs.map(({ cardCount }) => cardCount), [7, 2, 2, 6]);
  for (const output of payload.outputs) {
    assert.equal(output.prompt, a9Supplement.approvedExpectedOutputs.defaultOutputs[output.id], output.id);
    assert.equal(output.mediaType, "image");
    assert.deepEqual(output.settings, {});
  }
});

test("A9 reproduces all reviewed control and tattoo-order cases", () => {
  for (const testCase of a9Supplement.approvedExpectedOutputs.cases) {
    const configuration = {
      ...defaultToolConfiguration("knolling"),
      ...structuredClone(testCase.state)
    };
    assert.equal(compileKnolling(configuration, testCase.id).outputs[0].prompt, testCase.output, testCase.name);
  }
});

test("A9 keeps custom finals and rejects invalid ordered tattoo state", () => {
  const configuration = defaultToolConfiguration("knolling");
  configuration.customOutputs.tattoocharacter = "Exact $& <custom>  prompt";
  assert.equal(compileKnolling(configuration, "tattoocharacter").outputs[0].prompt, "Exact $& <custom>  prompt");
  configuration.tattooZones = ["right forearm", "right forearm"];
  assert.throws(() => validateToolConfiguration("knolling", configuration), /at most 19 unique zones/);
  configuration.tattooZones = ["unknown zone"];
  assert.throws(() => validateToolConfiguration("knolling", configuration), /unknown tattoo zone/);
});

test("A10 compiles every reviewed grid and camera output exactly", () => {
  assert.equal(MULTISHOT_CATALOG.camera.length, 24);
  assert.equal(MULTISHOT_CATALOG.cards.length, 14);
  for (const testCase of a10Supplement.approvedExpectedOutputs.cases) {
    const configuration = defaultToolConfiguration("multishot");
    configuration.grid = { cols: testCase.state.cols, rows: testCase.state.rows };
    if (testCase.state.hardFlashEnabled !== undefined) {
      configuration.hardFlashEnabled = testCase.state.hardFlashEnabled;
    }
    if (testCase.state.subject !== undefined) configuration.subject = testCase.state.subject;
    const output = compileMultishot(configuration, testCase.id).outputs[0];
    assert.equal(output.prompt, testCase.output, `${testCase.id}/${configuration.grid.cols}x${configuration.grid.rows}`);
    assert.equal(output.mediaType, "image");
    assert.deepEqual(output.settings, {});
  }
  for (const expected of a10Supplement.approvedExpectedOutputs.camera) {
    const output = compileMultishot(defaultToolConfiguration("multishot"), expected.id).outputs[0];
    assert.equal(output.prompt, expected.output, expected.id);
    const entry = MULTISHOT_CATALOG.camera.find(({ id }) => id === expected.id);
    assert.equal(output.mediaType, entry.type === "Movements" ? "video" : "image");
  }
});

test("A10 preserves custom finals and rejects invalid grids and output IDs", () => {
  const configuration = defaultToolConfiguration("multishot");
  configuration.customOutputs["multi-angle"] = "Exact $& ${angleList} <b>literal</b>";
  const output = compileMultishot(configuration, "multi-angle").outputs[0];
  assert.equal(output.prompt, configuration.customOutputs["multi-angle"]);
  assert.equal(output.custom, true);

  configuration.grid.cols = 2.5;
  assert.throws(() => validateToolConfiguration("multishot", configuration), /integer from 2 to 4/);
  configuration.grid.cols = 3;
  assert.throws(() => compileMultishot(configuration, "camera-99"), /unknown output/);
});

function a11Reference(reference) {
  return {
    slot: reference.slot,
    imageId: `image-${reference.slot}`,
    sourceName: `reference-${reference.slot}.png`,
    dataUrl: "data:image/png;base64,AA==",
    subject: reference.subject,
    context: reference.context
  };
}

test("A11 reproduces every reviewed Video Multi Framing oracle", async () => {
  const { buildA11Oracle } = await import("../migration/reviews/a11-output-oracle.mjs");
  const oracle = buildA11Oracle(a11Supplement.catalog.templates, a11Supplement.catalog.directorNotes);
  assert.equal(SEEDANCE_CATALOG.templates.length, 25);
  assert.equal(oracle.cases.length, 190);
  for (const testCase of oracle.cases) {
    const configuration = {
      ...defaultToolConfiguration("seedance"),
      ...testCase.state,
      references: (testCase.state.references ?? []).map(a11Reference)
    };
    const result = compileSeedance(configuration, { ignoreSaved: true });
    assert.equal(result.outputs[0].prompt, testCase.output, testCase.caseId);
    assert.equal(result.characterCount, testCase.characterCount, testCase.caseId);
    assert.deepEqual(result.warnings, testCase.warnings, testCase.caseId);
    if (testCase.individualOutputs) {
      assert.deepEqual(
        result.individualOutputs.map(({ prompt }) => prompt),
        testCase.individualOutputs.map(({ output }) => output),
        testCase.caseId
      );
    }
  }
});

test("A11 keeps saved finals literal, rejects invalid media, and never truncates an over-limit prompt", () => {
  const configuration = defaultToolConfiguration("seedance");
  configuration.subject = "literal <b>$& [STYLE]</b>";
  configuration.context = "room $1";
  configuration.mode = "moving";
  configuration.shotCount = 30;
  configuration.duration = 1;
  configuration.charLimit = 300;
  const canonical = compileSeedance(configuration, { ignoreSaved: true });
  assert.equal(canonical.overLimit, true);
  assert.ok(canonical.outputs[0].prompt.length > configuration.charLimit);
  const key = canonical.outputs[0].finalKey;
  configuration.finals[key] = "Personal $& <safe> final";
  assert.equal(compileSeedance(configuration).outputs[0].prompt, "Personal $& <safe> final");
  assert.equal(compileSeedance(configuration, { ignoreSaved: true }).outputs[0].prompt, canonical.outputs[0].prompt);
  const invalid = defaultToolConfiguration("seedance");
  invalid.references = [{ ...a11Reference({ slot: 1, subject: "", context: "" }), dataUrl: "https://example.test/x.png" }];
  assert.throws(() => validateToolConfiguration("seedance", invalid), /embedded PNG/);
});

test("Video Multi Framing exposes current engines, per-engine durations, storylines, and one director skill per template", () => {
  assert.deepEqual(
    SEEDANCE_CATALOG.engines.map(({ id, maxDuration }) => [id, maxDuration]),
    [["kling", 15], ["seedance", 30], ["minimax-h3", 15], ["flux-3", 20], ["wan", 30]]
  );
  assert.equal(SEEDANCE_CATALOG.templates.length, 25);
  assert.ok(SEEDANCE_CATALOG.templates.every(({ directorSkill }) => typeof directorSkill === "string" && directorSkill.length > 80));

  const seedance = defaultToolConfiguration("seedance");
  seedance.mode = "moving";
  seedance.provider = "seedance";
  seedance.duration = 30;
  seedance.storyline = "A courier crosses the city, loses the package, then recovers it at dawn.";
  seedance.subject = "the courier";
  seedance.context = "a rain-soaked city";
  const compiled = compileSeedance(seedance, { ignoreSaved: true });
  assert.equal(compiled.plan.at(-1).endTicks, 3000);
  assert.match(compiled.outputs[0].prompt, /Storyline: A courier crosses the city/);
  assert.match(compiled.directorSkill, /continuity|camera|framing/i);

  const flux = defaultToolConfiguration("seedance");
  flux.provider = "flux-3";
  flux.duration = 20;
  assert.doesNotThrow(() => validateToolConfiguration("seedance", flux));
  flux.duration = 21;
  assert.throws(() => validateToolConfiguration("seedance", flux), /1 to 20 for FLUX 3 Video/);
});

test("Video Multi Framing compiles explicit secondary subjects and settings without reassigning their image roles", () => {
  const configuration = defaultToolConfiguration("seedance");
  configuration.mode = "moving";
  configuration.subject = "@image1";
  configuration.context = "@image2";
  configuration.secondarySubjects = ["@image3", "a practical stunt driver"];
  configuration.secondaryContexts = ["@image4"];
  configuration.actionDirection = "Pursuit / Chase";
  configuration.references = [1, 2, 3, 4].map((slot) => a11Reference({ slot, subject: "", context: "" }));

  const compiled = compileSeedance(configuration, { ignoreSaved: true });
  assert.match(compiled.outputs[0].prompt, /Action direction: Pursuit \/ Chase/);
  assert.match(compiled.outputs[0].prompt, /secondary subjects: @image3; a practical stunt driver/);
  assert.match(compiled.outputs[0].prompt, /secondary settings: @image4/);
  assert.match(compiled.outputs[0].prompt, /main subject \(@image1\)/);
  assert.match(compiled.outputs[0].prompt, /main setting \(@image2\)/);
});

test("Video Multi Framing fills the selected still count through 30", () => {
  for (const count of [1, 10, 30]) {
    const configuration = defaultToolConfiguration("seedance");
    configuration.stillCount = count;
    configuration.subject = "a spacecraft";
    configuration.context = "an industrial city";
    const compiled = compileSeedance(configuration, { ignoreSaved: true });
    assert.equal(compiled.individualOutputs.length, count);
    assert.deepEqual(compiled.individualOutputs.map((item) => item.id),
      Array.from({ length: count }, (_unused, index) => `still-${index + 1}`));
    assert.ok(compiled.individualOutputs.every((item) => item.prompt.length > 30));
  }
});

test("Multiview creates an exact hard-cut plan up to 60 shots", () => {
  for (const [provider, count, duration] of [["seedance", 30, 15], ["wan", 60, 30]]) {
    const configuration = defaultToolConfiguration("seedance");
    configuration.mode = "multiview";
    configuration.provider = provider;
    configuration.shotCount = count;
    configuration.duration = duration;
    configuration.charLimit = 20_000;
    configuration.subject = "the pilot";
    configuration.context = "the cockpit";
    const compiled = compileSeedance(configuration, { ignoreSaved: true });
    assert.equal(compiled.plan.length, count);
    assert.equal((compiled.outputs[0].prompt.match(/^SHOT \d+ /gm) || []).length, count);
    assert.equal((compiled.outputs[0].prompt.match(/^HARD CUT\.$/gm) || []).length, count - 1);
    assert.equal(compiled.plan.at(-1).endTicks, duration * 100);
    assert.equal(compiled.outputs[0].mediaType, "video");
  }
});

test("Video Multi Framing accepts a reference up to 10 million encoded characters", () => {
  const configuration = defaultToolConfiguration("seedance");
  configuration.references = [{ ...a11Reference({ slot: 1, subject: "pilot", context: "cockpit" }),
    dataUrl: `data:image/png;base64,${"A".repeat(2_500_001)}` }];
  assert.doesNotThrow(() => validateToolConfiguration("seedance", configuration));
  configuration.references[0].dataUrl = `data:image/png;base64,${"A".repeat(10_000_000)}`;
  assert.throws(() => validateToolConfiguration("seedance", configuration), /under 10 MB/);
});
