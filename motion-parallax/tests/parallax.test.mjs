import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  omegaExact, omegaPeak, toDegPerS, sweepAngleDeg,
  exampleTreeOmega, exampleHillOmega, exampleRatio,
  moonOmegaWalking, pcFromArcsec, pcToLy,
  BESSEL_61CYG_ARCSEC, MODERN_61CYG_ARCSEC, PROXIMA_ARCSEC, PC_TO_LY,
} from '../js/parallax.js';

test('峰值：x=0 时 ω = v/d', () => {
  assert.ok(Math.abs(omegaExact(20, 10, 0) - omegaPeak(20, 10)) < 1e-12);
  assert.ok(Math.abs(omegaPeak(20, 10) - 2.0) < 1e-12);
});

test('对称性：ω(x) = ω(−x)，且 x→∞ 衰减', () => {
  assert.ok(Math.abs(omegaExact(15, 40, 60) - omegaExact(15, 40, -60)) < 1e-12);
  assert.ok(omegaExact(20, 10, 500) < omegaExact(20, 10, 100) * 0.05);
});

test('博客算例：树 2.0 rad/s ≈ 114.6°/s，山 0.01 rad/s，比值 200', () => {
  assert.ok(Math.abs(exampleTreeOmega() - 2.0) < 1e-12);
  assert.ok(Math.abs(toDegPerS(exampleTreeOmega()) - 114.59155902616465) < 1e-9);
  assert.ok(Math.abs(exampleHillOmega() - 0.01) < 1e-15);
  assert.equal(exampleRatio(), 200);
});

test('非齐平时刻弱于峰值：ω(x=10m, d=10m) = ω峰值/2', () => {
  assert.ok(Math.abs(omegaExact(20, 10, 10) - 1.0) < 1e-12);
});

test('扫角：atan 几何（10 m 树在 ±5 m 扫角 = 2·atan(0.5)）', () => {
  const expect = 2 * Math.atan(0.5) * (180 / Math.PI);
  assert.ok(Math.abs(sweepAngleDeg(10, -5, 5) - expect) < 1e-9);
});

test('月亮：步行 1.4 m/s → ω ≈ 3.64e-9 rad/s（≈2.1e-7 °/s）', () => {
  const w = moonOmegaWalking();
  assert.ok(Math.abs(w - 3.6420395421456815e-9) < 1e-20);
  assert.ok(toDegPerS(w) < 2.2e-7);
  // 树 vs 月亮：步行者也差 ~3.84×10⁷ 倍
  const ratio = omegaPeak(1.4, 10) / w;
  assert.ok(ratio > 3.8e7 && ratio < 3.9e7);
});

test('秒差距定义：p=1″ ↔ 1 pc ≈ 3.26 ly', () => {
  assert.equal(pcFromArcsec(1), 1);
  assert.ok(Math.abs(pcToLy(1) - PC_TO_LY) < 1e-12);
});

test('61 Cygni：Bessel 0.3136″ → ≈3.19 pc ≈ 10.4 ly（与 ESA"约10光年"一致）', () => {
  const pc = pcFromArcsec(BESSEL_61CYG_ARCSEC);
  assert.ok(Math.abs(pc - 3.1887790) < 1e-4);
  assert.ok(Math.abs(pcToLy(pc) - 10.4) < 0.1);
  // 现代值 0.286″ → 3.50 pc ≈ 11.4 ly
  const pc2 = pcFromArcsec(MODERN_61CYG_ARCSEC);
  assert.ok(Math.abs(pcToLy(pc2) - 11.4) < 0.05);
});

test('Proxima：0.7685″ → 1.30 pc ≈ 4.25 ly', () => {
  const pc = pcFromArcsec(PROXIMA_ARCSEC);
  assert.ok(Math.abs(pc - 1.301239) < 1e-4);
  assert.ok(Math.abs(pcToLy(pc) - 4.245) < 0.01);
});
