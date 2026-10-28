import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

async function unusedPort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

test("image import queue creates all drafts atomically without submitting jobs", async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "barz-image-queue-"));
  const port = await unusedPort();
  const child = spawn(process.execPath, ["server.js"], {
    cwd: repoRoot,
    env: { ...process.env, BARZ_AGGREGATOR_PORT: String(port),
      BARZ_AGGREGATOR_DATA_DIR: dataDir, BARZ_SHARED_SECRETS_DIR: dataDir },
    stdio: "ignore"
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 50; attempt += 1) {
      if (child.exitCode !== null) break;
      try { ready = (await fetch(`${base}/api/health`)).ok; } catch {}
      if (ready) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.equal(ready, true, "isolated Aggregator did not start");
    const requestId = randomUUID();
    const items = [1, 2, 3].map((number) => ({
      schemaVersion: "1.0",
      source: { app: "prompt-atlas", module: `Video Multi Framing · Still ${number}` },
      mediaType: "image", prompt: `Still ${number}: @image1 in the industrial city`,
      references: [{ kind: "image", label: "@image1", url: "/api/resources/example/content" }]
    }));
    const send = () => fetch(`${base}/api/import-queues/image`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, items })
    });
    const first = await send();
    assert.equal(first.status, 201);
    const payload = await first.json();
    assert.equal(payload.drafts.length, 3);
    assert.deepEqual(payload.drafts.map((draft) => draft.queuePosition), [1, 2, 3]);
    assert.ok(payload.drafts.every((draft) => draft.queueStatus === "pending" && draft.references.length === 1));
    const retry = await send();
    assert.deepEqual((await retry.json()).drafts.map((draft) => draft.id), payload.drafts.map((draft) => draft.id));
    const state = await (await fetch(`${base}/api/state`)).json();
    assert.equal(state.drafts.filter((draft) => draft.queueBatchId === requestId).length, 3);
    assert.equal(state.jobs.length, 0);

    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==", "base64");
    const uploaded = await fetch(`${base}/api/resources`, { method: "POST",
      headers: { "Content-Type": "image/png", "X-Barz-Filename": "shot-reference.png" }, body: png });
    assert.equal(uploaded.status, 201);
    const resourceId = (await uploaded.json()).resource.id;
    const longPrompt = `${"HARD CUT. ".repeat(300)}Use @image1 as the exact actor reference.`;
    assert.ok(longPrompt.length > 2500);
    const imported = await fetch(`${base}/api/imports`, { method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schemaVersion: "1.0", source: { app: "prompt-atlas", module: "Video Multi Framing · Séquence vidéo" },
        mediaType: "video", prompt: longPrompt, references: [{ kind: "image", id: `resource:${resourceId}`,
          label: "@image1 · shot-reference.png", url: `/api/resources/${resourceId}/content` }] }) });
    assert.equal(imported.status, 201);
    const videoDraft = (await imported.json()).draft;
    assert.equal(videoDraft.prompt, longPrompt);
    assert.equal(videoDraft.references[0].id, `resource:${resourceId}`);
    assert.equal((await (await fetch(`${base}/api/state`)).json()).jobs.length, 0);
  } finally {
    child.kill();
    const resolved = path.resolve(dataDir);
    assert.ok(resolved.startsWith(path.resolve(os.tmpdir()) + path.sep));
    await rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
