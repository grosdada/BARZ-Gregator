import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createImageAnalyzerService } from "../apps/atlas/image-analyzer-service.js";
import { splitAnalyzerPrompt } from "../apps/atlas/public/image-analyzer.js";

test("A16 Image Analyser migrates local provider keys without exposing them", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "barz-image-analyzer-"));
  const legacy = path.join(directory, "legacy.json");
  const target = path.join(directory, "next");
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(legacy, JSON.stringify({ openaiApiKey: "secret-value", llmModel: "gpt-4.1-mini" }));
  const service = createImageAnalyzerService({ dataDirectory: target, legacySettingsPath: legacy });
  await service.init();
  const settings = await service.publicSettings();
  assert.equal(settings.keyStates.openai, true);
  assert.equal(settings.model, "gpt-4.1-mini");
  assert.equal(JSON.stringify(settings).includes("secret-value"), false);
  assert.doesNotMatch(await readFile(service.settingsPath, "utf8"), /secret-value/);
  assert.equal(await service.vault.get("openaiApiKey"), "secret-value");
});

test("A16 Image Analyser sends strict vision input and normalizes the four-part response", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "barz-image-analyzer-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  let request;
  const service = createImageAnalyzerService({
    dataDirectory: directory,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({ output_text: JSON.stringify({
        prompt: "A red figure crosses a rain-lit station.", subject: "red figure",
        context: "crossing a rain-lit station", style: "cinematic cyan light"
      }) }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
  });
  await service.updateSettings({ openaiApiKey: "test-key", model: "gpt-4.1-mini" });
  const result = await service.analyze({ imageDataUrl: "data:image/png;base64,YQ==", model: "gpt-4.1-mini" });
  assert.equal(request.url, "https://api.openai.com/v1/responses");
  assert.match(request.options.headers.Authorization, /test-key/);
  assert.equal(result.prompt, "A red figure crosses a rain-lit station.");
  assert.deepEqual(result.seedance, { subject: "red figure", context: "crossing a rain-lit station", style: "cinematic cyan light" });
});

test("A16 Image Analyser keeps a deterministic local split for edited prompts", () => {
  assert.deepEqual(
    splitAnalyzerPrompt("A masked dancer, red coat. He crosses a wet platform. Cinematic 50mm lens, cyan lighting."),
    {
      subject: "A masked dancer, red coat",
      context: "He crosses a wet platform.",
      style: "Cinematic 50mm lens, cyan lighting."
    }
  );
});

