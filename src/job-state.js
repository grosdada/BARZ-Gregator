import { createGenerationPreview } from "./generation-plan.js";

const transitions = new Map([
  ["awaiting_confirmation", new Set(["submitting", "cancelled"])],
  ["submitting", new Set(["submitted", "awaiting_confirmation", "failed"])],
  ["submitted", new Set(["queued", "running", "completed", "failed", "cancelled"])],
  ["queued", new Set(["running", "completed", "failed", "cancelled"])],
  ["running", new Set(["completed", "failed", "cancelled"])],
  ["completed", new Set()],
  ["failed", new Set()],
  ["cancelled", new Set()]
]);

export function createPreparedJob(preview, id, now = new Date()) {
  if (!preview?.submissionLocked) {
    throw new TypeError("Un job doit provenir d’un aperçu verrouillé.");
  }
  return {
    id,
    provider: preview.provider,
    endpointId: preview.endpointId,
    displayName: preview.displayName,
    mediaType: preview.mediaType,
    status: "awaiting_confirmation",
    providerInput: structuredClone(preview.providerInput),
    generationDraft: structuredClone(preview.generationDraft),
    validationErrors: structuredClone(preview.validationErrors || []),
    references: structuredClone(preview.references || []),
    missingRequired: structuredClone(preview.missingRequired),
    pricing: structuredClone(preview.pricing),
    estimatedUnits: preview.estimatedUnits,
    estimatedCost: preview.estimatedCost,
    currency: preview.currency,
    warnings: structuredClone(preview.warnings),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    submittedAt: null,
    completedAt: null,
    requestId: null,
    providerProgress: null,
    result: null,
    error: null
  };
}

export function refreshedEstimate(job, model) {
  if (job.generationDraft) {
    if (job.currency !== model.pricing?.currency) return null;
    const preview = createGenerationPreview(job.generationDraft, model);
    return preview.canSubmit ? preview.estimatedCost : null;
  }
  const previousUnit = String(job?.pricing?.unit || "");
  const currentUnit = String(model?.pricing?.unit || "");
  const previousCurrency = String(job?.currency || "");
  const currentCurrency = String(model?.pricing?.currency || "");
  const resolution = job?.providerInput?.resolution;
  const tierPrice = model?.pricing?.tiersByResolution?.[resolution];
  const unitPrice = Number(tierPrice === undefined ? model?.pricing?.unitPrice : tierPrice);
  const units = Number(job?.estimatedUnits);

  if (
    !previousUnit || previousUnit !== currentUnit ||
    !previousCurrency || previousCurrency !== currentCurrency ||
    !Number.isFinite(unitPrice) || !Number.isFinite(units)
  ) return null;

  return Number((unitPrice * units).toFixed(6));
}

export function transitionJob(job, nextStatus, patch = {}, now = new Date()) {
  const allowed = transitions.get(job?.status);
  if (!allowed?.has(nextStatus)) {
    throw new TypeError(`Transition de job interdite : ${job?.status} → ${nextStatus}.`);
  }
  const timestamp = now.toISOString();
  return {
    ...job,
    ...patch,
    id: job.id,
    status: nextStatus,
    updatedAt: timestamp,
    submittedAt: nextStatus === "submitted" && !job.submittedAt
      ? timestamp
      : job.submittedAt || null,
    completedAt: nextStatus === "completed" ? timestamp : job.completedAt || null
  };
}

export function statusFromFal(payload) {
  const status = String(payload?.status || "").toUpperCase();
  if (status === "IN_QUEUE") return "queued";
  if (status === "IN_PROGRESS") return "running";
  if (status === "COMPLETED" && payload.error) return "failed";
  if (status === "COMPLETED") return "completed";
  return null;
}

function boundedPercent(value, fraction = false) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  const percent = fraction && numeric >= 0 && numeric <= 1 ? numeric * 100 : numeric;
  return Math.min(100, Math.max(0, Math.round(percent)));
}

export function progressFromFal(payload) {
  const directCandidates = [
    payload?.progress_percent,
    payload?.progressPercentage,
    payload?.percentage,
    payload?.metrics?.progress_percent,
    payload?.metrics?.percentage
  ];
  for (const candidate of directCandidates) {
    const percent = boundedPercent(candidate);
    if (percent !== null) return percent;
  }

  const fractionCandidates = [payload?.progress, payload?.metrics?.progress];
  for (const candidate of fractionCandidates) {
    const percent = boundedPercent(candidate, true);
    if (percent !== null) return percent;
  }

  const logs = Array.isArray(payload?.logs) ? payload.logs : [];
  for (const log of logs.toReversed()) {
    const match = String(log?.message || log).match(/(\d{1,3}(?:[.,]\d+)?)\s*%/);
    if (!match) continue;
    const percent = boundedPercent(match[1].replace(",", "."));
    if (percent !== null) return percent;
  }
  return null;
}
