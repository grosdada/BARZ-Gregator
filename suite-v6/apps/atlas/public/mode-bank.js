const CATEGORIES = [
  ["exterior", "Exterior"], ["interior", "Interior"], ["studio", "Studio"],
  ["conceptual", "Conceptual"], ["collage", "Collage"], ["tvshow", "TV Show"], ["scifi", "Sci-Fi"]
];

// The source bank uses these overlapping groups within each family.
const GROUPS = {
  all: ["All", []],
  urban: ["Urban", ["street", "market", "supermarket", "bus", "parking", "underpass", "tunnel", "canal", "bridge", "footbridge", "laundrette", "hardware", "court", "schoolyard", "pharmacy", "cinema", "service door", "suburban", "municipal", "city", "curb", "depot", "public"]],
  nature: ["Nature", ["rain", "wet", "seaside", "salt", "greenhouse", "garden", "canal", "puddle", "leaves", "fog", "water", "outdoor", "roof", "ocean", "cliff", "sunset", "mountain", "park", "underwater"]],
  interior: ["Interior", ["room", "kitchen", "bathroom", "hallway", "office", "motel", "bed", "table", "sink", "mirror", "drawer", "curtain", "dressing", "storage", "domestic", "apartment"]],
  studio: ["Studio", ["studio", "softbox", "seamless", "plinth", "reflector", "backdrop", "floor tape", "canvas drop", "reference", "product-shot", "flash-lit", "copy-stand", "scanner", "flatbed"]],
  object: ["Props", ["object", "receipt", "badge", "tape", "label", "card", "pouch", "mirror", "comb", "bottle", "cord", "glove", "spoon", "prop", "evidence", "vending", "machine", "tool"]],
  surreal: ["Surreal", ["surreal", "impossible", "absurd", "ritual", "rule", "evidence", "misplaced", "deadpan", "strange", "wrong", "object system", "contradiction"]],
  analog: ["Analog", ["collage", "paper", "xerox", "tape", "halftone", "magazine", "receipt", "staple", "scanner", "foil", "graphite", "sticker", "zine", "cutout", "torn"]],
  cinema: ["Cinema", ["camera", "film", "16mm", "35mm", "tube", "studio lights", "set", "miniature", "tokusatsu", "sentai", "sci-fi", "monster", "robot", "spaceship", "episode", "show", "television"]]
};

const GROUPS_BY_CATEGORY = {
  exterior: ["all", "urban", "nature", "object"],
  interior: ["all", "interior", "object", "surreal"],
  studio: ["all", "studio", "object"],
  conceptual: ["all", "surreal", "object", "interior"],
  collage: ["all", "analog", "surreal", "object"],
  tvshow: ["all", "cinema", "studio", "object"],
  scifi: ["all", "cinema", "nature", "object"]
};

const PUPPET_LOCK = "PUPPET MODE: @image1 is the exact design of a puppet, figurine, creature or stylized character. Preserve its silhouette, head-to-body ratio, limb lengths and thickness, asymmetry, materials, unusual anatomy and every intentional deformity. Never humanize, beautify, anatomically correct or replace it with a conventional person. Photograph that exact design in the new scene.";
const REFERENCE_IDENTITY = "REFERENCE SUBJECT: Use @image1 as the exact subject identity and design. Preserve its distinctive face or nonhuman features, proportions, colors and materials. The prompt below supplies scene direction, not a replacement subject.";
const REFERENCE_WARDROBE = "WARDROBE PRIORITY: Keep the exact clothing, accessories and styling visible on @image1. Treat every conflicting garment, outfit, costume, footwear, jewelry or styling description in the scene prompt as inapplicable. Do not transfer or invent those clothes.";
const PROMPT_WARDROBE = "WARDROBE PRIORITY: Use the outfit, costume, accessories and styling described in the scene prompt for the subject in @image1, while preserving the subject's identity and body design.";

let corpusPromise;
export function loadModeBankCorpus() {
  corpusPromise ??= fetch("/mode-bank-prompts.json").then(async (response) => {
    if (!response.ok) throw new Error(`Mode Bank indisponible (HTTP ${response.status}).`);
    const data = await response.json();
    if (data.schemaVersion !== 1 || !Array.isArray(data.prompts)) throw new Error("Le catalogue Mode Bank est invalide.");
    return data.prompts;
  }).catch((error) => { corpusPromise = null; throw error; });
  return corpusPromise;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceSubject(text, subject, replacement) {
  const match = String(subject || "").trim();
  if (match && new RegExp(escapeRegex(match), "i").test(text)) {
    return text.replace(new RegExp(escapeRegex(match), "i"), replacement);
  }
  return text.replace(/\b(?:a young |an older |a |an |the )(?:woman|man|person|model|subject|figure)\b/i, replacement);
}

function changeGender(text, mode) {
  const female = mode === "female";
  const pairs = female
    ? [[/\bmen\b/gi, "women"], [/\bman\b/gi, "woman"], [/\bmale\b/gi, "female"], [/\bmasculine\b/gi, "feminine"], [/\bHe\b/g, "She"], [/\bhe\b/g, "she"], [/\bHis\b/g, "Her"], [/\bhis\b/g, "her"], [/\bHim\b/g, "Her"], [/\bhim\b/g, "her"]]
    : [[/\bwomen\b/gi, "men"], [/\bwoman\b/gi, "man"], [/\bfemale\b/gi, "male"], [/\bfeminine\b/gi, "masculine"], [/\bShe\b/g, "He"], [/\bshe\b/g, "he"], [/\bHer\b/g, "His"], [/\bher\b/g, "his"]];
  return pairs.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), text);
}

export function compileModeBankPrompt(entry, configuration) {
  if (!entry?.text) throw new Error("Sélectionne un prompt.");
  const mode = configuration.subjectMode;
  if (mode === "original") return entry.text;
  if (mode === "female" || mode === "male") {
    const alreadyMatches = mode === "female" ? ["f", "group_f"].includes(entry.gender) : ["m", "group_m"].includes(entry.gender);
    if (alreadyMatches) return entry.text;
    return changeGender(replaceSubject(entry.text, entry.subject, mode === "female" ? "a woman" : "a man"), mode);
  }
  if (mode === "ref") {
    const scene = replaceSubject(entry.text, entry.subject, "the subject in @image1")
      .replace(/\bShe\b|\bHe\b/g, "The subject")
      .replace(/\bshe\b|\bhe\b/g, "the subject");
    const wardrobeRule = configuration.useWardrobePrompt ? PROMPT_WARDROBE : REFERENCE_WARDROBE;
    return [REFERENCE_IDENTITY, configuration.puppetMode ? PUPPET_LOCK : "",
      wardrobeRule, "SCENE DIRECTION:", scene, wardrobeRule].filter(Boolean).join("\n\n");
  }
  throw new Error("Mode sujet inconnu.");
}

export function modeBankMatchesGroup(entry, group) {
  if (group === "all") return true;
  const keywords = GROUPS[group]?.[1] ?? [];
  const haystack = `${entry.title} ${entry.subject} ${entry.text}`.toLocaleLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword));
}

function element(tag, className = "", text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function button(text, className = "") {
  const node = element("button", className, text);
  node.type = "button";
  return node;
}

export async function mountModeBank({ host, header, configuration, referenceState, onDirty, copyText, sendToAggregator, uploadImageReference, toast }) {
  const allPrompts = await loadModeBankCorpus();
  const byId = new Map(allPrompts.map((entry) => [entry.id, entry]));
  const state = { limit: 36, favoritesOnly: false };
  if (!byId.has(configuration.selectedId)) configuration.selectedId = allPrompts[0]?.id ?? "";

  function update(values, resetLimit = false) {
    Object.assign(configuration, values);
    if (resetLimit) state.limit = 36;
    onDirty();
    render();
  }

  function filtered() {
    const query = configuration.searchQuery.trim().toLocaleLowerCase();
    return allPrompts.filter((entry) => entry.category === configuration.category
      && modeBankMatchesGroup(entry, configuration.group)
      && (!state.favoritesOnly || configuration.favorites.includes(entry.id))
      && (!query || `${entry.title} ${entry.subject} ${entry.text}`.toLocaleLowerCase().includes(query)));
  }

  function render() {
    const entries = filtered();
    const selected = entries.find((entry) => entry.id === configuration.selectedId) ?? entries[0] ?? null;
    if (selected && configuration.selectedId !== selected.id) {
      configuration.selectedId = selected.id;
      onDirty();
    }
    host.replaceChildren(header);
    const toolbar = element("section", "mode-bank-toolbar");
    const categories = element("nav", "mode-bank-categories");
    categories.setAttribute("aria-label", "Mode Bank categories");
    for (const [id, title] of CATEGORIES) {
      const count = allPrompts.filter((entry) => entry.category === id).length;
      const control = button(`${title} · ${count}`, id === configuration.category ? "is-active" : "");
      control.addEventListener("click", () => {
        const first = allPrompts.find((entry) => entry.category === id);
        update({ category: id, group: "all", selectedId: first?.id ?? "" }, true);
      });
      categories.append(control);
    }
    const groups = element("nav", "mode-bank-groups");
    groups.setAttribute("aria-label", "Mode Bank groups");
    for (const id of GROUPS_BY_CATEGORY[configuration.category]) {
      const count = allPrompts.filter((entry) => entry.category === configuration.category && modeBankMatchesGroup(entry, id)).length;
      const control = button(`${GROUPS[id][0]} · ${count}`, id === configuration.group ? "is-active" : "");
      control.addEventListener("click", () => update({ group: id }, true));
      groups.append(control);
    }
    const searchRow = element("div", "mode-bank-search");
    const search = element("input");
    search.type = "search";
    search.placeholder = "Search prompts…";
    search.setAttribute("aria-label", "Search Mode Bank prompts");
    search.maxLength = 500;
    search.value = configuration.searchQuery;
    search.addEventListener("input", () => {
      const pos = search.selectionStart;
      update({ searchQuery: search.value }, true);
      const next = host.querySelector(".mode-bank-search input");
      next?.focus();
      if (pos !== null) next?.setSelectionRange(pos, pos);
    });
    const random = button("Random from selection", "mode-bank-random");
    random.disabled = !entries.length;
    random.addEventListener("click", () => {
      const picked = entries[Math.floor(Math.random() * entries.length)];
      state.limit = Math.max(state.limit, entries.indexOf(picked) + 1);
      update({ selectedId: picked.id });
      host.querySelector(".goodies-card.is-selected")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
    const favorites = button(`★ Favorites (${configuration.favorites.length})`, state.favoritesOnly ? "is-active" : "");
    favorites.addEventListener("click", () => { state.favoritesOnly = !state.favoritesOnly; state.limit = 36; render(); });
    searchRow.append(search, random, favorites);
    toolbar.append(categories, groups, searchRow);
    host.append(toolbar);

    const layout = element("div", "goodies-layout mode-bank-layout");
    const catalog = element("section", "goodies-catalog");
    catalog.append(element("p", "goodies-result-count", `${entries.length} / ${allPrompts.length} prompts · ${configuration.category}`));
    const list = element("div", "goodies-list");
    for (const entry of entries.slice(0, state.limit)) {
      const item = button("", "goodies-card");
      item.classList.toggle("is-selected", entry.id === selected?.id);
      item.append(element("i", "", entry.id), element("b", "", entry.title));
      item.addEventListener("click", () => update({ selectedId: entry.id }));
      list.append(item);
    }
    catalog.append(list);
    if (!entries.length) catalog.append(element("p", "runtime-empty", "No prompt matches this filter."));
    if (entries.length > state.limit) {
      const more = button(`Show more (${entries.length - state.limit} remaining)`, "quiet-button mode-bank-more");
      more.addEventListener("click", () => { state.limit += 36; render(); });
      catalog.append(more);
    }
    const output = element("section", "runtime-output goodies-output mode-bank-output");
    const title = element("h3", "", selected?.title ?? "Select a prompt");
    const modeRow = element("div", "mode-bank-modes");
    modeRow.append(element("span", "", "Subject"));
    for (const [id, label] of [["original", "Original"], ["ref", "Ref"], ["female", "Female"], ["male", "Male"]]) {
      const control = button(label, configuration.subjectMode === id ? "is-active" : "");
      control.setAttribute("aria-pressed", String(configuration.subjectMode === id));
      control.addEventListener("click", () => update({ subjectMode: id }));
      modeRow.append(control);
    }
    output.append(title, modeRow);
    if (configuration.subjectMode === "ref") {
      const refControls = element("div", "mode-bank-ref-controls");
      const upload = element("input");
      upload.type = "file";
      upload.accept = "image/*";
      upload.setAttribute("aria-label", "Reference character image");
      upload.addEventListener("change", async () => {
        const file = upload.files?.[0];
        if (!file) return;
        if (file.size > 10_000_000) return toast("Image trop volumineuse (10 Mo maximum).", true);
        referenceState.image = { name: file.name, src: await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Lecture impossible."));
          reader.readAsDataURL(file);
        }) };
        render();
      });
      const refName = element("span", "", referenceState.image?.name ?? "Choose a character reference");
      const puppet = element("label", "mode-bank-check");
      const puppetBox = element("input");
      puppetBox.type = "checkbox";
      puppetBox.checked = configuration.puppetMode;
      puppetBox.addEventListener("change", () => update({ puppetMode: puppetBox.checked }));
      puppet.append(puppetBox, element("span", "", "Puppet Mode · preserve unusual morphology"));
      const wardrobe = element("label", "mode-bank-check");
      const wardrobeBox = element("input");
      wardrobeBox.type = "checkbox";
      wardrobeBox.checked = configuration.useWardrobePrompt;
      wardrobeBox.addEventListener("change", () => update({ useWardrobePrompt: wardrobeBox.checked }));
      wardrobe.append(wardrobeBox, element("span", "", "Use wardrobe prompt"));
      refControls.append(upload, refName, puppet, wardrobe,
        element("small", "", "Unchecked: keep clothing from the reference. Checked: use clothing from the chosen prompt."));
      output.append(refControls);
    }
    const preview = element("pre", "goodies-preview mode-bank-preview", selected ? compileModeBankPrompt(selected, configuration) : "");
    output.append(preview);
    const actions = element("div", "runtime-actions mode-bank-actions");
    const favorite = button(configuration.favorites.includes(selected?.id) ? "★ Saved" : "☆ Favorite", "quiet-button");
    favorite.disabled = !selected;
    favorite.addEventListener("click", () => {
      const next = configuration.favorites.includes(selected.id)
        ? configuration.favorites.filter((id) => id !== selected.id)
        : [...configuration.favorites, selected.id];
      update({ favorites: next });
    });
    const copy = button("Copy prompt", "quiet-button");
    copy.disabled = !selected;
    copy.addEventListener("click", () => copyText(compileModeBankPrompt(selected, configuration)));
    const send = button("Send to Aggregator", "primary-action");
    send.disabled = !selected;
    send.addEventListener("click", async () => {
      if (configuration.subjectMode === "ref" && !referenceState.image) return toast("Ajoute d’abord l’image du personnage de référence.", true);
      send.disabled = true;
      try {
        const refs = referenceState.image && configuration.subjectMode === "ref"
          ? [await uploadImageReference(referenceState.image)] : [];
        await sendToAggregator(compileModeBankPrompt(selected, configuration), `The Mode Bank · ${selected.title}`, "image", {}, {}, undefined, "", refs);
      } catch (error) {
        toast(`Envoi impossible : ${error.message}`, true);
      } finally { send.disabled = false; }
    });
    actions.append(favorite, copy, send);
    output.append(actions);
    layout.append(catalog, output);
    host.append(layout);
  }

  render();
}
