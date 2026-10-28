// printing-frontier/js/scenes/f3.js — F3 从复制到创造（Three.js 3D 雕版文字 → 纳米压印光刻 NIL → 3D 生物打印水凝胶器官）
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
import { NIL_YEAR } from '../facts.js';

export function create(root, kit) {
  const { t, lang } = kit;
  const st = stage3d(root, { height: 265, camPos: [0, 3.1, 5.5], camTarget: [-0.35, 0.45, 0] });

  const nilCard = document.createElement('div');
  nilCard.className = 'card';
  nilCard.textContent = t('f3.nil');
  root.appendChild(nilCard);

  const btn = document.createElement('button');
  btn.className = 'steps';
  btn.style.display = 'inline-block';
  btn.textContent = t('f3.replay');
  root.appendChild(btn);

  const fin = document.createElement('div');
  fin.className = 'card';
  fin.hidden = false;
  fin.innerHTML = `<b style="color:#059669">${t('f3.finale')}</b>`;
  root.appendChild(fin);

  // ── Build 3 3D Evolutionary Triad Platforms: (1) Text Woodblock, (2) NIL Nano-Stamp, (3) 3D Bio-Organ ──
  const triadGroup = new THREE.Group();
  triadGroup.position.set(-0.4, 0, 0);
  st.world.add(triadGroup);

  const platPositions = [-1.45, 0, 1.45];
  const platforms = platPositions.map((px) => {
    const pg = new THREE.Group();
    pg.position.set(px, 0, 0);
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.56, 0.62, 0.12, 28),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.65 })
    );
    base.position.y = 0.06;
    base.receiveShadow = true;
    pg.add(base);
    triadGroup.add(pg);
    return pg;
  });

  // Platform 0 (Left): ① Copy Text — 3D Carved Pearwood Block
  const woodBlock = createReliefPlate3D('文明', {
    width: 0.78,
    depth: 0.78,
    thickness: 0.14,
    reliefHeight: 0.05,
    mirror: true,
    type: 'wood',
  });
  woodBlock.position.y = 0.12;
  platforms[0].add(woodBlock);

  // Platform 1 (Center): ② Copy Images & Nano — 3D Nanoimprint Lithography (NIL) Quartz Stamp + Resist Wafer
  const nilWafer = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, 0.46, 0.06, 24),
    new THREE.MeshStandardMaterial({ color: 0xa855f7, roughness: 0.25, metalness: 0.5 })
  );
  nilWafer.position.y = 0.15;
  const nilQuartzStamp = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.14, 0.68),
    new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65, roughness: 0.1 })
  );
  nilQuartzStamp.position.y = 0.55;
  platforms[1].add(nilWafer, nilQuartzStamp);

  // Platform 2 (Right): ③ Print 3D Matter — 3D Pink Hydrogel Bio-Organ Scaffold + Bioprinter Nozzle
  const bioOrgan = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.24, 0.085, 48, 12, 2, 3),
    new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.32, metalness: 0.08 })
  );
  bioOrgan.position.y = 0.46;
  bioOrgan.castShadow = true;
  const bioNozzle = new THREE.Mesh(
    new THREE.ConeGeometry(0.08, 0.32, 16),
    new THREE.MeshStandardMaterial({ color: 0x34d399, roughness: 0.25, metalness: 0.8 })
  );
  bioNozzle.rotation.x = Math.PI;
  bioNozzle.position.y = 0.96;
  platforms[2].add(bioOrgan, bioNozzle);

  // Connecting 3D Emerald Energy Arcs between the 3 Platforms
  const arcLinks = [0, 1].map((idx) => {
    const p0 = new THREE.Vector3(platPositions[idx], 0.35, 0);
    const pm = new THREE.Vector3((platPositions[idx] + platPositions[idx + 1]) * 0.5, 0.85, 0);
    const p1 = new THREE.Vector3(platPositions[idx + 1], 0.35, 0);
    const curve = new THREE.QuadraticBezierCurve3(p0, pm, p1);
    const mat = new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.25 });
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.025, 8, false), mat);
    triadGroup.add(mesh);
    return { mat };
  });

  let progress = 3;
  let busy = false;
  let userHoldUntil = 0;

  async function replay(manual = false) {
    if (manual) userHoldUntil = performance.now() + 9500;
    if (busy) return;
    busy = true;
    progress = 0;
    for (let h = 0; h < 3; h++) {
      kit.step(h === 2 ? 3 : h);
      if (manual) sound.play('pop');
      await tween(850, (e) => { progress = h + e; });
    }
    progress = 3;
    kit.step(4);
    fin.hidden = false;
    if (manual) sound.play('euv');
    busy = false;
  }
  btn.addEventListener('click', () => replay(true));

  const loop = makeLoop((dt, now) => {
    if (!busy && performance.now() > userHoldUntil) {
      progress = (progress + dt * 0.38) % 3.6;
      const stepIdx = progress < 1 ? 0 : progress < 2 ? 1 : progress < 2.8 ? 3 : 4;
      kit.step(stepIdx);
    }

    // Animate the 3 3D Evolutionary Platforms
    woodBlock.rotation.y = Math.sin(now * 1.1) * 0.22;

    const press = (Math.sin(now * 3.2) + 1) * 0.5;
    nilQuartzStamp.position.y = 0.52 - press * 0.26;

    bioOrgan.rotation.y = now * 1.2;
    bioNozzle.position.x = Math.sin(now * 4) * 0.16;

    platforms.forEach((pg, i) => {
      const localK = Math.max(0.35, Math.min(1, progress - i + 0.4));
      pg.scale.setScalar(localK);
    });
    arcLinks.forEach((al, i) => {
      al.mat.opacity = progress > i + 0.5 ? 0.85 : 0.18;
    });

    // 2D HUD Stage Titles & 1995 Nanoimprint (NIL) Macro Inset
    const g = st.g, W = st.w;
    st.begin();
    const isEn = lang() === 'en';
    const leftW = W - 156;

    const titles = isEn
      ? ['1. Copy Text (Wood/Lead)', '2. Copy Nano (EUV/NIL)', '3. Print 3D Matter (Bio/Metal)']
      : ['① 复制文字（雕版·活字）', '② 复制纳米光路（光刻·压印）', '③ 打印三维物质（器官·火箭）'];
    [0.18, 0.49, 0.80].forEach((u, i) => {
      g.fillStyle = progress >= i ? '#6ee7b7' : '#94a3b8';
      g.font = '700 10.5px system-ui';
      g.textAlign = 'center';
      g.fillText(titles[i], leftW * u, 22);
    });

    const mw = 142, mh = 138;
    drawMacroInset(g, W - mw - 10, 16, mw, mh, isEn ? `${NIL_YEAR} Nanoimprint (NIL)` : `${NIL_YEAR} 纳米压印光刻 (NIL)`, (mg, iw) => {
      const stampY = 12 + press * 16;

      mg.fillStyle = 'rgba(125, 211, 252, 0.75)';
      mg.fillRect(16, stampY, iw - 32, 12);
      for (let i = 0; i < 4; i++) {
        mg.fillRect(22 + i * 24, stampY + 12, 12, 10);
      }

      mg.fillStyle = '#c084fc';
      mg.fillRect(16, 48, iw - 32, 14);
      if (press > 0.45) {
        mg.fillStyle = '#0f172a';
        for (let i = 0; i < 4; i++) {
          mg.fillRect(22 + i * 24, 46, 12, 8 * press);
        }
      }

      mg.fillStyle = '#475569';
      mg.fillRect(16, 62, iw - 32, 12);

      mg.fillStyle = '#f8fafc';
      mg.font = '9.5px system-ui';
      mg.textAlign = 'center';
      mg.fillText(isEn ? 'Quartz Stamp → <10 nm' : '石英模板机械压印 <10 nm', iw / 2, 92);
      mg.fillStyle = '#6ee7b7';
      mg.font = '8.5px system-ui';
      mg.fillText(isEn ? 'Ancient Relief Stamping Reborn!' : '古老“盖章”思想在纳米尺度重生', iw / 2, 108);
    });

    st.end();
  });

  return {
    mount() {},
    onShow() { loop.start(); replay(false); },
    onHide() { loop.stop(); },
  };
}
