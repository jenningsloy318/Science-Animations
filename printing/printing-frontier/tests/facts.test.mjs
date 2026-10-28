// printing-frontier/tests/facts.test.mjs — 前沿黄金值（spec 10 §7.1 G18–G19）
'use strict';

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { slice } from '../js/model/slicing.js';
import { resolution } from '../js/model/euv.js';
import { EUV_NM, NA_STD, NA_HIGH, K1 } from '../js/facts.js';

test('G18: slice(20, 0.2) = 100 层；层高减半层数翻倍', () => {
  assert.equal(slice(20, 0.2).layers, 100);
  assert.equal(slice(20, 0.1).layers, 200);
});

test('G19: EUV 分辨率——0.33 NA ∈ [12,14] nm；0.55 单调更细且 ≈8 nm ±1', () => {
  const std = resolution(EUV_NM, NA_STD, K1);
  const high = resolution(EUV_NM, NA_HIGH, K1);
  assert.ok(std >= 12 && std <= 14, `std=${std.toFixed(2)}`);
  assert.ok(high < std, `high=${high.toFixed(2)} 应细于 ${std.toFixed(2)}`);
  assert.ok(Math.abs(high - 8) <= 1, `high=${high.toFixed(2)} 应 ≈8±1 nm`);
});
