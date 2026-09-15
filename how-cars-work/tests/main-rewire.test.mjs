// main-rewire.test.mjs — Phase 2 RED tests for the js/main.js rewiring.
// Binds SCENARIO-002 (all six legacy controls keep their observable behaviors
// around the new updateDrivetrain loop), SCENARIO-013 (coupled drivetrain
// wiring), SCENARIO-014 (steer slider → front-wheel yaw + differential split),
// SCENARIO-015 (torque-flow built & updated every frame) and SCENARIO-024
// (pixel ratio stays capped at 2 once the coupled geometry ships).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readSource } from './helpers.mjs';

/** Comment-stripped source (block comments + line comments outside strings). */
function stripped() {
  const raw = readSource('main.js');
  const noBlocks = raw.replace(/\/\*[\s\S]*?\*\//g, ' ');
  return noBlocks.split('\n').map((line) => {
    const idx = line.indexOf('//');
    if (idx === -1) return line;
    const before = line.slice(0, idx);
    const quotes = (before.match(/['"`]/g) || []).length;
    return quotes % 2 === 1 ? line : before; // keep '//' inside string literals
  }).join('\n');
}

const count = (src, re) => (src.match(re) || []).length;

test('SCENARIO-002: main.js rewires its animation loop onto js/kinematics.js updateDrivetrain while every one of the six legacy controls keeps its wiring', () => {
  const src = stripped();
  // new Phase 2 wiring: import + per-frame call of updateDrivetrain from ./kinematics.js
  assert.ok(/['"]\.\/kinematics\.js['"]/.test(src), "main.js must import from './kinematics.js'");
  assert.ok(count(src, /\bupdateDrivetrain\b/g) >= 2, 'main.js must import AND call updateDrivetrain (import + animation-loop call)');
  // legacy control #1 + #2: btnICE / btnEV mode switch (EV group shown, engine internals hidden)
  assert.ok(/getElementById\(\s*['"]btnEV['"]\s*\)/.test(src) && /getElementById\(\s*['"]btnICE['"]\s*\)/.test(src), 'btnICE/btnEV listeners must survive the rewire');
  assert.ok(/\.ev-only/.test(src) && /\.ice-only/.test(src), 'EV/ICE part-group visibility toggles must survive the rewire');
  // legacy control #3: gear selector
  assert.ok(/\.gear-btn/.test(src), 'the gear selector buttons must survive the rewire');
  // legacy control #4: steering slider
  assert.ok(/getElementById\(\s*['"]steerSlider['"]\s*\)/.test(src), 'the steerSlider listener must survive the rewire');
  // legacy controls #5 + #6: step/auto ignition mode + next-stroke button
  assert.ok(/getElementById\(\s*['"]btnModeAuto['"]\s*\)/.test(src), 'btnModeAuto must survive the rewire');
  assert.ok(/getElementById\(\s*['"]btnModeStep['"]\s*\)/.test(src), 'btnModeStep must survive the rewire');
  assert.ok(/getElementById\(\s*['"]btnNextStroke['"]\s*\)/.test(src), 'btnNextStroke must survive the rewire');
  // btnNextStroke observable: exactly one stroke per press, cycling 吸气→压缩→做功→排气
  assert.ok(/吸气[\s\S]{0,80}?压缩[\s\S]{0,80}?做功[\s\S]{0,80}?排气/.test(src),
    'the stroke indicator order must remain 吸气 → 压缩 → 做功 → 排气');
});

test('SCENARIO-013: main.js drives the coupled powertrain through updateDrivetrain with the verbatim gear table (cam half-speed + gear-scaled prop shaft)', () => {
  const src = stripped();
  assert.ok(count(src, /\bupdateDrivetrain\s*\(/g) >= 1, 'the animation loop must call updateDrivetrain(state, dt)');
  // the verbatim GEAR_RATIOS contract {1:0.4, 2:0.65, 3:0.85, 4:1.1, R:-0.5} stays asserted in main.js
  const gearTable = /\bGEAR_RATIOS\b/.test(src) || /\bgearRatiosMap\b/.test(src);
  assert.ok(gearTable, 'main.js must keep the verbatim gear-ratio table (directly or imported as GEAR_RATIOS)');
  const hasAll = ['0.4', '0.65', '0.85', '1.1', '-0.5'].every((v) => src.includes(v));
  assert.ok(hasAll, 'the gear table must keep its verbatim values 0.4 / 0.65 / 0.85 / 1.1 / -0.5');
  assert.ok(/requestAnimationFrame/.test(src), 'the animation loop must keep running via requestAnimationFrame');
});

test('SCENARIO-014: main.js keeps steering wired end-to-end — steerSlider deflects front wheels and splits the differential outputs', () => {
  const src = stripped();
  assert.ok(/steerSlider/.test(src), 'steerSlider must remain the steering input');
  assert.ok(/steerAngle/.test(src), 'steerAngle must flow into the drivetrain update');
  assert.ok(/差速|differential|differentialSpeeds|diffText/i.test(src), 'the differential readout/behavior must remain observable');
  assert.ok(/updateDrivetrain\s*\(/.test(src), 'steering must act through the coupled updateDrivetrain loop');
});

test('SCENARIO-015: main.js builds the gold torque-flow path into the scene and updates it every frame', () => {
  const src = stripped();
  assert.ok(/['"]\.\/torque-flow\.js['"]/.test(src), "main.js must import from './torque-flow.js'");
  assert.ok(count(src, /\bbuildTorqueFlow\b/g) >= 1, 'main.js must call buildTorqueFlow(scene)');
  assert.ok(count(src, /\bupdateTorqueFlow\b/g) >= 2, 'main.js must import AND call updateTorqueFlow(t) in the animation loop');
  const flowCall = src.match(/buildTorqueFlow\s*\(\s*scene\s*\)/);
  assert.ok(flowCall, 'buildTorqueFlow must receive the scene');
});

test('SCENARIO-024: renderer pixel ratio stays capped at 2 once the coupled kinematics and torque-flow geometry ship (≥30 FPS budget)', () => {
  const src = stripped();
  assert.ok(/setPixelRatio\s*\(/.test(src), 'the renderer pixel ratio must still be set explicitly');
  assert.ok(/Math\.min\s*\(\s*(window\.)?devicePixelRatio\s*,\s*2\s*\)/.test(src),
    'pixel ratio must remain capped at exactly 2 (Math.min(devicePixelRatio, 2)) — no quality bump to chase smoothness');
  // the Phase 2 heavy additions must be present under that same cap
  assert.ok(/['"]\.\/kinematics\.js['"]/.test(src) && /['"]\.\/torque-flow\.js['"]/.test(src),
    'the coupled kinematics and torque-flow modules must be loaded by main.js under the unchanged pixel-ratio cap');
});

// SCENARIO-031: demo rotation slowed to ~4.5% of real crank speed so a child
// can follow individual teeth biting into the ring gear (user: 旋转慢一点).
test('SCENARIO-031: crank visual speed capped at 0.045 of real RPM', () => {
  const src = readSource('main.js');
  assert.ok(/crankAngle \+= omega \* dt \* 0\.045/.test(src), 'global slowdown factor 0.045');
  assert.ok(!/crankAngle \+= omega \* dt \* 0\.08\b/.test(src), 'old 0.08 factor removed');
});
