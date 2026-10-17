import sharp from "sharp";
import path from "node:path";
import { writeFile } from "node:fs/promises";

const MAX_HEADER_BYTES = 4 * 1024 * 1024;
const MAX_TILES = 10_000;
const SUPPORTED_FORMATS = new Set(["png", "jpeg", "webp"]);

function boundedInteger(value, minimum, maximum, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw new Error(`${label} is out of range.`);
  }
  return number;
}

function safeOutputName(value, index, format) {
  const fallback = `slice_${String(index + 1).padStart(2, "0")}.${format === "jpeg" ? "jpg" : format}`;
  if (typeof value !== "string" || !value.trim()) return fallback;
  const name = value.trim();
  if (name.length > 240 || name.includes("/") || name.includes("\\") || name === "." || name === "..") {
    throw new Error("Invalid slice filename.");
  }
  return name;
}

export function unpackFastSliceRequest(payload) {
  const bytes = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
  if (bytes.length < 5) throw new Error("Incomplete slicer request.");
  const headerLength = bytes.readUInt32BE(0);
  if (headerLength < 2 || headerLength > MAX_HEADER_BYTES || 4 + headerLength >= bytes.length) {
    throw new Error("Invalid slicer request header.");
  }
  let header;
  try { header = JSON.parse(bytes.subarray(4, 4 + headerLength).toString("utf8")); }
  catch { throw new Error("Invalid slicer request metadata."); }
  return { header, image: bytes.subarray(4 + headerLength) };
}

export function packFastSliceResponse(files) {
  const manifest = Buffer.from(JSON.stringify({
    files: files.map(({ name, data }) => ({ name, length: data.length }))
  }), "utf8");
  const prefix = Buffer.allocUnsafe(4);
  prefix.writeUInt32BE(manifest.length, 0);
  return Buffer.concat([prefix, manifest, ...files.map(({ data }) => data)]);
}

export async function renderImageSliceFiles(payload, { concurrency = 4 } = {}) {
  const { header, image } = unpackFastSliceRequest(payload);
  const format = String(header?.format || "").toLowerCase();
  if (!SUPPORTED_FORMATS.has(format)) throw new Error("Unsupported slice format.");
  const quality = Math.max(1, Math.min(100, Math.round(Number(header.quality ?? 0.92) * 100)));
  if (!Array.isArray(header.tiles) || !header.tiles.length || header.tiles.length > MAX_TILES) {
    throw new Error("Invalid number of slices.");
  }

  const metadata = await sharp(image, { failOn: "error" }).rotate().metadata();
  const imageWidth = boundedInteger(metadata.width, 1, 1_000_000, "image width");
  const imageHeight = boundedInteger(metadata.height, 1, 1_000_000, "image height");
  const tiles = header.tiles.map((tile, index) => {
    const left = boundedInteger(tile.sx, 0, imageWidth - 1, "slice x");
    const top = boundedInteger(tile.sy, 0, imageHeight - 1, "slice y");
    const width = boundedInteger(tile.width, 1, imageWidth - left, "slice width");
    const height = boundedInteger(tile.height, 1, imageHeight - top, "slice height");
    return { left, top, width, height, name: safeOutputName(tile.name, index, format) };
  });

  const files = new Array(tiles.length);
  let next = 0;
  const worker = async () => {
    while (next < tiles.length) {
      const index = next++;
      const tile = tiles[index];
      let pipeline = sharp(image, { failOn: "error" }).rotate().extract({
        left: tile.left,
        top: tile.top,
        width: tile.width,
        height: tile.height
      });
      if (format === "png") pipeline = pipeline.png({ compressionLevel: 3, adaptiveFiltering: false });
      else if (format === "jpeg") pipeline = pipeline.jpeg({ quality, mozjpeg: false });
      else pipeline = pipeline.webp({ quality, effort: 2 });
      files[index] = { name: tile.name, data: await pipeline.toBuffer() };
    }
  };
  await Promise.all(Array.from({ length: Math.min(Math.max(1, concurrency), tiles.length) }, worker));
  return files;
}

export async function renderImageSlices(payload, options = {}) {
  return packFastSliceResponse(await renderImageSliceFiles(payload, options));
}

export async function renderImageSlicesToDirectory(payload, directory, options = {}) {
  const startedAt = performance.now();
  const files = await renderImageSliceFiles(payload, options);
  const renderedAt = performance.now();
  await Promise.all(files.map(({ name, data }) => writeFile(path.join(directory, name), data)));
  const completedAt = performance.now();
  return {
    count: files.length,
    renderMs: Math.round(renderedAt - startedAt),
    writeMs: Math.round(completedAt - renderedAt),
    totalMs: Math.round(completedAt - startedAt)
  };
}
