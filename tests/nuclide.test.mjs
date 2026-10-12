// tests/nuclide.test.mjs — 核素记号格式化与 IUPAC 约定单元测试（spec 09 D17 / G09）
'use strict';

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toSuperscript,
  toSubscript,
  formatNuclide,
  NUCLIDES
} from '../common/js/nuclide.js';

test('toSuperscript: 正确转换数字与符号', () => {
  assert.equal(toSuperscript(141), '¹⁴¹');
  assert.equal(toSuperscript(235), '²³⁵');
  assert.equal(toSuperscript('2+'), '²⁺');
});

test('toSubscript: 正确转换数字与符号', () => {
  assert.equal(toSubscript(56), '₅₆');
  assert.equal(toSubscript(92), '₉₂');
});

test('formatNuclide: 遵循 IUPAC 规则（左上质量数 A，左下质子数 Z）', () => {
  assert.equal(formatNuclide(141, 56, 'Ba'), '¹⁴¹₅₆Ba');
  assert.equal(formatNuclide(92, 36, 'Kr'), '⁹²₃₆Kr');
  assert.equal(formatNuclide(137, 55, 'Cs'), '¹³⁷₅₅Cs');
  assert.equal(formatNuclide(96, 37, 'Rb'), '⁹⁶₃₇Rb');
  assert.equal(formatNuclide(144, 54, 'Xe'), '¹⁴⁴₅₄Xe');
  assert.equal(formatNuclide(90, 38, 'Sr'), '⁹⁰₃₈Sr');
  assert.equal(formatNuclide(118, 46, 'Pd'), '¹¹⁸₄₆Pd');

  // 聚变氢同位素与氦
  assert.equal(formatNuclide(2, 1, 'H'), '²₁H');
  assert.equal(formatNuclide(3, 1, 'H'), '³₁H');
  assert.equal(formatNuclide(4, 2, 'He'), '⁴₂He');

  // 省略 Z
  assert.equal(formatNuclide(2, null, 'H', false), '²H');
  assert.equal(formatNuclide(141, null, 'Ba', false), '¹⁴¹Ba');
});

test('NUCLIDES 预设库完备且自洽', () => {
  assert.equal(NUCLIDES.BA_141, '¹⁴¹₅₆Ba');
  assert.equal(NUCLIDES.KR_92, '⁹²₃₆Kr');
  assert.equal(NUCLIDES.CS_137, '¹³⁷₅₅Cs');
  assert.equal(NUCLIDES.RB_96, '⁹⁶₃₇Rb');
  assert.equal(NUCLIDES.XE_144, '¹⁴⁴₅₄Xe');
  assert.equal(NUCLIDES.SR_90, '⁹⁰₃₈Sr');
  assert.equal(NUCLIDES.PD_118, '¹¹⁸₄₆Pd');
  assert.equal(NUCLIDES.H_2, '²₁H');
  assert.equal(NUCLIDES.H_3, '³₁H');
});
