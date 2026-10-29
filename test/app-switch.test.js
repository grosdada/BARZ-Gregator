import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("the Aggregator exposes a stable switch to BARZ Prompt Atlas", async () => {
  const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../public/styles.css", import.meta.url), "utf8");

  assert.match(html, /href="http:\/\/127\.0\.0\.1:4326\/"/);
  assert.doesNotMatch(html, /target="prompt-atlas-v6"/);
  assert.match(html, /aria-label="Ouvrir BARZ Prompt Atlas"/);
  assert.match(html, /<aside class="media-rail"[\s\S]*class="app-switch app-switch-atlas"[\s\S]*class="rail-foot"/);
  assert.match(css, /\.app-switch\s*\{/);
  assert.match(css, /\.app-switch:focus-visible|:focus-visible/);
});
