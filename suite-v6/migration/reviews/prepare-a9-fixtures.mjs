import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_LEGACY_ROOT = "E:/Fable 5-Project/Meat Journey";
const SOURCE_PATH = "Barzy App/public/assets/HTML/knolling-board-generator.html";
const TAB_DEFINITIONS = [
  { id: "generate", title: "Generate Knolling Board", ids: [
    "outfit", "dresschar", "object", "scene", "var1", "var2", "var3"
  ] },
  { id: "tattoo", title: "Knolling Tattoo", ids: [
    "tattooextract", "tattoocharacter"
  ] },
  { id: "actor", title: "Actor Extract", ids: ["apose", "acting"] },
  { id: "decor", title: "Extract Decor", ids: [
    "panoCompact", "panoFreePov", "locreconstruct", "freepov", "360", "4pov"
  ] }
];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function between(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end <= start) {
    throw new Error(`Legacy ${label} markers were not found.`);
  }
  return source.slice(start, end);
}

function textFromLastMatch(source, pattern) {
  return [...source.matchAll(pattern)].at(-1)?.[1]?.trim() ?? "";
}

function extractCards(source) {
  const matches = new Map([...source.matchAll(
    /<div class="prompt-content" id="prompt-([^"]+)">([\s\S]*?)<\/div>/g
  )].map((match) => [match[1], match]));
  return TAB_DEFINITIONS.flatMap(({ id: tabId, ids }) => ids.map((id) => {
    const match = matches.get(id);
    if (!match) throw new Error(`Legacy prompt ${id} was not found.`);
    const prefix = source.slice(0, match.index);
    const prompt = match[2];
    return {
      id,
      tabId,
      title: textFromLastMatch(prefix, /<span class="prompt-title">([^<]+)<\/span>/g),
      description: textFromLastMatch(
        prefix,
        /<p class="prompt-description">([\s\S]*?)<\/p>/g
      ),
      prompt,
      placeholders: [...new Set(prompt.match(/\[[A-Z][A-Z0-9_]*\]/g) ?? [])]
    };
  }));
}

function extractTattooZones(source) {
  return [...source.matchAll(/class="body-zone-btn" data-zone="([^"]+)"/g)]
    .map((match) => match[1]);
}

function evaluateLegacy(source, cards, expression) {
  const model = between(
    source,
    "const lightingTexts = {",
    "// Tab Navigation",
    "Knolling dynamic model"
  );
  const runtime = `
    const promptTemplates = ${JSON.stringify(
      Object.fromEntries(cards.map(({ id, prompt }) => [id, prompt]))
    )};
    ${model}
  `;
  const context = vm.createContext(Object.create(null), {
    codeGeneration: { strings: false, wasm: false }
  });
  vm.runInContext(runtime, context, { timeout: 1_000 });
  return JSON.parse(vm.runInContext(`JSON.stringify(${expression})`, context, {
    timeout: 1_000
  }));
}

function buildFixture(source) {
  const cards = extractCards(source);
  const ids = cards.map(({ id }) => id);
  const expression = `(() => {
    function compile(id, state) {
      currentLighting = state.lighting;
      currentMultiRef = state.multiReference;
      currentAccessory = state.accessory;
      currentSubject = state.subject;
      currentTattooPlaceIt = state.tattooPlaceIt;
      selectedTattooZones.splice(0, selectedTattooZones.length, ...state.tattooZones);
      let text = promptTemplates[id];
      if (id === "apose" || id === "acting") {
        text = text.replace("[LIGHTING_PLACEHOLDER]", lightingTexts[currentLighting]);
      }
      if (["4pov", "360", "freepov", "locreconstruct", "panoCompact", "panoFreePov"].includes(id)) {
        text = text.replace("[MULTI_IMAGE_PLACEHOLDER]", multiRefTexts[currentMultiRef]);
      }
      if (id === "dresschar") {
        text = text.replace("[ACCESSORY_PLACEHOLDER]", accessoryTexts[currentAccessory]);
        text = text.replace("[SUBJECT_PLACEHOLDER]", subjectTexts[currentSubject]);
      }
      if (id === "tattooextract") {
        text = text.replace("[TATTOO_PLACE_IT_PLACEHOLDER]", tattooPlaceItTexts[currentTattooPlaceIt]);
      }
      if (id === "tattoocharacter") {
        text = text.replace("[TATTOO_ZONE_PLACEHOLDER]", buildTattooZoneText());
      }
      return text;
    }
    const ids = ${JSON.stringify(ids)};
    const defaultState = {
      lighting: "original",
      multiReference: "single",
      accessory: "clothes",
      subject: "puppet",
      tattooPlaceIt: "off",
      tattooZones: []
    };
    const configuredState = {
      lighting: "diffuse",
      multiReference: "multi",
      accessory: "full",
      subject: "human",
      tattooPlaceIt: "on",
      tattooZones: ["right forearm", "left shoulder", "neck and throat"]
    };
    return {
      optionTexts: { lightingTexts, multiRefTexts, subjectTexts, accessoryTexts,
        tattooPlaceItTexts },
      defaultState,
      configuredState,
      defaultOutputs: Object.fromEntries(ids.map(id => [id, compile(id, defaultState)])),
      configuredOutputs: Object.fromEntries(ids.map(id => [id, compile(id, configuredState)]))
    };
  })()`;
  return { cards, ...evaluateLegacy(source, cards, expression) };
}

export async function prepareA9Fixtures({
  legacyRoot = DEFAULT_LEGACY_ROOT,
  outputPath
} = {}) {
  const source = await readFile(path.join(legacyRoot, SOURCE_PATH), "utf8");
  const model = buildFixture(source);
  const fixture = {
    schemaVersion: "1.0",
    status: "legacy-fixture-before-astra-review",
    source: { owner: "knolling", path: SOURCE_PATH, sha256: sha256(source) },
    knolling: {
      title: "KNOLLING BOARD GENERATOR",
      subtitle: "Systematic flat lay prompt engineering",
      tabCount: TAB_DEFINITIONS.length,
      cardCount: model.cards.length,
      tabs: TAB_DEFINITIONS.map(({ id, title, ids }) => ({
        id, title, cardIds: ids, cardCount: ids.length
      })),
      countsByTab: Object.fromEntries(
        TAB_DEFINITIONS.map(({ id, ids }) => [id, ids.length])
      ),
      controls: {
        lighting: ["original", "diffuse"],
        multiReference: ["single", "multi"],
        accessory: ["clothes", "full"],
        subject: ["puppet", "human"],
        tattooPlaceIt: ["off", "on"],
        tattooZones: extractTattooZones(source)
      },
      compilerTargets: {
        lighting: ["apose", "acting"],
        multiReference: ["panoCompact", "panoFreePov", "locreconstruct", "freepov", "360", "4pov"],
        accessoryAndSubject: ["dresschar"],
        tattooPlaceIt: ["tattooextract"],
        tattooZones: ["tattoocharacter"]
      },
      ...model,
      legacyQuirks: {
        sourceTabOrder: ["generate", "tattoo", "decor", "actor"],
        navigationTabOrder: TAB_DEFINITIONS.map(({ id }) => id),
        dormantCharacterSheetBackgroundColorState: true
      }
    }
  };
  await writeFile(outputPath, `${JSON.stringify(fixture, null, 2)}\n`, "utf8");
  return fixture;
}

const isMain = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const fixture = await prepareA9Fixtures({
    legacyRoot: process.argv[2] || DEFAULT_LEGACY_ROOT,
    outputPath: path.join(here, "a9-legacy-fixtures.json")
  });
  console.log(JSON.stringify({
    tabs: fixture.knolling.countsByTab,
    cards: fixture.knolling.cardCount,
    tattooZones: fixture.knolling.controls.tattooZones.length
  }, null, 2));
}
