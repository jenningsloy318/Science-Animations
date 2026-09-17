/**
 * vectors-hud.js - 3D 动力学矢量可视化 (速度三角形、引力矢量、双曲偏折角弧)
 */
import * as THREE from 'three';

export function createVectorsVisualizer(scene) {
  const group = new THREE.Group();
  group.name = 'VectorsGroup';
  scene.add(group);

  // 1. 太阳系速度矢量 (Green - Heliocentric Velocity)
  const helioArrow = new THREE.ArrowHelper(
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 0, 0),
    4.0,
    0x22c55e,
    0.8,
    0.4
  );
  helioArrow.name = 'HelioVelocityArrow';
  group.add(helioArrow);

  // 2. 行星轨道速度矢量 (Gold/Amber - Planet Orbital Velocity)
  const planetArrow = new THREE.ArrowHelper(
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 0, 0),
    3.0,
    0xf59e0b,
    0.7,
    0.35
  );
  planetArrow.name = 'PlanetVelocityArrow';
  group.add(planetArrow);

  // 3. 相对速度矢量 (Cyan - Hyperbolic Excess Relative Velocity)
  const relArrow = new THREE.ArrowHelper(
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, 0),
    3.0,
    0x06b6d4,
    0.7,
    0.35
  );
  relArrow.name = 'RelativeVelocityArrow';
  group.add(relArrow);

  // 4. 引力加速度矢量 (Orange - Gravitational Force F ~ 1/r^2)
  const gravArrow = new THREE.ArrowHelper(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0, 0),
    2.5,
    0xf97316,
    0.6,
    0.3
  );
  gravArrow.name = 'GravityForceArrow';
  group.add(gravArrow);

  // 5. 速度加法三角形虚线 (Dashed Vector Triangle Line: V_planet -> v_helio)
  const triangleGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0)
  ]);
  const triangleMat = new THREE.LineDashedMaterial({
    color: 0x38bdf8,
    dashSize: 0.3,
    gapSize: 0.15,
    linewidth: 1.5
  });
  const triangleLine = new THREE.Line(triangleGeo, triangleMat);
  triangleLine.computeLineDistances();
  group.add(triangleLine);

  let visible = true;

  /**
   * 更新所有矢量的位置与方向
   */
  function update({
    craftPos,
    vHelio,     // [vx, vy, vz] (km/s)
    vPlanet,    // [vx, vy, vz] (km/s)
    vRel,       // [vx, vy, vz] (km/s)
    gravDir,    // Vector3 归一化引力方向
    gravMagnitude, // m/s^2
    scale = 0.25,
    showTriangle = true
  }) {
    if (!visible) {
      group.visible = false;
      return;
    }
    group.visible = true;

    // 锚定起点在航天器位置
    const origin = new THREE.Vector3(craftPos.x, craftPos.y, craftPos.z);

    // 1. 太阳系绝对速度 (绿)
    const helioMag = Math.hypot(vHelio[0], vHelio[1], vHelio[2]);
    if (helioMag > 0.01) {
      const dir = new THREE.Vector3(vHelio[0], vHelio[1], vHelio[2]).normalize();
      helioArrow.position.copy(origin);
      helioArrow.setDirection(dir);
      helioArrow.setLength(Math.min(10.0, Math.max(1.0, helioMag * scale)), 0.8, 0.4);
      helioArrow.visible = true;
    } else {
      helioArrow.visible = false;
    }

    // 2. 行星公转速度 (金)
    const planetMag = Math.hypot(vPlanet[0], vPlanet[1], vPlanet[2]);
    if (planetMag > 0.01) {
      const dir = new THREE.Vector3(vPlanet[0], vPlanet[1], vPlanet[2]).normalize();
      planetArrow.position.copy(origin);
      planetArrow.setDirection(dir);
      planetArrow.setLength(Math.min(8.0, Math.max(0.8, planetMag * scale)), 0.7, 0.35);
      planetArrow.visible = true;
    } else {
      planetArrow.visible = false;
    }

    // 3. 相对速度 (青)
    const relMag = Math.hypot(vRel[0], vRel[1], vRel[2]);
    if (relMag > 0.01) {
      const dir = new THREE.Vector3(vRel[0], vRel[1], vRel[2]).normalize();
      relArrow.position.copy(origin);
      relArrow.setDirection(dir);
      relArrow.setLength(Math.min(8.0, Math.max(0.8, relMag * scale)), 0.7, 0.35);
      relArrow.visible = true;
    } else {
      relArrow.visible = false;
    }

    // 4. 引力加速度 (橙)
    if (gravMagnitude > 0.001 && gravDir) {
      gravArrow.position.copy(origin);
      gravArrow.setDirection(gravDir);
      const gLen = Math.min(6.0, Math.max(0.6, Math.log10(gravMagnitude * 100 + 1) * 1.8));
      gravArrow.setLength(gLen, 0.6, 0.3);
      gravArrow.visible = true;
    } else {
      gravArrow.visible = false;
    }

    // 5. 速度三角形闭合线
    if (showTriangle && helioMag > 0.1 && planetMag > 0.1) {
      const pTip = origin.clone().add(
        new THREE.Vector3(vPlanet[0], vPlanet[1], vPlanet[2]).multiplyScalar(scale)
      );
      const hTip = origin.clone().add(
        new THREE.Vector3(vHelio[0], vHelio[1], vHelio[2]).multiplyScalar(scale)
      );

      const pts = [origin, pTip, hTip, origin];
      triangleLine.geometry.setFromPoints(pts);
      triangleLine.computeLineDistances();
      triangleLine.visible = true;
    } else {
      triangleLine.visible = false;
    }
  }

  function setVisible(v) {
    visible = v;
    group.visible = v;
  }

  return {
    group,
    update,
    setVisible
  };
}
