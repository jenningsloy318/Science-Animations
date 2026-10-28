// printing-digital/js/scenes/d4.js — D4 王选的跨越（Three.js 3D 贝塞尔矢量轮廓+笔画主干收拢、激光栅格扫描与铅字架退场）
'use strict';

import {
  THREE,
  stage3d,
  makeLoop,
  sound,
  createReliefPlate3D,
  roundRect,
  drawMacroInset,
} from '../../../../common/js/printing/sceneKit.js';
import { libraryRatio } from '../model/glyphSize.js';
import { WANG_MODEL_YEAR, HUAGUANG_PROOF_YEAR, BYE_LEAD_YEAR } from '../facts.js';

export function create(root, kit) {
  const { t, lang } = kit;
  const st = stage3d(root, { height: 265, camPos: [0, 3.1, 5.3], camTarget: [-0.35, 0.45, 0] });

  const p = { chars: 7000, sizes: 16, fonts: 4 };
  const sliders = [
    ['d4.slider.chars', 'chars', 1000, 20000, 1000],
    ['d4.slider.sizes', 'sizes', 1, 32, 1],
    ['d4.slider.fonts', 'fonts', 1, 8, 1],
  ].map(([key, prop, min, max, step]) => {
    const row = document.createElement('div');
    row.className = 'slider-row';
    const lb = document.createElement('span'); lb.textContent = t(key);
    const input = document.createElement('input');
    input.type = 'range'; input.min = min; input.max = max; input.step = step; input.value = p[prop];
    const val = document.createElement('span'); val.className = 'val'; val.textContent = p[prop];
    input.addEventListener('input', () => {
      p[prop] = Number(input.value);
      val.textContent = String(p[prop]);
      update();
      sound.play('tick');
    });
    row.append(lb, input, val);
    root.appendChild(row);
    return { input, val };
  });

  const read = document.createElement('div');
  read.className = 'readout';
  read.innerHTML = `<span>${t('d4.model')}: <b id="dg-ratio">—</b></span>
    <span style="color:#8d6e63">${t('d4.certified')}</span>`;
  root.appendChild(read);

  const echo = document.createElement('div');
  echo.className = 'card';
  echo.textContent = t('d4.echo');
  root.appendChild(echo);

  function update() {
    const r = libraryRatio({ ...p });
    const fmt = (n) => n > 1e9 ? (n / 1e9).toFixed(2) + ' GB' : (n / 1e6).toFixed(1) + ' MB';
    const el = read.querySelector('#dg-ratio');
    if (el) {
      el.innerHTML = `${r.ratio.toFixed(0)}× <span style="font-weight:400;font-size:11px">(${fmt(r.bitmapBytes)} → ${fmt(r.outlineBytes)})</span>`;
    }
  }
  update();

  // ── 1. Central 3D Vector Glyph Plate ('印') + 3D Bézier Control Handles + Laser Scan Beam ──
  const vectorGroup = new THREE.Group();
  vectorGroup.position.set(-0.55, 0.05, 0);
  st.world.add(vectorGroup);

  const glyphPlate = createReliefPlate3D('印', {
    width: 1.65,
    depth: 1.65,
    thickness: 0.14,
    reliefHeight: 0.06,
    mirror: false,
    type: 'metal',
  });
  vectorGroup.add(glyphPlate);

  // 6 3D Bézier Anchor Cubes (Cyan) + Tangent Control Handle Spheres (Pink)
  const anchorsDef = [
    [-0.55, -0.55, -0.85, -0.75],
    [0.55, -0.55, 0.85, -0.35],
    [0.58, 0.55, 0.88, 0.78],
    [-0.58, 0.55, -0.88, 0.35],
    [-0.25, 0.0, -0.65, -0.15],
    [0.25, 0.0, 0.65, 0.15],
  ];
  const anchorNodes = anchorsDef.map(([ax, az, hx, hz]) => {
    const anchorBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.09, 0.09),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    const handleSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xf472b6 })
    );
    vectorGroup.add(anchorBox, handleSphere);
    return { anchorBox, handleSphere, ax, az, hx, hz };
  });

  // 3D Red RIP Laser Scanline Bar sweeping across the 3D Glyph
  const scanBeam = new THREE.Mesh(
    new THREE.BoxGeometry(1.72, 0.035, 0.045),
    new THREE.MeshBasicMaterial({ color: 0xf43f5e })
  );
  scanBeam.position.y = 0.24;
  vectorGroup.add(scanBeam);

  // ── 2. Retiring 3D Wooden Lead-Type Racks sliding out to the right ("告别铅与火") ──
  const oldRackGroup = new THREE.Group();
  const rackWoodMat = new THREE.MeshStandardMaterial({ color: 0x8d5b32, roughness: 0.72 });
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.35, 0.22), rackWoodMat);
    m.position.set((i % 2) * 0.28, 0.18, Math.floor(i / 2) * 0.28 - 0.28);
    m.castShadow = true;
    oldRackGroup.add(m);
  }
  oldRackGroup.position.set(0.75, 0, -0.15);
  st.world.add(oldRackGroup);

  let cycleT = 0;

  const loop = makeLoop((dt, now) => {
    cycleT = (cycleT + dt * 0.22) % 1;
    const conv = Math.min(1, cycleT / 0.68);
    const ease = 1 - Math.pow(1 - conv, 3);
    const stepIdx = Math.min(4, Math.floor(conv * 5));
    kit.step(stepIdx);

    // 1. Converge 3D Bézier Control Handles from scattered cloud onto the 3D '印' Outline
    const spread = (1 - ease) * 0.95;
    anchorNodes.forEach((n, idx) => {
      const wob = Math.sin(now * 2 + idx) * spread;
      n.anchorBox.position.set(n.ax * (1 + spread * 0.6), 0.24 + spread * 0.5, n.az * (1 + spread * 0.6));
      n.handleSphere.position.set(n.hx + wob, 0.28 + spread * 0.75, n.hz - wob);
    });

    // 2. Sweep 3D RIP Laser Scanline across the character
    scanBeam.visible = ease > 0.32 && ease < 0.96;
    if (scanBeam.visible) {
      const scanP = (ease - 0.32) / 0.64;
      scanBeam.position.z = -0.75 + scanP * 1.5;
    }

    // 3. Slide old 3D Lead-Type Rack away into the background
    oldRackGroup.position.x = 0.65 + ease * 1.15;

    // 2D HUD Timeline & 500:1 Compression Macro Inset
    const g = st.g, W = st.w, H = st.h;
    st.begin();
    const isEn = lang() === 'en';

    g.fillStyle = 'rgba(226, 232, 240, 0.92)';
    g.font = '600 10.5px system-ui';
    g.textAlign = 'left';
    g.fillText(
      isEn
        ? `${WANG_MODEL_YEAR} Prototype · ${HUAGUANG_PROOF_YEAR} First Newspaper Proof · ${BYE_LEAD_YEAR} Farewell to Lead & Fire`
        : `${WANG_MODEL_YEAR} 原理性样机 · ${HUAGUANG_PROOF_YEAR} 首张整版报样 · ${BYE_LEAD_YEAR} 告别铅与火`,
      16, H - 12
    );

    const mw = 142, mh = 138;
    drawMacroInset(g, W - mw - 10, 16, mw, mh, isEn ? 'Outline + Stems (~500:1)' : '轮廓+规则笔画压缩', (mg, iw) => {
      mg.fillStyle = 'rgba(30, 41, 59, 0.9)';
      roundRect(mg, 10, 12, 52, 52, 4); mg.fill();
      mg.fillStyle = '#94a3b8';
      for (let r = 1; r < 6; r++) {
        for (let c = 1; c < 6; c++) {
          if (r === 1 || c === 3 || (r === 3 && c >= 2)) {
            mg.fillRect(12 + c * 7.5, 14 + r * 7.5, 6, 6);
          }
        }
      }

      mg.fillStyle = 'rgba(30, 41, 59, 0.9)';
      roundRect(mg, iw - 62, 12, 52, 52, 4); mg.fill();
      mg.strokeStyle = '#38bdf8';
      mg.lineWidth = 2;
      mg.strokeRect(iw - 52, 22, 32, 8);
      mg.strokeRect(iw - 39, 22, 8, 34);
      mg.fillStyle = '#fbbf24';
      mg.fillRect(iw - 54, 20, 4, 4);
      mg.fillRect(iw - 22, 20, 4, 4);
      mg.fillRect(iw - 33, 54, 4, 4);

      mg.fillStyle = '#f8fafc';
      mg.font = '9px system-ui';
      mg.textAlign = 'center';
      mg.fillText(isEn ? 'Bitmap' : '点阵 ~1GB', 36, 78);
      mg.fillStyle = '#38bdf8';
      mg.fillText(isEn ? 'Vector' : '轮廓 ~2MB', iw - 36, 78);

      mg.fillStyle = '#fbbf24';
      mg.font = '700 9.5px system-ui';
      mg.fillText(isEn ? '500 : 1 Compression' : '王选 ~500:1 高倍信息压缩', iw / 2, 102);
    });

    st.end();
  });

  return {
    mount() {},
    onShow() { loop.start(); },
    onHide() { loop.stop(); },
  };
}
