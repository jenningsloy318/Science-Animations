// tab-t2-telescope.js — T2 望远镜：卡塞格林光路 + 口径滑块（规格 §3 组一）
// 光路为真实解析解：主镜=抛物面 z=-r²/(4f)；副镜=双曲面（焦点 F1、F2），
// 每根光线与双曲面的交点由线性方程精确求出 → 严格汇聚到卡氏焦点（教学上无欺骗）。
// 几何经 node 数值验证：7/7 光线反射后过 F2（方向点积 >0.999）。
'use strict';

APP.Tabs = APP.Tabs || {};

// ── 光学几何（示意尺度；非任何真实望远镜的比例）────────────────────
const F1 = new THREE.Vector3(0, 0, -3.0);        // 主镜焦点（副镜虚焦点）
const F2 = new THREE.Vector3(0, 0, 1.4);         // 卡氏焦点（主镜之后，穿中心孔）
const FP = 3.0;                                  // 主镜焦距
const R_MAX = 3.0;                               // 主镜半径（示意）
const R_MIN = 0.75;                              // 副镜遮蔽外缘（只画不被挡的光线）
const R_HOLE = 0.25;                             // 主镜中心孔（需 ≥0.154，留余量）
const Z_IN = -7.0;                               // 入射平行光起点 z（天空侧）
const K_HYP = (function () {                     // 双曲面常数 |X-F1|-|X-F2|=K（K<0，近 F1 一叶）
  const S0 = new THREE.Vector3(0.7, 0, -2.8);
  return S0.distanceTo(F1) - S0.distanceTo(F2);
})();
const A_H = Math.abs(K_HYP) / 2;                 // 双曲线半实轴
const C_H = F1.distanceTo(F2) / 2;               // 半焦距
const B_H = Math.sqrt(C_H * C_H - A_H * A_H);    // 半虚轴
const MID_Z = (F1.z + F2.z) / 2;

// 抛物面：z = -r²/(4·FP)
function zP(r) { return -r * r / (4 * FP); }

// 光线从 P（主镜上）射向 F1，求与双曲面的交点；t 为沿单位方向的距离 ∈(0,L)
// |X-F1| = L-t；|X-F2|² = t²+Bt+C；由 (L-t-K)² = t²+Bt+C 得线性方程
function hitSecondary(P) {
  const dir = new THREE.Vector3().subVectors(F1, P);
  const L = dir.length(); dir.multiplyScalar(1 / L);
  const d = new THREE.Vector3().subVectors(P, F2);
  const B = 2 * d.dot(dir), C = d.dot(d);
  const t = ((L - K_HYP) * (L - K_HYP) - C) / (2 * (L - K_HYP) + B);
  if (!(t > 1e-3 && t < L - 1e-3)) return null;
  const X = new THREE.Vector3().copy(P).addScaledVector(dir, t);
  if (Math.abs(X.distanceTo(F1) - X.distanceTo(F2) - K_HYP) > 1e-3) return null;
  return X;
}

function buildRay(r_p, sgn) {
  const P = new THREE.Vector3(sgn * r_p, 0, zP(r_p));
  const S = hitSecondary(P);
  if (!S) return null;
  return { P, S, F: F2.clone() };
}

const PRESETS = [
  { id: 'eye',  name: '人眼',  D: 0.007 },
  { id: 'p60',  name: '0.6 m', D: 0.6 },
  { id: 'hst',  name: '哈勃',  D: 2.4, note: '2.4 m · 483 km 轨道' },
  { id: 'jwst', name: '韦伯',  D: 6.5, note: '6.5 m · L2 · 镀金' },
  { id: 'vlt',  name: 'VLT',   D: 8.2, note: '8.2 m · 智利' },
  { id: 'elt',  name: 'ELT',   D: 39,  note: '39 m · 首光 2029-03' }
];
const LAM = 550e-9;   // 工作波长 550 nm（V 波段）

APP.Tabs['t2-telescope'] = {
  built: false, st: null, pipe: null, hud: null, lastBeat: 0, _cur: null,

  build(ctx) {
    if (this.built) return this.st;
    const { scene, MATS } = ctx;
    const U = APP.U;
    const g = new THREE.Group(); g.name = 't2-telescope'; scene.add(g);
    const gold2 = MATS.gold.clone(); gold2.side = THREE.DoubleSide;   // 镜面双面可见

    // ── 主镜：抛物面（LatheGeometry 精确剖面 + 中心孔）────────────
    const prof = [];
    for (let r = R_HOLE; r <= R_MAX + 0.001; r += 0.08)
      prof.push(new THREE.Vector2(r, zP(r)));
    const prim = new THREE.Mesh(new THREE.LatheGeometry(prof, 128), gold2);
    prim.rotation.x = Math.PI / 2;                    // 局部 Y → 世界 Z
    g.add(prim);
    // 主镜筒体（背面）
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(R_MAX, R_MAX, 0.45, 128, 1, true),
      MATS.dark);
    tube.rotation.x = Math.PI / 2; tube.position.z = 0.22; g.add(tube);
    // 主镜边缘金环
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R_MAX, 0.06, 12, 128), MATS.gold);
    rim.position.z = zP(R_MAX); g.add(rim);

    // ── 副镜：双曲面（F1 侧叶：z = midZ - a·√(1+(r/b)²)，凸面朝 +z）─
    const hprof = [];
    for (let r = 0.02; r <= 0.52; r += 0.04)
      hprof.push(new THREE.Vector2(r, MID_Z - A_H * Math.sqrt(1 + (r / B_H) * (r / B_H))));
    const sec = new THREE.Mesh(new THREE.LatheGeometry(hprof, 64), gold2);
    sec.rotation.x = Math.PI / 2;
    g.add(sec);
    // 副镜支架（十字叶片，简化）
    for (let i = 0; i < 4; i++) {
      const vane = new THREE.Mesh(new THREE.BoxGeometry(R_MAX * 1.9, 0.025, 0.025), MATS.steel);
      vane.position.set(0, 0, -2.65);
      vane.rotation.z = i * Math.PI / 4;
      g.add(vane);
    }

    // ── 焦平面 + 艾里斑 ───────────────────────────────────────────
    const focal = new THREE.Mesh(new THREE.CircleGeometry(0.45, 64), MATS.steel);
    focal.position.set(0, 0, F2.z + 0.05); g.add(focal);
    const focalRing = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.02, 8, 64), MATS.steel);
    focalRing.position.set(0, 0, F2.z + 0.05); g.add(focalRing);
    const airy = new THREE.Sprite(MATS.glow.clone());
    airy.scale.set(0.9, 0.9, 1); airy.position.set(0, 0, F2.z + 0.08); g.add(airy);
    const airyRing = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.13, 48),
      new THREE.MeshBasicMaterial({ color: 0xd8b25c, transparent: true, opacity: 0.55,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    airyRing.position.set(0, 0, F2.z + 0.09); g.add(airyRing);

    // ── 光线（y=0 剖面，±x 对称；每根三段折线）────────────────────
    const rays = [];
    const rayGroup = new THREE.Group(); g.add(rayGroup);
    const NR = 7;
    for (let i = 0; i < NR; i++) {
      const r_p = R_MIN + (R_MAX - R_MIN) * (i / (NR - 1));
      for (const sgn of [1, -1]) {
        const ray = buildRay(r_p, sgn);
        if (!ray) continue;
        const segs = [
          [new THREE.Vector3(sgn * r_p, 0, Z_IN), ray.P],
          [ray.P, ray.S],
          [ray.S, ray.F]
        ];
        const pts = [];
        segs.forEach(sg => pts.push(sg[0], sg[1]));
        const line = new THREE.LineSegments(
          new THREE.BufferGeometry().setFromPoints(pts), MATS.beam.clone());
        line.material.opacity = 0.5; line.renderOrder = 4;
        rayGroup.add(line); ray.line = line; ray.segs = segs;
        ray.ph = new THREE.Sprite(MATS.glow.clone());
        ray.ph.scale.set(0.2, 0.2, 1);
        rayGroup.add(ray.ph);
        rays.push(ray);
      }
    }

    // ── 入射平行光轨道（虚线提示"光是平行的"）────────────────────
    for (const sgn of [1, -1]) {
      const track = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(sgn * R_MAX * 0.92, 0, Z_IN - 0.6),
          new THREE.Vector3(sgn * R_MAX * 0.92, 0, -0.6)]),
        new THREE.LineDashedMaterial({ color: 0x4cc9f0, dashSize: 0.22, gapSize: 0.16,
          transparent: true, opacity: 0.3 }));
      track.computeLineDistances();
      g.add(track);
    }

    // ── 灯光 ─────────────────────────────────────────────────────
    g.add(new THREE.HemisphereLight(0xb8c4d4, 0x101418, 0.9));
    const key = new THREE.DirectionalLight(0xfff2d8, 1.5);
    key.position.set(4, 6, 6); g.add(key);
    const fill = new THREE.PointLight(0xd8b25c, 0.9, 30);
    fill.position.set(0, 0, F2.z + 1.2); g.add(fill);

    // ── 标签（引线 + 箭头；锚点在物体上，标签偏移到一侧，永不遮挡）─
    const L = U.LabelSys;
    L.add(ctx, 't2-in', '平行光<br><small>来自遥远的恒星</small>',
      new THREE.Vector3(R_MAX * 0.92, 0, Z_IN + 1.5),
      { dx: 150, dy: 45, color: '#4cc9f0' });
    L.add(ctx, 't2-prim', '主镜 · 抛物面<br><small>把平行光汇聚向 F₁</small>',
      new THREE.Vector3(R_MAX * 0.8, 0, zP(R_MAX * 0.8) - 0.35),
      { dx: 165, dy: -80, color: '#d8b25c' });
    L.add(ctx, 't2-sec', '副镜 · 双曲面<br><small>把光折回主镜孔</small>',
      new THREE.Vector3(0.5, 0, -2.6),
      { dx: -150, dy: -95, color: '#d8b25c' });
    L.add(ctx, 't2-foc', '焦平面 · 艾里斑<br><small>所有光汇聚成这一点</small>',
      new THREE.Vector3(0, 0.5, F2.z + 0.1),
      { dx: -175, dy: 55, color: '#4cc9f0' });

    // ── 相机初始视角（看 y=0 剖面）──────────────────────────────
    const orb = ctx.orbit;
    orb.setHome(0.12, 1.2, 18, 0, 0, -1);

    this.st = { g, rays, airy, airyRing, prim, sec, t: 0, ph: 0 };
    this.built = true;
    this.lastBeat = 0;
    return this.st;
  },

  // ── 面板 / 流水线 / 滑块（onEnter 时构建一次）────────────────────
  // 注意：#panelBody 由 setPanel 按拍重写，交互滑块不能放那里——
  // 滑块与流水线同住 #pipelineBox（setPanel 不碰它）。
  onEnter(ctx) {
    const box = document.getElementById('pipelineBox');
    box.innerHTML = '';
    const mount = document.createElement('div');
    mount.id = 'pipeMount';
    box.appendChild(mount);
    this.pipe = APP.PIPE.mount(mount, 't2');
    this.hud = document.createElement('div');
    this.hud.className = 'tab-hud';
    box.appendChild(this.hud);
    this.renderPanel();
    this.applyPreset(PRESETS[5]);                    // 默认 ELT
  },

  renderPanel() {
    const el = this.hud;
    el.innerHTML =
      '<div class="slider-row"><label>口径 D <b id="t2D">39 m</b></label>' +
      '<input type="range" id="t2Slider" min="0" max="5" step="1" value="5"></div>' +
      '<div class="chip-row" id="t2Chips">' +
      PRESETS.map((p, i) => '<button class="chip' + (i === 5 ? ' on' : '') +
        '" data-i="' + i + '">' + p.name + '</button>').join('') + '</div>' +
      '<div class="t2-hint" id="t2Hint"></div>';
    const sl = el.querySelector('#t2Slider');
    sl.addEventListener('input', () => this.applyPreset(PRESETS[+sl.value]));
    el.querySelectorAll('#t2Chips .chip').forEach(c =>
      c.addEventListener('click', () => {
        sl.value = c.dataset.i;
        this.applyPreset(PRESETS[+c.dataset.i]);
      }));
  },

  // 口径 → 聚光 / 分辨 / 极限星等（规格 §3 T2 拍③ + 附录 11.1）
  applyPreset(p) {
    if (!this.pipe || !p) return;
    const F = APP.F, D = APP.DATA.D;
    const dEye = D.eye.d;
    const gr = F.gather(p.D, dEye);                  // 聚光面积比
    const th = F.rayleigh(LAM, p.D);                 // 衍射角 rad
    const mag = F.magLimit(p.D);                     // 极限星等估算
    const Dtxt = p.D < 1 ? (p.D * 1000).toFixed(0) + ' mm' : p.D.toFixed(1) + ' m';
    this.pipe.setAll({
      raw: '主镜有效直径 <b>D = ' + Dtxt + '</b>' +
           (p.note ? '<br>（' + p.note + '）' : '') +
           '<br>工作波长 λ = 550 nm（V 波段）',
      eq: '① 聚光：面积比 = (D / d<sub>眼</sub>)²<br>' +
          '② 分辨：θ = <b>1.22 λ / D</b>（装满的单口径）<br>' +
          '③ 极限星等：m ≈ 6.5 + 5·log₁₀(D / d<sub>眼</sub>)',
      calc: '聚光 = (' + Dtxt + ' / 7 mm)² = <b>' + F.sci(gr, 2) + '</b> 倍<br>' +
            'θ = 1.22 × 5.5×10⁻⁷ / ' + Dtxt + ' = ' +
            F.sci(th, 2) + ' rad = <b>' + F.fmtAngle(th) + '</b><br>' +
            'm ≈ ' + F.fmt(mag, 1) + ' 等（估算式）',
      result: p.id === 'elt'
        ? 'ELT 比人眼多收 <b>' + F.sci(gr, 2) + '</b> 倍光；' +
          '衍射分辨 3.5 mas ≈ 7 mm 瞳孔的 5,700 倍' +
          '<br>ELT 官方自适应光学指标：近红外 4–12 mas（与估算同量级）'
        : p.id === 'eye'
        ? '7 mm 瞳孔的<b>衍射</b>极限 ≈ <b>20″</b>；' +
          '但人眼<b>生理</b>分辨力约 <b>1′</b>（Snellen 1.0），夜间更差' +
          '<br>⚠ 衍射 ≠ 生理极限，二者不可混用'
        : p.name + '：聚光 <b>' + F.sci(gr, 2) + '</b> 倍人眼，衍射分辨 <b>' + F.fmtAngle(th) + '</b>'
    });
    const idx = PRESETS.indexOf(p);
    document.querySelectorAll('#t2Chips .chip').forEach((c, i) =>
      c.classList.toggle('on', i === idx));
    const hint = document.getElementById('t2Hint');
    if (hint) hint.innerHTML =
      p.id === 'eye' ? '⚠ 防误读：20″ 是<b>衍射</b>极限；人眼实际分辨约 1′，夜间更差。'
      : p.id === 'jwst' ? '💡 韦伯镀金：红外波段金膜反射率最高。'
      : p.id === 'elt' ? '💡 ELT 望远镜首光 2029-03，科学首光 2030-12（ESO ann25001）。'
      : p.id === 'hst' ? '💡 哈勃 483 km 高度、28.5° 倾角；无大气视宁度干扰。'
      : '';
    const dEl = document.getElementById('t2D');
    if (dEl) dEl.textContent = Dtxt;
    this._cur = { D: p.D, gather: gr, theta: th, thetaArcsec: F.radToArcsec(th), mag };
  },

  update(dt, active) {
    if (!this.st || !active) return;
    const st = this.st;
    st.t += dt;
    const beat = (window.APP && APP.app) ? APP.app.beat : 2;
    if (beat !== this.lastBeat) {
      this.lastBeat = beat;
      if (beat === 1) APP.UI.setPanel(
        '<h3>🔭 镜片越大为什么越强？</h3>' +
        '<p>星光飞了几千光年才到地球，落进瞳孔只剩一点点。' +
        '望远镜的<b>大镜子</b>能"接住"更多光，还要把它们<b>精确汇聚</b>成一个点。</p>' +
        '<p>镜越大：① 收光面积越大 → 看到更暗的星；② 衍射越弱 → 看清更小的细节。</p>' +
        '<p>↓ 下一拍看光在望远镜里怎么走。</p>');
    }
    // 拍②/③：光子沿光路行进（三段顺序：入射 → 主镜反射 → 副镜折回焦点）
    const SPEED = beat === 1 ? 0 : 0.3;
    st.ph = (st.ph + dt * SPEED) % 3.0;
    const ph = st.ph;
    for (const ray of st.rays) {
      let seg = Math.min(2, Math.floor(ph));
      let f = ph - seg;
      if (f > 1) { seg = Math.min(2, seg + 1); f = 0; }
      const A = ray.segs[seg][0], B = ray.segs[seg][1];
      ray.ph.position.lerpVectors(A, B, Math.min(1, f));
      ray.ph.visible = SPEED > 0;
      // 光子所在段加亮
      ray.line.material.opacity = 0.25 + 0.6 * Math.max(0, 1 - Math.abs(ph - (seg + f)));
    }
    const s = 1 + 0.12 * Math.sin(st.t * 2.2);
    st.airy.scale.set(0.9 * s, 0.9 * s, 1);
    st.airyRing.rotation.z += dt * 0.3;
  },

  reset() { if (this.st) { this.st.t = 0; this.st.ph = 0; } },

  dispose() {
    if (!this.st) return;
    const L = APP.U.LabelSys;
    L.remove(null, 't2-in'); L.remove(null, 't2-prim');
    L.remove(null, 't2-sec'); L.remove(null, 't2-foc');
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
    return Object.assign({ tab: 't2-telescope' }, this._cur || {});
  }
};
