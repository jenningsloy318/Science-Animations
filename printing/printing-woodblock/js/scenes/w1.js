// printing-woodblock/js/scenes/w1.js — W1 手抄的时代（3D 抄书匠书案 + 漫天 3D 日历翻飞 + 3D 印章/拓碑源头）
'use strict';

import {
  THREE, stage3d, makeLoop, tween, sound,
  createReliefPlate3D, createDeformablePaper3D,
  drawMacroInset, roundRect,
} from '../../../../common/js/printing/sceneKit.js';
import { HAND_COPY_DAYS } from '../facts.js';

export function create(root, kit) {
  const { t, lang } = kit;
  const st = stage3d(root, {
    height: 300,
    warm: true,
    theta: 0.28,
    phi: 1.02,
    radius: 5.9,
    target: [0, 0.25, 0],
  });

  const info = document.createElement('div');
  info.className = 'card';
  root.appendChild(info);

  const src = document.createElement('div');
  src.className = 'steps';
  const bSeal = document.createElement('button');
  const bRub = document.createElement('button');
  bSeal.textContent = t('w1.seal');
  bRub.textContent = t('w1.rubbing');
  src.append(bSeal, bRub);
  root.appendChild(src);

  const srcCard = document.createElement('div');
  srcCard.className = 'card';
  root.appendChild(srcCard);

  // ── 1. 左侧 3D 抄书案与挥毫毛笔 ─────────────────────────────────
  const deskGroup = new THREE.Group();
  deskGroup.position.set(-1.25, -0.55, 0);
  st.world.add(deskGroup);

  const deskTop = new THREE.Mesh(
    new THREE.BoxGeometry(2.3, 0.14, 1.45),
    new THREE.MeshStandardMaterial({ color: 0x7c4d28, roughness: 0.68, metalness: 0.06 })
  );
  deskGroup.add(deskTop);

  // 宣纸书卷
  const scrollPaper = createDeformablePaper3D(1.55, 0.98, { text: '天地玄黄', showTextAlpha: 0.85 });
  scrollPaper.position.set(-0.1, 0.09, 0);
  deskGroup.add(scrollPaper);

  // 砚台 (Inkstone)
  const inkstone = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.25, 0.08, 24),
    new THREE.MeshStandardMaterial({ color: 0x26292e, roughness: 0.4, metalness: 0.2 })
  );
  inkstone.position.set(-0.88, 0.11, -0.36);
  deskGroup.add(inkstone);

  // 3D 竹管毛笔 (Calligraphy Brush)
  const brushGroup = new THREE.Group();
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.03, 0.95, 14),
    new THREE.MeshStandardMaterial({ color: 0xb07d48, roughness: 0.55 })
  );
  shaft.position.y = 0.58;
  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.048, 0.22, 16),
    new THREE.MeshStandardMaterial({ color: 0x151518, roughness: 0.35 })
  );
  tip.rotation.x = Math.PI;
  tip.position.y = 0.06;
  brushGroup.add(shaft, tip);
  deskGroup.add(brushGroup);

  // ── 2. 空中 3D 翻飞日历纸片池 (16 枚 3D 纸片) ─────────────────────
  const calLeaves = [];
  const leafGeo = new THREE.PlaneGeometry(0.28, 0.34);
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0xfff8eb,
    roughness: 0.8,
    side: THREE.DoubleSide,
  });
  for (let i = 0; i < 16; i++) {
    const m = new THREE.Mesh(leafGeo, leafMat);
    const barMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, 0.06),
      new THREE.MeshBasicMaterial({ color: 0xc0392b, side: THREE.DoubleSide })
    );
    barMesh.position.set(0, 0.13, 0.002);
    m.add(barMesh);
    st.world.add(m);
    calLeaves.push({
      mesh: m,
      phase: i * 0.41,
      x0: -1.1 + ((i % 4) - 1.5) * 0.42,
      z0: ((i * 0.618) % 1 - 0.5) * 1.1,
    });
  }

  // ── 3. 右侧 3D 源头演示台：印章（阳文反字盖红印） vs 碑石拓印（阴文正字拍黑墨） ──
  const originGroup = new THREE.Group();
  originGroup.position.set(1.45, -0.55, 0);
  st.world.add(originGroup);

  const padPaper = createDeformablePaper3D(1.45, 1.15, { text: '印信', showTextAlpha: 0.9 });
  padPaper.position.set(0, 0.09, 0);
  originGroup.add(padPaper);

  // 3D 印章 (Seal)
  const sealGroup = new THREE.Group();
  const sealBody = createReliefPlate3D({
    width: 0.85,
    depth: 0.85,
    thickness: 0.38,
    chars: ['印'],
    mirror: true,
    baseColor: '#9e3b24',
    reliefHeight: 0.08,
  });
  sealBody.rotation.x = Math.PI; // 字面朝下盖印
  sealBody.position.y = 0.38;
  const knob = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.18, 0.35, 20),
    new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.35, metalness: 0.45 })
  );
  knob.position.y = 0.55;
  sealGroup.add(sealBody, knob);
  originGroup.add(sealGroup);

  // 3D 石碑与扑子墨包 (Stone Stele & Rubbing Dabber)
  const steleGroup = new THREE.Group();
  const steleSlab = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.28, 1.05),
    new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.75, metalness: 0.12 })
  );
  steleSlab.position.y = 0.14;
  const dabber = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 20, 16),
    new THREE.MeshStandardMaterial({ color: 0x1e2024, roughness: 0.85 })
  );
  dabber.position.y = 0.55;
  steleGroup.add(steleSlab, dabber);
  originGroup.add(steleGroup);

  let srcKind = 'seal';
  let stampK = 1;
  let days = 0, shownDays = -1, pauseTimer = 0;

  function showSrc(kind, triggerAnim = false) {
    srcKind = kind;
    srcCard.innerHTML = kind === 'seal' ? t('w1.seal.d') : t('w1.rubbing.d');
    bSeal.classList.toggle('on', kind === 'seal');
    bRub.classList.toggle('on', kind === 'rub');
    sealGroup.visible = kind === 'seal';
    steleGroup.visible = kind === 'rub';
    padPaper.redrawPaper({
      customDraw(ctx, w, h) {
        if (kind === 'seal') {
          ctx.fillStyle = '#fdf8ed';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#c0392b';
          ctx.lineWidth = 14;
          ctx.strokeRect(120, 55, w - 240, h - 110);
          ctx.fillStyle = '#c0392b';
          ctx.font = "700 130px 'Noto Serif SC', serif";
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('印信', w / 2, h / 2);
        } else {
          ctx.fillStyle = '#18181b';
          ctx.fillRect(24, 24, w - 48, h - 48);
          ctx.fillStyle = '#fafafa';
          ctx.font = "700 116px 'Noto Serif SC', serif";
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('石经', w / 2, h / 2);
        }
      },
    });
    if (triggerAnim) {
      stampK = 0;
      tween(650, (e) => { stampK = e; });
    }
  }
  bSeal.addEventListener('click', () => { showSrc('seal', true); sound.play('thud'); });
  bRub.addEventListener('click', () => { showSrc('rub', true); sound.play('paper'); });
  showSrc('seal', false);

  const loop = makeLoop((dt, now) => {
    const prog = Math.min(1, days / HAND_COPY_DAYS);

    // 1. 3D 毛笔在宣纸上挥毫运笔
    const strokeX = 0.45 - prog * 0.95 + Math.sin(now * 9) * 0.08;
    const strokeZ = Math.cos(now * 6.5) * 0.25;
    brushGroup.position.set(strokeX, 0.12 + Math.abs(Math.sin(now * 8)) * 0.04, strokeZ);
    brushGroup.rotation.z = Math.sin(now * 7) * 0.12;
    brushGroup.rotation.x = 0.18 + Math.cos(now * 5) * 0.08;

    // 2. 16 枚 3D 日历页在三维空间旋舞飘落
    calLeaves.forEach((leaf, idx) => {
      const u = (now * 0.42 + leaf.phase) % 1;
      leaf.mesh.position.set(
        leaf.x0 + Math.sin(now * 2.4 + idx) * 0.22,
        1.75 - u * 2.25,
        leaf.z0 + Math.cos(now * 1.9 + idx) * 0.18
      );
      leaf.mesh.rotation.set(
        u * Math.PI * 2.2 + idx,
        now * 1.5 + idx * 0.5,
        Math.sin(now * 3 + idx) * 0.6
      );
    });

    // 3. 右侧 3D 印章上下压印 / 拓印墨包拍打动画
    const pressWave = (Math.sin(now * 3.4) + 1) * 0.5 * stampK;
    sealGroup.position.y = 0.16 + pressWave * 0.55;
    sealGroup.rotation.y = Math.sin(now * 0.8) * 0.25;
    dabber.position.set(Math.sin(now * 4) * 0.28, 0.42 + Math.abs(Math.sin(now * 7)) * 0.28, Math.cos(now * 3) * 0.18);

    // 进度计数与循环自播（流畅连续不卡死）
    if (days < HAND_COPY_DAYS) {
      days = Math.min(HAND_COPY_DAYS, days + dt * 165);
      const stepIdx = days < 200 ? 0 : days < 650 ? 1 : days < 1050 ? 2 : 3;
      kit.step(stepIdx);
    } else {
      kit.step(3);
      pauseTimer += dt;
      if (pauseTimer > 0.45) {
        days = 0;
        pauseTimer = 0;
        showSrc(srcKind === 'seal' ? 'rub' : 'seal', true);
      }
    }

    const d = Math.floor(days);
    if (d !== shownDays) {
      shownDays = d;
      const pct = Math.round((d / HAND_COPY_DAYS) * 100);
      info.innerHTML = `<b>${t('w1.copying')}</b> · ${t('w1.days')}: <b>${d.toLocaleString()}</b> / ~${HAND_COPY_DAYS.toLocaleString()} (${pct}%)`;
    }

    // 4. 2D HUD 微视窗：印章反字阳文 vs 碑刻正字阴文截面对比
    const g = st.g, W = st.w;
    st.begin();
    const inW = 148, inH = 126;
    drawMacroInset(g, W - inW - 10, 12, inW, inH, srcKind === 'seal' ? t('w1.seal') : t('w1.rubbing'), (mg, iw, ih) => {
      mg.textAlign = 'center';
      if (srcKind === 'seal') {
        mg.fillStyle = '#b45309';
        roundRect(mg, 24, 10, iw - 48, 22, 4); mg.fill();
        mg.fillStyle = '#ef4444';
        mg.fillRect(42, 32, 16, 10);
        mg.fillRect(iw - 58, 32, 16, 10);
        mg.fillStyle = '#fdf8ed';
        mg.fillRect(16, 48, iw - 32, 12);
        mg.fillStyle = '#fde68a';
        mg.font = '600 9.5px system-ui';
        mg.fillText(lang() === 'en' ? 'Relief Mirror → Red Upright' : '凸起反字 → 盖出红底正字', iw / 2, 82);
      } else {
        mg.fillStyle = '#64748b';
        mg.fillRect(18, 28, iw - 36, 26);
        mg.fillStyle = '#0f172a';
        mg.fillRect(44, 28, 16, 12);
        mg.fillRect(iw - 60, 28, 16, 12);
        mg.fillStyle = '#f8fafc';
        mg.fillRect(18, 22, 26, 5);
        mg.fillRect(iw - 44, 22, 26, 5);
        mg.fillStyle = '#fde68a';
        mg.font = '600 9.5px system-ui';
        mg.fillText(lang() === 'en' ? 'Intaglio Upright → White Char' : '凹陷正字 → 拍墨留白正字', iw / 2, 82);
      }
    });
    st.end();
  });

  return {
    mount() {},
    rerender() {
      bSeal.textContent = t('w1.seal');
      bRub.textContent = t('w1.rubbing');
      showSrc(srcKind, false);
      shownDays = -1;
    },
    onShow() {
      days = 0; shownDays = -1; pauseTimer = 0;
      loop.start();
    },
    onHide() { loop.stop(); },
  };
}
