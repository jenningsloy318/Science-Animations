// nuclear-fission-3d/tests/phase1-shell.test.mjs — Phase 1 静态外壳与测试脚手架（shell）
//
// 运行方式（AC-08/SCENARIO-021/022 唯一 sanctioned 门禁形式 = glob 形式，禁目录参数形式）：
//   node --test 加 glob：nuclear-fusion-3d/tests 下 *.test.mjs（SANCTIONED_GATE_CMD 常量锁定）
//   node --test 加 glob：nuclear-fission-3d/tests 下 *.test.mjs
// 注意：本文件任何位置（含注释）刻意不出现「斜杠紧跟星号」的字符序列，以免
// 注释剥离器把后续代码/标签误当注释吞掉；glob 串在代码里用 join("/") 构造。
//
// TEST LEVEL = TASK LEVEL：每条断言绑定 Phase-1 任务行声明的可观测物 ——
//   T1 index.html：__errs 陷阱（先于 module 标签）、async es-module-shims@1.10.0、
//      恰 1 个 importmap（three@0.160.0 两条同源 jsdelivr 地址）、module 引 ./js/main.js、
//      #homeBtn(href="../index.html")/#stage/#tools(#btnTour 🎬 引导浏览、#autoBtn、
//      #prevBtn ⏮ 上一步、#nextBtn ⏭ 下一步)/#bottomBar(#toggleBtn ⏸ 暂停、#resetBtn 🔄 重置、
//      #camBtn 🎥 重置视角)/#tourPanel(#tourCloseBtn + 4 个 data-step)/#phaseTitle/#phaseText/
//      #ledgerPanel/#fallback；全部控件原生 button、title 或 aria-label、min 44×44px。
//   T2 css/style.css：暗空主题（body #04060d、panel rgba(15,23,42,.82)、ctrl #1e293b）、
//      primaryMain #f59e0b 琥珀主色、禁 #b45309 于暗面文字、8px 栅格、断点 640/768/1024、
//      全部控件 :focus-visible 轮廓、控件 ≥44px（不得照抄 fusion 42/38）。
//   T3 本套件：①文件清单与无构建指纹 ②chrome ID 全集合与 href ③importmap 量化钉定
//      ④生产源码六聚变字面量扫描器（walkProduction，排除 tests/）。
//
// Scenario coverage matrix（标签逐字出现在测试标题=matched code）：
//   SCENARIO-001 -> "SCENARIO-001 (AC-01): 纯静态目录文件清单与零构建指纹 …"
//   SCENARIO-002 -> "SCENARIO-002 (AC-02): 外壳 chrome ID 全集合与 href …"
//   SCENARIO-003 -> "SCENARIO-003 (AC-02): importmap 量化钉定 …"
//   SCENARIO-013 -> "SCENARIO-013 (AC-04): 控件原生 button 与 label 合同 …"
//                 与 "SCENARIO-013 (AC-04): css 硬约束 …"
//   SCENARIO-017 -> "SCENARIO-017 (AC-06): 六聚变字面量零出现 …"
//   SCENARIO-021 -> "SCENARIO-021 (AC-08): fusion 基线 33/33 …"
//   SCENARIO-022 -> "SCENARIO-022 (AC-08): glob 形式锁定、目录参数形式禁用 …"
//   SCENARIO-023 -> "SCENARIO-023 (AC-08): fusion 既有断言常数零改动 …"
//
// Review responses（对 convergence-ledger 未决项的显式回应）：
//   CF-implementation-0ft7p5y —— 本文件即 Phase-1 的 TDD 目标套件重写版：完整覆盖
//   phase-1 基线 scenarioRefs（SCENARIO-001/002/003/013/021/022）并绑定 T1/T2/T3
//   任务行的全部可观测物；旧版缺失 013/021/022 三条基线场景，本版补齐。
//   REQ-F-003 —— fusion 套件 SCENARIO-004 统计的是 .card--X::before 强调规则数
//   （现为 7）而非卡片数；AC-09 禁止为 card--fission 新增 ::before 规则，故计数
//   保持 7，nuclear-fusion-3d 目录零改动、7→N 常数上调既无必要亦未被授权（会令
//   fusion 门禁永久红）。SCENARIO-023 在此钉定该常数不被削弱或上调。
//   F-D-05 —— 根 index.html 的 Open → 标记现存量 7；修订后的设计契约采用增量
//   断言（纯追加后恰 8，永不断言全文件恰 1）。该根卡审计属 Phase-3 的
//   phase4-gate.test.mjs 职责，本套件不越相代管。
//   CF-spec-004q4so —— 属 spec 上游（Phase-3 phase4-gate 门禁字面量须落在代码
//   而非注释）。本套件示范了正确做法：六个字面量在下方
//   FUSION_CONTAMINATION_LITERALS 代码数组中逐字声明。
//
// 零 npm 依赖：本套件仅 import node:test / node:assert / node:fs / node:path /
// node:url / node:child_process（AC-01）。

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const pageDir = resolve(here, '..');      // nuclear-fission-3d/
const siteRoot = resolve(pageDir, '..');  // 仓库工作根

// ── 辅助（复用 fusion 套件同名 helpers 的语义） ──────────────────────────────
function mustRead(p, label) {
  assert.ok(existsSync(p), `required file missing: ${label} (${p})`);
  return readFileSync(p, 'utf8');
}
function walkProduction(dir, out = []) {
  assert.ok(existsSync(dir), `directory must exist: ${dir}`);
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'tests' || entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('.')) continue;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walkProduction(p, out);
    else if (/\.(html|css|js|mjs|cjs|json|txt|svg)$/i.test(entry.name)) out.push(p);
  }
  return out;
}
const count = (hay, needle) => hay.split(needle).length - 1;
const countRe = (hay, re) => (hay.match(re) ?? []).length;
const stripComments = (src) =>
  src.replace(/(^|[^:])\/\/[^\n]*/g, '$1').replace(/\/\*[\s\S]*?\*\//g, '');

// ── 契约常量（全部落在代码里，门禁按代码匹配而非注释） ────────────────────────
// SCENARIO-017/AC-06 六个聚变专属字面量（SCENARIO-017 的受检清单逐字声明于此）：
const FUSION_CONTAMINATION_LITERALS = ['0.018884', '0.0189 u', '17.6 MeV', '2.82e-12', '氘', '氚'];
// SCENARIO-022/AC-08 唯一 sanctioned 的回归门禁命令（glob 形式；目录参数形式被禁）。
// glob 段用 join 构造，避免源码里出现会被注释剥离器误判的字符序列：
const SANCTIONED_GATE_CMD = `node --test nuclear-fusion-3d/${['tests', '*.test.mjs'].join('/')}`;

const pageHtml = mustRead(join(pageDir, 'index.html'), 'nuclear-fission-3d/index.html');
const pageCss = mustRead(join(pageDir, 'css', 'style.css'), 'nuclear-fission-3d/css/style.css');

const CONTROL_IDS = ['btnTour', 'autoBtn', 'prevBtn', 'nextBtn', 'toggleBtn', 'resetBtn', 'camBtn', 'tourCloseBtn'];
const CHROME_IDS = [
  'homeBtn', 'stage', 'tools', 'btnTour', 'autoBtn', 'prevBtn', 'nextBtn',
  'bottomBar', 'toggleBtn', 'resetBtn', 'camBtn', 'tourPanel', 'tourCloseBtn',
  'phaseTitle', 'phaseText', 'ledgerPanel', 'fallback',
];

// ①文件清单与无构建指纹 + AC-01 零 npm 依赖
test('SCENARIO-001 (AC-01): 纯静态目录文件清单与零构建指纹 — index.html + css/style.css + js/main.js + tests/ ≥3 套件，无 package.json/node_modules，路径全相对，测试仅依赖 node: 内建', () => {
  for (const rel of ['index.html', 'css/style.css', 'js/main.js']) {
    assert.ok(existsSync(join(pageDir, rel)), `missing required file: ${rel}`);
  }
  const suites = readdirSync(join(pageDir, 'tests')).filter((f) => /\.test\.mjs$/.test(f));
  assert.ok(suites.length >= 3, `AC-01: tests/ 下须 ≥3 个 *.test.mjs 套件，实得 ${suites.length}: ${suites.join(', ')}`);

  assert.ok(!existsSync(join(pageDir, 'package.json')), 'AC-01: 禁止 npm manifest（package.json）');
  assert.ok(!existsSync(join(pageDir, 'node_modules')), 'AC-01: 禁止 node_modules');
  const prodFiles = walkProduction(pageDir).map((f) => f.slice(pageDir.length + 1));
  assert.ok(
    prodFiles.every((f) => f !== 'package.json' && !f.startsWith(`node_modules`)),
    'AC-01: 生产源码树内不得出现 package.json / node_modules',
  );

  assert.match(pageHtml, /<html\s+lang="zh-CN">/, 'lang="zh-CN" required');
  assert.match(pageHtml, /<meta\s+name="viewport"/, 'viewport meta required');
  // 相对路径合同：样式表、模块入口、返回首页链接均须相对引用
  assert.match(pageHtml, /<link\s+rel="stylesheet"\s+href="(\.\/)?css\/style\.css">/, 'stylesheet 须相对引用 css/style.css');
  assert.match(pageHtml, /<script\s+type="module"\s+src="\.\/js\/main\.js">/, 'module 入口须相对引用 ./js/main.js');
  assert.match(pageHtml, /<a\s+id="homeBtn"\s+href="\.\.\/index\.html"/, '#homeBtn 须相对引用 ../index.html');

  // 无构建指纹
  for (const [name, src] of [['index.html', pageHtml], ['css/style.css', pageCss]]) {
    assert.doesNotMatch(src, /webpack|vite|esbuild|parcel|sourceMappingURL/i, `${name} 不得含构建工具指纹`);
  }

  // 测试零 npm 依赖：所有 import 说明符必须是 node: 内建
  const importRe = /import\s+(?:[^'"]*?from\s+)?['"]([^'"]+)['"]/g;
  for (const suite of suites) {
    const src = mustRead(join(pageDir, 'tests', suite), `tests/${suite}`);
    const specs = [...src.matchAll(importRe)].map((m) => m[1]);
    assert.ok(specs.length >= 2, `tests/${suite} 应有 import 语句`);
    for (const s of specs) {
      assert.ok(s.startsWith('node:'), `tests/${suite} 出现非 node: 依赖 "${s}" — AC-01 要求零 npm 依赖`);
    }
    assert.doesNotMatch(src, /(^|[^\w.$])require\s*\(/, `tests/${suite} 不得使用 require 同步加载`);
    assert.doesNotMatch(src, /\bimport\s*\(/, `tests/${suite} 不得使用动态 import 调用`);
  }
});

// ②chrome ID 全集合与 href
test('SCENARIO-002 (AC-02): 外壳 chrome ID 全集合与 href 逐项镜像聚变兄弟页 — 17 个 ID 各恰 1 次、#homeBtn(href="../index.html")、#tourPanel 含 #tourCloseBtn 与 4 个 data-step、底栏 ⏸ 暂停/🔄 重置/🎥 重置视角', () => {
  for (const id of CHROME_IDS) {
    assert.equal(count(pageHtml, `id="${id}"`), 1, `chrome id="${id}" 必须恰出现 1 次`);
  }
  assert.match(pageHtml, /<a\s+id="homeBtn"\s+href="\.\.\/index\.html"/, '返回首页入口 #homeBtn → ../index.html');
  assert.match(pageHtml, /<div id="stage"><\/div>|<div id="stage">/, '三维舞台区 #stage');
  assert.match(pageHtml, /<nav id="tools">/, '工具区 #tools');
  assert.match(pageHtml, /id="btnTour"[^>]*>\s*🎬/, '#btnTour 须带 🎬 图标');
  assert.match(pageHtml, /<div id="bottomBar"[^>]*>/, '底部控制栏 #bottomBar');
  assert.match(pageHtml, /id="toggleBtn"[^>]*>\s*⏸\s*暂停/, '底栏 ⏸ 暂停');
  assert.match(pageHtml, /id="resetBtn"[^>]*>\s*🔄\s*重置/, '底栏 🔄 重置');
  assert.match(pageHtml, /id="camBtn"[^>]*>\s*🎥\s*重置视角/, '底栏 🎥 重置视角');
  assert.match(pageHtml, /<div id="tourPanel"[^>]*>/, '导览面板覆盖层 #tourPanel');
  assert.equal(countRe(pageHtml, /data-step="\d+"/g), 4, '#tourPanel 须恰有 4 个 data-step 步骤项');
  assert.match(pageHtml, /<button[^>]*id="tourCloseBtn"[^>]*>/, '#tourCloseBtn 须为原生 button');
});

// ③importmap 量化钉定
test('SCENARIO-003 (AC-02): importmap 量化钉定 — importmap 恰 1、three@0.160.0 恰 2 次且同源 jsdelivr、es-module-shims@1.10.0 async ≥1、__errs 陷阱先于 module 标签、module 入口 ./js/main.js', () => {
  assert.equal(countRe(pageHtml, /<script\s+type="importmap"/g), 1, 'script type="importmap" 恰好出现 1 次');

  const pins = pageHtml.match(/https:\/\/cdn\.jsdelivr\.net\/npm\/three@0\.160\.0[^"'\s<>]*/g) ?? [];
  assert.equal(count(pageHtml, 'three@0.160.0'), 2, '字符串 three@0.160.0 恰好出现 2 次');
  assert.equal(pins.length, 2, 'three@0.160.0 的 jsdelivr 地址恰 2 条');
  const base = 'https://cdn.jsdelivr.net/npm/three@0.160.0/';
  for (const p of pins) {
    assert.ok(p.startsWith(base), `两条地址须同源 jsdelivr base ${base}（实得 ${p}）`);
  }
  assert.notEqual(pins[0], pins[1], '两条映射分别指向 module 构建与 addons 目录');
  assert.match(pins.find((p) => p.endsWith('/build/three.module.js')) ?? '', /\/build\/three\.module\.js$/, '须含 three.module.js 模块构建映射');
  assert.ok(pins.some((p) => p.includes('/examples/jsm/')), '须含 three/addons 的 examples/jsm 映射');

  assert.ok(count(pageHtml, 'es-module-shims@1.10.0') >= 1, 'es-module-shims@1.10.0 加载器至少出现 1 次');
  assert.match(pageHtml, /<script\s+async\s+src="https:\/\/cdn\.jsdelivr\.net\/npm\/es-module-shims@1\.10\.0\//, '加载器须带 async 属性');

  assert.ok(pageHtml.includes('window.__errs = []'), 'head 须内联 window.__errs = [] 陷阱');
  const errsAt = pageHtml.indexOf('__errs');
  const moduleAt = pageHtml.indexOf('<script type="module"');
  assert.ok(errsAt > -1 && moduleAt > -1 && errsAt < moduleAt, '__errs 陷阱必须先于 module 标签');

  assert.ok(!/unpkg\.com/i.test(pageHtml), 'unpkg CDN 禁用');
  assert.ok(!/three\.min\.js/i.test(pageHtml), 'UMD 构建 three.min.js 禁用');
});

// T1 控件合同：原生 button + title/aria-label + 图标与文案
test('SCENARIO-013 (AC-04): 控件原生 button 与 label 合同 — 8 个控件均为原生 <button> 且带 title 或 aria-label；#btnTour 🎬 引导浏览、#prevBtn ⏮ 上一步、#nextBtn ⏭ 下一步', () => {
  for (const id of CONTROL_IDS) {
    assert.match(pageHtml, new RegExp(`<button[^>]*id="${id}"`), `控件 #${id} 须为原生 <button>`);
    const tag = pageHtml.match(new RegExp(`<button[^>]*id="${id}"[^>]*>`))?.[0] ?? '';
    assert.match(tag, /title="[^"]+"|aria-label="[^"]+"/, `控件 #${id} 须带 title 或 aria-label`);
  }
  assert.match(pageHtml, /id="btnTour"[^>]*title="[^"]*引导浏览[^"]*"/, '#btnTour title 须含「引导浏览」');
  assert.match(pageHtml, /<button[^>]*id="prevBtn"[^>]*>\s*⏮\s*上一步\s*</, '#prevBtn 文案须为「⏮ 上一步」（任务行 T1 钉定）');
  assert.match(pageHtml, /<button[^>]*id="nextBtn"[^>]*>\s*⏭\s*下一步\s*</, '#nextBtn 文案须为「⏭ 下一步」（任务行 T1 钉定）');
  assert.match(pageHtml, /id="autoBtn"[^>]*aria-pressed=/, '#autoBtn 须携带 aria-pressed 供换幕档位同步');
});

// T2 css 硬约束：暗空主题 + 琥珀主色 + 对比度 + 焦点态 + 尺寸 + 断点
test('SCENARIO-013 (AC-04): css 硬约束 — 全部控件 :focus-visible 轮廓、min 44×44px（禁照抄 fusion 42/38）、#f59e0b 琥珀主色、断点 640/768/1024、body #04060d、panel rgba(15,23,42,.82)、ctrl #1e293b、禁 #b45309、8px 栅格', () => {
  assert.match(pageCss, /:focus-visible[^{]*\{[^}]*outline\s*:/, '控件须有清晰的 :focus-visible 可见焦点轮廓（outline）');
  assert.match(pageCss, /min-width:\s*44px/, '控件 min-width ≥44px');
  assert.match(pageCss, /min-height:\s*44px/, '控件 min-height ≥44px');
  assert.doesNotMatch(pageCss, /min-(width|height):\s*(38|40|42)px/, '不得照抄 fusion 的 42/38 控件尺寸');

  assert.match(pageCss, /#f59e0b/i, 'primaryMain #f59e0b 琥珀主色必须存在（任务行 T2 硬约束）');
  assert.match(pageCss, /@media[^{]*640px/, '断点 640px 必须存在');
  assert.match(pageCss, /@media[^{]*768px/, '断点 768px 必须存在');
  assert.match(pageCss, /@media[^{]*1024px/, '断点 1024px 必须存在');

  assert.match(pageCss, /background:\s*#04060d/, 'body 暗空底色 #04060d');
  assert.match(pageCss, /rgba\(\s*15\s*,\s*23\s*,\s*42\s*,\s*0?\.82\s*\)/, 'panel 色 rgba(15,23,42,.82)');
  assert.match(pageCss, /#1e293b|rgba\(\s*30\s*,\s*41\s*,\s*59/, 'ctrl 色 #1e293b');
  assert.match(pageCss, /gap:\s*8px/, '8px 栅格间距');

  assert.doesNotMatch(pageCss, /#b45309/i, '禁 color:#b45309 于暗面文字（对比度不足）');
  const bodyBlock = pageCss.match(/(^|\n)body\s*\{([^}]*)\}/)?.[2] ?? '';
  assert.doesNotMatch(
    bodyBlock,
    /color:\s*#(ef4444|22c55e|86efac|f87171|dc2626|16a34a)/i,
    'body 正文色不得直接使用状态色（error/success 仅大字号或 UI，正文状态用 #ef4444/#22c55e）',
  );
});

// ④生产源码六聚变字面量扫描器（walkProduction 排除 tests/）
test('SCENARIO-017 (AC-06): 六聚变字面量零出现 — walkProduction 全量生产源码（排除 tests/）中 0.018884、0.0189 u、17.6 MeV、2.82e-12、氘、氚 计数均为 0', () => {
  const files = walkProduction(pageDir);
  const rels = files.map((f) => f.slice(pageDir.length + 1));
  assert.ok(rels.length >= 3, `受检生产文件应 ≥3，实得 ${rels.length}: ${rels.join(', ')}`);
  assert.ok(rels.includes('index.html') && rels.includes(join('css', 'style.css')), '受检范围必须覆盖 index.html 与 css/style.css');
  assert.ok(
    rels.every((f) => !f.split(/[\\/]/).includes('tests')),
    '扫描器必须排除 tests/ 目录',
  );
  for (const banned of FUSION_CONTAMINATION_LITERALS) {
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      assert.equal(count(src, banned), 0, `聚变专属字面量 ${JSON.stringify(banned)} 不得出现在 ${f.slice(siteRoot.length + 1)}`);
    }
  }
});

test('SCENARIO-021 (AC-08): fusion 基线经 sanctioned glob 形式回归 — spawn 运行 SANCTIONED_GATE_CMD 须 exit 0 且 33/33 全绿、fail 0', () => {
  // 剥离运行器注入的 NODE_TEST_CONTEXT，否则被派生的 node --test 子进程会静默退出（stdout 为空）
  const childEnv = { ...process.env };
  delete childEnv.NODE_TEST_CONTEXT;
  const r = spawnSync(SANCTIONED_GATE_CMD, { cwd: siteRoot, shell: true, encoding: 'utf8', timeout: 120000, env: childEnv });
  assert.equal(r.status, 0, `fusion 回归门禁须 exit 0（信号 ${r.signal}）\nstdout:\n${r.stdout}\nstderr:\n${r.stderr}`);
  assert.match(r.stdout, /tests 33/, 'fusion 基线总数须为 33');
  assert.match(r.stdout, /pass 33/, 'fusion 基线 33/33 全部通过');
  assert.match(r.stdout, /fail 0/, 'fusion 基线零失败');
});

test('SCENARIO-022 (AC-08): glob 形式锁定、目录参数形式禁用 — SANCTIONED_GATE_CMD 以 tests 通配结尾且绝不以目录斜杠结尾；源码剥离注释后不存在目录形式命令', () => {
  assert.match(SANCTIONED_GATE_CMD, /^node --test /, '必须是 node --test 调用');
  const target = SANCTIONED_GATE_CMD.replace(/^node\s+--test\s+/, '');
  assert.match(target, /^nuclear-fusion-3d\//, '门禁目标必须是 nuclear-fusion-3d 套件');
  assert.ok(target.includes('*'), '必须采用 glob 通配形式');
  assert.match(target, /\.test\.mjs$/, 'glob 必须落在 *.test.mjs 套件上');
  assert.ok(!target.endsWith('/'), '目录参数形式（以斜杠结尾的目标）被 AC-08/SCENARIO-022 明令禁止');

  const codeOnly = stripComments(mustRead(join(here, 'phase1-shell.test.mjs'), '本测试文件自身'));
  assert.match(codeOnly, /node\s+--test/, 'sanctioned 命令须在代码中以常量锁定');
  assert.doesNotMatch(
    codeOnly,
    /node\s+--test\s+[^\s'"`]+\/\s*$/m,
    '剥离注释后的代码中不得出现目录参数形式的 node --test 命令',
  );
});

test('SCENARIO-023 (AC-08): fusion 既有断言常数零改动 — ::before 强调规则基线常数保持恰 7，禁止削弱、删除或上调（REQ-F-003 回应：7→8 既无必要亦未授权）', () => {
  const fusionShellTest = mustRead(
    join(siteRoot, 'nuclear-fusion-3d', 'tests', 'phase1-shell.test.mjs'),
    'nuclear-fusion-3d/tests/phase1-shell.test.mjs',
  );
  const constants = [...fusionShellTest.matchAll(/beforeAccents\.length,\s*(\d+)/g)].map((m) => Number(m[1]));
  assert.ok(constants.length >= 1, 'fusion 套件的 ::before 计数断言必须存在');
  for (const c of constants) {
    assert.equal(c, 7, 'fusion SCENARIO-004 的强调规则基线常数必须保持恰 7（统计的是 .card--X::before 规则而非卡片数；AC-09 禁止为 card--fission 新增 ::before，计数零增量）');
  }
});
