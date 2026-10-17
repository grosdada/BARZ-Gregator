import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const outIndex = args.indexOf("--out");
const destination = outIndex >= 0 ? path.resolve(args[outIndex + 1]) : path.resolve("data", "catalog.seed.json");
const sources = (outIndex >= 0 ? args.slice(0, outIndex) : args).map((source) => path.resolve(source));
if (!sources.length) throw new Error("Usage: node scripts/export-catalog-seed.mjs <state.local.json...> [--out destination]");

const byEndpoint = new Map();
for (const source of sources) {
  const state = JSON.parse(await readFile(source, "utf8"));
  for (const model of state.catalog || []) {
    if (model.provider === "fal") byEndpoint.set(model.endpointId, model);
  }
}
const catalog = [...byEndpoint.values()]
  .sort((left, right) => left.endpointId.localeCompare(right.endpointId));
await writeFile(destination, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
console.log(`Exported ${catalog.length} fal models to ${destination}`);
