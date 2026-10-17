import test from "node:test";
import assert from "node:assert/strict";

import { createLocalDraft, normalizePromptAtlasImport } from "../src/prompt-import.js";

const validPayload = {
  schemaVersion: "1.0",
  source: { app: "prompt-atlas", version: "5.2.3", module: "A.P.G" },
  mediaType: "image",
  prompt: "A precise editorial portrait",
  settings: { aspectRatio: "4:3", width: 1024, height: 768 },
  references: [{ kind: "image", label: "Character", url: "https://example.test/ref.png" }]
};

test("normalizes a valid Prompt Atlas payload", () => {
  const result = normalizePromptAtlasImport(validPayload);
  assert.equal(result.source.app, "prompt-atlas");
  assert.equal(result.mediaType, "image");
  assert.equal(result.settings.width, 1024);
  assert.equal(result.references.length, 1);
});

test("normalizes every legacy image token to the BARZ @imageN convention", () => {
  const result = normalizePromptAtlasImport({
    ...validPayload,
    prompt: "Combine [Image1], [IMG_2] and @IMG_3 without changing them.",
    negativePrompt: "Do not duplicate [image 4]."
  });
  assert.equal(result.prompt, "Combine @image1, @image2 and @image3 without changing them.");
  assert.equal(result.negativePrompt, "Do not duplicate @image4.");
});

test("preserves LoRA mixes and model tuning settings", () => {
  const result = normalizePromptAtlasImport({
    ...validPayload,
    settings: {
      ...validPayload.settings,
      steps: 25,
      guidanceScale: 3,
      styles: [{ id: "krea-style", strength: 0.85 }],
      loras: [{ path: "https://example.test/model.safetensors", scale: 1.1 }]
    }
  });
  assert.equal(result.settings.steps, 25);
  assert.equal(result.settings.guidanceScale, 3);
  assert.deepEqual(result.settings.styles, [{ id: "krea-style", strength: 0.85 }]);
  assert.deepEqual(result.settings.loras, [
    { path: "https://example.test/model.safetensors", scale: 1.1 }
  ]);
});

test("rejects unsupported contract versions", () => {
  assert.throws(
    () => normalizePromptAtlasImport({ ...validPayload, schemaVersion: "2.0" }),
    /non prise en charge/
  );
});

test("rejects empty prompts", () => {
  assert.throws(
    () => normalizePromptAtlasImport({ ...validPayload, prompt: "   " }),
    /ne peut pas être vide/
  );
});

test("drops unknown reference types and unknown fields", () => {
  const result = normalizePromptAtlasImport({
    ...validPayload,
    secret: "ignored",
    references: [{ kind: "document", label: "ignored" }]
  });
  assert.equal(result.references.length, 0);
  assert.equal("secret" in result, false);
});

test("creates a local draft with a stable timestamp", () => {
  const imported = normalizePromptAtlasImport(validPayload);
  const now = new Date("2026-09-09T16:00:00.000Z");
  const draft = createLocalDraft(imported, "draft-1", now);
  assert.equal(draft.id, "draft-1");
  assert.equal(draft.status, "draft");
  assert.equal(draft.importedAt, now.toISOString());
});
