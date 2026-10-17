const ICONS = {
  import: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
  clear: '<path d="M5 7h14M9 7V4h6v3M7 7l1 14h8l1-14"/>',
  analyze: '<path d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z"/>',
  copy: '<rect x="8" y="8" width="11" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2"/>',
  send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1z"/>'
};

function icon(name) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
}

function node(tag, className = "", text) {
  const value = document.createElement(tag);
  if (className) value.className = className;
  if (text !== undefined) value.textContent = text;
  return value;
}

function action(label, iconName, className = "") {
  const value = node("button", `analyzer-action ${className}`.trim());
  value.type = "button"; value.title = label; value.setAttribute("aria-label", label);
  value.innerHTML = `${icon(iconName)}<span>${label}</span>`;
  return value;
}

export function splitAnalyzerPrompt(prompt) {
  const clean = String(prompt || "").replace(/\s+/g, " ").trim();
  const sentences = clean.match(/[^.!?]+[.!?]*/g)?.map((item) => item.trim()).filter(Boolean) || (clean ? [clean] : []);
  const subject = sentences[0]?.replace(/^Image prompt:\s*/i, "").split(",").slice(0, 2).join(",").trim().replace(/[.!?]+$/, "") || "";
  const styleWords = /(style|lighting|lens|camera|texture|composition|color|grade|cinematic|photographic|rendered|shot|film|macro|wide|close)/i;
  const style = sentences.filter((sentence) => styleWords.test(sentence)).join(" ") || sentences.at(-1) || "";
  const context = sentences.filter((sentence, index) => index > 0 && !styleWords.test(sentence)).join(" ") || sentences.slice(1, -1).join(" ") || clean;
  return { subject, context, style };
}

function providerLabel(provider) {
  return ({ openai: "OpenAI", anthropic: "Anthropic", google: "Google" })[provider] || provider;
}

export function mountImageAnalyzer({ host, header, configuration, onDirty, toast, api, copyText, onSendTarget }) {
  let imageDataUrl = "";
  let analysisParts = { subject: "", context: "", style: "" };
  let settings = { models: [], keyStates: {} };

  const shell = node("section", "analyzer-shell");
  const command = node("div", "analyzer-command-bar");
  const modelField = node("label", "analyzer-model-field");
  modelField.append(node("span", "", "Modèle vision"));
  const modelSelect = node("select"); modelSelect.setAttribute("aria-label", "Modèle d’analyse d’image"); modelField.append(modelSelect);
  const keyStatus = node("span", "analyzer-key-status", "Vérification de la clé…");
  const configure = action("Configurer les clés IA", "settings");
  command.append(modelField, keyStatus, configure);

  const grid = node("div", "analyzer-grid");
  const source = node("section", "analyzer-panel analyzer-source-panel");
  const sourceHead = node("div", "analyzer-panel-head"); sourceHead.append(node("div", "analyzer-kicker", "SOURCE"), node("h3", "", "Image à décoder"));
  const drop = node("div", "analyzer-drop"); drop.tabIndex = 0; drop.setAttribute("role", "button"); drop.setAttribute("aria-label", "Importer une image");
  const preview = node("img"); preview.alt = "Aperçu de l’image importée";
  const empty = node("div", "analyzer-empty"); empty.innerHTML = `${icon("analyze")}<b>Dépose une image ici</b><span>PNG, JPG, WEBP ou GIF</span>`;
  drop.append(preview, empty);
  const input = node("input"); input.type = "file"; input.accept = "image/png,image/jpeg,image/webp,image/gif"; input.hidden = true;
  const sourceActions = node("div", "analyzer-source-actions");
  const importButton = action("Importer une image", "import");
  const clearButton = action("Clear", "clear");
  const analyzeButton = action("Analyser", "analyze", "is-primary");
  sourceActions.append(importButton, clearButton, analyzeButton);
  source.append(sourceHead, drop, input, sourceActions);

  const outputPanel = node("section", "analyzer-panel analyzer-output-panel");
  const outputHead = node("div", "analyzer-panel-head analyzer-output-head");
  const outputTitles = node("div"); outputTitles.append(node("div", "analyzer-kicker", "PROMPT"), node("h3", "", "Analyse visuelle"));
  const copyButton = action("Copier", "copy"); outputHead.append(outputTitles, copyButton);
  const output = node("textarea", "analyzer-output"); output.rows = 13; output.spellcheck = false; output.placeholder = "Le prompt détaillé apparaîtra ici.";
  const route = node("div", "analyzer-route");
  const target = node("select"); target.setAttribute("aria-label", "Destination du prompt");
  [["apg", "A.P.G Intent"], ["cccp", "CCP · Description de scène"], ["seedance", "Video Multi Framing"]].forEach(([value, label]) => {
    const option = node("option", "", label); option.value = value; option.selected = configuration.sendTarget === value; target.append(option);
  });
  const sendButton = action("Send to", "send", "is-primary"); route.append(target, sendButton);
  outputPanel.append(outputHead, output, route);
  grid.append(source, outputPanel);

  const parts = node("section", "analyzer-parts");
  const partFields = {};
  [["subject", "Sujet", "Identité et caractéristiques principales"], ["context", "Contexte", "Lieu, action et détails narratifs"], ["style", "Style", "Caméra, lumière, matière et ambiance"]].forEach(([id, label, placeholder]) => {
    const field = node("label", "analyzer-part"); field.append(node("span", "", label));
    const textarea = node("textarea"); textarea.rows = 4; textarea.placeholder = placeholder;
    textarea.addEventListener("input", () => { analysisParts[id] = textarea.value; });
    field.append(textarea); parts.append(field); partFields[id] = textarea;
  });
  shell.append(command, grid, parts); host.replaceChildren(header, shell);

  function selectedModelInfo() { return settings.models.find(({ id }) => id === modelSelect.value); }
  function syncKeyStatus() {
    const model = selectedModelInfo(); const ready = Boolean(model && settings.keyStates?.[model.provider]);
    keyStatus.textContent = model ? `${providerLabel(model.provider)} · ${ready ? "clé prête" : "clé manquante"}` : "Modèle indisponible";
    keyStatus.dataset.ready = ready ? "true" : "false";
    analyzeButton.disabled = !imageDataUrl || !ready;
  }
  function syncImage() {
    preview.src = imageDataUrl; preview.hidden = !imageDataUrl; empty.hidden = Boolean(imageDataUrl);
    clearButton.disabled = !imageDataUrl && !output.value; syncKeyStatus();
  }
  function setParts(next) {
    analysisParts = { subject: next?.subject || "", context: next?.context || "", style: next?.style || "" };
    Object.entries(partFields).forEach(([id, field]) => { field.value = analysisParts[id]; });
  }
  function clearAll() {
    imageDataUrl = ""; input.value = ""; output.value = ""; setParts({}); syncImage(); toast("Image et analyse effacées.");
  }
  function loadFile(file) {
    if (!file || !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) return toast("Choisis une image PNG, JPG, WEBP ou GIF.", true);
    const reader = new FileReader();
    reader.onerror = () => toast("Lecture de l’image impossible.", true);
    reader.onload = () => { imageDataUrl = String(reader.result || ""); output.value = ""; setParts({}); syncImage(); toast("Image importée."); };
    reader.readAsDataURL(file);
  }
  async function loadSettings() {
    settings = await api("/api/v1/image-analyzer/settings");
    modelSelect.replaceChildren(...settings.models.map((model) => {
      const option = node("option", "", `${model.name} · ${providerLabel(model.provider)}`); option.value = model.id; return option;
    }));
    const candidate = settings.models.some(({ id }) => id === configuration.model) ? configuration.model : settings.model;
    modelSelect.value = candidate; configuration.model = candidate; syncKeyStatus();
  }
  async function analyze() {
    if (!imageDataUrl) return toast("Importe d’abord une image.", true);
    analyzeButton.disabled = true; analyzeButton.classList.add("is-busy");
    analyzeButton.querySelector("span").textContent = "Analyse…"; output.value = "Analyse visuelle en cours…";
    try {
      const result = await api("/api/v1/image-analyzer/analyze", { method: "POST", body: JSON.stringify({ imageDataUrl, model: modelSelect.value }) });
      output.value = result.prompt || ""; setParts(result.seedance || splitAnalyzerPrompt(result.prompt)); toast(`Analyse terminée avec ${result.model}.`);
    } catch (error) { output.value = ""; setParts({}); toast(error.message, true); }
    finally { analyzeButton.classList.remove("is-busy"); analyzeButton.querySelector("span").textContent = "Analyser"; syncKeyStatus(); }
  }
  async function openSettings() {
    const dialog = node("dialog", "runtime-dialog analyzer-settings-dialog");
    const form = node("form", "dialog-form"); form.method = "dialog";
    const head = node("div", "dialog-head"); const close = action("Fermer", "clear"); close.addEventListener("click", () => dialog.close());
    head.append(node("h2", "", "Clés de vision"), close);
    form.append(head, node("p", "", "Les clés restent dans un fichier local et ne sont jamais renvoyées au navigateur."));
    const inputs = {};
    [["openaiApiKey", "OpenAI", "sk-…"], ["anthropicApiKey", "Anthropic", "sk-ant-…"], ["googleApiKey", "Google", "AIza…"]].forEach(([field, label, placeholder]) => {
      const row = node("label", "analyzer-key-field"); const provider = field.replace("ApiKey", "");
      row.append(node("span", "", `${label} ${settings.keyStates?.[provider] ? "· configurée" : "· absente"}`));
      const value = node("input"); value.type = "password"; value.placeholder = placeholder; value.autocomplete = "off"; row.append(value); form.append(row); inputs[field] = value;
    });
    const actions = node("div", "dialog-actions"); const clear = node("button", "quiet-button", "Effacer la clé active"); clear.type = "button";
    const cancel = node("button", "quiet-button", "Annuler"); cancel.type = "button"; cancel.addEventListener("click", () => dialog.close());
    const save = node("button", "primary", "Enregistrer"); save.type = "submit"; actions.append(clear, cancel, save); form.append(actions); dialog.append(form); document.body.append(dialog);
    clear.addEventListener("click", async () => { const provider = selectedModelInfo()?.provider; if (!provider) return; settings = await api("/api/v1/image-analyzer/settings", { method: "PUT", body: JSON.stringify({ model: modelSelect.value, clearProvider: provider }) }); dialog.close(); dialog.remove(); syncKeyStatus(); toast(`Clé ${providerLabel(provider)} effacée.`); });
    form.addEventListener("submit", async (event) => { event.preventDefault(); const body = { model: modelSelect.value }; Object.entries(inputs).forEach(([field, value]) => { if (value.value.trim()) body[field] = value.value.trim(); }); settings = await api("/api/v1/image-analyzer/settings", { method: "PUT", body: JSON.stringify(body) }); dialog.close(); dialog.remove(); syncKeyStatus(); toast("Clés IA enregistrées localement."); });
    dialog.addEventListener("close", () => dialog.remove(), { once: true }); dialog.showModal();
  }

  importButton.addEventListener("click", () => input.click()); input.addEventListener("change", () => { loadFile(input.files?.[0]); input.value = ""; });
  drop.addEventListener("click", () => input.click()); drop.addEventListener("keydown", (event) => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); input.click(); } });
  ["dragenter", "dragover"].forEach((type) => drop.addEventListener(type, (event) => { event.preventDefault(); drop.classList.add("is-over"); }));
  ["dragleave", "drop"].forEach((type) => drop.addEventListener(type, () => drop.classList.remove("is-over")));
  drop.addEventListener("drop", (event) => { event.preventDefault(); loadFile(event.dataTransfer.files?.[0]); });
  clearButton.addEventListener("click", clearAll); analyzeButton.addEventListener("click", analyze); configure.addEventListener("click", openSettings);
  copyButton.addEventListener("click", () => copyText(output.value, "Analyse copiée."));
  output.addEventListener("input", () => setParts(splitAnalyzerPrompt(output.value)));
  target.addEventListener("change", () => { configuration.sendTarget = target.value; onDirty(); });
  modelSelect.addEventListener("change", async () => { configuration.model = modelSelect.value; onDirty(); settings = await api("/api/v1/image-analyzer/settings", { method: "PUT", body: JSON.stringify({ model: modelSelect.value }) }); syncKeyStatus(); });
  sendButton.addEventListener("click", () => { const prompt = output.value.trim(); if (!prompt) return toast("Aucun prompt à envoyer.", true); onSendTarget(target.value, prompt, analysisParts); });

  syncImage(); loadSettings().catch((error) => toast(error.message, true));
}
