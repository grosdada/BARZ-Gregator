import { MODES, TRANSFORM_HINTS } from "./apg-data.js";

const TARGET_ENGINES = Object.freeze({
  image: ["General image generation", "GPT Image", "FLUX 3", "Midjourney"],
  video: ["General video generation", "Kling 3", "MiniMax H3", "Seedance", "Veo", "Wan 3"]
});

function el(tag, className = "", text) {
  const value = document.createElement(tag);
  if (className) value.className = className;
  if (text !== undefined) value.textContent = text;
  return value;
}

function action(label, className = "") {
  const value = el("button", className, label);
  value.type = "button";
  return value;
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function guideWords(value) {
  return String(value || "").toLowerCase().split(/[\s,;]+/).map((word) => word.trim()).filter(Boolean);
}

function cleanSentence(text) {
  return String(text || "").replace(/\s+/g, " ").replace(/\s+([,.])/g, "$1").trim();
}

function ensureConfiguration(configuration) {
  for (const mode of MODES) {
    if (!Object.hasOwn(configuration.weights, mode.id)) configuration.weights[mode.id] = mode.weight;
    if (!Object.hasOwn(configuration.enabled, mode.id)) configuration.enabled[mode.id] = false;
  }
}

function activeBlend(configuration) {
  const active = MODES.map((mode) => ({
    ...mode,
    weight: configuration.enabled[mode.id] ? Number(configuration.weights[mode.id] || 0) : 0
  })).filter((mode) => mode.weight > 0).sort((a, b) => b.weight - a.weight);
  const selected = (active.length ? active : [MODES[0]]).slice(0, 8);
  const total = selected.reduce((sum, mode) => sum + mode.weight, 0) || 1;
  return selected.map((mode) => ({ ...mode, share: Math.round((mode.weight / total) * 100) }));
}

function pickFromMode(mode, slot, guide = "") {
  const pool = mode.pools[slot] || [];
  const words = guideWords(guide);
  const matches = words.length ? pool.filter((item) => words.some((word) => item.toLowerCase().includes(word))) : [];
  return randomItem(matches.length ? [...matches, ...matches, ...pool] : pool);
}

function weightedFromBlend(blend, slot, guide = "") {
  const total = blend.reduce((sum, mode) => sum + mode.weight, 0) || 1;
  let roll = Math.random() * total;
  let selected = blend[0];
  for (const mode of blend) {
    roll -= mode.weight;
    if (roll <= 0) { selected = mode; break; }
  }
  return pickFromMode(selected, slot, guide);
}

function mediaFinish(configuration, style, tone) {
  const target = configuration.targetEngine?.startsWith("General ") ? "" : `, tuned for ${configuration.targetEngine}`;
  if (configuration.outputType === "video") {
    const pace = configuration.complexity >= 8 ? "a slow reveal evolving into a second visual beat" : "a controlled slow push-in";
    const oddity = configuration.absurdity >= 7 ? "the strange element is treated as physically real, never as a joke" : "the impossible detail stays subtle and believable";
    return `Shot as a production-ready video prompt${target}: ${pace}, motivated lighting, readable blocking, tactile environment detail, ${style}, ${tone}; ${oddity}.`;
  }
  const composition = configuration.complexity >= 8 ? "layered foreground, midground, and background detail" : "one clear focal point with restrained supporting detail";
  const oddity = configuration.absurdity >= 7 ? "the absurd element is integrated into the scene logic" : "the surreal detail remains understated";
  return `Image prompt${target}: ${composition}, cinematic lighting, precise material texture, ${style}, ${tone}; ${oddity}.`;
}

function generateLocal(configuration, guide = "") {
  const blend = activeBlend(configuration);
  const dominant = blend[0];
  const support = blend[1] || dominant;
  const accent = blend[2] || support;
  const anchor = guide || configuration.intent.trim();
  const subject = anchor || pickFromMode(dominant, "subjects");
  const actionText = pickFromMode(support, "actions", anchor);
  const object = pickFromMode(accent, "objects", anchor);
  const setting = pickFromMode(dominant, "settings", anchor);
  const style = pickFromMode(support, "styles", anchor);
  const tone = pickFromMode(accent, "tones", anchor);
  const lines = [cleanSentence(`${subject} ${actionText} ${object} ${setting}.`)];
  if (configuration.complexity >= 5) lines.push(cleanSentence(`The scene carries ${weightedFromBlend(blend, "styles", anchor)} as a secondary influence while preserving a single readable focal point.`));
  if (configuration.complexity >= 8) lines.push(cleanSentence(`A background echo of ${weightedFromBlend(blend, "settings", anchor)} is folded into the environment as visual logic, not as a separate scene.`));
  if (configuration.absurdity >= 6) lines.push(cleanSentence(`${weightedFromBlend(blend, "objects", anchor)} quietly becomes the emotional center of the image.`));
  if (configuration.absurdity >= 9) lines.push(cleanSentence(`Everything appears rational while the world seems to ${weightedFromBlend(blend, "actions", anchor)} itself.`));
  lines.push(mediaFinish(configuration, style, tone));
  return lines.join("\n");
}

function sample(pool, count) {
  const items = [...pool];
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [items[index], items[swap]] = [items[swap], items[index]];
  }
  return items.slice(0, count);
}

function semanticContext(configuration, guide, localDraft) {
  return {
    intent: configuration.intent.trim(),
    guide,
    outputType: configuration.outputType,
    targetEngine: configuration.targetEngine,
    complexity: configuration.complexity,
    absurdity: configuration.absurdity,
    model: configuration.model || undefined,
    recentOutputs: configuration.history.slice(0, 3).map((item) => item.prompt.slice(0, 240)),
    localDraft,
    blend: activeBlend(configuration).map((mode, index) => ({
      id: mode.id, label: mode.label, weight: mode.weight, share: mode.share, rank: index + 1, source: mode.source,
      ingredients: Object.fromEntries(Object.entries(mode.pools).map(([key, pool]) => [key, sample(pool, index === 0 ? 4 : index === 1 ? 3 : 2)]))
    }))
  };
}

function downloadPrompt(prompt) {
  const href = URL.createObjectURL(new Blob([`${prompt}\n`], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = href; link.download = `apg-${new Date().toISOString().slice(0, 10)}.txt`; link.click();
  setTimeout(() => URL.revokeObjectURL(href), 0);
}

export function mountApgStudio({ host, header, configuration, onDirty, toast, api, copyText, onSendToAggregator }) {
  ensureConfiguration(configuration);
  let aiStatus = { available: false, models: [], keyStates: {} };

  const root = el("section", "apg-shell");
  const controls = el("section", "apg-controls");
  controls.append(el("div", "apg-kicker", "SEED MIXER"));

  const intentField = el("label", "runtime-field", "Intent");
  const intent = el("textarea"); intent.rows = 4; intent.maxLength = 50_000; intent.value = configuration.intent;
  intent.placeholder = "";
  intent.addEventListener("input", () => { configuration.intent = intent.value; onDirty(); }); intentField.append(intent);

  const inline = el("div", "apg-inline");
  const outputField = el("label", "runtime-field", "Sortie");
  const outputType = el("select");
  [["image", "Image"], ["video", "Vidéo"]].forEach(([value, label]) => { const option = el("option", "", label); option.value = value; option.selected = configuration.outputType === value; outputType.append(option); });
  const targetField = el("label", "runtime-field", "Cible");
  const target = el("select");
  function renderTargets() {
    const choices = TARGET_ENGINES[configuration.outputType] || TARGET_ENGINES.image;
    if (!choices.includes(configuration.targetEngine)) configuration.targetEngine = choices[0];
    target.replaceChildren();
    choices.forEach((value) => {
      const option = el("option", "", value.startsWith("General ") ? "Général" : value);
      option.value = value;
      option.selected = configuration.targetEngine === value;
      target.append(option);
    });
  }
  outputType.addEventListener("change", () => {
    configuration.outputType = outputType.value;
    renderTargets();
    onDirty();
  });
  outputField.append(outputType);
  renderTargets();
  target.addEventListener("change", () => { configuration.targetEngine = target.value; onDirty(); }); targetField.append(target);
  inline.append(outputField, targetField); controls.append(intentField, inline);

  const modelField = el("label", "runtime-field", "Modèle IA");
  const model = el("select"); const modelStatus = el("small", "apg-ai-status", "Lecture du coffre API…"); modelField.append(model, modelStatus); controls.append(modelField);

  const sliders = el("div", "apg-inline");
  [["complexity", "Complexité"], ["absurdity", "Absurdité"]].forEach(([key, labelText]) => {
    const field = el("label", "runtime-field", `${labelText} · ${configuration[key]}`);
    const input = el("input"); input.type = "range"; input.min = "1"; input.max = "10"; input.value = String(configuration[key]);
    input.addEventListener("input", () => { configuration[key] = Number(input.value); field.firstChild.textContent = `${labelText} · ${input.value}`; onDirty(); });
    field.append(input); sliders.append(field);
  });
  controls.append(sliders);

  const guideField = el("label", "runtime-field", "Mots-guides");
  const guide = el("input"); guide.maxLength = 50_000; guide.value = configuration.guide; guide.placeholder = "Optionnel · objets, lieux, matières ou intentions à privilégier";
  guide.addEventListener("input", () => { configuration.guide = guide.value; onDirty(); }); guideField.append(guide); controls.append(guideField);

  const controlActions = el("div", "apg-actions");
  const generate = action("Générer avec l’IA", "primary-action");
  const local = action("Seed local", "quiet-button");
  const guided = action("Guide + générer", "quiet-button");
  controlActions.append(generate, local, guided); controls.append(controlActions);

  const workspace = el("section", "apg-workspace");
  const promptHead = el("div", "apg-prompt-head");
  promptHead.append(el("b", "", "PROMPT"));
  const promptActions = el("div", "apg-actions");
  const clear = action("Effacer", "quiet-button"); const copy = action("Copier", "quiet-button"); const download = action("Exporter", "quiet-button"); const send = action("Envoyer à BZ Aggregator", "primary-action");
  promptActions.append(clear, copy, download, send); promptHead.append(promptActions);
  const prompt = el("textarea", "apg-prompt"); prompt.rows = 15; prompt.spellcheck = false; prompt.value = configuration.prompt; prompt.placeholder = "Génère un seed, puis affine-le.";
  prompt.addEventListener("input", () => { configuration.prompt = prompt.value; onDirty(); });

  const transforms = el("div", "apg-transform-grid");
  [["ai refine", "AI Refine"], ["more realistic", "Plus réaliste"], ["more cinematic", "Plus cinéma"], ["more absurd", "Plus absurde"], ["cleaner commercial", "Commercial propre"], ["darker", "Plus sombre"], ["funnier", "Plus drôle"], ["editorial", "Éditorial"], ["convert to image prompt", "Vers image"], ["convert to video prompt", "Vers vidéo"]].forEach(([value, label]) => {
    const control = action(label, "quiet-button"); control.dataset.transform = value; transforms.append(control);
  });

  const mixerHead = el("div", "apg-mixer-head"); mixerHead.append(el("b", "", `SEED SLIDERS · ${MODES.length} familles`));
  const mixerActions = el("div", "apg-actions");
  const selectAll = action("Tout", "text-button"); const selectNone = action("Aucun", "text-button"); const selectRandom = action("Aléatoire", "text-button"); const shuffle = action("Shuffle", "text-button");
  mixerActions.append(selectAll, selectNone, selectRandom, shuffle); mixerHead.append(mixerActions);
  const modeGrid = el("div", "apg-mode-grid");
  const history = el("aside", "apg-history"); history.append(el("b", "", "HISTORIQUE"));
  const historyList = el("div", "apg-history-list"); history.append(historyList);

  workspace.append(promptHead, prompt, transforms, mixerHead, modeGrid);
  const layout = el("div", "apg-layout"); layout.append(controls, workspace, history); root.append(layout); host.replaceChildren(header, root);

  function dirty() { onDirty(); }
  function setPrompt(value, kind = "édition") {
    configuration.prompt = String(value || "").trim(); prompt.value = configuration.prompt;
    if (configuration.prompt) configuration.history.unshift({ id: crypto.randomUUID(), prompt: configuration.prompt, createdAt: new Date().toISOString(), kind });
    configuration.history = configuration.history.slice(0, 80); dirty(); renderHistory();
  }
  function renderHistory() {
    historyList.replaceChildren();
    if (!configuration.history.length) return historyList.append(el("p", "runtime-note", "Aucun prompt généré."));
    configuration.history.forEach((entry) => {
      const item = action("", "apg-history-item");
      item.append(el("small", "", `${entry.kind} · ${new Date(entry.createdAt).toLocaleString(document.documentElement.lang === "fr" ? "fr-FR" : "en-US")}`), el("span", "", entry.prompt));
      item.addEventListener("click", () => { configuration.prompt = entry.prompt; prompt.value = entry.prompt; dirty(); });
      historyList.append(item);
    });
  }
  function renderModes() {
    modeGrid.replaceChildren();
    MODES.forEach((modeInfo) => {
      const card = el("label", "apg-mode");
      const enabled = el("input"); enabled.type = "checkbox"; enabled.checked = configuration.enabled[modeInfo.id];
      const name = el("span", "", modeInfo.label); const weight = el("input"); weight.type = "range"; weight.min = "0"; weight.max = "100"; weight.value = String(configuration.weights[modeInfo.id]);
      const number = el("small", "", String(configuration.weights[modeInfo.id]));
      enabled.addEventListener("change", () => { configuration.enabled[modeInfo.id] = enabled.checked; dirty(); });
      weight.addEventListener("input", () => { configuration.weights[modeInfo.id] = Number(weight.value); number.textContent = weight.value; dirty(); });
      card.append(enabled, name, weight, number); modeGrid.append(card);
    });
  }
  function setEnabled(kind) {
    MODES.forEach((modeInfo) => { configuration.enabled[modeInfo.id] = kind === "all" ? true : kind === "none" ? false : Math.random() < 0.23; });
    dirty(); renderModes();
  }
  async function generatePrompt(useGuide = false) {
    const localDraft = generateLocal(configuration, useGuide ? configuration.guide : "");
    if (!aiStatus.available) { setPrompt(localDraft, "seed local"); return toast("Aucune clé IA disponible : seed local utilisé.", true); }
    generate.disabled = true; prompt.value = "Composition sémantique en cours…";
    try {
      const result = await api("/api/v1/ai/compose", { method: "POST", body: JSON.stringify(semanticContext(configuration, useGuide ? configuration.guide : "", localDraft)) });
      setPrompt(result.prompt || localDraft, "mix IA"); toast(`A.P.G composé avec ${result.model}.`);
    } catch (error) { setPrompt(localDraft, "secours local"); toast(`${error.message} · seed local conservé.`, true); }
    finally { generate.disabled = !aiStatus.available; }
  }
  async function refine(transform) {
    const original = prompt.value.trim(); if (!original) return toast("Génère ou saisis d’abord un prompt.", true);
    if (!aiStatus.available) return toast("Configure une clé IA dans l’onglet API de la suite.", true);
    if (transform === "convert to image prompt") configuration.outputType = "image";
    if (transform === "convert to video prompt") configuration.outputType = "video";
    outputType.value = configuration.outputType;
    renderTargets();
    prompt.value = "Raffinement en cours…";
    try {
      const result = await api("/api/v1/ai/refine", { method: "POST", body: JSON.stringify({ prompt: original, intent: configuration.intent, outputType: configuration.outputType, targetEngine: configuration.targetEngine, model: configuration.model || undefined, transform: `${transform}: ${TRANSFORM_HINTS[transform] || ""}` }) });
      setPrompt(result.refined || original, transform); toast(`Prompt raffiné avec ${result.model}.`);
    } catch (error) { prompt.value = original; toast(error.message, true); }
  }
  async function loadStatus() {
    aiStatus = await api("/api/v1/ai/status"); model.replaceChildren();
    aiStatus.models.forEach((item) => { const option = el("option", "", `${item.name} · ${item.provider}`); option.value = item.id; model.append(option); });
    // The top-right selector is the suite-wide source of truth. A.P.G used to keep
    // its own persisted model, which could make the header say Claude while A.P.G
    // silently sent the request to an older GPT model.
    configuration.model = aiStatus.models.some((item) => item.id === aiStatus.model) ? aiStatus.model : (aiStatus.models[0]?.id || "");
    model.value = configuration.model; generate.disabled = !aiStatus.available;
    const providers = Object.entries(aiStatus.keyStates).filter(([, ready]) => ready).map(([provider]) => provider);
    const active = aiStatus.models.find((item) => item.id === configuration.model);
    modelStatus.textContent = providers.length ? `Modèle global : ${active?.name || configuration.model}` : "Aucune clé · utilise l’onglet API de la suite";
    modelStatus.dataset.ready = aiStatus.available ? "true" : "false";
  }

  model.addEventListener("change", async () => {
    const previous = configuration.model;
    const selected = aiStatus.models.find((item) => item.id === model.value);
    configuration.model = model.value; dirty();
    try {
      await api("/api/v1/preferences", {
        method: "PUT",
        body: JSON.stringify({ aiProvider: selected?.provider || "openai", aiModel: configuration.model })
      });
      window.dispatchEvent(new CustomEvent("barz:aimodelchange", { detail: { provider: selected?.provider, model: configuration.model } }));
      modelStatus.textContent = `Modèle global : ${selected?.name || configuration.model}`;
    } catch (error) {
      configuration.model = previous; model.value = previous; dirty(); toast(error.message, true);
    }
  });
  window.addEventListener("barz:aimodelchange", (event) => {
    if (!root.isConnected) return;
    const nextModel = event.detail?.model;
    const selected = aiStatus.models.find((item) => item.id === nextModel);
    if (!selected) return;
    configuration.model = nextModel; model.value = nextModel;
    modelStatus.textContent = `Modèle global : ${selected.name}`;
    dirty();
  });
  generate.addEventListener("click", () => generatePrompt(false)); guided.addEventListener("click", () => generatePrompt(true));
  local.addEventListener("click", () => { setPrompt(generateLocal(configuration, configuration.guide), "seed local"); toast("Seed local généré."); });
  clear.addEventListener("click", () => { configuration.prompt = ""; prompt.value = ""; dirty(); });
  copy.addEventListener("click", () => copyText(prompt.value, "Prompt A.P.G copié.")); download.addEventListener("click", () => prompt.value.trim() && downloadPrompt(prompt.value.trim()));
  send.addEventListener("click", () => { const value = prompt.value.trim(); if (!value) return toast("Aucun prompt à envoyer.", true); onSendToAggregator(value, configuration.outputType); });
  transforms.addEventListener("click", (event) => { const transform = event.target.closest("button")?.dataset.transform; if (transform) refine(transform); });
  selectAll.addEventListener("click", () => setEnabled("all")); selectNone.addEventListener("click", () => setEnabled("none")); selectRandom.addEventListener("click", () => setEnabled("random"));
  shuffle.addEventListener("click", () => { MODES.forEach((modeInfo) => { configuration.weights[modeInfo.id] = 5 + Math.floor(Math.random() * 36); }); dirty(); renderModes(); });

  renderModes(); renderHistory(); loadStatus().catch((error) => { modelStatus.textContent = error.message; generate.disabled = true; });
}
