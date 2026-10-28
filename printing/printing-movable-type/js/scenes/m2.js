// printing-movable-type/js/scenes/m2.js — M2 排版印刷循环（Three.js 3D 松脂蜡固版、平木板砥平与双版齿轮式交替换位）
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
  roundRect,
} from '../../../../common/js/printing/sceneKit.js';

const LINE = ['活', '字', '循', '环', '印', '一', '万', '次'];
const PHASES = ['place', 'heat', 'print', 'dismantle'];

export function create(root, kit) {
  const { t, lang } = kit;
  const st = stage3d(root, { height: 260, camPos: [0, 3.8, 5.1], camTarget: [0, 0.15, 0] });

  const bar = document.createElement('div');
  bar.className = 'steps';
  const btns = PHASES.map((p) => {
    const b = document.createElement('button');
    b.textContent = t('m2.' + p);
    b.addEventListener('click', () => { autoTimer = -5; run(p, true); });
    bar.appendChild(b);
    return b;
  });
  root.appendChild(bar);

  const read = document.createElement('div');
  read.className = 'readout';
  read.innerHTML = `<span id="mt-lbl-c">${t('m2.cycles')}: <b id="mt-cycles">0</b></span>
    <span id="mt-lbl-a">${t('m2.boardA')}: <b id="mt-a">—</b></span>
    <span id="mt-lbl-b">${t('m2.boardB')}: <b id="mt-b">—</b></span>`;
  root.appendChild(read);

  // ── Helper to build one 3D Iron Plate + Pine-Resin/Wax Bed + 8 Terracotta Types ──
  function buildIronBoard() {
    const group = new THREE.Group();

    // Cast-iron plate & frame
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x3b424a, roughness: 0.45, metalness: 0.78 });
    const plate = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.12, 1.15), ironMat);
    plate.position.y = 0.06;
    plate.castShadow = true;
    plate.receiveShadow = true;
    group.add(plate);

    // Iron chase rim (铁范)
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x525b66, roughness: 0.38, metalness: 0.82 });
    const rimF = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.18, 0.08), rimMat);
    rimF.position.set(0, 0.16, 0.53);
    const rimB = rimF.clone();
    rimB.position.z = -0.53;
    const rimL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 1.0), rimMat);
    rimL.position.set(-1.13, 0.16, 0);
    const rimR = rimL.clone();
    rimR.position.x = 1.13;
    group.add(rimF, rimB, rimL, rimR);

    // Pine-resin + wax + paper-ash layer (松脂蜡药剂层)
    const waxMat = new THREE.MeshStandardMaterial({
      color: 0xc8a464,
      roughness: 0.5,
      metalness: 0.1,
      emissive: 0xd97706,
      emissiveIntensity: 0,
    });
    const waxBed = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.07, 0.96), waxMat);
    waxBed.position.y = 0.14;
    group.add(waxBed);

    // 8 Terracotta movable-type blocks (4×2 grid inside iron frame)
    const types = LINE.map((ch, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const tb = createMovableType3D(ch, { size: 0.34, height: 0.38, materialType: 'clay' });
      tb.children.forEach((m) => {
        if (m.material && m.material.color) m.material.color.setHex(0x9e4726);
      });
      tb.position.set(-0.69 + col * 0.46, 0.16, -0.22 + row * 0.44);
      group.add(tb);
      return tb;
    });

    return { group, waxMat, types };
  }

  const boards = [buildIronBoard(), buildIronBoard()];
  st.world.add(boards[0].group, boards[1].group);

  // ── 3D Charcoal Brazier under Primary Workstation (Left X = -1.35) ──
  const brazierGroup = new THREE.Group();
  brazierGroup.position.set(-1.35, 0.02, 0);
  st.world.add(brazierGroup);

  const fireLight = new THREE.PointLight(0xff6b1a, 0, 3.5);
  fireLight.position.set(0, 0.25, 0);
  brazierGroup.add(fireLight);

  const emberMat = new THREE.MeshBasicMaterial({ color: 0xff5a1f, transparent: true, opacity: 0 });
  const emberMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.05, 20), emberMat);
  brazierGroup.add(emberMesh);

  // ── 3D Wooden Planer Board (平木板砥平) above Primary Workstation ──
  const planerBoard = new THREE.Mesh(
    new THREE.BoxGeometry(2.15, 0.11, 0.96),
    new THREE.MeshStandardMaterial({ color: 0x8c5d32, roughness: 0.62, metalness: 0.05 })
  );
  planerBoard.position.set(-1.35, 1.1, 0);
  planerBoard.castShadow = true;
  planerBoard.visible = false;
  st.world.add(planerBoard);

  // ── 3D Xuan Paper Sheet for Printing Phase ──
  const paperSheet = createDeformablePaper3D(2.15, 0.98, 20, 12, '活字循环 印一万次');
  paperSheet.position.set(-1.35, 0.95, 0);
  paperSheet.visible = false;
  st.world.add(paperSheet);

  let phase = 0;           // 0 排 1 固 2 印 3 拆
  let placed = 0;
  let cycles = 0;
  let activeBoard = 0;     // 0=A at primary station (-1.35), 1=B at primary station
  let swapK = 0;
  let heatK = 0, flattenK = 0, printK = 0, dustK = 0;
  let busy = false;
  let autoTimer = 0;

  function syncLabels() {
    btns.forEach((b, j) => b.classList.toggle('on', j === phase));
    const isEn = lang() === 'en';
    const stCompose = isEn ? 'Typesetting' : '排版固版';
    const stPrint = isEn ? 'Printing' : '交替刷印';
    read.querySelector('#mt-a').textContent = activeBoard === 0 ? stCompose : stPrint;
    read.querySelector('#mt-b').textContent = activeBoard === 0 ? stPrint : stCompose;
    read.querySelector('#mt-cycles').textContent = String(cycles);
  }

  async function run(p, withSound = false) {
    if (busy) return;
    busy = true;
    phase = PHASES.indexOf(p);
    kit.step(phase);
    syncLabels();

    if (p === 'place') {
      placed = 0; heatK = 0; flattenK = 0; printK = 0; dustK = 0;
      st.orbit.setPose({ theta: -0.18, phi: 0.92, radius: 5.0, target: [-0.4, 0.2, 0] });
      for (let i = 0; i < LINE.length; i++) {
        placed = i + 1;
        if (withSound && i % 2 === 0) sound.play('tick');
        await tween(95, () => {});
      }
    } else if (p === 'heat') {
      placed = LINE.length; printK = 0; dustK = 0;
      if (withSound) sound.play('pour');
      st.orbit.setPose({ theta: -0.05, phi: 0.98, radius: 4.9, target: [-0.6, 0.25, 0] });
      await tween(720, (e) => { heatK = e; });
      await tween(480, (e) => { flattenK = e; });
    } else if (p === 'print') {
      placed = LINE.length; heatK = 1; flattenK = 1; dustK = 0;
      if (withSound) sound.play('thud');
      st.orbit.setPose({ theta: 0.12, phi: 0.88, radius: 5.1, target: [-0.3, 0.3, 0] });
      await tween(760, (e) => { printK = e; });
    } else {
      placed = LINE.length;
      if (withSound) sound.play('paper');
      st.orbit.setPose({ theta: 0.0, phi: 0.84, radius: 5.4, target: [0, 0.2, 0] });
      await tween(620, (e) => { dustK = e; });
      // Dual-plate 3D elliptical gear swap
      await tween(700, (e) => { swapK = e; });
      cycles += 1;
      activeBoard = 1 - activeBoard;
      swapK = 0; heatK = 0; flattenK = 0; printK = 0; dustK = 0; placed = 0;
      syncLabels();
      if (withSound) sound.play('pop');
    }
    busy = false;
  }

  const loop = makeLoop((dt, now) => {
    if (!busy) {
      autoTimer += dt;
      if (autoTimer > 0.38) {
        autoTimer = 0;
        const nextP = placed === 0 ? 'place' : PHASES[(phase + 1) % PHASES.length];
        run(nextP, false);
      }
    }

    // Position the two 3D iron boards along an elliptical 3D swap orbit
    const slot0X = -1.35, slot1X = 1.35;
    for (let b = 0; b < 2; b++) {
      const brd = boards[b];
      const isPrimary = (b === activeBoard);
      const fromX = isPrimary ? slot0X : slot1X;
      const toX = isPrimary ? slot1X : slot0X;
      const bx = fromX + (toX - fromX) * swapK;
      const bz = (isPrimary ? 1 : -1) * Math.sin(swapK * Math.PI) * 0.85;
      const by = 0.08 + Math.sin(swapK * Math.PI) * 0.12;
      brd.group.position.set(bx, by, bz);

      // Wax heating glow
      const isHeating = isPrimary && (phase === 1 || (phase === 3 && dustK > 0));
      const glowAmt = isHeating ? Math.sin((phase === 1 ? heatK : dustK) * Math.PI) : 0;
      brd.waxMat.emissiveIntensity = glowAmt * 0.85;

      // Update movable types on this board
      const count = isPrimary ? placed : LINE.length;
      brd.types.forEach((tb, i) => {
        tb.visible = i < count;
        if (!tb.visible) return;
        const uneven = isPrimary && flattenK < 1 ? ((i % 2 ? 0.065 : -0.045) * (1 - flattenK)) : 0;
        const liftOff = isPrimary && phase === 3 ? dustK * (0.28 + (i % 3) * 0.08) : 0;
        tb.position.y = 0.16 + uneven + liftOff;
      });
    }

    // Charcoal brazier & wooden leveling board in phase 1
    const fireGlow = phase === 1 ? Math.sin(heatK * Math.PI) : 0;
    fireLight.intensity = fireGlow * 3.2;
    emberMat.opacity = fireGlow * 0.85;

    planerBoard.visible = phase === 1 && flattenK > 0.02;
    if (planerBoard.visible) {
      const pressDip = Math.sin(flattenK * Math.PI);
      planerBoard.position.y = 0.88 - pressDip * 0.30;
    }

    // Xuan paper printing sheet in phase 2
    paperSheet.visible = phase === 2 && printK > 0.02;
    if (paperSheet.visible) {
      const downUp = printK < 0.45 ? printK / 0.45 : 1;
      const peel = printK > 0.45 ? (printK - 0.45) / 0.55 : 0;
      paperSheet.position.y = 0.85 - downUp * 0.27 + peel * 0.22;
      paperSheet.setDeform({ peel: peel * 0.65, press: downUp * (1 - peel) });
    }

    // 2D HUD & Macro Inset ("药剂固版 · 压平如砥")
    const g = st.g, W = st.w, H = st.h;
    st.begin();

    const inW = Math.min(184, W * 0.35), inH = 148;
    drawMacroInset(g, W - inW - 12, 14, inW, inH, lang() === 'en' ? 'Resin-Wax Locking' : '药剂固版 · 压平如砥', (gg, x, y, w, h) => {
      const cy = y + h * 0.64;
      gg.fillStyle = '#495057';
      gg.fillRect(x + 14, cy + 12, w - 28, 12);
      const melted = phase === 1 || phase === 3;
      gg.fillStyle = melted ? 'rgba(245,158,11,0.85)' : 'rgba(180,150,105,0.85)';
      gg.fillRect(x + 14, cy - 2, w - 28, 14);
      const leveled = phase >= 1 ? Math.max(flattenK, phase === 2 ? 1 : 0) : 0;
      [-42, -14, 14, 42].forEach((ox, idx) => {
        const rawOff = (idx % 2 ? -5 : 4) * (1 - leveled);
        const tx = x + w / 2 + ox - 10;
        const ty = cy - 24 + rawOff;
        gg.fillStyle = '#9e4726';
        roundRect(gg, tx, ty, 20, 26, 2); gg.fill();
        gg.fillStyle = '#fffdf7';
        gg.font = "700 11px 'Noto Sans SC', serif";
        gg.textAlign = 'center'; gg.textBaseline = 'middle';
        gg.fillText(LINE[idx], tx + 10, ty + 11);
      });
      gg.strokeStyle = '#34d399';
      gg.setLineDash([3, 2]);
      gg.beginPath(); gg.moveTo(x + 14, cy - 24); gg.lineTo(x + w - 14, cy - 24); gg.stroke();
      gg.setLineDash([]);
      gg.fillStyle = '#d8d0c5';
      gg.font = '10px system-ui';
      gg.textAlign = 'center';
      gg.fillText(lang() === 'en' ? 'Warm to lock & level · Rewarm to release' : '微火熔药压平 · 印毕再烘拆字', x + w / 2, y + h - 9);
    });

    st.end();
  });

  return {
    mount() { syncLabels(); },
    rerender() {
      PHASES.forEach((p, i) => { if (btns[i]) btns[i].textContent = t('m2.' + p); });
      syncLabels();
    },
    onShow() { autoTimer = 0; run('place', false); loop.start(); },
    onHide() { loop.stop(); },
  };
}
