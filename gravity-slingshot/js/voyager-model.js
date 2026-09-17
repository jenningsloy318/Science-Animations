/**
 * voyager-model.js - 3D 旅行者号 (Voyager) 探测器高精度程序化网格
 * 包含: 3.7m 高增益天线抛物面 (HGA)、十边形设备舱体、RTG 放射性同位素温差发电机吊杆、
 * 磁强计长桁架吊杆、科学仪器扫描平台 (Scan Platform)、姿控微推力器 (RCS)
 */
import * as THREE from 'three';

export function createVoyagerSpacecraft() {
  const root = new THREE.Group();
  root.name = 'VoyagerProbe';

  // 基础材质
  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.35,
    metalness: 0.25
  });

  const goldFoilMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.3,
    metalness: 0.85
  });

  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.5,
    metalness: 0.7
  });

  const rtgHeatMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    emissive: 0xef4444,
    emissiveIntensity: 0.35,
    roughness: 0.6,
    metalness: 0.5
  });

  const boomTrussMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.4,
    metalness: 0.8,
    wireframe: true
  });

  // 1. 十边形主体设备舱 (Main Decagonal Bus)
  const busRadius = 0.9;
  const busHeight = 0.5;
  const busGeo = new THREE.CylinderGeometry(busRadius, busRadius, busHeight, 10);
  const busMesh = new THREE.Mesh(busGeo, goldFoilMat);
  busMesh.castShadow = true;
  root.add(busMesh);

  // 金唱片标志 (Golden Record on the bus bay)
  const recordGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.04, 32);
  const recordMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.15,
    metalness: 0.95
  });
  const recordMesh = new THREE.Mesh(recordGeo, recordMat);
  recordMesh.position.set(0.85, 0, 0);
  recordMesh.rotation.z = Math.PI / 2;
  root.add(recordMesh);

  // 2. 3.7 米高增益抛物面天线 (High Gain Antenna - HGA)
  // 朝向 +Z 轴指向地球
  const dishGroup = new THREE.Group();
  dishGroup.position.set(0, busHeight * 0.5 + 0.1, 0);

  // 抛物面反射面 (半球/截面圆盘形)
  const dishRadius = 1.85;
  const dishGeo = new THREE.SphereGeometry(dishRadius, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.38);
  const dishMesh = new THREE.Mesh(dishGeo, whiteMat);
  dishMesh.rotation.x = Math.PI; // 凹面朝上/外
  dishGroup.add(dishMesh);

  // 天线副反射面馈源支架 (Sub-reflector Feed Horn with 3 struts)
  const feedStrutsGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.9, 8);
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3;
    const strut = new THREE.Mesh(feedStrutsGeo, darkMetalMat);
    strut.position.set(Math.cos(angle) * 0.45, 0.45, Math.sin(angle) * 0.45);
    strut.rotation.x = 0.25 * Math.cos(angle);
    strut.rotation.z = -0.25 * Math.sin(angle);
    dishGroup.add(strut);
  }

  // 副反射面圆锥
  const subReflGeo = new THREE.ConeGeometry(0.2, 0.25, 16);
  const subRefl = new THREE.Mesh(subReflGeo, darkMetalMat);
  subRefl.position.set(0, 0.9, 0);
  dishGroup.add(subRefl);

  root.add(dishGroup);

  // 3. RTG (放射性同位素温差发电机) 吊杆与三联堆
  const rtgBoomGroup = new THREE.Group();
  rtgBoomGroup.position.set(0, -0.1, 0);

  // 桁架吊杆
  const rtgBoomGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6);
  const rtgBoom = new THREE.Mesh(rtgBoomGeo, boomTrussMat);
  rtgBoom.position.set(-1.2, -0.4, 0);
  rtgBoom.rotation.z = Math.PI * 0.4;
  rtgBoomGroup.add(rtgBoom);

  // 3 节 RTG 圆柱发电机 (含散热翼片和核热微光)
  const rtgCanisterGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.45, 16);
  for (let i = 0; i < 3; i++) {
    const canister = new THREE.Mesh(rtgCanisterGeo, rtgHeatMat);
    canister.position.set(-2.1 - i * 0.28, -0.7 - i * 0.12, 0);
    canister.rotation.z = Math.PI * 0.35;
    rtgBoomGroup.add(canister);
  }
  root.add(rtgBoomGroup);

  // 4. 磁强计 (Magnetometer) 伸缩超长桁架
  const magBoomGroup = new THREE.Group();
  const magTrussGeo = new THREE.CylinderGeometry(0.04, 0.04, 4.2, 5);
  const magTruss = new THREE.Mesh(magTrussGeo, boomTrussMat);
  magTruss.position.set(0, -0.2, -2.1);
  magTruss.rotation.x = Math.PI * 0.5;
  magBoomGroup.add(magTruss);

  // 高场 & 低场磁强计传感器球
  const magSensorGeo = new THREE.SphereGeometry(0.12, 12, 12);
  const magSensorLow = new THREE.Mesh(magSensorGeo, darkMetalMat);
  magSensorLow.position.set(0, -0.2, -4.2);
  magBoomGroup.add(magSensorLow);

  const magSensorHigh = new THREE.Mesh(magSensorGeo, darkMetalMat);
  magSensorHigh.position.set(0, -0.2, -2.0);
  magBoomGroup.add(magSensorHigh);
  root.add(magBoomGroup);

  // 5. 科学仪器扫描平台 (Scan Platform: 广角/窄角相机、红外干涉仪、紫外光谱仪)
  const scanGroup = new THREE.Group();
  scanGroup.position.set(1.4, -0.3, 0.8);

  const scanBaseGeo = new THREE.BoxGeometry(0.5, 0.3, 0.4);
  const scanBase = new THREE.Mesh(scanBaseGeo, darkMetalMat);
  scanGroup.add(scanBase);

  // 望远相机镜头 (Narrow-angle camera)
  const camLensGeo = new THREE.CylinderGeometry(0.1, 0.14, 0.4, 16);
  const camLens = new THREE.Mesh(camLensGeo, whiteMat);
  camLens.rotation.x = Math.PI / 2;
  camLens.position.set(0.15, 0.1, 0.25);
  scanGroup.add(camLens);

  // 广角镜头 (Wide-angle camera)
  const camWideGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.25, 16);
  const camWide = new THREE.Mesh(camWideGeo, whiteMat);
  camWide.rotation.x = Math.PI / 2;
  camWide.position.set(-0.15, 0.1, 0.2);
  scanGroup.add(camWide);

  root.add(scanGroup);

  // 6. 姿态控制喷气微推力器 (RCS Thrusters) 及微光脉冲
  const rcsPlumes = [];
  const rcsPositions = [
    [0.9, -0.25, 0.5],
    [-0.9, -0.25, 0.5],
    [0.9, -0.25, -0.5],
    [-0.9, -0.25, -0.5]
  ];

  const plumeMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.0
  });

  rcsPositions.forEach(pos => {
    const nozzleGeo = new THREE.ConeGeometry(0.05, 0.1, 8);
    const nozzle = new THREE.Mesh(nozzleGeo, darkMetalMat);
    nozzle.position.set(...pos);
    nozzle.rotation.x = Math.PI;
    root.add(nozzle);

    const plumeGeo = new THREE.ConeGeometry(0.08, 0.35, 8);
    const plume = new THREE.Mesh(plumeGeo, plumeMat.clone());
    plume.position.set(pos[0], pos[1] - 0.22, pos[2]);
    plume.rotation.x = Math.PI;
    root.add(plume);
    rcsPlumes.push(plume);
  });

  // 缩放整体尺寸便于观察
  root.scale.set(0.45, 0.45, 0.45);

  /**
   * 姿态微调喷气动画
   */
  function fireRCS(active = true) {
    rcsPlumes.forEach(p => {
      p.material.opacity = active ? 0.85 : 0.0;
    });
  }

  return {
    group: root,
    fireRCS,
    dishGroup,
    scanGroup
  };
}
