// printing-woodblock/js/scenes/w3.js — W3 刷印工坊（3D 圆墨刷上墨 → 3D 覆纸 → 3D 棕刷拂背 → 3D 弧形揭纸正字显现）
'use strict';

import {
  THREE, stage3d, makeLoop, stepsBar, tween, sound,
  createReliefPlate3D, createDeformablePaper3D,
  drawPaperSheet, drawMacroInset,
} from '../../../../common/js/printing/sceneKit.js';
import { DIAMOND_SUTRA_YEAR, BLOCK_LIFE_SHEETS } from '../facts.js';

const DEMO = '印刷术';

export function create(root, kit) {
  const { t, lang } = kit;
  const st = stage3d(root, {
    height: 300,
    warm: true,
    theta: 0.34,
    phi: 0.96,
    radius: 5.4,
    target: [0, 0.2, 0],
  });

  const bar = stepsBar(root, [t('w3.ink'), t('w3.paper'), t('w3.brush'), t('w3.lift')], (i) => {
    autoTimer = -6;
    advance(i, true);
  });

  const read = document.createElement('div');
  read.className = 'readout';
  read.innerHTML = `<span id="wb-lbl-s">${t('w3.sheets')}: <b id="wb-sheets">0</b></span>
    <span id="wb-lbl-w">${t('w3.wear')}: <b id="wb-wear">0%</b></span>
    <button id="wb-reset" class="steps" style="margin:0;padding:4px 11px">${t('w3.reset')}</button>`;
  root.appendChild(read);

  const diamond = document.createElement('div');
  diamond.className = 'card';
  diamond.textContent = `${t('w3.diamond')}（${DIAMOND_SUTRA_YEAR}）`;
  root.appendChild(diamond);

  // ── 1. 3D 梨木凸版（带立体反字与可上墨顶层） ───────────────────────
  const woodPlate = createReliefPlate3D({
    width: 3.0,
    depth: 1.85,
    thickness: 0.30,
    chars: Array.from(DEMO),
    mirror: true,
    baseColor: '#9c6b3f',
    reliefHeight: 0.14,
    type: 'wood',
  });
  woodPlate.position.set(-0.35, -0.55, 0);
  st.world.add(woodPlate);

  // ── 2. 3D 可形变宣纸（支持落下、背面透墨、3D 弧形卷曲揭纸） ─────────
  const paperMesh = createDeformablePaper3D(2.65, 1.55, {
    text: DEMO,
    mirrorFront: false,
    showTextAlpha: 0,
  });
  paperMesh.position.set(-0.35, -0.1, 0);
  paperMesh.visible = false;
  st.world.add(paperMesh);

  // ── 3. 3D 圆头松烟墨刷 (Step 0 Round Ink Brush) ──────────────────
  const inkBrush = new THREE.Group();
  const ibHandle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.20, 0.36, 20),
    new THREE.MeshStandardMaterial({ color: 0x6e4723, roughness: 0.65 })
  );
  ibHandle.position.y = 0.32;
  const ibBristles = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.24, 0.16, 24),
    new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.85 })
  );
  ibBristles.position.y = 0.08;
  inkBrush.add(ibHandle, ibBristles);
  inkBrush.visible = false;
  st.world.add(inkBrush);

  // ── 4. 3D 棕榈丝长刷 (Step 2 Coir Rubbing Brush) ─────────────────
  const coirBrush = new THREE.Group();
  const cbHandle = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.24, 0.68),
    new THREE.MeshStandardMaterial({ color: 0x7c4d28, roughness: 0.72 })
  );
  cbHandle.position.y = 0.22;
  const cbPad = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.14, 0.74),
    new THREE.MeshStandardMaterial({ color: 0x4a2f18, roughness: 0.92 })
  );
  cbPad.position.y = 0.07;
  coirBrush.add(cbHandle, cbPad);
  coirBrush.visible = false;
  st.world.add(coirBrush);

  // ── 5. 右侧已印好的《金刚经》成品纸堆 (3D Printed Stack) ──────────
  const stackGroup = new THREE.Group();
  stackGroup.position.set(1.85, -0.55, 0);
  st.world.add(stackGroup);
  const stackBase = createDeformablePaper3D(1.1, 1.45, { text: DEMO, showTextAlpha: 0.92 });
  stackBase.position.y = 0.08;
  stackGroup.add(stackBase);

  let step = 0;
  let sheets = 0, wear = 0;
  let inkK = 0, paperK = 0, brushK = 0, liftK = 0;
  let busy = false;
  let autoTimer = 0;

  async function advance(i, withSound = false) {
    if (busy) return;
    busy = true;
    step = i;
    bar.set(i);
    if (i === 0) {
      paperK = 0; brushK = 0; liftK = 0; inkK = 0;
      if (withSound) sound.play('tick');
      await tween(650, (e) => { inkK = e; });
    } else if (i === 1) {
      inkK = 1; brushK = 0; liftK = 0; paperK = 0;
      if (withSound) sound.play('paper');
      await tween(580, (e) => { paperK = e; });
    } else if (i === 2) {
      inkK = 1; paperK = 1; liftK = 0; brushK = 0;
      if (withSound) sound.play('ratchet');
      await tween(920, (e) => { brushK = e; });
    } else if (i === 3) {
      inkK = 1; paperK = 1; brushK = 1; liftK = 0;
      await tween(880, (e) => { liftK = e; });
      sheets += 1;
      wear = Math.min(100, (sheets / BLOCK_LIFE_SHEETS[1]) * 100);
      stackBase.position.y = 0.08 + Math.min(0.45, sheets * 0.015);
      if (withSound) sound.play('paper');
    }
    busy = false;
  }

  root.querySelector('#wb-reset').addEventListener('click', () => {
    sheets = 0; wear = 0; autoTimer = -5; advance(0, true); sound.play('thud');
  });

  const loop = makeLoop((dt, now) => {
    if (!busy) {
      autoTimer += dt;
      if (autoTimer > 0.42) {
        autoTimer = 0;
        advance((step + 1) % 4, false);
      }
    }

    // 1. 版面墨层透明度
    woodPlate.setInk(step === 0 ? inkK : 1);

    // 2. Step 0 圆墨刷旋转涂墨
    inkBrush.visible = (step === 0 && inkK < 0.99);
    if (inkBrush.visible) {
      inkBrush.position.set(-1.45 + inkK * 2.2, -0.1, Math.sin(now * 14) * 0.28);
      inkBrush.rotation.y = now * 6;
    }

    // 3. Step 1–3 宣纸覆盖、棕刷透墨与 3D 弧形揭纸
    paperMesh.visible = (step >= 1);
    if (paperMesh.visible) {
      const dropOffset = step === 1 ? (1 - paperK) * 0.85 : 0;
      const liftOffset = step === 3 ? liftK * 0.35 : 0;
      paperMesh.position.y = -0.1 + dropOffset + liftOffset;
      paperMesh.setDeform({
        peel: step === 3 ? liftK : 0,
        wave: step === 3 ? liftK * 0.3 : 0,
        time: now,
      });
      paperMesh.redrawPaper({
        alpha: step === 3 ? Math.max(0.4, liftK) : 0,
        bleed: step >= 2 ? (step === 2 ? brushK * 0.55 : 0.55) : 0,
      });
    }

    // 4. Step 2 棕刷往返拂刷纸背
    coirBrush.visible = (step === 2 && brushK < 0.99);
    if (coirBrush.visible) {
      coirBrush.position.set(-1.4 + brushK * 2.1, -0.08, Math.sin(now * 20) * 0.25);
      coirBrush.rotation.z = 0.14;
    }

    // 5. 右上角 2D HUD 微视窗：揭纸成品正字对照
    const g = st.g, W = st.w;
    st.begin();
    const inW = 154, inH = 126;
    drawMacroInset(g, W - inW - 10, 12, inW, inH, lang() === 'en' ? 'Printed Leaf' : '揭纸成品 · 镜像还原', (mg, iw, ih) => {
      drawPaperSheet(mg, 16, 8, iw - 32, 54, { r: 4 });
      mg.strokeStyle = 'rgba(181,65,45,0.65)';
      mg.lineWidth = 1.5;
      mg.strokeRect(22, 13, iw - 44, 44);
      mg.fillStyle = '#181512';
      mg.font = "700 20px 'Noto Serif SC', serif";
      mg.textAlign = 'center';
      mg.textBaseline = 'middle';
      mg.fillText(DEMO, iw / 2, 35);
      mg.fillStyle = '#fde68a';
      mg.font = '600 9.5px system-ui';
      mg.fillText(lang() === 'en' ? 'Mirror × Mirror = Upright' : '反字 × 翻印 = 正字可读', iw / 2, 82);
    });

    read.querySelector('#wb-sheets').textContent = String(sheets);
    read.querySelector('#wb-wear').textContent = wear.toFixed(1) + '%';
    st.end();
  });

  return {
    mount() {},
    rerender() {
      const btns = root.querySelectorAll('.steps button');
      const lbs = [t('w3.ink'), t('w3.paper'), t('w3.brush'), t('w3.lift')];
      lbs.forEach((lb, i) => { if (btns[i]) btns[i].textContent = lb; });
      diamond.textContent = `${t('w3.diamond')}（${DIAMOND_SUTRA_YEAR}）`;
    },
    onShow() { autoTimer = 0; advance(0, false); loop.start(); },
    onHide() { loop.stop(); },
  };
}
