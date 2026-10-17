import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_LEGACY_ROOT = "E:/Fable 5-Project/Meat Journey";
const SOURCE_PATH = "Barzy App/public/assets/HTML/cinematic_shoot.html";

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
  const rawPrompts = between(source, "const RAW_PROMPTS = [", "const families = [", "Cinematic Shoot prompts");
  const model = between(source, "const families = [", "const els = {", "Cinematic Shoot model");
  const compiler = between(source, "function cleanTitle(", "function showToast(", "Cinematic Shoot compiler");
  const documentStub = `
    let fixtureElements = Object.create(null);
    const document = { getElementById(id) { return fixtureElements[id] || null; } };
  `;
  return evaluateLegacy(`${rawPrompts}\n${documentStub}\n${model}\n${compiler}`, `(() => {
    const defaultOutputs = prompts.map(item => ({
      id: item.id,
      title: item.cleanTitle,
      family: item.family,
      output: buildPrompt(item)
    }));
    state.grid = normalizeGrid({ cols: 4, rows: 2 });
    state.characterMode = "human";
    const first = prompts[0];
    fixtureElements["details-" + first.id] = {
      value: "Subject: a weathered marionette detective; Context: rain-soaked station platform"
    };
    fixtureElements["outfit-" + first.id] = { checked: true };
    const configuredOutput = buildPrompt(first);
    return {
      families: families.map(({ id, label }) => ({ id, label })),
      prompts: prompts.map(({ id, title, cleanTitle, family, prompt, highlight, hasOutfitToggle }) => ({
        id, title, cleanTitle, family, prompt,
        ...(highlight === undefined ? {} : { highlight }),
        ...(hasOutfitToggle === undefined ? {} : { hasOutfitToggle })
      })),
      defaultState: { grid: { cols: 3, rows: 3, total: 9, spec: "3x3" }, characterMode: "puppet" },
      defaultOutputs,
      configuredFixture: {
        promptId: first.id,
        grid: JSON.parse(JSON.stringify(state.grid)),
        characterMode: state.characterMode,
        details: fixtureElements["details-" + first.id].value,
        outfitChecked: true,
        output: configuredOutput
      }
    };
  })()`);
}

export async function prepareA2Fixtures({ legacyRoot = DEFAULT_LEGACY_ROOT, outputPath } = {}) {
  const source = await readFile(path.join(legacyRoot, SOURCE_PATH), "utf8");
  const cinematicShoot = buildFixture(source);
  const fixture = {
    schemaVersion: "1.0",
    status: "legacy-fixture-before-astra-review",
    source: { owner: "cinematic-shoot", path: SOURCE_PATH, sha256: sha256(source) },
    cinematicShoot: {
      familyCount: cinematicShoot.families.length,
      promptCount: cinematicShoot.prompts.length,
      ...cinematicShoot
    }
  };
  await writeFile(outputPath, `${JSON.stringify(fixture, null, 2)}\n`, "utf8");
  return fixture;
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const fixture = await prepareA2Fixtures({
    legacyRoot: process.argv[2] || DEFAULT_LEGACY_ROOT,
    outputPath: path.join(here, "a2-legacy-fixtures.json")
  });
  console.log(JSON.stringify({
    families: fixture.cinematicShoot.familyCount,
    prompts: fixture.cinematicShoot.promptCount,
    defaultOutputs: fixture.cinematicShoot.defaultOutputs.length
  }, null, 2));
}
