import { access, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const installerDirectory = path.dirname(fileURLToPath(import.meta.url));
const suiteDirectory = path.resolve(installerDirectory, "..");
const projectDirectory = path.resolve(suiteDirectory, "..");
const payloadDirectory = path.join(installerDirectory, "payload");

async function exists(filePath) {
  return access(filePath).then(() => true, () => false);
}

async function copyRequired(source, destination, options = {}) {
  if (!await exists(source)) throw new Error(`Missing installer source: ${source}`);
  await cp(source, destination, { recursive: true, force: true, ...options });
}

async function writeLauncher({ destination, dataVariable, dataDirectory, serverPath, url, healthUrl = url, expectedVersion }) {
  const readyCondition = expectedVersion
    ? `request.Status >= 200 And request.Status < 500 And InStr(1, request.ResponseText, "${expectedVersion}", vbTextCompare) > 0`
    : `request.Status >= 200 And request.Status < 500`;
  const launchUrl = expectedVersion ? `${url}?v=${encodeURIComponent(expectedVersion)}` : url;
  const script = `Option Explicit\r\n`
    + `Dim shell, fso, componentDir, suiteDir, command, request, attempt, ready\r\n`
    + `Set shell = CreateObject("WScript.Shell")\r\n`
    + `Set fso = CreateObject("Scripting.FileSystemObject")\r\n`
    + `componentDir = fso.GetParentFolderName(WScript.ScriptFullName)\r\n`
    + `suiteDir = fso.GetParentFolderName(componentDir)\r\n`
    + `shell.Environment("PROCESS")("${dataVariable}") = `
    + `shell.ExpandEnvironmentStrings("${dataDirectory}")\r\n`
    + `shell.Environment("PROCESS")("BARZ_SHARED_SECRETS_DIR") = shell.ExpandEnvironmentStrings("%APPDATA%\\BARZ Suite 6\\Shared")\r\n`
    + `command = Chr(34) & suiteDir & "\\core\\node.exe" & Chr(34) & " " & Chr(34) `
    + `& componentDir & "\\${serverPath}" & Chr(34)\r\n`
    + `shell.Run command, 0, False\r\n`
    + `ready = False\r\n`
    + `For attempt = 1 To 30\r\n`
    + `  WScript.Sleep 250\r\n`
    + `  On Error Resume Next\r\n`
    + `  Set request = CreateObject("MSXML2.ServerXMLHTTP.6.0")\r\n`
    + `  request.setTimeouts 500, 500, 500, 500\r\n`
    + `  request.Open "GET", "${healthUrl}", False\r\n`
    + `  request.Send\r\n`
    + `  If Err.Number = 0 And ${readyCondition} Then\r\n`
    + `    ready = True\r\n`
    + `    Exit For\r\n`
    + `  End If\r\n`
    + `  Err.Clear\r\n`
    + `  On Error GoTo 0\r\n`
    + `Next\r\n`
    + `On Error GoTo 0\r\n`
    + `If ready Then\r\n`
    + `  shell.Run "${launchUrl}", 1, False\r\n`
    + `Else\r\n`
    + `  MsgBox "Placenta Studio n'a pas pu démarrer la bonne version du serveur local. Fermez les anciennes fenêtres Atlas puis relancez ce raccourci.", 16, "Placenta Studio"\r\n`
    + `End If\r\n`;
  await writeFile(destination, script, "utf8");
}

function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`Missing installer integration anchor: ${label}`);
  return source.replace(search, replacement);
}

async function integrateAggregatorSuiteBridge(aggregatorRoot) {
  const serverPath = path.join(aggregatorRoot, "server.js");
  let serverSource = (await readFile(serverPath, "utf8")).replace(/\r\n?/g, "\n");
  serverSource = replaceRequired(
    serverSource,
    `version: "0.25.0"`,
    `version: "0.33.57"`,
    "Aggregator health version"
  );
  serverSource = replaceRequired(
    serverSource,
    `Version 0.25.0 — pont Prompt Atlas prêt.`,
    `Version 0.33.57 — Icônes d’onglet BARZ et grand diaporama pendant l’installation.`,
    "Aggregator startup version"
  );
  serverSource = replaceRequired(
    serverSource,
    `"frame-ancestors 'none'"`,
    `"frame-ancestors 'self' http://127.0.0.1:4326 http://localhost:4326"`,
    "Aggregator frame-ancestors"
  );
  serverSource = replaceRequired(
    serverSource,
    `  response.setHeader("X-Frame-Options", "DENY");\n`,
    "",
    "Aggregator X-Frame-Options"
  );
  serverSource = replaceRequired(
    serverSource,
    `const sharedSecretsDirectory = process.env.BARZ_SHARED_SECRETS_DIR || dataDirectory;`,
    `const sharedSecretsDirectory = process.env.BARZ_SHARED_SECRETS_DIR || dataDirectory;\nconst uiPreferencesPath = path.join(sharedSecretsDirectory, "ui-preferences.json");\nconst atlasLocalOrigin = process.env.BARZ_ATLAS_ORIGIN || "http://127.0.0.1:4326";`,
    "Aggregator shared preference path"
  );
  serverSource = replaceRequired(
    serverSource,
    `const retiredModelPrefixes = ["bytedance/seedance-2.0/", "fal-ai/seedance-2/"];`,
    `const retiredModelPrefixes = ["bytedance/seedance-2.0/", "fal-ai/seedance-2/"];\n\nfunction normalizeUiPreferences(value = {}) {\n  return {\n    theme: value.theme === "light" ? "light" : "dark",\n    language: value.language === "fr" ? "fr" : "en",\n    aiProvider: ["openai", "anthropic", "deepseek", "google"].includes(value.aiProvider) ? value.aiProvider : "openai",\n    aiModel: typeof value.aiModel === "string" && value.aiModel.trim() ? value.aiModel.trim() : "gpt-5.6-terra",\n    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : ""\n  };\n}\n\nasync function readUiPreferences() {\n  try {\n    return normalizeUiPreferences(JSON.parse(await readFile(uiPreferencesPath, "utf8")));\n  } catch (error) {\n    if (error.code !== "ENOENT" && !(error instanceof SyntaxError)) throw error;\n    return normalizeUiPreferences();\n  }\n}\n\nasync function writeUiPreferences(value) {\n  const current = await readUiPreferences();\n  const preferences = normalizeUiPreferences({ ...current, ...value, updatedAt: new Date().toISOString() });\n  await mkdir(sharedSecretsDirectory, { recursive: true });\n  await writeFile(uiPreferencesPath, JSON.stringify(preferences, null, 2) + "\\n", "utf8");\n  return preferences;\n}`,
    "Aggregator shared preference helpers"
  );
  serverSource = replaceRequired(
    serverSource,
    `  if (request.method === "GET" && url.pathname === "/api/director/info") {`,
    `  if (request.method === "GET" && url.pathname === "/api/preferences") {\n    sendJson(response, 200, await readUiPreferences());\n    return;\n  }\n\n  if (request.method === "PUT" && url.pathname === "/api/preferences") {\n    sendJson(response, 200, await writeUiPreferences(await readJson(request)));\n    return;\n  }\n\n  if (request.method === "GET" && url.pathname === "/api/atlas-ai/status") {\n    try {\n      const upstream = await fetch(atlasLocalOrigin + "/api/v1/ai/status", { signal: AbortSignal.timeout(5000) });\n      sendJson(response, upstream.status, await upstream.json());\n    } catch (error) { sendJson(response, 503, { error: "Prompt Atlas AI is unavailable: " + error.message }); }\n    return;\n  }\n\n  if (request.method === "POST" && url.pathname === "/api/atlas-ai/advisor") {\n    try {\n      const upstream = await fetch(atlasLocalOrigin + "/api/v1/ai/advisor", {\n        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(await readJson(request)), signal: AbortSignal.timeout(65000)\n      });\n      sendJson(response, upstream.status, await upstream.json());\n    } catch (error) { sendJson(response, 503, { error: "Atlas Advisor is unavailable: " + error.message }); }\n    return;\n  }\n\n  if (request.method === "GET" && url.pathname === "/api/director/info") {`,
    "Aggregator shared preference routes"
  );
  serverSource = replaceRequired(
    serverSource,
    `body: JSON.stringify(await readJson(request)), signal: AbortSignal.timeout(65000)`,
    `body: JSON.stringify(await readJson(request, 70 * 1024 * 1024)), signal: AbortSignal.timeout(65000)`,
    "Aggregator Atlas Advisor image payload limit"
  );
  await writeFile(serverPath, serverSource, "utf8");

  const indexPath = path.join(aggregatorRoot, "public", "index.html");
  let indexSource = (await readFile(indexPath, "utf8")).replace(/\r\n?/g, "\n");
  indexSource = replaceRequired(indexSource, "v0.25.0", "v0.33.57", "Aggregator visible version");
  indexSource = replaceRequired(
    indexSource,
    "</head>",
    "  <link rel=\"stylesheet\" href=\"/capture-dna.css\">\n"
      + "  <link rel=\"stylesheet\" href=\"/suite-preferences.css\">\n"
      + "  <link rel=\"stylesheet\" href=\"/api-guide.css\">\n"
      + "  <link rel=\"stylesheet\" href=\"/global-ai-controls.css\">\n"
      + "  <link rel=\"stylesheet\" href=\"/subject-mode.css\">\n"
      + "  <script type=\"module\" src=\"/suite-bridge.js\"></script>\n"
      + "  <script type=\"module\" src=\"/api-guide.js\"></script>\n"
      + "  <script type=\"module\" src=\"/global-ai-controls.js\"></script>\n"
      + "  <script type=\"module\" src=\"/subject-mode.js\"></script>\n"
      + "  <script type=\"module\" src=\"/capture-dna-ui.js\"></script>\n</head>",
    "Aggregator document head"
  );
  indexSource = replaceRequired(
    indexSource,
    `        <div class="rail-separator"></div>\n        <p class="rail-title">Passerelle</p>\n        <button class="media-tab" id="openImportButton" type="button">\n          <span class="tab-glyph">↓</span>\n          Importer\n        </button>\n\n`,
    `        <div class="rail-separator"></div>\n`,
    "Remove obsolete manual gateway navigation"
  );
  await writeFile(indexPath, indexSource, "utf8");
  const packagePath = path.join(aggregatorRoot, "package.json");
  let packageSource = await readFile(packagePath, "utf8");
  packageSource = replaceRequired(packageSource, `"version": "0.25.0"`, `"version": "0.33.57"`, "Aggregator package version");
  await writeFile(packagePath, packageSource, "utf8");
  for (const localeFile of ["app.js", "spending.js", "job-progress.js"]) {
    const localePath = path.join(aggregatorRoot, "public", localeFile);
    let localeSource = (await readFile(localePath, "utf8")).replace(/\r\n?/g, "\n");
    if (localeFile === "app.js") {
      localeSource = replaceRequired(
        localeSource,
        `document.querySelector("#openImportButton").addEventListener("click", () => {\n  elements.importPayload.value = JSON.stringify(exampleImport, null, 2);\n  elements.importMessage.textContent = "";\n  elements.importDialog.showModal();\n});\n\n`,
        "",
        "Remove obsolete manual gateway handler"
      );
      localeSource = replaceRequired(
        localeSource,
        `window.addEventListener("message", importReferenceFromLibrary);`,
        `window.addEventListener("message", importReferenceFromLibrary);\n`
          + `window.addEventListener("barz:external-reference", (event) => {\n`
          + `  const file = event.detail?.file;\n`
          + `  if (file instanceof File && /^(image|video)\\//.test(file.type)) uploadReferenceImage([file]);\n`
          + `});\n`
          + `window.addEventListener("barz:external-reference-error", (event) => {\n`
          + `  elements.formMessage.textContent = event.detail?.message || "L’import de la référence a échoué.";\n`
          + `});`,
        "Ragdoll external reference bridge"
      );
    }
    localeSource = localeSource.replaceAll(
      `"fr-FR"`,
      `(document.documentElement.dataset.language === "fr" ? "fr-FR" : "en-US")`
    );
    await writeFile(localePath, localeSource, "utf8");
  }
  for (const fileName of ["suite-bridge.js", "suite-preferences.css", "api-guide.js", "api-guide.css", "capture-dna-catalog.js", "capture-dna-ui.js", "capture-dna.css", "subject-mode.js", "subject-mode.css"]) {
    await copyRequired(
      path.join(installerDirectory, "aggregator-overlays", fileName),
      path.join(aggregatorRoot, "public", fileName)
    );
  }
  for (const fileName of ["global-ai-controls.js", "global-ai-controls.css"]) {
    await copyRequired(
      path.join(suiteDirectory, "apps", "atlas", "public", fileName),
      path.join(aggregatorRoot, "public", fileName)
    );
  }
}

async function writeSuiteLauncher({ destination, expectedAtlasVersion }) {
  const script = `Option Explicit\r\n`
    + `Dim shell, fso, suiteDir, nodePath, atlasServer, aggregatorServer, atlasInstalled, aggregatorInstalled, atlasReady, aggregatorReady, attempt, command, dataRoot, logDir, atlasLog, aggregatorLog\r\n`
    + `Set shell = CreateObject("WScript.Shell")\r\n`
    + `Set fso = CreateObject("Scripting.FileSystemObject")\r\n`
    + `suiteDir = fso.GetParentFolderName(WScript.ScriptFullName)\r\n`
    + `nodePath = suiteDir & "\\core\\node.exe"\r\n`
    + `atlasServer = suiteDir & "\\atlas\\app\\apps\\atlas\\server.js"\r\n`
    + `aggregatorServer = suiteDir & "\\aggregator\\app\\server.js"\r\n`
    + `dataRoot = shell.ExpandEnvironmentStrings("%APPDATA%\\BARZ Suite 6")\r\n`
    + `logDir = dataRoot & "\\Logs"\r\n`
    + `If Not fso.FolderExists(dataRoot) Then fso.CreateFolder dataRoot\r\n`
    + `If Not fso.FolderExists(logDir) Then fso.CreateFolder logDir\r\n`
    + `atlasLog = logDir & "\\atlas-launch.log"\r\n`
    + `aggregatorLog = logDir & "\\aggregator-launch.log"\r\n`
    + `atlasInstalled = fso.FileExists(atlasServer)\r\n`
    + `aggregatorInstalled = fso.FileExists(aggregatorServer)\r\n`
    + `shell.Environment("PROCESS")("BARZ_SHARED_SECRETS_DIR") = shell.ExpandEnvironmentStrings("%APPDATA%\\BARZ Suite 6\\Shared")\r\n`
    + `atlasReady = False\r\n`
    + `aggregatorReady = False\r\n`
    + `If atlasInstalled Then atlasReady = EndpointReady("http://127.0.0.1:4326/api/v1/health", "${expectedAtlasVersion}")\r\n`
    + `If aggregatorInstalled Then aggregatorReady = EndpointReady("http://127.0.0.1:4317/api/health", "0.33.57")\r\n`
    + `If atlasInstalled And Not atlasReady Then\r\n`
    + `  shell.Environment("PROCESS")("BARZ_SUITE_V6_DATA_DIR") = shell.ExpandEnvironmentStrings("%APPDATA%\\BARZ Suite 6\\Prompt Atlas")\r\n`
    + `  command = shell.ExpandEnvironmentStrings("%ComSpec%") & " /D /S /C " & Chr(34) & Chr(34) & nodePath & Chr(34) & " " & Chr(34) & atlasServer & Chr(34) & " >> " & Chr(34) & atlasLog & Chr(34) & " 2>&1" & Chr(34)\r\n`
    + `  shell.Run command, 0, False\r\n`
    + `  For attempt = 1 To 80\r\n`
    + `    WScript.Sleep 250\r\n`
    + `    atlasReady = EndpointReady("http://127.0.0.1:4326/api/v1/health", "${expectedAtlasVersion}")\r\n`
    + `    If atlasReady Then Exit For\r\n`
    + `  Next\r\n`
    + `End If\r\n`
    + `If aggregatorInstalled And Not aggregatorReady Then\r\n`
    + `  shell.Environment("PROCESS")("BARZ_AGGREGATOR_DATA_DIR") = shell.ExpandEnvironmentStrings("%APPDATA%\\BARZ Suite 6\\Aggregator")\r\n`
    + `  command = shell.ExpandEnvironmentStrings("%ComSpec%") & " /D /S /C " & Chr(34) & Chr(34) & nodePath & Chr(34) & " " & Chr(34) & aggregatorServer & Chr(34) & " >> " & Chr(34) & aggregatorLog & Chr(34) & " 2>&1" & Chr(34)\r\n`
    + `  shell.Run command, 0, False\r\n`
    + `End If\r\n`
    + `For attempt = 1 To 120\r\n`
    + `  If atlasInstalled Then atlasReady = EndpointReady("http://127.0.0.1:4326/api/v1/health", "${expectedAtlasVersion}")\r\n`
    + `  If aggregatorInstalled Then aggregatorReady = EndpointReady("http://127.0.0.1:4317/api/health", "0.33.57")\r\n`
    + `  If (Not atlasInstalled Or atlasReady) And (Not aggregatorInstalled Or aggregatorReady) Then Exit For\r\n`
    + `  WScript.Sleep 250\r\n`
    + `Next\r\n`
    + `If atlasReady And aggregatorReady Then\r\n`
    + `  shell.Run "http://127.0.0.1:4326/suite.html?app=aggregator&v=${encodeURIComponent(expectedAtlasVersion)}", 1, False\r\n`
    + `ElseIf atlasReady Then\r\n`
    + `  shell.Run "http://127.0.0.1:4326/?v=${encodeURIComponent(expectedAtlasVersion)}", 1, False\r\n`
    + `ElseIf aggregatorReady Then\r\n`
    + `  shell.Run "http://127.0.0.1:4317/", 1, False\r\n`
    + `Else\r\n`
    + `  MsgBox "Placenta Studio n'a pas pu démarrer les composants installés.", 16, "Placenta Studio"\r\n`
    + `End If\r\n`
    + `\r\n`
    + `Function EndpointReady(endpoint, expectedText)\r\n`
    + `  Dim request\r\n`
    + `  EndpointReady = False\r\n`
    + `  On Error Resume Next\r\n`
    + `  Set request = CreateObject("MSXML2.ServerXMLHTTP.6.0")\r\n`
    + `  request.setTimeouts 500, 500, 500, 500\r\n`
    + `  request.Open "GET", endpoint, False\r\n`
    + `  request.Send\r\n`
    + `  If Err.Number = 0 Then\r\n`
    + `    If request.Status >= 200 And request.Status < 500 Then\r\n`
    + `      If expectedText = "" Or InStr(1, request.ResponseText, expectedText, vbTextCompare) > 0 Then EndpointReady = True\r\n`
    + `    End If\r\n`
    + `  End If\r\n`
    + `  Err.Clear\r\n`
    + `  On Error GoTo 0\r\n`
    + `End Function\r\n`;
  await writeFile(destination, script, "utf8");
}

export async function prepareProductPayload() {
  const expectedPayload = path.join(installerDirectory, "payload");
  if (path.resolve(payloadDirectory) !== path.resolve(expectedPayload)) {
    throw new Error("Refusing to rebuild an unexpected payload directory");
  }

  await rm(payloadDirectory, { recursive: true, force: true });
  await mkdir(path.join(payloadDirectory, "core"), { recursive: true });
  await mkdir(path.join(payloadDirectory, "aggregator", "app"), { recursive: true });
  await mkdir(path.join(payloadDirectory, "atlas", "app"), { recursive: true });
  const manifest = JSON.parse(await readFile(path.join(installerDirectory, "manifest.json"), "utf8"));

  await copyRequired(process.execPath, path.join(payloadDirectory, "core", "node.exe"));
  await writeFile(path.join(payloadDirectory, "core", "runtime.json"), `${JSON.stringify({
    runtime: "node",
    version: process.version,
    architecture: process.arch
  }, null, 2)}\n`, "utf8");
  await writeFile(path.join(payloadDirectory, "core", "component.json"), `${JSON.stringify({
    id: "core", title: "BARZ Local Runtime", required: true
  }, null, 2)}\n`, "utf8");

  const aggregatorRoot = path.join(payloadDirectory, "aggregator", "app");
  const aggregatorSources = [
    "server.js",
    "package.json",
    "package-lock.json",
    "public",
    "src",
    "node_modules"
  ];
  for (const name of aggregatorSources) {
    // The optional ElevenLabs SDK is not imported by either server or browser app.
    // Its declaration paths exceed NSIS's Windows path limit when bundled.
    const options = name === "node_modules" ? {
      filter: (source) => !source.split(path.sep).includes("@elevenlabs")
    } : {};
    await copyRequired(path.join(projectDirectory, name), path.join(aggregatorRoot, name), options);
  }
  await mkdir(path.join(aggregatorRoot, "data"), { recursive: true });
  await copyRequired(
    path.join(projectDirectory, "data", "catalog.seed.json"),
    path.join(aggregatorRoot, "data", "catalog.seed.json")
  );
  await integrateAggregatorSuiteBridge(aggregatorRoot);
  await writeLauncher({
    destination: path.join(payloadDirectory, "aggregator", "launch.vbs"),
    dataVariable: "BARZ_AGGREGATOR_DATA_DIR",
    dataDirectory: "%APPDATA%\\BARZ Suite 6\\Aggregator",
    serverPath: "app\\server.js",
    url: "http://127.0.0.1:4317/"
  });
  await writeFile(path.join(payloadDirectory, "aggregator", "component.json"), `${JSON.stringify({
    id: "aggregator", title: "BARZ Aggregator", required: false
  }, null, 2)}\n`, "utf8");

  const atlasRoot = path.join(payloadDirectory, "atlas", "app");
  for (const name of ["apps", "packages", "migration", "package.json", "package-lock.json", "node_modules"]) {
    await copyRequired(path.join(suiteDirectory, name), path.join(atlasRoot, name));
  }
  await mkdir(path.join(atlasRoot, "apps", "atlas", "docs"), { recursive: true });
  await copyRequired(
    path.join(installerDirectory, "prompt-engines-reference.html"),
    path.join(atlasRoot, "apps", "atlas", "docs", "prompt-engines-reference.html")
  );
  await copyRequired(
    path.join(installerDirectory, "prompt-skills-update-2026-10-03.html"),
    path.join(atlasRoot, "apps", "atlas", "docs", "prompt-skills-update-2026-10-03.html")
  );
  await writeLauncher({
    destination: path.join(payloadDirectory, "atlas", "launch.vbs"),
    dataVariable: "BARZ_SUITE_V6_DATA_DIR",
    dataDirectory: "%APPDATA%\\BARZ Suite 6\\Prompt Atlas",
    serverPath: "app\\apps\\atlas\\server.js",
    url: "http://127.0.0.1:4326/",
    healthUrl: "http://127.0.0.1:4326/api/v1/health",
    expectedVersion: manifest.version
  });
  await writeFile(path.join(payloadDirectory, "atlas", "component.json"), `${JSON.stringify({
    id: "atlas", title: "Prompt Atlas V6", required: false
  }, null, 2)}\n`, "utf8");

  await writeSuiteLauncher({
    destination: path.join(payloadDirectory, "launch.vbs"),
    expectedAtlasVersion: manifest.version
  });

  await writeFile(path.join(payloadDirectory, "manifest.json"), `${JSON.stringify({
    ...manifest,
    builtAt: new Date().toISOString(),
    nodeVersion: process.version
  }, null, 2)}\n`, "utf8");
  return payloadDirectory;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  console.log(`Prepared: ${await prepareProductPayload()}`);
}
