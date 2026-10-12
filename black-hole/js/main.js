// main.js — Gargantua：实时 Schwarzschild 测地线渲染器
// 视角：拖拽旋转 / 滚轮缩放 / 双击复位；功能按钮 = 相机飞行 + 物理开关 + 讲解
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gl');
  const ERRS = [];
  window.addEventListener('error', e => ERRS.push(e.message + ' @' + e.lineno));
  window.__errs = ERRS;

  // ── 渲染器（低内部分辨率 + CSS 拉伸 = 测地线积分的性能策略）────
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const U = {
    uRes:       { value: new THREE.Vector2(1, 1) },
    uTime:      { value: 0 },
    uCamPos:    { value: new THREE.Vector3(0, 2, 16) },
    uCamRight:  { value: new THREE.Vector3(1, 0, 0) },
    uCamUp:     { value: new THREE.Vector3(0, 1, 0) },
    uCamFwd:    { value: new THREE.Vector3(0, 0, -1) },
    uTanHalfFov:{ value: Math.tan(55 * Math.PI / 360) },
    uAspect:    { value: 1 },
    uLensing:   { value: 1 },
    uDoppler:   { value: 1 },
    uExposure:  { value: 1.35 },
    uSteps:     { value: 320 },
    uEscR:      { value: 40 },
    uDiskGain:  { value: 1.0 }
  };
  const mat = new THREE.ShaderMaterial({
    vertexShader: BH_GLSL.vert, fragmentShader: BH_GLSL.frag, uniforms: U });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));

  // ── 相机状态（球坐标，lookAt 原点）────────────────────────────
  const view = { az: 1.25, pol: 1.33, dist: 25 };        // 默认：斜上方经典视角（盘外缘之外）
  const HOME = { ...view };
  const QUALITY = {
    low:  { scale: 0.45, steps: 190 },
    mid:  { scale: 0.68, steps: 320 },
    high: { scale: 0.9,  steps: 440 }
  };
  let quality = 'mid';
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const s = QUALITY[quality].scale * dpr;
    renderer.setSize(Math.round(w * s), Math.round(h * s), false);
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    U.uRes.value.set(w, h);
    U.uAspect.value = w / h;
    U.uSteps.value = QUALITY[quality].steps;
    U.uEscR.value = Math.max(40, view.dist * 1.25);
  }
  window.addEventListener('resize', resize);

  function applyCamera() {
    const { az, pol, dist } = view;
    const sp = Math.sin(pol), cp = Math.cos(pol);
    U.uCamPos.value.set(dist * sp * Math.cos(az), dist * cp, dist * sp * Math.sin(az));
    const pos = U.uCamPos.value;
    const fwd = pos.clone().multiplyScalar(-1).normalize();      // lookAt 原点
    const right = fwd.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
    const up = right.clone().cross(fwd).normalize();
    U.uCamFwd.value.copy(fwd);
    U.uCamRight.value.copy(right);
    U.uCamUp.value.copy(up);
    U.uEscR.value = Math.max(40, dist * 1.25);
  }

  // ── 轨道交互（拖拽 / 滚轮 / 双击 / 双指）─────────────────────
  let drag = null;
  canvas.addEventListener('pointerdown', e => {
    drag = { x: e.clientX, y: e.clientY, moved: 0, t: performance.now() };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    drag.x = e.clientX; drag.y = e.clientY;
    view.az -= dx * 0.005;
    view.pol = Math.min(Math.PI - 0.08, Math.max(0.08, view.pol - dy * 0.005));
    cancelFly();
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    view.dist = Math.min(60, Math.max(5.0, view.dist * Math.exp(e.deltaY * 0.001)));
    cancelFly();
  }, { passive: false });
  canvas.addEventListener('dblclick', () => flyTo(HOME));

  // ── 相机飞行（缓动补间，功能按钮的核心）─────────────────────
  let fly = null;
  function cancelFly() { fly = null; }
  function flyTo(target, dur) {
    let daz = target.az - view.az;
    daz = ((daz + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; // 最短路径
    fly = { from: { ...view }, to: { ...target, az: view.az + daz }, t: 0, dur: dur || 1.1 };
  }

  // ── 物理开关（平滑过渡 uniform）──────────────────────────────
  // ── 物理开关（平滑过渡 uniform）──────────────────────────────
  const phys = { lensing: 1, doppler: 1 };
  function setPhys(key, on) {
    phys[key] = on ? 1 : 0;
    const uni = key === 'lensing' ? U.uLensing : U.uDoppler;   // 存 uniform 引用，不能存数值
    tweens.push({ uni, from: uni.value, to: on ? 1 : 0, t: 0, dur: 0.45 });
    updatePhysChips();
  }
  function updatePhysChips() {
    const dict = BH_I18N[curLang] || BH_I18N.zh;
    document.querySelectorAll('[data-phys]').forEach(c => {
      const key = c.dataset.phys;
      const on = !!phys[key];
      c.classList.toggle('on', on);
      const name = key === 'lensing' ? dict.physLensing : dict.physDoppler;
      const state = on ? dict.on : dict.off;
      const kbd = key === 'lensing' ? '(L)' : '(D)';
      c.innerHTML = name + '：' + state + ' <small>' + kbd + '</small>';
    });
  }
  const tweens = [];

  // ── 国际化词典与多语言支持 ────────────────────────────────────
  const BH_I18N = {
    zh: {
      home: '首页',
      title: '黑洞与引力透镜 · Gargantua<small>实时测地线渲染 — 拖拽转视角 · 滚轮缩放</small>',
      qLow: '低', qMid: '中', qHigh: '高',
      reset: '⟲ 复位',
      help: '? 帮助',
      pipeHead: '📐 数据流水线',
      pipeRows: { raw: '原始读数', eq: '应用方程', calc: '逐步算术', res: '真实结果' },
      physLensing: '🌀 引力透镜',
      physDoppler: '⚡ 多普勒',
      on: '开', off: '关',
      ringLblA: '阴影 ≈ 2.6 r<sub>s</sub>（比视界本身大）',
      ringLblB: '光子环 · 光在 1.5 r<sub>s</sub> 绕圈',
      ringNote: '视界在黑影内部 · 任何光都无法从中逃出',
      helpTitle: '🖐 怎么玩',
      helpTable: [
        ['拖拽', '旋转视角（引力透镜会实时变化）'],
        ['滚轮', '推近 / 拉远'],
        ['双击', '回到经典机位'],
        ['1–5', '五个功能视角（底部按钮）'],
        ['L / D', '开关 引力透镜 / 多普勒效应'],
        ['R', '复位视角'],
        ['空格', '暂停盘旋转'],
        ['H', '本帮助']
      ],
      helpNote: `这是<b>真实物理计算</b>，不是贴图：每个像素都在反向积分一条 Schwarzschild
        弯曲时空里的光路（测地线方程 d²x/dλ² = −3/2·h²·x/r⁵）。
        所以拖动视角时，星场的"漩涡"、盘绕过黑洞上下的拱、光子环都是实时算出来的。
        <br>诚实标注：采用<b>不旋转（Schwarzschild）</b>黑洞；电影中的 Gargantua 是近极限旋转的
        Kerr 黑洞（有参考系拖曳）。盘的色彩按黑体温度剖面 T∝r<sup>−3/4</sup> 计算，
        非真实观测数据。`,
      helpClose: '知道了'
    },
    en: {
      home: 'Home',
      title: 'Black Hole & Lensing · Gargantua<small>Real-time Geodesic Raymarching — Drag to Rotate · Scroll to Zoom</small>',
      qLow: 'Low', qMid: 'Mid', qHigh: 'High',
      reset: '⟲ Reset',
      help: '? Help',
      pipeHead: '📐 Data Pipeline',
      pipeRows: { raw: 'Raw Reading', eq: 'Equation', calc: 'Stepwise Math', res: 'Published Result' },
      physLensing: '🌀 Lensing',
      physDoppler: '⚡ Doppler',
      on: 'On', off: 'Off',
      ringLblA: 'Shadow ≈ 2.6 r<sub>s</sub> (larger than horizon)',
      ringLblB: 'Photon ring · Light orbits at 1.5 r<sub>s</sub>',
      ringNote: 'Event horizon inside shadow · No light can escape',
      helpTitle: '🖐 Controls',
      helpTable: [
        ['Drag', 'Rotate camera (real-time relativistic ray deflection)'],
        ['Scroll', 'Zoom in / out'],
        ['DblClick', 'Reset to classic vantage point'],
        ['1–5', 'Five feature perspectives (bottom buttons)'],
        ['L / D', 'Toggle Gravitational Lensing / Doppler Beaming'],
        ['R', 'Reset camera orientation'],
        ['Space', 'Pause accretion disk rotation'],
        ['H', 'Toggle this help guide']
      ],
      helpNote: `This is <b>authentic relativistic raymarching</b>, not a texture map: each pixel back-integrates null geodesics in Schwarzschild curved spacetime (d²x/dλ² = −3/2·h²·x/r⁵).
        As you orbit, the stellar lensing whirls, the upper/lower accretion arches, and the photon ring are calculated in real time.
        <br>Note: Modeled with a <b>non-rotating (Schwarzschild)</b> metric; the movie Gargantua is a near-extremal Kerr black hole with frame dragging. Color rendered using blackbody profile T ∝ r<sup>−3/4</sup>.`,
      helpClose: 'Got it'
    }
  };

  let curLang = (() => {
    try {
      const p = new URLSearchParams(window.location.search).get('lang');
      if (p === 'zh' || p === 'en') return p;
      return localStorage.getItem('science_lang') || localStorage.getItem('collider_lang') ||
        ((typeof navigator !== 'undefined' && (navigator.language || '').toLowerCase().startsWith('zh')) ? 'zh' : 'en');
    } catch(e) { return 'zh'; }
  })();

  // ── 讲解面板 + 数据流水线 ────────────────────────────────────
  const panelEl = document.getElementById('panel');
  const pipeEl = document.getElementById('pipe');
  function setPanel(html) { panelEl.innerHTML = html; }
  function setPipe(st) {
    const dict = BH_I18N[curLang] || BH_I18N.zh;
    const pSt = (st && st[curLang]) ? st[curLang] : (st && st.zh ? st.zh : (st || {}));
    const rows = [
      ['raw', dict.pipeRows.raw],
      ['eq', dict.pipeRows.eq],
      ['calc', dict.pipeRows.calc],
      ['res', dict.pipeRows.res]
    ];
    pipeEl.innerHTML = rows.map(([k, label]) =>
      '<div class="pipe-row"><div class="pipe-label">' + label + '</div>' +
      '<div class="pipe-val">' + (pSt[k] || '') + '</div></div>').join('');
  }

  // ── 功能定义（每个按钮 = 相机机位 + 物理状态 + 讲解）─────────
  const FEATURES = [
    { id: 'full',
      btn: { zh: '全景展示 Full View', en: 'Full View' }, key: '1',
      cam: { az: 1.25, pol: 1.33, dist: 25 }, lensing: 1, doppler: 1, ring: false,
      panel: {
        zh: `<h3>🌌 你看到的不是一颗星</h3>
        <p>中间的<b>黑影</b>是黑洞本身——光都逃不出来。围绕它的不是光环，而是
        <b>同一个吸积盘的多个像</b>：盘背面的光被引力弯过黑洞的上方和下方，
        所以你同时看见了盘的<b>上面、下面和背后</b>。</p>
        <p>《星际穿越》的 Gargantua 是第一个按广义相对论精确渲染的电影黑洞
        （Kip Thorne 顾问，2015），后来 EHT 拍到的真实黑洞和它惊人地像。</p>`,
        en: `<h3>🌌 Not Just a Single Star</h3>
        <p>The central <b>black shadow</b> is the event horizon's gravitational footprint—no light escapes. Surrounding it is not a glowing ring, but <b>multiple distorted images of the same accretion disk</b>: light from behind is curved over the top and beneath the bottom of the black hole, revealing the disk's <b>top, bottom, and rear simultaneously</b>.</p>
        <p>Gargantua from <i>Interstellar</i> was the first Hollywood black hole rendered strictly with general relativity (advised by Kip Thorne, 2015). The subsequent Event Horizon Telescope (EHT) real imagery closely matched this geometry.</p>`
      },
      pipe: {
        zh: {
          raw: '电影设定：Gargantua 质量 <b>10⁸ M☉</b>（1 亿倍太阳），自旋接近极限',
          eq: '黑洞阴影半径 <b>b = 3√3·GM/c² ≈ 2.6 r<sub>s</sub></b>（比视界大）',
          calc: 'r<sub>s</sub> = 2GM/c² = 2.95 km × (M/M☉) = 2.95×10⁸ km ≈ <b>2 AU</b>（比地球轨道还大）',
          res: '电影视界直径 ≈ 4 AU；本页用<b>不旋转（Schwarzschild）</b>黑洞近似——电影版是近极限旋转的 Kerr 黑洞'
        },
        en: {
          raw: 'Movie canon: Gargantua mass <b>10⁸ M☉</b> (100 million solar masses), near-extremal spin',
          eq: 'Black hole shadow radius <b>b = 3√3·GM/c² ≈ 2.6 r<sub>s</sub></b> (larger than horizon)',
          calc: 'r<sub>s</sub> = 2GM/c² = 2.95 km × (M/M☉) = 2.95×10⁸ km ≈ <b>2 AU</b> (larger than Earth orbit)',
          res: 'Movie horizon diameter ≈ 4 AU; this simulation uses <b>Schwarzschild (non-rotating)</b> metric as an accessible approximation'
        }
      }
    },

    { id: 'horizon',
      btn: { zh: '事件视界 Event Horizon', en: 'Event Horizon' }, key: '2',
      cam: { az: 1.25, pol: 1.38, dist: 9.5 }, lensing: 1, doppler: 1, ring: true,
      panel: {
        zh: `<h3>⬛ 逃不出的边界</h3>
        <p>视界半径 r<sub>s</sub>=2GM/c²。但照片上的黑影<b>不是</b>视界本身——
        引力把背后的光也吞了，黑影半径 ≈ <b>2.6 r<sub>s</sub></b>。
        紧贴黑影的细亮环是<b>光子环</b>：在 r=1.5 r<sub>s</sub> 绕圈多圈才逃出的光。</p>`,
        en: `<h3>⬛ The Point of No Return</h3>
        <p>The Schwarzschild radius is r<sub>s</sub> = 2GM/c². But the shadow in astronomical photos is <b>not</b> just the horizon surface—strong gravitational bending swallows ambient light rays, enlarging the apparent shadow to ≈ <b>2.6 r<sub>s</sub></b>.
        Hugging the edge is the razor-thin <b>photon ring</b>: rays orbiting multiple times at r = 1.5 r<sub>s</sub> before escaping.</p>`
      },
      pipe: {
        zh: {
          raw: 'EHT 2017 观测 M87*：环直径 <b>42 ± 3 μas</b>（角秒的百万分之四十二）',
          eq: '阴影直径 d ≈ 5.2 GM/c²，代入 d = θ × 距离 → 求 M',
          calc: 'M = 6.5×10⁹ M☉ × (42 μas/实测) ✓ 距离 5,500 万光年（16.8 Mpc）',
          res: '<b>2019-04-10 人类第一张黑洞照片</b>（EHT）；银河系中心 Sgr A*（430 万 M☉）2022-05-12 跟上'
        },
        en: {
          raw: 'EHT 2017 observation of M87*: ring diameter <b>42 ± 3 μas</b> (42 microarcseconds)',
          eq: 'Shadow diameter d ≈ 5.2 GM/c²; substitute d = θ × distance → solve for M',
          calc: 'M = 6.5×10⁹ M☉ × (42 μas / observed) ✓ Distance 55 million ly (16.8 Mpc)',
          res: '<b>2019-04-10 First human image of a black hole</b> (EHT); Milky Way center Sgr A* (4.3×10⁶ M☉) confirmed 2022-05-12'
        }
      }
    },

    { id: 'lensing',
      btn: { zh: '引力透镜 Lensing', en: 'Lensing' }, key: '3',
      cam: { az: 1.25, pol: 1.53, dist: 22 }, lensing: 1, doppler: 1, ring: false, edgeOn: true,
      panel: {
        zh: `<h3>🔮 光被掰弯了</h3>
        <p>盘明明是平的，为什么上下各多出一个"拱"？那是<b>盘背面的像</b>：
        光从黑洞背后出发，被引力掰弯 90° 越过两极才到你眼里。
        用下面的开关关掉透镜——盘立刻塌平成土星环；再打开——恢复弯曲。</p>`,
        en: `<h3>🔮 Bent Light Rays</h3>
        <p>The disk is planar in space, yet arched above and below. Those arches are the <b>lensed back of the disk</b>: rays originate behind the hole, are bent ~90° over both rotational poles, and travel straight into your camera.
        Toggle Lensing off below—the disk collapses into a flat Saturn ring; toggle on—the arches reappear.</p>`
      },
      pipe: {
        zh: {
          raw: '1919 年日全食：对比太阳两侧恒星的表观位置',
          eq: '光线偏折 <b>α = 4GM/(c²b)</b>（爱因斯坦 1915）',
          calc: '太阳掠射：b☉=6.96×10⁵ km → α = 2×2.95/6.96×10⁵ rad = <b>1.75″</b>',
          res: '爱丁顿实测 <b>1.75″</b> ✓ 广义相对论一夜成名；这里是同一方程把整个盘"掰"过黑洞头顶'
        },
        en: {
          raw: '1919 Solar Eclipse: comparing stellar positions grazing the Sun',
          eq: 'Deflection angle <b>α = 4GM/(c²b)</b> (Einstein 1915)',
          calc: 'Solar grazing: b☉ = 6.96×10⁵ km → α = 2 × 2.95 / 6.96×10⁵ rad = <b>1.75″</b>',
          res: 'Eddington measured <b>1.75″</b> ✓ verified General Relativity; here the exact same physics bends the entire disk over the singularity'
        }
      }
    },

    { id: 'disk',
      btn: { zh: '吸积盘 Accretion Disk', en: 'Accretion Disk' }, key: '4',
      cam: { az: 1.25, pol: 0.45, dist: 24 }, lensing: 1, doppler: 1, ring: false,
      panel: {
        zh: `<h3>🔥 比恒星更热的"宇宙磨盘"</h3>
        <p>等离子体绕黑洞旋转，越内越热：内缘 <b>10⁶–10⁷ K</b>（白热），
        外缘几千 K（橙红）。盘不能一直向内——<b>最内稳定圆轨道 ISCO = 3 r<sub>s</sub></b>
        是它的内边缘，再往里就直接坠入。</p>
        <p>颜色不是上色：这里是按温度剖面 T ∝ r<sup>−3/4</sup> 算出的<b>黑体色</b>。</p>`,
        en: `<h3>🔥 The Cosmic Crucible</h3>
        <p>Accretion plasma spirals inward at extreme velocity, getting hotter towards the center: the inner edge reaches <b>10⁶–10⁷ K</b> (brilliant white-blue), while the outer edge glows orange-red (thousands of K). Matter cannot orbit indefinitely—the <b>Innermost Stable Circular Orbit (ISCO = 3 r<sub>s</sub>)</b> marks the sharp inner boundary where matter plunges directly into the abyss.</p>
        <p>The colors are not arbitrary: they are physically computed from the thin disk blackbody temperature profile T ∝ r<sup>−3/4</sup>.</p>`
      },
      pipe: {
        zh: {
          raw: 'X 射线卫星观测活动星系核 / X 射线双星的盘光谱',
          eq: '薄盘温度 <b>T(r) ∝ r<sup>−3/4</sup></b>（Shakura–Sunyaev 1973）',
          calc: 'ISCO 内缘 r=3r<sub>s</sub>：轨道速度 v = √(M/(r−r<sub>s</sub>)) = <b>0.5c</b>（每秒 15 万 km）',
          res: '类星体靠吸积盘的效率把 ~10% 质量化为能量——比核聚变（0.7%）高一个量级，是宇宙最亮持续光源'
        },
        en: {
          raw: 'X-ray satellite spectroscopy of Active Galactic Nuclei / X-ray binaries',
          eq: 'Thin disk temperature <b>T(r) ∝ r<sup>−3/4</sup></b> (Shakura–Sunyaev 1973)',
          calc: 'ISCO inner edge r = 3 r<sub>s</sub>: orbital velocity v = √(M/(r−r<sub>s</sub>)) = <b>0.5c</b> (150,000 km/s)',
          res: 'Accretion converts ~10% of rest mass into radiation—an order of magnitude beyond nuclear fusion (0.7%), creating the universe’s most luminous engines'
        }
      }
    },

    { id: 'doppler',
      btn: { zh: '多普勒效应 Doppler Beaming', en: 'Doppler Beaming' }, key: '5',
      cam: { az: 1.25, pol: 1.55, dist: 20 }, lensing: 1, doppler: 1, ring: false, edgeOn: true,
      panel: {
        zh: `<h3>⚡ 为什么一边亮一边暗？</h3>
        <p>盘的一侧朝你冲来、一侧离你而去。接近光的运动会让光
        <b>变亮、变蓝</b>（相对论束流），远离的一侧<b>变暗、变红</b>。
        用开关关掉多普勒——盘立刻左右对称；打开——一侧猛亮。</p>
        <p>《星际穿越》里两边一样亮是诺兰的要求；<b>真实照片就是歪的</b>。</p>`,
        en: `<h3>⚡ Asymmetric Brightness</h3>
        <p>One side of the accretion disk orbits towards you at relativistic velocity, while the opposite side recedes. Relativistic beaming concentrates light in the forward direction, making the approaching side <b>bright and blueshifted</b>, while dimming and reddening the receding side.</p>
        <p>In <i>Interstellar</i>, director Christopher Nolan chose symmetric lighting for visual clarity; in reality and in true EHT images, the disk is unmistakably lopsided.</p>`
      },
      pipe: {
        zh: {
          raw: 'EHT M87* 环像：不是正圆，<b>南侧明显更亮</b>',
          eq: '束流：I ∝ D⁴，D = 1/(γ(1−β·cosθ))；ISCO 处 β = 0.5c',
          calc: '掠射方向亮暗比 = ((1+β)/(1−β))⁴ = 3⁴ = <b>81 倍</b>',
          res: '亮度不对称 = 那一侧正朝我们冲来 → 直接测出黑洞顺时针自转（M87*，2019）'
        },
        en: {
          raw: 'EHT M87* ring observation: pronounced brightness asymmetry on southern crest',
          eq: 'Relativistic beaming: I ∝ D⁴, D = 1/(γ(1−β·cosθ)); at ISCO β ≈ 0.5c',
          calc: 'Approaching-to-receding brightness ratio = ((1+β)/(1−β))⁴ = 3⁴ = <b>81×</b>',
          res: 'Brightness asymmetry proves relativistic motion towards Earth → established clockwise spin of M87* (2019)'
        }
      }
    }
  ];

  // ── 按钮 / 开关 UI ───────────────────────────────────────────
  const featBar = document.getElementById('featBar');
  FEATURES.forEach((f, i) => {
    const b = document.createElement('button');
    b.className = 'feat-btn' + (i === 0 ? ' on' : '');
    b.textContent = f.btn[curLang] || f.btn.zh;
    b.addEventListener('click', () => activate(f));
    featBar.appendChild(b);
  });
  let active = FEATURES[0];
  function activate(f, dur) {
    active = f;
    flyTo(f.cam, dur);
    setPhys('lensing', !!f.lensing);
    setPhys('doppler', !!f.doppler);
    document.querySelectorAll('.feat-btn').forEach((b, i) =>
      b.classList.toggle('on', FEATURES[i] === f));
    const lang = curLang;
    setPanel((f.panel && f.panel[lang]) ? f.panel[lang] : (f.panel && f.panel.zh ? f.panel.zh : f.panel));
    setPipe((f.pipe && f.pipe[lang]) ? f.pipe[lang] : (f.pipe && f.pipe.zh ? f.pipe.zh : f.pipe));
    document.getElementById('ringOverlay').style.opacity = f.ring ? 1 : 0;
  }

  function setLang(lang) {
    if (lang !== 'zh' && lang !== 'en') return;
    curLang = lang;
    try {
      localStorage.setItem('science_lang', lang);
      const u = new URL(window.location);
      u.searchParams.set('lang', lang);
      window.history.replaceState({}, '', u);
    } catch(e) {}
    document.documentElement.lang = (lang === 'zh' ? 'zh-CN' : 'en');
    document.documentElement.classList.remove('i18n-loading');

    const homeBtn = document.getElementById('homeBtn');
    if (homeBtn) {
      homeBtn.href = '../index.html?lang=' + lang;
      const homeTxt = document.getElementById('homeTxt');
      if (homeTxt) homeTxt.textContent = lang === 'en' ? 'Home' : '首页';
    }
    const bZh = document.getElementById('btnLangZh');
    const bEn = document.getElementById('btnLangEn');
    if (bZh) bZh.classList.toggle('active', lang === 'zh');
    if (bEn) bEn.classList.toggle('active', lang === 'en');

    const dict = BH_I18N[lang] || BH_I18N.zh;
    const titleEl = document.getElementById('title');
    if (titleEl) titleEl.innerHTML = dict.title;
    const qLow = document.getElementById('qLow');
    if (qLow) qLow.textContent = dict.qLow;
    const qMid = document.getElementById('qMid');
    if (qMid) qMid.textContent = dict.qMid;
    const qHigh = document.getElementById('qHigh');
    if (qHigh) qHigh.textContent = dict.qHigh;
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) resetBtn.textContent = dict.reset;
    const helpBtn = document.getElementById('helpBtn');
    if (helpBtn) helpBtn.textContent = dict.help;
    const pipeHead = document.getElementById('pipeHead');
    if (pipeHead) pipeHead.textContent = dict.pipeHead;

    const ringLblA = document.getElementById('ringLblA');
    if (ringLblA) ringLblA.innerHTML = dict.ringLblA;
    const ringLblB = document.getElementById('ringLblB');
    if (ringLblB) ringLblB.innerHTML = dict.ringLblB;
    const ringNote = document.getElementById('ringNote');
    if (ringNote) ringNote.innerHTML = dict.ringNote;

    const helpTitle = document.getElementById('helpTitle');
    if (helpTitle) helpTitle.textContent = dict.helpTitle;
    const helpTable = document.getElementById('helpTable');
    if (helpTable && dict.helpTable) {
      helpTable.innerHTML = dict.helpTable.map(r => '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>').join('');
    }
    const helpNote = document.getElementById('helpNote');
    if (helpNote) helpNote.innerHTML = dict.helpNote;
    const helpClose = document.getElementById('helpClose');
    if (helpClose) helpClose.textContent = dict.helpClose;

    const fBtns = featBar.querySelectorAll('.feat-btn');
    FEATURES.forEach((f, idx) => {
      if (fBtns[idx]) {
        fBtns[idx].textContent = f.btn[lang] || f.btn.zh;
      }
    });

    updatePhysChips();

    if (active) {
      setPanel((active.panel && active.panel[lang]) ? active.panel[lang] : (active.panel && active.panel.zh ? active.panel.zh : active.panel));
      setPipe((active.pipe && active.pipe[lang]) ? active.pipe[lang] : (active.pipe && active.pipe.zh ? active.pipe.zh : active.pipe));
    }
  }

  // 面板内的物理开关 chips（事件动态挂）
  function mountPhysChips() {
    document.querySelectorAll('[data-phys]').forEach(c => {
      c.addEventListener('click', () => setPhys(c.dataset.phys, !phys[c.dataset.phys]));
    });
  }

  // ── 阴影标注环（事件视界视图）────────────────────────────────
  const ringOverlay = document.getElementById('ringOverlay');
  function updateRing() {
    if (!active.ring || fly) { if (!active.ring) ringOverlay.style.opacity = 0; return; }
    const d = view.dist;
    // 有限距离阴影角半径：sinθ = b·√(1−1/d)/d
    const s = Math.min(1, B_CRIT_U * Math.sqrt(Math.max(0, 1 - 1 / d)) / d);
    const theta = Math.asin(s);
    const h = window.innerHeight;
    const rpx = Math.tan(theta) / U.uTanHalfFov.value * (h / 2);
    ringOverlay.style.opacity = 1;
    ringOverlay.style.width = ringOverlay.style.height = (2 * rpx) + 'px';
  }
  const B_CRIT_U = 2.5980762;  // PROV: derived | 3√3/2 | - | 临界碰撞参数

  // ── 主循环 ───────────────────────────────────────────────────
  let paused = false;
  let last = performance.now() / 1000;
  let fpsN = 0, fpsT = 0;  // NO-PROV: 局部变量/运行时状态，非对外科学数值
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function loop() {
    requestAnimationFrame(loop);
    const now = performance.now() / 1000;
    const dt = Math.min(0.05, now - last);
    last = now;
    // 补间
    for (let i = tweens.length - 1; i >= 0; i--) {
      const t = tweens[i];
      t.t += dt;
      const k = Math.min(1, t.t / t.dur);
      const e = k < 0.5 ? 4*k*k*k : 1 - Math.pow(-2*k + 2, 3) / 2;
      t.uni.value = t.from + (t.to - t.from) * e;
      if (k >= 1) tweens.splice(i, 1);
    }
    if (fly) {
      fly.t += dt;
      const k = Math.min(1, fly.t / fly.dur);
      const e = k < 0.5 ? 4*k*k*k : 1 - Math.pow(-2*k + 2, 3) / 2;
      view.az = fly.from.az + (fly.to.az - fly.from.az) * e;
      view.pol = fly.from.pol + (fly.to.pol - fly.from.pol) * e;
      view.dist = fly.from.dist + (fly.to.dist - fly.from.dist) * e;
      if (k >= 1) fly = null;
    }
    if (!paused && !reducedMotion) U.uTime.value += dt;
    applyCamera();
    updateRing();
    renderer.render(scene, cam);
    // fps
    fpsN++; fpsT += dt;
    if (fpsT >= 0.5) {
      document.getElementById('fps').textContent = Math.round(fpsN / fpsT) + ' fps';
      fpsN = 0; fpsT = 0;
    }
  }

  // ── 键盘 / 帮助 / 质量 ───────────────────────────────────────
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    const f = FEATURES.find(x => x.key === e.key);
    if (f) activate(f);
    else if (e.key === 'l' || e.key === 'L') setPhys('lensing', !phys.lensing);
    else if (e.key === 'd' || e.key === 'D') setPhys('doppler', !phys.doppler);
    else if (e.key === 'r' || e.key === 'R') flyTo(HOME);
    else if (e.key === ' ') { e.preventDefault(); paused = !paused; }
    else if (e.key === 'h' || e.key === 'H') toggleHelp();
  });
  function toggleHelp(force) {
    const h = document.getElementById('help');
    const show = force !== undefined ? force : h.style.display !== 'flex';
    h.style.display = show ? 'flex' : 'none';
  }
  document.getElementById('helpBtn').addEventListener('click', () => toggleHelp());
  document.getElementById('helpClose').addEventListener('click', () => toggleHelp(false));
  document.getElementById('resetBtn').addEventListener('click', () => flyTo(HOME));
  document.querySelectorAll('.q-btn').forEach(b => {
    b.addEventListener('click', () => {
      quality = b.dataset.q;
      document.querySelectorAll('.q-btn').forEach(x => x.classList.toggle('on', x === b));
      resize();
    });
  });

  // ── 语言切换事件 ──
  const btnZh = document.getElementById('btnLangZh');
  const btnEn = document.getElementById('btnLangEn');
  if (btnZh) btnZh.addEventListener('click', () => setLang('zh'));
  if (btnEn) btnEn.addEventListener('click', () => setLang('en'));
  window.addEventListener('storage', e => {
    if (e.key === 'science_lang' && (e.newValue === 'en' || e.newValue === 'zh') && e.newValue !== curLang) {
      setLang(e.newValue);
    }
  });

  // ── 启动 ─────────────────────────────────────────────────────
  resize();
  mountPhysChips();
  setLang(curLang);
  activate(FEATURES[0], 0.01);
  loop();

  // 验收/调试：曝光当前渲染状态
  window.__bhState = () => ({
    lensing: U.uLensing.value, doppler: U.uDoppler.value,
    az: +view.az.toFixed(3), pol: +view.pol.toFixed(3), dist: +view.dist.toFixed(3)
  });
});
