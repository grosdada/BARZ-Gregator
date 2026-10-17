import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_LEGACY_ROOT = "E:/Fable 5-Project/Meat Journey";
const SOURCE_PATH = "Barzy App/public/assets/HTML/cccp.html";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function between(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end <= start) throw new Error(`Legacy ${label} markers were not found.`);
  return source.slice(start, end);
}

function evaluateLegacy(source, expression) {
  const context = vm.createContext(Object.create(null), {
    codeGeneration: { strings: false, wasm: false }
  });
  vm.runInContext(source, context, { timeout: 1_000 });
  return JSON.parse(vm.runInContext(`JSON.stringify(${expression})`, context, { timeout: 1_000 }));
}

function buildFixture(source) {
  const model = between(source, "const prompts = {", "function normalizeAtlasGrid(", "CCP model");
  const gridCompiler = between(source, "function normalizeAtlasGrid(", "function applyAtlasGrid(", "CCP grid compiler");
  const storyboardCompiler = between(source, "function storyboardBasePrompt()", "// Iterate:", "CCP storyboard compiler");
  const panelCompiler = between(source, "function updatePromptC()", "// Switch B mode", "CCP panel compiler");
  const runtime = `${model}
    const fixtureFields = {
      "input-b": { value: "" },
      "input-c": { value: "" },
      "prompt-c": { textContent: "" }
    };
    const document = { getElementById(id) { return fixtureFields[id]; } };
    ${gridCompiler}
    ${storyboardCompiler}
    ${panelCompiler}`;

  return evaluateLegacy(runtime, `(() => {
    const stages = [
      { id: "a1", title: "Contact Sheet Prompt ver. 2.0", modes: [] },
      { id: "a2", title: "Character Sheet - Professional Reference", modes: ["puppet", "human"] },
      { id: "b", title: "Storyboard Sequence", modes: ["puppet", "human"] },
      { id: "c", title: "Single Image Render", modes: ["puppet", "human"] }
    ];
    const defaultOutputs = {
      a1: adaptGridPrompt(prompts.a1),
      a2: prompts.a2 + "\\n\\n" + a2ModeTexts.puppet,
      b: storyboardFullPrompt()
    };
    updatePromptC();
    defaultOutputs.c = fixtureFields["prompt-c"].textContent;

    atlasGrid = normalizeAtlasGrid({ cols: 4, rows: 2 });
    currentA2Mode = "human";
    currentBMode = "human";
    currentCMode = "human";
    iterationTake = 2;
    fixtureFields["input-b"].value = "A courier crosses a flooded archive while the ceiling collapses.";
    fixtureFields["input-c"].value = "b2";
    const configuredOutputs = {
      a1: adaptGridPrompt(prompts.a1),
      a2: prompts.a2 + "\\n\\n" + a2ModeTexts[currentA2Mode],
      b: storyboardFullPrompt()
    };
    updatePromptC();
    configuredOutputs.c = fixtureFields["prompt-c"].textContent;

    return {
      title: "CCP",
      subtitle: "Consistent Character Processus",
      stages,
      promptTemplates: prompts,
      modeTexts: { a2: a2ModeTexts, b: bModeTexts },
      storyboardVariations,
      defaultState: {
        grid: { cols: 3, rows: 3, total: 9, spec: "3x3" },
        modes: { a2: "puppet", b: "puppet", c: "puppet" },
        iterationTake: 0,
        scene: "",
        panelCode: "A1"
      },
      defaultOutputs,
      configuredState: {
        grid: { ...atlasGrid },
        modes: { a2: currentA2Mode, b: currentBMode, c: currentCMode },
        iterationTake,
        scene: fixtureFields["input-b"].value,
        panelCode: fixtureFields["input-c"].value
      },
      configuredOutputs,
      normalizationCases: [
        normalizeAtlasGrid({ cols: 2, rows: 4 }),
        normalizeAtlasGrid({ cols: 99, rows: -3 }),
        normalizeAtlasGrid({ cols: "bad", rows: null })
      ]
    };
  })()`);
}

export async function prepareA6Fixtures({ legacyRoot = DEFAULT_LEGACY_ROOT, outputPath } = {}) {
  const source = await readFile(path.join(legacyRoot, SOURCE_PATH), "utf8");
  const ccp = buildFixture(source);
  const fixture = {
    schemaVersion: "1.0",
    status: "legacy-fixture-before-astra-review",
    source: { owner: "cccp", path: SOURCE_PATH, sha256: sha256(source) },
    ccp: {
      stageCount: ccp.stages.length,
      templateCount: Object.keys(ccp.promptTemplates).length,
      variationCount: ccp.storyboardVariations.length,
      ...ccp
    }
  };
  await writeFile(outputPath, `${JSON.stringify(fixture, null, 2)}\n`, "utf8");
  return fixture;
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const fixture = await prepareA6Fixtures({
    legacyRoot: process.argv[2] || DEFAULT_LEGACY_ROOT,
    outputPath: path.join(here, "a6-legacy-fixtures.json")
  });
  console.log(JSON.stringify({
    stages: fixture.ccp.stageCount,
    templates: fixture.ccp.templateCount,
    variations: fixture.ccp.variationCount,
    defaultGrid: fixture.ccp.defaultState.grid.spec,
    configuredGrid: fixture.ccp.configuredState.grid.spec
  }, null, 2));
}
