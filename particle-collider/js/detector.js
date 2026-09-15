/* ============================================================================
 * detector.js — layered detector (ATLAS-inspired), ~23k individually placed parts
 * 1 scene unit ≈ 0.5 m; total length ≈ ±46 u (≈ ATLAS's 46 m), radius ≈ ±33 u.
 * Layout is schematic: inner radii/lengths exaggerated so every layer reads.
 * Radial stack (assembled): pipe 0.55 · pixel 1.8–4.2 · SCT 5.2–7.9 · TRT 8.6–10.8
 *   · solenoid 11.6 · EM 12.6–14.4 · tile 14.9–18.2 · toroid coils 18.6–27
 *   · muon barrel 28–32.4 · EC: trackers→calo wheels→EC toroid→big wheels
 * ==========================================================================*/
(function () {
  const U = APP.U, TAU = U.TAU;
  const dummy = new THREE.Object3D();
  const _col = new THREE.Color();
  const Y_AXIS = new THREE.Vector3(0, 1, 0);

  APP.Detector = { build };

  function build(renderer) {
    const M = APP.MATS.m;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(APP.MATS.PALETTE.bg);
    scene.fog = new THREE.FogExp2(APP.MATS.PALETTE.fog, 0.0021);
    scene.environment = APP.MATS.env;
    addLights(scene);

    const explode = new U.Explodable();
    const systems = {};
    const order = APP.DATA.systems.map(s => s.id);

    const sys = (id) => {
      if (!systems[id]) {
        const root = new THREE.Group(); root.name = id;
        scene.add(root);
        systems[id] = { root, count: 0, ids: [] };
      }
      return systems[id];
    };
    const reg = (id, obj, stage, dir, amp, opts) => {
      const s = sys(id);
      s.root.add(obj);
      s.count += (obj.isInstancedMesh && obj.count !== undefined) ? obj.count : 1;
      s.ids.push(obj.uuid);
      if (stage) explode.addObject(obj, stage, dir, amp, opts);
      return obj;
    };
    const regIM = (id, im, stage, dirFn, ampFn) => {
      sys(id).root.add(im);
      sys(id).count += im.count;
      if (stage) explode.addInstanced(im, stage, dirFn, ampFn);
      return im;
    };

    function makeIM(geo, mat, items) {
      const im = new THREE.InstancedMesh(geo, mat, items.length);
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        dummy.position.set(it.p[0], it.p[1], it.p[2]);
        if (it.q) dummy.quaternion.copy(it.q);
        else if (it.rz !== undefined || it.rx !== undefined) dummy.rotation.set(it.rx || 0, 0, it.rz || 0);
        else dummy.rotation.set(0, 0, 0);
        dummy.scale.set(it.s ? it.s[0] : 1, it.s ? it.s[1] : 1, it.s ? it.s[2] : 1);
        dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix);
        const j = 0.82 + U.rng(1000 + i * 7)() * 0.36;
        im.setColorAt(i, _col.setRGB(j, j, j));
      }
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      return im;
    }
    const tangentRz = (th) => th + Math.PI / 2;   /* local X → tangent, local Y → radial */

    buildPipe();
    buildPixel();
    buildTRT();
    buildSCT();
    buildSolenoid();
    buildSupports();
    buildCalorimeters();
    buildToroids();
    buildMuon();
    addAmbience(scene);

    const total = order.reduce((a, id) => a + (systems[id] ? systems[id].count : 0), 0);

    const focus = {};
    const box = new THREE.Box3(), bsph = new THREE.Sphere();
    for (const id of order) {
      if (!systems[id]) continue;
      box.setFromObject(systems[id].root);
      box.getBoundingSphere(bsph);
      focus[id] = { center: bsph.center.clone(), radius: bsph.radius };
    }

    return { scene, explode, systems, order, total, focus,
      setExplode(t) { explode.setT(t); } };

    /* ====================================================================== */
    function buildPipe() {
      const seg = (z0, z1, r) => new THREE.Mesh(
        new THREE.CylinderGeometry(r, r, z1 - z0, 24, 1, true).rotateX(Math.PI / 2), M.pipe);
      const glow = (z0, z1) => new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.4, z1 - z0 - 0.6, 12, 1, true).rotateX(Math.PI / 2), M.pipeGlow);
      const flange = (z) => { const f = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.1, 8, 24), M.gold); f.position.z = z; f.rotation.x = Math.PI / 2; return f; };

      reg('pipe', seg(-6, 6, 0.55), 0, U.zDir(1), 0);
      reg('pipe', glow(-25, 25), 0, U.zDir(1), 0);
      for (const sgn of [1, -1]) {
        reg('pipe', seg(sgn * 6, sgn * 13, 0.55), 6, U.zDir(sgn), 6);
        reg('pipe', seg(sgn * 13, sgn * 21, 0.55), 6, U.zDir(sgn), 11);
        reg('pipe', seg(sgn * 21, sgn * 26.5, 0.55), 6, U.zDir(sgn), 16);
        reg('pipe', flange(sgn * 6.5), 6, U.zDir(sgn), 8.5);
        reg('pipe', flange(sgn * 13.5), 6, U.zDir(sgn), 13.5);
        reg('pipe', flange(sgn * 21.3), 6, U.zDir(sgn), 18.5);
      }
      const ip = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0xbfefff }));
      reg('pipe', ip, 0, U.zDir(1), 0);
      const glowSpr = new THREE.Sprite(new THREE.SpriteMaterial({
        map: U.glowTexture('rgba(160,230,255,0.9)'), transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.85 }));
      glowSpr.scale.set(5, 5, 1);
      reg('pipe', glowSpr, 0, U.zDir(1), 0);
      const lbl = U.makeLabel('Interaction point', { size: 40, color: '#bfeaff', height: 2.6, depthTest: true });
      lbl.position.set(0, 4.6, 0);
      reg('pipe', lbl, 6, U.zDir(1), 4);
    }

    function buildPixel() {
      const geo = new THREE.BoxGeometry(0.44, 0.16, 0.6);
      const items = [];
      const layers = [1.8, 2.6, 3.4, 4.2], rows = [5, 6, 8, 10];
      layers.forEach((r, li) => {
        const n = Math.floor((TAU * r) / 0.5);
        for (let i = 0; i < n; i++) {
          const th = (i / n) * TAU + li * 0.013;
          for (let k = 0; k < rows[li]; k++) {
            const z = -8 + 0.6 + k * ((16 - 1.2) / (rows[li] - 1));
            items.push({ p: [r * Math.cos(th), r * Math.sin(th), z], rz: tangentRz(th), layer: li });
          }
        }
      });
      regIM('pixel', makeIM(geo, M.pixelModule, items), 6,
        (i, p) => U.radialDir(p), (i) => 3 + items[i].layer * 1.15);

      const dgeo = new THREE.BoxGeometry(0.55, 0.4, 0.12);
      const disks = [8.2, 9.2, 10.2];
      const dItems = [];
      disks.forEach((z, di) => {
        for (const sgn of [1, -1]) {
          [1.8, 2.6, 3.4].forEach((r) => {
            const n = Math.floor((TAU * r) / 0.5);
            for (let i = 0; i < n; i++) {
              const th = (i / n) * TAU + di * 0.13;
              dItems.push({ p: [r * Math.cos(th), r * Math.sin(th), sgn * z], rz: th, disk: di });
            }
          });
        }
      });
      regIM('pixel', makeIM(dgeo, M.pixelModule, dItems), 6,
        (i, p) => U.zDir(Math.sign(p.z)), (i) => 3 + dItems[i].disk * 1.6);
      disks.forEach((z, di) => {
        for (const sgn of [1, -1]) {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(3.85, 0.06, 6, 48), M.structureDark);
          ring.position.z = sgn * z;
          reg('pixel', ring, 6, U.zDir(sgn), 3 + di * 1.6);
        }
      });
    }

    function buildTRT() {
      const geo = new THREE.CylinderGeometry(0.078, 0.078, 6.5, 6, 1, true).rotateX(Math.PI / 2);
      const items = [];
      for (let L = 0; L < 12; L++) {
        const r = 8.6 + L * 0.185;
        const n = Math.floor((TAU * r) / 0.17);
        for (let i = 0; i < n; i++) {
          const th = (i / n) * TAU + (L % 2) * (Math.PI / n);
          for (const zc of [-3.6, 3.6]) items.push({ p: [r * Math.cos(th), r * Math.sin(th), zc], rz: th, L });
        }
      }
      regIM('trt', makeIM(geo, M.straw, items), 5,
        (i, p) => U.radialDir(p), (i) => 2.4 + items[i].L * 0.55);

      const egeo = new THREE.CylinderGeometry(0.07, 0.07, 1.7, 6, 1, true);
      const eItems = [];
      for (let w = 0; w < 8; w++) {
        const z = 11.5 + w * 0.72 + 0.36;
        for (const sgn of [1, -1]) {
          for (let sec = 0; sec < 12; sec++) {
            const base = (sec / 12) * TAU + w * 0.05;
            for (let row = 0; row < 10; row++) {
              const r = 6.6 + row * 0.5;
              const th = base + row * 0.004;
              const d = new THREE.Vector3(Math.cos(th), Math.sin(th), 0);
              eItems.push({ p: [r * d.x, r * d.y, sgn * z],
                q: new THREE.Quaternion().setFromUnitVectors(Y_AXIS, d) });
            }
          }
        }
      }
      regIM('trt', makeIM(egeo, M.straw, eItems), 5,
        (i, p) => U.zDir(Math.sign(p.z)), () => 9.5);
      for (let w = 0; w < 8; w++) {
        const z = 11.5 + w * 0.72 + 0.36;
        for (const sgn of [1, -1]) {
          const rim = new THREE.Mesh(new THREE.TorusGeometry(11.3, 0.09, 6, 56), M.structureDark);
          rim.position.z = sgn * z;
          reg('trt', rim, 5, U.zDir(sgn), 9.5);
        }
      }
    }

    function buildSCT() {
      const geo = new THREE.BoxGeometry(0.56, 0.14, 0.72);
      const items = [];
      const layers = [5.2, 6.0, 6.8, 7.6];
      layers.forEach((r, li) => {
        const n = Math.floor((TAU * r) / 0.62);
        for (let i = 0; i < n; i++) {
          const th = (i / n) * TAU + li * 0.05;
          for (let k = 0; k < 8; k++) {
            const z = -9.45 + k * 2.7;
            items.push({ p: [r * Math.cos(th), r * Math.sin(th), z], rz: tangentRz(th), L: li });
          }
        }
      });
      regIM('sct', makeIM(geo, M.sctModule, items), 5,
        (i, p) => U.radialDir(p), (i) => 4 + items[i].L * 1.3);

      const dgeo = new THREE.BoxGeometry(0.62, 0.42, 0.12);
      const diskAmp = (z) => 3 + (Math.abs(z) - 11.2) * 1.35;
      const dItems = [];
      const ringR = [[3.4, 12], [4.6, 18], [5.8, 24]];
      for (let d = 0; d < 9; d++) {
        const z = 11.2 + d * 0.72 + 0.36;
        for (const sgn of [1, -1]) {
          ringR.forEach(([r, n]) => {
            for (let i = 0; i < n; i++) {
              const th = (i / n) * TAU + d * 0.11;
              dItems.push({ p: [r * Math.cos(th), r * Math.sin(th), sgn * z], rz: th, z: sgn * z });
            }
          });
        }
      }
      regIM('sct', makeIM(dgeo, M.sctModule, dItems), 5,
        (i, p) => U.zDir(Math.sign(p.z)), (i) => diskAmp(dItems[i].z));
      for (let d = 0; d < 9; d++) {
        const z = 11.2 + d * 0.72 + 0.36;
        for (const sgn of [1, -1]) {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(6.3, 0.08, 6, 56), M.structureDark);
          ring.position.z = sgn * z;
          reg('sct', ring, 5, U.zDir(sgn), diskAmp(z));
        }
      }
    }

    function buildSolenoid() {
      for (const sgn of [1, -1]) {
        const half = new THREE.Mesh(
          new THREE.CylinderGeometry(11.6, 11.6, 10.6, 48, 1, true, sgn > 0 ? 0 : Math.PI, Math.PI).rotateX(Math.PI / 2),
          M.solenoidShell);
        reg('solenoid', half, 4, new THREE.Vector3(sgn, 0, 0), 6.5);
      }
      const ribs = new THREE.Group();
      for (let i = 0; i < 8; i++) {
        const th = (i / 8) * TAU;
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 10.2), M.gold);
        rib.position.set(11.95 * Math.cos(th), 11.95 * Math.sin(th), 0);
        rib.rotation.z = th + Math.PI / 2;
        ribs.add(rib);
      }
      reg('solenoid', ribs, 4, new THREE.Vector3(0, 1, 0), 4.5);
      for (const z of [-5.3, 5.3]) {
        const f = new THREE.Mesh(new THREE.TorusGeometry(11.6, 0.28, 10, 56), M.gold);
        f.position.z = z;
        reg('solenoid', f, 0, U.zDir(1), 0);
      }
    }

    function buildSupports() {
      const feet = new THREE.Group();
      for (const sx of [1, -1]) for (const sz of [1, -1]) {
        const foot = new THREE.Mesh(new THREE.BoxGeometry(8, 5.5, 6), M.structureDark);
        foot.position.set(sx * 14, -31.2, sz * 19);
        feet.add(foot);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(9, 0.7, 7), M.gold);
        cap.position.set(sx * 14, -28.5, sz * 19);
        feet.add(cap);
      }
      reg('support', feet, 4, new THREE.Vector3(0, -1, 0), 5);
      const rails = new THREE.Group();
      for (const sx of [1, -1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 46), M.structure);
        rail.position.set(sx * 14, -28.9, 0);
        rails.add(rail);
      }
      reg('support', rails, 4, U.zDir(1), 6);
    }

    function buildCalorimeters() {
      /* EM accordion barrel — north/south halves */
      const plateGeo = new THREE.BoxGeometry(2.1, 0.09, 25.4);
      for (const sgn of [1, -1]) {
        const items = [];
        for (let m = 0; m < 32; m++) {
          const th = (m / 32) * TAU;
          for (let p = 0; p < 10; p++) {
            const r = 12.75 + p * 0.128;
            const tilt = (p % 2 === 0 ? 1 : -1) * 0.16;
            items.push({ p: [r * Math.cos(th), r * Math.sin(th), sgn * 6.55], rz: tangentRz(th) + tilt });
          }
        }
        reg('emcal', makeIM(plateGeo, M.emLead, items), 3, U.zDir(sgn), 12);
        const girder = new THREE.Mesh(
          new THREE.CylinderGeometry(14.35, 14.35, 13, 64, 1, true).rotateX(Math.PI / 2), M.emGirder);
        girder.position.z = sgn * 6.55;
        reg('emcal', girder, 3, U.zDir(sgn), 12);
      }
      /* EM end-cap accordion wheels (LAr) */
      const ecPlate = new THREE.BoxGeometry(2.3, 0.09, 1.1);
      for (const sgn of [1, -1]) {
        const items = [];
        for (let sec = 0; sec < 16; sec++) {
          const th = ((sec + 0.5) / 16) * TAU;
          [6.5, 8.3, 10.1].forEach((r, ri) => {
            items.push({ p: [r * Math.cos(th), r * Math.sin(th), sgn * (18.4 + ri * 0.5)], rx: (ri % 2 ? 1 : -1) * 0.18 });
          });
        }
        reg('emcal', makeIM(ecPlate, M.emLead, items), 3, U.zDir(sgn), 15);
        const disk = new THREE.Mesh(new THREE.CylinderGeometry(10.4, 10.4, 0.8, 48).rotateX(Math.PI / 2), M.emGirder);
        disk.position.z = sgn * 19.9;
        reg('emcal', disk, 3, U.zDir(sgn), 15);
      }
      /* Tile barrel — north/south halves */
      const tileGeo = new THREE.BoxGeometry(1.7, 0.24, 1.55);
      for (const sgn of [1, -1]) {
        const items = [];
        for (let m = 0; m < 32; m++) {
          const th = ((m + 0.5) / 32) * TAU;
          for (let row = 0; row < 12; row++) {
            const r = 14.9 + row * 0.26;
            for (let cell = 0; cell < 2; cell++) {
              items.push({ p: [r * Math.cos(th), r * Math.sin(th), sgn * (2.0 + cell * 3.1)], rz: th });
            }
          }
        }
        reg('hadcal', makeIM(tileGeo, M.tile, items), 3, U.zDir(sgn), 9.5);
        const skin = new THREE.Mesh(
          new THREE.CylinderGeometry(18.2, 18.2, 13.4, 64, 1, true).rotateX(Math.PI / 2), M.tileSteel);
        skin.position.z = sgn * 6.75;
        reg('hadcal', skin, 3, U.zDir(sgn), 9.5);
      }
      /* Tile extended barrels */
      for (const sgn of [1, -1]) {
        const items = [];
        for (let m = 0; m < 32; m++) {
          const th = ((m + 0.5) / 32) * TAU;
          for (let row = 0; row < 8; row++) {
            const r = 15.3 + row * 0.26;
            for (let cell = 0; cell < 2; cell++) {
              items.push({ p: [r * Math.cos(th), r * Math.sin(th), sgn * (15.6 + cell * 3.2)], rz: th });
            }
          }
        }
        reg('hadcal', makeIM(tileGeo, M.tile, items), 3, U.zDir(sgn), 6.5);
        const skin = new THREE.Mesh(
          new THREE.CylinderGeometry(18.2, 18.2, 6.4, 64, 1, true).rotateX(Math.PI / 2), M.tileSteel);
        skin.position.z = sgn * 17.3;
        reg('hadcal', skin, 3, U.zDir(sgn), 6.5);
      }
      /* HEC copper wheels */
      for (const sgn of [1, -1]) {
        const items = [];
        for (let sec = 0; sec < 16; sec++) {
          const th = ((sec + 0.5) / 16) * TAU;
          for (let ring = 0; ring < 3; ring++) {
            const r = 6.5 + ring * 3.6;
            items.push({ p: [r * Math.cos(th), r * Math.sin(th), sgn * 21.6], rz: th });
          }
        }
        reg('hadcal', makeIM(new THREE.BoxGeometry(3.4, 0.8, 2.6), M.copper, items), 3, U.zDir(sgn), 11);
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(14.4, 14.4, 2.4, 48).rotateX(Math.PI / 2), M.tileSteel);
        wheel.position.z = sgn * 21.6;
        reg('hadcal', wheel, 3, U.zDir(sgn), 11);
      }
      /* FCAL stacks */
      for (const sgn of [1, -1]) {
        for (let k = 0; k < 3; k++) {
          const f = new THREE.Mesh(new THREE.CylinderGeometry(4.2 - k * 0.3, 4.2 - k * 0.3, 0.5, 32).rotateX(Math.PI / 2), M.copper);
          f.position.z = sgn * (23.6 + k * 0.9);
          reg('hadcal', f, 3, U.zDir(sgn), 7 + k * 1.5);
        }
      }
    }

    /* rounded-rect coil extruded along the tangential axis */
    function coilGeo(rIn, rOut, halfLen, corner, thick) {
      const w = rOut - rIn, h = halfLen * 2, x = -w / 2, y = -h / 2;
      const s = new THREE.Shape();
      s.moveTo(x + corner, y);
      s.lineTo(x + w - corner, y); s.quadraticCurveTo(x + w, y, x + w, y + corner);
      s.lineTo(x + w, y + h - corner); s.quadraticCurveTo(x + w, y + h, x + w - corner, y + h);
      s.lineTo(x + corner, y + h); s.quadraticCurveTo(x, y + h, x, y + h - corner);
      s.lineTo(x, y + corner); s.quadraticCurveTo(x, y, x + corner, y);
      const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false });
      g.translate(0, 0, -thick / 2);
      /* shape XY → (radial x, beam z), extrude → tangential y */
      g.rotateX(Math.PI / 2);
      g.translate((rIn + rOut) / 2, 0, 0);
      return g;
    }

    function buildToroids() {
      const barrelGeo = coilGeo(18.6, 27, 25.3, 6, 2.0);
      for (let i = 0; i < 8; i++) {
        const th = (i / 8) * TAU;
        const g = new THREE.Group();
        g.add(new THREE.Mesh(barrelGeo, M.coil));
        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 40, 8).rotateX(Math.PI / 2), M.structure);
        strut.position.x = 22.8;
        g.add(strut);
        for (const zz of [-23, 23]) {
          const plate = new THREE.Mesh(new THREE.BoxGeometry(2.6, 8.4, 1.2), M.gold);
          plate.position.set(22.8, 0, zz);
          g.add(plate);
        }
        g.rotation.y = -th;
        reg('toroid', g, 2, new THREE.Vector3(Math.cos(th), Math.sin(th), 0), 10.5, { spin: 0.06 });
      }
      /* end-cap toroids */
      const ecGeo = coilGeo(5.35, 10.7, 5, 2, 1.6);
      for (const sgn of [1, -1]) {
        const g = new THREE.Group();
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 8, 36).rotateX(Math.PI / 2), M.structure);
        g.add(hub);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU;
          const coil = new THREE.Mesh(ecGeo, M.coil);
          coil.position.set(8.03 * Math.cos(a), 8.03 * Math.sin(a), 0);
          coil.rotation.z = a; /* local +x → azimuth a; extrusion stays tangential */
          g.add(coil);
        }
        g.position.z = sgn * 31;
        reg('toroid', g, 2, U.zDir(sgn), 12);
      }
    }

    function buildMuon() {
      /* barrel chamber banks: 8 sectors × 3 layers × 8 stations */
      const tubeGeo = new THREE.CylinderGeometry(0.13, 0.13, 5.0, 6, 1, true).rotateX(Math.PI / 2);
      const tubeItems = [], frameItems = [];
      const layers = [29.0, 30.4, 31.8];
      const stations = [-6, 6, -12, 12, -18, 18, -24, 24];
      for (let sec = 0; sec < 8; sec++) {
        const base = (sec / 8) * TAU;
        for (let L = 0; L < 3; L++) {
          const r0 = layers[L];
          for (const zs of stations) {
            const rf = r0 - 0.85;
            frameItems.push({ p: [rf * Math.cos(base + L * 0.015), rf * Math.sin(base + L * 0.015), zs],
              rz: tangentRz(base + L * 0.015), s: [rf * TAU / 8 * 0.88, 1, 1] });
            for (let row = 0; row < 3; row++) {
              for (let col = 0; col < 16; col++) {
                const rr = r0 + row * 0.32;
                const th = base + L * 0.015 + (col - 7.5) * 0.049;
                tubeItems.push({ p: [rr * Math.cos(th), rr * Math.sin(th), zs + (col - 7.5) * 0.014], rz: th });
              }
            }
          }
        }
      }
      regIM('muon', makeIM(tubeGeo, M.mdtTube, tubeItems), 1,
        (i, p) => U.radialDir(p), () => 3.6);
      regIM('muon', makeIM(new THREE.BoxGeometry(1, 1.15, 5.4), M.mdtFrame, frameItems), 1,
        (i, p) => U.radialDir(p), () => 3.6);

      /* end-cap big wheels: 3 rings × 16 sectors per side */
      const wheelZ = [37.5, 41, 44.5];
      for (const sgn of [1, -1]) {
        const g = new THREE.Group();
        const tubes = [], frames = [];
        wheelZ.forEach((wz, wi) => {
          const ringR = [10, 16.5, 23];
          for (let sec = 0; sec < 16; sec++) {
            const base = (sec / 16) * TAU + wi * 0.04;
            ringR.forEach((r0) => {
              frames.push({ p: [(r0 + 1.0) * Math.cos(base + 0.08), (r0 + 1.0) * Math.sin(base + 0.08), sgn * wz],
                rz: base + 0.08, s: [(r0 + 1.0) * TAU / 16 * 0.82, 1, 1] });
              for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 10; col++) {
                  const rr = r0 + row * 0.34;
                  const th = base + 0.08 + (col - 4.5) * 0.036;
                  const d = new THREE.Vector3(Math.cos(th), Math.sin(th), 0);
                  tubes.push({
                    p: [rr * d.x, rr * d.y, sgn * wz + (col - 4.5) * 0.012],
                    q: new THREE.Quaternion().setFromUnitVectors(Y_AXIS, d),
                  });
                }
              }
            });
          }
        });
        g.add(makeIM(new THREE.CylinderGeometry(0.115, 0.115, 1.6, 6, 1, true), M.mdtTube, tubes));
        g.add(makeIM(new THREE.BoxGeometry(1, 0.85, 2.9), M.mdtFrame, frames));
        const cnt = tubes.length + frames.length;
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 7.5, 36).rotateX(Math.PI / 2), M.structure);
        hub.position.z = sgn * 41;
        g.add(hub);
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * TAU;
          const spoke = new THREE.Mesh(new THREE.BoxGeometry(1.1, 15.5, 1.4), M.structure);
          spoke.position.set(11.5 * Math.cos(a), 11.5 * Math.sin(a), sgn * 41);
          spoke.rotation.z = a;
          g.add(spoke);
          const tgc = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 2.6), M.tgc);
          tgc.position.set(6.6 * Math.cos(a + 0.2), 6.6 * Math.sin(a + 0.2), sgn * 37.4);
          tgc.rotation.z = a + 0.2;
          g.add(tgc);
        }
        const s = sys('muon');
        s.root.add(g); s.count += cnt + 1 + 32; s.ids.push(g.uuid);
        explode.addObject(g, 1, U.zDir(sgn), 22);
      }
    }

    function addLights(scene) {
      scene.add(new THREE.HemisphereLight(0x9fb2c8, 0x0e1116, 0.85));
      const key = new THREE.DirectionalLight(0xfff1da, 1.7); key.position.set(70, 110, 50); scene.add(key);
      const rim = new THREE.DirectionalLight(0x6fd3e8, 0.75); rim.position.set(-90, 30, -80); scene.add(rim);
      const fill = new THREE.DirectionalLight(0xd8b25c, 0.45); fill.position.set(-50, -10, 70); scene.add(fill);
      const glowPt = new THREE.PointLight(0xd8b25c, 0.6, 90, 2); glowPt.position.set(0, 6, 0); scene.add(glowPt);
    }

    function addAmbience(scene) {
      const floor = new THREE.Mesh(new THREE.CircleGeometry(64, 72),
        new THREE.MeshStandardMaterial({ color: 0x0a0d12, roughness: 0.92, metalness: 0.15, envMap: APP.MATS.env }));
      floor.rotation.x = -Math.PI / 2; floor.position.y = -34.2;
      scene.add(floor);
      const grid = new THREE.PolarGridHelper(64, 16, 8, 64, 0x2a3138, 0x161b22);
      grid.position.y = -34.1;
      scene.add(grid);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(44, 0.08, 6, 96).rotateX(Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0xd8b25c, emissive: 0x8a6f35, emissiveIntensity: 0.7, metalness: 1, roughness: 0.3 }));
      ring.position.y = -34.05;
      scene.add(ring);
      const n = 500, pos = new Float32Array(n * 3);
      const rnd = U.rng(42);
      for (let i = 0; i < n; i++) {
        const a = rnd() * TAU, r = 8 + rnd() * 58;
        pos[i * 3] = r * Math.cos(a); pos[i * 3 + 1] = -32 + rnd() * 78; pos[i * 3 + 2] = r * Math.sin(a);
      }
      const dg = new THREE.BufferGeometry();
      dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const dust = new THREE.Points(dg, new THREE.PointsMaterial({
        color: 0x9fb4c9, size: 0.3, transparent: true, opacity: 0.16, depthWrite: false }));
      scene.add(dust);
    }
  }
})();
