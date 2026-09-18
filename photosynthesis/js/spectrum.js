// ═══════════════════════════════════════════════════════
// spectrum.js — ④ 数字与真相
// 视角0：吸收光谱（为什么叶子是绿的）
// 视角1：效率阶梯（植物 vs 太阳能板）
// 视角2：全球尺度（地球 + 数字）
// ═══════════════════════════════════════════════════════
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { makeLabel } from './sprite.js';
import { ABSORPTION, EFFICIENCY, GLOBAL } from './facts.js';

// 吸收率示意：以吸收峰为中心的高斯混合（0..1）
function absorption(nm, peaks) {
  let a = 0;
  for (const p of peaks) a += Math.exp(-((nm - p) ** 2) / (2 * 34 ** 2));
  return Math.min(1, a);
}

// 波长 → 可见光颜色
function wavelengthColor(nm) {
  let r = 0, g = 0, b = 0;
  if (nm < 440) { r = (440 - nm) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = (510 - nm) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = (645 - nm) / 65; }
  else { r = 1; }
  return new THREE.Color(r, g, b);
}

export function buildFacts() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#060b12');
  const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.1, 300);
  camera.position.set(-3, 9, 22);

  scene.add(new THREE.AmbientLight('#42506a', 1.1));
  const key = new THREE.DirectionalLight('#fff2d8', 1.2);
  key.position.set(8, 16, 14); scene.add(key);

  const controls = new OrbitControls(camera, document.getElementById('gl'));
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.target.set(-3, 3, 0);

  const groups = { spectrum: new THREE.Group(), ladder: new THREE.Group(), globe: new THREE.Group() };
  scene.add(groups.spectrum, groups.ladder, groups.globe);

  // ── 视角0：吸收光谱 ──
  {
    const N = 64, W = 30;
    // 彩虹底带
    for (let i = 0; i < N; i++) {
      const nm = 380 + (i + 0.5) / N * 320;
      const strip = new THREE.Mesh(new THREE.BoxGeometry(W / N - 0.06, 0.3, 1.2),
        new THREE.MeshBasicMaterial({ color: wavelengthColor(nm) }));
      strip.position.set(-W / 2 + (i + 0.5) * W / N, 0.15, 0);
      groups.spectrum.add(strip);
      // 叶绿素 a 吸收柱
      const ha = absorption(nm, ABSORPTION.chlA);
      if (ha > 0.05) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(W / N - 0.06, ha * 6, 0.8),
          new THREE.MeshStandardMaterial({ color: 0x2e8b57, emissive: 0x1c5c38, emissiveIntensity: 0.6, transparent: true, opacity: 0.92 }));
        bar.position.set(strip.position.x, ha * 3 + 0.3, -1.4);
        groups.spectrum.add(bar);
      }
      // 叶绿素 b 吸收柱
      const hb = absorption(nm, ABSORPTION.chlB);
      if (hb > 0.05) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(W / N - 0.09, hb * 4.4, 0.8),
          new THREE.MeshStandardMaterial({ color: 0x66d98f, emissive: 0x1c5c38, emissiveIntensity: 0.5, transparent: true, opacity: 0.8 }));
        bar.position.set(strip.position.x, hb * 2.2 + 0.3, 1.5);
        groups.spectrum.add(bar);
      }
    }
    const l1 = makeLabel('吸收光谱：叶绿素爱吃蓝光和红光', '#9ff0b5');
    l1.position.set(0, 8.6, 0); groups.spectrum.add(l1);
    const l2 = makeLabel('绿光（约550nm）几乎不被吸收 → 被反射回你的眼睛', '#ffe08a');
    l2.position.set(0, -1.6, 3); groups.spectrum.add(l2);
    const lBlue = makeLabel('蓝 430nm', '#7dd3fc'); lBlue.position.set(-W / 2 + (430 - 380) / 320 * W, 7.4, 0); groups.spectrum.add(lBlue);
    const lRed = makeLabel('红 662nm', '#ff9e9e'); lRed.position.set(-W / 2 + (662 - 380) / 320 * W, 7.4, 0); groups.spectrum.add(lRed);
    const lGreen = makeLabel('绿 550nm（被反射）', '#c9f7cf'); lGreen.position.set(-W / 2 + (550 - 380) / 320 * W, 3.4, 2.6); groups.spectrum.add(lGreen);
  }

  // ── 视角1：效率阶梯 ──
  {
    const W = 2.3;
    EFFICIENCY.forEach((e, i) => {
      const h = Math.max(e.pct * 0.52, 0.6);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(W, h, W),
        new THREE.MeshStandardMaterial({
          color: i >= 3 ? 0xffa94d : 0x2e8b57,
          roughness: 0.4, emissive: i >= 3 ? 0x7a4a10 : 0x0d3018, emissiveIntensity: 0.5,
        }));
      bar.position.set((i - (EFFICIENCY.length - 1) / 2) * (W + 1.3), h / 2, 0);
      groups.ladder.add(bar);
      const top = makeLabel(e.zh, i >= 3 ? '#ffc078' : '#9ff0b5');
      top.position.set(bar.position.x, h + 0.8, 0); groups.ladder.add(top);
      const pct = makeLabel(`${e.pct}%`, '#ffffff');
      pct.position.set(bar.position.x, h / 2, 0); pct.scale.multiplyScalar(0.7); groups.ladder.add(pct);
    });
    const l = makeLabel('光合 vs 太阳能板：把光变成可储存能量的效率', '#9ff0b5');
    l.position.set(0, 17, 0); groups.ladder.add(l);
  }

  // ── 视角2：全球尺度 ──
  {
    const earth = new THREE.Mesh(new THREE.SphereGeometry(6, 40, 28),
      new THREE.MeshStandardMaterial({ color: 0x2c6e91, roughness: 0.6, emissive: 0x0a2436, emissiveIntensity: 0.4 }));
    groups.globe.add(earth);
    // 绿色大陆斑块（示意）
    for (let i = 0; i < 14; i++) {
      const patch = new THREE.Mesh(new THREE.SphereGeometry(1.1 + Math.random() * 0.9, 12, 8),
        new THREE.MeshStandardMaterial({ color: 0x2e8b57, roughness: 0.7 }));
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      patch.position.set(6 * Math.sin(ph) * Math.cos(th), 6 * Math.cos(ph), 6 * Math.sin(ph) * Math.sin(th));
      patch.scale.z = 0.25;
      patch.lookAt(0, 0, 0);
      groups.globe.add(patch);
    }
    const l1 = makeLabel('陆地每年固碳 ≈ 120 Gt', '#9ff0b5');
    l1.position.set(0, 8.4, 0); groups.globe.add(l1);
    const l2 = makeLabel('大气 O₂ ≥ 一半来自海洋浮游植物（NOAA）', '#7dd3fc');
    l2.position.set(0, -8.6, 0); groups.globe.add(l2);
    const l3 = makeLabel('24 亿年前：大氧化事件', '#ffe08a');
    l3.position.set(-9.5, 0, 4); groups.globe.add(l3);
  }

  const CAMS = [
    { cam: new THREE.Vector3(-3, 9, 22), target: new THREE.Vector3(-3, 3, 0) },
    { cam: new THREE.Vector3(-3, 12, 24), target: new THREE.Vector3(-3, 6, 0) },
    { cam: new THREE.Vector3(-3, 5, 18), target: new THREE.Vector3(-3, 0, 0) },
  ];
  const NAMES = ['吸收光谱', '效率阶梯', '全球尺度'];
  const state = { stage: 0 };
  function applyStage(s) {
    state.stage = s;
    Object.entries(groups).forEach(([k, g], i) => g.visible = i === s);
    document.getElementById('oFacts').textContent = NAMES[s];
    camera.position.copy(CAMS[s].cam);
    controls.target.copy(CAMS[s].target);
  }
  document.getElementById('rFacts').addEventListener('input', e => applyStage(+e.target.value));
  applyStage(0);

  return {
    scene, camera,
    update(dt) { groups.globe.rotation.y += dt * 0.12; controls.update(); },
    getInfo() { return { stage: state.stage, name: NAMES[state.stage] }; },
  };
}
