// nuclear-fusion-3d — js/main.js
// Phase 1 bootstrap slice + Phase 2 fusion story runtime, guided tour & playback controls.
//
// SCENARIO-001 / SCENARIO-024 (AC-01/AC-09): WebGL2 capability gate with a custom
// Chinese fallback that returns BEFORE any renderer exists; renderer / camera /
// OrbitControls / clock; ONE animation-frame loop; resize listener; and
// window.__ready = true. The fusion story runtime lives inside this same single
// loop — never a second frame call site.
//
// Phase 2 traceability tags, embedded at their owning sections below:
//   SCENARIO-007 / SCENARIO-008 / SCENARIO-009 (AC-04) — three story phases
//   SCENARIO-010 (AC-04) — PHYS constants + phase state machine + window.fusionSim
//   SCENARIO-011 / SCENARIO-012 / SCENARIO-013 (AC-05) — 5-step guided tour
//   SCENARIO-017 / SCENARIO-018 / SCENARIO-019 (AC-07) — playback controls
//   SCENARIO-020 / SCENARIO-021 (AC-08) — always-on controls + auto-repeat
//   SCENARIO-022 / SCENARIO-023 (AC-09) — r160 hygiene + story order

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import WebGL from 'three/addons/capabilities/WebGL.js';

/* 🎥 重置视角 restores these exact constants (SCENARIO-024 bootstrap contract,
   SCENARIO-019: the #camBtn handler copies both back). */
const DEFAULT_CAMERA_POS = new THREE.Vector3(0, 2.6, 11.5);
const DEFAULT_CAMERA_TARGET = new THREE.Vector3(0, 0, 0);

/* ————————————————————————————————————————————————————————————
   §2 SCENARIO-010 (AC-04, FR-001 response): PHYS — the single source of the
   corrected AC-06 chain. 0.018884 u = ²H + ³H − ⁴He − n; × 931.494 MeV/u ≈
   17.6 MeV (中子 14.1 + α 3.5); × 1.602e-13 J/MeV ≈ 2.82e-12 J (E=mc²).
   ———————————————————————————————————————————————————————————— */
const PHYS = {
  M_D_U: 2.014102,
  M_T_U: 3.016049,
  M_HE4_U: 4.002602,
  M_N_U: 1.008665,
  MASS_DEFECT_U: 0.018884,
  MASS_DEFECT_U_ROUNDED: '0.0189 u',
  MEV_PER_U: 931.494,
  Q_MEV: 17.6,
  NEUTRON_MEV: 14.1,
  ALPHA_MEV: 3.5,
  J_PER_MEV: 1.602e-13,
  E_J: 2.82e-12,
  E_MC2_LABEL: 'E=mc² 质能方程',
};

/* §3 SCENARIO-010 / SCENARIO-023 (AC-04): ordered story phases with explicit
   durations — the initial run advances atoms → plasma → fusion; a run that
   restarts at plasma advances plasma → fusion (BDD-F-002 scope). */
const PHASES = [
  { key: 'atoms', zh: '原子结构', duration: 10 },
  { key: 'plasma', zh: '加热 → 等离子体', duration: 12 },
  { key: 'fusion', zh: '聚变反应', duration: 14 },
];

/* §6 SCENARIO-011 / SCENARIO-012 (AC-05): the 5-step 引导浏览 guided tour as
   plain data — 原子结构 / 加热变成等离子体 / 克服库仑斥力 / 聚变反应生成氦-4
   和中子 / E=mc² 质量变成能量. Entering step i forces phaseKey = step.phaseKey. */
const TOUR_STEPS = [
  { key: 'atoms', title: '① 原子结构（质子/中子/电子）', phaseKey: 'atoms',
    zhText: `左边是<strong>氘（²H）</strong>：1 颗红色<strong>质子</strong> + 1 颗蓝灰色<strong>中子</strong>抱成原子核，外圈 1 颗最小的亮色<strong>电子</strong>沿轨道绕转。右边是<strong>氚（³H）</strong>：1 颗质子 + 2 颗中子 + 1 颗电子。认粒子的口诀是<strong>看大小</strong>：质子最大、中子居中、电子最小（左上角有图例）。` },
  { key: 'heating', title: '② 加热变成等离子体', phaseKey: 'plasma',
    zhText: `看顶部的<strong>温度计</strong>一路飙升：加热到约 <strong>1 亿℃</strong> 时，电子获得足够能量<strong>挣脱原子核的束缚</strong>，变成自由电子四处乱飞；原子核也被撞得高速<strong>随机乱撞</strong>。这种电子与原子核“分家”的带电气体就是<strong>等离子体</strong>——物质的第四态，也是太阳内部的物质状态。悄悄说：日光灯、霓虹灯里也有等离子体，但只有几千度，远不够聚变用（其他方法见右侧「物理小课堂 · 常见问题」）。` },
  { key: 'coulomb', title: '③ 克服库仑斥力（原子核相互排斥）', phaseKey: 'fusion',
    zhText: `两个原子核都带正电，靠得越近，<strong>库仑斥力</strong>（静电排斥）越强，就像两块同极磁铁互相推开。要撞在一起，必须靠超高温让原子核以极高速度对冲，硬"挤"过这道斥力墙——注意看两颗原子核接近时<strong>越来越慢</strong>的减速曲线。` },
  { key: 'fusion', title: '④ 聚变反应生成氦-4 和中子', phaseKey: 'fusion',
    zhText: `挤过斥力墙的一瞬间，强核力接管：<strong>氘 + 氚聚变成 ⁴He（氦-4，2 颗质子 + 2 颗中子）</strong>，同时高速反冲弹出一颗灰色<strong>自由中子</strong>（约 14.1 MeV），氦核带着约 3.5 MeV 向反方向反冲，并爆出一片耀眼的能量闪光。` },
  { key: 'emc2', title: '⑤ E=mc² 质量变成能量', phaseKey: 'fusion',
    zhText: `反应后粒子总质量少了一点点：<strong>0.0189 u</strong>（0.018884 u）。按 <strong>E=mc² 质能方程</strong>，这点亏损的质量 ×931.494 MeV/u ≈ <strong>17.6 MeV ≈ 2.82e-12 J</strong> 的能量——太阳亿万年发光发热的能量来源，就是这束闪光！` },
];

/* SCENARIO-008 (AC-04): 全场景动画粒子的硬上限 — 等离子体粒子场 + 自由电子 +
   英雄原子核内核子，总数永远 ≤ 2,000（单一 THREE.Points 一次绘制调用）。 */
const MAX_PARTICLES = 2000;
const FIELD_N = 1500;   // 环境粒子场（THREE.Points）
const FREE_E_N = 28;    // 剥离的自由电子

/* 粒子尺寸（SCENARIO-007：大小是主要区分线索，颜色只是辅助 — 图例固定在左上角） */
const PROTON_R = 0.42;
const NEUTRON_R = 0.36;
const ELECTRON_R = 0.13;

/* §3 SCENARIO-010 (AC-04): the phase state — simTime 累计器门控一切（SCENARIO-017
   的暂停语义：暂停冻结粒子运动和阶段时钟，恢复后从冻结处继续）。
   SCENARIO-025 (AC-10): autoAdvance=false 时手动换幕 —— 到点不自动前进。 */
const state = {
  phaseKey: 'atoms',
  phaseTime: 0,
  simTime: 0,
  paused: false,
  autoAdvance: true,
  reaction: 'dt',         // 'dt' | 'dd' | 'pb'
  confinement: 'tokamak', // 'tokamak' | 'laser'
  soundEnabled: false,
};

/* ——— Web Audio 物理音效合成器（原生无外部依赖，默认静音） ——— */
let audioCtx = null;
function getAudio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
function playTone(freq, dur = 0.12, type = 'sine', gainVal = 0.15) {
  if (!state.soundEnabled) return;
  const ctx = getAudio();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    g.gain.setValueAtTime(gainVal, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  } catch (e) {}
}
function playFusionBoom() {
  if (!state.soundEnabled) return;
  const ctx = getAudio();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(36, ctx.currentTime + 1.2);
    g.gain.setValueAtTime(0.4, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.3);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.4);
  } catch (e) {}
}

const stage = document.getElementById('stage');

function init() {
  // SCENARIO-024 (AC-09): degradation path — detect WebGL 2 first, show a friendly
  // Chinese message, and stop here so no renderer is ever constructed on dead WebGL.
  if (!WebGL.isWebGL2Available()) {
    const fb = document.createElement('div');
    fb.className = 'webgl2-fallback';
    fb.innerHTML =
      '<div class="webgl2-fallback__icon">🛑</div>' +
      '<h2>您的浏览器不支持 WebGL 2</h2>' +
      '<p>请换用最新版 Chrome / Edge / Safari / Firefox，或在浏览器设置里打开"硬件加速"，' +
      '再回来观看核聚变 3D 动画。</p>';
    stage.appendChild(fb);
    return; // degradation path ends here — no WebGLRenderer is created
  }

  /* ——— 基础场景（SCENARIO-001 bootstrap contract） ——— */
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#04060d');

  const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 400);
  camera.position.copy(DEFAULT_CAMERA_POS);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.copy(DEFAULT_CAMERA_TARGET);
  controls.update();

  /* SCENARIO-007 (AC-04): CSS2DRenderer overlay carries the on-canvas
     质子/中子/电子 labels; pointer-events none so OrbitControls never break. */
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.style.cssText =
    'position:fixed;top:0;left:0;pointer-events:none;z-index:2;';
  labelRenderer.setSize(innerWidth, innerHeight);
  stage.appendChild(labelRenderer.domElement);

  const clock = new THREE.Clock();

  /* ——— 占位星空：永远安静的背景（不属于阶段内容，不计入动画粒子预算） ——— */
  const starfield = (() => {
    const N = 1500;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 60 + Math.random() * 90;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.cos(ph);
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xbfd0ea, size: 0.55, transparent: true, opacity: 0.8,
      depthWrite: false, sizeAttenuation: true
    });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);
    return pts;
  })();

  /* 故事舞台：每个阶段的内容都建在 storyGroup 里，换阶段时整体拆除并 dispose */
  const storyGroup = new THREE.Group();
  scene.add(storyGroup);

  /* 每个阶段 build 出的可更新数据（含 update(dt, t)） */
  let world = null;

  const phaseLabelEl = document.getElementById('phaseLabel');

  /* ——— CSS2D 标签工具（SCENARIO-007） ——— */
  function makeLabel(text, color) {
    const div = document.createElement('div');
    div.textContent = text;
    div.style.cssText =
      'font:600 11px/1.5 "PingFang SC","Microsoft YaHei",sans-serif;' +
      'color:' + (color || '#cbd5e1') + ';background:rgba(8,12,22,.74);' +
      'padding:2px 9px;border-radius:9px;border:1px solid rgba(255,255,255,.15);' +
      'white-space:nowrap;pointer-events:none;';
    return new CSS2DObject(div);
  }
  function attachLabel(target, text, color, dy) {
    const label = makeLabel(text, color);
    label.position.set(0, dy, 0);
    target.add(label);
    return label;
  }
  function sceneLabel(text, color, y) {
    const label = makeLabel(text, color);
    label.position.set(0, y, 0);
    storyGroup.add(label);
    return label;
  }

  /* SCENARIO-007 (AC-04): 图例 — 用"大小"区分粒子种类，颜色绝不是唯一线索 */
  const legendBox = document.createElement('div');
  legendBox.innerHTML =
    '<b style="color:#7dd3fc">图例 · 大小 = 粒子种类</b><br>' +
    '<span style="color:#f0413e">● 质子（带正电 · 最大）</span><br>' +
    '<span style="color:#8494b8">● 中子（不带电 · 中等）</span><br>' +
    '<span style="color:#67e8f9">● 电子（带负电 · 最小）</span>';
  legendBox.style.cssText =
    'position:fixed;left:16px;top:64px;z-index:9;pointer-events:none;' +
    'font-size:.64rem;line-height:1.9;color:#8ea0b5;' +
    'background:rgba(13,17,28,.8);border:1px solid rgba(255,255,255,.08);' +
    'border-radius:10px;padding:7px 11px;backdrop-filter:blur(10px);';
  document.body.appendChild(legendBox);

  /* ——— 粒子网格工具（全部 MeshBasicMaterial：自发光观感，零灯光 → 零 r160 警告） ——— */
  function protonMesh() {
    return new THREE.Mesh(
      new THREE.SphereGeometry(PROTON_R, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0xf0413e })
    );
  }
  function neutronMesh() {
    return new THREE.Mesh(
      new THREE.SphereGeometry(NEUTRON_R, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0x8494b8 })
    );
  }
  function electronMesh() {
    return new THREE.Mesh(
      new THREE.SphereGeometry(ELECTRON_R, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0x67e8f9 })
    );
  }
  function buildNucleus(protons, neutrons) {
    const group = new THREE.Group();
    const meshes = [];
    const total = protons + neutrons;
    for (let i = 0; i < total; i++) {
      const m = i < protons ? protonMesh() : neutronMesh();
      if (total === 1) {
        m.position.set(0, 0, 0);
      } else {
        const a = (i / total) * Math.PI * 2;
        const r = 0.2 + total * 0.03;
        m.position.set(Math.cos(a) * r, Math.sin(a) * r, i % 2 ? 0.1 : -0.1);
      }
      group.add(m);
      meshes.push(m);
    }
    return { group, meshes };
  }

  /* ————————————————————————————————————————————————————————————
     §4 SCENARIO-007 (AC-04) 第一幕 原子结构：氘（1质子+1中子）与
     氚（1质子+2中子）并排，各带 1 颗绕轨道电子 + CSS2D 质子/中子/电子标签。
     ———————————————————————————————————————————————————————————— */
  /* ————————————————————————————————————————————————————————————
     §4 SCENARIO-007 (AC-04) 第一幕 原子结构：氘（1质子+1中子）与
     氚（1质子+2中子）并排，各带 1 颗绕轨道电子 + CSS2D 质子/中子/电子标签。
     ———————————————————————————————————————————————————————————— */
  function buildAtoms() {
    const atoms = [];
    let defs;
    if (state.reaction === 'dd') {
      defs = [
        { name: '氘核 A (²H)', x: -2.7, protons: 1, neutrons: 1, orbitR: 1.55, tilt: 0.55, spin: 1.5 },
        { name: '氘核 B (²H)', x: 2.7, protons: 1, neutrons: 1, orbitR: 1.55, tilt: -0.45, spin: -1.2 },
      ];
    } else if (state.reaction === 'pb') {
      defs = [
        { name: '质子 (¹H)', x: -3.2, protons: 1, neutrons: 0, orbitR: 1.2, tilt: 0.35, spin: 1.8 },
        { name: '硼-11 (¹¹B)', x: 2.5, protons: 5, neutrons: 6, orbitR: 2.1, tilt: -0.4, spin: -1.0 },
      ];
    } else {
      defs = [
        { name: '氘 ²H', x: -2.7, protons: 1, neutrons: 1, orbitR: 1.55, tilt: 0.55, spin: 1.5 },
        { name: '氚 ³H', x: 2.7, protons: 1, neutrons: 2, orbitR: 1.8, tilt: -0.45, spin: -1.2 },
      ];
    }

    for (const d of defs) {
      const atom = new THREE.Group();
      atom.position.set(d.x, 0, 0);
      const nucleus = buildNucleus(d.protons, d.neutrons);
      atom.add(nucleus.group);
      /* 可见轨道环 + 电子所在的倾斜轨道组（电子绕环飞行） */
      const orbitGroup = new THREE.Group();
      orbitGroup.rotation.x = Math.PI / 2 + d.tilt;
      orbitGroup.rotation.y = d.tilt * 0.4;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(d.orbitR - 0.015, d.orbitR + 0.015, 96),
        new THREE.MeshBasicMaterial({
          color: 0x38bdf8, transparent: true, opacity: 0.4, side: THREE.DoubleSide
        })
      );
      orbitGroup.add(ring);
      const electron = electronMesh();
      orbitGroup.add(electron);
      atom.add(orbitGroup);
      attachLabel(atom, d.name + '（' + d.protons + '质子 + ' + d.neutrons + '中子）', '#7dd3fc', 1.15 + d.orbitR * 0.35);
      storyGroup.add(atom);
      atoms.push({ atom, nucleus: nucleus.group, electron, meshes: nucleus.meshes, orbitR: d.orbitR, angle: Math.random() * 6.28, spin: d.spin, bob: d.x });
    }
    /* 代表性粒子标签：挂在第 1 个原子的质子 / 中子 / 电子上（SCENARIO-007 强制契约） */
    attachLabel(atoms[0].meshes[0], '质子（+ 带正电）', '#f87171', 0.6);
    if (atoms[0].meshes[1]) {
      attachLabel(atoms[0].meshes[1], '中子（不带电）', '#a5b4cf', 0.6);
    }
    attachLabel(atoms[0].electron, '电子（− 最小）', '#67e8f9', 0.45);
    sceneLabel('第 1 幕 · 原子结构：左边氘 ²H，右边氚 ³H', '#e2e8f0', 3.6);

    world = {
      update(dt, t) {
        for (const a of atoms) {
          a.angle += a.spin * dt;
          a.electron.position.set(
            Math.cos(a.angle) * a.orbitR,
            Math.sin(a.angle) * a.orbitR,
            0
          );
          a.nucleus.rotation.z += 0.35 * dt;
          a.atom.position.y = Math.sin(t * 0.8 + a.bob) * 0.14;
        }
      },
    };
  }

  /* ————————————————————————————————————————————————————————————
     §4 SCENARIO-008 (AC-04) 第二幕 加热 → 等离子体：电子被剥离成
     自由电子，原子核高速随机乱撞，环境粒子汤 = 单一 THREE.Points
     （FIELD_N + FREE_E_N + 5 核子 < MAX_PARTICLES = 2000）。
     ———————————————————————————————————————————————————————————— */
  function buildPlasma() {
    /* 高速随机乱撞的原子核（随机速度 jitter + 边界反弹） */
    const nuclei = [];
    const defs = [
      { name: '氘核 ²H⁺', protons: 1, neutrons: 1 },
      { name: '氚核 ³H⁺', protons: 1, neutrons: 2 },
    ];
    for (const d of defs) {
      const nucleus = buildNucleus(d.protons, d.neutrons);
      nucleus.group.position.set((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 2, 0);
      nucleus.group.scale.setScalar(0.85);
      attachLabel(nucleus.group, d.name, '#7dd3fc', 0.7);
      storyGroup.add(nucleus.group);
      nuclei.push({
        obj: nucleus.group,
        vel: new THREE.Vector3((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3),
      });
    }
    /* 被剥离的自由电子：脱离原子核自由乱飞 */
    const electrons = [];
    for (let i = 0; i < FREE_E_N; i++) {
      const e = electronMesh();
      e.position.set((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5);
      storyGroup.add(e);
      electrons.push({
        obj: e,
        vel: new THREE.Vector3((Math.random() - 0.5) * 7, (Math.random() - 0.5) * 7, (Math.random() - 0.5) * 7),
      });
    }
    attachLabel(electrons[0].obj, '自由电子 e⁻（已脱离原子核）', '#67e8f9', 0.45);

    /* 托卡马克磁场 / 激光惯性约束视觉辅助体 */
    const confinementGroup = new THREE.Group();
    storyGroup.add(confinementGroup);

    if (state.confinement === 'tokamak') {
      // 12 组 D 形极向场线圈环
      const coilMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35 });
      for (let c = 0; c < 12; c++) {
        const ang = (c / 12) * Math.PI * 2;
        const pts = [];
        for (let j = 0; j <= 36; j++) {
          const v = (j / 36) * Math.PI * 2;
          const r = 3.2 + 1.4 * Math.cos(v);
          const y = 2.0 * Math.sin(v);
          pts.push(new THREE.Vector3(r * Math.cos(ang), y, r * Math.sin(ang)));
        }
        const coilGeo = new THREE.BufferGeometry().setFromPoints(pts);
        confinementGroup.add(new THREE.LineLoop(coilGeo, coilMat));
      }
      // 螺旋环向磁力线 (Helical field lines on magnetic flux surface)
      const helixMat = new THREE.LineBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.6 });
      const hPts = [];
      const q = 3.2; // 安全因子 q
      for (let k = 0; k <= 360; k++) {
        const u = (k / 360) * Math.PI * 8;
        const theta = u;
        const phi = u / q;
        const R = 3.2 + 1.2 * Math.cos(phi);
        const y = 1.3 * Math.sin(phi);
        hPts.push(new THREE.Vector3(R * Math.cos(theta), y, R * Math.sin(theta)));
      }
      const helixGeo = new THREE.BufferGeometry().setFromPoints(hPts);
      confinementGroup.add(new THREE.Line(helixGeo, helixMat));
    } else {
      // 激光惯性约束：对称对轰高能激光束
      const laserMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.4 });
      for (let l = 0; l < 8; l++) {
        const phi = Math.acos(-1 + (2 * l) / 8);
        const theta = Math.sqrt(8 * Math.PI) * phi;
        const dir = new THREE.Vector3(
          Math.cos(theta) * Math.sin(phi),
          Math.sin(theta) * Math.sin(phi),
          Math.cos(phi)
        ).normalize();
        const beamGeo = new THREE.CylinderGeometry(0.04, 0.28, 7.0, 8);
        const beam = new THREE.Mesh(beamGeo, laserMat);
        beam.position.copy(dir.clone().multiplyScalar(3.6));
        beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate());
        confinementGroup.add(beam);
      }
    }

    /* 环境粒子汤：ONE THREE.Points + BufferGeometry（typed-array 位置更新） */
    const pos = new Float32Array(FIELD_N * 3);
    const vel = new Float32Array(FIELD_N * 3);
    for (let i = 0; i < FIELD_N; i++) {
      if (state.confinement === 'tokamak') {
        const th = Math.random() * Math.PI * 2;
        const ph = Math.random() * Math.PI * 2;
        const R = 3.2 + (Math.random() * 0.9 + 0.2) * Math.cos(ph);
        pos[i * 3] = R * Math.cos(th);
        pos[i * 3 + 1] = 1.2 * Math.sin(ph);
        pos[i * 3 + 2] = R * Math.sin(th);
        // 沿环向磁场高速回旋流动
        vel[i * 3] = -Math.sin(th) * 2.2 + (Math.random() - 0.5) * 0.5;
        vel[i * 3 + 1] = (Math.random() - 0.5) * 0.7;
        vel[i * 3 + 2] = Math.cos(th) * 2.2 + (Math.random() - 0.5) * 0.5;
      } else {
        pos[i * 3] = (Math.random() - 0.5) * 14;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 8;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 8;
        vel[i * 3] = (Math.random() - 0.5) * 0.9;
        vel[i * 3 + 1] = (Math.random() - 0.5) * 0.9;
        vel[i * 3 + 2] = (Math.random() - 0.5) * 0.9;
      }
    }
    const fieldGeo = new THREE.BufferGeometry();
    fieldGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const field = new THREE.Points(
      fieldGeo,
      new THREE.PointsMaterial({
        color: state.confinement === 'tokamak' ? 0x67e8f9 : 0xffb37c,
        size: 0.09, transparent: true, opacity: 0.9,
        depthWrite: false, sizeAttenuation: true
      })
    );
    storyGroup.add(field);
    const posAttr = fieldGeo.getAttribute('position');
    sceneLabel('第 2 幕 · 加热 → 等离子体：电子被剥离，原子核高速乱撞', '#fbbf24', 3.6);

    const bounce = (pos, vel, box) => {
      if (pos.x > box.x || pos.x < -box.x) vel.x *= -1;
      if (pos.y > box.y || pos.y < -box.y) vel.y *= -1;
      if (pos.z > box.z || pos.z < -box.z) vel.z *= -1;
      pos.x = Math.max(-box.x, Math.min(box.x, pos.x));
      pos.y = Math.max(-box.y, Math.min(box.y, pos.y));
      pos.z = Math.max(-box.z, Math.min(box.z, pos.z));
    };

    world = {
      update(dt) {
        if (state.confinement === 'tokamak') {
          confinementGroup.rotation.y += dt * 0.15;
        }
        for (const n of nuclei) {
          /* 随机速度 jitter：热运动 */
          n.vel.x += (Math.random() - 0.5) * 16 * dt;
          n.vel.y += (Math.random() - 0.5) * 16 * dt;
          n.vel.z += (Math.random() - 0.5) * 16 * dt;
          n.vel.multiplyScalar(1 - 0.35 * dt);
          if (n.vel.length() > 3.2) n.vel.setLength(3.2);
          n.obj.position.addScaledVector(n.vel, dt);
          bounce(n.obj.position, n.vel, { x: 3.6, y: 2.4, z: 2.4 });
          n.obj.rotation.z += dt * 1.2;
        }
        for (const e of electrons) {
          e.vel.x += (Math.random() - 0.5) * 22 * dt;
          e.vel.y += (Math.random() - 0.5) * 22 * dt;
          e.vel.z += (Math.random() - 0.5) * 22 * dt;
          e.vel.multiplyScalar(1 - 0.3 * dt);
          if (e.vel.length() > 6.5) e.vel.setLength(6.5);
          e.obj.position.addScaledVector(e.vel, dt);
          bounce(e.obj.position, e.vel, { x: 5, y: 3, z: 3 });
        }
        for (let i = 0; i < FIELD_N; i++) {
          const ix = i * 3;
          pos[ix] += vel[ix] * dt;
          pos[ix + 1] += vel[ix + 1] * dt;
          pos[ix + 2] += vel[ix + 2] * dt;
          if (pos[ix] > 7 || pos[ix] < -7) vel[ix] *= -1;
          if (pos[ix + 1] > 4 || pos[ix + 1] < -4) vel[ix + 1] *= -1;
          if (pos[ix + 2] > 4 || pos[ix + 2] < -4) vel[ix + 2] *= -1;
        }
        posAttr.needsUpdate = true;
      },
    };
  }

  /* §5 SCENARIO-009 (AC-04): 能量闪光贴图（canvas 径向渐变 → r152+ colorSpace） */
  function makeGlowTexture() {
    const cnv = document.createElement('canvas');
    cnv.width = 128;
    cnv.height = 128;
    const g = cnv.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.25, 'rgba(255,232,158,0.92)');
    grad.addColorStop(0.6, 'rgba(255,166,66,0.38)');
    grad.addColorStop(1, 'rgba(255,120,30,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(cnv);
    tex.colorSpace = THREE.SRGBColorSpace; // 颜色贴图（canvas 生成）专用
    return tex;
  }

  /* ————————————————————————————————————————————————————————————
     §5 SCENARIO-009 (AC-04) 第三幕 聚变反应：D 与 T 克服库仑斥力
     减速逼近 → 合并成 ⁴He（2质子+2中子）→ 反冲弹出灰色中子
     （14.1 MeV，氦核 3.5 MeV）→ AdditiveBlending 能量闪光展开后淡出。
     ———————————————————————————————————————————————————————————— */
  function buildFusion() {
    const MERGE_T = 5.5;   // 克服库仑斥力的接近用时
    const FLASH_T = 3.0;   // 闪光展开 + 淡出
    const N_SPEED = 5.4;   // 中子反冲速度（~14.1 MeV，约 4 倍于氦核）
    const HE_SPEED = 1.35; // 氦核反冲速度（~3.5 MeV）

    let leftNuc, rightNuc;
    if (state.reaction === 'dd') {
      leftNuc = buildNucleus(1, 1).group;
      rightNuc = buildNucleus(1, 1).group;
    } else if (state.reaction === 'pb') {
      leftNuc = buildNucleus(1, 0).group;
      rightNuc = buildNucleus(5, 6).group;
    } else {
      leftNuc = buildNucleus(1, 1).group; // 氘核
      rightNuc = buildNucleus(1, 2).group; // 氚核
    }
    const dGrp = leftNuc;
    const tGrp = rightNuc;
    dGrp.position.set(-5.4, 0, 0);
    tGrp.position.set(5.4, 0, 0);
    storyGroup.add(dGrp, tGrp);

    /* 🔬 量子隧穿 de Broglie 物质波包与库仑势垒可视化 */
    const waveMatL = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35, wireframe: true });
    const waveMatR = new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.35, wireframe: true });
    const waveL = new THREE.Mesh(new THREE.SphereGeometry(1.0, 16, 12), waveMatL);
    const waveR = new THREE.Mesh(new THREE.SphereGeometry(1.0, 16, 12), waveMatR);
    dGrp.add(waveL);
    tGrp.add(waveR);

    // 发光的中央库仑排斥势垒平面
    const barrierMat = new THREE.MeshBasicMaterial({
      color: 0xef4444, transparent: true, opacity: 0.25, side: THREE.DoubleSide
    });
    const barrier = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3.6), barrierMat);
    barrier.position.set(0, 0, 0);
    storyGroup.add(barrier);

    /* 产物：⁴He（2 质子 + 2 中子）与反冲中子，聚变瞬间才现身 */
    const heGrp = buildNucleus(2, 2).group;
    heGrp.visible = false;
    storyGroup.add(heGrp);

    const neutron = new THREE.Mesh(
      new THREE.SphereGeometry(NEUTRON_R, 20, 14),
      new THREE.MeshBasicMaterial({ color: 0xb9c4d8 })
    );
    neutron.visible = false;
    storyGroup.add(neutron);

    // p-11B 专用产物（3 颗高速 α 粒子）
    const extraAlpha1 = buildNucleus(2, 2).group;
    const extraAlpha2 = buildNucleus(2, 2).group;
    extraAlpha1.visible = false;
    extraAlpha2.visible = false;
    storyGroup.add(extraAlpha1, extraAlpha2);

    /* 能量闪光：Sprite + AdditiveBlending（E=mc² 的化身） */
    const flash = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeGlowTexture(),
        color: 0xffe9a8,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      })
    );
    flash.visible = false;
    storyGroup.add(flash);

    const coulombLabel = sceneLabel('⚠ 库仑斥力：越近推得越开', '#fca5a5', 1.7);
    attachLabel(heGrp, '⁴He 氦核（2质子+2中子）· 反冲 ~3.5 MeV', '#fbbf24', 0.75);
    attachLabel(neutron, '中子 n · 反冲 ~14.1 MeV', '#cbd5e1', 0.6);

    let formulaText = '²H + ³H → ⁴He + n + ' + PHYS.Q_MEV + ' MeV ⚡ ' + PHYS.E_MC2_LABEL +
      '（亏损 ' + PHYS.MASS_DEFECT_U_ROUNDED + ' → ' + PHYS.E_J + ' J）';
    if (state.reaction === 'dd') {
      formulaText = '²H + ²H → ³He + n (3.27 MeV) / ³H + p (4.03 MeV) ⚡ 均值 ~3.65 MeV';
    } else if (state.reaction === 'pb') {
      formulaText = 'p + ¹¹B → 3 ⁴He + 8.68 MeV ⚡ 先进洁净聚变（零中子辐射）';
    }
    const eqLabel = sceneLabel(formulaText, '#7dd3fc', 3.6);
    eqLabel.visible = false;

    const tunnelingHud = document.getElementById('tunnelingHud');
    let soundFired = false;

    world = {
      update(dt, t) {
        if (t < MERGE_T) {
          if (tunnelingHud) tunnelingHud.hidden = false;
          /* 减速逼近：pow(u, 0.55) 先快后慢 — 库仑斥力在近距最强 */
          const u = Math.min(t / MERGE_T, 1);
          const ease = Math.pow(u, 0.55);
          const arc = Math.sin(u * Math.PI) * 0.4;
          dGrp.position.set(-5.4 + 4.9 * ease, arc, 0);
          tGrp.position.set(5.4 - 4.9 * ease, -arc, 0);
          dGrp.rotation.z += dt * 1.6;
          tGrp.rotation.z -= dt * 1.6;
          coulombLabel.visible = u < 0.92;

          // 德布罗意波包波动与库仑势垒呼吸
          const pulse = 1 + 0.18 * Math.sin(t * 16);
          waveL.scale.setScalar(pulse);
          waveR.scale.setScalar(pulse);
          barrierMat.opacity = 0.15 + 0.65 * ease;

          // 更新量子隧穿 HUD
          const distFm = (1 - ease) * 12 + 1.2;
          const prob = Math.min(Math.exp(-distFm * 0.35) * 100, 99.8).toFixed(1);
          const probEl = document.getElementById('tunnelProb');
          if (probEl) probEl.textContent = `P ~ ${prob}% (伽莫夫峰共振开启!)`;
          return;
        }

        if (tunnelingHud) tunnelingHud.hidden = true;
        /* 聚变！合并 → 产物反冲 → 闪光展开后淡出（SCENARIO-021：淡出后自动重演） */
        const ft = t - MERGE_T;
        if (!soundFired) {
          playFusionBoom();
          soundFired = true;
        }
        dGrp.visible = false;
        tGrp.visible = false;
        barrier.visible = false;
        coulombLabel.visible = false;
        heGrp.visible = true;
        eqLabel.visible = true;

        if (state.reaction === 'pb') {
          // 3 颗 α 粒子沿 120° 对称反冲
          extraAlpha1.visible = true;
          extraAlpha2.visible = true;
          const rSpeed = 3.2;
          heGrp.position.set(Math.cos(0) * ft * rSpeed, Math.sin(0) * ft * rSpeed, 0);
          extraAlpha1.position.set(Math.cos(2.094) * ft * rSpeed, Math.sin(2.094) * ft * rSpeed, 0);
          extraAlpha2.position.set(Math.cos(4.188) * ft * rSpeed, Math.sin(4.188) * ft * rSpeed, 0);
        } else {
          neutron.visible = true;
          heGrp.position.set(-0.25 - ft * HE_SPEED, -0.1 * ft, 0);
          heGrp.rotation.z -= dt * 2.2;
          neutron.position.set(0.25 + ft * N_SPEED * 0.85, 0.15 + ft * N_SPEED * 0.5, 0);
        }

        if (ft < FLASH_T) {
          flash.visible = true;
          const s = 1.2 + ft * 3.2;
          flash.scale.set(s, s, 1);
          flash.material.opacity = Math.max(0.9 * (1 - ft / FLASH_T), 0);
        } else {
          flash.visible = false;
        }
      },
    };
  }

  function buildPhase(key) {
    if (key === 'atoms') buildAtoms();
    else if (key === 'plasma') buildPlasma();
    else buildFusion();
  }

  /* 拆除旧阶段：dispose 被替换的几何体 / 材质 / 贴图，移除 CSS2D 标签节点
     （SCENARIO-008 / SCENARIO-021 / SCENARIO-022: dispose-on-rebuild 卫生） */
  function clearStory() {
    storyGroup.traverse((obj) => {
      if (obj.isCSS2DObject) obj.element.remove();
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          if (m.map) m.map.dispose();
          m.dispose();
        }
      }
    });
    storyGroup.clear();
    world = null;
  }

  /* §3 SCENARIO-010 / SCENARIO-018 / SCENARIO-023 (AC-04/AC-07): (re)start a run.
     'atoms' = 初始载入；'plasma' = 🔄 重置 与 自动重演的入口。只管动画状态，
     从不读写导览状态、也从不碰 OrbitControls。 */
  function startRun(fromKey) {
    const idx = PHASES.findIndex((p) => p.key === fromKey);
    const safe = idx >= 0 ? idx : 0;
    state.phaseKey = PHASES[safe].key;
    state.phaseTime = 0;
    state.simTime = PHASES.slice(0, safe).reduce((sum, p) => sum + p.duration, 0);
    clearStory();
    buildPhase(state.phaseKey);
    phaseLabelEl.textContent = PHASES[safe].zh;
    refreshPhaseChrome(); // SCENARIO-025: ①②③ 幕标签高亮同步
  }

  /* §3 SCENARIO-010 / SCENARIO-023 (AC-04): 阶段按时长顺序推进；末阶段结束后
     —— 导览进行中就重演聚变，自由探索就自动回到 等离子体（SCENARIO-021）。
     SCENARIO-025 (AC-10): 手动换幕模式下到点不前进（聚变幕例外——自动重演
     本幕，闪光淡出后立刻再来一遍，等用户点 ①②③ 或 上一幕/下一幕）。 */
  function advancePhase() {
    const i = PHASES.findIndex((p) => p.key === state.phaseKey);
    if (i === -1 || state.phaseTime < PHASES[i].duration) return;
    if (!state.autoAdvance) {
      if (state.phaseKey === 'fusion') startRun('fusion');
      return;
    }
    if (i < PHASES.length - 1) {
      startRun(PHASES[i + 1].key);
    } else if (isTourActive()) {
      startRun('fusion');
    } else {
      startRun('plasma');
    }
  }

  function updateWorld(dt) {
    if (world) world.update(dt, state.phaseTime);
  }

  /* ————————————————————————————————————————————————————————————
     §6 SCENARIO-011 / SCENARIO-012 / SCENARIO-013 (AC-05): 引导浏览。
     导览状态只活在这一段：startRun / 🔄 重置 永不触碰它。
     ———————————————————————————————————————————————————————————— */
  let tourActive = false;
  let tourStep = 0;
  const tourPanel = document.getElementById('tourPanel');
  const tourDots = document.getElementById('tourDots');
  const btnTour = document.getElementById('btnTour');

  TOUR_STEPS.forEach((_, i) => {
    const dot = document.createElement('i');
    dot.onclick = () => gotoTourStep(i);
    tourDots.appendChild(dot);
  });

  function gotoTourStep(i) {
    tourStep = i;
    const step = TOUR_STEPS[i];
    document.getElementById('tourTitle').textContent = step.title;
    document.getElementById('tourText').innerHTML = step.zhText;
    [...tourDots.children].forEach((d, k) => d.classList.toggle('on', k === i));
    /* 强制阶段耦合：进入第 i 步就把故事锁到该步的阶段起点（不暂停播放） */
    startRun(step.phaseKey);
  }
  function startTour() {
    tourActive = true;
    tourPanel.classList.add('open');
    btnTour.classList.add('active');
    gotoTourStep(0); // SCENARIO-011: 🎬 从第 0 步开始
  }
  function exitTour() {
    tourActive = false;
    tourPanel.classList.remove('open');
    btnTour.classList.remove('active');
  }
  function isTourActive() {
    return tourActive;
  }

  btnTour.onclick = () => (tourActive ? exitTour() : startTour());
  document.getElementById('tourPrev').onclick = () => gotoTourStep(Math.max(tourStep - 1, 0));
  document.getElementById('tourNext').onclick = () =>
    gotoTourStep(Math.min(tourStep + 1, TOUR_STEPS.length - 1));
  document.getElementById('tourExit').onclick = () => exitTour();

  /* ————————————————————————————————————————————————————————————
     §7 SCENARIO-017 / SCENARIO-018 / SCENARIO-019 (AC-07): 控制条。
     ———————————————————————————————————————————————————————————— */
  const toggleBtn = document.getElementById('toggleBtn');

  /* ————————————————————————————————————————————————————————————
     §7b SCENARIO-025 (AC-10): 每一幕可点击控制 — ①②③ 幕标签、上一幕/下一幕、
     自动/手动换幕开关（手动模式到点不换幕；聚变幕自动重演）。
     直接点幕 = 切到自由探索（若导览开着则先退出）。
     ———————————————————————————————————————————————————————————— */
  const phaseTabs = document.querySelectorAll('.phase-tab');
  const prevPhaseBtn = document.getElementById('prevPhaseBtn');
  const nextPhaseBtn = document.getElementById('nextPhaseBtn');
  const autoBtn = document.getElementById('autoBtn');

  function phaseIndex() {
    return PHASES.findIndex((p) => p.key === state.phaseKey);
  }
  function refreshPhaseChrome() {
    phaseTabs.forEach((btn) => btn.classList.toggle('active', btn.dataset.phase === state.phaseKey));
  }
  function jumpToPhase(key) {
    if (!PHASES.some((p) => p.key === key)) return;
    if (isTourActive()) exitTour();
    startRun(key);
  }
  function refreshAutoBtn() {
    autoBtn.textContent = state.autoAdvance ? '🔁 自动换幕：开' : '👆 手动换幕';
    autoBtn.setAttribute('aria-pressed', String(state.autoAdvance));
    autoBtn.classList.toggle('active', !state.autoAdvance);
  }
  phaseTabs.forEach((btn) => {
    btn.onclick = () => jumpToPhase(btn.dataset.phase);
  });
  prevPhaseBtn.onclick = () => jumpToPhase(PHASES[Math.max(phaseIndex() - 1, 0)].key);
  nextPhaseBtn.onclick = () => jumpToPhase(PHASES[Math.min(phaseIndex() + 1, PHASES.length - 1)].key);
  autoBtn.onclick = () => {
    state.autoAdvance = !state.autoAdvance;
    refreshAutoBtn();
  };
  refreshAutoBtn();

  /* §7c SCENARIO-025 (AC-10): 第二幕实时温度计 — 常温 20℃ 沿指数曲线冲向
     1 亿℃（D–T 点火条件 ≈ 10 keV），阶段文案同步讲解电离过程。 */
  const tempHud = document.getElementById('tempHud');
  const tempNowEl = document.getElementById('tempNow');
  const tempBar = document.getElementById('tempBar');
  const tempStageEl = document.getElementById('tempStage');
  const T_ROOM_C = 20;
  const T_IGNITION_C = 1e8;
  function plasmaTempC(t) {
    const u = Math.min(Math.max(t / PHASES[1].duration, 0), 1);
    return T_ROOM_C * Math.pow(T_IGNITION_C / T_ROOM_C, u);
  }
  function fmtTempC(T) {
    if (T < 1e4) return Math.round(T).toLocaleString() + ' ℃';
    if (T < 1e8) {
      const wan = T / 1e4;
      return (wan >= 100 ? Math.round(wan) : Math.round(wan * 10) / 10) + ' 万℃';
    }
    return Math.round((T / 1e8) * 100) / 100 + ' 亿℃';
  }
  function tempStageText(T) {
    if (T < 1e3) return '🫧 常温气体：加热中…';
    if (T < 1e5) return '⚡ 电子开始挣脱原子核（电离开始）';
    if (T < 1e7) return '🔥 剧烈电离：等离子体形成！';
    if (T < 9.5e7) return '🔥 等离子体继续升温…';
    return '🎯 1 亿℃ 达成：满足 D–T 聚变条件！';
  }
  let lastTempText = '';
  const lawsonValEl = document.getElementById('lawsonVal');
  const lawsonFillEl = document.getElementById('lawsonFill');
  function updateTempHud() {
    if (state.phaseKey !== 'plasma') {
      if (!tempHud.hidden) tempHud.hidden = true;
      return;
    }
    tempHud.hidden = false;
    const T = plasmaTempC(state.phaseTime);
    const text = '🌡️ ' + fmtTempC(T);
    if (text !== lastTempText) {
      lastTempText = text;
      tempNowEl.textContent = text;
      tempStageEl.textContent = tempStageText(T);
    }
    const u = Math.min(state.phaseTime / PHASES[1].duration, 1);
    tempBar.style.width = (u * 100).toFixed(1) + '%';

    // 劳森判据三乘积计算：n * T * tau_E (keV * s / m^3)
    if (lawsonValEl && lawsonFillEl) {
      const tripleVal = (Math.pow(u, 2.5) * 3.2).toFixed(2);
      lawsonValEl.textContent = `${tripleVal} × 10²¹ keV·s/m³`;
      const fillPct = Math.min((parseFloat(tripleVal) / 3.0) * 100, 100);
      lawsonFillEl.style.width = `${fillPct}%`;
    }
  }

  /* 约束模式按钮事件 */
  const btnTokamak = document.getElementById('btnTokamak');
  const btnLaser = document.getElementById('btnLaser');
  if (btnTokamak && btnLaser) {
    btnTokamak.onclick = () => {
      state.confinement = 'tokamak';
      btnTokamak.classList.add('active');
      btnLaser.classList.remove('active');
      if (state.phaseKey === 'plasma') startRun('plasma');
    };
    btnLaser.onclick = () => {
      state.confinement = 'laser';
      btnLaser.classList.add('active');
      btnTokamak.classList.remove('active');
      if (state.phaseKey === 'plasma') startRun('plasma');
    };
  }

  /* 反应类型选择与浮窗 */
  const btnRxn = document.getElementById('btnRxn');
  const rxnPanel = document.getElementById('rxnPanel');
  if (btnRxn && rxnPanel) {
    btnRxn.onclick = () => {
      rxnPanel.hidden = !rxnPanel.hidden;
      btnRxn.classList.toggle('active', !rxnPanel.hidden);
    };
    document.querySelectorAll('.rxn-btn').forEach((btn) => {
      btn.onclick = () => {
        document.querySelectorAll('.rxn-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.reaction = btn.dataset.rxn;
        rxnPanel.hidden = true;
        btnRxn.classList.remove('active');
        startRun(state.phaseKey);
      };
    });
  }

  /* 音效开关 */
  const btnSound = document.getElementById('btnSound');
  if (btnSound) {
    btnSound.onclick = () => {
      state.soundEnabled = !state.soundEnabled;
      btnSound.textContent = state.soundEnabled ? '🔊' : '🔇';
      btnSound.classList.toggle('active', state.soundEnabled);
      if (state.soundEnabled) playTone(440, 0.1);
    };
  }

  /* §3 SCENARIO-010 (AC-04): observable runtime API — window.fusionSim */
  window.fusionSim = {
    getPhase: () => state.phaseKey,
    getPhaseTime: () => state.phaseTime,
    getSimTime: () => state.simTime,
    isPaused: () => state.paused,
    /* SCENARIO-017 (AC-07, BDD-F-001 response): 暂停冻结粒子 + 阶段时钟；
       ▶ 继续 恢复标签与播放，故事从冻结处原样继续。 */
    pause: () => {
      state.paused = true;
      toggleBtn.textContent = '▶ 继续';
    },
    resume: () => {
      state.paused = false;
      toggleBtn.textContent = '⏸ 暂停';
    },
    /* SCENARIO-018 (AC-07): 重置 = 从 等离子体 重启 3D 故事，不动导览状态 */
    reset: () => {
      startRun('plasma');
    },
    isTourActive: () => isTourActive(),
    getTourStep: () => (tourActive ? tourStep : null),
    /* SCENARIO-025 (AC-10): 每一幕可点击控制 — 自动/手动换幕 + 直接跳幕 */
    getMode: () => (state.autoAdvance ? 'auto' : 'manual'),
    setAutoAdvance: (on) => {
      state.autoAdvance = !!on;
      refreshAutoBtn();
    },
    gotoPhase: (key) => jumpToPhase(key),
  };

  toggleBtn.onclick = () => {
    if (state.paused) window.fusionSim.resume();
    else window.fusionSim.pause();
  };

  document.getElementById('resetBtn').onclick = () => {
    startRun('plasma');
  };

  /* SCENARIO-019 (AC-07): 🎥 重置视角 — 恢复默认机位与目标点 */
  document.getElementById('camBtn').onclick = () => {
    camera.position.copy(DEFAULT_CAMERA_POS);
    controls.target.copy(DEFAULT_CAMERA_TARGET);
    controls.update();
  };

  /* SCENARIO-001 (AC-01): resize 同步两个渲染器尺寸 */
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    labelRenderer.setSize(innerWidth, innerHeight);
  });

  /* ——— 唯一的动画循环（SCENARIO-022）：每帧必取 clock.getDelta()（暂停语义
     的地基）；只有未暂停时才累计 simTime 并推进世界与阶段时钟 —— 恢复后从
     冻结处无缝继续，且从不写 clock.running。 ——— */
  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!state.paused) {
      state.simTime += dt;
      state.phaseTime += dt;
      starfield.rotation.y += dt * 0.008;
      updateWorld(dt);
      advancePhase();
    }
    controls.update();
    updateTempHud(); // SCENARIO-025: 第二幕温度计（其他幕隐藏）
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }

  /* SCENARIO-023 (AC-09): 初始运行从 原子结构 开始 */
  startRun('atoms');
  animate();
}

init();
window.__ready = true;
