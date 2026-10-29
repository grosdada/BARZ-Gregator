import { readFileSync } from "node:fs";

import { ContractValidationError } from "../../contracts/src/index.js";
import { compileRecipe } from "../../prompt-runtime/src/index.js";

const enhancerReview = JSON.parse(readFileSync(new URL("../../../migration/reviews/barz-enhancer.review.json", import.meta.url), "utf8"));
const imperfectionReview = JSON.parse(readFileSync(new URL("../../../migration/reviews/imperfection.review.json", import.meta.url), "utf8"));
const goodiesData = JSON.parse(readFileSync(new URL("../../prompt-libraries/src/goodies-catalog.json", import.meta.url), "utf8"));
const a1Fixture = JSON.parse(readFileSync(new URL("../../../migration/reviews/a1-legacy-fixtures.json", import.meta.url), "utf8"));
const a1Bundle = JSON.parse(readFileSync(new URL("../../../migration/atlas-v5/semantic-review/astra-bundles/a1-realism-beauty.json", import.meta.url), "utf8"));
const a1Review = JSON.parse(readFileSync(new URL("../../../migration/reviews/a1-astra.review.json", import.meta.url), "utf8"));
const a2Fixture = JSON.parse(readFileSync(new URL("../../../migration/reviews/a2-legacy-fixtures.json", import.meta.url), "utf8"));
const a2Bundle = JSON.parse(readFileSync(new URL("../../../migration/atlas-v5/semantic-review/astra-bundles/a2-cinematic-shoot.json", import.meta.url), "utf8"));
const a2Review = JSON.parse(readFileSync(new URL("../../../migration/reviews/a2-astra.review.json", import.meta.url), "utf8"));
const a2Supplement = JSON.parse(readFileSync(new URL("../../../migration/reviews/a2-astra-supplement.review.json", import.meta.url), "utf8"));
const a4Supplement = JSON.parse(readFileSync(new URL("../../../migration/reviews/a4-astra-supplement.review.json", import.meta.url), "utf8"));
const a5Supplement = JSON.parse(readFileSync(new URL("../../../migration/reviews/a5-astra-supplement.review.json", import.meta.url), "utf8"));
const a6Supplement = JSON.parse(readFileSync(new URL("../../../migration/reviews/a6-astra-supplement.review.json", import.meta.url), "utf8"));
const a7Supplement = JSON.parse(readFileSync(new URL("../../../migration/reviews/a7-astra-supplement.review.json", import.meta.url), "utf8"));
const a8Supplement = JSON.parse(readFileSync(new URL("../../../migration/reviews/a8-astra-supplement.review.json", import.meta.url), "utf8"));
const a9Supplement = JSON.parse(readFileSync(new URL("../../../migration/reviews/a9-astra-supplement.review.json", import.meta.url), "utf8"));
const a10Supplement = JSON.parse(readFileSync(new URL("../../../migration/reviews/a10-astra-supplement.review.json", import.meta.url), "utf8"));
const a11Supplement = JSON.parse(readFileSync(new URL("../../../migration/reviews/a11-astra-supplement.review.json", import.meta.url), "utf8"));
const cinemaHelperData = JSON.parse(readFileSync(new URL("./cinema-helper-catalog.json", import.meta.url), "utf8"));

const clone = (value) => structuredClone(value);
const plainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const a1ItemById = new Map(a1Bundle.items.map((item) => [item.id, item]));
const a1Corrections = new Map(a1Review.decisions.filter(({ action }) => action === "correct").map((decision) => [
  a1ItemById.get(decision.id)?.value, decision.correctedValue
]));
const reviewedA1Text = (value) => a1Corrections.get(value) ?? value;
const a2ItemById = new Map(a2Bundle.items.map((item) => [item.id, item]));
const a2Corrections = new Map(a2Review.decisions.filter(({ action }) => action === "correct").map((decision) => [
  a2ItemById.get(decision.id)?.value, decision.correctedValue
]));
const reviewedA2Text = (value) => a2Corrections.get(value) ?? value;
const a2TitleCorrections = new Map(a2Supplement.metadataCorrections.map((item) => [item.recipeId, item.correctedValue]));

function fail(message, path) {
  throw new ContractValidationError(message, path);
}

function exactKeys(value, allowed, path) {
  if (!plainObject(value)) fail("must be an object", path);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(`unknown property ${JSON.stringify(key)}`, `${path}.${key}`);
  }
}

export const ENHANCER_CATALOG = Object.freeze({
  cards: Object.freeze(enhancerReview.cards.map((card) => Object.freeze({
    id: card.id,
    title: card.title,
    description: card.id === "tattoocharacter"
      ? "Applies ordered tattoo references to a supplied or generated body. Reference numbering follows the selected body mode."
      : card.id === "360"
        ? "Generates a seamless 360° equirectangular panorama for VR or environment backgrounds. HDR lighting additionally requires HDR image data."
        : card.description,
    section: card.section,
    prompt: card.text,
    sourceLine: card.sourceLine,
    corrections: clone(card.corrections)
  }))),
  angles: Object.freeze(enhancerReview.angles.map((angle) => Object.freeze({ ...angle }))),
  preservationModes: Object.freeze(enhancerReview.preservationModes.map((mode) => Object.freeze({ ...mode }))),
  renderPassDisclaimer: enhancerReview.renderPassDisclaimer
});

export const IMPERFECTION_CATALOG = Object.freeze({
  defaults: clone(imperfectionReview.defaults),
  presets: clone(imperfectionReview.presets),
  ranges: clone(imperfectionReview.ranges),
  enums: clone(imperfectionReview.enums)
});

export const GOODIES_CATALOG = Object.freeze({
  id: goodiesData.id,
  title: goodiesData.title,
  suffix: goodiesData.suffix,
  categories: Object.freeze(goodiesData.categories.map((category) => Object.freeze({ ...category }))),
  entries: Object.freeze(goodiesData.entries.map((entry) => Object.freeze({
    ...entry,
    corrections: clone(entry.corrections)
  })))
});

const BEAUTY_CATEGORY_TITLES = {
  "selfie-f": "Selfies — Femme", "selfie-m": "Selfies — Homme",
  "portrait-f": "Portraits — Femme", "portrait-m": "Portraits — Homme",
  skin: "Matières & peau", lighting: "Éclairages", negatives: "Anti-IA"
};

export const BEAUTY_CATALOG = Object.freeze({
  categories: Object.freeze(a1Fixture.beauty.categories.map((category) => Object.freeze({
    id: category.id, title: BEAUTY_CATEGORY_TITLES[category.id], count: category.entries.length
  }))),
  entries: Object.freeze(a1Fixture.beauty.categories.flatMap((category) => category.entries.map((entry, index) => Object.freeze({
    id: `beauty-${category.id}-${String(index + 1).padStart(2, "0")}`,
    categoryId: category.id,
    title: entry.title,
    prompt: reviewedA1Text(entry.text)
  }))))
});

export const REALISM_CATALOG = Object.freeze({
  tabs: Object.freeze(a1Fixture.realism.tabs.map((tab) => Object.freeze({
    id: tab.id, label: tab.label, intro: tab.intro,
    cards: Object.freeze(tab.cards.map((card, index) => Object.freeze({
      id: `realism-${tab.id}-${String(index + 1).padStart(2, "0")}`,
      title: card.title,
      specs: (card.specs ?? []).map((spec) => spec === "200MP?12MP" ? "200MP → 12MP" : spec),
      template: clone(card.template)
    })))
  }))),
  controls: Object.freeze(clone(a1Fixture.realism.controls)),
  celebrities: Object.freeze(clone(a1Fixture.realism.celebrities)),
  sliders: Object.freeze(a1Fixture.realism.sliders.map((slider) => Object.freeze({
    ...clone(slider), label: slider.id === "wear" ? "Usure / âge" : slider.label
  })))
});

const PUPPET_MODE_SOURCE = "IMG_1 is a reference for a practical puppet/figurine character. Photograph this exact figurine — with its exact proportions, head size, limb thickness, body shape — as-is in a reallocation. Do not apply realistic human anatomy. This is NOT a human, it is a sculpted character with intentionalnon-realistic proportions";

export const CINEMATIC_SHOOT_CATALOG = Object.freeze({
  families: Object.freeze(a2Fixture.cinematicShoot.families.map((family) => Object.freeze({ ...family }))),
  prompts: Object.freeze(a2Fixture.cinematicShoot.prompts.map((prompt) => {
    const title = a2TitleCorrections.get(prompt.id) ?? prompt.title;
    return Object.freeze({
      id: prompt.id,
      title,
      cleanTitle: title.replace(/^3x3 JSON:\s*/i, "").trim(),
      family: prompt.family,
      prompt: reviewedA2Text(prompt.prompt),
      highlight: prompt.highlight ?? "",
      hasOutfitToggle: Boolean(prompt.hasOutfitToggle || prompt.prompt.includes("[OUTFIT_INSTRUCTION]"))
    });
  })),
  puppetModeInstruction: reviewedA2Text(PUPPET_MODE_SOURCE)
});

export const FACS_CATALOG = Object.freeze({
  categories: Object.freeze([
    { id: "brow", label: "Sourcils & front" },
    { id: "eye", label: "Yeux & paupières" },
    { id: "cheek", label: "Joues" },
    { id: "nose", label: "Nez" },
    { id: "mouth", label: "Bouche & lèvres" },
    { id: "chin", label: "Menton" },
    { id: "jaw", label: "Langue & mâchoire" },
    { id: "head", label: "Tête" },
    { id: "gaze", label: "Regard" }
  ]),
  entries: Object.freeze(a4Supplement.catalog.map((entry) => Object.freeze({ ...entry }))),
  crop: Object.freeze({ version: "facs-7x7-v1", columns: 7, rows: 7, x: 0.09, y: 0.025, width: 0.82, height: 0.75, outputWidth: 360, outputHeight: 460 })
});

export const BOARD_CATALOG = Object.freeze({
  cameras: Object.freeze([
    "handheld arthouse, whip pans, orbit movement, overhead, extreme negative space",
    "classical fixed tripod, pans and tilts on axis only, controlled zooms",
    "anamorphic wide, long lens compression, slow dolly",
    "documentary verite, shoulder mount, reactive framing",
    "aggressive close-ups, dutch angles, snap zooms"
  ]),
  panels: Object.freeze(["6", "9", "12", "16"]),
  ratios: Object.freeze(["16:9", "9:16", "2.39:1", "1:1", "4:3"]),
  drawingStyles: Object.freeze([
    "rough pencil B&W, minimal detail, strong silhouette, unfinished previs",
    "ink wash B&W, brushy lines, high contrast shadows",
    "marker color, flat fills, anime previs energy",
    "blueprint line art, technical orthographic feel",
    "painterly thumbnail, gouache mood frames"
  ]),
  models: Object.freeze(["seedance", "kling", "veo"]),
  durations: Object.freeze(["5", "8", "10", "15", "20"]),
  paces: Object.freeze([
    "urgent quick cuts, whip transitions, match cuts, no pauses",
    "slow burn, long takes, controlled dolly",
    "hypnotic loop, repetitive motion, rhythmic snap",
    "escalating, slow start then rapid acceleration"
  ])
});

const CAMERA_SECTION_IDS = Object.freeze({
  "Camera Movement": "camera-movement",
  "Handheld & Raw": "handheld-raw",
  "Lenses & Optics": "lenses-optics",
  "Aerial & Drone": "aerial-drone",
  "Surveillance & Found": "surveillance-found",
  "Film Stock & Era": "film-stock-era",
  "Zoom & Focus": "zoom-focus"
});

export const CAMERA_SUITE_CATALOG = Object.freeze({
  id: "veo-suite",
  title: "Camera Control",
  aliases: Object.freeze(["VEO Precision"]),
  sections: Object.freeze(Object.entries(CAMERA_SECTION_IDS).map(([title, id]) => Object.freeze({ id, title }))),
  cards: Object.freeze(a5Supplement.catalog.map((card) => Object.freeze({
    key: card.key,
    title: card.title,
    sectionId: CAMERA_SECTION_IDS[card.section],
    variants: Object.freeze(card.variants.map((variant) => Object.freeze({ ...variant })))
  })))
});

export const CCP_CATALOG = Object.freeze({
  id: "cccp",
  title: "CCP",
  subtitle: "Consistent Character Process",
  stages: Object.freeze(a6Supplement.catalog.stages.map((stage) => Object.freeze({ ...stage }))),
  templates: Object.freeze(a6Supplement.catalog.templates.map(({ key, id, prompt }) => Object.freeze({ key, id, prompt }))),
  modes: Object.freeze(a6Supplement.catalog.modes.map(({ id, stage, mode, prompt }) => Object.freeze({ id, stage, mode, prompt }))),
  variations: Object.freeze(a6Supplement.catalog.variations.map(({ id, index, prompt }) => Object.freeze({ id, index, prompt }))),
  outputSuffix: a6Supplement.approvedComposition.outputSuffix,
  coverageInstruction: a6Supplement.approvedComposition.coverageInstruction
});

export const CYCLO_PALETTE = Object.freeze([
  Object.freeze({ id: "white", name: "White", hex: "#F2ECCA" }),
  Object.freeze({ id: "beige", name: "Beige", hex: "#B3A089" }),
  Object.freeze({ id: "taupe", name: "Taupe", hex: "#766D63" }),
  Object.freeze({ id: "graphite", name: "Graphite", hex: "#34383C" }),
  Object.freeze({ id: "blue", name: "Blue", hex: "#515973" }),
  Object.freeze({ id: "petrol", name: "Petrol", hex: "#496B6D" }),
  Object.freeze({ id: "pink", name: "Pink", hex: "#DE7C68" }),
  Object.freeze({ id: "clay", name: "Clay", hex: "#A66F5B" }),
  Object.freeze({ id: "ochre", name: "Ochre", hex: "#A58A52" }),
  Object.freeze({ id: "olive", name: "Olive", hex: "#6F7654" }),
  Object.freeze({ id: "sage", name: "Sage", hex: "#7F9181" }),
  Object.freeze({ id: "lavender", name: "Lavender", hex: "#777083" })
]);

const CYCLO_BACKGROUNDS = Object.freeze(Object.fromEntries(CYCLO_PALETTE.map(({ id, name, hex }) => [
  id,
  `${name} (${hex})`
])));

export const SHEET_CATALOG = Object.freeze({
  id: "barzy-sheet",
  title: a7Supplement.catalog.title,
  tabs: Object.freeze(a7Supplement.catalog.tabs.map((tab) => Object.freeze({ ...tab }))),
  cards: Object.freeze(a7Supplement.catalog.cards.map((card) => Object.freeze({
    id: card.id,
    tab: card.tab,
    title: card.title,
    description: card.desc,
    prompt: card.prompt,
    settings: Object.freeze({ ...card.settings })
  }))),
  backgrounds: CYCLO_BACKGROUNDS,
  backgroundPalette: CYCLO_PALETTE,
  weapons: Object.freeze(a7Supplement.catalog.weapons.map((weapon) => Object.freeze({ ...weapon }))),
  facs: Object.freeze(a7Supplement.catalog.facs.map((entry) => Object.freeze({
    id: entry.id,
    label: entry.label,
    name: entry.name,
    category: entry.category,
    visible: entry.visible,
    sheetPosition: entry.sheetPosition
  })))
});

export const DESIGNER_CATALOG = Object.freeze({
  id: "barz-designer",
  title: a8Supplement.catalog.title,
  categories: Object.freeze(a8Supplement.catalog.categories.map((category) => Object.freeze({
    ...category,
    tabs: Object.freeze(category.tabs.map((tab) => Object.freeze({ ...tab })))
  }))),
  cards: Object.freeze(a8Supplement.catalog.cards.map((card) => Object.freeze({
    id: card.id,
    categoryId: card.categoryId,
    tabId: card.tabId,
    title: card.title,
    highlight: card.highlight,
    colors: card.colors.length ? CYCLO_PALETTE : Object.freeze([]),
    prompt: card.prompt,
    usesDrawingWeight: card.usesDrawingWeight
  })))
});

export const KNOLLING_CATALOG = Object.freeze({
  id: "knolling",
  title: a9Supplement.catalog.title,
  tabs: Object.freeze(a9Supplement.catalog.tabs.map((tab) => Object.freeze({ ...tab }))),
  cards: Object.freeze(a9Supplement.catalog.cards.map((card) => Object.freeze({
    id: card.id,
    tabId: card.tabId,
    title: card.title,
    description: card.description,
    prompt: card.prompt,
    placeholders: Object.freeze([...card.placeholders])
  }))),
  controls: Object.freeze(clone(a9Supplement.catalog.controls)),
  optionTexts: Object.freeze(clone(a9Supplement.catalog.optionTexts)),
  roleTexts: Object.freeze({ ...a9Supplement.catalog.roleTexts }),
  zoneDefault: a9Supplement.catalog.zoneDefault,
  zoneLine: a9Supplement.catalog.zoneLine,
  zoneTemplate: a9Supplement.catalog.zoneTemplate,
  compilerTargets: Object.freeze(clone(a9Supplement.catalog.compilerTargets))
});

export const MULTISHOT_CATALOG = Object.freeze({
  id: "multishot",
  title: a10Supplement.catalog.title,
  tabs: Object.freeze([...a10Supplement.catalog.tabs]),
  camera: Object.freeze(a10Supplement.catalog.camera.map((entry) => Object.freeze({ ...entry }))),
  cards: Object.freeze(a10Supplement.catalog.cards.map((card) => Object.freeze({
    ...clone(card),
    structured: card.structured ? Object.freeze(clone(card.structured)) : undefined
  }))),
  multiAnglePool: Object.freeze([...a10Supplement.catalog.multiAnglePool]),
  multiAngleTemplate: a10Supplement.catalog.multiAngleTemplate,
  gridContract: Object.freeze(clone(a10Supplement.gridContract)),
  iterationAvailable: false
});

export const VIDEO_MULTI_FRAMING_ENGINES = Object.freeze([
  Object.freeze({ id: "kling", label: "Kling 3.0 / Omni", shortLabel: "Kling 3", maxDuration: 15, timing: "shots", skillTarget: "Kling 3.0 Omni" }),
  Object.freeze({ id: "seedance", label: "Seedance 2.5", shortLabel: "Seedance 2.5", maxDuration: 30, timing: "ranges", skillTarget: "Seedance 2.5" }),
  Object.freeze({ id: "minimax-h3", label: "MiniMax H3", shortLabel: "MiniMax H3", maxDuration: 15, timing: "shots", skillTarget: "MiniMax H3" }),
  Object.freeze({ id: "flux-3", label: "FLUX 3 Video", shortLabel: "FLUX 3", maxDuration: 20, timing: "shots", skillTarget: "FLUX 3 Video" }),
  Object.freeze({ id: "wan", label: "Wan 3.0", shortLabel: "Wan 3", maxDuration: 30, timing: "shots", skillTarget: "Wan 3.0" })
]);

const VIDEO_MULTI_FRAMING_DIRECTOR_SKILLS = Object.freeze({
  standard: "Classical cinematic coverage: establish geography first, preserve eyelines and screen direction, vary shot scale with purpose, motivate every camera move, maintain readable continuity, and finish each beat on a clean visual resolution.",
  fincher: "Controlled procedural tension: locked geometry, exact blocking, restrained dolly or pan moves, cool desaturated green-amber color, low-key practical light, crisp inserts, patient pacing, and invisible continuity edits.",
  noe: "Visceral sensory immersion: saturated neon, floating or rotating camera, aggressive spatial transitions, long hypnotic takes, extreme proximity, bodily movement, pulsing practical light, and escalating disorientation without losing the central action.",
  burton: "Gothic storybook staging: elongated silhouettes, canted architecture, theatrical wide lenses, high-contrast moonlit shapes, expressive production design, whimsical macabre rhythm, and character movement composed as graphic tableaux.",
  wkw: "Intimate urban longing: compressed close framings, neon color separation, reflective surfaces, step-printed motion texture, off-center negative space, gliding handheld proximity, tactile inserts, and ellipses that privilege memory over literal continuity.",
  lanthimos: "Clinical absurdism: detached wide-angle observation, rigid or deliberately awkward blocking, symmetrical institutional spaces, deadpan pauses, sudden axial reframing, emotionally neutral light, and social discomfort held longer than expected.",
  villeneuve: "Monumental controlled scale: precise wides, atmospheric depth, brutalist negative space, slow ominous camera movement, strong silhouettes, restrained palette, motivated close-ups, and sound-conscious pacing that lets scale dominate the frame.",
  aster: "Architectural dread: legible dollhouse geography, centered frames that slowly reveal threat, deliberate pans and push-ins, daylight horror, ritualized group blocking, precise eyelines, and long holds that turn background details into narrative pressure.",
  park: "Elegant visual causality: exact match cuts, graphic compositions, sensuous macro inserts, motivated camera choreography, bold color contrasts, layered foreground reveals, controlled violence, and transitions built from objects, gestures, and repeated shapes.",
  trier: "Confrontational immediacy: raw handheld proximity, abrupt reframing, available-light texture, imperfect focus, emotionally exposed performances, jump cuts used as pressure, and an unstable camera that reacts to rather than decorates the action.",
  pta: "Performance-led ensemble staging: long motivated tracking shots, fluid handoffs between characters, layered foreground and background action, warm practical light, precise wides that become close-ups through movement, and patient dramatic escalation.",
  refn: "Graphic nocturnal minimalism: saturated red-blue-magenta light, centered iconography, slow push-ins, sparse dialogue, fetishized detail inserts, controlled stillness, mirrored surfaces, and sudden bursts of action framed with geometric clarity.",
  lynch: "Uncanny dream logic: deep chiaroscuro, ordinary spaces made threatening, charged empty frames, slow creeping camera, theatrical sound cues, discontinuous inserts, held reactions, and surreal transitions that feel emotionally inevitable rather than literal.",
  tarkovsky: "Contemplative material time: very long takes, slow lateral or inward drift, layered depth, water, wind, smoke and reflective surfaces, spiritual natural light, minimal cutting, and blocking that allows environment and duration to carry meaning.",
  cunningham: "Biotechnological unease: clinical macro detail, distorted anatomy or machinery, hard industrial light, precise texture studies, abrupt scale changes, rhythmic mechanical movement, sterile environments, and disturbing transformations shown with forensic clarity.",
  malick: "Lyrical embodied observation: magic-hour backlight, floating wide-lens camera, tactile gestures, nature in constant motion, fragmented close details, spontaneous performance, horizon-aware compositions, and poetic visual associations instead of rigid coverage.",
  kubrick_real: "Formal one-point perspective: clinical symmetry, wide-angle depth, slow deliberate zooms or tracking moves, exact centered blocking, cold architectural scale, controlled practical light, long holds, and cuts based on graphic or conceptual correspondence.",
  romero: "Grounded social horror: functional documentary coverage, practical locations, readable group geography, blunt reaction shots, restrained handheld movement, matter-of-fact gore staging, and editing that exposes social behavior as clearly as the threat.",
  scott_real: "Dense atmospheric world-building: layered foreground silhouettes, smoke and shafts of motivated light, tactile industrial surfaces, controlled anamorphic movement, strong backlight, visual information in every depth plane, and decisive action inserts.",
  loach: "Naturalistic social observation: eye-level camera, available light, unobtrusive medium lenses, behavior-led framing, imperfect lived-in locations, overlapping action, minimal stylization, and cuts that protect truthful performance and social context.",
  apichatpong: "Quiet porous reality: static or gently drifting long takes, tropical ambient detail, deep listening, off-screen space, daylight-to-night transitions, non-performative blocking, and dream events treated with the same calm attention as ordinary life.",
  spielberg: "Clear emotional spectacle: economical master shots, foreground reveals, motivated push-ins, strong reaction close-ups, precise eyeline storytelling, fluid ensemble blocking, readable geography, and visual beats that turn discovery into emotion.",
  bruckheimer: "High-energy commercial action: bold hero angles, long-lens compression, fast lateral tracking, backlit haze, polished contrast, decisive inserts, escalating coverage, and clean geography beneath rapid cutting so every impact remains legible.",
  wes: "Centered graphic staging: strict symmetry, flat frontal tableaux, lateral dollhouse moves, controlled whip pans, pastel production design, precise ensemble choreography, deliberate insert shots, and transitions driven by repeated shapes and deadpan timing.",
  coppola: "Intimate suspended mood: soft diffused light, hazy pastel color, quiet close observation, restrained handheld or locked frames, private gestures, reflective surfaces, spacious pauses, and elliptical transitions that preserve emotional ambiguity."
});

export const SEEDANCE_CATALOG = Object.freeze({
  id: "seedance",
  title: a11Supplement.catalog.title,
  displayTitle: "Video Multi Framing",
  aliases: Object.freeze(["Seedance Framing"]),
  categoryOrder: Object.freeze([...a11Supplement.catalog.categoryOrder]),
  engines: VIDEO_MULTI_FRAMING_ENGINES,
  templates: Object.freeze(a11Supplement.catalog.templates.map((template) => Object.freeze({
    ...clone(template),
    directorSkill: VIDEO_MULTI_FRAMING_DIRECTOR_SKILLS[template.id] || VIDEO_MULTI_FRAMING_DIRECTOR_SKILLS.standard,
    stills: Object.freeze({ ...template.stills, shots: Object.freeze([...template.stills.shots]) }),
    moving: Object.freeze({ ...template.moving, shots: Object.freeze([...template.moving.shots]) })
  }))),
  directorNotes: Object.freeze({ ...a11Supplement.catalog.directorNotes }),
  aliasStillsNotes: Object.freeze({ ...a11Supplement.catalog.aliasStillsNotes }),
  controls: Object.freeze({
    ...clone(a11Supplement.catalog.controls),
    providers: Object.freeze(VIDEO_MULTI_FRAMING_ENGINES.map(({ id }) => id)),
    duration: Object.freeze({ ...a11Supplement.catalog.controls.duration, max: 30 })
  }),
  aiDirectionAvailable: false,
  referenceTransferAvailable: false
});

export const CINEMA_HELPER_CATALOG = Object.freeze({
  ...clone(cinemaHelperData),
  categories: Object.freeze(cinemaHelperData.categories.map((category) => Object.freeze({
    ...category, accepts: Object.freeze([...category.accepts])
  }))),
  groups: Object.freeze(cinemaHelperData.groups.map((group) => Object.freeze({ ...group }))),
  items: Object.freeze(cinemaHelperData.items.map((item) => Object.freeze({ ...item }))),
  negativePrompts: Object.freeze({ ...cinemaHelperData.negativePrompts })
});

export const IMAGE_SLICER_CATALOG = Object.freeze({
  formats: Object.freeze(["png", "jpeg", "webp"]),
  minimumGridSize: 1,
  maximumGridSize: 100,
  output: "source-folder-or-zip",
  processing: "local"
});

export const PAINT_STUDIO_CATALOG = Object.freeze({
  formats: Object.freeze(["png", "jpeg", "webp"]),
  canvasPresets: Object.freeze(["16:9", "9:16", "1:1", "3:2", "2:3"]),
  backgrounds: Object.freeze(["transparent", "black", "white", "custom"]),
  processing: "local"
});

export const IMAGE_GRABBER_CATALOG = Object.freeze({
  formats: Object.freeze(["png", "jpeg", "webp"]),
  minimumFps: 1,
  maximumFps: 240,
  processing: "local"
});

export const IMAGE_ANALYZER_CATALOG = Object.freeze({
  acceptedTypes: Object.freeze(["image/png", "image/jpeg", "image/webp", "image/gif"]),
  targets: Object.freeze(["apg", "cccp", "seedance"]),
  defaultModel: "gpt-4.1-mini",
  processing: "vision-api"
});

export const VIDEO_DIRECTOR_CATALOG = Object.freeze({
  acceptedTypes: Object.freeze(["video/*", "audio/mpeg", "audio/wav", "audio/x-wav"]),
  defaultModel: "gpt-4.1-mini",
  minimumFrameCount: 3,
  maximumFrameCount: 8,
  maximumWindowSeconds: 15,
  outputs: Object.freeze(["seedance", "kling", "minimax-h3", "flux-3", "wan-3", "negative", "transcript", "breakdown"]),
  processing: "local-ffmpeg-and-vision-api"
});

export const VIDEO_EDITOR_CATALOG = Object.freeze({
  source: "Library Editor 1.3.9",
  processing: "local-python-ffmpeg",
  features: Object.freeze(["multitrack", "composited-monitor", "effects", "masks", "keyframes", "ffmpeg-render"])
});

export const BLOCKING_STUDIO_CATALOG = Object.freeze({
  source: "assets/HTML/blocking-studio.html",
  processing: "local-threejs-and-onnx",
  autoBlocking: Object.freeze({
    geometry: "MoGe-2",
    detection: "OWLv2",
    segmentation: "MobileSAM",
    refinement: "reprojection"
  })
});

export const WORKFLOW_3D_CATALOG = Object.freeze({
  source: "assets/HTML/3D-IA-Workflow.html",
  outputs: Object.freeze([
    "image", "video", "transfer2d-0", "transfer2d-1", "transfer2d-2",
    "transfer2d-3", "transfer2d-4", "transfer2d-5"
  ]),
  processing: "local-prompt-workflow"
});

const beautyEntryById = new Map(BEAUTY_CATALOG.entries.map((entry) => [entry.id, entry]));
const beautyCategoryIds = new Set(BEAUTY_CATALOG.categories.map(({ id }) => id));
const realismCards = REALISM_CATALOG.tabs.flatMap(({ id: tabId, cards }) => cards.map((card) => ({ ...card, tabId })));
const realismCardById = new Map(realismCards.map((card) => [card.id, card]));
const realismTabIds = new Set(REALISM_CATALOG.tabs.map(({ id }) => id));
const realismSliderIds = new Set(REALISM_CATALOG.sliders.map(({ id }) => id));
const REALISM_DEFAULT_SLIDERS = Object.freeze({ flash: 10, grain: 30, dof: 30, wear: 0, imperf: 30 });
const cinematicPromptById = new Map(CINEMATIC_SHOOT_CATALOG.prompts.map((prompt) => [prompt.id, prompt]));
const cinematicFamilyIds = new Set(CINEMATIC_SHOOT_CATALOG.families.map(({ id }) => id));
const facsEntryById = new Map(FACS_CATALOG.entries.map((entry) => [entry.id, entry]));
const cameraCardByKey = new Map(CAMERA_SUITE_CATALOG.cards.map((card) => [card.key, card]));
const cameraSectionIds = new Set(CAMERA_SUITE_CATALOG.sections.map(({ id }) => id));
const CAMERA_DEFAULT_VARIANTS = Object.freeze(Object.fromEntries(CAMERA_SUITE_CATALOG.cards.map(({ key }) => [key, 2])));
const ccpTemplateByKey = new Map(CCP_CATALOG.templates.map((template) => [template.key, template]));
const ccpModeByStage = new Map(CCP_CATALOG.modes.map((mode) => [`${mode.stage}:${mode.mode}`, mode]));
const ccpStageIds = new Set(CCP_CATALOG.stages.map(({ id }) => id));
const sheetCardById = new Map(SHEET_CATALOG.cards.map((card) => [card.id, card]));
const sheetTabIds = new Set(SHEET_CATALOG.tabs.map(({ id }) => id));
const sheetBackgroundIds = new Set(Object.keys(SHEET_CATALOG.backgrounds));
const sheetWeaponByValue = new Map(SHEET_CATALOG.weapons.map((weapon) => [weapon.value, weapon]));
const sheetFacsById = new Map(SHEET_CATALOG.facs.map((entry) => [entry.id, entry]));
const designerCardById = new Map(DESIGNER_CATALOG.cards.map((card) => [card.id, card]));
const designerCategoryById = new Map(DESIGNER_CATALOG.categories.map((category) => [category.id, category]));
const designerTabIds = new Set(DESIGNER_CATALOG.categories.flatMap((category) => category.tabs.map(({ id }) => id)));
const designerColorByValue = new Map(DESIGNER_CATALOG.cards.flatMap((card) =>
  card.colors.map((color) => [`${card.id}:${color.hex}`, color])));
const knollingCardById = new Map(KNOLLING_CATALOG.cards.map((card) => [card.id, card]));
const knollingTabIds = new Set(KNOLLING_CATALOG.tabs.map(({ id }) => id));
const knollingExplorerIds = new Set(["var1", "var2", "var3"]);
const knollingZones = new Set(KNOLLING_CATALOG.controls.tattooZones);
const multishotCameraById = new Map(MULTISHOT_CATALOG.camera.map((entry) => [entry.id, entry]));
const multishotCardById = new Map(MULTISHOT_CATALOG.cards.map((card) => [card.id, card]));
const multishotTabIds = new Set(MULTISHOT_CATALOG.tabs);
const multishotOutputIds = new Set([
  ...multishotCameraById.keys(), ...multishotCardById.keys(), "multi-angle"
]);
const seedanceTemplateById = new Map(SEEDANCE_CATALOG.templates.map((template) => [template.id, template]));
const videoMultiFramingEngineById = new Map(VIDEO_MULTI_FRAMING_ENGINES.map((engine) => [engine.id, engine]));
const cinemaItemById = new Map(CINEMA_HELPER_CATALOG.items.map((item) => [item.id, item]));
const cinemaCategoryIds = new Set(CINEMA_HELPER_CATALOG.categories.map(({ id }) => id));
const CINEMA_COMPOSER_CATEGORIES = new Set([
  "camera-focal", "camera-models", "camera", "framing", "subjects", "action",
  "adjectives", "objects", "acting", "backgrounds", "lighting"
]);

export const DEFAULT_TOOL_CONFIGS = Object.freeze({
  apg: Object.freeze({
    intent: "",
    guide: "",
    outputType: "image",
    targetEngine: "General image/video generation",
    complexity: 6,
    absurdity: 5,
    model: "",
    prompt: "",
    weights: Object.freeze({}),
    enabled: Object.freeze({}),
    history: Object.freeze([])
  }),
  "barz-enhancer": Object.freeze({
    mode: "cards",
    selectedCardId: ENHANCER_CATALOG.cards[0].id,
    subject: "",
    preservationMode: "",
    selectedAngleIds: [],
    angleStudio: Object.freeze({ azimuth: 25, elevation: 8, distance: 4.5, focalLength: 50 }),
    relightingLights: Object.freeze([
      Object.freeze({ id: "light-1", type: "area", color: "#ffd2a1", intensity: 3.2, azimuth: -35, elevation: 35, distance: 4.5, size: 2.4, spread: 36 })
    ])
  }),
  "angle-3d": Object.freeze({
    mode: "angles",
    selectedCardId: ENHANCER_CATALOG.cards[0].id,
    subject: "",
    preservationMode: "",
    selectedAngleIds: [],
    angleStudio: Object.freeze({ azimuth: 25, elevation: 8, distance: 4.5, focalLength: 50 }),
    relightingLights: Object.freeze([
      Object.freeze({ id: "light-1", type: "area", color: "#ffd2a1", intensity: 3.2, azimuth: -35, elevation: 35, distance: 4.5, size: 2.4, spread: 36 })
    ])
  }),
  "relighting-3d": Object.freeze({
    mode: "relighting",
    selectedCardId: ENHANCER_CATALOG.cards[0].id,
    subject: "",
    preservationMode: "",
    selectedAngleIds: [],
    angleStudio: Object.freeze({ azimuth: 25, elevation: 8, distance: 4.5, focalLength: 50 }),
    relightingLights: Object.freeze([
      Object.freeze({ id: "light-1", type: "area", color: "#ffd2a1", intensity: 3.2, azimuth: -35, elevation: 35, distance: 4.5, size: 2.4, spread: 36 })
    ])
  }),
  imperfection: Object.freeze({
    state: clone(IMPERFECTION_CATALOG.defaults),
    customPresets: []
  }),
  "banana-helper": Object.freeze({
    activeCategory: GOODIES_CATALOG.categories[0].id,
    searchQuery: "",
    selectedEntryId: GOODIES_CATALOG.entries[0].id,
    detailsByPrompt: Object.freeze({})
  }),
  "mode-bank": Object.freeze({
    category: "exterior",
    group: "all",
    searchQuery: "",
    selectedId: "v03-ext-001",
    subjectMode: "original",
    puppetMode: false,
    useWardrobePrompt: false,
    favorites: Object.freeze([])
  }),
  "barz-beauty": Object.freeze({
    activeCategory: BEAUTY_CATALOG.categories[0].id,
    selectedEntryId: BEAUTY_CATALOG.entries[0].id
  }),
  "realism-forge": Object.freeze({
    activeTabId: REALISM_CATALOG.tabs[0].id,
    selectedCardId: REALISM_CATALOG.tabs[0].cards[0].id,
    description: "",
    celebrity: "",
    outfit: "",
    customOutfit: "",
    pose: "",
    customPose: "",
    location: "",
    customLocation: "",
    mood: "candid",
    slidersByCard: Object.freeze({})
  }),
  "cinematic-shoot": Object.freeze({
    activeFamilyId: "all",
    searchQuery: "",
    selectedPromptId: CINEMATIC_SHOOT_CATALOG.prompts[0].id,
    grid: Object.freeze({ cols: 3, rows: 3 }),
    characterMode: "puppet",
    detailsByPrompt: Object.freeze({}),
    matchShotOutfitByPrompt: Object.freeze({}),
    customPrompts: Object.freeze({})
  }),
  "facs-sheet-generator": Object.freeze({
    outputMode: "acting",
    searchQuery: "",
    selectedIds: Object.freeze([]),
    anchor: "[IMG_1], same character identity, same facial structure, same hairstyle, same proportions, photographed as a clean expression reference.",
    framing: "medium close-up portrait, soft frontal key light, neutral studio background, consistent lens and crop across every tile",
    wardrobe: "same simple wardrobe as the reference, no outfit changes",
    activeReferenceId: "builtin:normal",
    customCards: Object.freeze([]),
    customOutputs: Object.freeze({})
  }),
  "barzy-board": Object.freeze({
    activeTab: "story",
    story: Object.freeze({
      subject: "", refChar: "@image1", action: "", env: "", refEnv: "@image2", secondary: "",
      camera: BOARD_CATALOG.cameras[0], panels: "12", ratio: "16:9", drawingStyle: BOARD_CATALOG.drawingStyles[0],
      drawingNotes: "", drawingReference: "", finalBeat: "", annotations: true, facsCueIds: Object.freeze([])
    }),
    motion: Object.freeze({
      model: "seedance", refBoard: "@[storyboard ref]", refChar: "@image1", refEnv: "@image2",
      refSecondary: "@image3, @image4, @image5, @image6", duration: "15", pace: BOARD_CATALOG.paces[0],
      finalHold: "1", subject: "", secondary: "", action: "", env: "", camera: "", audio: "",
      facsMode: "inherit-story", facsCueIds: Object.freeze([])
    }),
    customOutputs: Object.freeze({})
  }),
  "veo-suite": Object.freeze({
    activeCardIds: Object.freeze([]),
    variantByCard: CAMERA_DEFAULT_VARIANTS,
    collapsedSectionIds: Object.freeze(CAMERA_SUITE_CATALOG.sections.map(({ id }) => id)),
    incoming: Object.freeze({ text: "", source: "" }),
    customPrompts: Object.freeze({})
  }),
  cccp: Object.freeze({
    grid: Object.freeze({ cols: 3, rows: 3 }),
    modes: Object.freeze({ a2: "puppet", b: "puppet", c: "puppet" }),
    scene: "",
    panelCode: "A1",
    iterationTake: 0,
    collapsedStageIds: Object.freeze(["a1", "a2", "b", "c"]),
    customOutputs: Object.freeze({})
  }),
  "barzy-sheet": Object.freeze({
    activeTab: a7Supplement.catalog.defaultState.tab,
    backgrounds: Object.freeze({ ...a7Supplement.catalog.defaultState.backgrounds }),
    weapon: a7Supplement.catalog.defaultState.weapon,
    facsIds: Object.freeze([...a7Supplement.catalog.defaultState.facs]),
    facsSearch: "",
    expandedCardIds: Object.freeze([]),
    customOutputs: Object.freeze({})
  }),
  "barz-designer": Object.freeze({
    activeCategory: a8Supplement.catalog.defaultState.activeCategory,
    activeTabs: Object.freeze({ ...a8Supplement.catalog.defaultState.activeTabs }),
    drawingWeight: a8Supplement.catalog.defaultState.drawingWeight,
    selectedColors: Object.freeze({
      "body-1": Object.freeze({ ...a8Supplement.catalog.defaultState.selectedColors["body-1"] })
    }),
    scene: "",
    expandedCardIds: Object.freeze([]),
    customOutputs: Object.freeze({})
  }),
  knolling: Object.freeze({
    activeTab: "generate",
    activeExplorerTab: "var1",
    lighting: a9Supplement.catalog.defaultState.lighting,
    multiReference: a9Supplement.catalog.defaultState.multiReference,
    accessory: a9Supplement.catalog.defaultState.accessory,
    subject: a9Supplement.catalog.defaultState.subject,
    tattooPlaceIt: a9Supplement.catalog.defaultState.tattooPlaceIt,
    tattooZones: Object.freeze([...a9Supplement.catalog.defaultState.tattooZones]),
    tattooBodyMode: a9Supplement.catalog.defaultState.tattooBodyMode,
    expandedCardIds: Object.freeze([]),
    customOutputs: Object.freeze({})
  }),
  multishot: Object.freeze({
    activeTab: "camera",
    cameraType: "all",
    cameraSearch: "",
    selectedCameraId: MULTISHOT_CATALOG.camera[0].id,
    selectedCardIds: Object.freeze({ multishot: "multishot-0", actionboard: "board-0" }),
    grid: Object.freeze({
      cols: a10Supplement.catalog.defaultState.cols,
      rows: a10Supplement.catalog.defaultState.rows
    }),
    hardFlashEnabled: a10Supplement.catalog.defaultState.hardFlashEnabled,
    subject: a10Supplement.catalog.defaultState.subject,
    expandedCardIds: Object.freeze([]),
    customOutputs: Object.freeze({})
  }),
  seedance: Object.freeze({
    ...clone(a11Supplement.catalog.defaultState),
    stillCount: 10,
    storyline: "",
    secondarySubjects: Object.freeze([]),
    secondaryContexts: Object.freeze([]),
    references: Object.freeze([]),
    finals: Object.freeze({})
  }),
  "cinema-helper": Object.freeze({
    activeCategory: "framing",
    searchQuery: "",
    deck: Object.freeze([]),
    favorites: Object.freeze([]),
    customPrompt: "",
    negativeMode: "realistic"
  }),
  "image-slicer": Object.freeze({
    columns: 3,
    rows: 3,
    format: "png",
    prefix: "slice",
    quality: 0.92
  }),
  "paint-studio": Object.freeze({
    canvasPreset: "16:9",
    background: "transparent",
    backgroundColor: "#ffffff",
    color: "#ff5b3a",
    strokeColor: "#ff5b3a",
    fillColor: "#F2ECCA",
    opacity: 1,
    strokeWidth: 3,
    fontFamily: "Arial",
    exportFormat: "png",
    exportQuality: 0.92
  }),
  "image-grabber": Object.freeze({
    fps: 30,
    exportFormat: "png",
    exportQuality: 0.92
  }),
  "image-analyzer": Object.freeze({
    model: IMAGE_ANALYZER_CATALOG.defaultModel,
    sendTarget: "apg"
  }),
  "video-director": Object.freeze({
    model: VIDEO_DIRECTOR_CATALOG.defaultModel,
    frameCount: 6,
    loop: false
  }),
  "motion-emulator": Object.freeze({}),
  "video-editor": Object.freeze({}),
  "blocking-studio": Object.freeze({}),
  "object-scale-chart": Object.freeze({
    aiModel: "",
    aiInstruction: ""
  }),
  "youtube-extractor": Object.freeze({}),
  "workflow-3d": Object.freeze({
    selectedOutput: "image",
    controls: Object.freeze({}),
    activeActions: Object.freeze([])
  })
});

const goodiesEntryById = new Map(GOODIES_CATALOG.entries.map((entry) => [entry.id, entry]));
const goodiesCategoryIds = new Set(GOODIES_CATALOG.categories.map(({ id }) => id));

export function validateGoodiesConfiguration(value) {
  const path = "configuration";
  exactKeys(value, new Set(["activeCategory", "searchQuery", "selectedEntryId", "detailsByPrompt"]), path);
  if (typeof value.activeCategory !== "string" || !goodiesCategoryIds.has(value.activeCategory)) fail("references an unknown category", `${path}.activeCategory`);
  if (typeof value.searchQuery !== "string" || value.searchQuery.length > 500) fail("must be text of at most 500 characters", `${path}.searchQuery`);
  if (typeof value.selectedEntryId !== "string" || !goodiesEntryById.has(value.selectedEntryId)) fail("references an unknown prompt", `${path}.selectedEntryId`);
  if (!plainObject(value.detailsByPrompt)) fail("must be an object", `${path}.detailsByPrompt`);
  const entries = Object.entries(value.detailsByPrompt);
  if (entries.length > GOODIES_CATALOG.entries.length) fail(`must contain at most ${GOODIES_CATALOG.entries.length} entries`, `${path}.detailsByPrompt`);
  for (const [entryId, detail] of entries) {
    if (!goodiesEntryById.has(entryId)) fail("references an unknown prompt", `${path}.detailsByPrompt.${entryId}`);
    if (typeof detail !== "string" || detail.length > 4_000) fail("must be text of at most 4000 characters", `${path}.detailsByPrompt.${entryId}`);
  }
  return value;
}

const rangeById = new Map(IMPERFECTION_CATALOG.ranges.map((range) => [range.id, range]));
const enumByStateId = new Map([
  ["device", IMPERFECTION_CATALOG.enums.find(({ id }) => id === "deviceType")],
  ["orbitDirection", IMPERFECTION_CATALOG.enums.find(({ id }) => id === "orbitDirection")],
  ["activityLevel", IMPERFECTION_CATALOG.enums.find(({ id }) => id === "activityLevel")]
]);

function validateStateGroup(group, defaults, path, { partial = false } = {}) {
  exactKeys(group, new Set(Object.keys(defaults)), path);
  for (const [key, defaultValue] of Object.entries(defaults)) {
    if (group[key] === undefined) {
      if (!partial) fail("is required", `${path}.${key}`);
      continue;
    }
    const value = group[key];
    if (typeof defaultValue === "boolean" && typeof value !== "boolean") fail("must be a boolean", `${path}.${key}`);
    if (typeof defaultValue === "number") {
      if (typeof value !== "number" || !Number.isFinite(value)) fail("must be a finite number", `${path}.${key}`);
      const range = rangeById.get(key);
      if (range && (value < range.min || value > range.max)) fail(`must be between ${range.min} and ${range.max}`, `${path}.${key}`);
    }
    if (typeof defaultValue === "string") {
      const enumeration = enumByStateId.get(key);
      const allowed = enumeration?.options.map(({ value: option }) => option) ?? [];
      if (typeof value !== "string" || !allowed.includes(value)) fail("uses an unsupported value", `${path}.${key}`);
    }
  }
  return group;
}

export function validateImperfectionState(value, { partial = false } = {}) {
  exactKeys(value, new Set(["sections", "camera", "human", "antiGlitch"]), "state");
  for (const groupName of ["sections", "camera", "human", "antiGlitch"]) {
    if (value[groupName] === undefined) {
      if (!partial) fail("is required", `state.${groupName}`);
      continue;
    }
    validateStateGroup(value[groupName], IMPERFECTION_CATALOG.defaults[groupName], `state.${groupName}`, { partial });
  }
  return value;
}

function validateCustomPreset(preset, index) {
  const path = `configuration.customPresets[${index}]`;
  exactKeys(preset, new Set(["id", "name", "state"]), path);
  if (typeof preset.id !== "string" || !/^preset-[a-z0-9][a-z0-9_-]{0,71}$/.test(preset.id)) fail("must be a stable preset ID", `${path}.id`);
  if (typeof preset.name !== "string" || preset.name.trim().length < 1 || preset.name.trim().length > 120) fail("must contain between 1 and 120 characters", `${path}.name`);
  validateImperfectionState(preset.state, { partial: true });
}

export function validateEnhancerConfiguration(value) {
  const path = "configuration";
  exactKeys(value, new Set(["mode", "selectedCardId", "subject", "preservationMode", "selectedAngleIds", "angleStudio", "relightingLights"]), path);
  if (!["cards", "angles", "relighting"].includes(value.mode)) fail("must be cards, angles or relighting", `${path}.mode`);
  if (!ENHANCER_CATALOG.cards.some(({ id }) => id === value.selectedCardId)) fail("references an unknown card", `${path}.selectedCardId`);
  if (typeof value.subject !== "string" || value.subject.length > 50_000) fail("must be text of at most 50000 characters", `${path}.subject`);
  if (!ENHANCER_CATALOG.preservationModes.some(({ value: mode }) => mode === value.preservationMode)) fail("uses an unknown preservation mode", `${path}.preservationMode`);
  if (!Array.isArray(value.selectedAngleIds) || new Set(value.selectedAngleIds).size !== value.selectedAngleIds.length) fail("must contain unique angle IDs", `${path}.selectedAngleIds`);
  const selectable = new Set(ENHANCER_CATALOG.angles.filter(({ selectable }) => selectable).map(({ id }) => id));
  if (value.selectedAngleIds.some((id) => !selectable.has(id))) fail("contains an unknown selectable angle", `${path}.selectedAngleIds`);
  if (value.angleStudio !== undefined) {
    exactKeys(value.angleStudio, new Set(["azimuth", "elevation", "distance", "focalLength"]), `${path}.angleStudio`);
    const ranges = { azimuth: [-180, 180], elevation: [-85, 85], distance: [2, 10], focalLength: [18, 135] };
    for (const [key, [min, max]] of Object.entries(ranges)) {
      const entry = value.angleStudio[key];
      if (typeof entry !== "number" || !Number.isFinite(entry) || entry < min || entry > max) {
        fail(`must be between ${min} and ${max}`, `${path}.angleStudio.${key}`);
      }
    }
  }
  if (value.relightingLights !== undefined) {
    if (!Array.isArray(value.relightingLights) || value.relightingLights.length > 8) fail("must contain at most 8 lights", `${path}.relightingLights`);
    const ids = new Set();
    value.relightingLights.forEach((light, index) => {
      const lightPath = `${path}.relightingLights[${index}]`;
      exactKeys(light, new Set(["id", "type", "color", "intensity", "azimuth", "elevation", "distance", "size", "spread"]), lightPath);
      if (typeof light.id !== "string" || !/^light-[a-z0-9-]{1,40}$/.test(light.id) || ids.has(light.id)) fail("must use a unique light ID", `${lightPath}.id`);
      ids.add(light.id);
      if (!["point", "area", "sun", "spot"].includes(light.type)) fail("uses an unsupported light type", `${lightPath}.type`);
      if (typeof light.color !== "string" || !/^#[0-9a-f]{6}$/i.test(light.color)) fail("must be a hexadecimal color", `${lightPath}.color`);
      const ranges = { intensity: [0, 20], azimuth: [-180, 180], elevation: [-85, 85], distance: [1, 12], size: [0.25, 8], spread: [5, 90] };
      for (const [key, [min, max]] of Object.entries(ranges)) {
        const entry = light[key];
        if (typeof entry !== "number" || !Number.isFinite(entry) || entry < min || entry > max) fail(`must be between ${min} and ${max}`, `${lightPath}.${key}`);
      }
    });
  }
  return value;
}

export function validateBeautyConfiguration(value) {
  const path = "configuration";
  exactKeys(value, new Set(["activeCategory", "selectedEntryId"]), path);
  if (!beautyCategoryIds.has(value.activeCategory)) fail("references an unknown category", `${path}.activeCategory`);
  const entry = beautyEntryById.get(value.selectedEntryId);
  if (!entry) fail("references an unknown prompt", `${path}.selectedEntryId`);
  if (entry.categoryId !== value.activeCategory) fail("must belong to the active category", `${path}.selectedEntryId`);
  return value;
}

function validateChoice(value, values, path, { custom = false } = {}) {
  const allowed = new Set(values.map(({ v }) => v));
  if (custom) allowed.add("_custom");
  if (typeof value !== "string" || (!allowed.has(value) && value !== "")) fail("uses an unknown choice", path);
}

export function validateRealismConfiguration(value) {
  const path = "configuration";
  exactKeys(value, new Set([
    "activeTabId", "selectedCardId", "description", "celebrity", "outfit", "customOutfit",
    "pose", "customPose", "location", "customLocation", "mood", "slidersByCard"
  ]), path);
  if (!realismTabIds.has(value.activeTabId)) fail("references an unknown tab", `${path}.activeTabId`);
  const card = realismCardById.get(value.selectedCardId);
  if (!card) fail("references an unknown card", `${path}.selectedCardId`);
  if (card.tabId !== value.activeTabId) fail("must belong to the active tab", `${path}.selectedCardId`);
  for (const key of ["description", "customOutfit", "customPose", "customLocation"]) {
    if (typeof value[key] !== "string" || value[key].length > 50_000) fail("must be text of at most 50000 characters", `${path}.${key}`);
  }
  const celebrities = [...REALISM_CATALOG.celebrities.female, ...REALISM_CATALOG.celebrities.male].map((entry) => ({ v: entry.v ?? entry }));
  validateChoice(value.celebrity, celebrities, `${path}.celebrity`);
  validateChoice(value.outfit, REALISM_CATALOG.controls.outfits, `${path}.outfit`, { custom: true });
  validateChoice(value.pose, REALISM_CATALOG.controls.poses, `${path}.pose`, { custom: true });
  validateChoice(value.location, REALISM_CATALOG.controls.locations, `${path}.location`, { custom: true });
  validateChoice(value.mood, REALISM_CATALOG.controls.moods, `${path}.mood`);
  exactKeys(value.slidersByCard, new Set(realismCardById.keys()), `${path}.slidersByCard`);
  for (const [cardId, sliders] of Object.entries(value.slidersByCard)) {
    exactKeys(sliders, realismSliderIds, `${path}.slidersByCard.${cardId}`);
    for (const sliderId of realismSliderIds) {
      if (!Number.isFinite(sliders[sliderId]) || sliders[sliderId] < 0 || sliders[sliderId] > 100) {
        fail("must be a number between 0 and 100", `${path}.slidersByCard.${cardId}.${sliderId}`);
      }
    }
  }
  return value;
}

function validateCinematicPromptMap(value, path, validator) {
  exactKeys(value, new Set(cinematicPromptById.keys()), path);
  for (const [promptId, entry] of Object.entries(value)) validator(entry, `${path}.${promptId}`);
}

export function validateCinematicShootConfiguration(value) {
  const path = "configuration";
  exactKeys(value, new Set([
    "activeFamilyId", "searchQuery", "selectedPromptId", "grid", "characterMode",
    "detailsByPrompt", "matchShotOutfitByPrompt", "customPrompts"
  ]), path);
  if (!cinematicFamilyIds.has(value.activeFamilyId)) fail("references an unknown family", `${path}.activeFamilyId`);
  if (typeof value.searchQuery !== "string" || value.searchQuery.length > 500) fail("must be text of at most 500 characters", `${path}.searchQuery`);
  if (!cinematicPromptById.has(value.selectedPromptId)) fail("references an unknown prompt", `${path}.selectedPromptId`);
  exactKeys(value.grid, new Set(["cols", "rows"]), `${path}.grid`);
  for (const key of ["cols", "rows"]) {
    if (!Number.isSafeInteger(value.grid[key]) || value.grid[key] < 2 || value.grid[key] > 4) {
      fail("must be an integer between 2 and 4", `${path}.grid.${key}`);
    }
  }
  if (!["puppet", "human"].includes(value.characterMode)) fail("must be puppet or human", `${path}.characterMode`);
  validateCinematicPromptMap(value.detailsByPrompt, `${path}.detailsByPrompt`, (entry, entryPath) => {
    if (typeof entry !== "string" || entry.length > 4_000) fail("must be text of at most 4000 characters", entryPath);
  });
  validateCinematicPromptMap(value.matchShotOutfitByPrompt, `${path}.matchShotOutfitByPrompt`, (entry, entryPath) => {
    if (typeof entry !== "boolean") fail("must be a boolean", entryPath);
  });
  validateCinematicPromptMap(value.customPrompts, `${path}.customPrompts`, (entry, entryPath) => {
    if (typeof entry !== "string" || entry.length > 40_000) fail("must be text of at most 40000 characters", entryPath);
  });
  return value;
}

function validateText(value, path, max = 50_000) {
  if (typeof value !== "string" || value.length > max) fail(`must be text of at most ${max} characters`, path);
}

function validateFacsIds(value, path) {
  if (!Array.isArray(value) || new Set(value).size !== value.length) fail("must contain unique FACS IDs", path);
  if (value.some((id) => !facsEntryById.has(id))) fail("contains an unknown FACS ID", path);
}

function validateCustomOutputs(value, path) {
  if (!plainObject(value)) fail("must be an object", path);
  if (Object.keys(value).length > 60) fail("must contain at most 60 outputs", path);
  for (const [id, prompt] of Object.entries(value)) {
    if (!/^[a-z0-9][a-z0-9_-]{0,79}$/.test(id)) fail("uses an invalid output ID", `${path}.${id}`);
    validateText(prompt, `${path}.${id}`, 100_000);
  }
}

export function validateFacsSheetConfiguration(value) {
  const path = "configuration";
  exactKeys(value, new Set(["outputMode", "searchQuery", "selectedIds", "anchor", "framing", "wardrobe", "activeReferenceId", "customCards", "customOutputs"]), path);
  if (!["acting", "portraits", "full-board"].includes(value.outputMode)) fail("must be acting, portraits, or full-board", `${path}.outputMode`);
  validateText(value.searchQuery, `${path}.searchQuery`, 500);
  validateFacsIds(value.selectedIds, `${path}.selectedIds`);
  for (const key of ["anchor", "framing", "wardrobe"]) validateText(value[key], `${path}.${key}`, 50_000);
  validateText(value.activeReferenceId, `${path}.activeReferenceId`, 100);
  if (!Array.isArray(value.customCards) || value.customCards.length > 12) fail("must contain at most 12 personal sheets", `${path}.customCards`);
  value.customCards.forEach((card, index) => {
    const cardPath = `${path}.customCards[${index}]`;
    exactKeys(card, new Set(["id", "name", "boardDataUrl", "cropVersion", "createdAt", "sourceName", "mapping"]), cardPath);
    if (typeof card.id !== "string" || !/^facs-card-[a-z0-9_-]{8,64}$/.test(card.id)) fail("must be a stable card ID", `${cardPath}.id`);
    validateText(card.name, `${cardPath}.name`, 120);
    if (typeof card.boardDataUrl !== "string" || !/^data:image\/(?:png|jpeg|webp);base64,/i.test(card.boardDataUrl) || card.boardDataUrl.length > 2_500_000) fail("must be an embedded PNG, JPEG or WebP under 2.5 MB", `${cardPath}.boardDataUrl`);
    if (card.cropVersion !== FACS_CATALOG.crop.version) fail("uses an unsupported crop version", `${cardPath}.cropVersion`);
    validateText(card.createdAt, `${cardPath}.createdAt`, 40);
    validateText(card.sourceName, `${cardPath}.sourceName`, 260);
    if (!Array.isArray(card.mapping) || card.mapping.length !== 49 || card.mapping.some((id, position) => id !== FACS_CATALOG.entries[position].id)) {
      fail("must preserve the canonical 49-position mapping", `${cardPath}.mapping`);
    }
  });
  if (new Set(value.customCards.map(({ id }) => id)).size !== value.customCards.length) fail("must use unique card IDs", `${path}.customCards`);
  if (!["builtin:normal", "builtin:chubby", "builtin:giscard"].includes(value.activeReferenceId)
      && !value.customCards.some(({ id }) => id === value.activeReferenceId)) fail("references an unknown personal sheet", `${path}.activeReferenceId`);
  validateCustomOutputs(value.customOutputs, `${path}.customOutputs`);
  return value;
}

function validateBoardSectionText(section, keys, path) {
  for (const key of keys) validateText(section[key], `${path}.${key}`, 50_000);
}

export function validateBoardConfiguration(value) {
  const path = "configuration";
  exactKeys(value, new Set(["activeTab", "story", "motion", "customOutputs"]), path);
  if (!["story", "motion"].includes(value.activeTab)) fail("must be story or motion", `${path}.activeTab`);
  exactKeys(value.story, new Set(["subject", "refChar", "action", "env", "refEnv", "secondary", "camera", "panels", "ratio", "drawingStyle", "drawingNotes", "drawingReference", "finalBeat", "annotations", "facsCueIds"]), `${path}.story`);
  validateBoardSectionText(value.story, ["subject", "refChar", "action", "env", "refEnv", "secondary", "drawingNotes", "drawingReference", "finalBeat"], `${path}.story`);
  if (!BOARD_CATALOG.cameras.includes(value.story.camera)) fail("uses an unknown camera language", `${path}.story.camera`);
  if (!BOARD_CATALOG.panels.includes(value.story.panels)) fail("uses an unknown panel count", `${path}.story.panels`);
  if (!BOARD_CATALOG.ratios.includes(value.story.ratio)) fail("uses an unknown ratio", `${path}.story.ratio`);
  if (!BOARD_CATALOG.drawingStyles.includes(value.story.drawingStyle)) fail("uses an unknown drawing style", `${path}.story.drawingStyle`);
  if (typeof value.story.annotations !== "boolean") fail("must be a boolean", `${path}.story.annotations`);
  validateFacsIds(value.story.facsCueIds, `${path}.story.facsCueIds`);
  exactKeys(value.motion, new Set(["model", "refBoard", "refChar", "refEnv", "refSecondary", "duration", "pace", "finalHold", "subject", "secondary", "action", "env", "camera", "audio", "facsMode", "facsCueIds"]), `${path}.motion`);
  validateBoardSectionText(value.motion, ["refBoard", "refChar", "refEnv", "refSecondary", "finalHold", "subject", "secondary", "action", "env", "camera", "audio"], `${path}.motion`);
  if (!BOARD_CATALOG.models.includes(value.motion.model)) fail("uses an unknown target model", `${path}.motion.model`);
  if (!BOARD_CATALOG.durations.includes(value.motion.duration)) fail("uses an unknown duration", `${path}.motion.duration`);
  if (!BOARD_CATALOG.paces.includes(value.motion.pace)) fail("uses an unknown pace", `${path}.motion.pace`);
  if (!["inherit-story", "custom"].includes(value.motion.facsMode)) fail("must be inherit-story or custom", `${path}.motion.facsMode`);
  validateFacsIds(value.motion.facsCueIds, `${path}.motion.facsCueIds`);
  validateCustomOutputs(value.customOutputs, `${path}.customOutputs`);
  return value;
}

export function validateCameraSuiteConfiguration(value) {
  const path = "configuration";
  exactKeys(value, new Set(["activeCardIds", "variantByCard", "collapsedSectionIds", "incoming", "customPrompts"]), path);
  if (!Array.isArray(value.activeCardIds) || new Set(value.activeCardIds).size !== value.activeCardIds.length) {
    fail("must contain unique camera card IDs", `${path}.activeCardIds`);
  }
  if (value.activeCardIds.some((id) => !cameraCardByKey.has(id))) fail("contains an unknown camera card ID", `${path}.activeCardIds`);
  if (!plainObject(value.variantByCard)) fail("must be an object", `${path}.variantByCard`);
  if (Object.keys(value.variantByCard).length !== CAMERA_SUITE_CATALOG.cards.length ||
      CAMERA_SUITE_CATALOG.cards.some(({ key }) => !Object.hasOwn(value.variantByCard, key))) {
    fail("must contain every camera card exactly once", `${path}.variantByCard`);
  }
  for (const [key, variant] of Object.entries(value.variantByCard)) {
    if (!cameraCardByKey.has(key)) fail("contains an unknown camera card ID", `${path}.variantByCard.${key}`);
    if (!Number.isInteger(variant) || variant < 0 || variant > 4) fail("must be an integer between 0 and 4", `${path}.variantByCard.${key}`);
  }
  if (!Array.isArray(value.collapsedSectionIds) || new Set(value.collapsedSectionIds).size !== value.collapsedSectionIds.length) {
    fail("must contain unique section IDs", `${path}.collapsedSectionIds`);
  }
  if (value.collapsedSectionIds.some((id) => !cameraSectionIds.has(id))) fail("contains an unknown section ID", `${path}.collapsedSectionIds`);
  exactKeys(value.incoming, new Set(["text", "source"]), `${path}.incoming`);
  validateText(value.incoming.text, `${path}.incoming.text`, 100_000);
  validateText(value.incoming.source, `${path}.incoming.source`, 200);
  if (!plainObject(value.customPrompts)) fail("must be an object", `${path}.customPrompts`);
  if (Object.keys(value.customPrompts).length > 110) fail("must contain at most 110 custom prompts", `${path}.customPrompts`);
  const variantIds = new Set(CAMERA_SUITE_CATALOG.cards.flatMap(({ variants }) => variants.map(({ id }) => id)));
  for (const [id, prompt] of Object.entries(value.customPrompts)) {
    if (!variantIds.has(id)) fail("references an unknown camera variant", `${path}.customPrompts.${id}`);
    validateText(prompt, `${path}.customPrompts.${id}`, 100_000);
  }
  return value;
}

export function ccpGridInfo(grid) {
  const path = "configuration.grid";
  exactKeys(grid, new Set(["cols", "rows"]), path);
  for (const key of ["cols", "rows"]) {
    if (!Number.isInteger(grid[key]) || grid[key] < 2 || grid[key] > 4) {
      fail("must be an integer between 2 and 4", `${path}.${key}`);
    }
  }
  const codes = Array.from({ length: grid.rows }, (_, row) =>
    Array.from({ length: grid.cols }, (_, col) => `${String.fromCharCode(65 + row)}${col + 1}`)
  ).flat();
  return { spec: `${grid.cols}x${grid.rows}`, total: codes.length, codes, last: codes.at(-1) };
}

export function validateCcpConfiguration(value) {
  const path = "configuration";
  exactKeys(value, new Set(["grid", "modes", "scene", "panelCode", "iterationTake", "collapsedStageIds", "customOutputs"]), path);
  ccpGridInfo(value.grid);
  exactKeys(value.modes, new Set(["a2", "b", "c"]), `${path}.modes`);
  for (const stage of ["a2", "b", "c"]) {
    if (!['puppet', 'human'].includes(value.modes[stage])) fail("must be puppet or human", `${path}.modes.${stage}`);
  }
  validateText(value.scene, `${path}.scene`, 50_000);
  validateText(value.panelCode, `${path}.panelCode`, 16);
  if (!Number.isSafeInteger(value.iterationTake) || value.iterationTake < 0) fail("must be a non-negative safe integer", `${path}.iterationTake`);
  if (!Array.isArray(value.collapsedStageIds) || new Set(value.collapsedStageIds).size !== value.collapsedStageIds.length) {
    fail("must contain unique stage IDs", `${path}.collapsedStageIds`);
  }
  if (value.collapsedStageIds.some((id) => !ccpStageIds.has(id))) fail("contains an unknown stage ID", `${path}.collapsedStageIds`);
  validateCustomOutputs(value.customOutputs, `${path}.customOutputs`);
  for (const key of Object.keys(value.customOutputs)) {
    if (!ccpStageIds.has(key)) fail("references an unknown stage", `${path}.customOutputs.${key}`);
  }
  return value;
}

export function validateSheetConfiguration(value) {
  const path = "configuration";
  exactKeys(value, new Set(["activeTab", "backgrounds", "weapon", "facsIds", "facsSearch", "expandedCardIds", "customOutputs"]), path);
  if (!sheetTabIds.has(value.activeTab)) fail("references an unknown tab", `${path}.activeTab`);
  exactKeys(value.backgrounds, new Set(SHEET_CATALOG.cards.map(({ id }) => id)), `${path}.backgrounds`);
  for (const card of SHEET_CATALOG.cards) {
    if (!sheetBackgroundIds.has(value.backgrounds[card.id])) fail("references an unknown background", `${path}.backgrounds.${card.id}`);
  }
  if (!sheetWeaponByValue.has(value.weapon)) fail("references an unknown pose mode", `${path}.weapon`);
  if (!Array.isArray(value.facsIds) || value.facsIds.length > 8 || new Set(value.facsIds).size !== value.facsIds.length) {
    fail("must contain zero to eight unique FACS IDs", `${path}.facsIds`);
  }
  if (value.facsIds.some((id) => !sheetFacsById.has(id))) fail("contains an unknown FACS ID", `${path}.facsIds`);
  validateText(value.facsSearch, `${path}.facsSearch`, 500);
  if (!Array.isArray(value.expandedCardIds) || new Set(value.expandedCardIds).size !== value.expandedCardIds.length) {
    fail("must contain unique card IDs", `${path}.expandedCardIds`);
  }
  if (value.expandedCardIds.some((id) => !sheetCardById.has(id))) fail("contains an unknown card ID", `${path}.expandedCardIds`);
  validateCustomOutputs(value.customOutputs, `${path}.customOutputs`);
  for (const key of Object.keys(value.customOutputs)) {
    if (!sheetCardById.has(key)) fail("references an unknown card", `${path}.customOutputs.${key}`);
  }
  return value;
}

export function validateDesignerConfiguration(value) {
  const path = "configuration";
  exactKeys(value, new Set(["activeCategory", "activeTabs", "drawingWeight", "selectedColors", "scene", "expandedCardIds", "customOutputs"]), path);
  if (!designerCategoryById.has(value.activeCategory)) fail("references an unknown category", `${path}.activeCategory`);
  exactKeys(value.activeTabs, new Set(["sketch"]), `${path}.activeTabs`);
  if (!designerTabIds.has(value.activeTabs.sketch)) fail("references an unknown tab", `${path}.activeTabs.sketch`);
  if (!Number.isSafeInteger(value.drawingWeight) || value.drawingWeight < 20 || value.drawingWeight > 95 || value.drawingWeight % 5 !== 0) {
    fail("must be an integer from 20 to 95 in steps of 5", `${path}.drawingWeight`);
  }
  exactKeys(value.selectedColors, new Set(["body-1"]), `${path}.selectedColors`);
  const color = value.selectedColors["body-1"];
  exactKeys(color, new Set(["name", "hex"]), `${path}.selectedColors.body-1`);
  const knownColor = designerColorByValue.get(`body-1:${color.hex}`);
  if (!knownColor || knownColor.name !== color.name) fail("references an unknown color", `${path}.selectedColors.body-1`);
  validateText(value.scene, `${path}.scene`, 50_000);
  if (!Array.isArray(value.expandedCardIds) || new Set(value.expandedCardIds).size !== value.expandedCardIds.length) {
    fail("must contain unique card IDs", `${path}.expandedCardIds`);
  }
  if (value.expandedCardIds.some((id) => !designerCardById.has(id))) fail("contains an unknown card ID", `${path}.expandedCardIds`);
  validateCustomOutputs(value.customOutputs, `${path}.customOutputs`);
  for (const key of Object.keys(value.customOutputs)) {
    if (!designerCardById.has(key)) fail("references an unknown card", `${path}.customOutputs.${key}`);
  }
  return value;
}

export function validateKnollingConfiguration(value) {
  const path = "configuration";
  exactKeys(value, new Set([
    "activeTab", "activeExplorerTab", "lighting", "multiReference", "accessory", "subject",
    "tattooPlaceIt", "tattooZones", "tattooBodyMode", "expandedCardIds", "customOutputs"
  ]), path);
  if (!knollingTabIds.has(value.activeTab)) fail("references an unknown tab", `${path}.activeTab`);
  if (!knollingExplorerIds.has(value.activeExplorerTab)) {
    fail("references an unknown Explorer tab", `${path}.activeExplorerTab`);
  }
  for (const key of ["lighting", "multiReference", "accessory", "subject", "tattooPlaceIt", "tattooBodyMode"]) {
    if (!KNOLLING_CATALOG.controls[key].includes(value[key])) fail("has an unsupported value", `${path}.${key}`);
  }
  if (!Array.isArray(value.tattooZones) || value.tattooZones.length > 19
      || new Set(value.tattooZones).size !== value.tattooZones.length) {
    fail("must contain at most 19 unique zones in selection order", `${path}.tattooZones`);
  }
  if (value.tattooZones.some((zone) => !knollingZones.has(zone))) {
    fail("contains an unknown tattoo zone", `${path}.tattooZones`);
  }
  if (!Array.isArray(value.expandedCardIds)
      || new Set(value.expandedCardIds).size !== value.expandedCardIds.length) {
    fail("must contain unique card IDs", `${path}.expandedCardIds`);
  }
  if (value.expandedCardIds.some((id) => !knollingCardById.has(id))) {
    fail("contains an unknown card ID", `${path}.expandedCardIds`);
  }
  validateCustomOutputs(value.customOutputs, `${path}.customOutputs`);
  for (const key of Object.keys(value.customOutputs)) {
    if (!knollingCardById.has(key)) fail("references an unknown card", `${path}.customOutputs.${key}`);
  }
  return value;
}

export function validateMultishotConfiguration(value) {
  const path = "configuration";
  exactKeys(value, new Set([
    "activeTab", "cameraType", "cameraSearch", "selectedCameraId", "selectedCardIds",
    "grid", "hardFlashEnabled", "subject", "expandedCardIds", "customOutputs"
  ]), path);
  if (!multishotTabIds.has(value.activeTab)) {
    fail("references an unknown tab", `${path}.activeTab`);
  }
  if (!["all", "Shots", "Movements"].includes(value.cameraType)) {
    fail("has an unsupported value", `${path}.cameraType`);
  }
  validateText(value.cameraSearch, `${path}.cameraSearch`, 500);
  if (!multishotCameraById.has(value.selectedCameraId)) {
    fail("references an unknown camera", `${path}.selectedCameraId`);
  }
  exactKeys(value.selectedCardIds, new Set(["multishot", "actionboard"]),
    `${path}.selectedCardIds`);
  for (const tabId of ["multishot", "actionboard"]) {
    if (tabId === "multishot" && value.selectedCardIds[tabId] === "multi-angle") continue;
    const card = multishotCardById.get(value.selectedCardIds[tabId]);
    if (!card || card.tab !== tabId) {
      fail("references an unknown card for this tab", `${path}.selectedCardIds.${tabId}`);
    }
  }
  exactKeys(value.grid, new Set(["cols", "rows"]), `${path}.grid`);
  for (const axis of ["cols", "rows"]) {
    if (!Number.isInteger(value.grid[axis]) || value.grid[axis] < 2 || value.grid[axis] > 4) {
      fail("must be an integer from 2 to 4", `${path}.grid.${axis}`);
    }
  }
  if (typeof value.hardFlashEnabled !== "boolean") {
    fail("must be a boolean", `${path}.hardFlashEnabled`);
  }
  validateText(value.subject, `${path}.subject`, 50_000);
  if (!Array.isArray(value.expandedCardIds)
      || new Set(value.expandedCardIds).size !== value.expandedCardIds.length) {
    fail("must contain unique card IDs", `${path}.expandedCardIds`);
  }
  if (value.expandedCardIds.some((id) => id !== "multi-angle" && !multishotCardById.has(id))) {
    fail("contains an unknown card ID", `${path}.expandedCardIds`);
  }
  validateCustomOutputs(value.customOutputs, `${path}.customOutputs`);
  for (const key of Object.keys(value.customOutputs)) {
    if (!multishotOutputIds.has(key)) {
      fail("references an unknown output", `${path}.customOutputs.${key}`);
    }
  }
  return value;
}

function seedanceFinalKeyIsValid(key) {
  return /^[a-z0-9_-]+__(?:stills|moving|multiview)__(?:kling|seedance|minimax-h3|flux-3|wan)__(?:all|still-(?:[1-9]|[12]\d|30))$/.test(key);
}

export function seedanceFinalKey(configuration, outputId = "all") {
  return `${configuration.templateId}__${configuration.mode}__${configuration.provider}__${outputId}`;
}

export function validateSeedanceConfiguration(value) {
  const path = "configuration";
  exactKeys(value, new Set([
    "templateId", "mode", "provider", "duration", "shotCount", "stillCount", "charLimit", "style",
    "subject", "context", "actionDirection", "storyline", "secondarySubjects", "secondaryContexts", "references", "finals"
  ]), path);
  if (!seedanceTemplateById.has(value.templateId)) fail("references an unknown director template", `${path}.templateId`);
  if (!["stills", "moving", "multiview"].includes(value.mode)) fail("must be stills, moving or multiview", `${path}.mode`);
  const engine = videoMultiFramingEngineById.get(value.provider);
  if (!engine) fail("uses an unsupported provider dialect", `${path}.provider`);
  if (!Number.isInteger(value.duration) || value.duration < 1 || value.duration > engine.maxDuration) {
    fail(`must be an integer from 1 to ${engine.maxDuration} for ${engine.label}`, `${path}.duration`);
  }
  const shotMaximum = value.mode === "multiview" && ["seedance", "wan"].includes(value.provider) ? 60 : 30;
  if (!Number.isInteger(value.shotCount) || value.shotCount < 1 || value.shotCount > shotMaximum) fail(`must be an integer from 1 to ${shotMaximum}`, `${path}.shotCount`);
  if (value.stillCount !== undefined && (!Number.isInteger(value.stillCount) || value.stillCount < 1 || value.stillCount > 30)) fail("must be an integer from 1 to 30", `${path}.stillCount`);
  if (!Number.isInteger(value.charLimit) || value.charLimit < 300 || value.charLimit > 20_000) fail("must be an integer from 300 to 20000", `${path}.charLimit`);
  for (const key of ["style", "subject", "context", "actionDirection", "storyline"]) validateText(value[key], `${path}.${key}`, 50_000);
  for (const key of ["secondarySubjects", "secondaryContexts"]) {
    if (!Array.isArray(value[key]) || value[key].length > 8) fail("must contain at most eight entries", `${path}.${key}`);
    value[key].forEach((entry, index) => validateText(entry, `${path}.${key}[${index}]`, 50_000));
  }
  if (!Array.isArray(value.references) || value.references.length > 9) fail("must contain at most nine references", `${path}.references`);
  const slots = new Set();
  value.references.forEach((reference, index) => {
    const referencePath = `${path}.references[${index}]`;
    exactKeys(reference, new Set(["slot", "imageId", "sourceName", "dataUrl", "subject", "context"]), referencePath);
    if (!Number.isInteger(reference.slot) || reference.slot < 1 || reference.slot > 9) fail("must be an integer from 1 to 9", `${referencePath}.slot`);
    if (slots.has(reference.slot)) fail("must use a unique slot", `${referencePath}.slot`);
    slots.add(reference.slot);
    for (const key of ["imageId", "sourceName", "subject", "context"]) validateText(reference[key], `${referencePath}.${key}`, key === "sourceName" ? 260 : 50_000);
    if (typeof reference.dataUrl !== "string" || !/^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(reference.dataUrl) || reference.dataUrl.length > 10_000_000) {
      fail("must be an embedded PNG, JPEG, WebP or GIF under 10 MB", `${referencePath}.dataUrl`);
    }
  });
  if (!plainObject(value.finals) || Object.keys(value.finals).length > 1_000) fail("must contain at most 1000 saved finals", `${path}.finals`);
  for (const [key, prompt] of Object.entries(value.finals)) {
    if (!seedanceFinalKeyIsValid(key) || !seedanceTemplateById.has(key.split("__")[0])) fail("uses an unknown final key", `${path}.finals.${key}`);
    validateText(prompt, `${path}.finals.${key}`, 100_000);
  }
  return value;
}

function validateCinemaEntry(value, path) {
  exactKeys(value, new Set(["itemId", "item", "category", "copyText"]), path);
  if (typeof value.itemId !== "string" || !cinemaItemById.has(value.itemId)) fail("references an unknown Cinema Helper item", `${path}.itemId`);
  const item = cinemaItemById.get(value.itemId);
  validateText(value.item, `${path}.item`, 500);
  validateText(value.category, `${path}.category`, 80);
  validateText(value.copyText, `${path}.copyText`, 100_000);
  if (value.item !== item.label || value.category !== item.category) fail("does not match its stable catalog item", path);
}

export function validateCinemaHelperConfiguration(value) {
  const path = "configuration";
  exactKeys(value, new Set(["activeCategory", "searchQuery", "deck", "favorites", "customPrompt", "negativeMode"]), path);
  if (!cinemaCategoryIds.has(value.activeCategory)) fail("references an unknown category", `${path}.activeCategory`);
  validateText(value.searchQuery, `${path}.searchQuery`, 500);
  if (!Array.isArray(value.deck) || value.deck.length > CINEMA_HELPER_CATALOG.deckLimit) {
    fail(`must contain at most ${CINEMA_HELPER_CATALOG.deckLimit} entries`, `${path}.deck`);
  }
  value.deck.forEach((entry, index) => validateCinemaEntry(entry, `${path}.deck[${index}]`));
  if (new Set(value.deck.map(({ itemId }) => itemId)).size !== value.deck.length) fail("must use unique item IDs", `${path}.deck`);
  if (!Array.isArray(value.favorites) || value.favorites.length > CINEMA_HELPER_CATALOG.items.length) fail("contains too many favorites", `${path}.favorites`);
  value.favorites.forEach((entry, index) => validateCinemaEntry(entry, `${path}.favorites[${index}]`));
  if (new Set(value.favorites.map(({ itemId }) => itemId)).size !== value.favorites.length) fail("must use unique item IDs", `${path}.favorites`);
  validateText(value.customPrompt, `${path}.customPrompt`, 100_000);
  if (!Object.hasOwn(CINEMA_HELPER_CATALOG.negativePrompts, value.negativeMode)) fail("uses an unknown negative prompt", `${path}.negativeMode`);
  return value;
}

export function validateImageSlicerConfiguration(value) {
  const path = "configuration";
  exactKeys(value, new Set(["columns", "rows", "format", "prefix", "quality"]), path);
  for (const key of ["columns", "rows"]) {
    if (!Number.isInteger(value[key]) || value[key] < IMAGE_SLICER_CATALOG.minimumGridSize
      || value[key] > IMAGE_SLICER_CATALOG.maximumGridSize) {
      fail(`must be an integer from ${IMAGE_SLICER_CATALOG.minimumGridSize} to ${IMAGE_SLICER_CATALOG.maximumGridSize}`, `${path}.${key}`);
    }
  }
  if (!IMAGE_SLICER_CATALOG.formats.includes(value.format)) {
    fail("uses an unsupported image format", `${path}.format`);
  }
  validateText(value.prefix, `${path}.prefix`, 80);
  if (typeof value.quality !== "number" || value.quality < 0.1 || value.quality > 1) {
    fail("must be a number from 0.1 to 1", `${path}.quality`);
  }
  return value;
}

export function validatePaintStudioConfiguration(value) {
  const path = "configuration";
  exactKeys(value, new Set([
    "canvasPreset", "background", "backgroundColor", "color", "strokeColor", "fillColor", "opacity", "strokeWidth",
    "fontFamily", "exportFormat", "exportQuality"
  ]), path);
  if (!PAINT_STUDIO_CATALOG.canvasPresets.includes(value.canvasPreset)) fail("uses an unsupported canvas preset", `${path}.canvasPreset`);
  if (!PAINT_STUDIO_CATALOG.backgrounds.includes(value.background)) fail("uses an unsupported background", `${path}.background`);
  if (typeof value.backgroundColor !== "string" || !/^#[0-9a-f]{6}$/i.test(value.backgroundColor)) fail("must be a six-digit hex color", `${path}.backgroundColor`);
  if (typeof value.color !== "string" || !/^#[0-9a-f]{6}$/i.test(value.color)) fail("must be a six-digit hex color", `${path}.color`);
  if (typeof value.strokeColor !== "string" || !/^#[0-9a-f]{6}$/i.test(value.strokeColor)) fail("must be a six-digit hex color", `${path}.strokeColor`);
  if (typeof value.fillColor !== "string" || !/^#[0-9a-f]{6}$/i.test(value.fillColor)) fail("must be a six-digit hex color", `${path}.fillColor`);
  if (typeof value.opacity !== "number" || value.opacity < 0.05 || value.opacity > 1) fail("must be a number from 0.05 to 1", `${path}.opacity`);
  if (!Number.isInteger(value.strokeWidth) || value.strokeWidth < 1 || value.strokeWidth > 100) fail("must be an integer from 1 to 100", `${path}.strokeWidth`);
  if (!["Arial", "Georgia", "Courier New"].includes(value.fontFamily)) fail("uses an unsupported font", `${path}.fontFamily`);
  if (!PAINT_STUDIO_CATALOG.formats.includes(value.exportFormat)) fail("uses an unsupported export format", `${path}.exportFormat`);
  if (typeof value.exportQuality !== "number" || value.exportQuality < 0.1 || value.exportQuality > 1) fail("must be a number from 0.1 to 1", `${path}.exportQuality`);
  return value;
}

export function validateImageGrabberConfiguration(value) {
  const path = "configuration";
  exactKeys(value, new Set(["fps", "exportFormat", "exportQuality"]), path);
  if (!Number.isInteger(value.fps) || value.fps < IMAGE_GRABBER_CATALOG.minimumFps || value.fps > IMAGE_GRABBER_CATALOG.maximumFps) {
    fail(`must be an integer from ${IMAGE_GRABBER_CATALOG.minimumFps} to ${IMAGE_GRABBER_CATALOG.maximumFps}`, `${path}.fps`);
  }
  if (!IMAGE_GRABBER_CATALOG.formats.includes(value.exportFormat)) fail("uses an unsupported export format", `${path}.exportFormat`);
  if (typeof value.exportQuality !== "number" || value.exportQuality < 0.1 || value.exportQuality > 1) fail("must be a number from 0.1 to 1", `${path}.exportQuality`);
  return value;
}

export function validateImageAnalyzerConfiguration(value) {
  const path = "configuration";
  exactKeys(value, new Set(["model", "sendTarget"]), path);
  validateText(value.model, `${path}.model`, 100);
  if (!IMAGE_ANALYZER_CATALOG.targets.includes(value.sendTarget)) fail("uses an unsupported destination", `${path}.sendTarget`);
  return value;
}

export function validateVideoDirectorConfiguration(value) {
  const path = "configuration";
  exactKeys(value, new Set(["model", "frameCount", "loop"]), path);
  validateText(value.model, `${path}.model`, 100);
  if (!Number.isInteger(value.frameCount) || value.frameCount < VIDEO_DIRECTOR_CATALOG.minimumFrameCount || value.frameCount > VIDEO_DIRECTOR_CATALOG.maximumFrameCount) {
    fail(`must be an integer from ${VIDEO_DIRECTOR_CATALOG.minimumFrameCount} to ${VIDEO_DIRECTOR_CATALOG.maximumFrameCount}`, `${path}.frameCount`);
  }
  if (typeof value.loop !== "boolean") fail("must be a boolean", `${path}.loop`);
  return value;
}

export function validateVideoEditorConfiguration(value) {
  exactKeys(value, new Set(), "configuration");
  return value;
}

export function validateBlockingStudioConfiguration(value) {
  exactKeys(value, new Set(), "configuration");
  return value;
}

export function validateWorkflow3dConfiguration(value) {
  const path = "configuration";
  exactKeys(value, new Set(["selectedOutput", "controls", "activeActions"]), path);
  if (!WORKFLOW_3D_CATALOG.outputs.includes(value.selectedOutput)) fail("uses an unsupported output", `${path}.selectedOutput`);
  if (!plainObject(value.controls)) fail("must be an object", `${path}.controls`);
  const controls = Object.entries(value.controls);
  if (controls.length > 160) fail("must contain at most 160 controls", `${path}.controls`);
  for (const [key, controlValue] of controls) {
    if (key.length > 180) fail("uses a control key longer than 180 characters", `${path}.controls`);
    if (typeof controlValue !== "boolean" && (typeof controlValue !== "string" || controlValue.length > 20_000)) {
      fail("must contain only booleans or text of at most 20000 characters", `${path}.controls.${key}`);
    }
  }
  if (!Array.isArray(value.activeActions) || value.activeActions.length > 24) fail("must contain at most 24 active actions", `${path}.activeActions`);
  value.activeActions.forEach((action, index) => {
    if (typeof action !== "string" || action.length > 500) fail("must be text of at most 500 characters", `${path}.activeActions.${index}`);
  });
  return value;
}

export function validateToolConfiguration(toolId, value) {
  if (toolId === "apg") {
    exactKeys(value, new Set(["intent", "guide", "outputType", "targetEngine", "complexity", "absurdity", "model", "prompt", "weights", "enabled", "history"]), "configuration");
    for (const key of ["intent", "guide", "targetEngine", "model", "prompt"]) validateText(value[key], `configuration.${key}`, key === "prompt" ? 100_000 : 50_000);
    if (!["image", "video"].includes(value.outputType)) fail("must be image or video", "configuration.outputType");
    for (const key of ["complexity", "absurdity"]) if (!Number.isInteger(value[key]) || value[key] < 1 || value[key] > 10) fail("must be an integer from 1 to 10", `configuration.${key}`);
    if (!plainObject(value.weights) || Object.keys(value.weights).length > 100) fail("must be an object with at most 100 entries", "configuration.weights");
    for (const [key, weight] of Object.entries(value.weights)) if (key.length > 80 || !Number.isFinite(weight) || weight < 0 || weight > 100) fail("contains an invalid weight", `configuration.weights.${key}`);
    if (!plainObject(value.enabled) || Object.keys(value.enabled).length > 100) fail("must be an object with at most 100 entries", "configuration.enabled");
    for (const [key, enabled] of Object.entries(value.enabled)) if (key.length > 80 || typeof enabled !== "boolean") fail("contains an invalid toggle", `configuration.enabled.${key}`);
    if (!Array.isArray(value.history) || value.history.length > 80) fail("must contain at most 80 entries", "configuration.history");
    value.history.forEach((entry, index) => {
      exactKeys(entry, new Set(["id", "prompt", "createdAt", "kind"]), `configuration.history[${index}]`);
      for (const key of ["id", "createdAt", "kind"]) validateText(entry[key], `configuration.history[${index}].${key}`, 200);
      validateText(entry.prompt, `configuration.history[${index}].prompt`, 100_000);
    });
    return value;
  }
  if (["barz-enhancer", "angle-3d", "relighting-3d"].includes(toolId)) return validateEnhancerConfiguration(value);
  if (toolId === "mode-bank") {
    exactKeys(value, new Set(["category", "group", "searchQuery", "selectedId", "subjectMode", "puppetMode", "useWardrobePrompt", "favorites"]), "configuration");
    if (!["exterior", "interior", "studio", "conceptual", "collage", "tvshow", "scifi"].includes(value.category)) fail("unknown category", "configuration.category");
    if (!["all", "urban", "nature", "interior", "studio", "object", "surreal", "analog", "cinema"].includes(value.group)) fail("unknown group", "configuration.group");
    validateText(value.searchQuery, "configuration.searchQuery", 500);
    validateText(value.selectedId, "configuration.selectedId", 120);
    if (!["original", "ref", "female", "male"].includes(value.subjectMode)) fail("unknown subject mode", "configuration.subjectMode");
    for (const key of ["puppetMode", "useWardrobePrompt"]) if (typeof value[key] !== "boolean") fail("must be a boolean", `configuration.${key}`);
    if (!Array.isArray(value.favorites) || value.favorites.length > 1221 || new Set(value.favorites).size !== value.favorites.length) fail("invalid favorites", "configuration.favorites");
    value.favorites.forEach((id, index) => validateText(id, `configuration.favorites.${index}`, 120));
    return value;
  }
  if (toolId === "banana-helper") return validateGoodiesConfiguration(value);
  if (toolId === "barz-beauty") return validateBeautyConfiguration(value);
  if (toolId === "realism-forge") return validateRealismConfiguration(value);
  if (toolId === "cinematic-shoot") return validateCinematicShootConfiguration(value);
  if (toolId === "facs-sheet-generator") return validateFacsSheetConfiguration(value);
  if (toolId === "barzy-board") return validateBoardConfiguration(value);
  if (toolId === "veo-suite") return validateCameraSuiteConfiguration(value);
  if (toolId === "cccp") return validateCcpConfiguration(value);
  if (toolId === "barzy-sheet") return validateSheetConfiguration(value);
  if (toolId === "barz-designer") return validateDesignerConfiguration(value);
  if (toolId === "knolling") return validateKnollingConfiguration(value);
  if (toolId === "multishot") return validateMultishotConfiguration(value);
  if (toolId === "seedance") return validateSeedanceConfiguration(value);
  if (toolId === "cinema-helper") return validateCinemaHelperConfiguration(value);
  if (toolId === "image-slicer") return validateImageSlicerConfiguration(value);
  if (toolId === "paint-studio") return validatePaintStudioConfiguration(value);
  if (toolId === "image-grabber") return validateImageGrabberConfiguration(value);
  if (toolId === "image-analyzer") return validateImageAnalyzerConfiguration(value);
  if (toolId === "video-director") return validateVideoDirectorConfiguration(value);
  if (toolId === "motion-emulator") return validateVideoEditorConfiguration(value);
  if (toolId === "video-editor") return validateVideoEditorConfiguration(value);
  if (toolId === "blocking-studio") return validateBlockingStudioConfiguration(value);
  if (toolId === "object-scale-chart") {
    exactKeys(value, new Set(["aiModel", "aiInstruction"]), "configuration");
    validateText(value.aiModel, "configuration.aiModel", 300);
    validateText(value.aiInstruction, "configuration.aiInstruction", 2_000);
    return value;
  }
  if (toolId === "youtube-extractor") {
    exactKeys(value, new Set(), "configuration");
    return value;
  }
  if (toolId === "workflow-3d") return validateWorkflow3dConfiguration(value);
  if (toolId === "imperfection") {
    exactKeys(value, new Set(["state", "customPresets"]), "configuration");
    validateImperfectionState(value.state);
    if (!Array.isArray(value.customPresets) || value.customPresets.length > 100) fail("must contain at most 100 presets", "configuration.customPresets");
    value.customPresets.forEach(validateCustomPreset);
    if (new Set(value.customPresets.map(({ id }) => id)).size !== value.customPresets.length) fail("must use unique preset IDs", "configuration.customPresets");
    return value;
  }
  fail("unknown built-in tool", "toolId");
}

export function defaultToolConfiguration(toolId) {
  const value = DEFAULT_TOOL_CONFIGS[toolId];
  if (!value) fail("unknown built-in tool", "toolId");
  return clone(value);
}

export function compileBeauty(configuration) {
  validateBeautyConfiguration(configuration);
  const entry = beautyEntryById.get(configuration.selectedEntryId);
  return {
    outputs: [{ id: entry.id, label: entry.title, mediaType: "image", prompt: entry.prompt }]
  };
}

function realismSliderText(id, value) {
  const definition = REALISM_CATALOG.sliders.find((slider) => slider.id === id);
  return definition.vals.find(({ m }) => value <= m)?.t ?? definition.vals.at(-1).t;
}

function realismChoice(configuration, key) {
  if (configuration[key] !== "_custom") return configuration[key] ?? "";
  return configuration[`custom${key[0].toUpperCase()}${key.slice(1)}`] ?? "";
}

export function compileRealism(configuration) {
  validateRealismConfiguration(configuration);
  const card = realismCardById.get(configuration.selectedCardId);
  const sliders = { ...REALISM_DEFAULT_SLIDERS, ...(configuration.slidersByCard[card.id] ?? {}) };
  const replaceToken = (value, token, replacement) => value.split(token).join(replacement);
  let lighting = replaceToken(card.template.lighting, "$flash", realismSliderText("flash", sliders.flash));
  lighting = replaceToken(lighting, "$grain", realismSliderText("grain", sliders.grain));
  const parts = [
    `CAMERA: ${card.template.camera}`,
    `LIGHTING: ${lighting}`,
    `DEPTH OF FIELD: ${realismSliderText("dof", sliders.dof)}`
  ];
  const subject = [configuration.celebrity, configuration.description.trim()].filter(Boolean).join(", ");
  if (subject) parts.push(`SUBJECT: ${subject}`);
  const outfit = realismChoice(configuration, "outfit").trim();
  if (outfit) parts.push(`OUTFIT: ${outfit}`);
  const pose = realismChoice(configuration, "pose").trim();
  const mood = configuration.mood || "candid";
  if (pose) parts.push(`POSE: ${pose}, ${mood} expression`);
  else if (mood !== "candid") parts.push(`EXPRESSION: ${mood}`);
  const location = realismChoice(configuration, "location").trim();
  if (location) parts.push(`LOCATION: ${location}`);
  parts.push(`IMPERFECTIONS: ${replaceToken(card.template.imperfections, "$imperf", realismSliderText("imperf", sliders.imperf))}`);
  if (sliders.wear > 10) parts.push(`PRINT AGING: ${realismSliderText("wear", sliders.wear)}`);
  return {
    outputs: [{ id: card.id, label: card.title, mediaType: "image", prompt: parts.join("\n\n") }],
    sliders
  };
}

function extractCinematicValue(raw, labels) {
  const pattern = new RegExp(`(?:^|[;\\n])\\s*(?:${labels.join("|")})\\s*:\\s*([^;\\n]+)`, "i");
  return String(raw).match(pattern)?.[1]?.trim() ?? "";
}

function cinematicScene(rawValue) {
  const raw = String(rawValue ?? "").trim();
  const hasLabels = /(?:^|[;\n])\s*(?:subject|sujet|context|contexte|environment|decor|décor)\s*:/i.test(raw);
  const labeledSubject = extractCinematicValue(raw, ["subject", "sujet"]);
  const context = extractCinematicValue(raw, ["context", "contexte", "environment", "decor", "décor"]);
  const normalizeSubject = (value) => /@image1/i.test(value) ? value : `@image1 - ${value}`;
  const subject = labeledSubject ? normalizeSubject(labeledSubject) : hasLabels || !raw ? "@image1" : normalizeSubject(raw);
  return { raw, subject, context, placeholder: raw || subject };
}

function composeCinematicSource(prompt, scene, outfitText) {
  const tokens = /\[OUTFIT_INSTRUCTION\]|\[Scene Description\]|\[Details\]|\bthe person in reference\b|\bperson in reference\b|\bSubject\b/g;
  return prompt.replace(tokens, (token) => {
    if (token === "[OUTFIT_INSTRUCTION]") return outfitText;
    if (token === "[Scene Description]" || token === "[Details]") return scene.placeholder;
    return scene.subject;
  });
}

function adaptCinematicGrid(prompt, grid) {
  const total = grid.cols * grid.rows;
  const spec = `${grid.cols}x${grid.rows}`;
  const adapted = prompt.replace(/3x3|\b9 UNIQUE FRAMES\b|\b9-FRAME\b|\b9-frame\b|\b9 frames\b/gi, (match) => {
    if (match.toLowerCase() === "3x3") return spec;
    if (match.toLowerCase() === "9-frame") return `${total}-frame`;
    if (match.toLowerCase() === "9 unique frames") return `${total} UNIQUE FRAMES`;
    return `${total} frames`;
  });
  const rule = `PROMPT ATLAS GRID OVERRIDE: Output exactly ${total} frames arranged in ${grid.cols} columns and ${grid.rows} rows. Treat the supplied shot list as source beats, not a fixed panel count. If there are more beats than panels, keep the strongest beats in narrative order. If there are fewer beats than panels, add coherent complementary shots consistent with the same character, wardrobe, setting and lighting. Fill every panel and order the final sequence row by row, left to right. No captions, panel labels or overlays.`;
  return `${adapted}\n\n${rule}`;
}

export function compileCinematicShoot(configuration) {
  validateCinematicShootConfiguration(configuration);
  const item = cinematicPromptById.get(configuration.selectedPromptId);
  if (Object.hasOwn(configuration.customPrompts, item.id)) {
    return {
      outputs: [{ id: item.id, label: item.cleanTitle, mediaType: "image", prompt: configuration.customPrompts[item.id] }],
      grid: { ...configuration.grid, total: configuration.grid.cols * configuration.grid.rows },
      custom: true
    };
  }
  const scene = cinematicScene(configuration.detailsByPrompt[item.id]);
  const matchOutfit = configuration.matchShotOutfitByPrompt[item.id] ?? false;
  const outfitText = matchOutfit
    ? "OUTFIT ADAPTATION & TAILORING: Character @IMG_1 MUST wear the EXACT outfit seen in @IMG_2. MANDATORY: Remodel and re-sculpt the garments to fit @IMG_1's unique, weird body silhouette and specific anatomical proportions perfectly. DO NOT copy the standard body type of the person in @IMG_2."
    : "ORIGINAL OUTFIT: Character @IMG_1 MUST wear their exact original outfit seen in reference @IMG_1.";
  const layer = ["ATLAS SUBJECT / CONTEXT:", `SUBJECT: ${scene.subject}`];
  if (scene.context) layer.push(`CONTEXT: ${scene.context}`);
  if (configuration.characterMode === "puppet") layer.push(`PUPPET MODE: ${CINEMATIC_SHOOT_CATALOG.puppetModeInstruction}`);
  const composed = composeCinematicSource(item.prompt, scene, outfitText);
  return {
    outputs: [{ id: item.id, label: item.cleanTitle, mediaType: "image", prompt: adaptCinematicGrid(`${layer.join("\n")}\n\n${composed}`, configuration.grid) }],
    grid: { ...configuration.grid, total: configuration.grid.cols * configuration.grid.rows },
    custom: false
  };
}

function cleanSentence(value) {
  return String(value ?? "").trim().replace(/[.]+$/, "");
}

function facsOutput(configuration, output) {
  return { ...output, prompt: configuration.customOutputs[output.id] ?? output.prompt, custom: Object.hasOwn(configuration.customOutputs, output.id) };
}

export function compileFacsSheet(configuration) {
  validateFacsSheetConfiguration(configuration);
  const selected = configuration.selectedIds.map((id) => facsEntryById.get(id));
  if (configuration.outputMode === "acting") {
    if (!selected.length) return { mode: "acting", outputs: [] };
    const prompt = `FACS acting layer: ${selected.map((entry) => `${entry.label} ${entry.name} - ${entry.visible}`).join("; ")}`;
    return { mode: "acting", outputs: [facsOutput(configuration, { id: "acting-layer", label: "FACS acting layer", mediaType: "video", prompt })] };
  }
  if (configuration.outputMode === "portraits") {
    const anchor = cleanSentence(configuration.anchor);
    const wardrobe = cleanSentence(configuration.wardrobe);
    const framing = cleanSentence(configuration.framing);
    return {
      mode: "portraits",
      outputs: selected.map((entry) => facsOutput(configuration, {
        id: entry.id,
        label: `${entry.label} · ${entry.name}`,
        mediaType: "image",
        prompt: `${anchor}. ${wardrobe}. The face shows: ${entry.visible}. Keep all other facial regions neutral unless directly affected by this action unit. ${framing}.`
      }))
    };
  }
  const units = FACS_CATALOG.entries.map((entry) => `${entry.label} ${entry.name}: ${entry.visible}`).join("; ");
  const prompt = `Create one complete FACS ACTION UNITS reference sheet as a flat 7x7 contact sheet, 49 equal portrait tiles. Use a portrait 3:4 or 4:5 canvas; 9:16 is acceptable only if the 7x7 board fills the image. No perspective, no rounded cards, no decorative frames, no thick white gutters, no outer margin, no watermark, no logo. Use thin dark separators or no visible gutters. Each cell must contain one centered medium close-up portrait in the upper 75% of the cell, with a small readable AU code and name in a narrow bottom label band. Subject lock: ${String(configuration.anchor).replace(/\s+/g, " ").trim()}. Wardrobe lock: ${String(configuration.wardrobe).replace(/\s+/g, " ").trim()}. Framing lock: ${String(configuration.framing).replace(/\s+/g, " ").trim()}. Same character identity, face structure, hairstyle, lens, crop, lighting and background in every tile; only the facial action changes. Critical gaze disambiguation: AU61 Eyes Turn Left means both pupils move toward image-left / viewer-left, not anatomical left; AU62 Eyes Turn Right means both pupils move toward image-right / viewer-right. AU61 and AU62 must be visibly opposite gaze directions and must never look the same way. Use these 49 tiles in this exact left-to-right, top-to-bottom order: ${units}. The result must read like a professional facial acting / expression reference chart that can be sliced into 49 clean cards.`;
  return { mode: "full-board", outputs: [facsOutput(configuration, { id: "full-board", label: "Planche FACS complète · 7 × 7", mediaType: "image", prompt })] };
}

function facsPromptBlock(ids, context) {
  if (!ids.length) return "";
  const cues = ids.map((id) => {
    const entry = facsEntryById.get(id);
    return `${entry.label} (${entry.name})`;
  }).join(", ");
  if (context === "story") {
    return `\n\nFacial acting / FACS cues: ${cues}. Distribute these cues across readable close-up and key-action panels: eyes/brows for reaction beats, mouth/jaw for speech or strain, head/neck for direction changes. Keep the expression changes visible but anatomically natural.`;
  }
  return ` Facial performance / FACS cues: ${cues}. Apply them on close-up and key-action beats so the face, gaze, mouth, jaw and head movement stay consistent with the storyboard timing.`;
}

function compileBoardStory(configuration) {
  const s = configuration.story;
  if (!s.subject.trim() && !s.action.trim() && !s.drawingNotes.trim() && !s.secondary.trim()) {
    return "Fill at least the main character, action, drawing style notes or secondary characters to generate the prompt...";
  }
  const refChar = s.refChar.trim() || "@image1";
  const refEnv = s.refEnv.trim() || "@image2";
  const annotation = s.annotations
    ? "Annotation color system: red arrows = body movement; blue arrows = camera movement; green marks = framing / composition notes; orange marks = lighting direction; purple marks = vocal / emotional emphasis; black text = short lens notes and panel labels."
    : "No annotations, no arrows, no overlays - clean storyboard panels only.";
  const drawing = [s.drawingStyle, s.drawingNotes.trim(), s.drawingReference.trim() ? `Reference image: ${s.drawingReference.trim()}` : ""].filter(Boolean).join(". ");
  const references = `REFERENCES:\n${refChar} = main character${s.subject.trim() ? `: ${s.subject.trim()}` : ""}\n${refEnv} = setting / environment${s.env.trim() ? `: ${s.env.trim()}` : ""}\n@image3, @image4, @image5, @image6 = secondary characters${s.secondary.trim() ? `: ${s.secondary.trim()}` : " (ignore if not provided)"}`;
  return `${references}\n\nCreate a ${s.ratio} storyboard sheet with ${s.panels} cinematic panels. Action / choreography: ${s.action.trim() || "the described action"}. Use ${refChar} as the main character reference and ${refEnv} as the setting reference.\n\nStyle of drawing: ${drawing || s.drawingStyle}. Keep the artwork lightweight, dynamic and unfinished - early choreography previs energy.\n\nSubject: ${s.subject.trim() || refChar}.\n\nSecondary characters: ${s.secondary.trim() || "ignore if not provided"}.\n\nScene: ${s.action.trim() || "-"}. ${s.env.trim() ? `Environment: ${s.env.trim()}.` : ""}\n\nCinematography: ${s.camera}. Every panel must contain visible motion and strong body momentum - avoid static standing poses.\n\n${annotation}\n\n${s.finalBeat.trim() ? `End with: ${s.finalBeat.trim()}.` : ""}${facsPromptBlock(s.facsCueIds, "story")}\n\nNo timestamps, no watermark.`.replace(/\n{3,}/g, "\n\n").trim();
}

function compileBoardMotion(configuration) {
  const s = configuration.story;
  const m = configuration.motion;
  const refBoard = m.refBoard.trim() || "@[storyboard ref]";
  const refChar = m.refChar.trim() || s.refChar.trim() || "@image1";
  const refEnv = m.refEnv.trim() || s.refEnv.trim() || "@image2";
  const refSecondary = m.refSecondary.trim() || "@image3, @image4, @image5, @image6";
  const subject = m.subject.trim() || s.subject.trim();
  const secondary = m.secondary.trim() || s.secondary.trim();
  const action = m.action.trim() || s.action.trim();
  const env = m.env.trim() || s.env.trim();
  const camera = m.camera.trim() || s.camera;
  const cueIds = m.facsMode === "inherit-story" ? s.facsCueIds : m.facsCueIds;
  if (!subject && !action && !cueIds.length) return "Import from Story or fill the overrides...";
  const motionSubject = subject || "the character from the storyboard reference";
  const motionAction = action || "perform the selected acting and facial action cues with clear readable movement";
  const headers = {
    seedance: `Seedance 2.0 Prompt: Use the storyboard reference ${refBoard} as the complete visual and choreography source for a ${m.duration}-second video. Follow all ${s.panels} beats sequentially from left to right, top to bottom. Do not reinterpret the actions, poses, camera angles or emotional progression. Preserve shot order, movement logic, framing variety and final pose.`,
    kling: `Kling Prompt: Reference storyboard ${refBoard} as the visual and choreography source for a ${m.duration}-second video. Follow all ${s.panels} beats in order. Preserve composition, action and final pose.`,
    veo: `Veo 3.1 Prompt: Reference storyboard ${refBoard} for a ${m.duration}-second sequence following ${s.panels} beats in order. Maintain shot logic and final pose.`
  };
  const references = `REFERENCES:\n${refChar} = main character${subject ? `: ${subject}` : ""}\n${refEnv} = setting / environment${env ? `: ${env}` : ""}\n${refSecondary} = secondary characters${secondary ? `: ${secondary}` : " (ignore if not provided)"}`;
  return `${references}\n\n${headers[m.model]}\n\nCompress the full ${s.panels}-beat sequence into ${m.duration} seconds. Each beat must appear clearly as a fast motion snapshot, not a full-length action. Pacing: ${m.pace}.\n\nCharacter: ${refChar} - ${motionSubject}. Do not duplicate her/him.\n\nSecondary characters: ${secondary || "ignore if not provided"}.\n\nAction: ${motionAction}\n\nEnvironment: ${refEnv} - ${env || "as described in storyboard"}. Cinematography: ${camera}.\n\nFinal beat holds for the last ${m.finalHold.trim() || "1"} second(s).${m.audio.trim() ? ` ${m.audio.trim()}` : ""}${facsPromptBlock(cueIds, "motion")}\n\nNo text, no annotations, no timestamps, no watermark.`.replace(/\n{3,}/g, "\n\n").trim();
}

export function compileBoard(configuration) {
  validateBoardConfiguration(configuration);
  const story = { id: "story", label: "Prompt storyboard", mediaType: "image", prompt: compileBoardStory(configuration) };
  const motion = { id: "motion", label: "Prompt motion", mediaType: "video", prompt: compileBoardMotion(configuration) };
  for (const output of [story, motion]) {
    if (Object.hasOwn(configuration.customOutputs, output.id)) {
      output.prompt = configuration.customOutputs[output.id];
      output.custom = true;
    } else output.custom = false;
  }
  return { outputs: [story, motion], activeOutputId: configuration.activeTab, motionFacsMode: configuration.motion.facsMode };
}

export function compileCameraSuite(configuration) {
  validateCameraSuiteConfiguration(configuration);
  const active = new Set(configuration.activeCardIds);
  const layers = [];
  if (configuration.incoming.text.trim()) {
    layers.push({
      id: "incoming",
      label: configuration.incoming.source.trim() || "Blocking Studio",
      source: configuration.incoming.source.trim(),
      prompt: configuration.incoming.text
    });
  }
  for (const card of CAMERA_SUITE_CATALOG.cards) {
    if (!active.has(card.key)) continue;
    const variant = card.variants[configuration.variantByCard[card.key]];
    layers.push({
      id: variant.id,
      cardId: card.key,
      label: `${card.title} · ${variant.label}`,
      prompt: configuration.customPrompts[variant.id] ?? variant.prompt,
      custom: Object.hasOwn(configuration.customPrompts, variant.id)
    });
  }
  const prompt = layers.map(({ prompt: layer }) => layer).filter((layer) => layer.trim()).join("\n");
  return {
    layers,
    outputs: [{ id: "composite", label: "Prompt caméra composite", mediaType: "video", prompt }]
  };
}

function ccpOutputSuffix(grid) {
  const info = ccpGridInfo(grid);
  return CCP_CATALOG.outputSuffix
    .replace("{{total}}", () => String(info.total))
    .replace("{{grid}}", () => info.spec)
    .replace("{{codes}}", () => info.codes.join(", "));
}

function ccpGridOutput(stageId, grid) {
  const info = ccpGridInfo(grid);
  let text = ccpTemplateByKey.get(stageId).prompt;
  if (stageId === "b") text = text.replace(" (3x3 Grid 1)", "").replace(/\nUSER SCENE INPUT:\s*$/, "");
  if (stageId === "a1" && info.spec !== "3x3") {
    const coverage = CCP_CATALOG.coverageInstruction.replace("{{total}}", () => String(info.total));
    text = text.replace("The 9-Panel Shot List:", coverage)
      .replace(/^Row [ABC] \(([^\n]+)\):\n/gm, "")
      .replace(/^- Panel [ABC][123]: /gm, "- ");
  }
  text = text.replaceAll("3x3", info.spec)
    .replace(/\b9-panel\b/gi, `${info.total}-panel`)
    .replace(/\b9 panels\b/g, `${info.total} panels`)
    .replace(/\b9 distinct\b/g, `${info.total} distinct`)
    .replace(/\ball nine\b/g, `all ${info.total}`)
    .replace(/\b9 frames\b/g, `${info.total} frames`)
    .replace("3-row by 3-column", `${grid.rows}-row by ${grid.cols}-column`)
    .replace("from A1 to C3", `from A1 to ${info.last}`);
  return `${text}\n\n${ccpOutputSuffix(grid)}`;
}

function ccpCompiledPrompt(configuration, stageId) {
  const info = ccpGridInfo(configuration.grid);
  const mode = (stage) => ccpModeByStage.get(`${stage}:${configuration.modes[stage]}`).prompt;
  if (stageId === "a1") return ccpGridOutput("a1", configuration.grid);
  if (stageId === "a2") return `${ccpTemplateByKey.get("a2").prompt}\n\n${mode("a2")}`;
  if (stageId === "b") {
    let prompt = `${ccpGridOutput("b", configuration.grid)}\n\n${mode("b")}\n\nUSER SCENE INPUT:\n${configuration.scene}`;
    if (configuration.iterationTake > 0) {
      const variation = CCP_CATALOG.variations[(configuration.iterationTake - 1) % CCP_CATALOG.variations.length].prompt;
      prompt += `\n\nITERATION - Take ${configuration.iterationTake + 1}: Generate a NEW variation of this ${info.total}-panel storyboard. ${variation}. Do not reproduce the previous layout; deliver a genuinely different take on the same scene.`;
    }
    return prompt;
  }
  const panelCode = configuration.panelCode.trim().toUpperCase() || "A1";
  if (!info.codes.includes(panelCode)) fail(`must be one of ${info.codes.join(", ")}`, "configuration.panelCode");
  return ccpTemplateByKey.get(configuration.modes.c === "puppet" ? "c_puppet" : "c").prompt
    .replaceAll("3x3", info.spec)
    .replace("[PANEL_CODE]", () => panelCode)
    .replace("[INSERT PANEL CODE HERE, e.g., A2]", () => panelCode);
}

export function compileCcp(configuration, stageId) {
  validateCcpConfiguration(configuration);
  const selectedStageIds = stageId === undefined ? CCP_CATALOG.stages.map(({ id }) => id) : [stageId];
  if (selectedStageIds.some((id) => !ccpStageIds.has(id))) fail("references an unknown stage", "stageId");
  const outputs = selectedStageIds.map((id) => {
    const stage = CCP_CATALOG.stages.find((candidate) => candidate.id === id);
    const custom = Object.hasOwn(configuration.customOutputs, id);
    return {
      id,
      label: stage.title,
      mediaType: "image",
      prompt: custom ? configuration.customOutputs[id] : ccpCompiledPrompt(configuration, id),
      custom
    };
  });
  return {
    outputs,
    grid: { ...configuration.grid, ...ccpGridInfo(configuration.grid) },
    iterationTake: configuration.iterationTake
  };
}

function sheetCompiledPrompt(configuration, card) {
  let prompt = card.prompt;
  if (card.id === "posesheet") {
    const option = sheetWeaponByValue.get(configuration.weapon);
    const label = option.value === "ref" ? "the weapon from @image2"
      : option.value === "neutral" ? "bare hands / empty-hand combat" : option.promptValue;
    const directive = option.value === "none" ? ""
      : option.value === "neutral" ? a7Supplement.approvedComposition.emptyDirective
        : a7Supplement.approvedComposition.weaponDirective.replace("${label}", () => label);
    const grid = option.value === "none" ? a7Supplement.approvedComposition.defaultGrid
      : option.value === "neutral" ? a7Supplement.approvedComposition.neutralGrid
        : a7Supplement.approvedComposition.armedGrid.replaceAll("[WEAPON_LABEL]", () => label);
    prompt = prompt.replace("[POSE_WEAPON_DIRECTIVE]", () => directive)
      .replace("[POSE_GRID_DIRECTIVE]", () => grid);
  }
  if (card.id === "complexexpressionboard") {
    if (configuration.facsIds.length !== 8) fail("requires exactly eight selected FACS IDs", "configuration.facsIds");
    const lines = configuration.facsIds.map((id, index) => {
      const entry = sheetFacsById.get(id);
      return `${index + 1}. **${entry.label} — ${entry.name}:** ${entry.visible}`;
    });
    prompt = prompt.replace("[FACS_SELECTION_PLACEHOLDER]", () => lines.join("\n"));
  }
  return prompt.replaceAll("[BG_COLOR_PLACEHOLDER]", () => SHEET_CATALOG.backgrounds[configuration.backgrounds[card.id]]);
}

export function compileSheet(configuration, cardId) {
  validateSheetConfiguration(configuration);
  const ids = cardId === undefined ? SHEET_CATALOG.cards.map(({ id }) => id) : [cardId];
  if (ids.some((id) => !sheetCardById.has(id))) fail("references an unknown card", "cardId");
  return {
    outputs: ids.map((id) => {
      const card = sheetCardById.get(id);
      const custom = Object.hasOwn(configuration.customOutputs, id);
      return {
        id,
        label: card.title,
        mediaType: "image",
        prompt: custom ? configuration.customOutputs[id] : sheetCompiledPrompt(configuration, card),
        settings: custom ? {} : clone(card.settings),
        custom
      };
    })
  };
}

function designerWeightLabel(weight) {
  return weight >= 82 ? "strict source fidelity"
    : weight >= 64 ? "source-led style transfer"
      : weight >= 42 ? "balanced style freedom" : "style-led reinterpretation";
}

function designerCompiledPrompt(configuration, card) {
  let prompt = card.prompt;
  const color = configuration.selectedColors[card.id];
  if (color) prompt = prompt.replaceAll("[BG_COLOR]", () => `${color.name} ${color.hex}`);
  prompt = prompt.replaceAll("[DRAWING_WEIGHT]", () => String(configuration.drawingWeight))
    .replaceAll("[DRAWING_WEIGHT_LABEL]", () => designerWeightLabel(configuration.drawingWeight));
  const sceneSlot = "__BARZ_DESIGNER_SCENE__";
  const hasScene = card.id === "sketch-photo-8" && Boolean(configuration.scene);
  prompt = prompt.replaceAll("[Scene Description]", hasScene ? sceneSlot : "")
    .replaceAll("[DESCRIBE YOUR NEW SUBJECT HERE]", "")
    .replaceAll("[Details]", "")
    .replace(/\s+MANDATORY:/g, " MANDATORY:")
    .replace(/ {2,}/g, " ")
    .trim();
  return hasScene ? prompt.replace(sceneSlot, () => configuration.scene) : prompt;
}

export function compileDesigner(configuration, cardId) {
  validateDesignerConfiguration(configuration);
  const ids = cardId === undefined ? DESIGNER_CATALOG.cards.map(({ id }) => id) : [cardId];
  if (ids.some((id) => !designerCardById.has(id))) fail("references an unknown card", "cardId");
  return {
    outputs: ids.map((id) => {
      const card = designerCardById.get(id);
      const custom = Object.hasOwn(configuration.customOutputs, id);
      return {
        id,
        label: card.title,
        mediaType: "image",
        prompt: custom ? configuration.customOutputs[id] : designerCompiledPrompt(configuration, card),
        settings: {},
        custom
      };
    })
  };
}

function knollingZonePrompt(configuration) {
  if (!configuration.tattooZones.length) return KNOLLING_CATALOG.zoneDefault;
  const firstTattooReferenceIndex = configuration.tattooBodyMode === "provided-body" ? 2 : 1;
  const lines = configuration.tattooZones.map((zone, index) => KNOLLING_CATALOG.zoneLine
    .replace("${index + firstTattooReferenceIndex}", () => String(index + firstTattooReferenceIndex))
    .replace("${zone}", () => zone));
  return KNOLLING_CATALOG.zoneTemplate.replace(/\$\{lines\.join\(['"][\s\S]*?['"]\)\}/, () =>
    lines.join("\n"));
}

function knollingCompiledPrompt(configuration, card) {
  let prompt = card.prompt;
  if (KNOLLING_CATALOG.compilerTargets.lighting.includes(card.id)) {
    prompt = prompt.replace("[LIGHTING_PLACEHOLDER]", () =>
      KNOLLING_CATALOG.optionTexts.lightingTexts[configuration.lighting]);
  }
  if (KNOLLING_CATALOG.compilerTargets.multiReference.includes(card.id)) {
    prompt = prompt.replace("[MULTI_IMAGE_PLACEHOLDER]", () =>
      KNOLLING_CATALOG.optionTexts.multiRefTexts[configuration.multiReference]);
  }
  if (KNOLLING_CATALOG.compilerTargets.accessoryAndSubject.includes(card.id)) {
    prompt = prompt.replace("[SUBJECT_PLACEHOLDER]", () =>
      KNOLLING_CATALOG.optionTexts.subjectTexts[configuration.subject]);
    prompt = prompt.replace("[ACCESSORY_PLACEHOLDER]", () =>
      KNOLLING_CATALOG.optionTexts.accessoryTexts[configuration.accessory]);
  }
  if (KNOLLING_CATALOG.compilerTargets.tattooPlaceIt.includes(card.id)) {
    prompt = prompt.replace("[TATTOO_PLACE_IT_PLACEHOLDER]", () =>
      KNOLLING_CATALOG.optionTexts.tattooPlaceItTexts[configuration.tattooPlaceIt]);
  }
  if (KNOLLING_CATALOG.compilerTargets.tattooZones.includes(card.id)) {
    prompt = prompt.replace("[TATTOO_REFERENCE_PLACEHOLDER]", () =>
      KNOLLING_CATALOG.roleTexts[configuration.tattooBodyMode]);
    prompt = prompt.replace("[TATTOO_ZONE_PLACEHOLDER]", () => knollingZonePrompt(configuration));
  }
  return prompt;
}

export function compileKnolling(configuration, cardId) {
  validateKnollingConfiguration(configuration);
  const ids = cardId === undefined ? KNOLLING_CATALOG.cards.map(({ id }) => id) : [cardId];
  if (ids.some((id) => !knollingCardById.has(id))) fail("references an unknown card", "cardId");
  return {
    outputs: ids.map((id) => {
      const card = knollingCardById.get(id);
      const custom = Object.hasOwn(configuration.customOutputs, id);
      return {
        id,
        label: card.title,
        mediaType: "image",
        prompt: custom ? configuration.customOutputs[id] : knollingCompiledPrompt(configuration, card),
        settings: {},
        custom
      };
    })
  };
}

function multishotPanelPlan(card, count) {
  const contract = MULTISHOT_CATALOG.gridContract;
  if (count === 4) {
    return contract.fourBeatPlans[card.id].map((sourceBeat) => ({ sourceBeat }));
  }
  if (count === 6 || count === 9) {
    return Array.from({ length: count }, (_, index) => ({ sourceBeat: index + 1 }));
  }
  if (count === 8) {
    return Array.from({ length: 9 }, (_, index) => ({ sourceBeat: index + 1 }))
      .filter(({ sourceBeat }) => sourceBeat !== contract.omitForEight[card.id]);
  }
  const insertAfter = count === 12
    ? contract.insertAfterForTwelve
    : contract.insertAfterForSixteen;
  return Array.from({ length: 9 }, (_, index) => index + 1).flatMap((sourceBeat) => [
    { sourceBeat },
    ...(insertAfter.includes(sourceBeat) ? [{ sourceBeat, alternate: true }] : [])
  ]);
}

function multishotCounts(text, count) {
  return text.replace(/\b(?:6|9) (frames|keyframes)\b/g, `${count} $1`);
}

function multishotCardPrompt(configuration, card) {
  if (card.noGridAdapt) return card.prompt;
  const { cols, rows } = configuration.grid;
  const count = cols * rows;
  const model = card.structured[count <= 6 ? "2x3" : "3x3"];
  const panelPlan = multishotPanelPlan(card, count);
  const panels = panelPlan.map((step, index) => {
    const text = step.alternate
      ? MULTISHOT_CATALOG.gridContract.extraCoverageText
      : model.beats[step.sourceBeat - 1].text;
    return `${index + 1}. ${text}`;
  }).join("\n\n");
  const header = `Generate one ${cols}x${rows} contact-sheet image: ${cols} columns, `
    + `${rows} rows, exactly ${count} panels. Read the panels left to right, then top to `
    + "bottom. Use exactly the panel plan below.";
  let prompt = [
    header,
    multishotCounts(model.before, count),
    `Panel plan:\n${panels}`,
    multishotCounts(model.after, count),
    MULTISHOT_CATALOG.gridContract.renderContract
  ].join("\n\n");
  if (card.hasFlashToggle) {
    prompt = prompt.replace("{{FLASH_OPTION}}", () =>
      configuration.hardFlashEnabled ? " with a hard flash" : "");
  }
  return prompt;
}

function multiAnglePrompt(configuration) {
  const { cols, rows } = configuration.grid;
  const count = cols * rows;
  const tokens = {
    "${g.cols}": String(cols),
    "${g.rows}": String(rows),
    "${n}": String(count),
    "${subject}": configuration.subject.trim()
      || "(describe your subject / reference image here)",
    "${angleList}": MULTISHOT_CATALOG.multiAnglePool.slice(0, count)
      .map((angle, index) => `${index + 1}. ${angle}`).join("\n")
  };
  return MULTISHOT_CATALOG.multiAngleTemplate.replace(
    /\$\{(?:g\.cols|g\.rows|n|subject|angleList)\}/g,
    (token) => tokens[token]
  );
}

function multishotOutput(configuration, id) {
  const custom = Object.hasOwn(configuration.customOutputs, id);
  if (multishotCameraById.has(id)) {
    const entry = multishotCameraById.get(id);
    return {
      id,
      label: entry.name,
      mediaType: entry.type === "Movements" ? "video" : "image",
      prompt: custom ? configuration.customOutputs[id] : entry.prompt,
      settings: {},
      custom
    };
  }
  if (id === "multi-angle") {
    return {
      id,
      label: "Multi-Angle",
      mediaType: "image",
      prompt: custom ? configuration.customOutputs[id] : multiAnglePrompt(configuration),
      settings: {},
      custom
    };
  }
  const card = multishotCardById.get(id);
  return {
    id,
    label: card.title,
    mediaType: "image",
    prompt: custom ? configuration.customOutputs[id] : multishotCardPrompt(configuration, card),
    settings: {},
    custom
  };
}

export function compileMultishot(configuration, outputId) {
  validateMultishotConfiguration(configuration);
  const ids = outputId === undefined
    ? [...multishotCameraById.keys(), "multi-angle", ...multishotCardById.keys()]
    : [outputId];
  if (ids.some((id) => !multishotOutputIds.has(id))) {
    fail("references an unknown output", "outputId");
  }
  return { outputs: ids.map((id) => multishotOutput(configuration, id)) };
}

function seedanceTime(ticks) {
  return `${String(Math.floor(ticks / 6000)).padStart(2, "0")}:${String(Math.floor((ticks % 6000) / 100)).padStart(2, "0")}.${String(ticks % 100).padStart(2, "0")}`;
}

function cleanSeedanceMovingShot(text) {
  return text
    .replace(/^Sequence shot\s+\d+\s*\([^)]*\):\s*/i, "")
    .replace(/\(5 degrees\/2 sec\)/g, "(5 degrees across this shot)")
    .replace(/\bover(?: slow)?\s+\d+(?:\.\d+)?\s*seconds?\b/gi, "across this shot")
    .replace(/\bbuilds over \d+(?:\.\d+)?\s*sec\b/gi, "builds across this shot")
    .replace(/\bShot 1\b/g, "the opening shot")
    .trim();
}

function seedanceFinal(configuration, outputId, canonical, ignoreSaved) {
  const key = seedanceFinalKey(configuration, outputId);
  return {
    key,
    prompt: !ignoreSaved && Object.hasOwn(configuration.finals, key) ? configuration.finals[key] : canonical,
    saved: !ignoreSaved && Object.hasOwn(configuration.finals, key)
  };
}

const EXTRA_STILL_FRAMINGS = Object.freeze([
  "a low-angle three-quarter view with foreground depth", "a high-angle three-quarter view preserving the setting",
  "a reverse view over the main subject's shoulder", "a symmetrical full-setting master shot",
  "a long-lens profile with layered background", "an intimate close-up of a visible facial or surface detail",
  "an overhead view that explains the spatial layout", "a ground-level view across a visible foreground element",
  "a wide rear view revealing the subject's surroundings", "a side-lit medium shot with clear silhouette",
  "a detail insert of a visible material or prop", "a diagonal view from the opposite side of the scene",
  "a distant architectural frame around the subject", "a tight profile against the established background",
  "a foreground-obscured view with the subject in focus", "a bird's-eye composition of the subject and environment",
  "a low rear three-quarter composition", "a close view of a visible interaction or gesture",
  "a wide frame emphasizing negative space", "a final establishing view from a new camera axis"
]);

// A still sequence is coverage of one scene, not ten variations of a director's
// favourite composition. Keep these camera setups independent of the style bank:
// several banks deliberately repeat the same angle for their original examples.
const STILL_CAMERA_SETUPS = Object.freeze([
  "frontal wide master; show the full shared setting and the subjects' spatial relationship",
  "medium two-shot from camera-left at 45 degrees; preserve the established screen direction",
  "close-up of the main subject from slightly below eye level; retain a recognizable set detail behind",
  "wide profile from camera-right; make the two subjects' silhouettes and distance readable",
  "over-the-shoulder view from the secondary subject toward the main subject and the central set piece",
  "high-angle medium two-shot from the opposite side of the room; show a different shared gesture",
  "low floor-level view across the subjects' feet or contact point toward the established background",
  "tight side profile of the secondary subject with the main subject visible deeper in the same scene",
  "reverse wide shot from the set entrance or far side; reveal geography absent from the opening view",
  "rear three-quarter medium shot of both subjects framed against the main set feature",
  ...EXTRA_STILL_FRAMINGS
]);

function stillCameraSetup(index, hasSecondary) {
  if (hasSecondary) return STILL_CAMERA_SETUPS[index];
  if (index === 1) return "medium three-quarter shot from camera-left at 45 degrees; preserve the established screen direction";
  if (index === 4) return "over-the-shoulder view past a visible foreground prop toward the main subject and the central set piece";
  if (index === 5) return "high-angle medium shot from the opposite side of the scene; show a different gesture";
  if (index === 7) return "tight side profile of the main subject with the established setting visible deeper in frame";
  return STILL_CAMERA_SETUPS[index]
    .replace("the two subjects'", "the subject's")
    .replace("the subjects'", "the subject's")
    .replace("the two subjects", "the subject")
    .replace("both subjects", "the subject");
}

const MULTIVIEW_SHOTS = Object.freeze([
  "Wide master of the source environment, main subject in its starting position.",
  "Closer two-shot of the subject and any visible companion.",
  "Close-up of the companion, or a distinctive visible object when alone.",
  "Extreme close-up of a real texture or feature in the source.",
  "Tight view of the subject beside a visible prop.",
  "Foreground subject with the established set receding behind.",
  "Extreme close-up of a hand, mechanism, or other active detail.",
  "Low angle across a foreground object toward the subject.",
  "Side view preserving subject, props and screen direction.",
  "Full-body wide shot within the same environment.",
  "Close-up of a distinctive surface in the set.",
  "Close-up of a second, different set detail.",
  "Close-up of a light source, reflection or shadow detail.",
  "Close-up of a structural junction or architectural texture.",
  "Close-up of a final visible set detail, distinct from earlier inserts.",
  "Close-up of the subject's face or identifying front feature.",
  "Extreme close-up of an eye, sensor or other identifying detail.",
  "Low view from beneath the main set piece.",
  "Floor-level wide shot; subject small beyond the set piece.",
  "The entire environment framed from its threshold, outer edge or another supported boundary.",
  "Reverse view across that boundary; look inside only if an opening exists.",
  "Wider view of the structure or landscape feature containing the scene.",
  "The full structure or local setting with its immediate surroundings.",
  "High angle over the same site, keeping its layout and subject traceable.",
  "Oblique view of the immediate surroundings, only if supported by the source scene.",
  "Reverse exterior or adjacent-setting angle that keeps the original location identifiable.",
  "Wider view along a nearby route, facade or landscape feature within the established setting.",
  "Optional short orbit around the building or main set piece, if the scene supports it.",
  "New ground-level angle looking back toward the original location.",
  "Final wide master of the subject and its recognizable environment, still grounded at the same location."
]);

const MULTIVIEW_INSERTS = Object.freeze([
  "Reverse-angle master from the opposite side of the same set.",
  "Tight profile of the main subject against the established background.",
  "Insert of a second identifying feature on the visible companion or prop.",
  "Macro view of a different surface detail, retaining source materials.",
  "Over-shoulder view along the subject's established eyeline.",
  "Oblique three-quarter view through a foreground layer.",
  "Close view of a real contact point or mechanical connection.",
  "Ground-level reverse angle across that foreground object.",
  "Higher side angle resolving the same subject-and-prop geography.",
  "Wide rear view of the subject within the set.",
  "Raking-light insert of another unique set surface.",
  "Shallow-depth insert of a repeated shape in the environment.",
  "Reflected view of the established light source.",
  "Macro angle on a corner, edge or seam in the set.",
  "Silhouette detail against the environment's existing light.",
  "Three-quarter facial or identifying-feature close-up.",
  "Opposing extreme close-up of a different identifying detail.",
  "Upward view beside the main set piece, not the earlier low angle.",
  "Diagonal floor-level frame with a different foreground line.",
  "Boundary view looking back into the same setting, if its edge is visible.",
  "Reverse angle showing that boundary in its local context.",
  "Oblique view of the facade or landscape feature framing the setting.",
  "Street- or terrain-level long shot of the same local setting.",
  "Oblique upper angle over the same site, preserving the subject's position.",
  "Nearby reverse angle showing the adjacent routes or terrain without changing location.",
  "High three-quarter view of the established structure or set piece.",
  "Lateral exterior angle if an exterior exists; otherwise another distinct view of the set boundary.",
  "Short orbit from the opposite side of the building or main set piece, if supported.",
  "Foreground-framed view looking back toward the same subject and setting.",
  "Closing alternate master of the recognizable source environment."
]);

const MULTIVIEW_PLANETARY_ENDING = Object.freeze([
  "Top-down aerial of the surrounding blocks or terrain.",
  "Very high aerial toward the horizon.",
  "Satellite-like overhead of the region's larger pattern.",
  "Graphic geographic view locating the scene in its region.",
  "Wider geographic view revealing the surrounding continent.",
  "Full world view with recognizable continents.",
  "Planet Earth floating in black space, becoming tiny in the vast frame."
]);

const MULTIVIEW_PLANETARY_INSERTS = Object.freeze([
  "Aerial oblique view showing nearby routes and rooflines.",
  "Higher aerial with the neighborhood shrinking into the city.",
  "Overhead regional view with the original location still traceable.",
  "Map-like view highlighting the local district without labels.",
  "Continental oblique view preserving the location marker.",
  "Earth-limb view with the continent curving away.",
  "Extreme wide from space with Earth smaller than in the preceding shot."
]);

function storyGuideRequestsPlanetaryView(storyline) {
  return /(?:earth\s+from\s+space|terre\s+depuis\s+l['’]espace|planet\s+earth|plan[eè]te\s+terre|orbital\s+view|vue\s+orbitale|from\s+orbit|depuis\s+l['’]orbite|into\s+space|dans\s+l['’]espace|vers\s+l['’]espace|zoom.{0,80}(?:earth|terre|planet|plan[eè]te)|(?:earth|terre|planet|plan[eè]te).{0,80}zoom|world\s+map|carte\s+du\s+monde|continent|atmosph[eè]re|atmosphere)/i.test(storyline || "");
}

function multiviewShotPlan(count, planetaryEnding = false) {
  const shots = planetaryEnding ? [...MULTIVIEW_SHOTS.slice(0, 23), ...MULTIVIEW_PLANETARY_ENDING] : MULTIVIEW_SHOTS;
  const inserts = planetaryEnding ? [...MULTIVIEW_INSERTS.slice(0, 23), ...MULTIVIEW_PLANETARY_INSERTS] : MULTIVIEW_INSERTS;
  if (count <= 30) return Array.from({ length: count }, (_unused, index) =>
    shots[count === 1 ? 0 : Math.round(index * 29 / (count - 1))]);
  const extras = count - 30;
  return shots.flatMap((shot, index) => [
    shot,
    ...(Math.floor((index + 1) * extras / 30) > Math.floor(index * extras / 30) ? [inserts[index]] : [])
  ]);
}

function compileMultiview(configuration, references, values) {
  const count = configuration.shotCount;
  const duration = configuration.duration;
  const planetaryEnding = storyGuideRequestsPlanetaryView(configuration.storyline);
  const shots = multiviewShotPlan(count, planetaryEnding);
  const source = references.map((reference) => `@image${reference.slot}`).join(", ") || "the described source scene";
  const subject = values.SUBJECT;
  const context = values.CONTEXT;
  const style = values.STYLE;
  const preamble = [
    `Create an extremely fast-paced ${duration}-second sequence with EXACTLY ${count} DISTINCT SHOTS of ${source}.`,
    `Source analysis: subject — ${subject}; environment — ${context}; visual style — ${style}. Preserve the same subject identity, real visible details, lighting logic and visual style in every shot. Use the supplied images as one coherent scene, not unrelated scenes.`,
    ...(references.length ? [`Reference details:\n${references.map((reference) =>
      `@image${reference.slot}: subject — ${reference.subject.trim() || "unspecified"}; environment — ${reference.context.trim() || "unspecified"}`).join("\n")}`] : []),
    `Every shot is an independent camera setup. Separate adjacent shots by an INSTANT HARD CUT. No morphing, crossfades, seamless zooms, whip transitions or continuous camera travel between shots. Average shot length: ${(duration / count).toFixed(2)} seconds.`,
    planetaryEnding
      ? "The story guide explicitly requests a planetary expansion. Start in the source environment and widen through its surroundings toward the requested Earth or space view, preserving scene continuity."
      : "Stay in the source environment and its immediate surroundings. If the scene supports it, step outside a building and make a short orbit around the structure or main set piece. Let the scene determine how far the camera can go. Do not invent a world map, planetary zoom-out or Earth-from-space ending."
  ];
  const plan = shots.map((description, index) => ({
    label: `SHOT ${index + 1}`,
    startTicks: Math.round(index * duration * 100 / count),
    endTicks: Math.round((index + 1) * duration * 100 / count),
    description
  }));
  const shotText = plan.map((shot, index) =>
    `${shot.label} (${seedanceTime(shot.startTicks)}-${seedanceTime(shot.endTicks)}): ${shot.description}${index < count - 1 ? "\nHARD CUT." : ""}`);
  const canonical = [
    ...preamble,
    ...shotText,
    `EXACTLY ${count} SEPARATE SHOTS, ${count - 1} HARD CUTS, ${duration} SECONDS. Never skip or combine shots. Prioritize distinct editorial cuts over long shot duration.`
  ].join("\n\n");
  return { canonical, plan };
}

export function compileSeedance(configuration, { ignoreSaved = false } = {}) {
  validateSeedanceConfiguration(configuration);
  const template = seedanceTemplateById.get(configuration.templateId);
  const engine = videoMultiFramingEngineById.get(configuration.provider);
  const references = [...configuration.references].sort((left, right) => left.slot - right.slot);
  const first = references[0];
  const second = references[1];
  const subject = configuration.subject.trim()
    || (first ? first.subject.trim() || `@image${first.slot}` : "[describe the main subject]");
  const context = configuration.context.trim()
    || (first ? first.context.trim() || `@image${first.slot} setting` : "[describe the setting]");
  const explicitSecondarySubjects = configuration.secondarySubjects.map((entry) => entry.trim()).filter(Boolean);
  const explicitSecondaryContexts = configuration.secondaryContexts.map((entry) => entry.trim()).filter(Boolean);
  const legacyAutomaticRoles = !configuration.subject.trim() && !configuration.context.trim()
    && !explicitSecondarySubjects.length && !explicitSecondaryContexts.length;
  const secondarySubjects = explicitSecondarySubjects.length
    ? explicitSecondarySubjects
    : legacyAutomaticRoles && second ? [second.subject.trim() || `@image${second.slot}`] : [];
  const secondaryContexts = explicitSecondaryContexts.length
    ? explicitSecondaryContexts
    : legacyAutomaticRoles && second && second.context.trim() ? [second.context.trim()] : [];
  const secondarySubjectLabel = legacyAutomaticRoles ? "secondary subject" : "secondary subjects";
  const secondaryContextLabel = legacyAutomaticRoles ? "secondary context" : "secondary settings";
  const values = {
    SUBJECT: subject + (secondarySubjects.length ? `; ${secondarySubjectLabel}: ${secondarySubjects.join("; ")}` : ""),
    CONTEXT: context + (secondaryContexts.length ? `; ${secondaryContextLabel}: ${secondaryContexts.join("; ")}` : ""),
    STYLE: configuration.style.trim() || (references.length ? "source-matched" : "neutral cinematic")
  };
  const fill = (text) => text.replace(/\[(SUBJECT|CONTEXT|STYLE)\]/g, (_match, key) => values[key]);
  const preamble = [];
  if (references.length) {
    preamble.push(`References:\n${references.map((reference) => {
      const descriptions = [
        reference.subject.trim() && `Subject: ${reference.subject.trim()}`,
        reference.context.trim() && `Context: ${reference.context.trim()}`
      ].filter(Boolean);
      return `@image${reference.slot}: ${descriptions.join(". ") || "reference image"}`;
    }).join("\n")}`);
  }
  if (template.bankId !== template.id) {
    const note = configuration.mode === "stills"
      ? SEEDANCE_CATALOG.aliasStillsNotes[template.id]
      : template.directorNote;
    preamble.push(`Visual direction: ${note}`);
  }
  if (configuration.mode === "moving" && configuration.actionDirection.trim()) {
    preamble.push(`Action direction: ${configuration.actionDirection.trim()}`);
  }
  if (configuration.storyline.trim()) {
    preamble.push(`Storyline: ${configuration.storyline.trim()}`);
  }
  if (secondarySubjects.length || secondaryContexts.length) {
    if (configuration.mode === "stills") {
      preamble.push("Coexistence logic: Stage the main and supporting subjects together in the chosen setting. Keep physical contact, matching scale, eyelines and light direction; never combine reference panels into a collage.");
    } else {
      const subjects = secondarySubjects.length
        ? `Bring the ${legacyAutomaticRoles ? "secondary subject" : "secondary subjects"} (${secondarySubjects.join("; ")}) into a logical relationship with the main subject (${subject}).`
        : `Extend the main subject (${subject}) into the secondary context.`;
      const contexts = secondaryContexts.length
        ? `Blend the ${legacyAutomaticRoles ? "secondary context" : "secondary settings"} (${secondaryContexts.join("; ")}) with the ${legacyAutomaticRoles ? "main context" : "main setting"} (${context}) as a motivated shared scene, not a collage.`
        : `Keep the shared scene grounded in ${context}.`;
      preamble.push(`Coexistence logic: ${subjects} ${contexts} Use cause-and-effect staging, shared light direction, matching scale, and clear spatial contact so both references feel like one believable setup.`);
    }
  }

  const count = configuration.mode === "stills" ? (configuration.stillCount ?? 10) : configuration.shotCount;
  if (configuration.mode === "stills") {
    preamble.push(`Director aesthetic: ${template.name}. ${template.stills.info} Use its palette, atmosphere and texture; the numbered CAMERA SETUP controls the framing of each still.`);
  }
  if (configuration.mode === "multiview") {
    const { canonical, plan } = compileMultiview(configuration, references, values);
    const final = seedanceFinal(configuration, "all", canonical, ignoreSaved);
    const unresolved = !references.length && (!configuration.subject.trim() || !configuration.context.trim());
    const warnings = [
      ...(configuration.duration / count < 0.5 ? ["VERY_SHORT_SHOTS"] : []),
      ...(final.prompt.length > configuration.charLimit ? ["PROMPT_OVER_LIMIT"] : []),
      ...(unresolved ? ["DESCRIPTIONS_REQUIRED"] : [])
    ];
    return {
      outputs: [{ id: "multiview", label: "Multiview video sequence", mediaType: "video", prompt: final.prompt,
        characterCount: final.prompt.length, overLimit: final.prompt.length > configuration.charLimit,
        readyToSend: final.prompt.length <= configuration.charLimit && !unresolved, saved: final.saved, finalKey: final.key }],
      plan, warnings, characterCount: final.prompt.length, overLimit: final.prompt.length > configuration.charLimit,
      readyToSend: final.prompt.length <= configuration.charLimit && !unresolved,
      mediaType: "video", individualOutputs: [], copyAll: "",
      providerInfo: `${count} hard-cut shots - ${configuration.duration}s - ${engine.label}`,
      engine: { ...engine }, directorSkill: "Instant hard cuts, fixed camera positions, source-grounded spatial coverage."
    };
  }
  const plan = Array.from({ length: count }, (_unused, index) => {
    const cameraSetup = configuration.mode === "stills" ? stillCameraSetup(index, secondarySubjects.length > 0) : "";
    const sourceBeat = configuration.mode === "stills" ? index + 1 : (index % 7) + 1;
    const startTicks = Math.round(index * configuration.duration * 100 / count);
    const endTicks = Math.round((index + 1) * configuration.duration * 100 / count);
    const label = configuration.mode === "stills" ? `Still ${index + 1}`
      : configuration.provider === "seedance" ? "Cut to"
        : `Sequence shot ${index + 1} (${seedanceTime(startTicks)}-${seedanceTime(endTicks)})`;
    return {
      sourceBeat,
      cycle: configuration.mode === "stills" ? 1 : Math.floor(index / 7) + 1,
      ...(configuration.mode === "moving" ? { startTicks, endTicks } : {}),
      label,
      ...(configuration.mode === "stills" ? {
        cameraDirective: `CAMERA SETUP ${index + 1}/${count}: ${cameraSetup}.`
      } : {}),
      description: fill(configuration.mode === "stills"
        ? `Still photograph. ${cameraSetup}. Show [SUBJECT] in [CONTEXT]. Preserve [STYLE], the reference designs, wardrobe, set geography and lighting. Depict a distinct instant or gesture from the storyline where applicable; no collage, turnaround sheet, or duplicated framing.`
        : cleanSeedanceMovingShot(template.moving.shots[sourceBeat - 1]))
    };
  });
  const canonical = [...preamble, ...plan.map((item) => `${item.label}: ${item.description}`)].join("\n\n");
  const final = seedanceFinal(configuration, "all", canonical, ignoreSaved);
  const unresolved = !references.length && (!configuration.subject.trim() || !configuration.context.trim());
  const warnings = [];
  if (configuration.mode === "moving" && count > 7) warnings.push("REPEATED_TEMPLATE_CYCLE");
  if (configuration.mode === "moving" && configuration.duration / count < 0.5) warnings.push("VERY_SHORT_SHOTS");
  if (references.length > 2) warnings.push("ADDITIONAL_REFS_LISTED_NOT_STAGED");
  if (final.prompt.length > configuration.charLimit) warnings.push("PROMPT_OVER_LIMIT");
  if (unresolved) warnings.push("DESCRIPTIONS_REQUIRED");
  const individualOutputs = configuration.mode === "stills" ? plan.map((item) => {
    const individualCanonical = [
      item.cameraDirective,
      ...preamble,
      ...(configuration.subject.trim() || configuration.context.trim() || explicitSecondarySubjects.length
        ? [`Scene roles: main ${configuration.subject.trim() || subject}; supporting ${explicitSecondarySubjects.join("; ") || (second ? `@image${second.slot}` : "none")}; setting ${configuration.context.trim() || context}.`]
        : []),
      "Photograph one distinct instant of the same scene. Preserve the reference designs, wardrobe, set geography and light direction. Reference turnarounds and grids are design sources, not the output layout."
    ].join("\n\n");
    const individual = seedanceFinal(configuration, `still-${item.sourceBeat}`, individualCanonical, ignoreSaved);
    return {
      id: `still-${item.sourceBeat}`,
      label: `Still ${item.sourceBeat}`,
      mediaType: "image",
      prompt: individual.prompt,
      characterCount: individual.prompt.length,
      overLimit: individual.prompt.length > configuration.charLimit,
      readyToSend: individual.prompt.length <= configuration.charLimit && !unresolved,
      saved: individual.saved,
      finalKey: individual.key,
      cameraDirective: item.cameraDirective
    };
  }) : [];
  const providerInfo = configuration.mode === "stills" ? `${count} static stills`
    : `${count} ${configuration.provider === "seedance" ? "cuts" : "shots"} - ${configuration.duration}s - ${({
      seedance: "Seedance 2.5 contiguous time ranges and motivated cuts",
      kling: "Kling 3.0 custom multi-shot wording",
      "minimax-h3": "MiniMax H3 structured shot timing",
      "flux-3": "FLUX 3 HARD CUT multi-shot wording",
      wan: "Wan 3.0 timestamped shot list"
    })[configuration.provider]}`;
  return {
    outputs: [{
      id: configuration.mode,
      label: configuration.mode === "stills" ? "Complete still list" : "Moving sequence",
      mediaType: configuration.mode === "moving" ? "video" : "image",
      prompt: final.prompt,
      characterCount: final.prompt.length,
      overLimit: final.prompt.length > configuration.charLimit,
      readyToSend: final.prompt.length <= configuration.charLimit && !unresolved,
      saved: final.saved,
      finalKey: final.key
    }],
    plan,
    warnings,
    characterCount: final.prompt.length,
    overLimit: final.prompt.length > configuration.charLimit,
    readyToSend: final.prompt.length <= configuration.charLimit && !unresolved,
    mediaType: configuration.mode === "moving" ? "video" : "image",
    individualOutputs,
    copyAll: individualOutputs.map(({ label, prompt }) => `[${label}]\n${prompt}`).join("\n\n"),
    providerInfo,
    engine: { ...engine },
    directorSkill: template.directorSkill
  };
}

function cinemaLocalPrompt(deck) {
  const organized = Object.fromEntries([
    "subjects", "objects", "backgrounds", "focal", "models", "movements",
    "framing", "actions", "adjectives", "acting", "lighting"
  ].map((key) => [key, []]));
  const destinations = {
    subjects: "subjects", objects: "objects", backgrounds: "backgrounds",
    "camera-focal": "focal", "camera-models": "models", camera: "movements",
    framing: "framing", action: "actions", adjectives: "adjectives",
    acting: "acting", lighting: "lighting"
  };
  for (const item of deck) organized[destinations[item.category]].push(item.copyText);
  const parts = [];
  const cameraSetup = [...organized.focal, ...organized.models];
  if (cameraSetup.length) parts.push(cameraSetup.join(", "));
  const cameraAction = [...organized.movements, ...organized.framing];
  if (cameraAction.length) parts.push(cameraAction.join(" "));
  if (organized.subjects.length) {
    const subject = organized.subjects[0];
    let subjectPhrase = organized.subjects.length > 1
      ? organized.subjects.join(" and ")
      : `${/[aeiou]/i.test(subject[0] || "") ? "an" : "a"} ${subject}`;
    if (organized.actions.length || organized.adjectives.length) {
      let actionPart = "";
      if (organized.adjectives.length && organized.actions.length) actionPart = `${organized.actions.join(" and ")} ${organized.adjectives[0]}`;
      else if (organized.actions.length) actionPart = organized.actions.join(" and ");
      else actionPart = `moves ${organized.adjectives.join(" and ")}`;
      subjectPhrase += ` ${actionPart}`;
    }
    if (organized.objects.length) {
      const object = organized.objects[0];
      subjectPhrase += ` with ${/[aeiou]/i.test(object[0] || "") ? "an" : "a"} ${object}`;
      if (organized.objects.length > 1) subjectPhrase += ` and ${organized.objects.slice(1).join(" and ")}`;
    }
    if (organized.acting.length) subjectPhrase += `, ${organized.acting.join(" and ")}`;
    parts.push(subjectPhrase);
  } else {
    const misc = [...organized.actions, ...organized.objects, ...organized.adjectives, ...organized.acting];
    if (misc.length) parts.push(misc.join(", "));
  }
  if (organized.backgrounds.length) parts.push(`in ${organized.backgrounds.join(" and ")}`);
  if (organized.lighting.length) parts.push(organized.lighting.join(", "));
  const prompt = parts.join(", ");
  return prompt ? prompt[0].toUpperCase() + prompt.slice(1) : "";
}

export function compileCinemaHelper(configuration) {
  validateCinemaHelperConfiguration(configuration);
  const directCopy = configuration.deck.map(({ copyText }) => copyText).join(", ");
  const fallbackUsed = configuration.deck.some(({ category }) => !CINEMA_COMPOSER_CATEGORIES.has(category));
  const localPrompt = fallbackUsed ? directCopy : cinemaLocalPrompt(configuration.deck);
  const prompt = configuration.customPrompt.trim() || localPrompt;
  const adjectiveCount = configuration.deck.filter(({ category }) => category === "adjectives").length;
  return {
    outputs: [{ id: "main", label: "Cinema Helper", mediaType: "image", prompt }],
    prompt,
    localPrompt,
    directCopy,
    fallbackUsed,
    custom: Boolean(configuration.customPrompt.trim()),
    warnings: adjectiveCount > 1 && !fallbackUsed ? ["ONLY_FIRST_ADJECTIVE_MODIFIES_ACTION"] : [],
    negativePrompt: CINEMA_HELPER_CATALOG.negativePrompts[configuration.negativeMode]
  };
}

export function compileEnhancer(configuration) {
  validateEnhancerConfiguration(configuration);
  if (configuration.mode === "cards") {
    const card = ENHANCER_CATALOG.cards.find(({ id }) => id === configuration.selectedCardId);
    return [{ id: card.id, label: card.title, prompt: card.prompt }];
  }
  if (configuration.mode === "relighting") {
    const lights = configuration.relightingLights ?? DEFAULT_TOOL_CONFIGS["barz-enhancer"].relightingLights;
    const subject = configuration.subject.trim();
    const prompt = [
      "Use @image1 as the sole visual reference. Relight the existing image without changing its camera, composition, geometry, subject identity, wardrobe, pose, materials, background, crop, or perspective.",
      subject ? `Scene note: ${subject}.` : "",
      ...lights.map((light, index) => {
        const horizontal = light.azimuth === 0 ? "directly in front"
          : light.azimuth > 0 ? `${Math.abs(light.azimuth)}° toward camera-right around the subject`
            : `${Math.abs(light.azimuth)}° toward camera-left around the subject`;
        const vertical = light.elevation === 0 ? "at subject height"
          : light.elevation > 0 ? `${Math.abs(light.elevation)}° above the subject`
            : `${Math.abs(light.elevation)}° below the subject`;
        const shape = light.type === "area" ? `, source size ${light.size.toFixed(2)} m`
          : light.type === "spot" ? `, cone angle ${light.spread.toFixed(0)}°`
            : "";
        const type = { point: "POINT", area: "AREA", sun: "SUN / DIRECTIONAL", spot: "SPOT" }[light.type];
        return `LIGHT ${index + 1} — ${type}: ${horizontal}, ${vertical}, distance ${light.distance.toFixed(2)} m, color ${light.color.toUpperCase()}, intensity ${light.intensity.toFixed(2)}${shape}. Aim this light precisely at the center of @image1.`;
      }),
      "Lighting-only edit: preserve every non-lighting detail exactly. Produce physically coherent illumination, contact shadows, falloff, reflections, and color spill from the specified rig. Do not add, remove, move, reshape, restyle, or duplicate anything."
    ].filter(Boolean).join("\n\n");
    return [{ id: "relighting-rig", label: "Relighting · rig 3D", prompt }];
  }
  if (configuration.angleStudio && configuration.selectedAngleIds.length === 0) {
    const camera = configuration.angleStudio;
    const azimuth = camera.azimuth;
    const elevation = camera.elevation;
    const horizontal = Math.abs(azimuth) < 8 ? "frontal"
      : Math.abs(azimuth) > 172 ? "direct rear"
        : Math.abs(Math.abs(azimuth) - 90) < 8 ? (azimuth > 0 ? "right profile" : "left profile")
          : azimuth > 0 ? `three-quarter view from the subject's right at ${Math.abs(azimuth).toFixed(1)}° azimuth`
            : `three-quarter view from the subject's left at ${Math.abs(azimuth).toFixed(1)}° azimuth`;
    const vertical = Math.abs(elevation) < 4 ? "eye-level"
      : elevation > 0 ? `high-angle camera, ${elevation.toFixed(1)}° above the subject`
        : `low-angle camera, ${Math.abs(elevation).toFixed(1)}° below the subject`;
    const framing = camera.distance < 3.2 ? "tight close framing"
      : camera.distance < 5.5 ? "medium framing"
        : "wide framing with more surrounding context";
    const subject = configuration.subject.trim();
    const prompt = [
      "Use @image1 as the sole visual reference.",
      `Re-render the exact same subject from a ${horizontal}, ${vertical}, at a virtual camera distance of ${camera.distance.toFixed(2)} m using a ${camera.focalLength.toFixed(0)} mm lens and ${framing}.`,
      `ABSOLUTE CAMERA COORDINATES: azimuth ${azimuth.toFixed(1)}° around the subject (0° = front, +90° = subject-right profile, -90° = subject-left profile, ±180° = rear); elevation ${elevation.toFixed(1)}°; optical axis locked on the center of the subject.`,
      subject ? `Scene note: ${subject}.` : "",
      "Viewpoint-only transformation: preserve exact identity, facial structure, body proportions, hairstyle, wardrobe, accessories, materials, colors, lighting, background, time of day, and scene layout from @image1. Infer only the newly revealed surfaces required by this camera position. No redesign, no morphing, no duplicate subject, no wardrobe change, no lighting change."
    ].filter(Boolean).join("\n\n");
    return [{ id: "angle-camera", label: "Angle · caméra 3D", prompt }];
  }
  const selected = new Set(configuration.selectedAngleIds);
  const subject = configuration.subject.trim() || "@image1";
  return ENHANCER_CATALOG.angles.filter(({ selectable, id }) => selectable && selected.has(id)).map((angle) => {
    const prompt = `${configuration.preservationMode}${angle.prompt}, ${subject}. Preserve original style, lighting quality, and color palette from reference.`;
    return { id: angle.id, label: angle.label, prompt };
  });
}

export function copyAllEnhancer(outputs) {
  return outputs.map(({ label, prompt }) => `[${label}]\n${prompt}`).join("\n\n");
}

function goodiesRecipe(entry) {
  return {
    schemaVersion: "1.0",
    id: `${entry.id}-v1`,
    revision: 1,
    title: entry.title,
    fields: [{ id: "scene", label: "Détails", type: "text", maxLength: 4_000, default: "[Details]" }],
    outputs: [{
      id: "main",
      mediaType: "image",
      template: `${entry.prompt}${GOODIES_CATALOG.suffix}`.split("[Scene Description]").join("{{scene}}"),
      negativePrompt: "",
      settings: {}
    }],
    referenceSlots: [],
    origin: "builtin"
  };
}

function compileGoodiesEntry(entry, detail = "") {
  const scene = detail.trim() || "[Details]";
  const output = compileRecipe(goodiesRecipe(entry), { scene })[0];
  return { id: entry.id, label: entry.title, mediaType: output.mediaType, prompt: output.prompt };
}

function copyGoodiesEntries(entries) {
  return entries.map((entry) => `${entry.categoryId} / ${entry.title}\n${compileGoodiesEntry(entry).prompt}`).join("\n\n");
}

export function compileGoodies(configuration) {
  validateGoodiesConfiguration(configuration);
  const entry = goodiesEntryById.get(configuration.selectedEntryId);
  const detail = configuration.detailsByPrompt[entry.id] ?? "";
  return {
    outputs: [compileGoodiesEntry(entry, detail)],
    copyWithoutDetails: compileGoodiesEntry(entry).prompt,
    copyCategory: copyGoodiesEntries(GOODIES_CATALOG.entries.filter(({ categoryId }) => categoryId === configuration.activeCategory)),
    copyAll: copyGoodiesEntries(GOODIES_CATALOG.entries)
  };
}

export function applyImperfectionPreset(currentState, presetState, { builtin = false } = {}) {
  validateImperfectionState(currentState);
  validateImperfectionState(presetState, { partial: true });
  if (builtin && (!presetState.camera || !presetState.human)) {
    fail("built-in presets require camera and human groups", "state");
  }
  const next = clone(currentState);
  const groups = builtin ? ["camera", "human"] : ["sections", "camera", "human", "antiGlitch"];
  for (const groupName of groups) {
    if (presetState[groupName]) Object.assign(next[groupName], clone(presetState[groupName]));
  }
  return validateImperfectionState(next);
}

export function compileImperfection(state) {
  validateImperfectionState(state);
  const cameraParts = [];
  const humanParts = [];

  if (state.sections.camera) {
    const deviceDescriptions = {
      smartphone_handheld: "handheld smartphone camera",
      smartphone_selfie: "smartphone selfie cam front-facing",
      action_cam: "action camera GoPro-style wide angle",
      dslr_shoulder: "DSLR camera shoulder-mounted documentary style",
      dslr_handheld: "DSLR handheld cinema camera",
      dashcam: "fixed dashcam perspective",
      security: "static security camera CCTV angle",
      webcam: "laptop webcam fixed position"
    };
    cameraParts.push(`Shot on ${deviceDescriptions[state.camera.device]}.`);
    const movements = [];
    if (state.camera.handDrift > 0) movements.push(`subtle hand drift of ${state.camera.handDrift}mm amplitude at ${state.camera.driftFreq} movements per second`);
    if (state.camera.microShake > 0) movements.push(`${["", "barely perceptible", "slight", "noticeable", "pronounced", "heavy"][state.camera.microShake]} micro-shake from human hand instability`);
    if (state.camera.afBreathing > 0) movements.push(`${["", "minimal", "subtle", "natural", "visible", "prominent"][state.camera.afBreathing]} autofocus breathing and hunting`);
    if (state.camera.aeShift > 0) movements.push(`auto-exposure micro-adjustments of +/-${state.camera.aeShift} stops`);
    if (movements.length) cameraParts.push(`Camera behavior: ${movements.join(", ")}.`);
    const operator = [];
    if (state.camera.gazeBreaks) operator.push("brief gaze breaks lasting 0.2-0.4 seconds");
    if (state.camera.reframing) operator.push("subtle reframing adjustments");
    if (state.camera.zoomHunting) operator.push("occasional zoom hunting");
    if (state.camera.whipPan) operator.push("spontaneous whip pans");
    if (state.camera.freeRoam) operator.push("free-roaming camera movement exploring subject from multiple angles, pushing in for details then pulling back, circling loosely, finding new perspectives organically");
    if (state.camera.orbit) {
      const speed = ["", "slow", "medium", "fast", "rapid"][state.camera.orbitSpeed];
      const direction = { clockwise: "clockwise", counterclockwise: "counter-clockwise", alternating: "alternating directions" }[state.camera.orbitDirection];
      operator.push(`smooth orbital camera movement circling around subject at ${speed} pace, ${direction}, maintaining consistent distance while tracking subject`);
    }
    if (state.camera.stopMotionVib > 0) {
      const description = ["", "barely perceptible micro-vibration between frames like stop-motion camera bump", "subtle frame-to-frame position jitter characteristic of stop-motion animation", "visible stop-motion camera vibration with slight position shifts each frame", "pronounced stop-motion tremor with noticeable inter-frame camera displacement"][state.camera.stopMotionVib];
      cameraParts.push(`Stop-motion effect: ${description}.`);
    }
    if (operator.length) cameraParts.push(`Operator behavior: ${operator.join(", ")}.`);
  }

  if (state.sections.human) {
    const activityDescriptions = {
      still: "Subject seated or still",
      casual: "Subject in casual standing position",
      active: "Subject actively moving",
      nervous: "Subject displaying nervous energy",
      exhausted: "Subject with low energy exhausted demeanor",
      puppet_henson: "Subject moves like a Jim Henson foam puppet, gentle bouncy sway originating from below, head bobs and tilts expressively during speech, arms swing loosely with slight delay, exaggerated mouth movements, soft floaty quality to all motion, occasional looking-around head movements, body gently rocks side to side, movements have warmth and personality of classic Muppet performance",
      puppet_stopmotion: "Subject moves in stop-motion animation style at 12 frames per second, distinct stuttery motion with visible holds between poses, micro-jitter from animator touch, imperfect spacing between keyframes, slight position drift between frames, characteristic jerky puppet quality, movements have deliberate start-stop rhythm, subtle tremor artifacts from physical manipulation"
    };
    humanParts.push(`${activityDescriptions[state.human.activityLevel]}.`);
    const body = [];
    if (state.human.breathSway > 0) body.push(`${["", "minimal", "subtle", "natural", "visible", "pronounced"][state.human.breathSway]} breathing sway in torso and shoulders`);
    if (state.human.weightShift > 0) body.push(`${["", "rare", "occasional", "periodic", "frequent", "constant"][state.human.weightShift]} weight shifts between feet`);
    if (state.human.gripAdjust) body.push("micro grip adjustments");
    if (state.human.postureShift) body.push("subtle posture corrections");
    if (state.human.fidget) body.push("idle fidgeting");
    if (state.human.handGesture) body.push("natural hand gestures while speaking");
    if (body.length) humanParts.push(`Body micro-motion: ${body.join(", ")}.`);
    const face = [];
    if (state.human.blinkRate > 0) face.push(["", "5-10 blinks per minute sparse", "10-15 blinks per minute slow", "15-20 blinks per minute natural rate", "20-25 blinks per minute frequent", "25+ blinks per minute nervous rapid"][state.human.blinkRate]);
    if (state.human.microExpressions) face.push("subtle micro-expressions");
    if (state.human.eyeDart) face.push("natural eye saccades and micro-movements");
    if (state.human.lipMovement) face.push("lip micro-movements");
    if (state.human.swallow) face.push("occasional swallow reflex");
    if (face.length) humanParts.push(`Facial micro-motion: ${face.join(", ")}.`);
    const speech = [];
    if (state.human.naturalPause) speech.push("natural pauses in speech");
    if (state.human.breathBetween) speech.push("audible breaths between sentences");
    if (state.human.umFiller) speech.push("occasional filler words um uh");
    if (state.human.headNod) speech.push("head nods for emphasis while speaking");
    if (speech.length) humanParts.push(`Speech patterns: ${speech.join(", ")}.`);
  }

  const ruleMap = {
    noMorphing: "no face morphing or distortion",
    consistentFingers: "consistent finger count exactly five fingers per hand",
    noFlicker: "no texture flickering or swimming artifacts",
    stableClothing: "stable consistent clothing and accessories",
    naturalMotion: "physically plausible motion only",
    consistentLighting: "consistent lighting direction throughout",
    noTextWarp: "no warping or morphing text or logos",
    stableBackground: "stable non-morphing background elements",
    naturalHair: "natural hair movement physics",
    eyeContact: "maintain consistent eye contact direction"
  };
  const rules = Object.entries(ruleMap).filter(([id]) => state.antiGlitch[id]).map(([, text]) => text);
  const parts = [];
  if (cameraParts.length) parts.push(`[CAMERA]\n${cameraParts.join(" ")}`);
  if (humanParts.length) parts.push(`[SUBJECT]\n${humanParts.join(" ")}`);
  if (rules.length) parts.push(`[CONSTRAINTS]\n${rules.join(". ")}.`);
  return parts.join("\n\n");
}

export function imperfectionStats(state, prompt = compileImperfection(state)) {
  validateImperfectionState(state);
  const camera = state.sections.camera ? 1 + Object.entries(state.camera).filter(([key, value]) => !["device", "orbitDirection", "driftFreq", "orbitSpeed"].includes(key) && (value === true || typeof value === "number" && value > 0)).length : 0;
  const human = state.sections.human ? 1 + Object.entries(state.human).filter(([key, value]) => key !== "activityLevel" && (value === true || typeof value === "number" && value > 0)).length : 0;
  const constraints = Object.values(state.antiGlitch).filter(Boolean).length;
  return { activeSettings: camera + human, activeConstraints: constraints, approximateTokens: prompt ? Math.ceil(prompt.split(/\s+/).length * 1.3) : 0 };
}
