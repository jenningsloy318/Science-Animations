// ═══════════════════════════════════════════════════════
// facts.js — 太阳能电池：纯物理数据与数学模型模块 (SSOT)
// 无 THREE、无 DOM，Node.js 可直接执行测试
// 所有数据严格契合 docs/requirements/06-solar-cell-system-integration-spec.md
// 单源真理 (SSOT) 库：带隙、直接跃迁、深度表、常数、公式模型与测试断言基准
// ═══════════════════════════════════════════════════════

// ── 基础物理常数 ──
export const H_PLANCK = 6.62607015e-34;       // J·s (普朗克常数)
export const C_LIGHT = 2.99792458e8;          // m/s (光速)
export const Q_E = 1.602176634e-19;           // C (元电荷)
export const K_BOLTZMANN = 1.380649e-23;      // J/K (玻尔兹曼常数)
export const EPS_0 = 8.8541878128e-14;        // F/cm (真空介电常数)
export const HC_EV_NM = 1239.84193;           // hc 转换系数 (eV·nm)

// ── 硅材料本征物理参数 (300 K) ──
export const EG_SI = 1.124;                   // eV (间接禁带宽度)
export const E_DIR_SI = 3.4;                  // eV (直接光学跃迁阈值)
export const EPS_R_SI = 11.7;                 // 相对介电常数
export const LATTICE_CONST_A = 5.4307;        // Å (金刚石立方晶胞常数)
export const N_INTRINSIC_SI = 1.0e10;         // cm⁻³ (300K 本征载流子浓度)
export const MU_E_SI = 1400;                  // cm²/(V·s) (电子迁移率)
export const MU_H_SI = 450;                   // cm²/(V·s) (空穴迁移率)
export const D_E_SI = 36.0;                   // cm²/s (电子扩散系数)
export const D_H_SI = 12.0;                   // cm²/s (空穴扩散系数)

// ── 光学吸收深度数据表 (Green & Keevers 1995, 300 K) ──
// 波长 nm -> 穿透深度 μm (1/α)
export const OPTICAL_DEPTH_UM = {
  365: 0.009,    // < 10 nm (深紫外垂直跃迁)
  400: 0.105,    // 0.105 μm (近紫)
  550: 1.56,     // 1.56 μm (绿光，在 1.5~1.6 μm 范围)
  700: 5.26,     // 5.26 μm (红光)
  850: 22.0,     // 22 μm (浅红外)
  1000: 156.0,   // 156 μm (近红外，在 150~160 μm 范围，等于标准片厚)
  1100: 2857.0,  // 2.86 mm (带隙边缘近透)
};

// ── 太阳辐射与光学陷光 ──
export const SOLAR_AM0 = 1367;                // W/m² (太空太阳常数)
export const SOLAR_AM15G = 1000;              // W/m² (地面标准 STC)
export const PYRAMID_ANGLE_DEG = 54.74;       // deg (各向异性腐蚀 {111} 面倾角 arctan(sqrt(2)))
export const R_BARE_SI = 0.35;                // 裸硅加权反射率 ≈ 35%
export const R_TEXTURED_ARC = 0.018;          // 绒面+减反膜反射率 ≈ 1.8% (1.5%~2.0%)

// ── 损耗预算与物理极限 ──
export const LOSS_BUDGET = {
  subBandgap: 0.19,                           // 19% 亚带隙穿透损耗
  thermalization: 0.33,                       // 33% 载流子热化弛豫发热
  matchedBandgap: 0.48,                       // 48% 理想带隙匹配总可用能
};

export const EFFICIENCY_LADDER = {
  idealSingleJunctionSQ: 0.337,               // 33.7% 1-sun 理想黑体辐射 SQ 极限
  siRadiativeLimit: 0.322,                    // 32.2% 硅辐射复合极限
  siAugerLimit: 0.2943,                       // 29.43% 硅三粒子俄歇非辐射复合极限 (Richter 2013)
  longiHIBCRecord: 0.2781,                    // 27.81% 隆基单结单晶硅世界纪录 (ISFH 认证 2025-04)
  commercialModule: 0.245,                    // 24.5% 现代高量产组件效率
  longiTandemRecord: 0.3485,                  // 34.85% 钙钛矿/硅两端叠层电池纪录 (NREL 2025)
  longiTandemLatest: 0.3550,                  // 35.50% 钙钛矿/硅两端叠层最新突破 (ESTI 2026)
  cpvSingleJunctionLimit: 0.408,              // 40.8% 46200x 极限聚光单结 SQ 极限
  landsbergCarnotLimit: 0.868,                // 86.8% 无限叠层热力学兰兹伯格极限
  carnotLimit: 0.950,                         // 95.0% 太阳热机卡诺上限 (1 - 300/6000)
};

// ── 器件物理特性 ──
export const TEMP_COEFF_VOC = -0.0021;        // V/°C (-2.1 mV/°C)
export const CELLS_PER_MODULE = 72;           // 典型工业组件片数
export const CELL_OPERATING_VOLT = 0.60;      // V (工作点单片单体电压)
export const FLEXIBLE_SI_THICKNESS_UM = 60;   // μm (Nature 2023 可折叠单晶硅极限厚度)
export const TUNNELING_BARRIER_NM_MAX = 3.0;  // nm (场致欧姆接触量子隧穿势垒极限厚度)

// ═══════════════════════════════════════════════════════
// 纯物理函数与公式推导
// ═══════════════════════════════════════════════════════

/** 光子波长 (nm) 转换为能量 (eV) */
export function photonEnergyEv(nm) {
  return HC_EV_NM / nm;
}

/** 禁带宽度 Eg (eV) 对应的截止吸收波长 λc (nm) */
export function cutoffWavelengthNm(Eg = EG_SI) {
  return HC_EV_NM / Eg;
}

/** 直接跃迁能量 Edir (eV) 对应的垂直激发阈值波长 (nm) */
export function directWavelengthNm(Edir = E_DIR_SI) {
  return HC_EV_NM / Edir;
}

/** 四分之一波长光学减反射膜相消干涉理论厚度 d = λ0 / (4n) (nm) */
export function arcThicknessNm(n = 2.05, lambda0 = 600) {
  return lambda0 / (4 * n);
}

/** 四棱锥金字塔晶面倾角 (deg) = arctan(sqrt(2)) */
export function pyramidAngleDeg() {
  return Math.atan(Math.SQRT2) * (180 / Math.PI);
}

/** 非对称结空间电荷区耗尽层深度比 xp / xn = ND / NA */
export function junctionDepletionRatio(ND, NA) {
  return ND / NA;
}

/**
 * 理想二极管伏安特性方程:
 * I(V) = Isc - I0 * (exp(qV / (k_B * T)) - 1)
 */
export function diodeCurrent(V, { Isc = 6.0, I0 = 1e-10, T = 300 } = {}) {
  const Vt = (K_BOLTZMANN * T) / Q_E;
  const I = Isc - I0 * (Math.exp(V / Vt) - 1);
  return Math.max(0, I);
}

/** 计算给定负载电压下的瞬时输出电功率 P = V * I(V) */
export function mpptPower(V, opts) {
  return V * diodeCurrent(V, opts);
}

/** 开路电压 Voc: I(Voc) = 0 => Voc = Vt * ln(Isc / I0 + 1) */
export function openCircuitVoltage({ Isc = 6.0, I0 = 1e-10, T = 300 } = {}) {
  const Vt = (K_BOLTZMANN * T) / Q_E;
  return Vt * Math.log(Isc / I0 + 1);
}

/** 填充因子 Fill Factor = Pmax / (Voc * Isc) */
export function fillFactor(Pmax, Voc, Isc) {
  return Pmax / (Voc * Isc);
}

/** 温度变化对开路电压的影响 ΔVoc = dVoc/dT * ΔT */
export function tempDeltaVoc(deltaT) {
  return TEMP_COEFF_VOC * deltaT;
}

/** 72 片组件串联总输出电压 */
export function moduleSeriesVoltage(numCells = CELLS_PER_MODULE, cellV = CELL_OPERATING_VOLT) {
  return numCells * cellV;
}

/** 钙钛矿/硅两端叠层串联开路电压叠加 Voc_tandem ≈ Voc_pero + Voc_si */
export function tandemSeriesVoltage(Vpero = 1.25, Vsi = 0.65) {
  return Vpero + Vsi;
}

/** 俄歇非辐射复合速率比例 R_Auger = Cn * n²p + Cp * n p² */
export function augerRateRatio(n, p) {
  return n * n * p; // 示性立方项
}

/** 少数载流子扩散长度 L = sqrt(D * tau) */
export function carrierDiffusionLengthUm(D_cm2_s, tau_s) {
  const L_cm = Math.sqrt(D_cm2_s * tau_s);
  return L_cm * 1e4; // 转换为微米 μm
}

/**
 * 介电弛豫时间 τd = (εr * ε0 * ρ)
 * @param {number} rho_ohm_cm 硅片电阻率 (Ω·cm)
 * @param {number} eps_r 相对介电常数 (11.7)
 * @returns {number} 弛豫时间 (秒 s)
 */
export function dielectricRelaxationTimeSec(rho_ohm_cm = 1.0, eps_r = EPS_R_SI) {
  return eps_r * EPS_0 * rho_ohm_cm;
}

/**
 * 高注入双极扩散系数 Da = 2 * Dn * Dp / (Dn + Dp)
 */
export function ambipolarDiffusionCoeff(Dn = D_E_SI, Dp = D_H_SI) {
  return (2 * Dn * Dp) / (Dn + Dp);
}

/**
 * 聚光倍数 C 下的热力学开路电压提升:
 * ΔVoc = (kB * T / q) * ln(C)
 */
export function cpvVoltageBoostV(concentrationC = 1000, T = 300) {
  const Vt = (K_BOLTZMANN * T) / Q_E;
  return Vt * Math.log(concentrationC);
}

/** 金刚石晶格四面体成键夹角 (deg) = arccos(-1/3) */
export function diamondBondAngleDeg() {
  return Math.acos(-1 / 3) * (180 / Math.PI);
}
