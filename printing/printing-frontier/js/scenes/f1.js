// printing-frontier/js/scenes/f1.js — F1 把层当活字（拍点：千层薄片逐层生长成花瓶的延时镜头）
// three.js：stage3d + 层堆 vase + 3D 打印喷头/激光头实时走刀轨迹 + 3D工具材料标注；高度与层厚滑块切片。仅浏览器使用。
'use strict';

import * as THREE from 'three';
import { stage3d, sound } from '../../../../common/js/printing/sceneKit.js';
import { metalCanvas } from '../../../../common/js/printing/textures.js';
import { slice } from '../model/slicing.js';
import { GE_NOZZLE_PARTS, TERRAN_PRINTED_PCT, EAR_YEAR } from '../facts.js';

export function create(root, kit) {
  const { t } = kit;

  const st = stage3d(root, {
    height: 300,
    bg: '#181d26',
    theta: 0.65,
    phi: 1.24,
    radius: 7.4,
    target: [0, 1.85, 0],
  });
  const { scene } = st;

  // 打印平台底座 (Build Plate)
  const plateTex = new THREE.CanvasTexture(metalCanvas(256, '#475569'));
  const buildPlate = new THREE.Mesh(
    new THREE.CylinderGeometry(2.1, 2.2, 0.14, 48),
    new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.4, metalness: 0.75 })
  );
  buildPlate.position.y = -0.07;
  scene.add(buildPlate);

  const coolMat = new THREE.MeshStandardMaterial({
    color: 0xe0688b,
    roughness: 0.42,
    metalness: 0.18,
  });
  const hotMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 0.65,
    roughness: 0.25,
    metalness: 0.1,
  });

  const layerGroup = new THREE.Group();
  scene.add(layerGroup);

  // 花瓶半径剖面（高度 0..1 → 半径）
  const profile = (u) => 0.62 + Math.sin(u * Math.PI * 1.15) * 0.65 - u * 0.12;

  const MAX_LAYERS = 60;
  let targetLayers = 48;
  const layerMeshes = [];
  for (let i = 0; i < MAX_LAYERS; i++) {
    const u = i / (MAX_LAYERS - 1);
    const r = profile(u);
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, 0.068, 42),
      coolMat
    );
    m.position.y = 0.04 + u * 3.8;
    m.visible = false;
    layerGroup.add(m);
    layerMeshes.push({ mesh: m, u, r });
  }

  // 3D 打印喷头组件 + 熔融光点 (Printhead Nozzle & Active Extrusion Bead)
  const nozzleGroup = new THREE.Group();
  const bodyMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.45, 20),
    new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.3, metalness: 0.85 })
  );
  bodyMesh.position.y = 0.38;
  const tipMesh = new THREE.Mesh(
    new THREE.ConeGeometry(0.14, 0.24, 20),
    new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.35, metalness: 0.8 })
  );
  tipMesh.rotation.x = Math.PI;
  tipMesh.position.y = 0.08;
  const beadMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 14, 14),
    new THREE.MeshBasicMaterial({ color: 0xfef08a })
  );
  nozzleGroup.add(bodyMesh, tipMesh, beadMesh);
  scene.add(nozzleGroup);

  // 滑块 + 读数
  const hRow = document.createElement('div');
  hRow.className = 'slider-row';
  hRow.innerHTML = `<span>${t('f1.height')} (mm)</span><input id="fr-h" type="range" min="10" max="200" value="120"><span class="val" id="fr-hv">120</span>`;
  root.appendChild(hRow);

  const lRow = document.createElement('div');
  lRow.className = 'slider-row';
  lRow.innerHTML = `<span>${t('f1.layer')} (mm)</span><input id="fr-l" type="range" min="10" max="40" value="20"><span class="val" id="fr-lv">0.20</span>`;
  root.appendChild(lRow);

  const read = document.createElement('div');
  read.className = 'readout';
  read.innerHTML = `<span>${t('f1.layers')}: <b id="fr-n">—</b></span><span>${t('f1.time')}: <b id="fr-t">—</b></span>`;
  root.appendChild(read);

  const apps = document.createElement('div');
  apps.className = 'card';
  apps.textContent = t('f1.apps') + `（GE ${GE_NOZZLE_PARTS}→1 · Terran ${TERRAN_PRINTED_PCT}% · ${EAR_YEAR}）`;
  root.appendChild(apps);

  let buildProgress = 0; // 0..1 延时生长进度
  let userHoldUntil = 0;

  function update(manual = false) {
    if (manual) userHoldUntil = performance.now() + 5000;
    const hMm = Number(root.querySelector('#fr-h').value);
    const layerRaw = Number(root.querySelector('#fr-l').value) / 100;
    root.querySelector('#fr-hv').textContent = String(hMm);
    root.querySelector('#fr-lv').textContent = layerRaw.toFixed(2);
    const { layers, timeMin } = slice(hMm, layerRaw);
    root.querySelector('#fr-n').textContent = String(layers);
    root.querySelector('#fr-t').textContent = timeMin + ' min';
    targetLayers = Math.max(6, Math.min(MAX_LAYERS, Math.round((hMm / 200) * MAX_LAYERS)));
    if (manual) buildProgress = 0.85;
  }

  hRow.querySelector('#fr-h').addEventListener('input', () => {
    kit.step(1);
    update(true);
    sound.play('tick');
  });
  lRow.querySelector('#fr-l').addEventListener('input', () => {
    kit.step(1);
    update(true);
    sound.play('tick');
  });

  st.onFrame((dt, now) => {
    if (performance.now() > userHoldUntil) {
      buildProgress = (buildProgress + dt * 0.22) % 1.12;
    }
    const clampedProg = Math.min(1, buildProgress);
    const currentLayerIdx = Math.max(1, Math.min(targetLayers, Math.floor(clampedProg * targetLayers)));

    kit.step(clampedProg < 0.2 ? 0 : clampedProg < 0.45 ? 1 : clampedProg < 0.88 ? 2 : 3);

    layerMeshes.forEach((item, i) => {
      item.mesh.visible = i < currentLayerIdx;
      item.mesh.material = (i === currentLayerIdx - 1) ? hotMat : coolMat;
    });

    // 喷头沿着当前最顶层圆周高速走刀扫描
    const topItem = layerMeshes[Math.max(0, currentLayerIdx - 1)];
    const nozzleAngle = now * 6.5;
    const rad = topItem.r * 0.85;
    nozzleGroup.position.set(
      Math.cos(nozzleAngle) * rad,
      topItem.mesh.position.y + 0.05,
      Math.sin(nozzleAngle) * rad
    );

    layerGroup.rotation.y = now * 0.35;

    // 3D 实时工具/材料/工序空间标注
    st.label3D(
      [nozzleGroup.position.x, nozzleGroup.position.y + 0.45, nozzleGroup.position.z],
      '🔧 高温打印喷头/激光头 (沿切片轨迹走刀)',
      { dx: 18, dy: -22, color: '#f59e0b' }
    );
    st.label3D(
      [-topItem.r, topItem.mesh.position.y, 0],
      `⚙️ 正在熔融沉积第 ${currentLayerIdx}/${targetLayers} 层薄片`,
      { dx: -24, dy: -16, color: '#38bdf8' }
    );
    st.label3D([0, 0.9, 1.1], '🧱 冷却固化层堆 (把二维薄层当三维“活字”)', { dx: 18, dy: 14, color: '#34d399' });
    st.label3D([0, -0.07, 2.0], '🔧 精密升降成型平台 (Build Plate)', { dx: 0, dy: 22, color: '#a78bfa' });
  });

  return {
    mount() { st.resize(); update(false); },
    rerender() {
      apps.textContent = t('f1.apps') + `（GE ${GE_NOZZLE_PARTS}→1 · Terran ${TERRAN_PRINTED_PCT}% · ${EAR_YEAR}）`;
      update(false);
    },
    onShow() {
      buildProgress = 0.05;
      update(false);
      st.onShow();
    },
    onHide() { st.onHide(); },
    dispose() { st.dispose(); },
  };
}
