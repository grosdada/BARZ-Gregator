// Recovery audit: exercises isolated temporary stores, never live data.
import assert from 'node:assert/strict';
import { mkdtemp, realpath, rename, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createBuildServer } from '../../apps/atlas/server.js';
import { AtlasSetupStore } from '../../packages/setups/src/index.js';

const root = await realpath(os.tmpdir());
const directory = await mkdtemp(path.join(root, 'barz-build-library-audit-'));
let app;
try {
  app = await createBuildServer({ dataDirectory: directory });
  const request = async (route, body) => {
    const response = await fetch(new URL(route, app.url), body ? {
      method: 'POST', headers: { 'Content-Type': 'application/json', Origin: app.url.slice(0, -1) },
      body: JSON.stringify(body)
    } : undefined);
    assert.equal(response.status, 200);
    return response.json();
  };
  const catalog = await request('/api/v1/tool-catalog');
  const before = structuredClone(catalog.goodies.defaults);
  const entryId = before.selectedEntryId;
  before.detailsByPrompt[entryId] = 'Personal scene retained in a recovery checkpoint';
  await app.store.saveToolConfiguration({ expectedSetupId: 'default', expectedToolRevision: 0,
    toolId: 'banana-helper', configuration: before });
  const reset = await request('/api/v1/reset', { expectedSetupId: 'default', expectedRevision: 0,
    expectedToolRevision: 1,
    scope: { workshopId: 'image-looks' } });
  await request('/api/v1/backups/restore', { expectedSetupId: 'default',
    expectedRevision: reset.registry.revision, expectedToolRevision: reset.toolStateRevision,
    backupName: reset.backupName });
  const after = await app.store.readToolConfiguration({ expectedSetupId: 'default', toolId: 'banana-helper' });
  const recovered = after.configuration.detailsByPrompt[entryId] === before.detailsByPrompt[entryId];

  const filtered = structuredClone(catalog.goodies.defaults);
  const vhs = catalog.goodies.entries.find(entry => entry.title === 'VHS Fitness Tape');
  filtered.searchQuery = 'VHS';
  filtered.selectedEntryId = vhs.id;
  filtered.activeCategory = vhs.categoryId;
  const compiled = await request('/api/v1/tools/banana-helper/compile', { configuration: filtered });

  let failToolWrite = false;
  const isolated = new AtlasSetupStore({
    directory: path.join(directory, 'interrupted-restore'),
    io: { rename: async (source, target) => {
      if (failToolWrite && path.basename(target) === 'tool-configurations.local.json') {
        throw Object.assign(new Error('Injected tool-state write failure'), { code: 'EIO' });
      }
      return rename(source, target);
    } }
  });
  await isolated.init();
  const savedVersion = await isolated.saveVersion({ expectedSetupId: 'default', expectedRevision: 0,
    expectedToolRevision: 0, name: 'Original' });
  await isolated.renameWorkshop({ expectedSetupId: 'default', expectedRevision: 0,
    id: 'image-looks', title: 'Personal library title' });
  await isolated.saveToolConfiguration({ expectedSetupId: 'default', expectedToolRevision: 0,
    toolId: 'banana-helper', configuration: before });
  failToolWrite = true;
  let writeFailureObserved = false;
  try {
    await isolated.restoreVersion({ expectedSetupId: 'default', expectedRevision: 1,
      expectedToolRevision: 1,
      versionId: savedVersion.version.id });
  } catch (error) {
    if (error.code !== 'EIO') throw error;
    writeFailureObserved = true;
  }
  failToolWrite = false;
  const recoveredWorkspace = await isolated.read();
  const recoveredTools = await isolated.readToolConfiguration({ expectedSetupId: 'default', toolId: 'banana-helper' });
  console.log(JSON.stringify({
    auditVersion: '0.6.0', liveDataTouched: false, providerCalls: 0,
    backupRestoresToolDetails: recovered,
    filteredSelection: { selectedCategory: vhs.categoryId, activeCategory: filtered.activeCategory,
      categoryCopyFirstLine: compiled.copyCategory.split('\n')[0] },
    interruptedRestore: {
      writeFailureObserved,
      resumedOnNextRead: recoveredWorkspace.registry.workshops.find(item => item.id === 'image-looks').title === 'Look Library'
        && recoveredTools.configuration === null,
      registryRevision: recoveredWorkspace.registry.revision,
      toolRevision: recoveredTools.toolRevision
    }
  }, null, 2));
} finally {
  await app?.close();
  const resolved = await realpath(directory);
  if (path.dirname(resolved).toLowerCase() !== root.toLowerCase()
      || !path.basename(resolved).startsWith('barz-build-library-audit-')) {
    throw new Error('Refusing cleanup outside the exact audit temporary directory');
  }
  await rm(resolved, { recursive: true, force: true });
}
