import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { SecretVault } from "../../src/secret-vault.js";
import { SharedApiVault } from "../apps/atlas/shared-api-vault.js";

test("Aggregator and Prompt Atlas read the same encrypted API vault", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "barz-shared-api-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const aggregator = new SecretVault(directory);
  const atlas = new SharedApiVault(directory);
  await Promise.all([aggregator.init(), atlas.init()]);
  await aggregator.set("openaiApiKey", "openai-shared-secret");
  assert.equal(await atlas.get("openaiApiKey"), "openai-shared-secret");
  await atlas.set("deepseekApiKey", "deepseek-shared-secret");
  assert.equal(await aggregator.get("deepseekApiKey"), "deepseek-shared-secret");
});
