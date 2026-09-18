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
  return sprite;
}

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
  els.play.textContent = state.playing ? '⏸ 暂停' : '▶ 继续';
  els.play.classList.toggle('on', !state.playing);
});
els.reset.addEventListener('click', resetSim);

function resetSim() { state.x = 0; state.t = 0; state.playing = true; els.play.textContent = '⏸ 暂停'; els.play.classList.remove('on'); }

const Leyburn = { alphaDeg: 4.6, betaDeg: 15.3, gammaDeg: 25.4 };
$('bLeybourn').addEventListener('click', () => {
  Object.assign(params, Leyburn);
  els.alpha.value = 4.6; els.beta.value = 15.3; els.gamma.value = 25.4;
  updateParamReadouts(); rebuild(); resetSim();
});

// ── HUD 更新 ──
function updateHUD() {
  const v = isValid(params);
  els.hValid.textContent = v ? '✓ 条件成立 · 真实上坡' : '✗ 条件不成立 · 保持原位';
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
