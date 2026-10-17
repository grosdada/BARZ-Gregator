export const OPENAI_MODELS = [
  { id: "gpt-5.1", label: "GPT-5.1", note: "Best semantic mix" },
  { id: "gpt-5-mini", label: "GPT-5 mini", note: "Fast, smart" },
  { id: "gpt-5-nano", label: "GPT-5 nano", note: "Cheaper drafts" },
  { id: "gpt-4.1", label: "GPT-4.1", note: "Sharp non-reasoning" },
  { id: "gpt-4.1-mini", label: "GPT-4.1 mini", note: "Fast fallback" }
];

const basePools = {
  surreal: {
    subjects: ["a Victorian librarian cataloging unwritten memories", "a crystalline elephant with transparent memories", "a notary negotiating with gravity", "a woman composed of alphabetic rain"],
    actions: ["exchanges secrets with", "plays chess against", "dissolves into", "waltzes through"],
    objects: ["portraits that sketch themselves backward", "clocks melting into puddles of time", "windows opening to impossible landscapes", "melodies crystallized into frozen geometries"],
    settings: ["inside forgotten elevators between non-existent floors", "beneath the syntax of extinct languages", "under a sky of inverted stars", "within the architecture of conversations"],
    styles: ["dreamlike chiaroscuro", "hyper-real impossible geometry", "soft cinematic haze", "lucid dream logic"],
    tones: ["quiet wonder", "controlled disorientation", "elegant unease", "poetic absurdity"]
  },
  kafkian: {
    subjects: ["a clerk whose desk demands wages", "an archivist cataloging his own memories", "a citizen whose identity was revoked by decree", "a judge pronouncing sentences in dreams"],
    actions: ["submits a request in triplicate to", "waits for approval from", "is audited by", "is slowly absorbed by"],
    objects: ["forms demanding impossible proofs", "paper that rewrites itself into tautologies", "stamps of unverifiable authenticity", "walls of procedural paradox"],
    settings: ["in a corridor of anonymous doors", "beneath fluorescent office silence", "inside a courtroom without charges", "at the gate of an unreachable castle"],
    styles: ["clinical observation", "mundane architecture", "formal bureaucratic language", "precise suffocation"],
    tones: ["institutional irony", "quiet dread", "procedural absurdity", "dry administrative menace"]
  },
  dada: {
    subjects: ["an orphaned sock promoted to CEO", "a cactus wearing reading glasses", "a soup spoon in jogging attire", "a manifesto written by spilled coffee"],
    actions: ["interrupts a solemn ceremony using", "collages itself onto", "deconstructs", "declares war on"],
    objects: ["a velvet stapler", "a staircase made of receipts", "a meaningless medal", "a newspaper with the weather removed"],
    settings: ["in a boardroom with no table", "during a museum fire drill", "inside a sentence that refuses grammar", "at a parade for obsolete meanings"],
    styles: ["deliberate incoherence", "collage logic", "anti-advertising typography", "precise nonsense"],
    tones: ["joyful disruption", "anti-logic", "dry provocation", "ceremonial nonsense"]
  },
  topor: {
    subjects: ["a bird-man with an interminable nose", "a pianist whose fingers become serpents", "a landlord smiling too politely", "a tiny tyrant inside a porcelain room"],
    actions: ["undergoes grotesque metamorphosis alongside", "politely persecutes", "laughs through", "offers tea to"],
    objects: ["a mirror that dislikes faces", "a table set for social humiliation", "a bouquet of folded accusations", "a theatrical mask with wet eyes"],
    settings: ["inside a cramped apartment salon", "behind a velvet theater curtain", "at a dinner party turning hostile", "on a stage lit by surgical lamps"],
    styles: ["surgical caricature", "ink-black satire", "grotesque elegance", "claustrophobic framing"],
    tones: ["polite cruelty", "social rot", "misanthropic comedy", "smiling menace"]
  },
  fantastic: {
    subjects: ["a dragon woven from threads of starlight", "a mechanical steam-powered unicorn", "a phoenix reborn as holograms", "a guardian spirit composed of bioluminescent vegetation"],
    actions: ["invokes ancient magic before", "crosses a dimensional portal toward", "deciphers forgotten runes concerning", "forges a mystical alliance with"],
    objects: ["a crown of singing minerals", "a lantern containing a tiny weather system", "a sword grown from coral", "an atlas of impossible kingdoms"],
    settings: ["in a floating citadel over a violet sea", "inside a forest of glass leaves", "at the mouth of a sleeping volcano", "beneath moons arranged like jewels"],
    styles: ["opulent fantasy illustration", "mythic scale", "ornate magical realism", "rich creature detail"],
    tones: ["awe", "enchanted tension", "legendary mystery", "wonder with danger"]
  },
  liminal: {
    subjects: ["a blurry silhouette at the end of the corridor", "a presence existing only in transitional zones", "an entity made of echoes", "a person waiting in a place that forgot its purpose"],
    actions: ["hovers beside", "waits beneath", "repeats silently around", "fades into"],
    objects: ["a vending machine humming in an empty hall", "a motel key for a missing room", "a wet carpet reflecting no ceiling", "a plastic chair under fluorescent light"],
    settings: ["in an abandoned indoor pool", "inside an empty airport at 3 a.m.", "beneath a mall escalator after closing", "in a hallway that loops gently"],
    styles: ["fluorescent stillness", "wide empty framing", "washed-out institutional color", "uncanny realism"],
    tones: ["quiet unease", "nostalgic dread", "suspended time", "soft alienation"]
  },
  baroque: {
    subjects: ["an aristocrat adorned with lace and velvet", "a baroque angel with sculpted wings", "a royal figure crowned with gemstones", "a deity draped in precious fabrics"],
    actions: ["presides over", "blesses", "collapses theatrically beside", "offers a gilded decree to"],
    objects: ["a gold reliquary full of insects", "a velvet throne with human posture", "a chandelier dripping wax and pearls", "a marble cherub holding a receipt"],
    settings: ["inside a candlelit palace gallery", "beneath painted ceilings of divine paperwork", "at an overloaded banquet table", "inside a chapel of red silk"],
    styles: ["chiaroscuro drama", "ornate gold detailing", "painterly excess", "luxurious theatrical composition"],
    tones: ["decadence", "sacred absurdity", "royal tension", "ceremonial excess"]
  },
  cosmic: {
    subjects: ["an entity composed of nebulae and stardust", "an interdimensional traveler made of quantum void", "a consciousness distributed across galaxies", "a cosmic observer outside linear time"],
    actions: ["folds spacetime around", "listens to", "transmits dreams through", "orbits"],
    objects: ["a black hole shaped like an office stamp", "a satellite covered in moss", "a comet carrying handwritten notes", "a telescope pointed inward"],
    settings: ["at the edge of a collapsing galaxy", "inside a nebula of pure thought", "on a moonlit observatory platform", "across a silent starfield"],
    styles: ["vast scale", "celestial color fields", "deep-space contrast", "astronomical surrealism"],
    tones: ["cosmic awe", "existential quiet", "astral mystery", "transcendent solitude"]
  },
  organic: {
    subjects: ["a creature of moss and intertwined roots", "a symbiotic being fused with fungi", "a living form composed of sap and chlorophyll", "a plant entity with branching limbs"],
    actions: ["grows through", "pollinates", "wraps itself around", "breathes with"],
    objects: ["a seed pod shaped like a camera", "a table made of living bark", "a mycelium network spelling a warning", "a flower blooming small tools"],
    settings: ["in a greenhouse after rain", "inside a cathedral overtaken by vines", "beneath a canopy of wet leaves", "in a laboratory reclaimed by roots"],
    styles: ["macro botanical texture", "moist organic detail", "biomorphic design", "natural material realism"],
    tones: ["sensuous growth", "soft mutation", "living mystery", "earthy strangeness"]
  },
  industrial: {
    subjects: ["a worker merged with a pneumatic tool", "a steam engine that developed consciousness", "an autonomous factory automaton", "a giant clockwork mechanism taking human form"],
    actions: ["compresses", "manufactures", "welds itself to", "grinds slowly beside"],
    objects: ["a conveyor belt carrying memories", "a pressure gauge reading guilt", "a steel lunchbox full of sparks", "a machine part polished like jewelry"],
    settings: ["inside a rusted factory hall", "beneath a ceiling of pipes", "on an assembly line at dawn", "inside a power plant control room"],
    styles: ["hard metal texture", "steam and sparks", "utilitarian framing", "mechanical precision"],
    tones: ["heavy labor", "machine melancholy", "cold pressure", "industrial awe"]
  },
  murky: {
    subjects: ["a figure obscured by layers of sediment", "a form barely visible through murky water", "a silhouette distorted by fog and decay", "a presence half-dissolved in shadows"],
    actions: ["rises from", "stains", "drifts beneath", "pulls light into"],
    objects: ["a tarnished mirror under black water", "a drowned lamp still glowing", "a velvet glove full of silt", "a cracked tile with something moving below"],
    settings: ["in a flooded basement", "beside a stagnant canal", "inside a room sweating through wallpaper", "under fog at the edge of a pier"],
    styles: ["low-visibility texture", "wet decay", "muted green-brown shadows", "obscured composition"],
    tones: ["visceral unease", "slow rot", "swampy dread", "heavy atmosphere"]
  },
  jungian: {
    subjects: ["the Shadow archetype manifesting in physical form", "an Anima figure emerging from the collective unconscious", "a Wise Old Man from the depths of the psyche", "the Self attempting integration"],
    actions: ["encounters", "mirrors", "integrates", "dreams through"],
    objects: ["a cracked mask with two expressions", "a mandala drawn in ash", "a key from a childhood dream", "a mirror divided into symbols"],
    settings: ["inside a symbolic cave", "at the edge of a dream forest", "beneath a staircase into the unconscious", "inside a room arranged like a psyche map"],
    styles: ["symbolic composition", "archetypal staging", "dream analysis imagery", "ritual geometry"],
    tones: ["psychic tension", "mythic introspection", "inner confrontation", "numinous mystery"]
  },
  freudian: {
    subjects: ["an Id creature driven by pure desire", "a Super-Ego construct enforcing impossible standards", "an Ego mediating contradictory impulses", "a repressed memory taking corporeal shape"],
    actions: ["projects itself onto", "suppresses", "confesses to", "sublimates"],
    objects: ["a couch floating in a sealed room", "a locked cabinet full of childhood wallpaper", "a porcelain teacup trembling with desire", "a staircase descending into a mouth"],
    settings: ["inside a psychoanalyst's office after midnight", "behind red velvet curtains", "in a dream version of a family dining room", "beneath a ceiling fan turning too slowly"],
    styles: ["symbolic domestic realism", "psychosexual surrealism", "soft clinical lighting", "dreamlike interior detail"],
    tones: ["repression", "private anxiety", "desire under pressure", "intimate unease"]
  },
  peewee: {
    subjects: ["a man-child in an oversized bow tie", "a hyperactive character with a painted bicycle", "a grinning eccentric surrounded by talking furniture", "a theatrical personality in a cluttered playhouse"],
    actions: ["performs a ritual with", "juggles", "overreacts to", "builds a tiny parade around"],
    objects: ["a breakfast machine gone philosophical", "a talking chair with stage fright", "a toy telephone that predicts rain", "a bicycle sparkling under studio lights"],
    settings: ["inside a colorful playhouse set", "on a miniature soundstage", "at a cartoonishly tidy breakfast table", "beneath theatrical candy-colored lighting"],
    styles: ["bright practical set design", "playhouse comedy timing", "toy-like production design", "clean slapstick framing"],
    tones: ["wacky precision", "childlike mania", "deadpan silliness", "bright absurdity"]
  },
  absurdad: {
    subjects: ["a spokesperson for a product that does not exist", "a luxury brand ambassador for impossible feelings", "a corporate mascot selling emotional weather", "a premium perfume bottle containing a small office"],
    actions: ["unveils", "demonstrates", "endorses", "rebrands"],
    objects: ["a subscription service for deja vu", "a moisturizer for memories", "a kitchen appliance that negotiates desire", "a watch that measures social pressure"],
    settings: ["on a spotless product photography set", "inside a glossy late-night infomercial", "against a clean cyclorama with premium reflections", "inside a commercial kitchen lit like jewelry"],
    styles: ["clean commercial lighting", "premium product macro detail", "polished campaign art direction", "sharp studio reflections"],
    tones: ["deadpan persuasion", "glossy absurdity", "expensive nonsense", "satirical desirability"]
  },
  cinematic: {
    subjects: ["a lone production designer inside a ruined set", "a courier carrying a forbidden object", "a retired stunt performer rehearsing alone", "a rival director filming the same dream"],
    actions: ["tracks past", "reveals", "crosses paths with", "pushes slowly toward"],
    objects: ["a rain-soaked practical spotlight", "a cracked monitor showing tomorrow's take", "a dolly track leading into fog", "a red script page with no dialogue"],
    settings: ["on a deserted backlot at blue hour", "inside a neon motel hallway", "under sodium streetlights after rain", "in a smoke-filled soundstage"],
    styles: ["anamorphic lens flare", "motivated practical lighting", "wide cinematic blocking", "high-contrast color grade"],
    tones: ["tense restraint", "melancholic spectacle", "slow-burn mystery", "controlled intensity"]
  },
  amateur: {
    subjects: ["a nervous first-timer holding a cheap camcorder", "an enthusiastic hobbyist with consumer-grade equipment", "a trembling hand documenting something too late", "a local TV crew losing signal"],
    actions: ["accidentally captures", "zooms too far into", "loses focus on", "pans shakily across"],
    objects: ["VHS static forming a message", "a timecode that skips forward", "a cheap tripod sliding out of frame", "a microphone catching distant laughter"],
    settings: ["in a suburban kitchen at night", "inside a community center basement", "on a local access studio set", "at a parking lot after a storm"],
    styles: ["found footage texture", "consumer video grain", "bad autofocus", "date-stamped VHS realism"],
    tones: ["uneasy authenticity", "cheap paranormal tension", "awkward realism", "accidental comedy"]
  },
  modernart: {
    subjects: ["a deconstructed human form in primary colors", "an abstract assemblage questioning representation", "a conceptual piece challenging viewer perception", "a minimalist figure reduced to essential geometry"],
    actions: ["interrogates", "reframes", "deconstructs", "installs itself beside"],
    objects: ["a plinth holding nothing but a label", "a canvas cut into polite arguments", "a chrome chair refusing function", "a gallery wall with institutional doubt"],
    settings: ["inside a white cube gallery", "at an opening night with too much silence", "beneath museum track lighting", "inside an installation of repeated objects"],
    styles: ["conceptual art documentation", "gallery minimalism", "clean critical composition", "modernist restraint"],
    tones: ["intellectual provocation", "dry critique", "cool distance", "aesthetic tension"]
  },
  editorial: {
    subjects: ["a model styled as an impossible archivist", "a chef posed like a museum artifact", "a business figure wearing ceremonial officewear", "a fashion portrait of a quiet scandal"],
    actions: ["poses beside", "interrogates", "wears", "reinterprets"],
    objects: ["an oversized prop invoice", "a sculptural chrome appliance", "a silk banner with missing text", "a glass perfume bottle filled with fog"],
    settings: ["in a sparse fashion studio", "against a magazine cover backdrop", "inside a brutalist gallery corridor", "beneath precise editorial softboxes"],
    styles: ["high-fashion art direction", "clean negative space", "controlled wardrobe styling", "premium magazine lighting"],
    tones: ["cool confidence", "detached glamour", "sharp wit", "luxury restraint"]
  },
  jpmonster: {
    subjects: ["a kaiju emerging from Tokyo Bay", "a yokai spirit taking monstrous physical form", "a daikaiju covered in radioactive scales", "a giant creature born from industrial pollution"],
    actions: ["rises behind", "crushes", "protects", "roars toward"],
    objects: ["a miniature city street", "a neon billboard flickering under scale dust", "a train carried like a ribbon", "a warning siren glowing red"],
    settings: ["above Tokyo Bay at night", "between dense city towers", "in a storm over a miniature skyline", "near an industrial harbor"],
    styles: ["tokusatsu scale", "suitmation texture", "dramatic city lighting", "monster movie spectacle"],
    tones: ["colossal danger", "camp awe", "radioactive tragedy", "operatic destruction"]
  },
  spaceopera: {
    subjects: ["a decorated admiral of the Galactic Federation", "a rogue space captain with a mysterious past", "an alien diplomat from a distant nebula", "a cybernetically enhanced star pilot"],
    actions: ["negotiates with", "commands", "escapes through", "broadcasts across"],
    objects: ["a star cruiser bridge full of holograms", "a ceremonial plasma saber", "a diplomatic orb pulsing with threats", "a nebula map carved in metal"],
    settings: ["on the bridge of a vast starship", "inside an orbital palace", "near a wormhole battlefield", "across a glowing alien senate"],
    styles: ["grand sci-fi scale", "sleek starship design", "opera lighting", "heroic cosmic framing"],
    tones: ["epic stakes", "romantic danger", "galactic intrigue", "noble melodrama"]
  },
  horror80s: {
    subjects: ["a masked killer in a hockey mask", "a possessed teenager with supernatural abilities", "a creature spawned from VHS static", "a slasher figure emerging from suburban darkness"],
    actions: ["stalks", "appears behind", "scratches messages into", "breathes through"],
    objects: ["a CRT television glowing blue", "a blood-red telephone", "a kitchen knife reflecting neon", "a yearbook with faces crossed out"],
    settings: ["inside a suburban bedroom at midnight", "beneath mall parking lot lights", "in a foggy summer camp cabin", "on a rain-soaked cul-de-sac"],
    styles: ["1980s horror lighting", "practical effects texture", "VHS grain", "neon shadows"],
    tones: ["slasher suspense", "teen nightmare", "campy menace", "retro dread"]
  },
  brutalist: {
    subjects: ["a concrete monolith in human form", "a brutalist structure given consciousness", "an angular figure of raw concrete and rebar", "a geometric being composed of exposed aggregate"],
    actions: ["looms over", "compresses", "casts a hard shadow across", "contains"],
    objects: ["a concrete stairwell with no exit", "a rebar halo", "a public bench shaped like authority", "a window slit emitting warm light"],
    settings: ["inside a civic plaza of raw concrete", "beneath an overpass in winter light", "in a monumental housing block", "inside a severe municipal atrium"],
    styles: ["raw concrete texture", "hard geometric composition", "architectural severity", "monumental scale"],
    tones: ["austere power", "urban isolation", "weight", "institutional calm"]
  },
  vaporwave: {
    subjects: ["a glitched figure from a 1987 corporate training video", "a chromatic aberration entity in pastel tones", "a Roman bust rendered in low-poly 3D", "a VHS-distorted businessman frozen in time"],
    actions: ["floats beside", "loops through", "buffers inside", "advertises"],
    objects: ["a marble bust with scanlines", "a pastel grid horizon", "a translucent desktop computer", "a soda can reflecting sunset gradients"],
    settings: ["inside a dead mall full of pink light", "on an infinite checkerboard grid", "beneath a synthetic sunset", "inside a corporate lobby from a forgotten future"],
    styles: ["VHS scanlines", "pastel neon glow", "retro computer graphics", "mallsoft atmosphere"],
    tones: ["synthetic nostalgia", "soft corporate sadness", "ironic serenity", "glitched glamour"]
  },
  filmnoir: {
    subjects: ["a hard-boiled detective in a trench coat", "a femme fatale with a dangerous secret", "a corrupt politician lit by venetian blinds", "a private eye nursing bourbon and regrets"],
    actions: ["questions", "shadows", "betrays", "lights a cigarette beside"],
    objects: ["a revolver in a desk drawer", "a rain-streaked window", "a black telephone ringing once", "a file stamped confidential"],
    settings: ["in a smoky office at midnight", "under wet alleyway neon", "behind venetian blind shadows", "inside a hotel room with one lamp"],
    styles: ["high-contrast black and white", "venetian blind lighting", "hard shadows", "classic noir framing"],
    tones: ["cynicism", "fatal desire", "urban melancholy", "moral ambiguity"]
  },
  cyberpunk: {
    subjects: ["a street samurai with neon-lit cybernetic implants", "a netrunner jacked into the matrix", "a corporate drone with mandatory augmentations", "a rogue AI manifesting in physical form"],
    actions: ["hacks", "evades", "trades memories with", "uploads itself into"],
    objects: ["a wet neon alley terminal", "a chrome implant glowing under skin", "a vending machine selling identities", "a drone carrying a subpoena"],
    settings: ["in a rain-soaked megacity alley", "inside a corporate data cathedral", "beneath holographic billboards", "on a rooftop above traffic streams"],
    styles: ["neon noir", "wet reflective streets", "high-tech low-life detail", "dense urban futurism"],
    tones: ["paranoia", "electric rebellion", "corporate menace", "street-level intensity"]
  },
  medieval: {
    subjects: ["an illuminated manuscript figure stepping from the page", "a knight in ornate heraldic armor", "a monk copying sacred texts by candlelight", "a bestiary creature rendered in gold leaf"],
    actions: ["kneels before", "illuminates", "defends", "translates"],
    objects: ["a gold-leaf manuscript margin", "a reliquary shaped like a small fortress", "a sword engraved with a grocery list", "a parchment map of impossible lands"],
    settings: ["inside a candlelit scriptorium", "beneath a castle archway in rain", "on a tapestry battlefield", "inside a stone chapel at dawn"],
    styles: ["illuminated manuscript detail", "gold leaf texture", "medieval heraldic design", "candlelit stone realism"],
    tones: ["sacred duty", "ancient strangeness", "ritual gravity", "mythic discipline"]
  },
  lovecraft: {
    subjects: ["a cultist whose form defies euclidean geometry", "an entity from beyond the stars that breaks minds", "a scholar driven mad by forbidden knowledge", "a Deep One hybrid emerging from dark water"],
    actions: ["summons", "deciphers", "worships", "hears whispers from"],
    objects: ["a non-euclidean idol", "a wet book written in impossible angles", "a telescope aimed below the sea", "a door that opens into a starless depth"],
    settings: ["on a stormy New England coastline", "inside a forbidden university archive", "beneath a cyclopean ruin", "at the edge of a black ocean"],
    styles: ["cosmic horror scale", "ancient stone texture", "low greenish light", "vast unknowable framing"],
    tones: ["eldritch dread", "scholarly panic", "ancient threat", "mind-breaking awe"]
  },
  pataphysics: {
    subjects: ["a doctor of imaginary solutions in full academic regalia", "a one-man expedition measuring the surface of God", "a bicycle champion racing across a single immobile second", "a green-candle merchant auditing the exceptions of the universe"],
    actions: ["solemnly demonstrates the equivalence of", "awards a spiral medal to", "calculates the imaginary mass of", "navigates by absurd science toward"],
    objects: ["a brass machine for weighing decisions", "an atlas of countries that almost exist", "a clinamen bottled like perfume", "a spiral-stamped diploma in imaginary sciences"],
    settings: ["in an amphitheater built for one student", "aboard a rowing machine crossing dry land", "inside the ministry of exceptions", "on a podium floating slightly off true"],
    styles: ["academic engraving precision", "mock-scientific diagrams", "polished brass and chalkboard texture", "ceremonious absurd staging"],
    tones: ["erudite mischief", "deadpan scientific pomp", "joyful sophistry", "institutional whimsy"]
  },
  oulipo: {
    subjects: ["a novelist writing a building floor by floor", "a clerk who speaks only in palindromes", "a cartographer of constrained walks", "a typist forbidden from using one letter"],
    actions: ["composes under voluntary constraint beside", "permutates the elements of", "exhausts every variation of", "maps one hundred thousand versions of"],
    objects: ["a manuscript with a missing vowel", "a deck of interchangeable chapters", "a crossword shaped like an apartment block", "a list of everything on a Paris square"],
    settings: ["inside a cross-section apartment building", "at a café table during an exhaustive inventory", "in a library of potential books", "within a ten-by-ten grid of rooms"],
    styles: ["structural cutaway views", "grid-driven composition", "typographic playfulness", "precise enumerative detail"],
    tones: ["systematic delight", "elegant obsession", "combinatorial calm", "playful rigor"]
  },
  situationist: {
    subjects: ["a drifter mapping the city by ambience alone", "a billboard détourned against its own slogan", "a crowd rehearsing a spontaneous moment", "a cartographer cutting Paris into emotional islands"],
    actions: ["drifts without destination through", "détourns the meaning of", "stages a constructed situation inside", "graffitis a beautiful demand across"],
    objects: ["a psychogeographic map with torn edges", "a slogan painted in one urgent line", "a réclame rewired to confess", "a barricade of café furniture"],
    settings: ["in a city redrawn by desire lines", "across a boulevard during a général strike of meaning", "inside a hijacked department store", "under a ceiling of détourned advertisements"],
    styles: ["torn-poster collage", "urgent stencil typography", "documentary street grain", "cut-up urban cartography"],
    tones: ["insurrectionary wit", "festive critique", "urban poetry", "subversive elegance"]
  },
  memphis: {
    subjects: ["a totem of stacked laminate geometry", "a furniture ensemble posing like a pop band", "a squiggle elevated to monument", "a chrome bauble balancing on a terrazzo cone"],
    actions: ["clashes joyfully with", "stacks improbably upon", "rotates in showroom display beside", "color-blocks the silhouette of"],
    objects: ["a bookshelf shaped like a robot priest", "a terrazzo plinth with bakelite horns", "a lamp wearing a paper party hat", "a laminate zigzag frozen mid-dance"],
    settings: ["in a Milan showroom lit like a stage set", "on a terrazzo floor under candy-color spotlights", "inside a catalogue photograph from 1983", "against a grid of black and white squiggles"],
    styles: ["flat saturated color blocks", "playful postmodern geometry", "laminate and terrazzo texture", "studio catalogue lighting"],
    tones: ["sophisticated play", "design-world irony", "exuberant artificiality", "chic toy-like joy"]
  },
  bauhaus: {
    subjects: ["a dancer in geometric costume armor", "a typographer aligning the alphabet to a grid", "a weaver translating music into thread", "a stage figure built from cones and spheres"],
    actions: ["reduces to essential form", "choreographs on a strict diagonal with", "constructs from primary elements", "balances function against"],
    objects: ["a chrome teapot of perfect proportion", "a chair distilled to its idea", "a poster of circle, triangle, square", "a stage mask of lacquered geometry"],
    settings: ["inside a white workshop of long windows", "on a triadic ballet stage", "within a building shaped by its function", "under the clean shadow of a steel balcony"],
    styles: ["primary color discipline", "geometric reduction", "clean axonometric clarity", "machine-age material honesty"],
    tones: ["utopian rigor", "workshop optimism", "formal serenity", "constructive faith"]
  },
  wabisabi: {
    subjects: ["a tea master honoring a cracked bowl", "a gardener raking gravel into patience", "a monk listening to a leaking roof", "a potter blessing the kiln's accidents"],
    actions: ["repairs with visible gold the break of", "lets weather complete", "pours stillness into", "accepts the imperfection of"],
    objects: ["a kintsugi bowl veined with gold", "a weathered cedar gate", "a single wildflower in a bent vase", "a tatami worn by forty years of kneeling"],
    settings: ["in a tea hut of four and a half mats", "beside a moss garden after rain", "under deep eaves while dusk settles", "in a room holding one shadow"],
    styles: ["muted natural palette", "raw clay and aged wood texture", "asymmetric quiet composition", "soft directional daylight"],
    tones: ["serene melancholy", "humble reverence", "weathered intimacy", "still acceptance"]
  },
  ukiyoe: {
    subjects: ["a courtesan compared to passing weather", "a kabuki actor frozen in a crossed-eye pose", "thirty-six travelers regarding one mountain", "a carp climbing a waterfall of ink"],
    actions: ["crosses a wooden bridge through", "regards from a floating balcony", "is swallowed by the great wave of", "prints in five layered colors"],
    objects: ["a paper umbrella against slanting rain", "a woodblock of indigo gradients", "a lantern trembling on a river barge", "a kimono patterned with telegraph lines"],
    settings: ["on the Tōkaidō road between stations", "above Edo rooftops during fireworks", "at a snowy shrine gate at dusk", "inside the floating world of a pleasure quarter"],
    styles: ["flat woodblock color", "bold keyline contour", "bokashi gradient skies", "asymmetric cropped framing"],
    tones: ["floating transience", "elegant melancholy", "popular theatrical delight", "seasonal poetry"]
  },
  giallo: {
    subjects: ["a black-gloved figure seen only in fragments", "an opera singer rehearsing beside a murder", "a fashion model haunted by a half-memory", "a detective drowning in red herrings"],
    actions: ["stalks through saturated shadows toward", "witnesses through a broken shutter", "remembers in violent flashes", "unmasks at the final reveal"],
    objects: ["a straight razor on velvet", "a J&B bottle under a lamp", "a black vinyl glove on a marble sill", "a child's lullaby playing from another room"],
    settings: ["in a Roman apartment of stained glass", "backstage at a theater dripping with red light", "inside a fashion house after hours", "on a spiral staircase lit blue and crimson"],
    styles: ["hyper-saturated gel lighting", "voyeuristic POV framing", "glossy 70s production design", "baroque camera choreography"],
    tones: ["stylish dread", "erotic menace", "operatic violence", "perfumed paranoia"]
  },
  nouvellevague: {
    subjects: ["a couple arguing about cinema in a stolen car", "a girl selling newspapers on the Champs-Élysées", "a small-time crook imitating Bogart", "a philosopher chain-smoking through a love scene"],
    actions: ["jump-cuts through an afternoon with", "reads aloud at the camera about", "runs through the Louvre past", "betrays charmingly"],
    objects: ["a stolen convertible full of paperbacks", "a café table of overflowing ashtrays", "a movie poster watching the street", "a borrowed trench coat"],
    settings: ["on a grey Paris boulevard in available light", "inside a cramped hotel room of ideas", "along the Seine between two arguments", "in a cinema during the matinee"],
    styles: ["handheld black-and-white grain", "natural light and real locations", "jump-cut rhythm", "direct-address framing"],
    tones: ["insolent charm", "intellectual flirtation", "casual tragedy", "cigarette-smoke melancholy"]
  },
  stalker: {
    subjects: ["a guide who fears the room he serves", "a writer and a professor arguing across rubble", "a wife pleading at the threshold of the Zone", "a black dog appearing from shallow water"],
    actions: ["throws a weighted bandage ahead of", "wades through still water past", "confesses while resting among", "approaches but never enters"],
    objects: ["a rusting telegraph pole choked in vines", "syringes and icons under shallow water", "a sandstone room granting wishes", "a railway trolley clattering into mist"],
    settings: ["in a meadow where physics hesitates", "inside a flooded tiled hall", "along an overgrown industrial siding", "at the damp threshold of the Room"],
    styles: ["sepia decay and wet green", "long meditative takes", "texture of rust, moss, and fog", "natural sound made monumental"],
    tones: ["metaphysical longing", "exhausted faith", "sacred dread", "slow inner weather"]
  },
  metaphysica: {
    subjects: ["a faceless mannequin couple in love", "a statue casting a longer shadow than its city", "an arcade repeating itself toward the horizon", "a girl with a hoop running from her own echo"],
    actions: ["waits motionless beside", "casts impossible afternoon shadows over", "recedes down colonnades toward", "stages a silent enigma with"],
    objects: ["a green ball abandoned on cobblestones", "a steam train passing behind a wall forever", "a rubber glove nailed beside a plaster head", "a clock stopped at the hour of enigmas"],
    settings: ["in an empty piazza of long arcades", "under a sky of poisonous turquoise", "between two towers and a departing train", "on a stage of tilted perspective"],
    styles: ["hard late-afternoon shadow", "tilted theatrical perspective", "smooth plaster and stone surfaces", "silent crystalline clarity"],
    tones: ["frozen enigma", "metaphysical stillness", "melancholy of arcades", "dreamlike inevitability"]
  },
  bosch: {
    subjects: ["a choir of bird-headed sinners", "a tree-man with a tavern in his chest", "a knight swallowed by a giant strawberry", "a procession of monks riding kitchen tools"],
    actions: ["parades grotesquely toward", "tempts with miniature delights", "torments musically", "hatches from a cracked egg beside"],
    objects: ["a hurdy-gurdy of human anatomy", "an egg on legs carrying passengers", "a ladder leaning on a burning city", "a giant ear armed with a knife"],
    settings: ["in a garden of pink fountains and glass globes", "across a triptych sliding into hell", "on a frozen lake of small disasters", "under a sky raining tiny churches"],
    styles: ["Flemish miniature precision", "teeming panoramic composition", "jewel-toned apocalypse palette", "grotesque hybrid anatomy"],
    tones: ["moral phantasmagoria", "swarming wonder", "medieval black comedy", "lush damnation"]
  },
  vanitas: {
    subjects: ["a skull crowned with fresh roses", "a scholar's desk abandoned mid-thought", "a soap bubble reflecting an entire estate", "a candle one breath from extinction"],
    actions: ["arranges in eloquent decay", "balances against an hourglass beside", "reflects briefly in", "wilts in golden light over"],
    objects: ["a tulip dropping its first petal", "an hourglass of nearly-finished sand", "a lute with one snapped string", "a ledger of debts owed to time"],
    settings: ["on black velvet in a dark Dutch interior", "beside a window of cold northern light", "within a cabinet of borrowed time", "on a marble slab veined like fortune"],
    styles: ["Dutch golden age chiaroscuro", "hyperreal still-life texture", "deep black backgrounds", "symbolic object arrangement"],
    tones: ["opulent mortality", "quiet memento mori", "sumptuous gravity", "candlelit transience"]
  },
  artnouveau: {
    subjects: ["a woman whose hair becomes the entire frame", "a dragonfly courtesan in glass jewelry", "an architect growing a staircase from a stem", "a seasonal goddess advertising champagne"],
    actions: ["unfurls in whiplash curves around", "crowns with flowering arabesques", "metamorphoses botanically into", "frames in gilded tendrils"],
    objects: ["a Tiffany lamp blooming like a poppy", "a métro gate of cast-iron orchids", "a peacock fan of stained glass", "a perfume label drawn as a constellation of vines"],
    settings: ["inside a Brussels stairwell of golden tendrils", "at a Paris métro entrance at dusk", "within a winter garden of curved glass", "on a poster column under gaslight"],
    styles: ["whiplash linework", "stained-glass color fields", "botanical ornament density", "gilded poster flatness"],
    tones: ["decadent grace", "organic luxury", "fin-de-siècle reverie", "ornamental seduction"]
  },
  constructivist: {
    subjects: ["a worker built of red diagonals", "an agitprop train painted into motion", "a typography brigade storming the page", "an engineer of slogans on a crane"],
    actions: ["beats the whites with the red wedge of", "telegraphs in bold diagonals across", "assembles from industrial fragments", "broadcasts from the scaffolding of"],
    objects: ["a photomontage fist of many workers", "a rostrum spiraling like a drill", "a poster shouting in two colors", "a model tower leaning into the future"],
    settings: ["across a propaganda poster in red and black", "on a factory floor turned theater", "atop a monument to the Third International", "inside a print shop at revolution speed"],
    styles: ["red-black diagonal dynamism", "photomontage collision", "bold sans-serif blocks", "industrial graphic geometry"],
    tones: ["revolutionary urgency", "machine-age fervor", "heroic graphic energy", "utopian propaganda"]
  },
  artbrut: {
    subjects: ["a self-taught prophet drawing his own gospel", "a postman building a palace of pebbles", "an embroiderer stitching voices into cloth", "a recluse mapping heaven on cardboard"],
    actions: ["covers every available inch of", "transcribes the dictation of angels onto", "builds without architecture", "repeats in feverish ornament around"],
    objects: ["a ballpoint cosmos on butcher paper", "a coat embroidered with private alphabets", "a shrine of bottle caps and mirror shards", "a scroll of dense invented script"],
    settings: ["inside a one-room museum of one mind", "on a wall behind a locked door", "in an ideal palace of collected stones", "within margins that swallowed the page"],
    styles: ["horror vacui density", "raw untrained linework", "obsessive pattern repetition", "found-material assemblage"],
    tones: ["visionary intensity", "innocent monumentality", "private cosmology", "feverish sincerity"]
  },
  wunderkammer: {
    subjects: ["a collector cataloguing a unicorn's alibi", "a taxidermied chimera with a brass plaque", "a librarian of impossible specimens", "a child inheriting a cabinet of forbidden drawers"],
    actions: ["pins and labels in Latin", "arranges by imaginary taxonomy", "trades a relic for", "uncorks a specimen jar containing"],
    objects: ["a narwhal tusk sold as unicorn", "a two-headed taxidermy diplomat", "a drawer of weather samples", "a celestial globe with an extra constellation"],
    settings: ["in a candlelit cabinet of curiosities", "among shelves of jarred marvels", "inside a velvet-lined specimen drawer", "under a crocodile hung from the ceiling"],
    styles: ["candlelit museum clutter", "engraved catalogue plates", "amber glass and dark wood", "dense curio composition"],
    tones: ["scholarly wonder", "collector's fever", "baroque curiosity", "softly macabre delight"]
  },
  hauntology: {
    subjects: ["a children's TV presenter from a channel that never existed", "a ghost broadcasting public information films", "a librarian archiving futures that were cancelled", "a synth player scoring a memory of rain"],
    actions: ["broadcasts on a dead frequency to", "loops a half-remembered jingle through", "haunts the architecture of", "rewinds the future inside"],
    objects: ["a VHS of a program no one made", "a test card glowing in an empty room", "a council estate model under museum glass", "a tape recorder mossy with static"],
    settings: ["in a 1970s polytechnic after hours", "inside a public library scored by analogue synth", "on a brutalist walkway in drizzle", "within a broadcast tower of lost signals"],
    styles: ["faded institutional film stock", "analogue video artifacts", "municipal modernist settings", "muted gloaming palette"],
    tones: ["nostalgia for lost futures", "spectral melancholy", "eerie public-service calm", "soft analogue grief"]
  },
  solarpunk: {
    subjects: ["a grandmother engineer pruning a power-vine", "a courier cycling between rooftop orchards", "a council of children voting on the river", "a glassblower shaping windows that breathe"],
    actions: ["harvests sunlight gently with", "retrofits the ruin into", "shares the surplus of", "tends the canopy over"],
    objects: ["a stained-glass solar sail", "a fountain run on afternoon light", "a seed library in ceramic drawers", "a tram woven with wisteria"],
    settings: ["in a city where towers wear gardens", "along canals of clean bright water", "inside a market under a photovoltaic dome", "on terraces stitched with greenhouses"],
    styles: ["luminous botanical architecture", "warm Ghibli-like daylight", "art nouveau curves in bamboo and glass", "abundant living detail"],
    tones: ["practical optimism", "communal warmth", "verdant serenity", "hopeful industriousness"]
  },
  atompunk: {
    subjects: ["a housewife polishing a domestic reactor", "an astronaut in chrome and tartan", "a salesman demonstrating the push-button future", "a robot butler with tailfins"],
    actions: ["demonstrates with a confident smile", "launches from the suburbs toward", "irradiates gently", "vacuums the future out of"],
    objects: ["a kitchen console of optimistic dials", "a finned family rocket in pastel", "an atom-shaped clock above the fireplace", "a brochure for vacations on Venus"],
    settings: ["in a googie diner under a neon atom", "inside a 1958 World's Fair pavilion", "on a moon colony with picket fences", "in a fallout shelter decorated for Christmas"],
    styles: ["googie architecture curves", "pastel chrome and formica", "advertising illustration gloss", "atomic-age iconography"],
    tones: ["radiant optimism", "consumer utopia", "polite apocalypse", "chrome-plated cheer"]
  },
  moebius: {
    subjects: ["a silent rider on a white flightless bird", "a crystal hermit broadcasting dreams", "a desert engineer of slow machines", "a pilgrim crossing dunes of pale coral"],
    actions: ["glides without sound across", "meditates levitating over", "repairs an organic engine beside", "follows a comet's shadow through"],
    objects: ["a starship grown like a seashell", "a hovering stone lit from within", "a helmet of translucent insect glass", "a city folded into a single tower"],
    settings: ["across the crystal desert of B", "under two suns of different temper", "inside a canyon of wind-carved arcology", "on a mesa where gravity relaxes"],
    styles: ["clear-line ligne claire detail", "vast negative desert space", "mineral pastel palette", "silent epic framing"],
    tones: ["serene strangeness", "luminous solitude", "metaphysical adventure", "weightless majesty"]
  },
  swissgraphic: {
    subjects: ["a poster announcing pure structure", "a photographer of objective objects", "a grid quietly governing a city", "a designer kerning the horizon"],
    actions: ["aligns flush-left against", "reduces the message of", "rotates exactly forty-five degrees over", "documents objectively beside"],
    objects: ["a red circle of perfect authority", "a typeface without opinions", "a poster grid visible only to initiates", "a black-and-white photograph of a chair being itself"],
    settings: ["on a concert poster for the Tonhalle", "inside a white exhibition of white pedestals", "across a façade of modular windows", "in a studio of parallel rulers"],
    styles: ["strict modular grid", "Helvetica neutrality", "objective photography", "generous white space"],
    tones: ["cool precision", "typographic calm", "rational elegance", "disciplined clarity"]
  }
};

export const MODES = [
  { id: "surreal", label: "Surrealiste", weight: 28, source: "APG v2", pools: basePools.surreal },
  { id: "kafkian", label: "Kafkaien", weight: 16, source: "APG", pools: basePools.kafkian },
  { id: "dada", label: "Dadaiste", weight: 12, source: "APG", pools: basePools.dada },
  { id: "topor", label: "Topor", weight: 10, source: "APG", pools: basePools.topor },
  { id: "fantastic", label: "Fantastique", weight: 18, source: "APG", pools: basePools.fantastic },
  { id: "liminal", label: "Liminal", weight: 12, source: "APG v2", pools: basePools.liminal },
  { id: "baroque", label: "Baroque", weight: 10, source: "APG v2", pools: basePools.baroque },
  { id: "cosmic", label: "Cosmique", weight: 12, source: "APG v2", pools: basePools.cosmic },
  { id: "organic", label: "Organique", weight: 10, source: "APG v2", pools: basePools.organic },
  { id: "industrial", label: "Industriel", weight: 10, source: "APG v2", pools: basePools.industrial },
  { id: "murky", label: "Murky", weight: 9, source: "APG", pools: basePools.murky },
  { id: "jungian", label: "Jungian", weight: 10, source: "APG", pools: basePools.jungian },
  { id: "freudian", label: "Freudian", weight: 8, source: "APG v2", pools: basePools.freudian },
  { id: "peewee", label: "Pee-wee", weight: 8, source: "APG", pools: basePools.peewee },
  { id: "absurdad", label: "Absurd Ad", weight: 22, source: "AGP-def-Grok", pools: basePools.absurdad },
  { id: "cinematic", label: "Cinematic", weight: 24, source: "V3 adapter", pools: basePools.cinematic },
  { id: "amateur", label: "Amateur", weight: 8, source: "AGP-def-Grok", pools: basePools.amateur },
  { id: "modernart", label: "Modern Art", weight: 12, source: "AGP-def-Grok", pools: basePools.modernart },
  { id: "editorial", label: "Editorial", weight: 14, source: "V3 adapter", pools: basePools.editorial },
  { id: "jpmonster", label: "Japanese Monster", weight: 8, source: "APG v2", pools: basePools.jpmonster },
  { id: "spaceopera", label: "Space Opera", weight: 10, source: "APG v2", pools: basePools.spaceopera },
  { id: "horror80s", label: "Horror 1980s", weight: 9, source: "APG v2", pools: basePools.horror80s },
  { id: "brutalist", label: "Brutalist", weight: 10, source: "APG v2", pools: basePools.brutalist },
  { id: "vaporwave", label: "Vaporwave", weight: 8, source: "APG v2", pools: basePools.vaporwave },
  { id: "filmnoir", label: "Film Noir", weight: 12, source: "APG v2", pools: basePools.filmnoir },
  { id: "cyberpunk", label: "Cyberpunk", weight: 10, source: "APG v2", pools: basePools.cyberpunk },
  { id: "medieval", label: "Medieval", weight: 8, source: "APG v2", pools: basePools.medieval },
  { id: "lovecraft", label: "Lovecraftian", weight: 8, source: "APG v2", pools: basePools.lovecraft },
  { id: "pataphysics", label: "Pataphysique", weight: 9, source: "APG 4.5", pools: basePools.pataphysics },
  { id: "oulipo", label: "Oulipo", weight: 8, source: "APG 4.5", pools: basePools.oulipo },
  { id: "situationist", label: "Situationniste", weight: 9, source: "APG 4.5", pools: basePools.situationist },
  { id: "memphis", label: "Memphis Milano", weight: 10, source: "APG 4.5", pools: basePools.memphis },
  { id: "bauhaus", label: "Bauhaus", weight: 10, source: "APG 4.5", pools: basePools.bauhaus },
  { id: "wabisabi", label: "Wabi-sabi", weight: 10, source: "APG 4.5", pools: basePools.wabisabi },
  { id: "ukiyoe", label: "Ukiyo-e", weight: 10, source: "APG 4.5", pools: basePools.ukiyoe },
  { id: "giallo", label: "Giallo", weight: 10, source: "APG 4.5", pools: basePools.giallo },
  { id: "nouvellevague", label: "Nouvelle Vague", weight: 9, source: "APG 4.5", pools: basePools.nouvellevague },
  { id: "stalker", label: "Stalker", weight: 9, source: "APG 4.5", pools: basePools.stalker },
  { id: "metaphysica", label: "Metaphysica", weight: 9, source: "APG 4.5", pools: basePools.metaphysica },
  { id: "bosch", label: "Bosch", weight: 9, source: "APG 4.5", pools: basePools.bosch },
  { id: "vanitas", label: "Vanitas", weight: 9, source: "APG 4.5", pools: basePools.vanitas },
  { id: "artnouveau", label: "Art Nouveau", weight: 9, source: "APG 4.5", pools: basePools.artnouveau },
  { id: "constructivist", label: "Constructiviste", weight: 9, source: "APG 4.5", pools: basePools.constructivist },
  { id: "artbrut", label: "Art Brut", weight: 8, source: "APG 4.5", pools: basePools.artbrut },
  { id: "wunderkammer", label: "Wunderkammer", weight: 9, source: "APG 4.5", pools: basePools.wunderkammer },
  { id: "hauntology", label: "Hauntologie", weight: 9, source: "APG 4.5", pools: basePools.hauntology },
  { id: "solarpunk", label: "Solarpunk", weight: 9, source: "APG 4.5", pools: basePools.solarpunk },
  { id: "atompunk", label: "Atompunk", weight: 9, source: "APG 4.5", pools: basePools.atompunk },
  { id: "moebius", label: "Moebius", weight: 10, source: "APG 4.5", pools: basePools.moebius },
  { id: "swissgraphic", label: "Helvetica", weight: 8, source: "APG 4.5", pools: basePools.swissgraphic }
];

export const TRANSFORM_HINTS = {
  "ai refine": "Improve clarity, remove weak filler, preserve the strongest idea.",
  "more realistic": "Ground the concept in believable materials, lens language, location, and behavior.",
  "more cinematic": "Add camera direction, blocking, lighting motivation, texture, and pacing.",
  "more absurd": "Increase the conceptual contradiction while keeping the prompt usable.",
  "cleaner commercial": "Make it feel like a polished advertising or product campaign.",
  darker: "Push mood, contrast, stakes, and atmosphere without becoming vague.",
  funnier: "Make the premise sharper, stranger, and more deadpan.",
  editorial: "Make it suitable for a fashion, magazine, or art-direction brief.",
  "convert to image prompt": "Convert the idea into a detailed image-generation prompt.",
  "convert to video prompt": "Convert the idea into a detailed video-generation prompt."
};
