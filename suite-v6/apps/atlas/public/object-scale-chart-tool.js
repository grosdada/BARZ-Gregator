function element(tag, className = "", text = "") {
  const value = document.createElement(tag);
  if (className) value.className = className;
  if (text) value.textContent = text;
  return value;
}

function button(label, className = "") {
  const value = element("button", className, label);
  value.type = "button";
  return value;
}

export function mountObjectScaleChart({ host, header, toast, onSendToAggregator }) {
  const shell = element("section", "object-scale-shell");
  const actionBar = element("section", "object-scale-sendbar");
  const identity = element("div", "object-scale-sendbar-identity");
  identity.append(
    element("span", "object-scale-sendbar-kicker", "OBJECT SCALE CHART"),
    element("strong", "", "Schéma + prompt factuel")
  );
  const explanation = element(
    "p",
    "object-scale-sendbar-copy",
    "Le schéma conserve les proportions et les mesures exactes. Aucun raffinement IA n’est appliqué."
  );
  const send = button("Send to Gregator", "primary-action object-scale-send");
  send.disabled = true;
  const resultLink = element("a", "secondary-action object-scale-result", "Ouvrir dans Gregator");
  resultLink.target = "_blank";
  resultLink.rel = "noreferrer";
  resultLink.hidden = true;
  const status = element("span", "object-scale-sendbar-status", "Chargement du tableau…");
  actionBar.append(identity, explanation, send, resultLink, status);

  const frame = document.createElement("iframe");
  frame.className = "object-scale-frame";
  frame.title = "Object Scale Chart";
  frame.src = "/object-scale-chart/index.html?embedded=1";
  frame.allow = "clipboard-read; clipboard-write; fullscreen";

  shell.append(actionBar, frame);
  host.replaceChildren(header, shell);

  let ready = false;
  const bundleRequests = new Map();

  function receive(event) {
    if (event.origin !== window.location.origin || event.source !== frame.contentWindow || !event.data) return;
    if (event.data.type === "barz-object-scale:ready") {
      ready = true;
      send.disabled = false;
      status.textContent = "Prêt à envoyer le schéma et son prompt.";
    }
    if (event.data.type === "barz-object-scale:bundle") {
      const pending = bundleRequests.get(event.data.requestId);
      if (!pending) return;
      bundleRequests.delete(event.data.requestId);
      clearTimeout(pending.timeout);
      if (event.data.error) pending.reject(new Error(event.data.error));
      else pending.resolve(event.data.bundle || {});
    }
  }
  window.addEventListener("message", receive);

  function requestBundle() {
    return new Promise((resolve, reject) => {
      if (!ready || !frame.contentWindow) return reject(new Error("Object Scale Chart est encore en cours de chargement."));
      const requestId = crypto.randomUUID();
      const timeout = setTimeout(() => {
        bundleRequests.delete(requestId);
        reject(new Error("Le tableau n’a pas pu préparer son schéma."));
      }, 20_000);
      bundleRequests.set(requestId, { resolve, reject, timeout });
      frame.contentWindow.postMessage({ type: "barz-object-scale:get-bundle", requestId }, window.location.origin);
    });
  }

  send.addEventListener("click", async () => {
    if (typeof onSendToAggregator !== "function") return toast("Gregator n’est pas disponible.", true);
    send.disabled = true;
    resultLink.hidden = true;
    status.textContent = "Préparation du schéma exact…";
    try {
      const bundle = await requestBundle();
      if (!String(bundle.prompt || "").trim()) throw new Error("Créez d’abord le prompt de proportions.");
      if (!String(bundle.dataUrl || "").startsWith("data:image/png")) throw new Error("Le schéma PNG n’a pas pu être exporté.");
      status.textContent = "Envoi du schéma et du prompt à Gregator…";
      const url = await onSendToAggregator({ ...bundle, resultLink });
      if (url) {
        resultLink.href = url;
        resultLink.hidden = false;
      }
      status.textContent = "Schéma et prompt envoyés ensemble.";
    } catch (error) {
      status.textContent = error.message;
      toast(error.message, true);
    } finally {
      send.disabled = !ready;
    }
  });

  return () => {
    window.removeEventListener("message", receive);
    bundleRequests.forEach(({ timeout }) => clearTimeout(timeout));
    bundleRequests.clear();
  };
}
