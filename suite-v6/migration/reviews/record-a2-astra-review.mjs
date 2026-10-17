// Records manual Astra A2 decisions, pinned to the exact reviewed source.
// This script serializes decisions; it does not perform semantic review.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { validateAstraReview } from "./validate-astra-review.mjs";

const readJson = async (url) => JSON.parse(await readFile(url, "utf8"));
const bundle = await readJson(new URL("../atlas-v5/semantic-review/astra-bundles/a2-cinematic-shoot.json", import.meta.url));
const digest = "d14c6c36f6ec7cf355af0fc2eae27a907a3f23ea298719e14b600f38af2c2041";
if (bundle.bundleDigest !== digest || bundle.items.length !== 162) throw new Error("A2 bundle changed; manual re-review required.");

const bodies = new Set([1,4,9,10,12,15,19,22,23,24,36,39,41,47,67,70,72,86,89,90,98,100,104,105,109,124,126,133,135,140,142,143,144,147,153,155,159,161]);
const fragments = new Set([26,29,32,44,50,57,68,71,78,88,125,134,141]);
const runtime = new Set([0,3,5,6,11,13,16,18,20,25,28,30,31,33,42,43,49,52,54,56,61,62,64,66,69,73,74,79,80,84,87,93,95,96,97,99,102,103,106,111,112,114,117,120,121,123,127,128,129,130,131,132,136,137,139,148,151,152,156,157,160]);
const ui = new Set([8,40,45,59,101,113]);
const metadata = new Set([2,7,14,17,21,27,35,37,38,46,48,51,53,55,60,63,65,75,76,77,81,82,83,85,91,92,94,107,108,110,115,116,118,119,138,145,146,149,150,154]);
const corrections = new Map([
  [34, { replacements: [["Other cuistots in background", "Other cooks in background"]], reason: "Remplace le mot français accidentel 'cuistots' dans cette recette anglaise par 'cooks', sans modifier le plan ni son action." }],
  [58, { replacements: [["in a reallocation", "in a real location"], ["intentionalnon-realistic", "intentional non-realistic"]], reason: "Rétablit deux espaces manquants dans la consigne figurine : lieu réel et proportions volontairement non réalistes. Aucun changement de style ou d'anatomie." }],
  [122, { replacements: [["Sudden spear trap trap", "Sudden spear trap"]], reason: "Supprime le doublon accidentel 'trap' dans le plan 7 ; le piège et le cadrage restent identiques." }],
  [158, { replacements: [["Preserve character farmhouse angles precisely", "Preserve the reference character's distinctive angles precisely"]], reason: "'Farmhouse' est incohérent dans la contrainte de fidélité du personnage. La correction renvoie à ses angles distinctifs d'origine, conformément aux autres recettes, sans inventer une nouvelle morphologie." }]
]);
const groups = [bodies, fragments, runtime, ui, metadata, new Set(corrections.keys())];
for (let i = 0; i < bundle.items.length; i++) {
  if (groups.filter((set) => set.has(i)).length !== 1) throw new Error(`Missing or overlapping A2 decision ${i}.`);
}
function applyCorrections(value, changes) {
  for (const [before, after] of changes) {
    if (value.split(before).length !== 2) throw new Error(`Correction anchor is not unique: ${before}`);
    value = value.replace(before, () => after);
  }
  return value;
}
const decisions = bundle.items.map((item, sourceIndex) => {
  const common = { id: item.id, sourceIndex };
  if (corrections.has(sourceIndex)) {
    const correction = corrections.get(sourceIndex);
    return { ...common, action: "correct", correctedValue: applyCorrections(item.value, correction.replacements), reason: correction.reason };
  }
  if (bodies.has(sourceIndex) || fragments.has(sourceIndex)) return {
    ...common, action: "preserve", role: bodies.has(sourceIndex) ? "prompt-body" : "compiler-fragment",
    ...(fragments.has(sourceIndex) ? { note: "Fragment à composer ; les corrections de logique de grille/substitution sont décrites séparément dans A2-ASTRA-HANDOFF.md." } : {})
  };
  if (runtime.has(sourceIndex)) return { ...common, action: "exclude-non-prompt", role: "runtime", reason: "Identifiant, clé DOM, classe CSS ou nom d'élément du code ; conserver sa fonction technique, sans l'envoyer comme texte créatif." };
  if (ui.has(sourceIndex)) return { ...common, action: "exclude-non-prompt", role: "ui-copy", reason: "Message, aide ou libellé d'interface ; conserver sa fonction d'interface hors prompt." };
  return { ...common, action: "exclude-non-prompt", role: "catalog-metadata", reason: "Titre de recette, conservé pour la navigation et pour le thème de l'itération. L'exclusion du corps de prompt ne supprime ni le titre ni la recette." };
});
const review = {
  schemaVersion: "1.0", bundleId: bundle.id, bundleDigest: digest,
  status: "reviewed", reviewerModel: "gpt-6-astra", reviewedAt: "2026-09-11",
  scope: "All 162 bundle values read in full, all 41 recipe bodies matched to fixtures, source compiler and 57 omitted source literals reviewed. Runtime integration remains pending.",
  decisions
};
const summary = validateAstraReview(bundle, review);

const fixtureRaw = await readFile(new URL("./a2-legacy-fixtures.json", import.meta.url), "utf8");
if (createHash("sha256").update(fixtureRaw).digest("hex") !== "70e6992c6808ab11da8a8ac915e2cfc868d30446506dc7351e27cd81470435c1") throw new Error("Reviewed A2 fixture changed.");
const fixture = JSON.parse(fixtureRaw);
const sourceHash = "f737729ea48bdd8681eb56514192e53c672726b64d4dd4de8568da3f0d18e2f2";
if (fixture.source.sha256 !== sourceHash) throw new Error("A2 fixture source changed.");
const batchRaw = await readFile(new URL("../atlas-v5/review-batches/11-01-d6a6731da9.json", import.meta.url), "utf8");
if (createHash("sha256").update(batchRaw).digest("hex") !== "85c440a5e4e7a38f2f623bd019a67adfbd0b480f99ce5a4683a93addc173d3eb") throw new Error("Reviewed A2 literal inventory changed.");
const batch = JSON.parse(batchRaw);
if (batch.literals.length !== 219 || batch.batch.sourcePath !== fixture.source.path) throw new Error("Unexpected A2 source inventory.");
const ids = new Set(bundle.items.map((item) => item.id));
const supplementalPromptIndices = new Set([163,169,216,217]);
const supplementalUiIndices = new Set([89,106,118,141,142,168,170,176,184,192,204]);
const omissions = batch.literals.flatMap((item, sourceIndex) => ids.has(item.id) ? [] : [{
  id: item.id, sourceIndex, originalValue: item.value, occurrences: item.occurrences,
  action: supplementalPromptIndices.has(sourceIndex) ? "preserve" : "exclude-non-prompt",
  role: supplementalPromptIndices.has(sourceIndex) ? "compiler-token" : supplementalUiIndices.has(sourceIndex) ? "ui-or-catalog-metadata" : "runtime",
  reason: supplementalPromptIndices.has(sourceIndex)
    ? "Jeton ou fragment de composition lu dans la source ; conserver et résoudre au stade approprié."
    : "Élément lu dans la source : aide, titre, événement, identifiant ou paramètre technique. Conserver son rôle ; il ne forme pas un corps de prompt."
}]);
if (omissions.length !== 57) throw new Error("A2 omitted literal set changed.");
const bodyCoverage = fixture.cinematicShoot.prompts.map((recipe) => {
  const index = bundle.items.findIndex((item) => item.value === recipe.prompt);
  if (index < 0 || !["preserve", "correct"].includes(decisions[index].action)) throw new Error(`Unreviewed recipe ${recipe.id}`);
  return { recipeId: recipe.id, family: recipe.family, bundleItemId: bundle.items[index].id, action: decisions[index].action };
});
if (bodyCoverage.length !== 41) throw new Error("Unexpected recipe count.");
const supplement = {
  schemaVersion: "1.0", reviewerModel: "gpt-6-astra", reviewedAt: "2026-09-11",
  fixtureSha256: createHash("sha256").update(fixtureRaw).digest("hex"),
  batchSha256: createHash("sha256").update(batchRaw).digest("hex"), source: fixture.source,
  scope: "Reconciliation of all 219 extracted literals in this source only; not approval of other owners sharing their IDs. Compiler behavior review is in the handoff.",
  bodyCoverage,
  metadataCorrections: [
    { recipeId: "cinematic-33", field: "title", originalValue: "3x3 JSON: Occult Ritual Ritual", correctedValue: "3x3 JSON: Occult Ritual", reason: "Supprime la répétition accidentelle du titre. Conserver l'ID, la famille et le corps." },
    { recipeId: "cinematic-40", field: "title", originalValue: "The Abyss Abysses", correctedValue: "The Abyss", reason: "Supprime le doublon singulier/pluriel du titre, sans modifier la scène abyssale." }
  ],
  decisions: omissions
};
await writeFile(new URL("./a2-astra.review.json", import.meta.url), JSON.stringify(review, null, 2) + "\n");
await writeFile(new URL("./a2-astra-supplement.review.json", import.meta.url), JSON.stringify(supplement, null, 2) + "\n");
await mkdir(new URL("../atlas-v5/semantic-review/astra-reviews/", import.meta.url), { recursive: true });
await writeFile(new URL("../atlas-v5/semantic-review/astra-reviews/a2-cinematic-shoot.review.json", import.meta.url), JSON.stringify(review, null, 2) + "\n");
console.log(JSON.stringify({ ...summary, coveredRecipes: bodyCoverage.length, supplementalDecisions: omissions.length, metadataCorrections: supplement.metadataCorrections.length }, null, 2));
