// printing-press-age/js/scenes/a3.js — A3 单字铸排与谢幕（Three.js 3D Monotype 气动铜模盘与 1978 铅与火聚光谢幕）
'use strict';

import {
  THREE,
  stage3d,
  makeLoop,
  tween,
  sound,
  createReliefPlate3D,
  drawMacroInset,
} from '../../../../common/js/printing/sceneKit.js';
import { MONOTYPE_YEAR, NYT_FAREWELL_YEAR } from '../facts.js';

export function create(root, kit) {
  const { t, lang } = kit;
  const st = stage3d(root, { height: 265, camPos: [0, 3.2, 5.5], camTarget: [-0.25, 0.45, 0] });

  const castBtn = document.createElement('button');
  castBtn.className = 'steps';
  castBtn.style.display = 'inline-block';
  castBtn.textContent = t('a3.tape') + ` (${MONOTYPE_YEAR})`;
  root.appendChild(castBtn);

  const farewellBtn = document.createElement('button');
  farewellBtn.className = 'steps';
  farewellBtn.style.display = 'inline-block';
  farewellBtn.textContent = `${t('a3.farewell')} (${NYT_FAREWELL_YEAR})`;
  root.appendChild(farewellBtn);

  const card = document.createElement('div');
  card.className = 'card';
  card.hidden = false;
  card.textContent = t('a3.farewell.d');
  root.appendChild(card);

  // ── 1. 3D Monotype 15×17 Matrix Case & Perforated Paper Tape Tower (Back/Left) ──
  const monoGroup = new THREE.Group();
  monoGroup.position.set(-0.45, 0, -0.35);
  st.world.add(monoGroup);

  const ROWS = 6, COLS = 13, CELLS = ROWS * COLS;
  const cellGeo = new THREE.BoxGeometry(0.18, 0.16, 0.18);
  const cellMat = new THREE.MeshStandardMaterial({ color: 0xb8863b, roughness: 0.35, metalness: 0.82 });
  const gridInst = new THREE.InstancedMesh(cellGeo, cellMat, CELLS);
  gridInst.castShadow = true;
  gridInst.receiveShadow = true;
  monoGroup.add(gridInst);

  // 3D Pneumatic X-Y Locator Pin above matrix grid
  const locatorPin = new THREE.Mesh(
    new THREE.ConeGeometry(0.08, 0.32, 16),
    new THREE.MeshBasicMaterial({ color: 0xff9f1c })
  );
  locatorPin.rotation.x = Math.PI;
  locatorPin.position.y = 0.35;
  monoGroup.add(locatorPin);

  // 3D Perforated 31-Channel Paper-Tape Spool Tower on Left
  const tapeTower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.26, 0.72, 24),
    new THREE.MeshStandardMaterial({ color: 0xead9ba, roughness: 0.75 })
  );
  tapeTower.position.set(-1.65, 0.42, 0.35);
  tapeTower.castShadow = true;
  monoGroup.add(tapeTower);

  // ── 2. 1978 NYT "Farewell, Etaoin Shrdlu" 3D Spotlight & Final Lead Slug (Front/Center) ──
  const farewellGroup = new THREE.Group();
  farewellGroup.position.set(-0.25, 0, 0.55);
  st.world.add(farewellGroup);

  const farewellSlug = createReliefPlate3D('ETAOIN SHRDLU', {
    width: 2.35,
    depth: 0.52,
    thickness: 0.24,
    reliefHeight: 0.06,
    mirror: false,
    type: 'metal',
  });
  farewellGroup.add(farewellSlug);

  // Volumetric 3D Spotlight Cone + Golden Floor Halo
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xffe49e,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const spotCone = new THREE.Mesh(new THREE.ConeGeometry(1.45, 2.8, 32, 1, true), coneMat);
  spotCone.position.y = 1.4;
  farewellGroup.add(spotCone);

  let mode = 1;        // 1: 1887 Monotype; 2: 1978 Farewell Curtain Call
  let tapeK = 0.6, dimK = 0, spotK = 0;
  let busy = false;
  let autoClock = 0;
  let userHoldUntil = 0;
  const dummy = new THREE.Object3D();
  const cCell = new THREE.Color();

  function syncButtons() {
    castBtn.classList.toggle('on', mode === 1);
    farewellBtn.classList.toggle('on', mode === 2);
  }

  async function runTapeMode(manual = false) {
    if (manual) userHoldUntil = performance.now() + 9500;
    if (busy) return;
    busy = true;
    mode = 1;
    syncButtons();
    kit.step(0);
    if (manual) sound.play('ratchet');
    st.orbit.setPose({ theta: -0.18, phi: 0.92, radius: 5.4, target: [-0.45, 0.35, -0.1] });
    await tween(900, (e) => {
      dimK = (1 - e) * dimK;
      spotK = (1 - e) * spotK;
      tapeK = 0.15 + 0.85 * e;
    });
    kit.step(1);
    busy = false;
  }

  async function runFarewellMode(manual = false) {
    if (manual) userHoldUntil = performance.now() + 9500;
    if (busy) return;
    busy = true;
    mode = 2;
    syncButtons();
    kit.step(3);
    if (manual) sound.play('thud');
    st.orbit.setPose({ theta: 0.08, phi: 1.04, radius: 5.1, target: [-0.25, 0.35, 0.4] });
    await tween(950, (e) => { dimK = e; });
    await tween(800, (e) => { spotK = e; });
    if (manual) sound.play('pop');
    busy = false;
  }

  castBtn.addEventListener('click', () => runTapeMode(true));
  farewellBtn.addEventListener('click', () => runFarewellMode(true));

  const loop = makeLoop((dt, now) => {
    if (!busy && performance.now() > userHoldUntil) {
      autoClock += dt;
      if (mode === 1 && autoClock > 2.2) {
        autoClock = 0;
        runFarewellMode(false);
      } else if (mode === 2 && autoClock > 2.4) {
        autoClock = 0;
        runTapeMode(false);
      }
    }

    // 1. Update 3D Monotype Matrix Case Grid & Pneumatic Pin
    const activeIdx = Math.floor((now * 5) % CELLS);
    const dim = mode === 2 ? Math.max(0.2, 1 - dimK * 0.78) : 1;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const idx = r * COLS + c;
        const isHit = mode === 1 && idx === activeIdx;
        const x = (c - (COLS - 1) / 2) * 0.21;
        const z = (r - (ROWS - 1) / 2) * 0.21;
        dummy.position.set(x, isHit ? 0.16 : 0.08, z);
        dummy.updateMatrix();
        gridInst.setMatrixAt(idx, dummy.matrix);

        if (isHit) {
          cCell.setHex(0xffbe3c);
          locatorPin.position.set(x, 0.38, z);
        } else {
          cCell.setHex(0xb8863b).multiplyScalar(dim);
        }
        gridInst.setColorAt(idx, cCell);
      }
    }
    gridInst.instanceMatrix.needsUpdate = true;
    gridInst.instanceColor.needsUpdate = true;
    locatorPin.visible = mode === 1;
    tapeTower.rotation.y = now * 1.4 * tapeK;

    // 2. Update 1978 Farewell Spotlight Cone & Final Slug
    farewellGroup.visible = mode === 2 || spotK > 0.01;
    coneMat.opacity = spotK * 0.26;
    farewellSlug.position.y = spotK * 0.08;

    // 2D HUD & Monotype X-Y Coordinate Grid Inset
    const g = st.g, W = st.w, H = st.h;
    st.begin();
    const isEn = lang() === 'en';

    if (mode === 2 && spotK > 0.2) {
      g.fillStyle = '#ffd27d';
      g.font = '700 12px system-ui';
      g.textAlign = 'left';
      g.fillText(
        isEn ? '1978 NYT Final Hot-Metal Edition · "Farewell, Etaoin Shrdlu"' : '1978《纽约时报》最后一行铅字 · 五百年“铅与火”时代谢幕',
        16, H - 14
      );
    }

    const mw = 136, mh = 132;
    drawMacroInset(g, W - mw - 10, 16, mw, mh, isEn ? 'Monotype X-Y Grid' : 'Monotype 坐标定位', (mg, iw) => {
      const gx = 20, gy = 14, gw = iw - 40, gh = 64;
      mg.strokeStyle = 'rgba(218, 175, 105, 0.45)';
      mg.lineWidth = 1;
      for (let r = 0; r <= 5; r++) {
        const y = gy + (r / 5) * gh;
        mg.beginPath(); mg.moveTo(gx, y); mg.lineTo(gx + gw, y); mg.stroke();
      }
      for (let c = 0; c <= 6; c++) {
        const x = gx + (c / 6) * gw;
        mg.beginPath(); mg.moveTo(x, gy); mg.lineTo(x, gy + gh); mg.stroke();
      }
      const tx = gx + (((Math.floor(now * 2.5) * 3) % 6) + 0.5) * (gw / 6);
      const ty = gy + (((Math.floor(now * 2.5) * 2) % 5) + 0.5) * (gh / 5);
      mg.strokeStyle = '#ffbe3c';
      mg.lineWidth = 1.5;
      mg.beginPath();
      mg.moveTo(tx, gy); mg.lineTo(tx, gy + gh);
      mg.moveTo(gx, ty); mg.lineTo(gx + gw, ty);
      mg.stroke();
      mg.fillStyle = '#ff7b29';
      mg.beginPath(); mg.arc(tx, ty, 4, 0, Math.PI * 2); mg.fill();

      mg.fillStyle = '#f5e8cc';
      mg.font = '9.5px system-ui';
      mg.textAlign = 'center';
      mg.fillText(isEn ? '31-Hole Compressed Air' : '31 孔压缩空气驱动 X-Y 针', iw / 2, 94);
      mg.fillStyle = '#d8b47c';
      mg.fillText(isEn ? 'Single Type → Easy Fix' : '单字独立铸造 · 改错只换一字', iw / 2, 110);
    });

    st.end();
  });

  syncButtons();
  return {
    mount() {},
    onShow() { loop.start(); },
    onHide() { loop.stop(); },
  };
}
