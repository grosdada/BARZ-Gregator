import test from "node:test";
import assert from "node:assert/strict";

import {
  HeyGenClient,
  heygenCatalog,
  resultFromHeyGen,
  statusFromHeyGen
} from "../src/providers/heygen.js";
import { createGenerationPreview, deriveModelControls } from "../src/generation-plan.js";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

test("authenticates HeyGen requests server-side and reads the account", async () => {
  const calls = [];
  const client = new HeyGenClient(async (url, options) => {
    calls.push({ url, options });
    return jsonResponse({ data: { username: "barz", plan: "pay_as_you_go" } });
  });

  const account = await client.account("heygen-secret");
  assert.equal(account.data.username, "barz");
  assert.equal(calls[0].url, "https://api.heygen.com/v3/users/me");
  assert.equal(calls[0].options.headers["X-Api-Key"], "heygen-secret");
});

test("submits and retrieves HeyGen Video 1 jobs", async () => {
  const calls = [];
  const client = new HeyGenClient(async (url, options) => {
    calls.push({ url, options });
    return url.endsWith("/v3/models/videos")
      ? jsonResponse({ data: { video_id: "video_123456" } })
      : jsonResponse({ data: { video_id: "video_123456", status: "completed",
        video_url: "https://files.heygen.com/video.mp4" } });
  });
  const input = { model: "heygen-video-1", mode: "text_to_video", prompt: "Hello" };

  const submission = await client.submit("secret", input, "local-job-id");
  const result = await client.retrieve("secret", submission.data.video_id);

  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.headers["Idempotency-Key"], "local-job-id");
  assert.deepEqual(JSON.parse(calls[0].options.body), input);
  assert.equal(calls[1].url, "https://api.heygen.com/v3/models/videos/video_123456");
  assert.equal(statusFromHeyGen(result), "completed");
  assert.equal(resultFromHeyGen(result).video.url, "https://files.heygen.com/video.mp4");
});

test("uploads compatible local HeyGen image, audio, and video references", async () => {
  const calls = [];
  const client = new HeyGenClient(async (url, options) => {
    calls.push({ url, options });
    return jsonResponse({ data: { asset_id: "ast_reference_123" } });
  });

  const assetId = await client.uploadAsset("secret", {
    data: Buffer.from([0xff, 0xd8, 0xff]),
    contentType: "image/jpeg",
    name: "reference.jpg"
  });

  assert.equal(assetId, "ast_reference_123");
  assert.equal(calls[0].url, "https://api.heygen.com/v3/assets");
  assert.equal(calls[0].options.headers["X-Api-Key"], "secret");
  assert.equal(calls[0].options.body instanceof FormData, true);
  await client.uploadAsset("secret", {
    data: Buffer.from([0x52, 0x49, 0x46, 0x46]),
    contentType: "audio/wav",
    name: "voice.wav"
  });
  await client.uploadAsset("secret", {
    data: Buffer.from([0x00, 0x00, 0x00, 0x18]),
    contentType: "video/mp4",
    name: "gesture.mp4"
  });
  await assert.rejects(() => client.uploadAsset("secret", {
    data: Buffer.from([1]), contentType: "image/webp", name: "reference.webp"
  }), /image PNG\/JPG/);
});

test("accepts HeyGen asset identifiers without the legacy ast prefix", async () => {
  const client = new HeyGenClient(async () => jsonResponse({
    data: { asset_id: "9ef6d8b1c3ed495286b8d592b1b07f48" }
  }));

  const assetId = await client.uploadAsset("secret", {
    data: Buffer.from([0xff, 0xd8, 0xff]),
    contentType: "image/jpeg",
    name: "reference.jpg"
  });

  assert.equal(assetId, "9ef6d8b1c3ed495286b8d592b1b07f48");
});

test("surfaces HeyGen authorization errors without leaking credentials", async () => {
  const client = new HeyGenClient(async () => jsonResponse({
    error: { message: "Invalid API key" }
  }, 401));

  await assert.rejects(
    () => client.account("never-print-this"),
    (error) => error.remoteStatus === 401 && /Invalid API key/.test(error.message) &&
      !error.message.includes("never-print-this")
  );
});

test("builds HeyGen text, image, and reference generation plans", () => {
  const [textModel, imageModel, referenceModel] = heygenCatalog();
  const baseDraft = {
    mediaType: "video",
    prompt: "Two actors exchange a line on a quiet set",
    references: [],
    settings: {
      aspectRatio: "16:9",
      durationSeconds: 10,
      resolution: "768p",
      promptExpansionMode: "quality",
      seed: 42
    }
  };
  const text = createGenerationPreview(baseDraft, textModel);
  assert.deepEqual(text.providerInput, {
    prompt: baseDraft.prompt,
    aspect_ratio: "16:9",
    duration: 10,
    resolution: "768p",
    seed: 42,
    prompt_enhancement: "quality",
    model: "heygen-video-1",
    mode: "text_to_video"
  });
  assert.equal(text.estimatedCost, 0.3);
  assert.equal(text.canSubmit, true);

  const reference = { kind: "image", url: "/api/resources/12345678-1234-1234-1234-123456789abc/content" };
  const image = createGenerationPreview({ ...baseDraft, references: [reference] }, imageModel);
  assert.deepEqual(image.providerInput.image, { type: "url", url: reference.url });
  assert.equal("aspect_ratio" in image.providerInput, false);
  assert.equal(image.canSubmit, true);

  const multi = createGenerationPreview({
    ...baseDraft,
    prompt: "<Picture 1> and @image2 speak together",
    references: [reference, { kind: "image", url: "https://example.com/two.jpg" }]
  }, referenceModel);
  assert.equal(multi.providerInput.prompt, "<Picture 1> and <Picture 2> speak together");
  assert.equal(multi.providerInput.reference_images.length, 2);
  const controls = deriveModelControls(referenceModel.inputSchema, referenceModel.endpointId);
  assert.equal(controls.maxReferences, 12);
  assert.deepEqual(controls.referenceKinds, ["image", "audio", "video"]);
});

test("quotes HeyGen 2K and maps mixed reference media", () => {
  const referenceModel = heygenCatalog()[2];
  const draft = {
    mediaType: "video",
    prompt: "@image1 watches @video1 while @audio1 sets the rhythm",
    references: [
      { kind: "image", url: "https://example.com/portrait.jpg" },
      { kind: "video", url: "https://example.com/gesture.mp4" },
      { kind: "audio", url: "https://example.com/voice.wav" }
    ],
    settings: {
      aspectRatio: "16:9",
      durationSeconds: 10,
      resolution: "2k"
    }
  };

  const preview = createGenerationPreview(draft, referenceModel);
  assert.equal(preview.providerInput.prompt,
    "<Picture 1> watches <Video 1> while <Audio 1> sets the rhythm");
  assert.deepEqual(preview.providerInput.reference_videos, [{
    type: "url", url: "https://example.com/gesture.mp4"
  }]);
  assert.deepEqual(preview.providerInput.reference_audio, [{
    type: "url", url: "https://example.com/voice.wav"
  }]);
  assert.equal(preview.estimatedCost, 0.9);
  assert.equal(preview.canSubmit, true);

  const invalidRatio = createGenerationPreview({
    ...draft,
    settings: { ...draft.settings, aspectRatio: "1:1" }
  }, referenceModel);
  assert.equal(invalidRatio.canSubmit, false);
  assert.match(invalidRatio.validationErrors.join(" "), /2K.*16:9.*9:16/);
});

test("maps every documented HeyGen terminal and active status", () => {
  assert.equal(statusFromHeyGen({ data: { status: "pending" } }), "queued");
  assert.equal(statusFromHeyGen({ data: { status: "processing" } }), "running");
  assert.equal(statusFromHeyGen({ data: { status: "failed" } }), "failed");
  assert.equal(statusFromHeyGen({ data: { status: "cancelled" } }), "cancelled");
  assert.equal(statusFromHeyGen({ data: { status: "unknown" } }), null);
});
