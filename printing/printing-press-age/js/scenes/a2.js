// printing-press-age/js/scenes/a2.js — A2 整行铸排机（Three.js 3D 90槽铜模库、双楔空格铁齐行与整行铅条浇铸）
'use strict';

import {
  THREE,
  stage3d,
  makeLoop,
  tween,
  sound,
  createMovableType3D,
  createReliefPlate3D,
  drawMacroInset,
} from '../../../../common/js/printing/sceneKit.js';
import { LINOTYPE_KEYS, LINOTYPE_FACTOR } from '../facts.js';

const LINE = 'PRINTME';

export function create(root, kit) {
  const { t, lang } = kit;
  const st = stage3d(root, { height: 265, camPos: [0, 3.1, 5.5], camTarget: [-0.35, 0.55, 0] });

  const kb = document.createElement('div');
  kb.className = 'steps';
  const keys = LINE.split('').map((ch, i) => {
    const b = document.createElement('button');
    b.textContent = ch;
    b.addEventListener('click', () => press(i, true));
    kb.appendChild(b);
    return b;
  });
  root.appendChild(kb);

  const pourBtn = document.createElement('button');
  pourBtn.className = 'steps';
  pourBtn.style.display = 'inline-block';
  pourBtn.textContent = t('a2.pour');
  root.appendChild(pourBtn);

  const remeltBtn = document.createElement('button');
  remeltBtn.className = 'steps';
  remeltBtn.style.display = 'inline-block';
  remeltBtn.textContent = t('a2.remlt');
  root.appendChild(remeltBtn);

  const read = document.createElement('div');
  read.className = 'readout';
  read.innerHTML = `<span>${t('a2.queue')}: <b id="pa-q">0</b>/${LINE.length}</span>
    <span>${t('a2.slugs')}: <b id="pa-lines">0</b></span>
    <span>${lang() === 'en' ? 'Speed' : '提速'}: <b>${LINOTYPE_FACTOR[0]}–${LINOTYPE_FACTOR[1]}×</b></span>`;
  root.appendChild(read);

  const wedge = document.createElement('div');
  wedge.className = 'card';
  wedge.textContent = t('a2.wedge') + `（${LINOTYPE_KEYS} keys / 90 ch）`;
  root.appendChild(wedge);

  // ── Build 3D Mergenthaler Linotype Machine (Left/Center) ──
  const linoGroup = new THREE.Group();
  linoGroup.position.set(-0.55, 0, 0);
  st.world.add(linoGroup);

  const brassMat = new THREE.MeshStandardMaterial({ color: 0xd49a35, roughness: 0.3, metalness: 0.86 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.38, metalness: 0.82 });

  // 1. Top Tilted 90-Channel Brass Matrix Magazine
  const magMesh = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.14, 0.95), brassMat);
  magMesh.position.set(0, 1.48, -0.25);
  magMesh.rotation.x = 0.35;
  magMesh.castShadow = true;
  linoGroup.add(magMesh);

  // 2. Middle Assembling Elevator Rail (排字导轨)
  const railMesh = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.14, 0.48), steelMat);
  railMesh.position.set(0, 0.62, 0.15);
  railMesh.receiveShadow = true;
  linoGroup.add(railMesh);

  // 7 3D Brass Matrices ('P','R','I','N','T','M','E')
  const matrices = LINE.split('').map((ch) => {
    const m = createMovableType3D(ch, { size: 0.26, height: 0.34, materialType: 'bronze' });
    m.visible = false;
    linoGroup.add(m);
    return m;
  });

  // 3D Steel Dual-Wedge Spaceband (双楔空格铁 between PRINT and ME)
  const spacebandMesh = new THREE.Mesh(
    new THREE.ConeGeometry(0.11, 0.58, 4),
    new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.22, metalness: 0.92 })
  );
  spacebandMesh.rotation.y = Math.PI / 4;
  spacebandMesh.visible = false;
  linoGroup.add(spacebandMesh);

  // 3. Bottom 280°C Molten Lead Pot & Cast Line-o'-Type Slug
  const potMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.32, 0.45, 18), steelMat);
  potMesh.position.set(1.15, 0.23, -0.25);
  const potLava = new THREE.Mesh(
    new THREE.CylinderGeometry(0.30, 0.30, 0.05, 16),
    new THREE.MeshBasicMaterial({ color: 0xff7b29 })
  );
  potLava.position.y = 0.21;
  potMesh.add(potLava);
  linoGroup.add(potMesh);

  const slugPlate = createReliefPlate3D('PRINT ME', {
    width: 1.95,
    depth: 0.34,
    thickness: 0.18,
    reliefHeight: 0.05,
    mirror: true,
    type: 'metal',
  });
  slugPlate.position.set(-0.15, 0.12, 0.28);
  slugPlate.visible = false;
  linoGroup.add(slugPlate);

  let queued = 0, wedgePush = 0, castK = 0, returnK = 0, melted = false, lines = 0, busy = false;
  let autoClock = 0;
  let userHoldUntil = 0;

  function syncUI() {
    keys.forEach((k, idx) => k.classList.toggle('on', idx < queued));
    const qEl = read.querySelector('#pa-q');
    const lEl = read.querySelector('#pa-lines');
    if (qEl) qEl.textContent = String(queued);
    if (lEl) lEl.textContent = String(lines);
  }

  async function press(i, manual = false) {
    if (manual) userHoldUntil = performance.now() + 9000;
    if (busy || i !== queued) return;
    queued += 1;
    kit.step(queued < LINE.length ? 1 : 2);
    if (queued === LINE.length) wedgePush = 1;
    if (manual) sound.play('tick');
    syncUI();
  }

  async function doPour(manual = false) {
    if (manual) userHoldUntil = performance.now() + 9000;
    if (busy || queued < LINE.length) return;
    busy = true;
    wedgePush = 1;
    if (manual) sound.play('pour');
    kit.step(3);
    await tween(950, (e) => { castK = e; });
    kit.step(4);
    lines += 1;
    syncUI();
    busy = false;
  }

  async function doRemelt(manual = false) {
    if (manual) userHoldUntil = performance.now() + 9000;
    if (busy || castK === 0) return;
    busy = true;
    melted = true;
    if (manual) sound.play('pour');
    kit.step(5);
    await tween(800, (e) => {
      returnK = e;
      castK = 1 - e;
    });
    queued = 0; wedgePush = 0; melted = false; castK = 0; returnK = 0;
    kit.step(0);
    syncUI();
    busy = false;
  }

  pourBtn.addEventListener('click', () => doPour(true));
  remeltBtn.addEventListener('click', () => doRemelt(true));

  const loop = makeLoop((dt, now) => {
    if (!busy && performance.now() > userHoldUntil) {
      autoClock += dt;
      if (queued < LINE.length && autoClock > 0.18) {
        autoClock = 0;
        press(queued, false);
      } else if (queued === LINE.length && castK === 0 && autoClock > 0.45) {
        autoClock = 0;
        doPour(false);
      } else if (castK >= 0.99 && autoClock > 0.55) {
        autoClock = 0;
        doRemelt(false);
      }
    }

    // 1. Update 3D Brass Matrices & Dual-Wedge Spaceband on Assembler Rail
    const gapBoost = wedgePush * 0.16;
    matrices.forEach((m, i) => {
      m.visible = i < queued;
      if (!m.visible) return;
      const liftY = returnK > 0 ? returnK * 0.72 : 0;
      const x = -0.95 + i * 0.29 + (i >= 5 ? gapBoost : 0);
      m.position.set(x, 0.69 + liftY, 0.15 - returnK * 0.35);
    });

    spacebandMesh.visible = queued >= 5 && returnK === 0;
    if (spacebandMesh.visible) {
      spacebandMesh.position.set(-0.95 + 4.55 * 0.29, 0.56 + wedgePush * 0.18, 0.15);
    }

    // 2. Update 3D Cast Lead Slug ("LINE-O'-TYPE")
    slugPlate.visible = castK > 0.02;
    if (slugPlate.visible) {
      slugPlate.scale.set(Math.max(0.05, castK), 1, 1);
      slugPlate.position.x = -0.15 - (1 - castK) * 0.85;
    }

    // 2D HUD & Macro Inset (Spaceband & V-Teeth)
    const g = st.g, W = st.w;
    st.begin();
    const isEn = lang() === 'en';

    const mw = 138, mh = 134;
    drawMacroInset(g, W - mw - 10, 16, mw, mh, isEn ? 'Spaceband & V-Teeth' : '双楔对齐与齿码归位', (mg, iw) => {
      mg.fillStyle = '#d49a45';
      mg.beginPath();
      mg.moveTo(22, 12); mg.lineTo(iw - 22, 12);
      mg.lineTo(iw - 22, 42); mg.lineTo(iw / 2 + 12, 42);
      mg.lineTo(iw / 2, 24); mg.lineTo(iw / 2 - 12, 42);
      mg.lineTo(22, 42); mg.closePath();
      mg.fill();
      mg.fillStyle = '#181410';
      for (let tIdx = -2; tIdx <= 2; tIdx++) {
        if (tIdx === 0) continue;
        mg.fillRect(iw / 2 + tIdx * 4 - 1, 27 + Math.abs(tIdx) * 3, 2, 3);
      }

      const cyc = (Math.sin(now * 3.2) * 0.5 + 0.5);
      const expand = 4 + cyc * 8;
      mg.fillStyle = '#9aa5b1';
      mg.fillRect(iw / 2 - expand / 2, 54 - cyc * 6, expand, 28);
      mg.strokeStyle = '#ffbe3c';
      mg.lineWidth = 1.3;
      mg.beginPath();
      mg.moveTo(iw / 2 - 18, 68); mg.lineTo(iw / 2 - expand / 2 - 3, 68);
      mg.moveTo(iw / 2 + 18, 68); mg.lineTo(iw / 2 + expand / 2 + 3, 68);
      mg.stroke();

      mg.fillStyle = '#f5e8cc';
      mg.font = '9.5px system-ui';
      mg.textAlign = 'center';
      mg.fillText(isEn ? 'Top: 7-Pair V-Teeth Code' : '上：V形齿码自动分拣归槽', iw / 2, 98);
      mg.fillStyle = '#d8b47c';
      mg.fillText(isEn ? 'Mid: Dual-Wedge Spaceband' : '中：双楔铁上推自动齐行', iw / 2, 114);
    });

    st.end();
  });

  syncUI();
  return {
    mount() {},
    onShow() { loop.start(); },
    onHide() { loop.stop(); },
  };
}
