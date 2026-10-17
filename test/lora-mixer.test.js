import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createGenerationPreview } from "../src/generation-plan.js";
import { falLoraCatalog } from "../src/providers/fal-lora.js";
import { kreaCatalog } from "../src/providers/krea.js";

test("fal LoRA catalogs accept compatible weight mixes and batches up to four", () => {
  for (const model of falLoraCatalog()) {
    const preview = createGenerationPreview({
      mediaType: "image",
      prompt: "cinematic portrait",
      negativePrompt: "",
      references: [],
      settings: {
        aspectRatio: "1:1",
        numImages: 4,
        loras: [
          { path: "https://fal.media/one.safetensors", scale: 0.7 },
          { path: "https://fal.media/two.safetensors", scale: 1.1 }
        ]
      }
    }, model);
    assert.equal(preview.canSubmit, true);
    assert.equal(preview.providerInput.num_images, 4);
    assert.deepEqual(preview.providerInput.loras, [
      { path: "https://fal.media/one.safetensors", scale: 0.7 },
      { path: "https://fal.media/two.safetensors", scale: 1.1 }
    ]);
  }
});

test("Krea batch count is quoted and passed to the local fan-out layer", () => {
  const model = kreaCatalog()[0];
  const preview = createGenerationPreview({
    mediaType: "image",
    prompt: "cinematic portrait",
    negativePrompt: "",
    references: [],
    settings: {
      aspectRatio: "1:1",
      numImages: 4,
      styles: [{ id: "style-one", strength: 0.8 }]
    }
  }, model);
  assert.equal(preview.providerInput.num_images, 4);
  assert.equal(preview.estimatedCost, 0.16);
});

test("LoRA mixer exposes compatibility, favorites, presets and LoRA Lab weights", async () => {
  const [html, app, server] = await Promise.all([
    readFile(new URL("../public/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/app.js", import.meta.url), "utf8"),
    readFile(new URL("../server.js", import.meta.url), "utf8")
  ]);
  assert.match(html, /id="kreaLoraCompatibilityFilter"/);
  assert.match(html, /id="kreaLoraFavoritesFilter"/);
  assert.match(html, /id="kreaLoraPresetSelect"/);
  assert.ok(
    html.indexOf('class="composer-actions"') < html.indexOf('id="kreaLoraMixer"'),
    "the Generate actions must stay above the LoRA mixer"
  );
  assert.match(app, /job\.artifacts\?\.weights\?\.url/);
  assert.match(app, /barz-lora-mix-presets-v1/);
  assert.match(server, /Solde API Krea insuffisant/);
  assert.match(server, /request_ids/);
});
