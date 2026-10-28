// printing-gutenberg/tests/facts.test.mjs — 谷登堡黄金值（spec 10 §7.1 G06–G09）
'use strict';

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { solidification, normalize } from '../js/model/alloy.js';
import { ALLOY_WINDOW, BIBLE_PAGES, BIBLE_PRINTED, BIBLE_SURVIVING, BIBLE_PAPER, BIBLE_VELLUM } from '../js/facts.js';

test('G06: Pb82/Sb13/Sn5 → 凝固膨胀 dVolPct > 0（笔画锐利）', () => {
  const r = solidification({ pb: 82, sb: 13, sn: 5 });
  assert.ok(r.dVolPct > 0, `dVolPct=${r.dVolPct}`);
  assert.equal(r.sharpness, 'sharp');
});

test('G07: Pb90/Sb5/Sn5 → 凝固收缩 dVolPct < 0（缺陷态）', () => {
  const r = solidification({ pb: 90, sb: 5, sn: 5 });
  assert.ok(r.dVolPct < 0, `dVolPct=${r.dVolPct}`);
  assert.equal(r.sharpness, 'blunt');
});

test('G08: 三成分归一化后总和 = 100 ± 1e-9', () => {
  const n = normalize({ pb: 50, sb: 30, sn: 30 });
  const sum = n.pb + n.sb + n.sn;
  assert.ok(Math.abs(sum - 100) < 1e-9, `sum=${sum}`);
});

test('G09: 圣经数据 printed≈180（150 纸 + 30 羊皮）、surviving≈49、pages=1282', () => {
  assert.equal(BIBLE_PRINTED, 180);
  assert.equal(BIBLE_PAPER + BIBLE_VELLUM, 180);
  assert.equal(BIBLE_SURVIVING, 49);
  assert.equal(BIBLE_PAGES, 1282);
  // 配比窗口自洽
  assert.deepEqual(ALLOY_WINDOW.sb, [10, 15]);
});
