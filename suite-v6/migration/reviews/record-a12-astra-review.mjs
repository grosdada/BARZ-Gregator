// Astra A12 review record. This file records decisions; it is not a runtime adapter.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { validateAstraReview } from "./validate-astra-review.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
async function pinned(relative, digest) {
  const bytes = await readFile(new URL(relative, import.meta.url));
  assert.equal(sha256(bytes), digest, `${relative} changed; repeat the semantic review.`);
  return JSON.parse(bytes);
}

const fixtureDigest = "d721be6d54fad72fdd11b0efad06a9d56d1709cc0ecc5a15e6c476d0f749b9e5";
const corpusDigest = "bd15fa2df1b2effbf833d1ac484e9306b76e6f9945e372d2697ce86ebf79a126";
const bundle = await pinned(
  "../atlas-v5/semantic-review/astra-bundles/a12-cinema-helper.json",
  "c81b80f8880c567419142b0bf8ad7761c0acca44e39ad7e21777772d489ce35b"
);
const fixture = await pinned("./a12-legacy-fixtures.json", fixtureDigest);
const corpus = await pinned("../atlas-v5/prompt-literals.json", corpusDigest);
assert.equal(bundle.bundleDigest, "97a5424c52cec6f7cb93f5dd99884be1e9b8d698ae6f08e1dbf1aeccc8a2a13c");
assert.equal(bundle.items.length, 1032);
const source = await readFile(`E:/Fable 5-Project/Meat Journey/${fixture.source.path}`, "utf8");
assert.equal(sha256(source), fixture.source.sha256);

const data = fixture.cinemaHelper.catalogs;
const promptValues = new Set();
function addObject(name, { keys = true, values = true } = {}) {
  for (const [key, value] of Object.entries(data[name])) {
    if (keys) promptValues.add(key);
    if (values && typeof value === "string" && value) promptValues.add(value);
  }
}
for (const name of [
  "framingShots", "cameraMovements", "focalLengths", "cameraModels",
  "lightingArtificial", "lightingNatural", "actions", "acting", "adjectives",
  "subjectsPeople", "subjectsAnimals", "subjectsObjects", "backgroundsIndoor",
  "backgroundsOutdoor", "backgroundsNature"
]) addObject(name);
addObject("genrePresets", { keys: false, values: true });
for (const template of Object.values(data.videoTemplates)) promptValues.add(template.full);
for (const name of Object.keys(data.artists)) promptValues.add(name);
for (const name of Object.keys(data.artStyles)) promptValues.add(name);
for (const example of Object.values(data.templateExamples)) promptValues.add(example);
for (const value of Object.values(fixture.cinemaHelper.negativePrompts)) promptValues.add(value);

const corrections = new Map([
  ["trompe l oeil art", {
    correctedValue: "trompe-l'oeil art",
    reason: "Rétablir l'apostrophe et les traits d'union du terme consacré."
  }],
  ["sahel archecture", {
    correctedValue: "sahel architecture",
    reason: "Corriger la faute de frappe dans architecture."
  }],
  ["daguerrotype", {
    correctedValue: "daguerreotype",
    reason: "Corriger l'orthographe anglaise du procédé photographique."
  }],
  ["Building a giant piggy bank shaped sand castle in a beach, natural colors, tele lens, shot in 35mm, dawn soft light", {
    correctedValue: "Building a giant piggy-bank-shaped sandcastle on a beach, natural colors, telephoto lens, shot on 35mm film, soft dawn light",
    reason: "Corriger les prépositions et les composés anglais sans changer la scène."
  }],
  ["An animated time-lapse of growing agar art inside a petri dish, macro lens, showcasing intricate microbial and fungi colonies forming a detailed moving animated moving blooming flower. The agar highlights the textures and patterns of the microorganisms. evolving artwork. blooming fungi flower", {
    correctedValue: "An animated time-lapse of agar art growing inside a petri dish, captured with a macro lens. Intricate microbial and fungal colonies form a blooming flower, highlighting the evolving textures and patterns of the microorganisms.",
    reason: "Supprimer les répétitions cassées et réparer les fragments de phrase de l'exemple."
  }],
  ["An animated time-lapse of growing agar art inside a petri dish, macro lens, showcasing intricate microbial and fungi colonies forming a detailed moving animated bacteria.", {
    correctedValue: "An animated time-lapse of agar art growing inside a petri dish, captured with a macro lens, showcasing intricate microbial and fungal colonies forming detailed animated bacteria.",
    reason: "Réparer la grammaire et le doublon de mouvement sans changer le sujet."
  }],
  ["the subject looks lovingly", {
    correctedValue: "the subject looks loving",
    reason: "Employer l'adjectif décrivant l'expression plutôt qu'un adverbe sans complément."
  }],
  ["Obese guy surfing a tube in teahupo'o wave dusk light cinematic shot shot in 35mm film", {
    correctedValue: "Obese guy surfing a tube in a Teahupo'o wave, dusk light, cinematic shot on 35mm film",
    reason: "Supprimer le mot dupliqué et réparer les prépositions de l'exemple."
  }],
  ["High-angle static shot of a chaotic massive, huge, incredibly high arch of plus size men and women and pool floats, precariously stacked in a huge indoor swimming pool. The people's bodies are positioned upright, sideways, diagonally, and tilted at improbable angles. The image has a photorealistic 35mm film look and realistic shadows, saturated colors emphasizing the precarious nature of the structure. The vastness of the pool where the arch of people and pool floats is accentuates the absurdity and surreal nature of the image.", {
    correctedValue: "High-angle static shot of a chaotic, massive, incredibly high arch of plus-size men and women and pool floats, precariously stacked in a huge indoor swimming pool. The people's bodies are positioned upright, sideways, diagonally, and tilted at improbable angles. The image has a photorealistic 35mm film look and realistic shadows, with saturated colors emphasizing the precarious nature of the structure. The vastness of the pool around the arch of people and pool floats accentuates the absurdity and surreal nature of the image.",
    reason: "Réparer l'accord, les composés et la proposition finale cassée."
  }],
  ["3D LIDAR scanner of a forest, the scanned forest is surounded by a deep black void, wireframe particle dot scanner", {
    correctedValue: "3D LIDAR scan of a forest; the scanned forest is surrounded by a deep black void, rendered as a wireframe point cloud",
    reason: "Corriger surrounded et clarifier les deux fragments techniques sans changer l'intention."
  }],
  ["A wide-angle shot of a laundry room with a standard top-load washing machine with no frontal door stands centered in the room. The white machine with no window starts alone and closed, Suddenly, bang!, the top lid blasts open with explosive force, and a vertical burst of clean laundry fires into the air like a firework. T-shirts, pants, socks, and underwear shoot upward in tight arcs. As they fall, they begin to sort mid-air—each type of clothing grouping itself: socks land together in a neat pile, pants stack onto pants, shirts collect in a row, and underwear drop cleanly into ordered and folded piles. Items hit with speed but settle precisely, forming clear, categorized piles. The motion is fast, elastic, and deliberate. The camera pulls back, revealing a pristine, organized laundry station. At the center, the washer top lip remains opens, at it's base, piles of perfectly neat and ordered clothes.", {
    correctedValue: "A wide-angle shot of a laundry room centers a standard top-load washing machine with no front door. The white machine starts alone and closed. Suddenly, bang! The top lid blasts open with explosive force, and a vertical burst of clean laundry fires into the air like a firework. T-shirts, pants, socks, and underwear shoot upward in tight arcs. As they fall, they begin to sort mid-air—each type of clothing grouping itself: socks land together in a neat pile, pants stack onto pants, shirts collect in a row, and underwear drop cleanly into ordered and folded piles. Items hit with speed but settle precisely, forming clear, categorized piles. The motion is fast, elastic, and deliberate. The camera pulls back, revealing a pristine, organized laundry station. At the center, the washer's top lid remains open; at its base are piles of perfectly neat and ordered clothes.",
    reason: "Réparer les propositions initiale et finale, la ponctuation et its sans modifier l'action."
  }]
]);

for (const original of corrections.keys()) {
  assert.ok(bundle.items.some((item) => item.value === original), `Missing correction source: ${original}`);
}

const decisions = bundle.items.map((item, index) => {
  const base = {
    id: item.id,
    sourceIndex: index + 1,
    originalValue: item.value,
    occurrences: item.occurrences
  };
  if (corrections.has(item.value)) return { ...base, action: "correct", ...corrections.get(item.value) };
  if (promptValues.has(item.value)) return { ...base, action: "preserve" };
  return {
    ...base,
    action: "exclude-non-prompt",
    reason: "Libellé, clé, sélecteur, message d'état ou fragment d'implémentation ; conserver comme métadonnée/provenance sans l'insérer automatiquement dans le prompt."
  };
});

const review = {
  schemaVersion: "1.0",
  bundleId: bundle.id,
  bundleDigest: bundle.bundleDigest,
  status: "reviewed",
  reviewerModel: "gpt-6-astra",
  reviewedAt: "2026-09-24",
  decisions
};
const summary = validateAstraReview(bundle, review);

const bundleIds = new Set(bundle.items.map(({ id }) => id));
const extras = corpus.literals
  .filter((item) => !bundleIds.has(item.id)
    && item.occurrences.some(({ sourcePath }) => sourcePath === fixture.source.path))
  .sort((left, right) => left.id.localeCompare(right.id));
assert.equal(extras.length, 2760);
const extraDecisions = extras.map((item, index) => ({
  id: item.id,
  sourceIndex: index + 1,
  originalValue: item.value,
  occurrences: item.occurrences.filter(({ sourcePath }) => sourcePath === fixture.source.path),
  ...(promptValues.has(item.value)
    ? { action: "preserve" }
    : {
        action: "exclude-non-prompt",
        reason: "HTML, CSS, copie d'interface ou infrastructure ; conserver hors du texte envoyé."
      })
}));

const corrected = (value) => corrections.get(value)?.correctedValue ?? value;
const architecture = {
  owner: "cinema-helper",
  suggestedWorkshop: "prompt-forge",
  runtimePortStatus: "pending-sol",
  displayTitle: "Cinema Helper",
  catalog: "20 catalogues, stable IDs, original order, correction overlay only; artist thumbnails optional with offline fallback.",
  deck: "Ordered setup-local entries {item, category, copyText}; identity is item+category; one visible limit applied both on restore and live add; drag order persists.",
  directCopy: "Lossless ordered copyText joined with comma+space. This is the deterministic source of truth.",
  localComposer: "Keep the legacy sentence composer for its eleven recognized categories. If artist, artstyle, genre, template or any future category is selected, fall back to the lossless ordered copy instead of dropping ingredients.",
  templates: "Template and genre display names are metadata. Their full values are copied once. Never prepend the display name unless the user explicitly edits the final.",
  aiVerbalizer: "Explicit user action only. Preserve ordered ingredients, at most one in-flight request per setup, reject stale/empty results, and retain the local prompt on error. Missing AI configuration means disabled, not implicit request.",
  aiRendering: "Render returned text with textContent; no innerHTML adoption. Do not persist provider secrets in setups.",
  favorites: "Persist item, category and resolved copyText or stable catalog ID so restored favorites never depend on a mutable display lookup.",
  random: "Random selection is explicit only, never on load/reset; report skipped/full categories and preserve deck order.",
  bridge: "Canonical destination is BZ Aggregator and creates a draft only. Show historical internal targets only when a matching V6 workshop exists. Never trigger generation.",
  persistence: "Deck, favorites, custom order and final text are setup-local and survive duplicate/version/export/restore. Reset defaults preserves named personal setups.",
  accessibility: "Keyboard-operable add/remove/reorder, visible focus, aria-pressed state, searchable categories and non-color status cues.",
  build: "Movable/renamable bank with stable tool and item IDs. Deck and Backstage remain fixed."
};

const ignoredDeck = fixture.cinemaHelper.scenarios.ignoredCategories.deck;
const supplement = {
  schemaVersion: "1.0",
  status: "reviewed",
  reviewerModel: "gpt-6-astra",
  reviewedAt: "2026-09-24",
  bundleDigest: bundle.bundleDigest,
  fixtureDigest,
  corpusDigest,
  source: fixture.source,
  decisions: extraDecisions,
  sourceCoverage: {
    bundleValues: bundle.items.length,
    complementaryValues: extras.length,
    totalSourceValues: bundle.items.length + extras.length,
    scope: "Every extracted value occurring in the Cinema Helper source; BZ Image DNA excluded upstream."
  },
  correctionOverlay: [...corrections].map(([originalValue, value]) => ({ originalValue, ...value })),
  approvedExpectedOutputs: {
    legacyLocal: fixture.cinemaHelper.scenarios,
    losslessFallbackForIgnoredCategories: ignoredDeck.map(({ copyText }) => corrected(copyText)).join(", "),
    negativePrompts: fixture.cinemaHelper.negativePrompts
  },
  architecture
};

for (const [relative, value] of [
  ["./a12-astra.review.json", review],
  ["../atlas-v5/semantic-review/astra-reviews/a12-cinema-helper.review.json", review],
  ["./a12-astra-supplement.review.json", supplement]
]) {
  await writeFile(new URL(relative, import.meta.url), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

console.log(JSON.stringify({
  ...summary,
  complementary: extras.length,
  complementaryPreserved: extraDecisions.filter(({ action }) => action === "preserve").length,
  corrections: corrections.size,
  catalogEntries: Object.values(fixture.cinemaHelper.catalogCounts).reduce((sum, count) => sum + count, 0)
}, null, 2));
