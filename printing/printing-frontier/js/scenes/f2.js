// printing-frontier/js/scenes/f2.js — F2 光刻：终极印刷（Three.js 3D EUV 布拉格反射镜 vs DUV 折射透镜与晶圆纳米鳍片）
'use strict';

import {
  THREE,
  stage3d,
  makeLoop,
  sound,
  drawMacroInset,
} from '../../../../common/js/printing/sceneKit.js';
import { resolution } from '../model/euv.js';
import { EUV_NM, NA_STD, K1 } from '../facts.js';

export function create(root, kit) {
  const { t, lang } = kit;
  const st = stage3d(root, { height: 265, camPos: [0, 3.1, 5.5], camTarget: [-0.35, 0.55, 0] });

  const wlRow = document.createElement('div');
  wlRow.className = 'slider-row';
  wlRow.innerHTML = `<span>${t('f2.wavelength')} (nm)</span><input id="fr-wl" type="range" min="13" max="365" value="13"><span class="val" id="fr-wlv">13.5</span>`;
  root.appendChild(wlRow);

  const naRow = document.createElement('div');
  naRow.className = 'slider-row';
  naRow.innerHTML = `<span>${t('f2.na')}</span><input id="fr-na" type="range" min="33" max="55" value="33"><span class="val" id="fr-nav">0.33</span>`;
  root.appendChild(naRow);

  const read = document.createElement('div');
  read.className = 'readout';
  read.innerHTML = `<span>${t('f2.res')}: <b id="fr-res">—</b></span><span style="color:#8d6e63">${t('f2.anchor')}</span>`;
  root.appendChild(read);

  let wl = EUV_NM, na = NA_STD, beamK = 0;

  // ── Build 3D Photolithography Scanner Bench (EUV Reflective vs DUV Refractive) ──
  const benchGroup = new THREE.Group();
  benchGroup.position.set(-0.4, 0, 0);
  st.world.add(benchGroup);

  // 1. Left Light Source: Sn-LPP Plasma Fireball / Excimer Laser Source
  const srcPos = new THREE.Vector3(-1.65, 0.72, 0);
  const srcMat = new THREE.MeshBasicMaterial({ color: 0xc084fc });
  const srcSphere = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 16), srcMat);
  srcSphere.position.copy(srcPos);
  const srcLight = new THREE.PointLight(0xc084fc, 2.5, 4.5);
  srcLight.position.copy(srcPos);
  benchGroup.add(srcSphere, srcLight);

  // 2A. EUV Mode Optics: Top Reflective Reticle + Bottom Mo/Si Bragg Mirror + Zig-Zag 3D Beam
  const euvGroup = new THREE.Group();
  benchGroup.add(euvGroup);

  const maskPos = new THREE.Vector3(-0.65, 1.38, 0);
  const mirrorPos = new THREE.Vector3(0.25, 0.28, 0);
  const waferPos = new THREE.Vector3(1.22, 0.65, 0);

  const euvReticle = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.08, 0.68),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.15, metalness: 0.9 })
  );
  euvReticle.position.copy(maskPos);
  euvReticle.rotation.z = -0.18;

  const braggMirror = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.36, 0.12, 28),
    new THREE.MeshStandardMaterial({ color: 0xa855f7, roughness: 0.1, metalness: 0.92 })
  );
  braggMirror.position.copy(mirrorPos);
  braggMirror.rotation.z = 0.15;
  euvGroup.add(euvReticle, braggMirror);

  // 3D Zig-Zag EUV Beam Tubes
  const euvPath = new THREE.CurvePath();
  euvPath.add(new THREE.LineCurve3(srcPos, maskPos));
  euvPath.add(new THREE.LineCurve3(maskPos, mirrorPos));
  euvPath.add(new THREE.LineCurve3(mirrorPos, waferPos));
  const euvBeamMat = new THREE.MeshBasicMaterial({ color: 0xd8b4fe, transparent: true, opacity: 0.72 });
  const euvBeamMesh = new THREE.Mesh(new THREE.TubeGeometry(euvPath, 32, 0.045, 10, false), euvBeamMat);
  euvGroup.add(euvBeamMesh);

  // 2B. DUV Mode Optics: Straight Transmissive Mask + Biconvex Quartz Projection Lens
  const duvGroup = new THREE.Group();
  duvGroup.visible = false;
  benchGroup.add(duvGroup);

  const duvMask = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.75, 0.75),
    new THREE.MeshPhysicalMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.55, roughness: 0.1 })
  );
  duvMask.position.set(-0.65, 0.72, 0);

  const duvLens = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 24, 20),
    new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45, roughness: 0.08 })
  );
  duvLens.scale.set(0.32, 1, 1);
  duvLens.position.set(0.25, 0.72, 0);

  const duvBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.16, 2.85, 16),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.55 })
  );
  duvBeam.rotation.z = Math.PI / 2;
  duvBeam.position.set(-0.22, 0.72, 0);
  duvGroup.add(duvMask, duvLens, duvBeam);

  // 3. Right Stage: 300mm Silicon Wafer Disc + 3D Instanced Nanoscale Fin Array
  const waferGroup = new THREE.Group();
  waferGroup.position.set(1.22, 0.12, 0);
  benchGroup.add(waferGroup);

  const waferDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.62, 0.06, 32),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.15, metalness: 0.88 })
  );
  waferDisc.receiveShadow = true;
  waferGroup.add(waferDisc);

  const FIN_COUNT = 16;
  const finGeo = new THREE.BoxGeometry(0.04, 0.14, 0.72);
  const finMat = new THREE.MeshStandardMaterial({ color: 0xc084fc, roughness: 0.25, metalness: 0.5 });
  const finInst = new THREE.InstancedMesh(finGeo, finMat, FIN_COUNT);
  waferGroup.add(finInst);

  function update(playSound = false) {
    const rawWl = Number(wlRow.querySelector('#fr-wl').value);
    wl = rawWl <= 14 ? EUV_NM : rawWl;
    na = Number(naRow.querySelector('#fr-na').value) / 100;
    wlRow.querySelector('#fr-wlv').textContent = String(wl);
    naRow.querySelector('#fr-nav').textContent = na.toFixed(2);
    const r = resolution(wl, na, K1);
    read.querySelector('#fr-res').textContent = r.toFixed(1) + ' nm';
    if (playSound) sound.play('tick');
    return r;
  }
  let userHoldUntil = 0;
  wlRow.querySelector('#fr-wl').addEventListener('input', () => { userHoldUntil = performance.now() + 8000; update(true); });
  naRow.querySelector('#fr-na').addEventListener('input', () => { userHoldUntil = performance.now() + 8000; update(true); });

  const dummy = new THREE.Object3D();

  const loop = makeLoop((dt, now) => {
    beamK = (beamK + dt * 0.55) % 1;
    kit.step(Math.min(5, Math.floor(beamK * 6)));

    // 自播过程中连续平滑演进：DUV 193nm → EUV 13.5nm (0.33) → High-NA 0.55
    if (performance.now() > userHoldUntil) {
      const cyc = (now * 0.2) % 3;
      if (cyc < 1) {
        wl = 193; na = 0.85;
      } else if (cyc < 2) {
        wl = EUV_NM; na = 0.33;
      } else {
        wl = EUV_NM; na = 0.55;
      }
      wlRow.querySelector('#fr-wl').value = String(wl);
      naRow.querySelector('#fr-na').value = String(Math.round(na * 100));
      wlRow.querySelector('#fr-wlv').textContent = String(wl);
      naRow.querySelector('#fr-nav').textContent = na.toFixed(2);
      const r = resolution(wl, na, K1);
      read.querySelector('#fr-res').textContent = r.toFixed(1) + ' nm';
    }

    const res = resolution(wl, na, K1);
    const isEUV = wl <= 20;
    const pulse = 0.75 + 0.25 * Math.sin(now * 9);

    // Switch 3D Optical Train between EUV Reflective Vacuum & DUV Refractive Lens
    euvGroup.visible = isEUV;
    duvGroup.visible = !isEUV;
    srcMat.color.setHex(isEUV ? 0xc084fc : 0x38bdf8);
    srcLight.color.setHex(isEUV ? 0xc084fc : 0x38bdf8);
    srcSphere.scale.setScalar(pulse);

    // Scale Mirror / Lens aperture diameter with Numerical Aperture (NA)
    const naScale = 0.8 + (na - 0.33) * 1.8;
    braggMirror.scale.set(naScale, 1, naScale);
    duvLens.scale.set(0.32, naScale, naScale);

    // Update 3D Silicon Wafer Nanoscale Fins (fin width & spacing scale with Rayleigh resolution!)
    finMat.color.setHex(isEUV ? 0xc084fc : 0x38bdf8);
    const visibleFins = Math.max(4, Math.min(FIN_COUNT, Math.round(180 / res)));
    const finScaleX = Math.max(0.45, Math.min(2.2, res / 18));
    for (let i = 0; i < FIN_COUNT; i++) {
      if (i < visibleFins) {
        const x = ((i / (visibleFins - 1)) - 0.5) * 0.82;
        dummy.position.set(x, 0.09, 0);
        dummy.scale.set(finScaleX, 1, 1);
      } else {
        dummy.position.set(0, -5, 0);
        dummy.scale.set(0.001, 0.001, 0.001);
      }
      dummy.updateMatrix();
      finInst.setMatrixAt(i, dummy.matrix);
    }
    finInst.instanceMatrix.needsUpdate = true;

    // 2D HUD Header & Rayleigh Pitch Macro Inset
    const g = st.g, W = st.w;
    st.begin();
    const isEn = lang() === 'en';
    const leftW = W - 156;

    g.fillStyle = isEUV ? '#c084fc' : '#38bdf8';
    g.font = '700 10.5px system-ui';
    g.textAlign = 'center';
    g.fillText(
      isEUV
        ? (isEn ? 'EUV 13.5 nm Vacuum · Sn Plasma + Mo/Si Bragg Reflective Mirrors' : 'EUV 13.5 nm 真空腔体 · 锡液滴等离子体 + Mo/Si 多层布拉格反射镜')
        : (isEn ? `DUV / UV ${wl} nm · Refractive Quartz Projection Lens System` : `紫外/深紫外 ${wl} nm · 透射掩膜 + 石英折射物镜缩印系统`),
      leftW * 0.48, 22
    );

    const mw = 142, mh = 138;
    drawMacroInset(g, W - mw - 10, 16, mw, mh, isEn ? 'Rayleigh Pitch (nm)' : '晶圆纳米线宽微距', (mg, iw) => {
      mg.fillStyle = '#334155';
      mg.fillRect(12, 64, iw - 24, 14);

      const finW = Math.max(3, Math.min(18, res * 0.22));
      const stepX = finW * 2;
      mg.fillStyle = isEUV ? '#c084fc' : '#38bdf8';
      for (let x = 18; x < iw - 22; x += stepX) {
        mg.fillRect(x, 34, finW, 30);
      }

      mg.fillStyle = '#f8fafc';
      mg.font = '700 11px system-ui';
      mg.textAlign = 'center';
      mg.fillText(`R = ${res.toFixed(1)} nm`, iw / 2, 24);

      mg.fillStyle = '#fbbf24';
      mg.font = '9.5px monospace';
      mg.fillText(`R = ${K1} × ${wl} / ${na.toFixed(2)}`, iw / 2, 94);
      mg.fillStyle = '#94a3b8';
      mg.font = '8.5px system-ui';
      mg.fillText(
        na >= 0.5
          ? (isEn ? 'High-NA 0.55 → ~8 nm limit' : 'High-NA 0.55 逼近 ~8 nm 极限')
          : (isEn ? 'Standard NA 0.33 → ~13 nm' : '标准 NA 0.33 分辨率 ~13 nm'),
        iw / 2, 110
      );
    });

    st.end();
  });

  update(false);
  return {
    mount() {},
    onShow() { loop.start(); },
    onHide() { loop.stop(); },
  };
}
