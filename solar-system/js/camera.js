/**
 * camera.js — Intelligent Camera Controller & Target Following System
 * Supports free orbit, smooth target transitions, dynamic moving-body lock, and spacecraft chase view.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';

export class CameraController {
  /**
   * @param {THREE.PerspectiveCamera} camera
   * @param {HTMLElement} domElement
   * @param {import('./celestial.js').SolarSystemManager} celestialManager
   * @param {import('./flight.js').SpaceflightPlanner} flightPlanner
   */
  constructor(camera, domElement, celestialManager, flightPlanner) {
    this.camera = camera;
    this.domElement = domElement;
    this.celestial = celestialManager;
    this.flight = flightPlanner;

    // Controls setup
    this.controls = new OrbitControls(this.camera, this.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 2.0;
    this.controls.maxDistance = 1600.0;
    this.controls.target.set(0, 0, 0);

    // Camera follow state
    this.currentTargetId = null; // 'sun', 'earth', 'moon', etc. or 'spacecraft'
    this.isChaseCam = false;

    // Transition interpolation state
    this.isTransitioning = false;
    this.transitionProgress = 0;
    this.transitionDuration = 1.2; // seconds
    this.startCamPos = new THREE.Vector3();
    this.targetCamPos = new THREE.Vector3();
    this.startTargetPos = new THREE.Vector3();
    this.targetTargetPos = new THREE.Vector3();
    this.relativeOffset = new THREE.Vector3(0, 8, 18);

    // Initial Overview position
    this.camera.position.set(0, 240, 480);
    this.controls.update();
  }

  /**
   * Smoothly transitions the camera to focus on and follow a celestial body
   * @param {string} bodyId
   */
  focusOnBody(bodyId) {
    this.isChaseCam = false;
    this.currentTargetId = bodyId;

    const targetPos = this.celestial.getBodyWorldPosition(bodyId);
    const bodyEntry = this.celestial.bodies.get(bodyId);
    const radius = bodyEntry?.data?.displayRadius || 5.0;

    // Compute ideal framing distance based on body size and type
    let dist = radius * 3.6;
    if (bodyId === 'sun') dist = 45.0;
    if (bodyEntry?.data?.hasRings) dist = radius * 5.2; // Wider framing for Saturn ring system
    if (dist < 4.0) dist = 4.0;

    const offset = new THREE.Vector3(0, dist * 0.45, dist * 1.15);
    const newCamPos = targetPos.clone().add(offset);

    this.startTransition(newCamPos, targetPos, offset);
  }

  /**
   * Engages spacecraft chase camera mode
   */
  setChaseCam(enabled) {
    this.isChaseCam = enabled;
    if (enabled && this.flight.spacecraft) {
      this.currentTargetId = 'spacecraft';
      const craftPos = this.flight.spacecraft.position.clone();
      const offset = new THREE.Vector3(0, 4, 12);
      const newCamPos = craftPos.clone().add(offset);
      this.startTransition(newCamPos, craftPos, offset);
    }
  }

  startTransition(newCamPos, newTargetPos, offset) {
    this.startCamPos.copy(this.camera.position);
    this.targetCamPos.copy(newCamPos);
    this.startTargetPos.copy(this.controls.target);
    this.targetTargetPos.copy(newTargetPos);
    this.relativeOffset.copy(offset);

    this.transitionProgress = 0;
    this.isTransitioning = true;
  }

  /**
   * Smooth Hermite s-curve easing
   */
  easeHermite(t) {
    return t * t * (3 - 2 * t);
  }

  /**
   * Update called every frame in render loop
   * @param {number} deltaSeconds
   */
  update(deltaSeconds) {
    // 1. Transitioning between targets
    if (this.isTransitioning) {
      this.transitionProgress += deltaSeconds / this.transitionDuration;
      const t = Math.min(1.0, this.transitionProgress);
      const eased = this.easeHermite(t);

      // Re-query moving target world position dynamically so transition lands accurately on moving body
      let currentWorldTarget;
      if (this.currentTargetId === 'spacecraft') {
        currentWorldTarget = this.flight.spacecraft.position.clone();
      } else if (this.currentTargetId) {
        currentWorldTarget = this.celestial.getBodyWorldPosition(this.currentTargetId);
      } else {
        currentWorldTarget = this.targetTargetPos;
      }

      this.controls.target.lerpVectors(this.startTargetPos, currentWorldTarget, eased);
      const idealCamPos = currentWorldTarget.clone().add(this.relativeOffset);
      this.camera.position.lerpVectors(this.startCamPos, idealCamPos, eased);

      if (t >= 1.0) {
        this.isTransitioning = false;
      }
    }
    // 2. Dynamic Target Following (Camera tracks moving body in its orbit)
    else if (this.currentTargetId) {
      let targetWorldPos;
      if (this.currentTargetId === 'spacecraft' && this.flight.spacecraft) {
        targetWorldPos = this.flight.spacecraft.position.clone();
      } else {
        targetWorldPos = this.celestial.getBodyWorldPosition(this.currentTargetId);
      }

      // Delta movement of the target body this frame
      const targetDelta = targetWorldPos.clone().sub(this.controls.target);

      // Shift both target and camera position together, keeping user's relative orbit angle intact
      this.controls.target.copy(targetWorldPos);
      this.camera.position.add(targetDelta);
    }

    this.controls.update();
  }

  // Presets
  setPreset(preset) {
    this.isChaseCam = false;
    switch (preset) {
      case 'overview':
        this.currentTargetId = null;
        this.startTransition(new THREE.Vector3(0, 240, 480), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 240, 480));
        break;
      case 'inner':
        this.currentTargetId = null;
        this.startTransition(new THREE.Vector3(0, 110, 140), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 110, 140));
        break;
      case 'giants':
        this.currentTargetId = null;
        this.startTransition(new THREE.Vector3(120, 180, 360), new THREE.Vector3(0, 0, 0), new THREE.Vector3(120, 180, 360));
        break;
      case 'earth_moon':
        this.focusOnBody('earth');
        break;
      case 'jupiter_system':
        this.focusOnBody('jupiter');
        break;
      case 'saturn_system':
        this.focusOnBody('saturn');
        break;
    }
  }
}
