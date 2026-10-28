// printing-gutenberg/js/scenes/g2.js — G2 合金实验室（Three.js 3D 铁水包倾倒与锑 Sb 反常膨胀充模特写）
'use strict';

import {
  THREE,
  stage3d,
  makeLoop,
  tween,
  sound,
  createMovableType3D,
  drawMacroInset,
} from '../../../../common/js/printing/sceneKit.js';
import { solidification, normalize } from '../model/alloy.js';

export function create(root, kit) {
  const { t, lang } = kit;
  const st = stage3d(root, { height: 250, camPos: [0, 2.9, 5.2], camTarget: [0, 0.45, 0] });

  const comp = { pb: 82, sb: 13, sn: 5 };
  const rows = [
    ['g2.pb', 'pb'], ['g2.sb', 'sb'], ['g2.sn', 'sn'],
  ].map(([key, prop]) => {
    const row = document.createElement('div');
    row.className = 'slider-row';
    const lb = document.createElement('span');
    lb.textContent = t(key);
    const input = document.createElement('input');
    input.type = 'range'; input.min = 0; input.max = 100; input.value = comp[prop];
    const val = document.createElement('span');
    val.className = 'val';
    row.append(lb, input, val);
    root.appendChild(row);
    input.addEventListener('input', () => {
      autoTimer = -5;
      comp[prop] = Number(input.value);
      syncSliders();
      kit.step(0);
      sound.play('tick');
    });
    return { key, prop, lb, input, val };
  });

  const castBtn = document.createElement('button');
  castBtn.className = 'steps';
  castBtn.style.display = 'inline-block';
  castBtn.textContent = t('g2.castBtn');
  root.appendChild(castBtn);

  const read = document.createElement('div');
  read.className = 'readout';
  read.innerHTML = `<span id="gb-lbl-v">${t('g2.dvol')}: <b id="gb-dvol">—</b></span>
    <span id="gb-lbl-m">${t('g2.melt')}: <b id="gb-melt">—</b></span>
    <span id="gb-sharp"></span>`;
  root.appendChild(read);

  // ── 3D Cutaway Copper Matrix Block with V-Groove Cavity (Left/Center) ──
  const mouldGroup = new THREE.Group();
  mouldGroup.position.set(-0.75, 0, 0);
  st.world.add(mouldGroup);

  const copperMat = new THREE.MeshStandardMaterial({ color: 0xc27030, roughness: 0.35, metalness: 0.85 });
  const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 1.1), copperMat);
  wallLeft.position.set(-0.68, 0.42, 0);
  wallLeft.rotation.z = -0.22;
  wallLeft.castShadow = true;

  const wallRight = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 1.1), copperMat);
  wallRight.position.set(0.68, 0.42, 0);
  wallRight.rotation.z = 0.22;
  wallRight.castShadow = true;

  const baseBlock = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.24, 1.25), copperMat);
  baseBlock.position.y = 0.12;
  baseBlock.receiveShadow = true;
  mouldGroup.add(wallLeft, wallRight, baseBlock);

  // 3D Solidifying Alloy Wedge inside the Copper V-Groove
  const wedgeGeo = new THREE.CylinderGeometry(0.48, 0.14, 0.65, 4);
  wedgeGeo.rotateY(Math.PI / 4);
  const wedgeMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.25,
    metalness: 0.88,
    emissive: 0xff6b1a,
    emissiveIntensity: 0,
  });
  const wedgeMesh = new THREE.Mesh(wedgeGeo, wedgeMat);
  wedgeMesh.position.y = 0.52;
  mouldGroup.add(wedgeMesh);

  // 3D Tilting Crucible Ladle & Glowing Molten Stream above Mould
  const ladleGroup = new THREE.Group();
  ladleGroup.position.set(-1.35, 1.45, 0);
  const ladlePot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.22, 0.38, 18),
    new THREE.MeshStandardMaterial({ color: 0x333942, roughness: 0.65, metalness: 0.75 })
  );
  const ladleGlow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 0.06, 16),
    new THREE.MeshBasicMaterial({ color: 0xff8c24 })
  );
  ladleGlow.position.y = 0.17;
  ladleGroup.add(ladlePot, ladleGlow);
  st.world.add(ladleGroup);

  const streamMat = new THREE.MeshBasicMaterial({ color: 0xff851b, transparent: true, opacity: 0 });
  const streamMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.065, 1.05, 12), streamMat);
  streamMesh.position.set(-0.75, 0.95, 0);
  st.world.add(streamMesh);

  // ── Right Specimen Display: Resulting 3D Cast Lead Type 'A' ──
  const specimenType = createMovableType3D('A', { size: 0.58, height: 0.72, materialType: 'lead' });
  specimenType.position.set(0.85, 0.02, 0.15);
  st.world.add(specimenType);

  let pourK = 1, busy = false, autoTimer = 0, userHoldUntil = 0, cyclePhase = 0;

  rows.forEach((r) => {
    r.input.addEventListener('pointerdown', () => { userHoldUntil = performance.now() + 8000; });
    r.input.addEventListener('touchstart', () => { userHoldUntil = performance.now() + 8000; });
  });

  function syncSliders() {
    const n = normalize(comp);
    comp.pb = n.pb; comp.sb = n.sb; comp.sn = n.sn;
    rows.forEach((r) => {
      r.input.value = String(Math.round(n[r.prop]));
      r.val.textContent = n[r.prop].toFixed(1) + '%';
    });
    updateReadout();
  }

  function updateReadout() {
    const r = solidification(comp);
    read.querySelector('#gb-dvol').textContent = (r.dVolPct >= 0 ? '+' : '') + r.dVolPct.toFixed(2) + '%';
    read.querySelector('#gb-melt').textContent = r.meltC + ' °C';
    read.querySelector('#gb-sharp').innerHTML = r.sharpness === 'sharp'
      ? `<b style="color:#059669">✓ ${t('g2.sharp')}</b>`
      : r.sharpness === 'blunt'
        ? `<b style="color:#c0392b">✗ ${t('g2.blunt')}</b>`
        : `<b style="color:#d97706">~ ${t('g2.ok')}</b>`;
  }

  async function runCast(withSound = false) {
    if (busy) return;
    busy = true;
    pourK = 0;
    if (withSound) sound.play('pour');
    kit.step(2);
    await tween(1350, (e) => { pourK = e; });
    kit.step(3);
    if (withSound) sound.play('pop');
    kit.step(4);
    busy = false;
  }

  castBtn.addEventListener('click', () => {
    autoTimer = -5;
    runCast(true);
  });

  syncSliders();

  const loop = makeLoop((dt, now) => {
    if (!busy) {
      autoTimer += dt;
      if (autoTimer > 0.45) {
        autoTimer = 0;
        if (performance.now() > userHoldUntil) {
          cyclePhase = (cyclePhase + 1) % 2;
          // 循环轮换：古腾堡完美膨胀配方 (Sb 15%) vs 缺锑钝角收缩配方 (Sb 2%)
          if (cyclePhase === 0) {
            comp.pb = 80; comp.sb = 15; comp.sn = 5;
          } else {
            comp.pb = 93; comp.sb = 2; comp.sn = 5;
          }
          syncSliders();
        }
        runCast(false);
      }
    }

    const r = solidification(comp);

    // 1. Crucible tilt & molten stream
    const pouring = pourK > 0.02 && pourK < 0.78;
    ladleGroup.rotation.z = pouring ? -0.68 * Math.sin((pourK / 0.78) * Math.PI) : -0.12;
    streamMat.opacity = pouring ? 0.92 : 0;

    // 2. Solidifying Alloy Wedge inside V-groove (expands when dVolPct > 0, shrinks when dVolPct < 0)
    const fillRatio = Math.max(0.08, Math.min(1, pourK * 1.18));
    const coolRatio = Math.max(0, (pourK - 0.5) / 0.5);
    const volScale = 1 + coolRatio * (r.dVolPct * 0.08);
    wedgeMesh.scale.set(fillRatio * volScale, fillRatio, fillRatio * volScale);
    wedgeMesh.position.y = 0.24 + 0.28 * fillRatio;
    wedgeMat.emissiveIntensity = (1 - coolRatio) * 0.95;

    // 3. Resulting 3D Specimen Type sharpness/expansion visual
    specimenType.scale.set(volScale, 1, volScale);
    specimenType.rotation.y = Math.sin(now * 1.1) * 0.22;

    // 2D HUD & Apex Micro-View Inset
    const g = st.g, W = st.w, H = st.h;
    st.begin();

    if (pourK >= 0.82) {
      g.font = '700 11.5px system-ui';
      g.textAlign = 'left';
      if (r.dVolPct > 0) {
        g.fillStyle = '#34d399';
        g.fillText('⟷ ' + t('g2.expand') + ` (+${r.dVolPct.toFixed(2)}%)`, 16, H - 12);
      } else {
        g.fillStyle = '#f87171';
        g.fillText((lang() === 'en' ? 'Shrinkage gap → blunt edges' : '↘↙ 凝固收缩留缝 · 笔锋残缺') + ` (${r.dVolPct.toFixed(2)}%)`, 16, H - 12);
      }
    }

    const inW = Math.min(184, W * 0.36), inH = 152;
    drawMacroInset(g, W - inW - 12, 14, inW, inH, lang() === 'en' ? 'Apex Micro-view' : '字锋尖角 · 晶体膨胀微视', (gg, x, y, w, h) => {
      const cx = x + w / 2, cy = y + h * 0.56;
      gg.fillStyle = '#9e5824';
      gg.fillRect(x + 16, cy - 32, w - 32, 68);
      gg.fillStyle = '#2d1606';
      gg.beginPath();
      gg.moveTo(cx - 38, cy - 32);
      gg.lineTo(cx + 38, cy - 32);
      gg.lineTo(cx, cy + 24);
      gg.closePath();
      gg.fill();

      const shrink = r.dVolPct < 0 ? Math.min(16, -r.dVolPct * 22) : 0;
      const tipY = cy + 24 - shrink;
      gg.fillStyle = r.dVolPct > 0 ? '#cbd5e1' : '#94a3b8';
      gg.beginPath();
      gg.moveTo(cx - 34 + shrink * 0.5, cy - 30);
      gg.lineTo(cx + 34 - shrink * 0.5, cy - 30);
      if (shrink > 1) {
        gg.quadraticCurveTo(cx, tipY, cx - 34 + shrink * 0.5, cy - 30);
      } else {
        gg.lineTo(cx, cy + 24);
      }
      gg.closePath();
      gg.fill();

      gg.strokeStyle = r.dVolPct > 0 ? '#34d399' : '#f87171';
      gg.lineWidth = 1.8;
      gg.beginPath(); gg.arc(cx, cy + 18, 12, 0, Math.PI * 2); gg.stroke();

      gg.fillStyle = '#d8d0c5'; gg.font = '10px system-ui'; gg.textAlign = 'center';
      gg.fillText(
        r.dVolPct > 0
          ? (lang() === 'en' ? 'Sb≥10%: expands into sharp apex' : '锑 Sb 结晶微胀 · 严丝合缝撑满尖角')
          : (lang() === 'en' ? 'Low Sb: shrinks away from mould' : '缺锑收缩脱模 · 笔画尖端圆塌'),
        cx, y + h - 8
      );
    });

    st.end();
  });

  return {
    mount() {},
    rerender() {
      rows.forEach((r) => { r.lb.textContent = t(r.key); });
      castBtn.textContent = t('g2.castBtn');
      updateReadout();
    },
    onShow() { autoTimer = 0.6; runCast(false); loop.start(); },
    onHide() { loop.stop(); },
  };
}
