import { access, readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { prepareProductPayload } from "./prepare-product-payload.mjs";
import { generateInstallerAssets } from "./generate-installer-assets.mjs";

const installerDirectory = path.dirname(fileURLToPath(import.meta.url));

async function exists(filePath) {
  return access(filePath).then(() => true, () => false);
}

export async function findMakeNsis(environment = process.env) {
  const candidates = [
    environment.MAKENSIS_PATH,
    environment["ProgramFiles(x86)"] && path.join(environment["ProgramFiles(x86)"], "NSIS", "makensis.exe"),
    environment.ProgramFiles && path.join(environment.ProgramFiles, "NSIS", "makensis.exe")
  ].filter(Boolean);
  const cacheRoot = environment.LOCALAPPDATA && path.join(environment.LOCALAPPDATA, "electron-builder", "Cache", "nsis");
  if (cacheRoot && await exists(cacheRoot)) {
    const versions = (await readdir(cacheRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort().reverse();
    for (const version of versions) {
      candidates.push(path.join(cacheRoot, version, "makensis.exe"));
      candidates.push(path.join(cacheRoot, version, "Bin", "makensis.exe"));
    }
  }
  for (const candidate of candidates) if (await exists(candidate)) return candidate;
  throw new Error("MakeNSIS was not found. Install NSIS or set MAKENSIS_PATH.");
}

export async function buildInstaller({ environment = process.env } = {}) {
  await generateInstallerAssets();
  await prepareProductPayload();
  const executable = await findMakeNsis(environment);
  await new Promise((resolve, reject) => {
    const child = spawn(executable, ["/V3", "barz-suite.nsi"], { cwd: installerDirectory, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`MakeNSIS exited with code ${code}`)));
  });
  return path.join(installerDirectory, "BARZ-Suite-6-Setup-0.33.50.exe");
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  console.log(`Built: ${await buildInstaller()}`);
}
