const STORAGE_KEY = "barz-subject-modes-v1";
const PUPPET_INSTRUCTION = "CRITICAL INSTRUCTION: IMG_1 is a reference for a practical puppet/figurine/sculpted character. Photograph this exact figurine — with its exact proportions, head size, limb thickness, body shape — as-is in the described scene. Do NOT apply realistic human anatomy. This is NOT a human, it is a sculpted character with intentional non-realistic proportions. The subject's body proportions, morphology, silhouette, posture, and all physical features MUST strictly and precisely replicate the reference images (IMG_1, IMG_2, IMG_3). Preserve every anatomical distortion, unconventional proportion, exaggerated limb ratio, non-standard body geometry, asymmetry, and structural deformation exactly as depicted in the reference — do NOT normalize, do NOT beautify, do NOT correct toward standard human anatomy. If the reference shows elongated limbs, compressed torso, oversized head, twisted spine, fused features, or any other morphological anomaly, reproduce it faithfully. The reference body IS the body. Override all default model tendencies toward idealized proportions. Treat the reference as a physical object to be photographed, not as a suggestion to be interpreted.";
const PUPPET_SIGNATURES = [
  "critical instruction: img_1 is a reference for a practical puppet/figurine/sculpted character",
  "puppet mode:",
  "puppet/figurine mode",
  "mode: puppet / figurine",
  "is a reference for a practical puppet/figurine character",
  "the reference body is the body"
];

function normalizePrompt(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function hasPuppetInstruction(value) {
  const prompt = normalizePrompt(value);
  return PUPPET_SIGNATURES.some((signature) => prompt.includes(signature));
}

function readModes() {
  try { return { video: "human", motionTransfer: "human", image: "human", ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") }; }
  catch { return { video: "human", motionTransfer: "human", image: "human" }; }
}

const modes = readModes();
const promptInput = document.querySelector("#promptInput");
const referenceHeading = document.querySelector(".reference-heading");
const referenceContent = document.querySelector(".reference-content");
const generateButton = document.querySelector("#generateButton");

if (!promptInput || !referenceHeading || !referenceContent || !generateButton) {
  throw new Error("Subject mode: reference composer unavailable.");
}

const switcher = document.createElement("div");
switcher.className = "subject-mode-switch";
switcher.setAttribute("role", "group");
switcher.setAttribute("aria-label", "Subject morphology");
switcher.innerHTML = `<button type="button" data-subject-mode="human">Human</button><button type="button" data-subject-mode="puppet">Puppet</button>`;
referenceHeading.querySelector(".reference-heading-actions")?.prepend(switcher);

const note = document.createElement("p");
note.className = "subject-mode-note hidden";
note.textContent = "Puppet mode · exact figurine proportions will be locked in the submitted prompt.";
referenceHeading.insertAdjacentElement("afterend", note);

function storageKey() {
  const media = document.querySelector("[data-media].active")?.dataset.media || "video";
  const motion = document.querySelector("[data-video-mode].active")?.dataset.videoMode === "motion-transfer";
  return media === "video" && motion ? "motionTransfer" : media;
}

function currentMode() {
  return modes[storageKey()] === "puppet" ? "puppet" : "human";
}

function render() {
  const available = storageKey() !== "music";
  const mode = currentMode();
  switcher.classList.toggle("hidden", !available);
  note.classList.toggle("hidden", !available || mode !== "puppet");
  switcher.querySelectorAll("button").forEach((button) => {
    const active = button.dataset.subjectMode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

switcher.addEventListener("click", (event) => {
  const button = event.target.closest("[data-subject-mode]");
  if (!button) return;
  modes[storageKey()] = button.dataset.subjectMode;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(modes));
  render();
});

generateButton.addEventListener("click", () => {
  if (currentMode() !== "puppet" || !promptInput.value.trim() || hasPuppetInstruction(promptInput.value)) return;
  const authoredPrompt = promptInput.value;
  promptInput.value = `${authoredPrompt.trim()}\n\n${PUPPET_INSTRUCTION}`;
  promptInput.dispatchEvent(new Event("input", { bubbles: true }));
  queueMicrotask(() => {
    promptInput.value = authoredPrompt;
    promptInput.dispatchEvent(new Event("input", { bubbles: true }));
  });
}, true);

document.addEventListener("click", (event) => {
  if (event.target.closest("[data-media], [data-video-mode]")) setTimeout(render);
});
new MutationObserver(render).observe(document.querySelector("#mediaContext"), { childList: true });
render();
