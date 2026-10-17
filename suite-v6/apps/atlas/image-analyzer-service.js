import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { SharedApiVault } from "./shared-api-vault.js";
import { buildPromptSkillContext } from "./lib/prompt-skill-router.js";

export const IMAGE_ANALYZER_MODELS = Object.freeze([
  { id: "gpt-5.6-sol", name: "GPT-5.6 Sol", provider: "openai", vision: true },
  { id: "gpt-5.6-terra", name: "GPT-5.6 Terra", provider: "openai", vision: true },
  { id: "gpt-5.6-luna", name: "GPT-5.6 Luna", provider: "openai", vision: true },
  { id: "gpt-5.4", name: "GPT-5.4", provider: "openai", vision: true },
  { id: "gpt-5.4-mini", name: "GPT-5.4 mini", provider: "openai", vision: true },
  { id: "gpt-4.1-mini", name: "GPT-4.1 mini", provider: "openai", vision: true },
  { id: "claude-opus-5-5", name: "Claude Opus 5.5", provider: "anthropic", vision: true },
  { id: "claude-sonnet-5-5", name: "Claude Sonnet 5.5", provider: "anthropic", vision: true },
  { id: "claude-fable-5", name: "Claude Fable 5", provider: "anthropic", vision: true },
  { id: "claude-opus-4-8", name: "Claude Opus 4.8", provider: "anthropic", vision: true },
  { id: "claude-sonnet-5", name: "Claude Sonnet 5", provider: "anthropic", vision: true },
  { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", provider: "anthropic", vision: true },
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", provider: "anthropic", vision: true },
  { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash", provider: "google", vision: true, fallbackId: "gemini-2.5-flash" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "google", vision: true }
]);

const DEFAULT_MODEL = "gpt-4.1-mini";
const PROVIDER_KEYS = Object.freeze({
  openai: "openaiApiKey",
  anthropic: "anthropicApiKey",
  google: "googleApiKey"
});
const ALL_SECRET_FIELDS = Object.freeze([
  "falApiKey", "falAdminApiKey", "heygenApiKey", "openaiApiKey",
  "anthropicApiKey", "googleApiKey", "deepseekApiKey"
]);

const SYSTEM_INSTRUCTION = [
  "You are the Image Analyzer inside Prompt Atlas 6.",
  "Analyze the supplied image and turn it into a strong generative-media prompt.",
  "Be precise about subject, environment, composition, lighting, camera or lens feel, materials, color, mood, and useful negative constraints.",
  "Do not invent brand names or identities. Describe only visually useful information.",
  "Return strict JSON with these keys only: prompt, subject, context, style.",
  "prompt: a complete image or video generation prompt.",
  "subject: the core subject phrase for a video model.",
  "context: setting, action, surrounding detail, and narrative context.",
  "style: camera, lighting, color, texture, mood, and art direction."
].join("\n");

function modelInfo(id) {
  return IMAGE_ANALYZER_MODELS.find((model) => model.id === id) ?? IMAGE_ANALYZER_MODELS.find((model) => model.id === DEFAULT_MODEL);
}

function dataUrlParts(value) {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\r\n]+)$/i.exec(String(value || ""));
  return match ? { mime: match[1], base64: match[2].replace(/\s/g, "") } : null;
}

function cleanJson(value) {
  return String(value || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
}

function normalizeAnalysis(text) {
  let value;
  try { value = JSON.parse(cleanJson(text)); } catch { value = { prompt: cleanJson(text) }; }
  const prompt = String(value?.prompt || "").trim();
  return {
    prompt,
    seedance: {
      subject: String(value?.subject || "").trim(),
      context: String(value?.context || "").trim(),
      style: String(value?.style || "").trim()
    }
  };
}

function extractOpenAiText(payload) {
  return String(payload?.output_text || payload?.output?.flatMap((item) => item.content || []).map((part) => part.text).filter(Boolean).join("\n") || "").trim();
}

async function responseJson(fetchImpl, url, options) {
  const response = await fetchImpl(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(payload?.error?.message || payload?.error || `Requête IA refusée (HTTP ${response.status}).`), { status: response.status });
  return payload;
}

async function callProvider({ fetchImpl, model, key, imageDataUrl, system = SYSTEM_INSTRUCTION }) {
  const info = modelInfo(model);
  if (info.provider === "anthropic") {
    const image = dataUrlParts(imageDataUrl);
    const payload = await responseJson(fetchImpl, "https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({
        model: info.id, max_tokens: 1200, temperature: 0.55, system,
        messages: [{ role: "user", content: [
          { type: "text", text: "Analyze this image and return the requested JSON." },
          { type: "image", source: { type: "base64", media_type: image.mime, data: image.base64 } }
        ] }]
      })
    });
    return (payload.content || []).map((part) => part.text).filter(Boolean).join("\n");
  }
  if (info.provider === "google") {
    const image = dataUrlParts(imageDataUrl);
    const call = async (id) => responseJson(fetchImpl, `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(id)}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: "Analyze this image and return the requested JSON." }, { inlineData: { mimeType: image.mime, data: image.base64 } }] }],
        generationConfig: { temperature: 0.55, maxOutputTokens: 2400, thinkingConfig: { thinkingBudget: 0 } }
      })
    });
    let payload;
    try { payload = await call(info.id); } catch (error) {
      if (!info.fallbackId || error.status !== 404) throw error;
      payload = await call(info.fallbackId);
    }
    return (payload.candidates?.[0]?.content?.parts || []).map((part) => part.text).filter(Boolean).join("\n");
  }
  const payload = await responseJson(fetchImpl, "https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: info.id,
      input: [
        { role: "system", content: system },
        { role: "user", content: [{ type: "input_text", text: "Analyze this image and return the requested JSON." }, { type: "input_image", image_url: imageDataUrl, detail: "high" }] }
      ],
      max_output_tokens: 1200,
      ...(!info.id.startsWith("gpt-5") ? { temperature: 0.55 } : {})
    })
  });
  return extractOpenAiText(payload);
}

export function createImageAnalyzerService({
  dataDirectory,
  fetchImpl = globalThis.fetch,
  legacySettingsPath,
  sharedSecretsDirectory,
  secretVault
} = {}) {
  if (!dataDirectory) throw new TypeError("Image Analyzer requires a data directory.");
  const settingsPath = path.join(dataDirectory, "ai-settings.local.json");
  const vault = secretVault || new SharedApiVault(sharedSecretsDirectory || path.join(dataDirectory, "api-vault"));
  let vaultReady;
  async function ensureVault() {
    if (!vaultReady) vaultReady = vault.init();
    await vaultReady;
  }

  async function readSettings() {
    try { return JSON.parse(await readFile(settingsPath, "utf8")); } catch { return {}; }
  }

  async function writeSettings(value) {
    await mkdir(dataDirectory, { recursive: true });
    await writeFile(settingsPath, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  }

  async function init() {
    await ensureVault();
    let current = {};
    try { current = JSON.parse(await readFile(settingsPath, "utf8")); } catch {}
    let legacy = {};
    if (legacySettingsPath) {
      try { legacy = JSON.parse(await readFile(legacySettingsPath, "utf8")); } catch {}
    }
    for (const field of ALL_SECRET_FIELDS) {
      const value = String(current[field] || legacy[field] || "").trim();
      if (value && !await vault.has(field)) await vault.set(field, value);
    }
    const model = modelInfo(current.model || legacy.llmModel || legacy.openaiModel).id;
    await writeSettings({ model });
  }

  async function publicSettings() {
    await ensureVault();
    const settings = await readSettings();
    return {
      model: modelInfo(settings.model).id,
      models: IMAGE_ANALYZER_MODELS,
      keyStates: Object.fromEntries(await Promise.all(Object.entries(PROVIDER_KEYS).map(async ([provider, field]) => [provider, await vault.has(field)]))),
      settingsPath
    };
  }

  async function updateSettings(body = {}) {
    await ensureVault();
    const current = await readSettings();
    const next = { model: modelInfo(body.model || current.model).id };
    for (const [provider, field] of Object.entries(PROVIDER_KEYS)) {
      if (typeof body[field] === "string" && body[field].trim()) await vault.set(field, body[field].trim());
      if (body.clearProvider === provider) await vault.delete(field);
    }
    await writeSettings(next);
    return publicSettings();
  }

  async function analyze(body = {}) {
    await ensureVault();
    const image = dataUrlParts(body.imageDataUrl);
    if (!image) throw Object.assign(new Error("Aucune image valide n’a été fournie."), { status: 400 });
    const settings = await readSettings();
    const info = modelInfo(body.model || settings.model);
    const key = String(await vault.get(PROVIDER_KEYS[info.provider]) || "").trim();
    if (!key) throw Object.assign(new Error(`La clé ${info.provider === "google" ? "Google" : info.provider === "anthropic" ? "Anthropic" : "OpenAI"} n’est pas configurée.`), { status: 400 });
    const skills = await buildPromptSkillContext({
      media: "image",
      targetEngine: body.targetEngine || "General image generation",
      task: "image-analysis"
    });
    const system = skills.text ? `${SYSTEM_INSTRUCTION}\n\n${skills.text}` : SYSTEM_INSTRUCTION;
    const text = await callProvider({ fetchImpl, model: info.id, key, imageDataUrl: body.imageDataUrl, system });
    return {
      ...normalizeAnalysis(text),
      model: info.id,
      provider: info.provider,
      skillTrace: { available: skills.available, version: skills.version, sections: skills.sections }
    };
  }

  async function privateSettings() {
    await ensureVault();
    const settings = await readSettings();
    for (const field of ALL_SECRET_FIELDS) settings[field] = await vault.get(field) || "";
    return settings;
  }

  return { init, publicSettings, updateSettings, analyze, privateSettings, settingsPath, vault };
}
