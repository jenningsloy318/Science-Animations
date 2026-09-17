// car-subsystems.js — five named subsystem groups (fuel delivery, air intake,
// cooling, lubrication, exhaust) with the closed 21-part identifier inventory.
// All geometry is pure in-code THREE primitives (no external model files).
// SCENARIO-003 / SCENARIO-004 / SCENARIO-016 / SCENARIO-017 / SCENARIO-023
import * as THREE from 'three';

export const PARTS_SCENARIO_TAGS = Object.freeze([
  'SCENARIO-003',
  'SCENARIO-004',
  'SCENARIO-016',
  'SCENARIO-017',
  'SCENARIO-023',
]);

// Steel/shiny PBR helpers, kept consistent with car-model.js:
// steelMat 0.85/0.25 vs shinyMat 0.95/0.15 (plus a darker rubber-like combo).
const steelMat = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, metalness: 0.85, roughness: 0.25, ...extra });
const shinyMat = (color) =>
  new THREE.MeshStandardMaterial({ color, metalness: 0.95, roughness: 0.15 });
const rubberMat = (color) =>
  new THREE.MeshStandardMaterial({ color, metalness: 0.55, roughness: 0.45 });

const ENG_X = -4.8;
const CYL_X = (i) => -5.6 + i * 0.55;

function makePart(partId, x, y, z) {
  const part = new THREE.Group();
  part.name = partId;
  part.userData.partId = partId;
  part.position.set(x, y, z);
  return part;
}

function addMesh(part, geometry, material, label, setup = null) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = label || `${part.userData.partId}Mesh`;
  mesh.userData.partId = part.userData.partId;
  if (setup) setup(mesh);
  part.add(mesh);
  return mesh;
}

function tubePath(points, radius, tubularSegments = 24, radialSegments = 6) {
  return new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z))),
    tubularSegments,
    radius,
    radialSegments,
    false
  );
}

// ─── 燃油供给 Fuel Delivery ───────────────────────────────────────────────
function buildFuelDelivery() {
  const group = new THREE.Group();
  group.name = 'fuelDelivery';

  const fuelTank = makePart('fuelTank', 3.3, -0.95, 0.3);
  addMesh(fuelTank, new THREE.BoxGeometry(1.5, 0.45, 1.3), steelMat(0x334155), 'fuelTankShell');
  addMesh(fuelTank, new THREE.CylinderGeometry(0.06, 0.06, 0.5, 10), shinyMat(0x94a3b8), 'fuelTankFillerNeck', (m) => {
    m.position.set(0.55, 0.45, 0.5);
  });
  addMesh(fuelTank, new THREE.CylinderGeometry(0.09, 0.09, 0.06, 10), shinyMat(0xfacc15), 'fuelTankFillerCap', (m) => {
    m.position.set(0.55, 0.72, 0.5);
  });
  group.add(fuelTank);

  const fuelPump = makePart('fuelPump', 2.4, -0.7, 0.3);
  addMesh(fuelPump, new THREE.CylinderGeometry(0.13, 0.13, 0.32, 12), shinyMat(0xfacc15), 'fuelPumpBody', (m) => {
    m.rotation.z = Math.PI / 2;
  });
  addMesh(fuelPump, new THREE.CylinderGeometry(0.05, 0.05, 0.12, 8), steelMat(0x64748b), 'fuelPumpOutlet', (m) => {
    m.rotation.z = Math.PI / 2;
    m.position.x = 0.2;
  });
  group.add(fuelPump);

  const fuelLine = makePart('fuelLine', 0, 0, 0);
  addMesh(
    fuelLine,
    tubePath([[2.2, -0.7, 0.3], [0.2, -0.55, 0.5], [-3.2, -0.25, 0.5], [-5.0, 0.85, 0.42]], 0.035, 32, 6),
    steelMat(0x94a3b8),
    'fuelLinePipe'
  );
  group.add(fuelLine);

  for (let i = 0; i < 4; i++) {
    const injector = makePart(`injector${i + 1}`, CYL_X(i), 1.35, 0.32);
    addMesh(injector, new THREE.CylinderGeometry(0.045, 0.045, 0.22, 10), shinyMat(0x94a3b8), `injector${i + 1}Body`);
    addMesh(injector, new THREE.ConeGeometry(0.03, 0.08, 8), steelMat(0x64748b), `injector${i + 1}Nozzle`, (m) => {
      m.position.y = -0.14;
      m.rotation.x = Math.PI;
    });
    addMesh(injector, new THREE.BoxGeometry(0.09, 0.05, 0.06), shinyMat(0x0f172a), `injector${i + 1}Connector`, (m) => {
      m.position.y = 0.13;
    });
    group.add(injector);
  }
  return group;
}

// ─── 进气系统 Air Intake ──────────────────────────────────────────────────
function buildAirIntake() {
  const group = new THREE.Group();
  group.name = 'airIntake';

  const airFilter = makePart('airFilter', -6.75, 1.15, 0.55);
  addMesh(airFilter, new THREE.CylinderGeometry(0.26, 0.26, 0.6, 14), steelMat(0x334155), 'airFilterCanister', (m) => {
    m.rotation.z = Math.PI / 2;
  });
  addMesh(airFilter, new THREE.CylinderGeometry(0.275, 0.275, 0.06, 14), shinyMat(0x94a3b8), 'airFilterLid', (m) => {
    m.rotation.z = Math.PI / 2;
    m.position.x = 0.3;
  });
  addMesh(airFilter, new THREE.CylinderGeometry(0.275, 0.275, 0.06, 14), shinyMat(0x94a3b8), 'airFilterBase', (m) => {
    m.rotation.z = Math.PI / 2;
    m.position.x = -0.3;
  });
  group.add(airFilter);

  const throttleBody = makePart('throttleBody', -6.25, 1.0, 0.42);
  addMesh(throttleBody, new THREE.CylinderGeometry(0.15, 0.15, 0.28, 14), shinyMat(0x94a3b8), 'throttleBodyBore', (m) => {
    m.rotation.z = Math.PI / 2;
  });
  addMesh(throttleBody, new THREE.CylinderGeometry(0.12, 0.12, 0.02, 12), shinyMat(0xfacc15), 'throttleBodyButterflyPlate', (m) => {
    m.rotation.z = Math.PI / 2 - 0.35;
  });
  addMesh(throttleBody, new THREE.BoxGeometry(0.06, 0.12, 0.08), steelMat(0x475569), 'throttleBodyLever', (m) => {
    m.position.set(0, 0.16, 0);
  });
  group.add(throttleBody);

  const intakeManifold = makePart('intakeManifold', -5.0, 0.95, 0.78);
  addMesh(intakeManifold, new THREE.BoxGeometry(1.6, 0.26, 0.26), steelMat(0x0284c7), 'intakeManifoldPlenum');
  for (let i = 0; i < 4; i++) {
    addMesh(intakeManifold, new THREE.CylinderGeometry(0.055, 0.055, 0.5, 10), steelMat(0x38bdf8), `intakeManifoldRunner${i + 1}`, (m) => {
      m.position.set(-0.6 + i * 0.4, -0.2, -0.12);
      m.rotation.x = -1.05;
    });
  }
  group.add(intakeManifold);
  return group;
}

// ─── 冷却系统 Cooling ─────────────────────────────────────────────────────
function buildCooling() {
  const group = new THREE.Group();
  group.name = 'cooling';

  const radiator = makePart('radiator', -7.05, 0.7, 0);
  addMesh(radiator, new THREE.BoxGeometry(0.16, 0.85, 1.7), steelMat(0xcbd5e1), 'radiatorCore');
  addMesh(radiator, new THREE.BoxGeometry(0.2, 0.12, 1.74), shinyMat(0x94a3b8), 'radiatorTopTank', (m) => {
    m.position.y = 0.48;
  });
  addMesh(radiator, new THREE.BoxGeometry(0.2, 0.12, 1.74), shinyMat(0x94a3b8), 'radiatorBottomTank', (m) => {
    m.position.y = -0.48;
  });
  for (let f = 0; f < 5; f++) {
    addMesh(radiator, new THREE.BoxGeometry(0.18, 0.66, 0.03), shinyMat(0xe2e8f0), `radiatorFin${f + 1}`, (m) => {
      m.position.z = -0.6 + f * 0.3;
    });
  }
  // Circular fan shroud on the back of the radiator core
  addMesh(radiator, new THREE.TorusGeometry(0.32, 0.02, 6, 16), steelMat(0x334155), 'radiatorFanShroud', (m) => {
    m.position.set(0.12, 0, 0);
    m.rotation.y = Math.PI / 2;
  });
  // Radiator fan hub and 6 blades
  const fanMesh = addMesh(radiator, new THREE.CylinderGeometry(0.08, 0.08, 0.04, 10), steelMat(0x1e293b), 'radiatorFanBlades', (m) => {
    m.position.set(0.12, 0, 0);
    m.rotation.z = Math.PI / 2;
  });
  for (let b = 0; b < 6; b++) {
    const bAng = (b / 6) * Math.PI * 2;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.22, 0.07), steelMat(0x475569));
    blade.name = `radiatorFanBlade${b + 1}`;
    blade.userData.partId = 'radiator';
    blade.position.set(0, Math.cos(bAng) * 0.16, Math.sin(bAng) * 0.16);
    blade.rotation.x = bAng + 0.35;
    fanMesh.add(blade);
  }
  group.add(radiator);

  const waterPump = makePart('waterPump', -6.3, 0.25, 0);
  addMesh(waterPump, new THREE.CylinderGeometry(0.15, 0.15, 0.28, 12), steelMat(0x475569), 'waterPumpHousing', (m) => {
    m.rotation.z = Math.PI / 2;
  });
  addMesh(waterPump, new THREE.CylinderGeometry(0.17, 0.17, 0.05, 12), shinyMat(0x94a3b8), 'waterPumpPulley', (m) => {
    m.rotation.z = Math.PI / 2;
    m.position.x = 0.18;
  });
  group.add(waterPump);

  const thermostat = makePart('thermostat', -6.55, 0.95, 0.35);
  addMesh(thermostat, new THREE.CylinderGeometry(0.08, 0.08, 0.16, 10), steelMat(0xf59e0b), 'thermostatHousing');
  addMesh(thermostat, new THREE.SphereGeometry(0.06, 10, 8), shinyMat(0xfacc15), 'thermostatWaxCapsule', (m) => {
    m.position.y = 0.11;
  });
  group.add(thermostat);

  const coolantHose1 = makePart('coolantHose1', 0, 0, 0);
  addMesh(
    coolantHose1,
    tubePath([[-6.95, 1.1, 0.25], [-6.75, 1.45, 0.3], [-6.1, 1.4, 0.3], [-5.55, 1.1, 0.3]], 0.045, 24, 6),
    rubberMat(0x1f2937),
    'coolantHose1Upper'
  );
  group.add(coolantHose1);

  const coolantHose2 = makePart('coolantHose2', 0, 0, 0);
  addMesh(
    coolantHose2,
    tubePath([[-6.95, 0.28, -0.25], [-6.6, -0.08, -0.2], [-6.15, 0.02, -0.1], [-5.9, 0.25, 0]], 0.045, 24, 6),
    rubberMat(0x1f2937),
    'coolantHose2Lower'
  );
  group.add(coolantHose2);
  return group;
}

// ─── 润滑系统 Lubrication ─────────────────────────────────────────────────
function buildLubrication() {
  const group = new THREE.Group();
  group.name = 'lubrication';

  const oilPan = makePart('oilPan', ENG_X, -0.45, 0);
  addMesh(oilPan, new THREE.BoxGeometry(2.3, 0.3, 1.1), steelMat(0x334155), 'oilPanBody');
  addMesh(oilPan, new THREE.BoxGeometry(0.8, 0.22, 1.0), steelMat(0x1e293b), 'oilPanSump', (m) => {
    m.position.set(0.55, -0.2, 0);
  });
  addMesh(oilPan, new THREE.CylinderGeometry(0.05, 0.05, 0.06, 8), shinyMat(0x94a3b8), 'oilPanDrainPlug', (m) => {
    m.position.set(0.55, -0.33, 0);
  });
  group.add(oilPan);

  const oilPump = makePart('oilPump', -4.1, -0.25, 0.4);
  addMesh(oilPump, new THREE.CylinderGeometry(0.09, 0.09, 0.2, 10), shinyMat(0xfacc15), 'oilPumpBody', (m) => {
    m.rotation.z = Math.PI / 2;
  });
  addMesh(
    oilPump,
    tubePath([[0.02, 0, 0], [-0.1, -0.17, -0.05], [-0.3, -0.33, -0.2]], 0.03, 12, 6),
    steelMat(0x64748b),
    'oilPumpPickupTube'
  );
  addMesh(oilPump, new THREE.BoxGeometry(0.18, 0.06, 0.18), steelMat(0x64748b), 'oilPumpStrainer', (m) => {
    m.position.set(-0.3, -0.35, -0.2);
  });
  group.add(oilPump);
  return group;
}

// ─── 排气系统 Exhaust ─────────────────────────────────────────────────────
function buildExhaust() {
  const group = new THREE.Group();
  group.name = 'exhaust';

  const exhaustManifold = makePart('exhaustManifold', ENG_X, 0, 0);
  // NOTE: children positions are RELATIVE to the group at ENG_X. They used
  // to pass absolute world coords, double-offsetting the whole manifold
  // ~5 units forward — it floated in the air ahead of the front bumper
  // (user: 车头还有悬空零件). Now each mesh nests inside the real exhaust
  // geometry built by car-model.js (smaller radii, so no double-render):
  // runners hug the upper primaries, collector sits at the 4-into-1 merge,
  // downpipe follows the mid-pipe's first drop.
  for (let i = 0; i < 4; i++) {
    addMesh(exhaustManifold, new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8), shinyMat(0x94a3b8), `exhaustManifoldRunner${i + 1}`, (m) => {
      m.position.set(CYL_X(i) - ENG_X, 1.12, -0.7);
      m.rotation.x = 0.55;
    });
  }
  addMesh(exhaustManifold, new THREE.CylinderGeometry(0.09, 0.09, 1.3, 10), shinyMat(0x94a3b8), 'exhaustManifoldCollector', (m) => {
    m.rotation.z = Math.PI / 2;
    m.position.set(-4.35 - ENG_X, 0.32, -0.84);
  });
  addMesh(exhaustManifold, new THREE.CylinderGeometry(0.08, 0.08, 0.55, 10), steelMat(0x64748b), 'exhaustManifoldDownPipe', (m) => {
    m.rotation.z = Math.PI / 2 + 0.5;
    m.position.set(-4.0 - ENG_X, -0.15, -0.85);
  });
  group.add(exhaustManifold);

  const catalyticConverter = makePart('catalyticConverter', -2.75, -0.55, -0.85);
  addMesh(catalyticConverter, new THREE.CylinderGeometry(0.15, 0.15, 0.8, 12), shinyMat(0xfacc15), 'catalyticConverterBody', (m) => {
    m.rotation.z = Math.PI / 2;
  });
  addMesh(catalyticConverter, new THREE.BoxGeometry(0.7, 0.05, 0.42), steelMat(0x94a3b8), 'catalyticConverterHeatShield', (m) => {
    m.position.y = 0.19;
  });
  group.add(catalyticConverter);

  const muffler = makePart('muffler', 2.4, -0.8, -0.75);
  addMesh(muffler, new THREE.CylinderGeometry(0.26, 0.26, 1.2, 14), steelMat(0x475569), 'mufflerShell', (m) => {
    m.rotation.z = Math.PI / 2;
  });
  addMesh(muffler, new THREE.CylinderGeometry(0.07, 0.07, 0.9, 10), steelMat(0x64748b), 'mufflerInletPipe', (m) => {
    m.rotation.z = Math.PI / 2;
    m.position.x = -0.95;
  });
  group.add(muffler);

  const tailpipe = makePart('tailpipe', 0, 0, 0);
  addMesh(
    tailpipe,
    tubePath([[3.1, -0.8, -0.75], [4.2, -0.85, -0.75], [5.3, -0.75, -0.75]], 0.06, 20, 6),
    shinyMat(0x94a3b8),
    'tailpipeTube'
  );
  addMesh(tailpipe, new THREE.TorusGeometry(0.075, 0.018, 6, 14), shinyMat(0xfacc15), 'tailpipeTip', (m) => {
    m.position.set(5.32, -0.75, -0.75);
    m.rotation.y = Math.PI / 2;
  });
  group.add(tailpipe);
  return group;
}

/**
 * Build the five subsystem groups. `ctx.scene` (or `ctx.parent`) receives the
 * groups; returns { fuelDelivery, airIntake, cooling, lubrication, exhaust }.
 */
export function buildSubsystems(ctx = {}) {
  const fuelDelivery = buildFuelDelivery();
  const airIntake = buildAirIntake();
  const cooling = buildCooling();
  const lubrication = buildLubrication();
  const exhaust = buildExhaust();

  const subsystems = { fuelDelivery, airIntake, cooling, lubrication, exhaust };
  const root = (ctx && ctx.parent) || (ctx && ctx.scene);
  if (root && typeof root.add === 'function') {
    root.add(fuelDelivery, airIntake, cooling, lubrication, exhaust);
  }
  return subsystems;
}
