import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("the References deck exposes the online BARZ library", async () => {
  const [html, app] = await Promise.all([
    readSource("../public/index.html"),
    readSource("../public/app.js")
  ]);
  assert.match(html, /id="referenceLibraryButton"[^>]*>Bibliothèque<\/button>/);
  assert.match(html, /data-reference-source="library"/);
  assert.match(app, /window\.open\([\s\S]*barzReferenceLibrary/);
  assert.match(app, /barz:library-handshake/);
  assert.match(app, /event\.origin !== referenceLibraryOrigin/);
  assert.match(app, /event\.source !== referenceLibraryPopup/);
  assert.match(app, /barz:import-reference-result/);
});

test("library imports use the guarded local resource pipeline", async () => {
  const server = await readSource("../server.js");
  assert.match(server, /POST" && url\.pathname === "\/api\/reference-imports\/from-library"/);
  assert.match(server, /url\.protocol !== "https:"/);
  assert.match(server, /url\.hostname !== referenceLibraryHost/);
  assert.match(server, /lookup\(url\.hostname, \{ all: true, verbatim: true \}\)/);
  assert.match(server, /isPrivateNetworkAddress/);
  assert.match(server, /redirect: "manual"/);
  assert.match(server, /referenceLibraryImageTypes\.has\(contentType\)/);
  assert.match(server, /sourceAssetId === assetId/);
  assert.match(server, /duplicate: true/);
});
