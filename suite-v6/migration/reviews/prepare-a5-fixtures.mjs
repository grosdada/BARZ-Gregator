import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_LEGACY_ROOT = "E:/Fable 5-Project/Meat Journey";
const SOURCE_PATH = "Barzy App/public/assets/HTML/veo_precision.html";

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
  const model = between(source, "const SECTIONS = [", "// --- RENDER", "VEO Precision model");
  const compiler = between(source, "function getCompositePrompt()", "function updateCompositeBar()", "VEO Precision compiler");
  return evaluateLegacy(`${model}\n${compiler}`, `(() => {
    const cards = SECTIONS.flatMap(section => section.cards.map(card => ({
      section: section.title,
      key: card.key,
      title: card.title,
      labels: card.labels,
      prompts: card.prompts
    })));
    const defaultValues = { ...state.values };
    const defaultCollapsed = { ...state.collapsed };
    const defaultOutputs = cards.map(card => ({
      key: card.key,
      label: card.labels[defaultValues[card.key]],
      prompt: card.prompts[defaultValues[card.key]]
    }));

    state.incoming = "slow blocking move received from Blocking Studio";
    state.active.dolly = true;
    state.values.dolly = 4;
    state.active.macro = true;
    state.values.macro = 0;
    state.active.super8 = true;
    state.values.super8 = 3;
    state.active.focus = true;
    state.values.focus = 2;
    const configuredComposite = getCompositePrompt();

    return {
      sections: SECTIONS.map(section => ({ title: section.title, icon: section.icon })),
      cards,
      defaultState: {
        active: {},
        values: defaultValues,
        collapsed: defaultCollapsed,
        incoming: ""
      },
      defaultOutputs,
      configuredState: {
        active: { ...state.active },
        values: { ...state.values },
        incoming: state.incoming
      },
      configuredComposite
    };
  })()`);
}

export async function prepareA5Fixtures({ legacyRoot = DEFAULT_LEGACY_ROOT, outputPath } = {}) {
  const source = await readFile(path.join(legacyRoot, SOURCE_PATH), "utf8");
  const veoPrecision = buildFixture(source);
  const keys = veoPrecision.cards.map(({ key }) => key);
  const fixture = {
    schemaVersion: "1.0",
    status: "legacy-fixture-before-astra-review",
    source: { owner: "veo-suite", path: SOURCE_PATH, sha256: sha256(source) },
    veoPrecision: {
      sectionCount: veoPrecision.sections.length,
      cardCount: veoPrecision.cards.length,
      promptCount: veoPrecision.cards.reduce((sum, card) => sum + card.prompts.length, 0),
      uniqueKeyCount: new Set(keys).size,
      ...veoPrecision
    }
  };
  await writeFile(outputPath, `${JSON.stringify(fixture, null, 2)}\n`, "utf8");
  return fixture;
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const fixture = await prepareA5Fixtures({
    legacyRoot: process.argv[2] || DEFAULT_LEGACY_ROOT,
    outputPath: path.join(here, "a5-legacy-fixtures.json")
  });
  console.log(JSON.stringify({
    sections: fixture.veoPrecision.sectionCount,
    cards: fixture.veoPrecision.cardCount,
    prompts: fixture.veoPrecision.promptCount,
    uniqueKeys: fixture.veoPrecision.uniqueKeyCount,
    compositeLayers: Object.keys(fixture.veoPrecision.configuredState.active).length + 1
  }, null, 2));
}
