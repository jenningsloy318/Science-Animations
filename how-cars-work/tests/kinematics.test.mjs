// kinematics.test.mjs — Phase 2 RED tests for how-cars-work/js/kinematics.js
// Covers SCENARIO-002 (gear selector scaling at constant RPM), SCENARIO-013
// (exact slider-crank + half-speed cam + gear-scaled prop shaft), SCENARIO-014
// (steering-split differential + front-wheel yaw) and SCENARIO-024 (6000 RPM
// numeric stability), plus the frozen KINEMATICS_SCENARIO_TAGS closure.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadModule, JS_DIR } from './helpers.mjs';

// Prototype-verified constants pinned by the spec / phase task:
const R = 0.22;      // crank radius
const L = 0.65;      // connecting-rod length
const ANCHOR = 0.8;  // re-anchored piston base (TDC 1.02 / BDC 0.58 unchanged)

const VERBATIM_GEAR_RATIOS = { '1': 0.4, '2': 0.65, '3': 0.85, '4': 1.1, 'R': -0.5 };

/** The EXACT slider-crank piston height from the phase task. */
function exactPistonY(theta) {
  return ANCHOR + (R * Math.cos(theta) + Math.sqrt(L * L - R * R * Math.sin(theta) ** 2) - L);
}

async function importKinematics() {
  const file = path.join(JS_DIR, 'kinematics.js');
  assert.ok(
    fs.existsSync(file),
    'how-cars-work/js/kinematics.js must exist as an ES module (greenfield Phase 2 deliverable)'
  );
  return loadModule('kinematics.js');
}

/** A drivetrain state shaped exactly like the phase contract. */
function makeState(over = {}) {
  return Object.assign({
    crankAngle: 0,
    crankAngleDelta: 0.03,
    rpm: 3000,
    gear: '3',
    steerAngle: 0,
    propShaftAngle: 0,
    running: true,
  }, over);
}

// ---- tolerant resolvers (accept common naming variants, still strict on values) ----

function valuesOf(container, keys, arrayKeys) {
  const src = container ?? {};
  for (const k of arrayKeys) {
    if (Array.isArray(src[k]) && src[k].length) return src[k];
  }
  for (const k of keys) {
    if (typeof src[k] === 'number') return [src[k]];
    if (Array.isArray(src[k]) && src[k].length) return src[k];
  }
  return null;
}

const pistonsOf = (snap) => valuesOf(snap, ['pistonY'], ['pistons', 'pistonYs', 'pistonYArr']);
const rodsOf = (snap) => valuesOf(snap, ['rodScale'], ['rodScales', 'rods', 'rodScaleArr']);

function diffOf(snap) {
  const d = snap?.differential ?? snap?.diff;
  const inner = snap?.innerWheelSpeed ?? d?.innerWheelSpeed ?? d?.inner;
  const outer = snap?.outerWheelSpeed ?? d?.outerWheelSpeed ?? d?.outer;
  if (typeof inner === 'number' && typeof outer === 'number') return { inner, outer };
  return null;
}

const frontYawOf = (snap) => {
  const y = snap?.frontWheelYaw ?? snap?.frontYaw ?? snap?.wheelYaw ?? snap?.steerYaw;
  return typeof y === 'number' ? y : null;
};

const camOf = (snap) => (typeof snap?.camAngle === 'number' ? snap.camAngle : null);

function propShaftOf(state, snap) {
  if (typeof state?.propShaftAngle === 'number') return state.propShaftAngle;
  if (typeof snap?.propShaftAngle === 'number') return snap.propShaftAngle;
  return null;
}

/** One updateDrivetrain call with dt=0 so the caller-pinned crankAngle is the truth. */
function frameAt(crankAngle, over = {}) {
  const state = makeState({ crankAngle, crankAngleDelta: 0, rpm: 0, ...over });
  const snap = updateDrivetrainRef(state, 0);
  return { state, snap, theta: state.crankAngle };
}

let modRef = null;
function updateDrivetrainRef(state, dt) {
  if (!modRef) throw new Error('kinematics module not loaded yet');
  return modRef.updateDrivetrain(state, dt);
}

/** Run N frames for one gear and return the accumulated prop-shaft delta. */
async function runGear(gear, frames = 120) {
  const state = makeState({ gear, rpm: 3000 });
  const snaps = [];
  for (let i = 0; i < frames; i++) {
    state.crankAngle += 0.03;
    state.crankAngleDelta = 0.03;
    snaps.push(modRef.updateDrivetrain(state, 1 / 60));
  }
  const viaState = state.propShaftAngle;
  const first = snaps[0]?.propShaftAngle;
  const last = snaps[snaps.length - 1]?.propShaftAngle;
  if (typeof viaState === 'number' && viaState !== 0) return viaState;
  if (typeof first === 'number' && typeof last === 'number') return last - first;
  return 0;
}

test('SCENARIO-013: kinematics.js exports updateDrivetrain(state, dt), the verbatim GEAR_RATIOS table and frozen KINEMATICS_SCENARIO_TAGS', async () => {
  modRef = await importKinematics();
  assert.equal(typeof modRef.updateDrivetrain, 'function', 'updateDrivetrain must be an exported function');
  assert.ok(modRef.GEAR_RATIOS, 'GEAR_RATIOS must be exported');
  assert.deepEqual({ ...modRef.GEAR_RATIOS }, VERBATIM_GEAR_RATIOS, 'GEAR_RATIOS must be the verbatim {1:0.4, 2:0.65, 3:0.85, 4:1.1, R:-0.5} table');
  assert.ok(Array.isArray(modRef.KINEMATICS_SCENARIO_TAGS), 'KINEMATICS_SCENARIO_TAGS must be exported');
  assert.deepEqual([...modRef.KINEMATICS_SCENARIO_TAGS], ['SCENARIO-002', 'SCENARIO-013', 'SCENARIO-014', 'SCENARIO-015', 'SCENARIO-024']);
  assert.equal(Object.isFrozen(modRef.KINEMATICS_SCENARIO_TAGS), true, 'KINEMATICS_SCENARIO_TAGS must be frozen');
});

test('SCENARIO-013: exact slider-crank pistonY = 0.8 + (r·cosθ + √(l² − r²·sin²θ) − l) with r=0.22, l=0.65 driven by state.crankAngle', async () => {
  modRef = modRef ?? await importKinematics();
  const steps = 288;
  const samples = [];
  for (let i = 0; i < steps; i++) {
    const f = frameAt((i * 2 * Math.PI) / steps);
    const pistons = pistonsOf(f.snap) ?? pistonsOf(f.state);
    assert.ok(pistons, 'updateDrivetrain must expose piston Y values (result.pistons array)');
    if (i === 0) assert.equal(pistons.length, 4, 'a 4-cylinder engine must expose 4 piston positions');
    samples.push({ theta: f.theta, pistons });
  }
  // Each piston must track the exact formula at a constant cylinder phase that
  // is a multiple of π/2 (the only firing-order offsets a 4-cyl can use).
  const candidates = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
  for (let cyl = 0; cyl < samples[0].pistons.length; cyl++) {
    let matched = null;
    for (const off of candidates) {
      if (samples.every((s) => Math.abs(s.pistons[cyl] - exactPistonY(s.theta + off)) < 1e-9)) { matched = off; break; }
    }
    assert.ok(matched !== null, `piston #${cyl} must follow the exact slider-crank formula at a fixed π/2-multiple phase (got first-sample y=${samples[0].pistons[cyl]})`);
  }
});

test('SCENARIO-013: slider-crank keeps the prototype TDC 1.02 / BDC 0.58 exactly (re-anchored at 0.8)', async () => {
  modRef = modRef ?? await importKinematics();
  let max = -Infinity, min = Infinity;
  for (let i = 0; i < 288; i++) {
    const f = frameAt((i * 2 * Math.PI) / 288);
    const pistons = pistonsOf(f.snap) ?? pistonsOf(f.state);
    assert.ok(pistons, 'piston positions must be exposed');
    for (const y of pistons) {
      assert.ok(Number.isFinite(y), 'piston Y must be finite');
      max = Math.max(max, y);
      min = Math.min(min, y);
    }
  }
  assert.ok(Math.abs(max - 1.02) < 1e-6, `piston top dead center must stay 1.02 (got ${max})`);
  assert.ok(Math.abs(min - 0.58) < 1e-6, `piston bottom dead center must stay 0.58 (got ${min})`);
});

test('SCENARIO-013: connecting-rod scale is pinned to the 1.000–1.063 range (no legacy 1.31× stretch)', async () => {
  modRef = modRef ?? await importKinematics();
  let max = -Infinity, min = Infinity;
  for (let i = 0; i < 288; i++) {
    const f = frameAt((i * 2 * Math.PI) / 288);
    const rods = rodsOf(f.snap) ?? rodsOf(f.state);
    assert.ok(rods, 'updateDrivetrain must expose rod scale values (result.rodScales)');
    for (const v of rods) {
      assert.ok(Number.isFinite(v), 'rod scale must be finite');
      max = Math.max(max, v);
      min = Math.min(min, v);
    }
  }
  assert.ok(min >= 0.999 && min <= 1.001, `rod scale minimum must sit at 1.000 (got ${min})`);
  assert.ok(max >= 1.062 && max <= 1.0635, `rod scale must peak at L/√(L²−R²) ≈ 1.063, never above (got ${max})`);
});

test('SCENARIO-013: camAngle = crankAngle × 0.5 — the camshaft turns at exactly half crank speed (1:2 reduction)', async () => {
  modRef = modRef ?? await importKinematics();
  const TAU = 2 * Math.PI;
  for (const crank of [0.3, 1.1, 2.7, 5.0, 6.2832]) {
    const f = frameAt(crank);
    const cam = camOf(f.snap) ?? camOf(f.state);
    assert.ok(cam !== null, 'updateDrivetrain must expose camAngle');
    const diff = ((cam - 0.5 * f.theta) % TAU + TAU) % TAU;
    const wrapped = Math.min(diff, TAU - diff);
    assert.ok(wrapped < 1e-9, `camAngle must equal crankAngle×0.5 (crank=${f.theta}, cam=${cam})`);
  }
  // one full 4π crank cycle = one 2π cam revolution
  const a = frameAt(0.5);
  const b = frameAt(0.5 + 4 * Math.PI);
  const camA = camOf(a.snap) ?? camOf(a.state);
  const camB = camOf(b.snap) ?? camOf(b.state);
  const cycleDiff = (((camB - camA) % TAU) + TAU) % TAU;
  assert.ok(Math.min(cycleDiff, TAU - cycleDiff) < 1e-9, '720° of crank must equal exactly 360° of cam');
});

test('SCENARIO-002: gear selector scales wheel speed at constant RPM — propShaftAngle += crankAngleDelta × GEAR_RATIOS[gear] (R reverses)', async () => {
  modRef = modRef ?? await importKinematics();
  const d1 = await runGear('1');
  const d2 = await runGear('2');
  const d3 = await runGear('3');
  const d4 = await runGear('4');
  const dR = await runGear('R');
  assert.ok(Math.abs(d4) > 1e-6, `prop shaft must accumulate rotation while running (gear 4 delta was ${d4})`);
  const rel = (a, b, ra, rb) => {
    assert.ok(Math.abs(a / b - ra / rb) < 1e-6, `gear scaling must be exactly GEAR_RATIOS-proportional at constant RPM (got ${a} vs ${b})`);
  };
  rel(d1, d4, 0.4, 1.1);
  rel(d2, d4, 0.65, 1.1);
  rel(d3, d4, 0.85, 1.1);
  rel(Math.abs(dR), d4, 0.5, 1.1);
  assert.ok(dR < 0, `gear R must reverse the prop shaft (got ${dR})`);
  // constant RPM ⇒ constant rate: second half of a run advances as much as the first
  // constant RPM ⇒ constant rate: the accumulated angle must advance linearly
  // (observed on state when the module mutates it, else on the returned snapshots)
  const state2 = makeState({ gear: '4' });
  const marks = [];
  for (let i = 0; i < 120; i++) {
    state2.crankAngle += 0.03;
    state2.crankAngleDelta = 0.03;
    const snap = modRef.updateDrivetrain(state2, 1 / 60);
    if (i === 59 || i === 119) marks.push([state2.propShaftAngle, snap?.propShaftAngle].find((v) => typeof v === 'number'));
  }
  assert.ok(marks.length === 2 && typeof marks[0] === 'number' && typeof marks[1] === 'number',
    'prop shaft angle must be observable (state.propShaftAngle or result.propShaftAngle)');
  const half = marks[0], end = marks[1];
  assert.ok(Math.abs((end - half) - half) < 1e-6, 'at constant RPM the prop shaft must advance at a constant rate');
});

test('SCENARIO-014: differential outputs split by steerAngle — equal at 0, inner slower / outer faster at nonzero steer (k = 0.6)', async () => {
  modRef = modRef ?? await importKinematics();
  const K = 0.6, S = 0.5;
  // steer 0 → identical outputs
  {
    const f = frameAt(1.234, { steerAngle: 0 });
    const d = diffOf(f.snap) ?? diffOf(f.state);
    assert.ok(d, 'updateDrivetrain must expose differential outputs (innerWheelSpeed/outerWheelSpeed)');
    assert.equal(d.inner, d.outer, 'at steerAngle 0 both differential outputs must be identical');
  }
  // nonzero steer → visible split with the spec-pinned k=0.6 factors
  for (const steer of [S, -S]) {
    const f = frameAt(1.234, { steerAngle: steer });
    const d = diffOf(f.snap) ?? diffOf(f.state);
    assert.ok(d, 'differential outputs must be exposed');
    assert.ok(d.inner < d.outer, `steering must make the inner side slower and the outer side faster (steer=${steer})`);
    const expected = (1 + Math.abs(steer) * K) / (1 - Math.abs(steer) * K);
    assert.ok(Math.abs(d.outer / d.inner - expected) < 1e-6,
      `split must follow shaft×(1∓|steer|·0.6): expected outer/inner=${expected}, got ${d.outer / d.inner}`);
  }
  // back to 0 → equal again
  {
    const state = makeState({ steerAngle: S });
    modRef.updateDrivetrain(state, 0);
    state.steerAngle = 0;
    const snap = modRef.updateDrivetrain(state, 0);
    const d = diffOf(snap) ?? diffOf(state);
    assert.ok(d, 'differential outputs must be exposed');
    assert.equal(d.inner, d.outer, 'returning steerAngle to 0 must re-equalize the differential outputs');
  }
});

test('SCENARIO-014: front-wheel yaw deflects with steerAngle — zero at center, scaled with steer, capped at 0.5 rad', async () => {
  modRef = modRef ?? await importKinematics();
  {
    const f = frameAt(0.4, { steerAngle: 0 });
    const yaw = frontYawOf(f.snap) ?? frontYawOf(f.state);
    assert.ok(yaw !== null, 'updateDrivetrain must expose frontWheelYaw');
    assert.equal(yaw, 0, 'front wheels must point straight at steerAngle 0');
  }
  for (const steer of [0.5, -0.5, 0.25]) {
    const f = frameAt(0.4, { steerAngle: steer });
    const yaw = frontYawOf(f.snap) ?? frontYawOf(f.state);
    assert.ok(yaw !== null, 'frontWheelYaw must be exposed');
    assert.ok(Math.abs(yaw - steer * 0.5) < 1e-6, `front-wheel yaw must be steerAngle×0.5 (steer=${steer}, yaw=${yaw})`);
  }
  const far = frameAt(0.4, { steerAngle: 2.0 });
  const yawFar = frontYawOf(far.snap) ?? frontYawOf(far.state);
  assert.ok(yawFar !== null && Math.abs(yawFar) <= 0.5 + 1e-9, `front-wheel yaw must cap at 0.5 rad even for extreme steer (got ${yawFar})`);
});

test('SCENARIO-024: updateDrivetrain stays numerically stable at 6000 RPM max throttle for a full simulated minute', async () => {
  modRef = modRef ?? await importKinematics();
  const state = makeState({ gear: '4', rpm: 6000, steerAngle: 0.4 });
  for (let i = 0; i < 3600; i++) {
    const snap = modRef.updateDrivetrain(state, 1 / 60);
    if (i % 300 === 0) {
      const pistons = pistonsOf(snap) ?? pistonsOf(state);
      const rods = rodsOf(snap) ?? rodsOf(state);
      const d = diffOf(snap) ?? diffOf(state);
      const yaw = frontYawOf(snap) ?? frontYawOf(state);
      for (const arr of [pistons, rods]) {
        assert.ok(arr, 'kinematic outputs must be exposed');
        for (const v of arr) assert.ok(Number.isFinite(v), `outputs must stay finite at 6000 RPM (got ${v})`);
      }
      assert.ok(d && Number.isFinite(d.inner) && Number.isFinite(d.outer), 'differential outputs must stay finite');
      assert.ok(yaw !== null && Number.isFinite(yaw), 'front-wheel yaw must stay finite');
      assert.ok(Number.isFinite(state.crankAngle ?? 0) && Number.isFinite(propShaftOf(state, snap) ?? NaN), 'crank/prop-shaft angles must stay finite');
    }
  }
});
