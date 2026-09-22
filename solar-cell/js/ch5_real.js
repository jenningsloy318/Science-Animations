/* ══════════════════════════════════════════════════
   ch5_real.js — 第5章：真实世界：从微观物理到 27.81% 与未来叠层
   四个子场景：
     A 真实结构与表面物理 — 层状截面、表面悬挂键双重钝化、60μm柔性弯曲、Nature 2025软击穿防热斑
     B 光阱与1000×聚光   — 裸抛光(35%) → 绒面(8%) → 减反膜(2%)；1000× 菲涅尔透镜消除立体角熵损失，Voc+180mV，冲破卡诺/兰兹伯格极限
     C 彩虹光谱 CT 扫描  — 蓝光查表皮(<10nm)，绿光查内脏(1.56μm)，红外查骨髓(156μm)，全谱无损探伤
     D 效率天平与叠层未来 — 100块阳光能量分解（19%穿透+33%热化）→ 32% SQ → 29.43% 俄歇 → 27.81% HIBC纪录 → 35.5% 钙钛矿叠层
   权威数据来源：
     · 吸收系数与深度：Green & Keevers 1995 (pveducation)
     · 单结物理极限：Richter et al. 2013 (IEEE JPV, 29.43% Auger)
     · 世界纪录：LONGi HIBC 27.81% (ISFH 2025-04-11, Nature 2025)
     · 软击穿防热斑：Nature 2025 论文 (遮光损耗-70%, 降温28%)
     · 柔性单晶硅：Nature 2023 论文 (60μm 弯折革命)
     · 叠层纪录：34.85% (NREL 2025) / 35.5% (ESTI 2026)
     · 极限聚光与兰兹伯格：Swanson 2005 (40.8%), Landsberg & Tonge 1980 (86.8%)
   ══════════════════════════════════════════════════ */
import * as THREE from 'three';
import {
  COL, makeTextSprite, addAnim, ease, flyCamera, wavelengthColor, photonEnergy,
} from './core.js';
import { showNarr } from './ui.js';
import {
  EG_SI, E_DIR_SI, OPTICAL_DEPTH_UM, SOLAR_AM0, SOLAR_AM15G,
  LOSS_BUDGET, EFFICIENCY_LADDER, FLEXIBLE_SI_THICKNESS_UM,
  cpvVoltageBoostV, tandemSeriesVoltage, cutoffWavelengthNm,
} from './facts.js';

export const meta = {
  nav: '🌍 真实世界',
  title: '🌍 太阳能电池 · 第5章：真实世界 — 从原理到 27.81%',
  sub: 'Chapter 5 · Real cells: optics, passivation, CPV, CT scan & efficiency budget',
};

let root, env, refresh = null;
let mode = 'structure';      // structure | trap | ct_scan | budget
let ray = null, pointer = null;
let pickables = [], picked = null;
let photons = [], fate = { r: 0, a: 0, t: 0 }, rainOn = false, opticsMode = 'bare';
let budgetBlocks = [], budgetStage = -1;
let layers = [];

/* ── Structure state ── */
let passivationMode = 'none'; // 'none' | 'double'
let isBending = false;
let isLeafShaded = false;
let passivSpikesGroup = null;
let leafMesh = null;
let waferOriginalPos = null;

/* ── Trap / CPV state ── */
let cpvGroup = null;
let cpvRays = [];
let cpvHotSpot = null;

/* ── CT Scan state ── */
let ctProbe = 'green'; // 'uv' | 'green' | 'nir' | 'sweep'
let ctGroup = null;
let ctBeam = null;
let ctDepthTag = null;
let sweepT = 0;

/* ── Verified optical parameters ── */
const OPTICS = {
  bare: { R: 0.35, path: 1, label: '裸抛光 · 反射 ≈35%' },
  text: { R: 0.08, path: 2.6, label: '绒面 · 反射 ≈8%' },
  both: { R: 0.02, path: 2.6, label: '绒面＋膜 · 反射 ≈2%' },
  cpv:  { R: 0.02, path: 2.6, label: '☀️ 1000× 聚光 (Voc +180mV)' },
};
const L_WAFER_CM = 0.015; // 150 μm

/* AM1.5-ish photon mix */
const MIX = [
  [350, 500, 15], [500, 700, 26], [700, 900, 21], [900, 1000, 10], [1000, 1100, 9], [1100, 1300, 19],
];
function samplePhoton() {
  let r = Math.random() * 100, acc = 0;
  for (const [lo, hi, w] of MIX) { acc += w; if (r < acc) return lo + Math.random() * (hi - lo); }
  return 550;
}
function absProb(nm, Lcm) {
  const depth = OPTICAL_DEPTH_UM[nearestKey(nm)] || 1.56;
  const alpha = 1e4 / depth; // 1/cm
  return 1 - Math.exp(-alpha * Lcm);
}
function nearestKey(nm) {
  const ks = Object.keys(OPTICAL_DEPTH_UM).map(Number);
  return ks.reduce((b, k) => (Math.abs(k - nm) < Math.abs(b - nm) ? k : b), ks[0]);
}

/* ═══════════════ enter & lifecycle ═══════════════ */
export function enter(e) {
  env = e;
  root = new THREE.Group();
  e.root.add(root);
  resetAllState();
  ray = new THREE.Raycaster();
  pointer = new THREE.Vector2();
  mode = 'structure';
  buildStructure();
}
export function bindEnv(e, r) { env = e; refresh = r; }

function resetAllState() {
  photons = [];
  fate = { r: 0, a: 0, t: 0 };
  rainOn = false;
  budgetBlocks = [];
  budgetStage = -1;
  layers = [];
  pickables = [];
  picked = null;
  passivationMode = 'none';
  isBending = false;
  isLeafShaded = false;
  passivSpikesGroup = null;
  leafMesh = null;
  cpvGroup = null;
  cpvRays = [];
  cpvHotSpot = null;
  ctGroup = null;
  ctBeam = null;
  ctDepthTag = null;
}

function clearRoot() {
  if (!root) return;
  while (root.children.length) {
    const c = root.children[0];
    root.remove(c);
  }
  if (fateEl) { fateEl.remove(); fateEl = null; }
  resetAllState();
}

/* ═══════════════ A · 真实结构与表面物理 ═══════════════ */
function buildStructure() {
  clearRoot();
  mode = 'structure';
  rainOn = false;
  const W = 9, D = 5.2;

  const layerDefs = [
    {
      id: 'texture', name: '金字塔绒面', h: 0.34, y: 0,
      color: 0x8ea4c8, rough: 0.35,
      zh: '<b>金字塔绒面</b>（KOH 各向异性腐蚀，倾角 54.74°，高 2–5 μm）：入射光在金字塔斜面发生<b>双重反射 (Double Bounce)</b>，将裸抛光硅的 35% 反射率降到 8% 以下，并使光线倾斜折射，光程拉长 2.6 倍！',
      en: 'Random 54.74° pyramids double-bounce incoming rays, cutting reflectance to ~8% and tilting light path',
    },
    {
      id: 'arc', name: '减反射膜 SiNx', h: 0.12, y: 0,
      color: 0x4f74d8, rough: 0.15, transparent: true, opacity: 0.55,
      zh: '<b>氮化硅减反射膜 (SiNx)</b>：厚度严格等于 <b>73~75 nm</b>（可见光波长 600nm 的四分之一波长 d=λ/4n）。上下表面反射光波峰波谷恰好<b>相消干涉</b>，加权反射率压到 <b>≈2%</b>！它还内含氢原子，肩负着抚平表面断键的重任',
      en: '75 nm quarter-wave SiNx: destructive interference drops reflection to ~2% + passes H for chemical passivation',
    },
    {
      id: 'emitter', name: 'n⁺ 发射极', h: 0.16, y: 0,
      color: 0x3b4d78, rough: 0.3,
      zh: '<b>n⁺ 发射极</b>（重掺磷，厚仅 0.3–0.5 μm）：只有头发丝直径的 1/200！它与 p 型基底交界处就是 <b>PN 结</b>。此处重掺杂必须极度小心，防止形成捕获载流子的“死层 (Dead Layer)”',
      en: 'Ultra-thin 0.3 μm phosphorus-doped emitter: junction resides here, minimizing Auger dead layer',
    },
    {
      id: 'bulk', name: 'p 型硅片本体', h: 1.7, y: 0,
      color: 0x6e4450, rough: 0.45,
      zh: '<b>p 型硅片本体</b>（厚 150 μm）：现代薄晶圆。间接带隙使绿光 1.56 μm 即可吸收，而 <b>1000 nm 近红外需 156 μm 甚至穿透</b>。基底的<b>少数载流子寿命 τ 必须长达 1~5 ms</b>（扩散长度 L=√(Dτ) > 1500 μm 远超片厚），电子才能活着抵达 PN 结滑梯！',
      en: '150 μm p-type substrate: minority carrier lifetime τ > 1 ms ensures diffusion length Ln >> wafer thickness',
    },
    {
      id: 'back', name: '背面反射/电极', h: 0.2, y: 0,
      color: 0xb8c0cc, rough: 0.25, metal: true,
      zh: '<b>背面反射镜与欧姆电极</b>：底部的镜面将逃逸的红外光反弹回硅片中，光路加倍；局部微米重掺杂接触孔厚度小于 3nm，让电子利用<b>量子隧穿穿墙术</b>毫无阻力汇入外电路',
      en: 'Back mirror + ohmic contact: doubles NIR optical path; tunneling contacts (<3 nm) eliminate contact barriers',
    },
  ];

  let yCursor = 0;
  for (let i = layerDefs.length - 1; i >= 0; i--) {
    const L = layerDefs[i];
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(W, L.h, D),
      new THREE.MeshStandardMaterial({
        color: L.color, roughness: L.rough ?? 0.4,
        metalness: L.metal ? 0.85 : 0.05,
        transparent: !!L.transparent, opacity: L.opacity ?? 1,
      })
    );
    yCursor += L.h / 2;
    mesh.position.set(0, yCursor, 0);
    const top = yCursor + L.h / 2;
    yCursor += L.h / 2;
    root.add(mesh);
    const entry = { ...L, mesh, topY: top };
    layers.push(entry);
    pickables.push(mesh);
    mesh.userData.layerId = L.id;
  }

  /* 3D pyramid cones */
  const texG = new THREE.ConeGeometry(0.52, 0.42, 4);
  const texM = new THREE.MeshStandardMaterial({ color: 0x9fb3d8, roughness: 0.3, metalness: 0.05 });
  const topLayer = layers[layers.length - 1];
  for (let ix = 0; ix < 8; ix++) for (let iz = 0; iz < 5; iz++) {
    const p = new THREE.Mesh(texG, texM);
    p.position.set(-W / 2 + 0.6 + ix * ((W - 1.1) / 7), topLayer.mesh.position.y + topLayer.h / 2 + 0.19, -D / 2 + 0.55 + iz * ((D - 1.0) / 4));
    p.rotation.y = Math.PI / 4;
    root.add(p);
  }
  topLayer.mesh.position.y += 0.1;

  /* Name tags */
  let lastTagY = -1e9;
  [...layers].reverse().forEach(L => {
    let ty = L.mesh.position.y;
    if (ty > lastTagY - 0.62) ty = lastTagY - 0.62;
    lastTagY = ty;
    const t = makeTextSprite(L.name, 0.58, '#e2e8f0');
    t.position.set(-W / 2 - 1.6, ty, D / 2);
    root.add(t);
  });
  const totalTop = layers[layers.length - 1].mesh.position.y + layers[layers.length - 1].h / 2 + 0.5;
  const scaleTag = makeTextSprite('金字塔各向异性 54.74°（示意画大 ~40 倍，真实 2–5 μm）', 0.5, '#94a3b8');
  scaleTag.position.set(0, totalTop + 1.5, D / 2);
  root.add(scaleTag);

  /* Build passivation spikes group (initially hidden or shown based on mode) */
  buildPassivationSpikes();

  flyCamera(env.camera, env.controls, [7.5, 5.2, 9.5], [0, 1.1, 0], 1.3);
  showNarr(
    '这是现代商用单晶硅太阳能电池的<b>五层真实截面</b>：<b>点击每一层</b>查看微观物理与工艺奥秘。<br>尝试下方按钮：观察<b>表面悬挂键双重钝化</b>、<b>60μm 柔性弯折黑科技</b>与 <b>Nature 2025 局部软击穿防热斑</b>！',
    'Real device cross-section — click layers or toggle surface passivation & flexible silicon',
    'blue'
  );
}

/* ── Surface Dangling Bonds & Double Passivation ── */
function buildPassivationSpikes() {
  if (passivSpikesGroup) {
    root.remove(passivSpikesGroup);
    passivSpikesGroup = null;
  }
  passivSpikesGroup = new THREE.Group();
  root.add(passivSpikesGroup);

  const topLayer = layers[layers.length - 1];
  const surfaceY = topLayer ? topLayer.mesh.position.y + topLayer.h / 2 + 0.42 : 2.5;

  const spikeGeo = new THREE.ConeGeometry(0.08, 0.35, 5);
  const unpassivMat = new THREE.MeshStandardMaterial({
    color: 0xef4444, emissive: 0x991b1b, emissiveIntensity: 0.6, roughness: 0.3,
  });
  const hSphereGeo = new THREE.SphereGeometry(0.1, 8, 8);
  const hMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.8, roughness: 0.2,
  });

  const N_SPIKES = 18;
  for (let i = 0; i < N_SPIKES; i++) {
    const sx = -3.8 + (i % 6) * 1.5 + (Math.random() - 0.5) * 0.2;
    const sz = -1.8 + Math.floor(i / 6) * 1.8 + (Math.random() - 0.5) * 0.2;

    const spike = new THREE.Mesh(spikeGeo, unpassivMat);
    spike.position.set(sx, surfaceY + 0.16, sz);
    passivSpikesGroup.add(spike);

    if (passivationMode === 'double') {
      // H atom cap (chemical passivation)
      const hCap = new THREE.Mesh(hSphereGeo, hMat);
      hCap.position.set(sx, surfaceY + 0.38, sz);
      passivSpikesGroup.add(hCap);
    }
  }

  if (passivationMode === 'double') {
    // Field-effect passivation: electrostatic shield aura
    const shieldGeo = new THREE.PlaneGeometry(8.6, 4.8);
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, transparent: true, opacity: 0.32,
      emissive: 0x38bdf8, emissiveIntensity: 0.5, side: THREE.DoubleSide,
    });
    const shield = new THREE.Mesh(shieldGeo, shieldMat);
    shield.rotation.x = -Math.PI / 2;
    shield.position.set(0, surfaceY + 0.45, 0);
    passivSpikesGroup.add(shield);

    const shieldTag = makeTextSprite('🛡️ 场效应固定电荷屏蔽层 [+ + +] · 强力排斥少数载流子', 0.52, '#38bdf8');
    shieldTag.position.set(0, surfaceY + 1.1, 1.8);
    passivSpikesGroup.add(shieldTag);
  } else if (passivationMode === 'none') {
    const dangerTag = makeTextSprite('⚠️ 表面未钝化：悬挂键陷阱 (SRV > 10⁶ cm/s)', 0.52, '#ef4444');
    dangerTag.position.set(0, surfaceY + 0.9, 1.8);
    passivSpikesGroup.add(dangerTag);
  }
}

function togglePassivation() {
  passivationMode = (passivationMode === 'none') ? 'double' : 'none';
  buildPassivationSpikes();
  if (passivationMode === 'double') {
    showNarr(
      '<b>【双重钝化生效：SRV 暴跌至 < 10 cm/s】</b><br>' +
      '① <b>化学钝化</b>：氢原子精灵飞上去紧紧结合表面未配对的 $sp^3$ 悬挂键，形成坚固的 Si-H 键，表面缺陷态降低 4 个数量级！<br>' +
      '② <b>场效应钝化</b>：SiNx 薄膜内部常带 $+10^{12}\\text{ cm}^{-2}$ 永久固定正电荷，形成强力电磁力盾牌，把空穴和电子死死隔开，切断表面复合通道！',
      'Double passivation: chemical Si-H caps + electrostatic field-effect shielding (SRV < 10 cm/s)',
      'green'
    );
  } else {
    showNarr(
      '<b>【未钝化表面：致命的断头路与张牙舞爪小怪兽】</b><br>' +
      '单晶硅切开暴露表面后，三维晶格周期势场突然截断，表面硅原子的共价键悬在半空（<b>悬挂键 Dangling Bonds</b>）！<br>' +
      '禁带中央诱发出极高密度的表面态，表面复合速率高达 <b>$10^6\\text{ cm/s}$</b>，任何撞上表面的光生电子在几皮秒内被吞噬复合，电池几乎彻底报废！',
      'Unpassivated surface: truncated sp3 dangling bonds act as deadly recombination centers (SRV > 10^6 cm/s)',
      'red'
    );
  }
}

/* ── Nature 2023 Flexible 60μm Silicon ── */
function toggleFlexibleBending() {
  isBending = !isBending;
  const targetRotZ = isBending ? 0.35 : 0;
  const targetScaleY = isBending ? 0.65 : 1.0;

  addAnim({
    duration: 0.8,
    update(p) {
      layers.forEach(l => {
        l.mesh.rotation.z = targetRotZ * p;
        if (l.id === 'bulk') l.mesh.scale.y = 1 - (1 - targetScaleY) * p;
      });
    },
    onComplete() {
      if (isBending) {
        showNarr(
          '<b>【Nature 2023 柔性单晶硅 60μm 弯折革命】</b><br>' +
          '中科院上海微系统所团队发现：单晶硅碎裂的元凶是微观边缘尖锐的 V 型应力倒刺。<br>' +
          '通过化学钝化圆滑边缘倒刺，将硅片薄化至 <b>60 μm</b>（头发丝细度），厚硬的脆石头瞬间变成能 360° 弯折的神奇折纸，效率依然维持 >24%！',
          'Nature 2023: 60 μm ultra-thin flexible single-crystal silicon with smoothed microscopic edge cracks',
          'gold'
        );
      } else {
        showNarr('硅片恢复平面刚性形态。150 μm 刚性硅片依然是现代屋顶与地面光伏电站的主力！', 'Restored to rigid state', 'blue');
      }
    },
  });
}

/* ── Nature 2025 Soft Breakdown (Anti-hot-spot) ── */
function toggleLeafShading() {
  isLeafShaded = !isLeafShaded;
  if (isLeafShaded) {
    if (!leafMesh) {
      const leafGeo = new THREE.CylinderGeometry(1.2, 0.4, 0.05, 6);
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.4 });
      leafMesh = new THREE.Mesh(leafGeo, leafMat);
      leafMesh.rotation.x = Math.PI / 2;
      leafMesh.position.set(2.2, 3.2, 0.5);
      root.add(leafMesh);
    }
    showNarr(
      '<b>【一片树叶的生死考验：Nature 2025 局部软击穿黑科技】</b><br>' +
      '当树叶遮挡一块电池时，外电路几十安培电流强行倒灌，传统电池反向击穿电压极高，局域温度飙升至 <b>150°C 烧穿起火（致命热斑）</b>！<br>' +
      '隆基联合团队在 2025 年《Nature》发表最新突破：设计<b>低压软击穿微通道</b>，被遮挡时自主低压泄流旁路，<b>热斑降温 28%，遮光损耗减少 70%</b>！',
      'Nature 2025: autonomous low-voltage soft breakdown bypasses reverse current, preventing hot-spot destruction',
      'gold'
    );
  } else {
    if (leafMesh) { root.remove(leafMesh); leafMesh = null; }
    showNarr('树叶移开，日照恢复均匀。所有电池单元协同满功率输出。', 'Leaf removed', 'blue');
  }
}

function pickLayer(px, py) {
  pointer.x = (px / innerWidth) * 2 - 1;
  pointer.y = -(py / innerHeight) * 2 + 1;
  ray.setFromCamera(pointer, env.camera);
  const hits = ray.intersectObjects(pickables, false);
  if (!hits.length) return;
  const L = layers.find(l => l.mesh === hits[0].object);
  if (!L || L === picked) return;
  picked = L;
  layers.forEach(l => l.mesh.material.emissive.set(0x000000));
  L.mesh.material.emissive.set(0x8a6d1a);
  L.mesh.material.emissiveIntensity = 0.7;
  showNarr(L.zh, L.en, 'gold');
}

/* ═══════════════ B · 光阱与 1000× 菲涅尔聚光 ═══════════════ */
function buildTrap() {
  clearRoot();
  mode = 'trap';
  fate = { r: 0, a: 0, t: 0 };

  const W = 9, D = 5.2;
  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(W, 1.7, D),
    new THREE.MeshStandardMaterial({ color: 0x6e4450, roughness: 0.4, transparent: true, opacity: 0.32 })
  );
  root.add(slab);
  const back = new THREE.Mesh(
    new THREE.BoxGeometry(W, 0.14, D),
    new THREE.MeshStandardMaterial({ color: 0xb8c0cc, metalness: 0.9, roughness: 0.2 })
  );
  back.position.y = -0.92;
  root.add(back);

  /* pyramids hint */
  const texG = new THREE.ConeGeometry(0.5, 0.38, 4);
  const texM = new THREE.MeshStandardMaterial({ color: 0x9fb3d8, roughness: 0.3, transparent: true, opacity: 0.35 });
  for (let ix = 0; ix < 8; ix++) for (let iz = 0; iz < 5; iz++) {
    const p = new THREE.Mesh(texG, texM);
    p.position.set(-W / 2 + 0.6 + ix * ((W - 1.1) / 7), 0.92, -D / 2 + 0.55 + iz * ((D - 1.0) / 4));
    p.rotation.y = Math.PI / 4;
    root.add(p);
  }
  const tag = makeTextSprite('观察光子命运：反射 / 吸收发电 / 穿过', 0.58, '#e2e8f0');
  tag.position.set(-3.2, 3.8, D / 2 + 0.6);
  root.add(tag);

  flyCamera(env.camera, env.controls, [7.5, 7.2, 9.8], [0, 0.2, 0], 1.3);
  rainOn = (opticsMode !== 'cpv');
  if (opticsMode === 'cpv') buildCpvConcentrator();
  applyOptics(opticsMode, true);
}

function spawnRainPhoton() {
  if (!rainOn || mode !== 'trap' || opticsMode === 'cpv') return;
  const nm = samplePhoton();
  const irPass = nm >= 1100;
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 8),
    new THREE.MeshBasicMaterial({ color: irPass ? 0x6b7280 : wavelengthColor(nm) })
  );
  const x = (Math.random() - 0.5) * 7.6, z = (Math.random() - 0.5) * 3.8;
  mesh.position.set(x, 7.5, z);
  root.add(mesh);

  const opt = OPTICS[opticsMode];
  const Lcm = L_WAFER_CM * (opticsMode === 'bare' ? 1 : opt.path);
  let fateKind;
  if (irPass) fateKind = 't';
  else if (Math.random() < opt.R) fateKind = 'r';
  else fateKind = (Math.random() < absProb(nm, Lcm)) ? 'a' : 't';

  photons.push({ mesh, nm, kind: fateKind, x, z, t: 0 });
}

function stepPhotons(dt) {
  for (let i = photons.length - 1; i >= 0; i--) {
    const ph = photons[i];
    ph.t += dt;
    if (ph.phase === undefined) {
      const p = Math.min(1, ph.t / 0.9);
      ph.mesh.position.set(ph.x, 7.5 - p * 6.6, ph.z);
      if (p >= 1) {
        ph.t = 0;
        if (ph.kind === 'r') {
          ph.phase = 'out';
          fate.r++;
        } else if (ph.kind === 'a') {
          ph.phase = 'absorb';
          flash(ph.mesh.position, ph.nm >= 1000 ? 0xdc2626 : 0xfbbf24);
          fate.a++;
        } else {
          ph.phase = 'through';
          fate.t++;
        }
        updateFateTags();
      }
    } else if (ph.phase === 'absorb') {
      if (ph.t > 0.4) { kill(i); continue; }
    } else {
      const dir = ph.phase === 'out' ? -1 : 1;
      const p = Math.min(1, ph.t / 0.8);
      ph.mesh.position.y = 0.9 + dir * p * 6.5;
      ph.mesh.material.opacity = 1 - p * 0.5;
      if (p >= 1) { kill(i); continue; }
    }
  }
}
function kill(i) {
  const ph = photons[i];
  root.remove(ph.mesh); ph.mesh.geometry.dispose(); ph.mesh.material.dispose();
  photons.splice(i, 1);
}
function flash(pos, color) {
  const s = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 10, 10),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 })
  );
  s.position.copy(pos);
  root.add(s);
  addAnim({
    duration: 0.5,
    update(p) { s.scale.setScalar(1 + p * 2.4); s.material.opacity = 0.95 * (1 - p); },
    onComplete() { root.remove(s); s.geometry.dispose(); s.material.dispose(); },
  });
}

let fateEl = null;
function updateFateTags() {
  const n = fate.r + fate.a + fate.t;
  if (!n) return;
  const pr = Math.round(100 * fate.r / n), pa = Math.round(100 * fate.a / n), pt = 100 - pr - pa;
  if (!fateEl) {
    fateEl = document.createElement('div');
    fateEl.className = 'fate-counter';
    const stage = document.getElementById('stage');
    if (stage) stage.appendChild(fateEl);
  }
  fateEl.innerHTML = `已统计 ${n} 颗光子<br>
    <span style="color:#94a3b8">反射 ${pr}%</span> ·
    <span style="color:#fbbf24">吸收发电 ${pa}%</span> ·
    <span style="color:#64748b">穿过 ${pt}%</span><br>
    <small style="color:#64748b">当前表面：${OPTICS[opticsMode].label}</small>`;
}

/* ── 1000× CPV Concentrator Lens Scene ── */
function buildCpvConcentrator() {
  if (cpvGroup) root.remove(cpvGroup);
  cpvGroup = new THREE.Group();
  root.add(cpvGroup);

  // Fresnel concentrator lens hovering overhead
  const lensGeo = new THREE.CylinderGeometry(2.8, 2.8, 0.15, 32);
  const lensMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8, transparent: true, opacity: 0.35, roughness: 0.1, metalness: 0.1,
  });
  const lens = new THREE.Mesh(lensGeo, lensMat);
  lens.position.set(0, 5.6, 0);
  cpvGroup.add(lens);

  // Stepped Fresnel rings
  for (let r = 0.8; r <= 2.4; r += 0.5) {
    const ringGeo = new THREE.TorusGeometry(r, 0.04, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.5 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 5.62, 0);
    cpvGroup.add(ring);
  }

  // Intense focal spot on wafer
  const spotGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.05, 16);
  const spotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  cpvHotSpot = new THREE.Mesh(spotGeo, spotMat);
  cpvHotSpot.position.set(0, 0.95, 0);
  cpvGroup.add(cpvHotSpot);

  // Concentrated light beam cone
  const coneGeo = new THREE.ConeGeometry(2.7, 4.7, 32, 1, true);
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a, transparent: true, opacity: 0.22, side: THREE.DoubleSide,
  });
  const cone = new THREE.Mesh(coneGeo, coneMat);
  cone.position.set(0, 3.25, 0);
  cone.rotation.x = Math.PI;
  cpvGroup.add(cone);

  // Floating metrics
  const deltaVocMv = (cpvVoltageBoostV(1000) * 1000).toFixed(1);
  const tag = makeTextSprite(`☀️ 1000× 菲涅尔聚光 · ΔVoc = +${deltaVocMv} mV (Voc 冲至 0.92V!)`, 0.62, '#fde047');
  tag.position.set(0, 6.3, 0);
  cpvGroup.add(tag);

  const ladderTag = makeTextSprite('单结极限 33.7% ➔ 40.8% | 兰兹伯格极限 86.8% | 卡诺极限 95%', 0.48, '#e2e8f0');
  ladderTag.position.set(0, 2.2, 2.4);
  cpvGroup.add(ladderTag);
}

function applyOptics(m, silent) {
  opticsMode = m;
  fate = { r: 0, a: 0, t: 0 };
  if (fateEl) fateEl.innerHTML = '';

  if (m === 'cpv') {
    rainOn = false;
    buildCpvConcentrator();
  } else {
    rainOn = true;
    if (cpvGroup) { root.remove(cpvGroup); cpvGroup = null; }
  }

  if (silent) return;
  const msg = {
    bare: '【裸抛光硅】折射率 n≈3.5，菲涅耳反射 R=((n-1)/(n+1))² ≈ <b>31–48%</b>，加权平均 <b>35%</b>！三分之一的阳光直接弹回太空',
    text: '【金字塔绒面】54.74° 四棱锥群实现<b>双重反射 (Double Bounce)</b>，将反射率压到 <b>≈8%</b>，同时斜折光程延长 2.6 倍',
    both: '【绒面 + 75nm SiNx 减反膜】四分之一波长<b>相消干涉</b>，工业反射率压至 <b>≈2%</b>！呈现标志性科技深蓝色',
    cpv:  '【1000× 菲涅尔聚光加力舱】把阳光聚焦 1000 倍，<b>彻底消除立体角辐射熵损失</b>！开路电压对数飙升 <b>ΔVoc = (kT/q)ln(1000) ≈ +178.6 mV</b>，单结极限跃升至 <b>40.8%</b>，无限叠层兰兹伯格极限达 <b>86.8%</b>！',
  }[m];
  showNarr(msg, m, m === 'bare' ? 'red' : 'gold');
}

/* ═══════════════ C · 彩虹光谱 CT 全身扫描仪 ═══════════════ */
function buildCtScan() {
  clearRoot();
  mode = 'ct_scan';
  rainOn = false;

  const W = 8.5, D = 4.8;
  const bulk = new THREE.Mesh(
    new THREE.BoxGeometry(W, 1.8, D),
    new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.35, transparent: true, opacity: 0.65 })
  );
  bulk.position.y = 0.9;
  root.add(bulk);

  const emitterLayer = new THREE.Mesh(
    new THREE.BoxGeometry(W, 0.18, D),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2 })
  );
  emitterLayer.position.y = 1.89;
  root.add(emitterLayer);

  const backMirror = new THREE.Mesh(
    new THREE.BoxGeometry(W, 0.12, D),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.15 })
  );
  backMirror.position.y = -0.06;
  root.add(backMirror);

  // Depth markers
  const d0 = makeTextSprite('0 μm 表面表皮 (UV 吸收区)', 0.44, '#38bdf8');
  d0.position.set(-W / 2 - 1.8, 1.9, D / 2);
  root.add(d0);

  const d1 = makeTextSprite('1.56 μm PN 结耗尽区 (绿光吸收区)', 0.44, '#4ade80');
  d1.position.set(-W / 2 - 2.1, 1.4, D / 2);
  root.add(d1);

  const d2 = makeTextSprite('150 μm 深层基底与背反射 (近红外深入区)', 0.44, '#f87171');
  d2.position.set(-W / 2 - 2.4, 0.1, D / 2);
  root.add(d2);

  // CT Scanner overhead emitter head
  ctGroup = new THREE.Group();
  root.add(ctGroup);

  const headGeo = new THREE.BoxGeometry(2.4, 0.6, 2.4);
  const headMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.set(0, 5.2, 0);
  ctGroup.add(head);

  applyCtProbe(ctProbe);
  flyCamera(env.camera, env.controls, [7.5, 4.6, 9.2], [0, 1.2, 0], 1.3);
}

function applyCtProbe(probe) {
  ctProbe = probe;
  if (!ctGroup) return;

  if (ctBeam) { ctGroup.remove(ctBeam); ctBeam = null; }
  if (ctDepthTag) { ctGroup.remove(ctDepthTag); ctDepthTag = null; }

  let color = 0x22c55e, depthY = 1.4, len = 3.8;
  if (probe === 'uv') {
    color = 0xa855f7; depthY = 1.9; len = 3.3;
    showNarr(
      '<b>【365nm 紫外探针：前额表皮体检（穿透深度 < 10 nm）】</b><br>' +
      '紫外光子能量高达 3.4 eV（触发<b>直接跃迁</b>），在硅片最表层几个纳米就被生生吞没！<br>' +
      '• <b>临床诊断</b>：如果测出的蓝光/紫外 EQE 严重下垂，<b>100% 宣判病因在正面表皮</b>——表面未钝化的悬挂键怪手吞噬载流子，或发射极重掺杂导致死层（Dead Layer）俄歇复合！',
      'UV probe (<10 nm depth): diagnoses front surface passivation and emitter dead-layer Auger',
      'blue'
    );
  } else if (probe === 'green') {
    color = 0x22c55e; depthY = 1.4; len = 3.8;
    showNarr(
      '<b>【550nm 绿光探针：内脏肚脐体检（穿透深度 1.56 μm）】</b><br>' +
      '绿光刚好在 PN 结内建电场耗尽区及浅基底完全吸收，光生电子-空穴对出门就是滑梯，收集概率贴近完美！<br>' +
      '• <b>临床诊断</b>：在此波段，优质单晶硅电池的<b>内量子效率 (IQE) 平直如削，高达 99%~100%</b>，是整块电池最健康强健的心脏部位！',
      'Green probe (1.56 μm depth): absorbed in depletion zone; benchmark IQE approaches ~100%',
      'green'
    );
  } else if (probe === 'nir') {
    color = 0xef4444; depthY = 0.05; len = 5.15;
    showNarr(
      '<b>【1000nm 近红外探针：骨髓脚跟体检（穿透深度 156 μm）】</b><br>' +
      '硅是间接带隙材料，对近红外吸收极弱，光子深入硅片大底，甚至撞击背面银镜二次反弹！<br>' +
      '• <b>临床诊断</b>：如果长波段 IQE 萎靡早落，<b>100% 宣判病因在深层骨髓与底座</b>——硅片纯度差、少子寿命太短（扩散长度 Ln < 150μm）或背面反射钝化不良！',
      'NIR probe (156 μm depth): penetrates whole bulk to back mirror; diagnoses bulk lifetime τ and rear passivation',
      'red'
    );
  } else if (probe === 'sweep') {
    color = 0xfbbf24; depthY = 0.8; len = 4.4;
    showNarr(
      '<b>【300~1100nm 彩虹全光谱无损 CT 扫描】</b><br>' +
      '无需划开电池、不破坏一针一线：只需打上一支会变色的彩虹光束，看外电路吐出多少电流，就能从纳米表皮一路摸透到百微米骨髓！这就是半导体物理的光谱量子效率 (EQE/IQE) 神奇魔法！',
      'Continuous 300-1100 nm spectral scan: non-destructive holographic whole-body cell diagnosis',
      'gold'
    );
  }

  const beamGeo = new THREE.CylinderGeometry(0.18, 0.18, len, 16);
  const beamMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 });
  ctBeam = new THREE.Mesh(beamGeo, beamMat);
  ctBeam.position.set(0, 5.2 - len / 2, 0);
  ctGroup.add(ctBeam);

  ctDepthTag = makeTextSprite(`探针波长 · 穿透深度标定`, 0.48, '#e2e8f0');
  ctDepthTag.position.set(0, 4.3, 1.4);
  ctGroup.add(ctDepthTag);
}

/* ═══════════════ D · 效率天平与叠层未来 ═══════════════ */
const BUDGET = [
  {
    key: 'all', label: '☀️ 全部阳光', cls: 'white',
    zh: '落在 1 m² 电池上的全部阳光辐射：<b>1000 W/m² (AM1.5G)</b>。100 个方块代表 100%。能量去哪了？让我们一关一关剥开残酷的物理法则',
    en: '1000 W/m² = 100 blocks. Watch every block step through the laws of physics',
  },
  {
    key: 'subgap', label: '19% 穿透', cls: 'sub',
    zh: '<b>【19% 能量亚带隙直接穿透】</b><br>波长 > 1100nm（能量 < 1.124 eV）的光子，能量不足以激发电子跨过禁带，单结硅对其<b>绝对透明</b>，一枪穿透打在地上。任何纯工艺手段都无法消除此项热力学损耗',
    en: '19% below Eg=1.124 eV passes through untouched (silicon is transparent to it)',
  },
  {
    key: 'thermal', label: '33% 热化', cls: 'heat',
    zh: '<b>【33% 能量高能热化变废热】</b><br>紫外与蓝光光子（如 3.1 eV）远超带隙，每个光子依然只能激发 1 对电子-空穴，<b>多余的 2.0 eV 在 1 皮秒内通过剧烈声子散射变成晶格废热</b>！这是最大的单一损耗',
    en: '33% thermalization: excess photon energy above 1.12 eV dissipates into lattice heat within picoseconds',
  },
  {
    key: 'sq', label: 'SQ 极限 32%', cls: 'mid',
    zh: '<b>【辐射复合平衡：Shockley–Queisser 极限 ≈32%】</b><br>剩下的 48% 光谱能量中，由于黑体辐射与二极管正向暗电流不可逆复合，将开路电压从 1.12V 压制到 0.75V 左右，单结硅纯辐射极限锁定在 <b>32.2%</b>',
    en: 'Radiative detailed-balance SQ limit for silicon is ~32.2%',
  },
  {
    key: 'auger', label: '俄歇极限 29.4%', cls: 'auger',
    zh: '<b>【三体碰撞终结者：俄歇极限 29.43% (Richter 2013)】</b><br>当载流子浓度升高，三个载流子相互碰撞，电子-空穴复合把能量踹给第三个电子发热（Auger 复合率 ∝ n²p）！这给单结硅盖上了<b>不可逾越的物理天花板：29.43%</b>！',
    en: 'Auger recombination (Richter 2013) seals silicon physical ceiling at 29.43%',
  },
  {
    key: 'real', label: '纪录 27.81%', cls: 'record',
    zh: '<b>【世界纪录：隆基 HIBC 27.81% (ISFH 认证，Nature 2025)】</b><br>单结硅世界最高峰！全背接触零正面栅线遮挡，填充因子高达 <b>87.55%</b>，距离物理极限仅差 1.6 个百分点！量产商用电池已稳定在 <b>≈24.5%</b>',
    en: 'World record 27.81% (LONGi HIBC, ISFH certified, Nature 2025); commercial ~24.5%',
  },
  {
    key: 'tandem', label: '🚀 叠层未来 35.5%', cls: 'tandem',
    zh: '<b>【双结叠罗汉：钙钛矿/硅叠层突破单结极限至 35.5%】</b><br>' +
    '打破单结 SQ 枷锁的终极利器：高矮两个吃货联手！<br>' +
    '• 顶层钙钛矿 (Eg=1.68 eV) 专吃高能蓝绿光，输出 1.25V；<br>' +
    '• 底层单晶硅 (Eg=1.12 eV) 专吃漏过来的红外光，输出 0.65V；<br>' +
    '• 串联叠加电压达 <b>1.90V</b>！纪录飞升至 <b>34.85% (NREL) / 35.5% (ESTI 2026)</b>，理论极限高达 <b>~43%</b>！',
    en: 'Tandem Perovskite/Si stacks 1.68 eV + 1.12 eV, soaring to 35.5% (ESTI 2026, theoretical ~43%)',
  },
];
const BLOCK_COLORS = {
  white: 0xe8eaf0, sub: 0x475569, heat: 0xdc2626, mid: 0x0ea5e9,
  auger: 0xf59e0b, record: 0xd8b25c, lost: 0x1e293b, tandem: 0x38bdf8,
};

function buildBudget() {
  clearRoot();
  mode = 'budget';
  rainOn = false;
  budgetStage = -1;

  const g = new THREE.Group();
  g.position.set(-4.5, -3, -2.6);
  root.add(g);
  const geo = new THREE.BoxGeometry(0.82, 0.82, 0.82);
  for (let i = 0; i < 100; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: BLOCK_COLORS.white, roughness: 0.35, metalness: 0.1,
      transparent: true, opacity: 0.96,
    }));
    m.position.set((i % 10) * 1.0, Math.floor(i / 10) * 1.0, 0);
    g.add(m);
    budgetBlocks.push({ mesh: m, state: 'white', home: m.position.clone() });
  }
  const tag = makeTextSprite('100 方块 = 1000 W/m² (AM1.5G 标准阳光)', 0.7, '#e8eaf0');
  tag.position.set(4.5, 10.6, 0);
  root.add(tag);

  flyCamera(env.camera, env.controls, [4.6, 4.6, 11.5], [4.5, 1.6, 0], 1.3);
  budgetGoto(0);
}

function paintBlocks(from, to, cls) {
  addAnim({
    duration: 0.8,
    update(p) {
      const n = Math.round(from + (to - from) * p);
      for (let i = from; i < n; i++) {
        const b = budgetBlocks[i];
        if (b && b.state !== cls) {
          b.mesh.material.color.set(BLOCK_COLORS[cls]);
          b.state = cls;
          b.mesh.position.z = 0.6;
        }
      }
    },
    onComplete() {
      for (let i = from; i < to; i++) {
        const b = budgetBlocks[i];
        if (b) {
          b.mesh.material.color.set(BLOCK_COLORS[cls]);
          b.state = cls;
          b.mesh.position.z = 0.6;
        }
      }
    },
  });
}

function budgetGoto(stageIdx) {
  const st = BUDGET[stageIdx];
  switch (st.key) {
    case 'all':
      paintBlocks(0, 100, 'white');
      break;
    case 'subgap':
      paintBlocks(81, 100, 'sub');
      break;
    case 'thermal':
      paintBlocks(48, 81, 'heat');
      break;
    case 'sq':
      paintBlocks(32, 48, 'lost');
      break;
    case 'auger':
      paintBlocks(29, 32, 'lost');
      break;
    case 'real':
      paintBlocks(24, 29, 'lost');
      if (budgetBlocks[24]) budgetBlocks[24].mesh.material.color.set(BLOCK_COLORS.record);
      break;
    case 'tandem':
      paintBlocks(24, 36, 'tandem');
      break;
  }
  budgetStage = stageIdx;
  showNarr(st.zh, st.en, stageIdx >= 5 ? 'gold' : 'blue');
}

/* ═══════════════ actions ═══════════════ */
export function actions() {
  if (mode === 'structure') {
    return {
      buttons: [
        {
          label: passivationMode === 'double' ? '🛡️ 双重钝化：开 (SRV<10)' : '⚠️ 表面悬挂键：未钝化',
          cls: passivationMode === 'double' ? 'green' : 'red',
          onClick: () => { togglePassivation(); refresh && refresh(); },
        },
        {
          label: isBending ? '📐 柔性弯曲：开 (60μm)' : '📐 柔性弯曲：关 (平面)',
          cls: isBending ? 'gold' : '',
          onClick: () => { toggleFlexibleBending(); refresh && refresh(); },
        },
        {
          label: isLeafShaded ? '🍃 树叶软击穿防热斑 (Nature 2025)' : '🍃 模拟树叶遮挡',
          cls: isLeafShaded ? 'gold' : '',
          onClick: () => { toggleLeafShading(); refresh && refresh(); },
        },
        { label: '🌧 去光阱与聚光', cls: 'blue', onClick: () => { buildTrap(); refresh && refresh(); } },
        { label: '🔬 去光谱 CT 扫描', cls: 'blue', onClick: () => { buildCtScan(); refresh && refresh(); } },
        { label: '⚖️ 去效率天平', cls: 'gold', onClick: () => { buildBudget(); refresh && refresh(); } },
      ],
      sliders: [],
    };
  }

  if (mode === 'trap') {
    return {
      buttons: [
        { label: OPTICS.bare.label, cls: opticsMode === 'bare' ? 'red' : '', onClick: () => { applyOptics('bare'); refresh && refresh(); } },
        { label: OPTICS.text.label, cls: opticsMode === 'text' ? 'gold' : '', onClick: () => { applyOptics('text'); refresh && refresh(); } },
        { label: OPTICS.both.label, cls: opticsMode === 'both' ? 'green' : '', onClick: () => { applyOptics('both'); refresh && refresh(); } },
        { label: OPTICS.cpv.label,  cls: opticsMode === 'cpv' ? 'gold' : '', onClick: () => { applyOptics('cpv'); refresh && refresh(); } },
        { label: '🧱 回到结构', cls: 'blue', onClick: () => { buildStructure(); refresh && refresh(); } },
        { label: '🔬 光谱 CT', cls: 'blue', onClick: () => { buildCtScan(); refresh && refresh(); } },
        { label: '⚖️ 效率天平', cls: 'gold', onClick: () => { buildBudget(); refresh && refresh(); } },
      ],
      sliders: [],
    };
  }

  if (mode === 'ct_scan') {
    return {
      buttons: [
        { label: '🟣 紫外探针 (365nm 查表皮)', cls: ctProbe === 'uv' ? 'blue' : '', onClick: () => { applyCtProbe('uv'); refresh && refresh(); } },
        { label: '🟢 绿光探针 (550nm 查内脏)', cls: ctProbe === 'green' ? 'green' : '', onClick: () => { applyCtProbe('green'); refresh && refresh(); } },
        { label: '🔴 红外探针 (1000nm 查骨髓)', cls: ctProbe === 'nir' ? 'red' : '', onClick: () => { applyCtProbe('nir'); refresh && refresh(); } },
        { label: '🌈 全谱连续扫描 (300-1100nm)', cls: ctProbe === 'sweep' ? 'gold' : '', onClick: () => { applyCtProbe('sweep'); refresh && refresh(); } },
        { label: '🧱 回到结构', cls: 'blue', onClick: () => { buildStructure(); refresh && refresh(); } },
        { label: '🌧 光阱与聚光', cls: 'blue', onClick: () => { buildTrap(); refresh && refresh(); } },
        { label: '⚖️ 效率天平', cls: 'gold', onClick: () => { buildBudget(); refresh && refresh(); } },
      ],
      sliders: [],
    };
  }

  /* mode === 'budget' */
  const nav = BUDGET.map((b, i) => ({
    label: (i === budgetStage ? '▶ ' : '') + b.label,
    cls: i === budgetStage ? 'gold' : (b.cls === 'tandem' ? 'blue' : ''),
    onClick: () => { budgetGoto(i); refresh && refresh(); },
  }));
  return {
    buttons: [
      ...nav,
      { label: '🧱 回到结构', cls: 'blue', onClick: () => { buildStructure(); refresh && refresh(); } },
      { label: '🔬 光谱 CT', cls: 'blue', onClick: () => { buildCtScan(); refresh && refresh(); } },
    ],
    sliders: [],
  };
}

/* ═══════════════ per-frame update ═══════════════ */
let rainAcc = 0;
export function update(dt) {
  if (!root) return;
  if (mode === 'trap' && rainOn && opticsMode !== 'cpv') {
    rainAcc += dt;
    if (rainAcc > 0.16) { rainAcc = 0; if (photons.length < 14) spawnRainPhoton(); }
    stepPhotons(dt);
  }
  if (mode === 'trap' && opticsMode === 'cpv' && cpvHotSpot) {
    const s = 1.0 + 0.18 * Math.sin(Date.now() * 0.008);
    cpvHotSpot.scale.set(s, 1, s);
  }
  if (mode === 'ct_scan' && ctProbe === 'sweep' && ctBeam) {
    sweepT += dt * 0.8;
    const nm = 350 + (Math.sin(sweepT) * 0.5 + 0.5) * (1100 - 350);
    const col = wavelengthColor(nm);
    ctBeam.material.color.set(col);
    if (ctDepthTag) {
      const depth = OPTICAL_DEPTH_UM[nearestKey(nm)] || 1.56;
      ctDepthTag.material.map && ctDepthTag.material.map.dispose();
      root.remove(ctDepthTag);
      ctDepthTag = makeTextSprite(`当前波长: ${Math.round(nm)} nm | 穿透深度: ${depth < 1 ? (depth*1000).toFixed(0)+' nm' : depth.toFixed(1)+' μm'}`, 0.46, '#fbbf24');
      ctDepthTag.position.set(0, 4.3, 1.4);
      ctGroup.add(ctDepthTag);
    }
  }
}

/* pointer interaction */
export function onPointerUp(px, py, movedSmall) {
  if (mode !== 'structure' || !movedSmall) return;
  pickLayer(px, py);
}

export function leave() {
  clearRoot();
}
