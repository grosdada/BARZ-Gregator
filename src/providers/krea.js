const API_BASE_URL = "https://api.krea.ai";

function styleText(style) {
  return [style?.model, style?.model_name, style?.name, style?.title, style?.description, style?.base_model,
    ...(Array.isArray(style?.models) ? style.models : [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function isKrea2Style(style) {
  const text = styleText(style).replace(/[._-]+/g, " ");
  return /\bkrea\s*2\b/.test(text) || /\bk2\b/.test(text) || String(style?.model || "").toLowerCase().startsWith("krea_2");
}

export function normalizeKreaStyle(style) {
  const id = String(style?.id || style?.style_id || "").trim();
  if (!id) return null;
  const models = [...new Set([
    ...(Array.isArray(style?.models) ? style.models : []),
    style?.model, style?.base_model, style?.model_name
  ].filter(Boolean).map(String))];
  const model = models.join(", ") || "unknown";
  return {
    id,
    name: String(style?.name || style?.title || `LoRA ${id.slice(0, 8)}`),
    model,
    models,
    thumbnailUrl: style?.cover_url || style?.thumbnail_url || style?.thumbnailUrl || style?.image_url ||
      (Array.isArray(style?.urls) ? style.urls[0] : null) || null,
    weightsUrl: style?.weights_url || style?.weight_url || style?.lora_url || style?.safetensors_url || null,
    description: String(style?.description || ""),
    source: String(style?.source || "krea"),
  };
}

export function isFluxKreaStyle(style) {
  const text = styleText(style).replace(/[._-]+/g, " ");
  return text.includes("flux") && !isKrea2Style(style);
}

function imageInputSchema() {
  return {
    openapi: "3.0.0",
    paths: {
      "/generate/image/bfl/flux-1-dev": {
        post: {
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["prompt", "styles"],
                  properties: {
                    prompt: { type: "string", minLength: 1 },
                    seed: { type: "integer", minimum: 0 },
                    steps: { type: "integer", minimum: 1, maximum: 50, default: 28 },
                    width: { type: "integer", minimum: 256, maximum: 2048 },
                    height: { type: "integer", minimum: 256, maximum: 2048 },
                    guidance_scale: { type: "number", minimum: 0, maximum: 20, default: 3.5 },
                    image_url: { type: "string", format: "uri" },
                    styles: {
                      type: "array",
                      title: "LoRA Krea",
                      minItems: 1,
                      items: { type: "object" }
                    },
                    num_images: { type: "integer", minimum: 1, maximum: 4, default: 1 },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}

export function kreaCatalog() {
  return [{
    provider: "krea",
    endpointId: "image/bfl/flux-1-dev",
    providerModel: "flux-1-dev",
    displayName: "Krea Flux.1 Dev + LoRA",
    mediaType: "image",
    description: "Flux.1 Dev via Krea, avec mix de plusieurs LoRA et poids individuels.",
    category: "text-to-image",
    familyId: "krea-flux-1-dev",
    mode: "text-to-image",
    variant: "lora",
    status: "active",
    modelUrl: "https://www.krea.ai/docs/api-reference/image/flux1-dev",
    pricing: { unit: "request", unitPrice: 0.04, currency: "USD" },
    inputSchema: imageInputSchema(),
    controls: {
      aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"],
      referenceRole: "first",
      referenceKinds: ["image"],
      minReferences: 0,
      maxReferences: 1,
      seed: true,
      extras: [
        { key: "numImages", type: "integer", minimum: 1, maximum: 4, default: 1 },
        { key: "steps", type: "integer", minimum: 1, maximum: 100, default: 25 },
        { key: "guidanceScale", type: "number", minimum: 0, maximum: 24, default: 3 },
      ],
      imageSizePresets: {
        "1:1": { width: 1024, height: 1024 },
        "16:9": { width: 1344, height: 768 },
        "9:16": { width: 768, height: 1344 },
        "4:3": { width: 1152, height: 896 },
        "3:4": { width: 896, height: 1152 },
        "3:2": { width: 1216, height: 832 },
        "2:3": { width: 832, height: 1216 },
      },
    },
    verifiedAt: new Date("2026-10-01T00:00:00.000Z").toISOString(),
  }];
}

export function statusFromKrea(payload) {
  const status = String(payload?.status || payload?.state || "").toLowerCase();
  if (["completed", "complete", "succeeded", "success", "done"].includes(status)) return "completed";
  if (["backlogged", "queued", "scheduled", "pending"].includes(status)) return "queued";
  if (["cancelled", "canceled"].includes(status)) return "cancelled";
  if (["failed", "error"].includes(status)) return "failed";
  return "running";
}

export function resultFromKrea(payload) {
  const urls = [];
  const visit = (value, depth = 0) => {
    if (depth > 5 || value === null || value === undefined) return;
    if (typeof value === "string") {
      try {
        const url = new URL(value);
        if (url.protocol === "https:") urls.push(url.href);
      } catch { /* Non-URL metadata. */ }
    } else if (Array.isArray(value)) {
      value.forEach((item) => visit(item, depth + 1));
    } else if (typeof value === "object") {
      Object.values(value).forEach((item) => visit(item, depth + 1));
    }
  };
  visit(payload?.result ?? payload);
  return { images: [...new Set(urls)].map((url) => ({ url, content_type: "image/webp" })) };
}

export class KreaClient {
  constructor(fetchImpl = fetch) {
    this.fetchImpl = fetchImpl;
  }

  async request(path, apiKey, options = {}) {
    const headers = { Authorization: `Bearer ${apiKey}`, ...(options.headers || {}) };
    if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
    const response = await this.fetchImpl(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = payload?.detail || payload?.message;
      const message = typeof detail === "string"
        ? detail
        : detail ? JSON.stringify(detail) : `Krea API ${response.status}`;
      const error = new Error(message);
      error.remoteStatus = response.status;
      throw error;
    }
    return payload;
  }

  async uploadAsset(apiKey, resource) {
    const form = new FormData();
    form.append("file", new Blob([resource.data], {
      type: resource.contentType || "application/octet-stream"
    }), resource.name || "barz-reference.png");
    if (resource.description) form.append("description", String(resource.description));
    const payload = await this.request("/assets", apiKey, { method: "POST", body: form });
    const imageUrl = payload?.image_url || payload?.url || payload?.asset?.image_url || payload?.asset?.url;
    if (!imageUrl) {
      const error = new Error("Krea n’a pas renvoyé l’adresse de l’image importée.");
      error.remoteStatus = 502;
      throw error;
    }
    return imageUrl;
  }

  async listStyles(apiKey) {
    const all = [];
    for (const filter of ["user", "shared"]) {
      let cursor = null;
      do {
        const params = new URLSearchParams({ filter, limit: "1000" });
        if (cursor) params.set("cursor", cursor);
        const payload = await this.request(`/styles?${params}`, apiKey);
        all.push(...(Array.isArray(payload?.items) ? payload.items : []));
        cursor = payload?.next_cursor || null;
      } while (cursor);
    }
    const unique = new Map();
    for (const raw of all) {
      if (isKrea2Style(raw)) continue;
      const style = normalizeKreaStyle(raw);
      if (style) unique.set(style.id, style);
    }
    return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  async submit(apiKey, endpointId, input) {
    if (endpointId !== "image/bfl/flux-1-dev") throw new Error("Unsupported Krea endpoint");
    return this.request(`/generate/${endpointId}`, apiKey, { method: "POST", body: JSON.stringify(input) });
  }

  async retrieve(apiKey, jobId) {
    return this.request(`/jobs/${encodeURIComponent(jobId)}`, apiKey);
  }
}
