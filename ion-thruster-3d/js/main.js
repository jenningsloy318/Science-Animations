import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import {
  CONSTANTS,
  calculateExhaustVelocity,
  calculateThrustAndIsp,
  evaluateRingCuspBField,
  MISSION_PRESETS
} from './physics.js';

import {
  updateAudio,
  toggleMute,
  isAudioMuted,
  playClickSound,
  playIonizeSound
} from './audio.js';

import {
  initApertureView,
  openApertureView,
  closeApertureView
} from './aperture-view.js';

/* ================= 基础场景 ================= */
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
stage.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(innerWidth, innerHeight);
labelRenderer.domElement.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
stage.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#03050c');
scene.fog = new THREE.FogExp2('#03050c', 0.005);

const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.1, 400);
camera.position.set(5.2, 3.6, 9.4);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0.2, 0, 0);
controls.minDistance = 1.8;
controls.maxDistance = 50;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.4;
controls.addEventListener('start', () => { controls.autoRotate = false; });

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.28, 0.45, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* 灯光系统 */
scene.add(new THREE.HemisphereLight('#94a3b8', '#070b18', 1.1));
const sun = new THREE.DirectionalLight('#ffffff', 1.8);
sun.position.set(7, 10, 8);
scene.add(sun);

const cathodeLight = new THREE.PointLight('#ff5566', 3.2, 4.5, 2);
cathodeLight.position.set(-2.2, 0, 0);
scene.add(cathodeLight);

const beamLight = new THREE.PointLight('#38bdf8', 6.5, 14, 2);
beamLight.position.set(3.4, 0, 0);
scene.add(beamLight);

const neutLight = new THREE.PointLight('#facc15', 3.8, 4.5, 2);
neutLight.position.set(2.45, -1.55, 0);
scene.add(neutLight);

/* 星空粒子背景 */
{
  const N = 1800;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 75 + Math.random() * 85;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3]     = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.cos(ph);
    pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    const b = 0.5 + Math.random() * 0.5;
    col[i * 3]     = b;
    col[i * 3 + 1] = b * 0.95;
    col[i * 3 + 2] = b * (0.85 + Math.random() * 0.25);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.55, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false
  })));
}

/* ================= 粒子系统（着色器点云） ================= */
const particleMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  uniforms: { uPR: { value: Math.min(devicePixelRatio, 2) } },
  vertexShader: `
    attribute float aSize; attribute float aAlpha; attribute vec3 aColor;
    uniform float uPR;
    varying float vA; varying vec3 vC;
    void main() {
      vC = aColor; vA = aAlpha;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * uPR * (160.0 / -mv.z);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    varying float vA; varying vec3 vC;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      float a = smoothstep(0.5, 0.05, d) * vA;
      if (a < 0.02) discard;
      gl_FragColor = vec4(vC, a);
    }`
});

class Cloud {
  constructor(max) {
    this.n = 0;
    this.max = max;
    this.objs = [];
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.points = new THREE.Points(this.geo, particleMat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }
  add(o, r, g, b, size, alpha = 1) {
    if (this.n >= this.max) return -1;
    const i = this.n++;
    this.objs[i] = o;
    this.set(i, o.x || 0, o.y || 0, o.z || 0, r, g, b, size, alpha);
    return i;
  }
  set(i, x, y, z, r, g, b, size, alpha) {
    const p3 = i * 3;
    this.pos[p3] = x; this.pos[p3 + 1] = y; this.pos[p3 + 2] = z;
    this.col[p3] = r; this.col[p3 + 1] = g; this.col[p3 + 2] = b;
    this.size[i] = size; this.alpha[i] = alpha;
  }
  remove(i) {
    const last = --this.n;
    if (i !== last) {
      const p3 = i * 3, l3 = last * 3;
      for (let k = 0; k < 3; k++) {
        this.pos[p3 + k] = this.pos[l3 + k];
        this.col[p3 + k] = this.col[l3 + k];
      }
      this.size[i] = this.size[last];
      this.alpha[i] = this.alpha[last];
      this.objs[i] = this.objs[last];
    }
    this.objs.length = this.n;
  }
  flush() {
    this.geo.setDrawRange(0, this.n);
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aColor.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
  }
}

/* ================= 几何与位置常量 ================= */
const CONE_TIP_X = -2.6, CHAMBER_LX = -1.5, CHAMBER_RX = 1.5, R_CH = 1.5;
const SCREEN_X = 1.52, ACCEL_X = 1.76, DECEL_X = 1.96;
const NEUTRALIZER_TIP = new THREE.Vector3(2.45, -1.6, 0);
const INLET = new THREE.Vector3(-2.58, 0, 0);
const TANK_C = new THREE.Vector3(-4.35, -1.2, 0), TANK_R = 0.85;

function chamberRadius(x) {
  if (x <= CONE_TIP_X) return 0.32;
  if (x < CHAMBER_LX) {
    const t = (x - CONE_TIP_X) / (CHAMBER_LX - CONE_TIP_X);
    return 0.32 + t * (R_CH - 0.32);
  }
  return R_CH;
}

/* ================= 栅格孔径分布 ================= */
const holes = [];
{
  const px2u = 3 / 512;
  const pitch = 38;
  for (let row = -7; row <= 7; row++) {
    for (let col = -7; col <= 7; col++) {
      const tx = 256 + col * pitch + (row % 2 ? pitch / 2 : 0);
      const ty = 256 + row * pitch * 0.87;
      if (Math.hypot(tx - 256, ty - 256) < 256 - 40) {
        holes.push({ y: (ty - 256) * px2u, z: -(tx - 256) * px2u });
      }
    }
  }
}
function nearestHole(y, z) {
  let best = holes[0], bd = Infinity;
  for (const h of holes) {
    const d = (h.y - y) * (h.y - y) + (h.z - z) * (h.z - z);
    if (d < bd) { bd = d; best = h; }
  }
  return best;
}

/* ================= 部件网格构建 ================= */
const interactive = [];
const compMats = {};
function reg(key, ...mats) { (compMats[key] = compMats[key] || []).push(...mats); }
function makePickable(mesh, key) { mesh.userData.key = key; interactive.push(mesh); }
function matte(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.8, roughness: 0.35, ...opts });
}

const proxyMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
function pickProxy(parent, geo, pos, key) {
  const m = new THREE.Mesh(geo, proxyMat);
  m.position.copy(pos);
  m.userData.key = key;
  interactive.push(m);
  parent.add(m);
  return m;
}

const groups = {};
function G(name, offset) {
  const g = new THREE.Group();
  g.userData.base = new THREE.Vector3();
  g.userData.offset = offset;
  groups[name] = g;
  scene.add(g);
  return g;
}

/* —— 2轴常平架（Gimbal Ring Assembly） —— */
const gimbalAssembly = new THREE.Group();
gimbalAssembly.name = 'gimbalAssembly';
scene.add(gimbalAssembly);

const gimbalOuterRing = new THREE.Group();
const gimbalInnerRing = new THREE.Group();
gimbalAssembly.add(gimbalOuterRing);
gimbalOuterRing.add(gimbalInnerRing);

{
  const gimbalMat = matte('#475569', { metalness: 0.75, roughness: 0.3 });
  const outerTorus = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.07, 12, 48), gimbalMat);
  outerTorus.rotation.y = Math.PI / 2;
  outerTorus.position.set(-1.8, 0, 0);
  gimbalOuterRing.add(outerTorus);

  const innerTorus = new THREE.Mesh(new THREE.TorusGeometry(1.82, 0.06, 12, 48), gimbalMat);
  innerTorus.rotation.y = Math.PI / 2;
  innerTorus.position.set(-1.8, 0, 0);
  gimbalInnerRing.add(innerTorus);

  // 2 Linear electromechanical actuators (Pitch & Yaw pushrods)
  const actMat = matte('#94a3b8', { metalness: 0.85, roughness: 0.25 });
  const actBody1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 12), actMat);
  actBody1.rotation.z = Math.PI / 2;
  actBody1.position.set(-2.6, 1.6, 0);
  const actBody2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 12), actMat);
  actBody2.rotation.z = Math.PI / 2;
  actBody2.position.set(-2.6, 0, 1.6);
  gimbalAssembly.add(actBody1, actBody2);

  makePickable(outerTorus, 'gimbal');
  reg('gimbal', gimbalMat, actMat);
}

/* —— 栅格多孔贴图 —— */
function gridTexture(accent, holeRadius = 13) {
  const S = 512, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(S / 2, S / 2, 40, S / 2, S / 2, S / 2);
  grd.addColorStop(0, '#475569');
  grd.addColorStop(0.8, '#334155');
  grd.addColorStop(1, '#1e293b');
  g.fillStyle = grd;
  g.beginPath();
  g.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2);
  g.fill();

  const pitch = 38;
  g.globalCompositeOperation = 'destination-out';
  for (let row = -7; row <= 7; row++) {
    for (let col = -7; col <= 7; col++) {
      const x = S / 2 + col * pitch + (row % 2 ? pitch / 2 : 0);
      const y = S / 2 + row * pitch * 0.87;
      if (Math.hypot(x - S / 2, y - S / 2) < S / 2 - 30) {
        g.beginPath();
        g.arc(x, y, holeRadius, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
  g.globalCompositeOperation = 'source-over';
  g.strokeStyle = accent;
  g.lineWidth = 9;
  g.beginPath();
  g.arc(S / 2, S / 2, S / 2 - 12, 0, Math.PI * 2);
  g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  return tex;
}

/* —— 球面凹凸曲面（Dished Grids）几何生成器 —— */
function createDishedGridGeometry(radius, depth = 0.18, segments = 64) {
  const geo = new THREE.PlaneGeometry(radius * 2, radius * 2, segments, segments);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const r = Math.hypot(x, y);
    if (r <= radius) {
      // Spherical dish curvature: convex downstream (+Z in local coords)
      const z = Math.sqrt(Math.max(0, radius * radius * 4 - r * r)) - Math.sqrt(radius * radius * 4);
      pos.setZ(i, -z * (depth / radius));
    } else {
      pos.setZ(i, 0);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

/* —— 放电室（可切换剖面视图） —— */
let cutaway = true;
const chamberGroup = G('chamber', new THREE.Vector3());
let shellMesh, coneMesh, linerMesh, linerCone;

function buildChamberShell() {
  for (const m of [shellMesh, coneMesh, linerMesh, linerCone]) {
    if (m) { m.geometry.dispose(); chamberGroup.remove(m); }
  }
  const tLen = cutaway ? Math.PI * 1.42 : Math.PI * 2;
  const tStart = cutaway ? Math.PI * 0.55 : 0;

  const shellGeo = new THREE.CylinderGeometry(R_CH, R_CH, 3.0, 64, 1, true, tStart, tLen);
  shellGeo.rotateZ(-Math.PI / 2);

  const coneGeo = new THREE.CylinderGeometry(R_CH, 0.34, 1.1, 48, 1, true, tStart, tLen);
  coneGeo.translate(0, -2.05, 0);
  coneGeo.rotateZ(-Math.PI / 2);

  const shellMat = matte('#2c3a4e', { side: THREE.DoubleSide, roughness: 0.32, emissive: '#0b1424', emissiveIntensity: 0.35 });
  const linerMat = matte('#a16207', { side: THREE.DoubleSide, metalness: 0.88, roughness: 0.28, emissive: '#281404', emissiveIntensity: 0.3 });

  shellMesh = new THREE.Mesh(shellGeo, shellMat);
  coneMesh = new THREE.Mesh(coneGeo, shellMat);

  const linerGeo = new THREE.CylinderGeometry(R_CH - 0.07, R_CH - 0.07, 2.96, 48, 1, true, tStart, tLen);
  linerGeo.rotateZ(-Math.PI / 2);
  linerMesh = new THREE.Mesh(linerGeo, linerMat);

  const linerConeGeo = new THREE.CylinderGeometry(R_CH - 0.07, 0.3, 1.06, 40, 1, true, tStart, tLen);
  linerConeGeo.translate(0, -2.05, 0);
  linerConeGeo.rotateZ(-Math.PI / 2);
  linerCone = new THREE.Mesh(linerConeGeo, linerMat);

  chamberGroup.add(shellMesh, coneMesh, linerMesh, linerCone);
  for (const m of [shellMesh, coneMesh, linerMesh, linerCone]) makePickable(m, 'chamber');
  reg('chamber', shellMat, linerMat);
}
buildChamberShell();

/* 端面法兰 */
{
  const flangeMat = matte('#3b4554', { roughness: 0.3 });
  const f1 = new THREE.Mesh(new THREE.TorusGeometry(R_CH, 0.05, 10, 60), flangeMat);
  f1.rotation.y = Math.PI / 2; f1.position.x = CHAMBER_RX;
  const f0 = new THREE.Mesh(new THREE.TorusGeometry(R_CH, 0.05, 10, 60), flangeMat);
  f0.rotation.y = Math.PI / 2; f0.position.x = CHAMBER_LX;
  chamberGroup.add(f1, f0);
  reg('chamber', flangeMat);
}

/* —— 放电室中心空心阴极（含加热线圈与触极 Keeper） —— */
const cathodeGroup = G('cathode', new THREE.Vector3(-1.15, 0, 0));
{
  const mat = matte('#64748b', { emissive: '#350b0f', emissiveIntensity: 0.4 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.45, 20), mat);
  body.rotation.z = -Math.PI / 2;
  body.position.x = -2.35;

  // Keeper Electrode Disc in front of hollow cathode orifice
  const keeperMat = matte('#e2e8f0', { metalness: 0.9, roughness: 0.2 });
  const keeperDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 20), keeperMat);
  keeperDisc.rotation.z = -Math.PI / 2;
  keeperDisc.position.x = -2.12;

  // Glowing LaB6 insert tip
  const tip = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 16, 16),
    new THREE.MeshBasicMaterial({ color: '#ff6b7a' })
  );
  tip.position.x = -2.11;

  cathodeGroup.add(body, keeperDisc, tip);
  makePickable(body, 'cathode');
  makePickable(keeperDisc, 'cathode');
  pickProxy(cathodeGroup, new THREE.SphereGeometry(0.32, 8, 8), new THREE.Vector3(-2.34, 0, 0), 'cathode');
  reg('cathode', mat, keeperMat);
  cathodeGroup.userData.tip = tip;
}

/* —— 反向供气歧管喷嘴环 (Reverse Gas Plenum Ring) —— */
const plenumGroup = new THREE.Group();
plenumGroup.name = 'plenumGroup';
chamberGroup.add(plenumGroup);
{
  const plenumMat = matte('#38bdf8', { metalness: 0.7, roughness: 0.35, emissive: '#0369a1', emissiveIntensity: 0.35 });
  const pRing = new THREE.Mesh(new THREE.TorusGeometry(R_CH - 0.12, 0.028, 8, 48), plenumMat);
  pRing.rotation.y = Math.PI / 2;
  pRing.position.x = 1.25;
  plenumGroup.add(pRing);

  // Small reverse nozzles pointing toward cone
  const nozzleMat = matte('#e2e8f0');
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const nz = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 6), nozzleMat);
    nz.position.set(1.25, Math.cos(a) * (R_CH - 0.12), Math.sin(a) * (R_CH - 0.12));
    nz.rotation.z = Math.PI / 2; // pointing backward
    plenumGroup.add(nz);
  }
  makePickable(pRing, 'plenum');
  reg('plenum', plenumMat);
}

/* —— 真·环形尖点磁铁（SmCo Permanent Ring Cusps） —— */
const magnetsGroup = G('magnets', new THREE.Vector3(0, 1.2, 0));
const magnetRingsData = [
  { x: -2.1, r: 0.8,  pol: 'N', col: '#dc2626', name: '锥段磁环 (N极朝内)' },
  { x: -0.5, r: R_CH, pol: 'S', col: '#2563eb', name: '柱段中磁环 (S极朝内)' },
  { x:  1.1, r: R_CH, pol: 'N', col: '#dc2626', name: '栅极前磁环 (N极朝内)' },
];

{
  const nMat = matte('#dc2626', { emissive: '#551111', emissiveIntensity: 0.5, roughness: 0.4 });
  const sMat = matte('#2563eb', { emissive: '#112255', emissiveIntensity: 0.5, roughness: 0.4 });
  const ringCollarMat = matte('#334155', { metalness: 0.8, roughness: 0.3 });

  magnetRingsData.forEach((mrd) => {
    const ringGroup = new THREE.Group();
    ringGroup.position.x = mrd.x;

    const collar = new THREE.Mesh(new THREE.TorusGeometry(mrd.r + 0.06, 0.04, 8, 48), ringCollarMat);
    collar.rotation.y = Math.PI / 2;
    ringGroup.add(collar);

    const useMat = mrd.pol === 'N' ? nMat : sMat;
    const count = 12;
    for (let k = 0; k < count; k++) {
      const a = (k / count) * Math.PI * 2;
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.1), useMat);
      box.position.set(0, Math.cos(a) * (mrd.r + 0.06), Math.sin(a) * (mrd.r + 0.06));
      box.rotation.x = -a;
      ringGroup.add(box);
      makePickable(box, 'magnets');
    }

    const proxy = pickProxy(magnetsGroup, new THREE.TorusGeometry(mrd.r + 0.08, 0.12, 6, 32),
      new THREE.Vector3(mrd.x, 0, 0), 'magnets');
    proxy.rotation.y = Math.PI / 2;
    magnetsGroup.add(ringGroup);
  });
  reg('magnets', nMat, sMat, ringCollarMat);
}

/* —— 真·环形尖点磁力线 (Arching Magnetic Cusp Lines) —— */
const magLines = new THREE.Group();
magLines.name = 'magLines';
{
  const mat = new THREE.LineBasicMaterial({
    color: '#22d3ee',
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending
  });

  // Construct realistic arching curves from Ring 0 to Ring 1, and Ring 1 to Ring 2
  const spans = [
    { x0: -2.1, r0: 0.8, x1: -0.5, r1: 1.5 },
    { x0: -0.5, r0: 1.5, x1:  1.1, r1: 1.5 }
  ];

  const numAzimuths = 8;
  for (const sp of spans) {
    for (let aIdx = 0; aIdx < numAzimuths; aIdx++) {
      const angle = (aIdx / numAzimuths) * Math.PI * 2;
      const ca = Math.cos(angle), sa = Math.sin(angle);

      for (let layer = 0; layer < 3; layer++) {
        const penetration = 0.25 + layer * 0.28; // how deep the arch dips into plasma
        const pts = [];
        const steps = 30;
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const x = sp.x0 + (sp.x1 - sp.x0) * t;
          const rBase = sp.r0 + (sp.r1 - sp.r0) * t;
          // Arch dips inward in the middle between the two cusps
          const dip = Math.sin(t * Math.PI) * penetration;
          const r = Math.max(0.35, rBase - dip);
          pts.push(new THREE.Vector3(x, r * ca, r * sa));
        }
        magLines.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
      }
    }
  }
  magLines.visible = false;
  scene.add(magLines);
}

/* —— 球面凹凸离子光学栅格（Screen, Accel, Decel Grids） —— */
const screenGroup = G('screen', new THREE.Vector3(2.7, 0, 0));
const accelGroup = G('accel', new THREE.Vector3(4.3, 0, 0));
const decelGroup = G('decel', new THREE.Vector3(5.8, 0, 0));
let isThreeGridActive = true;

let sGridMesh, aGridMesh, dGridMesh;
{
  const sTex = gridTexture('#ef4444', 13);
  const aTex = gridTexture('#3b82f6', 9);
  const dTex = gridTexture('#10b981', 11);

  const sMat = new THREE.MeshStandardMaterial({
    map: sTex, transparent: true, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.4,
    emissive: '#5c1515', emissiveIntensity: 0.3
  });
  const aMat = new THREE.MeshStandardMaterial({
    map: aTex, transparent: true, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.4,
    emissive: '#152c5c', emissiveIntensity: 0.3
  });
  const dMat = new THREE.MeshStandardMaterial({
    map: dTex, transparent: true, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.4,
    emissive: '#064e3b', emissiveIntensity: 0.3
  });

  const dishGeo = createDishedGridGeometry(R_CH, 0.16, 48);
  dishGeo.rotateY(Math.PI / 2);

  sGridMesh = new THREE.Mesh(dishGeo, sMat);
  sGridMesh.position.x = SCREEN_X;
  screenGroup.add(sGridMesh);

  aGridMesh = new THREE.Mesh(dishGeo.clone(), aMat);
  aGridMesh.position.x = ACCEL_X;
  accelGroup.add(aGridMesh);

  dGridMesh = new THREE.Mesh(dishGeo.clone(), dMat);
  dGridMesh.position.x = DECEL_X;
  decelGroup.add(dGridMesh);

  makePickable(sGridMesh, 'screen');
  makePickable(aGridMesh, 'accel');
  makePickable(dGridMesh, 'decel');

  // Rims & Ceramic Standoff Insulators
  const rimMat = matte('#475569');
  const r1 = new THREE.Mesh(new THREE.TorusGeometry(R_CH, 0.045, 8, 48), rimMat);
  r1.rotation.y = Math.PI / 2; r1.position.x = SCREEN_X;
  screenGroup.add(r1);

  const r2 = new THREE.Mesh(new THREE.TorusGeometry(R_CH, 0.045, 8, 48), rimMat);
  r2.rotation.y = Math.PI / 2; r2.position.x = ACCEL_X;
  accelGroup.add(r2);

  const r3 = new THREE.Mesh(new THREE.TorusGeometry(R_CH, 0.045, 8, 48), rimMat);
  r3.rotation.y = Math.PI / 2; r3.position.x = DECEL_X;
  decelGroup.add(r3);

  // Alumina ceramic high-voltage insulators connecting grid mounting rings
  const insulatorMat = matte('#f8fafc', { roughness: 0.2, metalness: 0.1 });
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 10), insulatorMat);
    ins.position.set(SCREEN_X + 0.12, Math.cos(a) * (R_CH + 0.08), Math.sin(a) * (R_CH + 0.08));
    ins.rotation.z = Math.PI / 2;
    screenGroup.add(ins);
  }

  reg('screen', sMat, rimMat);
  reg('accel', aMat, rimMat);
  reg('decel', dMat, rimMat);
}

/* —— 栅格间加速电场矢量箭头 (Electric Field Arrows) —— */
const fieldArrows = new THREE.Group();
fieldArrows.name = 'fieldArrows';
{
  const dir = new THREE.Vector3(1, 0, 0), origin = new THREE.Vector3();
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const r = 0.25 + (i % 4) * 0.35;
    origin.set(SCREEN_X + 0.03, Math.cos(a) * r, Math.sin(a) * r);
    const arrow = new THREE.ArrowHelper(dir, origin, 0.2, 0xef4444, 0.06, 0.045);
    arrow.line.material.transparent = arrow.cone.material.transparent = true;
    arrow.line.material.opacity = arrow.cone.material.opacity = 0.6;
    fieldArrows.add(arrow);
  }
  scene.add(fieldArrows);
}

/* —— 真实离子束与电荷交换(CEX)羽流光锥 —— */
const plumeGroup = G('plume', new THREE.Vector3());
{
  // Core high-speed ion beam segments
  const segs = [
    { len: 2.2, r0: 0.85, r1: 1.05, op: 0.16, col: '#38bdf8' },
    { len: 2.5, r0: 1.05, r1: 1.30, op: 0.10, col: '#60a5fa' },
    { len: 2.8, r0: 1.30, r1: 1.65, op: 0.06, col: '#a855f7' },
  ];
  let x = ACCEL_X + 0.1;
  for (const s of segs) {
    const geo = new THREE.CylinderGeometry(s.r1, s.r0, s.len, 32, 1, true);
    geo.rotateZ(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: s.col, transparent: true, opacity: s.op, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    mesh.position.x = x + s.len / 2;
    plumeGroup.add(mesh);
    x += s.len;
  }

  // Charge Exchange (CEX) outer low-energy wing plume
  const cexGeo = new THREE.CylinderGeometry(2.4, 1.4, 4.5, 32, 1, true);
  cexGeo.rotateZ(-Math.PI / 2);
  const cexMesh = new THREE.Mesh(cexGeo, new THREE.MeshBasicMaterial({
    color: '#c084fc', transparent: true, opacity: 0.035, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  cexMesh.position.x = ACCEL_X + 3.0;
  plumeGroup.add(cexMesh);

  // Exit beam glow sprite
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const cx = cv.getContext('2d');
  const g = cx.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, 'rgba(180,235,255,0.95)');
  g.addColorStop(0.35, 'rgba(56,189,248,0.45)');
  g.addColorStop(1, 'rgba(56,189,248,0)');
  cx.fillStyle = g; cx.fillRect(0, 0, 128, 128);

  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(cv), transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.4
  }));
  glow.scale.set(1.4, 1.4, 1);
  glow.position.set(2.2, 0, 0);
  plumeGroup.add(glow);

  const proxy = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 0.9, 7.0, 12), proxyMat);
  proxy.geometry.rotateZ(-Math.PI / 2);
  proxy.position.set(5.3, 0, 0);
  proxy.userData.key = 'plume';
  interactive.push(proxy);
  plumeGroup.add(proxy);
}

/* —— 外置中和器 (External Neutralizer Hollow Cathode) —— */
const neutGroup = G('neutralizer', new THREE.Vector3(3.5, -1.2, 0));
{
  const mat = matte('#475569', { emissive: '#3a2c05', emissiveIntensity: 0.4 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.52, 18), mat);
  body.position.set(2.32, -1.75, 0);
  body.rotation.z = -0.65;

  const tip = new THREE.Mesh(
    new THREE.SphereGeometry(0.065, 14, 14),
    new THREE.MeshBasicMaterial({ color: '#ffe08a' })
  );
  tip.position.copy(NEUTRALIZER_TIP);

  neutGroup.add(body, tip);
  makePickable(body, 'neutralizer');
  pickProxy(neutGroup, new THREE.SphereGeometry(0.35, 8, 8), new THREE.Vector3(2.35, -1.72, 0), 'neutralizer');
  reg('neutralizer', mat);
}

/* —— 氙气高压贮箱 + 减压阀 + 供气管路 —— */
const tankGroup = G('tank', new THREE.Vector3(-0.5, -1.0, 0));
{
  // Carbon Overwrapped Pressure Vessel (COPV) texture
  const mat = matte('#64748b', { roughness: 0.28, metalness: 0.75 });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(TANK_R, 44, 34), mat);
  sphere.position.copy(TANK_C);

  const band = new THREE.Mesh(
    new THREE.TorusGeometry(TANK_R + 0.012, 0.035, 8, 48),
    matte('#38bdf8', { emissive: '#0369a1', emissiveIntensity: 0.6 })
  );
  band.position.copy(TANK_C); band.rotation.x = Math.PI / 2;

  tankGroup.add(sphere, band);
  makePickable(sphere, 'tank');
  reg('tank', mat);
}

const pipeGroup = G('pipe', new THREE.Vector3(-0.5, -0.45, 0));
const pipeCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-4.0, -1.08, 0),
  new THREE.Vector3(-3.72, -0.35, 0),
  new THREE.Vector3(-3.25, 0.34, 0),
  new THREE.Vector3(-2.82, 0.08, 0),
  INLET.clone()
]);

let valveMat;
{
  const mat = matte('#78716c', { roughness: 0.35 });
  const tube = new THREE.Mesh(new THREE.TubeGeometry(pipeCurve, 48, 0.06, 10), mat);
  pipeGroup.add(tube);
  makePickable(tube, 'pipe');
  reg('pipe', mat);

  valveMat = matte('#d97706', { emissive: '#7c4a03', emissiveIntensity: 0.6, roughness: 0.4 });
  const valve = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.28), valveMat);
  valve.position.set(-3.28, 0.5, 0);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.16, 10), valveMat);
  stem.position.set(-3.28, 0.42, 0);
  pipeGroup.add(valve, stem);

  makePickable(valve, 'pipe');
  reg('pipe', valveMat);
  pickProxy(pipeGroup, new THREE.SphereGeometry(0.3, 8, 8), new THREE.Vector3(-3.28, 0.48, 0), 'pipe');

  // Secondary feedline to hollow cathode & neutralizer
  const branchMat = new THREE.MeshStandardMaterial({
    color: '#38bdf8', transparent: true, opacity: 0.5, roughness: 0.3, metalness: 0.6
  });
  const bp = [
    new THREE.Vector3(-3.5, -0.7, 0), new THREE.Vector3(-3.5, -2.2, 0),
    new THREE.Vector3(-0.5, -2.2, 0), new THREE.Vector3(2.05, -2.0, 0),
    new THREE.Vector3(2.3, -1.85, 0)
  ];
  const branch = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bp), 40, 0.03, 8), branchMat);
  pipeGroup.add(branch);
}

/* —— PPU 电源处理单元 —— */
const ppuGroup = G('ppu', new THREE.Vector3(-1.0, 1.15, 0));
let led1, led2;
{
  const mat = matte('#475569', { roughness: 0.4, metalness: 0.6, emissive: '#111827', emissiveIntensity: 0.3 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.76, 0.9), mat);
  box.position.set(-4.35, 1.35, 0);
  ppuGroup.add(box);
  makePickable(box, 'ppu');
  reg('ppu', mat);

  const finMat = matte('#64748b');
  for (let i = 0; i < 5; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.52, 0.74), finMat);
    fin.position.set(-4.8 + i * 0.22, 1.35, 0);
    ppuGroup.add(fin);
  }
  led1 = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), new THREE.MeshBasicMaterial({ color: '#4ade80' }));
  led1.position.set(-4.62, 1.62, 0.46);
  led2 = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), new THREE.MeshBasicMaterial({ color: '#facc15' }));
  led2.position.set(-4.45, 1.62, 0.46);
  ppuGroup.add(led1, led2);
}

/* 高压配电电缆 */
const wiresGroup = new THREE.Group();
const wireMats = [];
{
  const routes = [
    { pts: [[-3.9, 1.35, 0.42], [-3.4, 1.0, 0.45], [-2.9, 0.55, 0.35], [-2.5, 0.25, 0.15], [-2.34, 0.1, 0]], col: '#ef4444' },
    { pts: [[-3.82, 1.5, 0.42], [-2.8, 1.85, 0.4], [-1.2, 2.1, 0.3], [0.4, 2.0, 0.15], [1.52, 1.55, 0]], col: '#f59e0b' },
    { pts: [[-3.82, 1.15, 0.42], [-2.6, 1.6, -0.2], [-0.6, 1.9, -0.35], [0.8, 1.75, -0.2], [1.78, 1.5, 0]], col: '#3b82f6' },
    { pts: [[-3.9, 1.1, -0.42], [-3.5, 0.4, -1.2], [-2.8, -0.8, -2.0], [-1.0, -1.8, -2.2], [0.8, -2.2, -1.6], [1.8, -2.1, -0.6], [2.2, -1.9, 0]], col: '#facc15' },
  ];
  for (const r of routes) {
    const curve = new THREE.CatmullRomCurve3(r.pts.map(p => new THREE.Vector3(...p)));
    const tubeGeo = new THREE.TubeGeometry(curve, 48, 0.025, 8, false);
    const mat = new THREE.MeshStandardMaterial({
      color: r.col, roughness: 0.5, metalness: 0.6, transparent: true, opacity: 0.85
    });
    const tube = new THREE.Mesh(tubeGeo, mat);
    wiresGroup.add(tube);
    wireMats.push(mat);
  }
  scene.add(wiresGroup);
}

/* —— 探测器本体 (Gold MLI Thermal Blanket) 与太阳能翼板 —— */
const busGroup = G('bus', new THREE.Vector3(-1.7, 0, 0));
{
  const mliMat = matte('#d97706', {
    metalness: 0.85, roughness: 0.35, emissive: '#451a03', emissiveIntensity: 0.35
  });
  const bus = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 1.6), mliMat);
  bus.position.set(-6.35, 0, 0);
  busGroup.add(bus);
  makePickable(bus, 'bus');
  reg('bus', mliMat);

  // Star trackers on bus
  const trackerMat = matte('#0284c7');
  const st1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.25, 12), trackerMat);
  st1.position.set(-6.35, 1.0, 0.6);
  st1.rotation.x = 0.4;
  busGroup.add(st1);

  // Solar array panels
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = '#0a1428'; g.fillRect(0, 0, 256, 128);
  g.strokeStyle = '#1e3a8a'; g.lineWidth = 3;
  for (let x = 0; x <= 256; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke(); }
  for (let y = 0; y <= 128; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
  g.strokeStyle = '#3b82f6'; g.lineWidth = 6; g.strokeRect(0, 0, 256, 128);

  const panelTex = new THREE.CanvasTexture(cv);
  const panelMat = new THREE.MeshStandardMaterial({
    map: panelTex, metalness: 0.4, roughness: 0.35, emissive: '#0c1a3b', emissiveIntensity: 0.5
  });
  const strutMat = matte('#64748b');

  for (const sgn of [1, -1]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 4.4), panelMat);
    panel.position.set(-6.35, 0, sgn * 3.4);
    busGroup.add(panel);
    makePickable(panel, 'solar');

    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 8), strutMat);
    strut.rotation.x = Math.PI / 2;
    strut.position.set(-6.35, 0, sgn * 1.1);
    busGroup.add(strut);
  }
  reg('solar', panelMat, strutMat);
}

/* ================= 3D 悬浮标签 ================= */
const labelsGroup = new THREE.Group();
scene.add(labelsGroup);

function makeLabel(text, pos, accent) {
  const div = document.createElement('div');
  div.textContent = text;
  div.style.cssText = `font-size:11px;padding:3px 10px;border-radius:999px;background:rgba(10,14,24,.78);
    border:1px solid ${accent}66;color:#dbe7f3;white-space:nowrap;backdrop-filter:blur(6px);
    pointer-events:none;font-weight:400;letter-spacing:.3px;box-shadow:0 2px 10px rgba(0,0,0,0.4);`;
  const lab = new CSS2DObject(div);
  lab.position.copy(pos);
  labelsGroup.add(lab);
  return lab;
}

makeLabel('太阳能电池翼', new THREE.Vector3(-6.35, 0.95, 3.6), '#7986cb');
makeLabel('PPU 电源处理器', new THREE.Vector3(-4.35, 1.85, 0), '#94a3b8');
makeLabel('氙气 COPV 贮箱', new THREE.Vector3(-4.35, -2.15, 0), '#38bdf8');
makeLabel('流量控制阀', new THREE.Vector3(-3.28, 0.85, 0), '#f59e0b');
makeLabel('中心空心阴极', new THREE.Vector3(-2.3, -0.55, 0), '#f43f5e');
makeLabel('环形尖点磁钢 (SmCo)', new THREE.Vector3(0.1, 1.95, 0), '#ef4444');
makeLabel('反向供气喷嘴环', new THREE.Vector3(1.25, 1.85, 0), '#38bdf8');
makeLabel('放电室阳极', new THREE.Vector3(-0.2, 1.85, 0), '#0ea5e9');
makeLabel('屏栅极 (+1500V)', new THREE.Vector3(1.52, -1.9, 0), '#ef4444');
makeLabel('加速栅极 (−300V)', new THREE.Vector3(1.76, -2.15, 0), '#3b82f6');
makeLabel('外置中和器', new THREE.Vector3(2.35, -2.25, 0), '#facc15');
makeLabel('高比冲离子束 ~47 km/s', new THREE.Vector3(5.2, 1.35, 0), '#38bdf8');
makeLabel('常平架矢量机构 (2-Axis)', new THREE.Vector3(-1.8, 2.2, 0), '#94a3b8');

/* ================= 详细部件数据库 ================= */
const INFO = {
  solar: {
    name: '太阳能电池阵翼', en: 'Solar Array Wings', accent: '#7986cb',
    desc: `深空探测器远离太阳，光照按平方反比衰减。“黎明号”翼展近 <strong>19 m</strong>，在 2.8 AU 处依然能提供千瓦级电力驱动 PPU。`,
    chips: ['三结砷化镓', '翼展 19 m', '提供 2.3–10 kW 电力']
  },
  ppu: {
    name: '电源处理单元 (PPU)', en: 'Power Processing Unit', accent: '#94a3b8',
    desc: `推进系统的“心脏控制中心”：把太阳能母线电压变换成多路高低压电源——阴极加热电流、放电电压、屏栅极 <strong>+1500 V 束电源</strong>、加速极 <strong>−300 V</strong> 及中和器供电。`,
    chips: ['效率 ~93%', '多路高压隔离输出', '自主故障保护']
  },
  tank: {
    name: '氙气储罐 (COPV)', en: 'Xenon Tank (COPV)', accent: '#38bdf8',
    desc: `碳纤维缠绕铝内胆高压储罐（<strong>150 bar</strong>）。选氙（Xe）是因为：<strong>惰性安全</strong>、原子量大（<strong>131.3 u</strong>）、电离能低（<strong>12.13 eV</strong>），常温超临界高密度储存。“黎明号”携带 425 kg 氙气支持了 11 年深空飞行。`,
    chips: ['Xe 原子量 131.3 u', '储存压力 150 bar', '电离能 12.13 eV']
  },
  pipe: {
    name: '推进剂供气管路与比例阀', en: 'Propellant Feed & Flow Control', accent: '#f59e0b',
    desc: `双级精密减压阀与比例流量控制器，将高压气瓶精确节流至 <strong>毫克/秒 (mg/s)</strong>：主流量送至放电室，微量支路同时供给空心阴极与中和器。`,
    chips: ['流量 mg/s 级', '热节流阀', '多支路分配']
  },
  cathode: {
    name: '放电室中心空心阴极', en: 'Discharge Hollow Cathode & Keeper', accent: '#f43f5e',
    desc: `电子枪源：内置低逸出功 <strong>LaB₆</strong>（六硼化镧）或 BaO-W 发射体，通电加热至 <strong>>1000 °C</strong> 产生热电子发射。外设金属触极盘（Keeper）引燃电弧，持续向放电室内喷射电子撞击氙气。`,
    chips: ['LaB₆ 发射体', '热电子发射', '触极 Keeper 引弧']
  },
  plenum: {
    name: '反向供气喷嘴歧管环', en: 'Reverse Gas Plenum Ring', accent: '#38bdf8',
    desc: `环形不锈钢管环绕在屏栅极前端，喷嘴<strong>朝后方（锥段）反向喷射</strong>氙气。这极大增加了氙原子在放电室内的停留时间与循环行程，将气体电离利用率提升至 <strong>85% 以上</strong>。`,
    chips: ['反向反吹设计', '大幅提升停留时间', '电离利用率 >85%']
  },
  chamber: {
    name: '放电室与阳极内壁', en: 'Discharge Chamber / Anode', accent: '#0ea5e9',
    desc: `“电离工厂”：筒体作为正阳极（约 <strong>+25 V</strong>）。电子在尖点磁场约束下反复回旋游弋，高速撞击中性氙原子：<strong>Xe + e⁻ → Xe⁺ + 2e⁻</strong>。`,
    chips: ['阳极电压 ~25 V', '电子撞击电离', '等离子体密度 10¹² cm⁻³']
  },
  magnets: {
    name: '环形尖点磁钢 (SmCo)', en: 'Ring Cusp Magnets (Samarium-Cobalt)', accent: '#ef4444',
    desc: `钐钴高强永磁体沿轴向排布为<strong>交替极性环（N-S-N）</strong>，在内壁形成磁屏蔽拱弧（尖点场）。中心区域近乎无磁场保证束流均匀；近壁强磁场约束电子沿磁力线螺旋回旋，大幅延长碰撞行程。`,
    chips: ['轴向交替极性', '磁镜反射电子', '中心低杂散磁场']
  },
  screen: {
    name: '球面屏栅极 (Screen Grid)', en: 'Dished Screen Grid (+1500V)', accent: '#ef4444',
    desc: `<strong>球面冲压微弧形状</strong>（抗热变形），开有数千个高精度微孔（开孔率 ~67%）。带 <strong>+1500 V</strong> 高压，是离子的出发平台。与放电室等离子体交界面形成凹形等离子体鞘层（Meniscus）。`,
    chips: ['+1500 V', '球面凹凸抗变形', '开孔率 ~67%']
  },
  accel: {
    name: '球面加速极 (Accel Grid)', en: 'Dished Accel Grid (−300V)', accent: '#3b82f6',
    desc: `与屏栅极相距仅约 <strong>1.5–2.0 mm</strong>，施加 <strong>−300 V</strong> 强负压。极强静电场将正离子瞬间加速至 <strong>30–50 km/s</strong>！负电位同时构筑势垒，严禁下游电子倒流入放电室。`,
    chips: ['−300 V', '间隙 1.5–2.0 mm', '防电子倒流 (Backstreaming)']
  },
  decel: {
    name: '减速接地栅 (Decel Grid)', en: 'Decelerator Grid (0V Ground)', accent: '#10b981',
    desc: `第三片金属栅极（地电位 0V）。阻挡离子束与空间中性气体发生<strong>电荷交换 (CEX)</strong> 产生的慢离子倒吸腐蚀加速栅极，大幅延长推进器使用寿命至 <strong>50,000+ 小时</strong>。`,
    chips: ['地电位 0 V', '三栅极长寿命设计', '减少 CEX 离子腐蚀']
  },
  neutralizer: {
    name: '外置中和器', en: 'Neutralizer (Hollow Cathode)', accent: '#facc15',
    desc: `独立空心阴极，向排出的正离子束注入等量<strong>电子</strong>保持整船电中性。若缺少中和，探测器将迅速积攒巨大负电荷，把正离子全拉回来，导致推力彻底归零并打火烧毁器壁。`,
    chips: ['发射等量电子', '消除空间电荷积聚', '防止正离子回吸']
  },
  plume: {
    name: '高比冲离子羽流', en: 'Ion Beam Plume & CEX Wings', accent: '#38bdf8',
    desc: `高能氙离子发射出特征<strong>天蓝/淡紫色辉光</strong>。排气速度达到 <strong>40–50 km/s</strong>（化学火箭的 10 倍以上！）。单台推力约 <strong>92–236 mN</strong>，但连续推进数年可积累巨大速度增量。`,
    chips: ['排速 40–50 km/s', '比冲 3100–4200 s', '淡紫色氙离子发光']
  },
  gimbal: {
    name: '两轴常平架推力矢量机构', en: 'Two-Axis Gimbal Assembly', accent: '#94a3b8',
    desc: `双轴常平架支撑环与两台机电直线作动器，提供 <strong>±5° 俯仰与偏航推力偏转</strong>。当主推力点火、氙气消耗使探测器质心漂移时，常平架实时修正推力线对准质心，实现姿轨一体化控制。`,
    chips: ['双轴偏转 ±5°', '质心自适应对齐', '机电推杆伺服']
  },
  bus: {
    name: '探测器本体', en: 'Spacecraft Main Bus', accent: '#b08d3e',
    desc: `深空探测器主框架，外覆金色多层隔热组件 (MLI)，搭载恒星敏感器、星载计算机与推进推进剂管路系统。`
  }
};

/* ================= 粒子云集合 ================= */
const sysTank = new Cloud(150);
const sysPipe = new Cloud(60);
const sysAtom = new Cloud(120);
const sysElectron = new Cloud(160);
const sysIon = new Cloud(550);
const sysNeut = new Cloud(160);
const sysSpark = new Cloud(3500);

const C_ATOM = [0.62, 0.68, 0.78];
const C_ION = [0.22, 0.74, 0.97];
const C_NEUTRAL = [0.66, 0.33, 0.97];
const C_E = [0.96, 0.25, 0.37];
const C_NE = [0.98, 0.8, 0.09];

/* ================= 全局状态 ================= */
let isRunning = true;
let voltage = 1500;
let accelVoltage = -300;
let flow = 4;
let timeScale = 1;

let gimbalPitchDeg = 0;
let gimbalYawDeg = 0;

let explodeT = 0;
let explodeTarget = 0;
let simTime = 0;

let followOn = false;
let followIdx = -1;
let followAngle = 0;

let selectedKey = null;
let hoverKey = null;
let tourIdx = -1;
let tourActive = false;
let tourPulse = [];
let labelsOn = true;
let fieldOn = true;
let spawnOK = true;

function rnd(a, b) { return a + Math.random() * (b - a); }

function seedTank() {
  for (let i = 0; i < 120; i++) {
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    const r = (TANK_R - 0.12) * Math.cbrt(Math.random());
    const x = TANK_C.x + r * Math.sin(ph) * Math.cos(th);
    const y = TANK_C.y + r * Math.cos(ph);
    const z = TANK_C.z + r * Math.sin(ph) * Math.sin(th);
    sysTank.add({ vx: rnd(-1, 1), vy: rnd(-1, 1), vz: rnd(-1, 1) }, ...C_ATOM, 1.7, 0.9);
    const i3 = (sysTank.n - 1) * 3;
    sysTank.pos[i3] = x; sysTank.pos[i3 + 1] = y; sysTank.pos[i3 + 2] = z;
  }
}

function flash(x, y, z, r, g, b, size, life) {
  sysSpark.add({ life, maxLife: life, vx: 0, vy: 0, vz: 0 }, r, g, b, size, 1);
  const i3 = (sysSpark.n - 1) * 3;
  sysSpark.pos[i3] = x; sysSpark.pos[i3 + 1] = y; sysSpark.pos[i3 + 2] = z;
}

function spark(x, y, z, r, g, b, size, life, vx = 0, vy = 0, vz = 0) {
  sysSpark.add({ life, maxLife: life, vx, vy, vz }, r, g, b, size, 0.85);
  const i3 = (sysSpark.n - 1) * 3;
  sysSpark.pos[i3] = x; sysSpark.pos[i3 + 1] = y; sysSpark.pos[i3 + 2] = z;
}

/* ================= 物理运动仿真 ================= */
const spawnAccum = { pipe: 0, electron: 0, neut: 0, atom: 0 };

function simulate(dt) {
  simTime += dt;
  spawnOK = explodeT < 0.35;

  /* 1. 贮箱粒子运动 */
  const pipeEntry = new THREE.Vector3(-4.0, -1.08, 0);
  for (let i = sysTank.n - 1; i >= 0; i--) {
    const o = sysTank.objs[i], i3 = i * 3;
    let x = sysTank.pos[i3], y = sysTank.pos[i3 + 1], z = sysTank.pos[i3 + 2];
    const dxe = pipeEntry.x - x, dye = pipeEntry.y - y, dze = pipeEntry.z - z;
    const de = Math.hypot(dxe, dye, dze) + 1e-6;
    const pull = 3.2 * dt * (1 + flow * 0.3);
    o.vx += dxe / de * pull; o.vy += dye / de * pull; o.vz += dze / de * pull;
    o.vx += rnd(-3, 3) * dt; o.vy += rnd(-3, 3) * dt; o.vz += rnd(-3, 3) * dt;
    const sp = Math.hypot(o.vx, o.vy, o.vz), cap = 1.6 + flow * 0.15;
    if (sp > cap) { o.vx *= cap / sp; o.vy *= cap / sp; o.vz *= cap / sp; }
    x += o.vx * dt; y += o.vy * dt; z += o.vz * dt;

    const dx = x - TANK_C.x, dy = y - TANK_C.y, dz = z - TANK_C.z;
    const dc = Math.hypot(dx, dy, dz);
    if (dc > TANK_R - 0.06 && de > 0.3) {
      const a = 1 / dc;
      x = TANK_C.x + dx * a * (TANK_R - 0.07);
      y = TANK_C.y + dy * a * (TANK_R - 0.07);
      z = TANK_C.z + dz * a * (TANK_R - 0.07);
      o.vx = -o.vx * 0.6; o.vy = -o.vy * 0.6; o.vz = -o.vz * 0.6;
    }
    if (de < 0.14 && sysPipe.n < sysPipe.max && spawnOK) {
      sysPipe.add({ t: 0 }, 0.75, 0.82, 0.9, 1.8, 1);
      sysPipe.remove(i);
      continue;
    }
    sysTank.pos[i3] = x; sysTank.pos[i3 + 1] = y; sysTank.pos[i3 + 2] = z;
  }

  /* 2. 管路流动 */
  if (spawnOK) {
    spawnAccum.pipe += dt * (1.4 + flow * 1.1);
    while (spawnAccum.pipe > 1 && sysPipe.n < sysPipe.max) {
      spawnAccum.pipe -= 1;
      sysPipe.add({ t: 0 }, 0.75, 0.82, 0.9, 1.8, 1);
    }
  }
  for (let i = sysPipe.n - 1; i >= 0; i--) {
    const o = sysPipe.objs[i];
    o.t += dt * (0.45 + flow * 0.09);
    if (o.t >= 1) {
      sysPipe.remove(i);
      if (spawnOK && sysAtom.n < sysAtom.max - 2) {
        // Dual feed: 80% through reverse plenum ring, 20% through hollow cathode
        if (Math.random() < 0.8) {
          // Reverse plenum injection (spraying backward from x = 1.25)
          const a = Math.random() * Math.PI * 2;
          sysAtom.add({ vx: rnd(-1.5, -0.8), vy: rnd(-0.5, 0.5), vz: rnd(-0.5, 0.5) }, ...C_ATOM, 1.9, 1);
          const i3 = (sysAtom.n - 1) * 3;
          sysAtom.pos[i3] = 1.22;
          sysAtom.pos[i3 + 1] = Math.cos(a) * (R_CH - 0.15);
          sysAtom.pos[i3 + 2] = Math.sin(a) * (R_CH - 0.15);
        } else {
          // Hollow cathode injection
          sysAtom.add({ vx: rnd(1.0, 1.6), vy: rnd(-0.4, 0.4), vz: rnd(-0.4, 0.4) }, ...C_ATOM, 1.9, 1);
          const i3 = (sysAtom.n - 1) * 3;
          sysAtom.pos[i3] = INLET.x; sysAtom.pos[i3 + 1] = rnd(-0.12, 0.12); sysAtom.pos[i3 + 2] = rnd(-0.12, 0.12);
        }
      }
      continue;
    }
    const p = pipeCurve.getPointAt(Math.min(o.t, 1));
    const i3 = i * 3;
    sysPipe.pos[i3] = p.x; sysPipe.pos[i3 + 1] = p.y; sysPipe.pos[i3 + 2] = p.z;
  }

  /* 3. 放电室内中性原子热运动与器壁反弹 */
  const targetAtoms = Math.min(22 + flow * 8, sysAtom.max - 4);
  if (spawnOK && sysAtom.n < targetAtoms) {
    spawnAccum.atom += dt * (targetAtoms - sysAtom.n) * 0.8;
    while (spawnAccum.atom > 1 && sysAtom.n < targetAtoms) {
      spawnAccum.atom -= 1;
      sysAtom.add({ vx: rnd(-1.4, -0.6), vy: rnd(-0.5, 0.5), vz: rnd(-0.5, 0.5) }, ...C_ATOM, 1.9, 1);
      const i3 = (sysAtom.n - 1) * 3;
      const a = Math.random() * Math.PI * 2;
      sysAtom.pos[i3] = 1.2;
      sysAtom.pos[i3 + 1] = Math.cos(a) * (R_CH - 0.2);
      sysAtom.pos[i3 + 2] = Math.sin(a) * (R_CH - 0.2);
    }
  }

  for (let i = sysAtom.n - 1; i >= 0; i--) {
    const o = sysAtom.objs[i], i3 = i * 3;
    let x = sysAtom.pos[i3], y = sysAtom.pos[i3 + 1], z = sysAtom.pos[i3 + 2];
    o.vx += rnd(-2.5, 2.5) * dt;
    o.vy += rnd(-2.5, 2.5) * dt;
    o.vz += rnd(-2.5, 2.5) * dt;
    const sp = Math.hypot(o.vx, o.vy, o.vz);
    if (sp > 1.5) { o.vx *= 1.5 / sp; o.vy *= 1.5 / sp; o.vz *= 1.5 / sp; }
    x += o.vx * dt; y += o.vy * dt; z += o.vz * dt;

    const rr = Math.hypot(y, z), rmax = chamberRadius(x) - 0.12;
    if (rr > rmax && rmax > 0.05) {
      const a = rmax / (rr + 1e-9);
      y *= a; z *= a;
      o.vy *= -0.7; o.vz *= -0.7;
    }
    if (x < CONE_TIP_X + 0.1) { x = CONE_TIP_X + 0.1; o.vx = Math.abs(o.vx); }
    if (x > SCREEN_X - 0.08) {
      if (Math.random() < 0.25) { sysAtom.remove(i); continue; } // neutral loss
      x = SCREEN_X - 0.08; o.vx = -Math.abs(o.vx);
    }
    sysAtom.pos[i3] = x; sysAtom.pos[i3 + 1] = y; sysAtom.pos[i3 + 2] = z;
  }

  /* 4. 阴极发射电子与环形尖点磁场螺旋回旋 (Larmor Gyration & Magnetic Mirror) */
  const targetE = 95;
  if (spawnOK) {
    spawnAccum.electron += dt * 20;
    while (spawnAccum.electron > 1 && sysElectron.n < targetE) {
      spawnAccum.electron -= 1;
      sysElectron.add({
        vx: rnd(2.4, 4.4), vy: rnd(-1.5, 1.5), vz: rnd(-1.5, 1.5),
        life: rnd(8, 14), sparkT: Math.random() * 0.2, phaseAngle: Math.random() * Math.PI * 2
      }, ...C_E, 1.5, 1);
      const i3 = (sysElectron.n - 1) * 3;
      sysElectron.pos[i3] = -2.12; sysElectron.pos[i3 + 1] = rnd(-0.06, 0.06); sysElectron.pos[i3 + 2] = rnd(-0.06, 0.06);
    }
  }

  for (let i = sysElectron.n - 1; i >= 0; i--) {
    const o = sysElectron.objs[i], i3 = i * 3;
    let x = sysElectron.pos[i3], y = sysElectron.pos[i3 + 1], z = sysElectron.pos[i3 + 2];
    o.life -= dt;
    if (o.life <= 0) { sysElectron.remove(i); continue; }

    // Evaluate B-field at electron position
    const bField = evaluateRingCuspBField(x, y, z);
    if (bField.bMag > 0.02) {
      // Near cusp wall: tight Larmor gyration and magnetic mirror bounce
      o.phaseAngle += 28.0 * dt;
      o.vy += Math.cos(o.phaseAngle) * 8.0 * dt;
      o.vz += Math.sin(o.phaseAngle) * 8.0 * dt;
      // Magnetic mirror force repelling from wall cusp
      if (bField.bMag > 0.08) {
        o.vx *= -0.85;
      }
    } else {
      // Core unmagnetized region: forward drift with random scattering
      o.vx += 1.2 * dt;
      o.vy += rnd(-12, 12) * dt;
      o.vz += rnd(-12, 12) * dt;
    }

    const sp = Math.hypot(o.vx, o.vy, o.vz);
    if (sp > 3.6) { o.vx *= 3.6 / sp; o.vy *= 3.6 / sp; o.vz *= 3.6 / sp; }
    x += o.vx * dt; y += o.vy * dt; z += o.vz * dt;

    const rr = Math.hypot(y, z), rmax = chamberRadius(x) - 0.12;
    if (rr > rmax && rmax > 0.05) {
      const a = rmax / (rr + 1e-9);
      y *= a; z *= a;
      o.vy *= -0.85; o.vz *= -0.85;
    }
    if (x < CONE_TIP_X + 0.12) { x = CONE_TIP_X + 0.12; o.vx = Math.abs(o.vx); }
    if (x > SCREEN_X - 0.16) { x = SCREEN_X - 0.16; o.vx = -Math.abs(o.vx); }
    sysElectron.pos[i3] = x; sysElectron.pos[i3 + 1] = y; sysElectron.pos[i3 + 2] = z;

    o.sparkT -= dt;
    if (o.sparkT <= 0 && sysSpark.n < sysSpark.max - 10) {
      o.sparkT = 0.15;
      spark(x, y, z, 0.85, 0.22, 0.32, 1.3, 0.35);
    }
  }

  /* 5. 碰撞电离：e⁻ + Xe → Xe⁺ + 2e⁻ */
  for (let ai = sysAtom.n - 1; ai >= 0; ai--) {
    const a3 = ai * 3;
    const ax = sysAtom.pos[a3], ay = sysAtom.pos[a3 + 1], az = sysAtom.pos[a3 + 2];
    for (let ei = 0; ei < sysElectron.n; ei++) {
      const e3 = ei * 3;
      const dx = ax - sysElectron.pos[e3], dy = ay - sysElectron.pos[e3 + 1], dz = az - sysElectron.pos[e3 + 2];
      if (dx * dx + dy * dy + dz * dz < 0.025) {
        sysAtom.remove(ai);
        flash(ax, ay, az, 0.9, 0.96, 1.0, 6.8, 0.3);
        playIonizeSound();

        if (sysIon.n < sysIon.max) {
          sysIon.add({
            phase: 'drift', vx: rnd(0.6, 1.2), vy: rnd(-0.3, 0.3), vz: rnd(-0.3, 0.3),
            hole: null, neutralized: false, sparkT: 0, isCEX: false
          }, ...C_ION, 2.4, 1);
          const i3 = (sysIon.n - 1) * 3;
          sysIon.pos[i3] = ax; sysIon.pos[i3 + 1] = ay; sysIon.pos[i3 + 2] = az;
          if (followOn && followIdx < 0) followIdx = sysIon.n - 1;
        }

        // Secondary electron generated
        if (sysElectron.n < sysElectron.max - 1) {
          sysElectron.add({
            vx: rnd(-2.2, 2.2), vy: rnd(-2.2, 2.2), vz: rnd(-2.2, 2.2),
            life: rnd(6, 10), sparkT: 0.2, phaseAngle: Math.random() * 6.28
          }, ...C_E, 1.5, 1);
          const e3b = (sysElectron.n - 1) * 3;
          sysElectron.pos[e3b] = ax; sysElectron.pos[e3b + 1] = ay; sysElectron.pos[e3b + 2] = az;
        }
        break;
      }
    }
  }

  /* 6. 离子加速、静电透镜聚焦与羽流排气 */
  const vScale = voltage / 1500;
  const vTotal = voltage - accelVoltage;
  const accelScale = Math.sqrt(vTotal / 1800);

  for (let i = sysIon.n - 1; i >= 0; i--) {
    const o = sysIon.objs[i], i3 = i * 3;
    let x = sysIon.pos[i3], y = sysIon.pos[i3 + 1], z = sysIon.pos[i3 + 2];

    if (o.phase === 'drift') {
      o.vx += 1.35 * dt; o.vy += rnd(-0.5, 0.5) * dt; o.vz += rnd(-0.5, 0.5) * dt;
      if (o.vx > 2.5) o.vx = 2.5;
      x += o.vx * dt; y += o.vy * dt; z += o.vz * dt;
      const rr = Math.hypot(y, z), rmax = chamberRadius(x) - 0.1;
      if (rr > rmax && rmax > 0.05) { const a = rmax / (rr + 1e-9); y *= a; z *= a; o.vy *= -0.6; o.vz *= -0.6; }

      if (x >= SCREEN_X - 0.06) {
        o.phase = 'gap';
        o.hole = nearestHole(y, z);
        o.vx = Math.max(o.vx, 1.5);
      }
    } else if (o.phase === 'gap') {
      // Strong electrostatic acceleration across grid gap (Child-Langmuir limit)
      o.vx += 580 * accelScale * dt;
      x += o.vx * dt;

      // Electrostatic focusing towards hole center (Pierce gun optical meniscus)
      const k = Math.min(1, 14 * dt);
      y += (o.hole.y - y) * k;
      z += (o.hole.z - z) * k;

      const exitX = isThreeGridActive ? DECEL_X : ACCEL_X;
      if (x >= exitX) {
        o.phase = 'beam';
        // Theoretical exit speed matching calculated exhaust velocity
        o.vx = 25.5 * vScale + rnd(0, 3);
        // Slight beam divergence
        o.vy = y * 0.14 + rnd(-0.25, 0.25);
        o.vz = z * 0.14 + rnd(-0.25, 0.25);
        flash(x, y, z, 0.3, 0.8, 1.0, 4.5, 0.25);
      }
    } else {
      // High-speed beam propagation
      x += o.vx * dt;
      y += o.vy * dt;
      z += o.vz * dt;

      // Resonant Charge Exchange (CEX): fast ion collides with slow neutral Xe, creating slow CEX wing ion
      if (!o.isCEX && x > 2.4 && x < 5.0 && Math.random() < dt * 0.4) {
        o.isCEX = true;
        o.vx *= 0.4; // decelerates significantly
        o.vy += rnd(-1.5, 1.5); // scatters radially to form plume wings
        o.vz += rnd(-1.5, 1.5);
        sysIon.col[i3] = 0.75; sysIon.col[i3 + 1] = 0.52; sysIon.col[i3 + 2] = 0.98;
      }

      // Neutralization downstream by neutralizer electrons
      if (!o.neutralized && x > 3.2 && Math.random() < dt * 2.4) {
        neutralizeIon(i);
      }
    }
    sysIon.pos[i3] = x; sysIon.pos[i3 + 1] = y; sysIon.pos[i3 + 2] = z;

    // Ion beam trail
    if (o.phase === 'beam' && x > 1.85 && x < 8.6) {
      o.sparkT -= dt;
      if (o.sparkT <= 0 && sysSpark.n < sysSpark.max - 2) {
        o.sparkT = 0.05;
        const c = o.neutralized ? C_NEUTRAL : (o.isCEX ? [0.75, 0.52, 0.98] : C_ION);
        spark(x + 0.1, y, z, c[0], c[1], c[2], 2.1, 0.5, o.vx * 0.7, rnd(-0.15, 0.15), rnd(-0.15, 0.15));
      }
    }
    if (x > 8.8) {
      if (followIdx === i) followIdx = -1;
      sysIon.remove(i);
      if (followIdx > i) followIdx--;
    }
  }

  /* 7. 中和器发射中和电子并沿羽流流向库仑捕获 */
  if (spawnOK) {
    spawnAccum.neut += dt * Math.max(2, sysIon.n * 0.05);
    while (spawnAccum.neut > 1 && sysNeut.n < Math.min(sysNeut.max, 115)) {
      spawnAccum.neut -= 1;
      const dir = new THREE.Vector3(rnd(0.5, 1.4), rnd(1.6, 2.6), rnd(-0.4, 0.4)).normalize().multiplyScalar(rnd(1.8, 2.8));
      sysNeut.add({ vx: dir.x, vy: dir.y, vz: dir.z, life: rnd(4, 7) }, ...C_NE, 1.6, 1);
      const i3 = (sysNeut.n - 1) * 3;
      sysNeut.pos[i3] = NEUTRALIZER_TIP.x + rnd(-0.04, 0.04);
      sysNeut.pos[i3 + 1] = NEUTRALIZER_TIP.y + rnd(-0.04, 0.04);
      sysNeut.pos[i3 + 2] = NEUTRALIZER_TIP.z + rnd(-0.04, 0.04);
    }
  }

  const ionScan = Math.min(sysIon.n, 150);
  for (let i = sysNeut.n - 1; i >= 0; i--) {
    const o = sysNeut.objs[i], i3 = i * 3;
    let x = sysNeut.pos[i3], y = sysNeut.pos[i3 + 1], z = sysNeut.pos[i3 + 2];
    o.life -= dt;

    let bx = 0, by = 0, bz = 0, bd = 8;
    for (let j = 0; j < ionScan; j++) {
      const jo = sysIon.objs[j];
      if (jo.neutralized || jo.phase !== 'beam') continue;
      const j3 = j * 3;
      const dx = sysIon.pos[j3] - x, dy = sysIon.pos[j3 + 1] - y, dz = sysIon.pos[j3 + 2] - z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < bd) { bd = d2; bx = dx; by = dy; bz = dz; }
    }
    if (bd < 8) {
      const d = Math.sqrt(bd) + 1e-6;
      o.vx += (bx / d) * 6.5 * dt;
      o.vy += (by / d) * 6.5 * dt;
      o.vz += (bz / d) * 6.5 * dt;
    }
    x += o.vx * dt; y += o.vy * dt; z += o.vz * dt;
    sysNeut.pos[i3] = x; sysNeut.pos[i3 + 1] = y; sysNeut.pos[i3 + 2] = z;

    if (o.life <= 0 || x > 8.5 || Math.abs(y) > 2.8) { sysNeut.remove(i); continue; }

    if (bd < 0.03) {
      for (let j = 0; j < ionScan; j++) {
        const j3 = j * 3;
        const dd = Math.hypot(sysIon.pos[j3] - x, sysIon.pos[j3 + 1] - y, sysIon.pos[j3 + 2] - z);
        if (dd < 0.18 && !sysIon.objs[j].neutralized) {
          neutralizeIon(j);
          break;
        }
      }
      sysNeut.remove(i);
    }
  }

  /* 8. 火花生命周期更新 */
  for (let i = sysSpark.n - 1; i >= 0; i--) {
    const o = sysSpark.objs[i];
    o.life -= dt;
    if (o.life <= 0) { sysSpark.remove(i); continue; }
    const i3 = i * 3;
    sysSpark.pos[i3] += o.vx * dt;
    sysSpark.pos[i3 + 1] += o.vy * dt;
    sysSpark.pos[i3 + 2] += o.vz * dt;
    sysSpark.alpha[i] = Math.max(0, o.life / o.maxLife) * 0.85;
  }
}

function neutralizeIon(i) {
  const o = sysIon.objs[i];
  if (!o || o.neutralized) return;
  o.neutralized = true;
  const i3 = i * 3;
  sysIon.col[i3] = C_NEUTRAL[0];
  sysIon.col[i3 + 1] = C_NEUTRAL[1];
  sysIon.col[i3 + 2] = C_NEUTRAL[2];
  flash(sysIon.pos[i3], sysIon.pos[i3 + 1], sysIon.pos[i3 + 2], 1.0, 0.85, 0.35, 4.5, 0.3);
}

/* ================= 交互：鼠标悬停与拾取 ================= */
const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2(-10, -10);
let mousePx = { x: 0, y: 0 }, downPos = null;
const tooltip = document.getElementById('tooltip');

renderer.domElement.addEventListener('pointermove', (e) => {
  mousePx.x = e.clientX; mousePx.y = e.clientY;
  mouseNDC.x = (e.clientX / innerWidth) * 2 - 1;
  mouseNDC.y = -(e.clientY / innerHeight) * 2 + 1;
});
renderer.domElement.addEventListener('pointerdown', (e) => { downPos = { x: e.clientX, y: e.clientY }; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!downPos) return;
  const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
  downPos = null;
  if (moved < 6 && hoverKey) {
    selectComp(hoverKey);
    playClickSound();
  }
});

function raycastHover() {
  raycaster.setFromCamera(mouseNDC, camera);
  const hits = raycaster.intersectObjects(interactive, false);
  const key = hits.length ? hits[0].object.userData.key : null;
  if (key !== hoverKey) {
    hoverKey = key;
    renderer.domElement.style.cursor = key ? 'pointer' : 'grab';
    if (key) {
      const d = INFO[key];
      tooltip.textContent = d ? `${d.name} · 点击查看详解` : key;
      tooltip.style.display = 'block';
    } else {
      tooltip.style.display = 'none';
    }
  }
  if (hoverKey) {
    tooltip.style.left = (mousePx.x + 14) + 'px';
    tooltip.style.top = (mousePx.y + 10) + 'px';
  }
}

function setGlow(key, intensity) {
  const mats = compMats[key];
  if (!mats) return;
  for (const m of mats) {
    if (m.emissiveIntensity !== undefined) {
      if (m.userData.baseEI === undefined) m.userData.baseEI = m.emissiveIntensity;
      m.emissiveIntensity = Math.max(m.userData.baseEI, intensity);
    }
  }
}

function refreshGlow(t) {
  for (const key in compMats) {
    let target = null;
    if (compMats[key][0].userData.baseEI !== undefined) target = compMats[key][0].userData.baseEI;
    if (key === hoverKey) target = Math.max(target ?? 0, 0.85);
    if (key === selectedKey) target = Math.max(target ?? 0, 0.95);
    if (tourPulse.includes(key)) target = Math.max(target ?? 0, 0.7 + 0.45 * (0.5 + 0.5 * Math.sin(t * 5)));
    if (target !== null) setGlow(key, target);
  }
}

const infoPanel = document.getElementById('infoPanel');
function selectComp(key) {
  selectedKey = key;
  const d = INFO[key];
  if (!d) return;
  document.getElementById('infoName').textContent = d.name;
  document.getElementById('infoName').style.color = d.accent;
  document.getElementById('infoEn').textContent = d.en;
  document.getElementById('infoDesc').innerHTML = d.desc;
  document.getElementById('infoChips').innerHTML =
    (d.chips || []).map(c => `<span class="chip">${c}</span>`).join('');
  infoPanel.classList.add('open');
}
document.getElementById('infoClose').onclick = () => {
  selectedKey = null;
  infoPanel.classList.remove('open');
  playClickSound();
};

/* ================= 引导浏览 (Tour) ================= */
const TOUR = [
  {
    title: '🛰 总览 — 栅格静电离子推进器',
    text: `参考 NASA NSTAR / NEXT 真实工程：“黎明号”与“深空一号”同款技术架构。<strong>高压贮箱供氙 → 空心阴极起弧电离 → 环形尖点磁场增效 → 双/三栅极静电加速 → 外置中和器中和</strong>。推力虽仅几十至几百毫牛，但比冲高达化学火箭的 10 倍，可连续工作数万小时！`,
    pos: [4.8, 3.4, 8.8], tgt: [0.2, 0, 0], hl: []
  },
  {
    title: '① 氙气供应与反向供气歧管',
    text: `氙气常温高压储存（150 bar），经比例流量阀以毫克/秒量级节流。<strong>反向供气环</strong>位于栅极前方，朝后方反吹喷气；微量支路供电离阴极与中和器。拖动“氙气流量”滑块观察气体补充。`,
    pos: [-3.4, 1.4, 4.0], tgt: [-3.5, -0.4, 0], hl: ['tank', 'pipe', 'plenum']
  },
  {
    title: '② 空心阴极与环形尖点磁约束',
    text: `<strong>中心空心阴极</strong>加热发射热电子；<strong>环形钐钴磁钢（交替极性 N-S-N）</strong>构建内壁尖点磁屏蔽，迫使电子沿磁力线做 <strong>Larmor 螺旋回旋</strong>并受磁镜反射，大幅增加与氙原子的碰撞电离概率！`,
    pos: [0.4, 2.0, 4.4], tgt: [-1.4, -0.1, 0], hl: ['cathode', 'magnets', 'chamber'], mag: true, cut: true
  },
  {
    title: '③ 球面静电栅极与单孔微透镜',
    text: `<strong>球面冲压屏栅极 (+1500V)</strong> 与 <strong>加速栅极 (−300V)</strong> 相距仅 2 mm。等离子体界面自然凹陷成<strong>静电聚焦透镜</strong>，将离子抽离并加速至 <strong>47 km/s</strong>！点击左侧 🔬 可进入单孔微观视图探索导流匹配。`,
    pos: [3.6, 1.1, 3.2], tgt: [1.6, 0, 0], hl: ['screen', 'accel', 'decel'], field: true, cut: true
  },
  {
    title: '④ 外置中和器与空间电荷平衡',
    text: `外置空心阴极向排气羽流注入等量电子。<strong>中和正电荷</strong>是离子推进器的生命线——若不中和，探测器带负电瞬间将离子束全部吸回，推力归零并烧毁壳体。中和后形成安静、深邃的天蓝色中性羽流。`,
    pos: [6.6, 1.6, 3.4], tgt: [4.6, -0.2, 0], hl: ['neutralizer', 'plume'], cut: true
  },
  {
    title: '⑤ 常平架推力矢量偏转 (Gimbal)',
    text: `深空飞行数年，燃料消耗使飞船质心缓慢漂移。<strong>两轴常平架（±5°）</strong>实时微调推力矢量对准飞船质心，防止翻滚失控。点击左侧 🎛️ 可直接操控推力矢量偏转！`,
    pos: [-0.6, 2.4, 4.8], tgt: [-1.8, 0, 0], hl: ['gimbal'], cut: false
  }
];

const tourPanel = document.getElementById('tourPanel');
const tourDots = document.getElementById('tourDots');
TOUR.forEach((_, i) => {
  const d = document.createElement('i');
  d.onclick = () => { gotoTour(i); playClickSound(); };
  tourDots.appendChild(d);
});

let camTween = null;
function flyTo(pos, tgt, dur = 1.4) {
  camTween = {
    p0: camera.position.clone(), p1: new THREE.Vector3(...pos),
    t0: controls.target.clone(), t1: new THREE.Vector3(...tgt),
    t: 0, dur
  };
}

function gotoTour(i) {
  tourIdx = i;
  const s = TOUR[i];
  document.getElementById('tourTitle').textContent = s.title;
  document.getElementById('tourText').innerHTML = s.text;
  [...tourDots.children].forEach((d, k) => d.classList.toggle('on', k === i));
  tourPulse = s.hl;
  if (s.cut !== undefined) setCutaway(s.cut);
  if (s.mag !== undefined) setMagLines(s.mag);
  if (s.field !== undefined) setField(s.field);
  flyTo(s.pos, s.tgt);
}

function startTour() {
  tourActive = true;
  tourPanel.classList.add('open');
  infoPanel.classList.remove('open'); selectedKey = null;
  stopFollow();
  gotoTour(0);
}

function stopTour() {
  tourActive = false;
  tourPanel.classList.remove('open');
  tourPulse = [];
  setCutaway(true); setMagLines(false); setField(true);
}

document.getElementById('btnTour').onclick = () => {
  playClickSound();
  tourActive ? stopTour() : startTour();
};
document.getElementById('tourNext').onclick = () => { playClickSound(); gotoTour(Math.min(tourIdx + 1, TOUR.length - 1)); };
document.getElementById('tourPrev').onclick = () => { playClickSound(); gotoTour(Math.max(tourIdx - 1, 0)); };
document.getElementById('tourExit').onclick = () => { playClickSound(); stopTour(); };

/* ================= 模式与工具栏开关 ================= */
const btnCut = document.getElementById('btnCut');
function setCutaway(on) {
  if (cutaway === on) return;
  cutaway = on;
  buildChamberShell();
  btnCut.classList.toggle('active', on);
}
btnCut.onclick = () => { playClickSound(); setCutaway(!cutaway); };
btnCut.classList.add('active');

const btnExplode = document.getElementById('btnExplode');
btnExplode.onclick = () => {
  playClickSound();
  explodeTarget = explodeTarget > 0.5 ? 0 : 1;
  btnExplode.classList.toggle('active', explodeTarget > 0.5);
};

const btnFollow = document.getElementById('btnFollow');
function startFollow() {
  followOn = true; followIdx = -1;
  btnFollow.classList.add('active');
  document.getElementById('followChip').style.display = 'block';
  controls.enabled = false;
}
function stopFollow() {
  followOn = false; followIdx = -1;
  btnFollow.classList.remove('active');
  document.getElementById('followChip').style.display = 'none';
  controls.enabled = true;
}
btnFollow.onclick = () => { playClickSound(); followOn ? stopFollow() : startFollow(); };

const btnLabels = document.getElementById('btnLabels');
btnLabels.onclick = () => {
  playClickSound();
  labelsOn = !labelsOn;
  labelsGroup.visible = labelsOn;
  btnLabels.classList.toggle('active', labelsOn);
};

const btnMag = document.getElementById('btnMag');
function setMagLines(on) {
  magLines.visible = on;
  btnMag.classList.toggle('active', on);
}
btnMag.onclick = () => { playClickSound(); setMagLines(!magLines.visible); };

const btnField = document.getElementById('btnField');
function setField(on) {
  fieldOn = on;
  fieldArrows.visible = on;
  btnField.classList.toggle('active', on);
}
btnField.onclick = () => { playClickSound(); setField(!fieldOn); };

// 🔬 单孔微观等离子体透镜模式
const btnAperture = document.getElementById('btnAperture');
btnAperture.onclick = () => {
  playClickSound();
  openApertureView(voltage, accelVoltage, flow);
};

// 🎛️ 常平架推力矢量控制小部件
const btnGimbal = document.getElementById('btnGimbal');
const gimbalWidget = document.getElementById('gimbalWidget');
btnGimbal.onclick = () => {
  playClickSound();
  const isOpen = gimbalWidget.classList.toggle('open');
  btnGimbal.classList.toggle('active', isOpen);
};

// 📐 双栅极 / 三栅极 (Decel Grid) 切换
const btnGridMode = document.getElementById('btnGridMode');
btnGridMode.onclick = () => {
  playClickSound();
  isThreeGridActive = !isThreeGridActive;
  decelGroup.visible = isThreeGridActive;
  btnGridMode.classList.toggle('active', isThreeGridActive);
  btnGridMode.title = isThreeGridActive ? '当前：三栅极 (Screen + Accel + Decel)' : '当前：双栅极 (Screen + Accel)';
};

// 🔊 音效开关
const btnSound = document.getElementById('btnSound');
btnSound.onclick = () => {
  const muted = toggleMute();
  btnSound.textContent = muted ? '🔇' : '🔊';
  btnSound.classList.toggle('muted', muted);
  playClickSound();
};

document.getElementById('btnExplore').onclick = () => {
  playClickSound();
  if (tourActive) stopTour();
  if (followOn) stopFollow();
  if (explodeTarget > 0.5) btnExplode.onclick();
  if (gimbalWidget.classList.contains('open')) gimbalWidget.classList.remove('open');
};

/* ================= 常平架滑块事件 ================= */
const pitchSlider = document.getElementById('gimbalPitchSlider');
const yawSlider = document.getElementById('gimbalYawSlider');
const pitchValEl = document.getElementById('gimbalPitchVal');
const yawValEl = document.getElementById('gimbalYawVal');

pitchSlider.oninput = (e) => {
  gimbalPitchDeg = parseFloat(e.target.value);
  pitchValEl.textContent = `${gimbalPitchDeg.toFixed(1)}°`;
  applyGimbalRotation();
};
yawSlider.oninput = (e) => {
  gimbalYawDeg = parseFloat(e.target.value);
  yawValEl.textContent = `${gimbalYawDeg.toFixed(1)}°`;
  applyGimbalRotation();
};
document.getElementById('gimbalResetBtn').onclick = () => {
  playClickSound();
  gimbalPitchDeg = 0; gimbalYawDeg = 0;
  pitchSlider.value = 0; yawSlider.value = 0;
  pitchValEl.textContent = '0.0°'; yawValEl.textContent = '0.0°';
  applyGimbalRotation();
};

function applyGimbalRotation() {
  const pitchRad = (gimbalPitchDeg * Math.PI) / 180;
  const yawRad = (gimbalYawDeg * Math.PI) / 180;
  gimbalInnerRing.rotation.z = pitchRad;
  gimbalOuterRing.rotation.y = yawRad;
}

/* ================= 任务预设切换 ================= */
document.querySelectorAll('.mission-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    playClickSound();
    document.querySelectorAll('.mission-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyMissionPreset(btn.dataset.mission);
  });
});

function applyMissionPreset(missionId) {
  const m = MISSION_PRESETS[missionId];
  if (!m) return;

  voltage = m.screenV;
  accelVoltage = m.accelV;
  flow = (m.flow_mg_s / 0.75);

  document.getElementById('voltageSlider').value = voltage;
  document.getElementById('voltageVal').textContent = `${voltage} V`;
  document.getElementById('accelSlider').value = accelVoltage;
  document.getElementById('accelVal').textContent = `${accelVoltage} V`;
  document.getElementById('flowSlider').value = flow;
  document.getElementById('flowVal').textContent = `${m.flow_mg_s.toFixed(1)} mg/s`;

  updateStats();

  // Show mission summary in inspector panel
  document.getElementById('infoName').textContent = m.nameZh;
  document.getElementById('infoName').style.color = '#38bdf8';
  document.getElementById('infoEn').textContent = m.nameEn;
  document.getElementById('infoDesc').innerHTML = `
    <strong>目标天体 / 载荷</strong>：${m.destinations}<br>
    <strong>点火记录</strong>：${m.burnHours}<br>
    <strong>核心技术亮点</strong>：${m.highlight}
  `;
  document.getElementById('infoChips').innerHTML = `
    <span class="chip">束直径 ${m.beamDiameter_cm} cm</span>
    <span class="chip">额定推力 ${m.nominalThrust_mN} mN</span>
    <span class="chip">额定比冲 ${m.nominalIsp_s} s</span>
    <span class="chip">输入功率 ${m.power_kW} kW</span>
    <span class="chip">排气速度 ${m.nominalVe_kms} km/s</span>
  `;
  infoPanel.classList.add('open');
}

/* ================= 控制条事件 ================= */
document.getElementById('toggleBtn').onclick = function () {
  playClickSound();
  isRunning = !isRunning;
  this.innerText = isRunning ? '⏸ 暂停' : '▶ 继续';
};
document.getElementById('resetBtn').onclick = () => {
  playClickSound();
  for (const s of [sysTank, sysPipe, sysAtom, sysElectron, sysIon, sysNeut, sysSpark]) {
    s.n = 0; s.objs.length = 0; s.flush();
  }
  followIdx = -1;
  seedTank();
};
document.getElementById('camBtn').onclick = () => {
  playClickSound();
  flyTo([5.2, 3.6, 9.4], [0.2, 0, 0], 1.0);
};

document.getElementById('voltageSlider').oninput = (e) => {
  voltage = +e.target.value;
  document.getElementById('voltageVal').textContent = `${voltage} V`;
  updateStats();
};
document.getElementById('accelSlider').oninput = (e) => {
  accelVoltage = +e.target.value;
  document.getElementById('accelVal').textContent = `${accelVoltage} V`;
  updateStats();
};
document.getElementById('flowSlider').oninput = (e) => {
  flow = +e.target.value;
  document.getElementById('flowVal').textContent = (flow * 0.75).toFixed(1) + ' mg/s';
  updateStats();
};
document.getElementById('timeSlider').oninput = (e) => {
  timeScale = +e.target.value;
  document.getElementById('timeVal').textContent = timeScale.toFixed(1) + '×';
};

addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    document.getElementById('toggleBtn').onclick();
  }
  if (e.code === 'Escape') {
    if (document.getElementById('apertureModal').classList.contains('open')) {
      closeApertureView();
    } else if (selectedKey) {
      selectedKey = null;
      infoPanel.classList.remove('open');
    } else if (followOn) {
      stopFollow();
    } else if (tourActive) {
      stopTour();
    }
  }
});

/* ================= 实时物理性能解算 ================= */
function updateStats() {
  const mdot_kg_s = flow * 0.75e-6;
  const res = calculateThrustAndIsp(voltage, accelVoltage, mdot_kg_s);

  document.getElementById('sThrust').textContent = `${res.thrust_mN.toFixed(1)} mN`;
  document.getElementById('sIsp').textContent = `${res.isp_s.toFixed(0)} s`;
  document.getElementById('sVe').textContent = `${(res.ve_mps / 1000).toFixed(1)} km/s`;
  document.getElementById('sMdot').textContent = `${(mdot_kg_s * 1e6).toFixed(2)} mg/s`;
  document.getElementById('sIb').textContent = `${res.beamCurrent_A.toFixed(2)} A`;
  document.getElementById('sPow').textContent = `${res.power_kW.toFixed(2)} kW`;
  document.getElementById('sEff').textContent = `${res.efficiency_pct.toFixed(1)}%`;
}
updateStats();

/* ================= 主渲染循环 ================= */
const clock = new THREE.Clock();
let firstFrame = true;

function animate() {
  requestAnimationFrame(animate);
  const rawDt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  /* 相机平滑飞行 */
  if (camTween) {
    camTween.t += rawDt / camTween.dur;
    const k = camTween.t >= 1 ? 1 : (camTween.t * camTween.t * (3 - 2 * camTween.t));
    camera.position.lerpVectors(camTween.p0, camTween.p1, k);
    controls.target.lerpVectors(camTween.t0, camTween.t1, k);
    if (camTween.t >= 1) camTween = null;
  }

  /* 爆炸视图平滑插值 */
  explodeT += (explodeTarget - explodeT) * Math.min(1, rawDt * 3.2);
  const ex = explodeT < 0.005 ? 0 : explodeT;
  for (const name in groups) {
    const g = groups[name];
    g.position.copy(g.userData.base).addScaledVector(g.userData.offset, ex);
  }
  const wireFade = 1 - Math.min(1, ex * 1.6);
  wiresGroup.visible = wireFade > 0.05;
  for (const m of wireMats) m.opacity = 0.85 * wireFade;

  plumeGroup.position.x = groups.accel.userData.offset.x * ex;
  beamLight.position.set(3.4 + groups.accel.userData.offset.x * ex, 0, 0);

  /* 物理仿真循环 */
  if (isRunning) {
    let rem = rawDt * timeScale;
    while (rem > 0) {
      const step = Math.min(rem, 0.02);
      simulate(step);
      rem -= step;
    }
    for (const s of [sysTank, sysPipe, sysAtom, sysElectron, sysIon, sysNeut, sysSpark]) s.flush();
  }

  /* 跟随单个离子 */
  if (followOn) {
    if (followIdx >= 0 && followIdx < sysIon.n) {
      const i3 = followIdx * 3;
      const px = sysIon.pos[i3], py = sysIon.pos[i3 + 1], pz = sysIon.pos[i3 + 2];
      followAngle += rawDt * 0.55;
      const ox = -4.6, oy = Math.cos(followAngle) * 1.6 + 1.1, oz = Math.sin(followAngle) * 3.0;
      camera.position.set(px + ox, py + oy, pz + oz);
      controls.target.set(px, py, pz);
      const o = sysIon.objs[followIdx];
      if (!o || o.phase === 'gone') followIdx = -1;
    } else {
      followIdx = -1;
    }
  }

  /* 动态视觉细节 */
  cathodeLight.intensity = 2.4 + Math.sin(t * 7) * 0.7;
  cathodeGroup.userData.tip.material.color.setHSL(0.97, 0.85, 0.55 + 0.15 * Math.sin(t * 7));
  led1.material.color.setHex(Math.sin(t * 4) > 0 ? 0x4ade80 : 0x14532d);
  led2.material.color.setHex(Math.sin(t * 5.3 + 2) > 0 ? 0xfacc15 : 0x713f12);
  valveMat.emissiveIntensity = 0.35 + flow * 0.06 + 0.12 * Math.sin(t * 6);
  neutLight.intensity = 3 + Math.sin(t * 9) * 1.2;
  beamLight.intensity = (5.5 + voltage * 0.002) * (sysIon.n > 4 ? 1 : 0.4);

  const arrowOp = 0.3 + 0.35 * (voltage / 2500) + 0.1 * Math.sin(t * 3);
  fieldArrows.children.forEach((a) => {
    a.line.material.opacity = arrowOp;
    a.cone.material.opacity = arrowOp;
  });

  // 更新 Web Audio 声音参数
  updateAudio(voltage, flow, isRunning);

  refreshGlow(t);
  raycastHover();

  controls.update();
  composer.render();
  labelRenderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    const ld = document.getElementById('loading');
    if (ld) {
      ld.style.opacity = '0';
      setTimeout(() => ld.remove(), 600);
    }
  }
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  labelRenderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

// 初始化启动
initApertureView();
seedTank();
animate();
window.__ready = true;
