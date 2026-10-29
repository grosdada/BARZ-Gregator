import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { compileModeBankPrompt, modeBankMatchesGroup } from "../apps/atlas/public/mode-bank.js";
import { DEFAULT_REGISTRY } from "../packages/registry/src/defaults.js";
import { defaultToolConfiguration, validateToolConfiguration } from "../packages/tool-adapters/src/index.js";

const corpus = JSON.parse(readFileSync(new URL("../apps/atlas/public/mode-bank-prompts.json", import.meta.url), "utf8"));

test("Mode Bank keeps all source prompts in Look Library without Photo DNA controls", () => {
  assert.equal(corpus.prompts.length, 1221);
  assert.deepEqual([...new Set(corpus.prompts.map(({ category }) => category))],
    ["exterior", "interior", "studio", "conceptual", "collage", "tvshow", "scifi"]);
  assert.equal(new Set(corpus.prompts.map(({ id }) => id)).size, 1221);
  assert.ok(DEFAULT_REGISTRY.placements.some(({ toolId, targetId }) => toolId === "mode-bank" && targetId === "image-looks"));
  assert.equal(DEFAULT_REGISTRY.tools.find(({ id }) => id === "mode-bank")?.title, "The Mode Bank");
  assert.equal(Object.keys(defaultToolConfiguration("mode-bank")).some((key) => /photo.?dna/i.test(key)), false);
});

test("Ref mode selects wardrobe source and Puppet Mode without changing the original prompt", () => {
  const entry = corpus.prompts.find(({ text }) => /wearing|wardrobe|outfit/i.test(text));
  const config = defaultToolConfiguration("mode-bank");
  assert.equal(compileModeBankPrompt(entry, config), entry.text);
  config.subjectMode = "ref";
  const referenceClothes = compileModeBankPrompt(entry, config);
  assert.match(referenceClothes, /@image1/);
  assert.match(referenceClothes, /Keep the exact clothing/);
  assert.doesNotMatch(referenceClothes, /PUPPET MODE:/);
  config.useWardrobePrompt = true;
  const promptClothes = compileModeBankPrompt(entry, config);
  assert.match(promptClothes, /Use the outfit, costume/);
  assert.doesNotMatch(promptClothes, /Keep the exact clothing/);
  config.puppetMode = true;
  assert.match(compileModeBankPrompt(entry, config), /Never humanize/);
  validateToolConfiguration("mode-bank", config);
});

test("Mode Bank group filter scopes random candidates to the selected family", () => {
  const exterior = corpus.prompts.filter(({ category }) => category === "exterior");
  const urban = exterior.filter((entry) => modeBankMatchesGroup(entry, "urban"));
  assert.ok(urban.length > 0 && urban.length < exterior.length);
  assert.equal(exterior.every((entry) => modeBankMatchesGroup(entry, "all")), true);
});
