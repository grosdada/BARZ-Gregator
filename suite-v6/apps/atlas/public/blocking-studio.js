export function mountBlockingStudio({ host, header, toast }) {
  const shell = document.createElement("section");
  shell.className = "blocking-studio-shell";

  const tabs = document.createElement("div");
  tabs.className = "blocking-studio-tabs";
  const blockingTab = document.createElement("button");
  blockingTab.type = "button";
  blockingTab.textContent = "Blocking Studio";
  blockingTab.className = "active";
  const ragdollTab = document.createElement("button");
  ragdollTab.type = "button";
  ragdollTab.textContent = "Ragdoll Studio";
  const libraryTab = document.createElement("button");
  libraryTab.type = "button";
  libraryTab.textContent = "3D Library";
  libraryTab.title = "Open the online model library";
  tabs.append(blockingTab, ragdollTab, libraryTab);

  const status = document.createElement("div");
  status.className = "blocking-studio-status";
  status.textContent = "Chargement de la scène 3D…";

  const frame = document.createElement("iframe");
  frame.className = "blocking-studio-frame";
  frame.title = "Blocking Studio";
  const blockingUrl = "/assets/HTML/blocking-studio.html?v=0.33.47&barzyTheme=atlas-studio";
  const ragdollUrl = "/assets/HTML/ragdoll-studio.html?v=0.33.47&barzyTheme=atlas-studio";
  const libraryOrigin = "https://barz-ai-lib.placenta.tv";
  const libraryUrl = `${libraryOrigin}/AI-Asset-Lib-online/`;
  let activeStudio = "blocking";
  let pendingActor = null;
  const pendingModels = [];
  const libraryRequests = new Map();
  let libraryPopup = null;
  let handshakeTimer = null;
  frame.src = blockingUrl;
  frame.allow = "clipboard-read; clipboard-write; fullscreen";

  frame.addEventListener("load", () => {
    status.textContent = activeStudio === "blocking"
      ? "Blocking prêt · scène sauvegardée automatiquement dans ce navigateur"
      : "Ragdoll prêt · poses personnelles sauvegardées dans ce navigateur";
    if (activeStudio === "blocking" && pendingActor) {
      if (pendingActor.model?.buffer instanceof ArrayBuffer) {
        const buffer = pendingActor.model.buffer;
        frame.contentWindow?.postMessage({
          type: "barz:ragdoll-import-model",
          schemaVersion: "1.0",
          actor: pendingActor.actor,
          animation: pendingActor.animation,
          model: { fileName: pendingActor.model.fileName, buffer }
        }, window.location.origin, [buffer]);
      } else {
        frame.contentWindow?.postMessage({
          type: "barz:ragdoll-import-actor",
          schemaVersion: "1.0",
          actor: pendingActor.actor
        }, window.location.origin);
      }
      pendingActor = null;
    }
    if (activeStudio === "blocking") {
      while (pendingModels.length) {
        const model = pendingModels.shift();
        frame.contentWindow?.postMessage({
          type: "barz:blocking-import-glb",
          schemaVersion: "1.0",
          requestId: model.requestId,
          fileName: model.fileName,
          buffer: model.buffer
        }, window.location.origin, [model.buffer]);
      }
    }
  });
  frame.addEventListener("error", () => {
    status.textContent = "Blocking Studio n’a pas pu être chargé";
    toast("Le module Blocking Studio n’a pas pu être chargé.", true);
  });

  function showStudio(nextStudio) {
    activeStudio = nextStudio;
    blockingTab.classList.toggle("active", nextStudio === "blocking");
    ragdollTab.classList.toggle("active", nextStudio === "ragdoll");
    frame.title = nextStudio === "blocking" ? "Blocking Studio" : "Ragdoll Studio";
    frame.src = nextStudio === "blocking" ? blockingUrl : ragdollUrl;
    status.textContent = `Chargement de ${frame.title}…`;
  }
  blockingTab.addEventListener("click", () => showStudio("blocking"));
  ragdollTab.addEventListener("click", () => showStudio("ragdoll"));

  function sendLibraryHandshake() {
    if (!libraryPopup || libraryPopup.closed) return;
    libraryPopup.postMessage({ type: "barz:library-handshake", schemaVersion: "1.0" }, libraryOrigin);
  }

  libraryTab.addEventListener("click", () => {
    const url = new URL(libraryUrl);
    url.searchParams.set("aggregatorOrigin", window.location.origin);
    libraryPopup = window.open(url, "barz-ai-model-library", "popup=yes,width=1440,height=920,resizable=yes,scrollbars=yes");
    if (!libraryPopup) {
      toast("The browser blocked the 3D library popup.", true);
      return;
    }
    clearInterval(handshakeTimer);
    sendLibraryHandshake();
    handshakeTimer = setInterval(sendLibraryHandshake, 500);
    status.textContent = "Connecting to the online 3D library…";
  });

  function acknowledgeLibrary(requestId, result) {
    const target = libraryRequests.get(requestId) || libraryPopup;
    target?.postMessage({
      type: "barz:import-glb-result",
      schemaVersion: "1.0",
      requestId,
      ...result
    }, libraryOrigin);
    libraryRequests.delete(requestId);
  }

  async function importLibraryModel(message, source) {
    const requestId = String(message.requestId || "");
    const asset = message.asset || {};
    if (!requestId || !String(asset.fileName || "").toLowerCase().endsWith(".glb")) return;
    if (libraryRequests.has(requestId)) return;
    libraryRequests.set(requestId, source);
    status.textContent = `Downloading ${asset.fileName}…`;
    try {
      const response = await fetch("/api/v1/blocking/import-glb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message)
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail?.error?.message || `HTTP ${response.status}`);
      }
      const buffer = await response.arrayBuffer();
      pendingModels.push({ requestId, fileName: asset.fileName, buffer });
      if (activeStudio !== "blocking") showStudio("blocking");
      else {
        const model = pendingModels.shift();
        frame.contentWindow?.postMessage({
          type: "barz:blocking-import-glb",
          schemaVersion: "1.0",
          requestId: model.requestId,
          fileName: model.fileName,
          buffer: model.buffer
        }, window.location.origin, [model.buffer]);
      }
      status.textContent = `Importing ${asset.fileName} into Blocking Studio…`;
    } catch (error) {
      acknowledgeLibrary(requestId, { ok: false, message: error.message || "GLB import failed" });
      status.textContent = "GLB import failed";
      toast(error.message || "GLB import failed", true);
    }
  }

  const onMessage = (event) => {
    const message = event.data || {};
    if (event.origin === libraryOrigin && event.source === libraryPopup) {
      if (message.type === "barz:library-ready" && message.schemaVersion === "1.0") {
        clearInterval(handshakeTimer);
        handshakeTimer = null;
        status.textContent = "3D library connected · choose a model and click Import GLB";
      } else if (message.type === "barz:import-glb" && message.schemaVersion === "1.0" && message.source === "barz-ai-lib") {
        importLibraryModel(message, event.source);
      }
      return;
    }
    if (event.origin !== window.location.origin || event.source !== frame.contentWindow) return;
    if (message.type === "barz:ragdoll-to-blocking" && message.schemaVersion === "1.0") {
      pendingActor = message;
      showStudio("blocking");
      toast(message.model ? "Modèle riggé envoyé vers Blocking Studio." : "Acteur envoyé vers Blocking Studio.");
    } else if (message.type === "barz:ragdoll-reference" && message.schemaVersion === "1.0") {
      window.parent.postMessage({
        type: "barz-suite:import-reference",
        schemaVersion: "1.0",
        source: "ragdoll-studio",
        name: message.name,
        mimeType: message.mimeType,
        dataUrl: message.dataUrl
      }, window.location.origin);
      toast("Image envoyée vers les références de l’Aggregator.");
    } else if (message.type === "barz:ragdoll-reference-blob" && message.schemaVersion === "1.0" &&
        message.blob instanceof Blob && message.blob.type === "image/png") {
      window.parent.postMessage({
        type: "barz-suite:import-reference-blob",
        schemaVersion: "1.0",
        source: "ragdoll-studio",
        name: message.name,
        mimeType: "image/png",
        blob: message.blob
      }, window.location.origin);
      toast("Image envoyée vers les références de l’Aggregator.");
    } else if (message.type === "barz:blocking-import-glb-result" && message.schemaVersion === "1.0") {
      acknowledgeLibrary(message.requestId, {
        ok: Boolean(message.ok),
        duplicate: false,
        message: message.message || (message.ok ? "Model imported into Blocking Studio" : "GLB import failed")
      });
      status.textContent = message.ok
        ? `${message.fileName || "Model"} imported into Blocking Studio`
        : "GLB import failed";
      toast(message.message || (message.ok ? "GLB imported into Blocking Studio." : "GLB import failed"), !message.ok);
    }
  };
  window.addEventListener("message", onMessage);

  shell.append(tabs, status, frame);
  host.replaceChildren(header, shell);
}
