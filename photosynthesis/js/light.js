// ═══════════════════════════════════════════════════════
// light.js — ③ 光反应 + 拼糖：一台完整的机器（同屏闭环）
// 深度重构版：
//   1. 空间与隔室：清晰区分【叶绿体基质 Stroma】与【类囊体腔 Lumen（质子大坝水库）】
//   2. 真实因果链：水分子在 OEC 裂解 → 释放 O₂ 与 H⁺ → 光子打中 PSII 电子才坐阳光电梯 1 升起
//   3. 质子水泵与水轮机：b6f 从基质向腔内泵 H⁺；ATP 合酶像水轮机被 H⁺ 水流推动旋转合成 ATP
//   4. 能量闭环穿梭：满电电池（ATP / NADPH）沿上方送电通道飞往拼糖；空电池（ADP / NADP⁺）沿下方回流通道回膜再充
//   5. 积木拼糖（原子大洗牌）：
//      - CO₂ (1碳: O=C=O) + RuBP (5碳爪手) 在 RuBisCO 机械手中拼合裂为两个 3-PGA (3碳)
//      - 消耗 ATP 与 NADPH 充能，转化为高能糖积木 G3P (3碳糖)
//      - 抓满 3 个 CO₂ 时，1 块 G3P 出厂累积成糖，其余 5 块 G3P 重组再生为 3 个 RuBP 抓手！
//   6. 互动模式：【⚡ 自由运转】+【🎬 讲透三部曲】（膜上发电 → 电池纽带 → 积木拼糖）
//   7. 部件可点：点击任意蛋白质或分子，弹出生动大白话比喻与工作原理档案
// ═══════════════════════════════════════════════════════
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { makeLabel, makeGlowDot, makeSphere } from './sprite.js';
import { KOK_STATES, H_PER_ATP, CALVIN } from './facts.js';

const C = {
  photon: 0xffd54a, electron: 0x38bdf8, hplus: 0xf43f5e, o2: 0xf8fafc,
  atp: 0xf59e0b, nadph: 0xa855f7, water: 0x38bdf8, membrane: 0xd4a373,
  psii: 0x10b981, psi: 0x059669, b6f: 0xb45309, fnr: 0x7c3aed,
  adp: 0x78716c, nadpp: 0x6b7280,
  carbon: 0x1e293b, oxygen: 0xef4444, phosphate: 0xf97316,
  g3p: 0x22c55e, sugar: 0xeab308, rubp: 0x06b6d4, rubisco: 0x15803d,
};

// 空间坐标布局（面向 16:9 宽屏，右侧 336px 面板避让，两工场拉开充裕物理距离）
const MEMBRANE_X_MIN = -16.5;
const MEMBRANE_X_MAX = 1.8;
const HIGHWAY_START = new THREE.Vector3(1.5, 3.0, 0);
const HIGHWAY_END = new THREE.Vector3(9.2, 3.0, 0);
const RETURN_START = new THREE.Vector3(9.2, -1.8, 0);
const RETURN_END = new THREE.Vector3(1.0, -1.8, 0);

const RING_C = new THREE.Vector3(12.2, 0.8, 0);
const RING_R = 2.6;

// 卡尔文循环三个主工位角度
const ANG_FIX = Math.PI / 2;                // 12点钟：抓碳固定
const ANG_RED = Math.PI / 2 - 2 * Math.PI / 3; // 4点钟：充能还原
const ANG_REG = Math.PI / 2 + 2 * Math.PI / 3; // 8点钟：糖出厂与再生

export function buildLight() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#060b13');

  const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.1, 300);
  const HOME_CAM = new THREE.Vector3(0.5, 0.6, 38.0);
  const HOME_TAR = new THREE.Vector3(0.5, 0.2, 0);
  camera.position.copy(HOME_CAM);

  // 环境光照
  scene.add(new THREE.AmbientLight('#4b5563', 1.2));
  const sunLight = new THREE.DirectionalLight('#fff7ed', 1.8);
  sunLight.position.set(-6, 20, 18);
  scene.add(sunLight);

  const fillLight = new THREE.PointLight('#38bdf8', 0.8, 40);
  fillLight.position.set(-6, -2, 8);
  scene.add(fillLight);

  const controls = new OrbitControls(camera, document.getElementById('gl'));
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.copy(HOME_TAR);
  controls.minDistance = 12;
  controls.maxDistance = 50;

  // ── 容器与标签集合 ──
  const labels = [];
  const leaderLines = [];
  const clickables = [];

  function addLabel(text, color, x, y, k = 1) {
    const l = makeLabel(text, color);
    l.scale.multiplyScalar(k * 0.95);
    l.userData.baseScale = l.scale.clone();
    l.position.set(x, y, 0.2);
    scene.add(l);
    labels.push(l);
    return l;
  }

  function addComponentLabel(text, color, lx, ly, tx, ty, k = 0.85) {
    const l = addLabel(text, color, lx, ly, k);
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(lx, ly - 0.5, 0.1), new THREE.Vector3(tx, ty, 0.1)]),
      new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.45 })
    );
    scene.add(line);
    leaderLines.push(line);
    return l;
  }

  // ═══════════════════════════════════════════════════════
  // 0. 顶层容器：叶绿体宏观剖面与基质胶体微流（统一微宇宙，消除孤岛感）
  // ═══════════════════════════════════════════════════════
  // 叶绿体外被双层膜弧光大背景（微光翡翠半透曲面）
  const chloroplastBackdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(54, 28),
    new THREE.MeshBasicMaterial({
      color: 0x041910, transparent: true, opacity: 0.18, depthWrite: false,
    })
  );
  chloroplastBackdrop.position.set(0.5, 0.8, -2.8);
  scene.add(chloroplastBackdrop);

  // 叶绿体外廓双层膜发光边框线（圆角外被 Envelope）
  const envelopeShape = new THREE.Shape();
  const ew = 25.5, eh = 11.5, er = 5.0;
  envelopeShape.moveTo(-ew + er, -eh);
  envelopeShape.lineTo(ew - er, -eh);
  envelopeShape.quadraticCurveTo(ew, -eh, ew, -eh + er);
  envelopeShape.lineTo(ew, eh - er);
  envelopeShape.quadraticCurveTo(ew, eh, ew - er, eh);
  envelopeShape.lineTo(-ew + er, eh);
  envelopeShape.quadraticCurveTo(-ew, eh, -ew, eh - er);
  envelopeShape.lineTo(-ew, -eh + er);
  envelopeShape.quadraticCurveTo(-ew, -eh, -ew + er, -eh);

  const envelopeLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(envelopeShape.getPoints(80)),
    new THREE.LineBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.25 })
  );
  envelopeLine.position.set(0.5, 0.8, -2.6);
  scene.add(envelopeLine);

  addLabel('🍃 叶绿体内部微宇宙 (Chloroplast Matrix · 统一生命机器)', '#10b981', 0.5, 11.2, 1.15);

  // 基质流动微粒（Stroma Liquid Drift：40个微光星尘，赋予液相生命质感）
  const stromaDust = [];
  for (let i = 0; i < 40; i++) {
    const dot = makeGlowDot(0.08 + Math.random() * 0.08, 0x10b981);
    dot.position.set(
      -18 + Math.random() * 37,
      -7 + Math.random() * 16,
      (Math.random() - 0.5) * 1.5 - 0.5
    );
    dot.userData = {
      baseY: dot.position.y,
      seed: Math.random() * 10,
      speed: 0.2 + Math.random() * 0.35,
    };
    scene.add(dot);
    stromaDust.push(dot);
  }

  // ═══════════════════════════════════════════════════════
  // 1. 车间 ①：光反应发电工场（类囊体膜与腔）· 舞台底框与隔室
  // ═══════════════════════════════════════════════════════
  const lumenWidth = MEMBRANE_X_MAX - MEMBRANE_X_MIN + 1.2;
  const lumenCenterX = (MEMBRANE_X_MIN + MEMBRANE_X_MAX) / 2;

  // ── 车间 ① 发光舞台底框（蓝青色，彰显高能物理电化学） ──
  const lightZoneBackdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(lumenWidth + 1.4, 11.8),
    new THREE.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.05, depthWrite: false })
  );
  lightZoneBackdrop.position.set(lumenCenterX, 0.8, -1.8);
  scene.add(lightZoneBackdrop);

  addLabel('🏭 过程 ① · 光反应发电工场 (类囊体膜系统)', '#38bdf8', lumenCenterX, 6.1, 1.05);
  addLabel('水裂发放氧 · 质子水库大坝 · 纳米水轮机压制满电电池', '#94a3b8', lumenCenterX, 5.5, 0.75);

  // 腔：深蓝高压质子水库（半透明发光水箱）
  const lumenBox = new THREE.Mesh(
    new THREE.BoxGeometry(lumenWidth, 3.4, 2.2),
    new THREE.MeshStandardMaterial({
      color: 0x0f2b48, roughness: 0.3, transparent: true, opacity: 0.65,
      emissive: 0x071e33, emissiveIntensity: 0.4,
    })
  );
  lumenBox.position.set(lumenCenterX, -2.1, -0.2);
  scene.add(lumenBox);

  // 腔边缘高亮轮廓线
  const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(lumenWidth, 3.4, 2.2));
  const lineBox = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35 }));
  lineBox.position.copy(lumenBox.position);
  scene.add(lineBox);

  addLabel('类囊体腔 · 质子水库 (高压蓄水大坝 · 充盈 H⁺)', '#7dd3fc', lumenCenterX, -4.3, 0.88);

  // 腔内 H⁺ 流向 ATP 合酶水轮机的导流箭头线
  const flowTrack = new THREE.Mesh(
    new THREE.BoxGeometry(5.0, 0.08, 0.08),
    new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.6 })
  );
  flowTrack.position.set(-1.2, -1.8, 0.4);
  scene.add(flowTrack);

  const flowHead = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.45, 8), new THREE.MeshBasicMaterial({ color: 0xf43f5e }));
  flowHead.rotation.z = -Math.PI / 2;
  flowHead.position.set(1.4, -1.8, 0.4);
  scene.add(flowHead);
  addLabel('H⁺ 顺水势冲向水轮机 →', '#f43f5e', -1.2, -2.5, 0.85);

  // ── 类囊体膜双分子层 ──
  const membrane = new THREE.Group();
  scene.add(membrane);
  const headMat = new THREE.MeshStandardMaterial({
    color: C.membrane, roughness: 0.5, metalness: 0.1,
    emissive: 0x3f2e10, emissiveIntensity: 0.3,
  });
  // 磷脂外叶与内叶
  [-0.42, 0.42].forEach(y => {
    const layer = new THREE.Mesh(new THREE.BoxGeometry(lumenWidth, 0.28, 2.4), headMat);
    layer.position.set(lumenCenterX, y, 0);
    membrane.add(layer);
  });
  // 疏水核心层
  const coreLayer = new THREE.Mesh(
    new THREE.BoxGeometry(lumenWidth, 0.52, 2.2),
    new THREE.MeshStandardMaterial({ color: 0x453118, roughness: 0.8 })
  );
  coreLayer.position.set(lumenCenterX, 0, 0);
  membrane.add(coreLayer);

  // ═══════════════════════════════════════════════════════
  // 2. 膜上蛋白质发电机（光反应）
  // ═══════════════════════════════════════════════════════
  function makeProtein(x, y, w, h, d, color, name, desc) {
    const geo = new THREE.CylinderGeometry(w / 2, w / 2, h, 20);
    const mat = new THREE.MeshStandardMaterial({
      color, roughness: 0.35, metalness: 0.15,
      emissive: color, emissiveIntensity: 0.2,
    });
    const m = new THREE.Mesh(geo, mat);
    m.scale.set(1, 1, d / w);
    m.position.set(x, y, 0);
    scene.add(m);
    m.userData = { name, desc };
    clickables.push({ mesh: m, name, desc });
    return m;
  }

  // ① PSII (光系统 II)
  const psiiX = -12.2;
  const psii = makeProtein(psiiX, 0.2, 2.6, 2.4, 2.2, C.psii,
    '光系统 II (PSII / P680)',
    '【阳光电梯 1 号 + 拆水放氧】叶绿素吸收光子，将电子顶上高能态；底部锰簇（OEC）从水里夺走电子补位，水被拆开释放 O₂ 和 H⁺！');
  addComponentLabel('① PSII · 拆水放氧', '#34d399', psiiX, 4.4, psiiX, 1.4);

  // PSII 顶部的天线叶绿素发光环
  const chlRing = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const dot = makeGlowDot(0.18, 0x4ade80);
    dot.position.set(psiiX + Math.cos(ang) * 1.3, 1.35, Math.sin(ang) * 0.9);
    chlRing.add(dot);
  }
  scene.add(chlRing);

  // PSII 底部的放氧复合体 (OEC: Mn4CaO5 簇)
  const oecGroup = new THREE.Group();
  oecGroup.position.set(psiiX, -1.2, 0.2);
  scene.add(oecGroup);
  // 4 个锰 (紫色) + 1 个钙 (橙色)
  [[-0.25, 0.15], [0.25, 0.15], [-0.2, -0.2], [0.2, -0.2]].forEach(([mx, my]) => {
    const mn = makeSphere(0.14, 0x8b5cf6, { ei: 0.4 });
    mn.position.set(mx, my, 0);
    oecGroup.add(mn);
  });
  const ca = makeSphere(0.16, 0xf97316, { ei: 0.5 });
  ca.position.set(0, 0, 0.15);
  oecGroup.add(ca);
  addLabel('OEC 锰簇 (拆水刀)', '#c4b5fd', psiiX - 1.6, -1.3, 0.75);

  // ② 细胞色素 b6f 质子泵
  const b6fX = -7.4;
  const b6f = makeProtein(b6fX, 0.1, 2.1, 2.2, 1.9, C.b6f,
    '细胞色素 b6f 复合体',
    '【质子抽水泵】电子像滑梯滑经它时，它利用电子下坡的能量，将基质中的 H⁺ 强行泵进类囊体腔，造出大坝水压！');
  addComponentLabel('② b6f · 泵 H⁺ 入大坝', '#fb923c', b6fX, 4.4, b6fX, 1.2);

  // b6f 内部的泵吸通道光束
  const b6fShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.25, 2.4, 12),
    new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.4 })
  );
  b6fShaft.position.set(b6fX, 0.1, 0.3);
  scene.add(b6fShaft);

  // ③ PSI (光系统 I)
  const psiX = -3.2;
  const psi = makeProtein(psiX, 0.2, 2.4, 2.3, 2.0, C.psi,
    '光系统 I (PSI / P700)',
    '【阳光电梯 2 号】到达这里的电子已经疲惫没劲了；第二个光子打入，将电子再次顶上极高能态，准备送去装包！');
  addComponentLabel('③ PSI · 二次充能', '#34d399', -3.6, 4.6, psiX, 1.4, 0.82);

  // ④ FNR 酶 (NADP⁺ 还原酶)
  const fnrX = -0.7;
  const fnr = makeProtein(fnrX, 2.1, 1.4, 1.4, 1.3, C.fnr,
    'FNR (铁氧还蛋白-NADP⁺ 还原酶)',
    '【电池打包车间】把从 PSI 送来的 2 个高能电子与 H⁺ 装进 NADP⁺，封装成满电化学电池 NADPH！');
  addComponentLabel('④ FNR · 封装 NADPH', '#c084fc', -0.7, 3.6, fnrX, 2.8, 0.80);

  // ⑤ ATP 合酶水轮发电机（菠菜 c14 环 + 催化球头）
  const atpX = 1.3;
  const atpSynthaseGrp = new THREE.Group();
  scene.add(atpSynthaseGrp);

  // 腔内 c14 转子 (Rotor)
  const rotor = new THREE.Group();
  rotor.position.set(atpX, -0.65, 0);
  atpSynthaseGrp.add(rotor);
  for (let i = 0; i < 14; i++) {
    const ang = (i / 14) * Math.PI * 2;
    const seg = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.58, 0.16),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.4, metalness: 0.2 })
    );
    seg.position.set(Math.cos(ang) * 0.52, 0, Math.sin(ang) * 0.52);
    seg.rotation.y = -ang;
    rotor.add(seg);
  }

  // 穿膜转轴
  const axle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.14, 1.3, 12),
    new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3 })
  );
  axle.position.set(atpX, 0.65, 0);
  atpSynthaseGrp.add(axle);

  // 基质侧 F1 催化球头（带 3 个活性叶瓣）
  const knob = new THREE.Group();
  knob.position.set(atpX, 1.8, 0);
  atpSynthaseGrp.add(knob);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const lobe = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 16, 14),
      new THREE.MeshStandardMaterial({
        color: C.atp, roughness: 0.35,
        emissive: 0xd97706, emissiveIntensity: 0.4,
      })
    );
    lobe.position.set(Math.cos(a) * 0.35, 0, Math.sin(a) * 0.35);
    knob.add(lobe);
  }
  clickables.push({
    mesh: knob, name: 'ATP 合酶 (分子水轮发电机)',
    desc: '【水轮发电机】类囊体腔内高压 H⁺ 喷涌而出推着 c 环高速旋转，带动转轴在球头里咔哒组装 ADP + Pi → ATP 满电电池！',
  });
  addComponentLabel('⑤ ATP 合酶 · 旋转发电', '#fbbf24', 1.4, 5.1, atpX, 2.3, 0.82);

  // ── 电子输送管道（可见过山车轨道）──
  const pipeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(psiiX, 1.4, 0),        // PSII 出口
    new THREE.Vector3((psiiX + b6fX) / 2, 2.2, 0), // 阳光电梯 1 顶峰
    new THREE.Vector3(b6fX, 1.3, 0),         // b6f 入口
    new THREE.Vector3((b6fX + psiX) / 2, 0.4, 0),  // 能量下滑
    new THREE.Vector3(psiX, 1.4, 0),         // PSI 入口
    new THREE.Vector3((psiX + fnrX) / 2, 2.8, 0),  // 阳光电梯 2 顶峰
    new THREE.Vector3(fnrX, 2.4, 0),         // FNR 终点
  ]);

  const pipeTube = new THREE.Mesh(
    new THREE.TubeGeometry(pipeCurve, 80, 0.08, 8),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35 })
  );
  scene.add(pipeTube);

  // 轨道上的单向箭头
  [0.15, 0.48, 0.85].forEach(u => {
    const p = pipeCurve.getPointAt(u);
    const t = pipeCurve.getTangentAt(u).normalize();
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.32, 8), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    cone.position.copy(p);
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), t);
    scene.add(cone);
  });

  function getUAtX(targetX) {
    let bestU = 0, minDist = 1e9;
    for (let i = 0; i <= 100; i++) {
      const u = i / 100;
      const p = pipeCurve.getPointAt(u);
      const d = Math.abs(p.x - targetX);
      if (d < minDist) { minDist = d; bestU = u; }
    }
    return bestU;
  }
  const U_B6F = getUAtX(b6fX);
  const U_PSI = getUAtX(psiX);

  // ═══════════════════════════════════════════════════════
  // 3. 唯一的穿梭纽带：能量与原料城际穿梭专线 (The Shuttle Highway)
  // ═══════════════════════════════════════════════════════
  const highwayGroup = new THREE.Group();
  scene.add(highwayGroup);

  // 送电通道（上方 · 金色立体磁浮导光管）
  const forwardCurve = new THREE.LineCurve3(HIGHWAY_START, HIGHWAY_END);
  const forwardTube = new THREE.Mesh(
    new THREE.TubeGeometry(forwardCurve, 32, 0.09, 8, false),
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b, roughness: 0.3, emissive: 0xd97706, emissiveIntensity: 0.7,
      transparent: true, opacity: 0.65,
    })
  );
  highwayGroup.add(forwardTube);

  // 上行高能箭头
  [0.25, 0.55, 0.85].forEach(u => {
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.42, 8), new THREE.MeshBasicMaterial({ color: 0xfde047 }));
    arrow.rotation.z = -Math.PI / 2;
    arrow.position.set(HIGHWAY_START.x + (HIGHWAY_END.x - HIGHWAY_START.x) * u, HIGHWAY_START.y, 0);
    highwayGroup.add(arrow);
  });
  addLabel('⚡ 满电前送 (3 ATP + 2 NADPH) →', '#fcd34d', 5.35, 3.6, 0.78);

  // 中央穿梭专线标识（立体悬浮徽章）
  addLabel('⇄ 能量与原料穿梭专线 ⇄', '#ffd54a', 5.35, 0.6, 0.86);

  // 回充通道（下方 · 青灰立体闭环回路导管）
  const returnCurve = new THREE.LineCurve3(RETURN_START, RETURN_END);
  const returnTube = new THREE.Mesh(
    new THREE.TubeGeometry(returnCurve, 32, 0.09, 8, false),
    new THREE.MeshStandardMaterial({
      color: 0x94a3b8, roughness: 0.4, emissive: 0x475569, emissiveIntensity: 0.4,
      transparent: true, opacity: 0.65,
    })
  );
  highwayGroup.add(returnTube);

  // 下行回充箭头
  [0.25, 0.55, 0.85].forEach(u => {
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.42, 8), new THREE.MeshBasicMaterial({ color: 0xcbd5e1 }));
    arrow.rotation.z = Math.PI / 2;
    arrow.position.set(RETURN_START.x + (RETURN_END.x - RETURN_START.x) * u, RETURN_START.y, 0);
    highwayGroup.add(arrow);
  });
  addLabel('← 🪫 空电回充 (3 ADP + 2 NADP⁺)', '#cbd5e1', 5.35, -1.2, 0.78);

  // ═══════════════════════════════════════════════════════
  // 4. 车间 ②：碳反应拼糖工场（叶绿体基质液相）
  // ═══════════════════════════════════════════════════════
  // ── 车间 ② 发光舞台底框（翡翠绿，彰显液相常温生化合成） ──
  const calvinZoneBackdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(9.0, 11.8),
    new THREE.MeshBasicMaterial({ color: 0x065f46, transparent: true, opacity: 0.045, depthWrite: false })
  );
  calvinZoneBackdrop.position.set(RING_C.x, 0.8, -1.8);
  scene.add(calvinZoneBackdrop);

  addLabel('🍬 过程 ② · 碳反应拼糖工场 (叶绿体基质)', '#4ade80', RING_C.x, 6.1, 1.05);
  addLabel('RuBisCO 抓碳 · 注入氢能 · 组装产出糖', '#86efac', RING_C.x, 5.5, 0.75);

  const calvinGroup = new THREE.Group();
  calvinGroup.position.copy(RING_C);
  scene.add(calvinGroup);

  // 主传送带圆环
  const ringMesh = new THREE.Mesh(
    new THREE.TorusGeometry(RING_R, 0.14, 16, 80),
    new THREE.MeshStandardMaterial({
      color: 0x064e3b, roughness: 0.4,
      emissive: 0x042f2e, emissiveIntensity: 0.8,
    })
  );
  calvinGroup.add(ringMesh);

  // 三个工位平台与造型
  const stations = [];

  // 工位 ①：抓碳固定（RuBisCO 机械手 · 12点钟）
  const posFix = new THREE.Vector3(Math.cos(ANG_FIX) * RING_R, Math.sin(ANG_FIX) * RING_R, 0);
  const rubiscoMesh = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.82),
    new THREE.MeshStandardMaterial({
      color: C.rubisco, roughness: 0.35,
      emissive: 0x14532d, emissiveIntensity: 0.5,
    })
  );
  rubiscoMesh.position.copy(posFix);
  calvinGroup.add(rubiscoMesh);
  clickables.push({
    mesh: rubiscoMesh, name: 'RuBisCO (核酮糖二磷酸羧化酶)',
    desc: '【抓碳机械手】地球上最多的酶！负责从空气中抓住只有 1 个碳的 CO₂，强行扣在 5 碳抓手 RuBP 上，拉开拼糖序幕！',
  });
  const lblFix = makeLabel('① 抓碳固定 (RuBisCO)', '#86efac', 38);
  lblFix.position.set(posFix.x, posFix.y + 1.25, 0);
  lblFix.scale.multiplyScalar(0.78);
  calvinGroup.add(lblFix);
  stations.push({ pad: rubiscoMesh, label: lblFix });

  // 工位 ②：充能还原（能量注入 · 4点钟）
  const posRed = new THREE.Vector3(Math.cos(ANG_RED) * RING_R, Math.sin(ANG_RED) * RING_R, 0);
  const redPad = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 0.75, 0.22, 20),
    new THREE.MeshStandardMaterial({
      color: 0x7c3aed, roughness: 0.4, transparent: true, opacity: 0.6,
      emissive: 0x6d28d9, emissiveIntensity: 0.4,
    })
  );
  redPad.position.copy(posRed);
  calvinGroup.add(redPad);
  clickables.push({
    mesh: redPad, name: '还原工位 (能量与电子注入)',
    desc: '【电池花在这里！】3-PGA 吸收 ATP 提供的能量磷酸，并吞下 NADPH 送来的高能电子与氢，蜕变为甜美的高能糖砖 G3P！',
  });
  const lblRed = makeLabel('② 充能还原 (注入能量)', '#c084fc', 38);
  lblRed.position.set(posRed.x, -3.5, 0);
  lblRed.scale.multiplyScalar(0.78);
  calvinGroup.add(lblRed);
  stations.push({ pad: redPad, label: lblRed });

  // 工位 ③：出糖与再生（拆分与重组 · 8点钟）
  const posReg = new THREE.Vector3(Math.cos(ANG_REG) * RING_R, Math.sin(ANG_REG) * RING_R, 0);
  const regPad = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 0.75, 0.22, 20),
    new THREE.MeshStandardMaterial({
      color: 0x0284c7, roughness: 0.4, transparent: true, opacity: 0.6,
      emissive: 0x0369a1, emissiveIntensity: 0.4,
    })
  );
  regPad.position.copy(posReg);
  calvinGroup.add(regPad);
  clickables.push({
    mesh: regPad, name: '再生与出糖工位',
    desc: '【1 块出厂，5 块回炉】3 圈积攒 6 块 G3P，其中 1 块作为纯收入离开车间去造葡萄糖；剩余 5 块在 ATP 支持下重新拼回 3 个 RuBP 抓手！',
  });
  const lblReg = makeLabel('③ 抓手再生 (RuBP)', '#7dd3fc', 38);
  lblReg.position.set(posReg.x, -3.5, 0);
  lblReg.scale.multiplyScalar(0.78);
  calvinGroup.add(lblReg);
  stations.push({ pad: regPad, label: lblReg });

  // 糖出厂滑梯（垂直向下，彻底远离工位标签）与糖仓库
  const sugarExitPos = new THREE.Vector3(RING_C.x, RING_C.y - RING_R - 0.2, 0);
  const sugarRamp = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([sugarExitPos, new THREE.Vector3(sugarExitPos.x, sugarExitPos.y - 1.2, 0)]),
    new THREE.LineBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.75 })
  );
  scene.add(sugarRamp);

  const sugarPile = new THREE.Group();
  sugarPile.position.set(sugarExitPos.x, sugarExitPos.y - 1.6, 0);
  scene.add(sugarPile);

  addLabel('🍬 纯赚 1 块糖出厂 (G3P)', '#facc15', RING_C.x, sugarExitPos.y - 2.6, 0.82);

  // ══════════════════════════════════════════════════════       
  // 5. 实体积木造型生成器（CO₂, RuBP, 3-PGA, G3P, 电池）
  // ══════════════════════════════════════════════════════       
  // CO₂ 分子（1 个黑碳 + 2 个红氧: O=C=O）
  function makeCO2Mesh() {
    const grp = new THREE.Group();
    const c = makeSphere(0.18, C.carbon, { rough: 0.4, ei: 0.3 });
    grp.add(c);
    [-0.26, 0.26].forEach(dx => {
      const o = makeSphere(0.14, C.oxygen, { rough: 0.3, ei: 0.4 });
      o.position.x = dx;
      grp.add(o);
    });
    return grp;
  }

  // 3-碳积木（3-PGA: 3 个暗碳球 + 1 磷酸）
  function make3PGAMesh() {
    const grp = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const c = makeSphere(0.15, 0x475569, { ei: 0.2 });
      c.position.x = (i - 1) * 0.26;
      grp.add(c);
    }
    const p = makeSphere(0.13, C.phosphate, { ei: 0.4 });
    p.position.set(0.38, 0.2, 0);
    grp.add(p);
    return grp;
  }

  // G3P 糖积木（3 个金绿色高能碳球 + 1 磷酸，闪耀糖质光泽）
  function makeG3PMesh() {
    const grp = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const c = makeSphere(0.18, C.g3p, { rough: 0.25, ei: 0.7 });
      c.position.x = (i - 1) * 0.3;
      grp.add(c);
    }
    const p = makeSphere(0.15, 0xfacc15, { ei: 0.8 });
    p.position.set(0.42, 0.22, 0);
    grp.add(p);
    return grp;
  }

  // 5-碳抓手 RuBP（5 个青色碳球 + 2 磷酸帽）
  function makeRuBPMesh() {
    const grp = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const c = makeSphere(0.15, C.rubp, { rough: 0.3, ei: 0.4 });
      c.position.x = (i - 2) * 0.25;
      grp.add(c);
    }
    [-0.65, 0.65].forEach(dx => {
      const p = makeSphere(0.13, C.phosphate, { ei: 0.5 });
      p.position.set(dx, 0.2, 0);
      grp.add(p);
    });
    return grp;
  }

  // 电池造型：ATP（3 格满电黄金胶囊）
  function makeATPMesh() {
    const grp = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.52, 12),
      new THREE.MeshStandardMaterial({ color: C.atp, roughness: 0.3, emissive: 0xd97706, emissiveIntensity: 0.6 })
    );
    body.rotation.z = Math.PI / 2;
    grp.add(body);
    // 3 格绿电指示环
    [-0.14, 0, 0.14].forEach(dx => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.19, 0.03, 8, 16),
        new THREE.MeshBasicMaterial({ color: 0x4ade80 })
      );
      ring.position.x = dx;
      ring.rotation.y = Math.PI / 2;
      grp.add(ring);
    });
    return grp;
  }

  // 电池造型：ADP（2 格空载暗铜胶囊）
  function makeADPMesh() {
    const grp = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.17, 0.46, 12),
      new THREE.MeshStandardMaterial({ color: C.adp, roughness: 0.6, emissive: 0x292524, emissiveIntensity: 0.2 })
    );
    body.rotation.z = Math.PI / 2;
    grp.add(body);
    return grp;
  }

  // NADPH 满载还原力载体（紫色发光容器 + 闪电微光）
  function makeNADPHMesh() {
    const grp = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.24),
      new THREE.MeshStandardMaterial({ color: C.nadph, roughness: 0.25, emissive: 0x9333ea, emissiveIntensity: 0.7 })
    );
    grp.add(core);
    const halo = makeGlowDot(0.32, 0xd8b4fe);
    halo.material.transparent = true;
    halo.material.opacity = 0.5;
    grp.add(halo);
    return grp;
  }

  // NADP⁺ 空载容器
  function makeNADPMesh() {
    const grp = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.2),
      new THREE.MeshStandardMaterial({ color: C.nadpp, roughness: 0.6, emissive: 0x374151, emissiveIntensity: 0.2 })
    );
    grp.add(core);
    return grp;
  }

  // ═══════════════════════════════════════════════════════
  // 6. 运行状态与粒子管理
  // ═══════════════════════════════════════════════════════
  const state = {
    paused: false,
    speed: 1.0,
    lightRate: 1.0,
    co2Rate: 1.0,

    // 导览讲解模式
    tourMode: false,
    tourStep: 1,
    tourTimer: 0,

    // 膜上微粒
    photons: [],
    waters: [],
    electrons: [],
    o2Bubbles: [],
    lumenHCount: 16,
    lumenHDots: [],
    pumpingHDots: [],
    atpHDots: [],

    // 飞行动画对象
    fliers: [],

    // 电池库存（ATP / NADPH）
    bat: { atp: 2, nadph: 2 },
    emptyBat: { adp: 1, nadpp: 1 },
    sunCutoff: false,

    // 统计数字
    counts: { o2: 0, atp: 0, nadph: 0, adp: 0, nadpp: 0 },
    kokIdx: 1,
    psiiCount: 0,
    psiElectrons: 0,
    rotorAngle: 0,
    atpAccum: 0,

    // 卡尔文循环
    calvinTurn: null,
    calvinTimer: 0.8,
    turns: 0,
    g3pCount: 0,

    // Z 方案当前电子位置
    zPos: 0,
  };

  // 初始化腔内 H⁺ 粒子水库（高密度质子池）
  for (let i = 0; i < 28; i++) {
    const d = makeGlowDot(0.12, C.hplus);
    d.position.set(
      MEMBRANE_X_MIN + 0.6 + Math.random() * (lumenWidth - 1.2),
      -1.2 - Math.random() * 2.0,
      (Math.random() - 0.5) * 1.4
    );
    d.userData.baseY = d.position.y;
    d.userData.seed = Math.random() * 10;
    scene.add(d);
    state.lumenHDots.push(d);
  }

  function addHToLumen(x) {
    state.lumenHCount++;
    const d = makeGlowDot(0.12, C.hplus);
    d.position.set(x + (Math.random() - 0.5) * 0.8, -1.2, (Math.random() - 0.5) * 0.8);
    d.userData.baseY = -1.5 - Math.random() * 1.5;
    d.userData.seed = Math.random() * 10;
    scene.add(d);
    state.lumenHDots.push(d);
    if (state.lumenHDots.length > 40) {
      const old = state.lumenHDots.shift();
      scene.remove(old);
    }
  }

  function drainHFromLumen() {
    state.lumenHCount = Math.max(4, state.lumenHCount - 1);
    if (state.lumenHDots.length > 12) {
      const d = state.lumenHDots.pop();
      scene.remove(d);
    }
  }

  // 飞行片辅助函数
  function fly(mesh, target, speed, onArrive) {
    scene.add(mesh);
    state.fliers.push({ mesh, target, speed, onArrive });
  }

  // ── 光反应事件调度 ──
  // ① 水滴补给并裂解
  function supplyWater() {
    const w = new THREE.Group();
    const oxy = makeSphere(0.16, C.water, { rough: 0.3, ei: 0.4 });
    w.add(oxy);
    [-0.14, 0.14].forEach(dx => {
      const h = makeSphere(0.09, 0xf8fafc, { ei: 0.5 });
      h.position.set(dx, 0.12, 0);
      w.add(h);
    });
    w.position.set(psiiX + (Math.random() - 0.5) * 0.6, -3.4, 0.2);
    scene.add(w);

    fly(w, new THREE.Vector3(psiiX, -1.2, 0.2), 2.2, () => {
      scene.remove(w);
      // 达到 OEC：裂解！
      state.psiiCount++;
      state.kokIdx = (state.psiiCount % 4) + 1;
      // 释放 H⁺ 进入腔水库
      addHToLumen(psiiX);
      addHToLumen(psiiX + 0.4);

      // 若积攒 4 次：放氧气泡！
      if (state.psiiCount % 4 === 0) {
        state.kokIdx = 0;
        state.counts.o2++;
        const o2Bubble = makeSphere(0.24, C.o2, { rough: 0.1, opacity: 0.85, ei: 0.6 });
        o2Bubble.position.set(psiiX, -0.6, 0.5);
        scene.add(o2Bubble);
        state.o2Bubbles.push({ mesh: o2Bubble, t: 0 });
      }
    });
  }

  // ② 光子射向光系统
  function launchPhoton(targetComplex, kind) {
    const tx = kind === 'PSII' ? psiiX : psiX;
    const p = makeGlowDot(0.17, C.photon);
    p.position.set(tx + (Math.random() - 0.5) * 1.0, 9.2 + Math.random() * 1.5, 0);
    scene.add(p);

    state.photons.push({
      mesh: p, tx, ty: 1.35, kind,
      onHit: () => {
        if (kind === 'PSII') {
          // 光子命中 PSII：电子出发！阳光电梯 1 启动！
          psii.material.emissiveIntensity = 0.8;
          const e = makeGlowDot(0.16, C.electron);
          e.position.copy(pipeCurve.getPointAt(0));
          scene.add(e);
          state.electrons.push({ mesh: e, u: 0, seg: 'A', end: U_PSI });
          highlightStep(1);
        } else {
          // 光子命中 PSI：电子二次充能！阳光电梯 2 启动！
          psi.material.emissiveIntensity = 0.8;
          const e = makeGlowDot(0.16, C.electron);
          e.position.copy(pipeCurve.getPointAt(U_PSI));
          scene.add(e);
          state.electrons.push({ mesh: e, u: U_PSI, seg: 'B', end: 1.0 });
          highlightStep(5);
        }
      }
    });
  }

  // ── 卡尔文循环调度 ──
  function triggerCalvinCycle() {
    // 检查是否有足够的 ATP 与 NADPH 电池
    if (state.bat.atp < CALVIN.atpPerCO2 || state.bat.nadph < CALVIN.nadphPerCO2) {
      if (state.sunCutoff && expCouplingMsg) {
        expCouplingMsg.innerHTML = '<b style="color:#f43f5e">🪫 存量电池耗尽！</b>过程 ② 拼糖厂因缺电停工。<br><b>揭示本质：</b>两厂物理独立，但因电池纽带生死与共！点“重新打开太阳”复工。';
      }
      return; // 缺电，循环等待！
    }
    // 扣除电池
    state.bat.atp -= CALVIN.atpPerCO2;
    state.bat.nadph -= CALVIN.nadphPerCO2;

    if (state.sunCutoff && expCouplingMsg) {
      expCouplingMsg.innerHTML = '<b>🌑 暗室拼糖中：</b>消耗存量电池！剩余 <b style="color:var(--orange)">' + state.bat.atp + ' ATP</b> / <b style="color:var(--violet)">' + state.bat.nadph + ' NADPH</b>（印证：拼糖过程不吃光，吃电池即可独立运行）...';
    }

    state.turns++;
    state.calvinTurn = { stage: 'fix', t: 0 };

    // 1. CO₂ 从空气中飘向 RuBisCO
    const co2 = makeCO2Mesh();
    co2.position.set(RING_C.x + 3.2, RING_C.y + 4.0, 0);
    fly(co2, RING_C.clone().add(posFix), 3.2, () => {
      scene.remove(co2);
      rubiscoMesh.material.emissiveIntensity = 0.9;
      state.calvinTurn.stage = 'reduction';
      state.calvinTurn.t = 0;

      // 裂出 2 个 3-PGA 移动到还原工位
      const pga1 = make3PGAMesh();
      pga1.position.copy(RING_C).add(posFix);
      fly(pga1, RING_C.clone().add(posRed).add(new THREE.Vector3(-0.3, 0.2, 0)), 2.2, () => {
        // 在还原工位消费电池：放出 ADP 与 NADP⁺ 飞回膜上！
        for (let i = 0; i < 3; i++) {
          const adp = makeADPMesh();
          adp.position.copy(RING_C).add(posRed).add(new THREE.Vector3(0, i * 0.25, 0));
          fly(adp, new THREE.Vector3(atpX, 1.8, 0), 2.4, () => {
            scene.remove(adp);
            state.counts.adp++;
          });
        }
        for (let i = 0; i < 2; i++) {
          const nadpp = makeNADPMesh();
          nadpp.position.copy(RING_C).add(posRed).add(new THREE.Vector3(-0.4, i * 0.3, 0));
          fly(nadpp, new THREE.Vector3(fnrX, 2.3, 0), 2.4, () => {
            scene.remove(nadpp);
            state.counts.nadpp++;
          });
        }

        // 3-PGA 吸收能量，蜕变为金光闪闪的 G3P 糖积木！
        scene.remove(pga1);
        const g3p = makeG3PMesh();
        g3p.position.copy(RING_C).add(posRed);
        fly(g3p, RING_C.clone().add(posReg), 2.0, () => {
          scene.remove(g3p);
          state.calvinTurn.stage = 'regeneration';
          state.calvinTurn.t = 0;

          // 每 3 圈净产出 1 个 G3P 离开车间堆叠在糖堆！
          if (state.turns % CALVIN.g3pPerTurns === 0) {
            state.g3pCount++;
            const sugarCube = makeG3PMesh();
            sugarCube.position.copy(RING_C).add(posReg);
            fly(sugarCube, sugarPile.position.clone().add(new THREE.Vector3(((state.g3pCount % 4) - 1.5) * 0.7, Math.floor(state.g3pCount / 4) * 0.6, 0)), 2.6, () => {
              // 糖留在堆里
            });
          }
        });
      });
    });
  }

  // ── 步骤高亮与解说 ──
  const stepDivs = [...document.querySelectorAll('#stepList [data-step]')];
  function highlightStep(n) {
    stepDivs.forEach(d => d.classList.toggle('cur', +d.dataset.step === n));
  }

  // ── 互动部件检查器 ──
  const inspTitle = document.getElementById('inspTitle');
  const inspTag = document.getElementById('inspTag');
  const inspMetaphor = document.getElementById('inspMetaphor');
  const inspDesc = document.getElementById('inspDesc');
  const inspIO = document.getElementById('inspIO');

  function inspectComponent(name, desc) {
    if (!inspTitle) return;
    inspTitle.textContent = name;
    inspTag.textContent = '💡 点击查看档案';
    inspMetaphor.textContent = desc.split('】')[0] ? desc.split('】')[0] + '】' : '';
    inspDesc.textContent = desc.includes('】') ? desc.split('】')[1] : desc;
  }

  // 点击检测
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const canvasEl = document.getElementById('gl');

  canvasEl.addEventListener('pointerdown', (e) => {
    if (document.body.dataset.view !== 'light') return;
    const r = canvasEl.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const hit = raycaster.intersectObjects(clickables.map(c => c.mesh), true)[0];
    if (hit) {
      let targetObj = hit.object;
      while (targetObj && !targetObj.userData.name && targetObj.parent) targetObj = targetObj.parent;
      const found = clickables.find(c => c.mesh === targetObj || c.mesh === hit.object);
      if (found) {
        inspectComponent(found.name, found.desc);
      }
    }
  });

  // ── Z 方案小窗重绘（能量过山车）──
  const zCanvas = document.getElementById('zscheme');
  const zCtx = zCanvas ? zCanvas.getContext('2d') : null;
  const Z_NODES = [
    { x: 0.08, y: 0.78, label: '水 (H₂O)', col: '#38bdf8' },
    { x: 0.18, y: 0.18, label: '☀️ 电梯 1 (P680*)', col: '#facc15' },
    { x: 0.42, y: 0.58, label: 'b6f (泵 H⁺)', col: '#fb923c' },
    { x: 0.65, y: 0.18, label: '☀️ 电梯 2 (P700*)', col: '#facc15' },
    { x: 0.90, y: 0.78, label: '📦 NADPH', col: '#c084fc' },
  ];

  function drawZScheme(electronProgress) {
    if (!zCtx || !zCanvas) return;
    const W = zCanvas.width, H = zCanvas.height;
    zCtx.clearRect(0, 0, W, H);
    zCtx.textAlign = 'left';
    zCtx.textBaseline = 'top';

    // 标题与能量坐标轴
    zCtx.font = 'bold 12px "PingFang SC", sans-serif';
    zCtx.fillStyle = '#9ff0b5';
    zCtx.fillText('Z 方案：电子能量过山车 (两次充能)', 14, 12);

    zCtx.font = '10px "PingFang SC", sans-serif';
    zCtx.fillStyle = '#64748b';
    zCtx.fillText('势能 ↑ (高能量)', 14, 28);

    // 轨道曲线
    zCtx.strokeStyle = '#eab308';
    zCtx.lineWidth = 2.5;
    zCtx.beginPath();
    Z_NODES.forEach((pt, i) => {
      const px = 20 + pt.x * (W - 40);
      const py = 35 + pt.y * (H - 55);
      i === 0 ? zCtx.moveTo(px, py) : zCtx.lineTo(px, py);
    });
    zCtx.stroke();

    // 节点与标签
    Z_NODES.forEach((pt, idx) => {
      const px = 20 + pt.x * (W - 40);
      const py = 35 + pt.y * (H - 55);
      zCtx.fillStyle = pt.col;
      zCtx.beginPath();
      zCtx.arc(px, py, 4, 0, Math.PI * 2);
      zCtx.fill();

      zCtx.fillStyle = pt.col;
      if (idx === Z_NODES.length - 1) {
        zCtx.textAlign = 'right';
        zCtx.fillText(pt.label, px + 8, py - 10);
      } else if (idx === 0) {
        zCtx.textAlign = 'left';
        zCtx.fillText(pt.label, px - 6, py + 14);
      } else {
        zCtx.textAlign = 'center';
        zCtx.fillText(pt.label, px, py + (pt.y > 0.4 ? 14 : -10));
      }
    });

    // 实时电子小球
    if (electronProgress != null) {
      const u = Math.max(0, Math.min(1, electronProgress));
      const segCount = Z_NODES.length - 1;
      const idx = Math.min(segCount - 1, Math.floor(u * segCount));
      const k = (u * segCount) - idx;
      const p1 = Z_NODES[idx], p2 = Z_NODES[idx + 1];
      const ex = 20 + (p1.x + (p2.x - p1.x) * k) * (W - 40);
      const ey = 35 + (p1.y + (p2.y - p1.y) * k) * (H - 55);

      zCtx.fillStyle = '#38bdf8';
      zCtx.beginPath();
      zCtx.arc(ex, ey, 6, 0, Math.PI * 2);
      zCtx.fill();
      zCtx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      zCtx.beginPath();
      zCtx.arc(ex, ey, 10, 0, Math.PI * 2);
      zCtx.stroke();
    }
  }

  // ═══════════════════════════════════════════════════════
  // 7. 讲透三部曲（Guided Story Walkthrough）
  // ═══════════════════════════════════════════════════════
  const captionEl = document.getElementById('storyCaption');
  const TOUR_STEPS = [
    {
      cam: new THREE.Vector3(0.5, 0.6, 38.0),
      tar: new THREE.Vector3(0.5, 0.2, 0),
      title: '① 全景叶绿体微宇宙 (宏观总揽 · 生命机器)',
      text: '【置身叶绿体内部】左侧固态膜系统阳光充电放氧，右侧液态基质里吃电池拼糖，中间是源源不断的能量对流高铁。两厂分工明确、浑然一体！',
    },
    {
      cam: new THREE.Vector3(-7.5, 0.6, 20),
      tar: new THREE.Vector3(-7.5, 0.2, 0),
      title: '② 过程 ① · 膜上发电大坝 (类囊体膜系统)',
      text: '【独立硬件：固态膜机器】阳光打入 PSII 和 PSI，水分子在 OEC 刀口被切开发出氧气。下坡电子推动 b6f 泵建起质子大坝，高压质子冲刷纳米水轮机（ATP合酶）飞转压出满格电池！',
    },
    {
      cam: new THREE.Vector3(5.35, 0.6, 18),
      tar: new THREE.Vector3(5.35, 0.4, 0),
      title: '③ 唯一纽带 · 能量与原料穿梭专线 (城际物流)',
      text: '【两厂生死脐带】光反应绝不直接造糖，拼糖车间绝不直接吃光！两厂空间独立，全靠两条穿梭线连结：金色满电送去拼糖，青灰空电回膜充电！',
    },
    {
      cam: new THREE.Vector3(12.2, 0.6, 18),
      tar: new THREE.Vector3(12.2, 0.6, 0),
      title: '④ 过程 ② · 碳反应拼糖工场 (叶绿体基质液相)',
      text: '【独立软件：液相自催化循环】RuBisCO 抓取空气中的 CO₂，吞下送来的满电电池注入高能氢，拼装出 3碳糖 G3P！每 3 圈纯赚 1 块糖出厂，其余回炉再生抓手！',
    },
  ];

  function startTourStep(idx) {
    state.tourMode = true;
    state.tourStep = idx;
    state.speed = 0.8;
    const info = TOUR_STEPS[idx - 1];
    if (captionEl) {
      captionEl.style.display = 'block';
      captionEl.innerHTML = `<b style="color:#ffd54a;font-size:20px">${info.title}</b><br><span style="font-size:16px">${info.text}</span>`;
    }
    // 高亮导览按钮
    document.querySelectorAll('#tourStepList [data-tour]').forEach(b => {
      b.classList.toggle('cur', +b.dataset.tour === idx);
    });
  }

  function exitTour() {
    state.tourMode = false;
    state.speed = 1.0;
    if (captionEl) captionEl.style.display = 'none';
  }

  // ═══════════════════════════════════════════════════════
  // 8. UI 控制事件绑定
  // ═══════════════════════════════════════════════════════
  const bPause = document.getElementById('bLightPause');
  if (bPause) {
    bPause.addEventListener('click', () => {
      state.paused = !state.paused;
      bPause.textContent = state.paused ? '▶ 继续' : '⏸ 暂停';
      bPause.classList.toggle('on', state.paused);
    });
  }

  const bHome = document.getElementById('bLightHome');
  if (bHome) {
    bHome.addEventListener('click', () => {
      exitTour();
      camera.position.copy(HOME_CAM);
      controls.target.copy(HOME_TAR);
      controls.update();
    });
  }

  const bLabels = document.getElementById('bLabels');
  let showLabels = true;
  if (bLabels) {
    bLabels.addEventListener('click', () => {
      showLabels = !showLabels;
      bLabels.classList.toggle('on', showLabels);
      labels.forEach(l => l.visible = showLabels);
      leaderLines.forEach(l => l.visible = showLabels);
    });
  }

  const rLight = document.getElementById('rLight');
  const oLight = document.getElementById('oLight');
  if (rLight) {
    rLight.addEventListener('input', (e) => {
      state.lightRate = +e.target.value;
      if (oLight) oLight.textContent = state.lightRate.toFixed(1) + '×';
    });
  }

  const rSpeed = document.getElementById('rSpeed');
  const oSpeed = document.getElementById('oSpeed');
  if (rSpeed) {
    rSpeed.addEventListener('input', (e) => {
      state.speed = +e.target.value;
      if (oSpeed) oSpeed.textContent = state.speed.toFixed(1) + '×';
    });
  }

  const bCutLight = document.getElementById('bCutLight');
  if (bCutLight) {
    bCutLight.addEventListener('click', () => {
      state.sunCutoff = !state.sunCutoff;
      if (state.sunCutoff) {
        state.lightRate = 0;
        sunLight.intensity = 0.15;
        bCutLight.textContent = '☀️ 重新开启太阳';
        bCutLight.style.background = 'rgba(74,222,128,0.2)';
        bCutLight.style.borderColor = 'rgba(74,222,128,0.5)';
        bCutLight.style.color = '#86efac';
        if (expCouplingMsg) {
          expCouplingMsg.innerHTML = '<b>🌑 太阳已熄灭！</b>过程 ① 光反应断电停产。<br>此时过程 ② 拼糖厂有 <b style="color:var(--orange)">' + state.bat.atp + ' ATP</b> 与 <b style="color:var(--violet)">' + state.bat.nadph + ' NADPH</b> 存量电池，正在【独立】运转...';
        }
      } else {
        state.lightRate = 1.0;
        sunLight.intensity = 1.8;
        bCutLight.textContent = '🌑 关掉太阳';
        bCutLight.style.background = 'rgba(244,63,94,0.15)';
        bCutLight.style.borderColor = 'rgba(244,63,94,0.4)';
        bCutLight.style.color = '#fda4af';
        if (expCouplingMsg) {
          expCouplingMsg.innerHTML = '<b style="color:var(--green)">⚡ 阳光恢复！</b>光反应重新发电，电池送达，拼糖车间瞬间复工！';
        }
      }
    });
  }

  // 模式切换
  const mLive = document.getElementById('mLightLive');
  const mTour = document.getElementById('mLightTour');
  const tourList = document.getElementById('tourStepList');

  if (mLive && mTour) {
    mLive.addEventListener('click', () => {
      mLive.classList.add('on');
      mTour.classList.remove('on');
      if (tourList) tourList.style.display = 'none';
      exitTour();
    });
    mTour.addEventListener('click', () => {
      mTour.classList.add('on');
      mLive.classList.remove('on');
      if (tourList) tourList.style.display = 'flex';
      startTourStep(1);
    });
  }

  document.querySelectorAll('#tourStepList [data-tour]').forEach(b => {
    b.addEventListener('click', () => {
      startTourStep(+b.dataset.tour);
    });
  });

  const bLightTourBar = document.getElementById('bLightTour');
  if (bLightTourBar) {
    bLightTourBar.addEventListener('click', () => {
      if (mTour) mTour.click();
    });
  }

  // ═══════════════════════════════════════════════════════
  // 9. 主更新循环
  // ═══════════════════════════════════════════════════════
  let photonClock = 0;
  let waterClock = 0;
  let altLight = 0;

  function update(dt0) {
    const dt = state.paused ? 0 : dt0 * state.speed;

    // 导览模式平滑推镜
    if (state.tourMode) {
      const targetSetting = TOUR_STEPS[state.tourStep - 1];
      camera.position.lerp(targetSetting.cam, 0.04);
      controls.target.lerp(targetSetting.tar, 0.04);
    }

    // ① 水补给时钟
    waterClock += dt * state.lightRate;
    if (waterClock > 1.2) {
      waterClock = 0;
      supplyWater();
    }

    // ② 光子定时打落
    photonClock += dt * state.lightRate;
    if (photonClock > 0.6) {
      photonClock = 0;
      altLight ^= 1;
      launchPhoton(null, altLight ? 'PSII' : 'PSI');
    }

    // 光子下落位移
    for (let i = state.photons.length - 1; i >= 0; i--) {
      const p = state.photons[i];
      const dx = p.tx - p.mesh.position.x;
      const dy = p.ty - p.mesh.position.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.3) {
        scene.remove(p.mesh);
        state.photons.splice(i, 1);
        p.onHit?.();
        continue;
      }
      p.mesh.position.x += (dx / d) * 10 * dt;
      p.mesh.position.y += (dy / d) * 10 * dt;
    }

    // ③ 电子沿轨道滑行
    let activeZU = null;
    for (let i = state.electrons.length - 1; i >= 0; i--) {
      const e = state.electrons[i];
      const u0 = e.u;
      e.u += 0.28 * dt;

      // 经过 b6f 时：抽水泵动作，从基质抽 H⁺ 喷入腔内！
      if (e.seg === 'A' && u0 < U_B6F && e.u >= U_B6F) {
        b6f.material.emissiveIntensity = 0.9;
        highlightStep(3);
        // 抽水动画粒子
        const pumpH = makeGlowDot(0.13, C.hplus);
        pumpH.position.set(b6fX, 1.8, 0.3);
        scene.add(pumpH);
        fly(pumpH, new THREE.Vector3(b6fX, -1.5, 0.3), 3.5, () => {
          scene.remove(pumpH);
          addHToLumen(b6fX);
        });
      }

      // 到达终点
      if (e.u >= e.end) {
        scene.remove(e.mesh);
        state.electrons.splice(i, 1);
        if (e.seg === 'B') {
          // 到达 FNR：装包成满格 NADPH 电池！
          state.psiElectrons++;
          if (state.psiElectrons >= 2) {
            state.psiElectrons = 0;
            state.counts.nadph++;
            highlightStep(6);
            fnr.material.emissiveIntensity = 0.9;
            const fullNADPH = makeNADPHMesh();
            fullNADPH.position.set(fnrX, 2.6, 0);
            fly(fullNADPH, HIGHWAY_END.clone().add(new THREE.Vector3(0, 0.4, 0)), 2.8, () => {
              scene.remove(fullNADPH);
              state.bat.nadph = Math.min(8, state.bat.nadph + 1);
            });
          }
        }
        continue;
      }

      e.mesh.position.copy(pipeCurve.getPointAt(Math.min(e.u, 1)));
      activeZU = Math.max(activeZU ?? 0, e.u);
    }
    state.zPos = activeZU;

    // ④ ATP 合酶发电水轮机旋转与出电
    // 腔内高压 H⁺ 驱动水轮机
    const waterFlowSpeed = Math.min(3.2, 1.0 + state.lumenHCount * 0.12);
    state.rotorAngle += dt * waterFlowSpeed * 3.5;
    rotor.rotation.y = state.rotorAngle;
    knob.rotation.y = state.rotorAngle;

    state.atpAccum += dt * (waterFlowSpeed / H_PER_ATP) * 0.95;
    if (state.atpAccum >= 1.0) {
      state.atpAccum -= 1.0;
      drainHFromLumen();
      state.counts.atp++;
      highlightStep(4);
      // 产出一枚亮闪闪的 ATP 电池送上高速公路！
      const fullATP = makeATPMesh();
      fullATP.position.set(atpX, 2.4, 0);
      fly(fullATP, HIGHWAY_END.clone(), 3.0, () => {
        scene.remove(fullATP);
        state.bat.atp = Math.min(12, state.bat.atp + 1);
      });
    }

    // ⑤ 质子水库与基质微流星尘微动
    const nowTime = performance.now() / 1000;
    state.lumenHDots.forEach(dot => {
      dot.position.y = dot.userData.baseY + Math.sin(nowTime * 2.5 + dot.userData.seed) * 0.1;
    });
    stromaDust.forEach(dot => {
      dot.position.y = dot.userData.baseY + Math.sin(nowTime * dot.userData.speed + dot.userData.seed) * 0.25;
      dot.position.x += Math.cos(nowTime * 0.3 + dot.userData.seed) * 0.005;
    });

    // 动态标签距离补偿算法（推近时防膨胀遮挡）
    const camDistRef = 34.0;
    labels.forEach(l => {
      if (l.userData.baseScale) {
        const d = camera.position.distanceTo(l.position);
        const factor = Math.pow(Math.max(0.4, d / camDistRef), 0.85);
        l.scale.copy(l.userData.baseScale).multiplyScalar(factor);
      }
    });

    // ⑥ 氧气泡浮动升空
    for (let i = state.o2Bubbles.length - 1; i >= 0; i--) {
      const o = state.o2Bubbles[i];
      o.t += dt;
      o.mesh.position.y += dt * 1.8;
      o.mesh.position.x -= dt * 0.4;
      if (o.t > 2.8) {
        scene.remove(o.mesh);
        state.o2Bubbles.splice(i, 1);
      }
    }

    // ⑦ 飞行中的片与电池位移
    for (let i = state.fliers.length - 1; i >= 0; i--) {
      const f = state.fliers[i];
      const dist = f.mesh.position.distanceTo(f.target);
      if (dist < 0.25) {
        f.onArrive?.();
        scene.remove(f.mesh);
        state.fliers.splice(i, 1);
        continue;
      }
      f.mesh.position.lerp(f.target, Math.min(1, f.speed * dt));
    }

    // ⑧ 卡尔文拼糖周期调度
    state.calvinTimer -= dt;
    if (state.calvinTimer <= 0) {
      state.calvinTimer = 1.4;
      triggerCalvinCycle();
    }

    // 渐退发光强度
    psii.material.emissiveIntensity = Math.max(0.2, psii.material.emissiveIntensity - dt * 1.2);
    b6f.material.emissiveIntensity = Math.max(0.2, b6f.material.emissiveIntensity - dt * 1.2);
    psi.material.emissiveIntensity = Math.max(0.2, psi.material.emissiveIntensity - dt * 1.2);
    fnr.material.emissiveIntensity = Math.max(0.2, fnr.material.emissiveIntensity - dt * 1.2);
    rubiscoMesh.material.emissiveIntensity = Math.max(0.4, rubiscoMesh.material.emissiveIntensity - dt * 1.0);

    // 重绘 Z 方案图
    drawZScheme(state.zPos);

    controls.update();
  }

  // ── HUD 数据面板同步 ──
  const hudO2 = document.getElementById('hO2');
  const hudAtp = document.getElementById('hBatAtp');
  const hudNadph = document.getElementById('hBatNadph');
  const hudTurns = document.getElementById('hTurns');
  const hudG3p = document.getElementById('hG3p');
  const hudKok = document.getElementById('hKok');

  function refreshHUD() {
    if (hudO2) hudO2.textContent = state.counts.o2;
    if (hudAtp) hudAtp.textContent = state.bat.atp;
    if (hudNadph) hudNadph.textContent = state.bat.nadph;
    if (hudKok) hudKok.textContent = KOK_STATES[state.kokIdx];
    if (hudTurns) hudTurns.textContent = state.turns;
    if (hudG3p) hudG3p.textContent = state.g3pCount;
  }

  return {
    scene,
    camera,
    controls,
    update,
    refreshHUD,
    onShow() {
      // 切换到本视图时的初始化
      controls.enabled = true;
    },
    onResize(w, h) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      // 小屏或竖屏智能拉远距离，确保左右两厂与高架专线完整可见
      if (w / h < 1.35) {
        camera.position.z = 38.0 * (1.35 / (w / h));
      }
    },
    getInfo() {
      return {
        o2: state.counts.o2,
        bat: { ...state.bat },
        turns: state.turns,
        g3p: state.g3pCount,
        kok: KOK_STATES[state.kokIdx],
      };
    },
  };
}
