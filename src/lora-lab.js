import { inputContract } from "./generation-plan.js";

export const LORA_TRAINERS = Object.freeze([
  { id: "flux-1-fast", label: "FLUX.1 Dev · rapide", baseModel: "FLUX.1 Dev", endpointId: "fal-ai/turbo-flux-trainer", defaults: { steps: 1000, learningRate: 0.00115, mode: "subject", triggerPhrase: "ohwx" } },
  { id: "flux-1-krea", label: "FLUX.1 Krea Dev", baseModel: "FLUX.1 Krea Dev", endpointId: "fal-ai/flux-krea-trainer", defaults: { steps: 1000, learningRate: 0.0001, mode: "subject", triggerPhrase: "ohwx" } },
  { id: "flux-2", label: "FLUX.2 Dev", baseModel: "FLUX.2 Dev", endpointId: "fal-ai/flux-2-trainer-v2", defaults: { steps: 1000, learningRate: 0.00005, mode: "balanced", triggerPhrase: "ohwx" } },
  { id: "z-image", label: "Z-Image", baseModel: "Z-Image", endpointId: "fal-ai/z-image-trainer", defaults: { steps: 1000, learningRate: 0.0001, mode: "balanced", triggerPhrase: "ohwx" } },
  { id: "z-image-turbo-v2", label: "Z-Image Turbo V2", baseModel: "Z-Image Turbo", endpointId: "fal-ai/z-image-turbo-trainer-v2", defaults: { steps: 2000, learningRate: 0.0005, mode: "balanced", triggerPhrase: "ohwx" } }
]);

export function loraTrainer(id) {
  return LORA_TRAINERS.find((trainer) => trainer.id === id) || null;
}

function supported(properties, candidates) {
  return candidates.find((name) => Object.hasOwn(properties, name));
}

export function buildLoraTrainingInput(trainer, openapi, settings, archiveUrl) {
  if (!trainer || trainer.id.includes("krea-2")) throw new TypeError("Trainer LoRA non autorisé.");
  const properties = inputContract(openapi).properties || {};
  const archiveField = supported(properties, ["images_data_url", "image_data_url"]);
  if (!archiveField) throw new TypeError("Le trainer fal ne publie pas de champ dataset compatible.");
  const input = { [archiveField]: archiveUrl };
  const set = (candidates, value) => {
    const field = supported(properties, candidates);
    if (field && value !== undefined && value !== "") input[field] = value;
  };
  set(["trigger_phrase"], settings.triggerPhrase);
  set(["default_caption", "caption"], settings.caption || settings.triggerPhrase);
  set(["steps", "training_steps"], settings.steps);
  set(["learning_rate"], settings.learningRate);
  set(["training_style", "training_type"], settings.mode);
  set(["face_crop"], settings.faceCrop);
  set(["output_lora_format"], settings.outputFormat);
  return input;
}

export function estimateLoraTrainingCost(pricing, steps) {
  const price = Number(pricing?.unitPrice);
  if (!Number.isFinite(price) || !Number.isFinite(Number(steps))) return null;
  const unit = String(pricing?.unit || "").toLowerCase();
  const multiplier = /1[,. ]?000|thousand|k steps/.test(unit) ? Number(steps) / 1000 : /step/.test(unit) ? Number(steps) : null;
  return multiplier === null ? null : Math.round(price * multiplier * 1e6) / 1e6;
}

export function normalizeLoraArtifacts(result) {
  const payload = result?.data || result;
  const file = (value) => typeof value === "string" ? { url: value } : value;
  const weights = file(payload?.diffusers_lora_file || payload?.lora_file || payload?.weights);
  const config = file(payload?.config_file || payload?.config);
  return {
    weights: weights?.url ? { url: weights.url, contentType: weights.content_type || "application/octet-stream" } : null,
    config: config?.url ? { url: config.url, contentType: config.content_type || "application/json" } : null
  };
}
