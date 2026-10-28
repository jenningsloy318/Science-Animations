// printing-press-age/js/scenes/a1.js — A1 加压方式进化（Three.js 3D 平压平 → 科尼希蒸汽滚筒 → 霍伊双滚筒轮转机）
'use strict';

import {
  THREE,
  stage3d,
  makeLoop,
  sound,
  createReliefPlate3D,
  createRoller3D,
  createDeformablePaper3D,
  roundRect,
  drawMacroInset,
} from '../../../../common/js/printing/sceneKit.js';
import { logPos } from '../../../../common/js/printing/speedLadder.js';
import { HAND_SPH, STEAM_SPH, ROTARY_SPH, SHEETFED_SPH, WEB_SPH, KOENIG_YEAR, HOE_YEAR } from '../facts.js';

const MODES = [
  { id: 'platen', sph: HAND_SPH, year: '≤1800', labelKey: 'a1.platen' },
  { id: 'cylinder', sph: STEAM_SPH, year: String(KOENIG_YEAR), labelKey: 'a1.cylinder' },
  { id: 'rotary', sph: ROTARY_SPH, year: String(HOE_YEAR), labelKey: 'a1.rotary' },
];

export function create(root, kit) {
  const { t, lang } = kit;
  const st = stage3d(root, { height: 265, camPos: [0, 3.0, 5.4], camTarget: [-0.25, 0.55, 0] });

  const bar = document.createElement('div');
  bar.className = 'steps';
  const btns = MODES.map((m, i) => {
    const b = document.createElement('button');
    b.textContent = t(m.labelKey);
    b.addEventListener('click', () => setMode(i, true));
    bar.appendChild(b);
    return b;
  });
  root.appendChild(bar);

  const read = document.createElement('div');
  read.className = 'readout';
  read.innerHTML = `<span>${t('a1.speed')}: <b id="pa-sph">—</b></span>`;
  root.appendChild(read);

  const modern = document.createElement('div');
  modern.className = 'card';
  modern.innerHTML = `Sheetfed: ≤${SHEETFED_SPH.toLocaleString()} · Web: ≤${WEB_SPH.toLocaleString()} ` +
    (lang() === 'en' ? 'sheets(copies)/hr' : '页（份）/时');
  root.appendChild(modern);

  // ── 1. Mode 0: 3D Flat Platen Press (平压平 ≤1800) ──
  const platenGroup = new THREE.Group();
  platenGroup.position.set(-0.45, 0, 0);
  st.world.add(platenGroup);

  const platenBed = createReliefPlate3D('FLAT 250', {
    width: 2.1,
    depth: 1.25,
    thickness: 0.18,
    reliefHeight: 0.04,
    mirror: true,
    type: 'metal',
  });
  platenGroup.add(platenBed);

  const platenPaper = createDeformablePaper3D(1.95, 1.12, 16, 12, 'FLAT PLATEN 250/h');
  platenPaper.position.y = 0.25;
  platenGroup.add(platenPaper);

  const upperPlaten = new THREE.Group();
  const platenPlate = new THREE.Mesh(
    new THREE.BoxGeometry(2.05, 0.18, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.35, metalness: 0.85 })
  );
  platenPlate.castShadow = true;
  const platenSpindle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.14, 1.15, 18),
    new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.3, metalness: 0.88 })
  );
  platenSpindle.position.y = 0.65;
  upperPlaten.add(platenPlate, platenSpindle);
  upperPlaten.position.y = 1.05;
  platenGroup.add(upperPlaten);

  // Glowing full-area contact plane
  const areaGlowMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0, side: THREE.DoubleSide });
  const areaGlowMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.98, 1.14), areaGlowMat);
  areaGlowMesh.rotation.x = -Math.PI / 2;
  areaGlowMesh.position.y = 0.26;
  platenGroup.add(areaGlowMesh);

  // ── 2. Mode 1: 3D Koenig Steam Cylinder Press (平压圆 1814) ──
  const cylGroup = new THREE.Group();
  cylGroup.position.set(-0.45, 0, 0);
  cylGroup.visible = false;
  st.world.add(cylGroup);

  const railBed = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 0.1, 1.35),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.8 })
  );
  railBed.position.y = 0.05;
  cylGroup.add(railBed);

  const recipBed = createReliefPlate3D('KOENIG 1814', {
    width: 2.15,
    depth: 1.15,
    thickness: 0.16,
    reliefHeight: 0.04,
    mirror: true,
    type: 'metal',
  });
  recipBed.position.y = 0.1;
  cylGroup.add(recipBed);

  const koenigRoller = createRoller3D(0.46, 1.28, { color: 0x64748b, roughness: 0.28, metalness: 0.85 });
  koenigRoller.position.set(0, 0.78, 0);
  cylGroup.add(koenigRoller);

  const koenigSheet = createDeformablePaper3D(2.05, 1.08, 24, 12, 'THE TIMES · 1,100 SPH');
  koenigSheet.position.set(0, 0.31, 0);
  cylGroup.add(koenigSheet);

  // Line-contact glowing nip bar along Z axis
  const lineNipMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 1.26, 12),
    new THREE.MeshBasicMaterial({ color: 0xffaa2b })
  );
  lineNipMesh.rotation.x = Math.PI / 2;
  lineNipMesh.position.set(0, 0.32, 0);
  cylGroup.add(lineNipMesh);

  // ── 3. Mode 2: 3D Hoe Rotary Web Press (圆压圆 1847) ──
  const rotaryGroup = new THREE.Group();
  rotaryGroup.position.set(-0.45, 0, 0);
  rotaryGroup.visible = false;
  st.world.add(rotaryGroup);

  const topPlateCyl = createRoller3D(0.46, 1.32, { color: 0xc87d3b, roughness: 0.26, metalness: 0.86 });
  topPlateCyl.position.set(0, 1.24, 0);
  const botImpCyl = createRoller3D(0.46, 1.32, { color: 0x52606d, roughness: 0.3, metalness: 0.85 });
  botImpCyl.position.set(0, 0.30, 0);
  rotaryGroup.add(topPlateCyl, botImpCyl);

  const rotaryNip = lineNipMesh.clone();
  rotaryNip.position.set(0, 0.77, 0);
  rotaryGroup.add(rotaryNip);

  // Continuous 3D Paper Web Ribbon
  const webRibbon = createDeformablePaper3D(3.5, 1.15, 28, 12, 'ROTARY WEB · 8,000 SPH · HOE 1847');
  webRibbon.position.set(0, 0.77, 0);
  rotaryGroup.add(webRibbon);

  let mode = 0;
  let phase = 0;
  let dispSph = HAND_SPH;
  let autoTimer = 0;
  let userHoldUntil = 0;

  function setMode(i, manual = false) {
    mode = i;
    autoTimer = 0;
    if (manual) userHoldUntil = performance.now() + 9500;
    kit.step(i);
    btns.forEach((b, j) => b.classList.toggle('on', j === i));
    if (manual) sound.play(mode === 0 ? 'thud' : 'ratchet');
    read.querySelector('#pa-sph').textContent =
      `${MODES[i].sph.toLocaleString()} (${MODES[i].year}) · ${(MODES[i].sph / HAND_SPH).toFixed(1)}×`;

    platenGroup.visible = i === 0;
    cylGroup.visible = i === 1;
    rotaryGroup.visible = i === 2;
  }

  const loop = makeLoop((dt, now) => {
    autoTimer += dt;
    if (performance.now() > userHoldUntil && autoTimer > 1.85) {
      setMode((mode + 1) % MODES.length, false);
    }

    phase += dt * (mode === 0 ? 2.1 : mode === 1 ? 3.2 : 6.4);
    const targetSph = MODES[mode].sph;
    dispSph += (targetSph - dispSph) * Math.min(1, dt * 6);

    if (mode === 0) {
      const raw = Math.sin(phase);
      const press = Math.pow(Math.max(0, raw), 1.6);
      upperPlaten.position.y = 0.96 - press * 0.62;
      upperPlaten.children[1].rotation.y = press * 1.4;
      areaGlowMat.opacity = press > 0.78 ? ((press - 0.78) / 0.22) * 0.75 : 0;
    } else if (mode === 1) {
      const swing = Math.sin(phase * 0.85);
      recipBed.position.x = swing * 0.62;
      koenigSheet.position.x = swing * 0.55;
      koenigSheet.setDeform({ curl: 0.18 });
      koenigRoller.rotation.z = -swing * 1.35;
    } else {
      topPlateCyl.rotation.z = -phase;
      botImpCyl.rotation.z = phase;
      webRibbon.setDeform({ wave: 0.25, wavePhase: phase * 1.5 });
    }

    // 2D HUD: Title, Contact Physics Macro Inset, and Logarithmic Speed Ladder
    const g = st.g, W = st.w, H = st.h;
    st.begin();
    const isEn = lang() === 'en';
    const cx = (W - 140) * 0.5 + 10;

    g.fillStyle = 'rgba(255,245,225,0.92)';
    g.font = '600 11px system-ui';
    g.textAlign = 'center';
    const titles = [
      isEn ? 'Flat Platen · Full-Area Contact (250 sph)' : '平压平 · 整面同时受压（约 250 页/时）',
      isEn ? 'Koenig Cylinder Press (1814) · Rolling Line Contact (1,100 sph)' : '科尼希蒸汽滚筒机 (1814) · 滚动线接触（1,100 页/时）',
      isEn ? 'Hoe Rotary Press (1847) · Continuous Web & Dual Cylinders (8,000 sph)' : '霍伊轮转机 (1847) · 卷筒纸连续切线压印（8,000 页/时）',
    ];
    g.fillText(titles[mode], cx, 22);

    const mw = 136, mh = 114;
    drawMacroInset(g, W - mw - 12, 16, mw, mh, isEn ? 'Contact Physics' : '压印接触物理', (mg, iw) => {
      mg.font = '10px system-ui';
      mg.textAlign = 'center';
      if (mode === 0) {
        mg.fillStyle = '#75828e'; mg.fillRect(22, 18, iw - 44, 14);
        mg.fillStyle = 'rgba(235, 140, 45, 0.65)'; mg.fillRect(22, 34, iw - 44, 8);
        mg.fillStyle = '#8a6238'; mg.fillRect(22, 44, iw - 44, 14);
        mg.fillStyle = '#f5e8cc'; mg.fillText(isEn ? 'Area Contact (Full Sheet)' : '面接触：整版分摊压力', iw / 2, 74);
        mg.fillStyle = '#fbbf24'; mg.fillText('P = F / A_large', iw / 2, 90);
      } else if (mode === 1) {
        mg.fillStyle = '#75828e'; mg.beginPath(); mg.arc(iw / 2, 24, 18, 0, Math.PI * 2); mg.fill();
        mg.fillStyle = '#ffaa32'; mg.beginPath(); mg.arc(iw / 2, 43, 4, 0, Math.PI * 2); mg.fill();
        mg.fillStyle = '#8a6238'; mg.fillRect(18, 45, iw - 36, 12);
        mg.fillStyle = '#f5e8cc'; mg.fillText(isEn ? 'Line Nip (Reciprocating)' : '线接触：压强集中 4.4×', iw / 2, 74);
        mg.fillStyle = '#fbbf24'; mg.fillText('P = F / A_line', iw / 2, 90);
      } else {
        mg.fillStyle = '#b87838'; mg.beginPath(); mg.arc(iw / 2, 19, 14, 0, Math.PI * 2); mg.fill();
        mg.fillStyle = '#75828e'; mg.beginPath(); mg.arc(iw / 2, 51, 14, 0, Math.PI * 2); mg.fill();
        mg.fillStyle = '#faf3e3'; mg.fillRect(14, 33.5, iw - 28, 3);
        mg.fillStyle = '#ffbe3c'; mg.beginPath(); mg.arc(iw / 2, 35, 4, 0, Math.PI * 2); mg.fill();
        mg.fillStyle = '#f5e8cc'; mg.fillText(isEn ? 'Rotary Nip (No Return)' : '无往复空程 · 提速 32×', iw / 2, 80);
        mg.fillStyle = '#fbbf24'; mg.fillText('ω_plate = ω_imp', iw / 2, 94);
      }
    });

    st.end();
  });

  setMode(0, false);
  return {
    mount() {},
    onShow() { loop.start(); },
    onHide() { loop.stop(); },
  };
}
