import test from "node:test";
import assert from "node:assert/strict";

import {
  HeyGenClient,
  heygenCatalog,
  resultFromHeyGen,
  statusFromHeyGen
} from "../installer/payload/aggregator/app/src/providers/heygen.js";
import { createGenerationPreview } from
  "../installer/payload/aggregator/app/src/generation-plan.js";

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

test("the packaged Aggregator exposes every HeyGen Video 1 mode", () => {
  const models = heygenCatalog();
  assert.deepEqual(models.map((model) => model.mode), [
    "text_to_video", "image_to_video", "reference_to_video"
  ]);
  assert.equal(models.every((model) => model.provider === "heygen"), true);
});

test("the packaged plan maps local references and conservative pricing", () => {
  const model = heygenCatalog()[2];
  const preview = createGenerationPreview({
    mediaType: "video",
    prompt: "@image1 speaks with @image2",
    references: [
      { kind: "image", url: "/api/resources/12345678-1234-1234-1234-123456789abc/content" },
      { kind: "image", url: "https://example.com/second.jpg" }
    ],
    settings: {
      aspectRatio: "16:9",
      durationSeconds: 10,
      resolution: "768p",
      promptExpansionMode: "quality"
    }
  }, model);

  assert.equal(preview.provider, "heygen");
  assert.equal(preview.providerInput.prompt, "<Picture 1> speaks with <Picture 2>");
  assert.equal(preview.providerInput.reference_images.length, 2);
  assert.equal(preview.estimatedCost, 0.3);
  assert.equal(preview.canSubmit, true);
});

test("the packaged client authenticates, submits and normalizes results", async () => {
  const calls = [];
  const client = new HeyGenClient(async (url, options) => {
    calls.push({ url, options });
    return response({ data: { video_id: "video_123456", status: "completed",
      video_url: "https://files.heygen.com/result.mp4" } });
  });
  const submitted = await client.submit("server-secret", {
    model: "heygen-video-1", mode: "text_to_video", prompt: "A dialogue"
  }, "local-id");
  const retrieved = await client.retrieve("server-secret", submitted.data.video_id);

  assert.equal(calls[0].options.headers["X-Api-Key"], "server-secret");
  assert.equal(calls[0].options.headers["Idempotency-Key"], "local-id");
  assert.equal(statusFromHeyGen(retrieved), "completed");
  assert.equal(resultFromHeyGen(retrieved).video.url,
    "https://files.heygen.com/result.mp4");
});
