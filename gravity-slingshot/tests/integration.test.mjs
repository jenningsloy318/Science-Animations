import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

test('INTEGRATION: Zero-build file structure exists', () => {
  assert.ok(existsSync(resolve(ROOT, 'index.html')), 'index.html exists');
  assert.ok(existsSync(resolve(ROOT, 'css/style.css')), 'css/style.css exists');
  assert.ok(existsSync(resolve(ROOT, 'js/main.js')), 'js/main.js exists');
  assert.ok(existsSync(resolve(ROOT, 'js/physics.js')), 'js/physics.js exists');
  assert.ok(existsSync(resolve(ROOT, 'js/voyager-model.js')), 'js/voyager-model.js exists');
  assert.ok(existsSync(resolve(ROOT, 'js/celestial-bodies.js')), 'js/celestial-bodies.js exists');
  assert.ok(existsSync(resolve(ROOT, 'js/vectors-hud.js')), 'js/vectors-hud.js exists');
  assert.ok(existsSync(resolve(ROOT, 'js/audio.js')), 'js/audio.js exists');
});

test('INTEGRATION: index.html has pinned Three.js 0.160.0 and valid importmap', () => {
  const html = readFileSync(resolve(ROOT, 'index.html'), 'utf8');

  // Three.js 0.160.0 importmap
  assert.ok(html.includes('cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js'));
  assert.ok(html.includes('cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/'));
  assert.ok(html.includes('es-module-shims@1.10.0'));
  assert.ok(html.includes('window.__errs = []'));

  // Shared return home button
  assert.ok(html.includes('id="homeBtn"'));
  assert.ok(html.includes('href="../index.html"'));
});

test('INTEGRATION: Required interactive UI and HUD elements are present', () => {
  const html = readFileSync(resolve(ROOT, 'index.html'), 'utf8');

  // Stage & Tools
  assert.ok(html.includes('id="stage"'));
  assert.ok(html.includes('id="tools"'));
  assert.ok(html.includes('id="btnPlay"'));
  assert.ok(html.includes('id="btnReset"'));
  assert.ok(html.includes('id="btnVectors"'));
  assert.ok(html.includes('id="btnGravityWell"'));
  assert.ok(html.includes('id="btnTour"'));
  assert.ok(html.includes('id="btnSound"'));

  // Reference Frame & Geometry pills
  assert.ok(html.includes('id="framePills"'));
  assert.ok(html.includes('data-frame="HELIOCENTRIC"'));
  assert.ok(html.includes('data-frame="PLANETOCENTRIC"'));
  assert.ok(html.includes('id="geomPills"'));
  assert.ok(html.includes('data-geom="TRAILING"'));
  assert.ok(html.includes('data-geom="LEADING"'));
  assert.ok(html.includes('data-geom="POLAR"'));

  // Telemetry
  assert.ok(html.includes('id="bigSpeed"'));
  assert.ok(html.includes('id="speedGainBadge"'));
  assert.ok(html.includes('id="hudVRel"'));
  assert.ok(html.includes('id="hudGravAcc"'));
  assert.ok(html.includes('id="hudDeflection"'));
  assert.ok(html.includes('id="hudPlanetSlow"'));
  assert.ok(html.includes('id="hudEnergyDelta"'));

  // Tour
  assert.ok(html.includes('id="tourDialog"'));
});

test('INTEGRATION: CSS style rules enforce responsive layouts and min 44px touch targets', () => {
  const css = readFileSync(resolve(ROOT, 'css/style.css'), 'utf8');

  assert.ok(css.includes('min-height: 44px') || css.includes('height: 44px'));
  assert.ok(css.includes('min-width: 44px') || css.includes('width: 44px'));
  assert.ok(css.includes('@media (max-width: 768px)'));
  assert.ok(css.includes('#stage'));
});

test('INTEGRATION: Mission presets include Voyager 2, Parker, Ulysses, and New Horizons', () => {
  const html = readFileSync(resolve(ROOT, 'index.html'), 'utf8');
  assert.ok(html.includes('VOYAGER_2'));
  assert.ok(html.includes('PARKER_SOLAR_PROBE'));
  assert.ok(html.includes('ULYSSES'));
  assert.ok(html.includes('NEW_HORIZONS'));
});
