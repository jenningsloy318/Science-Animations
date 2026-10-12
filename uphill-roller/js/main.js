// ═══════════════════════════════════════════════════════
// main.js — 视图① 锥体上滚：双锥体在倾斜 V 型轨道上"上坡"
// 重心实际下降（金色曲线），接触点视觉上升（钢蓝轨道）。
// 物理：y(x) = r + x·(tanα − tanβ·tanγ)，tanα < tanβ·tanγ
// ═══════════════════════════════════════════════════════
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  DEFAULT, tan, y, isValid, contactHalf, coneZ, journeyEnd,
  rollAnglePerX,
} from './roller.js';

const RAIL_LEN = 36;
const TAU = Math.PI * 2;

// ── 状态 ──
const params = { ...DEFAULT, speed: 1 };
const state = { x: 0, playing: true, t: 0 };

// ── 渲染器 ──
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#070b16');
scene.fog = new THREE.FogExp2('#070b16', 0.011);

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 500);
camera.position.set(28, 12, 15);   // 以侧视为主、带一点转角：双锥菱形剪影清晰

const controls = new OrbitControls(camera, canvas);
controls.target.set(7, 2.2, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 10;
controls.maxDistance = 90;
controls.maxPolarAngle = Math.PI / 2 - 0.04;
controls.update();

// ── 光照 ──
scene.add(new THREE.AmbientLight('#404a66', 0.55));
const key = new THREE.DirectionalLight('#fff4dc', 1.5);
key.position.set(20, 24, 26);   // 相机侧上方：照亮近半锥体
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -20; key.shadow.camera.right = 35;
key.shadow.camera.top = 25; key.shadow.camera.bottom = -10;
key.shadow.bias = -0.0004;
scene.add(key);
const rim = new THREE.DirectionalLight('#5d8aff', 0.8);
rim.position.set(-8, 9, -12);
scene.add(rim);
const fill = new THREE.DirectionalLight('#9aa8cc', 1.0);    // 相机侧补光
fill.position.set(10, 7, 26);
scene.add(fill);
const warm = new THREE.PointLight('#ffb74d', 14, 32, 2);
warm.position.set(8, 5, 0);
scene.add(warm);

// ── 地面 ──
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(240, 240),
  new THREE.MeshStandardMaterial({ color: '#0a0f1c', roughness: 0.9, metalness: 0.2 }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(200, 80, '#1d2b48', '#111a2c');
grid.position.y = 0.02;
grid.material.opacity = 0.55;
grid.material.transparent = true;
scene.add(grid);

// ── 标签精灵 ──
function makeLabel(text, color) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.font = 'bold 44px "Helvetica Neue", sans-serif';
  g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.strokeStyle = 'rgba(7,11,22,0.85)'; g.lineWidth = 12;
  g.strokeText(text, 256, 64);
  g.fillText(text, 256, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sprite.scale.set(7, 1.75, 1);
  sprite._cv = c;
  sprite._color = color;
  return sprite;
}

function updateLabelText(sprite, text) {
  const c = sprite._cv;
  if (!c) return;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 512, 128);
  g.font = 'bold 44px "Helvetica Neue", sans-serif';
  g.fillStyle = sprite._color; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.strokeStyle = 'rgba(7,11,22,0.85)'; g.lineWidth = 12;
  g.strokeText(text, 256, 64);
  g.fillText(text, 256, 64);
  sprite.material.map.needsUpdate = true;
}

const ROLLER_I18N = {
  zh: {
    title: '锥体上滚',
    subtitle: '双锥体在 V 型轨道上的视觉错觉 · 重心下降是驱动力',
    badge: '物理演示 · 3D · 纯几何',
    panelTitle: '为什么它会“上坡”<small>真实几何</small>',
    panelDesc: '<b>接触点</b>沿轨道爬升（视觉“上坡”），<b>重心</b>却沿金色曲线实际下降。运动条件：<b>tanα &lt; tanβ·tanγ</b> —— 轨道倾角 α 越小、张口 β 越大、锥体越钝 γ 越大，越容易上坡。',
    validOk: '✓ 条件成立 · 真实上坡',
    validBad: '✗ 条件不成立 · 保持原位',
    lblCoM: '重心高度',
    lblDrop: '已下降',
    lblX: '沿轨道行程',
    facts: [
      '<b>1694 年配方</b> — William Leybourn《Pleasure with Profit》原推导：tanα = 1/√143, tanβ = 3/√134, tanγ = 1/3 → 条件等价于 <b>143 &gt; 134</b>。',
      '<b>玻璃珠同理</b> — 球在张开的 V 槽中也会沿槽“上坡”，机制相同（arXiv:2608.19541）。',
      '<b>驱动力 = 重力</b> — 静摩擦只保证“纯滚动”，滚动摩擦只是阻力。',
    ],
    play: '⏸ 暂停',
    resume: '▶ 继续',
    reset: '↺ 重播',
    lblAlpha: 'α 倾角',
    lblBeta: 'β 张口',
    lblGamma: 'γ 锥角',
    leybourn: 'Leybourn 配方',
    lblSpeed: '速度',
    labelCoM: '重心 CoM（真实路径 ↓）',
    labelContact: '接触点（视觉路径 ↑）',
    docTitle: '锥体上滚 · 双锥体在 V 型轨道上的视觉错觉',
  },
  en: {
    title: 'Uphill Roller',
    subtitle: 'Double cone optical illusion on V-rails · Center of mass drop is the driver',
    badge: 'Physics Sim · 3D · Pure Geometry',
    panelTitle: 'Why Does It "Roll Uphill"?<small>True Geometry</small>',
    panelDesc: '<b>Contact points</b> climb the rails (apparent "uphill"), while the <b>center of mass</b> strictly descends along the golden curve. Criterion: <b>tanα &lt; tanβ·tanγ</b> — smaller rail slope α, wider opening β, and blunter cone angle γ make uphill ascent easier.',
    validOk: '✓ Criterion Met · True Ascent',
    validBad: '✗ Criterion Not Met · At Rest',
    lblCoM: 'CoM Height',
    lblDrop: 'Total Drop',
    lblX: 'Travel on Rails',
    facts: [
      '<b>1694 Recipe</b> — William Leybourn "Pleasure with Profit" derivation: tanα = 1/√143, tanβ = 3/√134, tanγ = 1/3 → condition equivalent to <b>143 &gt; 134</b>.',
      '<b>Same for Marbles</b> — A marble in an opening V-groove also climbs via the identical mechanism (arXiv:2608.19541).',
      '<b>Driving Force = Gravity</b> — Static friction only enforces pure rolling; rolling friction is purely resistive.',
    ],
    play: '⏸ Pause',
    resume: '▶ Resume',
    reset: '↺ Replay',
    lblAlpha: 'α Rail Slope',
    lblBeta: 'β Opening',
    lblGamma: 'γ Cone Angle',
    leybourn: 'Leybourn Recipe',
    lblSpeed: 'Speed',
    labelCoM: 'CoM (True Path ↓)',
    labelContact: 'Contact (Visual Path ↑)',
    docTitle: 'Uphill Roller · Double Cone on V-Rails Optical Illusion',
  }
};

let currentLang = 'zh';

// ── 轨道（两根直线，从原点 O 沿倾斜面发散）──
function buildRail(zSign) {
  const a = tan(params.alphaDeg) * RAIL_LEN;           // 高度升
  const b = tan(params.betaDeg) * RAIL_LEN * zSign;    // 横向偏移
  const end = new THREE.Vector3(RAIL_LEN, a, b);       // 沿 x 上升、z 发散
  const len = end.length();
  const geo = new THREE.CylinderGeometry(0.22, 0.22, len, 24);
  geo.translate(0, len / 2, 0);                         // 底在原点
  const mat = new THREE.MeshStandardMaterial({ color: '#4d5f82', roughness: 0.3, metalness: 0.7, emissive: '#101828', emissiveIntensity: 0.6 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().normalize());
  return mesh;
}

function buildSupportBlocks() {
  const grp = new THREE.Group();
  const hiZ = tan(params.betaDeg) * RAIL_LEN;
  const hiH = Math.max(tan(params.alphaDeg) * RAIL_LEN - 0.22, 0.3); // 高端支撑顶面贴轨道末端
  const mkBlock = (x, z, h) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, h, 2.4),
      new THREE.MeshStandardMaterial({ color: h > 1 ? '#8a6d2f' : '#2a3346', roughness: 0.75, metalness: 0.35 }),
    );
    m.position.set(x, h / 2, z); m.castShadow = true; m.receiveShadow = true; return m;
  };
  grp.add(mkBlock(RAIL_LEN, hiZ, hiH));   // 高端两块支撑（Leybourn：高端垫高）
  grp.add(mkBlock(RAIL_LEN, -hiZ, hiH));
  grp.add(mkBlock(0, 0, 0.2));            // 低端薄基座（a≈0）
  return grp;
}

// ── 双锥体 ──
const coneGroup = new THREE.Group();
const coneMat = new THREE.MeshStandardMaterial({
  color: '#e8b84b', roughness: 0.28, metalness: 0.55,
  emissive: '#3a2a08', emissiveIntensity: 0.5,
});
const coneGeoA = new THREE.ConeGeometry(DEFAULT.R, DEFAULT.L_half, 48, 1, true);  // openEnded：去底盖，避免两半共面 z-fighting
coneGeoA.translate(0, DEFAULT.L_half / 2, 0);   // 底在 y=0，顶在 y=+9
const coneA = new THREE.Mesh(coneGeoA, coneMat);
coneA.rotation.x = -Math.PI / 2;                          // 顶角朝 −z：占据 z∈[−9,0]
coneA.position.z = 0;
const coneGeoB = new THREE.ConeGeometry(DEFAULT.R, DEFAULT.L_half, 48, 1, true);
coneGeoB.translate(0, DEFAULT.L_half / 2, 0);
const coneB = new THREE.Mesh(coneGeoB, coneMat);
coneB.rotation.x = Math.PI / 2;                          // 顶角朝 +z：占据 z∈[0,+9]
coneB.position.z = 0;
coneGroup.add(coneA, coneB);
coneGroup.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });  // 不接收阴影：避免两半互挡变漆黑
scene.add(coneGroup);

// 重心标记（x-ray 式：透过锥体可见，表示“在体内”）
const comMarker = new THREE.Mesh(
  new THREE.SphereGeometry(0.28, 24, 16),
  new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffe9ae', emissiveIntensity: 1.2, roughness: 0.4, depthTest: false }),
);
comMarker.renderOrder = 10;
scene.add(comMarker);
const comLabel = makeLabel('重心 CoM（真实路径 ↓）', '#ffe9ae');
comLabel.position.set(0, 2.3, 0);
comMarker.add(comLabel);

// 接触点标记（rail 1 上方，x-ray 式）
const contactMarker = new THREE.Mesh(
  new THREE.SphereGeometry(0.22, 20, 14),
  new THREE.MeshStandardMaterial({ color: '#7dd3fc', emissive: '#0a3358', emissiveIntensity: 0.6, roughness: 0.4, depthTest: false }),
);
contactMarker.renderOrder = 10;
scene.add(contactMarker);
const contactLabel = makeLabel('接触点（视觉路径 ↑）', '#7dd3fc');
contactLabel.position.set(0, -1.3, 0);
contactMarker.add(contactLabel);

// ── 重心轨迹线 ──
const xEnd = journeyEnd(params);
const pathN = 160;
const pathPts = [];
for (let i = 0; i <= pathN; i++) {
  const x = (i / pathN) * xEnd;
  pathPts.push(new THREE.Vector3(x, Math.max(y(x, params), -1), 0));
}
const pathGeo = new THREE.BufferGeometry().setFromPoints(pathPts);
const pathLine = new THREE.Line(
  pathGeo,
  new THREE.LineBasicMaterial({ color: '#e8b84b', transparent: true, opacity: 0.85 }),
);
scene.add(pathLine);

// ── 构建/重建（参数变化时）──
const rail1 = buildRail(+1);
const rail2 = buildRail(-1);
const supports = buildSupportBlocks();
scene.add(rail1, rail2, supports);

function rebuild() {
  rail1.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(RAIL_LEN, tan(params.alphaDeg) * RAIL_LEN, tan(params.betaDeg) * RAIL_LEN).normalize(),
  );
  rail2.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(RAIL_LEN, tan(params.alphaDeg) * RAIL_LEN, -tan(params.betaDeg) * RAIL_LEN).normalize(),
  );
  scene.remove(rail1, rail2, supports);
  scene.add(rail1, rail2, supports);
  supports.traverse(o => o.geometry?.dispose?.());
  // 轨迹在 valid 时重画
  pathPts.length = 0;
  for (let i = 0; i <= pathN; i++) {
    const x = (i / pathN) * xEnd;
    pathPts.push(new THREE.Vector3(x, Math.max(y(x, params), -1), 0));
  }
  pathGeo.setFromPoints(pathPts);
  pathLine.visible = isValid(params);
}

// ── 控件（DOM）──
const $ = (id) => document.getElementById(id);
const els = {
  play: $('bPlay'), reset: $('bReset'),
  alpha: $('aAlpha'), beta: $('aBeta'), gamma: $('aGamma'),
  aOut: $('aOut'), bOut: $('bOut'), gOut: $('gOut'),
  hCoM: $('hCoM'), hDrop: $('hDrop'), hValid: $('hValid'),
  hX: $('hX'), hSpeedIn: $('hSpeed'), hSpeedOut: $('hSpeedOut'),
};
const updateParamReadouts = () => {
  els.aOut.textContent = `${params.alphaDeg.toFixed(1)}°`;
  els.bOut.textContent = `${params.betaDeg.toFixed(1)}°`;
  els.gOut.textContent = `${params.gammaDeg.toFixed(1)}°`;
};
els.alpha.addEventListener('input', () => {
  params.alphaDeg = +els.alpha.value; updateParamReadouts(); rebuild(); resetSim();
});
els.beta.addEventListener('input', () => {
  params.betaDeg = +els.beta.value; updateParamReadouts(); rebuild(); resetSim();
});
els.gamma.addEventListener('input', () => {
  params.gammaDeg = +els.gamma.value; updateParamReadouts(); rebuild(); resetSim();
});
els.hSpeedIn.addEventListener('input', () => {
  params.speed = +els.hSpeedIn.value;
  els.hSpeedOut.textContent = `${params.speed.toFixed(1)}×`;
});
els.play.addEventListener('click', () => {
  state.playing = !state.playing;
  els.play.textContent = state.playing ? ROLLER_I18N[currentLang].play : ROLLER_I18N[currentLang].resume;
  els.play.classList.toggle('on', !state.playing);
});
els.reset.addEventListener('click', resetSim);

function resetSim() {
  state.x = 0; state.t = 0; state.playing = true;
  els.play.textContent = ROLLER_I18N[currentLang].play;
  els.play.classList.remove('on');
}

const Leyburn = { alphaDeg: 4.6, betaDeg: 15.3, gammaDeg: 25.4 };
$('bLeybourn').addEventListener('click', () => {
  Object.assign(params, Leyburn);
  els.alpha.value = 4.6; els.beta.value = 15.3; els.gamma.value = 25.4;
  updateParamReadouts(); rebuild(); resetSim();
});

// ── 语言状态与国际化 ──
const paramsUrl = new URLSearchParams(window.location.search);
const qLang = paramsUrl.get('lang');
if (qLang === 'zh' || qLang === 'en') {
  currentLang = qLang;
} else {
  const saved = localStorage.getItem('science_lang');
  if (saved === 'zh' || saved === 'en') {
    currentLang = saved;
  } else if (navigator.language && !navigator.language.startsWith('zh')) {
    currentLang = 'en';
  }
}

function setLang(lang) {
  if (lang !== 'zh' && lang !== 'en') return;
  currentLang = lang;
  document.documentElement.lang = lang;
  try {
    localStorage.setItem('science_lang', lang);
  } catch (e) {}

  const u = new URL(window.location.href);
  u.searchParams.set('lang', lang);
  window.history.replaceState({}, '', u.toString());

  const homeBtn = document.getElementById('homeBtn');
  if (homeBtn) {
    homeBtn.href = '../index.html?lang=' + lang;
    const homeTxt = document.getElementById('homeTxt');
    if (homeTxt) homeTxt.textContent = lang === 'en' ? 'Home' : '首页';
  }

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  const t = ROLLER_I18N[lang];
  document.title = t.docTitle;

  const appTitle = document.getElementById('appTitle');
  if (appTitle) {
    appTitle.innerHTML = `${t.title}<small id="appSubtitle">${t.subtitle}</small>`;
  }
  const appBadge = document.getElementById('appBadge');
  if (appBadge) appBadge.textContent = t.badge;

  const panelTitle = document.getElementById('panelTitle');
  if (panelTitle) panelTitle.innerHTML = t.panelTitle;

  const panelDesc = document.getElementById('panelDesc');
  if (panelDesc) panelDesc.innerHTML = t.panelDesc;

  const lblCoM = document.getElementById('lblCoM');
  if (lblCoM) lblCoM.textContent = t.lblCoM;
  const lblDrop = document.getElementById('lblDrop');
  if (lblDrop) lblDrop.textContent = t.lblDrop;
  const lblX = document.getElementById('lblX');
  if (lblX) lblX.textContent = t.lblX;

  const factsBox = document.getElementById('factsBox');
  if (factsBox && t.facts) {
    factsBox.innerHTML = t.facts.map(f => `<div class="fact">${f}</div>`).join('');
  }

  const lblAlpha = document.getElementById('lblAlpha');
  if (lblAlpha) lblAlpha.textContent = t.lblAlpha;
  const lblBeta = document.getElementById('lblBeta');
  if (lblBeta) lblBeta.textContent = t.lblBeta;
  const lblGamma = document.getElementById('lblGamma');
  if (lblGamma) lblGamma.textContent = t.lblGamma;
  const bLeybourn = document.getElementById('bLeybourn');
  if (bLeybourn) bLeybourn.textContent = t.leybourn;
  const lblSpeed = document.getElementById('lblSpeed');
  if (lblSpeed) lblSpeed.textContent = t.lblSpeed;

  els.play.textContent = state.playing ? t.play : t.resume;
  els.reset.textContent = t.reset;

  updateLabelText(comLabel, t.labelCoM);
  updateLabelText(contactLabel, t.labelContact);

  updateHUD();
}

document.querySelectorAll('.lang-btn').forEach(btn => {
  btn.addEventListener('click', () => setLang(btn.dataset.lang));
});

window.addEventListener('storage', e => {
  if (e.key === 'science_lang' && (e.newValue === 'zh' || e.newValue === 'en') && e.newValue !== currentLang) {
    setLang(e.newValue);
  }
});

// ── HUD 更新 ──
function updateHUD() {
  const v = isValid(params);
  els.hValid.textContent = v ? ROLLER_I18N[currentLang].validOk : ROLLER_I18N[currentLang].validBad;
  els.hValid.className = v ? 'ok' : 'bad';
  const curY = y(state.x, params);
  els.hCoM.textContent = `${curY.toFixed(2)} m`;
  els.hDrop.textContent = `${Math.max(0, DEFAULT.R - curY).toFixed(2)} m`;
  els.hX.textContent = `${state.x.toFixed(1)} m / ${xEnd.toFixed(1)} m`;
}

// ── 动画循环 ──
let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  const canRoll = isValid(params);
  if (state.playing && canRoll) {
    state.x += params.speed * 4.5 * dt;
    if (state.x >= xEnd) {
      state.x = xEnd;
      state.endT = (state.endT || 0) + dt;
      if (state.endT > 1.6) { state.endT = 0; resetSim(); }   // 自动循环
    } else state.endT = 0;
  } else if (state.playing && !canRoll) {
    state.x = 0;   // 条件不成立：重心不会下降，锥体保持原位
  }

  const yy = y(state.x, params);
  coneGroup.position.set(state.x, yy, 0);
  // 纯滚动：ω = −v/r_contact, v = speed·4.5 m/s
  const rContact = Math.max(state.x * tan(params.betaDeg), 0.05);
  coneGroup.rotation.z -= (params.speed * 4.5) / rContact * dt;

  comMarker.position.set(state.x, yy, 0);
  contactMarker.position.set(state.x, state.x * tan(params.alphaDeg), state.x * tan(params.betaDeg));

  warm.position.set(state.x, yy + 3, 0);

  controls.update();
  renderer.render(scene, camera);
  updateHUD();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ── resize ──
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

setLang(currentLang);
updateParamReadouts();
updateHUD();

// 调试钩子（与其他项目 __mp/__solar 惯例一致）
window.__ur = () => ({
  x: state.x, playing: state.playing, xEnd,
  conePos: coneGroup.position.toArray(),
  children: coneGroup.children.map(c => {
    c.geometry.computeBoundingBox();
    const wp = new THREE.Vector3(); c.getWorldPosition(wp);
    return { rotX: c.rotation.x, localPos: c.position.toArray(), worldPos: wp.toArray(), visible: c.visible };
  }),
  cam: camera.position.toArray(), target: controls.target.toArray(),
});
window.__urCam = camera; window.__urCtl = controls; window.__urState = state;
window.__urScene = scene; window.__urCone = coneGroup;
