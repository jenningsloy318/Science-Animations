// tab-t3-spectrograph.js — T3 光谱仪：光路 + 黑体/条形码/预设星（规格 §3 组二）
// 光路：星点 → 望远镜焦点 → 狭缝 → 准直镜 → 光栅（色散）→ CCD 光谱带。
// 黑体曲线用真实普朗克公式绘制；λmax 由 data.js 的 wien() 计算（已验证）。
'use strict';

APP.Tabs = APP.Tabs || {};

// ── 波长 → RGB（380–750 nm 近似可见光表色）────────────────────────
function wlToRGB(wl) {
  let r = 0, g = 0, b = 0;
  if (wl >= 380 && wl < 440) { r = -(wl - 440) / 60; b = 1; }
  else if (wl < 490) { g = (wl - 440) / 50; b = 1; }
  else if (wl < 510) { g = 1; r = -(wl - 510) / 20; }
  else if (wl < 580) { r = 1; g = (wl - 510) / 70; }
  else if (wl < 645) { r = 1; g = -(wl - 645) / 65; }
  else if (wl <= 750) { r = 1; }
  let f = 1;
  if (wl < 420) f = 0.3 + 0.7 * (wl - 380) / 40;
  if (wl > 700) f = 0.3 + 0.7 * (750 - wl) / 50;
  return [Math.round(255 * r * f), Math.round(255 * g * f), Math.round(255 * b * f)];
}
const WL0 = 380, WL1 = 750;                   // 光谱带波长范围 nm
const PLANCK_H = 6.62607015e-34, PLANCK_C = 2.99792458e8, PLANCK_K = 1.380649e-23;
function planck(lam_nm, T) {                  // 相对亮度（任意单位）
  const l = lam_nm * 1e-9;
  const e = Math.exp(PLANCK_H * PLANCK_C / (l * PLANCK_K * T)) - 1;
  return 1 / (Math.pow(l, 5) * e);
}

// ── 光路站点（沿 x 轴）─────────────────────────────────────────────
const STATIONS = [
  { x: -9, name: '恒星',  sub: '遥远星点',  color: '#9fd8ff' },
  { x: -5.5, name: '望远镜', sub: '汇聚成像', color: '#d8b25c' },
  { x: -3.5, name: '狭缝',  sub: '只放一束光过去', color: '#d8b25c' },
  { x: -1.5, name: '准直镜', sub: '把光变成平行光', color: '#d8b25c' },
  { x: 1.0, name: '光栅',  sub: '按波长散开', color: '#a78bfa' },
  { x: 5.0, name: 'CCD',  sub: '记录光谱带', color: '#f59e0b' }
];

const ELEMS = APP.DATA.D.elements;
const STARS = APP.DATA.D.stars;

APP.Tabs['t3-spectrograph'] = {
  built: false, st: null, pipe: null, hud: null, lastBeat: 0, _cur: null,
  mode: 'bb',                                  // bb | barcode | star
  T: 5772, elems: ['H'], star: STARS[0],
  specTex: null, planckTex: null, specCanvas: null, planckCanvas: null,

  build(ctx) {
    if (this.built) return this.st;
    const { scene, MATS } = ctx;
    const U = APP.U;
    const g = new THREE.Group(); g.name = 't3-spectrograph'; scene.add(g);
    const gold2 = MATS.gold.clone(); gold2.side = THREE.DoubleSide;

    // ── 光学元件 ─────────────────────────────────────────────────
    // 望远镜（简化：一片抛物面主镜 + 焦点）
    const tel = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.05, 10, 48), MATS.gold);
    tel.position.set(STATIONS[1].x, 0, 0); tel.rotation.y = Math.PI / 2; g.add(tel);
    const telDisc = new THREE.Mesh(new THREE.CircleGeometry(1.05, 48),
      new THREE.MeshStandardMaterial({ color: 0x22303f, metalness: 0.9, roughness: 0.15, side: THREE.DoubleSide }));
    telDisc.position.set(STATIONS[1].x, 0, 0); telDisc.rotation.y = Math.PI / 2; g.add(telDisc);
    // 狭缝（两条竖直刀口）
    for (const s of [0.06, -0.06]) {
      const knife = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.9, 0.05), MATS.steel);
      knife.position.set(STATIONS[2].x, 0, s); g.add(knife);
    }
    // 准直镜（小弧形反射镜，示意）
    const coll = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.045, 10, 32, Math.PI), gold2);
    coll.position.set(STATIONS[3].x, 0, 0); coll.rotation.y = -Math.PI / 2; g.add(coll);
    // 光栅（平面，带彩虹渐变纹理）
    const gratingCanvas = document.createElement('canvas');
    gratingCanvas.width = 256; gratingCanvas.height = 16;
    const gc = gratingCanvas.getContext('2d');
    const grad = gc.createLinearGradient(0, 0, 256, 0);
    for (let i = 0; i <= 8; i++) {
      const wl = WL0 + (WL1 - WL0) * i / 8;
      const c = wlToRGB(wl);
      grad.addColorStop(i / 8, 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')');
    }
    gc.fillStyle = grad; gc.fillRect(0, 0, 256, 16);
    const gratTex = new THREE.CanvasTexture(gratingCanvas);
    const grat = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.1),
      new THREE.MeshStandardMaterial({ map: gratTex, emissive: 0x222244,
        emissiveIntensity: 0.6, side: THREE.DoubleSide, metalness: 0.3, roughness: 0.4 }));
    grat.position.set(STATIONS[4].x, 0, 0); grat.rotation.y = -0.35; g.add(grat);
    // CCD（光谱带平面：画布纹理）
    this.specCanvas = document.createElement('canvas');
    this.specCanvas.width = 512; this.specCanvas.height = 64;
    this.specTex = new THREE.CanvasTexture(this.specCanvas);
    const ccd = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 0.55),
      new THREE.MeshBasicMaterial({ map: this.specTex, side: THREE.DoubleSide }));
    ccd.position.set(STATIONS[5].x, 0.35, 0); ccd.rotation.y = 0.35; g.add(ccd);
    // CCD 边框
    const ccdFrame = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.03, 8, 4),
      new THREE.MeshBasicMaterial({ color: 0x8a93a0 }));
    ccdFrame.position.set(STATIONS[5].x, 0.35, 0); ccdFrame.rotation.y = 0.35;
    ccdFrame.rotation.z = Math.PI / 2; ccdFrame.scale.set(1, 0.13, 1); g.add(ccdFrame);
    // 黑体曲线屏（光栅上方，拍③黑体模式显示）
    this.planckCanvas = document.createElement('canvas');
    this.planckCanvas.width = 512; this.planckCanvas.height = 256;
    this.planckTex = new THREE.CanvasTexture(this.planckCanvas);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.2),
      new THREE.MeshBasicMaterial({ map: this.planckTex, transparent: true, side: THREE.DoubleSide }));
    screen.position.set(STATIONS[4].x + 0.6, 2.1, -1.4);
    screen.rotation.y = 0.5; g.add(screen);
    // 星点（光源）
    const starSp = new THREE.Sprite(MATS.glow.clone());
    starSp.scale.set(0.7, 0.7, 1);
    starSp.position.set(STATIONS[0].x, 0, 0); g.add(starSp);
    const starBall = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0xfff2d8 }));
    starBall.position.set(STATIONS[0].x, 0, 0); g.add(starBall);

    // ── 光线：白光段（星→镜→狭缝→准直→光栅）────────────────────
    const path = STATIONS.map(s => new THREE.Vector3(s.x, 0, 0));
    const white = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(path.slice(0, 5)),
      MATS.beam.clone());
    white.material.opacity = 0.45; g.add(white);
    // 光栅 → CCD 的彩色扇（每波长一条线）
    const fanPts = [];
    for (let i = 0; i <= 12; i++) {
      const wl = WL0 + (WL1 - WL0) * i / 12;
      const t = (wl - WL0) / (WL1 - WL0);             // 色散角比例
      const c = wlToRGB(wl);
      const mat = new THREE.LineBasicMaterial({
        color: (c[0] << 16) | (c[1] << 8) | c[2],
        transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false });
      const end = new THREE.Vector3(STATIONS[5].x, 0.35, 0);
      // 色散：沿 CCD 宽度方向展开
      const spread = (t - 0.5) * 4.2;
      const p0 = new THREE.Vector3(STATIONS[4].x, 0, 0);
      const p1 = new THREE.Vector3(STATIONS[4].x + 1.4, 0.35, 0).lerp(
        new THREE.Vector3(STATIONS[4].x + 1.4, 0.35, 0), 0);
      const hit = new THREE.Vector3(STATIONS[5].x, 0.35, spread * 0.42);
      const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints([p0, hit]), mat);
      ln.renderOrder = 4; g.add(ln);
      fanPts.push(hit);
    }
    // 移动光子（沿白光路径 + 色散扇）
    const photons = [];
    for (let i = 0; i < 3; i++) {
      const ph = new THREE.Sprite(MATS.glow.clone());
      ph.scale.set(0.16, 0.16, 1); g.add(ph);
      photons.push({ sp: ph, off: i / 3 });
    }

    // ── 灯光 / 地板网格 ──────────────────────────────────────────
    g.add(new THREE.HemisphereLight(0xb8c4d4, 0x101418, 0.85));
    const key = new THREE.DirectionalLight(0xfff2d8, 1.2);
    key.position.set(2, 6, 4); g.add(key);
    const grid = new THREE.GridHelper(24, 24, 0x1a2230, 0x10161e);
    grid.position.y = -1.4; g.add(grid);

    // ── 标签 ─────────────────────────────────────────────────────
    const L = U.LabelSys;
    const labels = [
      { id: 't3-star', t: STATIONS[0], dy: 70 },
      { id: 't3-tel', t: STATIONS[1], dy: 75 },
      { id: 't3-slit', t: STATIONS[2], dy: -80 },
      { id: 't3-coll', t: STATIONS[3], dy: 78 },
      { id: 't3-grat', t: STATIONS[4], dy: -85 },
      { id: 't3-ccd', t: STATIONS[5], dy: 80 }
    ];
    for (const lb of labels) {
      L.add(ctx, lb.id, lb.t.name + '<br><small>' + lb.t.sub + '</small>',
        new THREE.Vector3(lb.t.x, 0.35, 0), { dx: 0, dy: lb.dy, color: lb.t.color });
    }

    // ── 相机 ─────────────────────────────────────────────────────
    const orb = ctx.orbit;
    orb.setHome(0.9, 1.15, 16, -1, 0.3, 0);

    this.st = { g, photons, starSp, starBall, screen, ccd, grat, t: 0 };
    this.built = true; this.lastBeat = 0;
    this.drawSpectrum(); this.drawPlanck();
    return this.st;
  },

  // ── 光谱带：彩虹 + 吸收线（条形码模式）──────────────────────────
  drawSpectrum() {
    const c = this.specCanvas, ctx2 = c.getContext('2d');
    const W = c.width, H = c.height;
    const grad = ctx2.createLinearGradient(0, 0, W, 0);
    for (let i = 0; i <= 24; i++) {
      const wl = WL0 + (WL1 - WL0) * i / 24;
      const rgb = wlToRGB(wl);
      grad.addColorStop(i / 24, 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')');
    }
    ctx2.fillStyle = grad; ctx2.fillRect(0, 0, W, H);
    // 暗淡的吸收线（当前选中元素）
    ctx2.fillStyle = 'rgba(0,0,0,0.82)';
    if (this.mode === 'barcode' || this.mode === 'star') {
      const lines = this.mode === 'star' ? this.absorptionForStar()
        : this.elems.flatMap(e => ELEMS.find(x => x.sym === e).lines);
      for (const wl of lines) {
        if (wl < WL0 || wl > WL1) continue;
        const x = (wl - WL0) / (WL1 - WL0) * W;
        ctx2.fillRect(x - 2, 0, 4, H);
      }
    }
    this.specTex.needsUpdate = true;
  },

  // 预设恒星的吸收线（示意：按光谱型给典型线）
  absorptionForStar() {
    const t = this.star.T;
    if (t > 9000) return [438.4, 486.1, 587.6, 656.3];        // B：He+H
    if (t > 6000) return [486.1, 516.7, 589.0, 656.3];        // G/F：金属线
    if (t > 4500) return [516.7, 589.0, 610.3, 656.3];        // K
    return [516.7, 589.0, 620.0, 656.3, 705.0];               // M：分子带
  },

  // ── 黑体曲线屏（真实普朗克公式 + λmax 标记）────────────────────
  drawPlanck() {
    const c = this.planckCanvas, ctx2 = c.getContext('2d');
    const W = c.width, H = c.height;
    ctx2.clearRect(0, 0, W, H);
    ctx2.fillStyle = 'rgba(10,14,20,0.92)'; ctx2.fillRect(0, 0, W, H);
    const pad = 34;
    // 曲线（归一化到自身峰值）
    const T = this.T;
    let maxV = 0;
    const vals = [];
    for (let i = 0; i <= 120; i++) {
      const wl = WL0 + (WL1 - WL0) * i / 120;
      const v = planck(wl, T);
      vals.push(v); maxV = Math.max(maxV, v);
    }
    ctx2.strokeStyle = '#d8b25c'; ctx2.lineWidth = 2.5;
    ctx2.beginPath();
    vals.forEach((v, i) => {
      const x = pad + (W - 2 * pad) * i / 120;
      const y = H - pad - (H - 2 * pad) * (v / maxV);
      i ? ctx2.lineTo(x, y) : ctx2.moveTo(x, y);
    });
    ctx2.stroke();
    // 填充
    ctx2.lineTo(W - pad, H - pad); ctx2.lineTo(pad, H - pad); ctx2.closePath();
    ctx2.fillStyle = 'rgba(216,178,92,0.14)'; ctx2.fill();
    // λmax 竖线
    const lmax = APP.F.wien(T) * 1e9;                    // nm
    if (lmax > WL0 && lmax < WL1) {
      const x = pad + (W - 2 * pad) * (lmax - WL0) / (WL1 - WL0);
      ctx2.strokeStyle = '#4cc9f0'; ctx2.setLineDash([5, 4]); ctx2.lineWidth = 1.5;
      ctx2.beginPath(); ctx2.moveTo(x, pad); ctx2.lineTo(x, H - pad); ctx2.stroke();
      ctx2.setLineDash([]);
      ctx2.fillStyle = '#4cc9f0'; ctx2.font = 'bold 15px system-ui';
      ctx2.fillText('λmax=' + Math.round(lmax) + ' nm', Math.min(x + 6, W - 120), pad + 16);
    }
    // 轴
    ctx2.fillStyle = '#8a93a0'; ctx2.font = '12px system-ui';
    ctx2.fillText('380 nm', pad - 14, H - 10);
    ctx2.fillText('750 nm', W - pad - 8, H - 10);
    ctx2.fillText('T = ' + T + ' K', pad, 18);
    this.planckTex.needsUpdate = true;
  },

  // ── 面板（onEnter 构建）─────────────────────────────────────────
  onEnter(ctx) {
    const box = document.getElementById('pipelineBox');
    box.innerHTML = '';
    const mount = document.createElement('div'); mount.id = 'pipeMount';
    box.appendChild(mount);
    this.pipe = APP.PIPE.mount(mount, 't3');
    this.hud = document.createElement('div'); this.hud.className = 'tab-hud';
    box.appendChild(this.hud);
    this.renderPanel();
    this.applyState();
  },

  renderPanel() {
    const el = this.hud;
    el.innerHTML =
      '<div class="chip-row" id="t3Modes">' +
      '<button class="chip on" data-m="bb">🌡 黑体</button>' +
      '<button class="chip" data-m="barcode">🏷 条形码</button>' +
      '<button class="chip" data-m="star">⭐ 预设恒星</button></div>' +
      '<div id="t3Body"></div>';
    el.querySelectorAll('#t3Modes .chip').forEach(c =>
      c.addEventListener('click', () => {
        this.mode = c.dataset.m;
        el.querySelectorAll('#t3Modes .chip').forEach(x => x.classList.toggle('on', x === c));
        this.applyState();
      }));
  },

  applyState() {
    const body = document.getElementById('t3Body');
    if (!body) return;
    const F = APP.F;
    const lmax = F.wien(this.T) * 1e9;
    if (this.mode === 'bb') {
      body.innerHTML =
        '<div class="slider-row"><label>温度 T <b id="t3T">' + this.T + ' K</b></label>' +
        '<input type="range" id="t3Temp" min="2500" max="30000" step="100" value="' + this.T + '"></div>' +
        '<div class="t3-type" id="t3Type"></div>';
      const sl = body.querySelector('#t3Temp');
      sl.addEventListener('input', () => {
        this.T = +sl.value;
        this.star = { name: '自定义', T: this.T, type: '?' };
        this.drawPlanck(); this.updateStarColor(); this.applyState();
      });
      const tEl = body.querySelector('#t3T');
      if (tEl) tEl.textContent = this.T + ' K';
      const ty = body.querySelector('#t3Type');
      if (ty) ty.textContent = 'λmax = ' + Math.round(lmax) + ' nm → ' + this.spectralType(this.T);
    } else if (this.mode === 'barcode') {
      body.innerHTML = '<div class="chip-row" id="t3Elems">' +
        ELEMS.map(e => '<button class="chip' + (this.elems.includes(e.sym) ? ' on' : '') +
          '" data-s="' + e.sym + '">' + e.sym + ' ' + e.name + '</button>').join('') + '</div>' +
        '<div class="t3-lines" id="t3Lines"></div>';
      body.querySelectorAll('#t3Elems .chip').forEach(c =>
        c.addEventListener('click', () => {
          const s = c.dataset.s;
          this.elems = this.elems.includes(s) ? this.elems.filter(x => x !== s) : this.elems.concat(s);
          c.classList.toggle('on');
          this.applyState();
        }));
      const lines = this.elems.flatMap(e => ELEMS.find(x => x.sym === e).lines);
      const ln = body.querySelector('#t3Lines');
      if (ln) ln.textContent = '吸收线：' + (lines.length
        ? lines.map(l => l.toFixed(1) + ' nm').join(' · ')
        : '（点元素卡）');
    } else {
      body.innerHTML = '<div class="chip-row" id="t3Stars">' +
        STARS.map((s, i) => '<button class="chip' + (this.star.id === s.id ? ' on' : '') +
          '" data-i="' + i + '">' + s.name + ' ' + s.type + '</button>').join('') + '</div>' +
        '<div class="t3-lines" id="t3StarInfo"></div>';
      body.querySelectorAll('#t3Stars .chip').forEach(c =>
        c.addEventListener('click', () => {
          this.star = STARS[+c.dataset.i];
          this.T = this.star.T;
          body.querySelectorAll('#t3Stars .chip').forEach(x => x.classList.toggle('on', x === c));
          this.applyState();
        }));
      const si = body.querySelector('#t3StarInfo');
      if (si) si.textContent = this.star.name + '：T = ' + this.star.T + ' K，λmax ≈ ' +
        Math.round(F.wien(this.star.T) * 1e9) + ' nm（' + this.star.type + '）';
    }
    this.drawSpectrum(); this.drawPlanck(); this.updateStarColor();
    this.updatePipe();
  },

  // 光谱型（OBAFGKM 粗分，教学用）
  spectralType(T) {
    const b = APP.DATA.D.obafgkm;
    const cuts = [30000, 10000, 7500, 6000, 5000, 3500];
    for (let i = 0; i < cuts.length; i++) if (T > cuts[i]) return b[i] + ' 型';
    return b[6] + ' 型';
  },

  updateStarColor() {
    if (!this.st) return;
    const lmax = APP.F.wien(this.T);                 // m
    const nm = lmax * 1e9;
    let c;
    if (nm < 450) c = 0x9fd8ff;                       // 蓝
    else if (nm < 520) c = 0xffffff;                  // 白
    else if (nm < 580) c = 0xfff2d8;                  // 黄白
    else if (nm < 660) c = 0xffd166;                  // 黄橙
    else c = 0xff9f6b;                                // 红
    this.st.starBall.material.color.setHex(c);
    this.st.starSp.material.color.setHex(c);
    this.st.screen.visible = this.mode === 'bb';
  },

  updatePipe() {
    if (!this.pipe) return;
    const F = APP.F;
    const T = this.T, lmax = F.wien(T) * 1e9;
    if (this.mode === 'bb') {
      this.pipe.setAll({
        raw: '光谱带上<b>亮度随波长的分布</b>（连续谱形状）<br>温度 T = <b>' + T + ' K</b>',
        eq: '维恩位移：λ<sub>max</sub> = <b>2.898×10⁻³ m·K / T</b><br>（CODATA 2019：2.897771955×10⁻³）',
        calc: 'λmax = 2.898×10⁻³ / ' + T + '<br>= <b>' + F.sci(lmax * 1e-9, 2) + ' m = ' +
              Math.round(lmax) + ' nm</b>',
        result: '太阳测得 λmax ≈ <b>502 nm</b> → T = <b>5,772 K</b>（G2V）' +
                (Math.abs(T - 5772) < 400 ? '<br>你选的温度正落在太阳附近 ✓' : '')
      });
      this._cur = { mode: 'bb', T, lmaxNm: lmax };
    } else if (this.mode === 'barcode') {
      const lines = this.elems.flatMap(e => ELEMS.find(x => x.sym === e).lines);
      this.pipe.setAll({
        raw: '光谱带上的<b>暗线位置</b>（吸收线波长）<br>选中元素：' +
             (this.elems.join('、') || '（无）'),
        eq: '基尔霍夫：每种元素的能级量子化 → <b>指纹波长唯一</b><br>对照实验室波长表 → 定出元素',
        calc: 'Hα = <b>656.3 nm</b>（巴末系首线）<br>He 587.6 · Na 589.0/589.6 · Ca 422.7 · Fe 438.4 nm',
        result: '太阳含 <b>氢、氦、钠、钙、铁</b><br>氦 1868 年先在太阳谱中发现，1895 年才在地球找到'
      });
      this._cur = { mode: 'barcode', elems: this.elems.slice(), nLines: lines.length };
    } else {
      this.pipe.setAll({
        raw: '预设恒星：' + this.star.name + '（' + this.star.type + '）<br>测得连续谱 → 温度 T',
        eq: '维恩位移：λ<sub>max</sub> = 2.898×10⁻³ / T',
        calc: this.star.name + '：T = ' + this.star.T + ' K<br>λmax ≈ ' +
              Math.round(F.wien(this.star.T) * 1e9) + ' nm',
        result: '参宿四（M 型）λmax ≈ 828 nm 落在<b>红外</b>，所以看起来偏红；' +
                '参宿七（B 型）λmax ≈ 239 nm 落在紫外，看起来偏蓝'
      });
      this._cur = { mode: 'star', star: this.star.id, T: this.star.T };
    }
  },

  update(dt, active) {
    if (!this.st || !active) return;
    const st = this.st; st.t += dt;
    const beat = (window.APP && APP.app) ? APP.app.beat : 2;
    if (beat !== this.lastBeat) {
      this.lastBeat = beat;
      if (beat === 1) APP.UI.setPanel(
        '<h3>🌈 一束光怎么读出温度和成分？</h3>' +
        '<p>恒星不会把温度写在脸上——但它的光里藏着两样东西：</p>' +
        '<p>① <b>连续谱的形状</b>（最亮在哪个波长）→ 由<b>维恩位移</b>算温度；<br>' +
        '② <b>暗线的位置</b>（哪些波长被吸收）→ 是元素的<b>指纹条形码</b>。</p>' +
        '<p>↓ 下一拍看光栅怎么把光拆开。</p>');
    }
    // 光子沿光路行进（星→镜→狭缝→准直→光栅，再色散散开）
    const SPEED = beat === 1 ? 0 : 0.35;
    const pts = STATIONS.slice(0, 5).map(s => new THREE.Vector3(s.x, 0, 0));
    for (const p of st.photons) {
      p.off = (p.off + dt * SPEED * 0.4) % 1;
      const f = p.off * (pts.length - 1);
      const i = Math.min(pts.length - 2, Math.floor(f));
      const t = f - i;
      p.sp.position.lerpVectors(pts[i], pts[i + 1], t);
      p.sp.visible = SPEED > 0;
    }
    // 星点呼吸
    const s = 1 + 0.1 * Math.sin(st.t * 1.8);
    st.starSp.scale.set(0.7 * s, 0.7 * s, 1);
  },

  reset() { if (this.st) this.st.t = 0; },

  dispose() {
    if (!this.st) return;
    const L = APP.U.LabelSys;
    ['t3-star', 't3-tel', 't3-slit', 't3-coll', 't3-grat', 't3-ccd'].forEach(id => L.remove(null, id));
    this.st.g.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) { if (Array.isArray(o.material)) o.material.forEach(m => m.dispose()); else o.material.dispose(); }
    });
    if (this.st.g.parent) this.st.g.parent.remove(this.st.g);
    const box = document.getElementById('pipelineBox');
    if (box) box.innerHTML = '';
    this.st = null; this.built = false; this.pipe = null; this.hud = null;
  },

  probe(name) {
    return Object.assign({ tab: 't3-spectrograph' }, this._cur || {});
  }
};
