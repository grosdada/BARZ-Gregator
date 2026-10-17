const PROVIDERS = Object.freeze({
  openai: {
    label: "OpenAI",
    url: "https://api.openai.com/v1/models",
    headers: (key) => ({ Authorization: `Bearer ${key}` })
  },
  anthropic: {
    label: "Anthropic",
    url: "https://api.anthropic.com/v1/models?limit=1",
    headers: (key) => ({ "x-api-key": key, "anthropic-version": "2023-06-01" })
  },
  gemini: {
    label: "Gemini",
    url: "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1",
    headers: (key) => ({ "x-goog-api-key": key })
  },
  deepseek: {
    label: "DeepSeek",
    url: "https://api.deepseek.com/models",
    headers: (key) => ({ Authorization: `Bearer ${key}` })
  },
  krea: {
    label: "Krea",
    url: "https://api.krea.ai/styles?filter=user&limit=1",
    headers: (key) => ({ Authorization: `Bearer ${key}` })
  }
});

export const API_KEY_PROVIDERS = Object.freeze([
  { id: "fal", label: "fal", field: "falApiKey", description: "Génération image, vidéo et Director" },
  { id: "fal-admin", label: "fal Admin", field: "falAdminApiKey", optional: true, description: "Lecture facultative du solde fal" },
  { id: "heygen", label: "HeyGen", field: "heygenApiKey", description: "HeyGen Video 1 et dialogues" },
  { id: "krea", label: "Krea", field: "kreaApiKey", description: "Flux.1 Dev et bibliothèque de LoRA Krea (Krea2 exclu)" },
  { id: "openai", label: "OpenAI", field: "openaiApiKey", description: "Analyse et outils IA de Prompt Atlas" },
  { id: "anthropic", label: "Anthropic", field: "anthropicApiKey", description: "Claude dans Prompt Atlas" },
  { id: "gemini", label: "Gemini", field: "googleApiKey", description: "Gemini dans Prompt Atlas" },
  { id: "deepseek", label: "DeepSeek", field: "deepseekApiKey", description: "Raisonnement et auto-blocking" }
]);

export function apiKeyProvider(id) {
  return API_KEY_PROVIDERS.find((provider) => provider.id === id) || null;
}

export async function verifyStandardApiKey(id, apiKey, { fetchImpl = globalThis.fetch } = {}) {
  const provider = PROVIDERS[id];
  if (!provider) throw Object.assign(new Error("Fournisseur API inconnu."), { statusCode: 404 });
  const response = await fetchImpl(provider.url, {
    method: "GET",
    headers: { Accept: "application/json", ...provider.headers(apiKey) },
    signal: AbortSignal.timeout(12_000)
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const remoteMessage = payload?.error?.message || payload?.error?.status || "clé refusée";
    throw Object.assign(new Error(`${provider.label} a refusé la clé (${response.status}) : ${remoteMessage}.`), {
      statusCode: response.status === 401 || response.status === 403 ? 400 : 502
    });
  }
  return { verified: true, provider: id };
}
