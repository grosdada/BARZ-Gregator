const isAggregator = !document.title.includes("Prompt Atlas");
const endpoints = isAggregator
  ? { preferences: "/api/preferences", status: "/api/atlas-ai/status", advisor: "/api/atlas-ai/advisor" }
  : { preferences: "/api/v1/preferences", status: "/api/v1/ai/status", advisor: "/api/v1/ai/advisor" };

const state = {
  models: [], images: [], preferences: null, busy: false,
  lastQuestion: "", lastAnswer: "", lastBlockingScene: null
};
const providerNames = { openai: "OpenAI", anthropic: "Anthropic", deepseek: "DeepSeek", google: "Google Gemini" };

function language() { return document.documentElement.dataset.language === "fr" ? "fr" : "en"; }
function t(en, fr) { return language() === "fr" ? fr : en; }

function modelIntentLabel(label = "") {
  if (language() === "fr") return label;
  const translations = new Map([
    ["Puissant", "Powerful"],
    ["Equilibre", "Balanced"],
    ["Economique", "Economical"],
    ["Creatif", "Creative"],
    ["Redaction premium", "Premium writing"],
    ["Rapide", "Fast"],
    ["Stable", "Stable"]
  ]);
  const legacy = label.endsWith(" (ancien)");
  const base = legacy ? label.slice(0, -9) : label;
  const translated = translations.get(base) || base;
  return legacy ? `${translated} (legacy)` : translated;
}

function editablePromptIn(scope) {
  if (!scope) return null;
  const active = scope.nodeType === Node.DOCUMENT_NODE
    ? scope.activeElement
    : scope.contains(document.activeElement) ? document.activeElement : null;
  if (active && !active.matches?.("[data-ai-prompt]") && (
    active.matches?.("textarea:not([readonly]):not([disabled])") ||
    active.matches?.("input[type='text']:not([readonly]):not([disabled])") ||
    active.matches?.("[contenteditable='true']")
  )) return active;
  const selectors = [
    "textarea[name*='prompt' i]:not([readonly]):not([disabled])",
    "textarea[id*='prompt' i]:not([readonly]):not([disabled])",
    "textarea[class*='prompt' i]:not([readonly]):not([disabled])",
    "textarea[name*='scene' i]:not([readonly]):not([disabled])",
    "textarea[name*='story' i]:not([readonly]):not([disabled])",
    "textarea:not([readonly]):not([disabled])",
    "[contenteditable='true']"
  ];
  return selectors.flatMap((selector) => [...scope.querySelectorAll(selector)])
    .find((candidate) => !candidate.matches?.("[data-ai-prompt]") && candidate.getClientRects().length) || null;
}

function activePromptTarget() {
  const host = document.querySelector("#runtime-tool-host") || document.querySelector("#composer");
  const direct = editablePromptIn(host);
  if (direct) return direct;
  for (const frame of host?.querySelectorAll("iframe") || []) {
    try {
      const target = editablePromptIn(frame.contentDocument);
      if (target) return target;
    } catch {}
  }
  return null;
}

function writePrompt(target, prompt) {
  if (!target) return false;
  if (target.matches?.("[contenteditable='true']")) target.textContent = prompt;
  else target.value = prompt;
  const TargetEvent = target.ownerDocument?.defaultView?.Event || Event;
  target.dispatchEvent(new TargetEvent("input", { bubbles: true }));
  target.dispatchEvent(new TargetEvent("change", { bubbles: true }));
  target.focus();
  return true;
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  const field = document.createElement("textarea");
  field.value = value; field.style.position = "fixed"; field.style.opacity = "0";
  document.body.append(field); field.select(); document.execCommand("copy"); field.remove();
}

async function api(url, options) {
  const response = await fetch(url, options);
  const value = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(value.error?.message || value.error || `HTTP ${response.status}`);
  return value;
}

function createUi() {
  if (document.querySelector(".global-ai-dock")) return null;
  const dock = document.createElement("section");
  dock.className = "global-ai-dock";
  dock.classList.toggle("is-aggregator", isAggregator);
  dock.setAttribute("aria-label", "Global AI controls");
  dock.innerHTML = `
    <div class="global-ai-selectors">
      <details class="global-ai-picker" data-ai-picker>
        <summary>
          <span data-ai-copy="model">AI model</span>
          <strong data-ai-current-model>Choose model</strong>
        </summary>
        <div class="global-ai-picker-menu">
          <label><span data-ai-copy="provider">AI provider</span><select data-ai-provider aria-label="AI provider"></select></label>
          <label data-ai-model-field><span data-ai-copy="model">AI model</span><select data-ai-model aria-label="AI model"></select></label>
        </div>
      </details>
      <button type="button" class="global-ai-advisor-toggle" data-ai-advisor-toggle aria-expanded="false">Barz Advisor</button>
      ${isAggregator ? '<button type="button" class="global-ai-update-toggle" data-ai-update-toggle aria-expanded="false" title="Check for updates">MAJ</button>' : ""}
    </div>
    ${isAggregator ? `<div class="global-ai-update-panel" data-ai-update-panel hidden>
      <header><strong data-ai-update-title>Mise à jour BARZ</strong><button type="button" data-ai-update-close aria-label="Close">×</button></header>
      <p data-ai-update-message role="status"></p>
      <progress data-ai-update-progress max="100" value="0" hidden></progress>
      <button type="button" data-ai-update-install hidden></button>
      <a data-ai-update-release href="https://github.com/grosdada/BARZ-Gregator/releases/latest" target="_blank" rel="noopener noreferrer" hidden></a>
    </div>` : ""}
    <div class="global-ai-advisor" data-ai-advisor hidden>
      <div class="global-ai-advisor-title"><b>BARZ ADVISOR</b><span data-ai-copy="askline">Tell me what you want to build.</span></div>
      <div class="global-ai-question">
        <textarea data-ai-prompt rows="3" placeholder="Ask about a prompt, a scene, a model, or drop images here..."></textarea>
        <div class="global-ai-images" data-ai-images role="button" tabindex="0" aria-label="Drop or choose images"><span>＋ IMG</span></div>
      </div>
      <div class="global-ai-actions">
        <button type="button" class="is-primary" data-ai-ask>Ask Barz</button>
        <button type="button" data-ai-clear>Clear</button>
        <button type="button" data-ai-close aria-label="Close">×</button>
      </div>
      <input data-ai-file type="file" accept="image/*" multiple hidden>
      <div class="global-ai-answer" data-ai-answer hidden></div>
    </div>
    <dialog class="global-ai-iteration-dialog" data-ai-iteration-dialog>
      <form method="dialog">
        <header><div><b data-ai-copy="iterationTitle">AI iteration</b><span data-ai-copy="iterationHint">Add an instruction, or leave empty to let Atlas improvise.</span></div><button value="cancel" aria-label="Close">×</button></header>
        <textarea data-ai-iteration-instruction rows="5" placeholder="Optional direction for the next version..."></textarea>
        <p data-ai-iteration-message role="status"></p>
        <footer><button value="cancel" data-ai-copy="iterationCancel">Cancel</button><button type="button" class="is-primary" data-ai-iterate>Iterate</button></footer>
      </form>
    </dialog>`;
  document.body.append(dock);
  return dock;
}

function updateCopy(root) {
  const values = {
    provider: t("AI provider", "Fournisseur IA"), model: t("AI model", "Modèle IA"),
    askline: t("Tell me what you want to build.", "Dis-moi ce que tu veux construire."),
    iterationTitle: t("AI iteration", "Itération IA"),
    iterationHint: t("Add an instruction, or leave empty to let Atlas improvise.", "Ajoute une instruction, ou laisse vide pour laisser Atlas improviser."),
    iterationCancel: t("Cancel", "Annuler")
  };
  root.querySelectorAll("[data-ai-copy]").forEach((node) => { node.textContent = values[node.dataset.aiCopy]; });
  root.querySelector("[data-ai-prompt]").placeholder = t(
    "Ask about a prompt, a scene, a model, or drop images here...",
    "Pose une question sur un prompt, une scène, un modèle, ou dépose des images ici…"
  );
  root.querySelector("[data-ai-ask]").textContent = t("Ask Barz", "Interroger Barz");
  const updateTitle = root.querySelector("[data-ai-update-title]");
  if (updateTitle) updateTitle.textContent = t("BARZ update", "Mise à jour BARZ");
  root.querySelector("[data-ai-clear]").textContent = t("Clear", "Effacer");
  root.querySelector("[data-ai-iteration-instruction]").placeholder = t(
    "Optional direction for the next version...", "Instruction facultative pour la prochaine version…"
  );
  root.querySelector("[data-ai-iterate]").textContent = t("Iterate", "Itérer");
}

function renderImages(root) {
  const zone = root.querySelector("[data-ai-images]");
  zone.replaceChildren();
  if (!state.images.length) {
    const hint = document.createElement("span");
    hint.textContent = "＋ IMG";
    zone.append(hint);
    return;
  }
  state.images.forEach((source, index) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "global-ai-image";
    item.title = t("Remove image", "Retirer l’image");
    item.innerHTML = `<img alt="Reference ${index + 1}"><span>×</span>`;
    item.querySelector("img").src = source;
    item.addEventListener("click", (event) => { event.stopPropagation(); state.images.splice(index, 1); renderImages(root); });
    zone.append(item);
  });
}

async function addFiles(root, files) {
  const accepted = [...files].filter((file) => file.type.startsWith("image/")).slice(0, 4 - state.images.length);
  for (const file of accepted) {
    if (file.size > 12 * 1024 * 1024) continue;
    const source = await new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file);
    });
    state.images.push(source);
  }
  renderImages(root);
}

function renderModels(root) {
  const provider = root.querySelector("[data-ai-provider]");
  const model = root.querySelector("[data-ai-model]");
  const providers = [...new Set(state.models.map((entry) => entry.provider))];
  provider.replaceChildren(...providers.map((id) => new Option(providerNames[id] || id, id)));
  const selectedProvider = providers.includes(state.preferences?.aiProvider) ? state.preferences.aiProvider : (state.models.find((item) => item.id === state.preferences?.aiModel)?.provider || providers[0]);
  provider.value = selectedProvider || "openai";
  const candidates = state.models.filter((entry) => entry.provider === provider.value);
  model.replaceChildren(...candidates.map((entry) => new Option(
    `${entry.name}${entry.label ? ` (${modelIntentLabel(entry.label)})` : ""}`,
    entry.id
  )));
  model.value = candidates.some((entry) => entry.id === state.preferences?.aiModel) ? state.preferences.aiModel : (candidates[0]?.id || "");
  const currentModel = root.querySelector("[data-ai-current-model]");
  currentModel.textContent = candidates.find((entry) => entry.id === model.value)?.name || t("Choose model", "Choisir un modèle");
  currentModel.title = currentModel.textContent;
  root.querySelector("[data-ai-model-field]").hidden = !candidates.length;
}

async function saveSelection(root) {
  const provider = root.querySelector("[data-ai-provider]").value;
  const model = root.querySelector("[data-ai-model]").value;
  state.preferences = await api(endpoints.preferences, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aiProvider: provider, aiModel: model })
  });
  window.dispatchEvent(new CustomEvent("barz:aimodelchange", { detail: { provider, model } }));
}

async function refreshPreferences(root) {
  const next = await api(endpoints.preferences, { cache: "no-store" });
  if (state.preferences?.updatedAt === next.updatedAt) return;
  state.preferences = next;
  renderModels(root);
}

function copyReadyPrompt(answer) {
  const lines = String(answer || "").replace(/\r\n?/g, "\n").split("\n");
  const promptHeading = /^\s*(?:#{1,6}\s*)?(?:\*\*)?\s*(?:(?:final|image|video)\s+)?prompt(?:\s+final)?\s*[:：-]?\s*(?:\*\*)?\s*$/i;
  const inlineHeading = /^\s*\*\*\s*(?:(?:final|image|video)\s+)?prompt(?:\s+final)?\s*(?:\*\*)?\s*[:：-]\s*(?:\*\*)?\s*(.+)$/i;
  const start = lines.findIndex((line) => promptHeading.test(line) || inlineHeading.test(line));
  const body = start < 0 ? lines : [inlineHeading.exec(lines[start])?.[1] || "", ...lines.slice(start + 1)];
  const nextSection = /^\s*(?:\*\*[^*]{2,80}\*\*|#{1,6}\s+\S+)/;
  const advisorNote = /^\s*(?:settings?|risks?|notes?|remarks?|recommendations?|negative prompt|parameters?|r[eé]glages?|risques?|remarques?|conseils?)\s*[:：]/i;
  const end = body.findIndex((line) => nextSection.test(line) || advisorNote.test(line));
  return (end < 0 ? body : body.slice(0, end)).join("\n").trim();
}

function renderAdvisorAnswer(root, value) {
  const answer = root.querySelector("[data-ai-answer]");
  const responseText = value.answer || "";
  state.lastAnswer = responseText;
  state.lastBlockingScene = value.blockingScene && typeof value.blockingScene === "object"
    ? value.blockingScene : null;
  answer.classList.remove("is-error");
  answer.hidden = false;

  const response = document.createElement("div");
  response.className = "global-ai-answer-text";
  response.textContent = responseText;
  const actions = document.createElement("div");
  actions.className = "global-ai-answer-actions";

  const copy = document.createElement("button");
  copy.type = "button"; copy.textContent = t("Copy", "Copier");
  copy.addEventListener("click", async () => {
    await copyText(responseText);
    copy.textContent = t("Copied", "Copié");
    setTimeout(() => { copy.textContent = t("Copy", "Copier"); }, 1400);
  });

  const send = document.createElement("button");
  send.type = "button"; send.className = "is-primary";
  send.textContent = t("Send to prompt", "Envoyer au prompt");
  send.title = state.lastBlockingScene
    ? t("Build in Blocking Studio", "Construire dans Blocking Studio")
    : t("Send this answer to the active prompt", "Envoyer cette réponse au prompt actif");
  send.addEventListener("click", () => {
    const blockingActive = document.querySelector(".runtime-tool-tab.is-active")?.textContent
      ?.toLowerCase().includes("blocking");
    const prompt = copyReadyPrompt(responseText);
    const sent = state.lastBlockingScene && blockingActive
      ? (window.dispatchEvent(new CustomEvent("barz:load-blocking-scene", {
        detail: { plan: state.lastBlockingScene }
      })), true)
      : Boolean(prompt) && writePrompt(activePromptTarget(), prompt);
    send.textContent = sent ? t("Sent", "Envoyé") : t("No active prompt", "Aucun prompt actif");
    setTimeout(() => { send.textContent = t("Send to prompt", "Envoyer au prompt"); }, 1800);
  });

  const iterate = document.createElement("button");
  iterate.type = "button";
  iterate.textContent = t("AI iteration", "Itération IA");
  iterate.addEventListener("click", () => {
    const dialog = root.querySelector("[data-ai-iteration-dialog]");
    root.querySelector("[data-ai-iteration-instruction]").value = "";
    root.querySelector("[data-ai-iteration-message]").textContent = "";
    dialog.showModal();
    root.querySelector("[data-ai-iteration-instruction]").focus();
  });

  actions.append(copy, send, iterate);
  answer.replaceChildren(response, actions);
  answer.dataset.model = value.model || "";
}

async function iterateAnswer(root) {
  if (state.busy || !state.lastAnswer) return;
  const instruction = root.querySelector("[data-ai-iteration-instruction]").value.trim();
  const dialog = root.querySelector("[data-ai-iteration-dialog]");
  const answer = root.querySelector("[data-ai-answer]");
  const iterateButton = root.querySelector("[data-ai-iterate]");
  const request = [
    "Create a revised iteration of your immediately preceding answer.",
    `Original user request:\n${state.lastQuestion}`,
    `Previous answer:\n${state.lastAnswer}`,
    instruction
      ? `User iteration instruction:\n${instruction}`
      : "No extra instruction was supplied. Improvise a strong, meaningfully improved alternative.",
    "Return the revised deliverable directly, without discussing the revision process."
  ].join("\n\n");
  state.busy = true;
  iterateButton.disabled = true;
  iterateButton.textContent = t("Thinking…", "Réflexion…");
  answer.hidden = false;
  answer.textContent = t("Atlas is creating another iteration…", "Atlas crée une nouvelle itération…");
  dialog.close();
  try {
    const value = await api(endpoints.advisor, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: request,
        images: state.images,
        model: root.querySelector("[data-ai-model]").value,
        contextTool: document.querySelector(".runtime-tool-tab.is-active")?.textContent?.trim() || ""
      })
    });
    renderAdvisorAnswer(root, value);
  } catch (error) {
    answer.textContent = error.message;
    answer.classList.add("is-error");
  } finally {
    state.busy = false;
    iterateButton.disabled = false;
    iterateButton.textContent = t("Iterate", "Itérer");
  }
}

async function ask(root) {
  if (state.busy) return;
  const prompt = root.querySelector("[data-ai-prompt]").value.trim();
  if (!prompt && !state.images.length) return;
  const answer = root.querySelector("[data-ai-answer]");
  const button = root.querySelector("[data-ai-ask]");
  state.busy = true; button.disabled = true; button.textContent = t("Thinking…", "Réflexion…");
  answer.hidden = false; answer.textContent = t("Atlas is examining the request…", "Atlas examine la demande…");
  try {
    const value = await api(endpoints.advisor, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        images: state.images,
        model: root.querySelector("[data-ai-model]").value,
        contextTool: document.querySelector(".runtime-tool-tab.is-active")?.textContent?.trim() || ""
      })
    });
    state.lastQuestion = prompt;
    renderAdvisorAnswer(root, value);
  } catch (error) { answer.textContent = error.message; answer.classList.add("is-error"); }
  finally { state.busy = false; button.disabled = false; button.textContent = t("Ask Barz", "Interroger Barz"); }
}

function initUpdater(root, closeAdvisor) {
  const toggle = root.querySelector("[data-ai-update-toggle]");
  if (!toggle) return;
  const panel = root.querySelector("[data-ai-update-panel]");
  const message = root.querySelector("[data-ai-update-message]");
  const progress = root.querySelector("[data-ai-update-progress]");
  const install = root.querySelector("[data-ai-update-install]");
  const release = root.querySelector("[data-ai-update-release]");
  let update = null;
  let launchedVersion = null;
  let checking = false;

  const setOpen = (open) => {
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    root.classList.toggle("is-update-open", open);
    if (open) closeAdvisor();
  };
  const render = (value) => {
    update = value;
    const phase = value.progress?.phase;
    progress.hidden = phase !== "downloading";
    if (!progress.hidden) progress.value = value.progress.totalBytes
      ? Math.min(100, Math.round(100 * value.progress.downloadedBytes / value.progress.totalBytes)) : 0;
    install.hidden = true;
    release.hidden = true;
    release.href = value.releaseUrl;
    release.textContent = t("View releases", "Voir les versions");
    if (phase === "downloading") {
      message.textContent = t(`Downloading ${value.progress.version}: ${progress.value}%`, `Téléchargement ${value.progress.version} : ${progress.value} %`);
    } else if (phase === "installing") {
      message.textContent = t("Installing and restarting BARZ…", "Installation et redémarrage de BARZ…");
    } else if (phase === "failed") {
      message.textContent = value.progress.error || t("The update failed.", "La mise à jour a échoué.");
      release.hidden = false;
      if (value.updateAvailable && value.installed) {
        install.textContent = t("Try again", "Réessayer");
        install.hidden = false;
        install.disabled = false;
      }
    } else if (launchedVersion && value.currentVersion === launchedVersion) {
      window.location.reload();
    } else if (value.checkError) {
      message.textContent = value.checkError;
      release.hidden = false;
    } else if (!value.updateAvailable) {
      message.textContent = t(`BARZ ${value.currentVersion} is up to date.`, `BARZ ${value.currentVersion} est à jour.`);
    } else if (!value.installed) {
      message.textContent = value.platform === "win32"
        ? t(`Version ${value.latestVersion} available. Automatic update requires the installed app.`, `Version ${value.latestVersion} disponible. La mise à jour automatique nécessite l’application installée.`)
        : t("Automatic updating is not yet available on this system.", "La mise à jour automatique n’est pas encore disponible sur ce système.");
      release.hidden = false;
    } else {
      message.textContent = t(`Version ${value.latestVersion} is available (installed: ${value.currentVersion}).`, `Version ${value.latestVersion} disponible (installée : ${value.currentVersion}).`);
      install.textContent = t(`Install ${value.latestVersion}`, `Installer ${value.latestVersion}`);
      install.hidden = false;
    }
  };
  const refresh = async (check = false) => {
    if (checking) return;
    checking = true;
    try {
      render(await api(`/api/update/status${check ? "?check=1" : ""}`));
    } catch (error) {
      message.textContent = launchedVersion
        ? t("Restarting BARZ…", "Redémarrage de BARZ…") : error.message;
    } finally { checking = false; }
  };
  toggle.addEventListener("click", () => {
    const open = panel.hidden;
    setOpen(open);
    if (open) {
      message.textContent = t("Checking for updates…", "Recherche des mises à jour…");
      void refresh(true);
    }
  });
  root.querySelector("[data-ai-update-close]").addEventListener("click", () => setOpen(false));
  install.addEventListener("click", async () => {
    if (!update?.updateAvailable || !update.installed) return;
    install.disabled = true;
    message.textContent = t("Starting update…", "Démarrage de la mise à jour…");
    try {
      await api("/api/update/start", {
        method: "POST", headers: { "Content-Type": "application/json", "X-Barz-Update-Token": update.token }, body: "{}"
      });
      launchedVersion = update.latestVersion;
      await refresh();
    } catch (error) { message.textContent = error.message; install.disabled = false; }
  });
  panel.addEventListener("keydown", (event) => { if (event.key === "Escape") setOpen(false); });
  window.addEventListener("barz:languagechange", () => { if (update) render(update); });
  setInterval(() => { if (!panel.hidden && (launchedVersion || update?.progress?.phase === "downloading")) void refresh(); }, 1200);
}

async function start() {
  const root = createUi(); if (!root) return;
  updateCopy(root);
  const provider = root.querySelector("[data-ai-provider]");
  const model = root.querySelector("[data-ai-model]");
  const picker = root.querySelector("[data-ai-picker]");
  const panel = root.querySelector("[data-ai-advisor]");
  const toggle = root.querySelector("[data-ai-advisor-toggle]");
  const file = root.querySelector("[data-ai-file]");
  const zone = root.querySelector("[data-ai-images]");
  const show = (visible) => {
    panel.hidden = !visible;
    root.classList.toggle("is-open", visible);
    toggle.setAttribute("aria-expanded", String(visible));
  };
  initUpdater(root, () => show(false));
  toggle.addEventListener("click", () => {
    const updatePanel = root.querySelector("[data-ai-update-panel]");
    if (updatePanel && !updatePanel.hidden) root.querySelector("[data-ai-update-close]").click();
    show(panel.hidden);
  });
  root.querySelector("[data-ai-close]").addEventListener("click", () => show(false));
  provider.addEventListener("change", async () => { state.preferences.aiProvider = provider.value; renderModels(root); await saveSelection(root); });
  model.addEventListener("change", async () => { await saveSelection(root); picker.open = false; });
  document.addEventListener("pointerdown", (event) => { if (!picker.contains(event.target)) picker.open = false; });
  picker.addEventListener("keydown", (event) => { if (event.key === "Escape") picker.open = false; });
  zone.addEventListener("click", () => file.click());
  zone.addEventListener("keydown", (event) => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); file.click(); } });
  file.addEventListener("change", () => addFiles(root, file.files));
  for (const name of ["dragenter", "dragover"]) zone.addEventListener(name, (event) => { event.preventDefault(); zone.classList.add("is-over"); });
  for (const name of ["dragleave", "drop"]) zone.addEventListener(name, (event) => { event.preventDefault(); zone.classList.remove("is-over"); });
  zone.addEventListener("drop", (event) => addFiles(root, event.dataTransfer.files));
  root.querySelector("[data-ai-ask]").addEventListener("click", () => ask(root));
  root.querySelector("[data-ai-iterate]").addEventListener("click", () => iterateAnswer(root));
  root.querySelector("[data-ai-prompt]").addEventListener("keydown", (event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") ask(root); });
  root.querySelector("[data-ai-iteration-instruction]").addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") iterateAnswer(root);
  });
  root.querySelector("[data-ai-clear]").addEventListener("click", () => {
    root.querySelector("[data-ai-prompt]").value = ""; state.images = []; renderImages(root);
    state.lastQuestion = ""; state.lastAnswer = ""; state.lastBlockingScene = null;
    const answer = root.querySelector("[data-ai-answer]"); answer.hidden = true; answer.textContent = ""; answer.classList.remove("is-error");
  });
  try {
    const [status, preferences] = await Promise.all([api(endpoints.status), api(endpoints.preferences)]);
    state.models = status.models || []; state.preferences = preferences; renderModels(root);
  } catch (error) { root.classList.add("is-offline"); toggle.title = error.message; }
  window.addEventListener("barz:languagechange", () => {
    updateCopy(root);
    renderModels(root);
  });
  setInterval(() => refreshPreferences(root).catch(() => {}), 1500);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
