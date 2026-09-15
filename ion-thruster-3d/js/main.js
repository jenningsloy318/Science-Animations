import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* ================= 基础场景 ================= */
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
stage.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(innerWidth, innerHeight);
labelRenderer.domElement.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
stage.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#05070f');
scene.fog = new THREE.FogExp2('#05070f', 0.006);

const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 400);
camera.position.set(4.6, 3.4, 8.8);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0.2, 0, 0);
controls.minDistance = 2.0;
controls.maxDistance = 45;
controls.autoRotate = true;            // 开场缓慢自转，交互后停止
controls.autoRotateSpeed = 0.45;
controls.addEventListener('start', () => controls.autoRotate = false);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.25, 0.42, 0.85);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* 灯光 */
scene.add(new THREE.HemisphereLight('#9db4d8', '#0b0e18', 1.0));
const sun = new THREE.DirectionalLight('#ffffff', 1.6);
sun.position.set(6, 9, 7);
scene.add(sun);
const cathodeLight = new THREE.PointLight('#ff5566', 3, 4, 2);
cathodeLight.position.set(-2.05, 0, 0);
scene.add(cathodeLight);
const beamLight = new THREE.PointLight('#38bdf8', 6, 12, 2);
beamLight.position.set(3.2, 0, 0);
scene.add(beamLight);
const neutLight = new THREE.PointLight('#facc15', 4, 4, 2);
neutLight.position.set(2.42, -1.5, 0);
scene.add(neutLight);

/* 星空 */
{
  const N = 1600, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 70 + Math.random() * 80;
    const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    pos[i*3]   = r * Math.sin(ph) * Math.cos(th);
    pos[i*3+1] = r * Math.cos(ph);
    pos[i*3+2] = r * Math.sin(ph) * Math.sin(th);
    const b = 0.5 + Math.random() * 0.5;
    col[i*3] = b; col[i*3+1] = b; col[i*3+2] = b * (0.85 + Math.random() * 0.15);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({
    size: 0.5, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, sizeAttenuation: true
  })));
}

/* ================= 粒子系统（通用着色器点云） ================= */
const particleMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { uPR: { value: Math.min(devicePixelRatio, 2) } },
  vertexShader: `
    attribute float aSize; attribute float aAlpha; attribute vec3 aColor;
    uniform float uPR;
    varying float vA; varying vec3 vC;
    void main() {
      vC = aColor; vA = aAlpha;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * uPR * (150.0 / -mv.z);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    varying float vA; varying vec3 vC;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      float a = smoothstep(0.5, 0.06, d) * vA;
      if (a < 0.02) discard;
      gl_FragColor = vec4(vC, a);
    }`
});

/* 可增删的粒子云：buffer + 对齐的 JS 对象数组（swap-remove） */
class Cloud {
  constructor(max) {
    this.n = 0; this.max = max; this.objs = [];
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
    this.set(i, o.x, o.y, o.z, r, g, b, size, alpha);
    return i;
  }
  set(i, x, y, z, r, g, b, size, alpha) {
    const p3 = i * 3;
    this.pos[p3] = x; this.pos[p3+1] = y; this.pos[p3+2] = z;
    this.col[p3] = r; this.col[p3+1] = g; this.col[p3+2] = b;
    this.size[i] = size; this.alpha[i] = alpha;
  }
  remove(i) {
    const last = --this.n;
    if (i !== last) {
      const p3 = i * 3, l3 = last * 3;
      for (let k = 0; k < 3; k++) {
        this.pos[p3+k] = this.pos[l3+k];
        this.col[p3+k] = this.col[l3+k];
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

/* ================= 关键几何常量（世界坐标，+X 为排气方向） ================= */
const CONE_TIP_X = -2.6, CHAMBER_LX = -1.5, CHAMBER_RX = 1.5, R_CH = 1.5;
const SCREEN_X = 1.52, ACCEL_X = 1.78;
const NEUTRALIZER_TIP = new THREE.Vector3(2.5, -1.55, 0);
const INLET = new THREE.Vector3(-2.58, 0, 0);
const TANK_C = new THREE.Vector3(-4.35, -1.2, 0), TANK_R = 0.85;

/* 放电室内任意 x 处的半径（含锥段） */
function chamberRadius(x) {
  if (x <= CONE_TIP_X) return 0.32;
  if (x < CHAMBER_LX) {
    const t = (x - CONE_TIP_X) / (CHAMBER_LX - CONE_TIP_X);
    return 0.32 + t * (R_CH - 0.32);
  }
  return R_CH;
}

/* ================= 栅格孔位（六边形排布，与贴图一致） ================= */
const holes = [];
{
  const px2u = 3 / 512; // 贴图 512px = 直径 3 单位
  const pitch = 38;
  for (let row = -7; row <= 7; row++) for (let col = -7; col <= 7; col++) {
    const tx = 256 + col * pitch + (row % 2 ? pitch / 2 : 0);
    const ty = 256 + row * pitch * 0.87;
    if (Math.hypot(tx - 256, ty - 256) < 256 - 40) {
      holes.push({ y: (ty - 256) * px2u, z: -(tx - 256) * px2u });
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

/* ================= 部件构建 ================= */
const interactive = [];   // 可点击网格
const compMats = {};      // key -> [materials]
function reg(key, ...mats) { (compMats[key] = compMats[key] || []).push(...mats); }
function makePickable(mesh, key) { mesh.userData.key = key; interactive.push(mesh); }
function matte(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.8, roughness: 0.35, ...opts });
}
/* 隐形拾取代理 */
const proxyMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
function pickProxy(parent, geo, pos, key) {
  const m = new THREE.Mesh(geo, proxyMat);
  m.position.copy(pos);
  m.userData.key = key;
  interactive.push(m);
  parent.add(m);
  return m;
}

const groups = {};  // 可爆炸位移的组
function G(name, offset) {
  const g = new THREE.Group();
  g.userData.base = new THREE.Vector3();
  g.userData.offset = offset;
  groups[name] = g;
  scene.add(g);
  return g;
}

/* —— 栅格贴图 —— */
function gridTexture(accent) {
  const S = 512, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(S/2, S/2, 40, S/2, S/2, S/2);
  grd.addColorStop(0, '#3b4553'); grd.addColorStop(0.8, '#242b37'); grd.addColorStop(1, '#171d27');
  g.fillStyle = grd;
  g.beginPath(); g.arc(S/2, S/2, S/2 - 2, 0, 7); g.fill();
  const holeR = 13, pitch = 38;
  g.globalCompositeOperation = 'destination-out';
  for (let row = -7; row <= 7; row++) for (let col = -7; col <= 7; col++) {
    const x = S/2 + col * pitch + (row % 2 ? pitch/2 : 0), y = S/2 + row * pitch * 0.87;
    if (Math.hypot(x - S/2, y - S/2) < S/2 - 30) { g.beginPath(); g.arc(x, y, holeR, 0, 7); g.fill(); }
  }
  g.globalCompositeOperation = 'source-over';
  g.strokeStyle = accent; g.lineWidth = 8;
  g.beginPath(); g.arc(S/2, S/2, S/2 - 12, 0, 7); g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  return tex;
}

/* —— 放电室（可切换剖面） —— */
let cutaway = true;
const chamberGroup = G('chamber', new THREE.Vector3());
let shellMesh, coneMesh, linerMesh, linerCone;
function buildChamberShell() {
  for (const m of [shellMesh, coneMesh, linerMesh, linerCone]) if (m) { m.geometry.dispose(); chamberGroup.remove(m); }
  const tLen = cutaway ? Math.PI * 1.42 : Math.PI * 2;
  const tStart = cutaway ? Math.PI * 0.55 : 0;
  const shellGeo = new THREE.CylinderGeometry(R_CH, R_CH, 3, 64, 1, true, tStart, tLen);
  shellGeo.rotateZ(-Math.PI / 2);
  const coneGeo = new THREE.CylinderGeometry(R_CH, 0.34, 1.1, 48, 1, true, tStart, tLen);
  coneGeo.translate(0, -2.05, 0);
  coneGeo.rotateZ(-Math.PI / 2);
  const shellMat = matte('#2a3547', { side: THREE.DoubleSide, roughness: 0.32, emissive: '#0d1626', emissiveIntensity: 0.35 });
  const linerMat = matte('#8a5a30', { side: THREE.DoubleSide, metalness: 0.9, roughness: 0.28, emissive: '#201005', emissiveIntensity: 0.3 });
  shellMesh = new THREE.Mesh(shellGeo, shellMat);
  coneMesh = new THREE.Mesh(coneGeo, shellMat);
  shellMesh.position.x = 0; coneMesh.position.x = 0;
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
  const flangeMat = matte('#39424f', { roughness: 0.3 });
  const f1 = new THREE.Mesh(new THREE.TorusGeometry(R_CH, 0.05, 10, 60), flangeMat);
  f1.rotation.y = Math.PI / 2; f1.position.x = CHAMBER_RX;
  const f0 = new THREE.Mesh(new THREE.TorusGeometry(R_CH, 0.05, 10, 60), flangeMat);
  f0.rotation.y = Math.PI / 2; f0.position.x = CHAMBER_LX;
  chamberGroup.add(f1, f0);
  reg('chamber', flangeMat);
}

/* —— 空心阴极 —— */
const cathodeGroup = G('cathode', new THREE.Vector3(-1.15, 0, 0));
{
  const mat = matte('#4a5568', { emissive: '#30080c', emissiveIntensity: 0.4 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.42, 20), mat);
  body.rotation.z = -Math.PI / 2;
  body.position.x = -2.34;
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 16),
    new THREE.MeshBasicMaterial({ color: '#ff6b7a' }));
  tip.position.x = -2.13;
  cathodeGroup.add(body, tip);
  makePickable(body, 'cathode');
  pickProxy(cathodeGroup, new THREE.SphereGeometry(0.3, 8, 8), new THREE.Vector3(-2.34, 0, 0), 'cathode');
  reg('cathode', mat);
  cathodeGroup.userData.tip = tip;
}

/* —— 环形磁铁 —— */
const magnetsGroup = G('magnets', new THREE.Vector3(0, 1.2, 0));
const magnetRingProxies = [];
{
  const nMat = matte('#c03030', { emissive: '#401010', emissiveIntensity: 0.5, roughness: 0.5 });
  const sMat = matte('#2848b8', { emissive: '#101a40', emissiveIntensity: 0.5, roughness: 0.5 });
  const ringMat = matte('#1a2230');
  for (let i = 0; i < 4; i++) {
    const x = -1.3 + i * 0.8;
    const ring = new THREE.Group(); ring.position.x = x;
    const torus = new THREE.Mesh(new THREE.TorusGeometry(R_CH + 0.06, 0.035, 8, 48), ringMat);
    torus.rotation.y = Math.PI / 2;
    ring.add(torus);
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.09), (k % 2) ? nMat : sMat);
      box.position.set(0, Math.cos(a) * (R_CH + 0.06), Math.sin(a) * (R_CH + 0.06));
      box.rotation.x = -a;
      ring.add(box);
      makePickable(box, 'magnets');
    }
    const proxy = pickProxy(magnetsGroup, new THREE.TorusGeometry(R_CH + 0.08, 0.1, 6, 32),
      new THREE.Vector3(x, 0, 0), 'magnets');
    proxy.rotation.y = Math.PI / 2;
    magnetRingProxies.push(proxy);
    magnetsGroup.add(ring);
  }
  reg('magnets', nMat, sMat, ringMat);
}

/* —— 磁力线（尖点场示意） —— */
const magLines = new THREE.Group();
{
  const mat = new THREE.LineBasicMaterial({ color: '#22d3ee', transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending });
  const centers = [-1.7, -0.9, -0.1, 0.7, 1.3];
  for (let i = 0; i < centers.length - 1; i++) {
    const cx = (centers[i] + centers[i+1]) / 2, rx = (centers[i+1] - centers[i]) / 2 + 0.12;
    for (const rot of [0, Math.PI / 3, Math.PI * 2 / 3]) {
      const pts = [];
      for (let t = 0; t <= 40; t++) {
        const a = (t / 40) * Math.PI * 2;
        const y = Math.cos(a) * 1.05, z = Math.sin(a) * 1.05;
        const yy = y * Math.cos(rot) - z * Math.sin(rot);
        const zz = y * Math.sin(rot) + z * Math.cos(rot);
        pts.push(new THREE.Vector3(cx + Math.cos(a) * rx * 0, yy, zz).setX(cx + Math.sin(a) * 0));
        // 椭圆在 x–径向平面
        pts[t].x = cx + Math.sin(a) * 0; // 占位
        pts[t].set(cx, yy * 1.05 * 0 + Math.cos(a) * 1.0 * Math.cos(rot), Math.cos(a) * 1.0 * Math.sin(rot));
        pts[t].x = cx + Math.sin(a) * rx;
      }
      magLines.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    }
  }
  magLines.visible = false;
  scene.add(magLines);
}

/* —— 栅格 —— */
const screenGroup = G('screen', new THREE.Vector3(2.7, 0, 0));
const accelGroup = G('accel', new THREE.Vector3(4.3, 0, 0));
{
  const sTex = gridTexture('#ef4444'), aTex = gridTexture('#3b82f6');
  const sMat = new THREE.MeshStandardMaterial({
    map: sTex, transparent: true, side: THREE.DoubleSide, metalness: 0.55, roughness: 0.45,
    emissive: '#5c1515', emissiveIntensity: 0.25
  });
  const aMat = new THREE.MeshStandardMaterial({
    map: aTex, transparent: true, side: THREE.DoubleSide, metalness: 0.55, roughness: 0.45,
    emissive: '#152c5c', emissiveIntensity: 0.25
  });
  const sGrid = new THREE.Mesh(new THREE.CircleGeometry(R_CH, 64), sMat);
  sGrid.rotation.y = Math.PI / 2; sGrid.position.x = SCREEN_X;
  const aGrid = new THREE.Mesh(new THREE.CircleGeometry(R_CH - 0.06, 64), aMat);
  aGrid.rotation.y = Math.PI / 2; aGrid.position.x = ACCEL_X;
  screenGroup.add(sGrid); accelGroup.add(aGrid);
  makePickable(sGrid, 'screen'); makePickable(aGrid, 'accel');
  const rimMat = matte('#4a5568');
  const rim1 = new THREE.Mesh(new THREE.TorusGeometry(R_CH, 0.045, 8, 48), rimMat);
  rim1.rotation.y = Math.PI / 2; rim1.position.x = SCREEN_X;
  const rim2 = new THREE.Mesh(new THREE.TorusGeometry(R_CH - 0.06, 0.04, 8, 48), rimMat);
  rim2.rotation.y = Math.PI / 2; rim2.position.x = ACCEL_X;
  screenGroup.add(rim1); accelGroup.add(rim2);
  reg('screen', sMat, rimMat); reg('accel', aMat);
}

/* —— 电场箭头 —— */
const fieldArrows = new THREE.Group();
{
  const dir = new THREE.Vector3(1, 0, 0), origin = new THREE.Vector3();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const r = 0.35 + (i % 3) * 0.35;
    origin.set(SCREEN_X + 0.04, Math.cos(a) * r, Math.sin(a) * r);
    const arrow = new THREE.ArrowHelper(dir, origin, 0.2, 0xef4444, 0.06, 0.045);
    arrow.line.material.transparent = arrow.cone.material.transparent = true;
    arrow.line.material.opacity = arrow.cone.material.opacity = 0.55;
    fieldArrows.add(arrow);
  }
  scene.add(fieldArrows);
}

/* —— 羽流光锥 —— */
const plumeGroup = G('plume', new THREE.Vector3());
{
  const segs = [
    { len: 2.2, r0: 0.82, r1: 1.0, op: 0.14, col: '#38bdf8' },
    { len: 2.4, r0: 1.0,  r1: 1.22, op: 0.08, col: '#5b8cf0' },
    { len: 2.6, r0: 1.22, r1: 1.5,  op: 0.05, col: '#8b6cf0' },
  ];
  let x = ACCEL_X + 0.08;
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
  /* 出口辉光 sprite */
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const cx = cv.getContext('2d');
  const g = cx.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, 'rgba(150,220,255,0.9)');
  g.addColorStop(0.35, 'rgba(56,189,248,0.4)');
  g.addColorStop(1, 'rgba(56,189,248,0)');
  cx.fillStyle = g; cx.fillRect(0, 0, 128, 128);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(cv), transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.35
  }));
  glow.scale.set(1.2, 1.2, 1);
  glow.position.set(2.15, 0, 0);
  plumeGroup.add(glow);
  /* 羽流拾取代理（圆柱） */
  const proxy = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 0.9, 6.5, 12), proxyMat);
  proxy.geometry.rotateZ(-Math.PI / 2);
  proxy.position.set(5.2, 0, 0);
  proxy.userData.key = 'plume';
  interactive.push(proxy);
  plumeGroup.add(proxy);
}

/* —— 中和器 —— */
const neutGroup = G('neutralizer', new THREE.Vector3(3.5, -1.2, 0));
{
  const mat = matte('#3a4556', { emissive: '#3a2c05', emissiveIntensity: 0.4 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.5, 18), mat);
  body.position.set(2.32, -1.72, 0);
  body.rotation.z = -0.65;
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 14), new THREE.MeshBasicMaterial({ color: '#ffe08a' }));
  tip.position.copy(NEUTRALIZER_TIP);
  neutGroup.add(body, tip);
  makePickable(body, 'neutralizer');
  pickProxy(neutGroup, new THREE.SphereGeometry(0.32, 8, 8), new THREE.Vector3(2.35, -1.7, 0), 'neutralizer');
  reg('neutralizer', mat);
}

/* —— 氙气贮箱 + 管道 + 阀门 —— */
const tankGroup = G('tank', new THREE.Vector3(-0.5, -1.0, 0));
{
  const mat = matte('#7a8da8', { roughness: 0.32, metalness: 0.7 });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(TANK_R, 40, 32), mat);
  sphere.position.copy(TANK_C);
  const band = new THREE.Mesh(new THREE.TorusGeometry(TANK_R + 0.01, 0.03, 8, 48), matte('#38bdf8', { emissive: '#0a3a4a', emissiveIntensity: 0.6 }));
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
const PIPE_LEN = pipeCurve.getLength();
let valveMat;
{
  const mat = matte('#77808f', { roughness: 0.3 });
  const tube = new THREE.Mesh(new THREE.TubeGeometry(pipeCurve, 48, 0.06, 10), mat);
  pipeGroup.add(tube);
  makePickable(tube, 'pipe');
  reg('pipe', mat);
  valveMat = matte('#d97706', { emissive: '#7c4a03', emissiveIntensity: 0.6, roughness: 0.4 });
  const valve = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.26), valveMat);
  valve.position.set(-3.28, 0.5, 0);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.16, 10), valveMat);
  stem.position.set(-3.28, 0.42, 0);
  pipeGroup.add(valve, stem);
  makePickable(valve, 'pipe');
  reg('pipe', valveMat);
  pickProxy(pipeGroup, new THREE.SphereGeometry(0.28, 8, 8), new THREE.Vector3(-3.28, 0.48, 0), 'pipe');
  /* 中和器微量支路 */
  const branchMat = new THREE.MeshStandardMaterial({ color: '#38bdf8', transparent: true, opacity: 0.45, roughness: 0.3, metalness: 0.6 });
  const bp = [
    new THREE.Vector3(-3.5, -0.7, 0), new THREE.Vector3(-3.5, -2.2, 0),
    new THREE.Vector3(-0.5, -2.2, 0), new THREE.Vector3(2.05, -2.0, 0),
    new THREE.Vector3(2.3, -1.85, 0)
  ];
  const branch = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bp), 40, 0.03, 8), branchMat);
  pipeGroup.add(branch);
}

/* —— PPU —— */
const ppuGroup = G('ppu', new THREE.Vector3(-1.0, 1.15, 0));
let led1, led2;
{
  const mat = matte('#5a6a80', { roughness: 0.4, metalness: 0.55, emissive: '#1a2a3a', emissiveIntensity: 0.3 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.72, 0.85), mat);
  box.position.set(-4.35, 1.35, 0);
  ppuGroup.add(box);
  makePickable(box, 'ppu');
  reg('ppu', mat);
  const finMat = matte('#6a7585');
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.7), finMat);
    fin.position.set(-4.75 + i * 0.26, 1.35, 0);
    ppuGroup.add(fin);
  }
  led1 = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), new THREE.MeshBasicMaterial({ color: '#4ade80' }));
  led1.position.set(-4.62, 1.6, 0.44);
  led2 = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), new THREE.MeshBasicMaterial({ color: '#facc15' }));
  led2.position.set(-4.45, 1.6, 0.44);
  ppuGroup.add(led1, led2);
}
/* 供电线（PPU → 阴极/栅格/中和器）— smooth tube cables with labels */
const wiresGroup = new THREE.Group();
const wireMats = [];
{
  const routes = [
    { pts: [[-3.9, 1.35, 0.42], [-3.4, 1.0, 0.45], [-2.9, 0.55, 0.35], [-2.5, 0.25, 0.15], [-2.34, 0.1, 0]],
      col: '#ef4444', label: '阴极加热' },
    { pts: [[-3.82, 1.5, 0.42], [-2.8, 1.85, 0.4], [-1.2, 2.1, 0.3], [0.4, 2.0, 0.15], [1.52, 1.55, 0]],
      col: '#f59e0b', label: '屏栅 +1500V' },
    { pts: [[-3.82, 1.15, 0.42], [-2.6, 1.6, -0.2], [-0.6, 1.9, -0.35], [0.8, 1.75, -0.2], [1.78, 1.5, 0]],
      col: '#3b82f6', label: '加速栅 −300V' },
    { pts: [[-3.9, 1.1, -0.42], [-3.5, 0.4, -1.2], [-2.8, -0.8, -2.0], [-1.0, -1.8, -2.2], [0.8, -2.2, -1.6], [1.8, -2.1, -0.6], [2.2, -1.9, 0]],
      col: '#facc15', label: '中和器' },
  ];
  for (const r of routes) {
    const curve = new THREE.CatmullRomCurve3(r.pts.map(p => new THREE.Vector3(...p)));
    const tubeGeo = new THREE.TubeGeometry(curve, 48, 0.025, 8, false);
    const mat = new THREE.MeshStandardMaterial({
      color: r.col, roughness: 0.5, metalness: 0.6,
      transparent: true, opacity: 0.85
    });
    const tube = new THREE.Mesh(tubeGeo, mat);
    wiresGroup.add(tube);
    wireMats.push(mat);
    /* small arrow cone at destination end */
    const tipPos = curve.getPointAt(1);
    const tipTan = curve.getTangentAt(0.97);
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, 0.15, 8),
      new THREE.MeshStandardMaterial({ color: r.col, roughness: 0.4, metalness: 0.5, transparent: true, opacity: 0.85 })
    );
    cone.position.copy(tipPos);
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tipTan.normalize());
    wiresGroup.add(cone);
    wireMats.push(cone.material);
  }
  scene.add(wiresGroup);
}

/* —— 航天器本体 + 太阳能板 —— */
const busGroup = G('bus', new THREE.Vector3(-1.7, 0, 0));
{
  const mat = matte('#8a6d2f', { metalness: 0.5, roughness: 0.55, emissive: '#241a06', emissiveIntensity: 0.3 });
  const bus = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.7, 1.5), mat);
  bus.position.set(-6.35, 0, 0);
  busGroup.add(bus);
  makePickable(bus, 'bus');
  reg('bus', mat);
  /* 电池板贴图 */
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = '#101b3e'; g.fillRect(0, 0, 256, 128);
  g.strokeStyle = '#26377a'; g.lineWidth = 3;
  for (let x = 0; x <= 256; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke(); }
  for (let y = 0; y <= 128; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
  g.strokeStyle = '#3b4fa5'; g.lineWidth = 6; g.strokeRect(0, 0, 256, 128);
  const panelTex = new THREE.CanvasTexture(cv);
  const panelMat = new THREE.MeshStandardMaterial({
    map: panelTex, metalness: 0.4, roughness: 0.35,
    emissive: '#0d1633', emissiveIntensity: 0.5
  });
  const strutMat = matte('#5c6779');
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

/* ================= 标签 ================= */
const labelsGroup = new THREE.Group();
scene.add(labelsGroup);
function makeLabel(text, pos, accent) {
  const div = document.createElement('div');
  div.textContent = text;
  div.style.cssText = `font-size:11px;padding:2px 9px;border-radius:999px;background:rgba(10,14,24,.72);
    border:1px solid ${accent}55;color:#dbe7f3;white-space:nowrap;backdrop-filter:blur(4px);
    pointer-events:none;font-weight:300;letter-spacing:.4px;`;
  const lab = new CSS2DObject(div);
  lab.position.copy(pos);
  labelsGroup.add(lab);
  return lab;
}
makeLabel('太阳能电池板', new THREE.Vector3(-6.35, 0.95, 3.6), '#7986cb');
makeLabel('PPU 电源', new THREE.Vector3(-4.35, 1.85, 0), '#94a3b8');
makeLabel('氙气贮箱', new THREE.Vector3(-4.35, -2.15, 0), '#38bdf8');
makeLabel('流量阀', new THREE.Vector3(-3.28, 0.85, 0), '#f59e0b');
makeLabel('空心阴极', new THREE.Vector3(-2.3, -0.55, 0), '#f43f5e');
makeLabel('环形磁铁', new THREE.Vector3(0.1, 1.95, 0), '#ef4444');
makeLabel('放电室', new THREE.Vector3(-0.2, 1.85, 0), '#0ea5e9');
makeLabel('屏栅极 +1500V', new THREE.Vector3(1.52, -1.9, 0), '#ef4444');
makeLabel('加速极 −300V', new THREE.Vector3(1.78, -2.15, 0), '#3b82f6');
makeLabel('中和器', new THREE.Vector3(2.35, -2.25, 0), '#facc15');
makeLabel('离子束 ~30–50 km/s', new THREE.Vector3(5.2, 1.35, 0), '#38bdf8');

/* ================= 部件详解数据 ================= */
const INFO = {
  solar: { name: '太阳能电池板', en: 'Solar Array', accent: '#7986cb',
    desc: `深空探测器远离太阳，光照按平方反比衰减，必须铺开巨大翼面收集阳光。“黎明号”翼展近 <strong>19 m</strong>，即使远在 2.2–2.8 AU 也能输出千瓦级电力，经母线（约 100 V）送入 PPU。`,
    chips: ['输出 ~2.3 kW @1 AU', '翼展 19 m', '三结砷化镓电池'] },
  ppu: { name: '电源处理单元', en: 'Power Processing Unit (PPU)', accent: '#94a3b8',
    desc: `推进器的“电力管家”：把母线电压变换成各路所需电源——阴极<strong>加热电流</strong>、放电电源、屏栅极 <strong>+1500 V 束电源</strong>、加速极 <strong>−300 V</strong>、中和器电源。它是全器最复杂的电子设备之一，变换效率约 <strong>93%</strong>。`,
    chips: ['效率 ~93%', '多路隔离输出', '质量 ~13 kg'] },
  tank: { name: '氙气贮箱', en: 'Xenon Tank', accent: '#38bdf8',
    desc: `氙（Xe）近乎理想：<strong>惰性</strong>不腐蚀储箱、原子量大（<strong>131 u</strong>，同样电压下动量更大）、电离能低（<strong>12.1 eV</strong>）、常温即可高压储存。“黎明号”带 425 kg 氙气支撑了 11 年任务。`,
    chips: ['Xe 原子量 131 u', '电离能 12.1 eV', '储存 ~150 bar'] },
  pipe: { name: '供气管路与流量阀', en: 'Propellant Feed & Flow Control', accent: '#f59e0b',
    desc: `流量控制器把高压氙气精确节流到<strong>毫克/秒</strong>量级：主管路送入放电室，微量支路（图中细蓝管）同时供给空心阴极与中和器维持放电。试试拖动底部“<strong>流量</strong>”滑块。`,
    chips: ['流量 mg/s 级', '主管 + 微量支路'] },
  cathode: { name: '空心阴极', en: 'Hollow Cathode', accent: '#f43f5e',
    desc: `“电子枪”：内部发射体（<strong>LaB₆</strong> 或 BaO-W）被加热到 <strong>1000+ °C</strong> 发生热电子发射；顶端小孔喷出电子进入放电室；微量氙气流维持内部放电。它的电子是电离氙原子的“子弹”。`,
    chips: ['发射体 LaB₆', '>1000 °C 热发射'] },
  chamber: { name: '放电室（阳极壁）', en: 'Discharge Chamber / Anode', accent: '#0ea5e9',
    desc: `“电离工厂”：铜色<strong>阳极筒</strong>与阴极之间形成放电电弧；电子在磁场约束下反复穿行，撞击氙原子：<strong>Xe + e⁻ → Xe⁺ + 2e⁻</strong>。新生的氙离子聚在屏栅极附近等待加速。`,
    chips: ['阳极电位 +25 V', '放电电压 ~25 V'] },
  magnets: { name: '环形磁铁', en: 'Ring Magnets (Cusp Field)', accent: '#ef4444',
    desc: `磁铁在放电室内形成<strong>尖点磁场</strong>：电子质量极小，被磁力线牢牢束缚、螺旋徘徊（可打开左侧 🧲 查看磁力线）。这既防止电子撞壁损耗，又<strong>成倍拉长电子路径</strong>，让每颗电子有更多机会撞上氙原子。`,
    chips: ['磁约束电子', '提高电离效率'] },
  screen: { name: '屏栅极', en: 'Screen Grid (+1500 V)', accent: '#ef4444',
    desc: `带 <strong>+1500 V</strong> 的多孔钼栅，是离子的“出发平台”：把放电室等离子体与加速电场隔开，离子被正电位吸引、<strong>聚焦对准小孔</strong>。孔径与间距决定束流形状。`,
    chips: ['+1500 V', '钼合金', '数千个孔'] },
  accel: { name: '加速极', en: 'Accel Grid (−300 V)', accent: '#3b82f6',
    desc: `与屏栅极相距仅约 <strong>2 mm</strong>，之间形成强电场，离子穿过瞬间被加速到 <strong>30–50 km/s</strong>——约为化学火箭喷速的 10 倍！负电位还阻止电子倒流回放电室（防止“电子回流”）。`,
    chips: ['−300 V', '间隙 ~2 mm', '离子 30–50 km/s'] },
  neutralizer: { name: '中和器', en: 'Neutralizer (Hollow Cathode)', accent: '#facc15',
    desc: `一支<strong>独立的空心阴极</strong>（同样靠热电子发射 + 微量氙气维持放电，电子来自 PPU 加热电流），向离子束注入等量<strong>电子</strong>保持整器电中性。若不中和，航天器会积累负电荷把离子吸回来——推力归零甚至烧毁部件。`,
    chips: ['独立空心阴极', '发射等量 e⁻'] },
  plume: { name: '离子束羽流', en: 'Ion Beam Plume', accent: '#38bdf8',
    desc: `淡蓝色辉光是高速氙离子/中性原子发出的。单台推力仅 <strong>~92 mN</strong>（托不起一张纸），但可连续工作<strong>数年</strong>：“黎明号”累计变速 11 km/s，超过此前任何航天器。深空一号、隼鸟号、BepiColombo、星链都在用同类技术。`,
    chips: ['比冲 3100 s', '92 mN', '可工作数年'] },
  bus: { name: '探测器本体', en: 'Spacecraft Bus', accent: '#b08d3e',
    desc: `推进模块主体，外覆金色<strong>多层隔热组件（MLI）</strong>，容纳 PPU、氙气贮箱与控制设备；太阳能翼通过桁架连接。` },
};

/* ================= 粒子云 ================= */
const sysTank = new Cloud(150);
const sysPipe = new Cloud(60);
const sysAtom = new Cloud(110);
const sysElectron = new Cloud(150);
const sysIon = new Cloud(520);
const sysNeut = new Cloud(160);
const sysSpark = new Cloud(3200);   // 彗尾 / 闪光

const C_ATOM = [0.62, 0.68, 0.78], C_ION = [0.22, 0.74, 0.97], C_NEUTRAL = [0.66, 0.33, 0.97];
const C_E = [0.96, 0.25, 0.37], C_NE = [0.98, 0.8, 0.09];

/* ================= 状态 ================= */
let isRunning = true, voltage = 1500, flow = 4, timeScale = 1;
let explodeT = 0, explodeTarget = 0;
let simTime = 0;
let followOn = false, followIdx = -1, followAngle = 0;
let selectedKey = null, hoverKey = null;
let tourIdx = -1, tourActive = false, tourPulse = [];
let labelsOn = true, fieldOn = true;
let spawnOK = true;

function rnd(a, b) { return a + Math.random() * (b - a); }

/* 贮箱粒子初始化 */
function seedTank() {
  for (let i = 0; i < 120; i++) {
    const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    const r = (TANK_R - 0.12) * Math.cbrt(Math.random());
    const x = TANK_C.x + r * Math.sin(ph) * Math.cos(th);
    const y = TANK_C.y + r * Math.cos(ph);
    const z = TANK_C.z + r * Math.sin(ph) * Math.sin(th);
    sysTank.add({ vx: rnd(-1, 1), vy: rnd(-1, 1), vz: rnd(-1, 1) }, ...C_ATOM, 1.7, 0.9);
    const i3 = (sysTank.n - 1) * 3;
    sysTank.pos[i3] = x; sysTank.pos[i3+1] = y; sysTank.pos[i3+2] = z;
  }
}

/* ================= 仿真 ================= */
function flash(x, y, z, r, g, b, size, life) {
  sysSpark.add({ life, maxLife: life, vx: 0, vy: 0, vz: 0 }, r, g, b, size, 1);
  const i3 = (sysSpark.n - 1) * 3;
  sysSpark.pos[i3] = x; sysSpark.pos[i3+1] = y; sysSpark.pos[i3+2] = z;
}
function spark(x, y, z, r, g, b, size, life, vx = 0, vy = 0, vz = 0) {
  sysSpark.add({ life, maxLife: life, vx, vy, vz }, r, g, b, size, 0.8);
  const i3 = (sysSpark.n - 1) * 3;
  sysSpark.pos[i3] = x; sysSpark.pos[i3+1] = y; sysSpark.pos[i3+2] = z;
}

const spawnAccum = { pipe: 0, electron: 0, neut: 0, atom: 0 };

function simulate(dt) {
  simTime += dt;
  spawnOK = explodeT < 0.4;

  /* —— 贮箱原子 —— */
  const pipeEntry = new THREE.Vector3(-4.0, -1.08, 0);
  for (let i = sysTank.n - 1; i >= 0; i--) {
    const o = sysTank.objs[i], i3 = i * 3;
    let x = sysTank.pos[i3], y = sysTank.pos[i3+1], z = sysTank.pos[i3+2];
    /* 压力导向管口 */
    const dxe = pipeEntry.x - x, dye = pipeEntry.y - y, dze = pipeEntry.z - z;
    const de = Math.hypot(dxe, dye, dze) + 1e-6;
    const pull = 3.2 * dt * (1 + flow * 0.3);
    o.vx += dxe / de * pull; o.vy += dye / de * pull; o.vz += dze / de * pull;
    /* 热运动 */
    o.vx += rnd(-3, 3) * dt; o.vy += rnd(-3, 3) * dt; o.vz += rnd(-3, 3) * dt;
    const sp = Math.hypot(o.vx, o.vy, o.vz), cap = 1.6 + flow * 0.15;
    if (sp > cap) { o.vx *= cap / sp; o.vy *= cap / sp; o.vz *= cap / sp; }
    x += o.vx * dt; y += o.vy * dt; z += o.vz * dt;
    /* 罐壁反弹（管口附近放行） */
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
    sysTank.pos[i3] = x; sysTank.pos[i3+1] = y; sysTank.pos[i3+2] = z;
  }

  /* —— 管道流动 —— */
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
      if (spawnOK && sysAtom.n < sysAtom.max - 1) {
        sysAtom.add({ vx: rnd(1.0, 1.6), vy: rnd(-0.5, 0.5), vz: rnd(-0.5, 0.5) }, ...C_ATOM, 1.9, 1);
        const i3 = (sysAtom.n - 1) * 3;
        sysAtom.pos[i3] = INLET.x; sysAtom.pos[i3+1] = rnd(-0.12, 0.12); sysAtom.pos[i3+2] = rnd(-0.12, 0.12);
      }
      continue;
    }
    const p = pipeCurve.getPointAt(Math.min(o.t, 1));
    const i3 = i * 3;
    sysPipe.pos[i3] = p.x; sysPipe.pos[i3+1] = p.y; sysPipe.pos[i3+2] = p.z;
  }

  /* —— 放电室原子（数量稳态补充） —— */
  const targetAtoms = Math.min(18 + flow * 7, sysAtom.max - 4);
  if (spawnOK && sysAtom.n < targetAtoms) {
    spawnAccum.atom += dt * (targetAtoms - sysAtom.n) * 0.8;
    while (spawnAccum.atom > 1 && sysAtom.n < targetAtoms) {
      spawnAccum.atom -= 1;
      sysAtom.add({ vx: rnd(1.0, 1.7), vy: rnd(-0.6, 0.6), vz: rnd(-0.6, 0.6) }, ...C_ATOM, 1.9, 1);
      const i3 = (sysAtom.n - 1) * 3;
      sysAtom.pos[i3] = INLET.x; sysAtom.pos[i3+1] = rnd(-0.15, 0.15); sysAtom.pos[i3+2] = rnd(-0.15, 0.15);
    }
  }
  for (let i = sysAtom.n - 1; i >= 0; i--) {
    const o = sysAtom.objs[i], i3 = i * 3;
    let x = sysAtom.pos[i3], y = sysAtom.pos[i3+1], z = sysAtom.pos[i3+2];
    o.vx += rnd(-2.5, 2.5) * dt + 0.15 * dt;
    o.vy += rnd(-2.5, 2.5) * dt;
    o.vz += rnd(-2.5, 2.5) * dt;
    const sp = Math.hypot(o.vx, o.vy, o.vz);
    if (sp > 1.4) { o.vx *= 1.4 / sp; o.vy *= 1.4 / sp; o.vz *= 1.4 / sp; }
    x += o.vx * dt; y += o.vy * dt; z += o.vz * dt;
    /* 壁面反弹 */
    const rr = Math.hypot(y, z), rmax = chamberRadius(x) - 0.12;
    if (rr > rmax && rmax > 0.05) {
      const a = rmax / (rr + 1e-9);
      y *= a; z *= a;
      o.vy *= -0.7; o.vz *= -0.7;
    }
    if (x < CONE_TIP_X + 0.1) { x = CONE_TIP_X + 0.1; o.vx = Math.abs(o.vx); }
    if (x > SCREEN_X - 0.08) {
      if (Math.random() < 0.4) { sysAtom.remove(i); continue; }  // 中性气体流失
      x = SCREEN_X - 0.08; o.vx = -Math.abs(o.vx);
    }
    sysAtom.pos[i3] = x; sysAtom.pos[i3+1] = y; sysAtom.pos[i3+2] = z;
  }

  /* —— 电子（阴极发射 + 磁约束随机行走） —— */
  const targetE = 85;
  if (spawnOK) {
    spawnAccum.electron += dt * 18;
    while (spawnAccum.electron > 1 && sysElectron.n < targetE) {
      spawnAccum.electron -= 1;
      sysElectron.add({
        vx: rnd(2.2, 4.2), vy: rnd(-1.4, 1.4), vz: rnd(-1.4, 1.4),
        life: rnd(8, 14), sparkT: Math.random() * 0.2
      }, ...C_E, 1.5, 1);
      const i3 = (sysElectron.n - 1) * 3;
      sysElectron.pos[i3] = -2.12; sysElectron.pos[i3+1] = rnd(-0.05, 0.05); sysElectron.pos[i3+2] = rnd(-0.05, 0.05);
    }
  }
  for (let i = sysElectron.n - 1; i >= 0; i--) {
    const o = sysElectron.objs[i], i3 = i * 3;
    let x = sysElectron.pos[i3], y = sysElectron.pos[i3+1], z = sysElectron.pos[i3+2];
    o.life -= dt;
    if (o.life <= 0) { sysElectron.remove(i); continue; }
    /* 磁约束：强随机散射 + 偶尔反向（磁镜） */
    o.vy += rnd(-14, 14) * dt; o.vz += rnd(-14, 14) * dt;
    if (Math.random() < dt * 0.9) o.vx *= -0.75;
    o.vx += 1.2 * dt;
    const sp = Math.hypot(o.vx, o.vy, o.vz);
    if (sp > 3.4) { o.vx *= 3.4 / sp; o.vy *= 3.4 / sp; o.vz *= 3.4 / sp; }
    x += o.vx * dt; y += o.vy * dt; z += o.vz * dt;
    const rr = Math.hypot(y, z), rmax = chamberRadius(x) - 0.12;
    if (rr > rmax && rmax > 0.05) {
      const a = rmax / (rr + 1e-9);
      y *= a; z *= a;
      o.vy *= -0.85; o.vz *= -0.85;
    }
    if (x < CONE_TIP_X + 0.12) { x = CONE_TIP_X + 0.12; o.vx = Math.abs(o.vx); }
    if (x > SCREEN_X - 0.18) { x = SCREEN_X - 0.18; o.vx = -Math.abs(o.vx); }
    sysElectron.pos[i3] = x; sysElectron.pos[i3+1] = y; sysElectron.pos[i3+2] = z;
    /* 电子轨迹微光 */
    o.sparkT -= dt;
    if (o.sparkT <= 0 && sysSpark.n < sysSpark.max - 10) {
      o.sparkT = 0.16;
      spark(x, y, z, 0.85, 0.2, 0.3, 1.3, 0.35);
    }
  }

  /* —— 电离碰撞：e⁻ + Xe → Xe⁺ + 2e⁻ —— */
  for (let ai = sysAtom.n - 1; ai >= 0; ai--) {
    const a3 = ai * 3;
    const ax = sysAtom.pos[a3], ay = sysAtom.pos[a3+1], az = sysAtom.pos[a3+2];
    for (let ei = 0; ei < sysElectron.n; ei++) {
      const e3 = ei * 3;
      const dx = ax - sysElectron.pos[e3], dy = ay - sysElectron.pos[e3+1], dz = az - sysElectron.pos[e3+2];
      if (dx * dx + dy * dy + dz * dz < 0.0225) {   // 0.15²
        sysAtom.remove(ai);
        flash(ax, ay, az, 0.88, 0.95, 1.0, 6.5, 0.3);
        if (sysIon.n < sysIon.max) {
          sysIon.add({
            phase: 'drift', vx: rnd(0.6, 1.2), vy: rnd(-0.3, 0.3), vz: rnd(-0.3, 0.3),
            hole: null, neutralized: false, sparkT: 0, id: Math.random()
          }, ...C_ION, 2.4, 1);
          const i3 = (sysIon.n - 1) * 3;
          sysIon.pos[i3] = ax; sysIon.pos[i3+1] = ay; sysIon.pos[i3+2] = az;
          if (followOn && followIdx < 0) followIdx = sysIon.n - 1;
        }
        /* 二次电子 */
        if (sysElectron.n < sysElectron.max - 1) {
          sysElectron.add({ vx: rnd(-2, 2), vy: rnd(-2, 2), vz: rnd(-2, 2), life: rnd(6, 10), sparkT: 0.2 }, ...C_E, 1.5, 1);
          const e3b = (sysElectron.n - 1) * 3;
          sysElectron.pos[e3b] = ax; sysElectron.pos[e3b+1] = ay; sysElectron.pos[e3b+2] = az;
        }
        break;
      }
    }
  }

  /* —— 离子：漂移 → 栅格聚焦加速 → 束流 —— */
  const vScale = voltage / 1500;
  for (let i = sysIon.n - 1; i >= 0; i--) {
    const o = sysIon.objs[i], i3 = i * 3;
    let x = sysIon.pos[i3], y = sysIon.pos[i3+1], z = sysIon.pos[i3+2];

    if (o.phase === 'drift') {
      o.vx += 1.3 * dt; o.vy += rnd(-0.6, 0.6) * dt; o.vz += rnd(-0.6, 0.6) * dt;
      if (o.vx > 2.4) o.vx = 2.4;
      x += o.vx * dt; y += o.vy * dt; z += o.vz * dt;
      const rr = Math.hypot(y, z), rmax = chamberRadius(x) - 0.1;
      if (rr > rmax && rmax > 0.05) { const a = rmax / (rr + 1e-9); y *= a; z *= a; o.vy *= -0.6; o.vz *= -0.6; }
      if (x >= SCREEN_X - 0.06) {
        o.phase = 'gap';
        o.hole = nearestHole(y, z);
        o.vx = Math.max(o.vx, 1.4);
      }
    } else if (o.phase === 'gap') {
      o.vx += 520 * vScale * dt;
      x += o.vx * dt;
      const k = Math.min(1, 12 * dt);
      y += (o.hole.y - y) * k;
      z += (o.hole.z - z) * k;
      if (x >= ACCEL_X) {
        o.phase = 'beam';
        o.vx = 24 * vScale + rnd(0, 3);
        o.vy = y * 0.16 + rnd(-0.25, 0.25);
        o.vz = z * 0.16 + rnd(-0.25, 0.25);
        flash(x, y, z, 0.3, 0.8, 1.0, 4.5, 0.25);
      }
    } else {  /* beam */
      x += o.vx * dt; y += o.vy * dt; z += o.vz * dt;
      /* 远处自动中和（概率） */
      if (!o.neutralized && x > 3.2 && Math.random() < dt * 2.2) neutralizeIon(i);
    }
    sysIon.pos[i3] = x; sysIon.pos[i3+1] = y; sysIon.pos[i3+2] = z;

    /* 彗尾 */
    if (o.phase === 'beam' && x > 1.85 && x < 8.4) {
      o.sparkT -= dt;
      if (o.sparkT <= 0 && sysSpark.n < sysSpark.max - 2) {
        o.sparkT = 0.05;
        const c = o.neutralized ? C_NEUTRAL : C_ION;
        spark(x + 0.1, y, z, c[0], c[1], c[2], 2.1, 0.5, o.vx * 0.7, rnd(-0.15, 0.15), rnd(-0.15, 0.15));
      }
    }
    if (x > 8.6) { if (followIdx === i) followIdx = -1; sysIon.remove(i); if (followIdx > i) followIdx--; }
  }

  /* —— 中和器电子 —— */
  if (spawnOK) {
    spawnAccum.neut += dt * Math.max(2, sysIon.n * 0.045);
    while (spawnAccum.neut > 1 && sysNeut.n < Math.min(sysNeut.max, 110)) {
      spawnAccum.neut -= 1;
      const dir = new THREE.Vector3(rnd(0.5, 1.4), rnd(1.6, 2.6), rnd(-0.4, 0.4)).normalize().multiplyScalar(rnd(1.8, 2.8));
      sysNeut.add({ vx: dir.x, vy: dir.y, vz: dir.z, life: rnd(4, 7) }, ...C_NE, 1.6, 1);
      const i3 = (sysNeut.n - 1) * 3;
      sysNeut.pos[i3] = NEUTRALIZER_TIP.x + rnd(-0.04, 0.04);
      sysNeut.pos[i3+1] = NEUTRALIZER_TIP.y + rnd(-0.04, 0.04);
      sysNeut.pos[i3+2] = NEUTRALIZER_TIP.z + rnd(-0.04, 0.04);
    }
  }
  const ionScan = Math.min(sysIon.n, 150);
  for (let i = sysNeut.n - 1; i >= 0; i--) {
    const o = sysNeut.objs[i], i3 = i * 3;
    let x = sysNeut.pos[i3], y = sysNeut.pos[i3+1], z = sysNeut.pos[i3+2];
    o.life -= dt;
    /* 库仑吸引：找最近的未中和离子 */
    let bx = 0, by = 0, bz = 0, bd = 8;
    for (let j = 0; j < ionScan; j++) {
      const jo = sysIon.objs[j];
      if (jo.neutralized || jo.phase !== 'beam') continue;
      const j3 = j * 3;
      const dx = sysIon.pos[j3] - x, dy = sysIon.pos[j3+1] - y, dz = sysIon.pos[j3+2] - z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < bd) { bd = d2; bx = dx; by = dy; bz = dz; }
    }
    if (bd < 8) {
      const d = Math.sqrt(bd) + 1e-6;
      o.vx += bx / d * 6.5 * dt; o.vy += by / d * 6.5 * dt; o.vz += bz / d * 6.5 * dt;
    }
    x += o.vx * dt; y += o.vy * dt; z += o.vz * dt;
    sysNeut.pos[i3] = x; sysNeut.pos[i3+1] = y; sysNeut.pos[i3+2] = z;
    if (o.life <= 0 || x > 8.4 || Math.abs(y) > 2.6) { sysNeut.remove(i); continue; }
    /* 捕获中和 */
    if (bd < 0.028) {
      const d = Math.sqrt(bd);
      for (let j = 0; j < ionScan; j++) {
        const j3 = j * 3;
        const dd = Math.hypot(sysIon.pos[j3] - x, sysIon.pos[j3+1] - y, sysIon.pos[j3+2] - z);
        if (dd < 0.18 && !sysIon.objs[j].neutralized) {
          neutralizeIon(j);
          break;
        }
      }
      sysNeut.remove(i);
    }
  }

  /* —— 火花/闪光寿命 —— */
  for (let i = sysSpark.n - 1; i >= 0; i--) {
    const o = sysSpark.objs[i];
    o.life -= dt;
    if (o.life <= 0) { sysSpark.remove(i); continue; }
    const i3 = i * 3;
    sysSpark.pos[i3] += o.vx * dt;
    sysSpark.pos[i3+1] += o.vy * dt;
    sysSpark.pos[i3+2] += o.vz * dt;
    sysSpark.alpha[i] = Math.max(0, o.life / o.maxLife) * 0.85;
  }
}
function neutralizeIon(i) {
  const o = sysIon.objs[i];
  if (!o || o.neutralized) return;
  o.neutralized = true;
  const i3 = i * 3;
  sysIon.col[i3] = C_NEUTRAL[0]; sysIon.col[i3+1] = C_NEUTRAL[1]; sysIon.col[i3+2] = C_NEUTRAL[2];
  flash(sysIon.pos[i3], sysIon.pos[i3+1], sysIon.pos[i3+2], 1.0, 0.85, 0.35, 4.5, 0.3);
}

/* ================= 交互：悬停 / 点击 ================= */
const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2(-10, -10);
let mousePx = { x: 0, y: 0 }, downPos = null;
const tooltip = document.getElementById('tooltip');

renderer.domElement.addEventListener('pointermove', e => {
  mousePx.x = e.clientX; mousePx.y = e.clientY;
  mouseNDC.x = (e.clientX / innerWidth) * 2 - 1;
  mouseNDC.y = -(e.clientY / innerHeight) * 2 + 1;
});
renderer.domElement.addEventListener('pointerdown', e => { downPos = { x: e.clientX, y: e.clientY }; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!downPos) return;
  const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
  downPos = null;
  if (moved < 6 && hoverKey) selectComp(hoverKey);
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
    } else tooltip.style.display = 'none';
  }
  if (hoverKey) {
    tooltip.style.left = (mousePx.x + 14) + 'px';
    tooltip.style.top = (mousePx.y + 10) + 'px';
  }
}

/* 高亮管理 */
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
document.getElementById('infoClose').onclick = () => { selectedKey = null; infoPanel.classList.remove('open'); };

/* ================= 引导浏览 ================= */
const TOUR = [
  { title: '🛰 总览 — 栅格离子推进器',
    text: `NASA NSTAR 类栅极离子推进器（“深空一号”/“黎明号”同款）：<strong>太阳能供电 → 氙气电离 → 静电加速 → 中和排出</strong>。推力只有一枚硬币的重量，却能连续工作数年，把探测器加速到化学火箭难以企及的速度。可随时拖动环视。`,
    pos: [4.5, 3.2, 8.5], tgt: [0, 0, 0], hl: [] },
  { title: '① 氙气供应',
    text: `高压贮箱中的惰性氙气经<strong>流量阀</strong>精确节流，以毫克/秒注入放电室。选氙是因为：<strong>原子量大（131 u）</strong>、电离能低（12.1 eV）、常温易储存。注意观察罐内原子被“压”向管口、沿管路流入。`,
    pos: [-3.4, 1.4, 4.0], tgt: [-3.5, -0.4, 0], hl: ['tank', 'pipe'] },
  { title: '② 电子轰击电离',
    text: `<strong>空心阴极</strong>受热发射电子；<strong>环形磁铁</strong>的尖点磁场把电子困在放电室内螺旋徘徊（青色磁力线），大幅提高碰撞概率。电子撞上氙原子的瞬间（白色闪光）：<strong>Xe + e⁻ → Xe⁺ + 2e⁻</strong>。`,
    pos: [0.4, 2.0, 4.4], tgt: [-1.4, -0.1, 0], hl: ['cathode', 'magnets', 'chamber'], mag: true, cut: true },
  { title: '③ 静电加速',
    text: `<strong>屏栅极 +1500 V、加速极 −300 V</strong>，两片多孔钼栅之间形成强电场（红色箭头）。离子对准小孔被抽出，在约 2 mm 间隙内加速到 <strong>30–50 km/s</strong>——化学火箭喷速的 10 倍。试试拖动“电场强度”滑块看离子提速！`,
    pos: [3.6, 1.1, 3.2], tgt: [1.6, 0, 0], hl: ['screen', 'accel'], field: true, cut: true },
  { title: '④ 中和与羽流',
    text: `若只有正离子离开，航天器会带负电并把离子吸回。<strong>中和器</strong>（独立空心阴极）向羽流注入等量电子（黄色）：离子变回中性原子（<strong>紫色</strong>），淡蓝色羽流安静吹向深空。`,
    pos: [6.6, 1.6, 3.4], tgt: [4.6, -0.2, 0], hl: ['neutralizer', 'plume'], cut: true },
  { title: '🎉 全流程回顾',
    text: `供电 → 供气 → 电离 → 加速 → 中和。典型工况：推力 ≈ <strong>92 mN</strong>、比冲 ≈ <strong>3100 s</strong>、功率 2.3 kW。现在自由探索吧：<strong>点击任何部件</strong>看详解，或开启 🎯 <strong>跟随离子</strong>飞出栅格！`,
    pos: [3.2, 2.6, 7.4], tgt: [0.2, 0, 0], hl: [] },
];
const tourPanel = document.getElementById('tourPanel');
const tourDots = document.getElementById('tourDots');
TOUR.forEach((_, i) => {
  const d = document.createElement('i');
  d.onclick = () => gotoTour(i);
  tourDots.appendChild(d);
});
let camTween = null;
function flyTo(pos, tgt, dur = 1.5) {
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
document.getElementById('btnTour').onclick = () => tourActive ? stopTour() : startTour();
document.getElementById('tourNext').onclick = () => gotoTour(Math.min(tourIdx + 1, TOUR.length - 1));
document.getElementById('tourPrev').onclick = () => gotoTour(Math.max(tourIdx - 1, 0));
document.getElementById('tourExit').onclick = stopTour;

/* ================= 模式开关 ================= */
const btnCut = document.getElementById('btnCut');
function setCutaway(on) {
  if (cutaway === on) return;
  cutaway = on;
  buildChamberShell();
  btnCut.classList.toggle('active', on);
}
btnCut.onclick = () => setCutaway(!cutaway);
btnCut.classList.add('active');

const btnExplode = document.getElementById('btnExplode');
btnExplode.onclick = () => {
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
btnFollow.onclick = () => followOn ? stopFollow() : startFollow();

const btnLabels = document.getElementById('btnLabels');
btnLabels.onclick = () => {
  labelsOn = !labelsOn;
  labelsGroup.visible = labelsOn;
  btnLabels.classList.toggle('active', labelsOn);
};

const btnMag = document.getElementById('btnMag');
function setMagLines(on) { magLines.visible = on; btnMag.classList.toggle('active', on); }
btnMag.onclick = () => setMagLines(!magLines.visible);

const btnField = document.getElementById('btnField');
function setField(on) { fieldOn = on; fieldArrows.visible = on; btnField.classList.toggle('active', on); }
btnField.onclick = () => setField(!fieldOn);

document.getElementById('btnExplore').onclick = () => {
  if (tourActive) stopTour();
  if (followOn) stopFollow();
  if (explodeTarget > 0.5) btnExplode.onclick();
};

/* ================= 控制条 ================= */
document.getElementById('toggleBtn').onclick = function () {
  isRunning = !isRunning;
  this.innerText = isRunning ? '⏸ 暂停' : '▶ 继续';
};
document.getElementById('resetBtn').onclick = () => {
  for (const s of [sysTank, sysPipe, sysAtom, sysElectron, sysIon, sysNeut, sysSpark]) { s.n = 0; s.objs.length = 0; s.flush(); }
  followIdx = -1;
  seedTank();
};
document.getElementById('camBtn').onclick = () => flyTo([4.6, 3.4, 8.8], [0.2, 0, 0], 1.0);
document.getElementById('voltageSlider').oninput = e => {
  voltage = +e.target.value;
  document.getElementById('voltageVal').textContent = voltage + ' V';
  updateStats();
};
document.getElementById('flowSlider').oninput = e => {
  flow = +e.target.value;
  document.getElementById('flowVal').textContent = (flow * 0.75).toFixed(1) + ' mg/s';
  updateStats();
};
document.getElementById('timeSlider').oninput = e => {
  timeScale = +e.target.value;
  document.getElementById('timeVal').textContent = timeScale.toFixed(1) + '×';
};
addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); document.getElementById('toggleBtn').onclick(); }
  if (e.code === 'Escape') {
    if (selectedKey) { selectedKey = null; infoPanel.classList.remove('open'); }
    else if (followOn) stopFollow();
    else if (tourActive) stopTour();
  }
});

/* 实时性能参数 */
function updateStats() {
  const q = 1.6e-19, m = 2.18e-25, eta = 0.65;
  const ve = Math.sqrt(2 * q * voltage / m);
  const mdot = flow * 0.75e-6;
  const F = mdot * ve * eta;
  const Isp = ve * eta / 9.81;
  const P = 0.35 * mdot * ve * ve;
  document.getElementById('sThrust').textContent = (F * 1000).toFixed(1) + ' mN';
  document.getElementById('sIsp').textContent = Isp.toFixed(0) + ' s';
  document.getElementById('sVe').textContent = (ve / 1000).toFixed(1) + ' km/s';
  document.getElementById('sMdot').textContent = (mdot * 1e6).toFixed(2) + ' mg/s';
  document.getElementById('sPow').textContent = (P / 1000).toFixed(2) + ' kW';
}
updateStats();

/* ================= 主循环 ================= */
const clock = new THREE.Clock();
let firstFrame = true;

function animate() {
  requestAnimationFrame(animate);
  const rawDt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  /* 相机 tween */
  if (camTween) {
    camTween.t += rawDt / camTween.dur;
    const k = camTween.t >= 1 ? 1 : (camTween.t * camTween.t * (3 - 2 * camTween.t));
    camera.position.lerpVectors(camTween.p0, camTween.p1, k);
    controls.target.lerpVectors(camTween.t0, camTween.t1, k);
    if (camTween.t >= 1) camTween = null;
  }

  /* 爆炸视图 */
  explodeT += (explodeTarget - explodeT) * Math.min(1, rawDt * 3.2);
  const ex = explodeT < 0.005 ? 0 : explodeT;
  for (const name in groups) {
    const g = groups[name];
    g.position.copy(g.userData.base).addScaledVector(g.userData.offset, ex);
  }
  const wireFade = 1 - Math.min(1, ex * 1.6);
  wiresGroup.visible = wireFade > 0.05;
  for (const m of wireMats) m.opacity = 0.85 * wireFade;
  /* 羽流跟随加速栅位移 */
  plumeGroup.position.x = groups.accel.userData.offset.x * ex;
  beamLight.position.set(3.2 + groups.accel.userData.offset.x * ex, 0, 0);

  /* 仿真 */
  if (isRunning) {
    let rem = rawDt * timeScale;
    while (rem > 0) { const step = Math.min(rem, 0.02); simulate(step); rem -= step; }
    for (const s of [sysTank, sysPipe, sysAtom, sysElectron, sysIon, sysNeut, sysSpark]) s.flush();
  }

  /* 跟随离子 */
  if (followOn) {
    if (followIdx >= 0 && followIdx < sysIon.n) {
      const i3 = followIdx * 3;
      const px = sysIon.pos[i3], py = sysIon.pos[i3+1], pz = sysIon.pos[i3+2];
      followAngle += rawDt * 0.55;
      const ox = -4.6, oy = Math.cos(followAngle) * 1.6 + 1.1, oz = Math.sin(followAngle) * 3.0;
      camera.position.set(px + ox, py + oy, pz + oz);
      controls.target.set(px, py, pz);
      const o = sysIon.objs[followIdx];
      if (!o || o.phase === 'gone') followIdx = -1;
    } else {
      followIdx = -1;  // 等待下一颗新离子
    }
  }

  /* 动效细节 */
  cathodeLight.intensity = 2.4 + Math.sin(t * 7) * 0.7;
  cathodeGroup.userData.tip.material.color.setHSL(0.97, 0.85, 0.55 + 0.15 * Math.sin(t * 7));
  led1.material.color.setHex(Math.sin(t * 4) > 0 ? 0x4ade80 : 0x14532d);
  led2.material.color.setHex(Math.sin(t * 5.3 + 2) > 0 ? 0xfacc15 : 0x713f12);
  valveMat.emissiveIntensity = 0.35 + flow * 0.06 + 0.12 * Math.sin(t * 6);
  neutLight.intensity = 3 + Math.sin(t * 9) * 1.2;
  beamLight.intensity = (5 + voltage * 0.002) * (sysIon.n > 4 ? 1 : 0.4);
  const arrowOp = 0.3 + 0.35 * (voltage / 2500) + 0.1 * Math.sin(t * 3);
  fieldArrows.children.forEach(a => {
    a.line.material.opacity = arrowOp; a.cone.material.opacity = arrowOp;
  });

  refreshGlow(t);
  raycastHover();

  controls.update();
  composer.render();
  labelRenderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    const ld = document.getElementById('loading');
    ld.style.opacity = '0';
    setTimeout(() => ld.remove(), 600);
  }
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  labelRenderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

seedTank();
animate();
window.__ready = true;
