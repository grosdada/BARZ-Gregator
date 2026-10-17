// Read-only HTTP quotes. No job is prepared or submitted, no image is uploaded.
import assert from "node:assert/strict";
import { createGenerationPreview, deriveModelControls } from "../src/generation-plan.js";

const base = "http://127.0.0.1:4317";
const state = await (await fetch(`${base}/api/state`)).json();
const requiredEndpoints = [
  "minimax/h3/text-to-video",
  "minimax/h3/image-to-video",
  "minimax/h3/reference-to-video",
  "minimax/h3-max/text-to-video",
  "minimax/h3-max/image-to-video",
  "minimax/h3-max/reference-to-video",
  "fal-ai/nano-banana",
  "fal-ai/nano-banana/edit",
  "fal-ai/nano-banana-pro",
  "fal-ai/nano-banana-pro/edit",
  "fal-ai/z-image/turbo",
  "fal-ai/z-image/turbo/image-to-image"
];
assert.deepEqual(requiredEndpoints.filter((endpointId) => (
  !state.catalog.some((model) => model.endpointId === endpointId)
)), [], "MiniMax H3/H3 Max, Nano Banana, and Z-Image Turbo must be installed.");
assert.equal(state.catalog.some((model) => /seedance-2(?:\.0)?\//.test(model.endpointId)), false,
  "Retired Seedance modes must not remain in the launcher catalog.");
const references = state.resources.filter((item) => ["image/png", "image/jpeg", "image/webp"].includes(item.contentType) && item.size <= 30_000_000)
  .slice(0, 2).map((item) => ({ kind: "image", id: `resource:${item.id}`, url: `/api/resources/${item.id}/content` }));
assert.ok(references.length >= 2, "This integration check needs two existing local image resources.");
let count = 0;
for (const model of state.catalog) {
  const controls = deriveModelControls(model.inputSchema, model.endpointId);
  for (const ratio of controls.aspectRatios) {
    const resolutions = controls.resolutions.length ? controls.resolutions
      : controls.imageSizes.filter((item) => item.aspectRatio === ratio).map((item) => item.value);
    for (const resolution of resolutions.length ? resolutions : [undefined]) {
      const settings = { aspectRatio: ratio, durationSeconds: 8,
        ...Object.fromEntries(controls.extras.filter((item) => item.default !== undefined).map((item) => [item.key, item.default])) };
      if (controls.imageSizes.some((item) => item.value === resolution)) settings.imageSize = resolution;
      else settings.resolution = resolution;
      const draft = { endpointId: model.endpointId, mediaType: model.mediaType,
        prompt: "A quiet workshop at dawn", settings,
        references: references.slice(0, controls.minReferences) };
      const local = createGenerationPreview(draft, model);
      const response = await fetch(`${base}/api/generations/preview`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft)
      });
      const result = await response.json();
      const context = `${model.endpointId} ${ratio} ${resolution}`;
      assert.equal(response.status, 200, `${context}: ${result.error}`);
      assert.equal(result.preview.canSubmit, true, `${context}: ${result.preview.warnings}`);
      assert.ok(result.preview.estimatedCost > 0, context);
      assert.equal(result.preview.estimatedCost, local.estimatedCost, `${context}: browser/server cost mismatch`);
      assert.deepEqual(result.preview.providerInput, local.providerInput, `${context}: input mismatch`);
      count++;
    }
  }
  console.log(`OK ${model.endpointId}`);
}
const invalid = await fetch(`${base}/api/generations/preview`, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
    endpointId: "fal-ai/nano-banana-2/edit", mediaType: "image", prompt: "Missing reference check",
    settings: { resolution: "1K" }, references: [{ kind: "image", id: "resource:00000000-0000-4000-8000-000000000000",
      url: "/api/resources/00000000-0000-4000-8000-000000000000/content" }]
  })
});
assert.equal(invalid.status, 400);
console.log(`${count} browser/server quote combinations verified; deleted reference rejected; no generation submitted.`);
