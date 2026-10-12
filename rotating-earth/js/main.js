// main.js — 实时旋转地球：真实天文 + 经纬网 + 国界点选 + 分级地名标签
// 场景约定：黄道面 = XZ，太阳固定在 +X 远处；地轴随季节倾摆
// 天文公式全部在 astro.js，已通过 13+10 项 node 闭环验证
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gl');
  const ERRS = [];
  window.addEventListener('error', e => ERRS.push(e.message + ' @' + e.lineno));
  window.__errs = ERRS;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 1200);

  const R = 6;                                       // 地球半径（世界单位）——做大可近看
  const D2R = Math.PI / 180;

  // 经纬度 → 地球局部坐标（与 three.js SphereGeometry UV 一致：u=0.5 → 本初子午线）
  function latLonToLocal(latDeg, lonDeg, r) {
    const la = latDeg * D2R, lo = lonDeg * D2R;
    return new THREE.Vector3(r * Math.cos(la) * Math.cos(lo), r * Math.sin(la),
      -r * Math.cos(la) * Math.sin(lo));
  }

  // ── 纹理 ─────────────────────────────────────────────────────
  const loader = new THREE.TextureLoader();
  const TEX = {};
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const params = new URLSearchParams(location.search);
  const LITE = params.has('lite');
  // ── 画质管理：2K 秒开，4K/8K 客户端按需动态加载（浏览器自行渲染）──
  const quality = {
    cur: '2k',
    saved: localStorage.getItem('earthQ') || '4k',
    maxTex: renderer.capabilities.maxTextureSize,
    available(q) {
      if (q === '8k') return this.maxTex >= 8192 && !LITE;
      if (q === '4k') return !LITE && this.maxTex >= 4096;
      return true;
    },
    ensure(q) {
      const key = 'EARTH_TEX_' + q.toUpperCase();
      if (window[key]) return Promise.resolve(window[key]);
      return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'js/tex-' + q + '.js';
        s.onload = () => resolve(window[key]);
        s.onerror = () => reject(new Error('画质包加载失败'));
        document.head.appendChild(s);
      });
    },
    async set(q) {
      if (q === this.cur || !this.available(q)) return;
      toast('加载 ' + q.toUpperCase() + ' 贴图…');
      try {
        const set = await this.ensure(q);
        for (const k of ['day', 'night', 'clouds', 'spec']) {
          const nt = loader.load(set[k]);
          nt.colorSpace = THREE.SRGBColorSpace;
          nt.anisotropy = maxAniso;
          const old = TEX[k];
          if (k === 'day') earthMat.uniforms.uDay.value = nt;
          else if (k === 'night') earthMat.uniforms.uNight.value = nt;
          else if (k === 'spec') earthMat.uniforms.uSpec.value = nt;
          else if (k === 'clouds') cloudMat.uniforms.uClouds.value = nt;
          TEX[k] = nt;
          if (old) old.dispose();
        }
        this.cur = q;
        localStorage.setItem('earthQ', q);
        toast('✓ 画质 ' + q.toUpperCase());
      } catch (e) { toast('✗ ' + q.toUpperCase() + ' 加载失败'); }
    }
  };
  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.style.opacity = 1;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.style.opacity = 0, 1800);
  }
  for (const k of ['day', 'night', 'clouds', 'spec']) {
    TEX[k] = loader.load(window.EARTH_TEX_2K[k]);
    TEX[k].colorSpace = THREE.SRGBColorSpace;
    TEX[k].anisotropy = maxAniso;
  }
  window.__scene = scene;                            // 调试/验收
  window.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    if (quality.cur !== '2k' && !LITE) { localStorage.setItem('earthQ', '2k'); location.href = '?lite=1'; }
  });

  // ── 地球组 ───────────────────────────────────────────────────
  const earthGroup = new THREE.Group();
  scene.add(earthGroup);
  const cloudGroup = new THREE.Group();
  scene.add(cloudGroup);
  const sunDir = new THREE.Vector3(1, 0, 0);

  const earthMat = new THREE.ShaderMaterial({
    vertexShader: EARTH_GLSL.earthVert, fragmentShader: EARTH_GLSL.earthFrag,
    uniforms: {
      uDay: { value: TEX.day }, uNight: { value: TEX.night }, uSpec: { value: TEX.spec },
      uSunDir: { value: sunDir }, uCamPos: { value: camera.position }
    }
  });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), earthMat);
  earthGroup.add(earth);

  const cloudMat = new THREE.ShaderMaterial({
    vertexShader: EARTH_GLSL.cloudVert, fragmentShader: EARTH_GLSL.cloudFrag,
    uniforms: { uClouds: { value: TEX.clouds }, uSunDir: { value: sunDir } },
    transparent: true, depthWrite: false
  });
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(R * 1.008, 96, 64), cloudMat);
  cloudGroup.add(clouds);

  const atmoMat = new THREE.ShaderMaterial({
    vertexShader: EARTH_GLSL.atmoVert, fragmentShader: EARTH_GLSL.atmoFrag,
    uniforms: { uSunDir: { value: sunDir }, uCamPos: { value: camera.position } },
    side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.05, 64, 48), atmoMat);
  scene.add(atmo);

  // ── 标记：地轴 / 极圈（随地球）───────────────────────────────
  const markerGroup = new THREE.Group();
  earthGroup.add(markerGroup);
  const axisLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -R * 1.35, 0), new THREE.Vector3(0, R * 1.35, 0)]),
    new THREE.LineDashedMaterial({ color: 0xd8b25c, dashSize: 0.28, gapSize: 0.2,
      transparent: true, opacity: 0.9 }));
  axisLine.computeLineDistances();
  markerGroup.add(axisLine);
  function latRing(latDeg, color, opacity) {
    const r = R * Math.cos(latDeg * D2R), y = R * Math.sin(latDeg * D2R);
    const pts = [];
    for (let i = 0; i <= 96; i++) {
      const a = i / 96 * Math.PI * 2;
      pts.push(new THREE.Vector3(r * Math.cos(a), y, r * Math.sin(a)));
    }
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
  }
  markerGroup.add(latRing(0, 0x4a9fd8, 0.55));
  markerGroup.add(latRing(66.56, 0x9fd8ff, 0.45));
  markerGroup.add(latRing(-66.56, 0x9fd8ff, 0.45));

  // ── 完整经纬网 ───────────────────────────────────────────────
  const gridGroup = new THREE.Group();
  earthGroup.add(gridGroup);
  for (const lat of [-60, -30, 30, 60]) gridGroup.add(latRing(lat, 0x8899aa, 0.26));
  for (const lat of [23.44, -23.44]) gridGroup.add(latRing(lat, 0xd8b25c, 0.38)); // 回归线
  for (let lonDeg = 0; lonDeg < 360; lonDeg += 15) {
    const lon = lonDeg * D2R;
    const pts = [];
    for (let i = 0; i <= 64; i++) {
      const lat = -Math.PI / 2 + i / 64 * Math.PI;
      pts.push(new THREE.Vector3(
        R * Math.cos(lat) * Math.cos(lon), R * Math.sin(lat),
        -R * Math.cos(lat) * Math.sin(lon)));
    }
    const prime = lonDeg === 0 || lonDeg === 180;
    gridGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: prime ? 0xd8b25c : 0x8899aa,
        transparent: true, opacity: prime ? 0.4 : 0.22 })));
  }

  // ── 国界线（所有环 → 一组 LineSegments，常驻低透明度）────────
  const bordersGroup = new THREE.Group();
  earthGroup.add(bordersGroup);
  {
    const pts = [];
    const pushRing = ring => {
      for (let i = 0; i < ring.length - 1; i++) {
        const a = ring[i], b = ring[i+1];
        pts.push(latLonToLocal(a[1], a[0], R * 1.001),
                 latLonToLocal(b[1], b[0], R * 1.001));
      }
    };
    for (const f of window.COUNTRIES_GEO.features) {
      const g = f.g;
      const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
      for (const poly of polys) for (const ring of poly) pushRing(ring);
    }
    const bg = new THREE.BufferGeometry().setFromPoints(pts);   // setFromPoints 正确处理 Vector3
    bordersGroup.add(new THREE.LineSegments(bg,
      new THREE.LineBasicMaterial({ color: 0xcfd8e6, transparent: true, opacity: 0.3 })));
  }

  // ── 国家高亮层（UV 画布 → 透明球壳）─────────────────────────
  const HL_W = 4096, HL_H = 2048;
  const hlCanvas = document.createElement('canvas');
  hlCanvas.width = HL_W; hlCanvas.height = HL_H;
  const hlTex = new THREE.CanvasTexture(hlCanvas);
  const hlMesh = new THREE.Mesh(new THREE.SphereGeometry(R * 1.004, 96, 64),
    new THREE.MeshBasicMaterial({ map: hlTex, transparent: true, depthWrite: false }));
  hlMesh.visible = false;
  scene.add(hlMesh);
  const hlX = lon => (lon + 180) / 360 * HL_W;
  const hlY = lat => (90 - lat) / 180 * HL_H;
  function highlightCountry(feature) {
    const ctx = hlCanvas.getContext('2d');
    ctx.clearRect(0, 0, HL_W, HL_H);
    if (!feature) { hlTex.needsUpdate = true; hlMesh.visible = false; return; }
    const draw = ox => {
      const polys = feature.g.type === 'Polygon' ? [feature.g.coordinates] : feature.g.coordinates;
      ctx.beginPath();
      for (const poly of polys) {
        for (const ring of poly) {
          ring.forEach((pt, i) => {
            const x = hlX(pt[0]) + ox, y = hlY(pt[1]);
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          });
          ctx.closePath();
        }
      }
      ctx.fillStyle = 'rgba(216,178,92,0.42)';
      ctx.fill('evenodd');
      ctx.strokeStyle = 'rgba(216,178,92,0.95)';
      ctx.lineWidth = 2;
      ctx.stroke();
    };
    draw(0); draw(-HL_W); draw(HL_W);                 // 处理跨 180° 经线
    hlTex.needsUpdate = true;
    hlMesh.visible = true;
  }

  // ── 国界点选：经纬度 → 国家（even-odd，跨 180° 解卷绕）──────
  function countryAt(latDeg, lonDeg) {
    // d3-geo 球面 point-in-polygon（参考实现，反经线/极区/洞全部正确）
    // d3 约定外环顺时针；数据若逆时针需归一化绕向
    const lam = lonDeg * D2R, phi = latDeg * D2R;
    for (const f of window.COUNTRIES_GEO.features) {
      const polys = f.g.type === 'Polygon' ? [f.g.coordinates] : f.g.coordinates;
      for (const poly of polys) {
        const rings = poly.map((ring, ri) => {
          let a = 0;
          for (let i = 0; i < ring.length - 1; i++)
            a += ring[i][0] * ring[i+1][1] - ring[i+1][0] * ring[i][1];
          const wantCW = ri === 0, isCCW = a > 0;
          const rev = wantCW ? isCCW : !isCCW;
          const r = ring.map(pt => [pt[0] * D2R, pt[1] * D2R]);
          return rev ? r.reverse() : r;
        });
        if (window.D3GEO.polygonContains(rings, [lam, phi])) return f;
      }
    }
    return null;
  }

  // ── 语言与地名英文对照 ─────────────────────────────────────────
  let curLang = (() => {
    try {
      const p = new URLSearchParams(window.location.search).get('lang');
      if (p === 'zh' || p === 'en') return p;
      return localStorage.getItem('science_lang') || localStorage.getItem('collider_lang') ||
        ((typeof navigator !== 'undefined' && (navigator.language || '').toLowerCase().startsWith('zh')) ? 'zh' : 'en');
    } catch(e) { return 'zh'; }
  })();
  window.APP_LANG = curLang;

  const PLACE_EN = {
    '太平洋': 'Pacific Ocean', '大西洋': 'Atlantic Ocean', '印度洋': 'Indian Ocean', '北冰洋': 'Arctic Ocean', '南冰洋': 'Southern Ocean',
    '地中海': 'Mediterranean Sea', '加勒比海': 'Caribbean Sea', '红海': 'Red Sea', '黑海': 'Black Sea', '波罗的海': 'Baltic Sea',
    '波斯湾': 'Persian Gulf', '阿拉伯海': 'Arabian Sea', '孟加拉湾': 'Bay of Bengal', '南海': 'South China Sea', '东海': 'East China Sea',
    '日本海': 'Sea of Japan', '白令海': 'Bering Sea', '鄂霍次克海': 'Sea of Okhotsk', '挪威海': 'Norwegian Sea', '珊瑚海': 'Coral Sea',
    '阿拉斯加湾': 'Gulf of Alaska', '哈德逊湾': 'Hudson Bay', '墨西哥湾': 'Gulf of Mexico', '阿曼湾': 'Gulf of Oman', '亚丁湾': 'Gulf of Aden',
    '几内亚湾': 'Gulf of Guinea', '渤海': 'Bohai Sea', '黄海': 'Yellow Sea', '白令海峡': 'Bering Strait', '马六甲海峡': 'Strait of Malacca',
    '直布罗陀海峡': 'Strait of Gibraltar', '英吉利海峡': 'English Channel', '霍尔木兹海峡': 'Strait of Hormuz', '曼德海峡': 'Bab-el-Mandeb',
    '土耳其海峡': 'Turkish Straits', '麦哲伦海峡': 'Strait of Magellan', '德雷克海峡': 'Drake Passage', '望加锡海峡': 'Makassar Strait',
    '对马海峡': 'Tsushima Strait', '台湾海峡': 'Taiwan Strait', '苏伊士运河': 'Suez Canal', '巴拿马运河': 'Panama Canal', '基尔运河': 'Kiel Canal',
    '贝加尔湖': 'Lake Baikal', '里海': 'Caspian Sea', '苏必利尔湖': 'Lake Superior', '密歇根湖': 'Lake Michigan', '维多利亚湖': 'Lake Victoria',
    '坦噶尼喀湖': 'Lake Tanganyika', '青海湖': 'Qinghai Lake', '伊利湖': 'Lake Erie', '安大略湖': 'Lake Ontario',
    '🇨🇳 长城·八达岭': '🇨🇳 Great Wall', '⛰️ 珠穆朗玛峰': '⛰️ Mt. Everest', '🏔️ 大峡谷': '🏔️ Grand Canyon', '🌋 黄石': '🌋 Yellowstone',
    '🌊 尼亚加拉瀑布': '🌊 Niagara Falls', '🗻 富士山': '🗻 Mt. Fuji', '🏛️ 吉萨金字塔': '🏛️ Pyramids of Giza', '🕌 泰姬陵': '🕌 Taj Mahal',
    '🗼 埃菲尔铁塔': '🗼 Eiffel Tower', '🗿 乌鲁鲁': '🗿 Uluru', '🐠 大堡礁': '🐠 Great Barrier Reef', '🗿 基督像·里约': '🗿 Christ the Redeemer',
    '🌳 亚马逊雨林': '🌳 Amazon Rainforest', '⛰️ 马丘比丘': '⛰️ Machu Picchu', '🏰 克里姆林宫': '🏰 Kremlin', '🏛️ 罗马斗兽场': '🏛️ Colosseum',
    '🛕 吴哥窟': '🛕 Angkor Wat', '🌆 哈利法塔': '🌆 Burj Khalifa', '🗿 奇琴伊察': '🗿 Chichen Itza', '⛰️ 乞力马扎罗山': '⛰️ Mt. Kilimanjaro',
    '🕌 圣索菲亚': '🕌 Hagia Sophia', '🏛️ 伊瓜苏瀑布': '🏛️ Iguazu Falls', '🏛️ 雅典卫城': '🏛️ Acropolis of Athens', '🏔️ 富士山·航拍': '🏔️ Mt. Fuji'
  };

  // ── 地名标签（HTML，分级显示，背面隐藏）─────────────────────
  const labelLayer = document.getElementById('labelLayer');
  const labels = [];                                  // {el, anchor(Vector3), tier, kind}
  function addLabel(text, latDeg, lonDeg, tier, kind) {
    const el = document.createElement('div');
    el.className = 'geo-label ' + kind;
    const enText = PLACE_EN[text] || text;
    el.textContent = curLang === 'en' ? enText : text;
    labelLayer.appendChild(el);
    labels.push({ el, anchor: latLonToLocal(latDeg, lonDeg, R * 1.012), tier, kind, name: text, enName: enText });
  }
  for (const p of window.PLACES)
    addLabel(p.name, p.lat, p.lon, p.tier, p.kind || 'place');
  // 全部国家：按面积排名分级（越大越早显示；推到最近全部可见）
  const byArea = Object.entries(window.COUNTRY_META)
    .filter(([id]) => id !== '__labels')
    .sort((a, b) => b[1].area - a[1].area);
  byArea.forEach(([id, m], rank) => {
    const maxDist = rank < 40 ? 21 : rank < 90 ? 16.5 : 12.5;
    labels.push({ el: null, anchor: latLonToLocal(m.lat, m.lon, R * 1.012),
      tier: null, kind: 'country', id, name: m.zh, enName: m.en, maxDist });
  });
  const TIERS = [[1, 999], [2, 999], [3, 26]];        // 大洋恒显；大海<26；其余按 maxDist

  // ── 太阳光斑 / 星空 ─────────────────────────────────────────
  const glowCv = document.createElement('canvas'); glowCv.width = glowCv.height = 128;
  { const g = glowCv.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 2, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,250,230,1)'); gr.addColorStop(0.18, 'rgba(255,240,200,0.85)');
    gr.addColorStop(0.5, 'rgba(255,220,150,0.18)'); gr.addColorStop(1, 'rgba(255,220,150,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(glowCv), transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false }));
  sunSprite.scale.setScalar(60);
  sunSprite.position.set(400, 0, 0);
  scene.add(sunSprite);
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position',
    new THREE.BufferAttribute(EARTH_GLSL.makeStarPositions(2600, 500), 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xdde4ee, size: 1.35, sizeAttenuation: false, transparent: true, opacity: 0.85 })));

  // ── 相机 ─────────────────────────────────────────────────────
  const view = { az: 0.9, pol: 1.35, dist: 21 };
  const HOME = { ...view };
  function applyCam() {
    const sp = Math.sin(view.pol), cp = Math.cos(view.pol);
    camera.position.set(view.dist * sp * Math.cos(view.az), view.dist * cp, view.dist * sp * Math.sin(view.az));
    camera.lookAt(0, 0, 0);
  }
  let drag = null;
  // 事件委托到 document：canvas 级监听在某些环境（指针捕获/无头）不可靠
  window.__dbg = [];
  const dbg = m => { if (window.__dbg.length < 40) window.__dbg.push(m); };
  document.addEventListener('pointerdown', e => {
    dbg('down target=' + (e.target && e.target.tagName));
    if (e.target !== canvas) return;
    drag = { x: e.clientX, y: e.clientY, moved: 0, t: performance.now() };
    dbg('down set drag');
  });
  document.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    view.az -= dx * 0.005;
    view.pol = Math.min(Math.PI - 0.08, Math.max(0.08, view.pol - dy * 0.005));
    drag.x = e.clientX; drag.y = e.clientY;
    dbg('move moved=' + drag.moved);
    cancelFly();
  });
  document.addEventListener('pointerup', e => {
    dbg('up target=' + (e.target && e.target.tagName) + ' drag=' + !!drag);
    if (!drag) return;
    const wasClick = drag.moved < 6 && performance.now() - drag.t < 500;
    const px = e.clientX, py = e.clientY;
    drag = null;
    dbg('wasClick=' + wasClick);
    if (wasClick && e.target === canvas) { dbg('calling pick'); pick(px, py); dbg('picked selected=' + selectedId); }
  });
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    view.dist = Math.min(90, Math.max(R + 1.3, view.dist * Math.exp(e.deltaY * 0.001)));
    cancelFly();
  }, { passive: false });
  document.addEventListener('dblclick', e => { if (e.target === canvas) flyTo(HOME); });

  // ── 点击选国 ─────────────────────────────────────────────────
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let selectedId = null;
  const cardEl = document.getElementById('countryCard');
  function pick(px, py) {
    const r = canvas.getBoundingClientRect();
    ndc.x = ((px - r.left) / r.width) * 2 - 1;
    ndc.y = -((py - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObject(earth, false)[0];
    if (!hit) { select(null); return; }
    const local = earthGroup.worldToLocal(hit.point.clone());
    const lat = Math.asin(local.y / R) / D2R;
    const lon = Math.atan2(-local.z, local.x) / D2R;
    const f = countryAt(lat, lon);
    select(f, lat, lon);
  }
  function select(f, clat, clon) {
    selectedId = f ? f.id : null;
    highlightCountry(f);
    if (!f) { cardEl.style.display = 'none'; return; }
    const m = window.COUNTRY_META[f.id];
    const isEn = curLang === 'en';
    const dict = EARTH_I18N[curLang] || EARTH_I18N.zh;
    // 当地太阳时（按经度估算，真实时区含政治边界）
    const solar = ((time.utc + m.lon / 15) % 24 + 24) % 24;
    const hh = Math.floor(solar), mm = Math.floor((solar - hh) * 60);
    const tzGuess = Math.round(m.lon / 15);
    // 首都昼夜
    const capLocal = latLonToLocal(m.lat, m.lon, R).applyQuaternion(earthGroup.quaternion).normalize();
    const ndl = capLocal.dot(sunDir);
    const dayNight = ndl > 0.1 ? dict.card.day : ndl < -0.1 ? dict.card.night : dict.card.twilight;
    const dl = ASTRO.dayLength(m.lat, ASTRO.declination(time.N));
    const dlTxt = dl >= 24 ? dict.card.polarDay : dl <= 0 ? dict.card.polarNight
      : Math.floor(dl) + dict.card.hours + String(Math.round((dl % 1) * 60)).padStart(2, '0') + dict.card.mins;
    cardEl.style.display = 'block';
    const nameStr = isEn ? (m.en + ' <small>' + m.zh + '</small>') : (m.zh + ' <small>' + m.en + '</small>');
    const tzStr = dict.card.tzEst.replace('{tz}', (tzGuess >= 0 ? '+' : '') + tzGuess);
    cardEl.innerHTML =
      '<div class="cc-name">' + nameStr + '</div>' +
      '<div class="cc-row">' + dict.card.cap + '<b>' + (isEn ? (m.capEn || m.cap) : m.cap) + '</b></div>' +
      '<div class="cc-row">' + dict.card.cont + (isEn ? (m.contEn || m.cont) : m.cont) + '</div>' +
      '<div class="cc-row">' + dict.card.centroid + m.lat.toFixed(1) + '°, ' + m.lon.toFixed(1) + '°E</div>' +
      '<div class="cc-row">' + dict.card.solarTime + '<b>' + String(hh).padStart(2, '0') + ':' +
        String(mm).padStart(2, '0') + '</b>' + tzStr + '</div>' +
      '<div class="cc-row">' + dayNight + '　' + dict.card.todayDayLen + '<b>' + dlTxt + '</b></div>';
  }

  // ── 时间状态 ─────────────────────────────────────────────────
  const time = { N: 172, utc: 6, playing: true, speed: 3600 };

  // ── 相机飞行 ─────────────────────────────────────────────────
  let fly = null;
  function cancelFly() { fly = null; }
  function flyTo(target, dur) {
    let daz = target.az - view.az;
    daz = ((daz + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    fly = { from: { ...view }, to: { ...target, az: view.az + daz }, t: 0, dur: dur || 1.2 };
  }
  const tweens = [];
  const vis = { clouds: true, markers: true, atmo: true, grid: true, borders: true, labels: true };

  // ── 国际化词典 ───────────────────────────────────────────────
  const EARTH_I18N = {
    zh: {
      home: '首页',
      title: '旋转地球 · Rotating Earth<small>实时昼夜 / 四季 / 岁差 — 拖拽转视角 · 滚轮缩放</small>',
      reset: '⟲ 复位',
      qLab: '画质',
      help: '? 帮助',
      pipeHead: '📐 数据流水线',
      pipeRows: { raw: '原始读数', eq: '应用方程', calc: '逐步算术', res: '真实结果' },
      speed1: '×1 真实',
      speed3600: '×3600（1天=24秒）',
      lblUtc: '时刻',
      lblDate: '日期',
      chips: {
        clouds: '☁️ 云层',
        markers: '📐 轴线极圈',
        atmo: '🌫️ 大气',
        grid: '🕸 经纬网',
        borders: '🗺 国界',
        labels: '🏷 地名'
      },
      on: '开', off: '关',
      helpTitle: '🖐 怎么玩',
      helpTable: [
        ['拖拽 / 滚轮', '旋转视角 / 缩放'],
        ['1–5', '五个视角：昼夜 · 四季 · 自转 · 昼长 · 岁差'],
        ['日期滑块', '看四季：直射点移动、晨昏线倾斜'],
        ['时刻滑块', '拨动一天：看晨昏线扫过、城市灯亮起'],
        ['点击国家', '金色高亮 + 信息卡（当地时间/昼夜/昼长）'],
        ['推近', '分级显示海峡、运河、湖泊与国名标签'],
        ['×N', '时间加速倍率（×3600 = 1 天 24 秒）'],
        ['空格', '播放 / 暂停'],
        ['R / H', '复位视角 / 帮助']
      ],
      helpNote: `<b>真实数据标注</b>：地轴倾角 23.44°；恒星日 23h56m4s；赤道自转 465.1 m/s（1674 km/h）；
        岁差 25,772 年。昼夜贴图 = NASA Blue Marble；城市灯光 = NASA Black Marble（Suomi NPP，
        2012 合成）；云层为卫星快照（会以示意速度漂移，非实时气象）。
        太阳赤纬用 NOAA 近似公式（误差 &lt;1°）；直射经度忽略均时差（±16 分钟）。
        岁差演示速度夸大约千万倍。`,
      helpClose: '知道了',
      months: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
      dayUnit: '日',
      subsolar: '☀️ 直射点：',
      beijingDayLen: '⏳ 北京昼长 ',
      card: {
        cap: '🏛 首都：',
        cont: '🌍 大洲：',
        centroid: '📍 质心：',
        solarTime: '🕐 当地太阳时 ≈ ',
        tzEst: '（时区 ≈ UTC{tz}，按经度估算）',
        day: '☀️ 白天',
        night: '🌙 夜晚',
        twilight: '🌆 晨昏',
        todayDayLen: '⏳ 今日昼长 ',
        polarDay: '极昼',
        polarNight: '极夜',
        hours: '小时',
        mins: '分'
      }
    },
    en: {
      home: 'Home',
      title: 'Rotating Earth<small>Day/Night / Seasons / Precession — Drag to Rotate · Scroll to Zoom</small>',
      reset: '⟲ Reset',
      qLab: 'Quality',
      help: '? Help',
      pipeHead: '📐 Data Pipeline',
      pipeRows: { raw: 'Raw Reading', eq: 'Equation', calc: 'Stepwise Math', res: 'Published Result' },
      speed1: '×1 Real-Time',
      speed3600: '×3600 (1 day = 24s)',
      lblUtc: 'Time',
      lblDate: 'Date',
      chips: {
        clouds: '☁️ Clouds',
        markers: '📐 Axes & Circles',
        atmo: '🌫️ Atmosphere',
        grid: '🕸 Lat/Lon Grid',
        borders: '🗺 Borders',
        labels: '🏷 Labels'
      },
      on: 'On', off: 'Off',
      helpTitle: '🖐 Controls',
      helpTable: [
        ['Drag / Scroll', 'Rotate view / Zoom in & out'],
        ['1–5', 'Five vantage points: Day/Night · Seasons · Rotation · Day Length · Precession'],
        ['Date slider', 'Explore seasons: subsolar latitude shifts & terminator tilt'],
        ['Time slider', 'Scrub through a day: terminator sweep & night city lights'],
        ['Click country', 'Gold highlight + Country dossier (local solar time / day/night / day length)'],
        ['Zoom in', 'Hierarchical discovery of straits, canals, lakes, and country labels'],
        ['×N', 'Time acceleration rate (×3600 = 1 day per 24 seconds)'],
        ['Space', 'Play / Pause'],
        ['R / H', 'Reset camera view / Help modal']
      ],
      helpNote: `<b>Astrophysical Data Reference</b>: Axial tilt ε = 23.44°; Sidereal day = 23h56m4s; Equatorial speed = 465.1 m/s (1,674 km/h); Axial precession cycle = 25,772 years.
        Day & night surface textures from NASA Blue Marble & Black Marble (Suomi NPP 2012 composite).
        Subsolar coordinates computed via NOAA solar algorithms (<1° error).
        Axial precession animation speed is exaggerated for visual clarity.`,
      helpClose: 'Got it',
      months: ['Jan ','Feb ','Mar ','Apr ','May ','Jun ','Jul ','Aug ','Sep ','Oct ','Nov ','Dec '],
      dayUnit: '',
      subsolar: '☀️ Subsolar: ',
      beijingDayLen: '⏳ Beijing Day Length: ',
      card: {
        cap: '🏛 Capital: ',
        cont: '🌍 Continent: ',
        centroid: '📍 Centroid: ',
        solarTime: '🕐 Local Solar Time ≈ ',
        tzEst: ' (Approx. UTC{tz}, solar longitude estimate)',
        day: '☀️ Daytime',
        night: '🌙 Night',
        twilight: '🌆 Twilight',
        todayDayLen: '⏳ Today\'s Day Length: ',
        polarDay: 'Midnight Sun (24h)',
        polarNight: 'Polar Night (0h)',
        hours: 'h ',
        mins: 'm'
      }
    }
  };

  // ── 面板 ─────────────────────────────────────────────────────
  const panelEl = document.getElementById('panel');
  const pipeEl = document.getElementById('pipe');
  const statusEl = document.getElementById('status');
  function setPanel(html) { panelEl.innerHTML = html; }
  function setPipe(st) {
    const dict = EARTH_I18N[curLang] || EARTH_I18N.zh;
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

  // ── 功能定义 ─────────────────────────────────────────────────
  const FEATURES = [
    { id: 'daynight',
      btn: { zh: '🌙 昼夜与晨昏线', en: '🌙 Day & Night' }, key: '1',
      cam: { az: 0.55, pol: 1.5, dist: 21 },
      panel: {
        zh: `<h3>🌙 地球的昼与夜</h3>
        <p>太阳只照亮地球的一半。明暗分界线叫<b>晨昏线</b>——因为大气散射，它是
        柔和的渐变带（能看到日出日落的暖色）。</p>
        <p>转到夜半球的暗处，能看到<b>城市的灯光</b>——NASA Suomi NPP 卫星
        2012 年的真实灯光合成图。</p>
        <p>🖱 <b>点击任何国家</b>试试：高亮 + 信息卡（当地现在几点、白天还是晚上）。</p>`,
        en: `<h3>🌙 Earth's Day & Night</h3>
        <p>The Sun illuminates exactly half of our planet at any moment. The division between day and night is the <b>solar terminator</b>—rendered with soft Rayleigh atmospheric twilight transitions (dawn and dusk hues).</p>
        <p>Orbit toward the night hemisphere to observe human civilization: <b>city night lights</b> sourced from NASA Suomi NPP satellite telemetry.</p>
        <p>🖱 <b>Click any country</b> to inspect: interactive golden boundary highlight + real-time local solar time & illumination state.</p>`
      },
      pipe: {
        zh: {
          raw: 'UTC 时刻 t → 太阳直射经度 = 180° − 15°·t',
          eq: '晨昏线 = 垂直于日地连线的大圆；直射点纬度 = 太阳赤纬 δ',
          calc: '12:00 UTC 时直射经度 = <b>0°</b>（格林尼治正午）；0:00 UTC 直射 180°',
          res: '地球一小时自转 15°——时区就是这样划出来的（每 15° 一个时区）'
        },
        en: {
          raw: 'UTC time t → Subsolar longitude = 180° − 15°·t',
          eq: 'Terminator = great circle orthogonal to Sun-Earth vector; subsolar latitude = solar declination δ',
          calc: 'At 12:00 UTC subsolar longitude = <b>0°</b> (Greenwich solar noon); at 0:00 UTC subsolar is 180°',
          res: 'Earth rotates 15° per hour—the foundational physical origin of worldwide standard time zones (15°/zone)'
        }
      }
    },

    { id: 'season',
      btn: { zh: '🍂 四季与地轴倾角', en: '🍂 Seasons & Axial Tilt' }, key: '2',
      cam: { az: -0.6, pol: 0.85, dist: 28.5 },
      panel: {
        zh: `<h3>🍂 四季不是离太阳远近造成的</h3>
        <p>地轴相对公转轨道面倾斜 <b>23.44°</b>，方向在空间中基本不变。
        所以夏天太阳直射北半球（δ=+23.44°），冬天直射南半球。</p>
        <p>关键冷知识：地球<b>1 月初离太阳最近</b>（近日点 1.471 亿 km）——
        北半球的冬天反而更近！四季由<b>倾角</b>主导，不是距离。</p>
        <p>↓ 拖动"日期"滑块，看直射点纬度和晨昏线怎么变。</p>`,
        en: `<h3>🍂 Seasons: Tilt, Not Distance</h3>
        <p>Earth's rotational axis is tilted <b>23.44°</b> relative to its orbital plane (ecliptic), fixed toward Polaris in space. Consequently, the subsolar point oscillates between the Tropic of Cancer (+23.44° in June) and Tropic of Capricorn (−23.44° in December).</p>
        <p>Vital counter-intuitive fact: Earth reaches <b>perihelion (closest to the Sun, 147.1M km) in early January</b>—meaning the Northern Hemisphere winter occurs when we are closest to the Sun! Seasons are governed by <b>axial tilt</b>, not orbital distance.</p>
        <p>↓ Drag the Date slider to observe subsolar latitude migrations and terminator tilt.</p>`
      },
      pipe: {
        zh: {
          raw: '一年中的第 N 天（N=80 春分，172 夏至，266 秋分，355 冬至）',
          eq: '太阳赤纬 <b>δ = −23.44°·cos(360°/365 × (N+10))</b>（NOAA 近似，误差 <1°）',
          calc: 'N=172：δ ≈ <b>+23.44°</b>；N=80 → ≈0°',
          res: '夏至北半球昼最长；但地球 1 月初过近日点（1.471 亿 km），偏心率仅 0.0167'
        },
        en: {
          raw: 'Day of year N (N=80 Equinox, 172 Solstice, 266 Equinox, 355 Solstice)',
          eq: 'Solar declination <b>δ = −23.44°·cos(360°/365 × (N+10))</b> (NOAA algorithm, error <1°)',
          calc: 'At N=172 (Jun 21): δ ≈ <b>+23.44°</b>; at N=80: δ ≈ 0°',
          res: 'Summer solstice yields longest Northern daylight; yet Earth passes perihelion in January due to slight eccentricity (e=0.0167)'
        }
      }
    },

    { id: 'spin',
      btn: { zh: '🌀 自转与线速度', en: '🌀 Earth Rotation' }, key: '3',
      cam: { az: 0.4, pol: 1.32, dist: 18.6 },
      panel: {
        zh: `<h3>🌀 你正坐在超音速的旋转木马上</h3>
        <p>地球自转一圈（相对恒星）只要 <b>23 小时 56 分 4 秒</b>——
        为什么一天是 24 小时？因为太阳也在动：自转完还要多转约 1° 才能再对准太阳。</p>
        <p>赤道地表速度 <b>465 m/s（1674 km/h）</b>，是音速的 1.4 倍——
        我们毫无感觉，因为空气和你一起在转（惯性）。</p>`,
        en: `<h3>🌀 Supersonic Carousel</h3>
        <p>A true sidereal rotation takes <b>23 hours, 56 minutes, 4.1 seconds</b>. Why is a solar day 24 hours? Because Earth progresses along its orbit, requiring an extra ~0.986° rotation to bring the Sun back overhead.</p>
        <p>Equatorial surface speed reaches <b>465.1 m/s (1,674 km/h)</b>—1.36× the speed of sound. We feel motionless because the atmosphere and reference frame co-rotate with us.</p>`
      },
      pipe: {
        zh: {
          raw: '纬度 φ（赤道 0°，北京 40°N）',
          eq: '线速度 <b>v = 465.1 · cos φ</b> m/s',
          calc: '北京：465.1 × cos 40° = <b>356 m/s ≈ 1283 km/h</b>；极点 = 0（原地打转）',
          res: '向东发射火箭省燃料：赤道自转 1674 km/h 是免费的速度加成（法属圭亚那航天中心建在赤道附近）'
        },
        en: {
          raw: 'Latitude φ (Equator 0°, Beijing 40°N)',
          eq: 'Linear velocity <b>v = 465.1 · cos φ</b> m/s',
          calc: 'Beijing: 465.1 × cos(40°) = <b>356 m/s ≈ 1,283 km/h</b>; Poles = 0 m/s',
          res: 'Launching orbital rockets eastward reaps Earth\'s free rotational velocity bonus (e.g. Guiana Space Centre near equator)'
        }
      }
    },

    { id: 'daylen',
      btn: { zh: '⏳ 昼夜长短与极昼', en: '⏳ Day Length & Polar Day' }, key: '4',
      cam: { az: 0.15, pol: 1.1, dist: 24 },
      panel: {
        zh: `<h3>⏳ 白天为什么夏天长？</h3>
        <p>纬度越高，倾斜的地轴让它在夏天泡在日照里的时间越长。
        <b>点击高纬度的国家</b>（挪威、加拿大、俄罗斯北部）看昼长读数；
        再把日期拨到 12 月——它们变成极夜。</p>
        <p>北极圈（66.56°N）以上出现<b>极昼/极夜</b>。</p>`,
        en: `<h3>⏳ Why Are Summer Days Longer?</h3>
        <p>Higher latitudes dip deeper into the illuminated hemisphere during their respective summer. <b>Click high-latitude countries</b> (Norway, Canada, northern Russia) to inspect real-time calculated day length; scrub the date to December to observe polar night.</p>
        <p>Regions beyond the Polar Circles (±66.56°) experience continuous <b>24-hour midnight sun or polar night</b>.</p>`
      },
      pipe: {
        zh: {
          raw: '纬度 φ + 太阳赤纬 δ（随日期）',
          eq: '半昼弧 <b>cos H = −tan φ · tan δ</b>；昼长 = 2H/15 小时',
          calc: '北京夏至：cos H = −tan40°·tan23.44° = −0.364 → H = 111.3° → <b>14.85 h</b>',
          res: '|−tanφtanδ| ≥ 1 时出现<b>极昼/极夜</b>——边界正是 ±66.56°（= 90° − 23.44°）的极圈'
        },
        en: {
          raw: 'Latitude φ + Solar declination δ (date-dependent)',
          eq: 'Semi-diurnal arc <b>cos H = −tan φ · tan δ</b>; Day length = 2H / 15 hours',
          calc: 'Beijing summer solstice: cos H = −tan(40°)·tan(23.44°) = −0.364 → H = 111.3° → <b>14.85 h</b>',
          res: 'When |−tanφ·tanδ| ≥ 1, perpetual <b>Midnight Sun or Polar Night</b> occurs; boundary is ±66.56° (90° − 23.44°)'
        }
      }
    },

    { id: 'prec',
      btn: { zh: '💫 岁差（2.6 万年）', en: '💫 Precession (26k yr)' }, key: '5',
      cam: { az: -0.8, pol: 0.7, dist: 33 },
      panel: {
        zh: `<h3>💫 地轴像陀螺一样晃</h3>
        <p>地轴不只倾斜，指向还在缓慢画圈（像转动的陀螺），一圈要
        <b>25,772 年</b>（每年 50.3 角秒）。</p>
        <p>所以北极星不固定：现在是<b>勾陈一（Polaris）</b>，古埃及时代是天龙座 α；
        约 <b>13,700 年后</b>织女星接任。</p>
        <p>⚠ 本页晃动速度<b>夸大约千万倍</b>——真实岁差肉眼不可察觉。</p>`,
        en: `<h3>💫 Gyroscopic Axial Precession</h3>
        <p>Earth's axis does not point statically in deep space; tidal torque from the Sun and Moon causes it to trace a slow <b>25,772-year gyroscopic cone</b> (~50.3 arcseconds annually).</p>
        <p>Thus the North Celestial Pole wanders: currently near <b>Polaris (Alpha Ursae Minoris)</b>; during ancient Egyptian pyramid construction it pointed near Thuban (Alpha Draconis); in ~13,700 years, Vega will take the mantle.</p>
        <p>⚠ The wobble in this mode is accelerated ~10 million times for visual comprehension.</p>`
      },
      pipe: {
        zh: {
          raw: '夜空长期观测：北极星"漂移"（喜帕恰斯，公元前 2 世纪发现）',
          eq: '岁差速率 ≈ <b>50.3″/年</b> → 一圈 360° ÷ 50.3″/年 ≈ 25,772 年',
          calc: '春分点每年西移 50.3″ → 星座"日期"每 71.6 年偏 1°',
          res: '公元前 2800 年 Thuban 是北极星；公元 13700 年前后 Vega 接任——"北极星"只是轮班岗位'
        },
        en: {
          raw: 'Long-term astronomical records: equinoctial drift discovered by Hipparchus (2nd century BCE)',
          eq: 'Precession rate ≈ <b>50.3″/year</b> → full 360° circuit ≈ 25,772 years',
          calc: 'Vernal equinox point drifts westward 50.3″/year → Zodiacal alignment shifts 1° every 71.6 years',
          res: 'In 2800 BCE Thuban was the pole star; in 13,700 CE Vega will serve—the "North Star" is a temporary cosmic appointment'
        }
      }
    }
  ];

  // ── UI ───────────────────────────────────────────────────────
  const featBar = document.getElementById('featBar');
  FEATURES.forEach(f => {
    const b = document.createElement('button');
    b.className = 'feat-btn';
    b.textContent = f.btn[curLang] || f.btn.zh;
    b.addEventListener('click', () => activate(f));
    featBar.appendChild(b);
  });
  let active = null;
  function activate(f) {
    active = f;
    flyTo(f.cam);
    document.querySelectorAll('.feat-btn').forEach((b, i) =>
      b.classList.toggle('on', FEATURES[i] === f));
    const lang = curLang;
    setPanel((f.panel && f.panel[lang]) ? f.panel[lang] : (f.panel && f.panel.zh ? f.panel.zh : f.panel));
    setPipe((f.pipe && f.pipe[lang]) ? f.pipe[lang] : (f.pipe && f.pipe.zh ? f.pipe.zh : f.pipe));
  }

  function updatePhysChips() {
    const dict = EARTH_I18N[curLang] || EARTH_I18N.zh;
    document.querySelectorAll('[data-vis]').forEach(c => {
      const k = c.dataset.vis;
      const name = dict.chips[k] || k;
      c.innerHTML = name + '：' + (vis[k] ? dict.on : dict.off);
    });
  }

  function mountChips() {
    document.querySelectorAll('[data-vis]').forEach(c => {
      c.addEventListener('click', () => {
        const k = c.dataset.vis;
        vis[k] = !vis[k];
        c.classList.toggle('on', vis[k]);
        if (k === 'clouds') clouds.visible = vis.clouds;
        if (k === 'markers') markerGroup.visible = vis.markers;
        if (k === 'atmo') atmo.visible = vis.atmo;
        if (k === 'grid') gridGroup.visible = vis.grid;
        if (k === 'borders') bordersGroup.visible = vis.borders;
        if (k === 'labels') { labelLayer.style.display = vis.labels ? 'block' : 'none'; }
        updatePhysChips();
      });
    });
    updatePhysChips();
  }
  const utcSlider = document.getElementById('utcSlider');
  const dateSlider = document.getElementById('dateSlider');
  const playBtn = document.getElementById('playBtn');
  function fmtUtc(h) {
    const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
    return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
  }
  const MDAYS = [31,28,31,30,31,30,31,31,30,31,30,31];
  function dateFromN(N) {
    let d = N, m = 0;
    while (d > MDAYS[m]) { d -= MDAYS[m]; m++; }
    const dict = EARTH_I18N[curLang] || EARTH_I18N.zh;
    const mStr = dict.months[Math.min(m, 11)];
    const dStr = Math.min(d, 31) + dict.dayUnit;
    return mStr + dStr;
  }
  function syncTimeUI() {
    utcSlider.value = time.utc;
    dateSlider.value = time.N;
    document.getElementById('utcVal').textContent = fmtUtc(time.utc) + ' UTC';
    document.getElementById('dateVal').textContent =
      dateFromN(time.N) + ' · ' + ASTRO.seasonLabel(time.N, curLang) + ' (N=' + time.N + ')';
  }
  playBtn.addEventListener('click', () => {
    time.playing = !time.playing;
    playBtn.textContent = time.playing ? '⏸' : '▶';
  });
  utcSlider.addEventListener('input', () => { time.utc = +utcSlider.value; time.playing = false;
    playBtn.textContent = '▶'; });
  dateSlider.addEventListener('input', () => { time.N = +dateSlider.value; });
  document.querySelectorAll('[data-speed]').forEach(c => {
    c.addEventListener('click', () => {
      time.speed = +c.dataset.speed; time.playing = true;
      playBtn.textContent = '⏸';
      document.querySelectorAll('[data-speed]').forEach(x => x.classList.toggle('on', x === c));
    });
  });

  function setLang(lang) {
    if (lang !== 'zh' && lang !== 'en') return;
    curLang = lang;
    window.APP_LANG = lang;
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

    const dict = EARTH_I18N[lang] || EARTH_I18N.zh;
    const titleEl = document.getElementById('title');
    if (titleEl) titleEl.innerHTML = dict.title;
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) resetBtn.textContent = dict.reset;
    const qLab = document.getElementById('qLab');
    if (qLab) qLab.textContent = dict.qLab;
    const helpBtn = document.getElementById('helpBtn');
    if (helpBtn) helpBtn.textContent = dict.help;
    const pipeHead = document.getElementById('pipeHead');
    if (pipeHead) pipeHead.textContent = dict.pipeHead;

    const speed1 = document.getElementById('speed1');
    if (speed1) speed1.textContent = dict.speed1;
    const speed3600 = document.getElementById('speed3600');
    if (speed3600) speed3600.textContent = dict.speed3600;

    const lblUtc = document.getElementById('lblUtc');
    if (lblUtc) {
      const b = document.getElementById('utcVal');
      const input = document.getElementById('utcSlider');
      lblUtc.innerHTML = dict.lblUtc + ' ';
      if (input) lblUtc.appendChild(input);
      if (b) lblUtc.appendChild(b);
    }
    const lblDate = document.getElementById('lblDate');
    if (lblDate) {
      const b = document.getElementById('dateVal');
      const input = document.getElementById('dateSlider');
      lblDate.innerHTML = dict.lblDate + ' ';
      if (input) lblDate.appendChild(input);
      if (b) lblDate.appendChild(b);
    }

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

    for (const L of labels) {
      if (L.el) {
        L.el.textContent = lang === 'en' ? (L.enName || L.name) : L.name;
      }
    }

    updatePhysChips();
    syncTimeUI();

    if (active) {
      setPanel((active.panel && active.panel[lang]) ? active.panel[lang] : (active.panel && active.panel.zh ? active.panel.zh : active.panel));
      setPipe((active.pipe && active.pipe[lang]) ? active.pipe[lang] : (active.pipe && active.pipe.zh ? active.pipe.zh : active.pipe));
    }
    if (selectedId) {
      const f = window.COUNTRY_GEO ? window.COUNTRY_GEO.features.find(x => x.id === selectedId) : null;
      if (f) select(f);
    }
  }

  // ── 标签投影（每帧）──────────────────────────────────────────
  const tmpV = new THREE.Vector3();
  function updateLabels() {
    const r = canvas.getBoundingClientRect();
    for (const L of labels) {
      if (!L.el) {                                        // 国家标签：进入显示范围才创建 DOM
        if (view.dist > L.maxDist) continue;
        L.el = document.createElement('div');
        L.el.className = 'geo-label country';
        L.el.textContent = L.name;
        labelLayer.appendChild(L.el);
      }
      const world = L.anchor.clone().applyQuaternion(earthGroup.quaternion);
      const camDir = camera.position.clone().sub(world).normalize();
      const facing = world.clone().normalize().dot(camDir);
      tmpV.copy(world).project(camera);
      const behind = tmpV.z > 1;
      let show = facing > 0.08 && !behind;
      if (show) {
        const tierMax = L.tier ? TIERS.find(t => t[0] === L.tier)[1] : L.maxDist;
        if (view.dist > tierMax) show = false;
      }
      if (!show || !vis.labels) { L.el.style.display = 'none'; continue; }
      L.el.style.display = 'block';
      L.el.style.left = ((tmpV.x + 1) / 2 * r.width) + 'px';
      L.el.style.top = ((1 - (tmpV.y + 1) / 2) * r.height) + 'px';
    }
  }

  // ── 主循环 ───────────────────────────────────────────────────
  let last = performance.now() / 1000;
  let fpsN = 0, fpsT = 0, statusT = 0;
  let cloudDrift = 0;
  let precWobble = 0, precActive = false;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const qTilt = new THREE.Quaternion(), qSpin = new THREE.Quaternion();
  const YAXIS = new THREE.Vector3(0, 1, 0);
  function doResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', doResize);
  doResize();

  function loop() {
    requestAnimationFrame(loop);
    const now = performance.now() / 1000;
    const dt = Math.min(0.05, now - last); last = now;
    if (time.playing && !reducedMotion) {
      time.utc += dt * time.speed / 3600;
      while (time.utc >= 24) { time.utc -= 24; time.N = time.N % 365 + 1; }
    }
    if (precActive && !reducedMotion) precWobble += dt * 0.45;
    if (fly) {
      fly.t += dt;
      const k = Math.min(1, fly.t / fly.dur);
      const e = k < 0.5 ? 4*k*k*k : 1 - Math.pow(-2*k + 2, 3) / 2;
      view.az = fly.from.az + (fly.to.az - fly.from.az) * e;
      view.pol = fly.from.pol + (fly.to.pol - fly.from.pol) * e;
      view.dist = fly.from.dist + (fly.to.dist - fly.from.dist) * e;
      if (k >= 1) fly = null;
    }
    // 地轴 + 自转
    const axis = ASTRO.axisDir(time.N);
    const psi0 = Math.PI / 2 - ASTRO.solarLongitude(time.N) * D2R;
    if (precActive && !reducedMotion) {
      const psi = psi0 + precWobble;
      const t = ASTRO.TILT * D2R;
      axis[0] = Math.sin(t) * Math.cos(psi); axis[2] = Math.sin(t) * Math.sin(psi);
    }
    const axisV = new THREE.Vector3(...axis).normalize();
    qTilt.setFromUnitVectors(YAXIS, axisV);
    const s = ASTRO.spinAngle(time.N, time.utc);
    qSpin.setFromAxisAngle(YAXIS, s);
    earthGroup.quaternion.copy(qTilt).multiply(qSpin);
    // 云层微漂移（+12°/天，示意急流）
    if (time.playing && !reducedMotion)
      cloudDrift += dt * time.speed * (12 / 24) * D2R / 3600;
    const qSpinC = new THREE.Quaternion().setFromAxisAngle(YAXIS, s + cloudDrift);
    cloudGroup.quaternion.copy(qTilt).multiply(qSpinC);
    applyCam();
    // 国界随推近增强（近看以矢量国界为主，贴图只作底色）
    const bMat = bordersGroup.children[0].material;
    bMat.opacity = Math.min(0.6, 0.16 + 7 / view.dist);
    renderer.render(scene, camera);
    updateLabels();
    // FPS / 状态条
    fpsN++; fpsT += dt;
    if (fpsT >= 0.5) {
      document.getElementById('fps').textContent = Math.round(fpsN / fpsT) + ' fps';
      fpsN = 0; fpsT = 0;
    }
    statusT += dt;
    if (statusT >= 0.25) {
      statusT = 0;
      const dec = ASTRO.declination(time.N);
      const dict = EARTH_I18N[curLang] || EARTH_I18N.zh;
      statusEl.innerHTML =
        '📅 ' + dateFromN(time.N) + '（N=' + time.N + '）· ' + ASTRO.seasonLabel(time.N, curLang) +
        '　🕰 ' + fmtUtc(time.utc) + ' UTC' +
        '　' + dict.subsolar + '<b>' + (dec >= 0 ? '+' : '') + dec.toFixed(2) + '°</b>, ' +
        ASTRO.subsolarLon(time.utc).toFixed(1) + '°E' +
        '　' + dict.beijingDayLen + '<b>' + (function () {
          const dl = ASTRO.dayLength(40, dec);
          return Math.floor(dl) + 'h' + String(Math.round((dl % 1) * 60)).padStart(2, '0') + 'm';
        })() + '</b>';
      syncTimeUI();
    }
  }

  // ── 帮助 / 复位 ──────────────────────────────────────────────
  function toggleHelp(force) {
    const h = document.getElementById('help');
    const show = force !== undefined ? force : h.style.display !== 'flex';
    h.style.display = show ? 'flex' : 'none';
  }
  document.getElementById('helpBtn').addEventListener('click', () => toggleHelp());
  document.getElementById('helpClose').addEventListener('click', () => toggleHelp(false));
  document.getElementById('resetBtn').addEventListener('click', () => flyTo(HOME));
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    const f = FEATURES.find(x => x.key === e.key);
    if (f) activate(f);
    else if (e.key === 'r' || e.key === 'R') flyTo(HOME);
    else if (e.key === ' ') { e.preventDefault(); playBtn.click(); }
    else if (e.key === 'h' || e.key === 'H') toggleHelp();
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
  mountChips();
  document.querySelector('[data-speed="3600"]').classList.add('on');
  activate(FEATURES[0]);
  setLang(curLang);
  loop();
  // 画质 UI + 启动时升级到保存档
  document.querySelectorAll('.q2').forEach(b => {
    const q = b.dataset.q;
    b.classList.toggle('on', q === quality.cur);
    if (!quality.available(q)) { b.disabled = true; b.title = '当前设备不支持'; }
    b.addEventListener('click', () => quality.set(q).then(() =>
      document.querySelectorAll('.q2').forEach(x => x.classList.toggle('on', x.dataset.q === quality.cur))));
  });
  const saved = quality.saved;
  if (saved !== '2k' && quality.available(saved)) quality.set(saved);

  // 验收/调试钩子
  window.__earthState = () => {
    const dec = ASTRO.declination(time.N);
    const capLocal = latLonToLocal(40, 116, R).applyQuaternion(earthGroup.quaternion).normalize();
    return {
      N: time.N, utc: +time.utc.toFixed(3), decl: +dec.toFixed(3),
      subsolarLon: +ASTRO.subsolarLon(time.utc).toFixed(2),
      beijingNdl: +capLocal.dot(sunDir).toFixed(3),
      beijingDayLen: +ASTRO.dayLength(40, dec).toFixed(2),
      selected: selectedId,
      playing: time.playing, speed: time.speed,
      az: +view.az.toFixed(3), pol: +view.pol.toFixed(3), dist: +view.dist.toFixed(3),
      R
    };
  };
  window.__pickAt = (lat, lon) => { const f = countryAt(lat, lon); return f ? f.id : null; };
  window.__pickPx = (px, py) => {
    const r = canvas.getBoundingClientRect();
    ndc.x = ((px - r.left) / r.width) * 2 - 1;
    ndc.y = -((py - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObject(earth, false)[0];
    if (!hit) return { step: 'raycast', hit: false };
    const local = earthGroup.worldToLocal(hit.point.clone());
    const lat = Math.asin(local.y / R) / D2R;
    const lon = Math.atan2(-local.z, local.x) / D2R;
    const f = countryAt(lat, lon);
    return { step: 'ok', lat: +lat.toFixed(2), lon: +lon.toFixed(2), id: f ? f.id : null };
  };
  window.__project = (lat, lon) => {
    const w = latLonToLocal(lat, lon, R).applyQuaternion(earthGroup.quaternion);
    const v = w.clone().project(camera);
    const r = canvas.getBoundingClientRect();
    return { x: Math.round((v.x + 1) / 2 * r.width), y: Math.round((1 - (v.y + 1) / 2) * r.height),
             facing: w.clone().normalize().dot(camera.position.clone().sub(w).normalize()) };
  };
});
