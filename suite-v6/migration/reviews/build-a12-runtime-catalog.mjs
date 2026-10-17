import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(here, "a12-legacy-fixtures.json");
const reviewPath = path.join(here, "a12-astra-supplement.review.json");
const outputPath = path.join(here, "../../packages/tool-adapters/src/cinema-helper-catalog.json");

const definitions = [
  ["framingShots", "framing", "Framing", "label"],
  ["cameraMovements", "camera", "Camera movement", "label"],
  ["focalLengths", "camera-focal", "Focal length", "value"],
  ["cameraModels", "camera-models", "Camera model", "label"],
  ["lightingArtificial", "lighting", "Artificial light", "label"],
  ["lightingNatural", "lighting", "Natural light", "label"],
  ["actions", "action", "Action", "value"],
  ["acting", "acting", "Acting", "value"],
  ["adjectives", "adjectives", "Adjective", "value"],
  ["subjectsPeople", "subjects", "People", "label"],
  ["subjectsAnimals", "subjects", "Animals", "label"],
  ["subjectsObjects", "objects", "Objects", "label"],
  ["backgroundsIndoor", "backgrounds", "Indoor", "label"],
  ["backgroundsOutdoor", "backgrounds", "Outdoor", "label"],
  ["backgroundsNature", "backgrounds", "Nature", "label"],
  ["genrePresets", "genre", "Genre presets", "value"],
  ["videoTemplates", "templates", "Video templates", "template"],
  ["artists", "artist", "Artists", "artist"],
  ["artStyles", "artstyle", "Art styles", "label"]
];

function corrected(value, overlay) {
  return typeof value === "string" && overlay.has(value) ? overlay.get(value) : value;
}

export async function buildA12RuntimeCatalog() {
  const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
  const review = JSON.parse(await readFile(reviewPath, "utf8"));
  const source = fixture.cinemaHelper;
  const overlay = new Map(review.correctionOverlay.map(({ originalValue, correctedValue }) => [originalValue, correctedValue]));
  const groups = [];
  const items = [];

  for (const [catalogId, category, title, copyMode] of definitions) {
    const entries = Object.entries(source.catalogs[catalogId]);
    groups.push({ id: catalogId, category, title, count: entries.length });
    entries.forEach(([rawLabel, rawValue], index) => {
      const label = corrected(rawLabel, overlay);
      let copyText;
      let description = "";
      let artistGenre = "";
      let thumbnail = null;
      let example = "";
      if (copyMode === "value") copyText = corrected(rawValue, overlay);
      else if (copyMode === "template") {
        copyText = corrected(rawValue.full, overlay);
        description = corrected(rawValue.description ?? "", overlay);
        example = corrected(source.catalogs.templateExamples[rawLabel] ?? "", overlay);
      } else if (copyMode === "artist") {
        copyText = `in the style of ${label}`;
        artistGenre = corrected(rawValue.genre ?? "", overlay);
        thumbnail = rawValue.img || null;
      } else {
        copyText = label;
        description = corrected(rawValue, overlay);
      }
      items.push({
        id: `cinema-${catalogId}-${String(index + 1).padStart(4, "0")}`,
        catalogId,
        category,
        label,
        copyText,
        description,
        ...(artistGenre ? { artistGenre } : {}),
        ...(thumbnail ? { thumbnail } : {}),
        ...(example ? { example } : {})
      });
    });
  }

  const output = {
    schemaVersion: "1.0",
    sourceSha256: fixture.source.sha256,
    reviewDigest: review.bundleDigest,
    title: "Cinema Helper",
    sourceEntryCount: Object.values(source.catalogCounts).reduce((sum, count) => sum + count, 0),
    selectableEntryCount: items.length,
    deckLimit: 80,
    categories: [
      { id: "favorites", title: "Favorites", accepts: ["favorites"] },
      { id: "framing", title: "Framing", accepts: ["framing"] },
      { id: "camera", title: "Camera", accepts: ["camera", "camera-focal", "camera-models"] },
      { id: "subjects", title: "Subject", accepts: ["subjects"] },
      { id: "action", title: "Action", accepts: ["action"] },
      { id: "acting", title: "Acting", accepts: ["acting"] },
      { id: "objects", title: "Object", accepts: ["objects"] },
      { id: "adjectives", title: "Adjectives", accepts: ["adjectives"] },
      { id: "artist", title: "Artist", accepts: ["artist"] },
      { id: "artstyle", title: "Art style", accepts: ["artstyle"] },
      { id: "backgrounds", title: "Background", accepts: ["backgrounds"] },
      { id: "lighting", title: "Light", accepts: ["lighting"] },
      { id: "templates", title: "Templates & genres", accepts: ["templates", "genre"] }
    ],
    groups,
    items,
    negativePrompts: source.negativePrompts,
    aiAvailable: false
  };
  await writeFile(outputPath, `${JSON.stringify(output)}\n`, "utf8");
  return output;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const output = await buildA12RuntimeCatalog();
  console.log(JSON.stringify({ sourceEntries: output.sourceEntryCount, selectableEntries: output.selectableEntryCount }, null, 2));
}
