// nuclear-fission-3d — js/main.js
// Phase 2 裂变运行时（runtime+interaction）：三相位 3D 故事（atoms→neutron→fission）、
// 人教版科学文案、window.fissionSim 状态机表面（恰 12 方法）、播放控制与四步引导浏览。
//
// 场景覆盖（与测试套件逐字对应）：
//   SCENARIO-004 ~ 008 (AC-03) — PHASES / fissionSim / jumpToPhase / startRun
//   SCENARIO-009 ~ 013 (AC-04) — 上下幕环绕 / 暂停续播 / 机位 / 自动换幕 / 键盘可达
//   SCENARIO-014 ~ 016 (AC-05) — 科学文案逐字锚定 / 守恒验算 / 解说节奏
//   SCENARIO-018 ~ 020 (AC-07) — 恰 4 步导览 / 步骤↔相位耦合 / 退出导览
//   SCENARIO-026 ~ 028 (AC-10) — 单一主循环 / __ready 启动契约 / WebGL 降级

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import WebGL from 'three/addons/capabilities/WebGL.js';
import { i18n } from '../../common/js/i18n.js';
import { NUCLIDES } from '../../common/js/nuclide.js';

/* SCENARIO-027 (AC-10): index.html 已内联 __errs 陷阱；模块侧兜底一次 */
window.__errs = window.__errs || [];

/* 🎥 重置视角（SCENARIO-011）恢复的默认机位常量 */
const DEFAULT_CAMERA_POS = new THREE.Vector3(0, 3.4, 16.5);
const DEFAULT_CAMERA_TARGET = new THREE.Vector3(0, 0.6, 0);

/* SCENARIO-004 (AC-03): 三相位 —— 恰 3 项，顺序 atoms→neutron→fission，
   duration 10/12/14（总 36s）；末相 fission 驻留不回绕 */
const PHASES = [
  { key: 'atoms', zh: '原子结构', duration: 10 },
  { key: 'neutron', zh: '中子俘获', duration: 12 },
  { key: 'fission', zh: '裂变反应', duration: 14 },
];

/* SCENARIO-018 (AC-07): 四步导览 —— 步数 ≠ 相位数：④ 总结步停留在 fission */
const TOUR_STEPS = [
  { phaseKey: 'atoms', title: '① 原子结构：认识铀-235', enTitle: '① Atomic Structure: Inside U-235',
    text: '铀-235 是常用的核燃料：原子核里有 92 个质子和 143 个中子，质量数 235、电荷数 92，核外还有电子绕核运动。',
    enText: 'U-235 is standard nuclear fuel: 92 protons and 143 neutrons (mass 235, charge 92) inside the nucleus, surrounded by orbiting electrons.' },
  { phaseKey: 'neutron', title: '② 中子俘获：形成激发复核铀-236*', enTitle: '② Neutron Capture: Forming U-236*',
    text: '一颗慢中子飞向铀-235 并被俘获，形成激发态的复核铀-236*。它像被甩动的水滴一样剧烈振荡、拉伸变形，随时可能断开。',
    enText: 'A thermal neutron is absorbed by U-235, forming excited compound nucleus U-236*. It oscillates violently like a droplet, stretching and ready to split.' },
  { phaseKey: 'fission', title: '③ 裂变反应：一分为二', enTitle: '③ Fission Reaction: Splitting in Two',
    text: '复核铀-236* 最终分裂成钡-141 和氪-92 两个碎片，同时放出 3 个中子，并爆出一片刺目的能量闪光。',
    enText: 'Compound nucleus U-236* splits into Ba-141 and Kr-92 fragments, releasing 3 neutrons and a brilliant flash of energy.' },
  { phaseKey: 'fission', title: '④ 总结：质量数与电荷数守恒', enTitle: '④ Summary: Conservation of Mass & Charge',
    text: '验算：235 + 1 = 141 + 92 + 3 = 236，电荷数 92 = 56 + 36。放出的中子再去撞别的铀-235 就是链式反应；一次裂变约释放 200 MeV（≈3.2e-11 J）能量。',
    enText: 'Conservation: 235 + 1 = 141 + 92 + 3 = 236; charge 92 = 56 + 36. Emitted neutrons sustain a chain reaction; each fission releases ~200 MeV (≈3.2e-11 J) of energy.' },
];

/* SCENARIO-016 (AC-05): 解说文案按相位分相选择（phaseKey 驱动） */
const NARRATION = {
  atoms: {
    title: '原子结构',
    enTitle: 'Atomic Structure',
    text: '铀-235 是常用的核燃料：原子核由 92 个质子和 143 个中子组成，质量数 235、电荷数 92，核外电子绕核运动。',
    enText: 'U-235 is standard nuclear fuel: 92 protons and 143 neutrons (mass 235, charge 92) form the nucleus, orbited by electrons.',
  },
  neutron: {
    title: '中子俘获',
    enTitle: 'Neutron Capture',
    text: '一颗慢中子被铀-235 俘获，形成激发态的复核铀-236*——它像被甩动的水滴，剧烈振荡、拉伸变形。',
    enText: 'A thermal neutron is captured by U-235, forming excited compound nucleus U-236* — oscillating violently and stretching like a droplet.',
  },
  fission: {
    title: '裂变反应',
    enTitle: 'Fission Reaction',
    text: '复核铀-236* 分裂为钡-141 与氪-92，同时放出 3 个中子，伴随刺目的能量闪光；一次裂变约释放 200 MeV（≈3.2e-11 J）的能量。',
    enText: 'Compound nucleus U-236* splits into Ba-141 and Kr-92, releasing 3 neutrons with an intense energy flash; ~200 MeV (≈3.2e-11 J) released per fission.',
  },
};

const fissionDict = {
  'fission.title': {
    zh: '☢️ 核裂变 · 3D 交互动画',
    en: '☢️ Nuclear Fission · 3D Interactive Simulation'
  },
  'fission.subtitle': {
    zh: '铀-235 + 中子 → 钡-141 + 氪-92 + 3 个中子 + 能量 — 三幕看懂核裂变',
    en: 'U-235 + n → Ba-141 + Kr-92 + 3 neutrons + Energy — Fission in Three Acts'
  },
  'tool.tour': { zh: '引导浏览（分步讲解）', en: 'Guided Tour (Step-by-step)' },
  'tool.sound': { zh: '音效开关 Sound Toggle', en: 'Sound FX Toggle' },
  'tool.yield': { zh: '碎片产额双峰分布 Yields', en: 'Fragment Mass Yields' },
  'tool.energy': { zh: '200 MeV 能量详细分配 Energy Partition', en: '200 MeV Energy Partition' },
  'tool.moderator': { zh: '中子慢化与链式反应 Neutron Moderation', en: 'Neutron Moderation & Chain Reaction' },
  'yield.title': { zh: '📊 裂变碎片质量双峰分布（骆驼曲线）', en: '📊 Fission Fragment Mass Yields (Camel Curve)' },
  'yield.desc': {
    zh: '铀-235 吸收慢中子裂变时，<b>不对称分裂</b>占绝对优势（壳层幻数 Z=50, N=82 驱动）；纯对称分裂（118/118）概率低于 0.01%！',
    en: 'When U-235 absorbs a thermal neutron, <b>asymmetric split</b> strongly dominates (driven by nuclear magic shells Z=50, N=82); symmetric split (118/118) probability is <0.01%!'
  },
  'yield.light': { zh: '轻峰 A≈95', en: 'Light Peak A≈95' },
  'yield.heavy': { zh: '重峰 A≈139', en: 'Heavy Peak A≈139' },
  'yield.valley': { zh: '对称谷 <0.01%', en: 'Symmetric Valley <0.01%' },
  'split.btn1.title': { zh: '① 经典主产物（教材基准）', en: '① Standard Fission Products (Textbook Baseline)' },
  'split.btn1.desc': { zh: `${NUCLIDES.BA_141} (钡-141) + ${NUCLIDES.KR_92} (氪-92) + 3 个中子`, en: `${NUCLIDES.BA_141} (Barium-141) + ${NUCLIDES.KR_92} (Krypton-92) + 3 neutrons` },
  'split.btn2.title': { zh: '② 铯-137 强辐射同位素对（中子幻数 N=82 稳定壳）', en: '② Cesium-137 High-Radiation Pair (N=82 Magic Shell)' },
  'split.btn2.desc': { zh: `${NUCLIDES.CS_137} (铯-137) + ${NUCLIDES.RB_96} (铷-96) + 3 个中子`, en: `${NUCLIDES.CS_137} (Cesium-137) + ${NUCLIDES.RB_96} (Rubidium-96) + 3 neutrons` },
  'split.btn3.title': { zh: '③ 锶-90 / 氙-144 裂变对（反应堆毒物）', en: '③ Strontium-90 / Xenon-144 Pair (Reactor Poison)' },
  'split.btn3.desc': { zh: `${NUCLIDES.XE_144} (氙-144) + ${NUCLIDES.SR_90} (锶-90) + 2 个中子`, en: `${NUCLIDES.XE_144} (Xenon-144) + ${NUCLIDES.SR_90} (Strontium-90) + 2 neutrons` },
  'split.btn4.title': { zh: '④ 对称裂变（极端罕见 · 产额 <0.01%）', en: '④ Symmetric Split (Extremely Rare · Yield <0.01%)' },
  'split.btn4.desc': { zh: `${NUCLIDES.PD_118} (钯-118) + ${NUCLIDES.PD_118} (钯-118) — 强核壳层排斥对称分裂`, en: `${NUCLIDES.PD_118} (Palladium-118) + ${NUCLIDES.PD_118} (Palladium-118) — Shell effects suppress symmetric split` },
  'energy.title': { zh: '⚡ 一次裂变 200 MeV 能量去向明细', en: '⚡ Energy Breakdown per Fission (200 MeV)' },
  'energy.frag': { zh: '💥 裂变碎片动能（库仑排斥膨胀）', en: '💥 Fission Fragment Kinetic Energy (Coulomb Repulsion)' },
  'energy.neutrons': { zh: '💨 瞬发中子动能（~2 MeV × 2.5个）', en: '💨 Prompt Neutron Kinetic Energy (~2 MeV × 2.5)' },
  'energy.gamma': { zh: '✨ 瞬发伽马光子辐射', en: '✨ Prompt Gamma Photons' },
  'energy.beta': { zh: '☢️ 碎片后继贝塔衰变能', en: '☢️ Delayed Beta Decay of Fragments' },
  'energy.del_gamma': { zh: '💫 碎片后继缓发伽马辐射', en: '💫 Delayed Gamma Radiation' },
  'energy.neutrino': { zh: '🌌 反中微子（直接逃逸入太空）', en: '🌌 Antineutrinos (Escape directly into space)' },
  'energy.footer': {
    zh: '合计约 210 MeV（瞬时碎片动能约占 85% ≈ 169 MeV；最终约 95% ≈ 200 MeV 沉积为堆内热能驱动汽轮机，仅约 10 MeV 反中微子逃逸）',
    en: 'Total ~210 MeV (~85% / 169 MeV is initial fragment kinetic energy; ultimately ~95% / 200 MeV is deposited as heat powering turbines, with only ~10 MeV escaping in antineutrinos)'
  },
  'mod.title': { zh: '💧 为什么必须用“慢化剂”慢化中子？', en: '💧 Why Must Neutrons Be Moderated?' },
  'mod.fast_tag': { zh: '💨 快中子 (刚裂变产生)', en: '💨 Fast Neutron (Newly Produced)' },
  'mod.fast_spec': { zh: '动能 ≈ 2 MeV · 速度 ≈ 20,000 km/s', en: 'Kinetic Energy ≈ 2 MeV · Speed ≈ 20,000 km/s' },
  'mod.fast_cross': { zh: '铀-235 裂变截面: 仅 1 靶恩 (barn)', en: 'U-235 Fission Cross Section: Only 1 barn' },
  'mod.fast_note': { zh: '飞得太快，穿核而过，很难被铀-235 俘获！', en: 'Moving too fast; passes right through and rarely captured!' },
  'mod.arrow': { zh: '撞击水/石墨碰撞 20~30 次减速 ➔', en: '20~30 collisions with water/graphite to slow down ➔' },
  'mod.slow_tag': { zh: '🐢 热中子 (慢化后)', en: '🐢 Thermal Neutron (Moderated)' },
  'mod.slow_spec': { zh: '动能 ≈ 0.025 eV · 速度 ≈ 2,200 m/s', en: 'Kinetic Energy ≈ 0.025 eV · Speed ≈ 2,200 m/s' },
  'mod.slow_cross': { zh: '铀-235 裂变截面: 暴增至 585 靶恩！', en: 'U-235 Fission Cross Section: Soars to 585 barns!' },
  'mod.slow_note': { zh: '俘获几率暴增近 600 倍，轻松触发下一次裂变！', en: 'Capture probability surges ~600x, triggering sustained fission!' },
  'keff.title': { zh: '控制棒深度与有效增殖系数 keff', en: 'Control Rod Position & Multiplication Factor keff' },
  'keff.sub': { zh: '次临界 k < 1 (停堆)', en: 'Subcritical k < 1 (Shutdown)' },
  'keff.crit': { zh: '临界 k = 1 (平稳发电)', en: 'Critical k = 1 (Steady Power)' },
  'keff.super': { zh: '超临界 k > 1 (功率提升)', en: 'Supercritical k > 1 (Power Boost)' },
  'tab.atoms': { zh: '① 原子结构', en: '① Atoms' },
  'tab.neutron': { zh: '② 中子俘获', en: '② Neutron' },
  'tab.fission': { zh: '③ 裂变反应', en: '③ Fission' },
  'ctrl.prev': { zh: '⏮ 上一步', en: '⏮ Prev' },
  'ctrl.next': { zh: '⏭ 下一步', en: '⏭ Next' },
  'ctrl.reset': { zh: '🔄 重置', en: '🔄 Reset' },
  'ctrl.cam': { zh: '🎥 重置视角', en: '🎥 Reset View' },
  'ctrl.pause': { zh: '⏸ 暂停', en: '⏸ Pause' },
  'ctrl.resume': { zh: '▶ 继续', en: '▶ Play' },
  'ctrl.auto_on': { zh: '自动换幕：开', en: 'Auto Advance: ON' },
  'ctrl.auto_off': { zh: '自动换幕：关', en: 'Auto Advance: OFF' },
  'hint.text': {
    zh: '拖拽旋转 · 滚轮缩放 · ⏮⏭ 换幕 · 🎬 引导浏览分步讲解',
    en: 'Drag to rotate · Scroll to zoom · ⏮⏭ Acts · 🎬 Guided Tour'
  },
  'faq.header': { zh: '🤔 常见问题（点开看答案）', en: '🤔 Physics FAQ' },
  'faq.q1': { zh: '为什么用中子去撞，而不是用质子？', en: 'Why use neutrons instead of protons?' },
  'faq.a1': {
    zh: '原子核带正电，质子也带正电——同性相斥，质子还没飞到就会被静电斥力弹开；中子不带电，没有任何斥力挡路，飞得再慢也能钻进原子核。',
    en: 'Atomic nuclei are positively charged, as are protons — electrostatic repulsion deflects protons away. Neutrons carry no charge and feel zero Coulomb barrier, readily penetrating the nucleus even at low speeds.'
  },
  'faq.q2': { zh: '铀-235 为什么一撞就裂？所有原子核都行吗？', en: 'Why does U-235 undergo fission so readily? Can any nucleus?' },
  'faq.a2': {
    zh: '不行。铀-235 是易裂变核：92 个质子互相排斥，原子核本就绷在“散架的边缘”；吞下一个中子变成铀-236* 后剧烈振荡，像抖过头的水气球一样一分为二。铀-238 吸收中子后通常不裂变，所以核燃料要先把铀-235 浓缩。',
    en: 'No. U-235 is a fissile nucleus: with 92 mutually repelling protons, it sits near instability. Absorbing a thermal neutron creates U-236*, oscillating and pinching like an overstretched liquid drop until it splits. U-238 does not readily undergo thermal fission, which is why uranium must be enriched.'
  },
  'faq.q3': { zh: '裂变的巨大能量从哪来？', en: 'Where does the immense energy come from?' },
  'faq.a3': {
    zh: '裂变碎片加中子的总质量比原来小了一点点（约 0.2 u）。亏损的质量按 E=mc² 变成能量：一次裂变约释放 200 MeV——相当于同质量煤炭燃烧的两百多万倍。',
    en: 'The total mass of fission fragments and neutrons is slightly less than the original nucleus (~0.2 u mass defect). Converted via E=mc², each fission yields ~200 MeV — over 2 million times the energy from burning the same mass of coal.'
  },
  'faq.q4': { zh: '什么是链式反应？核电站为什么不会像原子弹那样炸？', en: 'What is a chain reaction? Why doesn\'t a nuclear power plant explode like a bomb?' },
  'faq.a4': {
    zh: '每次裂变放出 2~3 个新中子，又能引发下一次裂变——像多米诺骨牌。原子弹放任中子成倍增殖（指数爆炸）；核电站用控制棒吸收多余中子，让每一代恰好只剩 1 个中子引发下次裂变（k=1），平稳地发电。',
    en: 'Each fission emits 2~3 neutrons capable of triggering subsequent fissions — like dominoes. Weapons allow runaway exponential multiplication, whereas power plants insert control rods to maintain criticality (k=1), sustaining safe and steady generation.'
  }
};
i18n.loadDict(fissionDict);

/* SCENARIO-026 (AC-10): 全场景粒子硬上限 —— 星野 900 + 核子/电子/中子 ≤ 245，
   任何时刻都低于 MAX_PARTICLES = 2000 */
const MAX_PARTICLES = 2000;  // PROV: illustrative | 渲染 | - | 粒子上限
function clampBudget(count) {
  return Math.min(count, MAX_PARTICLES);
}

/* SCENARIO-010 (AC-04): 暂停冻结时间累积、恢复后从冻结点原样续播的单一状态源 */
const state = {
  phaseIndex: 0,  // NO-PROV: 渲染/材质参数或局部变量，非对外科学数值
  phaseKey: 'atoms',
  phaseTime: 0,  // NO-PROV: 渲染/材质参数或局部变量，非对外科学数值
  simTime: 0,  // NO-PROV: 渲染/材质参数或局部变量，非对外科学数值
  paused: false,
  autoAdvance: true,
  tourActive: false,
  tourStep: null,
  tourDriving: false,
  split: 'standard', // 'standard' | 'cs' | 'sr' | 'symmetric'
  soundEnabled: false,
  keff: 1.0,  // PROV: illustrative | 临界度演示 | - | 有效增殖因子，演示用值
};

/* ——— Web Audio 裂变物理音效合成器（零外部依赖，默认静音） ——— */
let fissionAudioCtx = null;
function getFissionAudio() {
  if (!fissionAudioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) fissionAudioCtx = new AC();
  }
  if (fissionAudioCtx && fissionAudioCtx.state === 'suspended') fissionAudioCtx.resume();
  return fissionAudioCtx;
}
function playFissionBoom() {
  if (!state.soundEnabled) return;
  const ctx = getFissionAudio();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(115, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(26, ctx.currentTime + 1.1);
    g.gain.setValueAtTime(0.35, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.3);
  } catch (e) {}
}
function playNeutronCapture() {
  if (!state.soundEnabled) return;
  const ctx = getFissionAudio();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(640, ctx.currentTime + 0.35);
    g.gain.setValueAtTime(0.2, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch (e) {}
}

/* three.js 上下文（WebGL 不可用时保持 null → 走降级分支） */
let renderer = null;
let scene = null;
let camera = null;
let controls = null;
let clock = null;
let storyGroup = null;
let world = null; // 当前相位场景的可更新钩子 update(dt, t)

/* ————————————————————————————————————————————————————————————
   科学文案与守恒验算（SCENARIO-014 / SCENARIO-015 / SCENARIO-016, AC-05）
   ———————————————————————————————————————————————————————————— */
function updateNarration(phaseKey) {
  const data = NARRATION[phaseKey];
  if (!data) return;
  const isEn = (i18n && i18n.currentLang === 'en');
  document.getElementById('phaseTitle').textContent = isEn ? data.enTitle : data.title;
  document.getElementById('phaseText').textContent = isEn ? data.enText : data.text;
}

/* SCENARIO-015 (AC-05): #ledgerPanel 只在 fission 相展示守恒验算
   （数字自洽：235 + 1 = 141 + 92 + 3 = 236；56 + 36 = 92） */
function updateLedger(phaseKey) {
  const panel = document.getElementById('ledgerPanel');
  if (!panel) return;
  const isEn = (i18n && i18n.currentLang === 'en');
  if (phaseKey === 'fission') {
    if (state.split === 'cs') {
      panel.textContent = isEn
        ? 'Conservation Check ▸ Mass Number 236 = 137 + 96 + 3 | Nuclear Charge 92 = 55 + 37'
        : '守恒验算 ▸ 质量数 236 = 137 + 96 + 3 ｜ 电荷数 92 = 55 + 37';
    } else if (state.split === 'sr') {
      panel.textContent = isEn
        ? 'Conservation Check ▸ Mass Number 236 = 144 + 90 + 2 | Nuclear Charge 92 = 54 + 38'
        : '守恒验算 ▸ 质量数 236 = 144 + 90 + 2 ｜ 电荷数 92 = 54 + 38';
    } else if (state.split === 'symmetric') {
      panel.textContent = isEn
        ? 'Conservation Check ▸ Mass Number 236 = 118 + 118 | Nuclear Charge 92 = 46 + 46'
        : '守恒验算 ▸ 质量数 236 = 118 + 118 ｜ 电荷数 92 = 46 + 46';
    } else {
      panel.textContent = isEn
        ? 'Conservation Check ▸ Mass Number 236 = 141 + 92 + 3 | Nuclear Charge 92 = 56 + 36'
        : '守恒验算 ▸ 质量数 236 = 141 + 92 + 3 ｜ 电荷数 92 = 56 + 36';
    }
    panel.hidden = false;
  } else {
    panel.hidden = true;
  }
}

/* SCENARIO-029 (AC-11): ①②③ 幕标签高亮同步 —— 三条换幕路径
   （enterPhase / jumpToPhase / advancePhase）都必须刷新 */
function updatePhaseTabs(phaseKey) {
  document.querySelectorAll('.phase-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.phase === phaseKey);
  });
}

/* ————————————————————————————————————————————————————————————
   状态机（SCENARIO-004 / 006 / 007 / 008, AC-03）
   ———————————————————————————————————————————————————————————— */
function enterPhase(key) {
  const idx = PHASES.findIndex((p) => p.key === key);
  const safe = idx >= 0 ? idx : 0;
  state.phaseIndex = safe;
  state.phaseKey = PHASES[safe].key;
  state.phaseTime = 0;
  if (renderer) {
    clearStory();
    buildPhase(state.phaseKey);
  }
  updateNarration(state.phaseKey);
  updateLedger(state.phaseKey);
  updatePhaseTabs(state.phaseKey);
}

/* SCENARIO-008 (AC-03): (re)start a run —— 只管动画状态，从不读写导览状态；
   reset = startRun('atoms') 从初始相原子结构重新计时 */
function startRun(key) {
  state.simTime = 0;
  enterPhase(key);
}

/* SCENARIO-006/007 (AC-03): 合法键立即跳相（清零 phaseTime、优先退出导览）、
   非法键静默返回 false；导览步骤内部驱动时经 tourDriving 守卫保持导览上下文 */
function jumpToPhase(key) {
  const target = PHASES.find((p) => p.key === key);
  if (!target) return false;
  if (!state.tourDriving) exitTour();
  const idx = PHASES.indexOf(target);
  state.phaseIndex = idx;
  state.phaseKey = target.key;
  state.phaseTime = 0;
  if (renderer) {
    clearStory();
    buildPhase(state.phaseKey);
  }
  updateNarration(state.phaseKey);
  updateLedger(state.phaseKey);
  updatePhaseTabs(state.phaseKey);
  return true;
}

/* SCENARIO-004 (AC-03): phaseTime ≥ duration 才切下一相；末相 fission 的
   phaseTime 钳制在 duration（simTime 继续累积而相位驻留，不回绕） */
function advancePhase() {
  const current = PHASES[state.phaseIndex];
  if (state.phaseIndex < PHASES.length - 1) {
    if (state.phaseTime >= current.duration) {
      const nextPhase = PHASES[state.phaseIndex + 1];
      state.phaseIndex += 1;
      state.phaseKey = nextPhase.key;
      state.phaseTime = 0;
      if (renderer) {
        clearStory();
        buildPhase(state.phaseKey);
      }
      updateNarration(state.phaseKey);
      updateLedger(state.phaseKey);
      updatePhaseTabs(state.phaseKey);
    }
  } else {
    state.phaseTime = Math.min(state.phaseTime, current.duration);
  }
}

/* ————————————————————————————————————————————————————————————
   四步引导浏览（SCENARIO-018 / 019 / 020, AC-07）
   ———————————————————————————————————————————————————————————— */
function goToTourStep(k) {
  const step = TOUR_STEPS[k];
  if (!step) return;
  state.tourStep = k;
  const isEn = (i18n && i18n.currentLang === 'en');
  document.getElementById('tourTitle').textContent = isEn ? (step.enTitle || step.title) : step.title;
  document.getElementById('tourText').textContent = isEn ? (step.enText || step.text) : step.text;
  document.querySelectorAll('#tourPanel [data-step]').forEach((el, i) => {
    el.classList.toggle('active', i === k);
  });
  /* SCENARIO-019: 进入第 k 步立即以该步 phaseKey 调 jumpToPhase（即刻换相） */
  state.tourDriving = true;
  jumpToPhase(step.phaseKey);
  state.tourDriving = false;
}

function enterTour() {
  state.tourActive = true;
  state.tourStep = 0;
  document.getElementById('tourPanel').classList.add('open');
  document.getElementById('btnTour').classList.add('active');
  goToTourStep(0);
}

/* SCENARIO-020 (AC-07): 退出导览 —— tourActive=false、tourStep=null、收起面板 */
function exitTour() {
  state.tourActive = false;
  state.tourStep = null;
  document.getElementById('tourPanel').classList.remove('open');
  document.getElementById('btnTour').classList.remove('active');
}

/* ————————————————————————————————————————————————————————————
   SCENARIO-005 (AC-03): window.fissionSim —— 恰 12 方法，与 fusionSim 实测
   表面逐项一致（getPhase…gotoPhase）；禁用名 setPhase / toggleAuto 零出现
   ———————————————————————————————————————————————————————————— */
window.fissionSim = {
  getPhase: () => {
    return state.phaseKey;
  },
  getPhaseTime: () => {
    return state.phaseTime;
  },
  getSimTime: () => {
    return state.simTime;
  },
  isPaused: () => {
    return state.paused;
  },
  /* SCENARIO-010 (AC-04): 暂停冻结时间累积；⏸/▶ 文案随播放状态切换 */
  pause: () => {
    state.paused = true;
    const isEn = (i18n && i18n.currentLang === 'en');
    document.getElementById('toggleBtn').textContent = isEn ? '▶ Play' : '▶ 继续';
  },
  /* SCENARIO-010 (AC-04): 恢复从冻结点原样续算，绝不清零 simTime/phaseTime */
  resume: () => {
    state.paused = false;
    const isEn = (i18n && i18n.currentLang === 'en');
    document.getElementById('toggleBtn').textContent = isEn ? '⏸ Pause' : '⏸ 暂停';
  },
  /* SCENARIO-008 (AC-03): 重置 = 从初始相 atoms 重启，导览不受影响 */
  reset: () => {
    return startRun('atoms');
  },
  isTourActive: () => {
    return state.tourActive;
  },
  getTourStep: () => {
    return state.tourActive ? state.tourStep : null;
  },
  /* SCENARIO-012 (AC-04): getMode 回读自动/手动档 */
  getMode: () => {
    return state.autoAdvance ? 'auto' : 'manual';
  },
  /* SCENARIO-012 (AC-04): 档位与按钮文案 + aria-pressed 严格同步刷新 */
  setAutoAdvance: (on) => {
    const btn = document.getElementById('autoBtn');
    state.autoAdvance = !!on;
    const isEn = (i18n && i18n.currentLang === 'en');
    btn.textContent = isEn ? (on ? 'Auto Advance: ON' : 'Auto Advance: OFF') : (on ? '自动换幕：开' : '自动换幕：关');
    btn.setAttribute('aria-pressed', String(!!on));
  },
  /* SCENARIO-006 (AC-03): 合法键立即跳相并优先退出导览 */
  gotoPhase: (key) => {
    return jumpToPhase(key);
  },
};

/* ————————————————————————————————————————————————————————————
   播放控制接线（SCENARIO-009 ~ 012, AC-04）
   ———————————————————————————————————————————————————————————— */
document.getElementById('prevBtn').addEventListener('click', () => {
  /* SCENARIO-009: prev 模长回绕 —— atoms 的上一步环绕回 fission */
  const prevIndex = (state.phaseIndex - 1 + PHASES.length) % PHASES.length;
  jumpToPhase(PHASES[prevIndex].key);
});
document.getElementById('nextBtn').addEventListener('click', () => {
  /* SCENARIO-009: next 模长回绕 —— fission 的下一步环绕回 atoms */
  const nextIndex = (state.phaseIndex + 1) % PHASES.length;
  jumpToPhase(PHASES[nextIndex].key);
});
document.getElementById('toggleBtn').addEventListener('click', () => {
  if (state.paused) window.fissionSim.resume();
  else window.fissionSim.pause();
});
document.getElementById('resetBtn').addEventListener('click', () => {
  window.fissionSim.reset();
});
/* SCENARIO-011 (AC-04): 🎥 重置视角 —— copy 恢复保存的默认机位与目标点 */
document.getElementById('camBtn').addEventListener('click', () => {
  if (!camera || !controls) return;
  camera.position.copy(DEFAULT_CAMERA_POS);
  controls.target.copy(DEFAULT_CAMERA_TARGET);
  controls.update();
});
/* SCENARIO-012 (AC-04): 自动换幕开关同步刷新文案与 aria-pressed */
document.getElementById('autoBtn').addEventListener('click', () => {
  window.fissionSim.setAutoAdvance(!state.autoAdvance);
});
/* SCENARIO-029 (AC-11): ①②③ 幕标签 —— 直接跳相（非法键由 jumpToPhase 静默
   忽略；导览开着时点击 = 优先退出导览转自由探索，与聚变版一致） */
document.querySelectorAll('.phase-tab').forEach((btn) => {
  btn.addEventListener('click', () => jumpToPhase(btn.dataset.phase));
});
/* SCENARIO-019/020 (AC-07): 🎬 引导浏览开合切换；面板 ✕ 退出导览 */
document.getElementById('btnTour').addEventListener('click', () => {
  if (!state.tourActive) enterTour();
  else exitTour();
});
document.getElementById('tourCloseBtn').addEventListener('click', () => exitTour());
document.querySelectorAll('#tourPanel [data-step]').forEach((el, i) => {
  el.addEventListener('click', () => goToTourStep(i));
});

/* ── 新增科学交互浮窗控制 ── */
const popovers = {
  yield: document.getElementById('yieldPanel'),
  energy: document.getElementById('energyPanel'),
  moderator: document.getElementById('moderatorPanel'),
};
function togglePopover(key) {
  for (const [k, el] of Object.entries(popovers)) {
    if (!el) continue;
    if (k === key) {
      el.hidden = !el.hidden;
    } else {
      el.hidden = true;
    }
  }
}

const btnSound = document.getElementById('btnSound');
if (btnSound) {
  btnSound.addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    btnSound.textContent = state.soundEnabled ? '🔊' : '🔇';
    btnSound.classList.toggle('active', state.soundEnabled);
    if (state.soundEnabled) playNeutronCapture();
  });
}
const btnYield = document.getElementById('btnYield');
if (btnYield) {
  btnYield.addEventListener('click', () => {
    togglePopover('yield');
    btnYield.classList.toggle('active', !popovers.yield.hidden);
  });
}
const btnEnergy = document.getElementById('btnEnergy');
if (btnEnergy) {
  btnEnergy.addEventListener('click', () => {
    togglePopover('energy');
    btnEnergy.classList.toggle('active', !popovers.energy.hidden);
  });
}
const btnModerator = document.getElementById('btnModerator');
if (btnModerator) {
  btnModerator.addEventListener('click', () => {
    togglePopover('moderator');
    btnModerator.classList.toggle('active', !popovers.moderator.hidden);
  });
}

// 裂变产物碎片选择
document.querySelectorAll('.split-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.split-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.split = btn.dataset.split;
    if (popovers.yield) popovers.yield.hidden = true;
    if (btnYield) btnYield.classList.remove('active');
    updateLedger(state.phaseKey);
    if (state.phaseKey === 'fission') {
      enterPhase('fission');
    }
  });
});

// 临界系数控制棒调节
const keffDesc = document.getElementById('keffDesc');
document.querySelectorAll('.keff-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.keff-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const kType = btn.dataset.k;
    if (kType === 'sub') {
      state.keff = 0.95;
      if (keffDesc) keffDesc.textContent = '当前状态：次临界 k=0.95 · 控制棒深插入，中子吸收增多，链式反应逐渐熄灭。';
    } else if (kType === 'super') {
      state.keff = 1.05;
      if (keffDesc) keffDesc.textContent = '当前状态：超临界 k=1.05 · 控制棒微提，中子增殖，热功率稳步上升。';
    } else {
      state.keff = 1.0;
      if (keffDesc) keffDesc.textContent = '当前状态：临界 k=1.00 · 反应堆输出恒定功率，约 0.65% 缓发中子提供宝贵的受控反应时间！';
    }
  });
});

/* ————————————————————————————————————————————————————————————
   three.js 场景素材
   ———————————————————————————————————————————————————————————— */
const PROTON_R = 0.42;  // PROV: illustrative | 视觉尺度 | - | 显示半径
const NEUTRON_R = 0.36;  // PROV: illustrative | 视觉尺度 | - | 显示半径
const ELECTRON_R = 0.13;  // PROV: illustrative | 视觉尺度 | - | 显示半径

function neutronMesh() {
  return new THREE.Mesh(
    new THREE.SphereGeometry(NEUTRON_R, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xd7e0ee })
  );
}
function electronMesh() {
  return new THREE.Mesh(
    new THREE.SphereGeometry(ELECTRON_R, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0x67e8f9 })
  );
}

/* 大原子核（铀-235 = 92 质子 + 143 中子）用两颗 InstancedMesh 球堆积，
   实例总数经 clampBudget 钳制，永远 ≤ MAX_PARTICLES */
function buildNucleus(protons, neutrons) {
  const group = new THREE.Group();
  const total = clampBudget(protons + neutrons);
  const envelope = 1.06 * PROTON_R * Math.cbrt(total);  // PROV: measured | 核子堆积因子 | - | 1.06
  const pCount = Math.min(protons, total);
  const nCount = total - pCount;
  const fill = (mesh, count) => {
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      const u = Math.random() * Math.PI * 2;
      const v = Math.acos(2 * Math.random() - 1);
      const r = envelope * Math.cbrt(Math.random()) * 0.92;
      m4.makeTranslation(
        r * Math.sin(v) * Math.cos(u),
        r * Math.cos(v),
        r * Math.sin(v) * Math.sin(u)
      );
      mesh.setMatrixAt(i, m4);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  const pMesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(PROTON_R, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xf0413e }),
    Math.max(pCount, 1)
  );
  pMesh.count = pCount;
  fill(pMesh, pCount);
  const nMesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(NEUTRON_R, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0x8494b8 }),
    Math.max(nCount, 1)
  );
  nMesh.count = nCount;
  fill(nMesh, nCount);
  group.add(pMesh, nMesh);
  return { group, radius: envelope + PROTON_R };
}

/* canvas 径向渐变能量闪光贴图（AdditiveBlending 的 E=mc² 化身） */
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
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* canvas 文字标签 Sprite（中文解说随 3D 场景走） */
function makeTextSprite(text, color, scale) {
  const cnv = document.createElement('canvas');
  const measure = cnv.getContext('2d');
  const font = '600 34px "PingFang SC","Microsoft YaHei",sans-serif';
  measure.font = font;
  cnv.width = Math.ceil(measure.measureText(text).width) + 48;
  cnv.height = 72;
  const g = cnv.getContext('2d');
  g.font = font;
  g.fillStyle = 'rgba(8,12,22,.8)';
  g.strokeStyle = 'rgba(255,255,255,.18)';
  g.lineWidth = 2;
  g.beginPath();
  const r = 16;  // NO-PROV: 局部变量/运行时状态，非对外科学数值
  g.moveTo(r, 2);
  g.arcTo(cnv.width - 2, 2, cnv.width - 2, 70, r);
  g.arcTo(cnv.width - 2, 70, 2, 70, r);
  g.arcTo(2, 70, 2, 2, r);
  g.arcTo(2, 2, cnv.width - 2, 2, r);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = color;
  g.textBaseline = 'middle';
  g.fillText(text, 24, 38);
  const tex = new THREE.CanvasTexture(cnv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const spr = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
  );
  const s = scale || 1;
  spr.scale.set((cnv.width / 72) * 0.85 * s, 0.85 * s, 1);
  return spr;
}
function attachLabel(target, text, color, dy, scale) {
  const label = makeTextSprite(text, color, scale);
  label.position.set(0, dy, 0);
  target.add(label);
  return label;
}
function sceneLabel(text, color, y) {
  const label = makeTextSprite(text, color, 1.15);
  label.position.set(0, y, 0);
  storyGroup.add(label);
  return label;
}

/* ————————————————————————————————————————————————————————————
   三相位 3D 场景（SCENARIO-004, AC-03：atoms → neutron → fission）
   ———————————————————————————————————————————————————————————— */
function buildAtoms() {
  const nucleus = buildNucleus(92, 143);
  storyGroup.add(nucleus.group);
  attachLabel(nucleus.group, '铀-235 原子核：92 质子 + 143 中子', '#7dd3fc', 0.6);
  const electrons = [];
  for (let i = 0; i < 3; i++) {
    const orbit = new THREE.Group();
    orbit.rotation.set(Math.PI / 2 + (i - 1) * 0.55, i * 0.7, 0);
    const ringR = nucleus.radius + 1.7;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(ringR - 0.02, ringR + 0.02, 96),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8, transparent: true, opacity: 0.35, side: THREE.DoubleSide,
      })
    );
    orbit.add(ring);
    const e = electronMesh();
    orbit.add(e);
    storyGroup.add(orbit);
    electrons.push({ mesh: e, orbitR: ringR, angle: i * 2.1, speed: 1.1 + i * 0.3 });
  }
  attachLabel(electrons[0].mesh, '核外电子（示意，实际 92 个）', '#67e8f9', 0.55);
  sceneLabel('第 1 幕 · 原子结构：核燃料铀-235', '#e2e8f0', 4.6);
  world = {
    update(dt) {
      nucleus.group.rotation.y += dt * 0.3;
      for (const el of electrons) {
        el.angle += el.speed * dt;
        el.mesh.position.set(
          Math.cos(el.angle) * el.orbitR,
          Math.sin(el.angle) * el.orbitR,
          0
        );
      }
    },
  };
}

function buildNeutron() {
  const nucleus = buildNucleus(92, 143);
  storyGroup.add(nucleus.group);
  attachLabel(nucleus.group, '铀-235 + n → 激发复核铀-236*', '#fbbf24', 0.6);
  const neutron = neutronMesh();
  neutron.position.set(-9.5, 0.8, 0);
  storyGroup.add(neutron);
  attachLabel(neutron, '慢中子', '#cbd5e1', 0.55);
  sceneLabel('第 2 幕 · 中子俘获：复核铀-236* 剧烈振荡变形', '#fbbf24', 4.6);

  let captured = false;
  world = {
    update(dt, t) {
      if (t < 6) {
        const u = Math.min(t / 6, 1);
        neutron.position.x = -9.5 + 8.7 * Math.pow(u, 0.7);
      } else {
        if (!captured) {
          playNeutronCapture();
          captured = true;
        }
        neutron.visible = false;
        // 玻尔-惠勒液滴模型四极振荡 (Bohr-Wheeler Quadrupole Oscillation)
        const amp = 0.08 * Math.min((t - 6) / 2, 1);  // NO-PROV: 局部变量/运行时状态，非对外科学数值
        const s = 1 + Math.sin(t * 9) * amp;  // NO-PROV: 局部变量/运行时状态，非对外科学数值
        nucleus.group.scale.set(s, 1 / s, s);
      }
      nucleus.group.rotation.y += dt * 0.3;
    },
  };
}

function buildFission() {
  const SPLIT_T = 3.2;  // 复核振荡变形用时  // PROV: illustrative | 动画时序 | - | 分离时长
  const FLASH_T = 2.6;  // 闪光展开 + 淡出  // PROV: illustrative | 动画时序 | - | 闪光时长
  const nucleus = buildNucleus(92, 143);
  storyGroup.add(nucleus.group);
  attachLabel(nucleus.group, '复核铀-236*（振荡变形）', '#fbbf24', 0.6);

  // 玻尔-惠勒液滴半透明变形外壳（显示哑铃细颈断裂）
  const dropGeo = new THREE.SphereGeometry(2.1, 24, 18);
  const dropMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b, transparent: true, opacity: 0.22, wireframe: true
  });
  const dropMesh = new THREE.Mesh(dropGeo, dropMat);
  nucleus.group.add(dropMesh);

  // 碎片核配置（支持双峰产额切换）
  let p1 = 56, n1 = 85, name1 = '钡-141（56 质子 + 85 中子）', col1 = '#fbbf24';  // NO-PROV: 局部变量/运行时状态，非对外科学数值
  let p2 = 36, n2 = 56, name2 = '氪-92（36 质子 + 56 中子）', col2 = '#7dd3fc';  // NO-PROV: 局部变量/运行时状态，非对外科学数值
  let nNeutrons = 3;  // NO-PROV: 局部变量/运行时状态，非对外科学数值
  let eqStr = 'U-235 + n → Ba-141 + Kr-92 + 3n · 200 MeV（≈3.2e-11 J）';

  if (state.split === 'cs') {
    p1 = 55; n1 = 82; name1 = '铯-137（55 质子 + 82 中子 · N=82 幻数闭壳）'; col1 = '#f59e0b';
    p2 = 37; n2 = 59; name2 = '铷-96（37 质子 + 59 中子）'; col2 = '#38bdf8';
    nNeutrons = 3;
    eqStr = 'U-235 + n → Cs-137 + Rb-96 + 3n · 200 MeV（≈3.2e-11 J）';
  } else if (state.split === 'sr') {
    p1 = 54; n1 = 90; name1 = '氙-144（54 质子 + 90 中子 · 反应堆毒物）'; col1 = '#a855f7';
    p2 = 38; n2 = 52; name2 = '锶-90（38 质子 + 52 中子）'; col2 = '#4ade80';
    nNeutrons = 2;
    eqStr = 'U-235 + n → Xe-144 + Sr-90 + 2n · 200 MeV（≈3.2e-11 J）';
  } else if (state.split === 'symmetric') {
    p1 = 46; n1 = 72; name1 = '钯-118（46 质子 + 72 中子 · 对称裂变）'; col1 = '#ec4899';
    p2 = 46; n2 = 72; name2 = '钯-118（46 质子 + 72 中子）'; col2 = '#ec4899';
    nNeutrons = 0;
    eqStr = 'U-235 + n → 2 Pd-118 · 对称分裂受到强烈压制（产额 <0.01%）';
  }

  const ba = buildNucleus(p1, n1);
  const kr = buildNucleus(p2, n2);
  ba.group.visible = false;
  kr.group.visible = false;
  storyGroup.add(ba.group, kr.group);
  attachLabel(ba.group, name1, col1, 0.6);
  attachLabel(kr.group, name2, col2, 0.6);

  const freeNeutrons = [];
  for (let i = 0; i < nNeutrons; i++) {
    const n = neutronMesh();
    n.visible = false;
    storyGroup.add(n);
    freeNeutrons.push(n);
  }

  // 库仑爆炸能量闪光与冲击波环
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

  const ringGeo = new THREE.RingGeometry(0.2, 0.5, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b, transparent: true, opacity: 0.8, side: THREE.DoubleSide
  });
  const shockRing = new THREE.Mesh(ringGeo, ringMat);
  shockRing.visible = false;
  storyGroup.add(shockRing);

  const eqLabel = sceneLabel(eqStr, '#7dd3fc', 4.6);
  eqLabel.visible = false;

  let boomPlayed = false;

  world = {
    update(dt, t) {
      if (t < SPLIT_T) {
        // 玻尔-惠勒液滴模型：从球形 → 椭球 → 哑铃颈缩形 (Necking & Scission)
        const u = t / SPLIT_T;
        const stretch = 1 + u * 0.7 + Math.sin(t * 10) * 0.06;  // NO-PROV: 局部变量/运行时状态，非对外科学数值
        const pinch = 1 / Math.sqrt(stretch);  // NO-PROV: 局部变量/运行时状态，非对外科学数值
        nucleus.group.scale.set(stretch, pinch, pinch);
        dropMesh.scale.set(stretch * 1.05, pinch * 0.9, pinch * 0.9);
        nucleus.group.rotation.y += dt * 0.4;
        return;
      }
      const ft = t - SPLIT_T;
      if (!boomPlayed) {
        playFissionBoom();
        boomPlayed = true;
      }
      nucleus.group.visible = false;
      eqLabel.visible = true;
      ba.group.visible = true;
      kr.group.visible = true;

      // 库仑爆炸排斥动力学：两带正电碎片在近距离受强大静电力迅速加速分离
      const d = 7.6 * (1 - Math.exp(-ft * 0.92));  // NO-PROV: 局部变量/运行时状态，非对外科学数值
      ba.group.position.set(-d, -0.04 * d, 0);
      kr.group.position.set(d, 0.04 * d, 0);
      ba.group.rotation.y += dt * 0.6;
      kr.group.rotation.y -= dt * 0.6;

      // 瞬发中子蒸发高速向外射出 (~2 MeV)
      freeNeutrons.forEach((n, i) => {
        n.visible = true;
        const a = -0.55 + i * 0.55;  // NO-PROV: 局部变量/运行时状态，非对外科学数值
        const nd = 1.4 + ft * (4.4 + i * 0.7);  // NO-PROV: 局部变量/运行时状态，非对外科学数值
        n.position.set(
          Math.cos(a) * nd * 0.4,
          Math.sin(a) * nd * 0.35,
          Math.sin(a * 2.1) * nd * 0.3
        );
      });

      if (ft < FLASH_T) {
        flash.visible = true;
        const s = 2 + ft * 6;  // NO-PROV: 局部变量/运行时状态，非对外科学数值
        flash.scale.set(s, s, 1);
        flash.material.opacity = Math.max(0.95 * (1 - ft / FLASH_T), 0);

        shockRing.visible = true;
        const rs = 1 + ft * 9;  // NO-PROV: 局部变量/运行时状态，非对外科学数值
        shockRing.scale.set(rs, rs, 1);
        shockRing.material.opacity = Math.max(0.85 * (1 - ft / FLASH_T), 0);
      } else {
        flash.visible = false;
        shockRing.visible = false;
      }
    },
  };
}

function buildPhase(key) {
  if (key === 'atoms') buildAtoms();
  else if (key === 'neutron') buildNeutron();
  else buildFission();
}

/* dispose-on-rebuild 卫生：换相前拆掉旧场景并释放几何体/材质/贴图 */
function clearStory() {
  if (!storyGroup) return;
  storyGroup.traverse((obj) => {
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

/* ————————————————————————————————————————————————————————————
   SCENARIO-028 (AC-10): WebGL 初始化与友好降级
   ———————————————————————————————————————————————————————————— */
function initThree() {
  try {
    if (!WebGL.isWebGL2Available()) return null;
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    document.getElementById('stage').appendChild(renderer.domElement);
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#04060d');
    camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 400);
    camera.position.copy(DEFAULT_CAMERA_POS);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.copy(DEFAULT_CAMERA_TARGET);
    controls.update();
    clock = new THREE.Clock();
    storyGroup = new THREE.Group();
    scene.add(storyGroup);
    /* 星野：安静的背景（900 + 核子/电子 ≤ 245 < MAX_PARTICLES） */
    const N = 900;  // NO-PROV: 局部变量/运行时状态，非对外科学数值
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 55 + Math.random() * 90;  // NO-PROV: 局部变量/运行时状态，非对外科学数值
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.cos(ph);
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xbfd0ea, size: 0.5, transparent: true, opacity: 0.8, depthWrite: false,
    })));
    addEventListener('resize', () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });
    return renderer;
  } catch (err) {
    return null;
  }
}

/* SCENARIO-028 (AC-10): WebGL 不可用时写入 #fallback 友好提示，不白屏 */
function showFallback(message) {
  const fb = document.getElementById('fallback');
  if (!fb) return;
  fb.textContent = message;
  fb.hidden = false;
}

/* ————————————————————————————————————————————————————————————
   SCENARIO-026 (AC-10): 唯一的主循环 —— requestAnimationFrame 全文件恰 1 处；
   每帧 clock.getDelta() 并钳制 dt ≤ 0.05；暂停完全冻结时间累积
   ———————————————————————————————————————————————————————————— */
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!state.paused) {
    state.simTime += dt;
    state.phaseTime += dt;
    if (world) world.update(dt, state.phaseTime);
    advancePhase();
  }
  controls.update();
  renderer.render(scene, camera);
}

function updateTourList() {
  const isEn = (i18n && i18n.currentLang === 'en');
  const items = document.querySelectorAll('#tourSteps .tour-step');
  const labels = isEn ? [
    ['① Atoms', 'Inside U-235'],
    ['② Neutron', 'Forming U-236*'],
    ['③ Fission', 'Splitting in Two'],
    ['④ Summary', 'Conservation Law']
  ] : [
    ['① 原子结构', '认识铀-235'],
    ['② 中子俘获', '形成铀-236*'],
    ['③ 裂变反应', '一分为二'],
    ['④ 总结', '质量电荷守恒']
  ];
  items.forEach((li, idx) => {
    if (labels[idx]) {
      li.innerHTML = `<b>${labels[idx][0]}</b><span>${labels[idx][1]}</span>`;
    }
  });
  if (state.tourActive && state.tourStep !== null) {
    const s = TOUR_STEPS[state.tourStep];
    if (s) {
      document.getElementById('tourTitle').textContent = isEn ? (s.enTitle || s.title) : s.title;
      document.getElementById('tourText').textContent = isEn ? (s.enText || s.text) : s.text;
    }
  }
}

function applyFissionI18n() {
  const isEn = (i18n && i18n.currentLang === 'en');
  document.documentElement.lang = isEn ? 'en' : 'zh-CN';
  document.getElementById('btnLangZh')?.classList.toggle('active', !isEn);
  document.getElementById('btnLangEn')?.classList.toggle('active', isEn);
  i18n.applyToDOM();
  const homeBtn = document.getElementById('homeBtn');
  if (homeBtn) {
    homeBtn.href = `../index.html?lang=${i18n.currentLang}`;
    homeBtn.title = isEn ? 'Back to home portal' : '返回首页 Back to home';
  }
  document.title = isEn ? 'Nuclear Fission · 3D Interactive Simulation' : '核裂变 3D 交互动画 · Nuclear Fission';
  updateNarration(state.phaseKey);
  updateLedger(state.phaseKey);
  const toggleBtn = document.getElementById('toggleBtn');
  if (toggleBtn) {
    toggleBtn.textContent = state.paused ? (isEn ? '▶ Play' : '▶ 继续') : (isEn ? '⏸ Pause' : '⏸ 暂停');
  }
  const autoBtn = document.getElementById('autoBtn');
  if (autoBtn) {
    autoBtn.textContent = isEn ? (state.autoAdvance ? 'Auto Advance: ON' : 'Auto Advance: OFF') : (state.autoAdvance ? '自动换幕：开' : '自动换幕：关');
  }
  updateTourList();
  document.documentElement.classList.remove('i18n-loading');
  if (renderer) {
    clearStory();
    buildPhase(state.phaseKey);
  }
}

document.getElementById('btnLangZh')?.addEventListener('click', () => i18n.setLanguage('zh'));
document.getElementById('btnLangEn')?.addEventListener('click', () => i18n.setLanguage('en'));
i18n.subscribe(() => {
  applyFissionI18n();
});
applyFissionI18n();

startRun('atoms');
if (initThree()) {
  clearStory();
  buildPhase(state.phaseKey);
  animate();
} else {
  showFallback('您的浏览器不支持 WebGL 2，暂时无法播放 3D 裂变动画。请换用最新版 Chrome / Edge / Safari / Firefox，或在浏览器设置里打开「硬件加速」后再回来观看。');
}
window.__ready = true;
