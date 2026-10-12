// ui.js — 页签条 / 拍进度 / 讲解面板 / 语言条 / 帮助弹窗（S2 统一骨架）
'use strict';

const I18N = {
  zh: {
    home: '🏠 首页',
    title: '🔭 观天仪器<small>OBSERVATORY · 我们怎么观测宇宙</small>',
    help: '❓ 帮助',
    schem: '⚠ 示意图 · 非实时数据',
    helpTitle: '🔭 观天仪器 · 帮助',
    helpClose: '关闭',
    playTitle: '空格 暂停/继续',
    nextTitle: '下一拍',
    resetTitle: '回到提问',
    camTitle: '重置视角 (R)',
    beats: ['提问', '方法', '你来玩'],
    hint: '它读的是 →',
    helpTable: [
      ['操作', '效果'],
      ['← / →', '切换页签（8 件仪器）'],
      ['↑ / ↓', '切换拍（提问 → 方法 → 你来玩）'],
      ['空格', '暂停 / 继续自动播放'],
      ['1 – 8', '直接跳到对应页签'],
      ['R', '重置当前场景视角'],
      ['拖拽 / 滚轮 / 双击', '旋转 / 缩放 / 复位视角'],
      ['H', '开/关本帮助']
    ],
    helpDesc: '所有 3D 场景均为<b style="color:var(--gold)">示意图</b>，结构与比例经简化，<b>非实时观测数据</b>。<br>每页签的「数据流水线」演示真实计算链：原始读数 → 应用方程 → 逐步算术 → 真实发表结果。<br>数字核对至 2026-09-16，来源见规格 <i>05-observatory-3d-animation-spec.md</i> 附录 11.1/11.3。'
  },
  en: {
    home: '🏠 Home',
    title: '🔭 Astronomical Instruments<small>OBSERVATORY · How We Observe the Universe</small>',
    help: '❓ Help',
    schem: '⚠ Schematic · Non-realtime data',
    helpTitle: '🔭 Instruments · Help',
    helpClose: 'Close',
    playTitle: 'Space Pause/Play',
    nextTitle: 'Next Beat',
    resetTitle: 'Back to Question',
    camTitle: 'Reset Camera (R)',
    beats: ['Question', 'Method', 'Explore'],
    hint: 'Observed →',
    helpTable: [
      ['Action', 'Result'],
      ['← / →', 'Switch tabs (8 instruments)'],
      ['↑ / ↓', 'Switch beats (Question → Method → Explore)'],
      ['Space', 'Pause / Resume autoplay'],
      ['1 – 8', 'Jump directly to tab 1–8'],
      ['R', 'Reset camera view'],
      ['Drag / Scroll / DblClick', 'Rotate / Zoom / Reset camera'],
      ['H', 'Toggle this help modal']
    ],
    helpDesc: 'All 3D scenes are <b style="color:var(--gold)">schematic illustrations</b> with simplified structures, <b>not real-time telemetry</b>.<br>The "Data Pipeline" illustrates the authentic calculation chain: Raw Detector → Equation → Stepwise Math → Published Result.<br>Verified to 2026-09-16 astrophysics references.'
  }
};

const UI = {
  el: {}, played: {},   // 已玩过页签（内存标记，§4.1）

  init(root) {
    const $ = s => root.querySelector(s);
    this.el = { root,
      tabBar: $('#tabBar'), tabTitle: $('#tabTitle'),
      beatBar: $('#beatBar'), beatDot: $('#beatDots'),
      panel: $('#panelBody'), pipeline: $('#pipelineBox'),
      langBar: $('#langBar'), badge: $('#schemBadge'),
      fps: $('#fps'), help: $('#helpModal'), toast: $('#toast'),
      labelLayer: $('#labelLayer')
    };
    this.buildTabs();
    this.buildLangBar();
    return this;
  },

  // ── 页签条：8 页签按组色分组 ─────────────────────────────────────────
  buildTabs() {
    const bar = this.el.tabBar;
    if (!bar) return;
    bar.innerHTML = '';
    const { TABS, GROUPS } = APP.DATA;
    const isEn = APP.lang === 'en';
    let lastGroup = null;
    TABS.forEach((t, i) => {
      if (t.group !== lastGroup) {
        const sep = document.createElement('span');
        sep.className = 'tab-sep';
        sep.style.borderColor = GROUPS[t.group].color;
        bar.appendChild(sep);
        lastGroup = t.group;
      }
      const b = document.createElement('button');
      b.className = 'tab-btn';
      b.dataset.tab = t.id;
      b.style.setProperty('--gc', GROUPS[t.group].color);
      const name = isEn ? (t.enName || t.name) : t.name;
      const q = isEn ? (t.enQ || t.q) : t.q;
      b.innerHTML = '<span class="tab-ico">' + t.icon + '</span><span class="tab-nm">' + name + '</span><span class="tab-ok">✓</span>';
      b.title = q;
      b.addEventListener('click', () => APP.app.setTab(t.id));
      bar.appendChild(b);
    });
  },

  markPlayed(id) {
    this.played[id] = true;
    const b = this.el.tabBar.querySelector('.tab-btn[data-tab="' + id + '"]');
    if (b) b.classList.add('played');
  },

  setActive(id) {
    const { TABS, GROUPS } = APP.DATA;
    const t = TABS.find(x => x.id === id);
    if (!this.el.tabBar) return;
    this.el.tabBar.querySelectorAll('.tab-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === id));
    if (!t) return;
    const gc = GROUPS[t.group].color;
    document.body.style.setProperty('--group', gc);
    const isEn = APP.lang === 'en';
    const name = isEn ? (t.enName || t.name) : t.name;
    const q = isEn ? (t.enQ || t.q) : t.q;
    if (this.el.tabTitle) this.el.tabTitle.textContent = t.icon + ' ' + name + ' · ' + q;
  },

  // ── 拍进度：3 拍分段可点击 ─────────────────────────────────────────────
  buildBeats() {
    const bar = this.el.beatBar;
    if (!bar) return;
    bar.innerHTML = '';
    const isEn = APP.lang === 'en';
    const names = isEn ? ['Question', 'Method', 'Explore'] : ['提问', '方法', '你来玩'];
    for (let i = 0; i < 3; i++) {
      const b = document.createElement('button');
      b.className = 'beat-seg';
      b.dataset.beat = i + 1;
      b.innerHTML = '<span class="beat-no">' + (i + 1) + '</span><span class="beat-nm">' + names[i] + '</span>';
      b.addEventListener('click', () => APP.app.setBeat(i + 1));
      bar.appendChild(b);
    }
  },
  setBeat(b, auto) {
    if (!this.el.beatBar) return;
    this.el.beatBar.querySelectorAll('.beat-seg').forEach(s =>
      s.classList.toggle('active', +s.dataset.beat === b));
    this.el.beatBar.classList.toggle('auto', !!auto);
  },

  // ── 语言条：四芯片（S4）─────────────────────────────────────────────
  buildLangBar() {
    const bar = this.el.langBar;
    if (!bar) return;
    bar.innerHTML = '';
    const { OBSERV_META } = APP.DATA;
    const isEn = APP.lang === 'en';
    const hint = document.createElement('span');
    hint.className = 'lang-hint'; hint.textContent = isEn ? 'Observed →' : '它读的是 →';
    bar.appendChild(hint);
    for (const k in OBSERV_META) {
      const c = document.createElement('span');
      c.className = 'lang-chip'; c.dataset.k = k;
      const lbl = isEn ? (OBSERV_META[k].enLabel || OBSERV_META[k].label) : OBSERV_META[k].label;
      const unit = isEn ? (OBSERV_META[k].enUnit || OBSERV_META[k].unit) : OBSERV_META[k].unit;
      c.innerHTML = lbl + '<em>' + unit + '</em>';
      bar.appendChild(c);
    }
  },
  setLang(obs) {
    if (!this.el.langBar) return;
    this.el.langBar.querySelectorAll('.lang-chip').forEach(c =>
      c.classList.toggle('on', obs ? obs.indexOf(c.dataset.k) >= 0 : false));
  },

  // ── 讲解面板 ────────────────────────────────────────────────────────
  setPanel(html) { if (this.el.panel) this.el.panel.innerHTML = html; },

  // ── 帮助弹窗 ────────────────────────────────────────────────────────
  toggleHelp(force) {
    const h = this.el.help;
    if (!h) return;
    const open = force !== undefined ? force : !h.classList.contains('open');
    h.classList.toggle('open', open);
  },

  // ── toast ───────────────────────────────────────────────────────────
  toast(msg, dur) {
    const t = this.el.toast;
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this._tt);
    this._tt = setTimeout(() => t.classList.remove('show'), dur || 1600);
  }
};

window.APP = window.APP || {};
APP.UI = UI;

APP.setLang = function(lang) {
  if (lang !== 'zh' && lang !== 'en') return;
  APP.lang = lang;
  try {
    localStorage.setItem('science_lang', lang);
    const u = new URL(window.location);
    u.searchParams.set('lang', lang);
    window.history.replaceState({}, '', u);
  } catch(e) {}
  document.documentElement.lang = (lang === 'zh' ? 'zh-CN' : 'en');
  document.documentElement.classList.remove('i18n-loading');

  const homeBtn = document.getElementById('homeBtn');
  if (homeBtn) {
    homeBtn.href = '../index.html?lang=' + lang;
    homeBtn.innerHTML = lang === 'en' ? '🏠 Home' : '🏠 首页';
  }
  const bZh = document.getElementById('btnLangZh');
  const bEn = document.getElementById('btnLangEn');
  if (bZh) bZh.classList.toggle('active', lang === 'zh');
  if (bEn) bEn.classList.toggle('active', lang === 'en');

  const dict = I18N[lang] || I18N.zh;
  const titleEl = document.getElementById('title');
  if (titleEl) titleEl.innerHTML = dict.title;
  const helpBtn = document.getElementById('helpBtn');
  if (helpBtn) helpBtn.textContent = dict.help;
  const schemBadge = document.getElementById('schemBadge');
  if (schemBadge) schemBadge.textContent = dict.schem;

  const bPlay = document.getElementById('beatPlay');
  if (bPlay) bPlay.title = dict.playTitle;
  const bNext = document.getElementById('beatNext');
  if (bNext) bNext.title = dict.nextTitle;
  const bReset = document.getElementById('beatReset');
  if (bReset) bReset.title = dict.resetTitle;
  const cReset = document.getElementById('camReset');
  if (cReset) cReset.title = dict.camTitle;

  const helpModal = document.getElementById('helpModal');
  if (helpModal) {
    const h3 = helpModal.querySelector('h3');
    if (h3) h3.textContent = dict.helpTitle;
    const trs = helpModal.querySelectorAll('table tr');
    if (trs && trs.length > 0 && dict.helpTable) {
      dict.helpTable.forEach((row, rIdx) => {
        if (trs[rIdx]) {
          const cells = trs[rIdx].children;
          if (cells[0]) cells[0].textContent = row[0];
          if (cells[1]) cells[1].textContent = row[1];
        }
      });
    }
    const p = helpModal.querySelector('p');
    if (p) p.innerHTML = dict.helpDesc;
    const hClose = document.getElementById('helpClose');
    if (hClose) hClose.textContent = dict.helpClose;
  }

  UI.buildTabs();
  UI.buildBeats();
  UI.buildLangBar();
  if (APP.app && APP.app.tab) {
    UI.setActive(APP.app.tab);
    const meta = APP.DATA.TABS.find(t => t.id === APP.app.tab);
    if (meta) UI.setLang(meta.observ);
    APP.app.setTab(APP.app.tab, { beat: APP.app.beat });
  }
};
