/* ============================================================================
 * collision.js — SYNTHETIC collision display (math-generated, not real data)
 * Schematic cut-away detector + a staged, narrated collision sequence:
 *   approach → impact → parton shower → hadronization → layer flashes → done
 * Helix tracks (curvature ∝ 1/pT in the 2 T solenoid), jets as energy towers,
 * long gold muon tracks, missing-Et arrow.
 * ==========================================================================*/
(function () {
  const U = APP.U, TAU = U.TAU;
  const Y_AXIS = new THREE.Vector3(0, 1, 0);

  /* track type palette */
  const COL = { hadron: 0xbfd8ea, electron: 0x6fe3c4, muon: 0xe8c874, jet: 0xd8b25c };
  const R_STOP = { pixel: 2.4, sct: 3.8, trt: 5.2, em: 8.3, had: 11.0, muon: 14.6 };
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
  const PHASE_T = { approach: 2.2, impact: 0.55, shower: 1.5, hadron: 1.7, layers: 2.4 };
  const Z_START = 17, Z_HIT = 0.25, DONE_HOLD = 4.2, AUTO_AFTER = 4.5;

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
      phase: 'approach', pt: 0, doneT: 0,
      pEarly: 0, pLate: 0,
      auto: true, timer: 2.0,
      trackLines: [], towers: [], misc: [],
      protons: [], shock: null,
      onCaption: null, capShown: false,
    };
    const matsTrack = {};
    for (const k of Object.keys(COL)) {
      matsTrack[k] = new THREE.LineBasicMaterial({ color: COL[k], transparent: true, opacity: 0.95 });
    }
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
        if (q > 0) {
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
      line.geometry.setDrawRange(0, 0);
      line.userData.g = group;            /* 'early' | 'late' */
      eventGroup.add(line);
      state.trackLines.push(line);
      return line;
    }

    function addTower(phi, r, energy, em) {
      const h = 0.6 + energy * 0.55;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1, 0.55), em ? towerMatEM : towerMat);
      const dir = new THREE.Vector3(Math.cos(phi), Math.sin(phi), 0);
      m.position.copy(dir.clone().multiplyScalar(r));
      m.quaternion.setFromUnitVectors(Y_AXIS, dir);
      m.scale.y = 0.001;
      m.userData.targetH = h;
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
      const step = APP.L().collision.seq.find((s) => s.phase === state.phase);
      if (step) { state.onCaption(step.cap); state.capShown = true; }
      else { state.onCaption(null); state.capShown = false; }
    }

    function setPhase(p) { state.phase = p; state.pt = 0; emitCaption(); }

    /* ---- the event itself ------------------------------------------------*/
    function startSequence(seed) {
      clearEvent();
      state.num++;
      const rnd = U.rng(seed === undefined ? (Date.now() & 0xffff) * 2654435761 + state.num : seed);
      const info = { tracks: 0, jets: 0, sumET: 0, muons: 0 };

      /* jets first (so some tracks belong to them) */
      const nJet = 2 + Math.floor(rnd() * 4);
      const jetAxes = [];
      for (let j = 0; j < nJet; j++) {
        const phiJ = rnd() * TAU;
        const etaJ = (rnd() - 0.5) * 1.6;
        jetAxes.push({ phiJ, etaJ });
        const n = 5 + Math.floor(rnd() * 4);
        for (let k = 0; k < n; k++) {
          const pT = 1.5 + rnd() * 4.5;
          const phi0 = phiJ + (rnd() - 0.5) * 0.55;
          const eta = etaJ + (rnd() - 0.5) * 0.7;
          addTrack(helix(pT, phi0, eta, R_STOP.had, rnd), k === 0 ? 'early' : 'late', 'hadron');
          info.tracks++;
        }
        /* towers */
        const e1 = 1.2 + rnd() * 3.6;
        addTower(phiJ, 9.15, e1, true); info.sumET += e1;
        addTower(phiJ + 0.06, 11.5, e1 * 1.25, false); info.sumET += e1 * 1.25;
        for (let t = 0; t < 2; t++) {
          const e = 0.5 + rnd() * 1.6;
          addTower(phiJ + (rnd() - 0.5) * 0.5, 9.15, e, true); info.sumET += e;
          const e2 = e * (1.1 + rnd() * 0.5);
          addTower(phiJ + (rnd() - 0.5) * 0.5, 11.5, e2, false); info.sumET += e2;
        }
        info.jets++;
      }
      /* muons: 2–4, long gold tracks — always 'early' (they punch straight out) */
      const nMu = 2 + Math.floor(rnd() * 3);
      for (let k = 0; k < nMu; k++) {
        const pT = 3.5 + rnd() * 6;
        addTrack(helix(pT, rnd() * TAU, (rnd() - 0.5) * 2.2, R_STOP.muon, rnd), 'muon', 'early');
        info.tracks++; info.muons++;
      }
      /* extra scattered tracks */
      const nX = 10 + Math.floor(rnd() * 10);
      for (let k = 0; k < nX; k++) {
        const r = rnd();
        const pT = 0.5 + 3.2 * r * r;
        const type = r > 0.93 ? 'electron' : (pT > 3.4 ? 'muon' : 'hadron');
        const stop = type === 'electron' ? R_STOP.em : (type === 'muon' ? R_STOP.muon : (rnd() > 0.5 ? R_STOP.trt : R_STOP.had));
        addTrack(helix(pT, rnd() * TAU, (rnd() - 0.5) * 3.4, stop, rnd), type === 'muon' ? 'hadron' : type,
          k % 3 === 0 ? 'early' : 'late');
        info.tracks++;
      }
      state.tracks = info.tracks; state.jets = info.jets; state.sumET = info.sumET; state.muons = info.muons;

      /* missing-Et arrow: opposite the summed jet vector */
      let vx = 0, vy = 0;
      for (const j of jetAxes) { vx += Math.cos(j.phiJ); vy += Math.sin(j.phiJ); }
      const phiMiss = Math.atan2(-vy, -vx);
      const arrowGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(Math.cos(phiMiss) * 1.2, Math.sin(phiMiss) * 1.2, 0),
        new THREE.Vector3(Math.cos(phiMiss) * 7.5, Math.sin(phiMiss) * 7.5, 0),
      ]);
      const arrow = new THREE.Line(arrowGeo, new THREE.LineDashedMaterial({
        color: 0xe8eaed, dashSize: 0.5, gapSize: 0.32, transparent: true, opacity: 0.7 }));
      arrow.computeLineDistances();
      eventGroup.add(arrow);
      state.misc.push(arrow);

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
      setPhase('approach');
    }

    function helix(pT, phi0, eta, rStop, rnd) {
      const rho = 2.6 * pT;
      const q = rnd() > 0.5 ? 1 : -1;
      const slope = Math.sinh(eta);
      /* find arc length where track exits rStop (sample) */
      let sMax = 30;
      const ds = 0.1;
      for (let s = ds; s < 40; s += ds) {
        const x = q > 0 ? -rho * Math.sin(phi0) + rho * Math.sin(phi0 + s / rho)
                        : rho * Math.sin(phi0) + rho * Math.sin(phi0 + Math.PI - s / rho);
        const y = q > 0 ? rho * Math.cos(phi0) - rho * Math.cos(phi0 + s / rho)
                        : -rho * Math.cos(phi0) - rho * Math.cos(phi0 + Math.PI - s / rho);
        if (Math.sqrt(x * x + y * y) > rStop) { sMax = s; break; }
      }
      return { rho, phi0, q, slope, sMax };
    }

    function buildCutaway() {
      const zHalf = 7;
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
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 17.5, 10).rotateX(Math.PI / 2),
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

    function update(dt, orbit, active) {
      if (active === false) return;          /* frozen when the view is not shown */

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
        if (state.pt >= PHASE_T.approach) {
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
        if (state.pt >= PHASE_T.impact) { if (state.shock) { state.shock.visible = false; } setPhase('shower'); }
      } else if (state.phase === 'shower') {
        state.pEarly = U.smooth(U.clamp(state.pt / PHASE_T.shower, 0, 1));
        if (state.pt >= PHASE_T.shower) setPhase('hadron');
      } else if (state.phase === 'hadron') {
        state.pLate = U.smooth(U.clamp(state.pt / PHASE_T.hadron, 0, 1));
        if (state.pt >= PHASE_T.hadron) setPhase('layers');
      } else if (state.phase === 'layers') {
        if (state.pt >= PHASE_T.layers) setPhase('done');
      } else if (state.phase === 'done') {
        state.doneT += dt;
        if (state.capShown && state.doneT > DONE_HOLD) { state.onCaption(null); state.capShown = false; }
      }

      /* ---- per-frame visual application ---- */
      /* track draw-in: two waves */
      const ne = Math.floor(state.pEarly * 89), nl = Math.floor(state.pLate * 89);
      for (const line of state.trackLines) {
        line.geometry.setDrawRange(0, Math.max(0, line.userData.g === 'early' ? ne : nl));
      }
      /* towers rise during 'hadron' and stay up */
      const towerK = state.pLate;
      for (const t of state.towers) {
        t.scale.y = Math.max(0.001, t.userData.targetH * towerK);
      }
      /* shell flashes: radial wave through 'layers' (and decaying after) */
      if (state.phase === 'layers' || state.phase === 'done') {
        const t0 = state.phase === 'layers' ? state.pt : PHASE_T.layers + state.doneT;
        for (let i = 0; i < shellMats.length; i++) {
          shellMats[i].emissiveIntensity = shellBase[i] + 1.5 * flashPulse(t0 - i * 0.2);
        }
      }
      /* flash decay after the burst */
      if (state.phase !== 'approach' && state.phase !== 'impact') {
        ipGlow.material.opacity = Math.max(0.28, ipGlow.material.opacity - dt * 1.2);
        ipGlow.scale.setScalar(Math.max(3.2, ipGlow.scale.x - dt * 4));
        ipLight.intensity = Math.max(0.25, ipLight.intensity - dt * 3);
      }

      /* auto trigger — only once the sequence has settled */
      if (state.auto && state.phase === 'done' && state.doneT > AUTO_AFTER) startSequence();
      /* idle orbit drift */
      if (orbit && orbit.idleT > 4) orbit.des.az += dt * 0.06;
    }

    function setAuto(v) { state.auto = v; }
    function getInfo() {
      return { num: state.num, tracks: state.tracks, jets: state.jets, sumET: state.sumET, muons: state.muons };
    }
    function refreshCaption() { if (state.phase === 'done' ? state.capShown : true) emitCaption(); }

    startSequence(1337); /* opening event (frozen until the view is shown) */

    return { scene, update, trigger: startSequence, setAuto, getInfo, refreshCaption, phase: () => state.phase, setCaptionSink: (fn) => { state.onCaption = fn; } };
  }
})();
