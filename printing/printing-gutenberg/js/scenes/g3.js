// printing-gutenberg/js/scenes/g3.js — G3 油墨与压机（Three.js 3D 谷登堡木制螺旋压机、墨球上墨与《42 行圣经》出炉）
'use strict';

import {
  THREE,
  stage3d,
  makeLoop,
  tween,
  sound,
  createReliefPlate3D,
  createDeformablePaper3D,
  drawMacroInset,
} from '../../../../common/js/printing/sceneKit.js';
import { BIBLE_YEAR } from '../facts.js';

export function create(root, kit) {
  const { t, lang } = kit;
  const st = stage3d(root, { height: 260, camPos: [0, 3.2, 5.6], camTarget: [0, 0.75, 0] });

  const pressBtn = document.createElement('button');
  pressBtn.className = 'steps';
  pressBtn.style.display = 'inline-block';
  pressBtn.textContent = t('g3.press');
  root.appendChild(pressBtn);

  const inkCard = document.createElement('div');
  inkCard.className = 'readout';
  root.appendChild(inkCard);

  // ── Build 3D Gutenberg Wooden Screw Press (Left/Center) ──
  const pressGroup = new THREE.Group();
  pressGroup.position.set(-0.75, 0, 0);
  st.world.add(pressGroup);

  const oakMat = new THREE.MeshStandardMaterial({ color: 0x6e4423, roughness: 0.72, metalness: 0.05 });
  const darkOakMat = new THREE.MeshStandardMaterial({ color: 0x4f3017, roughness: 0.78, metalness: 0.06 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.35, metalness: 0.85 });

  // Twin oak upright cheeks + top cap beam + lower rails
  const cheekL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.25, 0.42), oakMat);
  cheekL.position.set(-0.88, 1.12, 0);
  cheekL.castShadow = true;
  const cheekR = cheekL.clone();
  cheekR.position.x = 0.88;

  const topBeam = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.26, 0.52), darkOakMat);
  topBeam.position.set(0, 2.15, 0);
  topBeam.castShadow = true;

  const midBeam = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.22, 0.48), darkOakMat);
  midBeam.position.set(0, 1.55, 0);

  const bedRails = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.16, 1.65), darkOakMat);
  bedRails.position.set(0, 0.08, 0.25);
  bedRails.receiveShadow = true;
  pressGroup.add(cheekL, cheekR, topBeam, midBeam, bedRails);

  // Rotating 3D Wooden/Iron Spindle Screw + Lever Bar + Platen
  const screwAssembly = new THREE.Group();
  screwAssembly.position.set(0, 1.35, 0);
  const screwCylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.95, 20), ironMat);
  screwCylinder.castShadow = true;

  // Helical thread rings along the spindle
  for (let i = 0; i < 6; i++) {
    const torus = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.024, 8, 20), ironMat);
    torus.rotation.x = Math.PI / 2 + 0.18;
    torus.position.y = -0.35 + i * 0.13;
    screwAssembly.add(torus);
  }

  // Long Iron/Wood Lever Bar (扳手长杆)
  const leverBar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.055, 1.45, 12),
    new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.45, metalness: 0.4 })
  );
  leverBar.rotation.z = Math.PI / 2;
  leverBar.position.set(0.62, -0.22, 0.15);
  screwAssembly.add(screwCylinder, leverBar);
  pressGroup.add(screwAssembly);

  // Heavy Wooden Platen (压板) suspended beneath the screw
  const platenMesh = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.16, 0.92), oakMat);
  platenMesh.position.set(0, 0.85, 0);
  platenMesh.castShadow = true;
  pressGroup.add(platenMesh);

  // Sliding Coffin Bed with 3D Lead-Type Form & Paper Sheet
  const coffinGroup = new THREE.Group();
  coffinGroup.position.set(0, 0.18, 0);
  const leadForm = createReliefPlate3D('BIBLE 42', {
    width: 1.18,
    depth: 0.86,
    thickness: 0.14,
    reliefHeight: 0.04,
    mirror: true,
    type: 'metal',
  });
  coffinGroup.add(leadForm);
  pressGroup.add(coffinGroup);

  // 3D Dog-skin Ink Ball (墨球) for inking the lead type
  const inkBallGroup = new THREE.Group();
  const ballPad = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 18, 14),
    new THREE.MeshStandardMaterial({ color: 0x1e1b18, roughness: 0.45 })
  );
  ballPad.scale.set(1, 0.65, 1);
  const ballHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 0.36, 12), oakMat);
  ballHandle.position.y = 0.22;
  inkBallGroup.add(ballPad, ballHandle);
  inkBallGroup.position.set(-1.35, 0.55, 0.55);
  st.world.add(inkBallGroup);

  // 3D Freshly Printed 42-Line Gutenberg Bible Page emerging on the right
  const biblePage = createDeformablePaper3D(1.15, 1.45, 18, 18, 'BIBLE 42\nIn principio\ncreavit Deus');
  biblePage.position.set(0.85, 0.82, 0.15);
  biblePage.rotation.x = -0.35;
  st.world.add(biblePage);

  let pressK = 0, showPageK = 0, printed = 0, busy = false, autoTimer = 0;

  function syncInfo() {
    inkCard.innerHTML = `<span><b>${t('g3.page')}</b> (${BIBLE_YEAR})</span> · <span>${lang() === 'en' ? 'Impressions' : '压印页数'}: <b>${printed}</b></span>`;
  }
  syncInfo();

  async function runPress(withSound = false) {
    if (busy) return;
    busy = true;
    showPageK = 0;
    kit.step(2);   // 墨球上墨 & 推入压板下
    if (withSound) sound.play('pour');
    st.orbit.setPose({ theta: -0.15, phi: 1.02, radius: 5.4, target: [-0.45, 0.75, 0] });
    kit.step(4);   // 螺旋加压
    await tween(880, (e) => { pressK = e; });
    printed += 1;
    syncInfo();
    if (withSound) sound.play('thud');
    kit.step(5);   // 揭纸出炉
    st.orbit.setPose({ theta: 0.18, phi: 0.96, radius: 5.5, target: [0.1, 0.75, 0.1] });
    await tween(650, (e) => { pressK = 1 - e; showPageK = e; });
    busy = false;
  }

  pressBtn.addEventListener('click', () => {
    autoTimer = -5;
    runPress(true);
  });

  const loop = makeLoop((dt, now) => {
    if (!busy) {
      autoTimer += dt;
      if (autoTimer > 0.42) {
        autoTimer = 0;
        runPress(false);
      }
    }

    // 1. Rotate 3D Spindle Screw & Lever Bar, lower Platen onto Lead Form
    screwAssembly.rotation.y = -pressK * Math.PI * 0.85;
    screwAssembly.position.y = 1.35 - pressK * 0.36;
    platenMesh.position.y = 0.82 - pressK * 0.38;

    // 2. Rock the 3D Ink Ball gently on the side
    inkBallGroup.rotation.z = Math.sin(now * 3.5) * 0.22;

    // 3. Animate the 3D 42-Line Bible Page on the right
    const pageReveal = Math.max(showPageK, printed > 0 ? 0.85 : 0.15);
    biblePage.position.y = 0.45 + pageReveal * 0.38;
    biblePage.setDeform({ peel: (1 - pressK) * 0.35, curl: 0.12 });

    // 2D HUD & Contact-Angle Wetting Inset (Water Bead vs Linseed Oil Ink Film)
    const g = st.g, W = st.w, H = st.h;
    st.begin();

    const inW = Math.min(186, W * 0.36), inH = 152;
    drawMacroInset(g, W - inW - 12, 14, inW, inH, lang() === 'en' ? 'Wetting on Lead' : '铅面润湿 · 水墨 vs 油墨', (gg, x, y, w, h) => {
      const surfY = y + h * 0.66;
      gg.fillStyle = '#64748b';
      gg.fillRect(x + 12, surfY, w - 24, 20);

      // Left: Water-based ink beads up with high contact angle (θ > 110°)
      const wx = x + w * 0.29;
      const wobble = Math.sin(now * 3.5) * 1.2;
      gg.fillStyle = 'rgba(56,189,248,0.88)';
      gg.beginPath();
      gg.ellipse(wx, surfY - 13 + wobble * 0.4, 12 - wobble * 0.5, 14 + wobble * 0.5, 0, 0, Math.PI * 2);
      gg.fill();
      gg.fillStyle = '#d8d0c5'; gg.font = '600 9.5px system-ui'; gg.textAlign = 'center';
      gg.fillText(t('g3.water'), wx, surfY + 34);

      // Right: Linseed oil ink spreads into a low-angle film (θ < 25°)
      const ox = x + w * 0.72;
      const spread = 24 + Math.sin(now * 2.5) * 1.5;
      gg.fillStyle = '#0f172a';
      gg.beginPath();
      gg.moveTo(ox - spread, surfY);
      gg.quadraticCurveTo(ox, surfY - 11, ox + spread, surfY);
      gg.closePath();
      gg.fill();
      gg.fillStyle = '#d8d0c5'; gg.font = '600 9.5px system-ui'; gg.textAlign = 'center';
      gg.fillText(t('g3.oil'), ox, surfY + 34);
    });

    st.end();
  });

  return {
    mount() {},
    rerender() {
      pressBtn.textContent = t('g3.press');
      syncInfo();
    },
    onShow() { autoTimer = 0.6; runPress(false); loop.start(); },
    onHide() { loop.stop(); },
  };
}
