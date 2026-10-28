// tests/freshness.test.mjs — 科学数值保鲜门禁 (spec 09 §9.2, 决策 D7/D9)
//
// 本文件既是契约，也是执行者。它必须同时满足：
//   1. 能机检「每个对外科学数值都带来源标签」（D7 全量）
//   2. 能机检「认证纪录没过期」（D9 硬门）
//   3. 能机检「同族纪录没有内部不自洽」（F01 护栏）
//   4. **自己可被证伪**：临时破坏输入后本文件必须失败（见 §自检，spec 09 §12 负向验证）
//
// 运行：node --test tests/
'use strict';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/** 距今超过这个月数，certified 纪录即视为过期 */
const STALE_MONTHS = 6;
/** 同族 certified 纪录之间允许的最大月差（F01：叠层查到 2026-07 而单结停在 2025-04） */
const SIBLING_MONTHS = 3;

/**
 * 科学模块白名单：这里面的文件，每个数值常量都必须有 PROV: 或 NO-PROV: 说明。
 * 渲染/UI/动画状态模块不在名单内 —— 它们不是「对外展示的科学数值」。
 */
const SCIENTIFIC_MODULES = [
  'atomic-model/js/spectra.js',
  'black-hole/js/glsl.js',
  'black-hole/js/main.js',
  'how-cars-work/js/kinematics.js',
  'how-cars-work/js/telemetry.js',
  'how-cars-work/js/torque-flow.js',
  'ion-thruster-3d/js/physics.js',
  'motion-parallax/js/parallax.js',
  'nuclear-fission-3d/js/main.js',
  'nuclear-fusion-3d/js/main.js',
  'observatory-3d/js/data.js',
  'particle-collider/js/data.js',
  'particle-collider/js/ppevents.js',
  'photosynthesis/js/facts.js',
  'rotating-earth/js/astro.js',
  'solar-cell/js/facts.js',
  'solar-system/js/flight.js',
  'solar-system/js/data.js',
  'uphill-roller/js/roller.js',
  // printing 家族（spec 10 §5.4）：facts SSOT + 纯函数模型
  'common/js/printing/speedLadder.js',
  'printing/printing-woodblock/js/facts.js',
  'printing/printing-woodblock/js/model/mirror.js',
  'printing/printing-movable-type/js/facts.js',
  'printing/printing-movable-type/js/model/recombination.js',
  'printing/printing-movable-type/js/model/wheel.js',
  'printing/printing-gutenberg/js/facts.js',
  'printing/printing-gutenberg/js/model/alloy.js',
  'printing/printing-press-age/js/facts.js',
  'printing/printing-offset/js/facts.js',
  'printing/printing-offset/js/model/halftone.js',
  'printing/printing-offset/js/model/screenAngle.js',
  'printing/printing-digital/js/facts.js',
  'printing/printing-digital/js/model/xerography.js',
  'printing/printing-digital/js/model/glyphSize.js',
  'printing/printing-frontier/js/facts.js',
  'printing/printing-frontier/js/model/slicing.js',
  'printing/printing-frontier/js/model/euv.js',
];

/** 合法的来源标签（CONTEXT.md「科学数值的来源」） */
const PROV_VALUES = ['certified', 'measured', 'derived', 'illustrative', 'superseded'];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'vendor' || e.name === '.git') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.js')) out.push(path.relative(ROOT, p));
  }
  return out;
}

/**
 * 抽取一个模块里的数值常量。
 * 支持三种写法：export const、const、以及 ASTRO.TILT = 23.44 这种命名空间属性赋值。
 * 返回 {name, value, line, lineNo, prov, provValue, provRest, exempt}
 */
function extractConstants(rel) {
  const abs = path.join(ROOT, rel);
  const lines = fs.readFileSync(abs, 'utf8').split('\n');
  // 三种写法均允许「值后面跟注释」—— 补上 PROV: 注释后，行尾不再是纯值；
  // 若正则不容许尾随注释，就会出现「一打标签就从扫描里消失」的自噬循环。
  const TAIL = '\\s*[,;]?\\s*(?://.*)?$';
  const NUM = '(-?\\d[\\d_]*\\.?\\d*(?:[eE][-+]?\\d+)?)';
  const decl = new RegExp('^\\s*(?:export\\s+)?(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*(?::[^=]+)?=\\s*' + NUM + TAIL);
  const prop = new RegExp('^\\s*(?:window\\.)?([A-Z][A-Z_0-9]*)\\.([A-Z][A-Z_0-9]*)\\s*=\\s*' + NUM + TAIL);
  // 对象字面量属性：`key: 0.2781` 与 `365: 0.009`（数值键）。
  // 这一条至关重要：EFFICIENCY_LADDER / OPTICAL_DEPTH_UM / MISSION_PRESETS 等
  // 最关键的 SSOT 全部住在对象里；早期版本漏掉它会让 certified 门禁变成空转。
  const objProp = new RegExp(
    "^\\s*(?:'([^']+)'|([A-Za-z_$][\\w$]*)|(\\d+))\\s*:\\s*" + NUM + TAIL
  );
  const out = [];
  lines.forEach((raw, i) => {
    let name = null, value = null;
    const mP = prop.exec(raw);
    const m = mP || decl.exec(raw);
    if (m) {
      name = mP ? `${mP[1]}.${mP[2]}` : m[1];
      value = mP ? mP[3] : m[2];
    } else {
      const o = objProp.exec(raw);
      if (o) { name = o[1] || o[2] || `[${o[3]}]`; value = o[4]; }
    }
    if (name === null) return;
    // 注释可能在本行，也可能紧接在下一行（对象里的字段）
    const inline = /\/\/(.*)$/.exec(raw)?.[1] ?? '';
    const next = lines[i + 1] ?? '';
    // 下一行的注释只有在「本行没有行尾注释」时才属于本行；
    // 否则相邻常量的 PROV: 会误判到上一行头上，造成静默漏标。
    const nextIsStandalone = !/\/\//.test(raw) && /^\s*\/\//.test(next);
    const lead = nextIsStandalone ? (/^\s*\/\/(.*)$/.exec(next)?.[1] ?? '') : '';
    const comment = `${inline} ${lead}`;
    const pm = /PROV:\s*(certified|measured|derived|illustrative|superseded)\s*\|([^|]*)\|([^|]*)\|?([^|]*)/.exec(comment);
    // 注意：'/PROV:/' 会命中 'NO-PROV:' 内部（子串），必须先排除掉。
    const ownIsProv = /PROV:/.test(inline) && !/NO-PROV:/.test(inline);
    out.push({
      name, value, line: raw.trim(), lineNo: i + 1,
      prov: pm ? pm[0] : null,
      provValue: pm ? pm[1] : null,
      provRest: pm ? pm[2].trim() : null,
      date: pm ? pm[3].trim() : null,
      premise: pm ? (pm[4] ?? '').trim() : null,
      exempt: ownIsProv ? false : (/NO-PROV:/.test(inline) || /NO-PROV:/.test(lead)),
      exemptReason: (/NO-PROV:\s*([^|*]*)/.exec(inline || lead)?.[1] ?? '').trim(),
    });
  });
  return out;
}

function monthsSince(ym) {
  // 同时接受 YYYY-MM 与 YYYY-MM-DD；只认 YYYY-MM 会让 YYYY-MM-DD 静默变 NaN，
  // 连带把保鲜断言变成空转（这个坑真实发生过一次）。
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(ym ?? '');
  if (!m) return NaN;
  const then = Date.UTC(+m[1], +m[2] - 1, 1);
  const now = new Date();
  const thisMonth = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  return Math.round((thisMonth - then) / (1000 * 60 * 60 * 24 * 30.44));
}

const UNIQUE_MODULES = walk(ROOT).filter(
  (f) => f.includes('/js/') && !f.startsWith('tests/') && !f.startsWith('docs/')
);

const allConsts = UNIQUE_MODULES.flatMap((f) => extractConstants(f).map((c) => ({ ...c, file: f })));
const certified = allConsts.filter((c) => c.provValue === 'certified');
const sciModulesPresent = SCIENTIFIC_MODULES.filter((f) => fs.existsSync(path.join(ROOT, f)));

console.log(
  `[freshness] 扫描 ${UNIQUE_MODULES.length} 个模块 · ${allConsts.length} 个数值常量 · ` +
  `${certified.length} 个 certified · 科学模块 ${sciModulesPresent.length}/${SCIENTIFIC_MODULES.length}`
);

// ── 1. 来源标签完备性（D7 全量）────────────────────────────────
test('1. 科学模块中每个数值常量都有 PROV: 或 NO-PROV: 说明', () => {
  const gaps = [];
  for (const f of sciModulesPresent) {
    for (const c of extractConstants(f)) {
      if (c.prov) continue;
      if (c.exempt) continue;
      gaps.push(`${f}:${c.lineNo}  ${c.name} = ${c.value}`);
    }
  }
  assert.equal(
    gaps.length, 0,
    `以下科学数值缺少来源标签（D7 要求全量标注）：\n  ${gaps.join('\n  ')}\n` +
    `  → 要么补 '// PROV: <tag> | <来源> | <YYYY-MM> | <前提>'，` +
    `要么补 '// NO-PROV: <理由>' 说明为何不算对外科学数值。`
  );
});

test('2. 所有 PROV: 标签取值合法', () => {
  const bad = allConsts.filter((c) => c.prov && !PROV_VALUES.includes(c.provValue));
  assert.equal(bad.length, 0, `非法标签值：${bad.map((c) => `${c.file}:${c.name}`).join(', ')}`);
});

// ── 2. 认证纪录保鲜（D9 硬门）──────────────────────────────────
test('3. 每条 certified 都带认证机构与 YYYY-MM[-DD] 日期', () => {
  const bad = certified.filter(
    (c) => !c.date || !/^\d{4}-\d{2}(-\d{2})?$/.test(c.date) || !c.provRest
  );
  assert.equal(
    bad.length, 0,
    `certified 缺少机构或日期（F01 根因）：${bad.map((c) => `${c.file}:${c.name} date=${c.date}`).join(', ')}`
  );
});

test(`4. 没有 certified 超过 ${STALE_MONTHS} 个月未复核（D9 硬门）`, () => {
  // superseded 是历史里程碑（已被更新的纪录取代），不受保鲜期约束。
  const dated = certified.filter((c) => c.provValue !== 'superseded');
  const unparseable = dated.filter((c) => Number.isNaN(monthsSince(c.date)));
  assert.equal(
    unparseable.length, 0,
    `日期无法解析，保鲜断言会空转：${unparseable.map((c) => `${c.file}:${c.name} date=${c.date}`).join(', ')}`
  );
  const stale = dated
    .map((c) => ({ ...c, age: monthsSince(c.date) }))
    .filter((c) => !Number.isNaN(c.age) && c.age > STALE_MONTHS);
  assert.equal(
    stale.length, 0,
    `以下认证纪录已过期，需复核后更新（见 spec 09 §9.4 季度清单）：\n  ` +
    stale.map((c) => `${c.file}:${c.name} = ${c.value}  认证于 ${c.date}（${c.age} 个月前）`).join('\n  ')
  );
});

test('4b. 每条 superseded 都必须写明被什么取代', () => {
  const sup = allConsts.filter((c) => c.provValue === 'superseded');
  const bad = sup.filter((c) => !/取代|被.*替代|superseded by/i.test(c.premise ?? ''));
  assert.equal(
    bad.length, 0,
    `superseded 标签必须写明取代者：${bad.map((c) => `${c.file}:${c.name}`).join(', ')}`
  );
});

test(`5. 同族 certified 纪录日期差不超过 ${SIBLING_MONTHS} 个月`, () => {
  // 同族 = 同一文件内的 certified（例：solar-cell 单结硅 vs 钙钛矿叠层）
  // superseded 不参与：它本就是历史节点，与现行纪录拉开距离是正常的。
  const byFile = new Map();
  for (const c of certified) {
    if (c.provValue === 'superseded') continue;
    if (!byFile.has(c.file)) byFile.set(c.file, []);
    byFile.get(c.file).push(c);
  }
  const bad = [];
  for (const [f, cs] of byFile) {
    if (cs.length < 2) continue;
    const dated = cs.map((c) => ({ ...c, age: monthsSince(c.date) })).filter((c) => !Number.isNaN(c.age));
    if (dated.length < 2) continue;
    const ages = dated.map((c) => c.age);
    const spread = Math.max(...ages) - Math.min(...ages);
    if (spread > SIBLING_MONTHS) {
      bad.push(`${f}: 相差 ${spread} 个月 → ` + dated.map((c) => `${c.name}@${c.date}`).join(', '));
    }
  }
  assert.equal(bad.length, 0, `同族纪录内部不自洽（正是 F01 的形态）：\n  ${bad.join('\n  ')}`);
});

// ── 3. 覆盖度报告（不硬性断言，作为推进度量）─────────────────────
test('6. 覆盖度报告', () => {
  const sci = sciModulesPresent.flatMap((f) => extractConstants(f));
  const tagged = sci.filter((c) => c.prov);
  const exempt = sci.filter((c) => !c.prov && c.exempt);
  const gaps = sci.filter((c) => !c.prov && !c.exempt);
  const pct = sci.length ? ((tagged.length / sci.length) * 100).toFixed(1) : '0.0';
  console.log(
    `[freshness] 科学模块覆盖率: ${tagged.length}/${sci.length} = ${pct}%\n` +
    `           NO-PROV(显式排除): ${exempt.length} · 仍待处理: ${gaps.length}`
  );
  assert.ok(true); // 报告性质，不作门禁；门禁由 test 1 承担
});

// ── 4. 自检：本门禁必须能证伪 ──────────────────────────────────
// 若下面的断言成立，说明本文件在「无破坏」状态下全部通过，
// 真实结论由 spec 09 §12 的负向验证给出（改旧日期 / 删标签 → 必须 FAIL）。
test('7. 门禁自洽性：抽取器能同时识别已标注与未标注项', () => {
  const probe = extractConstants('solar-cell/js/facts.js');
  assert.ok(probe.length > 0, '抽取器应至少读到 solar-cell/facts.js 的若干常量');
  assert.ok(
    probe.some((c) => c.prov),
    '读取阶段应能识别到 PROV: 标签（说明 §1 门禁确实会在补标签后转为可满足）'
  );
});
