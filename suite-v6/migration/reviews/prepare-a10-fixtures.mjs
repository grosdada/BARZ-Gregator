import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_LEGACY_ROOT = "E:/Fable 5-Project/Meat Journey";
const SOURCE_PATH = "Barzy App/public/assets/HTML/MD Multishot.html";
const TABS = ["camera", "multishot", "actionboard"];
const MULTI_ANGLE_POOL = [
  "wide establishing shot",
  "full-body front view, eye-level",
  "3/4 front-left view",
  "3/4 front-right view",
  "full profile side view (left)",
  "full profile side view (right)",
  "back view",
  "low-angle hero shot",
  "high-angle shot",
  "over-the-shoulder",
  "medium shot, chest up",
  "close-up on face",
  "extreme close-up (eyes/detail)",
  "bird's-eye top-down",
  "dutch-angle dynamic",
  "POV / detail insert"
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

function evaluateLegacyData(source) {
  const runtime = [
    between(source, "const cameraData = [", "// Render camera table", "camera data"),
    between(
      source,
      "const multishotDataBase = [",
      "// Action board data",
      "multishot data"
    ),
    between(
      source,
      "const actionBoardDataBase = [",
      "// State for flash toggle",
      "action board data"
    )
  ].join("\n");
  const context = vm.createContext(Object.create(null), {
    codeGeneration: { strings: false, wasm: false }
  });
  vm.runInContext(runtime, context, { timeout: 1_000 });
  return JSON.parse(vm.runInContext(
    "JSON.stringify({ cameraData, multishotDataBase, actionBoardDataBase })",
    context,
    { timeout: 1_000 }
  ));
}

function normalizeGrid({ cols = 3, rows = 3 } = {}) {
  const normalizedCols = Math.max(2, Math.min(4, Number(cols) || 3));
  const normalizedRows = Math.max(2, Math.min(4, Number(rows) || 3));
  return {
    cols: normalizedCols,
    rows: normalizedRows,
    total: normalizedCols * normalizedRows,
    spec: `${normalizedCols}x${normalizedRows}`
  };
}

function sourceGridKey(grid) {
  return grid.total <= 6 ? "2x3" : "3x3";
}

function adaptGridPrompt(prompt, noGridAdapt, grid) {
  if (noGridAdapt) return prompt;
  const gridLabel = `${grid.cols}x${grid.rows}`;
  let text = prompt;
  text = text.replace(/(?:2|3)(?:x|×|×)(?:3)/gi, gridLabel);
  text = text.replace(/\b(?:6|9)-Frame\b/g, `${grid.total}-Frame`);
  text = text.replace(/\b(?:6|9)-frame\b/g, `${grid.total}-frame`);
  text = text.replace(/\b(?:6|9) frames\b/gi, `${grid.total} frames`);
  text = text.replace(/\b(?:six|nine) frames\b/gi, `${grid.total} frames`);
  return `${text}\n\nPROMPT ATLAS GRID OVERRIDE: Use exactly ${grid.total} frames in a ${gridLabel} grid. If the prompt contains a longer shot list, keep its intent but compress or expand it to the selected grid. Number panels row by row from left to right.`;
}

function compileMultishot(data, grid, hardFlashEnabled) {
  let prompt = data.noGridAdapt
    ? data.prompt
    : data[`prompt_${sourceGridKey(grid)}`];
  if (data.hasFlashToggle) {
    const flashText = hardFlashEnabled ? " with a hard flash" : "";
    prompt = prompt.replace("{{FLASH_OPTION}}", flashText);
  }
  return adaptGridPrompt(prompt, data.noGridAdapt, grid);
}

function compileActionBoard(data, grid) {
  return adaptGridPrompt(data[`prompt_${sourceGridKey(grid)}`], false, grid);
}

function buildMultiAnglePrompt(grid, subjectRaw = "") {
  const count = Math.min(grid.total, MULTI_ANGLE_POOL.length);
  const subject = subjectRaw.trim() || "(describe your subject / reference image here)";
  const angleList = MULTI_ANGLE_POOL.slice(0, count)
    .map((angle, index) => `${index + 1}. ${angle}`)
    .join("\n");
  return `Using the provided reference image as the SINGLE source of truth, generate a ${grid.cols}x${grid.rows} grid (${count} panels) of the EXACT SAME subject. Change ONLY the camera angle between panels. Keep the character, face, body proportions, wardrobe, colors, materials, lighting and environment perfectly identical and consistent across every panel. Do not add, remove or restyle anything; do not change time of day or art style.

Subject: ${subject}

Panel camera angles (number panels row by row, left to right):
${angleList}

Clean even grid, equal panel sizes, consistent global illumination and identical color grade across all panels, sharp focus, high detail, photoreal.`;
}

function compileScenarios(data) {
  const grids = [
    normalizeGrid({ cols: 2, rows: 2 }),
    normalizeGrid({ cols: 2, rows: 3 }),
    normalizeGrid({ cols: 3, rows: 3 }),
    normalizeGrid({ cols: 4, rows: 4 })
  ];
  return Object.fromEntries(grids.map((grid) => {
    const key = grid.spec;
    return [key, {
      grid,
      sourceGridKey: sourceGridKey(grid),
      multiAngleBlank: buildMultiAnglePrompt(grid),
      multiAngleConfigured: buildMultiAnglePrompt(
        grid,
        "a clockwork diver in a copper pressure suit"
      ),
      multishotFlashOn: data.multishotDataBase.map((item) => ({
        title: item.title,
        prompt: compileMultishot(item, grid, true)
      })),
      multishotFlashOff: data.multishotDataBase.map((item) => ({
        title: item.title,
        prompt: compileMultishot(item, grid, false)
      })),
      actionBoards: data.actionBoardDataBase.map((item) => ({
        title: item.title,
        prompt: compileActionBoard(item, grid)
      }))
    }];
  }));
}

export async function prepareA10Fixtures({
  legacyRoot = DEFAULT_LEGACY_ROOT,
  outputPath
} = {}) {
  const source = await readFile(path.join(legacyRoot, SOURCE_PATH), "utf8");
  const data = evaluateLegacyData(source);
  const fixture = {
    schemaVersion: "1.0",
    status: "legacy-fixture-before-astra-review",
    source: { owner: "multishot", path: SOURCE_PATH, sha256: sha256(source) },
    multishot: {
      title: "BZ Multishot",
      subtitle: "cinematic reference helper",
      tabs: TABS,
      camera: {
        count: data.cameraData.length,
        countsByType: {},
        entries: data.cameraData
      },
      sequences: {
        count: data.multishotDataBase.length,
        entries: data.multishotDataBase
      },
      actionBoards: {
        count: data.actionBoardDataBase.length,
        entries: data.actionBoardDataBase
      },
      gridPolicy: {
        acceptedCols: [2, 3, 4],
        acceptedRows: [2, 3, 4],
        sourceSelection: "2x3 when total <= 6; otherwise 3x3",
        multiAngleMaximum: MULTI_ANGLE_POOL.length
      },
      multiAnglePool: MULTI_ANGLE_POOL,
      scenarios: compileScenarios(data),
      iterationContract: {
        endpoint: "/api/ai/refine",
        outputType: "image",
        preserves: [
          "theme title",
          "multishot/contact-sheet grid principle",
          "cinematic reference style",
          "character morphology consistency",
          "no-text constraints"
        ]
      }
    }
  };
  fixture.multishot.camera.countsByType = Object.fromEntries(
    [...new Set(data.cameraData.map(({ type }) => type))]
      .map((type) => [type, data.cameraData.filter((item) => item.type === type).length])
  );
  await writeFile(outputPath, `${JSON.stringify(fixture, null, 2)}\n`, "utf8");
  return fixture;
}

const isMain = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const fixture = await prepareA10Fixtures({
    legacyRoot: process.argv[2] || DEFAULT_LEGACY_ROOT,
    outputPath: path.join(here, "a10-legacy-fixtures.json")
  });
  console.log(JSON.stringify({
    camera: fixture.multishot.camera.countsByType,
    sequences: fixture.multishot.sequences.count,
    actionBoards: fixture.multishot.actionBoards.count,
    scenarios: Object.keys(fixture.multishot.scenarios)
  }, null, 2));
}
