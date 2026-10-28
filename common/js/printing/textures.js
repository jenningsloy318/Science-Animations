// common/js/printing/textures.js — 程序化纹理合成器（spec 10 v3.0 D9/§6.1/§5.1）
// 木纹 / 金属拉丝 / 纸纤维 / 石灰石 / 字模贴图：canvas 噪声合成，≤512²，零图片文件，全家族缓存单例。
// studioEquirect(THREE) 产出等距柱状影棚图（CanvasTexture），供 PMREMGenerator 环境反射。
'use strict';

const cache = new Map(); // key → HTMLCanvasElement

function hash(i, j, seed) {
  let h = (i * 374761393 + j * 668265263 + seed * 1442695041) | 0;
  h = (h ^ (h >> 13)) * 1274126177 | 0;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

function valueNoise(x, y, seed) {
  const i = Math.floor(x), j = Math.floor(y);
  const fx = x - i, fy = y - j;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(i, j, seed), b = hash(i + 1, j, seed);
  const c = hash(i, j + 1, seed), d = hash(i + 1, j + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function fbm(x, y, seed, oct = 4) {
  let v = 0, amp = 0.5, f = 1;
  for (let o = 0; o < oct; o++) {
    v += amp * valueNoise(x * f, y * f, seed + o * 17);
    amp *= 0.5;
    f *= 2;
  }
  return v;
}

function makeCanvas(key, w, h, draw) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  cache.set(key, c);
  return c;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** 木纹：纵向条纹 + fbm 扰动 */
export function woodCanvas(base = '#9c6b3f', seed = 7, w = 512, h = 512) {
  const key = `wood|${base}|${seed}|${w}x${h}`;
  return makeCanvas(key, w, h, (g) => {
    const [r, gc, b] = hexToRgb(base);
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ring = Math.sin((x * 0.045 + fbm(x / 90, y / 240, seed, 4) * 7) * Math.PI * 2);
        const grain = fbm(x / 12, y / 3, seed + 3, 3) * 0.16;
        const k = 1 + ring * 0.16 + grain - 0.08;
        const i = (y * w + x) * 4;
        img.data[i] = Math.min(255, r * k);
        img.data[i + 1] = Math.min(255, gc * k);
        img.data[i + 2] = Math.min(255, b * k);
        img.data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  });
}

/** 金属拉丝：横向细条纹 + 低频明暗 */
export function metalCanvas(base = '#5b6770', seed = 11, w = 512, h = 512) {
  const key = `metal|${base}|${seed}|${w}x${h}`;
  return makeCanvas(key, w, h, (g) => {
    const [r, gc, b] = hexToRgb(base);
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const streak = fbm(x / 160, y / 1.6, seed, 2) * 0.5;
        const rough = fbm(x / 4, y / 2, seed + 5, 2) * 0.2;
        const k = 0.86 + streak * 0.28 + rough;
        const i = (y * w + x) * 4;
        img.data[i] = Math.min(255, r * k);
        img.data[i + 1] = Math.min(255, gc * k);
        img.data[i + 2] = Math.min(255, b * k);
        img.data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  });
}

/** 纸纤维：米白底 + 细纤维噪声 */
export function paperCanvas(base = '#fffdf7', seed = 23, w = 256, h = 256) {
  const key = `paper|${base}|${seed}|${w}x${h}`;
  return makeCanvas(key, w, h, (g) => {
    const [r, gc, b] = hexToRgb(base);
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const fiber = fbm(x / 5, y / 40, seed, 3) * 0.06 + fbm(x / 40, y / 5, seed + 9, 2) * 0.04;
        const k = 0.96 + fiber;
        const i = (y * w + x) * 4;
        img.data[i] = Math.min(255, r * k);
        img.data[i + 1] = Math.min(255, gc * k);
        img.data[i + 2] = Math.min(255, b * k);
        img.data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  });
}

/** 微孔石板 / 陶土颗粒纹理 */
export function stoneCanvas(base = '#9ea7b4', seed = 41, w = 256, h = 256) {
  const key = `stone|${base}|${seed}|${w}x${h}`;
  return makeCanvas(key, w, h, (g) => {
    const [r, gc, b] = hexToRgb(base);
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const pore = fbm(x / 8, y / 8, seed, 3) * 0.18 + fbm(x / 2, y / 2, seed + 7, 2) * 0.08;
        const k = 0.88 + pore;
        const i = (y * w + x) * 4;
        img.data[i] = Math.min(255, r * k);
        img.data[i + 1] = Math.min(255, gc * k);
        img.data[i + 2] = Math.min(255, b * k);
        img.data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  });
}

/**
 * 3D 字模/版面顶面贴图生成器（支持正字/镜像反字、凸版/凹版、边框与色彩）
 */
export function glyphCanvas(text, opts = {}) {
  const {
    bg = '#b8824c',
    fg = '#1a1613',
    border = 'rgba(255,240,210,0.45)',
    mirror = false,
    w = 256,
    h = 256,
    font = "700 138px 'Noto Serif SC', 'Noto Sans SC', serif",
  } = opts;
  const key = `glyph|${text}|${bg}|${fg}|${border}|${mirror}|${w}x${h}|${font}`;
  return makeCanvas(key, w, h, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    if (border) {
      g.strokeStyle = border;
      g.lineWidth = Math.max(4, w * 0.03);
      g.strokeRect(g.lineWidth, g.lineWidth, w - g.lineWidth * 2, h - g.lineWidth * 2);
    }
    g.save();
    g.translate(w / 2, h / 2);
    if (mirror) g.scale(-1, 1);
    g.fillStyle = fg;
    g.font = font;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, 0, h * 0.03);
    g.restore();
  });
}

/** 包一层 THREE.CanvasTexture（RepeatWrapping）；THREE 由调用方传入，保持本模块零依赖 */
export function toTexture(THREE, canvas, repeatX = 1, repeatY = 1) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  return t;
}

/**
 * 程序化影棚等距柱状图（经纬度全景）：上柔光带 + 两侧竖灯 + 暗地面。
 * 返回 THREE.CanvasTexture，供 PMREMGenerator.fromEquirectangular 使用（零 HDR 文件）。
 */
export function studioEquirect(THREE, seed = 31, w = 1024, h = 512) {
  const key = `env|${seed}|${w}x${h}`;
  const c = makeCanvas(key, w, h, (g) => {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#cfd8e3');
    sky.addColorStop(0.5, '#8f9bb0');
    sky.addColorStop(0.72, '#3a4351');
    sky.addColorStop(1, '#181d26');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    // 顶部柔光带（主光）
    g.fillStyle = 'rgba(255,250,240,0.95)';
    g.fillRect(w * 0.18, h * 0.10, w * 0.26, h * 0.06);
    g.fillStyle = 'rgba(220,232,255,0.7)';
    g.fillRect(w * 0.62, h * 0.16, w * 0.12, h * 0.05);
    // 两侧竖灯（补光/轮廓光）
    g.fillStyle = 'rgba(255,240,220,0.55)';
    g.fillRect(w * 0.05, h * 0.2, w * 0.03, h * 0.4);
    g.fillStyle = 'rgba(200,220,255,0.45)';
    g.fillRect(w * 0.88, h * 0.24, w * 0.03, h * 0.36);
    // 地面回光
    g.fillStyle = 'rgba(140,150,170,0.35)';
    g.fillRect(0, h * 0.86, w, h * 0.14);
  });
  const t = new THREE.CanvasTexture(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  return t;
}

/** 测试辅助：缓存键清单 */
export function cacheKeys() { return [...cache.keys()]; }
