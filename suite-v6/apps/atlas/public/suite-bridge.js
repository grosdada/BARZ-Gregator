const SUITE_SHELL_ORIGIN = window.location.origin;
const APP_ORIGINS = Object.freeze({
  atlas: SUITE_SHELL_ORIGIN,
  aggregator: "http://127.0.0.1:4317"
});

export function isInsideSuiteShell() {
  return window.parent !== window;
}

export function openSuiteApp(app, url = APP_ORIGINS[app]) {
  if (!Object.hasOwn(APP_ORIGINS, app)) throw new Error("Application BARZ inconnue.");
  const destination = new URL(url, APP_ORIGINS[app]);
  if (destination.origin !== APP_ORIGINS[app]) throw new Error("Destination BARZ non autorisée.");
  if (isInsideSuiteShell()) {
    window.parent.postMessage({ type: "barz-suite:switch", app, url: destination.href }, SUITE_SHELL_ORIGIN);
    return;
  }
  const shell = new URL("/suite.html", SUITE_SHELL_ORIGIN);
  shell.searchParams.set("app", app);
  shell.searchParams.set("url", destination.href);
  window.location.assign(shell.href);
}

if (window.top === window) window.name = "prompt-atlas-v6";

document.addEventListener("click", (event) => {
  const link = event.target.closest?.('a[target="barz-aggregator"]');
  if (!link) return;
  event.preventDefault();
  openSuiteApp("aggregator", link.href);
}, true);
