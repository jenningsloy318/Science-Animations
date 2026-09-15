// main.js — scene setup, 4-stroke engine animation, narrated ignition story player, audio synthesizer, camera tweening, component inspector, differential & transmission physics, live telemetry HUD.
// Phase 3 (SCENARIO-005..010/018..022): the narrated 9-step ICE and 5-step EV
// walkthrough timelines ship as data in js/ignition-story.js and this entry
// module plays them with per-stage captions, per-stage cameraFocus flights,
// no-restart gating, a visible 重新播放点火 Replay start control, cooling/fuel
// camera presets and hudCoolant/hudOil telemetry from js/telemetry.js.
// Phase 2 (SCENARIO-002/013/014/015/024): the coupled drivetrain — exact
// slider-crank pistons, half-speed cam, gear-scaled prop shaft and
// steering-split differential — now runs through js/kinematics.js
// updateDrivetrain(state, dt), and the gold energy path animates through
// js/torque-flow.js, while every legacy control keeps its observable behavior.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildCarModel, VALVE_LIFT, VALVE_BASE_Y, ROD_CENTER_DIST } from './car-model.js';
import { buildSubsystems } from './car-subsystems.js';
import { PART_INFO } from './part-inspector-data.js';
import { updateDrivetrain, GEAR_RATIOS } from './kinematics.js';
import { buildTorqueFlow, updateTorqueFlow } from './torque-flow.js';
import { ICE_STEPS, EV_STEPS } from './ignition-story.js';
import { updateTelemetry } from './telemetry.js';

// The closed 21-part identifier inventory actually wired into the inspector
// by this entry module (SCENARIO-016/SCENARIO-017).
export const SUBSYSTEM_PART_IDS = Object.freeze(Object.keys(PART_INFO));

// SCENARIO-018/019: the cooling and fuel presets join CAMERA_PRESETS while
// every legacy preset keeps its identical pos/target.
export const FOCUS_SCENARIO_TAGS = Object.freeze(['SCENARIO-018', 'SCENARIO-019']);

let scene, camera, renderer, controls, parts;
let currentMode = 'ICE';
let isRunning = false;
let isBraking = false;
let soundEnabled = true;
let torqueFlow = null;

// Raycasting for interactive inspection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Mechanical Parameters
let targetRPM = 800;
let currentRPM = 0;
let currentGear = '3';
let gearRatio = 0.85;
let steerAngleDeg = 0; // -30° to +30°
let strokeStepIndex = 0; // 0: Intake, 1: Compression, 2: Power, 3: Exhaust
let isStepMode = false;

let crankAngle = 0;       // Crankshaft angle (rad)
let crankAngleDelta = 0;  // Crank advance for the current frame (rad)
let propShaftAngle = 0;   // Gear-scaled prop shaft angle (rad), driven by updateDrivetrain
let targetCameraPos = new THREE.Vector3(12, 10, 16);
let targetCameraLookAt = new THREE.Vector3(0, 0, 0);
// Camera tween flag: the preset flight lerps the camera ONLY while active —
// the moment the user grabs the orbit controls (or the flight arrives), the
// tween stops so OrbitControls has full, uninterrupted rotate/zoom/pan.
let cameraTweenActive = false;

// ═══════════ 点火故事播放器状态 ═══════════
// SCENARIO-006: storyPlaying guards against restarts mid-story; storyStep is
// the inspectable stage counter (exposed on window.ignitionStoryState).
let storyPlaying = false;
let storyStep = 0;
let storyTimers = [];
let crankInterval = null;
let replayBtnEl = null;
const storyState = {
  mode: 'ICE',
  step: 0,
  playing: false,
  caption: '',
  steps: ICE_STEPS,
};
window.ignitionStoryState = storyState;
// Lightweight debug/test hook: camera + rotation-arrow state.
window.__hcwDebug = {
  cam: () => camera.position.toArray(),
  tgt: () => controls.target.toArray(),
  arrows: () => (parts ? parts.rotationArrows?.visible : undefined),
  // Programmatic framing for audit scripts: cancels any preset tween and
  // hands OrbitControls the new camera/target (keeps internal spherical in
  // sync so update() does not yank the camera back).
  frame(pos, target) {
    cameraTweenActive = false;
    camera.position.set(...pos);
    controls.target.set(...target);
    controls.update();
  },
};
// Raycast probe used by browser-audit scripts: which named meshes live in a
// screen-space region of the current view. (Assigned lazily in animate —
// scene/camera don't exist at module-eval time.)
window.__hcwRaycaster = new THREE.Raycaster();

// SCENARIO-020/021: persistent coolant temperature fed back into
// updateTelemetry every animation frame.
const telemetryState = { running: false, engineRunning: false, rpm: 0, coolantTemp: 20, engineTemp: 20 };

// Web Audio API Synthesizer
let audioCtx = null;
let engineOsc = null;
let engineGain = null;
let engineFilter = null;

// Focus Presets — SCENARIO-018: cooling (radiator/water pump) and fuel
// (tank/pump/injector rail) join the untouched legacy nine.
const CAMERA_PRESETS = {
  overview:     { pos: [13, 8, 15],     target: [0, 0.5, 0] },
  engine:       { pos: [-4.2, 3.6, 4.6],  target: [-4.85, 1.0, 0] },
  starter:      { pos: [-4.6, 0.9, 3.4],  target: [-3.7, -0.4, 0.5] },
  gearbox:      { pos: [-2.4, 2.6, 3.4],  target: [-2.4, 0, 0] },
  driveshaft:   { pos: [1.0, 2.6, 3.6],   target: [1.0, 0, 0] },
  differential: { pos: [2.45, 0.75, 2.75], target: [3.45, -0.28, 0] }, // front-right-low: cone profile + mesh both visible
  steering:     { pos: [-5.9, 1.8, 3.4],  target: [-5.9, -0.4, 0] },
  brakes:       { pos: [3.6, 1.2, 4.0],   target: [3.6, 0, 2.42] },
  evMotor:      { pos: [-1.6, 2.5, 3.4],  target: [-1.6, 0, 0] },
  cooling:      { pos: [-5.6, 2.2, 4.6],  target: [-7.0, 0.7, 0] },
  fuel:         { pos: [3.4, 1.6, 4.0],   target: [2.9, -0.9, 0.3] },
};

// Layer-2 self-checks (SCENARIO-008/019/022): the step shapes and the preset
// key closure are pinned in the browser console as executable documentation.
console.assert(
  ICE_STEPS.length === 9 && ICE_STEPS.every((s) => typeof s.caption === 'string' && s.caption.length >= 6 && !!s.cameraFocus && s.duration > 0),
  'SCENARIO-008 failed: ICE_STEPS must be exactly 9 steps of {caption, cameraFocus, duration}'
);
console.assert(
  EV_STEPS.length === 5 && EV_STEPS.every((s) => typeof s.caption === 'string' && !!s.cameraFocus && s.duration > 0),
  'SCENARIO-022 failed: EV_STEPS must be exactly 5 steps of {caption, cameraFocus, duration}'
);
console.assert(
  ['overview', 'engine', 'starter', 'gearbox', 'driveshaft', 'differential', 'steering', 'brakes', 'evMotor', 'cooling', 'fuel'].every((k) => CAMERA_PRESETS[k]),
  'SCENARIO-019 failed: CAMERA_PRESETS must keep all legacy keys plus cooling and fuel'
);

// ═══════════ 初始化 ═══════════
function init3D() {
  const container = document.getElementById('canvas3d');
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030712);

  camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(...CAMERA_PRESETS.overview.pos);

  renderer = new THREE.WebGLRenderer({ canvas: container, antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.target.set(...CAMERA_PRESETS.overview.target);
  // User grabbed the camera → immediately cancel any preset flight so the
  // drag is never fought by the per-frame lerp (free rotate/zoom/pan).
  controls.addEventListener('start', () => { cameraTweenActive = false; });

  // Lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(20, 40, 20);
  scene.add(dirLight);

  const blueLight = new THREE.PointLight(0x38bdf8, 2.0, 30);
  blueLight.position.set(0, 5, 0);
  scene.add(blueLight);

  const orangeLight = new THREE.PointLight(0xf97316, 1.5, 20);
  orangeLight.position.set(-4.8, 2.4, 0);
  scene.add(orangeLight);

  const grid = new THREE.GridHelper(60, 40, 0x1e293b, 0x0f172a);
  grid.position.y = -0.92;
  scene.add(grid);

  parts = buildCarModel(scene);

  // SCENARIO-017: build the five subsystem groups (parented to the ICE group so
  // they hide in EV mode), then register every one of the 21 new parts into the
  // existing raycast inspector so no new part is dead on click.
  const BASELINEInspectableCount = parts.inspectableObjects.length;
  const subsystems = buildSubsystems({ scene, parent: parts.iceParts });
  registerSubsystemParts(subsystems);
  console.assert(
    parts.inspectableObjects.length === BASELINEInspectableCount + 21,
    `SCENARIO-017 failed: inspectable count must equal BASELINEInspectableCount + 21 (got ${parts.inspectableObjects.length})`
  );

  // SCENARIO-015: the gold torque-flow particle path battery → starter →
  // engine → transmission → wheels, updated every frame while running.
  torqueFlow = buildTorqueFlow(scene);
  torqueFlow.group.visible = false;

  // Layer-2 self-check (SCENARIO-002): the coupled drivetrain must keep the
  // verbatim legacy gear table {1:0.4, 2:0.65, 3:0.85, 4:1.1, R:-0.5}.
  console.assert(
    JSON.stringify(GEAR_RATIOS) === JSON.stringify({ '1': 0.4, '2': 0.65, '3': 0.85, '4': 1.1, 'R': -0.5 }),
    'SCENARIO-002 failed: GEAR_RATIOS must stay the verbatim legacy table'
  );

  window.addEventListener('resize', onWindowResize);
  container.addEventListener('pointerdown', onCanvasPointerDown);
  setupEvents();
  animate();
}

function onWindowResize() {
  const container = document.getElementById('canvas3d');
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

// ═══════════ Web Audio Engine Sound ═══════════
function initAudio() {
  if (audioCtx) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();

    engineOsc = audioCtx.createOscillator();
    engineOsc.type = 'sawtooth';

    engineFilter = audioCtx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 200;

    engineGain = audioCtx.createGain();
    engineGain.gain.value = 0;

    engineOsc.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(audioCtx.destination);
    engineOsc.start();
  } catch (e) {
    console.warn("Web Audio API not supported", e);
  }
}

function updateAudio(rpm, active) {
  if (!audioCtx || !soundEnabled) return;
  if (audioCtx.state === 'suspended' && active) {
    audioCtx.resume();
  }

  if (active && rpm > 50) {
    const baseFreq = currentMode === 'ICE' ? (rpm / 60) * 2 : (rpm / 60) * 4;
    engineOsc.frequency.setTargetAtTime(baseFreq, audioCtx.currentTime, 0.05);
    engineFilter.frequency.setTargetAtTime(baseFreq * 3, audioCtx.currentTime, 0.05);
    engineGain.gain.setTargetAtTime(isBraking ? 0.04 : 0.08, audioCtx.currentTime, 0.05);
  } else {
    engineGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
  }
}

// Raycasting inspection on 3D click
function onCanvasPointerDown(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(parts.inspectableObjects, true);

  if (intersects.length > 0) {
    const targetObj = intersects[0].object;
    showInspectorCard(targetObj.userData);
  }
}

function showInspectorCard(data) {
  const card = document.getElementById('inspectorCard');
  if (!data || !data.name) {
    card.style.display = 'none';
    return;
  }
  const inspTitle = document.getElementById('inspTitle');
  const inspDesc = document.getElementById('inspDesc');
  document.getElementById('inspCategory').innerText = data.category || '核心部件';
  inspTitle.innerText = data.name;
  inspDesc.innerText = data.description || '';
  card.style.display = 'block';
}

// SCENARIO-016/SCENARIO-017: stamp every subsystem mesh with its bilingual
// PART_INFO copy (found via userData.partId) and push the 21 part groups into
// parts.inspectableObjects so the raycaster picks them up recursively.
const SUBSYSTEM_CATEGORY = {
  fuelDelivery: '燃油供给 Fuel Delivery',
  airIntake: '进气系统 Air Intake',
  cooling: '冷却系统 Cooling',
  lubrication: '润滑系统 Lubrication',
  exhaust: '排气系统 Exhaust',
};

function registerSubsystemParts(subsystems) {
  for (const [systemKey, systemGroup] of Object.entries(subsystems)) {
    for (const partGroup of systemGroup.children) {
      const partId = partGroup.userData.partId;
      const info = PART_INFO[partId];
      if (!info) continue;
      partGroup.traverse((obj) => {
        obj.userData.inspectable = true;
        obj.userData.name = `${info.nameZh} ${info.nameEn}`;
        obj.userData.category = SUBSYSTEM_CATEGORY[systemKey];
        obj.userData.description = info.kidDesc;
      });
      parts.inspectableObjects.push(partGroup);
    }
  }
}

// ═══════════ 叙事点火故事播放器 (SCENARIO-005..010, SCENARIO-022) ═══════════
// The same framework plays both timelines: btnEV mode replays it with the
// 5-step EV_STEPS walkthrough instead of the 9-step ICE_STEPS one.
function storySteps() {
  return currentMode === 'EV' ? EV_STEPS : ICE_STEPS;
}

function playIgnitionStory() {
  if (storyPlaying) return; // SCENARIO-006: mid-story restarts are ignored
  storyPlaying = true;
  storyState.playing = true;
  storyState.mode = currentMode;
  storyState.steps = storySteps();
  initAudio();
  hideReplayBtn();

  const startBtnText = document.getElementById('startBtnText');
  startBtnText.innerText = '点火中...';

  runStoryStep(0);
}

// Advance to one narrated stage: show its caption, tween the camera onto that
// step cameraFocus target, run the stage's mechanical side effects, then wait
// out the step duration before the next stage.
function runStoryStep(stepIndex) {
  const steps = storySteps();
  if (stepIndex >= steps.length) {
    finishStory();
    return;
  }

  storyStep = stepIndex;
  storyState.step = stepIndex;

  const step = steps[stepIndex];
  storyState.caption = step.caption;

  const captionEl = document.getElementById('storyCaption');
  captionEl.style.display = 'block';
  captionEl.innerText = `第 ${storyStep + 1} / ${steps.length} 步 · ${step.caption}`;

  // SCENARIO-007: camera flight onto the part that is working right now.
  setFocusPreset(step.cameraFocus);
  applyStoryStepEffects(step.id);

  storyTimers.push(setTimeout(() => runStoryStep(stepIndex + 1), step.duration));
}

// Mechanical side effects per stage id: Bendix engagement, starter cranking
// and the moment the engine/motor catches and starts running on its own.
function applyStoryStepEffects(stepId) {
  if (currentMode === 'ICE') {
    if (stepId === 'starterSpins') {
      if (parts.starterBendixGear) parts.starterBendixGear.position.x = 0.45; // extended: meshing the ring gear
      if (!isRunning) startCranking();
    } else if (stepId === 'firstCombustion') {
      stopCranking();
      isRunning = true;
    } else if (stepId === 'catchesAndIdles') {
      if (parts.starterBendixGear) parts.starterBendixGear.position.x = 0.22; // retracted
    }
  } else if (stepId === 'rotatingFieldSpinsRotor') {
    if (!isRunning) startCranking();
  } else if (stepId === 'instantTorqueToWheels') {
    stopCranking();
    isRunning = true;
  }
}

// Starter-crank animation shared by both stories: advances the crank (and the
// EV rotor through the animation loop) until the engine/motor catches.
function startCranking() {
  if (crankInterval) return;
  crankInterval = setInterval(() => {
    crankAngle += Math.PI * 0.4;
    if (currentMode === 'ICE') updateEngine(crankAngle);
  }, 100);
}

function stopCranking() {
  if (crankInterval) {
    clearInterval(crankInterval);
    crankInterval = null;
  }
}

function clearStoryTimers() {
  storyTimers.forEach((t) => clearTimeout(t));
  storyTimers = [];
}

function abortStory() {
  clearStoryTimers();
  stopCranking();
  storyPlaying = false;
  storyState.playing = false;
  const captionEl = document.getElementById('storyCaption');
  if (captionEl) captionEl.style.display = 'none';
  hideReplayBtn();
}

// SCENARIO-009/010: after the walkthrough the engine stays in its running
// state and the 重新播放点火 Replay start control becomes visible.
function finishStory() {
  stopCranking();
  storyPlaying = false;
  storyState.playing = false;

  if (!isRunning) isRunning = true;
  updateStartBtn();
  setFocusPreset(currentMode === 'ICE' ? 'engine' : 'evMotor');

  const captionEl = document.getElementById('storyCaption');
  captionEl.innerText = currentMode === 'ICE'
    ? '🎉 点火完成！发动机怠速运转中 —— 点「重新播放点火」再看一遍。'
    : '🎉 就绪！电机瞬间输出最大扭矩 —— 点「重新播放点火」再看一遍。';

  showReplayBtn();
}

// SCENARIO-010: always available — while running AND after shutdown.
function showReplayBtn() {
  if (replayBtnEl) replayBtnEl.style.display = 'inline-flex';
}

function hideReplayBtn() {
  if (replayBtnEl) replayBtnEl.style.display = 'none';
}

// ═══════════ 模式与视角 ═══════════
function switchMode(mode) {
  currentMode = mode;
  abortStory();
  storyState.mode = mode;
  storyState.steps = storySteps();
  storyState.step = 0;
  isRunning = false;
  updateStartBtn();

  parts.iceParts.visible = (mode === 'ICE');
  parts.evParts.visible  = (mode === 'EV');
  parts.particleMat.color.set(mode === 'ICE' ? 0xfbbf24 : 0x22d3ee);
  parts.torqueFlowParticles.forEach(p => { p.visible = false; });
  if (torqueFlow) torqueFlow.group.visible = false;

  document.querySelectorAll('.ice-only').forEach(el => el.style.display = mode === 'ICE' ? 'block' : 'none');
  document.querySelectorAll('.ev-only').forEach(el => el.style.display = mode === 'EV' ? 'inline-block' : 'none');

  document.getElementById('btnICE').className = mode === 'ICE' ? 'mode-btn active ice' : 'mode-btn ice';
  document.getElementById('btnEV').className  = mode === 'EV'  ? 'mode-btn active ev'  : 'mode-btn ev';

  document.getElementById('explainerTitle').innerText = mode === 'ICE' ? '💡 燃油车动力传输全脉络：' : '💡 电动车动力传输全脉络：';
  document.getElementById('kidText').innerText = mode === 'ICE'
    ? '观察起动机推齿！按下启动键 ➔ 蓄电池给起动机供电 ➔ 电磁吸铁推动单向齿轮伸出咬合飞轮外齿圈 ➔ 起动机把发动机甩起来 ➔ 火花塞点火爆发，发动机自我运转 ➔ 起动机推齿自动退回！'
    : '观察青色电流！电池包释放高压电 ➔ 逆变器转为三相交流电 ➔ 电机用旋转磁场让转子飞速旋转 ➔ 无需变速箱与活塞，瞬间输出最大扭矩直接带动车轮！';

  setFocusPreset(mode === 'ICE' ? 'overview' : 'evMotor');
}

function setFocusPreset(presetKey) {
  const preset = CAMERA_PRESETS[presetKey] || CAMERA_PRESETS.overview;
  targetCameraPos.set(...preset.pos);
  targetCameraLookAt.set(...preset.target);
  cameraTweenActive = true; // fly there; user drag cancels mid-flight

  document.querySelectorAll('.focus-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.focus === presetKey);
  });
}

function updateStartBtn() {
  const startBtn = document.getElementById('startBtn');
  const startBtnText = document.getElementById('startBtnText');
  startBtn.className = (currentMode === 'ICE' ? 'start-btn ice' : 'start-btn ev') + (isRunning ? ' running' : '');
  startBtnText.innerText = isRunning ? '熄火 Stop' : '一键启动';
}

// ═══════════ 主循环 ═══════════
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  if (!window.__hcwScene) { window.__hcwScene = scene; window.__hcwCamera = camera; }
  const dt = Math.min(clock.getDelta(), 0.05);

  // Preset flight: lerp only while a tween is active. It self-terminates on
  // arrival (and is cancelled by any user drag via the 'start' listener), so
  // between flights the OrbitControls own the camera completely.
  if (cameraTweenActive) {
    camera.position.lerp(targetCameraPos, 0.08);
    controls.target.lerp(targetCameraLookAt, 0.08);
    if (camera.position.distanceTo(targetCameraPos) < 0.08 && controls.target.distanceTo(targetCameraLookAt) < 0.08) {
      cameraTweenActive = false;
    }
  }
  controls.update();

  const targetSpeed = (isRunning && !isBraking) ? targetRPM : (isBraking && isRunning ? Math.max(400, targetRPM * 0.3) : 0);
  currentRPM += (targetSpeed - currentRPM) * 0.1;
  updateAudio(currentRPM, isRunning);

  // Crank advance for this frame (auto mode spins it from RPM; the story
  // cranking interval and btnNextStroke advance crankAngle themselves between
  // frames — once the engine has caught mid-story, auto-spin resumes).
  const previousCrankAngle = crankAngle;
  const storyCranking = storyPlaying && !isRunning;
  if (currentRPM > 10 && !storyCranking && !isStepMode) {
    // Global demo slowdown: ~4.5% of real crank speed (was 8%) so a child can
    // watch individual teeth bite into the ring gear (user: 旋转慢一点).
    const omega = (currentRPM / 60) * Math.PI * 2;
    crankAngle += omega * dt * 0.045;
  }
  crankAngleDelta = crankAngle - previousCrankAngle;

  // SCENARIO-013/SCENARIO-014: one coupled drivetrain update per frame —
  // exact slider-crank pistons, half-speed cam, gear-scaled prop shaft
  // (propShaftAngle += crankAngleDelta × GEAR_RATIOS[gear]) and the
  // steering-split differential all come from js/kinematics.js.
  const drivetrain = updateDrivetrain({
    crankAngle,
    crankAngleDelta,
    rpm: currentRPM,
    gear: currentGear,
    steerAngle: (steerAngleDeg * Math.PI) / 180,
    propShaftAngle,
    running: isRunning,
  }, dt);
  propShaftAngle = drivetrain.propShaftAngle;

  if (currentMode === 'ICE') {
    updateEngineVisuals(drivetrain);
  } else {
    parts.motorRotor.rotation.x = crankAngle * 2;
  }

  applyDrivelineVisuals(drivetrain);

  // SCENARIO-015: the gold torque-flow path runs during the narrated ignition
  // story and while the engine is running; particles always stream battery → wheels.
  const flowActive = isRunning || storyPlaying;
  if (torqueFlow) {
    torqueFlow.group.visible = flowActive;
    if (flowActive) updateTorqueFlow(clock.elapsedTime);
  }

  // Rotation arrows: orange arc = prop shaft spins lengthwise (纵), cyan arcs
  // = axles spin sideways (横) — the pair makes the differential's 90° flip
  // self-explanatory. Pulsing while the ICE runs.
  if (parts.rotationArrows) {
    const arrowsOn = flowActive && currentMode === 'ICE';
    parts.rotationArrows.visible = arrowsOn;
    if (arrowsOn) {
      const pulse = 0.7 + 0.3 * Math.sin(clock.elapsedTime * 5);
      parts.rotationArrowMats.forEach((m) => { m.opacity = pulse; });
    }
  }

  parts.brakeDiscs.forEach(disc => {
    disc.material.emissive = new THREE.Color(isBraking ? 0xef4444 : 0x000000);
    disc.material.emissiveIntensity = isBraking ? 0.6 : 0;
  });

  updateHUD(dt);
  renderer.render(scene, camera);
}

// SCENARIO-013/SCENARIO-014: prop shaft, universal joints, differential and
// the four wheels driven straight off the updateDrivetrain snapshot.
function applyDrivelineVisuals(drivetrain) {
  const shaftSpeed = drivetrain.propShaftAngle;
  parts.propShaft.rotation.x = shaftSpeed;
  parts.uJointFront.rotation.x = shaftSpeed;
  parts.uJointRear.rotation.x = shaftSpeed;

  parts.differential.userData.pinionGearGroup.rotation.x = shaftSpeed;
  parts.differential.userData.ringGearGroup.rotation.z = -shaftSpeed * 0.5;

  // Differential split (差速): turning right (steer > 0) makes the left wheel
  // the faster outer wheel and the right wheel the slower inner wheel.
  const leftIsOuter = steerAngleDeg > 0;
  const wheelAngleLeft  = leftIsOuter ? drivetrain.outerWheelAngle : drivetrain.innerWheelAngle;
  const wheelAngleRight = leftIsOuter ? drivetrain.innerWheelAngle : drivetrain.outerWheelAngle;

  parts.wheels[2].rotation.z = -wheelAngleLeft;
  parts.wheels[3].rotation.z = -wheelAngleRight;
  parts.brakeDiscs[2].rotation.z = -wheelAngleLeft;
  parts.brakeDiscs[3].rotation.z = -wheelAngleRight;

  parts.rearAxleLeft.rotation.z = -wheelAngleLeft;
  parts.rearAxleRight.rotation.z = -wheelAngleRight;

  parts.wheels[0].rotation.z = -wheelAngleLeft;
  parts.wheels[1].rotation.z = -wheelAngleRight;
  parts.brakeDiscs[0].rotation.z = -wheelAngleLeft;
  parts.brakeDiscs[1].rotation.z = -wheelAngleRight;

  const diffSpin = (drivetrain.outerWheelSpeed - drivetrain.innerWheelSpeed) * shaftSpeed;
  parts.differential.userData.spiderGearsGroup.rotation.z = -shaftSpeed * 0.5 + diffSpin * 0.5;

  // SCENARIO-014: front wheels deflect with steering (capped at ±0.5 rad).
  const frontYaw = drivetrain.frontWheelYaw;
  parts.wheels[0].rotation.y = frontYaw;
  parts.wheels[1].rotation.y = frontYaw;
  parts.brakeDiscs[0].rotation.y = frontYaw;
  parts.brakeDiscs[1].rotation.y = frontYaw;
  parts.brakeCalipers[0].rotation.y = frontYaw;
  parts.brakeCalipers[1].rotation.y = frontYaw;
}

// 4-Stroke Engine Motion & Spark Timing, fed by the exact slider-crank
// kinematics from js/kinematics.js (SCENARIO-013).
// Rods pivot on the true 3D crank-pin position (pinY, pinZ) and stretch to
// the exact piston distance — no more phantom 1.2× stretch. Valves drop by
// VALVE_LIFT under their cam lobes; the twin cams (intake/exhaust) turn at
// half crank speed, and the firing wiring gives order 1-3-4-2.
function updateEngineVisuals(drivetrain) {
  const theta = drivetrain.crankAngle;
  const strokePhase = (theta % (Math.PI * 4) + Math.PI * 4) % (Math.PI * 4);
  strokeStepIndex = Math.floor(strokePhase / Math.PI);
  const firingOffsets = [0, Math.PI, Math.PI * 3, Math.PI * 2];

  for (let i = 0; i < 4; i++) {
    const cylPhase = ((strokePhase + firingOffsets[i]) % (Math.PI * 4) + Math.PI * 4) % (Math.PI * 4);

    // Exact slider-crank piston height
    const pistonY = drivetrain.pistons[i];
    const pinY = 0.22 * Math.cos(cylPhase);
    const pinZ = 0.22 * Math.sin(cylPhase);
    parts.pistons[i].position.y = pistonY;

    // Rod: origin on the crank pin, leaned toward the piston, exact length
    const rod = parts.connectingRods[i];
    const span = pistonY - pinY;
    rod.position.y = pinY;
    rod.position.z = pinZ;
    rod.scale.y = Math.max(span / ROD_CENTER_DIST, 0.1);
    rod.rotation.x = Math.atan2(-pinZ, span);

    const s = parts.sparkSparks[i];
    const isPower = cylPhase >= Math.PI * 2 && cylPhase < Math.PI * 3;
    const powerProgress = (cylPhase - Math.PI * 2) / Math.PI;

    s.spark.material.emissive = new THREE.Color(isPower && powerProgress < 0.2 ? 0xffff00 : 0x000000);
    s.flame.material.opacity = (isPower && powerProgress < 0.5) ? (1 - powerProgress / 0.5) * 0.85 : 0;
    s.flame.scale.setScalar(1 + powerProgress * 0.5);

    // Cam-driven valve lift (nose hits at mid-stroke, matching the lobes)
    const isIntake = cylPhase < Math.PI;
    const isExhaust = cylPhase >= Math.PI * 3;
    s.inValve.position.y = VALVE_BASE_Y - (isIntake ? Math.sin(cylPhase) * VALVE_LIFT : 0);
    s.exValve.position.y = VALVE_BASE_Y - (isExhaust ? Math.sin(cylPhase - Math.PI * 3) * VALVE_LIFT : 0);
  }

  parts.crankshaft.rotation.x = theta;
  parts.intakeCam.rotation.x = drivetrain.camAngle;
  parts.exhaustCam.rotation.x = drivetrain.camAngle;
  parts.flywheel.rotation.x = theta;
  parts.clutchDisc.rotation.x = theta;

  parts.gearSets.forEach(({ g1, g2, ratio }, idx) => {
    const isCurrentGear = (idx === 0 && currentGear === '1') ||
                          (idx === 1 && currentGear === '2') ||
                          (idx === 2 && currentGear === '3') ||
                          (idx === 3 && currentGear === '4') ||
                          (idx === 4 && currentGear === 'R');

    g1.rotation.x = theta;
    g2.rotation.x = -theta * ratio;
    g1.children[0].material.emissive = new THREE.Color(isCurrentGear ? 0x38bdf8 : 0x000000);
    g1.children[0].material.emissiveIntensity = isCurrentGear ? 0.5 : 0;
  });
}

// Single-crank entry point for the story cranking interval and the
// btnNextStroke step control: runs one coupled kinematics frame at theta.
function updateEngine(theta) {
  const drivetrain = updateDrivetrain({
    crankAngle: theta,
    crankAngleDelta: 0,
    rpm: 0,
    gear: currentGear,
    steerAngle: (steerAngleDeg * Math.PI) / 180,
    propShaftAngle,
    running: false,
  }, 0);
  updateEngineVisuals(drivetrain);
}

function updateHUD(dt) {
  document.getElementById('hudRpm').innerText = `${Math.round(currentRPM)} RPM`;
  document.getElementById('hudGear').innerText = currentGear === 'R' ? 'R (倒车挡)' : `${currentGear}挡`;

  const strokeNames = ['1. 吸气', '2. 压缩', '3. 做功', '4. 排气'];
  document.getElementById('hudStroke').innerText = strokeNames[strokeStepIndex % 4];

  const diffText = steerAngleDeg === 0 ? '直行 (左右轮同速)' : (steerAngleDeg > 0 ? '右转 (左外轮较快)' : '左转 (右外轮较快)');
  document.getElementById('hudDiff').innerText = diffText;

  // SCENARIO-020/021: live coolant temperature and oil pressure, updated by
  // updateTelemetry in the same animation loop as RPM/Gear/Stroke/Diff.
  telemetryState.running = isRunning;
  telemetryState.engineRunning = isRunning;
  telemetryState.rpm = currentRPM;
  const telemetry = updateTelemetry(telemetryState, dt);
  telemetryState.coolantTemp = telemetry.coolantTemp;
  telemetryState.engineTemp = telemetry.coolantTemp;
  document.getElementById('hudCoolant').innerText = `${telemetry.coolantTemp.toFixed(1)} °C`;
  document.getElementById('hudOil').innerText = `${telemetry.oilPressure.toFixed(2)} bar`;

  document.querySelectorAll('.stroke-card').forEach((card, idx) => {
    card.classList.toggle('active', idx === strokeStepIndex % 4);
  });
}

function setupEvents() {
  document.getElementById('inspClose').addEventListener('click', () => {
    document.getElementById('inspectorCard').style.display = 'none';
  });

  document.getElementById('btnICE').addEventListener('click', () => switchMode('ICE'));
  document.getElementById('btnEV').addEventListener('click', () => switchMode('EV'));

  document.getElementById('soundBtn').addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    const btn = document.getElementById('soundBtn');
    btn.innerText = soundEnabled ? '🔊 引擎声效: 开启' : '🔇 引擎声效: 静音';
    btn.classList.toggle('muted', !soundEnabled);
    if (soundEnabled) initAudio();
  });

  document.getElementById('startBtn').addEventListener('click', () => {
    if (isRunning) {
      isRunning = false;
      parts.torqueFlowParticles.forEach(p => { p.visible = false; });
      if (torqueFlow) torqueFlow.group.visible = false;
      updateStartBtn();
    } else {
      playIgnitionStory();
    }
  });

  const brakeBtn = document.getElementById('brakeBtn');
  brakeBtn.addEventListener('mousedown', () => { isBraking = true; brakeBtn.classList.add('active'); });
  brakeBtn.addEventListener('mouseup', () => { isBraking = false; brakeBtn.classList.remove('active'); });
  brakeBtn.addEventListener('touchstart', (e) => { e.preventDefault(); isBraking = true; brakeBtn.classList.add('active'); });
  brakeBtn.addEventListener('touchend', () => { isBraking = false; brakeBtn.classList.remove('active'); });

  document.getElementById('throttleSlider').addEventListener('input', (e) => {
    targetRPM = parseFloat(e.target.value);
    document.getElementById('rpmText').innerText = `${targetRPM} RPM`;
  });

  document.getElementById('steerSlider').addEventListener('input', (e) => {
    steerAngleDeg = parseFloat(e.target.value);
    document.getElementById('steerText').innerText = `${steerAngleDeg}° ${steerAngleDeg === 0 ? '直行' : (steerAngleDeg > 0 ? '右转' : '左转')}`;
    document.getElementById('diffHintText').innerText = steerAngleDeg === 0
      ? '直行时，左右半轴与车轮转速完全相同。'
      : `转弯时，差速器内部行星齿轮自转，让外侧车轮转得比内侧快！`;
  });

  const gearRatiosMap = { '1': 0.4, '2': 0.65, '3': 0.85, '4': 1.1, 'R': -0.5 };
  const gearDescMap = {
    '1': '1挡：低速大扭矩，适合起步爬坡。',
    '2': '2挡：中速过度挡。',
    '3': '3挡：齿轮比接近1:1，平稳高效巡航。',
    '4': '4挡：高速巡航，省油省动力。',
    'R': 'R挡：反向旋转，带动车轮向后倒车。',
  };

  document.querySelectorAll('.gear-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.gear-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentGear = btn.dataset.gear;
      gearRatio = gearRatiosMap[currentGear];
      document.getElementById('gearDescText').innerText = gearDescMap[currentGear];
    });
  });

  document.querySelectorAll('.focus-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setFocusPreset(btn.dataset.focus);
    });
  });

  document.getElementById('btnModeAuto').addEventListener('click', () => {
    isStepMode = false;
    document.getElementById('btnModeAuto').classList.add('active');
    document.getElementById('btnModeStep').classList.remove('active');
    document.getElementById('stepControls').style.display = 'none';
  });

  document.getElementById('btnModeStep').addEventListener('click', () => {
    abortStory();
    isStepMode = true;
    isRunning = true;
    updateStartBtn();
    document.getElementById('btnModeAuto').classList.remove('active');
    document.getElementById('btnModeStep').classList.add('active');
    document.getElementById('stepControls').style.display = 'block';
  });

  document.getElementById('btnNextStroke').addEventListener('click', () => {
    crankAngle += Math.PI;
    strokeStepIndex = (strokeStepIndex + 1) % 4;
    updateEngine(crankAngle);
  });

  // SCENARIO-009/010: replay the narrated walkthrough from step 1 — the
  // counter restarts, the engine returns to its post-story running state, and
  // the control works whether the engine is running or already shut down.
  replayBtnEl = document.getElementById('replayBtn');
  replayBtnEl.addEventListener('click', () => {
    storyStep = 0;
    playIgnitionStory();
  });
}

// ═══════════ 启动 ═══════════
init3D();
switchMode('ICE');
