import { access, mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const installerDirectory = path.dirname(fileURLToPath(import.meta.url));
const sourceDirectory = path.join(installerDirectory, "diaporama");
const outputDirectory = path.join(installerDirectory, "assets", "slideshow");
const supportedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".tif", ".tiff"]);
const bannerSize = { width: 520, height: 138 };
const posterSize = { width: 720, height: 460 };
const featured = [
  "vaisseaux-new", "grosdada_1960s", "04_close-grishka", "ComfyUI_temp",
  "BARBEUC LOVE mov-20260515", "Persos-Banana", "hf_20260316_161823",
  "212_ina87", "pursuit-grid", "test APPs", "Line Up", "20261001",
  "puppets image", "257_ina87", "RAPPER-20260419-174138"
];

function bmpFromRgb(data, width, height) {
  const rowBytes = Math.ceil(width * 3 / 4) * 4;
  const pixelBytes = rowBytes * height;
  const output = Buffer.alloc(54 + pixelBytes);
  output.write("BM", 0, "ascii");
  output.writeUInt32LE(output.length, 2);
  output.writeUInt32LE(54, 10);
  output.writeUInt32LE(40, 14);
  output.writeInt32LE(width, 18);
  output.writeInt32LE(height, 22);
  output.writeUInt16LE(1, 26);
  output.writeUInt16LE(24, 28);
  output.writeUInt32LE(pixelBytes, 34);
  for (let row = 0; row < height; row += 1) {
    const sourceOffset = (height - 1 - row) * width * 3;
    const outputOffset = 54 + row * rowBytes;
    for (let x = 0; x < width; x += 1) {
      const sourcePixel = sourceOffset + x * 3;
      const outputPixel = outputOffset + x * 3;
      output[outputPixel] = data[sourcePixel + 2];
      output[outputPixel + 1] = data[sourcePixel + 1];
      output[outputPixel + 2] = data[sourcePixel];
    }
  }
  return output;
}

function overlay(index, total, width, height) {
  const isPoster = height > 200;
  const badgeY = isPoster ? 18 : 8;
  const titleY = height - (isPoster ? 51 : 24);
  const progressY = height - 13;
  const progressWidth = width - 26;
  const progress = Math.round(progressWidth * (index + 1) / total);
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#070a0d" stop-opacity="0"/>
      <stop offset="1" stop-color="#070a0d" stop-opacity=".9"/>
    </linearGradient></defs>
    <rect x="0" y="${height - (isPoster ? 160 : 72)}" width="${width}" height="${isPoster ? 160 : 72}" fill="url(#shade)"/>
    <rect x="12" y="${badgeY}" width="64" height="27" rx="13.5" fill="#63b9e3"/>
    <text x="44" y="${badgeY + 19}" text-anchor="middle" fill="#0c0d0d" font-family="Arial,sans-serif" font-size="14" font-weight="900">BARZ</text>
    <text x="14" y="${titleY}" fill="#f0eee8" font-family="Arial,sans-serif" font-size="${isPoster ? 18 : 13}" font-weight="700">BEYOND ARTIFICIAL REALITY ZONE</text>
    <text x="${width - 14}" y="${titleY}" text-anchor="end" fill="#f0eee8" font-family="Arial,sans-serif" font-size="${isPoster ? 16 : 11}" font-weight="700">${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}</text>
    <rect x="13" y="${progressY}" width="${progressWidth}" height="4" rx="2" fill="#313b42"/>
    <rect x="13" y="${progressY}" width="${progress}" height="4" rx="2" fill="#63b9e3"/>
  </svg>`);
}

async function renderSlide(file, index, total, { width, height }) {
  const background = await sharp(file).rotate().resize(width, height, { fit: "cover" })
    .blur(16).modulate({ brightness: 0.48 }).png().toBuffer();
  const photo = await sharp(file).rotate().resize(width, height, {
    fit: "contain", background: "#00000000"
  }).png().toBuffer();
  const png = await sharp(background).composite([
    { input: photo, top: 0, left: 0 },
    { input: overlay(index, total, width, height), top: 0, left: 0 }
  ]).png().toBuffer();
  const rgb = await sharp(png).removeAlpha().raw().toBuffer();
  return { png, bmp: bmpFromRgb(rgb, width, height) };
}

export async function generateSlideshow() {
  await mkdir(outputDirectory, { recursive: true });
  for (const entry of await readdir(outputDirectory)) {
    if (/^(?:slide|banner|poster)-\d+\.bmp$/.test(entry)) await unlink(path.join(outputDirectory, entry));
  }
  const available = await access(sourceDirectory).then(() => true, () => false);
  const names = available ? (await readdir(sourceDirectory))
    .filter((name) => supportedExtensions.has(path.extname(name).toLowerCase())) : [];
  names.sort((left, right) => {
    const rank = (name) => {
      const position = featured.findIndex((prefix) => name.startsWith(prefix));
      return position < 0 ? featured.length : position;
    };
    return rank(left) - rank(right) || left.localeCompare(right, "fr", { numeric: true });
  });
  for (let index = 0; index < names.length; index += 1) {
    const file = path.join(sourceDirectory, names[index]);
    const banner = await renderSlide(file, index, names.length, bannerSize);
    const poster = await renderSlide(file, index, names.length, posterSize);
    await writeFile(path.join(outputDirectory, `banner-${index + 1}.bmp`), banner.bmp);
    await writeFile(path.join(outputDirectory, `poster-${index + 1}.bmp`), poster.bmp);
    if (index === 0) await writeFile(path.join(installerDirectory, "diaporama-preview.png"), poster.png);
  }
  await writeFile(path.join(outputDirectory, "slides.nsh"),
    `!define BARZ_SLIDE_COUNT ${names.length}\n`, "utf8");
  return { count: names.length, outputDirectory };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await generateSlideshow();
  console.log(`Prepared ${result.count} installer slides in ${result.outputDirectory}`);
}
