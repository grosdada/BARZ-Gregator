import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../apps/atlas/public/assets/HTML/3D-IA-Workflow.html", import.meta.url), "utf8");

test("A18 preserves all six legacy 2D transfer prompts and both 3D generators", () => {
  for (const title of [
    "Character Swap & Morphological Lock (Gold)", "Transfert Pose", "Generate with REF image",
    "Transfert style from Ref", "Transfert Subject", "Transfert Background"
  ]) assert.match(source, new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(source, /id="output-text"/);
  assert.match(source, /id="output-text-v"/);
  assert.match(source, /Seedance 2/);
  assert.match(source, /Kling 3/);
  assert.match(source, /Veo 3\.1/);
  assert.match(source, /Gemini Omni/);
});

test("A18 uses the shared twelve-color cyclorama palette without remote assets", () => {
  assert.equal((source.match(/class="cyc-swatch(?: active)?"/g) ?? []).length, 12);
  for (const hex of ["#F2ECCA", "#B3A089", "#766D63", "#34383C", "#515973", "#496B6D", "#DE7C68", "#A66F5B", "#A58A52", "#6F7654", "#7F9181", "#777083"]) {
    assert.match(source, new RegExp(hex));
  }
  assert.doesNotMatch(source, /fonts\.googleapis\.com/);
});

test("A18 wrapper exposes every output and the Aggregator bridge", async () => {
  const wrapper = await readFile(new URL("../apps/atlas/public/workflow-3d.js", import.meta.url), "utf8");
  assert.equal((wrapper.match(/id: "transfer2d-/g) ?? []).length, 6);
  assert.match(wrapper, /Envoyer à BZ Aggregator/);
  assert.match(wrapper, /configuration\.controls/);
  assert.match(wrapper, /configuration\.activeActions/);
});
