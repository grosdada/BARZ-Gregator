import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { stageComponents } from "../installer/stage-components.mjs";

async function directory(t, prefix) {
  const value = await mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(() => rm(value, { recursive: true, force: true }));
  return value;
}

async function exists(filePath) {
  return stat(filePath).then(() => true, () => false);
}

test("stages core plus Atlas without leaking the Aggregator payload", async (t) => {
  const outputDirectory = await directory(t, "barz-v6-installer-atlas-");
  const receipt = await stageComponents({ outputDirectory, selected: ["atlas"] });
  assert.deepEqual(receipt.selected, ["core", "atlas"]);
  assert.equal(await exists(path.join(outputDirectory, "core", "component.json")), true);
  assert.equal(await exists(path.join(outputDirectory, "atlas", "component.json")), true);
  assert.equal(await exists(path.join(outputDirectory, "aggregator")), false);
});

test("stages both selected application payloads and writes a receipt", async (t) => {
  const outputDirectory = await directory(t, "barz-v6-installer-both-");
  const receipt = await stageComponents({ outputDirectory, selected: ["atlas", "aggregator"] });
  assert.deepEqual(receipt.selected, ["core", "atlas", "aggregator"]);
  const saved = JSON.parse(await readFile(path.join(outputDirectory, "install-selection.json"), "utf8"));
  assert.deepEqual(saved.selected, receipt.selected);
  assert.equal(await exists(path.join(outputDirectory, "aggregator", "component.json")), true);
});

test("refuses no app, unknown components, and a non-empty destination", async (t) => {
  const empty = await directory(t, "barz-v6-installer-none-");
  await assert.rejects(stageComponents({ outputDirectory: empty, selected: [] }), /Select atlas/);
  await assert.rejects(stageComponents({ outputDirectory: empty, selected: ["unknown"] }), /Unknown optional/);

  const nonEmpty = await directory(t, "barz-v6-installer-nonempty-");
  await stageComponents({ outputDirectory: nonEmpty, selected: ["atlas"] });
  await assert.rejects(stageComponents({ outputDirectory: nonEmpty, selected: ["aggregator"] }), /must be empty/);
});

test("NSIS sections reference payload directories that exist", async () => {
  const script = await readFile(new URL("../installer/barz-suite.nsi", import.meta.url), "utf8");
  assert.match(script, /Section "BARZ Prompt Atlas"/);
  assert.match(script, /File \/r "payload\\atlas\\\*\.\*"/);
  assert.match(script, /Section "BARZ Aggregator"/);
  assert.match(script, /File \/r "payload\\aggregator\\\*\.\*"/);
  assert.match(script, /File "payload\\launch\.vbs"/);
  assert.equal((script.match(/CreateShortCut "\$DESKTOP/g) ?? []).length, 1);
  assert.equal((script.match(/CreateShortCut "\$DESKTOP\\Placenta Studio\.lnk"/g) ?? []).length, 1);
  assert.doesNotMatch(script, /CreateShortCut "\$DESKTOP\\Prompt Atlas V6\.lnk"/);
  assert.doesNotMatch(script, /CreateShortCut "\$DESKTOP\\Barz-Gregator\.lnk"/);
  assert.match(script, /Delete "\$DESKTOP\\Prompt Atlas V6\.lnk"/);
  assert.match(script, /File "assets\\barz-suite\.ico"/);
  assert.match(script, /Icon "assets\\barz-suite\.ico"/);
  assert.match(script, /Function ComponentsLeave/);
  assert.match(script, /stop-barz-processes\.ps1/);
  assert.match(script, /Sysnative\\WindowsPowerShell/);
  assert.match(script, /Abort/);
});

test("Aggregator payload includes the Capture DNA lens and preset overlay", async () => {
  const script = await readFile(new URL("../installer/prepare-product-payload.mjs", import.meta.url), "utf8");
  const manifest = JSON.parse(await readFile(new URL("../installer/manifest.json", import.meta.url), "utf8"));
  assert.match(script, /capture-dna\.css/);
  assert.match(script, /capture-dna-ui\.js/);
  assert.match(script, /capture-dna-catalog\.js/);
  assert.match(script, /suite-preferences\.css/);
  assert.match(script, /\/api\/preferences/);
  assert.match(script, /readJson\(request, 70 \* 1024 \* 1024\)/);
  assert.match(script, /\^\(image\|video\)/);
  const bridge = await readFile(new URL("../installer/aggregator-overlays/suite-bridge.js", import.meta.url), "utf8");
  assert.match(bridge, /data-theme-choice/);
  assert.match(bridge, /data-language-choice/);
  assert.match(bridge, /Send to provider|Confirmation above US\$1\.50/);
  assert.match(bridge, /setInterval\(readPreferences, 1_000\)/);
  assert.match(bridge, /barz-suite:import-reference-blob/);
  assert.match(bridge, /\^\(image\|video\)/);
  assert.match(script, /Aggregator health version/);
  assert.match(script, new RegExp(manifest.version.replaceAll(".", "\\.")));
  assert.match(script, /For attempt = 1 To 120/);
  assert.match(script, /suite\.html\?app=aggregator&v=/);
  assert.match(script, /"package-lock\.json", "node_modules"/);
  assert.match(script, /Remove obsolete manual gateway navigation/);
  assert.match(script, /Remove obsolete manual gateway handler/);
});

test("Atlas payload packages the executable Blocking Studio Director skill", async () => {
  const source = await readFile(new URL("../apps/atlas/skills/blocking-studio-director/SKILL.md", import.meta.url), "utf8");
  const packaged = await readFile(new URL("../installer/payload/atlas/app/apps/atlas/skills/blocking-studio-director/SKILL.md", import.meta.url), "utf8");
  assert.equal(packaged, source);
  assert.match(packaged, /```barz-blocking-scene/);
  assert.match(packaged, /mouvement|camera move|camera keyframes/i);
});
