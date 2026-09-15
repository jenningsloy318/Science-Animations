// ignition-story.test.mjs — Phase 3 RED tests for how-cars-work/js/ignition-story.js
// Covers SCENARIO-005 (9 ordered narrated ICE stages with 中英混排 kid captions,
// 1400–2400 ms durations), SCENARIO-007 (every stage carries its own
// cameraFocus so the camera pans to the working part), SCENARIO-008 (step
// timeline shipped as data {caption, cameraFocus, duration} in a dedicated
// module, with a frozen IGNITION_SCENARIO_TAGS closure) and SCENARIO-022
// (5 ordered EV stages, 1200–1800 ms, same framework).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadModule, JS_DIR, hasCjk, hasLatin } from './helpers.mjs';

// The EXACT ordered step identities pinned by the phase contract.
const ICE_STEP_IDS = [
  'keyPowerOn', 'batteryEnergizes', 'starterSpins', 'bendixEngagesFlywheel',
  'crankAndPistonsTurn', 'fuelPumpAndInjectors', 'sparkPlugFires',
  'firstCombustion', 'catchesAndIdles',
];
const EV_STEP_IDS = [
  'powerOn', 'battery', 'inverterDCtoAC', 'rotatingFieldSpinsRotor',
  'instantTorqueToWheels',
];

async function importStory() {
  const file = path.join(JS_DIR, 'ignition-story.js');
  assert.ok(
    fs.existsSync(file),
    'how-cars-work/js/ignition-story.js must exist as an ES module (greenfield Phase 3 deliverable)'
  );
  return loadModule('ignition-story.js');
}

/** Resolve a step's identity from whichever field convention the module uses. */
function stepId(step) {
  if (!step || typeof step !== 'object') return null;
  const id = step.id ?? step.name ?? step.key ?? step.stepId ?? step.stageId;
  return typeof id === 'string' ? id : null;
}

/** Ordered ids of a step list; falls back to a parallel id-array export. */
function idsOf(steps, mod, altExportNames) {
  const ids = steps.map(stepId);
  if (ids.every((x) => typeof x === 'string' && x.length > 0)) return ids;
  for (const n of altExportNames) {
    if (Array.isArray(mod[n]) && mod[n].length === steps.length
        && mod[n].every((x) => typeof x === 'string')) return mod[n].slice();
  }
  return ids;
}

function assertStepShape(step, label) {
  assert.ok(step && typeof step === 'object', `${label} must be an object`);
  assert.ok(typeof step.caption === 'string' && step.caption.trim().length >= 6,
    `${label} must carry a non-trivial caption string`);
  const cf = step.cameraFocus;
  const cfOk = typeof cf === 'string'
    ? cf.trim().length > 0
    : (cf && typeof cf === 'object' && Object.keys(cf).length > 0);
  assert.ok(cfOk, `${label} must carry a non-empty cameraFocus target`);
  assert.ok(typeof step.duration === 'number' && Number.isFinite(step.duration) && step.duration > 0,
    `${label} must carry a positive numeric duration (ms)`);
}

test('SCENARIO-008: js/ignition-story.js exports ICE_STEPS as an ordered data timeline where every step carries caption, cameraFocus and duration', async () => {
  const story = await importStory();
  assert.ok(Array.isArray(story.ICE_STEPS), 'ICE_STEPS must be an ordered array of steps');
  assert.ok(story.ICE_STEPS.length >= 8, 'the narrated ICE story must have at least 8 stages (contract: exactly 9)');
  story.ICE_STEPS.forEach((step, i) => assertStepShape(step, `ICE_STEPS[${i}]`));
});

test('SCENARIO-005: ICE_STEPS is exactly the 9 ordered ignition stages keyPowerOn → catchesAndIdles with durations in 1400–2400 ms', async () => {
  const story = await importStory();
  assert.equal(story.ICE_STEPS.length, 9, 'ICE_STEPS must contain exactly 9 steps');
  const ids = idsOf(story.ICE_STEPS, story, ['ICE_STEP_IDS', 'ICE_STORY_IDS']);
  assert.deepEqual(ids, ICE_STEP_IDS,
    'ICE_STEPS must be ordered keyPowerOn, batteryEnergizes, starterSpins, bendixEngagesFlywheel, crankAndPistonsTurn, fuelPumpAndInjectors, sparkPlugFires, firstCombustion, catchesAndIdles');
  story.ICE_STEPS.forEach((step, i) => {
    assert.ok(step.duration >= 1400 && step.duration <= 2400,
      `ICE step ${i} (${ids[i]}) duration must be within 1400–2400 ms, got ${step.duration}`);
  });
});

test('SCENARIO-005: every ICE caption is 中英混排 kid-level text (CJK + Latin) so a 9-year-old can read each stage', async () => {
  const story = await importStory();
  story.ICE_STEPS.forEach((step, i) => {
    assert.ok(hasCjk(step.caption), `ICE step ${i} caption must contain 简体中文`);
    assert.ok(hasLatin(step.caption), `ICE step ${i} caption must contain English key terms`);
  });
});

test('SCENARIO-022: EV_STEPS is exactly the 5 ordered EV stages powerOn → instantTorqueToWheels with durations in 1200–1800 ms and 中英混排 captions', async () => {
  const story = await importStory();
  assert.ok(Array.isArray(story.EV_STEPS), 'EV_STEPS must be an ordered array of steps');
  assert.equal(story.EV_STEPS.length, 5, 'EV_STEPS must contain exactly 5 steps');
  const ids = idsOf(story.EV_STEPS, story, ['EV_STEP_IDS', 'EV_STORY_IDS']);
  assert.deepEqual(ids, EV_STEP_IDS,
    'EV_STEPS must be ordered powerOn, battery, inverterDCtoAC, rotatingFieldSpinsRotor, instantTorqueToWheels');
  story.EV_STEPS.forEach((step, i) => {
    assertStepShape(step, `EV_STEPS[${i}]`);
    assert.ok(step.duration >= 1200 && step.duration <= 1800,
      `EV step ${i} (${ids[i]}) duration must be within 1200–1800 ms, got ${step.duration}`);
    assert.ok(hasCjk(step.caption) && hasLatin(step.caption),
      `EV step ${i} caption must be 中英混排 (CJK + Latin)`);
  });
});

test('SCENARIO-007: every ICE stage carries its own cameraFocus target so the camera can pan to the part that is working during that stage', async () => {
  const story = await importStory();
  const focuses = story.ICE_STEPS.map((s) => (typeof s.cameraFocus === 'string'
    ? s.cameraFocus : JSON.stringify(s.cameraFocus)));
  const distinct = new Set(focuses);
  assert.ok(distinct.size >= 5,
    `the 9 stages must move the camera between several different working parts (distinct cameraFocus targets: ${distinct.size}, want ≥ 5)`);
});

test('SCENARIO-008: IGNITION_SCENARIO_TAGS is the frozen 8-tag closure [SCENARIO-001, SCENARIO-005..SCENARIO-010, SCENARIO-022]', async () => {
  const story = await importStory();
  const tags = story.IGNITION_SCENARIO_TAGS;
  assert.ok(Array.isArray(tags), 'IGNITION_SCENARIO_TAGS must be an array');
  assert.ok(Object.isFrozen(tags), 'IGNITION_SCENARIO_TAGS must be frozen (Object.freeze)');
  assert.deepEqual(tags, [
    'SCENARIO-001', 'SCENARIO-005', 'SCENARIO-006', 'SCENARIO-007',
    'SCENARIO-008', 'SCENARIO-009', 'SCENARIO-010', 'SCENARIO-022',
  ]);
});
