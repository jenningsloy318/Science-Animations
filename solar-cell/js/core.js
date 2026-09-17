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
export function photonEnergy(nm) { return 1240 / nm; }

/* ── shared silicon lattice builder ── */
export function buildLattice(group, { NX = 6, NY = 2, NZ = 5, SP = 1.55 } = {}) {
  const atomGeo = new THREE.SphereGeometry(0.46, 18, 18);
  const bondGeo = new THREE.CylinderGeometry(0.07, 0.07, SP, 8);
  const atoms = [], bonds = [];
  const siMat = () => new THREE.MeshStandardMaterial({
    color: COL.silicon, roughness: .4, metalness: .3, emissive: 0x1a2333, emissiveIntensity: .4,
  });
  for (let z = 0; z < NZ; z++) for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) {
    const m = new THREE.Mesh(atomGeo, siMat());
    m.position.set(x * SP, y * SP, z * SP);
    group.add(m);
    atoms.push({ mesh: m, x, y, z });
  }
  const bondMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: .5 });
  for (const a of atoms) {
    for (const [dx, dy, dz] of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
      const n = atoms.find(o => o.x === a.x + dx && o.y === a.y + dy && o.z === a.z + dz);
      if (!n) continue;
      const b = new THREE.Mesh(bondGeo, bondMat);
      b.position.copy(a.mesh.position).lerp(n.mesh.position, 0.5);
      b.lookAt(n.mesh.position);
      b.rotateX(Math.PI / 2);
      group.add(b);
      bonds.push(b);
    }
  }
  group.position.set(-NX * SP / 2, -1.2, -NZ * SP / 2);
  return { atoms, bonds, dims: { NX, NY, NZ, SP } };
}

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
