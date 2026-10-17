import test from "node:test";
import assert from "node:assert/strict";

import {
  captureFilename,
  formatGrabberTime,
  frameNumberAtTime,
  isSupportedVideoFile
} from "../apps/atlas/public/image-grabber.js";

test("A15 Image Grabber formats duration and frame metadata deterministically", () => {
  assert.equal(formatGrabberTime(0), "00:00.000");
  assert.equal(formatGrabberTime(61.234), "01:01.234");
  assert.equal(frameNumberAtTime(1, 30), 31);
  assert.equal(frameNumberAtTime(1.999, 25), 50);
});

test("A15 Image Grabber accepts local video extensions even when Windows omits the MIME type", () => {
  assert.equal(isSupportedVideoFile({ name: "rush.MP4", type: "" }), true);
  assert.equal(isSupportedVideoFile({ name: "rush.webm", type: "application/octet-stream" }), true);
  assert.equal(isSupportedVideoFile({ name: "notes.txt", type: "text/plain" }), false);
});

test("A15 Image Grabber builds portable capture filenames", () => {
  assert.equal(captureFilename("Rush / prise 01.mov", 1.4, 30, "jpeg"), "Rush-prise-01_frame-000043.jpg");
  assert.equal(captureFilename("", 0, 30, "png"), "video_frame-000001.png");
  assert.equal(captureFilename("été.webm", 0.24, 25, "webp"), "ete_frame-000007.webp");
});
