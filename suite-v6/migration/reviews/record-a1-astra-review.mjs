// Records Astra's manual A1 decisions; not an automatic semantic classifier.
// Index decisions are pinned to the exact bundle digest below.
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { validateAstraReview } from "./validate-astra-review.mjs";

const bundleUrl = new URL("../atlas-v5/semantic-review/astra-bundles/a1-realism-beauty.json", import.meta.url);
const bundle = JSON.parse(await readFile(bundleUrl, "utf8"));
const digest = "416f170f770ba9ece383a981a88625cee0b5670fdb99394af96b52d48f14addb";
if (bundle.bundleDigest !== digest || bundle.items.length !== 400) throw new Error("A1 source changed; manual re-review required.");

// Prompt bodies, output fragments, selectable subject values and compiler tokens.
const retained = new Set([
  2,6,9,12,17,18,19,21,23,25,26,27,30,31,32,35,36,40,42,45,46,47,51,52,53,54,55,58,59,
  63,64,65,66,68,69,70,79,82,85,86,88,91,92,94,96,98,103,106,107,108,110,118,120,123,124,127,130,132,133,
  146,147,148,155,156,157,161,172,174,178,179,180,183,185,187,188,190,192,194,195,198,199,203,205,210,211,212,214,215,216,217,218,219,222,223,227,228,229,230,232,240,241,242,247,248,250,251,254,255,256,259,261,268,270,272,
  280,282,283,288,289,291,292,295,297,305,309,310,315,316,317,320,321,324,326,329,331,334,335,336,340,341,342,343,346,351,352,353,354,357,358,359,360,363,364,365,366,367,369,371,377,380,384,386,387,389,390,393,395
]);
const runtime = new Set([0,1,5,7,10,11,28,33,34,48,61,105,119,128,154,162,173,226,237,246,278,290,355,356,362,388]);
const uiCopy = new Set([15,37,49,76,80,84,102,109,115,117,125,135,139,140,150,158,163,169,176,181,186,197,213,236,239,243,269,271,277,286,298,299,307,325,373]);
const corrected = new Map();
for (const index of [14,20,39,50]) {
  const before = "Ultra-realistic close-up of Editorial 3x3 photo grid";
  const original = bundle.items[index].value;
  if (!original.startsWith(before)) throw new Error("Unexpected editorial grid opening.");
  corrected.set(index, {
    correctedValue: original.replace(before, "Ultra-realistic editorial 3x3 photo grid"),
    reason: "Retire 'close-up of' devant la grille : le sujet attendu est une grille de neuf photos, dont un plan mi-corps, et non une photographie rapprochée de la grille. Les neuf cadrages restent inchangés."
  });
}
if (!bundle.items[56].value.includes("real skin stretches, compressions, and")) throw new Error("Unexpected Skin Realism grammar.");
corrected.set(56, {
  correctedValue: bundle.items[56].value.replace("real skin stretches, compressions, and", "real skin stretches, compresses, and"),
  reason: "Corrige uniquement le nom 'compressions' en verbe 'compresses' dans la coordination avec 'stretches' et 'shows'."
});
const groups = [retained, runtime, uiCopy, new Set(corrected.keys())];
for (const index of groups.flatMap(group => [...group])) {
  if (groups.filter(group => group.has(index)).length !== 1) throw new Error(`Overlapping decision ${index}.`);
}
const decisions = bundle.items.map((item, index) => {
  const common = { id: item.id, sourceIndex: index };
  if (corrected.has(index)) return { ...common, action: "correct", ...corrected.get(index) };
  if (retained.has(index)) return {
    ...common, action: "preserve",
    ...(index === 12 || index === 123 || index === 363 ? {
      role: "compiler-fragment",
      note: "Conserver dans la composition interne ; résoudre les variables avant envoi au fournisseur."
    } : {})
  };
  if (runtime.has(index)) return {
    ...common, action: "exclude-non-prompt", role: "runtime",
    reason: "Identifiant, clé d'état, classe CSS ou gabarit HTML utilisé par le code ; ne constitue pas un texte de prompt. Conserver son rôle si l'adaptateur en dépend."
  };
  if (uiCopy.has(index)) return {
    ...common, action: "exclude-non-prompt", role: "ui-copy",
    reason: "Texte de présentation, notification ou traduction de l'interface ; à conserver comme aide ou libellé, hors contenu envoyé au modèle."
  };
  return {
    ...common, action: "exclude-non-prompt", role: "catalog-metadata",
    reason: "Titre de carte, badge technique ou libellé de choix distinct de sa valeur de prompt dans la source. Conserver dans le catalogue et les contrôles ; ne pas supprimer la carte ni sa valeur associée."
  };
});
const review = {
  schemaVersion: "1.0", bundleId: bundle.id, bundleDigest: digest,
  status: "reviewed", reviewerModel: "gpt-6-astra", reviewedAt: "2026-09-11",
  scope: "All 400 bundled literals read in full, plus source compiler and fixture prompt fields; runtime migration and exhaustive corpus reconciliation remain pending.",
  decisions
};
const summary = validateAstraReview(bundle, review);

const fixtureUrl = new URL("./a1-legacy-fixtures.json", import.meta.url);
const fixtureRaw = await readFile(fixtureUrl, "utf8");
const fixture = JSON.parse(fixtureRaw);
const expectedSources = [
  "8c3017ec438451907ca7e26faf6d0f8b236e72fa2affa48246fa030a7975e0eb",
  "75700706709c344a69d97354e68f27592265208198b55ad7b11687f9ea6f70f2"
];
if (fixture.sources.some((s, i) => s.sha256 !== expectedSources[i])) throw new Error("Legacy fixture sources changed.");
const known = new Set(bundle.items.map(x => x.value));
const supplementalDecisions = [];
function record(value, location) {
  if (known.has(value)) return;
  supplementalDecisions.push({
    path: location, originalValue: value, action: "preserve",
    reason: "Valeur de prompt ou sortie dérivée lue dans la fixture A1 ; absente du paquet présélectionné."
  });
}
fixture.beauty.categories.forEach((cat, i) => cat.entries.forEach((entry, j) =>
  record(entry.text, `beauty.categories[${i}].entries[${j}].text`)));
for (const [key, entries] of Object.entries(fixture.realism.controls)) {
  entries.forEach((entry, i) => record(entry.v, `realism.controls.${key}[${i}].v`));
}
fixture.realism.sliders.forEach((slider, i) => slider.vals.forEach((entry, j) =>
  record(entry.t, `realism.sliders[${i}].vals[${j}].t`)));
fixture.realism.tabs.forEach((tab, i) => tab.cards.forEach((card, j) =>
  Object.entries(card.template).forEach(([key, value]) => record(value, `realism.tabs[${i}].cards[${j}].template.${key}`))));

await writeFile(new URL("./a1-astra.review.json", import.meta.url), JSON.stringify(review, null, 2) + "\n");
// The canonical copy above survives regeneration of semantic-review/.
await writeFile(new URL("../atlas-v5/semantic-review/astra-reviews/a1-realism-beauty.review.json", import.meta.url), JSON.stringify(review, null, 2) + "\n");
await writeFile(new URL("./a1-astra-supplement.review.json", import.meta.url), JSON.stringify({
  schemaVersion: "1.0", reviewerModel: "gpt-6-astra", reviewedAt: "2026-09-11",
  fixtureSha256: createHash("sha256").update(fixtureRaw).digest("hex"),
  sources: fixture.sources,
  scope: "Supplemental prompt fields absent from A1 bundle; not blanket approval of all fixture metadata or of the entire owner corpus.",
  decisions: supplementalDecisions
}, null, 2) + "\n");
console.log(JSON.stringify({ ...summary, supplementalDecisionCount: supplementalDecisions.length }, null, 2));
