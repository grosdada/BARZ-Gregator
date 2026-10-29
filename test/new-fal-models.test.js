import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createGenerationPreview, modelFamily } from "../src/generation-plan.js";
import { stageReferenceMedia } from "../src/reference-upload.js";
import { normalizePromptAtlasImport } from "../src/prompt-import.js";

const catalog = JSON.parse(readFileSync(new URL("../data/catalog.seed.json", import.meta.url), "utf8"));
const model = (endpointId) => {
  const found = catalog.find((item) => item.endpointId === endpointId);
  assert.ok(found, `${endpointId} missing from catalog`);
  return found;
};
const image = (index) => ({ kind: "image", id: `image-${index}`,
  url: `/api/resources/11111111-1111-4111-8111-${String(index).padStart(12, "0")}/content` });
const preview = (endpointId, references = [], settings = {}) => {
  const selected = model(endpointId);
  return createGenerationPreview({
    mediaType: selected.mediaType,
    prompt: "Keep @image1 visible in the same scene",
    references,
    settings: { aspectRatio: "16:9", resolution: "720p", durationSeconds: 5, ...settings }
  }, selected);
};

test("MOSS is text only while FLUX.3 Klein and Fibo 2 have working edit modes", () => {
  const moss = preview("fal-ai/moss-image");
  assert.equal(moss.canSubmit, false); // @image1 in the prompt has no matching reference
  const mossClean = createGenerationPreview({ mediaType: "image", prompt: "Typography poster",
    references: [], settings: { aspectRatio: "1:1" } }, model("fal-ai/moss-image"));
  assert.equal(mossClean.canSubmit, true);
  assert.equal(mossClean.estimatedCost, 0.052429);
  assert.equal(preview("fal-ai/moss-image", [image(1)]).canSubmit, false);

  const klein = preview("blackforestlabs/flux-3/klein/edit-image", [image(1)]);
  assert.equal(klein.canSubmit, true);
  assert.deepEqual(klein.providerInput.image_urls, [image(1).url]);
  assert.equal(modelFamily(model("blackforestlabs/flux-3/klein/edit-image")).label, "FLUX.3 Klein");
  assert.equal(preview("blackforestlabs/flux-3/klein/text-to-image", [image(1)]).canSubmit, false);

  const fibo = preview("bria/fibo-2/edit", [image(1)]);
  assert.equal(fibo.canSubmit, true);
  assert.equal(fibo.providerInput.instruction, "Keep <image_1> visible in the same scene");
  assert.equal(fibo.providerInput.aspect_ratio, undefined);
  assert.equal(fibo.estimatedCost, 0.04);
  const multi = preview("bria/fibo-2/edit", [image(1), image(2)]);
  assert.equal(multi.providerInput.aspect_ratio, "16:9");
  assert.equal(preview("bria/fibo-2/edit", Array.from({ length: 5 }, (_, index) => image(index + 1))).canSubmit, false);
});

test("FLUX 3 Max supports text, first/last frames, and positioned keyframes", async () => {
  const text = createGenerationPreview({ mediaType: "video", prompt: "A pan across the city",
    references: [], settings: { aspectRatio: "16:9", resolution: "720p", durationSeconds: 5 } },
  model("blackforestlabs/flux-3-max/text-to-video"));
  assert.equal(text.canSubmit, true);
  assert.equal(text.estimatedCost, Date.now() < Date.parse("2026-11-08T00:00:00Z") ? 0.2125 : 0.85);
  const firstLast = preview("blackforestlabs/flux-3-max/image-to-video", [image(1), image(2)]);
  assert.equal(firstLast.canSubmit, true);
  assert.equal(firstLast.providerInput.image_url, image(1).url);
  assert.equal(firstLast.providerInput.end_image_url, image(2).url);

  const frames = preview("blackforestlabs/flux-3-max/keyframes-to-video", [image(1), image(2), image(3)],
    { durationSeconds: 5, reasoningLevel: "low" });
  assert.equal(frames.canSubmit, true);
  assert.deepEqual(frames.providerInput.keyframes.map((item) => item.frame_index), [0, 60, 120]);
  assert.equal(frames.providerInput.reasoning_level, "low");
  const imported = normalizePromptAtlasImport({
    schemaVersion: "1.0", source: { app: "prompt-atlas", module: "test" },
    mediaType: "video", prompt: "A pan across the city",
    settings: { reasoningLevel: "low" }
  });
  assert.equal(imported.settings.reasoningLevel, "low");
  const staged = await stageReferenceMedia(frames.providerInput,
    async (id) => ({ id }), async (resource) => `https://fal.media/${resource.id}.png`);
  assert.deepEqual(staged.keyframes.map((item) => item.image_url), [1, 2, 3].map((index) =>
    `https://fal.media/11111111-1111-4111-8111-${String(index).padStart(12, "0")}.png`));
  assert.equal(preview("blackforestlabs/flux-3-max/keyframes-to-video").canSubmit, false);
});
