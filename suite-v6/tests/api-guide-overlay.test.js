import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../installer/aggregator-overlays/api-guide.js", import.meta.url), "utf8");

test("setup guide identifies essential and optional providers", () => {
  assert.match(source, /fal est essentiel pour générer/);
  assert.match(source, /HeyGen est facultatif/);
  assert.match(source, /une seule clé LLM suffit/);
  assert.match(source, /LLM facultatif · économique/);
});

test("setup guide links every provider to its official site", () => {
  for (const url of [
    "https://fal.ai/", "https://app.heygen.com/", "https://platform.openai.com/",
    "https://platform.claude.com/", "https://aistudio.google.com/", "https://platform.deepseek.com/"
  ]) assert.ok(source.includes(url), url);
});
