import test from "node:test";
import assert from "node:assert/strict";

import { apiKeyProvider, verifyStandardApiKey } from "../src/providers/api-key-verifier.js";

test("exposes only provider metadata, never secret values", () => {
  assert.deepEqual(apiKeyProvider("gemini"), {
    id: "gemini",
    label: "Gemini",
    field: "googleApiKey",
    description: "Gemini dans Prompt Atlas"
  });
  assert.equal(apiKeyProvider("unknown"), null);
});

test("verifies standard providers with their official authentication header", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
  };
  await verifyStandardApiKey("openai", "openai-secret", { fetchImpl });
  await verifyStandardApiKey("anthropic", "anthropic-secret", { fetchImpl });
  await verifyStandardApiKey("gemini", "gemini-secret", { fetchImpl });
  await verifyStandardApiKey("deepseek", "deepseek-secret", { fetchImpl });
  assert.equal(calls[0].options.headers.Authorization, "Bearer openai-secret");
  assert.equal(calls[1].options.headers["x-api-key"], "anthropic-secret");
  assert.equal(calls[2].options.headers["x-goog-api-key"], "gemini-secret");
  assert.equal(calls[3].options.headers.Authorization, "Bearer deepseek-secret");
});

test("turns a rejected key into a safe local validation error", async () => {
  await assert.rejects(
    verifyStandardApiKey("openai", "bad-secret", {
      fetchImpl: async () => new Response(JSON.stringify({ error: { message: "invalid key" } }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      })
    }),
    (error) => error.statusCode === 400 && !error.message.includes("bad-secret")
  );
});
