import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("images open in the in-app fullscreen preview instead of a browser tab", async () => {
  const [app, markup] = await Promise.all([
    readFile(new URL("../public/app.js", import.meta.url), "utf8"),
    readFile(new URL("../public/index.html", import.meta.url), "utf8")
  ]);
  assert.match(app, /data-preview-image-url/);
  assert.match(app, /imagePreviewDialog\.showModal\(\)/);
  assert.doesNotMatch(app, /window\.open\(resourcePreview/);
  assert.doesNotMatch(app, /<a href="\$\{safeUrl\}" target="_blank"/);
  assert.match(markup, /<dialog id="imagePreviewDialog"/);
  assert.match(markup, /<form method="dialog" class="image-preview-shell"/);
  assert.doesNotMatch(markup, /id="openJobResultLink"[^>]*target="_blank"/);
});
