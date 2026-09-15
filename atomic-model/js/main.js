import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* ================================================================
   元素数据 ELEMENT DATA
   ================================================================ */
const ELEMENTS = {
  H:  { symbol: 'H',  name: '氢 Hydrogen',  Z: 1,  N: 0,  shells: [1] },
  He: { symbol: 'He', name: '氦 Helium',     Z: 2,  N: 2,  shells: [2] },
  O:  { symbol: 'O',  name: '氧 Oxygen',     Z: 8,  N: 8,  shells: [2, 6] },
  Si: { symbol: 'Si', name: '硅 Silicon',    Z: 14, N: 14, shells: [2, 8, 4] },
  Fe: { symbol: 'Fe', name: '铁 Iron',       Z: 26, N: 30, shells: [2, 8, 14, 2] },
};
const SHELL_NAMES = ['K', 'L', 'M', 'N'];
const SHELL_MAX   = [2, 8, 18, 32];
const SHELL_RADII = [2.8, 5.0, 7.2, 9.4];

/* Photon color data for different transitions */
const TRANSITION_DATA = {
  '0-1': { eV: '1.9 eV', color: '#e74c3c', name: '红光 Red',   hex: 0xe74c3c, wl: '650nm' },
  '0-2': { eV: '2.5 eV', color: '#2ecc71', name: '绿光 Green', hex: 0x2ecc71, wl: '520nm' },
  '0-3': { eV: '3.0 eV', color: '#8b5cf6', name: '紫光 Violet', hex: 0x8b5cf6, wl: '410nm' },
  '1-2': { eV: '1.5 eV', color: '#e67e22', name: '橙光 Orange', hex: 0xe67e22, wl: '600nm' },
  '1-3': { eV: '2.2 eV', color: '#3498db', name: '蓝光 Blue',   hex: 0x3498db, wl: '470nm' },
  '2-3': { eV: '0.8 eV', color: '#e74c3c', name: '红外 IR',     hex: 0xcc3333, wl: '900nm' },
};

function getTransitionInfo(from, to) {
  const key1 = `${Math.min(from,to)}-${Math.max(from,to)}`;
  return TRANSITION_DATA[key1] || { eV: '~2 eV', color: '#fbbf24', name: '光', hex: 0xfbbf24, wl: '~550nm' };
}

/* ================================================================
   颜色 COLORS
   ================================================================ */
const COL = {
  proton:   0xff6b4a,
  neutron:  0x7a8899,
  electron: 0x38bdf8,
  photonIn: 0xfbbf24,
  shellRing: 0x334466,
  ionPos:   0xf87171,
  ionNeg:   0x60a5fa,
};

/* ================================================================
   场景设置 SCENE SETUP
   ================================================================ */
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04060d);

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200);
camera.position.set(8, 6, 14);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 5;
controls.maxDistance = 40;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.0, 0.4, 0.25);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

/* Lights */
const ambientLight = new THREE.AmbientLight(0x334466, 0.5);
scene.add(ambientLight);
const nucleusLight = new THREE.PointLight(0xff7755, 1.5, 30);
scene.add(nucleusLight);
const fillLight = new THREE.DirectionalLight(0x668899, 0.4);
fillLight.position.set(5, 10, 5);
scene.add(fillLight);

/* ================================================================
   原子状态 ATOM STATE
   ================================================================ */
let currentElement = 'Li';
let atomState = 'ground'; // ground | excited | cation | anion
let chargeOffset = 0;
let excitedElectron = null;
let excitedFromShell = -1;
let animating = false;

const nucleusGroup = new THREE.Group();
const shellsGroup  = new THREE.Group();
const electronsGroup = new THREE.Group();
const effectsGroup = new THREE.Group();
scene.add(nucleusGroup, shellsGroup, electronsGroup, effectsGroup);

let electronData = [];
let shellRings = []; // { shellIndex, ring1, ring2 } — for dynamic color updates
let shellSpeeds = []; // shared angular speed per shell — keeps electrons evenly spaced

/* ================================================================
   几何与材质 GEOMETRIES & MATERIALS
   ================================================================ */
const protonGeo  = new THREE.SphereGeometry(0.4, 24, 24);
const neutronGeo = new THREE.SphereGeometry(0.38, 24, 24);
const electronGeo = new THREE.SphereGeometry(0.18, 16, 16);

const protonMat = new THREE.MeshStandardMaterial({
  color: COL.proton, emissive: COL.proton, emissiveIntensity: 0.5,
  roughness: 0.3, metalness: 0.2,
});
const neutronMat = new THREE.MeshStandardMaterial({
  color: COL.neutron, emissive: COL.neutron, emissiveIntensity: 0.15,
  roughness: 0.5, metalness: 0.3,
});
const electronMat = new THREE.MeshStandardMaterial({
  color: COL.electron, emissive: COL.electron, emissiveIntensity: 0.8,
  roughness: 0.2, metalness: 0.1,
});

/* ================================================================
   构建原子 BUILD ATOM
   ================================================================ */
function buildAtom(elemKey) {
  const elem = ELEMENTS[elemKey];
  currentElement = elemKey;
  atomState = 'ground';
  chargeOffset = 0;
  excitedElectron = null;
  excitedFromShell = -1;

  nucleusGroup.clear();
  shellsGroup.clear();
  electronsGroup.clear();
  effectsGroup.clear();
  electronData = [];
  shellRings = [];
  shellSpeeds = [];
  for (let s = 0; s < 4; s++) shellSpeeds[s] = (0.6 + Math.random() * 0.3) / (s + 1);
  clearNarration();
  hidePhotonBadge();

  // ── Nucleus ──
  const totalNucleons = elem.Z + elem.N;
  const positions = packSpheres(totalNucleons, 0.42);
  for (let i = 0; i < totalNucleons; i++) {
    const isProton = i < elem.Z;
    const mesh = new THREE.Mesh(
      isProton ? protonGeo : neutronGeo,
      (isProton ? protonMat : neutronMat).clone()
    );
    mesh.position.copy(positions[i]);
    nucleusGroup.add(mesh);
  }

  // ── Shell rings ──
  const numShells = elem.shells.length;
  for (let s = 0; s < Math.min(numShells + 2, 4); s++) {
    const isOccupied = s < numShells;
    const ringGeo = new THREE.TorusGeometry(SHELL_RADII[s], isOccupied ? 0.025 : 0.012, 8, 80);
    const ringMat = new THREE.MeshBasicMaterial({
      color: COL.shellRing, transparent: true, opacity: isOccupied ? 0.28 : 0.1,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2; // ring lies in XZ plane — same plane electrons orbit in
    shellsGroup.add(ring);

    // Tilted ring
    const ring2 = ring.clone();
    ring2.rotation.x = Math.PI * 0.35;
    ring2.rotation.z = Math.PI * 0.2;
    ring2.material = ringMat.clone();
    ring2.material.opacity = isOccupied ? 0.12 : 0.05;
    shellsGroup.add(ring2);

    // Store references for dynamic coloring (labelSprite assigned below)
    const srRef = { shellIndex: s, ring1: ring, ring2, isOccupied, labelSprite: null };
    shellRings.push(srRef);

    const labelSprite = makeTextSprite(
      SHELL_NAMES[s] + (s < numShells ? '' : ' (空)'),
      isOccupied ? 0.5 : 0.4,
      isOccupied ? '#64748b' : '#3a4455'
    );
    labelSprite.position.set(SHELL_RADII[s] + 0.6, 0.6, 0);
    shellsGroup.add(labelSprite);
    srRef.labelSprite = labelSprite;

    // Energy annotation: show "低能量" on innermost, "高能量" on outermost
    if (s === 0 || s === Math.min(numShells + 1, 3)) {
      const eLabel = makeTextSprite(
        s === 0 ? '⬇ 低能量 Low E' : '⬆ 高能量 High E',
        0.55,
        s === 0 ? '#34d399' : '#f87171'
      );
      eLabel.position.set(-(SHELL_RADII[s] + 0.8), -0.5, 0);
      shellsGroup.add(eLabel);
    }
  }

  // ── Electrons ──
  for (let s = 0; s < numShells; s++) {
    const count = elem.shells[s];
    const phase = Math.random() * Math.PI * 2;          // one shared phase per shell
    for (let e = 0; e < count; e++) {
      const mesh = new THREE.Mesh(electronGeo, electronMat.clone());
      const angle = phase + (e / count) * Math.PI * 2;  // evenly spaced, no overlap
      electronData.push({
        mesh, shellIndex: s, angle, speed: shellSpeeds[s],
        originalShell: s, tilt: Math.random() * 0.5 - 0.25,
      });
      electronsGroup.add(mesh);
    }
  }

  updateInfoPanel();
  updateButtons();
  drawEnergyDiagram();
}

function packSpheres(count, spacing) {
  const positions = [];
  if (count === 0) return positions;
  if (count === 1) { positions.push(new THREE.Vector3(0, 0, 0)); return positions; }
  const phi = Math.PI * (3 - Math.sqrt(5));
  const scale = spacing * Math.pow(count, 1/3) * 0.65;
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = phi * i;
    positions.push(new THREE.Vector3(
      Math.cos(theta) * radius * scale,
      y * scale,
      Math.sin(theta) * radius * scale
    ));
  }
  return positions;
}

function makeTextSprite(text, size, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 196; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 34px Outfit, sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 98, 32);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(size * 1.5, size * 0.5, 1);
  return sprite;
}

/* ================================================================
   动画循环 ANIMATION LOOP
   ================================================================ */
const clock = new THREE.Clock();
let animQueue = [];

// Trail particles for photon
let trailParticles = [];

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const t  = clock.getElapsedTime();

  // ── Orbit electrons ──
  for (const ed of electronData) {
    ed.angle += ed.speed * dt;
  }

  // ── Phase-lock: same-shell electrons relax into evenly spaced formation ──
  // Self-heals bunching no matter which button sequence produced it.
  const wrap = d => Math.atan2(Math.sin(d), Math.cos(d));
  for (let s = 0; s < shellSpeeds.length; s++) {
    const eds = electronData.filter(e => e.shellIndex === s && !e.escaping);
    if (eds.length < 2) continue;
    let sx = 0, sy = 0;
    for (const e of eds) { sx += Math.cos(e.angle); sy += Math.sin(e.angle); }
    const mean = Math.atan2(sy, sx);
    eds.sort((a, b) => wrap(a.angle - mean) - wrap(b.angle - mean));
    const n = eds.length;
    for (let i = 0; i < n; i++) {
      const slot = mean + (i - (n - 1) / 2) * (2 * Math.PI / n);
      eds[i].angle += wrap(slot - eds[i].angle) * Math.min(1, 2.5 * dt);
    }
  }

  // Apply positions
  for (const ed of electronData) {
    const r = SHELL_RADII[ed.shellIndex];
    ed.mesh.position.set(
      Math.cos(ed.angle) * r,
      0, // ride exactly on the ring
      Math.sin(ed.angle) * r,
    );
  }

  // ── Nucleus wobble ──
  nucleusGroup.rotation.y += dt * 0.15;
  nucleusGroup.rotation.x = Math.sin(t * 0.3) * 0.05;

  // ── Trail particles fade ──
  for (let i = trailParticles.length - 1; i >= 0; i--) {
    const tp = trailParticles[i];
    tp.life -= dt;
    if (tp.life <= 0) {
      effectsGroup.remove(tp.mesh);
      tp.mesh.geometry.dispose();
      tp.mesh.material.dispose();
      trailParticles.splice(i, 1);
    } else {
      tp.mesh.material.opacity = tp.life / tp.maxLife * 0.6;
      tp.mesh.scale.setScalar(tp.life / tp.maxLife * 0.8);
    }
  }

  // ── Animation queue ──
  for (let i = animQueue.length - 1; i >= 0; i--) {
    const a = animQueue[i];
    a.elapsed += dt;
    const p = Math.min(a.elapsed / a.duration, 1);
    a.update(p, dt);
    if (p >= 1) { if (a.onComplete) a.onComplete(); animQueue.splice(i, 1); }
  }

  controls.update();
  composer.render();
}

/* ================================================================
   光子轨迹 PHOTON TRAIL
   ================================================================ */
function spawnTrail(position, color) {
  const geo = new THREE.SphereGeometry(0.06, 6, 6);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(position);
  effectsGroup.add(mesh);
  trailParticles.push({ mesh, life: 0.5, maxLife: 0.5 });
}

/* ================================================================
   叙事系统 NARRATION SYSTEM
   ================================================================ */
let narrTimeouts = [];

function clearNarration() {
  for (const tid of narrTimeouts) clearTimeout(tid);
  narrTimeouts = [];
  document.getElementById('narration').innerHTML = '';
}

function showNarrStep(text, subtext, stepNum, type, delay) {
  return new Promise(resolve => {
    const tid = setTimeout(() => {
      const div = document.createElement('div');
      div.className = `narr-step ${type}`;
      div.innerHTML = `<span class="step-num">${stepNum}</span>${text}` +
        (subtext ? `<div class="narr-sub">${subtext}</div>` : '');
      document.getElementById('narration').appendChild(div);
      requestAnimationFrame(() => div.classList.add('show'));

      // Auto-remove after a while
      const rid = setTimeout(() => {
        div.classList.remove('show');
        setTimeout(() => div.remove(), 400);
      }, 5000);
      narrTimeouts.push(rid);
      resolve();
    }, delay);
    narrTimeouts.push(tid);
  });
}

function showNarrFormula(text, colorClass, delay) {
  const tid = setTimeout(() => {
    const div = document.createElement('div');
    div.className = 'narr-step show';
    div.innerHTML = `<div class="narr-formula ${colorClass}">${text}</div>`;
    document.getElementById('narration').appendChild(div);
    const rid = setTimeout(() => {
      div.classList.remove('show');
      setTimeout(() => div.remove(), 400);
    }, 5500);
    narrTimeouts.push(rid);
  }, delay);
  narrTimeouts.push(tid);
}

/* ================================================================
   光子信息面板 PHOTON INFO BADGE
   ================================================================ */
function showPhotonBadge(direction, transInfo) {
  const badge = document.getElementById('photonBadge');
  document.getElementById('pDir').textContent = direction;
  document.getElementById('pDir').style.color = direction.includes('飞入') ? '#fbbf24' : '#38bdf8';
  document.getElementById('pEnergy').textContent = transInfo.eV;
  document.getElementById('pTransition').textContent = transInfo.name;
  document.getElementById('pColor').textContent = transInfo.wl;
  document.getElementById('photonSwatch').style.background = transInfo.color;
  badge.classList.add('show');
}

function hidePhotonBadge() {
  document.getElementById('photonBadge').classList.remove('show');
}

/* ================================================================
   ☀️ 吸收光子 ABSORB PHOTON
   光子从外面飞进来 → 撞到电子 → 光子消失 → 电子跳上去
   ================================================================ */
function absorbEnergy() {
  if (animating || (atomState !== 'ground' && atomState !== 'excited')) return;
  const elem = ELEMENTS[currentElement];
  const numShells = elem.shells.length;

  const outermostShell = excitedElectron ? excitedElectron.shellIndex : numShells - 1;
  const targetShell = outermostShell + 1;
  if (targetShell >= 4) {
    showNarrStep('能量太大了！如果能量超过电离能，电子会完全离开原子 → 请用"失去电子"按钮', '', '!', 'ionize', 0);
    return;
  }

  let eTarget = excitedElectron;
  if (!eTarget) {
    eTarget = electronData.find(ed => ed.shellIndex === numShells - 1);
  }
  if (!eTarget) return;

  animating = true;
  clearNarration();

  const transInfo = getTransitionInfo(outermostShell, targetShell);

  // Show narration steps
  showNarrStep(
    '☀️ 一个<b>光子</b>从外部飞向原子…',
    'A photon approaches the atom from outside',
    '1', 'absorption', 0
  );

  // ── Create photon with glow + label ──
  const photonGroup = new THREE.Group();
  const photonCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
  );
  const photonGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.15 })
  );
  photonGroup.add(photonCore, photonGlow);
  photonGroup.position.set(22, 6, 12);
  effectsGroup.add(photonGroup);

  // Direction arrow sprite
  const arrowSprite = makeTextSprite('光子 hν →', 1.0, '#fbbf24');
  arrowSprite.position.set(0, 0.8, 0);
  photonGroup.add(arrowSprite);

  showPhotonBadge('→ 飞入原子 (Incoming)', transInfo);

  const startPos = photonGroup.position.clone();
  let trailTimer = 0;

  // Phase 1: Photon flies IN
  animQueue.push({
    elapsed: 0, duration: 1.2,
    update(p, dt) {
      const ep = easeInOutCubic(p);
      photonGroup.position.lerpVectors(startPos, eTarget.mesh.position, ep);
      photonCore.scale.setScalar(1 + Math.sin(p * Math.PI * 8) * 0.3);
      photonGlow.scale.setScalar(1 + Math.sin(p * Math.PI * 4) * 0.5);
      // Trail
      trailTimer += dt;
      if (trailTimer > 0.03) {
        spawnTrail(photonGroup.position, 0xfbbf24);
        trailTimer = 0;
      }
    },
    onComplete() {
      showNarrStep(
        '光子被电子<b>吸收</b>了！光子<b>消失</b> ✨',
        'Photon is absorbed — it ceases to exist!',
        '2', 'absorption', 0
      );

      // ── Photon disappears with burst effect ──
      effectsGroup.remove(photonGroup);
      flashAtom(0xfbbf24, 0.4);

      // Burst particles where photon was absorbed
      for (let i = 0; i < 15; i++) {
        const sparkGeo = new THREE.SphereGeometry(0.08, 6, 6);
        const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.8 });
        const spark = new THREE.Mesh(sparkGeo, sparkMat);
        spark.position.copy(eTarget.mesh.position);
        effectsGroup.add(spark);
        const dir = new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        ).normalize();
        const sPos = spark.position.clone();
        animQueue.push({
          elapsed: 0, duration: 0.6,
          update(p) {
            spark.position.copy(sPos).addScaledVector(dir, p * 2);
            spark.material.opacity = 0.8 * (1 - p);
            spark.scale.setScalar(1 - p * 0.8);
          },
          onComplete() { effectsGroup.remove(spark); sparkMat.dispose(); },
        });
      }

      // Phase 2: After small delay, electron jumps UP
      setTimeout(() => {
        showNarrStep(
          `电子获得能量，<b>跳到更远的外层轨道</b>！n=${outermostShell+1} → n=${targetShell+1}（外层=高能量，就像把球举高）`,
          `Electron jumps OUTWARD to higher orbit: ${SHELL_NAMES[outermostShell]} → ${SHELL_NAMES[targetShell]} (farther from nucleus = MORE energy, like lifting a ball)`,
          '3', 'absorption', 0
        );

        excitedFromShell = outermostShell;
        eTarget.shellIndex = targetShell;
        eTarget.speed = shellSpeeds[targetShell];
        excitedElectron = eTarget;

        // Highlight the electron
        eTarget.mesh.material.color.setHex(0xfbbf24);
        eTarget.mesh.material.emissive.setHex(0xfbbf24);
        eTarget.mesh.material.emissiveIntensity = 1.2;

        atomState = 'excited';

        setTimeout(() => {
          showNarrStep(
            '✅ 原子仍然是<b>中性的</b>！电子只是换了轨道，没有离开原子',
            'Atom is still NEUTRAL — electron moved up but is still inside the atom. NOT an ion!',
            '✓', 'absorption', 0
          );
          showNarrFormula(`E<sub>光子</sub> = ${transInfo.eV} = E<sub>n=${targetShell+1}</sub> − E<sub>n=${outermostShell+1}</sub>`, 'gold', 200);
        }, 600);

        animating = false;
        updateInfoPanel();
        updateButtons();
        drawEnergyDiagram(outermostShell, targetShell, 'up');
      }, 500);
    },
  });
}

/* ================================================================
   💫 释放光子 RELEASE PHOTON
   电子掉下来 → 多余能量变成新光子 → 光子飞出去
   ================================================================ */
function releaseEnergy() {
  if (animating || !excitedElectron) return;
  animating = true;
  clearNarration();

  const ed = excitedElectron;
  const fromShell = ed.shellIndex;
  const toShell = excitedFromShell >= 0 ? excitedFromShell : ed.originalShell;
  const transInfo = getTransitionInfo(toShell, fromShell);

  showNarrStep(
    '电子在高能级<b>不稳定</b>，要掉回去了…',
    'Electron in excited state is unstable — it will fall back down',
    '1', 'emission', 0
  );

  // Phase 1: Electron drops DOWN
  setTimeout(() => {
    showNarrStep(
      `电子<b>掉回内层轨道</b>（更靠近原子核）！n=${fromShell+1} → n=${toShell+1}（内层=低能量，就像球掉下来）`,
      `Electron falls INWARD to lower orbit: ${SHELL_NAMES[fromShell]} → ${SHELL_NAMES[toShell]} (closer to nucleus = LESS energy)`,
      '2', 'emission', 0
    );

    ed.shellIndex = toShell;
    ed.speed = shellSpeeds[toShell];

    // Restore electron color
    ed.mesh.material.color.setHex(COL.electron);
    ed.mesh.material.emissive.setHex(COL.electron);
    ed.mesh.material.emissiveIntensity = 0.8;

    // Phase 2: Create NEW photon and it flies OUT
    setTimeout(() => {
      showNarrStep(
        `多余的能量变成了一个<b>新光子</b>！光子<b>飞出去</b>了 💫`,
        'Energy released as a NEW photon — it flies away from the atom!',
        '3', 'emission', 0
      );

      showPhotonBadge('← 飞出原子 (Outgoing)', transInfo);

      const photonGroup = new THREE.Group();
      const photonCore = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 16, 16),
        new THREE.MeshBasicMaterial({ color: transInfo.hex })
      );
      const photonGlow = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 16, 16),
        new THREE.MeshBasicMaterial({ color: transInfo.hex, transparent: true, opacity: 0.2 })
      );
      photonGroup.add(photonCore, photonGlow);
      photonGroup.position.copy(ed.mesh.position);
      effectsGroup.add(photonGroup);

      // Label
      const arrowSprite = makeTextSprite('← 光子 hν', 1.0, transInfo.color);
      arrowSprite.position.set(0, 0.8, 0);
      photonGroup.add(arrowSprite);

      // Burst at creation
      flashAtom(transInfo.hex, 0.3);
      for (let i = 0; i < 10; i++) {
        const sparkGeo = new THREE.SphereGeometry(0.06, 6, 6);
        const sparkMat = new THREE.MeshBasicMaterial({ color: transInfo.hex, transparent: true, opacity: 0.7 });
        const spark = new THREE.Mesh(sparkGeo, sparkMat);
        spark.position.copy(ed.mesh.position);
        effectsGroup.add(spark);
        const dir = new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        ).normalize();
        const sPos = spark.position.clone();
        animQueue.push({
          elapsed: 0, duration: 0.5,
          update(p) {
            spark.position.copy(sPos).addScaledVector(dir, p * 1.5);
            spark.material.opacity = 0.7 * (1 - p);
          },
          onComplete() { effectsGroup.remove(spark); sparkMat.dispose(); },
        });
      }

      // Photon flies OUT
      const pStart = photonGroup.position.clone();
      const outDir = pStart.clone().normalize();
      if (outDir.length() < 0.1) outDir.set(1, 0.3, 0.5).normalize();
      const pEnd = outDir.multiplyScalar(30);
      let trailTimer = 0;

      animQueue.push({
        elapsed: 0, duration: 1.5,
        update(p, dt) {
          const ep = easeInOutCubic(Math.min(p * 1.3, 1));
          photonGroup.position.lerpVectors(pStart, pEnd, ep);
          photonCore.scale.setScalar(1 + Math.sin(p * Math.PI * 10) * 0.3);
          trailTimer += dt;
          if (trailTimer > 0.025) {
            spawnTrail(photonGroup.position, transInfo.hex);
            trailTimer = 0;
          }
        },
        onComplete() {
          effectsGroup.remove(photonGroup);

          showNarrStep(
            '✅ 原子仍然是<b>中性的</b>！光子飞走了，电子还在原子里',
            'Atom is still NEUTRAL — photon left, electron stayed. NOT an ion!',
            '✓', 'emission', 0
          );
          showNarrFormula(
            `光子能量 = ${transInfo.eV} &nbsp; 颜色: ${transInfo.name} (${transInfo.wl})`, 'blue', 200
          );

          excitedElectron = null;
          excitedFromShell = -1;
          atomState = 'ground';
          animating = false;
          updateInfoPanel();
          updateButtons();
          drawEnergyDiagram(fromShell, toShell, 'down');
          hidePhotonBadge();
        },
      });
    }, 500);
  }, 800);
}

/* ================================================================
   ⚡ 电离 IONIZATION — 失去电子
   ================================================================ */
function loseElectron() {
  if (animating) return;
  if (electronData.length <= 0) return;
  animating = true;
  clearNarration();

  let maxShell = -1, target = null;
  for (const ed of electronData) {
    if (ed.shellIndex > maxShell) { maxShell = ed.shellIndex; target = ed; }
  }

  showNarrStep(
    '⚡ 高能量撞击！能量<b>远超</b>跃迁所需…',
    'High energy impact — far more than needed for a transition!',
    '1', 'ionize', 0
  );

  hidePhotonBadge();

  // High energy beam
  const beamGeo = new THREE.CylinderGeometry(0.08, 0.08, 35, 8);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xf87171, transparent: true, opacity: 0.8 });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.set(18, 4, 8);
  beam.lookAt(0, 0, 0);
  beam.rotateX(Math.PI / 2);
  effectsGroup.add(beam);

  const beamStart = beam.position.clone();
  animQueue.push({
    elapsed: 0, duration: 0.5,
    update(p) {
      beam.position.lerpVectors(beamStart, new THREE.Vector3(0, 0, 0), easeInOutCubic(p));
      beam.material.opacity = 0.8 * (1 - p * 0.3);
    },
    onComplete() {
      effectsGroup.remove(beam); beamMat.dispose();
      flashAtom(COL.ionPos, 0.6);

      showNarrStep(
        '电子获得<b>足够能量</b>，完全<b>挣脱</b>原子核的束缚！',
        'Electron gains enough energy to completely ESCAPE the nucleus attraction!',
        '2', 'ionize', 0
      );

      // Electron flies OUT dramatically
      target.escaping = true;
      target.mesh.material.color.setHex(0xf87171);
      target.mesh.material.emissive.setHex(0xf87171);

      const ePos = target.mesh.position.clone();
      const flyDir = ePos.clone().normalize();
      if (flyDir.length() < 0.1) flyDir.set(1, 0.5, 0).normalize();
      const flyEnd = flyDir.multiplyScalar(40);
      let trailTimer = 0;

      // Label on escaping electron
      const escLabel = makeTextSprite('e⁻ 逃逸!', 0.8, '#f87171');
      escLabel.position.set(0, 0.5, 0);
      target.mesh.add(escLabel);

      animQueue.push({
        elapsed: 0, duration: 1.4,
        update(p, dt) {
          const ep = easeInOutCubic(p);
          target.mesh.position.lerpVectors(ePos, flyEnd, ep);
          target.mesh.material.emissiveIntensity = 0.8 + Math.sin(p * Math.PI * 10) * 0.8;
          target.mesh.scale.setScalar(1 + p * 0.5);
          trailTimer += dt;
          if (trailTimer > 0.03) {
            spawnTrail(target.mesh.position, 0xf87171);
            trailTimer = 0;
          }
        },
        onComplete() {
          electronsGroup.remove(target.mesh);
          electronData.splice(electronData.indexOf(target), 1);
          chargeOffset++;
          excitedElectron = null;
          excitedFromShell = -1;
          atomState = 'cation';

          const elem = ELEMENTS[currentElement];
          const c = chargeOffset;
          const sup = c === 1 ? '⁺' : `${c}⁺`;

          showNarrStep(
            `⚡ 电子<b>完全离开</b>了原子！原子变成了<b>正离子（阳离子）</b>`,
            `Electron is GONE! Atom becomes a CATION (positive ion)`,
            '3', 'ionize', 0
          );
          showNarrFormula(`${elem.symbol} → ${elem.symbol}${sup} + ${c}e⁻`, 'red', 300);

          animating = false;
          updateInfoPanel();
          updateButtons();
          drawEnergyDiagram();
        },
      });
    },
  });
}

/* ================================================================
   ⚡ 获得电子 GAIN ELECTRON
   ================================================================ */
function gainElectron() {
  if (animating) return;
  animating = true;
  clearNarration();
  hidePhotonBadge();

  const elem = ELEMENTS[currentElement];
  const currentShells = getShellCounts();
  let targetShell = currentShells.length - 1;
  if (targetShell < 0) targetShell = 0;
  if (currentShells[targetShell] >= SHELL_MAX[targetShell] && targetShell < 3) {
    targetShell++;
  }
  if (targetShell >= 4) { animating = false; return; }

  showNarrStep(
    '一个<b>自由电子</b>从外部飞来…',
    'A free electron approaches from outside',
    '1', 'gain', 0
  );

  const mesh = new THREE.Mesh(electronGeo, electronMat.clone());
  mesh.material.color.setHex(0x60a5fa);
  mesh.material.emissive.setHex(0x60a5fa);
  const startPos = new THREE.Vector3(-22, -6, -12);
  mesh.position.copy(startPos);
  electronsGroup.add(mesh);

  const label = makeTextSprite('e⁻ 飞入', 0.7, '#60a5fa');
  label.position.set(0, 0.5, 0);
  mesh.add(label);

  // Aim at the widest gap between electrons already on the target shell
  const computeLandingAngle = () => {
    const angles = electronData
      .filter(x => x.shellIndex === targetShell)
      .map(x => x.angle % (Math.PI * 2))
      .sort((a, b) => a - b);
    if (angles.length === 0) return Math.random() * Math.PI * 2;
    let bestGap = -1, bestMid = 0;
    for (let i = 0; i < angles.length; i++) {
      const a1 = angles[i];
      const a2 = i + 1 < angles.length ? angles[i + 1] : angles[0] + Math.PI * 2;
      if (a2 - a1 > bestGap) { bestGap = a2 - a1; bestMid = (a1 + a2) / 2; }
    }
    return bestMid;
  };
  let landing = computeLandingAngle();
  const r = SHELL_RADII[targetShell];
  let endPos = new THREE.Vector3(Math.cos(landing) * r, 0, Math.sin(landing) * r);
  let trailTimer = 0;

  animQueue.push({
    elapsed: 0, duration: 1.0,
    update(p, dt) {
      const ep = easeInOutCubic(p);
      landing = computeLandingAngle(); // keep aiming at the widest gap
      endPos = new THREE.Vector3(Math.cos(landing) * r, 0, Math.sin(landing) * r);
      mesh.position.lerpVectors(startPos, endPos, ep);
      mesh.material.emissiveIntensity = 0.8 + Math.sin(p * Math.PI * 8) * 0.5;
      trailTimer += dt;
      if (trailTimer > 0.03) { spawnTrail(mesh.position, 0x60a5fa); trailTimer = 0; }
    },
    onComplete() {
      mesh.remove(label);
      mesh.material.color.setHex(COL.electron);
      mesh.material.emissive.setHex(COL.electron);
      flashAtom(COL.ionNeg, 0.4);

      const ed = {
        mesh, shellIndex: targetShell, angle: landing,
        speed: shellSpeeds[targetShell],
        originalShell: targetShell, tilt: Math.random() * 0.5 - 0.25,
      };
      electronData.push(ed);
      chargeOffset--;
      excitedElectron = null;
      excitedFromShell = -1;
      atomState = 'anion';

      const absC = Math.abs(chargeOffset);
      const sup = absC === 1 ? '⁻' : `${absC}⁻`;

      showNarrStep(
        `⚡ 原子<b>获得了额外电子</b>！变成了<b>负离子（阴离子）</b>`,
        `Atom captured an extra electron — becomes an ANION (negative ion)`,
        '2', 'gain', 0
      );
      showNarrFormula(`${elem.symbol} + ${absC}e⁻ → ${elem.symbol}${sup}`, 'blue', 300);

      animating = false;
      updateInfoPanel();
      updateButtons();
      drawEnergyDiagram();
    },
  });
}

function resetAtom() {
  buildAtom(currentElement);
}

/* ================================================================
   辅助 HELPERS
   ================================================================ */
function getShellCounts() {
  const counts = [];
  for (const ed of electronData) {
    while (counts.length <= ed.shellIndex) counts.push(0);
    counts[ed.shellIndex]++;
  }
  return counts;
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function flashAtom(color, duration) {
  const flashGeo = new THREE.SphereGeometry(1.5, 16, 16);
  const flashMat = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.6, side: THREE.DoubleSide,
  });
  const flash = new THREE.Mesh(flashGeo, flashMat);
  effectsGroup.add(flash);
  animQueue.push({
    elapsed: 0, duration,
    update(p) {
      flash.scale.setScalar(1 + p * 4);
      flash.material.opacity = 0.6 * (1 - p);
    },
    onComplete() { effectsGroup.remove(flash); flashMat.dispose(); },
  });
}

/* ================================================================
   轨道颜色更新 UPDATE SHELL RING COLORS
   根据原子状态动态改变轨道环颜色:
   - 默认: 蓝灰色 (COL.shellRing)
   - 激发态: 目标轨道变金色, 原轨道变暗
   - 正离子: 失去电子的轨道变红色(空轨道)
   - 负离子: 获得电子的轨道变蓝色
   ================================================================ */
const RING_COLORS = {
  default:       { color: 0x334466, opacity1: 0.28, opacity2: 0.12 },
  empty:         { color: 0x334466, opacity1: 0.10, opacity2: 0.05 },
  excited:       { color: 0xfbbf24, opacity1: 0.55, opacity2: 0.30 },  // 金色 — 激发态目标轨道
  excitedSource: { color: 0x2a3a50, opacity1: 0.15, opacity2: 0.08 },  // 暗色 — 电子离开的原轨道
  cation:        { color: 0xf87171, opacity1: 0.50, opacity2: 0.28 },  // 红色 — 失去电子的轨道
  anion:         { color: 0x60a5fa, opacity1: 0.50, opacity2: 0.28 },  // 蓝色 — 获得电子的轨道
};

function updateShellColors() {
  const elem = ELEMENTS[currentElement];
  const numOriginalShells = elem.shells.length;
  const currentShellCounts = getShellCounts();

  for (const sr of shellRings) {
    const s = sr.shellIndex;
    let style = sr.isOccupied ? RING_COLORS.default : RING_COLORS.empty;

    // Count electrons on this shell
    const eCount = s < currentShellCounts.length ? currentShellCounts[s] : 0;

    if (atomState === 'excited' && excitedElectron) {
      if (s === excitedElectron.shellIndex) {
        // This is the excited destination orbit → golden glow
        style = RING_COLORS.excited;
      } else if (s === excitedFromShell) {
        // This is where the electron came from → dimmed
        style = RING_COLORS.excitedSource;
      }
    } else if (atomState === 'cation') {
      // Find shells that lost electrons compared to original
      const origCount = s < numOriginalShells ? elem.shells[s] : 0;
      if (eCount < origCount) {
        // This shell lost electrons → red highlight
        style = RING_COLORS.cation;
      }
      // Empty shells stay empty style
      if (origCount === 0 && eCount === 0) {
        style = RING_COLORS.empty;
      }
    } else if (atomState === 'anion') {
      const origCount = s < numOriginalShells ? elem.shells[s] : 0;
      if (eCount > origCount) {
        // This shell gained electrons → blue highlight
        style = RING_COLORS.anion;
      }
      if (s >= numOriginalShells && eCount === 0) {
        style = RING_COLORS.empty;
      }
    }

    // Apply style
    sr.ring1.material.color.setHex(style.color);
    sr.ring1.material.opacity = style.opacity1;
    sr.ring2.material.color.setHex(style.color);
    sr.ring2.material.opacity = style.opacity2;
  }
}

/* ================================================================
   UI 更新 UI UPDATES
   ================================================================ */
/* Live per-shell electron count labels, e.g. "K · 2e⁻"
   (answers "why two electrons share one ring" on screen) */
function updateShellLabels() {
  for (const sr of shellRings) {
    const count = electronData.filter(e => e.shellIndex === sr.shellIndex).length;
    const text = count > 0
      ? `${SHELL_NAMES[sr.shellIndex]} · ${count}e⁻`
      : SHELL_NAMES[sr.shellIndex] + ' (空)';
    const fresh = makeTextSprite(
      text,
      count > 0 ? 0.5 : 0.4,
      count > 0 ? '#94a3b8' : '#3a4455'
    );
    fresh.position.copy(sr.labelSprite.position);
    fresh.scale.copy(sr.labelSprite.scale);
    shellsGroup.remove(sr.labelSprite);
    shellsGroup.add(fresh);
    sr.labelSprite = fresh;
  }
}

function updateInfoPanel() {
  const elem = ELEMENTS[currentElement];
  const totalE = electronData.length;
  const charge = elem.Z - totalE;

  // Update orbit ring colors based on current state
  updateShellColors();

  document.getElementById('infoElement').textContent = `${elem.symbol} ${elem.name}`;
  document.getElementById('infoProtons').textContent = elem.Z;
  document.getElementById('infoNeutrons').textContent = elem.N;
  document.getElementById('infoElectrons').textContent = totalE;

  const chargeEl = document.getElementById('infoCharge');
  chargeEl.textContent = charge === 0 ? '0' : (charge > 0 ? `+${charge}` : `${charge}`);
  chargeEl.className = 'value ' + (charge > 0 ? 'positive' : charge < 0 ? 'negative' : 'neutral');

  const stateEl = document.getElementById('infoState');
  let stateText, stateClass;
  if (atomState === 'excited') { stateText = '激发态 Excited ✨'; stateClass = 'excited'; }
  else if (atomState === 'cation') { stateText = '正离子 Cation ⊕'; stateClass = 'positive'; }
  else if (atomState === 'anion')  { stateText = '负离子 Anion ⊖'; stateClass = 'negative'; }
  else { stateText = '基态 Ground'; stateClass = 'neutral'; }
  stateEl.textContent = stateText;
  stateEl.className = 'value ' + stateClass;

  updateShellLabels();
  drawShellDistribution();

  const eqEl = document.getElementById('equation');
  if (charge > 0) {
    const sup = charge === 1 ? '⁺' : `${charge}⁺`;
    eqEl.textContent = `${elem.symbol} → ${elem.symbol}${sup} + ${charge}e⁻`;
    eqEl.style.color = '#f87171';
  } else if (charge < 0) {
    const absC = Math.abs(charge);
    const sup = absC === 1 ? '⁻' : `${absC}⁻`;
    eqEl.textContent = `${elem.symbol} + ${absC}e⁻ → ${elem.symbol}${sup}`;
    eqEl.style.color = '#60a5fa';
  } else if (atomState === 'excited') {
    eqEl.textContent = `${elem.symbol} + hν → ${elem.symbol}*`;
    eqEl.style.color = '#fbbf24';
  } else {
    eqEl.textContent = '';
  }
}

function updateButtons() {
  const canAbsorb = (atomState === 'ground' || atomState === 'excited') && chargeOffset === 0;
  const canRelease = atomState === 'excited' && excitedElectron != null;
  document.getElementById('btnAbsorb').disabled = !canAbsorb || animating;
  document.getElementById('btnRelease').disabled = !canRelease || animating;
  document.getElementById('btnLoseE').disabled = electronData.length === 0 || animating;
  document.getElementById('btnGainE').disabled = animating;
}

/* ================================================================
   能级图 ENERGY LEVEL DIAGRAM
   ================================================================ */
function drawEnergyDiagram(fromShell, toShell, direction) {
  const canvas = document.getElementById('energyCanvas');
  const dpr = Math.min(devicePixelRatio, 2);
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const W = rect.width, H = rect.height;
  ctx.clearRect(0, 0, W, H);

  const levels = 5;
  const marginL = 22, marginR = 8, marginT = 28, marginB = 20;
  const lineW = W - marginL - marginR;
  const usableH = H - marginT - marginB;
  const spacing = usableH / (levels);

  // ── Energy axis arrow (left side) ──
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(8, H - marginB);
  ctx.lineTo(8, marginT - 8);
  ctx.stroke();
  // Arrow head
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.moveTo(8, marginT - 12);
  ctx.lineTo(5, marginT - 4);
  ctx.lineTo(11, marginT - 4);
  ctx.closePath();
  ctx.fill();
  // Axis label
  ctx.fillStyle = '#f87171';
  ctx.font = 'bold 9px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('能量↑', 11, marginT - 16);

  // ── "低" and "高" labels ──
  ctx.fillStyle = '#34d399';
  ctx.font = '8px Outfit, sans-serif';
  ctx.fillText('低', 8, H - marginB + 12);
  ctx.fillStyle = '#f87171';
  ctx.fillText('高', 8, marginT + 4);

  // ── Draw energy levels ──
  const yPositions = [];
  const levelColors = ['#34d399', '#6ee7b7', '#94a3b8', '#fca5a5', '#94a3b8'];

  for (let i = 0; i < levels; i++) {
    const y = H - marginB - i * spacing;
    yPositions.push(y);
    const isInfinity = i === 4;
    const label = isInfinity ? '∞ 自由' : `n=${i + 1}`;

    ctx.strokeStyle = isInfinity ? 'rgba(148,163,184,0.25)' : levelColors[i];
    ctx.lineWidth = isInfinity ? 1 : 1.8;
    ctx.setLineDash(isInfinity ? [4, 4] : []);
    ctx.beginPath();
    ctx.moveTo(marginL, y);
    ctx.lineTo(marginL + lineW, y);
    ctx.stroke();

    // Level label (right)
    ctx.fillStyle = isInfinity ? '#475569' : levelColors[i];
    ctx.font = isInfinity ? '8px Outfit' : 'bold 9px Outfit, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(label, marginL + lineW, y - 4);

    // Shell name (left)
    if (i < 4) {
      ctx.textAlign = 'left';
      ctx.fillStyle = levelColors[i];
      ctx.fillText(SHELL_NAMES[i], marginL + 2, y - 4);
    }

    // Distance annotation for first and last real level
    if (i === 0) {
      ctx.fillStyle = '#34d399';
      ctx.font = '7px Outfit';
      ctx.textAlign = 'left';
      ctx.fillText('近核·低能', marginL + 2, y + 10);
    }
    if (i === 3) {
      ctx.fillStyle = '#f87171';
      ctx.font = '7px Outfit';
      ctx.textAlign = 'left';
      ctx.fillText('远核·高能', marginL + 2, y + 10);
    }
  }

  // ── Electron dots on occupied levels ──
  const shellCounts = getShellCounts();
  for (let s = 0; s < shellCounts.length && s < 4; s++) {
    const count = shellCounts[s];
    for (let e = 0; e < count; e++) {
      const isExcited = excitedElectron && excitedElectron.shellIndex === s;
      ctx.fillStyle = isExcited ? '#fbbf24' : '#38bdf8';
      ctx.shadowColor = isExcited ? '#fbbf24' : '#38bdf8';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(marginL + 16 + e * 8, yPositions[s] - 2, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  // ── Transition arrow ──
  if (fromShell !== undefined && toShell !== undefined && fromShell < 5 && toShell < 5) {
    const x = marginL + lineW * 0.6;
    const y1 = yPositions[fromShell];
    const y2 = yPositions[toShell];
    const isUp = direction === 'up';
    const transInfo = getTransitionInfo(Math.min(fromShell, toShell), Math.max(fromShell, toShell));
    const color = transInfo.color;

    // Glowing arrow line
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(x, y1);
    ctx.lineTo(x, y2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Arrow head
    const arrowSize = 6;
    const ay = y2;
    const ad = y2 < y1 ? -1 : 1;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, ay);
    ctx.lineTo(x - arrowSize, ay + ad * arrowSize * 1.5);
    ctx.lineTo(x + arrowSize, ay + ad * arrowSize * 1.5);
    ctx.closePath();
    ctx.fill();

    // Label
    ctx.fillStyle = color;
    ctx.font = 'bold 8px Outfit, sans-serif';
    ctx.textAlign = 'center';
    if (isUp) {
      ctx.fillText('☀️吸收', x, Math.min(y1, y2) - 8);
      ctx.fillText('光子hν', x, Math.min(y1, y2) - 0);
    } else {
      ctx.fillText('💫释放', x, Math.max(y1, y2) + 12);
      ctx.fillText('光子hν', x, Math.max(y1, y2) + 20);
    }
  }
}

/* ================================================================
   电子层分布图 SHELL DISTRIBUTION DIAGRAM
   Shows the 2-8-18-32 pattern: filled vs max capacity per shell
   ================================================================ */
function drawShellDistribution() {
  const canvas = document.getElementById('shellCanvas');
  if (!canvas) return;
  const dpr = Math.min(devicePixelRatio, 2);
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const W = rect.width, H = rect.height;
  ctx.clearRect(0, 0, W, H);

  const elem = ELEMENTS[currentElement];
  const shellCounts = getShellCounts();
  const numShells = Math.max(elem.shells.length, shellCounts.length, 1);
  const displayShells = Math.min(numShells, 4);

  // ── Title: element symbol ──
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 14px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`${elem.symbol} (Z=${elem.Z})`, W / 2, 18);

  // ── Total electrons ──
  const totalE = electronData.length;
  ctx.fillStyle = '#94a3b8';
  ctx.font = '9px Outfit';
  ctx.textAlign = 'center';
  ctx.fillText(`共 ${totalE} 个电子`, W / 2, 34);

  // ── Draw concentric semicircles ──
  const centerX = W / 2;
  const centerY = H - 28;
  const maxR = Math.min(W / 2 - 10, H - 60);
  const minR = 16;

  // Draw nucleus dot
  ctx.fillStyle = '#ff6b4a';
  ctx.beginPath();
  ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#04060d';
  ctx.font = 'bold 7px Outfit';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('+', centerX, centerY);

  // Shell colors
  const shellColors = ['#34d399', '#38bdf8', '#a78bfa', '#fbbf24'];

  for (let s = 0; s < displayShells; s++) {
    const r = minR + (s + 1) * ((maxR - minR) / (displayShells + 0.5));
    const count = s < shellCounts.length ? shellCounts[s] : 0;
    const max = SHELL_MAX[s];
    const color = shellColors[s];
    const isFull = count === max;

    // Draw semicircle arc
    ctx.strokeStyle = count > 0 ? color : 'rgba(100,116,139,0.25)';
    ctx.lineWidth = count > 0 ? 2 : 1;
    ctx.setLineDash(count > 0 ? [] : [3, 3]);
    ctx.beginPath();
    ctx.arc(centerX, centerY, r, Math.PI, 0);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw electron dots on the semicircle
    if (count > 0) {
      for (let d = 0; d < count; d++) {
        const angle = Math.PI + (d + 1) / (count + 1) * Math.PI;
        const dx = centerX + Math.cos(angle) * r;
        const dy = centerY + Math.sin(angle) * r;
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(dx, dy, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    // Shell label (left side)
    ctx.fillStyle = count > 0 ? color : '#475569';
    ctx.font = 'bold 9px Outfit, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(SHELL_NAMES[s], centerX - r - 4, centerY - 2);

    // Count label (right side): "2/8"
    ctx.textAlign = 'left';
    ctx.font = count > 0 ? 'bold 9px Outfit' : '9px Outfit';
    ctx.fillStyle = isFull ? '#34d399' : count > 0 ? '#e2e8f0' : '#475569';
    const countLabel = `${count}/${max}`;
    ctx.fillText(countLabel, centerX + r + 4, centerY - 2);

    // Full check mark
    if (isFull) {
      ctx.fillStyle = '#34d399';
      ctx.font = '8px Outfit';
      ctx.fillText('✓', centerX + r + 30, centerY - 2);
    }
  }

  // ── Rule label at bottom ──
  ctx.fillStyle = '#64748b';
  ctx.font = '8px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('每层最多 2n² 个电子', W / 2, H - 2);
}

/* ================================================================
   元素选择器 ELEMENT SELECTOR
   ================================================================ */
function buildElementButtons() {
  const row = document.getElementById('elemRow');
  row.innerHTML = '';
  for (const key of Object.keys(ELEMENTS)) {
    const btn = document.createElement('button');
    btn.className = 'elem-btn' + (key === currentElement ? ' active' : '');
    btn.textContent = key;
    btn.title = ELEMENTS[key].name;
    btn.addEventListener('click', () => {
      if (animating) return;
      buildAtom(key);
      buildElementButtons();
    });
    row.appendChild(btn);
  }
}

/* ================================================================
   事件绑定 EVENT BINDINGS
   ================================================================ */
document.getElementById('btnAbsorb').addEventListener('click', absorbEnergy);
document.getElementById('btnRelease').addEventListener('click', releaseEnergy);
document.getElementById('btnLoseE').addEventListener('click', loseElectron);
document.getElementById('btnGainE').addEventListener('click', gainElectron);
document.getElementById('btnReset').addEventListener('click', resetAtom);

document.getElementById('btnCompare').addEventListener('click', () => {
  document.getElementById('photonExplainer').classList.remove('show');
  document.getElementById('compPanel').classList.toggle('show');
});
document.getElementById('closeComp').addEventListener('click', () => {
  document.getElementById('compPanel').classList.remove('show');
});

document.getElementById('btnPhotonInfo').addEventListener('click', () => {
  document.getElementById('compPanel').classList.remove('show');
  document.getElementById('photonExplainer').classList.toggle('show');
});
document.getElementById('closePhotonInfo').addEventListener('click', () => {
  document.getElementById('photonExplainer').classList.remove('show');
});

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  drawEnergyDiagram();
  drawShellDistribution();
});

/* ================================================================
   启动 INIT
   ================================================================ */
buildElementButtons();
buildAtom('O');
animate();
