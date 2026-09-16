// tab-t7-detector.js — T7 探测器：CCD 光电效应 + 桶列电荷转移 + QE 对比 + 光子雨（规格 §3 组四）
// 真实数字：CCD 1969 贝尔实验室；QE 80–90% vs 胶片 <5%；PMT 增益 ~10⁶；
// 流水线：900 电子 ÷ QE 0.9 = 1,000 光子 ÷ 1,000 s = 1 光子/秒。
'use strict';

APP.Tabs = APP.Tabs || {};

const DETECTORS = [
  { id: 'film', name: '胶片', qe: 0.04, qeTxt: '<5%', year: '1859–', note: '化学反应记光，大多数光子白白穿过' },
  { id: 'ccd', name: 'CCD', qe: 0.85, qeTxt: '80–90%', year: '1969', note: '光电效应：1 光子 → 1 电子（量子效率 80–90%）' },
  { id: 'pmt', name: 'PMT', qe: 0.25, qeTxt: '单光子计数', year: '1940s', note: '倍增级联把 1 个光子放大成 ~10⁶ 电子的可测脉冲' }
];

APP.Tabs['t7-detector'] = {
  built: false, st: null, pipe: null, hud: null, lastBeat: 0, _cur: null,
  det: DETECTORS[1], photons: 0, accT: 0,
  imgTex: null, imgCv: null, IMG_W: 48, IMG_H: 48, imgBuf: null,

  build(ctx) {
    if (this.built) return this.st;
    const { scene, MATS } = ctx;
    const U = APP.U;
    const g = new THREE.Group(); g.name = 't7-detector'; scene.add(g);
    const gold2 = MATS.gold.clone(); gold2.side = THREE.DoubleSide;

    // ── CCD 剖面（右侧）：硅基底 + 像素阵列 + 读出寄存器 ────────
    const ccdGroup = new THREE.Group(); ccdGroup.position.set(2.2, 0, 0); g.add(ccdGroup);
    const silicon = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.35, 2.6),
      new THREE.MeshStandardMaterial({ color: 0x2a3a4a, metalness: 0.4, roughness: 0.3 }));
    silicon.position.y = 0.5; ccdGroup.add(silicon);
    // 像素阵列（顶部小格）
    for (let i = 0; i < 8; i++) for (let j = 0; j < 6; j++) {
      const px = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.06, 0.36),
        new THREE.MeshStandardMaterial({ color: 0x141a24, metalness: 0.5, roughness: 0.4 }));
      px.position.set(-1.4 + i * 0.4, 0.72, -1.0 + j * 0.4);
      px.userData = { i, j };
      ccdGroup.add(px);
    }
    // 读出寄存器（右侧竖直条）
    const reg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 2.6),
      new THREE.MeshStandardMaterial({ color: 0x8a93a0, metalness: 0.9, roughness: 0.25 }));
    reg.position.set(1.85, 0.72, 0); ccdGroup.add(reg);
    // ADC 盒
    const adc = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), MATS.dark);
    adc.position.set(2.9, 0.6, 0); ccdGroup.add(adc);

    // ── PMT（左侧）：光阴极 → 倍增级 → 阳极 ─────────────────────
    const pmt = new THREE.Group(); pmt.position.set(-3.4, 0, 0); g.add(pmt);
    const pmtTube = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 2.4, 24),
      new THREE.MeshStandardMaterial({ color: 0x1a2230, metalness: 0.6, roughness: 0.4,
        transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
    pmtTube.position.y = 1.2; pmt.add(pmtTube);
    const cathode = new THREE.Mesh(new THREE.CircleGeometry(0.4, 24), gold2);
    cathode.position.y = 2.3; cathode.rotation.x = -Math.PI / 2; pmt.add(cathode);
    const dynodes = [];
    for (let i = 0; i < 5; i++) {
      const dyn = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.16),
        new THREE.MeshStandardMaterial({ color: 0x8a93a0, metalness: 0.95, roughness: 0.2 }));
      dyn.position.set((i % 2 ? 0.14 : -0.14), 1.9 - i * 0.36, 0);
      dyn.rotation.z = (i % 2 ? -0.5 : 0.5);
      pmt.add(dyn); dynodes.push(dyn);
    }
    const anode = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: 0xd8b25c, metalness: 1, roughness: 0.15 }));
    anode.position.y = 0.25; pmt.add(anode);

    // ── 光子雨：落下的光子 + 累积成像屏 ──────────────────────────
    const rainGroup = new THREE.Group(); g.add(rainGroup);
    const rain = [];
    for (let i = 0; i < 40; i++) {
      const ph = new THREE.Sprite(MATS.glow.clone());
      ph.scale.set(0.12, 0.12, 1);
      ph.visible = false;
      rainGroup.add(ph);
      rain.push({ sp: ph, x: 0, y: 0, v: 0, on: false });
    }
    // 累积图像屏（CCD 上方的"照片"）
    this.imgCv = document.createElement('canvas');
    this.imgCv.width = this.IMG_W; this.imgCv.height = this.IMG_H;
    this.imgBuf = new Float32Array(this.IMG_W * this.IMG_H);
    this.imgTex = new THREE.CanvasTexture(this.imgCv);
    const imgPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4),
      new THREE.MeshBasicMaterial({ map: this.imgTex, side: THREE.DoubleSide }));
    imgPlane.position.set(2.2, 2.4, 0); imgPlane.rotation.x = -Math.PI / 2.3; g.add(imgPlane);

    // ── 灯光 / 网格 ──────────────────────────────────────────────
    g.add(new THREE.HemisphereLight(0xb8c4d4, 0x101418, 0.8));
    const key = new THREE.DirectionalLight(0xfff2d8, 1.2);
    key.position.set(3, 8, 3); g.add(key);
    const grid = new THREE.GridHelper(20, 20, 0x1a2230, 0x10161e);
    grid.position.y = -0.3; g.add(grid);

    // ── 标签 ─────────────────────────────────────────────────────
    const L = U.LabelSys;
    L.add(ctx, 't7-ccd', 'CCD 硅基底<br><small>光子 → 电子（光电效应）</small>',
      new THREE.Vector3(2.2, 1.1, 1.5), { dx: 150, dy: -60, color: '#d8b25c' });
    L.add(ctx, 't7-reg', '读出寄存器<br><small>电荷"桶列"转移</small>',
      new THREE.Vector3(4.05, 0.72, 0), { dx: 140, dy: 40, color: '#8a93a0' });
    L.add(ctx, 't7-adc', '模数转换<br><small>电子数 → 整数</small>',
      new THREE.Vector3(5.1, 0.6, 0), { dx: 140, dy: -70, color: '#f59e0b' });
    L.add(ctx, 't7-pmt', '光电倍增管<br><small>1 光子 → ~10⁶ 电子脉冲</small>',
      new THREE.Vector3(-3.4, 2.6, 0), { dx: -160, dy: 50, color: '#d8b25c' });
    L.add(ctx, 't7-img', '光子雨累积成图像<br><small>亮度 = 光子计数</small>',
      new THREE.Vector3(2.2, 3.1, 0.4), { dx: 160, dy: 70, color: '#4cc9f0' });

    // ── 相机 ─────────────────────────────────────────────────────
    const orb = ctx.orbit;
    orb.setHome(0.5, 1.1, 13, 0, 0.8, 0);

    this.st = { g, rain, rainGroup, ccdGroup, pmt, dynodes, imgPlane, adc, t: 0 };
    this.built = true; this.lastBeat = 0;
    this.drawImage();
    return this.st;
  },

  // 累积图像：少量光子 = 噪声斑点；多光子 = 清晰星像（高斯团）
  drawImage() {
    const c = this.imgCv, ctx2 = c.getContext('2d');
    const W = c.width, H = c.height;
    const img = ctx2.createImageData(W, H);
    const max = Math.max(1, ...this.imgBuf);
    const cx = W / 2, cy = H / 2;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      const v = Math.min(1, this.imgBuf[idx] / Math.max(4, max * 0.25));
      const signal = Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * 6 * 6));
      // 显示：累积计数（含噪声）× 真实星像分布
      const lum = Math.min(1, v * 0.7 + signal * Math.min(1, this.photons / 500) * 0.9);
      const i4 = idx * 4;
      img.data[i4] = lum * 255;
      img.data[i4 + 1] = lum * 240;
      img.data[i4 + 2] = lum * 200;
      img.data[i4 + 3] = 255;
    }
    ctx2.putImageData(img, 0, 0);
    this.imgTex.needsUpdate = true;
  },

  // ── 面板（onEnter）──────────────────────────────────────────────
  onEnter(ctx) {
    const box = document.getElementById('pipelineBox');
    box.innerHTML = '';
    const mount = document.createElement('div'); mount.id = 'pipeMount';
    box.appendChild(mount);
    this.pipe = APP.PIPE.mount(mount, 't7');
    this.hud = document.createElement('div'); this.hud.className = 'tab-hud';
    box.appendChild(this.hud);
    this.renderPanel();
    this.applyState();
  },

  renderPanel() {
    const el = this.hud;
    el.innerHTML =
      '<div class="chip-row" id="t7Dets">' +
      DETECTORS.map((d, i) => '<button class="chip' + (i === 1 ? ' on' : '') +
        '" data-i="' + i + '">' + d.name + ' · ' + d.qeTxt + '</button>').join('') + '</div>' +
      '<div class="t7-note" id="t7Note"></div>';
    el.querySelectorAll('#t7Dets .chip').forEach(c =>
      c.addEventListener('click', () => {
        this.det = DETECTORS[+c.dataset.i];
        el.querySelectorAll('#t7Dets .chip').forEach(x => x.classList.toggle('on', x === c));
        this.applyState();
      }));
  },

  applyState() {
    const note = document.getElementById('t7Note');
    if (note) note.innerHTML = '<b>' + this.det.name + '</b>（' + this.det.year +
      '）：' + this.det.note + (this.det.id === 'ccd'
        ? '<br>1969 年贝尔实验室发明；QE ' + this.det.qeTxt + ' vs 胶片 <5%'
        : this.det.id === 'pmt'
        ? '<br>光阴极 → 倍增级联 → 阳极；单光子计数'
        : '<br>已被 CCD 取代：QE 低、非线性、不可数字化');
    this.pipe.setAll({
      raw: '每像素电荷包的<b>电子数</b>（模数转换后的整数）<br>' +
           '当前探测器：' + this.det.name + '，QE ' + this.det.qeTxt,
      eq: '光子数 = (N<sub>counts</sub> − N<sub>bias</sub> − N<sub>dark</sub>) / QE<br>' +
          '流量 F = 光子数 / (t<sub>exp</sub> · A)',
      calc: '① 先减本底与暗流；② 除以 QE 把电子换回光子；③ 除以曝光时间<br>' +
            '1,000 s 曝光、QE=0.9、收到 <b>900 个信号电子</b><br>' +
            '→ 光子数 = 900 / 0.9 = <b>1,000 个光子</b><br>' +
            '→ 流量 = 1,000 / 1,000 s = <b>1 光子/秒</b>',
      result: '星等 m = −2.5·log₁₀(F/F₀) 换算成亮度<br>' +
              '开普勒/TESS 用同样计数法测出 6,000+ 颗系外行星<br>' +
              '凌星深度：木星大小 ~1%（10⁴ ppm），地球大小 ~0.01%（100 ppm）'
    });
    this._cur = { det: this.det.id, qe: this.det.qe, photons: this.photons };
  },

  update(dt, active) {
    if (!this.st || !active) return;
    const st = this.st; st.t += dt;
    const beat = (window.APP && APP.app) ? APP.app.beat : 2;
    if (beat !== this.lastBeat) {
      this.lastBeat = beat;
      if (beat === 1) APP.UI.setPanel(
        '<h3>📷 光到了焦点怎么变数字？</h3>' +
        '<p>光子打在 CCD 的硅晶体上，把电子撞出来（<b>光电效应</b>）——' +
        '一个光子换一个电子。电子被关在像素"桶"里，再一桶桶传到读出寄存器，' +
        '数成整数。</p>' +
        '<p>量子效率 QE：CCD 能把 80–90% 的光子变成电子，胶片不到 5%。</p>' +
        '<p>↓ 下一拍：切换探测器，看光子雨怎么累积成图像。</p>');
    }
    // ── 光子雨：按 QE 概率"转化"，落下并累积 ─────────────────────
    this.accT += dt;
    const rate = 26 * this.det.qe + 2;                    // 每秒发射光子数（含未转化的）
    while (this.accT > 1 / rate) {
      this.accT -= 1 / rate;
      const free = st.rain.find(r => !r.on);
      if (!free) break;
      // 目标：落在累积屏上的随机位置（按高斯分布造星像）
      let px, py;
      do {
        px = (Math.random() - 0.5) * 2.2;
        py = (Math.random() - 0.5) * 2.2;
      } while (Math.exp(-(px * px + py * py) / (2 * 0.7 * 0.7)) < Math.random() * 0.6);
      free.on = true;
      free.x = px; free.y = py;
      free.v = 0;
      free.sp.visible = true;
      free.sp.position.set(px, 4.2, py);
      free.sp.material.color.setHex(Math.random() < this.det.qe ? 0xfff2d8 : 0x4a5462);
      free.converted = Math.random() < this.det.qe;
    }
    for (const r of st.rain) {
      if (!r.on) continue;
      r.v += 6 * dt;
      r.sp.position.y -= r.v * dt;
      if (r.sp.position.y <= 0.5) {
        r.on = false; r.sp.visible = false;
        if (r.converted) {
          // 累积到图像缓冲（屏在 2.2,2.4 处，局部坐标换算）
          const u = Math.floor((r.x / 2.4 + 0.5) * this.IMG_W);
          const v = Math.floor((r.y / 2.4 + 0.5) * this.IMG_H);
          if (u >= 0 && u < this.IMG_W && v >= 0 && v < this.IMG_H) {
            this.imgBuf[v * this.IMG_W + u] += 1;
            this.photons++;
            if (this.photons % 6 === 0) this.drawImage();
          }
        }
      }
    }
    // PMT 倍增级闪烁（示意级联）
    st.dynodes.forEach((d, i) => {
      d.material.emissive = d.material.emissive || new THREE.Color();
      d.material.emissive.setHex(0x222222);
      d.material.emissiveIntensity = 0.5 + 0.5 * Math.sin(st.t * 8 + i * 0.9);
    });
    st.pmt.visible = this.det.id === 'pmt';
    st.ccdGroup.visible = this.det.id !== 'pmt' || true;
    // 电荷转移动画：像素沿行向读出寄存器"流"（亮带扫描）
    const sweep = (st.t * 0.8) % 1;
    st.ccdGroup.children.forEach(ch => {
      if (ch.userData && ch.userData.i !== undefined) {
        const d = Math.abs(ch.userData.i / 8 - sweep);
        ch.material.emissive = ch.material.emissive || new THREE.Color(0);
        ch.material.emissive.setHex(0x1a2a3a);
        ch.material.emissiveIntensity = Math.max(0, 1 - d * 6);
      }
    });
  },

  reset() {
    if (this.st) this.st.t = 0;
    this.photons = 0;
    if (this.imgBuf) this.imgBuf.fill(0);
    this.drawImage();
  },

  dispose() {
    if (!this.st) return;
    const L = APP.U.LabelSys;
    ['t7-ccd', 't7-reg', 't7-adc', 't7-pmt', 't7-img'].forEach(id => L.remove(null, id));
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
    return Object.assign({ tab: 't7-detector' }, this._cur || {});
  }
};
