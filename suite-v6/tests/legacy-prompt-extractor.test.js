import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  extractAtlasPrompts,
  extractHtmlLiterals,
  extractJavaScriptLiterals,
  registeredTools
} from "../../scripts/extract-atlas-prompts-v6.mjs";

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "barz-v6-legacy-source-"));
  const outputDirectory = await mkdtemp(path.join(os.tmpdir(), "barz-v6-extraction-"));
  t.after(async () => {
    await rm(root, { recursive: true, force: true });
    await rm(outputDirectory, { recursive: true, force: true });
  });
  const htmlDirectory = path.join(root, "Barzy App", "public", "assets", "HTML");
  const shellDirectory = path.join(root, "Barzy App", "prompt Atlas V2");
  await mkdir(htmlDirectory, { recursive: true });
  await mkdir(shellDirectory, { recursive: true });
  await mkdir(path.join(root, "public", "js"), { recursive: true });
  return { root, outputDirectory, htmlDirectory, shellDirectory };
}

test("extracts escaped strings and templates with stable source locations", () => {
  const source = [
    "// 'ignored comment'",
    "const prompt = 'Render a blue\\ncinematic room';",
    "const template = `Track ${subject} through a practical miniature city`;"
  ].join("\n");
  const literals = extractJavaScriptLiterals(source);
  assert.equal(literals.length, 2);
  assert.equal(literals[0].value, "Render a blue\ncinematic room");
  assert.equal(literals[0].line, 2);
  assert.equal(literals[1].kind, "template-literal");
  assert.match(literals[1].value, /\$\{subject\}/);
});

test("accepts a JavaScript string continued with CRLF", () => {
  const literals = extractJavaScriptLiterals("const prompt = 'cinematic\\\r\nlighting';");
  assert.equal(literals.length, 1);
  assert.equal(literals[0].value, "cinematiclighting");
});

test("does not turn regular-expression contents into JavaScript strings", () => {
  const source = [
    "const matcher = /['\\\"]prompt['\\\"]/g;",
    "const ratio = total / count;",
    "const prompt = 'Generate the actual miniature scene';"
  ].join("\n");
  const literals = extractJavaScriptLiterals(source);
  assert.deepEqual(literals.map(({ value }) => value), [
    "Generate the actual miniature scene"
  ]);
  assert.equal(literals[0].line, 3);
});

test("keeps an outer template and discovers strings in nested expressions", () => {
  const source = "const prompt = `Render ${enabled ? 'warm practical light' : `cold ${tone}`} now`;";
  const literals = extractJavaScriptLiterals(source);
  assert.deepEqual(literals.map(({ value, kind }) => ({ value, kind })), [
    {
      value: "Render ${enabled ? 'warm practical light' : `cold ${tone}`} now",
      kind: "template-literal"
    },
    { value: "warm practical light", kind: "string-literal" },
    { value: "cold ${tone}", kind: "template-literal" }
  ]);
});

test("extracts prompt data and inline-handler strings with raw provenance", () => {
  const source = [
    "<script>const fake = 'not an HTML attribute';</script>",
    "<button data-prompt=\"Camera &amp; subject stay fixed\"",
    "  onclick=\"setPrefix(this, 'Same subject, same light. ')\">Pick</button>",
    "<button onclick=\"setPrefix(this, &quot;Encoded mode&quot;)\">Encoded</button>"
  ].join("\n");
  const literals = extractHtmlLiterals(source);
  const dataPrompt = literals.find(item => item.kind === "html-attribute:data-prompt");
  assert.equal(dataPrompt.value, "Camera & subject stay fixed");
  assert.equal(dataPrompt.raw, "Camera &amp; subject stay fixed");
  const handlers = literals.filter(item => item.kind.startsWith("html-event:onclick"));
  assert.deepEqual(handlers.map(({ value }) => value), [
    "Same subject, same light. ", "Encoded mode"
  ]);
  assert.equal(handlers[0].raw, "Same subject, same light. ");
  assert.equal(handlers[0].attributeRaw, "setPrefix(this, 'Same subject, same light. ')");
  assert.equal(handlers[0].locationExact, true);
  assert.equal(handlers[1].locationExact, false);
});

test("reads registered tools without evaluating the legacy shell", () => {
  const shell = `const apps = [
  {
    id: "alpha", title: "Alpha", file: "alpha.html"
  },
  {
    id: "prompt-forge", title: "A.P.G", externalUrl: "/?module=apg"
  }
];
const els = {};`;
  assert.deepEqual(registeredTools(shell), [
    {
      id: "alpha",
      title: "Alpha",
      sourcePath: "Barzy App/public/assets/HTML/alpha.html"
    },
    { id: "prompt-forge", title: "A.P.G", sourcePath: "public/js/app.js" }
  ]);
});

test("builds a deduplicated source graph and never includes Image DNA content", async (t) => {
  const { root, outputDirectory, htmlDirectory, shellDirectory } = await fixture(t);
  const shell = `const apps = [
  {
    id: "alpha", title: "Alpha", file: "alpha.html"
  },
  {
    id: "prompt-forge", title: "A.P.G", externalUrl: "/?module=apg"
  },
  {
    id: "soul-prompts", title: "BZ Image DNA", file: "SOUL-PROMPTS-v02.html"
  }
];
const els = {};`;
  await writeFile(path.join(shellDirectory, "app.js"), shell);
  await writeFile(path.join(root, "public", "js", "app.js"),
    [
      "const prompt = 'Render the exact same cinematic sentence for testing';",
      "const apiKey = 'api_key=" + ["sk", "this-value-must-never-leave-the-source"].join("-") + "';"
    ].join("\n"));
  await writeFile(path.join(htmlDirectory, "alpha.html"), `
    <p class="prompt-text">A visible practical miniature prompt.</p>
    <script src="child.js"></script>`);
  await writeFile(path.join(htmlDirectory, "child.js"),
    "const prompt = 'Render the exact same cinematic sentence for testing';");
  await writeFile(path.join(htmlDirectory, "SOUL-PROMPTS-v02.html"),
    "<p>FORBIDDEN_IMAGE_DNA_SECRET_PROMPT</p>");

  const coverage = await extractAtlasPrompts({ root, outputDirectory });
  assert.equal(coverage.registeredEntryCount, 3);
  assert.equal(coverage.includedToolCount, 2);
  assert.equal(coverage.sourceCount, 3);

  const corpus = JSON.parse(await readFile(
    path.join(outputDirectory, "prompt-literals.json"), "utf8"));
  const manifest = JSON.parse(await readFile(
    path.join(outputDirectory, "source-manifest.json"), "utf8"));
  assert.doesNotMatch(JSON.stringify(corpus), /FORBIDDEN_IMAGE_DNA/);
  assert.doesNotMatch(JSON.stringify(corpus), /this-value-must-never/);
  assert.equal(coverage.safety.redactedSecretValues, 1);
  assert.ok(!manifest.sources.some(({ sourcePath }) => /SOUL-PROMPTS/i.test(sourcePath)));
  const duplicate = corpus.literals.find(({ value }) =>
    value === "Render the exact same cinematic sentence for testing");
  assert.equal(duplicate.occurrences.length, 2);
  assert.deepEqual(
    manifest.sources.find(({ sourcePath }) => sourcePath.endsWith("child.js")).owners,
    ["alpha"]
  );
});

test("adds existing server prompt sources without requiring absent optional documents", async (t) => {
  const { root, outputDirectory, shellDirectory } = await fixture(t);
  await writeFile(path.join(shellDirectory, "app.js"), `const apps = [
  {
    id: "prompt-forge", title: "A.P.G", externalUrl: "/?module=apg"
  }
];
const els = {};`);
  await writeFile(path.join(root, "public", "js", "app.js"),
    "const prompt = 'Visible APG prompt';");
  await writeFile(path.join(root, "server.js"),
    "const system = 'Server-side prompt instruction';");
  await mkdir(path.join(root, "docs"), { recursive: true });
  await writeFile(path.join(root, "docs", "ATLAS_BRAIN.md"),
    "# Atlas brain\n\nPreserve this complete instruction document.\n");

  const coverage = await extractAtlasPrompts({ root, outputDirectory });
  assert.equal(coverage.sourceCount, 3);
  const corpus = JSON.parse(await readFile(
    path.join(outputDirectory, "prompt-literals.json"), "utf8"));
  const brain = corpus.literals.find(({ value }) => value.startsWith("# Atlas brain"));
  assert.equal(brain.occurrences[0].kind, "markdown-document");
  assert.equal(brain.occurrences[0].raw, brain.value);
  const manifest = JSON.parse(await readFile(
    path.join(outputDirectory, "source-manifest.json"), "utf8"));
  assert.deepEqual(manifest.sources.find(({ sourcePath }) =>
    sourcePath === "server.js").owners, ["prompt-forge"]);
});

test("refuses to generate migration artifacts inside the legacy source", async (t) => {
  const { root } = await fixture(t);
  await assert.rejects(
    extractAtlasPrompts({ root, outputDirectory: path.join(root, "generated") }),
    /outside the legacy source tree/
  );
});
