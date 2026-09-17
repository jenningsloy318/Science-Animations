/* ============================================================================
 * ui.js — premium dark UI: tabs, system switches, stage chips, transport,
 * education panel, per-view legends, help modal, toasts, ZH/EN toggle.
 * All copy resolves through APP.L() / APP.tr() at render time, so the whole
 * UI can be re-rendered live when the language flips.
 * ==========================================================================*/
(function () {
  const U = APP.U;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const tr = APP.tr, L = APP.L;

  APP.UI = { init };

  let appRef = null;

  function init(app) {
    appRef = app;
    buildSystemsList(app);
    buildStageChips(app);
    wireTabs(app);
    wireTransport(app);
    wireRing(app);
    wireCollision(app);
    wireHelp();
    wireLang(app);
    applyLang(app);
    showEdu(app, 'overview');
  }

  /* ---------------- language ----------------------------------------------*/
  function wireLang(app) {
    const setLang = (lang) => {
      if (APP.lang === lang) return;
      APP.lang = lang;
      try { localStorage.setItem('collider_lang', lang); } catch (e) {}
      applyLang(app);
      showEdu(app, APP.UI._edu ? APP.UI._edu.kind : 'overview', APP.UI._edu && APP.UI._edu.sys);
      if (APP.app && APP.app.collision && APP.app.collision.refreshCaption) APP.app.collision.refreshCaption();
      APP.UI.toast(tr('toast.lang'));
    };
    const zhBtn = $('#btnLangZh'), enBtn = $('#btnLangEn');
    if (zhBtn) zhBtn.addEventListener('click', () => setLang('zh'));
    if (enBtn) enBtn.addEventListener('click', () => setLang('en'));
  }

  function applyLang(app) {
    document.documentElement.lang = APP.lang === 'zh' ? 'zh-CN' : 'en';
    const zhBtn = $('#btnLangZh'), enBtn = $('#btnLangEn');
    if (zhBtn) zhBtn.classList.toggle('active', APP.lang === 'zh');
    if (enBtn) enBtn.classList.toggle('active', APP.lang === 'en');
    /* tabs */
    $$('.tab').forEach((t) => { t.textContent = tr('tab.' + t.dataset.view); });
    /* chrome */
    const brandH1 = $('.brand h1');
    if (brandH1) brandH1.textContent = tr('brand.title');
    $('.brand p').textContent = tr('brand.sub');
    $('#leftPanel h2').textContent = tr('panel.systems');
    $('#leftPanel .panelnote').textContent = tr('panel.note');
    $('#rightPanel h2').textContent = tr('panel.edu');
    $('#disclaimer').textContent = L().disclaimer;
    $('#aboutText').textContent = L().about;
    $('#statsParts').textContent = U.fmt(appRef.detector.total) + tr('stats.parts');
    $('#btnOverview').textContent = tr('btn.assemble');
    const cutBtn = $('#btnCutaway');
    if (cutBtn) cutBtn.textContent = tr('btn.cutaway');
    $('#btnFlight').innerHTML = tr('btn.flight');
    $('#btnTrigger').textContent = tr('btn.trigger');
    const autoLbl = $('#chkAuto');
    if (autoLbl) {
      const tn = [...autoLbl.parentElement.childNodes].find((n) => n.nodeType === 3);
      if (tn) tn.textContent = ' ' + tr('autorenew');
    }
    $('#ringbar .sliderRow').childNodes[0].textContent = tr('beamspeed') + ' ';
    $('#ringbar .hint').textContent = tr('hint.ring');
    $('#collbar .badge').textContent = tr('badge');
    /* evstats labels: first text node of each span */
    $$('#collbar .evstats span').forEach((sp) => {
      const b = sp.querySelector('b');
      let label = '';
      if (b && b.id === 'evNum') label = tr('ev.event') + ' ';
      else if (b && b.id === 'evTracks') label = tr('ev.tracks') + ' ';
      else if (b && b.id === 'evJets') label = tr('ev.jets') + ' ';
      else if (b && b.id === 'evEt') label = '\u03A3E';   /* the <sub>T</sub> after it stays untouched */
      else if (b && b.id === 'evMuons') label = tr('ev.muons') + ' ';
      sp.childNodes[0].textContent = label;
    });
    /* help modal */
    $('#helpClose').textContent = tr('btn.close');
    const hs = $$('#helpModal h2');
    if (hs.length >= 3) { hs[0].textContent = tr('help.about'); hs[1].textContent = tr('help.controls'); hs[2].textContent = tr('help.refs'); }
    $('.helpfoot').textContent = tr('help.foot');
    const rows = [
      ['ctl.cutaway', 'ctl.cutaway.d'],
      ['ctl.scroll', 'ctl.scroll.d'], ['ctl.drag', 'ctl.drag.d'], ['ctl.wheel', 'ctl.wheel.d'],
      ['ctl.space', 'ctl.space.d'], ['ctl.arrows', 'ctl.arrows.d'], ['ctl.views', 'ctl.views.d'],
      ['ctl.fe', 'ctl.fe.d'], ['ctl.esc', 'ctl.esc.d']
    ];
    $('#controlsRows').innerHTML = rows
      .map(([a, b]) => `<tr><td>${tr(a)}</td><td>${tr(b)}</td></tr>`).join('');
    $('#creditLinks').innerHTML = L().credits.map((c) => `<li><a href="${c.u}" target="_blank" rel="noopener">${c.t}</a></li>`).join('');
    /* dynamic panels */
    buildSystemsList(app);
    buildStageChips(app);
    buildEvChips(app);
    buildPhasePills(app);
    const st = $('#storyTitle');
    if (st) st.textContent = tr('story.title');
    storyKey = '';                       /* re-render the log with new strings */
    setLegend('ring', ringLegend());
    setLegend('collision', collisionLegend());
    /* force syncPlayback to rewrite cached strings */
    APP.UI.syncPlayback._sn = null;
    APP.UI.updateStageEdu._k = null;
  }
  APP.UI.applyLang = applyLang;

  /* ---------------- systems list ------------------------------------------*/
  function buildSystemsList(app) {
    const box = $('#systemsList');
    const checked = {};
    $$('#systemsList input[data-sys]').forEach((i) => { checked[i.dataset.sys] = i.checked; });
    box.innerHTML = '';
    for (const s of L().systems) {
      const rendered = app.detector.systems[s.id] ? app.detector.systems[s.id].count : 0;
      const row = document.createElement('div');
      row.className = 'sysrow';
      row.innerHTML = `
        <span class="dot" style="background:${s.color}"></span>
        <label class="sysname" title="${s.real.replace(/"/g, '&quot;')}">
          <input type="checkbox" ${checked[s.id] === false ? '' : 'checked'} data-sys="${s.id}"><span>${s.name}</span>
        </label>
        <span class="syscount" title="${s.real.replace(/"/g, '&quot;')}">${U.fmt(rendered)}</span>`;
      row.querySelector('input').addEventListener('change', (e) => {
        app.setSystemVisible(s.id, e.target.checked);
      });
      row.querySelector('.sysname').addEventListener('click', (e) => {
        if (e.target.tagName === 'INPUT') return;
        APP.UI.updateStageEdu._k = null;
        app.focusSystem(s.id);
        showEdu(app, 'system', s);
      });
      box.appendChild(row);
    }
    const actions = document.createElement('div');
    actions.className = 'sysactions';
    actions.innerHTML = `<button class="btn mini" id="sysAll">${tr('btn.all')}</button>
                         <button class="btn mini" id="sysNone">${tr('btn.solo')}</button>`;
    box.appendChild(actions);
    actions.querySelector('#sysAll').addEventListener('click', () => {
      $$('#systemsList input[data-sys]').forEach(i => { i.checked = true; app.setSystemVisible(i.dataset.sys, true); });
    });
    actions.querySelector('#sysNone').addEventListener('click', () => {
      $$('#systemsList input[data-sys]').forEach(i => {
        const on = i.dataset.sys === 'pixel' || i.dataset.sys === 'pipe';
        i.checked = on; app.setSystemVisible(i.dataset.sys, on);
      });
    });
  }

  /* ---------------- stage chips + scrubber ---------------------------------*/
  function buildStageChips(app) {
    const box = $('#stageChips');
    box.innerHTML = '';
    L().stages.forEach((st, i) => {
      const b = document.createElement('button');
      b.className = 'chip';
      b.innerHTML = `<b>${i + 1}</b>${st.chip}`;
      b.addEventListener('click', () => app.gotoStage(i + 1));
      box.appendChild(b);
    });
  }

  function wireTransport(app) {
    $('#btnPlay').addEventListener('click', () => app.togglePlay());
    $('#btnReverse').addEventListener('click', () => app.toggleReverse());
    $$('.dur').forEach(b => b.addEventListener('click', () => {
      $$('.dur').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      app.setDuration(parseFloat(b.dataset.dur));
    }));
    const scrub = $('#scrub');
    scrub.addEventListener('input', () => { app.scrubTo(scrub.value / 1000); });
    $('#btnOverview').addEventListener('click', () => app.gotoStage(0));
    const cutBtn = $('#btnCutaway');
    if (cutBtn) cutBtn.addEventListener('click', () => { if (app.toggleCutaway) app.toggleCutaway(); });
  }

  /* ---------------- tabs ---------------------------------------------------*/
  function wireTabs(app) {
    $$('.tab').forEach(t => t.addEventListener('click', () => app.setView(t.dataset.view)));
    $$('.tab').forEach(t => {
      t.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') app.setView(t.dataset.view); });
    });
  }

  /* ---------------- ring view ----------------------------------------------*/
  function wireRing(app) {
    $('#btnFlight').addEventListener('click', () => app.startFlight());
    const sp = $('#beamSpeed');
    sp.addEventListener('input', () => app.setBeamSpeed(parseFloat(sp.value)));
  }

  /* ---------------- collision view -----------------------------------------*/
  function buildEvChips(app) {
    const box = $('#evChips');
    if (!box) return;
    box.innerHTML = '';
    const procs = L().collision.processes || {};
    (window.APP.PP ? APP.PP.TYPES : Object.keys(procs)).forEach((t) => {
      const pc = procs[t];
      if (!pc) return;
      const b = document.createElement('button');
      b.className = 'evchip';
      b.dataset.type = t;
      b.textContent = pc.chip;
      b.title = pc.sigma + (APP.lang === 'zh' ? '' : '' );
      b.addEventListener('click', () => app.triggerEvent(t));
      box.appendChild(b);
    });
    /* tooltip 补充实时产率 */
    if (window.APP.PP) {
      box.querySelectorAll('.evchip').forEach((b) => {
        const ev = APP.PP.makeEvent(b.dataset.type, 1);
        const r = APP.PP.ratePerS(ev.sigmaPb || 0);
        const rate = r >= 1 ? r.toFixed(r >= 10 ? 0 : 1) + '/s'
          : (r >= 1 / 60 ? (60 * r).toFixed(1) + '/min' : (3600 * r).toFixed(0) + '/h');
        b.title = (b.title ? b.title + ' · ' : '') + tr('ev.rate') + ' ≈ ' + rate;
      });
    }
  }

  function wireCollision(app) {
    $('#btnTrigger').addEventListener('click', () => app.triggerEvent());
    $('#chkAuto').addEventListener('change', (e) => app.setAuto(e.target.checked));
    buildEvChips(app);
    buildPhasePills(app);
    $('#btnCollPause').addEventListener('click', () => {
      const info = app.eventInfo();
      app.setCollPaused(!info.paused);
      APP.UI.toast(tr(!info.paused ? 'coll.pause' : 'coll.play'));
    });
    setInterval(() => {
      if (document.body.dataset.view !== 'collision') return;
      const info = app.eventInfo();
      $('#evNum').textContent = '#' + info.num;
      $('#evTracks').textContent = info.tracks;
      $('#evJets').textContent = info.jets;
      $('#evEt').textContent = info.sumET.toFixed(1);
      $('#evMuons').textContent = info.muons;
      syncPhasePills(info);
      const pb = $('#btnCollPause');
      const lbl = info.paused ? tr('coll.play') : tr('coll.pause');
      if (pb.textContent !== lbl) pb.textContent = lbl;
      const massTxt = info.mass
        ? `${info.mass.label} ${info.mass.value.toFixed(1)}${info.mass.truthName ? ' ≈ ' + info.mass.truthName : ''}` : '–';
      const massEl = $('#evMass');
      if (massEl.textContent !== massTxt) {
        massEl.textContent = massTxt;
        massEl.classList.remove('reveal');
        void massEl.offsetWidth;               /* restart the CSS animation */
        if (info.mass) massEl.classList.add('reveal');
      }
      $$('#evChips .evchip').forEach((c) => c.classList.toggle('active', c.dataset.type === info.type));
      syncStoryLog(info);
    }, 400);
  }

  /* ---------------- right-panel story log -----------------------------------*/
  let storyKey = '';
  function syncStoryLog(info) {
    if (!info.story || !info.story.length) return;
    const key = info.num + '|' + info.phase + '|' + info.story.map((e) => e.cap ? 1 : 0).join('');
    if (key === storyKey) return;
    storyKey = key;
    const log = $('#storyLog');
    if (!log) return;
    log.innerHTML = '';
    const curIdx = info.story.findIndex((e) => e.phase === info.phase);
    info.story.forEach((e, i) => {
      const li = document.createElement('li');
      if (i < curIdx) li.className = 'done';
      else if (i === curIdx) li.className = 'current';
      /* future steps: title only (no spoiler); reached steps: full text */
      li.innerHTML = `<b>${tr('ph.' + e.phase)}</b>${i <= curIdx ? e.cap || '' : ''}`;
      li.title = tr('ph.hint');
      li.addEventListener('click', () => appRef.collGotoPhase(e.phase));
      log.appendChild(li);
    });
    const cur = log.querySelector('.current');
    if (cur) cur.scrollIntoView({ block: 'nearest' });
  }

  /* ---------------- collision story phase pills -----------------------------*/
  const PHASE_ORDER = ['approach', 'impact', 'flight', 'readout', 'done'];
  function buildPhasePills(app) {
    const box = $('#phasePills');
    if (!box) return;
    box.innerHTML = '';
    box.title = tr('ph.hint');
    PHASE_ORDER.forEach((ph) => {
      const b = document.createElement('button');
      b.className = 'phase-pill';
      b.dataset.phase = ph;
      b.textContent = tr('ph.' + ph);
      b.addEventListener('click', () => app.collGotoPhase(ph));
      box.appendChild(b);
    });
  }
  function syncPhasePills(info) {
    const cur = PHASE_ORDER.indexOf(info.phase);
    $$('#phasePills .phase-pill').forEach((b, i) => {
      b.classList.toggle('active', i === cur);
      b.classList.toggle('done', cur >= 0 && i < cur);
    });
  }

  /* ---------------- education panel ----------------------------------------*/
  function showEdu(app, kind, sys) {
    APP.UI._edu = { kind, sys };
    const t = $('#eduTitle'), b = $('#eduBody'), f = $('#eduFacts');
    if (kind === 'overview' || kind === 'stage') {
      const st = kind === 'overview' ? L().overview : L().stages[app.stageIndex()];
      t.textContent = st.title; b.textContent = st.body;
      f.innerHTML = st.facts.map(x => `<li>${x}</li>`).join('');
    } else if (kind === 'system') {
      t.textContent = sys.name; b.textContent = sys.blurb;
      f.innerHTML = sys.facts.map(x => `<li>${x}</li>`).join('') +
        `<li class="srcline">${APP.lang === 'zh' ? '真实探测器：' : 'Real detector: '}${sys.real}</li>`;
    } else if (kind === 'ring') {
      const R = L().ring;
      t.textContent = R.title; b.textContent = R.body;
      f.innerHTML = R.facts.map(x => `<li>${x}</li>`).join('');
    } else if (kind === 'collision') {
      const C = L().collision;
      t.textContent = C.title; b.textContent = C.body;
      f.innerHTML = C.facts.map(x => `<li>${x}</li>`).join('') +
        `<li class="srcline">${L().triggerNote}</li>`;
    }
  }
  APP.UI.showEduForView = (view) => {
    if (view === 'ring') showEdu(null, 'ring');
    else if (view === 'collision') showEdu(null, 'collision');
    else showEdu(null, 'overview');
  };
  APP.UI.updateStageEdu = (app, stageIdx) => {
    if (document.body.dataset.view !== 'detector') return;
    const key = 'stage:' + stageIdx + ':' + APP.lang;
    if (APP.UI.updateStageEdu._k === key) return;
    APP.UI.updateStageEdu._k = key;
    showEdu(app, stageIdx < 0 ? 'overview' : 'stage');
  };
  APP.UI.syncPlayback = (pb) => {
    /* cached DOM writes — called every frame during playback */
    const scrub = $('#scrub');
    const sv = Math.round(pb.t * 1000);
    if (APP.UI.syncPlayback._sv !== sv) { scrub.value = sv; scrub.style.setProperty('--fill', (sv / 10) + '%'); APP.UI.syncPlayback._sv = sv; }
    const tv = Math.round(pb.t * 100) + '%';
    if (APP.UI.syncPlayback._tv !== tv) { $('#tReadout').textContent = tv; APP.UI.syncPlayback._tv = tv; }
    if (APP.UI.syncPlayback._playing !== pb.playing) {
      $('#btnPlay').innerHTML = pb.playing
        ? '<svg viewBox="0 0 24 24" width="15" height="15"><path fill="currentColor" d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>'
        : '<svg viewBox="0 0 24 24" width="15" height="15"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>';
      APP.UI.syncPlayback._playing = pb.playing;
    }
    $('#btnReverse').classList.toggle('active', pb.dir < 0);
    const idx = stageIndex(pb.t);
    const active = pb.t > 0.0001;
    $$('#stageChips .chip').forEach((c, i) => c.classList.toggle('active', active && i === idx));
    const sn = !active ? tr('stage.assembled')
      : tr('stage.fmt').replace('{n}', idx + 1).replace('{chip}', L().stages[idx].chip);
    if (APP.UI.syncPlayback._sn !== sn) { $('#stageName').textContent = sn; APP.UI.syncPlayback._sn = sn; }
  };
  function stageIndex(t) { return U.clamp(Math.ceil(t * 6) - 1, 0, 5); }

  /* ---------------- legends ------------------------------------------------*/
  function setLegend(view, html) {
    const el = document.getElementById('legend-' + view);
    if (el) el.innerHTML = `<h2>${tr(view === 'ring' ? 'legend.ring' : 'legend.collision')}</h2>` + html;
  }
  function ringLegend() {
    const R = L().ring;
    return `
      <div class="legrow"><span class="swatch" style="background:#d8b25c"></span>${R.legendBeamA}</div>
      <div class="legrow"><span class="swatch" style="background:#6fd3e8"></span>${R.legendBeamB}</div>
      <div class="legnote">${tr('leg.note')}</div>`;
  }
  function collisionLegend() {
    return `
      <div class="legrow"><span class="swatch" style="background:#bfd8ea"></span>${tr('leg.hadron')}</div>
      <div class="legrow"><span class="swatch" style="background:#6fe3c4"></span>${tr('leg.em')}</div>
      <div class="legrow"><span class="swatch" style="background:#e8c874"></span>${tr('leg.muon')}</div>
      <div class="legrow"><span class="swatch" style="background:#d8b25c"></span>${tr('leg.jet')}</div>
      <div class="legrow"><span class="swatch" style="background:#e8eaed"></span>${tr('leg.met')}</div>
      <div class="legnote">${L().collision.badge}.</div>`;
  }

  /* ---------------- help modal ---------------------------------------------*/
  function wireHelp() {
    const modal = $('#helpModal');
    $('#btnHelp').addEventListener('click', () => modal.classList.add('open'));
    $('#helpClose').addEventListener('click', () => modal.classList.remove('open'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });
  }

  /* ---------------- toast ---------------------------------------------------*/
  let toastTimer = null;
  APP.UI.toast = (msg) => {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  };
})();
