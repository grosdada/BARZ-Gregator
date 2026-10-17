import { readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

// Read-only inventory. Never evaluates legacy scripts or reads the Image DNA bank.
// stdout is a report, not a complete semantic audit of every prompt.
const root = path.resolve(process.argv[2] || "E:/Fable 5-Project/Meat Journey");
const shellPath = "Barzy App/prompt Atlas V2/app.js";
const shell = await readFile(path.join(root, shellPath), "utf8");
const section = (start, end) => {
  const first = shell.indexOf(start);
  const last = shell.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error(`Registry markers not found: ${start} / ${end}`);
  return shell.slice(first, last);
};
const stringField = (block, field) => block.match(new RegExp(`${field}:\\s*"([^"]+)"`))?.[1];
const blocks = (value) => [...value.matchAll(/\{\s*id:\s*"[\s\S]*?\n  \}/g)]
  .map((match) => match[0]);
const categories = blocks(section("const categories = [", "function hexToRgb"))
  .map((block) => ({ id: stringField(block, "id"), title: stringField(block, "title") }));
const tools = blocks(section("const apps = [", "const els = {"));
const inventory = [];

for (const block of tools) {
  const id = stringField(block, "id");
  const file = stringField(block, "file");
  const externalUrl = stringField(block, "externalUrl");
  const sourcePath = file ? `Barzy App/public/assets/HTML/${file}`
    : externalUrl ? "public/js/app.js" : shellPath;
  const entry = {
    id,
    title: stringField(block, "title"),
    categories: [...(block.match(/categories:\s*\[([^\]]*)\]/)?.[1] || "")
      .matchAll(/"([^"]+)"/g)].map((match) => match[1]),
    sourcePath,
    summary: stringField(block, "summary")
  };
  const absolutePath = path.join(root, sourcePath);
  const metadata = await stat(absolutePath);
  entry.bytes = metadata.size;
  if (id === "soul-prompts") {
    entry.review = "excluded-by-user: bank content not read";
    inventory.push(entry);
    continue;
  }
  const source = await readFile(absolutePath, "utf8");
  entry.sha256 = createHash("sha256").update(source).digest("hex");
  entry.lines = source.split(/\r?\n/).length;
  entry.review = "structural inventory; full prompt review pending per-module migration";
  entry.storageKeys = [...new Set([...source.matchAll(
    /(?:getItem|setItem|storageGet|storageSet|indexedDB\.open)\(\s*["']([^"']+)["']/g
  )].map((match) => match[1]))];
  entry.promptFunctions = [...new Set([...source.matchAll(
    /function\s+([\w$]*(?:prompt|build|compile|generate|copy|send)[\w$]*)\s*\(/gi
  )].map((match) => match[1]))];
  entry.externalScripts = [...source.matchAll(/<script[^>]*src=["']([^"']+)["']/gi)]
    .map((match) => match[1]);
  entry.inlineScriptBlocks = [...source.matchAll(/<script\b/gi)].length;
  inventory.push(entry);
}

console.log(JSON.stringify({
  createdAt: new Date().toISOString(),
  root,
  shellSha256: createHash("sha256").update(shell).digest("hex"),
  categories,
  inventory,
  coverage: {
    note: "Heuristic registered-entry inventory, not a JavaScript parser. Source paths for native tools identify their host file, not isolated implementations. Linked scripts and prompt corpora require migration review.",
    rawEntryCount: inventory.length,
    distinctIds: new Set(inventory.map((entry) => entry.id)).size,
    excludedIds: ["soul-prompts"],
    semanticReviewComplete: false
  }
}, null, 2));
