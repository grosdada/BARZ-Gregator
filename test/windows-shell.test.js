import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";

import {
  explorerSelectArgument,
  revealFileInExplorer
} from "../src/windows-shell.js";

test("Explorer receives /select outside the quoted path", () => {
  assert.equal(
    explorerSelectArgument("E:/BARZ Media/My clip.mp4"),
    '/select,"E:\\BARZ Media\\My clip.mp4"'
  );
});

test("Explorer launch preserves the verbatim Windows argument", async () => {
  let invocation;
  const child = new EventEmitter();
  child.unref = () => {
    child.unrefCalled = true;
  };
  const spawnProcess = (command, args, options) => {
    invocation = { command, args, options };
    queueMicrotask(() => child.emit("spawn"));
    return child;
  };

  await revealFileInExplorer("E:/BARZ Media/My clip.mp4", spawnProcess);

  assert.equal(invocation.command, "explorer.exe");
  assert.deepEqual(invocation.args, ['/select,"E:\\BARZ Media\\My clip.mp4"']);
  assert.equal(invocation.options.windowsVerbatimArguments, true);
  assert.equal(child.unrefCalled, true);
});
