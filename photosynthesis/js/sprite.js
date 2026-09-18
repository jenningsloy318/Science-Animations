// sprite.js — 3D 画布文字标签（各视图共用）
import * as THREE from 'three';

export function makeLabel(text, color = '#dbe4ee', size = 44) {
  const pad = 24;
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  g.font = `bold ${size}px "PingFang SC", sans-serif`;
  const w = Math.ceil(g.measureText(text).width) + pad * 2;
  c.width = w; c.height = size + pad * 2;
  const g2 = c.getContext('2d');
  g2.font = `bold ${size}px "PingFang SC", sans-serif`;
  g2.textAlign = 'center'; g2.textBaseline = 'middle';
  g2.strokeStyle = 'rgba(6,11,18,0.9)'; g2.lineWidth = 10;
  g2.strokeText(text, c.width / 2, c.height / 2);
  g2.fillStyle = color;
  g2.fillText(text, c.width / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
  const sp = new THREE.Sprite(mat);
  sp.scale.set(c.width / 110, c.height / 110, 1);
  sp.renderOrder = 50;
  return sp;
}

export function makeSphere(r, color, opts = {}) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(r, opts.seg || 20, opts.seg ? Math.max(10, opts.seg / 2) : 12),
    new THREE.MeshStandardMaterial({
      color, roughness: opts.rough ?? 0.45, metalness: opts.metal ?? 0.1,
      emissive: opts.emissive ?? color, emissiveIntensity: opts.ei ?? 0.25,
      transparent: !!opts.opacity, opacity: opts.opacity ?? 1,
    }),
  );
}

export function makeGlowDot(r, color) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(r, 14, 10),
    new THREE.MeshBasicMaterial({ color }),
  );
}
