// printing-woodblock/tests/facts.test.mjs — 雕版黄金值（spec 10 §7.1 G01–G02）
'use strict';

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { reverseForBlock, STEP_COUNT } from '../js/model/mirror.js';
import { SIX_STEPS, BLOCK_THICKNESS_CM, BLOCK_LIFE_SHEETS, DIAMOND_SUTRA_YEAR } from '../js/facts.js';

test('G01: 反贴序反转 reverseForBlock("印刷术") === "术刷印"', () => {
  assert.equal(reverseForBlock('印刷术'), '术刷印');
  assert.equal(reverseForBlock('ABC'), 'CBA');
  assert.equal(reverseForBlock(''), '');
});

test('G02: 雕版六步——步骤数与顺序固定', () => {
  assert.equal(SIX_STEPS.length, 6);
  assert.equal(STEP_COUNT, 6);
  assert.deepEqual(SIX_STEPS.map((s) => s.zh),
    ['选材备板', '写样', '反贴上板', '雕刻', '校对修版', '刷印']);
});

test('facts: 雕版口径数字与 11.1 一致', () => {
  assert.equal(DIAMOND_SUTRA_YEAR, 868);
  assert.deepEqual(BLOCK_THICKNESS_CM, [2, 3]);
  assert.deepEqual(BLOCK_LIFE_SHEETS, [300, 2000]);
});
