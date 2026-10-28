// printing-gutenberg/js/model/alloy.js — 谷登堡合金凝固模型（G06–G08；G2 合金实验室场景）
// 纯函数。derived 简化模型：锑凝固微膨胀随 Sb% 线性外推，10% 为零膨胀点（书第 6 章口径）。
'use strict';

export const ZERO_EXPANSION_SB = 10; // NO-PROV: 模型零点（书：Sb 10–15% 具热缩冷胀）

/** 成分归一化（G08）：三组分和 = 100 ± 1e-9 */
export function normalize(pct) {
  const sum = pct.pb + pct.sb + pct.sn;
  return { pb: (pct.pb / sum) * 100, sb: (pct.sb / sum) * 100, sn: (pct.sn / sum) * 100 };
}

/**
 * 凝固体积变化（%）与铸造品质。
 * @param {{pb:number, sb:number, sn:number}} pct 质量百分比（自动归一化）
 * @returns {{dVolPct:number, meltC:number, sharpness:'sharp'|'ok'|'blunt', inWindow:boolean}}
 */
export function solidification(pct) {
  const n = normalize(pct);
  // 线性外推：Sb 每高/低于零点 1%，凝固体积变化 ±0.04%（derived，演示量纲）
  const dVolPct = (n.sb - ZERO_EXPANSION_SB) * 0.04;
  // 熔点示意：铅 327°C，锑微升、锡降（derived 线性混合，演示量纲）
  const meltC = 327 * (n.pb / 100) + 631 * (n.sb / 100) + 232 * (n.sn / 100);
  const inWindow = n.pb >= 80 && n.pb <= 85 && n.sb >= 10 && n.sb <= 15 && n.sn >= 5 && n.sn <= 10;
  let sharpness = 'ok';
  if (dVolPct >= 0.02) sharpness = 'sharp';
  else if (dVolPct <= -0.02) sharpness = 'blunt';
  return { dVolPct, meltC: Math.round(meltC), sharpness, inWindow };
}
