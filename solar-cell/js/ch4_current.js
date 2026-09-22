/* ══════════════════════════════════════════════════
   ch4_current.js — 第4章：一颗光子的一生（光 → 电）
   主线：光子进入 → 被吸收 · 电子被"激发"（换座位，不是逃逸）
        → 内建电场接走 → 电压积累 → 接通电路 → 点灯 → 循环
   ══════════════════════════════════════════════════ */
import * as THREE from 'three';
import {
  COL, METERS, makeTextSprite, addAnim, ease, flyCamera,
  buildLattice, makeCarrierMesh, wavelengthColor, photonEnergy,
} from './core.js';
import { showNarr, showBand, getBandCtx, bandSize } from './ui.js';

export const meta = {
  nav: '✨ 光子的一生',
  title: '✨ 太阳能电池 · 第4章：一颗光子的一生',
  sub: 'Chapter 4 · The life of one photon: from light to current',
};

let root, env;
let atoms = [], dims = { NX: 6, NY: 2, NZ: 5, SP: 1.55 };
let jx = 0;                          // junction world-x (root-local)
let photons = [];                    // flying photons
let carriers = [];                   // { mesh, kind, phase, t, anchor, park }
let junctionFx = [];                 // ions, arrows
let circuit = null;                  // { tube, curve, lamp, light, electrons, closed }
let stage = 0;                       // 0 ready | 1 excited | 2 swept | 3 accumulate | 4 circuit
let lambda = 550;
let absorbAnim = null;               // band-diagram electron jump 0..1
let fieldGlow = null;                // field arrows group opacity pulse

const EG = 1.12;

/* ── enter: lattice with a ready-made junction ── */
export function enter(e) {
  env = e;
  root = new THREE.Group();
  e.root.add(root);
  atoms = []; photons = []; carriers = []; junctionFx = [];
  stage = 0; absorbAnim = null; circuit = null;
  METERS.volt = 0; METERS.amp = 0;

  const built = buildLattice(root);
  atoms = built.atoms;
  Object.assign(dims, built.dims);
  jx = dims.NX / 2 * dims.SP - dims.SP / 2;

  // tint halves + junction furniture (learned in chapter 1)
  const mid = dims.NX / 2;
  atoms.forEach(a => a.mesh.material.color.set(a.x < mid ? COL.nTint : COL.pTint));
  for (let k = 0; k < 4; k++) {
    const plus = makeTextSprite('+', 0.62, '#f87171');
    plus.position.set(jx - 1.1, 0.6, (k - 1.5) * dims.SP * 1.1);
    root.add(plus); junctionFx.push(plus);
    const minus = makeTextSprite('−', 0.62, '#60a5fa');
    minus.position.set(jx + 1.1, 0.6, (k - 1.5) * dims.SP * 1.1);
    root.add(minus); junctionFx.push(minus);
  }
  fieldGlow = new THREE.Group();
  for (let k = 0; k < 2; k++) {
    const arrow = new THREE.Group();
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 1.6, 8),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.65 })
    );
    shaft.rotation.z = Math.PI / 2;
    const head = new THREE.Mesh(
      new THREE.ConeGeometry(0.15, 0.38, 10),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.65 })
    );
    head.rotation.z = -Math.PI / 2;
    head.position.x = 1.0;
    arrow.add(shaft, head);
    arrow.position.set(jx, dims.SP / 2, (k - 0.5) * dims.SP * 2.6);
    fieldGlow.add(arrow);
  }
  root.add(fieldGlow); junctionFx.push(fieldGlow);
  const nTag = makeTextSprite('n 型（电子多）', 0.66, '#93c5fd');
  nTag.position.set(-dims.NX * dims.SP / 4, 3.4, dims.NZ * dims.SP / 2);
  root.add(nTag); junctionFx.push(nTag);
  const pTag = makeTextSprite('p 型（空穴多）', 0.66, '#fca5a5');
  pTag.position.set(dims.NX * dims.SP / 4, 3.4, dims.NZ * dims.SP / 2);
  root.add(pTag); junctionFx.push(pTag);

  showBand(true);
  showNarr(
    '前三章的成果都在这：晶体与共价键（第1章）+ 能带（第2章）+ 分离器（第3章，金色箭头 = 内建电场）。现在，让我们跟着<b>一颗光子</b>走完全程 —— 按下发射！',
    'Crystal + bands + separator ready. Fire a photon and follow its journey!',
    'blue'
  );
}

/* ── fire a photon ── */
export function firePhoton() {
  const E = photonEnergy(lambda);
  const from = new THREE.Vector3(-11, 8.5, 3.5);
  // target a bond in the p half near the junction (root-local coords)
  const target = new THREE.Vector3(jx + 1.2 + Math.random() * 1.6, dims.SP * 0.5, (Math.random() - 0.5) * dims.SP * 3);
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 10, 10),
    new THREE.MeshBasicMaterial({ color: wavelengthColor(lambda) })
  );
  mesh.position.copy(from);
  root.add(mesh);
  photons.push({ mesh, from, to: target, t: 0, dur: 1.1, lambda, E });
  METERS.volt = Math.min(0.72, METERS.volt); // keep
}

/* photon outcome on arrival */
function absorbPhoton(ph) {
  const bondPos = ph.to;
  if (ph.E < EG) {
    // sub-gap: passes straight through, exits the far side
    ph.to = bondPos.clone().add(new THREE.Vector3(9, -3, 2));
    ph.dur = 1.0; ph.t = 0; ph.transmitting = true;
    showNarr(
      `这颗 ${ph.lambda}nm 红外光子只有 <b>${ph.E.toFixed(2)} eV</b>，小于带隙 <b>1.12 eV</b> —— 踢不动电子，<b>直接穿过去了</b>（玻璃透光同理）`,
      'Below the band gap: the photon passes through',
      'blue'
    );
    return;
  }
  // absorbed: excitation close-up
  const heat = ph.E - EG > 0.75;
  exciteAt(bondPos, ph, heat);
}

/* the excitation moment: electron changes seat (valence → conduction) */
function exciteAt(bondPos, ph, heat) {
  const e = makeCarrierMesh('e');
  e.material.color.set(0x94a3b8); e.material.emissive.set(0x475569);
  e.scale.setScalar(0.7);
  e.position.copy(bondPos);
  root.add(e);
  const h = makeCarrierMesh('h');
  h.scale.setScalar(0.01); // hole appears as electron leaves
  h.position.copy(bondPos);
  root.add(h);

  const car = { mesh: e, kind: 'e', phase: 'excited', t: 0, anchor: bondPos.clone(), wander: 1.1 };
  const hol = { mesh: h, kind: 'h', phase: 'wander', t: 0, anchor: bondPos.clone(), wander: 1.0 };
  carriers.push(car, hol);

  // jump up + turn gold = promotion to conduction band
  const gold = new THREE.Color(COL.electron);
  addAnim({
    duration: 0.9,
    update(p) {
      const q = ease.out(p);
      e.position.set(bondPos.x, bondPos.y + q * 1.35, bondPos.z);
      e.scale.setScalar(0.7 + q * 0.45);
      e.material.color.lerpColors(new THREE.Color(0x94a3b8), gold, q);
      e.material.emissive.lerpColors(new THREE.Color(0x475569), gold, q);
      h.scale.setScalar(0.01 + q);
      absorbAnim = q;
    },
    onComplete() { car.phase = 'wander'; absorbAnim = null; },
  });

  // heat ripple if much excess energy
  if (heat) {
    const ripple = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 0.28, 24),
      new THREE.MeshBasicMaterial({ color: 0xf87171, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    );
    ripple.rotation.x = -Math.PI / 2;
    ripple.position.copy(bondPos).add(new THREE.Vector3(0, -0.5, 0));
    root.add(ripple);
    addAnim({
      duration: 1.2,
      update(p) { ripple.scale.setScalar(1 + p * 4); ripple.material.opacity = 0.9 * (1 - p); },
      onComplete() { root.remove(ripple); ripple.geometry.dispose(); ripple.material.dispose(); },
    });
  }

  const firstTime = stage === 0;
  if (firstTime) {
    stage = 1;
    // camera close-up on the bond
    const wp = bondPos.clone().add(root.position);
    flyCamera(env.camera, env.controls, [wp.x + 2.2, wp.y + 2.4, wp.z + 3.2], [wp.x, wp.y + 0.6, wp.z], 1.2);
    showNarr(
      `<b>激发</b>！还记得原子模型吗？电子吸收光子从 K 壳层跳到 L 壳层 = 换座位。晶体也一样：电子从<b>价带</b>（锁死的座位）跳上<b>导带</b>（自由座位，${ph.E.toFixed(2)} eV > 1.12 eV）。<b>它没有逃出晶体</b>——那是"电离"；这里只需要"换座位"就够发电了！原地留下一个<b>空穴</b>。记住一个硬规矩：<b>一颗光子最多产生一对</b>电子-空穴——多余的能量只会变热（这也是效率极限的来源，第 5 章见）`,
      'Excitation = changing seats (valence → conduction), not escaping the crystal',
      'gold'
    );
    // after 3.4s: sweep story
    addAnim({
      duration: 0.01, elapsed: -3.4, update() {},
      onComplete() {
        stage = 2;
        showNarr(
          '电子和空穴在晶体里<b>游荡</b>……靠近 PN 结时，<b>内建电场</b>出手：电子被滑梯送上 n 侧，空穴滑回 p 侧',
          'They wander... then the built-in field sweeps them apart',
          'red'
        );
        flyCamera(env.camera, env.controls, [0.5, 4.2, 9.5], [jx + root.position.x, 0.4, 0], 1.4);
      },
    });
  } else {
    showNarr(
      `又一颗！电子换座位 → 游荡 → 被电场接走。n 侧电子越积越多，<b>电压 ↑</b>`,
      'Another pair — the n side keeps charging up',
      'gold', 2600
    );
  }
}

// ── MPPT & Temperature State ──
let loadResistance = 5.0; // Ω (sweet spot ≈ 5 Ω)
let cellTemperature = 25; // °C
let carrierLifetimeMs = 1.0; // ms (1.0 = high purity, 0.001 = contaminated)

function computeOperatingPoint() {
  const T = cellTemperature + 273.15;
  const Vt = (1.380649e-23 * T) / 1.602176634e-19; // ~0.0259 V at 300K
  const Voc0 = 0.72 - 0.0021 * (cellTemperature - 25);
  const Isc = 6.0 * (carrierLifetimeMs >= 0.5 ? 1.0 : 0.35); // 少子寿命决定收集率
  const I0 = Isc / (Math.exp(Voc0 / Vt) - 1);

  if (loadResistance <= 0.05) {
    return { V: 0, I: Isc, P: 0 };
  }
  if (loadResistance >= 95) {
    return { V: Voc0, I: 0, P: 0 };
  }

  // 二分法求解二极管工作点 V / RL = Isc - I0*(exp(V/Vt) - 1)
  let low = 0, high = Voc0;
  for (let k = 0; k < 24; k++) {
    const mid = (low + high) / 2;
    const iDiode = Isc - I0 * (Math.exp(mid / Vt) - 1);
    const iLoad = mid / loadResistance;
    if (iLoad < iDiode) {
      low = mid;
    } else {
      high = mid;
    }
  }
  const V = (low + high) / 2;
  const I = Math.max(0, V / loadResistance);
  return { V, I, P: V * I };
}

/* ── circuit ── */
function buildCircuit() {
  const g = new THREE.Group();
  const off = root.position;
  const pts = [
    new THREE.Vector3(-2.8 + off.x, 1.9 + off.y, off.z),
    new THREE.Vector3(-4.4 + off.x, 5.6 + off.y, off.z),
    new THREE.Vector3(-1.2 + off.x, 7.3 + off.y, off.z),
    new THREE.Vector3(3.2 + off.x, 6.6 + off.y, off.z),
    new THREE.Vector3(2.8 + off.x, 2.4 + off.y, off.z),
  ];
  const curve = new THREE.CatmullRomCurve3(pts);
  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 64, 0.075, 8),
    new THREE.MeshStandardMaterial({ color: 0xb45309, metalness: 0.88, roughness: 0.25 }) // 纯紫铜导线
  );
  g.add(tube);

  // contacts (欧姆接触电极)
  const cGeo = new THREE.BoxGeometry(1.8, 0.12, (dims.depth || dims.NZ * dims.SP) * 0.85);
  const cMat = new THREE.MeshStandardMaterial({ color: 0xb8c0cc, metalness: 0.9, roughness: 0.25 });
  const cn = new THREE.Mesh(cGeo, cMat); cn.position.set(-2.6 + off.x, 1.86 + off.y, off.z);
  const cp = new THREE.Mesh(cGeo, cMat); cp.position.set(2.6 + off.x, 1.86 + off.y, off.z);
  g.add(cn, cp);

  // 1. 爱迪生复古玻璃钨丝灯泡 (位于回路右上方 0.75 处)
  const lampPos = curve.getPointAt(0.72);
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.52, 20, 20),
    new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, roughness: 0.1 })
  );
  bulb.position.copy(lampPos);
  g.add(bulb);
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.22, 0.35, 10),
    new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8, roughness: 0.3 })
  );
  base.position.copy(lampPos).add(new THREE.Vector3(0, -0.62, 0));
  g.add(base);

  // 双螺旋钨丝
  const filament = new THREE.Mesh(
    new THREE.TorusGeometry(0.18, 0.035, 8, 16),
    new THREE.MeshStandardMaterial({ color: 0x7f1d1d, emissive: 0xef4444, emissiveIntensity: 0.3 })
  );
  filament.rotation.x = Math.PI / 2;
  filament.position.copy(lampPos);
  g.add(filament);

  const light = new THREE.PointLight(0xfde68a, 0, 16, 2);
  light.position.copy(lampPos);
  g.add(light);

  // 2. 微型机械电风扇 (位于回路左上方 0.35 处)
  const fanPos = curve.getPointAt(0.35);
  const fanGroup = new THREE.Group();
  fanGroup.position.copy(fanPos);
  const motor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 0.45, 12),
    new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 })
  );
  motor.rotation.x = Math.PI / 2;
  fanGroup.add(motor);

  const rotor = new THREE.Group();
  const bladeGeo = new THREE.BoxGeometry(0.04, 0.72, 0.2);
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.8, roughness: 0.2 });
  for (let k = 0; k < 3; k++) {
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = 0.42;
    const bArm = new THREE.Group();
    bArm.rotation.z = (k * 2 * Math.PI) / 3;
    bArm.add(blade);
    rotor.add(bArm);
  }
  fanGroup.add(rotor);
  g.add(fanGroup);

  // 3. 流动导电电子
  const electrons = [];
  for (let i = 0; i < 16; i++) {
    const el = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshStandardMaterial({ color: COL.electron, emissive: COL.electron, emissiveIntensity: 1.3 })
    );
    el.visible = false;
    g.add(el);
    electrons.push(el);
  }

  env.root.add(g);
  circuit = {
    group: g, curve, tube, bulb, filament, light, fanGroup, rotor,
    electrons, closed: true, flowT: 0
  };
  stage = 4;

  const op = computeOperatingPoint();
  METERS.volt = op.V;
  METERS.amp = op.I;

  flyCamera(env.camera, env.controls, [10, 7.5, 15], [0, 3.2, 0], 1.6);
  showNarr(
    '<b>电流来了！双负载联动做功！</b>电子沿纯铜导线从 n 侧流出，驱动<b>微型风扇呼啸旋转</b>并点亮<b>爱迪生钨丝灯泡</b>！调节下方 <b>MPPT 阻抗滑块</b>，探索让风扇狂转、灯泡爆亮的黄金甜点！',
    'Current loops through both the fan and the lamp — adjust MPPT impedance to hit peak power!',
    'green'
  );
}

/* ── per-frame ── */
export function update(dt, t) {
  if (!root) return;

  // photons
  for (let i = photons.length - 1; i >= 0; i--) {
    const ph = photons[i];
    ph.t += dt;
    const p = Math.min(1, ph.t / ph.dur);
    ph.mesh.position.lerpVectors(ph.from, ph.to, ease.inOut(p));
    // trail sparkle
    if (Math.random() < 0.3) {
      const s = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 6, 6),
        new THREE.MeshBasicMaterial({ color: ph.mesh.material.color, transparent: true, opacity: 0.6 })
      );
      s.position.copy(ph.mesh.position);
      root.add(s);
      addAnim({
        duration: 0.5,
        update(q) { s.material.opacity = 0.6 * (1 - q); s.scale.setScalar(1 - q * 0.6); },
        onComplete() { root.remove(s); s.geometry.dispose(); s.material.dispose(); },
      });
    }
    if (p >= 1) {
      root.remove(ph.mesh); ph.mesh.geometry.dispose(); ph.mesh.material.dispose();
      photons.splice(i, 1);
      if (ph.transmitting) continue;      // gone for good
      absorbPhoton(ph);
    }
  }

  // carriers
  for (const c of carriers) {
    c.t += dt;
    const w = c.wander;
    if (c.phase === 'excited') continue; // handled by jump anim
    if (c.phase === 'wander') {
      // random walk + gentle drift: electrons toward junction (-x), holes toward junction (+x)
      const drift = c.kind === 'e' ? -0.25 : 0.25;
      const x = c.anchor.x + Math.sin(c.t * 1.4 + c.anchor.z) * w + drift * Math.min(c.t, 4);
      const y = c.anchor.y + Math.sin(c.t * 0.9) * w * 0.35;
      const z = c.anchor.z + Math.cos(c.t * 1.1 + c.anchor.x) * w;
      c.mesh.position.set(x, y, z);
      // reached the field zone? sweep!
      if (Math.abs(x - jx) < 0.85 && stage >= 2) {
        c.phase = 'sweep';
        c.mesh.userData.from = c.mesh.position.clone();
        c.mesh.userData.to = c.mesh.position.clone().add(new THREE.Vector3(c.kind === 'e' ? -2.6 : 2.6, 0.5, 0));
        c.mesh.userData.st = 0;
      }
    } else if (c.phase === 'sweep') {
      c.mesh.userData.st += dt;
      const p = Math.min(1, c.mesh.userData.st / 0.55);
      c.mesh.position.lerpVectors(c.mesh.userData.from, c.mesh.userData.to, ease.inOut(p));
      if (p >= 1) {
        c.phase = 'parked';
        c.anchor = c.mesh.position.clone(); c.t = 0; c.wander = 0.55;
        if (c.kind === 'e') {
          METERS.volt = Math.min(0.72, METERS.volt + 0.09);
          if (stage < 3) stage = 3;
        }
      }
    } else if (c.phase === 'parked') {
      c.mesh.position.set(
        c.anchor.x + Math.sin(c.t * 1.6) * c.wander,
        c.anchor.y + Math.cos(c.t * 1.2) * c.wander * 0.5,
        c.anchor.z + Math.cos(c.t * 1.4) * c.wander
      );
    }
  }

  // field arrows pulse brighter when sweeping
  const sweeping = carriers.some(c => c.phase === 'sweep');
  if (fieldGlow) {
    const target = sweeping ? 1 : 0.65;
    fieldGlow.children.forEach(a => a.children.forEach(m => {
      m.material.opacity += (target - m.material.opacity) * Math.min(1, dt * 8);
    }));
  }

  // circuit flow
  if (circuit && circuit.closed) {
    const op = computeOperatingPoint();
    METERS.volt = op.V;
    METERS.amp = op.I;
    const power = op.P;

    // 导线内部电子流动速度随电流线性调整
    circuit.flowT += dt * (0.05 + 0.35 * (op.I / 6.0));
    circuit.electrons.forEach((el, i) => {
      el.visible = true;
      const u = (circuit.flowT + i / circuit.electrons.length) % 1;
      el.position.copy(circuit.curve.getPointAt(u));
    });

    // 1. 微型机械风扇转速直接与输出电功率联动
    if (circuit.rotor) {
      circuit.rotor.rotation.z += power * 7.5 * dt;
    }

    // 2. 爱迪生钨丝灯泡发光与环境点光源随功率联动
    const normP = Math.min(1.0, power / 3.4);
    if (circuit.filament) {
      circuit.filament.material.emissiveIntensity = 0.2 + normP * 3.5;
      circuit.filament.material.emissive.setHex(normP > 0.6 ? 0xfde047 : (normP > 0.2 ? 0xf97316 : 0xef4444));
    }
    if (circuit.bulb) {
      circuit.bulb.material.emissiveIntensity = normP * 0.8;
      circuit.bulb.material.emissive.setHex(0xfde68a);
    }
    if (circuit.light) {
      circuit.light.intensity = normP * 2.8;
    }
  } else if (METERS.amp > 0) {
    METERS.amp = Math.max(0, METERS.amp - dt * 2);
  }

  // gentle volt decay when open
  if (stage >= 3 && stage < 4 && !circuit) METERS.volt = Math.max(0.4, METERS.volt - dt * 0.006);

  // auto-enable the circuit button once enough voltage has accumulated
  const cb = document.getElementById('btnCircuit');
  if (cb) cb.disabled = !(stage >= 3 && METERS.volt >= 0.35 && !circuit);

  drawBand(t);
}

/* ── energy band diagram (crystal's "seat map") ── */
function drawBand(t) {
  const ctx = getBandCtx();
  if (!ctx) return;
  const { w, h } = bandSize();
  ctx.clearRect(0, 0, w, h);

  // bg grid
  ctx.fillStyle = '#080d1a';
  ctx.fillRect(0, 0, w, h);

  // Conduction band (CB) & Valence band (VB) blocks
  const L = 36, R = w - 68;
  const cbY = 46, bh = 42;
  const vbY = h - 96;

  // CB
  roundRect(ctx, L, cbY, R - L, bh, 6);
  ctx.fillStyle = 'rgba(251, 191, 36, 0.15)'; ctx.fill();
  ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 11px Outfit, sans-serif';
  ctx.fillText('二楼天台跑道：导带 (Conduction Band) — 平时全空', L + 10, cbY + 26);

  // VB
  roundRect(ctx, L, vbY, R - L, bh, 6);
  ctx.fillStyle = 'rgba(56, 189, 248, 0.15)'; ctx.fill();
  ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.fillStyle = '#38bdf8'; ctx.font = 'bold 11px Outfit, sans-serif';
  ctx.fillText('一楼硬卧看台：价带 (Valence Band) — 坐满锁死', L + 10, vbY + 26);

  // electrons in VB
  const es = 8;
  for (let i = 0; i < es; i++) {
    const x = L + 18 + i * ((R - L - 36) / (es - 1));
    if (!(absorbAnim !== null && i === 4)) {
      ctx.fillStyle = '#7dd3fc';
      ctx.beginPath(); ctx.arc(x, vbY + bh / 2, 4.5, 0, Math.PI * 2); ctx.fill();
    }
  }

  // gap arrow
  const gapX = w - 52;
  ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(gapX, vbY); ctx.lineTo(gapX, cbY + bh); ctx.stroke();
  ctx.fillStyle = '#cbd5e1'; ctx.font = 'bold 10px Outfit, sans-serif';
  ctx.save(); ctx.translate(gapX + 12, (cbY + bh + vbY) / 2); ctx.rotate(-Math.PI / 2);
  ctx.fillText('带隙 Eg = 1.12 eV', 0, 0); ctx.restore();

  // photon arrow with live wavelength
  const E = photonEnergy(lambda);
  const inGap = E >= EG;
  const col = '#' + wavelengthColor(lambda).getHexString();
  const px = 58, py = vbY + bh / 2;
  const zigTop = cbY + bh / 2;
  ctx.strokeStyle = col; ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(px - 16, py + 22);
  for (let i = 0; i <= 6; i++) {
    const yy = py + 22 - (py + 22 - zigTop) * (i / 6);
    const xx = px + (i % 2 === 0 ? -6 : 6) + 8;
    if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
  }
  ctx.stroke();
  ctx.fillStyle = col; ctx.font = 'bold 10px Outfit, sans-serif';
  ctx.fillText(`${lambda}nm · ${E.toFixed(2)} eV`, px + 6, py + 38);
  if (!inGap) {
    ctx.fillStyle = '#f87171'; ctx.font = '9px Outfit';
    ctx.fillText('< Eg · 穿透！', px + 6, py + 52);
  }

  // excited electron jumping valence → conduction
  if (absorbAnim !== null) {
    const p = absorbAnim;
    const ex = L + 14 + 4 * ((R - L - 28) / 7);
    const y = (vbY + bh / 2) - p * ((vbY + bh / 2) - (cbY + bh / 2));
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.arc(ex, y, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(251,191,36,0.4)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(ex, vbY + bh / 2); ctx.lineTo(ex, cbY + bh / 2); ctx.stroke();
    ctx.setLineDash([]);
  }

  // live verdict
  ctx.textAlign = 'center';
  ctx.fillStyle = inGap ? '#34d399' : '#f87171';
  ctx.font = 'bold 11px Outfit, sans-serif';
  ctx.fillText(inGap ? '✔ 可以激发电子' : '✘ 能量不够', w / 2, h - 16);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ── actions ── */
export function actions() {
  return {
    buttons: [
      {
        label: '🚀 发射光子', cls: 'gold', id: 'btnFire2',
        onClick: () => firePhoton(),
      },
      {
        label: '🔌 接通电路', cls: 'green', id: 'btnCircuit',
        disabled: !((stage >= 3 && METERS.volt >= 0.35) || circuit),
        onClick: el => {
          if (!circuit) { buildCircuit(); el.disabled = true; }
        },
      },
      {
        label: carrierLifetimeMs >= 0.5 ? '🛡️ 少子寿命: 1 ms (高纯晶硅)' : '⚠️ 少子寿命: 1 μs (杂质污染)',
        cls: carrierLifetimeMs >= 0.5 ? 'blue' : 'red',
        onClick: () => {
          carrierLifetimeMs = carrierLifetimeMs >= 0.5 ? 0.001 : 1.0;
          if (carrierLifetimeMs < 0.5) {
            showNarr(
              '⚠️ <b>少子寿命跌至 1 μs</b>！扩散长度 $L_n = \\sqrt{D\\tau} = 60\\ \\mu\\text{m} < 150\\ \\mu\\text{m}$，电子还没走到耗尽区就在半路与杂质复合猝死，短路电流与功率腰斩！',
              'Short lifetime: diffusion length < wafer thickness, carriers recombine before the junction!',
              'red'
            );
          } else {
            showNarr(
              '🛡️ <b>少子寿命恢复至 1 ms</b>！扩散长度 $L_n = 1900\\ \\mu\\text{m} \\gg 150\\ \\mu\\text{m}$，超越硅片厚度 10 倍以上，全部光生电子都能存活滑入 n 极！',
              'Long lifetime: diffusion length > 10x wafer thickness, 100% carriers collected!',
              'blue'
            );
          }
          refreshAllBtns();
        },
      },
      { label: '🔁 重玩本章', cls: '', onClick: () => { if (env) { leave(); enter(env); refreshAllBtns(); } } },
    ],
    sliders: [
      {
        id: 'slLambda', label: '光子波长', min: 400, max: 1300, step: 10, value: lambda,
        display: v => `${v}nm · ${(1239.84 / v).toFixed(2)}eV`,
        onInput: v => { lambda = v; },
      },
      {
        id: 'slRL', label: '🎯 MPPT 负载阻抗', min: 0, max: 100, step: 1, value: loadResistance,
        display: v => {
          if (v <= 0) return '0 Ω · 短路 (P=0)';
          if (v >= 95) return '∞ Ω · 开路 (P=0)';
          const p = computeOperatingPoint().P;
          return `${v} Ω · 输出功率 ${p.toFixed(2)}W ${Math.abs(v - 5) <= 1 ? '🔥最大功率点!' : ''}`;
        },
        onInput: v => {
          loadResistance = v;
          if (circuit && circuit.closed) {
            const p = computeOperatingPoint().P;
            if (v <= 0) {
              showNarr('<b>短路状态 (0 Ω)</b>：电荷飞奔没有阻碍，电流最大但两端电压为 0！输出电功率 $P = 0 \\times I = 0$ 瓦！风扇不转，灯泡不亮。', 'Short circuit: V=0, Power=0', 'red');
            } else if (v >= 95) {
              showNarr('<b>开路状态 (∞ Ω)</b>：外部断开，两端电荷堆积到极限电压 0.72V，但没有回路形成电流！输出电功率 $P = V \\times 0 = 0$ 瓦！风扇不转，灯泡不亮。', 'Open circuit: I=0, Power=0', 'red');
            } else if (Math.abs(v - 5) <= 1) {
              showNarr(`<b>🔥 命中黄金最大功率点 (MPPT ≈ 5 Ω)</b>！输出功率峰值达到 <b>${p.toFixed(2)} W</b>！风扇高速呼啸飞转，钨丝灯泡金光璀璨！`, 'Maximum Power Point Tracked! Peak power output!', 'gold');
            }
          }
        },
      },
      {
        id: 'slTemp', label: '☀️ 硅片温度', min: -20, max: 75, step: 5, value: cellTemperature,
        display: v => `${v}°C · ΔVoc ${( -0.0021 * (v - 25) * 1000 ).toFixed(0)}mV`,
        onInput: v => {
          cellTemperature = v;
          if (v >= 65) {
            showNarr(`<b>高温暴晒 ${v}°C 负温度效应</b>：开路电压较常温跌落超过 <b>100 mV</b>！热平衡漏电流暴涨导致端电压与功率大幅衰减。`, 'High temperature negative coefficient: Voc drops by >100mV', 'red');
          }
        },
      },
    ],
  };
}
export function refreshAllBtns() {
  // re-create the action bar (env-bound refresh provided by main.js)
  refreshActionsRef && refreshActionsRef();
}

export function leave() {
  if (!root) return;
  photons = []; carriers = []; junctionFx = []; circuit = null;
  atoms = []; stage = 0; absorbAnim = null;
  showBand(false);
}

let refreshActionsRef = null;
export function bindActionsRefresh(fn) { refreshActionsRef = fn; }
