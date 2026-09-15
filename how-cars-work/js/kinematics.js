// kinematics.js — Phase 2 coupled drivetrain kinematics for how-cars-work.
// Covers SCENARIO-002 (gear selector scaling at constant RPM), SCENARIO-013
// (exact slider-crank + half-speed cam + gear-scaled prop shaft), SCENARIO-014
// (steering-split differential + front-wheel yaw) and SCENARIO-024 (numeric
// stability at 6000 RPM). Extracted from the legacy main.js animation loop
// with the prototype-verified constants: crank radius r = 0.22, connecting-rod
// length l = 0.65, and the piston band re-anchored on the existing 0.8 base so
// TDC 1.02 / BDC 0.58 stay bit-identical while the stroke shape becomes the
// exact slider-crank curve. Pure math — no three.js dependency, no build step.

// Verbatim gear table carried over from the legacy gearRatiosMap (SCENARIO-002):
// multiplier convention is propShaftAngle += crankAngleDelta × GEAR_RATIOS[gear],
// so 'R' = −0.5 reverses the prop shaft while every forward gear scales it.
export const GEAR_RATIOS = Object.freeze({ '1': 0.4, '2': 0.65, '3': 0.85, '4': 1.1, 'R': -0.5 });

// Scenario closure for this module: spec Phase 2 = KINEMATICS_SCENARIO_TAGS ∪
// TORQUE_FLOW_SCENARIO_TAGS (torque-flow.js) = exactly these five tags.
export const KINEMATICS_SCENARIO_TAGS = Object.freeze([
  'SCENARIO-002',
  'SCENARIO-013',
  'SCENARIO-014',
  'SCENARIO-015',
  'SCENARIO-024',
]);

export const CRANK_RADIUS = 0.22;         // r — crank throw (prototype-verified)
export const ROD_LENGTH = 0.65;           // l — connecting-rod length
export const PISTON_ANCHOR = 0.8;         // re-anchored piston base (TDC 1.02 / BDC 0.58)
export const CAM_SPEED_RATIO = 0.5;       // camshaft turns at half crank speed (1:2)
export const DIFFERENTIAL_SPLIT_K = 0.6;  // inner/outer split factor per |steerAngle|
export const FRONT_YAW_SCALE = 0.5;       // front-wheel yaw = steerAngle × 0.5
export const FRONT_YAW_LIMIT = 0.5;       // hard yaw cap in radians
export const FINAL_DRIVE = 0.5;           // ring-and-pinion reduction behind the prop shaft

// Flat-plane 4-cylinder crank phasing: pistons 1&4 rise together, 2&3 together
// (offsets are multiples of π, the only firing-order phases a 4-cyl can use).
const CYLINDER_PHASE_OFFSETS = [0, Math.PI, Math.PI, 0];

/**
 * SCENARIO-013 — the EXACT slider-crank piston height, re-anchored on the
 * legacy 0.8 base so the visible TDC (1.02) and BDC (0.58) are unchanged:
 *   pistonY = 0.8 + (r·cosθ + Math.sqrt(l² − r²·sin²θ) − l)
 * The discriminant l² − r²·sin²θ ≥ 0.3741 for all θ, so it is always real.
 */
export function pistonHeight(theta) {
  return PISTON_ANCHOR + (CRANK_RADIUS * Math.cos(theta) + Math.sqrt(ROD_LENGTH * ROD_LENGTH - CRANK_RADIUS * CRANK_RADIUS * Math.sin(theta) ** 2) - ROD_LENGTH);
}

/**
 * SCENARIO-013 — connecting-rod scale factor L/√(L² − r²·sin²θ), pinned to the
 * 1.000 (TDC/BDC) … 1.063 (mid-stroke) band instead of the legacy 1.31× stretch.
 */
export function rodScaleFactor(theta) {
  return ROD_LENGTH / Math.sqrt(ROD_LENGTH * ROD_LENGTH - CRANK_RADIUS * CRANK_RADIUS * Math.sin(theta) ** 2);
}

/**
 * SCENARIO-002/013/014/024 — one frame of the fully coupled drivetrain.
 *
 * state: { crankAngle, crankAngleDelta, rpm, gear, steerAngle, propShaftAngle, running }
 *   - crankAngle: current crankshaft angle in radians (caller-owned, not mutated here)
 *   - crankAngleDelta: crank advance for this frame; when absent it is derived
 *     from state.rpm × dt (ω = rpm/60 · 2π)
 *   - gear: '1' | '2' | '3' | '4' | 'R' (falls back to state.gearRatio, then '3')
 *   - steerAngle: steering wheel angle in radians (0 = straight)
 *   - propShaftAngle: accumulated prop-shaft angle (mutated: += delta × ratio)
 *
 * Returns a snapshot { crankAngle, camAngle, propShaftAngle, pistons, rodScales,
 * innerWheelSpeed, outerWheelSpeed, innerWheelAngle, outerWheelAngle,
 * frontWheelYaw, differential, ... } and mirrors the scalar outputs onto state.
 */
export function updateDrivetrain(state, dt = 0) {
  const crankAngle = Number.isFinite(state?.crankAngle) ? state.crankAngle : 0;
  const gear = state?.gear ?? '3';
  const gearRatio = GEAR_RATIOS[gear] ?? (Number.isFinite(state?.gearRatio) ? state.gearRatio : GEAR_RATIOS['3']);
  const steerAngle = Number.isFinite(state?.steerAngle) ? state.steerAngle : 0;
  const running = state ? state.running !== false : false;

  let crankAngleDelta = state?.crankAngleDelta;
  if (!Number.isFinite(crankAngleDelta)) {
    const rpm = Number.isFinite(state?.rpm) ? state.rpm : 0;
    crankAngleDelta = (rpm / 60) * Math.PI * 2 * dt;
  }

  // SCENARIO-013 — camshaft turns at exactly half crank speed: one cam
  // revolution per 720° of crank, matching the real 4π four-stroke cycle.
  const camAngle = crankAngle * CAM_SPEED_RATIO;

  // SCENARIO-002 — gear-scaled prop shaft: += crankAngleDelta × GEAR_RATIOS[gear].
  if (!Number.isFinite(state.propShaftAngle)) state.propShaftAngle = 0;
  const propShaftAngle = running ? state.propShaftAngle + crankAngleDelta * gearRatio : state.propShaftAngle;
  state.propShaftAngle = propShaftAngle;
  state.camAngle = camAngle;

  // SCENARIO-013 — exact slider-crank pistons + pinned rod scales (4 cylinders).
  const pistons = CYLINDER_PHASE_OFFSETS.map((offset) => pistonHeight(crankAngle + offset));
  const rodScales = CYLINDER_PHASE_OFFSETS.map((offset) => rodScaleFactor(crankAngle + offset));

  // SCENARIO-014 — open differential split: the inner side slows and the outer
  // side speeds up by |steerAngle| × k; both outputs are equal at steer 0.
  // Speeds are expressed in prop-shaft units so the split stays observable even
  // when the shaft itself is momentarily at rest.
  const split = Math.min(Math.abs(steerAngle) * DIFFERENTIAL_SPLIT_K, 0.9);
  const innerWheelSpeed = 1 - split;
  const outerWheelSpeed = 1 + split;
  const innerWheelAngle = propShaftAngle * FINAL_DRIVE * innerWheelSpeed;
  const outerWheelAngle = propShaftAngle * FINAL_DRIVE * outerWheelSpeed;

  // SCENARIO-014 — front wheels deflect with steering, capped at ±0.5 rad.
  const frontWheelYaw = Math.max(-FRONT_YAW_LIMIT, Math.min(FRONT_YAW_LIMIT, steerAngle * FRONT_YAW_SCALE));

  state.innerWheelSpeed = innerWheelSpeed;
  state.outerWheelSpeed = outerWheelSpeed;
  state.frontWheelYaw = frontWheelYaw;

  return {
    crankAngle,
    crankAngleDelta,
    camAngle,
    gear,
    gearRatio,
    steerAngle,
    running,
    propShaftAngle,
    pistons,
    rodScales,
    innerWheelSpeed,
    outerWheelSpeed,
    innerWheelAngle,
    outerWheelAngle,
    frontWheelYaw,
    differential: { innerWheelSpeed, outerWheelSpeed },
  };
}
