// printing-offset/js/scenes/o2.js — O2 从照片到网点（Three.js 3D 玻璃网屏光学分解与铜版网点酸蚀凸起）
'use strict';

import {
  THREE,
  stage3d,
  makeLoop,
  stepsBar,
  tween,
  sound,
  roundRect,
  drawMacroInset,
} from '../../../../common/js/printing/sceneKit.js';
import { HALFTONE_YEAR } from '../facts.js';

export function create(root, kit) {
  const { t, lang } = kit;
  const st = stage3d(root, { height: 265, camPos: [0, 3.3, 5.3], camTarget: [-0.35, 0.35, 0] });
  const note = document.createElement('div');
  note.className = 'card';
  note.textContent = `${HALFTONE_YEAR} · ` + t('o2.etch');
  root.appendChild(note);

  let shatter = 0.5;
  let scanSplit = 0.55;
  let etchStage = 0; // 0 UV / 1 WASH / 2 ETCH / 3 RELIEF
  let busy = false;
  let autoClock = 0;
  let userHoldUntil = 0;

  function setEtch(i, manual = false) {
    etchStage = i;
    autoClock = 0;
    if (manual) {
      userHoldUntil = performance.now() + 9500;
      sound.play('ratchet');
    }
    kit.step(i);
    bar.set(i);
  }

  const bar = stepsBar(root, ['UV', 'WASH', 'ETCH', 'RELIEF'], async (i) => {
    if (busy) return;
    setEtch(i, true);
  });

  const shatterBtn = document.createElement('button');
  shatterBtn.className = 'steps';
  shatterBtn.style.display = 'inline-block';
  shatterBtn.textContent = t('o2.shatter');
  root.appendChild(shatterBtn);
  shatterBtn.addEventListener('click', async () => {
    userHoldUntil = performance.now() + 9500;
    if (busy) return;
    busy = true;
    sound.play('pop');
    const from = scanSplit > 0.5 ? 1 : 0;
    const to = 1 - from;
    await tween(950, (e) => {
      scanSplit = from + (to - from) * e;
      shatter = 1 - scanSplit;
    });
    busy = false;
  });

  // ── Build 3D Optical Halftone & Copper Etching Bench ──
  const benchGroup = new THREE.Group();
  benchGroup.position.set(-0.4, 0, 0);
  st.world.add(benchGroup);

  // 1. Bottom Copper Etching Plate (铜锌感光蚀刻版)
  const copperPlate = new THREE.Mesh(
    new THREE.BoxGeometry(2.55, 0.16, 1.45),
    new THREE.MeshStandardMaterial({ color: 0xb87333, roughness: 0.35, metalness: 0.85 })
  );
  copperPlate.position.y = 0.08;
  copperPlate.receiveShadow = true;
  benchGroup.add(copperPlate);

  // 2. 3D Instanced Array of 10×6 Variable-Diameter Halftone Cylinder Dots on the Copper Plate
  const COLS = 10, ROWS = 6, COUNT = COLS * ROWS;
  const dotGeo = new THREE.CylinderGeometry(0.11, 0.12, 0.18, 18);
  const dotMat = new THREE.MeshStandardMaterial({ color: 0x9333ea, roughness: 0.3, metalness: 0.45 });
  const dotsInst = new THREE.InstancedMesh(dotGeo, dotMat, COUNT);
  dotsInst.castShadow = true;
  dotsInst.receiveShadow = true;
  benchGroup.add(dotsInst);

  // Precompute continuous-tone darkness at each grid cell (mountain silhouette + bright sun)
  const dotDarkness = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const u = c / (COLS - 1);
      const v = r / (ROWS - 1);
      // Sun highlight on upper-right, dark mountains on lower-left
      const sunDist = Math.hypot(u - 0.68, v - 0.28);
      const darkness = Math.max(0.14, Math.min(0.95, 0.35 + v * 0.55 - Math.exp(-sunDist * 4) * 0.45));
      dotDarkness.push({ c, r, u, v, darkness });
    }
  }

  // 3. Floating 3D Ruled Glass Halftone Cross-Screen (玻璃十字网屏)
  const screenGroup = new THREE.Group();
  screenGroup.position.set(0, 0.68, 0);
  const glassMesh = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 0.04, 1.4),
    new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.24,
      roughness: 0.1,
      metalness: 0.1,
    })
  );
  const gridHelper = new THREE.GridHelper(2.4, 16, 0x38bdf8, 0x64748b);
  gridHelper.scale.z = 1.35 / 2.4;
  gridHelper.position.y = 0.025;
  screenGroup.add(glassMesh, gridHelper);
  benchGroup.add(screenGroup);

  // Glowing Scan Split Bar moving across the Glass Screen
  const splitBeam = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.65, 1.48),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.75 })
  );
  splitBeam.position.y = 0.42;
  benchGroup.add(splitBeam);

  const dummy = new THREE.Object3D();
  const cDot = new THREE.Color();

  const loop = makeLoop((dt, now) => {
    if (!busy && performance.now() > userHoldUntil) {
      autoClock += dt;
      scanSplit = 0.5 + 0.42 * Math.sin(now * 1.15);
      if (autoClock > 0.65) {
        setEtch((etchStage + 1) % 4, false);
      }
    }

    // Move 3D Scan Split Beam across the plate
    const splitX = (scanSplit - 0.5) * 2.4;
    splitBeam.position.x = splitX;

    // Update 3D Cylindrical Halftone Dots (diameter = darkness, height & color = etchStage)
    const hScale = etchStage === 0 ? 0.35 : etchStage === 1 ? 0.6 : etchStage === 2 ? 1.15 : 1.35;
    for (let i = 0; i < COUNT; i++) {
      const d = dotDarkness[i];
      const x = (d.u - 0.5) * 2.15;
      const z = (d.v - 0.5) * 1.15;
      const isHalftoned = x >= splitX;
      const radScale = isHalftoned ? d.darkness : 0.85;
      dummy.position.set(x, 0.16 + 0.08 * hScale, z);
      dummy.scale.set(radScale, hScale, radScale);
      dummy.updateMatrix();
      dotsInst.setMatrixAt(i, dummy.matrix);

      // Color by stage: 0 UV (purple photoresist), 1 WASH (violet), 2 ETCH (copper pillars), 3 RELIEF (inked black tops)
      if (!isHalftoned) {
        cDot.setRGB(1 - d.darkness * 0.7, 0.75 - d.darkness * 0.5, 0.45);
      } else if (etchStage <= 1) {
        cDot.setHex(0x9333ea);
      } else if (etchStage === 2) {
        cDot.setHex(0xd97706);
      } else {
        cDot.setHex(0x18181b);
      }
      dotsInst.setColorAt(i, cDot);
    }
    dotsInst.instanceMatrix.needsUpdate = true;
    dotsInst.instanceColor.needsUpdate = true;

    // 2D HUD & AM Halftone Dots Macro Inset
    const g = st.g, W = st.w, H = st.h;
    st.begin();
    const isEn = lang() === 'en';

    const stageLabels = isEn
      ? ['Stage 1 (UV): Cross-screen breaks tone into variable UV dots', 'Stage 2 (WASH): Unexposed soft resist washed away', 'Stage 3 (ETCH): Acid etches unprotected copper valleys', 'Stage 4 (RELIEF): Raised halftone dots inked for printing']
      : ['① UV曝光：玻璃网屏将连续明暗分解为大小不一的光斑', '② 显影冲洗：洗去未感光软胶，露出空白金属', '③ 酸液蚀刻：腐蚀无胶保护区，形成高低起伏网点柱', '④ 凸起上墨：墨辊滚过，大点印暗部、小点印高光'];
    g.fillStyle = 'rgba(240, 246, 255, 0.92)';
    g.font = '600 11px system-ui';
    g.textAlign = 'left';
    g.fillText(stageLabels[etchStage], 16, H - 12);

    const mw = 138, mh = 134;
    drawMacroInset(g, W - mw - 10, 16, mw, mh, isEn ? 'AM Halftone Dots' : '调幅网点大小规律', (mg, iw) => {
      const tones = [
        { pct: '85%', r: 10.5, x: iw * 0.22, label: isEn ? 'Shadow' : '暗部大点' },
        { pct: '50%', r: 7.2, x: iw * 0.5, label: isEn ? 'Midtone' : '中调中点' },
        { pct: '15%', r: 3.6, x: iw * 0.78, label: isEn ? 'Highlight' : '高光小点' },
      ];
      tones.forEach((item) => {
        mg.fillStyle = '#faf5e8';
        roundRect(mg, item.x - 15, 14, 30, 34, 4);
        mg.fill();
        mg.fillStyle = '#141619';
        mg.beginPath();
        mg.arc(item.x, 31, item.r, 0, Math.PI * 2);
        mg.fill();
        mg.fillStyle = '#f3b24c';
        mg.font = '700 9.5px system-ui';
        mg.textAlign = 'center';
        mg.fillText(item.pct, item.x, 60);
        mg.fillStyle = '#cbd5e1';
        mg.font = '8.5px system-ui';
        mg.fillText(item.label, item.x, 73);
      });
      mg.fillStyle = '#94a3b8';
      mg.font = '9px system-ui';
      mg.textAlign = 'center';
      mg.fillText(isEn ? '100% Solid Ink · Varied Area' : '墨色全黑 · 靠点径骗过人眼', iw / 2, 102);
    });

    st.end();
  });

  setEtch(0, false);
  return {
    mount() {},
    onShow() { loop.start(); },
    onHide() { loop.stop(); },
  };
}
