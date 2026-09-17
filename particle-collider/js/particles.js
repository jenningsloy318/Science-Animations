/* ============================================================================
 * particles.js — "粒子家族" view: the known particles of the Standard Model
 * plus how they compose larger particles (hadrons -> nucleus -> atom).
 *
 * All masses/charges are PDG values (2024-era, rounded for display):
 *   quarks u 2.2 MeV, d 4.7, s 95, c 1.27 GeV, b 4.18 GeV, t 172.7 GeV
 *   leptons e 0.511 MeV, mu 105.7 MeV, tau 1.777 GeV; neutrinos < 1 eV
 *   gauge: gamma 0, W 80.4 GeV, Z 91.188 GeV, gluon 0 (8 colours)
 *   Higgs 125.20 GeV
 * Quark "current/MS-bar" masses are scheme-dependent - disclosed in the info
 * card. Composites: proton uud 938.3 MeV, neutron udd 939.6, pi+ ud~ 139.6,
 * hydrogen (p + e), helium-4 atom (2p+2n + 2e).
 * ==========================================================================*/
(function () {
  const TAU = Math.PI * 2;
  const COL = { q: 0xb388ff, l: 0x6fe3c4, g: 0xd8b25c, h: 0xf06292, anti: 0x7fc4ff };

  /* sym, zh, en, mass display, mass in MeV (for radius), charge, kind, note zh, note en */
  const P = [
    { s: 'u', zh: '上夸克', en: 'up', m: '2.2 MeV', mv: 2.2, q: '+2/3', k: 'q', nz: '最轻的夸克，质子由它组成', ne: 'lightest quark, builds the proton' },
    { s: 'd', zh: '下夸克', en: 'down', m: '4.7 MeV', mv: 4.7, q: '-1/3', k: 'q', nz: '质子/中子的另一半', ne: 'the other half of protons & neutrons' },
    { s: 'c', zh: '粲夸克', en: 'charm', m: '1.27 GeV', mv: 1270, q: '+2/3', k: 'q', nz: '1974 年发现（J/ψ 介子）', ne: 'found 1974 via the J/psi meson' },
    { s: 's', zh: '奇夸克', en: 'strange', m: '95 MeV', mv: 95, q: '-1/3', k: 'q', nz: 'K 介子与超子成员', ne: 'member of kaons and hyperons' },
    { s: 'b', zh: '底夸克', en: 'bottom', m: '4.18 GeV', mv: 4180, q: '-1/3', k: 'q', nz: 'B 强子、Y 介子成员', ne: 'builds B hadrons and upsilon' },
    { s: 't', zh: '顶夸克', en: 'top', m: '172.7 GeV', mv: 172700, q: '+2/3', k: 'q', nz: '已知最重的基本粒子（1995）', ne: 'heaviest known elementary particle (1995)' },
    { s: 'e', zh: '电子', en: 'electron', m: '0.511 MeV', mv: 0.511, q: '-1', k: 'l', nz: '第一个被发现的基本粒子（1897）', ne: 'first elementary particle found (1897)' },
    { s: '\u03BC', zh: '缪子', en: 'muon', m: '105.7 MeV', mv: 105.7, q: '-1', k: 'l', nz: '电子的"重兄弟"（1936）', ne: "the electron's heavy sibling (1936)" },
    { s: '\u03C4', zh: 'τ 子', en: 'tau', m: '1.777 GeV', mv: 1777, q: '-1', k: 'l', nz: '最重的带电轻子（1975）', ne: 'heaviest charged lepton (1975)' },
    { s: '\u03BDe', zh: '电子中微子', en: 'nu_e', m: '< 1 eV', mv: 0, q: '0', k: 'l', nz: '几乎没有质量，只走弱作用', ne: 'nearly massless, weak-only' },
    { s: '\u03BD\u03BC', zh: 'μ 中微子', en: 'nu_mu', m: '< 1 eV', mv: 0, q: '0', k: 'l', nz: '1962 年发现', ne: 'discovered 1962' },
    { s: '\u03BD\u03C4', zh: 'τ 中微子', en: 'nu_tau', m: '< 1 eV', mv: 0, q: '0', k: 'l', nz: '2000 年直接探测', ne: 'directly detected in 2000' },
    { s: '\u03B3', zh: '光子', en: 'photon', m: '0', mv: 0, q: '0', k: 'g', nz: '电磁力的传递者', ne: 'carrier of the electromagnetic force' },
    { s: 'W\u00B1', zh: 'W 玻色子', en: 'W boson', m: '80.4 GeV', mv: 80400, q: '\u00B11', k: 'g', nz: '弱作用传递者（1983）', ne: 'weak-force carrier (1983)' },
    { s: 'Z\u2070', zh: 'Z 玻色子', en: 'Z boson', m: '91.19 GeV', mv: 91188, q: '0', k: 'g', nz: '弱作用传递者（1983）', ne: 'weak-force carrier (1983)' },
    { s: 'g', zh: '胶子', en: 'gluon', m: '0', mv: 0, q: '色荷', k: 'g', nz: '8 种，把夸克黏在一起', ne: '8 kinds, glue the quarks' },
    { s: 'H', zh: '希格斯玻色子', en: 'Higgs', m: '125.2 GeV', mv: 125200, q: '0', k: 'h', nz: '质量的来源（2012 发现）', ne: 'the origin of mass (found 2012)' },
  ];

  const COMPOSITES = {
    p:  { name: '\u8D28\u5B50 p\u207A', comp: 'u u d', m: '938.3 MeV', q: '+1',
          quarks: [['u', COL.q], ['u', COL.q], ['d', COL.anti]], note: '\u4E09\u4E2A\u5938\u514B\u9760\u80F6\u5B50\u7ED1\u5728\u4E00\u8D77 \u2014 \u80F6\u5B50\u6D41\u7BA1\u8D8A\u62C9\u8D8A\u7D27\uFF08\u6E10\u8FD1\u81EA\u7531\uFF09' },
    n:  { name: '\u4E2D\u5B50 n', comp: 'u d d', m: '939.6 MeV', q: '0',
          quarks: [['u', COL.q], ['d', COL.anti], ['d', COL.anti]], note: '\u4E0E\u8D28\u5B50\u51E0\u4E4E\u4E00\u6837\u91CD \u2014 \u7535\u8377\u4E3A 0\uFF0C\u539F\u5B50\u6838\u7684\u53E6\u4E00\u534A' },
    pi: { name: '\u03C0\u207A \u4ECB\u5B50', comp: 'u d\u0305', m: '139.6 MeV', q: '+1',
          quarks: [['u', COL.q], ['d\u0305', COL.anti]], note: '\u5938\u514B+\u53CD\u5938\u514B\u7684\u7ED3\u5408 \u2014 \u4ECB\u5B50\u5BB6\u65CF\u7684\u4EE3\u8868' },
    h:  { name: '\u6C22\u539F\u5B50', comp: 'p + e\u207B', m: '\u2248938.8 MeV', q: '0',
          quarks: [['p', 0xd8b25c]], note: '\u4E00\u4E2A\u8D28\u5B50\u6838 + 1 \u4E2A\u7535\u5B50\u7ED5\u8F68 \u2014 \u7535\u78C1\u529B\u628A\u4ED6\u4EEC\u7ED1\u4F4F\uFF08\u7ED3\u5408\u80FD 13.6 eV\uFF09', electron: true },
    he: { name: '\u6C26-4 \u539F\u5B50', comp: '2p + 2n + 2e\u207B', m: '\u22483.73 GeV', q: '0',
          quarks: [['p', 0xd8b25c], ['p', 0xd8b25c], ['n', 0x8b95a2], ['n', 0x8b95a2]], note: '\u539F\u5B50\u6838\uFF082p+2n\uFF09+ 2 \u4E2A\u7535\u5B50 \u2014 \u5269\u4F59\u5F3A\u6838\u529B\u62B5\u6297\u7535\u78C1\u65A5\u529B', electron: true },
  };

  window.APP = window.APP || {};

  function build(renderer) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(APP.MATS.PALETTE.bg);
    scene.fog = new THREE.FogExp2(APP.MATS.PALETTE.fog, 0.0035);
    scene.environment = APP.MATS.env;
    scene.add(new THREE.HemisphereLight(0x9fb2c8, 0x10141a, 0.9));
    const key = new THREE.DirectionalLight(0xfff1da, 1.6); key.position.set(18, 26, 22); scene.add(key);

    let camRef = null;
    const pickables = [];
    const group = new THREE.Group(); scene.add(group);

    function makeLabel(title, sub, minW, k) {
      /* auto-size: canvas width from measured text - nothing gets chopped */
      k = k || 1;
      const probe = document.createElement('canvas').getContext('2d');
      probe.font = 'bold 46px Outfit, sans-serif';
      const wT = probe.measureText(title).width;
      probe.font = '28px Outfit, sans-serif';
      const wS = sub ? probe.measureText(sub).width : 0;
      const c = document.createElement('canvas');
      c.width = Math.max(minW || 0, Math.ceil(Math.max(wT, wS)) + 44);
      c.height = 128;
      const x = c.getContext('2d');
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillStyle = '#f0e6c8'; x.font = 'bold 46px Outfit, sans-serif';
      x.fillText(title, c.width / 2, 36);
      if (sub) { x.fillStyle = '#9fb4c9'; x.font = '28px Outfit, sans-serif'; x.fillText(sub, c.width / 2, 92); }
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
      sp.scale.set((c.width / 128) * k, k, 1);
      return sp;
    }

    /* ── SM grid: 4x3 fermions + 5 bosons ── */
    const FERM_COLS = 4;
    const LAYOUT = { u: [0,0], d: [1,0], e: [2,0], '\u03BDe': [3,0],
                     c: [0,1], s: [1,1], '\u03BC': [2,1], '\u03BD\u03BC': [3,1],
                     t: [0,2], b: [1,2], '\u03C4': [2,2], '\u03BD\u03C4': [3,2],
                     '\u03B3': [0,3], 'W\u00B1': [1,3], 'Z\u2070': [2,3], g: [3,3], H: [4,3] };
    P.forEach((p, i) => {
      const g = new THREE.Group();
      const cell = LAYOUT[p.s];
      let gx, gy, gz;
      if (cell) {
        gx = (cell[0] - 1.6) * 3.1; gy = 4.1 - cell[1] * 2.75; gz = -6;
      }
      const r = 0.24 + 0.42 * Math.min(1, Math.log10(p.mv + 1.2) / 5.24);
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 20),
        new THREE.MeshStandardMaterial({ color: COL[p.k], metalness: 0.35, roughness: 0.35,
          emissive: COL[p.k], emissiveIntensity: 0.22 }));
      mesh.position.set(gx, gy, gz);
      mesh.userData.p = p;
      g.add(mesh); pickables.push(mesh);
      const lbl = makeLabel(p.s + ' ' + p.zh, p.m + ' \u00B7 q=' + p.q, 260, 1.45);
      lbl.position.set(gx, gy + r + 0.55, gz);
      g.add(lbl);
      group.add(g);
    });

    /* ── matter hierarchy strip ── */
    const chain = ['\u5938\u514B', '\u8D28\u5B50/\u4E2D\u5B50', '\u539F\u5B50\u6838', '\u539F\u5B50', '\u5206\u5B50', '\u4F60'];
    chain.forEach((t, i) => {
      const sp = makeLabel(t, '', 150);
      sp.position.set((i - 2.5) * 2.6 - 8.5, -7.2, -4);
      sp.material.opacity = 0.75;
      group.add(sp);
      if (i < chain.length - 1) {
        const arrow = makeLabel('\u2192', '', 60);
        arrow.position.set((i - 2.5) * 2.6 + 1.3, -7.2, -4);
        group.add(arrow);
      }
    });

    /* ── column headers ── */
    const colL = makeLabel('\u57FA\u672C\u7C92\u5B50 \u00B7 \u6807\u51C6\u6A21\u578B\uFF08\u9759\u6001\uFF09', 'Standard Model \u00B7 static', 680, 1.15);
    colL.position.set(-8.5, 6.6, -6);
    group.add(colL);
    const colR = makeLabel('\u5B83\u4EEC\u7EC4\u6210\u7684\u5927\u7C92\u5B50\uFF08\u52A8\u753B\uFF09', 'composites \u00B7 animated', 640, 1.15);
    colR.position.set(9.2, 4.6, 4);
    group.add(colR);

    /* ── composite builder (right column) ── */
    const compGroup = new THREE.Group();
    compGroup.position.set(9.2, 0.6, 2);
    scene.add(compGroup);
    let tubeMats = [], electronPivots = [];
    const fluxMat = () => new THREE.MeshStandardMaterial({ color: 0xd8b25c, emissive: 0xd8b25c,
      emissiveIntensity: 0.55, metalness: 0.3, roughness: 0.4, transparent: true, opacity: 0.8 });

    function quarkBall(sym, color) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.62, 26, 18),
        new THREE.MeshStandardMaterial({ color, metalness: 0.35, roughness: 0.35,
          emissive: color, emissiveIntensity: 0.3 }));
      const lb = makeLabel(sym, '', 110); lb.scale.set(0.86, 0.86, 1).multiplyScalar(1); lb.position.y = 0.95;
      m.add(lb);
      return m;
    }
    function fluxTube(a, b, sag) {
      const mid = a.clone().add(b).multiplyScalar(0.5);
      mid.z -= sag;
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const t = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.055, 8), fluxMat());
      tubeMats.push(t.material);
      return t;
    }
    function setComposite(kind) {
      const c = COMPOSITES[kind]; if (!c) return;
      compGroup.clear(); tubeMats = []; electronPivots = [];
      const n = c.quarks.length;
      c.quarks.forEach(([sym, col], i) => {
        if (n === 4) {
          const off = [[0.55, 0.55], [-0.55, 0.55], [0.55, -0.55], [-0.55, -0.55]][i];
          const q = quarkBall(sym, col); q.position.set(off[0], off[1] + 0.4, 0); compGroup.add(q);
        } else if (n === 1) {
          const q = quarkBall(sym, col); q.position.set(0, 0.4, 0); compGroup.add(q);
        } else {
          const a = (i / n) * TAU - Math.PI / 2, R = n === 2 ? 1.15 : 1.3;
          const q = quarkBall(sym, col); q.position.set(Math.cos(a) * R, Math.sin(a) * R + 0.4, 0);
          compGroup.add(q);
          const prev = compGroup.children[compGroup.children.length - 1];
        }
      });
      /* flux tubes between every pair (n=2: one tube) */
      const balls = compGroup.children.filter((o) => o.isMesh);
      for (let i = 0; i < balls.length; i++)
        for (let j = i + 1; j < balls.length; j++)
          compGroup.add(fluxTube(balls[i].position.clone(), balls[j].position.clone(), 0.6));
      if (c.electron) {
        const cnt = kind === 'h' ? 1 : 2;
        for (let e = 0; e < cnt; e++) {
          const pivot = new THREE.Group(); pivot.rotation.y = (e / cnt) * Math.PI;
          const orb = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.012, 6, 64),
            new THREE.MeshBasicMaterial({ color: 0x6fd3e8, transparent: true, opacity: 0.4 }));
          orb.rotation.x = Math.PI / 2; pivot.add(orb);
          const el = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12),
            new THREE.MeshStandardMaterial({ color: 0x6fe3c4, emissive: 0x6fe3c4, emissiveIntensity: 0.8 }));
          el.position.x = 2.6; el.userData.orbSpeed = 1.6 + e * 0.4; pivot.add(el);
          electronPivots.push({ pivot, el });
          compGroup.add(pivot);
        }
      }
      const title = makeLabel(c.name + ' \u00B7 ' + c.comp, c.m + ' \u00B7 q=' + c.q, 420, 1.15);
      title.position.set(0, 2.6, 0); compGroup.add(title);
      const note = makeLabel(c.note, '', 560, 1.05);
      note.position.set(0, -2.4, 0); compGroup.add(note);
    }
    setComposite('p');

    /* ── picking ── */
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    renderer.domElement.addEventListener('click', (e) => {
      if (!window.APP.app || APP.app.view !== 'particles' || !camRef) return;
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(ndc, camRef);
      const hit = ray.intersectObjects(pickables, false)[0];
      if (hit) showInfo(hit.object.userData.p);
    });
    function showInfo(p) {
      const box = document.getElementById('particleInfo');
      if (!box) return;
      const zh = APP.lang === 'zh';
      box.innerHTML = '<b>' + p.s + ' \u00B7 ' + (zh ? p.zh : p.en) + '</b>'
        + '<span class="pi-row">' + (zh ? '\u7535\u8377' : 'charge') + ': ' + p.q
        + ' \u00B7 ' + (zh ? '\u8D28\u91CF' : 'mass') + ': ' + p.m + '</span>'
        + '<span>' + (zh ? p.nz : p.ne) + '</span>';
      box.classList.add('show');
      clearTimeout(box._t);
      box._t = setTimeout(() => box.classList.remove('show'), 6500);
    }

    let t = 0;
    function update(dt, orbit, active, camera) {
      if (active === false) return;
      camRef = camera;
      t += dt;
      /* subtle idle wobble of the composite quarks + flux pulse */
      compGroup.rotation.y = Math.sin(t * 0.4) * 0.35;
      const pulse = 0.45 + 0.25 * Math.sin(t * 3.2);
      for (const m of tubeMats) m.emissiveIntensity = pulse;
      for (const e of electronPivots) e.pivot.rotation.y += dt * e.el.userData.orbSpeed;
    }

    return { scene, update, setComposite };
  }

  APP.Particles = { build };
})();
