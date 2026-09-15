// car-subsystems.test.mjs — Phase 1 RED tests for how-cars-work/js/car-subsystems.js
// Covers SCENARIO-003, SCENARIO-004 (five named subsystem groups + full 21-part
// inventory) and the PARTS_SCENARIO_TAGS frozen export that carries
// SCENARIO-003/SCENARIO-004/SCENARIO-016/SCENARIO-017/SCENARIO-023.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule, SUBSYSTEM_PARTS, ALL_PART_IDS, collectMeshes, countTriangles } from './helpers.mjs';
import * as THREE from './support/three-stub.mjs';

async function importSubsystems() {
  return loadModule('car-subsystems.js');
}

test('SCENARIO-003: buildSubsystems(ctx) returns five independent named THREE.Group trees (fuel delivery, air intake, cooling, lubrication, exhaust)', async () => {
  const mod = await importSubsystems();
  assert.equal(typeof mod.buildSubsystems, 'function', 'car-subsystems.js must export buildSubsystems as a function');
  const scene = new THREE.Scene();
  const sys = mod.buildSubsystems({ scene });
  assert.ok(sys, 'buildSubsystems must return a value');
  for (const key of Object.keys(SUBSYSTEM_PARTS)) {
    assert.ok(sys[key], `returned object must contain the "${key}" subsystem group`);
    assert.ok(sys[key] instanceof THREE.Group, `${key} must be a THREE.Group tree`);
    assert.equal(sys[key].children.length > 0, true, `${key} group must not be empty`);
  }
});

test('SCENARIO-003: every part mesh carries an English userData.partId identifier (e.g. radiator, fuelPump, catalyticConverter, muffler)', async () => {
  const mod = await importSubsystems();
  const sys = mod.buildSubsystems({ scene: new THREE.Scene() });
  for (const key of Object.keys(SUBSYSTEM_PARTS)) {
    const meshes = collectMeshes(sys[key]);
    assert.ok(meshes.length > 0, `${key} must contain at least one Mesh`);
    for (const mesh of meshes) {
      const id = mesh.userData?.partId;
      assert.equal(typeof id, 'string', `every mesh in ${key} must be tagged with a string userData.partId`);
      assert.ok(/^[a-zA-Z][a-zA-Z0-9]*[0-9]{0,2}$/.test(id), `partId "${id}" must be an English identifier string`);
    }
  }
});

test('SCENARIO-004: each subsystem part list matches the requirement inventory exactly — fuel: fuelTank/fuelPump/fuelLine/injectors; air: airFilter/throttleBody/intakeManifold; cooling: radiator/waterPump/thermostat/coolantHose1+2; lubrication: oilPan/oilPump; exhaust: exhaustManifold/catalyticConverter/muffler/tailpipe', async () => {
  const mod = await importSubsystems();
  const sys = mod.buildSubsystems({ scene: new THREE.Scene() });
  const seen = new Set();
  for (const [key, expected] of Object.entries(SUBSYSTEM_PARTS)) {
    const ids = new Set();
    for (const mesh of collectMeshes(sys[key])) {
      const id = mesh.userData.partId;
      if (id) { ids.add(id); seen.add(id); }
    }
    assert.deepEqual([...ids].sort(), [...expected].sort(), `${key} part inventory must match the required list exactly`);
  }
  assert.deepEqual([...seen].sort(), [...ALL_PART_IDS].sort(), 'the union of subsystem parts must be exactly the closed 21-part set, none missing');
  assert.equal(seen.size, 21, 'exactly 21 unique part ids across the five subsystems');
});

test('SCENARIO-004: fuel delivery subsystem contains the fuel tank, fuel pump, fuel line and all four injectors injector1..injector4', async () => {
  const mod = await importSubsystems();
  const sys = mod.buildSubsystems({ scene: new THREE.Scene() });
  const ids = new Set(collectMeshes(sys.fuelDelivery).map((m) => m.userData.partId));
  for (const id of ['fuelTank', 'fuelPump', 'fuelLine', 'injector1', 'injector2', 'injector3', 'injector4']) {
    assert.ok(ids.has(id), `fuelDelivery must contain "${id}"`);
  }
});

test('SCENARIO-004: cooling subsystem contains radiator, water pump, thermostat and both coolant hoses', async () => {
  const mod = await importSubsystems();
  const sys = mod.buildSubsystems({ scene: new THREE.Scene() });
  const ids = new Set(collectMeshes(sys.cooling).map((m) => m.userData.partId));
  for (const id of ['radiator', 'waterPump', 'thermostat', 'coolantHose1', 'coolantHose2']) {
    assert.ok(ids.has(id), `cooling must contain "${id}"`);
  }
});

test('SCENARIO-004: exhaust subsystem contains exhaust manifold, catalytic converter, muffler and tailpipe; lubrication contains oil pan and oil pump; air intake contains filter, throttle body and manifold', async () => {
  const mod = await importSubsystems();
  const sys = mod.buildSubsystems({ scene: new THREE.Scene() });
  const idsOf = (g) => new Set(collectMeshes(g).map((m) => m.userData.partId));
  for (const id of ['exhaustManifold', 'catalyticConverter', 'muffler', 'tailpipe']) {
    assert.ok(idsOf(sys.exhaust).has(id), `exhaust must contain "${id}"`);
  }
  for (const id of ['oilPan', 'oilPump']) {
    assert.ok(idsOf(sys.lubrication).has(id), `lubrication must contain "${id}"`);
  }
  for (const id of ['airFilter', 'throttleBody', 'intakeManifold']) {
    assert.ok(idsOf(sys.airIntake).has(id), `airIntake must contain "${id}"`);
  }
});

test('SCENARIO-012/SCENARIO-016 support: every subsystem mesh uses a steelMat/shinyMat-consistent MeshStandardMaterial with clear metalness/roughness values', async () => {
  const mod = await importSubsystems();
  const sys = mod.buildSubsystems({ scene: new THREE.Scene() });
  const combos = new Set();
  for (const key of Object.keys(SUBSYSTEM_PARTS)) {
    for (const mesh of collectMeshes(sys[key])) {
      const mat = mesh.material;
      assert.ok(mat && mat.isMeshStandardMaterial, `${key} mesh "${mesh.userData.partId}" must use MeshStandardMaterial`);
      assert.equal(typeof mat.metalness, 'number', 'metalness must be a set number');
      assert.equal(typeof mat.roughness, 'number', 'roughness must be a set number');
      assert.ok(mat.metalness >= 0.5, `part "${mesh.userData.partId}" metalness ${mat.metalness} must be steel/shiny-consistent (>= 0.5)`);
      assert.ok(mat.roughness <= 0.5, `part "${mesh.userData.partId}" roughness ${mat.roughness} must be steel/shiny-consistent (<= 0.5)`);
      combos.add(`${mat.metalness}/${mat.roughness}`);
    }
  }
  assert.ok(combos.size >= 2, `subsystem materials must keep the distinct steelMat(0.85/0.25) vs shinyMat(0.95/0.15) distinction, saw ${combos.size} combo(s)`);
});

test('SCENARIO-023/SCENARIO-025: added subsystem geometry stays within the ≈15k-triangle budget (deterministic stub estimate)', async () => {
  const mod = await importSubsystems();
  const sys = mod.buildSubsystems({ scene: new THREE.Scene() });
  const total = Object.keys(SUBSYSTEM_PARTS).reduce((sum, key) => sum + countTriangles(sys[key]), 0);
  assert.ok(total > 0, 'subsystems must build real geometry');
  assert.ok(total <= 15000, `total added subsystem triangles ${total} must stay within the ~15000-triangle budget`);
});

test('PARTS_SCENARIO_TAGS exports the frozen closure [SCENARIO-003, SCENARIO-004, SCENARIO-016, SCENARIO-017, SCENARIO-023]', async () => {
  const mod = await importSubsystems();
  assert.deepEqual(
    [...mod.PARTS_SCENARIO_TAGS],
    ['SCENARIO-003', 'SCENARIO-004', 'SCENARIO-016', 'SCENARIO-017', 'SCENARIO-023'],
    'PARTS_SCENARIO_TAGS must equal the Phase 1 parts closure'
  );
  assert.equal(Object.isFrozen(mod.PARTS_SCENARIO_TAGS), true, 'PARTS_SCENARIO_TAGS must be Object.freeze-d');
});
