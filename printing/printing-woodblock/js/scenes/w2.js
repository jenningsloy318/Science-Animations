// printing-woodblock/js/scenes/w2.js — W2 雕版诞生记（3D 梨木雕版六步：写样 → 180° 空间翻转反贴 → 拳刀雕刻 3D 凸起反字 → 刷墨）
'use strict';

import {
  THREE, stage3d, makeLoop, stepsBar, tween, sound,
  createReliefPlate3D, createDeformablePaper3D,
  drawMacroInset,
} from '../../../../common/js/printing/sceneKit.js';
import { SIX_STEPS, DEMO_TEXT, BLOCK_THICKNESS_CM } from '../facts.js';
import { reverseForBlock } from '../model/mirror.js';

export function create(root, kit) {
  const { t, lang } = kit;
  const st = stage3d(root, {
    height: 300,
    warm: true,
    theta: 0.35,
    phi: 0.98,
    radius: 5.4,
    target: [0, 0.15, 0],
  });

  const note = document.createElement('div');
  note.className = 'card';
  root.appendChild(note);

  const mirrored = reverseForBlock(DEMO_TEXT);
  const chars = Array.from(DEMO_TEXT);

  // ── 1. 3D 梨木雕版 + 立体凸起反字字模 (`createReliefPlate3D`) ────────
  const woodPlate = createReliefPlate3D({
    width: 3.1,
    depth: 1.9,
    thickness: 0.32,
    chars,
    mirror: true,
    baseColor: '#9c6b3f',
    reliefHeight: 0.14,
    type: 'wood',
  });
  woodPlate.position.set(0, -0.55, 0);
  st.world.add(woodPlate);

  // ── 2. 可 3D 翻转反贴的薄宣纸稿 (`createDeformablePaper3D`) ─────────
  const paperPivot = new THREE.Group();
  paperPivot.position.set(0, -0.2, 0);
  st.world.add(paperPivot);

  const draftPaper = createDeformablePaper3D(2.6, 1.5, {
    text: DEMO_TEXT,
    mirrorFront: false,
    showTextAlpha: 1,
  });
  paperPivot.add(draftPaper);

  // ── 3. 3D 雕刻拳刀 (Carving Chisel) + 3D 飞溅木屑对象池 ──────────────
  const chiselGroup = new THREE.Group();
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.05, 0.65, 16),
    new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.65 })
  );
  handle.position.y = 0.42;
  const blade = new THREE.Mesh(
    new THREE.ConeGeometry(0.055, 0.22, 4),
    new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.2, metalness: 0.9 })
  );
  blade.rotation.x = Math.PI;
  blade.position.y = 0.08;
  chiselGroup.add(handle, blade);
  chiselGroup.rotation.z = -0.52;
  chiselGroup.visible = false;
  st.world.add(chiselGroup);

  const chipPool = [];
  const chipGeo = new THREE.BoxGeometry(0.09, 0.03, 0.06);
  const chipMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.7 });
  for (let i = 0; i < 18; i++) {
    const m = new THREE.Mesh(chipGeo, chipMat);
    m.visible = false;
    st.world.add(m);
    chipPool.push({ mesh: m, vx: 0, vy: 0, vz: 0, life: 0 });
  }

  function spawnChip(x, y, z) {
    const slot = chipPool.find((c) => c.life <= 0);
    if (!slot) return;
    slot.life = 1;
    slot.mesh.visible = true;
    slot.mesh.position.set(x, y, z);
    slot.vx = (Math.random() - 0.3) * 2.2;
    slot.vy = 1.6 + Math.random() * 1.4;
    slot.vz = (Math.random() - 0.5) * 1.8;
  }

  // ── 4. 3D 校对铜框放大镜 (Step 4 Proofing Loupe) ─────────────────────
  const loupeGroup = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.38, 0.04, 16, 36),
    new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.85 })
  );
  ring.rotation.x = Math.PI / 2;
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.36, 0.02, 32),
    new THREE.MeshStandardMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.38, roughness: 0.1 })
  );
  loupeGroup.add(ring, glass);
  loupeGroup.visible = false;
  st.world.add(loupeGroup);

  let step = 0;
  let flipK = 0;
  let carveK = 0;
  let writeK = 1;
  let anim = false;
  let autoTimer = 0;

  const bar = stepsBar(root, SIX_STEPS.map((s) => (lang() === 'en' ? s.en : s.zh)), (i) => {
    autoTimer = -6;
    triggerStep(i, true);
  });

  function triggerStep(i, withSound = false) {
    step = i;
    bar.set(i);

    // 根据步骤调整最佳 3D 观察视角
    const poses = [
      { theta: 0.42, phi: 1.08, radius: 5.5 },
      { theta: 0.18, phi: 0.82, radius: 5.0 },
      { theta: 0.35, phi: 0.92, radius: 5.2 },
      { theta: -0.32, phi: 0.88, radius: 4.7 },
      { theta: 0.12, phi: 0.72, radius: 4.5 },
      { theta: 0.28, phi: 0.86, radius: 4.8 },
    ];
    st.orbit.setPose(poses[i]);

    if (i === 0) {
      flipK = 0; carveK = 0; writeK = 0;
    } else if (i === 1) {
      flipK = 0; carveK = 0; writeK = 0;
      tween(900, (e) => { writeK = e; });
    } else if (i === 2) {
      carveK = 0; writeK = 1;
      runFlip(withSound);
    } else if (i === 3) {
      flipK = 1; writeK = 1;
      runCarve(withSound);
    } else {
      flipK = 1; carveK = 1; writeK = 1;
    }
    if (withSound && i !== 2 && i !== 3) sound.play('tick');
  }

  async function runFlip(withSound) {
    if (anim) return;
    anim = true;
    flipK = 0;
    await tween(1350, (e) => { flipK = e; });
    if (withSound) sound.play('paper');
    anim = false;
  }

  async function runCarve(withSound) {
    if (withSound) sound.play('ratchet');
    carveK = 0;
    await tween(1450, (e) => {
      carveK = e;
      if (Math.random() < 0.55) {
        spawnChip(-1.2 + e * 2.4, -0.1, (Math.random() - 0.5) * 0.6);
      }
    });
  }

  const loop = makeLoop((dt, now) => {
    if (!anim) {
      autoTimer += dt;
      const stepDur = 0.48;
      if (autoTimer > stepDur) {
        autoTimer = 0;
        triggerStep((step + 1) % 6, false);
      }
    }

    // 更新 3D 稿纸空间翻转 (Step 1 写样 → Step 2 180° 空间翻转反贴)
    draftPaper.visible = (step === 1 || step === 2);
    if (draftPaper.visible) {
      const fk = step === 2 ? flipK : 0;
      paperPivot.position.y = -0.12 + (1 - fk) * 0.68 + Math.sin(fk * Math.PI) * 0.55;
      paperPivot.rotation.z = -fk * Math.PI; // 真正的 3D 180° 翻转！
      draftPaper.setDeform({ flip: fk, time: now });
      draftPaper.redrawPaper({
        alpha: step === 1 ? writeK : 1,
        mirror: false,
      });
    }

    // 更新 3D 雕版凸起反字与上墨状态
    const ck = step < 3 ? 0.08 : step === 3 ? Math.max(0.08, carveK) : 1;
    woodPlate.setCarveProgress(ck);
    woodPlate.setInk(step === 5 ? 0.96 : 0);

    // 更新 3D 拳刀雕刻轨迹
    chiselGroup.visible = (step === 3 && carveK < 0.99);
    if (chiselGroup.visible) {
      chiselGroup.position.set(
        -1.25 + carveK * 2.5,
        -0.12 + Math.abs(Math.sin(now * 26)) * 0.06,
        Math.sin(now * 14) * 0.35
      );
    }

    // 更新飞溅 3D 木屑粒子
    for (const c of chipPool) {
      if (c.life <= 0) continue;
      c.mesh.position.x += c.vx * dt;
      c.mesh.position.y += c.vy * dt;
      c.mesh.position.z += c.vz * dt;
      c.vy -= 4.8 * dt;
      c.mesh.rotation.x += 6 * dt;
      c.mesh.rotation.z += 5 * dt;
      c.life -= dt * 1.25;
      if (c.life <= 0) c.mesh.visible = false;
    }

    // 更新 Step 4 校对放大镜
    loupeGroup.visible = (step === 4);
    if (loupeGroup.visible) {
      loupeGroup.position.set(Math.sin(now * 2.2) * 0.85, 0.22, Math.cos(now * 1.6) * 0.25);
    }

    // 右上角 2D HUD 微视窗：凸版刻槽三维高度差剖面
    const g = st.g, W = st.w;
    st.begin();
    const inW = 152, inH = 126;
    drawMacroInset(g, W - inW - 10, 12, inW, inH, lang() === 'en' ? '3D Relief Profile' : '凸版刻槽剖面微距', (mg, iw, ih) => {
      const by = 58;
      mg.fillStyle = '#7c4d28';
      mg.fillRect(14, by, iw - 28, 22);
      const ridgeH = 18;
      const drop = (step < 3 ? 0 : step === 3 ? carveK : 1) * ridgeH;
      mg.fillStyle = '#9c6b3f';
      mg.fillRect(14, by - ridgeH + drop, iw - 28, ridgeH - drop);
      [0.26, 0.5, 0.74].forEach((u) => {
        const rx = iw * u - 9;
        mg.fillStyle = '#d4a373';
        mg.fillRect(rx, by - ridgeH, 18, ridgeH);
        if (step === 5) {
          mg.fillStyle = '#0f172a';
          mg.fillRect(rx, by - ridgeH - 4, 18, 4.5);
        }
      });
      mg.fillStyle = '#fde68a';
      mg.font = '600 9.5px system-ui';
      mg.textAlign = 'center';
      mg.fillText(
        lang() === 'en' ? `Mirrored: ${mirrored}` : `铲空留凸 · 反字：${mirrored}`,
        iw / 2, 94
      );
    });

    if (step === 5) {
      note.textContent = t('w2.mirrorNote');
    } else if (step === 3 && carveK >= 0.95) {
      note.textContent = t('w2.carved');
    } else {
      note.innerHTML = `<b>${t('w2.step')} ${step + 1}/6</b> — ${lang() === 'en' ? SIX_STEPS[step].en : SIX_STEPS[step].zh} · 镜像反字 <code>${mirrored}</code>（板厚 ~${BLOCK_THICKNESS_CM[0]}–${BLOCK_THICKNESS_CM[1]} cm）`;
    }
    st.end();
  });

  return {
    mount() {},
    rerender() {
      const btns = root.querySelectorAll('.steps button');
      SIX_STEPS.forEach((s, i) => { if (btns[i]) btns[i].textContent = lang() === 'en' ? s.en : s.zh; });
    },
    onShow() { autoTimer = 0; triggerStep(0, false); loop.start(); },
    onHide() { loop.stop(); },
  };
}
