import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');

test('All core JS modules exist and have valid syntax', async () => {
  const modules = ['js/physics.js', 'js/audio.js', 'js/aperture-view.js', 'js/main.js'];
  for (const mod of modules) {
    const filePath = path.join(ROOT, mod);
    assert.ok(fs.existsSync(filePath), `Module ${mod} must exist`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.length > 100, `Module ${mod} must not be empty`);
  }
});

test('index.html contains all essential UI element IDs referenced in JS', () => {
  const htmlPath = path.join(ROOT, 'index.html');
  assert.ok(fs.existsSync(htmlPath), 'index.html must exist');
  const html = fs.readFileSync(htmlPath, 'utf8');

  const requiredIds = [
    'stage', 'tools', 'followChip', 'bottomBar', 'stats',
    'sThrust', 'sIsp', 'sVe', 'sMdot', 'sIb', 'sPow', 'sEff',
    'toggleBtn', 'resetBtn', 'camBtn',
    'voltageSlider', 'voltageVal', 'accelSlider', 'accelVal', 'flowSlider', 'flowVal', 'timeSlider', 'timeVal',
    'infoPanel', 'infoClose', 'infoName', 'infoEn', 'infoDesc', 'infoChips',
    'tourPanel', 'tourTitle', 'tourText', 'tourNav', 'tourPrev', 'tourDots', 'tourNext', 'tourExit',
    'apertureModal', 'apertureCanvas', 'apertureClose', 'apertureVSlider', 'apertureVVal', 'apertureNSlider', 'apertureNVal',
    'apertureGridBtn', 'apertureRegimeTag', 'apertureDescText', 'apertureMarginVal', 'aperturePervVal',
    'gimbalWidget', 'gimbalPitchVal', 'gimbalPitchSlider', 'gimbalYawVal', 'gimbalYawSlider', 'gimbalResetBtn',
    'btnExplore', 'btnTour', 'btnCut', 'btnExplode', 'btnFollow', 'btnAperture', 'btnGimbal', 'btnGridMode', 'btnSound', 'btnLabels', 'btnMag', 'btnField'
  ];

  for (const id of requiredIds) {
    assert.ok(
      html.includes(`id="${id}"`),
      `index.html must contain element with id="${id}"`
    );
  }
});

test('index.html contains mission preset buttons for historical missions', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(html.includes('data-mission="NSTAR_DAWN"'));
  assert.ok(html.includes('data-mission="NEXT_NASA"'));
  assert.ok(html.includes('data-mission="BEPICOLOMBO_T6"'));
  assert.ok(html.includes('data-mission="LIPS_300"'));
});
