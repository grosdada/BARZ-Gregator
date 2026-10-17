import { open } from "node:fs/promises";

const maximumHeaderBytes = 16 * 1024 * 1024;
const validDtypes = new Set([
  "BOOL", "F8_E4M3", "F8_E5M2", "F16", "BF16", "F32", "F64",
  "I8", "I16", "I32", "I64", "U8", "U16", "U32", "U64"
]);

function invalidSafetensors(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

export function validateSafetensorsHeader(prefix, fileSize) {
  if (!Buffer.isBuffer(prefix) || prefix.length < 9) {
    throw invalidSafetensors("Le fichier SafeTensors est vide ou tronqué.");
  }
  const headerSizeBigInt = prefix.readBigUInt64LE(0);
  if (headerSizeBigInt < 2n || headerSizeBigInt > BigInt(maximumHeaderBytes)) {
    throw invalidSafetensors("L’en-tête SafeTensors est invalide.");
  }
  const headerSize = Number(headerSizeBigInt);
  if (8 + headerSize > fileSize || prefix.length < 8 + headerSize) {
    throw invalidSafetensors("Le fichier SafeTensors est tronqué.");
  }
  let header;
  try {
    header = JSON.parse(prefix.subarray(8, 8 + headerSize).toString("utf8"));
  } catch {
    throw invalidSafetensors("L’en-tête SafeTensors n’est pas un JSON valide.");
  }
  const tensors = Object.entries(header).filter(([name]) => name !== "__metadata__");
  const isTensor = ([, value]) => (
    value && typeof value === "object" && validDtypes.has(value.dtype) &&
    Array.isArray(value.shape) && value.shape.every(Number.isSafeInteger) &&
    Array.isArray(value.data_offsets) && value.data_offsets.length === 2 &&
    value.data_offsets.every(Number.isSafeInteger) &&
    value.data_offsets[0] >= 0 && value.data_offsets[1] >= value.data_offsets[0] &&
    8 + headerSize + value.data_offsets[1] <= fileSize
  );
  if (!tensors.length || !tensors.every(isTensor)) {
    throw invalidSafetensors("Le fichier ne contient pas de tenseurs valides.");
  }
  return { headerSize, tensorCount: tensors.length, metadata: header.__metadata__ || {} };
}

export async function validateSafetensorsFile(filePath) {
  const handle = await open(filePath, "r");
  try {
    const stats = await handle.stat();
    if (stats.size < 10) {
      throw invalidSafetensors("Le fichier SafeTensors est vide ou tronqué.");
    }
    const sizePrefix = Buffer.alloc(8);
    await handle.read(sizePrefix, 0, 8, 0);
    const headerSize = Number(sizePrefix.readBigUInt64LE(0));
    if (!Number.isSafeInteger(headerSize) || headerSize > maximumHeaderBytes) {
      throw invalidSafetensors("L’en-tête SafeTensors est invalide.");
    }
    const prefix = Buffer.alloc(8 + headerSize);
    await handle.read(prefix, 0, prefix.length, 0);
    return validateSafetensorsHeader(prefix, stats.size);
  } finally {
    await handle.close();
  }
}