/* ============================================================================
 * ring.js — LHC accelerator view (schematic, radius compressed ~60×)
 * Two counter-rotating bunch trains, 8 straight sections, 4 experiments,
 * RF / dump / collimation points, and a captioned camera flight.
 * ==========================================================================*/
(function () {
  const U = APP.U, TAU = U.TAU;

  APP.Ring = { build };

  function build(renderer) {
    const M = APP.MATS.m;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(APP.MATS.PALETTE.bg);
    scene.fog = new THREE.FogExp2(APP.MATS.PALETTE.fog, 0.0016);
    scene.environment = APP.MATS.env;

    const R = 60;
    const at = (th, r = R, y = 0) => new THREE.Vector3(r * Math.cos(th), y, r * Math.sin(th));

    /* ---- lights ---- */
    scene.add(new THREE.HemisphereLight(0x9fb2c8, 0x10141a, 0.95));
    const key = new THREE.DirectionalLight(0xfff1da, 1.9); key.position.set(60, 120, 40); scene.add(key);
    const rim = new THREE.DirectionalLight(0x6fd3e8, 0.85); rim.position.set(-80, 40, -60); scene.add(rim);
    const center = new THREE.PointLight(0xd8b25c, 1.1, 220, 2); center.position.set(0, 46, 0); scene.add(center);

    /* ---- tunnel ring ---- */
    const tunnel = new THREE.Mesh(new THREE.TorusGeometry(R, 1.0, 10, 180),
      new THREE.MeshStandardMaterial({ color: 0x1c2129, metalness: 0.85, roughness: 0.6,
        envMap: APP.MATS.env, transparent: true, opacity: 0.5, depthWrite: false }));
    tunnel.rotation.x = Math.PI / 2;
    scene.add(tunnel);
    /* beam-pipe glow channels (two counter-rotating beams) */
    const chanGeo = new THREE.TorusGeometry(R, 0.16, 6, 180).rotateX(Math.PI / 2);
    const chanA = new THREE.Mesh(chanGeo, new THREE.MeshBasicMaterial({ color: 0xd8b25c, transparent: true, opacity: 0.55 }));
    const chanB = new THREE.Mesh(chanGeo.clone(), new THREE.MeshBasicMaterial({ color: 0x6fd3e8, transparent: true, opacity: 0.55 }));
    scene.add(chanA, chanB);

    /* ---- dipoles (arcs only, straights kept clear) ---- */
    const straights = [45, 135, 225, 315, 0, 90, 180, 270].map(d => d * Math.PI / 180);
    const nearStraight = (th) => straights.some(s => Math.abs(angDiff(th, s)) < 0.10);
    function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; }
    const dipGeo = new THREE.BoxGeometry(1.5, 1.9, 3.2);
    const items = [];
    const nDip = 336;
    for (let i = 0; i < nDip; i++) {
      const th = (i / nDip) * TAU;
      if (nearStraight(th)) continue;
      items.push({ p: [at(th).x, 0, at(th).z], q: tangentQ(th) });
    }
    const dipoles = new THREE.InstancedMesh(dipGeo, M.steelD, items.length);
    { const d = new THREE.Object3D(), c = new THREE.Color();
      items.forEach((it, i) => {
        d.position.set(it.p[0], it.p[1], it.p[2]); d.quaternion.copy(it.q); d.updateMatrix();
        dipoles.setMatrixAt(i, d.matrix);
        const j = 0.8 + U.rng(77 + i)() * 0.3;
        dipoles.setColorAt(i, c.setRGB(j, j, j));
      }); }
    scene.add(dipoles);

    function tangentQ(th) {
      /* orient local +z along tangent (−sin th, 0, cos th) */
      return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -th + Math.PI / 2);
    }

    /* quadrupoles at arc ends */
    for (const s of [45, 135, 225, 315]) {
      for (const off of [-0.16, 0.16]) {
        const th = s * Math.PI / 180 + off;
        const q = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 2.6, 12).rotateZ(Math.PI / 2), M.gold);
        q.position.copy(at(th)); q.quaternion.copy(tangentQ(th));
        scene.add(q);
      }
    }

    /* ---- experiment markers ---- */
    const DATA = APP.DATA.ring;
    const expAnchors = {};
    for (const p of DATA.points) {
      const th = p.angle * Math.PI / 180;
      const g = new THREE.Group();
      g.position.copy(at(th));
      g.rotation.y = -th;
      const small = !!p.small;
      if (!small) {
        const cryo = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 6.5, 32).rotateX(Math.PI / 2),
          new THREE.MeshStandardMaterial({ color: 0x23272e, metalness: 0.9, roughness: 0.4, envMap: APP.MATS.env }));
        const inner = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.0, 8.4, 24).rotateX(Math.PI / 2), M.steel);
        const coil = new THREE.Mesh(new THREE.TorusGeometry(4.9, 0.28, 8, 48), M.gold);
        const core = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 14, 12).rotateX(Math.PI / 2), M.pipe);
        g.add(cryo, inner, coil, core);
        const gl = new THREE.PointLight(0xd8b25c, 0.8, 26, 2); gl.position.y = 3; g.add(gl);
      } else {
        const box = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.0, 3.4),
          new THREE.MeshStandardMaterial({ color: 0x39424e, metalness: 0.9, roughness: 0.4, envMap: APP.MATS.env }));
        const cap = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.3, 3.7), M.gold);
        cap.position.y = 1.15;
        g.add(box, cap);
      }
      const lbl = U.makeLabel(small ? `${p.pt} · ${p.name}` : `${p.name} — ${p.pt}`,
        { size: 44, color: small ? '#9aa3ad' : '#f0e6c8', height: small ? 3.2 : 4.6 });
      lbl.position.y = small ? 4.2 : 8.6;
      g.add(lbl);
      scene.add(g);
      expAnchors[p.name] = g.position.clone();
    }

    /* ---- beams: bunch trains as shader-driven points ---- */
    const BEAM_N = 56, PER_BUNCH = 46;
    function makeBeam(dir, colorHex, chanOffset) {
      const n = BEAM_N * PER_BUNCH;
      const pos = new Float32Array(n * 3);   /* unused placeholder (positions in shader) */
      const seed = new Float32Array(n * 3);
      const bunch = new Float32Array(n);
      const rnd = U.rng(dir > 0 ? 7 : 13);
      let i = 0;
      for (let b = 0; b < BEAM_N; b++) {
        const base = (b / BEAM_N) * TAU + (dir > 0 ? 0 : 0.004);
        for (let k = 0; k < PER_BUNCH; k++, i++) {
          seed[i * 3] = base + (rnd() - 0.5) * 0.004;
          seed[i * 3 + 1] = (rnd() - 0.5) * 0.24;
          seed[i * 3 + 2] = (rnd() - 0.5) * 0.5;
          bunch[i] = b + rnd() * 0.4;
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));
      geo.setAttribute('aBunch', new THREE.BufferAttribute(bunch, 1));
      const mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 }, uDir: { value: dir }, uR: { value: R + chanOffset },
          uColor: { value: new THREE.Color(colorHex) }, uSpeed: { value: 0.5 },
        },
        vertexShader: `
          attribute vec3 aSeed; attribute float aBunch;
          uniform float uTime, uDir, uR, uSpeed;
          varying float vA;
          void main(){
            float ang = aSeed.x + uDir * uSpeed * uTime;
            float pulse = 0.65 + 0.5 * sin(aBunch * 1.7 - uTime * 6.0);
            vec3 p = vec3(cos(ang) * (uR + aSeed.y), aSeed.z, sin(ang) * (uR + aSeed.y));
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = (2.6 + 3.0 * pulse) * (120.0 / max(1.0, -mv.z));
            gl_Position = projectionMatrix * mv;
            vA = pulse;
          }`,
        fragmentShader: `
          uniform vec3 uColor; varying float vA;
          void main(){
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.1, d) * vA;
            gl_FragColor = vec4(uColor, a * 0.72);
          }`,
      });
      const pts = new THREE.Points(geo, mat);
      pts.frustumCulled = false;
      mat.depthTest = false;
      pts.renderOrder = 9;
      scene.add(pts);
      return mat;
    }
    const beamA = makeBeam(+1, 0xd8b25c, -0.55);
    const beamB = makeBeam(-1, 0x6fd3e8, +0.55);

    /* ---- collision flashes at ATLAS (and CMS) ---- */
    const flashes = [];
    function spawnFlash(pos, colorHex) {
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({
        map: U.glowTexture(colorHex), transparent: true, depthTest: false,
        blending: THREE.AdditiveBlending, depthWrite: false, opacity: 1 }));
      spr.position.copy(pos); spr.scale.set(2, 2, 1); spr.renderOrder = 8;
      scene.add(spr);
      const ringM = new THREE.Mesh(new THREE.TorusGeometry(1, 0.08, 6, 40),
        new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      ringM.position.copy(pos); ringM.rotation.x = Math.PI / 2;
      scene.add(ringM);
      flashes.push({ spr, ringM, t: 0 });
    }
    let flashTimer = 1.2, flashAlt = false;

    /* ---- camera flight ---- */
    const flight = new U.Flight([
      { pos: [0, 130, 175], look: [0, 0, 0] },
      { pos: [86, 16, 22], look: [R, 0, 0] },          /* dive to ATLAS */
      { pos: [44, 9, 62], look: [R * 0.5, 0, R * 0.75] },
      { pos: [-44, 9, 62], look: [-R * 0.5, 0, R * 0.75] },
      { pos: [-86, 14, 20], look: [-R, 0, 0] },        /* CMS */
      { pos: [-40, 9, -66], look: [0, 0, -R * 0.9] },  /* toward LHCb */
      { pos: [44, 9, -62], look: [0, 0, -R * 0.9] },
      { pos: [20, 70, 110], look: [0, 0, 0] },
      { pos: [0, 130, 175], look: [0, 0, 0] },
    ], 52);
    const captions = DATA.flight;
    let lastCaption = -1;
    flight.onCaption = null;

    /* ---- per-frame ---- */
    function update(dt, camera) {
      const t = APP.MATS.uniforms.uTime.value;
      beamA.uniforms.uTime.value = t;
      beamB.uniforms.uTime.value = t;
      /* flashes */
      flashTimer -= dt;
      if (flashTimer <= 0) {
        flashTimer = 2.4 + Math.random() * 1.4;
        flashAlt = !flashAlt;
        const name = flashAlt ? 'ATLAS' : 'CMS';
        spawnFlash(expAnchors[name], flashAlt ? 0xffe9b0 : 0xbfefff);
      }
      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i]; f.t += dt;
        const k = f.t / 1.1;
        f.spr.material.opacity = Math.max(0, 1 - k);
        f.spr.scale.setScalar(2 + k * 9);
        f.ringM.material.opacity = Math.max(0, 1 - k) * 0.8;
        f.ringM.scale.setScalar(1 + k * 7);
        if (k >= 1) {
          scene.remove(f.spr, f.ringM);
          f.spr.material.map.dispose(); f.spr.material.dispose();
          f.ringM.geometry.dispose(); f.ringM.material.dispose();
          flashes.splice(i, 1);
        }
      }
      /* flight + captions */
      if (flight.active) {
        flight.update(dt, camera);
        if (flight.onCaption) {
          let idx = -1;
          for (let i = 0; i < captions.length; i++) if (flight.t >= captions[i].at) idx = i;
          if (idx !== lastCaption) { lastCaption = idx; flight.onCaption(idx >= 0 ? captions[idx].caption : ''); }
        }
      }
    }

    function setSpeed(mult) { beamA.uniforms.uSpeed.value = 0.5 * mult; beamB.uniforms.uSpeed.value = 0.5 * mult; }

    return { scene, update, flight, setSpeed, R };
  }
})();
