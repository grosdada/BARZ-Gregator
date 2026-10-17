const OUTPUTS = Object.freeze([
  { id: "image", label: "3D Lab · Image", mediaType: "image", elementId: "output-text" },
  { id: "video", label: "3D Lab · Vidéo", mediaType: "video", elementId: "output-text-v" },
  { id: "transfer2d-0", label: "2D · Character Swap & Morphological Lock", mediaType: "image", elementId: "prompt-transfer2d-0" },
  { id: "transfer2d-1", label: "2D · Transfert Pose", mediaType: "image", elementId: "prompt-transfer2d-1" },
  { id: "transfer2d-2", label: "2D · Generate with REF image", mediaType: "image", elementId: "prompt-transfer2d-2" },
  { id: "transfer2d-3", label: "2D · Transfert style from Ref", mediaType: "image", elementId: "prompt-transfer2d-3" },
  { id: "transfer2d-4", label: "2D · Transfert Subject", mediaType: "image", elementId: "prompt-transfer2d-4" },
  { id: "transfer2d-5", label: "2D · Transfert Background", mediaType: "image", elementId: "prompt-transfer2d-5" }
]);

function controlKey(control, index) {
  if (control.id) return `id:${control.id}`;
  if (control.name) return `name:${control.name}:${index}`;
  return `anon:${control.tagName.toLowerCase()}:${index}`;
}

function controlsIn(document) {
  return [...document.querySelectorAll("input, select, textarea")]
    .filter((control) => !["button", "submit"].includes(control.type));
}

function readControl(control) {
  if (control.type === "checkbox" || control.type === "radio") return control.checked;
  return control.value;
}

function applyControl(control, value) {
  if (control.type === "checkbox" || control.type === "radio") control.checked = Boolean(value);
  else control.value = String(value ?? "");
  control.dispatchEvent(new Event("input", { bubbles: true }));
  control.dispatchEvent(new Event("change", { bubbles: true }));
}

function outputPrompt(frameDocument, output) {
  const target = frameDocument?.getElementById(output.elementId);
  const value = String(target?.dataset?.raw || target?.textContent || "").trim();
  return /remplis les champs/i.test(value) ? "" : value;
}

export function mountWorkflow3d({ host, header, configuration, onDirty, toast, copyText, onSendToAggregator }) {
  const root = document.createElement("section");
  root.className = "workflow3d-shell";

  const toolbar = document.createElement("div");
  toolbar.className = "workflow3d-toolbar";
  const field = document.createElement("label");
  field.className = "workflow3d-output-field";
  field.append(document.createTextNode("SORTIE ACTIVE"));
  const select = document.createElement("select");
  select.setAttribute("aria-label", "Sortie du workflow 2D/3D");
  for (const output of OUTPUTS) {
    const option = document.createElement("option");
    option.value = output.id;
    option.textContent = output.label;
    option.selected = output.id === configuration.selectedOutput;
    select.append(option);
  }
  field.append(select);

  const copy = document.createElement("button");
  copy.type = "button";
  copy.className = "quiet-button";
  copy.textContent = "Copier le prompt";
  const send = document.createElement("button");
  send.type = "button";
  send.className = "primary";
  send.textContent = "Envoyer à BZ Aggregator";
  const status = document.createElement("span");
  status.className = "workflow3d-status";
  status.textContent = "Chargement du laboratoire…";
  toolbar.append(field, copy, send, status);

  const frame = document.createElement("iframe");
  frame.className = "workflow3d-frame";
  frame.title = "2D/3D Transfer workflow";
  frame.src = "/assets/HTML/3D-IA-Workflow.html";

  const selectedOutput = () => OUTPUTS.find(({ id }) => id === select.value) ?? OUTPUTS[0];
  const currentPrompt = () => outputPrompt(frame.contentDocument, selectedOutput());

  function capture() {
    const frameDocument = frame.contentDocument;
    if (!frameDocument) return;
    const controls = {};
    controlsIn(frameDocument).forEach((control, index) => { controls[controlKey(control, index)] = readControl(control); });
    configuration.controls = controls;
    configuration.activeActions = [...frameDocument.querySelectorAll("button.active[onclick]")]
      .map((control) => control.getAttribute("onclick"))
      .filter(Boolean)
      .slice(0, 24);
    configuration.selectedOutput = select.value;
    onDirty();
  }

  select.addEventListener("change", () => {
    configuration.selectedOutput = select.value;
    onDirty();
  });
  copy.addEventListener("click", () => copyText(currentPrompt(), "Prompt 2D/3D copié."));
  send.addEventListener("click", () => {
    const output = selectedOutput();
    const prompt = currentPrompt();
    if (!prompt) return toast("Complète d’abord les champs du prompt sélectionné.", true);
    onSendToAggregator(prompt, output.mediaType, output.id);
  });

  frame.addEventListener("load", () => {
    const frameDocument = frame.contentDocument;
    if (!frameDocument) return;
    try {
      for (const action of configuration.activeActions ?? []) {
        const target = [...frameDocument.querySelectorAll("button[onclick]")]
          .find((control) => control.getAttribute("onclick") === action);
        if (target && !target.classList.contains("active")) target.click();
      }
      const controls = controlsIn(frameDocument);
      controls.forEach((control, index) => {
        const key = controlKey(control, index);
        if (Object.hasOwn(configuration.controls ?? {}, key)) applyControl(control, configuration.controls[key]);
      });
      frameDocument.addEventListener("input", () => setTimeout(capture, 0));
      frameDocument.addEventListener("change", () => setTimeout(capture, 0));
      frameDocument.addEventListener("click", () => setTimeout(capture, 0));
      status.textContent = "État conservé dans le setup actif";
    } catch (error) {
      status.textContent = "Le laboratoire est chargé, mais son état n’a pas pu être restauré";
      toast(error.message, true);
    }
  });

  root.append(toolbar, frame);
  host.replaceChildren(header, root);
}
