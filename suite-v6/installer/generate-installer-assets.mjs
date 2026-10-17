import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const directory = path.dirname(fileURLToPath(import.meta.url));
const assetsDirectory = path.join(directory, "assets");
const source = path.join(assetsDirectory, "barz-suite.svg");
const destination = path.join(assetsDirectory, "barz-suite.ico");
const sizes = [16, 24, 32, 48, 64, 128, 256];

function iconDirectory(images) {
  const headerSize = 6;
  const entrySize = 16;
  let offset = headerSize + entrySize * images.length;
  const header = Buffer.alloc(headerSize + entrySize * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  images.forEach(({ size, png }, index) => {
    const entry = headerSize + index * entrySize;
    header.writeUInt8(size === 256 ? 0 : size, entry);
    header.writeUInt8(size === 256 ? 0 : size, entry + 1);
    header.writeUInt8(0, entry + 2);
    header.writeUInt8(0, entry + 3);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...images.map(({ png }) => png)]);
}

export async function generateInstallerAssets() {
  await mkdir(assetsDirectory, { recursive: true });
  const svg = await readFile(source);
  const images = await Promise.all(sizes.map(async (size) => ({
    size,
    png: await sharp(svg, { density: 384 }).resize(size, size).png().toBuffer()
  })));
  await writeFile(destination, iconDirectory(images));
  return destination;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Generated: ${await generateInstallerAssets()}`);
}
