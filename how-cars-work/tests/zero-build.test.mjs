// zero-build.test.mjs — Phase 1 RED tests for the zero-build static-site shape
// and load budgets. Covers SCENARIO-023 (no bundler/node toolchain, all new JS
// as how-cars-work/js/*.js ES modules on the existing importmap, Makefile/
// Caddyfile serving unchanged) and SCENARIO-025 (first-interactive ≤ ~5 s: CDN
// three@0.160.0 only, no external model files, no new external dependencies).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SITE_ROOT, REPO_ROOT, JS_DIR, readSource, readSiteFile } from './helpers.mjs';

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'tests' || entry.name === 'node_modules' || entry.name === '.git') continue; // test support only
      walk(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

const shippedFiles = () => walk(SITE_ROOT).map((f) => path.relative(SITE_ROOT, f));

const BUNDLER_NAMES = [
  /^package(-lock)?\.json$/i, /^yarn\.lock$/i, /^pnpm-lock\.yaml$/i,
  /^tsconfig(\.\w+)?\.json$/i, /^jsconfig\.json$/i, /^\.babelrc(\.\w+)?$/i,
  /^(webpack|vite|rollup|esbuild|snowpack|parcel|babel|postcss|tailwind)\.config\.[cm]?[jt]?s$/i,
  /^(turbo|lerna|nx)\.json$/i,
];
const isBundlerArtifact = (basename) => BUNDLER_NAMES.some((re) => re.test(basename));

const MODEL_ASSET_EXT = /\.(glb|gltf|obj|fbx|stl|bin|hdr|drc|usdz|ktx2)$/i;

test('SCENARIO-023: the shipped tree contains no bundler/node toolchain artifacts (no package.json, webpack/vite/rollup configs, lockfiles)', () => {
  const offenders = shippedFiles().filter((rel) => isBundlerArtifact(path.basename(rel)));
  assert.deepEqual(offenders, [], `how-cars-work must stay a zero-build static site; found toolchain artifacts: ${offenders.join(', ')}`);
});

test('SCENARIO-023: no external model/texture files anywhere in the shipped tree — all geometry is code-only', () => {
  const offenders = shippedFiles().filter((rel) => MODEL_ASSET_EXT.test(rel));
  assert.deepEqual(offenders, [], `external model files are forbidden (code-only geometry), found: ${offenders.join(', ')}`);
});

test('SCENARIO-023: the Phase 1 modules exist as how-cars-work/js/*.js ES modules loaded via the existing importmap', () => {
  for (const file of ['car-model.js', 'car-subsystems.js', 'part-inspector-data.js', 'main.js']) {
    const full = path.join(JS_DIR, file);
    assert.ok(fs.existsSync(full), `required module js/${file} must exist`);
    const src = fs.readFileSync(full, 'utf8');
    assert.match(src, /\bexport\b/, `js/${file} must be an ES module (has an export)`);
  }
});

test('SCENARIO-023: index.html keeps the three@0.160.0 importmap with only the three/three/addons remaps and js/main.js as the single module entry', () => {
  const html = readSiteFile('index.html');
  const mapMatch = html.match(/<script[^>]*type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/);
  assert.ok(mapMatch, 'index.html must keep the importmap script');
  const importmap = JSON.parse(mapMatch[1]);
  assert.deepEqual(
    Object.keys(importmap.imports).sort(),
    ['three', 'three/addons/'],
    'the importmap must stay limited to the existing three + three/addons/ remaps'
  );
  assert.match(importmap.imports.three, /three@0\.160\.0/, 'three must stay pinned to the CDN three@0.160.0 build');
  const moduleEntries = html.match(/<script[^>]*type=["']module["'][^>]*src=["']([^"']+)["']/g) ?? [];
  assert.equal(moduleEntries.length, 1, 'exactly one module entry script is allowed');
  assert.match(moduleEntries[0], /js\/main\.js/, 'the single module entry must remain js/main.js');
});

test('SCENARIO-023: repo-root Makefile and Caddyfile keep serving the site unchanged with no build steps', () => {
  for (const name of ['Makefile', 'Caddyfile']) {
    const full = path.join(REPO_ROOT, name);
    assert.ok(fs.existsSync(full), `${name} must remain at the repo root`);
    const src = fs.readFileSync(full, 'utf8');
    assert.doesNotMatch(
      src,
      /\b(npm|npx|yarn|pnpm|vite|webpack|rollup|esbuild|tsc|parcel)\b/,
      `${name} must not grow any build/toolchain step`
    );
  }
});

test('SCENARIO-025: every import in how-cars-work/js/*.js is relative or the pinned three/three/addons CDN scope — no new external dependencies that would slow first-interactive', () => {
  const files = fs.readdirSync(JS_DIR).filter((f) => f.endsWith('.js'));
  assert.ok(files.length >= 4, 'the js/ directory must hold the phase modules');
  for (const file of files) {
    const src = readSource(file);
    const specifiers = [
      ...src.matchAll(/\bfrom\s*["']([^"']+)["']/g),
      ...src.matchAll(/\bimport\s*["']([^"']+)["']/g),
    ].map((m) => m[1]);
    for (const spec of specifiers) {
      const allowed = spec.startsWith('./') || spec.startsWith('../') || spec === 'three' || spec.startsWith('three/addons/');
      assert.ok(allowed, `js/${file} imports "${spec}" — only relative modules and the three@0.160.0 importmap scope are allowed`);
    }
    assert.doesNotMatch(src, /import\(\s*["']https?:/, `js/${file} must not dynamically import remote modules`);
  }
});

test('SCENARIO-025: index.html loads no extra script/asset payloads beyond the importmap + js/main.js (keeps first-interactive under ~5 s)', () => {
  const html = readSiteFile('index.html');
  const scriptsWithSrc = html.match(/<script[^>]*\bsrc=/g) ?? [];
  assert.ok(scriptsWithSrc.length <= 1, `index.html may reference at most the single js/main.js module script, saw ${scriptsWithSrc.length}`);
  assert.doesNotMatch(html, /\.(glb|gltf|obj|fbx|hdr|ktx2|wasm)["']/, 'index.html must not reference model/asset payloads');
});
