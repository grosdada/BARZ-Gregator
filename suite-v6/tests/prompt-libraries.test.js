import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { compilePromptLibrary } from "../packages/prompt-libraries/src/index.js";
import { freshDefaults } from "../packages/registry/src/defaults.js";
import { RegistryStore } from "../packages/registry/src/index.js";

async function fixture(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "barz-v6-libraries-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const store = new RegistryStore({ directory });
  return { directory, store };
}

function personalEntry(id = "first-entry", recipeId = "first-entry-v1") {
  return {
    id,
    categoryId: "main",
    order: 0,
    description: "Une direction personnelle.",
    recipe: {
      schemaVersion: "1.0",
      id: recipeId,
      revision: 1,
      title: "Premier prompt",
      fields: [{ id: "scene", label: "Scène", type: "text", maxLength: 4_000, default: "" }],
      outputs: [{ id: "main", mediaType: "image", template: "Portrait pratique de {{scene}}", negativePrompt: "", settings: {} }],
      referenceSlots: []
    }
  };
}

test("migrates a 1.0 overlay to 1.1 with a disk backup and no lost customization", async (t) => {
  const { directory, store } = await fixture(t);
  const legacy = {
    schemaVersion: "1.0",
    defaultsVersion: "6.0.0-foundation.1",
    revision: 7,
    overlay: {
      workshopOverrides: { "prompt-forge": { title: "Mes idées historiques" } },
      toolOverrides: {},
      placementOverrides: {},
      removedDefaultPlacementIds: [],
      customWorkshops: [],
      customTools: [],
      customPlacements: [],
      customRecipes: []
    }
  };
  await writeFile(path.join(directory, "registry.overlay.json"), `${JSON.stringify(legacy)}\n`, "utf8");

  const registry = await store.init();
  assert.equal(registry.schemaVersion, "1.1");
  assert.equal(registry.revision, 7);
  assert.equal(registry.workshops.find(({ id }) => id === "prompt-forge").title, "Mes idées historiques");
  assert.equal(registry.libraries.find(({ id }) => id === "banana-helper").entries.length, 77);
  const persisted = JSON.parse(await readFile(path.join(directory, "registry.overlay.json"), "utf8"));
  assert.deepEqual(persisted.overlay.customLibraries, []);
  assert.deepEqual(persisted.overlay.libraryOverlays, {});
  assert.ok((await readdir(path.join(directory, "registry-backups"))).some((name) => name.includes("schema-1-1-migration")));
});

test("adopts A5 defaults without losing a libraries-era overlay", async (t) => {
  const { directory, store } = await fixture(t);
  const previous = {
    schemaVersion: "1.1",
    defaultsVersion: "6.0.0-libraries.1",
    revision: 3,
    overlay: {
      workshopOverrides: { "image-looks": { title: "Mes looks" } },
      toolOverrides: {}, placementOverrides: {}, removedDefaultPlacementIds: [],
      customWorkshops: [], customTools: [], customPlacements: [], customRecipes: [],
      customLibraries: [], libraryOverlays: {}
    }
  };
  await writeFile(path.join(directory, "registry.overlay.json"), `${JSON.stringify(previous)}\n`, "utf8");
  const registry = await store.init();
  assert.equal(registry.defaultsVersion, "6.0.0-a23.0");
  assert.equal(registry.workshops.find(({ id }) => id === "image-looks").title, "Mes looks");
  assert.ok(registry.tools.some(({ id }) => id === "barz-beauty"));
  assert.ok(registry.tools.some(({ id }) => id === "realism-forge"));
  assert.ok(registry.tools.some(({ id }) => id === "cinematic-shoot"));
  assert.ok((await readdir(path.join(directory, "registry-backups"))).length > 0);
});

test("adopts A5 defaults without losing an A1-era overlay", async (t) => {
  const { directory, store } = await fixture(t);
  const previous = {
    schemaVersion: "1.1",
    defaultsVersion: "6.0.0-a1.1",
    revision: 5,
    overlay: {
      workshopOverrides: { "grid-generation": { title: "Mes storyboards" } },
      toolOverrides: {}, placementOverrides: {}, removedDefaultPlacementIds: [],
      customWorkshops: [], customTools: [], customPlacements: [], customRecipes: [],
      customLibraries: [], libraryOverlays: {}
    }
  };
  await writeFile(path.join(directory, "registry.overlay.json"), `${JSON.stringify(previous)}\n`, "utf8");
  const registry = await store.init();
  assert.equal(registry.defaultsVersion, "6.0.0-a23.0");
  assert.equal(registry.workshops.find(({ id }) => id === "grid-generation").title, "Mes storyboards");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "cinematic-shoot").targetId, "grid-generation");
  assert.ok((await readdir(path.join(directory, "registry-backups"))).length > 0);
});

test("adopts A5 defaults without losing an A2-era setup", async (t) => {
  const { directory, store } = await fixture(t);
  const previous = {
    schemaVersion: "1.1", defaultsVersion: "6.0.0-a2.1", revision: 9,
    overlay: {
      workshopOverrides: { "video-builder": { title: "Ma régie mouvement" } },
      toolOverrides: {}, placementOverrides: {}, removedDefaultPlacementIds: [],
      customWorkshops: [], customTools: [], customPlacements: [], customRecipes: [],
      customLibraries: [], libraryOverlays: { "banana-helper": { categoryOverrides: {}, customCategories: [], entryOverrides: {}, customEntries: [], hiddenEntryIds: [] } }
    }
  };
  await writeFile(path.join(directory, "registry.overlay.json"), `${JSON.stringify(previous)}\n`, "utf8");
  const registry = await store.init();
  assert.equal(registry.defaultsVersion, "6.0.0-a23.0");
  assert.equal(registry.revision, 9);
  assert.equal(registry.workshops.find(({ id }) => id === "video-builder").title, "Ma régie mouvement");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "acting-gen").targetId, "video-builder");
  assert.ok(registry.libraries.some(({ id }) => id === "acting-gen"));
  assert.ok((await readdir(path.join(directory, "registry-backups"))).length > 0);
});

test("adopts A5 defaults from the live A4 milestone and keeps its overrides", async (t) => {
  const { directory, store } = await fixture(t);
  const previous = {
    schemaVersion: "1.1", defaultsVersion: "6.0.0-a4.1", revision: 12,
    overlay: {
      workshopOverrides: { "camera-control": { title: "Ma caméra" } },
      toolOverrides: {}, placementOverrides: {}, removedDefaultPlacementIds: [],
      customWorkshops: [], customTools: [], customPlacements: [], customRecipes: [],
      customLibraries: [], libraryOverlays: {}
    }
  };
  await writeFile(path.join(directory, "registry.overlay.json"), `${JSON.stringify(previous)}\n`, "utf8");
  const registry = await store.init();
  assert.equal(registry.defaultsVersion, "6.0.0-a23.0");
  assert.equal(registry.revision, 12);
  assert.equal(registry.workshops.some(({ id }) => id === "camera-control"), false);
  assert.equal(registry.tools.find(({ id }) => id === "veo-suite").title, "Camera Control");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "veo-suite").targetId, "video-builder");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "veo-suite").order, 0);
  assert.ok((await readdir(path.join(directory, "registry-backups"))).length > 0);
});

test("adopts A6 defaults from the live A5 milestone without losing setup overrides", async (t) => {
  const { directory, store } = await fixture(t);
  const previous = {
    schemaVersion: "1.1", defaultsVersion: "6.0.0-a5.1", revision: 17,
    overlay: {
      workshopOverrides: { "grid-generation": { title: "Mes séquences" } },
      toolOverrides: {}, placementOverrides: {}, removedDefaultPlacementIds: [],
      customWorkshops: [], customTools: [], customPlacements: [], customRecipes: [],
      customLibraries: [], libraryOverlays: {}
    }
  };
  await writeFile(path.join(directory, "registry.overlay.json"), `${JSON.stringify(previous)}\n`, "utf8");
  const registry = await store.init();
  assert.equal(registry.defaultsVersion, "6.0.0-a23.0");
  assert.equal(registry.revision, 17);
  assert.equal(registry.workshops.find(({ id }) => id === "grid-generation").title, "Mes séquences");
  assert.equal(registry.tools.find(({ id }) => id === "cccp").title, "CCP");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "cccp").targetId, "grid-generation");
  assert.ok((await readdir(path.join(directory, "registry-backups"))).length > 0);
});

test("adopts A7 defaults from the live A6 milestone and installs BZ Sheet", async (t) => {
  const { directory, store } = await fixture(t);
  const previous = {
    schemaVersion: "1.1", defaultsVersion: "6.0.0-a6.1", revision: 21,
    overlay: {
      workshopOverrides: { "character-lab": { title: "Mon labo personnage" } },
      toolOverrides: {}, placementOverrides: {}, removedDefaultPlacementIds: [],
      customWorkshops: [], customTools: [], customPlacements: [], customRecipes: [],
      customLibraries: [], libraryOverlays: {}
    }
  };
  await writeFile(path.join(directory, "registry.overlay.json"), `${JSON.stringify(previous)}\n`, "utf8");
  const registry = await store.init();
  assert.equal(registry.defaultsVersion, "6.0.0-a23.0");
  assert.equal(registry.revision, 21);
  assert.equal(registry.workshops.find(({ id }) => id === "character-lab").title, "Mon labo personnage");
  assert.equal(registry.tools.find(({ id }) => id === "barzy-sheet").title, "BZ Sheet");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "barzy-sheet").targetId, "character-lab");
  assert.ok((await readdir(path.join(directory, "registry-backups"))).length > 0);
});

test("adopts A8 defaults from the live A7 milestone and installs BZ Designer", async (t) => {
  const { directory, store } = await fixture(t);
  const previous = {
    schemaVersion: "1.1", defaultsVersion: "6.0.0-a7.1", revision: 24,
    overlay: {
      workshopOverrides: { "character-lab": { title: "Mon atelier de personnages" } },
      toolOverrides: { "barzy-sheet": { title: "Mes planches" } }, placementOverrides: {}, removedDefaultPlacementIds: [],
      customWorkshops: [], customTools: [], customPlacements: [], customRecipes: [],
      customLibraries: [], libraryOverlays: {}
    }
  };
  await writeFile(path.join(directory, "registry.overlay.json"), `${JSON.stringify(previous)}\n`, "utf8");
  const registry = await store.init();
  assert.equal(registry.defaultsVersion, "6.0.0-a23.0");
  assert.equal(registry.revision, 24);
  assert.equal(registry.workshops.find(({ id }) => id === "character-lab").title, "Mon atelier de personnages");
  assert.equal(registry.tools.find(({ id }) => id === "barzy-sheet").title, "Mes planches");
  assert.equal(registry.tools.find(({ id }) => id === "barz-designer").title, "BZ Designer");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "barz-designer").targetId, "character-lab");
  assert.ok((await readdir(path.join(directory, "registry-backups"))).length > 0);
});

test("adopts A9 defaults from the live A8 milestone and installs Knolling", async (t) => {
  const { directory, store } = await fixture(t);
  const previous = {
    schemaVersion: "1.1", defaultsVersion: "6.0.0-a8.1", revision: 27,
    overlay: {
      workshopOverrides: { "character-lab": { title: "Mon laboratoire" } },
      toolOverrides: { "barz-designer": { title: "Mon Designer" } },
      placementOverrides: {}, removedDefaultPlacementIds: [],
      customWorkshops: [], customTools: [], customPlacements: [], customRecipes: [],
      customLibraries: [], libraryOverlays: {}
    }
  };
  await writeFile(path.join(directory, "registry.overlay.json"), `${JSON.stringify(previous)}\n`, "utf8");
  const registry = await store.init();
  assert.equal(registry.defaultsVersion, "6.0.0-a23.0");
  assert.equal(registry.revision, 27);
  assert.equal(registry.workshops.find(({ id }) => id === "character-lab").title, "Mon laboratoire");
  assert.equal(registry.tools.find(({ id }) => id === "barz-designer").title, "Mon Designer");
  assert.equal(registry.tools.find(({ id }) => id === "knolling").title, "Knolling Board");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "knolling").targetId, "character-lab");
  assert.ok((await readdir(path.join(directory, "registry-backups"))).length > 0);
});

test("adopts A10 defaults from A9 and installs Multishot without losing overrides", async (t) => {
  const { directory, store } = await fixture(t);
  const previous = {
    schemaVersion: "1.1", defaultsVersion: "6.0.0-a9.1", revision: 31,
    overlay: {
      workshopOverrides: { "grid-generation": { title: "Mon atelier séquences" } },
      toolOverrides: { knolling: { title: "Mon Knolling" } },
      placementOverrides: {}, removedDefaultPlacementIds: [],
      customWorkshops: [], customTools: [], customPlacements: [], customRecipes: [],
      customLibraries: [], libraryOverlays: {}
    }
  };
  await writeFile(path.join(directory, "registry.overlay.json"), `${JSON.stringify(previous)}\n`, "utf8");
  const registry = await store.init();
  assert.equal(registry.defaultsVersion, "6.0.0-a23.0");
  assert.equal(registry.revision, 31);
  assert.equal(registry.workshops.find(({ id }) => id === "grid-generation").title,
    "Mon atelier séquences");
  assert.equal(registry.tools.find(({ id }) => id === "knolling").title, "Mon Knolling");
  assert.equal(registry.tools.find(({ id }) => id === "multishot").title, "BZ Multishot");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "multishot").targetId,
    "grid-generation");
  assert.ok((await readdir(path.join(directory, "registry-backups"))).length > 0);
});

test("adopts A11 defaults from A10 and installs Video Multi Framing without losing overrides", async (t) => {
  const { directory, store } = await fixture(t);
  const previous = {
    schemaVersion: "1.1", defaultsVersion: "6.0.0-a10.1", revision: 35,
    overlay: {
      workshopOverrides: { "video-builder": { title: "Ma régie vidéo" } },
      toolOverrides: { multishot: { title: "Mon Multishot" } },
      placementOverrides: {}, removedDefaultPlacementIds: [],
      customWorkshops: [], customTools: [], customPlacements: [], customRecipes: [],
      customLibraries: [], libraryOverlays: {}
    }
  };
  await writeFile(path.join(directory, "registry.overlay.json"), `${JSON.stringify(previous)}\n`, "utf8");
  const registry = await store.init();
  assert.equal(registry.defaultsVersion, "6.0.0-a23.0");
  assert.equal(registry.revision, 35);
  assert.equal(registry.workshops.find(({ id }) => id === "video-builder").title, "Ma régie vidéo");
  assert.equal(registry.tools.find(({ id }) => id === "multishot").title, "Mon Multishot");
  assert.equal(registry.tools.find(({ id }) => id === "seedance").title, "Video Multi Framing");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "seedance").targetId, "video-builder");
  assert.ok((await readdir(path.join(directory, "registry-backups"))).length > 0);
});

test("adopts A12 defaults from A11 and installs Cinema Helper without losing overrides", async (t) => {
  const { directory, store } = await fixture(t);
  const previous = {
    schemaVersion: "1.1", defaultsVersion: "6.0.0-a11.1", revision: 39,
    overlay: {
      workshopOverrides: { "prompt-forge": { title: "Mon atelier idées" } },
      toolOverrides: { seedance: { title: "Ma régie multishot" } },
      placementOverrides: {}, removedDefaultPlacementIds: [],
      customWorkshops: [], customTools: [], customPlacements: [], customRecipes: [],
      customLibraries: [], libraryOverlays: {}
    }
  };
  await writeFile(path.join(directory, "registry.overlay.json"), `${JSON.stringify(previous)}\n`, "utf8");
  const registry = await store.init();
  assert.equal(registry.defaultsVersion, "6.0.0-a23.0");
  assert.equal(registry.revision, 39);
  assert.equal(registry.workshops.find(({ id }) => id === "prompt-forge").title, "Mon atelier idées");
  assert.equal(registry.tools.find(({ id }) => id === "seedance").title, "Ma régie multishot");
  assert.equal(registry.tools.find(({ id }) => id === "cinema-helper").title, "Cinema Helper");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "cinema-helper").targetId, "prompt-forge");
  assert.ok((await readdir(path.join(directory, "registry-backups"))).length > 0);
});

test("adopts A13 defaults from A12 and installs Image Slicer in fixed Backstage", async (t) => {
  const { directory, store } = await fixture(t);
  const previous = {
    schemaVersion: "1.1", defaultsVersion: "6.0.0-a12.1", revision: 42,
    overlay: {
      workshopOverrides: { "prompt-forge": { title: "Idées conservées" } },
      toolOverrides: { "cinema-helper": { title: "Mon Cinema Helper" } },
      placementOverrides: {}, removedDefaultPlacementIds: [],
      customWorkshops: [], customTools: [], customPlacements: [], customRecipes: [],
      customLibraries: [], libraryOverlays: {}
    }
  };
  await writeFile(path.join(directory, "registry.overlay.json"), `${JSON.stringify(previous)}\n`, "utf8");
  const registry = await store.init();
  assert.equal(registry.defaultsVersion, "6.0.0-a23.0");
  assert.equal(registry.revision, 42);
  assert.equal(registry.workshops.find(({ id }) => id === "prompt-forge").title, "Idées conservées");
  assert.equal(registry.tools.find(({ id }) => id === "cinema-helper").title, "Mon Cinema Helper");
  assert.equal(registry.tools.find(({ id }) => id === "image-slicer").title, "Image Slicer");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "image-slicer").targetId, "utilities");
  assert.ok((await readdir(path.join(directory, "registry-backups"))).length > 0);
});

test("adopts A14 defaults from A13 and installs Paint Studio in fixed Backstage", async (t) => {
  const { directory, store } = await fixture(t);
  const previous = {
    schemaVersion: "1.1", defaultsVersion: "6.0.0-a13.1", revision: 47,
    overlay: {
      workshopOverrides: { "prompt-forge": { title: "Idées intactes" } },
      toolOverrides: { "image-slicer": { title: "Mon Slicer" } },
      placementOverrides: {}, removedDefaultPlacementIds: [],
      customWorkshops: [], customTools: [], customPlacements: [], customRecipes: [],
      customLibraries: [], libraryOverlays: {}
    }
  };
  await writeFile(path.join(directory, "registry.overlay.json"), `${JSON.stringify(previous)}\n`, "utf8");
  const registry = await store.init();
  assert.equal(registry.defaultsVersion, "6.0.0-a23.0");
  assert.equal(registry.revision, 47);
  assert.equal(registry.workshops.find(({ id }) => id === "prompt-forge").title, "Idées intactes");
  assert.equal(registry.tools.find(({ id }) => id === "image-slicer").title, "Mon Slicer");
  assert.equal(registry.tools.find(({ id }) => id === "paint-studio").title, "Paint Studio");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "paint-studio").targetId, "utilities");
  assert.ok((await readdir(path.join(directory, "registry-backups"))).length > 0);
});

test("adopts A15 defaults from A14 and installs Image Grabber without losing overrides", async (t) => {
  const { directory, store } = await fixture(t);
  const previous = {
    schemaVersion: "1.1", defaultsVersion: "6.0.0-a14.1", revision: 52,
    overlay: {
      workshopOverrides: { "prompt-forge": { title: "Idées préservées" } },
      toolOverrides: { "paint-studio": { title: "Mon Paint" } },
      placementOverrides: {}, removedDefaultPlacementIds: [],
      customWorkshops: [], customTools: [], customPlacements: [], customRecipes: [],
      customLibraries: [], libraryOverlays: {}
    }
  };
  await writeFile(path.join(directory, "registry.overlay.json"), `${JSON.stringify(previous)}\n`, "utf8");
  const registry = await store.init();
  assert.equal(registry.defaultsVersion, "6.0.0-a23.0");
  assert.equal(registry.revision, 52);
  assert.equal(registry.workshops.find(({ id }) => id === "prompt-forge").title, "Idées préservées");
  assert.equal(registry.tools.find(({ id }) => id === "paint-studio").title, "Mon Paint");
  assert.equal(registry.tools.find(({ id }) => id === "image-grabber").title, "Image Grabber");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "image-grabber").targetId, "utilities");
  assert.ok((await readdir(path.join(directory, "registry-backups"))).length > 0);
});

test("adopts A16 defaults from A15 and installs Image Analyser without losing overrides", async (t) => {
  const { directory, store } = await fixture(t);
  const previous = {
    schemaVersion: "1.1", defaultsVersion: "6.0.0-a15.1", revision: 58,
    overlay: {
      workshopOverrides: { "prompt-forge": { title: "Idées préservées" } },
      toolOverrides: { "image-grabber": { title: "Mon Grabber" } },
      placementOverrides: {}, removedDefaultPlacementIds: [],
      customWorkshops: [], customTools: [], customPlacements: [], customRecipes: [],
      customLibraries: [], libraryOverlays: {}
    }
  };
  await writeFile(path.join(directory, "registry.overlay.json"), `${JSON.stringify(previous)}\n`, "utf8");
  const registry = await store.init();
  assert.equal(registry.defaultsVersion, "6.0.0-a23.0");
  assert.equal(registry.revision, 58);
  assert.equal(registry.workshops.find(({ id }) => id === "prompt-forge").title, "Idées préservées");
  assert.equal(registry.tools.find(({ id }) => id === "image-grabber").title, "Mon Grabber");
  assert.equal(registry.tools.find(({ id }) => id === "image-analyzer").title, "Image Analyser");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "image-analyzer").targetId, "utilities");
  assert.ok((await readdir(path.join(directory, "registry-backups"))).length > 0);
});

test("adopts A17 defaults from A16 and installs Video Director without losing overrides", async (t) => {
  const { directory, store } = await fixture(t);
  const previous = {
    schemaVersion: "1.1", defaultsVersion: "6.0.0-a16.1", revision: 63,
    overlay: {
      workshopOverrides: { "video-builder": { title: "Motion préservé" } },
      toolOverrides: { "image-analyzer": { title: "Mon Analyser" } },
      placementOverrides: {}, removedDefaultPlacementIds: [],
      customWorkshops: [], customTools: [], customPlacements: [], customRecipes: [],
      customLibraries: [], libraryOverlays: {}
    }
  };
  await writeFile(path.join(directory, "registry.overlay.json"), `${JSON.stringify(previous)}\n`, "utf8");
  const registry = await store.init();
  assert.equal(registry.defaultsVersion, "6.0.0-a23.0");
  assert.equal(registry.revision, 63);
  assert.equal(registry.workshops.find(({ id }) => id === "video-builder").title, "Motion préservé");
  assert.equal(registry.tools.find(({ id }) => id === "image-analyzer").title, "Mon Analyser");
  assert.equal(registry.tools.find(({ id }) => id === "video-director").title, "Video Analyser");
  assert.equal(registry.tools.find(({ id }) => id === "motion-emulator").title, "Motion Emulator");
  assert.equal(registry.tools.find(({ id }) => id === "video-editor").title, "Video Director");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "video-director").targetId, "utilities");
  assert.ok((await readdir(path.join(directory, "registry-backups"))).length > 0);
});

test("adopts current defaults from the live A20 profile and moves FACS to Backstage", async (t) => {
  const { directory, store } = await fixture(t);
  const previous = {
    schemaVersion: "1.1", defaultsVersion: "6.0.0-a20.0", revision: 71,
    overlay: {
      workshopOverrides: { "character-lab": { title: "Characters preserved" } },
      toolOverrides: { "facs-sheet-generator": { title: "My FACS" } },
      placementOverrides: {}, removedDefaultPlacementIds: [],
      customWorkshops: [], customTools: [], customPlacements: [], customRecipes: [],
      customLibraries: [], libraryOverlays: {}
    }
  };
  await writeFile(path.join(directory, "registry.overlay.json"), `${JSON.stringify(previous)}\n`, "utf8");
  const registry = await store.init();
  assert.equal(registry.defaultsVersion, "6.0.0-a23.0");
  assert.equal(registry.revision, 71);
  assert.equal(registry.workshops.find(({ id }) => id === "character-lab").title, "Characters preserved");
  assert.equal(registry.tools.find(({ id }) => id === "facs-sheet-generator").title, "My FACS");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "facs-sheet-generator").targetId, "utilities");
  assert.ok((await readdir(path.join(directory, "registry-backups"))).length > 0);
});

test("adopts A22 defaults by moving Camera Control first in Motion Studio", async (t) => {
  const { directory, store } = await fixture(t);
  const previous = {
    schemaVersion: "1.1", defaultsVersion: "6.0.0-a21.0", revision: 72,
    overlay: {
      workshopOverrides: { "camera-control": { title: "My old camera tab" } },
      toolOverrides: {},
      placementOverrides: { "veo-suite-in-camera": { targetId: "camera-control", order: 9 } },
      removedDefaultPlacementIds: ["veo-suite-in-camera"],
      customWorkshops: [], customTools: [],
      customPlacements: [{ id: "apg-in-old-camera", toolId: "apg", targetId: "camera-control", order: 2 }],
      customRecipes: [], customLibraries: [], libraryOverlays: {}
    }
  };
  await writeFile(path.join(directory, "registry.overlay.json"), `${JSON.stringify(previous)}\n`, "utf8");
  const registry = await store.init();
  const cameraPlacement = registry.placements.find(({ toolId }) => toolId === "veo-suite");
  assert.equal(registry.defaultsVersion, "6.0.0-a23.0");
  assert.equal(registry.revision, 72);
  assert.equal(registry.workshops.some(({ id }) => id === "camera-control"), false);
  assert.equal(registry.tools.find(({ id }) => id === "veo-suite").title, "Camera Control");
  assert.deepEqual({ targetId: cameraPlacement.targetId, order: cameraPlacement.order }, { targetId: "video-builder", order: 0 });
  assert.equal(registry.placements.find(({ id }) => id === "apg-in-old-camera").targetId, "video-builder");
  assert.ok((await readdir(path.join(directory, "registry-backups"))).length > 0);
});

test("adopts A23 defaults by moving Angle 3D and Relighting 3D into Backstage", async (t) => {
  const { directory, store } = await fixture(t);
  const previous = {
    schemaVersion: "1.1", defaultsVersion: "6.0.0-a22.0", revision: 73,
    overlay: {
      workshopOverrides: {}, toolOverrides: { "barz-enhancer": { title: "My Enhancer" } },
      placementOverrides: {}, removedDefaultPlacementIds: [],
      customWorkshops: [], customTools: [], customPlacements: [], customRecipes: [],
      customLibraries: [], libraryOverlays: {}
    }
  };
  await writeFile(path.join(directory, "registry.overlay.json"), `${JSON.stringify(previous)}\n`, "utf8");
  const registry = await store.init();
  assert.equal(registry.defaultsVersion, "6.0.0-a23.0");
  assert.equal(registry.revision, 73);
  assert.equal(registry.tools.find(({ id }) => id === "barz-enhancer").title, "My Enhancer");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "angle-3d").targetId, "utilities");
  assert.equal(registry.placements.find(({ toolId }) => toolId === "relighting-3d").targetId, "utilities");
  assert.ok((await readdir(path.join(directory, "registry-backups"))).length > 0);
});

test("Acting Gen exposes and compiles the 435 Astra-reviewed video prompts exactly", async () => {
  const library = freshDefaults().libraries.find(({ id }) => id === "acting-gen");
  const fixtureData = JSON.parse(await readFile(new URL("../migration/reviews/a3-legacy-fixtures.json", import.meta.url), "utf8"));
  const expectedTexts = [
    ...fixtureData.acting.groups.flatMap(({ entries }) => entries.map(({ text }) => text)),
    ...fixtureData.dance.categories.flatMap(({ entries }) => entries.map(({ text }) => text))
  ].map((text) => text.replace("unescapable", "inescapable").replace("motion blur taken literal", "motion blur taken literally"));
  assert.ok(library);
  assert.equal(library.categories.length, 34);
  assert.equal(library.entries.length, 435);
  assert.deepEqual(Object.fromEntries(["action", "emotion", "sfx", "dance"].map((section) => [
    section, library.entries.filter(({ categoryId }) => categoryId.startsWith(`${section}-`)).length
  ])), { action: 100, emotion: 80, sfx: 95, dance: 160 });
  assert.equal(new Set(library.entries.map(({ id }) => id)).size, 435);
  for (const [index, entry] of library.entries.entries()) {
    assert.deepEqual(entry.recipe.fields, []);
    const result = compilePromptLibrary({ library, entryId: entry.id });
    assert.equal(result.outputs[0].mediaType, "video");
    assert.equal(result.outputs[0].prompt, expectedTexts[index]);
  }
  assert.match(library.entries.find(({ recipe }) => recipe.title === "RECURSIVE LOOP").recipe.outputs[0].template, /inescapable$/);
  assert.match(library.entries.find(({ recipe }) => recipe.title === "DUPLICATION ARTIFACT").recipe.outputs[0].template, /taken literally/);
});

test("creates and compiles a second prompt library without adapter-specific code", async (t) => {
  const { store } = await fixture(t);
  await store.init();
  const library = {
    id: "personal-library",
    title: "Ma banque",
    categories: [{ id: "main", title: "Principal", order: 0 }],
    entries: [personalEntry()]
  };
  const registry = await store.createPromptLibrary({
    expectedRevision: 0,
    library,
    tool: { id: library.id, title: library.title, kind: "builtin", adapterId: "prompt-library" },
    placement: { id: "personal-library-in-ideas", toolId: library.id, targetId: "prompt-forge", order: 2 }
  });
  assert.equal(registry.libraries.find(({ id }) => id === library.id).title, "Ma banque");
  const snapshot = await store.readPromptLibrary({ libraryId: library.id });
  const compiled = compilePromptLibrary({ library: snapshot.library, entryId: "first-entry", scene: "un automate rouge" });
  assert.equal(compiled.outputs[0].prompt, "Portrait pratique de un automate rouge");
});

test("built-in entries can be edited, hidden, restored and reset without losing personal entries", async (t) => {
  const { store } = await fixture(t);
  await store.init();
  let snapshot = await store.readPromptLibrary({ libraryId: "banana-helper" });
  const original = snapshot.library.entries[0];
  const edited = structuredClone(original);
  delete edited.origin;
  delete edited.isModified;
  edited.description = "Description personnelle";
  edited.recipe.title = "Titre personnel";
  let registry = await store.updateLibraryEntry({
    expectedRevision: 0,
    libraryId: "banana-helper",
    entryId: original.id,
    entry: edited
  });
  snapshot = await store.readPromptLibrary({ libraryId: "banana-helper" });
  assert.equal(snapshot.library.entries.find(({ id }) => id === original.id).isModified, true);
  assert.equal(snapshot.library.entries.find(({ id }) => id === original.id).recipe.revision, 2);

  const custom = personalEntry("personal-goodie", "personal-goodie-v1");
  custom.categoryId = original.categoryId;
  registry = await store.addLibraryEntry({ expectedRevision: registry.revision, libraryId: "banana-helper", entry: custom });
  registry = await store.setLibraryEntryHidden({
    expectedRevision: registry.revision, libraryId: "banana-helper", entryId: original.id, hidden: true
  });
  registry = await store.setLibraryEntryHidden({
    expectedRevision: registry.revision, libraryId: "banana-helper", entryId: custom.id, hidden: true
  });
  snapshot = await store.readPromptLibrary({ libraryId: "banana-helper" });
  assert.ok(snapshot.library.hiddenEntries.some(({ id }) => id === original.id));
  assert.ok(snapshot.library.hiddenEntries.some(({ id }) => id === custom.id));

  const reset = await store.resetDefaults({ expectedRevision: registry.revision, scope: "all" });
  snapshot = await store.readPromptLibrary({ libraryId: "banana-helper" });
  const restored = snapshot.library.entries.find(({ id }) => id === original.id);
  assert.equal(restored.recipe.title, original.recipe.title);
  assert.equal(restored.isModified, false);
  assert.ok(snapshot.library.hiddenEntries.some(({ id }) => id === custom.id));
  assert.ok(snapshot.library.hiddenEntries.every(({ id }) => id !== original.id));
  assert.equal(reset.registry.revision, registry.revision + 1);
});
