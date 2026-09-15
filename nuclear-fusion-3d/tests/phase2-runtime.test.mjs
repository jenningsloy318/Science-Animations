// Phase 2 RED tests — Fusion Story Runtime, Guided Tour & Playback Controls
// Run: node --test nuclear-fusion-3d/tests/phase2-runtime.test.mjs
//
// TEST LEVEL = TASK LEVEL. Every phase-2 task row states its observable against
// nuclear-fusion-3d/js/main.js (source-level declarations: `const PHYS = {...}`,
// `PHASES`, `TOUR_STEPS`, the window.fusionSim API wiring, the control-bar
// handlers, the r160 hygiene rules, and the SCENARIO-NNN traceability comments).
// These tests bind to exactly those declared observables by reading the module
// source and asserting the contracts; plain-data literals (PHYS / PHASES /
// TOUR_STEPS) are additionally extracted and EVALUATED so numeric values are
// verified, not just the presence of digits (anti-hardcoding).
//
// This file intentionally imports ONLY node builtins and does all file I/O
// inside test bodies, so the suite always COLLECTS and RUNS; every failure is
// a clean AssertionError against the not-yet-implemented Phase 2 behavior.
// Code-level checks run against comment-stripped source (so prose comments can
// neither satisfy a code contract nor trip a ban); the SCENARIO-NNN
// traceability checks intentionally match the raw source, because the phase
// tasks require those comments to be embedded in js/main.js.
//
// Scenario coverage matrix (tags appear VERBATIM in test titles below):
//   SCENARIO-007 -> "SCENARIO-007 (AC-04): 原子结构 …CSS2D labels + size legend"
//   SCENARIO-008 -> "SCENARIO-008 (AC-04): 加热 → 等离子体 …single THREE.Points ≤ 2,000"
//   SCENARIO-009 -> "SCENARIO-009 (AC-04): 聚变反应 …⁴He + neutron + AdditiveBlending flash"
//   SCENARIO-010 -> "SCENARIO-010 (AC-04): §2 PHYS constants…" + "…state machine & window.fusionSim API"
//   SCENARIO-011 -> "SCENARIO-011 (AC-05): #btnTour opens at step 0…"
//   SCENARIO-012 -> "SCENARIO-012 (AC-05): tourPrev/tourNext clamp + forced phase coupling"
//   SCENARIO-013 -> "SCENARIO-013 (AC-05): #tourExit closes… reset never touches tour state"
//   SCENARIO-017 -> "SCENARIO-017 (AC-07): ⏸ 暂停/▶ 继续 …freeze AND resume (BDD-F-001)"
//   SCENARIO-018 -> "SCENARIO-018 (AC-07): 🔄 重置 = startRun('plasma') without tour state"
//   SCENARIO-019 -> "SCENARIO-019 (AC-07): 🎥 重置视角 restores DEFAULT_CAMERA_*"
//   SCENARIO-020 -> "SCENARIO-020 (AC-08): OrbitControls stay enabled in all phases"
//   SCENARIO-021 -> "SCENARIO-021 (AC-08): flash-fade auto-repeat… dispose-on-rebuild"
//   SCENARIO-022 -> "SCENARIO-022 (AC-09): r160 zero-console-warning hygiene"
//   SCENARIO-023 -> "SCENARIO-023 (AC-09): story order atoms → plasma → fusion…"
//
// Upstream-finding responses baked into THIS test artifact:
//   FR-001   — PHYS is pinned to the CORRECTED chain: masses 2.014102 / 3.016049 /
//              4.002602 / 1.008665 u, MASS_DEFECT_U 0.018884 (displayed ≈ 0.0189 u),
//              MEV_PER_U 931.494, Q_MEV 17.6, split 14.1/3.5 MeV, J_PER_MEV 1.602e-13,
//              E_J 2.82e-12 J; the fission-era literals '0.0256' / '3.2e-11' are
//              FORBIDDEN anywhere in js/main.js, and the derived quantities must be
//              internally consistent (defect = Σm, Q = defect × 931.494, E_J = Q × J_PER_MEV).
//   BDD-F-001 — the RESUME half of AC-07 is now observable: both labels ⏸ 暂停 and
//              ▶ 继续 must exist for the swap, paused=true AND paused=false writes must
//              exist, simTime accumulation must be gated on state.paused so the phase
//              clock continues after resume, and clock.running must never be written.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN_JS = path.resolve(HERE, '../js/main.js');
const INDEX_HTML = path.resolve(HERE, '../index.html');

const readMain = () => readFileSync(MAIN_JS, 'utf8');
const readIndex = () => {
  try {
    return readFileSync(INDEX_HTML, 'utf8');
  } catch {
    return '';
  }
};

/* Lookup wiring accepts getElementById('x') or querySelector('#x'). */
const byId = (id) =>
  new RegExp(
    "getElementById\\(\\s*['\"]" + id + "['\"]\\s*\\)|querySelector\\(\\s*['\"]#" + id + "['\"]\\s*\\)"
  );

const disposeCount = (code) => (code.match(/\.dispose\(\)/g) || []).length;

/* Removes // and block comments while preserving strings, so bans and counts
 * reflect actual code, not prose. */
function stripComments(src) {
  let out = '';
  let i = 0;
  let inStr = null;
  while (i < src.length) {
    const c = src[i];
    if (inStr) {
      out += c;
      if (c === inStr && src[i - 1] !== '\\') inStr = null;
      i += 1;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inStr = c;
      out += c;
      i += 1;
      continue;
    }
    if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i += 1;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i += 1;
      i += 2;
      out += ' ';
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

/* Balanced-brace/bracket scanner tolerant of strings and comments. */
function findBalanced(src, openIndex) {
  const openCh = src[openIndex];
  const closeCh = openCh === '{' ? '}' : openCh === '[' ? ']' : null;
  if (!closeCh) return -1;
  let depth = 0;
  let i = openIndex;
  let inStr = null;
  while (i < src.length) {
    const c = src[i];
    if (inStr) {
      if (c === inStr && src[i - 1] !== '\\') inStr = null;
      i += 1;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inStr = c;
      i += 1;
      continue;
    }
    if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i += 1;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }
    if (c === openCh) depth += 1;
    else if (c === closeCh) {
      depth -= 1;
      if (depth === 0) return i;
    }
    i += 1;
  }
  return -1;
}

/* Extracts the plain `{...}` / `[...]` literal assigned to `const NAME =`. */
function extractLiteral(code, name) {
  const re = new RegExp('(?:const|let|var)\\s+' + name + '\\s*=\\s*');
  const m = re.exec(code);
  if (!m) return null;
  let start = m.index + m[0].length;
  const wrap = code.slice(start, start + 20).match(/^Object\.freeze\s*\(/);
  if (wrap) start += wrap[0].length;
  if (code[start] !== '{' && code[start] !== '[') return null;
  const end = findBalanced(code, start);
  return end === -1 ? null : code.slice(start, end + 1);
}

/* Evaluates an extracted literal standalone (null if it references outer scope). */
function evalLiteral(literal) {
  if (literal == null) return null;
  try {
    return new Function('"use strict"; return (' + literal + ');')();
  } catch {
    return null;
  }
}

/* Extracts a function/method body by name (function decl, arrow, or object method). */
function extractFunctionBody(code, name) {
  const patterns = [
    new RegExp('function\\s+' + name + '\\s*\\([^)]*\\)\\s*\\{'),
    new RegExp(
      '(?:const|let|var)\\s+' + name + '\\s*=\\s*(?:async\\s*)?' +
        '(?:function\\s*\\([^)]*\\)|\\([^)]*\\)|[A-Za-z_$][\\w$]*)\\s*=>?\\s*\\{'
    ),
    new RegExp('(?:^|[,{;\\n])\\s*' + name + '\\s*\\([^)]*\\)\\s*\\{'),
  ];
  for (const re of patterns) {
    const m = re.exec(code);
    if (!m) continue;
    const braceAt = code.indexOf('{', m.index + m[0].length - 1);
    const end = braceAt === -1 ? -1 : findBalanced(code, braceAt);
    if (end !== -1) return code.slice(braceAt, end + 1);
  }
  return null;
}

const closeTo = (a, b, tol) => typeof a === 'number' && Math.abs(a - b) <= tol;

/* ———————————————————————————————————————————————————————————————— */

test('SCENARIO-010 (AC-04): §2 PHYS single-source constants carry the corrected AC-06 chain (FR-001 response)', () => {
  const raw = readMain();
  const code = stripComments(raw);
  const phys = evalLiteral(extractLiteral(code, 'PHYS'));
  assert.ok(
    phys && typeof phys === 'object' && !Array.isArray(phys),
    "js/main.js must declare `const PHYS = { ... }` as a standalone-evaluable plain literal (single source of the AC-06 chain)"
  );
  assert.ok(closeTo(phys.MASS_DEFECT_U, 0.018884, 1e-6), 'PHYS.MASS_DEFECT_U must be 0.018884 u');
  assert.ok(closeTo(phys.MEV_PER_U, 931.494, 1e-3), 'PHYS.MEV_PER_U must be 931.494 MeV/u');
  assert.ok(closeTo(phys.Q_MEV, 17.6, 0.05), 'PHYS.Q_MEV must be 17.6 MeV');
  assert.ok(closeTo(phys.J_PER_MEV, 1.602e-13, 1e-16), 'PHYS.J_PER_MEV must be 1.602e-13 J/MeV');
  assert.ok(closeTo(phys.E_J, 2.82e-12, 1e-14), 'PHYS.E_J must be 2.82e-12 J (17.6 MeV × 1.602e-13)');
  const vals = Object.values(phys).filter((v) => typeof v === 'number');
  for (const mass of [2.014102, 3.016049, 4.002602, 1.008665, 14.1, 3.5]) {
    assert.ok(
      vals.some((v) => closeTo(v, mass, 1e-6)),
      'PHYS numeric values must include ' + mass + ' (D/T/He/n masses and the 14.1/3.5 MeV split)'
    );
  }
  const strings = Object.values(phys).filter((v) => typeof v === 'string').join(' ');
  assert.ok(strings.includes('0.0189'), 'PHYS must carry the displayed ≈ 0.0189 u figure as a string value');
  assert.ok(/mc/i.test(strings) || /E=mc/.test(code), 'PHYS must carry the E=mc² 质能方程 label');
  /* Derived consistency — internally contradictory numbers are a correctness defect (FR-001). */
  assert.ok(
    closeTo(phys.MASS_DEFECT_U, 2.014102 + 3.016049 - 4.002602 - 1.008665, 1e-6),
    'FR-001: MASS_DEFECT_U must equal ²H + ³H − ⁴He − n = 0.018884 u (not 0.0256 u)'
  );
  assert.ok(
    closeTo(phys.Q_MEV, phys.MASS_DEFECT_U * phys.MEV_PER_U, 0.15),
    'FR-001: Q_MEV must match MASS_DEFECT_U × MEV_PER_U ≈ 17.6 MeV'
  );
  assert.ok(
    closeTo(phys.E_J, phys.Q_MEV * phys.J_PER_MEV, 1e-14),
    'FR-001: E_J must match Q_MEV × J_PER_MEV ≈ 2.82e-12 J (not the fission-era 3.2e-11 J)'
  );
  assert.ok(!/0\.0256/.test(code), 'FR-001: the wrong 0.0256 u figure must appear nowhere in js/main.js');
  assert.ok(!/3\.2e-?11/i.test(code), 'FR-001: the wrong 3.2e-11 J figure must appear nowhere in js/main.js');
  assert.ok(raw.includes('SCENARIO-010'), 'js/main.js must embed the SCENARIO-010 traceability comment');
});

test('SCENARIO-010 (AC-04): §3 simTime-gated phase state machine + observable window.fusionSim API', () => {
  const code = stripComments(readMain());
  assert.match(code, /window\.fusionSim\s*=/, 'js/main.js must assign the observable window.fusionSim API');
  for (const fn of [
    'getPhase', 'getPhaseTime', 'getSimTime', 'isPaused',
    'pause', 'resume', 'reset', 'isTourActive', 'getTourStep',
  ]) {
    assert.match(code, new RegExp('\\b' + fn + '\\b\\s*[:(]'), 'window.fusionSim must expose ' + fn + '()');
  }
  for (const field of ['phaseKey', 'phaseTime', 'simTime', 'paused']) {
    assert.match(code, new RegExp(field + '\\s*:'), 'the phase state object must track ' + field);
  }
  assert.match(code, /\badvancePhase\b/, 'advancePhase() must exist');
  assert.match(code, /startRun\s*\(\s*['"]atoms['"]\s*\)/, "startRun('atoms') must be supported (initial run)");
  assert.match(code, /startRun\s*\(\s*['"]plasma['"]\s*\)/, "startRun('plasma') must be supported (reset / auto-repeat)");
  const phases = evalLiteral(extractLiteral(code, 'PHASES'));
  assert.ok(
    Array.isArray(phases) && phases.length === 3,
    'PHASES must be a standalone-evaluable plain literal array of the 3 ordered phases'
  );
  const keys = phases.map((p) => (p && (p.key ?? p.phaseKey ?? p.id)) || undefined);
  assert.deepEqual(keys, ['atoms', 'plasma', 'fusion'], "PHASES order must be ['atoms','plasma','fusion']");
  const zh = phases.map((p) => (p && (p.zh ?? p.label ?? p.title)) || '').join(' ');
  assert.ok(
    zh.includes('原子结构') && zh.includes('等离子体') && zh.includes('聚变反应'),
    'PHASES zh labels must be 原子结构 / 加热 → 等离子体 / 聚变反应'
  );
  assert.ok(
    phases.every((p) => typeof (p.duration ?? p.seconds ?? p.dur) === 'number' && (p.duration ?? p.seconds ?? p.dur) > 0),
    'every phase must declare an explicit positive duration'
  );
});

test('SCENARIO-007 (AC-04): 原子结构 — D/T atoms with orbit rings and CSS2D 质子/中子/电子 labels + size legend', () => {
  const raw = readMain();
  const code = stripComments(raw);
  assert.match(code, /CSS2DRenderer/, 'the atoms phase needs the CSS2DRenderer overlay for on-canvas labels');
  assert.match(code, /CSS2DObject/, 'labels must be attached via CSS2DObject');
  for (const zh of ['质子', '中子', '电子']) {
    assert.ok(code.includes(zh), 'js/main.js must render the on-canvas label ' + zh + ' in the atoms phase');
  }
  assert.match(code, /orbit|轨道/i, 'each atom needs a visible orbit ring for its electron');
  assert.ok(
    /(图例|legend)/i.test(code) || /(图例|legend)/i.test(stripComments(readIndex())),
    'a legend (图例) distinguishing particles by SIZE must exist so color is never the only cue'
  );
  assert.ok(raw.includes('SCENARIO-007'), 'js/main.js must embed the SCENARIO-007 traceability comment');
});

test('SCENARIO-008 (AC-04): 加热 → 等离子体 — free electrons, jitter, ONE THREE.Points field capped at 2,000, dispose on rebuild', () => {
  const raw = readMain();
  const code = stripComments(raw);
  assert.match(code, /new\s+THREE\.Points\s*\(/, 'the ambient plasma field must be a THREE.Points');
  assert.match(code, /BufferGeometry/, 'the plasma field must use a BufferGeometry with typed-array positions');
  assert.match(code, /needsUpdate\s*=\s*true/, 'per-frame position updates must flag needsUpdate = true');
  assert.match(
    code,
    /\b(2000|2_000|2,000)\b/,
    'the total animated-particle count must be hard-capped at 2,000 in source'
  );
  assert.match(code, /(jitter|随机速度|randomVelocity|random)/i, 'nuclei must be driven by fast random-velocity jitter');
  assert.ok(
    disposeCount(code) >= 2,
    'every phase rebuild must dispose replaced geometries AND materials (>= 2 dispose() call sites)'
  );
  assert.ok(raw.includes('SCENARIO-008'), 'js/main.js must embed the SCENARIO-008 traceability comment');
});

test('SCENARIO-009 (AC-04): 聚变反应 — Coulomb-repulsion approach, ⁴He merge, neutron ejection, AdditiveBlending energy flash', () => {
  const raw = readMain();
  const code = stripComments(raw);
  assert.match(code, /SpriteMaterial/, 'the energy flash must be an expanding Sprite');
  assert.match(code, /AdditiveBlending/, 'the flash SpriteMaterial must use blending: THREE.AdditiveBlending');
  assert.match(code, /transparent\s*:\s*true/, 'the flash SpriteMaterial must set transparent: true');
  assert.match(code, /depthWrite\s*:\s*false/, 'the flash SpriteMaterial must set depthWrite: false');
  assert.ok(/(库仑|Coulomb)/i.test(code), 'the approach must implement a decelerating Coulomb-repulsion arc');
  assert.ok(/(氦|⁴He|He-4|helium)/i.test(code), 'the merge product must be identifiable as ⁴He (2 protons + 2 neutrons)');
  assert.ok(/(反冲|recoil)/i.test(code), 'the ejected gray neutron must carry recoil momentum');
  assert.ok(raw.includes('SCENARIO-009'), 'js/main.js must embed the SCENARIO-009 traceability comment');
});

test('SCENARIO-011 (AC-05): #btnTour opens the guided tour panel at step 0 with the 5-step TOUR_STEPS data array', () => {
  const raw = readMain();
  const code = stripComments(raw);
  assert.match(code, byId('btnTour'), '#btnTour must be looked up and wired to open the tour');
  assert.match(code, byId('tourTitle'), 'the tour must write #tourTitle');
  assert.match(code, byId('tourText'), 'the tour must write #tourText');
  const steps = evalLiteral(extractLiteral(code, 'TOUR_STEPS'));
  assert.ok(
    Array.isArray(steps) && steps.length === 5,
    'TOUR_STEPS must be a standalone-evaluable plain data array of exactly 5 steps'
  );
  assert.ok(
    steps.every((s) => s && typeof s === 'object' && 'key' in s && 'title' in s && 'zhText' in s && 'phaseKey' in s),
    'every TOUR_STEPS entry must be { key, title, zhText, phaseKey }'
  );
  assert.equal(steps[0].phaseKey, 'atoms', 'step 0 (原子结构（质子/中子/电子）) must force the atoms phase');
  assert.equal(steps[3].phaseKey, 'fusion', 'step 3 (聚变反应生成氦-4 和中子) must force the fusion phase');
  assert.ok(
    steps.every((s) => ['atoms', 'plasma', 'fusion'].includes(s.phaseKey)),
    'each step.phaseKey must be one of atoms/plasma/fusion'
  );
  const joined = steps.map((s) => (s.title || '') + ' ' + (s.zhText || '')).join(' ');
  for (const frag of ['质子', '中子', '电子', '等离子体', '库仑', '氦', 'E=mc']) {
    assert.ok(joined.includes(frag), 'the 5-step narration must cover “' + frag + '”');
  }
  assert.ok(raw.includes('SCENARIO-011'), 'js/main.js must embed the SCENARIO-011 traceability comment');
});

test('SCENARIO-012 (AC-05): #tourPrev/#tourNext clamp at bounds, #tourDots highlights, entering a step forces its phase', () => {
  const raw = readMain();
  const code = stripComments(raw);
  assert.match(code, byId('tourPrev'), '#tourPrev (← 上一步) must be wired');
  assert.match(code, byId('tourNext'), '#tourNext (下一步 →) must be wired');
  assert.match(code, byId('tourDots'), '#tourDots must be updated to highlight the current step');
  assert.match(code, /phaseKey\s*=/, 'entering tour step i must force phaseKey = step.phaseKey');
  assert.match(code, /phaseTime\s*=\s*0/, 'entering tour step i must reset phaseTime to 0');
  assert.match(code, /simTime\s*=/, 'entering tour step i must snap simTime to that phase boundary');
  assert.match(
    code,
    /(step|idx|index)[\s\S]{0,160}Math\.(max|min)\(|Math\.(max|min)\([\s\S]{0,120}(step|idx|index)/i,
    'prev/next navigation must clamp the step index at the 0..4 bounds'
  );
  assert.ok(raw.includes('SCENARIO-012'), 'js/main.js must embed the SCENARIO-012 traceability comment');
});

test('SCENARIO-013 (AC-05): #tourExit closes the tour to free exploration; tour state is isolated from the runtime', () => {
  const raw = readMain();
  const code = stripComments(raw);
  assert.match(code, byId('tourExit'), '#tourExit (退出) must be wired to close the panel');
  assert.match(code, /(tourActive|isTourActive|tourStep|tourIndex)/, 'tour state must live in dedicated tour variables');
  const body = extractFunctionBody(code, 'startRun');
  assert.ok(body !== null, 'startRun(fromKey) must exist as a function');
  assert.ok(
    !/tour/i.test(body),
    'startRun must never read or write tour state — tour state lives only in the §6 tour code'
  );
  assert.ok(raw.includes('SCENARIO-013'), 'js/main.js must embed the SCENARIO-013 traceability comment');
});

test('SCENARIO-017 (AC-07): ⏸ 暂停 / ▶ 继续 toggle freezes AND resumes particles + phase clock (BDD-F-001 response)', () => {
  const raw = readMain();
  const code = stripComments(raw);
  assert.match(code, byId('toggleBtn'), '#toggleBtn must be wired');
  assert.ok(code.includes('⏸') && code.includes('暂停'), 'the pause label ⏸ 暂停 must live in js/main.js for the label swap');
  assert.ok(code.includes('▶') && code.includes('继续'), 'the resume label ▶ 继续 must live in js/main.js for the label swap');
  assert.match(code, /paused\s*=\s*true/, 'pause must set the paused state');
  assert.match(
    code,
    /paused\s*=\s*false/,
    'BDD-F-001: resume must observably clear the pause so particle motion AND the phase clock continue'
  );
  assert.match(
    code,
    /(!\s*(state\.)?paused)|((state\.)?paused\s*\?)|(\(\s*(state\.)?paused\s*\))|(paused\s*===?\s*false)/,
    'BDD-F-001: the rAF loop must gate simTime accumulation / world updates on the paused flag, so after ▶ 继续 the story continues from exactly the frozen phase'
  );
  assert.match(code, /clock\.getDelta\(\)/, 'clock.getDelta() must still be called EVERY frame, paused or not');
  assert.ok(!/clock\.running\s*=/.test(code), 'the loop must never write clock.running (accumulator pause, not clock stop)');
  assert.ok(raw.includes('SCENARIO-017'), 'js/main.js must embed the SCENARIO-017 traceability comment');
});

test('SCENARIO-018 (AC-07): 🔄 重置 restarts the 3D run from 等离子体 via startRun(\'plasma\') without touching tour state', () => {
  const raw = readMain();
  const code = stripComments(raw);
  assert.match(code, byId('resetBtn'), '#resetBtn must be wired');
  assert.match(code, /startRun\s*\(\s*['"]plasma['"]\s*\)/, "reset must restart the animation via startRun('plasma')");
  assert.match(
    code,
    /\breset\b\s*[:(][\s\S]{0,240}?startRun/,
    'the fusionSim.reset member must delegate to startRun'
  );
  const body = extractFunctionBody(code, 'startRun');
  assert.ok(body !== null, 'startRun(fromKey) must exist');
  assert.ok(!/tour/i.test(body), 'reset (= startRun) must not read or write tour state');
  assert.ok(raw.includes('SCENARIO-018'), 'js/main.js must embed the SCENARIO-018 traceability comment');
});

test('SCENARIO-019 (AC-07): 🎥 重置视角 restores DEFAULT_CAMERA_POS / DEFAULT_CAMERA_TARGET', () => {
  const raw = readMain();
  const code = stripComments(raw);
  const m = byId('camBtn').exec(code);
  assert.ok(m !== null, '#camBtn must be wired');
  const handler = code.slice(m.index, m.index + 900);
  assert.ok(
    handler.includes('DEFAULT_CAMERA_POS'),
    'the #camBtn handler must restore camera.position from DEFAULT_CAMERA_POS'
  );
  assert.ok(
    handler.includes('DEFAULT_CAMERA_TARGET'),
    'the #camBtn handler must restore controls.target from DEFAULT_CAMERA_TARGET'
  );
  assert.ok(raw.includes('SCENARIO-019'), 'js/main.js must embed the SCENARIO-019 traceability comment');
});

test('SCENARIO-020 (AC-08): OrbitControls stay enabled in every phase — nothing disables them or interrupts the loop', () => {
  const raw = readMain();
  const code = stripComments(raw);
  assert.ok(
    !/controls\.enabled\s*=\s*false/.test(code),
    'no code path may set controls.enabled = false — drag-rotate and wheel/pinch-zoom must never be interrupted'
  );
  assert.match(code, /controls\.update\(\)/, 'the single rAF loop must keep calling controls.update() in all phases');
  assert.match(code, /enableDamping/, 'damping must stay enabled');
  const body = extractFunctionBody(code, 'startRun');
  assert.ok(body !== null, 'startRun (phase rebuild) must exist — phases change without touching the controls');
  assert.ok(
    !/controls\s*\./.test(body),
    'phase rebuild must not interfere with OrbitControls (no controls.* writes inside startRun)'
  );
  assert.ok(raw.includes('SCENARIO-020'), 'js/main.js must embed the SCENARIO-020 traceability comment');
});

test('SCENARIO-021 (AC-08): flash-fade auto-repeat calls startRun(\'plasma\') when no tour is active, disposing the old run', () => {
  const raw = readMain();
  const code = stripComments(raw);
  const calls = code.match(/startRun\s*\(\s*['"]plasma['"]\s*\)/g) || [];
  assert.ok(calls.length >= 1, "free-explore auto-repeat must call startRun('plasma') after the energy flash fades");
  assert.match(code, /isTourActive\s*\(\)/, 'auto-repeat must be guarded on the tour NOT being active');
  assert.ok(
    disposeCount(code) >= 2,
    "each auto-repeat rebuild must dispose the previous run's geometries and materials"
  );
  assert.ok(raw.includes('SCENARIO-021'), 'js/main.js must embed the SCENARIO-021 traceability comment');
});

test('SCENARIO-022 (AC-09): r160 zero-console-warning hygiene — no legacy lighting/encoding APIs, ONE rAF loop, dispose-on-rebuild', () => {
  const raw = readMain();
  const code = stripComments(raw);
  assert.ok(!/useLegacyLights/.test(code), 'useLegacyLights is removed in r160 — writing it logs a deprecation warning');
  assert.ok(!/outputEncoding/.test(code), 'outputEncoding is removed in r160 — writing it logs a deprecation warning');
  assert.ok(!/\.encoding\s*=/.test(code), 'texture.encoding was replaced by texture.colorSpace in r152+');
  const srgb = code.match(/SRGBColorSpace/g) || [];
  if (srgb.length > 0) {
    assert.match(code, /canvas/i, 'texture.colorSpace = SRGBColorSpace is only allowed for the canvas-generated texture');
  }
  const raf = code.match(/requestAnimationFrame/g) || [];
  assert.equal(raf.length, 1, 'exactly ONE requestAnimationFrame call site (the single rAF loop)');
  assert.ok(disposeCount(code) >= 2, 'dispose-on-rebuild hygiene must be present');
  assert.ok(raw.includes('SCENARIO-022'), 'js/main.js must embed the SCENARIO-022 traceability comment');
});

test('SCENARIO-023 (AC-09): runtime story order — initial run atoms → plasma → fusion, reset/auto-repeat plasma → fusion, simTime accumulator', () => {
  const raw = readMain();
  const code = stripComments(raw);
  const phases = evalLiteral(extractLiteral(code, 'PHASES'));
  assert.ok(Array.isArray(phases) && phases.length === 3, 'PHASES must exist to define the observable story order');
  assert.deepEqual(
    phases.map((p) => (p && (p.key ?? p.phaseKey ?? p.id)) || undefined),
    ['atoms', 'plasma', 'fusion'],
    'the story must advance atoms → plasma → fusion in order (a reset run then advances plasma → fusion)'
  );
  assert.match(code, /\badvancePhase\b/, 'advancePhase() must drive phase progression');
  assert.match(
    code,
    /simTime\s*\+=|simTime\s*=\s*[^;\n]*simTime\s*\+/,
    'the loop must accumulate simTime (simTime-accumulator), which gates advancePhase'
  );
  assert.match(code, /startRun\s*\(\s*['"]atoms['"]\s*\)/, 'the INITIAL run must start at 原子结构 (atoms)');
  assert.match(code, /startRun\s*\(\s*['"]plasma['"]\s*\)/, 'reset / auto-repeat runs must restart at 等离子体 (plasma)');
  assert.ok(raw.includes('SCENARIO-023'), 'js/main.js must embed the SCENARIO-023 traceability comment');
});
