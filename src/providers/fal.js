import {
  deriveFalFamily,
  deriveFalResolutionPrices,
  deriveModelControls
} from "../generation-plan.js";

const platformBaseUrl = "https://api.fal.ai/v1";
const endpointPattern = /^[a-zA-Z0-9._/-]{3,240}$/;
const multipartThresholdBytes = 90 * 1024 * 1024;
const multipartChunkBytes = 10 * 1024 * 1024;

function falError(status, payload) {
  const detail = payload?.detail || payload?.message || payload?.error;
  const validationMessage = Array.isArray(detail)
    ? detail.map((item) => item?.msg || item?.message).filter(Boolean).join("; ")
    : "";
  const message = typeof detail === "string"
    ? detail
    : validationMessage || detail?.message || detail?.error || "Réponse fal non reconnue.";
  const error = new Error(`fal (${status}) : ${message}`);
  error.statusCode = status === 401 || status === 403 ? 400 : 502;
  error.remoteStatus = status;
  return error;
}

function mediaTypeFromCategory(category = "") {
  if (category.includes("video")) return "video";
  if (category.includes("image")) return "image";
  if (category.includes("audio") || category.includes("music")) return "music";
  return "other";
}

export class FalClient {
  constructor(fetchImplementation = fetch) {
    this.fetch = fetchImplementation;
  }

  async account(apiKey) {
    return this.request("/account/billing?expand=credits", apiKey);
  }

  async verifyModel(apiKey, endpointId) {
    const normalizedId = String(endpointId || "").trim();
    if (!endpointPattern.test(normalizedId) || normalizedId.includes("..")) {
      const error = new TypeError("L’identifiant fal n’a pas un format valide.");
      error.statusCode = 400;
      throw error;
    }

    const query = new URLSearchParams({
      endpoint_id: normalizedId,
      expand: "openapi-3.0"
    });
    const [modelResponse, pricingResponse] = await Promise.all([
      this.request(`/models?${query}`, apiKey),
      this.request(`/models/pricing?endpoint_id=${encodeURIComponent(normalizedId)}`, apiKey)
    ]);
    const model = modelResponse.models?.find((item) => item.endpoint_id === normalizedId);
    if (!model) {
      const error = new Error("Cet identifiant exact n’existe pas dans le catalogue fal.");
      error.statusCode = 404;
      throw error;
    }

    const pricing = pricingResponse.prices?.find((item) => item.endpoint_id === normalizedId);
    const category = model.metadata?.category || "unknown";
    const family = deriveFalFamily(normalizedId, category);
    const inputSchema = model.openapi || null;
    return {
      provider: "fal",
      endpointId: normalizedId,
      displayName: model.metadata?.display_name || normalizedId,
      description: model.metadata?.description || "",
      category,
      mediaType: mediaTypeFromCategory(category),
      ...family,
      status: model.metadata?.status || "unknown",
      modelUrl: model.metadata?.model_url || `https://fal.run/${normalizedId}`,
      pricing: pricing ? {
        unitPrice: pricing.unit_price,
        unit: pricing.unit,
        currency: pricing.currency,
        tiersByResolution: deriveFalResolutionPrices(normalizedId, pricing.unit_price)
      } : null,
      inputSchema,
      controls: deriveModelControls(inputSchema, normalizedId),
      verifiedAt: new Date().toISOString()
    };
  }

  async request(pathname, apiKey) {
    return this.requestUrl(`${platformBaseUrl}${pathname}`, apiKey);
  }

  async uploadImage(apiKey, { data, contentType, name }) {
    if (!Buffer.isBuffer(data) || data.length === 0 || data.length > 30_000_000 ||
        !["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
      throw Object.assign(new Error("Référence : utilise une image PNG, JPG ou WebP de 30 Mo maximum."), { statusCode: 400 });
    }
    return this.uploadMedia(apiKey, { data, contentType, name }, { imageOnly: true });
  }

  async uploadMedia(apiKey, { data, contentType, name }, { imageOnly = false } = {}) {
    const allowed = imageOnly
      ? ["image/jpeg", "image/png", "image/webp"]
      : [
          "image/jpeg", "image/png", "image/webp",
          "audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/webm",
          "video/mp4", "video/webm", "video/quicktime"
        ];
    const maximumBytes = imageOnly ? 30_000_000 : 100_000_000;
    if (!Buffer.isBuffer(data) || data.length === 0 || data.length > maximumBytes || !allowed.includes(contentType)) {
      throw Object.assign(new Error(imageOnly
        ? "Référence : utilise une image PNG, JPG ou WebP de 30 Mo maximum."
        : "Référence : utilise une image, un MP3/WAV/M4A ou une vidéo compatible de 100 Mo maximum."), { statusCode: 400 });
    }
    const result = await this.requestUrl("https://rest.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3", apiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Fal-Object-Lifecycle": JSON.stringify({ expiration_duration_seconds: 86400 }) },
      body: JSON.stringify({ file_name: name, content_type: contentType })
    });
    const urls = [result?.upload_url, result?.file_url].map((value) => {
      try { return new URL(value); } catch { return null; }
    });
    if (urls.some((url) => !url || url.protocol !== "https:" || url.username || url.password ||
        !(url.hostname === "fal.media" || url.hostname.endsWith(".fal.media")))) {
      throw new Error("fal a renvoyé une adresse de stockage inattendue.");
    }
    // The signed PUT URL is already authorized. Never forward the account key.
    const response = await this.fetch(urls[0].href, {
      method: "PUT", body: data, headers: { "Content-Type": contentType },
      redirect: "error", signal: AbortSignal.timeout(120_000)
    });
    if (!response.ok) throw new Error(`L’envoi du média de référence a échoué (${response.status}).`);
    return urls[1].href;
  }

  async uploadArchive(apiKey, { data, name }) {
    if (!Buffer.isBuffer(data) || data.length === 0 || data.length > 536_870_912) {
      throw Object.assign(new Error("Le dataset ZIP doit peser moins de 512 Mio."), { statusCode: 400 });
    }
    return this.uploadFile(apiKey, { data, contentType: "application/zip", name: name || "barz-lora-dataset.zip", expirationSeconds: 604800 });
  }

  async uploadFile(apiKey, { data, contentType, name, expirationSeconds = 86400 }) {
    if (data.length > multipartThresholdBytes) {
      return this.uploadMultipartFile(apiKey, { data, contentType, name, expirationSeconds });
    }
    const result = await this.requestUrl("https://rest.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3", apiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Fal-Object-Lifecycle": JSON.stringify({ expiration_duration_seconds: expirationSeconds }) },
      body: JSON.stringify({ file_name: name, content_type: contentType })
    });
    const urls = [result?.upload_url, result?.file_url].map((value) => {
      try { return new URL(value); } catch { return null; }
    });
    if (urls.some((url) => !url || url.protocol !== "https:" || url.username || url.password || !(url.hostname === "fal.media" || url.hostname.endsWith(".fal.media")))) {
      throw new Error("fal a renvoyé une adresse de stockage inattendue.");
    }
    const response = await this.fetch(urls[0].href, { method: "PUT", body: data, headers: { "Content-Type": contentType }, redirect: "error", signal: AbortSignal.timeout(120_000) });
    if (!response.ok) throw new Error(`L’envoi du fichier vers fal a échoué (${response.status}).`);
    return urls[1].href;
  }

  async uploadMultipartFile(apiKey, { data, contentType, name, expirationSeconds = 86400 }) {
    const result = await this.requestUrl("https://rest.fal.ai/storage/upload/initiate-multipart?storage_type=fal-cdn-v3", apiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Fal-Object-Lifecycle": JSON.stringify({ expiration_duration_seconds: expirationSeconds }) },
      body: JSON.stringify({ file_name: name, content_type: contentType })
    });
    const urls = [result?.upload_url, result?.file_url].map((value) => {
      try { return new URL(value); } catch { return null; }
    });
    if (urls.some((url) => !url || url.protocol !== "https:" || url.username || url.password || !(url.hostname === "fal.media" || url.hostname.endsWith(".fal.media")))) {
      throw new Error("fal a renvoyé une adresse de stockage inattendue.");
    }

    const uploadUrl = urls[0];
    const parts = [];
    const partCount = Math.ceil(data.length / multipartChunkBytes);
    for (let index = 0; index < partCount; index += 1) {
      const partNumber = index + 1;
      const partUrl = new URL(uploadUrl.href);
      partUrl.pathname = `${partUrl.pathname.replace(/\/$/, "")}/${partNumber}`;
      const start = index * multipartChunkBytes;
      const chunk = data.subarray(start, Math.min(start + multipartChunkBytes, data.length));
      let partResponse;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        partResponse = await this.fetch(partUrl.href, {
          method: "PUT",
          body: chunk,
          redirect: "error",
          signal: AbortSignal.timeout(120_000)
        });
        if (partResponse.ok) break;
        if (attempt === 3) {
          throw new Error(`L’envoi du fichier vers fal a échoué sur la partie ${partNumber}/${partCount} (${partResponse.status}).`);
        }
      }
      const part = await partResponse.json();
      if (!part?.etag || !Number.isFinite(Number(part?.partNumber))) {
        throw new Error(`fal a renvoyé une confirmation multipart invalide pour la partie ${partNumber}.`);
      }
      parts.push({ partNumber: Number(part.partNumber), etag: String(part.etag) });
    }

    const completeUrl = new URL(uploadUrl.href);
    completeUrl.pathname = `${completeUrl.pathname.replace(/\/$/, "")}/complete`;
    const completeResponse = await this.fetch(completeUrl.href, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parts }),
      redirect: "error",
      signal: AbortSignal.timeout(120_000)
    });
    if (!completeResponse.ok) {
      throw new Error(`La finalisation de l’envoi vers fal a échoué (${completeResponse.status}).`);
    }
    return urls[1].href;
  }

  async submit(apiKey, endpointId, input) {
    const normalizedId = String(endpointId || "").trim();
    if (!endpointPattern.test(normalizedId) || normalizedId.includes("..")) {
      const error = new TypeError("L’identifiant fal n’a pas un format valide.");
      error.statusCode = 400;
      throw error;
    }
    return this.requestUrl(`https://queue.fal.run/${normalizedId}`, apiKey, {
      method: "POST",
      body: JSON.stringify(input),
      headers: {
        "Content-Type": "application/json",
        "X-Fal-Store-IO": "0"
      }
    });
  }

  async queueStatus(apiKey, endpointId, requestId) {
    return this.queueRequest(apiKey, endpointId, requestId, "status");
  }

  async queueResult(apiKey, endpointId, requestId) {
    return this.queueRequest(apiKey, endpointId, requestId, "response");
  }

  async queueUrl(apiKey, url) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      parsed = null;
    }
    if (
      parsed?.origin !== "https://queue.fal.run" ||
      parsed.username || parsed.password || !parsed.pathname.startsWith("/")
    ) {
      const error = new TypeError("URL de suivi fal invalide.");
      error.statusCode = 400;
      throw error;
    }
    return this.requestUrl(parsed.href, apiKey);
  }

  async queueUrlOrRequest(
    apiKey,
    url,
    endpointId,
    requestId,
    action,
    canonicalEndpointId = null
  ) {
    const candidates = [endpointId, canonicalEndpointId]
      .filter((value, index, values) => value && values.indexOf(value) === index);
    let lastError;
    const failures = [];
    if (url) {
      try {
        return await this.queueUrl(apiKey, url);
      } catch (error) {
        if (![404, 405].includes(error.remoteStatus)) throw error;
        lastError = error;
        failures.push(`URL fournie: ${error.message}`);
      }
    }
    for (const candidate of candidates) {
      try {
        return await this.queueRequest(apiKey, candidate, requestId, action);
      } catch (error) {
        if (![404, 405].includes(error.remoteStatus)) throw error;
        lastError = error;
        failures.push(`${candidate}: ${error.message}`);
      }
    }
    if (failures.length > 1) {
      lastError.message = failures.join(" | ");
    }
    throw lastError;
  }

  async queueRequest(apiKey, endpointId, requestId, action) {
    const normalizedId = String(endpointId || "").trim();
    const normalizedRequestId = String(requestId || "").trim();
    if (
      !endpointPattern.test(normalizedId) || normalizedId.includes("..") ||
      !/^[a-zA-Z0-9-]{8,100}$/.test(normalizedRequestId)
    ) {
      const error = new TypeError("Référence de requête fal invalide.");
      error.statusCode = 400;
      throw error;
    }
    return this.requestUrl(
      `https://queue.fal.run/${normalizedId}/requests/${normalizedRequestId}/${action}`,
      apiKey
    );
  }

  async requestUrl(url, apiKey, options = {}) {
    let response;
    try {
      response = await this.fetch(url, {
        ...options,
        headers: { Authorization: `Key ${apiKey}`, ...options.headers },
        signal: AbortSignal.timeout(12_000)
      });
    } catch (cause) {
      const error = new Error("fal est injoignable pour le moment.", { cause });
      error.statusCode = 502;
      throw error;
    }

    let payload;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    if (!response.ok) throw falError(response.status, payload);
    return payload;
  }
}
