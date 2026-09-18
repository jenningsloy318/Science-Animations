// ═══════════════════════════════════════════════════════
// story.js — ① 一图看懂（总览故事场景，默认首屏）
// 阳光 + 水 + 二氧化碳 → 糖 + 氧气，全部画成看得见的实物：
// 太阳光子雨、根送上来的水滴、空气飘来的 CO₂、拼出的糖块、冒走的氧气泡
// "一分钟故事"：四句大字幕 + 相机逐句带看
// ═══════════════════════════════════════════════════════
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { makeLabel, makeGlowDot } from './sprite.js';

const C = { photon: 0xffd54a, water: 0x69b7ff, co2: 0xaab4c2, o2: 0xeaf6ff, sugar: 0xc8e86a };

export function buildStory() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#060b12');
  scene.fog = new THREE.Fog('#060b12', 46, 110);
  const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.1, 300);
  camera.position.set(0, 2.5, 30);

  scene.add(new THREE.AmbientLight('#46536a', 1.0));
  const key = new THREE.DirectionalLight('#fff2d8', 1.4);
  key.position.set(-8, 14, 12); scene.add(key);

  const controls = new OrbitControls(camera, document.getElementById('gl'));
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.target.set(0, 2, 0);

  // ── 大叶子（面向观众的叶片，半透）──
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, -5);
  leafShape.quadraticCurveTo(-6.8, -2.5, -6.2, 1.5);
  leafShape.quadraticCurveTo(-5.6, 5.2, 0, 6.6);
  leafShape.quadraticCurveTo(5.6, 5.2, 6.2, 1.5);
  leafShape.quadraticCurveTo(6.8, -2.5, 0, -5);
  const leafGeo = new THREE.ExtrudeGeometry(leafShape, { depth: 0.4, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 2 });
  const leafMat = new THREE.MeshStandardMaterial({
    color: '#3fae6a', roughness: 0.5, emissive: '#0d3018', emissiveIntensity: 0.55,
    transparent: true, opacity: 0.88,
  });
  const leaf = new THREE.Mesh(leafGeo, leafMat);
  leaf.position.set(0, 2.6, 0);
  scene.add(leaf);
  const leafLabel = makeLabel('叶子 = 糖工厂', '#9ff0b5');
  leafLabel.position.set(0, -3.4, 0); scene.add(leafLabel);

  // 茎
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.6, 6.5, 12),
    new THREE.MeshStandardMaterial({ color: '#3c7a4a', roughness: 0.6 }));
  stem.position.set(0, -6.2, 0); scene.add(stem);

  // ── 太阳 ──
  const sun = new THREE.Mesh(new THREE.SphereGeometry(1.7, 24, 18),
    new THREE.MeshBasicMaterial({ color: 0xffd54a }));
  sun.position.set(-11.5, 9.5, -3); scene.add(sun);
  const sunLabel = makeLabel('☀ 阳光（能量）', '#ffd54a');
  sunLabel.position.set(-11.5, 12.2, -3); scene.add(sunLabel);
  const sunGlow = new THREE.PointLight('#ffd54a', 60, 50, 2);
  sunGlow.position.copy(sun.position); scene.add(sunGlow);

  // ── 标签们 ──
  const waterLabel = makeLabel('💧 水（根送上来）', '#7dd3fc');
  waterLabel.position.set(-6.8, -7.6, 0); scene.add(waterLabel);
  const co2Label = makeLabel('💨 二氧化碳（从空气）', '#cfd8e3');
  co2Label.position.set(9.2, 7.8, 0); scene.add(co2Label);
  const o2Label = makeLabel('😮‍💨 氧气（我们呼吸！）', '#ffffff');
  o2Label.position.set(6.8, 12.6, 0); scene.add(o2Label);
  const sugarLabel = makeLabel('🍬 糖（植物的食物）', '#dbe86a');
  sugarLabel.position.set(-7.6, 5.6, 0); scene.add(sugarLabel);
  const allLabels = [leafLabel, sunLabel, waterLabel, co2Label, o2Label, sugarLabel];

  // ── 颗粒系统 ──
  const photons = [], waters = [], co2s = [], o2s = [], sugars = [];
  const sugarPile = new THREE.Group(); scene.add(sugarPile);
  const state = {
    timers: { p: 0, w: 0, c: 0 },
    counts: { water: 0, co2: 0, sugar: 0, o2: 0 },
    co2ToSugar: 0,            // 每 6 个 CO₂ → 1 块糖（真实配比）
    co2ToO2: 0,               // 每个 CO₂ ↔ 1 个 O₂
    story: -1, storyT: 0,     // -1 关闭; 0..3 四句
    captionEl: null,
  };

  const CAPTIONS = [
    '看！阳光照在叶子上 —— 叶子里有会"吃光"的小工厂。',
    '工厂需要两样原料：根里送上来的【水】，和空气里抓来的【二氧化碳】。',
    '光先干一件事：把水拆开，放出【氧气】—— 你呼吸的氧，就是植物放出来的！',
    '再用阳光充的"电池"把二氧化碳拼成【糖】—— 植物自己的食物。这件事就叫：光合作用！',
  ];
  const STEP_FOCUS = [
    [sunLabel, leafLabel],
    [waterLabel, co2Label],
    [o2Label, leafLabel],
    [sugarLabel, leafLabel],
  ];
  const STEP_CAM = [
    { cam: new THREE.Vector3(-4, 5, 26), target: new THREE.Vector3(-2, 3, 0) },
    { cam: new THREE.Vector3(0, 0, 27), target: new THREE.Vector3(0, 0, 0) },
    { cam: new THREE.Vector3(3, 6, 22), target: new THREE.Vector3(2, 5, 0) },
    { cam: new THREE.Vector3(-2, 2.5, 19), target: new THREE.Vector3(0, 2.5, 0) },
  ];
  const HOME = { cam: new THREE.Vector3(0, 2.5, 30), target: new THREE.Vector3(0, 2, 0) };

  function setDim(focus) {
    allLabels.forEach(l => {
      l.material.opacity = focus && !focus.includes(l) ? 0.18 : 1;
    });
  }
  function stopStory() {
    state.story = -1;
    state.captionEl.style.display = 'none';
    setDim(null);
    const b = document.getElementById('bStory');
    b.textContent = '▶ 一分钟故事'; b.classList.remove('on');
  }

  // ── HUD ──
  const els = ['hSwater', 'hSco2', 'hSsugar', 'hSo2'].map(id => document.getElementById(id));
  function refreshHUD() {
    els[0].textContent = state.counts.water;
    els[1].textContent = state.counts.co2;
    els[2].textContent = state.counts.sugar;
    els[3].textContent = state.counts.o2;
  }

  document.getElementById('bStory').addEventListener('click', e => {
    if (state.story >= 0) { stopStory(); }
    else {
      state.story = 0; state.storyT = 0;
      e.target.textContent = '⏹ 停止故事'; e.target.classList.add('on');
    }
  });
  document.getElementById('bStoryHome').addEventListener('click', () => {
    stopStory();
    camera.position.copy(HOME.cam); controls.target.copy(HOME.target);
  });
  state.captionEl = document.getElementById('storyCaption');

  // ── 生成器 ──
  function spawnPhoton() {
    const m = makeGlowDot(0.13, C.photon);
    m.position.copy(sun.position).add(new THREE.Vector3((Math.random() - 0.5) * 1.4, (Math.random() - 0.5) * 1, 0));
    scene.add(m);
    photons.push({ mesh: m, tx: -3.8 + Math.random() * 7.6, ty: 1.5 + Math.random() * 4.5 });
  }
  function spawnWater() {
    const m = makeGlowDot(0.17, C.water);
    m.position.set(0.3 + (Math.random() - 0.5) * 0.5, -8.8, 0);
    scene.add(m);
    waters.push({ mesh: m });
  }
  function spawnCO2() {
    const m = makeGlowDot(0.16, C.co2);
    m.position.set(11 + Math.random() * 1.5, 1 + Math.random() * 4.5, 0);
    scene.add(m);
    co2s.push({ mesh: m });
  }
  function spawnO2() {
    const m = makeGlowDot(0.19, C.o2);
    m.position.set(-1.5 + Math.random() * 3, 8.6, 0);
    scene.add(m);
    o2s.push({ mesh: m, t: 0 });
    state.counts.o2++;
  }
  function spawnSugar() {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.42),
      new THREE.MeshStandardMaterial({ color: C.sugar, roughness: 0.3, emissive: '#4a5a10', emissiveIntensity: 0.5 }));
    const i = sugarPile.children.length;
    m.position.set(((i % 4) - 1.5) * 1.15 + (Math.random() - 0.5) * 0.2, Math.floor(i / 4) * 1.05, 0.9);
    scene.add(m);
    sugars.push(m);
    state.counts.sugar++;
    if (sugars.length > 8) {
      const old = sugars.shift();
      scene.remove(old);
      sugarPile.children.slice().forEach(c => { if (c !== old && !sugars.includes(c)) sugarPile.remove(c); });
    }
  }

  // ── 更新 ──
  function update(dt0) {
    const dt = dt0;

    // 生成节奏
    state.timers.p += dt; if (state.timers.p > 0.4) { state.timers.p = 0; spawnPhoton(); }
    state.timers.w += dt; if (state.timers.w > 1.15) { state.timers.w = 0; spawnWater(); }
    state.timers.c += dt; if (state.timers.c > 1.35) { state.timers.c = 0; spawnCO2(); }

    // 光子飞向叶子
    for (let i = photons.length - 1; i >= 0; i--) {
      const p = photons[i];
      const dx = p.tx - p.mesh.position.x, dy = p.ty - p.mesh.position.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.3) {
        scene.remove(p.mesh); photons.splice(i, 1);
        leafMat.emissiveIntensity = Math.min(1.1, leafMat.emissiveIntensity + 0.15); // 叶子闪一下
        continue;
      }
      p.mesh.position.x += dx / d * 6.5 * dt;
      p.mesh.position.y += dy / d * 6.5 * dt;
    }
    leafMat.emissiveIntensity = Math.max(0.55, leafMat.emissiveIntensity - dt * 0.5);

    // 水滴上升
    for (let i = waters.length - 1; i >= 0; i--) {
      const w = waters[i];
      w.mesh.position.y += 2.6 * dt;
      if (w.mesh.position.y >= -0.6) {
        scene.remove(w.mesh); waters.splice(i, 1);
        state.counts.water++;
        continue;
      }
    }
    // CO₂ 飘向叶子
    for (let i = co2s.length - 1; i >= 0; i--) {
      const c = co2s[i];
      const dx = 0.5 - c.mesh.position.x, dy = 3 - c.mesh.position.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.5) {
        scene.remove(c.mesh); co2s.splice(i, 1);
        state.counts.co2++;
        state.co2ToO2++; state.co2ToSugar++;
        if (state.co2ToO2 >= 1) { state.co2ToO2 = 0; spawnO2(); }        // 1 CO₂ ↔ 1 O₂（总方程比例）
        if (state.co2ToSugar >= 6) { state.co2ToSugar = 0; spawnSugar(); } // 6 CO₂ → 1 糖
        continue;
      }
      c.mesh.position.x += dx / d * 1.9 * dt;
      c.mesh.position.y += dy / d * 1.9 * dt;
    }
    // 氧气泡上飘
    for (let i = o2s.length - 1; i >= 0; i--) {
      const o = o2s[i];
      o.t += dt;
      o.mesh.position.y += 2.1 * dt;
      o.mesh.position.x += 0.9 * dt;
      o.mesh.material.opacity = 1;
      if (o.mesh.position.y > 11.5) { scene.remove(o.mesh); o2s.splice(i, 1); }
    }

    // 故事模式：字幕 + 相机
    if (state.story >= 0) {
      state.storyT += dt;
      const w = STEP_CAM[state.story];
      camera.position.lerp(w.cam, Math.min(1, dt * 2));
      controls.target.lerp(w.target, Math.min(1, dt * 2));
      state.captionEl.style.display = 'block';
      state.captionEl.textContent = CAPTIONS[state.story];
      setDim(STEP_FOCUS[state.story]);
      if (state.storyT > 6.5) { state.storyT = 0; state.story = (state.story + 1) % 4; }
    } else {
      camera.position.lerp(HOME.cam, Math.min(1, dt * 1.2));
      controls.target.lerp(HOME.target, Math.min(1, dt * 1.2));
    }

    controls.update();
  }

  return {
    scene, camera, update, refreshHUD,
    getInfo() { return { ...state.counts, story: state.story }; },
  };
}
