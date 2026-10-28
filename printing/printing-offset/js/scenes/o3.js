// printing-offset/js/scenes/o3.js — O3 橡皮布与三滚筒（拍点：水膜被橡皮布甩飞的水雾粒子）
// three.js：stage3d + 印版滚筒 (Plate) → 橡皮布滚筒 (Blanket) → 压印滚筒 (Impression) + 3D工具材料标注。仅浏览器使用。
'use strict';

import * as THREE from 'three';
import { stage3d, tween, sound } from '../../../../common/js/printing/sceneKit.js';
import { metalCanvas } from '../../../../common/js/printing/textures.js';

export function create(root, kit) {
  const { t } = kit;

  const st = stage3d(root, {
    height: 300,
    bg: '#1c222b',
    theta: 0.08,
    phi: 1.38,
    radius: 5.8,
    target: [0, 0.85, 0],
  });
  const { scene } = st;

  const metalBump = new THREE.CanvasTexture(metalCanvas(256, '#b0b8c2'));
  const mats = {
    plate: new THREE.MeshStandardMaterial({
      map: new THREE.CanvasTexture(cylinderSkin('#8ca0b5', '#1d3557', 'PRINT 印', false)),
      roughness: 0.35,
      metalness: 0.65,
    }),
    blanket: new THREE.MeshStandardMaterial({
      map: new THREE.CanvasTexture(cylinderSkin('#2b4c5e', '#0f172a', 'PRINT 印', true)),
      roughness: 0.78,
      metalness: 0.12,
    }),
    impression: new THREE.MeshStandardMaterial({
      map: new THREE.CanvasTexture(cylinderSkin('#7a828c', '#495057', '', false)),
      bumpMap: metalBump,
      bumpScale: 0.01,
      roughness: 0.28,
      metalness: 0.82,
    }),
    hub: new THREE.MeshStandardMaterial({ color: 0x3b424c, roughness: 0.4, metalness: 0.8 }),
  };

  function buildCylinder(r, mat, x, y) {
    const grp = new THREE.Group();
    grp.position.set(x, y, 0);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 2.7, 48), mat);
    body.rotation.z = Math.PI / 2;
    grp.add(body);
    // 两侧金属轴颈齿轮盘
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.28, r * 0.28, 3.2, 24), mats.hub);
    shaft.rotation.z = Math.PI / 2;
    grp.add(shaft);
    scene.add(grp);
    return grp;
  }

  // 三滚筒真实相切啮合排布：印版滚筒(左上) → 橡皮布滚筒(中心) → 压印滚筒(右下)
  const plate = buildCylinder(0.72, mats.plate, -1.32, 1.28);
  const blanket = buildCylinder(0.78, mats.blanket, 0, 0.56);
  const impression = buildCylinder(0.72, mats.impression, 1.32, 1.28);

  // 穿过橡皮布与压印滚筒压印线 (Nip) 的纸带
  const sheetTex = new THREE.CanvasTexture(paperStripSkin());
  sheetTex.wrapS = THREE.RepeatWrapping;
  sheetTex.wrapT = THREE.ClampToEdgeWrapping;
  const sheetGeo = new THREE.PlaneGeometry(2.4, 3.2, 24, 1);
  const sheetMat = new THREE.MeshStandardMaterial({
    map: sheetTex,
    roughness: 0.85,
    side: THREE.DoubleSide,
  });
  const sheet = new THREE.Mesh(sheetGeo, sheetMat);
  sheet.position.set(0.66, 0.92, 0);
  sheet.rotation.y = Math.PI / 2;
  sheet.rotation.x = -0.52;
  scene.add(sheet);

  // 水雾粒子对象池（避免每帧 new Mesh 造成 GC 抖动）
  const POOL_SIZE = 28;
  const dropGeo = new THREE.SphereGeometry(0.028, 8, 8);
  const drops = [];
  for (let i = 0; i < POOL_SIZE; i++) {
    const m = new THREE.Mesh(dropGeo, new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0,
    }));
    scene.add(m);
    drops.push({
      mesh: m,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0,
    });
  }

  function spawnDrop() {
    const slot = drops.find((d) => d.life <= 0);
    if (!slot) return;
    slot.life = 1;
    slot.mesh.position.set((Math.random() - 0.5) * 1.9, 1.28, (Math.random() - 0.5) * 0.45);
    slot.vx = -0.6 + (Math.random() - 0.5) * 1.4;
    slot.vy = 1.25 + Math.random() * 1.1;
    slot.vz = (Math.random() - 0.5) * 1.2;
    slot.mesh.material.opacity = 0.88;
  }

  let spinning = false;
  let angle = 0;

  // 按钮
  const btn = document.createElement('button');
  btn.className = 'steps';
  btn.style.display = 'inline-block';
  btn.textContent = t('o3.spin');
  root.appendChild(btn);

  const water = document.createElement('div');
  water.className = 'card';
  water.textContent = t('o3.waterOff');
  root.appendChild(water);

  btn.addEventListener('click', async () => {
    if (spinning) return;
    spinning = true;
    sound.play('ratchet');
    await tween(2200, (e, raw) => {
      kit.step(raw < 0.25 ? 0 : raw < 0.5 ? 1 : raw < 0.75 ? 2 : 3);
    });
    spinning = false;
  });

  st.onFrame((dt) => {
    // 连续平滑对滚（印版正转 +ω，橡皮布反转 -ω 承接反向图文，压印滚筒正转 +ω 还原正向图文）
    const speed = spinning ? 3.4 : 1.55;
    angle += dt * speed;
    plate.rotation.x = angle;
    blanket.rotation.x = -angle * (0.72 / 0.78);
    impression.rotation.x = angle;

    // 纸张纹理同步传送
    sheetTex.offset.y = -(angle * 0.22) % 1;

    // 自动在 4 个步骤间连续循环推进
    if (!spinning) {
      const autoStep = Math.floor((angle / (Math.PI * 0.45)) % 4);
      kit.step(autoStep);
    }

    // 橡皮布疏水甩出水雾微粒
    if (Math.random() < (spinning ? 0.65 : 0.35)) spawnDrop();
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      if (d.life <= 0) continue;
      d.mesh.position.x += d.vx * dt;
      d.mesh.position.y += d.vy * dt;
      d.mesh.position.z += d.vz * dt;
      d.vy -= 4.2 * dt;
      d.life -= dt * 1.15;
      d.mesh.material.opacity = Math.max(0, d.life * 0.85);
    }

    // 3D 实时工具/材料/工序空间标注
    st.label3D([-1.32, 2.02, 0], '🔧 印版滚筒 Plate (铝版正向图文·水墨同版)', { dx: -16, dy: -22, color: '#f59e0b' });
    st.label3D([-0.55, 1.52, 0.3], '💧 疏水斥离：润版水被橡皮布甩出不湿纸', { dx: -20, dy: -18, color: '#38bdf8' });
    st.label3D([0, -0.22, 0.5], '🧱 弹性橡皮布滚筒 Blanket (承接反向油墨)', { dx: 0, dy: 22, color: '#34d399' });
    st.label3D([1.32, 2.02, 0], '⚙️ 压印滚筒 Impression + 连续纸带 (还原正字)', { dx: 16, dy: -22, color: '#a78bfa' });
  });

  return {
    mount() { st.resize(); },
    rerender() {
      btn.textContent = t('o3.spin');
      water.textContent = t('o3.waterOff');
    },
    onShow() { st.onShow(); },
    onHide() { st.onHide(); },
    dispose() { st.dispose(); },
  };
}

function cylinderSkin(base, stripe, label, mirror) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 512, 128);
  g.fillStyle = stripe;
  for (let i = 0; i < 8; i++) {
    g.fillRect(i * 64 + 10, 0, 22, 128);
  }
  if (label) {
    g.save();
    g.fillStyle = '#f8fafc';
    g.font = '700 22px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    if (mirror) {
      g.translate(256, 64);
      g.scale(-1, 1);
      g.fillText(label + ' (反)', 0, 0);
    } else {
      g.fillText(label + ' (正)', 256, 64);
    }
    g.restore();
  }
  return c;
}

function paperStripSkin() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#faf5e8';
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#1d3557';
  for (let y = 24; y < 256; y += 64) {
    g.fillRect(28, y, 200, 14);
    g.fillStyle = '#334155';
    g.font = '700 18px sans-serif';
    g.fillText('OFFSET 胶印正字', 42, y + 36);
    g.fillStyle = '#1d3557';
  }
  return c;
}
