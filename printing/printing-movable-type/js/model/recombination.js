// printing-movable-type/js/model/recombination.js — 活字经济性模型（G03；M4 金简算账场景）
// 纯函数。成本模型（illustrative 单位费率 + certified 结构关系）：
//   雕版 C_block(n)   = carve × chars × n            —— 每一版都要重刻
//   活字 C_movable(n) = typeMake × library + compose × chars × n  —— 字库一次投入 + 排字
'use strict';

export const DEFAULT_RATES = Object.freeze({
  carve: 1.0,   // NO-PROV: 量纲基准（雕版每字单位成本，illustrative）
  typeMake: 0.4, // NO-PROV: illustrative（铸/刻单字模相对成本）
  compose: 0.12, // NO-PROV: illustrative（活字排字每字相对成本）
});

/**
 * @param {{chars:number, editions:number, library:number, rates?:object}} p
 * chars = 每版字数；editions = 印几版（重印次数）；library = 字库规模
 */
export function costCompare(p) {
  const r = { ...DEFAULT_RATES, ...(p.rates || {}) };
  const block = r.carve * p.chars * p.editions;
  const movable = r.typeMake * p.library + r.compose * p.chars * p.editions;
  // crossover：movable 开始占优的版次（ceil）
  const denom = p.chars * (r.carve - r.compose);
  const crossover = denom > 0 ? Math.ceil((r.typeMake * p.library) / denom) : Infinity;
  return { block, movable, crossover, movableWins: movable < block };
}

/** G03 断言辅助：crossover 单调（editions↑ 时 movable 优势单调扩大） */
export function advantageCurve(p, editionsList) {
  return editionsList.map((n) => costCompare({ ...p, editions: n }).movable - costCompare({ ...p, editions: n }).block);
}
