// story-player.test.mjs — Phase 3 RED tests for the js/main.js story player,
// replay control, focus presets and HUD telemetry wiring, plus the
// index.html single-entry shape.
// Covers SCENARIO-001 (single page entry on the three@0.160.0 importmap),
// SCENARIO-005 (startBtn plays the 9-stage narrated walkthrough with
// per-stage captions), SCENARIO-006 (no-restart gating mid-story),
// SCENARIO-007 (per-stage camera tween to each step's cameraFocus),
// SCENARIO-008 (inspectable stage list/counter + console.assert self-checks),
// SCENARIO-009 (visible 重新播放点火 Replay start control replays from step 1),
// SCENARIO-010 (replay still works after shutdown), SCENARIO-018 (cooling &
// fuel presets), SCENARIO-019 (all existing presets keep identical targets),
// SCENARIO-020 (hudCoolant/hudOil in the same animation loop) and
// SCENARIO-022 (btnEV replays the framework with EV_STEPS).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SITE_ROOT, REPO_ROOT, readSource, readSiteFile } from './helpers.mjs';

/** Comment-stripped main.js (block + line comments, string literals kept). */
function strippedMain() {
  const raw = readSource('main.js');
  const noBlocks = raw.replace(/\/\*[\s\S]*?\*\//g, ' ');
  return noBlocks.split('\n').map((line) => {
    const idx = line.indexOf('//');
    if (idx === -1) return line;
    const before = line.slice(0, idx);
    const quotes = (before.match(/['"`]/g) || []).length;
    return quotes % 2 === 1 ? line : before;
  }).join('\n');
}

const count = (src, re) => (src.match(re) || []).length;

/** The CAMERA_PRESETS object-literal block, brace-matched out of main.js. */
function presetsBlock() {
  const src = strippedMain();
  const m = src.match(/CAMERA_PRESETS\s*=\s*\{/);
  assert.ok(m, 'main.js must keep defining CAMERA_PRESETS');
  const start = src.indexOf('{', m.index);
  let depth = 0, end = -1;
  for (let i = start; i < src.length; i++) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) { end = i; break; }
    }
  }
  assert.ok(end > start, 'CAMERA_PRESETS object literal must be closed');
  return src.slice(start, end);
}

/** The numbers inside one `key: { pos: [...], target: [...] }` entry. */
function presetNumbers(block, key) {
  const entry = block.match(new RegExp(`\\b${key}\\s*:\\s*\\{[^{}]*\\}`));
  if (!entry) return null;
  return (entry[0].match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
}

/** A ~900-char window around a getElementById('<id>') reference in main.js. */
function handlerRegion(src, id) {
  const m = src.match(new RegExp(`getElementById\\(\\s*['"]${id}['"]\\s*\\)`));
  if (!m) return null;
  return src.slice(m.index, m.index + 900);
}

// Accepted identifier conventions (tolerant resolvers, strict on observables).
const STORY_GUARD = /\b(storyPlaying|storyActive|isStoryPlaying|ignitionStoryPlaying|storyInProgress|storyRunning|storyState\.playing)\b/g;
const PLAY_STORY = /\b(playIgnitionStory|startStory|playStory|runStory|startIgnitionStory|playSteps|runIgnitionStory|playIgnition)\b\s*\(/;
const STAGE_COUNTER = /\b(storyStep|storyIndex|stepIndex|stageIndex|currentStep|storyStage)\b/;

// ---- SCENARIO-001: single page entry -------------------------------------------------------

test('SCENARIO-001: how-cars-work/index.html stays the single page entry bootstrapped by js/main.js on the three@0.160.0 importmap — no second entry point', () => {
  const html = readSiteFile('index.html');
  const moduleScripts = html.match(/<script[^>]*type\s*=\s*["']module["'][^>]*>/g) || [];
  assert.equal(moduleScripts.length, 1, 'index.html must have exactly one module script entry point');
  assert.ok(/src\s*=\s*["'][^"']*js\/main\.js["']/.test(moduleScripts[0]),
    'the single module entry must be js/main.js');
  assert.ok(/importmap/.test(html) && /three@0\.160\.0/.test(html),
    'the importmap must still pin three@0.160.0');
  const walk = (dir, out = []) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === 'tests' || e.name === '.cache') continue;
        walk(full, out);
      } else if (/\.x?html?$/i.test(e.name)) out.push(path.relative(SITE_ROOT, full));
    }
    return out;
  };
  assert.deepEqual(walk(SITE_ROOT), ['index.html'],
    'no second HTML entry point may appear anywhere in the shipped how-cars-work tree');
  assert.ok(fs.existsSync(path.join(REPO_ROOT, 'Makefile')) && fs.existsSync(path.join(REPO_ROOT, 'Caddyfile')),
    'Makefile/Caddyfile serving must stay unchanged at the repo root');
});

// ---- SCENARIO-005 / 006 / 007 / 022: the story player in main.js ----------------------------

test('SCENARIO-005: main.js wires startBtn to the narrated 9-stage ICE walkthrough with per-stage captions and per-stage durations', () => {
  const src = strippedMain();
  assert.ok(/['"]\.\/ignition-story\.js['"]/.test(src), "main.js must import from './ignition-story.js'");
  assert.ok(count(src, /\bICE_STEPS\b/g) >= 1, 'main.js must consume ICE_STEPS');
  assert.ok(/\bcaption\b/.test(src), 'main.js must render each stage caption on screen');
  assert.ok(/\bduration\b/.test(src), 'main.js must time each stage with its step duration');
  assert.ok(count(src, /\bgetElementById\(\s*['"]startBtn['"]\s*\)/g) >= 1, 'startBtn stays wired');
});

test('SCENARIO-006: pressing startBtn mid-story is ignored — story guard prevents restart, overlapping captions and counter desync', () => {
  const src = strippedMain();
  const guardHits = count(src, STORY_GUARD);
  assert.ok(guardHits >= 2,
    'a story-active guard must be set when the story starts AND consulted before starting another');
  const guardAlternation = ['storyPlaying', 'storyActive', 'isStoryPlaying', 'ignitionStoryPlaying', 'storyInProgress', 'storyRunning', 'storyState.playing'].join('|');
  const earlyReturn = new RegExp(`if\\s*\\([^)]*(?:${guardAlternation})[^)]*\\)\\s*\\{?\\s*(\\/\\/[^\\n]*\\n\\s*)?return`);
  assert.ok(earlyReturn.test(src),
    'the start path must early-return while the story is already playing (no restart, no double captions)');
});

test('SCENARIO-007: each stage tweens the camera onto that step cameraFocus target via the existing preset flight machinery', () => {
  const src = strippedMain();
  assert.ok(/\bcameraFocus\b/.test(src), "main.js must read each step's cameraFocus target");
  assert.ok(/targetCameraPos|targetCameraLookAt|camera\.position\.lerp|cameraTween|flyTo/.test(src),
    'the tweened camera flight (lerp toward targetCameraPos/targetCameraLookAt) must survive');
  assert.ok(/setFocusPreset|CAMERA_PRESETS\[/.test(src),
    'cameraFocus targets must resolve through the CAMERA_PRESETS flight');
});

test('SCENARIO-008: the stage list/counter is inspectable and in-page console.assert self-checks pin step shapes and the inspectable count', () => {
  const src = strippedMain();
  assert.ok(STAGE_COUNTER.test(src), 'a stage index/counter must exist in the story player');
  assert.ok(/window\.[\w$]*(story|Story)[\w$]*|export\s+(const|let)\s+[\w$]*(story|Story)[\w$]*|storyState/.test(src),
    'the stage list/counter must be exposed for inspection (window.* or export)');
  assert.ok(count(src, /console\.assert/g) >= 2, 'in-page console.assert self-checks must be present');
  assert.ok(/caption/.test(src) && /cameraFocus/.test(src) && /duration/.test(src),
    'a console.assert self-check must pin the step field shapes caption/cameraFocus/duration');
  assert.ok(/BASELINEInspectableCount|inspectableObjects\.length/.test(src),
    'the inspectable-count console.assert self-check must survive');
});

// ---- SCENARIO-009 / 010: the replay control ------------------------------------------------

test('SCENARIO-009: index.html exposes replayBtn labelled 重新播放点火 Replay start, wired in main.js to replay from step 1 with the counter restarting and the engine left running', () => {
  const html = readSiteFile('index.html');
  const btn = html.match(/<button[^>]*\bid\s*=\s*["']replayBtn["'][^>]*>[\s\S]*?<\/button>/);
  assert.ok(btn, 'index.html must contain a <button id="replayBtn"> control');
  assert.ok(/重新播放点火/.test(btn[0]), 'the replay control text must contain 重新播放点火');
  assert.ok(/Replay/i.test(btn[0]) && /start/i.test(btn[0]), 'the replay control text must contain "Replay start"');
  const src = strippedMain();
  const region = handlerRegion(src, 'replayBtn');
  assert.ok(region && /addEventListener/.test(region), 'replayBtn must have a click listener in main.js');
  assert.ok(PLAY_STORY.test(region) || /(storyStep|storyIndex|stepIndex|stageIndex|currentStep|storyStage)\s*=\s*0/.test(region),
    'replaying must run the full walkthrough again from step 1 (counter reset to 0)');
  assert.ok(!/isRunning\s*=\s*false/.test(region),
    'replay must not shut the engine down — it returns to its post-story running state');
});

test('SCENARIO-010: replay stays usable after shutdown — the replay path is not gated on engine running state', () => {
  const src = strippedMain();
  const region = handlerRegion(src, 'replayBtn');
  assert.ok(region, 'replayBtn must be wired in main.js');
  assert.ok(!/if\s*\(\s*!?\s*(isRunning|running|engineRunning)\b/.test(region),
    'the replay handler must not require a running engine (it works while running AND after shutdown)');
  assert.ok(count(src, /replayBtn/g) >= 2,
    'replayBtn must be referenced for both wiring and visibility handling (shown after the story completes)');
});

// ---- SCENARIO-018 / 019: focus presets -----------------------------------------------------

test('SCENARIO-018: CAMERA_PRESETS gains cooling and fuel entries and index.html gains the two matching focusBar buttons with tweened flight', () => {
  const block = presetsBlock();
  for (const key of ['cooling', 'fuel']) {
    const nums = presetNumbers(block, key);
    assert.ok(nums, `CAMERA_PRESETS must gain a '${key}' entry`);
    assert.equal(nums.length, 6,
      `CAMERA_PRESETS.${key} must carry pos [x,y,z] + target [x,y,z] (got ${nums.length} numbers)`);
  }
  const html = readSiteFile('index.html');
  const cool = html.match(/<button[^>]*data-focus="cooling"[^>]*>[\s\S]*?<\/button>/);
  assert.ok(cool, 'focusBar must gain a data-focus="cooling" button');
  assert.ok(/冷却|散热/.test(cool[0]), 'the cooling preset button must be labelled 🔥冷却/散热');
  const fuel = html.match(/<button[^>]*data-focus="fuel"[^>]*>[\s\S]*?<\/button>/);
  assert.ok(fuel, 'focusBar must gain a data-focus="fuel" button');
  assert.ok(/燃油/.test(fuel[0]) && /进气/.test(fuel[0]), 'the fuel preset button must be labelled ⛽燃油与进气');
  const src = strippedMain();
  assert.ok(/targetCameraPos|targetCameraLookAt|camera\.position\.lerp/.test(src),
    'the new presets must fly through the same tweened camera path as the existing ones');
});

test('SCENARIO-019: every existing preset keeps its pos/target — overview, engine, starter, gearbox, driveshaft, differential, steering, brakes, evMotor (v2 real-anatomy layout)', () => {
  const block = presetsBlock();
  // v2 layout: engine at x≈−4.8 with twin cams at y 1.795, front axle −5.3,
  // rear axle/differential 3.6, steering rack −5.9, wheels at z ±2.42.
  const PINS = {
    overview: [13, 8, 15, 0, 0.5, 0],
    engine: [-4.2, 3.6, 4.6, -4.85, 1, 0],
    starter: [-4.6, 0.9, 3.4, -3.7, -0.4, 0.5],
    gearbox: [-2.4, 2.6, 3.4, -2.4, 0, 0],
    driveshaft: [1, 2.6, 3.6, 1, 0, 0],
    differential: [2.45, 0.75, 2.75, 3.45, -0.28, 0],
    steering: [-5.9, 1.8, 3.4, -5.9, -0.4, 0],
    brakes: [3.6, 1.2, 4, 3.6, 0, 2.42],
    evMotor: [-1.6, 2.5, 3.4, -1.6, 0, 0],
  };
  for (const [key, pin] of Object.entries(PINS)) {
    const nums = presetNumbers(block, key);
    assert.ok(nums, `existing preset '${key}' must still exist in CAMERA_PRESETS`);
    assert.deepEqual(nums, pin,
      `existing preset '${key}' must keep its identical pos/target (expected [${pin}], got [${nums}])`);
  }
});

test('SCENARIO-018/019: main.js exports frozen FOCUS_SCENARIO_TAGS = [SCENARIO-018, SCENARIO-019]', () => {
  const src = strippedMain();
  const m = src.match(/export\s+const\s+FOCUS_SCENARIO_TAGS\s*=\s*Object\.freeze\(\s*\[([^\]]*)\]/);
  assert.ok(m, 'main.js must export const FOCUS_SCENARIO_TAGS = Object.freeze([...])');
  assert.ok(/['"]SCENARIO-018['"]/.test(m[1]) && /['"]SCENARIO-019['"]/.test(m[1]),
    'FOCUS_SCENARIO_TAGS must contain SCENARIO-018 and SCENARIO-019');
});

// ---- SCENARIO-020 / 022: telemetry HUD + EV story -------------------------------------------

test('SCENARIO-020: hudCard gains hudCoolant/hudOil readouts updated by updateTelemetry in the same animation loop as hudRpm/hudGear/hudStroke/hudDiff', () => {
  const html = readSiteFile('index.html');
  const idx = html.indexOf('id="hudCard"');
  assert.ok(idx >= 0, 'hudCard must exist');
  const card = html.slice(idx, idx + 2500);
  assert.ok(card.includes('id="hudCoolant"'), 'hudCard must contain a hudCoolant readout element');
  assert.ok(card.includes('id="hudOil"'), 'hudCard must contain a hudOil readout element');
  const src = strippedMain();
  assert.ok(/['"]\.\/telemetry\.js['"]/.test(src), "main.js must import from './telemetry.js'");
  assert.ok(count(src, /\bupdateTelemetry\b/g) >= 2,
    'main.js must import AND call updateTelemetry in the animation loop');
  for (const id of ['hudRpm', 'hudGear', 'hudStroke', 'hudDiff', 'hudCoolant', 'hudOil']) {
    assert.ok(new RegExp(`getElementById\\(\\s*['"]${id}['"]\\s*\\)`).test(src),
      `main.js must keep updating #${id} in the HUD animation loop`);
  }
});

test('SCENARIO-022: btnEV replays the same walkthrough framework with EV_STEPS', () => {
  const src = strippedMain();
  assert.ok(count(src, /\bEV_STEPS\b/g) >= 2,
    'main.js must consume EV_STEPS (btnEV replays the same story framework with the EV timeline)');
  const sameFramework =
    /mode\s*===?\s*['"]EV['"]\s*\?\s*EV_STEPS\s*:\s*ICE_STEPS/.test(src) ||
    /EV_STEPS[\s\S]{0,160}\bICE_STEPS\b/.test(src) ||
    /ICE_STEPS[\s\S]{0,160}\bEV_STEPS\b/.test(src) ||
    /EV_STEPS[\s\S]{0,160}(playIgnitionStory|startStory|playStory|runStory|startIgnitionStory|playSteps|runIgnitionStory)/.test(src);
  assert.ok(sameFramework,
    'EV_STEPS must feed the same story player (steps/captions/cameraFocus) used by the ICE story');
  assert.ok(/getElementById\(\s*['"]btnEV['"]\s*\)/.test(src), 'btnEV must stay wired');
});
