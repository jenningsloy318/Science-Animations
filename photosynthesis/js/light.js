// ═══════════════════════════════════════════════════════
// light.js — ③ 光反应 + 拼糖：一台完整的机器（一个场景）
// 本版重点：把"关联"画出来——
//   · PSII→b6f→PSI→FNR 之间有可见的【电子管道】，电子在管内行走
//   · 电子路过 b6f 时 b6f 闪光泵出 H⁺（因果关系可见）
//   · 类囊体腔画成封闭 H⁺ 池，H⁺ 池经通道流向 ATP 合酶
//   · 左下角【Z 方案能量图】小窗，电子位置实时同步
//   · 面板 ①–⑥ 步骤随事件逐个点亮
// ═══════════════════════════════════════════════════════
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { makeLabel, makeGlowDot } from './sprite.js';
import { KOK_STATES, H_PER_ATP, CALVIN } from './facts.js';

const C = {
  photon: 0xffd54a, electron: 0x7dd3fc, hplus: 0xff6b9d, o2: 0xf4f7fa,
  atp: 0xffa94d, nadph: 0xb197fc, water: 0x69b7ff, membrane: 0xc7a45a,
  psii: 0x3fae6a, psi: 0x2f8f5b, b6f: 0x8d6e63, fnr: 0x6d5bd0,
  co2: 0xaab4c2, adp: 0xc98a45, nadpp: 0x8f7ad0, g3p: 0x4ade80,
};

const RING_C = new THREE.Vector3(12, -7.2, 0);
const RING_R = 2.7;
const A_FIX = Math.PI / 2, A_RED = Math.PI / 2 - 2 * Math.PI / 3, A_REG = Math.PI / 2 + 2 * Math.PI / 3;

export function buildLight() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#060b12');
  const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.1, 300);
  camera.position.set(2, 3.5, 33);

  scene.add(new THREE.AmbientLight('#42506a', 1.0));
  const key = new THREE.DirectionalLight('#fff2d8', 1.4);
  key.position.set(6, 14, 16); scene.add(key);

  const controls = new OrbitControls(camera, document.getElementById('gl'));
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.target.set(4, 0.5, 0);

  // ── 腔（封闭 H⁺ 池）──
  const lumenBg = new THREE.Mesh(new THREE.PlaneGeometry(46, 3.6),
    new THREE.MeshBasicMaterial({ color: '#0d1f38', transparent: true, opacity: 0.9 }));
  lumenBg.position.set(-4, -1.7, -1.5); scene.add(lumenBg);
  const lumenFrame = new THREE.Mesh(new THREE.BoxGeometry(46, 3.6, 0.04),
    new THREE.MeshBasicMaterial({ color: '#1d3a5f', transparent: true, opacity: 0.7 }));
  lumenFrame.position.set(-4, -1.7, -1.4); scene.add(lumenFrame);
  const lumenLabel = makeLabel('类囊体腔 = H⁺ 池（越满电越足）', '#7db4d8');
  lumenLabel.position.set(-13.5, -3.6, 0); scene.add(lumenLabel);

  // H⁺ 池 → ATP 合酶的流向箭头
  const flowLine = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.06, 0.04),
    new THREE.MeshBasicMaterial({ color: 0xff6b9d, transparent: true, opacity: 0.65 }));
  flowLine.position.set(2.4, -1.35, 0.3); scene.add(flowLine);
  const flowArrow = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.36, 8),
    new THREE.MeshBasicMaterial({ color: 0xff6b9d }));
  flowArrow.rotation.z = -Math.PI / 2;
  flowArrow.position.set(4.35, -1.35, 0.3); scene.add(flowArrow);
  const flowLabel = makeLabel('H⁺ 流 → 推转子', '#ff9ec4');
  flowLabel.scale.multiplyScalar(0.55);
  flowLabel.position.set(2.2, -2.6, 0.3); scene.add(flowLabel);

  // ── 类囊体膜 ──
  const membrane = new THREE.Group(); scene.add(membrane);
  const headMat = new THREE.MeshStandardMaterial({ color: C.membrane, roughness: 0.55, emissive: '#4a3a12', emissiveIntensity: 0.4 });
  for (const y of [0.42, -0.42]) {
    const layer = new THREE.Mesh(new THREE.BoxGeometry(56, 0.3, 1.6), headMat);
    layer.position.set(-6, y, 0); membrane.add(layer);
  }
  const core = new THREE.Mesh(new THREE.BoxGeometry(56, 0.5, 1.4),
    new THREE.MeshStandardMaterial({ color: '#6e5a28', roughness: 0.8 }));
  core.position.x = -6; membrane.add(core);

  // ── 膜上部件 ──
  function blob(x, w, h, color, y = 0) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(1, 26, 18),
      new THREE.MeshStandardMaterial({ color, roughness: 0.42, emissive: color, emissiveIntensity: 0.18 }));
    m.scale.set(w, h, 1.15); m.position.set(x, y, 0);
    scene.add(m); return m;
  }
  const psii = blob(-8.2, 2.1, 2.6, C.psii);
  const b6f = blob(0, 1.7, 2.2, C.b6f);
  const psi = blob(7.2, 1.9, 2.4, C.psi);
  const fnr = blob(10.7, 1.1, 1.1, C.fnr, 2.35);

  for (let i = 0; i < 7; i++) {
    const a = makeGlowDot(0.16, 0x66d98f);
    const ang = Math.PI * (0.15 + 0.7 * i / 6);
    a.position.set(-8.2 + Math.cos(ang) * 2.35, Math.sin(ang) * 2.9, 0);
    scene.add(a);
  }
  for (let i = 0; i < 6; i++) {
    const a = makeGlowDot(0.14, 0x66d98f);
    const ang = Math.PI * (0.12 + 0.76 * i / 5);
    a.position.set(7.2 + Math.cos(ang) * 2.1, Math.sin(ang) * 2.7, 0);
    scene.add(a);
  }

  // ── 电子管道（关联可见！）──
  const pipeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-8.2, 1.35, 0),
    new THREE.Vector3(-4.5, 1.95, 0),
    new THREE.Vector3(0, 1.45, 0),
    new THREE.Vector3(3.6, 1.95, 0),
    new THREE.Vector3(7.2, 1.35, 0),
    new THREE.Vector3(9.3, 1.95, 0),
    new THREE.Vector3(10.6, 2.3, 0),
  ]);
  const pipe = new THREE.Mesh(
    new THREE.TubeGeometry(pipeCurve, 72, 0.085, 8),
    new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.30 }));
  scene.add(pipe);
  // 方向箭头
  [0.14, 0.5, 0.86].forEach(u => {
    const p = pipeCurve.getPointAt(u);
    const t = pipeCurve.getTangentAt(u);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.32, 8),
      new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.85 }));
    cone.position.copy(p);
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), t.clone().normalize());
    scene.add(cone);
  });
  // 曲线上 b6f / PSI 的参数位置
  function uAtX(xTarget) {
    let best = 0, bd = 1e9;
    for (let i = 0; i <= 100; i++) {
      const p = pipeCurve.getPointAt(i / 100);
      const d = Math.abs(p.x - xTarget);
      if (d < bd) { bd = d; best = i / 100; }
    }
    return best;
  }
  const U_B6F = uAtX(0);
  const U_PSI = uAtX(7.2);

  // ── ATP 合酶 ──
  const atpX = 4.6;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.85, 22, 16),
    new THREE.MeshStandardMaterial({ color: 0xd88f3f, roughness: 0.4, emissive: '#7a4a10', emissiveIntensity: 0.35 }));
  knob.position.set(atpX, 1.7, 0); scene.add(knob);
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.35, 10),
    new THREE.MeshStandardMaterial({ color: 0xd88f3f }));
  stalk.position.set(atpX, 0.75, 0); scene.add(stalk);
  const rotor = new THREE.Group(); rotor.position.set(atpX, -0.62, 0); scene.add(rotor);
  for (let i = 0; i < 8; i++) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.5, 0.2),
      new THREE.MeshStandardMaterial({ color: 0xc98a45, roughness: 0.5 }));
    const a = i / 8 * Math.PI * 2;
    seg.position.set(Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42);
    seg.rotation.y = -a; rotor.add(seg);
  }

  // ── 标签 ──
  const labelsOn = { v: true };
  function partLabel(text, color, x, y) {
    const l = makeLabel(text, color); l.position.set(x, y, 0); scene.add(l); return l;
  }
  const lblTitle = partLabel('上半 · 光反应：把光装进电池，顺便放出氧气', '#9ff0b5', -8, 5.4);
  const lblPsii = partLabel('PSII（分解水）', '#8af0ae', -8.2, 3.4);
  const lblB6f = partLabel('b6f（e⁻ 路过 → 泵 H⁺）', '#d7b8a8', 0, 2.6);
  const lblPsi = partLabel('PSI · 光系统 I（第 2 次充电）', '#8af0ae', 7.2, 3.4);
  const lblFnr = partLabel('FNR（装电池）→ NADPH', '#cdb4ff', 12.0, 3.7);
  const atpLabel = partLabel('ATP 合酶', '#ffc078', atpX - 2.6, 3.1);
  const pipeLabel = makeLabel('电子管道：e⁻ 沿管走', '#a5e3ff');
  pipeLabel.scale.multiplyScalar(0.6);
  pipeLabel.position.set(-4.8, 2.75, 0); scene.add(pipeLabel);
  const labels = [lumenLabel, flowLabel, lblTitle, lblPsii, lblB6f, lblPsi, lblFnr, atpLabel, pipeLabel];

  // ── 卡尔文环 ──
  const ringGrp = new THREE.Group(); ringGrp.position.copy(RING_C); ringGrp.scale.setScalar(0.62); scene.add(ringGrp);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(RING_R / 0.62, 0.16, 12, 80),
    new THREE.MeshStandardMaterial({ color: '#2a4a38', roughness: 0.5, emissive: '#0c2417', emissiveIntensity: 0.7 }));
  ringGrp.add(ring);
  const ringStations = [];
  [[A_FIX, '① 固定 · RuBisCO 抓 CO₂', '#8af0ae'], [A_RED, '② 还原 · 花 3ATP+2NADPH', '#cdb4ff'], [A_REG, '③ 再生 · RuBP 回位', '#7dd3fc']].forEach(([ang, txt, col]) => {
    const pos = new THREE.Vector3(Math.cos(ang) * (RING_R / 0.62), Math.sin(ang) * (RING_R / 0.62), 0);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.3, 20),
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, transparent: true, opacity: 0.3, emissive: col, emissiveIntensity: 0.3 }));
    pad.position.copy(pos); ringGrp.add(pad);
    const l = makeLabel(txt, '#eaf4ec'); l.scale.multiplyScalar(0.62);
    l.position.copy(pos).add(new THREE.Vector3(0, 1.5, 0));
    ringGrp.add(l); ringStations.push({ pad, l });
  });
  const lblRing = partLabel('下半 · 拼糖循环：花电池，把 CO₂ 拼成糖', '#9ff0b5', RING_C.x + 2.4, RING_C.y + 4.6);
  const sugarLabel = partLabel('🍬 糖出厂（食物）', '#dbe86a', RING_C.x + 0.4, RING_C.y - 4.4);
  const lblShuttle = partLabel('满电池 ↓ 送去拼糖', '#ffc078', 7.6, -4.6);
  const lblReturn = partLabel('↑ 空电池回膜上再充电', '#c98a45', 7.8, -6.2);
  labels.push(lblRing, sugarLabel, lblShuttle, lblReturn, ...ringStations.map(s => s.l));

  // ── 电池库存 ──
  const atpStack = new THREE.Group(); atpStack.position.set(RING_C.x + 3.6, RING_C.y - 1.2, 0); scene.add(atpStack);
  const nadphStack = new THREE.Group(); nadphStack.position.set(RING_C.x - 3.6, RING_C.y - 1.2, 0); scene.add(nadphStack);
  const batLabel = partLabel('电池库存（满）', '#ffc078', RING_C.x, RING_C.y + 1.4);
  labels.push(batLabel);

  // ── 传递标签 ──
  function transferTag(text, color, x, y) {
    const l = makeLabel(text, color);
    l.scale.multiplyScalar(0.62);
    l.position.set(x, y, 0.4);
    scene.add(l); labels.push(l);
    return l;
  }
  transferTag('光子 = 能量包裹', '#ffd54a', -6.4, 7.2);
  transferTag('H⁺ 泵入腔', '#ff6b9d', 0.2, -0.75);
  transferTag('H⁺ 分解水放出', '#ff6b9d', -9.6, -1.9);
  transferTag('水', '#69b7ff', -10.6, -1.0);

  // ── 点击说明 ──
  const ray = new THREE.Raycaster();
  const clickable = [
    { mesh: psii, text: 'PSII（P680）：吸收光子后从水里夺电子——水被拆成 O₂ + H⁺ + e⁻。' },
    { mesh: b6f, text: 'b6f：e⁻ 路过它时，它把 H⁺ 从基质泵进腔——它不产电池，它造"水位差"。' },
    { mesh: psi, text: 'PSI（P700）：电子到这里已经没劲了，第二个光子把它再顶上去（第 2 次充电）。' },
    { mesh: fnr, text: 'FNR：装电池的酶——把 2 个电子和 H⁺ 装进 NADP⁺，做出满格充电宝 NADPH。' },
    { mesh: knob, text: 'ATP 合酶：H⁺ 池里的 H⁺ 顺水位差涌出，转子每转一圈（14 H⁺）合成 3 个 ATP。' },
  ];
  const infoDiv = document.createElement('p');
  infoDiv.id = 'lightInfo';
  infoDiv.style.cssText = 'font-size:12px;color:#ffd54a;min-height:2.4em;border-top:1px dashed var(--line);padding-top:6px';
  infoDiv.textContent = '点击膜上部件看说明 ↗';
  document.querySelector('[data-panel="light"]').appendChild(infoDiv);
  const canvasEl = document.getElementById('gl');
  canvasEl.addEventListener('pointerdown', (e) => {
    if (document.body.dataset.view !== 'light') return;
    const r = canvasEl.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    const hit = ray.intersectObjects(clickable.map(c => c.mesh), false)[0];
    if (hit) infoDiv.textContent = '💡 ' + clickable.find(c => c.mesh === hit.object).text;
  });

  // ── 步骤同步 ──
  const stepEls = [...document.querySelectorAll('#stepList [data-step]')];
  function step(n) {
    stepEls.forEach(el => el.classList.toggle('cur', +el.dataset.step === n));
  }

  // ── Z 方案小窗 ──
  const zc = document.getElementById('zscheme');
  const zctx = zc.getContext('2d');
  const Z_PTS = [
    [0.04, 0.78], [0.09, 0.10], [0.36, 0.62], [0.43, 0.72],
    [0.60, 0.12], [0.78, 0.64], [0.95, 0.82],
  ]; // x=进程, y=能量(canvas 系，小=高能)
  const Z_LABELS = [
    [0.09, 0.10, 'P680* 第一次充电', '#ffd54a'],
    [0.36, 0.62, '沿链下行 · 泵 H⁺', '#7dd3fc'],
    [0.43, 0.72, 'b6f', '#d7b8a8'],
    [0.60, 0.12, 'P700* 第二次充电', '#ffd54a'],
    [0.80, 0.64, 'Fd', '#9ae6b8'],
    [0.95, 0.82, 'NADPH', '#b197fc'],
  ];
  function drawChart(markerS) {
    const W = zc.width, H = zc.height;
    zctx.clearRect(0, 0, W, H);
    zctx.fillStyle = 'rgba(10,16,28,0.0)';
    zctx.fillRect(0, 0, W, H);
    zctx.strokeStyle = 'rgba(255,255,255,0.25)';
    zctx.strokeRect(6.5, 6.5, W - 13, H - 13);
    zctx.font = 'bold 13px "PingFang SC", sans-serif';
    zctx.fillStyle = '#9ff0b5';
    zctx.fillText('Z 方案：电子的两次充电之旅', 16, 24);
    // 路径
    zctx.strokeStyle = '#e8b84b'; zctx.lineWidth = 2.5;
    zctx.beginPath();
    Z_PTS.forEach(([x, y], i) => {
      const px = 14 + x * (W - 28), py = 30 + y * (H - 62);
      i ? zctx.lineTo(px, py) : zctx.moveTo(px, py);
    });
    zctx.stroke();
    // 光子闪电标记
    [[0.09, 0.10], [0.60, 0.12]].forEach(([x, y]) => {
      const px = 14 + x * (W - 28), py = 30 + y * (H - 62);
      zctx.strokeStyle = '#ffd54a'; zctx.lineWidth = 1.5;
      zctx.beginPath();
      zctx.moveTo(px, py - 20); zctx.lineTo(px - 3, py - 10); zctx.lineTo(px + 3, py - 10); zctx.lineTo(px, py);
      zctx.stroke();
    });
    zctx.lineWidth = 1;
    zctx.font = '11px "PingFang SC", sans-serif';
    Z_LABELS.forEach(([x, y, txt, col]) => {
      zctx.fillStyle = col;
      zctx.fillText(txt, 14 + x * (W - 28) - 20, 30 + y * (H - 62) + (y > 0.5 ? 16 : -10));
    });
    // 电子标记
    if (markerS != null) {
      const s = Math.max(0, Math.min(1, markerS));
      let total = 0; const segs = [];
      for (let i = 1; i < Z_PTS.length; i++) {
        const dx = (Z_PTS[i][0] - Z_PTS[i - 1][0]) * (W - 28);
        const dy = (Z_PTS[i][1] - Z_PTS[i - 1][1]) * (H - 62);
        const L = Math.hypot(dx, dy); segs.push(L); total += L;
      }
      let dist = s * total;
      for (let i = 0; i < segs.length; i++) {
        if (dist <= segs[i]) {
          const k = dist / segs[i];
          const x = Z_PTS[i][0] + (Z_PTS[i + 1][0] - Z_PTS[i][0]) * k;
          const y = Z_PTS[i][1] + (Z_PTS[i + 1][1] - Z_PTS[i][1]) * k;
          const px = 14 + x * (W - 28), py = 30 + y * (H - 62);
          zctx.fillStyle = '#7dd3fc';
          zctx.beginPath(); zctx.arc(px, py, 5, 0, Math.PI * 2); zctx.fill();
          zctx.strokeStyle = 'rgba(125,211,252,0.5)';
          zctx.beginPath(); zctx.arc(px, py, 9, 0, Math.PI * 2); zctx.stroke();
          break;
        }
        dist -= segs[i];
      }
    }
  }

  // ── 状态 ──
  const state = {
    paused: false, speed: 1, lightRate: 1, alt: 0,
    photons: [], electrons: [], hplus: [], hpool: [], o2: [], waters: [],
    fliers: [],
    psiQueue: 0, kokIdx: 1, psiElectronCount: 0,
    lumenH: 8, rotorAngle: 0, atpFrac: 0,
    counts: { o2: 0, nadph: 0, atp: 0 },
    bat: { atp: 0, nadph: 0 },
    turn: null, turnTimer: 2.5, turns: 0, g3p: 0,
    photonTimer: 0, waterTimer: 0,
    zu: null,
  };

  function spawnPhoton(target, kind) {
    const m = makeGlowDot(0.14, C.photon);
    m.position.set(target.x + (Math.random() - 0.5) * 1.6, 9.5 + Math.random() * 2, 0);
    scene.add(m);
    state.photons.push({ mesh: m, tx: target.x, ty: target.y, kind });
    step(1);
  }
  function flier(mesh, target, speed, onArrive) {
    scene.add(mesh);
    state.fliers.push({ mesh, target, speed, onArrive });
  }
  function spawnH(x, y, vy, toLumen) {
    const m = makeGlowDot(0.11, C.hplus);
    m.position.set(x, y, 0); scene.add(m);
    state.hplus.push({ mesh: m, vy, toLumen });
  }

  // ── 电池库存堆 ──
  function restack(group, n, color) {
    while (group.children.length) group.remove(group.children[0]);
    for (let i = 0; i < Math.min(n, 6); i++) {
      const chip = makeGlowDot(0.17, color);
      chip.position.set(0, i * 0.4, 0);
      group.add(chip);
    }
    if (n > 6) {
      const more = makeLabel(`+${n - 6}`, '#dbe4ee'); more.scale.multiplyScalar(0.5);
      more.position.set(0, 2.8, 0); group.add(more);
    }
  }

  // ── H⁺ 池 ──
  function addHToPool(x) {
    state.lumenH++;
    if (state.hpool.length < 14) {
      const d = makeGlowDot(0.12, C.hplus);
      d.position.set(x + (Math.random() - 0.5) * 1.2, -1.15 - Math.random() * 1.6, 0);
      d.userData.baseY = d.position.y;
      scene.add(d);
      state.hpool.push(d);
    }
  }
  function takeHFromPool() {
    const d = state.hpool.pop();
    if (d) { d.userData.baseY = null; scene.remove(d); }
    state.lumenH = Math.max(0, state.lumenH - 1);
  }

  // ── 卡尔文一轮 ──
  function startTurn() {
    if (state.bat.atp < CALVIN.atpPerCO2 || state.bat.nadph < CALVIN.nadphPerCO2) return;
    state.bat.atp -= CALVIN.atpPerCO2;
    state.bat.nadph -= CALVIN.nadphPerCO2;
    restack(atpStack, state.bat.atp, C.atp);
    restack(nadphStack, state.bat.nadph, C.nadph);
    state.turns++;
    state.turn = { phase: 'co2', t: 0 };
    const co2 = makeGlowDot(0.2, C.co2);
    flier(co2, RING_C.clone().add(new THREE.Vector3(0, RING_R * 0.62 + 0.3, 0)), 3.2, () => {
      state.turn.phase = 'work'; state.turn.t = 0;
      for (const s of [-0.6, 0.6]) {
        const pga = makeGlowDot(0.13, 0x9fb8c9);
        pga.position.copy(RING_C).add(new THREE.Vector3(s, 0.6, 0));
        flier(pga, RING_C.clone().add(new THREE.Vector3(s * 2.2, -0.6, 0)), 1.6, () => scene.remove(pga));
      }
      for (let i = 0; i < 3; i++) {
        const a = makeGlowDot(0.13, C.adp);
        a.position.copy(RING_C).add(new THREE.Vector3(1.5, 0.5 + i * 0.3, 0));
        flier(a, new THREE.Vector3(atpX + 0.9, 1.6, 0), 2.6, () => scene.remove(a));
      }
      for (let i = 0; i < 2; i++) {
        const n = makeGlowDot(0.13, C.nadpp);
        n.position.copy(RING_C).add(new THREE.Vector3(-1.5, 0.5 + i * 0.3, 0));
        flier(n, new THREE.Vector3(11.0, 2.4, 0), 2.6, () => scene.remove(n));
      }
    });
  }

  // ── HUD ──
  const els = ['hO2', 'hBatAtp', 'hBatNadph', 'hKok', 'hTurns', 'hG3p'].map(id => document.getElementById(id));
  function refreshHUD() {
    els[0].textContent = state.counts.o2;
    els[1].textContent = state.bat.atp;
    els[2].textContent = state.bat.nadph;
    els[3].textContent = KOK_STATES[state.kokIdx] + (state.psiElectronCount % 4 ? `（+${state.psiElectronCount % 4} e⁻）` : '');
    els[4].textContent = state.turns;
    els[5].textContent = state.g3p;
  }

  document.getElementById('bLightPause').addEventListener('click', e => {
    state.paused = !state.paused;
    e.target.textContent = state.paused ? '▶ 继续' : '⏸ 暂停';
    e.target.classList.toggle('on', state.paused);
  });
  document.getElementById('bLabels').addEventListener('click', e => {
    labelsOn.v = !labelsOn.v;
    e.target.classList.toggle('on', labelsOn.v);
    labels.forEach(l => l.visible = labelsOn.v);
  });
  document.getElementById('rLight').addEventListener('input', e => {
    state.lightRate = +e.target.value;
    document.getElementById('oLight').textContent = state.lightRate.toFixed(1) + '×';
  });
  document.getElementById('rSpeed').addEventListener('input', e => {
    state.speed = +e.target.value;
    document.getElementById('oSpeed').textContent = state.speed.toFixed(1) + '×';
  });

  // ── 主更新 ──
  function update(dt0) {
    const dt = state.paused ? 0 : dt0 * state.speed;

    // 光子轮流打入（独立交替位）
    state.photonTimer += dt * state.lightRate;
    while (state.photonTimer > 0.55) {
      state.photonTimer -= 0.55;
      state.alt ^= 1;
      if (state.alt === 0) {
        spawnPhoton({ x: -8.2, y: 1.3 }, 'A');
        // PSII 光子 → 电子上管（A 段：PSII → PSI）
        const m = makeGlowDot(0.15, C.electron);
        m.position.copy(pipeCurve.getPointAt(0));
        scene.add(m);
        state.electrons.push({ mesh: m, u: 0, end: U_PSI, seg: 'A' });
        step(2);
        state.psiElectronCount++;
        state.kokIdx = 1 + (state.psiElectronCount % 4);
        if (state.psiElectronCount % 4 === 0) {
          state.kokIdx = 0;
          const bub = makeGlowDot(0.22, C.o2);
          bub.position.set(-8.2, -1.2, 0); scene.add(bub);
          state.o2.push({ mesh: bub, t: 0 });
          for (let k = 0; k < 4; k++) addHToPool(-8.2);
          state.counts.o2++;
        }
      } else {
        spawnPhoton({ x: 7.2, y: 1.2 }, 'B');
        // PSI 光子 → 第 2 次充电，电子从 PSI 出发走 B 段
        const m = makeGlowDot(0.15, C.electron);
        m.position.copy(pipeCurve.getPointAt(U_PSI));
        scene.add(m);
        state.electrons.push({ mesh: m, u: U_PSI, end: 1.0, seg: 'B' });
        step(5);
      }
    }

    // 光子下落
    for (let i = state.photons.length - 1; i >= 0; i--) {
      const p = state.photons[i];
      const dx = p.tx - p.mesh.position.x, dy = p.ty - p.mesh.position.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.25) { scene.remove(p.mesh); state.photons.splice(i, 1); continue; }
      p.mesh.position.x += dx / d * 7.5 * dt;
      p.mesh.position.y += dy / d * 7.5 * dt;
    }

    // 电子沿管道走
    let zu = null;
    for (let i = state.electrons.length - 1; i >= 0; i--) {
      const e = state.electrons[i];
      const u0 = e.u;
      e.u += 0.22 * dt;
      if (e.u >= e.end) {
        scene.remove(e.mesh); state.electrons.splice(i, 1);
        if (e.seg === 'B') {
          state.psiQueue++;
          if (state.psiQueue >= 2) {
            state.psiQueue = 0;
            spawnH(11.0, 2.0, 1.5, false);
            const chip = makeGlowDot(0.2, C.nadph);
            flier(chip, nadphStack.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 3.0, () => {
              state.bat.nadph++; restack(nadphStack, state.bat.nadph, C.nadph);
            });
            state.counts.nadph++;
            step(6);
          }
        } else {
          // 到 PSI：P700 补位，闪一下
          psi.material.emissiveIntensity = 0.7;
        }
        continue;
      }
      // 路过 b6f：泵 H⁺（因果可见）
      if (e.seg === 'A' && u0 < U_B6F && e.u >= U_B6F) {
        b6f.material.emissiveIntensity = 0.8;
        spawnH(0.2, 0.7, -2.4, true);
        spawnH(-0.3, 0.6, -2.6, true);
        step(3);
      }
      e.mesh.position.copy(pipeCurve.getPointAt(Math.min(e.u, 1)));
      if (e.seg === 'B') zu = Math.max(zu ?? 0, U_PSI + (e.u - U_PSI) / (1 - U_PSI) * 0.28);
      else zu = Math.max(zu ?? 0, e.u / U_PSI * 0.72);
    }
    b6f.material.emissiveIntensity = Math.max(0.18, b6f.material.emissiveIntensity - dt * 1.4);
    psi.material.emissiveIntensity = Math.max(0.18, psi.material.emissiveIntensity - dt * 1.2);
    state.zu = zu;

    // H⁺ 池微动
    const now = performance.now() / 1000;
    state.hpool.forEach((d, i) => {
      d.position.y = d.userData.baseY + Math.sin(now * 2 + i) * 0.07;
    });

    // ATP 合酶：H⁺ 池流出 → 转子 → ATP
    const atpFlow = state.lumenH > 4 ? 2.2 : 1.2;
    state.atpFrac += dt * atpFlow / H_PER_ATP;
    if (state.lumenH > 2 && Math.random() < dt * 1.2) {
      takeHFromPool();
      const m = makeGlowDot(0.11, C.hplus);
      m.position.set(atpX + (Math.random() - 0.5) * 0.3, -0.62, 0.42);
      scene.add(m);
      state.hplus.push({ mesh: m, vy: 1.8, toLumen: false, out: true });
    }
    state.rotorAngle += dt * atpFlow / 14 * Math.PI * 2;
    rotor.rotation.y = state.rotorAngle;
    if (state.atpFrac >= 1) {
      state.atpFrac -= 1;
      const chip = makeGlowDot(0.19, C.atp);
      flier(chip, atpStack.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 3.0, () => {
        state.bat.atp++; restack(atpStack, state.bat.atp, C.atp);
      });
      state.counts.atp++;
      step(4);
    }
    // 流出的 H⁺
    for (let i = state.hplus.length - 1; i >= 0; i--) {
      const h = state.hplus[i];
      h.mesh.position.y += h.vy * dt;
      if (h.toLumen) {
        if (h.mesh.position.y <= -1.15) { addHToPool(h.mesh.position.x); scene.remove(h.mesh); state.hplus.splice(i, 1); }
      } else if (h.mesh.position.y > 4.2) {
        scene.remove(h.mesh); state.hplus.splice(i, 1);
      }
    }

    // O₂ 气泡
    for (let i = state.o2.length - 1; i >= 0; i--) {
      const o = state.o2[i];
      o.t += dt;
      o.mesh.position.y += dt * 1.6;
      o.mesh.position.x -= dt * 0.8;
      if (o.t > 2.6) { scene.remove(o.mesh); state.o2.splice(i, 1); }
    }
    // 水滴补给
    state.waterTimer += dt;
    if (state.waterTimer > 1.1) {
      state.waterTimer = 0;
      const w = makeGlowDot(0.12, C.water);
      w.position.set(-9.3 + Math.random() * 1.2, -2.4, 0);
      scene.add(w);
      state.waters.push({ mesh: w, t: 0 });
    }
    for (let i = state.waters.length - 1; i >= 0; i--) {
      const w = state.waters[i];
      w.t += dt;
      w.mesh.position.y += dt * 1.2;
      w.mesh.position.x += dt * 0.5;
      if (w.t > 1) { scene.remove(w.mesh); state.waters.splice(i, 1); }
    }

    // 飞行片
    for (let i = state.fliers.length - 1; i >= 0; i--) {
      const f = state.fliers[i];
      const d = f.mesh.position.distanceTo(f.target);
      if (d < 0.28) {
        scene.remove(f.mesh); state.fliers.splice(i, 1);
        f.onArrive?.();
        continue;
      }
      f.mesh.position.lerp(f.target, Math.min(1, f.speed * dt));
    }

    // 卡尔文轮转
    if (!state.turn) {
      state.turnTimer -= dt;
      if (state.turnTimer <= 0) {
        state.turnTimer = 1.5;
        startTurn();
      }
    } else {
      state.turn.t += dt;
      if (state.turn.phase === 'work' && state.turn.t > 0.9) {
        state.turn.phase = 'g3p'; state.turn.t = 0;
        const g = makeGlowDot(0.16, C.g3p);
        g.position.copy(RING_C).add(new THREE.Vector3(0, 0.5, 0));
        flier(g, RING_C.clone().add(new THREE.Vector3(0, -RING_R * 0.62 - 0.4, 0)), 1.8, () => {
          if (state.turns % CALVIN.g3pPerTurns === 0) {
            state.g3p++;
            const out = makeGlowDot(0.2, 0xc8e86a);
            out.position.copy(RING_C).add(new THREE.Vector3(0, -RING_R * 0.62 - 0.5, 0));
            flier(out, new THREE.Vector3(RING_C.x + 0.4, RING_C.y - 3.6, 0), 2.0, () => scene.remove(out));
          }
        });
      }
      if (state.turn.phase === 'g3p' && state.turn.t > 0.8) state.turn = null;
    }

    drawChart(state.zu);
    controls.update();
  }

  return {
    scene, camera, update, refreshHUD,
    getInfo() {
      return { ...state.counts, kok: KOK_STATES[state.kokIdx], bat: { ...state.bat }, turns: state.turns, g3p: state.g3p };
    },
  };
}
