/**
 * dev/probe.js — test-only instrumentation, loaded ONLY with ?probe=1.
 * Collects console errors / uncaught exceptions and POSTs events to the
 * dev test server at /__log so a headless browser run can be inspected.
 */
window.__probeErrors = [];

const record = (kind, msg) => {
  window.__probeErrors.push({ kind, msg: String(msg).slice(0, 600) });
};

const origError = console.error.bind(console);
console.error = (...args) => {
  record('console.error', args.map(String).join(' '));
  origError(...args);
};
window.addEventListener('error', (e) => record('uncaught', `${e.message} @ ${e.filename}:${e.lineno}`));
window.addEventListener('unhandledrejection', (e) => record('unhandledrejection', e.reason?.message || e.reason));

export function post(event, data = {}) {
  const body = JSON.stringify({ event, time: Date.now(), ...data });
  fetch('/__log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }).catch(() => {});
}

window.__probePost = post;
post('boot', { url: location.pathname + location.search, ua: navigator.userAgent });
