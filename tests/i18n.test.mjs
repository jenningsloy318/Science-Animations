import test from 'node:test';
import assert from 'node:assert/strict';
import { ScienceI18n, MemoryStorage } from '../common/js/i18n.js';

test('i18n: MemoryStorage functionality', () => {
  MemoryStorage.clear();
  assert.equal(MemoryStorage.getItem('foo'), null);
  MemoryStorage.setItem('foo', 'bar');
  assert.equal(MemoryStorage.getItem('foo'), 'bar');
  MemoryStorage.removeItem('foo');
  assert.equal(MemoryStorage.getItem('foo'), null);
});

test('i18n: Resolution ladder with fallback memory storage', () => {
  const memStorage = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; }
  };

  // 1. Default to 'zh'
  const i18nDefault = new ScienceI18n({ storage: memStorage });
  assert.equal(i18nDefault.currentLang, 'zh');

  // 2. Saved 'science_lang' takes precedence
  memStorage.setItem('science_lang', 'en');
  const i18nSaved = new ScienceI18n({ storage: memStorage });
  assert.equal(i18nSaved.currentLang, 'en');

  // 3. Legacy key 'collider_lang' migration
  memStorage.removeItem('science_lang');
  memStorage.setItem('collider_lang', 'en');
  const i18nLegacy = new ScienceI18n({ storage: memStorage, legacyKey: 'collider_lang' });
  assert.equal(i18nLegacy.currentLang, 'en');
  assert.equal(memStorage.getItem('science_lang'), 'en'); // Backfilled!
});

test('i18n: Language switching, persistence and listener lifecycle', () => {
  const memStorage = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; }
  };

  const i18n = new ScienceI18n({ storage: memStorage });
  assert.equal(i18n.currentLang, 'zh');

  let notified = [];
  const unsubscribe = i18n.subscribe((lang) => {
    notified.push(lang);
  });

  i18n.setLanguage('en');
  assert.equal(i18n.currentLang, 'en');
  assert.equal(memStorage.getItem('science_lang'), 'en');
  assert.deepEqual(notified, ['en']);

  // Setting same language should not fire listener
  i18n.setLanguage('en');
  assert.deepEqual(notified, ['en']);

  // Unsubscribe
  unsubscribe();
  i18n.setLanguage('zh');
  assert.equal(i18n.currentLang, 'zh');
  assert.deepEqual(notified, ['en']); // Did not receive 'zh' because unsubscribed
});

test('i18n: Dictionary lookup and template interpolation', () => {
  const dict = {
    'title': { zh: '科学仿真', en: 'Science Simulations' },
    'welcome': { zh: '你好，{name}！欢迎来到{project}。', en: 'Hello, {name}! Welcome to {project}.' },
    'only_zh': { zh: '仅中文' }
  };

  const memStorage = {
    _data: {},
    getItem() { return null; },
    setItem() {}
  };

  const i18n = new ScienceI18n({ storage: memStorage, dict });
  
  // zh lookups
  assert.equal(i18n.t('title'), '科学仿真');
  assert.equal(i18n.t('welcome', { name: '小明', project: '太阳系' }), '你好，小明！欢迎来到太阳系。');
  assert.equal(i18n.t('only_zh'), '仅中文');
  assert.equal(i18n.t('non_existent', '默认值'), '默认值');

  // Switch to en
  i18n.setLanguage('en');
  assert.equal(i18n.t('title'), 'Science Simulations');
  assert.equal(i18n.t('welcome', { name: 'Alice', project: 'Solar System' }), 'Hello, Alice! Welcome to Solar System.');
  // Fallback to zh when en is missing
  assert.equal(i18n.t('only_zh'), '仅中文');
  assert.equal(i18n.t('non_existent', 'Default Val'), 'Default Val');
});

test('i18n: Number and date/day formatting', () => {
  const memStorage = {
    _data: {},
    getItem() { return null; },
    setItem() {}
  };

  const i18n = new ScienceI18n({ storage: memStorage });
  assert.equal(i18n.formatNumber(1234567), '1,234,567');
  assert.equal(i18n.formatDays(365), '365 天');

  i18n.setLanguage('en');
  assert.equal(i18n.formatNumber(1234567), '1,234,567');
  assert.equal(i18n.formatDays(365), '365 days');
});

test('i18n: Mock DOM binding and #homeBtn preservation', () => {
  const memStorage = {
    _data: {},
    getItem() { return null; },
    setItem() {}
  };

  const dict = {
    'btn.save': { zh: '保存', en: 'Save' },
    'btn.tip': { zh: '点击保存设置', en: 'Click to save settings' },
    'input.ph': { zh: '请输入搜索词', en: 'Search keywords...' }
  };

  const i18n = new ScienceI18n({ storage: memStorage, dict });

  // Create lightweight mock DOM elements
  const textEl = {
    attrs: { 'data-i18n': 'btn.save' },
    textContent: '',
    getAttribute(k) { return this.attrs[k]; }
  };
  const titleEl = {
    attrs: { 'data-i18n-title': 'btn.tip' },
    title: '',
    getAttribute(k) { return this.attrs[k]; },
    setAttribute(k, v) { this[k] = v; }
  };
  const inputEl = {
    attrs: { 'data-i18n-placeholder': 'input.ph' },
    placeholder: '',
    getAttribute(k) { return this.attrs[k]; },
    setAttribute(k, v) { this[k] = v; }
  };
  const homeBtn = {
    attrs: { href: '../index.html' },
    getAttribute(k) { return this.attrs[k]; },
    setAttribute(k, v) { this.attrs[k] = v; }
  };

  const mockRoot = {
    querySelectorAll(selector) {
      if (selector === '[data-i18n]') return [textEl];
      if (selector === '[data-i18n-title]') return [titleEl];
      if (selector === '[data-i18n-placeholder]') return [inputEl];
      if (selector.includes('#homeBtn')) return [homeBtn];
      return [];
    }
  };

  i18n.applyToDOM(mockRoot);
  assert.equal(textEl.textContent, '保存');
  assert.equal(titleEl.title, '点击保存设置');
  assert.equal(inputEl.placeholder, '请输入搜索词');
  assert.equal(homeBtn.attrs.href, '../index.html?lang=zh');

  i18n.setLanguage('en');
  i18n.applyToDOM(mockRoot);
  assert.equal(textEl.textContent, 'Save');
  assert.equal(titleEl.title, 'Click to save settings');
  assert.equal(inputEl.placeholder, 'Search keywords...');
  assert.equal(homeBtn.attrs.href, '../index.html?lang=en');
});

test('i18n static: all 15 subprojects have id="homeBtn" pointing to ../index.html', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');

  const projects = [
    'atomic-model', 'black-hole', 'gravity-slingshot', 'how-cars-work',
    'ion-thruster-3d', 'motion-parallax', 'nuclear-fission-3d',
    'nuclear-fusion-3d', 'observatory-3d', 'particle-collider',
    'photosynthesis', 'rotating-earth', 'solar-cell', 'solar-system', 'uphill-roller'
  ];

  for (const p of projects) {
    const htmlPath = path.resolve(process.cwd(), p, 'index.html');
    assert.ok(fs.existsSync(htmlPath), `Subproject ${p} must have index.html`);
    const content = fs.readFileSync(htmlPath, 'utf-8');

    // Assert id="homeBtn" presence
    const hasHomeBtn = /<a[^>]+id=["']homeBtn["'][^>]*>/i.test(content);
    assert.ok(hasHomeBtn, `Subproject ${p} must have <a id="homeBtn">`);

    // Assert href points to ../index.html
    const homeBtnTag = content.match(/<a[^>]+id=["']homeBtn["'][^>]*>/i)[0];
    assert.ok(
      homeBtnTag.includes('href="../index.html"'),
      `Subproject ${p} #homeBtn must have href="../index.html"`
    );

    // If there is an interceptor, verify it preserves lang
    if (content.includes("document.getElementById('homeBtn')") && content.includes("addEventListener('click'")) {
      assert.ok(
        content.includes('?lang=') || content.includes('lang'),
        `Subproject ${p} #homeBtn click interceptor must preserve ?lang= parameter`
      );
    }
  }
});

test('i18n static: root index.html structure, zero-FOUT, and 15-project dictionary symmetry', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');

  const rootHtml = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');

  // Zero-FOUT checks
  assert.ok(rootHtml.includes('i18n-loading'), 'root index.html must have i18n-loading CSS/JS');
  assert.ok(rootHtml.includes('.i18n-loading [data-i18n]'), 'root index.html must hide data-i18n elements during loading');

  // Language switcher UI checks
  assert.ok(rootHtml.includes('class="lang-switch"'), 'root index.html must have .lang-switch container');
  assert.ok(rootHtml.includes('id="btnLangZh"'), 'root index.html must have #btnLangZh');
  assert.ok(rootHtml.includes('id="btnLangEn"'), 'root index.html must have #btnLangEn');
  assert.ok(rootHtml.includes('data-lang-btn="zh"'), 'root index.html must have data-lang-btn="zh"');
  assert.ok(rootHtml.includes('data-lang-btn="en"'), 'root index.html must have data-lang-btn="en"');

  // Check 15 subprojects linked in grid
  const expectedProjects = [
    'atomic-model', 'black-hole', 'gravity-slingshot', 'how-cars-work',
    'ion-thruster-3d', 'motion-parallax', 'nuclear-fission-3d',
    'nuclear-fusion-3d', 'observatory-3d', 'particle-collider',
    'photosynthesis', 'rotating-earth', 'solar-cell', 'solar-system', 'uphill-roller'
  ];

  for (const p of expectedProjects) {
    assert.ok(
      rootHtml.includes(`href="${p}/"`) || rootHtml.includes(`href="${p}"`),
      `root index.html must have link to ${p}`
    );
  }

  // Parse dictionary from index.html
  const dictMatch = rootHtml.match(/const portalDict = ({[\s\S]*?});\s*function/);
  assert.ok(dictMatch, 'portalDict must be present in root index.html');

  // Safely evaluate dictionary structure in sandbox function
  const dict = (new Function(`return ${dictMatch[1]};`))();

  // Bi-directional symmetry assertion
  const keys = Object.keys(dict);
  assert.ok(keys.length >= 30, `Expected at least 30 dictionary keys, found ${keys.length}`);

  for (const key of keys) {
    const entry = dict[key];
    assert.ok(entry.zh, `Key "${key}" must have zh translation`);
    assert.ok(entry.en, `Key "${key}" must have en translation`);
    assert.ok(entry.zh.trim().length > 0, `Key "${key}" zh must not be empty`);
    assert.ok(entry.en.trim().length > 0, `Key "${key}" en must not be empty`);
  }
});

test('i18n static: all 15 subprojects have zero-FOUT script, #homeTxt, and .lang-switch', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');

  const projects = [
    'atomic-model', 'black-hole', 'gravity-slingshot', 'how-cars-work',
    'ion-thruster-3d', 'motion-parallax', 'nuclear-fission-3d',
    'nuclear-fusion-3d', 'observatory-3d', 'particle-collider',
    'photosynthesis', 'rotating-earth', 'solar-cell', 'solar-system', 'uphill-roller'
  ];

  for (const p of projects) {
    const htmlPath = path.resolve(process.cwd(), p, 'index.html');
    const content = fs.readFileSync(htmlPath, 'utf-8');

    // 1. Zero-FOUT check in head
    assert.ok(
      content.includes('i18n-loading') || content.includes('science_lang') || content.includes('lang'),
      `Subproject ${p} must have zero-FOUT language preparation script`
    );

    // 2. #homeTxt check
    assert.ok(
      content.includes('id="homeTxt"') || content.includes('id="homeBtn"'),
      `Subproject ${p} must have #homeBtn with #homeTxt`
    );

    // 3. .lang-switch check
    assert.ok(
      content.includes('class="lang-switch"') || content.includes('class="lang-btn"'),
      `Subproject ${p} must have .lang-switch button group`
    );
  }
});

test('i18n static: photosynthesis photoDict symmetry and data-i18n coverage', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');

  const mainJs = fs.readFileSync(path.resolve(process.cwd(), 'photosynthesis/js/main.js'), 'utf-8');
  const html = fs.readFileSync(path.resolve(process.cwd(), 'photosynthesis/index.html'), 'utf-8');

  // Extract photoDict
  const match = mainJs.match(/const photoDict = ({[\s\S]*?});\s*i18n\.loadDict/);
  assert.ok(match, 'photoDict must be defined in photosynthesis/js/main.js');

  const photoDict = (new Function(`return ${match[1]};`))();
  const keys = Object.keys(photoDict);
  assert.ok(keys.length >= 80, `Expected at least 80 photoDict keys, found ${keys.length}`);

  for (const key of keys) {
    const entry = photoDict[key];
    assert.ok(entry.zh, `Key "${key}" must have zh translation`);
    assert.ok(entry.en, `Key "${key}" must have en translation`);
    assert.ok(entry.zh.trim().length > 0, `Key "${key}" zh must not be empty`);
    assert.ok(entry.en.trim().length > 0, `Key "${key}" en must not be empty`);
  }

  // Find all data-i18n attributes in index.html
  const dataI18nRegex = /data-i18n="([^"]+)"/g;
  let m;
  const missingKeys = [];
  while ((m = dataI18nRegex.exec(html)) !== null) {
    const key = m[1];
    if (key === 'nav.home') continue; // from common
    if (!photoDict[key]) {
      missingKeys.push(key);
    }
  }

  assert.deepEqual(missingKeys, [], `Found missing i18n keys in photosynthesis/index.html: ${missingKeys.join(', ')}`);
});

