import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { SecretVault } from "../src/secret-vault.js";

test("encrypts provider keys at rest", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "barz-vault-test-"));
  try {
    const vault = new SecretVault(directory);
    await vault.init();
    await vault.set("falApiKey", "fal-secret-value");

    const stored = await readFile(path.join(directory, "secrets.local.json"), "utf8");
    assert.equal(stored.includes("fal-secret-value"), false);
    assert.equal(await vault.get("falApiKey"), "fal-secret-value");
    assert.equal(await vault.delete("falApiKey"), true);
    assert.equal(await vault.get("falApiKey"), null);
    assert.equal(await vault.delete("falApiKey"), false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
