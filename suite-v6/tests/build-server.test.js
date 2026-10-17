import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createBuildServer } from "../apps/atlas/server.js";
import { CINEMA_HELPER_CATALOG, FACS_CATALOG } from "../packages/tool-adapters/src/index.js";
import { CAMERA_PRESETS, cameraPresetFrames, cameraPresetBuildings, cameraPresetActors, cameraPresetShips } from "../apps/atlas/public/assets/HTML/blocking-camera-presets.js";

async function fixture(t, overrides = {}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "barz-v6-build-server-"));
  const instance = await createBuildServer({
    dataDirectory: directory,
    legacySettingsPath: path.join(directory, "missing-legacy-settings.json"),
    ...overrides
  });
  t.after(async () => {
    await instance.close();
    await rm(directory, { recursive: true, force: true });
  });
  return instance;
}

async function jsonRequest(instance, pathname, method, body, origin = instance.url.slice(0, -1)) {
  const setupScoped = /^\/api\/v1\/(?:workshops|recipes|reset$|backups\/restore)/.test(pathname);
  const payload = setupScoped && body.expectedSetupId === undefined ? { expectedSetupId: "default", ...body } : body;
  return fetch(new URL(pathname, instance.url), {
    method,
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(payload)
  });
}

test("serves the Build UI with restrictive local headers", async (t) => {
  const instance = await fixture(t);
  const response = await fetch(instance.url);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-security-policy"), /script-src 'self'/);
  assert.match(response.headers.get("content-security-policy"), /media-src 'self' data: blob:/);
  assert.equal(response.headers.get("x-frame-options"), "SAMEORIGIN");
  const html = await response.text();
  assert.match(html, /Prompt Atlas V6/);
  assert.match(html, /<html lang="en" data-theme="dark" data-language="en">/);
  assert.match(html, /data-theme-choice="light"/);
  assert.match(html, /data-theme-choice="dark"/);
  assert.match(html, /data-language-choice="en"/);
  assert.match(html, /data-language-choice="fr"/);
  assert.match(html, /src="\/preferences\.js"/);
  assert.doesNotMatch(html, /Compose, ajuste et envoie un brouillon/);
  assert.match(html, /href="http:\/\/127\.0\.0\.1:4317\/"/);
  assert.match(html, /target="barz-aggregator"/);
  assert.match(html, /aria-label="Ouvrir BZ Aggregator"/);
  assert.match(html, /id="library-editor"/);
  assert.match(html, /Nouvelle bibliothèque/);
  const runtime = await (await fetch(new URL("/tool-workspace.js", instance.url))).text();
  assert.match(runtime, /adapterId === "prompt-library"/);
  assert.match(runtime, /renderPromptLibrary/);
  const preferencesResponse = await fetch(new URL("/preferences.js", instance.url));
  assert.equal(preferencesResponse.status, 200);
  const preferences = await preferencesResponse.text();
  assert.match(preferences, /barz-atlas-theme/);
  assert.match(preferences, /barz-atlas-language/);
  assert.match(preferences, /type: "barz:preferences"/);
  const apg = await (await fetch(new URL("/apg-studio.js", instance.url))).text();
  assert.match(apg, /intent\.placeholder = ""/);
  assert.doesNotMatch(apg, /Que doit devenir le prompt/);
  assert.match(apg, /General image generation/);
  assert.match(apg, /General video generation/);
  assert.match(apg, /const clear = action\("Effacer"/);
  assert.match(apg, /configuration\.prompt = ""/);
  assert.match(apg, /configuration\.model = aiStatus\.models\.some\(\(item\) => item\.id === aiStatus\.model\)/);
  assert.match(apg, /window\.addEventListener\("barz:aimodelchange"/);
  assert.match(apg, /await api\("\/api\/v1\/preferences"/);
  assert.match(runtime, /titleRow\.append\(titleElement, deckButton\)/);
  assert.match(runtime, /className = "tool-deck-button(?: signal)?"|button\("D", "tool-deck-button signal"\)/);
  assert.match(runtime, /deckButton\.dataset\.tooltip = active \? "Décrocher l’app du Deck" : "Ajouter l’app au Deck"/);
  assert.doesNotMatch(runtime, /\[\["cards", "Recettes"\], \["angles", "Angle 3D"\]/);
  assert.match(runtime, /toolId === "angle-3d"/);
  assert.match(runtime, /toolId === "relighting-3d"/);
  assert.doesNotMatch(runtime, /copy\.append\(node\("h2", "", title\), node\("p", "", description\)\)/);
  assert.match(runtime, /facs-v5-reference-popover/);
  const appRuntime = await (await fetch(new URL("/app.js", instance.url))).text();
  assert.match(appRuntime, /isWorkshop \|\| item\.id === "deck" \|\| item\.id === "utilities"/);
  assert.match(appRuntime, /barz:load-blocking-scene/);
  assert.match(appRuntime, /toolWorkspace\.openTool\("blocking-studio"\)/);
  assert.match(appRuntime, /currentView: "tools"/);
  assert.match(appRuntime, /runtimeWorkshopId: "utilities"/);
  assert.match(appRuntime, /\.then\(\(\) => showWorkshop\("utilities"\)\)/);
  const sharedTheme = await (await fetch(new URL("/assets/barzy-theme.js", instance.url))).text();
  assert.match(sharedTheme, /"sand"/);
  assert.match(sharedTheme, /barz:preferences/);
  const styles = await (await fetch(new URL("/styles.css", instance.url))).text();
  assert.match(styles, /\.tool-deck-button:hover::after/);
  assert.match(styles, /\.facs-v5-card:has\(\.facs-v5-face-wrap:hover\) \.facs-v5-reference-popover/);
  assert.match(styles, /\.facs-v5-face-wrap:hover \.facs-v5-reference-cover/);
  assert.doesNotMatch(styles, /\.facs-v5-card:hover \.facs-v5-reference-popover/);
  const globalAiStyles = await (await fetch(new URL("/global-ai-controls.css", instance.url))).text();
  assert.match(globalAiStyles, /select option\{background:#111516;color:#f5f1ee\}/);
  assert.match(globalAiStyles, /global-ai-apply-blocking/);
  const globalAi = await (await fetch(new URL("/global-ai-controls.js", instance.url))).text();
  assert.match(globalAi, /Construire dans Blocking Studio/);
  assert.match(globalAi, /t\("Copy", "Copier"\)/);
  assert.match(globalAi, /t\("Send to prompt", "Envoyer au prompt"\)/);
  assert.match(globalAi, /t\("AI iteration", "Itération IA"\)/);
  assert.match(globalAi, /actions\.append\(copy, send, iterate\)/);
  assert.match(globalAi, /No extra instruction was supplied\. Improvise/);
  assert.match(globalAi, /contextTool/);
  const vcamInfoResponse = await fetch(new URL("/api/vcam/info", instance.url));
  assert.equal(vcamInfoResponse.status, 200);
  const vcamInfo = await vcamInfoResponse.json();
  if (!vcamInfo.noLan) {
    assert.equal(vcamInfo.https, true);
    assert.match(vcamInfo.url, /^https:\/\/[^/]+\/phone$/);
    assert.match(vcamInfo.qrDataUrl, /^data:image\/png;base64,/);
  }
  const phoneCompanionResponse = await fetch(new URL("/assets/HTML/virtual-cam-phone.html", instance.url));
  assert.equal(phoneCompanionResponse.status, 200);
  const phoneCompanion = await phoneCompanionResponse.text();
  assert.match(phoneCompanion, /wss:\/\/\$\{location\.host\}\/vcam\?role=phone/);
  assert.match(phoneCompanion, /Enable motion/);
  assert.match(phoneCompanion, /isSessionSupported\("immersive-ar"\)/);
  assert.match(phoneCompanion, /optionalFeatures:\s*\["local-floor", "dom-overlay"\]/);
  assert.match(phoneCompanion, /requestReferenceSpace\("local-floor"\)/);
  assert.match(phoneCompanion, /requestReferenceSpace\("local"\)/);
  assert.doesNotMatch(phoneCompanion, /requiredFeatures:\s*\["local"\]/);
  assert.match(phoneCompanion, /new XRWebGLLayer\(xrSession, xrGl/);
  assert.match(phoneCompanion, /xrSession\.updateRenderState/);
  assert.match(phoneCompanion, /bindFramebuffer\(xrGl\.FRAMEBUFFER, layer\.framebuffer\)/);
  assert.match(phoneCompanion, /type:\s*"pose6dof"/);
  const shellResponse = await fetch(new URL("/suite.html", instance.url));
  assert.equal(shellResponse.status, 200);
  assert.match(shellResponse.headers.get("content-security-policy"), /frame-src 'self' http:\/\/127\.0\.0\.1:4317/);
  const shellMarkup = await shellResponse.text();
  assert.match(shellMarkup, /id="aggregator-frame"/);
  assert.match(shellMarkup, /id="aggregator-frame"[\s\S]*allow="fullscreen; clipboard-read; clipboard-write"/);
  assert.match(shellMarkup, /id="aggregator-frame"[\s\S]*allowfullscreen/);
  const shellRuntime = await (await fetch(new URL("/suite-shell.js", instance.url))).text();
  assert.match(shellRuntime, /initialParams\.get\("app"\) === "atlas" \? "atlas" : "aggregator"/);
  const bridge = await (await fetch(new URL("/suite-bridge.js", instance.url))).text();
  assert.match(bridge, /barz-suite:switch/);
  assert.match(bridge, /suite\.html/);
  assert.doesNotMatch(bridge, /window\.open/);
});

test("persists a shared theme and language contract for Aggregator synchronization", async (t) => {
  const instance = await fixture(t);
  let response = await fetch(new URL("/api/v1/preferences", instance.url));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    theme: "dark", language: "en", aiProvider: "openai", aiModel: "gpt-5.6-terra", updatedAt: ""
  });

  response = await jsonRequest(instance, "/api/v1/preferences", "PUT", {
    theme: "light",
    language: "fr",
    ignored: "not persisted"
  });
  assert.equal(response.status, 200);
  const updated = await response.json();
  assert.equal(updated.theme, "light");
  assert.equal(updated.language, "fr");
  assert.match(updated.updatedAt, /^\d{4}-\d{2}-\d{2}T/);

  response = await fetch(new URL("/api/v1/preferences", instance.url));
  assert.deepEqual(await response.json(), updated);
});

test("returns the fixed navigation and supports a transactional workshop workflow", async (t) => {
  const instance = await fixture(t);
  let response = await fetch(new URL("/api/v1/registry", instance.url));
  let payload = await response.json();
  assert.equal(payload.setupContext.activeSetup.name, "Mon Atlas");
  assert.deepEqual(payload.navigation.map(({ id }) => id), [
    "deck", "prompt-forge", "image-looks", "character-lab", "grid-generation",
    "video-builder", "utilities", "build"
  ]);

  response = await jsonRequest(instance, "/api/v1/workshops", "POST", {
    expectedRevision: 0,
    workshop: { id: "dialogues", title: "Dialogues", order: 6 }
  });
  assert.equal(response.status, 201);
  payload = await response.json();
  assert.equal(payload.registry.revision, 1);
  assert.equal(payload.navigation.at(-3).id, "dialogues");

  const ids = payload.registry.workshops.map(({ id }) => id).reverse();
  response = await jsonRequest(instance, "/api/v1/workshops/order", "PUT", { expectedRevision: 1, ids });
  assert.equal(response.status, 200);
  payload = await response.json();
  assert.deepEqual(payload.registry.workshops.map(({ id }) => id), ids);
  assert.equal(payload.navigation[0].id, "deck");
  assert.deepEqual(payload.navigation.slice(-2).map(({ id }) => id), ["utilities", "build"]);
});

test("creates and compiles a user recipe while preserving markup as literal output", async (t) => {
  const instance = await fixture(t);
  const recipe = {
    schemaVersion: "1.0",
    id: "literal-user-v1",
    revision: 1,
    title: "Literal user recipe",
    fields: [{ id: "input", label: "Sujet", type: "text", required: true }],
    outputs: [{ id: "main", mediaType: "image", template: "Portrait of {{input}}" }],
    referenceSlots: []
  };
  let response = await jsonRequest(instance, "/api/v1/recipes", "POST", {
    expectedRevision: 0,
    recipe,
    tool: { id: "literal-user", title: "Literal user recipe", kind: "recipe", recipeId: recipe.id },
    placements: [{ id: "literal-user-in-ideas", targetId: "prompt-forge", order: 1 }]
  });
  assert.equal(response.status, 201);

  const literal = "<script>globalThis.compromised=true</script>";
  response = await jsonRequest(instance, "/api/v1/compile", "POST", {
    recipeId: recipe.id,
    values: { input: literal }
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).outputs[0].prompt, `Portrait of ${literal}`);
  assert.equal(globalThis.compromised, undefined);
});

test("maps stale revisions to 409 and refuses cross-origin mutations", async (t) => {
  const instance = await fixture(t);
  let response = await jsonRequest(instance, "/api/v1/workshops/prompt-forge", "PATCH", {
    expectedRevision: 0,
    title: "Ideas changed"
  });
  assert.equal(response.status, 200);
  response = await jsonRequest(instance, "/api/v1/workshops/prompt-forge", "PATCH", {
    expectedRevision: 0,
    title: "Stale"
  });
  assert.equal(response.status, 409);
  assert.equal((await response.json()).error.code, "REGISTRY_CONFLICT");

  response = await jsonRequest(instance, "/api/v1/workshops", "POST", {
    expectedRevision: 1,
    workshop: { id: "foreign", title: "Foreign", order: 7 }
  }, "https://attacker.example");
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.path, "Origin");
});

test("previews reset impact and creates a recoverable backup through the API", async (t) => {
  const instance = await fixture(t);
  await jsonRequest(instance, "/api/v1/workshops/prompt-forge", "PATCH", {
    expectedRevision: 0,
    title: "Mes idées"
  });
  const preview = await fetch(new URL("/api/v1/reset-preview?setupId=default&workshopId=prompt-forge", instance.url));
  assert.deepEqual((await preview.json()).changedWorkshopIds, ["prompt-forge"]);
  const response = await jsonRequest(instance, "/api/v1/reset", "POST", {
    expectedRevision: 1,
    expectedToolRevision: 0,
    scope: { workshopId: "prompt-forge" }
  });
  const payload = await response.json();
  assert.equal(payload.registry.workshops.find(({ id }) => id === "prompt-forge").title, "Idea Studio");
  assert.match(payload.backupName, /reset-prompt-forge/);
});

test("creates isolated setups and restores a named setup version through the API", async (t) => {
  const instance = await fixture(t);
  let response = await jsonRequest(instance, "/api/v1/workshops/prompt-forge", "PATCH", {
    expectedRevision: 0,
    title: "Direction A"
  });
  let payload = await response.json();

  response = await jsonRequest(instance, "/api/v1/setup-versions", "POST", {
    expectedSetupId: "default",
    expectedRevision: payload.registry.revision,
    expectedToolRevision: payload.toolStateRevision,
    name: "Version A"
  });
  assert.equal(response.status, 201);
  const version = (await response.json()).version;

  response = await jsonRequest(instance, "/api/v1/setups", "POST", {
    expectedMetadataRevision: 0,
    name: "Montage B",
    duplicateFromSetupId: "default"
  });
  payload = await response.json();
  const secondId = payload.setupContext.activeSetup.id;
  assert.equal(payload.registry.workshops.find(({ id }) => id === "prompt-forge").title, "Direction A");

  response = await jsonRequest(instance, "/api/v1/setups/switch", "POST", {
    expectedMetadataRevision: payload.setupContext.metadataRevision,
    id: "default"
  });
  payload = await response.json();
  assert.equal(payload.setupContext.activeSetup.id, "default");
  assert.ok(payload.setupContext.setups.some(({ id }) => id === secondId));

  response = await jsonRequest(instance, "/api/v1/setup-versions/restore", "POST", {
    expectedSetupId: "default",
    expectedRevision: payload.registry.revision,
    expectedToolRevision: payload.toolStateRevision,
    versionId: version.id
  });
  assert.equal(response.status, 200);
  payload = await response.json();
  assert.equal(payload.registry.workshops.find(({ id }) => id === "prompt-forge").title, "Direction A");
  assert.match(payload.recoveryVersion.name, /Avant restauration/);
});

test("serves all reviewed tool catalogs, compiles them and persists setup-scoped settings", async (t) => {
  const instance = await fixture(t);
  let response = await fetch(new URL("/api/v1/tool-catalog", instance.url));
  let payload = await response.json();
  assert.equal(payload.enhancer.cards.length, 20);
  assert.equal(payload.imperfection.presetIds.length, 10);
  assert.equal(payload.goodies.entries.length, 77);
  assert.equal(payload.goodies.categories.length, 8);
  assert.equal(payload.beauty.entries.length, 42);
  assert.equal(payload.beauty.categories.length, 7);
  assert.equal(payload.realism.tabs.length, 9);
  assert.equal(payload.realism.tabs.flatMap(({ cards }) => cards).length, 29);
  assert.equal(payload.cinematicShoot.families.length, 7);
  assert.equal(payload.cinematicShoot.prompts.length, 41);
  assert.equal(payload.facs.entries.length, 49);
  assert.equal(payload.facs.crop.version, "facs-7x7-v1");
  assert.deepEqual(payload.board.models, ["seedance", "kling", "veo"]);
  assert.equal(payload.cameraSuite.sections.length, 7);
  assert.equal(payload.cameraSuite.cards.length, 22);
  assert.ok(payload.cameraSuite.cards.every(({ variants }) => variants.length === 5));
  assert.deepEqual(payload.imageSlicer.formats, ["png", "jpeg", "webp"]);
  assert.equal(payload.imageSlicer.processing, "local");

  response = await fetch(new URL("/api/v1/tools/imperfection/configuration?setupId=default", instance.url));
  payload = await response.json();
  assert.equal(payload.toolRevision, 0);
  assert.equal(payload.configuration.state.camera.device, "smartphone_handheld");
  payload.configuration.state.camera.handDrift = 4;

  response = await jsonRequest(instance, "/api/v1/tools/imperfection/configuration", "PUT", {
    expectedSetupId: "default",
    expectedToolRevision: 0,
    configuration: payload.configuration
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).toolRevision, 1);

  response = await jsonRequest(instance, "/api/v1/tools/imperfection/compile", "POST", { configuration: payload.configuration });
  payload = await response.json();
  assert.match(payload.prompt, /hand drift of 4mm/);
  assert.equal(payload.stats.activeConstraints, 6);

  const enhancerConfiguration = {
    mode: "angles",
    selectedCardId: "barz-enhancer-surgical-refinement",
    subject: "A literal <hero>",
    preservationMode: "",
    selectedAngleIds: ["high-left"]
  };
  response = await jsonRequest(instance, "/api/v1/tools/barz-enhancer/compile", "POST", { configuration: enhancerConfiguration });
  payload = await response.json();
  assert.equal(payload.outputs.length, 1);
  assert.match(payload.outputs[0].prompt, /A literal <hero>/);

  for (const [toolId, mode, outputId] of [["angle-3d", "angles", "angle-camera"], ["relighting-3d", "relighting", "relighting-rig"]]) {
    response = await fetch(new URL(`/api/v1/tools/${toolId}/configuration?setupId=default`, instance.url));
    assert.equal(response.status, 200);
    const spatial = await response.json();
    assert.equal(spatial.configuration.mode, mode);
    spatial.configuration.mode = "cards";
    response = await jsonRequest(instance, `/api/v1/tools/${toolId}/compile`, "POST", { configuration: spatial.configuration });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).outputs[0].id, outputId);
  }

  response = await fetch(new URL("/api/v1/tools/banana-helper/configuration?setupId=default", instance.url));
  const goodies = await response.json();
  goodies.configuration.searchQuery = "VHS";
  goodies.configuration.detailsByPrompt[goodies.configuration.selectedEntryId] = "$& <sujet>";
  response = await jsonRequest(instance, "/api/v1/tools/banana-helper/configuration", "PUT", {
    expectedSetupId: "default",
    expectedToolRevision: goodies.toolRevision,
    configuration: goodies.configuration
  });
  assert.equal(response.status, 200);
  response = await jsonRequest(instance, "/api/v1/tools/banana-helper/compile", "POST", { configuration: goodies.configuration });
  payload = await response.json();
  assert.equal(payload.outputs[0].mediaType, "image");
  assert.equal(payload.outputs[0].prompt.split("$& <sujet>").length - 1, 2);
  assert.match(payload.copyAll, /^1930s \/ Art Deco Lobby Portrait/);

  response = await fetch(new URL("/api/v1/tools/barz-beauty/configuration?setupId=default", instance.url));
  const beauty = await response.json();
  response = await jsonRequest(instance, "/api/v1/tools/barz-beauty/compile", "POST", { configuration: beauty.configuration });
  payload = await response.json();
  assert.equal(payload.outputs[0].mediaType, "image");
  assert.match(payload.outputs[0].prompt, /smartphone mirror selfie/);

  response = await fetch(new URL("/api/v1/tools/realism-forge/configuration?setupId=default", instance.url));
  const realism = await response.json();
  realism.configuration.description = "$& <subject>  double  space";
  response = await jsonRequest(instance, "/api/v1/tools/realism-forge/configuration", "PUT", {
    expectedSetupId: "default",
    expectedToolRevision: realism.toolRevision,
    configuration: realism.configuration
  });
  assert.equal(response.status, 200);
  response = await jsonRequest(instance, "/api/v1/tools/realism-forge/compile", "POST", { configuration: realism.configuration });
  payload = await response.json();
  assert.match(payload.outputs[0].prompt, /SUBJECT: \$& <subject>  double  space/);

  response = await fetch(new URL("/api/v1/tools/cinematic-shoot/configuration?setupId=default", instance.url));
  const cinematic = await response.json();
  cinematic.configuration.grid = { cols: 4, rows: 2 };
  cinematic.configuration.characterMode = "human";
  cinematic.configuration.detailsByPrompt[cinematic.configuration.selectedPromptId] = "Context: practical miniature city";
  response = await jsonRequest(instance, "/api/v1/tools/cinematic-shoot/configuration", "PUT", {
    expectedSetupId: "default",
    expectedToolRevision: cinematic.toolRevision,
    configuration: cinematic.configuration
  });
  assert.equal(response.status, 200);
  response = await jsonRequest(instance, "/api/v1/tools/cinematic-shoot/compile", "POST", { configuration: cinematic.configuration });
  payload = await response.json();
  assert.deepEqual(payload.grid, { cols: 4, rows: 2, total: 8 });
  assert.match(payload.outputs[0].prompt, /CONTEXT: practical miniature city/);
  assert.match(payload.outputs[0].prompt, /Output exactly 8 frames arranged in 4 columns and 2 rows/);
  assert.doesNotMatch(payload.outputs[0].prompt, /PUPPET MODE:/);
});

test("A4 personal FACS sheets and Board cues survive setup duplication, versions and reset", async (t) => {
  const instance = await fixture(t);
  let response = await fetch(new URL("/api/v1/tools/facs-sheet-generator/configuration?setupId=default", instance.url));
  let payload = await response.json();
  const personalCard = {
    id: "facs-card-test123456",
    name: "Visage personnel",
    boardDataUrl: "data:image/png;base64,AAAA",
    cropVersion: FACS_CATALOG.crop.version,
    createdAt: "2026-09-12T10:00:00.000Z",
    sourceName: "visage.png",
    mapping: FACS_CATALOG.entries.map(({ id }) => id)
  };
  payload.configuration.customCards.push(personalCard);
  payload.configuration.activeReferenceId = personalCard.id;
  payload.configuration.selectedIds = ["facs-au62", "facs-au1"];
  payload.configuration.customOutputs["acting-layer"] = "Acting personnalisé $& <literal>";
  response = await jsonRequest(instance, "/api/v1/tools/facs-sheet-generator/configuration", "PUT", {
    expectedSetupId: "default",
    expectedToolRevision: payload.toolRevision,
    configuration: payload.configuration
  });
  assert.equal(response.status, 200);
  let toolRevision = (await response.json()).toolRevision;

  response = await fetch(new URL("/api/v1/tools/barzy-board/configuration?setupId=default", instance.url));
  payload = await response.json();
  payload.configuration.story.subject = "Archiviste lunaire";
  payload.configuration.story.action = "traverse une salle noyée";
  payload.configuration.story.facsCueIds = ["facs-au62", "facs-au1"];
  payload.configuration.motion.facsMode = "custom";
  payload.configuration.motion.facsCueIds = [];
  payload.configuration.customOutputs.story = "Storyboard manuel conservé";
  response = await jsonRequest(instance, "/api/v1/tools/barzy-board/configuration", "PUT", {
    expectedSetupId: "default",
    expectedToolRevision: toolRevision,
    configuration: payload.configuration
  });
  assert.equal(response.status, 200);
  toolRevision = (await response.json()).toolRevision;

  response = await jsonRequest(instance, "/api/v1/setup-versions", "POST", {
    expectedSetupId: "default",
    expectedRevision: 0,
    expectedToolRevision: toolRevision,
    name: "A4 avec visage"
  });
  assert.equal(response.status, 201);
  const savedVersion = (await response.json()).version;

  response = await jsonRequest(instance, "/api/v1/setups", "POST", {
    expectedMetadataRevision: 0,
    name: "Copie A4",
    duplicateFromSetupId: "default"
  });
  assert.equal(response.status, 201);
  payload = await response.json();
  const duplicateId = payload.setupContext.activeSetup.id;
  response = await fetch(new URL(`/api/v1/tools/facs-sheet-generator/configuration?setupId=${duplicateId}`, instance.url));
  payload = await response.json();
  assert.equal(payload.configuration.customCards[0].id, personalCard.id);
  assert.deepEqual(payload.configuration.selectedIds, ["facs-au62", "facs-au1"]);

  response = await jsonRequest(instance, "/api/v1/setups/switch", "POST", {
    expectedMetadataRevision: 1,
    id: "default"
  });
  assert.equal(response.status, 200);
  payload = await response.json();
  response = await jsonRequest(instance, "/api/v1/reset", "POST", {
    expectedSetupId: "default",
    expectedRevision: payload.registry.revision,
    expectedToolRevision: toolRevision,
    scope: "all"
  });
  assert.equal(response.status, 200);
  payload = await response.json();
  assert.ok(payload.resetToolIds.includes("facs-sheet-generator"));
  const resetRegistryRevision = payload.registry.revision;
  const resetToolRevision = payload.toolStateRevision;

  response = await fetch(new URL("/api/v1/tools/facs-sheet-generator/configuration?setupId=default", instance.url));
  payload = await response.json();
  assert.equal(payload.configuration.customCards[0].id, personalCard.id);
  assert.equal(payload.configuration.activeReferenceId, personalCard.id);
  assert.deepEqual(payload.configuration.selectedIds, []);
  assert.deepEqual(payload.configuration.customOutputs, {});

  response = await jsonRequest(instance, "/api/v1/setup-versions/restore", "POST", {
    expectedSetupId: "default",
    expectedRevision: resetRegistryRevision,
    expectedToolRevision: resetToolRevision,
    versionId: savedVersion.id
  });
  assert.equal(response.status, 200);
  response = await fetch(new URL("/api/v1/tools/barzy-board/configuration?setupId=default", instance.url));
  payload = await response.json();
  assert.deepEqual(payload.configuration.story.facsCueIds, ["facs-au62", "facs-au1"]);
  assert.equal(payload.configuration.motion.facsMode, "custom");
  assert.deepEqual(payload.configuration.motion.facsCueIds, []);
  assert.equal(payload.configuration.customOutputs.story, "Storyboard manuel conservé");
});

test("A5 Camera Suite persists its ordered composition and compiles a video draft without model settings", async (t) => {
  const instance = await fixture(t);
  let response = await fetch(new URL("/api/v1/tools/veo-suite/configuration?setupId=default", instance.url));
  let payload = await response.json();
  assert.deepEqual(payload.configuration.activeCardIds, []);
  assert.equal(Object.keys(payload.configuration.variantByCard).length, 22);
  assert.ok(Object.values(payload.configuration.variantByCard).every((value) => value === 2));
  assert.equal(payload.configuration.incoming.text, "");
  payload.configuration.incoming = { text: "A practical miniature city", source: "Idea Studio" };
  payload.configuration.activeCardIds = ["focus", "dolly"];
  payload.configuration.variantByCard.dolly = 4;
  payload.configuration.variantByCard.focus = 1;
  payload.configuration.customPrompts["veo-suite-focus-1"] = "custom focus pull";
  response = await jsonRequest(instance, "/api/v1/tools/veo-suite/configuration", "PUT", {
    expectedSetupId: "default",
    expectedToolRevision: payload.toolRevision,
    configuration: payload.configuration
  });
  assert.equal(response.status, 200);
  const savedRevision = (await response.json()).toolRevision;
  assert.equal(savedRevision, 1);

  response = await jsonRequest(instance, "/api/v1/tools/veo-suite/compile", "POST", { configuration: payload.configuration });
  const compiled = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(compiled.layers.map(({ id }) => id), ["incoming", "veo-suite-dolly-4", "veo-suite-focus-1"]);
  assert.equal(compiled.outputs[0].mediaType, "video");
  assert.match(compiled.outputs[0].prompt, /^A practical miniature city\n/);
  assert.match(compiled.outputs[0].prompt, /\ncustom focus pull$/);

  response = await fetch(new URL("/api/v1/tools/veo-suite/configuration?setupId=default", instance.url));
  payload = await response.json();
  assert.equal(payload.toolRevision, savedRevision);
  assert.deepEqual(payload.configuration.activeCardIds, ["focus", "dolly"]);
  assert.equal(payload.configuration.customPrompts["veo-suite-focus-1"], "custom focus pull");
});

test("A6 CCP persists independent stages and compiles targeted image drafts", async (t) => {
  const instance = await fixture(t);
  let response = await fetch(new URL("/api/v1/tools/cccp/configuration?setupId=default", instance.url));
  let payload = await response.json();
  assert.deepEqual(payload.configuration.grid, { cols: 3, rows: 3 });
  assert.deepEqual(payload.configuration.modes, { a2: "puppet", b: "puppet", c: "puppet" });
  payload.configuration.grid = { cols: 4, rows: 2 };
  payload.configuration.modes = { a2: "human", b: "puppet", c: "human" };
  payload.configuration.scene = "$& <courier> crosses the archive";
  payload.configuration.panelCode = "B4";
  payload.configuration.iterationTake = 2;
  payload.configuration.collapsedStageIds = ["a1", "a2", "c"];
  payload.configuration.customOutputs.a2 = "Personal exact A2 prompt";
  response = await jsonRequest(instance, "/api/v1/tools/cccp/configuration", "PUT", {
    expectedSetupId: "default",
    expectedToolRevision: payload.toolRevision,
    configuration: payload.configuration
  });
  assert.equal(response.status, 200);

  response = await jsonRequest(instance, "/api/v1/tools/cccp/compile", "POST", { configuration: payload.configuration, stageId: "b" });
  let compiled = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(compiled.outputs.map(({ id }) => id), ["b"]);
  assert.equal(compiled.outputs[0].mediaType, "image");
  assert.match(compiled.outputs[0].prompt, /OUTPUT GRID: Generate exactly 8 panels in a 4x2 grid/);
  assert.match(compiled.outputs[0].prompt, /\$& <courier> crosses the archive/);
  assert.match(compiled.outputs[0].prompt, /ITERATION - Take 3:/);

  const invalid = structuredClone(payload.configuration);
  invalid.panelCode = "C3";
  response = await jsonRequest(instance, "/api/v1/tools/cccp/compile", "POST", { configuration: invalid, stageId: "a1" });
  assert.equal(response.status, 200);
  response = await jsonRequest(instance, "/api/v1/tools/cccp/compile", "POST", { configuration: invalid, stageId: "c" });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.path, "configuration.panelCode");

  response = await fetch(new URL("/api/v1/tools/cccp/configuration?setupId=default", instance.url));
  payload = await response.json();
  assert.equal(payload.configuration.customOutputs.a2, "Personal exact A2 prompt");
  assert.deepEqual(payload.configuration.collapsedStageIds, ["a1", "a2", "c"]);

  response = await jsonRequest(instance, "/api/v1/reset", "POST", {
    expectedSetupId: "default",
    expectedRevision: 0,
    expectedToolRevision: 1,
    scope: "all"
  });
  assert.equal(response.status, 200);
  response = await fetch(new URL("/api/v1/tools/cccp/configuration?setupId=default", instance.url));
  payload = await response.json();
  assert.deepEqual(payload.configuration.grid, { cols: 3, rows: 3 });
  assert.deepEqual(payload.configuration.modes, { a2: "puppet", b: "puppet", c: "puppet" });
  assert.equal(payload.configuration.customOutputs.a2, "Personal exact A2 prompt");
});

test("A7 BZ Sheet persists controls, custom finals and targeted image compilation", async (t) => {
  const instance = await fixture(t);
  let response = await fetch(new URL("/api/v1/tools/barzy-sheet/configuration?setupId=default", instance.url));
  let payload = await response.json();
  assert.equal(payload.configuration.activeTab, "techboard");
  assert.equal(payload.configuration.facsIds.length, 8);
  payload.configuration.activeTab = "charsheet";
  payload.configuration.backgrounds.objectsheet = "pink";
  payload.configuration.weapon = "neutral";
  payload.configuration.expandedCardIds = ["posesheet"];
  payload.configuration.customOutputs.simplesheet = "Personal exact sheet prompt";
  response = await jsonRequest(instance, "/api/v1/tools/barzy-sheet/configuration", "PUT", {
    expectedSetupId: "default",
    expectedToolRevision: payload.toolRevision,
    configuration: payload.configuration
  });
  assert.equal(response.status, 200);

  response = await jsonRequest(instance, "/api/v1/tools/barzy-sheet/compile", "POST", {
    configuration: payload.configuration,
    cardId: "posesheet"
  });
  const compiled = await response.json();
  assert.equal(response.status, 200);
  assert.equal(compiled.outputs[0].mediaType, "image");
  assert.match(compiled.outputs[0].prompt, /EMPTY-HAND LOCOMOTION/);
  assert.deepEqual(compiled.outputs[0].settings, {});

  response = await jsonRequest(instance, "/api/v1/tools/barzy-sheet/compile", "POST", {
    configuration: payload.configuration,
    cardId: "simplesheet"
  });
  assert.equal((await response.json()).outputs[0].prompt, "Personal exact sheet prompt");

  response = await fetch(new URL("/api/v1/tool-catalog", instance.url));
  const catalog = await response.json();
  assert.equal(catalog.sheet.cards.length, 11);
  assert.equal(catalog.sheet.weapons.length, 19);
  assert.equal(catalog.sheet.facs.length, 49);
});

test("A8 BZ Designer persists controls, custom finals and targeted image compilation", async (t) => {
  const instance = await fixture(t);
  let response = await fetch(new URL("/api/v1/tools/barz-designer/configuration?setupId=default", instance.url));
  let payload = await response.json();
  assert.equal(payload.configuration.activeCategory, "sketch");
  assert.equal(payload.configuration.drawingWeight, 55);
  assert.deepEqual(payload.configuration.selectedColors["body-1"], { name: "Beige", hex: "#B3A089" });
  payload.configuration.activeTabs.sketch = "kids";
  payload.configuration.drawingWeight = 85;
  payload.configuration.scene = "$& <studio>  double  space";
  payload.configuration.expandedCardIds = ["sketch-photo-8"];
  payload.configuration.customOutputs["body-2"] = "Personal exact designer prompt";
  response = await jsonRequest(instance, "/api/v1/tools/barz-designer/configuration", "PUT", {
    expectedSetupId: "default",
    expectedToolRevision: payload.toolRevision,
    configuration: payload.configuration
  });
  assert.equal(response.status, 200);

  response = await jsonRequest(instance, "/api/v1/tools/barz-designer/compile", "POST", {
    configuration: payload.configuration,
    cardId: "sketch-photo-8"
  });
  let compiled = await response.json();
  assert.equal(response.status, 200);
  assert.equal(compiled.outputs[0].mediaType, "image");
  assert.match(compiled.outputs[0].prompt, /\$& <studio>  double  space/);
  assert.deepEqual(compiled.outputs[0].settings, {});

  response = await jsonRequest(instance, "/api/v1/tools/barz-designer/compile", "POST", {
    configuration: payload.configuration,
    cardId: "body-2"
  });
  assert.equal((await response.json()).outputs[0].prompt, "Personal exact designer prompt");

  const invalid = structuredClone(payload.configuration);
  invalid.drawingWeight = 62;
  response = await jsonRequest(instance, "/api/v1/tools/barz-designer/compile", "POST", { configuration: invalid, cardId: "body-2" });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.path, "configuration.drawingWeight");

  response = await fetch(new URL("/api/v1/tool-catalog", instance.url));
  const catalog = await response.json();
  assert.equal(catalog.designer.cards.length, 55);
  assert.deepEqual(catalog.designer.categories.map(({ cardCount }) => cardCount), [49, 3, 3]);

  response = await jsonRequest(instance, "/api/v1/reset", "POST", {
    expectedSetupId: "default",
    expectedRevision: 0,
    expectedToolRevision: 1,
    scope: "all"
  });
  assert.equal(response.status, 200);
  response = await fetch(new URL("/api/v1/tools/barz-designer/configuration?setupId=default", instance.url));
  payload = await response.json();
  assert.equal(payload.configuration.activeCategory, "sketch");
  assert.equal(payload.configuration.drawingWeight, 55);
  assert.deepEqual(payload.configuration.selectedColors["body-1"], { name: "Beige", hex: "#B3A089" });
  assert.equal(payload.configuration.scene, "");
  assert.equal(payload.configuration.customOutputs["body-2"], "Personal exact designer prompt");
});

test("A9 Knolling persists ordered controls, custom finals and targeted image compilation", async (t) => {
  const instance = await fixture(t);
  let response = await fetch(new URL("/api/v1/tools/knolling/configuration?setupId=default", instance.url));
  let payload = await response.json();
  assert.equal(payload.configuration.activeTab, "generate");
  assert.equal(payload.configuration.activeExplorerTab, "var1");
  assert.deepEqual(payload.configuration.tattooZones, []);
  payload.configuration.activeTab = "tattoo";
  payload.configuration.tattooBodyMode = "provided-body";
  payload.configuration.tattooZones = ["right forearm", "left shoulder"];
  payload.configuration.expandedCardIds = ["tattoocharacter"];
  payload.configuration.customOutputs.outfit = "Personal exact knolling prompt";
  response = await jsonRequest(instance, "/api/v1/tools/knolling/configuration", "PUT", {
    expectedSetupId: "default",
    expectedToolRevision: payload.toolRevision,
    configuration: payload.configuration
  });
  assert.equal(response.status, 200);

  response = await jsonRequest(instance, "/api/v1/tools/knolling/compile", "POST", {
    configuration: payload.configuration,
    cardId: "tattoocharacter"
  });
  let compiled = await response.json();
  assert.equal(response.status, 200);
  assert.match(compiled.outputs[0].prompt, /@image2 tattoo reference goes on: right forearm/);
  assert.match(compiled.outputs[0].prompt, /@image3 tattoo reference goes on: left shoulder/);
  assert.equal(compiled.outputs[0].mediaType, "image");
  assert.deepEqual(compiled.outputs[0].settings, {});

  response = await jsonRequest(instance, "/api/v1/tools/knolling/compile", "POST", {
    configuration: payload.configuration,
    cardId: "outfit"
  });
  assert.equal((await response.json()).outputs[0].prompt, "Personal exact knolling prompt");

  const invalid = structuredClone(payload.configuration);
  invalid.tattooZones = ["right hand", "right hand"];
  response = await jsonRequest(instance, "/api/v1/tools/knolling/compile", "POST", {
    configuration: invalid,
    cardId: "tattoocharacter"
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.path, "configuration.tattooZones");

  response = await fetch(new URL("/api/v1/tool-catalog", instance.url));
  const catalog = await response.json();
  assert.equal(catalog.knolling.cards.length, 17);
  assert.deepEqual(catalog.knolling.tabs.map(({ cardCount }) => cardCount), [7, 2, 2, 6]);

  response = await jsonRequest(instance, "/api/v1/reset", "POST", {
    expectedSetupId: "default",
    expectedRevision: 0,
    expectedToolRevision: 1,
    scope: "all"
  });
  assert.equal(response.status, 200);
  response = await fetch(new URL("/api/v1/tools/knolling/configuration?setupId=default", instance.url));
  payload = await response.json();
  assert.equal(payload.configuration.activeTab, "generate");
  assert.equal(payload.configuration.activeExplorerTab, "var1");
  assert.deepEqual(payload.configuration.tattooZones, []);
  assert.equal(payload.configuration.customOutputs.outfit, "Personal exact knolling prompt");
});

test("A10 Multishot persists grids and finals while compiling image and video drafts", async (t) => {
  const instance = await fixture(t);
  let response = await fetch(new URL("/api/v1/tools/multishot/configuration?setupId=default", instance.url));
  let payload = await response.json();
  assert.equal(payload.configuration.activeTab, "camera");
  assert.deepEqual(payload.configuration.grid, { cols: 3, rows: 3 });
  payload.configuration.activeTab = "multishot";
  payload.configuration.selectedCardIds.multishot = "multi-angle";
  payload.configuration.grid = { cols: 4, rows: 3 };
  payload.configuration.subject = "Literal $& ${angleList} <b>subject</b>";
  payload.configuration.customOutputs["camera-13"] = "Personal tracking prompt";
  response = await jsonRequest(instance, "/api/v1/tools/multishot/configuration", "PUT", {
    expectedSetupId: "default",
    expectedToolRevision: payload.toolRevision,
    configuration: payload.configuration
  });
  assert.equal(response.status, 200);

  response = await jsonRequest(instance, "/api/v1/tools/multishot/compile", "POST", {
    configuration: payload.configuration,
    outputId: "multi-angle"
  });
  let compiled = await response.json();
  assert.equal(response.status, 200);
  assert.match(compiled.outputs[0].prompt, /4x3 grid \(12 panels\)/);
  assert.match(compiled.outputs[0].prompt, /Literal \$& \$\{angleList\} <b>subject<\/b>/);
  assert.equal(compiled.outputs[0].mediaType, "image");

  response = await jsonRequest(instance, "/api/v1/tools/multishot/compile", "POST", {
    configuration: payload.configuration,
    outputId: "camera-13"
  });
  compiled = await response.json();
  assert.equal(compiled.outputs[0].prompt, "Personal tracking prompt");
  assert.equal(compiled.outputs[0].mediaType, "video");
  assert.deepEqual(compiled.outputs[0].settings, {});

  const invalid = structuredClone(payload.configuration);
  invalid.grid.rows = 5;
  response = await jsonRequest(instance, "/api/v1/tools/multishot/compile", "POST", {
    configuration: invalid,
    outputId: "multishot-1"
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.path, "configuration.grid.rows");

  response = await fetch(new URL("/api/v1/tool-catalog", instance.url));
  const catalog = await response.json();
  assert.equal(catalog.multishot.camera.length, 24);
  assert.equal(catalog.multishot.cards.length, 14);
  assert.equal(catalog.multishot.iterationAvailable, false);

  response = await jsonRequest(instance, "/api/v1/reset", "POST", {
    expectedSetupId: "default",
    expectedRevision: 0,
    expectedToolRevision: 1,
    scope: "all"
  });
  assert.equal(response.status, 200);
  response = await fetch(new URL("/api/v1/tools/multishot/configuration?setupId=default", instance.url));
  payload = await response.json();
  assert.deepEqual(payload.configuration.grid, { cols: 3, rows: 3 });
  assert.equal(payload.configuration.subject, "");
  assert.equal(payload.configuration.customOutputs["camera-13"], "Personal tracking prompt");
});

test("A11 Video Multi Framing persists references and finals while reset restores only controls", async (t) => {
  const instance = await fixture(t);
  let response = await fetch(new URL("/api/v1/tool-catalog", instance.url));
  let catalog = await response.json();
  assert.equal(catalog.seedance.templates.length, 25);
  assert.deepEqual(catalog.seedance.categoryOrder, ["CORE", "SECONDARY", "WILD CARDS", "REAL", "SIGNATURE"]);
  assert.equal(catalog.seedance.aiDirectionAvailable, false);
  assert.equal(catalog.seedance.referenceTransferAvailable, false);
  const workspaceSource = await (await fetch(new URL("/tool-workspace.js", instance.url))).text();
  assert.match(workspaceSource, /uploadSeedanceReferences\(c\.references, uploadImageReference\)/);
  assert.match(workspaceSource, /remapSeedancePromptForAggregator\(editor\.value, c\.references\)/);
  assert.match(workspaceSource, /slotToOrdinal\.get\(Number\(rawSlot\)\)/);
  assert.match(workspaceSource, /\{ durationSeconds: c\.duration \}[^\n]+references\);/);
  assert.match(workspaceSource, /roleGroup\("context"[^\n]+"Décor principal"[^\n]+seedanceContextPresets\)/);
  assert.match(workspaceSource, /\+ \$\{secondaryLabel\}/);
  assert.match(workspaceSource, /"Pursuit \/ Chase — clear predator-prey geography and acceleration"/);

  response = await fetch(new URL("/api/v1/tools/seedance/configuration?setupId=default", instance.url));
  let payload = await response.json();
  payload.configuration.mode = "moving";
  payload.configuration.provider = "seedance";
  payload.configuration.duration = 9;
  payload.configuration.shotCount = 8;
  payload.configuration.references = [{
    slot: 3,
    imageId: "image-stable-3",
    sourceName: "hero.png",
    dataUrl: "data:image/png;base64,AA==",
    subject: "clockwork diver",
    context: "flooded observatory"
  }];
  response = await jsonRequest(instance, "/api/v1/tools/seedance/compile", "POST", {
    configuration: payload.configuration,
    ignoreSaved: true
  });
  let compiled = await response.json();
  assert.equal(response.status, 200);
  assert.match(compiled.outputs[0].prompt, /^References:\n@image3:/);
  assert.equal(compiled.plan.at(-1).endTicks, 900);
  assert.ok(compiled.warnings.includes("REPEATED_TEMPLATE_CYCLE"));
  assert.doesNotMatch(compiled.outputs[0].prompt, /\d\d:\d\d\.\d\d-\d\d:\d\d\.\d\d/);
  payload.configuration.finals[compiled.outputs[0].finalKey] = "Personal moving final $& <kept>";

  response = await jsonRequest(instance, "/api/v1/tools/seedance/configuration", "PUT", {
    expectedSetupId: "default",
    expectedToolRevision: payload.toolRevision,
    configuration: payload.configuration
  });
  assert.equal(response.status, 200);
  response = await jsonRequest(instance, "/api/v1/tools/seedance/compile", "POST", {
    configuration: payload.configuration
  });
  compiled = await response.json();
  assert.equal(compiled.outputs[0].prompt, "Personal moving final $& <kept>");

  response = await jsonRequest(instance, "/api/v1/reset", "POST", {
    expectedSetupId: "default",
    expectedRevision: 0,
    expectedToolRevision: 1,
    scope: "all"
  });
  assert.equal(response.status, 200);
  response = await fetch(new URL("/api/v1/tools/seedance/configuration?setupId=default", instance.url));
  payload = await response.json();
  assert.equal(payload.configuration.mode, "stills");
  assert.equal(payload.configuration.duration, 14);
  assert.equal(payload.configuration.references[0].imageId, "image-stable-3");
  assert.equal(Object.values(payload.configuration.finals)[0], "Personal moving final $& <kept>");
});

test("A12 Cinema Helper persists its ordered deck and compiles a lossless fallback", async (t) => {
  const instance = await fixture(t);
  let response = await fetch(new URL("/api/v1/tool-catalog", instance.url));
  let catalog = await response.json();
  assert.equal(catalog.cinemaHelper.sourceEntryCount, 2848);
  assert.equal(catalog.cinemaHelper.items.length, 2832);

  response = await fetch(new URL("/api/v1/tools/cinema-helper/configuration?setupId=default", instance.url));
  let payload = await response.json();
  const selected = [
    CINEMA_HELPER_CATALOG.items.find(({ label }) => label === "35mm"),
    CINEMA_HELPER_CATALOG.items.find(({ label }) => label === "Adrian Ghenie")
  ];
  payload.configuration.deck = selected.map(({ id: itemId, label: item, category, copyText }) => ({ itemId, item, category, copyText }));
  payload.configuration.favorites = [payload.configuration.deck[1]];
  response = await jsonRequest(instance, "/api/v1/tools/cinema-helper/configuration", "PUT", {
    expectedSetupId: "default",
    expectedToolRevision: payload.toolRevision,
    configuration: payload.configuration
  });
  assert.equal(response.status, 200);

  response = await jsonRequest(instance, "/api/v1/tools/cinema-helper/compile", "POST", { configuration: payload.configuration });
  const compiled = await response.json();
  assert.equal(compiled.fallbackUsed, true);
  assert.equal(compiled.prompt, "35mm camera, in the style of Adrian Ghenie");
  assert.match(compiled.negativePrompt, /MULTIPLE LIMBS/);

  response = await fetch(new URL("/api/v1/tools/cinema-helper/configuration?setupId=default", instance.url));
  payload = await response.json();
  assert.deepEqual(payload.configuration.deck.map(({ item }) => item), ["35mm", "Adrian Ghenie"]);
  assert.equal(payload.configuration.favorites[0].copyText, "in the style of Adrian Ghenie");
});

test("A13 Image Slicer persists local export settings without a generation route", async (t) => {
  const instance = await fixture(t);
  let response = await fetch(new URL("/api/v1/tools/image-slicer/configuration?setupId=default", instance.url));
  let payload = await response.json();
  assert.deepEqual(payload.configuration, {
    columns: 3, rows: 3, format: "png", prefix: "slice", quality: 0.92
  });
  payload.configuration = {
    columns: 5, rows: 2, format: "jpeg", prefix: "board", quality: 0.81
  };
  response = await jsonRequest(instance, "/api/v1/tools/image-slicer/configuration", "PUT", {
    expectedSetupId: "default",
    expectedToolRevision: payload.toolRevision,
    configuration: payload.configuration
  });
  assert.equal(response.status, 200);
  response = await fetch(new URL("/api/v1/tools/image-slicer/configuration?setupId=default", instance.url));
  payload = await response.json();
  assert.deepEqual(payload.configuration, {
    columns: 5, rows: 2, format: "jpeg", prefix: "board", quality: 0.81
  });
  response = await jsonRequest(instance, "/api/v1/tools/image-slicer/compile", "POST", {
    configuration: payload.configuration
  });
  assert.equal(response.status, 404);
  const slicer = await (await fetch(new URL("/image-slicer.js", instance.url))).text();
  assert.match(slicer, /Image Slicer Pro/);
  assert.match(slicer, /Slice Zone/);
  assert.match(slicer, /Lock segment/);
  assert.match(slicer, /Add segments/);
  assert.match(slicer, /Delete segment/);
  assert.match(slicer, /state\.selected\.add\(state\.tree\.id\)/);
  const styles = await (await fetch(new URL("/styles.css", instance.url))).text();
  assert.match(styles, /\.slicer-grid-overlay\.slicer-pro-overlay\s*\{\s*pointer-events:\s*auto/);
});

test("A14 Paint Studio persists local editor settings without a generation route", async (t) => {
  const instance = await fixture(t);
  let response = await fetch(new URL("/api/v1/tools/paint-studio/configuration?setupId=default", instance.url));
  let payload = await response.json();
  assert.equal(payload.configuration.canvasPreset, "16:9");
  assert.equal(payload.configuration.color, "#ff5b3a");
  assert.equal(payload.configuration.strokeWidth, 3);
  const paintRuntime = await (await fetch(new URL("/paint-studio.js", instance.url))).text();
  assert.match(paintRuntime, /className = "paint-text-editor"|element\("textarea", "paint-text-editor"\)/);
  assert.match(paintRuntime, /dashLength/);
  assert.match(paintRuntime, /dashGap/);
  assert.match(paintRuntime, /if \(interaction\.type === "draw"\)/);
  payload.configuration = { ...payload.configuration, canvasPreset: "1:1", background: "white", color: "#3388ff", strokeWidth: 24 };
  response = await jsonRequest(instance, "/api/v1/tools/paint-studio/configuration", "PUT", {
    expectedSetupId: "default", expectedToolRevision: payload.toolRevision, configuration: payload.configuration
  });
  assert.equal(response.status, 200);
  response = await fetch(new URL("/api/v1/tools/paint-studio/configuration?setupId=default", instance.url));
  payload = await response.json();
  assert.equal(payload.configuration.canvasPreset, "1:1");
  assert.equal(payload.configuration.strokeWidth, 24);
  response = await jsonRequest(instance, "/api/v1/tools/paint-studio/compile", "POST", { configuration: payload.configuration });
  assert.equal(response.status, 404);
});

test("A15 Image Grabber persists local capture settings without a generation route", async (t) => {
  const instance = await fixture(t);
  let response = await fetch(new URL("/api/v1/tools/image-grabber/configuration?setupId=default", instance.url));
  let payload = await response.json();
  assert.deepEqual(payload.configuration, {
    fps: 30, exportFormat: "png", exportQuality: 0.92
  });
  payload.configuration = { fps: 25, exportFormat: "webp", exportQuality: 0.8 };
  response = await jsonRequest(instance, "/api/v1/tools/image-grabber/configuration", "PUT", {
    expectedSetupId: "default", expectedToolRevision: payload.toolRevision, configuration: payload.configuration
  });
  assert.equal(response.status, 200);
  response = await fetch(new URL("/api/v1/tools/image-grabber/configuration?setupId=default", instance.url));
  payload = await response.json();
  assert.deepEqual(payload.configuration, {
    fps: 25, exportFormat: "webp", exportQuality: 0.8
  });
  response = await jsonRequest(instance, "/api/v1/tools/image-grabber/compile", "POST", {
    configuration: payload.configuration
  });
  assert.equal(response.status, 404);
});

test("A16 Image Analyser persists its complete legacy routing controls", async (t) => {
  const instance = await fixture(t);
  let response = await fetch(new URL("/api/v1/tools/image-analyzer/configuration?setupId=default", instance.url));
  let payload = await response.json();
  assert.deepEqual(payload.configuration, { model: "gpt-4.1-mini", sendTarget: "apg" });
  payload.configuration = { model: "claude-sonnet-4-6", sendTarget: "cccp" };
  response = await jsonRequest(instance, "/api/v1/tools/image-analyzer/configuration", "PUT", {
    expectedSetupId: "default", expectedToolRevision: payload.toolRevision, configuration: payload.configuration
  });
  assert.equal(response.status, 200);
  response = await fetch(new URL("/api/v1/tools/image-analyzer/configuration?setupId=default", instance.url));
  payload = await response.json();
  assert.deepEqual(payload.configuration, { model: "claude-sonnet-4-6", sendTarget: "cccp" });
  const source = await (await fetch(new URL("/image-analyzer.js", instance.url))).text();
  for (const label of ["Importer une image", "Clear", "Analyser", "Copier", "Send to", "Configurer les clés IA"]) {
    assert.match(source, new RegExp(label));
  }
  for (const destination of ["A.P.G Intent", "CCP · Description de scène", "Video Multi Framing"]) {
    assert.match(source, new RegExp(destination.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("Video Analyser, Motion Emulator and Video Director are independent mini-apps", async (t) => {
  const instance = await fixture(t);
  let response = await fetch(new URL("/api/v1/tools/video-director/configuration?setupId=default", instance.url));
  let payload = await response.json();
  assert.deepEqual(payload.configuration, { model: "gpt-4.1-mini", frameCount: 6, loop: false });
  payload.configuration = { model: "gemini-2.5-flash", frameCount: 8, loop: true };
  response = await jsonRequest(instance, "/api/v1/tools/video-director/configuration", "PUT", {
    expectedSetupId: "default", expectedToolRevision: payload.toolRevision, configuration: payload.configuration
  });
  assert.equal(response.status, 200);
  response = await fetch(new URL("/api/v1/tools/video-director/configuration?setupId=default", instance.url));
  payload = await response.json();
  assert.deepEqual(payload.configuration, { model: "gemini-2.5-flash", frameCount: 8, loop: true });
  const source = await (await fetch(new URL("/video-director.js", instance.url))).text();
  assert.doesNotMatch(source, /Motion Emulator|director-tabs|director-tab/);
  for (const label of ["Importer un média", "Analyser la mise en scène", "Export MP3", "Export Black MP4", "Export MP4", "Clear", "Tout sélectionner", "Télécharger", "Sujet de remplacement", "Décor de remplacement", "Instructions supplémentaires", "Kling 3", "Seedance 2", "MiniMax H3", "FLUX 3", "Wan 3", "Kling Negative Prompt", "Audio Transcript", "Director Breakdown", "Copier", "Envoyer Seedance 2 à BZ"]) {
    assert.match(source, new RegExp(label));
  }
  const editor = await (await fetch(new URL("/video-editor.js", instance.url))).text();
  for (const label of ["mountVideoEditor", "BARZ Video Director", "/api/v1/library-editor/status"]) assert.match(editor, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  const motionModule = await (await fetch(new URL("/motion-emulator.js", instance.url))).text();
  assert.match(motionModule, /mountMotionEmulator/);
  assert.match(motionModule, /motion-emulator\/index\.html/);
  const motion = await (await fetch(new URL("/assets/HTML/motion-emulator/index.html", instance.url))).text();
  assert.match(motion, /\/video-director-theme\.css/);
  for (const label of [
    "Motion Emulator",
    "Drop a video or image here",
    "Clear source",
    "Extraction settings",
    "Output resolution",
    "Process source",
    "Cancel",
    "3D Pose",
    "Seedance prompt",
    "Copy prompt"
  ]) {
    assert.match(motion, new RegExp(label));
  }
  assert.match(motion, /image\/png,image\/jpeg,image\/webp/);
  assert.match(motion, /id="source-image"/);
  const motionMain = await (await fetch(new URL(
    "/assets/HTML/motion-emulator/js/main.js",
    instance.url
  ))).text();
  assert.match(motionMain, /loadSourceFile/);
  assert.match(motionMain, /runImagePipeline/);
  assert.match(motionMain, /PNG/);
  assert.match(motionMain, /Send → Aggregator/);
  assert.match(motionMain, /barz:motion-emulator-reference/);
  const motionPipeline = await (await fetch(new URL(
    "/assets/HTML/motion-emulator/js/pipeline.js",
    instance.url
  ))).text();
  assert.match(motionPipeline, /export async function runImagePipeline/);
  assert.match(motionPipeline, /image\/png/);
  const theme = await (await fetch(new URL("/video-director-theme.css", instance.url))).text();
  assert.match(theme, /--vd-signal:\s*#ff5b3a/);
  assert.match(theme, /body\.video-editor-standalone/);
  assert.match(theme, /body\.me-root[^\n]* \.me-header/);
  assert.match(theme, /background:[^;]+!important;/);
});

test("A18 2D/3D workflow persists its state and serves the complete embedded lab", async (t) => {
  const instance = await fixture(t);
  let response = await fetch(new URL("/api/v1/tools/workflow-3d/configuration?setupId=default", instance.url));
  let payload = await response.json();
  assert.deepEqual(payload.configuration, { selectedOutput: "image", controls: {}, activeActions: [] });
  payload.configuration = {
    selectedOutput: "transfer2d-1",
    controls: { "id:scene-transfer2d-1": "A precise pose transfer" },
    activeActions: ["openWorkspace('transfer-2d', this)"]
  };
  response = await jsonRequest(instance, "/api/v1/tools/workflow-3d/configuration", "PUT", {
    expectedSetupId: "default", expectedToolRevision: payload.toolRevision, configuration: payload.configuration
  });
  assert.equal(response.status, 200);
  response = await fetch(new URL("/api/v1/tools/workflow-3d/configuration?setupId=default", instance.url));
  payload = await response.json();
  assert.deepEqual(payload.configuration.controls, { "id:scene-transfer2d-1": "A precise pose transfer" });
  const wrapper = await (await fetch(new URL("/workflow-3d.js", instance.url))).text();
  assert.match(wrapper, /mountWorkflow3d/);
  const lab = await (await fetch(new URL("/assets/HTML/3D-IA-Workflow.html", instance.url))).text();
  assert.match(lab, /2D Transfer/);
  assert.match(lab, /3D Lab/);
  assert.equal((lab.match(/class="cyc-swatch(?: active)?"/g) ?? []).length, 12);
  response = await jsonRequest(instance, "/api/v1/tools/workflow-3d/compile", "POST", { configuration: payload.configuration });
  assert.equal(response.status, 404);
});

test("Blocking Studio is a standalone Backstage tool with the local Auto-Blocking engine", async (t) => {
  const instance = await fixture(t);
  let response = await fetch(new URL("/api/v1/tools/blocking-studio/configuration?setupId=default", instance.url));
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.deepEqual(payload.configuration, {});

  const wrapper = await (await fetch(new URL("/blocking-studio.js", instance.url))).text();
  assert.match(wrapper, /mountBlockingStudio/);
  assert.match(wrapper, /barzyTheme=atlas-studio/);
  assert.match(wrapper, /Ragdoll Studio/);
  assert.match(wrapper, /barz-suite:import-reference/);
  assert.match(wrapper, /barz-suite:import-reference-blob/);
  assert.match(wrapper, /barz:ragdoll-import-model/);
  assert.match(wrapper, /barz:import-glb/);
  assert.match(wrapper, /3D Library/);
  assert.match(wrapper, /\/api\/v1\/blocking\/import-glb/);
  const studio = await (await fetch(new URL("/assets/HTML/blocking-studio.html", instance.url))).text();
  assert.match(studio, /AI Auto-Blocking/);
  assert.match(studio, /barz:blocking-import-glb/);
  assert.match(studio, /\/api\/solver\/autoblock/);
  assert.match(studio, /data-barzy-default-theme="atlas-studio"/);
  assert.match(studio, /const DECK_MAX_DURATION = 30/);
  assert.match(studio, /id="deckPlay"/);
  assert.match(studio, /id="deckPause"/);
  assert.match(studio, /id="deckSetIn"/);
  assert.match(studio, /id="deckSetOut"/);
  assert.match(studio, /function deckExportSlices\(/);
  assert.match(studio, /--deck-segment-width/);
  assert.match(studio, /class="deck-card-body"/);
  assert.match(studio, /class="deck-duration-tail"/);
  assert.match(studio, /id="presetsTab"/);
  assert.match(studio, /function loadCameraPreset\(id, mode = 'scene'\)/);
  assert.match(studio, /Scale selected keys/);
  assert.match(studio, /class="tl-scale-handle left"/);
  assert.match(studio, /function beginKeyScaleDrag\(/);
  assert.match(studio, /msg\.type === "neutral"/);
  assert.match(studio, /id="scaleLink" class="scale-link is-active"[^>]+aria-pressed="true"/);
  assert.match(studio, /function startNumericTransform\(command\)/);
  assert.match(studio, /command === "s" \? "all" : command === "r" \? "z" : null/);
  assert.match(studio, /const FINE_FACTOR = 0\.18/);
  assert.match(studio, /data-load-mode="camera"/);
  assert.match(studio, /cameraPresetActors\(preset, t\)/);
  assert.match(studio, /function buildSpacePresetStage\(preset, origin, objects\)/);
  assert.match(studio, /Preset primitives/);
  assert.match(studio, /Preset duo · warm \+ cool/);
  assert.match(studio, /function addPresetPrimitiveMannequin\(def\)/);
  assert.match(studio, /function applyAtlasBlockingPlan\(plan\)/);
  assert.match(studio, /prompt-atlas:load-blocking-scene/);
  assert.match(studio, /function smoothScalarAt\(/);
  assert.match(studio, /Smooth selected curve\(s\)/);
  assert.match(studio, /id="curveEditorDialog"/);
  assert.match(studio, /function openCurveEditor\(/);
  assert.match(studio, /type: "marquee"/);
  assert.match(studio, /rgba\(89,227,145,\.12\)/);
  assert.match(studio, /Bezier \(editable handles\)/);
  assert.match(studio, /function cubicBezierScalarAt\(/);
  assert.match(studio, /function writeBezierHandle\(/);
  assert.match(studio, /function duplicateSelectedKeys\(/);
  assert.match(studio, /label: `Duplicate keys \(\$\{count\}\)`/);
  assert.match(studio, /canvas\.addEventListener\("contextmenu"/);
  assert.match(studio, /canvas\.addEventListener\("wheel"/);
  assert.match(studio, /if \(!event\.ctrlKey \|\| !curveEditor\.view\) return/);
  assert.match(studio, /\{ passive: false \}/);
  assert.match(studio, /barz:ragdoll-import-actor/);
  assert.match(studio, /barz:ragdoll-import-model/);
  assert.match(studio, /function importRagdollModel\(payload\)/);
  assert.match(studio, /function applyRagdollPoseToRecord\(record, actor = \{\}\)/);
  assert.match(studio, /id="hsSplit"/);
  assert.match(studio, /--bs-side-width/);
  assert.match(studio, /bs-side-w/);
  assert.match(studio, /actor\.transformSpace === "relative"/);
  assert.match(studio, /record\.joints\[name\]\.position\.add/);
  const ragdoll = await (await fetch(new URL("/assets/HTML/ragdoll-studio.html", instance.url))).text();
  assert.match(ragdoll, /BARZ · Pose tool/);
  assert.match(ragdoll, /Add image to References/);
  assert.match(ragdoll, /Send editable actor to Blocking/);
  assert.match(ragdoll, /barz:ragdoll-reference/);
  assert.match(ragdoll, /barz:ragdoll-reference-blob/);
  assert.match(ragdoll, /id="clearScene"/);
  assert.match(ragdoll, /let advancedModelSource = null/);
  assert.match(ragdoll, /message\.model=\{fileName:advancedModelSource\.fileName\|\|"ragdoll-model\.glb",buffer\}/);
  assert.match(ragdoll, /THREE\.AnimationClip\.toJSON\(clip\)/);
  assert.match(ragdoll, /const selectedJointColor = new THREE\.Color\(0x59e391\)/);
  assert.match(ragdoll, /function clearJointSelection\(\)/);
  assert.match(ragdoll, /picker\.material\.color\.copy\(active \? selectedJointColor : jointColor\)/);
  assert.match(ragdoll, /Studio · Quaternius CC0/);
  assert.match(ragdoll, /new FBXLoader\(\)\.parse/);
  assert.match(ragdoll, /node\.material = material/);
  assert.match(ragdoll, /Load animation \/ pose/);
  assert.match(ragdoll, /Download the complete animation library/);
  assert.match(ragdoll, /superhero-male-flat\.glb/);
  assert.match(ragdoll, /UAL1_Standard\.glb/);
  assert.match(ragdoll, /function loadStudioMode\(/);
  assert.match(ragdoll, /function handleDroppedFile\(/);
  assert.match(ragdoll, /ActionForge-compatible model or animation/);
  assert.match(ragdoll, /id="ikMode"/);
  assert.match(ragdoll, /id="moveMode">Position <kbd>G<\/kbd>/);
  assert.match(ragdoll, /id="rotateMode" class="active">Rotation <kbd>R<\/kbd>/);
  assert.match(ragdoll, /const ikChains =/);
  assert.match(ragdoll, /function solveCcd\(/);
  assert.match(ragdoll, /function applyIkTarget\(/);
  assert.match(ragdoll, /const controlProxy = new THREE\.Object3D/);
  assert.match(ragdoll, /function applyControlProxy\(/);
  assert.match(ragdoll, /activeModel==="advanced"/);
  assert.match(ragdoll, /id="renderStyle"/);
  assert.match(ragdoll, /function setRenderStyle\(/);
  assert.match(ragdoll, /outline\.visible=sketch/);
  assert.match(ragdoll, /transforms:poseData/);
  assert.match(studio, /id="importAnimControls"/);
  assert.match(studio, /object\.animations = gltf\.animations \|\| \[\]/);
  assert.match(studio, /function selectImportedClip\(/);
  assert.match(studio, /record\.mixer\.update\(dt\)/);
  const quaterniusCharacter = await fetch(new URL("/assets/models/quaternius/superhero-male-flat.glb", instance.url));
  assert.equal(quaterniusCharacter.status, 200);
  assert.ok(Number(quaterniusCharacter.headers.get("content-length")) > 700_000);
  const quaterniusAnimations = await fetch(new URL("/assets/models/quaternius/UAL1_Standard.glb", instance.url));
  assert.equal(quaterniusAnimations.status, 200);
  assert.ok(Number(quaterniusAnimations.headers.get("content-length")) > 8_000_000);
  assert.match(studio, /id="groundVisibleToggle"[^>]+checked/);
  assert.match(studio, /floor\.visible = state\.groundVisible !== false/);
  assert.match(studio, /groundVisible: plan\.lighting\?\.groundVisible !== false/);
  assert.match(studio, /orbit\.minDistance = 0\.03/);
  assert.match(studio, /new THREE\.PerspectiveCamera\(50, 1, 0\.005, 300\)/);
  const presetsResponse = await fetch(new URL("/assets/HTML/blocking-camera-presets.js", instance.url));
  assert.equal(presetsResponse.status, 200);
  assert.match(presetsResponse.headers.get("content-type"), /javascript/);
  assert.match(await presetsResponse.text(), /export const CAMERA_PRESETS/);
  const theme = await (await fetch(new URL("/assets/barzy-theme.css", instance.url))).text();
  assert.match(theme, /body\[data-barzy-theme="atlas-studio"\]/);
  assert.match(theme, /--barzy-copper: #ff5b3a/);
});

test("Blocking Studio securely downloads an allowlisted library GLB", async (t) => {
  const glb = Buffer.alloc(12);
  glb.write("glTF", 0, "ascii");
  glb.writeUInt32LE(2, 4);
  glb.writeUInt32LE(12, 8);
  const requested = [];
  const instance = await fixture(t, {
    libraryModelFetcher: async (url, options) => {
      requested.push({ url: String(url), options });
      return new Response(glb, { status: 200, headers: { "Content-Type": "model/gltf-binary", "Content-Length": String(glb.length) } });
    }
  });
  const message = {
    type: "barz:import-glb", schemaVersion: "1.0", source: "barz-ai-lib", requestId: "test-request",
    asset: {
      fileName: "001_Loki_3D.glb",
      modelUrl: "https://barz-ai-lib.placenta.tv/AI-Asset-Lib-online/media/vaisseaux-bank-new/Vaisseaux-sheet/001_Loki/001_Loki_3D.glb"
    }
  };
  let response = await jsonRequest(instance, "/api/v1/blocking/import-glb", "POST", message);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "model/gltf-binary");
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), glb);
  assert.equal(requested.length, 1);
  assert.equal(requested[0].options.redirect, "manual");

  message.asset.modelUrl = "https://example.com/model.glb";
  response = await jsonRequest(instance, "/api/v1/blocking/import-glb", "POST", message);
  assert.equal(response.status, 400);
  assert.equal(requested.length, 1);
});

test("camera preset choreography is deterministic, complete, and separates zoom from camera travel", () => {
  assert.equal(CAMERA_PRESETS.length, 59);
  assert.equal(new Set(CAMERA_PRESETS.map((p) => p.id)).size, 59);
  assert.equal(CAMERA_PRESETS.filter((p) => p.stage === "duo").length, 29);
  assert.equal(CAMERA_PRESETS.filter((p) => p.stage === "space").length, 10);
  assert.equal(CAMERA_PRESETS.filter((p) => p.family === "Western coverage").length, 9);
  for (const preset of CAMERA_PRESETS) {
    const frames = cameraPresetFrames(preset);
    assert.deepEqual(frames, cameraPresetFrames(preset));
    assert.equal(frames[0].t, 0);
    assert.equal(frames.at(-1).t, 1);
    assert.ok(preset.duration >= 5 && preset.duration <= 16);
    frames.forEach((frame, i) => {
      assert.ok([...frame.position, ...frame.target, frame.focal].every(Number.isFinite), preset.id);
      assert.ok(frame.focal >= 24 && frame.focal <= 85);
      if (i) assert.ok(frame.t > frames[i - 1].t);
    });
  }
  const frames = (id) => cameraPresetFrames(CAMERA_PRESETS.find((p) => p.id === id));
  const zoom = frames('zoom-in');
  assert.deepEqual(zoom[0].position, zoom.at(-1).position);
  assert.equal(zoom[0].focal, 24); assert.equal(zoom.at(-1).focal, 85);
  const dolly = frames('dolly-in');
  assert.equal(dolly[0].focal, dolly.at(-1).focal);
  assert.ok(dolly[0].position[2] > dolly.at(-1).position[2]);
  for (const frame of frames('dolly-zoom')) assert.ok(Math.abs(frame.focal / frame.position[2] - 10) < 1e-8);
  const circle = frames('orbit-full');
  assert.ok(Math.abs(circle[0].position[0] - circle.at(-1).position[0]) < 1e-8);
  assert.ok(Math.abs(circle[0].position[2] - circle.at(-1).position[2]) < 1e-8);
  const buildings = cameraPresetBuildings();
  assert.equal(buildings.length, 36);
  assert.deepEqual(buildings, cameraPresetBuildings());
  assert.ok(buildings.every((b) => Math.abs(b.position[0]) - b.scale[0] / 2 > 2), 'Avenue must stay clear for the street camera');
  const movingActors = CAMERA_PRESETS.filter((p) => ['walk', 'cross', 'separate', 'reunion', 'western-standoff', 'western-pass'].includes(p.blocking));
  assert.ok(movingActors.length >= 8);
  movingActors.forEach((preset) => {
    const start = cameraPresetActors(preset, 0), end = cameraPresetActors(preset, 1);
    assert.deepEqual(start, cameraPresetActors(preset, 0));
    assert.notDeepEqual(start.map((a) => a.position), end.map((a) => a.position), `${preset.id} must animate its actors`);
  });
  CAMERA_PRESETS.filter((p) => p.stage === 'space').forEach((preset) => {
    const start = cameraPresetShips(preset, 0), end = cameraPresetShips(preset, 1);
    assert.ok(start.length > 0, `${preset.id} needs ships`);
    assert.equal(start.length, end.length);
    assert.deepEqual(start, cameraPresetShips(preset, 0));
    start.concat(end).forEach((item) => assert.ok([...item.position, ...item.rotation, ...item.scale].every(Number.isFinite)));
    assert.notDeepEqual(start.map((item) => item.position), end.map((item) => item.position), `${preset.id} must animate its ships`);
  });
});

test("Object Scale Chart exports its exact chart and prompt together to Gregator without AI rewriting", async (t) => {
  const instance = await fixture(t);
  let response = await fetch(new URL("/api/v1/tools/object-scale-chart/configuration?setupId=default", instance.url));
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.deepEqual(payload.configuration, { aiModel: "", aiInstruction: "" });

  const wrapper = await (await fetch(new URL("/object-scale-chart-tool.js", instance.url))).text();
  assert.match(wrapper, /mountObjectScaleChart/);
  assert.match(wrapper, /Send to Gregator/);
  assert.match(wrapper, /barz-object-scale:get-bundle/);
  assert.match(wrapper, /onSendToAggregator/);
  assert.doesNotMatch(wrapper, /\/api\/v1\/ai\/refine/);

  response = await fetch(new URL("/object-scale-chart/index.html", instance.url));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-security-policy"), /https:\/\/staticimgly\.com/);
  assert.match(response.headers.get("content-security-policy"), /http:\/\/127\.0\.0\.1:4317/);
  const chart = await response.text();
  for (const asset of ["catalogue.js", "core.js", "cutout.js", "ai-cutout.js", "subject-vectors.js", "app.js", "atlas-theme.css", "atlas-bridge.js"]) {
    assert.match(chart, new RegExp(asset.replace(".", "\\.")));
  }
  assert.match(chart, /id="import-source-menu"/);
  assert.match(chart, /data-import-source="resources" aria-checked="true"/);
  assert.match(chart, /id="asset-picker-dialog"/);
  const vectors = await (await fetch(new URL("/object-scale-chart/subject-vectors.js", instance.url))).text();
  assert.match(vectors, /animal-23/);
  assert.match(vectors, /building-100/);
  assert.match(vectors, /vehicle-86/);
  const bridge = await (await fetch(new URL("/object-scale-chart/atlas-bridge.js", instance.url))).text();
  assert.match(bridge, /BarzObjectScale\.exportBundle/);
  assert.match(bridge, /barz-object-scale:bundle/);
  const appSource = await (await fetch(new URL("/object-scale-chart/app.js", instance.url))).text();
  assert.match(appSource, /exportPngBlob/);
  assert.match(appSource, /exportBundle/);
  assert.match(appSource, /aggregatorOrigin='http:\/\/127\.0\.0\.1:4317'/);
  assert.match(appSource, /function refreshAssetPicker/);
  assert.match(appSource, /fetch\(`\$\{aggregatorOrigin\}\/api\/state`\)/);
  assert.match(appSource, /function focusSelectedSubject/);
  assert.match(appSource, /select\(label\.dataset\.select,\{focusBoard:true\}\)/);
  assert.match(appSource, /e\.stopPropagation\(\);return remove\(\)/);
  assert.match(appSource, /\(e\.key==='Delete'\|\|e\.key==='Backspace'\)\&&!e\.target\.closest\('#board'\)/);
  const embeddedTheme = await (await fetch(new URL("/object-scale-chart/atlas-theme.css", instance.url))).text();
  assert.match(embeddedTheme, /\.ui-language/);
  assert.match(embeddedTheme, /\.update-button/);
  const workspaceSource = await (await fetch(new URL("/tool-workspace.js", instance.url))).text();
  assert.match(workspaceSource, /Use @image1 as the exact scale chart reference/);
  assert.match(workspaceSource, /uploadImageReference\(\{ src: dataUrl/);
  assert.match(workspaceSource, /function imageDataUrlToBlob/);
  assert.match(workspaceSource, /const blob = imageDataUrlToBlob\(image\.src\)/);
  assert.doesNotMatch(workspaceSource, /fetch\(image\.src\)/);
});

test("YouTube Extractor is a Backstage sidecar with the original trim and export endpoints", async (t) => {
  const instance = await fixture(t);
  const response = await fetch(new URL("/api/v1/tools/youtube-extractor/configuration?setupId=default", instance.url));
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).configuration, {});
  const wrapper = await (await fetch(new URL("/youtube-extractor.js", instance.url))).text();
  assert.match(wrapper, /mountYoutubeExtractor/);
  assert.match(wrapper, /\/api\/v1\/youtube-extractor\/status/);
  assert.match(wrapper, /barz:preferences/);
  const source = await readFile(new URL("../apps/atlas/youtube-extractor/server.py", import.meta.url), "utf8");
  for (const endpoint of ["/api/info", "/api/frame", "/api/browse", "/api/extract", "/api/cancel", "/api/reveal", "/api/play"]) {
    assert.match(source, new RegExp(endpoint.replace("/", "\\/")));
  }
  assert.match(source, /BARZ_YT_EXTRACTOR_DATA_DIR/);
});

test("global defaults reset restores tool controls while preserving personal presets", async (t) => {
  const instance = await fixture(t);
  let response = await fetch(new URL("/api/v1/tools/imperfection/configuration?setupId=default", instance.url));
  let payload = await response.json();
  payload.configuration.state.camera.handDrift = 5;
  payload.configuration.customPresets.push({
    id: "preset-safe-name",
    name: "L'atelier <test>",
    state: { camera: { handDrift: 4 } }
  });
  response = await jsonRequest(instance, "/api/v1/tools/imperfection/configuration", "PUT", {
    expectedSetupId: "default",
    expectedToolRevision: 0,
    configuration: payload.configuration
  });
  assert.equal(response.status, 200);

  response = await jsonRequest(instance, "/api/v1/reset", "POST", {
    expectedSetupId: "default",
    expectedRevision: 0,
    expectedToolRevision: 1,
    scope: "all"
  });
  payload = await response.json();
  assert.deepEqual(payload.resetToolIds, [
    "apg", "barz-enhancer", "angle-3d", "relighting-3d", "imperfection", "banana-helper", "barz-beauty", "realism-forge",
    "cinematic-shoot", "facs-sheet-generator", "barzy-board", "veo-suite", "cccp",
    "barzy-sheet", "barz-designer", "knolling", "multishot", "seedance", "cinema-helper",
    "image-slicer", "paint-studio", "image-grabber", "image-analyzer", "video-director", "motion-emulator", "video-editor", "blocking-studio", "object-scale-chart", "youtube-extractor", "workflow-3d", "acting-gen"
  ]);

  response = await fetch(new URL("/api/v1/tools/imperfection/configuration?setupId=default", instance.url));
  payload = await response.json();
  assert.equal(payload.configuration.state.camera.handDrift, 2.5);
  assert.equal(payload.configuration.customPresets[0].name, "L'atelier <test>");
});

test("A19 exposes A.P.G and the shared AI routes without leaking API keys", async (t) => {
  const instance = await fixture(t);
  let response = await fetch(new URL("/api/v1/tools/apg/configuration?setupId=default", instance.url));
  assert.equal(response.status, 200);
  let payload = await response.json();
  assert.equal(payload.configuration.outputType, "image");
  assert.equal(payload.configuration.complexity, 6);

  response = await fetch(new URL("/api/v1/ai/status", instance.url));
  assert.equal(response.status, 200);
  payload = await response.json();
  assert.ok(Array.isArray(payload.models));
  assert.ok(payload.models.some(({ id }) => id === "claude-opus-5-5"));
  assert.ok(payload.models.some(({ id }) => id === "claude-sonnet-5-5"));
  assert.equal(Object.hasOwn(payload, "openaiApiKey"), false);
  assert.deepEqual(Object.keys(payload.keyStates).sort(), ["anthropic", "deepseek", "google", "openai"]);

  response = await jsonRequest(instance, "/api/ai/refine", "POST", {
    prompt: "",
    outputType: "image",
    transform: "Make it more cinematic"
  });
  assert.equal(response.status, 400);

  response = await jsonRequest(instance, "/api/v1/image-analyzer/settings", "PUT", {
    model: "gpt-4.1-mini",
    openaiApiKey: "shared-test-secret"
  });
  assert.equal(response.status, 200);
  response = await fetch(new URL("/api/v1/ai/status", instance.url));
  payload = await response.json();
  assert.equal(payload.available, true);
  assert.equal(payload.model, "gpt-5.6-terra");
  assert.equal(payload.keyStates.openai, true);
  assert.equal(JSON.stringify(payload).includes("shared-test-secret"), false);

  const apgData = await (await fetch(new URL("/apg-data.js", instance.url))).text();
  const apgStudio = await (await fetch(new URL("/apg-studio.js", instance.url))).text();
  assert.match(apgData, /export const MODES/);
  assert.match(apgStudio, /Absurd Prompt Generator|mountApgStudio/);
});

test("mini-apps can be added to and removed from the fixed Deck", async (t) => {
  const instance = await fixture(t);
  let response = await jsonRequest(instance, "/api/v1/placements", "POST", {
    expectedSetupId: "default",
    expectedRevision: 0,
    placement: { id: "deck-apg-test", toolId: "apg", targetId: "deck", order: 0 }
  });
  assert.equal(response.status, 201);
  let payload = await response.json();
  assert.ok(payload.registry.placements.some(({ id, toolId, targetId }) => id === "deck-apg-test" && toolId === "apg" && targetId === "deck"));

  response = await jsonRequest(instance, "/api/v1/placements/deck-apg-test", "DELETE", {
    expectedSetupId: "default",
    expectedRevision: payload.registry.revision
  });
  assert.equal(response.status, 200);
  payload = await response.json();
  assert.equal(payload.registry.placements.some(({ id }) => id === "deck-apg-test"), false);
});

test("a complete reset checkpoint restores Goodies details as well as the registry", async (t) => {
  const instance = await fixture(t);
  let response = await fetch(new URL("/api/v1/tools/banana-helper/configuration?setupId=default", instance.url));
  let payload = await response.json();
  const selectedEntryId = payload.configuration.selectedEntryId;
  payload.configuration.detailsByPrompt[selectedEntryId] = "Ma direction personnelle très précise";
  response = await jsonRequest(instance, "/api/v1/tools/banana-helper/configuration", "PUT", {
    expectedSetupId: "default",
    expectedToolRevision: payload.toolRevision,
    configuration: payload.configuration
  });
  assert.equal(response.status, 200);

  response = await jsonRequest(instance, "/api/v1/reset", "POST", {
    expectedSetupId: "default",
    expectedRevision: 0,
    expectedToolRevision: 1,
    scope: "all"
  });
  payload = await response.json();
  assert.equal(payload.backupScope, "complete-setup");
  assert.equal(payload.toolStateRevision, 2);
  const backupName = payload.backupName;

  response = await fetch(new URL("/api/v1/tools/banana-helper/configuration?setupId=default", instance.url));
  payload = await response.json();
  assert.equal(payload.configuration.detailsByPrompt[selectedEntryId], undefined);
  response = await fetch(new URL("/api/v1/backups?setupId=default", instance.url));
  const backups = (await response.json()).backups;
  assert.ok(backups.some((backup) => backup.name === backupName && backup.scope === "complete-setup"));

  response = await jsonRequest(instance, "/api/v1/backups/restore", "POST", {
    expectedSetupId: "default",
    expectedRevision: 1,
    expectedToolRevision: 2,
    backupName
  });
  assert.equal(response.status, 200);
  payload = await response.json();
  assert.equal(payload.backupScope, "complete-setup");
  assert.equal(payload.toolStateRevision, 3);

  response = await fetch(new URL("/api/v1/tools/banana-helper/configuration?setupId=default", instance.url));
  payload = await response.json();
  assert.equal(payload.configuration.detailsByPrompt[selectedEntryId], "Ma direction personnelle très précise");
});

test("serves and compiles built-in and personal libraries through the generic API", async (t) => {
  const instance = await fixture(t);
  let response = await fetch(new URL("/api/v1/libraries/banana-helper?setupId=default", instance.url));
  let payload = await response.json();
  assert.equal(payload.library.entries.length, 77);
  const entryId = payload.library.entries[0].id;
  response = await jsonRequest(instance, "/api/v1/libraries/banana-helper/compile", "POST", {
    expectedSetupId: "default",
    expectedRevision: payload.registryRevision,
    entryId,
    scene: "un automate rouge"
  });
  payload = await response.json();
  assert.equal(payload.setupId, "default");
  assert.match(payload.outputs[0].prompt, /un automate rouge/);

  const library = {
    id: "my-library",
    title: "Ma bibliothèque",
    categories: [{ id: "main", title: "Principal", order: 0 }],
    entries: [{
      id: "my-entry",
      categoryId: "main",
      order: 0,
      description: "Test API générique",
      recipe: {
        schemaVersion: "1.0",
        id: "my-entry-v1",
        revision: 1,
        title: "Mon rendu",
        fields: [{ id: "scene", label: "Scène", type: "text", maxLength: 4_000, default: "" }],
        outputs: [{ id: "main", mediaType: "video", template: "Plan vivant de {{scene}}", negativePrompt: "", settings: {} }],
        referenceSlots: []
      }
    }]
  };
  response = await jsonRequest(instance, "/api/v1/libraries", "POST", {
    expectedSetupId: "default",
    expectedRevision: 0,
    library,
    tool: { id: library.id, title: library.title, kind: "builtin", adapterId: "prompt-library" },
    placement: { id: "my-library-in-motion", toolId: library.id, targetId: "video-builder", order: 1 }
  });
  assert.equal(response.status, 201);
  payload = await response.json();
  assert.ok(payload.registry.libraries.some(({ id }) => id === library.id));

  response = await jsonRequest(instance, "/api/v1/libraries/my-library/compile", "POST", {
    expectedSetupId: "default",
    expectedRevision: 1,
    entryId: "my-entry",
    scene: "la ville sous la pluie"
  });
  payload = await response.json();
  assert.equal(payload.outputs[0].mediaType, "video");
  assert.equal(payload.outputs[0].prompt, "Plan vivant de la ville sous la pluie");

  response = await fetch(new URL("/api/v1/tools/my-library/configuration?setupId=default", instance.url));
  payload = await response.json();
  assert.equal(payload.registryRevision, 1);
  assert.equal(payload.configuration.selectedEntryId, "my-entry");
  response = await jsonRequest(instance, "/api/v1/tools/my-library/configuration", "PUT", {
    expectedSetupId: "default",
    expectedToolRevision: payload.toolRevision,
    expectedRegistryRevision: payload.registryRevision,
    configuration: { ...payload.configuration, detailsByPrompt: { "my-entry": "persisté" } }
  });
  assert.equal(response.status, 200);
  response = await fetch(new URL("/api/v1/tools/my-library/configuration?setupId=default", instance.url));
  assert.equal((await response.json()).configuration.detailsByPrompt["my-entry"], "persisté");
});
