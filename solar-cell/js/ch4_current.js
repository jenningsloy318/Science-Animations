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

/* ── circuit ── */
function buildCircuit() {
  const g = new THREE.Group();
  const off = root.position;
  const pts = [
    new THREE.Vector3(-2.5 + off.x, 1.9 + off.y, off.z),
    new THREE.Vector3(-4.4 + off.x, 5.6 + off.y, off.z),
    new THREE.Vector3(-1.2 + off.x, 7.3 + off.y, off.z),
    new THREE.Vector3(3.0 + off.x, 6.6 + off.y, off.z),
    new THREE.Vector3(2.5 + off.x, 2.4 + off.y, off.z),
  ];
  const curve = new THREE.CatmullRomCurve3(pts);
  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 64, 0.07, 8),
    new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.8, roughness: 0.35 })
  );
  g.add(tube);

  // contacts
  const cGeo = new THREE.BoxGeometry(1.7, 0.12, dims.NZ * dims.SP * 0.8);
  const cMat = new THREE.MeshStandardMaterial({ color: 0xb8c0cc, metalness: 0.85, roughness: 0.3 });
  const cn = new THREE.Mesh(cGeo, cMat); cn.position.set(-2.5 + off.x, 1.86 + off.y, off.z);
  const cp = new THREE.Mesh(cGeo, cMat); cp.position.set(2.5 + off.x, 1.86 + off.y, off.z);
  g.add(cn, cp);

  // lamp at the curve's apex
  const lampPos = curve.getPointAt(0.78);
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 20, 20),
    new THREE.MeshStandardMaterial({ color: 0x374151, emissive: 0x000000, roughness: 0.4 })
  );
  bulb.position.copy(lampPos);
  g.add(bulb);
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.24, 0.4, 10),
    new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.7, roughness: 0.4 })
  );
  base.position.copy(lampPos).add(new THREE.Vector3(0, -0.72, 0));
  g.add(base);
  const light = new THREE.PointLight(0xfde68a, 0, 18, 2);
  light.position.copy(lampPos);
  g.add(light);

  // flowing electrons
  const electrons = [];
  for (let i = 0; i < 14; i++) {
    const el = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 8, 8),
      new THREE.MeshStandardMaterial({ color: COL.electron, emissive: COL.electron, emissiveIntensity: 1.2 })
    );
    el.visible = false;
    g.add(el);
    electrons.push(el);
  }

  env.root.add(g);
  circuit = { group: g, curve, tube, bulb, light, electrons, closed: true, flowT: 0 };
  stage = 4;

  flyCamera(env.camera, env.controls, [10, 7.5, 15], [0, 3.2, 0], 1.6);
  showNarr(
    '<b>电流来了！</b>电子沿导线从 n 侧出发 → 经过灯泡（做功·发光）→ 回到 p 侧与空穴<b>复合</b>。电子没有被消耗——它走一圈又回来了。阳光不停制造新的电子-空穴对，电流就永不停歇：光子 ➜ 电！',
    'Electrons loop through the lamp and back — that loop IS the current',
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
    circuit.flowT += dt * (0.1 + 0.25 * (METERS.volt / 0.72));
    circuit.electrons.forEach((el, i) => {
      el.visible = true;
      const u = (circuit.flowT + i / circuit.electrons.length) % 1;
      el.position.copy(circuit.curve.getPointAt(u));
    });
    const glow = 0.3 + 0.7 * Math.min(1, METERS.amp / 3.2);
    circuit.bulb.material.emissive.setHex(0xfde68a).multiplyScalar(glow);
    circuit.light.intensity = 2.4 * glow;
    METERS.amp = 3.2 * (METERS.volt / 0.72);
  } else if (METERS.amp > 0) {
    METERS.amp = Math.max(0, METERS.amp - dt * 2);
  }

  // gentle volt decay when open
  if (stage >= 3 && stage < 4) METERS.volt = Math.max(0.4, METERS.volt - dt * 0.006);

  // auto-enable the circuit button once enough voltage has accumulated
  const cb = document.getElementById('btnCircuit');
  if (cb) cb.disabled = !(stage >= 3 && METERS.volt >= 0.4 && !circuit);

  drawBand(t);
}

/* ── energy band diagram (crystal's "seat map") ── */
function drawBand(t) {
  const ctx = getBandCtx();
  if (!ctx) return;
  const { w, h } = bandSize();
  ctx.clearRect(0, 0, w, h);

  // panel bg
  ctx.fillStyle = 'rgba(8,12,24,0.88)';
  roundRect(ctx, 4, 4, w - 8, h - 8, 12); ctx.fill();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 12px Outfit, sans-serif';
  ctx.fillText('能带 = 晶体版的电子座位表', w / 2, 24);
  ctx.font = '9px Outfit, sans-serif'; ctx.fillStyle = '#475569';
  ctx.fillText('(原子模型里的壳层，在晶体里合并成带)', w / 2, 38);

  const L = 34, R = w - 34;
  const cbY = 66, vbY = 210, bh = 40;

  // conduction band (empty seats, free)
  ctx.fillStyle = 'rgba(251,191,36,0.10)';
  ctx.strokeStyle = 'rgba(251,191,36,0.55)';
  roundRect(ctx, L, cbY, R - L, bh, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 11px Outfit, sans-serif';
  ctx.fillText('导带 Conduction', w / 2, cbY - 8);
  ctx.fillStyle = '#a16207'; ctx.font = '9px Outfit, sans-serif';
  ctx.fillText('自由座位 · 能自由跑', w / 2, cbY + bh + 14);

  // valence band (locked seats)
  ctx.fillStyle = 'rgba(56,189,248,0.08)';
  ctx.strokeStyle = 'rgba(56,189,248,0.5)';
  roundRect(ctx, L, vbY, R - L, bh, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#38bdf8'; ctx.font = 'bold 11px Outfit, sans-serif';
  ctx.fillText('价带 Valence', w / 2, vbY + bh + 16);
  ctx.fillStyle = '#0369a1'; ctx.font = '9px Outfit, sans-serif';
  ctx.fillText('锁死的座位 · 共价键', w / 2, vbY - 8);

  // valence electrons (dots) + hole when excited
  for (let i = 0; i < 8; i++) {
    const x = L + 14 + i * ((R - L - 28) / 7);
    const isHole = absorbAnim !== null && i === 4;
    if (isHole) {
      ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, vbY + bh / 2, 6, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#38bdf8'; ctx.font = 'bold 9px Outfit';
      ctx.fillText('+', x, vbY + bh / 2 + 3);
    } else {
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
        disabled: true,
        onClick: el => {
          if (stage >= 3 && !circuit) { buildCircuit(); el.disabled = true; }
        },
      },
      { label: '🔁 重玩本章', cls: '', onClick: () => { if (env) { leave(); enter(env); refreshAllBtns(); } } },
    ],
    sliders: [
      {
        id: 'slLambda', label: '光子波长', min: 400, max: 1300, step: 10, value: lambda,
        display: v => `${v}nm · ${(1240 / v).toFixed(2)}eV`,
        onInput: v => { lambda = v; },
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
