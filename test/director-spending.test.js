import test from "node:test";
import assert from "node:assert/strict";

import {
  backfillDirectorJobs,
  createDirectorSessionJob,
  directorSessionCost
} from "../src/director-spending.js";

const resource = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "h3-max-director-2026-09-10T20-31-48-218Z",
  mediaType: "video",
  contentType: "video/webm",
  createdAt: "2026-09-10T20:31:48.289Z"
};

test("applies the Director minimum and the 1080p multiplier", () => {
  assert.equal(directorSessionCost(10, "720p", 0.02), 1.2);
  assert.equal(directorSessionCost(80, "720p", 0.02), 1.6);
  assert.equal(directorSessionCost(80, "1080p", 0.02), 3.2);
});

test("creates a completed Director spending job linked to its local recording", () => {
  const job = createDirectorSessionJob(resource, {
    durationSeconds: 61.25,
    resolution: "720p",
    prompt: "A continuous scene"
  });
  assert.equal(job.status, "completed");
  assert.equal(job.jobType, "director-session");
  assert.equal(job.resourceId, resource.id);
  assert.equal(job.estimatedCost, 1.225);
  assert.equal(job.metrics.inference_time, 61.25);
  assert.equal(job.result.video.url, `/api/resources/${resource.id}/content`);
});

test("backfills each legacy Director recording only once", () => {
  const first = backfillDirectorJobs([], [resource]);
  const second = backfillDirectorJobs(first, [resource]);
  assert.equal(first.length, 1);
  assert.equal(second.length, 1);
  assert.equal(second[0].estimatedCost, 1.2);
  assert.equal(second[0].backfilled, true);
});
