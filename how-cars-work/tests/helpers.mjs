// helpers.mjs — TEST-ONLY shared utilities for the Phase 1 RED suite.
// Nothing in here is shipped with the site; it exists purely so Node can load
// the production ES modules (which `import ... from 'three'`) without a CDN
// importmap, by rewriting the bare specifier to the local three-stub and
// importing a cached copy.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const TESTS_DIR = path.dirname(fileURLToPath(import.meta.url));
export const SITE_ROOT = path.resolve(TESTS_DIR, '..');
export const REPO_ROOT = path.resolve(SITE_ROOT, '..');
export const JS_DIR = path.join(SITE_ROOT, 'js');
export const CACHE_DIR = path.join(TESTS_DIR, '.cache');
const STUB_URL = pathToFileURL(path.join(TESTS_DIR, 'support', 'three-stub.mjs')).href;

// The 21-part CLOSED identifier set (spec AC-02 / SCENARIO-004), partitioned
// per subsystem exactly as the phase contract enumerates them.
export const SUBSYSTEM_PARTS = {
  fuelDelivery: ['fuelTank', 'fuelPump', 'fuelLine', 'injector1', 'injector2', 'injector3', 'injector4'],
  airIntake: ['airFilter', 'throttleBody', 'intakeManifold'],
  cooling: ['radiator', 'waterPump', 'thermostat', 'coolantHose1', 'coolantHose2'],
  lubrication: ['oilPan', 'oilPump'],
  exhaust: ['exhaustManifold', 'catalyticConverter', 'muffler', 'tailpipe'],
};
export const ALL_PART_IDS = Object.values(SUBSYSTEM_PARTS).flat();

/**
 * Load a production ES module under Node by rewriting its bare `three`
 * specifier to the local stub. Cached under tests/.cache so re-imports across
 * test files reuse one evaluated instance per source file.
 */
export async function loadModule(relativePathFromJs) {
  const sourcePath = path.join(JS_DIR, relativePathFromJs);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`module under test does not exist yet: ${sourcePath}`);
  }
  const source = fs.readFileSync(sourcePath, 'utf8');
  const rewritten = source.replace(
    /(\bfrom\s*|\bimport\s*)(['"])three\2/g,
    (_m, prefix, quote) => `${prefix}${quote}${STUB_URL}${quote}`
  );
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const cached = path.join(CACHE_DIR, relativePathFromJs.replace(/[/\\]/g, '__'));
  fs.writeFileSync(cached, rewritten);
  return import(pathToFileURL(cached).href);
}

export function readSource(relativePathFromJs) {
  return fs.readFileSync(path.join(JS_DIR, relativePathFromJs), 'utf8');
}

export function readSiteFile(name) {
  return fs.readFileSync(path.join(SITE_ROOT, name), 'utf8');
}

/** Collect every Mesh (stub instances with isMesh) in an Object3D subtree. */
export function collectMeshes(root) {
  const meshes = [];
  root.traverse?.((o) => { if (o && o.isMesh) meshes.push(o); });
  return meshes;
}

/** Sum the stub-estimated triangle counts of every mesh in a subtree. */
export function countTriangles(root) {
  return collectMeshes(root).reduce((sum, m) => sum + (m.geometry?.triangleCount ?? 0), 0);
}

/** The pitch radius of a gear group = the largest cylinder/cone/sphere/torus radius inside it. */
export function gearPitchRadius(group) {
  let r = 0;
  group.traverse?.((o) => {
    const p = o.geometry?.parameters;
    if (!p) return;
    const candidates = [p.radiusTop, p.radiusBottom, p.radius, p.tube != null ? p.radius + p.tube : undefined];
    for (const c of candidates) if (typeof c === 'number' && Number.isFinite(c)) r = Math.max(r, c);
  });
  return r;
}

/** Tooth count of a gear: userData.toothCount, cross-checked against tooth-named children when present. */
export function gearToothCount(group) {
  const declared = Number(group.userData?.toothCount);
  if (!Number.isFinite(declared)) return NaN;
  let named = 0;
  group.traverse?.((o) => { if (o !== group && typeof o.name === 'string' && /tooth/i.test(o.name)) named += 1; });
  return named > 0 ? { declared, named } : { declared, named: null };
}

/** Largest absolute Euler component on an object or any ancestor up to (excluding) `stopAt`. */
export function maxAncestorRotation(obj, stopAt) {
  let node = obj;
  let best = 0;
  while (node && node !== stopAt) {
    const r = node.rotation;
    if (r) best = Math.max(best, Math.abs(r.x || 0), Math.abs(r.y || 0), Math.abs(r.z || 0));
    node = node.parent;
  }
  return best;
}

export const hasCjk = (s) => /[\u4e00-\u9fff]/.test(s);
export const hasLatin = (s) => /[A-Za-z]/.test(s);
