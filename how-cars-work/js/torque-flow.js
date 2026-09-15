// torque-flow.js — Phase 2 gold torque-flow visualization for how-cars-work.
// Covers SCENARIO-015 (gold particles streaming along the ordered named
// waypoint chain battery → starter → engine → transmission → wheels, always
// flowing from the battery side toward the wheels side) and SCENARIO-024 (a
// bounded particle system that cannot break the ≥30 FPS smoothness budget).
// Pure ES module on the existing three importmap — no build step.

import * as THREE from 'three';

// Scenario closure for this module (spec Phase 2 union with kinematics.js).
export const TORQUE_FLOW_SCENARIO_TAGS = Object.freeze(['SCENARIO-015', 'SCENARIO-024']);

// Gold torque color: r ≥ g ≥ b so the energy path reads as "gold" at a glance.
export const TORQUE_GOLD = 0xffc832;

// The ordered power path: battery → starter → engine → transmission → wheels.
// Positions match the car layout used by the legacy PATH_ICE particle track.
const WAYPOINT_DEFS = [
  { name: 'battery', position: [-5.6, 1.0, 0] },
  { name: 'starter', position: [-4.8, 0.2, 0] },
  { name: 'engine', position: [-2.5, 0.0, 0] },
  { name: 'transmission', position: [1.0, 0.0, 0] },
  { name: 'wheels', position: [4.1, 0.0, 0] },
];

const PARTICLE_COUNT = 24; // bounded set: ≥8 visible, ≤600 for the FPS budget
const FLOW_SPEED = 0.4;    // full battery→wheels sweep every 2.5 s
const MAX_STEP = 0.25;     // clamp dt after tab-switch stalls so nothing jumps

let activeFlow = null;
let lastTime = null;

function toVector(wp) {
  return wp.position instanceof THREE.Vector3 ? wp.position : new THREE.Vector3(wp.position[0], wp.position[1], wp.position[2]);
}

/** Place a particle exactly on the battery→wheels polyline at arc parameter u ∈ [0,1). */
function placeOnPath(particle, waypoints, u) {
  const seg = Math.min(Math.max(u, 0), 0.999999) * (waypoints.length - 1);
  const index = Math.min(Math.floor(seg), waypoints.length - 2);
  const f = seg - index;
  const a = waypoints[index].position;
  const b = waypoints[index + 1].position;
  particle.position.set(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, a.z + (b.z - a.z) * f);
}

/**
 * SCENARIO-015 — build the gold torque-flow path into the scene.
 * Returns the flow handle { group, waypoints, particles, material } whose
 * waypoints are named battery/starter/engine/transmission/wheels in order.
 */
export function buildTorqueFlow(scene) {
  const waypoints = WAYPOINT_DEFS.map((wp) => ({ name: wp.name, position: toVector(wp) }));

  const group = new THREE.Group();
  group.name = 'torqueFlow';

  // Faint guide line along the whole battery→wheels chain.
  const lineVertices = [];
  for (const wp of waypoints) lineVertices.push(wp.position.x, wp.position.y, wp.position.z);
  const guideGeometry = new THREE.BufferGeometry().setAttribute(
    'position',
    new THREE.Float32BufferAttribute(lineVertices, 3)
  );
  const guideMaterial = new THREE.LineBasicMaterial({ color: TORQUE_GOLD, transparent: true, opacity: 0.22 });
  group.add(new THREE.Line(guideGeometry, guideMaterial));

  // Bounded set of gold particles spread evenly along the path (SCENARIO-024).
  const particleGeometry = new THREE.IcosahedronGeometry(0.05, 0);
  const material = new THREE.MeshBasicMaterial({ color: TORQUE_GOLD, transparent: true, opacity: 0.95 });
  const particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const particle = new THREE.Mesh(particleGeometry, material);
    particle.userData.progress = i / PARTICLE_COUNT;
    placeOnPath(particle, waypoints, particle.userData.progress);
    group.add(particle);
    particles.push(particle);
  }

  scene.add(group);

  activeFlow = { group, waypoints, particles, material };
  lastTime = null;
  return activeFlow;
}

/**
 * SCENARIO-015/SCENARIO-024 — advance every particle from the battery side
 * toward the wheels side (progress only increases; particles that reach the
 * wheels respawn at the battery). The particle set is fixed, so a long run
 * never grows it. `t` is the absolute animation time in seconds.
 */
export function updateTorqueFlow(t) {
  const flow = activeFlow;
  if (!flow) return flow;
  const now = Number.isFinite(t) ? t : 0;
  const dt = lastTime === null ? 0 : Math.max(0, Math.min(now - lastTime, MAX_STEP));
  lastTime = now;
  for (const particle of flow.particles) {
    const next = particle.userData.progress + dt * FLOW_SPEED;
    particle.userData.progress = next % 1;
    placeOnPath(particle, flow.waypoints, particle.userData.progress);
  }
  return flow;
}
