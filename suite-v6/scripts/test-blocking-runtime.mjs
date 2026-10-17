import { readFile } from "node:fs/promises";
import path from "node:path";

import { solverAutoblock } from "../apps/atlas/blocking-engine-v5.js";

const imagePath = process.argv[2];
if (!imagePath) {
  throw new Error("Usage: node scripts/test-blocking-runtime.mjs <image.jpg|png>");
}

const startedAt = Date.now();
const image = await readFile(path.resolve(imagePath));
const result = await solverAutoblock({ image: image.toString("base64"), maxObjects: 6, threshold: 0.3 });
const summary = {
  ok: result.ok,
  status: result.status,
  elapsedMs: Date.now() - startedAt,
  objectCount: result.body?.scene?.objects?.length ?? 0,
  camera: result.body?.scene?.camera ?? null,
  labels: result.body?.scene?.objects?.map(({ label, type }) => ({ label, type })) ?? [],
  engine: result.body?.meta ? {
    detections: result.body.meta.detections,
    kept: result.body.meta.kept,
    geometryMs: result.body.meta.geometryMs,
    detectMs: result.body.meta.detectMs
  } : null,
  error: result.body?.error ?? null
};

console.log(JSON.stringify(summary, null, 2));
if (!result.ok) process.exitCode = 1;
