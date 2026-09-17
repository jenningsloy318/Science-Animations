import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  R_H, E_ION_EV, levelEnergyEv, transitionNm, nmToEv, seriesName,
  wavelengthColor, hydrogenTransition
} from '../js/spectra.js';

test('氢能级: E_n = -13.5984/n² eV (NIST 值)', () => {
  assert.ok(Math.abs(levelEnergyEv(1) - (-13.5984)) < 1e-9);
  assert.ok(Math.abs(levelEnergyEv(2) - (-3.3996)) < 1e-9);
  assert.ok(Math.abs(levelEnergyEv(3) - (-1.5109333)) < 1e-6);
  assert.ok(levelEnergyEv(100) > -0.01 && levelEnergyEv(100) < 0);  // 高能级趋近 0
});

test('巴耳末系: Hα 656.3 / Hβ 486.1 / Hγ 434.0 / Hδ 410.2 nm', () => {
  assert.ok(Math.abs(transitionNm(2, 3) - 656.335) < 0.5, `Hα = ${transitionNm(2,3)}`);
  assert.ok(Math.abs(transitionNm(2, 4) - 486.27) < 0.5,  `Hβ = ${transitionNm(2,4)}`);
  assert.ok(Math.abs(transitionNm(2, 5) - 434.17) < 0.5,  `Hγ = ${transitionNm(2,5)}`);
  assert.ok(Math.abs(transitionNm(2, 6) - 410.29) < 0.5,  `Hδ = ${transitionNm(2,6)}`);
});

test('莱曼系与帕邢系: Lyman-α 121.6 nm (UV), Paschen-α 1875.1 nm (IR)', () => {
  assert.ok(Math.abs(transitionNm(1, 2) - 121.567) < 0.5, `Ly-α = ${transitionNm(1,2)}`);
  assert.ok(Math.abs(transitionNm(3, 4) - 1875.1) < 3,    `Pa-α = ${transitionNm(3,4)}`);
  // 莱曼系限: n1=1, n2=∞ → λ = 1/R_H = 91.18 nm
  assert.ok(Math.abs(1 / R_H * 1e9 - 91.18) < 0.05);
});

test('能量-波长换算与谱线系归属', () => {
  assert.ok(Math.abs(nmToEv(656.3) - 1.889) < 0.01);   // Hα 光子 1.89 eV
  assert.equal(seriesName(2).en, 'Balmer');
  assert.equal(seriesName(1).band, '紫外 UV');
  assert.equal(seriesName(3).band, '红外 IR');
});

test('颜色映射: 656nm→红, 486nm→青蓝, <380nm→紫外', () => {
  assert.equal(wavelengthColor(656).label, '红');
  assert.ok(wavelengthColor(486).b > 0.7 && wavelengthColor(486).r < 0.4);
  assert.equal(wavelengthColor(121.6).label, '紫外 UV');
});

test('hydrogenTransition: UI 数据包完整且自洽', () => {
  const t = hydrogenTransition(1, 2);   // n=2→3 (壳层 idx 1→2): Hα
  assert.ok(Math.abs(t.nm - 656.335) < 0.5);
  assert.ok(Math.abs(t.ev - 1.889) < 0.01);
  assert.equal(t.series.zh, '巴耳末系');
  assert.ok(t.hex > 0);
});
