/**
 * main.js — Main Entry Point for Solar System Explorer & Spaceflight Planner
 * Orchestrates Three.js WebGL rendering, simulation clock, raycasting, flight telemetry, and UI interactions.
 */

import * as THREE from 'three';
import { CELESTIAL_DATA, CELESTIAL_MAP, PLANETS, MOONS } from './data.js';
import { SolarSystemManager } from './celestial.js';
import { SpaceflightPlanner } from './flight.js';
import { CameraController } from './camera.js';
import { SOLAR_I18N } from './i18n.js';

class SolarSystemApp {
  constructor() {
    try {
      this.container = document.getElementById('canvas-container');
      this.clock = new THREE.Clock();

      // Language state
      this.currentLang = this.resolveLanguage();
      this.currentSelectedBodyId = 'earth';

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
    } catch (err) {
      console.error('Fatal SolarSystemApp startup error:', err);
      const loader = document.getElementById('loading-overlay');
      if (loader) {
        loader.innerHTML = `
          <div style="font-size: 32px; margin-bottom: 8px;">⚠️</div>
          <div style="font-size: 16px; font-weight: bold; color: #f87171; margin-bottom: 8px;">3D 场景加载失败</div>
          <div style="font-size: 12px; color: #94a3b8; max-width: 480px; text-align: center; line-height: 1.5; margin-bottom: 16px;">${err.message || err}</div>
          <button onclick="location.reload()" style="padding: 8px 16px; background: rgba(56,189,248,0.2); border: 1px solid #38bdf8; color: #fff; border-radius: 6px; cursor: pointer;">刷新重试</button>
        `;
      }
    }
  }

  initThree() {
    if (!this.container) {
      this.container = document.getElementById('canvas-container') || document.body;
    }

    // 1. Renderer Setup with fallback
    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance'
      });
    } catch (e) {
      console.warn('High-performance WebGL init failed, falling back to basic renderer:', e);
      this.renderer = new THREE.WebGLRenderer({ antialias: false });
    }
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

  resolveLanguage() {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlLang = params.get('lang');
      if (urlLang === 'zh' || urlLang === 'en') {
        localStorage.setItem('science_lang', urlLang);
        return urlLang;
      }
      const stored = localStorage.getItem('science_lang');
      if (stored === 'zh' || stored === 'en') return stored;
      const nav = (navigator.language || navigator.userLanguage || '').toLowerCase();
      return nav.startsWith('zh') ? 'zh' : 'en';
    } catch (e) {
      return 'zh';
    }
  }

  setLanguage(lang) {
    if (lang !== 'zh' && lang !== 'en') return;
    this.currentLang = lang;
    try {
      localStorage.setItem('science_lang', lang);
      const url = new URL(window.location.href);
      if (url.searchParams.get('lang') !== lang) {
        url.searchParams.set('lang', lang);
        window.history.replaceState({}, '', url.toString());
      }
    } catch (e) {}

    document.documentElement.lang = (lang === 'zh') ? 'zh-CN' : 'en';

    const homeBtn = document.getElementById('homeBtn');
    if (homeBtn) {
      homeBtn.href = `../index.html?lang=${lang}`;
    }

    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    this.applyLanguage();
  }

  applyLanguage() {
    const isEn = this.currentLang === 'en';

    const appTitle = document.getElementById('appTitle');
    if (appTitle) appTitle.textContent = isEn ? SOLAR_I18N.appTitle.en : SOLAR_I18N.appTitle.zh;
    const appTag = document.getElementById('appTag');
    if (appTag) appTag.textContent = isEn ? SOLAR_I18N.appTag.en : SOLAR_I18N.appTag.zh;
    const homeTxt = document.getElementById('homeTxt');
    if (homeTxt) homeTxt.textContent = isEn ? SOLAR_I18N.homeTxt.en : SOLAR_I18N.homeTxt.zh;

    const navPanelTitle = document.getElementById('navPanelTitle');
    if (navPanelTitle) navPanelTitle.textContent = isEn ? SOLAR_I18N.navPanelTitle.en : SOLAR_I18N.navPanelTitle.zh;
    const navPanelSub = document.getElementById('navPanelSub');
    if (navPanelSub) navPanelSub.textContent = isEn ? SOLAR_I18N.navPanelSub.en : SOLAR_I18N.navPanelSub.zh;

    const tabAll = document.getElementById('tabAll');
    if (tabAll) tabAll.textContent = isEn ? SOLAR_I18N.tabAll.en : SOLAR_I18N.tabAll.zh;
    const tabPlanets = document.getElementById('tabPlanets');
    if (tabPlanets) tabPlanets.textContent = isEn ? SOLAR_I18N.tabPlanets.en : SOLAR_I18N.tabPlanets.zh;
    const tabMoons = document.getElementById('tabMoons');
    if (tabMoons) tabMoons.textContent = isEn ? SOLAR_I18N.tabMoons.en : SOLAR_I18N.tabMoons.zh;

    const lblType = document.getElementById('lblType');
    if (lblType) lblType.textContent = isEn ? SOLAR_I18N.lblType.en : SOLAR_I18N.lblType.zh;
    const lblRadius = document.getElementById('lblRadius');
    if (lblRadius) lblRadius.textContent = isEn ? SOLAR_I18N.lblRadius.en : SOLAR_I18N.lblRadius.zh;
    const lblDist = document.getElementById('lblDist');
    if (lblDist) lblDist.textContent = isEn ? SOLAR_I18N.lblDist.en : SOLAR_I18N.lblDist.zh;
    const lblPeriod = document.getElementById('lblPeriod');
    if (lblPeriod) lblPeriod.textContent = isEn ? SOLAR_I18N.lblPeriod.en : SOLAR_I18N.lblPeriod.zh;
    const lblGravity = document.getElementById('lblGravity');
    if (lblGravity) lblGravity.textContent = isEn ? SOLAR_I18N.lblGravity.en : SOLAR_I18N.lblGravity.zh;
    const factsHeader = document.getElementById('factsHeader');
    if (factsHeader) factsHeader.textContent = isEn ? SOLAR_I18N.factsHeader.en : SOLAR_I18N.factsHeader.zh;

    const missionTitle = document.getElementById('missionTitle');
    if (missionTitle) missionTitle.textContent = isEn ? SOLAR_I18N.missionTitle.en : SOLAR_I18N.missionTitle.zh;
    const lblOrigin = document.getElementById('lblOrigin');
    if (lblOrigin) lblOrigin.textContent = isEn ? SOLAR_I18N.lblOrigin.en : SOLAR_I18N.lblOrigin.zh;
    const lblDest = document.getElementById('lblDest');
    if (lblDest) lblDest.textContent = isEn ? SOLAR_I18N.lblDest.en : SOLAR_I18N.lblDest.zh;
    const lblPlanTime = document.getElementById('lblPlanTime');
    if (lblPlanTime) lblPlanTime.textContent = isEn ? SOLAR_I18N.lblPlanTime.en : SOLAR_I18N.lblPlanTime.zh;
    const lblPlanDeltaV = document.getElementById('lblPlanDeltaV');
    if (lblPlanDeltaV) lblPlanDeltaV.textContent = isEn ? SOLAR_I18N.lblPlanDeltaV.en : SOLAR_I18N.lblPlanDeltaV.zh;
    const lblPlanPhase = document.getElementById('lblPlanPhase');
    if (lblPlanPhase) lblPlanPhase.textContent = isEn ? SOLAR_I18N.lblPlanPhase.en : SOLAR_I18N.lblPlanPhase.zh;

    const btnLaunch = document.getElementById('btn-launch-mission');
    if (btnLaunch) btnLaunch.textContent = isEn ? SOLAR_I18N.btnLaunch.en : SOLAR_I18N.btnLaunch.zh;
    const btnChaseCam = document.getElementById('btn-chase-cam');
    if (btnChaseCam) btnChaseCam.textContent = isEn ? SOLAR_I18N.btnChaseCam.en : SOLAR_I18N.btnChaseCam.zh;
    const btnAbort = document.getElementById('btn-abort-mission');
    if (btnAbort) btnAbort.textContent = isEn ? SOLAR_I18N.btnAbort.en : SOLAR_I18N.btnAbort.zh;

    const lblTelemSpeed = document.getElementById('lblTelemSpeed');
    if (lblTelemSpeed) lblTelemSpeed.textContent = isEn ? SOLAR_I18N.lblTelemSpeed.en : SOLAR_I18N.lblTelemSpeed.zh;
    const lblTelemTime = document.getElementById('lblTelemTime');
    if (lblTelemTime) lblTelemTime.textContent = isEn ? SOLAR_I18N.lblTelemTime.en : SOLAR_I18N.lblTelemTime.zh;
    const lblTelemDist = document.getElementById('lblTelemDist');
    if (lblTelemDist) lblTelemDist.textContent = isEn ? SOLAR_I18N.lblTelemDist.en : SOLAR_I18N.lblTelemDist.zh;

    const btnPlayPause = document.getElementById('btn-play-pause');
    if (btnPlayPause) {
      btnPlayPause.textContent = this.isPaused
        ? (isEn ? SOLAR_I18N.btnPlayPause.playEn : SOLAR_I18N.btnPlayPause.playZh)
        : (isEn ? SOLAR_I18N.btnPlayPause.pauseEn : SOLAR_I18N.btnPlayPause.pauseZh);
    }

    document.querySelectorAll('.preset-btn').forEach(btn => {
      const p = btn.dataset.preset;
      if (SOLAR_I18N.presets[p]) {
        btn.textContent = isEn ? SOLAR_I18N.presets[p].en : SOLAR_I18N.presets[p].zh;
      }
    });

    const lblTogglePlanetOrbits = document.getElementById('lblTogglePlanetOrbits');
    if (lblTogglePlanetOrbits) lblTogglePlanetOrbits.textContent = isEn ? SOLAR_I18N.toggles.planetOrbits.en : SOLAR_I18N.toggles.planetOrbits.zh;
    const lblToggleMoonOrbits = document.getElementById('lblToggleMoonOrbits');
    if (lblToggleMoonOrbits) lblToggleMoonOrbits.textContent = isEn ? SOLAR_I18N.toggles.moonOrbits.en : SOLAR_I18N.toggles.moonOrbits.zh;
    const lblToggleLabels = document.getElementById('lblToggleLabels');
    if (lblToggleLabels) lblToggleLabels.textContent = isEn ? SOLAR_I18N.toggles.labels.en : SOLAR_I18N.toggles.labels.zh;
    const lblPlanetScale = document.getElementById('lblPlanetScale');
    if (lblPlanetScale) lblPlanetScale.textContent = isEn ? SOLAR_I18N.toggles.scale.en : SOLAR_I18N.toggles.scale.zh;

    // Refresh dynamic lists and details
    const activeFilter = document.querySelector('.filter-tab.active')?.dataset.filter || 'all';
    this.populateNavigatorList(activeFilter);
    this.populatePlannerSelects();
    if (this.currentSelectedBodyId) {
      this.showBodyDetails(this.currentSelectedBodyId);
    } else {
      this.showBodyDetails('earth');
    }
    this.updateFlightPlan();
    this.updateDateDisplay();
  }

  initUI() {
    this.currentSelectedBodyId = 'earth';
    this.setLanguage(this.currentLang);

    // Hide Loading screen
    window.__solarSystemReady = true;
    const loader = document.getElementById('loading-overlay');
    if (loader) {
      setTimeout(() => {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 600);
      }, 250);
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

    const isEn = this.currentLang === 'en';

    items.forEach(body => {
      const itemBtn = document.createElement('button');
      itemBtn.className = `nav-item ${body.type}`;
      itemBtn.dataset.id = body.id;
      if (this.currentSelectedBodyId === body.id) {
        itemBtn.classList.add('active');
      }

      const dot = document.createElement('span');
      dot.className = 'nav-dot';
      dot.style.backgroundColor = `#${body.colorHex.toString(16).padStart(6, '0')}`;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'nav-name';
      nameSpan.textContent = isEn ? body.name : `${body.nameZh} (${body.name})`;

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

    const prevOrigin = originSelect.value || 'earth';
    const prevDest = destSelect.value || 'mars';

    originSelect.innerHTML = '';
    destSelect.innerHTML = '';

    const isEn = this.currentLang === 'en';

    // Major candidate bodies for mission planning
    const candidates = [
      { id: 'earth', icon: '🌍', nameZh: '地球 (Earth)', nameEn: 'Earth' },
      { id: 'moon', icon: '🌕', nameZh: '月球 (Moon)', nameEn: 'Moon' },
      { id: 'mars', icon: '🔴', nameZh: '火星 (Mars)', nameEn: 'Mars' },
      { id: 'jupiter', icon: '🪐', nameZh: '木星 (Jupiter)', nameEn: 'Jupiter' },
      { id: 'europa', icon: '❄️', nameZh: '木卫二 (Europa)', nameEn: 'Europa' },
      { id: 'ganymede', icon: '🛰️', nameZh: '木卫三 (Ganymede)', nameEn: 'Ganymede' },
      { id: 'saturn', icon: '🪐', nameZh: '土星 (Saturn)', nameEn: 'Saturn' },
      { id: 'titan', icon: '🌫️', nameZh: '土卫六 (Titan)', nameEn: 'Titan' },
      { id: 'enceladus', icon: '💧', nameZh: '土卫二 (Enceladus)', nameEn: 'Enceladus' },
      { id: 'uranus', icon: '🔵', nameZh: '天王星 (Uranus)', nameEn: 'Uranus' },
      { id: 'neptune', icon: '🌊', nameZh: '海王星 (Neptune)', nameEn: 'Neptune' },
      { id: 'triton', icon: '❄️', nameZh: '海卫一 (Triton)', nameEn: 'Triton' },
      { id: 'mercury', icon: '🪨', nameZh: '水星 (Mercury)', nameEn: 'Mercury' },
      { id: 'venus', icon: '🟡', nameZh: '金星 (Venus)', nameEn: 'Venus' }
    ];

    candidates.forEach(c => {
      const opt1 = document.createElement('option');
      opt1.value = c.id;
      opt1.textContent = isEn ? `${c.icon} ${c.nameEn}` : `${c.icon} ${c.nameZh}`;
      originSelect.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = c.id;
      opt2.textContent = isEn ? `${c.icon} ${c.nameEn}` : `${c.icon} ${c.nameZh}`;
      destSelect.appendChild(opt2);
    });

    originSelect.value = prevOrigin;
    destSelect.value = prevDest;

    // Auto-calculate default Earth -> Mars plan
    this.updateFlightPlan();
  }

  updateFlightPlan() {
    const originId = document.getElementById('flight-origin')?.value || 'earth';
    const destId = document.getElementById('flight-dest')?.value || 'mars';

    const plan = this.flight.calculateHohmannTransfer(originId, destId);
    if (!plan) return;

    const isEn = this.currentLang === 'en';

    // Update Plan Stats UI
    const transferDaysEl = document.getElementById('plan-time');
    const deltaVEl = document.getElementById('plan-deltav');
    const phaseAngleEl = document.getElementById('plan-phase');
    const missionDescEl = document.getElementById('plan-desc');

    if (transferDaysEl) {
      if (plan.transferTimeDays > 365) {
        const yrs = (plan.transferTimeDays / 365.25).toFixed(1);
        transferDaysEl.textContent = isEn
          ? `${plan.transferTimeDays} days (~${yrs} yrs)`
          : `${plan.transferTimeDays} 天 (约 ${yrs} 年)`;
      } else {
        transferDaysEl.textContent = isEn
          ? `${plan.transferTimeDays} days`
          : `${plan.transferTimeDays} 天`;
      }
    }

    if (deltaVEl) {
      deltaVEl.textContent = isEn
        ? `${plan.totalDeltaVKps} km/s (Departure: ${plan.deltaV1Kps} / Insertion: ${plan.deltaV2Kps})`
        : `${plan.totalDeltaVKps} km/s (发射: ${plan.deltaV1Kps} / 入轨: ${plan.deltaV2Kps})`;
    }

    if (phaseAngleEl) {
      phaseAngleEl.textContent = `${plan.phaseAngleDeg}°`;
    }

    if (missionDescEl) {
      const originBody = CELESTIAL_MAP.get(originId);
      const destBody = CELESTIAL_MAP.get(destId);
      const originName = isEn ? (originBody?.name || originId) : (originBody?.nameZh || originId);
      const destName = isEn ? (destBody?.name || destId) : (destBody?.nameZh || destId);
      missionDescEl.textContent = isEn
        ? `Hohmann Transfer Orbit: Departing from ${originName}, tangential burn injection into heliocentric transfer arc rendezvous with ${destName} orbit.`
        : `规划霍曼转移椭圆轨道：从 ${originName} 出发，切向加速脱离，经日心转移弧线交会于 ${destName} 轨道。`;
    }
  }

  selectBody(bodyId) {
    this.currentSelectedBodyId = bodyId;
    this.cameraCtrl.focusOnBody(bodyId);
    this.showBodyDetails(bodyId);

    // Update active class in list
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.id === bodyId);
    });
  }

  showBodyDetails(bodyId) {
    this.currentSelectedBodyId = bodyId;
    const body = CELESTIAL_MAP.get(bodyId);
    if (!body) return;

    const isEn = this.currentLang === 'en';

    const titleEl = document.getElementById('info-title');
    const subEl = document.getElementById('info-sub');
    const typeEl = document.getElementById('info-type');
    const radiusEl = document.getElementById('info-radius');
    const distEl = document.getElementById('info-dist');
    const periodEl = document.getElementById('info-period');
    const gravityEl = document.getElementById('info-gravity');
    const factsList = document.getElementById('info-facts');

    if (titleEl) titleEl.textContent = isEn ? body.name : `${body.nameZh} · ${body.name}`;
    if (subEl) subEl.textContent = body.massKg;
    if (typeEl) {
      typeEl.textContent = isEn ? SOLAR_I18N.types[body.type].en : SOLAR_I18N.types[body.type].zh;
    }
    if (radiusEl) radiusEl.textContent = `${body.radiusKm.toLocaleString()} km`;
    if (distEl) {
      distEl.textContent = body.semiMajorAxisKm > 0
        ? `${body.semiMajorAxisKm.toLocaleString()} km`
        : (isEn ? SOLAR_I18N.sunCenter.en : SOLAR_I18N.sunCenter.zh);
    }
    if (periodEl) {
      if (body.orbitalPeriodDays > 365) {
        const yrs = (body.orbitalPeriodDays / 365.25).toFixed(1);
        periodEl.textContent = isEn
          ? `${body.orbitalPeriodDays} days (~${yrs} yrs)`
          : `${body.orbitalPeriodDays} 天 (${(body.orbitalPeriodDays / 365.25).toFixed(1)} 年)`;
      } else {
        periodEl.textContent = isEn
          ? `${body.orbitalPeriodDays} days`
          : `${body.orbitalPeriodDays} 天`;
      }
    }
    if (gravityEl) gravityEl.textContent = `${body.gravityMps2} m/s²`;

    if (factsList) {
      factsList.innerHTML = '';
      const facts = (isEn && body.factsEn && body.factsEn.length > 0) ? body.factsEn : body.factsZh;
      facts.forEach(fact => {
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
      const isEn = this.currentLang === 'en';
      btnPlayPause.textContent = this.isPaused
        ? (isEn ? SOLAR_I18N.btnPlayPause.playEn : SOLAR_I18N.btnPlayPause.playZh)
        : (isEn ? SOLAR_I18N.btnPlayPause.pauseEn : SOLAR_I18N.btnPlayPause.pauseZh);
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

    // Language buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const lang = btn.dataset.lang;
        if (lang) this.setLanguage(lang);
      });
    });

    // Multi-tab storage sync
    window.addEventListener('storage', (e) => {
      if (e.key === 'science_lang' && e.newValue && e.newValue !== this.currentLang) {
        this.setLanguage(e.newValue);
      }
    });

    // bfcache pageshow sync
    window.addEventListener('pageshow', () => {
      const active = this.resolveLanguage();
      if (active !== this.currentLang) {
        this.setLanguage(active);
      }
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
      const isEn = this.currentLang === 'en';
      dateEl.textContent = `${y}-${m}-${d} (+${Math.round(this.simDaysElapsed)} ${isEn ? 'days' : '天'})`;
    }
  }

  updateTelemetryHUD(telem) {
    const progBar = document.getElementById('telem-progress-bar');
    const progText = document.getElementById('telem-progress');
    const speedEl = document.getElementById('telem-speed');
    const timeEl = document.getElementById('telem-time');
    const distEl = document.getElementById('telem-dist');
    const statusEl = document.getElementById('telem-status');
    const isEn = this.currentLang === 'en';

    if (progBar) progBar.style.width = `${telem.progressPct}%`;
    if (progText) progText.textContent = `${telem.progressPct}%`;
    if (speedEl) speedEl.textContent = `${telem.currentSpeedKps} km/s`;
    if (timeEl) timeEl.textContent = `${telem.elapsedDays} / ${telem.totalDays} ${isEn ? 'days' : '天'}`;
    if (distEl) distEl.textContent = `${telem.distToTargetKm} km`;
    if (statusEl) {
      statusEl.textContent = telem.isArrived
        ? (isEn ? '✅ Successfully parked into target orbit!' : '✅ 成功泊入目标环绕轨道！')
        : (isEn ? '🚀 Cruising Hohmann transfer orbit...' : '🚀 霍曼转移轨道巡航中...');
      statusEl.style.color = telem.isArrived ? '#4ade80' : '#38bdf8';
    }
  }
}

// Reliable Booting (handles loading, interactive, and complete document states)
function boot() {
  if (window.__solarSystemApp) return;
  window.__solarSystemApp = new SolarSystemApp();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
