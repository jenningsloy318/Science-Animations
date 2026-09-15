/* ══════════════════════════════════════════════════
   ch2_bands.js — 第2章：能带从哪来（独立全屏页）
   大图 + 完整句子解说 + 逐步推进：
   1原子壳层 → 2原子分裂(泡利) → 8 → 64 → 10²² 挤成能带
   收尾：带隙 1.12eV → 光子踢得动 → 这就是"半导体"
   ══════════════════════════════════════════════════ */
import * as THREE from 'three';
import { COL, makeTextSprite, addAnim, ease, flyCamera } from './core.js';
import { showNarr } from './ui.js';

export const meta = {
  nav: '🎫 能带从哪来',
  title: '🎫 太阳能电池 · 第2章：能带——晶体的座位总表',
  sub: 'Chapter 2 · Energy bands: the crystal\u2019s seat map',
};

let env, root;
let stage = 0;                 // 0..5 (0=封面, 1..5 = N)
let overlay = null;            // DOM overlay
let bigCanvas = null;
let atomsGroup = null;         // 3D display
let atomsList = [];
let sticks = [];
let refreshActionsRef = null;

/* ── full-sentence narration per stage (no keyword soup) ── */
const STEPS = [
  {
    n: 1, label: '1 个原子',
    zh: '先分清两样东西：<b>电子是乘客，能带是座位表</b>——所以“共价电子对<b>不是</b>能带”，它是坐座位的乘客！看图口诀：<b>一条横线 = 一种允许的能量</b>（不是位置！），线越高能量越高。「1 个原子」= 孤零零还没拉手的硅原子：座位表上只有<b>几条孤立的线</b>——K 层一条（坐 2 个）、L 层一条（坐 8 个）、最外层 M 一条（坐 <b>4 个</b>，就是上一章伸出 4 只手的那 4 个）。<b>线与线之间不许坐</b>：想上去必须拿到正好那么多能量。',
    en: 'Electrons are passengers; the band is the seat chart. One lone atom: a few isolated energy lines',
  },
  {
    n: 2, label: '2 个原子',
    zh: '拉手之后，共享的那对电子不再只属于一个原子，而是属于<b>两个</b>——这就不一样了！<b>泡利不相容</b>说：同一个系统里，<b>不许有两个一模一样的座位</b>。于是原来的一条线<b>被迫裂成两条</b>：一对合得来的坐低线（更稳），合不来的只能坐高线。座位 1 条变 2 条——<b>这就是“分裂”，能带故事的第一步</b>。',
    en: 'Shared pair belongs to both atoms → Pauli forbids duplicate seats → one line splits into two',
  },
  {
    n: 8, label: '8 个原子',
    zh: '8 个原子拉成小组 → 每条线裂成 <b>8 条</b>。规律：<b>裂几条 = 有几个原子</b>（每个原子都要出一份座位）。它们开始挤在一起了……',
    en: '8 atoms → 8 lines per level (lines = atom count)',
  },
  {
    n: 64, label: '64 个原子',
    zh: '64 个原子 → 64 条，已经挤得快分不清。可这才 64 个！真实晶体一克硅里有 <b>10²²</b> 个原子——接下来看关键一步。',
    en: '64 atoms → 64 tightly-packed lines',
  },
  {
    n: '1e22', label: '10²² 个原子',
    zh: '<b>“形成能带”的意思</b>：10²² 条线挤在一起，相邻两条只差百万亿分之一 eV——<b>分不开了，看成连续的一片</b>。记住：线还在，只是密到看不见。这样一整片“允许的能量范围”就叫<b>能带</b>。对晶体最外层：下面那片坐满了第 1 章所有<b>共享电子</b>（拉手里的乘客）→ 叫<b>价带</b>（坐满 = 锁在键里）；上面那片全空 → 叫<b>导带</b>（电子一上去就能全晶体自由跑）。两片中间不许坐的空档 = <b>带隙 1.12 eV</b>——要么在下面，要么一步跳上去，不能停半空。',
    en: '“Band forms” = 10²² lines packed so dense they merge into a continuous range. Valence holds all shared electrons; conduction is empty; gap = 1.12 eV',
  },
];
const FINALE = {
  zh: '把三块拼图合上：<b>价带坐满 + 导带全空 + 带隙不大不小</b> = <b>半导体</b>。而“光发电”用一句话说：<b>光子把一个电子从价带蹦上导带</b>——翻译回第 1 章的语言：<b>把电子从共价键里解放出来</b>（价带少一个 = 留下一个洞），它就成了能自由跑的电荷。玻璃带隙 9 eV 太大蹦不动（所以透明）；金属没空档，电子本来就自由，但也因此<b>没法把正负电荷分开</b>。下一章：往半导体里“加料”，造分离器！',
  en: 'Light kicks one electron from valence to conduction = freeing it from its bond. That\u2019s photovoltaics!',
};

/* ═══════ DOM overlay: big canvas + sentence box ═══════ */
function buildOverlay() {
  overlay = document.createElement('div');
  overlay.id = 'bandsOverlay';
  overlay.innerHTML = `
    <div class="bands-title">🎫 能带是怎么来的？<span style="color:#475569;font-size:.7rem"> · v5</span></div>
    <div class="bands-v3d"><span class="tag">🔬 左边是真实原子（可拖动旋转）→ 右边是它们的座位表</span></div>
    <canvas width="1120" height="620"></canvas>
    <div class="bands-steps">
      <button data-s="1">1 个原子</button>
      <button data-s="2">2 个原子</button>
      <button data-s="3">8 个</button>
      <button data-s="4">64 个</button>
      <button data-s="5">10²²</button>
      <button data-s="6">💎 结论</button>
    </div>
    <div class="bands-sentence"></div>`;
  document.body.appendChild(overlay);
  bigCanvas = overlay.querySelector('canvas');
  overlay.querySelectorAll('.bands-steps button').forEach(b => {
    b.onclick = () => gotoStage(parseInt(b.dataset.s, 10));
  });
}
function removeOverlay() {
  if (overlay) { overlay.remove(); overlay = null; bigCanvas = null; }
}
function setSentence(html, sub) {
  const el = overlay && overlay.querySelector('.bands-sentence');
  if (!el) return;
  el.innerHTML = html + (sub ? `<span class="sub">${sub}</span>` : '');
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
}
function markStep() {
  overlay && overlay.querySelectorAll('.bands-steps button').forEach((b, i) => {
    b.classList.toggle('active', i + 1 === stage);
    b.classList.toggle('done', i + 1 < stage);
  });
}

/* ═══════ chapter lifecycle ═══════ */
export function enter(e) {
  env = e;
  root = new THREE.Group();
  e.root.add(root);
  stage = 0;

  build3D(1);
  buildOverlay();
  setSentence(
    '上一章我们看到：硅原子靠<b>共享电子对</b>手拉手，排成整齐的晶体。这一章回答一个大问题：<b>拉手之后，电子的“座位表”发生了什么变化？</b>先学怎么看图——<b>一条横线 = 一种允许的能量</b>（不是位置！），线越高能量越高。点“1 个原子”开始。',
    'First learn to read the chart: one horizontal line = one allowed energy'
  );
  markStep();
}

export function update(dt, t) {
  if (!root) return;
  // gentle float of displayed atoms
  atomsGroup && atomsGroup.children.forEach((m, i) => {
    m.rotation.y = t * 0.15;
  });
  drawBig();
}

function gotoStage(s) {
  stage = s;
  markStep();
  if (s >= 1 && s <= 5) {
    const st = STEPS[s - 1];
    setSentence(st.zh, st.en);
    build3D(st.n);
  } else if (s === 6) {
    setSentence(FINALE.zh, FINALE.en);
    build3D('1e22');
  }
}

/* ═══════ 3D display behind the panel ═══════ */
function build3D(n) {
  if (atomsGroup) {
    root.remove(atomsGroup);
    atomsGroup.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
    });
  }
  atomsGroup = new THREE.Group();
  atomsList = []; sticks = [];
  root.add(atomsGroup);

  const mkMat = () => new THREE.MeshStandardMaterial({
    color: COL.silicon, roughness: .4, metalness: .3, emissive: 0x1a2333, emissiveIntensity: .4,
  });
  const addAtom = (x, y, z, r) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 18), mkMat());
    m.position.set(x, y, z);
    atomsGroup.add(m);
    atomsList.push(m);
    return m;
  };
  const addStick = (a, b) => {
    const dir = new THREE.Vector3().subVectors(b.position, a.position);
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, dir.length(), 6),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: .5 })
    );
    m.position.copy(a.position).add(b.position).multiplyScalar(.5);
    m.lookAt(b.position);
    m.rotateX(Math.PI / 2);
    atomsGroup.add(m);
    sticks.push(m);
  };

  if (n === 1) {
    const a = addAtom(0, 1.4, 0, 1.1);
    const tag = makeTextSprite('Si · 2,8,4', 0.8, '#cbd5e1');
    tag.position.set(0, -1.6, 0);
    a.add(tag);
  } else if (n === 2) {
    const a = addAtom(-1.3, 1.4, 0, 0.95);
    const b = addAtom(1.3, 1.4, 0, 0.95);
    addStick(a, b);
    const tag = makeTextSprite('共享电子对 ∞', 0.7, '#fbbf24');
    tag.position.set(0, 3.0, 0);
    atomsGroup.add(tag);
  } else {
    const count = n === 8 ? 2 : 4;                 // 2³=8 · 4³=64
    const sp = n === 8 ? 2.6 : 2.2;
    const r = n === 8 ? 0.58 : 0.42;
    const grid = {};
    for (let i = 0; i < count; i++) for (let j = 0; j < count; j++) for (let k = 0; k < count; k++) {
      grid[`${i},${j},${k}`] = addAtom(
        (i - (count - 1) / 2) * sp, 1.4 + (j - (count - 1) / 2) * sp, (k - (count - 1) / 2) * sp, r
      );
    }
    for (const key of Object.keys(grid)) {
      const [i, j, k] = key.split(',').map(Number);
      const nb = (di, dj, dk) => grid[`${i + di},${j + dj},${k + dk}`];
      if (nb(1, 0, 0)) addStick(grid[key], nb(1, 0, 0));
      if (nb(0, 1, 0)) addStick(grid[key], nb(0, 1, 0));
      if (nb(0, 0, 1)) addStick(grid[key], nb(0, 0, 1));
    }
    if (n === '1e22') {
      const tag = makeTextSprite('…实际晶体：10²² 个原子', 0.85, '#fbbf24');
      tag.position.set(0, 5.6, 0);
      atomsGroup.add(tag);
    }
  }
}

/* ═══════ the big diagram ═══════ */
function drawBig() {
  if (!bigCanvas) return;
  const ctx = bigCanvas.getContext('2d');
  const W = bigCanvas.width, H = bigCanvas.height;
  const s = Math.max(0, Math.min(stage - 1, 4));
  ctx.clearRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#94a3b8'; ctx.font = '600 22px Outfit, sans-serif';
  ctx.fillText('左：1 个原子（参照）', W * 0.25, 40);
  ctx.fillStyle = '#e2e8f0'; ctx.font = '700 22px Outfit, sans-serif';
  ctx.fillText(stage === 0 ? '？' : stage === 6 ? '💎 结论' : `右：${STEPS[s].label}`, W * 0.72, 40);

  const vc = H * 0.62, cc = H * 0.32;   // valence / conduction group centers
  const spread = [26, 30, 64, 96, 108][s];
  const lines = [1, 2, 8, 24, 40][s];

  // left column: single atom always
  col(ctx, W * 0.25, vc, cc, 1, 26, false, s);
  // right column
  col(ctx, W * 0.72, vc, cc, lines, spread, s === 4, s);

  // gap bracket on the right column
  if (s >= 3) {
    const x = W * 0.72 + 150;
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, cc + spread + 8); ctx.lineTo(x, vc - spread - 8); ctx.stroke();
    ctx.fillStyle = '#cbd5e1'; ctx.font = '700 18px Outfit, sans-serif';
    ctx.save(); ctx.translate(x + 20, (cc + vc) / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText(s === 4 ? '带隙 Eg = 1.12 eV' : '禁 区', 0, 0); ctx.restore();
  }

  // band labels on stage 5/6
  if (s >= 4) {
    ctx.fillStyle = '#38bdf8'; ctx.font = '700 20px Outfit, sans-serif';
    ctx.fillText('价带 Valence — 坐满·锁死', W * 0.72, vc + spread + 34);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('导带 Conduction — 全空·自由', W * 0.72, cc - spread - 26);
  }

  // arrow between columns
  ctx.strokeStyle = 'rgba(148,163,184,.5)'; ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath(); ctx.moveTo(W * 0.36, H / 2); ctx.lineTo(W * 0.61, H / 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#64748b'; ctx.font = '600 17px Outfit, sans-serif';
  ctx.fillText('原子越多，座位越挤 →', W * 0.485, H / 2 - 14);
}

function col(ctx, cx, vc, cc, lines, spread, isBand, s) {
  const halfW = 170;
  // conduction (upper)
  if (isBand) {
    ctx.fillStyle = 'rgba(251,191,36,0.12)';
    ctx.strokeStyle = 'rgba(251,191,36,0.65)'; ctx.lineWidth = 2.5;
    rr(ctx, cx - halfW, cc - spread, halfW * 2, spread * 2, 14); ctx.fill(); ctx.stroke();
  } else if (lines >= 2) {
    ctx.strokeStyle = 'rgba(251,191,36,0.65)'; ctx.lineWidth = 2;
    for (let i = 0; i < Math.min(lines, 24); i++) {
      const y = cc - spread + (i / Math.max(1, Math.min(lines, 24) - 1)) * spread * 2;
      hline(ctx, cx - halfW + 8, cx + halfW - 8, y);
    }
  } else {
    ctx.strokeStyle = 'rgba(251,191,36,0.65)'; ctx.lineWidth = 2.5;
    hline(ctx, cx - halfW + 8, cx + halfW - 8, cc);
  }
  // valence (lower) with electrons
  if (isBand) {
    ctx.fillStyle = 'rgba(56,189,248,0.10)';
    ctx.strokeStyle = 'rgba(56,189,248,0.6)'; ctx.lineWidth = 2.5;
    rr(ctx, cx - halfW, vc - spread, halfW * 2, spread * 2, 14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#7dd3fc';
    for (let r = 0; r < 4; r++) for (let c = 0; c < 24; c++) {
      ctx.beginPath();
      ctx.arc(cx - halfW + 16 + c * 13.5, vc - spread + 14 + r * (spread * 2 - 28) / 3, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.strokeStyle = 'rgba(56,189,248,0.6)'; ctx.lineWidth = 2;
    const nl = Math.min(lines, 24);
    for (let i = 0; i < nl; i++) {
      const y = vc - spread + (i / Math.max(1, nl - 1)) * spread * 2;
      hline(ctx, cx - halfW + 8, cx + halfW - 8, y);
      // electrons on the lowest line only (keeps it readable)
      if (i === nl - 1) {
        ctx.fillStyle = '#7dd3fc';
        for (let k = 0; k < 6; k++) {
          ctx.beginPath(); ctx.arc(cx - halfW + 24 + k * 28, y, 4, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    if (lines === 1) {
      ctx.fillStyle = '#7dd3fc';
      for (let k = 0; k < 6; k++) {
        ctx.beginPath(); ctx.arc(cx - halfW + 24 + k * 28, vc, 4, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
}
function hline(ctx, x1, x2, y) {
  ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
}
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ── actions (also drives overlay nav) ── */
export function actions() {
  return {
    buttons: [
      {
        label: stage === 0 ? '▶ 开始：1 个原子' : stage < 5 ? `▶ 下一步：${STEPS[stage].label}` : stage === 5 ? '💎 结论：为什么是半导体' : '🔁 从头再看一遍',
        cls: 'gold', id: 'btnNext2',
        onClick: () => gotoStage(stage >= 6 ? 0 : stage + 1),
      },
      { label: '➡️ 去第3章：造分离器', cls: 'green', id: 'btnGoCh3', onClick: () => window.__solar && window.__solar.gotoChapter(2) },
    ],
    sliders: [],
  };
}

export function bindEnv(e, refresh) { refreshActionsRef = refresh; }

export function leave() {
  removeOverlay();
  if (root) {
    atomsGroup = null; atomsList = []; sticks = [];
    root = null;
  }
}
