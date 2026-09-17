import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONSTANTS,
  calculateEccentricity,
  calculateDeflectionAngle,
  calculateHyperbolicDeltaV,
  addVelocityVectors,
  vectorMagnitude,
  calculatePlanetSpeedChange,
  calculateKineticEnergyDelta,
  calculateTisserandParameter,
  MISSION_PRESETS
} from '../js/physics.js';

test('CONSTANTS: planetary parameters match IAU and JPL values', () => {
  const { jupiter, earth, saturn, venus } = CONSTANTS.PLANETS;
  assert.ok(jupiter.mass > 1.89e27 && jupiter.mass < 1.91e27);
  assert.ok(earth.mass > 5.96e24 && earth.mass < 5.98e24);
  assert.ok(saturn.hasRings === true);
  assert.ok(venus.orbitalSpeed_kms > 34 && venus.orbitalSpeed_kms < 36);
});

test('calculateEccentricity & DeflectionAngle: authentic hyperbolic deflection', () => {
  // Test case: Voyager 2 Jupiter encounter
  // v_inf ~ 10.8 km/s, rp ~ 643,000 km, mu_jup = 1.26686534e17 m^3/s^2
  const mu_jup = CONSTANTS.PLANETS.jupiter.mu;
  const v_inf = 10.8;
  const rp = 643000;

  const e = calculateEccentricity(v_inf, rp, mu_jup);
  // e = 1 + (6.43e8 * (10800)^2) / 1.26686534e17 = 1 + 0.592 = 1.592
  assert.ok(e > 1.5 && e < 1.7, `Expected e ~ 1.59, got ${e}`);

  const defl = calculateDeflectionAngle(v_inf, rp, mu_jup);
  // sin(delta/2) = 1/e ~ 1/1.592 ~ 0.628 -> delta/2 ~ 38.9 deg -> delta ~ 77.8 deg
  assert.ok(defl.degrees > 70 && defl.degrees < 85, `Expected deflection ~ 78 deg, got ${defl.degrees}`);

  // Hyperbolic delta-V in planet frame:
  const dv = calculateHyperbolicDeltaV(v_inf, defl.radians);
  // dv = 2 * 10.8 * sin(38.9 deg) ~ 13.57 km/s
  assert.ok(dv > 12 && dv < 15, `Expected dv ~ 13.6 km/s, got ${dv}`);
});

test('addVelocityVectors: vector addition matches heliocentric speed transformation', () => {
  // Planet moving in +X direction at 13.0 km/s
  const v_planet = [13.0, 0, 0];
  // Spacecraft deflected to leave in +X direction at 11.0 km/s relative to planet
  const v_rel = [11.0, 0, 0];
  const v_helio = addVelocityVectors(v_planet, v_rel);

  assert.deepStrictEqual(v_helio, [24.0, 0, 0]);
  assert.strictEqual(vectorMagnitude(v_helio), 24.0);

  // If deflected in opposite direction (-X):
  const v_rel_opp = [-11.0, 0, 0];
  const v_helio_opp = addVelocityVectors(v_planet, v_rel_opp);
  assert.deepStrictEqual(v_helio_opp, [2.0, 0, 0]);
  assert.strictEqual(vectorMagnitude(v_helio_opp), 2.0);
});

test('calculatePlanetSpeedChange: momentum conservation produces micro-perturbation', () => {
  // Voyager 2 mass ~ 722 kg, Jupiter mass ~ 1.898e27 kg, delta_v ~ 10.4 km/s
  const deltaV_planet = calculatePlanetSpeedChange(722, 10.4, CONSTANTS.PLANETS.jupiter.mass);
  // deltaV = (722 * 10400) / 1.8982e27 ~ 3.95e-21 m/s
  assert.ok(deltaV_planet > 1e-22 && deltaV_planet < 1e-20, `Got ${deltaV_planet}`);
});

test('calculateKineticEnergyDelta: computes exact joules transferred to probe', () => {
  // 722 kg probe accelerated from 15 km/s to 25.2 km/s
  const dE = calculateKineticEnergyDelta(722, 15.0, 25.2);
  // 0.5 * 722 * (25200^2 - 15000^2) = 0.5 * 722 * (635040000 - 225000000) = 1.48e11 J
  assert.ok(dE > 1.4e11 && dE < 1.6e11, `Expected ~1.48e11 J, got ${dE}`);
});

test('calculateTisserandParameter: returns authentic Tisserand invariant', () => {
  // For Jupiter (a_p = 5.204 AU), probe on orbit with a = 3.0 AU, e = 0.6, inc = 0
  const T = calculateTisserandParameter(3.0, 0.6, 0.0, 5.204);
  assert.ok(T > 2.5 && T < 3.5, `Expected T ~ 3.0, got ${T}`);
});

test('MISSION_PRESETS: Voyager 2, Parker, Ulysses, New Horizons profiles are intact', () => {
  assert.ok(MISSION_PRESETS.VOYAGER_2);
  assert.ok(MISSION_PRESETS.PARKER_SOLAR_PROBE);
  assert.ok(MISSION_PRESETS.ULYSSES);
  assert.ok(MISSION_PRESETS.NEW_HORIZONS);
  assert.strictEqual(MISSION_PRESETS.VOYAGER_2.stages.length, 6);
  assert.strictEqual(MISSION_PRESETS.PARKER_SOLAR_PROBE.type, 'DECELERATE');
  assert.strictEqual(MISSION_PRESETS.ULYSSES.type, 'POLAR_INCLINATION');
});

// ── 2026-09-17 新增: 真实圆锥曲线引擎 (patched conics) ──
import { hyperbolicTrajectory, earthEscapeTrajectory, REAL_ENCOUNTERS } from '../js/physics.js';

test('REAL_ENCOUNTERS: Voyager 2 Jupiter numbers match NASA/JPL sources', () => {
  const enc = REAL_ENCOUNTERS.VOYAGER_2.jupiter;
  assert.equal(enc.date, '1979-07-09 22:29 UT');
  // 近拱点 ≈ 645,000 km（云顶上方 ~57 万 km ≈ 9.0 R_J）
  assert.ok(enc.rp_km > 600000 && enc.rp_km < 700000, `rp = ${enc.rp_km}`);
  assert.ok(enc.rp_km / 71492 > 8.5 && enc.rp_km / 71492 < 9.5);
  // 日心速度 10 → 20 km/s（Planetary Society）
  assert.equal(enc.helio_in_kms, 10.0);
  assert.equal(enc.helio_out_kms, 20.0);
});

test('hyperbolicTrajectory: Voyager 2 Jupiter flyby reproduces e≈1.56, δ≈80°, vp≈22.4', () => {
  const enc = REAL_ENCOUNTERS.VOYAGER_2.jupiter;
  const t = hyperbolicTrajectory(CONSTANTS.PLANETS.jupiter.mu, enc.v_inf_kms, enc.rp_km);
  assert.ok(t.e > 1.5 && t.e < 1.62, `e = ${t.e}`);
  assert.ok(t.deflectionDeg > 76 && t.deflectionDeg < 84, `δ = ${t.deflectionDeg}`);
  // 能量守恒: v_p = sqrt(v∞² + 2μ/rp) ≈ 22.4 km/s
  assert.ok(t.vPeriapsis_kms > 21.5 && t.vPeriapsis_kms < 23.5, `vp = ${t.vPeriapsis_kms}`);
  // 渐近线角与转角自洽: ν∞ = 90° + δ/2
  assert.ok(Math.abs(t.nuAsymptoteDeg - (90 + t.deflectionDeg / 2)) < 1.0);
  // 解析自洽: 半通径 p = a(1-e²), rp = p/(1+e)
  const rpAnalytic = t.p / (1 + t.e);
  assert.ok(Math.abs(rpAnalytic - enc.rp_km * 1000) < 1.0, `rp analytic = ${rpAnalytic}`);
});

test('earthEscapeTrajectory: v∞=9.3 gives e≈2.4, perigee speed ≈14.4 km/s', () => {
  const esc = earthEscapeTrajectory(9.3, 200);
  assert.ok(esc.e > 2.2 && esc.e < 2.6, `e = ${esc.e}`);
  assert.ok(esc.vPeriapsis_kms > 14.0 && esc.vPeriapsis_kms < 15.0, `vp = ${esc.vPeriapsis_kms}`);
  // C3 = v∞² ≈ 86.5 km²/s²（量级正确）
  const c3 = 9.3 * 9.3;
  assert.ok(c3 > 80 && c3 < 95);
});

test('hyperbolicTrajectory: shape is symmetric and asymptotic', () => {
  const t = hyperbolicTrajectory(CONSTANTS.PLANETS.jupiter.mu, 10.5, 645000);
  const n = t.points.length;
  const first = t.points[0], last = t.points[n - 1];
  // 入射/出射渐近线对称: |r(-νmax)| == |r(+νmax)|
  assert.ok(Math.abs(first.r - last.r) < 1.0);
  // 出射距离远大于 rp（真实"甩出"形状: 绘图截断在渐近线的 94%）
  assert.ok(last.r > t.rp_m * 10, `outbound r = ${last.r / 1e9} Gm vs rp`);
  assert.ok(Math.abs(first.r - last.r) / last.r < 1e-9);
});
