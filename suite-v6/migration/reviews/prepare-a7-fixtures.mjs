import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_LEGACY_ROOT = "E:/Fable 5-Project/Meat Journey";
const SOURCE_PATH = "Barzy App/public/assets/HTML/barzy_sheet.html";

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
  const characterTab = source.indexOf('id="charsheet"');
  const pattern = /<div class="prompt-content" id="prompt-([^"]+)">([\s\S]*?)<\/div>/g;
  return [...source.matchAll(pattern)].map((match) => {
    const prefix = source.slice(0, match.index);
    return {
      id: match[1],
      title: textFromLastMatch(prefix, /<span class="prompt-title">([^<]+)<\/span>/g),
      description: textFromLastMatch(
        prefix,
        /<p class="prompt-description">([\s\S]*?)<\/p>/g
      ),
      tab: match.index < characterTab ? "techboard" : "charsheet",
      prompt: match[2]
    };
  });
}

function extractWeaponOptions(source) {
  const select = between(
    source,
    '<select class="weapon-select" id="poseWeaponSelect"',
    "</select>",
    "pose weapon selector"
  );
  const pattern = /<option value="([^"]*)"([^>]*)>([\s\S]*?)<\/option>/g;
  return [...select.matchAll(pattern)].map((match) => ({
    value: match[1],
    label: match[3].trim(),
    selected: /\bselected\b/.test(match[2])
  }));
}

function evaluateLegacy(source, cards, expression) {
  const dynamicModel = between(
    source,
    "const lightingTexts = {",
    "function getPromptTemplate(",
    "BZ Sheet dynamic model"
  );
  const runtime = `
    let fixtureWeapon = "none";
    const document = {
      getElementById(id) {
        return id === "poseWeaponSelect" ? { value: fixtureWeapon } : null;
      }
    };
    const promptTemplates = ${JSON.stringify(
      Object.fromEntries(cards.map(({ id, prompt }) => [id, prompt]))
    )};
    ${dynamicModel}
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
  const weaponOptions = extractWeaponOptions(source);
  const cardIds = cards.map(({ id }) => id);
  const expression = `(() => {
    function setFacs(codes) {
      selectedFacs.clear();
      codes.forEach(code => selectedFacs.add(code));
    }
    function compile(id, state) {
      let text = promptTemplates[id];
      fixtureWeapon = state.weapon;
      setFacs(state.facs);
      if (id === "posesheet") text = buildPoseWeaponText(text);
      if (id === "complexexpressionboard") {
        text = text.replace("[FACS_SELECTION_PLACEHOLDER]", buildFacsSelectionText());
      }
      if (bgColors[id]) {
        const color = state.backgrounds[id] || bgColors[id];
        text = text.replace("[BG_COLOR_PLACEHOLDER]", bgColorTexts[color]);
      }
      return text;
    }
    const ids = ${JSON.stringify(cardIds)};
    const defaultState = {
      tab: "techboard",
      backgrounds: { ...bgColors },
      weapon: "none",
      facs: [...selectedFacs]
    };
    const configuredState = {
      tab: "charsheet",
      backgrounds: { ...bgColors, objectsheet: "pink", "master-reference": "beige" },
      weapon: "ref",
      facs: ["AU2", "AU7", "AU10", "AU14", "AU20", "AU27", "AU43", "AU85"]
    };
    return {
      lightingTexts,
      multiRefTexts,
      subjectTexts,
      accessoryTexts,
      backgrounds: bgColorTexts,
      facs: FACS.map(unit => ({ ...unit, visible: FACS_VISIBLE[unit.code] })),
      defaultState,
      configuredState,
      defaultOutputs: Object.fromEntries(ids.map(id => [id, compile(id, defaultState)])),
      configuredOutputs: Object.fromEntries(ids.map(id => [id, compile(id, configuredState)]))
    };
  })()`;
  const model = evaluateLegacy(source, cards, expression);
  return { cards, weaponOptions, ...model };
}

export async function prepareA7Fixtures({
  legacyRoot = DEFAULT_LEGACY_ROOT,
  outputPath
} = {}) {
  const source = await readFile(path.join(legacyRoot, SOURCE_PATH), "utf8");
  const sheet = buildFixture(source);
  const fixture = {
    schemaVersion: "1.0",
    status: "legacy-fixture-before-astra-review",
    source: { owner: "barzy-sheet", path: SOURCE_PATH, sha256: sha256(source) },
    sheet: {
      title: "BZ SHEET",
      subtitle: "Tech boards and character reference sheets",
      tabs: [
        { id: "techboard", title: "Tech Board" },
        { id: "charsheet", title: "Character Sheet" }
      ],
      cardCount: sheet.cards.length,
      countsByTab: Object.fromEntries(
        ["techboard", "charsheet"].map((tab) => [
          tab,
          sheet.cards.filter((card) => card.tab === tab).length
        ])
      ),
      ...sheet,
      dormantControls: {
        reason: "No active prompt card contains these legacy placeholders.",
        lightingTargets: ["apose", "acting"],
        multiReferenceTargets: ["4pov", "360", "freepov", "locreconstruct"],
        accessoryTargets: ["dresschar"]
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
  const fixture = await prepareA7Fixtures({
    legacyRoot: process.argv[2] || DEFAULT_LEGACY_ROOT,
    outputPath: path.join(here, "a7-legacy-fixtures.json")
  });
  console.log(JSON.stringify({
    cards: fixture.sheet.cardCount,
    tabs: fixture.sheet.countsByTab,
    facs: fixture.sheet.facs.length,
    weapons: fixture.sheet.weaponOptions.length
  }, null, 2));
}
