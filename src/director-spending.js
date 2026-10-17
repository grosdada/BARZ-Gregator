const directorEndpointId = "minimax/h3-max/director";
const directorMinimumCost = 1.2;
const directorFallbackRate = 0.02;

function finiteNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function isoDate(value, fallback) {
  const date = new Date(value || "");
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function directorResource(resource) {
  return resource?.mediaType === "video" &&
    /^h3-max-director-\d{4}-\d{2}-\d{2}T/i.test(resource.name || "");
}

export function directorSessionCost(durationSeconds, resolution = "720p", unitPrice = null) {
  const duration = Math.max(0, finiteNumber(durationSeconds, 0));
  const rate = Math.max(0, finiteNumber(unitPrice, directorFallbackRate));
  const multiplier = String(resolution).toLowerCase() === "1080p" ? 2 : 1;
  return Number(Math.max(directorMinimumCost, duration * rate * multiplier).toFixed(6));
}

export function createDirectorSessionJob(resource, details = {}) {
  if (!directorResource(resource)) {
    throw new TypeError("La ressource ne correspond pas à un enregistrement Director.");
  }
  const completedAt = isoDate(details.completedAt, resource.createdAt);
  const durationSeconds = Math.max(0, finiteNumber(details.durationSeconds, 60));
  const startedFallback = new Date(
    new Date(completedAt).getTime() - durationSeconds * 1000
  ).toISOString();
  const startedAt = isoDate(details.startedAt, startedFallback);
  const resolution = ["720p", "1080p"].includes(details.resolution)
    ? details.resolution
    : "720p";
  const unitPrice = Math.max(0, finiteNumber(details.unitPrice, directorFallbackRate));
  const estimatedCost = directorSessionCost(durationSeconds, resolution, unitPrice);
  const prompt = typeof details.prompt === "string" ? details.prompt.trim().slice(0, 20_000) : "";
  const cues = Array.isArray(details.cues)
    ? details.cues.filter((cue) => typeof cue === "string").slice(0, 20)
    : [];

  return {
    id: resource.id,
    jobType: "director-session",
    resourceId: resource.id,
    provider: "fal",
    endpointId: directorEndpointId,
    displayName: "H3 Max Director",
    mediaType: "video",
    status: "completed",
    providerInput: {
      prompt,
      cues,
      resolution,
      aspect_ratio: details.aspectRatio || "16:9",
      duration_seconds: Number(durationSeconds.toFixed(3))
    },
    pricing: { unitPrice, unit: "second", currency: "USD" },
    estimatedUnits: Number(durationSeconds.toFixed(3)),
    estimatedCost,
    currency: "USD",
    createdAt: startedAt,
    updatedAt: completedAt,
    submittedAt: startedAt,
    completedAt,
    requestId: null,
    providerProgress: 100,
    result: {
      video: {
        url: `/api/resources/${resource.id}/content`,
        content_type: resource.contentType || "video/webm"
      }
    },
    metrics: { inference_time: Number(durationSeconds.toFixed(3)) },
    error: null,
    backfilled: details.backfilled === true
  };
}

export function backfillDirectorJobs(jobs = [], resources = []) {
  const existingResourceIds = new Set(jobs.map((job) => job.resourceId).filter(Boolean));
  const existingJobIds = new Set(jobs.map((job) => job.id));
  const additions = resources
    .filter(directorResource)
    .filter((resource) => !existingResourceIds.has(resource.id) && !existingJobIds.has(resource.id))
    .map((resource) => createDirectorSessionJob(resource, { backfilled: true }));
  return [...jobs, ...additions].sort((left, right) => (
    new Date(right.createdAt) - new Date(left.createdAt)
  ));
}
