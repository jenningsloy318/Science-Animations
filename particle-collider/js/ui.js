/* ============================================================================
 * ui.js — premium dark UI: tabs, system switches, stage chips, transport,
 * education panel, per-view legends, help modal, toasts.
 * ==========================================================================*/
(function () {
  const U = APP.U, D = APP.DATA;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  APP.UI = { init };

  function init(app) {
    buildSystemsList(app);
    buildStageChips(app);
    wireTabs(app);
    wireTransport(app);
    wireRing(app);
    wireCollision(app);
    wireHelp();
    setLegend('ring', ringLegend());
    setLegend('collision', collisionLegend());
    showEdu(app, 'overview');
    $('#disclaimer').textContent = D.disclaimer;
    $('#aboutText').textContent = D.about;
    $('#statsParts').textContent = U.fmt(app.detector.total) + ' parts';
  }

  /* ---------------- systems list ------------------------------------------*/
  function buildSystemsList(app) {
    const box = $('#systemsList');
    box.innerHTML = '';
    for (const s of D.systems) {
      const rendered = app.detector.systems[s.id] ? app.detector.systems[s.id].count : 0;
      const row = document.createElement('div');
      row.className = 'sysrow';
      row.innerHTML = `
        <span class="dot" style="background:${s.color}"></span>
        <label class="sysname" title="${s.real.replace(/"/g, '&quot;')}">
          <input type="checkbox" checked data-sys="${s.id}"><span>${s.name}</span>
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
    actions.innerHTML = `<button class="btn mini" id="sysAll">All</button>
                         <button class="btn mini" id="sysNone">Solo core</button>`;
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
    D.stages.forEach((st, i) => {
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
  function wireCollision(app) {
    $('#btnTrigger').addEventListener('click', () => app.triggerEvent());
    $('#chkAuto').addEventListener('change', (e) => app.setAuto(e.target.checked));
    setInterval(() => {
      if (document.body.dataset.view !== 'collision') return;
      const info = app.eventInfo();
      $('#evNum').textContent = '#' + info.num;
      $('#evTracks').textContent = info.tracks;
      $('#evJets').textContent = info.jets;
      $('#evEt').textContent = info.sumET.toFixed(1);
      $('#evMuons').textContent = info.muons;
    }, 400);
  }

  /* ---------------- education panel ----------------------------------------*/
  function showEdu(app, kind, sys) {
    const t = $('#eduTitle'), b = $('#eduBody'), f = $('#eduFacts');
    if (kind === 'overview' || kind === 'stage') {
      const st = kind === 'overview' ? D.overview : D.stages[app.stageIndex()];
      t.textContent = st.title; b.textContent = st.body;
      f.innerHTML = st.facts.map(x => `<li>${x}</li>`).join('');
    } else if (kind === 'system') {
      t.textContent = sys.name; b.textContent = sys.blurb;
      f.innerHTML = sys.facts.map(x => `<li>${x}</li>`).join('') +
        `<li class="srcline">Real detector: ${sys.real}</li>`;
    } else if (kind === 'ring') {
      t.textContent = D.ring.title; b.textContent = D.ring.body;
      f.innerHTML = D.ring.facts.map(x => `<li>${x}</li>`).join('');
    } else if (kind === 'collision') {
      t.textContent = D.collision.title; b.textContent = D.collision.body;
      f.innerHTML = D.collision.facts.map(x => `<li>${x}</li>`).join('') +
        `<li class="srcline">${D.triggerNote}</li>`;
    }
  }
  APP.UI.showEduForView = (view) => {
    if (view === 'ring') showEdu(null, 'ring');
    else if (view === 'collision') showEdu(null, 'collision');
    else showEdu(null, 'overview');
  };
  APP.UI.updateStageEdu = (app, stageIdx) => {
    if (document.body.dataset.view !== 'detector') return;
    const key = 'stage:' + stageIdx;
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
    const sn = !active ? 'Assembled' : `Stage ${idx + 1} / 6 — ${D.stages[idx].chip}`;
    if (APP.UI.syncPlayback._sn !== sn) { $('#stageName').textContent = sn; APP.UI.syncPlayback._sn = sn; }
  };
  function stageIndex(t) { return U.clamp(Math.ceil(t * 6) - 1, 0, 5); }

  /* ---------------- legends ------------------------------------------------*/
  function setLegend(view, html) {
    const el = document.getElementById('legend-' + view);
    if (el) el.innerHTML = html;
  }
  function ringLegend() {
    return `
      <div class="legrow"><span class="swatch" style="background:#d8b25c"></span>${D.ring.legendBeamA}</div>
      <div class="legrow"><span class="swatch" style="background:#6fd3e8"></span>${D.ring.legendBeamB}</div>
      <div class="legnote">Schematic — ring radius compressed ≈60×; magnet boxes represent clusters of the 1,232 real dipoles.</div>`;
  }
  function collisionLegend() {
    return `
      <div class="legrow"><span class="swatch" style="background:#bfd8ea"></span>charged hadron track</div>
      <div class="legrow"><span class="swatch" style="background:#6fe3c4"></span>electron / EM tower</div>
      <div class="legrow"><span class="swatch" style="background:#e8c874"></span>muon (reaches outer layers)</div>
      <div class="legrow"><span class="swatch" style="background:#d8b25c"></span>jet energy towers</div>
      <div class="legrow"><span class="swatch" style="background:#e8eaed"></span>missing E\u209C (vector sum)</div>
      <div class="legnote">${D.collision.badge}.</div>`;
  }

  /* ---------------- help modal ---------------------------------------------*/
  function wireHelp() {
    const modal = $('#helpModal');
    $('#btnHelp').addEventListener('click', () => modal.classList.add('open'));
    $('#helpClose').addEventListener('click', () => modal.classList.remove('open'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });
    $('#creditLinks').innerHTML = D.credits.map(c => `<li><a href="${c.u}" target="_blank" rel="noopener">${c.t}</a></li>`).join('');
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
