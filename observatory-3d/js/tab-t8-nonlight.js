// tab-t8-nonlight.js — T8 光之外：引力波 / 中微子 / 样品返回（A/B/C 子导航，规格 §3 组五）
// A·LIGO：h = ΔL/L，h≈10⁻²¹、L=4 km → ΔL = 4×10⁻¹⁸ m ≈ 质子直径 1/400；
// B·IceCube：86 string、5,160 DOM、切伦科夫锥 ~41°、IceCube-170922A；
// C·样品返回：阿波罗 382 kg … OSIRIS-REx 121.6 g。
'use strict';

APP.Tabs = APP.Tabs || {};

const SUBS = [
  { id: 'gw', name: 'A · 引力波', icon: '🌊' },
  { id: 'nu', name: 'B · 中微子', icon: '👻' },
  { id: 'smp', name: 'C · 样品返回', icon: '🪨' }
];

APP.Tabs['t8-nonlight'] = {
  built: false, st: null, pipe: null, hud: null, lastBeat: 0, _cur: null,
  sub: 'gw', t: 0, gwPhase: 0, iceT: 0,

  build(ctx) {
    if (this.built) return this.st;
    const { scene, MATS } = ctx;
    const U = APP.U;
    const g = new THREE.Group(); g.name = 't8-nonlight'; scene.add(g);
    const gold2 = MATS.gold.clone(); gold2.side = THREE.DoubleSide;

    // ══ A · 引力波（LIGO 俯视）══════════════════════════════════
    const gw = new THREE.Group(); g.add(gw);
    const ARM = 4.0;                                    // 示意臂长（真实 4 km）
    const armGeo = new THREE.BoxGeometry(ARM, 0.16, 0.16);
    const armX = new THREE.Mesh(armGeo, MATS.steel); armX.position.set(ARM / 2, 0, 0); gw.add(armX);
    const armZ = new THREE.Mesh(armGeo, MATS.steel); armZ.position.set(0, 0, ARM / 2); armZ.rotation.y = Math.PI / 2; gw.add(armZ);
    // 真空管端镜
    for (const p of [[ARM, 0, 0], [0, 0, ARM]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.3), gold2);
      m.position.set(p[0], 0.15, p[2]); gw.add(m);
    }
    // 分束器（中心）
    const bs = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), MATS.gold);
    gw.add(bs);
    // 激光指示
    const las = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8),
      new THREE.MeshBasicMaterial({ color: 0xff5e5e, transparent: true, opacity: 0.8 }));
    las.position.set(0, 0.45, 0); las.rotation.x = Math.PI / 2; gw.add(las);
    // 应变波形屏（ chirp 画布）
    const gwCv = document.createElement('canvas'); gwCv.width = 512; gwCv.height = 160;
    const gwTex = new THREE.CanvasTexture(gwCv);
    const gwScr = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.75),
      new THREE.MeshBasicMaterial({ map: gwTex, side: THREE.DoubleSide }));
    gwScr.position.set(1.2, 2.4, 1.2); gwScr.rotation.x = -0.35; gw.add(gwScr);
    const gwFrame = new THREE.Mesh(new THREE.BoxGeometry(5.8, 1.95, 0.08), MATS.dark);
    gwFrame.position.set(1.2, 2.4, 1.12); gw.add(gwFrame);
    // 引力波经过的时空网格（背景涟漪）
    const gwGrid = new THREE.GridHelper(16, 32, 0x2a3340, 0x14181f);
    gwGrid.position.y = -0.6; gw.add(gwGrid);

    // ══ B · 中微子（IceCube 剖面）═══════════════════════════════
    const nu = new THREE.Group(); nu.visible = false; g.add(nu);
    // 冰盖剖面
    const ice = new THREE.Mesh(new THREE.BoxGeometry(6, 5.2, 3),
      new THREE.MeshStandardMaterial({ color: 0x122033, metalness: 0.1, roughness: 0.2,
        transparent: true, opacity: 0.45, side: THREE.DoubleSide }));
    ice.position.y = 0.2; nu.add(ice);
    // 86 条 string（画前 12 条示意，其余用点）
    const strings = [];
    for (let i = 0; i < 12; i++) {
      const sx = -2.2 + (i % 4) * 1.5, sz = -1.0 + Math.floor(i / 4) * 1.0;
      const sline = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(sx, 2.4, sz), new THREE.Vector3(sx, -2.0, sz)]),
        new THREE.LineBasicMaterial({ color: 0x2a4a6a, transparent: true, opacity: 0.6 }));
      nu.add(sline);
      // DOM（每条 string 上 5 颗，示意）
      for (let k = 0; k < 5; k++) {
        const dom = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8),
          new THREE.MeshBasicMaterial({ color: 0x0a1420 }));
        dom.position.set(sx, 2.0 - k * 1.05, sz);
        dom.userData = { lit: 0 };
        nu.add(dom); strings.push(dom);
      }
    }
    // 中微子 → μ 子径迹（从上方斜入）
    const track = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-3.5, 4.2, 1.2), new THREE.Vector3(2.5, -2.4, -0.8)]),
      new THREE.LineBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.85,
        blending: THREE.AdditiveBlending }));
    track.renderOrder = 4; nu.add(track);
    // 切伦科夫光锥
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(1.1, 3.2, 32, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x4cc9f0, transparent: true, opacity: 0.25,
        side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    // 锥轴沿径迹方向；锥半角 = 90° - 41°
    cone.geometry.rotateX(Math.PI / 2 - (41 * Math.PI / 180) - Math.PI / 2);
    cone.position.set(-0.8, 1.4, 0.5);
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(6, -6.6, -2).normalize());
    cone.geometry.rotateX(0);                            // 修正：直接用朝向
    nu.add(cone);
    // 冰面
    const iceTop = new THREE.Mesh(new THREE.PlaneGeometry(8, 4),
      new THREE.MeshStandardMaterial({ color: 0x0d1a26, metalness: 0.2, roughness: 0.5 }));
    iceTop.rotation.x = -Math.PI / 2; iceTop.position.y = 2.85; nu.add(iceTop);

    // ══ C · 样品返回 ════════════════════════════════════════════
    const smp = new THREE.Group(); smp.visible = false; g.add(smp);
    const samples = APP.DATA.D.samples;
    const smpItems = [];
    samples.forEach((s, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      // 样品瓶
      const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.7, 16),
        new THREE.MeshStandardMaterial({ color: 0x22303f, metalness: 0.7, roughness: 0.2,
          transparent: true, opacity: 0.75 }));
      jar.position.set(-1.8 + col * 1.8, 0.35, 0.6 - row * 1.4); smp.add(jar);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 16), MATS.gold);
      cap.position.set(-1.8 + col * 1.8, 0.76, 0.6 - row * 1.4); smp.add(cap);
      // 标签牌
      const tag = new THREE.Sprite(MATS.glow.clone());
      tag.material.color.setHex(0xd8b25c);
      tag.scale.set(0.85, 0.3, 1);
      tag.position.set(-1.8 + col * 1.8, 1.15, 0.6 - row * 1.4);
      smp.add(tag); smpItems.push({ tag, s });
    });
    // 返回舱
    const capsule = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 16),
      new THREE.MeshStandardMaterial({ color: 0x8a93a0, metalness: 0.9, roughness: 0.3 }));
    capsule.position.set(3.6, 0.7, -1.2); capsule.rotation.z = 0.4; smp.add(capsule);
    const para = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xf5f0e2, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
    para.position.set(3.6, 1.9, -1.2); smp.add(para);

    // ══ 灯光 ════════════════════════════════════════════════════
    g.add(new THREE.HemisphereLight(0xb8c4d4, 0x101418, 0.85));
    const key = new THREE.DirectionalLight(0xfff2d8, 1.2);
    key.position.set(5, 8, 4); g.add(key);

    // ══ 标签 ════════════════════════════════════════════════════
    const L = U.LabelSys;
    L.add(ctx, 't8-armx', 'X 臂 · 4 km<br><small>引力波经过时伸缩</small>',
      new THREE.Vector3(ARM, 0.4, 0), { dx: 130, dy: -60, color: '#2dd4bf' });
    L.add(ctx, 't8-armz', 'Y 臂 · 4 km<br><small>与 X 臂反向伸缩</small>',
      new THREE.Vector3(0, 0.4, ARM), { dx: -130, dy: -60, color: '#2dd4bf' });
    L.add(ctx, 't8-bs', '分束器<br><small>两束激光干涉</small>',
      new THREE.Vector3(0, 0.6, 0), { dx: -140, dy: 70, color: '#d8b25c' });
    L.add(ctx, 't8-wave', 'GW150914 啁啾波形<br><small>频率升高 = 双黑洞靠近</small>',
      new THREE.Vector3(1.2, 3.3, 1.2), { dx: 160, dy: 60, color: '#2dd4bf' });
    L.add(ctx, 't8-dom', 'DOM 光电倍增管<br><small>5,160 颗 · 1,450–2,450 m 深</small>',
      new THREE.Vector3(-1.6, 0.8, 0.9), { dx: -170, dy: -70, color: '#4cc9f0' });
    L.add(ctx, 't8-cone', '切伦科夫光锥<br><small>冰中半角 ≈ 41°</small>',
      new THREE.Vector3(0.8, 1.6, -0.4), { dx: 160, dy: 50, color: '#4cc9f0' });

    // ══ 相机 ════════════════════════════════════════════════════
    const orb = ctx.orbit;
    orb.setHome(0.55, 1.05, 13, 0, 0.6, 0);

    this.st = { g, gw, nu, smp, smpItems, strings, track, cone, gwScr, gwCv, gwTex, gwGrid };
    this.built = true; this.lastBeat = 0;
    this.gwPhase = 0; this.iceT = 0;
    this.drawChirp(0);
    this.showSub('gw');
    return this.st;
  },

  showSub(id) {
    this.sub = id;
    if (!this.st) return;
    this.st.gw.visible = id === 'gw';
    this.st.nu.visible = id === 'nu';
    this.st.smp.visible = id === 'smp';
    // 标签按子段显隐
    const L = APP.U.LabelSys;
    L.setVisible('t8-armx', id === 'gw'); L.setVisible('t8-armz', id === 'gw');
    L.setVisible('t8-bs', id === 'gw'); L.setVisible('t8-wave', id === 'gw');
    L.setVisible('t8-dom', id === 'nu'); L.setVisible('t8-cone', id === 'nu');
    // 相机目标随子段微调
    const orb = APP.app ? null : null;
  },

  // GW150914 式啁啾波形（频率随时间升高，示意）
  drawChirp(t) {
    const c = this.st.gwCv, ctx2 = c.getContext('2d');
    const W = c.width, H = c.height;
    ctx2.clearRect(0, 0, W, H);
    ctx2.fillStyle = 'rgba(7,9,14,0.95)'; ctx2.fillRect(0, 0, W, H);
    ctx2.strokeStyle = '#2dd4bf'; ctx2.lineWidth = 2;
    ctx2.beginPath();
    for (let x = 0; x < W; x++) {
      // 频率从 35 Hz 升到 250 Hz（示意），振幅随并合增大
      const f = 35 + 215 * Math.pow(x / W, 2.5);
      const amp = 0.25 + 0.65 * Math.pow(x / W, 1.5);
      const y = H / 2 + Math.sin(2 * Math.PI * f * (x / W) / 60 + t * 2) * amp * (H / 2 - 8);
      x === 0 ? ctx2.moveTo(x, y) : ctx2.lineTo(x, y);
    }
    ctx2.stroke();
    ctx2.fillStyle = '#9aa3b0'; ctx2.font = '12px system-ui';
    ctx2.fillText('时间 →', W - 52, H - 8);
    ctx2.fillText('GW150914（示意波形）', 10, 16);
    this.st.gwTex.needsUpdate = true;
  },

  // ── 面板（onEnter）──────────────────────────────────────────────
  onEnter(ctx) {
    const box = document.getElementById('pipelineBox');
    box.innerHTML = '';
    const mount = document.createElement('div'); mount.id = 'pipeMount';
    box.appendChild(mount);
    this.pipe = APP.PIPE.mount(mount, 't8');
    this.hud = document.createElement('div'); this.hud.className = 'tab-hud';
    box.appendChild(this.hud);
    this.renderPanel();
    this.applySub();
  },

  renderPanel() {
    const el = this.hud;
    el.innerHTML = '<div class="chip-row" id="t8Subs">' +
      SUBS.map((s, i) => '<button class="chip' + (i === 0 ? ' on' : '') +
        '" data-i="' + i + '">' + s.icon + ' ' + s.name + '</button>').join('') + '</div>' +
      '<div class="t8-body" id="t8Body"></div>';
    el.querySelectorAll('#t8Subs .chip').forEach(c =>
      c.addEventListener('click', () => {
        this.showSub(SUBS[+c.dataset.i].id);
        el.querySelectorAll('#t8Subs .chip').forEach(x => x.classList.toggle('on', x === c));
        this.applySub();
      }));
  },

  applySub() {
    const body = document.getElementById('t8Body');
    const F = APP.F;
    if (this.sub === 'gw') {
      const disp = F.strainDisp(1e-21, 4000);
      if (body) body.innerHTML =
        '<div class="t8-fact">GW150914（2015-09-14）：<b>36 + 29 → 62 M☉</b>，' +
        '<b>13 亿光年</b>，3 个太阳质量化为引力波</div>' +
        '<div class="t8-fact">展望 LISA：臂长 <b>2.5×10⁶ km</b>（ESA，~2035）</div>';
      this.pipe.setAll({
        raw: '双臂<b>激光干涉条纹的相位差</b><br>应变 h ≈ <b>10⁻²¹</b>，臂长 L = 4,000 m',
        eq: '应变 <b>h = ΔL / L</b> → ΔL = h × L',
        calc: 'ΔL = 10⁻²¹ × 4,000 m = <b>' + F.sci(disp, 1) + ' m</b><br>' +
              '质子直径 ≈ 1.75×10⁻¹⁵ m → ΔL ≈ 其 <b>1/440</b>',
        result: '从波形频率演化拟合出 36 M☉ + 29 M☉ 双黑洞并合<br>' +
                '波形振幅含距离信息 → "标准汽笛"直接测绝对距离'
      });
      this._cur = { sub: 'gw', h: 1e-21, disp };
    } else if (this.sub === 'nu') {
      const ic = APP.DATA.D.icecube;
      if (body) body.innerHTML =
        '<div class="t8-fact">IceCube：' + ic.vol + ' 冰盖 · ' + ic.strings + ' 条 string · ' +
        ic.doms + ' 个 DOM</div>' +
        '<div class="t8-fact">IceCube-170922A：≈290 TeV，定位误差 ≈0.15°，' +
        '实时警报分钟级发出 → 费米确认耀变体 TXS 0506+056（~3σ）</div>';
      this.pipe.setAll({
        raw: '各 DOM 被点亮的<b>时刻（纳秒）与亮度（光子数）</b><br>' +
            'IceCube：' + ic.doms + ' 个 DOM，深 ' + ic.deep,
        eq: 'DOM 间到达时间差 × 冰中光速<br>→ 切伦科夫锥轴<b>三角定位</b>（半角 ≈ 41°，冰 n≈' + ic.n + '）',
        calc: '中微子撞出 μ 子 → 切伦科夫光锥依次点亮 DOM<br>' +
              '纳秒级时间差反推径迹方向与能量',
        result: '2017 GW170817：引力波先到、<b>1.7 s 后</b> γ 暴抵达<br>' +
                '"多信使"协同定位由此成名，独立测出 H₀ ≈ 70 km/s/Mpc'
      });
      this._cur = { sub: 'nu', doms: ic.doms };
    } else {
      if (body) body.innerHTML = APP.DATA.D.samples.map(s =>
        '<div class="t8-fact">🪨 <b>' + s.name + '</b>：' + s.mass + '</div>').join('') +
        '<div class="t8-fact">唯一能上手的"天文学"——同位素钟直接读年龄</div>';
      this.pipe.setAll({
        raw: '实物样品：阿波罗 382 kg · 嫦娥五号 1,731 g · 六号 1,935.3 g（首份月背）<br>' +
            '隼鸟 2 号 5.4 g · OSIRIS-REx 121.6 g',
        eq: '放射性衰变：<b>母/子核素比</b> → 绝对年龄<br>' +
            '（半衰期已知的天然"钟"）',
        calc: '例：铀-铅法测锆石 → 直接给出岩石结晶年龄',
        result: '光只能看"表面"，样品能测"里面"<br>' +
                '月球样本测出月壳年龄，校准了整个内行星时间线'
      });
      this._cur = { sub: 'smp' };
    }
  },

  update(dt, active) {
    if (!this.st || !active) return;
    const st = this.st; this.t += dt;
    const beat = (window.APP && APP.app) ? APP.app.beat : 2;
    if (beat !== this.lastBeat) {
      this.lastBeat = beat;
      if (beat === 1) APP.UI.setPanel(
        '<h3>🌊 光看不见的地方拿什么看？</h3>' +
        '<p>光会被尘埃、气体和大气挡住。但宇宙还派来别的信使：</p>' +
        '<p>引力波（时空涟漪）、中微子（几乎不与物质反应、能穿出星核）、' +
        '以及唯一能上手的"天文学"——<b>实物样品</b>。</p>' +
        '<p>↓ 切换 A/B/C 看三种信使。</p>');
    }
    if (this.sub === 'gw') {
      // 双臂交替伸缩（示意应变），用缩放表示 ΔL/L
      this.gwPhase += dt * 1.5;
      const s = Math.sin(this.gwPhase);
      st.gw.children[0].scale.x = 1 + s * 0.012;       // X 臂
      st.gw.children[1].scale.x = 1 - s * 0.012;       // Y 臂（反向）
      // 时空网格涟漪
      const gp = st.gwGrid.geometry.attributes.position;
      const arr = gp.array;
      for (let i = 0; i < arr.length; i += 3) {
        const d = Math.hypot(arr[i], arr[i + 2]);
        arr[i + 1] = Math.sin(d * 2.2 - this.t * 3) * 0.18 * Math.exp(-d / 9);
      }
      gp.needsUpdate = true;
      this.drawChirp(this.t);
    } else if (this.sub === 'nu') {
      this.iceT += dt;
      // DOM 沿径迹依次点亮（纳秒时间差的可视化）
      const T = 2.6;
      const f = (this.iceT % T) / T;                    // 0..1 沿径迹的位置
      st.strings.forEach((dom, i) => {
        // DOM 到径迹起点的参数（简化：按 y 坐标映射）
        const p = (2.4 - dom.position.y) / 4.4;
        const near = Math.abs(p - f) < 0.12;
        dom.material.color.setHex(near ? 0x9fd8ff : 0x0a1420);
        dom.scale.setScalar(near ? 1.8 : 1.0);
      });
      // 光锥透明度脉动
      st.cone.material.opacity = 0.18 + 0.15 * Math.sin(this.iceT * 3);
    } else {
      // 样品瓶轻微漂浮
      st.smpItems.forEach((it, i) => {
        it.tag.position.y = 1.15 + 0.05 * Math.sin(this.t * 1.5 + i);
      });
    }
  },

  reset() { this.t = 0; this.gwPhase = 0; this.iceT = 0; },

  dispose() {
    if (!this.st) return;
    const L = APP.U.LabelSys;
    ['t8-armx', 't8-armz', 't8-bs', 't8-wave', 't8-dom', 't8-cone'].forEach(id => L.remove(null, id));
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
    return Object.assign({ tab: 't8-nonlight' }, this._cur || {});
  }
};
