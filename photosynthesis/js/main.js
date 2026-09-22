// ═══════════════════════════════════════════════════════
// main.js — 光合作用 · 四标签共享渲染器
// ①叶子里 ②光反应 ③合成循环 ④数字与真相
// ═══════════════════════════════════════════════════════
import * as THREE from 'three';
import { buildStory } from './story.js';
import { buildLeaf } from './chloroplast.js';
import { buildLight } from './light.js';
import { buildFacts } from './spectrum.js';

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const views = {
  story: buildStory(),
  leaf: buildLeaf(),
  light: buildLight(),
  facts: buildFacts(),
};
let current = 'story';

function setView(name) {
  current = name;
  document.body.dataset.view = name;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === name));
  document.querySelectorAll('.viewpanel').forEach(p => p.classList.toggle('active', p.dataset.panel === name));
  document.querySelectorAll('.viewbar').forEach(b => b.classList.toggle('active', b.dataset.bar === name));
  for (const [k, v] of Object.entries(views)) {
    if (v.controls) v.controls.enabled = (k === name);
  }
  views[name].onShow?.();
}

for (const [k, v] of Object.entries(views)) {
  if (v.controls) v.controls.enabled = (k === current);
}

document.querySelectorAll('.tab').forEach(t =>
  t.addEventListener('click', () => setView(t.dataset.view)));

const initialView = new URLSearchParams(location.search).get('view') || location.hash.replace('#', '');
if (initialView && views[initialView]) {
  setView(initialView);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  const v = views[current];
  v.update(dt);
  renderer.render(v.scene, v.camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

addEventListener('resize', () => {
  for (const v of Object.values(views)) v.onResize?.(innerWidth, innerHeight);
  renderer.setSize(innerWidth, innerHeight);
});

// HUD 刷新（每 0.2s）
setInterval(() => {
  const v = views[current];
  v.refreshHUD?.();
}, 200);

// 调试钩子
window.__ps = () => ({ view: current, ...(views[current].getInfo?.() || {}) });
window.__psViews = views;
