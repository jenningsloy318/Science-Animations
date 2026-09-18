import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  photonEnergyJ, photonEnergyEv, einsteinKJPerMol,
  PHOTONS_PER_O2_MIN, CHAIN, KOK_STATES, H_PER_ATP, CALVIN,
  GLUCOSE_KJ_MOL, EFFICIENCY, calvinConsistent, lightDarkBalanced,
} from '../js/facts.js';

test('facts · 430nm 光子 ≈ 4.62e-19 J ≈ 2.89 eV', () => {
  assert.ok(Math.abs(photonEnergyJ(430) - 4.62e-19) < 0.02e-19);
  assert.ok(Math.abs(photonEnergyEv(430) - 2.885) < 0.02);
});

test('facts · 662nm 光子 ≈ 3.01e-19 J（红光弱于蓝光）', () => {
  assert.ok(Math.abs(photonEnergyJ(662) - 3.005e-19) < 0.02e-19);
  assert.ok(photonEnergyJ(430) > photonEnergyJ(662));
});

test('facts · 1 mol 430nm 光子 ≈ 278 kJ（蓝光一爱因斯坦）', () => {
  assert.ok(Math.abs(einsteinKJPerMol(430) - 278) < 1.5);
});

test('facts · 每 O₂ 理论最少 8 个光子（4e⁻ × 2 光系统）', () => {
  assert.equal(PHOTONS_PER_O2_MIN, 8);
  assert.equal(CHAIN.filter(c => c.P).length, 2, '恰好两个光系统带 P680/P700');
});

test('facts · Z 方案电子能量总体下行（PSI 段再爬升由光子承担）', () => {
  const e = CHAIN.map(c => c.energy);
  assert.ok(e[0] > e[3], 'b6f 低于 PSII');
  assert.ok(e[7] < e[4], 'FNR 低于 PC');
});

test('facts · Kok 循环 5 个 S 态', () => {
  assert.deepEqual(KOK_STATES, ['S0', 'S1', 'S2', 'S3', 'S4']);
});

test('facts · ATP 合酶 c14：每 ATP ≈ 4.67 个 H⁺', () => {
  assert.ok(Math.abs(H_PER_ATP - 14 / 3) < 1e-9);
});

test('facts · 卡尔文循环化学计量自洽', () => {
  assert.equal(CALVIN.atpPerCO2, 3);
  assert.equal(CALVIN.nadphPerCO2, 2);
  assert.equal(CALVIN.atpPerGlucose, 18);
  assert.equal(CALVIN.nadphPerGlucose, 12);
  assert.equal(calvinConsistent(), true, '12 NADPH = 24 e⁻ = 6 CO₂ × 4 e⁻');
  assert.equal(lightDarkBalanced(), true, '6 O₂ ↔ 12 NADPH 光暗平衡');
});

test('facts · 葡萄糖能量 2870 kJ/mol', () => {
  assert.equal(GLUCOSE_KJ_MOL, 2870);
});

test('facts · 效率阶梯单调（作物 < C3 理论 < C4 理论 < 量产板 < 纪录板）', () => {
  const p = EFFICIENCY.map(e => e.pct);
  for (let i = 1; i < p.length; i++) assert.ok(p[i] > p[i - 1]);
});
