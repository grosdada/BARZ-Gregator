/**
 * ui.js — toasts, status chips, progress bar, tabs.
 * Pure DOM helpers; no app logic.
 */

const toastRoot = () => document.getElementById('toast-root');

// Prompt Atlas skin: Tailwind utility strings replaced by motion-emulator.css classes.
const TOAST_STYLES = {
  info: 'me-toast-info',
  success: 'me-toast-success',
  error: 'me-toast-error',
  warn: 'me-toast-warn',
};

/** Show a transient toast. kind: info | success | error | warn */
export function toast(message, kind = 'info', ms = 4200) {
  const el = document.createElement('div');
  el.className = `me-toast me-toast-hidden ${TOAST_STYLES[kind] || TOAST_STYLES.info}`;
  el.textContent = message;
  toastRoot().appendChild(el);
  requestAnimationFrame(() => el.classList.remove('me-toast-hidden'));
  setTimeout(() => {
    el.classList.add('me-toast-hidden');
    setTimeout(() => el.remove(), 350);
  }, ms);
  return el;
}

/**
 * Model status chip. state: idle | loading | ready | error
 * `detail` is appended in parentheses, e.g. the compute backend.
 */
export function setModelStatus(chipId, state, detail = '') {
  const chip = document.getElementById(chipId);
  if (!chip) return;
  const dot = chip.querySelector('[data-dot]');
  const label = chip.querySelector('[data-label]');
  const base = chip.dataset.name;
  const cfg = {
    idle: ['is-idle', `${base}: idle`],
    loading: ['is-loading', `Loading ${base.toLowerCase()}…`],
    ready: ['is-ready', `${base}: ready${detail ? ` (${detail})` : ''}`],
    error: ['is-error', `${base}: failed`],
  }[state];
  dot.className = `me-dot ${cfg[0]}`;
  dot.dataset.dot = '';
  label.textContent = cfg[1];
  chip.title = detail || '';
}

/** Update the processing progress UI. Pass null to hide. */
export function setProgress(info) {
  const wrap = document.getElementById('progress-wrap');
  if (!info) {
    wrap.classList.add('hidden');
    return;
  }
  wrap.classList.remove('hidden');
  const pct = info.total ? Math.min(100, (info.frame / info.total) * 100) : 0;
  document.getElementById('progress-bar').style.width = `${pct.toFixed(1)}%`;
  document.getElementById('progress-label').textContent =
    `Frame ${info.frame} / ${info.total} · ${info.fps ? info.fps.toFixed(1) + ' fps' : '…'}`;
  document.getElementById('progress-eta').textContent = info.eta ? `ETA ${info.eta}` : '';
}

/** Enable/disable a set of elements by id. */
export function setEnabled(ids, enabled) {
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) el.disabled = !enabled;
  }
}

/** Simple tab switcher: buttons carry data-tab, panels carry data-panel. */
export function initTabs(onSwitch) {
  const buttons = document.querySelectorAll('[data-tab]');
  buttons.forEach((btn) =>
    btn.addEventListener('click', () => {
      buttons.forEach((b) => {
        const active = b === btn;
        b.classList.toggle('tab-active', active);
        b.setAttribute('aria-selected', String(active));
      });
      document.querySelectorAll('[data-panel]').forEach((p) => {
        p.classList.toggle('hidden', p.dataset.panel !== btn.dataset.tab);
      });
      onSwitch?.(btn.dataset.tab);
    })
  );
}
