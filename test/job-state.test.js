import test from "node:test";
import assert from "node:assert/strict";

import {
  createPreparedJob,
  progressFromFal,
  refreshedEstimate,
  statusFromFal,
  transitionJob
} from "../src/job-state.js";

const preview = {
  provider: "fal",
  endpointId: "fal-ai/example",
  displayName: "Example",
  mediaType: "image",
  providerInput: { prompt: "Studio product shot" },
  missingRequired: [],
  pricing: { unitPrice: 0.03, unit: "image", currency: "USD" },
  estimatedUnits: 1,
  estimatedCost: 0.03,
  currency: "USD",
  warnings: [],
  submissionLocked: true
};

test("creates jobs in a confirmation gate", () => {
  const job = createPreparedJob(preview, "job-1", new Date("2026-09-09T12:00:00Z"));
  assert.equal(job.status, "awaiting_confirmation");
  assert.equal(job.requestId, null);
});

test("allows only explicit lifecycle transitions", () => {
  const job = createPreparedJob(preview, "job-1");
  const submitting = transitionJob(job, "submitting");
  const submittedAt = new Date("2026-09-09T12:01:00Z");
  const submitted = transitionJob(
    submitting,
    "submitted",
    { requestId: "request-1" },
    submittedAt
  );
  assert.equal(submitted.requestId, "request-1");
  assert.equal(submitted.submittedAt, submittedAt.toISOString());
  assert.throws(() => transitionJob(submitted, "awaiting_confirmation"), /interdite/);
});

test("records the completion time used by the spending calendar", () => {
  const job = createPreparedJob(preview, "job-1");
  const submitted = transitionJob(transitionJob(job, "submitting"), "submitted");
  const completedAt = new Date("2026-09-09T12:02:03Z");
  const completed = transitionJob(submitted, "completed", {}, completedAt);
  assert.equal(completed.completedAt, completedAt.toISOString());
  assert.equal(completed.submittedAt, submitted.submittedAt);
});

test("recalculates a comparable verified price", () => {
  const job = createPreparedJob(preview, "job-1");
  assert.equal(refreshedEstimate(job, {
    pricing: { unitPrice: 0.04, unit: "image", currency: "USD" }
  }), 0.04);
  assert.equal(refreshedEstimate(job, {
    pricing: { unitPrice: 0.04, unit: "second", currency: "USD" }
  }), null);
});

test("maps fal queue states to local states", () => {
  assert.equal(statusFromFal({ status: "IN_QUEUE" }), "queued");
  assert.equal(statusFromFal({ status: "IN_PROGRESS" }), "running");
  assert.equal(statusFromFal({ status: "COMPLETED" }), "completed");
  assert.equal(statusFromFal({ status: "COMPLETED", error: "failed" }), "failed");
  assert.equal(statusFromFal({ status: "UNKNOWN" }), null);
});

test("extracts provider progress from fields and logs", () => {
  assert.equal(progressFromFal({ progress: 0.42 }), 42);
  assert.equal(progressFromFal({ progress_percent: 64.4 }), 64);
  assert.equal(progressFromFal({ logs: [{ message: "Rendering 78%" }] }), 78);
  assert.equal(progressFromFal({ status: "IN_PROGRESS" }), null);
});
