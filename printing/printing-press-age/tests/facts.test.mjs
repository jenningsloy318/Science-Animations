// printing-press-age/tests/facts.test.mjs — 蒸汽与热金属黄金值（spec 10 §7.1 G10–G11）
'use strict';

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ladderChecks } from '../../../common/js/printing/speedLadder.js';
import { HAND_SPH, STEAM_SPH, ROTARY_SPH, SHEETFED_SPH, WEB_SPH, LINOTYPE_FACTOR } from '../js/facts.js';

test('G10: 250 < 1100 < 8000 ≤ 20000 < 90000；1100/250 ≥ 4', () => {
  const c = ladderChecks();
  assert.ok(c.monotonic);
  assert.ok(c.ratio >= 4, `ratio=${c.ratio}`);
  assert.deepEqual(c.values, [250, 1100, 8000, 20000, 90000]);
  assert.equal(c.values[1], STEAM_SPH);
});

test('G11: Linotype 提速倍数 ∈ [3,5]', () => {
  assert.ok(LINOTYPE_FACTOR[0] === 3 && LINOTYPE_FACTOR[1] === 5);
});
