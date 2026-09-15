// three-stub.mjs — TEST-ONLY in-memory stand-in for the `three` ES module.
// It exists so Node (no CDN, no importmap) can import how-cars-work/js/*.js and
// inspect the geometry/material arguments the production code constructs.
// Every geometry records its constructor `parameters` plus a deterministic
// `triangleCount` estimate used by the ≈15k-triangle budget tests.
// This file lives under how-cars-work/tests/ and is NEVER shipped or imported
// by the site itself (SCENARIO-023 zero-build shape is unaffected).

export class Vector2 {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  set(x, y) { this.x = x; this.y = y; return this; }
  clone() { return new Vector2(this.x, this.y); }
}

export class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
  multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
  length() { return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); }
  normalize() { const l = this.length() || 1; return this.multiplyScalar(1 / l); }
  clone() { return new Vector3(this.x, this.y, this.z); }
  lerp(v, a) { this.x += (v.x - this.x) * a; this.y += (v.y - this.y) * a; this.z += (v.z - this.z) * a; return this; }
}

export class Euler {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  clone() { return new Euler(this.x, this.y, this.z); }
}

export class Quaternion {
  constructor(x = 0, y = 0, z = 0, w = 1) { this.x = x; this.y = y; this.z = z; this.w = w; }
  clone() { return new Quaternion(this.x, this.y, this.z, this.w); }
}

export class Matrix4 {
  constructor() { this.elements = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; }
  identity() { return this; }
  makeTranslation() { return this; }
  multiply() { return this; }
  multiplyMatrices() { return this; }
}

export class Color {
  constructor(color = 0xffffff) { this.color = color; this.r = 1; this.g = 1; this.b = 1; }
  set() { return this; }
  clone() { return new Color(this.color); }
}

export class BufferAttribute {
  constructor(array, itemSize = 3) { this.array = array; this.itemSize = itemSize; this.count = array.length / itemSize; }
}
export class Float32BufferAttribute extends BufferAttribute {}

export class BufferGeometry {
  constructor() {
    this.type = 'BufferGeometry';
    this.parameters = {};
    this.attributes = {};
    this._triangles = 0;
  }
  setAttribute(name, attribute) { this.attributes[name] = attribute; return this; }
  getAttribute(name) { return this.attributes[name]; }
  // transform no-ops so production geometry code can chain freely under the stub
  translate() { return this; }
  rotateX() { return this; }
  rotateY() { return this; }
  rotateZ() { return this; }
  scale() { return this; }
  center() { return this; }
  computeVertexNormals() { return this; }
  computeBoundingBox() { return this; }
  computeBoundingSphere() { return this; }
  get triangleCount() {
    const pos = this.attributes.position;
    if (pos && pos.count) return Math.floor(pos.count / 3);
    return this._triangles;
  }
}

function paramGeom(type, parameters, triangles) {
  const g = new BufferGeometry();
  g.type = type;
  g.parameters = parameters;
  g._triangles = triangles;
  return g;
}

export class BoxGeometry extends BufferGeometry {
  constructor(width = 1, height = 1, depth = 1, widthSegments = 1, heightSegments = 1, depthSegments = 1) {
    super();
    this.type = 'BoxGeometry';
    this.parameters = { width, height, depth, widthSegments, heightSegments, depthSegments };
    this._triangles = 12 * widthSegments * heightSegments * depthSegments;
  }
}

export class CylinderGeometry extends BufferGeometry {
  constructor(radiusTop = 1, radiusBottom = 1, height = 1, radialSegments = 32, heightSegments = 1, openEnded = false, thetaStart = 0, thetaLength = Math.PI * 2) {
    super();
    this.type = 'CylinderGeometry';
    this.parameters = { radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded, thetaStart, thetaLength };
    const side = 2 * radialSegments * heightSegments;
    const caps = openEnded ? 0 : (radiusTop > 0 ? radialSegments : 0) + (radiusBottom > 0 ? radialSegments : 0);
    this._triangles = side + caps;
  }
}

export class ConeGeometry extends BufferGeometry {
  constructor(radius = 1, height = 1, radialSegments = 32, heightSegments = 1, openEnded = false, thetaStart = 0, thetaLength = Math.PI * 2) {
    super();
    this.type = 'ConeGeometry';
    this.parameters = { radius, height, radialSegments, heightSegments, openEnded, thetaStart, thetaLength };
    this._triangles = radialSegments * heightSegments * 2 + (openEnded ? 0 : radialSegments);
  }
}

export class SphereGeometry extends BufferGeometry {
  constructor(radius = 1, widthSegments = 32, heightSegments = 16, phiStart = 0, phiLength = Math.PI * 2, thetaStart = 0, thetaLength = Math.PI) {
    super();
    this.type = 'SphereGeometry';
    this.parameters = { radius, widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength };
    this._triangles = Math.max(1, 2 * (widthSegments - 1) * (heightSegments - 1));
  }
}

export class TorusGeometry extends BufferGeometry {
  constructor(radius = 0.4, tube = 0.15, radialSegments = 16, tubularSegments = 48, arc = Math.PI * 2) {
    super();
    this.type = 'TorusGeometry';
    this.parameters = { radius, tube, radialSegments, tubularSegments, arc };
    this._triangles = 2 * radialSegments * Math.max(1, Math.round((arc / (Math.PI * 2)) * tubularSegments));
  }
}

export class TorusKnotGeometry extends BufferGeometry {
  constructor(radius = 1, tube = 0.4, tubularSegments = 64, radialSegments = 8, p = 2, q = 3) {
    super();
    this.type = 'TorusKnotGeometry';
    this.parameters = { radius, tube, tubularSegments, radialSegments, p, q };
    this._triangles = 2 * tubularSegments * radialSegments;
  }
}

export class TubeGeometry extends BufferGeometry {
  constructor(path = null, tubularSegments = 64, radius = 1, radialSegments = 8, closed = false) {
    super();
    this.type = 'TubeGeometry';
    this.parameters = { path, tubularSegments, radius, radialSegments, closed };
    this._triangles = 2 * tubularSegments * radialSegments;
  }
}

export class CapsuleGeometry extends BufferGeometry {
  constructor(radius = 1, length = 1, capSegments = 4, radialSegments = 8) {
    super();
    this.type = 'CapsuleGeometry';
    this.parameters = { radius, length, capSegments, radialSegments };
    this._triangles = 2 * radialSegments * (2 * capSegments + 2);
  }
}

export class PlaneGeometry extends BufferGeometry {
  constructor(width = 1, height = 1, widthSegments = 1, heightSegments = 1) {
    super();
    this.type = 'PlaneGeometry';
    this.parameters = { width, height, widthSegments, heightSegments };
    this._triangles = 2 * widthSegments * heightSegments;
  }
}

export class CircleGeometry extends BufferGeometry {
  constructor(radius = 1, segments = 32, thetaStart = 0, thetaLength = Math.PI * 2) {
    super();
    this.type = 'CircleGeometry';
    this.parameters = { radius, segments, thetaStart, thetaLength };
    this._triangles = segments;
  }
}

export class RingGeometry extends BufferGeometry {
  constructor(innerRadius = 0.5, outerRadius = 1, thetaSegments = 32, phiSegments = 1, thetaStart = 0, thetaLength = Math.PI * 2) {
    super();
    this.type = 'RingGeometry';
    this.parameters = { innerRadius, outerRadius, thetaSegments, phiSegments, thetaStart, thetaLength };
    this._triangles = 2 * thetaSegments * phiSegments;
  }
}

export class LatheGeometry extends BufferGeometry {
  constructor(points = [], segments = 12, phiStart = 0, phiLength = Math.PI * 2) {
    super();
    this.type = 'LatheGeometry';
    this.parameters = { points, segments, phiStart, phiLength };
    this._triangles = Math.max(0, points.length - 1) * segments * 2;
  }
}

export class ExtrudeGeometry extends BufferGeometry {
  constructor(shape = null, options = {}) {
    super();
    this.type = 'ExtrudeGeometry';
    this.parameters = { shape, options };
    this._triangles = 384;
  }
}

export class ShapeGeometry extends BufferGeometry {
  constructor(shape = null, curveSegments = 12) {
    super();
    this.type = 'ShapeGeometry';
    this.parameters = { shape, curveSegments };
    this._triangles = 192;
  }
}

export class IcosahedronGeometry extends BufferGeometry {
  constructor(radius = 1, detail = 0) {
    super();
    this.type = 'IcosahedronGeometry';
    this.parameters = { radius, detail };
    this._triangles = 20 * Math.pow(4, detail);
  }
}
export class DodecahedronGeometry extends BufferGeometry {
  constructor(radius = 1, detail = 0) {
    super();
    this.type = 'DodecahedronGeometry';
    this.parameters = { radius, detail };
    this._triangles = 36 * Math.pow(4, detail);
  }
}
export class OctahedronGeometry extends BufferGeometry {
  constructor(radius = 1, detail = 0) {
    super();
    this.type = 'OctahedronGeometry';
    this.parameters = { radius, detail };
    this._triangles = 8 * Math.pow(4, detail);
  }
}
export class TetrahedronGeometry extends BufferGeometry {
  constructor(radius = 1, detail = 0) {
    super();
    this.type = 'TetrahedronGeometry';
    this.parameters = { radius, detail };
    this._triangles = 4 * Math.pow(4, detail);
  }
}

export class Shape {
  constructor() { this.points = []; this._holes = []; }
  moveTo(x, y) { this.points.push(new Vector2(x, y)); return this; }
  lineTo(x, y) { this.points.push(new Vector2(x, y)); return this; }
  quadraticCurveTo(cpx, cpy, x, y) { this.points.push(new Vector2(cpx, cpy), new Vector2(x, y)); return this; }
  bezierCurveTo(a, b, c, x, y) { this.points.push(new Vector2(x, y)); return this; }
  absarc(x, y, r, start, end) { this.points.push(new Vector2(x, y)); return this; }
  closePath() { return this; }
  extractPoints() { return { shape: this.points, holes: this._holes }; }
}

export class CatmullRomCurve3 {
  constructor(points = []) { this.points = points; }
  getPoints(divisions = 5) {
    const out = [];
    for (let i = 0; i <= divisions; i++) out.push(new Vector3(i / divisions, 0, 0));
    return out;
  }
  getPoint(t = 0) { return new Vector3(t, 0, 0); }
}
export class LineCurve3 {
  constructor(v1 = new Vector3(), v2 = new Vector3()) { this.v1 = v1; this.v2 = v2; }
  getPoints(divisions = 1) { return [this.v1.clone(), this.v2.clone()]; }
}
export class CurvePath {
  constructor() { this.curves = []; }
  add(c) { this.curves.push(c); return this; }
  getPoints(divisions = 12) { const out = []; for (let i = 0; i <= divisions; i++) out.push(new Vector3(i / divisions, 0, 0)); return out; }
}

export const MathUtils = {
  degToRad: (d) => (d * Math.PI) / 180,
  radToDeg: (r) => (r * 180) / Math.PI,
  lerp: (a, b, t) => a + (b - a) * t,
  clamp: (v, a, b) => Math.min(b, Math.max(a, v)),
  randFloatSpread: (r) => Math.random() * r - r / 2,
};

export class Object3D {
  constructor() {
    this.children = [];
    this.userData = {};
    this.name = '';
    this.parent = null;
    this.position = new Vector3();
    this.rotation = new Euler();
    this.scale = new Vector3(1, 1, 1);
    this.quaternion = new Quaternion();
    this.visible = true;
    this.castShadow = false;
    this.receiveShadow = false;
  }
  add(...objects) {
    for (const o of objects) {
      if (!o || typeof o !== 'object') continue;
      if (o.parent) o.parent.remove(o);
      o.parent = this;
      this.children.push(o);
    }
    return this;
  }
  remove(object) {
    const i = this.children.indexOf(object);
    if (i !== -1) this.children.splice(i, 1);
    object.parent = null;
    return this;
  }
  traverse(callback) {
    callback(this);
    for (const child of [...this.children]) child.traverse(callback);
    return this;
  }
  getObjectByName(name) {
    let found = null;
    this.traverse((o) => { if (!found && o.name === name) found = o; });
    return found;
  }
  clone(recursive) { return this; }
  updateMatrixWorld() { return this; }
  lookAt() { return this; }
}

export class Group extends Object3D {
  constructor() { super(); this.isGroup = true; }
}

export class Scene extends Object3D {
  constructor() { super(); this.isScene = true; this.background = null; this.fog = null; }
}

export class Mesh extends Object3D {
  constructor(geometry = new BufferGeometry(), material = new MeshStandardMaterial()) {
    super();
    this.isMesh = true;
    this.geometry = geometry;
    this.material = material;
  }
}

export class Line extends Object3D {
  constructor(geometry = new BufferGeometry(), material = new LineBasicMaterial()) {
    super();
    this.isLine = true;
    this.geometry = geometry;
    this.material = material;
  }
}

export class Points extends Object3D {
  constructor(geometry = new BufferGeometry(), material = new PointsMaterial()) {
    super();
    this.isPoints = true;
    this.geometry = geometry;
    this.material = material;
  }
}

class MaterialBase {
  constructor(params = {}) {
    this.uuid = `mat-${MaterialBase._id++}`;
    Object.assign(this, params);
  }
}
MaterialBase._id = 0;

export class MeshStandardMaterial extends MaterialBase {
  constructor(params = {}) {
    super({ color: 0xffffff, metalness: 0.5, roughness: 0.5, ...params });
    this.isMeshStandardMaterial = true;
  }
}
export class MeshPhysicalMaterial extends MeshStandardMaterial { constructor(p = {}) { super(p); this.isMeshPhysicalMaterial = true; } }
export class MeshBasicMaterial extends MaterialBase { constructor(p = {}) { super({ color: 0xffffff, ...p }); this.isMeshBasicMaterial = true; } }
export class MeshLambertMaterial extends MaterialBase { constructor(p = {}) { super({ color: 0xffffff, ...p }); this.isMeshLambertMaterial = true; } }
export class MeshPhongMaterial extends MaterialBase { constructor(p = {}) { super({ color: 0xffffff, ...p }); this.isMeshPhongMaterial = true; } }
export class LineBasicMaterial extends MaterialBase { constructor(p = {}) { super({ color: 0xffffff, ...p }); this.isLineBasicMaterial = true; } }
export class PointsMaterial extends MaterialBase { constructor(p = {}) { super({ color: 0xffffff, ...p }); this.isPointsMaterial = true; } }

export const Raycaster = class {
  constructor() { this.ray = { origin: new Vector3(), direction: new Vector3(0, 0, -1) }; }
  setFromCamera() { return this; }
  intersectObjects() { return []; }
};

// Constants
export const DoubleSide = 2;
export const FrontSide = 0;
export const BackSide = 1;
export const AdditiveBlending = 2;
export const NormalBlending = 0;
export const RepeatWrapping = 1000;
export const ClampToEdgeWrapping = 3301;
export const MirroredRepeatWrapping = 1002;
export const sRGBEncoding = 3001;
export const ACESFilmicToneMapping = 4;

export default {
  Vector2, Vector3, Euler, Quaternion, Matrix4, Color,
  BufferAttribute, Float32BufferAttribute, BufferGeometry,
  BoxGeometry, CylinderGeometry, ConeGeometry, SphereGeometry, TorusGeometry,
  TorusKnotGeometry, TubeGeometry, CapsuleGeometry, PlaneGeometry, CircleGeometry,
  RingGeometry, LatheGeometry, ExtrudeGeometry, ShapeGeometry,
  IcosahedronGeometry, DodecahedronGeometry, OctahedronGeometry, TetrahedronGeometry,
  Shape, CatmullRomCurve3, LineCurve3, CurvePath, MathUtils,
  Object3D, Group, Scene, Mesh, Line, Points, Raycaster,
  MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial, MeshLambertMaterial,
  MeshPhongMaterial, LineBasicMaterial, PointsMaterial,
  DoubleSide, FrontSide, BackSide, AdditiveBlending, NormalBlending,
  RepeatWrapping, ClampToEdgeWrapping, MirroredRepeatWrapping,
  sRGBEncoding, ACESFilmicToneMapping,
};
