import { mountImageSlicer } from "./image-slicer.js";
import { mountPaintStudio } from "./paint-studio.js";
import { mountImageGrabber } from "./image-grabber.js";
import { mountImageAnalyzer } from "./image-analyzer.js";
import { mountVideoDirector } from "./video-director.js";
import { mountVideoEditor } from "./video-editor.js";
import { mountMotionEmulator } from "./motion-emulator.js";
import { mountBlockingStudio } from "./blocking-studio.js";
import { mountObjectScaleChart } from "./object-scale-chart-tool.js";
import { mountYoutubeExtractor } from "./youtube-extractor.js";
import { mountAngleRelightingStudio } from "./angle-relighting-studio.js";
import { mountWorkflow3d } from "./workflow-3d.js";
import { mountApgStudio } from "./apg-studio.js";
import { openSuiteApp } from "./suite-bridge.js";

const BUILTIN_PRESET_LABELS = {
  ugc: "UGC naturel",
  documentary: "Documentaire",
  found: "Found footage",
  dashcam: "Dashcam",
  vlog: "Vlog",
  news: "Reportage TV",
  cinematic: "Cinéma à l’épaule",
  musicvideo: "Clip musical",
  orbit: "Orbite contrôlée",
  stopmotion: "Stop motion"
};

const CAMERA_LABELS = {
  device: "Caméra",
  handDrift: "Dérive de la main",
  driftFreq: "Fréquence de dérive",
  microShake: "Micro-tremblement",
  afBreathing: "Respiration autofocus",
  aeShift: "Variation d’exposition",
  gazeBreaks: "Ruptures brèves du regard",
  reframing: "Recadrages subtils",
  zoomHunting: "Recherche du zoom",
  whipPan: "Whip pans spontanés",
  freeRoam: "Caméra en mouvement libre",
  orbit: "Orbite autour du sujet",
  orbitSpeed: "Vitesse d’orbite",
  orbitDirection: "Direction d’orbite",
  stopMotionVib: "Vibration stop motion"
};

const HUMAN_LABELS = {
  activityLevel: "Activité du sujet",
  breathSway: "Balancement respiratoire",
  weightShift: "Changement d’appui",
  blinkRate: "Fréquence de clignement",
  gripAdjust: "Micro-ajustements de prise",
  postureShift: "Corrections de posture",
  fidget: "Agitation naturelle",
  handGesture: "Gestes des mains",
  microExpressions: "Micro-expressions",
  eyeDart: "Micro-mouvements des yeux",
  lipMovement: "Micro-mouvements des lèvres",
  swallow: "Déglutition occasionnelle",
  naturalPause: "Pauses naturelles",
  breathBetween: "Respirations entre les phrases",
  umFiller: "Hésitations « um / uh »",
  headNod: "Hochements de tête"
};

const CONSTRAINT_LABELS = {
  noMorphing: "Pas de déformation du visage",
  consistentFingers: "Cinq doigts cohérents",
  noFlicker: "Pas de scintillement de texture",
  stableClothing: "Vêtements et accessoires stables",
  naturalMotion: "Mouvement physiquement plausible",
  consistentLighting: "Direction lumineuse cohérente",
  noTextWarp: "Textes et logos sans déformation",
  stableBackground: "Arrière-plan stable",
  naturalHair: "Mouvement naturel des cheveux",
  eyeContact: "Direction du regard cohérente"
};

const SECTION_LABELS = {
  enhancement: "Amélioration",
  "z-depth": "Profondeur",
  "normal-map": "Normales",
  "global-illumination": "Lumière indirecte"
};

export async function uploadSeedanceReferences(references, uploader) {
  if (typeof uploader !== "function") throw new TypeError("A reference uploader is required.");
  return Promise.all([...references]
    .sort((left, right) => left.slot - right.slot)
    .map(async (reference, index) => {
      const uploaded = await uploader({ src: reference.dataUrl, name: reference.sourceName });
      return {
        ...uploaded,
        label: `@image${index + 1}${reference.sourceName ? ` · ${reference.sourceName}` : ""}${reference.slot !== index + 1 ? ` · VMF @image${reference.slot}` : ""}`
      };
    }));
}

export function remapSeedancePromptForAggregator(prompt, references) {
  const slotToOrdinal = new Map([...references]
    .sort((left, right) => left.slot - right.slot)
    .map((reference, index) => [reference.slot, index + 1]));
  return normalizeImageReferences(prompt).replace(/@image(\d+)/gi, (token, rawSlot) => {
    const ordinal = slotToOrdinal.get(Number(rawSlot));
    return ordinal ? `@image${ordinal}` : token.toLowerCase();
  });
}

function node(tag, className, text) {
  const result = document.createElement(tag);
  if (className) result.className = className;
  if (text !== undefined) result.textContent = text;
  return result;
}

function button(text, className = "") {
  const result = node("button", className, text);
  result.type = "button";
  return result;
}

function paletteControl({ label, colors, selected, onSelect }) {
  const group = node("div", "cyclo-palette");
  const heading = node("div", "cyclo-palette-heading");
  const selection = node("span", "cyclo-palette-selection");
  heading.append(node("b", "", label), selection);
  const grid = node("div", "cyclo-palette-grid");
  grid.setAttribute("role", "radiogroup");
  grid.setAttribute("aria-label", label);
  const swatches = [];

  const applySelection = (color) => {
    for (const { control, value } of swatches) {
      const active = value.id === color.id && value.name === color.name && value.hex === color.hex;
      control.classList.toggle("is-active", active);
      control.setAttribute("aria-checked", String(active));
    }
    selection.textContent = `${color.name} · ${color.hex}`;
  };

  for (const color of colors) {
    const swatch = button("", "cyclo-swatch");
    swatch.style.setProperty("--cyclo-color", color.hex);
    swatch.setAttribute("role", "radio");
    swatch.setAttribute("aria-label", `${color.name} ${color.hex}`);
    swatch.title = `${color.name} · ${color.hex}`;
    swatches.push({ control: swatch, value: color });
    swatch.addEventListener("click", () => {
      applySelection(color);
      onSelect(color);
    });
    grid.append(swatch);
  }

  const initial = colors.find(selected) ?? colors[0];
  if (initial) applySelection(initial);
  group.append(heading, grid);
  return group;
}

function clone(value) {
  return structuredClone(value);
}

function normalizeImageReferences(value) {
  return String(value ?? "")
    .replace(/\[\s*(?:IMG|Image)[_\s-]*(\d+)\s*\]/gi, "@image$1")
    .replace(/@(?:IMG|Image)[_\s-]*(\d+)/gi, "@image$1");
}

function appendPromptText(container, value) {
  const text = normalizeImageReferences(value);
  const parts = text.split(/(@image\d+)/gi);
  container.replaceChildren(...parts.filter(Boolean).map((part) =>
    /^@image\d+$/i.test(part) ? node("span", "reference-token", part.toLowerCase()) : document.createTextNode(part)
  ));
}

function modalName({ title, description, initial = "", action = "Enregistrer" }) {
  return new Promise((resolve) => {
    const dialog = node("dialog", "runtime-dialog");
    const form = node("form", "dialog-form");
    form.method = "dialog";
    const head = node("div", "dialog-head");
    const close = button("×");
    close.setAttribute("aria-label", "Fermer");
    close.addEventListener("click", () => dialog.close());
    head.append(node("h2", "", title), close);
    const help = node("p", "", description);
    const label = node("label", "", "Nom");
    const input = document.createElement("input");
    input.maxLength = 120;
    input.required = true;
    input.value = initial;
    label.append(input);
    const actions = node("div", "dialog-actions");
    const cancel = button("Annuler");
    cancel.addEventListener("click", () => dialog.close());
    const submit = button(action, "primary");
    submit.type = "submit";
    actions.append(cancel, submit);
    form.append(head, help, label, actions);
    dialog.append(form);
    document.body.append(dialog);
    dialog.addEventListener("close", () => {
      const value = dialog.returnValue === "saved" ? input.value.trim() : null;
      dialog.remove();
      resolve(value);
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!input.reportValidity()) return;
      dialog.close("saved");
    });
    dialog.showModal();
    input.focus();
    input.select();
  });
}

function downloadJson(name, value) {
  const href = URL.createObjectURL(new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = href;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(href), 0);
}

export function createToolWorkspace({ api, toast, getWorkspace, toolsForWorkshop, activeSetupId, toolStateChanged, registryChanged, navigateToWorkshop }) {
  const internal = {
    catalog: null,
    workshopId: null,
    toolId: null,
    configuration: null,
    toolRevision: 0,
    dirty: false,
    saveTimer: null,
    saveChain: Promise.resolve(),
    compileTimer: null,
    presetSelection: "",
    output: "",
    outputMediaType: "text",
    goodiesPayload: null,
    libraryPayload: null,
    librarySearchScope: "category",
    registryRevision: 0,
    seedanceMediaEpoch: 0,
    paintIncoming: null,
    enhancerReference: null,
    enhancerStudioDispose: null
  };
  const picker = document.getElementById("runtime-tool-picker");
  const host = document.getElementById("runtime-tool-host");

  window.addEventListener("message", (event) => {
    const message = event.data;
    if (event.origin !== window.location.origin || event.source !== window) return;
    if (!message || message.type !== "prompt-atlas:send-prompt" || typeof message.prompt !== "string" || message.prompt.length > 100_000) return;
    if (message.target === "camera-suite" && internal.toolId === "veo-suite") {
      internal.configuration.incoming = {
        text: message.prompt,
        source: typeof message.source === "string" ? message.source.slice(0, 200) : ""
      };
      markDirty();
      renderCameraSuite().catch((error) => toast(error.message, true));
      toast("Prompt reçu dans Camera Control.");
    }
    if (message.target === "cccp" && internal.toolId === "cccp") {
      if (internal.configuration.scene !== message.prompt) internal.configuration.iterationTake = 0;
      internal.configuration.scene = message.prompt;
      markDirty();
      renderCcp().catch((error) => toast(error.message, true));
      toast("Scène reçue dans CCP · Étape B.");
    }
  });

  async function ensureCatalog() {
    internal.catalog ??= await api("/api/v1/tool-catalog");
  }

  async function armAiButton(control, readyLabel) {
    try {
      const status = await api("/api/v1/ai/status");
      control.disabled = !status.available;
      control.textContent = status.available ? readyLabel : "IA non configurée";
      control.title = status.available
        ? `Utilise le modèle ${status.model} et les clés du coffre API commun.`
        : "Ajoute une clé OpenAI, Anthropic, Gemini ou DeepSeek dans l’onglet API de la suite.";
      return status;
    } catch (error) {
      control.disabled = true;
      control.textContent = "IA indisponible";
      control.title = error.message;
      return null;
    }
  }

  function runtimeTools() {
    return toolsForWorkshop(internal.workshopId).filter(({ kind }) => kind === "builtin");
  }

  function renderPicker() {
    picker.replaceChildren();
    for (const tool of runtimeTools()) {
      const item = button(tool.title, "runtime-tool-tab");
      item.classList.toggle("is-active", tool.id === internal.toolId);
      item.addEventListener("click", async () => {
        try { await openTool(tool.id); } catch (error) { toast(error.message, true); }
      });
      picker.append(item);
    }
  }

  async function loadConfiguration(toolId) {
    const query = new URLSearchParams({ setupId: activeSetupId() });
    const payload = await api(`/api/v1/tools/${toolId}/configuration?${query}`);
    internal.configuration = payload.configuration;
    internal.toolRevision = payload.toolRevision;
    internal.registryRevision = payload.registryRevision ?? getWorkspace().registry.revision;
    toolStateChanged?.(payload.toolRevision);
    internal.dirty = false;
  }

  function saveStatus(text, state = "") {
    const target = document.getElementById("tool-save-status");
    if (!target) return;
    target.textContent = text;
    target.dataset.state = state;
  }

  function markDirty() {
    internal.dirty = true;
    saveStatus("Modifications en attente", "dirty");
    clearTimeout(internal.saveTimer);
    internal.saveTimer = setTimeout(() => { saveNow().catch(() => {}); }, 450);
  }

  async function saveNow() {
    clearTimeout(internal.saveTimer);
    if (!internal.dirty || !internal.toolId) return internal.saveChain;
    const toolId = internal.toolId;
    const setupId = activeSetupId();
    const configuration = clone(internal.configuration);
    internal.dirty = false;
    const operation = internal.saveChain.catch(() => {}).then(async () => {
      saveStatus("Enregistrement…");
      try {
        const payload = await api(`/api/v1/tools/${toolId}/configuration`, {
          method: "PUT",
          preserveOnConflict: true,
          body: JSON.stringify({
            expectedSetupId: setupId,
            expectedToolRevision: internal.toolRevision,
            expectedRegistryRevision: internal.registryRevision,
            configuration
          })
        });
        if (toolId === internal.toolId && setupId === activeSetupId()) internal.toolRevision = payload.toolRevision;
        toolStateChanged?.(payload.toolRevision);
        saveStatus("Enregistré dans le setup", "saved");
      } catch (error) {
        internal.dirty = true;
        saveStatus("Échec de l’enregistrement", "error");
        toast(error.message, true);
        throw error;
      }
    });
    internal.saveChain = operation;
    return operation;
  }

  async function compile(options = {}) {
    if (!internal.toolId || !internal.configuration) return null;
    return api(`/api/v1/tools/${internal.toolId}/compile`, {
      method: "POST",
      body: JSON.stringify({ configuration: internal.configuration, ...options })
    });
  }

  async function copyText(text, success = "Prompt copié.") {
    if (!text) return toast("Le prompt est vide.", true);
    try {
      await navigator.clipboard.writeText(text);
      toast(success);
    } catch {
      toast("Le navigateur n’a pas autorisé la copie.", true);
    }
  }

  async function sendToAggregator(prompt, moduleName, mediaType, settings = {}, target = {}, resultLinkElement, negativePrompt = "", references = []) {
    if (!prompt?.trim()) return toast("Le prompt est vide.", true);
    try {
      const response = await fetch("http://127.0.0.1:4317/api/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaVersion: "1.0",
          source: { app: "prompt-atlas", version: "6.0.0", module: moduleName },
          mediaType,
          prompt: normalizeImageReferences(prompt),
          negativePrompt: normalizeImageReferences(negativePrompt),
          target,
          settings,
          references,
          createdAt: new Date().toISOString()
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.draft?.id) throw new Error(payload.error || `Agrégateur indisponible (HTTP ${response.status}).`);
      const url = `http://127.0.0.1:4317/?draft=${encodeURIComponent(payload.draft.id)}`;
      const link = resultLinkElement ?? document.getElementById("aggregator-result-link");
      if (link) {
        link.href = url;
        link.hidden = false;
      }
      openSuiteApp("aggregator", url);
      toast("Brouillon envoyé à l’agrégateur. Aucune génération lancée.");
      return url;
    } catch (error) {
      toast(`Envoi impossible : ${error.message}`, true);
      return null;
    }
  }

  function imageDataUrlToBlob(dataUrl) {
    const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,([a-z0-9+/=\s]+)$/i.exec(String(dataUrl || ""));
    if (!match) throw new Error("L’image de référence est invalide.");
    const binary = atob(match[2].replace(/\s/g, ""));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type: match[1].toLowerCase() });
  }

  async function uploadImageReference(image) {
    if (!image?.src?.startsWith("data:image/")) throw new Error("L’image de référence est invalide.");
    const blob = imageDataUrlToBlob(image.src);
    const extension = blob.type === "image/jpeg" ? "jpg" : blob.type.split("/")[1] || "png";
    const filename = `${String(image.name || "reference").replace(/[^a-z0-9_-]+/gi, "-") || "reference"}.${extension}`;
    const resourceResponse = await fetch("http://127.0.0.1:4317/api/resources", {
      method: "POST",
      headers: { "Content-Type": blob.type || "image/png", "X-Barz-Filename": encodeURIComponent(filename) },
      body: blob
    });
    const resourcePayload = await resourceResponse.json().catch(() => ({}));
    if (!resourceResponse.ok || !resourcePayload.resource?.id) {
      throw new Error(resourcePayload.error || `Import impossible (HTTP ${resourceResponse.status}).`);
    }
    const resource = resourcePayload.resource;
    return {
      kind: "image",
      id: `resource:${resource.id}`,
      label: resource.name || image.name || "@image1",
      url: `/api/resources/${resource.id}/content`
    };
  }

  async function sendEnhancerStudioToAggregator() {
    if (!internal.enhancerReference) return toast("Importe d’abord l’image qui deviendra @image1.", true);
    try {
      const reference = await uploadImageReference(internal.enhancerReference);
      const isAngle = internal.configuration.mode === "angles";
      const camera = internal.configuration.angleStudio;
      // fal uses front=0, right=90, back=180, left=270, like the studio
      // after wrapping its signed azimuth. Zoom is a framing heuristic, not metres.
      const angleSettings = isAngle ? {
        horizontalAngle: Number((((camera.azimuth % 360) + 360) % 360).toFixed(2)),
        verticalAngle: Number(Math.max(-30, Math.min(90, camera.elevation)).toFixed(2)),
        cameraZoom: Math.round(Math.max(0, Math.min(10,
          5 + 5 * Math.log2((camera.focalLength / 50) * (4.5 / camera.distance))
        )) * 100) / 100,
        angleStrength: 1,
        numImages: 1
      } : {};
      const anglePrompt = [
        "Use @image1 as the visual reference. Show the same subject and scene from the camera viewpoint specified by the angle controls.",
        "Keep the subject identity, pose, proportions, clothing, materials, lighting and scene contents. Reconstruct newly visible surfaces and change the background perspective with the camera. Do not simply crop, mirror or rotate the original image.",
        internal.configuration.subject?.trim() ? `Scene note: ${internal.configuration.subject.trim()}` : ""
      ].filter(Boolean).join("\n\n");
      await sendToAggregator(
        isAngle ? anglePrompt : internal.output,
        internal.configuration.mode === "relighting" ? "BZ Enhancer · Relighting" : "BZ Enhancer · Angle",
        "image",
        angleSettings,
        isAngle ? { provider: "fal", endpointId: "fal-ai/qwen-image-edit-2511-multiple-angles" } : {},
        undefined,
        "",
        [reference]
      );
    } catch (error) {
      toast(`Envoi impossible : ${error.message}`, true);
    }
  }

  async function sendImageToAggregatorReferences(image) {
    if (!image?.src?.startsWith("data:image/")) return toast("L’image à envoyer est invalide.", true);
    try {
      const reference = await uploadImageReference(image);
      const response = await fetch("http://127.0.0.1:4317/api/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaVersion: "1.0",
          source: { app: "prompt-atlas", version: "6.0.0", module: "Image Grabber" },
          mediaType: "image",
          prompt: "Use @image1 as the visual reference.",
          negativePrompt: "",
          target: {},
          settings: {},
          references: [reference],
          createdAt: new Date().toISOString()
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.draft?.id) throw new Error(payload.error || `Agrégateur indisponible (HTTP ${response.status}).`);
      openSuiteApp("aggregator", `http://127.0.0.1:4317/?draft=${encodeURIComponent(payload.draft.id)}`);
      toast("Image ajoutée aux Assets et aux références de BZ Aggregator.");
    } catch (error) {
      toast(`Envoi impossible : ${error.message}`, true);
    }
  }

  function readImageFile(file) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) return reject(new Error(`${file.name} n’est pas une image.`));
      const reader = new FileReader();
      reader.onerror = () => reject(new Error(`Lecture impossible : ${file.name}.`));
      reader.onload = () => {
        const dataUrl = String(reader.result ?? "");
        if (dataUrl.length > 10_000_000) reject(new Error(`${file.name} dépasse la limite locale de 10 Mo encodés.`));
        else resolve(dataUrl);
      };
      reader.readAsDataURL(file);
    });
  }

  function chooseSeedanceFiles(files, capacity) {
    const ordered = [...files].sort((left, right) => {
      const a = left.webkitRelativePath || left.name;
      const b = right.webkitRelativePath || right.name;
      return a < b ? -1 : a > b ? 1 : 0;
    });
    return new Promise((resolve) => {
      const dialog = node("dialog", "runtime-dialog seedance-file-dialog");
      const form = node("form", "dialog-form");
      form.method = "dialog";
      const head = node("div", "dialog-head");
      const close = button("×");
      close.setAttribute("aria-label", "Fermer");
      close.addEventListener("click", () => dialog.close());
      head.append(node("h2", "", "Choisir les références"), close);
      const help = node("p", "", `${ordered.length} image(s), triées par chemin. Sélectionne au plus ${capacity}.`);
      const list = node("div", "seedance-file-list");
      const checks = ordered.map((file, index) => {
        const label = node("label", "toggle-field");
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = index < capacity;
        label.append(input, node("span", "check-mark", "✓"), node("span", "", file.webkitRelativePath || file.name));
        list.append(label);
        return { file, input };
      });
      const error = node("small", "ccp-inline-error");
      const actions = node("div", "dialog-actions");
      const cancel = button("Annuler");
      cancel.addEventListener("click", () => dialog.close());
      const submit = button("Importer", "primary");
      submit.type = "submit";
      actions.append(cancel, submit);
      form.append(head, help, list, error, actions);
      dialog.append(form);
      document.body.append(dialog);
      dialog.addEventListener("close", () => {
        const selected = dialog.returnValue === "selected" ? checks.filter(({ input }) => input.checked).map(({ file }) => file) : [];
        dialog.remove();
        resolve(selected);
      });
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const count = checks.filter(({ input }) => input.checked).length;
        if (!count || count > capacity) {
          error.textContent = `Choisis entre 1 et ${capacity} image(s).`;
          return;
        }
        dialog.close("selected");
      });
      dialog.showModal();
    });
  }

  function toolHeader(title, description) {
    const head = node("header", "runtime-head");
    const copy = node("div", "runtime-title-copy");
    const titleRow = node("div", "runtime-title-row");
    const titleElement = node("h2", "", title);
    const deckButton = button("D", "tool-deck-button signal");
    deckButton.setAttribute("aria-label", `Ajouter ${title} au Deck`);
    const syncDeckButton = () => {
      const placement = getWorkspace().registry.placements.find(({ toolId, targetId }) => toolId === internal.toolId && targetId === "deck");
      const active = Boolean(placement);
      deckButton.classList.toggle("is-active", active);
      deckButton.setAttribute("aria-pressed", String(active));
      deckButton.title = active ? "Retirer cette mini-app du Deck" : "Ajouter cette mini-app au Deck";
      deckButton.dataset.tooltip = active ? "Décrocher l’app du Deck" : "Ajouter l’app au Deck";
      deckButton.setAttribute("aria-label", active ? `Retirer ${title} du Deck` : `Ajouter ${title} au Deck`);
      deckButton.dataset.placementId = placement?.id ?? "";
    };
    syncDeckButton();
    deckButton.addEventListener("click", async () => {
      if (!internal.toolId || deckButton.disabled) return;
      deckButton.disabled = true;
      try {
        const workspace = getWorkspace();
        const placementId = deckButton.dataset.placementId;
        const payload = placementId
          ? await api(`/api/v1/placements/${encodeURIComponent(placementId)}`, {
              method: "DELETE",
              body: JSON.stringify({ expectedSetupId: activeSetupId(), expectedRevision: workspace.registry.revision })
            })
          : await api("/api/v1/placements", {
              method: "POST",
              body: JSON.stringify({
                expectedSetupId: activeSetupId(),
                expectedRevision: workspace.registry.revision,
                placement: {
                  id: `deck-${internal.toolId.slice(0, 54)}-${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`,
                  toolId: internal.toolId,
                  targetId: "deck",
                  order: toolsForWorkshop("deck").length
                }
              })
            });
        registryChanged?.(payload);
        toast(placementId ? "Mini-app retirée du Deck." : "Mini-app ajoutée au Deck.");
      } catch (error) {
        toast(error.message, true);
        syncDeckButton();
      } finally {
        deckButton.disabled = false;
      }
    });
    titleRow.append(titleElement, deckButton);
    copy.append(titleRow);
    const status = node("span", "tool-save-status", "Enregistré dans le setup");
    status.id = "tool-save-status";
    status.dataset.state = "saved";
    head.append(copy, status);
    return head;
  }

  function actionBar({ copy, send, append } = {}) {
    const actions = node("div", "runtime-actions");
    const copyButton = button("Copier", "quiet-button");
    copyButton.addEventListener("click", copy);
    const sendButton = button("Envoyer à l’agrégateur", "primary-action");
    sendButton.addEventListener("click", send);
    actions.append(copyButton);
    if (append) {
      const appendButton = button("Ajouter au prompt principal", "quiet-button");
      appendButton.addEventListener("click", append);
      actions.append(appendButton);
    }
    actions.append(sendButton);
    const link = node("a", "aggregator-result-link", "Ouvrir le brouillon ↗");
    link.id = "aggregator-result-link";
    link.target = "barz-aggregator";
    link.hidden = true;
    actions.append(link);
    return actions;
  }

  function renderEnhancerOutput(payload, container) {
    container.replaceChildren();
    internal.output = normalizeImageReferences(payload.copyAll || payload.outputs?.[0]?.prompt || "");
    internal.outputMediaType = payload.outputs?.[0]?.mediaType ?? "image";
    if (!payload.outputs?.length) {
      container.append(node("p", "runtime-empty", "Choisis au moins un angle pour créer les blocs."));
      return;
    }
    for (const output of payload.outputs) {
      const block = node("article", "prompt-block");
      const prompt = node("pre");
      appendPromptText(prompt, output.prompt);
      block.append(node("b", "", output.label), prompt);
      container.append(block);
    }
  }

  async function renderEnhancer(mode = "cards", title = "BZ Enhancer") {
    internal.enhancerStudioDispose?.();
    internal.enhancerStudioDispose = null;
    if (internal.configuration.mode !== mode) {
      internal.configuration.mode = mode;
      markDirty();
    }
    internal.configuration.angleStudio ??= clone(internal.catalog.enhancer.defaults.angleStudio);
    internal.configuration.relightingLights ??= clone(internal.catalog.enhancer.defaults.relightingLights);
    const description = mode === "angles"
      ? "Envoi par défaut vers Qwen Multiple Angles : azimut et élévation transmis à fal, zoom approximé depuis distance/focale. Élévation limitée à −30° côté fal. Capture DNA automatique ignoré pour préserver la référence."
      : mode === "relighting"
        ? "Compose un rig lumière 3D autour de @image1 sans modifier la géométrie de la scène."
        : "Améliore une référence à partir des 20 recettes relues.";
    host.replaceChildren(toolHeader(title, description));
    const body = node("div", mode === "cards" ? "runtime-grid enhancer-grid" : "enhancer-spatial-layout");
    const controls = node("section", mode === "cards" ? "runtime-controls" : "enhancer-spatial-controls");
    const outputPanel = node("section", `runtime-output${mode === "cards" ? "" : " spatial-output"}`);
    const output = node("div", "prompt-output-list");
    outputPanel.append(node("h3", "", "Prompt prêt"), output);
    if (mode === "angles") outputPanel.append(node("p", "runtime-note",
      "Send to Aggregator → Qwen Multiple Angles. The copied text is a generic prompt; fal receives a preservation prompt plus numeric angle controls. Front 0° · right 90° · back 180° · left 270°. Elevation is limited to −30°…90°; distance/focal length become approximate zoom. Automatic Capture DNA is ignored for this model."));

    if (mode === "cards") {
      const grouped = internal.catalog.enhancer.cards.reduce((result, card) => {
        (result[card.section] ??= []).push(card);
        return result;
      }, {});
      for (const [section, cards] of Object.entries(grouped)) {
        controls.append(node("h3", "catalog-section-title", SECTION_LABELS[section] ?? section));
        const list = node("div", "catalog-list");
        cards.forEach((card) => {
          const item = button("", "catalog-card");
          item.classList.toggle("is-selected", card.id === internal.configuration.selectedCardId);
          item.append(node("b", "", card.title), node("span", "", card.description));
          item.addEventListener("click", () => {
            internal.configuration.selectedCardId = card.id;
            markDirty();
            renderEnhancer(mode, title);
          });
          list.append(item);
        });
        controls.append(list);
      }
      outputPanel.append(node("p", "runtime-note", "Les trois corrections grammaticales validées sont appliquées. Le texte créatif reste inchangé."));
    } else {
      if (mode === "angles" && internal.configuration.selectedAngleIds.length) {
        internal.configuration.selectedAngleIds = [];
        markDirty();
      }
      const subjectLabel = node("label", "", "Sujet ou référence");
      const subject = document.createElement("textarea");
      subject.rows = 2;
      subject.placeholder = mode === "relighting"
        ? "Note optionnelle sur l’ambiance ou le résultat lumineux…"
        : "Note optionnelle sur le sujet ou le cadrage…";
      subject.value = internal.configuration.subject;
      subject.addEventListener("input", () => {
        internal.configuration.subject = subject.value;
        markDirty();
        scheduleEnhancerCompile(output);
      });
      subjectLabel.append(subject);
      controls.append(subjectLabel);
      const studioHost = node("div", "enhancer-studio-host");
      controls.append(studioHost);
      internal.enhancerStudioDispose = mountAngleRelightingStudio({
        container: studioHost,
        mode,
        cameraState: internal.configuration.angleStudio,
        lightsState: internal.configuration.relightingLights,
        image: internal.enhancerReference,
        onImageChange: (image) => {
          internal.enhancerReference = image;
          toast("Image prête : elle sera envoyée comme @image1.");
        },
        onCameraChange: (state) => {
          internal.configuration.angleStudio = state;
          markDirty();
          scheduleEnhancerCompile(output);
        },
        onLightsChange: (lights) => {
          internal.configuration.relightingLights = lights;
          markDirty();
          scheduleEnhancerCompile(output);
        },
        onError: (message) => toast(message, true)
      });
    }
    body.append(controls, outputPanel);
    host.append(body);
    const payload = await compile();
    renderEnhancerOutput(payload, output);
    host.append(actionBar({
      copy: () => copyText(internal.output),
      send: () => mode === "cards"
        ? sendToAggregator(internal.output, "BZ Enhancer", "image")
        : sendEnhancerStudioToAggregator()
    }));
    const reset = button("Rétablir les réglages intégrés", "reset-tool-button");
    reset.addEventListener("click", () => {
      internal.configuration = clone(internal.catalog.enhancer.defaults);
      internal.configuration.mode = mode;
      markDirty();
      renderEnhancer(mode, title);
      toast(`Réglages ${title} restaurés.`);
    });
    host.append(reset);
  }

  function scheduleEnhancerCompile(container) {
    clearTimeout(internal.compileTimer);
    internal.compileTimer = setTimeout(async () => renderEnhancerOutput(await compile(), container), 100);
  }

  function libraryEntries() {
    return internal.libraryPayload?.library.entries ?? [];
  }

  function visibleLibraryEntries() {
    const query = internal.configuration.searchQuery.trim().toLocaleLowerCase();
    const scoped = !query || internal.librarySearchScope === "category"
      ? libraryEntries().filter(({ categoryId }) => categoryId === internal.configuration.activeCategory)
      : libraryEntries();
    if (!query) return scoped;
    return scoped.filter((entry) =>
      `${entry.categoryId} ${entry.recipe.title} ${entry.description} ${entry.recipe.outputs[0].template}`.toLocaleLowerCase().includes(query)
    );
  }

  function librarySection(categoryId) {
    return internal.toolId === "acting-gen" ? categoryId.split("-")[0] : null;
  }

  async function compileLibrary(entryId = internal.configuration.selectedEntryId, scene) {
    const configuredScene = scene !== undefined
      ? scene
      : Object.hasOwn(internal.configuration.detailsByPrompt, entryId)
        ? internal.configuration.detailsByPrompt[entryId]
        : undefined;
    return api(`/api/v1/libraries/${internal.toolId}/compile`, {
      method: "POST",
      body: JSON.stringify({
        expectedSetupId: activeSetupId(),
        expectedRevision: internal.registryRevision,
        entryId,
        ...(configuredScene !== undefined ? { scene: configuredScene } : {})
      })
    });
  }

  async function compileMany(entries) {
    const outputs = await Promise.all(entries.map((entry) => compileLibrary(entry.id, "")));
    return outputs.map((payload) => payload.outputs[0].prompt).join("\n\n");
  }

  function renderLibraryOutput(payload, preview, meta) {
    internal.goodiesPayload = payload;
    internal.output = payload.outputs?.[0]?.prompt ?? "";
    internal.outputMediaType = payload.outputs?.[0]?.mediaType ?? "image";
    preview.textContent = internal.output;
    const selected = libraryEntries().find(({ id }) => id === internal.configuration.selectedEntryId);
    const category = internal.libraryPayload.library.categories.find(({ id }) => id === selected?.categoryId);
    meta.textContent = selected ? `${category?.title ?? selected.categoryId} · ${selected.recipe.title}` : "Prompt sélectionné";
  }

  function scheduleLibraryCompile(preview, meta) {
    clearTimeout(internal.compileTimer);
    internal.compileTimer = setTimeout(async () => renderLibraryOutput(await compileLibrary(), preview, meta), 90);
  }

  async function renderPromptLibrary() {
    const query = new URLSearchParams({ setupId: activeSetupId() });
    internal.libraryPayload = await api(`/api/v1/libraries/${internal.toolId}?${query}`);
    internal.registryRevision = internal.libraryPayload.registryRevision;
    const library = internal.libraryPayload.library;
    const tool = getWorkspace().registry.tools.find(({ id }) => id === internal.toolId);
    const initial = libraryEntries()[0] ?? null;
    if (!libraryEntries().some(({ id }) => id === internal.configuration.selectedEntryId)) {
      internal.configuration.selectedEntryId = initial?.id ?? null;
      internal.configuration.activeCategory = initial?.categoryId ?? library.categories[0]?.id ?? null;
    }
    const supportsScene = libraryEntries().some((entry) => entry.recipe.fields.some(({ id }) => id === "scene"));
    host.replaceChildren(toolHeader(tool?.title ?? library.title, supportsScene
      ? `${libraryEntries().length} directions prêtes à compléter, copier ou envoyer à l’agrégateur.`
      : `${libraryEntries().length} prompts vidéo relus, prêts à copier ou envoyer à l’agrégateur.`));
    if (!initial) {
      host.append(node("div", "runtime-empty-panel", "Cette bibliothèque est vide. Ajoute sa première carte depuis Build."));
      return;
    }

    const toolbar = node("div", "goodies-toolbar");
    if (internal.toolId === "acting-gen") {
      const sectionLabels = { action: "ACTION", emotion: "EMOTION", sfx: "VFX", dance: "DANCE" };
      const sectionBar = node("nav", "acting-sections");
      sectionBar.setAttribute("aria-label", "Familles Acting Gen");
      const activeSection = librarySection(internal.configuration.activeCategory);
      for (const [sectionId, sectionTitle] of Object.entries(sectionLabels)) {
        const sectionEntries = libraryEntries().filter(({ categoryId }) => librarySection(categoryId) === sectionId);
        const control = button("", "acting-section");
        control.classList.toggle("is-active", sectionId === activeSection);
        control.append(node("span", "", sectionTitle), node("b", "", String(sectionEntries.length)));
        control.addEventListener("click", () => {
          const firstCategory = library.categories.find(({ id }) => librarySection(id) === sectionId);
          const firstEntry = sectionEntries.find(({ categoryId }) => categoryId === firstCategory?.id);
          if (firstCategory) internal.configuration.activeCategory = firstCategory.id;
          if (firstEntry) internal.configuration.selectedEntryId = firstEntry.id;
          markDirty();
          renderPromptLibrary();
        });
        sectionBar.append(control);
      }
      toolbar.append(sectionBar);
    }
    const categories = node("nav", "goodies-categories");
    categories.setAttribute("aria-label", `Catégories de ${library.title}`);
    const activeSection = librarySection(internal.configuration.activeCategory);
    library.categories.filter((category) => !activeSection || librarySection(category.id) === activeSection).forEach((category) => {
      const control = button("", "goodies-category");
      control.classList.toggle("is-active", category.id === internal.configuration.activeCategory);
      control.append(node("span", "", category.title), node("b", "", String(libraryEntries().filter(({ categoryId }) => categoryId === category.id).length)));
      control.addEventListener("click", () => {
        internal.configuration.activeCategory = category.id;
        const first = libraryEntries().find(({ categoryId }) => categoryId === category.id);
        if (first) internal.configuration.selectedEntryId = first.id;
        markDirty();
        renderPromptLibrary();
      });
      categories.append(control);
    });
    const searchRow = node("div", "goodies-search");
    const search = document.createElement("input");
    search.type = "search";
    search.placeholder = `Rechercher dans ${library.title}…`;
    search.setAttribute("aria-label", `Rechercher dans ${library.title}`);
    search.maxLength = 500;
    search.value = internal.configuration.searchQuery;
    search.addEventListener("input", () => {
      internal.configuration.searchQuery = search.value;
      markDirty();
      const entries = visibleLibraryEntries();
      if (entries.length && !entries.some(({ id }) => id === internal.configuration.selectedEntryId)) {
        internal.configuration.selectedEntryId = entries[0].id;
        internal.configuration.activeCategory = entries[0].categoryId;
      }
      renderPromptLibrary();
      requestAnimationFrame(() => {
        const next = host.querySelector(".goodies-search input");
        if (next) {
          next.focus();
          next.setSelectionRange(search.selectionStart ?? next.value.length, search.selectionEnd ?? next.value.length);
        }
      });
    });
    const clear = button("Effacer", "text-button");
    clear.disabled = !internal.configuration.searchQuery;
    clear.addEventListener("click", () => {
      internal.configuration.searchQuery = "";
      markDirty();
      renderPromptLibrary();
    });
    const scope = document.createElement("select");
    scope.setAttribute("aria-label", "Portée de la recherche");
    [["category", "Catégorie active"], ["all", "Toute la bibliothèque"]].forEach(([value, label]) => {
      const option = node("option", "", label);
      option.value = value;
      scope.append(option);
    });
    scope.value = internal.librarySearchScope;
    scope.addEventListener("change", () => {
      internal.librarySearchScope = scope.value;
      const entries = visibleLibraryEntries();
      if (entries.length && !entries.some(({ id }) => id === internal.configuration.selectedEntryId)) {
        internal.configuration.selectedEntryId = entries[0].id;
        internal.configuration.activeCategory = entries[0].categoryId;
      }
      renderPromptLibrary();
    });
    searchRow.append(search, scope, clear);
    toolbar.append(categories, searchRow);
    host.append(toolbar);

    const body = node("div", "goodies-layout");
    const catalog = node("section", "goodies-catalog");
    const entries = visibleLibraryEntries();
    const activeCategory = library.categories.find(({ id }) => id === internal.configuration.activeCategory);
    const count = node("p", "goodies-result-count", internal.configuration.searchQuery
      ? `${entries.length} résultat${entries.length === 1 ? "" : "s"} dans ${internal.librarySearchScope === "all" ? "toute la bibliothèque" : activeCategory?.title ?? "la catégorie active"}`
      : `${entries.length} prompt${entries.length === 1 ? "" : "s"} dans ${activeCategory?.title ?? "cette catégorie"}`);
    const list = node("div", "goodies-list");
    for (const entry of entries) {
      const item = button("", "goodies-card");
      item.classList.toggle("is-selected", entry.id === internal.configuration.selectedEntryId);
      const copy = node("span", "goodies-card-copy");
      copy.append(node("b", "", entry.recipe.title), node("span", "", entry.description || "Direction personnalisée"));
      const category = library.categories.find(({ id }) => id === entry.categoryId);
      item.append(node("i", "", category?.title ?? entry.categoryId), copy);
      item.addEventListener("click", () => {
        internal.configuration.selectedEntryId = entry.id;
        internal.configuration.activeCategory = entry.categoryId;
        markDirty();
        renderPromptLibrary();
      });
      list.append(item);
    }
    catalog.append(count, list);
    if (!entries.length) catalog.append(node("p", "runtime-empty", "Aucun prompt ne correspond à cette recherche."));

    const outputPanel = node("section", "runtime-output goodies-output");
    const selected = libraryEntries().find(({ id }) => id === internal.configuration.selectedEntryId) ?? initial;
    const meta = node("span", "goodies-output-meta");
    const head = node("div", "goodies-output-head");
    head.append(node("h3", "", "Prompt prêt"), meta);
    const detailLabel = node("label", "goodies-detail", "Détails du sujet, du produit ou de la scène");
    const detail = document.createElement("textarea");
    detail.rows = 5;
    detail.maxLength = 4_000;
    detail.placeholder = "Ex. une chanteuse sur scène, veste rouge, public dans la pénombre…";
    detail.value = internal.configuration.detailsByPrompt[selected.id] ?? "";
    const detailCount = node("span", "goodies-detail-count", `${detail.value.length} / 4 000`);
    detail.addEventListener("input", () => {
      if (detail.value) internal.configuration.detailsByPrompt[selected.id] = detail.value;
      else delete internal.configuration.detailsByPrompt[selected.id];
      detailCount.textContent = `${detail.value.length} / 4 000`;
      markDirty();
      scheduleLibraryCompile(preview, meta);
    });
    detailLabel.append(detail, detailCount);
    const preview = node("pre", "goodies-preview");
    outputPanel.append(head);
    if (selected.recipe.fields.some(({ id }) => id === "scene")) outputPanel.append(detailLabel);
    outputPanel.append(preview, node("p", "runtime-note", supportsScene
      ? "Les détails restent attachés à chaque carte dans le setup actif."
      : "Le texte relu reste littéral. Les personnalisations se font depuis Build et restent attachées au setup."));
    body.append(catalog, outputPanel);
    host.append(body);
    renderLibraryOutput(await compileLibrary(), preview, meta);

    const actions = node("div", "runtime-actions goodies-actions");
    const current = button("Copier", "quiet-button");
    current.addEventListener("click", async () => copyText((await compileLibrary()).outputs[0].prompt));
    const categoryTitle = library.categories.find(({ id }) => id === selected.categoryId)?.title ?? selected.categoryId;
    const categoryCopy = button(`Copier ${categoryTitle}${supportsScene ? " sans détails" : ""}`, "quiet-button");
    categoryCopy.addEventListener("click", async () => {
      await copyText(await compileMany(libraryEntries().filter(({ categoryId }) => categoryId === selected.categoryId)), "Catégorie copiée sans détails.");
    });
    const all = button(`Tout copier${supportsScene ? " sans détails" : ""}`, "text-button");
    all.addEventListener("click", async () => copyText(await compileMany(libraryEntries()), `${libraryEntries().length} prompts copiés sans détails.`));
    const send = button("Envoyer à l’agrégateur", "primary-action");
    send.addEventListener("click", async () => {
      const payload = await compileLibrary();
      sendToAggregator(payload.outputs[0].prompt, tool?.title ?? library.title, payload.outputs[0].mediaType);
    });
    const link = node("a", "aggregator-result-link", "Ouvrir le brouillon ↗");
    link.id = "aggregator-result-link";
    link.target = "barz-aggregator";
    link.hidden = true;
    actions.append(current);
    if (supportsScene) {
      const without = button("Copier sans détails", "quiet-button");
      without.addEventListener("click", async () => copyText((await compileLibrary(selected.id, "")).outputs[0].prompt, "Prompt sans détails copié."));
      actions.append(without);
    }
    actions.append(categoryCopy, all, send, link);
    host.append(actions);

    const reset = button(supportsScene ? "Rétablir la navigation et les détails" : "Rétablir la navigation", "reset-tool-button");
    reset.addEventListener("click", () => {
      internal.configuration = {
        activeCategory: initial.categoryId,
        searchQuery: "",
        selectedEntryId: initial.id,
        detailsByPrompt: {}
      };
      markDirty();
      renderPromptLibrary();
      toast(supportsScene ? "Navigation et détails restaurés." : "Navigation restaurée.");
    });
    host.append(reset);
  }

  function promptOutput(payload, preview) {
    const output = payload.outputs?.[0];
    internal.output = output?.prompt ?? "";
    internal.outputMediaType = output?.mediaType ?? "image";
    preview.textContent = internal.output;
  }

  function schedulePromptCompile(preview) {
    clearTimeout(internal.compileTimer);
    internal.compileTimer = setTimeout(async () => promptOutput(await compile(), preview), 90);
  }

  async function renderBeauty() {
    const catalog = internal.catalog.beauty;
    host.replaceChildren(toolHeader("Beauty Studio", "42 recettes relues pour les selfies, portraits, matières de peau, éclairages et contraintes anti-IA."));
    const categories = node("nav", "goodies-categories");
    catalog.categories.forEach((category) => {
      const item = button("", "goodies-category");
      item.classList.toggle("is-active", category.id === internal.configuration.activeCategory);
      item.append(node("span", "", category.title), node("b", "", String(category.count)));
      item.addEventListener("click", () => {
        internal.configuration.activeCategory = category.id;
        internal.configuration.selectedEntryId = catalog.entries.find((entry) => entry.categoryId === category.id).id;
        markDirty();
        renderBeauty();
      });
      categories.append(item);
    });
    host.append(categories);

    const body = node("div", "goodies-layout");
    const list = node("div", "goodies-list");
    catalog.entries.filter((entry) => entry.categoryId === internal.configuration.activeCategory).forEach((entry) => {
      const item = button("", "goodies-card");
      item.classList.toggle("is-selected", entry.id === internal.configuration.selectedEntryId);
      item.append(node("b", "", entry.title));
      item.addEventListener("click", () => {
        internal.configuration.selectedEntryId = entry.id;
        markDirty();
        renderBeauty();
      });
      list.append(item);
    });
    const outputPanel = node("section", "runtime-output sticky-output");
    const preview = node("pre", "goodies-preview");
    outputPanel.append(node("h3", "", "Prompt prêt"), preview);
    const catalogPanel = node("section", "goodies-catalog");
    catalogPanel.append(list);
    body.append(catalogPanel, outputPanel);
    host.append(body);
    promptOutput(await compile(), preview);
    host.append(actionBar({
      copy: () => copyText(internal.output),
      send: () => sendToAggregator(internal.output, "Beauty Studio", "image")
    }));
    const reset = button("Rétablir la sélection Beauty", "reset-tool-button");
    reset.addEventListener("click", () => {
      internal.configuration = clone(catalog.defaults);
      markDirty();
      renderBeauty();
    });
    host.append(reset);
  }

  function realismSelect(labelText, entries, current, onChange, { custom = false, placeholder = "Aucun", allowEmpty = true } = {}) {
    const label = node("label", "control-field", labelText);
    const select = document.createElement("select");
    if (allowEmpty) {
      const empty = node("option", "", placeholder);
      empty.value = "";
      select.append(empty);
    }
    entries.forEach((entry) => {
      const option = node("option", "", entry.l ?? entry.v);
      option.value = entry.v;
      select.append(option);
    });
    if (custom) {
      const option = node("option", "", "Personnalisé…");
      option.value = "_custom";
      select.append(option);
    }
    select.value = current;
    select.addEventListener("change", () => onChange(select.value));
    label.append(select);
    return label;
  }

  async function renderRealism() {
    const catalog = internal.catalog.realism;
    const activeTab = catalog.tabs.find(({ id }) => id === internal.configuration.activeTabId) ?? catalog.tabs[0];
    const selected = activeTab.cards.find(({ id }) => id === internal.configuration.selectedCardId) ?? activeTab.cards[0];
    host.replaceChildren(toolHeader("Realism Forge", "29 recettes historiques avec sujet, tenue, pose, lieu, humeur et cinq réglages photographiques."));
    const tabs = node("nav", "mode-switch realism-tabs");
    catalog.tabs.forEach((tab) => {
      const item = button(tab.label);
      item.classList.toggle("is-active", tab.id === activeTab.id);
      item.addEventListener("click", () => {
        internal.configuration.activeTabId = tab.id;
        internal.configuration.selectedCardId = tab.cards[0].id;
        markDirty();
        renderRealism();
      });
      tabs.append(item);
    });
    host.append(tabs);

    const body = node("div", "runtime-grid realism-grid");
    const controls = node("div", "runtime-controls realism-controls");
    const cardList = node("div", "catalog-list realism-card-list");
    activeTab.cards.forEach((card) => {
      const item = button("", "catalog-card");
      item.classList.toggle("is-selected", card.id === selected.id);
      const copy = node("span");
      copy.append(node("b", "", card.title), node("small", "", card.specs.join(" · ")));
      item.append(copy);
      item.addEventListener("click", () => {
        internal.configuration.selectedCardId = card.id;
        markDirty();
        renderRealism();
      });
      cardList.append(item);
    });
    controls.append(node("p", "runtime-note", activeTab.intro ?? ""), cardList);
    const descriptionLabel = node("label", "control-field", "Sujet ou description libre");
    const description = document.createElement("textarea");
    description.rows = 3;
    description.maxLength = 50_000;
    description.placeholder = "Ex. a violinist waiting beside a rain-streaked bus shelter";
    description.value = internal.configuration.description;
    descriptionLabel.append(description);
    controls.append(descriptionLabel);

    const celebrityEntries = [...catalog.celebrities.female, ...catalog.celebrities.male].map((entry) => ({
      v: entry.v, l: `${entry.v}${entry.c ? ` ${entry.c}` : ""}`
    }));
    const selectGrid = node("div", "control-fields realism-selects");
    const choices = [
      ["Célébrité (facultatif)", celebrityEntries, "celebrity", false],
      ["Tenue", catalog.controls.outfits, "outfit", true],
      ["Pose", catalog.controls.poses, "pose", true],
      ["Lieu", catalog.controls.locations, "location", true],
      ["Humeur", catalog.controls.moods, "mood", false]
    ];
    choices.forEach(([label, entries, key, custom]) => {
      selectGrid.append(realismSelect(label, entries, internal.configuration[key], (value) => {
        internal.configuration[key] = value;
        markDirty();
        if (custom) renderRealism();
        else schedulePromptCompile(preview);
      }, { custom, placeholder: "Aucun", allowEmpty: key !== "mood" }));
      if (custom && internal.configuration[key] === "_custom") {
        const customKey = `custom${key[0].toUpperCase()}${key.slice(1)}`;
        const customLabel = node("label", "control-field", `${label} personnalisée`);
        const input = document.createElement("input");
        input.maxLength = 50_000;
        input.value = internal.configuration[customKey];
        input.addEventListener("input", () => {
          internal.configuration[customKey] = input.value;
          markDirty();
          schedulePromptCompile(preview);
        });
        customLabel.append(input);
        selectGrid.append(customLabel);
      }
    });
    controls.append(selectGrid);

    const sliders = { flash: 10, grain: 30, dof: 30, wear: 0, imperf: 30,
      ...(internal.configuration.slidersByCard[selected.id] ?? {}) };
    const sliderGroup = node("section", "control-group");
    sliderGroup.append(node("h3", "", "Réglages de cette carte"));
    catalog.sliders.forEach((definition) => {
      const label = node("label", "slider-field");
      const head = node("span", "slider-label");
      const value = node("b", "", String(sliders[definition.id]));
      head.append(node("span", "", definition.label), value);
      const input = document.createElement("input");
      input.type = "range";
      input.min = "0";
      input.max = "100";
      input.step = "1";
      input.value = String(sliders[definition.id]);
      input.addEventListener("input", () => {
        internal.configuration.slidersByCard[selected.id] ??= { ...sliders };
        internal.configuration.slidersByCard[selected.id][definition.id] = Number(input.value);
        value.textContent = input.value;
        markDirty();
        schedulePromptCompile(preview);
      });
      const bounds = node("span", "range-bounds");
      bounds.append(node("span", "", definition.left), node("span", "", definition.right));
      label.append(head, input, bounds);
      sliderGroup.append(label);
    });
    controls.append(sliderGroup);

    const outputPanel = node("section", "runtime-output sticky-output");
    const preview = node("pre", "goodies-preview");
    outputPanel.append(node("h3", "", selected.title), node("p", "runtime-note", selected.specs.join(" · ")), preview);
    body.append(controls, outputPanel);
    host.append(body);
    const refresh = () => schedulePromptCompile(preview);
    description.addEventListener("input", () => {
      internal.configuration.description = description.value;
      markDirty();
      refresh();
    });
    promptOutput(await compile(), preview);
    host.append(actionBar({
      copy: () => copyText(internal.output),
      send: () => sendToAggregator(internal.output, "Realism Forge", "image")
    }));
    const reset = button("Rétablir les réglages Realism", "reset-tool-button");
    reset.addEventListener("click", () => {
      internal.configuration = clone(catalog.defaults);
      markDirty();
      renderRealism();
    });
    host.append(reset);
  }

  function cinematicSelect(labelText, value, values, onChange) {
    const label = node("label", "control-field cinematic-select", labelText);
    const select = document.createElement("select");
    values.forEach((item) => {
      const option = node("option", "", item.label);
      option.value = String(item.value);
      option.selected = String(item.value) === String(value);
      select.append(option);
    });
    select.addEventListener("change", () => onChange(Number(select.value)));
    label.append(select);
    return label;
  }

  async function renderCinematicShoot() {
    const catalog = internal.catalog.cinematicShoot;
    const selected = catalog.prompts.find(({ id }) => id === internal.configuration.selectedPromptId) ?? catalog.prompts[0];
    const familyById = new Map(catalog.families.map((family) => [family.id, family]));
    const hasCustom = Object.hasOwn(internal.configuration.customPrompts, selected.id);
    host.replaceChildren(toolHeader(
      "Cinematic Shoot",
      "41 recettes de planches cinéma relues par Astra. Les réglages appartiennent au setup actif et chaque prompt édité reste intact jusqu’à une recompilation explicite."
    ));

    const families = node("nav", "mode-switch cinematic-families");
    catalog.families.forEach((family) => {
      const count = family.id === "all" ? catalog.prompts.length : catalog.prompts.filter((item) => item.family === family.id).length;
      const item = button(`${family.label} · ${count}`);
      item.classList.toggle("is-active", family.id === internal.configuration.activeFamilyId);
      item.addEventListener("click", () => {
        internal.configuration.activeFamilyId = family.id;
        const visible = catalog.prompts.filter((prompt) => family.id === "all" || prompt.family === family.id);
        if (!visible.some(({ id }) => id === internal.configuration.selectedPromptId)) {
          internal.configuration.selectedPromptId = visible[0].id;
        }
        markDirty();
        renderCinematicShoot();
      });
      families.append(item);
    });
    host.append(families);

    const toolbar = node("div", "cinematic-toolbar");
    const searchLabel = node("label", "control-field cinematic-search", "Rechercher une recette");
    const search = document.createElement("input");
    search.type = "search";
    search.maxLength = 500;
    search.placeholder = "Titre, ambiance, famille…";
    search.value = internal.configuration.searchQuery;
    searchLabel.append(search);
    const gridSettings = node("div", "cinematic-grid-settings");
    const gridValues = [2, 3, 4].map((value) => ({ value, label: String(value) }));
    gridSettings.append(
      cinematicSelect("Colonnes", internal.configuration.grid.cols, gridValues, (value) => {
        internal.configuration.grid.cols = value;
        markDirty();
        renderCinematicShoot();
      }),
      cinematicSelect("Lignes", internal.configuration.grid.rows, gridValues, (value) => {
        internal.configuration.grid.rows = value;
        markDirty();
        renderCinematicShoot();
      })
    );
    const mode = node("div", "cinematic-character-mode");
    mode.append(node("span", "", "Personnage"));
    [["puppet", "Puppet / figurine"], ["human", "Humain"]].forEach(([value, label]) => {
      const item = button(label);
      item.classList.toggle("is-active", internal.configuration.characterMode === value);
      item.addEventListener("click", () => {
        internal.configuration.characterMode = value;
        markDirty();
        renderCinematicShoot();
      });
      mode.append(item);
    });
    toolbar.append(searchLabel, gridSettings, mode);
    host.append(toolbar);

    const body = node("div", "goodies-layout cinematic-layout");
    const catalogPanel = node("section", "goodies-catalog cinematic-catalog");
    const resultCount = node("p", "goodies-result-count");
    const list = node("div", "goodies-list cinematic-list");
    const renderRecipeList = () => {
      list.replaceChildren();
      const query = internal.configuration.searchQuery.trim().toLocaleLowerCase("fr");
      const visible = catalog.prompts.filter((prompt) => {
        const familyMatch = internal.configuration.activeFamilyId === "all" || prompt.family === internal.configuration.activeFamilyId;
        const haystack = `${prompt.title} ${prompt.highlight} ${familyById.get(prompt.family)?.label ?? ""}`.toLocaleLowerCase("fr");
        return familyMatch && (!query || haystack.includes(query));
      });
      resultCount.textContent = `${visible.length} recette${visible.length === 1 ? "" : "s"}`;
      visible.forEach((prompt) => {
        const item = button("", "goodies-card cinematic-card");
        item.classList.toggle("is-selected", prompt.id === internal.configuration.selectedPromptId);
        const copy = node("span", "goodies-card-copy");
        copy.append(node("b", "", prompt.cleanTitle), node("span", "", prompt.highlight || familyById.get(prompt.family)?.label || "Planche cinéma"));
        const badge = prompt.highlight
          ? prompt.highlight.toUpperCase()
          : String(catalog.prompts.findIndex(({ id }) => id === prompt.id) + 1).padStart(2, "0");
        item.append(node("i", "", badge), copy);
        item.addEventListener("click", () => {
          internal.configuration.selectedPromptId = prompt.id;
          markDirty();
          renderCinematicShoot();
        });
        list.append(item);
      });
      if (!visible.length) list.append(node("p", "runtime-empty", "Aucune recette ne correspond à cette recherche."));
    };
    search.addEventListener("input", () => {
      internal.configuration.searchQuery = search.value;
      markDirty();
      renderRecipeList();
    });
    renderRecipeList();
    catalogPanel.append(resultCount, list);

    const outputPanel = node("section", "runtime-output cinematic-output");
    const outputHead = node("div", "goodies-output-head");
    const outputTitle = node("div");
    outputTitle.append(node("h3", "", selected.cleanTitle), node("p", "cinematic-family-label", familyById.get(selected.family)?.label ?? selected.family));
    const gridBadge = node("span", "cinematic-grid-badge", `${internal.configuration.grid.cols} × ${internal.configuration.grid.rows} · ${internal.configuration.grid.cols * internal.configuration.grid.rows} images`);
    outputHead.append(outputTitle, gridBadge);

    const detailLabel = node("label", "goodies-detail cinematic-detail", "Sujet et contexte");
    const detail = document.createElement("textarea");
    detail.rows = 4;
    detail.maxLength = 4_000;
    detail.placeholder = "Ex. Subject: @image1 ; Context: abandoned hotel lobby at dawn";
    detail.value = internal.configuration.detailsByPrompt[selected.id] ?? "";
    const detailCount = node("span", "goodies-detail-count", `${detail.value.length} / 4 000`);
    detailLabel.append(detail, detailCount);

    const options = node("div", "cinematic-options");
    if (selected.hasOutfitToggle) {
      const outfit = node("label", "toggle-field cinematic-outfit");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = internal.configuration.matchShotOutfitByPrompt[selected.id] ?? false;
      const mark = node("span", "check-mark", "✓");
      outfit.append(checkbox, mark, node("span", "", "Adapter à @image1 la tenue exacte de @image2"));
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) internal.configuration.matchShotOutfitByPrompt[selected.id] = true;
        else delete internal.configuration.matchShotOutfitByPrompt[selected.id];
        markDirty();
        renderCinematicShoot();
      });
      options.append(outfit);
    }
    options.append(node("p", "runtime-note", internal.configuration.characterMode === "puppet"
      ? "Le mode Puppet ajoute uniquement la couche de fidélité aux proportions de la figurine."
      : "Le mode Humain retire la couche Puppet sans réécrire les contraintes créatives de la recette."));

    const customNote = node("div", "cinematic-custom-note");
    customNote.hidden = !hasCustom;
    const customCopy = node("span", "", "Version personnalisée conservée : les réglages ne l’écrasent pas.");
    const recompile = button("Recompiler depuis les réglages", "quiet-button");
    recompile.addEventListener("click", () => {
      delete internal.configuration.customPrompts[selected.id];
      markDirty();
      renderCinematicShoot();
    });
    customNote.append(customCopy, recompile);

    const editorLabel = node("label", "cinematic-editor-label", "Prompt final — éditable");
    const editor = document.createElement("textarea");
    editor.className = "cinematic-editor";
    editor.rows = 24;
    editor.maxLength = 40_000;
    editor.spellcheck = false;
    editorLabel.append(editor);
    outputPanel.append(outputHead, detailLabel, options, customNote, editorLabel);
    body.append(catalogPanel, outputPanel);
    host.append(body);

    const updateOutput = async () => {
      const payload = await compile();
      internal.output = payload.outputs?.[0]?.prompt ?? "";
      internal.outputMediaType = "image";
      editor.value = internal.output;
      gridBadge.textContent = `${payload.grid.cols} × ${payload.grid.rows} · ${payload.grid.total} images`;
    };
    const scheduleUpdate = () => {
      clearTimeout(internal.compileTimer);
      internal.compileTimer = setTimeout(() => updateOutput(), 90);
    };
    detail.addEventListener("input", () => {
      if (detail.value) internal.configuration.detailsByPrompt[selected.id] = detail.value;
      else delete internal.configuration.detailsByPrompt[selected.id];
      detailCount.textContent = `${detail.value.length} / 4 000`;
      markDirty();
      if (!Object.hasOwn(internal.configuration.customPrompts, selected.id)) scheduleUpdate();
    });
    editor.addEventListener("input", () => {
      internal.configuration.customPrompts[selected.id] = editor.value;
      internal.output = editor.value;
      customNote.hidden = false;
      markDirty();
    });
    await updateOutput();

    host.append(actionBar({
      copy: () => copyText(internal.output),
      send: () => sendToAggregator(internal.output, "Cinematic Shoot", "image", { aspectRatio: "16:9" })
    }));
    const reset = button("Rétablir Cinematic Shoot", "reset-tool-button");
    reset.addEventListener("click", () => {
      internal.configuration = clone(catalog.defaults);
      markDirty();
      renderCinematicShoot();
      toast("Navigation, réglages et prompts personnalisés restaurés.");
    });
    host.append(reset);
  }

  function textField(labelText, object, key, { rows = 0, placeholder = "", maxLength = 50_000, onInput } = {}) {
    const label = node("label", "runtime-field", labelText);
    const control = rows ? document.createElement("textarea") : document.createElement("input");
    if (rows) control.rows = rows;
    control.maxLength = maxLength;
    control.placeholder = placeholder;
    control.value = object[key];
    control.addEventListener("input", () => {
      object[key] = control.value;
      markDirty();
      onInput?.();
    });
    label.append(control);
    return label;
  }

  function selectField(labelText, object, key, values, labels, onChange) {
    const label = node("label", "runtime-field", labelText);
    const select = document.createElement("select");
    values.forEach((value, index) => {
      const option = node("option", "", labels?.[index] ?? value);
      option.value = value;
      option.selected = value === object[key];
      select.append(option);
    });
    select.addEventListener("change", () => {
      object[key] = select.value;
      markDirty();
      onChange?.();
    });
    label.append(select);
    return label;
  }

  function boardAggregatorTarget(model) {
    return {
      seedance: { modelFamily: "Seedance 2.0", modelHint: "Seedance 2.0 multishot" },
      kling: { modelFamily: "Kling", modelHint: "Kling 2.x" },
      veo: { modelFamily: "Veo", modelHint: "Veo 3.1" }
    }[model] ?? {};
  }

  async function transferFacs(target, cueIds = internal.configuration.selectedIds) {
    if (!cueIds.length) return toast("Sélectionne au moins une expression.", true);
    await saveNow();
    const query = new URLSearchParams({ setupId: activeSetupId() });
    const snapshot = await api(`/api/v1/tools/barzy-board/configuration?${query}`);
    const configuration = snapshot.configuration;
    const section = target === "motion" ? configuration.motion : configuration.story;
    section.facsCueIds = [...new Set([...section.facsCueIds, ...cueIds])];
    if (target === "motion") section.facsMode = "custom";
    const saved = await api("/api/v1/tools/barzy-board/configuration", {
      method: "PUT",
      body: JSON.stringify({
        expectedSetupId: activeSetupId(),
        expectedToolRevision: snapshot.toolRevision,
        expectedRegistryRevision: snapshot.registryRevision,
        configuration
      })
    });
    toolStateChanged?.(saved.toolRevision);
    toast(`${cueIds.length} cue${cueIds.length > 1 ? "s" : ""} envoyé${cueIds.length > 1 ? "s" : ""} à ${target === "motion" ? "Motion" : "Story"}.`);
    await openTool("barzy-board");
    internal.configuration.activeTab = target;
    markDirty();
    await renderBoard();
  }

  function readImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Image illisible."));
        image.src = reader.result;
      };
      reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
      reader.readAsDataURL(file);
    });
  }

  async function compactFacsSheet(file) {
    const image = await readImage(file);
    if (image.width < 120 || image.height < 120) throw new Error("La planche est trop petite pour un découpage 7 × 7.");
    const scale = Math.min(1, 1400 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    const boardDataUrl = canvas.toDataURL("image/jpeg", .82);
    if (boardDataUrl.length > 2_500_000) throw new Error("La planche compressée dépasse 2,5 Mo.");
    return boardDataUrl;
  }

  function importedFacsCard(rawCard, catalog) {
    if (!rawCard || typeof rawCard !== "object" || Array.isArray(rawCard)) throw new Error("Une planche importée est invalide.");
    const boardDataUrl = String(rawCard.boardDataUrl || rawCard.board || "");
    if (!/^data:image\/(?:png|jpeg|webp);base64,/i.test(boardDataUrl)) throw new Error("Une planche ne contient pas d’image embarquée exploitable.");
    if (boardDataUrl.length > 2_500_000) throw new Error("Une planche importée dépasse 2,5 Mo.");
    const incomingMapping = rawCard.mapping;
    if (incomingMapping !== undefined && (!Array.isArray(incomingMapping) || incomingMapping.length !== 49 || incomingMapping.some((id, index) => id !== catalog.entries[index].id))) {
      throw new Error("L’ordre des 49 expressions d’une planche importée n’est pas compatible avec A4.");
    }
    const rawId = String(rawCard.id || "").toLowerCase();
    const legacySlug = rawId.replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
    const id = /^facs-card-[a-z0-9_-]{8,64}$/.test(rawId)
      ? rawId
      : `facs-card-v5-${legacySlug || crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
    const rawDate = rawCard.createdAt;
    const parsedDate = rawDate ? new Date(rawDate) : new Date();
    return {
      id,
      name: String(rawCard.name || "Planche FACS importée").trim().slice(0, 120) || "Planche FACS importée",
      boardDataUrl,
      cropVersion: catalog.crop.version,
      createdAt: Number.isNaN(parsedDate.valueOf()) ? new Date().toISOString() : parsedDate.toISOString(),
      sourceName: String(rawCard.sourceName || "export-v5.json").slice(0, 260),
      mapping: catalog.entries.map((entry) => entry.id)
    };
  }

  function facsCode(entry) {
    return String(entry.label || "").replace(/B$/, "");
  }

  function facsFaceTraits(entry) {
    const code = facsCode(entry);
    const traits = { brow: "neutral", eyes: "normal", mouth: "neutral", head: 0, gaze: 0, tongue: false, nose: "normal", cheek: false };
    if (["AU1", "AU2"].includes(code)) traits.brow = "up";
    if (["AU4", "AU71", "AU72"].includes(code)) traits.brow = "down";
    if (code === "AU5") traits.eyes = "wide";
    if (["AU7", "AU42", "AU44"].includes(code)) traits.eyes = "narrow";
    if (code === "AU41") traits.eyes = "droop";
    if (code === "AU43") traits.eyes = "closed";
    if (code === "AU6") { traits.cheek = true; traits.mouth = "smile"; }
    if (code === "AU9") traits.nose = "wrinkle";
    if (["AU10", "AU16"].includes(code)) traits.mouth = "upper";
    if (["AU12", "AU13", "AU14"].includes(code)) traits.mouth = "smile";
    if (code === "AU15") traits.mouth = "sad";
    if (code === "AU17") traits.mouth = "chin";
    if (["AU18", "AU22"].includes(code)) traits.mouth = "pucker";
    if (code === "AU20") traits.mouth = "stretch";
    if (["AU23", "AU24", "AU28"].includes(code)) traits.mouth = "tight";
    if (code === "AU25") traits.mouth = "part";
    if (code === "AU26") traits.mouth = "open";
    if (code === "AU27") traits.mouth = "wide";
    if (code === "AU84") { traits.mouth = "open"; traits.tongue = "up"; }
    if (code === "AU85") { traits.mouth = "open"; traits.tongue = "out"; }
    if (code === "AU55") traits.head = -13;
    if (code === "AU56") traits.head = 13;
    if (code === "AU58") traits.head = -5;
    if (code === "AU52") traits.head = 5;
    if (code === "AU53") traits.gaze = -4;
    if (code === "AU54") traits.gaze = 4;
    if (code === "AU61") traits.gaze = -8;
    if (code === "AU62") traits.gaze = 8;
    if (code === "AU63") traits.gaze = -6;
    if (code === "AU64") traits.gaze = 6;
    return traits;
  }

  function facsMouthSvg(kind, tongue) {
    const mouths = {
      neutral: '<path d="M30 55 Q40 58 50 55" fill="none" stroke="var(--facs-ink)" stroke-width="3" stroke-linecap="round"/>',
      smile: '<path d="M28 53 Q40 66 52 53" fill="none" stroke="var(--facs-ink)" stroke-width="3" stroke-linecap="round"/>',
      sad: '<path d="M29 62 Q40 51 51 62" fill="none" stroke="var(--facs-ink)" stroke-width="3" stroke-linecap="round"/>',
      pucker: '<ellipse cx="40" cy="57" rx="6" ry="5" fill="none" stroke="var(--facs-ink)" stroke-width="3"/>',
      stretch: '<path d="M24 56 H56" fill="none" stroke="var(--facs-ink)" stroke-width="4" stroke-linecap="round"/>',
      tight: '<path d="M28 57 H52" fill="none" stroke="var(--facs-ink)" stroke-width="5" stroke-linecap="round"/>',
      part: '<ellipse cx="40" cy="57" rx="11" ry="4" fill="#fff" stroke="var(--facs-ink)" stroke-width="2"/>',
      upper: '<path d="M28 54 Q40 48 52 54" fill="none" stroke="var(--facs-ink)" stroke-width="3" stroke-linecap="round"/><path d="M31 57 H49" stroke="#fff" stroke-width="3"/>',
      open: '<ellipse cx="40" cy="58" rx="11" ry="10" fill="#3a1715" stroke="var(--facs-ink)" stroke-width="3"/>',
      wide: '<ellipse cx="40" cy="58" rx="15" ry="14" fill="#3a1715" stroke="var(--facs-ink)" stroke-width="3"/>',
      chin: '<path d="M31 56 Q40 60 49 56" fill="none" stroke="var(--facs-ink)" stroke-width="3" stroke-linecap="round"/><path d="M35 67 Q40 70 45 67" fill="none" stroke="var(--facs-ink)" stroke-width="2"/>'
    };
    const tongueSvg = tongue === "out"
      ? '<path d="M35 62 Q40 76 45 62 Z" fill="#f16f7f" stroke="var(--facs-ink)" stroke-width="2"/>'
      : tongue === "up" ? '<path d="M34 56 Q40 48 46 56" fill="#f16f7f" stroke="var(--facs-ink)" stroke-width="2"/>' : "";
    return (mouths[kind] || mouths.neutral) + tongueSvg;
  }

  function facsFaceSvg(entry) {
    const traits = facsFaceTraits(entry);
    const browY = traits.brow === "up" ? 24 : traits.brow === "down" ? 33 : 29;
    const eye = traits.eyes === "wide"
      ? '<ellipse cx="29" cy="39" rx="6" ry="7" fill="#fff" stroke="var(--facs-ink)" stroke-width="2"/><ellipse cx="51" cy="39" rx="6" ry="7" fill="#fff" stroke="var(--facs-ink)" stroke-width="2"/>'
      : traits.eyes === "narrow"
        ? '<path d="M23 40 Q29 37 35 40" stroke="var(--facs-ink)" stroke-width="3" fill="none"/><path d="M45 40 Q51 37 57 40" stroke="var(--facs-ink)" stroke-width="3" fill="none"/>'
        : traits.eyes === "closed"
          ? '<path d="M23 40 Q29 43 35 40" stroke="var(--facs-ink)" stroke-width="3" fill="none"/><path d="M45 40 Q51 43 57 40" stroke="var(--facs-ink)" stroke-width="3" fill="none"/>'
          : traits.eyes === "droop"
            ? '<path d="M23 39 Q29 44 35 39" stroke="var(--facs-ink)" stroke-width="3" fill="none"/><path d="M45 39 Q51 44 57 39" stroke="var(--facs-ink)" stroke-width="3" fill="none"/>'
            : `<circle cx="${29 + traits.gaze}" cy="40" r="4" fill="var(--facs-ink)"/><circle cx="${51 + traits.gaze}" cy="40" r="4" fill="var(--facs-ink)"/>`;
    const pupils = traits.eyes === "wide" ? `<circle cx="${29 + traits.gaze}" cy="40" r="2.5" fill="var(--facs-ink)"/><circle cx="${51 + traits.gaze}" cy="40" r="2.5" fill="var(--facs-ink)"/>` : "";
    const cheeks = traits.cheek ? '<circle cx="24" cy="51" r="5" fill="#e8876e" opacity=".45"/><circle cx="56" cy="51" r="5" fill="#e8876e" opacity=".45"/>' : "";
    const nose = traits.nose === "wrinkle" ? '<path d="M38 43 L34 47 M42 43 L46 47 M36 50 H44" stroke="var(--facs-ink)" stroke-width="2" stroke-linecap="round"/>' : '<path d="M40 42 Q38 48 41 50" stroke="var(--facs-ink)" stroke-width="2" fill="none" stroke-linecap="round"/>';
    return `<svg class="facs-v5-face-svg" viewBox="0 0 80 80" aria-hidden="true"><g transform="rotate(${traits.head} 40 40)"><rect x="13" y="8" width="54" height="64" rx="18" fill="var(--facs-face)" stroke="var(--facs-ink)" stroke-width="3"/><path d="M23 ${browY} Q29 ${browY - 5} 35 ${browY}" stroke="var(--facs-ink)" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M45 ${browY} Q51 ${browY - 5} 57 ${browY}" stroke="var(--facs-ink)" stroke-width="3" fill="none" stroke-linecap="round"/>${eye}${pupils}${cheeks}${nose}${facsMouthSvg(traits.mouth, traits.tongue)}</g></svg>`;
  }

  function facsCrop(entry, customCard, cropContract) {
    const crop = node("span", "facs-v5-crop");
    if (customCard.referenceFolder) {
      crop.style.backgroundImage = `url(/facs-assets/${customCard.referenceFolder}/${encodeURIComponent(entry.legacySheetCode || facsCode(entry))}.jpg)`;
      crop.style.backgroundSize = "cover";
      crop.style.backgroundPosition = "center";
      return crop;
    }
    crop.style.backgroundImage = `url(${customCard.boardDataUrl})`;
    const position = entry.sheetPosition - 1;
    const column = position % cropContract.columns;
    const row = Math.floor(position / cropContract.columns);
    crop.style.backgroundSize = `${cropContract.columns / cropContract.width * 100}% ${cropContract.rows / cropContract.height * 100}%`;
    crop.style.backgroundPosition = `${(column + cropContract.x) / (cropContract.columns - cropContract.width) * 100}% ${(row + cropContract.y) / (cropContract.rows - cropContract.height) * 100}%`;
    return crop;
  }

  function showFacsDialog(title, content, imageUrl = "") {
    const dialog = node("dialog", "facs-v5-dialog");
    const card = node("div", "facs-v5-dialog-card");
    card.append(node("h2", "", title), node("p", "", content));
    if (imageUrl) {
      const image = document.createElement("img");
      image.src = imageUrl;
      image.alt = title;
      card.append(image);
    }
    const close = button("OK", "primary-action");
    close.addEventListener("click", () => dialog.close());
    card.append(node("div", "facs-v5-dialog-actions"));
    card.lastElementChild.append(close);
    dialog.append(card);
    document.body.append(dialog);
    dialog.addEventListener("close", () => dialog.remove());
    dialog.showModal();
  }

  async function renderFacsSheet() {
    const catalog = internal.catalog.facs;
    const builtinReferenceCards = [
      { id: "builtin:chubby", name: "Chubby card", boardDataUrl: "/facs-assets/fac-reference.jpg", referenceFolder: "chubby", builtin: true },
      { id: "builtin:giscard", name: "Giscard", boardDataUrl: "/facs-assets/fac-reference-giscard.jpg", referenceFolder: "giscard", builtin: true }
    ];
    const referenceCards = [...builtinReferenceCards, ...internal.configuration.customCards];
    if (internal.configuration.outputMode === "full-board") internal.configuration.outputMode = "acting";
    const head = toolHeader("FACS Sheet Generator", "");
    head.classList.add("facs-v5-hero");
    const titleCopy = head.querySelector(".runtime-title-copy");
    titleCopy.prepend(node("p", "facs-v5-eyebrow", "STORY BUILDER"));
    titleCopy.append(node("p", "facs-v5-subtitle", "49 facial action buttons with stylized expression heads, real-time prompt output and direct send to BZ Board."));
    host.replaceChildren(head);

    const controls = node("section", "facs-v5-controls");
    const controlField = (label, key, rows = 3) => {
      const field = node("label", "facs-v5-field");
      field.append(node("span", "", label));
      const area = document.createElement("textarea");
      area.rows = rows;
      area.value = internal.configuration[key];
      area.addEventListener("input", () => {
        internal.configuration[key] = area.value;
        markDirty();
        clearTimeout(internal.compileTimer);
        internal.compileTimer = setTimeout(() => refreshOutput(), 100);
      });
      field.append(area);
      return field;
    };
    controls.append(
      controlField("CHARACTER ANCHOR", "anchor"),
      controlField("FRAMING / LIGHT", "framing"),
      controlField("WARDROBE", "wardrobe")
    );
    const resetPanel = node("div", "facs-v5-field facs-v5-reset");
    resetPanel.append(node("span", "", "TEXT TOOLS"));
    const resetText = button("Reset text", "primary-action");
    resetText.addEventListener("click", () => {
      for (const key of ["anchor", "framing", "wardrobe"]) internal.configuration[key] = catalog.defaults[key];
      markDirty();
      renderFacsSheet();
    });
    resetPanel.append(resetText);
    controls.append(resetPanel);
    host.append(controls);

    const output = node("section", "facs-v5-output");
    const outputHead = node("div", "facs-v5-output-head");
    const outputTitleBlock = node("div", "");
    outputTitleBlock.append(node("p", "facs-v5-eyebrow", "PROMPT OUTPUT"));
    const outputTitle = node("strong", "facs-v5-output-title", "FACS acting instructions");
    outputTitleBlock.append(outputTitle);
    const outputTools = node("div", "facs-v5-output-tools");
    const outputModes = node("div", "facs-v5-mode-switch");
    [["acting", "FACS ACTING INSTRUCTIONS"], ["portraits", "FACS BOARD CREATION"]].forEach(([mode, label]) => {
      const control = button(label, "facs-v5-mode-button");
      control.classList.toggle("is-active", internal.configuration.outputMode === mode);
      control.addEventListener("click", () => {
        internal.configuration.outputMode = mode;
        markDirty();
        renderFacsSheet();
      });
      outputModes.append(control);
    });
    const outputText = node("pre", "facs-v5-output-text", "Select expression buttons to build a FACS acting layer.");
    const copyOutput = button("Copy output", "primary-action");
    copyOutput.addEventListener("click", () => copyText(internal.output));
    const createBoard = button("Create Full FACS Board", "quiet-button");
    createBoard.addEventListener("click", async () => {
      const configuration = clone(internal.configuration);
      configuration.outputMode = "full-board";
      const payload = await api(`/api/v1/tools/${internal.toolId}/compile`, { method: "POST", body: JSON.stringify({ configuration }) });
      const generated = payload.outputs[0]?.prompt || "";
      internal.output = generated;
      internal.outputMediaType = "image";
      outputTitle.textContent = `Full FACS board prompt · ${generated.length} chars`;
      outputText.textContent = generated;
      await copyText(generated, "Full FACS board prompt copied.");
    });
    const info = button("i", "quiet-button facs-v5-info-button");
    info.setAttribute("aria-label", "Full FACS board generation info");
    info.addEventListener("click", () => showFacsDialog(
      "Create Full FACS Board",
      "Best pipe: generate a flat 7×7 contact sheet in portrait 3:4 or 4:5. Ask for 49 equal cells, thin dark separators, one centered portrait per cell, a narrow label band, and the same lens, crop, light and background across all tiles. AU61 must look viewer-left and AU62 viewer-right. Import the finished board below to use it as a custom card."
    ));
    outputTools.append(outputModes, copyOutput, createBoard, info);
    outputHead.append(outputTitleBlock, outputTools);
    output.append(outputHead, outputText);
    host.append(output);

    const references = document.createElement("details");
    references.className = "facs-v5-reference";
    references.append(node("summary", "", "Add ref FACS Image"));
    const referenceBody = node("div", "facs-v5-reference-body");
    const referenceActions = node("div", "facs-v5-reference-actions");
    const importInput = document.createElement("input");
    importInput.type = "file";
    importInput.accept = "image/png,image/jpeg,image/webp";
    importInput.hidden = true;
    const importButton = button("Import FACS sheet", "primary-action");
    importButton.addEventListener("click", () => importInput.click());
    importInput.addEventListener("change", async () => {
      const file = importInput.files?.[0];
      if (!file) return;
      try {
        const boardDataUrl = await compactFacsSheet(file);
        const fallback = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Planche FACS";
        const name = await modalName({ title: "Nommer la planche", description: "Elle sera intégrée au setup, à ses versions et à ses sauvegardes.", initial: fallback, action: "Importer" });
        if (!name) return;
        const id = `facs-card-${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
        internal.configuration.customCards.push({
          id, name, boardDataUrl, cropVersion: catalog.crop.version, createdAt: new Date().toISOString(), sourceName: file.name,
          mapping: catalog.entries.map((entry) => entry.id)
        });
        internal.configuration.activeReferenceId = id;
        markDirty();
        await saveNow();
        renderFacsSheet();
        toast("Custom FACS card added and saved in this setup.");
      } catch (error) { toast(error.message, true); }
      finally { importInput.value = ""; }
    });
    const saveCards = button("Save custom cards", "quiet-button");
    saveCards.disabled = !internal.configuration.customCards.length;
    saveCards.addEventListener("click", async () => { await saveNow(); toast("Custom cards saved in the active setup."); });
    referenceActions.append(importButton, saveCards, importInput, node("p", "facs-v5-reference-help", "Import a generated 7×7 FACS board. Custom cards are stored inside the active setup and remain available after reopening the app."));
    referenceBody.append(referenceActions);
    const gallery = node("div", "facs-v5-reference-gallery");
    referenceCards.forEach((card) => {
      const item = node("div", "facs-v5-reference-item");
      const preview = button("", "facs-v5-reference-thumb");
      const image = document.createElement("img");
      image.src = card.boardDataUrl;
      image.alt = `${card.name} FACS board`;
      preview.append(image, node("span", "", card.name));
      preview.addEventListener("click", () => showFacsDialog(card.name, "Custom FACS reference", card.boardDataUrl));
      item.append(preview);
      if (!card.builtin) {
        const remove = button("Delete", "facs-v5-delete-thumb");
        remove.addEventListener("click", () => {
          if (!window.confirm(`Delete “${card.name}” from this setup?`)) return;
          internal.configuration.customCards = internal.configuration.customCards.filter(({ id }) => id !== card.id);
          if (internal.configuration.activeReferenceId === card.id) internal.configuration.activeReferenceId = "builtin:normal";
          markDirty();
          renderFacsSheet();
        });
        item.append(remove);
      }
      gallery.append(item);
    });
    referenceBody.append(gallery);
    references.append(referenceBody);
    host.append(references);

    const toolbar = node("section", "facs-v5-toolbar");
    const search = document.createElement("input");
    search.type = "search"; search.placeholder = "Filter: brow, lip, head, AU12…"; search.value = internal.configuration.searchQuery;
    search.addEventListener("input", () => {
      internal.configuration.searchQuery = search.value;
      markDirty();
      renderCards();
    });
    const all = button("Select all", "quiet-button");
    all.addEventListener("click", () => { internal.configuration.selectedIds = catalog.entries.map(({ id }) => id); markDirty(); renderFacsSheet(); });
    const clear = button("Clear", "quiet-button");
    clear.addEventListener("click", () => { internal.configuration.selectedIds = []; markDirty(); renderFacsSheet(); });
    const random = button("Random 6", "quiet-button");
    random.addEventListener("click", () => {
      internal.configuration.selectedIds = [...catalog.entries].sort(() => Math.random() - .5).slice(0, 6).map(({ id }) => id);
      markDirty(); renderFacsSheet();
    });
    const story = button("Send selected to Story", "primary-action"); story.addEventListener("click", () => transferFacs("story"));
    const motion = button("Send selected to Motion", "quiet-button"); motion.addEventListener("click", () => transferFacs("motion"));
    const referenceModes = node("div", "facs-v5-mode-switch facs-v5-reference-modes");
    const normalMode = button("NORMAL", "facs-v5-mode-button");
    normalMode.classList.toggle("is-active", internal.configuration.activeReferenceId === "builtin:normal");
    normalMode.addEventListener("click", () => { internal.configuration.activeReferenceId = "builtin:normal"; markDirty(); renderFacsSheet(); });
    const customMenu = node("div", "facs-v5-custom-menu");
    const activeCard = referenceCards.find(({ id }) => id === internal.configuration.activeReferenceId);
    const customMode = button(activeCard?.name || "CUSTOM CARD", "facs-v5-mode-button");
    customMode.classList.toggle("is-active", Boolean(activeCard));
    const options = node("div", "facs-v5-custom-options");
    if (referenceCards.length) {
      referenceCards.forEach((card) => {
        const choice = button(card.name, card.id === internal.configuration.activeReferenceId ? "is-active" : "");
        choice.addEventListener("click", () => { internal.configuration.activeReferenceId = card.id; markDirty(); renderFacsSheet(); });
        options.append(choice);
      });
      customMode.addEventListener("click", (event) => { event.stopPropagation(); customMenu.classList.toggle("is-open"); });
    } else {
      customMode.addEventListener("click", () => { references.open = true; importInput.click(); });
    }
    customMenu.append(customMode, options);
    referenceModes.append(normalMode, customMenu);
    const count = node("span", "facs-v5-counter", `${internal.configuration.selectedIds.length} selected`);
    toolbar.append(search, all, clear, random, story, motion, referenceModes, count);
    host.append(toolbar);

    const grid = node("section", "facs-v5-grid");
    const renderCards = () => {
      grid.replaceChildren();
      const query = internal.configuration.searchQuery.trim().toLocaleLowerCase();
      const filtered = catalog.entries.filter((entry) => !query || `${entry.label} ${entry.name} ${entry.category} ${entry.visible}`.toLocaleLowerCase().includes(query));
      filtered.forEach((entry) => {
        const card = node("article", "facs-v5-card");
        card.classList.toggle("is-active", internal.configuration.selectedIds.includes(entry.id));
        const top = node("div", "facs-v5-card-top");
        top.append(node("span", "facs-v5-code", `${String(entry.sheetPosition).padStart(2, "0")} ${facsCode(entry)}`), node("span", "facs-v5-category", entry.category));
        const face = node("div", "facs-v5-face-wrap");
        face.innerHTML = facsFaceSvg(entry);
        if (activeCard) {
          const cover = node("button", "facs-v5-reference-cover");
          cover.type = "button";
          cover.setAttribute("aria-label", `Select ${facsCode(entry)} ${entry.name}`);
          cover.append(facsCrop(entry, activeCard, catalog.crop));
          const caption = node("span", "facs-v5-reference-caption");
          caption.append(node("strong", "", `${facsCode(entry)} · ${entry.name}`), node("span", "", "Click to select"));
          cover.append(caption);
          cover.addEventListener("click", (event) => { event.stopPropagation(); toggleEntry(entry.id); });
          face.append(cover);
        }
        const actions = node("div", "facs-v5-card-actions");
        const sendStory = button("Send Story", "facs-v5-mini");
        sendStory.addEventListener("click", (event) => { event.stopPropagation(); transferFacs("story", [entry.id]); });
        const sendMotion = button("Send Motion", "facs-v5-mini");
        sendMotion.addEventListener("click", (event) => { event.stopPropagation(); transferFacs("motion", [entry.id]); });
        const copy = button("Copy", "facs-v5-mini");
        copy.addEventListener("click", async (event) => {
          event.stopPropagation();
          const configuration = clone(internal.configuration);
          configuration.outputMode = "portraits";
          configuration.selectedIds = [entry.id];
          const payload = await api(`/api/v1/tools/${internal.toolId}/compile`, { method: "POST", body: JSON.stringify({ configuration }) });
          copyText(payload.outputs[0]?.prompt || "");
        });
        actions.append(sendStory, sendMotion, copy);
        card.append(top, face, node("div", "facs-v5-name", entry.name), node("div", "facs-v5-visible", entry.visible), actions);
        if (activeCard) {
          const hoverPreview = node("div", "facs-v5-reference-popover");
          hoverPreview.setAttribute("aria-hidden", "true");
          hoverPreview.append(facsCrop(entry, activeCard, catalog.crop));
          const hoverCaption = node("span", "facs-v5-reference-caption");
          hoverCaption.append(node("strong", "", `${facsCode(entry)} · ${entry.name}`), node("span", "", activeCard.name));
          hoverPreview.append(hoverCaption);
          card.append(hoverPreview);
        }
        card.addEventListener("click", () => toggleEntry(entry.id));
        grid.append(card);
      });
      if (!filtered.length) grid.append(node("p", "runtime-empty", "No expression matches this filter."));
    };
    const toggleEntry = (id) => {
      internal.configuration.selectedIds = internal.configuration.selectedIds.includes(id)
        ? internal.configuration.selectedIds.filter((item) => item !== id)
        : [...internal.configuration.selectedIds, id];
      markDirty();
      renderFacsSheet();
    };
    host.append(grid);
    renderCards();

    async function refreshOutput() {
      const payload = await compile();
      internal.output = payload.outputs.map(({ prompt }) => prompt).join("\n\n");
      internal.outputMediaType = payload.outputs[0]?.mediaType ?? "image";
      const count = payload.outputs.length;
      outputTitle.textContent = internal.configuration.outputMode === "acting"
        ? count ? `${internal.configuration.selectedIds.length} FACS acting instruction${internal.configuration.selectedIds.length > 1 ? "s" : ""}` : "FACS acting instructions"
        : count ? `${count} FACS board creation prompt${count > 1 ? "s" : ""}` : "FACS board creation";
      outputText.textContent = internal.output || (internal.configuration.outputMode === "acting"
        ? "Select expression buttons to build a FACS acting layer."
        : "Select expression buttons to build FACS board creation prompts.");
    }
    await refreshOutput();
  }

  async function updateFacsOutputs(container) {
    const payload = await compile();
    container.replaceChildren();
    internal.output = payload.outputs.map(({ label, prompt }) => `[${label}]\n${prompt}`).join("\n\n");
    internal.outputMediaType = payload.outputs[0]?.mediaType ?? "image";
    if (!payload.outputs.length) return container.append(node("p", "runtime-empty", "Sélectionne au moins une expression."));
    payload.outputs.forEach((output) => {
      const block = node("article", "prompt-block facs-prompt-block");
      const head = node("div", "prompt-block-head");
      const copy = button("Copier", "text-button"); copy.addEventListener("click", () => copyText(output.prompt));
      head.append(node("b", "", output.label), copy);
      const editor = document.createElement("textarea");
      editor.rows = payload.outputs.length === 1 ? 20 : 8;
      editor.value = output.prompt;
      editor.addEventListener("input", () => {
        internal.configuration.customOutputs[output.id] = editor.value;
        markDirty();
        internal.output = [...container.querySelectorAll("textarea")].map((area, index) => `[${payload.outputs[index].label}]\n${area.value}`).join("\n\n");
      });
      block.append(head, editor);
      container.append(block);
    });
  }

  function scheduleFacsCompile(container) {
    clearTimeout(internal.compileTimer);
    internal.compileTimer = setTimeout(() => updateFacsOutputs(container), 90);
  }

  function boardFacsSelector(section, { disabled = false } = {}) {
    const wrap = node("section", "board-facs");
    const selected = section.facsCueIds;
    const entries = internal.catalog.facs.entries.filter((entry) => entry.legacyBoardCode || selected.includes(entry.id));
    const head = node("div", "board-facs-head");
    const clear = button("Effacer", "text-button");
    clear.disabled = disabled || !selected.length;
    clear.addEventListener("click", () => { section.facsCueIds = []; markDirty(); renderBoard(); });
    head.append(node("b", "", `FACS Action Units · ${selected.length}`), clear);
    const grid = node("div", "board-facs-grid");
    entries.forEach((entry) => {
      const chip = button(`${entry.label} · ${entry.name}`, "board-facs-chip");
      chip.disabled = disabled;
      chip.classList.toggle("is-selected", selected.includes(entry.id));
      chip.addEventListener("click", () => {
        section.facsCueIds = selected.includes(entry.id) ? selected.filter((id) => id !== entry.id) : [...selected, entry.id];
        markDirty(); renderBoard();
      });
      grid.append(chip);
    });
    wrap.append(head, grid);
    return wrap;
  }

  function boardInputGrid(section, definitions, refresh) {
    const grid = node("div", "board-field-grid");
    definitions.forEach((definition) => {
      if (definition.type === "select") grid.append(selectField(definition.label, section, definition.key, definition.values, definition.labels, refresh));
      else grid.append(textField(definition.label, section, definition.key, { rows: definition.rows ?? 0, placeholder: definition.placeholder ?? "", onInput: refresh }));
    });
    return grid;
  }

  async function renderBoard() {
    const catalog = internal.catalog.board;
    host.replaceChildren(toolHeader("BZ Board", "Compose Story et Motion avec des cues FACS structurés, persistants et compatibles avec l’agrégateur."));
    const tabs = node("div", "mode-switch");
    [["story", "Story"], ["motion", "Motion"]].forEach(([value, label]) => {
      const control = button(label); control.classList.toggle("is-active", internal.configuration.activeTab === value);
      control.addEventListener("click", () => { internal.configuration.activeTab = value; markDirty(); renderBoard(); });
      tabs.append(control);
    });
    host.append(tabs);
    const body = node("div", "runtime-grid board-layout");
    const controls = node("section", "runtime-controls board-controls");
    const outputPanel = node("section", "runtime-output board-output");
    const refresh = () => scheduleBoardCompile(editor, badge);
    if (internal.configuration.activeTab === "story") {
      const s = internal.configuration.story;
      controls.append(boardInputGrid(s, [
        { label: "Personnage principal", key: "subject", rows: 3 }, { label: "Référence personnage", key: "refChar" },
        { label: "Action / chorégraphie", key: "action", rows: 4 }, { label: "Environnement", key: "env", rows: 2 },
        { label: "Référence décor", key: "refEnv" }, { label: "Personnages secondaires", key: "secondary", rows: 3 },
        { label: "Caméra", key: "camera", type: "select", values: catalog.cameras },
        { label: "Cases", key: "panels", type: "select", values: catalog.panels }, { label: "Ratio", key: "ratio", type: "select", values: catalog.ratios },
        { label: "Style de dessin", key: "drawingStyle", type: "select", values: catalog.drawingStyles },
        { label: "Notes de dessin", key: "drawingNotes" }, { label: "Référence de style", key: "drawingReference" },
        { label: "Plan final", key: "finalBeat", rows: 2 }
      ], refresh));
      const annotation = node("label", "toggle-field board-annotation");
      const checkbox = document.createElement("input"); checkbox.type = "checkbox"; checkbox.checked = s.annotations;
      checkbox.addEventListener("change", () => { s.annotations = checkbox.checked; markDirty(); renderBoard(); });
      annotation.append(checkbox, node("span", "check-mark", "✓"), node("span", "", "Inclure le système d’annotations colorées"));
      controls.append(annotation, boardFacsSelector(s));
    } else {
      const m = internal.configuration.motion;
      const importStory = button("Importer les champs Story", "quiet-button");
      importStory.addEventListener("click", () => {
        const s = internal.configuration.story;
        Object.assign(m, { subject: s.subject, refChar: s.refChar || "@image1", secondary: s.secondary, action: s.action, env: s.env, refEnv: s.refEnv || "@image2", camera: s.camera });
        markDirty(); renderBoard();
      });
      controls.append(importStory, boardInputGrid(m, [
        { label: "Modèle cible", key: "model", type: "select", values: catalog.models, labels: ["Seedance 2.0 multishot", "Kling 2.x", "Veo 3.1"] },
        { label: "Référence storyboard", key: "refBoard" }, { label: "Référence personnage", key: "refChar" },
        { label: "Durée", key: "duration", type: "select", values: catalog.durations, labels: catalog.durations.map((v) => `${v} s`) },
        { label: "Référence décor", key: "refEnv" }, { label: "Références secondaires", key: "refSecondary" },
        { label: "Rythme", key: "pace", type: "select", values: catalog.paces }, { label: "Tenue du plan final (s)", key: "finalHold" },
        { label: "Personnage — override", key: "subject", rows: 3 }, { label: "Secondaires — override", key: "secondary", rows: 3 },
        { label: "Action — override", key: "action", rows: 4 }, { label: "Décor — override", key: "env", rows: 2 },
        { label: "Caméra — override", key: "camera", rows: 2 }, { label: "Audio", key: "audio", rows: 3 }
      ], refresh));
      const facsModes = node("div", "board-facs-mode");
      [["inherit-story", "Hériter de Story"], ["custom", "Sélection Motion indépendante"]].forEach(([value, label]) => {
        const control = button(label); control.classList.toggle("is-active", m.facsMode === value);
        control.addEventListener("click", () => { m.facsMode = value; markDirty(); renderBoard(); });
        facsModes.append(control);
      });
      controls.append(facsModes, boardFacsSelector(m, { disabled: m.facsMode === "inherit-story" }));
      if (m.facsMode === "inherit-story") controls.append(node("p", "runtime-note", `${internal.configuration.story.facsCueIds.length} cue(s) hérité(s) de Story. Une sélection Motion personnalisée vide reste vraiment vide.`));
    }
    const outputHead = node("div", "goodies-output-head");
    const badge = node("span", "goodies-output-meta");
    outputHead.append(node("h3", "", internal.configuration.activeTab === "story" ? "Prompt storyboard" : "Prompt motion"), badge);
    const customNote = node("div", "cinematic-custom-note");
    customNote.hidden = !Object.hasOwn(internal.configuration.customOutputs, internal.configuration.activeTab);
    const rebuild = button("Recompiler depuis les réglages", "quiet-button");
    rebuild.addEventListener("click", () => { delete internal.configuration.customOutputs[internal.configuration.activeTab]; markDirty(); renderBoard(); });
    customNote.append(node("span", "", "Version personnalisée conservée : les réglages ne l’écrasent pas."), rebuild);
    const editor = document.createElement("textarea"); editor.className = "cinematic-editor board-editor"; editor.rows = 30; editor.maxLength = 100_000;
    editor.addEventListener("input", () => { internal.configuration.customOutputs[internal.configuration.activeTab] = editor.value; internal.output = editor.value; markDirty(); customNote.hidden = false; });
    outputPanel.append(outputHead, customNote, editor);
    body.append(controls, outputPanel); host.append(body);
    await updateBoardOutput(editor, badge);
    host.append(actionBar({
      copy: () => copyText(editor.value),
      send: () => sendToAggregator(
        editor.value,
        `BZ Board · ${internal.configuration.activeTab}`,
        internal.configuration.activeTab === "story" ? "image" : "video",
        internal.configuration.activeTab === "story"
          ? { aspectRatio: internal.configuration.story.ratio }
          : { durationSeconds: Number(internal.configuration.motion.duration) },
        internal.configuration.activeTab === "motion" ? boardAggregatorTarget(internal.configuration.motion.model) : {}
      )
    }));
    const reset = button(`Rétablir ${internal.configuration.activeTab === "story" ? "Story" : "Motion"}`, "reset-tool-button");
    reset.addEventListener("click", () => {
      const activeTab = internal.configuration.activeTab;
      internal.configuration[activeTab] = clone(catalog.defaults[activeTab]);
      delete internal.configuration.customOutputs[activeTab];
      markDirty(); renderBoard();
    });
    host.append(reset);
  }

  async function updateBoardOutput(editor, badge) {
    const payload = await compile();
    const output = payload.outputs.find(({ id }) => id === internal.configuration.activeTab);
    internal.output = output?.prompt ?? "";
    internal.outputMediaType = output?.mediaType ?? "image";
    editor.value = internal.output;
    badge.textContent = `${internal.output.length.toLocaleString("fr-FR")} caractères${output?.custom ? " · personnalisé" : ""}`;
  }

  function scheduleBoardCompile(editor, badge) {
    clearTimeout(internal.compileTimer);
    internal.compileTimer = setTimeout(() => updateBoardOutput(editor, badge), 90);
  }

  function cameraCardsForSection(sectionId) {
    return internal.catalog.cameraSuite.cards.filter((card) => card.sectionId === sectionId);
  }

  function currentCameraVariant(card) {
    return card.variants[internal.configuration.variantByCard[card.key]];
  }

  function currentCameraPrompt(card) {
    const variant = currentCameraVariant(card);
    return internal.configuration.customPrompts[variant.id] ?? variant.prompt;
  }

  async function updateCameraSuiteOutput(editor, meta, layers) {
    const payload = await compile();
    const output = payload.outputs[0];
    internal.output = output?.prompt ?? "";
    internal.outputMediaType = "video";
    editor.value = internal.output;
    const cameraLayers = payload.layers.filter(({ id }) => id !== "incoming").length;
    const incoming = payload.layers.some(({ id }) => id === "incoming");
    meta.textContent = `${cameraLayers} carte${cameraLayers === 1 ? "" : "s"}${incoming ? " + couche entrante" : ""} · ${internal.output.length.toLocaleString("fr-FR")} caractères`;
    layers.replaceChildren();
    if (!payload.layers.length) {
      layers.append(node("p", "runtime-empty", "Active une ou plusieurs cartes caméra, ou ajoute une couche entrante."));
      return;
    }
    payload.layers.forEach((layer, index) => {
      const row = node("div", "camera-layer");
      row.append(node("b", "", String(index + 1).padStart(2, "0")), node("span", "", layer.label));
      if (layer.custom) row.append(node("em", "", "personnalisé"));
      layers.append(row);
    });
  }

  function scheduleCameraSuiteCompile(editor, meta, layers) {
    clearTimeout(internal.compileTimer);
    internal.compileTimer = setTimeout(() => updateCameraSuiteOutput(editor, meta, layers), 90);
  }

  async function renderCameraSuite() {
    const catalog = internal.catalog.cameraSuite;
    host.replaceChildren(toolHeader("Camera Control", "VEO Precision devient un atelier persistant : compose les mouvements, optiques et textures dans un ordre stable."));

    const body = node("div", "runtime-grid camera-suite-layout");
    const controls = node("section", "runtime-controls camera-suite-controls");
    const outputPanel = node("section", "runtime-output camera-suite-output");

    const incoming = node("section", "camera-incoming");
    const incomingHead = node("div", "camera-section-head");
    const incomingCopy = node("div");
    incomingCopy.append(node("b", "", "Couche entrante"), node("small", "", internal.configuration.incoming.source || "Prompt externe facultatif"));
    const clearIncoming = button("Effacer", "text-button");
    clearIncoming.disabled = !internal.configuration.incoming.text;
    clearIncoming.addEventListener("click", () => {
      internal.configuration.incoming = { text: "", source: "" };
      markDirty(); renderCameraSuite();
    });
    incomingHead.append(incomingCopy, clearIncoming);
    const incomingEditor = document.createElement("textarea");
    incomingEditor.rows = 4;
    incomingEditor.maxLength = 100_000;
    incomingEditor.placeholder = "Colle ici un prompt à placer avant les instructions caméra…";
    incomingEditor.value = internal.configuration.incoming.text;
    incomingEditor.addEventListener("input", () => {
      internal.configuration.incoming.text = incomingEditor.value;
      if (!incomingEditor.value) internal.configuration.incoming.source = "";
      clearIncoming.disabled = !incomingEditor.value;
      markDirty(); scheduleCameraSuiteCompile(outputEditor, outputMeta, layerList);
    });
    incoming.append(incomingHead, incomingEditor);
    controls.append(incoming);

    const selectionBar = node("div", "camera-selection-bar");
    const selectionCount = node("b", "", `${internal.configuration.activeCardIds.length} active${internal.configuration.activeCardIds.length === 1 ? "" : "s"}`);
    const clearSelection = button("Effacer la sélection", "quiet-button");
    clearSelection.disabled = !internal.configuration.activeCardIds.length && !internal.configuration.incoming.text;
    clearSelection.addEventListener("click", () => {
      internal.configuration.activeCardIds = [];
      internal.configuration.incoming = { text: "", source: "" };
      markDirty(); renderCameraSuite();
    });
    selectionBar.append(selectionCount, clearSelection);
    controls.append(selectionBar);

    const sectionList = node("div", "camera-section-list");
    controls.append(sectionList);

    const outputHead = node("div", "goodies-output-head");
    const outputMeta = node("span", "goodies-output-meta", "0 carte · 0 caractère");
    outputHead.append(node("h3", "", "Prompt caméra composite"), outputMeta);
    const layerList = node("div", "camera-layer-list");
    const outputEditor = document.createElement("textarea");
    outputEditor.className = "cinematic-editor camera-composite-editor";
    outputEditor.rows = 24;
    outputEditor.readOnly = true;
    outputPanel.append(outputHead, layerList, outputEditor);

    for (const section of catalog.sections) {
      const collapsed = internal.configuration.collapsedSectionIds.includes(section.id);
      const sectionCard = node("section", "camera-section");
      const sectionToggle = button("", "camera-section-toggle");
      sectionToggle.setAttribute("aria-expanded", String(!collapsed));
      const cards = cameraCardsForSection(section.id);
      const activeCount = cards.filter(({ key }) => internal.configuration.activeCardIds.includes(key)).length;
      const sectionCount = node("small", "", `${activeCount}/${cards.length}`);
      sectionToggle.append(
        node("span", "camera-disclosure", collapsed ? "+" : "−"),
        node("b", "", section.title),
        sectionCount
      );
      sectionToggle.addEventListener("click", () => {
        internal.configuration.collapsedSectionIds = collapsed
          ? internal.configuration.collapsedSectionIds.filter((id) => id !== section.id)
          : [...internal.configuration.collapsedSectionIds, section.id];
        markDirty(); renderCameraSuite();
      });
      sectionCard.append(sectionToggle);

      if (!collapsed) {
        const grid = node("div", "camera-card-grid");
        for (const card of cards) {
          const active = internal.configuration.activeCardIds.includes(card.key);
          const variant = currentCameraVariant(card);
          const cardNode = node("article", `camera-card${active ? " is-active" : ""}`);
          const cardHead = node("div", "camera-card-head");
          const toggle = node("label", "camera-card-toggle");
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.checked = active;
          checkbox.setAttribute("aria-label", `Activer ${card.title}`);
          checkbox.addEventListener("change", () => {
            internal.configuration.activeCardIds = checkbox.checked
              ? [...internal.configuration.activeCardIds, card.key]
              : internal.configuration.activeCardIds.filter((id) => id !== card.key);
            cardNode.classList.toggle("is-active", checkbox.checked);
            selectionCount.textContent = `${internal.configuration.activeCardIds.length} active${internal.configuration.activeCardIds.length === 1 ? "" : "s"}`;
            sectionCount.textContent = `${cards.filter(({ key }) => internal.configuration.activeCardIds.includes(key)).length}/${cards.length}`;
            clearSelection.disabled = !internal.configuration.activeCardIds.length && !internal.configuration.incoming.text;
            markDirty(); scheduleCameraSuiteCompile(outputEditor, outputMeta, layerList);
          });
          toggle.append(checkbox, node("span", "check-mark", "✓"), node("b", "", card.title));
          const copy = button("Copier", "text-button");
          copy.addEventListener("click", () => copyText(currentCameraPrompt(card), `${card.title} copié.`));
          cardHead.append(toggle, copy);

          const variantLabel = node("label", "runtime-field", "Variante");
          const select = document.createElement("select");
          card.variants.forEach((candidate) => {
            const option = node("option", "", `${candidate.index + 1} · ${candidate.label}`);
            option.value = String(candidate.index);
            option.selected = candidate.index === variant.index;
            select.append(option);
          });
          const promptEditor = document.createElement("textarea");
          promptEditor.rows = 4;
          promptEditor.maxLength = 100_000;
          promptEditor.value = currentCameraPrompt(card);
          const customBadge = node("small", "camera-custom-badge", Object.hasOwn(internal.configuration.customPrompts, variant.id) ? "Version personnalisée" : "Version relue Astra");
          const revert = button("Rétablir cette variante", "text-button");
          revert.hidden = !Object.hasOwn(internal.configuration.customPrompts, variant.id);
          select.addEventListener("change", () => {
            internal.configuration.variantByCard[card.key] = Number(select.value);
            const next = currentCameraVariant(card);
            promptEditor.value = currentCameraPrompt(card);
            const customized = Object.hasOwn(internal.configuration.customPrompts, next.id);
            customBadge.textContent = customized ? "Version personnalisée" : "Version relue Astra";
            revert.hidden = !customized;
            markDirty(); scheduleCameraSuiteCompile(outputEditor, outputMeta, layerList);
          });
          promptEditor.addEventListener("input", () => {
            const selectedVariant = currentCameraVariant(card);
            if (promptEditor.value === selectedVariant.prompt) delete internal.configuration.customPrompts[selectedVariant.id];
            else internal.configuration.customPrompts[selectedVariant.id] = promptEditor.value;
            const customized = Object.hasOwn(internal.configuration.customPrompts, selectedVariant.id);
            customBadge.textContent = customized ? "Version personnalisée" : "Version relue Astra";
            revert.hidden = !customized;
            markDirty(); scheduleCameraSuiteCompile(outputEditor, outputMeta, layerList);
          });
          revert.addEventListener("click", () => {
            const selectedVariant = currentCameraVariant(card);
            delete internal.configuration.customPrompts[selectedVariant.id];
            promptEditor.value = selectedVariant.prompt;
            customBadge.textContent = "Version relue Astra";
            revert.hidden = true;
            markDirty(); scheduleCameraSuiteCompile(outputEditor, outputMeta, layerList);
          });
          variantLabel.append(select);
          const promptFoot = node("div", "camera-card-foot");
          promptFoot.append(customBadge, revert);
          cardNode.append(cardHead, variantLabel, promptEditor, promptFoot);
          grid.append(cardNode);
        }
        sectionCard.append(grid);
      }
      sectionList.append(sectionCard);
    }

    body.append(controls, outputPanel);
    host.append(body);
    await updateCameraSuiteOutput(outputEditor, outputMeta, layerList);
    host.append(actionBar({
      copy: () => copyText(outputEditor.value),
      send: () => sendToAggregator(outputEditor.value, "Camera Control", "video")
    }));
    const reset = button("Rétablir Camera Control", "reset-tool-button");
    reset.addEventListener("click", () => {
      const customPrompts = internal.configuration.customPrompts;
      internal.configuration = clone(catalog.defaults);
      internal.configuration.customPrompts = customPrompts;
      markDirty(); renderCameraSuite();
      toast("Réglages restaurés. Tes variantes personnalisées sont conservées.");
    });
    host.append(reset);
  }

  async function renderSheet() {
    const catalog = internal.catalog.sheet;
    host.replaceChildren(toolHeader("BZ Sheet", "11 planches techniques et personnage relues par Astra, organisées en deux ateliers compacts."));

    const tabs = node("div", "mode-switch sheet-tabs");
    catalog.tabs.forEach((tab) => {
      const control = button(tab.title);
      control.classList.toggle("is-active", internal.configuration.activeTab === tab.id);
      control.addEventListener("click", () => {
        internal.configuration.activeTab = tab.id;
        markDirty();
        renderSheet().catch((error) => toast(error.message, true));
      });
      tabs.append(control);
    });
    host.append(tabs);

    const cards = node("div", "sheet-card-list");
    for (const card of catalog.cards.filter(({ tab }) => tab === internal.configuration.activeTab)) {
      const details = node("details", "sheet-card");
      details.open = internal.configuration.expandedCardIds.includes(card.id);
      const summary = node("summary", "sheet-card-summary");
      const summaryCopy = node("div", "sheet-card-summary-copy");
      summaryCopy.append(node("b", "", card.title), node("small", "", card.description));
      const ratio = card.settings.aspectRatio ? node("span", "sheet-ratio", card.settings.aspectRatio) : null;
      summary.append(summaryCopy);
      if (ratio) summary.append(ratio);
      details.append(summary);
      details.addEventListener("toggle", () => {
        const expanded = new Set(internal.configuration.expandedCardIds);
        if (details.open) expanded.add(card.id); else expanded.delete(card.id);
        internal.configuration.expandedCardIds = [...expanded];
        markDirty();
      });

      const body = node("div", "sheet-card-body");
      const controls = node("aside", "sheet-card-controls");
      let refresh = async () => {};
      const backgroundPalette = paletteControl({
        label: "Fond cyclo",
        colors: catalog.backgroundPalette,
        selected: (color) => internal.configuration.backgrounds[card.id] === color.id,
        onSelect: (color) => {
          internal.configuration.backgrounds[card.id] = color.id;
          markDirty();
          if (!Object.hasOwn(internal.configuration.customOutputs, card.id)) refresh();
        }
      });
      controls.append(backgroundPalette);
      if (card.id === "posesheet") {
        const poseLabel = node("label", "runtime-field", "Mode de pose");
        const pose = document.createElement("select");
        catalog.weapons.forEach((weapon) => {
          const option = node("option", "", weapon.label);
          option.value = weapon.value;
          option.selected = internal.configuration.weapon === weapon.value;
          pose.append(option);
        });
        poseLabel.append(pose);
        controls.append(poseLabel, node("p", "runtime-note", "None garde la planche standard. « Mains nues » active une vraie grille de combat sans arme."));
        pose.addEventListener("change", () => {
          internal.configuration.weapon = pose.value;
          markDirty();
          if (!Object.hasOwn(internal.configuration.customOutputs, card.id)) refresh();
        });
      }

      if (card.id === "complexexpressionboard") {
        const facsHead = node("div", "sheet-facs-head");
        const count = node("b", "", `${internal.configuration.facsIds.length} / 8 FACS`);
        const random = button("8 aléatoires", "text-button");
        const clear = button("Effacer", "text-button");
        facsHead.append(count, random, clear);
        const selected = node("div", "sheet-facs-selected");
        const facsSearch = document.createElement("input");
        facsSearch.type = "search";
        facsSearch.placeholder = "Rechercher AU, nom ou mouvement…";
        facsSearch.value = internal.configuration.facsSearch;
        const choices = node("div", "sheet-facs-grid");
        const renderFacs = () => {
          count.textContent = `${internal.configuration.facsIds.length} / 8 FACS`;
          selected.replaceChildren();
          internal.configuration.facsIds.forEach((id, index) => {
            const entry = catalog.facs.find((item) => item.id === id);
            const chip = button(`${index + 1}. ${entry.label}`, "sheet-facs-chip");
            chip.title = "Retirer de la sélection";
            chip.addEventListener("click", () => {
              internal.configuration.facsIds = internal.configuration.facsIds.filter((item) => item !== id);
              markDirty(); renderFacs();
              if (!Object.hasOwn(internal.configuration.customOutputs, card.id)) refresh();
            });
            selected.append(chip);
          });
          choices.replaceChildren();
          const query = internal.configuration.facsSearch.trim().toLocaleLowerCase();
          catalog.facs
            .filter((entry) => !query || `${entry.label} ${entry.name} ${entry.visible}`.toLocaleLowerCase().includes(query))
            .forEach((entry) => {
              const choice = button("", "sheet-facs-choice");
              const index = internal.configuration.facsIds.indexOf(entry.id);
              choice.classList.toggle("is-selected", index >= 0);
              choice.append(node("b", "", index >= 0 ? `${index + 1}. ${entry.label}` : entry.label), node("small", "", entry.name));
              choice.title = entry.visible;
              choice.addEventListener("click", () => {
                const current = internal.configuration.facsIds;
                if (current.includes(entry.id)) internal.configuration.facsIds = current.filter((id) => id !== entry.id);
                else if (current.length < 8) internal.configuration.facsIds = [...current, entry.id];
                else return toast("La planche accepte exactement 8 expressions.", true);
                markDirty(); renderFacs();
                if (!Object.hasOwn(internal.configuration.customOutputs, card.id)) refresh();
              });
              choices.append(choice);
            });
        };
        facsSearch.addEventListener("input", () => {
          internal.configuration.facsSearch = facsSearch.value;
          markDirty(); renderFacs();
        });
        random.addEventListener("click", () => {
          const pool = catalog.facs.map(({ id }) => id);
          for (let index = pool.length - 1; index > 0; index -= 1) {
            const swap = crypto.getRandomValues(new Uint32Array(1))[0] % (index + 1);
            [pool[index], pool[swap]] = [pool[swap], pool[index]];
          }
          internal.configuration.facsIds = pool.slice(0, 8);
          markDirty(); renderFacs();
          if (!Object.hasOwn(internal.configuration.customOutputs, card.id)) refresh();
        });
        clear.addEventListener("click", () => {
          internal.configuration.facsIds = [];
          markDirty(); renderFacs();
          if (!Object.hasOwn(internal.configuration.customOutputs, card.id)) refresh();
        });
        controls.append(facsHead, selected, facsSearch, choices);
        renderFacs();
      }

      const promptSide = node("section", "sheet-prompt-side");
      const promptHead = node("div", "ccp-prompt-head");
      const promptMeta = node("small", "ccp-prompt-meta", "Compilation…");
      promptHead.append(node("b", "", "Prompt prêt"), promptMeta);
      const editor = document.createElement("textarea");
      editor.className = "sheet-prompt-editor";
      editor.rows = 20;
      editor.maxLength = 100_000;
      const actions = node("div", "ccp-stage-actions");
      const copy = button("Copier", "quiet-button");
      const rebuild = button("Recompiler depuis les réglages", "quiet-button");
      const send = button("Envoyer à l’agrégateur", "primary-action");
      const resultLink = node("a", "aggregator-result-link", "Ouvrir le brouillon ↗");
      resultLink.target = "barz-aggregator";
      resultLink.hidden = true;
      actions.append(copy, rebuild, send, resultLink);
      promptSide.append(promptHead, editor, actions);

      let latestSettings = {};
      refresh = async ({ force = false } = {}) => {
        if (force) delete internal.configuration.customOutputs[card.id];
        try {
          const payload = await compile({ cardId: card.id });
          const output = payload.outputs[0];
          editor.value = output.prompt;
          latestSettings = output.settings ?? {};
          promptMeta.textContent = output.custom ? "Version personnalisée enregistrée" : "Version relue Astra";
          promptMeta.classList.remove("is-error");
          rebuild.disabled = false;
          send.disabled = false;
        } catch (error) {
          promptMeta.textContent = error.message;
          promptMeta.classList.add("is-error");
          rebuild.disabled = false;
          send.disabled = true;
        }
      };
      editor.addEventListener("input", () => {
        internal.configuration.customOutputs[card.id] = editor.value;
        latestSettings = {};
        promptMeta.textContent = "Version personnalisée enregistrée";
        promptMeta.classList.remove("is-error");
        send.disabled = false;
        markDirty();
      });
      copy.addEventListener("click", () => copyText(editor.value, `${card.title} copié.`));
      rebuild.addEventListener("click", async () => {
        await refresh({ force: true });
        markDirty();
        toast("Prompt recompilé depuis les réglages relus.");
      });
      send.addEventListener("click", () => sendToAggregator(editor.value, `BZ Sheet · ${card.title}`, "image", latestSettings, {}, resultLink));
      body.append(controls, promptSide);
      details.append(body);
      await refresh();
      cards.append(details);
    }
    host.append(cards);

    const reset = button("Rétablir les réglages BZ Sheet", "reset-tool-button");
    reset.addEventListener("click", () => {
      const customOutputs = internal.configuration.customOutputs;
      internal.configuration = clone(catalog.defaults);
      internal.configuration.customOutputs = customOutputs;
      markDirty();
      renderSheet().catch((error) => toast(error.message, true));
      toast("Réglages BZ Sheet restaurés. Tes versions personnalisées sont conservées.");
    });
    host.append(reset);
  }

  function designerWeightLabel(weight) {
    return weight >= 82 ? "fidélité stricte à la source"
      : weight >= 64 ? "transfert guidé par la source"
        : weight >= 42 ? "liberté de style équilibrée" : "réinterprétation guidée par le style";
  }

  async function renderDesigner() {
    const catalog = internal.catalog.designer;
    host.replaceChildren(toolHeader("BZ Designer", "55 recettes de transformation relues par Astra, avec poids de dessin, couleur et scène optionnelle selon la carte."));

    const categories = node("div", "mode-switch designer-categories");
    catalog.categories.forEach((category) => {
      const control = button(`${category.title} · ${category.cardCount}`);
      control.title = category.kicker;
      control.classList.toggle("is-active", internal.configuration.activeCategory === category.id);
      control.addEventListener("click", () => {
        internal.configuration.activeCategory = category.id;
        markDirty();
        renderDesigner().catch((error) => toast(error.message, true));
      });
      categories.append(control);
    });
    host.append(categories);

    const activeCategory = catalog.categories.find(({ id }) => id === internal.configuration.activeCategory);
    if (activeCategory.tabs.length) {
      const tabs = node("div", "designer-subtabs");
      activeCategory.tabs.forEach((tab) => {
        const control = button(`${tab.title} · ${tab.cardCount}`, "text-button");
        control.classList.toggle("is-active", internal.configuration.activeTabs.sketch === tab.id);
        control.addEventListener("click", () => {
          internal.configuration.activeTabs.sketch = tab.id;
          markDirty();
          renderDesigner().catch((error) => toast(error.message, true));
        });
        tabs.append(control);
      });
      host.append(tabs);
    }

    const visibleCards = catalog.cards.filter((card) => card.categoryId === activeCategory.id
      && (!activeCategory.tabs.length || card.tabId === internal.configuration.activeTabs.sketch));
    const refreshers = [];
    if (activeCategory.id === "sketch" && internal.configuration.activeTabs.sketch !== "photo") {
      const weightBar = node("div", "designer-weight-bar");
      const copy = node("div", "designer-weight-copy");
      const value = node("b", "", `${internal.configuration.drawingWeight} / 95`);
      const meaning = node("small", "", designerWeightLabel(internal.configuration.drawingWeight));
      copy.append(node("span", "", "Poids du dessin"), value, meaning);
      const slider = document.createElement("input");
      slider.type = "range";
      slider.min = "20";
      slider.max = "95";
      slider.step = "5";
      slider.value = String(internal.configuration.drawingWeight);
      slider.addEventListener("input", () => {
        internal.configuration.drawingWeight = Number(slider.value);
        value.textContent = `${slider.value} / 95`;
        meaning.textContent = designerWeightLabel(Number(slider.value));
        markDirty();
      });
      slider.addEventListener("change", () => refreshers.forEach((refresh) => refresh()));
      weightBar.append(copy, slider);
      host.append(weightBar);
    }

    const cards = node("div", "designer-card-list");
    for (const card of visibleCards) {
      const details = node("details", `designer-card designer-highlight-${card.highlight ?? "none"}`);
      details.open = internal.configuration.expandedCardIds.includes(card.id);
      const summary = node("summary", "designer-card-summary");
      const summaryCopy = node("div", "designer-card-summary-copy");
      summaryCopy.append(node("b", "", card.title), node("small", "", card.tabId ? activeCategory.tabs.find(({ id }) => id === card.tabId)?.title : activeCategory.kicker));
      summary.append(summaryCopy, node("span", "designer-card-kind", "IMAGE"));
      details.append(summary);
      details.addEventListener("toggle", () => {
        const expanded = new Set(internal.configuration.expandedCardIds);
        if (details.open) expanded.add(card.id); else expanded.delete(card.id);
        internal.configuration.expandedCardIds = [...expanded];
        markDirty();
      });

      const body = node("div", "designer-card-body");
      const controls = node("aside", "designer-card-controls");
      let refresh = async () => {};
      const controlNote = node("p", "runtime-note", card.usesDrawingWeight
        ? "Cette recette suit le poids de dessin commun à l’onglet."
        : "Cette recette conserve son réglage source sans poids global.");
      controls.append(controlNote);

      if (card.id === "sketch-photo-8") {
        const sceneLabel = node("label", "runtime-field", "Scène optionnelle");
        const scene = document.createElement("textarea");
        scene.rows = 6;
        scene.maxLength = 50_000;
        scene.placeholder = "Lieu, lumière, action ou décor à insérer littéralement…";
        scene.value = internal.configuration.scene;
        scene.addEventListener("input", () => {
          internal.configuration.scene = scene.value;
          markDirty();
          clearTimeout(internal.compileTimer);
          internal.compileTimer = setTimeout(() => {
            if (!Object.hasOwn(internal.configuration.customOutputs, card.id)) refresh();
          }, 100);
        });
        sceneLabel.append(scene);
        controls.append(sceneLabel, node("p", "runtime-note", "Le texte est inséré tel quel, sans nettoyage ni interprétation."));
      }

      if (card.colors.length) {
        const selectedColor = internal.configuration.selectedColors[card.id];
        controls.append(paletteControl({
          label: "Fond de la planche",
          colors: card.colors,
          selected: (color) => selectedColor?.name === color.name && selectedColor?.hex === color.hex,
          onSelect: (color) => {
            internal.configuration.selectedColors[card.id] = { name: color.name, hex: color.hex };
            markDirty();
            if (!Object.hasOwn(internal.configuration.customOutputs, card.id)) refresh();
          }
        }));
      }

      const promptSide = node("section", "designer-prompt-side");
      const promptHead = node("div", "ccp-prompt-head");
      const promptMeta = node("small", "ccp-prompt-meta", "Compilation…");
      promptHead.append(node("b", "", "Prompt prêt"), promptMeta);
      const editor = document.createElement("textarea");
      editor.className = "designer-prompt-editor";
      editor.rows = 20;
      editor.maxLength = 100_000;
      const actions = node("div", "ccp-stage-actions");
      const copy = button("Copier", "quiet-button");
      const rebuild = button("Recompiler depuis les réglages", "quiet-button");
      const send = button("Envoyer à l’agrégateur", "primary-action");
      const resultLink = node("a", "aggregator-result-link", "Ouvrir le brouillon ↗");
      resultLink.target = "barz-aggregator";
      resultLink.hidden = true;
      actions.append(copy, rebuild, send, resultLink);
      promptSide.append(promptHead, editor, actions);

      refresh = async ({ force = false } = {}) => {
        if (force) delete internal.configuration.customOutputs[card.id];
        try {
          const payload = await compile({ cardId: card.id });
          const output = payload.outputs[0];
          editor.value = output.prompt;
          promptMeta.textContent = output.custom ? "Version personnalisée enregistrée" : "Version relue Astra";
          promptMeta.classList.remove("is-error");
          send.disabled = false;
        } catch (error) {
          promptMeta.textContent = error.message;
          promptMeta.classList.add("is-error");
          send.disabled = true;
        }
      };
      refreshers.push(() => {
        if (!Object.hasOwn(internal.configuration.customOutputs, card.id)) refresh();
        else promptMeta.textContent = "Version personnalisée conservée · recompile manuelle disponible";
      });
      editor.addEventListener("input", () => {
        internal.configuration.customOutputs[card.id] = editor.value;
        promptMeta.textContent = "Version personnalisée enregistrée";
        promptMeta.classList.remove("is-error");
        send.disabled = false;
        markDirty();
      });
      copy.addEventListener("click", () => copyText(editor.value, `${card.title} copié.`));
      rebuild.addEventListener("click", async () => {
        await refresh({ force: true });
        markDirty();
        toast("Prompt recompilé depuis les réglages relus.");
      });
      send.addEventListener("click", () => sendToAggregator(editor.value, `BZ Designer · ${card.title}`, "image", {}, {}, resultLink));
      body.append(controls, promptSide);
      details.append(body);
      await refresh();
      cards.append(details);
    }
    host.append(cards);

    const reset = button("Rétablir les réglages BZ Designer", "reset-tool-button");
    reset.addEventListener("click", () => {
      const customOutputs = internal.configuration.customOutputs;
      internal.configuration = clone(catalog.defaults);
      internal.configuration.customOutputs = customOutputs;
      markDirty();
      renderDesigner().catch((error) => toast(error.message, true));
      toast("Réglages BZ Designer restaurés. Tes versions personnalisées sont conservées.");
    });
    host.append(reset);
  }

  function knollingSwitch(property, options, labels, rerender) {
    const controls = node("div", "mode-switch knolling-switch");
    for (const value of options) {
      const control = button(labels[value] ?? value);
      control.classList.toggle("is-active", internal.configuration[property] === value);
      control.addEventListener("click", () => {
        if (internal.configuration[property] === value) return;
        internal.configuration[property] = value;
        markDirty();
        rerender();
      });
      controls.append(control);
    }
    return controls;
  }

  function knollingReferenceNote(card) {
    if (card.id === "dresschar") return "Ordre : @image1 personnage · @image2 planche de vêtements.";
    if (card.id === "tattoocharacter") {
      return internal.configuration.tattooBodyMode === "provided-body"
        ? "Ordre : @image1 corps/personnage · @image2 et suivantes tatouages."
        : "Ordre : @image1 et suivantes tatouages · le corps neutre sera généré.";
    }
    if (["apose", "acting"].includes(card.id)) {
      return "Prépare toi-même l’image source avec un point rouge sur chaque acteur à extraire.";
    }
    if (card.tabId === "decor") {
      return internal.configuration.multiReference === "multi"
        ? "@image1 est la référence principale ; les suivantes complètent le même lieu."
        : "@image1 est la référence principale du décor.";
    }
    return "Ajoute l’image source comme @image1 dans le deck de références de l’agrégateur.";
  }

  async function renderKnolling() {
    const catalog = internal.catalog.knolling;
    host.replaceChildren(toolHeader(
      "Knolling Board",
      "17 recettes relues par Astra pour décomposer, habiller, tatouer, extraire et reconstruire."
    ));

    const tabs = node("div", "mode-switch knolling-tabs");
    for (const tab of catalog.tabs) {
      const control = button(`${tab.title} · ${tab.cardCount}`);
      control.classList.toggle("is-active", internal.configuration.activeTab === tab.id);
      control.addEventListener("click", () => {
        internal.configuration.activeTab = tab.id;
        markDirty();
        renderKnolling().catch((error) => toast(error.message, true));
      });
      tabs.append(control);
    }
    host.append(tabs);

    const activeTab = catalog.tabs.find(({ id }) => id === internal.configuration.activeTab);
    let visibleCardIds = [...activeTab.cardIds];
    if (activeTab.id === "generate") {
      const explorer = node("section", "knolling-explorer");
      explorer.append(
        node("b", "", "Knolling Board Explorer"),
        node("small", "", "Chaque variante produit une seule image contenant une grille de 9 propositions.")
      );
      const explorerTabs = node("div", "designer-subtabs");
      for (const id of ["var1", "var2", "var3"]) {
        const card = catalog.cards.find((entry) => entry.id === id);
        const control = button(card.title.replace("9 Variations — ", ""), "text-button");
        control.classList.toggle("is-active", internal.configuration.activeExplorerTab === id);
        control.addEventListener("click", () => {
          internal.configuration.activeExplorerTab = id;
          markDirty();
          renderKnolling().catch((error) => toast(error.message, true));
        });
        explorerTabs.append(control);
      }
      explorer.append(explorerTabs);
      host.append(explorer);
      visibleCardIds = visibleCardIds.filter((id) => !["var1", "var2", "var3"].includes(id));
      visibleCardIds.push(internal.configuration.activeExplorerTab);
    }

    const cards = node("div", "designer-card-list knolling-card-list");
    for (const cardId of visibleCardIds) {
      const card = catalog.cards.find(({ id }) => id === cardId);
      const details = node("details", "designer-card knolling-card");
      details.open = internal.configuration.expandedCardIds.includes(card.id);
      const summary = node("summary", "designer-card-summary");
      const summaryCopy = node("div", "designer-card-summary-copy");
      summaryCopy.append(node("b", "", card.title), node("small", "", card.description));
      summary.append(summaryCopy, node("span", "designer-card-kind", "IMAGE"));
      details.append(summary);
      details.addEventListener("toggle", () => {
        const expanded = new Set(internal.configuration.expandedCardIds);
        if (details.open) expanded.add(card.id); else expanded.delete(card.id);
        internal.configuration.expandedCardIds = [...expanded];
        markDirty();
      });

      const body = node("div", "designer-card-body");
      const controls = node("aside", "designer-card-controls knolling-card-controls");
      controls.append(node("p", "knolling-reference-note", knollingReferenceNote(card)));
      const rerender = () => renderKnolling().catch((error) => toast(error.message, true));

      if (["apose", "acting"].includes(card.id)) {
        controls.append(node("b", "", "Éclairage"), knollingSwitch("lighting", catalog.controls.lighting, {
          original: "Lumière originale", diffuse: "Studio diffus"
        }, rerender));
      }
      if (card.tabId === "decor") {
        controls.append(node("b", "", "Références du lieu"), knollingSwitch(
          "multiReference", catalog.controls.multiReference,
          { single: "Une image", multi: "Plusieurs images" }, rerender
        ));
      }
      if (card.id === "dresschar") {
        controls.append(
          node("b", "", "Type de personnage"),
          knollingSwitch("subject", catalog.controls.subject, { puppet: "Puppet / figurine", human: "Humain" }, rerender),
          node("b", "", "Transfert"),
          knollingSwitch("accessory", catalog.controls.accessory, { clothes: "Vêtements", full: "Kit complet" }, rerender)
        );
      }
      if (card.id === "tattooextract") {
        controls.append(node("b", "", "Carte de placement"), knollingSwitch(
          "tattooPlaceIt", catalog.controls.tattooPlaceIt,
          { off: "Planche seule", on: "Place It" }, rerender
        ));
      }
      if (card.id === "tattoocharacter") {
        controls.append(node("b", "", "Références fournies"), knollingSwitch(
          "tattooBodyMode", catalog.controls.tattooBodyMode,
          { "provided-body": "Corps + tatouages", "tattoos-only": "Tatouages seuls" }, rerender
        ));
        const selected = node("div", "knolling-zone-order");
        internal.configuration.tattooZones.forEach((zone, index) => {
          const row = node("div", "knolling-zone-row");
          const referenceIndex = index + (internal.configuration.tattooBodyMode === "provided-body" ? 2 : 1);
          row.append(node("span", "", `[IMG_${referenceIndex}] · ${zone}`));
          const up = button("↑", "text-button");
          up.disabled = index === 0;
          up.addEventListener("click", () => {
            const values = internal.configuration.tattooZones;
            [values[index - 1], values[index]] = [values[index], values[index - 1]];
            markDirty(); rerender();
          });
          const down = button("↓", "text-button");
          down.disabled = index === internal.configuration.tattooZones.length - 1;
          down.addEventListener("click", () => {
            const values = internal.configuration.tattooZones;
            [values[index], values[index + 1]] = [values[index + 1], values[index]];
            markDirty(); rerender();
          });
          const remove = button("×", "text-button");
          remove.setAttribute("aria-label", `Retirer ${zone}`);
          remove.addEventListener("click", () => {
            internal.configuration.tattooZones.splice(index, 1);
            markDirty(); rerender();
          });
          row.append(up, down, remove);
          selected.append(row);
        });
        controls.append(node("b", "", "Zones · ordre des images"), selected);
        const zoneGrid = node("div", "knolling-zone-grid");
        for (const zone of catalog.controls.tattooZones) {
          const choice = button(zone, "sheet-facs-chip");
          choice.classList.toggle("is-active", internal.configuration.tattooZones.includes(zone));
          choice.disabled = internal.configuration.tattooZones.includes(zone);
          choice.addEventListener("click", () => {
            internal.configuration.tattooZones.push(zone);
            markDirty(); rerender();
          });
          zoneGrid.append(choice);
        }
        controls.append(zoneGrid);
        if (internal.configuration.tattooBodyMode === "provided-body") {
          controls.append(node("p", "runtime-note", "Si une zone est cachée, fournis une vue du même corps où elle est visible ; le prompt n’altère ni pose ni vêtements."));
        }
      }

      controls.append(node(
        "p", "runtime-note",
        "Le pont transmet le prompt et conserve les balises [IMG_n]. Les images restent à placer dans le deck de l’agrégateur."
      ));

      const promptSide = node("section", "designer-prompt-side");
      const promptHead = node("div", "ccp-prompt-head");
      const promptMeta = node("small", "ccp-prompt-meta", "Compilation…");
      promptHead.append(node("b", "", "Prompt prêt"), promptMeta);
      const editor = document.createElement("textarea");
      editor.className = "designer-prompt-editor";
      editor.rows = 20;
      editor.maxLength = 100_000;
      const actions = node("div", "ccp-stage-actions");
      const copy = button("Copier", "quiet-button");
      const rebuild = button("Recompiler depuis les réglages", "quiet-button");
      const send = button("Envoyer à l’agrégateur", "primary-action");
      const resultLink = node("a", "aggregator-result-link", "Ouvrir le brouillon ↗");
      resultLink.target = "barz-aggregator";
      resultLink.hidden = true;
      actions.append(copy, rebuild, send, resultLink);
      promptSide.append(promptHead, editor, actions);

      const refresh = async ({ force = false } = {}) => {
        if (force) delete internal.configuration.customOutputs[card.id];
        try {
          const payload = await compile({ cardId: card.id });
          const output = payload.outputs[0];
          editor.value = output.prompt;
          promptMeta.textContent = output.custom ? "Version personnalisée enregistrée" : "Version relue Astra";
          promptMeta.classList.remove("is-error");
          send.disabled = false;
        } catch (error) {
          promptMeta.textContent = error.message;
          promptMeta.classList.add("is-error");
          send.disabled = true;
        }
      };
      editor.addEventListener("input", () => {
        internal.configuration.customOutputs[card.id] = editor.value;
        promptMeta.textContent = "Version personnalisée enregistrée";
        promptMeta.classList.remove("is-error");
        send.disabled = false;
        markDirty();
      });
      copy.addEventListener("click", () => copyText(editor.value, `${card.title} copié.`));
      rebuild.addEventListener("click", async () => {
        await refresh({ force: true });
        markDirty();
        toast("Prompt recompilé depuis les réglages relus.");
      });
      send.addEventListener("click", () => sendToAggregator(
        editor.value, `Knolling Board · ${card.title}`, "image", {}, {}, resultLink
      ));
      body.append(controls, promptSide);
      details.append(body);
      await refresh();
      cards.append(details);
    }
    host.append(cards);

    const reset = button("Rétablir les réglages Knolling", "reset-tool-button");
    reset.addEventListener("click", () => {
      const customOutputs = internal.configuration.customOutputs;
      internal.configuration = clone(catalog.defaults);
      internal.configuration.customOutputs = customOutputs;
      markDirty();
      renderKnolling().catch((error) => toast(error.message, true));
      toast("Réglages Knolling restaurés. Tes versions personnalisées sont conservées.");
    });
    host.append(reset);
  }

  function seedanceCurrentFinalKey(outputId = "all") {
    const c = internal.configuration;
    return `${c.templateId}__${c.mode}__${c.provider}__${outputId}`;
  }

  function seedanceReady(prompt) {
    const c = internal.configuration;
    const hasDescriptions = c.references.length > 0 || (c.subject.trim() && c.context.trim());
    // The character limit is an editing warning. Aggregator accepts up to 40,000
    // characters, so a long multi-shot video must still be transferable as a draft.
    return Boolean(prompt.trim()) && prompt.length <= 40_000 && hasDescriptions;
  }

  async function seedanceImport(files, { slot } = {}) {
    const setupId = activeSetupId();
    const toolId = internal.toolId;
    const epoch = ++internal.seedanceMediaEpoch;
    try {
      let selected;
      if (slot) selected = [...files].slice(0, 1);
      else {
        const free = 9 - internal.configuration.references.length;
        if (!free) { toast("Les neuf emplacements sont occupés.", true); return false; }
        selected = await chooseSeedanceFiles(files, free);
      }
      if (!selected.length) return false;
      const decoded = await Promise.all(selected.map(async (file) => ({ file, dataUrl: await readImageFile(file) })));
      if (internal.toolId !== toolId || activeSetupId() !== setupId || internal.seedanceMediaEpoch !== epoch) {
        toast("Import ignoré : le setup ou l’emplacement a changé.", true); return false;
      }
      const next = [...internal.configuration.references];
      const freeSlots = Array.from({ length: 9 }, (_unused, index) => index + 1)
        .filter((candidate) => !next.some((reference) => reference.slot === candidate));
      decoded.forEach(({ file, dataUrl }, index) => {
        const targetSlot = slot ?? freeSlots[index];
        const reference = {
          slot: targetSlot,
          imageId: `seedance-image-${crypto.randomUUID().replace(/-/g, "")}`,
          sourceName: file.name,
          dataUrl,
          subject: "",
          context: ""
        };
        const currentIndex = next.findIndex((item) => item.slot === targetSlot);
        if (currentIndex === -1) next.push(reference);
        else next[currentIndex] = reference;
      });
      internal.configuration.references = next.sort((left, right) => left.slot - right.slot);
      markDirty();
      await renderSeedance();
      toast(`${decoded.length} référence(s) importée(s). Les descriptions remplacées ont été effacées.`);
      return true;
    } catch (error) {
      toast(`Import annulé sans modification : ${error.message}`, true);
      return false;
    }
  }

  async function seedanceImportRemote(url, name, slot) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Image inaccessible (HTTP ${response.status}).`);
    const blob = await response.blob();
    const mime = blob.type.split(";", 1)[0].toLowerCase();
    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(mime)) throw new Error("Ce format d’image n’est pas pris en charge.");
    if (blob.size > 7_499_000) throw new Error("L’image dépasse la limite de 10 Mo une fois encodée.");
    const extension = mime === "image/jpeg" ? "jpg" : mime.slice(6);
    const safeName = String(name || "reference").replace(/[\\/:*?"<>|]+/g, "-").replace(/\.(png|jpe?g|webp|gif)$/i, "");
    const imported = await seedanceImport([new File([blob], `${safeName}.${extension}`, { type: mime })], { slot });
    if (!imported) throw new Error("L’image n’a pas été ajoutée au module.");
  }

  function seedanceImageResults(value, items = [], depth = 0) {
    if (!value || depth > 6) return items;
    if (Array.isArray(value)) { value.forEach((entry) => seedanceImageResults(entry, items, depth + 1)); return items; }
    if (typeof value !== "object") return items;
    if (typeof value.url === "string" && (!value.content_type || String(value.content_type).startsWith("image/"))) {
      items.push(value);
    } else Object.values(value).forEach((entry) => seedanceImageResults(entry, items, depth + 1));
    return items;
  }

  function openSeedanceAssets(slot) {
    const dialog = node("dialog", "runtime-dialog seedance-asset-dialog");
    const heading = node("div", "seedance-asset-heading");
    const title = node("h2", "", "Ajouter depuis Assets");
    const close = button("×", "quiet-button");
    close.setAttribute("aria-label", "Fermer");
    close.addEventListener("click", () => dialog.close());
    heading.append(title, close);
    const tabs = node("div", "seedance-asset-tabs");
    const grid = node("div", "seedance-asset-grid");
    const status = node("p", "runtime-note");
    let source = "resources";
    let items = [];
    const render = () => {
      grid.replaceChildren();
      tabs.querySelectorAll("button").forEach((control) => control.classList.toggle("is-active", control.dataset.source === source));
      if (!items.length) { grid.append(node("p", "runtime-note", "Aucune image dans cette source.")); return; }
      items.forEach((item) => {
        const card = button("", "seedance-asset-card");
        const image = document.createElement("img"); image.src = item.url; image.alt = ""; image.loading = "lazy";
        card.append(image, node("span", "", item.name));
        card.addEventListener("click", async () => {
          card.disabled = true; status.textContent = `Import de ${item.name}…`;
          try { await seedanceImportRemote(item.url, item.name, slot); dialog.close(); }
          catch (error) { status.textContent = `Import impossible : ${error.message}`; card.disabled = false; }
        });
        grid.append(card);
      });
    };
    const load = async () => {
      status.textContent = "Chargement des images…";
      try {
        const response = await fetch("http://127.0.0.1:4317/api/state");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const state = await response.json();
        items = source === "resources"
          ? (state.resources || []).filter((item) => item.mediaType === "image")
            .map((item) => ({ name: item.name || item.originalName || "Ressource", url: `http://127.0.0.1:4317/api/resources/${encodeURIComponent(item.id)}/content` }))
          : (state.jobs || []).filter((job) => job.status === "completed" && job.mediaType === "image")
            .flatMap((job) => seedanceImageResults(job.result).map((_item, index) => ({
              name: job.assetNames?.[String(index)] || job.modelLabel || `Image ${index + 1}`,
              url: `http://127.0.0.1:4317/api/jobs/${encodeURIComponent(job.id)}/download/${index}`
            })));
        status.textContent = `${items.length} image(s) disponibles.`;
        render();
      } catch (error) { items = []; status.textContent = `Aggregator indisponible : ${error.message}`; render(); }
    };
    [["resources", "Ressources"], ["generated", "Images générées"]].forEach(([value, label]) => {
      const tab = button(label); tab.dataset.source = value;
      tab.addEventListener("click", () => { source = value; void load(); });
      tabs.append(tab);
    });
    dialog.append(heading, tabs, status, grid);
    document.body.append(dialog);
    dialog.addEventListener("close", () => dialog.remove(), { once: true });
    dialog.showModal();
    void load();
  }

  const seedanceLibraryOrigin = "https://barz-ai-lib.placenta.tv";
  let seedanceLibraryPopup = null;
  let seedanceLibrarySlot = null;
  let seedanceLibraryTimer = null;
  const sendSeedanceLibraryHandshake = () => {
    if (!seedanceLibraryPopup || seedanceLibraryPopup.closed) { clearInterval(seedanceLibraryTimer); return; }
    seedanceLibraryPopup.postMessage({ type: "barz:library-handshake", schemaVersion: "1.0" }, seedanceLibraryOrigin);
  };
  function openSeedanceLibrary(slot) {
    seedanceLibrarySlot = slot;
    const url = new URL(`${seedanceLibraryOrigin}/AI-Asset-Lib-online/`);
    url.searchParams.set("aggregatorOrigin", window.location.origin);
    seedanceLibraryPopup = window.open(url.href, "barz-vmf-reference-library", "popup=yes,width=1440,height=920,resizable=yes,scrollbars=yes");
    if (!seedanceLibraryPopup) return toast("La bibliothèque a été bloquée par le navigateur. Autorise les popups.", true);
    clearInterval(seedanceLibraryTimer);
    sendSeedanceLibraryHandshake();
    seedanceLibraryTimer = setInterval(sendSeedanceLibraryHandshake, 500);
    toast("Bibliothèque ouverte. Choisis une image puis clique sur « Import ref ». ");
  }
  window.addEventListener("message", async (event) => {
    if (event.origin !== seedanceLibraryOrigin || event.source !== seedanceLibraryPopup) return;
    const message = event.data;
    if (message?.type === "barz:library-ready" && message.schemaVersion === "1.0" && message.source === "barz-ai-lib") {
      clearInterval(seedanceLibraryTimer); seedanceLibraryTimer = null; return;
    }
    if (message?.type !== "barz:import-reference" || message.schemaVersion !== "1.0" ||
        message.source !== "barz-ai-lib" || !message.requestId || !message.asset) return;
    const reply = (result) => event.source.postMessage({ type: "barz:import-reference-result", schemaVersion: "1.0", requestId: message.requestId, ...result }, seedanceLibraryOrigin);
    try {
      const response = await fetch("http://127.0.0.1:4317/api/reference-imports/from-library", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(message)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.resource?.id) throw new Error(payload.error || `HTTP ${response.status}`);
      const resource = payload.resource;
      await seedanceImportRemote(`http://127.0.0.1:4317/api/resources/${encodeURIComponent(resource.id)}/content`,
        resource.originalName || resource.name, seedanceLibrarySlot);
      reply({ ok: true, status: "imported", savedToAssets: true, message: "Référence ajoutée à Video Multi Framing." });
    } catch (error) { reply({ ok: false, message: error.message }); toast(`Import depuis la bibliothèque impossible : ${error.message}`, true); }
  });

  function seedanceSourceMenu(slot, label = "Ajouter") {
    const menu = document.createElement("details");
    menu.className = "seedance-source-menu";
    menu.append(node("summary", "quiet-button", label));
    const choices = node("div", "seedance-source-choices");
    [["Add from PC", () => {
      const input = document.createElement("input"); input.type = "file"; input.accept = "image/*";
      input.multiple = !slot; input.hidden = true;
      input.addEventListener("change", () => { if (input.files.length) void seedanceImport(input.files, { slot }); input.remove(); }, { once: true });
      document.body.append(input); input.click();
    }], ["Add from assets", () => openSeedanceAssets(slot)], ["Add from librairie", () => openSeedanceLibrary(slot)]].forEach(([text, action]) => {
      const control = button(text); control.addEventListener("click", () => { menu.open = false; action(); }); choices.append(control);
    });
    menu.append(choices);
    return menu;
  }

  async function seedanceAnalyzeReference(reference, { replace = false } = {}) {
    const settings = await api("/api/v1/image-analyzer/settings");
    const preferred = settings.models.find((item) => item.id === settings.model && settings.keyStates[item.provider]);
    const model = preferred || settings.models.find((item) => settings.keyStates[item.provider]);
    if (!model) throw new Error("Configure une clé de modèle visuel dans l’onglet API avant la description automatique.");
    const result = await api("/api/v1/image-analyzer/analyze", {
      method: "POST", body: JSON.stringify({ imageDataUrl: reference.dataUrl, model: model.id, targetEngine: "Video Multi Framing" })
    });
    const current = internal.configuration.references.find((item) => item.imageId === reference.imageId);
    if (!current) throw new Error("La référence a changé pendant l’analyse.");
    const subject = String(result.seedance?.subject || "").trim();
    const context = String(result.seedance?.context || "").trim();
    if (!subject && !context) throw new Error("L’IA n’a pas renvoyé de sujet ni de contexte. Tu peux les saisir à la main.");
    if (replace || !current.subject.trim()) current.subject = subject || current.subject;
    if (replace || !current.context.trim()) current.context = context || current.context;
    markDirty();
    return result;
  }

  async function seedanceAnalyzeMissingReferences(onProgress = () => {}) {
    const missing = internal.configuration.references.filter((item) => !item.subject.trim() || !item.context.trim());
    for (const [index, reference] of missing.entries()) {
      onProgress(index + 1, missing.length);
      await seedanceAnalyzeReference(reference);
    }
  }

  function parseSeedanceStillBatch(text, expectedIndices) {
    const source = String(text || "").trim();
    const starts = [...source.matchAll(/(?:^|\n)\s*(?:\[?Still\s*)?(\d{1,2})(?:\])?[.)\]:-]\s+/gim)];
    const outputs = new Map();
    starts.forEach((match, index) => {
      const number = Number(match[1]);
      if (!expectedIndices.includes(number)) return;
      const bodyStart = match.index + match[0].length;
      const bodyEnd = index + 1 < starts.length ? starts[index + 1].index : source.length;
      const prompt = source.slice(bodyStart, bodyEnd).trim();
      if (prompt) outputs.set(number, prompt);
    });
    return outputs;
  }

  function openSeedancePreview(reference, thumbnail) {
    const dialog = node("dialog", "seedance-preview-dialog");
    const close = button("×", "seedance-preview-close");
    close.setAttribute("aria-label", "Fermer l’agrandissement");
    close.addEventListener("click", () => dialog.close());
    const image = document.createElement("img");
    image.src = reference.dataUrl;
    image.alt = reference.sourceName || `Référence ${reference.slot}`;
    image.style.width = `${Math.max(320, Math.round(thumbnail.getBoundingClientRect().width * 4))}px`;
    dialog.append(close, image, node("p", "", `${reference.sourceName || `@image${reference.slot}`} · agrandissement ×4`));
    document.body.append(dialog);
    dialog.addEventListener("close", () => dialog.remove(), { once: true });
    dialog.showModal();
  }

  function seedanceSelect(labelText, value, options, onChange) {
    const label = node("label", "runtime-field", labelText);
    const select = document.createElement("select");
    for (const optionValue of options) {
      const option = node("option", "", optionValue.label);
      option.value = optionValue.value;
      option.selected = optionValue.value === value;
      select.append(option);
    }
    select.addEventListener("change", () => onChange(select.value));
    label.append(select);
    return label;
  }

  const seedanceStylePresets = [
    "neutral cinematic realism", "35mm photochemical drama", "16mm documentary texture", "Super 8 memory fragment",
    "anamorphic neo-noir", "high-key studio comedy", "bleached desert western", "golden-hour naturalism",
    "cold procedural thriller", "saturated neon night", "pastel storybook tableau", "brutalist science fiction",
    "gothic expressionism", "1970s paranoid cinema", "1980s practical-effects fantasy", "1990s urban crime film",
    "contemporary prestige drama", "handheld social realism", "dreamlike magical realism", "surreal body horror",
    "polished automotive commercial", "luxury fashion editorial", "music-video graphic color", "archival newsreel",
    "miniature practical set", "stop-motion tactile craft", "monochrome high contrast", "soft diffused romantic haze"
  ];
  const seedanceActionPresets = [
    "Action — escalating physical stakes and decisive movement",
    "Drama — performance-led emotional conflict and reactions",
    "Comedy — readable setup, timing, reaction and reversal",
    "Pursuit / Chase — clear predator-prey geography and acceleration",
    "Thriller — controlled danger, withheld information and mounting pressure",
    "Suspense — delayed payoff, anticipation and a precise reveal",
    "Romance — attraction, hesitation and intimate proximity",
    "Horror — encroaching threat, vulnerability and shock release",
    "Adventure — discovery, obstacles and forward momentum",
    "Mystery — clues, suspicion and progressive revelation",
    "Confrontation — opposing objectives, eyelines and power shifts",
    "Escape — urgent spatial problem-solving and narrowing options",
    "Heist — coordinated tasks, precision and complication",
    "Battle — readable opposing forces, reversals and impact",
    "Survival — physical strain, scarce resources and environmental danger",
    "Tragedy — inevitable consequence and emotional collapse",
    "Wonder — discovery, scale and a sustained awe reveal",
    "Documentary observation — behavior-led action with minimal intervention"
  ];
  const seedanceContextPresets = [
    "controlled studio set", "lived-in apartment interior", "rain-soaked city street at night", "sunlit rural landscape",
    "industrial warehouse with practical haze", "desert road at golden hour", "dense futuristic megacity", "quiet institutional corridor",
    "forest clearing after rain", "crowded restaurant with layered background action", "minimal brutalist chamber", "spacecraft interior with practical controls"
  ];

  function seedancePresetField(key, labelText, placeholder, options) {
    const label = node("label", "runtime-field seedance-preset-field", labelText);
    const input = document.createElement("input");
    const list = document.createElement("datalist");
    list.id = `seedance-${key}-presets`;
    options.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      list.append(option);
    });
    input.setAttribute("list", list.id);
    input.maxLength = 50_000;
    input.placeholder = placeholder;
    input.value = internal.configuration[key] || "";
    input.autocomplete = "off";
    input.addEventListener("input", () => { internal.configuration[key] = input.value; markDirty(); });
    const showSuggestions = () => { try { input.showPicker?.(); } catch {} };
    input.addEventListener("focus", showSuggestions);
    input.addEventListener("click", showSuggestions);
    label.append(input, list, node("small", "seedance-field-hint", "Choisis un preset ou écris librement."));
    return label;
  }

  async function renderSeedance() {
    const catalog = internal.catalog.seedance;
    const c = internal.configuration;
    if (typeof c.storyline !== "string") c.storyline = "";
    if (!Number.isInteger(c.stillCount)) c.stillCount = 10;
    if (!Array.isArray(c.secondarySubjects)) c.secondarySubjects = [];
    if (!Array.isArray(c.secondaryContexts)) c.secondaryContexts = [];
    const availableEngines = catalog.engines || [
      { id: "kling", label: "Kling 3.0", maxDuration: 15 },
      { id: "seedance", label: "Seedance 2.5", maxDuration: 30 },
      { id: "minimax-h3", label: "MiniMax H3", maxDuration: 15 },
      { id: "flux-3", label: "FLUX 3 Video", maxDuration: 20 },
      { id: "wan", label: "Wan 3.0", maxDuration: 30 }
    ];
    if (!availableEngines.some(({ id }) => id === c.provider)) c.provider = "kling";
    const engine = availableEngines.find(({ id }) => id === c.provider) || availableEngines[0];
    c.duration = Math.min(c.duration, engine.maxDuration);
    c.shotCount = Math.min(c.shotCount, c.mode === "multiview" && ["seedance", "wan"].includes(c.provider) ? 60 : 30);
    const template = catalog.templates.find(({ id }) => id === c.templateId) ?? catalog.templates[0];
    host.replaceChildren(toolHeader(
      "Video Multi Framing",
      "25 grammaires de mise en scène · références compactes · prompts adaptés au moteur sélectionné."
    ));

    const mode = node("div", "mode-switch seedance-mode");
    [["stills", "Multi still image"], ["moving", "Séquence vidéo"], ["multiview", "Multiview"]].forEach(([value, label]) => {
      const control = button(label);
      control.classList.toggle("is-active", c.mode === value);
      control.addEventListener("click", () => {
        if (c.mode === value) return;
        c.mode = value;
        if (value === "multiview") {
          c.provider = "seedance";
          c.shotCount = 30;
          c.duration = 15;
          c.charLimit = Math.max(c.charLimit, 12_000);
        } else if (value === "moving") c.shotCount = Math.min(c.shotCount, 30);
        markDirty();
        renderSeedance().catch((error) => toast(error.message, true));
      });
      mode.append(control);
    });
    host.append(mode);

    const layout = node("div", "seedance-layout");
    const controls = node("section", "runtime-controls seedance-controls");
    const categoryOptions = catalog.categoryOrder.flatMap((category) => [
      { value: `heading-${category}`, label: `— ${category} —`, disabled: true },
      ...catalog.templates.filter((item) => item.category === category).map((item) => ({ value: item.id, label: item.name }))
    ]);
    const directorField = node("label", "runtime-field", "Réalisation");
    const director = document.createElement("select");
    categoryOptions.forEach((item) => {
      const option = node("option", "", item.label);
      option.value = item.value;
      option.disabled = Boolean(item.disabled);
      option.selected = item.value === c.templateId;
      director.append(option);
    });
    director.addEventListener("change", () => {
      c.templateId = director.value;
      markDirty();
      renderSeedance().catch((error) => toast(error.message, true));
    });
    directorField.append(director);
    const directorSkill = document.createElement("details");
    directorSkill.className = "seedance-director-skill";
    directorSkill.append(node("summary", "", "Skill de réalisation · chargé par l’IA"), node("p", "runtime-note", template.directorSkill || template.directorNote || template.name));
    if (c.mode !== "multiview") controls.append(directorField, node("p", "runtime-note", c.mode === "stills" ? template.stills.info : template.moving.info), directorSkill);
    else controls.append(node("p", "runtime-note", "Une succession de cadrages indépendants, séparés par des hard cuts, du décor source jusqu’à la Terre vue de l’espace."));

    if (c.mode === "stills") {
      controls.append(seedanceSelect("Nombre d’images", String(c.stillCount),
        Array.from({ length: 30 }, (_unused, index) => ({ value: String(index + 1), label: String(index + 1) })),
        (value) => { c.stillCount = Number(value); markDirty(); renderSeedance().catch((error) => toast(error.message, true)); }));
    }

    if (c.mode === "moving" || c.mode === "multiview") {
      const row = node("div", "seedance-inline-controls");
      row.append(
        seedanceSelect("Moteur / dialecte", c.provider, availableEngines.map((item) => ({ value: item.id, label: `${item.label} · max ${item.maxDuration} s` })), (value) => {
          c.provider = value;
          const nextEngine = availableEngines.find((item) => item.id === value);
          if (nextEngine) c.duration = Math.min(c.duration, nextEngine.maxDuration);
          c.shotCount = Math.min(c.shotCount, c.mode === "multiview" && ["seedance", "wan"].includes(value) ? 60 : 30);
          markDirty();
          renderSeedance().catch((error) => toast(error.message, true));
        }),
        seedanceSelect("Durée", String(c.duration), Array.from({ length: engine.maxDuration }, (_unused, index) => ({ value: String(index + 1), label: `${index + 1} s` })), (value) => { c.duration = Number(value); markDirty(); renderSeedance().catch((error) => toast(error.message, true)); }),
        seedanceSelect("Plans", String(c.shotCount), Array.from({ length: c.mode === "multiview" && ["seedance", "wan"].includes(c.provider) ? 60 : 30 }, (_unused, index) => ({ value: String(index + 1), label: String(index + 1) })), (value) => {
          c.shotCount = Number(value);
          if (c.mode === "multiview" && c.shotCount > 30) c.duration = Math.min(engine.maxDuration, Math.max(c.duration, Math.ceil(c.shotCount / 2)));
          markDirty(); renderSeedance().catch((error) => toast(error.message, true));
        })
      );
      controls.append(row, node("p", "runtime-note seedance-engine-note", `${engine.label} · durée disponible jusqu’à ${engine.maxDuration} secondes. ${c.mode === "multiview" ? "Le nombre de cuts demandé n’est pas garanti par le moteur vidéo." : ""}`));
    }

    const roleInputs = [];
    const imageTokens = Array.from({ length: 9 }, (_unused, index) => `@image${index + 1}`);
    const exactImageToken = (value) => /^@image([1-9])$/i.exec(String(value || "").trim())?.[0]?.toLowerCase() || "";
    const refreshRoleSuggestions = () => {
      roleInputs.forEach((entry) => {
        const usedElsewhere = new Set(roleInputs.filter((other) => other !== entry).map((other) => exactImageToken(other.input.value)).filter(Boolean));
        const current = exactImageToken(entry.input.value);
        const choices = [
          ...imageTokens.filter((token) => token === current || !usedElsewhere.has(token)),
          ...entry.presets
        ];
        entry.list.replaceChildren(...choices.map((value) => {
          const option = document.createElement("option"); option.value = value; return option;
        }));
      });
    };
    const roleGroup = (kind, primaryKey, secondaryKey, primaryLabel, secondaryLabel, presets) => {
      const group = node("div", "seedance-role-group");
      const addRoleField = ({ labelText, value, setValue, removable = false, arrayIndex = -1 }) => {
        const row = node("div", "seedance-role-row");
        const label = node("label", "runtime-field seedance-preset-field", labelText);
        const input = document.createElement("input");
        const list = document.createElement("datalist");
        list.id = `seedance-${kind}-${roleInputs.length}-${crypto.randomUUID().slice(0, 8)}`;
        input.setAttribute("list", list.id); input.maxLength = 50_000; input.autocomplete = "off";
        input.placeholder = kind === "subject" ? "Décris le sujet ou choisis @imageN." : "Choisis @imageN, un preset, ou décris le décor.";
        input.value = value;
        input.addEventListener("input", () => { setValue(input.value); markDirty(); refreshRoleSuggestions(); });
        const showSuggestions = () => { try { input.showPicker?.(); } catch {} };
        input.addEventListener("focus", showSuggestions); input.addEventListener("click", showSuggestions);
        label.append(input, list, node("small", "seedance-field-hint", "Les @image déjà attribuées aux autres rôles sont masquées."));
        row.append(label);
        if (removable) {
          const remove = button("×", "quiet-button seedance-remove-role");
          remove.title = `Retirer ${labelText.toLowerCase()}`;
          remove.addEventListener("click", () => {
            const array = c[secondaryKey];
            if (Number.isInteger(arrayIndex) && arrayIndex >= 0) array.splice(arrayIndex, 1);
            markDirty(); renderSeedance().catch((error) => toast(error.message, true));
          });
          row.append(remove);
        }
        group.append(row);
        roleInputs.push({ input, list, presets, arrayIndex, secondaryKey });
      };
      addRoleField({ labelText: primaryLabel, value: c[primaryKey], setValue: (value) => { c[primaryKey] = value; } });
      c[secondaryKey].forEach((value, index) => addRoleField({ labelText: `${secondaryLabel} ${index + 1}`, value, setValue: (next) => { c[secondaryKey][index] = next; }, removable: true, arrayIndex: index }));
      const add = button(`+ ${secondaryLabel}`, "quiet-button seedance-add-role");
      add.disabled = c[secondaryKey].length >= 8;
      add.addEventListener("click", () => { c[secondaryKey].push(""); markDirty(); renderSeedance().catch((error) => toast(error.message, true)); });
      group.append(add);
      return group;
    };
    controls.append(
      roleGroup("subject", "subject", "secondarySubjects", "Sujet principal", "Sujet secondaire", []),
      roleGroup("context", "context", "secondaryContexts", "Décor principal", "Décor secondaire", seedanceContextPresets),
      seedancePresetField("style", "Style", c.references.length ? "Vide = source-matched" : "Vide = neutral cinematic", seedanceStylePresets)
    );
    refreshRoleSuggestions();
    if (c.mode === "moving") controls.append(seedancePresetField("actionDirection", "Direction d’action", "Choisis une mise en mouvement ou écris librement.", seedanceActionPresets));
    const storylineField = node("label", "runtime-field seedance-storyline-field", "Storyline");
    const storyline = document.createElement("textarea");
    storyline.rows = 4;
    storyline.maxLength = 50_000;
    storyline.placeholder = "Décris l’arc général : situation de départ, évolution, point d’arrivée.";
    storyline.value = c.storyline;
    storyline.addEventListener("input", () => { c.storyline = storyline.value; markDirty(); });
    storylineField.append(storyline, node("small", "seedance-field-hint", "Cette histoire guide l’ordre des plans sans remplacer la direction d’action."));
    controls.append(storylineField);

    const limitField = node("label", "runtime-field", "Limite de caractères");
    const limit = document.createElement("input");
    limit.type = "number";
    limit.min = "300";
    limit.max = "20000";
    limit.step = "100";
    limit.value = String(c.charLimit);
    limit.addEventListener("change", () => {
      c.charLimit = Math.max(300, Math.min(20_000, Math.round(Number(limit.value) || 2500)));
      markDirty();
      renderSeedance().catch((error) => toast(error.message, true));
    });
    limitField.append(limit);
    controls.append(limitField);

    const ai = button("GO ACTION · vérification IA…", "seedance-go-action");
    ai.disabled = true;
    ai.addEventListener("click", async () => {
      ai.disabled = true;
      ai.classList.add("is-working");
      ai.textContent = "GO ACTION · réalisation en cours…";
      try {
        if (c.mode === "stills" || c.mode === "multiview") {
          await seedanceAnalyzeMissingReferences((index, total) => { ai.textContent = `Analyse des images ${index}/${total}…`; });
        }
        const localPayload = await compile({ ignoreSaved: true });
        const localPrompt = localPayload.outputs[0].prompt;
        let result;
        if (c.mode === "moving") {
          result = await api("/api/v1/ai/video-direct", {
            method: "POST",
            body: JSON.stringify({
              model: c.provider,
              director: template.name,
              directorSkill: template.directorSkill || template.directorNote || template.name,
              durationSec: c.duration,
              shotCount: c.shotCount,
              storyline: c.storyline,
              intent: [c.storyline, c.subject, c.context, c.actionDirection].filter(Boolean).join(". "),
              seedThemes: [c.style, template.moving.info].filter(Boolean),
              references: c.references.map((reference) => ({
                ref: `@image${reference.slot}`,
                description: [reference.subject, reference.context].filter(Boolean).join(". "),
                imageBase64: reference.dataUrl
              }))
            })
          });
          c.finals[seedanceCurrentFinalKey()] = result.prompt || localPrompt;
        } else if (c.mode === "multiview") {
          c.finals[seedanceCurrentFinalKey()] = localPrompt;
          result = { model: "analyse visuelle + plan de montage BARZ" };
        } else {
          localPayload.individualOutputs.forEach((item) => { c.finals[item.finalKey] = item.prompt; });
          markDirty();
          let refinedCount = 0;
          let lastModel = "";
          const batches = [];
          for (let offset = 0; offset < localPayload.individualOutputs.length; offset += 5) {
            batches.push(localPayload.individualOutputs.slice(offset, offset + 5));
          }
          for (const [batchIndex, batch] of batches.entries()) {
            ai.textContent = `GO ACTION · stills ${batchIndex + 1}/${batches.length}…`;
            const expected = batch.map((item) => Number(item.id.slice(6)));
            try {
              const answer = await api("/api/v1/ai/refine", {
                method: "POST",
                body: JSON.stringify({
                  prompt: batch.map((item) => `${item.label}: ${item.prompt}`).join("\n\n"),
                  intent: [c.storyline, c.subject, c.context, c.style].filter(Boolean).join(". "),
                  outputType: "image", targetEngine: "Image sequence",
                  transform: `Refine exactly ${batch.length} distinct production-ready still-image prompts. Return a numbered list with the ORIGINAL numbers ${expected.join(", ")}, each on a new line. Do not omit or combine entries. Preserve @imageN references, the source identity and this directing skill: ${template.directorSkill || template.directorNote || template.name}. No introduction or commentary.`
                })
              });
              lastModel = answer.model || lastModel;
              for (const [number, prompt] of parseSeedanceStillBatch(answer.refined, expected)) {
                const key = seedanceCurrentFinalKey(`still-${number}`);
                if (prompt.length <= c.charLimit) { c.finals[key] = prompt; refinedCount += 1; }
              }
            } catch (error) { toast(`Lot ${batchIndex + 1} : ${error.message}. Les stills locales restent disponibles.`, true); }
          }
          c.finals[seedanceCurrentFinalKey()] = localPayload.individualOutputs
            .map((item) => `${item.label}: ${c.finals[item.finalKey]}`).join("\n\n");
          result = { model: lastModel || "composition BARZ", refinedCount };
        }
        markDirty();
        await renderSeedance();
        toast(c.mode === "stills"
          ? `${c.stillCount} stills remplies · ${result.refinedCount} affinées par ${result.model}.`
          : `GO ACTION terminé avec ${result.model}.`);
      } catch (error) {
        toast(error.message, true);
        ai.classList.remove("is-working");
        await armAiButton(ai, "GO ACTION · IA");
      }
    });
    controls.append(ai);
    armAiButton(ai, "GO ACTION · IA");

    const refs = node("section", "seedance-references");
    const refsHead = node("div", "seedance-reference-head");
    refsHead.append(node("div", "", "Références 1–9 · bac compact"));
    const folderInput = document.createElement("input");
    folderInput.type = "file";
    folderInput.accept = "image/*";
    folderInput.multiple = true;
    folderInput.setAttribute("webkitdirectory", "");
    folderInput.hidden = true;
    folderInput.addEventListener("change", () => folderInput.files.length && seedanceImport(folderInput.files));
    const addFolder = button("Importer un dossier", "text-button");
    addFolder.addEventListener("click", () => folderInput.click());
    refsHead.append(seedanceSourceMenu(undefined, "Ajouter"), addFolder, folderInput);
    refs.append(refsHead);
    const refGrid = node("div", "seedance-reference-grid");
    for (let slot = 1; slot <= 9; slot += 1) {
      const reference = c.references.find((item) => item.slot === slot);
      const card = node("article", "seedance-reference-card");
      card.append(node("b", "seedance-reference-label", `@image${slot}`));
      if (reference) {
        const image = document.createElement("img");
        image.src = reference.dataUrl;
        image.alt = reference.sourceName || `Référence ${slot}`;
        image.tabIndex = 0;
        image.setAttribute("role", "button");
        image.setAttribute("aria-label", `Agrandir ${image.alt} quatre fois`);
        image.title = "Double-clic pour agrandir ×4";
        image.addEventListener("dblclick", () => openSeedancePreview(reference, image));
        image.addEventListener("keydown", (event) => { if (event.key === "Enter") openSeedancePreview(reference, image); });
        const replace = seedanceSourceMenu(slot, "Remplacer");
        const remove = button("Retirer", "text-button warning-text");
        remove.addEventListener("click", () => {
          internal.seedanceMediaEpoch += 1;
          c.references = c.references.filter((item) => item.slot !== slot);
          markDirty();
          renderSeedance().catch((error) => toast(error.message, true));
        });
        const cardActions = node("div", "seedance-reference-actions");
        cardActions.append(replace, remove);
        card.append(image, node("small", "seedance-source-name", reference.sourceName), cardActions);
        const details = document.createElement("details");
        details.className = "seedance-reference-details";
        details.append(node("summary", "", "Décrire la référence"));
        const autoDescribe = button("Auto describe · IA", "seedance-auto-describe");
        autoDescribe.addEventListener("click", async () => {
          autoDescribe.disabled = true; autoDescribe.textContent = "Analyse en cours…";
          try { await seedanceAnalyzeReference(reference, { replace: true }); await renderSeedance(); toast(`Sujet et contexte de @image${slot} remplis. Tu peux les modifier à la main.`); }
          catch (error) { autoDescribe.disabled = false; autoDescribe.textContent = "Auto describe · IA"; toast(error.message, true); }
        });
        details.append(autoDescribe);
        [["subject", "Sujet de l’image"], ["context", "Contexte de l’image"]].forEach(([key, labelText]) => {
          const field = node("label", "runtime-field", labelText);
          const input = document.createElement("input");
          input.maxLength = 50_000;
          input.value = reference[key];
          input.addEventListener("input", () => { reference[key] = input.value; markDirty(); });
          field.append(input);
          details.append(field);
        });
        card.append(details);
      } else {
        card.append(node("span", "seedance-slot-placeholder", "Emplacement vide"), seedanceSourceMenu(slot));
      }
      refGrid.append(card);
    }
    refs.append(refGrid, node("p", "runtime-note seedance-reference-note", "Double-clique une image pour l’agrandir ×4. « Auto describe » remplit sujet et contexte, modifiables à la main."));

    const outputPanel = node("section", "runtime-output seedance-output");
    const outputKey = seedanceCurrentFinalKey();
    const editor = document.createElement("textarea");
    editor.className = "ccp-prompt-editor seedance-main-editor";
    editor.rows = c.mode === "stills" ? 16 : 24;
    editor.maxLength = 100_000;
    editor.placeholder = "Clique sur « Recompiler depuis les réglages » pour créer cette finale.";
    editor.value = c.finals[outputKey] ?? "";
    const meta = node("small", "ccp-prompt-meta");
    const refreshMeta = () => {
      const count = editor.value.length;
      const status = !editor.value ? "Finale non compilée" : `${count} / ${c.charLimit} caractères`;
      meta.textContent = status;
      meta.classList.toggle("is-error", count > c.charLimit);
    };
    refreshMeta();
    editor.addEventListener("input", () => {
      c.finals[outputKey] = editor.value;
      markDirty();
      refreshMeta();
    });
    const actions = node("div", "ccp-stage-actions");
    const copy = button("Copier la finale", "quiet-button");
    copy.addEventListener("click", () => copyText(editor.value));
    const rebuild = button("Recompiler depuis les réglages", "primary-action");
    rebuild.addEventListener("click", async () => {
      try {
        const payload = await compile({ ignoreSaved: true });
        c.finals[payload.outputs[0].finalKey] = payload.outputs[0].prompt;
        payload.individualOutputs.forEach((item) => { c.finals[item.finalKey] = item.prompt; });
        markDirty();
        await renderSeedance();
        toast("Finale recompilée explicitement depuis les réglages.");
      } catch (error) { toast(error.message, true); }
    });
    actions.append(copy, rebuild);
    if (c.mode === "moving" || c.mode === "multiview") {
      const send = button("Envoyer à l’agrégateur", "primary-action");
      send.disabled = !seedanceReady(editor.value);
      send.title = send.disabled ? "Ajoute une référence ou décris le sujet et le décor avant l’envoi." : "Le brouillon et ses références seront créés sans lancer de génération.";
      const link = node("a", "aggregator-result-link", "Ouvrir le brouillon ↗");
      link.target = "barz-aggregator";
      link.hidden = true;
      send.addEventListener("click", async () => {
        const previous = send.textContent; send.disabled = true; send.textContent = "Envoi des références…";
        try {
          const references = await uploadSeedanceReferences(c.references, uploadImageReference);
          const aggregatorPrompt = remapSeedancePromptForAggregator(editor.value, c.references);
          const wanEndpoint = c.provider === "wan" ? (references.length
            ? "alibaba/wan-3.0/reference-to-video" : "alibaba/wan-3.0/text-to-video") : "";
          await sendToAggregator(aggregatorPrompt, c.mode === "multiview" ? "Video Multi Framing · Multiview" : `Video Multi Framing · ${template.name}`, "video",
            { durationSeconds: c.duration }, { provider: wanEndpoint ? "fal" : "", endpointId: wanEndpoint,
              modelFamily: engine.shortLabel || engine.label, modelHint: engine.label }, link, "", references);
        } catch (error) { toast(`Envoi impossible : ${error.message}`, true); }
        finally { send.textContent = previous; send.disabled = !seedanceReady(editor.value); }
      });
      actions.append(send, link);
    }
    outputPanel.append(node("div", "ccp-prompt-head", "Finale enregistrée"), meta, editor, actions);

    if (c.mode === "moving" || c.mode === "multiview") {
      const warnings = node("div", "seedance-warnings");
      if (c.mode === "moving" && c.shotCount > 7) warnings.append(node("p", "runtime-note", `Les 7 mouvements historiques seront répétés explicitement sur ${Math.ceil(c.shotCount / 7)} cycles.`));
      if (c.duration / c.shotCount < 0.5) warnings.append(node("p", "runtime-note warning-text", "Attention : durée moyenne inférieure à 0,5 s par plan."));
      outputPanel.append(warnings);
    } else {
      const stillActions = node("div", "ccp-stage-actions");
      const copyAll = button(`Copier la liste des ${c.stillCount} images`, "quiet-button");
      copyAll.addEventListener("click", () => {
        const text = Array.from(outputPanel.querySelectorAll("[data-still-editor]")).map((item, index) => `[Still ${index + 1}]\n${item.value}`).join("\n\n");
        copyText(text, `Liste des ${c.stillCount} images copiée.`);
      });
      const exportQueue = button("Export queue to Aggregator", "primary-action");
      const refreshExportQueue = () => {
        const prompts = [...outputPanel.querySelectorAll("[data-still-editor]")].map((item) => item.value);
        exportQueue.disabled = prompts.length !== c.stillCount || prompts.some((prompt) => !seedanceReady(prompt));
        exportQueue.title = exportQueue.disabled ? "Remplis toutes les stills avec GO ACTION ou Recompiler avant l’export." : "Envoie les brouillons, sans lancer de génération payante.";
      };
      exportQueue.addEventListener("click", async () => {
        exportQueue.disabled = true; exportQueue.textContent = "Export de la file…";
        try {
          const references = await uploadSeedanceReferences(c.references, uploadImageReference);
          const items = [...outputPanel.querySelectorAll("[data-still-editor]")].map((field, index) => ({
            schemaVersion: "1.0",
            source: { app: "prompt-atlas", version: "6.0.0", module: `Video Multi Framing · Still ${index + 1}` },
            mediaType: "image", prompt: remapSeedancePromptForAggregator(field.value, c.references),
            negativePrompt: "", target: {}, settings: {}, references, createdAt: new Date().toISOString()
          }));
          const response = await fetch("http://127.0.0.1:4317/api/import-queues/image", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ requestId: crypto.randomUUID(), items })
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok || payload.drafts?.length !== items.length) throw new Error(payload.error || `HTTP ${response.status}`);
          openSuiteApp("aggregator", `http://127.0.0.1:4317/?draft=${encodeURIComponent(payload.drafts[0].id)}`);
          toast(`${items.length} images ajoutées à la file de l’Aggregator. Aucune génération lancée.`);
        } catch (error) { toast(`Export impossible : ${error.message}`, true); }
        finally { exportQueue.textContent = "Export queue to Aggregator"; refreshExportQueue(); }
      });
      stillActions.append(copyAll, exportQueue);
      outputPanel.append(stillActions);
      const list = node("div", "seedance-still-list");
      for (let index = 1; index <= c.stillCount; index += 1) {
        const key = seedanceCurrentFinalKey(`still-${index}`);
        const details = document.createElement("details");
        details.className = "ccp-stage seedance-still-card";
        if (index === 1) details.open = true;
        details.append(node("summary", "", `Still ${index}`));
        const stillEditor = document.createElement("textarea");
        stillEditor.className = "ccp-prompt-editor";
        stillEditor.rows = 9;
        stillEditor.maxLength = 100_000;
        stillEditor.dataset.stillEditor = String(index);
        stillEditor.placeholder = "Recompile pour créer cette image fixe.";
        stillEditor.value = c.finals[key] ?? "";
        const stillMeta = node("small", "ccp-prompt-meta", `${stillEditor.value.length} / ${c.charLimit} caractères`);
        const stillButtons = node("div", "ccp-stage-actions");
        const stillCopy = button("Copier", "quiet-button");
        const stillSend = button("Envoyer cette image", "primary-action");
        const stillLink = node("a", "aggregator-result-link", "Ouvrir le brouillon ↗");
        stillLink.target = "barz-aggregator";
        stillLink.hidden = true;
        const updateStill = () => {
          c.finals[key] = stillEditor.value;
          stillMeta.textContent = `${stillEditor.value.length} / ${c.charLimit} caractères`;
          stillMeta.classList.toggle("is-error", stillEditor.value.length > c.charLimit);
          stillSend.disabled = !seedanceReady(stillEditor.value);
          refreshExportQueue();
          markDirty();
        };
        stillEditor.addEventListener("input", updateStill);
        stillCopy.addEventListener("click", () => copyText(stillEditor.value, `Still ${index} copié.`));
        stillSend.disabled = !seedanceReady(stillEditor.value);
        stillSend.addEventListener("click", async () => {
          const previous = stillSend.textContent; stillSend.disabled = true; stillSend.textContent = "Envoi des références…";
          try {
            const references = await uploadSeedanceReferences(c.references, uploadImageReference);
            const aggregatorPrompt = remapSeedancePromptForAggregator(stillEditor.value, c.references);
            await sendToAggregator(aggregatorPrompt, `Video Multi Framing · ${template.name} · Still ${index}`, "image", {}, {}, stillLink, "", references);
          } catch (error) { toast(`Envoi impossible : ${error.message}`, true); }
          finally { stillSend.textContent = previous; stillSend.disabled = !seedanceReady(stillEditor.value); }
        });
        stillButtons.append(stillCopy, stillSend, stillLink);
        details.append(stillMeta, stillEditor, stillButtons);
        list.append(details);
      }
      outputPanel.append(list);
      refreshExportQueue();
    }

    layout.append(controls, outputPanel);
    host.append(refs, layout);
    const reset = button("Rétablir les réglages Video Multi Framing", "reset-tool-button");
    reset.addEventListener("click", () => {
      const references = c.references;
      const finals = c.finals;
      internal.seedanceMediaEpoch += 1;
      internal.configuration = clone(catalog.defaults);
      internal.configuration.references = references;
      internal.configuration.finals = finals;
      markDirty();
      renderSeedance().catch((error) => toast(error.message, true));
      toast("Réglages restaurés. Tes références et finales personnelles sont conservées.");
    });
    host.append(reset);
  }

  function multishotGridControl(key, rerender) {
    const field = node("label", "runtime-field", key === "cols" ? "Colonnes" : "Lignes");
    const select = document.createElement("select");
    for (const value of [2, 3, 4]) {
      const option = node("option", "", String(value));
      option.value = String(value);
      option.selected = internal.configuration.grid[key] === value;
      select.append(option);
    }
    select.addEventListener("change", () => {
      internal.configuration.grid[key] = Number(select.value);
      markDirty();
      rerender();
    });
    field.append(select);
    return field;
  }

  async function renderMultishot() {
    const catalog = internal.catalog.multishot;
    const tabLabels = {
      camera: "Camera Angles",
      multishot: "Multishot Sequences",
      actionboard: "Action Boards"
    };
    host.replaceChildren(toolHeader(
      "BZ Multishot",
      "Angles caméra, séquences cohérentes et action boards relus par Astra."
    ));

    const tabs = node("div", "mode-switch multishot-tabs");
    for (const tabId of catalog.tabs) {
      const control = button(tabLabels[tabId] ?? tabId);
      control.classList.toggle("is-active", internal.configuration.activeTab === tabId);
      control.addEventListener("click", () => {
        internal.configuration.activeTab = tabId;
        markDirty();
        renderMultishot().catch((error) => toast(error.message, true));
      });
      tabs.append(control);
    }
    host.append(tabs);

    const activeTab = internal.configuration.activeTab;
    const selectedId = activeTab === "camera"
      ? internal.configuration.selectedCameraId
      : internal.configuration.selectedCardIds[activeTab];
    const selectedCard = catalog.cards.find(({ id }) => id === selectedId);
    const selectedCamera = catalog.camera.find(({ id }) => id === selectedId);

    if (activeTab !== "camera" && !selectedCard?.noGridAdapt) {
      const toolbar = node("section", "multishot-toolbar");
      const grid = node("div", "multishot-grid-controls");
      const rerender = () => renderMultishot().catch((error) => toast(error.message, true));
      grid.append(
        node("b", "", "Grille"),
        multishotGridControl("cols", rerender),
        multishotGridControl("rows", rerender),
        node(
          "span",
          "multishot-panel-count",
          `${internal.configuration.grid.cols * internal.configuration.grid.rows} panneaux`
        )
      );
      toolbar.append(grid);
      if (selectedId === "multishot-1") {
        const flash = node("label", "toggle-field multishot-flash");
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = internal.configuration.hardFlashEnabled;
        input.addEventListener("change", () => {
          internal.configuration.hardFlashEnabled = input.checked;
          markDirty();
          rerender();
        });
        flash.append(input, node("span", "check-mark", "✓"), node("span", "", "Hard Flash"));
        toolbar.append(flash);
      }
      host.append(toolbar);
    } else if (selectedCard?.noGridAdapt) {
      host.append(node(
        "p",
        "runtime-note multishot-single-note",
        "Prompt image unique : son flash et son format 3:2 restent intrinsèques au texte."
      ));
    }

    const body = node("div", "runtime-grid multishot-workspace");
    const browser = node("aside", "runtime-card-browser multishot-browser");
    const list = node("div", "multishot-card-list");

    if (activeTab === "camera") {
      const filters = node("div", "mode-switch multishot-filters");
      const filterLabels = { all: "Tous", Shots: "Shots", Movements: "Movements" };
      const applyCameraFilter = () => {
        const query = internal.configuration.cameraSearch.trim().toLocaleLowerCase();
        for (const item of list.children) {
          const entry = catalog.camera.find(({ id }) => id === item.dataset.outputId);
          const matchesType = internal.configuration.cameraType === "all"
            || entry.type === internal.configuration.cameraType;
          const searchable = `${entry.name} ${entry.prompt}`.toLocaleLowerCase();
          item.hidden = !matchesType || !searchable.includes(query);
        }
      };
      for (const value of ["all", "Shots", "Movements"]) {
        const filter = button(filterLabels[value]);
        filter.classList.toggle("is-active", internal.configuration.cameraType === value);
        filter.addEventListener("click", () => {
          internal.configuration.cameraType = value;
          markDirty();
          renderMultishot().catch((error) => toast(error.message, true));
        });
        filters.append(filter);
      }
      const search = document.createElement("input");
      search.type = "search";
      search.maxLength = 500;
      search.placeholder = "Rechercher un angle ou un prompt…";
      search.value = internal.configuration.cameraSearch;
      search.addEventListener("input", () => {
        internal.configuration.cameraSearch = search.value;
        markDirty();
        applyCameraFilter();
      });
      browser.append(filters, search);
      for (const entry of catalog.camera) {
        const item = button("", "multishot-list-item");
        item.dataset.outputId = entry.id;
        item.classList.toggle("is-selected", entry.id === selectedId);
        item.append(
          node("b", "", entry.name),
          node("small", "", `${entry.type} · ${entry.subType}`)
        );
        item.addEventListener("click", () => {
          internal.configuration.selectedCameraId = entry.id;
          markDirty();
          renderMultishot().catch((error) => toast(error.message, true));
        });
        list.append(item);
      }
      applyCameraFilter();
    } else {
      const entries = activeTab === "multishot"
        ? [{ id: "multi-angle", title: "Multi-Angle", description: "Même sujet, points de vue distincts." },
          ...catalog.cards.filter(({ tab }) => tab === activeTab)]
        : catalog.cards.filter(({ tab }) => tab === activeTab);
      for (const entry of entries) {
        const item = button("", "multishot-list-item");
        item.classList.toggle("is-selected", entry.id === selectedId);
        item.append(
          node("b", "", entry.title),
          node("small", "", entry.noGridAdapt ? "IMAGE UNIQUE" : "CONTACT SHEET")
        );
        item.addEventListener("click", () => {
          internal.configuration.selectedCardIds[activeTab] = entry.id;
          markDirty();
          renderMultishot().catch((error) => toast(error.message, true));
        });
        list.append(item);
      }
    }
    browser.append(list);

    const promptSide = node("section", "runtime-output multishot-prompt-side");
    const title = selectedCamera?.name ?? (selectedId === "multi-angle"
      ? "Multi-Angle"
      : selectedCard?.title);
    const promptHead = node("div", "ccp-prompt-head");
    const promptMeta = node("small", "ccp-prompt-meta", "Compilation…");
    promptHead.append(node("b", "", title), promptMeta);

    if (selectedCamera) {
      promptSide.append(node("p", "multishot-camera-context", selectedCamera.context));
    }
    if (selectedId === "multi-angle") {
      const subjectLabel = node("label", "runtime-field", "Sujet / référence");
      const subject = document.createElement("textarea");
      subject.rows = 4;
      subject.maxLength = 50_000;
      subject.placeholder = "Décris le sujet commun à toutes les vues…";
      subject.value = internal.configuration.subject;
      subjectLabel.append(subject);
      promptSide.append(subjectLabel);
      subject.addEventListener("input", () => {
        internal.configuration.subject = subject.value;
        markDirty();
        clearTimeout(internal.compileTimer);
        internal.compileTimer = setTimeout(() => {
          if (!Object.hasOwn(internal.configuration.customOutputs, selectedId)) refresh();
          else promptMeta.textContent = "Version personnalisée conservée · recompile manuelle disponible";
        }, 100);
      });
    }

    const editor = document.createElement("textarea");
    editor.className = "ccp-prompt-editor multishot-prompt-editor";
    editor.rows = 24;
    editor.maxLength = 100_000;
    const actions = node("div", "ccp-stage-actions");
    const copy = button("Copier", "quiet-button");
    const rebuild = button("Recompiler depuis les réglages", "quiet-button");
    const iterate = button("Itération IA…", "quiet-button");
    iterate.disabled = true;
    const send = button("Envoyer à l’agrégateur", "primary-action");
    const resultLink = node("a", "aggregator-result-link", "Ouvrir le brouillon ↗");
    resultLink.target = "barz-aggregator";
    resultLink.hidden = true;
    actions.append(copy, rebuild, iterate, send, resultLink);
    promptSide.append(promptHead, editor, actions);

    const refresh = async ({ force = false } = {}) => {
      if (force) delete internal.configuration.customOutputs[selectedId];
      try {
        const payload = await compile({ outputId: selectedId });
        const output = payload.outputs[0];
        editor.value = output.prompt;
        promptMeta.textContent = output.custom
          ? "Version personnalisée enregistrée"
          : "Version relue Astra";
        promptMeta.classList.remove("is-error");
        send.disabled = false;
      } catch (error) {
        promptMeta.textContent = error.message;
        promptMeta.classList.add("is-error");
        send.disabled = true;
      }
    };
    editor.addEventListener("input", () => {
      internal.configuration.customOutputs[selectedId] = editor.value;
      promptMeta.textContent = "Version personnalisée enregistrée";
      promptMeta.classList.remove("is-error");
      send.disabled = false;
      markDirty();
    });
    copy.addEventListener("click", () => copyText(editor.value, `${title} copié.`));
    iterate.addEventListener("click", async () => {
      const source = editor.value.trim();
      if (!source) return toast("Compile d’abord un prompt à faire évoluer.", true);
      iterate.disabled = true;
      iterate.textContent = "Itération en cours…";
      try {
        const result = await api("/api/v1/ai/refine", {
          method: "POST",
          body: JSON.stringify({
            prompt: source,
            outputType: selectedCamera?.type === "Movements" ? "video" : "image",
            intent: `Créer une nouvelle variation de ${title} sans perdre le sujet, les références ni la structure de plans.`,
            transform: "Propose une variation substantielle, cohérente et directement exploitable. Conserve les références @imageN/IMG_N, les contraintes de grille et le format de sortie."
          })
        });
        editor.value = result.refined || source;
        internal.configuration.customOutputs[selectedId] = editor.value;
        promptMeta.textContent = `Itération IA · ${result.model}`;
        promptMeta.classList.remove("is-error");
        send.disabled = false;
        markDirty();
        toast("Variation IA enregistrée dans le prompt courant.");
      } catch (error) {
        toast(error.message, true);
      } finally {
        armAiButton(iterate, "Itérer avec l’IA");
      }
    });
    rebuild.addEventListener("click", async () => {
      await refresh({ force: true });
      markDirty();
      toast("Prompt recompilé depuis les réglages relus.");
    });
    send.addEventListener("click", () => sendToAggregator(
      editor.value,
      `BZ Multishot · ${title}`,
      selectedCamera?.type === "Movements" ? "video" : "image",
      {},
      {},
      resultLink
    ));

    body.append(browser, promptSide);
    host.append(body);
    armAiButton(iterate, "Itérer avec l’IA");
    await refresh();

    const reset = button("Rétablir les réglages BZ Multishot", "reset-tool-button");
    reset.addEventListener("click", () => {
      const customOutputs = internal.configuration.customOutputs;
      internal.configuration = clone(catalog.defaults);
      internal.configuration.customOutputs = customOutputs;
      markDirty();
      renderMultishot().catch((error) => toast(error.message, true));
      toast("Réglages Multishot restaurés. Tes versions personnalisées sont conservées.");
    });
    host.append(reset);
  }

  function ccpPanelCodes() {
    const { cols, rows } = internal.configuration.grid;
    return Array.from({ length: rows }, (_, row) =>
      Array.from({ length: cols }, (_, col) => `${String.fromCharCode(65 + row)}${col + 1}`)
    ).flat();
  }

  function ccpModeSwitch(stageId, rerender) {
    const controls = node("div", "mode-switch ccp-mode-switch");
    [["puppet", "Puppet / figurine"], ["human", "Humain"]].forEach(([value, label]) => {
      const control = button(label);
      control.classList.toggle("is-active", internal.configuration.modes[stageId] === value);
      control.addEventListener("click", () => {
        if (internal.configuration.modes[stageId] === value) return;
        internal.configuration.modes[stageId] = value;
        markDirty();
        rerender();
      });
      controls.append(control);
    });
    return controls;
  }

  async function renderCcp() {
    const catalog = internal.catalog.ccp;
    host.replaceChildren(toolHeader("CCP", "Consistent Character Process · du contact sheet au rendu isolé, sans perdre l’identité du personnage."));

    const toolbar = node("div", "ccp-toolbar");
    toolbar.append(node("div", "ccp-flow", "A1 Contact sheet  →  A2 Character sheet  →  B Storyboard  →  C Image isolée"));
    const gridControls = node("div", "ccp-grid-controls");
    const gridTitle = node("b", "", "Grille A1 / B");
    for (const [key, label] of [["cols", "Colonnes"], ["rows", "Lignes"]]) {
      const field = node("label", "runtime-field", label);
      const select = document.createElement("select");
      for (const value of [2, 3, 4]) {
        const option = node("option", "", String(value));
        option.value = String(value);
        option.selected = internal.configuration.grid[key] === value;
        select.append(option);
      }
      select.addEventListener("change", () => {
        internal.configuration.grid[key] = Number(select.value);
        markDirty();
        renderCcp().catch((error) => toast(error.message, true));
      });
      field.append(select);
      gridControls.append(field);
    }
    toolbar.append(gridTitle, gridControls);
    host.append(toolbar);

    const stageDescriptions = {
      a1: "Fabrique une couverture multi-angle cohérente à partir de l’image principale.",
      a2: "Produit les 7 vues techniques fixes du même personnage, indépendamment de la grille.",
      b: "Transforme une scène en storyboard séquentiel et permet d’en produire des variations.",
      c: "Isole un panneau valide du storyboard en une seule image cinématographique."
    };
    const stageList = node("div", "ccp-stage-list");

    for (const [index, stage] of catalog.stages.entries()) {
      const collapsed = internal.configuration.collapsedStageIds.includes(stage.id);
      const details = node("details", "ccp-stage");
      details.open = !collapsed;
      const summary = node("summary", "ccp-stage-summary");
      summary.append(
        node("span", "ccp-step", `0${index + 1}`),
        node("div", "ccp-stage-title", ""),
        node("span", "ccp-stage-status", stage.id === "b" ? `Take ${internal.configuration.iterationTake + 1}` : "IMAGE")
      );
      summary.querySelector(".ccp-stage-title").append(node("b", "", stage.title), node("small", "", stageDescriptions[stage.id]));
      details.append(summary);
      details.addEventListener("toggle", () => {
        const values = new Set(internal.configuration.collapsedStageIds);
        if (details.open) values.delete(stage.id); else values.add(stage.id);
        internal.configuration.collapsedStageIds = [...values];
        markDirty();
      });

      {
        const stageBody = node("div", "ccp-stage-body");
        const controls = node("div", "ccp-stage-controls");
        const promptSide = node("div", "ccp-prompt-side");

        if (stage.id !== "a1") controls.append(ccpModeSwitch(stage.id, () => renderCcp().catch((error) => toast(error.message, true))));
        if (stage.id === "a1") controls.append(node("p", "runtime-note", `Sortie actuelle : ${internal.configuration.grid.cols} × ${internal.configuration.grid.rows}, ${internal.configuration.grid.cols * internal.configuration.grid.rows} panneaux, codes en ordre ligne par ligne.`));
        if (stage.id === "a2") controls.append(node("p", "runtime-note", "La planche A2 garde toujours 7 vues : 4 corps entiers et 3 portraits. La grille A1/B ne la modifie pas."));

        if (stage.id === "b") {
          const sceneLabel = node("label", "runtime-field", "Scène utilisateur");
          const scene = document.createElement("textarea");
          scene.rows = 7;
          scene.maxLength = 50_000;
          scene.placeholder = "Décris l’action, le lieu, l’atmosphère et les moments indispensables…";
          scene.value = internal.configuration.scene;
          scene.addEventListener("input", () => {
            if (internal.configuration.scene !== scene.value) internal.configuration.iterationTake = 0;
            internal.configuration.scene = scene.value;
            markDirty();
            refreshSoon();
          });
          sceneLabel.append(scene);
          const iterate = button(`Nouvelle variation · Take ${internal.configuration.iterationTake + 2}`, "quiet-button ccp-iterate");
          iterate.addEventListener("click", () => {
            internal.configuration.iterationTake += 1;
            delete internal.configuration.customOutputs.b;
            markDirty();
            renderCcp().catch((error) => toast(error.message, true));
          });
          controls.append(sceneLabel, iterate);
        }

        let panelError = "";
        if (stage.id === "c") {
          const panelLabel = node("label", "runtime-field", "Code du panneau source");
          const panel = document.createElement("input");
          panel.maxLength = 16;
          panel.value = internal.configuration.panelCode;
          panel.placeholder = "A1";
          const validCodes = ccpPanelCodes();
          const codeHelp = node("small", "ccp-code-help", `Codes disponibles : ${validCodes.join(", ")}`);
          const error = node("small", "ccp-inline-error");
          const updatePanelError = () => {
            const normalized = panel.value.trim().toUpperCase() || "A1";
            panelError = validCodes.includes(normalized) ? "" : `Code invalide pour cette grille : ${normalized}.`;
            error.textContent = panelError;
            panel.classList.toggle("is-invalid", Boolean(panelError));
          };
          updatePanelError();
          panel.addEventListener("input", () => {
            internal.configuration.panelCode = panel.value;
            updatePanelError();
            markDirty();
            refreshSoon();
          });
          panelLabel.append(panel, codeHelp, error);
          controls.append(panelLabel);
        }

        const promptHead = node("div", "ccp-prompt-head");
        const promptMeta = node("small", "ccp-prompt-meta", "Compilation…");
        promptHead.append(node("b", "", "Prompt prêt"), promptMeta);
        const editor = document.createElement("textarea");
        editor.className = "ccp-prompt-editor";
        editor.rows = 18;
        editor.maxLength = 100_000;
        editor.placeholder = "Compilation du prompt…";
        const stageActions = node("div", "ccp-stage-actions");
        const copy = button("Copier", "quiet-button");
        const rebuild = button("Recompiler depuis les réglages", "quiet-button");
        const send = button("Envoyer à l’agrégateur", "primary-action");
        const resultLink = node("a", "aggregator-result-link", "Ouvrir le brouillon ↗");
        resultLink.target = "barz-aggregator";
        resultLink.hidden = true;
        stageActions.append(copy, rebuild, send, resultLink);
        promptSide.append(promptHead, editor, stageActions);

        const refresh = async ({ force = false } = {}) => {
          if (stage.id === "c" && panelError) {
            promptMeta.textContent = panelError;
            promptMeta.classList.add("is-error");
            rebuild.disabled = true;
            send.disabled = true;
            return;
          }
          if (force) delete internal.configuration.customOutputs[stage.id];
          try {
            const payload = await compile({ stageId: stage.id });
            const output = payload.outputs[0];
            editor.value = output.prompt;
            promptMeta.textContent = output.custom ? "Version personnalisée enregistrée" : "Version relue Astra";
            promptMeta.classList.remove("is-error");
            rebuild.disabled = false;
            send.disabled = false;
          } catch (error) {
            promptMeta.textContent = error.message;
            promptMeta.classList.add("is-error");
            rebuild.disabled = true;
            send.disabled = true;
          }
        };
        const refreshSoon = () => {
          clearTimeout(internal.compileTimer);
          internal.compileTimer = setTimeout(() => {
            if (!Object.hasOwn(internal.configuration.customOutputs, stage.id)) refresh();
            else promptMeta.textContent = "Version personnalisée conservée · recompile manuelle disponible";
          }, 100);
        };
        editor.addEventListener("input", () => {
          internal.configuration.customOutputs[stage.id] = editor.value;
          promptMeta.textContent = "Version personnalisée enregistrée";
          promptMeta.classList.remove("is-error");
          markDirty();
        });
        copy.addEventListener("click", () => copyText(editor.value, `${stage.title} copié.`));
        rebuild.addEventListener("click", async () => {
          await refresh({ force: true });
          markDirty();
          toast("Prompt recompilé depuis les réglages relus.");
        });
        send.addEventListener("click", () => {
          if (stage.id === "c" && panelError) return toast(panelError, true);
          sendToAggregator(editor.value, `CCP · ${stage.title}`, "image", {}, {}, resultLink);
        });

        stageBody.append(controls, promptSide);
        details.append(stageBody);
        await refresh();
      }
      stageList.append(details);
    }
    host.append(stageList);

    const reset = button("Rétablir les réglages CCP", "reset-tool-button");
    reset.addEventListener("click", () => {
      const customOutputs = internal.configuration.customOutputs;
      internal.configuration = clone(catalog.defaults);
      internal.configuration.customOutputs = customOutputs;
      markDirty();
      renderCcp().catch((error) => toast(error.message, true));
      toast("Réglages CCP restaurés. Tes versions personnalisées sont conservées.");
    });
    host.append(reset);
  }

  function enumControl(groupName, key, labelText, enumeration, refresh) {
    const label = node("label", "control-field", labelText);
    const select = document.createElement("select");
    enumeration.options.forEach(({ value, label: optionLabel }) => {
      const option = node("option", "", optionLabel);
      option.value = value;
      option.selected = internal.configuration.state[groupName][key] === value;
      select.append(option);
    });
    select.addEventListener("change", () => {
      internal.configuration.state[groupName][key] = select.value;
      markDirty();
      refresh();
    });
    label.append(select);
    return label;
  }

  function sliderControl(groupName, key, labelText, range, refresh) {
    const label = node("label", "control-field slider-field");
    const row = node("span", "field-label");
    row.append(node("span", "", labelText));
    const valueLabel = node("b");
    const value = internal.configuration.state[groupName][key];
    const weightLabels = ["désactivé", "rare", "12–20 s", "périodique", "fréquent", "constant"];
    valueLabel.textContent = key === "weightShift" ? weightLabels[value] : String(value);
    row.append(valueLabel);
    const input = document.createElement("input");
    input.type = "range";
    input.min = range.min;
    input.max = range.max;
    input.step = range.step;
    input.value = value;
    input.addEventListener("input", () => {
      internal.configuration.state[groupName][key] = Number(input.value);
      valueLabel.textContent = key === "weightShift" ? weightLabels[Number(input.value)] : input.value;
      markDirty();
      refresh();
    });
    label.append(row, input);
    return label;
  }

  function toggleControl(groupName, key, labelText, refresh) {
    const label = node("label", "toggle-field");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = internal.configuration.state[groupName][key];
    input.addEventListener("change", () => {
      internal.configuration.state[groupName][key] = input.checked;
      markDirty();
      refresh();
    });
    label.append(input, node("span", "check-mark", "✓"), node("span", "", labelText));
    return label;
  }

  function fieldGroup(title, enabledKey, groupName, labels, refresh) {
    const section = node("section", "control-group");
    const head = node("div", "control-group-head");
    head.append(node("h3", "", title));
    if (enabledKey) head.append(toggleControl("sections", enabledKey, "Actif", refresh));
    section.append(head);
    const fields = node("div", "control-fields");
    const defaults = internal.catalog.imperfection.defaults[groupName];
    const ranges = new Map(internal.catalog.imperfection.ranges.map((range) => [range.id, range]));
    const enumMap = {
      device: internal.catalog.imperfection.enums.find(({ id }) => id === "deviceType"),
      orbitDirection: internal.catalog.imperfection.enums.find(({ id }) => id === "orbitDirection"),
      activityLevel: internal.catalog.imperfection.enums.find(({ id }) => id === "activityLevel")
    };
    for (const [key, defaultValue] of Object.entries(defaults)) {
      if (enumMap[key]) fields.append(enumControl(groupName, key, labels[key], enumMap[key], refresh));
      else if (ranges.has(key)) fields.append(sliderControl(groupName, key, labels[key], ranges.get(key), refresh));
      else if (typeof defaultValue === "boolean") fields.append(toggleControl(groupName, key, labels[key], refresh));
    }
    section.append(fields);
    return section;
  }

  async function applySelectedPreset() {
    if (!internal.presetSelection) return;
    const custom = internal.configuration.customPresets.find(({ id }) => id === internal.presetSelection);
    const payload = await api("/api/v1/tools/imperfection/apply-preset", {
      method: "POST",
      body: JSON.stringify({
        currentState: internal.configuration.state,
        ...(custom ? { presetState: custom.state } : { builtinId: internal.presetSelection })
      })
    });
    internal.configuration.state = payload.state;
    markDirty();
    renderImperfection();
  }

  async function savePreset() {
    const name = await modalName({ title: "Enregistrer ce préréglage", description: "Il sera conservé dans le setup actif." });
    if (!name) return;
    const id = `preset-${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
    internal.configuration.customPresets.push({ id, name, state: clone(internal.configuration.state) });
    internal.presetSelection = id;
    markDirty();
    await saveNow();
    renderImperfection();
  }

  async function renamePreset() {
    const preset = internal.configuration.customPresets.find(({ id }) => id === internal.presetSelection);
    if (!preset) return;
    const name = await modalName({ title: "Renommer le préréglage", description: "Son contenu ne sera pas modifié.", initial: preset.name, action: "Renommer" });
    if (!name) return;
    preset.name = name;
    markDirty();
    renderImperfection();
  }

  async function renderImperfection() {
    host.replaceChildren(toolHeader("Imperfection Engine", "Ajoute les micro-irrégularités de caméra et de jeu qui évitent une image trop mécanique."));
    const presetBar = node("div", "preset-bar");
    const select = document.createElement("select");
    select.setAttribute("aria-label", "Préréglage Imperfection");
    const placeholder = node("option", "", "Choisir un préréglage…");
    placeholder.value = "";
    select.append(placeholder);
    internal.catalog.imperfection.presetIds.forEach((id) => {
      const option = node("option", "", BUILTIN_PRESET_LABELS[id] ?? id);
      option.value = id;
      select.append(option);
    });
    internal.configuration.customPresets.forEach((preset) => {
      const option = node("option", "", preset.name);
      option.value = preset.id;
      select.append(option);
    });
    select.value = internal.presetSelection;
    select.addEventListener("change", () => {
      internal.presetSelection = select.value;
      renderImperfection();
    });
    const apply = button("Appliquer", "quiet-button");
    apply.disabled = !internal.presetSelection;
    apply.addEventListener("click", applySelectedPreset);
    const save = button("Enregistrer comme preset", "quiet-button");
    save.addEventListener("click", savePreset);
    const rename = button("Renommer", "text-button");
    rename.disabled = !internal.configuration.customPresets.some(({ id }) => id === internal.presetSelection);
    rename.addEventListener("click", renamePreset);
    const remove = button("Supprimer", "text-button warning-text");
    remove.disabled = rename.disabled;
    remove.addEventListener("click", () => {
      internal.configuration.customPresets = internal.configuration.customPresets.filter(({ id }) => id !== internal.presetSelection);
      internal.presetSelection = "";
      markDirty();
      renderImperfection();
    });
    presetBar.append(select, apply, save, rename, remove);
    host.append(presetBar);

    const body = node("div", "runtime-grid imperfection-grid");
    const controls = node("div", "runtime-controls imperfection-controls");
    const outputPanel = node("section", "runtime-output sticky-output");
    const output = node("pre", "imperfection-output");
    const stats = node("div", "runtime-stats");
    const refresh = () => scheduleImperfectionCompile(output, stats);
    controls.append(
      fieldGroup("Caméra", "camera", "camera", CAMERA_LABELS, refresh),
      fieldGroup("Sujet", "human", "human", HUMAN_LABELS, refresh),
      fieldGroup("Contraintes", null, "antiGlitch", CONSTRAINT_LABELS, refresh)
    );
    const baseLabel = node("label", "base-prompt-label", "Prompt principal (facultatif)");
    const basePrompt = document.createElement("textarea");
    basePrompt.id = "imperfection-base-prompt";
    basePrompt.rows = 5;
    basePrompt.placeholder = "Colle ici un prompt si tu veux lui ajouter le modificateur Imperfection…";
    baseLabel.append(basePrompt);
    outputPanel.append(node("h3", "", "Modificateur prêt"), stats, output, baseLabel);
    body.append(controls, outputPanel);
    host.append(body);
    await updateImperfectionOutput(output, stats);
    host.append(actionBar({
      copy: () => copyText(internal.output),
      append: () => {
        const base = basePrompt.value.trim();
        if (!base) return toast("Ajoute d’abord un prompt principal.", true);
        sendToAggregator(`${base}\n\n${internal.output}`, "Imperfection Engine — ajout", "video");
      },
      send: () => sendToAggregator(internal.output, "Imperfection Engine", "video")
    }));
    const reset = button("Rétablir les réglages intégrés", "reset-tool-button");
    reset.addEventListener("click", () => {
      internal.configuration.state = clone(internal.catalog.imperfection.defaults);
      markDirty();
      renderImperfection();
      toast("Réglages intégrés restaurés. Tes presets personnels sont conservés.");
    });
    host.append(reset);
  }

  async function updateImperfectionOutput(output, stats) {
    const payload = await compile();
    internal.output = payload.prompt;
    output.textContent = payload.prompt || "Aucune instruction active.";
    stats.replaceChildren(
      node("span", "", `${payload.stats.activeSettings} réglages actifs`),
      node("span", "", `${payload.stats.activeConstraints} contraintes`),
      node("span", "", `~${payload.stats.approximateTokens} tokens`)
    );
  }

  function scheduleImperfectionCompile(output, stats) {
    clearTimeout(internal.compileTimer);
    internal.compileTimer = setTimeout(() => updateImperfectionOutput(output, stats), 90);
  }

  function cinemaStoredEntry(item) {
    return { itemId: item.id, item: item.label, category: item.category, copyText: item.copyText };
  }

  async function renderCinemaHelper() {
    const catalog = internal.catalog.cinemaHelper;
    const c = internal.configuration;
    const compiled = await compile();
    internal.output = compiled.prompt;
    host.replaceChildren();

    const intro = node("div", "cinema-helper-head");
    const introCopy = node("div");
    introCopy.append(
      node("span", "runtime-eyebrow", "Prompt deck · A12"),
      node("h2", "", "Cinema Helper"),
      node("p", "", `${catalog.sourceEntryCount.toLocaleString("fr-FR")} entrées source · deck ordonné et sauvegardé dans ce setup.`)
    );
    const status = node("div", "cinema-live-status", `${c.deck.length} / ${catalog.deckLimit}`);
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    intro.append(introCopy, status);

    const categories = node("div", "cinema-categories");
    for (const category of catalog.categories) {
      const tab = button(category.title, "text-button");
      tab.classList.toggle("is-active", category.id === c.activeCategory);
      tab.setAttribute("aria-pressed", String(category.id === c.activeCategory));
      tab.addEventListener("click", () => {
        c.activeCategory = category.id;
        markDirty();
        renderCinemaHelper().catch((error) => toast(error.message, true));
      });
      categories.append(tab);
    }

    const layout = node("div", "cinema-helper-layout");
    const browser = node("section", "cinema-browser");
    const searchRow = node("div", "cinema-search-row");
    const search = document.createElement("input");
    search.type = "search";
    search.value = c.searchQuery;
    search.placeholder = "Rechercher un terme, une catégorie, un texte…";
    search.setAttribute("aria-label", "Rechercher dans Cinema Helper");
    const random = button("+ Aléatoire", "quiet-button");
    searchRow.append(search, random);
    const resultMeta = node("small", "cinema-result-meta");
    const list = node("div", "cinema-catalog-list");
    browser.append(searchRow, resultMeta, list);

    const itemById = new Map(catalog.items.map((item) => [item.id, item]));
    const renderCatalog = () => {
      const active = catalog.categories.find(({ id }) => id === c.activeCategory);
      const favoriteIds = new Set(c.favorites.map(({ itemId }) => itemId));
      const deckIds = new Set(c.deck.map(({ itemId }) => itemId));
      const query = c.searchQuery.trim().toLocaleLowerCase();
      let candidates = c.activeCategory === "favorites"
        ? c.favorites.map(({ itemId }) => itemById.get(itemId)).filter(Boolean)
        : catalog.items.filter(({ category }) => active.accepts.includes(category));
      if (query) candidates = candidates.filter((item) => [
        item.label, item.copyText, item.description, item.example, item.artistGenre, item.catalogId, item.category
      ].some((value) => String(value ?? "").toLocaleLowerCase().includes(query)));
      list.replaceChildren();
      const visible = candidates.slice(0, 180);
      resultMeta.textContent = candidates.length > visible.length
        ? `${candidates.length.toLocaleString("fr-FR")} résultats · ${visible.length} affichés, affine la recherche`
        : `${candidates.length.toLocaleString("fr-FR")} résultat(s)`;
      for (const item of visible) {
        const card = node("article", "cinema-catalog-card");
        card.classList.toggle("is-in-deck", deckIds.has(item.id));
        const copy = node("div", "cinema-card-copy");
        copy.append(node("b", "", item.label));
        if (item.artistGenre) copy.append(node("small", "", item.artistGenre));
        const detail = item.description || item.example || (item.copyText !== item.label ? item.copyText : "");
        if (detail) copy.append(node("span", "", detail));
        const actions = node("div", "cinema-card-actions");
        const favorite = button(favoriteIds.has(item.id) ? "★" : "☆", "cinema-favorite");
        favorite.setAttribute("aria-label", favoriteIds.has(item.id) ? `Retirer ${item.label} des favoris` : `Ajouter ${item.label} aux favoris`);
        favorite.setAttribute("aria-pressed", String(favoriteIds.has(item.id)));
        favorite.addEventListener("click", () => {
          const index = c.favorites.findIndex(({ itemId }) => item.id === itemId);
          if (index >= 0) c.favorites.splice(index, 1);
          else c.favorites.push(cinemaStoredEntry(item));
          markDirty();
          renderCinemaHelper().catch((error) => toast(error.message, true));
        });
        const add = button(deckIds.has(item.id) ? "Ajouté" : "+ Deck", "quiet-button");
        add.disabled = deckIds.has(item.id);
        add.setAttribute("aria-pressed", String(deckIds.has(item.id)));
        add.addEventListener("click", () => {
          if (c.deck.length >= catalog.deckLimit) return toast(`Le deck est limité à ${catalog.deckLimit} entrées.`, true);
          c.deck.push(cinemaStoredEntry(item));
          markDirty();
          renderCinemaHelper().catch((error) => toast(error.message, true));
        });
        actions.append(favorite, add);
        card.append(copy, actions);
        list.append(card);
      }
      if (!visible.length) list.append(node("p", "runtime-empty-panel", "Aucun résultat dans cette catégorie."));
      random.disabled = c.activeCategory === "favorites" || !candidates.some(({ id }) => !deckIds.has(id)) || c.deck.length >= catalog.deckLimit;
      random.onclick = () => {
        const pool = candidates.filter(({ id }) => !deckIds.has(id));
        if (!pool.length) return toast("Aucune entrée disponible dans cette sélection.", true);
        c.deck.push(cinemaStoredEntry(pool[Math.floor(Math.random() * pool.length)]));
        markDirty();
        renderCinemaHelper().catch((error) => toast(error.message, true));
      };
    };
    search.addEventListener("input", () => {
      c.searchQuery = search.value;
      markDirty();
      renderCatalog();
    });
    renderCatalog();

    const deckPanel = node("section", "cinema-deck-panel");
    const deckHead = node("div", "cinema-deck-head");
    deckHead.append(node("div", "", "DECK — l’ordre ci-dessous est conservé"));
    const clear = button("Vider", "text-button");
    clear.disabled = c.deck.length === 0;
    clear.addEventListener("click", () => {
      c.deck = [];
      c.customPrompt = "";
      markDirty();
      renderCinemaHelper().catch((error) => toast(error.message, true));
    });
    deckHead.append(clear);
    const deckList = node("ol", "cinema-deck-list");
    const move = (from, to) => {
      if (to < 0 || to >= c.deck.length || from === to) return;
      const [entry] = c.deck.splice(from, 1);
      c.deck.splice(to, 0, entry);
      markDirty();
      renderCinemaHelper().catch((error) => toast(error.message, true));
    };
    c.deck.forEach((entry, index) => {
      const row = node("li", "cinema-deck-item");
      row.draggable = true;
      row.dataset.index = String(index);
      row.addEventListener("dragstart", (event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(index));
        row.classList.add("is-dragging");
      });
      row.addEventListener("dragend", () => row.classList.remove("is-dragging"));
      row.addEventListener("dragover", (event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; });
      row.addEventListener("drop", (event) => {
        event.preventDefault();
        move(Number(event.dataTransfer.getData("text/plain")), index);
      });
      const number = node("b", "cinema-deck-number", String(index + 1).padStart(2, "0"));
      const textCopy = node("div", "cinema-deck-copy");
      textCopy.append(node("span", "", entry.item), node("small", "", entry.category));
      const controls = node("div", "cinema-deck-controls");
      const up = button("↑", "text-button");
      up.disabled = index === 0;
      up.setAttribute("aria-label", `Monter ${entry.item}`);
      up.addEventListener("click", () => move(index, index - 1));
      const down = button("↓", "text-button");
      down.disabled = index === c.deck.length - 1;
      down.setAttribute("aria-label", `Descendre ${entry.item}`);
      down.addEventListener("click", () => move(index, index + 1));
      const remove = button("×", "text-button");
      remove.setAttribute("aria-label", `Retirer ${entry.item}`);
      remove.addEventListener("click", () => {
        c.deck.splice(index, 1);
        markDirty();
        renderCinemaHelper().catch((error) => toast(error.message, true));
      });
      controls.append(up, down, remove);
      row.append(number, textCopy, controls);
      deckList.append(row);
    });
    if (!c.deck.length) deckList.append(node("li", "cinema-empty-deck", "Ajoute des ingrédients depuis le catalogue."));
    deckPanel.append(deckHead, deckList);

    const outputPanel = node("section", "cinema-output-panel");
    const outputHead = node("div", "cinema-output-head");
    const promptState = compiled.custom ? "PERSONNALISÉ" : compiled.fallbackUsed ? "COPIE SANS PERTE" : "COMPOSITION LOCALE";
    outputHead.append(node("div", "", "PROMPT FINAL"), node("small", "", promptState));
    const editor = document.createElement("textarea");
    editor.className = "cinema-prompt-editor";
    editor.rows = 12;
    editor.value = compiled.prompt;
    editor.placeholder = "Le prompt apparaîtra ici quand le deck contient des ingrédients.";
    editor.addEventListener("input", () => {
      c.customPrompt = editor.value;
      internal.output = editor.value;
      markDirty();
      outputHead.lastElementChild.textContent = "PERSONNALISÉ";
    });
    const promptActions = node("div", "cinema-output-actions");
    const restore = button("Recomposer depuis le deck", "quiet-button");
    restore.disabled = !compiled.custom;
    restore.addEventListener("click", () => {
      c.customPrompt = "";
      markDirty();
      renderCinemaHelper().catch((error) => toast(error.message, true));
    });
    const copyPrompt = button("Copier le prompt", "primary");
    copyPrompt.addEventListener("click", () => copyText(editor.value));
    const copyDirect = button("Copier la liste exacte", "quiet-button");
    copyDirect.disabled = !compiled.directCopy;
    copyDirect.addEventListener("click", () => copyText(compiled.directCopy, "Liste exacte copiée."));
    promptActions.append(restore, copyDirect, copyPrompt);
    outputPanel.append(outputHead, editor, promptActions);
    if (compiled.warnings.includes("ONLY_FIRST_ADJECTIVE_MODIFIES_ACTION")) {
      outputPanel.append(node("p", "cinema-warning", "Le compositeur historique n’applique que le premier adjectif à l’action. La liste exacte conserve tout."));
    }

    const negativeBox = node("div", "cinema-negative-box");
    const negativeHead = node("div", "cinema-negative-head");
    const negativeSelect = document.createElement("select");
    for (const [value, label] of [["realistic", "Realistic"], ["anim", "Animation"]]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      option.selected = c.negativeMode === value;
      negativeSelect.append(option);
    }
    negativeSelect.addEventListener("change", () => {
      c.negativeMode = negativeSelect.value;
      markDirty();
      renderCinemaHelper().catch((error) => toast(error.message, true));
    });
    const copyNegative = button("Copier", "quiet-button");
    copyNegative.addEventListener("click", () => copyText(compiled.negativePrompt, "Prompt négatif copié."));
    negativeHead.append(node("b", "", "PROMPT NÉGATIF SÉPARÉ"), negativeSelect, copyNegative);
    negativeBox.append(negativeHead, node("p", "", compiled.negativePrompt));
    outputPanel.append(negativeBox);

    const bridge = node("div", "cinema-bridge");
    const media = document.createElement("select");
    media.setAttribute("aria-label", "Type de brouillon à créer");
    for (const [value, label] of [["image", "Brouillon image"], ["video", "Brouillon vidéo"]]) {
      const option = document.createElement("option"); option.value = value; option.textContent = label; media.append(option);
    }
    const send = button("Envoyer à BZ Aggregator", "primary");
    send.disabled = !compiled.prompt;
    send.addEventListener("click", () => sendToAggregator(
      editor.value, "Cinema Helper", media.value, {}, {}, undefined, catalog.negativePrompts[c.negativeMode]
    ));
    const ai = button("Vérification IA…", "quiet-button");
    ai.disabled = true;
    ai.addEventListener("click", async () => {
      const source = editor.value.trim() || compiled.directCopy.trim();
      if (!source) return toast("Ajoute d’abord des ingrédients au deck.", true);
      ai.disabled = true; ai.textContent = "Verbalisation…";
      try {
        const result = await api("/api/v1/ai/refine", {
          method: "POST",
          body: JSON.stringify({
            prompt: source,
            outputType: media.value,
            targetEngine: media.value === "video" ? "General video generation" : "General image generation",
            transform: "Turn this exact Cinema Helper ingredient deck into one fluent, production-ready generative prompt. Preserve every selected subject, object, action, acting cue, framing, camera, focal length, background, lighting, artist and style ingredient. Do not silently omit or invent ingredients. Return only the final prompt."
          })
        });
        c.customPrompt = result.refined || source;
        markDirty(); await renderCinemaHelper();
        toast(`Prompt verbalisé avec ${result.model}.`);
      } catch (error) { toast(error.message, true); await armAiButton(ai, "Verbaliser avec l’IA"); }
    });
    armAiButton(ai, "Verbaliser avec l’IA");
    bridge.append(media, send, ai);
    outputPanel.append(bridge);

    layout.append(browser, deckPanel, outputPanel);
    host.append(intro, categories, layout);
  }

  function renderImageSlicer() {
    mountImageSlicer({
      host,
      header: toolHeader(
        "Image Slicer",
        "Découpe une image localement avec une grille ajustable et enregistre les tuiles dans le dossier source ou le dossier choisi."
      ),
      configuration: internal.configuration,
      onDirty: markDirty,
      toast
    });
  }

  function renderPaintStudio() {
    mountPaintStudio({
      host,
      header: toolHeader(
        "Paint Studio",
        "Compose, annote et retouche localement avec des calques, un historique complet et des exports haute qualité."
      ),
      configuration: internal.configuration,
      incomingImage: internal.paintIncoming,
      onIncomingConsumed: () => { internal.paintIncoming = null; },
      onDirty: markDirty,
      toast
    });
  }

  function renderImageGrabber() {
    mountImageGrabber({
      host,
      header: toolHeader(
        "Image Grabber",
        "Explore une vidéo image par image, conserve tes captures et envoie-les directement dans Paint Studio."
      ),
      configuration: internal.configuration,
      onDirty: markDirty,
      toast,
      onSendToPaint: async (image) => {
        internal.paintIncoming = image;
        await openTool("paint-studio");
        toast("Image envoyée dans Paint Studio.");
      },
      onSendToAggregator: sendImageToAggregatorReferences
    });
  }

  function renderImageAnalyzer() {
    mountImageAnalyzer({
      host,
      header: toolHeader(
        "Image Analyser",
        "Transforme une image en prompt structuré, puis l’envoie sans ressaisie vers l’atelier adapté."
      ),
      configuration: internal.configuration,
      onDirty: markDirty,
      toast,
      api,
      copyText,
      onSendTarget: async (target, prompt, parts) => {
        if (target === "cccp") {
          await navigateToWorkshop("character-lab");
          await openTool("cccp");
          internal.configuration.scene = prompt;
          internal.configuration.panelCode = "B";
          internal.configuration.iterationTake = 0;
          markDirty(); await renderCcp();
          return toast("Analyse envoyée dans CCP · Description de scène.");
        }
        if (target === "seedance") {
          await navigateToWorkshop("video-builder");
          await openTool("seedance");
          internal.configuration.subject = parts.subject || prompt;
          internal.configuration.context = parts.context || prompt;
          internal.configuration.style = parts.style || "";
          markDirty(); await renderSeedance();
          return toast("Analyse envoyée dans Video Multi Framing.");
        }
        await navigateToWorkshop("prompt-forge");
        await openTool("apg");
        internal.configuration.intent = prompt;
        internal.configuration.prompt = prompt;
        markDirty(); renderApg();
        toast("Analyse envoyée dans A.P.G · Intent.");
      }
    });
  }

  function renderApg() {
    mountApgStudio({
      host,
      header: toolHeader("A.P.G", "Absurd Prompt Generator · 50 familles originales, mix pondéré, seed local et raffinement IA partagé."),
      configuration: internal.configuration,
      onDirty: markDirty,
      toast,
      api,
      copyText,
      onSendToAggregator: (prompt, mediaType) => sendToAggregator(prompt, "A.P.G", mediaType)
    });
  }

  function renderVideoDirector() {
    mountVideoDirector({
      host,
      header: toolHeader(
        "Video Analyser",
        "Découpe jusqu’à 15 secondes, analyse la mise en scène et adapte une sortie active pour Seedance 2, Kling 3, MiniMax H3, FLUX 3 ou Wan 3."
      ),
      configuration: internal.configuration,
      onDirty: markDirty,
      toast,
      api,
      copyText,
      onSendToAggregator: (prompt, negativePrompt, engine) => sendToAggregator(
        prompt,
        "Video Analyser",
        "video",
        { durationSeconds: 15 },
        { engine },
        undefined,
        negativePrompt
      )
    });
  }

  function renderMotionEmulator() {
    mountMotionEmulator({
      host,
      header: toolHeader(
        "Motion Emulator",
        "Émule, compare et prépare les mouvements dans son propre atelier autonome."
      )
    });
  }

  function renderVideoEditor() {
    mountVideoEditor({
      host,
      header: toolHeader(
        "Video Director",
        "Montage multipiste indépendant : moniteur composité, effets, masques, fondus, images-clés et rendu FFmpeg."
      ),
      api,
      toast
    });
  }

  function renderBlockingStudio() {
    mountBlockingStudio({
      host,
      header: toolHeader(
        "Blocking Studio",
        "Prévisualise la scène en 3D, cadre les caméras et reconstruis un blocking éditable depuis une image de référence."
      ),
      toast
    });
  }

  function renderObjectScaleChart() {
    internal.objectScaleDispose?.();
    internal.objectScaleDispose = mountObjectScaleChart({
      host,
      header: toolHeader(
        "Object Scale Chart",
        "Compare real-world proportions, build an exact visual scale reference and send the chart with its factual prompt to Gregator."
      ),
      toast,
      onSendToAggregator: async ({ prompt, dataUrl, filename, title, generator, resultLink }) => {
        const referenceName = String(filename || "object-scale-chart.png").replace(/\.[^.]+$/, "");
        const reference = await uploadImageReference({ src: dataUrl, name: referenceName });
        const aggregatorPrompt = `Use @image1 as the exact scale chart reference. Preserve every displayed dimension, ratio, silhouette proportion and relative scale exactly. Do not reinterpret, normalize or round any measurement.\n\n${prompt}`;
        const url = await sendToAggregator(
          aggregatorPrompt,
          `Object Scale Chart · ${title || "Scale reference"}`,
          "video",
          { generator: generator || "Universal" },
          {},
          resultLink,
          "",
          [reference]
        );
        if (!url) throw new Error("Gregator n’a pas confirmé la réception du schéma.");
        return url;
      }
    });
  }

  function renderYoutubeExtractor() {
    internal.youtubeExtractorDispose?.();
    internal.youtubeExtractorDispose = mountYoutubeExtractor({
      host,
      header: toolHeader(
        "YouTube Extractor",
        "Load a YouTube video, set precise IN/OUT points and extract a local MP3 or MP4 with yt-dlp and FFmpeg."
      ),
      api,
      toast
    });
  }

  function renderWorkflow3d() {
    mountWorkflow3d({
      host,
      header: toolHeader(
        "2D/3D Transfer workflow",
        "Transfère une pose, un cadrage, un sujet, un décor ou une direction 3D avec les prompts complets de l’Atlas original."
      ),
      configuration: internal.configuration,
      onDirty: markDirty,
      toast,
      copyText,
      onSendToAggregator: (prompt, mediaType, outputId) => sendToAggregator(
        prompt,
        "2D/3D Transfer workflow",
        mediaType,
        {},
        { outputId }
      )
    });
  }

  async function openTool(toolId) {
    await saveNow();
    internal.enhancerStudioDispose?.();
    internal.enhancerStudioDispose = null;
    internal.objectScaleDispose?.();
    internal.objectScaleDispose = null;
    internal.youtubeExtractorDispose?.();
    internal.youtubeExtractorDispose = null;
    internal.seedanceMediaEpoch += 1;
    internal.toolId = toolId;
    internal.presetSelection = "";
    renderPicker();
    host.replaceChildren(node("p", "runtime-loading", "Chargement de l’outil…"));
    try {
      await loadConfiguration(toolId);
      const tool = getWorkspace().registry.tools.find(({ id }) => id === toolId);
      if (tool?.adapterId === "prompt-library") await renderPromptLibrary();
      else if (toolId === "apg") renderApg();
      else if (toolId === "barz-enhancer") await renderEnhancer("cards", "BZ Enhancer");
      else if (toolId === "angle-3d") await renderEnhancer("angles", "Angle 3D");
      else if (toolId === "relighting-3d") await renderEnhancer("relighting", "Relighting 3D");
      else if (toolId === "imperfection") await renderImperfection();
      else if (toolId === "barz-beauty") await renderBeauty();
      else if (toolId === "realism-forge") await renderRealism();
      else if (toolId === "cinematic-shoot") await renderCinematicShoot();
      else if (toolId === "facs-sheet-generator") await renderFacsSheet();
      else if (toolId === "barzy-board") await renderBoard();
      else if (toolId === "veo-suite") await renderCameraSuite();
      else if (toolId === "cccp") await renderCcp();
      else if (toolId === "barzy-sheet") await renderSheet();
      else if (toolId === "barz-designer") await renderDesigner();
      else if (toolId === "knolling") await renderKnolling();
      else if (toolId === "multishot") await renderMultishot();
      else if (toolId === "seedance") await renderSeedance();
      else if (toolId === "cinema-helper") await renderCinemaHelper();
      else if (toolId === "image-slicer") renderImageSlicer();
      else if (toolId === "paint-studio") renderPaintStudio();
      else if (toolId === "image-grabber") renderImageGrabber();
      else if (toolId === "image-analyzer") renderImageAnalyzer();
      else if (toolId === "video-director") renderVideoDirector();
      else if (toolId === "motion-emulator") renderMotionEmulator();
      else if (toolId === "video-editor") renderVideoEditor();
      else if (toolId === "blocking-studio") renderBlockingStudio();
      else if (toolId === "object-scale-chart") renderObjectScaleChart();
      else if (toolId === "youtube-extractor") renderYoutubeExtractor();
      else if (toolId === "workflow-3d") renderWorkflow3d();
      else host.replaceChildren(node("p", "runtime-error", "Cet adaptateur n’a pas encore de vue d’exécution."));
    } catch (error) {
      host.replaceChildren(node("p", "runtime-error", error.message));
    }
  }

  async function showWorkshop(workshopId) {
    await ensureCatalog();
    internal.workshopId = workshopId;
    const workspace = getWorkspace();
    const workshop = workspace.registry.workshops.find(({ id }) => id === workshopId)
      ?? workspace.registry.systemTabs.find(({ id }) => id === workshopId);
    document.getElementById("runtime-workshop-title").textContent = workshop?.title ?? "Atelier";
    document.getElementById("runtime-setup-name").textContent = workspace.setupContext.activeSetup.name;
    const tools = runtimeTools();
    if (!tools.length) {
      internal.toolId = null;
      renderPicker();
      host.replaceChildren(node("div", "runtime-empty-panel", "Cet atelier ne contient pas encore d’outil exécutable. Ajoute ses prompts depuis Build."));
      return;
    }
    const selected = tools.some(({ id }) => id === internal.toolId) ? internal.toolId : tools[0].id;
    await openTool(selected);
  }

  function workspaceChanged() {
    if (getWorkspace().currentView === "tools" && internal.workshopId) {
      showWorkshop(internal.workshopId).catch((error) => toast(error.message, true));
    }
  }

  return { showWorkshop, openTool, workspaceChanged, saveNow };
}
