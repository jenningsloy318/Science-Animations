/* ============================================================================
 * collision.js — collision display driven by REAL Standard Model kinematics
 * (APP.PP: PDG masses/branching ratios, two-body decays, invariant-mass
 * reconstruction). The detector response remains simplified/schematic.
 * Staged, narrated sequence: approach → impact → shower → hadronization →
 * layer flashes → done.
 * Track curvature uses the REAL relation r[m] = pT[GeV]/(0.3·B), B = 2 T,
 * drawn at scene scale 4.86 units/m (TRT outer radius 1.07 m ↔ 5.2 units),
 * i.e. rho = 0.81 × pT. Photons fly straight; MET = real invisible-pT sum.
 * ==========================================================================*/
(function () {
  const U = APP.U, TAU = U.TAU;
  const Y_AXIS = new THREE.Vector3(0, 1, 0);

  /* track type palette */
  const COL = { hadron: 0xbfd8ea, electron: 0x6fe3c4, muon: 0xe8c874, jet: 0xd8b25c, photon: 0xf2ecdc };
  const R_STOP = { pixel: 2.4, sct: 3.8, trt: 5.2, em: 8.3, had: 11.0, muon: 14.6 };
  const K_SCALE = 4.86;   /* scene units per metre (TRT 1.07 m ↔ 5.2 units) */
  const HELIX = 0.3 * 2.0 /* B[T] */ ;   /* r[m] = pT/(0.3B) = pT/6 */
  const SHELLS = [
    { r: 2.4, mat: { color: 0x1f3a35, emissive: 0x6fe3c4, emissiveIntensity: 0.12 } },
    { r: 3.8, mat: { color: 0x1f3038, emissive: 0x6fd3e8, emissiveIntensity: 0.10 } },
    { r: 5.2, mat: { color: 0x2e343d, emissive: 0x9fb4c9, emissiveIntensity: 0.06 } },
    { r: 6.4, mat: { color: 0x3d341e, emissive: 0xd8b25c, emissiveIntensity: 0.10 } },
    { r: 8.3, mat: { color: 0x3a352c, emissive: 0xe0c07a, emissiveIntensity: 0.05 } },
    { r: 11.0, mat: { color: 0x272d35, emissive: 0x8b95a2, emissiveIntensity: 0.05 } },
    { r: 13.5, mat: { color: 0x2a3138, emissive: 0xd8b25c, emissiveIntensity: 0.07 } },
  ];

  /* sequence timing (seconds) */
  const PHASE_T = { approach: 2.2, impact: 0.9, flight: 3.6, readout: 1.6 };
  const Z_HALF = 9;       /* detector barrel half-length — forward tracks end here */
  const Z_START = Z_HALF + 8, Z_HIT = 0.25, AUTO_AFTER = 5.0;
  /* C A U S A L  A N I M A T I O N :
   * every particle leaves the IP at t=0 and flies at one scaled, constant
   * (near-light) speed. A track tip reaching its stop radius, the local
   * tower growth and the outward shell-flash wave are all derived from that
   * single clock — nothing is decorative. */
  const V_FLIGHT = 7.0;   /* scene units per second (14.6-unit crossing ≈ 2.1 s) */

  APP.Collision = { build };

  function build(renderer) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(APP.MATS.PALETTE.bg);
    scene.fog = new THREE.FogExp2(APP.MATS.PALETTE.fog, 0.004);
    scene.environment = APP.MATS.env;

    scene.add(new THREE.HemisphereLight(0x9fb2c8, 0x10141a, 0.9));
    const key = new THREE.DirectionalLight(0xfff1da, 1.8); key.position.set(30, 40, 25); scene.add(key);
    const rim = new THREE.DirectionalLight(0x6fd3e8, 0.8); rim.position.set(-35, 15, -30); scene.add(rim);
    const ipLight = new THREE.PointLight(0xffe9b0, 0, 40, 2); scene.add(ipLight);

    const shellMats = buildCutaway();   /* one material per shell, radial order */
    const shellBase = shellMats.map((m) => m.emissiveIntensity);
    const ipGlow = addIPGlow();

    /* dynamic event group */
    const eventGroup = new THREE.Group();
    scene.add(eventGroup);

    const state = {
      num: 0, tracks: 0, jets: 0, sumET: 0, muons: 0,
      phase: 'approach', pt: 0, doneT: 0, flyT: 0, captionMinT: 0, paused: false,
      auto: true, timer: 2.0,
      trackLines: [], towers: [], misc: [],
      protons: [], shock: null,
      onCaption: null, capShown: false,
      typeIdx: 0, procKey: null, info: null,
    };
    const matsTrack = {};
    for (const k of Object.keys(COL)) {
      matsTrack[k] = new THREE.LineBasicMaterial({ color: COL[k], transparent: true, opacity: 0.95 });
    }
    matsTrack.photon = new THREE.LineDashedMaterial({ color: COL.photon, dashSize: 0.42, gapSize: 0.26,
      transparent: true, opacity: 0.9 });
    const towerMat = new THREE.MeshStandardMaterial({
      color: 0x3a3222, emissive: 0xe0b25c, emissiveIntensity: 0.85, metalness: 0.4, roughness: 0.4,
      transparent: true, opacity: 0.95 });
    const towerMatEM = towerMat.clone(); towerMatEM.emissive = new THREE.Color(0x7adfe8);

    function clearEvent() {
      for (const o of [...state.trackLines, ...state.towers, ...state.misc, ...state.protons, ...(state.shock ? [state.shock] : [])]) {
        eventGroup.remove(o);
        if (o.geometry) o.geometry.dispose();
      }
      state.trackLines = []; state.towers = []; state.misc = [];
      state.protons = []; state.shock = null;
    }

    function addTrack(params, type, group) {
      const { rho, phi0, q, slope, sMax } = params;
      const n = 88, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const s = (i / (n - 1)) * sMax;
        let x, y;
        if (q === 0) {                       /* neutral: straight line (photon) */
          const c = Math.cos(phi0), sn = Math.sin(phi0);
          x = c * s; y = sn * s;
        } else if (q > 0) {
          const a = phi0 + s / rho;
          x = -rho * Math.sin(phi0) + rho * Math.sin(a);
          y = rho * Math.cos(phi0) - rho * Math.cos(a);
        } else {
          const a = phi0 + Math.PI - s / rho;
          x = rho * Math.sin(phi0) + rho * Math.sin(a);
          y = -rho * Math.cos(phi0) - rho * Math.cos(a);
        }
        pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = s * slope;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const line = new THREE.Line(geo, matsTrack[type]);
      if (type === 'photon') line.computeLineDistances();
      line.geometry.setDrawRange(0, 0);
      line.userData.g = group;            /* 'early' | 'late' */
      line.userData.sMax = sMax;          /* arc length — drives the causal flight clock */
      eventGroup.add(line);
      state.trackLines.push(line);
      return line;
    }

    function addTower(phi, r, energy, em, eta) {
      /* real energies (GeV) — √ scale keeps towers readable 0.5–5 units */
      const h = U.clamp(0.5 + 0.35 * Math.sqrt(Math.max(0, energy)), 0.4, 5.0);
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1, 0.55), em ? towerMatEM : towerMat);
      const dir = new THREE.Vector3(Math.cos(phi), Math.sin(phi), 0);
      m.position.copy(dir.clone().multiplyScalar(r));
      m.position.z = (eta === undefined ? 0 : Math.sinh(eta) * 1.6);
      m.quaternion.setFromUnitVectors(Y_AXIS, dir);
      m.scale.y = 0.001;
      m.userData.targetH = h;
      /* CAUSAL: the tower grows when the depositing particle ARRIVES —
       * i.e. after flying the radius of the depositing layer at V_FLIGHT */
      m.userData.growAt = (em ? 8.3 : 11.0) / V_FLIGHT;
      eventGroup.add(m);
      state.towers.push(m);
    }

    /* ---- sequence pieces -------------------------------------------------*/
    function makeProton() {
      const g = new THREE.Group();
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12),
        new THREE.MeshBasicMaterial({ color: 0xffedd0 }));
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({
        map: U.glowTexture('rgba(255,225,160,1)'), transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.95 }));
      spr.scale.set(2.4, 2.4, 1);
      g.add(core); g.add(spr);
      return g;
    }

    function makeShockRing() {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.96, 1.0, 72),
        new THREE.MeshBasicMaterial({ color: 0xffe9b0, transparent: true, opacity: 0.85,
          side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.scale.setScalar(0.001);
      return m;
    }

    function emitCaption() {
      if (!state.onCaption) return;
      state.captionMinT = 0;
      const procs = APP.L().collision.processes || {};
      const proc = procs[state.procKey];
      if (state.phase === 'approach' && proc && proc.cap0) {
        state.onCaption(proc.cap0); state.capShown = true;
        state.captionMinT = readingSeconds(proc.cap0); return;
      }
      if (state.phase === 'done') {
        state.onCaption(proc && proc.capEnd ? proc.capEnd : null);
        state.capShown = !!proc && !!proc.capEnd;
        if (proc && proc.capEnd) state.captionMinT = readingSeconds(proc.capEnd);
        return;
      }
      /* clean processes (no hadrons in the decay): their own flight/readout lines */
      const cleanSet = { z_mumu: 1, z_ee: 1, h_gamgam: 1, h_zz4l: 1 };
      const cl = APP.L().collision.seqClean;
      if (cleanSet[state.procKey] && cl && cl[state.phase]) {
        state.onCaption(cl[state.phase]); state.capShown = true;
        state.captionMinT = readingSeconds(cl[state.phase]); return;
      }
      const step = APP.L().collision.seq.find((s) => s.phase === state.phase);
      if (step) {
        state.onCaption(step.cap); state.capShown = true;
        state.captionMinT = readingSeconds(step.cap);
      } else { state.onCaption(null); state.capShown = false; }
    }

    function setPhase(p) { state.phase = p; state.pt = 0; emitCaption(); }

    /* ---- the event itself — REAL SM kinematics from APP.PP --------------*/
    function startSequence(seed, forcedType) {
      clearEvent();
      state.num++;
      const types = (window.APP && APP.PP && APP.PP.TYPES) || ['qcd'];
      const type = forcedType || types[state.typeIdx % types.length];
      if (!forcedType) state.typeIdx++;
      state.procKey = type;
      const ev = APP.PP.makeEvent(type, seed === undefined ? undefined : seed + 1);
      const info = { tracks: 0, jets: 0, sumET: 0, muons: 0, ev };

      /* real pT → real curvature: rho[units] = pT[GeV]/6 × 4.86 */
      const trackKind = { muon: 'muon', electron: 'electron', photon: 'photon', hadron: 'hadron' };
      for (const p of ev.particles) {
        const rho = p.q === 0 ? 1e6 : (p.pT / HELIX) * K_SCALE;
        addTrack(helix(p.pT, p.phi, p.eta, p.q, rho, R_STOP[p.stop] || R_STOP.had),
          trackKind[p.kind] || 'hadron', p.group);
        info.tracks++;
        if (p.kind === 'muon') info.muons++;
      }
      /* calorimeter towers from the real deposits */
      for (const t of ev.towers) {
        addTower(t.phi, t.em ? 9.15 : 11.5, t.e, t.em, t.eta);
        info.sumET += t.e;
      }
      info.jets = ev.jets.length;
      state.tracks = info.tracks; state.jets = info.jets;
      state.sumET = info.sumET; state.muons = info.muons;
      state.info = info;

      /* missing-Et arrow — the REAL vector sum of invisible particles */
      if (ev.met) {
        const len = U.clamp(2.2 + 0.09 * ev.met.mag, 2.2, 7.5);
        const arrowGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(Math.cos(ev.met.phi) * 1.2, Math.sin(ev.met.phi) * 1.2, 0),
          new THREE.Vector3(Math.cos(ev.met.phi) * len, Math.sin(ev.met.phi) * len, 0),
        ]);
        const arrow = new THREE.Line(arrowGeo, new THREE.LineDashedMaterial({
          color: 0xe8eaed, dashSize: 0.5, gapSize: 0.32, transparent: true, opacity: 0.7 }));
        arrow.computeLineDistances();
        arrow.visible = false;              /* revealed only at 'readout' */
        state.metArrow = arrow;
        eventGroup.add(arrow);
        state.misc.push(arrow);
      }

      /* the two incoming protons */
      const pa = makeProton(), pb = makeProton();
      pa.position.set(0, 0, Z_START); pb.position.set(0, 0, -Z_START);
      eventGroup.add(pa); eventGroup.add(pb);
      state.protons = [pa, pb];

      /* reset visuals for the run */
      state.pEarly = 0; state.pLate = 0;
      for (const line of state.trackLines) line.geometry.setDrawRange(0, 0);
      for (const t of state.towers) t.scale.y = 0.001;
      ipGlow.material.opacity = 0.12;
      ipGlow.scale.set(3.2, 3.2, 1);
      ipLight.intensity = 0.15;
      for (let i = 0; i < shellMats.length; i++) shellMats[i].emissiveIntensity = shellBase[i];

      state.doneT = 0;
      state.flyT = 0;
      state.metArrow = null;
      rebuildStory();
      setPhase('approach');
    }

    function helix(pT, phi0, eta, q, rho, rStop) {
      const slope = Math.sinh(eta);
      /* find arc length where the track exits the detector: either its radial
       * stop layer OR the barrel end face (|z| > Z_HALF) — forward tracks
       * leave through the end, never drawn running past the model */
      let sMax = 30;
      const ds = 0.1;
      for (let s = ds; s < 40; s += ds) {
        if (Math.abs(s * slope) > Z_HALF) { sMax = s; break; }
        let x, y;
        if (q === 0) {
          x = Math.cos(phi0) * s; y = Math.sin(phi0) * s;
        } else if (q > 0) {
          x = -rho * Math.sin(phi0) + rho * Math.sin(phi0 + s / rho);
          y = rho * Math.cos(phi0) - rho * Math.cos(phi0 + s / rho);
        } else {
          x = rho * Math.sin(phi0) + rho * Math.sin(phi0 + Math.PI - s / rho);
          y = -rho * Math.cos(phi0) - rho * Math.cos(phi0 + Math.PI - s / rho);
        }
        if (Math.sqrt(x * x + y * y) > rStop) { sMax = s; break; }
      }
      return { rho, phi0, q, slope, sMax };
    }

    function buildCutaway() {
      const zHalf = Z_HALF;
      const mats = [];
      for (const sh of SHELLS) {
        const mat = new THREE.MeshStandardMaterial(Object.assign({
          metalness: 0.75, roughness: 0.5, side: THREE.DoubleSide, envMap: APP.MATS.env,
          transparent: true, opacity: 0.55 }, sh.mat));
        mats.push(mat);
        for (const start of [120, 300]) {  /* solid sectors centered ±y; gaps face ±x (camera) */
          const cyl = new THREE.Mesh(
            new THREE.CylinderGeometry(sh.r, sh.r, zHalf * 2, 40, 1, true, start * Math.PI / 180, 120 * Math.PI / 180).rotateX(Math.PI / 2),
            mat);
          scene.add(cyl);
          /* RingGeometry measures azimuth from +x — shift by −90° to match */
          const cap = new THREE.Mesh(
            new THREE.RingGeometry(sh.r - 0.12, sh.r, 40, 1, (start - 90) * Math.PI / 180, 120 * Math.PI / 180),
            new THREE.MeshBasicMaterial({ color: sh.mat.emissive, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
          cap.position.z = zHalf;
          scene.add(cap);
          const cap2 = cap.clone(); cap2.position.z = -zHalf;
          scene.add(cap2);
        }
      }
      /* beam axis hint */
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, Z_HALF * 2 + 2.5, 10).rotateX(Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.5 }));
      scene.add(beam);
      return mats;
    }

    function addIPGlow() {
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({
        map: U.glowTexture('rgba(255,235,180,1)'), transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9 }));
      spr.scale.set(6, 6, 1);
      scene.add(spr);
      return spr;
    }

    /* flash curve: instant attack, exponential decay */
    function flashPulse(tSince) { return tSince < 0 ? 0 : Math.exp(-tSince * 4.2); }

    /* R E A D E R   P A C I N G — the animation waits for the reader.
     * Estimated silent-reading time: CJK ~6.5 chars/s, latin ~14 chars/s,
     * plus a 1.6 s base; capped so a phase can never stall forever. */
    function readingSeconds(text) {
      if (!text) return 0;
      let zh = 0;
      for (const ch of text) if (ch >= '\u4e00' && ch <= '\u9fff') zh++;
      return Math.min(16, 2.2 + zh / 4.5 + (text.length - zh) / 9);
    }

    const PHASES = ['approach', 'impact', 'flight', 'readout', 'done'];

    /* story log — the FULL five-step story is pre-filled the moment an event
     * starts (titles only for future steps; captions fill in as the story
     * reaches them), so the right-side panel always has content and keeps
     * the whole event readable afterwards. Independent of the caption sink. */
    const storyLog = [];
    function rebuildStory() {
      const L = APP.L().collision;
      const procs = L.processes || {};
      const proc = procs[state.procKey] || {};
      const clean = { z_mumu: 1, z_ee: 1, h_gamgam: 1, h_zz4l: 1 }[state.procKey];
      const capOf = (phase) => {
        if (phase === 'approach') return proc.cap0 || null;
        if (phase === 'done') return proc.capEnd || null;
        if (clean && L.seqClean && L.seqClean[phase]) return L.seqClean[phase];
        const st = L.seq.find((x) => x.phase === phase);
        return st ? st.cap : null;
      };
      storyLog.length = 0;
      for (const ph of PHASES) storyLog.push({ phase: ph, cap: capOf(ph) });
    }

    function update(dt, orbit, active) {
      if (active === false) return;          /* frozen when the view is not shown */
      if (state.paused) {                    /* paused: keep rendering, freeze the story clock */
        if (orbit && orbit.idleT > 4) orbit.des.az += dt * 0.06;
        return;
      }

      /* ---- sequence state machine ---- */
      state.pt += dt;
      if (state.phase === 'approach') {
        const k = U.clamp(state.pt / PHASE_T.approach, 0, 1);
        const e = k * k;                     /* accelerating */
        const z = U.lerp(Z_START, Z_HIT, e);
        state.protons[0].position.z = z;
        state.protons[1].position.z = -z;
        const g = 1 + k * 1.6;
        state.protons[0].children[1].scale.set(g, g, 1);
        state.protons[1].children[1].scale.set(g, g, 1);
        ipGlow.material.opacity = 0.12 + k * 0.5;
        if (state.pt >= Math.max(PHASE_T.approach, state.captionMinT)) {
          /* impact: protons vanish, flash + shock ring */
          for (const p of state.protons) p.visible = false;
          state.shock = makeShockRing();
          eventGroup.add(state.shock);
          ipGlow.material.opacity = 1;
          ipGlow.scale.set(11, 11, 1);
          ipLight.intensity = 4.2;
          setPhase('impact');
        }
      } else if (state.phase === 'impact') {
        if (state.shock) {
          const k = U.clamp(state.pt / PHASE_T.impact, 0, 1);
          state.shock.scale.setScalar(0.3 + k * 14);
          state.shock.material.opacity = 0.85 * (1 - k);
        }
        if (state.pt >= Math.max(PHASE_T.impact, state.captionMinT)) { if (state.shock) { state.shock.visible = false; } setPhase('flight'); }
      } else if (state.phase === 'flight') {
        state.flyT += dt;
        if (state.pt >= Math.max(PHASE_T.flight, state.captionMinT)) setPhase('readout');
      } else if (state.phase === 'readout') {
        state.flyT += dt;
        if (state.metArrow) state.metArrow.visible = true;   /* the neutrino is inferred */
        if (state.pt >= Math.max(PHASE_T.readout, state.captionMinT)) setPhase('done');
      } else if (state.phase === 'done') {
        state.doneT += dt;
        /* the summary caption stays until the next event starts */
        if (state.auto && state.doneT > Math.max(AUTO_AFTER, state.captionMinT + 1.5)) startSequence();
      }

      /* ---- per-frame visual application — all driven by the flight clock ---- */
      const flying = state.phase === 'flight' || state.phase === 'readout' || state.phase === 'done';
      /* track tips move at ONE constant (near-light) speed from the IP */
      if (flying) {
        for (const line of state.trackLines) {
          const sMax = line.userData.sMax || 1;
          const a = Math.min(state.flyT * V_FLIGHT, sMax);
          line.geometry.setDrawRange(0, Math.max(0, Math.floor((a / sMax) * 87) + 1));
        }
      }
      /* towers grow at the moment their particle ARRIVES at the deposit layer */
      for (const t of state.towers) {
        const g = flying ? U.smooth(U.clamp((state.flyT - t.userData.growAt) / 0.5, 0, 1)) : 0;
        t.scale.y = Math.max(0.001, t.userData.targetH * g);
      }
      /* shell flashes fire when the light-front reaches each radius */
      if (flying) {
        for (let i = 0; i < shellMats.length; i++) {
          const tArr = SHELLS[i].r / V_FLIGHT;
          shellMats[i].emissiveIntensity = shellBase[i] + 1.6 * flashPulse(state.flyT - tArr);
        }
      }
      /* flash decay after the burst */
      if (state.phase !== 'approach' && state.phase !== 'impact') {
        ipGlow.material.opacity = Math.max(0.28, ipGlow.material.opacity - dt * 1.2);
        ipGlow.scale.setScalar(Math.max(3.2, ipGlow.scale.x - dt * 4));
        ipLight.intensity = Math.max(0.25, ipLight.intensity - dt * 3);
      }

      /* idle orbit drift */
      if (orbit && orbit.idleT > 4) orbit.des.az += dt * 0.06;
    }

    function setAuto(v) { state.auto = v; }
    function setPaused(v) { state.paused = !!v; }

    /* jump to a phase; phases skipped OVER are completed instantly so the
     * reader always sees a coherent frame (no half-drawn states) */
    function gotoPhase(target) {
      const ti = PHASES.indexOf(target);
      if (ti < 0) return;
      const ci = PHASES.indexOf(state.phase);
      if (ti === ci) return;
      state.paused = false;
      /* complete everything before the target */
      if (ti >= 2) {                       /* flight or later: full tracks + towers */
        state.flyT = 99;
        if (ti === 3) state.doneT = 0;
      }
      if (ti <= 1) {                       /* back to the opening: reset the event frame */
        state.flyT = 0;
        for (const line of state.trackLines) line.geometry.setDrawRange(0, 0);
        for (const t of state.towers) t.scale.y = 0.001;
        for (let i = 0; i < shellMats.length; i++) shellMats[i].emissiveIntensity = shellBase[i];
      }
      if (ti >= 1) { for (const pr of state.protons) pr.visible = false; ipGlow.material.opacity = 1; ipLight.intensity = 4.2; }
      else { for (const pr of state.protons) { pr.visible = true; pr.position.z = Z_START; pr.children[1].scale.set(1, 1, 1); } ipGlow.material.opacity = 0.12; ipGlow.scale.set(3.2, 3.2, 1); ipLight.intensity = 0.15; }
      if (state.metArrow) state.metArrow.visible = ti >= 3;
      state.doneT = 0;
      setPhase(PHASES[ti]);
    }
    function stepPhase(dir) {
      const i = PHASES.indexOf(state.phase);
      gotoPhase(PHASES[U.clamp(i + dir, 0, PHASES.length - 1)]);
    }
    function getInfo() {
      const base = { num: state.num, tracks: state.tracks, jets: state.jets, sumET: state.sumET, muons: state.muons };
      if (state.info && state.info.ev) {
        const ev = state.info.ev;
        base.type = ev.type;
        base.phase = state.phase;
        base.paused = state.paused;
        base.story = storyLog.map((e) => ({ phase: e.phase, cap: e.cap }));
        base.mass = ev.mass || null;
        base.sigmaPb = ev.sigmaPb || null;
        base.ratePerS = ev.sigmaPb ? APP.PP.ratePerS(ev.sigmaPb) : null;
      }
      return base;
    }
    function refreshCaption() { if (state.phase === 'done' ? state.capShown : true) emitCaption(); }

    startSequence(1337); /* opening event (frozen until the view is shown) */

    return { scene, update, trigger: startSequence, setAuto, setPaused, gotoPhase, stepPhase, getInfo, refreshCaption, phase: () => state.phase, setCaptionSink: (fn) => { state.onCaption = fn; } };
  }
})();
