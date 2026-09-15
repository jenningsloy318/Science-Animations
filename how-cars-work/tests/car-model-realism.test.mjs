// car-model-realism.test.mjs — Phase 1 RED tests for the in-place realism
// upgrade of how-cars-work/js/car-model.js.
// Covers SCENARIO-011 (real construction detail on pistons, rods, valves,
// gearbox gears, crankshaft, wheels), SCENARIO-012 (code-only geometry +
// MeshStandardMaterial PBR with distinct metalness/roughness), and the
// SCENARIO-024 budget anchors (spring tessellation pinned at 48/6 and the
// pixelRatio cap preserved), plus the REALISM_SCENARIO_TAGS frozen export.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule, readSource, collectMeshes, countTriangles, gearPitchRadius, maxAncestorRotation } from './helpers.mjs';
import * as THREE from './support/three-stub.mjs';

async function importCarModel() {
  const mod = await loadModule('car-model.js');
  return mod.buildCarModel(new THREE.Scene());
}

const approx = (a, b, eps = 0.01) => Math.abs(a - b) <= eps;

const GEAR_RATIOS = { 1: 0.4, 2: 0.65, 3: 0.85, 4: 1.1, R: -0.5 };

test('SCENARIO-011: each piston carries piston ring grooves (≥2 ring meshes per piston)', async () => {
  const parts = await importCarModel();
  assert.ok(Array.isArray(parts.pistons) && parts.pistons.length >= 1, 'pistons array must exist');
  for (const piston of parts.pistons) {
    const ringMeshes = collectMeshes(piston).filter(
      (m) => /ring/i.test(m.name || '') || m.geometry?.type === 'TorusGeometry'
    );
    assert.ok(ringMeshes.length >= 2, `piston must show at least 2 ring grooves/rings, found ${ringMeshes.length}`);
  }
});

test('SCENARIO-011: each connecting rod has explicit bigEnd and smallEnd bosses', async () => {
  const parts = await importCarModel();
  assert.ok(Array.isArray(parts.connectingRods) && parts.connectingRods.length >= 1, 'connectingRods array must exist');
  for (const rod of parts.connectingRods) {
    const meshes = collectMeshes(rod);
    assert.ok(meshes.length >= 3, `connecting rod must be composed of shaft + two end bosses (≥3 meshes), found ${meshes.length}`);
    assert.ok(meshes.some((m) => /bigend/i.test(m.name || '')), 'rod must contain a mesh named bigEnd (big-end boss)');
    assert.ok(meshes.some((m) => /smallend/i.test(m.name || '')), 'rod must contain a mesh named smallEnd (small-end boss)');
  }
});

test('SCENARIO-011: every valve gets a helical valve spring pinned to tubularSegments=48 / radialSegments=6, plus an angled valve seat', async () => {
  const parts = await importCarModel();
  const valves = [...(parts.intakeValves ?? []), ...(parts.exhaustValves ?? [])];
  assert.ok(valves.length >= 4, 'intake/exhaust valves must exist');
  let springCount = 0;
  for (const valve of valves) {
    const tubes = collectMeshes(valve).filter((m) => m.geometry?.type === 'TubeGeometry');
    assert.ok(tubes.length >= 1, 'each valve must carry a helical spring built with TubeGeometry');
    for (const tube of tubes) {
      const p = tube.geometry.parameters;
      assert.equal(p.tubularSegments, 48, `spring tessellation is pinned: tubularSegments must be 48, got ${p.tubularSegments}`);
      assert.equal(p.radialSegments, 6, `spring tessellation is pinned: radialSegments must be 6, got ${p.radialSegments}`);
      springCount += 1;
    }
    const seat = collectMeshes(valve).find((m) => /seat/i.test(m.name || ''));
    assert.ok(seat, 'each valve must have a seat mesh');
    assert.ok(
      maxAncestorRotation(seat, valve) >= 0.15,
      'valve seat must be angled (≈30° tilt visible on the seat mesh or its holder)'
    );
  }
  assert.ok(springCount >= valves.length && springCount >= 8, `every valve needs its own pinned helix (one per valve, ≥8), found ${springCount}`);
});

test('SCENARIO-011: gearbox gears are toothed cylinders with radius-scaled toothCount, preserving the r1 = 0.45·|ratio| and r2 = 0.65 − r1 mesh invariant', async () => {
  const parts = await importCarModel();
  assert.ok(Array.isArray(parts.gearSets) && parts.gearSets.length >= 4, `gearSets must exist for the 5 ratios, found ${parts.gearSets?.length}`);
  for (const set of parts.gearSets) {
    const expectedR1 = 0.45 * Math.abs(set.ratio);
    const ra = gearPitchRadius(set.g1);
    const rb = gearPitchRadius(set.g2);
    assert.ok(ra > 0 && rb > 0, 'both gears of a set must expose a measurable pitch radius (cylindrical gear body)');
    const matches =
      (approx(ra, expectedR1) && approx(rb, 0.65 - expectedR1)) ||
      (approx(rb, expectedR1) && approx(ra, 0.65 - expectedR1));
    assert.ok(matches, `ratio ${set.ratio}: radii (${ra.toFixed(3)}, ${rb.toFixed(3)}) must satisfy r1=0.45·|ratio|=${expectedR1.toFixed(3)} and r1+r2=0.65`);
    for (const g of [set.g1, set.g2]) {
      const tc = Number(g.userData?.toothCount);
      assert.ok(Number.isFinite(tc), 'each rebuilt gear must declare userData.toothCount');
      assert.ok(tc >= 12 && tc <= 24, `toothCount ${tc} must stay in the 12–24 range`);
      const r = gearPitchRadius(g);
      if (approx(r, 0.18, 0.015) || approx(r, 0.225, 0.015)) {
        assert.ok(tc >= 12 && tc <= 16, `small gear r=${r.toFixed(3)} must have 12–16 teeth, got ${tc}`);
      }
      if (r >= 0.45) {
        assert.equal(tc, 24, `large gear r=${r.toFixed(3)} must have exactly 24 teeth, got ${tc}`);
      }
      const namedTeeth = collectMeshes(g).filter((m) => /tooth/i.test(m.name || ''));
      if (namedTeeth.length > 0) {
        assert.equal(namedTeeth.length, tc, `declared toothCount ${tc} must match the ${namedTeeth.length} tooth meshes actually built`);
      }
    }
  }
});

test('SCENARIO-011: crankshaft carries counterweights', async () => {
  const parts = await importCarModel();
  assert.ok(parts.crankshaft, 'crankshaft part must exist');
  const counterweights = collectMeshes(parts.crankshaft).filter((m) => /counterweight/i.test(m.name || ''));
  assert.ok(counterweights.length >= 2, `crankshaft must show at least 2 counterweights, found ${counterweights.length}`);
});

test('SCENARIO-011: every wheel is built from rim + tire + tread pattern (not a bare cylinder)', async () => {
  const parts = await importCarModel();
  assert.ok(Array.isArray(parts.wheels) && parts.wheels.length >= 4, 'wheels array must exist');
  for (const wheel of parts.wheels) {
    const meshes = collectMeshes(wheel);
    const rims = meshes.filter((m) => /rim/i.test(m.name || ''));
    const tires = meshes.filter((m) => /tire/i.test(m.name || ''));
    const treads = meshes.filter((m) => /tread/i.test(m.name || ''));
    assert.ok(rims.length >= 1, 'each wheel must contain a rim mesh');
    assert.ok(tires.length >= 1, 'each wheel must contain a tire mesh');
    assert.ok(treads.length >= 4, `each wheel must carry a tread pattern (≥4 tread blocks), found ${treads.length}`);
  }
});

test('SCENARIO-012: realism is achieved purely with in-code THREE geometry and MeshStandardMaterial — distinct metalness/roughness across parts', async () => {
  const parts = await importCarModel();
  const rebuilt = [
    ...(parts.pistons ?? []),
    ...(parts.connectingRods ?? []),
    ...(parts.intakeValves ?? []),
    ...(parts.exhaustValves ?? []),
    ...(parts.gearSets ?? []).flatMap((s) => [s.g1, s.g2]),
    parts.crankshaft,
    ...(parts.wheels ?? []),
  ].filter(Boolean);
  const combos = new Set();
  let metallic = 0;
  let meshCount = 0;
  for (const node of rebuilt) {
    for (const mesh of collectMeshes(node)) {
      meshCount += 1;
      const mat = mesh.material;
      assert.ok(mat && mat.isMeshStandardMaterial, `mesh "${mesh.name || '(unnamed)'}" must use MeshStandardMaterial, saw ${mat?.constructor?.name}`);
      combos.add(`${mat.metalness}/${mat.roughness}`);
      if (mat.metalness >= 0.85) metallic += 1;
    }
  }
  assert.ok(meshCount >= 20, `the rebuilt part set must contain real geometry, only ${meshCount} meshes found`);
  assert.ok(combos.size >= 2, `different parts must show clearly distinct metalness/roughness (steelMat 0.85/0.25 vs shinyMat 0.95/0.15), saw ${[...combos].join(', ')}`);
  assert.ok(metallic >= 5, 'metal parts must keep high metalness (≥0.85) PBR response');
});

test('SCENARIO-024: renderer pixel ratio stays capped at 2 in main.js (the existing cap is never exceeded)', async () => {
  const src = readSource('main.js');
  assert.match(
    src,
    /setPixelRatio\(\s*Math\.min\([^)]*,\s*2\s*\)\s*\)/,
    'main.js must keep renderer.setPixelRatio(Math.min(devicePixelRatio, 2))'
  );
});

test('SCENARIO-024: rebuilt model geometry stays within the ≈15k added-triangle budget family (whole model ≤ ~30k stub-estimated triangles)', async () => {
  const parts = await importCarModel();
  const total =
    countTriangles(parts.iceParts ?? new THREE.Group()) +
    countTriangles(parts.evParts ?? new THREE.Group()) +
    countTriangles(parts.driveline ?? new THREE.Group());
  assert.ok(total <= 30000, `whole-model triangle estimate ${total} must stay within the performance budget family`);
});

test('REALISM_SCENARIO_TAGS exports the frozen closure [SCENARIO-011, SCENARIO-012, SCENARIO-024, SCENARIO-025]', async () => {
  const mod = await loadModule('car-model.js');
  assert.deepEqual(
    [...mod.REALISM_SCENARIO_TAGS],
    ['SCENARIO-011', 'SCENARIO-012', 'SCENARIO-024', 'SCENARIO-025'],
    'REALISM_SCENARIO_TAGS must equal the Phase 1 realism closure'
  );
  assert.equal(Object.isFrozen(mod.REALISM_SCENARIO_TAGS), true, 'REALISM_SCENARIO_TAGS must be Object.freeze-d');
});

// ─── v2 real-anatomy rebuild (YouTube-reference upgrade) ─────────────────────

test('v2: DOHC twin camshafts each carry 4 egg-profile lobes (8 total)', async () => {
  const parts = await importCarModel();
  assert.ok(parts.intakeCam && parts.exhaustCam, 'intakeCam/exhaustCam parts must exist');
  for (const cam of [parts.intakeCam, parts.exhaustCam]) {
    const lobes = collectMeshes(cam).filter((m) => /camLobe/i.test(m.name || ''));
    assert.equal(lobes.length, 4, 'each cam must carry exactly 4 lobes (one per cylinder)');
    for (const lobe of lobes) {
      assert.equal(lobe.geometry?.type, 'ExtrudeGeometry', 'each lobe must be an extruded egg profile');
    }
  }
});

test('v2: timing belt is a closed tube wrapping crank + both cam sprockets, sprockets are 2:1 (12 vs 24 teeth)', async () => {
  const parts = await importCarModel();
  assert.ok(parts.timingBelt, 'timingBelt part must exist');
  assert.equal(parts.timingBelt.geometry?.type, 'TubeGeometry');
  assert.equal(parts.timingBelt.geometry.parameters.closed, true, 'the belt must be a closed loop');
  const crankTeeth = Number(parts.crankSprocket?.userData?.toothCount);
  assert.equal(crankTeeth, 12, 'crank sprocket must have 12 teeth');
  for (const cam of [parts.intakeCam, parts.exhaustCam]) {
    const sprocket = collectMeshes(cam).find((m) => /Sprocket/i.test(m.parent?.name || '') || /Sprocket/i.test(m.name || ''));
    const camGroupTeeth = cam.children.filter((c) => c.userData?.toothCount === 24).length;
    assert.ok(camGroupTeeth >= 1, 'each cam must carry a 24-tooth sprocket (exactly 2× the crank 12)');
  }
});

test('v2: engine stack has oil pan + head gasket + semi-transparent valve cover; car gets a real 3-box shell with wheel arches', async () => {
  const parts = await importCarModel();
  assert.ok(parts.oilPan, 'oilPan part must exist');
  const panMeshes = collectMeshes(parts.oilPan);
  assert.ok(panMeshes.some((m) => /panBody/i.test(m.name || '')), 'oil pan must have a body mesh');
  assert.ok(panMeshes.some((m) => /drainPlug/i.test(m.name || '')), 'oil pan must have a drain plug');

  assert.ok(parts.bodyShell, 'bodyShell part must exist');
  const shell = collectMeshes(parts.bodyShell).find((m) => /bodyShell/i.test(m.name || ''));
  assert.ok(shell, 'the shell must contain the bodyShell extrude mesh');
  assert.equal(shell.geometry?.type, 'ExtrudeGeometry', 'the sedan silhouette must be a real extruded profile');
});

test('v2: crankshaft has 5 main journals + 4 rod journals at the 0.22 throw (real flat-plane crank)', async () => {
  const parts = await importCarModel();
  const meshes = collectMeshes(parts.crankshaft);
  const mains = meshes.filter((m) => /mainJournal/i.test(m.name || ''));
  const pins = meshes.filter((m) => /rodJournal/i.test(m.name || ''));
  assert.equal(mains.length, 5, 'inline-4 crank must have 5 main journals');
  assert.equal(pins.length, 4, 'inline-4 crank must have 4 rod journals');
  const pinsOnThrow = pins.every((p) => Math.abs(Math.hypot(p.position.y, p.position.z) - 0.22) < 0.01);
  assert.ok(pinsOnThrow, 'every rod journal must sit exactly on the 0.22 crank throw circle');
});

test('v2: spark plugs are real assemblies (insulator + hex + electrode) over each cylinder', async () => {
  const parts = await importCarModel();
  for (const s of parts.sparkSparks) {
    const plug = s.spark;
    assert.ok(/plugInsulator|Insulator/i.test(plug.name || '') || plug.parent?.name === '', 'spark anchor must be the insulator');
  }
  const plugs = collectMeshes(parts.iceParts).filter((m) => /plug(Insulator|Hex|Electrode)/i.test(m.name || ''));
  assert.ok(plugs.length >= 12, `4 plugs × (insulator+hex+electrode) ≥ 12 meshes, found ${plugs.length}`);
});

// ─── subframes anchor steering/suspension (user: 前悬部分怎么是悬空的) ───
test('SCENARIO-026: front & rear subframes connect suspension to the body', async () => {
  const parts = await importCarModel();
  const sub = parts.subframes;
  assert.ok(sub, 'subframes group exists');
  const names = [];
  sub.traverse((o) => { if (o.name) names.push(o.name); });
  for (const rail of ['frontSubframeRailL', 'frontSubframeRailR', 'rearSubframeRailL', 'rearSubframeRailR']) {
    assert.ok(names.includes(rail), `${rail} present`);
  }
  const crosses = names.filter((n) => n.startsWith('frontSubframeCross')).length;
  assert.ok(crosses >= 2, `front subframe has >=2 crossmembers (got ${crosses})`);
  assert.ok(names.some((n) => n.startsWith('controlArm')), 'lower control arms connect rails to wheels');
  assert.ok(names.includes('rackClamp'), 'steering rack is clamped to the subframe');
});

// ─── lamps & strut mounts anchored (user: 红色方块怎么悬空) ───
test('SCENARIO-027: taillights/headlights sit on fascia panels; strut tops get towers', async () => {
  const parts = await importCarModel();
  const names = [];
  parts.driveline.traverse((o) => { if (o.name) names.push(o.name); });
  assert.ok(names.includes('rearFascia') && names.includes('frontFascia'), 'fascia panels exist');
  const towers = names.filter((n) => n.startsWith('strutTower')).length;
  assert.ok(towers >= 4, `4 strut towers (got ${towers})`);
  assert.ok(names.filter((n) => n === 'strutMountPlate').length >= 4, '4 mount plates');
  const lights = names.filter((n) => n === 'taillight' || n === 'headlight').length;
  assert.ok(lights >= 4, 'headlights+taillights mounted');
});

// ─── pinion is a real truncated cone (user: 锥形齿轮从哪个角度看都不是锥形) ───
test('SCENARIO-028: drive pinion built as a tapered cone with slant-leaned teeth', async () => {
  const parts = await importCarModel();
  const pin = parts.differential.userData.pinionGearGroup;
  let cone = null;
  pin.traverse((o) => { if (o.name === 'pinionCone') cone = o; });
  assert.ok(cone, 'pinionCone mesh exists');
  const taper = Math.abs(cone.geometry.parameters.radiusTop - cone.geometry.parameters.radiusBottom);
  assert.ok(taper >= 0.06, `cone tapers (Δr=${taper.toFixed(3)} >= 0.06)`);
  const teeth = [];
  pin.traverse((o) => { if (o.name?.startsWith('tooth')) teeth.push(o); });
  assert.ok(teeth.length === 9, `9 pinion teeth (got ${teeth.length})`);
  assert.ok(teeth.every((t) => Math.abs(t.rotation.z) > 0.15), 'teeth lean along the cone slant');
  // yoke connects prop end to pinion nose (no more tube through the ring disc)
  let yoke = null, stub = null;
  parts.driveline.traverse((o) => {
    if (o.name === 'pinionYoke') yoke = o;
    if (o.name === 'pinionInputStub') stub = o;
  });
  assert.ok(yoke, 'sloped pinionYoke exists');
  assert.ok(!stub, 'old straight stub removed');
});

// ─── 90° hand-off arrows at the mesh (user: 顺着传动轴看还是不清楚) ───
test('SCENARIO-029: L-shaped orange→cyan hand-off arrows live at the pinion/ring mesh', async () => {
  const parts = await importCarModel();
  const arrows = parts.rotationArrows;
  assert.ok(arrows, 'rotationArrows group exists');
  const names = [];
  arrows.traverse((o) => { if (o.name) names.push(o.name); });
  assert.ok(names.includes('handOffIn') && names.includes('handOffOut'), 'hand-off arc pair exists');
  assert.ok(names.includes('handOffInTip') && names.includes('handOffOutTip'), 'arrow tips exist');
  // orange arc sits on the incoming (prop) side, cyan on the outgoing (axle) side
  let inArc = null, outArc = null;
  arrows.traverse((o) => {
    if (o.name === 'handOffIn') inArc = o;
    if (o.name === 'handOffOut') outArc = o;
  });
  assert.ok(inArc.position.x < outArc.position.x, 'orange arc ahead of cyan arc (power flows front→rear)');
  // mesh point sits below the axle line, inside the ring rim band
  assert.ok(Math.abs(inArc.position.y + 0.52) < 0.1, 'hand-off anchored at the hypoid mesh point');
});

// ─── spin marks + slower demo rotation (user: 怎么转动不清晰 / 旋转慢一点) ───
test('SCENARIO-030: unlit white spin marks on ring gear faces and pinion flange', async () => {
  const parts = await importCarModel();
  const ring = parts.differential.userData.ringGearGroup;
  const marks = [];
  ring.traverse((o) => { if (o.name?.startsWith('ringSpinMark')) marks.push(o); });
  assert.ok(marks.length === 8, `8 face spin marks, 4 per face (got ${marks.length})`);
  assert.ok(marks.every((m) => m.material.isMeshBasicMaterial), 'marks are unlit → readable from any angle');
  // marks sit inside the disc radius, outside the hub, proud of both faces
  assert.ok(marks.every((m) => Math.abs(Math.abs(m.position.z) - 0.055) < 0.01), 'marks flush-proud of disc faces');
  const pin = parts.differential.userData.pinionGearGroup;
  let bar = null, flange = null;
  pin.traverse((o) => {
    if (o.name === 'pinionSpinMark') bar = o;
    if (o.name === 'pinionFlange') flange = o;
  });
  assert.ok(bar && flange, 'pinion spin bar rides the flange');
  // the flange now spins WITH the pinion (companion flange), not frozen in the case
  assert.ok(flange.parent === pin, 'flange is a child of pinionGearGroup → rotates with pinion');
});
