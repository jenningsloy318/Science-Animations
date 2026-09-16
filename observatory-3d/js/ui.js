// ui.js — 页签条 / 拍进度 / 讲解面板 / 语言条 / 帮助弹窗（S2 统一骨架）
'use strict';

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
    bar.innerHTML = '';
    const { TABS, GROUPS } = APP.DATA;
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
      b.innerHTML = '<span class="tab-ico">' + t.icon + '</span><span class="tab-nm">' + t.name + '</span><span class="tab-ok">✓</span>';
      b.title = t.q;
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
    this.el.tabBar.querySelectorAll('.tab-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === id));
    if (!t) return;
    const gc = GROUPS[t.group].color;
    document.body.style.setProperty('--group', gc);
    this.el.tabTitle.textContent = t.icon + ' ' + t.name + ' · ' + t.q;
  },

  // ── 拍进度：3 拍分段可点击 ─────────────────────────────────────────────
  buildBeats() {
    const bar = this.el.beatBar;
    bar.innerHTML = '';
    const names = ['提问', '方法', '你来玩'];
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
    this.el.beatBar.querySelectorAll('.beat-seg').forEach(s =>
      s.classList.toggle('active', +s.dataset.beat === b));
    this.el.beatBar.classList.toggle('auto', !!auto);
  },

  // ── 语言条：四芯片（S4）─────────────────────────────────────────────
  buildLangBar() {
    const bar = this.el.langBar;
    bar.innerHTML = '';
    const { OBSERV_META } = APP.DATA;
    const hint = document.createElement('span');
    hint.className = 'lang-hint'; hint.textContent = '它读的是 →';
    bar.appendChild(hint);
    for (const k in OBSERV_META) {
      const c = document.createElement('span');
      c.className = 'lang-chip'; c.dataset.k = k;
      c.innerHTML = OBSERV_META[k].label + '<em>' + OBSERV_META[k].unit + '</em>';
      bar.appendChild(c);
    }
  },
  setLang(obs) {
    this.el.langBar.querySelectorAll('.lang-chip').forEach(c =>
      c.classList.toggle('on', obs ? obs.indexOf(c.dataset.k) >= 0 : false));
  },

  // ── 讲解面板 ────────────────────────────────────────────────────────
  setPanel(html) { this.el.panel.innerHTML = html; },

  // ── 帮助弹窗 ────────────────────────────────────────────────────────
  toggleHelp(force) {
    const h = this.el.help;
    const open = force !== undefined ? force : !h.classList.contains('open');
    h.classList.toggle('open', open);
  },

  // ── toast ───────────────────────────────────────────────────────────
  toast(msg, dur) {
    const t = this.el.toast;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this._tt);
    this._tt = setTimeout(() => t.classList.remove('show'), dur || 1600);
  }
};

window.APP = window.APP || {};
APP.UI = UI;
