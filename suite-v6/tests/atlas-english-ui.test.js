import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const publicRoot = new URL("../apps/atlas/public/", import.meta.url);

async function source(name) {
  return readFile(new URL(name, publicRoot), "utf8");
}

test("the English overlay covers dynamic Prompt Atlas UI families", async () => {
  const preferences = await source("preferences.js");
  const expectedTranslations = [
    ["Mon Atlas", "My Atlas"],
    ["Prompt prêt", "Prompt ready"],
    ["Fond cyclo", "Cyclorama background"],
    ["Version relue Astra", "Astra-reviewed version"],
    ["Recompiler depuis les réglages", "Recompile from settings"],
    ["Direction d’action", "Action direction"],
    ["Références 1–9 · bac compact", "References 1–9 · compact tray"],
    ["DÉCOUPE PRO", "PRO SLICER"],
    ["Dérive de la main", "Hand drift"],
    ["Enregistrer comme preset", "Save as preset"]
  ];

  for (const [french, english] of expectedTranslations) {
    assert.ok(preferences.includes(JSON.stringify(french)), `missing French key: ${french}`);
    assert.ok(preferences.includes(JSON.stringify(english)), `missing English value: ${english}`);
  }

  assert.match(preferences, /découpes\? · \(\\d\+\) traits\?/);
  assert.match(preferences, /réglages\? actifs\?/);
  assert.match(preferences, /Setup « \(\.\+\) » chargé/);
});

test("global AI model intent labels follow the selected language", async () => {
  const controls = await source("global-ai-controls.js");
  assert.match(controls, /function modelIntentLabel/);
  assert.match(controls, /\["Puissant", "Powerful"\]/);
  assert.match(controls, /\["Equilibre", "Balanced"\]/);
  assert.match(controls, /\["Economique", "Economical"\]/);
  assert.match(controls, /\["Creatif", "Creative"\]/);
  assert.match(controls, /renderModels\(root\);/);
});

test("setup history dates use the active UI locale", async () => {
  const app = await source("app.js");
  assert.match(app, /dataset\.language === "fr" \? "fr-FR" : "en-US"/);
});
