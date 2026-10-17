import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

import {
  buildStoredZip,
  packFastSliceRequest,
  streamTilesToDirectory,
  unpackFastSliceResponse,
  writeEntriesToDirectory
} from "../apps/atlas/public/image-slicer.js";
import { renderImageSlices, renderImageSlicesToDirectory } from "../apps/atlas/image-slicer-service.js";
import {
  collectProGuideRegions,
  createProGuideGrid,
  deleteProGuide,
  duplicateProGuide,
  isolateProGuide,
  moveProGuide
} from "../apps/atlas/public/image-slicer-pro.js";

test("A13 Image Slicer builds one valid stored ZIP with every named tile", async () => {
  const archive = await buildStoredZip([
    { name: "board_slice_01.png", blob: new Blob([new Uint8Array([1, 2, 3])]) },
    { name: "board_slice_02.png", blob: new Blob([new Uint8Array([4, 5])]) }
  ]);
  const bytes = new Uint8Array(await archive.arrayBuffer());
  const view = new DataView(bytes.buffer);
  assert.equal(view.getUint32(0, true), 0x04034b50);
  assert.equal(view.getUint32(bytes.length - 22, true), 0x06054b50);
  assert.equal(view.getUint16(bytes.length - 12, true), 2);
  const text = new TextDecoder().decode(bytes);
  assert.match(text, /board_slice_01\.png/);
  assert.match(text, /board_slice_02\.png/);
  assert.equal(archive.type, "application/zip");
});

test("A13 Image Slicer writes every tile directly to the selected folder", async () => {
  const written = new Map();
  const progress = [];
  const directoryHandle = {
    async getFileHandle(name, options) {
      assert.deepEqual(options, { create: true });
      return {
        async createWritable() {
          return {
            async write(blob) { written.set(name, new Uint8Array(await blob.arrayBuffer())); },
            async close() {}
          };
        }
      };
    }
  };
  await writeEntriesToDirectory([
    { name: "source_slice_01.png", blob: new Blob([new Uint8Array([7, 8])]) },
    { name: "source_slice_02.png", blob: new Blob([new Uint8Array([9])]) }
  ], directoryHandle, (done, total) => progress.push([done, total]));
  assert.deepEqual([...written.keys()], ["source_slice_01.png", "source_slice_02.png"]);
  assert.deepEqual([...written.get("source_slice_01.png")], [7, 8]);
  assert.deepEqual(progress, [[1, 2], [2, 2]]);
});

test("Image Slicer streams each encoded tile to disk before encoding the next one", async () => {
  const order = [];
  const directoryHandle = {
    async getFileHandle(name) {
      return { async createWritable() { return { async write() { order.push(`write:${name}`); }, async close() {} }; } };
    }
  };
  const tiles = [{ name: "one.png" }, { name: "two.png" }];
  await streamTilesToDirectory(tiles, directoryHandle, async (tile) => {
    order.push(`encode:${tile.name}`);
    return new Blob([tile.name]);
  });
  assert.deepEqual(order, ["encode:one.png", "write:one.png", "encode:two.png", "write:two.png"]);
});

test("Image Slicer fast engine renders packed slices with native image dimensions", async () => {
  const source = await sharp({ create: { width: 60, height: 40, channels: 3, background: "#d06a42" } }).png().toBuffer();
  const tiles = [
    { sx: 0, sy: 0, width: 30, height: 40, name: "left.png" },
    { sx: 30, sy: 0, width: 30, height: 40, name: "right.png" }
  ];
  const request = packFastSliceRequest(new Blob([source]), tiles, "png", 0.92);
  const response = await renderImageSlices(Buffer.from(await request.arrayBuffer()), { concurrency: 2 });
  const entries = unpackFastSliceResponse(response);
  assert.deepEqual(entries.map(({ name }) => name), ["left.png", "right.png"]);
  for (const entry of entries) {
    const metadata = await sharp(Buffer.from(await entry.blob.arrayBuffer())).metadata();
    assert.deepEqual([metadata.width, metadata.height, metadata.format], [30, 40, "png"]);
  }
});

test("Image Slicer native engine writes every slice directly without browser file streams", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "barz-slicer-native-"));
  try {
    const source = await sharp({ create: { width: 40, height: 20, channels: 3, background: "#18222d" } }).png().toBuffer();
    const tiles = [
      { sx: 0, sy: 0, width: 20, height: 20, name: "native_01.png" },
      { sx: 20, sy: 0, width: 20, height: 20, name: "native_02.png" }
    ];
    const request = packFastSliceRequest(new Blob([source]), tiles, "png", 0.92);
    const timing = await renderImageSlicesToDirectory(Buffer.from(await request.arrayBuffer()), directory);
    assert.equal(timing.count, 2);
    assert.ok(timing.totalMs >= 0);
    const outputs = await Promise.all(tiles.map(({ name }) => readFile(path.join(directory, name))));
    assert.equal(outputs.length, 2);
    assert.ok(outputs.every((output) => output.length > 0));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("Image Slicer Pro resolves partial dashed segments into independent regions", () => {
  const guide = (id, axis, position, start, end) => ({ id, groupId: id, axis, position, start, end, isolated: false, duplicate: false });
  const guides = [guide("middle", "row", .5, 0, 1)];
  for (let index = 1; index < 5; index += 1) guides.push(guide(`top-${index}`, "column", index / 5, 0, .5));
  for (let index = 1; index < 7; index += 1) guides.push(guide(`bottom-${index}`, "column", index / 7, .5, 1));
  const regions = collectProGuideRegions(guides);
  assert.equal(regions.length, 12);
  assert.equal(regions.filter((region) => region.y === 0 && region.height === .5).length, 5);
  assert.equal(regions.filter((region) => region.y === .5 && region.height === .5).length, 7);
});

test("Image Slicer Pro isolates the clicked section and moves it independently", () => {
  const guides = createProGuideGrid(2, 2);
  const column = guides.find((guide) => guide.axis === "column");
  const isolated = isolateProGuide(guides, column.id, .25);
  assert.equal(isolated.isolated, true);
  assert.deepEqual([isolated.start, isolated.end], [0, .5]);
  assert.equal(moveProGuide(guides, isolated.id, .7), true);
  assert.equal(isolated.position, .7);
  const continuation = guides.find((guide) => guide.axis === "column" && guide.id !== isolated.id);
  assert.equal(continuation.position, .5);
});

test("Image Slicer Pro duplicates and deletes only an isolated section", () => {
  const guides = createProGuideGrid(2, 2);
  const column = guides.find((guide) => guide.axis === "column");
  const isolated = isolateProGuide(guides, column.id, .25);
  const copies = duplicateProGuide(guides, isolated.id);
  assert.equal(copies.length, 1);
  assert.equal(copies[0].isolated, true);
  assert.deepEqual([copies[0].start, copies[0].end], [isolated.start, isolated.end]);
  const beforeDelete = guides.length;
  assert.equal(deleteProGuide(guides, isolated.id), true);
  assert.equal(guides.length, beforeDelete - 1);
  assert.ok(guides.some((guide) => guide.axis === "column" && guide.end === 1));
});

test("Image Slicer Pro duplicates and deletes a whole continuous segment", () => {
  const guides = createProGuideGrid(2, 2);
  const row = guides.find((guide) => guide.axis === "row");
  const copies = duplicateProGuide(guides, row.id);
  assert.equal(copies.length, 1);
  assert.equal(copies[0].duplicate, true);
  assert.equal(deleteProGuide(guides, row.id), true);
  assert.equal(guides.filter((guide) => guide.axis === "row").length, 1);
});

test("Image Slicer Pro keeps guides interactive and saves directly like the classic slicer", async () => {
  const [styles, source] = await Promise.all([
    readFile(new URL("../apps/atlas/public/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../apps/atlas/public/image-slicer-pro.js", import.meta.url), "utf8")
  ]);
  assert.match(styles, /\.slicer-grid-overlay\.slicer-pro-v2-overlay\s*\{[^}]*pointer-events:\s*auto;/s);
  assert.match(styles, /\.slicer-pro-v2-guide\s*\{[^}]*pointer-events:\s*auto;/s);
  assert.match(source, /action\("Clear slices"/);
  assert.match(source, /action\("Slice and save"/);
  assert.match(source, /streamTilesToDirectory\(tiles, target/);
  assert.doesNotMatch(source, /Exporter les segments \(ZIP\)/);
});
