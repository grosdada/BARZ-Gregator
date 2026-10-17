import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  buildSemanticReviewQueue,
  classifyForSemanticReview,
  prepareSemanticReview
} from "../migration/prepare-semantic-review.mjs";

function literal(id, value, classification, { kind = "string-literal", owner = "designer", sourcePath = "tool.html" } = {}) {
  return {
    id, value, classification,
    occurrences: [{ sourcePath, line: 1, column: 1, kind, functionName: "currentPrompt", owners: [owner] }]
  };
}

test("semantic review queue keeps creative prompts once and separates obvious noise", () => {
  const corpus = {
    schemaVersion: "1.0",
    createdAt: "2026-09-11T00:00:00.000Z",
    literals: [
      literal("creative", "Render {{scene}} as a tactile miniature photographed on 16mm.", "likely-prompt"),
      literal("fragment", "Preserve the subject lighting and camera composition.", "review-candidate"),
      literal("ui", "<button class=\"copy\">Copy</button>", "likely-prompt"),
      literal("context", "This is merely an interface explanation.", "context-only"),
      literal("docs", "# Entire knowledge base", "likely-prompt", { kind: "markdown-document" })
    ]
  };
  const result = buildSemanticReviewQueue(corpus, { packetTokenLimit: 10_000 });
  assert.deepEqual(result.packets.flatMap(({ prompts }) => prompts.map(({ id }) => id)), ["creative", "fragment"]);
  assert.equal(result.manifest.sourceLiteralCount, 5);
  assert.equal(Object.values(result.manifest.dispositionCounts).reduce((sum, count) => sum + count, 0), 5);
  assert.equal(result.decisions.length, 5);
  assert.deepEqual(result.decisions.map(({ id }) => id), ["creative", "fragment", "ui", "context", "docs"]);
  assert.equal(result.triagePackets.length, 0);
  assert.deepEqual(result.manifest.ownerSummaries, [{
    owner: "designer",
    packetCount: 1,
    promptCount: 2,
    promptReviewCount: 1,
    fragmentReviewCount: 1,
    approximateTokens: 30,
    sourcePaths: ["tool.html"]
  }]);
});

test("ambiguous short atoms stay readable in traceable structural triage packets", () => {
  const corpus = {
    schemaVersion: "1.0",
    createdAt: "2026-09-11T00:00:00.000Z",
    literals: [
      literal("short-prompt-atom", "golden hour", "review-candidate"),
      literal("short-ui-label", "Copy", "review-candidate")
    ]
  };
  const result = buildSemanticReviewQueue(corpus);
  assert.deepEqual(result.triagePackets.flatMap(({ prompts }) => prompts.map(({ id }) => id)), ["short-prompt-atom"]);
  assert.equal(result.triagePackets[0].prompts[0].triageKind, "prompt-context-candidate");
  assert.equal(result.manifest.manualTriageCount, 1);
  assert.equal(result.manifest.manualTriagePacketCount, 1);
  assert.equal(result.manifest.manualTriageApproximateTokens, 3);
  assert.deepEqual(result.manifest.triageKindCounts, { "prompt-context-candidate": 1 });
});

test("Image DNA sources and owner never enter an Astra review packet", () => {
  const corpus = {
    schemaVersion: "1.0",
    createdAt: "2026-09-11T00:00:00.000Z",
    literals: [
      literal("dna-owner", "Render this as a forbidden DNA prompt.", "likely-prompt", { owner: "soul-prompts" }),
      literal("dna-file", "Render this other forbidden DNA prompt.", "likely-prompt", { sourcePath: "assets/SOUL-PROMPTS-v02.html" }),
      literal("safe", "Render a safe scene with a practical miniature camera move.", "likely-prompt")
    ]
  };
  const result = buildSemanticReviewQueue(corpus);
  assert.deepEqual(result.packets.flatMap(({ prompts }) => prompts.map(({ id }) => id)), ["safe"]);
  assert.equal(result.manifest.dispositionCounts["excluded-image-dna"], 2);
  assert.equal(result.decisions.filter(({ disposition }) => disposition === "excluded-image-dna").length, 2);
});

test("known reviewed libraries are not queued a second time", () => {
  const reviewed = literal("reviewed", "Render a cinematic image with hard studio light.", "likely-prompt", { owner: "banana-helper" });
  assert.equal(classifyForSemanticReview(reviewed).disposition, "prompt-review");
  const result = buildSemanticReviewQueue({ schemaVersion: "1.0", createdAt: "now", literals: [reviewed] });
  assert.equal(result.manifest.queuedPromptCount, 0);
  assert.deepEqual(result.manifest.reviewedOwnerIds, ["banana-helper", "barz-enhancer", "imperfection"]);
});

test("focused Astra bundles include useful triage but omit UI and runtime identifiers", () => {
  const corpus = {
    schemaVersion: "1.0",
    createdAt: "now",
    literals: [
      literal("beauty-prompt", "Render the portrait with tactile natural skin and soft window light.", "likely-prompt", { owner: "barz-beauty" }),
      literal("beauty-atom", "golden hour", "review-candidate", { owner: "barz-beauty", kind: "string-literal" }),
      literal("beauty-ui", "Preset selector", "review-candidate", { owner: "barz-beauty", kind: "html-text" }),
      literal("beauty-id", "beautyPreset", "review-candidate", { owner: "barz-beauty", kind: "html-attribute:data-prompt" })
    ]
  };
  const result = buildSemanticReviewQueue(corpus);
  const bundle = result.astraBundles.find(({ id }) => id === "a1-realism-beauty");
  assert.deepEqual(bundle.items.map(({ id }) => id), ["beauty-atom", "beauty-prompt"]);
  assert.equal(bundle.approximateTokens, 20);
  assert.deepEqual(bundle.policy.excludedTriageKinds, ["ui-copy-candidate", "runtime-identifier"]);
});

test("semantic queue rebuild preserves completed and pending Astra review files", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "atlas-semantic-review-"));
  try {
    const corpusPath = path.join(root, "corpus.json");
    const outputDirectory = path.join(root, "semantic-review");
    const reviewDirectory = path.join(outputDirectory, "astra-reviews");
    const reviewPath = path.join(reviewDirectory, "existing.review.json");
    await mkdir(reviewDirectory, { recursive: true });
    await writeFile(reviewPath, "{\"decision\":\"preserve\"}\n", "utf8");
    await writeFile(corpusPath, JSON.stringify({
      schemaVersion: "1.0",
      createdAt: "now",
      literals: [literal("safe", "Render a cinematic scene with a slow camera move.", "likely-prompt")]
    }), "utf8");

    await prepareSemanticReview({ corpusPath, outputDirectory });

    assert.equal(await readFile(reviewPath, "utf8"), "{\"decision\":\"preserve\"}\n");
    assert.ok(JSON.parse(await readFile(path.join(outputDirectory, "manifest.json"), "utf8")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
