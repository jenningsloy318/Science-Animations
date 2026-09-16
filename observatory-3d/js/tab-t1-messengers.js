// tab-t1-messengers.js — T1 信使全家福：地球居中，五位信使从不同方向登场（规格 §3 组一）
// 信使：电磁波 1609 / 中微子 1968 / 引力波 2015 / 宇宙线 1912 / 样品返回 1969
'use strict';

APP.Tabs = APP.Tabs || {};

const M_DIR = {                         // 信使入射方向（单位向量）与登场参数
  em:  { dir: [-0.6, 0.45, -0.66], color: 0xffd166, icon: '🌈' },
  nu:  { dir: [-0.3, -0.75, 0.58], color: 0x4cc9f0, icon: '👻' },
  gw:  { dir: [0.85, -0.1, -0.52], color: 0x2dd4bf, icon: '🌊' },
  cr:  { dir: [0.15, 0.85, 0.5],   color: 0xf59e0b, icon: '⚡' },
  smp: { dir: [-0.55, 0.6, 0.58],  color: 0xa78bfa, icon: '🪨' }
};

APP.Tabs['t1-messengers'] = {
  built: false, st: null, pipe: null, hud: null, lastBeat: 0, _cur: null,
  sel: null,                                   // 当前选中信使
  MESH: {},                                    // 信使代理（id → Object3D）

  build(ctx) {
    if (this.built) return this.st;
    const { scene, MATS } = ctx;
    const U = APP.U;
    const g = new THREE.Group(); g.name = 't1-messengers'; scene.add(g);

    // ── 地球（半透明，能被中微子穿透）──────────────────────────
    const earth = new THREE.Mesh(new THREE.SphereGeometry(1.6, 48, 32),
      new THREE.MeshStandardMaterial({ color: 0x2a5a8a, metalness: 0.3, roughness: 0.5,
        transparent: true, opacity: 0.45, side: THREE.DoubleSide }));
    g.add(earth);
    const earthCore = new THREE.Mesh(new THREE.SphereGeometry(1.55, 32, 24),
      new THREE.MeshBasicMaterial({ color: 0x0a1a26 }));
    g.add(earthCore);
    // 经纬网
    const lat = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.SphereGeometry(1.62, 16, 12)),
      new THREE.LineBasicMaterial({ color: 0x4a8ab4, transparent: true, opacity: 0.5 }));
    g.add(lat);
    // 大气晕
    const halo = new THREE.Sprite(MATS.glow.clone());
    halo.material.color.setHex(0x4a90c4);
    halo.scale.set(5.2, 5.2, 1); g.add(halo);

    // ── 五位信使（绕地球的轨道上排开，点击可选中）──────────────
    const M = APP.DATA.D.messengers;
    M.forEach((m, i) => {
      const p = M_DIR[m.id];
      const grp = new THREE.Group();
      // 载体（每种信使形状不同，一眼可分）
      let body;
      if (m.id === 'em') {                            // 光：彩虹光束
        body = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.7, 8),
          new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: 0.9 }));
        body.rotation.x = Math.PI / 2;
      } else if (m.id === 'nu') {                     // 中微子：幽灵活球
        body = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12),
          new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: 0.45 }));
      } else if (m.id === 'gw') {                     // 引力波：双锥涟漪
        body = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 8, 24),
          new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: 0.85 }));
        body.rotation.x = Math.PI / 2;
      } else if (m.id === 'cr') {                     // 宇宙线：螺旋粒子
        body = new THREE.Mesh(new THREE.OctahedronGeometry(0.16),
          new THREE.MeshBasicMaterial({ color: p.color }));
      } else {                                        // 样品返回：返回舱
        body = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.4, 12),
          new THREE.MeshStandardMaterial({ color: 0x8a93a0, metalness: 0.9, roughness: 0.3 }));
      }
      body.userData = { m, i, select: m.id };
      grp.add(body);
      // 光晕
      const glow = new THREE.Sprite(MATS.glow.clone());
      glow.material.color.setHex(p.color);
      glow.scale.set(0.9, 0.9, 1); grp.add(glow);
      // 入射尾迹（从远处指向地球）
      const tail = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(p.dir[0] * 6.5, p.dir[1] * 6.5, p.dir[2] * 6.5),
          new THREE.Vector3(p.dir[0] * 2.6, p.dir[1] * 2.6, p.dir[2] * 2.6)]),
        new THREE.LineBasicMaterial({ color: p.color, transparent: true, opacity: 0.35,
          blending: THREE.AdditiveBlending }));
      g.add(tail);
      // 轨道位置：沿入射方向绕地球排开
      grp.position.set(p.dir[0] * 3.4, p.dir[1] * 3.4, p.dir[2] * 3.4);
      g.add(grp);
      this.MESH[m.id] = { grp, body, glow, tail, m, basePos: grp.position.clone(),
        orbitA: i * 1.3, ring: null };
      // 中微子额外：一条穿透地球的虚线（示意"穿过去"）
      if (m.id === 'nu') {
        const pass = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-p.dir[0] * 6.5, -p.dir[1] * 6.5, -p.dir[2] * 6.5),
            new THREE.Vector3(p.dir[0] * 6.5, p.dir[1] * 6.5, p.dir[2] * 6.5)]),
          new THREE.LineDashedMaterial({ color: p.color, dashSize: 0.25, gapSize: 0.15,
            transparent: true, opacity: 0.4 }));
        pass.computeLineDistances(); g.add(pass);
        this.MESH.nu.pass = pass;
      }
    });

    // ── 星空背景 ────────────────────────────────────────────────
    const starsGeo = new THREE.BufferGeometry();
    const starsPos = [];
    for (let i = 0; i < 700; i++) {
      const v = new THREE.Vector3().setFromSphericalCoords(13,
        Math.acos(2 * Math.random() - 1), Math.random() * Math.PI * 2);
      starsPos.push(v.x, v.y, v.z);
    }
    starsGeo.setAttribute('position', new THREE.Float32BufferAttribute(starsPos, 3));
    const stars = new THREE.Points(starsGeo,
      new THREE.PointsMaterial({ color: 0xd8e0ea, size: 0.05, sizeAttenuation: true,
        transparent: true, opacity: 0.7 }));
    g.add(stars);

    // ── 灯光 ─────────────────────────────────────────────────────
    g.add(new THREE.HemisphereLight(0xb8c4d4, 0x101418, 1.0));
    const key = new THREE.DirectionalLight(0xfff2d8, 1.2);
    key.position.set(4, 6, 3); g.add(key);

    // ── 标签（每个信使一个）─────────────────────────────────────
    const L = U.LabelSys;
    M.forEach((m, i) => {
      const p = M_DIR[m.id];
      L.add(ctx, 't1-m-' + m.id,
        m.icon + ' ' + m.name + '<br><small>' + m.year + ' 年开窗</small>',
        new THREE.Vector3(p.dir[0] * 3.4, p.dir[1] * 3.4, p.dir[2] * 3.4),
        { dx: (p.dir[0] > 0 ? 1 : -1) * 130, dy: (p.dir[1] > 0 ? 1 : -1) * 60,
          color: '#' + p.color.toString(16).padStart(6, '0') });
    });
    L.add(ctx, 't1-earth', '我们<br><small>只能直接读四种"语言"</small>',
      new THREE.Vector3(0, 1.9, 0), { dx: 140, dy: -60, color: '#4a90c4' });

    // ── 相机 ─────────────────────────────────────────────────────
    const orb = ctx.orbit;
    orb.setHome(0.4, 1.15, 14, 0, 0, 0);

    this.st = { g, earth, earthCore, halo, lat, stars, t: 0 };
    this.built = true; this.lastBeat = 0;
    this.select('em');
    return this.st;
  },

  select(id) {
    this.sel = id;
    const M = APP.DATA.D.messengers;
    const m = M.find(x => x.id === id);
    if (!m) return;    // 高亮：选中信使放大，其余缩小
    M.forEach(x => {
      const e = this.MESH[x.id]; if (!e) return;
      const on = x.id === id;
      e.grp.scale.setScalar(on ? 1.5 : 0.85);
      e.glow.material.opacity = on ? 1 : 0.4;
      e.tail.material.opacity = on ? 0.6 : 0.18;
      APP.U.LabelSys.setVisible('t1-m-' + x.id, true);
    });
    const obs = m.obs.map(o => APP.DATA.OBSERV_META[o].name).join(' + ');
    if (!this.pipe) return;                  // build 阶段尚未挂载流水线，onEnter 会再调 select
    this.pipe.setAll({
      raw: '信使：<b>' + m.name + '</b>（' + m.year + ' 年开窗）<br>' + m.info,
      eq: '无论哪种信使，探测器最终只输出<b>四种可观测量</b>：' +
          '角度 · 时间 · 亮度（计数）· 波长（频率）',
      calc: m.name + ' 直接读出：<b>' + obs + '</b><br>' +
            '（距离、速度、温度、成分、质量、半径、年龄——全靠这四样 + 实验室物理推出来）',
      result: m.id === 'nu'
        ? 'IceCube-170922A（2017-09-22）：≈290 TeV 中微子<br>' +
          'DOM 点亮时刻（ns）→ 三角定位 → 方向误差 ≈0.15°<br>' +
          '分钟级实时警报 → 费米确认耀变体 TXS 0506+056（~3σ）'
        : m.id === 'gw'
        ? 'GW150914（2015-09-14）：36+29 → 62 M☉，13 亿光年<br>' +
          '两臂干涉条纹相位差 → 应变 h ≈ 10⁻²¹ → ΔL = 4×10⁻¹⁸ m'
        : m.id === 'smp'
        ? '阿波罗 382 kg · 嫦娥五号 1,731 g · 六号 1,935.3 g（首份月背）<br>' +
          '同位素钟直接读绝对年龄——光做不到'
        : m.id === 'cr'
        ? '宇宙线：带电粒子被银河磁场螺旋偏折<br>' +
          '→ 指不回源头，只能测到达方向与能量'
        : '光：最古老也最常用的信使<br>' +
          '望远镜 + 光谱仪把光翻译成角度、亮度、波长'
    });
    this._cur = { messenger: id, year: m.year, obs: m.obs };
    // 语言条高亮该信使的可观测量
    if (window.APP && APP.app && APP.UI.setLang) {
      try { APP.UI.setLang(m.obs); } catch (e) {}
    }
  },

  // ── 面板（onEnter）──────────────────────────────────────────────
  onPick(id) {
    if (!this.MESH[id]) return;
    this.select(id);
    // 同步高亮 chips
    if (this.hud) {
      const M = APP.DATA.D.messengers;
      this.hud.querySelectorAll('#t1Chips .chip').forEach((c, i) =>
        c.classList.toggle('on', M[i].id === id));
    }
  },

  onEnter(ctx) {
    const box = document.getElementById('pipelineBox');
    box.innerHTML = '';
    const mount = document.createElement('div'); mount.id = 'pipeMount';
    box.appendChild(mount);
    this.pipe = APP.PIPE.mount(mount, 't1');
    this.hud = document.createElement('div'); this.hud.className = 'tab-hud';
    box.appendChild(this.hud);
    this.renderPanel();
    this.select(this.sel || 'em');
  },

  renderPanel() {
    const el = this.hud;
    const M = APP.DATA.D.messengers;
    el.innerHTML = '<div class="t1-hint">👆 点击 3D 场景中的信使，或：</div>' +
      '<div class="chip-row" id="t1Chips">' +
      M.map((m, i) => '<button class="chip" data-i="' + i + '">' +
        M_DIR[m.id].icon + ' ' + m.name + '</button>').join('') + '</div>';
    el.querySelectorAll('#t1Chips .chip').forEach(c =>
      c.addEventListener('click', () => {
        this.select(APP.DATA.D.messengers[+c.dataset.i].id);
        el.querySelectorAll('#t1Chips .chip').forEach(x =>
          x.classList.toggle('on', x === c));
      }));
  },

  update(dt, active) {
    if (!this.st || !active) return;
    const st = this.st; st.t += dt;
    const beat = (window.APP && APP.app) ? APP.app.beat : 2;
    if (beat !== this.lastBeat) {
      this.lastBeat = beat;
      if (beat === 1) APP.UI.setPanel(
        '<h3>🌌 宇宙怎么"说话"给我们？</h3>' +
        '<p>天上的东西不会自己跑过来（除了陨石）。它们派出<b>信使</b>：' +
        '光、中微子、引力波、宇宙线，还有真真切切的<b>岩石样品</b>。</p>' +
        '<p>不管信使是谁，我们的仪器最终只能读出<b>四种"语言"</b>：' +
        '方向（角度）、时间、亮度（计数）、波长（频率）。</p>' +
        '<p>↓ 点击任一信使，看它说什么。</p>');
      if (beat >= 3 && this.hud) {
        // 拍③ 提示选中可玩
        const chips = this.hud.querySelectorAll('#t1Chips .chip');
        if (chips.length && !this._chipped) {
          this._chipped = true;
          chips[0].classList.add('on');
        }
      }
    }
    // 信使沿各自小轨道漂移 + 自转
    Object.entries(this.MESH).forEach(([id, e]) => {
      const a = e.orbitA + st.t * 0.22;
      const bp = e.basePos;
      e.grp.position.set(
        bp.x * (1 + 0.12 * Math.sin(a)),
        bp.y * (1 + 0.12 * Math.cos(a)),
        bp.z * (1 + 0.12 * Math.sin(a * 0.8)));
      e.body.rotation.y += dt * 1.2;
      e.body.rotation.x += dt * 0.6;
      // 引力波信使额外涟漪环
      if (id === 'gw') e.body.rotation.z += dt * 2.0;
    });
    // 地球自转 + 大气呼吸
    st.earth.rotation.y += dt * 0.12;
    st.earthCore.rotation.y += dt * 0.12;
    st.lat.rotation.y += dt * 0.12;
    const s = 1 + 0.06 * Math.sin(st.t * 1.2);
    st.halo.scale.set(5.2 * s, 5.2 * s, 1);
    // 标签跟随信使漂移
    Object.entries(this.MESH).forEach(([id, e]) => {
      APP.U.LabelSys.setAnchor('t1-m-' + id, e.grp.position.clone());
    });
  },

  reset() { if (this.st) this.st.t = 0; },

  dispose() {
    if (!this.st) return;
    const L = APP.U.LabelSys;
    Object.keys(this.MESH).forEach(id => L.remove(null, 't1-m-' + id));
    L.remove(null, 't1-earth');
    this.st.g.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) { if (Array.isArray(o.material)) o.material.forEach(m => m.dispose()); else o.material.dispose(); }
    });
    if (this.st.g.parent) this.st.g.parent.remove(this.st.g);
    const box = document.getElementById('pipelineBox');
    if (box) box.innerHTML = '';
    this.st = null; this.built = false; this.pipe = null; this.hud = null;
    this.MESH = {};
  },

  probe(name) {
    return Object.assign({ tab: 't1-messengers' }, this._cur || {});
  }
};
