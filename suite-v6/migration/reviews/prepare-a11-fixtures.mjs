import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_LEGACY_ROOT = "E:/Fable 5-Project/Meat Journey";
const SOURCE_PATH = "Barzy App/public/assets/HTML/seedance_framing_final.html";
const PROVIDERS = ["kling", "seedance", "wan"];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function between(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end <= start) throw new Error(`Legacy ${label} markers were not found.`);
  return source.slice(start, end);
}

function evaluateLegacyData(source) {
  const runtime = between(
    source,
    "const templates = {",
    "const directorNotes = {",
    "Seedance template catalog"
  );
  const notes = between(
    source,
    "const directorNotes = {",
    "function directorStyleText",
    "Seedance director notes"
  );
  const context = vm.createContext(Object.create(null), {
    codeGeneration: { strings: false, wasm: false }
  });
  vm.runInContext(`${runtime}\n${notes}`, context, { timeout: 1_000 });
  return JSON.parse(vm.runInContext(
    "JSON.stringify({ templates, directorNotes })",
    context,
    { timeout: 1_000 }
  ));
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function hasUsefulValue(value) {
  const clean = String(value || "").trim();
  return Boolean(clean) && !/^\[IMG[_\s-]*\d+\]$/i.test(clean);
}

function buildSubjectText(subject, secondSubject) {
  return hasUsefulValue(secondSubject) ? `${subject}; secondary subject: ${secondSubject}` : subject;
}

function buildContextText(context, secondContext) {
  return hasUsefulValue(secondContext) ? `${context}; secondary context: ${secondContext}` : context;
}

function buildCoexistenceLine(subject, context, secondSubject, secondContext) {
  if (!hasUsefulValue(secondSubject) && !hasUsefulValue(secondContext)) return "";
  const subjectPart = hasUsefulValue(secondSubject)
    ? `Bring the secondary subject (${secondSubject}) into a logical relationship with the main subject (${subject}).`
    : `Extend the main subject (${subject}) into the secondary context.`;
  const contextPart = hasUsefulValue(secondContext)
    ? `Blend the secondary context (${secondContext}) with the main context (${context}) as a motivated shared scene, not a collage.`
    : `Keep the shared scene grounded in ${context}.`;
  return `${subjectPart} ${contextPart} Use cause-and-effect staging, shared light direction, matching scale, and clear spatial contact so both references feel like one believable setup.`;
}

function formatTimecode(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const secs = (safeSeconds % 60).toFixed(2).padStart(5, "0");
  return `${String(minutes).padStart(2, "0")}:${secs}`;
}

function cleanShotDescription(shot) {
  return String(shot || "")
    .replace(/^Sequence shot\s+\d+\s*\([^)]*\):\s*/i, "")
    .replace(/\bover\s+\d+(?:\.\d+)?\s*seconds?\b/gi, "")
    .replace(/\b\d+(?:\.\d+)?\s*sec(?:onds?)?\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^Still photograph:\s*/i, "")
    .trim();
}

function fillPromptText(text, subject, context, style) {
  return String(text || "")
    .replace(/\[SUBJECT\]/g, subject)
    .replace(/\[CONTEXT\]/g, context)
    .replace(/\[STYLE\]/g, style);
}

function compile(template, state) {
  const subject = buildSubjectText(state.subject, state.secondSubject);
  const context = buildContextText(state.context, state.secondContext);
  const coexistence = buildCoexistenceLine(
    state.subject, state.context, state.secondSubject, state.secondContext
  );
  if (state.mode === "stills") {
    return {
      info: template.stills.info,
      coexistence,
      shots: template.stills.shots.map((shot, index) => ({
        label: `Still ${index + 1}`,
        description: fillPromptText(shot, subject, context, state.style)
      }))
    };
  }
  const duration = clampNumber(state.duration, 1, 15, 14);
  const shotCount = clampNumber(state.shotCount, 1, 30, 7);
  const segmentDuration = duration / shotCount;
  const seedance = state.provider === "seedance";
  return {
    info: `${shotCount} ${seedance ? "cuts" : "shots"} - ${duration}s max - ${seedance ? "Seedance cut-to wording, no timecodes" : "Kling sequence wording"}`,
    actionDirection: String(state.actionDirection || "").trim(),
    coexistence,
    shots: Array.from({ length: shotCount }, (_, index) => ({
      label: seedance
        ? "Cut to"
        : `Sequence shot ${index + 1} (${formatTimecode(index * segmentDuration)}-${formatTimecode((index + 1) * segmentDuration)})`,
      description: fillPromptText(
        cleanShotDescription(template.moving.shots[index % template.moving.shots.length]),
        subject,
        context,
        state.style
      )
    }))
  };
}

function scenarioMatrix(templates) {
  const state = {
    subject: "@image1 clockwork diver",
    context: "@image1 flooded brass observatory",
    secondSubject: "@image2 glass moth",
    secondContext: "@image2 moonlit archive",
    style: "tactile 1970s optical effects",
    duration: 13,
    shotCount: 5,
    actionDirection: "The diver follows the moth through the archive."
  };
  return Object.fromEntries(Object.entries(templates).map(([id, template]) => [id, {
    stills: compile(template, { ...state, mode: "stills" }),
    moving: Object.fromEntries(PROVIDERS.map((provider) => [provider,
      compile(template, { ...state, mode: "moving", provider })
    ]))
  }]));
}

export async function prepareA11Fixtures({
  legacyRoot = DEFAULT_LEGACY_ROOT,
  outputPath
} = {}) {
  const source = await readFile(path.join(legacyRoot, SOURCE_PATH), "utf8");
  const { templates, directorNotes } = evaluateLegacyData(source);
  const templateEntries = Object.entries(templates).map(([id, template]) => ({
    id,
    ...template,
    aliasesStandardShots: ["wes", "coppola"].includes(id)
  }));
  const fixture = {
    schemaVersion: "1.0",
    status: "legacy-fixture-before-astra-review",
    source: { owner: "seedance", path: SOURCE_PATH, sha256: sha256(source) },
    seedanceFraming: {
      title: "Video Multi Framing",
      templateCount: templateEntries.length,
      categoryOrder: [...new Set(templateEntries.map(({ category }) => category))],
      countsByCategory: Object.fromEntries([...new Set(templateEntries.map(({ category }) => category))]
        .map((category) => [category, templateEntries.filter((item) => item.category === category).length])),
      templates: templateEntries,
      directorNotes,
      controls: {
        modes: ["stills", "moving"],
        providers: PROVIDERS,
        goActionModes: ["continuity", "abstract", "biologique"],
        referenceSlots: 9,
        duration: { min: 1, max: 15, default: 14 },
        shotCount: { min: 1, max: 30, default: 7 },
        promptCharLimit: { min: 300, max: 12000, default: 2500 }
      },
      referenceContract: {
        labels: Array.from({ length: 9 }, (_, index) => `@image${index + 1}`),
        perImageFields: ["dataUrl", "subject", "context"],
        maximumLoadedImages: 9,
        primaryAndSecondaryInputsFeedCoexistenceLogic: true
      },
      compilerContract: {
        stillLabels: "Still N",
        seedanceMovingLabel: "Cut to",
        klingAndWanMovingLabels: "Sequence shot N (MM:SS.ss-MM:SS.ss)",
        shotReuse: "cycle through the selected template when requested count exceeds its moving shot count",
        durationSplit: "equal duration / shotCount segments",
        promptLimit: "truncate rendered shot descriptions without changing the selected state"
      },
      aiDirectContract: {
        endpoint: "/api/ai/video-direct",
        explicitActionOnly: true,
        modes: ["continuity", "abstract", "biologique"],
        mustNotRunOn: ["load", "compile", "copy", "bridge-import"]
      },
      scenarios: scenarioMatrix(templates)
    }
  };
  await writeFile(outputPath, `${JSON.stringify(fixture, null, 2)}\n`, "utf8");
  return fixture;
}

const isMain = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const fixture = await prepareA11Fixtures({
    legacyRoot: process.argv[2] || DEFAULT_LEGACY_ROOT,
    outputPath: path.join(here, "a11-legacy-fixtures.json")
  });
  console.log(JSON.stringify({
    templates: fixture.seedanceFraming.templateCount,
    categories: fixture.seedanceFraming.countsByCategory,
    scenarios: Object.keys(fixture.seedanceFraming.scenarios).length
  }, null, 2));
}
