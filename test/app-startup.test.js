import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Aggregator opens directly on the Images composer", async () => {
  const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../public/app.js", import.meta.url), "utf8");

  assert.match(html, /class="media-tab active" type="button" data-media="image"/);
  assert.doesNotMatch(html, /class="media-tab active" type="button" data-media="video"/);
  assert.match(html, /id="mediaContext">Génération d’image/);
  assert.match(html, /class="video-mode-switch hidden"/);
  assert.match(html, /class="compact-field duration-field hidden"/);
  assert.match(app, /const state = \{[\s\S]*?mediaType: "image"/);
  assert.match(app, /renderDirectorStoryboard\(\);\s*selectMedia\("image"\);\s*refreshState/);
});
