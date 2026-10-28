// printing-digital/js/scenes/d2.js — D2 喷墨微滴（Three.js 3D 热发泡蒸汽腔 vs 压电陶瓷振膜与皮升墨滴飞行）
'use strict';

import {
  THREE,
  stage3d,
  makeLoop,
  sound,
  createDeformablePaper3D,
  drawMacroInset,
} from '../../../../common/js/printing/sceneKit.js';
import { DROPLET_PL } from '../facts.js';

export function create(root, kit) {
  const { t, lang } = kit;
  const st = stage3d(root, { height: 260, camPos: [0, 2.8, 5.2], camTarget: [-0.35, 0.55, 0] });

  const bar = document.createElement('div');
  bar.className = 'steps';
  const bT = document.createElement('button');
  const bP = document.createElement('button');
  bT.textContent = t('d2.thermal');
  bP.textContent = t('d2.piezo');
  bar.append(bT, bP);
  root.appendChild(bar);

  const read = document.createElement('div');
  read.className = 'readout';
  read.innerHTML = `<span>${t('d2.picoliter')}: <b>${DROPLET_PL[0]}–${DROPLET_PL[1]} pL</b></span>`;
  root.appendChild(read);

  const vs = document.createElement('div');
  vs.className = 'card';
  vs.textContent = t('d2.vs');
  root.appendChild(vs);

  // ── Build Two Side-by-Side 3D Cutaway Nozzle Chambers (Thermal vs Piezo) ──
  const stageGroup = new THREE.Group();
  stageGroup.position.set(-0.4, 0, 0);
  st.world.add(stageGroup);

  function buildNozzle3D(xPos, isThermal) {
    const g = new THREE.Group();
    g.position.set(xPos, 1.25, 0);

    // Translucent metallic-glass nozzle body
    const shell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.24, 0.68, 24),
      new THREE.MeshPhysicalMaterial({
        color: 0x475569,
        transparent: true,
        opacity: 0.45,
        roughness: 0.2,
        metalness: 0.4,
      })
    );
    g.add(shell);

    // Inner ink reservoir core
    const inkCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.16, 0.52, 20),
      new THREE.MeshStandardMaterial({
        color: isThermal ? 0x06b6d4 : 0xec4899,
        roughness: 0.2,
        metalness: 0.1,
      })
    );
    g.add(inkCore);

    // Actuator at top of chamber: Vapor Bubble + Heater (Thermal) OR PZT Crystal Diaphragm (Piezo)
    let actuator;
    if (isThermal) {
      actuator = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 18, 16),
        new THREE.MeshBasicMaterial({ color: 0xff8c24 })
      );
      actuator.position.y = 0.18;
    } else {
      actuator = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.38, 0.08, 24),
        new THREE.MeshStandardMaterial({ color: 0x818cf8, roughness: 0.25, metalness: 0.65, emissive: 0x4f46e5, emissiveIntensity: 0.35 })
      );
      actuator.position.y = 0.34;
    }
    g.add(actuator);
    stageGroup.add(g);
    return { group: g, actuator };
  }

  const thermalNozzle = buildNozzle3D(-0.82, true);
  const piezoNozzle = buildNozzle3D(0.82, false);

  // 3D Paper Substrate below nozzles
  const paperSheet = createDeformablePaper3D(2.8, 1.15, 18, 10, '1-5 PICOLITER INKJET');
  paperSheet.position.set(0, 0.08, 0);
  stageGroup.add(paperSheet);

  // Pool of 3D Teardrop Ink Droplets (Sphere + Tail Cone)
  const dropPool = [];
  for (let i = 0; i < 10; i++) {
    const dg = new THREE.Group();
    const dMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.15, metalness: 0.1 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.065, 14, 12), dMat);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.16, 12), dMat);
    tail.position.y = 0.09;
    dg.add(head, tail);
    dg.visible = false;
    stageGroup.add(dg);
    dropPool.push({ group: dg, mat: dMat, active: false, y: 0, vy: 0 });
  }

  let mode = 'thermal';
  let userHoldUntil = 0;
  let autoClock = 0;
  let emitT = 0;

  function setMode(m, manual = false) {
    mode = m;
    autoClock = 0;
    if (manual) {
      userHoldUntil = performance.now() + 9500;
      sound.play('tick');
    }
    bT.classList.toggle('on', mode === 'thermal');
    bP.classList.toggle('on', mode === 'piezo');
    kit.step(mode === 'thermal' ? 0 : 1);
  }

  bT.addEventListener('click', () => setMode('thermal', true));
  bP.addEventListener('click', () => setMode('piezo', true));
  setMode('thermal', false);

  const loop = makeLoop((dt, now) => {
    emitT += dt;
    if (performance.now() > userHoldUntil) {
      autoClock += dt;
      if (autoClock > 1.85) {
        setMode(mode === 'thermal' ? 'piezo' : 'thermal', false);
      }
    }

    const pulse = (Math.sin(now * 10) + 1) * 0.5;
    // Animate Thermal Vapor Bubble vs Piezoelectric Diaphragm
    const bScale = mode === 'thermal' ? 0.35 + pulse * 0.95 : 0.25;
    thermalNozzle.actuator.scale.set(bScale, bScale, bScale);
    piezoNozzle.actuator.position.y = 0.34 - (mode === 'piezo' ? pulse * 0.12 : 0.02);

    // Spawn 3D Teardrop Picoliter Droplets from active nozzle
    const interval = mode === 'thermal' ? 0.32 : 0.22;
    if (emitT > interval) {
      emitT = 0;
      const slot = dropPool.find((d) => !d.active);
      if (slot) {
        slot.active = true;
        slot.group.visible = true;
        slot.group.position.set(mode === 'thermal' ? -0.82 : 0.82, 0.86, 0);
        slot.vy = 1.65;
        slot.mat.color.setHex(mode === 'thermal' ? 0x06b6d4 : 0xec4899);
      }
    }

    for (const d of dropPool) {
      if (!d.active) continue;
      d.group.position.y -= d.vy * dt;
      d.vy += 2.4 * dt;
      if (d.group.position.y <= 0.14) {
        d.active = false;
        d.group.visible = false;
      }
    }

    // 2D HUD Labels & 1–5 pL Pinch-off Macro Inset
    const g = st.g, W = st.w;
    st.begin();
    const isEn = lang() === 'en';
    const leftW = W - 156;

    g.fillStyle = '#fed7aa';
    g.font = '600 10.5px system-ui';
    g.textAlign = 'center';
    g.fillText(isEn ? '~300°C Thermal Bubble' : '~300°C 热发泡蒸汽腔', leftW * 0.28, 22);
    g.fillStyle = '#c7d2fe';
    g.fillText(isEn ? 'PZT Piezo Crystal Flex' : 'PZT 压电陶瓷形变挤压', leftW * 0.72, 22);

    const mw = 142, mh = 136;
    drawMacroInset(g, W - mw - 10, 16, mw, mh, isEn ? '1–5 pL Pinch-off' : '皮升墨滴断裂慢镜', (mg, iw) => {
      const tPinch = (now * 2.2) % 1;
      const cx = iw / 2;
      mg.fillStyle = '#64748b';
      mg.fillRect(cx - 26, 8, 16, 10);
      mg.fillRect(cx + 10, 8, 16, 10);

      const dropY = 24 + tPinch * 42;
      mg.fillStyle = mode === 'thermal' ? '#06b6d4' : '#ec4899';
      if (tPinch < 0.55) {
        mg.beginPath();
        mg.moveTo(cx - 9, 18);
        mg.quadraticCurveTo(cx - 2, (18 + dropY) / 2, cx - 6, dropY);
        mg.arc(cx, dropY, 6, Math.PI, 0, true);
        mg.quadraticCurveTo(cx + 2, (18 + dropY) / 2, cx + 9, 18);
        mg.closePath();
        mg.fill();
      } else {
        mg.beginPath(); mg.arc(cx, dropY, 6.5, 0, Math.PI * 2); mg.fill();
        mg.beginPath(); mg.arc(cx, dropY - 12, 2.2, 0, Math.PI * 2); mg.fill();
      }

      mg.fillStyle = '#e2e8f0';
      mg.font = '9.5px system-ui';
      mg.textAlign = 'center';
      mg.fillText(`1 pL = 10⁻¹² L (Ø ≈ 13 μm)`, cx, 88);
      mg.fillStyle = '#94a3b8';
      mg.font = '8.5px system-ui';
      mg.fillText(
        mode === 'thermal'
          ? (isEn ? 'Thermal: High Nozzle Density' : '热发泡：高密度喷孔·水基墨')
          : (isEn ? 'Piezo: No Heat · Multi-fluid' : '微压电：不加热·兼容广泛墨水'),
        cx, 105
      );
    });

    st.end();
  });

  return {
    mount() {},
    onShow() { loop.start(); },
    onHide() { loop.stop(); },
  };
}
