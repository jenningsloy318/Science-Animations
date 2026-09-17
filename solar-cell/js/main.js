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
  b.innerHTML = `<span class="n">${i + 1}</span><span class="txt">${ch.meta.nav}</span><span class="done-mark"></span>`;
  b.onclick = () => gotoChapter(i);
  navEl.appendChild(b);
});

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

  setHeader(ch.meta.title, ch.meta.sub);
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
