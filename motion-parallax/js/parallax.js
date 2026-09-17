// ═══════════════════════════════════════════════════════════════
// parallax.js — 运动视差数学模块（纯计算，无 three.js 依赖，node 可测）
//
// 模型：观察者沿 x 轴以速度 v 匀速运动；静止物体位于横向距离 d、
//       沿轨偏移 x 处（x=0 即物体恰在观察者正侧方"齐平"瞬间）。
//
// 精确瞬时角速度：  ω(x) = v·d / (d² + x²)        [rad/s]
//   - x = 0 时取峰值 ω = v/d（博客/科普中的 ω ≈ v/d 是这个峰值）
//   - 关于 x 对称；x→±∞ 时 ω→0
// 扫角（x1→x2 之间视线扫过的角度）：Δθ = |atan(x2/d) − atan(x1/d)|
// ═══════════════════════════════════════════════════════════════

export const DEG = 180 / Math.PI;

/** 精确瞬时角速度 [rad/s]。v: 观察者速度 m/s；d: 横向距离 m；x: 沿轨偏移 m */
export function omegaExact(v, d, x) {
  return (v * d) / (d * d + x * x);
}

/** 齐平瞬间峰值角速度 ω = v/d [rad/s] */
export function omegaPeak(v, d) {
  return v / d;
}

/** rad/s → °/s */
export function toDegPerS(radPerS) {
  return radPerS * DEG;
}

/** x1→x2 之间视线扫过的角度 [°]（物体横向距离 d）*/
export function sweepAngleDeg(d, x1, x2) {
  return Math.abs(Math.atan2(x2, d) - Math.atan2(x1, d)) * DEG;
}

// ── 博客/课堂标准算例：v = 72 km/h = 20 m/s ──────────────────────
export const KMH_TO_MS = 1 / 3.6;

export const EXAMPLE = { v_ms: 20, tree_d: 10, hill_d: 2000 };

export function exampleTreeOmega() { return omegaPeak(20, 10); }   // 2.0 rad/s
export function exampleHillOmega() { return omegaPeak(20, 2000); } // 0.01 rad/s
export function exampleRatio() { return exampleTreeOmega() / exampleHillOmega(); } // 200

// ── 月亮为什么"不动"：步行 1.4 m/s，d = 384,400 km ──────────────
export const MOON_D_M = 3.844e8;
export function moonOmegaWalking(v = 1.4) { return v / MOON_D_M; }

// ── 恒星周年视差：同样的几何，把"车"换成地球公转 ─────────────────
export const PC_TO_LY = 3.26156;
/** 视差角 p（角秒）→ 距离（秒差距）。1 pc ≡ p = 1″ */
export function pcFromArcsec(p_arcsec) { return 1 / p_arcsec; }
/** 秒差距 → 光年 */
export function pcToLy(pc) { return pc * PC_TO_LY; }

/** Bessel 1838 对 61 Cygni 的测量值（现代值 0.286″）*/
export const BESSEL_61CYG_ARCSEC = 0.3136;
export const MODERN_61CYG_ARCSEC = 0.286;
/** Proxima Centauri 视差 */
export const PROXIMA_ARCSEC = 0.7685;

// ── 视觉系统参考值（用于诚实标注"为什么近树会拖影"）──────────────
export const SMOOTH_PURSUIT_MAX_DEGS = 100; // 平滑追踪上限 ~30–100°/s，超过需跳动式扫视
