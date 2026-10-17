import test from "node:test";
import assert from "node:assert/strict";

import { FalClient } from "../src/providers/fal.js";

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

test("reads fal account credits without exposing the key", async () => {
  const calls = [];
  const client = new FalClient(async (url, options) => {
    calls.push({ url, authorization: options.headers.Authorization });
    return response({
      username: "barz",
      credits: { current_balance: 12.5, currency: "USD" }
    });
  });

  const account = await client.account("secret-key");
  assert.equal(account.credits.current_balance, 12.5);
  assert.equal(calls[0].authorization, "Key secret-key");
});

test("verifies exact model metadata and pricing", async () => {
  const client = new FalClient(async (url) => {
    if (url.includes("/models/pricing")) {
      return response({
        prices: [{
          endpoint_id: "fal-ai/test/image-to-video",
          unit_price: 0.08,
          unit: "second",
          currency: "USD"
        }]
      });
    }
    return response({
      models: [{
        endpoint_id: "fal-ai/test/image-to-video",
        metadata: {
          display_name: "Verified Video",
          category: "image-to-video",
          status: "active"
        },
        openapi: { openapi: "3.0.0" }
      }]
    });
  });

  const model = await client.verifyModel("secret", "fal-ai/test/image-to-video");
  assert.equal(model.mediaType, "video");
  assert.equal(model.pricing.unitPrice, 0.08);
  assert.equal(model.inputSchema.openapi, "3.0.0");
});

test("rejects malformed model identifiers before network access", async () => {
  const client = new FalClient(() => {
    throw new Error("Network should not be called");
  });
  await assert.rejects(() => client.verifyModel("secret", "../bad id"), /format valide/);
});

test("keeps the fal response status on authorization errors", async () => {
  const client = new FalClient(async () => response({
    error: { type: "permission_error", message: "Missing account scope" }
  }, 403));

  await assert.rejects(
    () => client.account("limited-key"),
    (error) => error.remoteStatus === 403 && /Missing account scope/.test(error.message)
  );
});

test("surfaces fal validation messages", async () => {
  const client = new FalClient(async () => response({
    detail: [{ msg: "Request lookup is invalid" }]
  }, 422));

  await assert.rejects(
    () => client.queueStatus("secret", "fal-ai/test", "request-12345678"),
    /Request lookup is invalid/
  );
});

test("prepares fal queue submissions with server-side authentication", async () => {
  const calls = [];
  const client = new FalClient(async (url, options) => {
    calls.push({ url, options });
    return response({ request_id: "request-12345678" });
  });

  const result = await client.submit(
    "server-secret",
    "fal-ai/test/text-to-video",
    { prompt: "A quiet workshop" }
  );

  assert.equal(result.request_id, "request-12345678");
  assert.equal(calls[0].url, "https://queue.fal.run/fal-ai/test/text-to-video");
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.headers.Authorization, "Key server-secret");
  assert.equal(calls[0].options.headers["X-Fal-Store-IO"], "0");
  assert.deepEqual(JSON.parse(calls[0].options.body), { prompt: "A quiet workshop" });
});

test("builds scoped fal queue status and result URLs", async () => {
  const calls = [];
  const client = new FalClient(async (url) => {
    calls.push(url);
    return response({ status: "IN_QUEUE" });
  });

  await client.queueStatus("secret", "fal-ai/test/text-to-video", "request-12345678");
  await client.queueResult("secret", "fal-ai/test/text-to-video", "request-12345678");

  assert.equal(
    calls[0],
    "https://queue.fal.run/fal-ai/test/text-to-video/requests/request-12345678/status"
  );
  assert.equal(
    calls[1],
    "https://queue.fal.run/fal-ai/test/text-to-video/requests/request-12345678/response"
  );
});

test("accepts only canonical fal queue URLs returned by submission", async () => {
  const calls = [];
  const client = new FalClient(async (url) => {
    calls.push(url);
    return response({ status: "COMPLETED" });
  });

  await client.queueUrl(
    "secret",
    "https://queue.fal.run/fal-ai/flux/requests/request-12345678/status"
  );
  assert.equal(
    calls[0],
    "https://queue.fal.run/fal-ai/flux/requests/request-12345678/status"
  );
  await assert.rejects(
    () => client.queueUrl("secret", "https://example.com/steal-key"),
    /invalide/
  );
});

test("falls back when a submission queue URL is incomplete", async () => {
  const calls = [];
  const client = new FalClient(async (url) => {
    calls.push(url);
    if (calls.length === 1) return response({ detail: "Invalid path" }, 404);
    if (calls.length === 2) return response({ detail: "Method not allowed" }, 405);
    return response({ status: "COMPLETED" });
  });

  const result = await client.queueUrlOrRequest(
    "secret",
    "https://queue.fal.run/bytedance/seedance-2.0/requests/request-12345678/status",
    "bytedance/seedance-2.0/fast/reference-to-video",
    "request-12345678",
    "status",
    "fal-ai/seedance-2/fast/reference-to-video"
  );

  assert.equal(result.status, "COMPLETED");
  assert.equal(calls.length, 3);
  assert.equal(
    calls[1],
    "https://queue.fal.run/bytedance/seedance-2.0/fast/reference-to-video/" +
      "requests/request-12345678/status"
  );
  assert.equal(
    calls[2],
    "https://queue.fal.run/fal-ai/seedance-2/fast/reference-to-video/" +
      "requests/request-12345678/status"
  );
});

test("uploads LoRA archives above 90 MiB with fal multipart storage", async () => {
  const calls = [];
  const data = Buffer.alloc(91 * 1024 * 1024, 1);
  const client = new FalClient(async (url, options = {}) => {
    calls.push({ url, options });
    if (url.includes("initiate-multipart")) {
      return response({
        upload_url: "https://upload.fal.media/archive?token=signed",
        file_url: "https://v3.fal.media/files/archive.zip"
      });
    }
    if (url.includes("/complete?")) return response({ ok: true });
    const partNumber = Number(new URL(url).pathname.split("/").at(-1));
    return response({ partNumber, etag: `etag-${partNumber}` });
  });

  const url = await client.uploadArchive("secret", { data, name: "dataset.zip" });

  assert.equal(url, "https://v3.fal.media/files/archive.zip");
  assert.equal(calls[0].url, "https://rest.fal.ai/storage/upload/initiate-multipart?storage_type=fal-cdn-v3");
  assert.equal(calls[0].options.headers.Authorization, "Key secret");
  const partCalls = calls.filter((call) => /\/archive\/\d+\?/.test(call.url));
  assert.equal(partCalls.length, 10);
  assert.equal(partCalls[0].options.headers?.Authorization, undefined);
  assert.equal(partCalls[0].options.body.length, 10 * 1024 * 1024);
  assert.equal(partCalls.at(-1).options.body.length, 1024 * 1024);
  const complete = calls.find((call) => call.url.includes("/complete?"));
  assert.equal(complete.options.headers.Authorization, undefined);
  assert.equal(JSON.parse(complete.options.body).parts.length, 10);
});