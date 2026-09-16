// tab-t4-doppler.js — T4 多普勒：波前压缩/拉伸 + 谱线位移 + 系外行星 K（规格 §3 组二）
// 物理：v = c·Δλ/λ₀；波前环由恒星运动真实产生（发射时刻不同 → 间距变化）。
// 系外行星：K = 28.4·(Mp sin i/M_J)·(P/yr)^(−⅓)·(M*/M☉)^(−⅔) m/s（data.js rvK，已验证）。
'use strict';

APP.Tabs = APP.Tabs || {};

const LAM0 = 656.3;                 // Hα 静止波长 nm
const SPEC_MIN = 576, SPEC_MAX = 736;   // 谱线屏范围 nm（容 ±0.12c）
const C_SCALE = 3.2;                // 波环扩展速度（世界单位/秒，示意）
const EM_PERIOD = 0.55;             // 波环发射周期 s

const PLANETS = [
  { id: 'earth', name: '地球', K: 0.09, Mp: 0.003, Pday: 365.25, note: '9 cm/s — 比 HARPS 精度还弱 10 倍' },
  { id: 'jup', name: '木星', K: 12.5, Mp: 1.0, Pday: 4332.6, note: '12.5 m/s' },
  { id: 'peg51', name: '51 Peg b', K: 58, Mp: 0.46, Pday: 4.23, note: '≈58 m/s（文献 55.2–57.3）' }
];

APP.Tabs['t4-doppler'] = {
  built: false, st: null, pipe: null, hud: null, lastBeat: 0, _cur: null,
  mode: 'vel',                        // vel | planet
  v: 0.0,                             // 视向速度（c 的倍数）
  vKms: 0,
  planet: PLANETS[2],                 // 预设行星
  specTex: null, specCanvas: null,
  rings: [], emT: 0, wobT: 0, starX: 0,

  build(ctx) {
    if (this.built) return this.st;
    const { scene, MATS } = ctx;
    const U = APP.U;
    const g = new THREE.Group(); g.name = 't4-doppler'; scene.add(g);

    // ── 恒星 ─────────────────────────────────────────────────────
    const star = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 24),
      new THREE.MeshStandardMaterial({ color: 0xfff2d8, emissive: 0xffd9a0, emissiveIntensity: 1.2 }));
    g.add(star);
    const starGlow = new THREE.Sprite(MATS.glow.clone());
    starGlow.scale.set(2.0, 2.0, 1); g.add(starGlow);
    // 行星（planet 模式）
    const planet = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16),
      new THREE.MeshStandardMaterial({ color: 0xc8a06a, roughness: 0.7 }));
    planet.visible = false; g.add(planet);
    // 轨道圈（planet 模式）
    const orbit = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(
        Array.from({ length: 64 }, (_, i) => {
          const a = i / 64 * Math.PI * 2;
          return new THREE.Vector3(Math.cos(a) * 1.9, 0, Math.sin(a) * 1.9);
        })),
      new THREE.LineBasicMaterial({ color: 0x4a5462, transparent: true, opacity: 0.5 }));
    orbit.visible = false; g.add(orbit);

    // ── 观测者（望远镜，在 -x 侧）──────────────────────────────
    const obs = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 24),
      new THREE.MeshStandardMaterial({ color: 0x8a93a0, metalness: 0.9, roughness: 0.3 }));
    obs.position.set(-8.5, 0, 0); obs.rotation.z = -Math.PI / 2; g.add(obs);
    const obsDisc = new THREE.Mesh(new THREE.CircleGeometry(0.3, 24),
      new THREE.MeshStandardMaterial({ color: 0x22303f, metalness: 0.9, roughness: 0.15 }));
    obsDisc.position.set(-8.0, 0, 0); obsDisc.rotation.y = -Math.PI / 2; g.add(obsDisc);

    // ── 视线轴（虚线）────────────────────────────────────────────
    const axis = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-8.0, 0, 0), new THREE.Vector3(6, 0, 0)]),
      new THREE.LineDashedMaterial({ color: 0x4a5462, dashSize: 0.3, gapSize: 0.2,
        transparent: true, opacity: 0.4 }));
    axis.computeLineDistances(); g.add(axis);

    // ── 谱线屏：静止参考线 + 移动的 Hα ──────────────────────────
    this.specCanvas = document.createElement('canvas');
    this.specCanvas.width = 640; this.specCanvas.height = 96;
    this.specTex = new THREE.CanvasTexture(this.specCanvas);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 0.96),
      new THREE.MeshBasicMaterial({ map: this.specTex, side: THREE.DoubleSide }));
    screen.position.set(1.5, 3.1, 0); screen.rotation.x = -0.25; g.add(screen);
    const screenFrame = new THREE.Mesh(new THREE.BoxGeometry(6.6, 1.16, 0.06), MATS.dark);
    screenFrame.position.set(1.5, 3.1, -0.03); g.add(screenFrame);

    // ── 灯光 / 网格 ──────────────────────────────────────────────
    g.add(new THREE.HemisphereLight(0xb8c4d4, 0x101418, 0.8));
    const key = new THREE.DirectionalLight(0xfff2d8, 1.4);
    key.position.set(-6, 5, 4); g.add(key);
    const grid = new THREE.GridHelper(26, 26, 0x1a2230, 0x10161e);
    grid.position.y = -1.3; g.add(grid);

    // ── 标签 ─────────────────────────────────────────────────────
    const L = U.LabelSys;
    L.add(ctx, 't4-star', '恒星<br><small>沿视线运动</small>',
      new THREE.Vector3(0, 1.1, 0), { dx: 120, dy: -40, color: '#ffd9a0' });
    L.add(ctx, 't4-obs', '观测者<br><small>望远镜</small>',
      new THREE.Vector3(-8.0, 0.9, 0), { dx: -130, dy: -60, color: '#8a93a0' });
    L.add(ctx, 't4-spec', '光谱视角<br><small>Hα 谱线位移</small>',
      new THREE.Vector3(1.5, 3.75, 0), { dx: 150, dy: 50, color: '#a78bfa' });
    L.add(ctx, 't4-ring', '波前环<br><small>前方压缩 = 蓝移</small>',
      new THREE.Vector3(3.2, 0, 0), { dx: 140, dy: 90, color: '#4cc9f0' });

    // ── 相机 ─────────────────────────────────────────────────────
    const orb = ctx.orbit;
    orb.setHome(0.7, 1.25, 15, -1, 0.8, 0);

    this.st = { g, star, starGlow, planet, orbit, screen, t: 0 };
    this.built = true; this.lastBeat = 0;
    this.rings = []; this.emT = 0; this.wobT = 0; this.starX = 0;
    this.drawSpectrum(0);
    return this.st;
  },

  // ── 谱线屏：背景渐变 + 静止参考线 + 移动的 Hα ──────────────────
  drawSpectrum(shiftNm) {
    const c = this.specCanvas, ctx2 = c.getContext('2d');
    const W = c.width, H = c.height;
    ctx2.clearRect(0, 0, W, H);
    ctx2.fillStyle = '#0a0e14'; ctx2.fillRect(0, 0, W, H);
    const xOf = wl => (wl - SPEC_MIN) / (SPEC_MAX - SPEC_MIN) * W;
    // 蓝端/红端示意底色
    const gr = ctx2.createLinearGradient(0, 0, W, 0);
    gr.addColorStop(0, 'rgba(80,120,220,0.16)');
    gr.addColorStop(0.5, 'rgba(20,20,20,0)');
    gr.addColorStop(1, 'rgba(220,80,60,0.16)');
    ctx2.fillStyle = gr; ctx2.fillRect(0, 0, W, H);
    // 静止参考线（虚线）
    const x0 = xOf(LAM0);
    ctx2.strokeStyle = 'rgba(154,163,176,0.8)'; ctx2.setLineDash([6, 5]);
    ctx2.beginPath(); ctx2.moveTo(x0, 8); ctx2.lineTo(x0, H - 8); ctx2.stroke();
    ctx2.setLineDash([]);
    ctx2.fillStyle = '#9aa3b0'; ctx2.font = '13px system-ui';
    ctx2.fillText('静止 Hα 656.3 nm', x0 + 6, 20);
    // 移动的谱线（宽吸收线）
    const xs = xOf(LAM0 + shiftNm);
    ctx2.fillStyle = 'rgba(20,30,45,0.92)';
    ctx2.fillRect(xs - 7, 8, 14, H - 16);
    ctx2.strokeStyle = this.vKms >= 0 ? '#ff7a5e' : '#5ea8ff';
    ctx2.lineWidth = 2.5;
    ctx2.strokeRect(xs - 7, 8, 14, H - 16);
    ctx2.fillStyle = this.vKms >= 0 ? '#ff9f8a' : '#8ac4ff';
    ctx2.font = 'bold 14px system-ui';
    const lbl = 'λ=' + (LAM0 + shiftNm).toFixed(3) + ' nm';
    ctx2.fillText(lbl, Math.min(xs + 12, W - 130), H - 14);
    // 蓝/红移标记
    ctx2.fillStyle = '#5ea8ff'; ctx2.font = '12px system-ui';
    ctx2.fillText('← 蓝移', 8, H - 12);
    ctx2.fillStyle = '#ff9f8a'; ctx2.textAlign = 'right';
    ctx2.fillText('红移 →', W - 8, H - 12);
    ctx2.textAlign = 'left';
    this.specTex.needsUpdate = true;
  },

  // ── 面板（onEnter）──────────────────────────────────────────────
  onEnter(ctx) {
    const box = document.getElementById('pipelineBox');
    box.innerHTML = '';
    const mount = document.createElement('div'); mount.id = 'pipeMount';
    box.appendChild(mount);
    this.pipe = APP.PIPE.mount(mount, 't4');
    this.hud = document.createElement('div'); this.hud.className = 'tab-hud';
    box.appendChild(this.hud);
    this.renderPanel();
    this.applyState();
  },

  renderPanel() {
    const el = this.hud;
    el.innerHTML =
      '<div class="chip-row" id="t4Modes">' +
      '<button class="chip on" data-m="vel">🚀 速度模式</button>' +
      '<button class="chip" data-m="planet">🪐 系外行星</button></div>' +
      '<div id="t4Body"></div>';
    el.querySelectorAll('#t4Modes .chip').forEach(c =>
      c.addEventListener('click', () => {
        this.mode = c.dataset.m;
        el.querySelectorAll('#t4Modes .chip').forEach(x => x.classList.toggle('on', x === c));
        this.applyState();
      }));
  },

  applyState() {
    const body = document.getElementById('t4Body');
    if (!body) return;
    const F = APP.F;
    if (this.mode === 'vel') {
      body.innerHTML =
        '<div class="slider-row"><label>视向速度 v <b id="t4V">0 km/s</b></label>' +
        '<input type="range" id="t4Vel" min="-30" max="30" step="1" value="0"></div>' +
        '<div class="t4-presets" id="t4Pres">' +
        '<button class="chip" data-v="-300">仙女座 −300 km/s</button>' +
        '<button class="chip" data-v="234">+234 km/s</button></div>' +
        '<div class="t4-z" id="t4Z"></div>';
      const sl = body.querySelector('#t4Vel');
      sl.addEventListener('input', () => this.setV(+sl.value * 10));   // −300..+300 km/s
      body.querySelectorAll('#t4Pres .chip').forEach(c =>
        c.addEventListener('click', () => { sl.value = (+c.dataset.v) / 10; this.setV(+c.dataset.v); }));
      this.setV(this.vKms || 0);
    } else {
      body.innerHTML = '<div class="chip-row" id="t4Planets">' +
        PLANETS.map((p, i) => '<button class="chip' + (this.planet.id === p.id ? ' on' : '') +
          '" data-i="' + i + '">' + p.name + '</button>').join('') + '</div>' +
        '<div class="t4-k" id="t4K"></div>';
      body.querySelectorAll('#t4Planets .chip').forEach(c =>
        c.addEventListener('click', () => {
          this.planet = PLANETS[+c.dataset.i];
          body.querySelectorAll('#t4Planets .chip').forEach(x => x.classList.toggle('on', x === c));
          this.applyState();
        }));
      const k = F.rvK(this.planet.Mp, this.planet.Pday, 1.0);
      const kEl = body.querySelector('#t4K');
      if (kEl) kEl.innerHTML = 'K = 28.4 × ' + this.planet.Mp + ' × ' +
        '(' + (this.planet.Pday / 365.25).toFixed(2) + ')^(−⅓) × 1^(−⅔) = <b>' +
        k.toFixed(1) + ' m/s</b><br>' + this.planet.note;
      this._cur = { mode: 'planet', planet: this.planet.id, K: k };
      this.st && (this.st.planet.visible = true, this.st.orbit.visible = true);
    }
    this.updatePipe();
  },

  setV(vKms) {
    this.vKms = vKms;
    this.v = vKms * 1000 / APP.C.C_MS;                    // c 的倍数
    const vEl = document.getElementById('t4V');
    if (vEl) vEl.textContent = (vKms > 0 ? '+' : '') + Math.round(vKms) + ' km/s';
    const zEl = document.getElementById('t4Z');
    if (zEl) zEl.textContent = 'z = Δλ/λ₀ = ' + (this.v >= 0 ? '+' : '') +
      this.v.toFixed(5) + (Math.abs(this.v) > 0.001 ? '  （相对论修正后略有不同）' : '');
    this.drawSpectrum(APP.F.shiftLam(vKms * 1000, LAM0 * 1e-9) * 1e9);
    this._cur = { mode: 'vel', vKms, v: this.v, z: this.v };
    this.updatePipe();
  },

  updatePipe() {
    if (!this.pipe) return;
    const F = APP.F;
    if (this.mode === 'vel') {
      const dl = F.shiftLam(this.vKms * 1000, LAM0 * 1e-9) * 1e9;   // nm
      this.pipe.setAll({
        raw: '谱线观测波长 λ<sub>obs</sub> 与实验室波长 λ₀=656.3 nm 之差<br>' +
             '<b>Δλ = ' + (dl >= 0 ? '+' : '') + dl.toFixed(3) + ' nm</b>',
        eq: '视向速度 <b>v = c · Δλ / λ₀</b><br>（远离为正 → 红移；靠近为负 → 蓝移）',
        calc: 'v = 3×10⁵ km/s × (' + dl.toFixed(3) + ' / 656.3)<br>' +
              '= <b>' + (this.vKms >= 0 ? '+' : '') + Math.round(this.vKms) + ' km/s</b>',
        result: '仙女座测得 Δλ 为负 → <b>−300 km/s</b> 蓝移：它正朝银河系飞来（45 亿年后相撞）'
      });
      this._cur = { mode: 'vel', vKms: this.vKms, z: this.v };
    } else {
      const k = F.rvK(this.planet.Mp, this.planet.Pday, 1.0);
      this.pipe.setAll({
        raw: '恒星"醉步"：绕共同质心摆动 → 谱线<b>周期性左右晃</b><br>' +
             '读出晃动幅度 K 与周期 P',
        eq: 'K = <b>28.4</b>·(M<sub>p</sub> sin i / M<sub>J</sub>)·(P/yr)<sup>−⅓</sup>·' +
            '(M<sub>★</sub>/M<sub>☉</sub>)<sup>−⅔</sup> m/s',
        calc: this.planet.name + '：M<sub>p</sub> sin i = ' + this.planet.Mp + ' M<sub>J</sub>，' +
              'P = ' + this.planet.Pday + ' d = ' + (this.planet.Pday / 365.25).toFixed(2) + ' yr<br>' +
              'K = 28.4 × ' + this.planet.Mp + ' × ' +
              (this.planet.Pday / 365.25).toFixed(2) + '^(−⅓) = <b>' + k.toFixed(1) + ' m/s</b>',
        result: '51 Peg b：K ≈ <b>58 m/s</b>（文献拟合 55.2–57.3；公式忽略偏心率，故偏 3–5%）' +
                '<br>→ 1995 年首颗主序星系外行星（2019 诺贝尔奖）' +
                '<br>HARPS 精度 0.97 m/s → Δλ ≈ 2.1 飞米（原子核尺度）'
      });
      this._cur = { mode: 'planet', planet: this.planet.id, K: k };
    }
  },

  update(dt, active) {
    if (!this.st || !active) return;
    const st = this.st; st.t += dt;
    const beat = (window.APP && APP.app) ? APP.app.beat : 2;
    if (beat !== this.lastBeat) {
      this.lastBeat = beat;
      if (beat === 1) APP.UI.setPanel(
        '<h3>🚑 不看本体怎么知道它在动？</h3>' +
        '<p>星星朝我们或背我们运动时，光的<b>波长会被拉长或压短</b>——' +
        '就像救护车擦身而过时声音变调。</p>' +
        '<p>远离 → 波长变长（<b>红移</b>）；靠近 → 波长变短（<b>蓝移</b>）。</p>' +
        '<p>↓ 下一拍：拨速度滑块，看波环和谱线怎么动。</p>');
    }
    if (this.mode === 'vel') {
      // 恒星匀速沿 x 运动（示意尺度），到边界折返
      const vWorld = this.v * C_SCALE * 2.2;            // 与 c 成比例的世界速度
      this.starX = THREE.MathUtils.clamp(this.starX + vWorld * dt, -5, 5);
      if (Math.abs(this.starX) > 4.99 && Math.sign(vWorld) === Math.sign(this.starX)) {
        this.starX = Math.sign(vWorld) * 4.99;          // 停在边缘避免抖动
      }
      st.star.position.x = this.starX;
      st.starGlow.position.x = this.starX;
      st.planet.visible = false; st.orbit.visible = false;
    } else {
      // 行星模式：恒星绕质心正弦摆动，K 越大摆得越快
      const K = APP.F.rvK(this.planet.Mp, this.planet.Pday, 1.0);
      const w = 0.6 + K / 60;                            // 摆动角频率（示意）
      this.wobT += dt * w;
      const amp = 0.5 + Math.min(1.5, K / 40);
      this.starX = Math.cos(this.wobT) * amp * 0.5;
      st.star.position.set(this.starX * 0.3, 0, 0);
      st.starGlow.position.set(this.starX * 0.3, 0, 0);
      // 行星反相绕转
      const pa = this.wobT + Math.PI;
      st.planet.position.set(Math.cos(pa) * 1.9, 0, Math.sin(pa) * 1.9);
      st.planet.visible = true; st.orbit.visible = true;
      // 谱线随摆动左右晃（真实位移仅飞米级，示意放大 ×3×10⁵）
      const realShiftNm = APP.F.shiftLam(K * Math.cos(this.wobT), LAM0 * 1e-9) * 1e9;
      this.drawSpectrum(realShiftNm * 3e5);
      this.vKms = K * Math.cos(this.wobT);
    }
    // ── 波前环：每 EM_PERIOD 从恒星当前位置发射一枚，真实多普勒压缩 ──
    this.emT += dt;
    if (this.emT >= EM_PERIOD) {
      this.emT -= EM_PERIOD;
      const ring = APP.U.makeWaveRing(0.4, this.vKms >= 0 ? 0xff9f6b : 0x6fb8ff, 64);
      ring.position.set(st.star.position.x, 0, 0);
      ring.userData.age = 0;
      g_add(st.g, ring);
      this.rings.push(ring);
      if (this.rings.length > 14) {
        const old = this.rings.shift();
        st.g.remove(old); old.geometry.dispose(); old.material.dispose();
      }
    }
    for (const r of this.rings) {
      r.userData.age += dt;
      const rad = 0.4 + r.userData.age * C_SCALE;
      r.scale.set(rad, rad, rad);
      r.material.opacity = Math.max(0, 0.85 - r.userData.age * 0.28);
    }
    // 恒星呼吸
    const s = 1 + 0.08 * Math.sin(st.t * 2);
    st.starGlow.scale.set(2.0 * s, 2.0 * s, 1);
    // 标签跟随
    APP.U.LabelSys.setAnchor('t4-star', new THREE.Vector3(st.star.position.x, 1.1, 0));
    APP.U.LabelSys.setAnchor('t4-ring', new THREE.Vector3(st.star.position.x + 3.2, 0, 0));
  },

  reset() {
    if (this.st) { this.st.t = 0; }
    this.starX = 0; this.emT = 0; this.wobT = 0;
  },

  dispose() {
    if (!this.st) return;
    const L = APP.U.LabelSys;
    ['t4-star', 't4-obs', 't4-spec', 't4-ring'].forEach(id => L.remove(null, id));
    this.rings.length = 0;
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
    return Object.assign({ tab: 't4-doppler' }, this._cur || {});
  }
};

// 辅助：加入组（避免 update 内反复取 st.g）
function g_add(group, obj) { group.add(obj); }
