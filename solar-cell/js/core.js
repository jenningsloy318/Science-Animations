/* ══════════════════════════════════════════════════
   core.js — Three.js scene, animation queue, shared state
   ══════════════════════════════════════════════════ */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export const COL = {
  bg: 0x04060d,
  electron: 0xfbbf24, hole: 0x38bdf8,
  silicon: 0x64748b, nTint: 0x3b4d78, pTint: 0x6e4450,
};

/* meters — chapters write, ui reads */
export const METERS = { volt: 0, amp: 0 };
export function resetMeters() { METERS.volt = 0; METERS.amp = 0; }

/* ── scene singletons ── */
let renderer, scene, camera, controls, clock;

export function initCore(canvas) {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(COL.bg);
  scene.fog = new THREE.FogExp2(COL.bg, 0.011);

  camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 400);
  camera.position.set(9, 7, 15);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.maxDistance = 90;
  controls.minDistance = 3;

  clock = new THREE.Clock();

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  return { renderer, scene, camera, controls, clock };
}
export function getCore() { return { renderer, scene, camera, controls, clock }; }

/* ── ambient lights ── */
export function ensureLights() {
  if (scene.getObjectByName('__amb')) return;
  const amb = new THREE.AmbientLight(0x334155, 1.1); amb.name = '__amb';
  const dir = new THREE.DirectionalLight(0xe2e8f0, 1.2); dir.position.set(6, 12, 8); dir.name = '__dir';
  scene.add(amb, dir);
}

/* ── animation queue (negative elapsed = delay) ── */
const animQueue = [];
export function addAnim(item) { item.elapsed = item.elapsed ?? 0; animQueue.push(item); }
export function clearAnims() { animQueue.length = 0; }
export function stepAnims(dt) {
  for (let i = animQueue.length - 1; i >= 0; i--) {
    const a = animQueue[i];
    a.elapsed += dt;
    if (a.elapsed < 0) continue;
    const p = Math.min(1, Math.max(0, a.elapsed / a.duration));
    a.update(p, dt);
    if (p >= 1) { animQueue.splice(i, 1); a.onComplete && a.onComplete(); }
  }
}

/* ── easing ── */
export const ease = {
  inOut: t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2,
  out: t => 1 - Math.pow(1 - t, 3),
  in: t => t*t*t,
};

/* ── smooth camera fly ── */
export function flyCamera(cam, ctrl, pos, tgt, dur = 1.4) {
  const p0 = cam.position.clone(), t0 = ctrl.target.clone();
  const p1 = new THREE.Vector3(...pos), t1 = new THREE.Vector3(...tgt);
  addAnim({
    duration: dur,
    update(p) {
      const q = ease.inOut(p);
      cam.position.lerpVectors(p0, p1, q);
      ctrl.target.lerpVectors(t0, t1, q);
      ctrl.update();
    },
  });
}

/* ── helpers ── */
export function makeTextSprite(text, size = 0.7, color = '#e2e8f0') {
  // 画布自适应文本宽度: 长标签不再被 256px 画布截断
  const font = 'bold 40px Outfit, sans-serif';
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = font;
  const textW = probe.measureText(text).width;
  const pad = 24;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(256, Math.ceil(textW + pad * 2));
  canvas.height = 84;
  const ctx = canvas.getContext('2d');
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, 42);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  const aspect = canvas.width / canvas.height;
  sprite.scale.set(size * 0.72 * aspect, size * 0.72, 1);
  return sprite;
}

export function disposeGroup(group) {
  group.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
        if (m.map) m.map.dispose();
        m.dispose();
      });
    }
  });
  group.clear();
}

/* wavelength → THREE color (380–750nm visible; IR shown dim gray) */
export function wavelengthColor(nm) {
  if (nm > 750) return new THREE.Color(0x6b7280).multiplyScalar(0.75);
  let r = 0, g = 0, b = 0;
  if (nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
  else { r = 1; }
  return new THREE.Color(r, g, b);
}

/* photon energy in eV from wavelength nm */
export function photonEnergy(nm) { return 1239.84 / nm; }

/* ── 真实面心金刚石立方晶格构建器 (Diamond Cubic Lattice, Fd3̄m) ── */
export function buildDiamondLattice(group, { NX = 2, NY = 1, NZ = 2, a = 3.6 } = {}) {
  const d0 = (Math.sqrt(3) / 4) * a;
  const base = [
    [0, 0, 0], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5],
    [0.25, 0.25, 0.25], [0.75, 0.75, 0.25], [0.75, 0.25, 0.75], [0.25, 0.75, 0.75]
  ];
  const rawPts = [];
  for (let cx = 0; cx <= NX; cx++) {
    for (let cy = 0; cy <= NY; cy++) {
      for (let cz = 0; cz <= NZ; cz++) {
        for (const b of base) {
          const x = (cx + b[0]) * a;
          const y = (cy + b[1]) * a;
          const z = (cz + b[2]) * a;
          if (x <= NX * a + 1e-4 && y <= NY * a + 1e-4 && z <= NZ * a + 1e-4) {
            const exists = rawPts.some(p => Math.hypot(p.x - x, p.y - y, p.z - z) < 0.1);
            if (!exists) rawPts.push({ x, y, z });
          }
        }
      }
    }
  }

  // 识别成对的共价键 (距离严格满足 (√3/4)*a)
  const rawBonds = [];
  rawPts.forEach((p1, i) => {
    rawPts.forEach((p2, j) => {
      if (i < j) {
        const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z);
        if (Math.abs(dist - d0) < 0.06 * d0) {
          rawBonds.push([i, j, dist]);
        }
      }
    });
  });

  // 保留所有至少有1个共价键的原子
  const atomIndices = new Set();
  rawBonds.forEach(([i, j]) => { atomIndices.add(i); atomIndices.add(j); });
  const indexMap = new Map();
  const validPts = [];
  Array.from(atomIndices).sort((a, b) => a - b).forEach((oldIdx, newIdx) => {
    indexMap.set(oldIdx, newIdx);
    validPts.push(rawPts[oldIdx]);
  });

  const atomGeo = new THREE.SphereGeometry(0.38, 16, 16);
  const bondGeo = new THREE.CylinderGeometry(0.065, 0.065, 1, 8);
  const siMat = () => new THREE.MeshStandardMaterial({
    color: COL.silicon, roughness: .35, metalness: .3, emissive: 0x1a2333, emissiveIntensity: .4,
  });
  const bondMat = new THREE.MeshStandardMaterial({
    color: 0x475569, roughness: .5, metalness: 0.2
  });

  const atoms = [];
  validPts.forEach((pt, i) => {
    const mesh = new THREE.Mesh(atomGeo, siMat());
    mesh.position.set(pt.x, pt.y, pt.z);
    group.add(mesh);
    atoms.push({
      mesh,
      x: pt.x,
      y: pt.y,
      z: pt.z,
      target: mesh.position.clone(),
      index: i
    });
  });

  const bonds = [];
  rawBonds.forEach(([oldI, oldJ, dist]) => {
    const i = indexMap.get(oldI);
    const j = indexMap.get(oldJ);
    if (i === undefined || j === undefined) return;
    const a1 = atoms[i];
    const a2 = atoms[j];
    const bMesh = new THREE.Mesh(bondGeo, bondMat);
    bMesh.scale.set(1, dist, 1);
    bMesh.position.copy(a1.mesh.position).lerp(a2.mesh.position, 0.5);
    bMesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      a2.mesh.position.clone().sub(a1.mesh.position).normalize()
    );
    group.add(bMesh);
    bonds.push({ mesh: bMesh, a: a1, b: a2 });
  });

  // 居中偏移
  const midX = (NX * a) / 2;
  const midY = (NY * a) / 2;
  const midZ = (NZ * a) / 2;
  group.position.set(-midX, 0.6 - midY, -midZ);

  return {
    atoms,
    bonds,
    dims: {
      NX: NX * 3, NY: NY * 2, NZ: NZ * 2.5,
      SP: a / 2,
      width: NX * a, height: NY * a, depth: NZ * a,
    },
    midX,
    diamond: true,
  };
}

export const buildLattice = buildDiamondLattice;

/* wandering carrier (electron or hole) around an anchor */
export function makeCarrierMesh(kind) {
  return kind === 'e'
    ? new THREE.Mesh(
        new THREE.SphereGeometry(0.17, 12, 12),
        new THREE.MeshStandardMaterial({ color: COL.electron, emissive: COL.electron, emissiveIntensity: 1.1 }))
    : new THREE.Mesh(
        new THREE.SphereGeometry(0.21, 12, 12),
        new THREE.MeshStandardMaterial({ color: COL.hole, wireframe: true, emissive: COL.hole, emissiveIntensity: .7 }));
}

