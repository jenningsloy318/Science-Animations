// tab-t6-ao.js — T6 自适应光学：湍流 → 激光导星 → 可变形镜 → 锐星像（规格 §3 组三）
// 真实数字：钠导星 589 nm / 钠层 ~90 km；SPHERE·SAXO 41×41 子孔径、1,377 驱动器、1.2 kHz；
// VLT seeing ~0.8″ → AO 后近红外 0.02–0.05″。
'use strict';

APP.Tabs = APP.Tabs || {};

const SEEING_GOOD = 0.8;             // VLT 典型 seeing（角秒）

APP.Tabs['t6-ao'] = {
  built: false, st: null, pipe: null, hud: null, lastBeat: 0, _cur: null,
  aoOn: true, turb: 0.5,              // 湍流强度 0..1
  noAOTex: null, noAOCv: null, aoTex: null, aoCv: null, turbCv: null, turbTex: null,

  build(ctx) {
    if (this.built) return this.st;
    const { scene, MATS } = ctx;
    const U = APP.U;
    const g = new THREE.Group(); g.name = 't6-ao'; scene.add(g);
    const gold2 = MATS.gold.clone(); gold2.side = THREE.DoubleSide;

    // ── 恒星（上方）──────────────────────────────────────────────
    const star = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0xfff2d8 }));
    star.position.set(0, 8.5, 0); g.add(star);
    const starGlow = new THREE.Sprite(MATS.glow.clone());
    starGlow.scale.set(1.6, 1.6, 1); starGlow.position.set(0, 8.5, 0); g.add(starGlow);

    // ── 大气湍流层（两片半透明噪声面，横向漂移）──────────────────
    this.turbCv = document.createElement('canvas');
    this.turbCv.width = this.turbCv.height = 256;
    this.turbTex = new THREE.CanvasTexture(this.turbCv);
    this.drawTurb();
    const turbLayers = [];
    for (let i = 0; i < 2; i++) {
      const lay = new THREE.Mesh(new THREE.PlaneGeometry(9, 9, 1, 1),
        new THREE.MeshBasicMaterial({ map: this.turbTex, transparent: true,
          opacity: 0.35, side: THREE.DoubleSide, depthWrite: false,
          blending: THREE.AdditiveBlending }));
      lay.position.set(0, 5.2 - i * 1.6, 0);
      lay.rotation.x = Math.PI / 2;
      g.add(lay); turbLayers.push(lay);
    }

    // ── 激光导星（589 nm 射向 90 km 钠层）────────────────────────
    const laser = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 3.4, 8),
      new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.85,
        blending: THREE.AdditiveBlending }));
    laser.position.set(-1.6, 3.6, 0); g.add(laser);
    const laserTop = new THREE.Sprite(MATS.glow.clone());
    laserTop.material.color.setHex(0xffd166);
    laserTop.scale.set(0.5, 0.5, 1); laserTop.position.set(-1.6, 5.3, 0); g.add(laserTop);
    // 钠层标记环
    const naLayer = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.015, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.5 }));
    naLayer.position.set(0, 5.3, 0); naLayer.rotation.x = Math.PI / 2; g.add(naLayer);

    // ── 可变形镜（顶点位移动画，AO 开时实时"抵消"畸变）──────────
    const dmGeo = new THREE.PlaneGeometry(2.4, 2.4, 24, 24);
    const dm = new THREE.Mesh(dmGeo, gold2);
    dm.rotation.x = -Math.PI / 2; dm.position.set(0, 1.6, 0); g.add(dm);
    const dmFrame = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.03, 10, 48), MATS.steel);
    dmFrame.position.set(0, 1.6, 0); dmFrame.rotation.x = Math.PI / 2; g.add(dmFrame);
    // 原始顶点（用于位移基准）
    const basePos = dmGeo.attributes.position.array.slice();

    // ── 波前传感器（子孔径亮点阵列，示意）──────────────────────
    const wfs = new THREE.Group();
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0x22d3ee }));
      dot.position.set(-0.5 + i * 0.25, 2.9, -0.5 + j * 0.25);
      wfs.add(dot);
    }
    g.add(wfs);

    // ── 焦面像屏：左"无 AO" 右"有 AO" 并排对比 ─────────────────
    this.noAOCv = document.createElement('canvas');
    this.noAOCv.width = this.noAOCv.height = 160;
    this.noAOTex = new THREE.CanvasTexture(this.noAOCv);
    const scrA = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7),
      new THREE.MeshBasicMaterial({ map: this.noAOTex, side: THREE.DoubleSide }));
    scrA.position.set(-1.35, 0.1, 2.4); scrA.rotation.y = -0.3; g.add(scrA);
    this.aoCv = document.createElement('canvas');
    this.aoCv.width = this.aoCv.height = 160;
    this.aoTex = new THREE.CanvasTexture(this.aoCv);
    const scrB = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7),
      new THREE.MeshBasicMaterial({ map: this.aoTex, side: THREE.DoubleSide }));
    scrB.position.set(1.35, 0.1, 2.4); scrB.rotation.y = 0.3; g.add(scrB);

    // ── 光路：星光 → 大气（变皱）→ 可变形镜 → 焦点 ─────────────
    const beam = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 8.5, 0), new THREE.Vector3(0, 5.2, 0),
        new THREE.Vector3(0, 1.6, 0), new THREE.Vector3(0, 0.1, 2.4)]),
      MATS.beam.clone());
    beam.material.opacity = 0.4; g.add(beam);

    // ── 灯光 / 网格 ──────────────────────────────────────────────
    g.add(new THREE.HemisphereLight(0xb8c4d4, 0x101418, 0.8));
    const key = new THREE.DirectionalLight(0xfff2d8, 1.3);
    key.position.set(4, 8, 3); g.add(key);
    const grid = new THREE.GridHelper(20, 20, 0x1a2230, 0x10161e);
    grid.position.y = -0.4; g.add(grid);

    // ── 标签 ─────────────────────────────────────────────────────
    const L = U.LabelSys;
    L.add(ctx, 't6-star', '恒星<br><small>真正的点光源</small>',
      new THREE.Vector3(0, 8.5, 0), { dx: 130, dy: -50, color: '#fff2d8' });
    L.add(ctx, 't6-turb', '大气湍流层<br><small>把波前弄皱 → 星星眨眼</small>',
      new THREE.Vector3(2.2, 5.2, 0), { dx: 150, dy: 40, color: '#9fd8ff' });
    L.add(ctx, 't6-laser', '激光导星 589 nm<br><small>钠层 ~90 km</small>',
      new THREE.Vector3(-1.6, 4.6, 0), { dx: -160, dy: -40, color: '#ffd166' });
    L.add(ctx, 't6-dm', '可变形镜<br><small>1,377 驱动器 · 1.2 kHz</small>',
      new THREE.Vector3(1.5, 1.6, 0), { dx: 160, dy: -60, color: '#d8b25c' });
    L.add(ctx, 't6-img', '焦面成像<br><small>左：无 AO 糊 / 右：有 AO 锐</small>',
      new THREE.Vector3(0, 0.1, 2.4), { dx: 150, dy: 70, color: '#22d3ee' });

    // ── 相机 ─────────────────────────────────────────────────────
    const orb = ctx.orbit;
    orb.setHome(0.6, 1.05, 14, 0, 2.6, 0.5);

    this.st = { g, star, starGlow, turbLayers, laser, naLayer, dm, dmGeo, basePos, wfs, t: 0 };
    this.built = true; this.lastBeat = 0;
    this.drawImage();
    return this.st;
  },

  // 湍流噪声纹理（皱格 + 漂移）
  drawTurb() {
    const c = this.turbCv, ctx2 = c.getContext('2d');
    const W = c.width, H = c.height;
    ctx2.clearRect(0, 0, W, H);
    ctx2.strokeStyle = 'rgba(120,170,220,0.5)';
    ctx2.lineWidth = 2;
    const t = performance.now() / 1000;
    for (let i = 0; i < 10; i++) {
      ctx2.beginPath();
      for (let x = 0; x <= W; x += 8) {
        const y = (i + 0.5) * H / 10 +
          Math.sin(x / 22 + t * 1.5 + i * 1.7) * 9 * (0.4 + this.turb) +
          Math.sin(x / 7 + t * 2.3 + i) * 4 * (0.4 + this.turb);
        x === 0 ? ctx2.moveTo(x, y) : ctx2.lineTo(x, y);
      }
      ctx2.stroke();
    }
    this.turbTex.needsUpdate = true;
  },

  // 焦面像：无 AO = seeing 模糊盘；有 AO = 艾里斑
  drawImage() {
    const mk = (cv, tex, blurPx, sharp) => {
      const ctx2 = cv.getContext('2d');
      const W = cv.width, H = cv.height;
      ctx2.clearRect(0, 0, W, H);
      ctx2.fillStyle = '#07090e'; ctx2.fillRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2;
      ctx2.save();
      ctx2.filter = 'blur(' + blurPx.toFixed(1) + 'px)';
      const gr = ctx2.createRadialGradient(cx, cy, 0, cx, cy, sharp ? 14 : 60);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.35, 'rgba(255,240,200,0.9)');
      gr.addColorStop(1, 'rgba(255,240,200,0)');
      ctx2.fillStyle = gr;
      ctx2.beginPath(); ctx2.arc(cx, cy, sharp ? 14 : 60, 0, Math.PI * 2); ctx2.fill();
      ctx2.restore();
      // 艾里环（锐利时）
      if (sharp) {
        ctx2.strokeStyle = 'rgba(255,240,200,0.55)'; ctx2.lineWidth = 1.5;
        ctx2.beginPath(); ctx2.arc(cx, cy, 20, 0, Math.PI * 2); ctx2.stroke();
        ctx2.beginPath(); ctx2.arc(cx, cy, 30, 0, Math.PI * 2); ctx2.stroke();
      }
      tex.needsUpdate = true;
    };
    // seeing 越大，无 AO 越糊；有 AO 始终接近衍射极限
    mk(this.noAOCv, this.noAOTex, 8 + this.turb * 26, false);
    mk(this.aoCv, this.aoTex, this.aoOn ? 1.2 : 8 + this.turb * 26, this.aoOn);
  },

  // ── 面板（onEnter）──────────────────────────────────────────────
  onEnter(ctx) {
    const box = document.getElementById('pipelineBox');
    box.innerHTML = '';
    const mount = document.createElement('div'); mount.id = 'pipeMount';
    box.appendChild(mount);
    this.pipe = APP.PIPE.mount(mount, 't6');
    this.hud = document.createElement('div'); this.hud.className = 'tab-hud';
    box.appendChild(this.hud);
    this.renderPanel();
    this.applyState();
  },

  renderPanel() {
    const el = this.hud;
    el.innerHTML =
      '<div class="chip-row">' +
      '<button class="chip on" id="t6AOOn">✨ 打开 AO</button>' +
      '<button class="chip" id="t6AOOff">关闭 AO</button></div>' +
      '<div class="slider-row"><label>湍流强度 <b id="t6Turb">中等</b></label>' +
      '<input type="range" id="t6TurbSlider" min="0" max="100" step="1" value="50"></div>' +
      '<div class="t6-see" id="t6See"></div>';
    el.querySelector('#t6AOOn').addEventListener('click', () => {
      this.aoOn = true;
      el.querySelector('#t6AOOn').classList.add('on');
      el.querySelector('#t6AOOff').classList.remove('on');
      this.applyState();
    });
    el.querySelector('#t6AOOff').addEventListener('click', () => {
      this.aoOn = false;
      el.querySelector('#t6AOOff').classList.add('on');
      el.querySelector('#t6AOOn').classList.remove('on');
      this.applyState();
    });
    const sl = el.querySelector('#t6TurbSlider');
    sl.addEventListener('input', () => {
      this.turb = +sl.value / 100;
      const lbl = el.querySelector('#t6Turb');
      if (lbl) lbl.textContent = this.turb < 0.33 ? '弱' : this.turb < 0.66 ? '中等' : '强';
      this.applyState();
    });
  },

  applyState() {
    const seeing = 0.3 + this.turb * 1.2;                 // 角秒（示意读数）
    const aoRes = 0.02 + (1 - Math.min(1, this.turb)) * 0.03;
    const see = document.getElementById('t6See');
    if (see) see.innerHTML = 'seeing ≈ <b>' + seeing.toFixed(2) + '″</b>（无 AO）' +
      (this.aoOn ? ' → <b>' + aoRes.toFixed(3) + '″</b>（AO 后，接近衍射极限）' : ' → AO 关闭，保持模糊');
    this.drawImage();
    this.pipe.setAll({
      raw: '波前传感器每子孔径的<b>光斑质心位移</b><br>' +
           'SPHERE·SAXO：41×41 子孔径 · 1,377 驱动器 · 最高 1.2 kHz',
      eq: '质心偏移 ∝ 局部波前斜率<br>→ 拟合出驱动器<b>电压矩阵</b>（每秒解上千次线性方程组）',
      calc: 'VLT 8.2 m：seeing ~0.8″ ' + (this.aoOn
        ? '→ AO 后近红外 <b>0.02–0.05″</b>'
        : '→ AO 关闭，仍是 ' + seeing.toFixed(2) + '″ 的模糊盘'),
      result: '把恒星旁边的<b>系外行星直接拍出来</b><br>' +
              '直接成像自 2004 年 <b>2M1207b</b> 首张照片起；SPHERE 等仪器现为主力'
    });
    this._cur = { aoOn: this.aoOn, turb: this.turb, seeing, aoRes: this.aoOn ? aoRes : null };
  },

  update(dt, active) {
    if (!this.st || !active) return;
    const st = this.st;
    if (!st.laser || !st.wfs) return;   // 快速切页后的残影防护（见 build 异步重建）
    st.t += dt;
    const beat = (window.APP && APP.app) ? APP.app.beat : 2;
    if (beat !== this.lastBeat) {
      this.lastBeat = beat;
      if (beat === 1) APP.UI.setPanel(
        '<h3>✨ 星星为什么眨眼？</h3>' +
        '<p>大气湍流让空气密度不停抖动，星光被<b>折射得乱七八糟</b>——' +
        '落到地面就糊成一片（"视宁度" seeing）。</p>' +
        '<p>自适应光学：打一束激光到 90 km 的钠层造一颗"人造导星"，' +
        '测出畸变，再让<b>可变形镜</b>每秒变形上千次抵消它。</p>' +
        '<p>↓ 下一拍：开关 AO，看像点怎么从糊变锐。</p>');
    }
    // 湍流层漂移
    st.turbLayers.forEach((lay, i) => {
      lay.position.x = Math.sin(st.t * 0.25 + i * 2) * 1.2;
      lay.material.opacity = 0.2 + 0.25 * this.turb;
    });
    // 可变形镜：AO 开时顶点位移抵消畸变（视觉上镜面在 ripple）
    const pos = st.dmGeo.attributes.position;
    const arr = pos.array;
    const amp = this.aoOn ? 0.035 * this.turb : 0.004 * this.turb;
    for (let i = 0; i < arr.length; i += 3) {
      const bx = st.basePos[i], by = st.basePos[i + 1];
      const d = Math.sin(bx * 3.1 + st.t * 1.4) * Math.cos(by * 2.7 + st.t * 1.1) * amp +
                Math.sin(bx * 6.2 + by * 5.5 + st.t * 2.3) * amp * 0.4;
      arr[i + 2] = d;
    }
    pos.needsUpdate = true;
    st.dmGeo.computeVertexNormals();
    // 激光闪烁
    st.laser.material.opacity = 0.6 + 0.3 * Math.sin(st.t * 6);
    st.laser.visible = this.aoOn;
    st.laserTop.visible = this.aoOn;
    // 传感器子孔径闪烁（AO 开时"正在测量"）
    st.wfs.children.forEach((d, i) => {
      d.visible = this.aoOn;
      d.scale.setScalar(0.8 + 0.4 * Math.sin(st.t * 5 + i * 1.3));
    });
    // 恒星呼吸
    const s = 1 + 0.08 * Math.sin(st.t * 1.7);
    st.starGlow.scale.set(1.6 * s, 1.6 * s, 1);
  },

  reset() { if (this.st) this.st.t = 0; },

  dispose() {
    if (!this.st) return;
    const L = APP.U.LabelSys;
    ['t6-star', 't6-turb', 't6-laser', 't6-dm', 't6-img'].forEach(id => L.remove(null, id));
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
    return Object.assign({ tab: 't6-ao' }, this._cur || {});
  }
};
