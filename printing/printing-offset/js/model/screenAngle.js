// printing-offset/js/model/screenAngle.js — 网角龟纹指数（G14；O4 场景）
// 四色网角两两「有效夹角」过小 → 叠网干涉（龟纹）风险升高。
'use strict';

export const DEFAULT_ANGLES = Object.freeze({ c: 15, m: 75, y: 90, k: 45 }); // PROV: measured | PrintPlanet/Kent the Book Printer | - | 行业标准四色网角

function effectiveDist(a, b) {
  // 网点格栅 90° 对称：距离取 min(|a−b| mod 90, 90−|a−b| mod 90)
  const d = Math.abs(a - b) % 90;
  return Math.min(d, 90 - d);
}

/** @returns {{minPair:number, index:'low'|'mid'|'high'}} index 越小越好 */
export function moireIndex(angles = DEFAULT_ANGLES) {
  const ks = Object.keys(angles);
  let minPair = 90; // NO-PROV: 内部哨兵初值（算法占位，非对外科学数值）
  for (let i = 0; i < ks.length; i++) {
    for (let j = i + 1; j < ks.length; j++) {
      const d = effectiveDist(angles[ks[i]], angles[ks[j]]);
      if (d < minPair) minPair = d;
    }
  }
  const index = minPair < 10 ? 'high' : minPair < 15 ? 'mid' : 'low';
  return { minPair, index };
}
