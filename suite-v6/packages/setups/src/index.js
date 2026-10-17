import * as nodeFs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { ContractValidationError } from "../../contracts/src/index.js";
import { DEFAULT_REGISTRY, RegistryStore } from "../../registry/src/index.js";

const METADATA_FILE = "setups.local.json";
const SETUPS_DIRECTORY = "setups";
const VERSIONS_DIRECTORY = "setup-versions";
const CHECKPOINTS_DIRECTORY = "setup-checkpoints";
const TOOL_STATE_FILE = "tool-configurations.local.json";
const TRANSACTION_FILE = "setup-transaction.pending.json";
const ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,79}$/;
const chains = new Map();

export class SetupConflictError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "SetupConflictError";
    this.code = "SETUP_CONTEXT_CONFLICT";
    Object.assign(this, details);
  }
}

function serialize(key, operation) {
  const current = chains.get(key) ?? Promise.resolve();
  const next = current.catch(() => {}).then(operation);
  chains.set(key, next);
  return next.finally(() => {
    if (chains.get(key) === next) chains.delete(key);
  });
}

function assertName(name, pathName = "name") {
  if (typeof name !== "string" || name.trim().length < 1 || name.trim().length > 120) {
    throw new ContractValidationError("must contain between 1 and 120 characters", pathName);
  }
  return name.trim();
}

function assertId(id, pathName = "id") {
  if (typeof id !== "string" || !ID_PATTERN.test(id)) {
    throw new ContractValidationError("must be a safe local ID", pathName);
  }
  return id;
}

function assertMetadataRevision(expected, current) {
  if (!Number.isSafeInteger(expected) || expected < 0) {
    throw new ContractValidationError("must be a non-negative integer", "expectedMetadataRevision");
  }
  if (expected !== current) {
    throw new SetupConflictError(`Setup list revision conflict: expected ${expected}, current ${current}`, {
      expectedMetadataRevision: expected,
      currentMetadataRevision: current
    });
  }
}

function validateMetadata(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ContractValidationError("must be an object", "setups");
  if (value.schemaVersion !== "1.0") throw new ContractValidationError("unsupported schemaVersion", "setups.schemaVersion");
  if (!Number.isSafeInteger(value.revision) || value.revision < 0) throw new ContractValidationError("must be a non-negative integer", "setups.revision");
  if (!Array.isArray(value.setups) || value.setups.length < 1) throw new ContractValidationError("must contain at least one setup", "setups.setups");
  const ids = new Set();
  value.setups.forEach((setup, index) => {
    assertId(setup?.id, `setups.setups.${index}.id`);
    assertName(setup?.name, `setups.setups.${index}.name`);
    if (ids.has(setup.id)) throw new ContractValidationError("must be unique", `setups.setups.${index}.id`);
    ids.add(setup.id);
    if (typeof setup.createdAt !== "string" || typeof setup.updatedAt !== "string") {
      throw new ContractValidationError("requires timestamps", `setups.setups.${index}`);
    }
  });
  assertId(value.activeSetupId, "setups.activeSetupId");
  if (!ids.has(value.activeSetupId)) throw new ContractValidationError("must identify an existing setup", "setups.activeSetupId");
  return value;
}

function validateVersion(value, expectedSetupId) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ContractValidationError("must be an object", "version");
  if (value.schemaVersion !== "1.0") throw new ContractValidationError("unsupported schemaVersion", "version.schemaVersion");
  assertId(value.id, "version.id");
  assertId(value.setupId, "version.setupId");
  if (value.setupId !== expectedSetupId) throw new ContractValidationError("belongs to another setup", "version.setupId");
  assertName(value.name, "version.name");
  if (!Number.isSafeInteger(value.sourceRevision) || value.sourceRevision < 0) throw new ContractValidationError("must be a non-negative integer", "version.sourceRevision");
  if (!value.overlay || typeof value.overlay !== "object") throw new ContractValidationError("must contain an overlay", "version.overlay");
  if (value.toolConfigurations !== undefined && (!value.toolConfigurations || typeof value.toolConfigurations !== "object" || Array.isArray(value.toolConfigurations))) {
    throw new ContractValidationError("must contain tool configurations", "version.toolConfigurations");
  }
  return value;
}

function validateToolStateRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ContractValidationError("must be an object", "toolState");
  if (value.schemaVersion !== "1.0") throw new ContractValidationError("unsupported schemaVersion", "toolState.schemaVersion");
  if (!Number.isSafeInteger(value.revision) || value.revision < 0) throw new ContractValidationError("must be a non-negative integer", "toolState.revision");
  if (!value.tools || typeof value.tools !== "object" || Array.isArray(value.tools)) throw new ContractValidationError("must be an object", "toolState.tools");
  for (const [id, configuration] of Object.entries(value.tools)) {
    assertId(id, `toolState.tools.${id}`);
    if (!configuration || typeof configuration !== "object" || Array.isArray(configuration)) {
      throw new ContractValidationError("must be an object", `toolState.tools.${id}`);
    }
  }
  const bytes = new TextEncoder().encode(JSON.stringify(value)).byteLength;
  if (bytes > 24 * 1024 * 1024) throw new ContractValidationError("exceeds 25165824 bytes", "toolState");
  return value;
}

function jsonEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function assertToolRevision(expected, current, pathName = "expectedToolRevision") {
  if (!Number.isSafeInteger(expected) || expected < 0) {
    throw new ContractValidationError("must be a non-negative integer", pathName);
  }
  if (expected !== current) {
    throw new SetupConflictError(`Tool configuration revision conflict: expected ${expected}, current ${current}`, {
      expectedToolRevision: expected,
      currentToolRevision: current
    });
  }
}

export class AtlasSetupStore {
  constructor({
    directory,
    defaults = DEFAULT_REGISTRY,
    io = {},
    clock = () => new Date(),
    uuid = randomUUID,
    defaultToolConfigurations = {},
    defaultToolConfigurationForRegistry = () => undefined,
    resetToolConfiguration = (_toolId, _current, defaultsValue) => structuredClone(defaultsValue),
    validateToolConfiguration = () => {}
  } = {}) {
    if (!directory || typeof directory !== "string") throw new TypeError("AtlasSetupStore requires an injected directory");
    this.directory = path.resolve(directory);
    this.metadataPath = path.join(this.directory, METADATA_FILE);
    this.setupsDirectory = path.join(this.directory, SETUPS_DIRECTORY);
    this.versionsDirectory = path.join(this.directory, VERSIONS_DIRECTORY);
    this.checkpointsDirectory = path.join(this.directory, CHECKPOINTS_DIRECTORY);
    this.defaults = structuredClone(defaults);
    this.io = { ...nodeFs, ...io };
    this.clock = clock;
    this.uuid = uuid;
    this.defaultToolConfigurations = structuredClone(defaultToolConfigurations);
    this.defaultToolConfigurationForRegistry = defaultToolConfigurationForRegistry;
    this.resetToolConfiguration = resetToolConfiguration;
    this.validateToolConfiguration = validateToolConfiguration;
  }

  #registry(setupId) {
    assertId(setupId, "setupId");
    return new RegistryStore({
      directory: path.join(this.setupsDirectory, setupId),
      defaults: this.defaults,
      io: this.io,
      clock: this.clock,
      uuid: this.uuid
    });
  }

  #toolStatePath(setupId) {
    assertId(setupId, "setupId");
    return path.join(this.setupsDirectory, setupId, TOOL_STATE_FILE);
  }

  #transactionPath(setupId) {
    assertId(setupId, "setupId");
    return path.join(this.setupsDirectory, setupId, TRANSACTION_FILE);
  }

  #checkpointDirectory(setupId) {
    assertId(setupId, "setupId");
    return path.join(this.checkpointsDirectory, setupId);
  }

  async #readToolState(setupId) {
    const filePath = this.#toolStatePath(setupId);
    try {
      return validateToolStateRecord(JSON.parse(await this.io.readFile(filePath, "utf8")));
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      const initial = { schemaVersion: "1.0", revision: 0, tools: {} };
      await this.#writeToolState(setupId, initial);
      return initial;
    }
  }

  async #writeToolState(setupId, value) {
    validateToolStateRecord(value);
    const filePath = this.#toolStatePath(setupId);
    await this.io.mkdir(path.dirname(filePath), { recursive: true });
    const temporaryPath = `${filePath}.${process.pid}.${this.uuid()}.tmp`;
    await this.io.writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    try {
      await this.io.rename(temporaryPath, filePath);
    } catch (error) {
      await this.io.rm(temporaryPath, { force: true }).catch(() => {});
      throw error;
    }
  }

  #validateToolConfigurations(tools) {
    validateToolStateRecord({ schemaVersion: "1.0", revision: 0, tools });
    for (const [toolId, configuration] of Object.entries(tools)) {
      if (Object.hasOwn(this.defaultToolConfigurations, toolId)) {
        this.validateToolConfiguration(toolId, configuration);
      }
    }
    return tools;
  }

  async #writeJsonAtomic(filePath, value) {
    const temporaryPath = `${filePath}.${process.pid}.${this.uuid()}.tmp`;
    await this.io.mkdir(path.dirname(filePath), { recursive: true });
    await this.io.writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    try {
      await this.io.rename(temporaryPath, filePath);
    } catch (error) {
      await this.io.rm(temporaryPath, { force: true }).catch(() => {});
      throw error;
    }
  }

  #validateCheckpoint(value, setupId) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new ContractValidationError("must be an object", "checkpoint");
    }
    if (value.schemaVersion !== "1.0" || value.kind !== "complete-setup") {
      throw new ContractValidationError("uses an unsupported checkpoint format", "checkpoint.schemaVersion");
    }
    assertId(value.setupId, "checkpoint.setupId");
    if (value.setupId !== setupId) throw new ContractValidationError("belongs to another setup", "checkpoint.setupId");
    if (typeof value.createdAt !== "string" || typeof value.reason !== "string") {
      throw new ContractValidationError("requires provenance", "checkpoint");
    }
    if (!Number.isSafeInteger(value.sourceRevision) || value.sourceRevision < 0) {
      throw new ContractValidationError("must be a non-negative integer", "checkpoint.sourceRevision");
    }
    if (!Number.isSafeInteger(value.toolStateRevision) || value.toolStateRevision < 0) {
      throw new ContractValidationError("must be a non-negative integer", "checkpoint.toolStateRevision");
    }
    this.#registry(setupId).validateOverlaySnapshot(value.overlay);
    this.#validateToolConfigurations(value.toolConfigurations);
    return value;
  }

  async #createCheckpointLocked({ setupId, registrySnapshot, toolState, reason }) {
    const checkpoint = this.#validateCheckpoint({
      schemaVersion: "1.0",
      kind: "complete-setup",
      setupId,
      createdAt: this.clock().toISOString(),
      reason,
      sourceRevision: registrySnapshot.revision,
      defaultsVersion: registrySnapshot.defaultsVersion,
      overlay: structuredClone(registrySnapshot.overlay),
      toolStateRevision: toolState.revision,
      toolConfigurations: structuredClone(toolState.tools)
    }, setupId);
    const timestamp = checkpoint.createdAt.replace(/[:.]/g, "-");
    const backupName = `${timestamp}.r${checkpoint.sourceRevision}.t${checkpoint.toolStateRevision}.${reason}.${this.uuid()}.json`;
    await this.#writeJsonAtomic(path.join(this.#checkpointDirectory(setupId), backupName), checkpoint);
    return backupName;
  }

  async #readCheckpointLocked(setupId, backupName) {
    if (typeof backupName !== "string" || path.basename(backupName) !== backupName || !backupName.endsWith(".json")) {
      throw new ContractValidationError("must be a listed backup filename", "backupName");
    }
    const value = JSON.parse(await this.io.readFile(path.join(this.#checkpointDirectory(setupId), backupName), "utf8"));
    return this.#validateCheckpoint(value, setupId);
  }

  #validateTransaction(value, setupId) {
    if (!value || typeof value !== "object" || Array.isArray(value) || value.schemaVersion !== "1.0") {
      throw new ContractValidationError("uses an unsupported transaction format", "transaction");
    }
    assertId(value.id, "transaction.id");
    assertId(value.setupId, "transaction.setupId");
    if (value.setupId !== setupId) throw new ContractValidationError("belongs to another setup", "transaction.setupId");
    if (!Number.isSafeInteger(value.beforeRegistryRevision) || value.beforeRegistryRevision < 0
        || value.afterRegistryRevision !== value.beforeRegistryRevision + 1) {
      throw new ContractValidationError("contains invalid registry revisions", "transaction.afterRegistryRevision");
    }
    if (!Number.isSafeInteger(value.beforeToolRevision) || value.beforeToolRevision < 0) {
      throw new ContractValidationError("contains an invalid tool revision", "transaction.beforeToolRevision");
    }
    this.#registry(setupId).validateOverlaySnapshot(value.afterOverlay);
    validateToolStateRecord(value.afterToolState);
    if (value.afterToolState.revision !== value.beforeToolRevision + 1) {
      throw new ContractValidationError("must advance the tool revision once", "transaction.afterToolState.revision");
    }
    this.#validateToolConfigurations(value.afterToolState.tools);
    return value;
  }

  async #recoverSetupLocked(setupId) {
    const transactionPath = this.#transactionPath(setupId);
    let transaction;
    try {
      transaction = this.#validateTransaction(JSON.parse(await this.io.readFile(transactionPath, "utf8")), setupId);
    } catch (error) {
      if (error?.code === "ENOENT") return null;
      throw error;
    }

    const store = this.#registry(setupId);
    let registryState = await store.exportOverlay();
    if (registryState.revision === transaction.beforeRegistryRevision) {
      await store.replaceOverlay({
        expectedRevision: registryState.revision,
        overlay: transaction.afterOverlay,
        reason: transaction.id
      });
      registryState = await store.exportOverlay();
    }
    if (registryState.revision !== transaction.afterRegistryRevision
        || !jsonEqual(registryState.overlay, transaction.afterOverlay)) {
      throw new SetupConflictError(`Cannot recover setup transaction ${transaction.id}: registry state diverged`, {
        transactionId: transaction.id,
        currentRevision: registryState.revision
      });
    }

    let toolState = await this.#readToolState(setupId);
    if (toolState.revision === transaction.beforeToolRevision) {
      await this.#writeToolState(setupId, transaction.afterToolState);
      toolState = await this.#readToolState(setupId);
    }
    if (toolState.revision !== transaction.afterToolState.revision
        || !jsonEqual(toolState.tools, transaction.afterToolState.tools)) {
      throw new SetupConflictError(`Cannot recover setup transaction ${transaction.id}: tool state diverged`, {
        transactionId: transaction.id,
        currentToolRevision: toolState.revision
      });
    }
    await this.io.rm(transactionPath, { force: true });
    return transaction.id;
  }

  async #commitSetupLocked({ setupId, beforeRegistry, beforeToolState, afterOverlay, afterTools, reason }) {
    this.#registry(setupId).validateOverlaySnapshot(afterOverlay);
    this.#validateToolConfigurations(afterTools);
    const id = `transaction-${this.uuid().replace(/-/g, "").toLowerCase().slice(0, 32)}`;
    const transaction = this.#validateTransaction({
      schemaVersion: "1.0",
      id,
      setupId,
      createdAt: this.clock().toISOString(),
      reason,
      beforeRegistryRevision: beforeRegistry.revision,
      afterRegistryRevision: beforeRegistry.revision + 1,
      afterOverlay: structuredClone(afterOverlay),
      beforeToolRevision: beforeToolState.revision,
      afterToolState: {
        schemaVersion: "1.0",
        revision: beforeToolState.revision + 1,
        tools: structuredClone(afterTools)
      }
    }, setupId);
    await this.#writeJsonAtomic(this.#transactionPath(setupId), transaction);
    await this.#recoverSetupLocked(setupId);
    return { transactionId: id, toolStateRevision: transaction.afterToolState.revision };
  }

  async #readMetadata() {
    const value = JSON.parse(await this.io.readFile(this.metadataPath, "utf8"));
    return validateMetadata(value);
  }

  async #writeMetadata(value) {
    validateMetadata(value);
    const temporaryPath = `${this.metadataPath}.${process.pid}.${this.uuid()}.tmp`;
    await this.io.writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    try {
      await this.io.rename(temporaryPath, this.metadataPath);
    } catch (error) {
      await this.io.rm(temporaryPath, { force: true }).catch(() => {});
      throw error;
    }
  }

  #context(metadata) {
    const activeSetup = metadata.setups.find(({ id }) => id === metadata.activeSetupId);
    return structuredClone({
      metadataRevision: metadata.revision,
      activeSetup,
      setups: metadata.setups
    });
  }

  async init() {
    return serialize(this.metadataPath, async () => {
      await this.io.mkdir(this.directory, { recursive: true });
      await this.io.mkdir(this.setupsDirectory, { recursive: true });
      await this.io.mkdir(this.versionsDirectory, { recursive: true });
      try {
        const metadata = await this.#readMetadata();
        await this.#registry(metadata.activeSetupId).init();
        await this.#readToolState(metadata.activeSetupId);
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
        const now = this.clock().toISOString();
        const metadata = {
          schemaVersion: "1.0",
          revision: 0,
          activeSetupId: "default",
          setups: [{ id: "default", name: "Mon Atlas", createdAt: now, updatedAt: now }]
        };
        let initialOverlay;
        try {
          initialOverlay = (await new RegistryStore({
            directory: this.directory,
            defaults: this.defaults,
            io: this.io,
            clock: this.clock,
            uuid: this.uuid
          }).exportOverlay()).overlay;
        } catch (legacyError) {
          if (legacyError?.code !== "ENOENT") throw legacyError;
        }
        await this.#registry("default").init({ initialOverlay });
        await this.#readToolState("default");
        await this.#writeMetadata(metadata);
      }
      const metadata = await this.#readMetadata();
      await this.#recoverSetupLocked(metadata.activeSetupId);
      return this.#readLocked();
    });
  }

  async #readLocked() {
    const metadata = await this.#readMetadata();
    await this.#recoverSetupLocked(metadata.activeSetupId);
    const registry = await this.#registry(metadata.activeSetupId).read();
    const toolState = await this.#readToolState(metadata.activeSetupId);
    return { registry, toolStateRevision: toolState.revision, setupContext: this.#context(metadata) };
  }

  async read() {
    return serialize(this.metadataPath, () => this.#readLocked());
  }

  async createSetup({ expectedMetadataRevision, name, duplicateFromSetupId } = {}) {
    return serialize(this.metadataPath, async () => {
      const metadata = await this.#readMetadata();
      assertMetadataRevision(expectedMetadataRevision, metadata.revision);
      const setupName = assertName(name);
      const id = `setup-${this.uuid().replace(/-/g, "").toLowerCase().slice(0, 32)}`;
      let initialOverlay;
      if (duplicateFromSetupId !== undefined) {
        assertId(duplicateFromSetupId, "duplicateFromSetupId");
        if (!metadata.setups.some((setup) => setup.id === duplicateFromSetupId)) {
          throw new ContractValidationError("unknown setup", "duplicateFromSetupId");
        }
        await this.#recoverSetupLocked(duplicateFromSetupId);
        initialOverlay = (await this.#registry(duplicateFromSetupId).exportOverlay()).overlay;
      }
      await this.#registry(id).init({ initialOverlay });
      const sourceTools = duplicateFromSetupId === undefined ? {} : (await this.#readToolState(duplicateFromSetupId)).tools;
      await this.#writeToolState(id, { schemaVersion: "1.0", revision: 0, tools: structuredClone(sourceTools) });
      const now = this.clock().toISOString();
      const next = {
        ...metadata,
        revision: metadata.revision + 1,
        activeSetupId: id,
        setups: [...metadata.setups, { id, name: setupName, createdAt: now, updatedAt: now }]
      };
      await this.#writeMetadata(next);
      return this.#readLocked();
    });
  }

  async switchSetup({ expectedMetadataRevision, id } = {}) {
    return serialize(this.metadataPath, async () => {
      const metadata = await this.#readMetadata();
      assertMetadataRevision(expectedMetadataRevision, metadata.revision);
      assertId(id);
      if (!metadata.setups.some((setup) => setup.id === id)) throw new ContractValidationError("unknown setup", "id");
      await this.#registry(id).init();
      await this.#readToolState(id);
      await this.#recoverSetupLocked(id);
      const next = { ...metadata, revision: metadata.revision + 1, activeSetupId: id };
      await this.#writeMetadata(next);
      return this.#readLocked();
    });
  }

  async renameSetup({ expectedMetadataRevision, id, name } = {}) {
    return serialize(this.metadataPath, async () => {
      const metadata = await this.#readMetadata();
      assertMetadataRevision(expectedMetadataRevision, metadata.revision);
      assertId(id);
      const setup = metadata.setups.find((item) => item.id === id);
      if (!setup) throw new ContractValidationError("unknown setup", "id");
      const now = this.clock().toISOString();
      const next = {
        ...metadata,
        revision: metadata.revision + 1,
        setups: metadata.setups.map((item) => item.id === id ? { ...item, name: assertName(name), updatedAt: now } : item)
      };
      await this.#writeMetadata(next);
      return this.#readLocked();
    });
  }

  async #activeLocked(expectedSetupId) {
    const metadata = await this.#readMetadata();
    assertId(expectedSetupId, "expectedSetupId");
    if (expectedSetupId !== metadata.activeSetupId) {
      throw new SetupConflictError(`Active setup changed from ${expectedSetupId} to ${metadata.activeSetupId}`, {
        expectedSetupId,
        currentSetupId: metadata.activeSetupId
      });
    }
    await this.#recoverSetupLocked(metadata.activeSetupId);
    return { metadata, store: this.#registry(metadata.activeSetupId) };
  }

  async #mutate(method, args) {
    return serialize(this.metadataPath, async () => {
      const { metadata, store } = await this.#activeLocked(args?.expectedSetupId);
      const { expectedSetupId: _expectedSetupId, ...registryArgs } = args;
      const result = await store[method](registryArgs);
      const registry = result?.registry ?? result;
      const payload = result?.registry ? result : { registry };
      const toolState = await this.#readToolState(metadata.activeSetupId);
      return { ...payload, toolStateRevision: toolState.revision, setupContext: this.#context(metadata) };
    });
  }

  renameWorkshop(args) { return this.#mutate("renameWorkshop", args); }
  moveWorkshop(args) { return this.#mutate("moveWorkshop", args); }
  reorderWorkshops(args) { return this.#mutate("reorderWorkshops", args); }
  addWorkshop(args) { return this.#mutate("addWorkshop", args); }
  addRecipeTool(args) { return this.#mutate("addRecipeTool", args); }
  addPlacement(args) { return this.#mutate("addPlacement", args); }
  removePlacement(args) { return this.#mutate("removePlacement", args); }
  createPromptLibrary(args) { return this.#mutate("createPromptLibrary", args); }
  renamePromptLibrary(args) { return this.#mutate("renamePromptLibrary", args); }
  addLibraryCategory(args) { return this.#mutate("addLibraryCategory", args); }
  updateLibraryCategory(args) { return this.#mutate("updateLibraryCategory", args); }
  deleteLibraryCategory(args) { return this.#mutate("deleteLibraryCategory", args); }
  reorderLibraryCategories(args) { return this.#mutate("reorderLibraryCategories", args); }
  addLibraryEntry(args) { return this.#mutate("addLibraryEntry", args); }
  updateLibraryEntry(args) { return this.#mutate("updateLibraryEntry", args); }
  duplicateLibraryEntry(args) { return this.#mutate("duplicateLibraryEntry", args); }
  setLibraryEntryHidden(args) { return this.#mutate("setLibraryEntryHidden", args); }
  reorderLibraryEntries(args) { return this.#mutate("reorderLibraryEntries", args); }
  revertLibraryEntry(args) { return this.#mutate("revertLibraryEntry", args); }

  async readPromptLibrary({ expectedSetupId, libraryId } = {}) {
    return serialize(this.metadataPath, async () => {
      const { metadata, store } = await this.#activeLocked(expectedSetupId);
      const result = await store.readPromptLibrary({ libraryId });
      const toolState = await this.#readToolState(metadata.activeSetupId);
      return { ...result, toolStateRevision: toolState.revision, setupContext: this.#context(metadata) };
    });
  }

  #toolIdsForScope(registry, scope) {
    const configurable = new Set([
      ...Object.keys(this.defaultToolConfigurations),
      ...registry.tools.filter((tool) => tool.adapterId === "prompt-library").map(({ id }) => id)
    ]);
    if (scope === "all") return [...configurable];
    const workshopId = scope?.workshopId;
    if (!workshopId) throw new ContractValidationError("must be all or { workshopId }", "scope");
    const toolIds = new Set([
      ...registry.placements.filter((item) => item.targetId === workshopId).map((item) => item.toolId),
      ...this.defaults.placements.filter((item) => item.targetId === workshopId).map((item) => item.toolId)
    ]);
    return [...toolIds].filter((id) => configurable.has(id));
  }

  #resetTools(currentTools, toolIds, registry) {
    const tools = structuredClone(currentTools);
    for (const toolId of toolIds) {
      const defaultValue = Object.hasOwn(this.defaultToolConfigurations, toolId)
        ? this.defaultToolConfigurations[toolId]
        : this.defaultToolConfigurationForRegistry(toolId, registry);
      if (defaultValue === undefined) continue;
      const defaults = structuredClone(defaultValue);
      const current = tools[toolId] === undefined ? null : structuredClone(tools[toolId]);
      const next = this.resetToolConfiguration(toolId, current, defaults);
      if (Object.hasOwn(this.defaultToolConfigurations, toolId)) this.validateToolConfiguration(toolId, next);
      tools[toolId] = structuredClone(next);
    }
    this.#validateToolConfigurations(tools);
    return tools;
  }

  async resetDefaults({ expectedSetupId, expectedRevision, expectedToolRevision, scope = "all" } = {}) {
    return serialize(this.metadataPath, async () => {
      const { metadata, store } = await this.#activeLocked(expectedSetupId);
      const registry = await store.read();
      const beforeRegistry = await store.exportOverlay();
      const prepared = await store.prepareReset({ expectedRevision, scope });
      const beforeToolState = await this.#readToolState(metadata.activeSetupId);
      assertToolRevision(expectedToolRevision, beforeToolState.revision);
      const resetToolIds = this.#toolIdsForScope(registry, scope);
      const afterTools = this.#resetTools(beforeToolState.tools, resetToolIds, registry);
      const backupName = await this.#createCheckpointLocked({
        setupId: metadata.activeSetupId,
        registrySnapshot: beforeRegistry,
        toolState: beforeToolState,
        reason: scope === "all" ? "reset-all" : `reset-${scope.workshopId}`
      });
      const committed = await this.#commitSetupLocked({
        setupId: metadata.activeSetupId,
        beforeRegistry,
        beforeToolState,
        afterOverlay: prepared.after.overlay,
        afterTools,
        reason: scope === "all" ? "reset-all" : `reset-${scope.workshopId}`
      });
      return {
        registry: await store.read(),
        backupName,
        backupScope: "complete-setup",
        resetToolIds,
        ...committed,
        setupContext: this.#context(metadata)
      };
    });
  }

  async restoreBackup({ expectedSetupId, expectedRevision, expectedToolRevision, backupName } = {}) {
    return serialize(this.metadataPath, async () => {
      const { metadata, store } = await this.#activeLocked(expectedSetupId);
      const checkpointNames = await this.#listCheckpointNamesLocked(metadata.activeSetupId);
      if (!checkpointNames.includes(backupName)) {
        const restored = await store.restoreBackup({ expectedRevision, backupName });
        const toolState = await this.#readToolState(metadata.activeSetupId);
        return {
          ...restored,
          backupScope: "registry-only",
          toolStateRevision: toolState.revision,
          setupContext: this.#context(metadata)
        };
      }
      const checkpoint = await this.#readCheckpointLocked(metadata.activeSetupId, backupName);
      const beforeRegistry = await store.exportOverlay();
      await store.prepareReplacement({ expectedRevision, overlay: checkpoint.overlay });
      const beforeToolState = await this.#readToolState(metadata.activeSetupId);
      assertToolRevision(expectedToolRevision, beforeToolState.revision);
      const recoveryBackup = await this.#createCheckpointLocked({
        setupId: metadata.activeSetupId,
        registrySnapshot: beforeRegistry,
        toolState: beforeToolState,
        reason: "before-backup-restore"
      });
      const committed = await this.#commitSetupLocked({
        setupId: metadata.activeSetupId,
        beforeRegistry,
        beforeToolState,
        afterOverlay: checkpoint.overlay,
        afterTools: checkpoint.toolConfigurations,
        reason: "restore-backup"
      });
      return {
        registry: await store.read(),
        recoveryBackup,
        backupScope: "complete-setup",
        ...committed,
        setupContext: this.#context(metadata)
      };
    });
  }

  async readToolConfiguration({ expectedSetupId, toolId } = {}) {
    return serialize(this.metadataPath, async () => {
      const { metadata } = await this.#activeLocked(expectedSetupId);
      assertId(toolId, "toolId");
      const record = await this.#readToolState(metadata.activeSetupId);
      return {
        toolId,
        toolRevision: record.revision,
        configuration: record.tools[toolId] === undefined ? null : structuredClone(record.tools[toolId]),
        setupContext: this.#context(metadata)
      };
    });
  }

  async saveToolConfiguration({ expectedSetupId, expectedToolRevision, toolId, configuration } = {}) {
    return serialize(this.metadataPath, async () => {
      const { metadata } = await this.#activeLocked(expectedSetupId);
      assertId(toolId, "toolId");
      if (!configuration || typeof configuration !== "object" || Array.isArray(configuration)) {
        throw new ContractValidationError("must be an object", "configuration");
      }
      if (Object.hasOwn(this.defaultToolConfigurations, toolId)) this.validateToolConfiguration(toolId, configuration);
      const record = await this.#readToolState(metadata.activeSetupId);
      assertToolRevision(expectedToolRevision, record.revision);
      const next = {
        ...record,
        revision: record.revision + 1,
        tools: { ...record.tools, [toolId]: structuredClone(configuration) }
      };
      await this.#writeToolState(metadata.activeSetupId, next);
      return { toolId, toolRevision: next.revision, configuration: structuredClone(configuration), setupContext: this.#context(metadata) };
    });
  }

  async previewReset({ expectedSetupId, scope = "all" } = {}) {
    return serialize(this.metadataPath, async () => {
      const { metadata, store } = await this.#activeLocked(expectedSetupId);
      const registry = await store.read();
      const preview = await store.previewReset({ scope });
      const toolState = await this.#readToolState(metadata.activeSetupId);
      const resetToolIds = this.#toolIdsForScope(registry, scope);
      const resetTools = this.#resetTools(toolState.tools, resetToolIds, registry);
      const changedToolConfigurationIds = resetToolIds.filter((id) => !jsonEqual(toolState.tools[id], resetTools[id]));
      const workshopId = scope === "all" ? null : scope.workshopId;
      const affectedOtherWorkshopIds = workshopId ? [...new Set(registry.placements
        .filter((item) => resetToolIds.includes(item.toolId) && item.targetId !== workshopId)
        .map((item) => item.targetId))] : [];
      return {
        ...preview,
        toolStateRevision: toolState.revision,
        resetToolIds,
        changedToolConfigurationIds,
        affectedOtherWorkshopIds
      };
    });
  }

  async #listCheckpointNamesLocked(setupId) {
    try {
      return (await this.io.readdir(this.#checkpointDirectory(setupId)))
        .filter((name) => name.endsWith(".json"))
        .sort()
        .reverse();
    } catch (error) {
      if (error?.code === "ENOENT") return [];
      throw error;
    }
  }

  async listBackups({ expectedSetupId } = {}) {
    return serialize(this.metadataPath, async () => {
      const { metadata, store } = await this.#activeLocked(expectedSetupId);
      const complete = await this.#listCheckpointNamesLocked(metadata.activeSetupId);
      const legacy = await store.listBackups();
      return [
        ...complete.map((name) => ({ name, scope: "complete-setup" })),
        ...legacy.filter((name) => !complete.includes(name)).map((name) => ({ name, scope: "registry-only" }))
      ];
    });
  }

  async #saveVersionLocked(metadata, store, name) {
    const exported = await store.exportOverlay();
    const setupId = metadata.activeSetupId;
    const toolState = await this.#readToolState(setupId);
    const id = `version-${this.uuid().replace(/-/g, "").toLowerCase().slice(0, 32)}`;
    const version = {
      schemaVersion: "1.0",
      id,
      setupId,
      name: assertName(name),
      createdAt: this.clock().toISOString(),
      sourceRevision: exported.revision,
      defaultsVersion: exported.defaultsVersion,
      overlay: exported.overlay,
      toolStateRevision: toolState.revision,
      toolConfigurations: structuredClone(toolState.tools)
    };
    const directory = path.join(this.versionsDirectory, setupId);
    await this.io.mkdir(directory, { recursive: true });
    await this.io.writeFile(path.join(directory, `${id}.json`), `${JSON.stringify(version, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    return version;
  }

  async saveVersion({ expectedSetupId, expectedRevision, expectedToolRevision, name } = {}) {
    return serialize(this.metadataPath, async () => {
      const { metadata, store } = await this.#activeLocked(expectedSetupId);
      const exported = await store.exportOverlay();
      if (exported.revision !== expectedRevision) {
        throw new SetupConflictError(`Registry changed before version save: expected ${expectedRevision}, current ${exported.revision}`, {
          expectedRevision,
          currentRevision: exported.revision
        });
      }
      const toolState = await this.#readToolState(metadata.activeSetupId);
      assertToolRevision(expectedToolRevision, toolState.revision);
      const version = await this.#saveVersionLocked(metadata, store, name);
      return { version, toolStateRevision: toolState.revision, setupContext: this.#context(metadata) };
    });
  }

  async #listVersionsLocked(setupId) {
    assertId(setupId, "setupId");
    const directory = path.join(this.versionsDirectory, setupId);
    let names;
    try {
      names = await this.io.readdir(directory);
    } catch (error) {
      if (error?.code === "ENOENT") return [];
      throw error;
    }
    const versions = [];
    for (const fileName of names.filter((name) => /^version-[a-z0-9]+\.json$/.test(name))) {
      const version = JSON.parse(await this.io.readFile(path.join(directory, fileName), "utf8"));
      versions.push(validateVersion(version, setupId));
    }
    return versions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listVersions({ expectedSetupId } = {}) {
    return serialize(this.metadataPath, async () => {
      const { metadata } = await this.#activeLocked(expectedSetupId);
      return { versions: await this.#listVersionsLocked(metadata.activeSetupId), setupContext: this.#context(metadata) };
    });
  }

  async restoreVersion({ expectedSetupId, expectedRevision, expectedToolRevision, versionId } = {}) {
    return serialize(this.metadataPath, async () => {
      const { metadata, store } = await this.#activeLocked(expectedSetupId);
      assertId(versionId, "versionId");
      const versions = await this.#listVersionsLocked(metadata.activeSetupId);
      const target = versions.find(({ id }) => id === versionId);
      if (!target) throw new ContractValidationError("unknown version", "versionId");
      const current = await store.exportOverlay();
      const prepared = await store.prepareReplacement({
        expectedRevision,
        overlay: target.overlay,
        defaultsVersion: target.defaultsVersion
      });
      const currentToolState = await this.#readToolState(metadata.activeSetupId);
      assertToolRevision(expectedToolRevision, currentToolState.revision);
      const targetTools = structuredClone(target.toolConfigurations ?? currentToolState.tools);
      this.#validateToolConfigurations(targetTools);
      const recoveryVersion = await this.#saveVersionLocked(metadata, store, `Avant restauration — ${target.name}`.slice(0, 120));
      const committed = await this.#commitSetupLocked({
        setupId: metadata.activeSetupId,
        beforeRegistry: current,
        beforeToolState: currentToolState,
        afterOverlay: prepared.after.overlay,
        afterTools: targetTools,
        reason: "restore-setup-version"
      });
      return {
        registry: await store.read(),
        recoveryVersion,
        ...committed,
        setupContext: this.#context(metadata)
      };
    });
  }
}
