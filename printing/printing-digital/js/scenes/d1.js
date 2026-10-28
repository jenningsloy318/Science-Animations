// printing-digital/js/scenes/d1.js — D1 静电的魔法（Three.js 3D OPC 感光鼓、八面棱镜激光束、碳粉吸附与 190°C 热辊定影）
'use strict';

import {
  THREE,
  stage3d,
  makeLoop,
  stepsBar,
  sound,
  createRoller3D,
  createDeformablePaper3D,
  roundRect,
  drawMacroInset,
} from '../../../../common/js/printing/sceneKit.js';
import { makeGrid, expose, develop, CHARGED, DEVELOP_THRESHOLD } from '../model/xerography.js';
import { FUSER_C } from '../facts.js';

const COLS = 36, ROWS = 12;

export function create(root, kit) {
  const { t, lang } = kit;
  const st = stage3d(root, { height: 265, camPos: [0, 2.9, 5.4], camTarget: [-0.35, 0.55, 0] });

  let phase = 0;
  let phaseProgress = 0;
  let autoClock = 0;
  let userHoldUntil = 0;
  let grid = makeGrid(COLS, ROWS);
  let mask = null;
  let drawing = false;
  let laserCol = 0;

  const bar = stepsBar(
    root,
    [t('d1.charge'), t('d1.expose'), t('d1.develop'), t('d1.transfer'), t('d1.clean')],
    (i) => selectPhase(i, true)
  );
  const fuse = document.createElement('div');
  fuse.className = 'card';
  fuse.textContent = `${t('d1.fuse')}（${FUSER_C[0]}–${FUSER_C[1]} °C）`;
  root.appendChild(fuse);

  function wordCells() {
    const cells = [];
    const draw = (ox, oy, pattern) => {
      pattern.forEach((rowBits, y) => {
        for (let b = 0; b < 5; b++) {
          if ((rowBits >> (4 - b)) & 1) cells.push([ox + b, oy + y]);
        }
      });
    };
    draw(4, 2, [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000]);
    draw(11, 2, [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001]);
    draw(19, 2, [0b01110, 0b10000, 0b11110, 0b10000, 0b11110, 0b10010, 0b01100]);
    draw(25, 2, [0b11110, 0b10010, 0b10010, 0b10010, 0b11110, 0b10000, 0b10000]);
    return cells;
  }
  const presetCells = wordCells();

  // ── Build 3D Laser Xerography Engine (OPC Drum + Polygon Mirror + Laser + Fuser) ──
  const engineGroup = new THREE.Group();
  engineGroup.position.set(-0.45, 0, 0);
  st.world.add(engineGroup);

  // 1. Central 3D Green/Teal OPC Photoconductor Drum
  const opcDrum = createRoller3D(0.54, 2.35, { color: 0x0d9488, roughness: 0.18, metalness: 0.65 });
  opcDrum.rotation.y = Math.PI / 2;
  opcDrum.position.set(0, 0.72, 0);
  engineGroup.add(opcDrum);

  // 2. 3D Instanced Grid of Charge / Toner Voxels wrapped on the front face of the OPC Drum
  const TOTAL = COLS * ROWS;
  const voxGeo = new THREE.BoxGeometry(0.052, 0.042, 0.035);
  const voxMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.2 });
  const voxInst = new THREE.InstancedMesh(voxGeo, voxMat, TOTAL);
  engineGroup.add(voxInst);

  // 3. Spinning Octagonal Polygon Mirror & Red Laser Beam above Drum
  const polygonMirror = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.12, 8),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.08, metalness: 0.96 })
  );
  polygonMirror.position.set(0, 1.62, 0.35);
  engineGroup.add(polygonMirror);

  const laserMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0 });
  const laserBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.05, 8), laserMat);
  laserBeam.position.set(0, 1.18, 0.42);
  engineGroup.add(laserBeam);

  // 4. Bottom Paper Sheet & Glowing 190°C Orange Fuser Roller
  const paperSheet = createDeformablePaper3D(2.3, 1.05, 18, 10, 'PR 印 · 190°C FUSED');
  paperSheet.position.set(0, 0.12, 0.15);
  engineGroup.add(paperSheet);

  const fuserRoller = createRoller3D(0.20, 1.12, { color: 0xea580c, roughness: 0.28, metalness: 0.45 });
  fuserRoller.position.set(0.95, 0.34, 0.15);
  engineGroup.add(fuserRoller);

  function selectPhase(i, manual = false) {
    phase = i;
    phaseProgress = 0;
    autoClock = 0;
    if (manual) {
      userHoldUntil = performance.now() + 10000;
      sound.play(i === 1 ? 'laser' : i === 2 ? 'pop' : i === 3 ? 'thud' : 'tick');
    }
    kit.step(i);
    bar.set(i);

    if (i === 0) {
      grid = makeGrid(COLS, ROWS);
      mask = null;
    } else if (i === 1) {
      grid = makeGrid(COLS, ROWS);
      mask = null;
      laserCol = 0;
    } else if (i === 2 || i === 3) {
      expose(grid, presetCells);
      mask = develop(grid, DEVELOP_THRESHOLD);
    } else if (i === 4) {
      grid = makeGrid(COLS, ROWS);
      mask = null;
    }
  }

  st.canvas.addEventListener('pointerdown', (e) => {
    userHoldUntil = performance.now() + 10000;
    drawing = true;
    paint(e);
  });
  st.canvas.addEventListener('pointermove', (e) => {
    if (drawing) paint(e);
  });
  window.addEventListener('pointerup', () => { drawing = false; });

  function paint(ev) {
    const r = st.canvas.getBoundingClientRect();
    const ox = 22, oy = 32;
    const gridW = st.w - 178, gridH = st.h - 86;
    const px = ((ev.clientX - r.left) / r.width) * st.w;
    const py = ((ev.clientY - r.top) / r.height) * st.h;
    const c = Math.floor(((px - ox) / gridW) * COLS);
    const y = Math.floor(((py - oy) / gridH) * ROWS);
    if (c >= 0 && c < COLS && y >= 0 && y < ROWS) {
      expose(grid, [[c, y]]);
      if (phase >= 2) mask = develop(grid, DEVELOP_THRESHOLD);
    }
  }

  const dummy = new THREE.Object3D();
  const cVox = new THREE.Color();

  const loop = makeLoop((dt, now) => {
    phaseProgress = Math.min(1, phaseProgress + dt * 1.15);

    if (performance.now() > userHoldUntil && !drawing) {
      autoClock += dt;
      if (autoClock > 0.65) {
        selectPhase((phase + 1) % 5, false);
      }
    }

    if (phase === 1 && !drawing) {
      const targetCol = Math.floor(phaseProgress * COLS);
      if (targetCol > laserCol) {
        const slice = presetCells.filter(([cx]) => cx <= targetCol);
        expose(grid, slice);
        laserCol = targetCol;
      }
    }

    // Rotate 3D Polygon Mirror & Fuser Roller
    polygonMirror.rotation.y = now * 8;
    fuserRoller.rotation.z = -now * 3.5;
    fuserRoller.position.x = phase === 3 ? -0.95 + phaseProgress * 1.9 : 0.95;

    // 3D Laser Beam sweeps across OPC Drum in Phase 1
    laserMat.opacity = phase === 1 ? 0.9 : 0;
    if (phase === 1) {
      const sweepX = (phaseProgress - 0.5) * 2.1;
      laserBeam.position.x = sweepX * 0.5;
      laserBeam.rotation.z = -sweepX * 0.42;
    }

    // Update 432 3D Charge / Toner Voxels wrapped onto the cylindrical OPC Drum
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const idx = r * COLS + c;
        const v = grid[r][c];
        const charged = v === CHARGED;
        const cleaned = phase === 4 && (c / COLS) < phaseProgress;
        const hasToner = mask && mask[r][c] && !cleaned;

        const x = ((c / (COLS - 1)) - 0.5) * 2.12;
        const ang = ((r / (ROWS - 1)) - 0.5) * 1.15; // Curved across front of drum
        const rad = 0.555;
        let y = 0.72 - Math.sin(ang) * rad;
        let z = Math.cos(ang) * rad;

        if (hasToner && phase === 3) {
          y -= phaseProgress * 0.36;
        }

        dummy.position.set(x, y, z);
        dummy.rotation.set(ang, 0, 0);
        dummy.updateMatrix();
        voxInst.setMatrixAt(idx, dummy.matrix);

        if (cleaned) {
          cVox.setHex(0x1e293b);
        } else if (hasToner) {
          cVox.setHex(0x111318);
        } else if (charged) {
          cVox.setHex(0x38bdf8);
        } else {
          cVox.setHex(0xfca5a5); // Discharged latent image
        }
        voxInst.setColorAt(idx, cVox);
      }
    }
    voxInst.instanceMatrix.needsUpdate = true;
    voxInst.instanceColor.needsUpdate = true;

    // 2D HUD & Electrostatic Force Macro Inset
    const g = st.g, W = st.w, H = st.h;
    st.begin();
    const isEn = lang() === 'en';

    const mw = 142, mh = 138;
    drawMacroInset(g, W - mw - 10, 16, mw, mh, isEn ? 'Electrostatic Force' : '静电潜像与定影微距', (mg, iw) => {
      mg.fillStyle = '#0284c7';
      mg.fillRect(12, 68, iw - 24, 14);
      mg.fillStyle = '#7dd3fc';
      mg.font = '700 9px monospace';
      mg.textAlign = 'center';
      mg.fillText('-600V', iw * 0.28, 78);
      mg.fillStyle = '#fde047';
      mg.fillText('-100V (Laser)', iw * 0.72, 78);

      const bob = Math.sin(now * 5) * 3;
      mg.fillStyle = '#1e293b';
      mg.strokeStyle = '#38bdf8';
      mg.lineWidth = 1;
      mg.beginPath(); mg.arc(iw * 0.28, 30 - bob, 7, 0, Math.PI * 2); mg.fill(); mg.stroke();
      mg.beginPath(); mg.arc(iw * 0.72, 58, 7, 0, Math.PI * 2); mg.fill(); mg.stroke();

      mg.fillStyle = '#e2e8f0';
      mg.font = '9px system-ui';
      mg.fillText(isEn ? 'Repel (-)' : '同性相斥', iw * 0.28, 48);
      mg.fillStyle = '#facc15';
      mg.fillText(isEn ? 'Attract!' : '潜像吸粉', iw * 0.72, 42);

      mg.fillStyle = '#fb923c';
      mg.font = '9px system-ui';
      mg.fillText(isEn ? `Fuser: ${FUSER_C[0]}–${FUSER_C[1]}°C` : `热辊 ${FUSER_C[0]}–${FUSER_C[1]}°C 熔融锁色`, iw / 2, 106);
    });

    st.end();
  });

  selectPhase(0, false);
  return {
    mount() {},
    onShow() { loop.start(); },
    onHide() { loop.stop(); },
  };
}
