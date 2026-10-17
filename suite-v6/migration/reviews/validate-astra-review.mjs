import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { computeReviewBundleDigest } from "../prepare-semantic-review.mjs";

const ACTIONS = new Set(["preserve", "correct", "exclude-non-prompt"]);

function fail(message, pathName) {
  const error = new Error(message);
  error.code = "INVALID_ASTRA_REVIEW";
  error.path = pathName;
  throw error;
}

export function validateAstraReview(bundle, review) {
  if (!bundle || bundle.schemaVersion !== "1.0" || !Array.isArray(bundle.items)) {
    fail("Expected an Astra review bundle using schema 1.0.", "bundle");
  }
  if (!review || review.schemaVersion !== "1.0" || !Array.isArray(review.decisions)) {
    fail("Expected an Astra review result using schema 1.0.", "review");
  }
  if (review.bundleId !== bundle.id) fail("Review bundleId does not match the source bundle.", "bundleId");
  if (review.bundleDigest !== bundle.bundleDigest) fail("Review bundleDigest does not match the source bundle.", "bundleDigest");
  if (bundle.bundleDigest !== computeReviewBundleDigest(bundle.items)) {
    fail("The source bundle content no longer matches its digest.", "bundle.bundleDigest");
  }
  if (review.status !== "reviewed") fail("A complete review must use status reviewed.", "status");
  if (review.reviewerModel !== "gpt-6-astra") fail("The semantic reviewer must be gpt-6-astra.", "reviewerModel");

  const sourceIds = new Set(bundle.items.map(({ id }) => id));
  if (sourceIds.size !== bundle.items.length) fail("The source bundle contains duplicate IDs.", "bundle.items");
  const seen = new Set();
  const counts = { preserve: 0, correct: 0, "exclude-non-prompt": 0 };
  for (const [index, decision] of review.decisions.entries()) {
    const prefix = `decisions[${index}]`;
    if (!decision || typeof decision !== "object") fail("Each decision must be an object.", prefix);
    if (!sourceIds.has(decision.id)) fail(`Unknown review item ID ${decision.id}.`, `${prefix}.id`);
    if (seen.has(decision.id)) fail(`Duplicate decision for ${decision.id}.`, `${prefix}.id`);
    seen.add(decision.id);
    if (!ACTIONS.has(decision.action)) fail(`Unknown review action ${decision.action}.`, `${prefix}.action`);
    counts[decision.action] += 1;

    if (decision.action === "preserve") {
      if (Object.hasOwn(decision, "correctedValue")) {
        fail("A preserved item cannot contain correctedValue.", `${prefix}.correctedValue`);
      }
      continue;
    }
    if (typeof decision.reason !== "string" || !decision.reason.trim()) {
      fail("Corrections and exclusions require a reason.", `${prefix}.reason`);
    }
    if (decision.action === "correct" &&
        (typeof decision.correctedValue !== "string" || !decision.correctedValue.trim())) {
      fail("A correction requires a non-empty correctedValue.", `${prefix}.correctedValue`);
    }
    if (decision.action === "exclude-non-prompt" && Object.hasOwn(decision, "correctedValue")) {
      fail("An excluded item cannot contain correctedValue.", `${prefix}.correctedValue`);
    }
  }
  if (seen.size !== sourceIds.size) {
    const missing = [...sourceIds].filter((id) => !seen.has(id));
    fail(`The review is incomplete; ${missing.length} decision(s) missing.`, "decisions");
  }
  return {
    bundleId: bundle.id,
    bundleDigest: bundle.bundleDigest,
    itemCount: bundle.items.length,
    counts
  };
}

export async function validateAstraReviewFiles(bundlePath, reviewPath) {
  const [bundle, review] = await Promise.all([
    readFile(bundlePath, "utf8").then(JSON.parse),
    readFile(reviewPath, "utf8").then(JSON.parse)
  ]);
  return validateAstraReview(bundle, review);
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const [, , bundlePath, reviewPath] = process.argv;
  if (!bundlePath || !reviewPath) {
    throw new Error("Usage: node migration/reviews/validate-astra-review.mjs <bundle.json> <review.json>");
  }
  console.log(JSON.stringify(await validateAstraReviewFiles(bundlePath, reviewPath), null, 2));
}
