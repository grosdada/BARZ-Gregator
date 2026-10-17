import * as nodeFs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { ContractValidationError, validateLibrary, validateRecipe, validateRegistry } from "../../contracts/src/index.js";
import { emptyLibraryOverlay, libraryFingerprint, resolvePromptLibraries } from "../../prompt-libraries/src/index.js";
import { DEFAULT_REGISTRY, freshDefaults } from "./defaults.js";

const STATE_FILE = "registry.overlay.json";
const BACKUP_DIRECTORY = "registry-backups";
const chains = new Map();
const OVERLAY_KEYS = new Set([
  "workshopOverrides", "toolOverrides", "placementOverrides", "removedDefaultPlacementIds",
  "customWorkshops", "customTools", "customPlacements", "customRecipes", "customLibraries", "libraryOverlays"
]);
const LEGACY_DEFAULTS_VERSION = "6.0.0-foundation.1";
const COMPATIBLE_DEFAULTS_VERSIONS = new Set([
  "6.0.0-libraries.1", "6.0.0-a1.1", "6.0.0-a2.1", "6.0.0-a3.1", "6.0.0-a4.1",
  "6.0.0-a5.1", "6.0.0-a6.1", "6.0.0-a7.1", "6.0.0-a8.1", "6.0.0-a9.1",
  "6.0.0-a10.1", "6.0.0-a11.1", "6.0.0-a12.1", "6.0.0-a13.1", "6.0.0-a14.1", "6.0.0-a15.1", "6.0.0-a16.1", "6.0.0-a17.1", "6.0.0-a18.1", "6.0.0-a19.0",
  "6.0.0-a20.0", "6.0.0-a21.0", "6.0.0-a22.0"
]);
const RESERVED_IDS = new Set(["__proto__", "constructor", "prototype"]);

export class RegistryConflictError extends Error {
  constructor(expectedRevision, currentRevision) {
    super(`Registry revision conflict: expected ${expectedRevision}, current ${currentRevision}`);
    this.name = "RegistryConflictError";
    this.code = "REGISTRY_CONFLICT";
    this.expectedRevision = expectedRevision;
    this.currentRevision = currentRevision;
  }
}

export class FixedTabError extends Error {
  constructor(id) {
    super(`${id} is a fixed system tab and cannot be changed`);
    this.name = "FixedTabError";
    this.code = "FIXED_SYSTEM_TAB";
  }
}

function emptyOverlay(defaults = DEFAULT_REGISTRY) {
  const overlay = {
    workshopOverrides: {},
    toolOverrides: {},
    placementOverrides: {},
    removedDefaultPlacementIds: [],
    customWorkshops: [],
    customTools: [],
    customPlacements: [],
    customRecipes: []
  };
  if (defaults.schemaVersion === "1.1") Object.assign(overlay, { customLibraries: [], libraryOverlays: {} });
  return overlay;
}

function serialize(filePath, operation) {
  const current = chains.get(filePath) ?? Promise.resolve();
  const next = current.catch(() => {}).then(operation);
  chains.set(filePath, next);
  return next.finally(() => {
    if (chains.get(filePath) === next) chains.delete(filePath);
  });
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function assertLocalId(id, pathName) {
  if (typeof id !== "string" || !/^[a-z0-9][a-z0-9_-]{0,79}$/.test(id) || RESERVED_IDS.has(id)) {
    throw new ContractValidationError("invalid or reserved ID", pathName);
  }
  return id;
}

function validatePatchMap(map, allowed, pathName) {
  if (!isPlainObject(map)) throw new ContractValidationError("must be a plain object", pathName);
  for (const [id, patch] of Object.entries(map)) {
    if (!/^[a-z0-9][a-z0-9_-]{0,79}$/.test(id)) throw new ContractValidationError("invalid ID", `${pathName}.${id}`);
    if (!isPlainObject(patch)) throw new ContractValidationError("must be a plain object", `${pathName}.${id}`);
    for (const key of Object.keys(patch)) {
      if (!allowed.has(key)) throw new ContractValidationError(`unknown property ${JSON.stringify(key)}`, `${pathName}.${id}.${key}`);
    }
  }
}

function validateLibraryOverlay(value, libraryId, defaults, customLibraries) {
  const pathName = `overlay.libraryOverlays.${libraryId}`;
  if (!isPlainObject(value)) throw new ContractValidationError("must be a plain object", pathName);
  const allowed = new Set(["categoryOverrides", "customCategories", "entryOverrides", "customEntries", "hiddenEntryIds"]);
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw new ContractValidationError(`unknown property ${JSON.stringify(key)}`, `${pathName}.${key}`);
  for (const key of allowed) if (value[key] === undefined) throw new ContractValidationError("is required", `${pathName}.${key}`);
  validatePatchMap(value.categoryOverrides, new Set(["title", "order"]), `${pathName}.categoryOverrides`);
  if (!isPlainObject(value.entryOverrides)) throw new ContractValidationError("must be a plain object", `${pathName}.entryOverrides`);
  for (const [entryId, override] of Object.entries(value.entryOverrides)) {
    assertLocalId(entryId, `${pathName}.entryOverrides.${entryId}`);
    if (!isPlainObject(override) || Object.keys(override).some((key) => !["baseFingerprint", "entry"].includes(key))) {
      throw new ContractValidationError("must contain baseFingerprint and entry", `${pathName}.entryOverrides.${entryId}`);
    }
    if (typeof override.baseFingerprint !== "string" || !/^[a-f0-9]{64}$/.test(override.baseFingerprint)) {
      throw new ContractValidationError("must be a SHA-256 fingerprint", `${pathName}.entryOverrides.${entryId}.baseFingerprint`);
    }
    if (override.entry?.id !== entryId) throw new ContractValidationError("must preserve the entry ID", `${pathName}.entryOverrides.${entryId}.entry.id`);
  }
  if (!Array.isArray(value.customCategories) || !Array.isArray(value.customEntries)) {
    throw new ContractValidationError("must be arrays", pathName);
  }
  if (!Array.isArray(value.hiddenEntryIds) || new Set(value.hiddenEntryIds).size !== value.hiddenEntryIds.length) {
    throw new ContractValidationError("must be an array of unique IDs", `${pathName}.hiddenEntryIds`);
  }
  value.hiddenEntryIds.forEach((id, index) => assertLocalId(id, `${pathName}.hiddenEntryIds.${index}`));
  const source = defaults.libraries.find(({ id }) => id === libraryId) ?? customLibraries.find(({ id }) => id === libraryId);
  if (!source) throw new ContractValidationError("does not identify a library", pathName);
  const validationLibrary = {
    id: source.id,
    title: source.title,
    categories: [...source.categories, ...value.customCategories],
    entries: [...source.entries, ...value.customEntries]
  };
  for (const override of Object.values(value.entryOverrides)) {
    const index = validationLibrary.entries.findIndex(({ id }) => id === override.entry.id);
    if (index >= 0) validationLibrary.entries[index] = override.entry;
    else validationLibrary.entries.push(override.entry);
  }
  validateLibrary(validationLibrary, `${pathName}.resolved`);
}

function validateOverlay(overlay, defaults) {
  if (!isPlainObject(overlay)) throw new ContractValidationError("must be a plain object", "overlay");
  for (const key of Object.keys(overlay)) {
    if (!OVERLAY_KEYS.has(key)) throw new ContractValidationError(`unknown property ${JSON.stringify(key)}`, `overlay.${key}`);
  }
  const requiredKeys = defaults.schemaVersion === "1.1" ? OVERLAY_KEYS : new Set([...OVERLAY_KEYS].filter((key) => !["customLibraries", "libraryOverlays"].includes(key)));
  for (const key of requiredKeys) {
    if (overlay[key] === undefined) throw new ContractValidationError("is required", `overlay.${key}`);
  }
  if (defaults.schemaVersion === "1.0" && (overlay.customLibraries !== undefined || overlay.libraryOverlays !== undefined)) {
    throw new ContractValidationError("requires registry schema 1.1", "overlay.customLibraries");
  }
  validatePatchMap(overlay.workshopOverrides, new Set(["title", "icon", "order"]), "overlay.workshopOverrides");
  validatePatchMap(overlay.toolOverrides, new Set(["title"]), "overlay.toolOverrides");
  validatePatchMap(overlay.placementOverrides, new Set(["targetId", "order"]), "overlay.placementOverrides");
  if (!Array.isArray(overlay.removedDefaultPlacementIds) || new Set(overlay.removedDefaultPlacementIds).size !== overlay.removedDefaultPlacementIds.length) {
    throw new ContractValidationError("must be an array of unique IDs", "overlay.removedDefaultPlacementIds");
  }
  for (const id of Object.keys(overlay.workshopOverrides)) {
    if (!defaults.workshops.some((item) => item.id === id)) throw new ContractValidationError("does not identify a built-in workshop", `overlay.workshopOverrides.${id}`);
  }
  for (const id of Object.keys(overlay.toolOverrides)) {
    if (!defaults.tools.some((item) => item.id === id)) throw new ContractValidationError("does not identify a built-in tool", `overlay.toolOverrides.${id}`);
  }
  for (const id of Object.keys(overlay.placementOverrides)) {
    if (!defaults.placements.some((item) => item.id === id)) throw new ContractValidationError("does not identify a built-in placement", `overlay.placementOverrides.${id}`);
  }
  for (const id of overlay.removedDefaultPlacementIds) {
    if (!defaults.placements.some((item) => item.id === id)) throw new ContractValidationError("does not identify a built-in placement", "overlay.removedDefaultPlacementIds");
  }
  if (defaults.schemaVersion === "1.1") {
    if (!Array.isArray(overlay.customLibraries)) throw new ContractValidationError("must be an array", "overlay.customLibraries");
    overlay.customLibraries.forEach((library, index) => validateLibrary(library, `overlay.customLibraries.${index}`));
    if (!isPlainObject(overlay.libraryOverlays)) throw new ContractValidationError("must be a plain object", "overlay.libraryOverlays");
    for (const [libraryId, libraryOverlay] of Object.entries(overlay.libraryOverlays)) {
      assertLocalId(libraryId, `overlay.libraryOverlays.${libraryId}`);
      validateLibraryOverlay(libraryOverlay, libraryId, defaults, overlay.customLibraries);
    }
  }
}

function withOrigin(items, origin) {
  return items.map((item) => ({ ...structuredClone(item), origin }));
}

export function resolveRegistry(defaults, overlay, revision = 0) {
  validateRegistry(structuredClone(defaults));
  validateOverlay(overlay, defaults);
  const removedPlacements = new Set(overlay.removedDefaultPlacementIds);
  const tools = [
    ...defaults.tools.map((item) => ({ ...structuredClone(item), ...structuredClone(overlay.toolOverrides[item.id] ?? {}), origin: "builtin" })),
    ...withOrigin(overlay.customTools, "user")
  ];
  const libraries = defaults.schemaVersion === "1.1"
    ? resolvePromptLibraries({
      defaultLibraries: defaults.libraries,
      customLibraries: overlay.customLibraries,
      libraryOverlays: overlay.libraryOverlays,
      tools
    }).map(({ hiddenEntries: _hidden, diagnostics: _diagnostics, ...library }) => library)
    : undefined;
  const registry = {
    schemaVersion: defaults.schemaVersion,
    defaultsVersion: defaults.defaultsVersion,
    revision,
    systemTabs: structuredClone(defaults.systemTabs),
    workshops: [
      ...defaults.workshops.map((item) => ({ ...structuredClone(item), ...structuredClone(overlay.workshopOverrides[item.id] ?? {}), origin: "builtin" })),
      ...withOrigin(overlay.customWorkshops, "user")
    ].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)),
    tools,
    placements: [
      ...defaults.placements
        .filter((item) => !removedPlacements.has(item.id))
        .map((item) => ({ ...structuredClone(item), ...structuredClone(overlay.placementOverrides[item.id] ?? {}), origin: "builtin" })),
      ...withOrigin(overlay.customPlacements, "user")
    ],
    recipes: [
      ...defaults.recipes.map((item) => ({ ...structuredClone(item), origin: "builtin" })),
      ...withOrigin(overlay.customRecipes, "user")
    ],
    ...(libraries ? { libraries } : {})
  };
  validateRegistry(registry);
  return registry;
}

export function orderedNavigation(registry) {
  validateRegistry(registry);
  const start = registry.systemTabs.filter((tab) => tab.anchor === "start").sort((a, b) => a.order - b.order);
  const end = registry.systemTabs.filter((tab) => tab.anchor === "end").sort((a, b) => a.order - b.order);
  return [...structuredClone(start), ...structuredClone(registry.workshops), ...structuredClone(end)];
}

export function migrateRegistryRecord(value, defaults = DEFAULT_REGISTRY) {
  if (value?.schemaVersion === "1.0" && value?.defaultsVersion === LEGACY_DEFAULTS_VERSION
      && defaults.schemaVersion === "1.1") {
    return {
      ...structuredClone(value),
      schemaVersion: "1.1",
      defaultsVersion: defaults.defaultsVersion,
      overlay: {
        ...structuredClone(value.overlay),
        customLibraries: [],
        libraryOverlays: {}
      }
    };
  }
  if (value?.schemaVersion === defaults.schemaVersion && COMPATIBLE_DEFAULTS_VERSIONS.has(value?.defaultsVersion)) {
    return {
      ...structuredClone(value),
      defaultsVersion: defaults.defaultsVersion,
      overlay: migrateRegistryOverlay(value.overlay, value.defaultsVersion, defaults)
    };
  }
  return structuredClone(value);
}

export function migrateRegistryOverlay(overlay, fromDefaultsVersion, defaults = DEFAULT_REGISTRY) {
  if (fromDefaultsVersion === LEGACY_DEFAULTS_VERSION && defaults.schemaVersion === "1.1") {
    return { ...structuredClone(overlay), customLibraries: [], libraryOverlays: {} };
  }
  const next = structuredClone(overlay);
  if (["6.0.0-a22.0", "6.0.0-a23.0"].includes(defaults.defaultsVersion)
      && !["6.0.0-a22.0", "6.0.0-a23.0"].includes(fromDefaultsVersion)) {
    delete next.workshopOverrides?.["camera-control"];
    if (next.placementOverrides) {
      delete next.placementOverrides["veo-suite-in-camera"];
      for (const override of Object.values(next.placementOverrides)) {
        if (override.targetId === "camera-control") override.targetId = "video-builder";
      }
    }
    next.removedDefaultPlacementIds = (next.removedDefaultPlacementIds ?? [])
      .filter((id) => id !== "veo-suite-in-camera");
    const occupied = new Set(defaults.placements.map(({ toolId, targetId }) => `${toolId}\u0000${targetId}`));
    next.customPlacements = (next.customPlacements ?? []).flatMap((placement) => {
      const migrated = placement.targetId === "camera-control"
        ? { ...placement, targetId: "video-builder" }
        : placement;
      const key = `${migrated.toolId}\u0000${migrated.targetId}`;
      if (occupied.has(key)) return [];
      occupied.add(key);
      return [migrated];
    });
  }
  return next;
}

function validateRecord(value, defaults) {
  value = migrateRegistryRecord(value, defaults);
  if (!isPlainObject(value)) throw new ContractValidationError("must be a plain object", "state");
  const allowed = new Set(["schemaVersion", "defaultsVersion", "revision", "overlay"]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new ContractValidationError(`unknown property ${JSON.stringify(key)}`, `state.${key}`);
  }
  if (value.schemaVersion !== defaults.schemaVersion) throw new ContractValidationError("unsupported schemaVersion", "state.schemaVersion");
  if (value.defaultsVersion !== defaults.defaultsVersion) {
    throw new ContractValidationError(`requires defaults ${defaults.defaultsVersion}; found ${value.defaultsVersion}`, "state.defaultsVersion");
  }
  if (!Number.isSafeInteger(value.revision) || value.revision < 0) throw new ContractValidationError("must be a non-negative integer", "state.revision");
  validateOverlay(value.overlay, defaults);
  resolveRegistry(defaults, value.overlay, value.revision);
  return value;
}

function newRecord(defaults, initialOverlay = emptyOverlay(defaults)) {
  validateOverlay(initialOverlay, defaults);
  return {
    schemaVersion: defaults.schemaVersion,
    defaultsVersion: defaults.defaultsVersion,
    revision: 0,
    overlay: structuredClone(initialOverlay)
  };
}

function assertRevision(expectedRevision, currentRevision) {
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw new ContractValidationError("must be a non-negative integer", "expectedRevision");
  }
  if (expectedRevision !== currentRevision) throw new RegistryConflictError(expectedRevision, currentRevision);
}

function assertMutableWorkshop(id, registry) {
  if (registry.systemTabs.some((tab) => tab.id === id)) throw new FixedTabError(id);
  const workshop = registry.workshops.find((item) => item.id === id);
  if (!workshop) throw new ContractValidationError("unknown workshop", "workshopId");
  return workshop;
}

function librarySource(defaults, overlay, libraryId) {
  assertLocalId(libraryId, "libraryId");
  const builtin = defaults.libraries?.find(({ id }) => id === libraryId);
  const custom = overlay.customLibraries?.find(({ id }) => id === libraryId);
  const library = custom ?? builtin;
  if (!library) throw new ContractValidationError("unknown library", "libraryId");
  return { library, builtin: Boolean(builtin), defaultLibrary: builtin };
}

function ensureLibraryOverlay(overlay, libraryId) {
  if (!Object.hasOwn(overlay.libraryOverlays, libraryId)) {
    overlay.libraryOverlays[libraryId] = emptyLibraryOverlay();
  }
  return overlay.libraryOverlays[libraryId];
}

function effectiveLibrary(defaults, overlay, registry, libraryId) {
  const source = librarySource(defaults, overlay, libraryId);
  return resolvePromptLibraries({
    defaultLibraries: defaults.libraries,
    customLibraries: overlay.customLibraries,
    libraryOverlays: overlay.libraryOverlays,
    tools: registry.tools
  }).find(({ id }) => id === source.library.id);
}

function resetBuiltinLibraryOverlays(defaults, overlay, registry, workshopId) {
  if (defaults.schemaVersion !== "1.1") return;
  const scopedToolIds = new Set([
    ...registry.placements.filter((item) => !workshopId || item.targetId === workshopId).map(({ toolId }) => toolId),
    ...defaults.placements.filter((item) => !workshopId || item.targetId === workshopId).map(({ toolId }) => toolId)
  ]);
  for (const defaultLibrary of defaults.libraries) {
    if (!scopedToolIds.has(defaultLibrary.id) || !Object.hasOwn(overlay.libraryOverlays, defaultLibrary.id)) continue;
    const current = overlay.libraryOverlays[defaultLibrary.id];
    const customEntryIds = new Set(current.customEntries.map(({ id }) => id));
    overlay.libraryOverlays[defaultLibrary.id] = {
      ...current,
      categoryOverrides: {},
      entryOverrides: {},
      hiddenEntryIds: current.hiddenEntryIds.filter((id) => customEntryIds.has(id))
    };
  }
}

export class RegistryStore {
  constructor({ directory, defaults = DEFAULT_REGISTRY, io = {}, clock = () => new Date(), uuid = randomUUID } = {}) {
    if (!directory || typeof directory !== "string") throw new TypeError("RegistryStore requires an injected directory");
    this.directory = path.resolve(directory);
    this.filePath = path.join(this.directory, STATE_FILE);
    this.backupDirectory = path.join(this.directory, BACKUP_DIRECTORY);
    this.defaults = structuredClone(defaults);
    validateRegistry(this.defaults);
    this.io = { ...nodeFs, ...io };
    this.clock = clock;
    this.uuid = uuid;
  }

  async init({ initialOverlay } = {}) {
    return serialize(this.filePath, async () => {
      await this.io.mkdir(this.directory, { recursive: true });
      try {
        const source = JSON.parse(await this.io.readFile(this.filePath, "utf8"));
        const validated = validateRecord(source, this.defaults);
        if (JSON.stringify(source) !== JSON.stringify(validated)) {
          await this.#createBackup(source, "schema-1-1-migration");
          await this.#writeAtomic(validated);
        }
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
        await this.#writeAtomic(newRecord(this.defaults, initialOverlay));
      }
      return this.read();
    });
  }

  async #readRecord() {
    const value = JSON.parse(await this.io.readFile(this.filePath, "utf8"));
    return validateRecord(value, this.defaults);
  }

  async read() {
    const record = await this.#readRecord();
    return resolveRegistry(this.defaults, record.overlay, record.revision);
  }

  async readPromptLibrary({ libraryId } = {}) {
    const record = await this.#readRecord();
    const registry = resolveRegistry(this.defaults, record.overlay, record.revision);
    const library = effectiveLibrary(this.defaults, record.overlay, registry, libraryId);
    return { library: structuredClone(library), registryRevision: record.revision };
  }

  async exportOverlay() {
    const record = await this.#readRecord();
    return structuredClone({
      revision: record.revision,
      defaultsVersion: record.defaultsVersion,
      overlay: record.overlay
    });
  }

  validateOverlaySnapshot(overlay, defaultsVersion = this.defaults.defaultsVersion) {
    overlay = migrateRegistryOverlay(overlay, defaultsVersion, this.defaults);
    validateOverlay(overlay, this.defaults);
    resolveRegistry(this.defaults, overlay, 0);
    return structuredClone(overlay);
  }

  async prepareReplacement({ expectedRevision, overlay, defaultsVersion = this.defaults.defaultsVersion }) {
    const record = await this.#readRecord();
    assertRevision(expectedRevision, record.revision);
    overlay = this.validateOverlaySnapshot(overlay, defaultsVersion);
    return structuredClone({
      before: { revision: record.revision, defaultsVersion: record.defaultsVersion, overlay: record.overlay },
      after: { revision: record.revision + 1, defaultsVersion: record.defaultsVersion, overlay }
    });
  }

  async #writeAtomic(record) {
    validateRecord(record, this.defaults);
    const temporaryPath = `${this.filePath}.${process.pid}.${this.uuid()}.tmp`;
    await this.io.writeFile(temporaryPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
    try {
      await this.io.rename(temporaryPath, this.filePath);
    } catch (error) {
      await this.io.rm(temporaryPath, { force: true }).catch(() => {});
      throw error;
    }
  }

  async #transact(expectedRevision, mutator) {
    return serialize(this.filePath, async () => {
      const record = await this.#readRecord();
      assertRevision(expectedRevision, record.revision);
      const overlay = structuredClone(record.overlay);
      const candidate = await mutator(overlay, resolveRegistry(this.defaults, overlay, record.revision));
      const nextOverlay = candidate === undefined ? overlay : candidate;
      validateOverlay(nextOverlay, this.defaults);
      const next = { ...record, revision: record.revision + 1, overlay: structuredClone(nextOverlay) };
      resolveRegistry(this.defaults, next.overlay, next.revision);
      await this.#writeAtomic(next);
      return resolveRegistry(this.defaults, next.overlay, next.revision);
    });
  }

  async replaceOverlay({ expectedRevision, overlay, defaultsVersion = this.defaults.defaultsVersion, reason = "replace-overlay" }) {
    return serialize(this.filePath, async () => {
      const current = await this.#readRecord();
      assertRevision(expectedRevision, current.revision);
      overlay = this.validateOverlaySnapshot(overlay, defaultsVersion);
      const next = { ...current, revision: current.revision + 1, overlay: structuredClone(overlay) };
      resolveRegistry(this.defaults, next.overlay, next.revision);
      const backupName = await this.#createBackup(current, reason);
      await this.#writeAtomic(next);
      return { registry: resolveRegistry(this.defaults, next.overlay, next.revision), backupName };
    });
  }

  async renameWorkshop({ expectedRevision, id, title }) {
    return this.#transact(expectedRevision, (overlay, registry) => {
      const workshop = assertMutableWorkshop(id, registry);
      if (workshop.origin === "builtin") {
        overlay.workshopOverrides[id] = { ...overlay.workshopOverrides[id], title };
      } else {
        const target = overlay.customWorkshops.find((item) => item.id === id);
        target.title = title;
      }
    });
  }

  async moveWorkshop({ expectedRevision, id, order }) {
    return this.#transact(expectedRevision, (overlay, registry) => {
      const workshop = assertMutableWorkshop(id, registry);
      if (workshop.origin === "builtin") {
        overlay.workshopOverrides[id] = { ...overlay.workshopOverrides[id], order };
      } else {
        const target = overlay.customWorkshops.find((item) => item.id === id);
        target.order = order;
      }
    });
  }

  async reorderWorkshops({ expectedRevision, ids }) {
    return this.#transact(expectedRevision, (overlay, registry) => {
      if (!Array.isArray(ids) || ids.length !== registry.workshops.length || new Set(ids).size !== ids.length) {
        throw new ContractValidationError("must contain every workshop ID exactly once", "ids");
      }
      const currentIds = new Set(registry.workshops.map((item) => item.id));
      if (ids.some((id) => !currentIds.has(id))) {
        throw new ContractValidationError("contains an unknown workshop ID", "ids");
      }
      ids.forEach((id, order) => {
        const workshop = registry.workshops.find((item) => item.id === id);
        if (workshop.origin === "builtin") {
          overlay.workshopOverrides[id] = { ...overlay.workshopOverrides[id], order };
        } else {
          overlay.customWorkshops.find((item) => item.id === id).order = order;
        }
      });
    });
  }

  async addWorkshop({ expectedRevision, workshop }) {
    return this.#transact(expectedRevision, (overlay) => {
      overlay.customWorkshops.push({ ...structuredClone(workshop), origin: "user" });
    });
  }

  async addRecipeTool({ expectedRevision, recipe, tool, placements = [] }) {
    return this.#transact(expectedRevision, (overlay) => {
      validateRecipe(recipe);
      if (tool.kind !== "recipe" || tool.recipeId !== recipe.id) {
        throw new ContractValidationError("recipe tool must reference the supplied recipe", "tool.recipeId");
      }
      overlay.customRecipes.push({ ...structuredClone(recipe), origin: "user" });
      overlay.customTools.push({ ...structuredClone(tool), origin: "user" });
      overlay.customPlacements.push(...placements.map((item) => ({ ...structuredClone(item), toolId: tool.id, origin: "user" })));
    });
  }

  async createPromptLibrary({ expectedRevision, library, tool, placement }) {
    return this.#transact(expectedRevision, (overlay) => {
      validateLibrary(library);
      if (tool?.id !== library.id || tool.kind !== "builtin" || tool.adapterId !== "prompt-library") {
        throw new ContractValidationError("must be a same-ID builtin prompt-library tool", "tool");
      }
      if (placement?.toolId !== library.id) throw new ContractValidationError("must reference the library tool", "placement.toolId");
      overlay.customLibraries.push(structuredClone(library));
      overlay.customTools.push({ ...structuredClone(tool), origin: "user" });
      overlay.customPlacements.push({ ...structuredClone(placement), origin: "user" });
    });
  }

  async renamePromptLibrary({ expectedRevision, libraryId, title }) {
    return this.#transact(expectedRevision, (overlay) => {
      const source = librarySource(this.defaults, overlay, libraryId);
      if (typeof title !== "string" || !title.trim()) throw new ContractValidationError("must not be empty", "title");
      if (source.builtin) overlay.toolOverrides[libraryId] = { ...overlay.toolOverrides[libraryId], title: title.trim() };
      else {
        const tool = overlay.customTools.find(({ id }) => id === libraryId);
        tool.title = title.trim();
        source.library.title = title.trim();
      }
    });
  }

  async addLibraryCategory({ expectedRevision, libraryId, category }) {
    return this.#transact(expectedRevision, (overlay) => {
      const source = librarySource(this.defaults, overlay, libraryId);
      if (source.builtin) ensureLibraryOverlay(overlay, libraryId).customCategories.push(structuredClone(category));
      else source.library.categories.push(structuredClone(category));
    });
  }

  async updateLibraryCategory({ expectedRevision, libraryId, categoryId, title, order }) {
    return this.#transact(expectedRevision, (overlay) => {
      const source = librarySource(this.defaults, overlay, libraryId);
      const patch = Object.fromEntries(Object.entries({ title, order }).filter(([, value]) => value !== undefined));
      if (Object.keys(patch).length === 0) throw new ContractValidationError("requires title or order", "category");
      if (!source.builtin) {
        const category = source.library.categories.find(({ id }) => id === categoryId);
        if (!category) throw new ContractValidationError("unknown category", "categoryId");
        Object.assign(category, patch);
        return;
      }
      const libraryOverlay = ensureLibraryOverlay(overlay, libraryId);
      const custom = libraryOverlay.customCategories.find(({ id }) => id === categoryId);
      if (custom) Object.assign(custom, patch);
      else if (source.defaultLibrary.categories.some(({ id }) => id === categoryId)) {
        libraryOverlay.categoryOverrides[categoryId] = { ...libraryOverlay.categoryOverrides[categoryId], ...patch };
      } else throw new ContractValidationError("unknown category", "categoryId");
    });
  }

  async deleteLibraryCategory({ expectedRevision, libraryId, categoryId }) {
    return this.#transact(expectedRevision, (overlay, registry) => {
      const source = librarySource(this.defaults, overlay, libraryId);
      const resolved = effectiveLibrary(this.defaults, overlay, registry, libraryId);
      if ([...resolved.entries, ...resolved.hiddenEntries].some((entry) => entry.categoryId === categoryId)) {
        throw new ContractValidationError("is still referenced by an active or hidden entry", "categoryId");
      }
      if (!source.builtin) {
        const index = source.library.categories.findIndex(({ id }) => id === categoryId);
        if (index < 0) throw new ContractValidationError("unknown category", "categoryId");
        source.library.categories.splice(index, 1);
        return;
      }
      const libraryOverlay = ensureLibraryOverlay(overlay, libraryId);
      const index = libraryOverlay.customCategories.findIndex(({ id }) => id === categoryId);
      if (index < 0) throw new ContractValidationError("built-in categories cannot be deleted", "categoryId");
      libraryOverlay.customCategories.splice(index, 1);
    });
  }

  async reorderLibraryCategories({ expectedRevision, libraryId, ids }) {
    return this.#transact(expectedRevision, (overlay, registry) => {
      const source = librarySource(this.defaults, overlay, libraryId);
      const resolved = effectiveLibrary(this.defaults, overlay, registry, libraryId);
      const currentIds = resolved.categories.map(({ id }) => id);
      if (!Array.isArray(ids) || ids.length !== currentIds.length || new Set(ids).size !== ids.length
          || ids.some((id) => !currentIds.includes(id))) {
        throw new ContractValidationError("must contain every category ID exactly once", "ids");
      }
      const libraryOverlay = source.builtin ? ensureLibraryOverlay(overlay, libraryId) : null;
      ids.forEach((categoryId, order) => {
        if (!source.builtin) source.library.categories.find(({ id }) => id === categoryId).order = order;
        else {
          const custom = libraryOverlay.customCategories.find(({ id }) => id === categoryId);
          if (custom) custom.order = order;
          else libraryOverlay.categoryOverrides[categoryId] = { ...libraryOverlay.categoryOverrides[categoryId], order };
        }
      });
    });
  }

  async addLibraryEntry({ expectedRevision, libraryId, entry }) {
    return this.#transact(expectedRevision, (overlay) => {
      const source = librarySource(this.defaults, overlay, libraryId);
      if (source.builtin) ensureLibraryOverlay(overlay, libraryId).customEntries.push(structuredClone(entry));
      else source.library.entries.push(structuredClone(entry));
    });
  }

  async updateLibraryEntry({ expectedRevision, libraryId, entryId, entry }) {
    return this.#transact(expectedRevision, (overlay, registry) => {
      if (entry?.id !== entryId) throw new ContractValidationError("must preserve the entry ID", "entry.id");
      const source = librarySource(this.defaults, overlay, libraryId);
      const resolved = effectiveLibrary(this.defaults, overlay, registry, libraryId);
      const current = [...resolved.entries, ...resolved.hiddenEntries].find(({ id }) => id === entryId);
      if (!current) throw new ContractValidationError("unknown entry", "entryId");
      const next = structuredClone(entry);
      next.recipe.id = current.recipe.id;
      next.recipe.revision = current.recipe.revision + 1;
      if (!source.builtin) {
        const index = source.library.entries.findIndex(({ id }) => id === entryId);
        if (index < 0) throw new ContractValidationError("unknown personal entry", "entryId");
        source.library.entries[index] = next;
        return;
      }
      const libraryOverlay = ensureLibraryOverlay(overlay, libraryId);
      const customIndex = libraryOverlay.customEntries.findIndex(({ id }) => id === entryId);
      if (customIndex >= 0) libraryOverlay.customEntries[customIndex] = next;
      else {
        const base = source.defaultLibrary.entries.find(({ id }) => id === entryId);
        if (!base) throw new ContractValidationError("unknown entry", "entryId");
        libraryOverlay.entryOverrides[entryId] = { baseFingerprint: libraryFingerprint(base), entry: next };
      }
    });
  }

  async duplicateLibraryEntry({ expectedRevision, libraryId, entryId, newEntryId, newRecipeId }) {
    return this.#transact(expectedRevision, (overlay, registry) => {
      assertLocalId(newEntryId, "newEntryId");
      assertLocalId(newRecipeId, "newRecipeId");
      const source = librarySource(this.defaults, overlay, libraryId);
      const resolved = effectiveLibrary(this.defaults, overlay, registry, libraryId);
      const current = [...resolved.entries, ...resolved.hiddenEntries].find(({ id }) => id === entryId);
      if (!current) throw new ContractValidationError("unknown entry", "entryId");
      const copy = { ...structuredClone(current), id: newEntryId, recipe: { ...structuredClone(current.recipe), id: newRecipeId, revision: 1 } };
      delete copy.origin;
      delete copy.isModified;
      if (source.builtin) ensureLibraryOverlay(overlay, libraryId).customEntries.push(copy);
      else source.library.entries.push(copy);
    });
  }

  async setLibraryEntryHidden({ expectedRevision, libraryId, entryId, hidden }) {
    return this.#transact(expectedRevision, (overlay, registry) => {
      const resolved = effectiveLibrary(this.defaults, overlay, registry, libraryId);
      if (![...resolved.entries, ...resolved.hiddenEntries].some(({ id }) => id === entryId)) {
        throw new ContractValidationError("unknown entry", "entryId");
      }
      if (typeof hidden !== "boolean") throw new ContractValidationError("must be a boolean", "hidden");
      const libraryOverlay = ensureLibraryOverlay(overlay, libraryId);
      libraryOverlay.hiddenEntryIds = hidden
        ? [...new Set([...libraryOverlay.hiddenEntryIds, entryId])]
        : libraryOverlay.hiddenEntryIds.filter((id) => id !== entryId);
    });
  }

  async reorderLibraryEntries({ expectedRevision, libraryId, categoryId, ids }) {
    return this.#transact(expectedRevision, (overlay, registry) => {
      const source = librarySource(this.defaults, overlay, libraryId);
      const resolved = effectiveLibrary(this.defaults, overlay, registry, libraryId);
      const current = [...resolved.entries, ...resolved.hiddenEntries].filter((entry) => entry.categoryId === categoryId);
      const currentIds = current.map(({ id }) => id);
      if (!Array.isArray(ids) || ids.length !== currentIds.length || new Set(ids).size !== ids.length
          || ids.some((id) => !currentIds.includes(id))) {
        throw new ContractValidationError("must contain every entry ID in the category exactly once", "ids");
      }
      const libraryOverlay = source.builtin ? ensureLibraryOverlay(overlay, libraryId) : null;
      ids.forEach((entryId, order) => {
        if (!source.builtin) source.library.entries.find(({ id }) => id === entryId).order = order;
        else {
          const custom = libraryOverlay.customEntries.find(({ id }) => id === entryId);
          if (custom) custom.order = order;
          else {
            const base = source.defaultLibrary.entries.find(({ id }) => id === entryId);
            const prior = libraryOverlay.entryOverrides[entryId]?.entry ?? base;
            libraryOverlay.entryOverrides[entryId] = {
              baseFingerprint: libraryFingerprint(base),
              entry: { ...structuredClone(prior), order }
            };
          }
        }
      });
    });
  }

  async revertLibraryEntry({ expectedRevision, libraryId, entryId }) {
    return this.#transact(expectedRevision, (overlay) => {
      const source = librarySource(this.defaults, overlay, libraryId);
      if (!source.builtin) throw new ContractValidationError("is only available for built-in entries", "entryId");
      const libraryOverlay = ensureLibraryOverlay(overlay, libraryId);
      if (!Object.hasOwn(libraryOverlay.entryOverrides, entryId)) {
        throw new ContractValidationError("entry has no built-in override", "entryId");
      }
      delete libraryOverlay.entryOverrides[entryId];
      libraryOverlay.hiddenEntryIds = libraryOverlay.hiddenEntryIds.filter((id) => id !== entryId);
    });
  }

  async addPlacement({ expectedRevision, placement }) {
    return this.#transact(expectedRevision, (overlay) => {
      overlay.customPlacements.push({ ...structuredClone(placement), origin: "user" });
    });
  }

  async removePlacement({ expectedRevision, id }) {
    return this.#transact(expectedRevision, (overlay) => {
      const customIndex = overlay.customPlacements.findIndex((item) => item.id === id);
      if (customIndex >= 0) {
        overlay.customPlacements.splice(customIndex, 1);
        return;
      }
      if (!this.defaults.placements.some((item) => item.id === id)) {
        throw new ContractValidationError("unknown placement", "placementId");
      }
      if (!overlay.removedDefaultPlacementIds.includes(id)) overlay.removedDefaultPlacementIds.push(id);
    });
  }

  async previewReset({ scope = "all" } = {}) {
    const record = await this.#readRecord();
    const registry = resolveRegistry(this.defaults, record.overlay, record.revision);
    const workshopId = scope === "all" ? null : scope.workshopId;
    if (!workshopId && scope !== "all") throw new ContractValidationError("must be all or { workshopId }", "scope");
    if (workshopId) assertMutableWorkshop(workshopId, registry);
    const changedWorkshopIds = Object.keys(record.overlay.workshopOverrides)
      .filter((id) => !workshopId || id === workshopId);
    const defaultPlacementIds = new Set(this.defaults.placements
      .filter((item) => !workshopId || item.targetId === workshopId)
      .map((item) => item.id));
    const scopedToolIds = new Set([
      ...registry.placements.filter((item) => !workshopId || item.targetId === workshopId).map(({ toolId }) => toolId),
      ...this.defaults.placements.filter((item) => !workshopId || item.targetId === workshopId).map(({ toolId }) => toolId)
    ]);
    const changedLibraryIds = Object.entries(record.overlay.libraryOverlays ?? {})
      .filter(([libraryId, value]) => this.defaults.libraries?.some(({ id }) => id === libraryId)
        && scopedToolIds.has(libraryId)
        && (Object.keys(value.categoryOverrides).length > 0 || Object.keys(value.entryOverrides).length > 0
          || value.hiddenEntryIds.some((entryId) => !value.customEntries.some(({ id }) => id === entryId))))
      .map(([libraryId]) => libraryId);
    return {
      revision: record.revision,
      scope: workshopId ? { workshopId } : "all",
      changedWorkshopIds,
      changedToolIds: workshopId ? [] : Object.keys(record.overlay.toolOverrides),
      changedPlacementIds: [
        ...Object.keys(record.overlay.placementOverrides).filter((id) => !workshopId || defaultPlacementIds.has(id)),
        ...record.overlay.removedDefaultPlacementIds.filter((id) => !workshopId || defaultPlacementIds.has(id))
      ].filter((id, index, list) => list.indexOf(id) === index),
      changedLibraryIds,
      preservedUserCounts: {
        workshops: record.overlay.customWorkshops.length,
        tools: record.overlay.customTools.length,
        placements: record.overlay.customPlacements.length,
        recipes: record.overlay.customRecipes.length,
        libraries: record.overlay.customLibraries?.length ?? 0,
        libraryEntries: Object.values(record.overlay.libraryOverlays ?? {}).reduce((count, value) => count + value.customEntries.length, 0)
      }
    };
  }

  async prepareReset({ expectedRevision, scope = "all" }) {
    const record = await this.#readRecord();
    assertRevision(expectedRevision, record.revision);
    const registry = resolveRegistry(this.defaults, record.overlay, record.revision);
    const workshopId = scope === "all" ? null : scope?.workshopId;
    if (workshopId) assertMutableWorkshop(workshopId, registry);
    if (!workshopId && scope !== "all") throw new ContractValidationError("must be all or { workshopId }", "scope");

    const overlay = structuredClone(record.overlay);
    if (!workshopId) {
      overlay.workshopOverrides = {};
      overlay.toolOverrides = {};
      overlay.placementOverrides = {};
      overlay.removedDefaultPlacementIds = [];
    } else {
      delete overlay.workshopOverrides[workshopId];
      const ids = new Set(this.defaults.placements.filter((item) => item.targetId === workshopId).map((item) => item.id));
      for (const id of ids) delete overlay.placementOverrides[id];
      overlay.removedDefaultPlacementIds = overlay.removedDefaultPlacementIds.filter((id) => !ids.has(id));
    }
    resetBuiltinLibraryOverlays(this.defaults, overlay, registry, workshopId);
    this.validateOverlaySnapshot(overlay);
    return structuredClone({
      before: { revision: record.revision, defaultsVersion: record.defaultsVersion, overlay: record.overlay },
      after: { revision: record.revision + 1, defaultsVersion: record.defaultsVersion, overlay }
    });
  }

  async #createBackup(record, reason) {
    await this.io.mkdir(this.backupDirectory, { recursive: true });
    const timestamp = this.clock().toISOString().replace(/[:.]/g, "-");
    const backupName = `${timestamp}.r${record.revision}.${reason}.${this.uuid()}.json`;
    await this.io.copyFile(this.filePath, path.join(this.backupDirectory, backupName));
    return backupName;
  }

  async resetDefaults({ expectedRevision, scope = "all" }) {
    return serialize(this.filePath, async () => {
      const record = await this.#readRecord();
      assertRevision(expectedRevision, record.revision);
      const registry = resolveRegistry(this.defaults, record.overlay, record.revision);
      const workshopId = scope === "all" ? null : scope?.workshopId;
      if (workshopId) assertMutableWorkshop(workshopId, registry);
      if (!workshopId && scope !== "all") throw new ContractValidationError("must be all or { workshopId }", "scope");
      const overlay = structuredClone(record.overlay);
      if (!workshopId) {
        overlay.workshopOverrides = {};
        overlay.toolOverrides = {};
        overlay.placementOverrides = {};
        overlay.removedDefaultPlacementIds = [];
      } else {
        delete overlay.workshopOverrides[workshopId];
        const ids = new Set(this.defaults.placements.filter((item) => item.targetId === workshopId).map((item) => item.id));
        for (const id of ids) delete overlay.placementOverrides[id];
        overlay.removedDefaultPlacementIds = overlay.removedDefaultPlacementIds.filter((id) => !ids.has(id));
      }
      resetBuiltinLibraryOverlays(this.defaults, overlay, registry, workshopId);
      const next = { ...record, revision: record.revision + 1, overlay };
      resolveRegistry(this.defaults, next.overlay, next.revision);
      const backupName = await this.#createBackup(record, workshopId ? `reset-${workshopId}` : "reset-all");
      await this.#writeAtomic(next);
      return { registry: resolveRegistry(this.defaults, next.overlay, next.revision), backupName };
    });
  }

  async listBackups() {
    try {
      return (await this.io.readdir(this.backupDirectory))
        .filter((name) => name.endsWith(".json"))
        .sort()
        .reverse();
    } catch (error) {
      if (error?.code === "ENOENT") return [];
      throw error;
    }
  }

  async restoreBackup({ expectedRevision, backupName }) {
    if (typeof backupName !== "string" || path.basename(backupName) !== backupName || !backupName.endsWith(".json")) {
      throw new ContractValidationError("must be a listed backup filename", "backupName");
    }
    return serialize(this.filePath, async () => {
      const current = await this.#readRecord();
      assertRevision(expectedRevision, current.revision);
      const restored = validateRecord(JSON.parse(await this.io.readFile(path.join(this.backupDirectory, backupName), "utf8")), this.defaults);
      const next = { ...current, revision: current.revision + 1, overlay: structuredClone(restored.overlay) };
      resolveRegistry(this.defaults, next.overlay, next.revision);
      const recoveryBackup = await this.#createBackup(current, "before-restore");
      await this.#writeAtomic(next);
      return { registry: resolveRegistry(this.defaults, next.overlay, next.revision), recoveryBackup };
    });
  }
}

export { DEFAULT_REGISTRY, freshDefaults } from "./defaults.js";
