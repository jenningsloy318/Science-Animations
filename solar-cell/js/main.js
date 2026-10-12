/* ══════════════════════════════════════════════════
   main.js — chapter router & render loop (4 chapters)
   1 从原子到晶体 · 2 能带从哪来 · 3 分离装置PN结 · 4 光子的一生
   ══════════════════════════════════════════════════ */
import * as THREE from 'three';
import {
  initCore, getCore, ensureLights, disposeGroup, clearAnims, resetMeters, stepAnims,
} from './core.js';
import { setActions, setHeader, clearNarr, updateMeters } from './ui.js';
import * as ch1 from './ch1_crystal.js';
import * as ch2 from './ch2_bands.js';
import * as ch3 from './ch3_junction.js';
import * as ch4 from './ch4_current.js';
import * as ch5 from './ch5_real.js';
import { i18n } from '../../common/js/i18n.js';

const solarDict = {
  'nav.home': { zh: '🏠 首页', en: '🏠 Home' },
  'nav.home_tip': { zh: '返回首页 Back to home', en: 'Return to home portal' },
  'solar.title': {
    zh: '☀️ 太阳能电池：光子 → 电能',
    en: '☀️ Solar Cell: Photons → Electricity'
  },
  'solar.sub': {
    zh: '5章微观之旅：从原子到晶格、PN结与真实电池的 28.29% 效率天平',
    en: '5-chapter journey: crystal lattice, PN junction, and 28.29% efficiency budget'
  },
  'solar.nav_title': {
    zh: '章节 Chapters',
    en: 'Chapters'
  },
  'solar.circuit': {
    zh: '⚡ 电路 Circuit',
    en: '⚡ Circuit'
  },
  'solar.voltage': {
    zh: '电压 Voltage',
    en: 'Voltage'
  },
  'solar.current': {
    zh: '电流 Current',
    en: 'Current'
  },
  'solar.prev_ch': {
    zh: '← 上一章',
    en: '← Previous'
  },
  'solar.next_ch': {
    zh: '下一章 →',
    en: 'Next →'
  },
  'solar.zoom_in': {
    zh: '⤢ 放大',
    en: '⤢ Zoom'
  },
  'solar.zoom_out': {
    zh: '⤡ 缩小',
    en: '⤡ Shrink'
  },
  'ch1.nav': { zh: '🧊 从原子到晶体', en: '🧊 Atoms to Crystal' },
  'ch1.title': { zh: '🧊 太阳能电池 · 第1章：从原子到晶体——什么是共价键？', en: '🧊 Solar Cell · Ch 1: From Atoms to Crystal — Covalent Bonds' },
  'ch1.sub': { zh: 'Chapter 1 · From atoms to crystal: covalent bonds', en: 'Chapter 1 · From atoms to crystal: covalent bonds' },
  'ch2.nav': { zh: '🌈 能带从哪来', en: '🌈 Energy Bands' },
  'ch2.title': { zh: '🌈 太阳能电池 · 第2章：能带与掺杂——自由电子与空穴', en: '🌈 Solar Cell · Ch 2: Energy Bands & Doping — Electrons & Holes' },
  'ch2.sub': { zh: 'Chapter 2 · Bandgap & doping: n-type and p-type', en: 'Chapter 2 · Bandgap & doping: n-type and p-type' },
  'ch3.nav': { zh: '⚡ 分离装置 PN 结', en: '⚡ PN Junction' },
  'ch3.title': { zh: '⚡ 太阳能电池 · 第3章：单向滑梯——PN结内建电场', en: '⚡ Solar Cell · Ch 3: One-Way Slide — Built-in Electric Field' },
  'ch3.sub': { zh: 'Chapter 3 · Built-in field: the carrier separator', en: 'Chapter 3 · Built-in field: the carrier separator' },
  'ch4.nav': { zh: '☀️ 光子的一生', en: '☀️ Photon Life' },
  'ch4.title': { zh: '☀️ 太阳能电池 · 第4章：光子的一生——从吸收到电流', en: '☀️ Solar Cell · Ch 4: Life of a Photon — Absorption to Current' },
  'ch4.sub': { zh: 'Chapter 4 · Photon absorption, generation & collection', en: 'Chapter 4 · Photon absorption, generation & collection' },
  'ch5.nav': { zh: '🔬 真实电池与极限', en: '🔬 Real Cell & Limit' },
  'ch5.title': { zh: '🔬 太阳能电池 · 第5章：真实电池结构与 28.29% 效率天平', en: '🔬 Solar Cell · Ch 5: Real Architecture & 28.29% Efficiency Budget' },
  'ch5.sub': { zh: 'Chapter 5 · Loss channels, texturing, contacts & tandem frontier', en: 'Chapter 5 · Loss channels, texturing, contacts & tandem frontier' }
};

i18n.loadDict(solarDict);

const CHAPTERS = [ch1, ch2, ch3, ch4, ch5];
const CAM_PRESETS = {
  0: { pos: [9, 5.5, 12], tgt: [0, 0.6, 0] },
  1: { pos: [11.2, 5, 11], tgt: [3.2, 1.4, 0] },   // 原子偏左半屏，右半屏是能带图
  2: { pos: [8, 6, 11], tgt: [0, 1, 0] },
  3: { pos: [10, 6.5, 13], tgt: [0, 1.2, 0] },
  4: { pos: [7.5, 5.2, 9.5], tgt: [0, 1.1, 0] },
};

const canvas = document.getElementById('c3d');
initCore(canvas);
ensureLights();

const { scene, camera, controls, clock, renderer } = getCore();

let current = -1;
let chapterHost = null;

/* ── build nav ── */
const navEl = document.getElementById('chapters');
CHAPTERS.forEach((ch, i) => {
  const b = document.createElement('button');
  b.className = 'ch-btn';
  b.dataset.ch = i;
  b.innerHTML = `<span class="n">${i + 1}</span><span class="txt">${i18n.t(`ch${i + 1}.nav`, ch.meta.nav)}</span><span class="done-mark"></span>`;
  b.onclick = () => gotoChapter(i);
  navEl.appendChild(b);
});

function updateI18nNav() {
  CHAPTERS.forEach((ch, i) => {
    const btn = navEl.querySelector(`.ch-btn[data-ch="${i}"]`);
    if (btn) {
      const txt = btn.querySelector('.txt');
      if (txt) txt.textContent = i18n.t(`ch${i + 1}.nav`, ch.meta.nav);
    }
  });
  if (current >= 0) {
    const ch = CHAPTERS[current];
    setHeader(i18n.t(`ch${current + 1}.title`, ch.meta.title), i18n.t(`ch${current + 1}.sub`, ch.meta.sub));
    refreshActions();
  }
}

i18n.subscribe(() => {
  updateI18nNav();
});

document.getElementById('btnLangZh')?.addEventListener('click', () => i18n.setLanguage('zh'));
document.getElementById('btnLangEn')?.addEventListener('click', () => i18n.setLanguage('en'));

function gotoChapter(i) {
  if (i < 0 || i >= CHAPTERS.length || i === current) return;

  if (current >= 0) {
    try { CHAPTERS[current].leave(); } catch (e) { console.warn(e); }
  }
  clearAnims();
  resetMeters();
  clearNarr();

  if (chapterHost) {
    scene.remove(chapterHost);
    disposeGroup(chapterHost);
    chapterHost = null;
  }

  current = i;
  const ch = CHAPTERS[i];
  chapterHost = new THREE.Group();
  scene.add(chapterHost);

  const env = { scene, camera, renderer, controls, root: chapterHost };
  ch.enter(env);
  if (ch.bindEnv) ch.bindEnv(env, refreshActions);

  const p = CAM_PRESETS[i];
  if (p) {
    camera.position.set(...p.pos);
    controls.target.set(...p.tgt);
    controls.update();
  }

  setHeader(i18n.t(`ch${i + 1}.title`, ch.meta.title), i18n.t(`ch${i + 1}.sub`, ch.meta.sub));
  refreshActions();
  document.querySelectorAll('.ch-btn').forEach((b, k) => b.classList.toggle('active', k === i));
  document.getElementById('btnPrev').disabled = i === 0;
  document.getElementById('btnNext').disabled = i === CHAPTERS.length - 1;
}

function refreshActions() {
  if (current < 0) return;
  setActions(CHAPTERS[current].actions());
}

ch4.bindActionsRefresh(refreshActions);

document.getElementById('btnPrev').onclick = () => gotoChapter(current - 1);
document.getElementById('btnNext').onclick = () => gotoChapter(current + 1);

/* ── chapter 5: click-to-pick bridge (drag vs click) ── */
let downPos = null;
addEventListener('pointerdown', e => { downPos = [e.clientX, e.clientY]; });
addEventListener('pointerup', e => {
  if (!downPos || current < 0) return;
  const moved = Math.abs(e.clientX - downPos[0]) + Math.abs(e.clientY - downPos[1]);
  downPos = null;
  if (moved < 6 && CHAPTERS[current].onPointerUp) {
    try { CHAPTERS[current].onPointerUp(e.clientX, e.clientY, true); } catch (err) { console.warn(err); }
  }
});

/* ── loop ── */
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.getElapsedTime();
  controls.update();
  if (current >= 0 && CHAPTERS[current].update) {
    try { CHAPTERS[current].update(dt, t); } catch (e) { console.error(e); }
  }
  stepAnims(dt);
  updateMeters();
  renderer.render(scene, camera);
}
animate();

updateMeters();
gotoChapter(0);

/* expose for debugging */
window.__solar = { gotoChapter, CHAPTERS, core: getCore() };
