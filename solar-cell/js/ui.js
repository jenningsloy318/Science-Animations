/* ══════════════════════════════════════════════════
   ui.js — narration, meters, actions, band canvas
   ══════════════════════════════════════════════════ */
import { METERS } from './core.js';

const $ = id => document.getElementById(id);

/* ── narration ── */
let narrTimer = null;
function updateNarrPos() {
  const c = document.getElementById('bandCanvas');
  const bandVisible = !c.classList.contains('hidden');
  const zoomed = c.classList.contains('zoomed');
  const n = document.getElementById('narration');
  n.classList.toggle('with-band', bandVisible);
  n.classList.toggle('band-zoomed', bandVisible && zoomed);
}
export function showNarr(html, sub = '', cls = '', holdMs = 0) {
  const box = $('narration');
  clearTimeout(narrTimer);
  updateNarrPos();
  box.innerHTML = `<div class="narr-card ${cls}">${html}${sub ? `<span class="sub">${sub}</span>` : ''}</div>`;
  requestAnimationFrame(() => box.firstChild.classList.add('show'));
  if (holdMs > 0) narrTimer = setTimeout(() => clearNarr(), holdMs);
}
export function clearNarr() {
  const c = $('narration').firstChild;
  if (c) c.classList.remove('show');
}

/* ── meters ── */
export function updateMeters() {
  $('mVolt').textContent = METERS.volt.toFixed(2) + ' V';
  $('mAmp').textContent = METERS.amp.toFixed(1) + ' A';
}

/* ── actions ── */
export function setActions({ buttons = [], sliders = [] } = {}) {
  const bb = $('actionBtns'); bb.innerHTML = '';
  for (const b of buttons) {
    const el = document.createElement('button');
    el.className = 'act-btn ' + (b.cls || '');
    el.innerHTML = b.label;
    if (b.id) el.id = b.id;
    el.disabled = !!b.disabled;
    el.onclick = () => b.onClick && b.onClick(el);
    bb.appendChild(el);
  }
  const sb = $('actionSliders'); sb.innerHTML = '';
  for (const s of sliders) {
    const wrap = document.createElement('div');
    wrap.className = 'slider-wrap';
    wrap.innerHTML = `
      <label>${s.label}</label>
      <input type="range" min="${s.min}" max="${s.max}" step="${s.step}" value="${s.value}" class="${s.cls || ''}">
      <span class="val" id="${s.id}Val">${s.display ? s.display(s.value) : s.value}</span>`;
    const input = wrap.querySelector('input');
    input.oninput = () => {
      const v = parseFloat(input.value);
      wrap.querySelector('.val').textContent = s.display ? s.display(v) : v;
      s.onInput && s.onInput(v);
    };
    sb.appendChild(wrap);
  }
}
export function getBtn(id) { return document.getElementById(id); }

/* ── band canvas (600×600 internal → 2× crisp; CSS shows 300) ── */
const BAND_SCALE = 2;
export function showBand(show) {
  document.getElementById('bandCanvas').classList.toggle('hidden', !show);
  const z = document.getElementById('bandZoom');
  if (z) z.classList.toggle('hidden', !show);
  updateNarrPos();
}
export function getBandCtx() {
  const ctx = $('bandCanvas').getContext('2d');
  ctx.setTransform(BAND_SCALE, 0, 0, BAND_SCALE, 0, 0);
  return ctx;
}
export function bandSize() {
  const c = $('bandCanvas');
  return { w: c.width / BAND_SCALE, h: c.height / BAND_SCALE };
}

/* zoom toggle */
const zoomBtn = document.getElementById('bandZoom');
if (zoomBtn) zoomBtn.onclick = () => {
  const c = document.getElementById('bandCanvas');
  const on = c.classList.toggle('zoomed');
  zoomBtn.classList.toggle('zoomed', on);
  zoomBtn.textContent = on ? '⤡ 缩小' : '⤢ 放大';
  updateNarrPos();
};

/* ── chapter nav ── */
export function setHeader(title, sub) {
  $('chapterTitle').textContent = title;
  $('chapterSub').textContent = sub;
}
export function markChapterDone(idx) {
  const n = document.querySelector(`.ch-btn[data-ch="${idx}"] .done-mark`);
  if (n) n.textContent = '✅';
}
