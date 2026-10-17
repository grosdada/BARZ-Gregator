import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const EXCLUDED_OWNER = "soul-prompts";
const EXCLUDED_SOURCE = /(?:^|\/)(?:SOUL-PROMPTS-v02\.html|photo-dna-presets\.json)$/i;
const REVIEWED_OWNERS = new Set(["banana-helper", "barz-enhancer", "imperfection"]);
const TECHNICAL_TOKEN = /^(?:true|false|null|undefined|click|copy|input|output|prompt|prompts|title|value|label|button|section|nav|red|green|blue|none)$/i;
const CODE_FRAGMENT = /(?:<\/?(?:div|span|button|section|input|label)\b|data-action=|querySelector|addEventListener|class=|id=|^\[[a-z-]+(?:=|\]))/i;
const PROMPT_SIGNAL = /(?:\b(?:render|generate|create|transform|preserve|camera|shot|scene|subject|character|lighting|motion|cinematic|photoreal|image|video|style|composition|background|portrait|texture|movement|dialogue)\b|\{\{|\$\{|\[(?:IMG|Scene|Details|Image)[^\]]*\]|@image\d*)/i;
const PROMPT_FUNCTION = /(?:prompt|instruction|compose|fallback|negative|analysis|analy[sz]e|direct|verbal)/i;
const HTML_UI_KIND = /^html-(?:text|attribute:(?:placeholder|title|aria-label))$/;
const ASTRA_BUNDLE_DEFINITIONS = [
  {
    id: "a1-realism-beauty",
    title: "A1 — Realism Forge + Beauty",
    owners: ["realism-forge", "barz-beauty"]
  },
  {
    id: "a2-cinematic-shoot",
    title: "A2 — Cinematic Shoot",
    owners: ["cinematic-shoot"]
  },
  {
    id: "a3-acting-gen",
    title: "A3 — Acting Gen",
    owners: ["acting-gen"]
  },
  {
    id: "a4-facs-board",
    title: "A4 — FACS Sheet Generator + BZ Board",
    owners: ["facs-sheet-generator", "barzy-board"]
  },
  {
    id: "a5-veo-precision",
    title: "A5 — VEO Precision",
    owners: ["veo-suite"]
  },
  {
    id: "a6-consistent-character-process",
    title: "A6 — Consistent Character Process",
    owners: ["cccp"]
  },
  {
    id: "a7-character-sheet",
    title: "A7 — BZ Sheet",
    owners: ["barzy-sheet"]
  },
  {
    id: "a8-bz-designer",
    title: "A8 — BZ Designer",
    owners: ["barz-designer"]
  },
  {
    id: "a9-knolling-board",
    title: "A9 — Knolling Board Generator",
    owners: ["knolling"]
  },
  {
    id: "a10-multishot",
    title: "A10 — MD Multishot",
    owners: ["multishot"]
  },
  {
    id: "a11-seedance-framing",
    title: "A11 — Seedance Framing",
    owners: ["seedance"]
  },
  {
    id: "a12-cinema-helper",
    title: "A12 — Cinema Helper",
    owners: ["cinema-helper"]
  }
];
const ASTRA_TRIAGE_KINDS = new Set([
  "prompt-context-candidate",
  "short-atom-candidate",
  "prose-candidate",
  "unresolved-candidate"
]);

export function computeReviewBundleDigest(items) {
  if (!Array.isArray(items)) throw new TypeError("Review bundle items must be an array.");
  const canonical = items.map(({ id, owner, reviewKind, triageKind = null, value }) => ({
    id, owner, reviewKind, triageKind, value
  }));
  return createHash("sha256").update(JSON.stringify(canonical), "utf8").digest("hex");
}

function words(value) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function ownerKey(occurrences) {
  const owners = [...new Set(occurrences.flatMap(({ owners = [] }) => owners).filter((owner) => owner !== EXCLUDED_OWNER))].sort();
  return owners.length === 1 ? owners[0] : "shared-shell";
}

function triageKind(literal, occurrences) {
  const value = literal.value.trim();
  if (occurrences.length && occurrences.every(({ kind }) => HTML_UI_KIND.test(kind))) {
    return "ui-copy-candidate";
  }
  if (occurrences.some(({ kind }) => kind === "html-attribute:data-prompt") && /^[\w-]+$/.test(value)) {
    return "runtime-identifier";
  }
  if (occurrences.some(({ functionName }) => PROMPT_FUNCTION.test(functionName ?? ""))) {
    return "prompt-context-candidate";
  }
  const count = words(value);
  if (count <= 3) return "short-atom-candidate";
  if (count >= 16) return "prose-candidate";
  return "unresolved-candidate";
}

export function classifyForSemanticReview(literal) {
  const occurrences = literal.occurrences.filter(({ sourcePath, owners = [] }) =>
    !EXCLUDED_SOURCE.test(sourcePath) && !owners.includes(EXCLUDED_OWNER));
  if (occurrences.length === 0) return { disposition: "excluded-image-dna", occurrences };
  if (occurrences.every(({ kind }) => kind === "markdown-document")) {
    return { disposition: "context-document", occurrences };
  }
  const value = literal.value.trim();
  if (literal.classification === "context-only") return { disposition: "context-only", occurrences };
  if (TECHNICAL_TOKEN.test(value) || CODE_FRAGMENT.test(value)) return { disposition: "code-or-ui-noise", occurrences };
  if (literal.classification === "likely-prompt") return { disposition: "prompt-review", occurrences };
  if (value.length >= 24 && words(value) >= 4 && PROMPT_SIGNAL.test(value)) {
    return { disposition: "fragment-review", occurrences };
  }
  return { disposition: "manual-triage", occurrences };
}

function reviewItem(literal, classification) {
  const item = {
    id: literal.id,
    classification: literal.classification,
    reviewKind: classification.disposition,
    value: literal.value,
    occurrences: classification.occurrences.map(({ sourcePath, line, column, kind, functionName, owners }) => ({
      sourcePath, line, column, kind, functionName, owners
    }))
  };
  if (classification.disposition === "manual-triage") {
    item.triageKind = triageKind(literal, classification.occurrences);
  }
  return item;
}

function packetName(owner, index) {
  return `${owner.replace(/[^a-z0-9_-]+/gi, "-")}-${String(index + 1).padStart(2, "0")}.json`;
}

function focusedAstraBundles(packets, triagePackets) {
  const highConfidence = packets.flatMap(({ owner, prompts }) => prompts.map((prompt) => ({ ...prompt, owner })));
  const triage = triagePackets.flatMap(({ owner, prompts }) => prompts.map((prompt) => ({ ...prompt, owner })));
  return ASTRA_BUNDLE_DEFINITIONS.map((definition) => {
    const selectedHighConfidence = highConfidence.filter(({ owner }) => definition.owners.includes(owner));
    const selectedTriage = triage.filter(({ owner, triageKind }) =>
      definition.owners.includes(owner) && ASTRA_TRIAGE_KINDS.has(triageKind));
    const items = [...selectedHighConfidence, ...selectedTriage].sort((left, right) =>
      left.owner.localeCompare(right.owner) || left.id.localeCompare(right.id));
    const ids = items.map(({ id }) => id);
    if (new Set(ids).size !== ids.length) throw new Error(`Duplicate ID in Astra bundle ${definition.id}.`);
    return {
      schemaVersion: "1.0",
      id: definition.id,
      title: definition.title,
      owners: definition.owners,
      status: "pending-astra-review",
      policy: {
        preserveOriginalEnglish: true,
        noSilentNormalization: true,
        correctionsRequireReason: true,
        excludedTriageKinds: ["ui-copy-candidate", "runtime-identifier"]
      },
      highConfidenceCount: selectedHighConfidence.length,
      triageCount: selectedTriage.length,
      itemCount: items.length,
      approximateTokens: items.reduce((sum, item) => sum + Math.ceil(item.value.length / 4), 0),
      digestAlgorithm: "sha256",
      bundleDigest: computeReviewBundleDigest(items),
      items
    };
  });
}

export function buildSemanticReviewQueue(corpus, { packetTokenLimit = 10_000 } = {}) {
  if (!corpus || corpus.schemaVersion !== "1.0" || !Array.isArray(corpus.literals)) {
    throw new TypeError("Expected the Atlas prompt literal corpus schema 1.0.");
  }
  const dispositionCounts = {};
  const decisions = [];
  const pending = new Map();
  const triagePending = new Map();
  const seenReviewIds = new Set();
  for (const literal of corpus.literals) {
    const classification = classifyForSemanticReview(literal);
    dispositionCounts[classification.disposition] = (dispositionCounts[classification.disposition] ?? 0) + 1;
    decisions.push({
      id: literal.id,
      disposition: classification.disposition,
      owners: [...new Set(classification.occurrences.flatMap(({ owners = [] }) => owners))].sort(),
      sourcePaths: [...new Set(classification.occurrences.map(({ sourcePath }) => sourcePath))].sort(),
      occurrenceCount: classification.occurrences.length
    });
    if (classification.disposition === "manual-triage") {
      const item = reviewItem(literal, classification);
      const key = ownerKey(classification.occurrences);
      if (!triagePending.has(key)) triagePending.set(key, []);
      triagePending.get(key).push(item);
      continue;
    }
    if (!["prompt-review", "fragment-review"].includes(classification.disposition)) continue;
    const item = reviewItem(literal, classification);
    if (seenReviewIds.has(item.id)) throw new Error(`Duplicate semantic review ID ${item.id}.`);
    seenReviewIds.add(item.id);
    const key = ownerKey(classification.occurrences);
    if (key !== "shared-shell" && REVIEWED_OWNERS.has(key)) continue;
    if (!pending.has(key)) pending.set(key, []);
    pending.get(key).push(item);
  }

  const makePackets = (groups, { idPrefix, status }) => {
    const output = [];
    for (const [owner, items] of [...groups].sort(([left], [right]) => left.localeCompare(right))) {
    items.sort((left, right) => left.id.localeCompare(right.id));
    let current = [];
    let tokenCount = 0;
    const flush = () => {
      if (!current.length) return;
        const index = output.filter((packet) => packet.owner === owner).length;
        output.push({
        schemaVersion: "1.0",
          id: `${idPrefix}-${owner}-${String(index + 1).padStart(2, "0")}`,
        owner,
          status,
        approximateTokens: tokenCount,
        prompts: current
      });
      current = [];
      tokenCount = 0;
    };
    for (const item of items) {
      const itemTokens = Math.ceil(item.value.length / 4);
      if (current.length && tokenCount + itemTokens > packetTokenLimit) flush();
      current.push(item);
      tokenCount += itemTokens;
    }
    flush();
    }
    return output;
  };
  const packets = makePackets(pending, { idPrefix: "semantic", status: "pending-astra-review" });
  const triagePackets = makePackets(triagePending, {
    idPrefix: "triage",
    status: "pending-structural-triage"
  });

  const packetIds = packets.flatMap(({ prompts }) => prompts.map(({ id }) => id));
  if (new Set(packetIds).size !== packetIds.length) throw new Error("A prompt occurs in more than one semantic packet.");
  if (packets.some(({ prompts }) => prompts.some(({ occurrences }) => occurrences.some(({ sourcePath, owners = [] }) =>
    EXCLUDED_SOURCE.test(sourcePath) || owners.includes(EXCLUDED_OWNER))))) {
    throw new Error("Image DNA content reached the semantic review queue.");
  }
  if (decisions.length !== corpus.literals.length || new Set(decisions.map(({ id }) => id)).size !== decisions.length) {
    throw new Error("Every source literal must have exactly one semantic-review disposition.");
  }
  const ownerSummaries = [...new Set(packets.map(({ owner }) => owner))].sort().map((owner) => {
    const ownerPackets = packets.filter((packet) => packet.owner === owner);
    const prompts = ownerPackets.flatMap((packet) => packet.prompts);
    return {
      owner,
      packetCount: ownerPackets.length,
      promptCount: prompts.length,
      promptReviewCount: prompts.filter(({ reviewKind }) => reviewKind === "prompt-review").length,
      fragmentReviewCount: prompts.filter(({ reviewKind }) => reviewKind === "fragment-review").length,
      approximateTokens: ownerPackets.reduce((sum, packet) => sum + packet.approximateTokens, 0),
      sourcePaths: [...new Set(prompts.flatMap(({ occurrences }) => occurrences.map(({ sourcePath }) => sourcePath)))].sort()
    };
  });
  const triageKindCounts = {};
  for (const { prompts } of triagePackets) {
    for (const { triageKind: kind } of prompts) triageKindCounts[kind] = (triageKindCounts[kind] ?? 0) + 1;
  }
  const astraBundles = focusedAstraBundles(packets, triagePackets);
  return {
    packets,
    triagePackets,
    astraBundles,
    decisions,
    manifest: {
      schemaVersion: "1.0",
      sourceCreatedAt: corpus.createdAt,
      sourceLiteralCount: corpus.literals.length,
      dispositionCounts,
      reviewedOwnerIds: [...REVIEWED_OWNERS].sort(),
      excludedOwnerIds: [EXCLUDED_OWNER],
      packetCount: packets.length,
      queuedPromptCount: packetIds.length,
      approximateReviewTokens: packets.reduce((sum, packet) => sum + packet.approximateTokens, 0),
      owners: ownerSummaries.map(({ owner }) => owner),
      ownerSummaries,
      decisionIndex: "decision-index.json",
      triagePacketDirectory: "triage-packets",
      manualTriageCount: dispositionCounts["manual-triage"] ?? 0,
      manualTriagePacketCount: triagePackets.length,
      manualTriageApproximateTokens: triagePackets.reduce((sum, packet) => sum + packet.approximateTokens, 0),
      triageKindCounts,
      astraBundleDirectory: "astra-bundles",
      astraBundles: astraBundles.map(({ id, title, owners, itemCount, approximateTokens }) => ({
        id, title, owners, itemCount, approximateTokens, file: `${id}.json`
      })),
      manualTriageStatus: "quarantined-for-structural-triage"
    }
  };
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function prepareSemanticReview({ corpusPath, outputDirectory, packetTokenLimit } = {}) {
  const corpus = JSON.parse(await readFile(corpusPath, "utf8"));
  const result = buildSemanticReviewQueue(corpus, { packetTokenLimit });
  const resolved = path.resolve(outputDirectory);
  if (path.basename(resolved) !== "semantic-review" || path.dirname(resolved) === resolved) {
    throw new Error("Refusing to replace an unexpected semantic review directory.");
  }
  // Review files are human/model decisions, not generated artifacts. Keep them
  // across corpus rebuilds and replace only the reproducible queue outputs.
  await Promise.all([
    rm(path.join(resolved, "packets"), { recursive: true, force: true }),
    rm(path.join(resolved, "triage-packets"), { recursive: true, force: true }),
    rm(path.join(resolved, "astra-bundles"), { recursive: true, force: true }),
    rm(path.join(resolved, "decision-index.json"), { force: true }),
    rm(path.join(resolved, "manifest.json"), { force: true })
  ]);
  await mkdir(path.join(resolved, "packets"), { recursive: true });
  await mkdir(path.join(resolved, "triage-packets"), { recursive: true });
  await mkdir(path.join(resolved, "astra-bundles"), { recursive: true });
  const ownerIndexes = new Map();
  for (const packet of result.packets) {
    const index = ownerIndexes.get(packet.owner) ?? 0;
    ownerIndexes.set(packet.owner, index + 1);
    const fileName = packetName(packet.owner, index);
    await writeJson(path.join(resolved, "packets", fileName), packet);
  }
  const triageOwnerIndexes = new Map();
  for (const packet of result.triagePackets) {
    const index = triageOwnerIndexes.get(packet.owner) ?? 0;
    triageOwnerIndexes.set(packet.owner, index + 1);
    const fileName = packetName(packet.owner, index);
    await writeJson(path.join(resolved, "triage-packets", fileName), packet);
  }
  for (const bundle of result.astraBundles) {
    await writeJson(path.join(resolved, "astra-bundles", `${bundle.id}.json`), bundle);
  }
  await writeJson(path.join(resolved, "decision-index.json"), {
    schemaVersion: "1.0",
    sourceCreatedAt: result.manifest.sourceCreatedAt,
    decisions: result.decisions
  });
  await writeJson(path.join(resolved, "manifest.json"), result.manifest);
  return result;
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const result = await prepareSemanticReview({
    corpusPath: path.join(here, "atlas-v5", "prompt-literals.json"),
    outputDirectory: path.join(here, "atlas-v5", "semantic-review")
  });
  console.log(JSON.stringify(result.manifest, null, 2));
}
