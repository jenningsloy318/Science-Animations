// printing-movable-type/js/scenes/m1.js — M1 毕昇的字库（Three.js 3D 胶泥刻字、砖窑烈火烧结成陶与韵部木格）
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
import { CLAY_THIN_NOTE, COMMON_DUP } from '../facts.js';

const RAW_HEX = 0xcdb693;
const GLOW_HEX = 0xff6b1a;
const FIRED_HEX = 0x9e4726;

export function create(root, kit) {
  const { t, lang } = kit;
  const st = stage3d(root, { height: 260, camPos: [0, 3.1, 5.5], camTarget: [0, 0.35, 0] });

  const btn = document.createElement('button');
  btn.className = 'steps';
  btn.style.display = 'inline-block';
  btn.textContent = t('m1.fire');
  root.appendChild(btn);

  const dupCard = document.createElement('div');
  dupCard.className = 'card';
  dupCard.textContent = t('m1.dup') + `（×${COMMON_DUP}+）`;
  root.appendChild(dupCard);

  // ── Build 3D Arched Brick Kiln (Left/Center) ──
  const kilnGroup = new THREE.Group();
  kilnGroup.position.set(-0.75, 0, -0.35);
  st.world.add(kilnGroup);

  const brickMat = new THREE.MeshStandardMaterial({ color: 0x5c4435, roughness: 0.88, metalness: 0.05 });
  const hearthMat = new THREE.MeshStandardMaterial({ color: 0x261c16, roughness: 0.92, metalness: 0.08 });

  // Kiln base & walls
  const kilnBase = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.22, 2.1), hearthMat);
  kilnBase.position.y = 0.11;
  kilnBase.receiveShadow = true;
  kilnGroup.add(kilnBase);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.05, 1.9), brickMat);
  leftWall.position.set(-1.22, 0.62, 0);
  leftWall.castShadow = true;
  kilnGroup.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.05, 1.9), brickMat);
  rightWall.position.set(1.22, 0.62, 0);
  rightWall.castShadow = true;
  kilnGroup.add(rightWall);

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.45, 0.24), brickMat);
  backWall.position.set(0, 0.82, -0.85);
  backWall.castShadow = true;
  kilnGroup.add(backWall);

  // Arched vault roof (half cylinder)
  const archGeo = new THREE.CylinderGeometry(1.36, 1.36, 1.9, 24, 1, false, 0, Math.PI);
  archGeo.rotateZ(Math.PI / 2);
  archGeo.rotateY(Math.PI / 2);
  const archMesh = new THREE.Mesh(archGeo, brickMat);
  archMesh.position.set(0, 1.05, 0);
  archMesh.castShadow = true;
  kilnGroup.add(archMesh);

  // Kiln glowing point light
  const kilnLight = new THREE.PointLight(0xff6a15, 0, 5.5, 1.6);
  kilnLight.position.set(0, 0.75, 0.1);
  kilnGroup.add(kilnLight);

  // 3D Flame tongues inside kiln
  const flamePool = [];
  const flameGeo = new THREE.ConeGeometry(0.11, 0.42, 8);
  for (let i = 0; i < 14; i++) {
    const fMat = new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0xff7b1a : 0xffcf40, transparent: true, opacity: 0 });
    const fm = new THREE.Mesh(flameGeo, fMat);
    fm.position.set(-0.9 + (i / 13) * 1.8, 0.32, (i % 3 - 1) * 0.38);
    kilnGroup.add(fm);
    flamePool.push({ mesh: fm, mat: fMat, seed: i * 1.37 });
  }

  // ── 3D Tray of 8 Clay Movable Types (Slides in/out of kiln) ──
  const trayGroup = new THREE.Group();
  trayGroup.position.set(-0.75, 0.24, 0.85);
  st.world.add(trayGroup);

  const traySlab = new THREE.Mesh(
    new THREE.BoxGeometry(2.05, 0.08, 1.18),
    new THREE.MeshStandardMaterial({ color: 0x3b312b, roughness: 0.85, metalness: 0.2 })
  );
  traySlab.castShadow = true;
  traySlab.receiveShadow = true;
  trayGroup.add(traySlab);

  const chars = ['印', '刷', '活', '字', '之', '也', '而', '者'];
  const typeBlocks = [];
  chars.forEach((ch, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const tb = createMovableType3D(ch, { size: 0.38, height: 0.48, materialType: 'clay' });
    tb.position.set(-0.66 + col * 0.44, 0.04, -0.25 + row * 0.50);
    trayGroup.add(tb);
    typeBlocks.push(tb);
  });

  // 3D Engraving knife for Step 0 (胶泥刻字)
  const knifeGroup = new THREE.Group();
  const knifeHandle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.04, 0.55, 12),
    new THREE.MeshStandardMaterial({ color: 0x6e4726, roughness: 0.65 })
  );
  knifeHandle.position.y = 0.32;
  const knifeBlade = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.18, 0.07),
    new THREE.MeshStandardMaterial({ color: 0xd0d7de, roughness: 0.25, metalness: 0.88 })
  );
  knifeBlade.position.y = 0.06;
  knifeGroup.add(knifeHandle, knifeBlade);
  knifeGroup.rotation.z = 0.35;
  trayGroup.add(knifeGroup);

  // ── Right Side: 3D Wooden Rhyme Case (按韵入格 & 常用字备20+) ──
  const rackGroup = new THREE.Group();
  rackGroup.position.set(1.45, 0.02, 0.15);
  rackGroup.rotation.y = -0.28;
  st.world.add(rackGroup);

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x7a4e28, roughness: 0.72 });
  const rackBox = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.16, 1.35), woodMat);
  rackBox.position.y = 0.08;
  rackBox.castShadow = true;
  rackGroup.add(rackBox);

  // Duplicate fired blocks in rack compartments
  const dupBlocks = [];
  for (let i = 0; i < 6; i++) {
    const db = createMovableType3D(i < 3 ? '之' : '也', { size: 0.26, height: 0.34, materialType: 'clay' });
    db.position.set(-0.28 + (i % 3) * 0.28, 0.16, i < 3 ? -0.26 : 0.26);
    db.children.forEach((m) => {
      if (m.material && m.material.color) m.material.color.setHex(FIRED_HEX);
    });
    rackGroup.add(db);
    dupBlocks.push(db);
  }

  // Animation states
  let phase = 0; // 0 Carve, 1 Fire, 2 Duplicates, 3 Sort into rack
  let carveK = 0;
  let firedK = 0;
  let rackK = 0;
  let busy = false;
  let autoTimer = 0;

  const cRaw = new THREE.Color(RAW_HEX);
  const cGlow = new THREE.Color(GLOW_HEX);
  const cFired = new THREE.Color(FIRED_HEX);
  const cWork = new THREE.Color();

  async function runFire(withSound = false) {
    if (busy) return;
    busy = true;
    btn.disabled = true;
    carveK = 0;
    firedK = 0;
    rackK = 0;

    // Step 0: Carve wet clay outside kiln
    phase = 0;
    kit.step(0);
    st.orbit.setPose({ theta: -0.18, phi: 0.96, radius: 5.3, target: [-0.75, 0.35, 0.6] });
    await tween(650, (e) => { carveK = e; });

    // Step 1: Slide into kiln & fire into terracotta
    phase = 1;
    kit.step(1);
    if (withSound) sound.play('pour');
    st.orbit.setPose({ theta: 0.06, phi: 1.02, radius: 5.4, target: [-0.45, 0.45, -0.1] });
    await tween(1950, (e) => { firedK = e; });

    // Step 2: Pull out fired terracotta & highlight 20+ duplicates
    phase = 2;
    kit.step(2);
    st.orbit.setPose({ theta: 0.28, phi: 0.94, radius: 5.5, target: [0.25, 0.35, 0.2] });
    await tween(600, (e) => { rackK = e * 0.5; });

    // Step 3: Sort into wooden rhyme case
    phase = 3;
    kit.step(3);
    if (withSound) sound.play('thud');
    await tween(600, (e) => { rackK = 0.5 + e * 0.5; });

    btn.disabled = false;
    busy = false;
  }

  btn.addEventListener('click', () => {
    autoTimer = -5;
    runFire(true);
  });

  const loop = makeLoop((dt, now) => {
    if (!busy) {
      autoTimer += dt;
      if (autoTimer > 0.45) {
        autoTimer = 0;
        runFire(false);
      }
    }

    // Tray Z motion: starts outside (0.85), slides into kiln (-0.25) during firing, slides back out (0.65)
    let trayZ = 0.85;
    if (phase === 1) {
      const inOut = firedK < 0.2 ? firedK / 0.2 : firedK > 0.85 ? 1 - (firedK - 0.85) / 0.15 : 1;
      trayZ = 0.85 - inOut * 1.05;
    } else if (phase >= 2) {
      trayZ = 0.65;
    }
    trayGroup.position.z = trayZ;

    // Knife carving motion in phase 0
    knifeGroup.visible = phase === 0;
    if (phase === 0) {
      const idx = Math.min(7, Math.floor(carveK * 8));
      const target = typeBlocks[idx];
      knifeGroup.position.set(
        target.position.x + Math.sin(now * 28) * 0.05,
        0.52 + Math.abs(Math.cos(now * 28)) * 0.06,
        target.position.z
      );
    }

    // Kiln heat & flames
    const heatGlow = phase === 1 ? Math.sin(firedK * Math.PI) : 0;
    kilnLight.intensity = heatGlow * 4.5;
    flamePool.forEach((f, idx) => {
      if (heatGlow > 0.04) {
        f.mat.opacity = (0.35 + 0.55 * heatGlow) * (0.7 + 0.3 * Math.sin(now * 14 + f.seed));
        f.mesh.scale.set(1, 0.6 + heatGlow * (0.9 + 0.35 * Math.sin(now * 16 + idx)), 1);
      } else {
        f.mat.opacity = 0;
      }
    });

    // Update each 3D movable-type block color & emissive glow
    typeBlocks.forEach((tb, i) => {
      const localK = Math.max(0, Math.min(1, firedK * 1.25 - (i % 4) * 0.06));
      if (localK < 0.55) {
        cWork.lerpColors(cRaw, cGlow, localK / 0.55);
      } else {
        cWork.lerpColors(cGlow, cFired, (localK - 0.55) / 0.45);
      }
      const glowAmt = localK > 0.15 && localK < 0.85 ? Math.sin(((localK - 0.15) / 0.7) * Math.PI) : 0;
      tb.children.forEach((mesh) => {
        if (mesh.material && mesh.material.color) {
          mesh.material.color.copy(cWork);
          if (mesh.material.emissive) {
            mesh.material.emissive.setHex(0xff5500);
            mesh.material.emissiveIntensity = glowAmt * 0.65;
          }
        }
      });
    });

    // Animate duplicate rhyme rack blocks hopping into place during phase 2-3
    dupBlocks.forEach((db, i) => {
      const hop = rackK > 0 ? Math.sin(Math.min(1, Math.max(0, rackK * 1.5 - i * 0.08)) * Math.PI) * 0.25 : 0;
      db.position.y = 0.16 + hop;
    });

    // 2D HUD & Macro Inset ("薄如钱唇")
    const g = st.g, W = st.w, H = st.h;
    st.begin();

    const inW = Math.min(186, W * 0.35), inH = 148;
    const noteStr = lang() === 'en' ? CLAY_THIN_NOTE.en : CLAY_THIN_NOTE.zh;
    drawMacroInset(g, W - inW - 12, 14, inW, inH, noteStr, (gg, x, y, w, h) => {
      const cy = y + h * 0.52;
      const coinX = x + w * 0.28;
      gg.fillStyle = '#b8860b';
      gg.beginPath(); gg.arc(coinX, cy, 19, 0, Math.PI * 2); gg.fill();
      gg.strokeStyle = '#8b6508'; gg.lineWidth = 2; gg.stroke();
      gg.fillStyle = '#141820';
      gg.fillRect(coinX - 5, cy - 5, 10, 10);

      const typeX = x + w * 0.65;
      gg.fillStyle = firedK > 0.5 ? '#9e4726' : '#cdb693';
      roundRect(gg, typeX - 18, cy - 4, 38, 25, 3); gg.fill();
      gg.fillStyle = '#f3e5d0';
      gg.fillRect(typeX - 12, cy - 9, 8, 5);
      gg.fillRect(typeX + 2, cy - 9, 10, 5);

      gg.strokeStyle = '#f87171';
      gg.setLineDash([2, 2]);
      gg.beginPath();
      gg.moveTo(coinX + 15, cy - 9); gg.lineTo(typeX + 22, cy - 9);
      gg.moveTo(coinX + 15, cy - 4); gg.lineTo(typeX + 22, cy - 4);
      gg.stroke();
      gg.setLineDash([]);

      gg.fillStyle = '#d8d0c5';
      gg.font = '10px system-ui';
      gg.textAlign = 'center';
      gg.fillText(lang() === 'en' ? '之/也/而: 20+ duplicates each' : '「之」「也」等常用字各备 20 余枚', x + w / 2, y + h - 10);
    });

    st.end();
  });

  return {
    mount() {},
    rerender() {
      btn.textContent = t('m1.fire');
      dupCard.textContent = t('m1.dup') + `（×${COMMON_DUP}+）`;
    },
    onShow() { autoTimer = 0; runFire(false); loop.start(); },
    onHide() { loop.stop(); },
  };
}
