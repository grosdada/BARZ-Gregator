import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { imageFileFromDataTransfer, isAcceptedSpatialImage } from "../apps/atlas/public/angle-relighting-studio.js";

test("Angle and Relighting studios accept Explorer image drops even without a MIME type", () => {
  const png = { name: "reference.PNG", type: "", size: 42 };
  assert.equal(isAcceptedSpatialImage(png), true);
  assert.equal(isAcceptedSpatialImage({ name: "notes.txt", type: "text/plain" }), false);
  const transfer = {
    items: [
      { kind: "string", type: "text/plain" },
      { kind: "file", type: "", getAsFile: () => png }
    ],
    files: []
  };
  assert.equal(imageFileFromDataTransfer(transfer), png);
});

test("Angle and Relighting studios fall back to DataTransfer files", () => {
  const jpeg = { name: "portrait.jpg", type: "image/jpeg", size: 42 };
  assert.equal(imageFileFromDataTransfer({ items: [], files: [jpeg] }), jpeg);
  assert.equal(imageFileFromDataTransfer({ items: [], files: [{ name: "scene.mov", type: "video/quicktime" }] }), null);
});

test("the shared spatial viewport wires drag-over and drop into the image loader", async () => {
  const source = await readFile(new URL("../apps/atlas/public/angle-relighting-studio.js", import.meta.url), "utf8");
  assert.match(source, /viewport\.addEventListener\("dragover"/);
  assert.match(source, /viewport\.addEventListener\("drop"/);
  assert.match(source, /imageFileFromDataTransfer\(event\.dataTransfer\)/);
  assert.match(source, /await loadImageFile\(file\)/);
});
