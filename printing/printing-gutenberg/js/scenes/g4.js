// printing-gutenberg/js/scenes/g4.js — G4 系统的胜利（Three.js 3D 四大子系统光流汇聚《42 行圣经》精装书卷）
'use strict';

import {
  THREE,
  stage3d,
  makeLoop,
  tween,
  sound,
  createMovableType3D,
  createDeformablePaper3D,
  drawMacroInset,
} from '../../../../common/js/printing/sceneKit.js';
import { BIBLE_PAGES, BIBLE_PRINTED, BIBLE_PAPER, BIBLE_VELLUM, BIBLE_SURVIVING, BIBLE_VELLUM_COMPLETE } from '../facts.js';

const STREAMS = [
  { zh: '① 三级铸造流水线', en: '① 3-Stage Casting', color: 0xe07a2e, css: '#e07a2e', pos: [-1.85, 0.55, -0.75] },
  { zh: '② 铅锡锑膨胀合金', en: '② Pb-Sb-Sn Type Metal', color: 0x60a5fa, css: '#60a5fa', pos: [-1.95, 0.35, -0.15] },
  { zh: '③ 亚麻仁油性墨', en: '③ Linseed Oil Ink', color: 0xa78bfa, css: '#a78bfa', pos: [-1.85, 0.35, 0.45] },
  { zh: '④ 木制螺旋压机', en: '④ Wooden Screw Press', color: 0xf59e0b, css: '#f59e0b', pos: [-1.55, 0.55, 0.95] },
];

export function create(root, kit) {
  const { t, lang } = kit;
  const st = stage3d(root, { height: 255, camPos: [0, 3.3, 5.5], camTarget: [-0.2, 0.45, 0] });

  const btn = document.createElement('button');
  btn.className = 'steps';
  btn.style.display = 'inline-block';
  btn.textContent = t('g4.converge');
  root.appendChild(btn);

  const stats = document.createElement('div');
  stats.className = 'card';
  stats.textContent = t('g4.stats');
  root.appendChild(stats);

  // ── 4 3D Innovation Pedestals + Curved 3D Energy Streams ──
  const targetCenter = new THREE.Vector3(-0.05, 0.52, 0);
  const streamNodes = STREAMS.map((s, idx) => {
    const pGroup = new THREE.Group();
    pGroup.position.set(...s.pos);
    st.world.add(pGroup);

    // Distinct 3D mini-artifact on each pedestal
    let iconMesh;
    if (idx === 0) {
      iconMesh = createMovableType3D('G', { size: 0.28, height: 0.36, materialType: 'bronze' });
    } else if (idx === 1) {
      iconMesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.2),
        new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.2, metalness: 0.92 })
      );
    } else if (idx === 2) {
      iconMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 16, 14),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.25, metalness: 0.5 })
      );
    } else {
      iconMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 0.38, 14),
        new THREE.MeshStandardMaterial({ color: 0x9c6b3f, roughness: 0.6 })
      );
    }
    pGroup.add(iconMesh);

    // 3D Quadratic Bezier Tube from pedestal to Central Bible Codex
    const startVec = new THREE.Vector3(...s.pos);
    const midVec = new THREE.Vector3((s.pos[0] + targetCenter.x) * 0.5, s.pos[1] + 0.45, s.pos[2] * 0.5);
    const curve = new THREE.QuadraticBezierCurve3(startVec, midVec, targetCenter);
    const tubeGeo = new THREE.TubeGeometry(curve, 28, 0.028, 8, false);
    const tubeMat = new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.2 });
    const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
    st.world.add(tubeMesh);

    // Glowing pulse orb traveling along the 3D curve
    const orbMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.065, 12, 12),
      new THREE.MeshBasicMaterial({ color: s.color })
    );
    st.world.add(orbMesh);

    return { pGroup, curve, tubeMat, orbMesh };
  });

  // ── Central 3D Open 42-Line Gutenberg Bible Codex on Lectern ──
  const codexGroup = new THREE.Group();
  codexGroup.position.copy(targetCenter);
  st.world.add(codexGroup);

  const leatherMat = new THREE.MeshStandardMaterial({ color: 0x5c2415, roughness: 0.65, metalness: 0.15 });
  const coverL = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.08, 1.18), leatherMat);
  coverL.position.set(-0.4, -0.02, 0);
  coverL.rotation.z = 0.12;
  coverL.castShadow = true;
  const coverR = coverL.clone();
  coverR.position.x = 0.4;
  coverR.rotation.z = -0.12;
  codexGroup.add(coverL, coverR);

  const pageL = createDeformablePaper3D(0.76, 1.08, 14, 14, 'GUTENBERG\n1455 BIBLE');
  pageL.position.set(-0.39, 0.04, 0);
  pageL.rotation.z = 0.12;
  pageL.setDeform({ curl: -0.15 });
  const pageR = createDeformablePaper3D(0.76, 1.08, 14, 14, '42 LINES\n180 COPIES');
  pageR.position.set(0.39, 0.04, 0);
  pageR.rotation.z = -0.12;
  pageR.setDeform({ curl: -0.15 });
  codexGroup.add(pageL, pageR);

  // Golden Halo Ring underneath Codex
  const haloMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0, side: THREE.DoubleSide });
  const haloRing = new THREE.Mesh(new THREE.RingGeometry(0.65, 0.92, 36), haloMat);
  haloRing.rotation.x = -Math.PI / 2;
  haloRing.position.y = -0.12;
  codexGroup.add(haloRing);

  let conv = 0, busy = false, autoTimer = 0;

  async function runConverge(withSound = false) {
    if (busy) return;
    busy = true;
    conv = 0;
    if (withSound) sound.play('pour');
    await tween(2100, (e) => {
      conv = e;
      kit.step(Math.min(4, Math.floor(e * 5)));
    });
    if (withSound) sound.play('thud');
    busy = false;
  }

  btn.addEventListener('click', () => {
    autoTimer = -5;
    runConverge(true);
  });

  const loop = makeLoop((dt, now) => {
    if (!busy) {
      autoTimer += dt;
      if (autoTimer > 0.45) {
        autoTimer = 0;
        runConverge(false);
      }
    }

    // Animate 4 3D Innovation Streams & Orbs
    streamNodes.forEach((sn, i) => {
      sn.pGroup.rotation.y = now * 1.1 + i;
      const reach = Math.max(0, Math.min(1, conv * 1.4 - i * 0.12));
      sn.tubeMat.opacity = 0.15 + reach * 0.72;
      const u = ((now * 0.75 + i * 0.25) % 1) * Math.max(0.05, reach);
      sn.curve.getPoint(u, sn.orbMesh.position);
      sn.orbMesh.visible = reach > 0.05;
    });

    // Animate Central 3D Gutenberg Bible Codex
    const scale = 0.72 + 0.28 * conv;
    codexGroup.scale.set(scale, scale, scale);
    codexGroup.rotation.y = Math.sin(now * 0.8) * 0.18;
    haloMat.opacity = conv > 0.6 ? (conv - 0.6) * 1.6 : 0;

    // 2D HUD Labels & Surviving Census Inset
    const g = st.g, W = st.w, H = st.h;
    st.begin();

    STREAMS.forEach((s, i) => {
      const sy = 28 + i * 22;
      g.fillStyle = s.css;
      g.font = '700 11px system-ui';
      g.textAlign = 'left';
      g.fillText(lang() === 'en' ? s.en : s.zh, 14, sy);
    });

    const inW = Math.min(188, W * 0.36), inH = 152;
    drawMacroInset(g, W - inW - 12, 14, inW, inH, lang() === 'en' ? 'Gutenberg Census' : '42行圣经 · 存世普查', (gg, x, y, w, h) => {
      const ox = x + 16, oy = y + 34;
      const cols = 18, rows = 10, cell = Math.floor((w - 32) / cols);
      for (let i = 0; i < 180; i++) {
        const c = i % cols, r = Math.floor(i / cols);
        const isSurviving = i < BIBLE_SURVIVING;
        const isVellum = i >= 150;
        gg.fillStyle = isSurviving
          ? (i < BIBLE_VELLUM_COMPLETE ? '#fbbf24' : '#34d399')
          : (isVellum ? 'rgba(245,158,11,0.25)' : 'rgba(148,163,184,0.22)');
        gg.fillRect(ox + c * cell, oy + r * (cell + 1), cell - 1.5, cell - 1.5);
      }
      gg.fillStyle = '#e5dfd5'; gg.font = '700 10px system-ui'; gg.textAlign = 'left';
      gg.fillText(`${BIBLE_PAGES}p · ~${BIBLE_PRINTED} (${BIBLE_PAPER}+${BIBLE_VELLUM})`, ox, oy + rows * (cell + 1) + 14);
      gg.fillStyle = '#34d399';
      gg.fillText(lang() === 'en'
        ? `● ${BIBLE_SURVIVING} surviving (${BIBLE_VELLUM_COMPLETE} complete vellum)`
        : `● 存世 ~${BIBLE_SURVIVING} 部（含羊皮完本 ${BIBLE_VELLUM_COMPLETE} 部）`, ox, oy + rows * (cell + 1) + 28);
    });

    g.fillStyle = '#e5dfd5'; g.font = '600 11px system-ui'; g.textAlign = 'left';
    g.fillText(`${BIBLE_PAGES}p · ${BIBLE_PRINTED} (${BIBLE_PAPER} paper + ${BIBLE_VELLUM} vellum) → ${BIBLE_SURVIVING} survive`, 14, H - 12);
    st.end();
  });

  return {
    mount() {},
    rerender() {
      btn.textContent = t('g4.converge');
      stats.textContent = t('g4.stats');
    },
    onShow() { autoTimer = 0.5; runConverge(false); loop.start(); },
    onHide() { loop.stop(); },
  };
}
