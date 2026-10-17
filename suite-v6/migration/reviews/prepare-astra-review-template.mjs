import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export function buildAstraReviewTemplate(bundle) {
  if (!bundle || bundle.schemaVersion !== "1.0" || typeof bundle.id !== "string" ||
      typeof bundle.bundleDigest !== "string" || !Array.isArray(bundle.items)) {
    throw new TypeError("Expected a signed Astra review bundle using schema 1.0.");
  }
  return {
    schemaVersion: "1.0",
    bundleId: bundle.id,
    bundleDigest: bundle.bundleDigest,
    status: "pending-astra-review",
    reviewerModel: "gpt-6-astra",
    instructions: {
      allowedActions: ["preserve", "correct", "exclude-non-prompt"],
      correctionRequires: ["correctedValue", "reason"],
      exclusionRequires: ["reason"],
      preserveOriginalEnglish: true,
      decideEveryIdExactlyOnce: true
    },
    decisions: bundle.items.map(({ id }) => ({ id, action: null }))
  };
}

export async function prepareAstraReviewTemplate(bundlePath, outputPath) {
  const bundle = JSON.parse(await readFile(bundlePath, "utf8"));
  const template = buildAstraReviewTemplate(bundle);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(template, null, 2)}\n`, "utf8");
  return { bundleId: template.bundleId, decisionCount: template.decisions.length, outputPath };
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const reviewRoot = path.resolve(here, "..", "atlas-v5", "semantic-review");
  const bundleId = process.argv[2] ?? "a1-realism-beauty";
  if (!/^[a-z0-9-]+$/.test(bundleId)) throw new Error("Invalid bundle ID.");
  const result = await prepareAstraReviewTemplate(
    path.join(reviewRoot, "astra-bundles", `${bundleId}.json`),
    path.join(reviewRoot, "astra-reviews", `${bundleId}.review.json`)
  );
  console.log(JSON.stringify(result, null, 2));
}
