// printing-movable-type/js/scenes/m3.js — M3 转轮排字盘（拍点：大转轮载着字格转到面前的“以字就人”）
// three.js r160：stage3d + 木纹大转轮 + 24 扇区隔板 + 字格面片 + 拣字夹手实时取字入盘。仅浏览器使用。
'use strict';

import * as THREE from 'three';
import { stage3d, tween, sound, createMovableType3D, drawMacroInset } from '../../../../common/js/printing/sceneKit.js';
import { woodCanvas, metalCanvas, toTexture } from '../../../../common/js/printing/textures.js';
import { wheelRetrievalTime, shelfWalkTime } from '../model/wheel.js';
import { WHEEL_DIAMETER_CHI, WHEEL_HEIGHT_CHI } from '../facts.js';

const CHARS = '東冬江支微魚虞齊佳真文元寒刪先蕭肴豪歌麻陽唐庚青'.split('').slice(0, 24);

export function create(root, kit) {
  const { t } = kit;

  const st = stage3d(root, {
    height: 310,
    bg: '#f4ede0',
    theta: 0,
    phi: 0.96,
    radius: 6.2,
    target: [0, 0.25, 0.4],
  });
  const { scene } = st;

  const woodTex = toTexture(THREE, woodCanvas('#a67244', 7), 2, 2);
  const darkWoodMat = new THREE.MeshStandardMaterial({ map: woodTex, color: 0x8b5a2b, roughness: 0.68, metalness: 0.06 });
  const lightWoodMat = new THREE.MeshStandardMaterial({ map: woodTex, color: 0xc89b6e, roughness: 0.72, metalness: 0.05 });
  const ironMat = new THREE.MeshStandardMaterial({ map: toTexture(THREE, metalCanvas('#5b6770', 11), 1, 1), roughness: 0.38, metalness: 0.75 });

  // 地面底座与立柱（轮面离地约三尺）
  const baseStand = new THREE.Group();
  const basePlate = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.5, 0.14, 36), darkWoodMat);
  basePlate.position.y = -0.68;
  baseStand.add(basePlate);
  // 拣字人前方的取字准星标志台 + 排字盘（“以字就人”工位）
  const marker = new THREE.Mesh(
    new THREE.ConeGeometry(0.14, 0.28, 4),
    new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.4 })
  );
  marker.rotation.x = -Math.PI / 2;
  marker.position.set(0, 0.22, 2.38);
  baseStand.add(marker);

  // 拣字员面前的木制排字盘（承接取出的活字）
  const galleyTray = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.08, 0.48),
    darkWoodMat
  );
  galleyTray.position.set(0, -0.05, 2.75);
  baseStand.add(galleyTray);
  scene.add(baseStand);

  // 转轮本体（直径约七尺 → 场景 2.25 单位半径，微微前倾方便俯视取字）
  const wheel = new THREE.Group();
  wheel.rotation.x = 0.12;
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(2.25, 2.25, 0.22, 64), lightWoodMat);
  wheel.add(disc);
  // 外圈木框立沿
  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.22, 0.075, 16, 64), darkWoodMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.13;
  wheel.add(rim);
  const innerRim = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.055, 14, 48), darkWoodMat);
  innerRim.rotation.x = Math.PI / 2;
  innerRim.position.y = 0.13;
  wheel.add(innerRim);

  // 中心铁轴与轴套
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.55, 24), ironMat);
  axle.position.y = -0.22;
  wheel.add(axle);
  const hubCap = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 0.28, 24), darkWoodMat);
  hubCap.position.y = 0.12;
  wheel.add(hubCap);

  // 24 道辐射木隔板 + 24 个韵部字格
  const ribGeo = new THREE.BoxGeometry(0.04, 0.12, 1.32);
  const labelMeshes = CHARS.map((ch, i) => {
    const ang = (i / CHARS.length) * Math.PI * 2;
    const ribAngle = ang + Math.PI / CHARS.length;
    const rib = new THREE.Mesh(ribGeo, darkWoodMat);
    rib.position.set(Math.sin(ribAngle) * 1.52, 0.14, Math.cos(ribAngle) * 1.52);
    rib.rotation.y = ribAngle;
    wheel.add(rib);

    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = i % 2 ? '#eadbc0' : '#f7ecd6';
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = '#8b5a2b'; g.lineWidth = 6; g.strokeRect(3, 3, 122, 122);
    g.fillStyle = '#7c5329'; g.font = '600 18px system-ui'; g.textAlign = 'left';
    g.fillText(String(i + 1).padStart(2, '0'), 12, 24);
    g.fillStyle = '#1a1613';
    g.font = "700 62px 'Noto Sans SC', serif";
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(ch, 64, 74);
    const tex = new THREE.CanvasTexture(c);
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.08, 0.52),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.78 })
    );
    mesh.position.set(Math.sin(ang) * 1.54, 0.13, Math.cos(ang) * 1.54);
    mesh.rotation.y = ang;
    wheel.add(mesh);
    return { mesh, ch, ang, idx: i };
  });
  scene.add(wheel);

  // 动态拣字竹夹 + 被夹起的 3D 木活字（可视化“坐取活字入盘”完整工序）
  const pickerGroup = new THREE.Group();
  const tongLeft = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.55, 0.04), lightWoodMat);
  tongLeft.position.set(-0.11, 0.35, 0);
  tongLeft.rotation.z = -0.08;
  const tongRight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.55, 0.04), lightWoodMat);
  tongRight.position.set(0.11, 0.35, 0);
  tongRight.rotation.z = 0.08;
  const pickedBlock = createMovableType3D('魚', { w: 0.24, h: 0.28, d: 0.24, matType: 'wood' });
  pickedBlock.position.set(0, 0.04, 0);
  pickerGroup.add(tongLeft, tongRight, pickedBlock);
  pickerGroup.position.set(0, 0.55, 2.1);
  scene.add(pickerGroup);

  let spin = 0, targetChar = CHARS[5], busy = false;
  let found = CHARS[5];
  let autoTimer = 0;
  let phaseLabel = '转动大轮寻韵';

  // UI
  const bar = document.createElement('div');
  bar.className = 'steps';
  const lbl = document.createElement('span');
  lbl.style.alignSelf = 'center';
  lbl.style.fontWeight = '600';
  lbl.textContent = t('m3.find') + ' 「' + targetChar + '」';
  const spinBtn = document.createElement('button');
  spinBtn.textContent = t('m3.spin');
  bar.append(lbl, spinBtn);
  root.appendChild(bar);

  const read = document.createElement('div');
  read.className = 'readout';
  read.innerHTML = `<span>${t('m3.wheelTime')}: <b id="mt-wheel">—</b></span>
    <span>${t('m3.shelfTime')}: <b id="mt-shelf">—</b></span>
    <span>${t('m3.found')}: <b id="mt-found" style="color:#059669">—</b></span>`;
  root.appendChild(read);
  const card = document.createElement('div');
  card.className = 'card';
  card.textContent = `${t('m3.diam')} · ${t('m3.case')}`;
  root.appendChild(card);

  async function doSpin(withSound = false) {
    if (busy) return;
    busy = true;
    const idx = CHARS.indexOf(targetChar);
    const targetAng = -labelMeshes[idx].ang;
    const curBase = Math.ceil((wheel.rotation.y - targetAng) / (Math.PI * 2)) * (Math.PI * 2);
    const goal = curBase + targetAng + Math.PI * 2;
    const start = wheel.rotation.y;

    kit.step(0);
    phaseLabel = `① 呼韵报号：「${targetChar}」在第 ${idx + 1} 韵扇区`;
    await tween(380, (e) => {
      pickerGroup.position.set(0, 0.65 + 0.1 * e, 2.35);
    });

    kit.step(1);
    phaseLabel = `② 轻推楠木大转轮（直径${WHEEL_DIAMETER_CHI}尺·高${WHEEL_HEIGHT_CHI}尺）`;
    if (withSound) sound.play('ratchet');
    await tween(1200, (e) => {
      if (e > 0.45) kit.step(2);
      spin = wheel.rotation.y = start + (goal - start) * e;
      pickerGroup.position.set(Math.sin(e * Math.PI) * 0.15, 0.72, 2.2 - 0.35 * Math.sin(e * Math.PI));
    });

    kit.step(3);
    found = targetChar;
    phaseLabel = `③ 扇区精准停在面前 · 竹夹取「${found}」字入排版盘`;
    if (withSound) sound.play('pop');
    const wT = wheelRetrievalTime({ sectors: 24, targetIndex: Math.max(2, idx), rpm: 12 });
    const sT = shelfWalkTime({ cells: 24, targetIndex: Math.max(2, idx), paceCellsPerSec: 0.8 });
    read.querySelector('#mt-wheel').textContent = wT.toFixed(1) + ' s';
    read.querySelector('#mt-shelf').textContent = sT.toFixed(1) + ' s';
    read.querySelector('#mt-found').textContent = `「${found}」`;

    // 拣字夹手从轮面扇区（z=1.55）夹起木活字送入前方排字盘（z=2.75）
    await tween(850, (e) => {
      const zPos = 1.55 + (2.75 - 1.55) * e;
      const yArc = 0.32 + Math.sin(e * Math.PI) * 0.48;
      pickerGroup.position.set(0, yArc, zPos);
      if (e > 0.5) kit.step(4);
    });

    targetChar = CHARS[(idx + 7) % CHARS.length];
    lbl.textContent = t('m3.find') + ' 「' + targetChar + '」';
    busy = false;
  }

  spinBtn.addEventListener('click', () => {
    autoTimer = -2;
    doSpin(true);
  });

  st.onFrame((dt, now) => {
    if (!busy) {
      autoTimer += dt;
      if (autoTimer > 0.35) {
        autoTimer = 0;
        doSpin(false);
      }
      wheel.rotation.y = spin + Math.sin(now * 1.2) * 0.015;
    }
    // 已定位的韵部字格平稳升起高亮
    labelMeshes.forEach((l) => {
      const isHit = l.ch === found;
      const targetS = isHit ? 1.24 : 1;
      const targetY = isHit ? 0.24 : 0.13;
      l.mesh.scale.lerp(new THREE.Vector3(targetS, targetS, targetS), 0.14);
      l.mesh.position.y += (targetY - l.mesh.position.y) * 0.14;
    });

    // 3D 实时工具/材料/工序空间标注
    st.label3D([0, 0.28, -1.2], '🔧 楠木大转轮 (直径七尺 · 铁轴省力)', { dx: 0, dy: -26, color: '#f59e0b' });
    st.label3D([-1.45, 0.18, 0.4], '🧱 24韵部扇形木活字格', { dx: -20, dy: -22, color: '#38bdf8' });
    st.label3D(
      [pickerGroup.position.x, pickerGroup.position.y + 0.25, pickerGroup.position.z],
      `⚙️ 以字就人：${phaseLabel}`,
      { dx: 18, dy: -24, color: '#34d399' }
    );
    st.label3D([0, -0.05, 2.75], `🧱 拣字员排字盘 (已取「${found}」)`, { dx: 0, dy: 24, color: '#a78bfa' });

    const g = st.g, W = st.w;
    const isEn = kit.lang && kit.lang() === 'en';
    const mw = 156, mh = 132;
    drawMacroInset(g, W - mw - 12, 14, mw, mh, isEn ? '24-Rhyme Sector Radar' : '24韵部扇区寻字微视', (mg, iw) => {
      const cx = iw / 2, cy = 46, r = 32;
      mg.strokeStyle = 'rgba(217, 119, 6, 0.55)';
      mg.lineWidth = 1.4;
      mg.beginPath(); mg.arc(cx, cy, r, 0, Math.PI * 2); mg.stroke();
      mg.beginPath(); mg.arc(cx, cy, r * 0.42, 0, Math.PI * 2); mg.stroke();
      for (let s = 0; s < 12; s++) {
        const a = (s / 12) * Math.PI * 2 + wheel.rotation.y;
        mg.beginPath();
        mg.moveTo(cx + Math.cos(a) * r * 0.42, cy + Math.sin(a) * r * 0.42);
        mg.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        mg.stroke();
      }
      mg.fillStyle = '#34d399';
      mg.beginPath(); mg.arc(cx, cy + r - 5, 4.5, 0, Math.PI * 2); mg.fill();
      mg.fillStyle = '#fde68a';
      mg.font = '600 9.5px system-ui';
      mg.textAlign = 'center';
      mg.fillText(isEn ? `Picked: "${found}" · Zero Walk` : `当前取字：「${found}」· 坐取免走动`, cx, 96);
    });
  });

  return {
    mount() { st.resize(); },
    rerender() {
      lbl.textContent = t('m3.find') + ' 「' + targetChar + '」';
      spinBtn.textContent = t('m3.spin');
      card.textContent = `${t('m3.diam')} · ${t('m3.case')}`;
    },
    onShow() {
      autoTimer = 0.25;
      st.onShow();
    },
    onHide() { st.onHide(); },
    dispose() { st.dispose(); },
  };
}
