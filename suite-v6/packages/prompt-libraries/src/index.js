import { createHash } from "node:crypto";

import { ContractValidationError, validateLibrary } from "../../contracts/src/index.js";
import { compileRecipe } from "../../prompt-runtime/src/index.js";

const clone = (value) => structuredClone(value);
const sortByOrder = (left, right) => left.order - right.order || left.id.localeCompare(right.id);

export function libraryFingerprint(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function libraryFromGoodiesCatalog(catalog) {
  const library = {
    id: catalog.id,
    title: catalog.title,
    categories: catalog.categories.map(({ id, title, order }) => ({ id, title, order })),
    entries: catalog.entries.map((entry) => ({
      id: entry.id,
      categoryId: entry.categoryId,
      order: entry.order,
      description: `Direction visuelle ${entry.categoryId} : décor, lumière, matière et langage photographique.`,
      recipe: {
        schemaVersion: "1.0",
        id: `${entry.id}-v1`,
        revision: 1,
        title: entry.title,
        fields: [{ id: "scene", label: "Détails", type: "text", maxLength: 4_000, default: "[Details]" }],
        outputs: [{
          id: "main",
          mediaType: "image",
          template: `${entry.prompt}${catalog.suffix}`.split("[Scene Description]").join("{{scene}}"),
          negativePrompt: "",
          settings: {}
        }],
        referenceSlots: []
      }
    }))
  };
  validateLibrary(library);
  return library;
}

const ACTING_SECTION_TITLES = Object.freeze({ action: "ACTION", emotion: "EMOTION", sfx: "VFX", dance: "DANCE" });
const ACTING_CATEGORY_TITLES = Object.freeze({
  sport: "Sport", gun: "Armes", daily: "Gestes quotidiens", interaction: "Interactions",
  violence: "Combat & impacts", fly: "Vol", dance: "Chorégraphies", vehicle: "Véhicules",
  supernatural: "Surnaturel", joy: "Joie", sadness: "Tristesse", anger: "Colère",
  fear: "Peur", surprise: "Surprise", love: "Amour", confusion: "Confusion",
  contempt: "Mépris", transform: "Transformations", magic: "Magie", glitch: "Glitch",
  particle: "Particules", light: "Lumière", distortion: "Distorsions", elemental: "Éléments",
  destruction: "Destruction", morph: "Morphing"
});

export function libraryFromActingReview({ fixture, bundle, review } = {}) {
  const reviewedItemById = new Map(bundle.items.map((item) => [item.id, item]));
  const correctedByOriginal = new Map(review.decisions
    .filter(({ action }) => action === "correct")
    .map((decision) => [reviewedItemById.get(decision.id)?.value, decision.correctedValue]));
  const groups = [
    ...fixture.acting.groups.map((group) => ({ ...group, sectionId: group.section, categoryId: `${group.section}-${group.category}` })),
    ...fixture.dance.categories.map((group) => ({ ...group, sectionId: "dance", category: group.id, categoryId: `dance-${group.id}` }))
  ];
  const library = {
    id: "acting-gen",
    title: "Acting Gen",
    categories: groups.map((group, order) => ({
      id: group.categoryId,
      title: group.sectionId === "dance" ? group.title : ACTING_CATEGORY_TITLES[group.category] ?? group.category,
      order
    })),
    entries: groups.flatMap((group, groupOrder) => group.entries.map((entry, index) => ({
      id: `acting-${group.categoryId}-${String(index + 1).padStart(3, "0")}`,
      categoryId: group.categoryId,
      order: groupOrder * 1000 + index,
      description: group.description || `${ACTING_SECTION_TITLES[group.sectionId]} · ${ACTING_CATEGORY_TITLES[group.category] ?? group.title ?? group.category}`,
      recipe: {
        schemaVersion: "1.0",
        id: `acting-${group.categoryId}-${String(index + 1).padStart(3, "0")}-v1`,
        revision: 1,
        title: entry.title,
        fields: [],
        outputs: [{
          id: "main",
          mediaType: "video",
          template: correctedByOriginal.get(entry.text) ?? entry.text,
          negativePrompt: "",
          settings: {}
        }],
        referenceSlots: []
      }
    })))
  };
  validateLibrary(library);
  return library;
}

export function emptyLibraryOverlay() {
  return {
    categoryOverrides: {},
    customCategories: [],
    entryOverrides: {},
    customEntries: [],
    hiddenEntryIds: []
  };
}

export function resolvePromptLibrary({ baseLibrary = null, customLibrary = null, overlay = {}, title } = {}) {
  const source = customLibrary ?? baseLibrary;
  if (!source) throw new ContractValidationError("references an unknown library", "libraryId");
  validateLibrary(source);
  const normalized = { ...emptyLibraryOverlay(), ...clone(overlay) };
  const baseOrigin = baseLibrary ? "builtin" : "user";
  const diagnostics = [];
  const categories = source.categories.map((category) => ({
    ...clone(category),
    ...clone(normalized.categoryOverrides[category.id] ?? {}),
    origin: baseOrigin,
    isModified: Boolean(normalized.categoryOverrides[category.id])
  }));
  categories.push(...normalized.customCategories.map((category) => ({ ...clone(category), origin: "user", isModified: false })));

  const sourceEntries = source.entries.map((entry) => {
    const override = normalized.entryOverrides[entry.id];
    if (override && override.baseFingerprint !== libraryFingerprint(entry)) {
      diagnostics.push({ type: "base-diverged", entryId: entry.id });
    }
    return {
      ...clone(override?.entry ?? entry),
      origin: baseOrigin,
      isModified: Boolean(override)
    };
  });
  const sourceIds = new Set(source.entries.map(({ id }) => id));
  for (const entryId of Object.keys(normalized.entryOverrides)) {
    if (!sourceIds.has(entryId)) diagnostics.push({ type: "base-missing", entryId });
  }
  const allEntries = [
    ...sourceEntries,
    ...normalized.customEntries.map((entry) => ({ ...clone(entry), origin: "user", isModified: false }))
  ];
  const hiddenIds = new Set(normalized.hiddenEntryIds);
  const result = {
    id: source.id,
    title: title ?? source.title,
    origin: baseOrigin,
    isModified: false,
    categories: categories.sort(sortByOrder),
    entries: allEntries.filter(({ id }) => !hiddenIds.has(id)).sort(sortByOrder),
    hiddenEntries: allEntries.filter(({ id }) => hiddenIds.has(id)).sort(sortByOrder),
    diagnostics
  };
  return result;
}

export function resolvePromptLibraries({ defaultLibraries = [], customLibraries = [], libraryOverlays = {}, tools = [] } = {}) {
  const toolTitles = new Map(tools.map(({ id, title }) => [id, title]));
  const customById = new Map(customLibraries.map((library) => [library.id, library]));
  const ids = [...new Set([...defaultLibraries.map(({ id }) => id), ...customLibraries.map(({ id }) => id)])];
  return ids.map((id) => resolvePromptLibrary({
    baseLibrary: defaultLibraries.find((library) => library.id === id) ?? null,
    customLibrary: customById.get(id) ?? null,
    overlay: libraryOverlays[id],
    title: toolTitles.get(id)
  }));
}

export function compilePromptLibrary({ library, entryId, scene } = {}) {
  const entry = [...library.entries, ...(library.hiddenEntries ?? [])].find(({ id }) => id === entryId);
  if (!entry || (library.hiddenEntries ?? []).some(({ id }) => id === entryId)) {
    throw new ContractValidationError("references an unavailable entry", "entryId");
  }
  const supplied = entry.recipe.fields.some(({ id }) => id === "scene")
    ? (scene === undefined ? {} : { scene })
    : {};
  const outputs = compileRecipe(entry.recipe, supplied);
  return {
    libraryId: library.id,
    entryId,
    outputs: outputs.map((output) => ({ ...output, label: entry.recipe.title }))
  };
}

export function defaultLibraryConfiguration(library) {
  const firstEntry = library.entries[0] ?? null;
  return {
    activeCategory: firstEntry?.categoryId ?? library.categories[0]?.id ?? null,
    searchQuery: "",
    selectedEntryId: firstEntry?.id ?? null,
    detailsByPrompt: {}
  };
}

export function validateLibraryConfiguration(configuration, library) {
  if (!configuration || typeof configuration !== "object" || Array.isArray(configuration)) {
    throw new ContractValidationError("must be an object", "configuration");
  }
  const allowed = new Set(["activeCategory", "searchQuery", "selectedEntryId", "detailsByPrompt"]);
  for (const key of Object.keys(configuration)) {
    if (!allowed.has(key)) throw new ContractValidationError(`unknown property ${JSON.stringify(key)}`, `configuration.${key}`);
  }
  for (const key of allowed) if (configuration[key] === undefined) throw new ContractValidationError("is required", `configuration.${key}`);
  const categoryIds = new Set(library.categories.map(({ id }) => id));
  const activeEntryIds = new Set(library.entries.map(({ id }) => id));
  const allEntryIds = new Set([...activeEntryIds, ...(library.hiddenEntries ?? []).map(({ id }) => id)]);
  if (configuration.activeCategory !== null && !categoryIds.has(configuration.activeCategory)) {
    throw new ContractValidationError("references an unknown category", "configuration.activeCategory");
  }
  if (typeof configuration.searchQuery !== "string" || configuration.searchQuery.length > 500) {
    throw new ContractValidationError("must be text of at most 500 characters", "configuration.searchQuery");
  }
  if (configuration.selectedEntryId !== null && !activeEntryIds.has(configuration.selectedEntryId)) {
    throw new ContractValidationError("references an unavailable entry", "configuration.selectedEntryId");
  }
  if (!configuration.detailsByPrompt || typeof configuration.detailsByPrompt !== "object" || Array.isArray(configuration.detailsByPrompt)) {
    throw new ContractValidationError("must be an object", "configuration.detailsByPrompt");
  }
  for (const [entryId, detail] of Object.entries(configuration.detailsByPrompt)) {
    if (!allEntryIds.has(entryId)) throw new ContractValidationError("references an unknown entry", `configuration.detailsByPrompt.${entryId}`);
    if (typeof detail !== "string" || detail.length > 4_000) {
      throw new ContractValidationError("must be text of at most 4000 characters", `configuration.detailsByPrompt.${entryId}`);
    }
  }
  return configuration;
}

export function reconcileLibraryConfiguration(configuration, library) {
  const next = configuration ? clone(configuration) : defaultLibraryConfiguration(library);
  const activeIds = new Set(library.entries.map(({ id }) => id));
  if (!activeIds.has(next.selectedEntryId)) next.selectedEntryId = library.entries[0]?.id ?? null;
  const selected = library.entries.find(({ id }) => id === next.selectedEntryId);
  const categoryIds = new Set(library.categories.map(({ id }) => id));
  if (!categoryIds.has(next.activeCategory)) next.activeCategory = selected?.categoryId ?? library.categories[0]?.id ?? null;
  next.detailsByPrompt = Object.fromEntries(Object.entries(next.detailsByPrompt ?? {})
    .filter(([id]) => activeIds.has(id) || (library.hiddenEntries ?? []).some((entry) => entry.id === id)));
  validateLibraryConfiguration(next, library);
  return next;
}
