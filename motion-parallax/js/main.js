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
