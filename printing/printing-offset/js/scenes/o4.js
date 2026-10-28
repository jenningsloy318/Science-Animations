// printing-offset/js/scenes/o4.js — O4 全彩印刷工厂（Three.js 3D 四色串联胶印机组、CMYK 玫瑰斑与 K 黑版对比）
'use strict';

import {
  THREE,
  stage3d,
  makeLoop,
  sound,
  createRoller3D,
  createDeformablePaper3D,
  drawMacroInset,
} from '../../../../common/js/printing/sceneKit.js';
import { mix } from '../model/halftone.js';
import { moireIndex, DEFAULT_ANGLES } from '../model/screenAngle.js';
import { SCREEN_ANGLES } from '../facts.js';

export function create(root, kit) {
  const { t, lang } = kit;
  const st = stage3d(root, { height: 265, camPos: [0, 3.1, 5.6], camTarget: [-0.35, 0.45, 0] });

  const inks = [['c', 'o4.c'], ['m', 'o4.m'], ['y', 'o4.y'], ['k', 'o4.k']];
  const vals = { c: 55, m: 40, y: 20, k: 8 };
  let compareMode = false;
  let userHoldUntil = 0;
  let autoClock = 0;
  let autoPass = 4; // 1: C, 2: C+M, 3: C+M+Y, 4: C+M+Y+K

  const rows = inks.map(([prop, key]) => {
    const row = document.createElement('div');
    row.className = 'slider-row';
    const lb = document.createElement('span'); lb.textContent = t(key);
    const input = document.createElement('input');
    input.type = 'range'; input.min = 0; input.max = 100; input.value = vals[prop];
    const val = document.createElement('span'); val.className = 'val'; val.textContent = vals[prop] + '%';
    input.addEventListener('input', () => {
      userHoldUntil = performance.now() + 10000;
      compareMode = false;
      autoPass = 4;
      kit.step(4);
      vals[prop] = Number(input.value);
      val.textContent = vals[prop] + '%';
      sound.play('tick');
    });
    row.append(lb, input, val);
    root.appendChild(row);
    return { prop, row, input, val };
  });

  const read = document.createElement('div');
  read.className = 'readout';
  read.innerHTML = `<span>${t('o4.rgb')}: <b id="of-rgb">—</b></span>
    <span>${t('o4.angles')}</span>`;
  root.appendChild(read);

  const note = document.createElement('div');
  note.className = 'card';
  note.textContent = t('o4.sheetweb');
  root.appendChild(note);

  const PRESET = { c: 55, m: 40, y: 20, k: 8 };
  const zoom = { on: false };
  const zoomBtn = document.createElement('button');
  zoomBtn.className = 'steps';
  zoomBtn.style.display = 'inline-block';
  zoomBtn.textContent = t('o4.zoom');
  zoomBtn.addEventListener('click', () => {
    userHoldUntil = performance.now() + 10000;
    compareMode = false;
    zoom.on = !zoom.on;
    zoomBtn.classList.toggle('on', zoom.on);
    sound.play('tick');
  });
  root.appendChild(zoomBtn);

  const kBtn = document.createElement('button');
  kBtn.className = 'steps';
  kBtn.style.display = 'inline-block';
  kBtn.textContent = t('o4.withk');
  kBtn.addEventListener('click', () => {
    userHoldUntil = performance.now() + 10000;
    compareMode = !compareMode;
    kBtn.classList.toggle('on', compareMode);
    sound.play('pop');
  });
  root.appendChild(kBtn);

  function syncSliders(activeVals) {
    rows.forEach(({ prop, input, val }) => {
      input.value = activeVals[prop];
      val.textContent = activeVals[prop] + '%';
    });
  }

  // ── Build 3D 4-Color Inline Offset Press Towers (Cyan, Magenta, Yellow, Key Black) ──
  const pressGroup = new THREE.Group();
  pressGroup.position.set(-0.45, 0, -0.25);
  st.world.add(pressGroup);

  const towerDefs = [
    { label: 'C 15°', hex: 0x06b6d4, x: -1.35 },
    { label: 'M 75°', hex: 0xe11d48, x: -0.45 },
    { label: 'Y 90°', hex: 0xeab308, x: 0.45 },
    { label: 'K 45°', hex: 0x1e293b, x: 1.35 },
  ];

  const towers3D = towerDefs.map((td) => {
    const g = new THREE.Group();
    g.position.set(td.x, 0, 0);
    const topCyl = createRoller3D(0.22, 0.92, { color: td.hex, roughness: 0.25, metalness: 0.55 });
    topCyl.position.y = 0.86;
    const midCyl = createRoller3D(0.22, 0.92, { color: 0x334155, roughness: 0.42, metalness: 0.35 });
    midCyl.position.y = 0.42;
    g.add(topCyl, midCyl);
    pressGroup.add(g);
    return { group: g, topCyl, midCyl };
  });

  // 3D Paper Web & Mixed Color Proof Slab in foreground
  const proofMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.38, metalness: 0.05 });
  const proofSlab = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.08, 0.88), proofMat);
  proofSlab.position.set(-0.45, 0.14, 0.65);
  proofSlab.castShadow = true;
  proofSlab.receiveShadow = true;
  st.world.add(proofSlab);

  // Side-by-side 3D comparison slabs for Compare Mode (CMY Muddy Brown vs CMYK True Black)
  const compareGroup = new THREE.Group();
  compareGroup.position.set(-0.45, 0.16, 0.65);
  compareGroup.visible = false;
  const noKRes = mix({ c: 100, m: 100, y: 100, k: 0 });
  const withKRes = mix({ c: 100, m: 100, y: 100, k: 100 });
  const slabNoK = new THREE.Mesh(
    new THREE.BoxGeometry(1.32, 0.14, 0.88),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(`rgb(${noKRes.rgb.join(',')})`), roughness: 0.45 })
  );
  slabNoK.position.x = -0.74;
  const slabWithK = new THREE.Mesh(
    new THREE.BoxGeometry(1.32, 0.14, 0.88),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(`rgb(${withKRes.rgb.join(',')})`), roughness: 0.25 })
  );
  slabWithK.position.x = 0.74;
  compareGroup.add(slabNoK, slabWithK);
  st.world.add(compareGroup);

  const webSheet = createDeformablePaper3D(3.4, 0.86, 24, 10, 'CMYK INLINE WEB');
  webSheet.position.set(-0.45, 0.18, -0.25);
  st.world.add(webSheet);

  function drawRosettePattern(g, cx, cy, radius, activeVals, cell = 12) {
    g.save();
    g.beginPath();
    g.arc(cx, cy, radius, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = '#fdfaf2';
    g.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

    const layers = [
      { v: activeVals.y / 100, col: 'rgba(250, 204, 21, 0.85)', ang: SCREEN_ANGLES.y },
      { v: activeVals.c / 100, col: 'rgba(6, 182, 212, 0.82)', ang: SCREEN_ANGLES.c },
      { v: activeVals.m / 100, col: 'rgba(225, 29, 72, 0.80)', ang: SCREEN_ANGLES.m },
      { v: activeVals.k / 100, col: 'rgba(20, 22, 25, 0.88)', ang: SCREEN_ANGLES.k },
    ];

    const span = radius * 1.45;
    layers.forEach((layer) => {
      if (layer.v <= 0.01) return;
      g.save();
      g.translate(cx, cy);
      g.rotate((layer.ang * Math.PI) / 180);
      g.fillStyle = layer.col;
      const dotR = Math.max(1.1, (layer.v * cell) / 1.55);
      for (let yy = -span; yy <= span; yy += cell) {
        for (let xx = -span; xx <= span; xx += cell) {
          g.beginPath();
          g.arc(xx, yy, dotR, 0, Math.PI * 2);
          g.fill();
        }
      }
      g.restore();
    });
    g.restore();
  }

  const loop = makeLoop((dt, now) => {
    if (performance.now() > userHoldUntil && !compareMode) {
      autoClock += dt;
      if (autoClock > 0.65) {
        autoClock = 0;
        autoPass = (autoPass % 4) + 1;
        kit.step(autoPass - 1);
      }
    }

    const activeVals = {
      c: autoPass >= 1 ? vals.c : 0,
      m: autoPass >= 2 ? vals.m : 0,
      y: autoPass >= 3 ? vals.y : 0,
      k: autoPass >= 4 ? vals.k : 0,
    };

    // Animate 4 3D CMYK Offset Towers & Color Proof Slab
    towers3D.forEach((tw, idx) => {
      const active = autoPass >= idx + 1;
      tw.topCyl.rotation.z = -now * 3.2;
      tw.midCyl.rotation.z = now * 3.2;
      tw.group.position.y = active ? 0 : 0.18;
    });

    const { rgb } = mix(activeVals);
    proofMat.color.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
    proofSlab.visible = !compareMode;
    compareGroup.visible = compareMode;

    // 2D HUD & CMYK Rosette Loupe
    const g = st.g, W = st.w, H = st.h;
    st.begin();
    const isEn = lang() === 'en';
    const leftW = W - 156;

    if (compareMode) {
      g.fillStyle = '#f8fafc';
      g.font = '700 11px system-ui';
      g.textAlign = 'center';
      g.fillText(
        isEn ? 'Left: CMY 100% (Muddy Brown)   vs   Right: CMYK + Key Black (Rich True Black)' : '左：仅 CMY 满叠（浑浊褐黑）  vs  右：CMYK 引入 K 黑版（深邃纯黑）',
        leftW * 0.5, H - 12
      );
    } else if (zoom.on) {
      drawRosettePattern(g, leftW * 0.48, H * 0.52, Math.min(leftW, H) * 0.36, activeVals, 13);
    }

    const mw = 138, mh = 138;
    drawMacroInset(g, W - mw - 10, 16, mw, mh, isEn ? 'CMYK Rosette Loupe' : '四色网角玫瑰斑微距', (mg, iw) => {
      drawRosettePattern(mg, iw / 2, 44, 34, activeVals, 10);
      mg.strokeStyle = 'rgba(255, 190, 60, 0.65)';
      mg.lineWidth = 1.4;
      mg.beginPath();
      mg.arc(iw / 2, 44, 34, 0, Math.PI * 2);
      mg.stroke();

      mg.fillStyle = '#e2e8f0';
      mg.font = '9.5px system-ui';
      mg.textAlign = 'center';
      mg.fillText('C15° · M75° · Y90° · K45°', iw / 2, 92);
      mg.fillStyle = '#94a3b8';
      mg.font = '9px system-ui';
      mg.fillText(isEn ? '≥30° separation avoids Moiré' : '强色相隔 30° 消除龟纹撞网', iw / 2, 108);
    });

    const rgbEl = read.querySelector('#of-rgb');
    if (rgbEl) rgbEl.textContent = `rgb(${rgb.join(',')})`;
    st.end();
  });

  const mi = moireIndex(DEFAULT_ANGLES);

  return {
    mount() {
      Object.assign(vals, PRESET);
      syncSliders(vals);
      console.assert(mi.minPair >= 15, 'screen angles moire');
    },
    onShow() { loop.start(); },
    onHide() { loop.stop(); },
  };
}
