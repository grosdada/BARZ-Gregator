const apiBaseUrl = "https://api.heygen.com";

function heygenError(status, payload) {
  const detail = payload?.error?.message || payload?.error?.detail || payload?.message ||
    payload?.data?.message || payload?.error || "Réponse HeyGen non reconnue.";
  const message = typeof detail === "string" ? detail : JSON.stringify(detail);
  const error = new Error(`HeyGen (${status}) : ${message}`);
  error.statusCode = status === 401 || status === 403 ? 400 : status === 429 ? 429 : 502;
  error.remoteStatus = status;
  return error;
}

function videoInputSchema(mode) {
  const properties = {
    model: { type: "string", default: "heygen-video-1" },
    mode: { type: "string", default: mode },
    prompt: { type: "string", minLength: 1, maxLength: 32_000 },
    duration: { type: "integer", minimum: 5, maximum: 15, default: 5 },
    resolution: { type: "string", enum: ["480p", "768p", "2k"], default: "768p" },
    prompt_enhancement: {
      type: "string",
      enum: ["turbo", "quality", "disabled"],
      default: "turbo"
    },
    aspect_ratio: {
      type: "string",
      enum: ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"],
      default: "16:9"
    },
    seed: { type: "integer", minimum: 0, maximum: 4_294_967_295 }
  };
  const required = ["model", "mode", "prompt"];
  if (mode === "image_to_video") {
    properties.image = { type: "object" };
    required.push("image");
  }
  if (mode === "reference_to_video") {
    properties.reference_images = { type: "array", maxItems: 9 };
    properties.reference_videos = { type: "array", maxItems: 3 };
    properties.reference_audio = { type: "array", maxItems: 3 };
  }
  return {
    openapi: "3.0.0",
    paths: {
      "/v3/models/videos": {
        post: {
          requestBody: {
            content: {
              "application/json": {
                schema: { type: "object", required, properties }
              }
            }
          }
        }
      }
    }
  };
}

const modes = [
  ["text-to-video", "text_to_video", "Texte → vidéo"],
  ["image-to-video", "image_to_video", "Image → vidéo"],
  ["reference-to-video", "reference_to_video", "Multi-références"]
];

export function heygenCatalog(now = new Date("2026-10-01T00:00:00.000Z")) {
  return modes.map(([slug, mode, label]) => ({
    provider: "heygen",
    endpointId: `heygen-video-1/${slug}`,
    providerModel: "heygen-video-1",
    displayName: `HeyGen Video 1 · ${label}`,
    description: "Vidéo généraliste avec dialogue, ambiance et effets sonores natifs.",
    category: slug,
    mediaType: "video",
    familyId: "heygen-video-1",
    mode,
    variant: "standard",
    status: "active",
    modelUrl: "https://developers.heygen.com/docs/models/heygen-video",
    pricing: {
      unitPrice: 0.02,
      unit: "second",
      currency: "USD",
      tiersByResolution: { "480p": 0.02, "768p": 0.03, "2k": 0.09 },
      source: "HeyGen list price; launch promotions can lower the billed amount"
    },
    inputSchema: videoInputSchema(mode),
    verifiedAt: now.toISOString()
  }));
}

export function statusFromHeyGen(payload) {
  const status = String(payload?.data?.status || payload?.status || "").toLowerCase();
  if (status === "pending") return "queued";
  if (status === "processing") return "running";
  if (status === "completed") return "completed";
  if (status === "failed") return "failed";
  if (status === "cancelled") return "cancelled";
  return null;
}

export function resultFromHeyGen(payload) {
  const data = payload?.data || payload || {};
  if (!data.video_url) return null;
  return {
    video: {
      url: data.video_url,
      content_type: "video/mp4",
      file_name: `heygen-${String(data.video_id || "video").slice(0, 24)}.mp4`,
      width: data.width,
      height: data.height,
      duration: data.duration,
      seed: data.seed
    }
  };
}

export class HeyGenClient {
  constructor(fetchImplementation = fetch) {
    this.fetch = fetchImplementation;
  }

  async account(apiKey) {
    return this.request("/v3/users/me", apiKey);
  }

  async uploadAsset(apiKey, { data, contentType, name }) {
    const allowedTypes = [
      "image/jpeg", "image/png",
      "audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/webm",
      "video/mp4", "video/webm", "video/quicktime"
    ];
    if (!Buffer.isBuffer(data) || data.length === 0 || data.length > 32_000_000 ||
        !allowedTypes.includes(contentType)) {
      const error = new Error(
        "Référence HeyGen : utilise une image PNG/JPG, un son MP3/WAV/M4A " +
        "ou une vidéo MP4/WebM/MOV de 32 Mo maximum."
      );
      error.statusCode = 400;
      throw error;
    }
    const form = new FormData();
    form.append("file", new Blob([data], { type: contentType }), name);
    const payload = await this.request("/v3/assets", apiKey, {
      method: "POST",
      body: form,
      timeout: 120_000
    });
    const assetId = payload?.data?.asset_id;
    if (!assetId || !/^[a-zA-Z0-9_-]{6,160}$/.test(assetId)) {
      throw new Error("HeyGen n’a pas renvoyé d’identifiant d’asset valide.");
    }
    return assetId;
  }

  async submit(apiKey, input, idempotencyKey) {
    return this.request("/v3/models/videos", apiKey, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": String(idempotencyKey || "").slice(0, 128)
      },
      body: JSON.stringify(input)
    });
  }

  async retrieve(apiKey, videoId) {
    const normalized = String(videoId || "").trim();
    if (!/^[a-zA-Z0-9_-]{6,160}$/.test(normalized)) {
      const error = new TypeError("Identifiant de génération HeyGen invalide.");
      error.statusCode = 400;
      throw error;
    }
    return this.request(`/v3/models/videos/${encodeURIComponent(normalized)}`, apiKey);
  }

  async request(pathname, apiKey, options = {}) {
    let response;
    const { timeout = 20_000, headers = {}, ...requestOptions } = options;
    try {
      response = await this.fetch(`${apiBaseUrl}${pathname}`, {
        ...requestOptions,
        headers: { "X-Api-Key": apiKey, ...headers },
        signal: AbortSignal.timeout(timeout)
      });
    } catch (cause) {
      const error = new Error("HeyGen est injoignable pour le moment.", { cause });
      error.statusCode = 502;
      throw error;
    }
    let payload;
    try { payload = await response.json(); } catch { payload = null; }
    if (!response.ok) throw heygenError(response.status, payload);
    return payload;
  }
}
