import { spawn } from "node:child_process";

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosTimestamp(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  const day = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

export function createStoredZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const data = Buffer.from(entry.data);
    const checksum = crc32(data);
    const { time, day } = dosTimestamp(entry.date);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    localParts.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(day, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    offset += local.length + name.length + data.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, ...centralParts, end]);
}

function runFfmpeg(input, args) {
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", ["-hide_banner", "-loglevel", "error", ...args]);
    const output = [];
    const errors = [];
    child.stdout.on("data", (chunk) => output.push(chunk));
    child.stderr.on("data", (chunk) => errors.push(chunk));
    child.on("error", () => reject(new Error("FFmpeg est requis pour convertir ce format.")));
    child.on("close", (code) => {
      if (code === 0) resolve(Buffer.concat(output));
      else reject(new Error(Buffer.concat(errors).toString("utf8") || "Conversion impossible."));
    });
    child.stdin.end(input);
  });
}

export async function convertMedia(input, contentType, format) {
  if (format === "original") return { data: input, extension: null };
  if (format === "jpg" && contentType === "image/jpeg") {
    return { data: input, extension: ".jpg" };
  }
  if (format === "png" && contentType === "image/png") {
    return { data: input, extension: ".png" };
  }
  if (["jpg", "png"].includes(format) && contentType.startsWith("image/")) {
    const codec = format === "jpg" ? "mjpeg" : "png";
    const data = await runFfmpeg(input, [
      "-i", "pipe:0", "-frames:v", "1", "-f", "image2pipe", "-vcodec", codec, "pipe:1"
    ]);
    return { data, extension: `.${format}` };
  }
  if (format === "webm" && contentType.startsWith("video/")) {
    const data = await runFfmpeg(input, [
      "-i", "pipe:0", "-c:v", "libvpx-vp9", "-crf", "32", "-b:v", "0",
      "-c:a", "libopus", "-f", "webm", "pipe:1"
    ]);
    return { data, extension: ".webm" };
  }
  if (format === "webm" && contentType.startsWith("audio/")) {
    const data = await runFfmpeg(input, [
      "-i", "pipe:0", "-vn", "-c:a", "libopus", "-f", "webm", "pipe:1"
    ]);
    return { data, extension: ".webm" };
  }
  throw new TypeError("Le format choisi n’est pas compatible avec cette sélection.");
}

export async function createImageThumbnail(input) {
  return runFfmpeg(input, [
    "-i", "pipe:0",
    "-vf", "scale=160:120:force_original_aspect_ratio=decrease",
    "-frames:v", "1",
    "-q:v", "5",
    "-f", "image2pipe",
    "-vcodec", "mjpeg",
    "pipe:1"
  ]);
}
