export const CONTRACT_LIMITS = Object.freeze({
  registryBytes: 2 * 1024 * 1024,
  recipeBytes: 256 * 1024,
  idLength: 80,
  titleLength: 120,
  promptLength: 50_000,
  workshops: 64,
  tools: 512,
  placements: 2_048,
  recipes: 512,
  fieldsPerRecipe: 64,
  outputsPerRecipe: 16,
  libraries: 512,
  categoriesPerLibrary: 64,
  entriesPerLibrary: 512
});

const ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,79}$/;
const RESERVED_IDS = new Set(["__proto__", "constructor", "prototype"]);
const FIELD_TYPES = new Set(["text", "enum", "number", "boolean", "reference"]);
const TOOL_KINDS = new Set(["recipe", "builtin", "legacy"]);
const MEDIA_TYPES = new Set(["image", "video", "music", "text"]);
const ALLOWED_SETTINGS = new Set([
  "aspectRatio", "resolution", "imageSize", "durationSeconds", "width", "height", "seed"
]);
const FIXED_TABS = Object.freeze([
  Object.freeze({ id: "deck", title: "Deck", anchor: "start", order: 0, mutable: false }),
  Object.freeze({ id: "utilities", title: "Backstage", anchor: "end", order: 0, mutable: false }),
  Object.freeze({ id: "build", title: "Build", anchor: "end", order: 1, mutable: false })
]);

export class ContractValidationError extends Error {
  constructor(message, path = "document") {
    super(`${path}: ${message}`);
    this.name = "ContractValidationError";
    this.code = "INVALID_CONTRACT";
    this.path = path;
  }
}

function fail(message, path) {
  throw new ContractValidationError(message, path);
}

function plainObject(value, path) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    fail("must be a plain object", path);
  }
  return value;
}

function exactKeys(value, allowed, path) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(`unknown property ${JSON.stringify(key)}`, `${path}.${key}`);
  }
}

function stringValue(value, path, { min = 0, max = CONTRACT_LIMITS.promptLength } = {}) {
  if (typeof value !== "string") fail("must be a string", path);
  if (value.length < min) fail(`must contain at least ${min} character(s)`, path);
  if (value.length > max) fail(`must contain at most ${max} characters`, path);
  return value;
}

function idValue(value, path) {
  stringValue(value, path, { min: 1, max: CONTRACT_LIMITS.idLength });
  if (!ID_PATTERN.test(value)) fail("must use lowercase letters, digits, underscores, or hyphens", path);
  if (RESERVED_IDS.has(value)) fail("uses a reserved identifier", path);
  return value;
}

function integerValue(value, path, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    fail(`must be an integer between ${min} and ${max}`, path);
  }
  return value;
}

function arrayValue(value, path, max) {
  if (!Array.isArray(value)) fail("must be an array", path);
  if (value.length > max) fail(`must contain at most ${max} entries`, path);
  return value;
}

function jsonBytes(value, path) {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength;
  } catch {
    fail("must be JSON serializable", path);
  }
}

function unique(items, key, path) {
  const found = new Set();
  items.forEach((item, index) => {
    const value = item[key];
    if (found.has(value)) fail(`duplicate ${key} ${JSON.stringify(value)}`, `${path}[${index}].${key}`);
    found.add(value);
  });
}

function validateWorkshop(value, path) {
  plainObject(value, path);
  exactKeys(value, new Set(["id", "title", "order", "icon", "origin"]), path);
  idValue(value.id, `${path}.id`);
  stringValue(value.title, `${path}.title`, { min: 1, max: CONTRACT_LIMITS.titleLength });
  integerValue(value.order, `${path}.order`, { max: 10_000 });
  if (value.icon !== undefined) stringValue(value.icon, `${path}.icon`, { max: 200 });
  if (value.origin !== undefined && !["builtin", "user"].includes(value.origin)) fail("must be builtin or user", `${path}.origin`);
}

function validateSystemTab(value, expected, path) {
  plainObject(value, path);
  exactKeys(value, new Set(["id", "title", "anchor", "order", "mutable"]), path);
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (value[key] !== expectedValue) fail(`fixed value must be ${JSON.stringify(expectedValue)}`, `${path}.${key}`);
  }
}

function validateTool(value, path) {
  plainObject(value, path);
  exactKeys(value, new Set(["id", "title", "kind", "recipeId", "adapterId", "origin"]), path);
  idValue(value.id, `${path}.id`);
  stringValue(value.title, `${path}.title`, { min: 1, max: CONTRACT_LIMITS.titleLength });
  if (!TOOL_KINDS.has(value.kind)) fail("must be recipe, builtin, or legacy", `${path}.kind`);
  if (value.kind === "recipe") idValue(value.recipeId, `${path}.recipeId`);
  if (value.kind !== "recipe" && value.recipeId !== undefined) fail("is only allowed for recipe tools", `${path}.recipeId`);
  if (value.adapterId !== undefined) idValue(value.adapterId, `${path}.adapterId`);
  if (value.origin !== undefined && !["builtin", "user"].includes(value.origin)) fail("must be builtin or user", `${path}.origin`);
}

function validatePlacement(value, path) {
  plainObject(value, path);
  exactKeys(value, new Set(["id", "toolId", "targetId", "order", "origin"]), path);
  idValue(value.id, `${path}.id`);
  idValue(value.toolId, `${path}.toolId`);
  idValue(value.targetId, `${path}.targetId`);
  integerValue(value.order, `${path}.order`, { max: 100_000 });
  if (value.origin !== undefined && !["builtin", "user"].includes(value.origin)) fail("must be builtin or user", `${path}.origin`);
}

function validateDefault(field, path) {
  if (field.default === undefined) return;
  if (field.type === "text") stringValue(field.default, path, { max: field.maxLength ?? CONTRACT_LIMITS.promptLength });
  if (field.type === "enum" && !field.values.includes(field.default)) fail("must occur in values", path);
  if (field.type === "number" && (typeof field.default !== "number" || !Number.isFinite(field.default))) fail("must be a finite number", path);
  if (field.type === "boolean" && typeof field.default !== "boolean") fail("must be a boolean", path);
  if (field.type === "reference") idValue(field.default, path);
}

function validateField(value, path) {
  plainObject(value, path);
  exactKeys(value, new Set(["id", "label", "type", "required", "maxLength", "values", "min", "max", "default"]), path);
  idValue(value.id, `${path}.id`);
  if (value.label !== undefined) stringValue(value.label, `${path}.label`, { min: 1, max: CONTRACT_LIMITS.titleLength });
  if (!FIELD_TYPES.has(value.type)) fail("uses an unsupported field type", `${path}.type`);
  if (value.required !== undefined && typeof value.required !== "boolean") fail("must be a boolean", `${path}.required`);
  if (value.maxLength !== undefined) integerValue(value.maxLength, `${path}.maxLength`, { min: 1, max: CONTRACT_LIMITS.promptLength });
  if (value.type === "enum") {
    arrayValue(value.values, `${path}.values`, 256);
    if (value.values.length === 0) fail("must not be empty", `${path}.values`);
    value.values.forEach((item, index) => stringValue(item, `${path}.values[${index}]`, { max: 500 }));
    if (new Set(value.values).size !== value.values.length) fail("must not contain duplicates", `${path}.values`);
  } else if (value.values !== undefined) fail("is only allowed for enum fields", `${path}.values`);
  for (const bound of ["min", "max"]) {
    if (value[bound] !== undefined && (typeof value[bound] !== "number" || !Number.isFinite(value[bound]))) fail("must be a finite number", `${path}.${bound}`);
  }
  if (value.min !== undefined && value.max !== undefined && value.min > value.max) fail("must not exceed max", `${path}.min`);
  validateDefault(value, `${path}.default`);
}

function validateSettings(value, path) {
  plainObject(value, path);
  exactKeys(value, ALLOWED_SETTINGS, path);
  for (const [key, setting] of Object.entries(value)) {
    if (["durationSeconds", "width", "height"].includes(key)) {
      if (typeof setting !== "number" || !Number.isFinite(setting) || setting <= 0) fail("must be a positive number", `${path}.${key}`);
    } else if (!["string", "number"].includes(typeof setting) || (typeof setting === "number" && !Number.isFinite(setting))) {
      fail("must be a string or number", `${path}.${key}`);
    }
  }
}

function validateOutput(value, path, fieldIds) {
  plainObject(value, path);
  exactKeys(value, new Set(["id", "mediaType", "template", "negativePrompt", "settings"]), path);
  idValue(value.id, `${path}.id`);
  if (!MEDIA_TYPES.has(value.mediaType)) fail("uses an unsupported media type", `${path}.mediaType`);
  stringValue(value.template, `${path}.template`, { min: 1, max: CONTRACT_LIMITS.promptLength });
  if (value.negativePrompt !== undefined) stringValue(value.negativePrompt, `${path}.negativePrompt`, { max: CONTRACT_LIMITS.promptLength });
  if (value.settings !== undefined) validateSettings(value.settings, `${path}.settings`);
  for (const match of value.template.matchAll(/\{\{\s*([a-z0-9_-]+)\s*\}\}/gi)) {
    if (!fieldIds.has(match[1])) fail(`references unknown field ${JSON.stringify(match[1])}`, `${path}.template`);
  }
}

export function validateRecipe(value, path = "recipe") {
  plainObject(value, path);
  if (jsonBytes(value, path) > CONTRACT_LIMITS.recipeBytes) fail(`exceeds ${CONTRACT_LIMITS.recipeBytes} bytes`, path);
  exactKeys(value, new Set(["schemaVersion", "id", "revision", "title", "fields", "outputs", "referenceSlots", "origin"]), path);
  if (value.schemaVersion !== "1.0") fail("unsupported schemaVersion", `${path}.schemaVersion`);
  idValue(value.id, `${path}.id`);
  integerValue(value.revision, `${path}.revision`, { min: 1 });
  stringValue(value.title, `${path}.title`, { min: 1, max: CONTRACT_LIMITS.titleLength });
  if (value.origin !== undefined && !["builtin", "user"].includes(value.origin)) fail("must be builtin or user", `${path}.origin`);
  const fields = arrayValue(value.fields, `${path}.fields`, CONTRACT_LIMITS.fieldsPerRecipe);
  fields.forEach((field, index) => validateField(field, `${path}.fields[${index}]`));
  unique(fields, "id", `${path}.fields`);
  const fieldIds = new Set(fields.map((field) => field.id));
  const outputs = arrayValue(value.outputs, `${path}.outputs`, CONTRACT_LIMITS.outputsPerRecipe);
  if (outputs.length === 0) fail("must not be empty", `${path}.outputs`);
  outputs.forEach((output, index) => validateOutput(output, `${path}.outputs[${index}]`, fieldIds));
  unique(outputs, "id", `${path}.outputs`);
  const referenceSlots = arrayValue(value.referenceSlots ?? [], `${path}.referenceSlots`, 12);
  referenceSlots.forEach((slot, index) => idValue(slot, `${path}.referenceSlots[${index}]`));
  if (new Set(referenceSlots).size !== referenceSlots.length) fail("must not contain duplicates", `${path}.referenceSlots`);
  return value;
}

export function validateRegistry(value, path = "registry") {
  plainObject(value, path);
  if (jsonBytes(value, path) > CONTRACT_LIMITS.registryBytes) fail(`exceeds ${CONTRACT_LIMITS.registryBytes} bytes`, path);
  exactKeys(value, new Set(["schemaVersion", "defaultsVersion", "revision", "systemTabs", "workshops", "tools", "placements", "recipes", "libraries"]), path);
  if (!["1.0", "1.1"].includes(value.schemaVersion)) fail("unsupported schemaVersion", `${path}.schemaVersion`);
  if (value.schemaVersion === "1.0" && value.libraries !== undefined) fail("is only supported by registry 1.1", `${path}.libraries`);
  if (value.schemaVersion === "1.1" && value.libraries === undefined) fail("is required by registry 1.1", `${path}.libraries`);
  stringValue(value.defaultsVersion, `${path}.defaultsVersion`, { min: 1, max: 80 });
  integerValue(value.revision, `${path}.revision`);
  const tabs = arrayValue(value.systemTabs, `${path}.systemTabs`, 3);
  if (tabs.length !== FIXED_TABS.length) fail("must contain Deck, Backstage, and Build", `${path}.systemTabs`);
  tabs.forEach((tab, index) => validateSystemTab(tab, FIXED_TABS[index], `${path}.systemTabs[${index}]`));
  const workshops = arrayValue(value.workshops, `${path}.workshops`, CONTRACT_LIMITS.workshops);
  workshops.forEach((item, index) => validateWorkshop(item, `${path}.workshops[${index}]`));
  unique(workshops, "id", `${path}.workshops`);
  const tools = arrayValue(value.tools, `${path}.tools`, CONTRACT_LIMITS.tools);
  tools.forEach((item, index) => validateTool(item, `${path}.tools[${index}]`));
  unique(tools, "id", `${path}.tools`);
  const placements = arrayValue(value.placements, `${path}.placements`, CONTRACT_LIMITS.placements);
  placements.forEach((item, index) => validatePlacement(item, `${path}.placements[${index}]`));
  unique(placements, "id", `${path}.placements`);
  const placementPairs = new Set();
  placements.forEach((placement, index) => {
    const key = `${placement.toolId}\u0000${placement.targetId}`;
    if (placementPairs.has(key)) fail("duplicates an existing tool/target placement", `${path}.placements[${index}]`);
    placementPairs.add(key);
  });
  const recipes = arrayValue(value.recipes, `${path}.recipes`, CONTRACT_LIMITS.recipes);
  recipes.forEach((item, index) => validateRecipe(item, `${path}.recipes[${index}]`));
  unique(recipes, "id", `${path}.recipes`);
  const libraries = value.schemaVersion === "1.1"
    ? arrayValue(value.libraries, `${path}.libraries`, CONTRACT_LIMITS.libraries)
    : [];
  libraries.forEach((item, index) => validateLibrary(item, `${path}.libraries[${index}]`, { allowComputed: true }));
  unique(libraries, "id", `${path}.libraries`);

  const tabIds = new Set(tabs.map((tab) => tab.id));
  const workshopIds = new Set(workshops.map((item) => item.id));
  for (const id of workshopIds) if (tabIds.has(id)) fail(`collides with fixed tab ${JSON.stringify(id)}`, `${path}.workshops`);
  const toolIds = new Set(tools.map((item) => item.id));
  const recipeIds = new Set(recipes.map((item) => item.id));
  tools.forEach((tool, index) => {
    if (tool.kind === "recipe" && !recipeIds.has(tool.recipeId)) fail("references a missing recipe", `${path}.tools[${index}].recipeId`);
  });
  const libraryIds = new Set(libraries.map(({ id }) => id));
  libraries.forEach((library, index) => {
    const tool = tools.find(({ id }) => id === library.id);
    if (!tool || tool.kind !== "builtin" || tool.adapterId !== "prompt-library") {
      fail("requires a same-ID builtin prompt-library tool", `${path}.libraries[${index}].id`);
    }
  });
  tools.forEach((tool, index) => {
    if (tool.adapterId === "prompt-library" && !libraryIds.has(tool.id)) {
      fail("requires a same-ID library", `${path}.tools[${index}].id`);
    }
  });
  placements.forEach((placement, index) => {
    if (!toolIds.has(placement.toolId)) fail("references a missing tool", `${path}.placements[${index}].toolId`);
    if (!workshopIds.has(placement.targetId) && !["deck", "utilities"].includes(placement.targetId)) {
      fail("target must be a workshop, Deck, or Backstage", `${path}.placements[${index}].targetId`);
    }
  });
  return value;
}

export function validateLibrary(value, path = "library", { allowComputed = false } = {}) {
  plainObject(value, path);
  const computed = allowComputed ? ["origin", "isModified"] : [];
  exactKeys(value, new Set(["id", "title", "categories", "entries", ...computed]), path);
  idValue(value.id, `${path}.id`);
  stringValue(value.title, `${path}.title`, { min: 1, max: CONTRACT_LIMITS.titleLength });
  if (value.origin !== undefined && !["builtin", "user"].includes(value.origin)) fail("must be builtin or user", `${path}.origin`);
  if (value.isModified !== undefined && typeof value.isModified !== "boolean") fail("must be a boolean", `${path}.isModified`);
  const categories = arrayValue(value.categories, `${path}.categories`, CONTRACT_LIMITS.categoriesPerLibrary);
  categories.forEach((category, index) => {
    const categoryPath = `${path}.categories[${index}]`;
    plainObject(category, categoryPath);
    exactKeys(category, new Set(["id", "title", "order", ...computed]), categoryPath);
    idValue(category.id, `${categoryPath}.id`);
    stringValue(category.title, `${categoryPath}.title`, { min: 1, max: CONTRACT_LIMITS.titleLength });
    integerValue(category.order, `${categoryPath}.order`, { max: 100_000 });
    if (category.origin !== undefined && !["builtin", "user"].includes(category.origin)) fail("must be builtin or user", `${categoryPath}.origin`);
    if (category.isModified !== undefined && typeof category.isModified !== "boolean") fail("must be a boolean", `${categoryPath}.isModified`);
  });
  unique(categories, "id", `${path}.categories`);
  const categoryIds = new Set(categories.map(({ id }) => id));
  const entries = arrayValue(value.entries, `${path}.entries`, CONTRACT_LIMITS.entriesPerLibrary);
  entries.forEach((entry, index) => {
    const entryPath = `${path}.entries[${index}]`;
    plainObject(entry, entryPath);
    exactKeys(entry, new Set(["id", "categoryId", "order", "description", "recipe", ...computed]), entryPath);
    idValue(entry.id, `${entryPath}.id`);
    idValue(entry.categoryId, `${entryPath}.categoryId`);
    if (!categoryIds.has(entry.categoryId)) fail("references an unknown category", `${entryPath}.categoryId`);
    integerValue(entry.order, `${entryPath}.order`, { max: 100_000 });
    stringValue(entry.description, `${entryPath}.description`, { max: 2_000 });
    validateRecipe(entry.recipe, `${entryPath}.recipe`);
    if (entry.recipe.outputs.length !== 1 || entry.recipe.referenceSlots.length !== 0
        || entry.recipe.fields.length > 1
        || entry.recipe.fields.length === 1 && (entry.recipe.fields[0].id !== "scene" || entry.recipe.fields[0].type !== "text")) {
      fail("must use one output and zero or one text field named scene", `${entryPath}.recipe`);
    }
    if (entry.origin !== undefined && !["builtin", "user"].includes(entry.origin)) fail("must be builtin or user", `${entryPath}.origin`);
    if (entry.isModified !== undefined && typeof entry.isModified !== "boolean") fail("must be a boolean", `${entryPath}.isModified`);
  });
  unique(entries, "id", `${path}.entries`);
  return value;
}

export function fixedSystemTabs() {
  return structuredClone(FIXED_TABS);
}
