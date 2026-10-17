import {
  APPEND_CAPTURE_DNA_PATTERN,
  BUILTIN_CAPTURE_PRESETS,
  CAPTURE_DNA_CATALOG,
  EMPTY_CAPTURE_DNA,
  appendCaptureDna,
  buildCaptureDnaSuffix,
  createCaptureDnaPreset,
  normalizeCaptureDna,
  removeCaptureDna
} from "/capture-dna-catalog.js";

const STORAGE_KEY = "barz-capture-dna-v1";
const promptField = document.querySelector(".prompt-field");
const promptInput = document.querySelector("#promptInput");

if (!promptField || !promptInput) throw new Error("Capture DNA: compositeur introuvable.");

promptField.insertAdjacentHTML("afterend", `
  <section class="capture-dna" id="captureDnaPanel" aria-labelledby="captureDnaTitle">
    <header class="capture-dna-head">
      <div>
        <strong id="captureDnaTitle">Capture DNA</strong>
        <span>Chaîne optique · photo et vidéo</span>
      </div>
      <div class="capture-dna-head-actions">
        <button class="capture-dna-quiet" id="captureDnaReset" type="button">Réinitialiser</button>
        <button class="capture-dna-save" id="captureDnaSave" type="button">Enregistrer le preset</button>
      </div>
    </header>
    <label class="capture-dna-preset">
      <span>Preset complet</span>
      <select id="captureDnaPreset"><option value="">Assemblage libre</option></select>
    </label>
    <div class="capture-dna-chain" aria-label="Chaîne de capture">
      <label><span>Caméra</span><select id="captureDnaCamera"></select></label>
      <span class="capture-dna-joint" aria-hidden="true">›</span>
      <label><span>Lentille</span><select id="captureDnaLens"></select></label>
      <span class="capture-dna-joint" aria-hidden="true">›</span>
      <label><span>Film / support</span><select id="captureDnaFilm"></select></label>
      <span class="capture-dna-joint" aria-hidden="true">›</span>
      <label><span>Lumière</span><select id="captureDnaLighting"></select></label>
    </div>
    <div class="capture-dna-output">
      <p id="captureDnaPreview">Choisis un preset ou compose ta chaîne de capture.</p>
      <div>
        <span id="captureDnaStatus" role="status"></span>
        <button class="secondary-button" id="captureDnaAppend" type="button">Ajouter au prompt</button>
      </div>
    </div>
  </section>
`);

document.body.insertAdjacentHTML("beforeend", `
  <dialog class="dialog compact-dialog capture-dna-dialog" id="captureDnaDialog">
    <form method="dialog" class="dialog-shell" id="captureDnaForm">
      <div class="dialog-heading">
        <div><p>Preset personnel</p><h2>Mémoriser cette chaîne</h2></div>
        <button class="icon-button" value="cancel" aria-label="Fermer">×</button>
      </div>
      <label class="field"><span>Nom</span>
        <input id="captureDnaPresetName" type="text" maxlength="60" autocomplete="off" placeholder="Ex. Clip VHS saturé">
      </label>
      <label class="field"><span>Signature complémentaire · facultatif</span>
        <textarea id="captureDnaPresetFinish" rows="4" maxlength="1200" placeholder="Décris les artefacts, l’époque, le mouvement ou le format à préserver…"></textarea>
      </label>
      <p class="provider-message" id="captureDnaDialogMessage" role="alert"></p>
      <div class="dialog-actions capture-dna-dialog-actions">
        <button class="plain-button hidden" id="captureDnaDelete" type="button">Supprimer</button>
        <button class="plain-button" value="cancel">Annuler</button>
        <button class="secondary-button" id="captureDnaConfirmSave" type="button">Enregistrer</button>
      </div>
    </form>
  </dialog>
`);

const $ = (selector) => document.querySelector(selector);
const ui = {
  panel: $("#captureDnaPanel"), preset: $("#captureDnaPreset"), camera: $("#captureDnaCamera"),
  lens: $("#captureDnaLens"), film: $("#captureDnaFilm"), lighting: $("#captureDnaLighting"),
  preview: $("#captureDnaPreview"), status: $("#captureDnaStatus"), append: $("#captureDnaAppend"),
  reset: $("#captureDnaReset"), save: $("#captureDnaSave"), dialog: $("#captureDnaDialog"),
  name: $("#captureDnaPresetName"), finish: $("#captureDnaPresetFinish"),
  message: $("#captureDnaDialogMessage"), confirm: $("#captureDnaConfirmSave"),
  delete: $("#captureDnaDelete")
};

function safeStoredState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const customPresets = Array.isArray(parsed.customPresets) ? parsed.customPresets.slice(0, 100)
      .filter((item) => item && typeof item.label === "string" && typeof item.id === "string")
      .map((item) => ({ ...normalizeCaptureDna(item), id: item.id.slice(0, 180), label: item.label.slice(0, 60), custom: true })) : [];
    return {
      selections: {
        video: normalizeCaptureDna(parsed.selections?.video),
        image: normalizeCaptureDna(parsed.selections?.image)
      },
      customPresets
    };
  } catch {
    return { selections: { video: { ...EMPTY_CAPTURE_DNA }, image: { ...EMPTY_CAPTURE_DNA } }, customPresets: [] };
  }
}

const dnaState = safeStoredState();
const activeMedia = () => document.querySelector("[data-media].active")?.dataset.media || "video";
const current = () => dnaState.selections[activeMedia()] || { ...EMPTY_CAPTURE_DNA };
const allPresets = () => [...BUILTIN_CAPTURE_PRESETS, ...dnaState.customPresets];

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dnaState));
}

window.barzCaptureDnaPrompt = (prompt, mediaType = activeMedia()) => {
  if (mediaType === "music") return String(prompt || "");
  const selection = dnaState.selections[mediaType === "image" ? "image" : "video"];
  return appendCaptureDna(prompt, selection);
};

function addOptions(select, kind, emptyLabel) {
  select.replaceChildren(new Option(emptyLabel, ""));
  const byFamily = new Map();
  CAPTURE_DNA_CATALOG[kind].forEach((item) => {
    if (!byFamily.has(item.family)) byFamily.set(item.family, []);
    byFamily.get(item.family).push(item);
  });
  for (const [family, items] of byFamily) {
    const group = document.createElement("optgroup");
    group.label = family;
    items.forEach((item) => group.append(new Option(item.label, item.id)));
    select.append(group);
  }
}

function renderPresetOptions() {
  ui.preset.replaceChildren(new Option("Assemblage libre", ""));
  const builtins = document.createElement("optgroup");
  builtins.label = "Presets BARZ";
  BUILTIN_CAPTURE_PRESETS.forEach((item) => builtins.append(new Option(item.label, item.id)));
  ui.preset.append(builtins);
  if (dnaState.customPresets.length) {
    const custom = document.createElement("optgroup");
    custom.label = "Mes presets";
    dnaState.customPresets.forEach((item) => custom.append(new Option(item.label, item.id)));
    ui.preset.append(custom);
  }
}

function render() {
  const media = activeMedia();
  ui.panel.classList.toggle("hidden", media === "music");
  if (media === "music") return;
  const value = current();
  renderPresetOptions();
  ui.preset.value = value.presetId || "";
  ui.camera.value = value.camera;
  ui.lens.value = value.lens;
  ui.film.value = value.film;
  ui.lighting.value = value.lighting;
  const suffix = buildCaptureDnaSuffix(value);
  ui.preview.textContent = suffix || "Choisis un preset ou compose ta chaîne de capture.";
  ui.preview.classList.toggle("empty", !suffix);
  ui.append.disabled = !suffix;
  ui.append.textContent = APPEND_CAPTURE_DNA_PATTERN.test(promptInput.value)
    ? "Mettre à jour le texte" : "Afficher dans le prompt";
  ui.status.textContent = suffix ? "Actif pour la génération" : "";
}

function updatePart(key, value) {
  Object.assign(current(), { [key]: value, presetId: "" });
  persist();
  render();
}

function applyPreset(id) {
  if (!id) {
    current().presetId = "";
  } else {
    const selected = allPresets().find((item) => item.id === id);
    if (selected) Object.assign(current(), normalizeCaptureDna(selected), { presetId: id });
  }
  persist();
  render();
}

function openSaveDialog() {
  const selected = dnaState.customPresets.find((item) => item.id === current().presetId);
  ui.name.value = selected?.label || "";
  ui.finish.value = current().finish || "";
  ui.message.textContent = "";
  ui.delete.classList.toggle("hidden", !selected);
  ui.delete.textContent = "Supprimer";
  delete ui.delete.dataset.confirming;
  ui.dialog.showModal();
  ui.name.focus();
}

function saveCustomPreset() {
  try {
    const selected = dnaState.customPresets.find((item) => item.id === current().presetId);
    const selection = { ...current(), finish: ui.finish.value, presetId: "" };
    const saved = createCaptureDnaPreset({ id: selected?.id, name: ui.name.value, selection });
    dnaState.customPresets = [saved, ...dnaState.customPresets.filter((item) =>
      item.id !== saved.id && item.label.toLowerCase() !== saved.label.toLowerCase())];
    Object.assign(current(), normalizeCaptureDna(saved), { presetId: saved.id });
    persist();
    ui.dialog.close();
    render();
    ui.status.textContent = `Preset « ${saved.label} » enregistré.`;
  } catch (error) {
    ui.message.textContent = error.message;
  }
}

function deleteCustomPreset() {
  if (!ui.delete.dataset.confirming) {
    ui.delete.dataset.confirming = "true";
    ui.delete.textContent = "Confirmer la suppression";
    setTimeout(() => { delete ui.delete.dataset.confirming; ui.delete.textContent = "Supprimer"; }, 4000);
    return;
  }
  const id = current().presetId;
  dnaState.customPresets = dnaState.customPresets.filter((item) => item.id !== id);
  Object.assign(current(), { ...EMPTY_CAPTURE_DNA });
  persist();
  ui.dialog.close();
  render();
}

addOptions(ui.camera, "cameras", "Aucune caméra");
addOptions(ui.lens, "lenses", "Aucune lentille");
addOptions(ui.film, "films", "Aucun film / support");
addOptions(ui.lighting, "lighting", "Aucune lumière");

ui.preset.addEventListener("change", () => applyPreset(ui.preset.value));
[[ui.camera, "camera"], [ui.lens, "lens"], [ui.film, "film"], [ui.lighting, "lighting"]]
  .forEach(([select, key]) => select.addEventListener("change", () => updatePart(key, select.value)));
ui.reset.addEventListener("click", () => {
  Object.assign(current(), { ...EMPTY_CAPTURE_DNA });
  promptInput.value = removeCaptureDna(promptInput.value);
  promptInput.dispatchEvent(new Event("input", { bubbles: true }));
  persist();
  render();
  ui.status.textContent = "Capture DNA retiré du prompt.";
});
ui.append.addEventListener("click", () => {
  promptInput.value = appendCaptureDna(promptInput.value, current());
  promptInput.dispatchEvent(new Event("input", { bubbles: true }));
  promptInput.focus();
  promptInput.setSelectionRange(promptInput.value.length, promptInput.value.length);
  render();
});
ui.save.addEventListener("click", openSaveDialog);
ui.confirm.addEventListener("click", saveCustomPreset);
ui.delete.addEventListener("click", deleteCustomPreset);
ui.name.addEventListener("keydown", (event) => {
  if (event.key === "Enter") { event.preventDefault(); saveCustomPreset(); }
});
promptInput.addEventListener("input", render);
document.addEventListener("click", (event) => {
  if (event.target.closest("[data-media]")) setTimeout(render);
});
new MutationObserver(render).observe(document.querySelector("#mediaContext"), { childList: true });
render();
