// printing-offset/js/scenes/o1.js — O1 石版的秘密（Three.js 3D 巴伐利亚石灰石板、水辊油辊同平面互斥与平版转印）
'use strict';

import {
  THREE,
  stage3d,
  makeLoop,
  stepsBar,
  sound,
  createReliefPlate3D,
  createRoller3D,
  createDeformablePaper3D,
  drawMacroInset,
} from '../../../../common/js/printing/sceneKit.js';
import { LITHO_YEAR } from '../facts.js';

export function create(root, kit) {
  const { t, lang } = kit;
  const st = stage3d(root, { height: 265, camPos: [0, 3.2, 5.2], camTarget: [-0.35, 0.25, 0] });
  const note = document.createElement('div');
  note.className = 'card';
  note.textContent = `${LITHO_YEAR} · ` + t('o1.note');
  root.appendChild(note);

  // ── Build 3D Bavarian Limestone Slab (Zero Relief Δh ≈ 0!) ──
  const benchGroup = new THREE.Group();
  benchGroup.position.set(-0.4, 0, 0);
  st.world.add(benchGroup);

  const stoneSlab = createReliefPlate3D('LITHO 1796', {
    width: 2.5,
    depth: 1.38,
    thickness: 0.28,
    reliefHeight: 0.005, // Planographic: virtually zero height difference
    mirror: true,
    type: 'stone',
  });
  benchGroup.add(stoneSlab);

  // Hydrophilic Water Film strips on blank zones (Step 2+)
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.12,
    metalness: 0.1,
    transparent: true,
    opacity: 0,
  });
  const waterStrips = [-0.95, 0, 0.95].map((xPos) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.015, 1.26), waterMat);
    m.position.set(xPos, 0.295, 0);
    benchGroup.add(m);
    return m;
  });

  // Oleophilic Wax / Oil-Ink Image Tracks (Step 0 & Step 3+)
  const inkZoneMat = new THREE.MeshStandardMaterial({
    color: 0x4b382a,
    roughness: 0.35,
    metalness: 0.15,
  });
  const inkZones = [-0.48, 0.48].map((xPos) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.018, 1.18), inkZoneMat);
    m.position.set(xPos, 0.296, 0);
    benchGroup.add(m);
    return m;
  });

  // 3D Greasy Wax Crayon (Step 0)
  const crayonGroup = new THREE.Group();
  const crayonBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.055, 0.58, 14),
    new THREE.MeshStandardMaterial({ color: 0x3b2d22, roughness: 0.55 })
  );
  crayonBody.position.y = 0.34;
  const crayonTip = new THREE.Mesh(
    new THREE.ConeGeometry(0.055, 0.14, 14),
    new THREE.MeshStandardMaterial({ color: 0x261c15, roughness: 0.45 })
  );
  crayonTip.rotation.x = Math.PI;
  crayonTip.position.y = 0.07;
  crayonGroup.add(crayonBody, crayonTip);
  crayonGroup.rotation.z = 0.32;
  benchGroup.add(crayonGroup);

  // 3D Blue Dampening Water Roller (Step 2) & Black Oil-Ink Roller (Step 3)
  const waterRoller = createRoller3D(0.22, 1.36, { color: 0x0284c7, roughness: 0.25, metalness: 0.3 });
  waterRoller.rotation.y = Math.PI / 2;
  waterRoller.position.set(0, 0.52, 0);
  waterRoller.visible = false;
  benchGroup.add(waterRoller);

  const inkRoller = createRoller3D(0.24, 1.36, { color: 0x18181b, roughness: 0.22, metalness: 0.4 });
  inkRoller.rotation.y = Math.PI / 2;
  inkRoller.position.set(0, 0.54, 0);
  inkRoller.visible = false;
  benchGroup.add(inkRoller);

  // 3D Paper Sheet for Step 4 Planographic Print
  const paperSheet = createDeformablePaper3D(2.3, 1.25, 22, 14, 'SENEFELDER 1796 · PLANOGRAPHIC');
  paperSheet.position.set(0, 0.34, 0);
  paperSheet.visible = false;
  benchGroup.add(paperSheet);

  let step = 0;
  let stepProgress = 0;
  let inkWave = 0;
  let autoClock = 0;
  let userHoldUntil = 0;

  function selectStep(i, manual = false) {
    step = i;
    stepProgress = 0;
    autoClock = 0;
    if (manual) {
      userHoldUntil = performance.now() + 9500;
      sound.play(i === 3 ? 'pop' : 'tick');
    }
    kit.step(Math.min(i, 3));
    bar.set(i);
  }

  const bar = stepsBar(root, [t('o1.wax'), t('o1.gum'), t('o1.water'), t('o1.ink'), t('o1.print')], (i) => {
    selectStep(i, true);
  });

  const loop = makeLoop((dt, now) => {
    inkWave += dt * 3.2;
    stepProgress = Math.min(1, stepProgress + dt * 1.6);

    if (performance.now() > userHoldUntil) {
      autoClock += dt;
      if (autoClock > 0.65) {
        selectStep((step + 1) % 5, false);
      }
    }

    // Step 0: Greasy Wax Crayon draws on flat limestone
    crayonGroup.visible = step === 0;
    if (step === 0) {
      const activeZ = stepProgress < 0.5 ? -0.48 : 0.48;
      const zSweep = ((stepProgress * 2) % 1 - 0.5) * 0.95;
      crayonGroup.position.set(activeZ, 0.32, zSweep);
    }

    // Update Oleophilic Wax / Ink tracks
    inkZoneMat.color.setHex(step >= 3 ? 0x111318 : 0x5c4028);
    inkZoneMat.roughness = step >= 3 ? 0.15 : 0.5;
    inkZones.forEach((iz, idx) => {
      const p = step === 0 ? Math.min(1, Math.max(0.05, stepProgress * 1.6 - idx * 0.5)) : 1;
      iz.scale.z = p;
    });

    // Step 1 & 2+: Hydrophilic Gum Arabic & Water Film
    waterMat.opacity = step === 1 ? stepProgress * 0.35 : step >= 2 ? 0.65 + Math.sin(inkWave) * 0.08 : 0;
    waterStrips.forEach((ws) => {
      ws.position.y = 0.295 + (step >= 2 ? Math.sin(inkWave) * 0.004 : 0);
    });

    // Step 2: 3D Water Roller rolls across limestone
    waterRoller.visible = step === 2;
    if (step === 2) {
      const rx = -1.05 + stepProgress * 2.1;
      waterRoller.position.x = rx;
      waterRoller.rotation.x = stepProgress * Math.PI * 3;
    }

    // Step 3: 3D Oil-Ink Roller rolls across limestone (ink sticks only to wax tracks!)
    inkRoller.visible = step === 3;
    if (step === 3) {
      const rx = -1.05 + stepProgress * 2.1;
      inkRoller.position.x = rx;
      inkRoller.rotation.x = stepProgress * Math.PI * 3;
    }

    // Step 4: 3D Paper Sheet presses and peels off the flat stone
    paperSheet.visible = step === 4;
    if (step === 4) {
      const peel = Math.max(0, (stepProgress - 0.25) / 0.75);
      paperSheet.position.y = 0.33 + peel * 0.38;
      paperSheet.setDeform({ peel: peel * 0.75, press: 1 - peel });
    }

    // 2D HUD Caption & Water-vs-Oil Boundary Macro Inset
    const g = st.g, W = st.w, H = st.h;
    st.begin();
    const isEn = lang() === 'en';
    const leftW = W - 156;

    const captions = isEn
      ? [
          '1. Greasy Wax Crayon draws image directly on flat limestone',
          '2. Gum Arabic sensitizes non-image stone pores to love water',
          '3. Water Roller wets blank areas; grease repels water droplets',
          '4. Ink Roller inks only greasy lines; water film blocks ink',
          '5. Paper pressed on flat stone — printing without relief or grooves!',
        ]
      : [
          '① 油脂蜡笔在平整石灰石面绘出亲油图文（无高低落差）',
          '② 刷阿拉伯树胶：空白微孔形成亲水保护层',
          '③ 滚水：水膜牢牢占据空白区，遇油脂图文自动退避',
          '④ 滚墨：油墨被水膜排斥，100% 精准吸附在油脂图文上',
          '⑤ 覆纸压印：不凸不凹，靠“水油不相容”完成平版印刷！',
        ];
    g.fillStyle = 'rgba(240, 246, 255, 0.92)';
    g.font = '600 11px system-ui';
    g.textAlign = 'center';
    g.fillText(captions[step], leftW * 0.5, 22);

    const mw = 138, mh = 134;
    drawMacroInset(g, W - mw - 10, 16, mw, mh, isEn ? 'Water vs Oil Boundary' : '水油楚河汉界微距', (mg, iw) => {
      const base = 76;
      mg.fillStyle = '#8d99ae';
      mg.fillRect(10, base, iw - 20, 18);

      mg.fillStyle = 'rgba(56, 189, 248, 0.6)';
      mg.beginPath();
      mg.moveTo(12, base);
      mg.lineTo(12, base - 22);
      mg.quadraticCurveTo(iw / 2 - 4, base - 24, iw / 2 - 3, base);
      mg.closePath();
      mg.fill();

      mg.fillStyle = '#5c4028';
      mg.fillRect(iw / 2 + 2, base - 5, iw / 2 - 14, 5);
      mg.fillStyle = '#181a1f';
      mg.beginPath();
      mg.moveTo(iw / 2 + 2, base - 5);
      mg.quadraticCurveTo(iw / 2 + 6, base - 26, iw - 12, base - 22);
      mg.lineTo(iw - 12, base - 5);
      mg.closePath();
      mg.fill();

      const pulse = Math.sin(now * 5) * 2;
      mg.strokeStyle = '#ffbe3c';
      mg.lineWidth = 1.6;
      mg.beginPath();
      mg.moveTo(iw / 2 - 8 - pulse, base - 32);
      mg.lineTo(iw / 2 + 8 + pulse, base - 32);
      mg.stroke();

      mg.fillStyle = '#7dd3fc';
      mg.font = '600 9.5px system-ui';
      mg.textAlign = 'center';
      mg.fillText(isEn ? 'H₂O Film' : '亲水水膜', iw * 0.28, base - 36);
      mg.fillStyle = '#fcd34d';
      mg.fillText(isEn ? 'Oil Ink' : '亲油墨层', iw * 0.72, base - 36);

      mg.fillStyle = '#e2e8f0';
      mg.font = '9px system-ui';
      mg.fillText(isEn ? 'Zero Relief Difference (Δh ≈ 0)' : '同一平面 (Δh ≈ 0) · 化学互斥', iw / 2, 110);
    });

    st.end();
  });

  selectStep(0, false);
  return {
    mount() {},
    onShow() { loop.start(); },
    onHide() { loop.stop(); },
  };
}
