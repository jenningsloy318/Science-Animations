// tab-t5-interferometer.js — T5 干涉仪：ALMA/EHT 阵列 + 基线滑块（规格 §3 组三）
// 关键约定（规格强制）：**干涉阵列的分辨用 θ = λ/B，不乘 1.22**；
// 1.22 因子属于"装满的"单口径艾里斑。页签在两约定间明示切换。
'use strict';

APP.Tabs = APP.Tabs || {};

const LAM_ALMA = 1.0e-3;             // ALMA 估算波长 1 mm
const LAM_EHT = 1.3e-3;              // EHT 波长 1.3 mm
const M87_RING_UAS = 42;             // M87 阴影环直径 μas（观测值）

// 基线档位（规格拍③）
const BLINES = [
  { id: 'b150',  B: 150,   name: 'ALMA 紧凑', lam: LAM_ALMA, note: '最短基线 150 m' },
  { id: 'b1km',  B: 1000,  name: 'ALMA 中等', lam: LAM_ALMA, note: '1 km' },
  { id: 'b16km', B: 16000, name: 'ALMA 最展', lam: LAM_ALMA, note: '16 km 构型' },
  { id: 'eht',   B: 1.07e7, name: 'EHT 地球级', lam: LAM_EHT, note: '南极→西班牙 ~10,700 km' }
];

// ALMA 式天线相对布局（归一化坐标，实际 footprint 随 B 压缩缩放）
const ANT_POS = [
  [0.00, 0.00], [0.90, 0.10], [-0.85, 0.25], [0.15, 0.92], [-0.20, -0.88],
  [0.75, -0.60], [-0.70, -0.55], [0.55, 0.70], [-0.95, -0.10], [0.30, -0.35],
  [-0.45, 0.60], [0.10, 0.45]
];
const EHT_STATIONS = ['ALMA', 'APEX', 'IRAM 30 m', 'JCMT', 'LMT', 'SMA', 'SMT', 'SPT'];

APP.Tabs['t5-interferometer'] = {
  built: false, st: null, pipe: null, hud: null, lastBeat: 0, _cur: null,
  bl: BLINES[2],                       // 默认 ALMA 16 km
  imgTex: null, imgCanvas: null,

  build(ctx) {
    if (this.built) return this.st;
    const { scene, MATS } = ctx;
    const U = APP.U;
    const g = new THREE.Group(); g.name = 't5-interferometer'; scene.add(g);

    // ── 地面 + 高原网格 ──────────────────────────────────────────
    const ground = new THREE.Mesh(new THREE.CircleGeometry(14, 64),
      new THREE.MeshStandardMaterial({ color: 0x0d1219, metalness: 0.2, roughness: 0.9 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.5; g.add(ground);
    const grid = new THREE.GridHelper(28, 28, 0x1a2230, 0x121822);
    grid.position.y = -0.49; g.add(grid);

    // ── 天线组（实例化：12 m 碟 + 支架）──────────────────────────
    const antGroup = new THREE.Group(); g.add(antGroup);
    const dishGeo = new THREE.SphereGeometry(0.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2.4);
    const antMat = MATS.gold.clone();
    const ants = [];
    for (let i = 0; i < ANT_POS.length; i++) {
      const a = new THREE.Group();
      const dish = new THREE.Mesh(dishGeo, antMat);
      dish.rotation.x = Math.PI;                       // 朝上
      dish.position.y = 0.55;
      a.add(dish);
      const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8), MATS.dark);
      horn.position.set(0, 0.8, 0.32); horn.rotation.x = -0.5; a.add(horn);
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.55, 8), MATS.steel);
      ped.position.y = 0.28; a.add(ped);
      antGroup.add(a);
      ants.push(a);
    }

    // ── 基线网（天线两两之间的发光线）────────────────────────────
    const baseGroup = new THREE.Group(); g.add(baseGroup);
    const baseLines = [];
    for (let i = 0; i < ants.length; i++) {
      for (let j = i + 1; j < ants.length; j++) {
        const ln = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(), new THREE.Vector3()]),
          new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.25,
            blending: THREE.AdditiveBlending, depthWrite: false }));
        baseGroup.add(ln);
        baseLines.push({ ln, i, j });
      }
    }

    // ── 相关器（角落的盒子，徽章 1.6×10¹⁶ ops/s）────────────────
    const corr = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 0.8), MATS.dark);
    corr.position.set(-6.5, 0, -6.5); g.add(corr);
    const corrRing = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.03, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee }));
    corrRing.position.set(-6.5, 0.4, -6.5); corrRing.rotation.x = Math.PI / 2; g.add(corrRing);
    // 光缆：天线群 → 相关器
    const cable = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.3, 0), new THREE.Vector3(-6.5, 0.3, -6.5)]),
      new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.4 }));
    g.add(cable);

    // ── 入射波前（平行线，从上方推进，表示同一波前到达各天线）──
    const waveGroup = new THREE.Group(); g.add(waveGroup);
    for (let i = 0; i < 5; i++) {
      const w = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-12, 3, -8 + i * 4), new THREE.Vector3(12, 3, -8 + i * 4)]),
        new THREE.LineBasicMaterial({ color: 0x4cc9f0, transparent: true, opacity: 0.3,
          blending: THREE.AdditiveBlending }));
      waveGroup.add(w);
    }

    // ── 合成图像屏：M87 阴影环（模糊度 ∝ 分辨角）──────────────
    this.imgCanvas = document.createElement('canvas');
    this.imgCanvas.width = this.imgCanvas.height = 320;
    this.imgTex = new THREE.CanvasTexture(this.imgCanvas);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.4),
      new THREE.MeshBasicMaterial({ map: this.imgTex, transparent: true, side: THREE.DoubleSide }));
    screen.position.set(0, 4.6, -6.5); g.add(screen);
    const screenFrame = new THREE.Mesh(new THREE.BoxGeometry(4.6, 4.6, 0.08), MATS.dark);
    screenFrame.position.set(0, 4.6, -6.58); g.add(screenFrame);

    // ── 灯光 ─────────────────────────────────────────────────────
    g.add(new THREE.HemisphereLight(0xb8c4d4, 0x101418, 1.0));
    const key = new THREE.DirectionalLight(0xfff2d8, 1.3);
    key.position.set(6, 10, 4); g.add(key);
    const rim = new THREE.PointLight(0x22d3ee, 0.9, 20);
    rim.position.set(-6.5, 1.5, -6.5); g.add(rim);

    // ── 标签 ─────────────────────────────────────────────────────
    const L = U.LabelSys;
    L.add(ctx, 't5-ant', '12 m 天线 ×N<br><small>同一波前 → 记下振幅与相位</small>',
      new THREE.Vector3(1.8, 1.2, 0.6), { dx: 150, dy: -60, color: '#d8b25c' });
    L.add(ctx, 't5-base', '基线 B<br><small>越长越锐</small>',
      new THREE.Vector3(-1.8, 0.6, -1.2), { dx: -140, dy: -70, color: '#22d3ee' });
    L.add(ctx, 't5-corr', '相关器<br><small>1.6×10¹⁶ 次运算/秒</small>',
      new THREE.Vector3(-6.5, 1.0, -6.5), { dx: -150, dy: 60, color: '#22d3ee' });
    L.add(ctx, 't5-img', '合成图像<br><small>分辨角 θ = λ/B</small>',
      new THREE.Vector3(0, 5.6, -6.5), { dx: 160, dy: 40, color: '#d8b25c' });

    // ── 相机（俯视）──────────────────────────────────────────────
    const orb = ctx.orbit;
    orb.setHome(0.5, 0.55, 17, 0, 0.5, -1);

    this.st = { g, ants, baseLines, antGroup, waveGroup, screen, t: 0 };
    this.built = true; this.lastBeat = 0;
    this.layout();
    return this.st;
  },

  // 按 B 摆放天线 + 更新基线网 + 重画合成图像
  layout() {
    const st = this.st; if (!st) return;
    // 可视 footprint 随 B 对数压缩（真实尺度差 10⁵ 倍，无法线性画）
    const foot = 1.6 + 3.4 * Math.log10(Math.max(this.bl.B, 150) / 150) / Math.log10(1.07e7 / 150) * 1.0;
    const f = Math.min(5.2, foot);
    st.ants.forEach((a, i) => {
      const p = ANT_POS[i];
      a.position.set(p[0] * f, 0, p[1] * f);
    });
    for (const b of st.baseLines) {
      const pa = st.ants[b.i].position, pb = st.ants[b.j].position;
      const pos = b.ln.geometry.attributes.position;
      pos.setXYZ(0, pa.x, 0.4, pa.z); pos.setXYZ(1, pb.x, 0.4, pb.z);
      pos.needsUpdate = true;
      b.ln.material.opacity = 0.15 + 0.25 * (this.bl.B >= 1e6 ? 1 : 0.4);
    }
    this.drawImage();
  },

  // M87 阴影环；模糊半径 ∝ θ/环径（只有 EHT 级基线才分得清）
  drawImage() {
    const c = this.imgCanvas, ctx2 = c.getContext('2d');
    const W = c.width, H = c.height;
    ctx2.clearRect(0, 0, W, H);
    ctx2.fillStyle = '#07090e'; ctx2.fillRect(0, 0, W, H);
    // 分辨角（μas）
    const thUas = APP.F.radToUas(APP.F.baseline(this.bl.lam, this.bl.B));
    const resolved = thUas < M87_RING_UAS;
    // 模糊 px：θ 越大越糊；EHT(25μas) 对 42μas 环 → 轻微糊；ALMA(13000μas) → 完全糊成一团
    const blur = Math.min(60, thUas / M87_RING_UAS * 4);
    const cx = W / 2, cy = H / 2, r0 = 62;
    ctx2.save();
    ctx2.filter = 'blur(' + blur.toFixed(1) + 'px)';
    // 环（金色发光）
    const gr = ctx2.createRadialGradient(cx, cy, r0 * 0.55, cx, cy, r0 * 1.5);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(0.62, 'rgba(255,210,120,0.15)');
    gr.addColorStop(0.78, 'rgba(255,225,150,0.95)');
    gr.addColorStop(0.9, 'rgba(255,200,100,0.25)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx2.fillStyle = gr;
    ctx2.beginPath(); ctx2.arc(cx, cy, r0 * 1.5, 0, Math.PI * 2); ctx2.fill();
    // 中心阴影
    ctx2.fillStyle = '#000';
    ctx2.beginPath(); ctx2.arc(cx, cy, r0 * 0.58, 0, Math.PI * 2); ctx2.fill();
    ctx2.restore();
    // 标注
    ctx2.fillStyle = resolved ? '#7ee787' : '#ff9f6b';
    ctx2.font = 'bold 17px system-ui';
    ctx2.fillText(resolved
      ? '✓ 环已分辨（θ=' + Math.round(thUas) + ' μas < 42 μas）'
      : '✗ 仍是一团（θ=' + (thUas > 1000 ? (thUas / 1000).toFixed(0) + ' mas' : Math.round(thUas) + ' μas') + ' > 42 μas）',
      16, 28);
    ctx2.fillStyle = '#9aa3b0'; ctx2.font = '13px system-ui';
    ctx2.fillText('M87 阴影环真实角径 ≈ 42 μas', 16, H - 14);
    this.imgTex.needsUpdate = true;
  },

  // ── 面板（onEnter）──────────────────────────────────────────────
  onEnter(ctx) {
    const box = document.getElementById('pipelineBox');
    box.innerHTML = '';
    const mount = document.createElement('div'); mount.id = 'pipeMount';
    box.appendChild(mount);
    this.pipe = APP.PIPE.mount(mount, 't5');
    this.hud = document.createElement('div'); this.hud.className = 'tab-hud';
    box.appendChild(this.hud);
    this.renderPanel();
    this.applyBaseline(this.bl);
  },

  renderPanel() {
    const el = this.hud;
    el.innerHTML =
      '<div class="slider-row"><label>基线 B <b id="t5B">16 km</b></label>' +
      '<input type="range" id="t5Slider" min="0" max="3" step="1" value="2"></div>' +
      '<div class="chip-row" id="t5Chips">' +
      BLINES.map((b, i) => '<button class="chip' + (i === 2 ? ' on' : '') +
        '" data-i="' + i + '">' + b.name + '</button>').join('') + '</div>' +
      '<div class="t5-warn" id="t5Warn"></div>';
    const sl = el.querySelector('#t5Slider');
    sl.addEventListener('input', () => this.applyBaseline(BLINES[+sl.value]));
    el.querySelectorAll('#t5Chips .chip').forEach(c =>
      c.addEventListener('click', () => { sl.value = c.dataset.i; this.applyBaseline(BLINES[+c.dataset.i]); }));
  },

  applyBaseline(bl) {
    this.bl = bl;
    if (this.st) this.layout();
    const F = APP.F;
    const th = F.baseline(bl.lam, bl.B);                  // rad（阵列约定，无 1.22）
    const isEHT = bl.B >= 1e6;
    const Btxt = bl.B >= 1000 ? (bl.B / 1000).toFixed(0) + ' km' : bl.B + ' m';
    const bEl = document.getElementById('t5B');
    if (bEl) bEl.textContent = Btxt;
    document.querySelectorAll('#t5Chips .chip').forEach((c, i) =>
      c.classList.toggle('on', BLINES[i] === bl));
    const warn = document.getElementById('t5Warn');
    if (warn) warn.innerHTML = isEHT
      ? '⚠ 现在是<b>地球级基线</b>（EHT：南极→西班牙 ~10,700 km，8 个站台）<br>' +
        '约定：阵列用 <b>θ = λ/B</b>，<b>不乘 1.22</b>——1.22 属于"装满的"单口径。'
      : '约定：阵列用 <b>θ = λ/B</b>（不乘 1.22）；单口径才用 1.22 λ/D。<br>' +
        'ALMA 纪录 <b>5 mas</b>（Band 10，λ≈0.32 mm + 16 km）——波长越短越锐。';
    this.pipe.setAll({
      raw: '每台天线收到的<b>电波振幅与相位</b>（随时间）<br>' +
           '基线 B = <b>' + Btxt + '</b>，λ = ' + (bl.lam * 1e3).toFixed(1) + ' mm',
      eq: '相关器：两两天线做<b>复数相关</b>（乘 + 积分）<br>' +
          '条纹间距 ∝ 1/B；分辨 <b>θ = λ/B</b>（阵列约定，非 1.22λ/B）',
      calc: 'θ = ' + (bl.lam * 1e3).toFixed(1) + ' mm / ' + Btxt + '<br>' +
            '= ' + F.sci(th, 2) + ' rad = <b>' +
            (isEHT ? F.fmt(F.radToUas(th), 0) + ' μas' : F.fmt(F.radToMas(th), 1) + ' mas') + '</b>',
      result: isEHT
        ? 'EHT 论文 II 公布标称分辨 ~25 μas，与本式 <b>' + F.fmt(F.radToUas(th), 0) +
          ' μas</b> 对上<br>→ 2019-04-10 首张 M87 黑洞阴影照片：6.5×10⁹ M☉、' +
          '5,500 万光年、事件视界 < 400 亿 km（阴影 ≈ 视界 2.5 倍）'
        : 'ALMA λ=1 mm/B=16 km → 13 mas（估算）；实际纪录 5 mas（λ≈0.32 mm）<br>' +
          '⚠ 阵列只采样不"装满"，分辨不含 1.22 因子'
    });
    this._cur = { B: bl.B, lam: bl.lam, theta: th,
      thetaUas: F.radToUas(th), thetaMas: F.radToMas(th), resolved: F.radToUas(th) < M87_RING_UAS };
  },

  update(dt, active) {
    if (!this.st || !active) return;
    const st = this.st; st.t += dt;
    const beat = (window.APP && APP.app) ? APP.app.beat : 2;
    if (beat !== this.lastBeat) {
      this.lastBeat = beat;
      if (beat === 1) APP.UI.setPanel(
        '<h3>📡 小镜子怎么装成大眼睛？</h3>' +
        '<p>一面 12 m 的碟子分不清细节——但把很多碟子隔开摆，' +
        '把各自的信号<b>做乘法（相关）</b>，就能得到相当于"基线那么大"的分辨。</p>' +
        '<p>关键：分辨用 <b>θ = λ/B</b>（B 是天线间距），<b>不乘 1.22</b>——' +
        '那是装满的单口径的约定。</p>' +
        '<p>↓ 下一拍：拉长基线，看图像变锐。</p>');
    }
    // 波前平行推进（示意同一波前扫过阵列）
    st.waveGroup.children.forEach((w, i) => {
      w.position.z = ((st.t * 1.6 + i * 0.8) % 8) - 4;
      w.material.opacity = 0.18 + 0.12 * Math.sin(st.t * 2 + i);
    });
    // 天线随基线档微微脉动（"正在接收"）
    st.ants.forEach((a, i) => {
      a.children[0].position.y = 0.55 + 0.02 * Math.sin(st.t * 3 + i * 1.7);
    });
  },

  reset() { if (this.st) this.st.t = 0; },

  dispose() {
    if (!this.st) return;
    const L = APP.U.LabelSys;
    ['t5-ant', 't5-base', 't5-corr', 't5-img'].forEach(id => L.remove(null, id));
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
    return Object.assign({ tab: 't5-interferometer' }, this._cur || {});
  }
};
