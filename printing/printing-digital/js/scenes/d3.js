// printing-digital/js/scenes/d3.js — D3 汉字的绊脚石（Three.js 3D 26字母字盒 vs 浩瀚万字铅字矩阵与 1949 光学字盘）
'use strict';

import {
  THREE,
  stage3d,
  makeLoop,
  tween,
  sound,
  createMovableType3D,
  roundRect,
  drawMacroInset,
} from '../../../../common/js/printing/sceneKit.js';
import { LUMITYPE_YEAR } from '../facts.js';

export function create(root, kit) {
  const { t, lang } = kit;
  const st = stage3d(root, { height: 265, camPos: [0, 2.2, 3.6], camTarget: [-0.35, 0.35, 0] });

  const zoomBtn = document.createElement('button');
  zoomBtn.className = 'steps';
  zoomBtn.style.display = 'inline-block';
  zoomBtn.textContent = t('d3.rack') + ' ⟶';
  root.appendChild(zoomBtn);

  const lumitype = document.createElement('div');
  lumitype.className = 'card';
  lumitype.textContent = t('d3.lumitype') + `（${LUMITYPE_YEAR}）`;
  root.appendChild(lumitype);

  // ── 1. Foreground: Compact 26-Slot Latin Type Case + Hero Type Block ──
  const heroLatin = createMovableType3D('A', { size: 0.36, height: 0.48, materialType: 'lead' });
  heroLatin.position.set(-0.55, 0.04, 0.65);
  st.world.add(heroLatin);

  // ── 2. Warehouse: 3D Instanced Sea of 680 Chinese Lead-Type Racks ──
  const COUNT = 680;
  const blockGeo = new THREE.BoxGeometry(0.14, 0.28, 0.14);
  const blockMat = new THREE.MeshStandardMaterial({ color: 0x9c6b3f, roughness: 0.48, metalness: 0.35 });
  const seaInst = new THREE.InstancedMesh(blockGeo, blockMat, COUNT);
  seaInst.castShadow = true;
  seaInst.receiveShadow = true;
  st.world.add(seaInst);

  const dummy = new THREE.Object3D();
  const cBlock = new THREE.Color();
  const cols = 34;
  for (let i = 0; i < COUNT; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const x = (c - cols / 2) * 0.20 - 0.35;
    const z = (r - 10) * 0.20 - 0.55;
    const y = 0.14 + ((c * 7 + r * 13) % 5) * 0.04;
    dummy.position.set(x, y, z);
    dummy.updateMatrix();
    seaInst.setMatrixAt(i, dummy.matrix);
    cBlock.setHSL(0.08, 0.45, 0.35 + ((i * 19) % 10) * 0.02);
    seaInst.setColorAt(i, cBlock);
  }
  seaInst.instanceMatrix.needsUpdate = true;
  seaInst.instanceColor.needsUpdate = true;

  // ── 3. 1949 Lumitype Spinning Glass Phototypesetting Disc (Right Foreground) ──
  const discGroup = new THREE.Group();
  discGroup.position.set(0.85, 0.65, 0.45);
  const glassDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48, 0.48, 0.03, 32),
    new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.42, roughness: 0.1 })
  );
  glassDisc.rotation.x = Math.PI / 2;
  const hubMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.08, 16),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.2 })
  );
  hubMesh.rotation.x = Math.PI / 2;
  discGroup.add(glassDisc, hubMesh);
  st.world.add(discGroup);

  let zoomK = 0; // 0: Close-up on 26 Latin letters → 1: Pull back to vast 10,000+ Hanzi sea
  let busy = false;
  let userHoldUntil = 0;

  zoomBtn.addEventListener('click', async () => {
    userHoldUntil = performance.now() + 10000;
    if (busy) return;
    busy = true;
    sound.play('paper');
    const from = zoomK > 0.5 ? 1 : 0;
    const to = 1 - from;
    await tween(1800, (e) => {
      zoomK = from + (to - from) * e;
      kit.step(Math.min(4, Math.floor(zoomK * 5)));
    });
    busy = false;
  });

  const loop = makeLoop((dt, now) => {
    if (!busy && performance.now() > userHoldUntil) {
      zoomK = 0.5 - 0.5 * Math.cos(now * 0.55);
      kit.step(Math.min(4, Math.floor(zoomK * 5)));
    }

    // Pull 3D Camera smoothly from close-up Latin tray to high-altitude Chinese Matrix Sea
    st.orbit.setPose({
      theta: -0.15 + zoomK * 0.25,
      phi: 1.05 - zoomK * 0.32,
      radius: 3.1 + zoomK * 4.2,
      target: [-0.35, 0.25 + zoomK * 0.2, 0.35 - zoomK * 0.7],
    });

    discGroup.rotation.z = now * 2.4;

    // 2D HUD Counter & 1949 Lumitype Disc Inset
    const g = st.g, W = st.w, H = st.h;
    st.begin();
    const isEn = lang() === 'en';
    const leftW = W - 156;

    g.fillStyle = 'rgba(20, 16, 12, 0.82)';
    roundRect(g, 18, H - 48, leftW - 28, 32, 6);
    g.fill();
    g.fillStyle = '#fde68a';
    g.font = '600 11px system-ui';
    g.textAlign = 'left';
    const visibleCount = Math.round(26 + zoomK * 9974);
    g.fillText(
      isEn
        ? `Latin: 26 letters  vs  Chinese Set: ~${visibleCount.toLocaleString()} glyphs in view`
        : `拉丁字母仅 26 个  vs  汉字字库量级：当前视野约 ${visibleCount.toLocaleString()} 字模`,
      28, H - 28
    );

    const mw = 142, mh = 138;
    drawMacroInset(g, W - mw - 10, 16, mw, mh, isEn ? '1949 Lumitype Disc' : '1949 光学字盘瓶颈', (mg, iw) => {
      const cx = iw / 2, cy = 44, r = 30;
      mg.save();
      mg.translate(cx, cy);
      mg.rotate(now * 1.8);
      mg.strokeStyle = '#38bdf8';
      mg.lineWidth = 2;
      mg.beginPath(); mg.arc(0, 0, r, 0, Math.PI * 2); mg.stroke();
      mg.fillStyle = 'rgba(56, 189, 248, 0.14)';
      mg.fill();
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        mg.fillStyle = '#e0f2fe';
        mg.font = '7px monospace';
        mg.textAlign = 'center'; mg.textBaseline = 'middle';
        mg.fillText(String.fromCharCode(65 + k), Math.cos(a) * (r - 7), Math.sin(a) * (r - 7));
      }
      mg.restore();

      mg.fillStyle = 'rgba(250, 204, 21, 0.85)';
      mg.beginPath(); mg.arc(cx, cy - r + 7, 4.5, 0, Math.PI * 2); mg.fill();

      mg.fillStyle = '#f5e8cc';
      mg.font = '9.5px system-ui';
      mg.textAlign = 'center';
      mg.fillText(isEn ? 'Spinning Glass Matrix Disc' : '旋转玻璃字盘 + 频闪透镜', cx, 90);
      mg.fillStyle = '#fca5a5';
      mg.font = '9px system-ui';
      mg.fillText(isEn ? '10,000 Hanzi × 16 sizes → >1 GB!' : '万字×多字号点阵需 >1 GB 存储！', cx, 106);
    });

    st.end();
  });

  return {
    mount() {},
    onShow() { loop.start(); },
    onHide() { loop.stop(); },
  };
}
