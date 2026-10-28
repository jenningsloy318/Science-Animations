// printing-movable-type/tests/facts.test.mjs — 活字黄金值（spec 10 §7.1 G03–G05）
'use strict';

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { costCompare, advantageCurve } from '../js/model/recombination.js';
import { wheelRetrievalTime, shelfWalkTime } from '../js/model/wheel.js';
import { COMMON_DUP, JUZHEN_TYPES, JIKJI_YEAR } from '../js/facts.js';

const P = { chars: 100, library: 3000 }; // 演示量纲（G03 断言用）

test('G03: editions=1 时 block ≤ movable；editions=50 时 movable < block；crossover 单调', () => {
  const one = costCompare({ ...P, editions: 1 });
  assert.ok(one.block <= one.movable, `editions=1 应雕版更省: ${JSON.stringify(one)}`);
  const fifty = costCompare({ ...P, editions: 50 });
  assert.ok(fifty.movable < fifty.block, `editions=50 应活字更省: ${JSON.stringify(fifty)}`);
  const curve = advantageCurve(P, [1, 5, 10, 20, 50, 100]);
  for (let i = 1; i < curve.length; i++) {
    assert.ok(curve[i] < curve[i - 1], '优势差应随 editions 单调扩大');
  }
  assert.ok(Number.isFinite(one.crossover) && one.crossover >= 2);
});

test('G04: 常用字备字数 ≥ 20（之/也/而）', () => {
  assert.ok(COMMON_DUP >= 20, `COMMON_DUP=${COMMON_DUP} 应 ≥ 20（梦溪笔谈"二十余"）`);
});

test('G05: 同一时间模型下 wheelRetrievalTime ≤ shelfWalkTime（同字集）', () => {
  for (let target = 1; target < 24; target += 4) {
    const w = wheelRetrievalTime({ sectors: 24, targetIndex: target, rpm: 12 });
    const s = shelfWalkTime({ cells: 24, targetIndex: target, paceCellsPerSec: 0.8 });
    assert.ok(w <= s, `target=${target}: wheel ${w.toFixed(2)}s 应 ≤ shelf ${s.toFixed(2)}s`);
  }
});

test('facts: 聚珍版/直指口径与 11.1 一致', () => {
  assert.equal(JUZHEN_TYPES, 253500);
  assert.equal(JIKJI_YEAR, 1377);
});
