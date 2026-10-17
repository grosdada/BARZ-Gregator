import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { LocalStore } from "../src/storage.js";

test("migrates older local catalogs and adds the locked job queue", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "barz-store-test-"));
  try {
    await writeFile(path.join(directory, "state.local.json"), JSON.stringify({
      drafts: [],
      activity: [],
      catalog: [{
        provider: "fal",
        endpointId: "blackforestlabs/flux-3/text-to-video/draft",
        category: "text-to-video"
      }]
    }));
    const store = new LocalStore(directory);
    await store.init();

    const state = await store.read();
    assert.deepEqual(state.jobs, []);
    assert.equal(state.catalog[0].familyId, "blackforestlabs/flux-3");
    assert.equal(state.catalog[0].mode, "text-to-video");
    assert.equal(state.catalog[0].variant, "draft");
    const heygenModels = state.catalog.filter((model) => model.provider === "heygen");
    assert.deepEqual(heygenModels.map((model) => model.mode), [
      "text_to_video", "image_to_video", "reference_to_video"
    ]);
    assert.equal(heygenModels.every((model) => model.controls), true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("keeps accepting writes after a rejected state mutation", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "barz-store-recovery-test-"));
  try {
    const store = new LocalStore(directory);
    await store.init();
    await assert.rejects(() => store.update(() => {
      throw new Error("Rejected mutation");
    }));
    await store.update((state) => ({ ...state, activity: [{ id: "recovered" }] }));

    const state = await store.read();
    assert.equal(state.activity[0].id, "recovered");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
