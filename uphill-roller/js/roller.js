// ═══════════════════════════════════════════════════════
// roller.js — 锥体上滚：纯数学模块（无 THREE、无 DOM）
// 权威公式来源：plus.maths.org "Defying gravity: The Uphill Roller"
//   y(x) = a + r + x·(tan α − tan β·tan γ)
//   上坡条件：tan α < tan β · tan γ
// a = 低端支撑高度, r = 双锥体中心半径（半厚）, α/β/γ 见参数对象
// ═══════════════════════════════════════════════════════

export const DEG = Math.PI / 180;

export const DEFAULT = {
  alphaDeg: 4.6,     // 轨道倾角 α（Leybourn 实测模型）
  betaDeg: 15.3,     // V 型轨道半张角 β
  gammaDeg: 25.4,    // 双锥体半顶角 γ
  R: 3,              // 双锥体中心半径（半厚，单位 in）
  L_half: 9,         // 单锥长度（中→顶，单位 in）
};

// 1694 年 William Leybourn《Pleasure with Profit》中的配方推导值
// （tan α = 1/√143, tan β = 3/√134, tan γ = 1/3 → 条件简化为 143 > 134）
export const LEYBURN_EXACT = {
  tanAlpha: 1 / Math.sqrt(143),
  tanBeta: 3 / Math.sqrt(134),
  tanGamma: 1 / 3,
  check: "143 > 134  ✓",
};

export function tan(deg) { return Math.tan(deg * DEG); }

export function y(x, { alphaDeg, betaDeg, gammaDeg, R, L_half } = DEFAULT) {
  return (R) + x * (tan(alphaDeg) - tan(betaDeg) * tan(gammaDeg));
}

// 上坡是否成立（梯度为负 → 重心随 x 增加而下降）
export function isValid({ alphaDeg, betaDeg, gammaDeg } = DEFAULT) {
  return tan(alphaDeg) < tan(betaDeg) * tan(gammaDeg);
}

// 沿轨道走了水平距离 x 后，锥体在轨道方向上的位置（距低端）
export function railPosition(x, { alphaDeg } = DEFAULT) {
  return x / Math.cos(alphaDeg * DEG);
}

// 接触点横向上距中心线的半距离（每根轨道各占一半）
export function contactHalf(x, { betaDeg } = DEFAULT) {
  return x * tan(betaDeg);
}

// 锥体在 z 方向（轴线方向）的中心位置：越往上锥体越"陷"进去
export function coneZ(x, { betaDeg, R, L_half } = DEFAULT) {
  return L_half * (1 - (x * tan(betaDeg)) / R);
}

// 上坡旅程的终点：锥体顶角恰好接触轨道时
export function journeyEnd({ betaDeg, R } = DEFAULT) {
  return R / tan(betaDeg);
}

// 重心下降总量（从起点到旅程终点）
export function totalDrop(p = DEFAULT) {
  const xEnd = journeyEnd(p);
  return y(0, p) - y(xEnd, p);
}

// 纯滚动：锥体前进单位水平距离需绕自身轴转过的角度（弧度）
export function rollAnglePerX(x, { alphaDeg, betaDeg, R } = DEFAULT) {
  // 接触处锥面半径 = x·tan β；前进 dx → 锥面弧长 dx / cos α
  const rContact = Math.max(x * tan(betaDeg), 0.001);
  return 1 / (rContact * Math.cos(alphaDeg * DEG));
}

export function info(p = DEFAULT) {
  const xEnd = journeyEnd(p);
  return {
    ...p,
    tanAlpha: tan(p.alphaDeg),
    tanBeta: tan(p.betaDeg),
    tanGamma: tan(p.gammaDeg),
    conditionOK: isValid(p),
    startCoM: y(0, p),
    endCoM: y(xEnd, p),
    drop: y(0, p) - y(xEnd, p),
    journeyX: xEnd,
    dropPerUnitX: tan(p.alphaDeg) - tan(p.betaDeg) * tan(p.gammaDeg),
  };
}
