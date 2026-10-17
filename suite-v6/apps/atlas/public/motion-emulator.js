function node(tag, className = "", text = undefined) {
  const value = document.createElement(tag);
  if (className) value.className = className;
  if (text !== undefined) value.textContent = text;
  return value;
}

export function mountMotionEmulator({ host, header }) {
  const shell = node("section", "motion-emulator-shell");
  const frame = node("iframe", "director-module-frame motion-emulator-frame");
  frame.title = "Motion Emulator";
  frame.src = "/assets/HTML/motion-emulator/index.html";
  frame.setAttribute("allow", "fullscreen; clipboard-write");
  shell.append(frame);
  host.replaceChildren(header, shell);

  const relayReference = (event) => {
    const message = event.data || {};
    if (event.source !== frame.contentWindow || event.origin !== window.location.origin ||
        message.type !== "barz:motion-emulator-reference" || message.schemaVersion !== "1.0" ||
        !(message.blob instanceof Blob) || !/^(image|video)\//.test(message.mimeType || message.blob.type)) return;
    window.parent.postMessage({
      type: "barz-suite:import-reference-blob",
      schemaVersion: "1.0",
      name: message.name,
      mimeType: message.mimeType || message.blob.type,
      blob: message.blob,
    }, window.location.origin);
  };
  window.addEventListener("message", relayReference);
}
