// printing-digital/tests/facts.test.mjs — 光与电黄金值（spec 10 §7.1 G16–G17）
'use strict';

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { makeGrid, expose, develop, CHARGED, DISCHARGED, DEVELOP_THRESHOLD } from '../js/model/xerography.js';
import { libraryRatio } from '../js/model/glyphSize.js';
import { WANG_COMPRESSION, FUSER_C, DROPLET_PL } from '../js/facts.js';

test('G16: 曝光格电位 ≥ 显影阈值 > 未曝光格电位（放电图文区吸碳粉，write-black）', () => {
  const grid = makeGrid(10, 4);
  expose(grid, [[2, 1], [3, 1], [4, 1]]);
  const mask = develop(grid);
  assert.ok(grid[1][2] >= DEVELOP_THRESHOLD, `exposed=${grid[1][2]}`);
  assert.ok(grid[0][0] < DEVELOP_THRESHOLD, `charged=${grid[0][0]}`);
  assert.ok(mask[1][2] === true && mask[0][0] === false);
});

test('G17: glyphSize 书史参数下模型 ratio ≥ 100（500–1000×为认证史实旁注）', () => {
  const r = libraryRatio(); // 默认 = 书史参数
  assert.ok(r.ratio >= 100, `ratio=${r.ratio}`);
  // 认证史实区间（仅作展示旁注，不作模型断言）
  assert.deepEqual(WANG_COMPRESSION, [500, 1000]);
  // 模型单调性：字号/字体增多 → 比值增大
  const more = libraryRatio({ sizes: 24, fonts: 6 });
  assert.ok(more.ratio > r.ratio);
});

test('facts: 定影温度/墨滴量级与 11.1 一致', () => {
  assert.deepEqual(FUSER_C, [150, 200]);
  assert.deepEqual(DROPLET_PL, [2, 4]);
});
