const ATLAS_ORIGIN = location.origin;
const requestedAggregatorOrigin = new URLSearchParams(location.search).get("aggregatorOrigin");
const AGGREGATOR_ORIGIN = /^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(requestedAggregatorOrigin || "")
  ? requestedAggregatorOrigin
  : "http://127.0.0.1:4317";
const frames = {
  atlas: document.getElementById("atlas-frame"),
  aggregator: document.getElementById("aggregator-frame")
};

window.name = "barz-suite-6";
frames.atlas.src = `${ATLAS_ORIGIN}/?embedded=1`;
frames.aggregator.src = `${AGGREGATOR_ORIGIN}/?embedded=1&suiteShellOrigin=${encodeURIComponent(ATLAS_ORIGIN)}`;

function safeAppUrl(app, value) {
  const expectedOrigin = app === "aggregator" ? AGGREGATOR_ORIGIN : ATLAS_ORIGIN;
  const fallback = app === "aggregator" ? `${AGGREGATOR_ORIGIN}/?embedded=1` : `${ATLAS_ORIGIN}/?embedded=1`;
  let url = new URL(value || fallback, fallback);
  if (app === "aggregator" && url.origin !== expectedOrigin && /^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(url.origin)) {
    url = new URL(`${url.pathname}${url.search}${url.hash}`, expectedOrigin);
  }
  if (url.origin !== expectedOrigin) throw new Error("Destination BARZ non autorisée.");
  url.searchParams.set("embedded", "1");
  if (app === "aggregator") url.searchParams.set("suiteShellOrigin", ATLAS_ORIGIN);
  return url.href;
}

function showApp(app, url) {
  if (!Object.hasOwn(frames, app)) return;
  if (url) {
    const destination = safeAppUrl(app, url);
    if (frames[app].src !== destination) frames[app].src = destination;
  }
  for (const [id, frame] of Object.entries(frames)) frame.hidden = id !== app;
  document.title = app === "aggregator" ? "BZ Aggregator — BARZ Suite 6" : "Prompt Atlas 6 — BARZ Suite 6";
  frames[app].focus();
}

window.addEventListener("message", (event) => {
  const sourceApp = event.source === frames.atlas.contentWindow ? "atlas"
    : event.source === frames.aggregator.contentWindow ? "aggregator" : "";
  if (!sourceApp) return;
  if (sourceApp === "atlas" && event.origin !== ATLAS_ORIGIN) return;
  if (sourceApp === "aggregator" && event.origin !== AGGREGATOR_ORIGIN) return;
  if (sourceApp === "atlas" && ["barz-suite:import-reference", "barz-suite:import-reference-blob"].includes(event.data?.type) &&
      event.data?.schemaVersion === "1.0") {
    frames.aggregator.contentWindow?.postMessage(event.data, AGGREGATOR_ORIGIN);
    showApp("aggregator");
    return;
  }
  if (event.data?.type !== "barz-suite:switch") return;
  try { showApp(event.data.app, event.data.url); } catch { /* Ignore malformed cross-frame requests. */ }
});

const initialParams = new URLSearchParams(location.search);
const initialApp = initialParams.get("app") === "atlas" ? "atlas" : "aggregator";
showApp(initialApp, initialParams.get("url"));
