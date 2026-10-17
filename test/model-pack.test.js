import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createGenerationPreview, deriveModelControls, deriveFalResolutionPrices } from "../src/generation-plan.js";
import { normalizePromptAtlasImport } from "../src/prompt-import.js";
import { createPreparedJob, refreshedEstimate } from "../src/job-state.js";
import { stageReferenceImages } from "../src/reference-upload.js";
import { FalClient } from "../src/providers/fal.js";
import { isDisplayMedia } from "../public/media-result.js";

const builtinCatalog = JSON.parse(readFileSync(
  new URL("../data/catalog.seed.json", import.meta.url),
  "utf8"
));

const image = (index = 1) => ({ kind: "image", id: `resource:${index}`,
  url: `/api/resources/11111111-1111-4111-8111-${String(index).padStart(12, "0")}/content` });
const audio = (index = 1) => ({ kind: "audio", id: `resource:audio-${index}`,
  url: `/api/resources/22222222-2222-4222-8222-${String(index).padStart(12, "0")}/content` });
const video = (index = 1) => ({ kind: "video", id: `resource:video-${index}`,
  url: `/api/resources/33333333-3333-4333-8333-${String(index).padStart(12, "0")}/content` });
function model(endpointId, properties, required = ["prompt"], pricing = { unitPrice: 0.0112, unit: "1000 tokens", currency: "USD" }) {
  return { provider: "fal", endpointId, verifiedAt: "2026-09-10", mediaType: "video", pricing,
    inputSchema: { paths: { "/": { post: { requestBody: { content: { "application/json": { schema: {
      properties: { prompt: { type: "string" }, ...properties }, required
    } } } } } } } } };
}
const h3 = model("minimax/h3/reference-to-video", {
  duration: { type: "integer", minimum: 5, maximum: 15, default: 5 },
  resolution: { type: "string", enum: ["480P", "768P", "2K", "4K"], default: "2K" },
  aspect_ratio: { type: "string", enum: ["adaptive", "16:9", "9:16", "1:1"] },
  seed: { type: "integer" },
  prompt_expansion_mode: { type: "string", default: "balanced", examples: ["fast", "balanced", "quality"] },
  enable_safety_checker: { type: "boolean", default: true },
  reference_image_urls: { type: "array", maxItems: 9, items: { type: "string" } }
}, ["prompt", "reference_image_urls"], { unitPrice: 0.05, unit: "seconds", currency: "USD" });
const draft = { mediaType: "video", prompt: "Animate @image1 then @image2", references: [image(1), image(2)],
  settings: { aspectRatio: "16:9", resolution: "768P", durationSeconds: 5,
    promptExpansionMode: "quality" } };

test("MiniMax H3 preserves reference order and maps reference tokens and controls", () => {
  const preview = createGenerationPreview(draft, h3);
  assert.equal(preview.canSubmit, true);
  assert.deepEqual(preview.providerInput.reference_image_urls, draft.references.map((item) => item.url));
  assert.equal(preview.providerInput.prompt, "Animate Image 1 then Image 2");
  assert.equal(preview.generationDraft.prompt, draft.prompt);
  assert.equal(preview.providerInput.duration, 5);
  assert.equal(preview.providerInput.prompt_expansion_mode, "quality");
  assert.equal(preview.providerInput.enable_safety_checker, true);
  assert.equal(preview.estimatedCost, 0.25);
  const controls = deriveModelControls(h3.inputSchema, h3.endpointId);
  assert.deepEqual(controls.extras.find((item) => item.key === "promptExpansionMode").values,
    ["fast", "balanced", "quality"]);
});

test("MiniMax H3 accepts audio beside a visual reference and refuses audio alone", () => {
  const m = model("minimax/h3/reference-to-video", {
    duration: { type: "integer", minimum: 5, maximum: 15, default: 5 },
    reference_image_urls: { type: "array", maxItems: 9, items: { type: "string" } },
    reference_audio_urls: { type: "array", maxItems: 3, items: { type: "string" } }
  }, ["prompt"], { unitPrice: 0.05, unit: "seconds", currency: "USD" });
  const withAudio = createGenerationPreview({
    mediaType: "video",
    prompt: "Let @image1 perform to @audio1",
    references: [image(), audio()],
    settings: { durationSeconds: 5 }
  }, m);
  assert.equal(withAudio.canSubmit, true);
  assert.deepEqual(withAudio.providerInput.reference_image_urls, [image().url]);
  assert.deepEqual(withAudio.providerInput.reference_audio_urls, [audio().url]);
  assert.equal(withAudio.providerInput.prompt, "Let Image 1 perform to Audio 1");

  const audioOnly = createGenerationPreview({
    mediaType: "video", prompt: "Animate to @audio1", references: [audio()], settings: { durationSeconds: 5 }
  }, m);
  assert.equal(audioOnly.canSubmit, false);
  assert.match(audioOnly.validationErrors.join(" "), /accompagnée d’au moins une image ou une vidéo/);
});

test("Seedance 2.5 token pricing unlocks confirmed generation", () => {
  const pricing = {
    unitPrice: 0.02568,
    unit: "1000 tokens",
    currency: "USD",
    tiersByResolution: deriveFalResolutionPrices(
      "bytedance/seedance-2.5/us/text-to-video",
      0.02568
    )
  };
  const seedance = model("bytedance/seedance-2.5/us/text-to-video", {
    duration: { type: "string", enum: ["4", "5", "15", "30"], default: "5" },
    resolution: {
      type: "string",
      enum: ["480p", "720p", "1080p"],
      default: "720p"
    },
    aspect_ratio: {
      type: "string",
      enum: ["16:9", "9:16", "1:1"],
      default: "16:9"
    },
    generate_audio: { type: "boolean", default: true }
  }, ["prompt"], pricing);
  const preview = createGenerationPreview({
    mediaType: "video",
    prompt: "A girl smiling",
    references: [],
    settings: {
      aspectRatio: "16:9",
      resolution: "720p",
      durationSeconds: 15,
      generateAudio: true
    }
  }, seedance);
  assert.equal(preview.estimatedCost, 8.32032);
  assert.equal(preview.canSubmit, true);
  assert.match(preview.warnings.join(" "), /dimensions réelles/);
  assert.deepEqual(pricing.tiersByResolution, {
    "480p": 0.02568,
    "720p": 0.02568,
    "1080p": 0.02808
  });
});

test("Motion Transfer maps one driving video, one character image, and provider options", () => {
  const m = model("fal-ai/kling-video/v3/pro/motion-control", {
    image_url: { type: "string" },
    video_url: { type: "string" },
    character_orientation: { type: "string", enum: ["video", "image"] },
    keep_original_sound: { type: "boolean", default: true }
  }, ["image_url", "video_url", "character_orientation"], {
    unitPrice: 0.112,
    unit: "seconds",
    currency: "USD"
  });
  const preview = createGenerationPreview({
    mediaType: "video",
    prompt: "Keep the face stable while following @video1 with @image1",
    references: [video(), image()],
    settings: { characterOrientation: "video", keepOriginalSound: false, durationSeconds: 6 }
  }, m);
  assert.equal(preview.canSubmit, true);
  assert.equal(preview.providerInput.video_url, video().url);
  assert.equal(preview.providerInput.image_url, image().url);
  assert.equal(preview.providerInput.character_orientation, "video");
  assert.equal(preview.providerInput.keep_original_sound, false);
  assert.deepEqual(deriveModelControls(m.inputSchema, m.endpointId).referenceKinds, ["image", "video"]);
});

test("reference limits, missing references, and invalid settings block submission instead of silently dropping inputs", () => {
  assert.equal(createGenerationPreview({ ...draft, references: Array.from({ length: 10 }, (_, i) => image(i + 1)) }, h3).canSubmit, false);
  assert.equal(createGenerationPreview({ ...draft, references: [] }, h3).canSubmit, false);
  assert.equal(createGenerationPreview({ ...draft, settings: { ...draft.settings, durationSeconds: 20 } }, h3).canSubmit, false);
  assert.equal(createGenerationPreview({ ...draft, settings: { ...draft.settings, resolution: "1080P" } }, h3).canSubmit, false);
  assert.equal(createGenerationPreview({ ...draft, references: [{ ...image(), missing: true }] }, h3).canSubmit, false);
});

test("MiniMax H3 image-to-video maps the second reference to the optional final frame", () => {
  const m = model("minimax/h3/image-to-video", {
    ...h3.inputSchema.paths["/"].post.requestBody.content["application/json"].schema.properties,
    image_url: { type: "string" }, end_image_url: { type: "string" }
  }, ["prompt", "image_url"], { unitPrice: 0.05, unit: "seconds", currency: "USD" });
  delete m.inputSchema.paths["/"].post.requestBody.content["application/json"].schema.properties.reference_image_urls;
  const preview = createGenerationPreview(draft, m);
  assert.equal(preview.providerInput.image_url, image(1).url);
  assert.equal(preview.providerInput.end_image_url, image(2).url);
  assert.equal(preview.canSubmit, true);
});

test("MiniMax H3 Max maps ordered references without inventing schema fields and applies resolution pricing", () => {
  const m = model("minimax/h3-max/reference-to-video", {
    duration: { type: "integer", minimum: 5, maximum: 15, default: 5 },
    resolution: { type: "string", enum: ["480P", "768P", "1080P"], default: "768P" },
    aspect_ratio: { type: "string", enum: ["adaptive", "16:9", "9:16", "1:1"] },
    seed: { type: "integer" },
    prompt_expansion_mode: { type: "string", enum: ["balanced", "quality"], default: "balanced" },
    reference_image_urls: { type: "array", maxItems: 9, items: { type: "string" } }
  }, ["prompt", "reference_image_urls"], {
    unitPrice: 0.05,
    unit: "seconds",
    currency: "USD",
    tiersByResolution: deriveFalResolutionPrices("minimax/h3-max/reference-to-video", 0.05)
  });
  const preview = createGenerationPreview(draft, m);
  assert.equal(preview.providerInput.prompt, "Animate Image 1 then Image 2");
  assert.deepEqual(preview.providerInput.reference_image_urls, draft.references.map((item) => item.url));
  assert.equal("enable_safety_checker" in preview.providerInput, false);
  assert.equal(preview.pricing.unitPrice, 0.08);
  assert.equal(preview.estimatedCost, 0.4);
  assert.match(preview.warnings.join(" "), /4 096 tokens/);
  assert.equal(preview.canSubmit, true);
});

test("MiniMax H3 Max image mode requires a starting image even when fal marks it optional", () => {
  const m = model("minimax/h3-max/image-to-video", {
    duration: { type: "integer", minimum: 5, maximum: 15, default: 5 },
    resolution: { type: "string", enum: ["480P", "768P", "1080P"], default: "768P" },
    image_url: { type: "string" },
    end_image_url: { type: "string" }
  }, ["prompt"], { unitPrice: 0.0125, unit: "seconds", currency: "USD",
    tiersByResolution: deriveFalResolutionPrices("minimax/h3-max/image-to-video", 0.0125) });
  assert.equal(deriveModelControls(m.inputSchema, m.endpointId).minReferences, 1);
  assert.equal(createGenerationPreview({ ...draft, references: [] }, m).canSubmit, false);
  assert.equal(createGenerationPreview({ ...draft, references: [image()] }, m).estimatedCost, 0.1);
});

test("Nano Banana prices resolution and batch count, and refresh recomputes the same confirmed inputs", () => {
  const m = { ...model("fal-ai/nano-banana-2/edit", {
    image_urls: { type: "array" }, resolution: { type: "string", enum: ["0.5K", "1K", "2K", "4K"], default: "1K" },
    num_images: { type: "integer", minimum: 1, maximum: 4, default: 1 }
  }, ["prompt"], { unitPrice: 0.08, unit: "images", currency: "USD" }), mediaType: "image" };
  const preview = createGenerationPreview({ ...draft, mediaType: "image", settings: { resolution: "4K", numImages: 3 } }, m);
  assert.equal(preview.estimatedCost, 0.48);
  const job = createPreparedJob(preview, "test");
  assert.equal(refreshedEstimate(job, m), 0.48);
  assert.equal(refreshedEstimate(job, { ...m, pricing: { ...m.pricing, unitPrice: 0.1 } }), 0.6);
  assert.equal(createGenerationPreview({ ...draft, mediaType: "image", settings: { numImages: -1 } }, m).canSubmit, false);
});

test("original Nano Banana uses its flat live price and supports batches", () => {
  const m = { ...model("fal-ai/nano-banana", {
    aspect_ratio: { type: "string", enum: ["16:9", "1:1"], default: "1:1" },
    output_format: { type: "string", enum: ["jpeg", "png", "webp"], default: "png" },
    num_images: { type: "integer", minimum: 1, maximum: 4, default: 1 }
  }, ["prompt"], { unitPrice: 0.0398, unit: "images", currency: "USD" }), mediaType: "image" };
  const preview = createGenerationPreview({
    mediaType: "image",
    prompt: "A graphic novel panel",
    references: [],
    settings: { aspectRatio: "16:9", outputFormat: "webp", numImages: 2 }
  }, m);
  assert.equal(preview.canSubmit, true);
  assert.equal(preview.providerInput.output_format, "webp");
  assert.equal(preview.estimatedCost, 0.0796);
});

test("Nano Banana Pro doubles 4K pricing and preserves ordered edit references", () => {
  const m = { ...model("fal-ai/nano-banana-pro/edit", {
    image_urls: { type: "array" },
    aspect_ratio: { type: "string", enum: ["auto", "16:9", "1:1"], default: "auto" },
    resolution: { type: "string", enum: ["1K", "2K", "4K"], default: "1K" },
    num_images: { type: "integer", minimum: 1, maximum: 4, default: 1 }
  }, ["prompt", "image_urls"], {
    unitPrice: 0.15,
    unit: "images",
    currency: "USD"
  }), mediaType: "image" };
  const preview = createGenerationPreview({
    mediaType: "image",
    prompt: "Keep @image1 and use the palette from @image2",
    references: [image(1), image(2)],
    settings: { aspectRatio: "16:9", resolution: "4K", numImages: 2 }
  }, m);
  assert.equal(preview.canSubmit, true);
  assert.deepEqual(preview.providerInput.image_urls, [image(1).url, image(2).url]);
  assert.equal(preview.estimatedCost, 0.6);
});

test("Z-Image Turbo exposes 2K sizes and prices text and image modes per megapixel", () => {
  const shared = {
    image_size: {
      anyOf: [{ $ref: "#/components/schemas/ImageSize" }, {
        type: "string",
        enum: ["square_hd", "landscape_16_9"]
      }],
      default: "landscape_16_9"
    },
    num_images: { type: "integer", minimum: 1, maximum: 4, default: 1 },
    output_format: { type: "string", enum: ["jpeg", "png", "webp"], default: "png" },
    seed: { type: "integer" }
  };
  const pricing = { unitPrice: 0.005, unit: "megapixels", currency: "USD" };
  const textModel = {
    ...model("fal-ai/z-image/turbo", shared, ["prompt"], pricing),
    mediaType: "image"
  };
  const controls = deriveModelControls(textModel.inputSchema, textModel.endpointId);
  assert.ok(controls.imageSizes.some((item) => (
    item.value === "custom_2048x1152" && item.aspectRatio === "16:9"
  )));
  assert.equal(controls.seed, true);

  const textPreview = createGenerationPreview({
    mediaType: "image",
    prompt: "A precise architectural miniature",
    references: [],
    settings: { aspectRatio: "16:9", imageSize: "custom_2048x1152", numImages: 2 }
  }, textModel);
  assert.deepEqual(textPreview.providerInput.image_size, { width: 2048, height: 1152 });
  assert.equal(textPreview.estimatedCost, 0.023593);
  assert.equal(textPreview.canSubmit, true);

  const imageModel = {
    ...model("fal-ai/z-image/turbo/image-to-image", {
      ...shared,
      image_url: { type: "string" },
      strength: { type: "number", minimum: 0, maximum: 1, default: 0.6 }
    }, ["prompt", "image_url"], pricing),
    mediaType: "image"
  };
  const imagePreview = createGenerationPreview({
    mediaType: "image",
    prompt: "Preserve the composition and change the lighting",
    references: [image()],
    settings: { aspectRatio: "16:9", strength: 0.35 }
  }, imageModel);
  assert.equal(imagePreview.providerInput.image_url, image().url);
  assert.equal(imagePreview.providerInput.strength, 0.35);
  assert.equal(imagePreview.canSubmit, true);
});

test("Ideogram quality and batch multipliers apply without prompt expansion", () => {
  const m = { ...model("ideogram/v4/fast", {
    image_size: { anyOf: [{ $ref: "#/components/schemas/ImageSize" }, { enum: ["square_hd"] }] },
    rendering_speed: { type: "string", enum: ["TURBO", "BALANCED", "QUALITY"], default: "BALANCED" },
    expansion_model: { type: "string", enum: ["None", "Medium"], default: "Medium" },
    num_images: { type: "integer", default: 1, minimum: 1, maximum: 4 }
  }, ["prompt"], { unitPrice: 0.007, unit: "units", currency: "USD" }), mediaType: "image" };
  const p = createGenerationPreview({ mediaType: "image", prompt: "An editorial poster", references: [],
    settings: { aspectRatio: "1:1", imageSize: "square_hd", renderingSpeed: "QUALITY", numImages: 2 } }, m);
  assert.equal(p.estimatedCost, 0.035);
  assert.equal(p.providerInput.expansion_model, "None");
  assert.equal(p.displayName, "Ideogram 4 Fast · Texte → image");
  assert.equal(p.canSubmit, true);
});

test("FLUX Draft cache is not treated as a generated image or video", () => {
  assert.equal(isDisplayMedia({ url: "https://v3.fal.media/output.mp4", content_type: "video/mp4" }), true);
  assert.equal(isDisplayMedia({ url: "https://v3.fal.media/draft_cache.bin", content_type: "application/octet-stream" }), false);
  assert.equal(isDisplayMedia({ url: "https://v3.fal.media/photo.jpg" }), true);
});

test("Seedream custom presets obey its minimum pixel count and stay within 4096px", () => {
  const controls = deriveModelControls({}, "bytedance/seedream/v5/lite/text-to-image");
  assert.equal(controls.imageSizes.length, 15);
  for (const size of controls.imageSizes) {
    assert.ok(size.width * size.height >= 3_686_400);
    assert.ok(size.width <= 4096 && size.height <= 4096);
  }
});

test("FLUX displayed per-second pricing follows changes in the live billing base", () => {
  assert.equal(deriveFalResolutionPrices("blackforestlabs/flux-3/text-to-video/draft", 0.03)["720p"], 0.06);
  assert.equal(deriveFalResolutionPrices("blackforestlabs/flux-3/text-to-video/draft", 0.06)["720p"], 0.12);
  assert.equal(deriveFalResolutionPrices("blackforestlabs/flux-3/image-to-video", 0.085)["1080p"], 0.29);
  assert.equal(deriveFalResolutionPrices("blackforestlabs/flux-3/image-to-video", 0.17)["1080p"], 0.58);
});

test("MiniMax H3 Max resolution tiers follow the live 480P base price", () => {
  assert.deepEqual(deriveFalResolutionPrices("minimax/h3-max/text-to-video", 0.0125), {
    "480P": 0.0125,
    "768P": 0.02,
    "1080P": 0.04
  });
  assert.deepEqual(deriveFalResolutionPrices("minimax/h3-max/text-to-video", 0.05), {
    "480P": 0.05,
    "768P": 0.08,
    "1080P": 0.16
  });
});

test("new settings survive draft normalization, including false audio and zero strength/seed", () => {
  const normalized = normalizePromptAtlasImport({ schemaVersion: "1.0", source: { app: "prompt-atlas" },
    mediaType: "image", prompt: "Reference portrait", settings: { numImages: 2, generateAudio: false,
      strength: 0, seed: 0, renderingSpeed: "QUALITY", outputFormat: "png", bitrateMode: "high",
      promptExpansionMode: true, quality: "high", background: "transparent",
      outputCompression: 70, limitGenerations: false, thinkingLevel: "minimal",
      systemPrompt: "Keep the layout." } });
  assert.equal(normalized.settings.generateAudio, false);
  assert.equal(normalized.settings.strength, 0);
  assert.equal(normalized.settings.seed, "0");
  assert.equal(normalized.settings.numImages, 2);
  assert.equal(normalized.settings.promptExpansionMode, true);
  assert.equal(normalized.settings.quality, "high");
  assert.equal(normalized.settings.background, "transparent");
  assert.equal(normalized.settings.outputCompression, 70);
  assert.equal(normalized.settings.limitGenerations, false);
  assert.equal(normalized.settings.thinkingLevel, "minimal");
  assert.equal(normalized.settings.systemPrompt, "Keep the layout.");
});

test("the verified image expansion pack ships every real fal endpoint", () => {
  const endpointIds = new Set(builtinCatalog.map((item) => item.endpointId));
  for (const endpointId of [
    "fal-ai/flux-2-pro", "fal-ai/flux-2-pro/edit",
    "bytedance/seedream/v5/lite/edit",
    "bytedance/seedream/v5/pro/text-to-image", "bytedance/seedream/v5/pro/edit",
    "alibaba/qwen-image-3/text-to-image", "alibaba/qwen-image-3/edit",
    "fal-ai/wan/v2.7/text-to-image", "fal-ai/wan/v2.7/pro/text-to-image",
    "google/nano-banana-2-lite",
    "xai/grok-imagine-image/v2.0/text-to-image", "xai/grok-imagine-image/v2.0/edit",
    "openai/gpt-image-2", "openai/gpt-image-2/edit",
    "openai/gpt-image-2.5/flare/text-to-image", "openai/gpt-image-2.5/flare/edit",
    "openai/gpt-image-2.5/sunburst/text-to-image", "openai/gpt-image-2.5/sunburst/edit"
  ]) assert.equal(endpointIds.has(endpointId), true, endpointId);
  assert.equal([...endpointIds].some((endpointId) => endpointId.includes("qwen-image-3/pro")), false);
});

test("new image editors map ordered references, quality controls, batches and safe estimates", () => {
  const catalogModel = (endpointId) => ({
    ...builtinCatalog.find((item) => item.endpointId === endpointId),
    mediaType: "image"
  });
  const flux = createGenerationPreview({
    mediaType: "image", prompt: "Change image 1", references: [image()],
    settings: { aspectRatio: "1:1", outputFormat: "png" }
  }, catalogModel("fal-ai/flux-2-pro/edit"));
  assert.deepEqual(flux.providerInput.image_urls, [image().url]);
  assert.equal(flux.estimatedCost, 0.045);

  const qwen = createGenerationPreview({
    mediaType: "image", prompt: "Combine the three references",
    references: [image(1), image(2), image(3)],
    settings: { aspectRatio: "16:9", numImages: 2, promptExpansionMode: false }
  }, catalogModel("alibaba/qwen-image-3/edit"));
  assert.equal(qwen.providerInput.enable_prompt_expansion, false);
  assert.equal(qwen.providerInput.image_urls.length, 3);
  assert.equal(qwen.estimatedCost, 0.15);

  const grok = createGenerationPreview({
    mediaType: "image", prompt: "Poster", references: [],
    settings: { aspectRatio: "16:9", resolution: "2k", quality: "low", numImages: 2 }
  }, catalogModel("xai/grok-imagine-image/v2.0/text-to-image"));
  assert.equal(grok.providerInput.quality, "low");
  assert.equal(grok.estimatedCost, 0.12);

  const gpt = createGenerationPreview({
    mediaType: "image", prompt: "Preserve both subjects", references: [image(1), image(2)],
    settings: { aspectRatio: "16:9", imageSize: "custom_3840x2160", quality: "high",
      background: "transparent", outputFormat: "png", numImages: 2 }
  }, catalogModel("openai/gpt-image-2.5/flare/edit"));
  assert.deepEqual(gpt.providerInput.image_size, { width: 3840, height: 2160 });
  assert.equal(gpt.providerInput.background, "transparent");
  assert.equal(gpt.estimatedCost, 0.2328);
});

test("staging uploads each local image once, preserves order and never edits the prompt or original input", async () => {
  const input = { prompt: image(1).url, image_urls: [image(2).url, "https://v3.fal.media/remote.png", image(1).url, image(2).url] };
  const uploads = [];
  const staged = await stageReferenceImages(input, async (id) => ({ name: id }), async (file) => {
    uploads.push(file.name); return `https://v3.fal.media/${file.name}.png`;
  });
  assert.equal(uploads.length, 2);
  assert.equal(staged.image_urls[0], staged.image_urls[3]);
  assert.equal(staged.image_urls[1], input.image_urls[1]);
  assert.equal(staged.prompt, input.prompt);
  assert.equal(input.image_urls[0], image(2).url);
});

test("a deleted local reference stops staging before any upload", async () => {
  let uploads = 0;
  await assert.rejects(() => stageReferenceImages({ image_urls: [image(1).url, image(2).url] },
    async (id) => { if (id.endsWith("2")) throw new Error("Missing"); return {}; },
    async () => { uploads++; }), /Missing/);
  assert.equal(uploads, 0);
});

test("fal storage keeps authentication on initiation and omits it from the signed upload", async () => {
  const calls = [];
  const client = new FalClient(async (url, options) => {
    calls.push({ url, options });
    return calls.length === 1 ? new Response(JSON.stringify({
      upload_url: "https://v3.fal.media/upload/signed", file_url: "https://v3.fal.media/image.png"
    })) : new Response(null, { status: 200 });
  });
  assert.equal(await client.uploadImage("private-key", { data: Buffer.from("image"), contentType: "image/png", name: "test.png" }), "https://v3.fal.media/image.png");
  assert.equal(calls[0].options.headers.Authorization, "Key private-key");
  assert.equal(calls[1].options.headers.Authorization, undefined);
  assert.equal(calls[1].options.redirect, "error");
  assert.equal(JSON.parse(calls[0].options.headers["X-Fal-Object-Lifecycle"]).expiration_duration_seconds, 86400);
});

test("unexpected storage destinations and unsupported files never receive an upload", async () => {
  let calls = 0;
  const client = new FalClient(async () => { calls++; return new Response(JSON.stringify({
    upload_url: "https://example.com/upload", file_url: "https://v3.fal.media/image.png"
  })); });
  await assert.rejects(() => client.uploadImage("private-key", { data: Buffer.from("image"), contentType: "image/png", name: "test.png" }), /inattendue/);
  assert.equal(calls, 1);
  await assert.rejects(() => client.uploadImage("private-key", { data: Buffer.from("svg"), contentType: "image/svg+xml", name: "test.svg" }), /PNG/);
  assert.equal(calls, 1);
});
