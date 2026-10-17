import { createServer } from "node:http";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { ContractValidationError } from "../../packages/contracts/src/index.js";
import { compileRecipe, RecipeInputError } from "../../packages/prompt-runtime/src/index.js";
import { FixedTabError, orderedNavigation, RegistryConflictError } from "../../packages/registry/src/index.js";
import {
  compilePromptLibrary,
  defaultLibraryConfiguration,
  reconcileLibraryConfiguration,
  validateLibraryConfiguration
} from "../../packages/prompt-libraries/src/index.js";
import { AtlasSetupStore, SetupConflictError } from "../../packages/setups/src/index.js";
import { createImageAnalyzerService } from "./image-analyzer-service.js";
import { renderImageSlices, renderImageSlicesToDirectory } from "./image-slicer-service.js";
import { createVideoDirectorService } from "./video-director-service.js";
import {
  atlasAiAdvisor,
  atlasAiCompose,
  atlasAiRefine,
  atlasAiStatus,
  atlasAiVideoDirect,
  createVirtualCameraService,
  solverAutoblock
} from "./blocking-engine-v5.js";
import {
  applyImperfectionPreset,
  BOARD_CATALOG,
  CAMERA_SUITE_CATALOG,
  CINEMA_HELPER_CATALOG,
  CCP_CATALOG,
  BEAUTY_CATALOG,
  compileBoard,
  compileCameraSuite,
  compileCinemaHelper,
  compileCcp,
  compileBeauty,
  compileCinematicShoot,
  compileDesigner,
  compileEnhancer,
  compileFacsSheet,
  compileGoodies,
  compileImperfection,
  compileKnolling,
  compileMultishot,
  compileSeedance,
  compileRealism,
  compileSheet,
  copyAllEnhancer,
  defaultToolConfiguration,
  ENHANCER_CATALOG,
  FACS_CATALOG,
  GOODIES_CATALOG,
  IMAGE_SLICER_CATALOG,
  PAINT_STUDIO_CATALOG,
  IMAGE_GRABBER_CATALOG,
  IMAGE_ANALYZER_CATALOG,
  VIDEO_DIRECTOR_CATALOG,
  VIDEO_EDITOR_CATALOG,
  BLOCKING_STUDIO_CATALOG,
  WORKFLOW_3D_CATALOG,
  imperfectionStats,
  IMPERFECTION_CATALOG,
  KNOLLING_CATALOG,
  MULTISHOT_CATALOG,
  SEEDANCE_CATALOG,
  CINEMATIC_SHOOT_CATALOG,
  DESIGNER_CATALOG,
  REALISM_CATALOG,
  SHEET_CATALOG,
  validateToolConfiguration
} from "../../packages/tool-adapters/src/index.js";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const publicDirectory = path.join(moduleDirectory, "public");
const JSON_LIMIT = 128 * 1024 * 1024;
const LIBRARY_GLB_HOST = "barz-ai-lib.placenta.tv";
const LIBRARY_GLB_PREFIX = "/AI-Asset-Lib-online/media/";
const LIBRARY_GLB_LIMIT = 96 * 1024 * 1024;
const BUILTIN_TOOL_IDS = new Set([
  "apg", "barz-enhancer", "angle-3d", "relighting-3d", "imperfection", "banana-helper", "barz-beauty", "realism-forge",
  "cinematic-shoot", "facs-sheet-generator", "barzy-board", "veo-suite", "cccp",
  "barzy-sheet", "barz-designer", "knolling", "multishot", "seedance", "cinema-helper",
  "image-slicer", "paint-studio", "image-grabber", "image-analyzer", "video-director", "motion-emulator", "video-editor", "blocking-studio", "object-scale-chart", "youtube-extractor", "workflow-3d"
]);
const STATIC_FILES = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/suite.html", ["suite.html", "text/html; charset=utf-8"]],
  ["/suite-shell.js", ["suite-shell.js", "text/javascript; charset=utf-8"]],
  ["/suite-shell.css", ["suite-shell.css", "text/css; charset=utf-8"]],
  ["/suite-bridge.js", ["suite-bridge.js", "text/javascript; charset=utf-8"]],
  ["/preferences.js", ["preferences.js", "text/javascript; charset=utf-8"]],
  ["/global-ai-controls.js", ["global-ai-controls.js", "text/javascript; charset=utf-8"]],
  ["/global-ai-controls.css", ["global-ai-controls.css", "text/css; charset=utf-8"]],
  ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
  ["/tool-workspace.js", ["tool-workspace.js", "text/javascript; charset=utf-8"]],
  ["/apg-studio.js", ["apg-studio.js", "text/javascript; charset=utf-8"]],
  ["/apg-data.js", ["apg-data.js", "text/javascript; charset=utf-8"]],
  ["/image-slicer.js", ["image-slicer.js", "text/javascript; charset=utf-8"]],
  ["/image-slicer-pro.js", ["image-slicer-pro.js", "text/javascript; charset=utf-8"]],
  ["/paint-studio.js", ["paint-studio.js", "text/javascript; charset=utf-8"]],
  ["/image-grabber.js", ["image-grabber.js", "text/javascript; charset=utf-8"]],
  ["/image-analyzer.js", ["image-analyzer.js", "text/javascript; charset=utf-8"]],
  ["/video-director.js", ["video-director.js", "text/javascript; charset=utf-8"]],
  ["/motion-emulator.js", ["motion-emulator.js", "text/javascript; charset=utf-8"]],
  ["/video-editor.js", ["video-editor.js", "text/javascript; charset=utf-8"]],
  ["/blocking-studio.js", ["blocking-studio.js", "text/javascript; charset=utf-8"]],
  ["/object-scale-chart-tool.js", ["object-scale-chart-tool.js", "text/javascript; charset=utf-8"]],
  ["/youtube-extractor.js", ["youtube-extractor.js", "text/javascript; charset=utf-8"]],
  ["/workflow-3d.js", ["workflow-3d.js", "text/javascript; charset=utf-8"]],
  ["/angle-relighting-studio.js", ["angle-relighting-studio.js", "text/javascript; charset=utf-8"]],
  ["/video-director-theme.css", ["video-director-theme.css", "text/css; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
  ["/facs-assets/fac-reference.jpg", ["facs-assets/fac-reference.jpg", "image/jpeg"]],
  ["/facs-assets/fac-reference-giscard.jpg", ["facs-assets/fac-reference-giscard.jpg", "image/jpeg"]]
]);
const FACS_REFERENCE_CODES = [
  "AU1", "AU2", "AU4", "AU5", "AU6", "AU7", "AU9", "AU10", "AU11", "AU12", "AU13", "AU14", "AU15", "AU16", "AU17", "AU18", "AU20", "AU22", "AU23", "AU24", "AU25", "AU26", "AU27", "AU28", "AU41", "AU42", "AU43", "AU44", "AU56", "AU57", "AU58", "AU52", "AU53", "AU54", "AU55", "AU56B", "AU57B", "AU58B", "AU61", "AU62", "AU63", "AU64", "AU71", "AU72", "AU81", "AU82", "AU83", "AU84", "AU85"
];
for (const reference of ["chubby", "giscard"]) {
  for (const code of FACS_REFERENCE_CODES) {
    STATIC_FILES.set(`/facs-assets/${reference}/${code}.jpg`, [`facs-assets/${reference}/${code}.jpg`, "image/jpeg"]);
  }
}

function headers(contentType) {
  return {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self' http://127.0.0.1:4317 http://localhost:4317 http://127.0.0.1:8779 http://localhost:8779 http://127.0.0.1:8756 http://localhost:8756; frame-src 'self' http://127.0.0.1:4317 http://localhost:4317 http://127.0.0.1:8779 http://localhost:8779 http://127.0.0.1:8756 http://localhost:8756; object-src 'none'; frame-ancestors 'self'; base-uri 'none'; form-action 'self'"
  };
}

function embeddedHeaders(contentType) {
  return {
    ...headers(contentType),
    "X-Frame-Options": "SAMEORIGIN",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Content-Security-Policy": "default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: http://127.0.0.1:4317 http://localhost:4317; media-src 'self' data: blob:; connect-src 'self' data: blob: http://127.0.0.1:4317 http://localhost:4317 https://staticimgly.com; worker-src 'self' blob:; frame-ancestors 'self'; base-uri 'self'; form-action 'self'"
  };
}

function publicContentType(fileName) {
  return ({
    ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8", ".wasm": "application/wasm",
    ".onnx": "application/octet-stream", ".bin": "application/octet-stream",
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml", ".webm": "video/webm", ".mp4": "video/mp4",
    ".woff2": "font/woff2", ".woff": "font/woff"
  })[path.extname(fileName).toLowerCase()] || "application/octet-stream";
}

async function embeddedPublicAsset(pathname) {
  let relative;
  try { relative = decodeURIComponent(pathname).replace(/^\/+/, ""); } catch { return null; }
  if (!(relative.startsWith("video-editor/") || relative.startsWith("object-scale-chart/") || relative.startsWith("assets/"))) return null;
  const fileName = path.resolve(publicDirectory, relative);
  const root = `${path.resolve(publicDirectory)}${path.sep}`;
  if (!fileName.startsWith(root)) return null;
  try { return { content: await readFile(fileName), contentType: publicContentType(fileName) }; }
  catch (error) { if (error.code === "ENOENT" || error.code === "EISDIR") return null; throw error; }
}

function normalizeRuntimeImageReferences(value) {
  if (typeof value === "string") {
    return value
      .replace(/\[\s*(?:IMG|Image)[_\s-]*(\d+)\s*\]/gi, "@image$1")
      .replace(/@(?:IMG|Image)[_\s-]*(\d+)/gi, "@image$1");
  }
  if (Array.isArray(value)) return value.map(normalizeRuntimeImageReferences);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, normalizeRuntimeImageReferences(entry)]));
  }
  return value;
}

function sendJson(response, status, value) {
  response.writeHead(status, headers("application/json; charset=utf-8"));
  response.end(`${JSON.stringify(normalizeRuntimeImageReferences(value))}\n`);
}

function sendBinary(response, status, buffer, { contentType = "application/octet-stream", fileName = "download.bin" } = {}) {
  response.writeHead(status, {
    ...headers(contentType),
    "Content-Disposition": `attachment; filename="${String(fileName).replace(/["\\\r\n]+/g, "-").slice(0, 160)}"`,
    "Content-Length": buffer.length
  });
  response.end(buffer);
}

function sendError(response, error) {
  const status = error instanceof RegistryConflictError || error instanceof SetupConflictError ? 409
    : error instanceof ContractValidationError || error instanceof RecipeInputError || error instanceof FixedTabError ? 400
      : error?.code === "ENOENT" ? 404 : 500;
  sendJson(response, status, {
    error: {
      code: error?.code ?? "INTERNAL_ERROR",
      message: status === 500 ? "Build could not complete this request." : error.message,
      path: error?.path
    }
  });
}

async function readJson(request) {
  if (!(request.headers["content-type"] ?? "").toLowerCase().startsWith("application/json")) {
    throw new ContractValidationError("must be application/json", "Content-Type");
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > JSON_LIMIT) throw new ContractValidationError(`exceeds ${JSON_LIMIT} bytes`, "body");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ContractValidationError("must contain valid JSON", "body");
  }
}

function validateLibraryGlbAsset(value) {
  const asset = value?.asset;
  if (value?.type !== "barz:import-glb" || value?.schemaVersion !== "1.0" || value?.source !== "barz-ai-lib") {
    throw new ContractValidationError("must be a barz:import-glb 1.0 message", "body");
  }
  if (!asset || typeof asset !== "object") throw new ContractValidationError("must be an object", "asset");
  let modelUrl;
  try { modelUrl = new URL(asset.modelUrl); }
  catch { throw new ContractValidationError("must be a valid URL", "asset.modelUrl"); }
  if (modelUrl.protocol !== "https:" || modelUrl.hostname !== LIBRARY_GLB_HOST ||
      !modelUrl.pathname.startsWith(LIBRARY_GLB_PREFIX) || !modelUrl.pathname.toLowerCase().endsWith(".glb")) {
    throw new ContractValidationError("must be an allowlisted BARZ library GLB URL", "asset.modelUrl");
  }
  const fileName = path.basename(String(asset.fileName || modelUrl.pathname.split("/").pop() || "library-model.glb"))
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "-").slice(0, 180);
  if (!fileName.toLowerCase().endsWith(".glb")) throw new ContractValidationError("must end in .glb", "asset.fileName");
  return { modelUrl, fileName };
}

async function fetchLibraryGlb(message, fetcher) {
  const { modelUrl, fileName } = validateLibraryGlbAsset(message);
  const upstream = await fetcher(modelUrl, {
    redirect: "manual",
    signal: AbortSignal.timeout(45_000),
    headers: { Accept: "model/gltf-binary,application/octet-stream" }
  });
  if (!upstream.ok) throw new ContractValidationError(`library returned HTTP ${upstream.status}`, "asset.modelUrl");
  const declaredSize = Number(upstream.headers.get("content-length") || 0);
  if (declaredSize > LIBRARY_GLB_LIMIT) throw new ContractValidationError("GLB exceeds 96 MiB", "asset.modelUrl");
  const chunks = [];
  let size = 0;
  for await (const chunk of upstream.body || []) {
    const bytes = Buffer.from(chunk);
    size += bytes.length;
    if (size > LIBRARY_GLB_LIMIT) throw new ContractValidationError("GLB exceeds 96 MiB", "asset.modelUrl");
    chunks.push(bytes);
  }
  const buffer = Buffer.concat(chunks);
  if (buffer.length < 12 || buffer.subarray(0, 4).toString("ascii") !== "glTF") {
    throw new ContractValidationError("downloaded file is not a binary glTF", "asset.modelUrl");
  }
  return { buffer, fileName };
}

async function readBinary(request) {
  if (!(request.headers["content-type"] ?? "").toLowerCase().startsWith("application/vnd.barz-slicer-request")) {
    throw new ContractValidationError("must be application/vnd.barz-slicer-request", "Content-Type");
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > JSON_LIMIT) throw new ContractValidationError(`exceeds ${JSON_LIMIT} bytes`, "body");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function selectNativeDirectory() {
  if (process.platform !== "win32") throw new Error("Native folder selection is only available on Windows.");
  const script = [
    "Add-Type -AssemblyName System.Windows.Forms",
    "$dialog = New-Object System.Windows.Forms.FolderBrowserDialog",
    "$dialog.Description = 'Choisir le dossier des slices BARZ'",
    "$dialog.ShowNewFolderButton = $true",
    "$owner = New-Object System.Windows.Forms.Form",
    "$owner.TopMost = $true",
    "$owner.ShowInTaskbar = $false",
    "if ($dialog.ShowDialog($owner) -eq [System.Windows.Forms.DialogResult]::OK) {",
    "  [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)",
    "  [Console]::Write($dialog.SelectedPath)",
    "  exit 0",
    "}",
    "exit 2"
  ].join("\n");
  return new Promise((resolve, reject) => {
    const child = spawn("powershell.exe", ["-NoLogo", "-NoProfile", "-STA", "-Command", script], {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 2) return resolve(null);
      if (code !== 0) return reject(new Error(Buffer.concat(stderr).toString("utf8").trim() || "Folder selection failed."));
      const selected = Buffer.concat(stdout).toString("utf8").trim();
      resolve(selected || null);
    });
  });
}

async function selectNativePaintProjectFile(suggestedName) {
  if (process.platform !== "win32") throw new Error("Native file selection is only available on Windows.");
  const fileName = path.basename(String(suggestedName || "Projet.barzpaint"))
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "-")
    .slice(0, 180) || "Projet.barzpaint";
  const script = [
    "Add-Type -AssemblyName System.Windows.Forms",
    "$dialog = New-Object System.Windows.Forms.SaveFileDialog",
    "$dialog.Title = 'Enregistrer le projet Paint Studio'",
    "$dialog.Filter = 'Projet BARZ Paint (*.barzpaint)|*.barzpaint'",
    "$dialog.DefaultExt = 'barzpaint'",
    "$dialog.AddExtension = $true",
    "$dialog.FileName = $env:BARZ_PAINT_FILENAME",
    "$owner = New-Object System.Windows.Forms.Form",
    "$owner.TopMost = $true",
    "$owner.ShowInTaskbar = $false",
    "if ($dialog.ShowDialog($owner) -eq [System.Windows.Forms.DialogResult]::OK) {",
    "  [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)",
    "  [Console]::Write($dialog.FileName)",
    "  exit 0",
    "}",
    "exit 2"
  ].join("\n");
  return new Promise((resolve, reject) => {
    const child = spawn("powershell.exe", ["-NoLogo", "-NoProfile", "-STA", "-Command", script], {
      windowsHide: true,
      env: { ...process.env, BARZ_PAINT_FILENAME: fileName },
      stdio: ["ignore", "pipe", "pipe"]
    });
    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 2) return resolve(null);
      if (code !== 0) return reject(new Error(Buffer.concat(stderr).toString("utf8").trim() || "File selection failed."));
      const selected = Buffer.concat(stdout).toString("utf8").trim();
      resolve(selected || null);
    });
  });
}

function assertLocalRequest(request, address, mutating) {
  const host = request.headers.host ?? "";
  if (!new RegExp(`^(?:127\\.0\\.0\\.1|localhost):${address.port}$`, "i").test(host)) {
    throw new ContractValidationError("unexpected local host", "Host");
  }
  if (!mutating || !request.headers.origin) return;
  const allowed = new Set([`http://127.0.0.1:${address.port}`, `http://localhost:${address.port}`]);
  if (!allowed.has(request.headers.origin)) throw new ContractValidationError("cross-origin mutation refused", "Origin");
}

function publicWorkspace(result) {
  return { ...result, navigation: orderedNavigation(result.registry) };
}

export async function createBuildServer({
  dataDirectory,
  port = 0,
  host = "127.0.0.1",
  legacySettingsPath: injectedLegacySettingsPath,
  sharedSecretsDirectory: injectedSharedSecretsDirectory,
  slicerDirectoryPicker: injectedSlicerDirectoryPicker,
  paintProjectFilePicker: injectedPaintProjectFilePicker,
  libraryModelFetcher = fetch
} = {}) {
  if (!dataDirectory) throw new TypeError("createBuildServer requires an injected dataDirectory");
  const store = new AtlasSetupStore({
    directory: dataDirectory,
    defaultToolConfigurations: Object.fromEntries(
      [...BUILTIN_TOOL_IDS].map((toolId) => [toolId, defaultToolConfiguration(toolId)])
    ),
    defaultToolConfigurationForRegistry: (toolId, registry) => {
      const library = registry.libraries?.find(({ id }) => id === toolId);
      return library ? defaultLibraryConfiguration(library) : undefined;
    },
    validateToolConfiguration,
    resetToolConfiguration: (toolId, current, defaults) => {
      if (toolId === "imperfection" && current?.customPresets) defaults.customPresets = current.customPresets;
      if (toolId === "facs-sheet-generator" && current?.customCards) {
        defaults.customCards = current.customCards;
        if (["builtin:chubby", "builtin:giscard"].includes(current.activeReferenceId)
          || current.customCards.some(({ id }) => id === current.activeReferenceId)) defaults.activeReferenceId = current.activeReferenceId;
      }
      if (toolId === "veo-suite" && current?.customPrompts) defaults.customPrompts = current.customPrompts;
      if (toolId === "cccp" && current?.customOutputs) defaults.customOutputs = current.customOutputs;
      if (toolId === "barzy-sheet" && current?.customOutputs) defaults.customOutputs = current.customOutputs;
      if (toolId === "barz-designer" && current?.customOutputs) defaults.customOutputs = current.customOutputs;
      if (toolId === "knolling" && current?.customOutputs) defaults.customOutputs = current.customOutputs;
      if (toolId === "multishot" && current?.customOutputs) {
        defaults.customOutputs = current.customOutputs;
      }
      if (toolId === "seedance") {
        if (current?.references) defaults.references = current.references;
        if (current?.finals) defaults.finals = current.finals;
      }
      return defaults;
    }
  });
  await store.init();
  const slicerDirectoryPicker = injectedSlicerDirectoryPicker || selectNativeDirectory;
  const paintProjectFilePicker = injectedPaintProjectFilePicker || selectNativePaintProjectFile;
  const slicerDestinations = new Map();
  const legacySettingsPath = injectedLegacySettingsPath || process.env.PROMPT_ATLAS_LEGACY_SETTINGS
    || path.resolve(moduleDirectory, "../../../../Prompt Atlas 4.5/data/settings.local.json");
  const sharedSecretsDirectory = injectedSharedSecretsDirectory || process.env.BARZ_SHARED_SECRETS_DIR
    || path.join(dataDirectory, "shared-api");
  const uiPreferencesPath = path.join(sharedSecretsDirectory, "ui-preferences.json");

  function normalizeUiPreferences(value = {}) {
    return {
      theme: value.theme === "light" ? "light" : "dark",
      language: value.language === "fr" ? "fr" : "en",
      aiProvider: ["openai", "anthropic", "deepseek", "google"].includes(value.aiProvider) ? value.aiProvider : "openai",
      aiModel: typeof value.aiModel === "string" && value.aiModel.trim() ? value.aiModel.trim() : "gpt-5.6-terra",
      updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : ""
    };
  }

  async function readUiPreferences() {
    try {
      return normalizeUiPreferences(JSON.parse(await readFile(uiPreferencesPath, "utf8")));
    } catch (error) {
      if (error.code !== "ENOENT" && !(error instanceof SyntaxError)) throw error;
      return normalizeUiPreferences();
    }
  }

  async function writeUiPreferences(value) {
    const current = await readUiPreferences();
    const preferences = normalizeUiPreferences({ ...current, ...value, updatedAt: new Date().toISOString() });
    await mkdir(sharedSecretsDirectory, { recursive: true });
    await writeFile(uiPreferencesPath, `${JSON.stringify(preferences, null, 2)}\n`, "utf8");
    return preferences;
  }
  const imageAnalyzer = createImageAnalyzerService({
    dataDirectory,
    legacySettingsPath,
    sharedSecretsDirectory
  });
  await imageAnalyzer.init();
  async function sharedAiSettings() {
    const [settings, preferences] = await Promise.all([imageAnalyzer.privateSettings(), readUiPreferences()]);
    return { ...settings, model: preferences.aiModel || settings.model };
  }
  const videoDirector = createVideoDirectorService({ getSettings: sharedAiSettings });
  let libraryEditorProcess = null;
  let libraryEditorStarting = null;
  let libraryEditorRuntimeRoot = "";
  const libraryEditorUrl = "http://127.0.0.1:8779/";
  let youtubeExtractorProcess = null;
  let youtubeExtractorStarting = null;
  const youtubeExtractorUrl = "http://127.0.0.1:8756/";

  async function youtubeExtractorEnvironment() {
    try {
      const response = await fetch(`${youtubeExtractorUrl}api/env`, { signal: AbortSignal.timeout(1_000) });
      if (!response.ok) return null;
      const value = await response.json();
      return typeof value?.ytdlp === "boolean" && typeof value?.ffmpeg === "boolean" ? value : null;
    } catch { return null; }
  }

  async function startYoutubeExtractor(command, args) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: path.join(moduleDirectory, "youtube-extractor"),
        windowsHide: true,
        stdio: "ignore",
        env: {
          ...process.env,
          YTX_NO_BROWSER: "1",
          BARZ_YT_EXTRACTOR_PORT: "8756",
          BARZ_YT_EXTRACTOR_DATA_DIR: path.join(dataDirectory, "YouTube Extractor")
        }
      });
      child.once("error", reject);
      child.once("spawn", () => resolve(child));
    });
  }

  async function ensureYoutubeExtractor() {
    const current = await youtubeExtractorEnvironment();
    if (current) return { ready: true, url: youtubeExtractorUrl, environment: current };
    if (youtubeExtractorStarting) return youtubeExtractorStarting;
    youtubeExtractorStarting = (async () => {
      await mkdir(path.join(dataDirectory, "YouTube Extractor"), { recursive: true });
      const script = path.join(moduleDirectory, "youtube-extractor", "server.py");
      let lastError;
      for (const [command, args] of process.platform === "win32"
        ? [["py", ["-3", script]], ["python", [script]]]
        : [["python3", [script]], ["python", [script]]]) {
        try { youtubeExtractorProcess = await startYoutubeExtractor(command, args); break; }
        catch (error) { lastError = error; }
      }
      if (!youtubeExtractorProcess) throw new Error(`Python 3 is required for YouTube Extractor${lastError?.message ? `: ${lastError.message}` : "."}`);
      for (let attempt = 0; attempt < 48; attempt += 1) {
        const environment = await youtubeExtractorEnvironment();
        if (environment) return { ready: true, url: youtubeExtractorUrl, environment };
        if (youtubeExtractorProcess.exitCode !== null) throw new Error("YouTube Extractor stopped during startup.");
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      throw new Error("YouTube Extractor did not answer in time.");
    })().catch((error) => ({ ready: false, url: youtubeExtractorUrl, error: error.message })).finally(() => { youtubeExtractorStarting = null; });
    return youtubeExtractorStarting;
  }

  async function libraryEditorReady() {
    try {
      const response = await fetch(`${libraryEditorUrl}api/projets`, { signal: AbortSignal.timeout(900) });
      return response.ok;
    } catch { return false; }
  }

  async function prepareLibraryEditorAt(runtimeRoot) {
    const runtimeApp = path.join(runtimeRoot, "_app");
    const source = path.join(moduleDirectory, "library-editor");
    await Promise.all([
      mkdir(runtimeApp, { recursive: true }),
      mkdir(path.join(runtimeRoot, "projects", "Quick Cut"), { recursive: true }),
      mkdir(path.join(runtimeRoot, "libraries"), { recursive: true }),
      mkdir(path.join(runtimeRoot, "_data"), { recursive: true })
    ]);
    await Promise.all([
      copyFile(path.join(source, "app.html"), path.join(runtimeApp, "app.html")),
      copyFile(path.join(source, "serveur.py"), path.join(runtimeApp, "serveur.py")),
      writeFile(path.join(runtimeApp, "bibliotheque.json"), `${JSON.stringify({
        titre: "BARZ Editor",
        port: 8779,
        projet_rapide: "Quick Cut",
        projets_dans: "projects",
        bibliotheques_dans: "libraries",
        donnees: "_data",
        lecture_seule: false,
        format: { w: 1920, h: 1080, fps: 25 }
      }, null, 2)}\n`, "utf8")
    ]);
    libraryEditorRuntimeRoot = runtimeRoot;
    return path.join(runtimeApp, "serveur.py");
  }

  async function prepareLibraryEditor() {
    const candidates = [...new Set([
      process.env.BARZ_LIBRARY_EDITOR_DATA_DIR,
      path.join(dataDirectory, "Library Editor"),
      path.resolve(moduleDirectory, "../../.runtime-data/Library Editor"),
      path.join(os.tmpdir(), "BARZ Suite 6", "Library Editor")
    ].filter(Boolean).map((candidate) => path.resolve(candidate)))];
    let lastError;
    for (const runtimeRoot of candidates) {
      try { return await prepareLibraryEditorAt(runtimeRoot); }
      catch (error) {
        lastError = error;
        if (!["EACCES", "EPERM", "EROFS"].includes(error?.code)) throw error;
      }
    }
    throw lastError || new Error("Aucun emplacement local n’est accessible pour BARZ Editor.");
  }

  async function spawnPython(command, args, cwd) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
        windowsHide: true,
        stdio: "ignore",
        env: { ...process.env, BARZ_EMBEDDED_EDITOR: "1" }
      });
      child.once("error", reject);
      child.once("spawn", () => resolve(child));
    });
  }

  async function ensureLibraryEditor() {
    if (await libraryEditorReady()) return { ready: true, url: libraryEditorUrl };
    if (libraryEditorStarting) return libraryEditorStarting;
    libraryEditorStarting = (async () => {
      const script = await prepareLibraryEditor();
      const cwd = path.dirname(script);
      let lastError;
      for (const [command, args] of process.platform === "win32"
        ? [["py", ["-3", script]], ["python", [script]]]
        : [["python3", [script]], ["python", [script]]]) {
        try { libraryEditorProcess = await spawnPython(command, args, cwd); break; }
        catch (error) { lastError = error; }
      }
      if (!libraryEditorProcess) throw new Error(`Python 3 est nécessaire pour BARZ Editor${lastError?.message ? ` : ${lastError.message}` : "."}`);
      for (let attempt = 0; attempt < 48; attempt += 1) {
        if (await libraryEditorReady()) return { ready: true, url: libraryEditorUrl, dataDirectory: libraryEditorRuntimeRoot };
        if (libraryEditorProcess.exitCode !== null) throw new Error("BARZ Editor s’est arrêté pendant son démarrage.");
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      throw new Error("BARZ Editor n’a pas répondu dans le délai prévu.");
    })().catch((error) => ({ ready: false, url: libraryEditorUrl, error: error.message })).finally(() => { libraryEditorStarting = null; });
    return libraryEditorStarting;
  }

  let virtualCameraServicePromise = null;
  const server = createServer(async (request, response) => {
    try {
      const address = server.address();
      const url = new URL(request.url, `http://${request.headers.host ?? "127.0.0.1"}`);
      const mutating = !["GET", "HEAD"].includes(request.method);
      assertLocalRequest(request, address, mutating);

      if (request.method === "GET" && url.pathname === "/api/v1/health") {
        return sendJson(response, 200, { service: "prompt-atlas-build", version: "0.33.46" });
      }
      if (request.method === "GET" && url.pathname === "/api/vcam/info") {
        virtualCameraServicePromise ??= createVirtualCameraService(server);
        const virtualCameraService = await virtualCameraServicePromise;
        return sendJson(response, 200, await virtualCameraService.info());
      }
      if (request.method === "GET" && url.pathname === "/api/v1/preferences") {
        return sendJson(response, 200, await readUiPreferences());
      }
      if (request.method === "PUT" && url.pathname === "/api/v1/preferences") {
        const preferences = await writeUiPreferences(await readJson(request));
        await imageAnalyzer.updateSettings({ model: preferences.aiModel });
        return sendJson(response, 200, preferences);
      }
      if (request.method === "GET" && url.pathname === "/api/v1/library-editor/status") {
        return sendJson(response, 200, await ensureLibraryEditor());
      }
      if (request.method === "GET" && url.pathname === "/api/v1/youtube-extractor/status") {
        return sendJson(response, 200, await ensureYoutubeExtractor());
      }
      if (request.method === "GET" && url.pathname === "/api/v1/registry") {
        return sendJson(response, 200, publicWorkspace(await store.read()));
      }
      if (request.method === "POST" && url.pathname === "/api/v1/blocking/import-glb") {
        const result = await fetchLibraryGlb(await readJson(request), libraryModelFetcher);
        return sendBinary(response, 200, result.buffer, {
          contentType: "model/gltf-binary",
          fileName: result.fileName
        });
      }
      if (request.method === "POST" && url.pathname === "/api/v1/tools/image-slicer/destination") {
        const selected = await slicerDirectoryPicker();
        if (!selected) return sendJson(response, 200, { cancelled: true });
        const token = randomUUID();
        slicerDestinations.set(token, path.resolve(selected));
        return sendJson(response, 200, { token, name: path.basename(selected), cancelled: false });
      }
      if (request.method === "POST" && url.pathname === "/api/v1/tools/image-slicer/render") {
        const output = await renderImageSlices(await readBinary(request));
        return sendBinary(response, 200, output, {
          contentType: "application/vnd.barz-slicer-response",
          fileName: "barz-slices.bin"
        });
      }
      if (request.method === "POST" && url.pathname === "/api/v1/tools/image-slicer/render-to-directory") {
        const token = String(request.headers["x-barz-destination-token"] || "");
        const destination = slicerDestinations.get(token);
        if (!destination) throw new ContractValidationError("unknown or expired destination", "X-Barz-Destination-Token");
        return sendJson(response, 200, await renderImageSlicesToDirectory(await readBinary(request), destination));
      }
      if (request.method === "POST" && url.pathname === "/api/v1/tools/paint-studio/save-project") {
        const body = await readJson(request);
        if (!body.project || typeof body.project !== "object" || Array.isArray(body.project)) {
          throw new ContractValidationError("must be an object", "project");
        }
        const selected = await paintProjectFilePicker(body.suggestedName);
        if (!selected) return sendJson(response, 200, { cancelled: true });
        const content = `${JSON.stringify(body.project, null, 2)}\n`;
        await writeFile(selected, content, "utf8");
        return sendJson(response, 200, { cancelled: false, path: selected, name: path.basename(selected) });
      }
      if (request.method === "GET" && url.pathname === "/api/v1/tool-catalog") {
        return sendJson(response, 200, {
          enhancer: { ...ENHANCER_CATALOG, defaults: defaultToolConfiguration("barz-enhancer") },
          goodies: { ...GOODIES_CATALOG, defaults: defaultToolConfiguration("banana-helper") },
          beauty: { ...BEAUTY_CATALOG, defaults: defaultToolConfiguration("barz-beauty") },
          realism: { ...REALISM_CATALOG, defaults: defaultToolConfiguration("realism-forge") },
          cinematicShoot: { ...CINEMATIC_SHOOT_CATALOG, defaults: defaultToolConfiguration("cinematic-shoot") },
          facs: { ...FACS_CATALOG, defaults: defaultToolConfiguration("facs-sheet-generator") },
          board: { ...BOARD_CATALOG, defaults: defaultToolConfiguration("barzy-board") },
          cameraSuite: { ...CAMERA_SUITE_CATALOG, defaults: defaultToolConfiguration("veo-suite") },
          ccp: { ...CCP_CATALOG, defaults: defaultToolConfiguration("cccp") },
          sheet: { ...SHEET_CATALOG, defaults: defaultToolConfiguration("barzy-sheet") },
          designer: { ...DESIGNER_CATALOG, defaults: defaultToolConfiguration("barz-designer") },
          knolling: { ...KNOLLING_CATALOG, defaults: defaultToolConfiguration("knolling") },
          multishot: { ...MULTISHOT_CATALOG, defaults: defaultToolConfiguration("multishot") },
          seedance: { ...SEEDANCE_CATALOG, defaults: defaultToolConfiguration("seedance") },
          cinemaHelper: { ...CINEMA_HELPER_CATALOG, defaults: defaultToolConfiguration("cinema-helper") },
          imageSlicer: { ...IMAGE_SLICER_CATALOG, defaults: defaultToolConfiguration("image-slicer") },
          paintStudio: { ...PAINT_STUDIO_CATALOG, defaults: defaultToolConfiguration("paint-studio") },
          imageGrabber: { ...IMAGE_GRABBER_CATALOG, defaults: defaultToolConfiguration("image-grabber") },
          imageAnalyzer: { ...IMAGE_ANALYZER_CATALOG, defaults: defaultToolConfiguration("image-analyzer") },
          videoDirector: { ...VIDEO_DIRECTOR_CATALOG, defaults: defaultToolConfiguration("video-director") },
          videoEditor: { ...VIDEO_EDITOR_CATALOG, defaults: defaultToolConfiguration("video-editor") },
          blockingStudio: { ...BLOCKING_STUDIO_CATALOG, defaults: defaultToolConfiguration("blocking-studio") },
          workflow3d: { ...WORKFLOW_3D_CATALOG, defaults: defaultToolConfiguration("workflow-3d") },
          imperfection: {
            defaults: IMPERFECTION_CATALOG.defaults,
            ranges: IMPERFECTION_CATALOG.ranges,
            enums: IMPERFECTION_CATALOG.enums,
            presetIds: Object.keys(IMPERFECTION_CATALOG.presets)
          }
        });
      }
      if (request.method === "GET" && url.pathname === "/api/v1/image-analyzer/settings") {
        return sendJson(response, 200, await imageAnalyzer.publicSettings());
      }
      if (request.method === "PUT" && url.pathname === "/api/v1/image-analyzer/settings") {
        return sendJson(response, 200, await imageAnalyzer.updateSettings(await readJson(request)));
      }
      if (request.method === "POST" && url.pathname === "/api/v1/image-analyzer/analyze") {
        try {
          const body = await readJson(request);
          const preferences = await readUiPreferences();
          return sendJson(response, 200, await imageAnalyzer.analyze({ ...body, model: body.model || preferences.aiModel }));
        } catch (error) {
          return sendJson(response, Number(error.status) || 502, {
            error: { code: "IMAGE_ANALYSIS_FAILED", message: error.message || "L’analyse a échoué." }
          });
        }
      }
      if (request.method === "POST" && url.pathname === "/api/v1/video-director/analyze") {
        try {
          return sendJson(response, 200, await videoDirector.analyze(await readJson(request)));
        } catch (error) {
          return sendJson(response, Number(error.status) || 502, { error: { code: "VIDEO_ANALYSIS_FAILED", message: error.message || "L’analyse vidéo a échoué." } });
        }
      }
      if (request.method === "GET" && url.pathname === "/api/v1/ai/status") {
        return sendJson(response, 200, await atlasAiStatus(await sharedAiSettings()));
      }
      if (request.method === "POST" && ["/api/v1/ai/advisor", "/api/ai/advisor"].includes(url.pathname)) {
        const result = await atlasAiAdvisor(await readJson(request), await sharedAiSettings());
        return sendJson(response, result.status, result.body);
      }
      if (request.method === "POST" && ["/api/v1/ai/compose", "/api/ai/compose"].includes(url.pathname)) {
        const result = await atlasAiCompose(await readJson(request), await sharedAiSettings());
        return sendJson(response, result.status, result.body);
      }
      if (request.method === "POST" && ["/api/v1/ai/refine", "/api/ai/refine"].includes(url.pathname)) {
        const result = await atlasAiRefine(await readJson(request), await sharedAiSettings());
        return sendJson(response, result.status, result.body);
      }
      if (request.method === "POST" && ["/api/v1/ai/video-direct", "/api/ai/video-direct"].includes(url.pathname)) {
        const result = await atlasAiVideoDirect(await readJson(request), await sharedAiSettings());
        return sendJson(response, result.status, result.body);
      }
      if (request.method === "POST" && url.pathname === "/api/v1/video-director/transcribe") {
        try {
          return sendJson(response, 200, await videoDirector.transcribe(await readJson(request)));
        } catch (error) {
          return sendJson(response, Number(error.status) || 502, { error: { code: "VIDEO_TRANSCRIPTION_FAILED", message: error.message || "La transcription a échoué." } });
        }
      }
      if (request.method === "POST" && url.pathname === "/api/v1/video-director/sample-frames") {
        try {
          return sendJson(response, 200, await videoDirector.sampleFrames(await readJson(request)));
        } catch (error) {
          return sendJson(response, Number(error.status) || 500, { error: { code: "VIDEO_SAMPLING_FAILED", message: error.message || "L’extraction des photogrammes a échoué." } });
        }
      }
      if (request.method === "POST" && url.pathname === "/api/v1/video-director/export") {
        try {
          const result = await videoDirector.exportMedia(await readJson(request));
          return sendBinary(response, 200, result.buffer, result);
        } catch (error) {
          return sendJson(response, Number(error.status) || 500, { error: { code: "VIDEO_EXPORT_FAILED", message: error.message || "L’export média a échoué." } });
        }
      }
      if (request.method === "POST" && url.pathname === "/api/media/webm-to-mp4") {
        try {
          const result = await videoDirector.webmToMp4(await readJson(request));
          return sendBinary(response, 200, result.buffer, result);
        } catch (error) {
          return sendJson(response, Number(error.status) || 500, { error: { code: "WEBM_TO_MP4_FAILED", message: error.message || "La conversion MP4 a échoué." } });
        }
      }
      if (request.method === "POST" && url.pathname === "/api/solver/autoblock") {
        try {
          const result = await solverAutoblock(await readJson(request));
          return sendJson(response, result.status, result.body);
        } catch (error) {
          return sendJson(response, 500, {
            ok: false,
            error: error.message || "La reconstruction automatique a échoué."
          });
        }
      }
      const toolConfigurationMatch = url.pathname.match(/^\/api\/v1\/tools\/([a-z0-9_-]+)\/configuration$/);
      if (request.method === "GET" && toolConfigurationMatch) {
        const toolId = toolConfigurationMatch[1];
        const result = await store.readToolConfiguration({
          expectedSetupId: url.searchParams.get("setupId"),
          toolId
        });
        if (!BUILTIN_TOOL_IDS.has(toolId)) {
          const snapshot = await store.readPromptLibrary({
            expectedSetupId: url.searchParams.get("setupId"),
            libraryId: toolId
          });
          return sendJson(response, 200, {
            ...result,
            registryRevision: snapshot.registryRevision,
            configuration: result.configuration
              ? reconcileLibraryConfiguration(result.configuration, snapshot.library)
              : defaultLibraryConfiguration(snapshot.library)
          });
        }
        return sendJson(response, 200, {
          ...result,
          configuration: result.configuration ?? defaultToolConfiguration(toolId)
        });
      }
      if (request.method === "PUT" && toolConfigurationMatch) {
        const toolId = toolConfigurationMatch[1];
        const body = await readJson(request);
        if (BUILTIN_TOOL_IDS.has(toolId)) {
          validateToolConfiguration(toolId, body.configuration);
        } else {
          const snapshot = await store.readPromptLibrary({ expectedSetupId: body.expectedSetupId, libraryId: toolId });
          if (body.expectedRegistryRevision !== snapshot.registryRevision) {
            throw new RegistryConflictError(body.expectedRegistryRevision, snapshot.registryRevision);
          }
          validateLibraryConfiguration(body.configuration, snapshot.library);
        }
        return sendJson(response, 200, await store.saveToolConfiguration({ ...body, toolId }));
      }
      const toolCompileMatch = url.pathname.match(/^\/api\/v1\/tools\/(barz-enhancer|angle-3d|relighting-3d|imperfection|banana-helper|barz-beauty|realism-forge|cinematic-shoot|facs-sheet-generator|barzy-board|veo-suite|cccp|barzy-sheet|barz-designer|knolling|multishot|seedance|cinema-helper)\/compile$/);
      if (request.method === "POST" && toolCompileMatch) {
        const toolId = toolCompileMatch[1];
        const body = await readJson(request);
        if (["barz-enhancer", "angle-3d", "relighting-3d"].includes(toolId)) {
          const forcedMode = { "angle-3d": "angles", "relighting-3d": "relighting" }[toolId];
          const outputs = compileEnhancer(forcedMode ? { ...body.configuration, mode: forcedMode } : body.configuration);
          return sendJson(response, 200, { outputs, copyAll: copyAllEnhancer(outputs) });
        }
        if (toolId === "banana-helper") {
          return sendJson(response, 200, compileGoodies(body.configuration));
        }
        if (toolId === "barz-beauty") {
          return sendJson(response, 200, compileBeauty(body.configuration));
        }
        if (toolId === "realism-forge") {
          return sendJson(response, 200, compileRealism(body.configuration));
        }
        if (toolId === "cinematic-shoot") {
          return sendJson(response, 200, compileCinematicShoot(body.configuration));
        }
        if (toolId === "facs-sheet-generator") {
          return sendJson(response, 200, compileFacsSheet(body.configuration));
        }
        if (toolId === "barzy-board") {
          return sendJson(response, 200, compileBoard(body.configuration));
        }
        if (toolId === "veo-suite") {
          return sendJson(response, 200, compileCameraSuite(body.configuration));
        }
        if (toolId === "cccp") {
          return sendJson(response, 200, compileCcp(body.configuration, body.stageId));
        }
        if (toolId === "barzy-sheet") {
          return sendJson(response, 200, compileSheet(body.configuration, body.cardId));
        }
        if (toolId === "barz-designer") {
          return sendJson(response, 200, compileDesigner(body.configuration, body.cardId));
        }
        if (toolId === "knolling") {
          return sendJson(response, 200, compileKnolling(body.configuration, body.cardId));
        }
        if (toolId === "multishot") {
          return sendJson(response, 200, compileMultishot(body.configuration, body.outputId));
        }
        if (toolId === "seedance") {
          return sendJson(response, 200, compileSeedance(body.configuration, { ignoreSaved: body.ignoreSaved === true }));
        }
        if (toolId === "cinema-helper") {
          return sendJson(response, 200, compileCinemaHelper(body.configuration));
        }
        const state = body.configuration?.state;
        const prompt = compileImperfection(state);
        return sendJson(response, 200, { prompt, stats: imperfectionStats(state, prompt) });
      }
      if (request.method === "POST" && url.pathname === "/api/v1/tools/imperfection/apply-preset") {
        const body = await readJson(request);
        const preset = body.builtinId ? IMPERFECTION_CATALOG.presets[body.builtinId] : body.presetState;
        if (!preset) throw new ContractValidationError("unknown preset", "preset");
        return sendJson(response, 200, {
          state: applyImperfectionPreset(body.currentState, preset, { builtin: Boolean(body.builtinId) })
        });
      }
      if (request.method === "POST" && url.pathname === "/api/v1/setups") {
        const body = await readJson(request);
        return sendJson(response, 201, publicWorkspace(await store.createSetup(body)));
      }
      if (request.method === "POST" && url.pathname === "/api/v1/setups/switch") {
        const body = await readJson(request);
        return sendJson(response, 200, publicWorkspace(await store.switchSetup(body)));
      }
      const setupMatch = url.pathname.match(/^\/api\/v1\/setups\/([a-z0-9_-]+)$/);
      if (request.method === "PATCH" && setupMatch) {
        const body = await readJson(request);
        return sendJson(response, 200, publicWorkspace(await store.renameSetup({ ...body, id: setupMatch[1] })));
      }
      if (request.method === "GET" && url.pathname === "/api/v1/setup-versions") {
        return sendJson(response, 200, await store.listVersions({ expectedSetupId: url.searchParams.get("setupId") }));
      }
      if (request.method === "POST" && url.pathname === "/api/v1/setup-versions") {
        const body = await readJson(request);
        return sendJson(response, 201, await store.saveVersion(body));
      }
      if (request.method === "POST" && url.pathname === "/api/v1/setup-versions/restore") {
        const body = await readJson(request);
        return sendJson(response, 200, publicWorkspace(await store.restoreVersion(body)));
      }
      if (request.method === "POST" && url.pathname === "/api/v1/workshops") {
        const body = await readJson(request);
        return sendJson(response, 201, publicWorkspace(await store.addWorkshop(body)));
      }
      if (request.method === "POST" && url.pathname === "/api/v1/placements") {
        const body = await readJson(request);
        return sendJson(response, 201, publicWorkspace(await store.addPlacement(body)));
      }
      const placementMatch = url.pathname.match(/^\/api\/v1\/placements\/([a-z0-9_-]+)$/);
      if (request.method === "DELETE" && placementMatch) {
        const body = await readJson(request);
        return sendJson(response, 200, publicWorkspace(await store.removePlacement({ ...body, id: placementMatch[1] })));
      }
      if (request.method === "PUT" && url.pathname === "/api/v1/workshops/order") {
        const body = await readJson(request);
        return sendJson(response, 200, publicWorkspace(await store.reorderWorkshops(body)));
      }
      const workshopMatch = url.pathname.match(/^\/api\/v1\/workshops\/([a-z0-9_-]+)$/);
      if (request.method === "PATCH" && workshopMatch) {
        const body = await readJson(request);
        const args = { ...body, id: workshopMatch[1] };
        const result = body.title !== undefined
          ? await store.renameWorkshop(args)
          : await store.moveWorkshop(args);
        return sendJson(response, 200, publicWorkspace(result));
      }
      if (request.method === "POST" && url.pathname === "/api/v1/recipes") {
        const body = await readJson(request);
        return sendJson(response, 201, publicWorkspace(await store.addRecipeTool(body)));
      }
      if (request.method === "POST" && url.pathname === "/api/v1/libraries") {
        return sendJson(response, 201, publicWorkspace(await store.createPromptLibrary(await readJson(request))));
      }
      const libraryMatch = url.pathname.match(/^\/api\/v1\/libraries\/([a-z0-9_-]+)$/);
      if (request.method === "GET" && libraryMatch) {
        return sendJson(response, 200, await store.readPromptLibrary({
          expectedSetupId: url.searchParams.get("setupId"), libraryId: libraryMatch[1]
        }));
      }
      if (request.method === "PATCH" && libraryMatch) {
        return sendJson(response, 200, publicWorkspace(await store.renamePromptLibrary({
          ...(await readJson(request)), libraryId: libraryMatch[1]
        })));
      }
      const categoryCollectionMatch = url.pathname.match(/^\/api\/v1\/libraries\/([a-z0-9_-]+)\/categories$/);
      if (request.method === "POST" && categoryCollectionMatch) {
        return sendJson(response, 201, publicWorkspace(await store.addLibraryCategory({
          ...(await readJson(request)), libraryId: categoryCollectionMatch[1]
        })));
      }
      if (request.method === "PUT" && categoryCollectionMatch) {
        return sendJson(response, 200, publicWorkspace(await store.reorderLibraryCategories({
          ...(await readJson(request)), libraryId: categoryCollectionMatch[1]
        })));
      }
      const categoryMatch = url.pathname.match(/^\/api\/v1\/libraries\/([a-z0-9_-]+)\/categories\/([a-z0-9_-]+)$/);
      if (["PATCH", "DELETE"].includes(request.method) && categoryMatch) {
        const body = await readJson(request);
        const method = request.method === "PATCH" ? "updateLibraryCategory" : "deleteLibraryCategory";
        return sendJson(response, 200, publicWorkspace(await store[method]({
          ...body, libraryId: categoryMatch[1], categoryId: categoryMatch[2]
        })));
      }
      const entryCollectionMatch = url.pathname.match(/^\/api\/v1\/libraries\/([a-z0-9_-]+)\/entries$/);
      if (request.method === "POST" && entryCollectionMatch) {
        return sendJson(response, 201, publicWorkspace(await store.addLibraryEntry({
          ...(await readJson(request)), libraryId: entryCollectionMatch[1]
        })));
      }
      const entryOrderMatch = url.pathname.match(/^\/api\/v1\/libraries\/([a-z0-9_-]+)\/entries\/order$/);
      if (request.method === "PUT" && entryOrderMatch) {
        return sendJson(response, 200, publicWorkspace(await store.reorderLibraryEntries({
          ...(await readJson(request)), libraryId: entryOrderMatch[1]
        })));
      }
      const entryMatch = url.pathname.match(/^\/api\/v1\/libraries\/([a-z0-9_-]+)\/entries\/([a-z0-9_-]+)$/);
      if (request.method === "PATCH" && entryMatch) {
        return sendJson(response, 200, publicWorkspace(await store.updateLibraryEntry({
          ...(await readJson(request)), libraryId: entryMatch[1], entryId: entryMatch[2]
        })));
      }
      const entryActionMatch = url.pathname.match(/^\/api\/v1\/libraries\/([a-z0-9_-]+)\/entries\/([a-z0-9_-]+)\/(duplicate|visibility|revert)$/);
      if (request.method === "POST" && entryActionMatch) {
        const body = await readJson(request);
        const methods = { duplicate: "duplicateLibraryEntry", visibility: "setLibraryEntryHidden", revert: "revertLibraryEntry" };
        return sendJson(response, 200, publicWorkspace(await store[methods[entryActionMatch[3]]]({
          ...body, libraryId: entryActionMatch[1], entryId: entryActionMatch[2]
        })));
      }
      const compileLibraryMatch = url.pathname.match(/^\/api\/v1\/libraries\/([a-z0-9_-]+)\/compile$/);
      if (request.method === "POST" && compileLibraryMatch) {
        const body = await readJson(request);
        const snapshot = await store.readPromptLibrary({ expectedSetupId: body.expectedSetupId, libraryId: compileLibraryMatch[1] });
        if (body.expectedRevision !== snapshot.registryRevision) {
          throw new RegistryConflictError(body.expectedRevision, snapshot.registryRevision);
        }
        return sendJson(response, 200, {
          setupId: snapshot.setupContext.activeSetup.id,
          registryRevision: snapshot.registryRevision,
          ...compilePromptLibrary({ library: snapshot.library, entryId: body.entryId, scene: body.scene })
        });
      }
      if (request.method === "POST" && url.pathname === "/api/v1/compile") {
        const body = await readJson(request);
        const { registry } = await store.read();
        const recipe = registry.recipes.find((item) => item.id === body.recipeId);
        if (!recipe) throw new ContractValidationError("unknown recipe", "recipeId");
        return sendJson(response, 200, { outputs: compileRecipe(recipe, body.values ?? {}) });
      }
      if (request.method === "GET" && url.pathname === "/api/v1/reset-preview") {
        const workshopId = url.searchParams.get("workshopId");
        return sendJson(response, 200, await store.previewReset({
          expectedSetupId: url.searchParams.get("setupId"),
          scope: workshopId ? { workshopId } : "all"
        }));
      }
      if (request.method === "POST" && url.pathname === "/api/v1/reset") {
        const body = await readJson(request);
        return sendJson(response, 200, publicWorkspace(await store.resetDefaults(body)));
      }
      if (request.method === "GET" && url.pathname === "/api/v1/backups") {
        return sendJson(response, 200, { backups: await store.listBackups({ expectedSetupId: url.searchParams.get("setupId") }) });
      }
      if (request.method === "POST" && url.pathname === "/api/v1/backups/restore") {
        const body = await readJson(request);
        const result = await store.restoreBackup(body);
        return sendJson(response, 200, publicWorkspace(result));
      }

      const asset = STATIC_FILES.get(url.pathname);
      if (["GET", "HEAD"].includes(request.method) && asset) {
        const [fileName, contentType] = asset;
        const content = await readFile(path.join(publicDirectory, fileName));
        response.writeHead(200, { ...headers(contentType), "Content-Length": content.length });
        return response.end(request.method === "HEAD" ? undefined : content);
      }
      if (["GET", "HEAD"].includes(request.method)) {
        const embedded = await embeddedPublicAsset(url.pathname);
        if (embedded) {
          response.writeHead(200, { ...embeddedHeaders(embedded.contentType), "Content-Length": embedded.content.length });
          return response.end(request.method === "HEAD" ? undefined : embedded.content);
        }
      }
      if (request.method === "GET" && url.pathname === "/favicon.ico") {
        response.writeHead(204, headers("image/x-icon"));
        return response.end();
      }
      sendJson(response, 404, { error: { code: "NOT_FOUND", message: "Route not found." } });
    } catch (error) {
      sendError(response, error);
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });
  const address = server.address();
  return {
    server,
    store,
    url: `http://${host}:${address.port}/`,
    close: async () => {
      if (libraryEditorProcess && libraryEditorProcess.exitCode === null) libraryEditorProcess.kill();
      if (youtubeExtractorProcess && youtubeExtractorProcess.exitCode === null) youtubeExtractorProcess.kill();
      if (virtualCameraServicePromise) {
        const virtualCameraService = await virtualCameraServicePromise.catch(() => null);
        await virtualCameraService?.close();
      }
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const dataDirectory = process.env.BARZ_SUITE_V6_DATA_DIR
    || path.join(process.env.APPDATA || os.tmpdir(), "BARZ Suite 6 Dev");
  const port = process.env.BARZ_SUITE_V6_PORT ? Number(process.env.BARZ_SUITE_V6_PORT) : 4326;
  const instance = await createBuildServer({ dataDirectory, port });
  console.log(`Prompt Atlas Build: ${instance.url}`);
  console.log(`Data: ${dataDirectory}`);
}
