// printing-movable-type/js/scenes/m4.js — M4 东方支线（Three.js 3D 25.3 万枚枣木活字汇聚书山 + 高丽铜活字 + 金简算账）
'use strict';

import {
  THREE,
  stage3d,
  makeLoop,
  sound,
  createMovableType3D,
  drawMacroInset,
} from '../../../../common/js/printing/sceneKit.js';
import { JUZHEN_TYPES, JUZHEN_TITLES } from '../facts.js';

const AVG_BOOK_CHARS = 60000; // PROV: illustrative | 金简算账演示参数（《四库全书》珍本单部量级）| - | 平均每书字数示意
const RATE_CARVE = 1.0; // NO-PROV: 量纲基准（雕版每字相对成本）
const RATE_TYPEMAKE = 0.4; // NO-PROV: illustrative（铸/刻单字模相对成本）
const RATE_COMPOSE = 0.88; // NO-PROV: illustrative（含字库摊销前每字排印相对成本）

export function create(root, kit) {
  const { t, lang } = kit;
  const st = stage3d(root, { height: 250, camPos: [0, 3.1, 5.6], camTarget: [0, 0.45, 0] });

  const c1 = document.createElement('div');
  c1.className = 'card';
  c1.textContent = t('m4.jikji');
  const c2 = document.createElement('div');
  c2.className = 'card';
  c2.textContent = t('m4.juzhen') + ` · ${t('m4.legend')}`;
  root.append(c1, c2);

  // 金简算账（G03 场景家）：同一次字库投入，印 n 种书
  const calc = document.createElement('div');
  calc.className = 'card';
  calc.innerHTML = `
    <b id="mt-ctitle">${t('m4.calc.title')}</b>
    <div class="slider-row">
      <span id="mt-ced">${t('m4.calc.editions')}</span>
      <input id="mt-ed" type="range" min="1" max="138" value="18" step="1">
      <span class="val" id="mt-edv">18</span>
    </div>
    <div class="readout">
      <span><span id="mt-cblk">${t('m4.calc.block')}</span>: <b id="mt-block">—</b></span>
      <span><span id="mt-cmov">${t('m4.calc.movable')}</span>: <b id="mt-mov">—</b></span>
      <span id="mt-cross"></span>
    </div>
    <div id="mt-verdict" style="margin-top:6px"></div>`;
  root.appendChild(calc);

  const ed = calc.querySelector('#mt-ed');
  const crossEd = Math.max(1, Math.ceil((RATE_TYPEMAKE * JUZHEN_TYPES) / (AVG_BOOK_CHARS * (RATE_CARVE - RATE_COMPOSE))));

  // ── 3D Scene: 720 Instanced Jujube-Wood Movable Types forming Wuyingdian Book Mountain ──
  const N = 720;
  const blockGeo = new THREE.BoxGeometry(0.085, 0.14, 0.085);
  const blockMat = new THREE.MeshStandardMaterial({ color: 0xa66a38, roughness: 0.58, metalness: 0.08 });
  const instMesh = new THREE.InstancedMesh(blockGeo, blockMat, N);
  instMesh.castShadow = true;
  instMesh.receiveShadow = true;
  st.world.add(instMesh);

  const palette = [new THREE.Color(0x9c6b3f), new THREE.Color(0xb86f28), new THREE.Color(0x7d4e27)];
  const particles = [];
  for (let i = 0; i < N; i++) {
    instMesh.setColorAt(i, palette[i % 3]);
    // Target: 3-peaked Wuyingdian Imperial Book Mountain on the left/center
    const tx = -2.1 + Math.random() * 2.55;
    const tz = -0.75 + Math.random() * 1.5;
    const peak1 = Math.exp(-((tx + 0.85) ** 2) / 0.35 - (tz ** 2) / 0.35) * 1.45;
    const peak2 = Math.exp(-((tx + 1.45) ** 2) / 0.22 - ((tz - 0.2) ** 2) / 0.28) * 0.95;
    const peak3 = Math.exp(-((tx + 0.25) ** 2) / 0.25 - ((tz + 0.18) ** 2) / 0.28) * 1.05;
    const maxH = Math.max(0.12, peak1 + peak2 * 0.45 + peak3 * 0.45);
    const ty = 0.07 + Math.random() * maxH;

    // Initial swirling vortex position
    const ang = (i / N) * Math.PI * 10;
    const rad = 0.6 + (i / N) * 1.6;
    const x0 = -0.8 + Math.cos(ang) * rad;
    const z0 = Math.sin(ang) * rad;
    const y0 = 0.4 + Math.random() * 1.6;

    particles.push({ x0, y0, z0, tx, ty, tz, delay: (i % 100) / 100 });
  }
  instMesh.instanceColor.needsUpdate = true;

  // ── 3D Korean Goryeo Bronze Type Pedestal (1377 Jikji 直指) + Cost Comparison Pillars ──
  const rightGroup = new THREE.Group();
  rightGroup.position.set(1.35, 0, 0.15);
  st.world.add(rightGroup);

  const jikjiType = createMovableType3D('直', { size: 0.44, height: 0.56, materialType: 'bronze' });
  jikjiType.position.set(-0.42, 0.02, 0.25);
  rightGroup.add(jikjiType);

  // Two 3D Cost Pillars (Woodblock Brown vs Movable-Type Emerald) that scale with the slider
  const barCarve = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 1.0, 0.32),
    new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.55 })
  );
  barCarve.position.set(0.18, 0.5, -0.15);
  barCarve.castShadow = true;

  const barMovable = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 1.0, 0.32),
    new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.4, metalness: 0.2 })
  );
  barMovable.position.set(0.62, 0.5, -0.15);
  barMovable.castShadow = true;
  rightGroup.add(barCarve, barMovable);

  function recalc(withSound = false) {
    const editions = Number(ed.value);
    calc.querySelector('#mt-edv').textContent = String(editions);
    const block = RATE_CARVE * AVG_BOOK_CHARS * editions;
    const movable = RATE_TYPEMAKE * JUZHEN_TYPES + RATE_COMPOSE * AVG_BOOK_CHARS * editions;
    calc.querySelector('#mt-block').textContent = Math.round(block).toLocaleString();
    calc.querySelector('#mt-mov').textContent = Math.round(movable).toLocaleString();
    calc.querySelector('#mt-cross').innerHTML = `${t('m4.calc.cross')} <b>${crossEd}</b> ${lang() === 'en' ? 'titles' : '种'}`;
    calc.querySelector('#mt-verdict').innerHTML = movable < block
      ? `<b style="color:#059669">✓ ${t('m4.calc.verdict.w')}</b>`
      : `<b style="color:#8d6e63">${t('m4.calc.verdict.l')}</b>`;

    // Update 3D cost pillars height
    const normMax = RATE_CARVE * AVG_BOOK_CHARS * 60;
    const hBlock = Math.max(0.12, Math.min(1.8, (block / normMax) * 1.4));
    const hMov = Math.max(0.12, Math.min(1.8, (movable / normMax) * 1.4));
    barCarve.scale.y = hBlock;
    barCarve.position.y = hBlock / 2;
    barMovable.scale.y = hMov;
    barMovable.position.y = hMov / 2;

    if (withSound) sound.play('tick');
  }
  ed.addEventListener('input', () => { kit.step(3); recalc(true); kit.step(4); });
  recalc(false);

  let conv = 0, active = false, cycleT = 0, userHoldUntil = 0;
  const dummy = new THREE.Object3D();

  ed.addEventListener('pointerdown', () => { userHoldUntil = performance.now() + 8000; });
  ed.addEventListener('touchstart', () => { userHoldUntil = performance.now() + 8000; });

  const loop = makeLoop((dt, now) => {
    if (active) {
      if (conv < 1) {
        conv = Math.min(1, conv + dt * 0.55);
        kit.step(conv < 0.35 ? 1 : conv < 0.75 ? 2 : 3);
      } else {
        cycleT += dt;
        if (cycleT > 0.45) { conv = 0; cycleT = 0; }
      }
      if (performance.now() > userHoldUntil) {
        // 自播过程中连续平滑扫描书种数 (4..52 种)，动态演示 3D 成本柱越过平衡点
        const sweepEd = Math.round(4 + ((Math.sin(now * 0.9) + 1) * 0.5) * 48);
        ed.value = String(sweepEd);
        recalc(false);
      }
    }
    const ease = 1 - Math.pow(1 - conv, 3);

    // Update 720 3D Jujube-Wood Movable Types
    for (let i = 0; i < N; i++) {
      const p = particles[i];
      const k = Math.max(0, Math.min(1, ease * 1.3 - p.delay * 0.3));
      const spin = (1 - k) * now * 2.2;
      const x = p.x0 + (p.tx - p.x0) * k + Math.sin(spin + i) * 0.08 * (1 - k);
      const y = p.y0 + (p.ty - p.y0) * k;
      const z = p.z0 + (p.tz - p.z0) * k + Math.cos(spin + i) * 0.08 * (1 - k);
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, (1 - k) * i, 0);
      dummy.updateMatrix();
      instMesh.setMatrixAt(i, dummy.matrix);
    }
    instMesh.instanceMatrix.needsUpdate = true;

    jikjiType.rotation.y = Math.sin(now * 1.2) * 0.25;

    // 2D HUD & Cost Crossover Chart
    const g = st.g, W = st.w, H = st.h;
    st.begin();

    g.fillStyle = '#e5dfd5';
    g.font = '600 11px system-ui, sans-serif';
    g.textAlign = 'left';
    g.fillText(`${JUZHEN_TYPES.toLocaleString()} ${t('m4.legend')} → ${JUZHEN_TITLES} ${lang() === 'en' ? 'titles' : '种'}`, 14, H - 12);

    const inW = Math.min(196, W * 0.37), inH = 152;
    drawMacroInset(g, W - inW - 12, 14, inW, inH, lang() === 'en' ? 'Cost Crossover' : '金简算账 · 成本交叉线', (gg, x, y, w, h) => {
      const gx0 = x + 22, gy0 = y + h - 22, gw = w - 34, gh = h - 50;
      gg.strokeStyle = 'rgba(255,255,255,0.28)';
      gg.lineWidth = 1;
      gg.beginPath(); gg.moveTo(gx0, gy0 - gh); gg.lineTo(gx0, gy0); gg.lineTo(gx0 + gw, gy0); gg.stroke();

      const maxEd = 60;
      const maxCost = RATE_CARVE * AVG_BOOK_CHARS * maxEd;
      const toX = (n) => gx0 + (Math.min(maxEd, n) / maxEd) * gw;
      const toY = (c) => gy0 - (Math.min(maxCost, c) / maxCost) * gh;

      gg.strokeStyle = '#c49a76'; gg.lineWidth = 2;
      gg.beginPath();
      gg.moveTo(toX(0), toY(0));
      gg.lineTo(toX(maxEd), toY(RATE_CARVE * AVG_BOOK_CHARS * maxEd));
      gg.stroke();

      gg.strokeStyle = '#34d399'; gg.lineWidth = 2.2;
      gg.beginPath();
      gg.moveTo(toX(0), toY(RATE_TYPEMAKE * JUZHEN_TYPES));
      gg.lineTo(toX(maxEd), toY(RATE_TYPEMAKE * JUZHEN_TYPES + RATE_COMPOSE * AVG_BOOK_CHARS * maxEd));
      gg.stroke();

      const cx = toX(crossEd), cy = toY(RATE_CARVE * AVG_BOOK_CHARS * crossEd);
      gg.fillStyle = '#fbbf24';
      gg.beginPath(); gg.arc(cx, cy, 4, 0, Math.PI * 2); gg.fill();

      const curEd = Number(ed.value);
      const curX = toX(curEd);
      gg.strokeStyle = 'rgba(129,140,248,0.75)';
      gg.setLineDash([2, 2]);
      gg.beginPath(); gg.moveTo(curX, gy0 - gh); gg.lineTo(curX, gy0); gg.stroke();
      gg.setLineDash([]);

      gg.fillStyle = '#d8d0c5'; gg.font = '9.5px system-ui'; gg.textAlign = 'center';
      gg.fillText(lang() === 'en' ? `Crossover at ~${crossEd} titles` : `印满 ~${crossEd} 种书即反超雕版`, x + w / 2, y + h - 7);
    });

    st.end();
  });

  return {
    mount() {},
    rerender() {
      c1.textContent = t('m4.jikji');
      c2.textContent = t('m4.juzhen') + ` · ${t('m4.legend')}`;
      calc.querySelector('#mt-ctitle').textContent = t('m4.calc.title');
      calc.querySelector('#mt-ced').textContent = t('m4.calc.editions');
      calc.querySelector('#mt-cblk').textContent = t('m4.calc.block');
      calc.querySelector('#mt-cmov').textContent = t('m4.calc.movable');
      recalc(false);
    },
    onShow() { active = true; conv = 0; cycleT = 0; loop.start(); },
    onHide() { active = false; loop.stop(); },
  };
}
