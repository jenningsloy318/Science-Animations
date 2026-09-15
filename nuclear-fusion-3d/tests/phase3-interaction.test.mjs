// Phase 3 interaction suite — 每一幕可点击控制 + 实时温度计 + 常见问题 FAQ
// Scope: SCENARIO-025 (AC-10) — clickable phase tabs / prev-next / auto-manual
// toggle, the plasma thermometer HUD (20 ℃ → 1 亿℃), and the physics FAQ
// answering 只有加热吗 / 别的方法 / 必须等离子体吗 / 核素记号规则.
// Run: node --test nuclear-fusion-3d/tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pageDir = resolve(here, '..');
const idx = readFileSync(join(pageDir, 'index.html'), 'utf8');
const css = readFileSync(join(pageDir, 'css', 'style.css'), 'utf8');
const main = readFileSync(join(pageDir, 'js', 'main.js'), 'utf8');

// ---------------------------------------------------------------------------
// AC-10 — clickable phase control chrome
// ---------------------------------------------------------------------------

test('SCENARIO-025 (AC-10): index.html phase tabs — exactly three .phase-tab buttons with data-phase atoms/plasma/fusion, plus #prevPhaseBtn/#nextPhaseBtn/#autoBtn', () => {
  const tabs = idx.match(/class="phase-tab[^"]*"/g) ?? [];
  assert.equal(tabs.length, 3, `expected exactly 3 .phase-tab buttons, found ${tabs.length}`);
  for (const key of ['atoms', 'plasma', 'fusion']) {
    assert.ok(idx.includes(`data-phase="${key}"`), `phase tab data-phase="${key}" required`);
  }
  for (const id of ['prevPhaseBtn', 'nextPhaseBtn', 'autoBtn', 'phaseLabel', 'phaseTabs']) {
    assert.ok(idx.includes(`id="${id}"`), `#${id} required`);
  }
  assert.ok(idx.includes('上一幕'), 'prev-phase label 上一幕 required');
  assert.ok(idx.includes('下一幕'), 'next-phase label 下一幕 required');
});

test('SCENARIO-025 (AC-10): js/main.js manual/auto advance — state.autoAdvance gates advancePhase; manual mode replays the fusion act in place; fusionSim exposes gotoPhase/getMode/setAutoAdvance', () => {
  assert.match(main, /autoAdvance\s*:/, 'the state object must track autoAdvance');
  const advIdx = main.indexOf('function advancePhase');
  assert.ok(advIdx !== -1, 'advancePhase() must exist');
  const body = main.slice(advIdx, advIdx + 800);
  assert.match(body, /autoAdvance/, 'advancePhase() must consult the auto/manual mode');
  assert.match(
    body,
    /startRun\s*\(\s*['"]fusion['"]\s*\)/,
    "manual mode must replay the fusion act in place (startRun('fusion'))"
  );
  const simAssign = /window\.fusionSim\s*=\s*\{/.exec(main);
  assert.ok(simAssign !== null, 'window.fusionSim = { ... } assignment required');
  const simBlock = main.slice(simAssign.index, simAssign.index + 2600);
  for (const fn of ['gotoPhase', 'getMode', 'setAutoAdvance']) {
    assert.match(simBlock, new RegExp(fn + '\\s*:'), 'window.fusionSim must expose ' + fn);
  }
  assert.match(main, /jumpToPhase/, 'jumpToPhase(key) helper must wire tabs/prev/next');
  assert.match(main, /refreshPhaseChrome/, 'phase tabs must be highlighted on every phase change');
  // clicking a tab restarts that act via startRun — control never depends on waiting
  assert.match(main, /phase-tab[\s\S]{0,400}startRun|jumpToPhase\s*\(\s*btn\.dataset\.phase/, 'tab clicks must reach startRun');
});

test('SCENARIO-025 (AC-10): plasma thermometer — #tempHud/#tempNow/#tempBar/#tempStage markup, exponential ramp 20 ℃ → 1 亿℃, Chinese unit formatter, animated in the single rAF loop', () => {
  for (const id of ['tempHud', 'tempNow', 'tempBar', 'tempStage', 'tempGoal']) {
    assert.ok(idx.includes(`id="${id}"`), `#${id} required`);
  }
  assert.match(idx, /1\s*亿℃/, 'the goal line must state 1 亿℃ (D–T ignition)');
  assert.match(main, /function plasmaTempC/, 'plasmaTempC(t) exponential ramp required');
  assert.match(main, /function fmtTempC/, 'fmtTempC(T) Chinese-unit formatter required');
  assert.match(main, /T_IGNITION_C\s*=\s*1e8/, 'ignition temperature must be 1e8 ℃');
  assert.match(main, /updateTempHud\s*\(\)/, 'the rAF loop must refresh the thermometer');
  // ramp sanity: t=0 → room temp, t=duration → ignition
  const T_ROOM = 20, T_IGN = 1e8, DUR = 12;
  const ramp = (t) => T_ROOM * Math.pow(T_IGN / T_ROOM, Math.min(Math.max(t / DUR, 0), 1));
  assert.ok(Math.abs(ramp(0) - 20) < 1e-9, 'ramp must start at 20 ℃');
  assert.ok(Math.abs(ramp(DUR) - 1e8) < 1e-6, 'ramp must end at 1 亿℃');
});

// ---------------------------------------------------------------------------
// AC-10 — physics FAQ (the dad/kid questions answered in-app)
// ---------------------------------------------------------------------------

test('SCENARIO-025 (AC-10): physics FAQ — 其他形成等离子体的方法 / 需要多少度 / 必须等离子体吗 / 核素记号（左上角=质量数）', () => {
  for (const frag of [
    '只有加热', '日光灯', '激光', '电磁波',       // Q1 other ways to ionize
    '1 亿℃', '1500 万℃', '量子隧穿',              // Q2 how hot (sun vs earth)
    '托卡马克', 'μ 子',                            // Q3 is plasma required
    '左上角', '左下角', 'H₂O', 'Ca²⁺',             // Q4 nuclide notation rules
  ]) {
    assert.ok(idx.includes(frag), `the FAQ must cover “${frag}”`);
  }
});

test('SCENARIO-025 (AC-10): css — .phase-tab buttons with an .active highlight + #tempHud thermometer styles', () => {
  assert.match(css, /\.phase-tab\s*\{/, '.phase-tab base rule required');
  assert.match(css, /\.phase-tab\.active\s*\{/, '.phase-tab.active highlight required');
  assert.match(css, /#tempHud\s*\{/, '#tempHud positioning required');
  assert.match(css, /#tempBar\s*\{/, '#tempBar fill required');
  assert.match(css, /\.phase-tab:focus-visible/, 'keyboard focus for phase tabs required');
});
