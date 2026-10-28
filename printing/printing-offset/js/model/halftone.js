// printing-offset/js/model/halftone.js — CMYK 网点减色混色模型（G12/G13/G15；O4 网点调色台）
// Murray–Davies（1936）反射率线性形式（简化说明：不含油墨扩展/叠印顺序/Yule–Nielsen）。
'use strict';

// 实地油墨反射率（演示量纲；derived 近似标准胶印油墨色相）
export const PAPER = [250, 250, 245]; // NO-PROV: illustrative（纸白演示常量）
export const SOLID = Object.freeze({
  c: [35, 150, 200],  // NO-PROV: illustrative（青实地反射率演示值）
  m: [210, 30, 130],  // NO-PROV: illustrative（品红实地反射率演示值）
  y: [245, 205, 20],  // NO-PROV: illustrative（黄实地反射率演示值）
  k: [25, 25, 25],    // NO-PROV: illustrative（黑实地反射率演示值）
});

const clamp01 = (v) => Math.min(1, Math.max(0, v));

/**
 * CMYK 网点面积（0–100）→ 估计 RGB。
 * 每通道：R = R_paper × Π_inks (1 − a·(1 − R_solid,ch / R_paper,ch))（Murray–Davies 反射率形式）
 */
export function mix({ c = 0, m = 0, y = 0, k = 0 }) {
  const a = { c: clamp01(c / 100), m: clamp01(m / 100), y: clamp01(y / 100), k: clamp01(k / 100) };
  const rgb = [0, 1, 2].map((ch) => {
    let r = PAPER[ch];
    for (const ink of ['c', 'm', 'y', 'k']) {
      const rs = SOLID[ink][ch];
      r *= 1 - a[ink] * (1 - rs / PAPER[ch]);
    }
    return Math.round(Math.min(255, Math.max(0, r)));
  });
  return { rgb, brightness: (rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114) };
}

/** G15 边界恒等：a=0 → 纸白；a=1(单色) → 实地反射率 */
export function boundaryIdentity(ink) {
  const full = { c: 0, m: 0, y: 0, k: 0, [ink]: 100 };
  return mix(full).rgb;
}
