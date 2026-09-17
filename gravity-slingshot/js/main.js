/**
 * main.js - 3D 引力弹弓交互仿真主程序 (Three.js 0.160.0)
 * 具备: 双参考系切换 (太阳系 vs 行星系)、真实 3D 动力学矢量三角形、
 * 飞掠几何调控 (增速 / 减速 / 极区倾角)、历史任务预设、程序化旅行者号模型与 Web Audio 仿真
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  CONSTANTS,
  calculateDeflectionAngle,
  calculateHyperbolicDeltaV,
  calculatePlanetSpeedChange,
  calculateKineticEnergyDelta,
  hyperbolicTrajectory,
  earthEscapeTrajectory,
  REAL_ENCOUNTERS,
  MISSION_PRESETS
} from './physics.js';
import { createVoyagerSpacecraft } from './voyager-model.js';
import { createSun, createPlanet, createGravityWellMesh } from './celestial-bodies.js';
import { createVectorsVisualizer } from './vectors-hud.js';
import {
  toggleAudio,
  playThrusterBurst,
  playPeriapsisChime,
  playSpeedBoostTone
} from './audio.js';

// --- 全局状态 ---
export const STATE = {
  activeMission: 'VOYAGER_2',
  referenceFrame: 'HELIOCENTRIC', // 'HELIOCENTRIC' | 'PLANETOCENTRIC'
  geometryMode: 'TRAILING',       // 'TRAILING' (增速) | 'LEADING' (减速) | 'POLAR' (极区倾角)
  isPlaying: true,
  simSpeed: 1.0,
  showVectors: true,
  showGravityWell: false,
  showLabels: true,
  soundEnabled: false,
  currentStageIdx: 0,
  tourActive: false,
  tourStep: 0,
  cameraMode: 'OVERVIEW' // 'OVERVIEW' | 'FOLLOW' | 'PLANET_FOCUS'
};

// 运行时变量
let scene, camera, renderer, controls;
let voyagerCraft;
let sunObj, planets = {};
let orbitLines = {};
let gravityWellMesh;
let vectorsVis;
let craftTrajectoryLine;
let trajectoryPoints = [];
let simTime = 0;
let lastPeriapsisTriggered = false;
let flybyConic = null;            // 缓存的真实双曲圆锥曲线 (patched conic)
let flybyConicKey = '';
let flybyPathLine = null;         // 预测路径线 (真实形状)
let launchScene = null;           // 发射段: { rocket, pad, pathLine, dirUp }
const LAUNCH = { active: false, t: 0, dur: 16, vInf: 9.3 };

// 逃逸双曲轨迹缓存
let launchConic = null, launchConicVInf = -1;

// 仿真动力学状态
const simPhysics = {
  pos: new THREE.Vector3(12, 0, 0),
  vel: new THREE.Vector3(0, 0, 15),
  currentSpeed_kms: 36.0,
  initialSpeed_kms: 36.0,
  gain_kms: 0.0,
  vPlanet_kms: [13.07, 0, 0],
  vRel_kms: [0, 0, 10.8],
  gravForce_ms2: 0,
  rp_km: 643000,
  deflectionDeg: 78.5,
  planetSpeedChange_ms: 3.95e-21,
  energyGain_J: 1.48e11
};

// 导览剧本 (Tour Steps)
const TOUR_STEPS = [
  {
    title: '① 为什么深空探索不能单靠火箭燃料？',
    body: '根据齐奥尔科夫斯基火箭方程，燃料质量随所需速度呈指数暴增。要让人类探测器飞出太阳系，如果纯靠推进剂，需要火箭重如整座喜马拉雅山！引力弹弓让航天器直接向行星“借”能量，不耗一滴燃料即可获得天量速度。'
  },
  {
    title: '② 动网球拍比喻：能量到底从哪里来？',
    body: '想象一个以速度 V 挥向你的网球拍。当你向球拍投掷一个速度为 u 的网球，球弹回后的速度是 u + 2V！行星就是太空中高速公转的“巨大网球拍”。探测器从行星轨道后方擦过，被行星引力紧紧拽向前方，借走行星的一点点公转动能。'
  },
  {
    title: '③ 惊人的双参考系真相',
    body: '在【行星参考系】中：引力是保守场，飞船飞入的速度严格等于飞出的速度（|v_in| = |v_out|），它仅仅发生了一次双曲线转弯！但在【太阳参考系】中：转弯让飞船的速度方向与行星公转速度同向重合，两相叠加，太阳系速度暴增！'
  },
  {
    title: '④ 严格的动量守恒：行星减速了吗？',
    body: '是的！宇宙中没有免费的午餐。根据动量守恒：m_飞船 × Δv_飞船 = M_行星 × ΔV_行星。以木星为例，飞掠使旅行者号增速 10.5 km/s，木星的轨道速度因此被拖慢了约 10⁻²¹ m/s（相当于 50 亿年里公转轨道偏移不到一个原子的直径）！'
  },
  {
    title: '⑤ 几何控制：增速、减速与极区翻转',
    body: '从轨道后方飞掠（Trailing）实现加速；从轨道前方飞掠（Leading）则会被引力拖慢（帕克太阳探测器 7 次借金星减速奔向太阳）；从极区上空飞掠（Polar）则能扭转 80° 轨道倾角（尤利西斯号直插太阳南北极）！'
  }
];

/**
 * 初始化 3D 渲染环境
 */
function initThree() {
  const container = document.getElementById('stage');
  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050811, 0.0015);

  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 3000);
  camera.position.set(40, 50, 75);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxDistance = 1200;
  controls.minDistance = 3;

  // 环境光照
  const ambientLight = new THREE.AmbientLight(0x334155, 0.8);
  scene.add(ambientLight);

  // 1. 星空背景
  initStarfield();

  // 2. 太阳
  sunObj = createSun(7.0);
  sunObj.group.position.set(0, 0, 0);
  scene.add(sunObj.group);

  // 3. 各大行星及其轨道环
  buildSolarSystemBodies();

  // 4. 时空曲率引力势阱网格
  gravityWellMesh = createGravityWellMesh(16.0, 4.5, 0xf59e0b);
  gravityWellMesh.visible = STATE.showGravityWell;
  scene.add(gravityWellMesh);

  // 5. 3D 旅行者号飞船
  voyagerCraft = createVoyagerSpacecraft();
  scene.add(voyagerCraft.group);

  // 6. 3D 动力学矢量指示器
  vectorsVis = createVectorsVisualizer(scene);
  vectorsVis.setVisible(STATE.showVectors);

  // 7. 轨迹虚线 (Trajectory ribbon)
  initTrajectory();

  // 窗口重置监听
  window.addEventListener('resize', onWindowResize);
}

/**
 * 创建高保真星空背景
 */
function initStarfield() {
  const starGeo = new THREE.BufferGeometry();
  const count = 1800;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const r = 800 + Math.random() * 600;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    // 细微色温 (蓝白/暖白)
    const tint = Math.random();
    colors[i * 3] = 0.85 + tint * 0.15;
    colors[i * 3 + 1] = 0.85 + tint * 0.15;
    colors[i * 3 + 2] = 0.95 + tint * 0.05;
  }

  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const starMat = new THREE.PointsMaterial({
    size: 2.2,
    vertexColors: true,
    transparent: true,
    opacity: 0.85
  });

  const starfield = new THREE.Points(starGeo, starMat);
  scene.add(starfield);
}

/**
 * 构建行星网格与轨道环
 */
function buildSolarSystemBodies() {
  const planetKeys = ['venus', 'earth', 'jupiter', 'saturn', 'uranus', 'neptune'];
  // 视觉距离比例适配 (保留相对比例层级)
  const displayDistances = {
    venus: 14.0,
    earth: 20.0,
    jupiter: 36.0,
    saturn: 56.0,
    uranus: 78.0,
    neptune: 98.0
  };

  const displayRadii = {
    venus: 1.2,
    earth: 1.3,
    jupiter: 3.6,
    saturn: 2.8,
    uranus: 1.8,
    neptune: 1.8
  };

  planetKeys.forEach(key => {
    const p = createPlanet(key, displayRadii[key]);
    p.displayRadius = displayRadii[key];
    const dist = displayDistances[key];
    p.orbitRadius = dist;
    p.orbitAngle = Math.random() * Math.PI * 2;
    p.orbitalSpeed = 0.15 / Math.sqrt(dist);

    p.group.position.set(Math.cos(p.orbitAngle) * dist, 0, Math.sin(p.orbitAngle) * dist);
    scene.add(p.group);
    planets[key] = p;

    // 轨道环 (Orbit line)
    const ringGeo = new THREE.BufferGeometry();
    const pts = [];
    for (let i = 0; i <= 96; i++) {
      const theta = (i / 96) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(theta) * dist, 0, Math.sin(theta) * dist));
    }
    ringGeo.setFromPoints(pts);
    const ringMat = new THREE.LineBasicMaterial({
      color: 0x334155,
      transparent: true,
      opacity: 0.35
    });
    const orbitRing = new THREE.Line(ringGeo, ringMat);
    scene.add(orbitRing);
    orbitLines[key] = orbitRing;
  });
}

/**
 * 航天器轨迹带初始化
 */
function initTrajectory() {
  const maxPts = 600;
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(maxPts * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.LineBasicMaterial({
    color: 0x38bdf8,
    linewidth: 2,
    transparent: true,
    opacity: 0.8
  });

  craftTrajectoryLine = new THREE.Line(geo, mat);
  scene.add(craftTrajectoryLine);
}

function updateTrajectory(newPoint) {
  trajectoryPoints.push(newPoint.clone());
  if (trajectoryPoints.length > 500) trajectoryPoints.shift();

  const posAttr = craftTrajectoryLine.geometry.attributes.position;
  for (let i = 0; i < trajectoryPoints.length; i++) {
    posAttr.setXYZ(i, trajectoryPoints[i].x, trajectoryPoints[i].y, trajectoryPoints[i].z);
  }
  craftTrajectoryLine.geometry.setDrawRange(0, trajectoryPoints.length);
  posAttr.needsUpdate = true;
}

/**
 * 切换任务预设
 */
export function setMission(missionKey) {
  if (!MISSION_PRESETS[missionKey]) return;
  STATE.activeMission = missionKey;
  const mission = MISSION_PRESETS[missionKey];

  document.querySelectorAll('.mission-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mission === missionKey);
  });

  // 更新任务描述
  const descEl = document.getElementById('missionDescText');
  if (descEl) descEl.innerText = mission.descZh;

  // 重置时间与轨迹
  trajectoryPoints = [];
  simTime = 0;
  STATE.currentStageIdx = 0;
  lastPeriapsisTriggered = false;
  flybyConicKey = '';        // 强制重建真实圆锥曲线
  resetLaunch();

  // 根据任务类型智能匹配初始几何模式
  if (mission.type === 'DECELERATE') {
    setGeometryMode('LEADING');
  } else if (mission.type === 'POLAR_INCLINATION') {
    setGeometryMode('POLAR');
  } else {
    setGeometryMode('TRAILING');
  }

  updateFlightLogUI();
  updateHUD();
}

/**
 * 切换参考系 (太阳静止系 vs 行星静止系)
 */
export function setReferenceFrame(frameKey) {
  STATE.referenceFrame = frameKey;
  document.querySelectorAll('#framePills .pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.frame === frameKey);
  });

  // 更新视角与几何提示
  const tipEl = document.getElementById('frameTipText');
  if (tipEl) {
    if (frameKey === 'PLANETOCENTRIC') {
      tipEl.innerHTML = '🪐 <strong>行星参考系：</strong>行星静止于中心。飞船沿标准双曲线穿行，<strong>飞入速度 = 飞出速度</strong>（保守引力场，无能量增减），只有速度方向偏折角 δ！';
    } else {
      tipEl.innerHTML = '☀️ <strong>太阳参考系：</strong>行星以轨道速度 V 移动。双曲转向后的相对速度与行星速度矢量相加，<strong>v_总 = V_行星 + v_相对</strong>，太阳系航速发生跃升！';
    }
  }

  trajectoryPoints = [];
  updateHUD();
}

/**
 * 切换飞掠几何模式 (增速 / 减速 / 极区翻转)
 */
export function setGeometryMode(modeKey) {
  STATE.geometryMode = modeKey;
  document.querySelectorAll('#geomPills .pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.geom === modeKey);
  });
  trajectoryPoints = [];
  lastPeriapsisTriggered = false;
  playThrusterBurst();
  updateHUD();
}

/**
 * 核心动力学模拟更新循环
 */

/* ── 真实双曲圆锥曲线缓存 ─────────────────────────────────────────
   数据源: REAL_ENCOUNTERS.VOYAGER_2 (NASA/JPL, 2026-09-17 核实);
   其它任务/行星用典型 v∞ 并在 HUD 标注"近似"。 */
const FALLBACK_V_INF = { venus: 8.0, jupiter: 10.5, saturn: 6.0, uranus: 5.0, neptune: 8.0 };

function getFlybyConic(planetKey, geomMode) {
  const key = STATE.activeMission + '|' + planetKey + '|' + geomMode;
  if (flybyConicKey === key) return flybyConic;

  const P = CONSTANTS.PLANETS[planetKey];
  const enc = (STATE.activeMission === 'VOYAGER_2' && REAL_ENCOUNTERS.VOYAGER_2[planetKey]) || null;
  const v_inf = enc ? enc.v_inf_kms : (FALLBACK_V_INF[planetKey] ?? 8.0);
  const rp_km = enc ? enc.rp_km : P.radius_km * 2.0;

  const traj = hyperbolicTrajectory(P.mu, v_inf, rp_km, { nuMaxDeg: 150, samples: 240 });

  // 入射渐近线方向（近拱点系，数值方向）
  const pts = traj.points;
  const a0 = pts[0], a1 = pts[6];
  const incAng = Math.atan2(a1.z - a0.z, a1.x - a0.x);
  // 期望入射方向: TRAILING/POLAR → 与行星速度反向（从后面追上）; LEADING → 正向（迎面）
  const desiredAng = geomMode === 'LEADING' ? 0 : Math.PI;
  const rot = desiredAng - incAng;

  // 场景可见范围: 双曲线本身延伸到无穷远, 只画 r_scene <= R_CAP 的部分
  const R_CAP = 150;                                   // 场景单位
  const sceneK0 = (planets[planetKey]?.displayRadius ?? 3.6) / P.radius_km;
  let nuLo = -traj.nuMax, nuHi = traj.nuMax;
  {
    const inCap = traj.points.filter(pt => pt.r / 1000.0 * sceneK0 <= R_CAP);
    if (inCap.length >= 2) { nuLo = inCap[0].nu; nuHi = inCap[inCap.length - 1].nu; }
  }
  flybyConic = {
    e: traj.e,
    p: traj.p,
    nuMax: traj.nuMax,
    nuLo, nuHi,
    deltaDeg: traj.deflectionDeg,
    vPeriapsis_kms: traj.vPeriapsis_kms,
    v_inf_kms: v_inf,
    v_inf_ms: traj.v_inf_ms,
    rp_km,
    rot,
    encounter: enc || null,
    sceneKBody: P.radius_km
  };
  flybyConicKey = key;

  // 重建预测路径线（真实形状!），挂在行星 group 下（两种参考系都跟随）
  rebuildFlybyPath(planetKey, flybyConic);
  return flybyConic;
}

function rebuildFlybyPath(planetKey, conic) {
  const planet = planets[planetKey];
  if (!planet) return;
  if (flybyPathLine) { flybyPathLine.parent?.remove(flybyPathLine); flybyPathLine.geometry.dispose(); flybyPathLine.material.dispose(); flybyPathLine = null; }
  const sceneK = planet.displayRadius / CONSTANTS.PLANETS[planetKey].radius_km;
  const cs = Math.cos(conic.rot), sn = Math.sin(conic.rot);
  const pts = [];
  const N = 180;
  for (let i = 0; i <= N; i++) {
    const nu = conic.nuLo + (conic.nuHi - conic.nuLo) * i / N;
    const r = conic.p / (1 + conic.e * Math.cos(nu));
    const x = (r * Math.cos(nu) * cs - r * Math.sin(nu) * sn) / 1000.0 * sceneK;
    const z = (r * Math.cos(nu) * sn + r * Math.sin(nu) * cs) / 1000.0 * sceneK;
    const y = STATE.geometryMode === 'POLAR' ? r / 1000.0 * sceneK * Math.sin(Math.max(0, nu)) * 0.95 : 0;
    pts.push(new THREE.Vector3(x, y, z));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.45 });
  flybyPathLine = new THREE.Line(geo, mat);
  flybyPathLine.name = 'flybyPath';
  planet.group.add(flybyPathLine);
}

/* ── 发射段: 从地球表面看"泰坦三号E"爬升入逃逸双曲线 ─────────────── */
function buildLaunchScene() {
  if (launchScene) { launchScene.group.visible = true; return; }
  const earth = planets.earth;
  const group = new THREE.Group();
  earth.group.add(group);

  // 发射场 (卡纳维拉尔角 SLC-41, 示意位置): 放在 +x 表面
  const dirUp = new THREE.Vector3(1, 0, 0);
  const R = earth.displayRadius;
  const padY = 0.012;
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.045, padY, 20),
    new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 })
  );
  pad.position.set(R + padY / 2, 0, 0);
  group.add(pad);
  // 塔架
  const tower = new THREE.Mesh(
    new THREE.BoxGeometry(0.008, 0.075, 0.008),
    new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.7, roughness: 0.4 })
  );
  tower.position.set(R + padY + 0.037, 0, -0.028);
  group.add(tower);

  // 泰坦三号E-半人马座 (示意模型: 芯级 + 两枚固体助推)
  const rocket = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0042, 0.0042, 0.062, 12),
    new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.5 })
  );
  core.position.y = 0.031;
  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.0042, 0.014, 12),
    new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.5 })
  );
  nose.position.y = 0.069;
  rocket.add(core, nose);
  for (const dz of [-0.0068, 0.0068]) {
    const booster = new THREE.Mesh(
      new THREE.CylinderGeometry(0.003, 0.003, 0.045, 10),
      new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.6 })
    );
    booster.position.set(0, 0.0225, dz);
    rocket.add(booster);
  }
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.006, 0.02, 10),
    new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.85 })
  );
  flame.rotation.x = Math.PI;
  flame.position.y = -0.012;
  rocket.add(flame);
  rocket.position.set(R, 0.012, 0);
  // 使火箭的 +y 对准径向向外
  rocket.rotation.z = -Math.PI / 2;
  group.add(rocket);

  // 尾焰脉动
  const trail = new THREE.Mesh(
    new THREE.SphereGeometry(0.004, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xfde68a, transparent: true, opacity: 0.9 })
  );
  trail.visible = false;
  group.add(trail);

  // 发动机亮斑: 真实夜射从地面看到的就是这颗"移动的星"
  const beacon = new THREE.Sprite(new THREE.SpriteMaterial({
    color: 0xfff3c4, transparent: true, opacity: 0.95, depthWrite: false
  }));
  beacon.scale.set(0.02, 0.02, 1);
  rocket.add(beacon);

  launchScene = { group, rocket, pad, dirUp, R, trail, lastAltKm: 0 };
  rebuildLaunchPath();
}

function rebuildLaunchPath() {
  if (!launchScene) return;
  const vInf = LAUNCH.vInf;
  launchConic = earthEscapeTrajectory(vInf);
  launchConicVInf = vInf;
  if (launchScene.pathLine) {
    launchScene.pathLine.parent.remove(launchScene.pathLine);
    launchScene.pathLine.geometry.dispose(); launchScene.pathLine.material.dispose();
  }
  const earth = planets.earth;
  const sceneK = earth.displayRadius / CONSTANTS.PLANETS.earth.radius_km;
  const pts = [];
  const N = 160;
  for (let i = 0; i <= N; i++) {
    const nu = (launchConic.nuMax * 0.92) * (i / N);   // 从近地点(发射台)向外爬升
    const r = launchConic.p / (1 + launchConic.e * Math.cos(nu));
    pts.push(new THREE.Vector3(r / 1000.0 * sceneK, 0, 0));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineDashedMaterial({ color: 0x60a5fa, dashSize: 0.02, gapSize: 0.014, transparent: true, opacity: 0.65 });
  const line = new THREE.Line(geo, mat);
  line.computeLineDistances();
  launchScene.pathLine = line;
  launchScene.group.add(line);
}

function updateLaunchView(dt) {
  if (!launchScene) buildLaunchScene();
  if (launchConicVInf !== LAUNCH.vInf) rebuildLaunchPath();

  LAUNCH.t += dt * 0.5 * STATE.simSpeed;
  const k = Math.min(1, LAUNCH.t / LAUNCH.dur);
  const conic = launchConic;
  const earth = planets.earth;
  const sceneK = earth.displayRadius / CONSTANTS.PLANETS.earth.radius_km;
  const muE = CONSTANTS.PLANETS.earth.mu;

  const easeK = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;  // easeInOut
  const nu = conic.nuMax * 0.92 * easeK;
  const r_m = conic.p / (1 + conic.e * Math.cos(nu));
  const rScene = r_m / 1000.0 * sceneK;

  const rocket = launchScene.rocket;
  rocket.position.set(rScene, 0.012, 0);
  const altKm = Math.max(0, r_m - 6371000);
  launchScene.lastAltKm = altKm;

  const vKms = Math.sqrt(conic.v_inf_ms ** 2 + 2 * muE / r_m) / 1000;
  const speedEl = document.getElementById('bigSpeed');
  if (speedEl) speedEl.innerText = vKms.toFixed(2);
  const gainEl = document.getElementById('speedGainBadge');
  if (gainEl) {
    gainEl.innerText = `高度 ${altKm < 1000 ? altKm.toFixed(0) + ' km' : (altKm / 10000).toFixed(1) + ' 万 km'}`;
    gainEl.className = 'speed-gain-badge';
  }

  // 尾焰 + 拖尾点
  const burning = k < 0.62;
  if (launchScene.trail) {
    launchScene.trail.visible = burning;
    launchScene.trail.position.set(rScene - 0.01, 0.012, 0);
    launchScene.trail.material.opacity = 0.5 + 0.4 * Math.sin(performance.now() * 0.03);
  }

  if (STATE.cameraMode === 'EARTH_LAUNCH') {
    // 相机固定在地球表面发射场旁, 抬头看火箭爬升 —— "从地球看发射"
    camera.position.set(earth.displayRadius + 0.012, 0.05, 0.16);
    controls.target.copy(rocket.getWorldPosition(new THREE.Vector3()));
  }

  window.__gsDebug = () => ({
    cam: camera.position.toArray().map(v => +v.toFixed(3)),
    target: controls.target.toArray().map(v => +v.toFixed(3)),
    earthPos: planets.earth.group.position.toArray(),
    earthVisible: planets.earth.group.visible,
    rocketLocal: rocket.position.toArray().map(v => +v.toFixed(4)),
    rocketWorld: rocket.getWorldPosition(new THREE.Vector3()).toArray().map(v => +v.toFixed(3)),
    launchVisible: launchScene.group.visible,
    rScene,
    altKm: Math.round(altKm)
  });

  simPhysics.currentSpeed_kms = vKms;
  simPhysics.gain_kms = vKms - 7.8;   // 相对地表逃逸参考
  simPhysics.vRel_kms = [vKms, 0, 0];
  simPhysics.deflectionDeg = conic.deflectionDeg;
  simPhysics.rp_km = 6371 + 200;
  simPhysics.eccentricity = conic.e;
  simPhysics.v_inf_kms = LAUNCH.vInf;
  simPhysics.vPeriapsis_kms = conic.vPeriapsis_kms;
  simPhysics.encounter = null;
}

function resetLaunch() {
  LAUNCH.t = 0;
}

function updateSimulationPhysics(dt) {
  if (!STATE.isPlaying) return;
  if (LAUNCH.active) {
    planets.earth.group.position.set(0, 0, 0);   // 地球参考系: 地球静止于中心
    // 发射近景只保留地球: 隐藏太阳/其它行星/轨道环, 相机才不会被吞进太阳球体
    sunObj.group.visible = false;
    for (const k2 in planets) if (k2 !== 'earth') planets[k2].group.visible = false;
    for (const k2 in orbitLines) orbitLines[k2].visible = false;
    if (gravityWellMesh) gravityWellMesh.visible = false;
    updateLaunchView(dt); updateHUD(); return;
  }

  const mission = MISSION_PRESETS[STATE.activeMission];
  const targetPlanetKey = mission.primaryBody || 'jupiter';
  const planet = planets[targetPlanetKey];

  if (!planet) return;

  simTime += dt * 0.65 * STATE.simSpeed;

  // 1. 行星公转位置
  const orbitR = planet.orbitRadius;
  const pAngle = simTime * 0.15;
  const planetWorldPos = new THREE.Vector3(
    Math.cos(pAngle) * orbitR,
    0,
    Math.sin(pAngle) * orbitR
  );
  planet.group.position.copy(planetWorldPos);

  // 行星速度矢量 (切向)
  const planetVelDir = new THREE.Vector3(-Math.sin(pAngle), 0, Math.cos(pAngle));
  const planetSpeed = CONSTANTS.PLANETS[targetPlanetKey].orbitalSpeed_kms;
  simPhysics.vPlanet_kms = [
    planetVelDir.x * planetSpeed,
    planetVelDir.y * planetSpeed,
    planetVelDir.z * planetSpeed
  ];

  // 2. 引力势阱位置跟随
  if (gravityWellMesh) {
    gravityWellMesh.position.copy(planetWorldPos);
    gravityWellMesh.position.y -= 0.2;
  }

  // 3. 航天器相对于行星的飞掠: 真实双曲圆锥曲线 (patched conic)
  // r(ν) = p / (1 + e·cosν), e = 1 + rp·v∞²/μ —— 尺寸/形状/转角全部来自真实任务参数
  const conic = getFlybyConic(targetPlanetKey, STATE.geometryMode);
  const muPlanet = CONSTANTS.PLANETS[targetPlanetKey].mu;
  const sceneK = planet.displayRadius / CONSTANTS.PLANETS[targetPlanetKey].radius_km; // km → 场景
  const cycle = (simTime * 0.4) % 6.0;
  const u = cycle - 3.0; // -3 到 +3，u=0 为近拱点 (Periapsis)
  const nu = (conic.nuLo + conic.nuHi) / 2.0 + (conic.nuHi - conic.nuLo) / 2.0 * Math.tanh(u * 1.1);

  const r_m = conic.p / (1.0 + conic.e * Math.cos(nu));      // 真实距离 (米)
  const r_km = r_m / 1000.0;
  const rScene = r_km * sceneK;
  const px = r_m * Math.cos(nu), pz = r_m * Math.sin(nu);    // 近拱点系 (x = 拱线)

  // 旋转: 入射渐近线对准 ±行星公转方向 (TRAILING 背面掠 → 增速 / LEADING 正面 → 减速)
  const cs = Math.cos(conic.rot), sn = Math.sin(conic.rot);
  let relX = (px * cs - pz * sn) / 1000.0 * sceneK;
  let relZ = (px * sn + pz * cs) / 1000.0 * sceneK;
  let relY = 0;
  if (STATE.geometryMode === 'POLAR') {
    relY = rScene * Math.sin(Math.max(0, nu)) * 0.95;   // 出射段翻出黄道面 (倾角示意)
  }
  const relCraftPos = new THREE.Vector3(relX, relY, relZ);

  // 4. 根据当前参考系放置飞船 3D 位置
  if (STATE.referenceFrame === 'PLANETOCENTRIC') {
    // 行星固定在 (0, 0, 0)
    planet.group.position.set(0, 0, 0);
    if (gravityWellMesh) gravityWellMesh.position.set(0, -0.2, 0);
    voyagerCraft.group.position.copy(relCraftPos);
    simPhysics.pos.copy(relCraftPos);
  } else {
    // 太阳系参考系: 飞船世界位置 = 行星世界位置 + 相对位置
    const worldCraftPos = planetWorldPos.clone().add(relCraftPos);
    voyagerCraft.group.position.copy(worldCraftPos);
    simPhysics.pos.copy(worldCraftPos);
  }

  // 5. 速度与引力计算 —— 能量守恒给出真实相对速度: v(ν) = √(v∞² + 2μ/r)
  const vRelMag = Math.sqrt(conic.v_inf_ms ** 2 + 2.0 * muPlanet / r_m) / 1000.0; // km/s
  // 方向: 数值微分 (旋转后的场景系)
  const nu2 = Math.min(nu + 0.004, conic.nuMax);
  const r2m = conic.p / (1.0 + conic.e * Math.cos(nu2));
  const q1x = (r_m * Math.cos(nu) * cs - r_m * Math.sin(nu) * sn) / 1000.0 * sceneK;
  const q1z = (r_m * Math.cos(nu) * sn + r_m * Math.sin(nu) * cs) / 1000.0 * sceneK;
  const q2x = (r2m * Math.cos(nu2) * cs - r2m * Math.sin(nu2) * sn) / 1000.0 * sceneK;
  const q2z = (r2m * Math.cos(nu2) * sn + r2m * Math.sin(nu2) * cs) / 1000.0 * sceneK;
  const q1y = relY, q2y = STATE.geometryMode === 'POLAR'
    ? r2m * sceneK * Math.sin(Math.max(0, nu2)) * 0.95 : 0;
  const vRelVec = new THREE.Vector3(q2x - q1x, q2y - q1y, q2z - q1z);
  if (vRelVec.lengthSq() > 1e-9) vRelVec.normalize();

  simPhysics.vRel_kms = [vRelVec.x * vRelMag, vRelVec.y * vRelMag, vRelVec.z * vRelMag];

  // 太阳系速度 = 行星速度 + 相对速度
  let helioVx, helioVy, helioVz;
  if (STATE.referenceFrame === 'PLANETOCENTRIC') {
    helioVx = simPhysics.vRel_kms[0];
    helioVy = simPhysics.vRel_kms[1];
    helioVz = simPhysics.vRel_kms[2];
  } else {
    helioVx = simPhysics.vPlanet_kms[0] + simPhysics.vRel_kms[0];
    helioVy = simPhysics.vPlanet_kms[1] + simPhysics.vRel_kms[1];
    helioVz = simPhysics.vPlanet_kms[2] + simPhysics.vRel_kms[2];
  }

  const helioMag = Math.hypot(helioVx, helioVy, helioVz);
  simPhysics.currentSpeed_kms = THREE.MathUtils.lerp(simPhysics.currentSpeed_kms, helioMag, 0.08);
  simPhysics.gain_kms = simPhysics.currentSpeed_kms - simPhysics.initialSpeed_kms;

  // 飞船姿态朝向速度方向
  if (vRelVec.lengthSq() > 0.01) {
    const lookTarget = voyagerCraft.group.position.clone().add(vRelVec);
    voyagerCraft.group.lookAt(lookTarget);
  }

  // 6. 引力大小与近拱点检测 (真实距离)
  simPhysics.gravForce_ms2 = muPlanet / (r_m * r_m);

  // 近拱点飞掠事件
  if (Math.abs(nu) < 0.05) {
    if (!lastPeriapsisTriggered) {
      lastPeriapsisTriggered = true;
      voyagerCraft.fireRCS(true);
      playPeriapsisChime();
      playSpeedBoostTone(simPhysics.gain_kms);
      setTimeout(() => voyagerCraft.fireRCS(false), 350);
    }
  } else if (Math.abs(nu) > 0.4) {
    lastPeriapsisTriggered = false;
  }

  // 更新轨迹
  updateTrajectory(voyagerCraft.group.position);

  // 7. 更新 3D 动力学矢量可视化
  const gravDir = relCraftPos.clone().negate().normalize();
  vectorsVis.update({
    craftPos: voyagerCraft.group.position,
    vHelio: [helioVx, helioVy, helioVz],
    vPlanet: STATE.referenceFrame === 'PLANETOCENTRIC' ? [0, 0, 0] : simPhysics.vPlanet_kms,
    vRel: simPhysics.vRel_kms,
    gravDir,
    gravMagnitude: simPhysics.gravForce_ms2,
    scale: 0.22,
    showTriangle: STATE.referenceFrame === 'HELIOCENTRIC'
  });

  // 8. 计算动量微观改变与动能增益
  simPhysics.planetSpeedChange_ms = calculatePlanetSpeedChange(
    CONSTANTS.VOYAGER_MASS_KG,
    Math.abs(simPhysics.gain_kms),
    CONSTANTS.PLANETS[targetPlanetKey].mass
  );

  simPhysics.energyGain_J = calculateKineticEnergyDelta(
    CONSTANTS.VOYAGER_MASS_KG,
    simPhysics.initialSpeed_kms,
    simPhysics.currentSpeed_kms
  );

  // 双曲几何 (真实参数): e / δ / rp / v∞
  simPhysics.rp_km = conic.rp_km;
  simPhysics.deflectionDeg = conic.deltaDeg;
  simPhysics.eccentricity = conic.e;
  simPhysics.v_inf_kms = conic.v_inf_kms;
  simPhysics.vPeriapsis_kms = conic.vPeriapsis_kms;
  simPhysics.encounter = conic.encounter;

  updateHUD();
}

/**
 * 刷新右侧 HUD 与遥测面板
 */
function updateHUD() {
  const speedEl = document.getElementById('bigSpeed');
  if (speedEl) speedEl.innerText = simPhysics.currentSpeed_kms.toFixed(1);

  const gainEl = document.getElementById('speedGainBadge');
  if (gainEl) {
    const gain = simPhysics.gain_kms;
    const sign = gain >= 0 ? '+' : '';
    gainEl.innerText = `${sign}${gain.toFixed(1)} km/s 速度跃迁`;
    gainEl.className = `speed-gain-badge ${gain >= 0 ? '' : 'negative'}`;
  }

  const vRelEl = document.getElementById('hudVRel');
  if (vRelEl) {
    const relMag = Math.hypot(simPhysics.vRel_kms[0], simPhysics.vRel_kms[1], simPhysics.vRel_kms[2]);
    vRelEl.innerText = `${relMag.toFixed(1)} km/s`;
  }

  const gAccEl = document.getElementById('hudGravAcc');
  if (gAccEl) gAccEl.innerText = `${simPhysics.gravForce_ms2.toFixed(2)} m/s²`;

  const deflEl = document.getElementById('hudDeflection');
  if (deflEl) deflEl.innerText = `${simPhysics.deflectionDeg.toFixed(1)}°`;

  const planetSlowEl = document.getElementById('hudPlanetSlow');
  if (planetSlowEl) {
    planetSlowEl.innerText = `${simPhysics.planetSpeedChange_ms.toExponential(2)} m/s`;
  }

  const energyEl = document.getElementById('hudEnergyDelta');
  if (energyEl) {
    energyEl.innerText = `${(simPhysics.energyGain_J / 1e9).toFixed(2)} GJ`;
  }

  // 真实圆锥曲线几何 (patched conic)
  const eccEl = document.getElementById('hudEcc');
  if (eccEl && simPhysics.eccentricity) eccEl.innerText = simPhysics.eccentricity.toFixed(3);
  const vpEl = document.getElementById('hudVPeri');
  if (vpEl && simPhysics.vPeriapsis_kms) vpEl.innerText = `${simPhysics.vPeriapsis_kms.toFixed(1)} km/s`;
  const rpEl = document.getElementById('hudRp');
  if (rpEl && simPhysics.rp_km) rpEl.innerText = `${simPhysics.rp_km.toLocaleString()} km`;
  const encEl = document.getElementById('hudEncounter');
  if (encEl) {
    const enc = simPhysics.encounter;
    encEl.innerText = enc ? enc.date : '示意参数';
    encEl.style.color = enc ? '#6ee7b7' : '#fbbf24';
  }
}

/**
 * 渲染飞行日志阶段进度
 */
function updateFlightLogUI() {
  const mission = MISSION_PRESETS[STATE.activeMission];
  const listEl = document.getElementById('logTimeline');
  if (!listEl) return;

  listEl.innerHTML = '';
  mission.stages.forEach((st, idx) => {
    const item = document.createElement('div');
    const isCurrent = idx === STATE.currentStageIdx;
    const isPassed = idx < STATE.currentStageIdx;

    item.className = `stage-item ${isCurrent ? 'current' : ''} ${isPassed ? 'passed' : ''}`;
    item.innerHTML = `
      <div class="stage-dot"></div>
      <div class="stage-info">
        <div class="stage-name">${st.eventZh}</div>
        <div class="stage-detail">${st.date} · 航速: ${st.v_helio_kms} km/s (${st.gain_kms >= 0 ? '+' : ''}${st.gain_kms} km/s)</div>
      </div>
    `;
    listEl.appendChild(item);
  });
}

/**
 * 相机视角控制
 */
export function setCameraPreset(mode) {
  STATE.cameraMode = mode;
  document.querySelectorAll('#camPills .pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cam === mode);
  });

  if (mode === 'OVERVIEW') {
    controls.target.set(0, 0, 0);
    camera.position.set(40, 60, 80);
  } else if (mode === 'PLANET_FOCUS') {
    const mission = MISSION_PRESETS[STATE.activeMission];
    const planet = planets[mission.primaryBody || 'jupiter'];
    if (planet) {
      controls.target.copy(planet.group.position);
      // 真实近拱点 rp ≈ 9 R_J → 相机要拉到能框住整个双曲弯折
      const d = (planet.displayRadius ?? 3.6) * 14;
      camera.position.copy(planet.group.position).add(new THREE.Vector3(d * 0.55, d * 0.38, d * 0.74));
    }
  } else if (mode === 'FOLLOW') {
    controls.target.copy(voyagerCraft.group.position);
    camera.position.copy(voyagerCraft.group.position).add(new THREE.Vector3(-4, 3, -6));
  }

  // 发射模式开关
  LAUNCH.active = (mode === 'EARTH_LAUNCH');
  if (LAUNCH.active) {
    setReferenceFrame('PLANETOCENTRIC');
    buildLaunchScene();
    simTime = 0;
    resetLaunch();
    const lp = document.getElementById('launchPanel');
    if (lp) lp.style.display = 'block';
  } else {
    if (launchScene) launchScene.group.visible = false;
    const lp = document.getElementById('launchPanel');
    if (lp) lp.style.display = 'none';
    if (gravityWellMesh) gravityWellMesh.visible = STATE.showGravityWell;
    sunObj.group.visible = true;
    for (const k2 in planets) planets[k2].group.visible = true;
    for (const k2 in orbitLines) orbitLines[k2].visible = true;
  }
}

/**
 * 导览步进机制
 */
export function startTour() {
  STATE.tourActive = true;
  STATE.tourStep = 0;
  showTourDialog();
}

export function nextTourStep() {
  if (STATE.tourStep < TOUR_STEPS.length - 1) {
    STATE.tourStep++;
    showTourDialog();
  } else {
    closeTour();
  }
}

export function prevTourStep() {
  if (STATE.tourStep > 0) {
    STATE.tourStep--;
    showTourDialog();
  }
}

export function closeTour() {
  STATE.tourActive = false;
  const dialog = document.getElementById('tourDialog');
  if (dialog) dialog.classList.remove('visible');
}

function showTourDialog() {
  const dialog = document.getElementById('tourDialog');
  if (!dialog) return;

  const step = TOUR_STEPS[STATE.tourStep];
  dialog.querySelector('.tour-title').innerText = step.title;
  dialog.querySelector('.tour-body').innerHTML = step.body;
  dialog.querySelector('.tour-step-count').innerText = `${STATE.tourStep + 1} / ${TOUR_STEPS.length}`;
  dialog.classList.add('visible');

  // 导览联动镜头与模式
  if (STATE.tourStep === 2) {
    setReferenceFrame('PLANETOCENTRIC');
  } else if (STATE.tourStep === 4) {
    setReferenceFrame('HELIOCENTRIC');
  }
}

/**
 * 窗口自适应
 */
function onWindowResize() {
  const container = document.getElementById('stage');
  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

/**
 * 主渲染循环
 */
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.05);

  // 太阳微旋转
  if (sunObj) sunObj.update(simTime);

  // 行星微自转
  Object.values(planets).forEach(p => p.update(dt));

  // 仿真动力学步进
  updateSimulationPhysics(dt);

  // 相机跟随模式
  if (STATE.cameraMode === 'FOLLOW' && voyagerCraft) {
    controls.target.lerp(voyagerCraft.group.position, 0.1);
  }

  controls.update();
  renderer.render(scene, camera);
}

/**
 * 启动引导与 DOM 事件监听绑定
 */
function initEvents() {
  // 任务切换按钮
  document.querySelectorAll('.mission-btn').forEach(btn => {
    btn.addEventListener('click', () => setMission(btn.dataset.mission));
  });

  // 参考系切换按钮
  document.querySelectorAll('#framePills .pill-btn').forEach(btn => {
    btn.addEventListener('click', () => setReferenceFrame(btn.dataset.frame));
  });

  // 飞掠几何切换按钮
  document.querySelectorAll('#geomPills .pill-btn').forEach(btn => {
    btn.addEventListener('click', () => setGeometryMode(btn.dataset.geom));
  });

  // 视角切换按钮
  document.querySelectorAll('#camPills .pill-btn').forEach(btn => {
    btn.addEventListener('click', () => setCameraPreset(btn.dataset.cam));
  });

  // 工具栏按钮
  const btnPlay = document.getElementById('btnPlay');
  if (btnPlay) {
    btnPlay.addEventListener('click', () => {
      STATE.isPlaying = !STATE.isPlaying;
      btnPlay.innerText = STATE.isPlaying ? '⏸' : '▶';
    });
  }

  const btnReset = document.getElementById('btnReset');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      resetLaunch();
      simTime = 0;
      trajectoryPoints = [];
      updateTrajectory(voyagerCraft.group.position);
      playThrusterBurst();
    });
  }

  const btnVectors = document.getElementById('btnVectors');
  if (btnVectors) {
    btnVectors.addEventListener('click', () => {
      STATE.showVectors = !STATE.showVectors;
      btnVectors.classList.toggle('active', STATE.showVectors);
      vectorsVis.setVisible(STATE.showVectors);
    });
  }

  const btnWell = document.getElementById('btnGravityWell');
  if (btnWell) {
    btnWell.addEventListener('click', () => {
      STATE.showGravityWell = !STATE.showGravityWell;
      btnWell.classList.toggle('active', STATE.showGravityWell);
      if (gravityWellMesh) gravityWellMesh.visible = STATE.showGravityWell;
    });
  }

  const btnSound = document.getElementById('btnSound');
  if (btnSound) {
    btnSound.addEventListener('click', () => {
      STATE.soundEnabled = toggleAudio();
      btnSound.innerText = STATE.soundEnabled ? '🔊' : '🔇';
      btnSound.classList.toggle('active', STATE.soundEnabled);
    });
  }

  const btnTour = document.getElementById('btnTour');
  if (btnTour) {
    btnTour.addEventListener('click', startTour);
  }

  // 导览弹窗交互
  const tourNext = document.getElementById('tourNextBtn');
  if (tourNext) tourNext.addEventListener('click', nextTourStep);
  const tourPrev = document.getElementById('tourPrevBtn');
  if (tourPrev) tourPrev.addEventListener('click', prevTourStep);
  const tourClose = document.getElementById('tourCloseBtn');
  if (tourClose) tourClose.addEventListener('click', closeTour);

  // 仿真速度滑块
  const speedSlider = document.getElementById('speedSlider');
  if (speedSlider) {
    speedSlider.addEventListener('input', (e) => {
      STATE.simSpeed = parseFloat(e.target.value);
      const valEl = document.getElementById('speedVal');
      if (valEl) valEl.innerText = `${STATE.simSpeed.toFixed(1)}×`;
    });
  }
}

// 启动入口
window.addEventListener('DOMContentLoaded', () => {
  initThree();
  initEvents();
  setMission('VOYAGER_2');
  animate();
});
