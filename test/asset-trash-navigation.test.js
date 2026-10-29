import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

async function unusedPort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

test("selected generated and uploaded assets move to a persistent recoverable trash", async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "barz-asset-trash-"));
  const port = await unusedPort();
  const jobId = randomUUID();
  const resourceId = randomUUID();
  await writeFile(path.join(dataDir, "state.local.json"), JSON.stringify({
    drafts: [], activity: [], catalog: [], collections: [], referenceSets: [],
    resources: [{ id: resourceId, name: "test.png", mediaType: "image", contentType: "image/png" }],
    jobs: [{ id: jobId, jobType: "generation", status: "completed", mediaType: "image",
      result: { images: [{ url: "https://v3.fal.media/test.png", content_type: "image/png" }] } }]
  }));
  const child = spawn(process.execPath, ["server.js"], {
    cwd: root,
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
    assert.equal(ready, true);
    const response = await fetch(`${base}/api/assets/trash`, { method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selection: [
        { kind: "resource", resourceId }, { kind: "generated", jobId, index: 0 }
      ] }) });
    assert.equal(response.status, 200);
    const keys = [`resource:${resourceId}`, `generated:${jobId}:0`];
    assert.deepEqual((await response.json()).keys, keys);
    assert.deepEqual((await (await fetch(`${base}/api/state`)).json()).trashedAssetKeys, keys);
    const restore = await fetch(`${base}/api/assets/restore`, { method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keys: [keys[1]] }) });
    assert.equal(restore.status, 200);
    assert.deepEqual((await (await fetch(`${base}/api/state`)).json()).trashedAssetKeys, [keys[0]]);
  } finally {
    child.kill();
    await rm(dataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test("the queue detail and full-screen image preview accept up and down navigation", async () => {
  const app = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
  assert.match(app, /function queueDetailJobs\(/);
  assert.match(app, /function queueImageEntries\(/);
  assert.match(app, /navigateQueue\(event\.key === "ArrowDown" \? 1 : -1\)/);
  assert.match(app, /event\.key === "ArrowUp" \|\| event\.key === "ArrowDown"/);
});
