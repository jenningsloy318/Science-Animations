// common/js/nuclide.js — IUPAC 标准核素符号格式化工具（spec 09 决策 D17）
//
// 规则（与 nuclear-fusion-3d/index.html:166 FAQ 严格一致）：
// - 左上角（上标）= 质量数 A（质子数 + 中子数）
// - 左下角（下标）= 质子数 Z（原子序数）
// - 完整记法：ᴬ_Z Symbol，如 ¹⁴¹₅₆Ba、²₁H、³₁H
'use strict';

const SUPERSCRIPTS = Object.freeze({
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻'
});

const SUBSCRIPTS = Object.freeze({
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋'
});

/**
 * 将整数或字符串转换为 Unicode 上标
 * @param {number|string} val
 * @returns {string}
 */
export function toSuperscript(val) {
  return String(val).split('').map(c => SUPERSCRIPTS[c] || c).join('');
}

/**
 * 将整数或字符串转换为 Unicode 下标
 * @param {number|string} val
 * @returns {string}
 */
export function toSubscript(val) {
  return String(val).split('').map(c => SUBSCRIPTS[c] || c).join('');
}

/**
 * 格式化 IUPAC 规范核素符号
 * @param {number|string} A 质量数（上标）
 * @param {number|string|null} [Z] 质子数（下标，可选）
 * @param {string} symbol 元素符号，如 'Ba', 'H'
 * @param {boolean} [withZ=true] 是否包含质子数下标
 * @returns {string} 如 '¹⁴¹₅₆Ba' 或 '²H'
 */
export function formatNuclide(A, Z, symbol, withZ = true) {
  const superA = toSuperscript(A);
  if (!withZ || Z == null) {
    return `${superA}${symbol}`;
  }
  const subZ = toSubscript(Z);
  return `${superA}${subZ}${symbol}`;
}

/**
 * 站内常用核素预设，保证各子项目字面一致
 */
export const NUCLIDES = Object.freeze({
  // 聚变体系
  H_2: formatNuclide(2, 1, 'H'),
  H_3: formatNuclide(3, 1, 'H'),
  HE_4: formatNuclide(4, 2, 'He'),
  HE_3: formatNuclide(3, 2, 'He'),
  B_11: formatNuclide(11, 5, 'B'),

  // 裂变体系
  U_235: formatNuclide(235, 92, 'U'),
  U_236: formatNuclide(236, 92, 'U'),
  BA_141: formatNuclide(141, 56, 'Ba'),
  KR_92: formatNuclide(92, 36, 'Kr'),
  CS_137: formatNuclide(137, 55, 'Cs'),
  RB_96: formatNuclide(96, 37, 'Rb'),
  XE_144: formatNuclide(144, 54, 'Xe'),
  SR_90: formatNuclide(90, 38, 'Sr'),
  PD_118: formatNuclide(118, 46, 'Pd'),
});
