/**
 * flight.js — Simplified Spaceflight Planning & Interplanetary Trajectory System
 * Computes Hohmann Transfer Orbits, Delta-V budgets, transfer flight durations,
 * renders visual trajectory curves, and executes animated spacecraft missions.
 */

import * as THREE from 'three';
import { CELESTIAL_MAP } from './data.js';

/**
 * @typedef {Object} MissionPlan
 * @property {string} originId
 * @property {string} destinationId
 * @property {number} transferTimeDays
 * @property {number} deltaV1Kps
 * @property {number} deltaV2Kps
 * @property {number} totalDeltaVKps
 * @property {number} phaseAngleDeg
 * @property {number} originR
 * @property {number} destR
 * @property {number} transferSemiMajor
 */

export class SpaceflightPlanner {
  /**
   * @param {THREE.Scene} scene
   * @param {import('./celestial.js').SolarSystemManager} celestialManager
   */
  constructor(scene, celestialManager) {
    this.scene = scene;
    this.celestial = celestialManager;

    // Current planned mission data
    this.currentPlan = null;

    // Visual trajectory elements
    this.trajectoryLine = null;
    this.interceptMarker = null;

    // Active spacecraft flight state
    this.activeMission = null; // { progress: 0, durationSec: 30, spacecraft: THREE.Group, trail: THREE.Line }
    this.isFlying = false;

    this.initSpacecraft();
  }

  /**
   * Builds the 3D Spacecraft mesh (deep space exploratory probe)
   */
  initSpacecraft() {
    this.spacecraft = new THREE.Group();
    this.spacecraft.name = 'InterplanetarySpacecraft';
    this.spacecraft.visible = false;

    // 1. Central bus (Gold foil wrapped cube)
    const busGeom = new THREE.BoxGeometry(0.8, 0.8, 1.2);
    const goldFoilMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.85,
      roughness: 0.25
    });
    const busMesh = new THREE.Mesh(busGeom, goldFoilMat);
    this.spacecraft.add(busMesh);

    // 2. Solar panel wings (Left & Right)
    const panelGeom = new THREE.BoxGeometry(2.4, 0.05, 0.7);
    const solarMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a8a,
      roughness: 0.3,
      metalness: 0.5
    });
    const panelL = new THREE.Mesh(panelGeom, solarMat);
    panelL.position.set(-1.6, 0, 0);
    this.spacecraft.add(panelL);

    const panelR = new THREE.Mesh(panelGeom, solarMat);
    panelR.position.set(1.6, 0, 0);
    this.spacecraft.add(panelR);

    // 3. High-gain parabolic communication dish
    const dishGeom = new THREE.ConeGeometry(0.6, 0.25, 16, 1, true);
    dishGeom.rotateX(Math.PI / 2);
    const dishMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.4
    });
    const dishMesh = new THREE.Mesh(dishGeom, dishMat);
    dishMesh.position.set(0, 0.55, 0.2);
    this.spacecraft.add(dishMesh);

    // 4. Ion engine thruster nozzle & glowing plume
    const nozzleGeom = new THREE.CylinderGeometry(0.12, 0.22, 0.35, 12);
    nozzleGeom.rotateX(Math.PI / 2);
    const nozzleMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.9
    });
    const nozzleMesh = new THREE.Mesh(nozzleGeom, nozzleMat);
    nozzleMesh.position.set(0, 0, -0.75);
    this.spacecraft.add(nozzleMesh);

    // Engine cyan glow plume
    const plumeGeom = new THREE.ConeGeometry(0.18, 0.9, 12);
    plumeGeom.rotateX(-Math.PI / 2);
    const plumeMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85
    });
    this.plumeMesh = new THREE.Mesh(plumeGeom, plumeMat);
    this.plumeMesh.position.set(0, 0, -1.2);
    this.spacecraft.add(this.plumeMesh);

    this.scene.add(this.spacecraft);

    // Spacecraft Trajectory Trail
    this.trailPoints = [];
    this.maxTrail = 200;
    const trailGeom = new THREE.BufferGeometry();
    const trailMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.65
    });
    this.flightTrail = new THREE.Line(trailGeom, trailMat);
    this.scene.add(this.flightTrail);
  }

  /**
   * Calculates Hohmann Transfer Orbit and Delta-V between any two celestial bodies
   * @param {string} originId
   * @param {string} destId
   * @returns {MissionPlan}
   */
  calculateHohmannTransfer(originId, destId) {
    const originData = CELESTIAL_MAP.get(originId);
    const destData = CELESTIAL_MAP.get(destId);
    if (!originData || !destData || originId === destId) return null;

    // Determine effective heliocentric semi-major axes
    // If a moon is chosen, use parent planet's heliocentric distance
    const r1Real = originData.type === 'moon'
      ? (CELESTIAL_MAP.get(originData.parent)?.semiMajorAxisKm || originData.semiMajorAxisKm)
      : originData.semiMajorAxisKm;

    const r2Real = destData.type === 'moon'
      ? (CELESTIAL_MAP.get(destData.parent)?.semiMajorAxisKm || destData.semiMajorAxisKm)
      : destData.semiMajorAxisKm;

    const muSun = 1.3271244e11; // km^3/s^2 (Standard gravitational parameter of the Sun)

    // 1. Semi-major axis of transfer ellipse (km)
    const aTransferReal = (r1Real + r2Real) / 2;

    // 2. Flight Duration (Hohmann transfer takes exactly half of the transfer ellipse period)
    const tTransferSeconds = Math.PI * Math.sqrt(Math.pow(aTransferReal, 3) / muSun);
    const transferTimeDays = Math.round(tTransferSeconds / 86400);

    // 3. Departure Delta-V (Δv1)
    const v1Circular = Math.sqrt(muSun / r1Real);
    const v1Transfer = Math.sqrt(muSun * (2 / r1Real - 1 / aTransferReal));
    const deltaV1Kps = Math.abs(v1Transfer - v1Circular);

    // 4. Arrival Insertion Delta-V (Δv2)
    const v2Circular = Math.sqrt(muSun / r2Real);
    const v2Transfer = Math.sqrt(muSun * (2 / r2Real - 1 / aTransferReal));
    const deltaV2Kps = Math.abs(v2Circular - v2Transfer);

    const totalDeltaVKps = deltaV1Kps + deltaV2Kps;

    // 5. Planetary Alignment (Required Phase Angle in degrees)
    // Destination angular speed:
    const omega2 = Math.sqrt(muSun / Math.pow(r2Real, 3));
    const destTravelAngle = omega2 * tTransferSeconds; // radians
    let phaseAngleRad = Math.PI - destTravelAngle;
    // Normalize to [-PI, PI]
    while (phaseAngleRad > Math.PI) phaseAngleRad -= 2 * Math.PI;
    while (phaseAngleRad < -Math.PI) phaseAngleRad += 2 * Math.PI;
    const phaseAngleDeg = (phaseAngleRad * 180) / Math.PI;

    // 6. 3D Display distances
    const r1Display = originData.type === 'moon'
      ? (CELESTIAL_MAP.get(originData.parent)?.displayDistance || originData.displayDistance)
      : originData.displayDistance;

    const r2Display = destData.type === 'moon'
      ? (CELESTIAL_MAP.get(destData.parent)?.displayDistance || destData.displayDistance)
      : destData.displayDistance;

    const plan = {
      originId,
      destId,
      transferTimeDays,
      deltaV1Kps: Number(deltaV1Kps.toFixed(2)),
      deltaV2Kps: Number(deltaV2Kps.toFixed(2)),
      totalDeltaVKps: Number(totalDeltaVKps.toFixed(2)),
      phaseAngleDeg: Number(phaseAngleDeg.toFixed(1)),
      originR: r1Display,
      destR: r2Display,
      transferSemiMajor: (r1Display + r2Display) / 2
    };

    this.currentPlan = plan;
    this.renderTrajectory(plan);
    return plan;
  }

  /**
   * Renders the 3D elliptical transfer trajectory arc in the scene
   * @param {MissionPlan} plan
   */
  renderTrajectory(plan) {
    this.clearTrajectory();

    const originPos = this.celestial.getBodyWorldPosition(plan.originId);
    const originAngle = Math.atan2(originPos.z, originPos.x);

    // Generate elliptical transfer arc from origin to destination intercept
    const points = [];
    const segments = 80;
    const r1 = plan.originR;
    const r2 = plan.destR;
    const a = (r1 + r2) / 2;
    const c = Math.abs(r2 - r1) / 2;
    const b = Math.sqrt(Math.max(0.1, a * a - c * c));

    // Semi-ellipse points rotated to start at departure angle
    for (let i = 0; i <= segments; i++) {
      const u = (i / segments) * Math.PI; // 0 to PI
      // Standard ellipse parameterized in polar or cartesian coordinates
      // r(theta) = p / (1 + e * cos(theta))
      const e = Math.abs(r2 - r1) / (r1 + r2);
      const p = r1 > r2 ? a * (1 - e * e) : a * (1 - e * e);
      const r = r1 + (r2 - r1) * (0.5 - 0.5 * Math.cos(u));
      const theta = originAngle + u * (r2 > r1 ? 1 : -1);

      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      points.push(new THREE.Vector3(x, 0, z));
    }

    const geom = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineDashedMaterial({
      color: 0xf59e0b, // Golden trajectory
      dashSize: 2.5,
      gapSize: 1.5,
      linewidth: 2
    });
    this.trajectoryLine = new THREE.Line(geom, mat);
    this.trajectoryLine.computeLineDistances();
    this.scene.add(this.trajectoryLine);

    // Destination intercept marker
    const interceptPos = points[points.length - 1];
    const markerGeom = new THREE.RingGeometry(1.2, 1.8, 16);
    markerGeom.rotateX(Math.PI / 2);
    const markerMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide
    });
    this.interceptMarker = new THREE.Mesh(markerGeom, markerMat);
    this.interceptMarker.position.copy(interceptPos);
    this.scene.add(this.interceptMarker);
  }

  clearTrajectory() {
    if (this.trajectoryLine) {
      this.scene.remove(this.trajectoryLine);
      this.trajectoryLine.geometry.dispose();
      this.trajectoryLine = null;
    }
    if (this.interceptMarker) {
      this.scene.remove(this.interceptMarker);
      this.interceptMarker.geometry.dispose();
      this.interceptMarker = null;
    }
  }

  /**
   * Initiates the animated flight mission
   */
  launchMission() {
    if (!this.currentPlan) return;

    this.isFlying = true;
    this.spacecraft.visible = true;
    this.trailPoints = [];

    const originPos = this.celestial.getBodyWorldPosition(this.currentPlan.originId);
    this.spacecraft.position.copy(originPos);

    this.activeMission = {
      plan: this.currentPlan,
      progress: 0,
      flightSpeed: 0.035, // Progress per second at 1x speed
      originPos: originPos.clone(),
      isArrived: false
    };
  }

  /**
   * Updates flight physics and spacecraft position
   * @param {number} deltaSeconds
   * @param {number} timeScale
   * @param {(telemetry: any) => void} onTelemetry
   */
  update(deltaSeconds, timeScale, onTelemetry) {
    if (!this.isFlying || !this.activeMission) return;

    const mission = this.activeMission;
    const plan = mission.plan;

    // Advance mission progress along transfer arc
    const step = mission.flightSpeed * deltaSeconds * Math.min(timeScale, 10);
    mission.progress += step;

    if (mission.progress >= 1.0) {
      mission.progress = 1.0;
      mission.isArrived = true;
    }

    // Calculate current position along the elliptical trajectory
    const originPos = this.celestial.getBodyWorldPosition(plan.originId);
    const destPos = this.celestial.getBodyWorldPosition(plan.destId);

    const originAngle = Math.atan2(originPos.z, originPos.x);
    const u = mission.progress * Math.PI;
    const r = plan.originR + (plan.destR - plan.originR) * (0.5 - 0.5 * Math.cos(u));
    const theta = originAngle + u * (plan.destR > plan.originR ? 1 : -1);

    const currentPos = new THREE.Vector3(
      Math.cos(theta) * r,
      0,
      Math.sin(theta) * r
    );

    // If arrived, enter parking orbit around destination
    if (mission.isArrived) {
      const parkAngle = Date.now() * 0.002;
      const parkRadius = 3.5;
      currentPos.set(
        destPos.x + Math.cos(parkAngle) * parkRadius,
        destPos.y,
        destPos.z + Math.sin(parkAngle) * parkRadius
      );
      this.plumeMesh.visible = false; // Engines cut off
    } else {
      this.plumeMesh.visible = true; // Engine active
      // Spacecraft points forward along trajectory
      const nextU = Math.min(1.0, mission.progress + 0.01) * Math.PI;
      const nextR = plan.originR + (plan.destR - plan.originR) * (0.5 - 0.5 * Math.cos(nextU));
      const nextTheta = originAngle + nextU * (plan.destR > plan.originR ? 1 : -1);
      const nextPos = new THREE.Vector3(Math.cos(nextTheta) * nextR, 0, Math.sin(nextTheta) * nextR);
      this.spacecraft.lookAt(nextPos);
    }

    this.spacecraft.position.copy(currentPos);

    // Update flight trail
    this.trailPoints.push(currentPos.clone());
    if (this.trailPoints.length > this.maxTrail) {
      this.trailPoints.shift();
    }
    this.flightTrail.geometry.setFromPoints(this.trailPoints);

    // Compute Telemetry
    if (onTelemetry) {
      const distToTargetReal = Math.round(
        Math.abs(1 - mission.progress) * Math.abs(plan.destR - plan.originR) * 10000000
      );
      const elapsedDays = Math.round(mission.progress * plan.transferTimeDays);
      const currentSpeedKps = (
        plan.deltaV1Kps + (plan.deltaV2Kps - plan.deltaV1Kps) * Math.sin(u)
      ).toFixed(2);

      onTelemetry({
        progressPct: Math.round(mission.progress * 100),
        elapsedDays,
        totalDays: plan.transferTimeDays,
        currentSpeedKps,
        distToTargetKm: distToTargetReal.toLocaleString(),
        isArrived: mission.isArrived
      });
    }
  }

  abortMission() {
    this.isFlying = false;
    this.activeMission = null;
    this.spacecraft.visible = false;
    this.trailPoints = [];
    this.flightTrail.geometry.setFromPoints([]);
  }
}
