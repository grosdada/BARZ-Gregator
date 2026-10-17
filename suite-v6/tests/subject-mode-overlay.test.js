import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../installer/aggregator-overlays/subject-mode.js", import.meta.url), "utf8");
const prepare = await readFile(new URL("../installer/prepare-product-payload.mjs", import.meta.url), "utf8");

test("Puppet mode injects the exact morphology lock only at generation time", () => {
  assert.match(source, /CRITICAL INSTRUCTION: IMG_1 is a reference for a practical puppet/);
  assert.match(source, /Do NOT apply realistic human anatomy/);
  assert.match(source, /The reference body IS the body/);
  assert.match(source, /generateButton\.addEventListener\("click"/);
  assert.match(source, /queueMicrotask/);
});

test("Puppet mode recognizes existing Atlas and Aggregator morphology layers", () => {
  assert.match(source, /function hasPuppetInstruction\(value\)/);
  assert.match(source, /"puppet mode:"/);
  assert.match(source, /"mode: puppet \/ figurine"/);
  assert.match(source, /"is a reference for a practical puppet\/figurine character"/);
  assert.match(source, /hasPuppetInstruction\(promptInput\.value\)/);
  assert.doesNotMatch(source, /promptInput\.value\.includes\(PUPPET_INSTRUCTION\)/);
});

test("the installer payload includes the subject mode overlay", () => {
  assert.match(prepare, /subject-mode\.css/);
  assert.match(prepare, /subject-mode\.js/);
});
