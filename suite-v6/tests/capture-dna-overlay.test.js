import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  BUILTIN_CAPTURE_PRESETS,
  CAPTURE_DNA_CATALOG,
  appendCaptureDna,
  buildCaptureDnaSuffix,
  captureDnaOption,
  createCaptureDnaPreset,
  removeCaptureDna
} from "../installer/aggregator-overlays/capture-dna-catalog.js";

test("Capture DNA retains the original 5.2 inventory and adds a lens bank", () => {
  assert.ok(CAPTURE_DNA_CATALOG.cameras.length >= 49);
  assert.ok(CAPTURE_DNA_CATALOG.films.length >= 30);
  assert.ok(CAPTURE_DNA_CATALOG.lighting.length >= 43);
  assert.ok(CAPTURE_DNA_CATALOG.lenses.length >= 20);
  assert.ok(captureDnaOption("camera", "camera-betacam-sp-eng"));
  assert.ok(captureDnaOption("lens", "lens-b4-eng-servo-zoom"));
});

test("every BARZ preset resolves to a complete valid capture chain", () => {
  assert.ok(BUILTIN_CAPTURE_PRESETS.length >= 32);
  for (const preset of BUILTIN_CAPTURE_PRESETS) {
    assert.ok(captureDnaOption("camera", preset.camera), `${preset.label}: camera`);
    assert.ok(captureDnaOption("lens", preset.lens), `${preset.label}: lens`);
    assert.ok(captureDnaOption("film", preset.film), `${preset.label}: film`);
    assert.ok(captureDnaOption("lighting", preset.lighting), `${preset.label}: lighting`);
    assert.match(buildCaptureDnaSuffix(preset), /^Capture DNA — Camera:/);
  }
  const ina = BUILTIN_CAPTURE_PRESETS.find((item) => item.id === "preset-ina-1987");
  assert.match(buildCaptureDnaSuffix(ina), /French INA television documentary, 1987/);
  assert.match(buildCaptureDnaSuffix(ina), /PAL 625-line/);
});

test("adding Capture DNA replaces a previous final DNA block instead of duplicating it", () => {
  const first = BUILTIN_CAPTURE_PRESETS[0];
  const second = BUILTIN_CAPTURE_PRESETS[1];
  const prompt = appendCaptureDna("A quiet interview in a municipal hallway.", first);
  const replaced = appendCaptureDna(prompt, second);
  assert.equal((replaced.match(/Capture DNA —/g) || []).length, 1);
  assert.doesNotMatch(replaced, /1986 home video/);
  assert.match(replaced, /French INA television documentary, 1987/);
  assert.match(replaced, /^A quiet interview/m);
});

test("resetting Capture DNA removes its final block while preserving the prompt", async () => {
  const prompt = appendCaptureDna("Portrait dans un studio photo.", BUILTIN_CAPTURE_PRESETS[0]);
  assert.equal(removeCaptureDna(prompt), "Portrait dans un studio photo.");
  const ui = await readFile(new URL("../installer/aggregator-overlays/capture-dna-ui.js", import.meta.url), "utf8");
  assert.match(ui, /promptInput\.value = removeCaptureDna\(promptInput\.value\)/);
  assert.match(ui, /Capture DNA retiré du prompt/);
});

test("personal presets keep the current optical chain and validate their name", () => {
  const saved = createCaptureDnaPreset({
    id: "custom-test",
    name: "Mon reportage",
    selection: BUILTIN_CAPTURE_PRESETS[1]
  });
  assert.equal(saved.label, "Mon reportage");
  assert.equal(saved.custom, true);
  assert.equal(saved.lens, "lens-b4-eng-servo-zoom");
  assert.throws(() => createCaptureDnaPreset({ name: "", selection: saved }), /nom/);
});

test("the active Capture DNA chain is injected automatically into generation requests", async () => {
  const ui = await readFile(new URL("../installer/aggregator-overlays/capture-dna-ui.js", import.meta.url), "utf8");
  const aggregator = await readFile(new URL("../../public/app.js", import.meta.url), "utf8");
  assert.match(ui, /window\.barzCaptureDnaPrompt/);
  assert.match(ui, /Actif pour la génération/);
  assert.match(aggregator, /prompt: generationPrompt\(\)/);
});
