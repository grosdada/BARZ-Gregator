import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { copyFile, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const RELEASE_API = "https://api.github.com/repos/grosdada/BARZ-Gregator/releases/latest";
const RELEASE_PAGE = "https://github.com/grosdada/BARZ-Gregator/releases/latest";
const MAX_INSTALLER_BYTES = 1_500_000_000;
const CACHE_MS = 5 * 60_000;
const helperSource = fileURLToPath(new URL("./update-install.ps1", import.meta.url));

function versionParts(value) {
  const match = String(value || "").match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  return match ? match.slice(1).map(Number) : null;
}

function newerVersion(latest, current) {
  const left = versionParts(latest);
  const right = versionParts(current);
  if (!left || !right) return false;
  for (let i = 0; i < 3; i += 1) {
    if (left[i] !== right[i]) return left[i] > right[i];
  }
  return false;
}

function fail(message, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode });
}

export function createUpdateManager({ rootDirectory, dataDirectory }) {
  const installDirectory = path.resolve(rootDirectory, "..", "..");
  const updatesDirectory = path.join(dataDirectory, "updates");
  const statusFile = path.join(updatesDirectory, "status.json");
  const token = randomUUID();
  let cache = null;
  let busy = false;
  let progress = { phase: "idle", downloadedBytes: 0, totalBytes: 0, version: null, error: null };

  async function currentVersion() {
    const value = JSON.parse(await readFile(path.join(rootDirectory, "package.json"), "utf8"));
    return value.version;
  }

  async function isInstalled() {
    if (process.platform !== "win32" || /[\\/]installer[\\/]payload[\\/]/i.test(rootDirectory)) return false;
    try {
      const manifest = JSON.parse(await readFile(path.join(installDirectory, "manifest.json"), "utf8"));
      const expectedRuntime = path.join(installDirectory, "core", "node.exe");
      await stat(path.join(installDirectory, "launch.vbs"));
      return manifest.product === "BARZ Suite 6" &&
        path.resolve(process.execPath).toLowerCase() === path.resolve(expectedRuntime).toLowerCase();
    } catch { return false; }
  }

  async function latestRelease(force = false) {
    if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.value;
    const response = await fetch(RELEASE_API, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "BARZ-Suite-Updater" },
      signal: AbortSignal.timeout(12_000)
    });
    if (!response.ok) throw fail(`GitHub ne répond pas (HTTP ${response.status}).`, 503);
    const release = await response.json();
    const version = String(release.tag_name || "").replace(/^v/, "");
    const asset = release.assets?.find((item) => item.name === `BARZ-Suite-6-Setup-${version}.exe`);
    const downloadUrl = asset && new URL(asset.browser_download_url);
    if (!versionParts(version) || !asset || !downloadUrl || downloadUrl.hostname !== "github.com" ||
        !downloadUrl.pathname.startsWith(`/grosdada/BARZ-Gregator/releases/download/v${version}/`) ||
        !/^sha256:[a-f0-9]{64}$/i.test(asset.digest || "") ||
        !Number.isSafeInteger(asset.size) || asset.size < 1 || asset.size > MAX_INSTALLER_BYTES) {
      throw fail("La dernière release ne contient pas d’installateur Windows vérifiable.", 503);
    }
    const value = {
      version, pageUrl: `https://github.com/grosdada/BARZ-Gregator/releases/tag/v${version}`, downloadUrl: downloadUrl.href,
      digest: asset.digest.slice(7).toLowerCase(), size: asset.size
    };
    cache = { at: Date.now(), value };
    return value;
  }

  async function persistedProgress() {
    try {
      const saved = JSON.parse(await readFile(statusFile, "utf8"));
      if (saved.phase === "installing" && Date.now() - Date.parse(saved.updatedAt || 0) > 30 * 60_000) {
        return { ...saved, phase: "failed", error: "La mise à jour a été interrompue. Vous pouvez réessayer." };
      }
      if (["installing", "complete", "failed"].includes(saved.phase)) return saved;
    } catch {}
    return null;
  }

  async function status({ check = false } = {}) {
    const current = await currentVersion();
    let latest = cache?.value || null;
    let checkError = null;
    if (check) {
      try { latest = await latestRelease(); }
      catch (error) { checkError = error.message; }
    }
    const saved = !busy ? await persistedProgress() : null;
    const shownProgress = saved?.phase === "failed" && !newerVersion(saved.version, current)
      ? { ...saved, phase: "complete", error: null }
      : saved || progress;
    return {
      currentVersion: current,
      latestVersion: latest?.version || null,
      updateAvailable: !!latest && newerVersion(latest.version, current),
      installed: await isInstalled(),
      platform: process.platform,
      releaseUrl: latest?.pageUrl || RELEASE_PAGE,
      progress: shownProgress,
      checkError,
      token
    };
  }

  async function record(next) {
    progress = { ...progress, ...next, updatedAt: new Date().toISOString() };
    await mkdir(updatesDirectory, { recursive: true });
    const temporary = `${statusFile}.${process.pid}.tmp`;
    await writeFile(temporary, `${JSON.stringify(progress)}\n`, "utf8");
    await rename(temporary, statusFile);
  }

  async function downloadAndInstall(release) {
    const installer = path.join(updatesDirectory, `BARZ-Suite-6-Setup-${release.version}.exe`);
    const partial = `${installer}.part`;
    try {
      await record({ phase: "downloading", version: release.version, downloadedBytes: 0, totalBytes: release.size, error: null });
      await rm(partial, { force: true });
      const response = await fetch(release.downloadUrl, {
        headers: { "User-Agent": "BARZ-Suite-Updater" }, signal: AbortSignal.timeout(60 * 60_000)
      });
      if (!response.ok || !response.body) throw fail(`Téléchargement impossible (HTTP ${response.status}).`, 503);
      const hash = createHash("sha256");
      let received = 0;
      let lastRecorded = 0;
      const count = new Transform({
        transform(chunk, encoding, callback) {
          received += chunk.length;
          if (received > MAX_INSTALLER_BYTES || received > release.size) return callback(fail("Taille de téléchargement invalide."));
          hash.update(chunk);
          if (received - lastRecorded >= 2_000_000) {
            lastRecorded = received;
            progress.downloadedBytes = received;
          }
          callback(null, chunk);
        }
      });
      await pipeline(Readable.fromWeb(response.body), count, createWriteStream(partial, { flags: "wx" }));
      if (received !== release.size || hash.digest("hex") !== release.digest) throw fail("Empreinte ou taille de l’installateur incorrecte.");
      await rm(installer, { force: true });
      await rename(partial, installer);
      const helper = path.join(updatesDirectory, "update-install.ps1");
      await copyFile(helperSource, helper);
      await record({ phase: "installing", downloadedBytes: received, totalBytes: release.size });
      const shell = path.join(process.env.SystemRoot || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
      const child = spawn(shell, [
        "-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden",
        "-File", helper, "-Installer", installer, "-InstallDir", installDirectory,
        "-LaunchScript", path.join(installDirectory, "launch.vbs"),
        "-StatusFile", statusFile, "-ExpectedVersion", release.version
      ], { detached: true, windowsHide: true, stdio: "ignore" });
      await new Promise((resolve, reject) => {
        child.once("spawn", resolve);
        child.once("error", reject);
      });
      child.unref();
    } catch (error) {
      await rm(partial, { force: true }).catch(() => {});
      await record({ phase: "failed", error: error.message });
    } finally { busy = false; }
  }

  async function start() {
    if (busy) throw fail("Une mise à jour est déjà en cours.", 409);
    if ((await persistedProgress())?.phase === "installing") throw fail("L’installation est déjà en cours.", 409);
    if (!await isInstalled()) throw fail("La mise à jour automatique nécessite la version Windows installée.", 409);
    const release = await latestRelease();
    if (!newerVersion(release.version, await currentVersion())) throw fail("BARZ est déjà à jour.", 409);
    busy = true;
    void downloadAndInstall(release);
    return { accepted: true, version: release.version };
  }

  return { status, start, token };
}
