import test from "node:test";
import assert from "node:assert/strict";

import { generationTimeLabel, jobForMonitor, progressForJob } from "../public/job-progress.js";

test("uses provider progress when fal exposes it", () => {
  assert.deepEqual(progressForJob({ status: "running", providerProgress: 47 }), {
    value: 47,
    estimated: false
  });
});

test("shows clear phase estimates and completion", () => {
  assert.deepEqual(progressForJob({ status: "queued" }), { value: 15, estimated: true });
  assert.deepEqual(progressForJob({ status: "completed" }), {
    value: 100,
    estimated: false
  });
});

test("estimates active progress from historical runtime", () => {
  const now = Date.parse("2026-09-10T12:01:00Z");
  const job = {
    id: "current",
    endpointId: "fal/example",
    mediaType: "video",
    status: "running",
    updatedAt: "2026-09-10T12:00:00Z"
  };
  const history = [{
    id: "previous",
    endpointId: "fal/example",
    status: "completed",
    metrics: { inference_time: 120 }
  }];
  assert.deepEqual(progressForJob(job, history, now), { value: 63, estimated: true });
});

test("formats fal inference time for generation details", () => {
  assert.equal(generationTimeLabel({ metrics: { inference_time: 10.39 } }), "10,4 s");
  assert.equal(generationTimeLabel({ metrics: { inference_time: 140.659 } }), "2 min 21 s");
  assert.equal(generationTimeLabel({ result: { timings: { inference: 0.42 } } }), "420 ms");
  assert.equal(generationTimeLabel({}), null);
});

test("keeps the submitted render visible, then falls back to the active or latest render", () => {
  const jobs = [
    { id: "latest", status: "completed" },
    { id: "active", status: "running" },
    { id: "prepared", status: "awaiting_confirmation" },
    { id: "director", status: "running", jobType: "director-session" }
  ];
  assert.equal(jobForMonitor(jobs, "latest")?.id, "active");
  assert.equal(jobForMonitor(jobs, "active")?.id, "active");
  assert.equal(jobForMonitor(jobs)?.id, "active");
  assert.equal(jobForMonitor([{ id: "latest", status: "completed" }])?.id, "latest");
  assert.equal(jobForMonitor([{ id: "prepared", status: "awaiting_confirmation" }]), null);
});
