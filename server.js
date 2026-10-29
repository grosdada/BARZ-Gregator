import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Transform } from "node:stream";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import falServerProxy from "@fal-ai/server-proxy";

import { convertMedia, createImageThumbnail, createStoredZip } from "./src/archive.js";
import { createLocalDraft, normalizePromptAtlasImport } from "./src/prompt-import.js";
import { createGenerationPreview } from "./src/generation-plan.js";
import {
  createPreparedJob,
  progressFromFal,
  refreshedEstimate,
  statusFromFal,
  transitionJob
} from "./src/job-state.js";
import { FalClient } from "./src/providers/fal.js";
import {
  HeyGenClient,
  resultFromHeyGen,
  statusFromHeyGen
} from "./src/providers/heygen.js";
import { KreaClient, resultFromKrea, statusFromKrea } from "./src/providers/krea.js";
import { stageReferenceImages, stageReferenceMedia } from "./src/reference-upload.js";
import { isDisplayMedia } from "./public/media-result.js";
import { SecretVault } from "./src/secret-vault.js";
import {
  API_KEY_PROVIDERS,
  apiKeyProvider,
  verifyStandardApiKey
} from "./src/providers/api-key-verifier.js";
import { LocalStore } from "./src/storage.js";
import { createDirectorSessionJob } from "./src/director-spending.js";
import {
  LORA_TRAINERS,
  buildLoraTrainingInput,
  estimateLoraTrainingCost,
  loraTrainer,
  normalizeLoraArtifacts
} from "./src/lora-lab.js";
import { validateSafetensorsFile } from "./src/lora-import.js";
import { revealFileInExplorer } from "./src/windows-shell.js";
import { createUpdateManager } from "./src/update-manager.js";

const host = "127.0.0.1";
const port = Number(process.env.BARZ_AGGREGATOR_PORT || 4317);
const rootDirectory = path.dirname(fileURLToPath(import.meta.url));
const publicDirectory = path.join(rootDirectory, "public");
const dataDirectory = process.env.BARZ_AGGREGATOR_DATA_DIR
  || path.join(rootDirectory, "data");
const sharedSecretsDirectory = process.env.BARZ_SHARED_SECRETS_DIR || dataDirectory;
const uploadDirectory = path.join(dataDirectory, "uploads");
const loraWeightsDirectory = path.join(dataDirectory, "lora-weights");
const referenceIconDirectory = path.join(dataDirectory, "reference-icons");
const store = new LocalStore(dataDirectory);
const updateManager = createUpdateManager({ rootDirectory, dataDirectory });
const vault = new SecretVault(sharedSecretsDirectory);
const legacyVault = path.resolve(sharedSecretsDirectory) === path.resolve(dataDirectory)
  ? null
  : new SecretVault(dataDirectory);
const falClient = new FalClient();
const heygenClient = new HeyGenClient();
const kreaClient = new KreaClient();
const { handleRequest: handleFalProxyRequest, resolveProxyConfig } = falServerProxy;
const falRealtimeProxyConfig = resolveProxyConfig({
  allowedEndpoints: ["minimax/h3-max/director"],
  allowUnauthorizedRequests: false,
  isAuthenticated: async (behavior) => {
    const origin = String(behavior.getHeader("origin") || "");
    if (origin) {
      try {
        const parsed = new URL(origin);
        return ["127.0.0.1", "localhost"].includes(parsed.hostname) &&
          Number(parsed.port || 80) === port;
      } catch { return false; }
    }
    return ["127.0.0.1", "localhost"].some((name) => (
      String(behavior.getHeader("host") || "").toLowerCase() === `${name}:${port}`
    ));
  },
  resolveFalAuth: async () => {
    const apiKey = await vault.get("falApiKey");
    return apiKey ? `Key ${apiKey}` : undefined;
  }
});
const maximumBodyBytes = 1_048_576;
const maximumResourceBytes = 536_870_912;
const referenceLibraryHost = "barz-ai-lib.placenta.tv";
const referenceLibraryImageTypes = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif"
]);
const retiredModelPrefixes = ["bytedance/seedance-2.0/", "fal-ai/seedance-2/"];

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"]
]);

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(body));
}

function isRetiredModel(endpointId) {
  return retiredModelPrefixes.some((prefix) => String(endpointId).startsWith(prefix));
}

function addSecurityHeaders(response) {
  response.setHeader("Content-Security-Policy", [
    "default-src 'self'",
    "connect-src 'self'",
    "img-src 'self' data: blob: https://*.fal.media https://*.heygen.ai https://files.heygen.com https://*.krea.ai https://test1-emgndhaqd0c9h2db.a01.azurefd.net",
    "media-src 'self' blob: https://*.fal.media https://*.heygen.ai https://files.heygen.com https://*.krea.ai",
    "style-src 'self'",
    "script-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'"
  ].join("; "));
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
}

function addLocalCors(request, response) {
  const origin = request.headers.origin;
  if (!origin) return;

  try {
    const url = new URL(origin);
    if (url.hostname === "127.0.0.1" || url.hostname === "localhost") {
      response.setHeader("Access-Control-Allow-Origin", origin);
      response.setHeader("Vary", "Origin");
      response.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Barz-Filename, X-Fal-Target-Url, X-Barz-Lora-Name, X-Barz-Lora-Base-Model, X-Barz-Lora-Trigger");
      response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    }
  } catch {
    // An invalid origin receives no CORS permission.
  }
}

function resourceAction(pathname) {
  const match = pathname.match(
    /^\/api\/resources\/([0-9a-f]{8}-[0-9a-f-]{27,})\/(content|download|reveal)$/i
  );
  return match ? { id: match[1], action: match[2] } : null;
}

function jobAction(pathname) {
  const match = pathname.match(
    /^\/api\/jobs\/([0-9a-f]{8}-[0-9a-f-]{27,})\/(submit|refresh)$/i
  );
  return match ? { id: match[1], action: match[2] } : null;
}

function jobDownload(pathname) {
  const match = pathname.match(
    /^\/api\/jobs\/([0-9a-f]{8}-[0-9a-f-]{27,})\/download\/(\d+)$/i
  );
  return match ? { id: match[1], index: Number(match[2]) } : null;
}

function loraJobAction(pathname) {
  const match = pathname.match(/^\/api\/lora-lab\/jobs\/([0-9a-f]{8}-[0-9a-f-]{27,})\/(refresh|download\/(weights|config))$/i);
  return match ? { id: match[1], action: match[2], artifact: match[3] || null } : null;
}

function loraDatasetResources(state, resourceIds) {
  const ids = [...new Set(Array.isArray(resourceIds) ? resourceIds.filter((id) => typeof id === "string") : [])];
  if (ids.length < 10 || ids.length > 500) {
    throw Object.assign(new Error("Le dataset doit contenir entre 10 et 500 images."), { statusCode: 400 });
  }
  const resources = ids.map((id) => state.resources.find((item) => item.id === id));
  if (resources.some((item) => !item || !["image/jpeg", "image/png", "image/webp"].includes(item.contentType))) {
    throw Object.assign(new Error("Le dataset contient une image absente ou incompatible."), { statusCode: 400 });
  }
  return resources;
}

function safeLoraName(value) {
  const name = String(value || "Mon LoRA").trim().replace(/\s+/g, " ");
  if (!name || name.length > 80) throw Object.assign(new Error("Le nom du LoRA doit contenir entre 1 et 80 caractères."), { statusCode: 400 });
  return name;
}

function apiKeyAction(pathname) {
  const match = pathname.match(/^\/api\/providers\/keys\/([a-z-]+)$/);
  return match ? match[1] : null;
}

async function verifyApiKey(id, apiKey) {
  if (id === "fal" || id === "fal-admin") {
    try {
      const account = await falClient.account(apiKey);
      if (id === "fal-admin" && !Number.isFinite(Number(account?.credits?.current_balance))) {
        throw Object.assign(new Error("fal a accepté la clé Admin sans renvoyer le solde."), { statusCode: 502 });
      }
      return { account: account?.username || null };
    } catch (error) {
      if (id === "fal" && error.remoteStatus === 403) return { scopeLimited: true };
      throw error;
    }
  }
  if (id === "heygen") {
    const account = await heygenClient.account(apiKey);
    return { account: account?.data?.username || account?.data?.email || null };
  }
  return verifyStandardApiKey(id, apiKey);
}

function providerSecretField(provider) {
  return { fal: "falApiKey", heygen: "heygenApiKey", krea: "kreaApiKey" }[provider] || null;
}

function providerLabel(provider) {
  return { fal: "fal", heygen: "HeyGen", krea: "Krea" }[provider] || provider;
}

function collectionRename(pathname) {
  const match = pathname.match(
    /^\/api\/collections\/([0-9a-f]{8}-[0-9a-f-]{27,})\/rename$/i
  );
  return match ? { id: match[1] } : null;
}

function collectionDelete(pathname) {
  const match = pathname.match(
    /^\/api\/collections\/([0-9a-f]{8}-[0-9a-f-]{27,})$/i
  );
  return match ? { id: match[1] } : null;
}

function referenceSetDelete(pathname) {
  const match = pathname.match(
    /^\/api\/reference-sets\/([0-9a-f]{8}-[0-9a-f-]{27,})$/i
  );
  return match ? { id: match[1] } : null;
}

function referenceSetIcon(pathname) {
  const match = pathname.match(
    /^\/api\/reference-set-icons\/([0-9a-f]{8}-[0-9a-f-]{27,})\/(\d+)$/i
  );
  return match ? { id: match[1], index: Number(match[2]) } : null;
}

function normalizeReferenceSetReferences(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 12) {
    const error = new Error("Un set doit contenir entre 1 et 12 références.");
    error.statusCode = 400;
    throw error;
  }
  const seen = new Set();
  return value.map((item, index) => {
    const id = typeof item?.id === "string" ? item.id.trim() : "";
    const label = typeof item?.label === "string" ? item.label.trim().slice(0, 120) : "";
    const url = typeof item?.url === "string" ? item.url.trim() : "";
    let isRemoteImage = false;
    try {
      isRemoteImage = isFalMediaUrl(url);
    } catch {
      isRemoteImage = false;
    }
    const isLocalResource = /^\/api\/resources\/[0-9a-f-]+\/content$/i.test(url);
    if (!id || seen.has(id) || (!isRemoteImage && !isLocalResource)) {
      const error = new Error(`La référence ${index + 1} est invalide ou dupliquée.`);
      error.statusCode = 400;
      throw error;
    }
    seen.add(id);
    return { kind: "image", id, label: label || `Référence ${index + 1}`, url };
  });
}

function resultUrls(value, urls = [], depth = 0) {
  if (depth > 5 || value === null || value === undefined) return urls;
  if (typeof value === "string") {
    try {
      const parsed = new URL(value);
      if (parsed.protocol === "https:") urls.push(parsed.href);
    } catch {
      // Non-URL result data is kept in state but cannot be downloaded.
    }
    return urls;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => resultUrls(item, urls, depth + 1));
  } else if (typeof value === "object") {
    Object.values(value).forEach((item) => resultUrls(item, urls, depth + 1));
  }
  return [...new Set(urls)];
}

function isFalMediaUrl(value) {
  const url = new URL(value);
  return url.protocol === "https:" && (
    url.hostname === "fal.media" || url.hostname.endsWith(".fal.media")
  );
}

function isHeyGenMediaUrl(value) {
  const url = new URL(value);
  return url.protocol === "https:" && (
    url.hostname === "files.heygen.com" || url.hostname.endsWith(".heygen.ai")
  );
}

function isKreaMediaUrl(value) {
  const url = new URL(value);
  return url.protocol === "https:" && (
    url.hostname === "krea.ai" || url.hostname.endsWith(".krea.ai")
  );
}

function isTrustedProviderMediaUrl(value) {
  try { return isFalMediaUrl(value) || isHeyGenMediaUrl(value) || isKreaMediaUrl(value); } catch { return false; }
}

function resultAssets(value, assets = [], depth = 0) {
  if (depth > 5 || value === null || value === undefined) return assets;
  if (Array.isArray(value)) {
    value.forEach((item) => resultAssets(item, assets, depth + 1));
  } else if (typeof value === "object") {
    if (typeof value.url === "string" && resultUrls(value.url).length && isDisplayMedia(value)) {
      assets.push({
        url: value.url,
        contentType: typeof value.content_type === "string" ? value.content_type : ""
      });
    } else {
      Object.values(value).forEach((item) => resultAssets(item, assets, depth + 1));
    }
  }
  return assets;
}

function mediaExtension(asset, contentType) {
  const fromUrl = path.extname(new URL(asset.url).pathname).slice(0, 8);
  if (fromUrl) return fromUrl.toLowerCase();
  if (contentType === "image/jpeg") return ".jpg";
  if (contentType === "image/png") return ".png";
  if (contentType === "video/mp4") return ".mp4";
  if (contentType === "video/webm" || contentType === "audio/webm") return ".webm";
  return ".bin";
}

function extensionForContentType(contentType) {
  return ({
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
    "audio/mpeg": ".mp3",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/webm": ".webm",
    "audio/mp4": ".m4a"
  })[contentType] || ".bin";
}

function resourceMediaType(contentType) {
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("video/")) return "video";
  if (contentType.startsWith("audio/")) return "music";
  return null;
}

function safeUploadName(value) {
  let decoded = "";
  try {
    decoded = decodeURIComponent(String(value || ""));
  } catch {
    decoded = String(value || "");
  }
  const name = path.basename(decoded).trim().replace(/[<>:"\/\\|?*\u0000-\u001f]/g, "_");
  if (!name || name.length > 180) {
    const error = new Error("Le nom du fichier doit contenir entre 1 et 180 caractères.");
    error.statusCode = 400;
    throw error;
  }
  return name;
}

async function receiveResource(request, temporaryPath) {
  let size = 0;
  const limiter = new Transform({
    transform(chunk, encoding, callback) {
      size += chunk.length;
      if (size > maximumResourceBytes) {
        const error = new Error("La ressource dépasse la limite locale de 512 Mio.");
        error.statusCode = 413;
        callback(error);
        return;
      }
      callback(null, chunk);
    }
  });
  await pipeline(request, limiter, createWriteStream(temporaryPath, { flags: "wx" }));
  return size;
}

function isPrivateNetworkAddress(address) {
  const value = String(address || "").toLowerCase();
  if (!value) return true;
  if (value === "::1" || value === "::" || value.startsWith("fe80:") ||
      value.startsWith("fc") || value.startsWith("fd")) return true;
  const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  const ipv4 = mapped || (/^\d+\.\d+\.\d+\.\d+$/.test(value) ? value : "");
  if (!ipv4) return false;
  const octets = ipv4.split(".").map(Number);
  return octets[0] === 10 || octets[0] === 127 || octets[0] === 0 ||
    (octets[0] === 169 && octets[1] === 254) ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168) ||
    (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) ||
    octets[0] >= 224;
}

async function validateReferenceLibraryUrl(value) {
  let url;
  try {
    url = new URL(String(value || ""));
  } catch {
    const error = new Error("L’URL originale de la bibliothèque est invalide.");
    error.statusCode = 400;
    throw error;
  }
  if (url.protocol !== "https:" || url.hostname !== referenceLibraryHost ||
      url.username || url.password || url.port) {
    const error = new Error("Cette source de bibliothèque n’est pas autorisée.");
    error.statusCode = 403;
    throw error;
  }
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateNetworkAddress(address))) {
    const error = new Error("La destination réseau de cette référence est refusée.");
    error.statusCode = 403;
    throw error;
  }
  return url;
}

function validateReferenceLibraryImport(body) {
  if (body?.type !== "barz:import-reference" || body?.schemaVersion !== "1.0" ||
      body?.source !== "barz-ai-lib" || !body?.asset || typeof body.asset !== "object") {
    const error = new Error("Le message de la bibliothèque est invalide ou incompatible.");
    error.statusCode = 400;
    throw error;
  }
  const assetId = String(body.asset.id || "").trim();
  if (!assetId || assetId.length > 700) {
    const error = new Error("L’identifiant de l’asset est invalide.");
    error.statusCode = 400;
    throw error;
  }
  return { assetId, asset: body.asset };
}

async function downloadReferenceLibraryImage(asset, temporaryPath) {
  let currentUrl = await validateReferenceLibraryUrl(asset.originalUrl);
  for (let redirects = 0; redirects <= 4; redirects += 1) {
    const remote = await fetch(currentUrl, {
      redirect: "manual",
      headers: { Accept: "image/png,image/jpeg,image/webp,image/gif" }
    });
    if ([301, 302, 303, 307, 308].includes(remote.status)) {
      if (redirects === 4) {
        const error = new Error("La référence distante contient trop de redirections.");
        error.statusCode = 502;
        throw error;
      }
      const location = remote.headers.get("location");
      if (!location) {
        const error = new Error("La redirection de la bibliothèque est incomplète.");
        error.statusCode = 502;
        throw error;
      }
      currentUrl = await validateReferenceLibraryUrl(new URL(location, currentUrl).href);
      continue;
    }
    if (!remote.ok || !remote.body) {
      const error = new Error(`La bibliothèque n’a pas fourni l’original (HTTP ${remote.status}).`);
      error.statusCode = 502;
      throw error;
    }
    const contentType = String(remote.headers.get("content-type") || "")
      .split(";", 1)[0].trim().toLowerCase();
    if (!referenceLibraryImageTypes.has(contentType)) {
      const error = new Error("La bibliothèque a renvoyé un format non pris en charge.");
      error.statusCode = 415;
      throw error;
    }
    const announcedSize = Number(remote.headers.get("content-length") || 0);
    if (announcedSize > maximumResourceBytes) {
      const error = new Error("La référence dépasse la limite locale de 512 Mio.");
      error.statusCode = 413;
      throw error;
    }
    let size = 0;
    const limiter = new Transform({
      transform(chunk, encoding, callback) {
        size += chunk.length;
        if (size > maximumResourceBytes) {
          const error = new Error("La référence dépasse la limite locale de 512 Mio.");
          error.statusCode = 413;
          callback(error);
          return;
        }
        callback(null, chunk);
      }
    });
    await pipeline(Readable.fromWeb(remote.body), limiter,
      createWriteStream(temporaryPath, { flags: "wx" }));
    return { contentType, size, finalUrl: currentUrl.href };
  }
  throw new Error("La référence distante n’a pas pu être téléchargée.");
}

function resourcePath(resource) {
  const resolved = path.resolve(uploadDirectory, resource.storageName || "");
  if (!resolved.startsWith(`${uploadDirectory}${path.sep}`)) {
    const error = new Error("Chemin de ressource refusé.");
    error.statusCode = 403;
    throw error;
  }
  return resolved;
}

function loraWeightsPath(artifact) {
  const resolved = path.resolve(loraWeightsDirectory, artifact?.localStorageName || "");
  if (!resolved.startsWith(`${loraWeightsDirectory}${path.sep}`)) {
    const error = new Error("Chemin de poids LoRA refusé.");
    error.statusCode = 403;
    throw error;
  }
  return resolved;
}

function decodedHeader(request, name, maximumLength) {
  const raw = Array.isArray(request.headers[name])
    ? request.headers[name][0]
    : request.headers[name];
  let value;
  try {
    value = decodeURIComponent(String(raw || ""));
  } catch {
    throw Object.assign(new Error(`Métadonnée ${name} invalide.`), { statusCode: 400 });
  }
  value = value.trim().replace(/\s+/g, " ");
  if (value.length > maximumLength) {
    throw Object.assign(new Error(`Métadonnée ${name} trop longue.`), { statusCode: 400 });
  }
  return value;
}

function resolveReferenceAsset(state, reference) {
  const resourceMatch = reference.id.match(/^resource:([0-9a-f-]+)$/i);
  if (resourceMatch) {
    const resource = state.resources.find((item) => item.id === resourceMatch[1]);
    return resource ? { kind: "resource", resource } : null;
  }
  const generatedMatch = reference.id.match(/^generated:([0-9a-f-]+):(\d+)$/i);
  if (!generatedMatch) return null;
  const job = state.jobs.find((item) => item.id === generatedMatch[1]);
  const index = Number(generatedMatch[2]);
  const asset = resultAssets(job?.result)[index];
  return job && asset ? { kind: "generated", job, asset, index } : null;
}

function validateGenerationReferences(state, references, provider = "fal") {
  for (const reference of references || []) {
    const resolved = resolveReferenceAsset(state, reference);
    if (!resolved) throw Object.assign(new Error("Une référence a été supprimée ou n’existe plus dans Assets. Remplace-la dans le deck."), { statusCode: 400 });
    if (resolved.kind === "resource") {
      const resource = resolved.resource;
      const expectedKind = resource.mediaType === "music" ? "audio" : resource.mediaType;
      const allowedTypes = provider === "heygen"
        ? [
            "image/png", "image/jpeg",
            "audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/webm",
            "video/mp4", "video/webm", "video/quicktime"
          ]
        : [
            "image/png", "image/jpeg", "image/webp",
            "audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/webm",
            "video/mp4", "video/webm", "video/quicktime"
          ];
      const maximumBytes = provider === "heygen" ? 32_000_000 : provider === "krea" ? 75_000_000 : 100_000_000;
      if (reference.url !== `/api/resources/${resource.id}/content` || reference.kind !== expectedKind ||
          !allowedTypes.includes(resource.contentType) || resource.size > maximumBytes) {
        const formats = provider === "heygen"
          ? "une image, un son ou une vidéo compatible de 32 Mo maximum"
          : provider === "krea"
            ? "une image PNG, JPEG ou WebP de 75 Mo maximum"
          : "un média compatible de 100 Mo maximum";
        throw Object.assign(new Error(`Référence locale incompatible : choisis ${formats}.`), { statusCode: 400 });
      }
    } else {
      const expectedMediaType = reference.kind === "audio" ? "music" : reference.kind;
      if (resolved.job.mediaType !== expectedMediaType || reference.url !== resolved.asset.url || !isTrustedProviderMediaUrl(reference.url)) {
        throw Object.assign(new Error("Le média de référence ne correspond plus à l’asset sélectionné."), { statusCode: 400 });
      }
    }
  }
}

async function stageHeyGenReferences(input, state, apiKey) {
  const staged = structuredClone(input);
  const convertItem = async (item) => {
    const value = item?.type === "url" ? String(item.url || "") : "";
    const match = value.match(/^\/api\/resources\/([0-9a-f-]+)\/content$/i);
    if (match) {
      const resource = state.resources.find((candidate) => candidate.id === match[1]);
      if (!resource) throw Object.assign(new Error("Une référence locale a été supprimée."), { statusCode: 400 });
      const assetId = await heygenClient.uploadAsset(apiKey, {
        data: await readFile(resourcePath(resource)),
        contentType: resource.contentType,
        name: resource.originalName || resource.name || `${resource.id}${path.extname(resource.storageName)}`
      });
      return { type: "asset_id", asset_id: assetId };
    }
    let parsed;
    try { parsed = new URL(value); } catch { parsed = null; }
    if (!parsed || parsed.protocol !== "https:" || parsed.username || parsed.password) {
      throw Object.assign(new Error("Adresse de référence HeyGen invalide."), { statusCode: 400 });
    }
    return { type: "url", url: parsed.href };
  };
  if (staged.image) staged.image = await convertItem(staged.image);
  for (const field of ["reference_images", "reference_videos", "reference_audio"]) {
    if (Array.isArray(staged[field])) {
      staged[field] = await Promise.all(staged[field].map(convertItem));
    }
  }
  return staged;
}

async function stageKreaReferences(input, state, references, apiKey) {
  const staged = structuredClone(input);
  const referenceFields = [
    "image_url", "image_urls", "reference_image_url", "reference_image_urls"
  ];
  const replaceUrl = async (value) => {
    try {
      if (isKreaMediaUrl(value)) return value;
    } catch { /* The reference resolver below will provide a useful error. */ }
    const reference = (references || []).find((item) => item.kind === "image" && item.url === value);
    if (!reference) {
      throw Object.assign(new Error("La référence Krea ne correspond plus au média sélectionné."), { statusCode: 400 });
    }
    const source = await readReferenceAsset(state, reference);
    const label = reference.label || "barz-reference";
    const name = path.extname(label) ? label : `${label}${extensionForContentType(source.contentType)}`;
    return kreaClient.uploadAsset(apiKey, { ...source, name });
  };
  for (const field of referenceFields) {
    if (Array.isArray(staged[field])) staged[field] = await Promise.all(staged[field].map(replaceUrl));
    else if (staged[field]) staged[field] = await replaceUrl(staged[field]);
  }
  return staged;
}

async function readReferenceAsset(state, reference) {
  const resolved = resolveReferenceAsset(state, reference);
  if (resolved?.kind === "resource") {
    return {
      data: await readFile(resourcePath(resolved.resource)),
      contentType: resolved.resource.contentType || "application/octet-stream"
    };
  }
  const remoteUrl = resolved?.asset?.url || reference.url;
  if (!isTrustedProviderMediaUrl(remoteUrl)) {
    const error = new Error("Seuls les médias issus d’un fournisseur reconnu et les ressources locales peuvent être utilisés.");
    error.statusCode = 400;
    throw error;
  }
  const remote = await fetch(remoteUrl);
  if (!remote.ok) {
    const error = new Error("Une image de référence n’est plus disponible pour créer sa miniature.");
    error.statusCode = 502;
    throw error;
  }
  return {
    data: Buffer.from(await remote.arrayBuffer()),
    contentType: remote.headers.get("content-type") || "image/jpeg"
  };
}

async function cacheReferenceSetIcons(state, setId, references) {
  await mkdir(referenceIconDirectory, { recursive: true });
  const cached = [];
  try {
    for (const [index, reference] of references.entries()) {
      const source = await readReferenceAsset(state, reference);
      let data = source.data;
      let contentType = source.contentType;
      let extension = extensionForContentType(contentType) || ".img";
      try {
        data = await createImageThumbnail(source.data);
        contentType = "image/jpeg";
        extension = ".jpg";
      } catch {
        // The original remains a durable preview if FFmpeg is unavailable.
      }
      const snapshotFile = `${setId}-${index}${extension}`;
      const filePath = path.resolve(referenceIconDirectory, snapshotFile);
      if (!filePath.startsWith(`${referenceIconDirectory}${path.sep}`)) {
        const error = new Error("Chemin de miniature refusé.");
        error.statusCode = 403;
        throw error;
      }
      await writeFile(filePath, data, { flag: "wx" });
      cached.push({
        ...reference,
        snapshotFile,
        snapshotContentType: contentType
      });
    }
    return cached;
  } catch (error) {
    await Promise.all(cached.map((reference) => (
      unlink(path.join(referenceIconDirectory, reference.snapshotFile)).catch(() => {})
    )));
    throw error;
  }
}

function publicReferenceSet(state, referenceSet) {
  return {
    ...referenceSet,
    references: referenceSet.references.map((reference, index) => {
      const { snapshotFile, snapshotContentType, ...publicReference } = reference;
      return {
        ...publicReference,
        previewUrl: snapshotFile
          ? `/api/reference-set-icons/${referenceSet.id}/${index}`
          : reference.url,
        missing: !resolveReferenceAsset(state, reference)
      };
    })
  };
}

async function serveReferenceSetIcon(response, route) {
  const state = await store.read();
  const referenceSet = state.referenceSets.find((item) => item.id === route.id);
  const reference = referenceSet?.references?.[route.index];
  if (!reference?.snapshotFile) {
    const error = new Error("Miniature de référence introuvable.");
    error.statusCode = 404;
    throw error;
  }
  const filePath = path.resolve(referenceIconDirectory, reference.snapshotFile);
  if (!filePath.startsWith(`${referenceIconDirectory}${path.sep}`)) {
    const error = new Error("Chemin de miniature refusé.");
    error.statusCode = 403;
    throw error;
  }
  const fileStat = await stat(filePath);
  response.writeHead(200, {
    "Content-Type": reference.snapshotContentType || "image/jpeg",
    "Content-Length": fileStat.size,
    "Cache-Control": "private, max-age=86400"
  });
  await pipeline(createReadStream(filePath), response);
}

async function cleanupReferenceSetIcons(referenceSet) {
  await Promise.all((referenceSet.references || []).map((reference) => {
    if (!reference.snapshotFile) return Promise.resolve();
    const filePath = path.resolve(referenceIconDirectory, reference.snapshotFile);
    if (!filePath.startsWith(`${referenceIconDirectory}${path.sep}`)) return Promise.resolve();
    return unlink(filePath).catch(() => {});
  }));
}

function resolveAssetSelection(state, item) {
  if (item?.kind === "resource" || item?.resourceId) {
    const resource = state.resources.find((candidate) => candidate.id === item.resourceId);
    if (!resource) {
      const error = new Error("Une ressource sélectionnée est introuvable.");
      error.statusCode = 404;
      throw error;
    }
    return { kind: "resource", resource, mediaType: resource.mediaType };
  }
  const job = state.jobs.find((candidate) => candidate.id === item?.jobId);
  const index = Number(item?.index);
  const asset = resultAssets(job?.result)[index];
  if (!job || !Number.isInteger(index) || !asset || !isTrustedProviderMediaUrl(asset.url)) {
    const error = new Error("Un média sélectionné est introuvable.");
    error.statusCode = 404;
    throw error;
  }
  return { kind: "generated", job, asset, index, mediaType: job.mediaType };
}

function selectedAssetKey(asset) {
  return asset.kind === "resource"
    ? `resource:${asset.resource.id}`
    : `generated:${asset.job.id}:${asset.index}`;
}

function normalizeAssetBaseName(value) {
  const name = typeof value === "string"
    ? value.trim().replace(/\.(jpe?g|png|webm|mp4|mov|wav|mp3)$/i, "")
    : "";
  const hasReservedCharacter = /[<>:"\/\\|?*\u0000-\u001f]/.test(name);
  if (!name || name.length > 80 || hasReservedCharacter || /[. ]$/.test(name)) {
    const error = new Error(
      "Le nom doit contenir entre 1 et 80 caractères, sans caractère réservé."
    );
    error.statusCode = 400;
    throw error;
  }
  return name;
}

function assetBaseName(job, index, fallback) {
  return job.assetNames?.[String(index)] || fallback;
}

function downloadDisposition(baseName, extension) {
  const fullName = `${baseName}${extension}`;
  const asciiName = fullName.normalize("NFKD").replace(/[^\x20-\x7e]/g, "_");
  return `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fullName)}`;
}

function validateArchiveFormat(selected, format) {
  const mediaTypes = new Set(selected.map((item) => item.mediaType));
  if (format === "original") return;
  if (["jpg", "png"].includes(format) && mediaTypes.size === 1 && mediaTypes.has("image")) {
    return;
  }
  if (format === "webm" && !mediaTypes.has("image")) return;
  const error = new Error("Le format choisi n’est pas compatible avec cette sélection.");
  error.statusCode = 400;
  throw error;
}

async function buildAssetsArchive(state, selection, format) {
  if (!Array.isArray(selection) || selection.length < 1 || selection.length > 50) {
    const error = new Error("Sélectionne entre 1 et 50 médias.");
    error.statusCode = 400;
    throw error;
  }
  const selected = selection.map((item) => resolveAssetSelection(state, item));
  validateArchiveFormat(selected, format);

  let totalBytes = 0;
  const entries = [];
  for (const [position, item] of selected.entries()) {
    let input;
    let contentType;
    if (item.kind === "resource") {
      input = await readFile(resourcePath(item.resource));
      contentType = item.resource.contentType;
    } else {
      const remote = await fetch(item.asset.url);
      if (!remote.ok) {
        const error = new Error("Un média fal n’est plus disponible.");
        error.statusCode = 502;
        throw error;
      }
      input = Buffer.from(await remote.arrayBuffer());
      contentType = item.asset.contentType || remote.headers.get("content-type") || "";
    }
    const converted = await convertMedia(input, contentType, format);
    totalBytes += converted.data.length;
    if (totalBytes > 536_870_912) {
      const error = new Error("L’archive dépasse la limite locale de 512 Mio.");
      error.statusCode = 413;
      throw error;
    }
    const extension = converted.extension || (item.kind === "resource"
      ? path.extname(item.resource.storageName) || extensionForContentType(contentType)
      : mediaExtension(item.asset, contentType));
    const fallback = item.kind === "resource"
      ? `resource-${String(position + 1).padStart(2, "0")}`
      : `barz-${String(position + 1).padStart(2, "0")}-${item.job.id.slice(0, 8)}`;
    const baseName = item.kind === "resource"
      ? item.resource.name || fallback
      : assetBaseName(item.job, item.index, fallback);
    const createdAt = item.kind === "resource" ? item.resource.createdAt : item.job.createdAt;
    entries.push({ name: `${baseName}${extension}`, data: converted.data, date: new Date(createdAt) });
  }
  return createStoredZip(entries);
}

async function serveResource(request, response, route) {
  const state = await store.read();
  const resource = state.resources.find((item) => item.id === route.id);
  if (!resource) {
    const error = new Error("Ressource introuvable.");
    error.statusCode = 404;
    throw error;
  }
  const filePath = resourcePath(resource);
  const fileStat = await stat(filePath);
  const extension = path.extname(resource.storageName) || extensionForContentType(resource.contentType);
  const headers = {
    "Content-Type": resource.contentType || "application/octet-stream",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store"
  };
  if (route.action === "download") {
    headers["Content-Disposition"] = downloadDisposition(resource.name, extension);
  }

  const rangeHeader = route.action === "content" ? request.headers.range : null;
  if (rangeHeader) {
    const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
    const requestedStart = match?.[1] ? Number(match[1]) : null;
    const requestedEnd = match?.[2] ? Number(match[2]) : null;
    let start = requestedStart;
    let end = requestedEnd;

    if (match && start === null && end !== null) {
      start = Math.max(fileStat.size - end, 0);
      end = fileStat.size - 1;
    } else if (match && start !== null) {
      end = end === null ? fileStat.size - 1 : Math.min(end, fileStat.size - 1);
    }

    if (!match || start === null || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) ||
        start < 0 || end < start || start >= fileStat.size) {
      response.writeHead(416, { ...headers, "Content-Range": `bytes */${fileStat.size}` });
      response.end();
      return;
    }

    headers["Content-Range"] = `bytes ${start}-${end}/${fileStat.size}`;
    headers["Content-Length"] = end - start + 1;
    response.writeHead(206, headers);
    if (request.method === "HEAD") response.end();
    else await pipeline(createReadStream(filePath, { start, end }), response);
    return;
  }

  headers["Content-Length"] = fileStat.size;
  response.writeHead(200, headers);
  if (request.method === "HEAD") response.end();
  else await pipeline(createReadStream(filePath), response);
}

async function downloadJobResult(response, route) {
  const state = await store.read();
  const job = state.jobs.find((item) => item.id === route.id);
  const asset = resultAssets(job?.result)[route.index];
  if (!job || !asset || !isTrustedProviderMediaUrl(asset.url)) {
    const error = new Error("Résultat téléchargeable introuvable.");
    error.statusCode = 404;
    throw error;
  }
  const remote = await fetch(asset.url);
  if (!remote.ok || !remote.body) {
    const error = new Error("Le média du fournisseur n’est plus disponible.");
    error.statusCode = 502;
    throw error;
  }
  const contentType = asset.contentType || remote.headers.get("content-type") || "";
  const extension = mediaExtension(asset, contentType);
  const fallback = `barz-${job.id.slice(0, 8)}-${route.index + 1}`;
  const baseName = assetBaseName(job, route.index, fallback);
  response.writeHead(200, {
    "Content-Type": contentType || "application/octet-stream",
    "Content-Disposition": downloadDisposition(baseName, extension),
    "Cache-Control": "private, no-store"
  });
  try {
    await pipeline(remote.body, response);
  } catch (error) {
    if (error.code !== "ERR_STREAM_PREMATURE_CLOSE") throw error;
  }
}

function publicSubmissionError(error, provider = "fal", submissionAttempted = true) {
  if (provider === "krea" && (
    Number(error.remoteStatus) === 402 ||
    /api balance is separate|top up your api balance|insufficient api balance/i.test(error.message)
  )) {
    return "Solde API Krea insuffisant. Le portefeuille API est séparé des crédits Compute de ton abonnement : recharge le solde API dans Krea avant de relancer.";
  }
  if (Number(error.remoteStatus) === 422 && /blocked by the safety filter/i.test(error.message)) {
    return `${provider} (422) : Le filtre de sécurité du modèle a bloqué l’image. ` +
      "Il peut s’agir d’un faux positif : réessaie ou reformule légèrement.";
  }
  if (!submissionAttempted || error.remoteStatus) return error.message;
  return `L’état de la soumission ${provider} est incertain. Aucun nouvel essai automatique ne sera fait.`;
}

async function readJson(request, maximumBytes = maximumBodyBytes) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > maximumBytes) {
      const error = new Error(`Le paquet dépasse la limite de ${Math.ceil(maximumBytes / 1_048_576)} Mio.`);
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    const error = new Error("Le corps de la requête n’est pas un JSON valide.");
    error.statusCode = 400;
    throw error;
  }
}

async function readProxyBody(request) {
  if (request.method === "GET") return "";
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maximumBodyBytes) {
      const error = new Error("La négociation Director dépasse la limite locale.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function proxyFalRealtime(request, response) {
  const body = await readProxyBody(request);
  await handleFalProxyRequest({
    id: "barz-local-director",
    method: request.method,
    getRequestBody: async () => body,
    getHeaders: () => request.headers,
    getHeader: (name) => request.headers[String(name).toLowerCase()],
    sendHeader: (name, value) => response.setHeader(name, value),
    respondWith: (status, data) => {
      response.statusCode = status;
      response.setHeader("Content-Type", "application/json; charset=utf-8");
      response.end(typeof data === "string" ? JSON.stringify({ error: data }) : JSON.stringify(data));
    },
    sendResponse: async (remote) => {
      response.statusCode = remote.status;
      response.end(Buffer.from(await remote.arrayBuffer()));
    }
  }, falRealtimeProxyConfig);
}

async function serveStatic(request, response, url) {
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const decodedPath = decodeURIComponent(requestedPath);
  const filePath = path.resolve(publicDirectory, `.${decodedPath}`);

  if (!filePath.startsWith(`${publicDirectory}${path.sep}`)) {
    sendJson(response, 403, { error: "Chemin refusé." });
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) throw new Error("Not a file");
    const content = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": contentTypes.get(path.extname(filePath)) || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    response.end(content);
  } catch {
    sendJson(response, 404, { error: "Ressource introuvable." });
  }
}

async function handleApi(request, response, url) {
  addLocalCors(request, response);

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  if (["GET", "POST", "PUT"].includes(request.method) &&
      url.pathname === "/api/fal/proxy") {
    await proxyFalRealtime(request, response);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, {
      ok: true,
      version: "0.25.0",
      phase: "h3-max-director",
      paidGenerationEnabled: true
    });
    return;
  }

  if (url.pathname === "/api/update/status") {
    // This token must only be readable by the Aggregator's own page, not another localhost origin.
    response.removeHeader("Access-Control-Allow-Origin");
    if (request.method !== "GET") throw Object.assign(new Error("Méthode refusée."), { statusCode: 405 });
    sendJson(response, 200, await updateManager.status({ check: url.searchParams.get("check") === "1" }));
    return;
  }

  if (url.pathname === "/api/update/start") {
    response.removeHeader("Access-Control-Allow-Origin");
    if (request.method !== "POST") throw Object.assign(new Error("Méthode refusée."), { statusCode: 405 });
    const origin = request.headers.origin;
    if (![`http://127.0.0.1:${port}`, `http://localhost:${port}`].includes(origin) ||
        request.headers["x-barz-update-token"] !== updateManager.token ||
        !String(request.headers["content-type"] || "").startsWith("application/json")) {
      throw Object.assign(new Error("Action locale non autorisée."), { statusCode: 403 });
    }
    sendJson(response, 202, await updateManager.start());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/lora-lab/models") {
    sendJson(response, 200, {
      configured: await vault.has("falApiKey"),
      models: LORA_TRAINERS
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/lora-lab/quote") {
    const apiKey = await vault.get("falApiKey");
    if (!apiKey) throw Object.assign(new Error("Configure d’abord la clé fal."), { statusCode: 400 });
    const body = await readJson(request);
    const trainer = loraTrainer(body.trainerId);
    const steps = Math.round(Number(body.steps));
    if (!trainer || !Number.isFinite(steps) || steps < 100 || steps > 10_000) {
      throw Object.assign(new Error("Trainer ou nombre d’étapes invalide."), { statusCode: 400 });
    }
    const model = await falClient.verifyModel(apiKey, trainer.endpointId);
    sendJson(response, 200, {
      trainer,
      pricing: model.pricing,
      estimatedCost: estimateLoraTrainingCost(model.pricing, steps),
      verifiedAt: model.verifiedAt
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/lora-lab/train") {
    const apiKey = await vault.get("falApiKey");
    if (!apiKey) throw Object.assign(new Error("Configure d’abord la clé fal."), { statusCode: 400 });
    const body = await readJson(request);
    if (body.confirm !== true) throw Object.assign(new Error("La confirmation de la dépense est obligatoire."), { statusCode: 400 });
    const trainer = loraTrainer(body.trainerId);
    if (!trainer) throw Object.assign(new Error("Ce trainer n’est pas disponible."), { statusCode: 400 });
    const settings = {
      steps: Math.round(Number(body.steps)),
      learningRate: Number(body.learningRate),
      triggerPhrase: String(body.triggerPhrase || "").trim().slice(0, 80),
      caption: String(body.caption || "").trim().slice(0, 500),
      mode: ["subject", "style", "content", "balanced"].includes(body.mode) ? body.mode : trainer.defaults.mode,
      faceCrop: body.faceCrop !== false,
      outputFormat: body.outputFormat === "comfy" ? "comfy" : "fal"
    };
    if (!Number.isFinite(settings.steps) || settings.steps < 100 || settings.steps > 10_000 ||
        !Number.isFinite(settings.learningRate) || settings.learningRate <= 0 || settings.learningRate > 0.1) {
      throw Object.assign(new Error("Paramètres d’entraînement invalides."), { statusCode: 400 });
    }
    const currentState = await store.read();
    const resources = loraDatasetResources(currentState, body.resourceIds);
    const totalBytes = resources.reduce((sum, item) => sum + Number(item.size || 0), 0);
    if (totalBytes > 500_000_000) throw Object.assign(new Error("Le dataset dépasse 500 Mo."), { statusCode: 413 });
    const model = await falClient.verifyModel(apiKey, trainer.endpointId);
    const estimatedCost = estimateLoraTrainingCost(model.pricing, settings.steps);
    if ((estimatedCost === null && body.estimatedCost !== null) ||
        (estimatedCost !== null && Number(body.estimatedCost) !== estimatedCost)) {
      throw Object.assign(new Error("Le tarif fal a changé. Demande une nouvelle estimation."), { statusCode: 409 });
    }
    const entries = await Promise.all(resources.map(async (resource, index) => ({
      name: `${String(index + 1).padStart(3, "0")}-${safeUploadName(resource.originalName || resource.storageName)}`,
      data: await readFile(resourcePath(resource)),
      date: new Date(resource.createdAt || Date.now())
    })));
    const archive = createStoredZip(entries);
    const archiveUrl = await falClient.uploadArchive(apiKey, { data: archive, name: `barz-lora-${Date.now()}.zip` });
    const providerInput = buildLoraTrainingInput(trainer, model.inputSchema, settings, archiveUrl);
    const submission = await falClient.submit(apiKey, trainer.endpointId, providerInput);
    if (!submission?.request_id) throw new Error("fal n’a pas renvoyé d’identifiant d’entraînement.");
    const now = new Date().toISOString();
    const job = {
      id: randomUUID(),
      name: safeLoraName(body.name),
      trainerId: trainer.id,
      endpointId: trainer.endpointId,
      baseModel: trainer.baseModel,
      status: "submitted",
      requestId: submission.request_id,
      providerUrls: { status: submission.status_url || null, response: submission.response_url || null },
      datasetCount: resources.length,
      resourceIds: resources.map((item) => item.id),
      settings,
      pricing: model.pricing,
      estimatedCost,
      artifacts: { weights: null, config: null },
      error: null,
      createdAt: now,
      updatedAt: now
    };
    await store.update((state) => {
      state.loraTrainingJobs.unshift(job);
      state.loraTrainingJobs = state.loraTrainingJobs.slice(0, 100);
      state.activity.unshift({ id: randomUUID(), kind: "lora-training", message: `Entraînement LoRA lancé : ${job.name}`, createdAt: now });
      return state;
    });
    sendJson(response, 202, { job });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/lora-lab/import") {
    const apiKey = await vault.get("falApiKey");
    if (!apiKey) {
      throw Object.assign(new Error("Configure d’abord la clé fal pour publier le poids."), {
        statusCode: 400
      });
    }
    const contentType = String(request.headers["content-type"] || "")
      .split(";", 1)[0].trim().toLowerCase();
    if (contentType !== "application/octet-stream") {
      throw Object.assign(new Error("Envoie un fichier .safetensors."), { statusCode: 415 });
    }
    const originalName = safeUploadName(request.headers["x-barz-filename"]);
    if (path.extname(originalName).toLowerCase() !== ".safetensors") {
      throw Object.assign(new Error("Le fichier doit porter l’extension .safetensors."), {
        statusCode: 400
      });
    }
    const availableBaseModels = new Set(LORA_TRAINERS.map((item) => item.baseModel));
    const baseModel = decodedHeader(request, "x-barz-lora-base-model", 80);
    if (!availableBaseModels.has(baseModel)) {
      throw Object.assign(new Error("Ce modèle de base LoRA n’est pas pris en charge."), {
        statusCode: 400
      });
    }
    const fallbackName = path.basename(originalName, path.extname(originalName));
    const name = safeLoraName(decodedHeader(request, "x-barz-lora-name", 80) || fallbackName);
    const triggerPhrase = decodedHeader(request, "x-barz-lora-trigger", 80);
    const id = randomUUID();
    const storageName = `${id}-${originalName}`;
    const temporaryPath = path.join(loraWeightsDirectory, `${id}.uploading`);
    const finalPath = path.join(loraWeightsDirectory, storageName);
    let registered = false;
    try {
      const size = await receiveResource(request, temporaryPath);
      const validation = await validateSafetensorsFile(temporaryPath);
      const url = await falClient.uploadFile(apiKey, {
        data: await readFile(temporaryPath),
        contentType: "application/octet-stream",
        name: originalName,
        expirationSeconds: 31_536_000
      });
      await rename(temporaryPath, finalPath);
      const now = new Date().toISOString();
      const job = {
        id,
        name,
        source: "local-import",
        trainerId: "local-import",
        endpointId: null,
        baseModel,
        status: "completed",
        requestId: null,
        providerUrls: { status: null, response: null },
        datasetCount: 0,
        resourceIds: [],
        settings: { triggerPhrase, imported: true },
        pricing: null,
        estimatedCost: 0,
        artifacts: {
          weights: {
            url,
            contentType: "application/octet-stream",
            localStorageName: storageName,
            size
          },
          config: null
        },
        validation,
        error: null,
        createdAt: now,
        updatedAt: now
      };
      await store.update((state) => {
        state.loraTrainingJobs.unshift(job);
        state.loraTrainingJobs = state.loraTrainingJobs.slice(0, 100);
        state.activity.unshift({
          id: randomUUID(),
          kind: "lora-import",
          message: `Poids LoRA importé : ${job.name}`,
          createdAt: now
        });
        return state;
      });
      registered = true;
      sendJson(response, 201, { job });
    } catch (error) {
      await unlink(temporaryPath).catch(() => {});
      if (!registered) await unlink(finalPath).catch(() => {});
      throw error;
    }
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/lora-lab/jobs") {
    const state = await store.read();
    sendJson(response, 200, { jobs: state.loraTrainingJobs });
    return;
  }

  const loraRoute = loraJobAction(url.pathname);
  if (request.method === "POST" && loraRoute?.action === "refresh") {
    const apiKey = await vault.get("falApiKey");
    if (!apiKey) throw Object.assign(new Error("La clé fal n’est plus configurée."), { statusCode: 400 });
    const currentState = await store.read();
    const job = currentState.loraTrainingJobs.find((item) => item.id === loraRoute.id);
    if (!job) throw Object.assign(new Error("Entraînement LoRA introuvable."), { statusCode: 404 });
    if (!["submitted", "queued", "running"].includes(job.status)) {
      sendJson(response, 200, { job });
      return;
    }
    const remote = await falClient.queueUrlOrRequest(apiKey, job.providerUrls?.status, job.endpointId, job.requestId, "status");
    const status = statusFromFal(remote) || job.status;
    let result = null;
    let artifacts = job.artifacts;
    if (status === "completed") {
      result = await falClient.queueUrlOrRequest(apiKey, job.providerUrls?.response, job.endpointId, job.requestId, "response");
      artifacts = normalizeLoraArtifacts(result);
      if (!artifacts.weights) throw Object.assign(new Error("fal a terminé sans fournir le fichier de poids LoRA."), { statusCode: 502 });
    }
    let refreshedJob;
    await store.update((state) => {
      const index = state.loraTrainingJobs.findIndex((item) => item.id === job.id);
      refreshedJob = { ...state.loraTrainingJobs[index], status, artifacts, result, logs: Array.isArray(remote.logs) ? remote.logs.slice(-50) : [], error: remote.error || null, updatedAt: new Date().toISOString() };
      state.loraTrainingJobs[index] = refreshedJob;
      return state;
    });
    sendJson(response, 200, { job: refreshedJob });
    return;
  }

  if (request.method === "GET" && loraRoute?.artifact) {
    const state = await store.read();
    const job = state.loraTrainingJobs.find((item) => item.id === loraRoute.id);
    const artifact = job?.artifacts?.[loraRoute.artifact];
    if (!job || !artifact) {
      throw Object.assign(new Error("Fichier LoRA indisponible."), { statusCode: 404 });
    }
    const extension = loraRoute.artifact === "weights" ? ".safetensors" : ".json";
    const filename = `${job.name.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "") || "barz-lora"}${extension}`;
    const headers = {
      "Content-Type": artifact.contentType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store"
    };
    if (artifact.localStorageName) {
      const localPath = loraWeightsPath(artifact);
      const localStats = await stat(localPath).catch(() => null);
      if (!localStats?.isFile()) {
        throw Object.assign(new Error("Le poids LoRA local est introuvable."), {
          statusCode: 404
        });
      }
      response.writeHead(200, { ...headers, "Content-Length": localStats.size });
      await pipeline(createReadStream(localPath), response);
      return;
    }
    if (!artifact.url || !isFalMediaUrl(artifact.url)) {
      throw Object.assign(new Error("Fichier LoRA indisponible."), { statusCode: 404 });
    }
    const remote = await fetch(artifact.url, {
      redirect: "error",
      signal: AbortSignal.timeout(900_000)
    });
    if (!remote.ok || !remote.body) {
      throw Object.assign(new Error("Le fichier fal n’est plus accessible."), {
        statusCode: 502
      });
    }
    response.writeHead(200, headers);
    await pipeline(Readable.fromWeb(remote.body), response);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/director/info") {
    const apiKey = await vault.get("falApiKey");
    if (!apiKey) {
      sendJson(response, 200, { configured: false });
      return;
    }
    let model = null;
    try {
      model = await falClient.verifyModel(apiKey, "minimax/h3-max/director");
    } catch (error) {
      // Director is a realtime WMA endpoint and is occasionally absent from the
      // regular model catalog. Keep the official launch-page rate as a clearly
      // labelled fallback; authentication is still enforced by the local proxy.
      console.warn(`Director metadata fallback: ${error.message}`);
    }
    sendJson(response, 200, {
      configured: true,
      endpointId: model?.endpointId || "minimax/h3-max/director",
      pricing: model?.pricing || {
        unitPrice: 0.02,
        unit: "second",
        currency: "USD",
        fallback: true
      },
      modelUrl: model?.modelUrl || "https://fal.ai/models/minimax/h3-max/director",
      pricingSource: model?.pricing ? "fal-api" : "fal-launch-page-fallback"
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/director/references") {
    const apiKey = await vault.get("falApiKey");
    if (!apiKey) {
      const error = new Error("Configure d’abord la clé fal.");
      error.statusCode = 400;
      throw error;
    }
    const body = await readJson(request);
    const references = Array.isArray(body.references) ? body.references.slice(0, 16) : [];
    const currentState = await store.read();
    validateGenerationReferences(currentState, references);
    const staged = await stageReferenceImages({ image_urls: references.map((item) => item.url) },
      async (id) => {
        const resource = currentState.resources.find((item) => item.id === id);
        if (!resource) throw new Error("Une référence locale a été supprimée.");
        const filePath = resourcePath(resource);
        const fileInfo = await stat(filePath);
        if (fileInfo.size > 30_000_000) throw new Error("Une référence dépasse 30 Mo.");
        return { data: await readFile(filePath), contentType: resource.contentType,
          name: resource.originalName || resource.name || `${id}${path.extname(resource.storageName)}` };
      }, (resource) => falClient.uploadImage(apiKey, resource));
    sendJson(response, 200, { urls: staged.image_urls || [] });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/director/draft") {
    const raw = await readJson(request);
    const plan = Array.isArray(raw?.storyboardPlan) ? raw.storyboardPlan.slice(0, 16) : [];
    if (!String(raw?.prompt || "").trim() || plan.length < 2) {
      const error = new Error("Le brouillon Director doit contenir un univers et au moins deux images planifiées.");
      error.statusCode = 400;
      throw error;
    }
    const directorDraft = {
      prompt: String(raw.prompt).trim().slice(0, 50_000),
      aspectRatio: ["16:9", "9:16", "1:1"].includes(raw.aspectRatio) ? raw.aspectRatio : "16:9",
      resolution: ["480p", "768p", "1080p"].includes(raw.resolution) ? raw.resolution : "768p",
      chunkDuration: [5, 10, 15].includes(Number(raw.chunkDuration)) ? Number(raw.chunkDuration) : 5,
      memory: Math.max(1, Math.min(50, Number(raw.memory) || 12)),
      limit: [60, 120, 300, 600, 900].includes(Number(raw.limit)) ? Number(raw.limit) : 60,
      storyboardPlan: plan.map((item, index) => ({
        originalName: safeUploadName(item?.originalName),
        offset: index === 0 ? 0 : Math.max(3, Math.round(Number(item?.offset) || index * 5)),
        prompt: String(item?.prompt || "").trim().slice(0, 50_000)
      })),
      updatedAt: new Date().toISOString()
    };
    await store.update((state) => {
      state.directorDraft = directorDraft;
      return state;
    });
    sendJson(response, 200, { directorDraft });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/director/sessions") {
    const rawBody = await readJson(request);
    const body = rawBody && typeof rawBody === "object" ? rawBody : {};
    const currentState = await store.read();
    const resource = currentState.resources.find((item) => item.id === body.resourceId);
    if (!resource) {
      const error = new Error("L’enregistrement Director est introuvable.");
      error.statusCode = 404;
      throw error;
    }
    const sessionJob = createDirectorSessionJob(resource, body);
    await store.update((state) => {
      const index = state.jobs.findIndex((job) => (
        job.id === sessionJob.id || job.resourceId === resource.id
      ));
      if (index === -1) state.jobs.unshift(sessionJob);
      else state.jobs[index] = sessionJob;
      state.jobs = state.jobs.slice(0, 100);
      state.activity.unshift({
        id: randomUUID(),
        kind: "director-session",
        message: `Session Director comptabilisée : ${sessionJob.estimatedCost.toFixed(2)} $US`,
        createdAt: sessionJob.completedAt
      });
      state.activity = state.activity.slice(0, 200);
      return state;
    });
    sendJson(response, 201, { job: sessionJob });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/resources") {
    const contentType = String(request.headers["content-type"] || "")
      .split(";", 1)[0].trim().toLowerCase();
    const mediaType = resourceMediaType(contentType);
    if (!mediaType) {
      const error = new Error("Seuls les fichiers image, vidéo et audio sont acceptés.");
      error.statusCode = 415;
      throw error;
    }
    const originalName = safeUploadName(request.headers["x-barz-filename"]);
    const sourceExtension = path.extname(originalName).toLowerCase();
    const extension = /^\.[a-z0-9]{1,8}$/i.test(sourceExtension)
      ? sourceExtension
      : extensionForContentType(contentType);
    const id = randomUUID();
    const temporaryPath = path.join(uploadDirectory, `${id}.uploading`);
    const storageName = `${id}${extension}`;
    const finalPath = path.join(uploadDirectory, storageName);
    let size;
    try {
      size = await receiveResource(request, temporaryPath);
      if (size === 0) {
        const error = new Error("Le fichier envoyé est vide.");
        error.statusCode = 400;
        throw error;
      }
      await rename(temporaryPath, finalPath);
    } catch (error) {
      await unlink(temporaryPath).catch(() => {});
      throw error;
    }
    const now = new Date().toISOString();
    const rawBaseName = path.basename(originalName, path.extname(originalName))
      .slice(0, 80).replace(/[. ]+$/, "");
    const name = normalizeAssetBaseName(rawBaseName || "resource");
    const resource = {
      id,
      name,
      originalName,
      mediaType,
      contentType,
      size,
      storageName,
      collectionId: null,
      createdAt: now,
      updatedAt: now
    };
    try {
      await store.update((state) => {
        state.resources.unshift(resource);
        state.activity.unshift({
          id: randomUUID(),
          kind: "resource",
          message: `Ressource importée : ${name}`,
          createdAt: now
        });
        state.activity = state.activity.slice(0, 200);
        return state;
      });
    } catch (error) {
      await unlink(finalPath).catch(() => {});
      throw error;
    }
    sendJson(response, 201, { resource });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/reference-imports/from-library") {
    const body = await readJson(request);
    const { assetId, asset } = validateReferenceLibraryImport(body);
    const currentState = await store.read();
    const existing = currentState.resources.find((item) => (
      item.sourceLibrary === "barz-ai-lib" && item.sourceAssetId === assetId
    ));
    if (existing) {
      sendJson(response, 200, { resource: existing, duplicate: true });
      return;
    }

    const id = randomUUID();
    const temporaryPath = path.join(uploadDirectory, `${id}.uploading`);
    let downloaded;
    try {
      downloaded = await downloadReferenceLibraryImage(asset, temporaryPath);
    } catch (error) {
      await unlink(temporaryPath).catch(() => {});
      throw error;
    }
    const suggestedName = asset.name || path.basename(new URL(downloaded.finalUrl).pathname) || "library-reference";
    const originalName = safeUploadName(suggestedName);
    const sourceExtension = path.extname(originalName).toLowerCase();
    const extension = extensionForContentType(downloaded.contentType);
    const extensionMatchesType = downloaded.contentType === "image/jpeg"
      ? /^\.jpe?g$/i.test(sourceExtension)
      : sourceExtension === extension;
    const storedOriginalName = extensionMatchesType
      ? originalName
      : `${path.basename(originalName, sourceExtension)}${extension}`;
    const storageName = `${id}${extension}`;
    const finalPath = path.join(uploadDirectory, storageName);
    await rename(temporaryPath, finalPath);
    const now = new Date().toISOString();
    const rawBaseName = path.basename(originalName, path.extname(originalName))
      .slice(0, 80).replace(/[. ]+$/, "");
    const resource = {
      id,
      name: normalizeAssetBaseName(rawBaseName || "library-reference"),
      originalName: storedOriginalName,
      mediaType: "image",
      contentType: downloaded.contentType,
      size: downloaded.size,
      storageName,
      collectionId: null,
      sourceLibrary: "barz-ai-lib",
      sourceAssetId: assetId,
      sourcePageUrl: String(asset.sourcePageUrl || "").slice(0, 2_000),
      sourceOriginalUrl: downloaded.finalUrl,
      createdAt: now,
      updatedAt: now
    };
    try {
      await store.update((state) => {
        state.resources.unshift(resource);
        state.activity.unshift({
          id: randomUUID(),
          kind: "resource",
          message: `Référence importée depuis la bibliothèque : ${resource.name}`,
          createdAt: now
        });
        state.activity = state.activity.slice(0, 200);
        return state;
      });
    } catch (error) {
      await unlink(finalPath).catch(() => {});
      throw error;
    }
    sendJson(response, 201, { resource, duplicate: false });
    return;
  }

  const resourceRoute = resourceAction(url.pathname);
  if (["GET", "HEAD"].includes(request.method) && resourceRoute && resourceRoute.action !== "reveal") {
    await serveResource(request, response, resourceRoute);
    return;
  }

  if (request.method === "POST" && resourceRoute?.action === "reveal") {
    if (process.platform !== "win32") {
      const error = new Error("L’ouverture du dossier est disponible dans l’application Windows.");
      error.statusCode = 501;
      throw error;
    }
    const currentState = await store.read();
    const resource = currentState.resources.find((item) => item.id === resourceRoute.id);
    if (!resource) {
      const error = new Error("Cette ressource locale est introuvable.");
      error.statusCode = 404;
      throw error;
    }
    const filePath = resourcePath(resource);
    await stat(filePath);
    await revealFileInExplorer(filePath);
    sendJson(response, 200, { revealed: true });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/resources/delete") {
    const body = await readJson(request);
    const resourceIds = [...new Set(Array.isArray(body.resourceIds)
      ? body.resourceIds.filter((id) => typeof id === "string")
      : [])];
    if (resourceIds.length < 1 || resourceIds.length > 100) {
      const error = new Error("Sélectionne entre 1 et 100 ressources à supprimer.");
      error.statusCode = 400;
      throw error;
    }
    const currentState = await store.read();
    const resources = resourceIds.map((id) => currentState.resources.find((item) => item.id === id));
    if (resources.some((resource) => !resource)) {
      const error = new Error("Une ressource à supprimer est introuvable.");
      error.statusCode = 404;
      throw error;
    }
    const staged = [];
    try {
      for (const resource of resources) {
        const originalPath = resourcePath(resource);
        const stagedPath = `${originalPath}.deleting-${randomUUID()}`;
        await rename(originalPath, stagedPath);
        staged.push({ originalPath, stagedPath });
      }
      await store.update((state) => {
        const remainingIds = new Set(resourceIds);
        state.resources = state.resources.filter((resource) => !remainingIds.has(resource.id));
        state.trashedAssetKeys = (state.trashedAssetKeys || []).filter((key) =>
          !resourceIds.some((id) => key === `resource:${id}`));
        const now = new Date().toISOString();
        state.activity.unshift({
          id: randomUUID(),
          kind: "resource-delete",
          message: resources.length === 1
            ? `Ressource supprimée : ${resources[0].name}`
            : `${resources.length} ressources supprimées`,
          createdAt: now
        });
        state.activity = state.activity.slice(0, 200);
        return state;
      });
    } catch (error) {
      await Promise.all(staged.map(({ originalPath, stagedPath }) => (
        rename(stagedPath, originalPath).catch(() => {})
      )));
      throw error;
    }
    await Promise.all(staged.map(({ stagedPath }) => unlink(stagedPath).catch(() => {})));
    sendJson(response, 200, { resources });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/assets/trash") {
    const body = await readJson(request);
    if (!Array.isArray(body.selection) || body.selection.length < 1 || body.selection.length > 100) {
      const error = new Error("Sélectionne entre 1 et 100 assets à mettre à la corbeille.");
      error.statusCode = 400;
      throw error;
    }
    const current = await store.read();
    const keys = [...new Set(body.selection.map((item) => selectedAssetKey(resolveAssetSelection(current, item))))];
    await store.update((state) => {
      state.trashedAssetKeys = [...new Set([...(state.trashedAssetKeys || []), ...keys])];
      return state;
    });
    sendJson(response, 200, { keys });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/assets/restore") {
    const body = await readJson(request);
    if (!Array.isArray(body.keys) || body.keys.length < 1 || body.keys.length > 100 ||
        body.keys.some((key) => typeof key !== "string" || !/^(?:resource|generated):[0-9a-f-]+(?::\d+)?$/i.test(key))) {
      const error = new Error("Sélectionne entre 1 et 100 assets à restaurer.");
      error.statusCode = 400;
      throw error;
    }
    const keys = [...new Set(body.keys)];
    await store.update((state) => {
      const restored = new Set(keys);
      state.trashedAssetKeys = (state.trashedAssetKeys || []).filter((key) => !restored.has(key));
      return state;
    });
    sendJson(response, 200, { keys });
    return;
  }

  const referenceIconRoute = referenceSetIcon(url.pathname);
  if (request.method === "GET" && referenceIconRoute) {
    await serveReferenceSetIcon(response, referenceIconRoute);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/state") {
    const state = await store.read();
    sendJson(response, 200, {
      ...state,
      referenceSets: state.referenceSets.map((referenceSet) => (
        publicReferenceSet(state, referenceSet)
      )),
      providers: [{
        id: "fal",
        name: "fal",
        configured: await vault.has("falApiKey")
      }, {
        id: "heygen",
        name: "HeyGen",
        configured: await vault.has("heygenApiKey")
      }, {
        id: "krea",
        name: "Krea",
        configured: await vault.has("kreaApiKey")
      }],
      paidGenerationEnabled: true
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/reference-sets") {
    const body = await readJson(request);
    const name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
    if (!name || name.length > 60) {
      const error = new Error("Le nom du set doit contenir entre 1 et 60 caractères.");
      error.statusCode = 400;
      throw error;
    }
    const references = normalizeReferenceSetReferences(body.references);
    const currentState = await store.read();
    if (currentState.referenceSets.some((item) => (
      item.name.localeCompare(name, "fr", { sensitivity: "base" }) === 0
    ))) {
      const error = new Error("Un set de références porte déjà ce nom.");
      error.statusCode = 409;
      throw error;
    }
    const setId = randomUUID();
    const cachedReferences = await cacheReferenceSetIcons(currentState, setId, references);
    let referenceSet;
    let nextState;
    try {
      nextState = await store.update((state) => {
        const duplicate = state.referenceSets.some((item) => (
          item.name.localeCompare(name, "fr", { sensitivity: "base" }) === 0
        ));
        if (duplicate) {
          const error = new Error("Un set de références porte déjà ce nom.");
          error.statusCode = 409;
          throw error;
        }
        const now = new Date().toISOString();
        referenceSet = {
          id: setId,
          name,
          references: cachedReferences,
          createdAt: now,
          updatedAt: now
        };
        state.referenceSets.push(referenceSet);
        state.activity.unshift({
          id: randomUUID(),
          kind: "reference-set",
          message: `Set de références créé : ${name}`,
          createdAt: now
        });
        state.activity = state.activity.slice(0, 200);
        return state;
      });
    } catch (error) {
      await cleanupReferenceSetIcons({ references: cachedReferences });
      throw error;
    }
    sendJson(response, 201, { referenceSet: publicReferenceSet(nextState, referenceSet) });
    return;
  }

  const deleteReferenceSetRoute = referenceSetDelete(url.pathname);
  if (request.method === "DELETE" && deleteReferenceSetRoute) {
    let deletedReferenceSet;
    await store.update((state) => {
      const referenceSet = state.referenceSets.find((item) => (
        item.id === deleteReferenceSetRoute.id
      ));
      if (!referenceSet) {
        const error = new Error("Set de références introuvable.");
        error.statusCode = 404;
        throw error;
      }
      deletedReferenceSet = { ...referenceSet };
      state.referenceSets = state.referenceSets.filter((item) => item.id !== referenceSet.id);
      const now = new Date().toISOString();
      state.activity.unshift({
        id: randomUUID(),
        kind: "reference-set-delete",
        message: `Set de références supprimé : ${referenceSet.name}`,
        createdAt: now
      });
      state.activity = state.activity.slice(0, 200);
      return state;
    });
    await cleanupReferenceSetIcons(deletedReferenceSet);
    sendJson(response, 200, { referenceSet: deletedReferenceSet });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/collections") {
    const body = await readJson(request);
    const name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
    if (!name || name.length > 60) {
      const error = new Error("Le nom de collection doit contenir entre 1 et 60 caractères.");
      error.statusCode = 400;
      throw error;
    }
    let collection;
    let created = false;
    await store.update((state) => {
      collection = state.collections.find((item) => (
        item.name.localeCompare(name, "fr", { sensitivity: "base" }) === 0
      ));
      if (collection) return state;
      const now = new Date().toISOString();
      collection = { id: randomUUID(), name, createdAt: now, updatedAt: now };
      state.collections.push(collection);
      state.activity.unshift({
        id: randomUUID(),
        kind: "collection",
        message: `Collection créée : ${name}`,
        createdAt: now
      });
      created = true;
      return state;
    });
    sendJson(response, created ? 201 : 200, { collection, created });
    return;
  }

  const renameRoute = collectionRename(url.pathname);
  if (request.method === "POST" && renameRoute) {
    const body = await readJson(request);
    const name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
    if (!name || name.length > 60) {
      const error = new Error("Le nom de collection doit contenir entre 1 et 60 caractères.");
      error.statusCode = 400;
      throw error;
    }
    let renamedCollection;
    await store.update((state) => {
      const collection = state.collections.find((item) => item.id === renameRoute.id);
      if (!collection) {
        const error = new Error("Collection introuvable.");
        error.statusCode = 404;
        throw error;
      }
      const duplicate = state.collections.some((item) => (
        item.id !== collection.id &&
        item.name.localeCompare(name, "fr", { sensitivity: "base" }) === 0
      ));
      if (duplicate) {
        const error = new Error("Une collection porte déjà ce nom.");
        error.statusCode = 409;
        throw error;
      }
      const previousName = collection.name;
      collection.name = name;
      collection.updatedAt = new Date().toISOString();
      renamedCollection = { ...collection };
      state.activity.unshift({
        id: randomUUID(),
        kind: "collection",
        message: `Collection renommée : ${previousName} → ${name}`,
        createdAt: collection.updatedAt
      });
      return state;
    });
    sendJson(response, 200, { collection: renamedCollection });
    return;
  }

  const deleteCollectionRoute = collectionDelete(url.pathname);
  if (request.method === "DELETE" && deleteCollectionRoute) {
    let deletedCollection;
    let movedMediaCount = 0;
    await store.update((state) => {
      const collection = state.collections.find((item) => item.id === deleteCollectionRoute.id);
      if (!collection) {
        const error = new Error("Collection introuvable.");
        error.statusCode = 404;
        throw error;
      }
      deletedCollection = { ...collection };
      const now = new Date().toISOString();
      state.collections = state.collections.filter((item) => item.id !== collection.id);
      state.jobs = state.jobs.map((job) => {
        if (job.collectionId !== collection.id) return job;
        movedMediaCount += resultAssets(job.result).length || 1;
        return { ...job, collectionId: null, assetsUpdatedAt: now };
      });
      state.resources = state.resources.map((resource) => {
        if (resource.collectionId !== collection.id) return resource;
        movedMediaCount += 1;
        return { ...resource, collectionId: null, updatedAt: now };
      });
      state.activity.unshift({
        id: randomUUID(),
        kind: "collection-delete",
        message: `Collection supprimée : ${collection.name}`,
        createdAt: now
      });
      state.activity = state.activity.slice(0, 200);
      return state;
    });
    sendJson(response, 200, { collection: deletedCollection, movedMediaCount });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/assets/rename") {
    const body = await readJson(request);
    const baseName = normalizeAssetBaseName(body.baseName);
    const rawSelection = Array.isArray(body.selection) ? body.selection : [];
    const selection = rawSelection.filter((item, index) => {
      const identity = item.kind === "resource" || item.resourceId
        ? `resource:${item.resourceId}`
        : `generated:${item.jobId}:${Number(item.index)}`;
      return rawSelection.findIndex((candidate) => {
        const candidateIdentity = candidate.kind === "resource" || candidate.resourceId
          ? `resource:${candidate.resourceId}`
          : `generated:${candidate.jobId}:${Number(candidate.index)}`;
        return candidateIdentity === identity;
      }) === index;
    });
    if (!selection.length || selection.length > 100) {
      const error = new Error("Sélectionne entre 1 et 100 médias.");
      error.statusCode = 400;
      throw error;
    }
    let renamedJobs = [];
    let renamedResources = [];
    const names = [];
    await store.update((state) => {
      const resolved = selection.map((item) => resolveAssetSelection(state, item));
      const digits = Math.max(3, String(resolved.length).length);
      resolved.forEach((asset, position) => {
        const name = resolved.length === 1
          ? baseName
          : `${baseName}_${String(position + 1).padStart(digits, "0")}`;
        if (asset.kind === "resource") {
          asset.resource.name = name;
          asset.resource.updatedAt = new Date().toISOString();
          names.push({ kind: "resource", resourceId: asset.resource.id, name });
        } else {
          asset.job.assetNames = {
            ...(asset.job.assetNames || {}),
            [String(asset.index)]: name
          };
          asset.job.assetsUpdatedAt = new Date().toISOString();
          names.push({
            kind: "generated",
            jobId: asset.job.id,
            index: asset.index,
            name
          });
        }
      });
      const jobIds = new Set(resolved.filter((item) => item.kind === "generated")
        .map((item) => item.job.id));
      const resourceIds = new Set(resolved.filter((item) => item.kind === "resource")
        .map((item) => item.resource.id));
      renamedJobs = state.jobs.filter((job) => jobIds.has(job.id));
      renamedResources = state.resources.filter((resource) => resourceIds.has(resource.id));
      state.activity.unshift({
        id: randomUUID(),
        kind: "asset-rename",
        message: resolved.length === 1
          ? `Asset renommé : ${baseName}`
          : `${resolved.length} assets renommés : ${baseName}_…`,
        createdAt: new Date().toISOString()
      });
      return state;
    });
    sendJson(response, 200, { jobs: renamedJobs, resources: renamedResources, names });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/assets/move") {
    const body = await readJson(request);
    const legacySelection = Array.isArray(body.jobIds)
      ? body.jobIds.map((jobId) => ({ kind: "generated", jobId, index: 0 }))
      : [];
    const selection = Array.isArray(body.selection) ? body.selection : legacySelection;
    if (!selection.length || selection.length > 100) {
      const error = new Error("Sélectionne entre 1 et 100 médias.");
      error.statusCode = 400;
      throw error;
    }
    let movedJobs = [];
    let movedResources = [];
    await store.update((state) => {
      const collection = body.collectionId
        ? state.collections.find((item) => item.id === body.collectionId)
        : null;
      if (body.collectionId && !collection) {
        const error = new Error("Collection introuvable.");
        error.statusCode = 404;
        throw error;
      }
      const now = new Date().toISOString();
      const resolved = selection.map((item) => resolveAssetSelection(state, item));
      const jobIds = new Set(resolved.filter((item) => item.kind === "generated")
        .map((item) => item.job.id));
      const resourceIds = new Set(resolved.filter((item) => item.kind === "resource")
        .map((item) => item.resource.id));
      state.jobs = state.jobs.map((job) => {
        if (!jobIds.has(job.id) || job.status !== "completed") return job;
        const moved = { ...job, collectionId: collection?.id || null };
        movedJobs.push(moved);
        return moved;
      });
      state.resources = state.resources.map((resource) => {
        if (!resourceIds.has(resource.id)) return resource;
        const moved = { ...resource, collectionId: collection?.id || null, updatedAt: now };
        movedResources.push(moved);
        return moved;
      });
      if (collection) collection.updatedAt = now;
      return state;
    });
    sendJson(response, 200, { jobs: movedJobs, resources: movedResources });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/assets/archive") {
    const body = await readJson(request);
    const format = String(body.format || "jpg").toLowerCase();
    if (!["jpg", "png", "webm", "original"].includes(format)) {
      const error = new Error("Format d’archive inconnu.");
      error.statusCode = 400;
      throw error;
    }
    const archive = await buildAssetsArchive(await store.read(), body.selection, format);
    response.writeHead(200, {
      "Content-Type": "application/zip",
      "Content-Disposition": "attachment; filename=barz-assets.zip",
      "Content-Length": archive.length,
      "Cache-Control": "private, no-store"
    });
    response.end(archive);
    return;
  }

  const downloadRoute = jobDownload(url.pathname);
  if (request.method === "GET" && downloadRoute) {
    await downloadJobResult(response, downloadRoute);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/providers/keys") {
    const providers = await Promise.all(API_KEY_PROVIDERS.map(async ({ field, ...provider }) => ({
      ...provider,
      configured: await vault.has(field)
    })));
    sendJson(response, 200, {
      providers,
      storage: "Coffre local chiffré partagé avec Prompt Atlas"
    });
    return;
  }

  const apiKeyRoute = apiKeyAction(url.pathname);
  if (request.method === "PUT" && apiKeyRoute) {
    const provider = apiKeyProvider(apiKeyRoute);
    if (!provider) {
      const error = new Error("Fournisseur API inconnu.");
      error.statusCode = 404;
      throw error;
    }
    const body = await readJson(request);
    const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    if (apiKey.length < 8 || apiKey.length > 500) {
      const error = new Error(`La clé ${provider.label} semble incomplète.`);
      error.statusCode = 400;
      throw error;
    }
    const verification = await verifyApiKey(provider.id, apiKey);
    await vault.set(provider.field, apiKey);
    sendJson(response, 200, {
      provider: { ...provider, configured: true },
      verification
    });
    return;
  }

  if (request.method === "DELETE" && apiKeyRoute) {
    const provider = apiKeyProvider(apiKeyRoute);
    if (!provider) {
      const error = new Error("Fournisseur API inconnu.");
      error.statusCode = 404;
      throw error;
    }
    await vault.delete(provider.field);
    sendJson(response, 200, { provider: { ...provider, configured: false } });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/providers/krea/styles") {
    const state = await store.read();
    sendJson(response, 200, { styles: state.kreaStyles || [], count: state.kreaStyles?.length || 0 });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/providers/krea/styles/import") {
    const apiKey = await vault.get("kreaApiKey");
    if (!apiKey) {
      throw Object.assign(new Error("Connecte d’abord ta clé API Krea dans Fournisseurs."), { statusCode: 400 });
    }
    const styles = await kreaClient.listStyles(apiKey);
    await store.update((state) => {
      state.kreaStyles = styles;
      return state;
    });
    sendJson(response, 200, {
      styles,
      count: styles.length,
      message: `${styles.length} LoRA importés. Les modèles Krea2 ont été exclus.`
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/providers/heygen/connect") {
    const body = await readJson(request);
    const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    if (apiKey.length < 12 || apiKey.length > 500) {
      const error = new Error("La clé HeyGen semble incomplète.");
      error.statusCode = 400;
      throw error;
    }
    const account = await heygenClient.account(apiKey);
    await vault.set("heygenApiKey", apiKey);
    const data = account?.data || {};
    sendJson(response, 200, {
      configured: true,
      username: data.username || data.email || null,
      billingType: data.billing_type || null,
      wallet: data.wallet ? {
        currency: data.wallet.currency || "usd",
        remainingBalance: data.wallet.remaining_balance
      } : null
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/providers/heygen/status") {
    const apiKey = await vault.get("heygenApiKey");
    if (!apiKey) {
      sendJson(response, 200, { configured: false });
      return;
    }
    const account = await heygenClient.account(apiKey);
    const data = account?.data || {};
    sendJson(response, 200, {
      configured: true,
      username: data.username || data.email || null,
      billingType: data.billing_type || null,
      wallet: data.wallet ? {
        currency: data.wallet.currency || "usd",
        remainingBalance: data.wallet.remaining_balance
      } : null
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/providers/fal/connect") {
    const body = await readJson(request);
    const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    if (apiKey.length < 12 || apiKey.length > 500) {
      const error = new Error("La clé fal semble incomplète.");
      error.statusCode = 400;
      throw error;
    }

    let account;
    try {
      account = await falClient.account(apiKey);
    } catch (error) {
      if (error.remoteStatus !== 403) throw error;
      account = null;
    }
    await vault.set("falApiKey", apiKey);
    const adminApiKey = await vault.get("falAdminApiKey");
    if (adminApiKey) account = await falClient.account(adminApiKey);
    sendJson(response, 200, {
      configured: true,
      billingConfigured: Boolean(adminApiKey),
      billingAvailable: Boolean(account),
      username: account?.username || null,
      credits: account?.credits || null
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/providers/fal/admin/connect") {
    const body = await readJson(request);
    const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    if (apiKey.length < 12 || apiKey.length > 500) {
      const error = new Error("La clé Admin fal semble incomplète.");
      error.statusCode = 400;
      throw error;
    }

    const account = await falClient.account(apiKey);
    if (!Number.isFinite(Number(account?.credits?.current_balance))) {
      const error = new Error("fal a accepté la clé Admin mais n’a pas renvoyé le solde.");
      error.statusCode = 502;
      throw error;
    }
    await vault.set("falAdminApiKey", apiKey);
    sendJson(response, 200, {
      configured: await vault.has("falApiKey"),
      billingConfigured: true,
      billingAvailable: true,
      username: account?.username || null,
      credits: account?.credits || null
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/providers/fal/status") {
    const generationApiKey = await vault.get("falApiKey");
    const adminApiKey = await vault.get("falAdminApiKey");
    if (!generationApiKey) {
      sendJson(response, 200, { configured: false });
      return;
    }
    let account;
    try {
      account = await falClient.account(adminApiKey || generationApiKey);
    } catch (error) {
      if (error.remoteStatus !== 403) throw error;
      account = null;
    }
    sendJson(response, 200, {
      configured: true,
      billingConfigured: Boolean(adminApiKey),
      billingAvailable: Boolean(account),
      username: account?.username || null,
      credits: account?.credits || null
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/providers/fal/models/verify") {
    const apiKey = await vault.get("falApiKey");
    if (!apiKey) {
      const error = new Error("Connecte d’abord ta clé fal.");
      error.statusCode = 400;
      throw error;
    }
    const body = await readJson(request);
    const model = await falClient.verifyModel(apiKey, body.endpointId);
    await store.update((state) => {
      state.catalog = state.catalog.filter((item) => (
        item.provider !== "fal" || item.endpointId !== model.endpointId
      ));
      state.catalog.unshift(model);
      state.activity.unshift({
        id: randomUUID(),
        kind: "catalog",
        message: `Modèle fal vérifié : ${model.displayName}`,
        createdAt: model.verifiedAt
      });
      state.activity = state.activity.slice(0, 200);
      return state;
    });
    sendJson(response, 200, { model });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/generations/preview") {
    const body = await readJson(request);
    const state = await store.read();
    const requestedProvider = String(body.target?.provider || body.provider || "").trim();
    const model = state.catalog.find((item) => (
      item.endpointId === body.endpointId && (!requestedProvider || item.provider === requestedProvider)
    ));
    if (!model) {
      const error = new Error("Ce modèle n’est pas présent dans le catalogue vérifié.");
      error.statusCode = 400;
      throw error;
    }
    const imported = normalizePromptAtlasImport({
      ...body,
      schemaVersion: "1.0",
      source: { app: "prompt-atlas", module: "Préparation locale" }
    });
    validateGenerationReferences(state, imported.references, model.provider);
    sendJson(response, 200, { preview: createGenerationPreview(imported, model) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/jobs/prepare") {
    const body = await readJson(request);
    const state = await store.read();
    const queueDraftId = body.queueDraftId;
    if (queueDraftId !== undefined) {
      const queuedDraft = state.drafts.find((draft) => draft.id === queueDraftId && draft.mediaType === "image" && draft.queueBatchId);
      if (!queuedDraft || queuedDraft.queueStatus !== "pending") {
        throw Object.assign(new Error("Cette image n’est plus en attente dans la file."), { statusCode: 409 });
      }
      if (state.jobs.some((job) => job.queueDraftId === queueDraftId &&
          (["submitting", "submitted", "queued", "running", "completed"].includes(job.status) || job.submissionUncertain))) {
        throw Object.assign(new Error("Cette image possède déjà un envoi en cours ou incertain."), { statusCode: 409 });
      }
    }
    const requestedProvider = String(body.target?.provider || body.provider || "").trim();
    const model = state.catalog.find((item) => (
      item.endpointId === body.endpointId && (!requestedProvider || item.provider === requestedProvider)
    ));
    if (!model) {
      const error = new Error("Ce modèle n’est pas présent dans le catalogue vérifié.");
      error.statusCode = 400;
      throw error;
    }
    const imported = normalizePromptAtlasImport({
      ...body,
      schemaVersion: "1.0",
      source: { app: "prompt-atlas", module: "File locale" }
    });
    const preview = createGenerationPreview(imported, model);
    validateGenerationReferences(state, imported.references, model.provider);
    if (!preview.canSubmit) throw Object.assign(new Error(preview.warnings.join(" ")), { statusCode: 400 });
    const job = createPreparedJob(preview, randomUUID());
    if (queueDraftId !== undefined) job.queueDraftId = queueDraftId;
    await store.update((nextState) => {
      if (queueDraftId !== undefined && !nextState.drafts.some((draft) => draft.id === queueDraftId && draft.queueStatus === "pending")) {
        throw Object.assign(new Error("Cette image a été retirée de la file."), { statusCode: 409 });
      }
      if (queueDraftId !== undefined && nextState.jobs.some((existing) => existing.queueDraftId === queueDraftId &&
          (["submitting", "submitted", "queued", "running", "completed"].includes(existing.status) || existing.submissionUncertain))) {
        throw Object.assign(new Error("Cette image possède déjà un envoi en cours ou incertain."), { statusCode: 409 });
      }
      nextState.jobs.unshift(job);
      nextState.jobs = nextState.jobs.slice(0, 100);
      nextState.activity.unshift({
        id: randomUUID(),
        kind: "job-prepared",
        message: `Requête préparée pour ${model.displayName}`,
        createdAt: job.createdAt
      });
      nextState.activity = nextState.activity.slice(0, 200);
      return nextState;
    });
    sendJson(response, 201, { job });
    return;
  }

  const jobRoute = jobAction(url.pathname);
  if (request.method === "POST" && jobRoute?.action === "submit") {
    const body = await readJson(request);
    if (body.confirm !== true || !Number.isFinite(Number(body.estimatedCost))) {
      const error = new Error("La confirmation du coût est obligatoire.");
      error.statusCode = 400;
      throw error;
    }

    const state = await store.read();
    const job = state.jobs.find((item) => item.id === jobRoute.id);
    if (!job) {
      const error = new Error("Requête locale introuvable.");
      error.statusCode = 404;
      throw error;
    }
    if (job.status !== "awaiting_confirmation") {
      const error = new Error("Cette requête n’attend plus de confirmation.");
      error.statusCode = 409;
      throw error;
    }
    if (job.queueDraftId && !state.drafts.some((draft) => draft.id === job.queueDraftId && draft.queueStatus === "pending")) {
      throw Object.assign(new Error("Cette image n’est plus en attente dans la file."), { statusCode: 409 });
    }
    if (job.missingRequired?.length || job.validationErrors?.length || job.estimatedCost === null) {
      const error = new Error("Des paramètres obligatoires sont encore manquants.");
      error.statusCode = 400;
      throw error;
    }
    if (Number(body.estimatedCost) !== job.estimatedCost) {
      const error = new Error("L’estimation affichée ne correspond plus à la requête.");
      error.statusCode = 409;
      throw error;
    }

    const provider = job.provider || "fal";
    const apiKey = await vault.get(providerSecretField(provider));
    if (!apiKey) {
      const error = new Error(`La clé ${providerLabel(provider)} n’est plus configurée.`);
      error.statusCode = 400;
      throw error;
    }
    let verifiedModel;
    if (provider === "heygen") {
      await heygenClient.account(apiKey);
      verifiedModel = state.catalog.find((item) => (
        item.provider === "heygen" && item.endpointId === job.endpointId
      ));
    } else if (provider === "krea") {
      verifiedModel = state.catalog.find((item) => (
        item.provider === "krea" && item.endpointId === job.endpointId
      ));
    } else {
      verifiedModel = await falClient.verifyModel(apiKey, job.endpointId);
    }
    if (!verifiedModel) throw Object.assign(new Error("Le modèle du job n’est plus disponible."), { statusCode: 400 });
    validateGenerationReferences(state, job.references, provider);
    if (job.generationDraft) {
      const checked = createGenerationPreview(job.generationDraft, verifiedModel);
      if (checked.validationErrors.length) throw Object.assign(new Error(checked.validationErrors.join(" ")), { statusCode: 400 });
    }
    const currentEstimate = refreshedEstimate(job, verifiedModel);
    if (currentEstimate === null || currentEstimate !== job.estimatedCost) {
      await store.update((nextState) => {
        const index = nextState.jobs.findIndex((item) => item.id === job.id);
        if (index === -1 || nextState.jobs[index].status !== "awaiting_confirmation") {
          return nextState;
        }
        nextState.jobs[index] = {
          ...nextState.jobs[index],
          pricing: verifiedModel.pricing,
          currency: verifiedModel.pricing?.currency || null,
          estimatedCost: currentEstimate,
          updatedAt: new Date().toISOString()
        };
        return nextState;
      });
      const error = new Error(
        `Le tarif ${providerLabel(provider)} a changé. La requête a été mise à jour : confirme le nouveau montant.`
      );
      error.statusCode = 409;
      throw error;
    }

    let claimedJob;
    await store.update((nextState) => {
      const index = nextState.jobs.findIndex((item) => item.id === job.id);
      if (index === -1 || nextState.jobs[index].status !== "awaiting_confirmation") {
        const error = new Error("Cette requête est déjà en cours de soumission.");
        error.statusCode = 409;
        throw error;
      }
      if (nextState.jobs[index].queueDraftId && !nextState.drafts.some((draft) => (
        draft.id === nextState.jobs[index].queueDraftId && draft.queueStatus === "pending"
      ))) {
        throw Object.assign(new Error("Cette image n’est plus en attente dans la file."), { statusCode: 409 });
      }
      if (nextState.jobs[index].queueDraftId && nextState.jobs.some((other) => other.id !== job.id &&
          other.queueDraftId === nextState.jobs[index].queueDraftId &&
          (["submitting", "submitted", "queued", "running", "completed"].includes(other.status) || other.submissionUncertain))) {
        throw Object.assign(new Error("Cette image possède déjà un envoi en cours ou incertain."), { statusCode: 409 });
      }
      claimedJob = transitionJob(nextState.jobs[index], "submitting", { error: null });
      nextState.jobs[index] = claimedJob;
      return nextState;
    });

    let submission;
    let submittedInput;
    let submissionAttempted = false;
    try {
      // Recheck after claiming: deleted local media must never be submitted.
      const latestState = await store.read();
      validateGenerationReferences(latestState, claimedJob.references, provider);
      if (provider === "heygen") {
        submittedInput = await stageHeyGenReferences(claimedJob.providerInput, latestState, apiKey);
      } else if (provider === "krea") {
        submittedInput = await stageKreaReferences(
          claimedJob.providerInput, latestState, claimedJob.references, apiKey
        );
      } else if (provider === "fal") {
        submittedInput = await stageReferenceMedia(claimedJob.providerInput, async (id) => {
          const resource = latestState.resources.find((item) => item.id === id);
          if (!resource) throw new Error("Une référence locale a été supprimée.");
          const filePath = resourcePath(resource);
          const fileInfo = await stat(filePath);
          if (fileInfo.size > 100_000_000) throw new Error("Une référence dépasse 100 Mo.");
          return { data: await readFile(filePath), contentType: resource.contentType,
            name: resource.originalName || resource.name || `${id}${path.extname(resource.storageName)}` };
        }, (resource) => falClient.uploadMedia(apiKey, resource));
      } else {
        submittedInput = claimedJob.providerInput;
      }
      submissionAttempted = true;
      if (provider === "heygen") {
        submission = await heygenClient.submit(apiKey, submittedInput, claimedJob.id);
      } else if (provider === "krea") {
        const batchSize = Math.max(1, Math.min(4, Math.round(Number(submittedInput.num_images) || 1)));
        const kreaInput = { ...submittedInput };
        delete kreaInput.num_images;
        const submissions = [];
        let batchWarning = null;
        for (let index = 0; index < batchSize; index += 1) {
          try {
            submissions.push(await kreaClient.submit(apiKey, claimedJob.endpointId, {
              ...kreaInput,
              ...(Number.isFinite(Number(kreaInput.seed)) ? { seed: Number(kreaInput.seed) + index } : {})
            }));
          } catch (error) {
            if (!submissions.length) throw error;
            batchWarning = publicSubmissionError(error, "krea", true);
            break;
          }
        }
        submission = {
          ...submissions[0],
          job_id: submissions[0]?.job_id || submissions[0]?.id,
          request_ids: submissions.map((item) => item?.job_id || item?.id).filter(Boolean),
          requested_count: batchSize,
          batch_warning: batchWarning
        };
      } else {
        submission = await falClient.submit(apiKey, claimedJob.endpointId, submittedInput);
      }
      const requestId = provider === "heygen" ? submission?.data?.video_id
        : provider === "krea" ? submission?.job_id || submission?.id : submission?.request_id;
      if (!requestId) throw new Error(`${providerLabel(provider)} n’a pas renvoyé d’identifiant de requête.`);
    } catch (error) {
      await store.update((nextState) => {
        const index = nextState.jobs.findIndex((item) => item.id === claimedJob.id);
        if (index !== -1 && nextState.jobs[index].status === "submitting") {
          nextState.jobs[index] = transitionJob(nextState.jobs[index], "failed", {
            error: publicSubmissionError(error, provider, submissionAttempted),
            submissionUncertain: submissionAttempted && !error.remoteStatus
          });
        }
        return nextState;
      });
      throw error;
    }

    let submittedJob;
    await store.update((nextState) => {
      const index = nextState.jobs.findIndex((item) => item.id === claimedJob.id);
      submittedJob = transitionJob(nextState.jobs[index], "submitted", {
        submittedInput,
        requestId: provider === "heygen" ? submission.data.video_id
          : provider === "krea" ? submission.job_id || submission.id : submission.request_id,
        ...(provider === "krea" ? { requestIds: submission.request_ids || [submission.job_id || submission.id] } : {}),
        ...(provider === "krea" && submission.request_ids?.length < submission.requested_count ? {
          estimatedCost: Math.round(Number(claimedJob.pricing?.unitPrice || 0) * submission.request_ids.length * 1e6) / 1e6,
          submissionWarning: submission.batch_warning
        } : {}),
        queuePosition: submission.queue_position ?? null,
        providerUrls: {
          status: submission.status_url || null,
          response: submission.response_url || null,
          cancel: submission.cancel_url || null
        }
      });
      nextState.jobs[index] = submittedJob;
      if (submittedJob.queueDraftId) {
        const queuedDraft = nextState.drafts.find((draft) => draft.id === submittedJob.queueDraftId);
        queuedDraft.queueStatus = "submitted";
        queuedDraft.queueJobId = submittedJob.id;
      }
      return nextState;
    });
    sendJson(response, 202, { job: submittedJob });
    return;
  }

  if (request.method === "POST" && jobRoute?.action === "refresh") {
    const state = await store.read();
    const job = state.jobs.find((item) => item.id === jobRoute.id);
    if (!job) {
      const error = new Error("Requête locale introuvable.");
      error.statusCode = 404;
      throw error;
    }
    if (!job.requestId || !["submitted", "queued", "running"].includes(job.status)) {
      sendJson(response, 200, { job });
      return;
    }
    if (job.provider === "heygen") {
      const apiKey = await vault.get("heygenApiKey");
      if (!apiKey) {
        throw Object.assign(new Error("La clé HeyGen n’est plus configurée."), { statusCode: 400 });
      }
      const remote = await heygenClient.retrieve(apiKey, job.requestId);
      const nextStatus = statusFromHeyGen(remote);
      if (!nextStatus) {
        throw Object.assign(new Error("HeyGen a renvoyé un état de génération inconnu."), { statusCode: 502 });
      }
      const data = remote?.data || {};
      const remotePatch = {
        queuePosition: null,
        providerProgress: nextStatus === "completed" ? 100 : null,
        polledAt: new Date().toISOString(),
        result: nextStatus === "completed" ? resultFromHeyGen(remote) : job.result,
        error: data.failure_message || data.error || null
      };
      let refreshedJob = job;
      await store.update((nextState) => {
        const index = nextState.jobs.findIndex((item) => item.id === job.id);
        if (index === -1) return nextState;
        refreshedJob = nextStatus === nextState.jobs[index].status
          ? { ...nextState.jobs[index], ...remotePatch, updatedAt: new Date().toISOString() }
          : transitionJob(nextState.jobs[index], nextStatus, remotePatch);
        nextState.jobs[index] = refreshedJob;
        return nextState;
      });
      sendJson(response, 200, { job: refreshedJob });
      return;
    }
    if (job.provider === "krea") {
      const apiKey = await vault.get("kreaApiKey");
      if (!apiKey) {
        throw Object.assign(new Error("La clé Krea n’est plus configurée."), { statusCode: 400 });
      }
      const requestIds = Array.isArray(job.requestIds) && job.requestIds.length
        ? job.requestIds
        : [job.requestId];
      const remotes = await Promise.all(requestIds.map((requestId) => kreaClient.retrieve(apiKey, requestId)));
      const statuses = remotes.map(statusFromKrea);
      const nextStatus = statuses.some((status) => status === "failed") ? "failed"
        : statuses.every((status) => status === "completed") ? "completed"
        : statuses.some((status) => status === "running") ? "running"
        : "queued";
      const remoteError = remotes.map((remote) => remote?.error?.message || remote?.error)
        .find((value) => typeof value === "string") || null;
      const batchResult = nextStatus === "completed" ? {
        images: remotes.flatMap((remote) => resultFromKrea(remote).images || [])
      } : job.result;
      const remotePatch = {
        queuePosition: null,
        providerProgress: nextStatus === "completed" ? 100 : null,
        polledAt: new Date().toISOString(),
        result: batchResult,
        error: typeof remoteError === "string" ? remoteError : null
      };
      let refreshedJob = job;
      await store.update((nextState) => {
        const index = nextState.jobs.findIndex((item) => item.id === job.id);
        if (index === -1) return nextState;
        refreshedJob = nextStatus === nextState.jobs[index].status
          ? { ...nextState.jobs[index], ...remotePatch, updatedAt: new Date().toISOString() }
          : transitionJob(nextState.jobs[index], nextStatus, remotePatch);
        nextState.jobs[index] = refreshedJob;
        return nextState;
      });
      sendJson(response, 200, { job: refreshedJob });
      return;
    }
    const apiKey = await vault.get("falApiKey");
    if (!apiKey) {
      const error = new Error("La clé fal n’est plus configurée.");
      error.statusCode = 400;
      throw error;
    }
    const model = state.catalog.find((item) => (
      item.provider === "fal" && item.endpointId === job.endpointId
    ));
    const canonicalEndpointId = model?.inputSchema?.info?.["x-fal-metadata"]?.endpointId;
    let remote;
    try {
      remote = await falClient.queueUrlOrRequest(
        apiKey,
        job.providerUrls?.status,
        job.endpointId,
        job.requestId,
        "status",
        canonicalEndpointId
      );
    } catch (error) {
      if (![400, 422].includes(Number(error.remoteStatus))) throw error;
      let failedJob;
      await store.update((nextState) => {
        const index = nextState.jobs.findIndex((item) => item.id === job.id);
        failedJob = transitionJob(nextState.jobs[index], "failed", {
          error: publicSubmissionError(error),
          queuePosition: null
        });
        nextState.jobs[index] = failedJob;
        return nextState;
      });
      sendJson(response, 200, { job: failedJob });
      return;
    }
    const nextStatus = statusFromFal(remote);
    const remotePatch = {
      queuePosition: remote.queue_position ?? null,
      logs: Array.isArray(remote.logs) ? remote.logs.slice(-50) : [],
      metrics: remote.metrics || null,
      providerProgress: progressFromFal(remote),
      polledAt: new Date().toISOString()
    };
    let result = null;
    if (nextStatus === "completed") {
      try {
        result = await falClient.queueUrlOrRequest(
          apiKey,
          job.providerUrls?.response,
          job.endpointId,
          job.requestId,
          "response",
          canonicalEndpointId
        );
      } catch (error) {
        if (![400, 422].includes(Number(error.remoteStatus))) throw error;
        let failedJob;
        await store.update((nextState) => {
          const index = nextState.jobs.findIndex((item) => item.id === job.id);
          failedJob = transitionJob(nextState.jobs[index], "failed", {
            ...remotePatch,
            error: publicSubmissionError(error),
            queuePosition: null
          });
          nextState.jobs[index] = failedJob;
          return nextState;
        });
        sendJson(response, 200, { job: failedJob });
        return;
      }
    }
    let refreshedJob = job;
    if (nextStatus && nextStatus !== job.status) {
      await store.update((nextState) => {
        const index = nextState.jobs.findIndex((item) => item.id === job.id);
        refreshedJob = transitionJob(nextState.jobs[index], nextStatus, {
          ...remotePatch,
          providerProgress: nextStatus === "completed" ? 100 : remotePatch.providerProgress,
          result,
          error: remote.error || null
        });
        nextState.jobs[index] = refreshedJob;
        return nextState;
      });
    } else if (nextStatus) {
      await store.update((nextState) => {
        const index = nextState.jobs.findIndex((item) => item.id === job.id);
        if (index === -1) return nextState;
        refreshedJob = { ...nextState.jobs[index], ...remotePatch };
        nextState.jobs[index] = refreshedJob;
        return nextState;
      });
    }
    sendJson(response, 200, { job: refreshedJob });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/imports") {
    const imported = normalizePromptAtlasImport(await readJson(request));
    const draft = createLocalDraft(imported, randomUUID());
    await store.update((state) => {
      state.drafts.unshift(draft);
      state.drafts = state.drafts.slice(0, 100);
      state.activity.unshift({
        id: randomUUID(),
        kind: "import",
        message: `Prompt importé depuis ${draft.source.module || "Prompt Atlas"}`,
        createdAt: draft.importedAt
      });
      state.activity = state.activity.slice(0, 200);
      return state;
    });
    sendJson(response, 201, { draft });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/import-queues/image") {
    const body = await readJson(request);
    if (!Array.isArray(body?.items) || body.items.length < 1 || body.items.length > 30 ||
        !/^[a-f0-9-]{36}$/i.test(String(body.requestId || ""))) {
      throw Object.assign(new Error("La file doit contenir entre 1 et 30 images et un identifiant valide."), { statusCode: 400 });
    }
    const imports = body.items.map((item) => normalizePromptAtlasImport(item));
    if (imports.some((item) => item.mediaType !== "image")) {
      throw Object.assign(new Error("Cette file accepte uniquement des images fixes."), { statusCode: 400 });
    }
    let drafts;
    await store.update((state) => {
      const existing = state.drafts.filter((draft) => draft.queueBatchId === body.requestId)
        .sort((left, right) => left.queuePosition - right.queuePosition);
      if (existing.length) {
        if (existing.length !== imports.length) throw Object.assign(new Error("Cette file existe déjà avec un autre nombre d’images."), { statusCode: 409 });
        drafts = existing;
        return state;
      }
      const now = new Date();
      drafts = imports.map((item, index) => ({
        ...createLocalDraft(item, randomUUID(), now),
        queueBatchId: body.requestId,
        queuePosition: index + 1,
        queueTotal: imports.length,
        queueStatus: "pending",
        queueJobId: null
      }));
      state.drafts.unshift(...drafts);
      state.drafts = state.drafts.slice(0, 300);
      state.activity.unshift({ id: randomUUID(), kind: "import",
        message: `${drafts.length} images fixes ajoutées à la file depuis Prompt Atlas`, createdAt: now.toISOString() });
      state.activity = state.activity.slice(0, 200);
      return state;
    });
    sendJson(response, 201, { queueId: body.requestId, drafts });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/import-queues/image/append") {
    const body = await readJson(request);
    if (!/^[a-f0-9-]{36}$/i.test(String(body?.requestId || ""))) {
      throw Object.assign(new Error("Identifiant de file invalide."), { statusCode: 400 });
    }
    const imported = normalizePromptAtlasImport({ ...body.item,
      schemaVersion: "1.0", source: { app: "prompt-atlas", module: "Create Image" } });
    if (imported.mediaType !== "image") {
      throw Object.assign(new Error("Cette file accepte uniquement des images."), { statusCode: 400 });
    }
    let draft;
    let drafts;
    await store.update((state) => {
      const existing = state.drafts.filter((item) => item.queueBatchId === body.requestId)
        .sort((left, right) => left.queuePosition - right.queuePosition);
      if (existing.some((item) => item.queueStatus !== "pending")) {
        throw Object.assign(new Error("Cette série a déjà été lancée. Crée une nouvelle file."), { statusCode: 409 });
      }
      if (existing.length >= 30) {
        throw Object.assign(new Error("Cette file contient déjà 30 images."), { statusCode: 400 });
      }
      const now = new Date();
      draft = {
        ...createLocalDraft(imported, randomUUID(), now),
        source: { app: "barz-aggregator", module: "Create Image" },
        queueBatchId: body.requestId,
        queuePosition: existing.length + 1,
        queueTotal: existing.length + 1,
        queueStatus: "pending",
        queueJobId: null
      };
      drafts = [...existing, draft];
      drafts.forEach((item, index) => {
        item.queuePosition = index + 1;
        item.queueTotal = drafts.length;
      });
      state.drafts.unshift(draft);
      state.drafts = state.drafts.slice(0, 300);
      return state;
    });
    sendJson(response, 201, { queueId: body.requestId, draft, drafts });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/import-queues/image/mark") {
    const body = await readJson(request);
    if (typeof body?.draftId !== "string" || typeof body?.jobId !== "string" ||
        !/^[a-f0-9-]{36}$/i.test(body.draftId) || !/^[a-f0-9-]{36}$/i.test(body.jobId)) {
      throw Object.assign(new Error("Identifiants de file invalides."), { statusCode: 400 });
    }
    let draft;
    await store.update((state) => {
      draft = state.drafts.find((item) => item.id === body.draftId && item.mediaType === "image" && item.queueBatchId);
      if (!draft || !state.jobs.some((job) => job.id === body.jobId && job.mediaType === "image")) {
        throw Object.assign(new Error("L’image ou sa génération est introuvable."), { statusCode: 404 });
      }
      draft.queueStatus = "submitted";
      draft.queueJobId = body.jobId;
      return state;
    });
    sendJson(response, 200, { draft });
    return;
  }

  const imageQueueDraftRoute = /^\/api\/import-queues\/image\/([a-f0-9-]{36})$/i.exec(url.pathname);
  if (request.method === "DELETE" && imageQueueDraftRoute) {
    const draftId = imageQueueDraftRoute[1];
    let remainingDrafts = [];
    await store.update((state) => {
      const draft = state.drafts.find((item) => item.id === draftId && item.mediaType === "image" && item.queueBatchId);
      if (!draft) throw Object.assign(new Error("Cette image de la file est introuvable."), { statusCode: 404 });
      if (draft.queueStatus !== "pending") {
        throw Object.assign(new Error("Une image déjà envoyée ne peut pas être retirée de la file."), { statusCode: 409 });
      }
      if (state.jobs.some((job) => job.queueDraftId === draftId &&
          (["submitting", "submitted", "queued", "running", "completed"].includes(job.status) || job.submissionUncertain))) {
        throw Object.assign(new Error("Un envoi en cours ou incertain empêche le retrait de cette image."), { statusCode: 409 });
      }
      state.drafts = state.drafts.filter((item) => item.id !== draftId);
      remainingDrafts = state.drafts.filter((item) => item.queueBatchId === draft.queueBatchId)
        .sort((left, right) => left.queuePosition - right.queuePosition);
      remainingDrafts.forEach((item, index) => {
        item.queuePosition = index + 1;
        item.queueTotal = remainingDrafts.length;
      });
      return state;
    });
    sendJson(response, 200, { deletedDraftId: draftId, drafts: remainingDrafts });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/drafts") {
    const body = await readJson(request);
    const imported = normalizePromptAtlasImport({
      ...body,
      schemaVersion: "1.0",
      source: { app: "prompt-atlas", module: "Saisie locale" }
    });
    const draft = createLocalDraft(imported, randomUUID());
    draft.source.app = "barz-aggregator";
    await store.update((state) => {
      state.drafts.unshift(draft);
      state.drafts = state.drafts.slice(0, 100);
      state.activity.unshift({
        id: randomUUID(),
        kind: "draft",
        message: `Brouillon ${draft.mediaType} enregistré`,
        createdAt: draft.importedAt
      });
      return state;
    });
    sendJson(response, 201, { draft });
    return;
  }

  sendJson(response, 404, { error: "Route API introuvable." });
}

await store.init();
await vault.init();
if (legacyVault) {
  await legacyVault.init();
  for (const provider of API_KEY_PROVIDERS) {
    if (await vault.has(provider.field)) continue;
    const legacyValue = await legacyVault.get(provider.field);
    if (legacyValue) await vault.set(provider.field, legacyValue);
  }
}
await mkdir(uploadDirectory, { recursive: true });
await mkdir(loraWeightsDirectory, { recursive: true });
await store.update((state) => {
  state.catalog = state.catalog.filter((model) => !isRetiredModel(model.endpointId));
  return state;
});

const server = createServer(async (request, response) => {
  try {
    addSecurityHeaders(response);
    const url = new URL(request.url, `http://${host}:${port}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }
    await serveStatic(request, response, url);
  } catch (error) {
    if (response.headersSent) response.destroy(error);
    else {
      sendJson(response, error.statusCode || 500, {
        error: error.statusCode ? error.message : "Erreur locale inattendue."
      });
    }
    if (!error.statusCode) console.error(error);
  }
});

server.listen(port, host, () => {
  console.log(`BARZ Aggregator: http://${host}:${port}`);
  console.log("Version 0.25.0 — pont Prompt Atlas prêt.");
});
