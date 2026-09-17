// Phase 1 RED test suite — Static Page Shell, Physics Panel & Site Card
// Scope: AC-01, AC-02, AC-03, AC-06, AC-09 degradation path.
// Run: node --test nuclear-fusion-3d/tests/
//
// Scenario coverage matrix (all tags appear verbatim in test titles below):
//   SCENARIO-001 -> "SCENARIO-001 (AC-01): page shell..." + "...import map..." tests
//   SCENARIO-002 -> "SCENARIO-002 (AC-01): css/style.css dark-space theme..."
//   SCENARIO-003 -> "SCENARIO-003 (AC-02): root index.html gains exactly one card--fusion card..."
//   SCENARIO-004 -> "SCENARIO-004 (AC-02): root index.html gains the two .card--fusion accent rules..."
//   SCENARIO-005 -> "SCENARIO-005 (AC-03): chrome markup — #tools/#btnTour..."
//   SCENARIO-006 -> "SCENARIO-006 (AC-03): overlay styling — #tourPanel/#physicsPanel..."
//   SCENARIO-014 -> "SCENARIO-014 (AC-06): D–T chain verbatim..." (also in FR-001 sweep title)
//   SCENARIO-015 -> "SCENARIO-015 (AC-06): mass-defect arithmetic verbatim..." (also in FR-001 sweep title)
//   SCENARIO-016 -> "SCENARIO-016 (AC-06): E=mc² + 2.82e-12 J..." (also in FR-001 sweep title)
//   SCENARIO-024 -> "SCENARIO-024 (AC-09): WebGL2 degradation path..." + "...bootstrap contract" test
//
// FR-001 response baked in: these tests pin the CORRECTED D–T numbers
//   (0.018884 u ≈ 0.0189 u, ×931.494 MeV/u ≈ 17.6 MeV, ≈ 2.82e-12 J, split 14.1/3.5 MeV)
//   and FORBID the wrong fission-era literals '0.0256' / '3.2e-11' in every
//   production file under nuclear-fusion-3d/ (html, css AND js — closing the
//   SPEC-F-001 css-sweep drift too).

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pageDir = resolve(here, '..');        // nuclear-fusion-3d/
const repoRoot = resolve(pageDir, '..');    // worktree root
const idxPath = join(pageDir, 'index.html');
const cssPath = join(pageDir, 'css', 'style.css');
const mainJsPath = join(pageDir, 'js', 'main.js');
const rootIdxPath = join(repoRoot, 'index.html');

function mustRead(p, label) {
  assert.ok(existsSync(p), `${label} must exist at ${p} (GREEN deliverable; missing now => RED)`);
  return readFileSync(p, 'utf8');
}

// Production files only: skip test/support dirs.
function walkProduction(dir, out = []) {
  assert.ok(existsSync(dir), `directory must exist: ${dir}`);
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'tests' || entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('.')) continue;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walkProduction(p, out);
    else if (/\.(html|css|js|mjs|cjs|json|txt|svg)$/i.test(entry.name)) out.push(p);
  }
  return out;
}

const MINUS = '[−\\-]'; // U+2212 or ASCII hyphen

// ---------------------------------------------------------------------------
// AC-01 — page shell
// ---------------------------------------------------------------------------

test('SCENARIO-001 (AC-01): nuclear-fusion-3d/index.html exists with <html lang="zh-CN">, viewport meta, the exact #homeBtn back-link and a #stage container', () => {
  const html = mustRead(idxPath, 'nuclear-fusion-3d/index.html');
  assert.match(html, /<html[^>]*\blang="zh-CN"/, '<html lang="zh-CN"> required');
  assert.match(html, /<meta[^>]*name="viewport"[^>]*>/, 'viewport meta required');
  assert.ok(
    html.includes('<a id="homeBtn" href="../index.html" title="返回首页 Back to home">🏠 首页</a>'),
    'exact back-link anchor required'
  );
  assert.match(html, /<div[^>]*id="stage"/, '#stage container required');
  assert.match(html, /<h1[^>]*>[\s\S]*?<\/h1>/, 'header h1 required');
  // window.__errs console-error trap
  assert.match(html, /window\.__errs\s*=\s*\[\]/, 'window.__errs must be initialized as an array');
  assert.match(html, /addEventListener\(\s*['"]error['"]/, 'an error listener must feed window.__errs');
});

test('SCENARIO-001 (AC-01): bootstrap wiring — es-module-shims@1.10.0 async loader, exactly ONE import map pinned exclusively to three@0.160.0 (+ three/addons/), module entry ./js/main.js', () => {
  const html = mustRead(idxPath, 'nuclear-fusion-3d/index.html');
  assert.match(html, /es-module-shims@1\.10\.0/, 'es-module-shims@1.10.0 loader required');
  const maps = html.match(/<script\b[^>]*type=["']importmap["'][^>]*>/g) ?? [];
  assert.equal(maps.length, 1, `expected exactly one import map, found ${maps.length}`);
  assert.ok(
    html.includes('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js'),
    'import map must pin three@0.160.0 build/three.module.js on jsdelivr'
  );
  assert.ok(
    html.includes('"three/addons/"') && html.includes('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/'),
    'import map must map "three/addons/" -> three@0.160.0 examples/jsm/'
  );
  assert.match(html, /<script[^>]*type=["']module["'][^>]*src=["']\.\/js\/main\.js["']/, 'module entry ./js/main.js required');

  // Exclusivity: no other three.js source anywhere in the page's production files.
  assert.ok(existsSync(pageDir), 'nuclear-fusion-3d/ must exist');
  for (const f of walkProduction(pageDir)) {
    const t = readFileSync(f, 'utf8');
    assert.ok(!/unpkg\.com/i.test(t), `${f}: unpkg CDN is forbidden`);
    assert.ok(!/three\.min\.js/i.test(t), `${f}: three.min.js (UMD build) is forbidden`);
    const versions = [...t.matchAll(/three@(\d+\.\d+\.\d+)/gi)].map((m) => m[1]);
    for (const v of versions) {
      assert.equal(v, '0.160.0', `${f}: every three.js pin must be 0.160.0, found ${v}`);
    }
  }
});

// ---------------------------------------------------------------------------
// AC-01 — dark-space stylesheet
// ---------------------------------------------------------------------------

test('SCENARIO-002 (AC-01): css/style.css follows the site dark-space theme (#04060d, Outfit + PingFang SC, gradient h1), #stage grab cursor, :focus-visible keyboard focus, user-select:none chrome, responsive @media', () => {
  const css = mustRead(cssPath, 'nuclear-fusion-3d/css/style.css');
  assert.ok(css.includes('#04060d'), 'dark-space background #04060d required');
  assert.match(css, /Outfit/, 'Outfit font required in the font stack');
  assert.match(css, /PingFang SC/, 'PingFang SC font required in the font stack');
  assert.match(css, /h1[^{]*\{[\s\S]*?gradient/, 'h1 must use a gradient');
  assert.match(css, /#stage[^{]*\{[\s\S]*?cursor:\s*grab/, '#stage needs the grab cursor');
  assert.match(css, /:focus-visible/, 'ctrl-btn/tool-btn need :focus-visible keyboard focus');
  assert.match(css, /user-select:\s*none/, 'chrome must disable user text selection');
  assert.match(css, /@media/, 'responsive rules required');
  assert.match(css, /@media[^{]*max-width/, 'a max-width breakpoint (tablet) is required');
});

// ---------------------------------------------------------------------------
// AC-02 — site card on the root index
// ---------------------------------------------------------------------------

test('SCENARIO-003 (AC-02): root index.html gains exactly ONE fusion card (class card card--fusion, href nuclear-fusion-3d/, id link-nuclear-fusion-3d, ☀️ icon, "Nuclear Fusion 核聚变" title, Open → arrow) placed AFTER the atomic-model card', () => {
  const html = mustRead(rootIdxPath, 'root index.html');
  const fusionCards = html.match(/<a class="card card--fusion"/g) ?? [];
  assert.equal(fusionCards.length, 1, `expected exactly one card--fusion anchor, found ${fusionCards.length}`);
  assert.equal((html.match(/link-nuclear-fusion-3d/g) ?? []).length, 1, 'id link-nuclear-fusion-3d must appear exactly once');
  assert.ok(html.includes('href="nuclear-fusion-3d/"'), 'card must link to nuclear-fusion-3d/');
  assert.ok(html.includes('☀️'), 'card icon must be ☀️');
  assert.ok(html.includes('Nuclear Fusion 核聚变'), 'bilingual title "Nuclear Fusion 核聚变" required');
  assert.ok(html.includes('Open →'), 'Open → arrow required');
  const atomIdx = html.indexOf('id="link-atomic-model"');
  assert.ok(atomIdx !== -1, 'pre-existing atomic-model card expected');
  const fusionIdx = html.indexOf('id="link-nuclear-fusion-3d"');
  assert.ok(fusionIdx > atomIdx, 'the fusion card must come after the atomic-model card');
  // No other root cards were removed or duplicated by the edit.
  for (const id of ['link-gravity-slingshot', 'link-how-cars-work', 'link-ion-thruster-3d', 'link-atomic-model', 'link-solar-cell']) {
    assert.equal((html.match(new RegExp(`id="${id}"`, 'g')) ?? []).length, 1, `${id} must remain exactly once`);
  }
});

test('SCENARIO-004 (AC-02): root index.html gains the two .card--fusion accent rules (.card--fusion::before radial-gradient + .card--fusion .card__icon background) alongside the existing six card accents', () => {
  const html = mustRead(rootIdxPath, 'root index.html');
  assert.match(html, /\.card--fusion::before\s*\{[^}]*radial-gradient\(/, '.card--fusion::before radial-gradient accent required');
  assert.match(html, /\.card--fusion\s+\.card__icon\s*\{[^}]*background\s*:/, '.card--fusion .card__icon background rule required');
  const beforeAccents = html.match(/\.card--\w+::before\s*\{/g) ?? [];
  assert.ok(beforeAccents.length >= 7, `existing ::before accents + card--fusion >= 7, found ${beforeAccents.length}`);
});

// ---------------------------------------------------------------------------
// AC-03 — chrome: tools / bottomBar / tourPanel
// ---------------------------------------------------------------------------

test('SCENARIO-005 (AC-03): chrome markup — #tools nav with the exact #btnTour tool button, #bottomBar ctrl-bar with #toggleBtn(⏸ 暂停)/#resetBtn(🔄 重置)/#camBtn(🎥 重置视角), and the #tourPanel overlay with all seven sub-ids', () => {
  const html = mustRead(idxPath, 'nuclear-fusion-3d/index.html');
  assert.match(html, /id="tools"/, '#tools nav required');
  assert.ok(
    html.includes('<button class="tool-btn" id="btnTour" title="引导浏览（分步讲解）">🎬</button>'),
    'exact #btnTour button markup required'
  );
  assert.match(html, /id="bottomBar"/, '#bottomBar required');
  assert.ok(html.includes('ctrl-bar'), '#bottomBar uses the ctrl-bar class');
  for (const id of ['toggleBtn', 'resetBtn', 'camBtn']) {
    assert.ok(html.includes(`id="${id}"`), `#${id} required`);
  }
  assert.ok(html.includes('⏸ 暂停'), '#toggleBtn initial label ⏸ 暂停 required');
  assert.ok(html.includes('🔄 重置'), '#resetBtn label 🔄 重置 required');
  assert.ok(html.includes('🎥 重置视角'), '#camBtn label 🎥 重置视角 required');
  for (const id of ['tourPanel', 'tourTitle', 'tourText', 'tourDots', 'tourPrev', 'tourNext', 'tourExit']) {
    assert.ok(html.includes(`id="${id}"`), `#${id} required in the tour overlay`);
  }
  assert.ok(html.includes('← 上一步'), '#tourPrev label ← 上一步 required');
  assert.ok(html.includes('下一步 →'), '#tourNext label 下一步 → required');
  assert.ok(html.includes('退出'), '#tourExit label 退出 required');
});

test('SCENARIO-006 (AC-03): overlay styling — css/style.css styles the fixed-overlay chrome: #tourPanel narration, #tourDots, #tourPrev/#tourNext/#tourExit buttons and the #physicsPanel info panel', () => {
  const css = mustRead(cssPath, 'nuclear-fusion-3d/css/style.css');
  assert.ok(css.includes('#tourPanel'), '#tourPanel selector required');
  assert.ok(css.includes('#tourTitle'), '#tourTitle selector required');
  assert.ok(css.includes('#tourText'), '#tourText selector required');
  assert.ok(css.includes('#tourDots'), '#tourDots selector required');
  assert.ok(css.includes('#physicsPanel'), '#physicsPanel selector required');
  assert.ok(css.includes('#bottomBar') || css.includes('#tools'), 'control chrome selectors required');
  assert.match(css, /position:\s*fixed/, 'fixed-overlay UI positioning required');
  assert.match(css, /tool-btn/, 'tool-btn styles required');
  assert.match(css, /ctrl-btn/, 'ctrl-btn styles required');
});

// ---------------------------------------------------------------------------
// AC-06 — physics panel (FR-001-corrected numbers)
// ---------------------------------------------------------------------------

test('SCENARIO-014 (AC-06): #physicsPanel displays the D–T chain verbatim — ²H + ³H → ⁴He + n + 17.6 MeV — with the 中子 ~14.1 MeV / α 粒子（氦核）~3.5 MeV energy split', () => {
  const html = mustRead(idxPath, 'nuclear-fusion-3d/index.html');
  assert.ok(html.includes('id="physicsPanel"'), '#physicsPanel required');
  assert.ok(html.includes('²H + ³H → ⁴He + n + 17.6 MeV'), 'reaction chain line verbatim required');
  assert.ok(/14\.1\s*MeV/.test(html), 'neutron energy ~14.1 MeV required');
  assert.ok(/3\.5\s*MeV/.test(html), 'alpha energy ~3.5 MeV required');
  assert.ok(html.includes('中子'), '中子 label required');
  assert.ok(html.includes('α 粒子'), 'α 粒子 label required');
});

test('SCENARIO-015 (AC-06): mass-defect arithmetic verbatim — 2.014102 u + 3.016049 u − 4.002602 u − 1.008665 u = 0.018884 u ≈ 0.0189 u, then ×931.494 MeV/u ≈ 17.6 MeV (FR-001 corrected defect, NOT 0.0256 u)', () => {
  const html = mustRead(idxPath, 'nuclear-fusion-3d/index.html');
  const defect = new RegExp(
    `2\\.014102\\s*u\\s*\\+\\s*3\\.016049\\s*u\\s*${MINUS}\\s*4\\.002602\\s*u\\s*${MINUS}\\s*1\\.008665\\s*u\\s*=\\s*0\\.018884\\s*u\\s*≈\\s*0\\.0189\\s*u`
  );
  assert.ok(defect.test(html), 'the full mass-defect equation must appear verbatim (whitespace-tolerant)');
  assert.ok(/×\s*931\.494\s*MeV\/u\s*≈\s*17\.6\s*MeV/.test(html), '×931.494 MeV/u ≈ 17.6 MeV conversion required');
  assert.ok(html.includes('0.0189'), 'rounded defect 0.0189 u required');
});

test('SCENARIO-016 (AC-06): E=mc² 质能方程 explanation with the Joule conversion ≈ 2.82e-12 J (FR-001 corrected figure, NOT the fission-era 3.2e-11 J)', () => {
  const html = mustRead(idxPath, 'nuclear-fusion-3d/index.html');
  assert.ok(/E=mc²/.test(html), 'E=mc² equation required');
  assert.ok(html.includes('质能方程'), '质能方程 (mass–energy equation) explanation required');
  assert.ok(/2\.82e-12\s*J/.test(html), '≈ 2.82e-12 J conversion required');
  assert.ok(/17\.6/.test(html), '17.6 MeV anchor required');
});

test('SCENARIO-014/SCENARIO-015/SCENARIO-016 (AC-06, FR-001 sweep): the forbidden wrong literals 0.0256 and 3.2e-11 appear in NO production file under nuclear-fusion-3d/ (html + css + js)', () => {
  assert.ok(existsSync(pageDir), 'nuclear-fusion-3d/ must exist');
  const files = walkProduction(pageDir);
  assert.ok(files.length >= 3, `expected at least index.html, css/style.css and js/main.js, found ${files.length}`);
  for (const f of files) {
    const t = readFileSync(f, 'utf8').toLowerCase();
    assert.ok(!t.includes('0.0256'), `${f} must NOT contain 0.0256 (wrong mass defect: ×931.494 → 23.85 MeV, contradicts 17.6 MeV)`);
    assert.ok(!t.includes('3.2e-11'), `${f} must NOT contain 3.2e-11 (fission per-event energy; D–T fusion is 2.82e-12 J)`);
  }
});

// ---------------------------------------------------------------------------
// AC-09 — WebGL2 degradation path + bootstrap slice
// ---------------------------------------------------------------------------

test('SCENARIO-024 (AC-09): js/main.js imports three/addons/capabilities/WebGL.js, guards on WebGL.isWebGL2Available(), injects the custom Chinese fallback (您的浏览器不支持 WebGL 2 …) into #stage and RETURNS before any renderer is constructed', () => {
  const js = mustRead(mainJsPath, 'nuclear-fusion-3d/js/main.js');
  assert.match(js, /import\s+WebGL\s+from\s+['"]three\/addons\/capabilities\/WebGL\.js['"]/, 'WebGL capability import required');
  assert.ok(js.includes('WebGL.isWebGL2Available()'), 'WebGL.isWebGL2Available() check required');
  assert.ok(js.includes('您的浏览器不支持 WebGL 2'), 'custom Chinese fallback message required');
  const fbIdx = js.indexOf('您的浏览器不支持 WebGL 2');
  const renIdx = js.search(/new\s+(THREE\.)?WebGLRenderer\s*\(/);
  assert.ok(renIdx !== -1, 'WebGLRenderer construction expected in the bootstrap slice');
  assert.ok(fbIdx < renIdx, 'the fallback branch must run BEFORE the renderer is constructed');
  assert.ok(js.slice(fbIdx, renIdx).includes('return'), 'the fallback must return early (no renderer on the degradation path)');
  assert.ok(!js.includes('getWebGL2ErrorMessage'), 'the stock English WebGL2 message must not be used');
  assert.ok(!/does not seem to support/i.test(js), 'no English fallback text allowed');
});

test('SCENARIO-024 (AC-09) bootstrap contract: renderer pixelRatio clamp, DEFAULT_CAMERA_POS/DEFAULT_CAMERA_TARGET constants, OrbitControls with enableDamping, ONE rAF loop always calling clock.getDelta() with a placeholder starfield, resize listener, window.__ready = true', () => {
  const js = mustRead(mainJsPath, 'nuclear-fusion-3d/js/main.js');
  assert.match(js, /setPixelRatio\(\s*Math\.min\(\s*(window\.)?devicePixelRatio\s*,\s*2\s*\)\s*\)/, 'setPixelRatio(Math.min(devicePixelRatio, 2)) required');
  assert.ok(js.includes('DEFAULT_CAMERA_POS'), 'DEFAULT_CAMERA_POS constant required');
  assert.ok(js.includes('DEFAULT_CAMERA_TARGET'), 'DEFAULT_CAMERA_TARGET constant required');
  assert.ok(js.includes('OrbitControls'), 'OrbitControls import/usage required');
  assert.match(js, /enableDamping\s*[:=]\s*true/, 'OrbitControls.enableDamping = true required');
  assert.match(js, /new\s+(THREE\.)?Clock\s*\(/, 'THREE.Clock required');
  assert.match(js, /clock\.getDelta\(\)/, 'the rAF loop must call clock.getDelta()');
  const rafCount = (js.match(/requestAnimationFrame\s*\(/g) ?? []).length;
  assert.equal(rafCount, 1, `exactly ONE requestAnimationFrame call site required, found ${rafCount}`);
  assert.match(js, /\bstar/i, 'placeholder starfield background required');
  assert.match(js, /addEventListener\(\s*['"]resize['"]/, 'resize listener required');
  assert.match(js, /window\.__ready\s*=\s*true/, 'window.__ready = true at the end required');
});
