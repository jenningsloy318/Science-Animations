// ═══════════════════════════════════════════════════════════════
// space.js — 视图③从树木到星空：恒星周年视差
//
// 同一几何：观察者平移 → 近物相对远背景偏移。把"车"换成地球（公转
// 基线 2 AU），"大树"换成邻近恒星，"远山"换成背景星场。
// 诚实标注：星距被压缩了 ~10¹⁵ 倍才能"看见"视差角；真实 61 Cygni
// 视差只有 0.286″——相当于看 10 km 外的一枚硬币。
// ═══════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { pcFromArcsec, pcToLy, BESSEL_61CYG_ARCSEC, MODERN_61CYG_ARCSEC, PROXIMA_ARCSEC } from './parallax.js';

function radialSprite(inner, outer) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 2, 64, 64, 64);
  gr.addColorStop(0, inner); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(cv);
}

export function buildSpace(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050811);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 4000);
  camera.position.set(-70, 24, -62);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 8; controls.maxDistance = 160;

  // ── 背景星场（"无穷远"的参照物）──
  {
    const N = 2400, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2;
      const r = 900 + Math.random() * 300, s = Math.sqrt(1 - u * u);
      pos[i * 3] = r * s * Math.cos(th); pos[i * 3 + 1] = r * u * 0.8; pos[i * 3 + 2] = r * s * Math.sin(th);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({
      color: 0xcfd8ec, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.85, fog: false,
    })));
  }

  // ── 太阳 ──
  const sun = new THREE.Mesh(new THREE.SphereGeometry(2.1, 24, 18),
    new THREE.MeshBasicMaterial({ color: 0xffd98a }));
  scene.add(sun);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radialSprite('rgba(255,214,130,0.9)', 'rgba(255,180,80,0)'), depthWrite: false, fog: false,
  }));
  glow.scale.setScalar(7); scene.add(glow);

  // ── 地球轨道 ──
  const ORBIT_R = 13;
  {
    const pts = [];
    for (let i = 0; i <= 128; i++) {
      const a = i / 128 * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * ORBIT_R, 0, Math.sin(a) * ORBIT_R));
    }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0x3a4a6a, transparent: true, opacity: 0.7 })));
  }

  const earth = new THREE.Mesh(new THREE.SphereGeometry(0.62, 20, 14),
    new THREE.MeshStandardMaterial({ color: 0x4f8fd9, roughness: 0.55, metalness: 0.05 }));
  scene.add(earth);
  scene.add(new THREE.HemisphereLight(0x8899cc, 0x0a0d18, 0.7));
  const sunL = new THREE.PointLight(0xffe0b0, 2.2, 300); scene.add(sunL);

  // ── 目标恒星 61 Cygni（距离被压缩）──
  const starDir = new THREE.Vector3(-0.62, 0.3, 0.72).normalize();
  const STAR_R = 46;
  const star = new THREE.Mesh(new THREE.SphereGeometry(1.05, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xffe9b0 }));
  const starBase = starDir.clone().multiplyScalar(STAR_R);
  star.position.copy(starBase); scene.add(star);
  const starGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radialSprite('rgba(255,233,176,0.95)', 'rgba(255,220,150,0)'), depthWrite: false, fog: false,
  }));
  starGlow.scale.setScalar(7); scene.add(starGlow);
  starGlow.position.copy(starBase);

  // ── 六月/十二月两颗"基线"幽灵地球（±轨道半径 ⊥ 视线方向）──
  const perp = new THREE.Vector3().crossVectors(starDir, new THREE.Vector3(0, 1, 0)).normalize();
  const ghostMat = new THREE.MeshBasicMaterial({ color: 0x4f8fd9, transparent: true, opacity: 0.28 });
  const ghostA = new THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 10), ghostMat);
  const ghostB = ghostA.clone();
  ghostA.position.copy(perp).multiplyScalar(ORBIT_R);
  ghostB.position.copy(perp).multiplyScalar(-ORBIT_R);
  scene.add(ghostA, ghostB);
  const baseline = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([ghostA.position, ghostB.position]),
    new THREE.LineDashedMaterial({ color: 0xe8b84b, dashSize: 0.7, gapSize: 0.5, transparent: true, opacity: 0.8 }));
  baseline.computeLineDistances(); scene.add(baseline);

  // ── 视线：地球 → 恒星 → 延伸到背景球面上的"视位置" ──
  const BG_R = 760;
  const sight = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
    new THREE.LineBasicMaterial({ color: 0xe8b84b, transparent: true, opacity: 0.85 }));
  const sightExt = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
    new THREE.LineDashedMaterial({ color: 0xfff1c4, dashSize: 6, gapSize: 5, transparent: true, opacity: 0.5 }));
  scene.add(sight, sightExt);

  const trueDirLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
    new THREE.LineDashedMaterial({ color: 0x8899bb, dashSize: 4, gapSize: 4, transparent: true, opacity: 0.5 }));
  scene.add(trueDirLine);

  // 视位置标记 + 轨迹（背景球上的小椭圆）
  const marker = new THREE.Mesh(new THREE.SphereGeometry(2.6, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xfff1c4 }));
  scene.add(marker);
  const tracePos = [];
  const traceGeo = new THREE.BufferGeometry();
  const trace = new THREE.Line(traceGeo, new THREE.LineBasicMaterial({
    color: 0xe8b84b, transparent: true, opacity: 0.9,
  }));
  scene.add(trace);

  // ── DOM 标签 ──
  const labelLayer = document.getElementById('labelLayer');
  const labels = [];
  function addLabel(text, color) {
    const el = document.createElement('div');
    el.className = 'mp-label'; el.dataset.view = 'space';
    el.innerHTML = `<span class="nm" style="color:${color}">${text}</span>`;
    labelLayer.appendChild(el); labels.push(el); return el;
  }
  const L = {
    sun: addLabel('☀ 太阳', '#ffd98a'), earth: addLabel('🌍 地球', '#7db8f0'),
    star: addLabel('⭐ 61 Cygni（目标，近）', '#ffe9b0'),
    ghost: addLabel('基线 2 AU（相隔 6 个月）', '#e8b84b'),
    marker: addLabel('背景星场 = "无穷远的远山"（视位置）', '#fff1c4'),
  };

  // ── 状态 ──
  const state = { theta: 0.9, perYear: 0.22, paused: false, showSight: true, showTrace: true };
  let lastTrace = null;

  // ── 面板（独立容器）──
  const panel = document.createElement('div');
  panel.className = 'viewpanel'; panel.dataset.view = 'space';
  document.getElementById('sidePanel').appendChild(panel);
  const lyB = pcToLy(pcFromArcsec(MODERN_61CYG_ARCSEC)).toFixed(1);
  const lyP = pcToLy(pcFromArcsec(PROXIMA_ARCSEC)).toFixed(2);
  panel.innerHTML = `
    <h2>把几何放大到银河系<small>周年视差</small></h2>
    <div class="formula">d(pc) = 1 / p(″)</div>
    <p class="note">地球公转就是那辆"车"：6 个月前后地球位于基线两端（<b>2 AU ≈ 3 亿 km</b>）。
    近距离恒星相对背景星场会画出一个小椭圆——这就是<b>恒星视差</b>。</p>
    <p class="note">1838 年贝塞尔测量 61 Cygni：p ≈ 0.31″（现代值 0.286″）→
    距离 ≈ <b>${lyB} 光年</b>。1 秒差距 = 视差 1″ 的距离 ≈ 3.26 光年。</p>
    <p class="note">最近的恒星比邻星 p = 0.77″ → ${lyP} 光年。
    <b>近 = 视差大 = 距离近</b>——和大树跑得快是同一条几何！</p>
    <p class="note">⚖️ 场景里星距被压缩了 ~10¹⁵ 倍才能看见视差；真实 0.286″
    相当于 10 km 外一枚硬币的张角。伽利略当年试图测它而不得——仪器精度不够。</p>
    <div class="facts">
      <div class="fact"><div class="fi">🐔</div><div class="ft">鸽子/鸡点头</div>
        <div class="fd">走路时头先"定住"再前伸——定住的那半拍就是纯平移，用运动视差测距（Friedman 1975, J. Exp. Biol.）。</div></div>
      <div class="fact"><div class="fi">🐝</div><div class="ft">蜜蜂光流调速</div>
        <div class="fd">蜜蜂保持视网膜流速恒定 → 离墙越近飞得越慢（v ∝ d 的逆用）；还靠积分光流"数"飞了多远（Srinivasan 等）。</div></div>
      <div class="fact"><div class="fi">🎬</div><div class="ft">移动 vs 变焦</div>
        <div class="fd">变焦把所有层等比放大（无视差）；摄影机移动才产生视差。希区柯克《迷魂记》的"眩晕镜头"就是两者反向叠加。</div></div>
      <div class="fact"><div class="fi">🤖</div><div class="ft">VR · SLAM</div>
        <div class="fd">研究表明运动视差可产生与双目立体感相当的深度知觉——VR 必须 6DoF 追踪头部平移；自动驾驶/SLAM 用同一几何估距。</div></div>
    </div>
  `;

  // ── 控制 ──
  const bar = document.createElement('div');
  bar.className = 'viewbar'; bar.dataset.view = 'space';
  document.getElementById('bottomBar').appendChild(bar);
  bar.innerHTML = `
    <div class="ctl"><label>公转速度</label>
      <input type="range" id="sV" min="0.05" max="1" step="0.01" value="0.22">
      <output id="sVOut">1 圈 ≈ 4.5 s</output></div>
    <button class="btn" id="sPause">⏸ 暂停</button>
    <button class="btn on" id="sSight">👁 视线</button>
    <button class="btn on" id="sTrace">〰 视位置轨迹</button>
  `;
  const sV = bar.querySelector('#sV'), sVOut = bar.querySelector('#sVOut');
  sV.addEventListener('input', () => {
    state.perYear = +sV.value;
    sVOut.textContent = `1 圈 ≈ ${(1 / state.perYear).toFixed(1)} s`;
  });
  bar.querySelector('#sPause').addEventListener('click', e => {
    state.paused = !state.paused;
    e.target.textContent = state.paused ? '▶ 继续' : '⏸ 暂停';
    e.target.classList.toggle('on', state.paused);
  });
  bar.querySelector('#sSight').addEventListener('click', e => {
    state.showSight = !state.showSight;
    sight.visible = sightExt.visible = trueDirLine.visible = state.showSight;
    e.target.classList.toggle('on', state.showSight);
  });
  bar.querySelector('#sTrace').addEventListener('click', e => {
    state.showTrace = !state.showTrace;
    trace.visible = state.showTrace; marker.visible = state.showTrace;
    e.target.classList.toggle('on', state.showTrace);
  });

  const V3a = new THREE.Vector3(), V3b = new THREE.Vector3();
  function update(dt) {
    if (!state.paused) state.theta += dt * state.perYear * Math.PI * 2;
    earth.position.set(Math.cos(state.theta) * ORBIT_R, 0, Math.sin(state.theta) * ORBIT_R);

    // 视线 地球→恒星，延伸到背景球
    V3a.copy(starBase).sub(earth.position).normalize();
    sight.geometry.attributes.position.setXYZ(0, earth.position.x, earth.position.y, earth.position.z);
    sight.geometry.attributes.position.setXYZ(1, starBase.x, starBase.y, starBase.z);
    sight.geometry.attributes.position.needsUpdate = true;
    sightExt.geometry.attributes.position.setXYZ(0, starBase.x, starBase.y, starBase.z);
    V3b.copy(earth.position).addScaledVector(V3a, BG_R);
    sightExt.geometry.attributes.position.setXYZ(1, V3b.x, V3b.y, V3b.z);
    sightExt.geometry.attributes.position.needsUpdate = true;
    sightExt.computeLineDistances();
    marker.position.copy(V3b);

    // "真方向"：太阳→恒星（对比视方向）
    trueDirLine.geometry.attributes.position.setXYZ(0, 0, 0, 0);
    trueDirLine.geometry.attributes.position.setXYZ(1, starDir.x * BG_R, starDir.y * BG_R, starDir.z * BG_R);
    trueDirLine.geometry.attributes.position.needsUpdate = true;
    trueDirLine.computeLineDistances();

    // 轨迹（每帧记录，最多 420 点）
    if (state.showTrace && (!state.paused || !lastTrace)) {
      const key = marker.position.toArray().map(v => v.toFixed(1)).join(',');
      if (key !== lastTrace) {
        lastTrace = key;
        tracePos.push(marker.position.clone());
        if (tracePos.length > 420) tracePos.shift();
        traceGeo.setFromPoints(tracePos);
      }
    }

    // 恒星微闪
    const tw = 1 + Math.sin(performance.now() * 0.004) * 0.08;
    starGlow.scale.setScalar(7 * tw);

    // 基线幽灵高亮：地球接近 ±perp 时
    const dp = earth.position.dot(perp);
    ghostMat.opacity = Math.abs(dp) > ORBIT_R * 0.82 ? 0.75 : 0.25;

    controls.update();
  }

  function placeLabels() {
    const w = labelLayer.clientWidth, h = labelLayer.clientHeight;
    function put(el, pos, dy = 0) {
      V3a.copy(pos).project(camera);
      if (V3a.z > 1) { el.style.display = 'none'; return; }
      el.style.display = '';
      el.style.left = ((V3a.x * 0.5 + 0.5) * w) + 'px';
      el.style.top = ((-V3a.y * 0.5 + 0.5) * h + dy) + 'px';
    }
    put(L.sun, sun.position, 26);
    put(L.earth, earth.position, -16);
    put(L.star, starBase, -16);
    put(L.ghost, ghostA.position, -34);
    put(L.marker, marker.position, -26);
  }

  function onResize(w, h) { camera.aspect = w / h; camera.updateProjectionMatrix(); }
  function getInfo() { return { view: 'space', theta: state.theta, paused: state.paused }; }

  return { scene, camera, update, placeLabels, onResize, getInfo, state, controls };
}
