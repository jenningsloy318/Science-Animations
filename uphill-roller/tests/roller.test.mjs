import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT, LEYBURN_EXACT, y, isValid, journeyEnd, totalDrop, coneZ, contactHalf, rollAnglePerX, info } from "../js/roller.js";

test("roller.js · 起点 y(0) = R = 3", () => {
  assert.equal(y(0, DEFAULT), 3);
});

test("roller.js · 有效条件下重心随 x 单调下降", () => {
  assert.equal(isValid(DEFAULT), true);
  const xs = [0, 2, 5, 8, 10];
  for (let i = 1; i < xs.length; i++) assert.ok(y(xs[i], DEFAULT) < y(xs[i - 1], DEFAULT));
});

test("roller.js · 旅程终点 = R / tan β", () => {
  assert.ok(Math.abs(journeyEnd(DEFAULT) - 3 / Math.tan(15.3 * Math.PI / 180)) < 1e-6);
});

test("roller.js · 全程重心下降量为正且可见（约 0.55）", () => {
  const d = totalDrop(DEFAULT);
  assert(d > 0.4 && d < 0.7, `drop=${d}`);
});

test("roller.js · 下降量 = 旅程 × |梯度|", () => {
  const xEnd = journeyEnd(DEFAULT);
  const slope = (y(0.0001, DEFAULT) - y(0, DEFAULT)) / 0.0001;
  assert(Math.abs((y(0, DEFAULT) - y(xEnd, DEFAULT)) - xEnd * Math.abs(slope)) < 1e-9, "drop = journey × slope");
});

test("roller.js · 锥体越往上陷得越深（z 单调减）", () => {
  const zs = [0, 3, 6, 9].map((x) => coneZ(x, DEFAULT));
  for (let i = 1; i < zs.length; i++) assert.ok(zs[i] < zs[i - 1]);
});

test("roller.js · 接触点半距 = x·tan β", () => {
  assert.ok(Math.abs(contactHalf(5, DEFAULT) - 5 * Math.tan(15.3 * Math.PI / 180)) < 1e-9);
});

test("roller.js · 越宽处滚动越慢（锥体已宽）", () => {
  const a = rollAnglePerX(2, DEFAULT);
  const b = rollAnglePerX(8, DEFAULT);
  assert.ok(b < a, `roll rate should fall as cone widens: ${a} > ${b}`);
});

test("roller.js · Leybourn 推导值满足 143 > 134", () => {
  const L = LEYBURN_EXACT;
  assert(143 > 134, L.check);
  assert(L.tanAlpha < L.tanBeta * L.tanGamma, "inequality holds for exact trig values");
});

test("roller.js · 陡轨道（α=20°）无法上坡", () => {
  assert.equal(isValid({ ...DEFAULT, alphaDeg: 20 }), false);
});

test("roller.js · 大张口（β=35°）容易上坡", () => {
  assert.equal(isValid({ ...DEFAULT, betaDeg: 35 }), true);
});

test("roller.js · info() 返回完整诊断", () => {
  const I = info(DEFAULT);
  assert.equal(I.conditionOK, true);
  assert(I.drop > 0 && Number.isFinite(I.dropPerUnitX));
});
