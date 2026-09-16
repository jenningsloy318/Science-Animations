// astro.js — 真实天文公式（纯函数，可在 node 中验证）
// 依据：Wikipedia Earth's rotation / Axial precession（已核对）：
//   黄赤交角 ε = 23.44°（当前值，41,000 年周期内 22.1°–24.5° 摆动）
//   恒星日 = 23h56m4s（86,164.1 s）；太阳日 = 24h
//   赤道自转线速度 = 465.1 m/s ≈ 1674 km/h
//   轴向岁差周期 ≈ 25,772 年（约 50.3″/年）
//   轨道偏心率 e = 0.0167（近日点 1 月初 ≈1.471 亿 km，远日点 7 月初 ≈1.521 亿 km）
'use strict';
window.ASTRO = {};

const D2R = Math.PI / 180, R2D = 180 / Math.PI;

ASTRO.TILT = 23.44;                  // 黄赤交角（度）
ASTRO.SIDEREAL_H = 23 + 56/60 + 4/3600;   // 恒星日（小时）
ASTRO.EQ_SPEED = 465.1;              // 赤道线速度 m/s
ASTRO.PRECESSION_YR = 25772;         // 岁差周期（年）

// ── 太阳赤纬 δ（度）——NOAA 近似，误差 <1° ─────────────────────
// N = 一年中的第几天（1 月 1 日 = 1）
ASTRO.declination = function (N) {
  return -ASTRO.TILT * Math.cos(D2R * 360 / 365 * (N + 10));
};

// ── 太阳直射经度（度，东经正）——忽略均时差（±16 min，注明）───
ASTRO.subsolarLon = function (utcHours) {
  let lon = 180 - 15 * utcHours;
  lon = ((lon + 540) % 360) - 180;
  return lon;
};

// ── 太阳黄经 λ（度）——春分（N≈80）为 0 ────────────────────────
ASTRO.solarLongitude = function (N) {
  return ((N - 80) / 365.25 * 360) % 360;
};

// ── 昼长（小时）：cos H = −tanφ·tanδ ──────────────────────────
// 极昼 → 24；极夜 → 0。latDeg 北正。
ASTRO.dayLength = function (latDeg, declDeg) {
  const x = -Math.tan(latDeg * D2R) * Math.tan(declDeg * D2R);
  if (x <= -1) return 24;
  if (x >= 1) return 0;
  const H = Math.acos(x) * R2D;                    // 半昼弧（度）
  return 2 * H / 15;
};

// ── 纬度 φ 的地表自转线速度（m/s）────────────────────────────
ASTRO.rotationSpeed = function (latDeg) {
  return ASTRO.EQ_SPEED * Math.cos(latDeg * D2R);
};

// ── 季节标签 ──────────────────────────────────────────────────
ASTRO.seasonLabel = function (N) {
  // 北半球节气（近似日期）：春分 3/20 (N=79) 夏至 6/21 (N=172) 秋分 9/23 (N=266) 冬至 12/21 (N=355)
  if (N >= 76 && N <= 84) return '春分附近（3/20）';
  if (N >= 169 && N <= 176) return '夏至附近（6/21）';
  if (N >= 262 && N <= 270) return '秋分附近（9/23）';
  if (N >= 351 || N <= 5) return '冬至附近（12/21）';
  if (N > 84 && N < 169) return '北半球春季';
  if (N > 176 && N < 262) return '北半球夏季';
  if (N > 270 && N < 351) return '北半球秋季';
  return '北半球冬季';
};

// ── 世界坐标太阳方向 / 地轴（供场景用，向量以数组返回）────────
// 约定：黄道面 = XZ 平面，太阳固定在 +X 远处；地轴随季节绕 Y 倾摆。
ASTRO.axisDir = function (N) {
  // 太阳黄经 λ；地轴方位角 ψ = 90° − λ，使 sun·axis = sin(tilt)·sin(λ)
  const lam = ASTRO.solarLongitude(N) * D2R;
  const psi = Math.PI / 2 - lam;
  const t = ASTRO.TILT * D2R;
  return [Math.sin(t) * Math.cos(psi), Math.cos(t), Math.sin(t) * Math.sin(psi)];
};

// 地球自转角（弧度，绕自身 Y）：使直射经度 = 180 − 15·UTC
// 基向量推导：q_tilt = setFromUnitVectors(+Y → axis) 是最小旋转，垂直于 (Y,axis) 平面的方向不变，
// 所以局部 X 的世界像 e1 = axis×e2，局部 Z 的像 e2 = Y×axis（归一化后）。
// 太阳 +X 在地心系的纹理经度 lonSun = atan2(−sz, sx)，s = lonSun − 目标直射经度。
ASTRO.spinAngle = function (N, utcHours) {
  const axis = ASTRO.axisDir(N);
  let e2 = [axis[2], 0, -axis[0]];                 // Y×axis（up=(0,1,0) 的正确叉积）
  const l2 = Math.hypot(...e2); e2 = e2.map(v => v / l2);
  const e1 = [axis[1]*e2[2] - axis[2]*e2[1], axis[2]*e2[0] - axis[0]*e2[2], axis[0]*e2[1] - axis[1]*e2[0]];
  const sx = e1[0], sz = -e2[0];                   // 局部 Z 的世界像是 -e2（最小旋转），故取负
  const lonSun = Math.atan2(-sz, sx);
  const target = D2R * ASTRO.subsolarLon(utcHours);
  let s = lonSun - target;
  s = ((s % (2*Math.PI)) + 2*Math.PI) % (2*Math.PI);
  return s;
};
