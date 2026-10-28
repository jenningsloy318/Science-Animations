// printing-frontier/js/model/euv.js — 光刻分辨率模型（G19；F2 掩膜投影）
// Rayleigh 判据：R = k₁·λ / NA。锚点：13.5 nm & NA 0.33 → ~13 nm；NA 0.55 → 8 nm（ASML）。
'use strict';

export function resolution(nm, na, k1 = 0.32) {
  return (k1 * nm) / na;
}
