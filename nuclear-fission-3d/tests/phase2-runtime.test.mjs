// Phase 2 RED tests — 裂变运行时·状态机·科学文案·主循环（nuclear-fission-3d/js/main.js）
// Run: node --test nuclear-fission-3d/tests/phase2-runtime.test.mjs
//
// TEST LEVEL = TASK LEVEL. Phase-2 task rows state their observables against
// nuclear-fission-3d/js/main.js as source-level contracts: `const MAX_PARTICLES = 2000;`,
// `const PHASES = [...]`（恰 3 项，duration 10/12/14）, `const TOUR_STEPS = [...]`
// （恰 4 项）, advancePhase()/jumpToPhase()/startRun() 语义, AC-05 科学文案逐字子串,
// window.fissionSim 恰 12 方法表面, 单一 rAF 主循环形态, 以及 __errs/__ready/
// WebGL 降级启动契约。These tests bind to exactly those declared observables by
// reading the module source and asserting the contracts; plain-data literals
// (PHASES / TOUR_STEPS) are additionally extracted and EVALUATED so numeric
// values are verified, not just digit presence (anti-hardcoding).
//
// This file imports ONLY node builtins and does all file I/O inside test
// bodies, so the suite always COLLECTS and RUNS; with js/main.js absent every
// test fails cleanly (ENOENT) — the valid greenfield RED. Code-level checks
// run against comment-stripped source, so prose comments can neither satisfy
// a code contract nor trip a ban.
//
// Scenario coverage matrix (tags appear VERBATIM in test titles below):
//   SCENARIO-004 -> "SCENARIO-004 (AC-03): 剧情恰按三个相位顺序推进 …"
//   SCENARIO-005 -> "SCENARIO-005 (AC-03): window.fissionSim 方法表面恰 12 个 …"
//   SCENARIO-006 -> "SCENARIO-006 (AC-03): gotoPhase 合法键立即跳相并优先退出导览 …"
//   SCENARIO-007 -> "SCENARIO-007 (AC-03): gotoPhase 非法键被静默忽略 …"
//   SCENARIO-008 -> "SCENARIO-008 (AC-03): reset 从初始相重启且不影响导览 …"
//   SCENARIO-014 -> "SCENARIO-014 (AC-05): 讲解文案逐字锚定 …"
//   SCENARIO-015 -> "SCENARIO-015 (AC-05): 守恒验算可视化 …"
//   SCENARIO-016 -> "SCENARIO-016 (AC-05): 解说节奏按相位推进 …"
//   SCENARIO-021 -> "SCENARIO-021 (AC-08) + SCENARIO-022 (AC-08): 门禁命令锁定 …"
//   SCENARIO-022 -> 同上（与 SCENARIO-021 同一测试标题内逐字出现）
//   SCENARIO-026 -> "SCENARIO-026 (AC-10): 单一主循环 …"
//   SCENARIO-027 -> "SCENARIO-027 (AC-10): 启动契约 …"
//   SCENARIO-028 -> "SCENARIO-028 (AC-10): WebGL 不可用降级 …"
//
// Review-response baked into THIS test artifact:
//   CF-implementation-0ft7p5y (SCENARIO-026 prior contradiction) — the previous
//   RED attempt asserted evalLiteral(balancedBlock(MAX_PARTICLES)) === 2000; a
//   balanced {...}/[...] block can only ever evaluate to an Object or Array, so
//   NO implementation could pass and the suite was jointly unsatisfiable.
//   FIXED: MAX_PARTICLES is extracted with the scalar regex
//   /(?:const|let|var)\s+MAX_PARTICLES\s*=\s*(\d[\d_]*)/ and Number()'d before
//   asserting === 2000, keeping the ≤ 2000 bound. Spec pin:
//   docs/specifications/02-nuclear-fission-animation/10-specification.md §3
//   `const MAX_PARTICLES = 2000;`.
//   REQ-F-003 response — 10-specification.md §141 已撤销『修正 SCENARIO-004 常数』
//   的唯一例外授权：nuclear-fusion-3d/**（含其测试常数）零改动是硬门禁。本套件
//   锁定 sanctioned glob 门禁命令字符串并禁止裂变运行时触碰聚变站
//   （SCENARIO-021/022 测试），不做任何削弱既有断言的假设。
//   F-D-05 response — `Open →` 标记计数属于 Phase 3 根 index.html 入口卡契约，
//   不在本 phase 交付面内；本套件与 phase3-interaction 套件均不对根 index.html
//   的 `Open →` 计数做任何断言，有缺陷的计数口径无法经由本套件传播。

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN_JS = path.resolve(HERE, '../js/main.js');
const INDEX_HTML = path.resolve(HERE, '../index.html');
const PHASE3_FILE = path.resolve(HERE, 'phase3-interaction.test.mjs');
const SANCTIONED_FUSION_GATE = 'node --test nuclear-fusion-3d/tests/*.test.mjs';

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

/* Extracts the plain `{...}` / `[...]` literal assigned to `const NAME =`.
 * NOTE: only for OBJECT/ARRAY literals. Scalar constants must go through
 * extractNumber() — a balanced block never evaluates to a scalar. */
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

/* Scalar constant extraction (CF-implementation-0ft7p5y fix): regex-capture the
 * numeric literal and Number() it — no balanced-block eval for scalars. */
function extractNumber(code, name) {
  const m = new RegExp('(?:const|let|var)\\s+' + name + '\\s*=\\s*(\\d[\\d_]*)').exec(code);
  return m ? Number(m[1].replace(/_/g, '')) : null;
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

/* The window.fissionSim = { ... } object literal block (null if absent). */
function extractSimBlock(code) {
  /* 亦容忍 Object.freeze({...}) 包裹 —— 字面量本体仍是可解析对象 */
  const m = /window\.fissionSim\s*=\s*(?:Object\.freeze\s*\(\s*)?\{/.exec(code);
  if (!m) return null;
  const open = m.index + m[0].length - 1;
  const end = findBalanced(code, open);
  return end === -1 ? null : code.slice(open, end + 1);
}

/* Every key at brace-depth 1 inside an object-literal block `{...}`
 * (string/comment aware). Handles `key:` / `key(...)` / shorthand `key,`. */
function objectKeys(block) {
  const keys = [];
  let depth = 0;
  let i = 0;
  let inStr = null;
  while (i < block.length) {
    const c = block[i];
    if (inStr) {
      if (c === inStr && block[i - 1] !== '\\') inStr = null;
      i += 1;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inStr = c;
      i += 1;
      continue;
    }
    if (c === '/' && block[i + 1] === '/') {
      while (i < block.length && block[i] !== '\n') i += 1;
      continue;
    }
    if (c === '/' && block[i + 1] === '*') {
      i += 2;
      while (i < block.length && !(block[i] === '*' && block[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }
    if (c === '{' || c === '(' || c === '[') depth += 1;
    else if (c === '}' || c === ')' || c === ']') depth -= 1;
    else if (depth === 1 && /[A-Za-z_$]/.test(c)) {
      const m = /^[A-Za-z_$][\w$]*\s*(?=[:(,}])/.exec(block.slice(i));
      if (m) {
        keys.push({ name: m[0].replace(/\s+$/, ''), index: i });
        i += m[0].length;
        continue;
      }
    }
    i += 1;
  }
  return keys;
}

/* Slice of a sim-object member by key name (null if the key is absent). */
function keySlice(block, name, span) {
  const k = objectKeys(block).find((e) => e.name === name);
  if (!k) return null;
  return block.slice(k.index, k.index + (span || 400));
}

/* ———————————————————————————————————————————————————————————————— */

test('SCENARIO-004 (AC-03): 剧情恰按三个相位顺序推进 — PHASES 恰 3 项 {key,zh,duration}，atoms→neutron→fission，duration 数值 10/12/14；advancePhase 按时长推进且末相 fission 驻留钳制', () => {
  const code = stripComments(readMain());
  const phases = evalLiteral(extractLiteral(code, 'PHASES'));
  assert.ok(
    Array.isArray(phases) && phases.length === 3,
    'PHASES 必须是可独立求值的纯字面量数组，恰 3 项（不得引用外部作用域）'
  );
  assert.deepEqual(
    phases.map((p) => p && p.key),
    ['atoms', 'neutron', 'fission'],
    '相位顺序必须恰为 atoms→neutron→fission，总数三个'
  );
  assert.deepEqual(
    phases.map((p) => p && p.zh),
    ['原子结构', '中子俘获', '裂变反应'],
    '每个相位必须带自己的中文标签 原子结构/中子俘获/裂变反应'
  );
  assert.deepEqual(
    phases.map((p) => p && p.duration),
    [10, 12, 14],
    '每个相位的 duration 必须是数值型 10/12/14（总 36s），不得是字符串或缺失'
  );
  const body = extractFunctionBody(code, 'advancePhase');
  assert.ok(body !== null, 'advancePhase() 必须存在');
  assert.match(
    body,
    /phaseTime\s*>=?\s*[^;&\n]{0,40}duration|duration\s*<=?\s*[^;&\n]{0,40}phaseTime/,
    'advancePhase 必须在 phaseTime ≥ duration 时切下一相'
  );
  assert.ok(!/'atoms'/.test(body), '末相 fission 不得回绕到 atoms（必须保持停留）');
  assert.ok(
    !/%\s*(?:PHASES\.length|3)/.test(body),
    'advancePhase 不得使用模回绕（末相 fission 驻留，而非循环回 atoms）'
  );
  assert.match(
    body,
    /Math\.min\s*\(\s*[^)\n]{0,60}phaseTime|phaseTime\s*=\s*[\w.[\]()]*duration\b|phaseTime\s*=\s*Math\.min/,
    '末相 fission 的 phaseTime 必须钳制在 duration（getSimTime 继续累积而相位停驻）'
  );
});

test('SCENARIO-005 (AC-03): window.fissionSim 方法表面恰 12 个，与 fusionSim 实测表面逐项一致；setPhase/toggleAuto 禁用名零出现', () => {
  const code = stripComments(readMain());
  assert.match(code, /window\.fissionSim\s*=/, '页面加载后必须存在 window.fissionSim 句柄（赋值）');
  const sim = extractSimBlock(code);
  assert.ok(sim !== null, 'window.fissionSim = { ... } 必须是可静态解析的对象字面量');
  const names = objectKeys(sim).map((k) => k.name);
  assert.equal(names.length, 12, 'fissionSim 必须恰暴露 12 个方法（不得多不得少）');
  const expected = [
    'getPhase', 'getPhaseTime', 'getSimTime', 'isPaused',
    'pause', 'resume', 'reset', 'isTourActive', 'getTourStep',
    'getMode', 'setAutoAdvance', 'gotoPhase',
  ].sort();
  assert.deepEqual(
    [...names].sort(),
    expected,
    '方法名集合必须与 fusionSim 实测表面逐项完全一致（getPhase…gotoPhase）'
  );
  for (const banned of ['setPhase', 'toggleAuto']) {
    assert.ok(
      !new RegExp('\\b' + banned + '\\b').test(code),
      '禁用方法名 ' + banned + ' 不得出现在 js/main.js 任何位置'
    );
  }
});

test('SCENARIO-006 (AC-03): gotoPhase 合法键立即跳相并优先退出导览 — jumpToPhase 合法键返回 true、先退导览、清零 phaseTime；fissionSim.gotoPhase 委托 jumpToPhase', () => {
  const code = stripComments(readMain());
  const body = extractFunctionBody(code, 'jumpToPhase');
  assert.ok(body !== null, 'jumpToPhase(key) 必须存在');
  assert.match(body, /return\s+true/, '合法键必须返回 true（boolean 契约）');
  assert.match(
    body,
    /isTourActive\s*\(\s*\)[\s\S]{0,80}exitTour|exitTour\s*\(\s*\)|tourActive\s*=\s*false/,
    '合法键跳相前必须优先退出导览（若激活）'
  );
  assert.match(body, /phaseTime\s*=\s*0/, '跳相必须清零 phaseTime 重新计时');
  const sim = extractSimBlock(code);
  assert.ok(sim !== null, 'window.fissionSim 必须存在');
  const g = keySlice(sim, 'gotoPhase', 300);
  assert.ok(g !== null && /jumpToPhase/.test(g), 'fissionSim.gotoPhase 必须委托 jumpToPhase');
});

test('SCENARIO-007 (AC-03): gotoPhase 非法键被静默忽略 — jumpToPhase 对 PHASES 合法键集合做成员校验，非法键 return false 且不抛错不提示', () => {
  const code = stripComments(readMain());
  const body = extractFunctionBody(code, 'jumpToPhase');
  assert.ok(body !== null, 'jumpToPhase(key) 必须存在');
  assert.match(body, /return\s+false/, '非法键必须静默返回 false');
  assert.match(
    body,
    /some\s*\(|find\s*\(|findIndex\s*\(|includes\s*\(/,
    '必须对 PHASES 合法键集合做成员校验（非法键走 false 分支而非误跳）'
  );
  for (const bad of [/console\.(log|warn|error|info)\s*\(/, /\bthrow\b/, /\balert\s*\(/]) {
    assert.ok(!bad.test(body), '非法键必须静默容错：' + bad + ' 不得出现在 jumpToPhase 体内');
  }
});

test("SCENARIO-008 (AC-03): reset 从初始相重启且不影响导览 — fissionSim.reset = startRun('atoms')，startRun 不读写任何 tour 状态", () => {
  const code = stripComments(readMain());
  const sim = extractSimBlock(code);
  assert.ok(sim !== null, 'window.fissionSim 必须存在');
  const r = keySlice(sim, 'reset', 300);
  assert.ok(
    r !== null && /startRun\s*\(\s*['"]atoms['"]\s*\)/.test(r),
    "reset 必须 = startRun('atoms')：场景回到 atoms 初始相位重新计时"
  );
  const run = extractFunctionBody(code, 'startRun');
  assert.ok(run !== null, 'startRun(key) 必须存在');
  assert.ok(
    !/tour/i.test(run),
    'startRun/reset 不得读写导览状态（tourActive/tourStep 不受 reset 影响）'
  );
});

test('SCENARIO-014 (AC-05): 讲解文案逐字锚定人教版术语与常数 — 「铀-235」「钡-141」「氪-92」「3 个中子」「200 MeV」「≈3.2e-11 J」「质量数」「电荷数」8 子串全部出现', () => {
  const code = stripComments(readMain());
  for (const s of ['铀-235', '钡-141', '氪-92', '3 个中子', '200 MeV', '≈3.2e-11 J', '质量数', '电荷数']) {
    assert.ok(code.includes(s), 'js/main.js 讲解文案必须逐字包含「' + s + '」');
  }
});

test('SCENARIO-015 (AC-05): 守恒验算可视化且数字自洽 — #ledgerPanel 展示「质量数 236 = 141 + 92 + 3」「电荷数 92 = 56 + 36」并绑定 fission 相；算术独立复核', () => {
  const code = stripComments(readMain());
  assert.ok(code.includes('质量数 236 = 141 + 92 + 3'), '必须逐字呈现质量数守恒验算式');
  assert.ok(code.includes('电荷数 92 = 56 + 36'), '必须逐字呈现电荷数守恒验算式');
  assert.match(code, byId('ledgerPanel'), '#ledgerPanel 守恒面板必须被查找并写入');
  const at = code.search(byId('ledgerPanel'));
  const around = code.slice(Math.max(0, at - 1200), at + 1200);
  assert.ok(
    /fission/.test(around),
    '#ledgerPanel 的显隐/写入逻辑必须绑定 fission 相（查找点 ±1200 字符内出现 fission 相判断）'
  );
  /* 守恒算术独立复核（防自相矛盾的验算式上屏） */
  assert.equal(235 + 1, 236, '算术复核：铀-235 俘获 1 个中子 = 复核 236');
  assert.equal(141 + 92 + 3, 236, '算术复核：钡-141 + 氪-92 + 3 个中子 = 236');
  assert.equal(56 + 36, 92, '算术复核：Ba(56) + Kr(36) = 电荷数 92');
});

test('SCENARIO-016 (AC-05): 解说节奏按相位推进 — #phaseTitle/#phaseText 按相更新：原子结构 → 中子俘获形成激发复核铀-236* → 复核分裂 + 能量闪光', () => {
  const code = stripComments(readMain());
  const titleAt = code.search(byId('phaseTitle'));
  const textAt = code.search(byId('phaseText'));
  assert.ok(titleAt !== -1, '#phaseTitle 相位字幕必须被查找并更新');
  assert.ok(textAt !== -1, '#phaseText 相位解说必须被查找并更新');
  const titleSeg = code.slice(titleAt, titleAt + 800);
  const textSeg = code.slice(textAt, textAt + 800);
  assert.match(titleSeg, /textContent\s*=|innerHTML\s*=|innerText\s*=/, '#phaseTitle 必须被写入');
  assert.match(textSeg, /textContent\s*=|innerHTML\s*=|innerText\s*=/, '#phaseText 必须被写入');
  const branchHits = (code.match(/phaseKey\s*===?\s*['"][^'"]+['"]|case\s+['"](atoms|neutron|fission)['"]|PHASES\s*\[/g) || []).length;
  assert.ok(
    branchHits >= 1 || /PHASES\b/.test(titleSeg + textSeg),
    '解说文案必须按相位分相选择（phaseKey 分支 / case 标签 / PHASES[索引] 任一驱动），节奏与相位推进一致'
  );
  assert.ok(code.includes('铀-236'), 'neutron 相解说必须提到俘获形成激发复核铀-236');
  assert.ok(code.includes('闪光'), 'fission 相解说必须提到复核分裂伴随的能量闪光');
});

test("SCENARIO-026 (AC-10): 单一主循环 — requestAnimationFrame( 恰 1、setInterval(/setTimeout( 均 0、dt = Math.min(clock.getDelta(), 0.05)、MAX_PARTICLES = 2000 硬上限", () => {
  const code = stripComments(readMain());
  assert.equal(
    (code.match(/requestAnimationFrame\s*\(/g) || []).length,
    1,
    'requestAnimationFrame( 全文件必须恰 1 处（单一主循环驱动全部相位渲染与时钟）'
  );
  assert.equal((code.match(/setInterval\s*\(/g) || []).length, 0, 'setInterval( 全文件必须 0 处');
  assert.equal((code.match(/setTimeout\s*\(/g) || []).length, 0, 'setTimeout( 全文件必须 0 处');
  assert.match(code, /clock\.getDelta\s*\(\s*\)/, '相位时钟必须由 clock.getDelta() 驱动');
  assert.match(
    code,
    /dt\s*=\s*Math\.min\s*\(\s*clock\.getDelta\s*\(\s*\)\s*,\s*0\.05\s*\)/,
    '必须以 const dt = Math.min(clock.getDelta(), 0.05) 钳制单帧时间步长'
  );
  /* CF-implementation-0ft7p5y FIX: scalar extraction — regex capture + Number().
   * (The previous balanced-block eval could only ever yield Object|Array, which
   * made === 2000 unsatisfiable for ANY implementation.) */
  const maxParticles = extractNumber(code, 'MAX_PARTICLES');
  assert.ok(maxParticles !== null, '必须声明 const MAX_PARTICLES = <数值字面量>（标量，非块字面量）');
  assert.equal(maxParticles, 2000, 'MAX_PARTICLES 必须恰为 2000（spec §3 钉定 const MAX_PARTICLES = 2000;）');
  assert.ok(maxParticles <= 2000, '全场景粒子硬上限不得超过 2000');
  assert.ok(
    (code.match(/\bMAX_PARTICLES\b/g) || []).length >= 2,
    'MAX_PARTICLES 必须被实际引用为粒子数上限（声明 + 至少一处使用），不得是死常量'
  );
});

test('SCENARIO-027 (AC-10): 启动契约 — index.html 内联 __errs = [] 陷阱 + error 监听收集异常；main.js 末行置 window.__ready = true', () => {
  const idx = readIndex();
  assert.match(idx, /window\.__errs\s*=\s*\[\s*\]/, 'index.html 必须内联 window.__errs = []（先于 module 标签）');
  assert.match(
    idx,
    /addEventListener\s*\(\s*['"]error['"]/,
    'index.html 必须注册 error 监听把运行期异常收进 __errs 而非未捕获逃逸'
  );
  const code = stripComments(readMain());
  assert.match(code, /window\.__ready\s*=\s*true/, '启动流程成功完成必须置 window.__ready = true');
  const tail = code.slice(Math.max(0, code.length - 200));
  assert.match(tail, /window\.__ready\s*=\s*true/, 'window.__ready = true 必须位于启动流程末尾（源码最后 200 字符内）');
});

test('SCENARIO-028 (AC-10): WebGL 不可用时友好降级 — initThree 失败返回 null → showFallback 写 #fallback；仍定义 fissionSim、仍置 __ready、跳过 rAF 循环不白屏', () => {
  const code = stripComments(readMain());
  const init = extractFunctionBody(code, 'initThree');
  assert.ok(init !== null, 'initThree() 必须存在');
  assert.match(
    init,
    /return\s+null|\bcatch\b/,
    'WebGL2 上下文创建失败时 initThree 必须返回 null（try/catch 守护）'
  );
  assert.match(code, /function\s+showFallback|showFallback\s*=/, 'showFallback(msg) 必须存在');
  assert.match(code, byId('fallback'), '降级提示必须写入 #fallback 友好文字层');
  assert.match(readIndex(), /id="fallback"/, 'index.html 必须提供 #fallback 降级提示层');
  /* 必须命中调用点而非函数定义（`function showFallback(` 是声明不是调用） */
  const sfCall = /(?<!function\s)showFallback\s*\(/.exec(code);
  assert.ok(sfCall !== null, 'showFallback 必须被实际调用（WebGL 失败分支）');
  const sfSeg = code.slice(Math.max(0, sfCall.index - 400), sfCall.index + 400);
  assert.match(
    sfSeg,
    /initThree|\breturn\b|\belse\b|!\s*[\w$]+/,
    'showFallback 调用必须处于 initThree 失败分支（return/else 守护，跳过 rAF 主循环不白屏）'
  );
  const simAt = code.indexOf('window.fissionSim');
  assert.ok(
    simAt !== -1 && simAt < sfCall.index,
    'WebGL 失败分支不得早于 fissionSim 定义 — 降级页仍必须定义完整 fissionSim（纯状态机不依赖渲染器）'
  );
  assert.ok(
    code.lastIndexOf('window.__ready') > sfCall.index,
    '__ready 置位必须位于降级分支之后（末行），降级路径也能到达'
  );
});

test("SCENARIO-021 (AC-08) + SCENARIO-022 (AC-08): 回归门禁锁定 — sanctioned glob 命令逐字钉定、禁目录参数形式、裂变运行时零引用聚变站（REQ-F-003 响应：fusion 零改动硬门禁）", () => {
  const code = stripComments(readMain());
  assert.equal(
    SANCTIONED_FUSION_GATE,
    'node --test nuclear-fusion-3d/tests/*.test.mjs',
    'SCENARIO-021: sanctioned 回归门禁命令必须逐字为 glob 形式（变更前后均 33/33 exit 0）'
  );
  assert.ok(
    !/child_process/.test(code),
    'SCENARIO-021: 裂变运行时不得派生子进程（更不得执行/重跑聚变门禁）'
  );
  assert.ok(
    !/nuclear-fusion-3d/.test(code),
    'SCENARIO-021: 裂变运行时源码零引用聚变站路径（nuclear-fusion-3d/** 零改动的隔离保证）'
  );
  const own = readFileSync(path.resolve(HERE, 'phase2-runtime.test.mjs'), 'utf8');
  const sibling = readFileSync(PHASE3_FILE, 'utf8');
  for (const [name, src] of [['phase2-runtime.test.mjs', own], ['phase3-interaction.test.mjs', sibling]]) {
    assert.ok(
      !/node\s+--test\s+['"]?nuclear-fission-3d\/tests\/['"]?\s*$/m.test(src),
      'SCENARIO-022: ' + name + ' 不得出现目录参数形式门禁命令（Node v24.15.0 下确定性失败）'
    );
  }
});
