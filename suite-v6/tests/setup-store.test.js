import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { RegistryStore } from "../packages/registry/src/index.js";
import { AtlasSetupStore, SetupConflictError } from "../packages/setups/src/index.js";

async function fixture(t, prefix = "barz-v6-setups-") {
  const directory = await mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(() => rm(directory, { recursive: true, force: true }));
  let sequence = 0;
  const store = new AtlasSetupStore({
    directory,
    clock: () => new Date(`2026-09-11T10:00:${String(sequence).padStart(2, "0")}.000Z`),
    uuid: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`
  });
  return { directory, store };
}

test("initializes one named default setup and persists the active setup", async (t) => {
  const { directory, store } = await fixture(t);
  const first = await store.init();
  assert.equal(first.setupContext.activeSetup.name, "Mon Atlas");
  assert.equal(first.setupContext.setups.length, 1);
  assert.equal(first.registry.revision, 0);

  const created = await store.createSetup({
    expectedMetadataRevision: 0,
    name: "Portraits"
  });
  assert.equal(created.setupContext.activeSetup.name, "Portraits");
  const restarted = new AtlasSetupStore({ directory });
  const loaded = await restarted.init();
  assert.equal(loaded.setupContext.activeSetup.id, created.setupContext.activeSetup.id);
});

test("copies a legacy root overlay into the default setup without deleting it", async (t) => {
  const { directory, store } = await fixture(t, "barz-v6-setup-migration-");
  const legacy = new RegistryStore({ directory });
  await legacy.init();
  await legacy.renameWorkshop({ expectedRevision: 0, id: "prompt-forge", title: "Mes idées V5" });

  const migrated = await store.init();
  assert.equal(migrated.registry.workshops.find(({ id }) => id === "prompt-forge").title, "Mes idées V5");
  assert.equal(JSON.parse(await readFile(path.join(directory, "registry.overlay.json"), "utf8")).revision, 1);
  assert.equal(JSON.parse(await readFile(path.join(directory, "setups", "default", "registry.overlay.json"), "utf8")).revision, 0);
});

test("blank and duplicated setups remain isolated when switching", async (t) => {
  const { store } = await fixture(t);
  let current = await store.init();
  current = await store.renameWorkshop({
    expectedSetupId: "default",
    expectedRevision: 0,
    id: "prompt-forge",
    title: "Mon laboratoire"
  });
  const duplicate = await store.createSetup({
    expectedMetadataRevision: current.setupContext.metadataRevision,
    name: "Copie cinéma",
    duplicateFromSetupId: "default"
  });
  const duplicateId = duplicate.setupContext.activeSetup.id;
  assert.equal(duplicate.registry.workshops.find(({ id }) => id === "prompt-forge").title, "Mon laboratoire");

  const blank = await store.createSetup({
    expectedMetadataRevision: duplicate.setupContext.metadataRevision,
    name: "Page blanche"
  });
  assert.equal(blank.registry.workshops.find(({ id }) => id === "prompt-forge").title, "Idea Studio");

  const switched = await store.switchSetup({
    expectedMetadataRevision: blank.setupContext.metadataRevision,
    id: duplicateId
  });
  assert.equal(switched.registry.workshops.find(({ id }) => id === "prompt-forge").title, "Mon laboratoire");
});

test("rejects stale setup metadata and stale active setup mutations", async (t) => {
  const { store } = await fixture(t);
  const initial = await store.init();
  const created = await store.createSetup({ expectedMetadataRevision: 0, name: "Second" });
  await assert.rejects(
    store.createSetup({ expectedMetadataRevision: 0, name: "Stale" }),
    (error) => error instanceof SetupConflictError
  );
  await assert.rejects(
    store.renameWorkshop({ expectedSetupId: initial.setupContext.activeSetup.id, expectedRevision: 0, id: "prompt-forge", title: "Wrong" }),
    (error) => error instanceof SetupConflictError && error.code === "SETUP_CONTEXT_CONFLICT"
  );
  assert.equal((await store.read()).setupContext.activeSetup.id, created.setupContext.activeSetup.id);
});

test("saves named versions and restores one after creating a recovery checkpoint", async (t) => {
  const { store } = await fixture(t);
  await store.init();
  let current = await store.renameWorkshop({
    expectedSetupId: "default", expectedRevision: 0, id: "prompt-forge", title: "Version A"
  });
  const saved = await store.saveVersion({
    expectedSetupId: "default", expectedRevision: current.registry.revision, expectedToolRevision: 0, name: "Première direction"
  });
  current = await store.renameWorkshop({
    expectedSetupId: "default", expectedRevision: current.registry.revision, id: "prompt-forge", title: "Version B"
  });
  const restored = await store.restoreVersion({
    expectedSetupId: "default", expectedRevision: current.registry.revision, expectedToolRevision: 0, versionId: saved.version.id
  });
  assert.equal(restored.registry.workshops.find(({ id }) => id === "prompt-forge").title, "Version A");
  assert.equal(restored.registry.revision, 3);
  const versions = await store.listVersions({ expectedSetupId: "default" });
  assert.equal(versions.versions.length, 2);
  assert.ok(versions.versions.some(({ name }) => name.startsWith("Avant restauration")));
});

test("rejects version path traversal and does not persist secrets outside the overlay", async (t) => {
  const { directory, store } = await fixture(t);
  await store.init();
  await assert.rejects(
    store.restoreVersion({ expectedSetupId: "default", expectedRevision: 0, versionId: "../secret" }),
    /safe local ID/
  );
  const metadata = await readFile(path.join(directory, "setups.local.json"), "utf8");
  assert.doesNotMatch(metadata, /api.?key|secret/i);
  await writeFile(path.join(directory, "unrelated-media.bin"), "untouched");
  await store.createSetup({ expectedMetadataRevision: 0, name: "Autre" });
  assert.equal(await readFile(path.join(directory, "unrelated-media.bin"), "utf8"), "untouched");
});

test("persists tool configurations per setup and duplicates them without sharing state", async (t) => {
  const { store } = await fixture(t);
  await store.init();
  let saved = await store.saveToolConfiguration({
    expectedSetupId: "default",
    expectedToolRevision: 0,
    toolId: "imperfection",
    configuration: { state: { marker: "A" }, customPresets: [] }
  });
  assert.equal(saved.toolRevision, 1);

  const duplicate = await store.createSetup({ expectedMetadataRevision: 0, name: "Copie outils", duplicateFromSetupId: "default" });
  const duplicateId = duplicate.setupContext.activeSetup.id;
  const copied = await store.readToolConfiguration({ expectedSetupId: duplicateId, toolId: "imperfection" });
  assert.equal(copied.configuration.state.marker, "A");
  assert.equal(copied.toolRevision, 0);

  await store.saveToolConfiguration({
    expectedSetupId: duplicateId,
    expectedToolRevision: 0,
    toolId: "imperfection",
    configuration: { state: { marker: "B" }, customPresets: [] }
  });
  const switched = await store.switchSetup({ expectedMetadataRevision: duplicate.setupContext.metadataRevision, id: "default" });
  saved = await store.readToolConfiguration({ expectedSetupId: switched.setupContext.activeSetup.id, toolId: "imperfection" });
  assert.equal(saved.configuration.state.marker, "A");
});

test("setup versions include and restore tool configurations", async (t) => {
  const { store } = await fixture(t);
  await store.init();
  await store.saveToolConfiguration({ expectedSetupId: "default", expectedToolRevision: 0, toolId: "imperfection", configuration: { marker: "A" } });
  const saved = await store.saveVersion({ expectedSetupId: "default", expectedRevision: 0, expectedToolRevision: 1, name: "Outils A" });
  await store.saveToolConfiguration({ expectedSetupId: "default", expectedToolRevision: 1, toolId: "imperfection", configuration: { marker: "B" } });
  await store.restoreVersion({ expectedSetupId: "default", expectedRevision: 0, expectedToolRevision: 2, versionId: saved.version.id });
  const restored = await store.readToolConfiguration({ expectedSetupId: "default", toolId: "imperfection" });
  assert.equal(restored.configuration.marker, "A");
  assert.equal(restored.toolRevision, 3);
});

test("rejects a reset with a stale tool revision before creating a checkpoint", async (t) => {
  const { store } = await fixture(t);
  store.defaultToolConfigurations = { "barz-enhancer": { marker: "default" } };
  await store.init();
  await store.saveToolConfiguration({
    expectedSetupId: "default",
    expectedToolRevision: 0,
    toolId: "barz-enhancer",
    configuration: { marker: "personal" }
  });

  await assert.rejects(
    store.resetDefaults({ expectedSetupId: "default", expectedRevision: 0, expectedToolRevision: 0, scope: "all" }),
    (error) => error instanceof SetupConflictError && error.currentToolRevision === 1
  );

  const current = await store.readToolConfiguration({ expectedSetupId: "default", toolId: "barz-enhancer" });
  assert.deepEqual(current.configuration, { marker: "personal" });
  assert.deepEqual(await store.listBackups({ expectedSetupId: "default" }), []);
});

test("resumes a pending composite reset after the registry write was committed", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "barz-v6-recovery-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  let failToolRename = false;
  const options = {
    directory,
    defaultToolConfigurations: { "barz-enhancer": { marker: "default" } },
    io: {
      rename: async (source, destination) => {
        if (failToolRename && path.basename(destination) === "tool-configurations.local.json") {
          failToolRename = false;
          const error = new Error("simulated interruption before tool state commit");
          error.code = "EIO";
          throw error;
        }
        return rename(source, destination);
      }
    }
  };
  const interrupted = new AtlasSetupStore(options);
  await interrupted.init();
  await interrupted.saveToolConfiguration({
    expectedSetupId: "default",
    expectedToolRevision: 0,
    toolId: "barz-enhancer",
    configuration: { marker: "personal" }
  });
  failToolRename = true;

  await assert.rejects(
    interrupted.resetDefaults({ expectedSetupId: "default", expectedRevision: 0, expectedToolRevision: 1, scope: "all" }),
    (error) => error?.code === "EIO"
  );
  const pendingPath = path.join(directory, "setups", "default", "setup-transaction.pending.json");
  assert.equal(JSON.parse(await readFile(pendingPath, "utf8")).reason, "reset-all");

  const restarted = new AtlasSetupStore({
    directory,
    defaultToolConfigurations: { "barz-enhancer": { marker: "default" } }
  });
  const recovered = await restarted.init();
  assert.equal(recovered.registry.revision, 1);
  assert.equal(recovered.toolStateRevision, 2);
  assert.deepEqual(
    (await restarted.readToolConfiguration({ expectedSetupId: "default", toolId: "barz-enhancer" })).configuration,
    { marker: "default" }
  );
  await assert.rejects(readFile(pendingPath, "utf8"), (error) => error?.code === "ENOENT");
});

test("workshop reset scope follows an effective placement moved by the user", async (t) => {
  const { store } = await fixture(t);
  store.defaultToolConfigurations = { "barz-enhancer": { marker: "default" } };
  await store.init();
  let current = await store.removePlacement({
    expectedSetupId: "default",
    expectedRevision: 0,
    id: "barz-enhancer-in-looks"
  });
  current = await store.addPlacement({
    expectedSetupId: "default",
    expectedRevision: current.registry.revision,
    placement: { id: "barz-enhancer-in-ideas", toolId: "barz-enhancer", targetId: "prompt-forge", order: 1 }
  });
  await store.saveToolConfiguration({
    expectedSetupId: "default",
    expectedToolRevision: 0,
    toolId: "barz-enhancer",
    configuration: { marker: "personal" }
  });

  const preview = await store.previewReset({ expectedSetupId: "default", scope: { workshopId: "prompt-forge" } });
  assert.deepEqual(preview.resetToolIds, ["barz-enhancer"]);
  assert.deepEqual(preview.changedToolConfigurationIds, ["barz-enhancer"]);
  const reset = await store.resetDefaults({
    expectedSetupId: "default",
    expectedRevision: current.registry.revision,
    expectedToolRevision: 1,
    scope: { workshopId: "prompt-forge" }
  });
  assert.deepEqual(reset.resetToolIds, ["barz-enhancer"]);
  assert.deepEqual(
    (await store.readToolConfiguration({ expectedSetupId: "default", toolId: "barz-enhancer" })).configuration,
    { marker: "default" }
  );
});

test("restores a setup version saved before registry 1.1 through in-memory migration", async (t) => {
  const { directory, store } = await fixture(t);
  await store.init();
  const exported = await new RegistryStore({ directory: path.join(directory, "setups", "default") }).exportOverlay();
  const legacyOverlay = structuredClone(exported.overlay);
  delete legacyOverlay.customLibraries;
  delete legacyOverlay.libraryOverlays;
  const version = {
    schemaVersion: "1.0",
    id: "version-legacy1",
    setupId: "default",
    name: "Ancienne version",
    createdAt: "2026-09-10T10:00:00.000Z",
    sourceRevision: 0,
    defaultsVersion: "6.0.0-foundation.1",
    overlay: legacyOverlay,
    toolStateRevision: 0,
    toolConfigurations: {}
  };
  const versionDirectory = path.join(directory, "setup-versions", "default");
  await mkdir(versionDirectory, { recursive: true });
  await writeFile(path.join(versionDirectory, "version-legacy1.json"), `${JSON.stringify(version)}\n`, "utf8");

  const restored = await store.restoreVersion({
    expectedSetupId: "default",
    expectedRevision: 0,
    expectedToolRevision: 0,
    versionId: version.id
  });
  assert.equal(restored.registry.schemaVersion, "1.1");
  assert.equal(restored.registry.libraries.find(({ id }) => id === "banana-helper").entries.length, 77);
  assert.equal(restored.registry.revision, 1);
});
