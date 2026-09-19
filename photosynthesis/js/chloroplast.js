// ═══════════════════════════════════════════════════════
// chloroplast.js — ① 叶子里（一页同屏版）
// 叶片横切 →(放大镜)→ 叶肉细胞 →(放大镜)→ 叶绿体
// 三个视图并排、放大锥连线，包含关系一眼看懂；
// 自动导览只是把相机飞近每一级，任何东西都不隐藏。
// ═══════════════════════════════════════════════════════
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { makeLabel, makeSphere } from './sprite.js';

export function buildLeaf() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#060b12');
  scene.fog = new THREE.Fog('#060b12', 90, 320);
  const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.1, 700);

  scene.add(new THREE.AmbientLight('#46536a', 1.05));
  const key = new THREE.DirectionalLight('#fff6e0', 1.5);
  key.position.set(20, 34, 24); scene.add(key);
  const rim = new THREE.DirectionalLight('#7dd3fc', 0.5);
  rim.position.set(-18, 8, -16); scene.add(rim);

  const controls = new OrbitControls(camera, document.getElementById('gl'));
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  // 本视图跨度大、相机远：所有标签按远景尺寸放大，再在每帧按相机距离补偿（屏幕大小恒定）
  const allLabels = [];
  const bigLabel = (l) => { l.scale.multiplyScalar(4.2); l.userData.base = l.scale.clone(); allLabels.push(l); return l; };

  // ═══ 面板 A：叶片横切（x=-30，整体缩小到 0.45）═══
  const leaf = new THREE.Group();
  leaf.position.set(-34, 0, 0); leaf.scale.setScalar(0.45);
  scene.add(leaf);
  let highlightCellLocal = new THREE.Vector3(0, 0.15, 0);
  {
    const skin = new THREE.MeshStandardMaterial({ color: '#3f7a4f', roughness: 0.7 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(34, 1.1, 18), skin);
    top.position.y = 3.2; leaf.add(top);
    const bot = new THREE.Mesh(new THREE.BoxGeometry(34, 1.1, 18), skin);
    bot.position.y = -3.2; leaf.add(bot);
    const pal = new THREE.MeshStandardMaterial({ color: '#57b06b', roughness: 0.55 });
    for (let i = 0; i < 9; i++) {
      const cell = new THREE.Mesh(new THREE.BoxGeometry(2.9, 4.6, 16.5), pal);
      cell.position.set(-14 + i * 3.5, 0.15, 0);
      leaf.add(cell);
    }
    const spongyMat = new THREE.MeshStandardMaterial({ color: 0x7cc98a, roughness: 0.7, transparent: true, opacity: 0.92 });
    for (let i = 0; i < 26; i++) {
      const s = makeSphere(1.15 + Math.random() * 0.5, 0x7cc98a, { rough: 0.7 });
      s.material = spongyMat;
      s.position.set(-15 + Math.random() * 30, -1.35 + (Math.random() - 0.5) * 1.4, -7 + Math.random() * 14);
      leaf.add(s);
    }
    for (let i = 0; i < 5; i++) {
      const st = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 0.8, 4, 8),
        new THREE.MeshStandardMaterial({ color: '#2c5c3a' }));
      st.position.set(-12 + i * 6, -3.3, 0);
      leaf.add(st);
    }
    const l = bigLabel(makeLabel('① 这是一片叶子（横切面）', '#9ff0b5'));
    l.position.set(0, 8.4, 0); leaf.add(l);
    const sun = bigLabel(makeLabel('☀ 阳光从这里进来', '#ffd54a'));
    sun.position.set(6, 6.2, 0); leaf.add(sun);
  }

  // 高亮圈：被选中的栅栏细胞
  const HL_A = new THREE.Vector3(0, 0.15, 0);           // leaf 局部坐标
  const ringA = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.14, 10, 40),
    new THREE.MeshBasicMaterial({ color: 0xffd54a }));
  ringA.position.copy(HL_A); leaf.add(ringA);

  // ═══ 面板 B：一个叶肉细胞（x=0，缩放 0.9）═══
  const cell = new THREE.Group();
  cell.position.x = -6; cell.scale.setScalar(0.9);
  scene.add(cell);
  const HL_B = new THREE.Vector3(-4.6, 0.2, -1.5);      // cell 局部坐标（选中的叶绿体）
  {
    const wall = new THREE.Mesh(
      new THREE.SphereGeometry(11, 40, 28),
      new THREE.MeshStandardMaterial({ color: '#8fd69b', roughness: 0.5, transparent: true, opacity: 0.16 }));
    cell.add(wall);
    const nucleus = makeSphere(2.6, 0xc9a0dc, { rough: 0.4 });
    nucleus.position.set(-5.2, 2.4, 2.5); cell.add(nucleus);
    const vac = new THREE.Mesh(new THREE.SphereGeometry(3.6, 26, 18),
      new THREE.MeshStandardMaterial({ color: 0x9ed9f2, transparent: true, opacity: 0.45, roughness: 0.25 }));
    vac.position.set(4.6, 3.4, -2); cell.add(vac);
    const chlMat = new THREE.MeshStandardMaterial({ color: '#3fae6a', roughness: 0.45, emissive: '#0d3018', emissiveIntensity: 0.6 });
    const chlGeo = new THREE.SphereGeometry(1.55, 26, 18);
    const spots = [[-3, -2, 3], [0, -3.4, -2], [3.4, -1.6, 2.6], [-4.6, 0.2, -1.5], [1.6, 1.2, 3.8], [5.2, -2.4, 1.8], [-1, -1, 4.2], [2.8, 2.6, -3.4], [-5.8, -2.8, -0.5], [0.4, -0.4, -4.6], [4, -0.2, -3.8], [-2.6, 3.2, 1.2]];
    spots.forEach((p, i) => {
      const ch = new THREE.Mesh(chlGeo, chlMat);
      ch.scale.set(1.35, 0.62, 1);
      ch.position.set(...p);
      ch.rotation.y = i * 0.7;
      cell.add(ch);
    });
    const l = bigLabel(makeLabel('② 放大其中一个细胞', '#9ff0b5')); l.position.set(0, 13.8, 0); cell.add(l);
    const l2 = bigLabel(makeLabel('绿色豆豆 = 叶绿体', '#d6ffe2')); l2.position.set(0, -8, 6); cell.add(l2);
  }
  const ringB = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.13, 10, 40),
    new THREE.MeshBasicMaterial({ color: 0xffd54a }));
  ringB.position.copy(HL_B); ringB.rotation.y = 0.7 * 3; cell.add(ringB);

  // ═══ 面板 C：叶绿体剖开（x=32，缩放 0.62）═══
  const big = new THREE.Group();
  big.position.set(19.5, 0, 0); big.scale.setScalar(0.52);
  scene.add(big);
  {
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(13, 44, 30),
      new THREE.MeshStandardMaterial({ color: '#4cbf78', roughness: 0.4, transparent: true, opacity: 0.18 }));
    shell.scale.set(1.5, 0.72, 1);
    big.add(shell);
    const stroma = new THREE.Mesh(
      new THREE.SphereGeometry(12.2, 40, 26),
      new THREE.MeshStandardMaterial({ color: '#1c5c38', roughness: 0.85, transparent: true, opacity: 0.55 }));
    stroma.scale.set(1.48, 0.7, 0.98);
    big.add(stroma);
    const discMatA = new THREE.MeshStandardMaterial({ color: '#2e8b57', roughness: 0.4, emissive: '#0a2e18', emissiveIntensity: 0.5 });
    const discMatB = new THREE.MeshStandardMaterial({ color: '#39a367', roughness: 0.4, emissive: '#0a2e18', emissiveIntensity: 0.4 });
    const granaSpots = [[-6, 1.2], [-2.5, -1.6], [1.8, 1.8], [5.6, -0.9], [-1, 3.4], [3.4, 3.2], [-6.4, -2.2]];
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
    const lam = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.22, 1.5), discMatB);
    lam.position.set(0.4, 2.6, 0); lam.rotation.z = 0.12; big.add(lam);
    const lam2 = lam.clone(); lam2.position.set(-3.6, -0.4, 0); lam2.rotation.z = -0.1; big.add(lam2);

    const l = bigLabel(makeLabel('③ 再放大：叶绿体（剖开）', '#9ff0b5')); l.position.set(0, 12.2, 0); big.add(l);
    const l2 = bigLabel(makeLabel('硬币堆 = 基粒（光反应②在这层膜上）', '#ffd54a'));
    l2.position.set(0, -9.2, 5); big.add(l2);
    const l3 = bigLabel(makeLabel('周围液体 = 基质（合成循环③在这）', '#7dd3fc'));
    l3.position.set(0, -12, 5); big.add(l3);
  }

  // ═══ 放大镜锥（漫画 callout：从高亮圈张到下一面板）═══
  function zoomWedge(fromWorld, ringR, toPanelX, halfH, label) {
    const a1 = new THREE.Vector2(fromWorld.x - ringR * 0.75, fromWorld.y + ringR * 0.9);
    const a2 = new THREE.Vector2(fromWorld.x - ringR * 0.75, fromWorld.y - ringR * 0.9);
    const b1 = new THREE.Vector2(toPanelX, fromWorld.y + halfH);
    const b2 = new THREE.Vector2(toPanelX, fromWorld.y - halfH);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(
      [a1.x, a1.y, 0, a2.x, a2.y, 0, b1.x, b1.y, 0, a2.x, a2.y, 0, b2.x, b2.y, 0, b1.x, b1.y, 0], 3));
    g.computeVertexNormals();
    const cone = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
      color: 0xffd54a, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false }));
    cone.renderOrder = 1; scene.add(cone);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffd54a, transparent: true, opacity: 0.55 });
    [[a1, b1], [a2, b2]].forEach(([p, q]) => {
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(
        [new THREE.Vector3(p.x, p.y, 0), new THREE.Vector3(q.x, q.y, 0)]), lineMat);
      scene.add(line);
    });
    const l = bigLabel(makeLabel(label, '#ffd54a')); l.scale.multiplyScalar(0.8);
    l.position.set((fromWorld.x + toPanelX) / 2, fromWorld.y + halfH + 1.4, 0);
    scene.add(l);
  }
  // A 的世界坐标：leaf 组缩放 0.45；cell 组缩放 0.9
  const hlAWorld = HL_A.clone().multiplyScalar(0.45).add(leaf.position);
  const hlBWorld = HL_B.clone().multiplyScalar(0.9).add(new THREE.Vector3(cell.position.x, 0, 0));
  zoomWedge(hlAWorld, 2.1 * 0.45, cell.position.x - 11.5, 10.4, '放大 →');
  zoomWedge(hlBWorld, 1.9 * 0.9, big.position.x - 10.6, 7.6, '再放大 →');

  // ═══ 相机 & 导览 ═══
  const HOME = { cam: new THREE.Vector3(6.7, 3, 70), target: new THREE.Vector3(6.7, 0, 0) };
  const TOUR = [
    { cam: new THREE.Vector3(-34, 1.5, 16), target: new THREE.Vector3(-34, 0, 0), name: '① 叶片横切' },
    { cam: new THREE.Vector3(-6, 1.5, 16), target: new THREE.Vector3(-6, 0, 0), name: '② 叶肉细胞' },
    { cam: new THREE.Vector3(19.5, 2, 15), target: new THREE.Vector3(19.5, 0.5, 0), name: '③ 叶绿体' },
  ];
  camera.position.copy(HOME.cam);
  controls.target.copy(HOME.target);

  const state = { tour: -1, t: 0, paused: false };   // -1=全景; 0..2=飞往/停留在第 N 站
  function flyTo(cam, target, dt, speed = 1.1) {
    camera.position.lerp(cam, Math.min(1, dt * 2.2 * speed));
    controls.target.lerp(target, Math.min(1, dt * 2.2 * speed));
  }
  document.getElementById('bLeafTour').addEventListener('click', e => {
    if (state.tour >= 0) { state.tour = -1; setPaused(false); e.target.textContent = '🎬 自动导览'; e.target.classList.remove('on'); controls.enabled = true; flyTo(HOME.cam, HOME.target, 0.999); }
    else { setPaused(false); state.tour = 0; state.t = 0; e.target.textContent = '⏹ 停止导览'; e.target.classList.add('on'); controls.enabled = false; }
  });
  function setPaused(v) {
    state.paused = v;
    const b = document.getElementById('bLeafPause');
    b.textContent = v ? '▶ 继续' : '⏸ 暂停';
    b.classList.toggle('on', v);
  }
  document.getElementById('bLeafPause').addEventListener('click', () => setPaused(!state.paused));

  document.getElementById('bLeafHome').addEventListener('click', () => {
    setPaused(false);
    state.tour = -1;
    const b = document.getElementById('bLeafTour');
    b.textContent = '🎬 自动导览'; b.classList.remove('on'); controls.enabled = true;
  });

  const tourHold = 1.6;
  const _wp = new THREE.Vector3();
  function update(dt) {
    if (state.paused) { controls.update(); return; }
    // 标签尺寸随相机距离补偿：d≈70（全景）时为基准尺寸
    for (const l of allLabels) {
      l.getWorldPosition(_wp);
      const d = camera.position.distanceTo(_wp);
      l.scale.copy(l.userData.base).multiplyScalar(THREE.MathUtils.clamp(d / 70, 0.16, 1.25));
    }
    // 高亮圈呼吸
    const pulse = 1 + Math.sin(performance.now() / 420) * 0.06;
    ringA.scale.setScalar(pulse); ringB.scale.setScalar(pulse);

    if (state.tour >= 0) {
      const w = TOUR[state.tour];
      flyTo(w.cam, w.target, dt, 1.6);
      state.t += dt;
      if (state.t > tourHold) { state.t = 0; state.tour = (state.tour + 1) % 3; }
    } else {
      // 缓慢回到全景
      flyTo(HOME.cam, HOME.target, dt, 0.7);
    }
    controls.update();
  }

  return {
    scene, camera, update,
    getInfo() { return { tour: state.tour, name: state.tour >= 0 ? TOUR[state.tour].name : '全景' }; },
  };
}
