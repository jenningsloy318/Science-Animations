// tests/display-consistency.test.mjs — 展示层对账门禁（spec 09 §9.5，决策 D13 / G16）
//
// 背景：freshness 门禁只看 SSOT（facts.js），曾出现「SSOT 已是 28.29% 而页面仍显示 27.81%」
// 的静默中间态。本门禁堵住它：凡认证/历史纪录数值，其**旧值字符串**不得残留在展示层。
//
// '27.8' 与 '27.81' 都要防——photosynthesis 用的是 27.8（一位小数），单查 27.81 会漏掉它。
'use strict';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/** 旧值 → 该数值的 SSOT 名（报错时给人看） */
const STALE = [
  { pattern: /27\.81/, name: 'longiHIBCRecord（现行 28.29%，ISFH 2026-09-28）' },
  { pattern: /27\.8(?!\d)/, name: 'photosynthesis pvRecord（现行 28.29%）' },
  { pattern: /pT\/6\b|p\u209C\/6\b/, name: 'particle curvature（现行 pT/0.6，F03）' },
];

/** 允许出现旧值的文件（历史记录 / 评审档案 / 本规范的审计记录） */
const ALLOW = [
  'docs/requirements/09-scientific-truth-audit-spec.md', // 本规范记录漂移本身
  'photosynthesis/REVIEW.md',                            // 历史评审档案，见 D8
  'docs/adr/',                                           // ADR 记录决策时点的值
];

/** 扫描范围：全部用户可见层（含离线单文件 Bundle，防 G17 静默腐烂） */
const SCAN = [
  'index.html',
  'solar-cell/js/', 'solar-cell/index.html', 'solar-cell/README.md', 'solar-cell/solar-cell.html',
  'photosynthesis/js/', 'photosynthesis/index.html', 'photosynthesis/README.md', 'photosynthesis/photosynthesis.html',
  'black-hole/js/', 'black-hole/index.html', 'black-hole/README.md', 'black-hole/black-hole.html',
  'particle-collider/js/', 'particle-collider/index.html', 'particle-collider/README.md', 'particle-collider/collider.html',
  'observatory-3d/observatory.html',
  'nuclear-fission-3d/js/', 'nuclear-fission-3d/index.html',
  'docs/requirements/06-solar-cell-system-integration-spec.md',
  'docs/requirements/08-site-wide-bilingual-i18n-spec.md',
  // printing 家族（spec 10 v2.0 多页架构）：全项目目录（含全部单景页面，防陈旧展示值）
  'printing/',  // 递归覆盖 printing/printing-*/ 全部子项目
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'vendor') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function targets() {
  const out = [];
  for (const t of SCAN) {
    const abs = path.join(ROOT, t);
    if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) out.push(...walk(abs));
    else if (fs.existsSync(abs)) out.push(abs);
  }
  return out.filter((f) => f.endsWith('.js') || f.endsWith('.html') || f.endsWith('.md'));
}

test('G16 · 展示层不得残留被取代的纪录数值', () => {
  const stale = [];
  for (const f of targets()) {
    const rel = path.relative(ROOT, f);
    if (ALLOW.some((a) => rel.startsWith(a) || rel === a)) continue;
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const { pattern, name } of STALE) {
        if (!pattern.test(line)) continue;
        // 历史叙述豁免（按行，不放宽到整文件）：纪录历程链、上一代参数说明。
        const HIST = /上一代|\\u4e0a\\u4e00\\u4ee3|历程|prior |history|→\s*28\.29|26\.81/i;
        if (HIST.test(line)) continue;
        stale.push(`${rel}:${i + 1}  「${line.trim().slice(0, 60)}」（应为 ${name}）`);
      }
    });
  }
  assert.equal(
    stale.length, 0,
    `展示层残留旧纪录值（spec 09 F01 / G16）：\n  ${stale.join('\n  ')}\n` +
    `  → 更新为 SSOT 当前值；若属历史叙述（如纪录历程链），把该文件加入 ALLOW 并写明理由。`
  );
});

test('G16b · SSOT 当前值必须与门禁预期一致', () => {
  const facts = fs.readFileSync(path.join(ROOT, 'solar-cell/js/facts.js'), 'utf8');
  assert.match(facts, /longiHIBCRecord:\s*0\.2829/, 'SSOT 应为 28.29%（ISFH 2026-09-28）');
  assert.doesNotMatch(facts, /longiHIBCRecord:\s*0\.2781/, 'SSOT 不得回退到 27.81%');
});

test('G09 · 全站核素符号严禁上下标对调颠倒（IUPAC 规范）', () => {
  const INVERTED_PATTERNS = [
    { p: /⁵⁶₁₄₁Ba/, name: 'Ba-141 应为 ¹⁴¹₅₆Ba' },
    { p: /³⁶₉₂Kr/, name: 'Kr-92 应为 ⁹²₃₆Kr' },
    { p: /⁵⁵₁₃₇Cs/, name: 'Cs-137 应为 ¹³⁷₅₅Cs' },
    { p: /³⁷₉₆Rb/, name: 'Rb-96 应为 ⁹⁶₃₇Rb' },
    { p: /⁵⁴₁₄₄Xe/, name: 'Xe-144 应为 ¹⁴⁴₅₄Xe' },
    { p: /³⁸₉₀Sr/, name: 'Sr-90 应为 ⁹⁰₃₈Sr' },
    { p: /⁴⁶₁₁₈Pd/, name: 'Pd-118 应为 ¹¹⁸₄₆Pd' },
  ];

  const violations = [];
  for (const f of targets()) {
    const rel = path.relative(ROOT, f);
    if (ALLOW.some((a) => rel.startsWith(a) || rel === a)) continue;
    const content = fs.readFileSync(f, 'utf8');
    for (const { p, name } of INVERTED_PATTERNS) {
      if (p.test(content)) {
        violations.push(`${rel} 包含错误核素记号（${name}）`);
      }
    }
  }

  assert.equal(
    violations.length, 0,
    `全站核素记号违规（spec 09 F07 / G09）：\n  ${violations.join('\n  ')}`
  );
});
