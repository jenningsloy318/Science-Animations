// ═══════════════════════════════════════════════════════════════
// main.js — 运动视差：三视图接线 + 渲染循环
// ═══════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { buildRide } from './ride.js';
import { buildTopView } from './topview.js';
import { buildSpace } from './space.js';

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const ride = buildRide(renderer);
const space = buildSpace(renderer);
const topo = buildTopView();

// ── 语言状态与国际化 ──
let currentLang = 'zh';
const params = new URLSearchParams(window.location.search);
const qLang = params.get('lang');
if (qLang === 'zh' || qLang === 'en') {
  currentLang = qLang;
} else {
  const saved = localStorage.getItem('science_lang');
  if (saved === 'zh' || saved === 'en') {
    currentLang = saved;
  } else if (navigator.language && !navigator.language.startsWith('zh')) {
    currentLang = 'en';
  }
}

function setLang(lang) {
  if (lang !== 'zh' && lang !== 'en') return;
  currentLang = lang;
  document.documentElement.lang = lang;
  try {
    localStorage.setItem('science_lang', lang);
  } catch (e) {}

  // Update URL without refresh
  const u = new URL(window.location.href);
  u.searchParams.set('lang', lang);
  window.history.replaceState({}, '', u.toString());

  // Home button
  const homeBtn = document.getElementById('homeBtn');
  if (homeBtn) {
    homeBtn.href = '../index.html?lang=' + lang;
    const homeTxt = document.getElementById('homeTxt');
    if (homeTxt) homeTxt.textContent = lang === 'en' ? 'Home' : '首页';
  }

  // Language buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  // Topbar title & tabs
  const appTitle = document.getElementById('appTitle');
  const appSubtitle = document.getElementById('appSubtitle');
  if (appTitle) appTitle.textContent = lang === 'en' ? '🌄 Motion Parallax' : '🌄 运动视差';
  if (appSubtitle) appSubtitle.textContent = lang === 'en' ? 'Motion Parallax — Why near objects move fast and distant objects move slow' : 'Motion Parallax — 为什么近物跑得快，远物跑得慢';
  document.title = lang === 'en' ? 'Motion Parallax · Why Near Objects Move Fast and Distant Slow' : '运动视差 · 为什么近物跑得快，远物跑得慢';

  const tabRide = document.getElementById('tabRide');
  const tabTopo = document.getElementById('tabTopo');
  const tabSpace = document.getElementById('tabSpace');
  if (tabRide) tabRide.textContent = lang === 'en' ? '① Ride Experience' : '① 乘车体验';
  if (tabTopo) tabTopo.textContent = lang === 'en' ? '② Sweep Geometry' : '② 扫角几何';
  if (tabSpace) tabSpace.textContent = lang === 'en' ? '③ Earth to Cosmos' : '③ 从树木到星空';

  // Submodules
  if (ride && ride.setLang) ride.setLang(lang);
  if (topo && topo.setLang) topo.setLang(lang);
  if (space && space.setLang) space.setLang(lang);
}

document.querySelectorAll('.lang-btn').forEach(btn => {
  btn.addEventListener('click', () => setLang(btn.dataset.lang));
});

window.addEventListener('storage', e => {
  if (e.key === 'science_lang' && (e.newValue === 'zh' || e.newValue === 'en') && e.newValue !== currentLang) {
    setLang(e.newValue);
  }
});

setLang(currentLang);

let active = 'ride';
setView(active);

document.querySelectorAll('#tabs .tab').forEach(btn => {
  btn.addEventListener('click', () => setView(btn.dataset.view));
});
function setView(v) {
  active = v;
  document.body.dataset.view = v;
  document.querySelectorAll('#tabs .tab').forEach(b =>
    b.classList.toggle('active', b.dataset.view === v));
  document.querySelectorAll('#sidePanel > .viewpanel, #bottomBar > .viewbar').forEach(d =>
    d.classList.toggle('active', d.dataset.view === v));
  // 标签只显示当前视图的
  document.querySelectorAll('.mp-label').forEach(el => {
    el.style.visibility = el.dataset.view === v ? '' : 'hidden';
  });
}

function doResize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  ride.onResize(w, h);
  space.onResize(w, h);
  topo.onResize();
}
window.addEventListener('resize', doResize);
doResize();

const clock = new THREE.Clock();
const V3 = new THREE.Vector3();

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (active === 'ride') {
    ride.update(dt);
    renderer.render(ride.scene, ride.camera);
  } else if (active === 'space') {
    space.update(dt);
    renderer.render(space.scene, space.camera);
    space.placeLabels();
  } else {
    topo.update(dt);
    topo.draw();
  }
}
loop();

// 调试钩子
window.__mp = () => ({
  view: active,
  ride: active === 'ride' ? ride.getInfo() : null,
  topo: active === 'topo' ? topo.getInfo() : null,
  space: active === 'space' ? space.getInfo() : null,
});
