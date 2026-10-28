// printing-gutenberg/js/scenes/g1.js — G1 三级铸造（Three.js 3D 高碳钢父冲、紫铜母模、手持铸字模与铅字矩阵）
'use strict';

import {
  THREE,
  stage3d,
  makeLoop,
  tween,
  sound,
  createMovableType3D,
  drawMacroInset,
  roundRect,
} from '../../../../common/js/printing/sceneKit.js';

export function create(root, kit) {
  const { t, lang } = kit;
  const st = stage3d(root, { height: 265, camPos: [0, 3.2, 5.5], camTarget: [0, 0.35, 0] });

  const btn = document.createElement('button');
  btn.className = 'steps';
  btn.style.display = 'inline-block';
  btn.textContent = t('g1.cast');
  root.appendChild(btn);
  const stages = ['g1.punch', 'g1.matrix', 'g1.types'].map((k) => ({ el: document.createElement('div'), k }));
  const strip = document.createElement('div');
  strip.className = 'readout';
  stages.forEach((s) => { s.el.textContent = t(s.k); strip.appendChild(s.el); });
  root.appendChild(strip);

  // ── Stage 1 (Left): 3D Hardened Steel Punch hammering into Copper Matrix Bar ──
  const stage1Group = new THREE.Group();
  stage1Group.position.set(-1.65, 0, -0.15);
  st.world.add(stage1Group);

  // Copper Matrix Bar (紫铜母模) on anvil
  const copperMat = new THREE.MeshStandardMaterial({ color: 0xc87533, roughness: 0.32, metalness: 0.85 });
  const matrixBar = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.28, 0.65), copperMat);
  matrixBar.position.y = 0.14;
  matrixBar.castShadow = true;
  matrixBar.receiveShadow = true;
  stage1Group.add(matrixBar);

  // Sunken intaglio cavity inside copper bar (appears when struck)
  const cavityMat = new THREE.MeshStandardMaterial({ color: 0x3b1d08, roughness: 0.6, metalness: 0.5 });
  const cavityMesh = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.04, 0.38), cavityMat);
  cavityMesh.position.y = 0.27;
  cavityMesh.visible = false;
  stage1Group.add(cavityMesh);

  // Steel Punch (高碳钢父冲) above copper bar
  const punchGroup = new THREE.Group();
  punchGroup.position.set(0, 1.05, 0);
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.25, metalness: 0.92 });
  const punchShaft = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.82, 0.36), steelMat);
  punchShaft.position.y = 0.45;
  punchShaft.castShadow = true;
  const punchTip = createMovableType3D('G', { size: 0.36, height: 0.16, materialType: 'lead' });
  punchTip.rotation.x = Math.PI; // Facing downward to strike copper
  punchTip.position.y = 0.08;
  punchGroup.add(punchShaft, punchTip);
  stage1Group.add(punchGroup);

  // ── Stage 2 (Center): 3D Gutenberg Split Hand Mould (手持铸字模) + Molten Pour ──
  const mouldGroup = new THREE.Group();
  mouldGroup.position.set(-0.2, 0, 0.15);
  st.world.add(mouldGroup);

  const woodShellMat = new THREE.MeshStandardMaterial({ color: 0x7c4d25, roughness: 0.68 });
  const mouldLeft = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.68, 0.52), woodShellMat);
  mouldLeft.position.set(-0.26, 0.38, 0);
  mouldLeft.castShadow = true;
  const mouldRight = mouldLeft.clone();
  mouldRight.position.x = 0.26;
  const mouldMatrixBase = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.12, 0.56), copperMat);
  mouldMatrixBase.position.y = 0.06;
  mouldGroup.add(mouldLeft, mouldRight, mouldMatrixBase);

  // Molten lead stream & cavity core
  const streamMat = new THREE.MeshBasicMaterial({ color: 0xff7b1a, transparent: true, opacity: 0 });
  const streamMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.95, 12), streamMat);
  streamMesh.position.y = 1.05;
  mouldGroup.add(streamMesh);

  const castTypeHero = createMovableType3D('G', { size: 0.32, height: 0.52, materialType: 'lead' });
  castTypeHero.position.y = 0.12;
  castTypeHero.visible = false;
  mouldGroup.add(castTypeHero);

  // ── Stage 3 (Right/Front): 3D Instanced Array of 120 Cast Lead Types ──
  const MAX_SHOWN = 120;
  const instGeo = new THREE.BoxGeometry(0.11, 0.32, 0.11);
  const instMat = new THREE.MeshStandardMaterial({ color: 0x8a99ad, roughness: 0.28, metalness: 0.88 });
  const typeArrayMesh = new THREE.InstancedMesh(instGeo, instMat, MAX_SHOWN);
  typeArrayMesh.castShadow = true;
  typeArrayMesh.receiveShadow = true;
  st.world.add(typeArrayMesh);

  let level = 0;          // 0 冲 1 铜模 2 铅字群
  let copies = 1;         // 分身数量（1 → N）
  let strikeK = 0;
  let pourK = 0;
  let busy = false;
  let autoTimer = 0;
  const dummy = new THREE.Object3D();

  async function advance(withSound = false) {
    if (busy) return;
    busy = true;
    if (level === 0) {
      strikeK = 0;
      kit.step(1);
      st.orbit.setPose({ theta: -0.25, phi: 0.95, radius: 5.2, target: [-1.1, 0.35, 0] });
      await tween(750, (e) => { strikeK = e; });
      if (withSound) sound.play('thud');
      level = 1;
      copies = 4;
    } else if (level === 1) {
      pourK = 0;
      kit.step(3);
      if (withSound) sound.play('pour');
      st.orbit.setPose({ theta: 0.05, phi: 0.92, radius: 5.3, target: [0.1, 0.35, 0.1] });
      await tween(850, (e) => { pourK = e; });
      level = 2;
      copies = 60;
      kit.step(4);
    } else if (copies < 240) {
      pourK = 0;
      st.orbit.setPose({ theta: 0.25, phi: 0.88, radius: 5.5, target: [0.45, 0.3, 0.2] });
      await tween(450, (e) => { pourK = e; });
      copies = Math.min(240, copies * 2);
      if (withSound) sound.play('pop');
    } else {
      level = 0; copies = 1; strikeK = 0; pourK = 0; kit.step(0);
    }
    busy = false;
  }

  btn.addEventListener('click', () => {
    autoTimer = -5;
    advance(true);
  });

  const loop = makeLoop((dt, now) => {
    if (!busy) {
      autoTimer += dt;
      if (autoTimer > 0.42) {
        autoTimer = 0;
        advance(false);
      }
    }

    // 1. Animate Steel Punch striking down into Copper Matrix
    const hammerDip = level === 0 ? Math.sin(strikeK * Math.PI) * 0.68 : 0.35;
    punchGroup.position.y = 1.02 - hammerDip;
    cavityMesh.visible = level >= 1 || strikeK > 0.45;

    // 2. Animate Split Hand Mould opening/closing & pouring molten lead
    const isPouring = (level === 1 && pourK > 0 && pourK < 0.85) || (level === 2 && busy && pourK < 0.7);
    streamMat.opacity = isPouring ? 0.9 : 0;
    const mouldSplit = level >= 2 && !isPouring ? 0.14 : 0;
    mouldLeft.position.x = -0.24 - mouldSplit;
    mouldRight.position.x = 0.24 + mouldSplit;
    castTypeHero.visible = level >= 2 || pourK > 0.4;
    if (castTypeHero.visible) {
      castTypeHero.position.y = 0.14 + (mouldSplit > 0 ? 0.18 + Math.sin(now * 4) * 0.03 : 0);
    }

    // 3. Update 3D Instanced Lead Type Matrix on the right
    const shown = level >= 2 ? Math.min(MAX_SHOWN, Math.floor(copies * 0.5)) : 0;
    const cols = 12;
    for (let i = 0; i < MAX_SHOWN; i++) {
      if (i < shown) {
        const c = i % cols;
        const r = Math.floor(i / cols);
        dummy.position.set(0.55 + c * 0.14, 0.16, -0.58 + r * 0.14);
        dummy.scale.set(1, 1, 1);
      } else {
        dummy.position.set(0, -5, 0);
        dummy.scale.set(0.001, 0.001, 0.001);
      }
      dummy.updateMatrix();
      typeArrayMesh.setMatrixAt(i, dummy.matrix);
    }
    typeArrayMesh.instanceMatrix.needsUpdate = true;

    // 2D HUD & Hand Mould Cutaway Inset
    const g = st.g, W = st.w, H = st.h;
    st.begin();

    g.fillStyle = '#e5dfd5';
    g.font = '700 11.5px system-ui';
    g.textAlign = 'left';
    g.fillText(`① ${t('g1.punch')}  →  ② ${t('g1.matrix')}  →  ③ ${t('g1.types')} × ${copies}`, 16, H - 12);

    const inW = Math.min(184, W * 0.35), inH = 152;
    drawMacroInset(g, W - inW - 12, 14, inW, inH, lang() === 'en' ? 'Hand Mould' : '手持铸字模 · 浇铅急冷', (gg, x, y, w, h) => {
      const cx = x + w / 2, cy = y + h * 0.58;
      gg.fillStyle = '#8d5b32';
      roundRect(gg, cx - 44, cy - 26, 26, 46, 3); gg.fill();
      roundRect(gg, cx + 18, cy - 26, 26, 46, 3); gg.fill();
      gg.fillStyle = '#334155';
      gg.fillRect(cx - 16, cy - 26, 32, 42);
      const fillLvl = level >= 2 ? 1 : pourK;
      if (fillLvl > 0) {
        const fh = 38 * fillLvl;
        gg.fillStyle = fillLvl < 0.8 ? '#f97316' : '#94a3b8';
        gg.fillRect(cx - 11, cy + 14 - fh, 22, fh);
      }
      gg.fillStyle = '#b87333';
      roundRect(gg, cx - 22, cy + 14, 44, 14, 3); gg.fill();
      gg.strokeStyle = '#94a3b8'; gg.lineWidth = 2;
      gg.beginPath(); gg.arc(cx, cy + 20, 28, 0.15, Math.PI - 0.15); gg.stroke();

      gg.fillStyle = '#d8d0c5'; gg.font = '10px system-ui'; gg.textAlign = 'center';
      gg.fillText(lang() === 'en' ? '1 Punch → N Matrices → 10⁵ Types' : '底嵌铜模 · 上灌铅水 · 秒出同高字', cx, y + h - 8);
    });

    st.end();
  });

  return {
    mount() {},
    rerender() {
      btn.textContent = t('g1.cast');
      stages.forEach((s) => { s.el.textContent = t(s.k); });
    },
    onShow() { level = 0; copies = 1; autoTimer = 0.8; loop.start(); },
    onHide() { loop.stop(); },
  };
}
