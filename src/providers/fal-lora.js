function imageSchema(endpointId) {
  return {
    openapi: "3.0.0",
    paths: {
      [`/${endpointId}`]: {
        post: {
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["prompt", "loras"],
                  properties: {
                    prompt: { type: "string", minLength: 1 },
                    image_size: {
                      anyOf: [
                        { type: "string", enum: ["square_hd", "landscape_4_3", "portrait_4_3", "landscape_16_9", "portrait_16_9"] },
                        { type: "object" }
                      ]
                    },
                    seed: { type: "integer", minimum: 0 },
                    num_inference_steps: { type: "integer", minimum: 1, maximum: 50, default: 28 },
                    guidance_scale: { type: "number", minimum: 0, maximum: 20, default: 3.5 },
                    num_images: { type: "integer", minimum: 1, maximum: 4, default: 1 },
                    output_format: { type: "string", enum: ["jpeg", "png", "webp"], default: "jpeg" },
                    loras: {
                      type: "array",
                      minItems: 1,
                      items: {
                        type: "object",
                        required: ["path"],
                        properties: {
                          path: { type: "string", format: "uri" },
                          scale: { type: "number", minimum: 0, maximum: 2, default: 1 }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  };
}

function catalogEntry({ endpointId, displayName, familyId, baseModel }) {
  return {
    provider: "fal",
    endpointId,
    providerModel: endpointId,
    displayName,
    mediaType: "image",
    description: `Génération ${baseModel} avec mix de poids LoRA locaux compatibles.`,
    category: "text-to-image",
    familyId,
    mode: "text-to-image",
    variant: "lora",
    status: "active",
    modelUrl: `https://fal.ai/models/${endpointId}`,
    pricing: { unit: "megapixel", unitPrice: 0.035, currency: "USD" },
    inputSchema: imageSchema(endpointId),
    controls: {
      aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
      referenceRole: "none",
      referenceKinds: [],
      minReferences: 0,
      maxReferences: 0,
      seed: true,
      extras: [
        { key: "numImages", type: "integer", minimum: 1, maximum: 4, default: 1 },
        { key: "steps", type: "integer", minimum: 1, maximum: 50, default: 28 },
        { key: "guidanceScale", type: "number", minimum: 0, maximum: 20, default: 3.5 },
        { key: "outputFormat", type: "string", values: ["jpeg", "png", "webp"], default: "jpeg" }
      ]
    },
    loraBaseModel: baseModel,
    verifiedAt: new Date("2026-10-11T00:00:00.000Z").toISOString()
  };
}

export function falLoraCatalog() {
  return [
    catalogEntry({
      endpointId: "fal-ai/flux-lora",
      displayName: "FLUX.1 Dev + LoRA locaux",
      familyId: "flux-1-dev-lora",
      baseModel: "FLUX.1 Dev"
    }),
    catalogEntry({
      endpointId: "fal-ai/flux-krea-lora",
      displayName: "FLUX.1 Krea Dev + LoRA locaux",
      familyId: "flux-1-krea-dev-lora",
      baseModel: "FLUX.1 Krea Dev"
    })
  ];
}
