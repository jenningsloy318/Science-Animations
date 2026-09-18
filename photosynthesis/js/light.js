// ═══════════════════════════════════════════════════════
// light.js — ② 光反应：类囊体膜横截面（主角场景）
// 光子 → PSII/PSI 激发 → 电子沿 Z 链 → H⁺ 入腔 → ATP 合酶旋转 → ATP/NADPH/O₂
// 因果时钟：一个光子引发一个电子；PQ 驮 2e⁻；每 4e⁻ 走完 Kok 循环放 1 个 O₂
// ═══════════════════════════════════════════════════════
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { makeLabel, makeGlowDot } from './sprite.js';
import { KOK_STATES, H_PER_ATP } from './facts.js';

const C = {
  photon: 0xffd54a, electron: 0x7dd3fc, hplus: 0xff6b9d, o2: 0xf4f7fa,
  atp: 0xffa94d, nadph: 0xb197fc, water: 0x69b7ff, membrane: 0xc7a45a,
  psii: 0x3fae6a, psi: 0x2f8f5b, b6f: 0x8d6e63, fnr: 0x6d5bd0,
};

export function buildLight() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#060b12');
  const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.1, 300);
  camera.position.set(-1.5, 4.5, 26);

  scene.add(new THREE.AmbientLight('#42506a', 1.0));
  const key = new THREE.DirectionalLight('#fff2d8', 1.4);
  key.position.set(6, 14, 16); scene.add(key);

  const controls = new OrbitControls(camera, document.getElementById('gl'));
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.target.set(-0.5, 0.5, 0);

  // ── 腔 / 基质 背景 ──
  const lumenBg = new THREE.Mesh(new THREE.PlaneGeometry(70, 18),
    new THREE.MeshBasicMaterial({ color: '#0a1626', transparent: true, opacity: 0.85 }));
  lumenBg.position.set(0, -9.6, -1.5); scene.add(lumenBg);
  const lumenLabel = makeLabel('类囊体腔（H⁺ 在这里堆积 = 电池充电）', '#7db4d8');
  lumenLabel.position.set(-9.5, -6.2, 0); scene.add(lumenLabel);
  const stromaLabel = makeLabel('基质（合成循环在这里花 ATP/NADPH）', '#9fe0b0');
  stromaLabel.position.set(-10.5, 7.4, 0); scene.add(stromaLabel);

  // ── 类囊体膜（双层磷脂示意：两条金色层 + 中间疏水芯）──
  const membrane = new THREE.Group(); scene.add(membrane);
  const headMat = new THREE.MeshStandardMaterial({ color: C.membrane, roughness: 0.55, emissive: '#4a3a12', emissiveIntensity: 0.4 });
  for (const y of [0.42, -0.42]) {
    const layer = new THREE.Mesh(new THREE.BoxGeometry(64, 0.3, 1.6), headMat);
    layer.position.y = y; membrane.add(layer);
  }
  const core = new THREE.Mesh(new THREE.BoxGeometry(64, 0.5, 1.4),
    new THREE.MeshStandardMaterial({ color: '#6e5a28', roughness: 0.8 }));
  membrane.add(core);

  // ── 部件 ──
  function blob(x, w, h, color, y = 0) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(1, 26, 18),
      new THREE.MeshStandardMaterial({ color, roughness: 0.42, emissive: color, emissiveIntensity: 0.18 }));
    m.scale.set(w, h, 1.15); m.position.set(x, y, 0);
    scene.add(m); return m;
  }
  const psii = blob(-8.2, 2.1, 2.6, C.psii);
  const b6f = blob(0, 1.7, 2.2, C.b6f);
  const psi = blob(7.2, 1.9, 2.4, C.psi);
  const fnr = blob(11.2, 1.15, 1.15, C.fnr, 2.6);

  // PSII 天线（叶绿素小盘）
  for (let i = 0; i < 7; i++) {
    const a = makeGlowDot(0.16, 0x66d98f);
    const ang = Math.PI * (0.15 + 0.7 * i / 6);
    a.position.set(-8.2 + Math.cos(ang) * 2.35, Math.sin(ang) * 2.9, 0);
    scene.add(a);
  }
  // PSI 天线
  for (let i = 0; i < 6; i++) {
    const a = makeGlowDot(0.14, 0x66d98f);
    const ang = Math.PI * (0.12 + 0.76 * i / 5);
    a.position.set(7.2 + Math.cos(ang) * 2.1, Math.sin(ang) * 2.7, 0);
    scene.add(a);
  }

  // ── ATP 合酶（x=4.6：基质球 + 柄 + 腔内转子）──
  const atpX = 4.6;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.85, 22, 16),
    new THREE.MeshStandardMaterial({ color: 0xd88f3f, roughness: 0.4, emissive: '#7a4a10', emissiveIntensity: 0.35 }));
  knob.position.set(atpX, 1.7, 0); scene.add(knob);
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.35, 10),
    new THREE.MeshStandardMaterial({ color: 0xd88f3f }));
  stalk.position.set(atpX, 0.75, 0); scene.add(stalk);
  const rotor = new THREE.Group(); rotor.position.set(atpX, -0.62, 0); scene.add(rotor);
  for (let i = 0; i < 8; i++) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.5, 0.2),
      new THREE.MeshStandardMaterial({ color: 0xc98a45, roughness: 0.5 }));
    const a = i / 8 * Math.PI * 2;
    seg.position.set(Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42);
    seg.rotation.y = -a; rotor.add(seg);
  }
  const atpLabel = makeLabel('ATP 合酶', '#ffc078'); atpLabel.position.set(atpX, 3.15, 0); scene.add(atpLabel);

  // ── 部件标签 ──
  const labelsOn = { v: true };
  function partLabel(text, color, x, y) {
    const l = makeLabel(text, color); l.position.set(x, y, 0); scene.add(l); return l;
  }
  const lblPsii = partLabel('PSII · P680（分解水）', '#8af0ae', -8.2, 3.6);
  const lblB6f = partLabel('细胞色素 b6f（泵 H⁺）', '#d7b8a8', 0, 2.5);
  const lblPsi = partLabel('PSI · P700（再充能）', '#8af0ae', 7.2, 3.4);
  const lblFnr = partLabel('FNR → NADPH', '#cdb4ff', 11.2, 4.15);
  const labels = [lumenLabel, stromaLabel, atpLabel, lblPsii, lblB6f, lblPsi, lblFnr];

  // 点击说明
  const ray = new THREE.Raycaster();
  const clickable = [
    { mesh: psii, text: 'PSII（P680）：吸收光子后从水里夺电子——水被拆成 O₂ + H⁺ + e⁻。' },
    { mesh: b6f, text: '细胞色素 b6f：电子路过时把 H⁺ 从基质泵进类囊体腔（Q 循环）。' },
    { mesh: psi, text: 'PSI（P700）：第二个光子把电子再次推上高能级，用于造 NADPH。' },
    { mesh: fnr, text: 'FNR：2 个电子 + 1 个 H⁺ 把 NADP⁺ 还原成 NADPH——光反应的"满格电池"。' },
    { mesh: knob, text: 'ATP 合酶：腔内 H⁺ 顺浓度梯度涌出，转子每转一圈（14 个 H⁺）合成 3 个 ATP。' },
  ];
  const infoDiv = document.createElement('p');
  infoDiv.id = 'lightInfo';
  infoDiv.style.cssText = 'font-size:12px;color:#ffd54a;min-height:2.4em;border-top:1px dashed var(--line);padding-top:6px';
  infoDiv.textContent = '点击膜上的部件看说明 ↗';
  document.querySelector('[data-panel="light"]').appendChild(infoDiv);
  const canvasEl = document.getElementById('gl');
  canvasEl.addEventListener('pointerdown', (e) => {
    if (document.body.dataset.view !== 'light') return;
    const r = canvasEl.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    const hit = ray.intersectObjects(clickable.map(c => c.mesh), false)[0];
    if (hit) {
      const c = clickable.find(c => c.mesh === hit.object);
      infoDiv.textContent = '💡 ' + c.text;
    }
  });

  // ── 动画状态 ──
  const state = {
    paused: false, speed: 1, lightRate: 1, alt: 0,
    photons: [], electrons: [], hplus: [], o2: [], atps: [], nadphs: [], waters: [],
    psiQueue: 0, pqCharge: 0, kokIdx: 1, psiElectronCount: 0,
    lumenH: 8, rotorAngle: 0, atpFrac: 0,
    counts: { o2: 0, nadph: 0, atp: 0 },
    photonTimer: 0, waterTimer: 0,
  };

  // 电子路径（x 位置序列）
  const PATH_PSII = [-8.2, -7.2, -6.1, -3.2, -0.6];
  const PATH_PSI = [7.2, 9.3, 10.8, 12.3];

  function spawnPhoton(target) {
    const m = makeGlowDot(0.14, C.photon);
    m.position.set(target.x + (Math.random() - 0.5) * 1.6, 9.5 + Math.random() * 2, 0);
    scene.add(m);
    state.photons.push({ mesh: m, tx: target.x, ty: target.y, hit: false });
  }
  function spawnElectron(x, y, path, onArrive) {
    const m = makeGlowDot(0.15, C.electron);
    m.position.set(x, y, 0); scene.add(m);
    state.electrons.push({ mesh: m, path, seg: 0, onArrive });
  }
  function spawnH(x, y, vy, toLumen) {
    const m = makeGlowDot(0.11, C.hplus);
    m.position.set(x, y, 0); scene.add(m);
    state.hplus.push({ mesh: m, vy, toLumen });
  }

  // ── HUD ──
  const els = ['hO2', 'hNadph', 'hAtp', 'hKok'].map(id => document.getElementById(id));
  function refreshHUD() {
    els[0].textContent = state.counts.o2;
    els[1].textContent = state.counts.nadph;
    els[2].textContent = state.counts.atp;
    els[3].textContent = KOK_STATES[state.kokIdx] + (state.psiElectronCount % 4 ? `（+${state.psiElectronCount % 4} e⁻）` : '');
  }

  document.getElementById('bLightPause').addEventListener('click', e => {
    state.paused = !state.paused;
    e.target.textContent = state.paused ? '▶ 继续' : '⏸ 暂停';
    e.target.classList.toggle('on', state.paused);
  });
  document.getElementById('bLabels').addEventListener('click', e => {
    labelsOn.v = !labelsOn.v;
    e.target.classList.toggle('on', labelsOn.v);
    labels.forEach(l => l.visible = labelsOn.v);
  });
  document.getElementById('rLight').addEventListener('input', e => {
    state.lightRate = +e.target.value;
    document.getElementById('oLight').textContent = state.lightRate.toFixed(1) + '×';
  });
  document.getElementById('rSpeed').addEventListener('input', e => {
    state.speed = +e.target.value;
    document.getElementById('oSpeed').textContent = state.speed.toFixed(1) + '×';
  });

  // ── 更新 ──
  function update(dt0) {
    const dt = state.paused ? 0 : dt0 * state.speed;

    // 光子按光强生成（PSII/PSI 轮流——独立交替位，别用电子计数器奇偶）
    state.photonTimer += dt * state.lightRate;
    while (state.photonTimer > 0.55) {
      state.photonTimer -= 0.55;
      state.alt ^= 1;
      const toPSII = state.alt === 0;
      spawnPhoton(toPSII ? { x: -8.2, y: 1.4 } : { x: 7.2, y: 1.3 });
    }

    // 光子下落
    for (let i = state.photons.length - 1; i >= 0; i--) {
      const p = state.photons[i];
      const dx = p.tx - p.mesh.position.x, dy = p.ty - p.mesh.position.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.25) {
        scene.remove(p.mesh); state.photons.splice(i, 1);
        // 命中：产生电子（因果：一光子一电子）
        if (p.tx < 0) {
          spawnElectron(PATH_PSII[0], 1.2, PATH_PSII, (x) => {
            state.pqCharge++;
            spawnH(x + 0.4, 0.8, -2.0, true); // PQ 驮着的 H⁺ 沉入腔
            spawnH(0, 0.7, -2.4, true);      // b6f Q 循环泵送
            spawnH(-0.4, 0.6, -2.6, true);
            if (state.pqCharge >= 2) state.pqCharge = 0;
          });
          // PSII 每个电子推进 Kok 循环
          state.psiElectronCount++;
          state.kokIdx = 1 + (state.psiElectronCount % 4);
          if (state.psiElectronCount % 4 === 0) {
            // S4 → 放氧！2H₂O → O₂ + 4H⁺（入腔）
            state.kokIdx = 0;
            const bub = makeGlowDot(0.22, C.o2);
            bub.position.set(-8.2, -1.2, 0); scene.add(bub);
            state.o2.push({ mesh: bub, t: 0 });
            for (let k = 0; k < 4; k++) spawnH(-8.2 + (Math.random() - 0.5) * 1.2, -0.8, -2.2, true);
            state.counts.o2++;
          }
        } else {
          spawnElectron(PATH_PSI[0], 1.1, PATH_PSI, () => {
            state.psiQueue++;
            if (state.psiQueue >= 2) { // FNR：2e⁻ + H⁺ → NADPH
              state.psiQueue = 0;
              spawnH(11.2, 2.2, 1.5, false);
              const chip = makeGlowDot(0.24, C.nadph);
              chip.position.set(12.2, 2.6, 0); scene.add(chip);
              state.nadphs.push({ mesh: chip, t: 0 });
              state.counts.nadph++;
            }
          });
        }
        continue;
      }
      const v = 7.5;
      p.mesh.position.x += dx / d * v * dt;
      p.mesh.position.y += dy / d * v * dt;
    }

    // 电子沿路径移动
    for (let i = state.electrons.length - 1; i >= 0; i--) {
      const e = state.electrons[i];
      const target = new THREE.Vector3(e.path[e.seg], e.seg % 2 ? 0.55 : 0.15, 0);
      if (e.seg === e.path.length - 1) target.y = 0.9;
      const d = e.mesh.position.distanceTo(target);
      if (d < 0.22) {
        e.seg++;
        if (e.seg >= e.path.length) {
          scene.remove(e.mesh); state.electrons.splice(i, 1);
          e.onArrive?.(e.mesh.position.x);
          continue;
        }
        continue;
      }
      // PQ 段在膜内横移；其余段自由飞行
      e.mesh.position.lerp(target, Math.min(1, 3.2 * dt));
    }

    // H⁺ 移动：toLumen 向下进腔，然后累积
    for (let i = state.hplus.length - 1; i >= 0; i--) {
      const h = state.hplus[i];
      h.mesh.position.y += h.vy * dt;
      if (h.toLumen && h.mesh.position.y <= -1.15) {
        scene.remove(h.mesh); state.hplus.splice(i, 1);
        state.lumenH++;
        continue;
      }
      if (!h.toLumen && h.mesh.position.y > 2.4) {
        scene.remove(h.mesh); state.hplus.splice(i, 1);
      }
    }

    // ATP 合酶：腔内 H⁺ 涌出 → 转子 → ATP
    const atpFlow = state.lumenH > 4 ? 2.2 : 0.6;
    state.atpFrac += dt * atpFlow / H_PER_ATP;
    if (state.lumenH > 2 && Math.random() < dt * 3) {
      state.lumenH--;
      const m = makeGlowDot(0.11, C.hplus);
      m.position.set(atpX + (Math.random() - 0.5) * 0.3, -0.62, 0.42);
      scene.add(m);
      state.hplus.push({ mesh: m, vy: 1.8, toLumen: false, out: true });
    }
    state.rotorAngle += dt * atpFlow / 14 * Math.PI * 2;
    rotor.rotation.y = state.rotorAngle;
    if (state.atpFrac >= 1) {
      state.atpFrac -= 1;
      const chip = makeGlowDot(0.2, C.atp);
      chip.position.set(atpX + 1.3, 2.4, 0); scene.add(chip);
      state.atps.push({ mesh: chip, t: 0 });
      state.counts.atp++;
    }
    // 离开的 H⁺ 向上飘出
    for (const h of state.hplus) if (h.out) h.mesh.position.y += h.vy * dt;

    // O₂ 气泡升出
    for (let i = state.o2.length - 1; i >= 0; i--) {
      const o = state.o2[i];
      o.t += dt;
      o.mesh.position.y += dt * 1.6;
      o.mesh.position.x -= dt * 0.8;
      if (o.t > 2.6) { scene.remove(o.mesh); state.o2.splice(i, 1); }
    }
    // NADPH / ATP 淡出
    for (const arr of [state.nadphs, state.atps]) {
      for (let i = arr.length - 1; i >= 0; i--) {
        arr[i].t += dt;
        arr[i].mesh.position.y += dt * 0.7;
        if (arr[i].t > 2) { scene.remove(arr[i].mesh); arr.splice(i, 1); }
      }
    }

    // 水滴持续补给 PSII
    state.waterTimer += dt;
    if (state.waterTimer > 1.1) {
      state.waterTimer = 0;
      const w = makeGlowDot(0.12, C.water);
      w.position.set(-9.3 + Math.random() * 1.2, -2.4, 0);
      scene.add(w);
      state.waters.push({ mesh: w, t: 0 });
    }
    for (let i = state.waters.length - 1; i >= 0; i--) {
      const w = state.waters[i];
      w.t += dt;
      w.mesh.position.y += dt * 1.2;
      w.mesh.position.x += dt * 0.5;
      if (w.t > 1) { scene.remove(w.mesh); state.waters.splice(i, 1); }
    }

    controls.update();
  }

  return {
    scene, camera, update, refreshHUD,
    getInfo() { return { ...state.counts, kok: KOK_STATES[state.kokIdx], lumenH: state.lumenH }; },
  };
}
