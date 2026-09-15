/**
 * main.js — Main Entry Point for Solar System Explorer & Spaceflight Planner
 * Orchestrates Three.js WebGL rendering, simulation clock, raycasting, flight telemetry, and UI interactions.
 */

import * as THREE from 'three';
import { CELESTIAL_DATA, CELESTIAL_MAP, PLANETS, MOONS } from './data.js';
import { SolarSystemManager } from './celestial.js';
import { SpaceflightPlanner } from './flight.js';
import { CameraController } from './camera.js';

class SolarSystemApp {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.clock = new THREE.Clock();

    // Simulation Clock
    this.isPaused = false;
    this.timeScale = 50.0; // Simulation speed (default: 50 days per real second)
    this.simDaysElapsed = 0;
    this.simEpochDate = new Date(2026, 8, 14); // Sep 14, 2026

    // Raycaster for 3D picking
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.initThree();
    this.initModules();
    this.initUI();
    this.bindEvents();

    // Start render loop
    this.animate();
  }

  initThree() {
    // 1. Renderer Setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // 2. Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      48,
      window.innerWidth / window.innerHeight,
      0.5,
      4000
    );

    // 3. Ambient lighting for shadowed sides of planets
    const ambientLight = new THREE.AmbientLight(0x27272a, 0.45);
    this.scene.add(ambientLight);
  }

  initModules() {
    // Celestial system (Sun, 8 planets, 22 moons)
    this.celestial = new SolarSystemManager(this.scene);

    // Spaceflight planner
    this.flight = new SpaceflightPlanner(this.scene, this.celestial);

    // Camera controller
    this.cameraCtrl = new CameraController(
      this.camera,
      this.renderer.domElement,
      this.celestial,
      this.flight
    );
  }

  initUI() {
    // Populate Planet and Moon lists in Navigator
    this.populateNavigatorList();

    // Populate Mission Planner selects
    this.populatePlannerSelects();

    // Show initial educational card for Earth
    this.showBodyDetails('earth');

    // Hide Loading screen
    const loader = document.getElementById('loading-overlay');
    if (loader) {
      setTimeout(() => {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 600);
      }, 350);
    }
  }

  populateNavigatorList(filter = 'all') {
    const listEl = document.getElementById('celestial-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const items = CELESTIAL_DATA.filter(b => {
      if (filter === 'planets') return b.type === 'planet' || b.type === 'star';
      if (filter === 'moons') return b.type === 'moon';
      return true;
    });

    items.forEach(body => {
      const itemBtn = document.createElement('button');
      itemBtn.className = `nav-item ${body.type}`;
      itemBtn.dataset.id = body.id;

      const dot = document.createElement('span');
      dot.className = 'nav-dot';
      dot.style.backgroundColor = `#${body.colorHex.toString(16).padStart(6, '0')}`;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'nav-name';
      nameSpan.textContent = `${body.nameZh} (${body.name})`;

      itemBtn.appendChild(dot);
      itemBtn.appendChild(nameSpan);

      itemBtn.addEventListener('click', () => {
        this.selectBody(body.id);
      });

      listEl.appendChild(itemBtn);
    });
  }

  populatePlannerSelects() {
    const originSelect = document.getElementById('flight-origin');
    const destSelect = document.getElementById('flight-dest');
    if (!originSelect || !destSelect) return;

    originSelect.innerHTML = '';
    destSelect.innerHTML = '';

    // Major candidate bodies for mission planning
    const candidates = [
      { id: 'earth', name: '🌍 地球 (Earth)' },
      { id: 'moon', name: '🌕 月球 (Moon)' },
      { id: 'mars', name: '🔴 火星 (Mars)' },
      { id: 'jupiter', name: '🪐 木星 (Jupiter)' },
      { id: 'europa', name: '❄️ 木卫二 (Europa)' },
      { id: 'ganymede', name: '🛰️ 木卫三 (Ganymede)' },
      { id: 'saturn', name: '🪐 土星 (Saturn)' },
      { id: 'titan', name: '🌫️ 土卫六 (Titan)' },
      { id: 'enceladus', name: '💧 土卫二 (Enceladus)' },
      { id: 'uranus', name: '🔵 天王星 (Uranus)' },
      { id: 'neptune', name: '🌊 海王星 (Neptune)' },
      { id: 'triton', name: '❄️ 海卫一 (Triton)' },
      { id: 'mercury', name: '🪨 水星 (Mercury)' },
      { id: 'venus', name: '🟡 金星 (Venus)' }
    ];

    candidates.forEach(c => {
      const opt1 = document.createElement('option');
      opt1.value = c.id;
      opt1.textContent = c.name;
      originSelect.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = c.id;
      opt2.textContent = c.name;
      destSelect.appendChild(opt2);
    });

    originSelect.value = 'earth';
    destSelect.value = 'mars';

    // Auto-calculate default Earth -> Mars plan
    this.updateFlightPlan();
  }

  updateFlightPlan() {
    const originId = document.getElementById('flight-origin')?.value || 'earth';
    const destId = document.getElementById('flight-dest')?.value || 'mars';

    const plan = this.flight.calculateHohmannTransfer(originId, destId);
    if (!plan) return;

    // Update Plan Stats UI
    const transferDaysEl = document.getElementById('plan-time');
    const deltaVEl = document.getElementById('plan-deltav');
    const phaseAngleEl = document.getElementById('plan-phase');
    const missionDescEl = document.getElementById('plan-desc');

    if (transferDaysEl) {
      if (plan.transferTimeDays > 365) {
        const yrs = (plan.transferTimeDays / 365.25).toFixed(1);
        transferDaysEl.textContent = `${plan.transferTimeDays} 天 (约 ${yrs} 年)`;
      } else {
        transferDaysEl.textContent = `${plan.transferTimeDays} 天`;
      }
    }

    if (deltaVEl) {
      deltaVEl.textContent = `${plan.totalDeltaVKps} km/s (发射: ${plan.deltaV1Kps} / 入轨: ${plan.deltaV2Kps})`;
    }

    if (phaseAngleEl) {
      phaseAngleEl.textContent = `${plan.phaseAngleDeg}°`;
    }

    if (missionDescEl) {
      const originName = CELESTIAL_MAP.get(originId)?.nameZh || originId;
      const destName = CELESTIAL_MAP.get(destId)?.nameZh || destId;
      missionDescEl.textContent = `规划霍曼转移椭圆轨道：从 ${originName} 出发，切向加速脱离，经日心转移弧线交会于 ${destName} 轨道。`;
    }
  }

  selectBody(bodyId) {
    this.cameraCtrl.focusOnBody(bodyId);
    this.showBodyDetails(bodyId);

    // Update active class in list
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.id === bodyId);
    });
  }

  showBodyDetails(bodyId) {
    const body = CELESTIAL_MAP.get(bodyId);
    if (!body) return;

    const titleEl = document.getElementById('info-title');
    const subEl = document.getElementById('info-sub');
    const typeEl = document.getElementById('info-type');
    const radiusEl = document.getElementById('info-radius');
    const distEl = document.getElementById('info-dist');
    const periodEl = document.getElementById('info-period');
    const gravityEl = document.getElementById('info-gravity');
    const factsList = document.getElementById('info-facts');

    if (titleEl) titleEl.textContent = `${body.nameZh} · ${body.name}`;
    if (subEl) subEl.textContent = body.massKg;
    if (typeEl) {
      typeEl.textContent = body.type === 'star' ? '恒星 (Star)' : body.type === 'planet' ? '行星 (Planet)' : '天然卫星 (Moon)';
    }
    if (radiusEl) radiusEl.textContent = `${body.radiusKm.toLocaleString()} km`;
    if (distEl) {
      distEl.textContent = body.semiMajorAxisKm > 0
        ? `${body.semiMajorAxisKm.toLocaleString()} km`
        : '太阳系中心';
    }
    if (periodEl) {
      if (body.orbitalPeriodDays > 365) {
        periodEl.textContent = `${body.orbitalPeriodDays} 天 (${(body.orbitalPeriodDays / 365.25).toFixed(1)} 年)`;
      } else {
        periodEl.textContent = `${body.orbitalPeriodDays} 天`;
      }
    }
    if (gravityEl) gravityEl.textContent = `${body.gravityMps2} m/s²`;

    if (factsList) {
      factsList.innerHTML = '';
      body.factsZh.forEach(fact => {
        const li = document.createElement('li');
        li.textContent = fact;
        factsList.appendChild(li);
      });
    }
  }

  bindEvents() {
    // Window Resize
    window.addEventListener('resize', this.onWindowResize.bind(this));

    // 3D Canvas Click to Select
    this.renderer.domElement.addEventListener('click', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.celestial.pickableMeshes);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        if (hit.userData && hit.userData.id) {
          this.selectBody(hit.userData.id);
        }
      }
    });

    // Time Controls
    const btnPlayPause = document.getElementById('btn-play-pause');
    const btnSpeedDown = document.getElementById('btn-speed-down');
    const btnSpeedUp = document.getElementById('btn-speed-up');
    const speedDisplay = document.getElementById('speed-multiplier-text');

    btnPlayPause?.addEventListener('click', () => {
      this.isPaused = !this.isPaused;
      btnPlayPause.textContent = this.isPaused ? '▶️ 继续' : '⏸️ 暂停';
    });

    btnSpeedDown?.addEventListener('click', () => {
      this.timeScale = Math.max(1.0, this.timeScale / 2.5);
      if (speedDisplay) speedDisplay.textContent = `${this.timeScale.toFixed(0)}x`;
    });

    btnSpeedUp?.addEventListener('click', () => {
      this.timeScale = Math.min(5000.0, this.timeScale * 2.5);
      if (speedDisplay) speedDisplay.textContent = `${this.timeScale.toFixed(0)}x`;
    });

    // Scale Controls
    const planetScaleSlider = document.getElementById('slider-planet-scale');
    planetScaleSlider?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.celestial.setPlanetScale(val);
      const label = document.getElementById('planet-scale-val');
      if (label) label.textContent = `${val.toFixed(1)}x`;
    });

    // Visibility toggles
    document.getElementById('toggle-planet-orbits')?.addEventListener('change', (e) => {
      this.celestial.toggleOrbits(e.target.checked);
    });

    document.getElementById('toggle-moon-orbits')?.addEventListener('change', (e) => {
      this.celestial.toggleMoonOrbits(e.target.checked);
    });

    document.getElementById('toggle-labels')?.addEventListener('change', (e) => {
      this.celestial.toggleLabels(e.target.checked);
    });

    // Navigator Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.populateNavigatorList(tab.dataset.filter);
      });
    });

    // Camera Presets
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = btn.dataset.preset;
        this.cameraCtrl.setPreset(preset);
      });
    });

    // Mission Planner selects change
    document.getElementById('flight-origin')?.addEventListener('change', () => this.updateFlightPlan());
    document.getElementById('flight-dest')?.addEventListener('change', () => this.updateFlightPlan());

    // Launch & Abort Mission buttons
    document.getElementById('btn-launch-mission')?.addEventListener('click', () => {
      this.flight.launchMission();
      const telemetryCard = document.getElementById('telemetry-card');
      if (telemetryCard) telemetryCard.style.display = 'block';
    });

    document.getElementById('btn-abort-mission')?.addEventListener('click', () => {
      this.flight.abortMission();
      const telemetryCard = document.getElementById('telemetry-card');
      if (telemetryCard) telemetryCard.style.display = 'none';
    });

    // Chase Cam toggle
    document.getElementById('btn-chase-cam')?.addEventListener('click', () => {
      const isChase = !this.cameraCtrl.isChaseCam;
      this.cameraCtrl.setChaseCam(isChase);
      const btn = document.getElementById('btn-chase-cam');
      if (btn) btn.classList.toggle('active', isChase);
    });
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    const effectiveTimeScale = this.isPaused ? 0 : this.timeScale;

    // 1. Advance simulation clock
    if (!this.isPaused) {
      this.simDaysElapsed += delta * this.timeScale;
      this.updateDateDisplay();
    }

    // 2. Update Celestial orbits & spins
    this.celestial.update(delta, effectiveTimeScale);

    // 3. Update Spaceflight physics & telemetry
    this.flight.update(delta, effectiveTimeScale, (telem) => {
      this.updateTelemetryHUD(telem);
    });

    // 4. Update Camera Target Following
    this.cameraCtrl.update(delta);

    // 5. Render Scene
    this.renderer.render(this.scene, this.camera);
  }

  updateDateDisplay() {
    const simDate = new Date(this.simEpochDate.getTime() + this.simDaysElapsed * 86400000);
    const dateEl = document.getElementById('hud-date');
    if (dateEl) {
      const y = simDate.getFullYear();
      const m = String(simDate.getMonth() + 1).padStart(2, '0');
      const d = String(simDate.getDate()).padStart(2, '0');
      dateEl.textContent = `${y}-${m}-${d} (+${Math.round(this.simDaysElapsed)} 天)`;
    }
  }

  updateTelemetryHUD(telem) {
    const progBar = document.getElementById('telem-progress-bar');
    const progText = document.getElementById('telem-progress');
    const speedEl = document.getElementById('telem-speed');
    const timeEl = document.getElementById('telem-time');
    const distEl = document.getElementById('telem-dist');
    const statusEl = document.getElementById('telem-status');

    if (progBar) progBar.style.width = `${telem.progressPct}%`;
    if (progText) progText.textContent = `${telem.progressPct}%`;
    if (speedEl) speedEl.textContent = `${telem.currentSpeedKps} km/s`;
    if (timeEl) timeEl.textContent = `${telem.elapsedDays} / ${telem.totalDays} 天`;
    if (distEl) distEl.textContent = `${telem.distToTargetKm} km`;
    if (statusEl) {
      statusEl.textContent = telem.isArrived ? '✅ 成功泊入目标环绕轨道！' : '🚀 霍曼转移轨道巡航中...';
      statusEl.style.color = telem.isArrived ? '#4ade80' : '#38bdf8';
    }
  }
}

// Instantiate once DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new SolarSystemApp();
});
