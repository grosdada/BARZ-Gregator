// Serializes the manual Astra review; never classifies new or changed source text.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { validateAstraReview } from "./validate-astra-review.mjs";

const digest = "9b8bf45b1e390374d9568a3d2b87bbf638434c6a7212105f0ae54145bd9e1121";
const sha256 = (raw) => createHash("sha256").update(raw).digest("hex");
async function pinnedJson(relative, hash) {
  const raw = await readFile(new URL(relative, import.meta.url));
  if (sha256(raw) !== hash) throw new Error(`Reviewed source changed: ${relative}`);
  return JSON.parse(raw.toString("utf8"));
}
const bundle = JSON.parse(await readFile(new URL("../atlas-v5/semantic-review/astra-bundles/a3-acting-gen.json", import.meta.url), "utf8"));
if (bundle.bundleDigest !== digest || bundle.items.length !== 509) throw new Error("A3 changed; manual re-review required.");
const fixtureHash = "9e8172fab2340c4f6d0ee05db5c450bf931d61d91c859c2de0be22470d72785d";
const fixture = await pinnedJson("./a3-legacy-fixtures.json", fixtureHash);
const batchSpecs = [
  { path: "../atlas-v5/review-batches/05-01-09415c6e56.json", hash: "132292bb6be3db5bc9ffb13f838bcbced3dc0935aa7fdaab2078101c7f0ac81e", count: 393, omitted: 46 },
  { path: "../atlas-v5/review-batches/12-01-5526e1f81a.json", hash: "e88b57e62972b72a50ba2cc4b676f0e28b8fc3732eee9cd0558247a24cadad55", count: 341, omitted: 179 }
];
const batches = await Promise.all(batchSpecs.map(({ path, hash }) => pinnedJson(path, hash)));
const runtime = new Set([3,146,196,222,283,347,353,374,483,488]);
const ui = new Set([16,24,141,269,348,379,493]);
const metadata = new Set([1,6,17,19,21,38,42,45,46,56,57,61,63,65,92,96,97,103,123,124,127,135,159,164,179,182,190,195,198,200,248,255,276,279,295,304,314,325,335,336,338,341,344,356,367,380,389,421,461,490,494,502,508]);
const fragments = new Set([153,211,355,467]);
const corrections = new Map([
  [290, { before: "unescapable", after: "inescapable", reason: "Corrige le mot final de RECURSIVE LOOP ; la répétition impossible à interrompre reste intentionnelle." }],
  [422, { before: "motion blur taken literal", after: "motion blur taken literally", reason: "Rétablit l'adverbe dans DUPLICATION ARTIFACT sans changer les doubles, fantômes ou effets de mouvement." }]
]);
const groups = [
  ...fixture.acting.groups.map((group) => ({ ...group, categoryId: `${group.section}-${group.category}` })),
  ...fixture.dance.categories.map((group) => ({ ...group, section: "dance", category: group.id, categoryId: `dance-${group.id}` }))
];
const entries = groups.flatMap((group) => group.entries.map((entry, index) => ({
  section: group.section, categoryId: group.categoryId, order: index + 1,
  suggestedEntryId: `acting-${group.categoryId}-${String(index + 1).padStart(3, "0")}`,
  title: entry.title, text: entry.text
})));
if (groups.length !== 34 || entries.length !== 435) throw new Error("Unexpected A3 fixture coverage.");
const bodies = new Set(entries.map((entry) => {
  const matches = bundle.items.flatMap((item, index) => item.value === entry.text ? [index] : []);
  if (matches.length !== 1) throw new Error(`Body mapping is not unique: ${entry.title}`);
  return matches[0];
}));
if (bodies.size !== 435) throw new Error("Expected 435 distinct reviewed bodies.");
for (let index = 0; index < bundle.items.length; index++) {
  if ([runtime, ui, metadata, fragments, bodies].filter((set) => set.has(index)).length !== 1) throw new Error(`Missing or overlapping decision ${index}`);
}
for (const index of corrections.keys()) if (!bodies.has(index)) throw new Error("Correction outside reviewed bodies.");
const decisions = bundle.items.map((item, sourceIndex) => {
  const common = { id: item.id, sourceIndex };
  if (corrections.has(sourceIndex)) {
    const { before, after, reason } = corrections.get(sourceIndex);
    if (item.value.split(before).length !== 2) throw new Error(`Non-unique correction anchor: ${before}`);
    return { ...common, action: "correct", role: "prompt-body", correctedValue: item.value.replace(before, () => after), reason };
  }
  if (bodies.has(sourceIndex) || fragments.has(sourceIndex)) return {
    ...common, action: "preserve", role: bodies.has(sourceIndex) ? "prompt-body" : "iteration-fragment"
  };
  return {
    ...common, action: "exclude-non-prompt",
    role: runtime.has(sourceIndex) ? "runtime" : ui.has(sourceIndex) ? "ui-copy" : "catalog-metadata",
    reason: "Identifiant technique, libellé ou métadonnée lu intégralement. Conserver son rôle hors corps de prompt ; cette décision ne supprime ni titre, ni catégorie, ni fonctionnalité."
  };
});
const review = {
  schemaVersion: "1.0", bundleId: bundle.id, bundleDigest: digest,
  status: "reviewed", reviewerModel: "gpt-6-astra", reviewedAt: "2026-09-11",
  scope: "All 509 bundle values read in full, all 435 titled fixture bodies and their grouping reviewed, source runtime and 225 omitted literals reviewed. A3 only; runtime integration pending.",
  decisions
};
const summary = validateAstraReview(bundle, review);
const ids = new Set(bundle.items.map(({ id }) => id));
const coreOmitted = new Set([1,2,81,82,88,101,104,108,114,117,122,127,129,134,136,142,148,167,171,186,188,193,196,198,199,203,216,219,232,234,235,238,242,246,251,252,254,255,257,263,268,270,272,276,289,293]);
const coreUi = new Set([81,82,88,104,117,129,136,188,193,196,199,252,255,257,263,268,272,276]);
const coreTemplates = new Set([1,2,219]);
const danceRuntime = new Set([161,262,337]);
const danceUi = new Set([162,164,165,166,167,168,169,194,218,228,230,259,287,300,322]);
const danceTitles = new Set(fixture.dance.categories.flatMap((group) => group.entries.map(({ title }) => title)));
const supplementalDecisions = batches.flatMap((batch, batchIndex) => {
  const spec = batchSpecs[batchIndex];
  if (batch.literals.length !== spec.count || batch.batch.sourcePath !== fixture.sources[batchIndex].path) throw new Error("Unexpected literal inventory.");
  const omissions = batch.literals.flatMap((item, sourceIndex) => {
    if (ids.has(item.id)) return [];
    const expected = batchIndex === 0 ? coreOmitted.has(sourceIndex) : sourceIndex >= 161 && sourceIndex <= 340 && sourceIndex !== 163;
    if (!expected) throw new Error(`Unexpected omitted literal ${batchIndex}:${sourceIndex}`);
    let role;
    if (batchIndex === 0) role = coreUi.has(sourceIndex) ? "ui-copy" : coreTemplates.has(sourceIndex) ? "ui-template" : "runtime";
    else if (danceRuntime.has(sourceIndex)) role = "runtime";
    else if (danceUi.has(sourceIndex)) role = "ui-copy";
    else {
      if (sourceIndex !== 340 && !danceTitles.has(item.value)) throw new Error(`Unmapped dance title ${sourceIndex}`);
      role = "catalog-metadata";
    }
    return [{ id: item.id, sourcePath: batch.batch.sourcePath, sourceIndex, originalValue: item.value,
      occurrences: item.occurrences, action: "exclude-non-prompt", role,
      reason: "Littéral complémentaire lu : interface, titre, catégorie ou code. À conserver dans son rôle, sans le concaténer au prompt vidéo." }];
  });
  if (omissions.length !== spec.omitted) throw new Error("Omitted literal coverage changed.");
  return omissions;
});
const bodyCoverage = entries.map(({ text, ...entry }) => {
  const index = bundle.items.findIndex((item) => item.value === text);
  return { ...entry, bundleItemId: bundle.items[index].id, sourceIndex: index, action: decisions[index].action };
});
const supplement = {
  schemaVersion: "1.0", status: "reviewed", reviewerModel: "gpt-6-astra", reviewedAt: "2026-09-11",
  scope: "All 734 extracted literals across these two pinned A3 sources reconciled; no approval of another owner sharing an ID. Runtime decisions are in A3-ASTRA-HANDOFF.md.",
  fixtureSha256: fixtureHash, sources: fixture.sources,
  inventories: batchSpecs.map((spec) => ({ path: spec.path, sha256: spec.hash, literalCount: spec.count, omittedCount: spec.omitted })),
  groups: groups.map(({ entries: groupEntries, ...group }) => ({ ...group, entryCount: groupEntries.length })),
  bodyCoverage, metadataCorrections: [], decisions: supplementalDecisions
};
const serialize = (value) => JSON.stringify(value, null, 2) + "\n";
await writeFile(new URL("./a3-astra.review.json", import.meta.url), serialize(review));
await writeFile(new URL("./a3-astra-supplement.review.json", import.meta.url), serialize(supplement));
await mkdir(new URL("../atlas-v5/semantic-review/astra-reviews/", import.meta.url), { recursive: true });
await writeFile(new URL("../atlas-v5/semantic-review/astra-reviews/a3-acting-gen.review.json", import.meta.url), serialize(review));
console.log(JSON.stringify({ ...summary, coveredBodies: bodyCoverage.length, groups: groups.length, supplementalDecisions: supplementalDecisions.length }, null, 2));
