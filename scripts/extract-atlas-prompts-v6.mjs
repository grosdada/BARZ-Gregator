import { createHash } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_ROOT = "E:/Fable 5-Project/Meat Journey";
const SHELL_PATH = "Barzy App/prompt Atlas V2/app.js";
const HTML_ROOT = "Barzy App/public/assets/HTML";
const EXCLUDED_PATTERNS = [
  /(?:^|\/)SOUL-PROMPTS-v02\.html$/i,
  /(?:^|\/)photo-dna-presets\.json$/i
];
const SOURCE_EXTENSIONS = new Set([".html", ".js", ".mjs", ".json", ".md"]);
const SUPPLEMENTAL_SOURCE_OWNERS = new Map([
  ["server.js", [
    "prompt-forge", "image-analyzer", "seedance", "blocking-studio", "video-analyzer"
  ]],
  ["docs/ATLAS_BRAIN.md", ["prompt-forge"]],
  ["docs/CINE-DNA.md", ["image-analyzer"]],
  ["docs/AUTO-BLOCKING.md", ["blocking-studio"]],
  ["docs/DIRECTING-EDITING.md", ["seedance"]],
  ["docs/video-models/SEEDANCE.md", ["seedance"]],
  ["docs/video-models/KLING.md", ["seedance"]],
  ["docs/video-models/VEO.md", ["seedance"]],
  ["docs/video-models/WAN.md", ["seedance"]]
]);
const PROMPT_WORDS = new RegExp([
  "prompt", "instruction", "system", "negative", "template", "intent",
  "transform", "description", "caption", "dialogue", "shot", "camera",
  "motion", "style"
].join("|"), "i");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function relativeUnix(root, filePath) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

function isExcluded(relativePath) {
  return EXCLUDED_PATTERNS.some((pattern) => pattern.test(relativePath));
}

function lineAndColumn(source, index) {
  const before = source.slice(0, index);
  const lines = before.split(/\r?\n/);
  return { line: lines.length, column: lines.at(-1).length + 1 };
}

function decodeEntities(value) {
  const named = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: '"' };
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] !== "#") return named[entity.toLowerCase()] ?? match;
    const radix = entity[1]?.toLowerCase() === "x" ? 16 : 10;
    const digits = radix === 16 ? entity.slice(2) : entity.slice(1);
    const point = Number.parseInt(digits, radix);
    return Number.isSafeInteger(point) ? String.fromCodePoint(point) : match;
  });
}

function decodeEscapes(value) {
  const escapePattern =
    /\\(?:\r?\n|u\{([0-9a-f]+)\}|u([0-9a-f]{4})|x([0-9a-f]{2})|([0btnvfr'"`\\]))/gi;
  return value.replace(escapePattern,
    (match, unicodePoint, unicode, hex, simple) => {
      if (/^\\\r?\n$/.test(match)) return "";
      const digits = unicodePoint ?? unicode ?? hex;
      if (digits) return String.fromCodePoint(Number.parseInt(digits, 16));
      return { 0: "\0", b: "\b", t: "\t", n: "\n", v: "\v", f: "\f", r: "\r" }[simple]
        ?? simple;
    });
}

function contentValue(value, { html = false } = {}) {
  const decoded = (html ? decodeEntities(value) : value).replace(/\r\n/g, "\n");
  if (decoded.length < 2 || !/\p{L}/u.test(decoded)) return null;
  if (/^data:/i.test(decoded) || /^https?:\/\/\S+$/i.test(decoded)) return null;
  return decoded;
}

function scoreLiteral(value, context) {
  let score = 0;
  const words = value.trim().split(/\s+/).filter(Boolean).length;
  if (PROMPT_WORDS.test(context)) score += 3;
  if (words >= 5) score += 1;
  if (words >= 16) score += 1;
  if (value.length >= 160) score += 1;
  if (/\{\{|\$\{|@image\d|\b(?:cinematic|render|generate|subject|scene)\b/i.test(value)) score += 2;
  if (/^(?:#[\w-]+|\.[\w-]+|[\w-]+\.[\w-]+)$/.test(value.trim())) score -= 3;
  return score;
}

function classification(score) {
  if (score >= 5) return "likely-prompt";
  if (score >= 2) return "review-candidate";
  return "context-only";
}

function looksLikeSecret(value) {
  return [
    /\bsk-[a-z0-9_-]{20,}\b/i,
    /\b[a-f0-9]{8}-[a-f0-9-]{27,}:[a-z0-9_-]{16,}\b/i,
    /(?:api[_ -]?key|authorization|bearer)\s*[:=]\s*["']?[a-z0-9._-]{20,}/i
  ].some((pattern) => pattern.test(value));
}

function enclosingFunction(source, index) {
  const before = source.slice(Math.max(0, index - 2500), index);
  const functionPattern =
    /(?:function\s+([\w$]+)|(?:const|let|var)\s+([\w$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)/g;
  const matches = [...before.matchAll(functionPattern)];
  const match = matches.at(-1);
  return match ? match[1] ?? match[2] : null;
}

function previousTokenAllowsRegex(source, index) {
  const before = source.slice(0, index).match(/(?:\b([A-Za-z_$][\w$]*)|([^\s]))\s*$/);
  if (!before) return true;
  if (before[1]) {
    return /^(?:await|case|delete|do|else|in|instanceof|new|of|return|throw|typeof|void|yield)$/.test(
      before[1]
    );
  }
  return /[({\[=,:;!?&|+*%^~<>-]/.test(before[2]);
}

function scanRegularExpression(source, start) {
  let index = start + 1;
  let inCharacterClass = false;
  while (index < source.length) {
    const character = source[index];
    if (character === "\\") {
      index += 2;
      continue;
    }
    if (character === "\n" || character === "\r") return start + 1;
    if (character === "[") inCharacterClass = true;
    if (character === "]") inCharacterClass = false;
    if (character === "/" && !inCharacterClass) {
      index += 1;
      while (/[A-Za-z]/.test(source[index] ?? "")) index += 1;
      return index;
    }
    index += 1;
  }
  return start + 1;
}

function scanJavaScriptStringTokens(source) {
  const tokens = [];

  function scanQuoted(start, quote) {
    let index = start + 1;
    while (index < source.length) {
      const character = source[index];
      if (character === "\\") {
        index += source[index + 1] === "\r" && source[index + 2] === "\n" ? 3 : 2;
        continue;
      }
      if (character === quote) return index + 1;
      if (quote !== "`" && (character === "\n" || character === "\r")) return index;
      if (quote === "`" && character === "$" && source[index + 1] === "{") {
        index = scanTemplateExpression(index + 2);
        continue;
      }
      index += 1;
    }
    return index;
  }

  function recordQuoted(start, quote) {
    const end = scanQuoted(start, quote);
    tokens.push({ start, end, quote, raw: source.slice(start + 1, Math.max(start + 1, end - 1)) });
    return end;
  }

  function skipComment(index) {
    if (source[index + 1] === "/") {
      const end = source.indexOf("\n", index + 2);
      return end < 0 ? source.length : end;
    }
    if (source[index + 1] === "*") {
      const end = source.indexOf("*/", index + 2);
      return end < 0 ? source.length : end + 2;
    }
    return index;
  }

  function scanTemplateExpression(start) {
    let index = start;
    let depth = 1;
    while (index < source.length && depth > 0) {
      const character = source[index];
      if (character === "/" && ["/", "*"].includes(source[index + 1])) {
        index = skipComment(index);
        continue;
      }
      if (["'", '"', "`"].includes(character)) {
        index = recordQuoted(index, character);
        continue;
      }
      if (character === "/" && previousTokenAllowsRegex(source, index)) {
        index = scanRegularExpression(source, index);
        continue;
      }
      if (character === "{") depth += 1;
      if (character === "}") depth -= 1;
      index += 1;
    }
    return index;
  }

  let index = 0;
  while (index < source.length) {
    const character = source[index];
    if (character === "/" && ["/", "*"].includes(source[index + 1])) {
      index = skipComment(index);
      continue;
    }
    if (["'", '"', "`"].includes(character)) {
      index = recordQuoted(index, character);
      continue;
    }
    if (character === "/" && previousTokenAllowsRegex(source, index)) {
      index = scanRegularExpression(source, index);
      continue;
    }
    index += 1;
  }
  return tokens.sort((left, right) => left.start - right.start || right.end - left.end);
}

export function extractJavaScriptLiterals(source, lineOffset = 0) {
  return scanJavaScriptStringTokens(source).flatMap(({ start, end, quote, raw }) => {
    const value = contentValue(decodeEscapes(raw));
    if (!value) return [];
    const location = lineAndColumn(source, start);
    const context = source.slice(Math.max(0, start - 180), Math.min(source.length, end + 80));
    const score = scoreLiteral(value, context);
    return [{
      value,
      raw,
      kind: quote === "`" ? "template-literal" : "string-literal",
      line: location.line + lineOffset,
      column: location.column,
      functionName: enclosingFunction(source, start),
      score,
      classification: classification(score)
    }];
  });
}

function maskExecutableHtml(source) {
  return source.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, (match) =>
    match.replace(/[^\r\n]/g, " ")
  );
}

export function extractHtmlLiterals(source) {
  const literals = [];
  const withoutExecutable = maskExecutableHtml(source);
  for (const match of withoutExecutable.matchAll(/>([^<>]+)</g)) {
    const raw = match[1];
    const value = contentValue(raw.replace(/\s+/g, " ").trim(), { html: true });
    if (!value) continue;
    const location = lineAndColumn(withoutExecutable, match.index + 1);
    const context = withoutExecutable.slice(Math.max(0, match.index - 160), match.index + 80);
    const score = scoreLiteral(value, context);
    literals.push({
      value,
      raw,
      kind: "html-text",
      line: location.line,
      column: location.column,
      functionName: null,
      score,
      classification: classification(score)
    });
  }
  const attributePattern =
    /\b(data-prompt|placeholder|title|aria-label|value)\s*=\s*(["'])([\s\S]*?)\2/gi;
  for (const match of withoutExecutable.matchAll(attributePattern)) {
    const value = contentValue(match[3], { html: true });
    if (!value) continue;
    const location = lineAndColumn(source, match.index);
    const context = source.slice(
      Math.max(0, match.index - 100),
      match.index + match[0].length + 60
    );
    const score = scoreLiteral(value, context);
    literals.push({
      value,
      raw: match[3],
      kind: `html-attribute:${match[1].toLowerCase()}`,
      line: location.line,
      column: location.column,
      functionName: null,
      score,
      classification: classification(score)
    });
  }
  const eventPattern = /\b(on[a-z]+)\s*=\s*(["'])([\s\S]*?)\2/gi;
  for (const match of withoutExecutable.matchAll(eventPattern)) {
    const contentIndex = match.index + match[0].indexOf(match[3]);
    const attributeLocation = lineAndColumn(source, contentIndex);
    const handler = decodeEntities(match[3]);
    for (const literal of extractJavaScriptLiterals(handler)) {
      literals.push({
        ...literal,
        attributeRaw: match[3],
        kind: `html-event:${match[1].toLowerCase()}:${literal.kind}`,
        line: attributeLocation.line + literal.line - 1,
        column: literal.line === 1 ? attributeLocation.column + literal.column - 1 : literal.column,
        locationExact: handler === match[3],
        functionName: null
      });
    }
  }
  return literals;
}

function extractHtmlScripts(source) {
  const literals = [];
  for (const match of source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    const contentIndex = match.index + match[0].indexOf(match[1]);
    const offset = lineAndColumn(source, contentIndex).line - 1;
    literals.push(...extractJavaScriptLiterals(match[1], offset));
  }
  return literals;
}

function extractMarkdownDocument(source) {
  const value = contentValue(source);
  if (!value) return [];
  return [{
    value,
    raw: source,
    kind: "markdown-document",
    line: 1,
    column: 1,
    functionName: null,
    score: 8,
    classification: "likely-prompt"
  }];
}

function stringField(block, field) {
  return block.match(new RegExp(`${field}:\\s*"([^"]+)"`))?.[1];
}

export function registeredTools(shell) {
  const first = shell.indexOf("const apps = [");
  const last = shell.indexOf("const els = {", first);
  if (first < 0 || last <= first) throw new Error("Atlas registry markers were not found");
  return [...shell.slice(first, last).matchAll(/\{\s*id:\s*"[\s\S]*?\n  \}/g)].map((match) => {
    const block = match[0];
    const file = stringField(block, "file");
    const externalUrl = stringField(block, "externalUrl");
    return {
      id: stringField(block, "id"),
      title: stringField(block, "title"),
      sourcePath: file ? `${HTML_ROOT}/${file}` : externalUrl ? "public/js/app.js" : SHELL_PATH
    };
  });
}

function localReferences(source, extension) {
  const values = [];
  if (extension === ".html") {
    const scriptPattern = /<script\b[^>]*\bsrc=["']([^"']+)["']/gi;
    for (const match of source.matchAll(scriptPattern)) values.push(match[1]);
  }
  for (const pattern of [
    /\bfetch\(\s*["']([^"']+)["']/g,
    /\b(?:import|export)\s+(?:[\s\S]*?\sfrom\s*)?["']([^"']+)["']/g,
    /\bimport\(\s*["']([^"']+)["']\s*\)/g
  ]) {
    for (const match of source.matchAll(pattern)) values.push(match[1]);
  }
  return [...new Set(values)];
}

async function resolveReference(root, sourcePath, reference) {
  const clean = reference.split(/[?#]/)[0];
  if (!clean || /^(?:[a-z]+:|\/\/|#)/i.test(clean)) return null;
  const absolute = clean.startsWith("/")
    ? path.resolve(root, clean.slice(1))
    : path.resolve(path.dirname(path.join(root, sourcePath)), clean);
  const relative = relativeUnix(root, absolute);
  if (relative.startsWith("../") || path.isAbsolute(relative)) return null;
  if (!SOURCE_EXTENSIONS.has(path.extname(absolute).toLowerCase()) ||
      isExcluded(relative)) return null;
  try {
    return (await stat(absolute)).isFile() ? relative : null;
  } catch {
    return null;
  }
}

function addOccurrence(records, occurrence, safety) {
  if (looksLikeSecret(occurrence.value)) {
    safety.redactedSecretValues += 1;
    safety.redactedSources.add(occurrence.sourcePath);
    return;
  }
  const key = sha256(occurrence.value);
  let record = records.get(key);
  if (!record) {
    record = {
      id: `text-${key.slice(0, 20)}`,
      sha256: key,
      value: occurrence.value,
      highestScore: occurrence.score,
      classification: occurrence.classification,
      occurrences: []
    };
    records.set(key, record);
  }
  if (occurrence.score > record.highestScore) {
    record.highestScore = occurrence.score;
    record.classification = occurrence.classification;
  }
  const {
    value: _value,
    score: _score,
    classification: _classification,
    ...location
  } = occurrence;
  record.occurrences.push(location);
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeCompactJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

function chunkByCharacters(items, maximumCharacters = 60_000) {
  const chunks = [];
  let current = [];
  let characters = 0;
  for (const item of items) {
    if (current.length > 0 && characters + item.value.length > maximumCharacters) {
      chunks.push(current);
      current = [];
      characters = 0;
    }
    current.push(item);
    characters += item.value.length;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

export async function extractAtlasPrompts({ root = DEFAULT_ROOT, outputDirectory } = {}) {
  if (!outputDirectory) throw new TypeError("extractAtlasPrompts requires an outputDirectory");
  const absoluteRoot = path.resolve(root);
  const absoluteOutput = path.resolve(outputDirectory);
  const outputInsideSource = path.relative(absoluteRoot, absoluteOutput);
  if (!outputInsideSource.startsWith("..") && !path.isAbsolute(outputInsideSource)) {
    throw new Error("Extraction output must stay outside the legacy source tree");
  }
  const shell = await readFile(path.join(absoluteRoot, SHELL_PATH), "utf8");
  const tools = registeredTools(shell);
  const registeredIds = new Set(tools.map(({ id }) => id));
  const sourceOwners = new Map();
  for (const tool of tools) {
    if (tool.id === "soul-prompts" || isExcluded(tool.sourcePath)) continue;
    if (!sourceOwners.has(tool.sourcePath)) sourceOwners.set(tool.sourcePath, new Set());
    sourceOwners.get(tool.sourcePath).add(tool.id);
  }

  for (const [sourcePath, owners] of SUPPLEMENTAL_SOURCE_OWNERS) {
    const registeredOwners = owners.filter((owner) => registeredIds.has(owner));
    if (registeredOwners.length === 0) continue;
    try {
      if (!(await stat(path.join(absoluteRoot, sourcePath))).isFile()) continue;
    } catch {
      continue;
    }
    if (!sourceOwners.has(sourcePath)) sourceOwners.set(sourcePath, new Set());
    registeredOwners.forEach((owner) => sourceOwners.get(sourcePath).add(owner));
  }

  const queue = [...sourceOwners.keys()];
  const sources = new Map();
  while (queue.length > 0) {
    const sourcePath = queue.shift();
    if (sources.has(sourcePath) || isExcluded(sourcePath)) continue;
    const absolutePath = path.join(absoluteRoot, sourcePath);
    const source = await readFile(absolutePath, "utf8");
    const owners = sourceOwners.get(sourcePath) ?? new Set();
    const dependencies = [];
    for (const reference of localReferences(source, path.extname(sourcePath).toLowerCase())) {
      const resolved = await resolveReference(absoluteRoot, sourcePath, reference);
      if (!resolved) continue;
      dependencies.push(resolved);
      if (!sourceOwners.has(resolved)) sourceOwners.set(resolved, new Set());
      owners.forEach((owner) => sourceOwners.get(resolved).add(owner));
      if (!sources.has(resolved)) queue.push(resolved);
    }
    sources.set(sourcePath, { source, dependencies: [...new Set(dependencies)].sort() });
  }

  let ownersChanged = true;
  while (ownersChanged) {
    ownersChanged = false;
    for (const [sourcePath, entry] of sources) {
      const owners = sourceOwners.get(sourcePath) ?? new Set();
      for (const dependency of entry.dependencies) {
        const dependencyOwners = sourceOwners.get(dependency) ?? new Set();
        for (const owner of owners) {
          if (dependencyOwners.has(owner)) continue;
          dependencyOwners.add(owner);
          ownersChanged = true;
        }
        sourceOwners.set(dependency, dependencyOwners);
      }
    }
  }

  const records = new Map();
  const safety = { redactedSecretValues: 0, redactedSources: new Set() };
  const sourceManifest = [];
  for (const [sourcePath, entry] of sources) {
    const extension = path.extname(sourcePath).toLowerCase();
    const owners = [...(sourceOwners.get(sourcePath) ?? [])].sort();
    const extracted = extension === ".html"
      ? [...extractHtmlLiterals(entry.source), ...extractHtmlScripts(entry.source)]
      : extension === ".md"
        ? extractMarkdownDocument(entry.source)
        : extension === ".json"
        ? extractJavaScriptLiterals(entry.source)
        : extractJavaScriptLiterals(entry.source);
    extracted.forEach((literal) => addOccurrence(
      records,
      { ...literal, sourcePath, owners },
      safety
    ));
    sourceManifest.push({
      sourcePath,
      owners,
      bytes: Buffer.byteLength(entry.source),
      lines: entry.source.split(/\r?\n/).length,
      sha256: sha256(entry.source),
      dependencies: entry.dependencies,
      extractedOccurrences: extracted.length
    });
  }

  const literals = [...records.values()].sort((a, b) =>
    b.highestScore - a.highestScore || a.id.localeCompare(b.id));
  const buckets = ["likely-prompt", "review-candidate", "context-only"];
  const counts = Object.fromEntries(buckets.map((bucket) => [
    bucket,
    literals.filter((item) => item.classification === bucket).length
  ]));
  const toolIds = [...new Set(tools
    .filter((tool) => tool.id !== "soul-prompts")
    .map((tool) => tool.id))];
  const reviewBatches = sourceManifest
    .slice()
    .sort((a, b) => a.sourcePath.localeCompare(b.sourcePath))
    .flatMap((source, sourceIndex) => {
      const sourceLiterals = literals.filter((item) => item.occurrences.some(
        (occurrence) => occurrence.sourcePath === source.sourcePath
      ));
      const reviewLiterals = sourceLiterals.filter(
        (item) => item.classification !== "context-only"
      );
      const chunks = chunkByCharacters(reviewLiterals);
      return chunks.map((chunk, partIndex) => {
        const reviewCharacters = chunk.reduce(
          (total, item) => total + item.value.length,
          0
        );
        const sourceNumber = String(sourceIndex + 1).padStart(2, "0");
        const partNumber = String(partIndex + 1).padStart(2, "0");
        const prefix = `${sourceNumber}-${partNumber}`;
        return {
          id: `batch-${prefix}`,
          sourcePath: source.sourcePath,
          sourcePart: partIndex + 1,
          sourcePartCount: chunks.length,
          owners: source.owners,
          likelyPromptCount: chunk.filter(
            (item) => item.classification === "likely-prompt"
          ).length,
          reviewCandidateCount: chunk.filter(
            (item) => item.classification === "review-candidate"
          ).length,
          contextOnlyCount: partIndex === 0
            ? sourceLiterals.length - reviewLiterals.length
            : 0,
          reviewCharacters,
          approximateReviewTokens: Math.ceil(reviewCharacters / 4),
          fileName: `${prefix}-${sha256(source.sourcePath).slice(0, 10)}.json`,
          literals: chunk,
          status: "extracted"
        };
      });
    });
  const createdAt = new Date().toISOString();
  const coverage = {
    schemaVersion: "1.0",
    createdAt,
    sourceRoot: absoluteRoot,
    shellSha256: sha256(shell),
    registeredEntryCount: tools.length,
    distinctToolCount: new Set(tools.map(({ id }) => id)).size,
    includedToolCount: toolIds.length,
    excludedTools: [{ id: "soul-prompts", title: "BZ Image DNA", reason: "excluded-by-user" }],
    excludedSourcePatterns: EXCLUDED_PATTERNS.map(String),
    sourceCount: sourceManifest.length,
    supplementalSourceCount: [...SUPPLEMENTAL_SOURCE_OWNERS.keys()].filter(
      (sourcePath) => sources.has(sourcePath)
    ).length,
    uniqueLiteralCount: literals.length,
    occurrenceCount: literals.reduce((sum, item) => sum + item.occurrences.length, 0),
    counts,
    safety: {
      redactedSecretValues: safety.redactedSecretValues,
      redactedSourceCount: safety.redactedSources.size,
      redactedSources: [...safety.redactedSources].sort()
    },
    approximateReviewTokens: reviewBatches.reduce(
      (total, batch) => total + batch.approximateReviewTokens,
      0
    ),
    corpusDigest: sha256(JSON.stringify(literals)),
    semanticReviewComplete: false,
    note: "Mechanical extraction only. Decoded values and raw source fragments " +
      "are stored separately; visible HTML text is whitespace-normalized. " +
      "Classification is a review aid, not a migration decision."
  };

  await mkdir(absoluteOutput, { recursive: true });
  await writeJson(path.join(absoluteOutput, "source-manifest.json"), {
    schemaVersion: "1.0",
    createdAt,
    sources: sourceManifest.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath))
  });
  await writeJson(path.join(absoluteOutput, "prompt-literals.json"), {
    schemaVersion: "1.0",
    createdAt,
    literals
  });
  const reviewDirectory = path.join(absoluteOutput, "review-batches");
  if (path.relative(absoluteOutput, reviewDirectory) !== "review-batches") {
    throw new Error("Unsafe review batch output directory");
  }
  await rm(reviewDirectory, { recursive: true, force: true });
  await mkdir(reviewDirectory, { recursive: true });
  for (const batch of reviewBatches) {
    await writeCompactJson(path.join(reviewDirectory, batch.fileName), {
      schemaVersion: "1.0",
      batch: {
        id: batch.id,
        sourcePath: batch.sourcePath,
        owners: batch.owners,
        status: batch.status
      },
      literals: batch.literals.map((literal) => ({
        id: literal.id,
        classification: literal.classification,
        value: literal.value,
        occurrences: literal.occurrences
          .filter((occurrence) => occurrence.sourcePath === batch.sourcePath)
          .map(({ line, column, kind, functionName, raw, attributeRaw, locationExact }) => ({
            line,
            column,
            kind,
            functionName,
            raw,
            ...(attributeRaw === undefined ? {} : { attributeRaw }),
            ...(locationExact === undefined ? {} : { locationExact })
          }))
      }))
    });
  }
  await writeJson(path.join(absoluteOutput, "review-batches.json"), {
    schemaVersion: "1.0",
    createdAt,
    batches: reviewBatches.map(({ literals: _literals, ...batch }) => batch)
  });
  await writeJson(path.join(absoluteOutput, "coverage.json"), coverage);
  return coverage;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const root = process.argv[2] || DEFAULT_ROOT;
  const outputDirectory = process.argv[3]
    || path.resolve("suite-v6/migration/atlas-v5");
  const coverage = await extractAtlasPrompts({ root, outputDirectory });
  console.log(JSON.stringify(coverage, null, 2));
}
