import test from "node:test";
import assert from "node:assert/strict";

const bridgeUrl = new URL("../apps/atlas/public/suite-bridge.js", import.meta.url);

test("standalone Prompt Atlas opens Aggregator in the same page", async () => {
  const navigations = [];
  const page = { location: { origin: "http://127.0.0.1:4326", search: "",
    assign: (url) => navigations.push(url) }, parent: { postMessage: () => assert.fail("not a suite frame") } };
  page.top = page;
  globalThis.window = page;
  globalThis.document = { addEventListener() {} };
  try {
    const bridge = await import(`${bridgeUrl.href}?standalone`);
    assert.equal(bridge.isInsideSuiteShell(), false);
    bridge.openSuiteApp("aggregator");
    assert.deepEqual(navigations, ["http://127.0.0.1:4317/"]);
  } finally {
    delete globalThis.window;
    delete globalThis.document;
  }
});

test("embedded Prompt Atlas asks its Suite shell to switch modules", async () => {
  const messages = [];
  const parent = { postMessage: (...args) => messages.push(args) };
  const page = { location: { origin: "http://127.0.0.1:4326", search: "?embedded=1",
    assign: () => assert.fail("embedded navigation must stay in the Suite") }, parent, top: parent };
  globalThis.window = page;
  globalThis.document = { addEventListener() {} };
  try {
    const bridge = await import(`${bridgeUrl.href}?embedded`);
    assert.equal(bridge.isInsideSuiteShell(), true);
    bridge.openSuiteApp("aggregator");
    assert.deepEqual(messages, [[{
      type: "barz-suite:switch", app: "aggregator", url: "http://127.0.0.1:4317/"
    }, "http://127.0.0.1:4326"]]);
  } finally {
    delete globalThis.window;
    delete globalThis.document;
  }
});
