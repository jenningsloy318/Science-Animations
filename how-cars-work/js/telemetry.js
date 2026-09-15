// telemetry.js — Phase 3 live engine telemetry model for how-cars-work.
// Covers SCENARIO-020 (coolant warms from 20 °C ambient toward the ~90 °C
// thermostat-regulated target with COOLANT_TAU_S = 20 — prototype-verified
// 86.6 °C at 60 s and 89 °C at 85 s — plus live oil pressure 2.0–4.5 bar)
// and SCENARIO-021 (after shutdown the coolant decays gradually back toward
// 20 °C with τ = 45 s: no instant jump, no frozen readout).
// Pure ES module on the existing importmap — no build step.

// Scenario closure for this module (spec Phase 3 union rule).
export const TELEMETRY_SCENARIO_TAGS = Object.freeze([
  'SCENARIO-018', 'SCENARIO-019', 'SCENARIO-020', 'SCENARIO-021',
]);

export const COOLANT_TAU_S = 20;      // warm-up time constant toward operating temp
export const COOLDOWN_TAU_S = 45;     // after-shutdown decay constant toward ambient
export const COOLANT_AMBIENT_C = 20;  // cold-start ambient temperature
export const COOLANT_OPERATING_C = 90;// thermostat-regulated operating temperature
export const OIL_MIN_RPM = 800;       // idle rpm → minimum oil pressure
export const OIL_MAX_RPM = 6000;      // redline rpm → maximum oil pressure
export const OIL_MIN_BAR = 2.0;       // oil pressure at idle
export const OIL_MAX_BAR = 4.5;       // oil pressure at redline

// Last reported coolant temperature; null until the first tick seeds it from
// the caller's state (or ambient), so a freshly booted engine reports exactly
// the ambient 20 °C on its very first reading.
let lastCoolantTemp = null;

function engineIsRunning(state) {
  return Boolean(state && (state.running ?? state.engineRunning));
}

function currentCoolantTemp(state) {
  if (state && Number.isFinite(state.coolantTemp)) return state.coolantTemp;
  if (Number.isFinite(lastCoolantTemp)) return lastCoolantTemp;
  return COOLANT_AMBIENT_C;
}

function rpmFraction(rpm) {
  const clamped = Math.min(Math.max(rpm - OIL_MIN_RPM, 0), OIL_MAX_RPM - OIL_MIN_RPM);
  return clamped / (OIL_MAX_RPM - OIL_MIN_RPM);
}

/**
 * SCENARIO-020/021 — advance the coolant/oil model by dt seconds and return
 * the live readouts {coolantTemp, oilPressure, fuelFlow}.
 *
 * While running: T → 90 °C with τ = 20 s (T(t) = 20 + 70·(1 − e^(−t/20))).
 * After shutdown: T → 20 °C ambient with τ = 45 s. Both legs use the exact
 * exponential relaxation T ← target − (target − T)·e^(−dt/τ), so the result
 * is independent of the caller's dt distribution.
 */
export function updateTelemetry(state, dt = 0) {
  const running = engineIsRunning(state);
  const step = Number.isFinite(dt) && dt > 0 ? dt : 0;
  let coolantTemp = currentCoolantTemp(state);

  if (lastCoolantTemp === null) {
    // First tick: seed the model from the incoming state and report the
    // current temperature without integrating (a cold engine reads ambient).
    lastCoolantTemp = coolantTemp;
  } else if (step > 0) {
    const target = running ? COOLANT_OPERATING_C : COOLANT_AMBIENT_C;
    const tau = running ? COOLANT_TAU_S : COOLDOWN_TAU_S;
    coolantTemp = target - (target - coolantTemp) * Math.exp(-step / tau);
    lastCoolantTemp = coolantTemp;
  }

  const rpm = state && Number.isFinite(state.rpm) ? state.rpm : 0;
  const oilPressure = running ? OIL_MIN_BAR + rpmFraction(rpm) * (OIL_MAX_BAR - OIL_MIN_BAR) : 0;
  const fuelFlow = running ? 1.2 + rpmFraction(rpm) * 16.8 : 0;

  return { coolantTemp, oilPressure, fuelFlow };
}
