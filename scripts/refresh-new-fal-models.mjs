import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { deriveFalFamily, deriveModelControls } from "../src/generation-plan.js";

const catalogPath = fileURLToPath(new URL("../data/catalog.seed.json", import.meta.url));
const entries = [
  ["fal-ai/moss-image", 0.05, "megapixels"],
  ["blackforestlabs/flux-3/klein/text-to-image", 0.009, "images"],
  ["blackforestlabs/flux-3/klein/edit-image", 0.009, "images"],
  ["bria/fibo-2/generate", 0.04, "images"],
  ["bria/fibo-2/edit", 0.04, "images"],
  ["blackforestlabs/flux-3-max/text-to-video", 0.17, "seconds"],
  ["blackforestlabs/flux-3-max/image-to-video", 0.17, "seconds"],
  ["blackforestlabs/flux-3-max/keyframes-to-video", 0.17, "seconds"]
];

async function publicFalModel(endpointId) {
  const url = `https://api.fal.ai/v1/models?${new URLSearchParams({ endpoint_id: endpointId, expand: "openapi-3.0" })}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (response.ok) {
      const payload = await response.json();
      const model = payload.models?.find((item) => item.endpoint_id === endpointId);
      if (!model?.openapi) throw new Error(`No public schema for ${endpointId}`);
      return model;
    }
    if (response.status !== 429 && response.status < 500) {
      throw new Error(`${endpointId}: HTTP ${response.status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 750 * (attempt + 1)));
  }
  throw new Error(`${endpointId}: fal API unavailable`);
}

const existing = JSON.parse(await readFile(catalogPath, "utf8"));
const refreshed = [];
for (const [endpointId, unitPrice, unit] of entries) {
  const remote = await publicFalModel(endpointId);
  const category = remote.metadata?.category;
  const mediaType = category?.includes("video") ? "video" : "image";
  refreshed.push({
    provider: "fal",
    endpointId,
    displayName: remote.metadata?.display_name || endpointId,
    description: remote.metadata?.description || "",
    category,
    mediaType,
    ...deriveFalFamily(endpointId, category),
    status: remote.metadata?.status || "active",
    modelUrl: remote.metadata?.model_url || `https://fal.run/${endpointId}`,
    pricing: { unitPrice, unit, currency: "USD", tiersByResolution: null },
    inputSchema: remote.openapi,
    controls: deriveModelControls(remote.openapi, endpointId),
    verifiedAt: new Date().toISOString()
  });
  console.log(`${endpointId}: ${category}`);
}
const replacing = new Set(entries.map(([endpointId]) => endpointId));
const catalog = [...existing.filter((model) => !replacing.has(model.endpointId)), ...refreshed];
await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
console.log(`Catalog updated: ${refreshed.length} models`);
