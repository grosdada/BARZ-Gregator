import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  deriveFalFamily,
  deriveFalResolutionPrices,
  deriveModelControls
} from "./generation-plan.js";
import { backfillDirectorJobs } from "./director-spending.js";
import { heygenCatalog } from "./providers/heygen.js";
import { isKrea2Style, kreaCatalog } from "./providers/krea.js";
import { falLoraCatalog } from "./providers/fal-lora.js";

const managedFalLoraEndpoints = new Set(falLoraCatalog().map((model) => model.endpointId));

const builtinCatalog = JSON.parse(readFileSync(
  new URL("../data/catalog.seed.json", import.meta.url),
  "utf8"
));

const emptyState = Object.freeze({
  drafts: [],
  activity: [],
  catalog: [],
  jobs: [],
  collections: [],
  resources: [],
  trashedAssetKeys: [],
  referenceSets: [],
  directorDraft: null,
  kreaStyles: [],
  loraTrainingJobs: []
});

function validState(value) {
  return value && Array.isArray(value.drafts) && Array.isArray(value.activity);
}

function migrateState(value) {
  if (!validState(value)) return structuredClone(emptyState);
  const storedCatalog = Array.isArray(value.catalog) ? value.catalog.filter((model) => (
    !["heygen", "krea"].includes(model.provider) && !managedFalLoraEndpoints.has(model.endpointId)
  )).map((model) => {
    if (model.provider !== "fal") return model;
    return {
      ...model,
      ...deriveFalFamily(model.endpointId, model.category),
      pricing: model.pricing ? {
        ...model.pricing,
        tiersByResolution: deriveFalResolutionPrices(model.endpointId, model.pricing.unitPrice)
      } : null,
      controls: deriveModelControls(model.inputSchema, model.endpointId)
    };
  }) : [];
  const storedKeys = new Set(storedCatalog.map((model) => `${model.provider}:${model.endpointId}`));
  const missingBuiltinModels = builtinCatalog.filter((model) => (
    !storedKeys.has(`${model.provider}:${model.endpointId}`)
  )).map((model) => ({
    ...model,
    ...deriveFalFamily(model.endpointId, model.category),
    pricing: model.pricing ? {
      ...model.pricing,
      tiersByResolution: deriveFalResolutionPrices(model.endpointId, model.pricing.unitPrice)
    } : null,
    controls: deriveModelControls(model.inputSchema, model.endpointId)
  }));
  const catalog = [...storedCatalog, ...missingBuiltinModels, ...falLoraCatalog(), ...heygenCatalog().map((model) => ({
    ...model,
    controls: deriveModelControls(model.inputSchema, model.endpointId)
  })), ...kreaCatalog()];
  const resources = Array.isArray(value.resources) ? value.resources : [];
  const jobs = backfillDirectorJobs(Array.isArray(value.jobs) ? value.jobs : [], resources);
  return {
    ...value,
    catalog,
    jobs,
    collections: Array.isArray(value.collections) ? value.collections : [],
    resources,
    trashedAssetKeys: Array.isArray(value.trashedAssetKeys) ? value.trashedAssetKeys.filter((key) => typeof key === "string") : [],
    referenceSets: Array.isArray(value.referenceSets) ? value.referenceSets : [],
    kreaStyles: Array.isArray(value.kreaStyles) ? value.kreaStyles.filter((style) => !isKrea2Style(style)) : [],
    loraTrainingJobs: Array.isArray(value.loraTrainingJobs) ? value.loraTrainingJobs : []
  };
}

export class LocalStore {
  constructor(directory) {
    this.directory = directory;
    this.filePath = path.join(directory, "state.local.json");
    this.writeChain = Promise.resolve();
  }

  async init() {
    await mkdir(this.directory, { recursive: true });
    try {
      const parsed = JSON.parse(await readFile(this.filePath, "utf8"));
      if (!validState(parsed)) throw new Error("Invalid local state");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      await this.write(emptyState);
    }
  }

  async read() {
    const parsed = JSON.parse(await readFile(this.filePath, "utf8"));
    return migrateState(parsed);
  }

  async update(mutator) {
    this.writeChain = this.writeChain.catch(() => {}).then(async () => {
      const state = await this.read();
      const nextState = await mutator(structuredClone(state));
      await this.write(nextState);
      return nextState;
    });
    return this.writeChain;
  }

  async write(state) {
    const temporaryPath = `${this.filePath}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    await rename(temporaryPath, this.filePath);
  }
}
