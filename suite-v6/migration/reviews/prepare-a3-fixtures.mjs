import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_LEGACY_ROOT = "E:/Fable 5-Project/Meat Journey";
const ACTING_SOURCE = "Barzy App/public/assets/HTML/acting_gen.html";
const DANCE_SOURCE = "Barzy App/public/assets/HTML/drunk_dance_prompts_tabs.html";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function between(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end <= start) throw new Error(`Legacy ${label} markers were not found.`);
  return source.slice(start, end);
}

function decodeHtml(value) {
  const named = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: '"' };
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] !== "#") return named[entity.toLowerCase()] ?? match;
    const radix = entity[1]?.toLowerCase() === "x" ? 16 : 10;
    const digits = radix === 16 ? entity.slice(2) : entity.slice(1);
    return String.fromCodePoint(Number.parseInt(digits, radix));
  });
}

function plainHtml(value) {
  return decodeHtml(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function actingFixture(source) {
  const data = between(source, "const prompts = {", "let currentMainTab", "Acting Gen data");
  const context = vm.createContext(Object.create(null), {
    codeGeneration: { strings: false, wasm: false }
  });
  vm.runInContext(data, context, { timeout: 1_000 });
  const groups = JSON.parse(vm.runInContext(
    "JSON.stringify(Object.entries(prompts).flatMap(([section,categories]) => Object.entries(categories).map(([category,entries]) => ({section,category,entries}))))",
    context,
    { timeout: 1_000 }
  ));
  return {
    groups,
    entryCount: groups.reduce((sum, group) => sum + group.entries.length, 0)
  };
}

function danceFixture(source) {
  const starts = [...source.matchAll(/<div\s+class="category(?:\s+[^"]+)?"\s+id="([^"]+)"[^>]*>/gi)];
  const categories = starts.map((match, index) => {
    const block = source.slice(match.index, starts[index + 1]?.index ?? source.indexOf("<script", match.index));
    const title = plainHtml(block.match(/class="category-title"[^>]*>([\s\S]*?)<\//i)?.[1] ?? match[1]);
    const description = plainHtml(block.match(/class="category-desc"[^>]*>([\s\S]*?)<\//i)?.[1] ?? "");
    const entries = [...block.matchAll(/<div\s+class="prompt-box"[^>]*>([\s\S]*?)<button\s+class="copy-btn"/gi)].map((entry, entryIndex) => ({
      order: entryIndex + 1,
      title: plainHtml(entry[1].match(/class="prompt-title"[^>]*>([\s\S]*?)<\//i)?.[1] ?? "Untitled"),
      text: plainHtml(entry[1].match(/class="prompt-text"[^>]*>([\s\S]*?)<\//i)?.[1] ?? "")
    }));
    return { id: match[1], title, description, entries };
  });
  if (categories.some(({ entries }) => entries.some(({ text }) => !text))) {
    throw new Error("A dance prompt could not be extracted with its text.");
  }
  return {
    categories,
    entryCount: categories.reduce((sum, category) => sum + category.entries.length, 0)
  };
}

export async function prepareA3Fixtures({ legacyRoot = DEFAULT_LEGACY_ROOT, outputPath } = {}) {
  const [actingSource, danceSource] = await Promise.all([
    readFile(path.join(legacyRoot, ACTING_SOURCE), "utf8"),
    readFile(path.join(legacyRoot, DANCE_SOURCE), "utf8")
  ]);
  const acting = actingFixture(actingSource);
  const dance = danceFixture(danceSource);
  const fixture = {
    schemaVersion: "1.0",
    status: "legacy-fixture-before-astra-review",
    sources: [
      { owner: "acting-gen", role: "acting-core", path: ACTING_SOURCE, sha256: sha256(actingSource) },
      { owner: "acting-gen", role: "dance-library", path: DANCE_SOURCE, sha256: sha256(danceSource) }
    ],
    acting: {
      groupCount: acting.groups.length,
      ...acting
    },
    dance: {
      categoryCount: dance.categories.length,
      ...dance
    },
    totalEntryCount: acting.entryCount + dance.entryCount
  };
  await writeFile(outputPath, `${JSON.stringify(fixture, null, 2)}\n`, "utf8");
  return fixture;
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const fixture = await prepareA3Fixtures({
    legacyRoot: process.argv[2] || DEFAULT_LEGACY_ROOT,
    outputPath: path.join(here, "a3-legacy-fixtures.json")
  });
  console.log(JSON.stringify({
    actingGroups: fixture.acting.groupCount,
    actingEntries: fixture.acting.entryCount,
    danceCategories: fixture.dance.categoryCount,
    danceEntries: fixture.dance.entryCount,
    totalEntries: fixture.totalEntryCount
  }, null, 2));
}
