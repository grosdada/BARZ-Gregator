import { readFileSync } from "node:fs";

import { fixedSystemTabs, validateRegistry } from "../../contracts/src/index.js";
import { libraryFromActingReview, libraryFromGoodiesCatalog } from "../../prompt-libraries/src/index.js";

const goodiesCatalog = JSON.parse(readFileSync(new URL("../../prompt-libraries/src/goodies-catalog.json", import.meta.url), "utf8"));
const actingFixture = JSON.parse(readFileSync(new URL("../../../migration/reviews/a3-legacy-fixtures.json", import.meta.url), "utf8"));
const actingBundle = JSON.parse(readFileSync(new URL("../../../migration/atlas-v5/semantic-review/astra-bundles/a3-acting-gen.json", import.meta.url), "utf8"));
const actingReview = JSON.parse(readFileSync(new URL("../../../migration/reviews/a3-astra.review.json", import.meta.url), "utf8"));

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

const defaultRegistry = {
  schemaVersion: "1.1",
  defaultsVersion: "6.0.0-a23.0",
  revision: 0,
  systemTabs: fixedSystemTabs(),
  workshops: [
    { id: "prompt-forge", title: "Idea Studio", order: 0, origin: "builtin" },
    { id: "image-looks", title: "Look Library", order: 1, origin: "builtin" },
    { id: "character-lab", title: "Character & Asset Lab", order: 2, origin: "builtin" },
    { id: "grid-generation", title: "Board & Sequence", order: 3, origin: "builtin" },
    { id: "video-builder", title: "Motion Studio", order: 4, origin: "builtin" }
  ],
  tools: [
    {
      id: "apg",
      title: "A.P.G",
      kind: "builtin",
      adapterId: "apg",
      origin: "builtin"
    },
    {
      id: "pilot-cinematic-shot",
      title: "Cinematic Shot — pilote",
      kind: "recipe",
      recipeId: "pilot-cinematic-shot-v1",
      origin: "builtin"
    },
    {
      id: "cinema-helper",
      title: "Cinema Helper",
      kind: "builtin",
      adapterId: "cinema-helper",
      origin: "builtin"
    },
    {
      id: "image-slicer",
      title: "Image Slicer",
      kind: "builtin",
      adapterId: "image-slicer",
      origin: "builtin"
    },
    {
      id: "paint-studio",
      title: "Paint Studio",
      kind: "builtin",
      adapterId: "paint-studio",
      origin: "builtin"
    },
    {
      id: "image-grabber",
      title: "Image Grabber",
      kind: "builtin",
      adapterId: "image-grabber",
      origin: "builtin"
    },
    {
      id: "image-analyzer",
      title: "Image Analyser",
      kind: "builtin",
      adapterId: "image-analyzer",
      origin: "builtin"
    },
    {
      id: "angle-3d",
      title: "Angle 3D",
      kind: "builtin",
      adapterId: "angle-3d",
      origin: "builtin"
    },
    {
      id: "relighting-3d",
      title: "Relighting 3D",
      kind: "builtin",
      adapterId: "relighting-3d",
      origin: "builtin"
    },
    {
      id: "video-director",
      title: "Video Analyser",
      kind: "builtin",
      adapterId: "video-director",
      origin: "builtin"
    },
    {
      id: "motion-emulator",
      title: "Motion Emulator",
      kind: "builtin",
      adapterId: "motion-emulator",
      origin: "builtin"
    },
    {
      id: "video-editor",
      title: "Video Director",
      kind: "builtin",
      adapterId: "video-editor",
      origin: "builtin"
    },
    {
      id: "blocking-studio",
      title: "Blocking Studio",
      kind: "builtin",
      adapterId: "blocking-studio",
      origin: "builtin"
    },
    {
      id: "object-scale-chart",
      title: "Object Scale Chart",
      kind: "builtin",
      adapterId: "object-scale-chart",
      origin: "builtin"
    },
    {
      id: "youtube-extractor",
      title: "YouTube Extractor",
      kind: "builtin",
      adapterId: "youtube-extractor",
      origin: "builtin"
    },
    {
      id: "barz-enhancer",
      title: "BZ Enhancer",
      kind: "builtin",
      adapterId: "barz-enhancer",
      origin: "builtin"
    },
    {
      id: "imperfection",
      title: "Imperfection Engine",
      kind: "builtin",
      adapterId: "imperfection",
      origin: "builtin"
    },
    {
      id: "banana-helper",
      title: "BZ Goodies",
      kind: "builtin",
      adapterId: "prompt-library",
      origin: "builtin"
    },
    {
      id: "mode-bank",
      title: "The Mode Bank",
      kind: "builtin",
      adapterId: "mode-bank",
      origin: "builtin"
    },
    {
      id: "barz-beauty",
      title: "Beauty Studio",
      kind: "builtin",
      adapterId: "barz-beauty",
      origin: "builtin"
    },
    {
      id: "realism-forge",
      title: "Realism Forge",
      kind: "builtin",
      adapterId: "realism-forge",
      origin: "builtin"
    },
    {
      id: "cinematic-shoot",
      title: "Cinematic Shoot",
      kind: "builtin",
      adapterId: "cinematic-shoot",
      origin: "builtin"
    },
    {
      id: "acting-gen",
      title: "Acting Gen",
      kind: "builtin",
      adapterId: "prompt-library",
      origin: "builtin"
    },
    {
      id: "facs-sheet-generator",
      title: "FACS Sheet Generator",
      kind: "builtin",
      adapterId: "facs-sheet-generator",
      origin: "builtin"
    },
    {
      id: "barzy-board",
      title: "BZ Board",
      kind: "builtin",
      adapterId: "barzy-board",
      origin: "builtin"
    },
    {
      id: "cccp",
      title: "CCP",
      kind: "builtin",
      adapterId: "cccp",
      origin: "builtin"
    },
    {
      id: "veo-suite",
      title: "Camera Control",
      kind: "builtin",
      adapterId: "veo-suite",
      origin: "builtin"
    },
    {
      id: "barzy-sheet",
      title: "BZ Sheet",
      kind: "builtin",
      adapterId: "barzy-sheet",
      origin: "builtin"
    },
    {
      id: "barz-designer",
      title: "BZ Designer",
      kind: "builtin",
      adapterId: "barz-designer",
      origin: "builtin"
    },
    {
      id: "knolling",
      title: "Knolling Board",
      kind: "builtin",
      adapterId: "knolling",
      origin: "builtin"
    },
    {
      id: "workflow-3d",
      title: "2D/3D Transfer workflow",
      kind: "builtin",
      adapterId: "workflow-3d",
      origin: "builtin"
    },
    {
      id: "multishot",
      title: "BZ Multishot",
      kind: "builtin",
      adapterId: "multishot",
      origin: "builtin"
    },
    {
      id: "seedance",
      title: "Video Multi Framing",
      kind: "builtin",
      adapterId: "seedance",
      origin: "builtin"
    }
  ],
  placements: [
    {
      id: "apg-in-ideas",
      toolId: "apg",
      targetId: "prompt-forge",
      order: 0,
      origin: "builtin"
    },
    {
      id: "pilot-cinematic-shot-in-ideas",
      toolId: "pilot-cinematic-shot",
      targetId: "prompt-forge",
      order: 1,
      origin: "builtin"
    },
    {
      id: "cinema-helper-in-ideas",
      toolId: "cinema-helper",
      targetId: "prompt-forge",
      order: 2,
      origin: "builtin"
    },
    {
      id: "image-slicer-in-backstage",
      toolId: "image-slicer",
      targetId: "utilities",
      order: 0,
      origin: "builtin"
    },
    {
      id: "paint-studio-in-backstage",
      toolId: "paint-studio",
      targetId: "utilities",
      order: 1,
      origin: "builtin"
    },
    {
      id: "image-grabber-in-backstage",
      toolId: "image-grabber",
      targetId: "utilities",
      order: 2,
      origin: "builtin"
    },
    {
      id: "image-analyzer-in-backstage",
      toolId: "image-analyzer",
      targetId: "utilities",
      order: 3,
      origin: "builtin"
    },
    {
      id: "angle-3d-in-backstage",
      toolId: "angle-3d",
      targetId: "utilities",
      order: 4,
      origin: "builtin"
    },
    {
      id: "relighting-3d-in-backstage",
      toolId: "relighting-3d",
      targetId: "utilities",
      order: 5,
      origin: "builtin"
    },
    {
      id: "barz-enhancer-in-looks",
      toolId: "barz-enhancer",
      targetId: "image-looks",
      order: 0,
      origin: "builtin"
    },
    {
      id: "imperfection-in-motion",
      toolId: "imperfection",
      targetId: "video-builder",
      order: 0,
      origin: "builtin"
    },
    {
      id: "banana-helper-in-looks",
      toolId: "banana-helper",
      targetId: "image-looks",
      order: 1,
      origin: "builtin"
    },
    {
      id: "mode-bank-in-looks",
      toolId: "mode-bank",
      targetId: "image-looks",
      order: 4,
      origin: "builtin"
    },
    {
      id: "barz-beauty-in-looks",
      toolId: "barz-beauty",
      targetId: "image-looks",
      order: 2,
      origin: "builtin"
    },
    {
      id: "realism-forge-in-looks",
      toolId: "realism-forge",
      targetId: "image-looks",
      order: 3,
      origin: "builtin"
    },
    {
      id: "cinematic-shoot-in-board",
      toolId: "cinematic-shoot",
      targetId: "grid-generation",
      order: 0,
      origin: "builtin"
    },
    {
      id: "facs-sheet-generator-in-board",
      toolId: "facs-sheet-generator",
      targetId: "utilities",
      order: 11,
      origin: "builtin"
    },
    {
      id: "barzy-board-in-board",
      toolId: "barzy-board",
      targetId: "grid-generation",
      order: 2,
      origin: "builtin"
    },
    {
      id: "cccp-in-board",
      toolId: "cccp",
      targetId: "grid-generation",
      order: 3,
      origin: "builtin"
    },
    {
      id: "multishot-in-board",
      toolId: "multishot",
      targetId: "grid-generation",
      order: 4,
      origin: "builtin"
    },
    {
      id: "acting-gen-in-motion",
      toolId: "acting-gen",
      targetId: "video-builder",
      order: 1,
      origin: "builtin"
    },
    {
      id: "seedance-in-motion",
      toolId: "seedance",
      targetId: "video-builder",
      order: 2,
      origin: "builtin"
    },
    {
      id: "video-director-in-motion",
      toolId: "video-director",
      targetId: "utilities",
      order: 6,
      origin: "builtin"
    },
    {
      id: "video-editor-in-backstage",
      toolId: "video-editor",
      targetId: "utilities",
      order: 8,
      origin: "builtin"
    },
    {
      id: "motion-emulator-in-backstage",
      toolId: "motion-emulator",
      targetId: "utilities",
      order: 7,
      origin: "builtin"
    },
    {
      id: "blocking-studio-in-backstage",
      toolId: "blocking-studio",
      targetId: "utilities",
      order: 9,
      origin: "builtin"
    },
    {
      id: "object-scale-chart-in-backstage",
      toolId: "object-scale-chart",
      targetId: "utilities",
      order: 10,
      origin: "builtin"
    },
    {
      id: "youtube-extractor-in-backstage",
      toolId: "youtube-extractor",
      targetId: "utilities",
      order: 12,
      origin: "builtin"
    },
    {
      id: "veo-suite-in-camera",
      toolId: "veo-suite",
      targetId: "video-builder",
      order: 0,
      origin: "builtin"
    },
    {
      id: "barzy-sheet-in-character",
      toolId: "barzy-sheet",
      targetId: "character-lab",
      order: 0,
      origin: "builtin"
    },
    {
      id: "barz-designer-in-character",
      toolId: "barz-designer",
      targetId: "character-lab",
      order: 1,
      origin: "builtin"
    },
    {
      id: "knolling-in-character",
      toolId: "knolling",
      targetId: "character-lab",
      order: 2,
      origin: "builtin"
    },
    {
      id: "workflow-3d-in-character",
      toolId: "workflow-3d",
      targetId: "character-lab",
      order: 3,
      origin: "builtin"
    }
  ],
  recipes: [{
    schemaVersion: "1.0",
    id: "pilot-cinematic-shot-v1",
    revision: 1,
    title: "Cinematic Shot — pilote synthétique",
    fields: [
      { id: "subject", label: "Sujet", type: "text", required: true, maxLength: 2_000, default: "A weathered wooden gate under moonlight" },
      { id: "motion", label: "Mouvement", type: "enum", values: ["Locked-off shot", "Slow forward dolly"], default: "Slow forward dolly" },
      { id: "action", label: "Action", type: "text", required: true, maxLength: 2_000, default: "The gate slowly opens as mist crosses the path." }
    ],
    outputs: [{
      id: "main",
      mediaType: "video",
      template: "{{subject}}. {{motion}}. {{action}} Preserve the setting and lighting throughout the shot.",
      negativePrompt: "",
      settings: { aspectRatio: "16:9" }
    }],
    referenceSlots: [],
    origin: "builtin"
  }],
  libraries: [
    libraryFromGoodiesCatalog(goodiesCatalog),
    libraryFromActingReview({ fixture: actingFixture, bundle: actingBundle, review: actingReview })
  ]
};

validateRegistry(structuredClone(defaultRegistry));
export const DEFAULT_REGISTRY = deepFreeze(defaultRegistry);

export function freshDefaults() {
  return structuredClone(DEFAULT_REGISTRY);
}
