import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { FixedTabError, RegistryConflictError, RegistryStore } from "../packages/registry/src/index.js";

async function temporaryDirectory(t, prefix) {
  const directory = await mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

function userRecipe() {
  return {
    schemaVersion: "1.0",
    id: "user-recipe-v1",
    revision: 1,
    title: "User recipe",
    fields: [{ id: "subject", type: "text", required: true }],
    outputs: [{ id: "main", mediaType: "image", template: "Portrait of {{subject}}" }],
    referenceSlots: []
  };
}

test("persists changes in an injected directory and reloads them after restart", async (t) => {
  const directory = await temporaryDirectory(t, "barz-v6-restart-");
  const store = new RegistryStore({ directory });
  let registry = await store.init();
  registry = await store.addWorkshop({
    expectedRevision: registry.revision,
    workshop: { id: "my-workshop", title: "Mon atelier", order: 20 }
  });
  registry = await store.addRecipeTool({
    expectedRevision: registry.revision,
    recipe: userRecipe(),
    tool: { id: "user-tool", title: "Mon prompt", kind: "recipe", recipeId: "user-recipe-v1" },
    placements: [{ id: "user-tool-placement", targetId: "my-workshop", order: 0 }]
  });

  const restarted = new RegistryStore({ directory });
  const loaded = await restarted.init();
  assert.equal(loaded.revision, 2);
  assert.equal(loaded.workshops.find(({ id }) => id === "my-workshop").origin, "user");
  assert.equal(loaded.tools.find(({ id }) => id === "user-tool").recipeId, "user-recipe-v1");
  assert.equal(loaded.placements.find(({ id }) => id === "user-tool-placement").toolId, "user-tool");
});

test("serializes two windows and rejects the stale revision", async (t) => {
  const directory = await temporaryDirectory(t, "barz-v6-conflict-");
  const first = new RegistryStore({ directory });
  const second = new RegistryStore({ directory });
  await first.init();
  await second.init();

  const results = await Promise.allSettled([
    first.renameWorkshop({ expectedRevision: 0, id: "prompt-forge", title: "Ideas A" }),
    second.renameWorkshop({ expectedRevision: 0, id: "prompt-forge", title: "Ideas B" })
  ]);
  assert.equal(results.filter(({ status }) => status === "fulfilled").length, 1);
  const rejected = results.find(({ status }) => status === "rejected");
  assert.ok(rejected.reason instanceof RegistryConflictError);
  assert.equal((await first.read()).revision, 1);
});

test("fixed tabs cannot be renamed or moved through workshop mutations", async (t) => {
  const directory = await temporaryDirectory(t, "barz-v6-fixed-");
  const store = new RegistryStore({ directory });
  await store.init();
  await assert.rejects(
    store.renameWorkshop({ expectedRevision: 0, id: "deck", title: "Other" }),
    (error) => error instanceof FixedTabError && error.code === "FIXED_SYSTEM_TAB"
  );
  await assert.rejects(
    store.moveWorkshop({ expectedRevision: 0, id: "build", order: 0 }),
    FixedTabError
  );
  assert.equal((await store.read()).revision, 0);
});

test("reorders every workshop atomically and rejects partial order lists", async (t) => {
  const directory = await temporaryDirectory(t, "barz-v6-order-");
  const store = new RegistryStore({ directory });
  const initial = await store.init();
  const ids = initial.workshops.map(({ id }) => id).reverse();
  const reordered = await store.reorderWorkshops({ expectedRevision: 0, ids });
  assert.deepEqual(reordered.workshops.map(({ id }) => id), ids);
  await assert.rejects(
    store.reorderWorkshops({ expectedRevision: reordered.revision, ids: ids.slice(1) }),
    /every workshop ID exactly once/
  );
  assert.equal((await store.read()).revision, 1);
});

test("invalid mutations do not write partial state and the next mutation still works", async (t) => {
  const directory = await temporaryDirectory(t, "barz-v6-invalid-");
  const store = new RegistryStore({ directory });
  await store.init();
  await assert.rejects(store.addWorkshop({
    expectedRevision: 0,
    workshop: { id: "bad", title: "", order: 0 }
  }), /at least 1 character/);
  assert.equal((await store.read()).revision, 0);
  const registry = await store.renameWorkshop({ expectedRevision: 0, id: "prompt-forge", title: "Idées" });
  assert.equal(registry.revision, 1);
  assert.equal(registry.workshops.find(({ id }) => id === "prompt-forge").title, "Idées");
});

test("reset preview is explicit, reset preserves user content, and backup restores the prior overlay", async (t) => {
  const directory = await temporaryDirectory(t, "barz-v6-reset-");
  const clock = () => new Date("2026-09-11T10:00:00.000Z");
  let sequence = 0;
  const store = new RegistryStore({ directory, clock, uuid: () => `fixture-${++sequence}` });
  let registry = await store.init();
  registry = await store.renameWorkshop({ expectedRevision: 0, id: "prompt-forge", title: "Mes idées" });
  registry = await store.addWorkshop({
    expectedRevision: registry.revision,
    workshop: { id: "personal", title: "Personnel", order: 30 }
  });
  registry = await store.addRecipeTool({
    expectedRevision: registry.revision,
    recipe: userRecipe(),
    tool: { id: "user-tool", title: "Mon prompt", kind: "recipe", recipeId: "user-recipe-v1" },
    placements: [{ id: "user-placement", targetId: "prompt-forge", order: 90 }]
  });

  const preview = await store.previewReset({ scope: { workshopId: "prompt-forge" } });
  assert.deepEqual(preview.changedWorkshopIds, ["prompt-forge"]);
  assert.deepEqual(preview.preservedUserCounts, {
    workshops: 1, tools: 1, placements: 1, recipes: 1, libraries: 0, libraryEntries: 0
  });

  const reset = await store.resetDefaults({ expectedRevision: registry.revision, scope: { workshopId: "prompt-forge" } });
  assert.equal(reset.registry.workshops.find(({ id }) => id === "prompt-forge").title, "Idea Studio");
  assert.ok(reset.registry.workshops.some(({ id }) => id === "personal"));
  assert.ok(reset.registry.tools.some(({ id }) => id === "user-tool"));
  assert.ok(reset.registry.placements.some(({ id }) => id === "user-placement"));
  assert.ok((await store.listBackups()).includes(reset.backupName));

  const restored = await store.restoreBackup({ expectedRevision: reset.registry.revision, backupName: reset.backupName });
  assert.equal(restored.registry.workshops.find(({ id }) => id === "prompt-forge").title, "Mes idées");
  assert.ok(restored.registry.workshops.some(({ id }) => id === "personal"));
  assert.ok(restored.registry.tools.some(({ id }) => id === "user-tool"));
  assert.equal(restored.registry.revision, reset.registry.revision + 1);

  const globalReset = await store.resetDefaults({ expectedRevision: restored.registry.revision, scope: "all" });
  assert.equal(globalReset.registry.workshops.find(({ id }) => id === "prompt-forge").title, "Idea Studio");
  assert.ok(globalReset.registry.workshops.some(({ id }) => id === "personal"));
  assert.ok(globalReset.registry.tools.some(({ id }) => id === "user-tool"));
  assert.ok(globalReset.registry.recipes.some(({ id }) => id === "user-recipe-v1"));
});

test("a failed backup aborts reset before the persisted registry changes", async (t) => {
  const directory = await temporaryDirectory(t, "barz-v6-backup-failure-");
  const store = new RegistryStore({ directory });
  await store.init();
  const renamed = await store.renameWorkshop({ expectedRevision: 0, id: "prompt-forge", title: "Mes idées" });
  const failing = new RegistryStore({
    directory,
    io: { copyFile: async () => { throw new Error("simulated backup failure"); } }
  });
  await assert.rejects(
    failing.resetDefaults({ expectedRevision: renamed.revision, scope: "all" }),
    /simulated backup failure/
  );
  const persisted = await store.read();
  assert.equal(persisted.revision, 1);
  assert.equal(persisted.workshops.find(({ id }) => id === "prompt-forge").title, "Mes idées");
});

test("reset preview rejects an ambiguous scope and backup restore rejects path traversal", async (t) => {
  const directory = await temporaryDirectory(t, "barz-v6-reset-scope-");
  const store = new RegistryStore({ directory });
  await store.init();
  await assert.rejects(store.previewReset({ scope: {} }), /must be all or/);
  await assert.rejects(
    store.restoreBackup({ expectedRevision: 0, backupName: "../registry.overlay.json" }),
    /listed backup filename/
  );
  assert.equal((await store.read()).revision, 0);
});

test("state file contains only the user overlay and no copy of immutable defaults", async (t) => {
  const directory = await temporaryDirectory(t, "barz-v6-overlay-");
  const store = new RegistryStore({ directory });
  await store.init();
  await store.renameWorkshop({ expectedRevision: 0, id: "prompt-forge", title: "Idées" });
  const raw = JSON.parse(await readFile(path.join(directory, "registry.overlay.json"), "utf8"));
  assert.equal(raw.overlay.workshopOverrides["prompt-forge"].title, "Idées");
  assert.equal(raw.workshops, undefined);
  assert.equal(raw.systemTabs, undefined);
});
