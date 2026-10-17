import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const legacyRoot = "E:\\Fable 5-Project\\Meat Journey\\Barzy App";
const legacyAtlas = path.join(legacyRoot, "prompt Atlas V2");
const publicRoot = path.join(projectRoot, "apps", "atlas", "public");

const [legacyHtml, legacyJs, legacyCss] = await Promise.all([
  readFile(path.join(legacyAtlas, "index.html"), "utf8"),
  readFile(path.join(legacyAtlas, "app.js"), "utf8"),
  readFile(path.join(legacyAtlas, "styles-claude.css"), "utf8")
]);

const editorStart = legacyHtml.indexOf('<div class="video-editor-app');
const editorEnd = legacyHtml.indexOf("<!-- Motion Emulator", editorStart);
const scriptStart = legacyJs.indexOf("window.__veInitVideoEditor = function initVideoEditor()");
if (editorStart < 0 || editorEnd < 0 || scriptStart < 0) {
  throw new Error("The canonical Prompt Atlas V5 Video Editor markers were not found.");
}

const editorMarkup = legacyHtml.slice(editorStart, editorEnd).trim();
const editorScript = legacyJs.slice(scriptStart).trim();
const editorDirectory = path.join(publicRoot, "video-editor");
await mkdir(editorDirectory, { recursive: true });
await writeFile(path.join(editorDirectory, "index.html"), `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Video Director · Editor</title>
  <link rel="stylesheet" href="./editor.css">
  <link rel="stylesheet" href="/video-director-theme.css?v=0.23.2-dark">
</head>
<body class="video-editor-standalone">
${editorMarkup}
  <script src="./editor.js"></script>
</body>
</html>
`, "utf8");
await writeFile(path.join(editorDirectory, "editor.js"), `${editorScript}

window.__veInitVideoEditor();
`, "utf8");
await writeFile(path.join(editorDirectory, "editor.css"), `${legacyCss}

html, body.video-editor-standalone { min-height: 100%; margin: 0; background: #070909; }
body.video-editor-standalone { overflow: auto; color: #f2f4f3; }
body.video-editor-standalone .video-editor-app { display: block; min-height: 100vh; }
`, "utf8");

const targetAssets = path.join(publicRoot, "assets");
await mkdir(targetAssets, { recursive: true });
await cp(path.join(legacyRoot, "public", "assets", "HTML", "motion-emulator"), path.join(targetAssets, "HTML", "motion-emulator"), { recursive: true, force: true });
const motionIndexPath = path.join(targetAssets, "HTML", "motion-emulator", "index.html");
const motionIndex = await readFile(motionIndexPath, "utf8");
await writeFile(motionIndexPath, motionIndex.replace("</head>", "  <link rel=\"stylesheet\" href=\"/video-director-theme.css?v=0.23.2-dark\">\n</head>"), "utf8");
const sourceVendor = path.join(legacyRoot, "public", "assets", "vendor");
const targetVendor = path.join(targetAssets, "vendor");
await rm(targetVendor, { recursive: true, force: true });
for (const relative of [
  "three",
  "mediapipe/tasks-vision",
  "models/mediapipe",
  "models/onnx-community/depth-anything-v2-small",
  "transformers",
  "webm-muxer"
]) {
  await cp(path.join(sourceVendor, relative), path.join(targetVendor, relative), { recursive: true, force: true });
}
await cp(path.join(legacyRoot, "public", "assets", "barzy-theme.css"), path.join(targetAssets, "barzy-theme.css"), { force: true });
await cp(path.join(legacyRoot, "public", "assets", "barzy-theme.js"), path.join(targetAssets, "barzy-theme.js"), { force: true });

console.log("Canonical Video Editor and Motion Emulator assets extracted.");
