// printing-offset/tests/facts.test.mjs — 胶印黄金值（spec 10 §7.1 G12–G15）
'use strict';

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mix, boundaryIdentity, PAPER } from '../js/model/halftone.js';
import { moireIndex, DEFAULT_ANGLES } from '../js/model/screenAngle.js';
import { SCREEN_ANGLES } from '../js/facts.js';

test('G12: C100+Y100 → g 通道为最大分量（绿系）', () => {
  const { rgb } = mix({ c: 100, m: 0, y: 100, k: 0 });
  assert.ok(rgb[1] > rgb[0] && rgb[1] > rgb[2], `rgb=${rgb}`);
});

test('G13: CMY 全 100 亮度 > 加 K，且 R > B（偏棕非中性黑）', () => {
  const cmy = mix({ c: 100, m: 100, y: 100, k: 0 });
  const cmyk = mix({ c: 100, m: 100, y: 100, k: 100 });
  assert.ok(cmy.brightness > cmyk.brightness, `cmy=${cmy.brightness} vs k=${cmyk.brightness}`);
  assert.ok(cmy.rgb[0] > cmy.rgb[2], `R 应 > B: rgb=${cmy.rgb}`);
});

test('G14: 默认网角两两最小有效夹角 ≥ 15° 且 moireIndex 最小档', () => {
  const mi = moireIndex(DEFAULT_ANGLES);
  assert.ok(mi.minPair >= 15, `minPair=${mi.minPair}`);
  assert.equal(mi.index, 'low');
  assert.equal(SCREEN_ANGLES.k, 45);
});

test('G15: Murray–Davies 边界 a=0 → 纸白；a=1 → 实地反射率', () => {
  const zero = mix({ c: 0, m: 0, y: 0, k: 0 });
  assert.deepEqual(zero.rgb, PAPER);
  const solidC = boundaryIdentity('c');
  assert.deepEqual(solidC, [35, 150, 200]);
});
