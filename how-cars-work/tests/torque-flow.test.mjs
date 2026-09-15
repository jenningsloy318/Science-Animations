// torque-flow.test.mjs — Phase 2 RED tests for how-cars-work/js/torque-flow.js
// Covers SCENARIO-015 (gold particles along the ordered named waypoint chain
// battery → starter → engine → transmission → wheels, always flowing from the
// battery side toward the wheels side) and SCENARIO-024 (bounded particle
// system for the ≥30 FPS smoothness budget), plus TORQUE_FLOW_SCENARIO_TAGS.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadModule, JS_DIR } from './helpers.mjs';
import * as THREE from './support/three-stub.mjs';

const WAYPOINT_ORDER = ['battery', 'starter', 'engine', 'transmission', 'wheels'];

async function importTorqueFlow() {
  const file = path.join(JS_DIR, 'torque-flow.js');
  assert.ok(
    fs.existsSync(file),
    'how-cars-work/js/torque-flow.js must exist as an ES module (greenfield Phase 2 deliverable)'
  );
  return loadModule('torque-flow.js');
}

/** Resolve the waypoint list from whichever shape the module exposes. */
function waypointsOf(flow) {
  const list = flow?.waypoints ?? flow?.path?.waypoints ?? flow?.chain;
  if (Array.isArray(list) && list.length) return list;
  return null;
}

function waypointName(wp) {
  return wp?.name ?? wp?.id ?? wp?.label ?? (typeof wp === 'string' ? wp : null);
}

function waypointPos(wp) {
  const p = wp?.position ?? wp?.pos ?? (wp && typeof wp.x === 'number' ? wp : null);
  if (p && typeof p.x === 'number' && typeof p.y === 'number' && typeof p.z === 'number') return p;
  return null;
}

/** Resolve per-particle world positions: array of point objects OR THREE.Points geometry. */
function particlePositions(flow) {
  if (Array.isArray(flow?.particles) && flow.particles.length) {
    return flow.particles.map((p) => p.position ?? p).filter((p) => p && typeof p.x === 'number');
  }
  const candidates = [];
  const pushCandidate = (o) => { if (o) candidates.push(o); };
  pushCandidate(flow?.points);
  pushCandidate(flow?.pointsObject);
  pushCandidate(flow?.particleSystem);
  pushCandidate(flow?.system);
  pushCandidate(flow?.group);
  pushCandidate(flow);
  const collected = [];
  const seen = new Set();
  const walk = (o) => {
    if (!o || seen.has(o)) return;
    seen.add(o);
    if (o.isPoints || o.geometry?.attributes?.position) collected.push(o);
    (o.children ?? []).forEach(walk);
  };
  candidates.forEach(walk);
  for (const c of collected) {
    const attr = c.geometry?.attributes?.position;
    const arr = attr?.array ?? attr;
    if (arr && typeof arr.length === 'number' && arr.length >= 3) {
      const pts = [];
      for (let i = 0; i + 2 < arr.length; i += 3) pts.push({ x: arr[i], y: arr[i + 1], z: arr[i + 2] });
      if (pts.length) return pts;
    }
  }
  return null;
}

/** Resolve a material color to rgb triple. */
function goldCheckColor(flow) {
  const mats = [];
  const collect = (o) => {
    if (!o) return;
    if (o.material) mats.push(o.material);
    if (o.isPoints || o.isMesh) mats.push(o.material);
  };
  collect(flow?.points ?? flow?.pointsObject ?? flow?.particleSystem ?? flow?.group);
  if (Array.isArray(flow?.particles) && flow.particles.length) collect(flow.particles[0]);
  collect(flow);
  for (const m of mats) {
    const c = m?.color;
    if (!c) continue;
    if (typeof c === 'number') {
      const r = (c >> 16) & 0xff, g = (c >> 8) & 0xff, b = c & 0xff;
      return { r: r / 255, g: g / 255, b: b / 255 };
    }
    if (typeof c.color === 'number') {
      const n = c.color, r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff;
      return { r: r / 255, g: g / 255, b: b / 255 };
    }
    if ([c.r, c.g, c.b].every((v) => typeof v === 'number')) return { r: c.r, g: c.g, b: c.b };
  }
  return null;
}

/** Projection fraction [0,1] of a point onto the battery→wheels polyline. */
function progressAlong(pos, waypoints) {
  const pts = waypoints.map(waypointPos);
  let total = 0;
  let acc = 0;
  let bestDist = Infinity;
  let bestAcc = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1];
    const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
    const len2 = abx * abx + aby * aby + abz * abz || 1e-12;
    const t = Math.max(0, Math.min(1, ((pos.x - a.x) * abx + (pos.y - a.y) * aby + (pos.z - a.z) * abz) / len2));
    const px = a.x + abx * t, py = a.y + aby * t, pz = a.z + abz * t;
    const d = (pos.x - px) ** 2 + (pos.y - py) ** 2 + (pos.z - pz) ** 2;
    if (d < bestDist) { bestDist = d; bestAcc = total + Math.sqrt(len2) * t; }
    total += Math.sqrt(len2);
  }
  return total > 0 ? bestAcc / total : 0;
}

let mod = null;
async function loadTorqueFlow() {
  mod = mod ?? await importTorqueFlow();
  return mod;
}

test('SCENARIO-015: torque-flow.js exports buildTorqueFlow(scene)/updateTorqueFlow(t) and frozen TORQUE_FLOW_SCENARIO_TAGS', async () => {
  const m = await loadTorqueFlow();
  assert.equal(typeof m.buildTorqueFlow, 'function', 'buildTorqueFlow must be an exported function');
  assert.equal(typeof m.updateTorqueFlow, 'function', 'updateTorqueFlow must be an exported function');
  assert.ok(Array.isArray(m.TORQUE_FLOW_SCENARIO_TAGS), 'TORQUE_FLOW_SCENARIO_TAGS must be exported');
  assert.deepEqual([...m.TORQUE_FLOW_SCENARIO_TAGS], ['SCENARIO-015', 'SCENARIO-024']);
  assert.equal(Object.isFrozen(m.TORQUE_FLOW_SCENARIO_TAGS), true, 'TORQUE_FLOW_SCENARIO_TAGS must be frozen');
});

test('SCENARIO-015: buildTorqueFlow(scene) creates the ordered named waypoint chain battery → starter → engine → transmission → wheels inside the scene', async () => {
  const m = await loadTorqueFlow();
  const scene = new THREE.Scene();
  const before = scene.children.length;
  const flow = m.buildTorqueFlow(scene);
  assert.ok(flow, 'buildTorqueFlow must return the flow handle');
  assert.ok(scene.children.length > before, 'buildTorqueFlow must add its particle path into the scene');
  const wps = waypointsOf(flow);
  assert.ok(wps, 'the flow handle must expose its waypoint list (flow.waypoints)');
  assert.equal(wps.length, 5, 'the torque path has exactly five waypoints');
  const names = wps.map(waypointName);
  assert.deepEqual(names, WAYPOINT_ORDER, 'waypoints must be named and ordered battery → starter → engine → transmission → wheels');
  for (const wp of wps) {
    const p = waypointPos(wp);
    assert.ok(p, `waypoint "${waypointName(wp)}" must carry a numeric position`);
  }
  const first = waypointPos(wps[0]), last = waypointPos(wps[4]);
  const apart = (first.x - last.x) ** 2 + (first.y - last.y) ** 2 + (first.z - last.z) ** 2;
  assert.ok(apart > 0.01, 'battery and wheels waypoints must be physically distinct so flow direction is observable');
});

test('SCENARIO-015: updateTorqueFlow(t) streams gold particles from the battery side toward the wheels side — the flow direction never reverses', async () => {
  const m = await loadTorqueFlow();
  const scene = new THREE.Scene();
  const flow = m.buildTorqueFlow(scene);
  const wps = waypointsOf(flow);
  assert.ok(wps, 'waypoint list must be exposed');

  const positions = () => particlePositions(flow);
  let pts = positions();
  assert.ok(pts && pts.length >= 8, `the flow must animate a visible set of particles (resolved ${pts ? pts.length : 0})`);

  // sample the path over simulated time; each particle may advance or wrap
  // battery→wheels→(restart), but must never drift backwards
  let prev = pts.map((p) => progressAlong(p, wps));
  let minSeen = Infinity, maxSeen = -Infinity;
  for (let t = 0.05; t <= 3.0; t += 0.05) {
    m.updateTorqueFlow(t);
    pts = positions();
    assert.ok(pts && pts.length >= 8, 'particle positions must remain resolvable during the flow');
    const cur = pts.map((p) => progressAlong(p, wps));
    for (let i = 0; i < cur.length; i++) {
      const d = cur[i] - prev[i];
      const forward = d >= -1e-9;                 // moving battery → wheels
      const wrapped = d <= -0.5;                  // reached wheels, respawned at battery
      assert.ok(forward || wrapped,
        `particle #${i} must never flow wheels → battery (progress went ${prev[i].toFixed(3)} → ${cur[i].toFixed(3)} at t=${t})`);
      minSeen = Math.min(minSeen, cur[i]);
      maxSeen = Math.max(maxSeen, cur[i]);
    }
    prev = cur;
  }
  assert.ok(minSeen <= 0.2, `particles must ride from the battery end of the chain (min progress ${minSeen})`);
  assert.ok(maxSeen >= 0.8, `particles must reach the wheels end of the chain (max progress ${maxSeen})`);

  const rgb = goldCheckColor(flow);
  assert.ok(rgb, 'the particles must carry a material color (gold torque flow)');
  assert.ok(rgb.r > 0.55 && rgb.r >= rgb.g && rgb.g > rgb.b,
    `torque-flow particles must be gold (got r=${rgb.r}, g=${rgb.g}, b=${rgb.b})`);
});

test('SCENARIO-024: the torque-flow particle system stays bounded so the added effect cannot break the ≥30 FPS budget', async () => {
  const m = await loadTorqueFlow();
  const scene = new THREE.Scene();
  const flow = m.buildTorqueFlow(scene);
  const pts = particlePositions(flow);
  assert.ok(pts, 'particle positions must be resolvable');
  assert.ok(pts.length >= 8, `the flow needs a visible particle count (got ${pts.length})`);
  assert.ok(pts.length <= 600, `particle count must stay bounded for smoothness (got ${pts.length})`);
  // simulating a long run must not grow the particle set
  for (let t = 0.05; t <= 5.0; t += 0.05) m.updateTorqueFlow(t);
  const after = particlePositions(flow);
  assert.equal(after.length, pts.length, 'updateTorqueFlow must not spawn unbounded particles over time');
});
