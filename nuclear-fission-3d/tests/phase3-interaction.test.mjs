// Phase 3 RED tests — 播放控制·可及交互·四步导览（nuclear-fission-3d 播放控制接线 + 导览 + 交互样式）
// Run: node --test nuclear-fission-3d/tests/phase3-interaction.test.mjs
//
// TEST LEVEL = TASK LEVEL. The phase-2 interaction task rows state their
// observables against js/main.js 接线代码 + index.html 控件标记 + css/style.css
// 焦点与尺寸样式: #prevBtn/#nextBtn 环绕、#toggleBtn ⏸/▶ 切换与冻结续播语义、
// #camBtn 恢复默认机位、#autoBtn 文案「自动换幕：开/关」+ aria-pressed 同步、
// 原生 <button> + :focus-visible + ≥44px、TOUR_STEPS 恰 4 条映射
// ①atoms②neutron③fission④fission、退出导览置 null/false。
// These tests bind to exactly those declared observables; files are read
// lazily INSIDE test bodies so the suite always COLLECTS and RUNS, and with
// the production files absent every test fails cleanly — the valid RED.
//
// Scenario coverage matrix (tags appear VERBATIM in test titles below):
//   SCENARIO-009 -> "SCENARIO-009 (AC-04): 上一步/下一步按相位环绕循环 …"
//   SCENARIO-010 -> "SCENARIO-010 (AC-04): 暂停冻结时间累积、恢复后从冻结点原样续播 …"
//   SCENARIO-011 -> "SCENARIO-011 (AC-04): 重置视角恢复默认机位 …"
//   SCENARIO-012 -> "SCENARIO-012 (AC-04): 自动换幕开关同步刷新文案与 aria-pressed …"
//   SCENARIO-013 -> "SCENARIO-013 (AC-04): 控件键盘可达并具备可见焦点态 …"
//   SCENARIO-018 -> "SCENARIO-018 (AC-07): 导览面板恰 4 条有序步骤且映射固定 …"
//   SCENARIO-019 -> "SCENARIO-019 (AC-07): 进入任一导览步骤即时切换至映射相位 …"
//   SCENARIO-020 -> "SCENARIO-020 (AC-07): 再次发起导览或关闭面板即退出导览 …"
//
// F-D-05 response — 本套件不对根 index.html 的 `Open →` 标记做任何计数断言；
// `Open →` 恰 1 次的缺陷口径属于 Phase 3 hub 卡片契约，不落在本交付面内。

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAIN_JS = path.resolve(HERE, '../js/main.js');
const INDEX_HTML = path.resolve(HERE, '../index.html');
const CSS_FILE = path.resolve(HERE, '../css/style.css');

const readMain = () => readFileSync(MAIN_JS, 'utf8');
const readIndex = () => {
  try {
    return readFileSync(INDEX_HTML, 'utf8');
  } catch {
    return '';
  }
};
const readCss = () => {
  try {
    return readFileSync(CSS_FILE, 'utf8');
  } catch {
    return '';
  }
};

/* Lookup wiring accepts getElementById('x') or querySelector('#x'). */
const byId = (id) =>
  new RegExp(
    "getElementById\\(\\s*['\"]" + id + "['\"]\\s*\\)|querySelector\\(\\s*['\"]#" + id + "['\"]\\s*\\)"
  );

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

function evalLiteral(literal) {
  if (literal == null) return null;
  try {
    return new Function('"use strict"; return (' + literal + ');')();
  } catch {
    return null;
  }
}

function extractSimBlock(code) {
  /* 亦容忍 Object.freeze({...}) 包裹 —— 字面量本体仍是可解析对象 */
  const m = /window\.fissionSim\s*=\s*(?:Object\.freeze\s*\(\s*)?\{/.exec(code);
  if (!m) return null;
  const open = m.index + m[0].length - 1;
  const end = findBalanced(code, open);
  return end === -1 ? null : code.slice(open, end + 1);
}

/* Every key at brace-depth 1 inside an object-literal block (string/comment aware). */
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

function keySlice(block, name, span) {
  const k = objectKeys(block).find((e) => e.name === name);
  if (!k) return null;
  return block.slice(k.index, k.index + (span || 400));
}

/* ———————————————————————————————————————————————————————————————— */

test('SCENARIO-009 (AC-04): 上一步/下一步按相位环绕循环 — next: atoms→neutron→fission→atoms，prev 反向闭环 atoms↔neutron↔fission；两键均经 jumpToPhase 切相', () => {
  const code = stripComments(readMain());
  for (const id of ['prevBtn', 'nextBtn']) {
    const m = byId(id).exec(code);
    assert.ok(m !== null, '#' + id + ' 必须被查找并接线');
    const seg = code.slice(m.index, m.index + 500);
    assert.match(seg, /jumpToPhase/, '#' + id + ' 处理器必须经 jumpToPhase 切相（环绕切换）');
  }
  /* 环绕实现口径：next 与 prev 各需一处模长回绕（% PHASES.length 或 % 3），
   * 保证 fission→next→atoms 与 atoms→prev→fission 双向闭环；边界钳制是被禁的
   * 捷径（会破坏环绕语义），必须零出现。 */
  const wraps = (code.match(/%\s*(?:PHASES\.length|3)\b/g) || []).length;
  assert.ok(wraps >= 2, 'next 与 prev 都必须以模长回绕实现环绕循环（两处 % PHASES.length）');
  assert.ok(
    !/Math\.max\s*\(\s*[\w.()]+\s*-\s*1\s*,\s*0\s*\)/.test(code),
    'prev 不得用 Math.max(i-1, 0) 钳制 —— atoms 的上一步必须环绕回 fission'
  );
  assert.ok(
    !/Math\.min\s*\(\s*[\w.()]+\s*\+\s*1\s*,\s*(?:PHASES\.length\s*-\s*1|2)\s*\)/.test(code),
    'next 不得用 Math.min(i+1, length-1) 钳制 —— fission 的下一步必须环绕回 atoms'
  );
});

test('SCENARIO-010 (AC-04): 暂停冻结时间累积并在恢复后原样续播 — getSimTime 暂停期停止增长；resume 从冻结点续算不清零；⏸ 暂停 / ▶ 继续 文案随播放状态切换', () => {
  const code = stripComments(readMain());
  assert.ok(code.includes('⏸') && code.includes('暂停'), '⏸ 暂停 文案必须存在于 js/main.js 供状态切换');
  assert.ok(code.includes('▶') && code.includes('继续'), '▶ 继续 文案必须存在于 js/main.js 供状态切换');
  assert.match(code, /paused\s*=\s*true/, 'pause 必须置 paused = true');
  assert.match(code, /paused\s*=\s*false/, 'resume 必须清 paused = false（否则画面时钟永远冻结）');
  const dtAt = code.indexOf('clock.getDelta');
  const gate = /if\s*\(\s*!\s*[\w$.]*paused\s*\)\s*\{/.exec(code);
  assert.ok(gate !== null, '主循环必须以 if (!paused) 门控时间累积 — 暂停即完全冻结');
  assert.ok(dtAt !== -1 && dtAt < gate.index, 'clock.getDelta() 必须每帧调用（位于暂停门控之外）');
  const gated = code.slice(gate.index, gate.index + 300);
  assert.match(gated, /simTime\s*\+=\s*dt/, '暂停期间 simTime 不得累积（门控块内 += dt）');
  assert.match(gated, /phaseTime\s*\+=\s*dt/, '暂停期间 phaseTime 不得累积（门控块内 += dt）');
  const sim = extractSimBlock(code);
  assert.ok(sim !== null, 'window.fissionSim 必须存在');
  const pau = keySlice(sim, 'pause', 400);
  assert.ok(pau !== null && /继续|▶/.test(pau), 'pause() 必须把 #toggleBtn 文案切到 ▶ 继续');
  const res = keySlice(sim, 'resume', 400);
  assert.ok(
    res !== null && /暂停|⏸/.test(res),
    'resume() 必须把 #toggleBtn 文案切回 ⏸ 暂停'
  );
  assert.ok(
    res !== null && !/simTime\s*=\s*0|phaseTime\s*=\s*0/.test(res),
    'resume() 不得清零 simTime/phaseTime — 必须从冻结点原样继续累加而非重新计时'
  );
  const tgl = byId('toggleBtn').exec(code);
  assert.ok(tgl !== null, '#toggleBtn 必须被接线');
  assert.match(
    code.slice(tgl.index, tgl.index + 400),
    /pause|resume|paused/,
    '#toggleBtn 点击必须调 pause/resume 切换播放状态'
  );
});

test('SCENARIO-011 (AC-04): 重置视角恢复默认机位 — #camBtn 保存初始 camera.position + controls.target，点击 copy/clone 还原', () => {
  const code = stripComments(readMain());
  const m = byId('camBtn').exec(code);
  assert.ok(m !== null, '#camBtn 必须被接线');
  const seg = code.slice(m.index, m.index + 900);
  assert.match(seg, /position/, '#camBtn 处理器必须还原 camera.position');
  assert.match(seg, /target/, '#camBtn 处理器必须还原 controls.target');
  assert.match(seg, /\.copy\s*\(|\.clone\s*\(\s*\)/, '机位还原必须以 .copy(...) / .clone() 赋值完成');
  assert.match(
    code,
    /DEFAULT_CAMERA|CAMERA_HOME|INITIAL_CAM|初始机位|\.clone\s*\(\s*\)/i,
    '初始机位必须有保存证据（DEFAULT_CAMERA_* 常量或启动时 clone() 快照）'
  );
});

test('SCENARIO-012 (AC-04): 自动换幕开关同步刷新按钮文案与 aria-pressed — #autoBtn 调 setAutoAdvance，文案「自动换幕：开/关」与档位严格同步', () => {
  const code = stripComments(readMain());
  const m = byId('autoBtn').exec(code);
  assert.ok(m !== null, '#autoBtn 必须被接线');
  const handler = code.slice(m.index, m.index + 500);
  assert.match(handler, /setAutoAdvance|autoAdvance/, '#autoBtn 点击必须切换自动/手动档');
  assert.ok(
    code.includes('自动换幕：开') && code.includes('自动换幕：关'),
    '按钮文案必须随档位在「自动换幕：开」与「自动换幕：关」之间即时切换'
  );
  const sim = extractSimBlock(code);
  assert.ok(sim !== null, 'window.fissionSim 必须存在');
  const sa = keySlice(sim, 'setAutoAdvance', 500);
  assert.ok(sa !== null, 'fissionSim.setAutoAdvance(on) 必须存在');
  assert.match(sa, /autoAdvance\s*=/, 'setAutoAdvance 必须写 state.autoAdvance');
  /* aria-pressed 出现点附近必须触及自动换幕档位（autoAdvance/自动换幕），
   * 即证明二者同步刷新而非两处孤立状态。 */
  const ariaRe = /aria-pressed/g;
  let ariaSynced = false;
  let am;
  while ((am = ariaRe.exec(code)) !== null) {
    const zone = code.slice(Math.max(0, am.index - 300), am.index + 300);
    if (/autoAdvance|自动换幕/.test(zone)) {
      ariaSynced = true;
      break;
    }
  }
  assert.ok(ariaSynced, 'aria-pressed 必须与实际档位严格同步刷新（出现点附近须触及 autoAdvance/自动换幕）');
});

test('SCENARIO-013 (AC-04): 控件键盘可达并具备可见焦点态 — 全部控制件为原生 <button>（键盘触发与指针行为一致），css 含 :focus-visible 与 ≥44px 尺寸', () => {
  const idx = readIndex();
  const css = readCss();
  const ids = ['btnTour', 'autoBtn', 'prevBtn', 'nextBtn', 'toggleBtn', 'resetBtn', 'camBtn', 'tourCloseBtn'];
  for (const id of ids) {
    assert.match(
      idx,
      new RegExp('<button\\b[^>]*\\bid="' + id + '"'),
      '#' + id + ' 必须是原生 <button> 元素（天然键盘可达）'
    );
  }
  assert.match(css, /:focus-visible/, 'css 必须为控件提供清晰的 :focus-visible 可见焦点样式');
  assert.match(css, /44px/, '控件最小尺寸必须 ≥44×44px（css 中出现 44px 尺寸声明）');
});

test('SCENARIO-018 (AC-07): 导览面板恰有 4 条有序步骤且映射固定 — TOUR_STEPS 恰 4 项 ①atoms②neutron③fission④fission（总结步停留在 fission）；#tourPanel 含 4 个 data-step 与 #tourCloseBtn', () => {
  const code = stripComments(readMain());
  const idx = readIndex();
  const steps = evalLiteral(extractLiteral(code, 'TOUR_STEPS'));
  assert.ok(
    Array.isArray(steps) && steps.length === 4,
    'TOUR_STEPS 必须是可独立求值的纯字面量数组，恰 4 项（步数 ≠ 相位数）'
  );
  assert.deepEqual(
    steps.map((s) => s && s.phaseKey),
    ['atoms', 'neutron', 'fission', 'fission'],
    '步骤映射固定：①→atoms ②→neutron ③→fission ④→fission（总结步场景停留在 fission）'
  );
  const dataSteps = (idx.match(/data-step/g) || []).length;
  assert.equal(dataSteps, 4, '#tourPanel 必须含恰 4 个带 data-step 的步骤项');
  assert.match(idx, /id="tourCloseBtn"/, '#tourCloseBtn 必须存在于导览面板');
});

test('SCENARIO-019 (AC-07): 进入任一导览步骤即时切换至映射相位 — 开启导览 tourActive=true、tourStep=0、展开 #tourPanel；第 k 步立即 jumpToPhase(TOUR_STEPS[k].phaseKey)', () => {
  const code = stripComments(readMain());
  assert.match(code, byId('btnTour'), '#btnTour 必须被接线开关导览');
  assert.match(code, /tourActive\s*=\s*true/, '开启导览必须置 tourActive = true');
  assert.match(code, /tourStep\s*=\s*0/, '开启导览必须从第 0 步开始');
  assert.match(
    code,
    /jumpToPhase\s*\(\s*(?:TOUR_STEPS\[|[\w.]*\.phaseKey)/,
    '必须存在 jumpToPhase(<step>.phaseKey) 形式的调用'
  );
  const jumpRe = /jumpToPhase\s*\(/g;
  let coupled = false;
  let m2;
  while ((m2 = jumpRe.exec(code)) !== null) {
    if (/phaseKey/.test(code.slice(m2.index, m2.index + 120))) {
      coupled = true;
      break;
    }
  }
  assert.ok(coupled, '进入导览步骤必须立即以该步 phaseKey 调 jumpToPhase（getPhase() 即刻等于映射键，无需等待过渡）');
  const tp = byId('tourPanel').exec(code);
  assert.ok(tp !== null, '#tourPanel 必须被查找以展开/收起');
  assert.match(
    code.slice(tp.index, tp.index + 300),
    /classList|style\.display|hidden|removeAttribute|setAttribute/,
    '导览开合必须落到 #tourPanel 的可见性（展开面板）'
  );
});

test('SCENARIO-020 (AC-07): 再次发起导览或关闭面板即退出导览 — tourActive=false、tourStep=null、getTourStep()→null、isTourActive()→false', () => {
  const code = stripComments(readMain());
  assert.match(code, /tourActive\s*=\s*false/, '退出导览必须置 tourActive = false');
  assert.match(code, /tourStep\s*=\s*null/, '退出导览必须置 tourStep = null');
  const bt = byId('btnTour').exec(code);
  assert.ok(bt !== null, '#btnTour 必须被接线');
  assert.match(
    code.slice(bt.index, bt.index + 500),
    /!\s*tourActive|tourActive\s*=\s*false|closeTour|exitTour|toggle/,
    '再次点击 #btnTour 必须能退出导览（开合切换）'
  );
  const tc = byId('tourCloseBtn').exec(code);
  assert.ok(tc !== null, '#tourCloseBtn 必须被接线');
  assert.match(
    code.slice(tc.index, tc.index + 400),
    /tourActive\s*=\s*false|closeTour|exitTour/,
    '#tourCloseBtn 点击必须退出导览并收起面板'
  );
  const sim = extractSimBlock(code);
  assert.ok(sim !== null, 'window.fissionSim 必须存在');
  const gt = keySlice(sim, 'getTourStep', 250);
  assert.ok(gt !== null && /null/.test(gt), 'getTourStep() 未激活导览时必须返回 null');
  const ia = keySlice(sim, 'isTourActive', 200);
  assert.ok(ia !== null && /tourActive/.test(ia), 'isTourActive() 必须回读 tourActive 状态（未激活 → false）');
});

// ───────────────────────────────────────────────────────────────────────────
// 聚变同款交互补齐（与 nuclear-fusion-3d 上线后的交互标准对齐）
//   SCENARIO-029 (AC-11) — ①②③ 幕标签直接跳幕 + 三条换幕路径高亮同步
//   SCENARIO-030 (AC-11) — 常见问题 FAQ 面板（中子/易裂变核/E=mc²/链式反应）
//   SCENARIO-031 (AC-11) — 面板与标签样式：≥44px 可点击 + 移动端重排
// ───────────────────────────────────────────────────────────────────────────

test('SCENARIO-029 (AC-11): ①②③ 幕标签与 PHASES 一一对应、点击直接跳幕并在每条换幕路径上同步高亮', () => {
  const idx = readIndex();
  const tabs = idx.match(/class="phase-tab[^"]*"[^>]*data-phase="([a-z]+)"/g) ?? [];
  assert.equal(tabs.length, 3, `恰 3 个 .phase-tab 标签，实得 ${tabs.length}`);
  for (const key of ['atoms', 'neutron', 'fission']) {
    assert.ok(idx.includes(`data-phase="${key}"`), `幕标签 data-phase="${key}" 缺失`);
  }
  const code = readMain();
  assert.match(
    code,
    /querySelectorAll\('\.phase-tab'\)[\s\S]{0,200}addEventListener\('click'[\s\S]{0,160}jumpToPhase\(btn\.dataset\.phase\)/,
    '幕标签点击必须接到 jumpToPhase（合法键跳相并优先退出导览）'
  );
  assert.match(code, /function updatePhaseTabs/, 'updatePhaseTabs 高亮同步函数必须存在');
  const callSites = (code.match(/updatePhaseTabs\(state\.phaseKey\)/g) ?? []).length;
  assert.ok(
    callSites >= 3,
    `enterPhase / jumpToPhase / advancePhase 三条换幕路径都必须刷新高亮，实得 ${callSites} 处`
  );
  assert.match(readCss(), /\.phase-tab\.active\s*\{/, '当前幕高亮样式 .phase-tab.active 必须存在');
});

test('SCENARIO-030 (AC-11): 常见问题 FAQ 面板覆盖四问 —— 中子为何无斥力 / 铀-235 易裂变 / E=mc² 能量来源 / 链式反应受控', () => {
  const idx = readIndex();
  assert.ok(idx.includes('id="faqPanel"'), '#faqPanel 面板缺失');
  for (const frag of ['中子不带电', '铀-235', '易裂变', 'E=mc²', '200 MeV', '链式反应', '控制棒']) {
    assert.ok(idx.includes(frag), `FAQ 缺少关键内容“${frag}”`);
  }
  const faq = idx.slice(idx.indexOf('id="faqPanel"'), idx.indexOf('<div id="hint">'));
  assert.equal(
    (faq.match(/<details class="qa">/g) ?? []).length,
    4,
    'FAQ 必须恰为 4 个可展开问题'
  );
});

test('SCENARIO-031 (AC-11): #faqPanel 与 .phase-tab 样式 —— ≥44px 可点击尺寸、桌面左侧面板、移动端底部重排', () => {
  const css = readCss();
  assert.match(css, /#faqPanel\s*\{/, '#faqPanel 定位样式缺失');
  assert.match(css, /\.phase-tab\s*\{[\s\S]{0,240}min-height:\s*44px/, '.phase-tab 必须 ≥44px 可点击高度');
  assert.match(
    css,
    /@media \(max-width: 768px\)\s*\{[\s\S]{0,400}#faqPanel\s*\{[\s\S]{0,200}bottom:\s*84px/,
    '移动端媒体查询需把 #faqPanel 重排到底部（bottom: 84px）'
  );
});
