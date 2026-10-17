import test from "node:test";
import assert from "node:assert/strict";

import {
  KreaClient,
  isFluxKreaStyle,
  isKrea2Style,
  kreaCatalog,
  resultFromKrea,
  statusFromKrea
} from "../src/providers/krea.js";
import { createGenerationPreview } from "../src/generation-plan.js";
import { normalizePromptAtlasImport } from "../src/prompt-import.js";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

test("Krea style import paginates, deduplicates and always excludes Krea2", async () => {
  const calls = [];
  const client = new KreaClient(async (url) => {
    calls.push(String(url));
    const parsed = new URL(url);
    const filter = parsed.searchParams.get("filter");
    const cursor = parsed.searchParams.get("cursor");
    if (filter === "user" && !cursor) return jsonResponse({ items: [
      { id: "flux-a", title: "Portrait", models: ["flux_dev"] },
      { id: "krea2-a", title: "Nope", models: ["krea_2_large"] }
    ], next_cursor: "page-2" });
    if (filter === "user") return jsonResponse({ items: [
      { id: "k1-flux", title: "Legacy hybrid", models: ["k1", "flux_dev"] }
    ], next_cursor: null });
    return jsonResponse({ items: [
      { id: "flux-a", title: "Portrait duplicate", models: ["flux_dev"] },
      { id: "z-a", title: "Z style", models: ["z_image"] }
    ], next_cursor: null });
  });
  const styles = await client.listStyles("secret-key");
  assert.equal(calls.length, 3);
  assert.deepEqual(styles.map((style) => style.id).sort(), ["flux-a", "k1-flux", "z-a"]);
  assert.equal(isFluxKreaStyle(styles.find((style) => style.id === "k1-flux")), true);
  assert.equal(isKrea2Style({ models: ["krea-2-large"] }), true);
});

test("Krea generation preview sends several LoRAs with individual weights", () => {
  const model = kreaCatalog()[0];
  const preview = createGenerationPreview({
    mediaType: "image",
    prompt: "cinematic portrait",
    negativePrompt: "",
    references: [],
    settings: {
      aspectRatio: "16:9",
      styles: [{ id: "one", strength: 0.65 }, { id: "two", strength: 1.2 }]
    }
  }, model);
  assert.equal(preview.canSubmit, true);
  assert.deepEqual(preview.providerInput.styles, [
    { id: "one", strength: 0.65 },
    { id: "two", strength: 1.2 }
  ]);
  assert.equal(preview.providerInput.width, 1344);
  assert.equal(preview.providerInput.height, 768);
});

test("Krea LoRAs survive the HTTP import normalization used by preview and submit", () => {
  const imported = normalizePromptAtlasImport({
    schemaVersion: "1.0",
    source: { app: "prompt-atlas", version: "test", module: "Préparation locale" },
    mediaType: "image",
    prompt: "cinematic portrait",
    target: { provider: "krea", endpointId: "image/bfl/flux-1-dev" },
    settings: {
      aspectRatio: "1:1",
      steps: 25,
      guidanceScale: 3,
      styles: [{ id: "style-one", strength: 0.8 }]
    },
    references: []
  });
  const preview = createGenerationPreview(imported, kreaCatalog()[0]);
  assert.deepEqual(preview.providerInput.styles, [{ id: "style-one", strength: 0.8 }]);
  assert.equal(preview.providerInput.steps, 25);
  assert.equal(preview.providerInput.guidance_scale, 3);
  assert.equal(preview.canSubmit, true);
});

test("Krea LoRA mode refuses to quote an empty style mix", () => {
  const preview = createGenerationPreview({
    mediaType: "image",
    prompt: "cinematic portrait",
    negativePrompt: "",
    references: [],
    settings: { aspectRatio: "1:1", styles: [] }
  }, kreaCatalog()[0]);
  assert.equal(preview.canSubmit, false);
  assert.match(preview.validationErrors.join(" "), /LoRA Krea/);
});

test("Krea Flux accepts one image reference and maps it to image_url", () => {
  const model = kreaCatalog()[0];
  const preview = createGenerationPreview({
    mediaType: "image",
    prompt: "cinematic portrait",
    negativePrompt: "",
    references: [{
      id: "resource:4f38314a-cc2b-4b5d-b99f-b1ec80aa476d",
      kind: "image",
      label: "portrait.png",
      url: "/api/resources/4f38314a-cc2b-4b5d-b99f-b1ec80aa476d/content"
    }],
    settings: { aspectRatio: "16:9", styles: [{ id: "one", strength: 0.8 }] }
  }, model);
  assert.equal(preview.canSubmit, true);
  assert.equal(preview.providerInput.image_url,
    "/api/resources/4f38314a-cc2b-4b5d-b99f-b1ec80aa476d/content");
  assert.deepEqual(preview.providerInput.styles, [{ id: "one", strength: 0.8 }]);
});

test("Krea uploads local references as assets without forcing a JSON content type", async () => {
  let request;
  const client = new KreaClient(async (url, options) => {
    request = { url: String(url), options };
    return jsonResponse({ image_url: "https://app-uploads.krea.ai/reference.png" });
  });
  const imageUrl = await client.uploadAsset("secret-key", {
    data: Buffer.from("image"), contentType: "image/png", name: "reference.png"
  });
  assert.equal(imageUrl, "https://app-uploads.krea.ai/reference.png");
  assert.equal(request.url, "https://api.krea.ai/assets");
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.body instanceof FormData, true);
  assert.equal(request.options.headers["Content-Type"], undefined);
});

test("Krea HTTP errors keep their status and precise message", async () => {
  const client = new KreaClient(async () => jsonResponse({ detail: "Insufficient API balance" }, 402));
  await assert.rejects(
    () => client.submit("secret-key", "image/bfl/flux-1-dev", { prompt: "portrait" }),
    (error) => error.remoteStatus === 402 && error.message === "Insufficient API balance"
  );
});

test("Krea status and result normalization", () => {
  assert.equal(statusFromKrea({ status: "backlogged" }), "queued");
  assert.equal(statusFromKrea({ status: "sampling" }), "running");
  assert.equal(statusFromKrea({ status: "completed" }), "completed");
  assert.equal(statusFromKrea({ status: "cancelled" }), "cancelled");
  assert.deepEqual(resultFromKrea({ result: { urls: ["https://gen.krea.ai/result.webp"] } }), {
    images: [{ url: "https://gen.krea.ai/result.webp", content_type: "image/webp" }]
  });
});
