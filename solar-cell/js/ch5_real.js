/* ══════════════════════════════════════════════════
   ch5_real.js — 第5章：真实世界：从原理到 27.81%
   三个子场景：
     A 真实结构  — 层状截面（绒面/减反射膜/发射极/硅片/背反射）
     B 光阱      — 裸抛光 35% → 绒面 ≈8% → 绒面+膜 ≈2% 的光子雨
     C 效率天平  — 100% 阳光的完整损耗预算（19+33 光谱 → 32 SQ → 29.4 俄歇 → 27.81 纪录 → ~24 量产）
   数据来源（2026-09-17 在线核实）：
     · 吸收系数/深度：Green & Keevers 1995（pveducation 转载数据表）
     · 裸硅反射率：pveducation ">30%"；Fresnel 由 n 数据计算 31–48%
     · 损耗预算：Wikipedia Shockley–Queisser（19% 亚带隙 + 33% 热化 → 光谱上限 48%）
     · 硅 SQ 辐射极限 ~32%；计入俄歇 29.4%（Richter et al. 2013, IEEE JPV）
     · 纪录：LONGi HIBC 27.81%（ISFH 认证 2025-04-11）；叠层 34.85%（NREL 认证 2025-04）
     · 商用单晶硅电池 ≈24%（Wikipedia Solar cell efficiency）
   ══════════════════════════════════════════════════ */
import * as THREE from 'three';
import {
  COL, makeTextSprite, addAnim, ease, flyCamera, wavelengthColor, photonEnergy,
} from './core.js';
import { showNarr } from './ui.js';

export const meta = {
  nav: '🌍 真实世界',
  title: '🌍 太阳能电池 · 第5章：真实世界 — 从原理到 27.81%',
  sub: 'Chapter 5 · Real cells: optics, light trapping & the efficiency budget',
};

let root, env, refresh = null;
let mode = 'structure';      // structure | trap | budget
let ray = null, pointer = null;
let pickables = [], picked = null;
let photons = [], fate = { r: 0, a: 0, t: 0 }, rainOn = false, opticsMode = 'bare';
let budgetBlocks = [], budgetStage = -1;
let layers = [];

/* ── verified numbers used below ── */
const ABS = {   // Green & Keevers 1995: α (1/cm) → 1/α depth in μm at 300K
  400: { a: 9.5e4 }, 550: { a: 6.39e3 }, 700: { a: 1.9e3 },
  800: { a: 850 }, 900: { a: 306 }, 1000: { a: 64 }, 1100: { a: 3.5 },
};
const depthUm = nm => Math.round(1e4 / ABS[nm].a);        // 1/α, μm
const OPTICS = {
  bare: { R: 0.35, path: 1, label: '裸抛光 · 反射 ≈35%' },
  text: { R: 0.08, path: 2.6, label: '绒面 · 反射 ≈8%' },
  both: { R: 0.02, path: 2.6, label: '绒面＋减反射膜 · 反射 ≈2%' },
};
const L_WAFER_CM = 0.015;   // 150 μm modern wafer

/* AM1.5-ish photon mix: bucket → [λmin, λmax, share%]; >1100nm = 19% (verified) */
const MIX = [
  [350, 500, 15], [500, 700, 26], [700, 900, 21], [900, 1000, 10], [1000, 1100, 9], [1100, 1300, 19],
];
function samplePhoton() {
  let r = Math.random() * 100, acc = 0;
  for (const [lo, hi, w] of MIX) { acc += w; if (r < acc) return lo + Math.random() * (hi - lo); }
  return 550;
}
/* absorption probability over effective path (cm): P = 1 − exp(−α·L) */
function absProb(nm, Lcm) {
  const key = nearestKey(nm);
  return 1 - Math.exp(-ABS[key].a * Lcm);
}
function nearestKey(nm) {
  const ks = Object.keys(ABS).map(Number);
  return ks.reduce((b, k) => (Math.abs(k - nm) < Math.abs(b - nm) ? k : b), ks[0]);
}

/* ═══════════════ enter ═══════════════ */
export function enter(e) {
  env = e;
  root = new THREE.Group();
  e.root.add(root);
  photons = []; fate = { r: 0, a: 0, t: 0 }; rainOn = false;
  budgetBlocks = []; budgetStage = -1; layers = []; pickables = []; picked = null;
  ray = new THREE.Raycaster(); pointer = new THREE.Vector2();
  mode = 'structure';
  buildStructure();
}
export function bindEnv(e, r) { env = e; refresh = r; }

function clearRoot() {
  if (!root) return;
  while (root.children.length) root.remove(root.children[0]);
  photons = []; budgetBlocks = []; layers = []; pickables = []; picked = null;
}

/* ═══════════════ A · 真实结构（层状截面 + 点击讲解） ═══════════════ */
function buildStructure() {
  clearRoot();
  mode = 'structure';
  rainOn = false;
  const W = 9, D = 5.2;

  const layerDefs = [
    {
      id: 'texture', name: '金字塔绒面', h: 0.34, y: 0,
      color: 0x8ea4c8, rough: 0.35,
      zh: '<b>金字塔绒面</b>（各向异性腐蚀，高 2–5 μm）：入射光被斜面折进硅里，反射光再撞上另一座金字塔 → <b>二次机会</b>被吸收。裸抛光硅反射 ≈<b>35%</b>（由折射率数据计算：400nm 处 48%、1100nm 处 31%），绒面＋减反射膜压到 <b>≈2%</b>（工业典型值）',
      en: 'Random pyramids (2–5 μm) give reflected light a second chance; bare Si reflects ~35%',
    },
    {
      id: 'arc', name: '减反射膜 SiNx', h: 0.12, y: 0,
      color: 0x4f74d8, rough: 0.15, transparent: true, opacity: 0.55,
      zh: '<b>氮化硅减反射膜</b>：厚约 <b>75 nm</b>（可见光波长的 1/4），折射率 n≈2.05 介于空气(1)和硅(~3.5)之间 → 膜上下两束反射光<b>相消干涉</b>，电池呈现深蓝色。它还顺手用氢<b>钝化</b>表面缺陷',
      en: '75 nm quarter-wave SiNx: reflected waves cancel (dark blue look) + H passivation',
    },
    {
      id: 'emitter', name: 'n⁺ 发射极', h: 0.16, y: 0,
      color: 0x3b4d78, rough: 0.3,
      zh: '<b>n⁺ 发射极</b>（掺磷，厚约 0.3–1 μm）：第 3 章的"n 侧"。它和 p 型本体交界处就是 <b>PN 结</b>——内建电场把光生的电子-空穴对分开。真实电池里结深只有头发丝直径的 <b>1/50</b>',
      en: 'Phosphorus-doped emitter ~0.5 μm — the junction hides here',
    },
    {
      id: 'bulk', name: 'p 型硅片本体', h: 1.7, y: 0,
      color: 0x6e4450, rough: 0.45,
      zh: '<b>p 型硅片</b>：真实厚度约 <b>150 μm</b>（现代薄片，头发直径的 ~2 倍）。硅是<b>间接带隙</b>半导体——吸收系数低：550nm 绿光 1.6 μm 就被吸收，而 <b>1000nm 近红外要 ~156 μm</b>、1100nm 要 ~2.9 mm！所以红光经常要靠背面反射<b>多走几遍</b>（下一场景见）',
      en: '150 μm p-type wafer; indirect gap → red/NIR photons need multiple passes',
    },
    {
      id: 'back', name: '背面反射/电极', h: 0.2, y: 0,
      color: 0xb8c0cc, rough: 0.25, metal: true,
      zh: '<b>背面铝/银层</b>：既当电极（第 4 章电路的一端），又是<b>镜子</b>——没吸收完的红外光被弹回硅里再走一遍，路径翻倍 → 1000nm 光的吸收概率从 62% 升到 ~86%',
      en: 'Back metal = electrode + mirror: doubles the optical path for NIR',
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

  /* pyramid texture on the top face (drawn exaggerated ~×40; real 2–5 μm) */
  const texG = new THREE.ConeGeometry(0.52, 0.42, 4);
  const texM = new THREE.MeshStandardMaterial({ color: 0x9fb3d8, roughness: 0.3, metalness: 0.05 });
  const topLayer = layers[layers.length - 1]; // texture is first (topmost)
  for (let ix = 0; ix < 8; ix++) for (let iz = 0; iz < 5; iz++) {
    const p = new THREE.Mesh(texG, texM);
    p.position.set(-W / 2 + 0.6 + ix * ((W - 1.1) / 7), topLayer.mesh.position.y + topLayer.h / 2 + 0.19, -D / 2 + 0.55 + iz * ((D - 1.0) / 4));
    p.rotation.y = Math.PI / 4;
    root.add(p);
  }
  topLayer.mesh.position.y += 0.1; // sink slab slightly under pyramids

  /* name tags — fan out with minimum spacing so thin layers stay legible */
  let lastTagY = -1e9;
  [...layers].reverse().forEach(L => {           // topmost first
    let ty = L.mesh.position.y;
    if (ty > lastTagY - 0.62) ty = lastTagY - 0.62;
    lastTagY = ty;
    const t = makeTextSprite(L.name, 0.58, '#e2e8f0');
    t.position.set(-W / 2 - 1.6, ty, D / 2);
    root.add(t);
  });
  const totalTop = layers[layers.length - 1].mesh.position.y + layers[layers.length - 1].h / 2 + 0.5;
  const scaleTag = makeTextSprite('比例：绒面金字塔画大了 ~40 倍（真实 2–5 μm）', 0.5, '#94a3b8');
  scaleTag.position.set(2.2, totalTop + 1.5, D / 2);
  root.add(scaleTag);

  flyCamera(env.camera, env.controls, [7.5, 5.2, 9.5], [0, 1.1, 0], 1.3);
  showNarr(
    '原理三章讲完了。但<b>真实</b>的电池长什么样？这是一台商用电池的<b>层状截面</b>：<b>点击每一层</b>看它的真实尺寸和作用。一颗反射率 35% 的裸硅片怎么变成 27.81% 的世界纪录？本章用<b>被认证的真实数字</b>回答',
    'Real device cross-section — click each layer to inspect it',
    'blue'
  );
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

/* ═══════════════ B · 光阱（光子雨 + 三种表面） ═══════════════ */
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
  /* pyramids hint on top */
  const texG = new THREE.ConeGeometry(0.5, 0.38, 4);
  const texM = new THREE.MeshStandardMaterial({ color: 0x9fb3d8, roughness: 0.3, transparent: true, opacity: 0.35 });
  for (let ix = 0; ix < 8; ix++) for (let iz = 0; iz < 5; iz++) {
    const p = new THREE.Mesh(texG, texM);
    p.position.set(-W / 2 + 0.6 + ix * ((W - 1.1) / 7), 0.92, -D / 2 + 0.55 + iz * ((D - 1.0) / 4));
    p.rotation.y = Math.PI / 4;
    root.add(p);
  }
  const tag = makeTextSprite('观察每颗光子的命运：反射 / 吸收 / 穿过', 0.58, '#e2e8f0');
  tag.position.set(-3.2, 3.8, D / 2 + 0.6);
  root.add(tag);

  flyCamera(env.camera, env.controls, [7.5, 7.2, 9.8], [0, 0.2, 0], 1.3);
  rainOn = true;
  applyOptics(opticsMode, true);
  showNarr(
    opticsMode === 'bare'
      ? '现在下起<b>光子雨</b>：颜色 = 波长，灰色 = 眼睛看不见的近红外。左上角实时统计每颗光子的命运。看：<b>裸抛光</b>硅把约 1/3 的光直接弹回太空——真实电池的第一件事是把光<b>留住</b>'
      : `现在换成【${OPTICS[opticsMode].label}】，看左上角统计怎么变化：反射率下降 → <b>吸收发电</b>的比例上升`,
    'Photon rain: watch reflect / absorb / transmit tally live',
    'blue'
  );
}

function spawnRainPhoton() {
  if (!rainOn || mode !== 'trap') return;
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
  const Lcm = L_WAFER_CM * (opticsMode === 'bare' ? 1 : opt.path);   // 绒面→光路加倍以上
  let fateKind;
  if (irPass) fateKind = 't';                                  // sub-gap: straight through
  else if (Math.random() < opt.R) fateKind = 'r';              // reflected at front
  else fateKind = (Math.random() < absProb(nm, Lcm)) ? 'a' : 't';

  photons.push({ mesh, nm, kind: fateKind, x, z, t: 0 });
}

function stepPhotons(dt) {
  for (let i = photons.length - 1; i >= 0; i--) {
    const ph = photons[i];
    ph.t += dt;
    if (ph.phase === undefined) {
      /* fly down to surface */
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
        } else { ph.phase = 'through'; fate.t++; }
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

let fateTag = null, fateEl = null;
function updateFateTags() {
  const n = fate.r + fate.a + fate.t;
  if (!n) return;
  const pr = Math.round(100 * fate.r / n), pa = Math.round(100 * fate.a / n), pt = 100 - pr - pa;
  if (!fateEl) {
    fateEl = document.createElement('div');
    fateEl.className = 'fate-counter';
    const stage = document.getElementById('stage');
    stage.appendChild(fateEl);
  }
  fateEl.innerHTML = `已统计 ${n} 颗<br>
    <span style="color:#94a3b8">反射 ${pr}%</span> ·
    <span style="color:#fbbf24">吸收发电 ${pa}%</span> ·
    <span style="color:#64748b">穿过 ${pt}%</span><br>
    <small style="color:#64748b">当前表面：${OPTICS[opticsMode].label}</small>`;
}

function applyOptics(m, silent) {
  opticsMode = m;
  fate = { r: 0, a: 0, t: 0 };
  if (fateEl) { fateEl.innerHTML = ''; }
  if (silent) return;
  const msg = {
    bare: '【裸抛光硅】硅折射率 ~3.5（可见光），菲涅耳反射 R=((n−1)/(n+1))² ≈ <b>31–48%</b>，加权约 <b>35%</b> —— 三分之一的光白白弹走！',
    text: '【绒面】随机金字塔（各向异性腐蚀）让反射光撞上相邻金字塔斜面 → <b>二次入射机会</b>；斜折的光在片内走<b>更长的路</b>。加权反射率 ≈<b>8%</b>（示意值）',
    both: '【绒面 + 减反射膜】75nm 四分之一波长 SiNx（n≈2.05）→ 上下表面反射光<b>相消干涉</b>；加上绒面，工业加权反射率 ≈<b>2%</b> —— 这就是商用电池深蓝色的原因！',
  }[m];
  showNarr(msg, { bare: 'bare polished', text: 'textured', both: 'textured + ARC' }[m], m === 'bare' ? 'red' : 'gold');
}

/* ═══════════════ C · 效率天平（100% 阳光的去向） ═══════════════ */
const BUDGET = [
  {
    key: 'all', label: '☀️ 全部阳光', cls: 'white',
    zh: '这是落在 1 m² 电池上的全部阳光功率：<b>1000 W/m²</b>（AM1.5 标准测试光谱）。100 个方块 = 100%。真实结果怎么算？<b>效率 η = 电功率 ÷ 光功率</b>。往下走，看每一块的去向——数字全部来自公开认证文献',
    en: '1000 W/m² = 100 blocks. Watch where every block goes',
  },
  {
    key: 'subgap', label: '19% 穿过', cls: 'sub',
    zh: '<b>19% 直接穿过</b>：这些光子能量 < 1.12 eV（波长 > 1100 nm），"踢不动"电子——第 4 章你亲手发射过。硅对它们是<b>透明</b>的。这是光谱的第一笔损耗，无法用任何工艺消除（单结硅）',
    en: '19% below the 1.12 eV gap passes through untouched',
  },
  {
    key: 'thermal', label: '33% 变热', cls: 'heat',
    zh: '<b>33% 热化变热</b>：蓝光光子 ~3.1 eV，但电子只需要 1.12 eV 就能跳上导带——<b>多出的能量在皮秒内变成热</b>（第 4 章的红色涟漪）。一光子最多产生<b>一对</b>电子-空穴，多余能量拿不回来',
    en: '33% thermalization: excess photon energy above the gap becomes heat',
  },
  {
    key: 'sq', label: '光谱上限 48%', cls: 'mid',
    zh: '只剩 <b>48%</b> —— 这是"只考虑光谱"的天花板。但还有复合：n 侧电子总要有一部分和空穴复合发出光子（细节平衡），这给电压封了顶。硅的<b>辐射复合极限（SQ 极限）≈32%</b>（理想极限 33.7% 出现在带隙 1.34 eV 的材料上，硅不是最优）',
    en: 'Radiative (Shockley–Queisser) limit for Si ≈32%; optimum gap 1.34 eV gives 33.7%',
  },
  {
    key: 'auger', label: '俄歇 → 29.4%', cls: 'auger',
    zh: '真实硅晶体里还有一种更快的复合：<b>俄歇复合</b>（电子-空穴复合时把能量踢给第三个载流子，而不是发光）。把它算进去，硅的理论极限降到 <b>29.4%</b>（Richter et al. 2013）——这是单结硅<b>物理上</b>的天花板',
    en: 'Auger recombination lowers the Si ceiling to 29.4% (Richter 2013)',
  },
  {
    key: 'real', label: '纪录 27.81%', cls: 'record',
    zh: '<b>27.81%</b> —— 单结硅世界纪录（LONGi HIBC，德国 ISFH 认证，2025-04-11；此前 2022-11 首破 26.81%）。离 29.4% 的物理极限只差 <b>1.6 个百分点</b>！再扣栅线遮挡/电阻/大面积均匀性，<b>量产电池 ≈24%</b>。想更高？换打法：<b>钙钛矿/硅叠层 34.85%</b>（NREL 认证 2025-04，双结突破单结极限，理论 ~43%）',
    en: 'Record 27.81% (LONGi HIBC, ISFH 2025); commercial ≈24%; tandem 34.85% (NREL)',
  },
];
const BLOCK_COLORS = {
  white: 0xe8eaf0, sub: 0x475569, heat: 0xdc2626, mid: 0x0ea5e9,
  auger: 0xf59e0b, record: 0xd8b25c, lost: 0x1e293b,
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
  const tag = makeTextSprite('100 块 = 1000 W/m²（AM1.5 标准阳光）', 0.7, '#e8eaf0');
  tag.position.set(4.5, 10.6, 0);
  root.add(tag);

  flyCamera(env.camera, env.controls, [4.6, 4.6, 11.5], [4.5, 1.6, 0], 1.3);
}

function paintBlocks(from, to, cls) {
  /* colors blocks[from..to-1] to cls (row-major from top-left) */
  addAnim({
    duration: 0.9,
    update(p) {
      const n = Math.round(from + (to - from) * p);
      for (let i = from; i < n; i++) {
        const b = budgetBlocks[i];
        if (b.state !== cls) {
          b.mesh.material.color.set(BLOCK_COLORS[cls]);
          b.state = cls;
          b.mesh.position.z = 0.6;
        }
      }
    },
    onComplete() {
      for (let i = from; i < to; i++) {
        budgetBlocks[i].mesh.material.color.set(BLOCK_COLORS[cls]);
        budgetBlocks[i].state = cls;
        budgetBlocks[i].mesh.position.z = 0.6;
      }
    },
  });
}

function budgetGoto(stageIdx) {
  const st = BUDGET[stageIdx];
  switch (st.key) {
    case 'all': paintBlocks(0, 100, 'white'); break;
    case 'subgap': paintBlocks(81, 100, 'sub'); break;
    case 'thermal': paintBlocks(48, 81, 'heat'); break;
    case 'sq': paintBlocks(32, 48, 'lost'); break;
    case 'auger': paintBlocks(29, 32, 'lost'); break;
    case 'real': paintBlocks(24, 29, 'lost'); budgetBlocks[24].mesh.material.color.set(BLOCK_COLORS.record); break;
  }
  budgetStage = stageIdx;
  showNarr(st.zh, st.en, stageIdx >= 4 ? 'gold' : 'blue');
}

/* ═══════════════ actions ═══════════════ */
export function actions() {
  if (mode === 'structure') {
    return {
      buttons: [
        { label: '🧱 逐层点击讲解（点击 3D 层！）', cls: '', disabled: true },
        { label: '🌧 去光子雨：光阱与反射', cls: 'blue', onClick: () => { buildTrap(); refresh && refresh(); } },
        { label: '⚖️ 去效率天平', cls: 'gold', onClick: () => { buildBudget(); refresh && refresh(); } },
        { label: '🔁 重建截面', cls: '', onClick: () => { buildStructure(); refresh && refresh(); } },
      ],
      sliders: [],
    };
  }
  if (mode === 'trap') {
    return {
      buttons: [
        { label: OPTICS.bare.label, cls: opticsMode === 'bare' ? 'red' : '', onClick: () => applyOptics('bare') },
        { label: OPTICS.text.label, cls: opticsMode === 'text' ? 'gold' : '', onClick: () => applyOptics('text') },
        { label: OPTICS.both.label, cls: opticsMode === 'both' ? 'green' : '', onClick: () => applyOptics('both') },
        { label: '🧱 回到结构', cls: 'blue', onClick: () => { buildStructure(); refresh && refresh(); } },
        { label: '⚖️ 效率天平', cls: 'gold', onClick: () => { buildBudget(); refresh && refresh(); } },
      ],
      sliders: [],
    };
  }
  /* budget */
  const nav = BUDGET.map((b, i) => ({
    label: (i === budgetStage ? '▶ ' : '') + b.label,
    cls: i === budgetStage ? 'gold' : '',
    onClick: () => budgetGoto(i),
  }));
  return {
    buttons: [
      ...nav,
      { label: '🧱 回到结构', cls: 'blue', onClick: () => { buildStructure(); refresh && refresh(); } },
    ],
    sliders: [],
  };
}

/* ═══════════════ per-frame ═══════════════ */
let rainAcc = 0;
export function update(dt) {
  if (!root) return;
  if (mode === 'trap' && rainOn) {
    rainAcc += dt;
    if (rainAcc > 0.16) { rainAcc = 0; if (photons.length < 14) spawnRainPhoton(); }
    stepPhotons(dt);
  }
}

/* click-to-pick for the structure scene */
export function onPointerUp(px, py, movedSmall) {
  if (mode !== 'structure' || !movedSmall) return;
  pickLayer(px, py);
}
export function leave() {
  rainOn = false;
  photons = [];
  if (fateEl) { fateEl.remove(); fateEl = null; }
  layers = []; pickables = []; budgetBlocks = [];
}
