import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_LEGACY_ROOT = "E:/Fable 5-Project/Meat Journey";
const FACS_SOURCE = "Barzy App/public/assets/HTML/facs_sheet_generator.html";
const BOARD_SOURCE = "Barzy App/public/assets/HTML/barzy-board.html";

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

function facsSheetFixture(source) {
  const data = between(source, "const FACS = [", "const selected =", "FACS Sheet data");
  const defaults = between(source, "const defaultText = {", "const presetCards =", "FACS Sheet defaults");
  const compiler = between(source, "function cleanSentence(", "function update(", "FACS Sheet compiler");
  return evaluateLegacy(`${data}\n${defaults}\nconst fixtureValues = Object.create(null);\nfunction value(id){ return fixtureValues[id] || ""; }\nfunction unitByCode(code){ return FACS.find(unit => unit.code === code); }\n${compiler}`, `(() => {
    const select = ["AU1", "AU27", "AU61", "AU62", "AU85"];
    const selectedUnits = select.map(unitByCode);
    const defaultActing = "FACS acting layer: " + selectedUnits.map(actingLine).join("; ");
    const defaultBoardPrompts = selectedUnits.map(unit => promptFor(unit) + " " + unit.code.replace(/B$/, "") + " - " + unit.name).join("\\n");
    const defaultFullBoardPrompt = buildCompactFACSBoardPrompt();
    const payload = payloadFor(select, "motion");
    delete payload.sentAt;
    fixtureValues.anchor = "[IMG_9], angular heroine with a silver bob";
    fixtureValues.wardrobe = "black velvet coat, unchanged";
    fixtureValues.framing = "tight portrait, cyan rim light";
    const configuredPrompts = selectedUnits.map(unit => ({ code: unit.code, prompt: promptFor(unit) }));
    const fullBoardPrompt = buildCompactFACSBoardPrompt();
    return {
      units: FACS,
      visibleByCode: VISIBLE,
      defaultText,
      selectedCodes: select,
      defaultActing,
      defaultBoardPrompts,
      defaultFullBoardPrompt,
      payload,
      configuredValues: { ...fixtureValues },
      configuredPrompts,
      fullBoardPrompt
    };
  })()`);
}

function boardFixture(source) {
  const data = between(source, "const FACS = [", "const state =", "BZ Board FACS data");
  const facsCompiler = between(source, "function facsName(", "function showFacsInbox(", "BZ Board FACS compiler");
  const promptCompiler = between(source, "function buildStory(", "function regen(", "BZ Board prompt compiler");
  const fixtureState = {
    story: { facs: ["AU1", "AU27", "AU61"] },
    motion: { facs: [] }
  };
  const values = {
    "s-subject": "a weary lunar archivist in a charcoal coat",
    "s-ref-char": "[IMG_1]",
    "s-action": "crosses a flooded archive while protecting a glass key",
    "s-env": "moonlit concrete stacks, ankle-deep water",
    "s-ref-env": "[IMG_2]",
    "s-secondary": "[IMG_3] = a silent brass automaton",
    "s-cam": "handheld arthouse, whip pans, orbit movement, overhead, extreme negative space",
    "s-panels": "12",
    "s-ratio": "16:9",
    "s-draw": "rough pencil B&W, minimal detail, strong silhouette, unfinished previs",
    "s-draw-desc": "blue grease-pencil shadows",
    "s-draw-ref": "@[ink ref]",
    "s-final": "the glass key illuminates both faces",
    "m-model": "seedance",
    "m-ref-board": "@[storyboard ref]",
    "m-ref-char": "[IMG_1]",
    "m-ref-env": "[IMG_2]",
    "m-ref-secondary": "[IMG_3], [IMG_4]",
    "m-duration": "15",
    "m-pace": "urgent quick cuts, whip transitions, match cuts, no pauses",
    "m-final-hold": "1",
    "m-subject": "",
    "m-secondary": "",
    "m-action": "",
    "m-env": "",
    "m-cam": "",
    "m-audio": "Distant water drips; no dialogue."
  };
  return evaluateLegacy(`${data}\nconst fixtureValues = ${JSON.stringify(values)};\nconst fixtureChecks = { "s-annot": true };\nconst state = { story: { facs: new Set(${JSON.stringify(fixtureState.story.facs)}) }, motion: { facs: new Set() } };\nfunction v(id){ return String(fixtureValues[id] || "").trim(); }\nfunction vCheck(id){ return Boolean(fixtureChecks[id]); }\n${facsCompiler}\n${promptCompiler}`, `(() => {
    const story = buildStory();
    const motionByModel = ["seedance", "kling", "veo"].map(model => {
      fixtureValues["m-model"] = model;
      return { model, prompt: buildMotion() };
    });
    state.motion.facs.add("AU62");
    fixtureValues["m-model"] = "seedance";
    const motionOwnFacs = buildMotion();
    return {
      facsGroups: FACS,
      facsUnitCount: FACS.reduce((sum, group) => sum + group.items.length, 0),
      configuredValues: { ...fixtureValues, "m-model": "seedance" },
      configuredChecks: { ...fixtureChecks },
      storyFacs: [...state.story.facs],
      story,
      motionByModel,
      motionOwnFacs
    };
  })()`);
}

export async function prepareA4Fixtures({ legacyRoot = DEFAULT_LEGACY_ROOT, outputPath } = {}) {
  const [facsSource, boardSource] = await Promise.all([
    readFile(path.join(legacyRoot, FACS_SOURCE), "utf8"),
    readFile(path.join(legacyRoot, BOARD_SOURCE), "utf8")
  ]);
  const facsSheet = facsSheetFixture(facsSource);
  const board = boardFixture(boardSource);
  const sheetCodes = new Set(facsSheet.units.map(({ code }) => code));
  const boardCodes = new Set(board.facsGroups.flatMap(({ items }) => items.map(({ code }) => code)));
  const fixture = {
    schemaVersion: "1.0",
    status: "legacy-fixture-before-astra-review",
    sources: [
      { owner: "facs-sheet-generator", role: "facs-sheet", path: FACS_SOURCE, sha256: sha256(facsSource) },
      { owner: "barzy-board", role: "storyboard-motion", path: BOARD_SOURCE, sha256: sha256(boardSource) }
    ],
    facsSheet: { unitCount: facsSheet.units.length, ...facsSheet },
    board,
    compatibility: {
      sharedCodes: [...sheetCodes].filter((code) => boardCodes.has(code)),
      sheetOnlyCodes: [...sheetCodes].filter((code) => !boardCodes.has(code)),
      boardOnlyCodes: [...boardCodes].filter((code) => !sheetCodes.has(code)),
      conflictingNames: [...sheetCodes].filter((code) => boardCodes.has(code)).flatMap((code) => {
        const sheetName = facsSheet.units.find((unit) => unit.code === code).name;
        const boardName = board.facsGroups.flatMap(({ items }) => items).find((unit) => unit.code === code).name;
        return sheetName === boardName ? [] : [{ code, sheetName, boardName }];
      })
    }
  };
  await writeFile(outputPath, `${JSON.stringify(fixture, null, 2)}\n`, "utf8");
  return fixture;
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const fixture = await prepareA4Fixtures({
    legacyRoot: process.argv[2] || DEFAULT_LEGACY_ROOT,
    outputPath: path.join(here, "a4-legacy-fixtures.json")
  });
  console.log(JSON.stringify({
    facsSheetUnits: fixture.facsSheet.unitCount,
    boardUnits: fixture.board.facsUnitCount,
    sharedCodes: fixture.compatibility.sharedCodes.length,
    sheetOnlyCodes: fixture.compatibility.sheetOnlyCodes,
    boardOnlyCodes: fixture.compatibility.boardOnlyCodes,
    conflictingNames: fixture.compatibility.conflictingNames
  }, null, 2));
}
