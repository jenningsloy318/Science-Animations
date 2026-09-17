/**
 * celestial.js — 3D Celestial Body Hierarchy, Orbits, and Label System
 * Builds the Sun, 8 Planets, and 22 Moons with procedural textures, rings, and orbital paths.
 */

import * as THREE from 'three';
import { CELESTIAL_DATA, CELESTIAL_MAP } from './data.js';
import {
  createSunTexture,
  createMercuryTexture,
  createVenusTexture,
  createEarthTexture,
  createMoonTexture,
  createMarsTexture,
  createJupiterTexture,
  createSaturnTexture,
  createSaturnRingsTexture,
  createUranusTexture,
  createNeptuneTexture,
  createMoonTextureById,
  createSpaceSkyboxTexture
} from './textures.js';

export class SolarSystemManager {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;

    /** @type {Map<string, { data: any, mesh: THREE.Mesh, pivotGroup: THREE.Group, tiltGroup: THREE.Group, orbitLine: THREE.LineLoop, labelSprite: THREE.Sprite, childrenMoons: any[] }>} */
    this.bodies = new Map();

    // Scale multipliers
    this.planetSizeMultiplier = 1.0;
    this.moonSizeMultiplier = 1.0;
    this.orbitDistanceMultiplier = 1.0;

    // Display options
    this.showOrbits = true;
    this.showMoonOrbits = true;
    this.showLabels = true;

    // Raycasting interactive objects
    this.pickableMeshes = [];

    this.init();
  }

  init() {
    // 1. Cosmic Background Sky Dome
    this.createSkyDome();

    // 2. Build Sun
    const sunData = CELESTIAL_MAP.get('sun');
    this.createSun(sunData);

    // 3. Build Planets
    const planetsData = CELESTIAL_DATA.filter(b => b.type === 'planet');
    planetsData.forEach(pData => this.createPlanet(pData));

    // 4. Build Moons (parented to their respective planets)
    const moonsData = CELESTIAL_DATA.filter(b => b.type === 'moon');
    moonsData.forEach(mData => this.createMoon(mData));
  }

  createSkyDome() {
    const skyTexture = createSpaceSkyboxTexture();
    const skyGeom = new THREE.SphereGeometry(1800, 32, 24);
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTexture,
      side: THREE.BackSide,
      depthWrite: false
    });
    const skyMesh = new THREE.Mesh(skyGeom, skyMat);
    skyMesh.name = 'SkyDome';
    this.scene.add(skyMesh);
  }

  createSun(data) {
    const texture = createSunTexture();
    const geom = new THREE.SphereGeometry(data.displayRadius, 48, 32);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      color: 0xffffff
    });
    const sunMesh = new THREE.Mesh(geom, mat);
    sunMesh.userData = { id: 'sun', name: data.name, nameZh: data.nameZh, type: 'star' };

    // Sun point light illuminating planets
    const sunLight = new THREE.PointLight(0xfffaed, 2.5, 3000, 0.05);
    sunLight.position.set(0, 0, 0);
    this.scene.add(sunLight);

    // Sun corona glow halo
    const haloCanvas = document.createElement('canvas');
    haloCanvas.width = 128;
    haloCanvas.height = 128;
    const hCtx = haloCanvas.getContext('2d');
    const grad = hCtx.createRadialGradient(64, 64, 18, 64, 64, 64);
    grad.addColorStop(0, 'rgba(254, 240, 138, 0.9)');
    grad.addColorStop(0.35, 'rgba(245, 158, 11, 0.45)');
    grad.addColorStop(1, 'rgba(234, 88, 12, 0)');
    hCtx.fillStyle = grad;
    hCtx.fillRect(0, 0, 128, 128);

    const haloTexture = new THREE.CanvasTexture(haloCanvas);
    const haloMat = new THREE.SpriteMaterial({
      map: haloTexture,
      color: 0xfff0a0,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const haloSprite = new THREE.Sprite(haloMat);
    haloSprite.scale.set(data.displayRadius * 3.4, data.displayRadius * 3.4, 1);
    sunMesh.add(haloSprite);

    const pivotGroup = new THREE.Group();
    pivotGroup.name = 'SunPivot';
    pivotGroup.add(sunMesh);
    this.scene.add(pivotGroup);

    const labelSprite = this.createLabelSprite(data.nameZh, data.name, data.displayRadius + 3.0);
    sunMesh.add(labelSprite);

    this.bodies.set('sun', {
      data,
      mesh: sunMesh,
      pivotGroup,
      tiltGroup: pivotGroup,
      orbitLine: null,
      labelSprite,
      childrenMoons: []
    });

    this.pickableMeshes.push(sunMesh);
  }

  createPlanet(data) {
    // 1. Pivot group at Sun center for orbital revolution
    const pivotGroup = new THREE.Group();
    pivotGroup.name = `${data.name}_OrbitPivot`;

    // 2. Tilt group for axial tilt
    const tiltGroup = new THREE.Group();
    tiltGroup.name = `${data.name}_TiltGroup`;
    tiltGroup.rotation.z = THREE.MathUtils.degToRad(data.axialTiltDeg || 0);

    // 3. Planet Texture & Material
    let texture;
    switch (data.id) {
      case 'mercury': texture = createMercuryTexture(); break;
      case 'venus':   texture = createVenusTexture(); break;
      case 'earth':   texture = createEarthTexture(); break;
      case 'mars':    texture = createMarsTexture(); break;
      case 'jupiter': texture = createJupiterTexture(); break;
      case 'saturn':  texture = createSaturnTexture(); break;
      case 'uranus':  texture = createUranusTexture(); break;
      case 'neptune': texture = createNeptuneTexture(); break;
      default:        texture = createMercuryTexture(); break;
    }

    const geom = new THREE.SphereGeometry(data.displayRadius, 40, 24);
    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.75,
      metalness: 0.05
    });

    const planetMesh = new THREE.Mesh(geom, mat);
    planetMesh.castShadow = true;
    planetMesh.receiveShadow = true;
    planetMesh.userData = { id: data.id, name: data.name, nameZh: data.nameZh, type: 'planet' };

    tiltGroup.add(planetMesh);

    // 4. Atmospheric glow layer
    if (data.hasAtmosphere) {
      const atmoGeom = new THREE.SphereGeometry(data.displayRadius * 1.025, 32, 20);
      const atmoMat = new THREE.MeshStandardMaterial({
        color: data.atmosphereColor || 0x93c5fd,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide
      });
      const atmoMesh = new THREE.Mesh(atmoGeom, atmoMat);
      tiltGroup.add(atmoMesh);
    }

    // 5. Planetary Rings (Saturn / Uranus)
    if (data.hasRings) {
      this.createPlanetaryRings(data, tiltGroup);
    }

    // Position planet along its orbit
    tiltGroup.position.set(data.displayDistance, 0, 0);
    pivotGroup.add(tiltGroup);
    this.scene.add(pivotGroup);

    // 6. Orbital Line
    const orbitLine = this.createOrbitLine(data.displayDistance, data.colorHex, 0.45);
    this.scene.add(orbitLine);

    // 7. Billboard Label
    const labelSprite = this.createLabelSprite(data.nameZh, data.name, data.displayRadius + 2.2);
    tiltGroup.add(labelSprite);

    this.bodies.set(data.id, {
      data,
      mesh: planetMesh,
      pivotGroup,
      tiltGroup,
      orbitLine,
      labelSprite,
      childrenMoons: []
    });

    this.pickableMeshes.push(planetMesh);
  }

  createPlanetaryRings(data, parentGroup) {
    if (data.id === 'saturn') {
      const ringTexture = createSaturnRingsTexture();
      const ringGeom = new THREE.RingGeometry(data.ringInnerRadius, data.ringOuterRadius, 64);
      ringGeom.rotateX(Math.PI / 2);

      // Map UVs radially from center to outer rim
      const pos = ringGeom.attributes.position;
      const uvs = ringGeom.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const r = Math.sqrt(x * x + z * z);
        const u = (r - data.ringInnerRadius) / (data.ringOuterRadius - data.ringInnerRadius);
        uvs.setXY(i, u, 0.5);
      }
      uvs.needsUpdate = true;

      const ringMat = new THREE.MeshStandardMaterial({
        map: ringTexture,
        transparent: true,
        side: THREE.DoubleSide,
        roughness: 0.6
      });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.receiveShadow = true;
      parentGroup.add(ringMesh);
    } else if (data.id === 'uranus') {
      // Thin delicate vertical rings
      const ringGeom = new THREE.RingGeometry(data.ringInnerRadius, data.ringOuterRadius, 48);
      ringGeom.rotateX(Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x67e8f9,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide
      });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      parentGroup.add(ringMesh);
    }
  }

  createMoon(data) {
    const parentBody = this.bodies.get(data.parent);
    if (!parentBody) return;

    // Moon pivot attached to parent planet tiltGroup
    const moonPivot = new THREE.Group();
    moonPivot.name = `${data.name}_MoonPivot`;

    // Moon texture
    let texture;
    if (data.id === 'moon') {
      texture = createMoonTexture();
    } else {
      texture = createMoonTextureById(data.id);
    }

    const geom = new THREE.SphereGeometry(data.displayRadius, 24, 16);
    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.85,
      metalness: 0.05
    });

    const moonMesh = new THREE.Mesh(geom, mat);
    moonMesh.position.set(data.displayDistance, 0, 0);
    moonMesh.userData = { id: data.id, name: data.name, nameZh: data.nameZh, type: 'moon', parent: data.parent };

    moonPivot.add(moonMesh);
    parentBody.tiltGroup.add(moonPivot);

    // Moon Orbit line around parent planet
    const moonOrbitLine = this.createOrbitLine(data.displayDistance, 0x94a3b8, 0.25);
    parentBody.tiltGroup.add(moonOrbitLine);

    // Moon label
    const labelSprite = this.createLabelSprite(data.nameZh, data.name, data.displayRadius + 1.2, true);
    moonMesh.add(labelSprite);

    const moonEntry = {
      data,
      mesh: moonMesh,
      pivotGroup: moonPivot,
      tiltGroup: moonPivot,
      orbitLine: moonOrbitLine,
      labelSprite,
      childrenMoons: []
    };

    this.bodies.set(data.id, moonEntry);
    parentBody.childrenMoons.push(moonEntry);
    this.pickableMeshes.push(moonMesh);
  }

  createOrbitLine(radius, colorHex, opacity) {
    const segments = 128;
    const points = [];
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius));
    }
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: opacity,
      depthWrite: false
    });
    const line = new THREE.LineLoop(geom, mat);
    line.name = 'OrbitLine';
    return line;
  }

  createLabelSprite(textZh, textEn, yOffset, isMoon = false) {
    // 画布自适应文本宽度: 长标签（英文名+中文名）不再被 256px 截断
    const font = isMoon ? 'bold 22px system-ui, sans-serif' : 'bold 26px system-ui, sans-serif';
    const probe = document.createElement('canvas').getContext('2d');
    probe.font = font;
    const label = `${textZh} · ${textEn}`;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(256, Math.ceil(probe.measureText(label).width) + 48);
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.font = font;
    ctx.fillStyle = isMoon ? '#cbd5e1' : '#f8fafc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Soft drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 6;
    ctx.fillText(label, canvas.width / 2, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });

    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(0, yOffset, 0);
    const aspect = canvas.width / canvas.height;
    const h = isMoon ? 1.2 : 1.75;
    sprite.scale.set(h * aspect, h, 1);
    sprite.name = 'LabelSprite';
    return sprite;
  }

  /**
   * Update orbital positions and axial spins
   * @param {number} deltaSeconds Elapsed wall-clock seconds
   * @param {number} timeScale Multiplier of real-time simulation days/sec
   */
  update(deltaSeconds, timeScale) {
    // 1. Spin the Sun
    const sun = this.bodies.get('sun');
    if (sun) {
      sun.mesh.rotation.y += deltaSeconds * 0.05 * timeScale;
    }

    // 2. Update Planets (revolution around Sun & axial rotation)
    CELESTIAL_DATA.forEach(data => {
      const body = this.bodies.get(data.id);
      if (!body) return;

      if (data.type === 'planet') {
        // Orbit speed: 2*PI / periodInDays * timeScale * deltaSeconds
        const orbitSpeed = (2 * Math.PI / data.orbitalPeriodDays) * timeScale * deltaSeconds;
        body.pivotGroup.rotation.y += orbitSpeed;

        // Axial spin speed
        const spinSpeed = (2 * Math.PI / (data.rotationPeriodHours / 24)) * timeScale * deltaSeconds;
        body.mesh.rotation.y += spinSpeed;
      } else if (data.type === 'moon') {
        // Orbit around parent planet
        const moonOrbitSpeed = (2 * Math.PI / data.orbitalPeriodDays) * timeScale * deltaSeconds;
        body.pivotGroup.rotation.y += moonOrbitSpeed;

        // Moon axial spin
        const moonSpinSpeed = (2 * Math.PI / (data.rotationPeriodHours / 24)) * timeScale * deltaSeconds;
        body.mesh.rotation.y += moonSpinSpeed;
      }
    });
  }

  /**
   * Gets world coordinates of any celestial body
   * @param {string} id
   * @returns {THREE.Vector3}
   */
  getBodyWorldPosition(id) {
    const body = this.bodies.get(id);
    if (!body) return new THREE.Vector3();
    const pos = new THREE.Vector3();
    body.mesh.getWorldPosition(pos);
    return pos;
  }

  setPlanetScale(multiplier) {
    this.planetSizeMultiplier = multiplier;
    this.bodies.forEach(b => {
      if (b.data.type === 'planet') {
        b.mesh.scale.setScalar(multiplier);
      }
    });
  }

  setMoonScale(multiplier) {
    this.moonSizeMultiplier = multiplier;
    this.bodies.forEach(b => {
      if (b.data.type === 'moon') {
        b.mesh.scale.setScalar(multiplier);
      }
    });
  }

  toggleOrbits(visible) {
    this.showOrbits = visible;
    this.bodies.forEach(b => {
      if (b.data.type === 'planet' && b.orbitLine) {
        b.orbitLine.visible = visible;
      }
    });
  }

  toggleMoonOrbits(visible) {
    this.showMoonOrbits = visible;
    this.bodies.forEach(b => {
      if (b.data.type === 'moon' && b.orbitLine) {
        b.orbitLine.visible = visible;
      }
    });
  }

  toggleLabels(visible) {
    this.showLabels = visible;
    this.bodies.forEach(b => {
      if (b.labelSprite) {
        b.labelSprite.visible = visible;
      }
    });
  }
}
