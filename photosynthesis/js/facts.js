// ═══════════════════════════════════════════════════════
// facts.js — 光合作用：纯数据/数学模块（无 THREE、无 DOM，node 可测）
// 所有数字来自已核实的权威来源（见 README 来源表）
// ═══════════════════════════════════════════════════════

// ── 物理常数 ──
export const H_PLANCK = 6.62607015e-34;  // J·s
export const C_LIGHT = 2.99792458e8;     // m/s
export const NA = 6.02214076e23;         // /mol

// 单个光子能量（λ 单位 nm → J）
export function photonEnergyJ(nm) {
  return H_PLANCK * C_LIGHT / (nm * 1e-9);
}
// 单个光子能量（eV）
export function photonEnergyEv(nm) {
  return photonEnergyJ(nm) * 6.241509074e18;
}
// 1 mol 光子（爱因斯坦）能量，kJ/mol
export function einsteinKJPerMol(nm) {
  return photonEnergyJ(nm) * NA / 1e3;
}

// ── 光反应核心数字 ──
export const PHOTONS_PER_O2_MIN = 8;      // 理论最小值：4 e⁻ × 2 个光系统
export const PHOTONS_PER_O2_MEASURED = [8, 10]; // 实测量子需求 8–10
export const ELECTRONS_PER_O2 = 4;        // 2 H2O → O2 + 4H+ + 4e⁻
export const NADPH_PER_O2 = 2;            // 4 e⁻ → 2 NADPH

// 叶绿素吸收峰（nm）
export const ABSORPTION = {
  chlA: [430, 662],
  chlB: [455, 642],
  carotenoid: [450],          // 类胡萝卜素 400–500 nm 主带
  greenReflect: [540, 560],   // 绿光被反射 → 叶子是绿色的
};

// 电子传递链（Z 方案）：光反应 tab 的骨架
// energy = 相对电子能量（示意，用于 Z 形走势）
export const CHAIN = [
  { key: 'psii', name: 'PSII', zh: '光系统 II', P: 'P680', energy: 0.0 },
  { key: 'pheo', name: 'Pheo', zh: '去镁叶绿素', energy: -0.35 },
  { key: 'pq', name: 'PQ', zh: '质体醌', energy: -0.55 },
  { key: 'b6f', name: 'Cyt b6f', zh: '细胞色素 b6f', energy: -0.7 },
  { key: 'pc', name: 'PC', zh: '质体蓝素', energy: -0.8 },
  { key: 'psi', name: 'PSI', zh: '光系统 I', P: 'P700', energy: -1.0 },
  { key: 'fd', name: 'Fd', zh: '铁氧还蛋白', energy: -1.45 },
  { key: 'fnr', name: 'FNR', zh: 'NADP 还原酶', energy: -1.6 },
];

// Kok 循环（放氧复合体 OEC，Mn4CaO5）
export const KOK_STATES = ['S0', 'S1', 'S2', 'S3', 'S4'];
// 每 4 个电子（=每 4 次闪光/激发）触发 S4 → 放出 1 个 O2

// ATP 合酶（菠菜 c14 环）：每转 14 个 H⁺、合成 3 个 ATP
export const ATP_SYNTHASE = { cRing: 14, hPerTurn: 14, atpPerTurn: 3 };
export const H_PER_ATP = ATP_SYNTHASE.hPerTurn / ATP_SYNTHASE.atpPerTurn; // ≈4.67

// ── 卡尔文循环化学计量 ──
export const CALVIN = {
  atpPerCO2: 3,
  nadphPerCO2: 2,
  g3pPerTurns: 3,        // 每 3 圈净得 1 个 G3P（5/6 回收再生）
  co2PerGlucose: 6,
  atpPerGlucose: 18,
  nadphPerGlucose: 12,
  rubiscoKcat: 3,        // 约每秒 3 次——著名地慢
};

// ── 能量与效率 ──
export const GLUCOSE_KJ_MOL = 2870;
export const EFFICIENCY = [
  { key: 'crop', zh: '实际作物（田间）', pct: 1.5, note: '1–2%' },
  { key: 'c3', zh: 'C3 理论上限', pct: 4.6, note: 'Zhu et al. 2008' },
  { key: 'c4', zh: 'C4 理论上限', pct: 6.0, note: 'Zhu et al. 2008' },
  { key: 'pv', zh: '商品太阳能板', pct: 24, note: '量产组件' },
  { key: 'pvRecord', zh: '太阳能板纪录', pct: 27.8, note: 'LONGi HIBC 2025' },
];

// ── 总反应 ──
export const OVERALL = {
  equation: '6 CO₂ + 6 H₂O + 光能 → C₆H₁₂O₆ + 6 O₂',
  light: '12 H₂O + 12 NADP⁺ + 18 ADP + 18 Pi → 6 O₂ + 12 NADPH + 18 ATP',
  dark: '6 CO₂ + 12 NADPH + 18 ATP → C₆H₁₂O₆ + 12 NADP⁺ + 18 ADP + 18 Pi',
};

// ── 历史时间线 ──
export const TIMELINE = [
  { year: '1771', zh: 'Priestley：薄荷"净化"被蜡烛烧坏的空气', key: 'priestley' },
  { year: '1779', zh: 'Ingenhousz：只有绿色植物在光下才这样做', key: 'ingenhousz' },
  { year: '1882', zh: 'Engelmann：用丝藻+好氧菌测出作用光谱', key: 'engelmann' },
  { year: '1930s', zh: 'van Niel：O₂ 来自水，不是 CO₂', key: 'vanniel' },
  { year: '1941', zh: 'Ruben & Kamen：¹⁸O 同位素证实氧来自水', key: 'ruben' },
  { year: '1961', zh: 'Calvin：¹⁴C 示踪解出固碳循环，获诺贝尔奖', key: 'calvin' },
  { year: '2000s', zh: 'X 射线晶体学看清 OEC 的 Mn₄CaO₅ 簇与 Kok 循环', key: 'kok' },
];

// ── 全球尺度 ──
export const GLOBAL = {
  gppGtCPerYear: 120,          // 陆地 GPP ≈ 120 Gt C/年
  oceanO2Pct: '≥50%',          // 海洋浮游植物贡献的大气 O₂（NOAA）
  goeGa: 2.4,                  // 大氧化事件（十亿年前）
};

// ── 校验辅助 ──
// 卡尔文循环自洽：12 NADPH（24 e⁻）恰好还原 6 CO₂（每个 CO₂ 4 e⁻）
export function calvinConsistent() {
  return CALVIN.nadphPerGlucose * 2 === CALVIN.co2PerGlucose * 4;
}
// 光反应产物是否恰好供给 1 葡萄糖的合成：放 6 O₂（=24 e⁻=12 NADPH）
export function lightDarkBalanced() {
  return NADPH_PER_O2 * CALVIN.co2PerGlucose === CALVIN.nadphPerGlucose;
}
