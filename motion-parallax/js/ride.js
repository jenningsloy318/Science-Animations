// ═══════════════════════════════════════════════════════════════
// ride.js — 视图①乘车体验：黄金时刻的第一人称驾车场景
//
// 关键诚实点：浏览器透视渲染本身就是"近快远慢"——这里没有任何
// 伪造的"图层速度差"，远处物体慢是因为它在真实的 3D 里真的更远。
// 月亮每帧跟随相机 → 距离无穷远时视差为零，这正是物理本身。
// ═══════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { omegaExact, omegaPeak, toDegPerS, KMH_TO_MS, MOON_D_M } from './parallax.js';

const C = {
  tree: 0xe8b84b, house: 0x7dd3fc, hill: 0x6ee7b7,
  mountain: 0xc4b5fd, moon: 0xfff1c4,
};

function wrapX(u, P) { return ((u % P) + P * 1.5) % P - P / 2; }

function radialSprite(inner, outer) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  gr.addColorStop(0, inner); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(cv);
}

function makeTree(scale = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22 * scale, 0.34 * scale, 2.6 * scale, 7),
    new THREE.MeshLambertMaterial({ color: 0x6e4a2c }));
  trunk.position.y = 1.3 * scale; g.add(trunk);
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x4d7a3a });
  [[0, 3.4, 0, 2.1], [0.8, 2.9, 0.4, 1.5], [-0.7, 2.8, -0.5, 1.35]].forEach(([x, y, z, r]) => {
    const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(r * scale, 1), leafMat);
    blob.position.set(x * scale, y * scale, z * scale); g.add(blob);
  });
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.9 * scale, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02; g.add(shadow);
  return g;
}

function makePole() {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0x74655a });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 9, 6), mat);
  pole.position.y = 4.5; g.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 1.6), mat);
  arm.position.y = 8.4; g.add(arm);
  return g;
}

function makeHouse() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(9, 4.2, 7),
    new THREE.MeshLambertMaterial({ color: 0xcdb9a2 }));
  body.position.y = 2.1; g.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(6.4, 2.6, 4),
    new THREE.MeshLambertMaterial({ color: 0x9a4a3a }));
  roof.position.y = 5.5; roof.rotation.y = Math.PI / 4; g.add(roof);
  const win = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.3, 0.1),
    new THREE.MeshBasicMaterial({ color: 0xffe9ae }));
  win.position.set(2, 2.2, 3.55); g.add(win);
  return g;
}

export function buildRide(renderer) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xe8a76b, 380, 2500);

  const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 40000);

  // ── 天空穹顶（黄金时刻渐变）+ 太阳 ──
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(15000, 24, 14),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vP;
        void main(){
          float h = normalize(vP).y;
          vec3 zen = vec3(0.16, 0.27, 0.50);
          vec3 hor = vec3(1.00, 0.62, 0.34);
          vec3 col = mix(hor, zen, smoothstep(0.02, 0.42, h));
          col = mix(vec3(0.93,0.60,0.38), col, smoothstep(-0.08, 0.02, h));
          gl_FragColor = vec4(col, 1.0);
        }`,
    }));
  sky.renderOrder = -10; scene.add(sky);

  const sunDir = new THREE.Vector3(1, 0.16, 0.42).normalize();
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radialSprite('rgba(255,244,214,1)', 'rgba(255,190,90,0)'), fog: false, depthWrite: false,
  }));
  sun.scale.setScalar(5200); sun.position.copy(sunDir).multiplyScalar(13000);
  sun.renderOrder = -9; scene.add(sun);

  scene.add(new THREE.HemisphereLight(0xaec4ec, 0x54603f, 0.85));
  const dirL = new THREE.DirectionalLight(0xffd9a0, 1.7);
  dirL.position.copy(sunDir).multiplyScalar(100); scene.add(dirL);

  // ── 地面与道路 ──
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(26000, 26000),
    new THREE.MeshLambertMaterial({ color: 0x5e7040 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; scene.add(ground);

  const road = new THREE.Mesh(new THREE.PlaneGeometry(26000, 9.4),
    new THREE.MeshLambertMaterial({ color: 0x3d414b }));
  road.rotation.x = -Math.PI / 2; road.position.y = 0.01; scene.add(road);
  [-3.9, 3.9].forEach(z => {
    const edge = new THREE.Mesh(new THREE.BoxGeometry(26000, 0.02, 0.22),
      new THREE.MeshBasicMaterial({ color: 0xd8d4c8 }));
    edge.position.set(0, 0.03, z); scene.add(edge);
  });

  // ── 流动的车道虚线 ──
  const movers = []; // {obj, x0, P}
  const DASH_P = 12;
  for (let i = 0; i < 26; i++) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.32),
      new THREE.MeshBasicMaterial({ color: 0xe8e4d8 }));
    dash.rotation.x = -Math.PI / 2; dash.position.y = 0.04;
    scene.add(dash); movers.push({ obj: dash, x0: i * DASH_P, P: 26 * DASH_P });
  }

  // ── 路边装饰（不进 HUD）──
  for (let i = 0; i < 22; i++) {
    const t = makeTree(0.55 + Math.random() * 0.5);
    const side = Math.random() < 0.5 ? 1 : -1;
    const z = side * (6 + Math.random() * 22);
    t.position.set(0, 0, z); t.rotation.y = Math.random() * 6.28;
    scene.add(t); movers.push({ obj: t, x0: Math.random() * 300, P: 300 });
  }
  for (let i = 0; i < 14; i++) {
    const p = makePole();
    p.position.set(0, 0, 12.8); scene.add(p);
    movers.push({ obj: p, x0: i * 50, P: 700 });
  }

  // ── 主角（进 HUD 的五个"标尺物"）──
  const tree = makeTree(1.25); tree.position.set(0, 0, 10); scene.add(tree);
  movers.push({ obj: tree, x0: -70, P: 420 });
  const house = makeHouse(); house.position.set(0, 0, -60); scene.add(house);
  movers.push({ obj: house, x0: 160, P: 900 });

  const hillMat = new THREE.MeshLambertMaterial({ color: 0x55705e });
  const hill = new THREE.Mesh(new THREE.SphereGeometry(420, 24, 14), hillMat);
  hill.scale.set(1.5, 0.30, 1); hill.position.set(0, -14, 540); scene.add(hill);
  movers.push({ obj: hill, x0: -1100, P: 3600 });

  const mountain = new THREE.Mesh(new THREE.ConeGeometry(680, 540, 5),
    new THREE.MeshLambertMaterial({ color: 0x77688f }));
  mountain.position.set(0, 200, -2100); mountain.rotation.y = 0.5;
  scene.add(mountain);
  movers.push({ obj: mountain, x0: 900, P: 5200 });

  // 月亮：每帧跟随相机 → 无穷远零视差的物理事实
  const moonDir = new THREE.Vector3(0.72, 0.34, 0.58).normalize();
  const moon = new THREE.Mesh(new THREE.CircleGeometry(780, 28),
    new THREE.MeshBasicMaterial({ color: 0xf3ecd8, fog: false }));
  moon.renderOrder = -8; scene.add(moon);

  // ── 视线扇 ──
  const HEROES = [
    { key: 'tree', name: '大树', d: 10, color: C.tree, obj: tree, lh: 7 },
    { key: 'house', name: '房子', d: 60, color: C.house, obj: house, lh: 9 },
    { key: 'hill', name: '山丘', d: 540, color: C.hill, obj: hill, lh: 120 },
    { key: 'mountain', name: '高山', d: 2100, color: C.mountain, obj: mountain, lh: 480 },
    { key: 'moon', name: '月亮', d: MOON_D_M, color: C.moon, obj: moon, lh: 1000, isMoon: true },
  ];
  const fanGroup = new THREE.Group(); fanGroup.visible = false; scene.add(fanGroup);
  HEROES.forEach(h => {
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({
      color: h.color, transparent: true, opacity: 0.9, fog: false,
      depthTest: false,
    }));
    line.renderOrder = 999;
    fanGroup.add(line); h.fan = line;
  });

  // ── 小汽车（敞篷式，让驾驶位视野不被车身占满）──
  const car = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.62, 1.66),
    new THREE.MeshLambertMaterial({ color: 0xd9553f }));
  body.position.y = 0.62; car.add(body);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 1.5),
    new THREE.MeshLambertMaterial({ color: 0xb8432f }));
  hood.position.set(1.2, 0.96, 0); car.add(hood);
  const frameMat = new THREE.MeshLambertMaterial({ color: 0x2b303c });
  const pillarMat = new THREE.MeshLambertMaterial({ color: 0x454e60 });  // 石墨色：不硬剪影
  [[0.45, 1.42, 1.0], [0.45, 1.42, -1.0]].forEach(p => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.12), frameMat);
    m.position.set(...p); car.add(m);
  });
  // ── 前挡风玻璃（后掠式；A 柱贴座舱边缘，避免霸屏）──
  const wsBase = new THREE.Vector3(0.58, 1.02, 0.84);   // 底（座舱前缘）
  const wsTop = new THREE.Vector3(0.20, 1.75, 0.78);    // 顶（后掠）
  const slant = wsTop.clone().sub(wsBase);
  // 梯形玻璃：四角精确贴合开口，不超出横梁/立柱
  const gGeo = new THREE.BufferGeometry();
  const bl = [0.58, 1.03, 0.825], br = [0.58, 1.03, -0.825];
  const tl = [0.20, 1.745, 0.775], tr = [0.20, 1.745, -0.775];
  gGeo.setAttribute('position', new THREE.Float32BufferAttribute(
    [...bl, ...br, ...tl, ...br, ...tr, ...tl], 3));
  gGeo.computeVertexNormals();
  const glass = new THREE.Mesh(gGeo, new THREE.MeshBasicMaterial({
    color: 0xa8d8ff, transparent: true, opacity: 0.15,
    side: THREE.DoubleSide, depthWrite: false,
  }));
  glass.renderOrder = 2; car.add(glass);
  [1, -1].forEach(s => {
    const p1 = new THREE.Vector3(0.58, 1.02, 0.84 * s);
    const p2 = new THREE.Vector3(0.20, 1.75, 0.78 * s);
    const dir = p2.clone().sub(p1);
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.026, 0.04, dir.length(), 10), pillarMat);
    pillar.position.copy(p1).addScaledVector(dir, 0.5);
    pillar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    car.add(pillar);
  });
  const header = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 1.60), pillarMat);
  header.position.set(0.20, 1.755, 0); car.add(header);
  const cowl = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 1.66), pillarMat);
  cowl.position.set(0.60, 1.0, 0); car.add(cowl);
  const wheels = [];
  [[1.25, 0.86], [1.25, -0.86], [-1.25, 0.86], [-1.25, -0.86]].forEach(([x, z]) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 12),
      new THREE.MeshLambertMaterial({ color: 0x1c1e24 }));
    w.rotation.x = Math.PI / 2; w.position.set(x, 0.4, z);
    car.add(w); wheels.push(w);
  });
  const carShadow = new THREE.Mesh(new THREE.CircleGeometry(2.6, 18),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }));
  carShadow.rotation.x = -Math.PI / 2; carShadow.position.y = 0.02; car.add(carShadow);
  scene.add(car);

  // ── 状态 ──
  const state = {
    v_kmh: 72, dist: 0, paused: false, fan: false,
    camMode: 'driver', // driver | chase
    wheelSpin: 0,
  };

  // ── DOM 标签 ──
  const labelLayer = document.getElementById('labelLayer');
  HEROES.forEach(h => {
    const el = document.createElement('div');
    el.className = 'mp-label'; el.dataset.view = 'ride';
    el.innerHTML = `<span class="nm" style="color:#${h.color.toString(16).padStart(6, '0')}">${h.name}</span> <span class="om"></span>`;
    labelLayer.appendChild(el); h.el = el; h.smoothDeg = 0; h.peaked = false;
  });

  const V3 = new THREE.Vector3();
  function placeLabel(h) {
    h.obj.getWorldPosition(V3);
    if (!h.isMoon) V3.y += h.lh;
    else V3.addScaledVector(moonDir, -1100).add(new THREE.Vector3(0, 480, 0));
    V3.project(camera);
    const off = V3.z > 1 || V3.z < -1;
    if (off) { h.el.style.display = 'none'; return; }
    h.el.style.display = '';
    const w = labelLayer.clientWidth, ht = labelLayer.clientHeight;
    h.el.style.left = ((V3.x * 0.5 + 0.5) * w) + 'px';
    h.el.style.top = ((-V3.y * 0.5 + 0.5) * ht) + 'px';
  }

  // ── HUD 面板（每个视图自己的容器，切页时切换 .active）──
  const panel = document.createElement('div');
  panel.className = 'viewpanel'; panel.dataset.view = 'ride';
  document.getElementById('sidePanel').appendChild(panel);
  panel.innerHTML = `
    <h2>你看到的速度 = 角速度<small>°/s，实时</small></h2>
    <div class="formula">ω ≈ v / d</div>
    <p class="note">大脑判断"快慢"用的是视线扫过的<b>角度变化率</b>，不是米/秒。
    齐平瞬间 ω 达到峰值 v/d。车速越快、离路越近，ω 越大。</p>
    <div id="hudRows"></div>
    <p class="note">🏷 <b>这不是假动画</b>：画面是浏览器的真实透视渲染——"近快远慢"
    就是透视本身。🌙 月亮跟随相机，因为 384,400 km 处视差≈0。</p>
    <p class="note">🌫 远处发黄是雾气（大气透视），另一种<b>静态</b>深度线索；
    运动视差是<b>动态</b>线索——动一动就有。</p>
    <p class="note">👁 大树齐平时 ω 超过 ~100°/s——超过眼球平滑追踪上限，
    所以近处的东西你只能"扫过"，看不清（眼睛被迫跳动式扫视）。</p>
  `;
  const hudRows = panel.querySelector('#hudRows');
  HEROES.forEach(h => {
    const row = document.createElement('div');
    row.className = 'hudrow'; row.id = 'hud-' + h.key;
    row.innerHTML = `
      <span class="dot" style="background:#${h.color.toString(16).padStart(6, '0')}"></span>
      <span class="nm">${h.name}<small>d = ${h.d >= 1000 ? (h.d / 1000).toFixed(h.d >= 10000 ? 0 : 1) + ' km' : h.d + ' m'}</small></span>
      <span class="om"><b>0.0</b> °/s</span>
      <span class="bar"><i style="background:#${h.color.toString(16).padStart(6, '0')}"></i></span>`;
    hudRows.appendChild(row);
    h.row = row; h.omEl = row.querySelector('.om b'); h.barEl = row.querySelector('.bar i');
  });

  // ── 底部控制 ──
  const bar = document.createElement('div');
  bar.className = 'viewbar'; bar.dataset.view = 'ride';
  document.getElementById('bottomBar').appendChild(bar);
  bar.innerHTML = `
    <div class="ctl"><label>车速 v</label>
      <input type="range" id="vSlider" min="20" max="120" step="2" value="72">
      <output id="vOut">72 km/h = 20.0 m/s</output></div>
    <button class="btn" id="btnPause">⏸ 暂停</button>
    <button class="btn" id="btnFan">👁 视线扇</button>
    <button class="btn" id="btnCam">🎥 驾驶位</button>
  `;
  const vS = bar.querySelector('#vSlider'), vOut = bar.querySelector('#vOut');
  vS.addEventListener('input', () => {
    state.v_kmh = +vS.value;
    vOut.textContent = `${state.v_kmh} km/h = ${(state.v_kmh * KMH_TO_MS).toFixed(1)} m/s`;
  });
  bar.querySelector('#btnPause').addEventListener('click', e => {
    state.paused = !state.paused;
    e.target.textContent = state.paused ? '▶ 继续' : '⏸ 暂停';
    e.target.classList.toggle('on', state.paused);
  });
  bar.querySelector('#btnFan').addEventListener('click', e => {
    state.fan = !state.fan; fanGroup.visible = state.fan;
    e.target.classList.toggle('on', state.fan);
  });
  bar.querySelector('#btnCam').addEventListener('click', e => {
    state.camMode = state.camMode === 'driver' ? 'chase' : 'driver';
    e.target.textContent = state.camMode === 'driver' ? '🎥 驾驶位' : '🎥 后跟随';
    e.target.classList.toggle('on', state.camMode === 'chase');
  });

  // ── 每帧更新 ──
  function update(dt) {
    const v_ms = state.v_kmh * KMH_TO_MS;
    if (!state.paused) {
      state.dist += v_ms * dt;
      state.wheelSpin += (v_ms * dt) / 0.4;
    }
    for (const m of movers) m.obj.position.x = wrapX(m.x0 - state.dist, m.P);
    wheels.forEach(w => { w.rotation.y = state.wheelSpin; });

    // 相机
    if (state.camMode === 'driver') {
      camera.position.set(-0.32, 1.55, 0.44);
      camera.fov = 70;
      camera.lookAt(16, 0.35, 0.36);
    } else {
      camera.position.set(-8.6, 4.6, 7.4);
      camera.fov = 60;
      camera.lookAt(3, 1.0, 0);
    }
    camera.updateProjectionMatrix();
    sky.position.copy(camera.position);
    sun.position.copy(camera.position).addScaledVector(sunDir, 13000);
    moon.position.copy(camera.position).addScaledVector(moonDir, 26000);
    moon.lookAt(camera.position);

    // HUD ω + 视线扇
    const maxRef = toDegPerS(omegaPeak(v_ms, 10));
    for (const h of HEROES) {
      const xRel = h.isMoon ? 0 : h.obj.position.x;
      const w = omegaExact(v_ms, h.d, xRel);
      const deg = toDegPerS(w);
      h.smoothDeg += (deg - h.smoothDeg) * Math.min(1, dt * 10);
      const shown = state.paused ? h.smoothDeg : deg;
      h.omEl.textContent = shown >= 100 ? shown.toFixed(0) : shown >= 10 ? shown.toFixed(1) : shown >= 0.1 ? shown.toFixed(2) : shown.toExponential(1);
      h.barEl.style.width = Math.min(100, 100 * Math.sqrt(shown / maxRef)) + '%';

      const nowPeaked = !h.isMoon && Math.abs(xRel) < 3 && v_ms > 1;
      if (nowPeaked !== h.peaked) {
        h.peaked = nowPeaked;
        h.row.classList.toggle('peaked', nowPeaked);
        h.el.classList.toggle('peaked', nowPeaked);
        if (nowPeaked) h.el.querySelector('.nm').textContent = `${h.name} 齐平!`;
        else h.el.querySelector('.nm').textContent = h.name;
      }
      if (state.fan && !h.isMoon) {
        const pos = h.fan.geometry.attributes.position;
        pos.setXYZ(0, 0, 1.3, 0);
        pos.setXYZ(1, h.obj.position.x, h.obj.position.y + 1, h.obj.position.z);
        pos.needsUpdate = true;
      }
      placeLabel(h);
    }
  }

  function onResize(w, h) {
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  function getInfo() {
    const v_ms = state.v_kmh * KMH_TO_MS;
    return {
      view: 'ride', v_kmh: state.v_kmh, dist: state.dist, paused: state.paused,
      heroes: HEROES.map(h => ({
        name: h.name, d: h.d,
        omegaDeg: toDegPerS(omegaExact(v_ms, h.d, h.isMoon ? 0 : h.obj.position.x)),
      })),
    };
  }

  return { scene, camera, update, onResize, getInfo, state };
}
