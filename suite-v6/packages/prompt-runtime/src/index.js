import { ContractValidationError, validateRecipe } from "../../contracts/src/index.js";

export class RecipeInputError extends ContractValidationError {
  constructor(message, path) {
    super(message, path);
    this.name = "RecipeInputError";
    this.code = "INVALID_RECIPE_INPUT";
  }
}

function invalid(message, path) {
  throw new RecipeInputError(message, path);
}

function resolveValue(field, supplied) {
  const value = supplied === undefined ? field.default : supplied;
  const path = `values.${field.id}`;
  if (value === undefined || value === null || value === "") {
    if (field.required) invalid("is required", path);
    return "";
  }
  if (field.type === "text") {
    if (typeof value !== "string") invalid("must be a string", path);
    if (value.length > (field.maxLength ?? 50_000)) invalid("is too long", path);
    return value;
  }
  if (field.type === "enum") {
    if (typeof value !== "string" || !field.values.includes(value)) invalid("must be one of the declared values", path);
    return value;
  }
  if (field.type === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) invalid("must be a finite number", path);
    if (field.min !== undefined && value < field.min) invalid(`must be at least ${field.min}`, path);
    if (field.max !== undefined && value > field.max) invalid(`must be at most ${field.max}`, path);
    return String(value);
  }
  if (field.type === "boolean") {
    if (typeof value !== "boolean") invalid("must be a boolean", path);
    return value ? "true" : "false";
  }
  if (field.type === "reference") {
    if (typeof value !== "string" || !/^[a-z0-9][a-z0-9_-]{0,79}$/.test(value)) invalid("must be a stable reference slot ID", path);
    return value;
  }
  invalid("uses an unsupported field type", path);
}

export function compileRecipe(recipe, suppliedValues = {}) {
  validateRecipe(recipe);
  if (!suppliedValues || typeof suppliedValues !== "object" || Array.isArray(suppliedValues)) {
    invalid("must be an object", "values");
  }
  const fields = new Map(recipe.fields.map((field) => [field.id, field]));
  for (const key of Object.keys(suppliedValues)) {
    if (!fields.has(key)) invalid("is not declared by this recipe", `values.${key}`);
  }
  const values = Object.fromEntries(recipe.fields.map((field) => [field.id, resolveValue(field, suppliedValues[field.id])]));
  return recipe.outputs.map((output) => ({
    id: output.id,
    mediaType: output.mediaType,
    prompt: output.template.replace(/\{\{\s*([a-z0-9_-]+)\s*\}\}/gi, (_match, id) => values[id]),
    negativePrompt: output.negativePrompt ?? "",
    settings: structuredClone(output.settings ?? {})
  }));
}
