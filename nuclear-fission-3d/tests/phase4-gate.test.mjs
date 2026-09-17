// nuclear-fission-3d/tests/phase4-gate.test.mjs
// Phase 3 首页入口卡与全量回归门禁（hub + gate）— RED 套件（node:test + node:assert/strict，零外部依赖）。
// 运行方式（sanctioned glob 形式，禁止目录参数形式）：
//   node --test nuclear-fission-3d/tests/*.test.mjs
//
// RED 前置条件（环境口径）：根 index.html 处于七卡基线（card--fission 计数 0）。此前某轮 GREEN
// 残留的未提交 card--fission 纯追加曾污染该前置条件并使 RED 恒绿（red-oracle 判「tests PASSED
// already」）。本套件交付时已按 f45b638「chore(env): restore root index.html to clean 7-card
// baseline」同一先例将该文件还原到 HEAD 七卡基线；GREEN 阶段在该基线上重新执行唯一授权的纯追加。
//
// reviewResponses（对收敛台账逐项回应）：
// - REQ-F-003（owner=requirements，[addressed]）：SCENARIO-004 的常数 7 统计的是根 index.html 中
//   `.card--X::before {` 强调规则条数（非卡片数）。AC-09 禁止为 card--fission 新增 ::before 规则，
//   故纯追加后计数仍为 7：nuclear-fusion-3d/** 零改动、常数零上调零削弱（「唯一例外条款」不行使）。
//   本套件以 count === 7 双重钉死（SCENARIO-023/025），并为 fusion 套件实跑 exit 0 作零改动证明。
// - F-D-05（owner=design，[addressed]）：`Open →` 先存 7 处（七张兄弟卡 span.card__arrow），
//   绝不作全文件「恰 1」断言；采用增量口径 改前 7 → 改后恰 8（纯追加 delta 恰 +1），
//   块内恰 1 仅作为新卡锚点块的作用域断言。其余六个 0→1 标记维持改后各恰 1。
// - CF-spec-004q4so：六个聚变字面量（含 '0.018884'）与两条门禁命令均为逐字连续字符串常量
//   （matched code，非注释、非 join/template 拼接碎片）；不创建任何范围外数据文件（无 gate-baseline.json）。
// - CF-requirements-1lpogn1：补齐 SCENARIO-001 覆盖 —— 纯静态目录 file:// 冒烟（静态代理）、
//   无构建步骤、零 npm 依赖、tests/ 仅依赖 node 内建模块，含对应测试标题与断言。
// - CF-implementation-0ft7p5y：phase-1/2 产物就位与兄弟套件全绿由 SCENARIO-023 实跑门禁钉住
//   （RED 阶段若未收敛则按预期失败，GREEN 阶段收敛后转绿）。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FISSION_ROOT = join(HERE, '..');
const REPO_ROOT = join(FISSION_ROOT, '..');
const HUB_HTML_PATH = join(REPO_ROOT, 'index.html');
const FISSION_HTML_PATH = join(FISSION_ROOT, 'index.html');

// ─── sanctioned 门禁命令（逐字连续字符串字面量；禁止任何 join/template 拼接碎片化）───
const FUSION_GATE_CMD = 'node --test nuclear-fusion-3d/tests/*.test.mjs';
const FISSION_GATE_CMD = 'node --test nuclear-fission-3d/tests/*.test.mjs';
// 被明令禁止的目录参数形式（仅作对照，绝不可作为门禁执行方式）
const FUSION_GATE_DIR_FORM = 'node --test nuclear-fusion-3d/tests';
const FISSION_GATE_DIR_FORM = 'node --test nuclear-fission-3d/tests';

// ─── SCENARIO-017：六个 D-T 聚变专属字面量（nuclear-fission-3d 生产源码零出现）───
const FORBIDDEN_FUSION_LITERALS = ['0.018884', '0.0189 u', '17.6 MeV', '2.82e-12', '氘', '氚'];

// ─── 既有卡（纯追加必须逐字保留：完整开标签 = class + href + id 三元组）───
const SEVEN_EXISTING_CARDS = [
  ['link-gravity-slingshot', 'gravity-slingshot/', 'card--slingshot'],
  ['link-how-cars-work', 'how-cars-work/', 'card--car'],
  ['link-ion-thruster-3d', 'ion-thruster-3d/', 'card--ion3d'],
  ['link-atomic-model', 'atomic-model/', 'card--atom'],
  ['link-nuclear-fusion-3d', 'nuclear-fusion-3d/', 'card--fusion'],
  ['link-solar-cell', 'solar-cell/', 'card--solar'],
];

// ─── 最终门禁矩阵要求的 4 个裂变套件与 ≥28 个场景标签全覆盖 ───
const FISSION_SUITES = [
  'phase1-shell.test.mjs',
  'phase2-runtime.test.mjs',
  'phase3-interaction.test.mjs',
  'phase4-gate.test.mjs',
];
const TOTAL_SCENARIO_LABELS_REQUIRED = 28;

function readText(p, label = p) {
  assert.ok(existsSync(p), `文件缺失: ${label}`);
  return readFileSync(p, 'utf8');
}

function countOccurrences(haystack, needle) {
  let n = 0;
  let i = haystack.indexOf(needle);
  while (i !== -1) {
    n += 1;
    i = haystack.indexOf(needle, i + needle.length);
  }
  return n;
}

function walkProductionFiles(rootDir, out = []) {
  if (!existsSync(rootDir)) return out;
  for (const name of readdirSync(rootDir).sort()) {
    const p = join(rootDir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === 'tests' || name === 'node_modules' || name === '.git') continue;
      walkProductionFiles(p, out);
    } else if (st.isFile()) {
      out.push(p);
    }
  }
  return out;
}

function runGate(cmdFragment) {
  // 统一追加 TAP 报告器以获得确定性可解析输出（# tests/# pass/# fail 计数与 not ok 行）。
  // 必须擦除 NODE_TEST_CONTEXT/NODE_TEST_WORKER_ID：嵌套 node --test 否则会因
  // 「run() is being called recursively within a test file」静默跳过全部文件（status 0 零用例）。
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  delete env.NODE_TEST_WORKER_ID;
  const r = spawnSync(`node --test --test-reporter=tap ${cmdFragment}`, {
    shell: true,
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env,
  });
  return r;
}

// ═══════════════════════════════════════════════════════════════════
test('SCENARIO-001 (AC-01): 纯静态目录 file:// 冒烟 — 无构建步骤/零 npm 依赖，根与裂变页可直开，tests/ 仅依赖 node 内建模块', () => {
  // 零构建指纹：仓库根与 nuclear-fission-3d/ 均不得出现任何 npm/打包器痕迹
  for (const fp of ['package.json', 'package-lock.json', 'node_modules', 'webpack.config.js', 'vite.config.js', 'tsconfig.json']) {
    assert.ok(!existsSync(join(REPO_ROOT, fp)), `仓库根不得存在构建指纹: ${fp}`);
    assert.ok(!existsSync(join(FISSION_ROOT, fp)), `nuclear-fission-3d/ 不得存在构建指纹: ${fp}`);
  }
  // file:// 冒烟（静态代理）：两页 HTML 在位且以 <!DOCTYPE html> 开头（无构建、无白屏的结构前提）
  const hubHtml = readText(HUB_HTML_PATH, '根 index.html');
  const fissionHtml = readText(FISSION_HTML_PATH, 'nuclear-fission-3d/index.html');
  assert.ok(hubHtml.trimStart().toLowerCase().startsWith('<!doctype html'), '根 index.html 必须以 <!DOCTYPE html> 开头');
  assert.ok(fissionHtml.trimStart().toLowerCase().startsWith('<!doctype html'), 'nuclear-fission-3d/index.html 必须以 <!DOCTYPE html> 开头');
  // 两页全部本地 src/href 引用必须为相对路径（file:// 直开可达）；https CDN（es-module-shims/importmap）豁免
  for (const [pageName, html] of [['根 index.html', hubHtml], ['nuclear-fission-3d/index.html', fissionHtml]]) {
    for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
      const ref = m[1];
      const external = /^(https?:)?\/\//.test(ref) || ref.startsWith('data:') || ref.startsWith('#');
      if (!external) {
        assert.ok(!ref.startsWith('/'), `${pageName} 发现绝对路径引用 "${ref}"（file:// 不可达）`);
      }
    }
  }
  // 新入口卡以相对目录形式链接裂变站（RED：card--fission 未追加时本断言失败）
  assert.ok(
    hubHtml.includes('href="nuclear-fission-3d/"'),
    '根 index.html 缺少指向 nuclear-fission-3d/ 的相对 href（入口卡未追加）'
  );
  // tests/ 依赖白名单：全部测试文件 import 仅允许 node 内建模块（零 npm 依赖的测试侧证明）
  const testsDir = join(FISSION_ROOT, 'tests');
  for (const name of readdirSync(testsDir).sort()) {
    if (!name.endsWith('.test.mjs')) continue;
    const src = readFileSync(join(testsDir, name), 'utf8');
    for (const m of src.matchAll(/^import\b[^;'"]*['"]([^'"]+)['"]/gm)) {
      assert.ok(m[1].startsWith('node:'), `${name} 引入非 node 内建依赖 "${m[1]}"（违反零 npm 依赖）`);
    }
  }
});

// ═══════════════════════════════════════════════════════════════════
test('SCENARIO-017 (AC-06): 全树聚变字面量零出现 — nuclear-fission-3d 生产源码（排除 tests/）六字面量计数均为 0', () => {
  // Phase 1/2 依赖：生产文件必须就位（全树扫描需全部生产文件在场）
  for (const rel of ['index.html', join('css', 'style.css'), join('js', 'main.js')]) {
    assert.ok(existsSync(join(FISSION_ROOT, rel)), `生产文件未就位: nuclear-fission-3d/${rel}`);
  }
  const files = walkProductionFiles(FISSION_ROOT);
  assert.ok(files.length >= 3, `生产文件数异常（实得 ${files.length}，须 ≥3）`);
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    for (const lit of FORBIDDEN_FUSION_LITERALS) {
      assert.equal(
        countOccurrences(content, lit),
        0,
        `${file} 出现聚变专属字面量 "${lit}"（跨题污染，AC-06 要求计数为 0）`
      );
    }
  }
});

// ═══════════════════════════════════════════════════════════════════
test('SCENARIO-021 (AC-08): sanctioned glob 门禁实跑全绿 — node --test nuclear-fusion-3d/tests/*.test.mjs exit 0 且 33/33', () => {
  // 锁定：命令字符串必须为逐字连续字面量（同一常量既被断言也被实跑消费）
  assert.equal(FUSION_GATE_CMD, 'node --test nuclear-fusion-3d/tests/*.test.mjs');
  assert.equal(FISSION_GATE_CMD, 'node --test nuclear-fission-3d/tests/*.test.mjs');
  for (const cmd of [FUSION_GATE_CMD, FISSION_GATE_CMD]) {
    assert.ok(cmd.includes('tests/*.test.mjs'), 'sanctioned 门禁命令必须含 tests glob 段');
  }
  // 交付模式自检：本文件 matched code 必须含连续字面量与六字面量常量（防拼接碎片化回归）
  const self = readFileSync(fileURLToPath(import.meta.url), 'utf8');
  assert.ok(self.includes("const FUSION_GATE_CMD = 'node --test nuclear-fusion-3d/tests/*.test.mjs';"), 'FUSION_GATE_CMD 必须是逐字连续字符串字面量');
  assert.ok(self.includes("const FISSION_GATE_CMD = 'node --test nuclear-fission-3d/tests/*.test.mjs';"), 'FISSION_GATE_CMD 必须是逐字连续字符串字面量');
  assert.ok(self.includes("'0.018884'"), "FORBIDDEN_FUSION_LITERALS 必须以字符串字面量含 '0.018884'");
  // 实跑变更后聚变门禁（变更前 33/33 基线由外部门禁矩阵执行）：glob 形式、exit 0、33 项零失败
  const fusionRun = runGate('nuclear-fusion-3d/tests/*.test.mjs');
  assert.equal(fusionRun.status, 0, `聚变门禁必须 exit 0（sanctioned: ${FUSION_GATE_CMD}）\n${(fusionRun.stdout || '').slice(-1500)}`);
  assert.match(fusionRun.stdout, /# tests 33\b/, '聚变套件必须恰为 33 项（33/33 基线不得削弱）');
  assert.match(fusionRun.stdout, /# pass 33\b/, '聚变套件必须 33 项全部通过');
  assert.match(fusionRun.stdout, /# fail 0\b/, '聚变套件失败数必须为 0');
  assert.ok(!fusionRun.stdout.includes('not ok '), '聚变门禁不得出现任何失败用例（not ok）');
});

// ═══════════════════════════════════════════════════════════════════
test('SCENARIO-022 (AC-08): 目录参数形式禁用 — 门禁命令必须含 tests glob 段、以 glob 结尾、无尾斜杠目录形式、与目录形式逐字不等', () => {
  for (const [cmd, dirForm] of [
    [FUSION_GATE_CMD, FUSION_GATE_DIR_FORM],
    [FISSION_GATE_CMD, FISSION_GATE_DIR_FORM],
  ]) {
    assert.ok(cmd.includes('tests/*.test.mjs'), '门禁命令必须含 tests glob 段（glob 形式）');
    assert.ok(cmd.endsWith('tests/*.test.mjs'), '门禁命令必须以 tests/*.test.mjs glob 结尾');
    assert.ok(!cmd.endsWith('/tests'), '禁止以裸目录形式结尾（目录参数形式已明令禁止）');
    assert.ok(!cmd.endsWith('/tests/'), '禁止以尾斜杠目录形式结尾');
    assert.notEqual(cmd, dirForm, '门禁命令与目录参数形式必须逐字不等');
    assert.ok(!cmd.includes('--test-reporter'), '锁定命令字符串即 sanctioned 原文，不得夹带附加旗标');
  }
  // Node v24.15.0 实证：目录参数形式确定性失败，故仅允许 glob 形式（对照断言，锁死二者不等）
  assert.notEqual(FUSION_GATE_DIR_FORM, 'node --test nuclear-fusion-3d/tests/*.test.mjs');
  assert.notEqual(FISSION_GATE_DIR_FORM, 'node --test nuclear-fission-3d/tests/*.test.mjs');
});

// ═══════════════════════════════════════════════════════════════════
test('SCENARIO-023 (AC-08): fusion 零改动 + 裂变新套件全绿 — 4 套件在位、≥28 场景标签全覆盖、fusion 生产源零 fission 痕迹、强调规则计数恒 7', () => {
  // ① 4 个裂变套件文件在位（最终门禁矩阵前提）
  for (const s of FISSION_SUITES) {
    assert.ok(existsSync(join(FISSION_ROOT, 'tests', s)), `裂变套件未就位: tests/${s}`);
  }
  // ② 4 套件场景标签并集 ≥ 28（≥28 个场景标签全覆盖）
  const labels = new Set();
  for (const s of FISSION_SUITES) {
    const src = readFileSync(join(FISSION_ROOT, 'tests', s), 'utf8');
    for (const m of src.matchAll(/SCENARIO-\d+/g)) labels.add(m[0]);
  }
  assert.ok(
    labels.size >= TOTAL_SCENARIO_LABELS_REQUIRED,
    `场景标签并集仅 ${labels.size}（要求 ≥${TOTAL_SCENARIO_LABELS_REQUIRED}）: ${[...labels].sort().join(',')}`
  );
  // ③ fusion 生产源零 card--fission 痕迹（零改动；SCENARIO-004 常数 7 = 规则数口径，见 REQ-F-003 回应）
  for (const f of walkProductionFiles(join(REPO_ROOT, 'nuclear-fusion-3d'))) {
    assert.equal(countOccurrences(readFileSync(f, 'utf8'), 'card--fission'), 0, `${f} 出现 card--fission（fusion 站被污染）`);
  }
  // ④ 根 index.html 强调规则计数保持基线（≥7）
  const hubHtml = readText(HUB_HTML_PATH, '根 index.html');
  const accents = hubHtml.match(/\.card--\w+::before\s*\{/g) ?? [];
  assert.ok(accents.length >= 7, `强调规则计数必须保持基线（≥7），实得 ${accents.length}`);
  // ⑤ 裂变门禁为 glob 形式（实跑三个兄弟套件；逐字指定文件名避免与本套件自递归）
  assert.ok(FISSION_GATE_CMD.endsWith('tests/*.test.mjs'), '裂变门禁必须为 glob 形式');
  const siblingRun = runGate(
    'nuclear-fission-3d/tests/phase1-shell.test.mjs nuclear-fission-3d/tests/phase2-runtime.test.mjs nuclear-fission-3d/tests/phase3-interaction.test.mjs'
  );
  assert.equal(siblingRun.status, 0, `裂变兄弟套件必须全绿 exit 0\n${(siblingRun.stdout || '').slice(-1500)}`);
  assert.ok(!siblingRun.stdout.includes('not ok '), '裂变兄弟套件不得出现任何失败用例（not ok）');
});

// ═══════════════════════════════════════════════════════════════════
test('SCENARIO-024 (AC-09): 根 index.html 纯追加 card--fission 恰 1 处于 link-solar-cell 之后 — ☢️/双语/描述/Open →（增量 7→8）/既有七卡原样保留', () => {
  const hubHtml = readText(HUB_HTML_PATH, '根 index.html');
  // ① 新卡锚点与 id 各恰 1（0→1 标记口径）
  assert.equal(countOccurrences(hubHtml, '<a class="card card--fission"'), 1, '<a class="card card--fission" 必须恰 1 处');
  assert.equal(countOccurrences(hubHtml, 'id="link-nuclear-fission-3d"'), 1, 'id="link-nuclear-fission-3d" 必须恰出现 1 次');
  // ② 位置在 link-solar-cell 之后（纯追加）
  const solarIdx = hubHtml.indexOf('id="link-solar-cell"');
  const fissionIdx = hubHtml.indexOf('id="link-nuclear-fission-3d"');
  assert.ok(solarIdx !== -1, '既有 link-solar-cell 锚点缺失');
  assert.ok(fissionIdx !== -1, 'card--fission 卡未追加（RED：实现缺失）');
  assert.ok(fissionIdx > solarIdx, 'card--fission 必须追加在 link-solar-cell 卡之后');
  // ③ 锚点块内容：☢️ 图标 + 双语标题 + 一句描述 + Open → 箭头 + 相对 href（F-D-05：块内恰 1 仅限新卡锚点块作用域）
  const blockMatch = hubHtml.match(/<a class="card card--fission"[\s\S]*?<\/a>/);
  assert.ok(blockMatch, '未找到 card--fission 锚点块');
  const block = blockMatch[0];
  assert.ok(block.includes('card__icon') && block.includes('☢️'), '新卡块缺少 ☢️ .card__icon 图标');
  assert.ok(block.includes('card__title') && block.includes('Nuclear Fission 核裂变'), '新卡块缺少双语标题「Nuclear Fission 核裂变」');
  assert.ok(block.includes('card__desc'), '新卡块缺少一句描述 .card__desc');
  assert.ok(block.includes('card__arrow') && block.includes('Open →'), '新卡块缺少 Open → .card__arrow 箭头');
  assert.equal(countOccurrences(block, 'Open →'), 1, 'F-D-05：块内 Open → 恰 1（作用域限定新卡锚点块）');
  assert.ok(block.includes('href="nuclear-fission-3d/"'), '新卡 href 必须指向 nuclear-fission-3d/');
  // ④ 全文件 Open → 增量口径：至少 8 处
  assert.ok(countOccurrences(hubHtml, 'Open →') >= 8, 'Open → 全文件计数应 ≥ 8');
  // ⑤ 全部卡片锚点至少 8
  assert.ok(countOccurrences(hubHtml, '<a class="card ') >= 8, `卡片锚点总数必须 ≥ 8（实得 ${countOccurrences(hubHtml, '<a class="card ')}）`);
  // ⑥ card--fusion 锚点仍恰 1（CSS 规则中的 .card--fusion 类引用不计入 —— 仅统计锚点模式）
  assert.equal(countOccurrences(hubHtml, '<a class="card card--fusion"'), 1, 'card--fusion 锚点必须仍恰 1 处');
  // ⑦ 既有卡锚点/href/id 逐字原样保留（完整开标签各恰 1）
  for (const [id, href, cls] of SEVEN_EXISTING_CARDS) {
    const opening = `<a class="card ${cls}" href="${href}" id="${id}">`;
    assert.equal(countOccurrences(hubHtml, opening), 1, `既有卡开标签被改动或丢失: ${opening}`);
  }
});

// ═══════════════════════════════════════════════════════════════════
test('SCENARIO-025 (AC-09): 无新增 ::before 强调规则 — 计数保持 7，强调仅落 .card--fission .card__icon{background} 与 :hover{border-color}', () => {
  const hubHtml = readText(HUB_HTML_PATH, '根 index.html');
  // ① 计数保持基线（≥7）
  const accents = hubHtml.match(/\.card--\w+::before\s*\{/g) ?? [];
  assert.ok(accents.length >= 7, `强调规则计数必须保持基线（≥7），实得 ${accents.length}`);
  // ② card--fission 绝不引入 ::before 规则
  assert.ok(!/\.card--fission[^{}\n]*::before/.test(hubHtml), 'card--fission 不得引入 .card--X::before 规则');
  // ③ 强调色只落在 icon 背景（RED：追加未实现时此处失败）
  const iconAccent = hubHtml.match(/\.card--fission \.card__icon\s*\{[^}]*\}/);
  assert.ok(iconAccent, '缺少 .card--fission .card__icon { background: … } 强调规则');
  assert.ok(/\bbackground\s*:/.test(iconAccent[0]), '.card--fission .card__icon 规则必须设置 background');
  // ④ 与 hover 边框描边（RED：追加未实现时此处失败）
  const hoverAccent = hubHtml.match(/\.card--fission:hover\s*\{[^}]*\}/);
  assert.ok(hoverAccent, '缺少 .card--fission:hover { border-color: … } 描边规则');
  assert.ok(/\bborder-color\s*:/.test(hoverAccent[0]), '.card--fission:hover 规则必须设置 border-color');
});
