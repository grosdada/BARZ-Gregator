import test from "node:test";
import assert from "node:assert/strict";

import {
  createGenerationPreview,
  deriveFalFamily,
  deriveFalResolutionPrices,
  deriveModelControls,
  findModelForImportTarget,
  modelFamily,
  modelModeLabel
} from "../src/generation-plan.js";

const model = {
  provider: "fal",
  endpointId: "blackforestlabs/flux-3/text-to-video",
  displayName: "FLUX 3",
  mediaType: "video",
  verifiedAt: "2026-09-09T12:00:00.000Z",
  pricing: { unitPrice: 0.17, unit: "second", currency: "USD" },
  inputSchema: {
    openapi: "3.0.0",
    paths: {
      "/": {
        post: {
          requestBody: {
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Input" } }
            }
          }
        }
      }
    },
    components: {
      schemas: {
        Input: {
          type: "object",
          required: ["prompt"],
          properties: {
            prompt: { type: "string" },
            aspect_ratio: { type: "string", default: "16:9" },
            duration: { type: "number", default: 5 },
            resolution: { type: "string", enum: ["720p", "1080p"] },
            image_url: { type: "string" }
          }
        }
      }
    }
  }
};

const draft = {
  mediaType: "video",
  prompt: "Slow push in",
  negativePrompt: "flicker",
  settings: { aspectRatio: "16:9", durationSeconds: 8 }
};

test("maps only parameters proven by the model schema", () => {
  const preview = createGenerationPreview(draft, model);
  assert.deepEqual(preview.providerInput, {
    prompt: "Slow push in",
    aspect_ratio: "16:9",
    duration: 8
  });
  assert.equal("negative_prompt" in preview.providerInput, false);
  assert.equal(preview.missingRequired.length, 0);
});

test("estimates second-based pricing without unlocking submission", () => {
  const preview = createGenerationPreview(draft, model);
  assert.equal(preview.estimatedCost, 1.36);
  assert.equal(preview.submissionLocked, true);
});

test("detects required provider inputs that are not available", () => {
  const imageModel = structuredClone(model);
  imageModel.inputSchema.components.schemas.Input.required = ["prompt", "image_url"];
  const preview = createGenerationPreview(draft, imageModel);
  assert.deepEqual(preview.missingRequired, ["image_url"]);
});

test("groups fal endpoints into a model family and variant", () => {
  assert.deepEqual(
    deriveFalFamily("blackforestlabs/flux-3/text-to-video/draft", "text-to-video"),
    {
      familyId: "blackforestlabs/flux-3",
      mode: "text-to-video",
      variant: "draft"
    }
  );
});

test("groups launcher variants by model family and gives each mode a short label", () => {
  assert.deepEqual(modelFamily({ endpointId: "fal-ai/nano-banana-pro/edit" }), {
    id: "fal-ai/nano-banana-pro",
    label: "Nano Banana Pro"
  });
  assert.equal(modelModeLabel({ endpointId: "fal-ai/nano-banana-pro/edit" }),
    "Image → image");
  assert.deepEqual(modelFamily({ endpointId: "blackforestlabs/flux-3/image-to-video/draft" }), {
    id: "blackforestlabs/flux-3",
    label: "FLUX 3"
  });
  assert.equal(modelModeLabel({
    endpointId: "blackforestlabs/flux-3/image-to-video/draft"
  }), "Image → vidéo · Draft");
  assert.equal(modelFamily({ endpointId: "ideogram/v4/fast" }).label, "Ideogram 4");
  assert.equal(modelModeLabel({ endpointId: "ideogram/v4/fast" }), "Texte → image · Fast");
  assert.deepEqual(modelFamily({ endpointId: "fal-ai/z-image/turbo/image-to-image" }), {
    id: "fal-ai/z-image/turbo",
    label: "Z-Image Turbo"
  });
  assert.equal(modelModeLabel({ endpointId: "fal-ai/z-image/turbo" }), "Texte → image");
  assert.equal(modelModeLabel({ endpointId: "fal-ai/z-image/turbo/image-to-image" }),
    "Image → image");
  assert.deepEqual(modelFamily({ endpointId: "minimax/h3-max/reference-to-video" }), {
    id: "minimax/h3-max",
    label: "MiniMax H3 Max"
  });
  assert.equal(modelModeLabel({ endpointId: "minimax/h3-max/reference-to-video" }),
    "Multi-références");
  assert.equal(modelModeLabel({ endpointId: "bytedance/seedance-2.0/fast/text-to-video" }),
    "Texte → vidéo · Fast");
  assert.equal(modelModeLabel({ endpointId: "bytedance/seedance-2.0/reference-to-video" }),
    "Multi-références");
  assert.equal(modelModeLabel({ endpointId: "fal-ai/bytedance/seedance/v1/pro/fast/image-to-video" }),
    "Image → vidéo · Pro Fast");
  assert.equal(modelModeLabel({ endpointId: "fal-ai/kling-video/o3/standard/text-to-video" }),
    "Texte → vidéo · Standard");
  assert.equal(modelModeLabel({ endpointId: "fal-ai/kling-video/v3/pro/motion-control" }),
    "Motion Transfer · Pro");
  assert.equal(modelModeLabel({ endpointId: "bytedance/seedream/v5/lite/edit" }),
    "Image → image · Lite");
  assert.equal(modelModeLabel({ endpointId: "bytedance/seedream/v5/pro/text-to-image" }),
    "Texte → image · Pro");
  assert.equal(modelModeLabel({ endpointId: "openai/gpt-image-2.5/flare/edit" }),
    "Image → image · Flare");
  assert.equal(modelModeLabel({ endpointId: "openai/gpt-image-2.5/sunburst/text-to-image" }),
    "Texte → image · Sunburst");
  assert.equal(modelModeLabel({ endpointId: "fal-ai/wan/v2.7/text-to-image" }),
    "Texte → image · Standard");
  assert.equal(modelModeLabel({ endpointId: "fal-ai/wan/v2.7/pro/text-to-image" }),
    "Texte → image · Pro");
});

test("matches an imported human-readable model family without guessing an endpoint", () => {
  const catalog = [
    model,
    {
      ...model,
      endpointId: "bytedance/seedance/v2/text-to-video",
      displayName: "Seedance 2",
      mediaType: "video"
    },
    {
      ...model,
      endpointId: "fal-ai/nano-banana-pro",
      displayName: "Nano Banana Pro",
      mediaType: "image"
    }
  ];

  assert.equal(
    findModelForImportTarget(catalog, "video", { modelFamily: "Seedance" })?.endpointId,
    "bytedance/seedance/v2/text-to-video"
  );
  assert.equal(
    findModelForImportTarget(catalog, "image", { modelFamily: "Nano Banana Pro" })
      ?.endpointId,
    "fal-ai/nano-banana-pro"
  );
  assert.equal(findModelForImportTarget(catalog, "video", { modelFamily: "Runway" }), null);
});

test("maps image aspect ratios to a schema-supported fal image size", () => {
  const imageModel = {
    ...model,
    mediaType: "image",
    pricing: { unitPrice: 0.003, unit: "megapixels", currency: "USD" },
    inputSchema: {
      paths: {
        "/": {
          post: {
            requestBody: {
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ImageInput" }
                }
              }
            }
          }
        }
      },
      components: {
        schemas: {
          ImageInput: {
            type: "object",
            required: ["prompt"],
            properties: {
              prompt: { type: "string" },
              image_size: {
                anyOf: [{
                  type: "string",
                  enum: ["square_hd", "landscape_16_9"]
                }]
              }
            }
          }
        }
      }
    }
  };
  const imageDraft = {
    ...draft,
    mediaType: "image",
    settings: { aspectRatio: "16:9" }
  };

  const preview = createGenerationPreview(imageDraft, imageModel);
  assert.equal(preview.providerInput.image_size, "landscape_16_9");
  assert.equal(preview.estimatedUnits, 0.589824);
  assert.equal(preview.estimatedCost, 0.001769);
});

test("derives model-specific formats and resolutions from OpenAPI", () => {
  const controls = deriveModelControls({
    paths: {
      "/": {
        post: {
          requestBody: {
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/VideoInput" }
              }
            }
          }
        }
      }
    },
    components: {
      schemas: {
        VideoInput: {
          properties: {
            aspect_ratio: { enum: ["auto", "16:9", "9:16"] },
            resolution: { enum: ["720p", "1080p"] }
          }
        }
      }
    }
  });

  assert.deepEqual(controls.aspectRatios, ["16:9", "9:16"]);
  assert.deepEqual(controls.resolutions, ["720p", "1080p"]);
});

test("applies the verified FLUX 3 resolution price tier", () => {
  const tieredModel = {
    ...model,
    pricing: {
      ...model.pricing,
      unitPrice: 0.085,
      tiersByResolution: deriveFalResolutionPrices(model.endpointId)
    }
  };
  const preview = createGenerationPreview({
    ...draft,
    settings: { ...draft.settings, resolution: "1080p" }
  }, tieredModel);

  assert.equal(preview.providerInput.resolution, "1080p");
  assert.equal(preview.pricing.unitPrice, 0.29);
  assert.equal(preview.estimatedCost, 2.32);
});
