import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import WebSocket from "ws";

import { createBuildServer } from "../apps/atlas/server.js";

const root = await mkdtemp(path.join(os.tmpdir(), "barz-mode-bank-smoke-"));
let server;
let edge;
try {
  server = await createBuildServer({ dataDirectory: path.join(root, "data"), legacySettingsPath: path.join(root, "missing.json") });
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const profile = path.join(root, "edge");
  edge = spawn(edgePath, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    "--remote-debugging-port=0", `--user-data-dir=${profile}`, server.url], { windowsHide: true, stdio: "ignore" });
  let port;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { port = Number((await readFile(path.join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]); break; }
    catch { await new Promise((resolve) => setTimeout(resolve, 100)); }
  }
  assert.ok(port, "Edge debugging port did not open");
  const target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((tab) => tab.type === "page");
  assert.ok(target?.webSocketDebuggerUrl, "Edge page target missing");
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
  let seq = 0;
  const pending = new Map();
  socket.on("message", (data) => {
    const message = JSON.parse(String(data));
    if (!message.id) return;
    const operation = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) operation.reject(new Error(message.error.message));
    else operation.resolve(message.result);
  });
  const send = (method, params) => new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  await send("Runtime.enable");
  await send("Page.enable");
  const evaluated = await send("Runtime.evaluate", {
    expression: `(async () => {
      const waitFor = async (test) => { for (let i = 0; i < 100; i++) { if (test()) return; await new Promise(r => setTimeout(r, 100)); } throw new Error('UI did not load'); };
      await waitFor(() => [...document.querySelectorAll('.nav-item')].some(x => x.title === 'Look Library'));
      [...document.querySelectorAll('.nav-item')].find(x => x.title === 'Look Library').click();
      await waitFor(() => [...document.querySelectorAll('.runtime-tool-tab')].some(x => x.textContent === 'The Mode Bank'));
      [...document.querySelectorAll('.runtime-tool-tab')].find(x => x.textContent === 'The Mode Bank').click();
      await waitFor(() => document.querySelector('.mode-bank-preview'));
      const before = document.querySelector('.mode-bank-preview').textContent;
      [...document.querySelectorAll('.mode-bank-modes button')].find(x => x.textContent === 'Ref').click();
      await waitFor(() => document.querySelector('.mode-bank-check'));
      const defaultWardrobe = document.querySelector('.mode-bank-preview').textContent.includes('Keep the exact clothing');
      [...document.querySelectorAll('.mode-bank-check')].find(x => x.textContent.includes('Use wardrobe prompt')).querySelector('input').click();
      const promptWardrobe = document.querySelector('.mode-bank-preview').textContent.includes('Use the outfit, costume');
      [...document.querySelectorAll('.mode-bank-check')].find(x => x.textContent.includes('Puppet Mode')).querySelector('input').click();
      const puppetLock = document.querySelector('.mode-bank-preview').textContent.includes('Never humanize');
      return { count: document.querySelectorAll('.goodies-card').length, title: document.querySelector('.mode-bank-output h3')?.textContent,
        originalLength: before.length, wardrobeVisible: [...document.querySelectorAll('.mode-bank-check')].some(x => x.textContent.includes('Use wardrobe prompt')),
        defaultWardrobe, promptWardrobe, puppetLock,
        error: document.querySelector('.runtime-error')?.textContent ?? null };
    })()`, awaitPromise: true, returnByValue: true
  });
  if (evaluated.exceptionDetails) throw new Error(evaluated.exceptionDetails.text);
  const result = evaluated.result.value;
  assert.ok(result.count > 0 && result.originalLength > 100, JSON.stringify(result));
  assert.ok(result.wardrobeVisible && result.defaultWardrobe && result.promptWardrobe && result.puppetLock && !result.error, JSON.stringify(result));
  console.log(JSON.stringify(result));
  socket.close();
} finally {
  edge?.kill();
  await new Promise((resolve) => setTimeout(resolve, 500));
  await server?.close();
  try { await rm(root, { recursive: true, force: true, maxRetries: 8, retryDelay: 300 }); }
  catch (error) { console.error(`Temporary browser profile could not be removed: ${error.message}`); }
}
