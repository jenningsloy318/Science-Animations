import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONSTANTS,
  calculateExhaustVelocity,
  calculateThrustAndIsp,
  calculateChildLangmuirCurrentDensity,
  calculateApertureOptics,
  evaluateRingCuspBField,
  MISSION_PRESETS
} from '../js/physics.js';

test('CONSTANTS: fundamental physical constants are accurate', () => {
  assert.strictEqual(CONSTANTS.E_CHARGE, 1.602176634e-19);
  assert.strictEqual(CONSTANTS.G0, 9.80665);
  // Xenon mass ~ 131.293 amu
  assert.ok(Math.abs(CONSTANTS.M_XE - 2.18017e-25) < 1e-28);
  // 1st ionization potential of Xenon is ~12.13 eV
  assert.strictEqual(CONSTANTS.XE_IONIZATION_EV, 12.13);
});

test('calculateExhaustVelocity: accurately computes ion speed from net voltage', () => {
  // At 1100 V (NSTAR nominal): ve = sqrt(2 * q * V / m) ~ 40.18 km/s
  const ve1100 = calculateExhaustVelocity(1100);
  assert.ok(Math.abs(ve1100 - 40185) < 100, `Expected ~40185 m/s, got ${ve1100}`);

  // At 1500 V: ve ~ 46.94 km/s
  const ve1500 = calculateExhaustVelocity(1500);
  assert.ok(Math.abs(ve1500 - 46944) < 100, `Expected ~46944 m/s, got ${ve1500}`);

  // At 1800 V (NEXT max): ve ~ 51.42 km/s
  const ve1800 = calculateExhaustVelocity(1800);
  assert.ok(Math.abs(ve1800 - 51425) < 100, `Expected ~51425 m/s, got ${ve1800}`);
});

test('calculateThrustAndIsp: accurately models NSTAR Dawn operating point', () => {
  // NSTAR Dawn at 2.3 kW:
  // V_screen = 1100 V, V_accel = -180 V, flow = 3.0 mg/s (xenon total)
  const result = calculateThrustAndIsp(1100, -180, 3.0e-6);
  // Thrust should be approximately 92 mN (+/- 5 mN)
  assert.ok(result.thrust_mN >= 85 && result.thrust_mN <= 96, `Expected ~92 mN, got ${result.thrust_mN}`);
  // Isp should be approximately 3100 s (+/- 150 s)
  assert.ok(result.isp_s >= 2900 && result.isp_s <= 3300, `Expected ~3100 s, got ${result.isp_s}`);
  // Total electric power should be between 2.0 kW and 2.5 kW
  assert.ok(result.power_kW >= 2.0 && result.power_kW <= 2.5, `Expected ~2.3 kW, got ${result.power_kW}`);
});

test('calculateChildLangmuirCurrentDensity: space-charge limit scales as V^(3/2) / d^2', () => {
  const d = 0.002; // 2 mm gap
  const j1 = calculateChildLangmuirCurrentDensity(1280, d); // 1100 - (-180) = 1280V
  const j2 = calculateChildLangmuirCurrentDensity(2050, d); // 1800 - (-250) = 2050V
  assert.ok(j1 > 0);
  assert.ok(j2 > j1, 'Higher voltage must yield higher Child-Langmuir limit');
  // Ratio should match (2050/1280)^(3/2) ~ 2.02
  const ratio = j2 / j1;
  const expectedRatio = Math.pow(2050 / 1280, 1.5);
  assert.ok(Math.abs(ratio - expectedRatio) < 0.05);
});

test('evaluateRingCuspBField: central axis has near-zero magnetic field, while cusps near wall have strong fields', () => {
  // Core center (r = 0, x = 0): should be low field (< 0.01 Tesla)
  const bCore = evaluateRingCuspBField(0, 0, 0);
  const magCore = Math.hypot(bCore.bx, bCore.by, bCore.bz);
  assert.ok(magCore < 0.01, `Core field should be small, got ${magCore} T`);

  // Near middle ring wall (x = -0.5, y = 1.45, z = 0): should be strong cusp field (> 0.05 Tesla)
  const bWall = evaluateRingCuspBField(-0.5, 1.45, 0);
  const magWall = Math.hypot(bWall.bx, bWall.by, bWall.bz);
  assert.ok(magWall > 0.04, `Wall cusp field should be strong, got ${magWall} T`);
});

test('MISSION_PRESETS: contains historical deep space missions with validated aerospace parameters', () => {
  const expectedMissions = ['NSTAR_DAWN', 'NEXT_NASA', 'BEPICOLOMBO_T6', 'LIPS_300'];
  for (const id of expectedMissions) {
    const m = MISSION_PRESETS[id];
    assert.ok(m, `Missing preset for ${id}`);
    assert.ok(m.nameZh && m.nameEn);
    assert.ok(m.screenV > 0 && m.accelV < 0);
    assert.ok(m.nominalThrust_mN > 10);
    assert.ok(m.nominalIsp_s > 1500);
    assert.ok(m.power_kW > 0);
  }
});

test('calculateApertureOptics: accurately detects optimal, under-focused, and over-focused perveance states', () => {
  // Balanced perveance
  const opt = calculateApertureOptics(1500, -300, 1.0);
  assert.strictEqual(opt.regime, 'OPTIMAL');
  assert.ok(opt.safeMarginPct > 15, 'Optimal perveance must have good margin from grid walls');

  // Excessive density / low voltage -> under-focused
  const under = calculateApertureOptics(700, -150, 1.8);
  assert.strictEqual(under.regime, 'UNDER_FOCUSED');

  // Low density / high voltage -> over-focused
  const over = calculateApertureOptics(2500, -400, 0.4);
  assert.strictEqual(over.regime, 'OVER_FOCUSED');
});
