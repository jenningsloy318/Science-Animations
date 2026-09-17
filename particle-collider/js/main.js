/* ============================================================================
 * main.js — bootstrap: renderer, three views, playback engine, input, loop
 * ==========================================================================*/
(function () {
  const U = APP.U;

  document.addEventListener('DOMContentLoaded', () => {
    const $ = (s) => document.querySelector(s);
    const $$ = (s) => Array.from(document.querySelectorAll(s));
    const canvas = document.getElementById('gl');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
    else renderer.outputEncoding = THREE.sRGBEncoding;
    if ('useLegacyLights' in renderer) renderer.useLegacyLights = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.24;
    renderer.localClippingEnabled = true;

    APP.MATS.build(renderer);

    /* ---- build views ---- */
    const detector = APP.Detector.build(renderer);
    const ring = APP.Ring.build(renderer);
    const collision = APP.Collision.build(renderer);
    const particles = APP.Particles.build(renderer);

    const app = {
      detector, ring, collision,
      view: 'detector',
      stageIndex: () => U.clamp(Math.ceil(pb.t * 6) - 1, 0, 5),
    };

    /* ---- 3D cutaway plane for detector view (reveals hollow core) ---- */
    const cutawayPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.05);
    let cutawayEnabled = true;

    function updateCutaway() {
      if (cutawayEnabled && app.view === 'detector') {
        renderer.clippingPlanes = [cutawayPlane];
      } else {
        renderer.clippingPlanes = [];
      }
      const cutBtn = document.getElementById('btnCutaway');
      if (cutBtn) cutBtn.classList.toggle('active', cutawayEnabled && app.view === 'detector');
    }

    app.toggleCutaway = () => {
      cutawayEnabled = !cutawayEnabled;
      updateCutaway();
      APP.UI.toast(cutawayEnabled ? APP.tr('toast.cutawayOn') : APP.tr('toast.cutawayOff'));
    };

    /* ---- orbit cameras (one camera, per-view state) ---- */
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1200);
    const orbits = {
      detector: new U.Orbit(canvas, { az: 0.62, pol: 1.12, dist: 152, minDist: 30, maxDist: 320,
        onUserInput: () => { if (ring.flight.active) cancelFlight(); },
        onWheelZoom: (e) => {
          if (app.view !== 'detector') return false;
          /* wheel drives disassembly in detector view */
          if (e.ctrlKey) return false;
          setT(pb.t + e.deltaY * 0.00045, true);
          return true;
        } }),
      ring: new U.Orbit(canvas, { az: 0.9, pol: 1.02, dist: 185, minDist: 70, maxDist: 420,
        onUserInput: () => { if (ring.flight.active) cancelFlight(); } }),
      collision: new U.Orbit(canvas, { az: 0.0, pol: 1.545, dist: 40, minDist: 16, maxDist: 80 }),
      particles: new U.Orbit(canvas, { az: 0.0, pol: 1.32, dist: 37, minDist: 10, maxDist: 90 }),
    };
    const saved = {};
    for (const k of Object.keys(orbits)) saved[k] = orbits[k].save();
    orbit = orbits.detector;

    /* ---- playback engine ---- */
    const pb = APP.Playback = { t: 0, playing: false, dir: 1, duration: 60 };
    detector.setExplode(0);

    function setT(v, fromUser) {
      pb.t = U.clamp(v, 0, 1);
      detector.setExplode(pb.t);
      APP.UI.updateStageEdu(app, pb.t <= 0.0001 ? -1 : app.stageIndex());
      APP.UI.syncPlayback(pb);
    }
    app.scrubTo = (v) => { pb.playing = false; APP.UI.syncPlayback(pb); setT(v, true); };
    app.gotoStage = (s) => {
      pb.playing = false;
      const target = s === 0 ? 0 : s / 6;
      tweens.add(0.7, (k) => setT(U.lerp(pb.t, target, k), false));
      APP.UI.toast(s === 0 ? APP.tr('toast.assembled')
        : APP.tr('toast.stage').replace('{n}', s).replace('{chip}', APP.L().stages[s - 1].chip));
    };
    app.togglePlay = () => {
      if (!pb.playing) {
        if (pb.dir > 0 && pb.t >= 1) setT(0);
        if (pb.dir < 0 && pb.t <= 0) setT(1);
        pb.playing = true;
      } else pb.playing = false;
      APP.UI.syncPlayback(pb);
    };
    app.toggleReverse = () => {
      pb.dir *= -1;
      if (!pb.playing) { pb.playing = true; }
      APP.UI.syncPlayback(pb);
      APP.UI.toast(pb.dir > 0 ? APP.tr('toast.dirFwd') : APP.tr('toast.dirRev'));
    };
    app.setDuration = (d) => { pb.duration = d; APP.UI.toast(APP.tr('toast.playback').replace('{d}', d)); };

    /* ---- systems ---- */
    app.setSystemVisible = (id, vis) => {
      const s = detector.systems[id];
      if (s) s.root.visible = vis;
    };
    app.focusSystem = (id) => {
      const f = detector.focus[id];
      if (!f || app.view !== 'detector') return;
      const o = orbits.detector;
      const o0 = { target: o.desTarget.clone(), dist: o.des.dist };
      const o1 = { target: f.center.clone(), dist: U.clamp(f.radius * 3.4, 40, 200) };
      tweens.add(0.9, (k) => {
        o.desTarget.lerpVectors(o0.target, o1.target, k);
        o.des.dist = U.lerp(o0.dist, o1.dist, k);
      });
    };

    /* ---- view switching ---- */
    const fader = document.getElementById('fader');
    function fade(cb) {
      fader.style.opacity = 1;
      setTimeout(() => {
        try { cb(); } catch (e) { console.error(e); }
        fader.style.opacity = 0;
      }, 160);
    }
    app.setView = (v) => {
      if (v === app.view) return;
      fade(() => {
        saved[app.view] = orbits[app.view].save();
        app.view = v;
        orbit = orbits[v];
        orbit.load(saved[v]);
        document.body.dataset.view = v;
        $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === v));
        APP.UI.showEduForView(v);
        updateCutaway();
        if (v === 'collision' && collision.refreshCaption) collision.refreshCaption();
        else document.getElementById('collCaption').classList.remove('show');
        if (v !== 'ring') cancelFlight();
      });
    };
    document.body.dataset.view = 'detector';

    /* ---- ring flight ---- */
    const capEl = document.getElementById('flightCaption');
    ring.flight.onCaption = (text) => {
      if (!text) { capEl.classList.remove('show'); return; }
      capEl.textContent = text;
      capEl.classList.add('show');
    };
    function cancelFlight() {
      if (!ring.flight.active) return;
      ring.flight.cancel();
      capEl.classList.remove('show');
      APP.UI.toast(APP.tr('toast.flightOff'));
    }
    app.startFlight = () => {
      if (app.view !== 'ring') app.setView('ring');
      setTimeout(() => {
        orbits.ring.desTarget.set(0, 0, 0);
        ring.flight.start();
        APP.UI.toast(APP.tr('toast.flight'));
      }, app.view === 'ring' ? 0 : 220);
    };
    app.setBeamSpeed = (m) => ring.setSpeed(m);

    /* ---- collision ---- */
    const collCap = document.getElementById('collCaption');
    collision.setCaptionSink((text) => {
      if (!text) { collCap.classList.remove('show'); return; }
      collCap.textContent = text;
      collCap.classList.add('show');
    });
    app.triggerEvent = (type) => collision.trigger(undefined, type);
    app.setCollPaused = (v) => collision.setPaused(v);
    app.setCollSpeed = (v) => collision.setSpeed(v);
    app.setComposite = (k) => particles.setComposite(k);
    app.collGotoPhase = (ph) => collision.gotoPhase(ph);
    app.collStepPhase = (d) => collision.stepPhase(d);
    app.setAuto = (v) => collision.setAuto(v);
    app.eventInfo = () => collision.getInfo();
    window.__pcDebug = () => ({ phase: collision.phase(), ...collision.getInfo() });

    /* ---- tweens, UI ---- */
    const tweens = APP.tweens = new U.Tweens();
    APP.UI.init(app);
    APP.UI.syncPlayback(pb);
    updateCutaway();

    /* ---- keyboard ---- */
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      switch (e.key) {
        case ' ': e.preventDefault();
          if (app.view === 'detector') app.togglePlay();
          else if (app.view === 'collision') { const i = app.eventInfo(); app.setCollPaused(!i.paused); }
          break;
        case 'r': case 'R': if (app.view === 'detector') app.toggleReverse(); break;
        case 'c': case 'C': if (app.view === 'detector') app.toggleCutaway(); break;
        case '1': app.setView('detector'); break;
        case '2': app.setView('ring'); break;
        case '3': app.setView('collision'); break;
        case '4': app.setView('particles'); break;
        case 'f': case 'F': app.startFlight(); break;
        case 'e': case 'E': if (app.view === 'collision') app.triggerEvent(); break;
        case 'h': case 'H': case '?': document.getElementById('helpModal').classList.toggle('open'); break;
        case 'Escape': document.getElementById('helpModal').classList.remove('open'); break;
        case 'ArrowRight': if (app.view === 'detector') app.gotoStage(Math.min(6, Math.floor(pb.t * 6 + 1e-6) + 1)); else if (app.view === 'collision') app.collStepPhase(1); break;
        case 'ArrowLeft': if (app.view === 'detector') app.gotoStage(Math.max(0, Math.ceil(pb.t * 6 - 1e-6) - 1)); else if (app.view === 'collision') app.collStepPhase(-1); break;
      }
    });

    /* ---- resize ---- */
    function resize() {
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize);
    resize();

    /* ---- main loop ---- */
    const clock = new THREE.Clock();
    let fps = 60, fpsAcc = 0, fpsN = 0, fpsTimer = 0;
    function loop() {
      requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.05);
      APP.MATS.uniforms.uTime.value += dt;
      tweens.update(dt);

      if (app.view === 'detector') {
        if (pb.playing) {
          const nt = pb.t + pb.dir * dt / pb.duration;
          if (nt >= 1) { setT(1); pb.playing = false; APP.UI.syncPlayback(pb); }
          else if (nt <= 0) { setT(0); pb.playing = false; APP.UI.syncPlayback(pb); }
          else setT(nt);
        }
        orbits.detector.update(dt, camera, 1 + pb.t * 0.32);
      } else if (app.view === 'ring') {
        orbits.ring.update(dt, camera);
      } else if (app.view === 'particles') {
        orbits.particles.update(dt, camera);
      } else {
        orbits.collision.update(dt, camera);
      }

      if (app.view === 'ring') ring.update(dt, camera);
      collision.update(dt, orbits.collision, app.view === 'collision');
      particles.update(dt, orbits.particles, app.view === 'particles', camera);
      renderer.render(views()[app.view].scene, camera);

      /* fps */
      fpsAcc += 1 / Math.max(dt, 1e-4); fpsN++; fpsTimer += dt;
      if (fpsTimer > 0.5) {
        fps = fpsAcc / fpsN; fpsAcc = 0; fpsN = 0; fpsTimer = 0;
        const el = document.getElementById('statsFps');
        if (el) el.textContent = Math.round(fps) + ' fps';
      }
    }
    const views = () => ({ detector, ring, collision, particles });
    loop();

    /* expose for debugging */
    window.APP = APP; APP.app = app;
  });

  let orbit = null;
})();
