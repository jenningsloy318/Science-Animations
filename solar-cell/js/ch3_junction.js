/* ══════════════════════════════════════════════════
   ch1_lattice.js — 第1章：分离装置 — 硅晶体、掺杂与PN结
   衔接 atomic-model：Si 电子排布 2,8,4；P=2,8,5；B=2,8,3
   ══════════════════════════════════════════════════ */
import * as THREE from 'three';
import { COL, makeTextSprite, addAnim, ease, buildLattice, makeCarrierMesh } from './core.js';
import { showNarr } from './ui.js';

export const meta = {
  nav: '🔧 分离装置：PN结',
  title: '🔧 太阳能电池 · 第3章：先造一个"电荷分离器"',
  sub: 'Chapter 1 · Silicon lattice, doping & the PN junction',
};

let root, atoms = [];
let freeCarriers = [];
let junctionBits = [];
let stage = 0;
let chosenP = -1, chosenB = -1;
let currentEnv = null, refreshActions = null;

const idx = (x, y, z) => x + y * dims.NX + z * dims.NX * dims.NY;
let dims = { NX: 6, NY: 2, NZ: 5, SP: 1.55 };

export function enter(env) {
  currentEnv = env;
  root = new THREE.Group();
  env.root.add(root);
  atoms = []; freeCarriers = []; junctionBits = [];
  stage = 0; chosenP = -1; chosenB = -1;

  const built = buildLattice(root);
  atoms = built.atoms;
  Object.assign(dims, built.dims);

  const caption = makeTextSprite('硅 Si：2, 8, 4 — 最外层 4 个电子，与邻居共享 → 共价键', 0.78, '#94a3b8');
  caption.position.set(dims.NX * dims.SP / 2, 3.6, dims.NZ * dims.SP / 2);
  root.add(caption);

  showNarr(
    '第2章我们看到：晶体里电子的座位 = <b>能带</b>（价带坐满·锁死）。现在把两个"道具"掺进晶体，造出能把正负电荷<b>分开</b>的装置。每个<b>硅原子</b>最外层 4 个电子（Si：2, 8, 4）和邻居<b>共享</b> = 共价键',
    'Dope the crystal to build a charge separator',
    'blue'
  );
}

function spawnFreeElectron(hostAtom) {
  const e = makeCarrierMesh('e');
  root.add(e);
  freeCarriers.push({ mesh: e, kind: 'e', t: Math.random() * 10, anchor: hostAtom.mesh.position.clone(), wander: dims.SP * 2.6 });
}
function spawnHole(hostAtom) {
  const h = makeCarrierMesh('h');
  root.add(h);
  freeCarriers.push({ mesh: h, kind: 'h', t: Math.random() * 10, anchor: hostAtom.mesh.position.clone(), wander: dims.SP * 2.4 });
}

function setAtomDopant(a, type) {
  a.mesh.material.color.set(type === 'P' ? 0xf59e0b : 0x3b82f6);
  a.mesh.material.emissive.set(type === 'P' ? 0x7c4a00 : 0x1e3a8a);
  a.mesh.material.emissiveIntensity = 0.8;
  const tag = makeTextSprite(type, 0.6, type === 'P' ? '#fbbf24' : '#60a5fa');
  tag.position.set(0, 0.75, 0);
  a.mesh.add(tag);
}

export function update(dt) {
  if (!root) return;
  for (const c of freeCarriers) {
    c.t += dt;
    const w = c.wander;
    c.mesh.position.set(
      c.anchor.x + Math.sin(c.t * 1.3 + c.anchor.z) * w,
      c.anchor.y + Math.sin(c.t * 0.9) * w * 0.4,
      c.anchor.z + Math.cos(c.t * 1.1 + c.anchor.x) * w
    );
  }
}

export function actions() {
  return {
    buttons: [
      {
        label: '🔴 掺磷 P (2,8,5)', cls: 'gold', id: 'btnDopP',
        onClick: el => {
          if (stage !== 0) return;
          stage = 1;
          chosenP = idx(Math.floor(dims.NX / 2) - 1, 0, 1);
          const a = atoms[chosenP];
          setAtomDopant(a, 'P');
          spawnFreeElectron(a);
          showNarr(
            '把一个硅原子换成<b>磷 P</b>（2, 8, <b>5</b>）：4 个电子用来成键，<b>多出 1 个自由电子</b>游荡 → <b>n 型</b>硅（negative）',
            'Phosphorus has 5 outer electrons → 1 leftover free electron → n-type',
            'gold'
          );
          el.disabled = true;
        },
      },
      {
        label: '🔵 掺硼 B (2,8,3)', cls: 'blue', id: 'btnDopB',
        onClick: el => {
          if (stage !== 1) return;
          stage = 2;
          chosenB = idx(Math.floor(dims.NX / 2) + 1, 0, 3);
          const a = atoms[chosenB];
          setAtomDopant(a, 'B');
          spawnHole(a);
          showNarr(
            '再换一个成<b>硼 B</b>（2, 8, <b>3</b>）：只有 3 个电子成键，缺一个位置 = <b>空穴</b>（蓝色笼子，等效正电荷）→ <b>p 型</b>硅（positive）',
            'Boron has only 3 → a missing bond = a "hole" (acts positive) → p-type',
            'blue'
          );
          el.disabled = true;
        },
      },
      {
        label: '🔗 合成 PN 结！', cls: 'red', id: 'btnJunction',
        onClick: el => {
          if (stage !== 2) return;
          stage = 3;
          formJunction(el);
        },
      },
      { label: '🔁 重新开始', cls: '', onClick: () => rebuild() },
      {
        label: '➡️ 去第4章：光照发电', cls: 'green', id: 'btnGoCh4',
        onClick: () => window.__solar && window.__solar.gotoChapter(3),
      },
    ],
    sliders: [],
  };
}

function rebuild() {
  if (!currentEnv) return;
  leave();
  enter(currentEnv);
  refreshActions && refreshActions();
}
export function bindEnv(env, refresh) { currentEnv = env; refreshActions = refresh; }

function formJunction(el) {
  el.disabled = true;
  const mid = dims.NX / 2;
  const jx = mid * dims.SP - dims.SP / 2;

  atoms.forEach((a, i) => {
    if (i === chosenP || i === chosenB) return;
    const nSide = a.x < mid;
    a.mesh.material.color.set(nSide ? COL.nTint : COL.pTint);
  });

  for (let k = 0; k < 5; k++) {
    const ea = atoms.find(o => o.x === 0 + (k % 2) && o.z === (k * 2) % dims.NZ && o.y === 0);
    if (ea) spawnFreeElectron(ea);
    const ha = atoms.find(o => o.x === dims.NX - 1 - (k % 2) && o.z === (k * 2 + 1) % dims.NZ && o.y === 0);
    if (ha) spawnHole(ha);
  }

  showNarr(
    '把 n 型和 p 型拼在一起：<b>电子</b>向 p 侧扩散，<b>空穴</b>向 n 侧扩散…',
    'Electrons diffuse into p, holes diffuse into n…',
    'red'
  );

  addAnim({
    duration: 0.01, elapsed: -2.2, update() {},
    onComplete() {
      for (let k = 0; k < 6; k++) {
        const plus = makeTextSprite('+', 0.7, '#f87171');
        plus.position.set(jx - 1.1, 0.6, (k - 2.5) * dims.SP * 0.8);
        root.add(plus); junctionBits.push(plus);
        const minus = makeTextSprite('−', 0.7, '#60a5fa');
        minus.position.set(jx + 1.1, 0.6, (k - 2.5) * dims.SP * 0.8);
        root.add(minus); junctionBits.push(minus);
      }
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(dims.SP * 1.6, dims.NY * dims.SP, dims.NZ * dims.SP * 0.96),
        new THREE.MeshBasicMaterial({ color: 0x0b1220, transparent: true, opacity: 0.55 })
      );
      plate.position.set(jx, dims.SP / 2, dims.NZ * dims.SP / 2);
      root.add(plate); junctionBits.push(plate);

      showNarr(
        '扩散走后留下<b>不能动的离子</b>（红+ = 失去电子的施主，蓝− = 得到电子的受主）→ 中间形成<b>耗尽层</b>',
        'Fixed ionized dopants remain → depletion region forms',
        'red'
      );
    },
  });

  addAnim({
    duration: 0.01, elapsed: -4.6, update() {},
    onComplete() {
      for (let k = 0; k < 3; k++) {
        const arrow = new THREE.Group();
        const shaft = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.05, 1.6, 8),
          new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
        );
        shaft.rotation.z = Math.PI / 2;
        const head = new THREE.Mesh(
          new THREE.ConeGeometry(0.16, 0.4, 10),
          new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
        );
        head.rotation.z = -Math.PI / 2;
        head.position.x = 1.0;
        arrow.add(shaft, head);
        arrow.position.set(jx, dims.SP / 2, (k - 1) * dims.SP * 1.8 + dims.SP);
        root.add(arrow); junctionBits.push(arrow);

        addAnim({
          duration: 1.2,
          update(p) { arrow.children[1].scale.setScalar(0.6 + 0.8 * Math.abs(Math.sin(p * Math.PI * 3))); },
        });
      }
      const fieldTag = makeTextSprite('内建电场 E (n → p)', 0.72, '#fbbf24');
      fieldTag.position.set(jx, 3.3, dims.NZ * dims.SP / 2);
      root.add(fieldTag); junctionBits.push(fieldTag);

      showNarr(
        '正负离子之间产生<b>内建电场</b>（金色箭头，n → p）：它是"电子滑梯"，把跑到这里的电子推回 n 侧、空穴推回 p 侧 → <b>电荷分离器</b>造好了！',
        'Built-in field (n→p) = the one-way slide that separates charges!',
        'gold'
      );
    },
  });
}

export function leave() {
  if (!root) return;
  freeCarriers = []; junctionBits = []; atoms = [];
}
