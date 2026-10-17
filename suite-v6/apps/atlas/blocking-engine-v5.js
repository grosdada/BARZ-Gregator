import { createServer } from "node:http";
import { readFile, writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir, networkInterfaces } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { assembleScene, stripGroundFromMask } from "./lib/blocking-fit.js";
import { poseFromCamera, refineYaw4Way, refineDescent, applyClassPriors, scaleFromMeterSticks } from "./lib/blocking-refine.js";
import { buildPromptSkillContext, getPromptSkillReferenceStatus } from "./lib/prompt-skill-router.js";
import { SharedApiVault } from "./shared-api-vault.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execFileAsync = promisify(execFile);
const appRoot = process.env.PROMPT_ATLAS_APP_ROOT
  ? path.resolve(process.env.PROMPT_ATLAS_APP_ROOT)
  : __dirname;
const publicDir = path.join(appRoot, "public");
// In Suite v6 the legacy Blocking Studio assets live directly under
// apps/atlas/public rather than under the former "Barzy App" wrapper.
const barzyDir = appRoot;
const dataDir = process.env.PROMPT_ATLAS_DATA_DIR
  ? path.resolve(process.env.PROMPT_ATLAS_DATA_DIR)
  : path.join(appRoot, "data");
const settingsPath = path.join(dataDir, "settings.local.json");
const sharedApiVault = new SharedApiVault(
  process.env.BARZ_SHARED_SECRETS_DIR || path.join(dataDir, "shared-api")
);
let sharedApiVaultReady;
const sharedApiFields = ["openaiApiKey", "anthropicApiKey", "deepseekApiKey", "googleApiKey"];
const defaultPort = 3783;
// The virtual-camera phone page must be served over HTTPS so Chrome (Android)
// exposes DeviceOrientation; this dedicated port hosts that self-signed endpoint.
const defaultVcamHttpsPort = 3784;
let vcamHttpsPort = null;    // actual bound HTTPS port, or null if HTTPS is unavailable
let vcamHttpsError = null;   // reason HTTPS is off, surfaced to the studio UI
const defaultModel = "gpt-5.6-terra";
const knownModels = ["gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna", "gpt-5.4", "gpt-5.4-mini", "gpt-4.1-mini"];
// Single source of truth for the app version: package.json.
let appVersion = "0.0.0";
try {
  const pkg = JSON.parse(await readFile(path.join(appRoot, "package.json"), "utf8"));
  appVersion = pkg.version || appVersion;
} catch {
  // Keep the fallback version if package.json is unreadable.
}
const appName = `Prompt Atlas ${appVersion}`;
const apiVersion = appVersion;

// ---------------------------------------------------------------------------
// Multi-provider LLM layer (OpenAI / Anthropic / DeepSeek / Google Gemini).
// One curated model per provider; every AI call routes through callLlm().
// ---------------------------------------------------------------------------
const llmProviders = {
  openai: { label: "OpenAI", keyField: "openaiApiKey" },
  anthropic: { label: "Anthropic", keyField: "anthropicApiKey" },
  deepseek: { label: "DeepSeek", keyField: "deepseekApiKey" },
  google: { label: "Google Gemini", keyField: "googleApiKey" }
};

// One table, grouped by provider. To update: add the newest models at the TOP of
// their provider block and leave the older ones underneath. This is the single
// source of truth served to every model dropdown in the app (via /api/settings).
const availableLlmModels = [
  // --- OpenAI --------------------------------------------------------------
  // GPT-5.6 family (latest): Sol = Puissant, Terra = Equilibre, Luna = Economique.
  { id: "gpt-5.6-sol", name: "GPT-5.6 Sol", provider: "openai", label: "Puissant", description: "Modele frontiere OpenAI pour le travail complexe (Sol)", vision: true },
  { id: "gpt-5.6-terra", name: "GPT-5.6 Terra", provider: "openai", label: "Equilibre", description: "Le meilleur equilibre intelligence / cout (Terra)", vision: true },
  { id: "gpt-5.6-luna", name: "GPT-5.6 Luna", provider: "openai", label: "Economique", description: "Optimise pour la vitesse et le cout (Luna)", vision: true },
  // Previous OpenAI models kept for compatibility.
  { id: "gpt-5.4", name: "GPT-5.4", provider: "openai", label: "Puissant (ancien)", description: "Ancienne generation, toujours disponible", vision: true },
  { id: "gpt-5.4-mini", name: "GPT-5.4 mini", provider: "openai", label: "Equilibre (ancien)", description: "Rapide, fiable, bon rapport qualite/prix", vision: true },
  { id: "gpt-4.1-mini", name: "GPT-4.1 mini", provider: "openai", label: "Economique (ancien)", description: "Leger et peu couteux pour les usages frequents", vision: true },
  // --- Anthropic (Claude) --------------------------------------------------
  { id: "claude-opus-5-5", name: "Claude Opus 5.5", provider: "anthropic", label: "Puissant", description: "Le modele Anthropic le plus capable pour les taches complexes", vision: true },
  { id: "claude-sonnet-5-5", name: "Claude Sonnet 5.5", provider: "anthropic", label: "Equilibre", description: "Excellent equilibre raisonnement, vitesse et cout", vision: true },
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", provider: "anthropic", label: "Economique", description: "Claude rapide et peu couteux", vision: true },
  { id: "claude-fable-5", name: "Claude Fable 5", provider: "anthropic", label: "Creatif", description: "Claude oriente ecriture et creativite", vision: true },
  // Previous Claude models kept for compatibility.
  { id: "claude-opus-4-8", name: "Claude Opus 4.8", provider: "anthropic", label: "Puissant (ancien)", description: "Ancienne generation Opus, conservee pour compatibilite", vision: true },
  { id: "claude-sonnet-5", name: "Claude Sonnet 5", provider: "anthropic", label: "Equilibre (ancien)", description: "Ancienne generation Sonnet, conservee pour compatibilite", vision: true },
  { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", provider: "anthropic", label: "Redaction premium (ancien)", description: "Excellent pour ecrire, reformuler et structurer", vision: true },
  // --- DeepSeek ------------------------------------------------------------
  { id: "deepseek-chat", name: "DeepSeek Chat", provider: "deepseek", label: "Equilibre", description: "Modele generaliste DeepSeek", vision: false },
  { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash", provider: "deepseek", label: "Economique", description: "Option cout bas pour les usages frequents", vision: false },
  // --- Google Gemini -------------------------------------------------------
  { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash", provider: "google", label: "Rapide", description: "Alternative rapide et polyvalente", vision: true, fallbackId: "gemini-2.5-flash" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "google", label: "Stable", description: "Generation stable et eprouvee", vision: true }
];
const defaultLlmModelId = "gpt-5.6-terra";

function llmModelInfo(id) {
  return availableLlmModels.find((model) => model.id === id) || null;
}

function resolveLlmModel(...candidates) {
  for (const candidate of candidates) {
    if (typeof candidate !== "string" || !candidate.trim()) continue;
    const id = candidate.trim();
    if (llmModelInfo(id)) return id;
    // Legacy OpenAI model ids (gpt-*) keep working through the OpenAI provider.
    if (id.startsWith("gpt-")) return id;
  }
  return defaultLlmModelId;
}

function llmProviderFor(modelId) {
  return llmModelInfo(modelId)?.provider || "openai";
}

function llmKeyFor(settings, provider) {
  return String(settings?.[llmProviders[provider].keyField] || "").trim();
}

function missingKeyMessage(provider) {
  return `${llmProviders[provider].label} API key is not configured in Settings.`;
}

function dataUrlParts(dataUrl) {
  const match = /^data:([^;,]+);base64,(.*)$/s.exec(String(dataUrl || ""));
  if (!match) return null;
  return { mime: match[1], base64: match[2] };
}

function extractOpenAiText(payload) {
  return (
    payload.output_text ||
    payload.output
      ?.flatMap((item) => item.content || [])
      .map((part) => part.text)
      .filter(Boolean)
      .join("\n")
      .trim() ||
    ""
  );
}

async function callOpenAiLlm({ apiKey, model, system, userText, images, maxOutputTokens, temperature, timeoutMs }) {
  const userContent = images.length
    ? [
        { type: "input_text", text: userText },
        ...images.map((imageDataUrl) => ({ type: "input_image", image_url: imageDataUrl, detail: "high" }))
      ]
    : userText;
  const input = [
    { role: "system", content: system },
    { role: "user", content: userContent }
  ];
  const { response, payload } = await fetchJsonWithTimeout("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(openAIRequestBody({ model, input, maxOutputTokens, temperature }))
  }, timeoutMs);
  if (!response.ok) {
    return { ok: false, status: response.status, error: payload.error?.message || "OpenAI request failed." };
  }
  return { ok: true, status: 200, text: extractOpenAiText(payload) };
}

async function callAnthropicLlm({ apiKey, model, system, userText, images, maxOutputTokens, temperature, timeoutMs }) {
  const content = [{ type: "text", text: userText }];
  for (const imageDataUrl of images) {
    const parts = dataUrlParts(imageDataUrl);
    if (parts) content.push({ type: "image", source: { type: "base64", media_type: parts.mime, data: parts.base64 } });
  }
  const { response, payload } = await fetchJsonWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    },
    // `temperature` is deprecated on recent Anthropic models (e.g. Opus 4.8) and makes
    // the request error out — omit it and let the model use its default.
    body: JSON.stringify({
      model,
      max_tokens: maxOutputTokens,
      system,
      messages: [{ role: "user", content }]
    })
  }, timeoutMs);
  if (!response.ok) {
    return { ok: false, status: response.status, error: payload.error?.message || "Anthropic request failed." };
  }
  const text = (payload.content || []).map((part) => part.text).filter(Boolean).join("\n").trim();
  return { ok: true, status: 200, text };
}

async function callDeepSeekLlm({ apiKey, model, system, userText, maxOutputTokens, temperature, timeoutMs }) {
  const { response, payload } = await fetchJsonWithTimeout("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      max_tokens: maxOutputTokens,
      temperature: Math.min(1.5, temperature),
      messages: [
        { role: "system", content: system },
        { role: "user", content: userText }
      ]
    })
  }, timeoutMs);
  if (!response.ok) {
    return { ok: false, status: response.status, error: payload.error?.message || "DeepSeek request failed." };
  }
  const text = String(payload.choices?.[0]?.message?.content || "").trim();
  return { ok: true, status: 200, text };
}

async function callGeminiLlm({ apiKey, model, system, userText, images, maxOutputTokens, temperature, timeoutMs, fallbackId }) {
  const parts = [{ text: userText }];
  for (const imageDataUrl of images) {
    const data = dataUrlParts(imageDataUrl);
    if (data) parts.push({ inlineData: { mimeType: data.mime, data: data.base64 } });
  }
  // Flash models burn output budget on internal "thinking", which truncates
  // long sequences. Disable thinking and give the answer real headroom.
  const buildBody = (withThinkingConfig) => JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: Math.min(2, temperature),
      maxOutputTokens: Math.max(2048, maxOutputTokens * 2),
      ...(withThinkingConfig ? { thinkingConfig: { thinkingBudget: 0 } } : {})
    }
  });
  const callModel = async (modelId, withThinkingConfig) => fetchJsonWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: buildBody(withThinkingConfig)
    },
    timeoutMs
  );
  let { response, payload } = await callModel(model, true);
  if (!response.ok && response.status === 400 && /thinking/i.test(payload.error?.message || "")) {
    ({ response, payload } = await callModel(model, false));
  }
  if (!response.ok && response.status === 404 && fallbackId) {
    ({ response, payload } = await callModel(fallbackId, true));
    if (!response.ok && response.status === 400 && /thinking/i.test(payload.error?.message || "")) {
      ({ response, payload } = await callModel(fallbackId, false));
    }
  }
  if (!response.ok) {
    return { ok: false, status: response.status, error: payload.error?.message || "Google Gemini request failed." };
  }
  const text = (payload.candidates?.[0]?.content?.parts || []).map((part) => part.text).filter(Boolean).join("\n").trim();
  return { ok: true, status: 200, text };
}

async function callLlm({ settings, model, system, userText, images = [], maxOutputTokens = 900, temperature = 0.85, timeoutMs = 45000 }) {
  const modelId = resolveLlmModel(model, settings.model, settings.llmModel, settings.openaiModel);
  const provider = llmProviderFor(modelId);
  const info = llmModelInfo(modelId);
  const apiKey = llmKeyFor(settings, provider);
  if (!apiKey) {
    return { ok: false, status: 400, error: missingKeyMessage(provider), model: modelId, provider };
  }
  if (images.length && info && info.vision === false) {
    return {
      ok: false,
      status: 400,
      error: `${info.label} (${llmProviders[provider].label}) cannot analyze images. Pick Equilibre, Redaction premium or Rapide Google for image analysis.`,
      model: modelId,
      provider
    };
  }
  const params = { apiKey, model: modelId, system, userText, images, maxOutputTokens, temperature, timeoutMs, fallbackId: info?.fallbackId };
  try {
    let result;
    if (provider === "anthropic") result = await callAnthropicLlm(params);
    else if (provider === "deepseek") result = await callDeepSeekLlm(params);
    else if (provider === "google") result = await callGeminiLlm(params);
    else result = await callOpenAiLlm(params);
    return { ...result, model: modelId, provider };
  } catch (error) {
    const reason = error?.name === "AbortError" || /timed out/i.test(String(error?.message)) ? "timed out" : "failed";
    return {
      ok: false,
      status: 502,
      error: `${llmProviders[provider].label} request ${reason}. Check your API key and connection, then try again.`,
      model: modelId,
      provider
    };
  }
}

async function routePromptSkills(system, options) {
  const skills = await buildPromptSkillContext(options);
  return {
    system: skills.text ? `${system}\n\n${skills.text}` : system,
    trace: {
      available: skills.available,
      version: skills.version,
      sections: skills.sections
    }
  };
}
const transcriptionModel = "gpt-4o-mini-transcribe";
const maxOpenAiUploadBytes = 25 * 1024 * 1024;
let cachedFfmpegPath = "";
let cachedBrainText = "";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
  ".task": "application/octet-stream",
  ".onnx": "application/octet-stream"
};

async function ensureDataDir() {
  await mkdir(dataDir, { recursive: true });
}

async function readSettings() {
  if (!sharedApiVaultReady) sharedApiVaultReady = sharedApiVault.init();
  await sharedApiVaultReady;
  let settings = {};
  try {
    const raw = await readFile(settingsPath, "utf8");
    settings = JSON.parse(raw);
  } catch {}
  for (const field of sharedApiFields) {
    const legacy = String(settings[field] || "").trim();
    if (legacy && !await sharedApiVault.has(field)) await sharedApiVault.set(field, legacy);
    settings[field] = await sharedApiVault.get(field) || "";
  }
  return settings;
}

async function writeSettings(settings) {
  if (!sharedApiVaultReady) sharedApiVaultReady = sharedApiVault.init();
  await sharedApiVaultReady;
  const publicSettings = { ...settings };
  for (const field of sharedApiFields) {
    const value = String(publicSettings[field] || "").trim();
    if (value) await sharedApiVault.set(field, value);
    else await sharedApiVault.delete(field);
    delete publicSettings[field];
  }
  await ensureDataDir();
  await writeFile(settingsPath, JSON.stringify(publicSettings, null, 2), "utf8");
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(body));
}

function sendText(res, status, text) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

function sendBinary(res, status, buffer, { contentType = "application/octet-stream", fileName = "download.bin" } = {}) {
  res.writeHead(status, {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${safeHeaderFileName(fileName)}"`,
    "Cache-Control": "no-store"
  });
  res.end(buffer);
}

function safeStaticPath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split("?")[0]);
  const requested = cleanPath === "/" ? "/index.html" : cleanPath;
  const filePath = path.normalize(path.join(publicDir, requested));
  if (!filePath.startsWith(publicDir)) return null;
  return filePath;
}

function safeBarzyPath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split("?")[0]).replace(/^\/barzy\/?/, "/");
  const requested = cleanPath === "/" ? "/prompt Atlas V2/index.html" : cleanPath;
  const filePath = path.normalize(path.join(barzyDir, requested));
  if (!filePath.startsWith(barzyDir)) return null;
  return filePath;
}

// Serves the standalone dev tools (e.g. /tools/blocking-solver.html) from <appRoot>/tools/.
function safeToolsPath(urlPath) {
  const toolsDir = path.join(appRoot, "tools");
  const cleanPath = decodeURIComponent(urlPath.split("?")[0]).replace(/^\/tools\/?/, "/");
  const filePath = path.normalize(path.join(toolsDir, cleanPath));
  if (!filePath.startsWith(toolsDir)) return null;
  return filePath;
}

// Serves shared ESM modules (e.g. /lib/blocking-fit.js) from <appRoot>/lib/ so the browser
// tools import the same fit/OBB/ground math the server uses (single source of truth).
function safeLibPath(urlPath) {
  const libDir = path.join(appRoot, "lib");
  const cleanPath = decodeURIComponent(urlPath.split("?")[0]).replace(/^\/lib\/?/, "/");
  const filePath = path.normalize(path.join(libDir, cleanPath));
  if (!filePath.startsWith(libDir)) return null;
  return filePath;
}

function targetEngineLabel(targetEngine) {
  return String(targetEngine || "General image/video generation").trim();
}

function buildInstruction({ intent, transform, outputType, targetEngine }) {
  const outputLine =
    outputType === "video"
      ? "Return a production-ready video prompt with subject, action, camera motion, pacing, environment, lighting, and motion details."
      : "Return a production-ready image prompt with subject, composition, lens/camera language, lighting, material detail, and style constraints.";

  return [
    `You are Prompt Forge inside ${appName}.`,
    "Refine creative seed prompts into concise, usable prompts for generative media.",
    "Preserve the user's core idea and the strongest Absurd Prompt Generator ingredients.",
    "Remove filler, contradictions, and vague abstraction unless the user clearly wants surrealism.",
    `User intent: ${intent || "make this stronger and more usable"}.`,
    `Transformation: ${transform || "ai refine"}.`,
    `Target engine: ${targetEngineLabel(targetEngine)}.`,
    outputLine,
    "Return only the refined prompt. No markdown, no commentary."
  ].join("\n");
}

function buildComposeInstruction({ intent, outputType, complexity, absurdity, targetEngine }) {
  const outputLine =
    outputType === "video"
      ? "Write a video-generation prompt with subject, action, camera movement, pacing, scene evolution, lighting, texture, and sound/motion cues when useful."
      : "Write an image-generation prompt with subject, composition, lens/camera language, lighting, material texture, art direction, and negative constraints when useful.";

  return [
    `You are Prompt Forge inside ${appName}.`,
    "Your job is semantic creative synthesis, not random collage.",
    "Theme weights are a strict hierarchy, not a suggestion. The rank-1 theme dictates the core concept, the world logic, and the visual grammar of the prompt; it must be unmistakable. The rank-2 theme shapes the action and the styling. Lower-ranked themes may each contribute at most one accent detail, proportional to their weight. Never average the themes into a generic style soup.",
    "The provided ingredients are raw material illustrating each theme's flavor: absorb their spirit, do not copy them verbatim.",
    "Treat the local draft only as raw material: keep its single strongest idea if useful, but write a fresh structure with fresh sentences. Never reuse its phrasing.",
    "If recent outputs are provided, you must avoid their subjects, twists, settings and signature imagery entirely. Surprise is part of the job.",
    "Use the user's intent as the anchor when present. Avoid replacing it with a random subject.",
    "Create surprising but legible ideas with specific visual detail.",
    "Do not list the themes mechanically. Do not mention weights or theme names in the final prompt.",
    `User intent: ${intent || "open creative exploration"}.`,
    `Target engine: ${targetEngineLabel(targetEngine)}.`,
    `Complexity: ${complexity}/10. Absurdity: ${absurdity}/10.`,
    outputLine,
    "Return only the final prompt. No markdown, no preamble."
  ].join("\n");
}

function buildImageAnalysisInstruction() {
  return [
    `You are the Image Analyzer inside ${appName}.`,
    "Analyze the image and turn it into a strong generative media prompt.",
    "Be precise about subject, environment, composition, lighting, camera/lens feel, materials, color, mood, and useful negative constraints.",
    "Do not invent brand names or identities. Describe what is visually useful.",
    "Return strict JSON with these keys only: prompt, subject, context, style.",
    "prompt: a complete image/video-generation prompt.",
    "subject: the core subject phrase for Seedance.",
    "context: the setting, action, surrounding detail and narrative context.",
    "style: camera, lighting, color, texture, mood and art direction."
  ].join("\n");
}

// CINE-DNA specialist reference, injected into the Analyse Style vision call.
// Read once and cached in memory; missing file degrades gracefully.
let cineDnaDocCache = null;
async function loadCineDnaDoc() {
  if (cineDnaDocCache !== null) return cineDnaDocCache;
  try {
    cineDnaDocCache = await readFile(path.join(appRoot, "docs", "CINE-DNA.md"), "utf8");
  } catch {
    cineDnaDocCache = "";
  }
  return cineDnaDocCache;
}

// AUTO-BLOCKING reference, injected into /api/ai/auto-block. Read once and cached.
let autoBlockingDocCache = null;
async function loadAutoBlockingDoc() {
  if (autoBlockingDocCache !== null) return autoBlockingDocCache;
  try {
    autoBlockingDocCache = await readFile(path.join(appRoot, "docs", "AUTO-BLOCKING.md"), "utf8");
  } catch {
    autoBlockingDocCache = "";
  }
  return autoBlockingDocCache;
}

// Video-model references, injected into /api/ai/video-direct.
// Read once and cached; a missing file degrades gracefully (generic instruction).
const videoModelDocCache = {};
async function loadVideoModelDoc(model) {
  const files = { seedance: "SEEDANCE.md", kling: "KLING.md", "minimax-h3": "MINIMAX-H3.md", "flux-3": "FLUX-3.md", veo: "VEO.md", wan: "WAN.md" };
  const file = files[model];
  if (!file) return "";
  if (videoModelDocCache[model] != null) return videoModelDocCache[model];
  try {
    videoModelDocCache[model] = await readFile(path.join(appRoot, "docs", "video-models", file), "utf8");
  } catch {
    videoModelDocCache[model] = "";
  }
  return videoModelDocCache[model];
}

// Directing / Editing / Interpretation grammar (Kuleshov, continuity, match cut, the 3
// modes...), injected into /api/ai/video-direct to make Video Multi Framing the app's
// smartest module. Read once and cached; a missing file degrades gracefully.
let directingEditingDocCache = null;
async function loadDirectingEditingDoc() {
  if (directingEditingDocCache != null) return directingEditingDocCache;
  try {
    directingEditingDocCache = await readFile(path.join(appRoot, "docs", "DIRECTING-EDITING.md"), "utf8");
  } catch {
    directingEditingDocCache = "";
  }
  return directingEditingDocCache;
}
function clampNum(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
function buildVideoDirectInstruction({ model, doc, directingDoc, mode, director, directorSkill, storyline, durationSec, shotCount, style, refsHaveImages, hasRefs }) {
  const labels = { seedance: "Seedance 2.5", kling: "Kling 3.0 / Omni", "minimax-h3": "MiniMax H3", "flux-3": "FLUX 3 Video", veo: "Veo 3.1", wan: "Wan 3.0" };
  const ML = labels[model] || model;
  const parts = [
    `You are a Video Prompt Director inside ${appName} — the smartest module of the app.`,
    `You read a SERIES of reference images (up to 9) and turn them into a coherent SUITE of ${ML} video prompts, following the directing/editing grammar and that model's reference format below to the letter.`
  ];
  // Directing / editing / interpretation grammar — the core intelligence of the module.
  if (directingDoc) {
    parts.push(
      "",
      "Directing, editing and interpretation grammar (READ FIRST — this is how you think):",
      "----- BEGIN DIRECTING/EDITING REFERENCE -----",
      directingDoc,
      "----- END DIRECTING/EDITING REFERENCE -----"
    );
  }
  if (doc) {
    parts.push(
      "",
      `Expert reference for ${ML} (format rules, anatomy and the style mapping):`,
      `----- BEGIN ${model.toUpperCase()} REFERENCE -----`,
      doc,
      `----- END ${model.toUpperCase()} REFERENCE -----`
    );
  }
  // The Go-action MODE that steers the editing logic (see the 3 MODES in the grammar).
  const modeGuide = {
    continuity: "MODE = CONTINUITY (narrative logic): find a STORY across the images — who/what, beginning-middle-end, cause -> effect. Order them into a narrative arc with continuity of subject/light/geography, clean cuts, one action per shot; the viewer must follow a progression.",
    abstract: "MODE = ABSTRACT (aesthetic logic — music-video / art film): no strict story; build VISUAL and rhythmic coherence — motifs, colours, textures, expressive transitions (dissolves, match cuts, controlled morph), musical tempo. The link is sensory, not causal (Eisenstein montage of attractions).",
    biologique: "MODE = BIOLOGIQUE (build a world from the essence of the images): invent a coherent UNIVERS and an emergent narration from what the images radiate — layered environmental motion, organic atmosphere, a visual ecosystem that comes alive. You invent the 'why' and the 'where' from the images' essence."
  };
  if (mode && modeGuide[mode]) {
    parts.push("", modeGuide[mode]);
  }
  if (director) {
    parts.push("", `SELECTED DIRECTING GRAMMAR: ${director}.`);
  }
  if (directorSkill) {
    parts.push(`DIRECTOR SKILL (apply these concrete traits to lens, framing, lighting, colour, blocking, movement, cutting and pacing): ${directorSkill}`);
  }
  if (storyline) {
    parts.push("", `STORYLINE — use this as the causal and emotional spine of the complete sequence: ${storyline}`);
  }
  // Per-model citation syntax for references.
  const refSyntax = model === "kling"
    ? "Cite each reference by its tag as a Kling Element, e.g. \"Using @image1 as the character reference and @image2 as the environment, ...\". Keep each identity's descriptors short and stable across shots."
    : model === "minimax-h3"
      ? "Translate @imageN into MiniMax H3 reference syntax: Image N <Picture N>. Define each subject in subject_definitions, assign an explicit retention level, then reuse the same identifier in every shot."
      : model === "flux-3"
        ? "FLUX 3 has keyframes rather than live omni-reference binding. Treat the ordered @imageN inputs as image keyframes, state what each frame anchors, and do not invent unsupported character-reference tokens."
    : model === "veo"
      ? "Use Veo ingredients mode: open the prompt with \"Using the provided images for @image1 (the ...), @image2 (the ...), ...\" naming what each reference is, then weave them through the beats."
      : model === "wan"
        ? "Translate @imageN into Wan's plain Image N syntax, cite the role of each image, and describe how every referenced subject moves per shot; keep descriptors stable and do not use unsupported @ tokens in the final prompt."
        : "Use Seedance 2.5 reference tokens @Image 1, @Image 2, and so on. Give every file one explicit role, state what to preserve and what to ignore, then keep those identities stable across the contiguous time ranges.";
  parts.push(
    "",
    `TOTAL DURATION: ${durationSec}s. NUMBER OF SHOTS: ${shotCount} (this is the count of camera shots in the prompt — distribute the duration across exactly this many shots per the reference). The number of shots is INDEPENDENT of how many references are provided.`,
    `STYLE WEIGHTS (0-100): Action=${style.action}, Weird=${style.weird}, Beauty=${style.beauty}. Blend the reference's Action / Weird / Beauty style mapping in proportion to these weights — the highest weight dominates camera, lens, movement and mood; a weight of 0 means that flavour is absent. Never average them into a generic soup.`,
    "",
    "REFERENCES: the user message contains a `references` array. Each entry is a reusable element the user wants in the video — a character, object, set or style — with a tag `@imageN`, a `description`, and possibly an attached image. References are NOT shots.",
    hasRefs
      ? "MANDATORY: every NON-EMPTY reference (it has a description and/or an attached image) MUST be used in the prompt and cited by its tag `@imageN`, using the target model's reference syntax. " + refSyntax
      : "No references were provided — build the prompt purely from the intent, the seed themes and the style weights.",
    "Ignore references whose description AND image are both empty.",
    refsHaveImages ? "Reference images are attached in the SAME ORDER as the references that included one — map each to its `@imageN` tag." : "",
    "INTERPRET the images first (subject, mood, essence, subtext), then RELATE them to each other per the MODE and the editing grammar (Kuleshov juxtaposition, continuity, match cut, montage). Build the suite by connecting the images — do NOT re-describe what is already visible in an image; describe the MOTION and the LINKS between them, citing @imageN.",
    "Treat the user's intent as the overall subject/action of the video; invent the shot breakdown yourself to reach the requested NUMBER OF SHOTS while featuring the references. Keep each referenced identity, wardrobe and setting consistent across shots.",
    "",
    "OUTPUT: return ONLY the final prompt in the EXACT format the reference describes" +
      (model === "kling"
        ? " — the positive prompt (citing the references via @imageN), then its tailored negative prompt, then settings."
        : model === "minimax-h3"
          ? " — MiniMax H3 native structured fields followed by [Shot N] blocks with increasing timecodes; durations must sum exactly to the requested total."
          : model === "flux-3"
            ? " — natural-language FLUX 3 direction with two or three strongly differentiated SHOT blocks separated by `HARD CUT.`, followed by one coherent audio direction."
        : model === "veo"
          ? " — flowing prose; use timestamp multishot `Cut to: [00:00-00:02] ...` unless a single sustained shot is requested."
          : model === "wan"
            ? " — a shot-by-shot list with timestamps (`Shot 1 [0-3s] <shot size>: ...`), each shot 2-3s summing to the total duration, citing @imageN, ending with a `Style:` tag and a `Negative prompt:` line (anti-morphing)."
            : " — Seedance 2.5 prose with contiguous time ranges, motivated cuts, @Image N bindings, and the correct audio bracket grammar.") +
      " No markdown, no preamble, no commentary.",
    "Never use fabrication words (latex, silicone, CGI, VFX, puppet, 3D render...) — describe the visible on-screen result."
  );
  return parts.filter(Boolean).join("\n");
}

function buildStyleAnalysisInstruction(cineDnaDoc = "") {
  const parts = [`You are a cinematography and camera-recognition specialist inside ${appName}.`];
  if (cineDnaDoc) {
    parts.push(
      "Use the following expert reference (CINE-DNA) to estimate the shooting origin of the image:",
      "----- BEGIN CINE-DNA REFERENCE -----",
      cineDnaDoc,
      "----- END CINE-DNA REFERENCE -----"
    );
  }
  parts.push(
    "",
    "TASK: Analyze the provided image and estimate its SHOOTING ORIGIN, following the CINE-DNA OUTPUT CONTRACT exactly.",
    "Answer in ENGLISH, as a ready-to-use prompt fragment: concise, comma-separated descriptors a user can paste directly into an image/video prompt. NO prose, NO bullet lists, NO explanations.",
    "Order: camera/era, sensor/format, film stock or digital sensor, lens and focal length, aperture/depth of field, lighting, grain/texture, color grade. End with: Style: <one short phrase>.",
    "If the image is NON-photographic (cartoon, 2D, anime/cel, 3D render, painting, illustration, vector), do NOT invent camera/film/lens specs: output only the medium and rendering style, then '(Camera specs: N/A — non-photographic)'.",
    "Do not use markdown fences. Output only the prompt fragment."
  );
  return parts.join("\n");
}

function buildVideoAnalysisInstruction() {
  return [
    `You are the Video Director Analyzer inside ${appName}.`,
    "You receive keyframes extracted from one short video plus timing metadata and, when available, an audio transcript. Infer the visible action over time, camera movement, subject continuity, scene rhythm, lighting, style, transitions, dialogue, audio cues, and likely cut points.",
    "Return strict JSON only, with these keys: analysis, klingPrompt, klingNegativePrompt, seedancePrompt, duration, shots.",
    "analysis: compact director breakdown describing subject, environment, action continuity, shot timing, camera, subject movement, lighting, background, transitions, rhythm, and transcript/dialogue when available.",
    "klingPrompt: production-ready Kling 3 prompt. Use 1 to 6 shots, explicit shot durations, clean cuts, motion intensity 0.0 to 3.0, camera movement, subject movement, lighting, style, dialogue/audio notes when useful, and total duration no more than 15 seconds.",
    "klingNegativePrompt: concise comma-separated negative prompt tailored to the scene, covering temporal flicker, morphing, unstable anatomy, physics, background drift, artifacts, and any subject-specific risks.",
    "seedancePrompt: one single flowing paragraph for Seedance 2.0. Exactly 15 seconds. 3 to 7 shots. Use 'Cut to.' between shots. Every shot must include shot size, lens, camera angle, one camera movement verb, and one clear action. End with: Photo real, natural framing. Audio: diegetic sound only - natural ambience, environmental foley, and subject-driven sound.",
    "duration: total source/video prompt duration in seconds, capped at 15.",
    "When transcript text is provided, include the dialogue/lipsync cue in analysis, Kling, and Seedance outputs instead of treating the audio as generic ambience.",
    "shots: array of objects with time, duration, frame, action, camera, and motionIntensity.",
    "If a required subject change is provided, replace the visible subject in the final Kling and Seedance prompts while preserving the source performance, gesture timing, cuts, camera motion and rhythm.",
    "If a required background change is provided, replace the visible setting in the final Kling and Seedance prompts while preserving source framing, lighting logic, lens feel, cuts and motion continuity.",
    "Required subject/background changes are commands, not weak suggestions.",
    "Do not use markdown fences. Do not invent brand names or real identities. Preserve what is visually useful."
  ].join("\n");
}

function cleanJsonFence(value) {
  return String(value || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function parsePossibleJson(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  const clean = cleanJsonFence(value);
  if (!/^[{\[]/.test(clean)) return null;
  try {
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

function textField(value) {
  if (value == null) return "";
  if (typeof value === "string") return cleanJsonFence(value);
  if (typeof value === "object") {
    const nested = value.prompt || value.subject || value.context || value.style || "";
    return typeof nested === "string" ? cleanJsonFence(nested) : "";
  }
  return String(value);
}

function normalizeImageAnalysis(raw) {
  const parsed = parsePossibleJson(raw) || {};
  const nestedPrompt = parsePossibleJson(parsed.prompt);
  const source = nestedPrompt || parsed;
  const prompt = textField(source.prompt) || textField(raw);
  return {
    prompt,
    subject: textField(source.subject) || prompt,
    context: textField(source.context) || prompt,
    style: textField(source.style)
  };
}

function normalizeVideoAnalysis(raw, fallbackDuration = 15) {
  const parsed = parsePossibleJson(raw) || {};
  const source = parsePossibleJson(parsed.prompt) || parsed;
  const analysis = textField(source.analysis) || textField(source.description) || textField(raw);
  const klingPrompt = textField(source.klingPrompt) || textField(source.kling_prompt) || textField(source.kling);
  const klingNegativePrompt =
    textField(source.klingNegativePrompt) ||
    textField(source.kling_negative_prompt) ||
    textField(source.negativePrompt) ||
    textField(source.negative_prompt);
  const seedancePrompt =
    textField(source.seedancePrompt) ||
    textField(source.seedance_prompt) ||
    textField(source.seedance);
  return {
    analysis,
    klingPrompt,
    klingNegativePrompt,
    seedancePrompt,
    duration: Number(source.duration) || fallbackDuration,
    shots: Array.isArray(source.shots) ? source.shots : []
  };
}

function videoDirectionFromBody(body = {}) {
  const subjectChange = clippedText(body.subjectChange || "", 500);
  const backgroundChange = clippedText(body.backgroundChange || "", 500);
  const notes = clippedText(body.notes || "", 1000);
  return {
    subjectChange,
    backgroundChange,
    notes,
    hasDirection: Boolean(subjectChange || backgroundChange || notes)
  };
}

function videoTranscriptFromBody(body = {}) {
  return clippedText(body.transcript || body.audioTranscript || "", 1800);
}

function buildFallbackVideoPrompts(normalized, duration, body = {}) {
  const direction = videoDirectionFromBody(body);
  const transcript = videoTranscriptFromBody(body);
  const analysis = normalized.analysis || "The sampled frames show the source subject, framing, camera perspective, visible action, environment, lighting, and scene rhythm.";
  const safeDuration = Math.min(15, Math.max(1, Number(duration) || Number(normalized.duration) || 15));
  const subject = direction.subjectChange || "the same subject";
  const background = direction.backgroundChange || "the source video setting";
  const directionLine = direction.hasDirection
    ? `Apply required changes clearly: ${direction.subjectChange ? `subject becomes ${direction.subjectChange}. ` : ""}${direction.backgroundChange ? `background becomes ${direction.backgroundChange}. ` : ""}${direction.notes ? `Additional direction: ${direction.notes}.` : ""}`
    : "";
  const transcriptLine = transcript ? `Transcript/dialogue reference: ${transcript}` : "No transcript was available; infer only visible audio cues and environmental sound.";
  return {
    analysis: [analysis, directionLine, transcriptLine].filter(Boolean).join(" "),
    klingPrompt: normalized.klingPrompt || [
      `Kling 3 prompt, total ${safeDuration.toFixed(1)}s.`,
      `Shot 1 (${Math.min(3, safeDuration).toFixed(1)}s, motion intensity 1.4): ${subject} performs the same action and timing visible in the source video, staged in ${background}. Natural camera movement, clean subject continuity, coherent physics.`,
      safeDuration > 3 ? `Cut to. Shot 2 (${Math.max(1, safeDuration - 3).toFixed(1)}s, motion intensity 1.2): continue the source-video gesture rhythm with matching lens feel, color palette, texture, and scene rhythm in ${background}. Photorealistic cinematic realism.` : "",
      transcript ? `Use the transcript as the dialogue/lipsync timing reference: ${transcript}` : "",
      directionLine,
      analysis
    ].filter(Boolean).join(" "),
    klingNegativePrompt: normalized.klingNegativePrompt || "temporal flicker, morphing, unstable anatomy, deformed hands, identity drift, background drift, inconsistent physics, warped objects, compression artifacts, text deformation",
    seedancePrompt: normalized.seedancePrompt || `Wide shot, 35mm lens, eye-level angle, slow push-in: ${subject} in ${background} performs the same source-video action and timing. Cut to. Medium shot, 50mm lens, eye-level angle, gentle tracking movement: continue the gesture rhythm with stable identity, coherent physics, and natural movement. Cut to. Close-up, 70mm lens, slight low angle, subtle handheld drift: hold the key expression, gesture, material texture, and atmosphere while preserving the requested subject and background changes. Photo real, natural framing. Audio: ${transcript ? `use the source dialogue/lipsync cue "${transcript}".` : "diegetic sound only - natural ambience, environmental foley, and subject-driven sound."}`
  };
}

function secondsLabel(value) {
  return `${Math.max(0, Number(value) || 0).toFixed(2)}s`;
}

function clippedText(value, maxLength = 900) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function safeBaseName(value, fallback = "prompt-atlas-video") {
  return String(value || fallback)
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || fallback;
}

function safeHeaderFileName(value) {
  return String(value || "download.bin").replace(/["\r\n\\]+/g, "-").slice(0, 140);
}

function parseMediaDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;,]+)?(?:;[^,]*)?;base64,([\s\S]+)$/);
  if (!match) return null;
  return {
    mime: match[1] || "application/octet-stream",
    buffer: Buffer.from(match[2], "base64")
  };
}

function extensionFromMime(mime, fallback = ".mp4") {
  const clean = String(mime || "").toLowerCase();
  if (clean.includes("webm")) return ".webm";
  if (clean.includes("mpeg")) return ".mp3";
  if (clean.includes("mp3")) return ".mp3";
  if (clean.includes("mp4")) return ".mp4";
  if (clean.includes("m4a")) return ".m4a";
  if (clean.includes("wav")) return ".wav";
  if (clean.includes("quicktime")) return ".mov";
  return fallback;
}

function extensionFromName(fileName, fallback = ".mp4") {
  const ext = path.extname(String(fileName || "")).toLowerCase();
  return ext && ext.length <= 8 ? ext : fallback;
}

async function saveImageSliceToDirectory({ directory, filename, dataUrl } = {}) {
  const targetDir = path.resolve(String(directory || ""));
  if (!path.isAbsolute(targetDir)) {
    return { status: 400, body: { error: "Invalid output directory." } };
  }

  const cleanFileName = String(filename || "")
    .replace(/[<>:"/\\|?*\x00-\x1F]+/g, "-")
    .replace(/^\.+/, "")
    .slice(0, 180);
  if (!cleanFileName) {
    return { status: 400, body: { error: "Invalid output filename." } };
  }

  const media = parseMediaDataUrl(dataUrl);
  if (!media || !media.mime.startsWith("image/")) {
    return { status: 400, body: { error: "Invalid image data." } };
  }

  const targetPath = path.resolve(targetDir, cleanFileName);
  const safeRoot = targetDir.endsWith(path.sep) ? targetDir : `${targetDir}${path.sep}`;
  if (!targetPath.startsWith(safeRoot)) {
    return { status: 400, body: { error: "Output path escapes selected directory." } };
  }

  await mkdir(targetDir, { recursive: true });
  await writeFile(targetPath, media.buffer);
  return { status: 200, body: { ok: true, path: targetPath } };
}

function candidateFfmpegPaths() {
  const unpackedAppRoot = appRoot.endsWith(".asar") ? `${appRoot}.unpacked` : "";
  const resourcesPath = typeof process.resourcesPath === "string" ? process.resourcesPath : "";
  const candidates = [
    process.env.FFMPEG_PATH,
    unpackedAppRoot ? path.join(unpackedAppRoot, "tools", "ffmpeg", "bin", "ffmpeg.exe") : "",
    unpackedAppRoot ? path.join(unpackedAppRoot, "tools", "ffmpeg", "bin", "ffmpeg") : "",
    resourcesPath ? path.join(resourcesPath, "app.asar.unpacked", "tools", "ffmpeg", "bin", "ffmpeg.exe") : "",
    resourcesPath ? path.join(resourcesPath, "app.asar.unpacked", "tools", "ffmpeg", "bin", "ffmpeg") : "",
    path.join(appRoot, "tools", "ffmpeg", "bin", "ffmpeg.exe"),
    path.join(appRoot, "tools", "ffmpeg", "bin", "ffmpeg"),
    path.join(appRoot, "tools", "ffmpeg", "ffmpeg.exe"),
    path.join(appRoot, "tools", "ffmpeg", "ffmpeg"),
    "/opt/homebrew/bin/ffmpeg",
    "/usr/local/bin/ffmpeg",
    "/usr/bin/ffmpeg",
    "ffmpeg"
  ];
  const commonRoots = [
    "C:\\ffmpeg",
    "C:\\Program Files\\ffmpeg",
    "C:\\Program Files (x86)\\ffmpeg",
    "C:\\Prism\\Tools\\FFmpeg",
    "C:\\cgru.3.2.2"
  ];
  for (const root of commonRoots) {
    candidates.push(path.join(root, "bin", "ffmpeg.exe"), path.join(root, "ffmpeg.exe"));
    try {
      if (!existsSync(root)) continue;
      for (const entry of readdirSync(root, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          candidates.push(path.join(root, entry.name, "bin", "ffmpeg.exe"));
        }
      }
    } catch {
      // Optional discovery only.
    }
  }
  return [...new Set(candidates.filter(Boolean))];
}

async function resolveFfmpegPath() {
  if (cachedFfmpegPath) return cachedFfmpegPath;
  for (const candidate of candidateFfmpegPaths()) {
    if (candidate !== "ffmpeg" && !existsSync(candidate)) continue;
    try {
      await execFileAsync(candidate, ["-version"], { timeout: 5000, windowsHide: true });
      cachedFfmpegPath = candidate;
      return candidate;
    } catch {
      // Try the next known install location.
    }
  }
  throw new Error("FFmpeg is not available yet. Install FFmpeg, add its bin folder to Path, then restart Prompt Atlas.");
}

function blackVideoSize(width, height) {
  const sourceWidth = Math.max(1, Number(width) || 16);
  const sourceHeight = Math.max(1, Number(height) || 9);
  const ratio = sourceWidth / sourceHeight;
  const longEdge = 640;
  let outWidth;
  let outHeight;
  if (ratio >= 1) {
    outWidth = longEdge;
    outHeight = Math.round(longEdge / ratio);
  } else {
    outHeight = longEdge;
    outWidth = Math.round(longEdge * ratio);
  }
  outWidth = Math.max(2, outWidth + (outWidth % 2));
  outHeight = Math.max(2, outHeight + (outHeight % 2));
  return { width: outWidth, height: outHeight };
}

function buildLocalVideoResult(validFrames, duration, body, model, warning = "") {
  const safeDuration = Math.min(15, Math.max(1, Number(duration) || 15));
  const sourceName = clippedText(body.fileName || "source video", 120);
  const direction = videoDirectionFromBody(body);
  const transcript = videoTranscriptFromBody(body);
  const frames = validFrames.slice(0, 6);
  const shotCount = Math.max(1, frames.length);
  const shotDuration = Math.max(1, safeDuration / shotCount);
  const timingLine = frames
    .map((frame, index) => `frame ${index + 1} at ${secondsLabel(frame.time)}`)
    .join(", ");
  const directionLine = direction.hasDirection
    ? [
        direction.subjectChange ? `Change subject to: ${direction.subjectChange}.` : "",
        direction.backgroundChange ? `Change background to: ${direction.backgroundChange}.` : "",
        direction.notes ? `Additional direction: ${direction.notes}` : ""
      ].filter(Boolean).join(" ")
    : "No subject or background change was provided.";
  const audioLine = transcript
    ? `Transcript/dialogue cue: ${transcript}`
    : "No transcript was available; use visible audio cues only.";
  const requestedSubject = direction.subjectChange || "the visible subject";
  const requestedBackground = direction.backgroundChange || "the source video environment";
  const shots = frames.map((frame, index) => ({
    time: Number(frame.time || 0),
    duration: Math.min(shotDuration, safeDuration).toFixed(2),
    frame: index + 1,
    action: "preserve the visible subject, movement, environment, lighting, lens feel and continuity from this sampled frame",
    camera: index % 3 === 0 ? "slow push-in" : index % 3 === 1 ? "gentle tracking move" : "subtle handheld drift",
    motionIntensity: index % 2 === 0 ? 1.4 : 1.2
  }));
  const analysis = [
    `Source video "${sourceName}" was sampled across ${secondsLabel(safeDuration)} using ${timingLine}.`,
    "Use the sampled frames as continuity anchors for subject identity, wardrobe, action, background layout, camera perspective, light direction, texture and rhythm.",
    directionLine,
    audioLine
  ].join(" ");
  const klingShots = shots.map((shot, index) => {
    const size = index === 0 ? "wide establishing frame" : index % 2 ? "medium close-up" : "close-up detail frame";
    return `Shot ${index + 1} (${Number(shot.duration).toFixed(1)}s, motion intensity ${shot.motionIntensity}): ${requestedSubject} performs the same source-video movement and timing in ${requestedBackground}. Use a ${size}, ${shot.camera}, clean cut timing, stable identity, coherent physics and matching source-video lighting logic.`;
  });
  const seedanceShots = shots.map((shot, index) => {
    const size = index === 0 ? "Wide shot" : index % 2 ? "Medium shot" : "Close-up";
    const lens = index === 0 ? "35mm lens" : index % 2 ? "50mm lens" : "70mm lens";
    const angle = index % 3 === 2 ? "slight low angle" : "eye-level angle";
    return `${size}, ${lens}, ${angle}, ${shot.camera}: ${requestedSubject} in ${requestedBackground}, performing the same source-video action and timing`;
  });

  return {
    analysis,
    klingPrompt: [
      `Kling 3 prompt, total ${safeDuration.toFixed(1)}s.`,
      klingShots.join(" Cut to. "),
      transcript ? `Use dialogue/lipsync timing from transcript: ${transcript}` : "",
      "Preserve the source cuts, camera path, gesture rhythm, lens feel and scene pacing. Apply the requested subject/background changes clearly. Photorealistic cinematic realism, stable anatomy, coherent physics and clean temporal continuity."
    ].filter(Boolean).join(" "),
    klingNegativePrompt: "temporal flicker, morphing, unstable anatomy, deformed hands, incorrect finger count, asymmetrical face, identity drift, rubber limbs, background drift, inconsistent physics, warped objects, compression artifacts, unreadable text, logo distortion",
    seedancePrompt: `${seedanceShots.join(". Cut to. ")}. Photo real, natural framing. Audio: ${transcript ? `use the source dialogue/lipsync cue "${transcript}".` : "diegetic sound only - natural ambience, environmental foley, and subject-driven sound."}`,
    duration: safeDuration,
    shots,
    model: model || "local-video-fallback",
    warning
  };
}

function resolveModel(...candidates) {
  const model = candidates.find((candidate) => typeof candidate === "string" && candidate.trim());
  return model?.trim() || defaultModel;
}

function openAIRequestBody({ model, input, maxOutputTokens = 900, temperature = 0.85 }) {
  const body = {
    model,
    input,
    max_output_tokens: maxOutputTokens
  };

  if (!model.startsWith("gpt-5")) {
    body.temperature = temperature;
  }

  return body;
}

async function fetchJsonWithTimeout(url, options, timeoutMs = 45000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error("Request timed out.")), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const payload = await response.json().catch(() => ({}));
    return { response, payload };
  } finally {
    clearTimeout(timeout);
  }
}

async function refinePrompt(body, injectedSettings) {
  const settings = injectedSettings || await readSettings();
  const prompt = String(body.prompt || "").trim();
  if (!prompt) {
    return { ok: false, status: 400, body: { error: "No prompt was provided." } };
  }

  const routed = await routePromptSkills(buildInstruction({
    intent: body.intent,
    transform: body.transform,
    outputType: body.outputType,
    targetEngine: body.targetEngine
  }), {
    media: body.outputType === "video" ? "video" : "image",
    targetEngine: body.targetEngine,
    task: "refine"
  });
  const result = await callLlm({
    settings,
    model: body.model,
    system: routed.system,
    userText: prompt
  });

  if (!result.ok) {
    return { ok: false, status: result.status, body: { error: result.error } };
  }

  return {
    ok: true,
    status: 200,
    body: { refined: result.text || "", model: result.model, skillTrace: routed.trace }
  };
}

async function composePrompt(body, injectedSettings) {
  const settings = injectedSettings || await readSettings();
  const intent = String(body.intent || "").trim();
  const localDraft = String(body.localDraft || "").trim();
  const blend = Array.isArray(body.blend) ? body.blend : [];

  const routed = await routePromptSkills(buildComposeInstruction({
    intent,
    outputType: body.outputType,
    complexity: body.complexity || 6,
    absurdity: body.absurdity || 5,
    targetEngine: body.targetEngine
  }), {
    media: body.outputType === "video" ? "video" : "image",
    targetEngine: body.targetEngine,
    task: "compose"
  });
  const result = await callLlm({
    settings,
    model: body.model,
    system: routed.system,
    userText: JSON.stringify(
      {
        intent,
        guide: body.guide || "",
        outputType: body.outputType || "image",
        targetEngine: targetEngineLabel(body.targetEngine),
        complexity: body.complexity || 6,
        absurdity: body.absurdity || 5,
        weightedThemes: blend,
        recentOutputsToAvoid: Array.isArray(body.recentOutputs) ? body.recentOutputs.slice(0, 3) : [],
        localDraft
      },
      null,
      2
    ),
    maxOutputTokens: 1000,
    temperature: 0.95
  });

  if (!result.ok) {
    return { ok: false, status: result.status, body: { error: result.error } };
  }

  return {
    ok: true,
    status: 200,
    body: { prompt: result.text || "", model: result.model, skillTrace: routed.trace }
  };
}

// Video Director: builds a model-specific video prompt,
// injecting that model's doc + the user's REFERENCES (@imageN). The shot count comes
// from the slider, not the number of references. BYOK via callLlm.
async function videoDirect(body, injectedSettings) {
  const settings = injectedSettings || await readSettings();
  const model = ["seedance", "kling", "minimax-h3", "flux-3", "veo", "wan"].includes(String(body.model)) ? String(body.model) : "seedance";
  const doc = await loadVideoModelDoc(model);
  const directingDoc = await loadDirectingEditingDoc();
  const mode = ["continuity", "abstract", "biologique"].includes(String(body.mode)) ? String(body.mode) : "";
  const director = String(body.director || "").trim().slice(0, 400);
  const directorSkill = String(body.directorSkill || "").trim().slice(0, 4000);
  const storyline = String(body.storyline || "").trim().slice(0, 6000);
  const durationMax = ({ seedance: 30, kling: 15, "minimax-h3": 15, "flux-3": 20, veo: 15, wan: 30 })[model] || 15;
  const durationSec = Math.round(clampNum(body.durationSec, 1, durationMax, Math.min(8, durationMax)));
  // Allow up to 20 shots regardless of model; the instruction reminds each model of its
  // own native sweet-spot/limit but the value is honoured.
  const shotCount = Math.round(clampNum(body.shotCount, 1, 20, 4));
  const style = {
    action: Math.round(clampNum(body.style && body.style.action, 0, 100, 50)),
    weird: Math.round(clampNum(body.style && body.style.weird, 0, 100, 30)),
    beauty: Math.round(clampNum(body.style && body.style.beauty, 0, 100, 50))
  };
  const intent = String(body.intent || "").trim();
  const seedThemes = Array.isArray(body.seedThemes) ? body.seedThemes.slice(0, 12) : [];

  // Resolve the LLM exactly like callLlm/composePrompt so we can decide vision support
  // (a non-vision model + attached images would otherwise 400 — avoid that).
  const llmModelId = resolveLlmModel(body.model_ai, settings.model, settings.llmModel, settings.openaiModel);
  const llmInfo = llmModelInfo(llmModelId);
  const canVision = !llmInfo || llmInfo.vision !== false;

  // References (the vertical @imageN tracks). Accept `references` (new) or `shots` (legacy).
  const images = [];
  const refsIn = Array.isArray(body.references) ? body.references : (Array.isArray(body.shots) ? body.shots : []);
  const references = refsIn.map((s, i) => {
    const ref = String((s && s.ref) || `@image${i + 1}`);
    const description = String((s && s.description) || "").trim();
    let hasImage = false;
    const img = s && s.imageBase64;
    if (canVision && typeof img === "string" && img.startsWith("data:image/") && images.length < 9) { images.push(img); hasImage = true; }
    return { ref, description, hasImage };
  });
  // Only non-empty references count (a description and/or an image).
  const usableRefs = references.filter((r) => r.description || r.hasImage);

  const routed = await routePromptSkills(
    buildVideoDirectInstruction({ model, doc, directingDoc, mode, director, directorSkill, storyline, durationSec, shotCount, style, refsHaveImages: images.length > 0, hasRefs: usableRefs.length > 0 }),
    { media: "video", targetEngine: ({ seedance: "Seedance 2.5", kling: "Kling 3.0 Omni", "minimax-h3": "MiniMax H3", "flux-3": "FLUX 3 Video", wan: "Wan 3.0", veo: "Veo 3.1" })[model] || model, task: "video-direct", maxChars: 42000 }
  );
  const result = await callLlm({
    settings,
    model: body.model_ai,
    system: routed.system,
    userText: JSON.stringify({ intent: intent || "open creative exploration", storyline, model, mode, director, directorSkill, durationSec, shotCount, style, references: usableRefs, seedThemes }, null, 2),
    images,
    maxOutputTokens: 2800,
    temperature: 0.9
  });

  if (!result.ok) {
    return { ok: false, status: result.status, body: { error: result.error } };
  }
  return { ok: true, status: 200, body: { prompt: result.text || "", model: result.model, skillTrace: routed.trace } };
}

// Suite v6 embeds the historical Blocking Studio engine instead of starting its
// standalone HTTP server. Expose the proven BYOK prompt layer so every Atlas
// workshop can share the encrypted API vault and the same model table.
export async function atlasAiStatus(injectedSettings) {
  const settings = injectedSettings || await readSettings();
  const promptSkills = await getPromptSkillReferenceStatus();
  return {
    model: resolveLlmModel(settings.model, settings.llmModel, settings.openaiModel),
    models: availableLlmModels,
    keyStates: {
      openai: Boolean(settings.openaiApiKey),
      anthropic: Boolean(settings.anthropicApiKey),
      deepseek: Boolean(settings.deepseekApiKey),
      google: Boolean(settings.googleApiKey)
    },
    available: ["openai", "anthropic", "deepseek", "google"].some((provider) =>
      Boolean(llmKeyFor(settings, provider))
    ),
    promptSkills
  };
}

function advisorTarget(prompt, explicitTarget, contextTool = "") {
  if (typeof explicitTarget === "string" && explicitTarget.trim()) return explicitTarget.trim();
  const text = `${contextTool} ${String(prompt || "")}`;
  if (/(blocking\s*studio|previz|prévis|previs|sc[eè]ne\s*3d|(?:build|create|construct|cr[eé]e|construis|fabrique).{0,24}sc[eè]ne|mouvement\s*(?:de\s*)?cam[eé]ra|camera\s*move|dolly|travelling|orbit(?:e|ing)?|champ.?contre.?champ)/i.test(text)) return "Blocking Studio";
  if (/wan\s*3|wan3/i.test(text)) return "Wan 3";
  if (/minimax|hailuo|\bh3\b/i.test(text)) return "MiniMax H3";
  if (/flux\s*3/i.test(text)) return "FLUX 3";
  if (/kling|\bo3\b/i.test(text)) return "Kling 3 Omni";
  if (/seedance/i.test(text)) return "Seedance 2.5";
  if (/veo/i.test(text)) return "Veo 3";
  return "General generative media";
}

export function extractBlockingStudioPlan(text) {
  const source = String(text || "");
  const marker = /```barz-blocking-scene\b/i.exec(source);
  if (!marker) return { answer: source.trim(), plan: null };

  const explanation = source.slice(0, marker.index).trim();
  const payload = source.slice(marker.index + marker[0].length, marker.index + marker[0].length + 100_000);
  const plan = extractFirstJsonObject(payload);
  if (plan && typeof plan === "object" && !Array.isArray(plan)) {
    return {
      answer: explanation || "La scène Blocking Studio est prête à être construite.",
      plan
    };
  }

  return {
    answer: [
      explanation,
      "Atlas n’a pas pu terminer le plan Blocking Studio. Relance la demande : tu n’as aucun JSON à copier ni à coller."
    ].filter(Boolean).join("\n\n"),
    plan: null
  };
}

export async function atlasAiAdvisor(body = {}, injectedSettings) {
  const settings = injectedSettings || await readSettings();
  const prompt = String(body.prompt || "").trim();
  const images = (Array.isArray(body.images) ? body.images : [])
    .filter((value) => typeof value === "string" && /^data:image\//i.test(value))
    .slice(0, 4);
  if (!prompt && !images.length) {
    return { ok: false, status: 400, body: { error: "Write a question or add an image." } };
  }
  const targetEngine = advisorTarget(prompt, body.targetEngine, body.contextTool);
  const routed = await routePromptSkills([
    "You are Atlas Advisor, the always-available production assistant inside BARZ Suite 6.",
    "Answer the user's actual question directly. Inspect attached images when present.",
    "Use the routed engine, directing, staging and photography knowledge when relevant.",
    "If the request asks for a prompt, put only the copy-ready text under **Prompt**. Put your settings, risks, and remarks under separate **Settings** or **Risk** headings afterward, never inside the prompt itself.",
    "Do not claim that a model supports a feature when the routed reference marks it unsupported or unverified.",
    "Be concise, practical, and reply in the user's language."
  ].join("\n"), {
    media: /image|photo|still/i.test(`${prompt} ${targetEngine}`) ? "image" : "video",
    targetEngine,
    task: "advisor",
    requestText: `${body.contextTool || ""} ${prompt}`,
    maxChars: 36000
  });
  const result = await callLlm({
    settings,
    model: body.model,
    system: routed.system,
    userText: prompt || "Analyze the attached image and tell me how to use it effectively in BARZ Suite 6.",
    images,
    maxOutputTokens: targetEngine === "Blocking Studio" ? 4800 : 1800,
    temperature: targetEngine === "Blocking Studio" ? 0.35 : 0.65,
    timeoutMs: 60000
  });
  if (!result.ok) return { ok: false, status: result.status, body: { error: result.error, model: result.model } };
  const blocking = targetEngine === "Blocking Studio" ? extractBlockingStudioPlan(result.text) : { answer: result.text || "", plan: null };
  return {
    ok: true,
    status: 200,
    body: { answer: blocking.answer, model: result.model, provider: result.provider, skillTrace: routed.trace, ...(blocking.plan ? { blockingScene: blocking.plan } : {}) }
  };
}

export async function atlasAiRefine(body, injectedSettings) {
  return refinePrompt(body, injectedSettings);
}

export async function atlasAiCompose(body, injectedSettings) {
  return composePrompt(body, injectedSettings);
}

export async function atlasAiVideoDirect(body, injectedSettings) {
  return videoDirect(body, injectedSettings);
}

async function analyzeImage(body) {
  const settings = await readSettings();
  const imageDataUrl = String(body.imageDataUrl || "");
  if (!imageDataUrl.startsWith("data:image/")) {
    return { ok: false, status: 400, body: { error: "No image was provided." } };
  }

  const routed = await routePromptSkills(buildImageAnalysisInstruction(), {
    media: "image",
    targetEngine: body.targetEngine || "General image generation",
    task: "image-analysis"
  });
  const result = await callLlm({
    settings,
    model: body.model,
    system: routed.system,
    userText: `Analyze this image for ${appName} and return the requested JSON.`,
    images: [imageDataUrl],
    maxOutputTokens: 1200,
    temperature: 0.55
  });

  if (!result.ok) {
    return { ok: false, status: result.status, body: { error: result.error } };
  }

  const text = result.text;
  const model = result.model;
  let parsed = null;
  try {
    parsed = JSON.parse(cleanJsonFence(text));
  } catch {
    parsed = { prompt: text || "", subject: "", context: "", style: "" };
  }
  const normalized = normalizeImageAnalysis(parsed);

  return {
    ok: true,
    status: 200,
    body: {
      prompt: normalized.prompt || "",
      seedance: {
        subject: normalized.subject || "",
        context: normalized.context || "",
        style: normalized.style || ""
      },
      model,
      skillTrace: routed.trace
    }
  };
}

async function analyzeStyle(body) {
  const settings = await readSettings();
  const imageDataUrl = String(body.imageDataUrl || "");
  if (!imageDataUrl.startsWith("data:image/")) {
    return { ok: false, status: 400, body: { error: "No image was provided." } };
  }

  const cineDna = await loadCineDnaDoc();
  const routed = await routePromptSkills(buildStyleAnalysisInstruction(cineDna), {
    media: "image",
    targetEngine: body.targetEngine || "General image generation",
    task: "style-analysis",
    maxChars: 30000
  });
  const result = await callLlm({
    settings,
    model: body.model,
    system: routed.system,
    userText: "Analyze the provided image and return its shooting-origin prompt fragment in English, following the CINE-DNA output contract.",
    images: [imageDataUrl],
    maxOutputTokens: 700,
    temperature: 0.4
  });

  if (!result.ok) {
    return { ok: false, status: result.status, body: { error: result.error } };
  }

  return {
    ok: true,
    status: 200,
    body: {
      style: cleanJsonFence(result.text).trim(),
      model: result.model,
      skillTrace: routed.trace
    }
  };
}

function buildAutoBlockInstruction(autoDoc = "", cineDoc = "") {
  const parts = [
    `You are the AI Auto-Blocking engine inside ${appName}.`,
    "From ONE reference image, output a ROUGH 3D blocking (primitives + a camera) that the",
    "Blocking Studio can instantiate as a first pass for hand refinement. Follow the",
    "AUTO-BLOCKING reference and its STRICT JSON output contract EXACTLY.",
    "Return ONLY a single JSON object — no prose, no markdown fences."
  ];
  if (autoDoc) {
    parts.push(
      "----- BEGIN AUTO-BLOCKING REFERENCE -----",
      autoDoc,
      "----- END AUTO-BLOCKING REFERENCE -----"
    );
  }
  if (cineDoc) {
    parts.push(
      "You may use this CINE-DNA reference to better estimate the camera (focal/angle/height):",
      "----- BEGIN CINE-DNA REFERENCE -----",
      cineDoc,
      "----- END CINE-DNA REFERENCE -----"
    );
  }
  return parts.join("\n");
}

// Pull the first balanced {...} JSON object out of arbitrary model text (tolerates fences,
// leading prose, trailing notes). Returns the parsed object or null.
function extractFirstJsonObject(text) {
  const direct = parsePossibleJson(text);
  if (direct && typeof direct === "object" && !Array.isArray(direct)) return direct;
  const s = String(text || "");
  const start = s.indexOf("{");
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(s.slice(start, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

const AUTO_BLOCK_TYPES = new Set(["box", "cylinder", "sphere", "cone", "pyramid", "plane", "dome", "torus", "car", "bus", "facade", "human", "null"]);
function vec3(value, fallback) {
  if (!Array.isArray(value)) return fallback.slice();
  const out = [0, 1, 2].map((i) => (Number.isFinite(Number(value[i])) ? Number(value[i]) : fallback[i]));
  return out;
}
function hexColor(value, fallback) {
  const s = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toLowerCase() : fallback;
}
// Validate + clamp the model's scene to a safe shape. Keeps only valid objects.
function normalizeAutoBlockScene(raw) {
  const data = (raw && typeof raw === "object") ? raw : {};
  const objs = Array.isArray(data.objects) ? data.objects : [];
  const objects = [];
  objs.slice(0, 24).forEach((o, i) => {
    if (!o || typeof o !== "object") return;
    let type = String(o.type || "box").toLowerCase().trim();
    if (!AUTO_BLOCK_TYPES.has(type)) type = "box";
    const out = {
      type,
      label: String(o.label || type || `object ${i + 1}`).slice(0, 48),
      position: vec3(o.position, [0, 0, 0]),
      rotation: vec3(o.rotation, [0, 0, 0]),
      scale: vec3(o.scale, [1, 1, 1]).map((n) => clampNum(n, 0.02, 100, 1)),
      color: hexColor(o.color, "#8a8480")
    };
    // image_anchor [u,v] (normalized 0..1) — used by the client depth pass to refine Z.
    if (Array.isArray(o.image_anchor) && o.image_anchor.length >= 2) {
      out.image_anchor = [clampNum(o.image_anchor[0], 0, 1, 0.5), clampNum(o.image_anchor[1], 0, 1, 0.5)];
    }
    objects.push(out);
  });
  const cam = (data.camera && typeof data.camera === "object") ? data.camera : {};
  const camera = {
    focal_mm: clampNum(cam.focal_mm, 8, 300, 35),
    position: vec3(cam.position, [3.2, 1.5, 3.8]),
    target: vec3(cam.target, [0, 1, 0])
  };
  return { objects, camera, notes: String(data.notes || "").slice(0, 240) };
}

async function autoBlock(body) {
  const settings = await readSettings();
  const imageDataUrl = String(body.imageDataUrl || body.imageBase64 || "");
  if (!imageDataUrl.startsWith("data:image/")) {
    return { ok: false, status: 400, body: { ok: false, error: "No reference image was provided." } };
  }
  const [autoDoc, cineDoc] = await Promise.all([loadAutoBlockingDoc(), loadCineDnaDoc()]);
  const routed = await routePromptSkills(buildAutoBlockInstruction(autoDoc, cineDoc), {
    media: "video",
    targetEngine: body.targetEngine || body.engine || "General video generation",
    task: "auto-block",
    maxChars: 32000
  });
  const result = await callLlm({
    settings,
    model: body.model,
    system: routed.system,
    userText: "Reconstruct a rough 3D blocking from this reference image and return ONLY the strict JSON object from the AUTO-BLOCKING contract.",
    images: [imageDataUrl],
    maxOutputTokens: 1500,
    temperature: 0.4
  });
  if (!result.ok) {
    return { ok: false, status: result.status, body: { ok: false, error: result.error } };
  }
  const parsed = extractFirstJsonObject(result.text);
  if (!parsed) {
    return { ok: false, status: 422, body: { ok: false, error: "The model did not return valid JSON. Try again." } };
  }
  const scene = normalizeAutoBlockScene(parsed);
  if (!scene.objects.length && !scene.camera) {
    return { ok: false, status: 422, body: { ok: false, error: "The model returned an empty scene." } };
  }
  return { ok: true, status: 200, body: { ok: true, scene, model: result.model, skillTrace: routed.trace } };
}

/* ===================== Blocking Solver — MoGe-2 geometry (Phase 1) =====================
   MoGe-2 (MIT) ONNX via onnxruntime-node. Input: image [1,3,H,W] in 0..1 + num_tokens.
   Outputs: affine point map [1,H,W,3] (OpenCV x-right/y-down/z-forward), normal, mask,
   metric_scale. The ONNX omits MoGe's focal/shift recovery, so we port the closed-form
   `point_map_to_depth_legacy` solve here, then z += shift and × metric_scale. */
let _ortNode = null, _mogeSession = null;
async function getMogeSession() {
  if (_mogeSession) return _mogeSession;
  if (!_ortNode) _ortNode = await import("onnxruntime-node");
  const modelPath = path.join(barzyDir, "public", "assets", "vendor", "models", "moge2", "model.onnx");
  if (!existsSync(modelPath)) throw new Error(`MoGe model missing at ${modelPath}`);
  _mogeSession = await _ortNode.InferenceSession.create(modelPath, { executionProviders: ["cpu"] });
  return _mogeSession;
}
// Normalized view-plane UV (MoGe convention): u[x] = span_x*(2x-(W-1))/W, v[y] likewise.
function viewPlaneSpans(W, H) {
  const ar = W / H, k = Math.sqrt(1 + ar * ar);
  return { spanX: ar / k, spanY: 1 / k };
}
// Closed-form least squares for focal (relative to half-diagonal) + z-shift over masked points.
function recoverFocalShift(points, mask, W, H) {
  const { spanX, spanY } = viewPlaneSpans(W, H);
  const stride = Math.max(1, Math.ceil(Math.max(W, H) / 64));   // ~64x64 solve grid
  let M00 = 0, M01 = 0, M11 = 0, b0 = 0, b1 = 0, n = 0;
  for (let y = 0; y < H; y += stride) {
    const v = spanY * (2 * y - (H - 1)) / H;
    for (let x = 0; x < W; x += stride) {
      const p = y * W + x;
      if (mask && mask[p] <= 0.5) continue;
      const u = spanX * (2 * x - (W - 1)) / W;
      const X = points[p * 3], Y = points[p * 3 + 1], Z = points[p * 3 + 2];
      // rows [X,-u] rhs u*Z ; [Y,-v] rhs v*Z
      M00 += X * X + Y * Y;
      M01 += -(X * u + Y * v);
      M11 += u * u + v * v;
      b0 += X * (u * Z) + Y * (v * Z);
      b1 += -(u * u * Z + v * v * Z);
      n++;
    }
  }
  if (n < 8) return { focal: 1, shift: 0, n };
  const e = 1e-6, a = M00 + e, d = M11 + e;
  const det = a * d - M01 * M01;
  if (Math.abs(det) < 1e-12) return { focal: 1, shift: 0, n };
  let focal = (d * b0 - M01 * b1) / det;
  let shift = (-M01 * b0 + a * b1) / det;
  if (!(focal > 0)) focal = 1;
  if (!Number.isFinite(shift)) shift = 0;
  return { focal, shift, n };
}
async function solverGeometry(body) {
  const W = Math.round(Number(body.width) || 0), H = Math.round(Number(body.height) || 0);
  const rgbB64 = String(body.rgb || "");
  if (!W || !H || !rgbB64) return { ok: false, status: 400, body: { ok: false, error: "Missing image data (width, height, rgb)." } };
  const rgb = Buffer.from(rgbB64, "base64");
  if (rgb.length < W * H * 3) return { ok: false, status: 400, body: { ok: false, error: "RGB buffer too small for given dimensions." } };
  let session, ort;
  try { session = await getMogeSession(); ort = _ortNode; }
  catch (e) { return { ok: false, status: 500, body: { ok: false, error: `MoGe model failed to load: ${e.message || e}` } }; }
  const img = new Float32Array(3 * H * W);
  const plane = H * W;
  for (let p = 0; p < plane; p++) { const o = p * 3; img[p] = rgb[o] / 255; img[plane + p] = rgb[o + 1] / 255; img[2 * plane + p] = rgb[o + 2] / 255; }
  const image = new ort.Tensor("float32", img, [1, 3, H, W]);
  let numTokens;
  try { numTokens = new ort.Tensor("int64", BigInt64Array.from([1800n]), []); } catch { numTokens = new ort.Tensor("int64", BigInt64Array.from([1800n]), [1]); }
  let out, ms;
  try { const t0 = Date.now(); out = await session.run({ image, num_tokens: numTokens }); ms = Date.now() - t0; }
  catch (e) { return { ok: false, status: 500, body: { ok: false, error: `MoGe inference failed: ${e.message || e}` } }; }
  const points = out.points.data, mask = out.mask.data;
  const metricScale = ((out.scale || out.metric_scale) && (out.scale || out.metric_scale).data[0]) || 1;
  const { focal, shift, n } = recoverFocalShift(points, mask, W, H);
  const diag = Math.hypot(W, H);
  const fovX = 2 * Math.atan(W / diag / focal), fovY = 2 * Math.atan(H / diag / focal);
  // Downsample to a grid (<=256 on the long side), keep valid + positive-depth points.
  const stride = Math.max(1, Math.ceil(Math.max(W, H) / 256));
  const pts = [], cols = [], px = [];
  for (let y = 0; y < H; y += stride) for (let x = 0; x < W; x += stride) {
    const p = y * W + x;
    if (mask[p] <= 0.5) continue;
    const z = points[p * 3 + 2] + shift;
    if (!(z > 0)) continue;
    pts.push(points[p * 3] * metricScale, points[p * 3 + 1] * metricScale, z * metricScale);
    const o = p * 3; cols.push(rgb[o], rgb[o + 1], rgb[o + 2]);
    px.push(x, y);   // source pixel of each point, so the client can select points under a mask (Phase 3)
  }
  return {
    ok: true, status: 200,
    body: {
      ok: true, width: W, height: H,
      fovDeg: fovY * 180 / Math.PI, fovXDeg: fovX * 180 / Math.PI,
      focal, shift, metricScale, solvePoints: n, count: pts.length / 3, inferenceMs: ms,
      points: Buffer.from(new Float32Array(pts).buffer).toString("base64"),
      colors: Buffer.from(Uint8Array.from(cols).buffer).toString("base64"),
      coords: Buffer.from(Uint16Array.from(px).buffer).toString("base64")
    }
  };
}

/* ===================== Blocking Solver — MobileSAM segmentation (Phase 2) =====================
   MobileSAM (Apache-2.0) ONNX via onnxruntime-node: encoder (HWC image -> [1,256,64,64]
   embedding) + the standard SAM mask decoder (shared with MobileSAM, which only swaps the
   image encoder). We replicate samexporter's pipeline: warp the source image (uniform scale,
   top-left aligned) into a fixed INPUT_H x INPUT_W canvas, encode once and cache the embedding
   per imageId; then per click run the decoder with prompt points mapped into canvas space. */
const SAM_INPUT_H = 684, SAM_INPUT_W = 1024;
let _samEncoder = null, _samDecoder = null;
async function getSamSessions() {
  if (_samEncoder && _samDecoder) return { enc: _samEncoder, dec: _samDecoder, ort: _ortNode };
  if (!_ortNode) _ortNode = await import("onnxruntime-node");
  const dir = path.join(barzyDir, "public", "assets", "vendor", "models", "mobilesam");
  const encPath = path.join(dir, "encoder.onnx"), decPath = path.join(dir, "decoder.onnx");
  if (!existsSync(encPath) || !existsSync(decPath)) throw new Error(`MobileSAM model(s) missing in ${dir}`);
  if (!_samEncoder) _samEncoder = await _ortNode.InferenceSession.create(encPath, { executionProviders: ["cpu"] });
  if (!_samDecoder) _samDecoder = await _ortNode.InferenceSession.create(decPath, { executionProviders: ["cpu"] });
  return { enc: _samEncoder, dec: _samDecoder, ort: _ortNode };
}
// Small LRU of embeddings keyed by client imageId so refining points doesn't re-run the encoder.
const _samCache = new Map();
const SAM_CACHE_MAX = 4;
function samCachePut(id, entry) {
  if (_samCache.has(id)) _samCache.delete(id);
  _samCache.set(id, entry);
  while (_samCache.size > SAM_CACHE_MAX) _samCache.delete(_samCache.keys().next().value);
}
function samCacheGet(id) { const e = _samCache.get(id); if (e) { _samCache.delete(id); _samCache.set(id, e); } return e; }

async function solverEmbed(body) {
  const W = Math.round(Number(body.width) || 0), H = Math.round(Number(body.height) || 0);
  const id = String(body.imageId || "");
  const rgbB64 = String(body.rgb || "");
  if (!id) return { ok: false, status: 400, body: { ok: false, error: "Missing imageId." } };
  if (!W || !H || !rgbB64) return { ok: false, status: 400, body: { ok: false, error: "Missing image data (width, height, rgb)." } };
  const rgb = Buffer.from(rgbB64, "base64");
  if (rgb.length < W * H * 3) return { ok: false, status: 400, body: { ok: false, error: "RGB buffer too small for given dimensions." } };
  let enc, ort;
  try { ({ enc, ort } = await getSamSessions()); }
  catch (e) { return { ok: false, status: 500, body: { ok: false, error: `MobileSAM failed to load: ${e.message || e}` } }; }
  // Uniform scale into the fixed canvas (top-left aligned), rest stays black padding.
  const scale = Math.min(SAM_INPUT_W / W, SAM_INPUT_H / H);
  const canvas = new Float32Array(SAM_INPUT_H * SAM_INPUT_W * 3);
  for (let cy = 0; cy < SAM_INPUT_H; cy++) {
    const sy = cy / scale; if (sy >= H) continue;
    const y0 = Math.floor(sy), y1 = Math.min(H - 1, y0 + 1), fy = sy - y0;
    for (let cx = 0; cx < SAM_INPUT_W; cx++) {
      const sx = cx / scale; if (sx >= W) continue;
      const x0 = Math.floor(sx), x1 = Math.min(W - 1, x0 + 1), fx = sx - x0;
      const o00 = (y0 * W + x0) * 3, o01 = (y0 * W + x1) * 3, o10 = (y1 * W + x0) * 3, o11 = (y1 * W + x1) * 3;
      const d = (cy * SAM_INPUT_W + cx) * 3;
      for (let c = 0; c < 3; c++) {
        const top = rgb[o00 + c] * (1 - fx) + rgb[o01 + c] * fx;
        const bot = rgb[o10 + c] * (1 - fx) + rgb[o11 + c] * fx;
        canvas[d + c] = top * (1 - fy) + bot * fy;
      }
    }
  }
  let ms;
  try {
    const t0 = Date.now();
    const out = await enc.run({ input_image: new ort.Tensor("float32", canvas, [SAM_INPUT_H, SAM_INPUT_W, 3]) });
    const emb = out.image_embeddings;
    samCachePut(id, { data: emb.data, dims: emb.dims, scale, srcW: W, srcH: H });
    ms = Date.now() - t0;
  } catch (e) { return { ok: false, status: 500, body: { ok: false, error: `MobileSAM encode failed: ${e.message || e}` } }; }
  return { ok: true, status: 200, body: { ok: true, imageId: id, width: W, height: H, scale, inferenceMs: ms } };
}

async function solverSegment(body) {
  const id = String(body.imageId || "");
  const pts = Array.isArray(body.points) ? body.points : [];
  const box = Array.isArray(body.box) && body.box.length === 4 ? body.box.map(Number) : null;
  if (!id) return { ok: false, status: 400, body: { ok: false, error: "Missing imageId." } };
  if (!pts.length && !box) return { ok: false, status: 400, body: { ok: false, error: "No points or box provided." } };
  const cache = samCacheGet(id);
  if (!cache) return { ok: false, status: 409, body: { ok: false, error: "No embedding for this image — call /api/solver/embed first." } };
  let dec, ort;
  try { ({ dec, ort } = await getSamSessions()); }
  catch (e) { return { ok: false, status: 500, body: { ok: false, error: `MobileSAM failed to load: ${e.message || e}` } }; }
  const { scale, srcW, srcH } = cache;
  let coords, labels;
  if (box) {
    // Box prompt: the two corners as points labeled 2 (top-left) / 3 (bottom-right), no padding.
    coords = Float32Array.from([box[0] * scale, box[1] * scale, box[2] * scale, box[3] * scale]);
    labels = Float32Array.from([2, 3]);
  } else {
    // Point prompt(s) -> canvas space, with the trailing padding point SAM expects (label -1).
    const N = pts.length;
    coords = new Float32Array((N + 1) * 2); labels = new Float32Array(N + 1);
    for (let i = 0; i < N; i++) {
      coords[i * 2] = (Number(pts[i][0]) || 0) * scale;
      coords[i * 2 + 1] = (Number(pts[i][1]) || 0) * scale;
      labels[i] = Number(pts[i][2]) >= 0.5 ? 1 : 0;
    }
    coords[N * 2] = 0; coords[N * 2 + 1] = 0; labels[N] = -1;
  }
  const M = labels.length;
  const feeds = {
    image_embeddings: new ort.Tensor("float32", cache.data, cache.dims),
    point_coords: new ort.Tensor("float32", coords, [1, M, 2]),
    point_labels: new ort.Tensor("float32", labels, [1, M]),
    mask_input: new ort.Tensor("float32", new Float32Array(256 * 256), [1, 1, 256, 256]),
    has_mask_input: new ort.Tensor("float32", Float32Array.from([0]), [1]),
    orig_im_size: new ort.Tensor("float32", Float32Array.from([SAM_INPUT_H, SAM_INPUT_W]), [2])
  };
  let out, ms;
  try { const t0 = Date.now(); out = await dec.run(feeds); ms = Date.now() - t0; }
  catch (e) { return { ok: false, status: 500, body: { ok: false, error: `MobileSAM decode failed: ${e.message || e}` } }; }
  const logits = out.masks.data;   // [1,1,SAM_INPUT_H,SAM_INPUT_W]
  const iou = out.iou_predictions ? out.iou_predictions.data[0] : 0;
  // Resample the canvas mask back onto the sent image resolution so the overlay aligns 1:1.
  const mask = new Uint8Array(srcW * srcH);
  let minX = srcW, minY = srcH, maxX = -1, maxY = -1, area = 0;
  for (let oy = 0; oy < srcH; oy++) {
    const cy = Math.min(SAM_INPUT_H - 1, Math.round(oy * scale));
    for (let ox = 0; ox < srcW; ox++) {
      const cx = Math.min(SAM_INPUT_W - 1, Math.round(ox * scale));
      if (logits[cy * SAM_INPUT_W + cx] > 0) {
        mask[oy * srcW + ox] = 255; area++;
        if (ox < minX) minX = ox; if (ox > maxX) maxX = ox;
        if (oy < minY) minY = oy; if (oy > maxY) maxY = oy;
      }
    }
  }
  const bbox = area ? [minX, minY, maxX, maxY] : null;
  return {
    ok: true, status: 200,
    body: {
      ok: true, width: srcW, height: srcH, area, bbox, iou, inferenceMs: ms,
      mask: Buffer.from(mask.buffer).toString("base64")
    }
  };
}

/* ===================== Blocking Solver — OWLv2 detection (Phase 5) =====================
   OWLv2 (Apache-2.0) open-vocabulary detection via transformers.js, which uses onnxruntime-node
   as its backend. Model vendored locally (offline). One lazy-loaded pipeline, reused per call. */
let _owlPipe = null, _owlLoading = null;
async function getOwlDetector() {
  if (_owlPipe) return _owlPipe;
  if (_owlLoading) return _owlLoading;
  _owlLoading = (async () => {
    const tf = await import("@huggingface/transformers");
    tf.env.allowLocalModels = true;
    tf.env.allowRemoteModels = false;
    tf.env.localModelPath = path.join(barzyDir, "public", "assets", "vendor", "models");
    const det = await tf.pipeline("zero-shot-object-detection", "Xenova/owlv2-base-patch16-ensemble", { dtype: "q8" });
    _owlPipe = { det, RawImage: tf.RawImage };
    return _owlPipe;
  })();
  try { return await _owlLoading; } catch (e) { _owlLoading = null; throw e; }
}
function boxIoU(a, b) {
  const ix0 = Math.max(a[0], b[0]), iy0 = Math.max(a[1], b[1]), ix1 = Math.min(a[2], b[2]), iy1 = Math.min(a[3], b[3]);
  const iw = Math.max(0, ix1 - ix0), ih = Math.max(0, iy1 - iy0), inter = iw * ih;
  const ua = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter;
  return ua > 0 ? inter / ua : 0;
}
// Greedy cross-class NMS: keep highest score, drop boxes overlapping a kept one above the IoU.
function nmsDetections(dets, iouThresh) {
  const sorted = [...dets].sort((a, b) => b.score - a.score), keep = [];
  for (const d of sorted) { if (!keep.some((k) => boxIoU(d.bbox, k.bbox) > iouThresh)) keep.push(d); }
  return keep;
}
async function solverDetect(body) {
  const W = Math.round(Number(body.width) || 0), H = Math.round(Number(body.height) || 0);
  const rgbB64 = String(body.rgb || "");
  const queries = (Array.isArray(body.queries) ? body.queries : []).map((q) => String(q).trim()).filter(Boolean);
  const threshold = Math.max(0.01, Math.min(0.95, Number(body.threshold) || 0.2));
  const nmsIoU = Math.max(0.1, Math.min(0.9, Number(body.nmsIoU) || 0.6));
  const minAreaFrac = Number.isFinite(Number(body.minAreaFrac)) ? Number(body.minAreaFrac) : 0.004;
  if (!W || !H || !rgbB64) return { ok: false, status: 400, body: { ok: false, error: "Missing image data (width, height, rgb)." } };
  if (!queries.length) return { ok: false, status: 400, body: { ok: false, error: "No detection queries provided." } };
  const rgb = Buffer.from(rgbB64, "base64");
  if (rgb.length < W * H * 3) return { ok: false, status: 400, body: { ok: false, error: "RGB buffer too small for given dimensions." } };
  let owl;
  try { owl = await getOwlDetector(); }
  catch (e) { return { ok: false, status: 500, body: { ok: false, error: `OWLv2 failed to load: ${e.message || e}` } }; }
  let dets, ms;
  try {
    const img = new owl.RawImage(new Uint8Array(rgb.subarray(0, W * H * 3)), W, H, 3);
    const t0 = Date.now();
    const out = await owl.det(img, queries, { threshold });
    ms = Date.now() - t0;
    dets = out.map((d) => ({ label: d.label, score: d.score, bbox: [d.box.xmin, d.box.ymin, d.box.xmax, d.box.ymax] }));
  } catch (e) { return { ok: false, status: 500, body: { ok: false, error: `OWLv2 detect failed: ${e.message || e}` } }; }
  // Clamp to image, drop tiny boxes, then NMS across classes.
  const minArea = minAreaFrac * W * H, cl = (v, m) => Math.max(0, Math.min(m, v));
  dets = dets
    .map((d) => ({ ...d, bbox: [cl(d.bbox[0], W), cl(d.bbox[1], H), cl(d.bbox[2], W), cl(d.bbox[3], H)] }))
    .filter((d) => (d.bbox[2] - d.bbox[0]) > 4 && (d.bbox[3] - d.bbox[1]) > 4 && (d.bbox[2] - d.bbox[0]) * (d.bbox[3] - d.bbox[1]) >= minArea);
  const kept = nmsDetections(dets, nmsIoU).map((d) => ({ label: d.label, score: Math.round(d.score * 1000) / 1000, bbox: d.bbox.map((v) => Math.round(v)) }));
  return { ok: true, status: 200, body: { ok: true, width: W, height: H, count: kept.length, inferenceMs: ms, detections: kept } };
}

/* ===================== Blocking Solver — unified Auto Blocking (scene JSON) =====================
   One endpoint that runs the whole engine server-side and returns the docs/AUTO-BLOCKING.md
   scene: MoGe geometry -> OWLv2 detect -> MobileSAM box-prompt per box -> OBB fit + ground
   RANSAC + Y-up reorientation (all the math in the shared lib/blocking-fit.js). */
const AUTOBLOCK_DEFAULT_QUERIES = [
  "person", "car", "truck", "bus", "motorcycle", "bicycle", "building", "wall", "door", "window",
  "tree", "plant", "pole", "street sign", "traffic light", "bench", "box", "crate", "table", "chair",
  "ball", "barrel", "container"
];
// base64 -> typed array on a fresh, aligned ArrayBuffer (pooled Buffers aren't alignment-safe).
function b64ToU8(b64) { const b = Buffer.from(b64, "base64"); const u = new Uint8Array(b.length); u.set(b); return u; }
function b64ToF32(b64) { const u = b64ToU8(b64); return new Float32Array(u.buffer); }
function b64ToU16(b64) { const u = b64ToU8(b64); return new Uint16Array(u.buffer); }

// Deterministic PRNG for seeded RANSAC (bench reproducibility). Additive: without
// body.seed the pipeline keeps using Math.random exactly as before.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function solverAutoblock(body) {
  let b64 = String(body.image || body.imageDataUrl || body.imageBase64 || "");
  if (b64.startsWith("data:")) b64 = b64.split(",")[1] || "";
  if (!b64) return { ok: false, status: 400, body: { ok: false, error: "Missing image (base64 or data URL)." } };
  const queries = (Array.isArray(body.queries) && body.queries.length ? body.queries : AUTOBLOCK_DEFAULT_QUERIES)
    .map((q) => String(q).trim()).filter(Boolean);
  // Minimal blocking: higher default threshold, stricter NMS, and a cap on objects
  // (P5: 6 by default — fewer, better-fitted volumes beat a cluttered guess).
  const threshold = Math.max(0.05, Math.min(0.9, Number(body.threshold) || 0.30));
  const maxObjects = Math.max(1, Math.min(50, Math.round(Number(body.maxObjects) || 6)));
  // 1. Decode + preprocess to ≤518 long side, multiples of 14 (same grid MoGe/SAM/OWLv2 use).
  let W, H, rgbB64;
  try {
    const sharp = (await import("sharp")).default;
    const src = Buffer.from(b64, "base64");
    const meta = await sharp(src).metadata();
    if (!meta.width || !meta.height) throw new Error("could not read image dimensions");
    // Uniform scale (P1): floor both dims to multiples of 14 and centre-crop the few
    // remaining pixels (fit:"cover") instead of stretching anisotropically (fit:"fill"
    // with independently rounded W/H skewed the FOV/points by up to ~1.5%).
    const s = 518 / Math.max(meta.width, meta.height);
    W = Math.max(14, Math.floor(meta.width * s / 14) * 14);
    H = Math.max(14, Math.floor(meta.height * s / 14) * 14);
    const rgb = await sharp(src).resize(W, H, { fit: "cover", position: "centre" }).removeAlpha().raw().toBuffer();
    rgbB64 = rgb.toString("base64");
  } catch (e) { return { ok: false, status: 400, body: { ok: false, error: `Image decode failed: ${e.message || e}` } }; }
  // 2. MoGe geometry.
  const geo = await solverGeometry({ width: W, height: H, rgb: rgbB64 });
  if (!geo.ok) return geo;
  const G = geo.body;
  const ptsCV = b64ToF32(G.points), coords = b64ToU16(G.coords), rgbArr = b64ToU8(rgbB64);
  const n = ptsCV.length / 3, pts3 = new Float32Array(ptsCV.length);
  for (let i = 0; i < n; i++) { pts3[i * 3] = ptsCV[i * 3]; pts3[i * 3 + 1] = -ptsCV[i * 3 + 1]; pts3[i * 3 + 2] = -ptsCV[i * 3 + 2]; }  // OpenCV -> three
  // 3. OWLv2 detect — stricter NMS + min-area for a cleaner set.
  const det = await solverDetect({ width: W, height: H, rgb: rgbB64, queries, threshold, nmsIoU: 0.45, minAreaFrac: 0.01 });
  if (!det.ok) return det;
  const allDetections = det.body.detections || [];
  // Keep only the most salient: rank by box area × confidence, cap at maxObjects.
  const ranked = allDetections
    .map((d) => ({ d, rank: (d.bbox[2] - d.bbox[0]) * (d.bbox[3] - d.bbox[1]) * (d.score || 0.5) }))
    .sort((a, b) => b.rank - a.rank)
    .slice(0, maxObjects)
    .map((x) => x.d);
  // 4. MobileSAM: embed once, then a box prompt per kept detection.
  const imageId = `autoblock-${Date.now()}`;
  const emb = await solverEmbed({ imageId, width: W, height: H, rgb: rgbB64 });
  if (!emb.ok) return emb;
  const withMasks = [];
  for (const d of ranked) {
    const seg = await solverSegment({ imageId, box: d.bbox });
    if (!seg.ok || !seg.body.area) continue;
    if ((seg.body.iou || 0) < 0.4) continue;   // P5: SAM's own confidence gates junk masks
    const mask = b64ToU8(seg.body.mask);
    // P5: MASK-level dedup — box NMS misses a person-in-a-car or a window-on-a-facade
    // (small box-IoU, huge mask containment). Drop the lower-ranked duplicate.
    let dup = false;
    for (const k of withMasks) {
      let ia = 0, ib = 0, inter = 0;
      for (let i = 0; i < mask.length; i++) { const x = mask[i] ? 1 : 0, y = k.mask[i] ? 1 : 0; ia += x; ib += y; if (x && y) inter++; }
      const iou = inter / Math.max(1, ia + ib - inter), contain = inter / Math.max(1, Math.min(ia, ib));
      if (iou > 0.5 || contain > 0.7) { dup = true; break; }
    }
    if (dup) continue;
    withMasks.push({ label: d.label, score: d.score, box: d.bbox, mask });
  }
  // 5. Fit + ground + scene assembly (shared lib). Seeded RANSAC when body.seed is given
  // (bench determinism); default behaviour unchanged (Math.random).
  const seed = Number(body.seed);
  const randFn = Number.isFinite(seed) ? mulberry32(seed) : undefined;
  const { scene, meta } = assembleScene({ width: W, height: H, fovDeg: G.fovDeg, points: pts3, coords, rgb: rgbArr, detections: withMasks, randFn, minPts: 40 });
  // Ground-stripped masks, aligned to scene.objects (shared by refinement + debug).
  // NOTE: assembleScene ground-aligned pts3 in place, which is what makes this valid.
  const stride = Math.max(1, Math.ceil(Math.max(W, H) / 256));
  const cleanFor = (m) => (meta.grounded && meta.groundBand)
    ? stripGroundFromMask(m.mask, pts3, coords, W, H, meta.groundBand, stride)
    : m.mask;
  const objectMasks = (meta.objectDetIndex || []).map((di) => withMasks[di] ? cleanFor(withMasks[di]) : null);
  // P3: 4-way yaw disambiguation → P4: bounded coordinate descent (silhouette polish)
  // → P6: metric class priors LAST — they fix what a silhouette cannot see (extent
  // along the viewing ray, monocular scale bias) and must not be undone by the IoU.
  const pose = poseFromCamera(scene.camera, W, H);
  if (pose && scene.objects?.length) {
    meta.yaw4way = refineYaw4Way({ objects: scene.objects, masks: objectMasks, pose });
    meta.descent = refineDescent({ objects: scene.objects, masks: objectMasks, pose });
    // P6: global metric scale FIRST (reprojection-invariant, from human/vehicle meter
    // sticks), THEN class priors — after rescaling they only complete what stays
    // genuinely unobserved (extent along the viewing ray) instead of fighting the data.
    meta.sceneScale = scaleFromMeterSticks({ objects: scene.objects, camera: scene.camera });
    meta.priors = applyClassPriors({ objects: scene.objects, camera: scene.camera });
  }
  const out = {
    ok: true, status: 200,
    body: {
      ok: true, scene,
      meta: { ...meta, width: W, height: H, threshold, maxObjects, detections: allDetections.length, kept: withMasks.length, geometryMs: G.inferenceMs, detectMs: det.body.inferenceMs }
    }
  };
  // Debug payload for the bench/overlays only (opt-in): the preprocessed image, the
  // per-object SAM masks (raw + ground-stripped) and the measured FOV. Not sent on
  // normal calls. NOTE: assembleScene ground-aligned pts3 in place, so it is usable
  // here to strip floor pixels from the masks.
  if (body.debug === true) {
    out.body.debug = {
      width: W, height: H, rgb: rgbB64, fovDeg: G.fovDeg, fovXDeg: G.fovXDeg, groundBand: meta.groundBand || 0,
      masks: withMasks.map((m) => ({ label: m.label, score: m.score, box: m.box, mask: Buffer.from(m.mask).toString("base64"), maskClean: Buffer.from(cleanFor(m)).toString("base64") }))
    };
  }
  return out;
}

async function analyzeVideo(body) {
  const settings = await readSettings();
  const frames = Array.isArray(body.frames) ? body.frames : [];
  const validFrames = frames
    .filter((frame) => typeof frame?.dataUrl === "string" && frame.dataUrl.startsWith("data:image/"))
    .slice(0, 8);

  if (!validFrames.length) {
    return { ok: false, status: 400, body: { error: "No video frames were provided." } };
  }

  const trimStart = Math.max(0, Number(body.trimStart) || 0);
  const duration = Math.min(15, Math.max(1, Number(body.duration) || 15));

  const frameSummary = validFrames
    .map((frame, index) => {
      const relativeTime = Number(frame.time || 0);
      const sourceTime = Number.isFinite(Number(frame.sourceTime)) ? Number(frame.sourceTime) : trimStart + relativeTime;
      return `Frame ${index + 1}: +${relativeTime.toFixed(2)}s in selected window (source ${sourceTime.toFixed(2)}s)`;
    })
    .join("\n");
  const direction = videoDirectionFromBody(body);
  const transcript = videoTranscriptFromBody(body);

  const userText = [
    "Analyze this short video from its sampled keyframes and return the requested strict JSON.",
    `Source file: ${String(body.fileName || "video")}.`,
    `Selected analysis window: source ${trimStart.toFixed(2)}s to ${(trimStart + duration).toFixed(2)}s (${duration.toFixed(2)} seconds). Cap all Kling timing at 15 seconds; Seedance output must be exactly 15 seconds.`,
    `Frame timing:\n${frameSummary}`,
    direction.subjectChange ? `Required subject change: ${direction.subjectChange}` : "",
    direction.backgroundChange ? `Required background change: ${direction.backgroundChange}` : "",
    direction.notes ? `Additional direction: ${direction.notes}` : "",
    transcript ? `Audio transcript/dialogue:\n${transcript}` : "No audio transcript was available. Do not invent spoken words; use visual rhythm and environmental sound cues only.",
    direction.hasDirection ? "Apply the required changes strongly in klingPrompt and seedancePrompt. Keep the original video's timing, cuts, camera motion, gestures, and rhythm as the motion reference." : ""
  ].filter(Boolean).join("\n\n");

  const routed = await routePromptSkills(buildVideoAnalysisInstruction(), {
    media: "video",
    targetEngine: "Kling 3, Seedance 2.0, MiniMax H3, FLUX 3 Video, Wan 3.0",
    task: "video-analysis",
    maxChars: 70000
  });
  const result = await callLlm({
    settings,
    model: body.model,
    system: routed.system,
    userText,
    images: validFrames.map((frame) => frame.dataUrl),
    maxOutputTokens: 2400,
    temperature: 0.45
  });

  if (!result.ok) {
    return {
      ok: true,
      status: 200,
      body: buildLocalVideoResult(
        validFrames,
        duration,
        body,
        "local-video-fallback",
        `${result.error} Local fallback was used.`
      )
    };
  }

  const text = result.text;
  const model = result.model;
  const normalized = normalizeVideoAnalysis(text, duration);
  const fallback = buildFallbackVideoPrompts(normalized, duration, body);

  return {
    ok: true,
    status: 200,
    body: {
      ...normalized,
      analysis: normalized.analysis || fallback.analysis,
      klingPrompt: normalized.klingPrompt || fallback.klingPrompt,
      klingNegativePrompt: normalized.klingNegativePrompt || fallback.klingNegativePrompt,
      seedancePrompt: normalized.seedancePrompt || fallback.seedancePrompt,
      model,
      skillTrace: routed.trace
    }
  };
}

async function trimAudioForTranscription(media, body) {
  const ffmpegPath = await resolveFfmpegPath();
  const trimStart = Math.max(0, Number(body.trimStart) || 0);
  const duration = Math.min(15, Math.max(1, Number(body.duration) || 15));
  const workDir = await mkdtemp(path.join(tmpdir(), "prompt-atlas-transcribe-"));
  const inputExt = extensionFromName(body.fileName, extensionFromMime(media.mime, ".mp4"));
  const inputPath = path.join(workDir, `input${inputExt}`);
  const outputPath = path.join(workDir, "trim-audio.mp3");

  try {
    await writeFile(inputPath, media.buffer);
    await execFileAsync(ffmpegPath, [
      "-y",
      "-ss", trimStart.toFixed(3),
      "-t", duration.toFixed(3),
      "-i", inputPath,
      "-map", "0:a:0?",
      "-vn",
      "-codec:a", "libmp3lame",
      "-q:a", "5",
      outputPath
    ], { timeout: 90000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
    return {
      buffer: await readFile(outputPath),
      mime: "audio/mpeg",
      name: `${safeBaseName(body.fileName, "video")}_trim-audio.mp3`
    };
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function transcribeVideoAudio(body) {
  const settings = await readSettings();
  const apiKey = settings.openaiApiKey;
  if (!apiKey) {
    return {
      ok: true,
      status: 200,
      body: {
        transcript: "",
        model: transcriptionModel,
        warning: "OpenAI API key is not configured, so no transcript was available."
      }
    };
  }

  const media = parseMediaDataUrl(body.mediaDataUrl || body.videoDataUrl);
  if (!media) {
    return { ok: false, status: 400, body: { error: "No video or audio file was provided." } };
  }

  let upload = {
    buffer: media.buffer,
    mime: media.mime,
    name: `${safeBaseName(body.fileName, "video-audio")}${extensionFromName(body.fileName, extensionFromMime(media.mime, ".mp4"))}`
  };
  if (Number.isFinite(Number(body.duration))) {
    try {
      upload = await trimAudioForTranscription(media, body);
    } catch {
      // If trimming fails, fall back to the original file so visual analysis can continue.
    }
  }

  if (upload.buffer.length > maxOpenAiUploadBytes) {
    return {
      ok: true,
      status: 200,
      body: {
        transcript: "",
        model: transcriptionModel,
        warning: "The video is over the 25 MB OpenAI transcription limit, so no transcript was available."
      }
    };
  }

  const form = new FormData();
  form.append("file", new Blob([upload.buffer], { type: upload.mime }), upload.name);
  form.append("model", transcriptionModel);
  form.append("response_format", "json");
  form.append("prompt", "Transcribe any spoken dialogue, lyrics, and important vocal sounds for a short AI video prompt workflow.");

  let result;
  try {
    result = await fetchJsonWithTimeout("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: form
    }, 70000);
  } catch {
    return {
      ok: true,
      status: 200,
      body: {
        transcript: "",
        model: transcriptionModel,
        warning: "Audio transcription failed or timed out, so visual analysis continued without transcript."
      }
    };
  }

  const { response, payload } = result;
  if (!response.ok) {
    return {
      ok: true,
      status: 200,
      body: {
        transcript: "",
        model: transcriptionModel,
        warning: payload.error?.message || "Audio transcription failed, so visual analysis continued without transcript."
      }
    };
  }

  return {
    ok: true,
    status: 200,
    body: {
      transcript: clippedText(payload.text || "", 2400),
      model: transcriptionModel
    }
  };
}

function cleanFfmpegError(error) {
  const message = String(error?.stderr || error?.message || "FFmpeg export failed.")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-3)
    .join(" ");
  if (/does not contain any stream|matches no streams|audio.*not found|no such stream/i.test(message)) {
    return "No audio track was found in this video.";
  }
  return message || "FFmpeg export failed.";
}

function parseFfmpegDuration(text) {
  const match = String(text || "").match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/i);
  if (!match) return 0;
  return (Number(match[1]) * 3600) + (Number(match[2]) * 60) + Number(match[3]);
}

function parseFfmpegVideoSize(text) {
  const match = String(text || "").match(/Video:[\s\S]*?,\s*(\d{2,5})x(\d{2,5})[\s,]/i);
  if (!match) return { width: 16, height: 9 };
  return {
    width: Math.max(1, Number(match[1]) || 16),
    height: Math.max(1, Number(match[2]) || 9)
  };
}

async function inspectVideoWithFfmpeg(ffmpegPath, inputPath) {
  try {
    await execFileAsync(ffmpegPath, ["-hide_banner", "-i", inputPath], {
      timeout: 30000,
      windowsHide: true,
      maxBuffer: 1024 * 1024
    });
    return { duration: 0, width: 16, height: 9 };
  } catch (error) {
    const output = `${error.stdout || ""}\n${error.stderr || ""}`;
    return {
      duration: parseFfmpegDuration(output),
      ...parseFfmpegVideoSize(output)
    };
  }
}

async function sampleVideoFrames(body) {
  const media = parseMediaDataUrl(body.mediaDataUrl || body.videoDataUrl);
  if (!media) {
    return { ok: false, status: 400, body: { error: "No video file was provided." } };
  }

  const ffmpegPath = await resolveFfmpegPath();
  const workDir = await mkdtemp(path.join(tmpdir(), "prompt-atlas-frames-"));
  const inputExt = extensionFromName(body.fileName, extensionFromMime(media.mime, ".mp4"));
  const inputPath = path.join(workDir, `input${inputExt}`);

  try {
    await writeFile(inputPath, media.buffer);
    const inspected = await inspectVideoWithFfmpeg(ffmpegPath, inputPath);
    const sourceDuration = Number(body.sourceDuration) || inspected.duration || 15;
    const trimStartMax = Math.max(0, sourceDuration - 1);
    const trimStart = Math.min(trimStartMax, Math.max(0, Number(body.trimStart) || 0));
    const durationMax = Math.min(15, Math.max(1, sourceDuration - trimStart));
    const duration = Math.min(durationMax, Math.max(1, Number(body.duration) || durationMax));
    const frameCount = duration <= 4 ? 4 : duration <= 8 ? 6 : 8;
    const times = Array.from({ length: frameCount }, (_, index) => {
      if (frameCount === 1) return 0;
      return (duration * index) / (frameCount - 1);
    }).map((time) => Math.min(duration - 0.05, Math.max(0.05, time)));

    const frames = [];
    for (let index = 0; index < times.length; index += 1) {
      const sourceTime = trimStart + times[index];
      const outputPath = path.join(workDir, `frame-${index}.jpg`);
      const args = [
        "-y",
        "-ss", sourceTime.toFixed(3),
        "-i", inputPath,
        "-frames:v", "1",
        "-vf", "scale=960:-2",
        "-q:v", "5",
        outputPath
      ];
      await execFileAsync(ffmpegPath, args, { timeout: 45000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
      const buffer = await readFile(outputPath);
      frames.push({
        time: times[index],
        sourceTime,
        trimStart,
        dataUrl: `data:image/jpeg;base64,${buffer.toString("base64")}`,
        width: Math.min(960, inspected.width || 960),
        height: Math.max(1, Math.round(Math.min(960, inspected.width || 960) / ((inspected.width || 16) / (inspected.height || 9)))),
        aspectRatio: `${inspected.width || 16} / ${inspected.height || 9}`
      });
    }

    return {
      ok: true,
      status: 200,
      body: {
        duration,
        trimStart,
        frames,
        extractor: "ffmpeg"
      }
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      body: { error: cleanFfmpegError(error) || "Video frame extraction failed." }
    };
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

// OS-native H.264 encoder (keeps the ffmpeg build LGPL — no GPL libx264). h264_mf on Windows,
// videotoolbox on macOS, LGPL mpeg4 as a last-resort fallback. libx264-only flags (-preset,
// -tune) are dropped; quality is set with a target bitrate the OS encoders accept.
function osH264Encoder() {
  if (process.platform === "win32") return { codec: "h264_mf", vargs: ["-b:v", "6M"] };
  if (process.platform === "darwin") return { codec: "h264_videotoolbox", vargs: ["-b:v", "6M"] };
  return { codec: "mpeg4", vargs: ["-q:v", "3"] };
}
async function exportVideoAudio(body) {
  const media = parseMediaDataUrl(body.mediaDataUrl || body.videoDataUrl);
  if (!media) {
    return { ok: false, status: 400, body: { error: "No video file was provided." } };
  }
  const h264 = osH264Encoder();

  const ffmpegPath = await resolveFfmpegPath();
  const exportType = String(body.exportType || "mp3");
  const baseName = safeBaseName(body.fileName, "prompt-atlas-video");
  const trimStart = Math.max(0, Number(body.trimStart) || 0);
  const duration = Math.max(0.5, Number(body.duration) || 15);
  const workDir = await mkdtemp(path.join(tmpdir(), "prompt-atlas-media-"));
  const inputExt = extensionFromName(body.fileName, extensionFromMime(media.mime, ".mp4"));
  const inputPath = path.join(workDir, `input${inputExt}`);

  try {
    await writeFile(inputPath, media.buffer);

    let outputPath;
    let fileName;
    let contentType;
    let args;

    if (exportType === "black-mp4") {
      const size = blackVideoSize(body.width, body.height);
      outputPath = path.join(workDir, "black-audio.mp4");
      fileName = `${baseName}_black-audio.mp4`;
      contentType = "video/mp4";
      args = [
        "-y",
        "-ss", trimStart.toFixed(3),
        "-t", duration.toFixed(3),
        "-i", inputPath,
        "-f", "lavfi",
        "-i", `color=c=black:s=${size.width}x${size.height}:r=24`,
        "-t", duration.toFixed(3),
        "-map", "1:v:0",
        "-map", "0:a:0?",
        "-c:v", h264.codec,
        ...h264.vargs,
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "128k",
        "-shortest",
        "-movflags", "+faststart",
        outputPath
      ];
    } else if (exportType === "mp4-trimmed") {
      outputPath = path.join(workDir, "trimmed-video.mp4");
      fileName = `${baseName}_trimmed.mp4`;
      contentType = "video/mp4";
      args = [
        "-y",
        "-ss", trimStart.toFixed(3),
        "-t", duration.toFixed(3),
        "-i", inputPath,
        "-map", "0:v:0",
        "-map", "0:a:0?",
        "-c:v", h264.codec,
        ...h264.vargs,
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart",
        outputPath
      ];
    } else if (exportType === "mp4-audio") {
      outputPath = path.join(workDir, "audio.mp4");
      fileName = `${baseName}_audio.mp4`;
      contentType = "audio/mp4";
      args = [
        "-y",
        "-ss", trimStart.toFixed(3),
        "-t", duration.toFixed(3),
        "-i", inputPath,
        "-map", "0:a:0?",
        "-vn",
        "-c:a", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart",
        outputPath
      ];
    } else {
      outputPath = path.join(workDir, "audio.mp3");
      fileName = `${baseName}_audio.mp3`;
      contentType = "audio/mpeg";
      args = [
        "-y",
        "-ss", trimStart.toFixed(3),
        "-t", duration.toFixed(3),
        "-i", inputPath,
        "-map", "0:a:0?",
        "-vn",
        "-codec:a", "libmp3lame",
        "-q:a", "4",
        outputPath
      ];
    }

    try {
      await execFileAsync(ffmpegPath, args, { timeout: 180000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
    } catch (error) {
      throw new Error(cleanFfmpegError(error));
    }

    const buffer = await readFile(outputPath);
    return { ok: true, status: 200, buffer, contentType, fileName };
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

// Motion Emulator: WebM (VP8/VP9, video-only control clips) -> H.264 MP4 via the bundled
// LGPL ffmpeg + the OS-native H.264 encoder. Replaces the standalone app's ffmpeg.wasm
// (whose @ffmpeg/core bundles libx264 = GPL, excluded from this project).
async function webmToMp4Export(body) {
  const media = parseMediaDataUrl(body.mediaDataUrl);
  if (!media) return { ok: false, status: 400, body: { error: "No WebM file was provided." } };
  const ffmpegPath = await resolveFfmpegPath();
  const h264 = osH264Encoder();
  const workDir = await mkdtemp(path.join(tmpdir(), "prompt-atlas-webm2mp4-"));
  const inputPath = path.join(workDir, "input.webm");
  const outputPath = path.join(workDir, "output.mp4");
  try {
    await writeFile(inputPath, media.buffer);
    const args = [
      "-y",
      "-i", inputPath,
      "-c:v", h264.codec,
      ...h264.vargs,
      "-pix_fmt", "yuv420p",
      "-an",
      "-movflags", "+faststart",
      outputPath
    ];
    try {
      await execFileAsync(ffmpegPath, args, { timeout: 300000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
    } catch (error) {
      throw new Error(cleanFfmpegError(error));
    }
    const buffer = await readFile(outputPath);
    return { ok: true, status: 200, buffer, contentType: "video/mp4", fileName: "output.mp4" };
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/health") {
    return sendJson(res, 200, {
      ok: true,
      app: appName,
      apiVersion,
      modules: ["prompt-forge", "idea-forge", "image-analyzer", "video-director-analyzer", "media-export"]
    });
  }

  if (req.method === "GET" && url.pathname === "/api/brain") {
    try {
      if (!cachedBrainText) {
        cachedBrainText = await readFile(path.join(appRoot, "docs", "ATLAS_BRAIN.md"), "utf8");
      }
      return sendJson(res, 200, { brain: cachedBrainText });
    } catch {
      return sendJson(res, 404, { error: "ATLAS_BRAIN.md not found." });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/settings") {
    const settings = await readSettings();
    return sendJson(res, 200, {
      hasOpenAIKey: Boolean(settings.openaiApiKey),
      hasAnthropicKey: Boolean(settings.anthropicApiKey),
      hasDeepseekKey: Boolean(settings.deepseekApiKey),
      hasGoogleKey: Boolean(settings.googleApiKey),
      llmModel: resolveLlmModel(settings.llmModel, settings.openaiModel),
      llmModels: availableLlmModels,
      openaiModel: settings.openaiModel || defaultModel,
      knownModels,
      apiVersion,
      settingsPath,
      supportsCompose: true,
      supportsAnalyze: true,
      supportsVideoAnalyze: true,
      supportsVideoTranscript: true,
      supportsMediaExport: true,
      supportsMediaFrameExtract: true
    });
  }

  if (req.method === "POST" && url.pathname === "/api/settings") {
    const body = await readJson(req);
    const current = await readSettings();
    const next = {
      ...current,
      openaiModel: String(body.openaiModel || current.openaiModel || defaultModel).trim()
    };

    if (typeof body.llmModel === "string" && body.llmModel.trim()) {
      next.llmModel = resolveLlmModel(body.llmModel);
    }

    const keyFields = [
      ["openaiApiKey", "clearOpenAIKey"],
      ["anthropicApiKey", "clearAnthropicKey"],
      ["deepseekApiKey", "clearDeepseekKey"],
      ["googleApiKey", "clearGoogleKey"]
    ];
    for (const [field, clearFlag] of keyFields) {
      if (typeof body[field] === "string" && body[field].trim()) {
        next[field] = body[field].trim();
      }
      if (body[clearFlag]) {
        delete next[field];
      }
    }

    await writeSettings(next);
    return sendJson(res, 200, {
      hasOpenAIKey: Boolean(next.openaiApiKey),
      hasAnthropicKey: Boolean(next.anthropicApiKey),
      hasDeepseekKey: Boolean(next.deepseekApiKey),
      hasGoogleKey: Boolean(next.googleApiKey),
      llmModel: resolveLlmModel(next.llmModel, next.openaiModel),
      openaiModel: next.openaiModel,
      settingsPath
    });
  }

  if (req.method === "POST" && url.pathname === "/api/ai/refine") {
    try {
      const result = await refinePrompt(await readJson(req));
      return sendJson(res, result.status, result.body);
    } catch (error) {
      return sendJson(res, 500, { error: error.message || "AI refine failed." });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/ai/compose") {
    try {
      const result = await composePrompt(await readJson(req));
      return sendJson(res, result.status, result.body);
    } catch (error) {
      return sendJson(res, 500, { error: error.message || "AI compose failed." });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/ai/video-direct") {
    try {
      const result = await videoDirect(await readJson(req));
      return sendJson(res, result.status, result.body);
    } catch (error) {
      return sendJson(res, 500, { error: error.message || "Video direction failed." });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/ai/analyze-image") {
    try {
      const result = await analyzeImage(await readJson(req));
      return sendJson(res, result.status, result.body);
    } catch (error) {
      return sendJson(res, 500, { error: error.message || "Image analysis failed." });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/ai/auto-block") {
    try {
      const result = await autoBlock(await readJson(req));
      return sendJson(res, result.status, result.body);
    } catch (error) {
      return sendJson(res, 500, { ok: false, error: error.message || "Auto-blocking failed." });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/solver/geometry") {
    try {
      const result = await solverGeometry(await readJson(req));
      return sendJson(res, result.status, result.body);
    } catch (error) {
      return sendJson(res, 500, { ok: false, error: error.message || "Geometry solve failed." });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/solver/embed") {
    try {
      const result = await solverEmbed(await readJson(req));
      return sendJson(res, result.status, result.body);
    } catch (error) {
      return sendJson(res, 500, { ok: false, error: error.message || "Embed failed." });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/solver/segment") {
    try {
      const result = await solverSegment(await readJson(req));
      return sendJson(res, result.status, result.body);
    } catch (error) {
      return sendJson(res, 500, { ok: false, error: error.message || "Segment failed." });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/solver/detect") {
    try {
      const result = await solverDetect(await readJson(req));
      return sendJson(res, result.status, result.body);
    } catch (error) {
      return sendJson(res, 500, { ok: false, error: error.message || "Detect failed." });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/solver/autoblock") {
    try {
      const result = await solverAutoblock(await readJson(req));
      return sendJson(res, result.status, result.body);
    } catch (error) {
      return sendJson(res, 500, { ok: false, error: error.message || "Auto Blocking failed." });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/ai/analyze-style") {
    try {
      const result = await analyzeStyle(await readJson(req));
      return sendJson(res, result.status, result.body);
    } catch (error) {
      return sendJson(res, 500, { error: error.message || "Style analysis failed." });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/ai/analyze-video") {
    try {
      const result = await analyzeVideo(await readJson(req));
      return sendJson(res, result.status, result.body);
    } catch (error) {
      return sendJson(res, 500, { error: error.message || "Video analysis failed." });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/ai/transcribe-video") {
    try {
      const result = await transcribeVideoAudio(await readJson(req));
      return sendJson(res, result.status, result.body);
    } catch (error) {
      return sendJson(res, 500, { error: error.message || "Video transcription failed." });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/media/export-video-audio") {
    try {
      const result = await exportVideoAudio(await readJson(req));
      if (!result.ok) return sendJson(res, result.status, result.body);
      return sendBinary(res, result.status, result.buffer, {
        contentType: result.contentType,
        fileName: result.fileName
      });
    } catch (error) {
      return sendJson(res, /ffmpeg/i.test(error.message || "") ? 400 : 500, {
        error: error.message || "Media export failed."
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/media/webm-to-mp4") {
    try {
      const result = await webmToMp4Export(await readJson(req));
      if (!result.ok) return sendJson(res, result.status, result.body);
      return sendBinary(res, result.status, result.buffer, {
        contentType: result.contentType,
        fileName: result.fileName
      });
    } catch (error) {
      return sendJson(res, /ffmpeg/i.test(error.message || "") ? 400 : 500, {
        error: error.message || "WebM to MP4 conversion failed."
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/media/sample-video-frames") {
    try {
      const result = await sampleVideoFrames(await readJson(req));
      return sendJson(res, result.status, result.body);
    } catch (error) {
      return sendJson(res, /ffmpeg/i.test(error.message || "") ? 400 : 500, {
        error: error.message || "Video frame extraction failed."
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/tools/save-image-slice") {
    try {
      const result = await saveImageSliceToDirectory(await readJson(req));
      return sendJson(res, result.status, result.body);
    } catch (error) {
      return sendJson(res, 500, { error: error.message || "Image slice save failed." });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/vcam/info") {
    try {
      return sendJson(res, 200, await virtualCameraInfo());
    } catch (error) {
      return sendJson(res, 500, { error: error.message || "Virtual camera info failed." });
    }
  }

  return sendJson(res, 404, { error: "Unknown API route." });
}

// LAN IPv4 addresses, best candidate first: prefer a real WiFi/Ethernet adapter in a
// private range and demote VPN tunnels (NordVPN/NordLynx, WireGuard, OpenVPN TAP/TUN…)
// and virtual adapters (WSL, Hyper-V, VMware, VirtualBox, Docker) so the QR still
// points at the physical LAN even when a VPN is connected.
const VPN_ADAPTER_RE = /nordlynx|nord|proton|mullvad|express\s?vpn|wireguard|openvpn|\btap\b|\btun\b|cisco|anyconnect|forticlient|fortinet|pulse|globalprotect|zscaler|softether|hamachi|radmin/i;
const VIRTUAL_ADAPTER_RE = /virtual|vmware|vbox|virtualbox|wsl|hyper-?v|vethernet|docker|loopback|tailscale|zerotier|bluetooth/i;
// NordLynx hands out addresses in 10.5.0.0/16; a few other VPNs sit in known blocks.
const VPN_CIDR_RE = /^10\.5\./;

function lanIPv4Addresses() {
  const entries = [];
  for (const [name, addrs] of Object.entries(networkInterfaces())) {
    for (const addr of addrs || []) {
      if (addr.family === "IPv4" && !addr.internal) entries.push({ name, address: addr.address });
    }
  }
  const score = (entry) => {
    let s = 0;
    if (/^192\.168\./.test(entry.address)) s += 100;
    else if (/^172\.(1[6-9]|2\d|3[01])\./.test(entry.address)) s += 70;
    else if (/^10\./.test(entry.address)) s += 60;
    // Heavy penalties push VPN/virtual adapters below any real private-LAN address.
    if (VPN_ADAPTER_RE.test(entry.name)) s -= 500;
    if (VIRTUAL_ADAPTER_RE.test(entry.name)) s -= 300;
    if (VPN_CIDR_RE.test(entry.address)) s -= 400;
    return s;
  };
  return entries
    .map((entry) => ({ entry, s: score(entry) }))
    .sort((a, b) => b.s - a.s)
    .map(({ entry }) => entry.address);
}

// WebSocket relay for the virtual camera: phones stream gyro data, studios receive it.
// The phone connects over WSS (HTTPS server, §HTTPS below) while the studio connects
// over ws:// on the local HTTP server — both attach to ONE relay with shared peer sets
// so the phone↔studio bridge works across the two transports. Optional: if the `ws`
// package is missing the app still works without a phone.
function createVcamRelay() {
  const studios = new Set();
  const phones = new Set();
  const servers = new Set();
  const send = (sock, obj) => { if (sock.readyState === 1) sock.send(JSON.stringify(obj)); };
  const broadcast = (set, raw) => { for (const sock of set) if (sock.readyState === 1) sock.send(raw); };
  async function attach(server) {
    try {
      const { WebSocketServer } = await import("ws");
      const wss = new WebSocketServer({ server, path: "/vcam" });
      servers.add(wss);
      wss.once("close", () => servers.delete(wss));
      wss.on("connection", (sock, req) => {
        let role = "studio";
        try {
          role = new URL(req.url || "/", "http://localhost").searchParams.get("role") === "phone" ? "phone" : "studio";
        } catch {}
        const peers = role === "phone" ? phones : studios;
        peers.add(sock);
        if (role === "phone") broadcast(studios, JSON.stringify({ type: "phone", connected: true }));
        else if (phones.size) send(sock, { type: "phone", connected: true });
        sock.on("message", (buf) => {
          const raw = buf.toString();
          broadcast(role === "phone" ? studios : phones, raw);
        });
        sock.on("close", () => {
          peers.delete(sock);
          if (role === "phone" && phones.size === 0) {
            broadcast(studios, JSON.stringify({ type: "phone", connected: false }));
          }
        });
        sock.on("error", () => {});
      });
      return wss;
    } catch (error) {
      console.warn(`Virtual camera relay disabled (ws unavailable): ${error.message}`);
      return null;
    }
  }
  async function close() {
    for (const socket of [...studios, ...phones]) {
      try { socket.terminate(); } catch {}
    }
    studios.clear();
    phones.clear();
    await Promise.all([...servers].map((wss) => new Promise((resolve) => {
      try { wss.close(() => resolve()); } catch { resolve(); }
    })));
    servers.clear();
  }
  return { attach, close };
}

// Serve the virtual-camera phone companion page.
async function serveVcamPhonePage(res) {
  const phonePath = path.join(barzyDir, "public", "assets", "HTML", "virtual-cam-phone.html");
  if (existsSync(phonePath)) {
    const body = await readFile(phonePath);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    return res.end(body);
  }
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  return res.end("Phone page not found");
}

// HTTPS endpoint (self-signed) for the phone: /phone over HTTPS + the WSS relay.
// Chrome (Android) only fires DeviceOrientation events in a secure context, so the
// phone MUST load over https:// and connect over wss://. Returns the bound port, or
// null (with vcamHttpsError set) if HTTPS could not start — the app keeps working.
async function startVcamHttps(relay) {
  try {
    const https = await import("node:https");
    const selfsigned = (await import("selfsigned")).default;
    const ips = lanIPv4Addresses();
    const altNames = [
      { type: 2, value: "localhost" },
      { type: 7, ip: "127.0.0.1" }
    ];
    for (const ip of ips) altNames.push({ type: 7, ip });
    const pems = await selfsigned.generate(
      [{ name: "commonName", value: ips[0] || "localhost" }],
      { keySize: 2048, days: 3650, algorithm: "sha256", extensions: [{ name: "subjectAltName", altNames }] }
    );
    const httpsServer = https.createServer({ key: pems.private, cert: pems.cert }, async (req, res) => {
      try {
        const url = new URL(req.url || "/", `https://${req.headers.host}`);
        if (url.pathname === "/phone" || url.pathname === "/phone/" || url.pathname === "/") {
          return await serveVcamPhonePage(res);
        }
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not found");
      } catch (error) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Server error");
      }
    });
    const preferred = Number(process.env.VCAM_HTTPS_PORT ?? defaultVcamHttpsPort);
    await new Promise((resolve) => {
      const onListening = () => {
        const addr = httpsServer.address();
        vcamHttpsPort = typeof addr === "object" && addr ? addr.port : preferred;
        vcamHttpsError = null;
        console.log(`Virtual camera HTTPS (self-signed) on port ${vcamHttpsPort}`);
        resolve();
      };
      let triedRandom = false;
      httpsServer.on("error", (err) => {
        if (!triedRandom) {
          // Preferred port busy → fall back to an ephemeral port.
          triedRandom = true;
          httpsServer.listen(0, "0.0.0.0");
        } else {
          vcamHttpsError = err.message;
          console.warn(`Virtual camera HTTPS failed to bind: ${err.message}`);
          resolve();
        }
      });
      httpsServer.once("listening", onListening);
      httpsServer.listen(preferred, "0.0.0.0");
    });
    // Attach the WSS relay only after a successful bind. Attaching it before the
    // preferred-port fallback makes ws re-emit EADDRINUSE as an unhandled error.
    await relay.attach(httpsServer);
    return httpsServer;
  } catch (error) {
    vcamHttpsError = error.message;
    console.warn(`Virtual camera HTTPS disabled: ${error.message}`);
    return null;
  }
}

export async function virtualCameraInfo() {
  const ips = lanIPv4Addresses();
  const ip = ips[0] || null;
  const httpsReady = vcamHttpsPort != null;
  const phoneUrl = (ip && httpsReady) ? `https://${ip}:${vcamHttpsPort}/phone` : null;
  let qrDataUrl = null;
  if (phoneUrl) {
    const QR = await import("qrcode");
    qrDataUrl = await QR.default.toDataURL(phoneUrl, {
      margin: 1,
      width: 240,
      color: { dark: "#10100cff", light: "#f0ebe2ff" }
    });
  }
  return {
    ok: Boolean(phoneUrl),
    url: phoneUrl,
    ips,
    qrDataUrl,
    https: httpsReady,
    httpsPort: vcamHttpsPort,
    httpsError: httpsReady ? null : vcamHttpsError,
    noLan: !ip
  };
}

export async function createVirtualCameraService(server) {
  const relay = createVcamRelay();
  await relay.attach(server);
  const httpsServer = await startVcamHttps(relay);
  return {
    info: virtualCameraInfo,
    close: async () => {
      await relay.close();
      await new Promise((resolve) => {
        if (!httpsServer?.listening) return resolve();
        httpsServer.close(() => resolve());
      });
    }
  };
}

function createPromptAtlasServer() {
  return createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    if (url.pathname.startsWith("/api/")) {
      return handleApi(req, res, url);
    }

    // Phone companion page for the virtual camera (also served over HTTPS; kept here
    // as an http:// fallback for the URL, though Chrome needs the HTTPS one for gyro).
    if (url.pathname === "/phone" || url.pathname === "/phone/") {
      return await serveVcamPhonePage(res);
    }

    const filePath = url.pathname.startsWith("/barzy/")
      ? safeBarzyPath(url.pathname)
      : url.pathname.startsWith("/tools/")
        ? safeToolsPath(url.pathname)
        : url.pathname.startsWith("/lib/")
          ? safeLibPath(url.pathname)
          : safeStaticPath(url.pathname);
    if (!filePath || !existsSync(filePath)) {
      return sendText(res, 404, "Not found");
    }

    const ext = path.extname(filePath).toLowerCase();
    const body = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
      "Surrogate-Control": "no-store"
    });
    res.end(body);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Server error" });
  }
  });
}

export function startServer(options = {}) {
  const port = Number(options.port ?? process.env.PORT ?? defaultPort);
  // Bind to 0.0.0.0 so a phone on the same WiFi can reach the virtual-camera
  // page; Windows Firewall may prompt to allow Node on first launch.
  const host = options.host || process.env.HOST || "0.0.0.0";
  const server = createPromptAtlasServer();
  // One relay, shared across the HTTP (studio, ws://) and HTTPS (phone, wss://) servers.
  const relay = createVcamRelay();
  relay.attach(server);
  // Start the self-signed HTTPS phone endpoint in the background; never block or
  // crash the main server on it.
  startVcamHttps(relay).catch((error) => {
    vcamHttpsError = error?.message || String(error);
    console.warn(`Virtual camera HTTPS setup error: ${vcamHttpsError}`);
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      const address = server.address();
      const actualPort = typeof address === "object" && address ? address.port : port;
      const displayHost = host === "0.0.0.0" || host === "::" ? "127.0.0.1" : host;
      const url = `http://${displayHost}:${actualPort}`;
      console.log(`${appName} running at ${url}`);
      resolve({ server, port: actualPort, host, url });
    });
  });
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  startServer().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
