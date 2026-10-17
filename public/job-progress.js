function median(values) {
  if (!values.length) return null;
  const sorted = values.toSorted((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function expectedRuntimeSeconds(job, jobs) {
  const previousRuns = jobs
    .filter((candidate) => (
      candidate.id !== job.id &&
      candidate.endpointId === job.endpointId &&
      candidate.status === "completed"
    ))
    .map((candidate) => Number(candidate.metrics?.inference_time))
    .filter((value) => Number.isFinite(value) && value > 0);
  return median(previousRuns) || ({ image: 20, video: 150, music: 90 })[job.mediaType] || 60;
}

const activeStatuses = new Set(["submitting", "submitted", "queued", "running"]);

export function jobForMonitor(jobs = [], preferredId = null) {
  const generationJobs = jobs.filter((job) => (
    job?.jobType !== "director-session" && job?.status !== "awaiting_confirmation"
  ));
  const preferred = generationJobs.find((job) => job.id === preferredId);
  if (preferred && activeStatuses.has(preferred.status)) return preferred;
  return generationJobs.find((job) => activeStatuses.has(job.status)) || preferred || generationJobs[0] || null;
}

export function progressForJob(job, jobs = [], now = Date.now()) {
  if (!job) return null;
  if (job.status === "completed") return { value: 100, estimated: false };
  if (["failed", "cancelled", "awaiting_confirmation"].includes(job.status)) return null;

  const providerProgress = Number(job.providerProgress);
  if (Number.isFinite(providerProgress) && providerProgress >= 0) {
    return {
      value: Math.min(99, Math.round(providerProgress)),
      estimated: false
    };
  }

  if (job.status === "submitting") return { value: 4, estimated: true };
  if (job.status === "submitted") return { value: 8, estimated: true };
  if (job.status === "queued") return { value: 15, estimated: true };
  if (job.status !== "running") return null;

  const startedAt = Date.parse(job.updatedAt);
  const elapsedSeconds = Number.isFinite(startedAt)
    ? Math.max(0, now - startedAt) / 1000
    : 0;
  const expectedSeconds = expectedRuntimeSeconds(job, jobs);
  const value = 30 + (elapsedSeconds / expectedSeconds) * 65;
  return { value: Math.min(95, Math.max(30, Math.round(value))), estimated: true };
}

export function generationTimeLabel(job) {
  const seconds = Number(job?.metrics?.inference_time ?? job?.result?.timings?.inference);
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  if (seconds < 1) return `${Math.round(seconds * 1000)} ms`;
  if (seconds < 60) {
    return `${seconds.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} s`;
  }

  const roundedSeconds = Math.round(seconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const remainder = roundedSeconds % 60;
  return remainder ? `${minutes} min ${remainder} s` : `${minutes} min`;
}
