import { createToolWorkspace } from "./tool-workspace.js";
import "./suite-bridge.js";

const state = {
  registry: null,
  navigation: [],
  setupContext: null,
  toolStateRevision: 0,
  setupAction: "create",
  selectedWorkshopId: null,
  selectedToolId: null,
  selectedRecipeId: null,
  librarySnapshot: null,
  selectedLibraryCategoryId: null,
  selectedLibraryEntryId: null,
  draggedWorkshopId: null,
  resetScope: "all",
  toastTimer: null,
  currentView: "tools",
  runtimeWorkshopId: "utilities"
};

const element = (id) => document.getElementById(id);
const navigation = element("navigation");
const workshopList = element("workshop-list");
const emptyInspector = element("empty-inspector");
const inspector = element("workshop-inspector");
const toolList = element("tool-list");
const tester = element("recipe-tester");
const libraryEditor = element("library-editor");

function node(tag, className, text) {
  const value = document.createElement(tag);
  if (className) value.className = className;
  if (text !== undefined) value.textContent = text;
  return value;
}

function slug(value, fallback) {
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 55);
  return normalized || fallback;
}

function uniqueSuffix() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

function toast(message, error = false) {
  const target = element("toast");
  target.textContent = message;
  target.classList.toggle("is-error", error);
  target.classList.add("is-visible");
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => target.classList.remove("is-visible"), 3200);
}

async function api(path, options = {}) {
  const { preserveOnConflict = false, ...requestOptions } = options;
  const response = await fetch(path, {
    ...requestOptions,
    headers: requestOptions.body ? { "Content-Type": "application/json", ...(requestOptions.headers ?? {}) } : requestOptions.headers
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 409 && !preserveOnConflict) await loadRegistry();
    throw new Error(payload.error?.message ?? `Erreur HTTP ${response.status}`);
  }
  return payload;
}

function acceptRegistry(payload) {
  state.registry = payload.registry;
  state.navigation = payload.navigation;
  state.setupContext = payload.setupContext;
  if (payload.toolStateRevision !== undefined) state.toolStateRevision = payload.toolStateRevision;
  if (state.selectedWorkshopId && !state.registry.workshops.some(({ id }) => id === state.selectedWorkshopId)) {
    state.selectedWorkshopId = null;
  }
  if (state.selectedToolId && !state.registry.tools.some(({ id }) => id === state.selectedToolId)) {
    state.selectedToolId = null;
    state.selectedRecipeId = null;
    state.librarySnapshot = null;
  }
  render();
  if (toolWorkspace) toolWorkspace.workspaceChanged();
}

function activeSetupId() {
  return state.setupContext.activeSetup.id;
}

function mutationEnvelope(values = {}) {
  return { expectedSetupId: activeSetupId(), ...values };
}

async function loadRegistry() {
  acceptRegistry(await api("/api/v1/registry"));
}

function renderNavigation() {
  navigation.replaceChildren();
  const marks = { deck: "◇", utilities: "□", build: "+" };
  state.navigation.forEach((item) => {
    const button = node("button", "nav-item");
    button.type = "button";
    const isBuild = item.id === "build";
    const isWorkshop = state.registry.workshops.some(({ id }) => id === item.id);
    const isRuntime = isWorkshop || item.id === "deck" || item.id === "utilities";
    button.disabled = !isBuild && !isRuntime;
    button.classList.toggle("is-build", isBuild && state.currentView === "build");
    button.classList.toggle("is-active", isRuntime && state.currentView === "tools"
      && state.runtimeWorkshopId === item.id);
    button.classList.toggle("is-user", item.origin === "user");
    button.title = item.title;
    if (isBuild) button.addEventListener("click", showBuild);
    if (isRuntime) button.addEventListener("click", () => showWorkshop(item.id));
    const mark = node("span", "nav-mark", marks[item.id] ?? "·");
    mark.setAttribute("aria-hidden", "true");
    button.append(mark, node("span", "", item.title));
    navigation.append(button);
  });
}

async function showBuild() {
  try { await toolWorkspace?.saveNow(); } catch { return; }
  state.currentView = "build";
  element("build-stage").hidden = false;
  element("tool-stage").hidden = true;
  renderNavigation();
}

async function showWorkshop(id) {
  try { await toolWorkspace?.saveNow(); } catch { return; }
  state.currentView = "tools";
  state.runtimeWorkshopId = id;
  element("build-stage").hidden = true;
  element("tool-stage").hidden = false;
  renderNavigation();
  try { await toolWorkspace.showWorkshop(id); } catch (error) { toast(error.message, true); }
}

function toolsForWorkshop(id) {
  const toolIds = state.registry.placements.filter(({ targetId }) => targetId === id)
    .sort((a, b) => a.order - b.order).map(({ toolId }) => toolId);
  return toolIds.map((toolId) => state.registry.tools.find(({ id }) => id === toolId)).filter(Boolean);
}

function renderWorkshops() {
  workshopList.replaceChildren();
  state.registry.workshops.forEach((workshop, index) => {
    const row = node("div", "workshop-row");
    row.tabIndex = 0;
    row.draggable = true;
    row.dataset.id = workshop.id;
    row.classList.toggle("is-selected", state.selectedWorkshopId === workshop.id);
    row.setAttribute("aria-label", `${workshop.title}, position ${index + 1}`);
    row.addEventListener("click", () => selectWorkshop(workshop.id));
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectWorkshop(workshop.id);
      }
    });
    row.addEventListener("dragstart", (event) => {
      state.draggedWorkshopId = workshop.id;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", workshop.id);
      requestAnimationFrame(() => row.classList.add("is-dragging"));
    });
    row.addEventListener("dragend", () => {
      state.draggedWorkshopId = null;
      document.querySelectorAll(".workshop-row").forEach((item) => item.classList.remove("is-dragging", "is-drop-target"));
    });
    row.addEventListener("dragover", (event) => {
      event.preventDefault();
      row.classList.add("is-drop-target");
    });
    row.addEventListener("dragleave", () => row.classList.remove("is-drop-target"));
    row.addEventListener("drop", async (event) => {
      event.preventDefault();
      row.classList.remove("is-drop-target");
      const sourceId = state.draggedWorkshopId || event.dataTransfer.getData("text/plain");
      if (!sourceId || sourceId === workshop.id) return;
      const ids = state.registry.workshops.map(({ id }) => id).filter((id) => id !== sourceId);
      ids.splice(ids.indexOf(workshop.id), 0, sourceId);
      await saveOrder(ids);
    });
    const copy = node("div", "workshop-copy");
    copy.append(node("b", "", workshop.title), node("span", "", `${toolsForWorkshop(workshop.id).length} outil(s) · ${workshop.origin === "user" ? "personnel" : "intégré"}`));
    row.append(node("span", "grip", "⠿"), copy, node("span", "position-number", String(index + 1).padStart(2, "0")));
    workshopList.append(row);
  });
}

function selectWorkshop(id) {
  state.selectedWorkshopId = id;
  state.selectedToolId = null;
  state.selectedRecipeId = null;
  state.librarySnapshot = null;
  render();
}

function renderInspector() {
  const workshop = state.registry.workshops.find(({ id }) => id === state.selectedWorkshopId);
  emptyInspector.hidden = Boolean(workshop);
  inspector.hidden = !workshop;
  if (!workshop) return;
  const index = state.registry.workshops.findIndex(({ id }) => id === workshop.id);
  element("origin-label").textContent = workshop.origin === "user" ? "Atelier personnel" : "Atelier intégré";
  element("selected-position").textContent = `${index + 1} / ${state.registry.workshops.length}`;
  element("workshop-title").value = workshop.title;
  element("move-up").disabled = index === 0;
  element("move-down").disabled = index === state.registry.workshops.length - 1;
  element("reset-current").disabled = workshop.origin !== "builtin";
  renderTools(workshop);
  fillRecipeTargets();
}

function renderTools(workshop) {
  const tools = toolsForWorkshop(workshop.id);
  element("tool-count").textContent = `${tools.length} élément${tools.length === 1 ? "" : "s"}`;
  toolList.replaceChildren();
  if (tools.length === 0) toolList.append(node("p", "empty-tools", "Cet atelier est vide. Ajoute son premier prompt."));
  tools.forEach((tool) => {
    const button = node("button", "tool-row");
    button.type = "button";
    button.classList.toggle("is-selected", tool.id === state.selectedToolId);
    const type = tool.adapterId === "prompt-library" ? "bibliothèque" : tool.kind === "recipe" ? "prompt simple" : "outil";
    button.append(node("b", "", tool.title), node("span", "", type));
    button.addEventListener("click", async () => {
      state.selectedToolId = tool.id;
      state.selectedRecipeId = tool.recipeId;
      state.librarySnapshot = null;
      renderTools(workshop);
      if (tool.adapterId === "prompt-library") {
        try { await loadLibrary(tool.id); } catch (error) { toast(error.message, true); }
      }
    });
    toolList.append(button);
  });
  renderRecipeTester();
  renderLibraryEditor();
}

function inputForField(field) {
  const label = node("label", "", field.label ?? field.id);
  let control;
  if (field.type === "enum") {
    control = document.createElement("select");
    field.values.forEach((value) => {
      const option = node("option", "", value);
      option.value = value;
      option.selected = value === field.default;
      control.append(option);
    });
  } else if (field.type === "boolean") {
    control = document.createElement("select");
    [["true", "Oui"], ["false", "Non"]].forEach(([value, text]) => {
      const option = node("option", "", text);
      option.value = value;
      option.selected = String(field.default ?? false) === value;
      control.append(option);
    });
  } else {
    control = field.type === "text" ? document.createElement("textarea") : document.createElement("input");
    if (field.type === "text") control.rows = 3;
    if (field.type === "number") {
      control.type = "number";
      if (field.min !== undefined) control.min = field.min;
      if (field.max !== undefined) control.max = field.max;
    }
    control.value = field.default ?? "";
  }
  control.name = field.id;
  control.required = Boolean(field.required);
  if (field.maxLength) control.maxLength = field.maxLength;
  control.dataset.type = field.type;
  label.append(control);
  return label;
}

function renderRecipeTester() {
  const recipe = state.registry.recipes.find(({ id }) => id === state.selectedRecipeId);
  tester.hidden = !recipe;
  element("compiled-output").hidden = true;
  if (!recipe) return;
  element("recipe-title").textContent = recipe.title;
  element("recipe-media").textContent = recipe.outputs[0].mediaType;
  const form = element("compile-form");
  form.replaceChildren(...recipe.fields.map(inputForField));
  const button = node("button", "", "Compiler le prompt");
  button.type = "submit";
  form.append(button);
}

function activeLibraryTool() {
  const tool = state.registry.tools.find(({ id }) => id === state.selectedToolId);
  return tool?.adapterId === "prompt-library" ? tool : null;
}

async function loadLibrary(libraryId, { preserveSelection = true } = {}) {
  const query = new URLSearchParams({ setupId: activeSetupId() });
  const payload = await api(`/api/v1/libraries/${libraryId}?${query}`);
  if (libraryId !== state.selectedToolId) return;
  state.librarySnapshot = payload;
  const library = payload.library;
  const categoryIds = new Set(library.categories.map(({ id }) => id));
  const entries = [...library.entries, ...library.hiddenEntries];
  if (!preserveSelection || !categoryIds.has(state.selectedLibraryCategoryId)) {
    state.selectedLibraryCategoryId = library.categories[0]?.id ?? null;
  }
  if (!preserveSelection || !entries.some(({ id }) => id === state.selectedLibraryEntryId)) {
    state.selectedLibraryEntryId = entries.find(({ categoryId }) => categoryId === state.selectedLibraryCategoryId)?.id ?? entries[0]?.id ?? null;
  }
  renderLibraryEditor();
}

function libraryEntryFromForm(current, data) {
  const title = data.get("title").trim();
  const template = data.get("template");
  const usesScene = template.includes("{{scene}}");
  return {
    id: current.id,
    categoryId: data.get("categoryId"),
    order: current.order,
    description: data.get("description").trim(),
    recipe: {
      schemaVersion: "1.0",
      id: current.recipe.id,
      revision: current.recipe.revision,
      title,
      fields: usesScene ? [{ id: "scene", label: "Détails", type: "text", maxLength: 4_000, default: "" }] : [],
      outputs: [{
        id: "main",
        mediaType: data.get("mediaType"),
        template,
        negativePrompt: current.recipe.outputs[0].negativePrompt ?? "",
        settings: current.recipe.outputs[0].settings ?? {}
      }],
      referenceSlots: []
    }
  };
}

function libraryMutation(path, options) {
  return api(path, options).then(async (payload) => {
    acceptRegistry(payload);
    if (state.selectedToolId) await loadLibrary(state.selectedToolId);
    return payload;
  });
}

function categoryEntries(library, categoryId) {
  return [...library.entries, ...library.hiddenEntries]
    .filter((entry) => entry.categoryId === categoryId)
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
}

async function moveLibraryCategory(direction) {
  const library = state.librarySnapshot.library;
  const ids = library.categories.map(({ id }) => id);
  const index = ids.indexOf(state.selectedLibraryCategoryId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= ids.length) return;
  [ids[index], ids[target]] = [ids[target], ids[index]];
  await libraryMutation(`/api/v1/libraries/${library.id}/categories`, {
    method: "PUT", body: JSON.stringify(mutationEnvelope({ expectedRevision: state.registry.revision, ids }))
  });
}

async function moveLibraryEntry(direction) {
  const library = state.librarySnapshot.library;
  const entries = categoryEntries(library, state.selectedLibraryCategoryId);
  const ids = entries.map(({ id }) => id);
  const index = ids.indexOf(state.selectedLibraryEntryId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= ids.length) return;
  [ids[index], ids[target]] = [ids[target], ids[index]];
  await libraryMutation(`/api/v1/libraries/${library.id}/entries/order`, {
    method: "PUT",
    body: JSON.stringify(mutationEnvelope({ expectedRevision: state.registry.revision, categoryId: state.selectedLibraryCategoryId, ids }))
  });
}

function renderLibraryEditor() {
  const tool = activeLibraryTool();
  const snapshot = state.librarySnapshot;
  libraryEditor.hidden = !tool || !snapshot || snapshot.library.id !== tool.id;
  if (libraryEditor.hidden) return;
  tester.hidden = true;
  const library = snapshot.library;
  element("library-origin").textContent = library.origin === "builtin" ? "Bibliothèque intégrée" : "Bibliothèque personnelle";
  element("library-title").textContent = library.title;
  element("library-name").value = library.title;

  const categories = element("library-categories");
  categories.replaceChildren();
  library.categories.forEach((category) => {
    const control = node("button", "library-category-chip");
    control.type = "button";
    control.classList.toggle("is-active", category.id === state.selectedLibraryCategoryId);
    control.append(node("span", "", category.title), node("b", "", String(categoryEntries(library, category.id).length)));
    control.addEventListener("click", () => {
      state.selectedLibraryCategoryId = category.id;
      state.selectedLibraryEntryId = categoryEntries(library, category.id)[0]?.id ?? null;
      renderLibraryEditor();
    });
    categories.append(control);
  });
  const activeCategory = library.categories.find(({ id }) => id === state.selectedLibraryCategoryId);
  if (activeCategory) {
    const controls = node("div", "library-order-strip");
    const up = node("button", "", "←"); up.type = "button"; up.title = "Déplacer la catégorie à gauche";
    const down = node("button", "", "→"); down.type = "button"; down.title = "Déplacer la catégorie à droite";
    const rename = node("button", "", "Renommer"); rename.type = "button";
    up.disabled = library.categories[0]?.id === activeCategory.id;
    down.disabled = library.categories.at(-1)?.id === activeCategory.id;
    up.addEventListener("click", () => moveLibraryCategory(-1).catch((error) => toast(error.message, true)));
    down.addEventListener("click", () => moveLibraryCategory(1).catch((error) => toast(error.message, true)));
    rename.addEventListener("click", async () => {
      const title = window.prompt("Nouveau nom de la catégorie", activeCategory.title)?.trim();
      if (!title || title === activeCategory.title) return;
      try {
        await libraryMutation(`/api/v1/libraries/${library.id}/categories/${activeCategory.id}`, {
          method: "PATCH", body: JSON.stringify(mutationEnvelope({ expectedRevision: state.registry.revision, title }))
        });
        toast("Catégorie renommée.");
      } catch (error) { toast(error.message, true); }
    });
    controls.append(up, down, rename);
    if (activeCategory.origin === "user" && categoryEntries(library, activeCategory.id).length === 0) {
      const remove = node("button", "danger-quiet", "Supprimer"); remove.type = "button";
      remove.addEventListener("click", async () => {
        if (!window.confirm(`Supprimer la catégorie « ${activeCategory.title} » ?`)) return;
        try {
          state.selectedLibraryCategoryId = library.categories.find(({ id }) => id !== activeCategory.id)?.id ?? null;
          await libraryMutation(`/api/v1/libraries/${library.id}/categories/${activeCategory.id}`, {
            method: "DELETE", body: JSON.stringify(mutationEnvelope({ expectedRevision: state.registry.revision }))
          });
          toast("Catégorie supprimée.");
        } catch (error) { toast(error.message, true); }
      });
      controls.append(remove);
    }
    categories.append(controls);
  }

  const showHidden = element("show-hidden-entries").checked;
  const visible = library.entries.filter(({ categoryId }) => categoryId === state.selectedLibraryCategoryId);
  const hidden = library.hiddenEntries.filter(({ categoryId }) => categoryId === state.selectedLibraryCategoryId);
  const displayed = showHidden ? [...visible, ...hidden].sort((a, b) => a.order - b.order) : visible;
  const list = element("library-entry-list");
  list.replaceChildren();
  displayed.forEach((entry) => {
    const isHidden = hidden.some(({ id }) => id === entry.id);
    const row = node("div", `library-entry-card${isHidden ? " is-hidden" : ""}`);
    row.classList.toggle("is-selected", entry.id === state.selectedLibraryEntryId);
    const pick = node("button", "library-entry-pick"); pick.type = "button";
    pick.append(node("b", "", entry.recipe.title), node("span", "", entry.description || "Sans description"));
    pick.addEventListener("click", () => { state.selectedLibraryEntryId = entry.id; renderLibraryEditor(); });
    const move = node("div", "library-entry-move");
    const up = node("button", "", "↑"); up.type = "button"; up.title = "Monter";
    const down = node("button", "", "↓"); down.type = "button"; down.title = "Descendre";
    const ordered = categoryEntries(library, entry.categoryId);
    up.disabled = ordered[0]?.id === entry.id;
    down.disabled = ordered.at(-1)?.id === entry.id;
    up.addEventListener("click", () => { state.selectedLibraryEntryId = entry.id; moveLibraryEntry(-1).catch((error) => toast(error.message, true)); });
    down.addEventListener("click", () => { state.selectedLibraryEntryId = entry.id; moveLibraryEntry(1).catch((error) => toast(error.message, true)); });
    move.append(up, down);
    row.append(pick, move);
    list.append(row);
  });
  if (!displayed.length) list.append(node("p", "empty-tools", showHidden ? "Cette catégorie est vide." : "Aucune carte visible dans cette catégorie."));

  const allEntries = [...library.entries, ...library.hiddenEntries];
  const entry = allEntries.find(({ id }) => id === state.selectedLibraryEntryId);
  const form = element("library-entry-form");
  form.hidden = !entry;
  if (!entry) return;
  const data = form.elements;
  data.title.value = entry.recipe.title;
  data.description.value = entry.description;
  data.mediaType.value = entry.recipe.outputs[0].mediaType;
  data.template.value = entry.recipe.outputs[0].template;
  data.categoryId.replaceChildren(...library.categories.map((category) => {
    const option = node("option", "", category.title); option.value = category.id; option.selected = category.id === entry.categoryId; return option;
  }));
  const isHidden = library.hiddenEntries.some(({ id }) => id === entry.id);
  element("entry-origin").textContent = entry.origin === "builtin" ? "Carte intégrée" : "Carte personnelle";
  element("entry-status").textContent = isHidden ? "Masquée" : entry.isModified ? "Modifiée" : "Active";
  element("revert-library-entry").hidden = !(entry.origin === "builtin" && entry.isModified);
  element("hide-library-entry").textContent = isHidden ? "Restaurer" : "Masquer";
}

function fillRecipeTargets() {
  const select = element("recipe-target");
  const previous = select.value || state.selectedWorkshopId;
  select.replaceChildren();
  state.registry.workshops.forEach((workshop) => {
    const option = node("option", "", workshop.title);
    option.value = workshop.id;
    option.selected = workshop.id === previous;
    select.append(option);
  });
}

function renderSetups() {
  const { activeSetup, setups } = state.setupContext;
  const select = element("setup-select");
  select.replaceChildren();
  setups.forEach((setup) => {
    const option = node("option", "", setup.name);
    option.value = setup.id;
    option.selected = setup.id === activeSetup.id;
    select.append(option);
  });
  element("setup-count").textContent = `${setups.length} setup${setups.length === 1 ? "" : "s"}`;
  element("version-history-title").textContent = activeSetup.name;
}

function render() {
  if (!state.registry) return;
  renderSetups();
  renderNavigation();
  renderWorkshops();
  renderInspector();
}

const toolWorkspace = createToolWorkspace({
  api,
  toast,
  getWorkspace: () => state,
  toolsForWorkshop,
  activeSetupId,
  toolStateChanged: (revision) => { state.toolStateRevision = revision; },
  registryChanged: acceptRegistry,
  navigateToWorkshop: showWorkshop
});

element("back-to-build").addEventListener("click", showBuild);

window.addEventListener("barz:load-blocking-scene", async (event) => {
  const plan = event.detail?.plan;
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) return;
  try {
    await showWorkshop("utilities");
    await toolWorkspace.openTool("blocking-studio");
    const frame = document.querySelector(".blocking-studio-frame");
    if (!frame) throw new Error("Blocking Studio frame is unavailable.");
    if (frame.contentDocument?.readyState !== "complete") {
      await Promise.race([
        new Promise((resolve) => frame.addEventListener("load", resolve, { once: true })),
        new Promise((resolve) => setTimeout(resolve, 4000))
      ]);
    }
    frame.contentWindow?.postMessage({ type: "prompt-atlas:load-blocking-scene", plan }, window.location.origin);
    toast("Scène Atlas chargée dans Blocking Studio.");
  } catch (error) {
    toast(error.message || "La scène Atlas n’a pas pu être chargée.", true);
  }
});

async function saveOrder(ids) {
  try {
    acceptRegistry(await api("/api/v1/workshops/order", {
      method: "PUT",
      body: JSON.stringify(mutationEnvelope({ expectedRevision: state.registry.revision, ids }))
    }));
    toast("Ordre des ateliers enregistré.");
  } catch (error) {
    toast(error.message, true);
  }
}

async function moveSelected(direction) {
  const ids = state.registry.workshops.map(({ id }) => id);
  const index = ids.indexOf(state.selectedWorkshopId);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= ids.length) return;
  [ids[index], ids[nextIndex]] = [ids[nextIndex], ids[index]];
  await saveOrder(ids);
}

function closeDialog(button) {
  button.closest("dialog").close();
}

document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => closeDialog(button)));
document.querySelectorAll("dialog").forEach((dialog) => dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
}));

function openSetupDialog(action) {
  state.setupAction = action;
  const active = state.setupContext.activeSetup;
  const copy = {
    create: ["Nouveau setup", "Crée une configuration vierge à partir des réglages Atlas intégrés.", "Créer", ""],
    duplicate: ["Dupliquer le setup", `Crée une copie indépendante de « ${active.name} ».`, "Dupliquer", `${active.name} — copie`],
    rename: ["Renommer le setup", "Le contenu et l’historique ne seront pas modifiés.", "Renommer", active.name]
  }[action];
  element("setup-dialog-title").textContent = copy[0];
  element("setup-dialog-description").textContent = copy[1];
  element("setup-submit").textContent = copy[2];
  element("setup-name").value = copy[3];
  element("setup-dialog").showModal();
  element("setup-name").focus();
  element("setup-name").select();
}

element("new-setup").addEventListener("click", () => openSetupDialog("create"));
element("duplicate-setup").addEventListener("click", () => openSetupDialog("duplicate"));
element("rename-setup").addEventListener("click", () => openSetupDialog("rename"));

element("setup-select").addEventListener("change", async (event) => {
  const id = event.currentTarget.value;
  if (id === activeSetupId()) return;
  try {
    await toolWorkspace.saveNow();
    const payload = await api("/api/v1/setups/switch", {
      method: "POST",
      body: JSON.stringify({ expectedMetadataRevision: state.setupContext.metadataRevision, id })
    });
    state.selectedWorkshopId = null;
    state.selectedToolId = null;
    state.selectedRecipeId = null;
    state.librarySnapshot = null;
    acceptRegistry(payload);
    toast(`Setup « ${state.setupContext.activeSetup.name} » chargé.`);
  } catch (error) {
    event.currentTarget.value = activeSetupId();
    toast(error.message, true);
  }
});

element("setup-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = new FormData(event.currentTarget).get("name").trim();
  try {
    await toolWorkspace.saveNow();
    let payload;
    if (state.setupAction === "rename") {
      payload = await api(`/api/v1/setups/${activeSetupId()}`, {
        method: "PATCH",
        body: JSON.stringify({ expectedMetadataRevision: state.setupContext.metadataRevision, name })
      });
    } else {
      payload = await api("/api/v1/setups", {
        method: "POST",
        body: JSON.stringify({
          expectedMetadataRevision: state.setupContext.metadataRevision,
          name,
          ...(state.setupAction === "duplicate" ? { duplicateFromSetupId: activeSetupId() } : {})
        })
      });
      state.selectedWorkshopId = null;
      state.selectedToolId = null;
      state.selectedRecipeId = null;
      state.librarySnapshot = null;
    }
    acceptRegistry(payload);
    element("setup-dialog").close();
    toast(state.setupAction === "rename" ? "Setup renommé." : "Nouveau setup actif.");
  } catch (error) { toast(error.message, true); }
});

element("save-version").addEventListener("click", () => {
  element("version-form").reset();
  element("version-dialog").showModal();
  element("version-name").focus();
});

element("version-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = new FormData(event.currentTarget).get("name").trim();
  try {
    await toolWorkspace.saveNow();
    await api("/api/v1/setup-versions", {
      method: "POST",
      body: JSON.stringify(mutationEnvelope({
        expectedRevision: state.registry.revision,
        expectedToolRevision: state.toolStateRevision,
        name
      }))
    });
    element("version-dialog").close();
    toast("Version du setup enregistrée.");
  } catch (error) { toast(error.message, true); }
});

function formatVersionDate(value) {
  const locale = document.documentElement.dataset.language === "fr" ? "fr-FR" : "en-US";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

async function showVersionHistory() {
  try {
    const payload = await api(`/api/v1/setup-versions?setupId=${encodeURIComponent(activeSetupId())}`);
    const list = element("version-list");
    list.replaceChildren();
    if (payload.versions.length === 0) list.append(node("p", "empty-tools", "Aucune version enregistrée pour ce setup."));
    payload.versions.forEach((version) => {
      const row = node("div", "version-row");
      const copy = node("div", "version-copy");
      copy.append(node("b", "", version.name), node("span", "", `${formatVersionDate(version.createdAt)} · révision ${version.sourceRevision}`));
      const restore = node("button", "", "Restaurer");
      restore.type = "button";
      restore.addEventListener("click", async () => {
        try {
          await toolWorkspace.saveNow();
          const result = await api("/api/v1/setup-versions/restore", {
            method: "POST",
            body: JSON.stringify(mutationEnvelope({
              expectedRevision: state.registry.revision,
              expectedToolRevision: state.toolStateRevision,
              versionId: version.id
            }))
          });
          state.selectedToolId = null;
          state.selectedRecipeId = null;
          state.librarySnapshot = null;
          acceptRegistry(result);
          element("version-history-dialog").close();
          toast("Version restaurée. L’état précédent reste récupérable.");
        } catch (error) { toast(error.message, true); }
      });
      row.append(copy, restore);
      list.append(row);
    });
    element("version-history-dialog").showModal();
  } catch (error) { toast(error.message, true); }
}

element("show-versions").addEventListener("click", showVersionHistory);

element("add-workshop").addEventListener("click", () => {
  element("workshop-create-form").reset();
  element("workshop-dialog").showModal();
  element("new-workshop-title").focus();
});

element("workshop-create-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = new FormData(event.currentTarget).get("title").trim();
  const id = `${slug(title, "atelier")}-${uniqueSuffix()}`;
  try {
    const payload = await api("/api/v1/workshops", {
      method: "POST",
      body: JSON.stringify({
        expectedSetupId: activeSetupId(),
        expectedRevision: state.registry.revision,
        workshop: { id, title, order: state.registry.workshops.length }
      })
    });
    state.selectedWorkshopId = id;
    acceptRegistry(payload);
    element("workshop-dialog").close();
    toast("Atelier créé.");
  } catch (error) { toast(error.message, true); }
});

element("rename-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = new FormData(event.currentTarget).get("title").trim();
  try {
    acceptRegistry(await api(`/api/v1/workshops/${state.selectedWorkshopId}`, {
      method: "PATCH",
      body: JSON.stringify(mutationEnvelope({ expectedRevision: state.registry.revision, title }))
    }));
    toast("Nom de l’atelier enregistré.");
  } catch (error) { toast(error.message, true); }
});

element("move-up").addEventListener("click", () => moveSelected(-1));
element("move-down").addEventListener("click", () => moveSelected(1));

element("add-recipe").addEventListener("click", () => {
  element("recipe-create-form").reset();
  fillRecipeTargets();
  element("recipe-target").value = state.selectedWorkshopId;
  element("recipe-dialog").showModal();
});

element("recipe-create-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const title = data.get("title").trim();
  const suffix = uniqueSuffix();
  const toolId = `${slug(title, "prompt")}-${suffix}`;
  const recipeId = `${toolId}-v1`;
  const targetId = data.get("targetId");
  const recipe = {
    schemaVersion: "1.0",
    id: recipeId,
    revision: 1,
    title,
    fields: [{ id: "input", label: data.get("fieldLabel").trim(), type: "text", required: true, maxLength: 50_000 }],
    outputs: [{ id: "main", mediaType: data.get("mediaType"), template: data.get("template"), negativePrompt: "", settings: {} }],
    referenceSlots: []
  };
  try {
    const payload = await api("/api/v1/recipes", {
      method: "POST",
      body: JSON.stringify({
        expectedSetupId: activeSetupId(),
        expectedRevision: state.registry.revision,
        recipe,
        tool: { id: toolId, title, kind: "recipe", recipeId },
        placements: [{ id: `${toolId}-in-${targetId}`, targetId, order: toolsForWorkshop(targetId).length }]
      })
    });
    state.selectedWorkshopId = targetId;
    state.selectedToolId = toolId;
    state.selectedRecipeId = recipeId;
    acceptRegistry(payload);
    element("recipe-dialog").close();
    toast("Prompt ajouté à l’atelier.");
  } catch (error) { toast(error.message, true); }
});

element("add-library").addEventListener("click", () => {
  element("library-create-form").reset();
  element("library-dialog").showModal();
  element("library-create-form").elements.title.focus();
});

element("library-create-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const title = data.get("title").trim();
  const categoryTitle = data.get("categoryTitle").trim();
  const suffix = uniqueSuffix();
  const libraryId = `${slug(title, "bibliotheque")}-${suffix}`;
  const categoryId = `${slug(categoryTitle, "principal")}-${suffix}`;
  try {
    const payload = await api("/api/v1/libraries", {
      method: "POST",
      body: JSON.stringify(mutationEnvelope({
        expectedRevision: state.registry.revision,
        library: { id: libraryId, title, categories: [{ id: categoryId, title: categoryTitle, order: 0 }], entries: [] },
        tool: { id: libraryId, title, kind: "builtin", adapterId: "prompt-library" },
        placement: {
          id: `${libraryId}-in-${state.selectedWorkshopId}`,
          toolId: libraryId,
          targetId: state.selectedWorkshopId,
          order: toolsForWorkshop(state.selectedWorkshopId).length
        }
      }))
    });
    state.selectedToolId = libraryId;
    state.selectedRecipeId = null;
    state.selectedLibraryCategoryId = categoryId;
    state.selectedLibraryEntryId = null;
    acceptRegistry(payload);
    await loadLibrary(libraryId, { preserveSelection: false });
    element("library-dialog").close();
    toast("Bibliothèque créée et prête à recevoir ses cartes.");
  } catch (error) { toast(error.message, true); }
});

element("library-rename-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = new FormData(event.currentTarget).get("title").trim();
  const libraryId = state.librarySnapshot.library.id;
  try {
    await libraryMutation(`/api/v1/libraries/${libraryId}`, {
      method: "PATCH", body: JSON.stringify(mutationEnvelope({ expectedRevision: state.registry.revision, title }))
    });
    toast("Bibliothèque renommée.");
  } catch (error) { toast(error.message, true); }
});

element("new-library-category").addEventListener("click", () => {
  element("category-create-form").reset();
  element("category-dialog").showModal();
  element("category-create-form").elements.title.focus();
});

element("category-create-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = new FormData(event.currentTarget).get("title").trim();
  const library = state.librarySnapshot.library;
  const id = `${slug(title, "categorie")}-${uniqueSuffix()}`;
  try {
    state.selectedLibraryCategoryId = id;
    state.selectedLibraryEntryId = null;
    await libraryMutation(`/api/v1/libraries/${library.id}/categories`, {
      method: "POST",
      body: JSON.stringify(mutationEnvelope({ expectedRevision: state.registry.revision, category: { id, title, order: library.categories.length } }))
    });
    element("category-dialog").close();
    toast("Catégorie créée.");
  } catch (error) { toast(error.message, true); }
});

element("new-library-entry").addEventListener("click", async () => {
  const library = state.librarySnapshot.library;
  const categoryId = state.selectedLibraryCategoryId ?? library.categories[0]?.id;
  if (!categoryId) return toast("Crée d’abord une catégorie.", true);
  const suffix = uniqueSuffix();
  const id = `nouveau-prompt-${suffix}`;
  const entry = {
    id,
    categoryId,
    order: categoryEntries(library, categoryId).length,
    description: "Nouvelle direction à personnaliser.",
    recipe: {
      schemaVersion: "1.0", id: `${id}-v1`, revision: 1, title: "Nouveau prompt",
      fields: [{ id: "scene", label: "Détails", type: "text", maxLength: 4_000, default: "" }],
      outputs: [{ id: "main", mediaType: "image", template: "{{scene}}", negativePrompt: "", settings: {} }],
      referenceSlots: []
    }
  };
  try {
    state.selectedLibraryEntryId = id;
    await libraryMutation(`/api/v1/libraries/${library.id}/entries`, {
      method: "POST", body: JSON.stringify(mutationEnvelope({ expectedRevision: state.registry.revision, entry }))
    });
    toast("Nouvelle carte créée.");
    element("library-entry-form").elements.title.focus();
  } catch (error) { toast(error.message, true); }
});

element("show-hidden-entries").addEventListener("change", renderLibraryEditor);

element("insert-scene-token").addEventListener("click", () => {
  const textarea = element("library-entry-form").elements.template;
  const start = textarea.selectionStart;
  textarea.setRangeText("{{scene}}", start, textarea.selectionEnd, "end");
  textarea.focus();
});

element("library-entry-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const library = state.librarySnapshot.library;
  const current = [...library.entries, ...library.hiddenEntries].find(({ id }) => id === state.selectedLibraryEntryId);
  if (!current) return;
  const entry = libraryEntryFromForm(current, new FormData(event.currentTarget));
  try {
    state.selectedLibraryCategoryId = entry.categoryId;
    await libraryMutation(`/api/v1/libraries/${library.id}/entries/${entry.id}`, {
      method: "PATCH", body: JSON.stringify(mutationEnvelope({ expectedRevision: state.registry.revision, entry }))
    });
    toast("Carte enregistrée dans le setup.");
  } catch (error) { toast(error.message, true); }
});

element("duplicate-library-entry").addEventListener("click", async () => {
  const library = state.librarySnapshot.library;
  const suffix = uniqueSuffix();
  const newEntryId = `${slug(element("library-entry-form").elements.title.value, "prompt")}-copie-${suffix}`;
  try {
    await libraryMutation(`/api/v1/libraries/${library.id}/entries/${state.selectedLibraryEntryId}/duplicate`, {
      method: "POST",
      body: JSON.stringify(mutationEnvelope({ expectedRevision: state.registry.revision, newEntryId, newRecipeId: `${newEntryId}-v1` }))
    });
    state.selectedLibraryEntryId = newEntryId;
    renderLibraryEditor();
    toast("Carte dupliquée. La copie est indépendante.");
  } catch (error) { toast(error.message, true); }
});

element("hide-library-entry").addEventListener("click", async () => {
  const library = state.librarySnapshot.library;
  const hidden = !library.hiddenEntries.some(({ id }) => id === state.selectedLibraryEntryId);
  const entryId = state.selectedLibraryEntryId;
  try {
    await libraryMutation(`/api/v1/libraries/${library.id}/entries/${entryId}/visibility`, {
      method: "POST", body: JSON.stringify(mutationEnvelope({ expectedRevision: state.registry.revision, hidden }))
    });
    if (hidden && !element("show-hidden-entries").checked) {
      state.selectedLibraryEntryId = state.librarySnapshot.library.entries.find(({ categoryId }) => categoryId === state.selectedLibraryCategoryId)?.id ?? null;
      renderLibraryEditor();
    }
    toast(hidden ? "Carte masquée." : "Carte restaurée.");
  } catch (error) { toast(error.message, true); }
});

element("revert-library-entry").addEventListener("click", async () => {
  const library = state.librarySnapshot.library;
  try {
    await libraryMutation(`/api/v1/libraries/${library.id}/entries/${state.selectedLibraryEntryId}/revert`, {
      method: "POST", body: JSON.stringify(mutationEnvelope({ expectedRevision: state.registry.revision }))
    });
    toast("Version intégrée restaurée.");
  } catch (error) { toast(error.message, true); }
});

element("compile-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const recipe = state.registry.recipes.find(({ id }) => id === state.selectedRecipeId);
  const data = new FormData(event.currentTarget);
  const values = {};
  recipe.fields.forEach((field) => {
    const raw = data.get(field.id);
    values[field.id] = field.type === "number" ? Number(raw) : field.type === "boolean" ? raw === "true" : raw;
  });
  try {
    const payload = await api("/api/v1/compile", { method: "POST", body: JSON.stringify({ recipeId: recipe.id, values }) });
    element("output-text").textContent = payload.outputs[0].prompt;
    element("compiled-output").hidden = false;
  } catch (error) { toast(error.message, true); }
});

element("copy-output").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(element("output-text").textContent);
    toast("Prompt copié.");
  } catch { toast("Le navigateur n’a pas autorisé la copie.", true); }
});

async function showReset(scope) {
  try {
    await toolWorkspace.saveNow();
    const workshopId = scope === "all" ? "" : state.selectedWorkshopId;
    const parameters = new URLSearchParams({ setupId: activeSetupId() });
    if (workshopId) parameters.set("workshopId", workshopId);
    const preview = await api(`/api/v1/reset-preview?${parameters}`);
    state.toolStateRevision = preview.toolStateRevision;
    state.resetScope = scope === "all" ? "all" : { workshopId };
    element("reset-description").textContent = scope === "all"
      ? "Les personnalisations des réglages intégrés seront retirées."
      : `Les personnalisations de « ${state.registry.workshops.find(({ id }) => id === workshopId).title} » seront retirées.`;
    const impact = element("reset-impact");
    impact.replaceChildren(
      node("span", "", `${preview.changedWorkshopIds.length} atelier(s) intégré(s) modifié(s)`),
      node("span", "", `${preview.changedToolIds.length} outil(s) intégré(s) modifié(s)`),
      node("span", "", `${preview.changedToolConfigurationIds.length} réglage(s) d’outil à restaurer`),
      node("span", "", `${preview.preservedUserCounts.workshops} atelier(s) personnel(s) conservé(s)`),
      node("span", "", `${preview.preservedUserCounts.recipes} recette(s) personnelle(s) conservée(s)`)
    );
    element("reset-dialog").showModal();
  } catch (error) { toast(error.message, true); }
}

element("reset-current").addEventListener("click", () => showReset("workshop"));
element("reset-all").addEventListener("click", () => showReset("all"));
element("reset-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await toolWorkspace.saveNow();
    const payload = await api("/api/v1/reset", {
      method: "POST",
      body: JSON.stringify(mutationEnvelope({
        expectedRevision: state.registry.revision,
        expectedToolRevision: state.toolStateRevision,
        scope: state.resetScope
      }))
    });
    state.selectedToolId = null;
    state.selectedRecipeId = null;
    state.librarySnapshot = null;
    acceptRegistry(payload);
    element("reset-dialog").close();
    toast("Réglages réinitialisés. Sauvegarde créée.");
  } catch (error) { toast(error.message, true); }
});

element("show-backups").addEventListener("click", async () => {
  try {
    await toolWorkspace.saveNow();
    const payload = await api(`/api/v1/backups?setupId=${encodeURIComponent(activeSetupId())}`);
    const list = element("backup-list");
    list.replaceChildren();
    if (payload.backups.length === 0) list.append(node("p", "empty-tools", "Aucune sauvegarde pour le moment."));
    payload.backups.forEach((backup) => {
      const row = node("div", "backup-row");
      const restore = node("button", "", "Restaurer");
      restore.type = "button";
      restore.addEventListener("click", async () => {
        try {
          await toolWorkspace.saveNow();
          const result = await api("/api/v1/backups/restore", {
            method: "POST",
            body: JSON.stringify(mutationEnvelope({
              expectedRevision: state.registry.revision,
              expectedToolRevision: state.toolStateRevision,
              backupName: backup.name
            }))
          });
          state.selectedToolId = null;
          state.selectedRecipeId = null;
          state.librarySnapshot = null;
          acceptRegistry(result);
          element("backup-dialog").close();
          toast("Sauvegarde restaurée. Un point de récupération a été créé.");
        } catch (error) { toast(error.message, true); }
      });
      row.append(node("span", "", `${backup.name} · ${backup.scope === "complete-setup" ? "setup complet" : "ancienne sauvegarde d’organisation"}`), restore);
      list.append(row);
    });
    element("backup-dialog").showModal();
  } catch (error) { toast(error.message, true); }
});

loadRegistry()
  .then(() => showWorkshop("utilities"))
  .catch((error) => toast(`Backstage ne peut pas charger le registre : ${error.message}`, true));
