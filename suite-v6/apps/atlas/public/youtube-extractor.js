function node(tag, className = "", text = "") {
  const value = document.createElement(tag);
  if (className) value.className = className;
  if (text) value.textContent = text;
  return value;
}

export function mountYoutubeExtractor({ host, header, api, toast }) {
  const shell = node("section", "youtube-extractor-shell");
  const status = node("div", "youtube-extractor-status", "Démarrage du moteur d’extraction local…");
  const frame = document.createElement("iframe");
  frame.className = "youtube-extractor-frame";
  frame.title = "YouTube Extractor";
  frame.allow = "clipboard-read; clipboard-write; fullscreen";
  shell.append(status, frame);
  host.replaceChildren(header, shell);

  let extractorOrigin = "";
  function syncPreferences() {
    if (!extractorOrigin || !frame.contentWindow) return;
    const theme = window.barzPreferences?.theme === "light" ? "sand" : "atlas-studio";
    const language = window.barzPreferences?.language || "en";
    frame.contentWindow.postMessage({ type: "barz:preferences", theme, language }, extractorOrigin);
  }
  function receive(event) {
    if (event.source !== frame.contentWindow || event.data?.type !== "barz-youtube-extractor:ready") return;
    syncPreferences();
  }
  window.addEventListener("message", receive);
  window.addEventListener("barz:themechange", syncPreferences);
  window.addEventListener("barz:languagechange", syncPreferences);
  frame.addEventListener("load", syncPreferences);

  api("/api/v1/youtube-extractor/status").then((result) => {
    if (!result.ready) throw new Error(result.error || "The extraction engine is unavailable.");
    extractorOrigin = new URL(result.url).origin;
    frame.src = result.url;
    const tools = [result.environment?.ytdlp ? "yt-dlp prêt" : "yt-dlp manquant", result.environment?.ffmpeg ? "FFmpeg prêt" : "FFmpeg manquant"];
    status.textContent = `Moteur local prêt · ${tools.join(" · ")}`;
    if (!result.environment?.ytdlp || !result.environment?.ffmpeg) toast("YouTube Extractor nécessite yt-dlp et FFmpeg.", true);
  }).catch((error) => {
    status.textContent = error.message;
    status.dataset.error = "true";
    toast(error.message, true);
  });

  return () => {
    window.removeEventListener("message", receive);
    window.removeEventListener("barz:themechange", syncPreferences);
    window.removeEventListener("barz:languagechange", syncPreferences);
  };
}
