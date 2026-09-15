/* ============================================================================
 * utils.js — math, RNG, tweening, text sprites, orbit camera, explode engine
 * ==========================================================================*/
(function () {
  const U = (APP.U = {});

  /* ---- math -------------------------------------------------------------*/
  U.clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.smooth = (t) => t * t * (3 - 2 * t);
  U.easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  U.TAU = Math.PI * 2;

  U.fmt = (n) => n.toLocaleString('en-US');

  /* deterministic PRNG (mulberry32) */
  U.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /* ---- tween manager -----------------------------------------------------*/
  function Tweens() { this.list = []; }
  Tweens.prototype.add = function (dur, onUpdate, onDone, ease) {
    const tw = { t: 0, dur: Math.max(dur, 1e-4), onUpdate, onDone, ease: ease || U.easeInOut, dead: false };
    this.list.push(tw); return tw;
  };
  Tweens.prototype.update = function (dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const tw = this.list[i];
      if (tw.dead) { this.list.splice(i, 1); continue; }
      tw.t += dt;
      const k = U.clamp(tw.t / tw.dur, 0, 1);
      tw.onUpdate(tw.ease(k));
      if (k >= 1) { this.list.splice(i, 1); if (tw.onDone) tw.onDone(); }
    }
  };
  U.Tweens = Tweens;

  /* ---- text sprite (canvas → sprite) -------------------------------------*/
  const labelCache = new Map();
  U.makeLabel = function (text, opts = {}) {
    const size = opts.size || 46;
    const pad = 28;
    const key = text + '|' + size + '|' + (opts.color || '#e8eaed');
    let tex = labelCache.get(key);
    if (!tex) {
      const cv = document.createElement('canvas');
      const ctx = cv.getContext('2d');
      ctx.font = `600 ${size}px "Segoe UI", system-ui, sans-serif`;
      const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
      cv.width = w; cv.height = size + pad * 1.4;
      const ctx2 = cv.getContext('2d');
      if (opts.bg) {
        ctx2.fillStyle = opts.bg;
        const r = 18;
        ctx2.beginPath();
        ctx2.moveTo(r, 0); ctx2.lineTo(cv.width - r, 0); ctx2.quadraticCurveTo(cv.width, 0, cv.width, r);
        ctx2.lineTo(cv.width, cv.height - r); ctx2.quadraticCurveTo(cv.width, cv.height, cv.width - r, cv.height);
        ctx2.lineTo(r, cv.height); ctx2.quadraticCurveTo(0, cv.height, 0, cv.height - r);
        ctx2.lineTo(0, r); ctx2.quadraticCurveTo(0, 0, r, 0); ctx2.fill();
      }
      ctx2.font = `600 ${size}px "Segoe UI", system-ui, sans-serif`;
      ctx2.fillStyle = opts.color || '#e8eaed';
      ctx2.textBaseline = 'middle';
      ctx2.shadowColor = 'rgba(0,0,0,0.9)'; ctx2.shadowBlur = 8;
      ctx2.fillText(text, pad, cv.height / 2);
      tex = new THREE.CanvasTexture(cv);
      tex.anisotropy = 2;
      labelCache.set(key, tex);
    }
    const mat = new THREE.SpriteMaterial({
      map: tex, transparent: true, depthTest: opts.depthTest !== undefined ? opts.depthTest : false,
      depthWrite: false,
    });
    const spr = new THREE.Sprite(mat);
    const h = opts.height || 4;
    spr.scale.set((h * tex.image.width) / tex.image.height, h, 1);
    spr.renderOrder = (opts.renderOrder !== undefined) ? opts.renderOrder : 10;
    return spr;
  };

  /* ---- soft round sprite texture (glow) -----------------------------------*/
  U.glowTexture = function (color = '#ffffff') {
    const c = (typeof color === 'number') ? '#' + color.toString(16).padStart(6, '0') : color;
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const ctx = cv.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, c); g.addColorStop(0.25, c);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(cv);
  };

  /* ---- OrbitLite (drag rotate / right-drag pan / wheel zoom) --------------*/
  class Orbit {
    constructor(dom, opts = {}) {
      this.dom = dom;
      this.target = new THREE.Vector3(0, 0, 0);
      this.cur = { az: opts.az ?? 0.7, pol: opts.pol ?? 1.05, dist: opts.dist ?? 110 };
      this.des = { az: this.cur.az, pol: this.cur.pol, dist: this.cur.dist };
      this.desTarget = this.target.clone();
      this.minDist = opts.minDist || 18;
      this.maxDist = opts.maxDist || 420;
      this.minPol = 0.06; this.maxPol = 1.62;
      this.home = { az: this.cur.az, pol: this.cur.pol, dist: this.cur.dist, target: new THREE.Vector3(0, 0, 0) };
      this.enabled = true;
      this.idleT = 10;
      this.zoomHandler = opts.onWheelZoom || null;  // return true if handled (skip zoom)
      this.onUserInput = opts.onUserInput || null;
      this._drag = null;
      const markInput = () => { this.idleT = 0; };
      dom.addEventListener('contextmenu', (e) => e.preventDefault());
      dom.addEventListener('pointerdown', (e) => {
        if (!this.enabled) return;
        markInput();
        dom.setPointerCapture(e.pointerId);
        this._drag = { x: e.clientX, y: e.clientY, pan: e.button === 2 || e.shiftKey };
        if (this.onUserInput) this.onUserInput('drag');
      });
      dom.addEventListener('pointermove', (e) => {
        if (!this._drag || !this.enabled) return;
        markInput();
        const dx = e.clientX - this._drag.x, dy = e.clientY - this._drag.y;
        this._drag.x = e.clientX; this._drag.y = e.clientY;
        if (this._drag.pan) this._pan(dx, dy);
        else { this.des.az -= dx * 0.005; this.des.pol = U.clamp(this.des.pol - dy * 0.005, this.minPol, this.maxPol); }
      });
      const end = () => { this._drag = null; };
      dom.addEventListener('pointerup', end);
      dom.addEventListener('pointercancel', end);
      dom.addEventListener('wheel', (e) => {
        if (!this.enabled) return;
        e.preventDefault();
        markInput();
        if (this.zoomHandler && this.zoomHandler(e)) return;
        this.des.dist = U.clamp(this.des.dist * Math.exp(e.deltaY * 0.0011), this.minDist, this.maxDist);
        if (this.onUserInput) this.onUserInput('zoom');
      }, { passive: false });
      dom.addEventListener('dblclick', () => this.reset());
    }
    _pan(dx, dy) {
      const per = this.cur.dist * 0.0012;
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, this.cur.az, 0));
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
      const up = new THREE.Vector3(0, 1, 0);
      this.desTarget.addScaledVector(right, -dx * per).addScaledVector(up, dy * per);
    }
    reset() {
      this.des.az = this.home.az; this.des.pol = this.home.pol; this.des.dist = this.home.dist;
      this.desTarget.copy(this.home.target);
    }
    update(dt, camera, distScale) {
      this.idleT += dt;
      const k = 1 - Math.pow(0.0001, dt);
      this.cur.az += (this.des.az - this.cur.az) * k;
      this.cur.pol += (this.des.pol - this.cur.pol) * k;
      this.cur.dist += (this.des.dist - this.cur.dist) * k;
      this.target.lerp(this.desTarget, k);
      const d = this.cur.dist * (distScale || 1);
      const sp = Math.sin(this.cur.pol), cp = Math.cos(this.cur.pol);
      camera.position.set(
        this.target.x + d * sp * Math.sin(this.cur.az),
        this.target.y + d * cp,
        this.target.z + d * sp * Math.cos(this.cur.az));
      camera.lookAt(this.target);
    }
    save() { return { az: this.des.az, pol: this.des.pol, dist: this.des.dist, target: this.desTarget.clone() }; }
    load(s) { this.des.az = s.az; this.des.pol = s.pol; this.des.dist = s.dist; this.desTarget.copy(s.target); }
  }
  U.Orbit = Orbit;

  /* ---- camera flight along keyframes --------------------------------------*/
  class Flight {
    /* keys: [{pos:[..], look:[..]}] — passes smoothly through all */
    constructor(keys, duration) {
      this.pos = new THREE.CatmullRomCurve3(keys.map(k => new THREE.Vector3(...k.pos)), false, 'centripetal', 0.4);
      this.look = new THREE.CatmullRomCurve3(keys.map(k => new THREE.Vector3(...k.look)), false, 'centripetal', 0.4);
      this.duration = duration; this.t = 0; this.active = false;
    }
    start() { this.t = 0; this.active = true; }
    cancel() { this.active = false; }
    update(dt, camera) {
      if (!this.active) return false;
      this.t += dt / this.duration;
      if (this.t >= 1) { this.active = false; return false; }
      const e = this.t; // linear along arc; captions use raw t
      this.pos.getPoint(e, camera.position);
      this.look.getPoint(e, this._lt || (this._lt = new THREE.Vector3()));
      camera.lookAt(this._lt);
      return true;
    }
  }
  U.Flight = Flight;

  /* ---- Explodable: staged object/instance offsets -------------------------
   * stage s ∈ 1..6 occupies progress window [(s-1)/6, s/6].
   * addObject: moves whole Object3D by dir*amp*p (optionally spins it).
   * addInstanced: per-instance base pos + dir*amp*p, recomposed on change.
   *----------------------------------------------------------------------*/
  class Explodable {
    constructor() {
      this.stages = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
      this.cache = { 1: -1, 2: -1, 3: -1, 4: -1, 5: -1, 6: -1 };
      this._d = new THREE.Object3D();
    }
    addObject(obj, stage, dir, amp, opts = {}) {
      this.stages[stage].push({
        kind: 'obj', obj, base: obj.position.clone(), baseRot: obj.rotation.z || 0,
        dir: dir.clone().normalize(), amp, spin: opts.spin || 0,
      });
    }
    addInstanced(mesh, stage, dirFn, ampFn) {
      const n = mesh.count;
      const base = new Float32Array(n * 3), quat = new Float32Array(n * 4),
            scl = new Float32Array(n * 3), dirs = new Float32Array(n * 3), amps = new Float32Array(n);
      const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
      for (let i = 0; i < n; i++) {
        mesh.getMatrixAt(i, this._d.matrix);
        this._d.matrix.decompose(p, q, s);
        base[i * 3] = p.x; base[i * 3 + 1] = p.y; base[i * 3 + 2] = p.z;
        quat[i * 4] = q.x; quat[i * 4 + 1] = q.y; quat[i * 4 + 2] = q.z; quat[i * 4 + 3] = q.w;
        scl[i * 3] = s.x; scl[i * 3 + 1] = s.y; scl[i * 3 + 2] = s.z;
        const d = dirFn(i, p);
        dirs[i * 3] = d.x; dirs[i * 3 + 1] = d.y; dirs[i * 3 + 2] = d.z;
        amps[i] = ampFn(i, p);
      }
      this.stages[stage].push({ kind: 'inst', mesh, base, quat, scl, dirs, amps });
    }
    setT(t) {
      for (let s = 1; s <= 6; s++) {
        const p = U.smooth(U.clamp(t * 6 - (s - 1), 0, 1));
        if (Math.abs(p - this.cache[s]) < 1e-5) continue;
        this.cache[s] = p;
        const list = this.stages[s];
        for (let e of list) {
          if (e.kind === 'obj') {
            e.obj.position.copy(e.base).addScaledVector(e.dir, e.amp * p);
            if (e.spin) e.obj.rotation.z = e.baseRot + e.spin * p;
          } else {
            const d = this._d, m = e;
            for (let i = 0; i < m.mesh.count; i++) {
              d.position.set(m.base[i*3] + m.dirs[i*3] * m.amps[i] * p,
                             m.base[i*3+1] + m.dirs[i*3+1] * m.amps[i] * p,
                             m.base[i*3+2] + m.dirs[i*3+2] * m.amps[i] * p);
              d.quaternion.set(m.quat[i*4], m.quat[i*4+1], m.quat[i*4+2], m.quat[i*4+3]);
              d.scale.set(m.scl[i*3], m.scl[i*3+1], m.scl[i*3+2]);
              d.updateMatrix();
              m.mesh.setMatrixAt(i, d.matrix);
            }
            m.mesh.instanceMatrix.needsUpdate = true;
          }
        }
      }
    }
  }
  U.Explodable = Explodable;

  /* radial direction helper (barrel layers) */
  U.radialDir = (p) => { const d = new THREE.Vector3(p.x, p.y, 0); if (d.lengthSq() < 1e-6) d.set(1, 0, 0); return d.normalize(); };
  U.zDir = (sign) => new THREE.Vector3(0, 0, sign);
})();
