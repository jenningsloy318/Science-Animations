// ═══════════════════════════════════════════════════════
// chloroplast.js — ① 叶子里：叶片横切 → 叶肉细胞 → 叶绿体
// 三级放大，相机在三个独立子场景之间飞行
// ═══════════════════════════════════════════════════════
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { makeLabel, makeSphere } from './sprite.js';

const STAGE_NAMES = ['叶片横切', '叶肉细胞', '叶绿体'];

export function buildLeaf() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#060b12');
  scene.fog = new THREE.Fog('#060b12', 60, 260);
  const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.1, 600);

  scene.add(new THREE.AmbientLight('#3d4a5c', 0.9));
  const key = new THREE.DirectionalLight('#fff6e0', 1.5);
  key.position.set(20, 30, 18);
  scene.add(key);
  const rim = new THREE.DirectionalLight('#7dd3fc', 0.5);
  rim.position.set(-16, 8, -14);
  scene.add(rim);

  const controls = new OrbitControls(camera, document.getElementById('gl'));
  controls.enableDamping = true; controls.dampingFactor = 0.08;

  // ── 子场景 A（x=0）：叶片横切 ──
  const leaf = new THREE.Group(); scene.add(leaf);
  {
    // 上表皮 / 栅栏组织 / 海绵组织 / 下表皮
    const skin = new THREE.MeshStandardMaterial({ color: '#3f7a4f', roughness: 0.7 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(34, 1.1, 18), skin);
    top.position.y = 3.2; leaf.add(top);
    const bot = new THREE.Mesh(new THREE.BoxGeometry(34, 1.1, 18), skin);
    bot.position.y = -3.2; leaf.add(bot);
    // 栅栏组织：排列紧密的竖长细胞
    const pal = new THREE.MeshStandardMaterial({ color: '#57b06b', roughness: 0.55 });
    for (let i = 0; i < 9; i++) {
      const cell = new THREE.Mesh(new THREE.BoxGeometry(2.9, 4.6, 16.5), pal);
      cell.position.set(-14 + i * 3.5, 0.15, 0);
      leaf.add(cell);
    }
    // 海绵组织：松散圆球
    const spongy = new THREE.MeshStandardMaterial({ color: '#7cc98a', roughness: 0.6, transparent: true, opacity: 0.92 });
    for (let i = 0; i < 26; i++) {
      const s = makeSphere(1.15 + Math.random() * 0.5, 0x7cc98a, { rough: 0.7 });
      s.material = spongy;
      s.position.set(-15 + Math.random() * 30, -1.35 + (Math.random() - 0.5) * 1.4, -7 + Math.random() * 14);
      leaf.add(s);
    }
    // 气孔（下表皮小口）
    for (let i = 0; i < 5; i++) {
      const st = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 0.8, 4, 8),
        new THREE.MeshStandardMaterial({ color: '#2c5c3a' }));
      st.position.set(-12 + i * 6, -3.3, 0);
      leaf.add(st);
    }
    const l1 = makeLabel('叶片横切 · 阳光从这里进入', '#9ff0b5');
    l1.position.set(0, 7.5, 0); leaf.add(l1);
    const l2 = makeLabel('栅栏细胞 = 太阳能车间', '#d6ffe2');
    l2.position.set(-10.5, 0.2, 9.5); leaf.add(l2);
  }

  // ── 子场景 B（x=400）：一个叶肉细胞 + 叶绿体 ──
  const cell = new THREE.Group(); cell.position.x = 400; scene.add(cell);
  {
    const wall = new THREE.Mesh(
      new THREE.SphereGeometry(11, 40, 28),
      new THREE.MeshStandardMaterial({ color: '#8fd69b', roughness: 0.5, transparent: true, opacity: 0.16 }));
    cell.add(wall);
    // 细胞核
    const nucleus = makeSphere(2.6, 0xc9a0dc, { rough: 0.4 });
    nucleus.position.set(-5.2, 2.4, 2.5); cell.add(nucleus);
    // 液泡
    const vac = makeSphere(3.6, 0x9ed9f2, { rough: 0.3, opacity: 0.5 });
    vac.material = new THREE.MeshStandardMaterial({ color: 0x9ed9f2, transparent: true, opacity: 0.45, roughness: 0.25 });
    vac.position.set(4.6, 3.4, -2); cell.add(vac);
    // 12 个叶绿体（透镜形：压扁的球）
    const chlMat = new THREE.MeshStandardMaterial({ color: '#3fae6a', roughness: 0.45, emissive: '#0d3018', emissiveIntensity: 0.6 });
    const chlGeo = new THREE.SphereGeometry(1.55, 26, 18);
    const spots = [[-3,-2,3],[0,-3.4,-2],[3.4,-1.6,2.6],[-4.6,0.2,-1.5],[1.6,1.2,3.8],[5.2,-2.4,1.8],[-1,-1,4.2],[2.8,2.6,-3.4],[-5.8,-2.8,-0.5],[0.4,-0.4,-4.6],[4,-0.2,-3.8],[-2.6,3.2,1.2]];
    const chloroplasts = [];
    spots.forEach((p, i) => {
      const ch = new THREE.Mesh(chlGeo, chlMat);
      ch.scale.set(1.35, 0.62, 1);
      ch.position.set(...p);
      ch.rotation.y = i * 0.7;
      cell.add(ch); chloroplasts.push(ch);
    });
    const l1 = makeLabel('一个叶肉细胞', '#9ff0b5'); l1.position.set(0, 13.6, 0); cell.add(l1);
    const l2 = makeLabel('绿色颗粒 = 叶绿体（每细胞 20–100 个）', '#d6ffe2'); l2.position.set(0, -7.6, 6); cell.add(l2);
  }

  // ── 子场景 C（x=800）：一个大叶绿体剖开 ──
  const big = new THREE.Group(); big.position.x = 800; scene.add(big);
  {
    // 外壳（剖开的透镜壳）
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(13, 44, 30),
      new THREE.MeshStandardMaterial({ color: '#4cbf78', roughness: 0.4, transparent: true, opacity: 0.18 }));
    shell.scale.set(1.5, 0.72, 1);
    big.add(shell);
    // 基质
    const stroma = new THREE.Mesh(
      new THREE.SphereGeometry(12.2, 40, 26),
      new THREE.MeshStandardMaterial({ color: '#1c5c38', roughness: 0.85, transparent: true, opacity: 0.55 }));
    stroma.scale.set(1.48, 0.7, 0.98);
    big.add(stroma);
    // 基粒：基粒类囊体垛（一摞扁圆盘）
    const discMatA = new THREE.MeshStandardMaterial({ color: '#2e8b57', roughness: 0.4, emissive: '#0a2e18', emissiveIntensity: 0.5 });
    const discMatB = new THREE.MeshStandardMaterial({ color: '#39a367', roughness: 0.4, emissive: '#0a2e18', emissiveIntensity: 0.4 });
    const granaSpots = [[-6,1.2],[ -2.5,-1.6],[1.8,1.8],[5.6,-0.9],[-1,3.4],[3.4,3.2],[-6.4,-2.2]];
    granaSpots.forEach(([gx, gy], gi) => {
      const pile = new THREE.Group();
      const n = 7;
      for (let i = 0; i < n; i++) {
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 0.32, 26), gi % 2 ? discMatB : discMatA);
        disc.position.y = i * 0.46 - (n - 1) * 0.23;
        pile.add(disc);
      }
      pile.position.set(gx, gy, 0);
      pile.rotation.z = (Math.random() - 0.5) * 0.24;
      big.add(pile);
    });
    // 基质类囊体：连接片
    const lam = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.22, 1.5), discMatB);
    lam.position.set(0.4, 2.6, 0); lam.rotation.z = 0.12; big.add(lam);
    const lam2 = lam.clone(); lam2.position.set(-3.6, -0.4, 0); lam2.rotation.z = -0.1; big.add(lam2);

    const l1 = makeLabel('叶绿体（剖开）', '#9ff0b5'); l1.position.set(0, 11.4, 0); big.add(l1);
    const l2 = makeLabel('基粒 = 一摞摞类囊体（光反应②在这层膜上）', '#ffd54a');
    l2.position.set(0, -8.4, 5); big.add(l2);
    const l3 = makeLabel('周围液体 = 基质（合成循环③在这）', '#7dd3fc');
    l3.position.set(0, -11, 5); big.add(l3);
  }

  // ── 阶段与相机 ──
  const STAGES = [
    { cam: new THREE.Vector3(10, 8, 30), target: new THREE.Vector3(0, 0, 0) },
    { cam: new THREE.Vector3(400 + 8, 6, 26), target: new THREE.Vector3(400, 0, 0) },
    { cam: new THREE.Vector3(800 + 10, 6.5, 33), target: new THREE.Vector3(800, 0.5, 0) },
  ];
  const state = { stage: 0, t: 1, from: 0 };
  function applyStage(s) {
    state.stage = s;
    document.getElementById('oLeaf').textContent = STAGE_NAMES[s];
    document.getElementById('leafStage').textContent = `第 ${s + 1} / 3 级 · ${STAGE_NAMES[s]}`;
  }
  function gotoStage(s) {
    s = Math.max(0, Math.min(2, s));
    if (s === state.stage && state.t >= 1) return;
    state.from = state.stage; state.stage = s; state.t = 0;
    applyStage(s);
  }

  document.getElementById('bLeafPrev').addEventListener('click', () => gotoStage(state.stage - 1));
  document.getElementById('bLeafNext').addEventListener('click', () => gotoStage(state.stage + 1));
  document.getElementById('rLeaf').addEventListener('input', e => gotoStage(+e.target.value));

  camera.position.copy(STAGES[0].cam);
  controls.target.copy(STAGES[0].target);
  applyStage(0);

  return {
    scene, camera,
    update(dt) {
      if (state.t < 1) {
        state.t = Math.min(1, state.t + dt * 0.9);
        const k = state.t < 0.5 ? 2 * state.t * state.t : 1 - Math.pow(-2 * state.t + 2, 2) / 2; // easeInOut
        camera.position.lerpVectors(STAGES[state.from].cam, STAGES[state.stage].cam, k);
        controls.target.lerpVectors(STAGES[state.from].target, STAGES[state.stage].target, k);
      }
      // 轻微呼吸感：叶绿体悬浮
      big.children.forEach((o, i) => { if (o.geometry?.type === 'CylinderGeometry') o.rotation.z += Math.sin(performance.now() / 2400 + i) * 0.0002; });
      controls.update();
    },
    getInfo() { return { stage: state.stage, name: STAGE_NAMES[state.stage] }; },
  };
}
