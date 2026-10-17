import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_LEGACY_ROOT = "E:/Fable 5-Project/Meat Journey";
const SOURCE_PATH = "Barzy App/public/assets/HTML/meat-dept-prompt-helper-Def.html";
const DATA_NAMES = [
  "framingShots", "cameraMovements", "focalLengths", "cameraModels",
  "lightingArtificial", "lightingNatural", "actions", "acting", "adjectives",
  "subjectsPeople", "subjectsAnimals", "subjectsObjects", "backgroundsIndoor",
  "backgroundsOutdoor", "backgroundsNature", "genrePresets", "videoTemplates",
  "artists", "artStyles", "templateExamples"
];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function extractLegacyData(source) {
  const start = source.indexOf("const framingShots = {");
  const end = source.indexOf("let favorites =", start);
  if (start < 0 || end <= start) throw new Error("Cinema Helper data block was not found.");
  const context = vm.createContext(Object.create(null), {
    codeGeneration: { strings: false, wasm: false }
  });
  vm.runInContext(source.slice(start, end), context, { timeout: 2_000 });
  return JSON.parse(vm.runInContext(
    `JSON.stringify({${DATA_NAMES.join(",")}})`, context, { timeout: 2_000 }
  ));
}

function composeLocal(deck) {
  const organized = Object.fromEntries([
    "subjects", "objects", "backgrounds", "focal", "models", "movements",
    "framing", "actions", "adjectives", "acting", "lighting"
  ].map((key) => [key, []]));
  const destinations = {
    subjects: "subjects", objects: "objects", backgrounds: "backgrounds",
    "camera-focal": "focal", "camera-models": "models", camera: "movements",
    framing: "framing", action: "actions", adjectives: "adjectives",
    acting: "acting", lighting: "lighting"
  };
  for (const item of deck) {
    const destination = destinations[item.category];
    if (destination) organized[destination].push(item.copyText);
  }
  const parts = [];
  const cameraSetup = [...organized.focal, ...organized.models];
  if (cameraSetup.length) parts.push(cameraSetup.join(", "));
  const cameraAction = [...organized.movements, ...organized.framing];
  if (cameraAction.length) parts.push(cameraAction.join(" "));
  if (organized.subjects.length) {
    const subject = organized.subjects[0];
    let subjectPhrase = organized.subjects.length > 1
      ? organized.subjects.join(" and ")
      : `${/[aeiou]/i.test(subject[0] || "") ? "an" : "a"} ${subject}`;
    if (organized.actions.length || organized.adjectives.length) {
      let actionPart = "";
      if (organized.adjectives.length && organized.actions.length) {
        actionPart = `${organized.actions.join(" and ")} ${organized.adjectives[0]}`;
      } else if (organized.actions.length) {
        actionPart = organized.actions.join(" and ");
      } else {
        actionPart = `moves ${organized.adjectives.join(" and ")}`;
      }
      subjectPhrase += ` ${actionPart}`;
    }
    if (organized.objects.length) {
      const object = organized.objects[0];
      subjectPhrase += ` with ${/[aeiou]/i.test(object[0] || "") ? "an" : "a"} ${object}`;
      if (organized.objects.length > 1) subjectPhrase += ` and ${organized.objects.slice(1).join(" and ")}`;
    }
    if (organized.acting.length) subjectPhrase += `, ${organized.acting.join(" and ")}`;
    parts.push(subjectPhrase);
  } else {
    const misc = [...organized.actions, ...organized.objects, ...organized.adjectives, ...organized.acting];
    if (misc.length) parts.push(misc.join(", "));
  }
  if (organized.backgrounds.length) parts.push(`in ${organized.backgrounds.join(" and ")}`);
  if (organized.lighting.length) parts.push(organized.lighting.join(", "));
  const prompt = parts.join(", ");
  return prompt ? prompt[0].toUpperCase() + prompt.slice(1) : "";
}

function scenarios() {
  const coherent = [
    { item: "35mm", category: "camera-focal", copyText: "35mm camera" },
    { item: "ARRI Alexa", category: "camera-models", copyText: "ARRI Alexa" },
    { item: "Dolly In", category: "camera", copyText: "Dolly In" },
    { item: "Medium Shot (MS)", category: "framing", copyText: "Medium Shot (MS)" },
    { item: "adult female", category: "subjects", copyText: "adult female" },
    { item: "walk", category: "action", copyText: "the subject walks" },
    { item: "elegantly", category: "adjectives", copyText: "elegantly" },
    { item: "umbrella", category: "objects", copyText: "umbrella" },
    { item: "look confident", category: "acting", copyText: "the subject looks confident" },
    { item: "city street", category: "backgrounds", copyText: "city street" },
    { item: "Golden Hour", category: "lighting", copyText: "Golden Hour" }
  ];
  const ignored = [
    { item: "Wes Anderson", category: "genre", copyText: "Perfectly symmetrical composition" },
    { item: "Adrian Ghenie", category: "artist", copyText: "in the style of Adrian Ghenie" },
    { item: "oil painting", category: "artstyle", copyText: "oil painting" },
    { item: "Claymation Film", category: "templates", copyText: "[DOUGHMOTION PROMPT EXPANDER]" }
  ];
  return {
    coherent: { deck: coherent, localOutput: composeLocal(coherent) },
    noSubject: {
      deck: [
        { item: "run", category: "action", copyText: "the subject runs" },
        { item: "violin", category: "objects", copyText: "violin" },
        { item: "nervously", category: "adjectives", copyText: "nervously" }
      ],
      localOutput: composeLocal([
        { item: "run", category: "action", copyText: "the subject runs" },
        { item: "violin", category: "objects", copyText: "violin" },
        { item: "nervously", category: "adjectives", copyText: "nervously" }
      ])
    },
    ignoredCategories: { deck: ignored, localOutput: composeLocal(ignored) }
  };
}

export async function prepareA12Fixtures({ legacyRoot = DEFAULT_LEGACY_ROOT, outputPath } = {}) {
  const source = await readFile(path.join(legacyRoot, SOURCE_PATH), "utf8");
  const data = extractLegacyData(source);
  const fixture = {
    schemaVersion: "1.0",
    status: "legacy-fixture-before-astra-review",
    source: { owner: "cinema-helper", path: SOURCE_PATH, sha256: sha256(source) },
    cinemaHelper: {
      title: "Prompt Deck Builder",
      catalogs: data,
      catalogCounts: Object.fromEntries(DATA_NAMES.map((name) => [name, Object.keys(data[name]).length])),
      categoryOrder: [
        "favorites", "framing", "camera", "subjects", "action", "acting", "objects",
        "adjectives", "artist", "artstyle", "backgrounds", "lighting", "templates"
      ],
      deckContract: {
        identity: ["item", "category"],
        storedEntry: ["item", "category", "copyText"],
        restoredEntryLimit: 80,
        liveEntryLimit: null,
        copySeparator: ", ",
        reorder: "native drag and drop",
        persistenceKey: "simplePromptBuilderDeckV2"
      },
      favoriteContract: {
        identity: ["item", "category"],
        storedEntry: ["item", "category"],
        persistenceKey: "cinemaPromptsFavorites"
      },
      localComposer: {
        recognizedCategories: [
          "camera-focal", "camera-models", "camera", "framing", "subjects", "action",
          "adjectives", "objects", "acting", "backgrounds", "lighting"
        ],
        silentlyIgnoredCategories: ["artist", "artstyle", "genre", "templates"],
        firstOnly: ["adjectives"],
        outputOrder: ["camera setup", "camera action", "subject phrase", "background", "lighting"]
      },
      aiVerbalizer: {
        endpoint: "/api/ai/refine",
        defaultModel: "gpt-5.6-terra",
        enabledUnlessExplicitlyFalse: true,
        optionCount: 1,
        transform: "Build exactly 1 cinematic prompt sentence from this deck. Preserve the selected ingredients, improve grammar and visual intent, avoid extra commentary."
      },
      bridgeTargets: ["apg", "cccp-b", "barz-dna-transformer", "seedance"],
      negativePrompts: {
        realistic: "ARTIFACTS, SLOW, UGLY, BLURRY, DEFORMED, MULTIPLE LIMBS, CARTOON, ANIME, PIXELATED, STATIC, FOG, FLAT, UNCLEAR, DISTORTED, ERROR, STILL, LOW RESOLUTION, OVERSATURATED, GRAIN, BLUR, MORPHING, WARPING",
        anim: "REALISTIC, PHOTOREALISTIC, LIVE ACTION, PHOTOGRAPH, HIGH DETAIL SKIN, SKIN PORES, FILM GRAIN, RAW PHOTO, CAMERA ARTIFACTS, LENS DISTORTION, CHROMATIC ABERRATION, MOTION BLUR, DEPTH OF FIELD, BOKEH, NATURAL LIGHTING"
      },
      scenarios: scenarios()
    }
  };
  await writeFile(outputPath, `${JSON.stringify(fixture, null, 2)}\n`, "utf8");
  return fixture;
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const fixture = await prepareA12Fixtures({
    legacyRoot: process.argv[2] || DEFAULT_LEGACY_ROOT,
    outputPath: path.join(here, "a12-legacy-fixtures.json")
  });
  console.log(JSON.stringify({
    catalogs: fixture.cinemaHelper.catalogCounts,
    totalEntries: Object.values(fixture.cinemaHelper.catalogCounts).reduce((sum, count) => sum + count, 0)
  }, null, 2));
}
