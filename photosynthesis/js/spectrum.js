// ═══════════════════════════════════════════════════════
// spectrum.js — ④ 数字与真相
// 视角0：吸收光谱（为什么叶子是绿的）
// 视角1：效率阶梯（植物 vs 太阳能板）
// 视角2：全球尺度（地球 + 数字）
// ═══════════════════════════════════════════════════════
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { makeLabel, updateLabel } from './sprite.js';
import { ABSORPTION, EFFICIENCY, GLOBAL } from './facts.js';
import { i18n } from '../../common/js/i18n.js';

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

  const labelsToUpdate = [];

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
    const l1 = makeLabel(i18n.t('photo.facts_lbl_spectrum'), '#9ff0b5');
    l1.position.set(0, 8.6, 0); groups.spectrum.add(l1);
    labelsToUpdate.push({ sp: l1, key: 'photo.facts_lbl_spectrum', color: '#9ff0b5' });

    const l2 = makeLabel(i18n.t('photo.facts_lbl_green_reflect'), '#ffe08a');
    l2.position.set(0, -1.6, 3); groups.spectrum.add(l2);
    labelsToUpdate.push({ sp: l2, key: 'photo.facts_lbl_green_reflect', color: '#ffe08a' });

    const lBlue = makeLabel(i18n.t('photo.facts_lbl_blue'), '#7dd3fc');
    lBlue.position.set(-W / 2 + (430 - 380) / 320 * W, 7.4, 0); groups.spectrum.add(lBlue);
    labelsToUpdate.push({ sp: lBlue, key: 'photo.facts_lbl_blue', color: '#7dd3fc' });

    const lRed = makeLabel(i18n.t('photo.facts_lbl_red'), '#ff9e9e');
    lRed.position.set(-W / 2 + (662 - 380) / 320 * W, 7.4, 0); groups.spectrum.add(lRed);
    labelsToUpdate.push({ sp: lRed, key: 'photo.facts_lbl_red', color: '#ff9e9e' });

    const lGreen = makeLabel(i18n.t('photo.facts_lbl_green'), '#c9f7cf');
    lGreen.position.set(-W / 2 + (550 - 380) / 320 * W, 3.4, 2.6); groups.spectrum.add(lGreen);
    labelsToUpdate.push({ sp: lGreen, key: 'photo.facts_lbl_green', color: '#c9f7cf' });
  }

  // ── 视角1：效率阶梯 ──
  {
    const EFF_KEYS = {
      crop: 'photo.facts_eff_crop',
      c3: 'photo.facts_eff_c3',
      c4: 'photo.facts_eff_c4',
      pv: 'photo.facts_eff_pv',
      pvRecord: 'photo.facts_eff_pv_rec',
    };
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
      const k = EFF_KEYS[e.key];
      const col = i >= 3 ? '#ffc078' : '#9ff0b5';
      const top = makeLabel(k ? i18n.t(k) : e.zh, col);
      top.position.set(bar.position.x, h + 0.8, 0); groups.ladder.add(top);
      if (k) labelsToUpdate.push({ sp: top, key: k, color: col });
      const pct = makeLabel(`${e.pct}%`, '#ffffff');
      pct.position.set(bar.position.x, h / 2, 0); pct.scale.multiplyScalar(0.7); groups.ladder.add(pct);
    });
    const lLadder = makeLabel(i18n.t('photo.facts_lbl_ladder'), '#9ff0b5');
    lLadder.position.set(0, 17, 0); groups.ladder.add(lLadder);
    labelsToUpdate.push({ sp: lLadder, key: 'photo.facts_lbl_ladder', color: '#9ff0b5' });
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
    const g1 = makeLabel(i18n.t('photo.facts_lbl_globe_c'), '#9ff0b5');
    g1.position.set(0, 8.4, 0); groups.globe.add(g1);
    labelsToUpdate.push({ sp: g1, key: 'photo.facts_lbl_globe_c', color: '#9ff0b5' });

    const g2 = makeLabel(i18n.t('photo.facts_lbl_globe_o2'), '#7dd3fc');
    g2.position.set(0, -8.6, 0); groups.globe.add(g2);
    labelsToUpdate.push({ sp: g2, key: 'photo.facts_lbl_globe_o2', color: '#7dd3fc' });

    const g3 = makeLabel(i18n.t('photo.facts_lbl_globe_goe'), '#ffe08a');
    g3.position.set(-9.5, 0, 4); groups.globe.add(g3);
    labelsToUpdate.push({ sp: g3, key: 'photo.facts_lbl_globe_goe', color: '#ffe08a' });
  }

  const CAMS = [
    { cam: new THREE.Vector3(-3, 9, 22), target: new THREE.Vector3(-3, 3, 0) },
    { cam: new THREE.Vector3(-3, 12, 24), target: new THREE.Vector3(-3, 6, 0) },
    { cam: new THREE.Vector3(-3, 5, 18), target: new THREE.Vector3(-3, 0, 0) },
  ];
  const VIEW_KEYS = ['photo.view_spectrum', 'photo.view_efficiency', 'photo.view_scale'];
  const state = { stage: 0, paused: false };
  function applyStage(s) {
    state.stage = s;
    Object.entries(groups).forEach(([k, g], i) => g.visible = i === s);
    document.getElementById('oFacts').textContent = i18n.t(VIEW_KEYS[s]);
    camera.position.copy(CAMS[s].cam);
    controls.target.copy(CAMS[s].target);
  }
  document.getElementById('rFacts').addEventListener('input', e => applyStage(+e.target.value));
  document.getElementById('bFactsPause').addEventListener('click', e => {
    state.paused = !state.paused;
    e.target.textContent = state.paused ? i18n.t('photo.btn_resume') : i18n.t('photo.btn_pause');
    e.target.classList.toggle('on', state.paused);
  });
  applyStage(0);

  function onLangChange(lang) {
    labelsToUpdate.forEach(({ sp, key, color, size }) => {
      updateLabel(sp, i18n.t(key), color, size);
    });
    document.getElementById('oFacts').textContent = i18n.t(VIEW_KEYS[state.stage]);
    const bPause = document.getElementById('bFactsPause');
    bPause.textContent = state.paused ? i18n.t('photo.btn_resume') : i18n.t('photo.btn_pause');
  }

  return {
    scene, camera,
    update(dt) {
      if (!state.paused) groups.globe.rotation.y += dt * 0.12;
      controls.update();
    },
    getInfo() { return { stage: state.stage, name: i18n.t(VIEW_KEYS[state.stage]) }; },
    onLangChange,
  };
}
