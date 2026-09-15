// telemetry.test.mjs — Phase 3 RED tests for how-cars-work/js/telemetry.js
// Covers SCENARIO-020 (coolant warms from 20 °C toward the ~90 °C
// thermostat-regulated target — 86.6 °C at 60 s, 89 °C at 85 s per prototype —
// plus live oil pressure 2.0–4.5 bar) and SCENARIO-021 (after shutdown
// coolantTemp decays gradually toward 20 °C, τ = 45 s: no jump, no freeze),
// plus the frozen TELEMETRY_SCENARIO_TAGS closure.
//
// Each test loads a FRESH module instance so no internal clock/temperature
// state leaks between tests (tests must be independent).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JS_DIR } from './helpers.mjs';

const TESTS_DIR = path.dirname(fileURLToPath(import.meta.url));
const STUB_URL = pathToFileURL(path.join(TESTS_DIR, 'support', 'three-stub.mjs')).href;
let loadSeq = 0;

/** Load a pristine instance of a js/ module (bare 'three' rewritten to stub). */
async function freshLoad(relativePathFromJs) {
  const sourcePath = path.join(JS_DIR, relativePathFromJs);
  assert.ok(
    fs.existsSync(sourcePath),
    `module under test does not exist yet: ${sourcePath} (greenfield Phase 3 deliverable)`
  );
  const rewritten = fs.readFileSync(sourcePath, 'utf8').replace(
    /(\bfrom\s*|\bimport\s*)(['"])three\2/g,
    (_m, prefix, quote) => `${prefix}${quote}${STUB_URL}${quote}`
  );
  const tmp = path.join(TESTS_DIR, '.cache',
    `${relativePathFromJs.replace(/[/\\]/g, '__')}.fresh${++loadSeq}.mjs`);
  fs.mkdirSync(path.dirname(tmp), { recursive: true });
  fs.writeFileSync(tmp, rewritten);
  return import(`${pathToFileURL(tmp).href}?n=${loadSeq}`);
}

/** A telemetry state shaped exactly like the phase contract. */
function engineState(over = {}) {
  const s = Object.assign({
    running: true, engineRunning: true, rpm: 3000,
    coolantTemp: 20, engineTemp: 20,
  }, over);
  s.engineRunning = s.running;
  s.engineTemp = s.coolantTemp;
  return s;
}

/** Advance `seconds` of simulated time in `dt` slices, feeding coolant back. */
function advance(updateTelemetry, state, seconds, dt = 1) {
  let last = null;
  for (let t = 0; t < seconds - 1e-9; t += dt) {
    last = updateTelemetry(state, dt);
    assert.ok(last && typeof last.coolantTemp === 'number',
      'updateTelemetry must return {coolantTemp, oilPressure} on every tick');
    state.coolantTemp = last.coolantTemp;
    state.engineTemp = last.coolantTemp;
  }
  return last;
}

const closeTo = (actual, expected, tol) =>
  assert.ok(Math.abs(actual - expected) <= tol,
    `expected ≈${expected} ±${tol}, got ${actual}`);

test('SCENARIO-020: updateTelemetry(state, dt) returns {coolantTemp, oilPressure} and exports COOLANT_TAU_S = 20', async () => {
  const telemetry = await freshLoad('telemetry.js');
  assert.equal(typeof telemetry.updateTelemetry, 'function',
    'telemetry.js must export function updateTelemetry(state, dt)');
  assert.equal(telemetry.COOLANT_TAU_S, 20, 'COOLANT_TAU_S must equal the prototype-verified 20 s');
  const out = telemetry.updateTelemetry(engineState({ rpm: 3000 }), 0.1);
  assert.ok(out && typeof out.coolantTemp === 'number' && Number.isFinite(out.coolantTemp),
    'result.coolantTemp must be a finite number');
  assert.ok(out && typeof out.oilPressure === 'number' && Number.isFinite(out.oilPressure),
    'result.oilPressure must be a finite number');
});

test('SCENARIO-020: coolant warms from 20 °C toward the ~90 °C thermostat target — 86.6 °C at 60 s and 89 °C at 85 s (T(t) = 20 + 70·(1 − e^(−t/20)))', async () => {
  const { updateTelemetry } = await freshLoad('telemetry.js');
  const state = engineState({ rpm: 800, coolantTemp: 20 });
  const first = updateTelemetry(state, 1);
  closeTo(first.coolantTemp, 20, 0.01); // starts cold at ambient 20 °C
  const rising = advance(updateTelemetry, state, 1); // now t ≈ 2 s, must be warming
  assert.ok(rising.coolantTemp > first.coolantTemp, 'coolant must rise continuously while running');
  advance(updateTelemetry, state, 58); // t ≈ 60 s
  closeTo(state.coolantTemp, 86.6, 0.8);
  advance(updateTelemetry, state, 25); // t ≈ 85 s
  closeTo(state.coolantTemp, 89, 0.8);
  advance(updateTelemetry, state, 215); // t ≈ 300 s: thermostat-regulated asymptote
  closeTo(state.coolantTemp, 90, 1);
});

test('SCENARIO-020: oilPressure = 2.0 + (rpm−800)/5200 × 2.5 bar while running, 0 when stopped', async () => {
  const { updateTelemetry } = await freshLoad('telemetry.js');
  closeTo(updateTelemetry(engineState({ rpm: 800 }), 0.5).oilPressure, 2.0, 0.05);
  closeTo(updateTelemetry(engineState({ rpm: 3000 }), 0.5).oilPressure, 3.0577, 0.05);
  closeTo(updateTelemetry(engineState({ rpm: 6000 }), 0.5).oilPressure, 4.5, 0.05);
  const off = updateTelemetry(engineState({ running: false, rpm: 0 }), 0.5).oilPressure;
  assert.ok(Math.abs(off) < 1e-6, `oil pressure must read 0 when the engine is stopped, got ${off}`);
});

test('SCENARIO-021: after shutdown coolantTemp decays gradually toward 20 °C with τ = 45 s — no instant jump, no freeze', async () => {
  const { updateTelemetry } = await freshLoad('telemetry.js');
  // Warm the engine to the ~90 °C post-story state first (works for both
  // state-carrying and internally-clocked implementations).
  const state = engineState({ rpm: 900 });
  advance(updateTelemetry, state, 120); // ≈ 89.8 °C warmed up
  const warm = state.coolantTemp;
  assert.ok(warm > 85, `engine must be warm (~90 °C) before shutdown, got ${warm}`);
  // Shutdown: first tick must drop only slightly (gradual, not a jump to 20).
  state.running = false; state.engineRunning = false;
  const t1 = updateTelemetry(state, 1).coolantTemp;
  assert.ok(t1 < warm - 0.001, `coolant must start falling after shutdown (was ${warm}, got ${t1})`);
  assert.ok(t1 > 80, `decay must be gradual, not an instant jump to ambient (1 s after shutdown: ${t1})`);
  state.coolantTemp = t1; state.engineTemp = t1;
  // Monotonic gradual decay, still well above ambient for a long time.
  let prev = t1;
  for (let i = 0; i < 4; i++) {
    const next = updateTelemetry(state, 1).coolantTemp;
    assert.ok(next < prev, `coolant must keep falling gradually (${prev} → ${next})`);
    prev = next; state.coolantTemp = next; state.engineTemp = next;
  }
  // τ = 45 s: after 45 s of shutdown the excess above 20 °C has decayed by ≈ e⁻¹
  // (from ~89.8 °C this lands near 45.7 °C — Euler/exact integrators both fit).
  advance(updateTelemetry, state, 40);
  const at45 = state.coolantTemp;
  assert.ok(at45 > 30 && at45 < 60,
    `45 s after shutdown coolant must be roughly 20 + 70·e^(−1) ≈ 45.7 °C, got ${at45}`);
});

test('SCENARIO-018: TELEMETRY_SCENARIO_TAGS is the frozen 4-tag closure [SCENARIO-018, SCENARIO-019, SCENARIO-020, SCENARIO-021]', async () => {
  const telemetry = await freshLoad('telemetry.js');
  const tags = telemetry.TELEMETRY_SCENARIO_TAGS;
  assert.ok(Array.isArray(tags), 'TELEMETRY_SCENARIO_TAGS must be an array');
  assert.ok(Object.isFrozen(tags), 'TELEMETRY_SCENARIO_TAGS must be frozen (Object.freeze)');
  assert.deepEqual(tags, ['SCENARIO-018', 'SCENARIO-019', 'SCENARIO-020', 'SCENARIO-021']);
});
