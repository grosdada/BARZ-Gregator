const slug = (value) => String(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function group(kind, family, labels, sentence) {
  return labels.map((label) => ({ id: `${kind}-${slug(label)}`, label, family, append: sentence(label) }));
}

const cameras = [
  ...group("camera", "Film cinéma", ["35mm Film Camera", "16mm Film Camera", "8mm Film Camera", "Aaton XTR", "Bolex H16", "Panavision Panaflex", "Super 16mm Film Camera"],
    (x) => `Camera: ${x}; physical film transport, organic exposure latitude, natural gate instability and an optical—not digital—image response.`),
  ...group("camera", "Cinéma numérique", ["ARRI Alexa 65", "ARRI Alexa 35", "Canon C500", "Lumix GH5", "RED Digital Cinema Camera", "Sony FX3", "Sony FX6", "Sony Venice"],
    (x) => `Camera: ${x}; measured cinema color science, controlled dynamic range, stable exposure and gentle highlight roll-off.`),
  ...group("camera", "Photo 35 mm", ["Argus C3", "Canon AE-1", "Canon EOS 5D", "Fujifilm X-T4", "Leica M3", "Leica Q2 Monochrom", "Minolta SRT-101", "Nikon F2", "Nikon FM2", "Olympus OM-1", "Pentax K1000", "Zenit-E"],
    (x) => `Camera: ${x}; restrained still-photography rendering, tactile surface detail, believable exposure and physical depth.`),
  ...group("camera", "Moyen format", ["Hasselblad 500CM", "Hasselblad X1D II", "Mamiya RB67", "Pentax 645Z", "Phase One XF IQ4", "Rolleiflex"],
    (x) => `Camera: ${x}; medium-format tonal depth, measured perspective, crisp material separation and patient composition.`),
  ...group("camera", "Instantané analogique", ["Compact Camera", "Contax T2", "Diana F+", "Holga 120N", "Kodak Brownie", "Kodak FunSaver", "Lomo LC-A", "Polaroid 600", "Polaroid SX-70", "Yashica T4"],
    (x) => `Camera: ${x}; casual analog snapshot character, simple optics, honest flash falloff and subtly imperfect corners.`),
  ...group("camera", "Capteur trouvé", ["Doorbell CAM", "GoPro HERO", "Insta360 X4", "iPhone Pro", "OLD Android Phone", "Security Camera", "Webcam"],
    (x) => `Camera: ${x}; found-footage sensor realism, automatic exposure errors, ordinary compression and an unpolished captured moment.`),
  ...group("camera", "Vidéo analogique et broadcast", ["VHS Camera", "Hi8 Handycam", "U-matic ENG", "Betacam SP ENG", "MiniDV Camcorder"],
    (x) => `Camera: ${x}; period-correct video electronics, interlaced motion, limited dynamic range, chroma instability and authentic broadcast or consumer handling.`)
];

const films = [
  ...group("film", "Négatif couleur", ["Agfa Vista", "Ektar 100", "Fuji Pro 400H", "Fuji Superia 400", "Fujicolor Pro", "Kodak Gold 200", "Kodak Ultramax 400", "Portra 160", "Portra 400", "Portra 800"],
    (x) => `Film/support: ${x}; natural color-negative latitude, tactile grain, forgiving exposure and credible skin-tone response.`),
  ...group("film", "Film cinéma", ["CineStill 50D", "CineStill 800T", "Kodak Vision3 250D", "Kodak Vision3 500T", "Kodak Vision3 IMAX"],
    (x) => `Film/support: ${x}; motion-picture latitude, visible grain, restrained color response and smooth highlight roll-off.`),
  ...group("film", "Diapositive", ["Ektachrome E100", "Kodachrome 64", "Provia 100F", "Velvia 100"],
    (x) => `Film/support: ${x}; dense slide-film color separation, crisp highlights and a precise, slightly unforgiving exposure window.`),
  ...group("film", "Noir et blanc", ["Fuji Acros 100", "Ilford Delta", "Ilford HP5 Plus", "Ilford XP2 Super", "Kodak Tri-X 400", "Lomography Berlin Kino B&W"],
    (x) => `Film/support: ${x}; monochrome tonal discipline, material separation, honest grain and firm but printable contrast.`),
  ...group("film", "Expérimental", ["LomoChrome Metropolis", "LomoChrome Turquoise", "Lomography Color Tiger", "Lomography Lady Grey 400", "Lomography Lobster Redscale", "Lomography Purple"],
    (x) => `Film/support: ${x}; controlled analog color shifts, tactile imperfections and deliberately unstable tonal bias.`),
  ...group("film", "Bande vidéo", ["VHS SP Magnetic Tape", "VHS EP Worn Tape", "U-matic Broadcast Tape", "Betacam SP Magnetic Tape", "Hi8 Metal Tape", "MiniDV Tape"],
    (x) => `Film/support: ${x}; period-authentic tape texture, interlace structure, generational loss and limited chroma resolution.`)
];

const lighting = [
  ...group("lighting", "Lumière disponible", ["Blue Hour", "Golden Hour", "Midday Sun", "Moonlight", "Natural Daylight", "Open Shade", "Overcast Lighting", "Window Spill"],
    (x) => `Lighting: ${x}; physically motivated available light, believable color temperature, natural falloff and environmental continuity.`),
  ...group("lighting", "Studio contrôlé", ["Bounce Lighting", "Broad Lighting", "Gobo Lighting", "High-Key Lighting", "Loop Lighting", "Paramount Lighting", "Product Side Key", "Rembrandt Lighting", "Ring Light", "Soft Lighting", "Softbox Key Lighting", "Split Lighting", "Three-Point Lighting", "Top-Down Flat Lay", "Top Lighting"],
    (x) => `Lighting: ${x}; controlled source placement, readable shadow geometry, intentional specular behavior and clear subject separation.`),
  ...group("lighting", "Pratiques", ["Candlelight", "Direct Flash", "LED Streetlights", "Motivated Lighting", "Neon Lighting", "Phone Flashlight", "Practical Lighting", "Shopfront Fluorescents", "Sodium Streetlamps", "ENG On-Camera Light", "CRT Studio Tungsten"],
    (x) => `Lighting: ${x}; motivated practical sources, imperfect spill, realistic local highlights and period-correct mixed color temperature.`),
  ...group("lighting", "Expressif", ["Backlighting / Rim Lighting", "Chiaroscuro Lighting", "Color Gels", "Fog Diffusion", "Hard Lighting", "Low-Key Lighting", "Rim + Soft Fill", "Silhouette Shadows", "Teal and Orange", "Underlighting", "Volumetric Lighting"],
    (x) => `Lighting: ${x}; expressive but coherent contrast, sculpted depth cues and a grounded cinematic atmosphere.`)
];

const lenses = [
  ["14mm Rectilinear", "ultra-wide rectilinear geometry, strong spatial expansion, straight lines and assertive foreground scale"],
  ["18mm Vintage Wide", "immersive perspective, mild edge softness, visible breathing and imperfect flare control"],
  ["24mm Spherical", "energetic wide framing, clear environmental context, natural distortion and controlled deep focus"],
  ["28mm Documentary", "intimate observational distance, modest perspective stretch and practical available-light behavior"],
  ["35mm Street", "human-scale perspective, balanced environment-to-subject relationship and restrained depth separation"],
  ["40mm Pancake", "unobtrusive camera presence, neutral perspective and slightly abrupt focus falloff"],
  ["50mm Standard", "natural perspective, moderate depth compression and clean subject separation without glamour distortion"],
  ["58mm Helios Swirl", "soft contrast wide open, swirled peripheral bokeh, amber flare and imperfect coated-glass response"],
  ["75mm Portrait", "gentle facial compression, shallow but readable depth and smooth foreground-to-background transition"],
  ["85mm Portrait", "flattering compression, shallow depth of field, precise eye focus and creamy distant bokeh"],
  ["100mm Macro", "close focusing, clinical micro-texture, compressed space and an extremely narrow focal plane"],
  ["135mm Telephoto", "strong spatial compression, isolated subject planes and softened background geometry"],
  ["200mm Long Lens", "pronounced telephoto compression, distant observation and thin atmospheric depth layers"],
  ["24mm Anamorphic", "expansive horizontal field, curved edge geometry, oval bokeh and horizontal flare"],
  ["40mm Anamorphic", "cinematic horizontal compression, oval bokeh, subtle edge falloff and restrained streak flare"],
  ["75mm Anamorphic", "compressed portrait space, oval bokeh, shallow focus and elegant horizontal flare"],
  ["B4 ENG Servo Zoom", "deep focus, compressed television perspective, rapid servo reframing and period ENG edge response"],
  ["Camcorder Motor Zoom", "small-sensor deep focus, variable aperture, electronic zoom cadence and modest corner resolution"],
  ["Probe Lens", "near-ground viewpoint, extreme close focus, deep perspective and miniature-scale movement"],
  ["Tilt-Shift 45mm", "corrected verticals, deliberate focus-plane rotation and measured architectural perspective"],
  ["Fisheye 8mm", "180-degree field of view, extreme barrel distortion and unmistakable curved spatial geometry"]
].map(([label, text]) => ({ id: `lens-${slug(label)}`, label, family: "Optique", append: `Lens: ${text}.` }));

export const CAPTURE_DNA_CATALOG = Object.freeze({ cameras, films, lighting, lenses });

const preset = (id, label, camera, lens, film, light, finish) => ({
  id: `preset-${id}`, label, camera: `camera-${slug(camera)}`, lens: `lens-${slug(lens)}`,
  film: `film-${slug(film)}`, lighting: `lighting-${slug(light)}`, finish
});

export const BUILTIN_CAPTURE_PRESETS = Object.freeze([
  preset("vhs-1986", "VHS familial · 1986", "VHS Camera", "Camcorder Motor Zoom", "VHS SP Magnetic Tape", "Practical Lighting", "1986 home video: PAL interlacing, soft autofocus, head-switching noise, chroma bleed, tape dropouts, candid handheld timing and strict 4:3 framing."),
  preset("ina-1987", "Documentaire INA · 1987", "Betacam SP ENG", "B4 ENG Servo Zoom", "Betacam SP Magnetic Tape", "ENG On-Camera Light", "French INA television documentary, 1987: shoulder-mounted ENG operation, PAL 625-line interlacing, restrained newsroom color, practical zoom corrections and broadcast-safe 4:3 composition; no modern cinematic grading."),
  preset("ortf-1968", "Actualités ORTF · 1968", "16mm Film Camera", "28mm Documentary", "Kodak Tri-X 400", "Natural Daylight", "French television newsreel archive, 1968: hurried 16mm field coverage, high-contrast monochrome print, occasional exposure pumping, optical dust and sober observational framing."),
  preset("super16-1979", "Reportage Super 16 · 1979", "Aaton XTR", "28mm Documentary", "Kodak Vision3 250D", "Natural Daylight", "Late-1970s Super 16 reportage: shoulder-held patience, practical focus pulls, tactile grain, quiet zoom reframing and unembellished location realism."),
  preset("tv-1974", "Plateau TV français · 1974", "U-matic ENG", "B4 ENG Servo Zoom", "U-matic Broadcast Tape", "CRT Studio Tungsten", "1974 French multi-camera studio television: warm tube response, flat tungsten coverage, highlight bloom, slight chroma lag, visible interlace and formal 4:3 blocking."),
  preset("tokusatsu-1975", "Tokusatsu 16 mm · 1975", "Bolex H16", "24mm Spherical", "Kodak Vision3 500T", "Hard Lighting", "Practical Japanese television effects photography: miniature-scale water, overcranked impacts, optical compositing, halated pyrotechnics, faded color, gate weave and visible suit-scale staging."),
  preset("betacam-1993", "Journal Betacam · 1993", "Betacam SP ENG", "B4 ENG Servo Zoom", "Betacam SP Magnetic Tape", "ENG On-Camera Light", "Early-1990s local television news: direct ENG coverage, quick servo zooms, deep focus, hard top-mounted light, modest chroma noise and neutral broadcast white balance."),
  preset("hi8-1998", "Journal Hi8 · 1998", "Hi8 Handycam", "Camcorder Motor Zoom", "Hi8 Metal Tape", "Practical Lighting", "Late-1990s Hi8 video diary: handheld framing, autofocus hunting, clipped highlights, electronic sharpness, chroma crawl and intimate accidental timing."),
  preset("minidv-2003", "Documentaire MiniDV · 2003", "MiniDV Camcorder", "Camcorder Motor Zoom", "MiniDV Tape", "Overcast Lighting", "Early-2000s MiniDV documentary: crisp interlaced edges, small-sensor deep focus, abrupt auto-exposure, practical zooms, muted digital color and no film emulation."),
  preset("fashion-1996", "Éditorial flash · 1996", "Contax T2", "35mm Street", "Portra 400", "Direct Flash", "Mid-1990s candid fashion editorial: frontal compact flash, slightly off-axis crop, visible grain, modest red-eye risk and an expensive image made from an ordinary moment."),
  preset("digicam-2006", "Digicam nocturne · 2006", "Compact Camera", "28mm Documentary", "Fuji Superia 400", "Direct Flash", "Mid-2000s pocket-digital snapshot: tiny-sensor noise, aggressive sharpening, blown flash highlights, weak shadow color, imperfect white balance and candid social framing."),
  preset("cinema-500t", "Cinéma nocturne 500T", "ARRI Alexa 35", "40mm Anamorphic", "Kodak Vision3 500T", "Motivated Lighting", "Grounded contemporary night cinematography: tungsten-biased practicals, protected highlights, textured blacks, controlled anamorphic artifacts and no synthetic teal-orange wash."),
  preset("nouvelle-vague-1962", "Nouvelle Vague · 1962", "16mm Film Camera", "28mm Documentary", "Kodak Tri-X 400", "Natural Daylight", "Early-1960s French New Wave street photography: nimble handheld observation, available light, hard monochrome grain, spontaneous reframing, honest locations and no polished studio finish."),
  preset("prestige-70mm", "Prestige 70 mm", "ARRI Alexa 65", "75mm Anamorphic", "Kodak Vision3 IMAX", "Soft Lighting", "Large-format prestige cinema: patient monumental framing, fine-grained tonal depth, gentle facial compression, controlled highlights, dense production design and restrained camera movement."),
  preset("super8-summer-1977", "Été Super 8 · 1977", "8mm Film Camera", "18mm Vintage Wide", "Kodak Gold 200", "Golden Hour", "Warm late-1970s Super 8 memory: compact handheld camera, soft corners, visible grain, occasional flare, golden backlight, brief exposure flicker and intimate family-scale timing."),
  preset("hong-kong-neon-1989", "Néon Hong Kong · 1989", "Aaton XTR", "40mm Anamorphic", "Kodak Vision3 500T", "Neon Lighting", "Late-1980s urban night cinema: humid air, saturated practical neon, halated highlights, deep textured shadows, compressed street layers and controlled anamorphic flare."),
  preset("film-noir-1948", "Film noir · 1948", "35mm Film Camera", "50mm Standard", "Ilford HP5 Plus", "Chiaroscuro Lighting", "Classical late-1940s noir: hard motivated key, venetian shadow geometry, smoke-softened depth, rich monochrome blacks, precise blocking and no modern glossy fill."),
  preset("fashion-6x6-1972", "Mode 6×6 · 1972", "Hasselblad 500CM", "75mm Portrait", "Ektachrome E100", "Broad Lighting", "Early-1970s medium-format fashion editorial: square-minded composition, crisp textile rendering, dense slide color, controlled broad key and poised minimal gestures."),
  preset("paparazzi-2001", "Paparazzi · 2001", "Canon EOS 5D", "135mm Telephoto", "Fuji Superia 400", "Direct Flash", "Turn-of-the-millennium paparazzi photograph: long-lens compression, hurried crop, frontal flash, crowded background layers, slightly harsh digital-era color and accidental celebrity framing."),
  preset("cctv-1999", "CCTV parking · 1999", "Security Camera", "14mm Rectilinear", "VHS EP Worn Tape", "Sodium Streetlamps", "Late-1990s parking-lot surveillance: locked high angle, very wide lens, low frame cadence, timestamp-era compression, sodium color cast, smeared motion and worn-tape noise."),
  preset("doorbell-2024", "Doorbell cam · 2024", "Doorbell CAM", "Fisheye 8mm", "MiniDV Tape", "LED Streetlights", "Contemporary doorbell-camera realism: fixed fisheye view, aggressive auto exposure, infrared-adjacent night color, block compression, clipped porch highlights and unperformed action."),
  preset("webcam-2010", "Webcam laptop · 2010", "Webcam", "24mm Spherical", "MiniDV Tape", "Window Spill", "Early-2010s laptop webcam: low resolution, cool automatic white balance, rolling exposure, compressed skin tones, static eye-level framing and ordinary room spill."),
  preset("iphone-verite", "iPhone vérité", "iPhone Pro", "28mm Documentary", "Portra 400", "Natural Daylight", "Contemporary phone-shot vérité: immediate handheld proximity, computational highlight control kept subtle, natural autofocus transitions, believable stabilization and no commercial polish."),
  preset("gopro-action", "Action cam immersive", "GoPro HERO", "Fisheye 8mm", "Fuji Superia 400", "Midday Sun", "Immersive action-camera capture: body-mounted energy, extreme field of view, deep focus, abrupt exposure adaptation, wind-battered motion and physically credible vibration."),
  preset("overcast-social-doc", "Documentaire social couvert", "Sony FX6", "35mm Street", "Fuji Pro 400H", "Overcast Lighting", "Quiet contemporary social documentary: shoulder-level observation, soft overcast skin tones, respectful distance, restrained focus pulls and neutral non-advertising color."),
  preset("music-video-1984", "Clip pop gélatines · 1984", "U-matic ENG", "B4 ENG Servo Zoom", "U-matic Broadcast Tape", "Color Gels", "1984 studio music video: saturated gel pools, theatrical haze, tube-camera bloom, choreographed servo zooms, visible interlace and graphic performance blocking."),
  preset("luxury-commercial", "Publicité luxe propre", "ARRI Alexa 65", "100mm Macro", "CineStill 50D", "Product Side Key", "Premium product advertising: immaculate material separation, slow precise camera movement, controlled specular edges, deep tonal polish, fine micro-texture and disciplined negative space."),
  preset("polaroid-1978", "Polaroid domestique · 1978", "Polaroid SX-70", "50mm Standard", "Kodak Gold 200", "Window Spill", "Late-1970s domestic instant photograph: warm color drift, soft emulsion detail, gentle window spill, imperfect centering, quiet intimacy and a tactile instant-print response."),
  preset("lomo-underground-1991", "Lomo underground · 1991", "Lomo LC-A", "35mm Street", "LomoChrome Metropolis", "Practical Lighting", "Early-1990s underground snapshot: strong vignette, unstable mixed light, muted industrial color, casual off-axis framing, compact-camera flash risk and tactile lab imperfections."),
  preset("moonlit-horror", "Horreur au clair de lune", "ARRI Alexa 35", "24mm Anamorphic", "Kodak Vision3 500T", "Moonlight", "Grounded moonlit horror: cold directional night source, large areas of readable darkness, restrained mist, distant silhouette separation, patient wide framing and no artificial blue wash."),
  preset("architecture-precision", "Architecture précision", "Phase One XF IQ4", "Tilt-Shift 45mm", "Ektar 100", "Open Shade", "High-resolution architectural study: corrected verticals, exact material color, measured open-shade contrast, layered spatial depth, deliberate focus plane and no exaggerated real-estate HDR."),
  preset("macro-laboratory", "Macro laboratoire", "Hasselblad X1D II", "100mm Macro", "CineStill 50D", "Top-Down Flat Lay", "Scientific macro tabletop: exact scale cues, extremely narrow focal plane, soft controlled reflections, neutral color, precise top-down geometry and clinical micro-texture without synthetic sharpening.")
]);

export const EMPTY_CAPTURE_DNA = Object.freeze({ camera: "", film: "", lighting: "", lens: "", presetId: "", finish: "" });
export const APPEND_CAPTURE_DNA_PATTERN = /(?:\r?\n){2}Capture DNA —[^\r\n]*\s*$/u;

export function normalizeCaptureDna(value = {}) {
  return Object.fromEntries(Object.keys(EMPTY_CAPTURE_DNA).map((key) => [
    key, typeof value[key] === "string" ? value[key].slice(0, key === "finish" ? 1200 : 160) : ""
  ]));
}

export function captureDnaOption(kind, id) {
  const catalogKey = ({ lens: "lenses", lighting: "lighting" })[kind] || `${kind}s`;
  return (CAPTURE_DNA_CATALOG[catalogKey] || []).find((item) => item.id === id) || null;
}

export function buildCaptureDnaSuffix(value = {}) {
  const current = normalizeCaptureDna(value);
  const parts = [captureDnaOption("camera", current.camera)?.append,
    captureDnaOption("lens", current.lens)?.append, captureDnaOption("film", current.film)?.append,
    captureDnaOption("lighting", current.lighting)?.append,
    current.finish.trim() ? `Capture signature: ${current.finish.trim()}` : ""].filter(Boolean);
  return parts.length ? `Capture DNA — ${parts.join(" ")}` : "";
}

export function appendCaptureDna(prompt, selection) {
  const base = String(prompt || "").trimEnd();
  const suffix = buildCaptureDnaSuffix(selection);
  if (!suffix) return base;
  const clean = removeCaptureDna(base);
  return `${clean}${clean ? "\n\n" : ""}${suffix}`;
}

export function removeCaptureDna(prompt) {
  return String(prompt || "").replace(APPEND_CAPTURE_DNA_PATTERN, "").trimEnd();
}

export function createCaptureDnaPreset({ id, name, selection }) {
  const label = String(name || "").trim().slice(0, 60);
  if (!label) throw new Error("Donne un nom au preset.");
  const normalized = normalizeCaptureDna(selection);
  if (!buildCaptureDnaSuffix(normalized)) throw new Error("Choisis au moins un élément Capture DNA.");
  return { id: String(id || `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`), label, custom: true, ...normalized };
}
