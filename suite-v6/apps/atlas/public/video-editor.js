function node(tag, className = "", text = undefined) {
  const value = document.createElement(tag);
  if (className) value.className = className;
  if (text !== undefined) value.textContent = text;
  return value;
}

export function mountVideoEditor({ host, header, api, toast }) {
  const shell = node("section", "library-editor-shell");
  const status = node("div", "library-editor-status");
  const copy = node("div");
  const title = node("strong", "", "Démarrage du moteur de montage…");
  const detail = node("span", "", "Le logiciel reste intégré dans Atlas, sans ouvrir une nouvelle fenêtre.");
  copy.append(title, detail);
  const retry = node("button", "director-action", "Réessayer"); retry.type = "button"; retry.hidden = true;
  status.append(copy, retry);
  const frame = node("iframe", "library-editor-frame");
  frame.title = "BARZ Video Director";
  frame.setAttribute("allow", "fullscreen; clipboard-write");
  shell.append(status, frame);
  host.replaceChildren(header, shell);

  async function start() {
    retry.hidden = true;
    title.textContent = "Démarrage du moteur de montage…";
    detail.textContent = "Préparation de Library Editor et de son espace média local.";
    try {
      const result = await api("/api/v1/library-editor/status");
      if (!result.ready) throw new Error(result.error || "Le moteur de montage n’a pas démarré.");
      title.textContent = "Video Director prêt";
      detail.textContent = "Timeline multipiste, moniteur composité, effets, masques, fondus et rendu FFmpeg.";
      frame.src = `${result.url}?embedded=barz`;
    } catch (error) {
      title.textContent = "Video Director indisponible";
      detail.textContent = error.message;
      retry.hidden = false;
      toast(error.message, true);
    }
  }

  retry.addEventListener("click", start);
  start();
}
