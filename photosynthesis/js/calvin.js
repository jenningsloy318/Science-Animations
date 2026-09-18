// ═══════════════════════════════════════════════════════
// calvin.js — ③ 合成循环（卡尔文循环）
// 圆环赛道 + 三站：固定(RuBisCO) → 还原(花 ATP/NADPH) → 再生
// 每 3 圈净得 1 个 G3P；6 个 G3P = 1 个葡萄糖
// ═══════════════════════════════════════════════════════
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { makeLabel, makeGlowDot } from './sprite.js';
import { CALVIN } from './facts.js';

const R = 5.2;
const STATIONS = [
  { ang: Math.PI / 2, name: '① 固定', sub: 'RuBisCO 抓住 CO₂', color: 0x4ade80 },
  { ang: Math.PI / 2 - 2 * Math.PI / 3, name: '② 还原', sub: '花 3 ATP + 2 NADPH', color: 0xb197fc },
  { ang: Math.PI / 2 + 2 * Math.PI / 3, name: '③ 再生', sub: 'RuBP 回位（花 1 ATP）', color: 0x7dd3fc },
];

export function buildCalvin() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#060b12');
  scene.fog = new THREE.Fog('#060b12', 40, 90);
  const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.1, 200);
  camera.position.set(-2, 7.5, 15.5);

  scene.add(new THREE.AmbientLight('#42506a', 1.0));
  const key = new THREE.DirectionalLight('#fff2d8', 1.4);
  key.position.set(6, 12, 14); scene.add(key);

  const controls = new OrbitControls(camera, document.getElementById('gl'));
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.target.set(0, 0, 0);

  // 赛道环
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(R, 0.16, 12, 90),
    new THREE.MeshStandardMaterial({ color: '#2a4a38', roughness: 0.5, emissive: '#0c2417', emissiveIntensity: 0.7 }));
  scene.add(ring);

  // 三站
  STATIONS.forEach(s => {
    s.pos = new THREE.Vector3(Math.cos(s.ang) * R, Math.sin(s.ang) * R, 0);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.24, 26),
      new THREE.MeshStandardMaterial({ color: s.color, roughness: 0.4, transparent: true, opacity: 0.28, emissive: s.color, emissiveIntensity: 0.25 }));
    pad.position.copy(s.pos); scene.add(pad);
    const l = makeLabel(`${s.name} · ${s.sub}`, '#eaf4ec'); l.position.copy(s.pos).add(new THREE.Vector3(0, 1.7, 0));
    scene.add(l);
  });
  // RuBisCO 核（固定站中心的小球）
  const rubisco = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const b = makeGlowDot(0.34, 0x8af0ae);
    const a = i / 8 * Math.PI * 2;
    b.position.set(Math.cos(a) * 0.45, Math.sin(a) * 0.45, 0);
    rubisco.add(b);
  }
  rubisco.position.set(Math.cos(Math.PI / 2) * R, Math.sin(Math.PI / 2) * R, 0);
  scene.add(rubisco);
  const rubLabel = makeLabel('RuBisCO', '#8af0ae');
  rubLabel.position.copy(rubisco.position).add(new THREE.Vector3(0, 0.85, 0)); scene.add(rubLabel);

  // 中央糖堆
  const sugar = new THREE.Group(); scene.add(sugar);
  const sugarLabel = makeLabel('葡萄糖装配区（6 G3P = 1 糖）', '#ffd54a');
  sugarLabel.position.set(0, 0.9, 0); scene.add(sugarLabel);

  // 来自光反应的电池补给台
  const battery = new THREE.Group(); battery.position.set(-9.5, -3.2, 0); scene.add(battery);
  const batLabel = makeLabel('← 光反应送来的 ATP / NADPH', '#b197fc');
  batLabel.position.set(0, 1.4, 0); battery.add(batLabel);

  const state = {
    paused: false, speed: 1,
    turns: 0, co2: 0, g3p: 0, glucose: 0,
    phase: 'idle', t: 0,
    movers: [],
  };
  // turn 阶段：arrive(固定 0.8s) → fix(0.5) → toReduce(1.0) → reduce(0.7) → g3p(0.6) → exit/regen(1.0)
  const DUR = { arrive: 0.8, fix: 0.5, toReduce: 1.0, reduce: 0.7, g3p: 0.6, after: 1.0 };

  function chipMesh(color, r = 0.26) { return makeGlowDot(r, color); }

  function startTurn() {
    state.phase = 'arrive'; state.t = 0; state.turns++;
    // CO₂ 从右上方飞入
    const co2 = chipMesh(0xcfd8e3, 0.24);
    co2.position.set(8.5, 7.5, 0); scene.add(co2);
    state.movers.push({ mesh: co2, phase: 'arrive', t: 0 });
  }

  function ringPoint(ang) { return new THREE.Vector3(Math.cos(ang) * R, Math.sin(ang) * R, 0); }
  const A_FIX = STATIONS[0].ang, A_RED = STATIONS[1].ang, A_REG = STATIONS[2].ang;

  function update(dt0) {
    if (state.paused) { controls.update(); return; }
    const dt = dt0 * state.speed;
    state.t += dt;

    if (state.phase !== 'idle' && state.t > DUR[state.phase]) {
      // 阶段推进
      switch (state.phase) {
        case 'arrive': state.phase = 'fix'; break;
        case 'fix': state.phase = 'toReduce'; break;
        case 'toReduce': state.phase = 'reduce'; break;
        case 'reduce': state.phase = 'g3p'; break;
        case 'g3p': state.phase = 'after'; break;
        case 'after': startTurn(); break;
      }
      state.t = 0;
    }

    // 阶段特效
    if (state.phase === 'fix' && state.t < dt * 1.5 && rubisco) {
      rubisco.scale.setScalar(1.25);
    } else if (rubisco) rubisco.scale.setScalar(THREE.MathUtils.lerp(rubisco.scale.x, 1, dt * 4));

    // 电池补给视觉：还原阶段把 ATP/NADPH 小点送进②站
    if (state.phase === 'reduce' && state.t < dt * 1.5) {
      for (let i = 0; i < 2; i++) {
        const b = chipMesh(0xb197fc, 0.18);
        b.position.set(-9, -2.6 + i * 0.5, 0); scene.add(b);
        state.movers.push({ mesh: b, phase: 'battery', t: 0, target: STATIONS[1].pos.clone() });
      }
      for (let i = 0; i < 3; i++) {
        const b = chipMesh(0xffa94d, 0.18);
        b.position.set(-9.6, -3.6 + i * 0.4, 0); scene.add(b);
        state.movers.push({ mesh: b, phase: 'battery', t: 0, target: STATIONS[1].pos.clone().add(new THREE.Vector3(0.5, 0, 0)) });
      }
    }

    // 移动体
    for (let i = state.movers.length - 1; i >= 0; i--) {
      const m = state.movers[i];
      m.t += dt;
      const k = Math.min(1, m.t / 0.9);
      switch (m.phase) {
        case 'arrive': m.mesh.position.lerp(new THREE.Vector3(Math.cos(A_FIX) * R, Math.sin(A_FIX) * R + 0.5, 0), dt * 3.2); break;
        case 'fixPga': {
          // 两个 3PGA 沿环滑向②站
          const ang = THREE.MathUtils.lerp(m.fromAng, A_RED, k);
          m.mesh.position.copy(ringPoint(ang)).add(new THREE.Vector3(0, m.lane, 0));
          break;
        }
        case 'battery': m.mesh.position.lerp(m.target, dt * 2.6); break;
        case 'regen': {
          const ang = THREE.MathUtils.lerp(A_RED, A_REG + Math.PI * 2 * k, k);
          m.mesh.position.copy(ringPoint(A_RED + (A_REG + Math.PI * 2 - A_RED) * k)).add(new THREE.Vector3(0, 0.45, 0));
          break;
        }
        case 'exit': m.mesh.position.lerp(new THREE.Vector3(0, 0, 0), dt * 2.4); break;
      }

      // 电池到站消失
      if (m.phase === 'battery' && m.mesh.position.distanceTo(m.target) < 0.3) {
        scene.remove(m.mesh); state.movers.splice(i, 1); continue;
      }
      // 出厂糖到中央
      if (m.phase === 'exit' && m.mesh.position.length() < 0.6) {
        scene.remove(m.mesh); state.movers.splice(i, 1);
        const s = makeGlowDot(0.2, 0xffd54a);
        s.position.set((Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 0.6, 0);
        sugar.add(s);
        continue;
      }
      // 再生完成
      if (m.phase === 'regen' && k >= 1) {
        m.mesh.material.color.set(0xcfd8e3);
        scene.remove(m.mesh); state.movers.splice(i, 1);
        continue;
      }
    }

    // 阶段事件（一次性）
    if (state.phase === 'fix' && !state.fixed) {
      state.fixed = true; state.co2++;
      // 移除到达的 CO₂，生成两个 3PGA 沿环滑走
      const arr = state.movers.filter(m => m.phase === 'arrive');
      arr.forEach((m, idx) => {
        scene.remove(m.mesh);
        state.movers.splice(state.movers.indexOf(m), 1);
        const pga = chipMesh(0x9fb8c9, 0.22);
        pga.position.copy(ringPoint(A_FIX)).add(new THREE.Vector3(0, idx ? -0.4 : 0.4, 0));
        scene.add(pga);
        state.movers.push({ mesh: pga, phase: 'fixPga', t: 0, fromAng: A_FIX, lane: idx ? -0.4 : 0.4 });
      });
    }
    if (state.phase === 'g3p' && !state.g3ped) {
      state.g3ped = true;
      state.movers.filter(m => m.phase === 'fixPga').forEach(m => { m.mesh.material.color.set(0x4ade80); }); // 变绿 = G3P
      if (state.turns % CALVIN.g3pPerTurns === 0) {
        // 每三圈：一个 G3P 出厂（净得）
        state.g3p++;
        // 每三圈：一个 G3P 出厂
        const ex = chipMesh(0x4ade80, 0.26);
        ex.position.copy(STATIONS[1].pos); scene.add(ex);
        state.movers.push({ mesh: ex, phase: 'exit', t: 0 });
        state.glucosePile = (state.glucosePile || 0) + 1;
        if (state.glucosePile >= CALVIN.co2PerGlucose) { state.glucosePile = 0; state.glucose++; }
      } else {
        // 其余继续去③再生
        state.movers.filter(m => m.phase === 'fixPga').forEach((m, idx) => {
          state.movers.splice(state.movers.indexOf(m), 1);
          const ru = chipMesh(0x7dd3fc, 0.22);
          ru.position.copy(ringPoint(A_RED)).add(new THREE.Vector3(0, m.lane, 0));
          scene.add(ru);
          state.movers.push({ mesh: ru, phase: 'regen', t: 0 });
        });
      }
    }
    if (state.phase === 'after' && !state.afterDone) {
      state.afterDone = true;
    }
    if (state.phase !== 'fix') state.fixed = false;
    if (state.phase !== 'g3p') state.g3ped = false;
    if (state.phase !== 'after') state.afterDone = false;

    // HUD
    document.getElementById('hCo2').textContent = state.co2;
    document.getElementById('hTurns').textContent = state.turns;
    document.getElementById('hG3p').textContent = state.g3p;
    document.getElementById('hGlucose').textContent = `${state.glucose} 颗（本颗 ${state.glucosePile || 0}/6）`;

    controls.update();
  }

  document.getElementById('bCalvinPause').addEventListener('click', e => {
    state.paused = !state.paused;
    e.target.textContent = state.paused ? '▶ 继续' : '⏸ 暂停';
    e.target.classList.toggle('on', state.paused);
  });
  document.getElementById('bCalvinReset').addEventListener('click', () => {
    state.turns = 0; state.co2 = 0; state.g3p = 0; state.glucose = 0; state.glucosePile = 0;
    state.movers.forEach(m => scene.remove(m.mesh));
    state.movers = [];
    while (sugar.children.length) sugar.remove(sugar.children[0]);
    state.phase = 'idle'; state.t = 0;
  });
  document.getElementById('rCalvin').addEventListener('input', e => {
    state.speed = +e.target.value;
    document.getElementById('oCalvin').textContent = state.speed.toFixed(1) + '×';
  });

  startTurn();

  return {
    scene, camera, update,
    getInfo() { return { turns: state.turns, co2: state.co2, g3p: state.g3p, glucose: state.glucose }; },
  };
}
