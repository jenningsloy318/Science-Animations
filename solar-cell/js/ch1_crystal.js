/* ══════════════════════════════════════════════════
   ch1_crystal.js — 第1章：从原子到晶体
   A. 全景：散乱原子 → 结晶队形 / 玻璃乱堆
   B. 特写：中心 Si + 4 邻居四面拉手（🟡我出的 🔵邻居出的）
      拉近看单条拉手：每边各出 1 电子 → 共享电子对
   C. 滑块驱动 3D：1原子 → 2成键 → 8小簇 → 64晶格 → 10²²
   （能带详解已移入第2章）
   ══════════════════════════════════════════════════ */
import * as THREE from 'three';
import { COL, makeTextSprite, addAnim, ease, flyCamera } from './core.js';
import { showNarr } from './ui.js';

export const meta = {
  nav: '🧊 从原子到晶体',
  title: '🧊 太阳能电池 · 第1章：从原子到晶体——什么是共价键？',
  sub: 'Chapter 1 · From atoms to crystal: covalent bonds',
};

let root, env;
let atoms = [];
let bonds = [];
let mode = 'scattered';          // scattered | crystal | glass
let viewMode = 'panorama';       // panorama | closeup
let bandStage = 1;               // 1..5 → N = 1,2,8,64,10²²
let arrived = [];
let refreshActionsRef = null;

/* ── octet-rule teaching cards (cycling button) ── */
const WHY_NARR = [
  ['🚌 <b>把原子想成一辆巴士</b>：第一排（K 层）只有 <b>2 个座位</b>，第二排（L 层）有 <b>8 个</b>。前排离司机（原子核）近、最舒服（能量最低），大家抢着坐——坐满了才轮到下一排。电子排布 2, 8, 4 就是这么来的',
   'Shells are bus rows: K holds 2 seats, L holds 8', 'blue'],
  ['<b>坐满外层 = 心满意足</b>。氦 He(2)、氖 Ne(2,8)、氩 Ar(2,8,8) 外层全坐满——它们几乎不与任何东西反应，化学家叫它们<b>惰性气体</b>（惰 = 懒：什么都不需要！）。没坐满的原子都想变成它们这样',
   'Full outer shell = satisfied. Noble gases barely react with anything', 'gold'],
  ['<b>怎么凑满？各有高招</b>：氯 Cl(2,8,7) 差 1 个 → <b>抢</b> 1 个；钠 Na(2,8,1) 多 1 个 → <b>丢</b> 1 个变 (2,8)；而硅 Si(2,8,4) 正好差一半——抢 4 个、丢 4 个都太费劲 → <b>和邻居共享</b>！',
   'Si is halfway: grabbing or dumping 4 costs too much → SHARE', 'red'],
];
let whyIdx = 0;
function whyNext() {
  const [zh, en, cls] = WHY_NARR[whyIdx];
  showNarr(zh, en, cls, 0);
  whyIdx++;
  refreshActionsRef && refreshActionsRef();
}

const NX = 6, NY = 2, NZ = 5, SP = 1.55;

/* ───────── panorama: lattice ───────── */
export function enter(e) {
  env = e;
  root = new THREE.Group();
  e.root.add(root);
  root.position.set(-NX * SP / 2, -1.2, -NZ * SP / 2);
  atoms = []; bonds = []; mode = 'scattered'; viewMode = 'panorama';
  arrived = []; bandStage = 1; whyIdx = 0;

  const atomGeo = new THREE.SphereGeometry(0.46, 18, 18);
  for (let z = 0; z < NZ; z++) for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) {
    const m = new THREE.Mesh(atomGeo, new THREE.MeshStandardMaterial({
      color: COL.silicon, roughness: .4, metalness: .3, emissive: 0x1a2333, emissiveIntensity: .4,
    }));
    const target = new THREE.Vector3(x * SP, y * SP, z * SP);
    const scatter = new THREE.Vector3(-1 + Math.random() * (NX * SP + 2), -1 + Math.random() * 3.6, -1 + Math.random() * (NZ * SP + 2));
    const glass = new THREE.Vector3(0.3 + Math.random() * (NX * SP - 0.6), -0.8 + Math.random() * 2.8, 0.3 + Math.random() * (NZ * SP - 0.6));
    m.position.copy(scatter);
    root.add(m);
    atoms.push({ mesh: m, x, y, z, target, scatter, glass });
  }
  const bondGeo = new THREE.CylinderGeometry(0.07, 0.07, SP, 8);
  for (const a of atoms) {
    for (const [dx, dy, dz] of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
      const n = atoms.find(o => o.x === a.x + dx && o.y === a.y + dy && o.z === a.z + dz);
      if (!n) continue;
      const mat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: .5, transparent: true, opacity: 0 });
      const b = new THREE.Mesh(bondGeo, mat);
      b.position.copy(a.target).lerp(n.target, 0.5);
      b.lookAt(n.target);
      b.rotateX(Math.PI / 2);
      b.visible = false;
      root.add(b);
      bonds.push({ mesh: b, a, b: n });
    }
  }

  const tag = makeTextSprite('硅原子 Si：2, 8, 4 — 最外层 4 个电子', 0.8, '#94a3b8');
  tag.position.set(NX * SP / 2, 4.3, NZ * SP / 2);
  root.add(tag);

  buildCloseup();

  showNarr(
    '一堆<b>硅原子</b>（Si：2, 8, 4）散落在空间里。它们接下来会排队成<b>晶体</b>。为什么排队？先<b>🔍 放大看一对原子</b>——看懂"共价键"，一切就通了！',
    'Scattered silicon atoms. Zoom in first: understand the covalent bond!',
    'blue'
  );
}

/* ───────── closeup: atoms & covalent bond, slider-driven ───────── */
let cp = null;

function buildCloseup() {
  const g = new THREE.Group();
  g.visible = false;
  env.root.add(g);

  const atomGeo = new THREE.SphereGeometry(1.0, 28, 28);
  const mkAtom = (x, label) => {
    const m = new THREE.Mesh(atomGeo, new THREE.MeshStandardMaterial({
      color: COL.silicon, roughness: .32, metalness: .22, emissive: 0x1a2333, emissiveIntensity: .4,
    }));
    m.position.set(x, 2.6, 0);
    g.add(m);
    const tag = makeTextSprite(label, 0.62, '#cbd5e1');
    tag.position.set(0, -1.35, 0);
    m.add(tag);
    return m;
  };
  const atomA = mkAtom(-3.4, 'Si · 2,8,4');
  const atomB = mkAtom(3.4, 'Si · 2,8,4');

  // outer-shell electrons: 4 per atom
  const eGeo = new THREE.SphereGeometry(0.17, 14, 14);
  const eMat = () => new THREE.MeshStandardMaterial({
    color: COL.electron, emissive: COL.electron, emissiveIntensity: 1.15,
  });
  const shellEs = [];
  for (let i = 0; i < 8; i++) {
    const side = i < 4 ? 'A' : 'B';
    const m = new THREE.Mesh(eGeo, eMat());
    g.add(m);
    shellEs.push({ mesh: m, side, phase: (i % 4) * Math.PI / 2, shared: false, sharedPhase: 0 });
  }

  // bond cloud + labels
  const cloud = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.42, 1.9, 8, 16),
    new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.16 })
  );
  cloud.rotation.z = Math.PI / 2;
  cloud.position.set(0, 2.6, 0);
  cloud.visible = false;
  g.add(cloud);
  const shareTag = makeTextSprite('共享电子对 ∞', 0.66, '#fbbf24');
  shareTag.position.set(0, 4.9, 0);
  shareTag.visible = false;
  g.add(shareTag);

  // extras container (stages 3–5)
  const extras = new THREE.Group();
  extras.visible = false;
  g.add(extras);

  // "10²²" label
  const manyTag = makeTextSprite('实际：一克硅 ≈ 10²² 个原子！', 0.62, '#fbbf24');
  manyTag.position.set(0, 6.4, 0);
  manyTag.visible = false;
  g.add(manyTag);

  // ── tetrahedral "4 neighbors" view ──
  const tetra = new THREE.Group();
  tetra.visible = false;
  g.add(tetra);
  const center = new THREE.Vector3(0, 2.6, 0);
  const dirs = [
    new THREE.Vector3(1, 1, 1),
    new THREE.Vector3(1, -1, -1),
    new THREE.Vector3(-1, 1, -1),
    new THREE.Vector3(-1, -1, 1),
  ].map(v => v.normalize());
  const BL = 3.3;
  const cMat = new THREE.MeshStandardMaterial({
    color: 0x8a94a8, roughness: .32, metalness: .22, emissive: 0x1a2333, emissiveIntensity: .5,
  });
  const cAtom = new THREE.Mesh(atomGeo, cMat);
  cAtom.position.copy(center);
  tetra.add(cAtom);
  const cTag = makeTextSprite('我 Si · 4 只手', 0.56, '#e2e8f0');
  cTag.position.set(0, -1.45, 0);
  cAtom.add(cTag);

  const pairs = [];
  const nGeo = new THREE.SphereGeometry(0.8, 20, 20);
  const stickGeo = new THREE.CylinderGeometry(0.06, 0.06, BL, 8);
  const cloudGeo = new THREE.CapsuleGeometry(0.3, 0.8, 6, 12);
  const eGeo2 = new THREE.SphereGeometry(0.14, 10, 10);
  dirs.forEach((d, i) => {
    const nb = new THREE.Mesh(nGeo, new THREE.MeshStandardMaterial({
      color: COL.silicon, roughness: .4, metalness: .3, emissive: 0x1a2333, emissiveIntensity: .4,
    }));
    nb.position.copy(center).addScaledVector(d, BL);
    tetra.add(nb);

    const stick = new THREE.Mesh(stickGeo, new THREE.MeshStandardMaterial({ color: 0x475569, roughness: .5 }));
    stick.position.copy(center).addScaledVector(d, BL / 2);
    stick.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
    tetra.add(stick);

    const pairCloud = new THREE.Mesh(cloudGeo, new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.16 }));
    pairCloud.position.copy(center).addScaledVector(d, BL / 2);
    pairCloud.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
    tetra.add(pairCloud);

    // the two shared electrons (rotate around the bond in update)
    const perp = new THREE.Vector3(0, 1, 0).cross(d).normalize();
    if (perp.lengthSq() < 0.01) perp.set(1, 0, 0);
    const e1 = new THREE.Mesh(eGeo2, new THREE.MeshStandardMaterial({ color: COL.electron, emissive: COL.electron, emissiveIntensity: 1.2 }));
    const e2 = new THREE.Mesh(eGeo2, new THREE.MeshStandardMaterial({ color: 0x60a5fa, emissive: 0x60a5fa, emissiveIntensity: 1.2 }));
    tetra.add(e1, e2);
    pairs.push({ e1, e2, d, mid: center.clone().addScaledVector(d, BL / 2), perp, ang: i * Math.PI / 3 });
  });

  const cntTag = makeTextSprite('邻居：4 个  ·  共享电子对：4 对  ·  身边电子：8 ✓', 0.62, '#fbbf24');
  cntTag.position.set(0, 6.3, 0);
  tetra.add(cntTag);
  const handsTag = makeTextSprite('🟡 我出的电子 · 🔵 邻居出的电子（每条拉手各出1个）', 0.5, '#94a3b8');
  handsTag.position.set(0, -1.4, 3.4);
  tetra.add(handsTag);

  cp = { group: g, atomA, atomB, shellEs, cloud, shareTag, extras, manyTag, bonded: false, t: 0, extraStage: 0, tetra, pairs, tetraOn: false };}

function enterCloseup() {
  viewMode = 'closeup';
  bondFocus = false;
  root.visible = false;
  cp.group.visible = true;
  // 直接进入 4 邻居全景（这就是真实的共价键结构）
  cp.bonded = true;
  cp.tetraOn = true;
  cp.atomA.visible = false;
  cp.atomB.visible = false;
  cp.shellEs.forEach(e => e.mesh.visible = false);
  cp.cloud.visible = false;
  cp.shareTag.visible = false;
  cp.extras.visible = false;
  cp.manyTag.visible = false;
  cp.tetra.visible = true;
  flyCamera(env.camera, env.controls, [7.0, 4.6, 9.5], [0, 2.4, 0], 1.4);
  showNarr(
    '🔬 显微镜模式！看<b>中心 Si</b> 和它的 <b>4 个邻居</b>手拉手（是 4 个，不是 8 个！）。每条拉手里 <b>2 个电子</b>：🟡金色是我出的，🔵蓝色是邻居出的。数身边的电子：4 × 2 = <b>8 ✓</b>。先按 <b>🚌 为什么想凑满 8</b>，再按 <b>🔬 拉近看一条拉手</b>',
    'Center Si + 4 neighbors (not 8!). Each bond: 2 electrons. 4×2=8 ✓',
    'blue'
  );
  refreshActionsRef && refreshActionsRef();
}

function exitCloseup() {
  viewMode = 'panorama';
  bondFocus = false;
  cp.group.visible = false;
  cp.tetra.visible = false; cp.tetraOn = false;
  root.visible = true;
  flyCamera(env.camera, env.controls, [9, 5.5, 12], [0, 0.6, 0], 1.2);
  refreshActionsRef && refreshActionsRef();
}

/* 拉近看一条拉手：我的1个 + 邻居的1个，共享电子对 */
let bondFocus = false;
function focusBond() {
  if (!cp || !cp.tetraOn || bondFocus) return;
  bondFocus = true;
  const d = new THREE.Vector3(1, 1, 1).normalize();
  const mid = new THREE.Vector3(0, 2.6, 0).addScaledVector(d, 1.65);
  flyCamera(env.camera, env.controls, [mid.x + 2.4, mid.y + 1.5, mid.z + 2.8], [mid.x, mid.y, mid.z], 1.5);
  showNarr(
    '这是其中<b>一条拉手</b>：🟡 我出的 1 个 + 🔵 邻居出的 1 个，两个电子一起绕着拉手转，被两边的原子核<b>同时吸住</b>——谁也拿不走，这就叫<b>共享</b>。4 条拉手 × 2 个 = <b>8 ✓ 凑满</b>，队形就锁死了',
    'One bond: my electron + neighbor\u2019s electron, orbiting together — shared!',
    'gold', 0
  );
  refreshActionsRef && refreshActionsRef();
}


/* rebuild extras group for stage 3/4/5 and manage visibility */
function buildExtras(stage) {
  const g = cp.extras;
  g.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
    }
  });
  g.clear();
  cp.extraStage = stage;

  const mkMat = () => new THREE.MeshStandardMaterial({
    color: COL.silicon, roughness: .4, metalness: .3, emissive: 0x1a2333, emissiveIntensity: .4,
    transparent: true, opacity: 0,
  });
  const stickMat = () => new THREE.MeshStandardMaterial({
    color: 0x475569, roughness: .5, transparent: true, opacity: 0,
  });
  const fadeTargets = [];
  const addAtom = (x, y, z, r) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 16), mkMat());
    m.position.set(x, y, z);
    g.add(m); fadeTargets.push(m);
    return m;
  };
  const addStick = (a, b, rad) => {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, len, 8), stickMat());
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.lookAt(b);
    m.rotateX(Math.PI / 2);
    g.add(m); fadeTargets.push(m);
  };

  if (stage === 3) {
    // 6 extra atoms around the bonded pair → 8 total
    const r = 0.62;
    const spots = [
      [-3.6, 1.15, -1.9], [-3.6, 4.05, -1.9], [3.6, 1.15, -1.9], [3.6, 4.05, -1.9],
      [-3.6, 1.15, 1.9], [3.6, 4.05, 1.9],
    ];
    const ms = spots.map(s => addAtom(s[0], s[1], s[2], r));
    addStick(ms[0].position, new THREE.Vector3(-1.9, 2.6, 0), 0.05);
    addStick(ms[1].position, new THREE.Vector3(-1.9, 2.6, 0), 0.05);
    addStick(ms[2].position, new THREE.Vector3(1.9, 2.6, 0), 0.05);
    addStick(ms[3].position, new THREE.Vector3(1.9, 2.6, 0), 0.05);
    addStick(ms[4].position, ms[0].position, 0.05);
    addStick(ms[5].position, ms[3].position, 0.05);
  } else if (stage >= 4) {
    // 4×4×4 mini lattice around the pair
    const n = 4, sp2 = 2.35;
    const r = stage === 4 ? 0.44 : 0.44;
    const grid = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) {
      const x = (i - 1.5) * sp2, y = 2.6 + (j - 1.5) * sp2, z = (k - 1.5) * sp2;
      // skip the two central cells occupied by the pair
      if (Math.abs(x) < 1.2 && Math.abs(z) < 1.2 && Math.abs(y - 2.6) < 1.2) {
        grid.push(null);
        continue;
      }
      grid.push(addAtom(x, y, z, r));
    }
    // sticks along grid axes
    const key = (i, j, k) => (i * n + j) * n + k;
    const cells = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) {
      cells.push({ i, j, k, mesh: grid[key(i, j, k)] });
    }
    for (const c of cells) {
      if (!c.mesh) continue;
      for (const [di, dj, dk] of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
        const i2 = c.i + di, j2 = c.j + dj, k2 = c.k + dk;
        if (i2 >= n || j2 >= n || k2 >= n) continue;
        const nb = grid[key(i2, j2, k2)];
        if (nb) addStick(c.mesh.position, nb.position, 0.04);
      }
    }
  }

  // fade all extras in
  g.visible = fadeTargets.length > 0;
  addAnim({
    duration: 1.2,
    update(p) {
      fadeTargets.forEach(m => { m.material.opacity = (stage === 3 ? 0.95 : 0.85) * ease.out(p); });
    },
  });
}

/* master layout for closeup view per slider stage */
function layoutCloseup(stage, fly = true) {
  if (!cp) return;
  // leaving tetra view (slider drag) → back to pair view
  if (cp.tetraOn) {
    cp.tetra.visible = false; cp.tetraOn = false;
    cp.atomA.visible = true;
    refreshActionsRef && refreshActionsRef();
  }
  if (stage >= 2 && !cp.bonded) {
    // dragging slider past 2 implies bonding — run the same physics step
    cp.bonded = true;
    cp.atomA.position.x = -1.75;
    cp.atomB.position.x = 1.75;
    cp.shellEs[0].shared = true; cp.shellEs[0].sharedPhase = 0;
    cp.shellEs[4].shared = true; cp.shellEs[4].sharedPhase = Math.PI;
    cp.cloud.visible = true;
    cp.shareTag.visible = true;
  }

  // stage 1: single atom centered
  if (stage === 1) {
    cp.atomB.visible = false;
    cp.cloud.visible = false;
    cp.shareTag.visible = false;
    cp.shellEs.forEach(e => { if (e.side === 'B') e.mesh.visible = false; e.shared = false; });
    cp.atomA.position.x = 0;
    cp.extras.visible = false;
    cp.manyTag.visible = false;
    if (fly) flyCamera(env.camera, env.controls, [0.2, 3.1, 7.2], [0, 2.6, 0], 1.1);
    return;
  }

  cp.atomA.position.x = -1.75;
  cp.atomB.visible = true;
  cp.shellEs.forEach(e => e.mesh.visible = true);
  if (cp.bonded) { cp.cloud.visible = true; cp.shareTag.visible = true; }

  if (stage === 2) {
    cp.extras.visible = false;
    cp.manyTag.visible = false;
    if (fly) flyCamera(env.camera, env.controls, [0.3, 3.6, 9.0], [0, 2.7, 0], 1.2);
  } else {
    if (cp.extraStage !== stage) buildExtras(stage);
    cp.manyTag.visible = stage === 5;
    if (fly) {
      if (stage === 3) flyCamera(env.camera, env.controls, [0.3, 3.9, 12.5], [0, 2.7, 0], 1.3);
      else flyCamera(env.camera, env.controls, [1.5, 5.4, 16.5], [0, 2.8, 0], 1.4);
    }
  }
}

/* slider handler shared by closeup & panorama */
function setBandStage(v) {
  bandStage = v;
  if (viewMode === 'closeup') layoutCloseup(v, true);
}

/* ───────── panorama transitions ───────── */
function goTo(dest, done) {
  const starts = atoms.map(a => a.mesh.position.clone());
  arrived = atoms.map(() => 0);
  const delays = atoms.map((a, i) => (dest === 'target' ? (a.x + a.y + a.z) * 0.13 : Math.random() * 0.5));
  const isCrystal = dest === 'target';
  const idxOf = a => atoms.indexOf(a);
  addAnim({
    duration: 2.4,
    update(p) {
      atoms.forEach((a, i) => {
        const q = Math.min(1, Math.max(0, (p * 2.4 - delays[i]) / 0.9));
        arrived[i] = q;
        a.mesh.position.lerpVectors(starts[i], a[dest], ease.inOut(q));
      });
      bonds.forEach(bd => {
        if (isCrystal) {
          const alpha = Math.min(arrived[idxOf(bd.a)], arrived[idxOf(bd.b)]);
          bd.mesh.visible = alpha > 0.02;
          bd.mesh.material.opacity = alpha;
        } else {
          bd.mesh.material.opacity *= 0.85;
          if (bd.mesh.material.opacity < 0.03) bd.mesh.visible = false;
        }
      });
    },
    onComplete: done,
  });
}

function crystallize() {
  if (viewMode === 'closeup') exitCloseup();
  if (mode === 'crystal') return;
  mode = 'crystal';
  goTo('target', () => {
    showNarr(
      '<b>晶体</b> = 原子按<b>同一套队形无限重复</b>排列的固体（钻石、食盐、石英都是）。为什么自觉排队？每个 Si 与 4 个邻居<b>共享电子对</b>凑满 8 —— 共价键把队形锁死。太阳能电池的硅纯度高达 99.9999999%',
      'Crystal = a repeating pattern locked by covalent bonds',
      'green'
    );
  });
  showNarr('原子们漂向自己的位置……和邻居<b>手拉手</b>', 'Atoms drift into formation and hold hands', '', 2000);
}

function glassify() {
  if (mode === 'glass' || mode === 'scattered') return;
  mode = 'glass';
  goTo('glass', () => {
    showNarr(
      '如果原子<b>乱堆</b> = <b>非晶体</b>（玻璃就这样）。没有队形 → 没有整齐的"座位表" → 做不出好电池',
      'Random stacking = amorphous glass',
      'blue'
    );
  });
}

function scatter() {
  mode = 'scattered';
  goTo('scatter');
}

/* ───────── per-frame ───────── */
export function update(dt, t) {
  if (!root) return;

  // panorama: thermal jitter of crystallized atoms
  atoms.forEach((a, i) => {
    if (viewMode === 'panorama' && mode === 'crystal' && arrived[i] >= 1) {
      a.mesh.position.copy(a.target).add(new THREE.Vector3(
        Math.sin(t * 7 + i) * 0.035, Math.sin(t * 6 + i * 2) * 0.035, Math.cos(t * 8 + i) * 0.035
      ));
    }
  });

  // closeup: electrons orbit
  if (viewMode === 'closeup' && cp) {
    cp.t += dt;
    for (const e of cp.shellEs) {
      if (!e.mesh.visible) continue;
      if (e.shared && cp.bonded) {
        const th = cp.t * 1.5 + e.sharedPhase;
        e.mesh.position.set(
          Math.sin(th) * 2.0,
          2.6 + Math.sin(th * 2) * 0.22,
          Math.sin(2 * th) * 1.15
        );
      } else {
        const th = cp.t * 1.15 + e.phase;
        const cx = e.side === 'A' ? cp.atomA.position.x : cp.atomB.position.x;
        e.mesh.position.set(
          cx + Math.cos(th) * 1.85,
          2.6 + Math.sin(th * 0.7 + e.phase) * 0.5,
          Math.sin(th) * 1.85
        );
      }
    }
    // tetra view: shared pairs rotate around each bond
    if (cp.tetraOn) {
      for (const p of cp.pairs) {
        p.ang += dt * 1.6;
        const off = p.perp.clone().multiplyScalar(0.4);
        const rot = p.ang;
        const q = new THREE.Quaternion().setFromAxisAngle(p.d, rot);
        p.e1.position.copy(p.mid).add(off.clone().applyQuaternion(q));
        p.e2.position.copy(p.mid).add(off.clone().applyQuaternion(q).multiplyScalar(-1));
      }
      cp.tetra.rotation.y = Math.sin(t * 0.25) * 0.35;
    }
    // stage-5 lattice breathing (too many atoms to jitter individually — subtle scale)
    if (bandStage === 5 && cp.extras.visible) {
      const s = 1 + Math.sin(t * 1.6) * 0.006;
      cp.extras.scale.setScalar(s);
    }
  }
}

const BAND_NARR = [
  ['单个 Si 原子：最外层 4 个金色电子 —— 它能伸出 <b>4 只手</b>', 'One atom: 4 outer electrons = 4 hands', 'blue'],
  ['2 个原子 = 1 条拉手：🟡我出 1 个 + 🔵邻居出 1 个，<b>共享</b>在中间转', 'Two atoms, one shared pair', 'blue'],
  ['8 个原子小簇：每个 Si 与 4 个邻居拉手，<b>四面体</b>队形开始成形', '8 atoms: tetrahedral formation', 'blue'],
  ['64 个原子：整齐的队形向四面八方<b>重复重复再重复</b>——这就是晶体的样子', '64 atoms: repeating formation = crystal', 'blue'],
  ['一克硅 ≈ 10²² 个原子全部这样手拉手 = <b>晶体</b>！这么多原子排队，电子的“座位表”会挤成什么样？—— <b>下一章专门讲：能带</b>', '10²² atoms hand-in-hand = crystal. Next chapter: bands!', 'gold'],
];

export function actions() {
  const inCloseup = viewMode === 'closeup';
  const btns = [];
  if (!inCloseup) {
    btns.push(
      { label: '🔍 放大看共价键', cls: 'gold', id: 'btnZoom', onClick: () => enterCloseup() },
      { label: '🔒 结晶（列队成晶体）', cls: 'green', id: 'btnCrystal', onClick: () => crystallize() },
      { label: '🥛 变成玻璃（乱堆）', cls: 'blue', id: 'btnGlass', onClick: () => glassify() },
      { label: '💨 打散重来', cls: '', onClick: () => scatter() },
    );
  } else {
    btns.push(
      {
        label: whyIdx === 0 ? '🚌 为什么想凑满 8？' : whyIdx < WHY_NARR.length ? '➡️ 继续看为什么' : '✅ 已明白为什么',
        cls: 'blue', id: 'btnWhy', disabled: whyIdx >= WHY_NARR.length,
        onClick: () => whyNext(),
      },
      {
        label: bondFocus ? '👀 正在看一条拉手' : '🔬 拉近看一条拉手',
        cls: 'gold', id: 'btnFocus', disabled: bondFocus,
        onClick: () => focusBond(),
      },
      { label: '🔙 返回全景', cls: '', id: 'btnBack', onClick: () => exitCloseup() },
    );
  }
  btns.push({
    label: '➡️ 去第2章：能带从哪来', cls: 'green', id: 'btnGoCh2',
    onClick: () => window.__solar && window.__solar.gotoChapter(1),
  });
  return {
    buttons: btns,
    sliders: [{
      id: 'slN', label: '原子数量', min: 1, max: 5, step: 1, value: bandStage,
      display: v => ['1 个', '2 个', '8 个', '64 个', '10²² 个'][v - 1],
      onInput: v => {
        setBandStage(v);
        const [zh, en, cls] = BAND_NARR[v - 1];
        showNarr(zh, en, cls, v === 5 ? 0 : 3400);
      },
    }],
  };
}

export function bindEnv(e, refresh) { refreshActionsRef = refresh; }

export function leave() {
  if (!root) return;
  atoms = []; bonds = []; arrived = []; cp = null;
}
