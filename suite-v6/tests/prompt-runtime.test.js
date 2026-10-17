import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { compileRecipe, RecipeInputError } from "../packages/prompt-runtime/src/index.js";

function recipe() {
  return {
    schemaVersion: "1.0",
    id: "literal-fixture-v1",
    revision: 1,
    title: "Literal fixture",
    fields: [
      { id: "subject", type: "text", required: true, maxLength: 2_000 },
      { id: "take", type: "number", min: 1, max: 9, default: 2 },
      { id: "enabled", type: "boolean", default: true },
      { id: "motion", type: "enum", values: ["Fixe", "Travelling lent"], default: "Travelling lent" }
    ],
    outputs: [{
      id: "main",
      mediaType: "video",
      template: "Sujet: {{subject}} | Prise {{take}} | {{motion}} | enabled={{enabled}}",
      negativePrompt: "",
      settings: { aspectRatio: "16:9" }
    }],
    referenceSlots: []
  };
}

test("compiles Unicode and typed defaults deterministically", () => {
  const first = compileRecipe(recipe(), { subject: "Étrange château — nuit" });
  const second = compileRecipe(recipe(), { subject: "Étrange château — nuit" });
  assert.deepEqual(first, second);
  assert.equal(first[0].prompt, "Sujet: Étrange château — nuit | Prise 2 | Travelling lent | enabled=true");
});

test("keeps markup as literal text and exposes no executable recipe hook", async () => {
  const value = "<img src=x onerror=alert(1)><script>throw 1</script>";
  const output = compileRecipe(recipe(), { subject: value })[0].prompt;
  assert.ok(output.includes(value));
  const source = await readFile(new URL("../packages/prompt-runtime/src/index.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\beval\s*\(|new\s+Function\s*\(/);
});

test("rejects missing, unknown, and mistyped inputs with a field path", () => {
  assert.throws(() => compileRecipe(recipe(), {}), (error) => {
    assert.ok(error instanceof RecipeInputError);
    assert.equal(error.path, "values.subject");
    return true;
  });
  assert.throws(() => compileRecipe(recipe(), { subject: "ok", extra: "no" }), /values\.extra/);
  assert.throws(() => compileRecipe(recipe(), { subject: "ok", take: "2" }), /values\.take/);
  assert.throws(() => compileRecipe(recipe(), { subject: "ok", motion: "Panique" }), /values\.motion/);
});
