// utils.js — 共享原语：OrbitLite / tween / RNG / 标签（引线+箭头）/ 波前环 / 光线
'use strict';

const THREE = window.THREE;

// ── 数学辅助 ──────────────────────────────────────────────────────────
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const TAU = Math.PI * 2;

// ── 确定性 RNG（mulberry32）────────────────────────────────────────────
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── tween 管理器 ───────────────────────────────────────────────────────
const Tweens = {
  list: [],
  to(obj, props, dur, ease, onDone) {
    const t = { obj, dur: dur || 1, ease: ease || easeInOut, done: false,
      from: {}, to: props, onDone };
    for (const k in props) t.from[k] = obj[k];
    this.list.push(t);
    return t;
  },
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const t = this.list[i];
      if (t.done) { this.list.splice(i, 1); continue; }
      t.t = clamp((t.t || 0) + dt / t.dur, 0, 1);
      const e = t.ease(t.t);
      for (const k in t.to) t.obj[k] = lerp(t.from[k], t.to[k], e);
      if (t.t >= 1) { t.done = true; if (t.onDone) t.onDone(); this.list.splice(i, 1); }
    }
  },
  clear() { this.list.length = 0; }
};

// ── OrbitLite：拖拽旋转 / 滚轮缩放 / 双击重置（复用 collider）────────
class OrbitLite {
  constructor(camera, dom) {
    this.camera = camera;
    this.dom = dom;
    this.az = 0.6; this.pol = 1.15; this.dist = 12; this.target = new THREE.Vector3(0, 0, 0);
    this.minPol = 0.12; this.maxPol = Math.PI - 0.12;
    this.minDist = 3; this.maxDist = 60;
    this.rotSpeed = 0.005; this.zoomSpeed = 0.0012;
    this.dragging = false; this.px = 0; this.py = 0;
    this.home = null;
    this._bind();
    this.apply();
  }
  saveHome() { this.home = { az: this.az, pol: this.pol, dist: this.dist,
    tx: this.target.x, ty: this.target.y, tz: this.target.z }; }
  // 只在首次声明该页签的默认相机；已存在 home 则保留用户调整（§7.3 往返保留）
  setHome(az, pol, dist, tx, ty, tz) {
    if (this.home) return;
    this.az = az; this.pol = pol; this.dist = dist;
    this.target.set(tx || 0, ty || 0, tz || 0);
    this.saveHome();
    this.apply();
  }
  reset() {
    if (this.home) { this.az = this.home.az; this.pol = this.home.pol; this.dist = this.home.dist;
      this.target.set(this.home.tx, this.home.ty, this.home.tz); }
    this.apply();
  }
  _bind() {
    const dom = this.dom;
    dom.addEventListener('pointerdown', e => { if (e.button !== 0) return;
      this.dragging = true; this.px = e.clientX; this.py = e.clientY; });
    window.addEventListener('pointerup', () => { this.dragging = false; });
    window.addEventListener('pointermove', e => {
      if (!this.dragging) return;
      const dx = e.clientX - this.px, dy = e.clientY - this.py;
      this.px = e.clientX; this.py = e.clientY;
      this.az -= dx * this.rotSpeed;
      this.pol = clamp(this.pol - dy * this.rotSpeed, this.minPol, this.maxPol);
      this.apply();
    });
    dom.addEventListener('wheel', e => {
      this.dist = clamp(this.dist * (1 + e.deltaY * this.zoomSpeed), this.minDist, this.maxDist);
      this.apply(); e.preventDefault();
    }, { passive: false });
    dom.addEventListener('dblclick', () => this.reset());
  }
  apply() {
    const p = this.pol, a = this.az, d = this.dist;
    this.camera.position.set(
      this.target.x + d * Math.sin(p) * Math.sin(a),
      this.target.y + d * Math.cos(p),
      this.target.z + d * Math.sin(p) * Math.cos(a));
    this.camera.lookAt(this.target);
  }
}

// ── 标签系统：3D 锚点 → 屏幕标签 + 引线 + 箭头 ──────────────────────
// 约定（用户硬要求）：标签永不遮挡所标注的物体——标签放在物体侧上方/侧方，
// 引线从标签指向锚点，末端箭头与标签文字方向配合（箭头指向被标物体）。
const LabelSys = {
  items: [],
  enabled: true,
  add(ctx, id, text, anchor, opts) {
    // anchor: THREE.Vector3 世界坐标锚点；opts: {dx,dy 偏移(像素), color, side, size}
    const el = document.createElement('div');
    el.className = 'lbl3d' + (opts && opts.cls ? ' ' + opts.cls : '');
    el.style.color = (opts && opts.color) || '#e8e6df';
    if (opts && opts.size) el.style.fontSize = opts.size + 'px';
    el.innerHTML = text;
    const line = document.createElement('div');
    line.className = 'lbl3d-line';
    const holder = document.createElement('div');
    holder.className = 'lbl3d-holder';
    holder.appendChild(line); holder.appendChild(el);
    ctx.labelLayer.appendChild(holder);
    const it = { id, el, line, holder, anchor: anchor.clone(),
      dx: (opts && opts.dx) || 0, dy: (opts && opts.dy) || 0,
      off: (opts && opts.off) || new THREE.Vector3(0, 0, 0),   // 3D 偏移避免穿模
      side: (opts && opts.side) || 1, visible: true };
    this.items.push(it);
    return it;
  },
  remove(ctx, id) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      if (id === true || it.id === id) {
        if (it.holder.parentNode) it.holder.parentNode.removeChild(it.holder);
        this.items.splice(i, 1);
      }
    }
  },
  clear(ctx) { this.remove(ctx, true); },
  update(ctx) {
    if (!this.enabled) { this.items.forEach(hide); return; }
    const w = ctx.renderer.domElement.clientWidth;
    const h = ctx.renderer.domElement.clientHeight;
    for (const it of this.items) {
      if (!it.visible) { it.holder.style.display = 'none'; continue; }
      const p = it.anchor.clone().add(it.off).project(ctx.camera);
      const inFront = p.z < 1 && p.z > -1;
      if (!inFront) { it.holder.style.display = 'none'; continue; }
      const x = (p.x * 0.5 + 0.5) * w + it.dx;
      const y = (-p.y * 0.5 + 0.5) * h + it.dy;
      it.holder.style.display = '';
      it.holder.style.left = x + 'px';
      it.holder.style.top = y + 'px';
      // 引线长度 = 标签到锚点的屏幕距离；方向由 side 决定，箭头指向锚点
      const ax = (p.x * 0.5 + 0.5) * w, ay = (-p.y * 0.5 + 0.5) * h;
      const lx = it.dx, ly = it.dy;
      const len = Math.hypot(ax - x + lx, ay - y + ly);
      const ang = Math.atan2(ay - y + ly, ax - x + lx);
      it.line.style.width = Math.max(0, len) + 'px';
      it.line.style.transform = 'rotate(' + ang + 'rad)';
      // 箭头跟随引线方向（CSS 伪元素箭头在线的锚点端）
      it.line.style.setProperty('--arr', 'block');
    }
    function hide(i) { i.holder.style.display = 'none'; }
  },
  setAnchor(id, v) { const it = this.items.find(i => i.id === id); if (it) it.anchor.copy(v); },
  setVisible(id, v) { const it = this.items.find(i => i.id === id); if (it) it.visible = v; }
};

// ── 文字精灵（3D 内文字，少用）────────────────────────────────────────
function makeLabelSprite(text, color, size) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.font = 'bold ' + (size || 28) + 'px system-ui, sans-serif';
  g.fillStyle = color || '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 128, 32);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const s = new THREE.Sprite(m);
  s.scale.set(2.5, 0.625, 1);
  return s;
}

// ── 波前环（多普勒 / 引力波涟漪）──────────────────────────────────────
// 环从源点向外扩张；带"年龄"属性，shader 或顶点色按年龄渐隐。
function makeWaveRing(radius, color, segs) {
  const g = new THREE.BufferGeometry();
  const n = segs || 64;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const a = i / n * TAU;
    pos[i * 3] = Math.cos(a) * radius; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = Math.sin(a) * radius; }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8 });
  const l = new THREE.LineLoop(g, m);
  l.userData.age = 0; l.userData.r0 = radius;
  return l;
}

// ── 发光光路（加色线）──────────────────────────────────────────────────
function makeGlowLine(points, color, width) {
  const g = new THREE.BufferGeometry().setFromPoints(points);
  const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false });
  const l = new THREE.Line(g, m);
  l.renderOrder = 5;
  return l;
}

// ── 光线追踪辅助：抛物面反射求焦点（解析）────────────────────────────
// y = x²/(4f) 绕 y 轴旋转；平行光（沿 -y）反射后过 (0, f, 0)
function paraboloidFocus(f) { return new THREE.Vector3(0, f, 0); }
// 给定口径 D、焦比 f/#，求焦距
function fNum(D, f) { return D * f; }

window.APP = window.APP || {};
APP.U = { clamp, lerp, smooth, easeInOut, TAU, mulberry32, Tweens, OrbitLite,
  LabelSys, makeLabelSprite, makeWaveRing, makeGlowLine, paraboloidFocus, fNum };
