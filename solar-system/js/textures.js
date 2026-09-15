/**
 * textures.js — Procedural Canvas Texture Generators for Solar System Celestial Bodies
 * Generates all planetary, lunar, ring, and cosmic starfield textures at runtime.
 */

import * as THREE from 'three';

// Cache generated textures to avoid redundant allocations
const textureCache = new Map();

/**
 * Creates or retrieves a cached CanvasTexture
 * @param {string} key
 * @param {number} width
 * @param {number} height
 * @param {(ctx: CanvasRenderingContext2D, width: number, height: number) => void} drawFn
 * @returns {THREE.CanvasTexture}
 */
function getOrCreateTexture(key, width, height, drawFn) {
  if (textureCache.has(key)) {
    return textureCache.get(key);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(key, texture);
  return texture;
}

// =========================================================================
// 1. THE SUN (太阳)
// =========================================================================
export function createSunTexture() {
  return getOrCreateTexture('sun', 1024, 512, (ctx, w, h) => {
    // Glowing incandescent golden-orange background
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#f97316');
    grad.addColorStop(0.3, '#f59e0b');
    grad.addColorStop(0.5, '#fef08a');
    grad.addColorStop(0.7, '#f59e0b');
    grad.addColorStop(1, '#ea580c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Turbulent solar convective granules & bright flares
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const noise1 = Math.sin(x * 0.05) * Math.cos(y * 0.05);
        const noise2 = Math.sin(x * 0.12 + y * 0.08) * 0.5;
        const n = (noise1 + noise2 + Math.random() * 0.35) * 35;

        data[idx] = Math.min(255, Math.max(200, data[idx] + n));
        data[idx + 1] = Math.min(255, Math.max(120, data[idx + 1] + n * 0.9));
        data[idx + 2] = Math.min(255, Math.max(0, data[idx + 2] + n * 0.5));
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Sunspots (黑子群)
    ctx.fillStyle = '#7c2d12';
    for (let s = 0; s < 12; s++) {
      const cx = (s * 93 + 45) % w;
      const cy = h * 0.35 + Math.sin(s) * (h * 0.25);
      const r = 4 + Math.random() * 10;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

// =========================================================================
// 2. MERCURY (水星)
// =========================================================================
export function createMercuryTexture() {
  return getOrCreateTexture('mercury', 512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#78716c'; // Stone grey
    ctx.fillRect(0, 0, w, h);

    // Varied regolith terrain
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(68,64,60,0.35)' : 'rgba(168,162,158,0.25)';
      ctx.beginPath();
      ctx.arc(Math.random() * w, Math.random() * h, 15 + Math.random() * 45, 0, Math.PI * 2);
      ctx.fill();
    }

    // Impact craters with rims & rays
    for (let c = 0; c < 120; c++) {
      const cx = Math.random() * w;
      const cy = Math.random() * h;
      const r = 2 + Math.random() * 12;
      ctx.fillStyle = '#44403c';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d6d3d1';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  });
}

// =========================================================================
// 3. VENUS (金星)
// =========================================================================
export function createVenusTexture() {
  return getOrCreateTexture('venus', 512, 256, (ctx, w, h) => {
    // Dense pale amber and creamy sulfuric acid clouds
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#eab308');
    grad.addColorStop(0.2, '#fef08a');
    grad.addColorStop(0.5, '#fde047');
    grad.addColorStop(0.8, '#f59e0b');
    grad.addColorStop(1, '#ca8a04');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Swirling chevron jet streams
    ctx.strokeStyle = 'rgba(180, 83, 9, 0.25)';
    ctx.lineWidth = 6;
    for (let y = 20; y < h; y += 18) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x < w; x += 32) {
        ctx.quadraticCurveTo(x + 16, y + Math.sin(x * 0.05) * 8, x + 32, y);
      }
      ctx.stroke();
    }
  });
}

// =========================================================================
// 4. EARTH (地球)
// =========================================================================
export function createEarthTexture() {
  return getOrCreateTexture('earth', 1024, 512, (ctx, w, h) => {
    // Deep Pacific/Atlantic Ocean blue
    ctx.fillStyle = '#0369a1';
    ctx.fillRect(0, 0, w, h);

    // Continental landmasses
    ctx.fillStyle = '#15803d'; // Green vegetation
    const continents = [
      // Eurasia & Africa
      { x: w * 0.52, y: h * 0.36, rx: w * 0.24, ry: h * 0.22 },
      { x: w * 0.50, y: h * 0.62, rx: w * 0.12, ry: h * 0.20 },
      // Americas
      { x: w * 0.24, y: h * 0.32, rx: w * 0.14, ry: h * 0.18 },
      { x: w * 0.28, y: h * 0.66, rx: w * 0.10, ry: h * 0.22 },
      // Australia
      { x: w * 0.82, y: h * 0.72, rx: w * 0.08, ry: h * 0.10 }
    ];

    continents.forEach(c => {
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // Desert & arid mountain interiors (Sahara, Gobi, Australian Outback)
    ctx.fillStyle = '#ca8a04';
    ctx.beginPath();
    ctx.ellipse(w * 0.50, h * 0.45, w * 0.10, h * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();

    // Polar ice caps (Arctic & Antarctic)
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, w, h * 0.10);
    ctx.fillRect(0, h * 0.90, w, h * 0.10);

    // Soft atmospheric white cloud spirals
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    for (let i = 0; i < 28; i++) {
      const cx = (i * 73 + 50) % w;
      const cy = h * 0.15 + (i * 29) % (h * 0.7);
      ctx.beginPath();
      ctx.ellipse(cx, cy, 40 + Math.random() * 50, 12 + Math.random() * 14, Math.random() * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

// =========================================================================
// 5. THE MOON (月球)
// =========================================================================
export function createMoonTexture() {
  return getOrCreateTexture('moon', 512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#a8a29e'; // Grey highland crust
    ctx.fillRect(0, 0, w, h);

    // Dark Basaltic Maria (月海)
    ctx.fillStyle = '#57534e';
    const maria = [
      { x: w * 0.35, y: h * 0.38, r: 42 }, // Oceanus Procellarum
      { x: w * 0.48, y: h * 0.35, r: 32 }, // Mare Imbrium
      { x: w * 0.62, y: h * 0.42, r: 28 }, // Mare Serenitatis
      { x: w * 0.68, y: h * 0.48, r: 24 }, // Mare Tranquillitatis
    ];
    maria.forEach(m => {
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Bright crater rays (Tycho, Copernicus)
    ctx.strokeStyle = 'rgba(245, 245, 244, 0.5)';
    ctx.lineWidth = 1;
    const tychoX = w * 0.44;
    const tychoY = h * 0.72;
    for (let a = 0; a < 16; a++) {
      const ang = (a * Math.PI * 2) / 16;
      ctx.beginPath();
      ctx.moveTo(tychoX, tychoY);
      ctx.lineTo(tychoX + Math.cos(ang) * 90, tychoY + Math.sin(ang) * 90);
      ctx.stroke();
    }
  });
}

// =========================================================================
// 6. MARS (火星)
// =========================================================================
export function createMarsTexture() {
  return getOrCreateTexture('mars', 512, 256, (ctx, w, h) => {
    // Rusty reddish-ochre iron oxide base
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(0, 0, w, h);

    // Darker basaltic volcanic lowlands (Syrtis Major, Acidalia Planitia)
    ctx.fillStyle = '#7c2d12';
    ctx.beginPath();
    ctx.ellipse(w * 0.65, h * 0.45, w * 0.12, h * 0.18, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(w * 0.25, h * 0.40, w * 0.18, h * 0.12, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Valles Marineris canyon rift
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.35, h * 0.55);
    ctx.lineTo(w * 0.58, h * 0.58);
    ctx.stroke();

    // Polar ice caps (Planum Boreale & Australe)
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(w * 0.5, 0, w * 0.12, 0, Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(w * 0.5, h, w * 0.08, Math.PI, 0);
    ctx.fill();
  });
}

// =========================================================================
// 7. JUPITER (木星)
// =========================================================================
export function createJupiterTexture() {
  return getOrCreateTexture('jupiter', 1024, 512, (ctx, w, h) => {
    // Alternating warm white, beige, amber, and terracotta belts
    const beltColors = [
      '#78350f', '#d97706', '#fef3c7', '#b45309',
      '#d97706', '#fef08a', '#92400e', '#fef3c7',
      '#b45309', '#78350f', '#fde68a', '#92400e'
    ];
    const bandHeight = h / beltColors.length;

    beltColors.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.fillRect(0, i * bandHeight, w, bandHeight);
    });

    // Atmospheric turbulence & eddy swirls
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 4;
    for (let y = 15; y < h; y += 22) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x < w; x += 40) {
        ctx.quadraticCurveTo(x + 20, y + (Math.sin(x * 0.03) * 12), x + 40, y);
      }
      ctx.stroke();
    }

    // The Great Red Spot (大红斑)
    const grsX = w * 0.62;
    const grsY = h * 0.66;
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.ellipse(grsX, grsY, 52, 32, 0, 0, Math.PI * 2);
    ctx.fill();

    // GRS white storm ring border
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 3;
    ctx.stroke();
  });
}

// =========================================================================
// 8. SATURN (土星) & RINGS (土星环)
// =========================================================================
export function createSaturnTexture() {
  return getOrCreateTexture('saturn', 512, 256, (ctx, w, h) => {
    // Elegant golden-tan subtle bands
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#78350f');
    grad.addColorStop(0.2, '#fde68a');
    grad.addColorStop(0.4, '#f59e0b');
    grad.addColorStop(0.6, '#fef3c7');
    grad.addColorStop(0.8, '#d97706');
    grad.addColorStop(1, '#78350f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  });
}

export function createSaturnRingsTexture() {
  return getOrCreateTexture('saturn_rings', 512, 64, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);

    // Horizontal cross-section of ring opacity and tone
    // C-ring (faint inner) -> B-ring (dense bright) -> Cassini Division (gap) -> A-ring (outer)
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0.00, 'rgba(0,0,0,0)');
    grad.addColorStop(0.08, 'rgba(180, 150, 100, 0.25)'); // C Ring
    grad.addColorStop(0.22, 'rgba(230, 200, 140, 0.85)'); // B Ring inner
    grad.addColorStop(0.55, 'rgba(255, 235, 180, 0.95)'); // B Ring outer
    grad.addColorStop(0.58, 'rgba(0,0,0,0)');              // Cassini Division gap!
    grad.addColorStop(0.64, 'rgba(0,0,0,0)');              // Gap width
    grad.addColorStop(0.68, 'rgba(215, 185, 130, 0.75)'); // A Ring
    grad.addColorStop(0.88, 'rgba(190, 160, 110, 0.65)'); // A Ring outer
    grad.addColorStop(0.92, 'rgba(0,0,0,0)');              // Encke gap
    grad.addColorStop(0.96, 'rgba(160, 135, 95, 0.35)');  // F Ring
    grad.addColorStop(1.00, 'rgba(0,0,0,0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  });
}

// =========================================================================
// 9. URANUS (天王星) & NEPTUNE (海王星)
// =========================================================================
export function createUranusTexture() {
  return getOrCreateTexture('uranus', 512, 256, (ctx, w, h) => {
    // Pale cyan-aquamarine serene gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#06b6d4');
    grad.addColorStop(0.3, '#22d3ee');
    grad.addColorStop(0.5, '#67e8f9');
    grad.addColorStop(0.8, '#22d3ee');
    grad.addColorStop(1, '#0891b2');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  });
}

export function createNeptuneTexture() {
  return getOrCreateTexture('neptune', 512, 256, (ctx, w, h) => {
    // Deep royal cobalt azure
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#1d4ed8');
    grad.addColorStop(0.3, '#2563eb');
    grad.addColorStop(0.5, '#3b82f6');
    grad.addColorStop(0.8, '#1d4ed8');
    grad.addColorStop(1, '#1e40af');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Great Dark Spot (大黑斑)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(w * 0.42, h * 0.48, 38, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Methane cirrus white clouds (白云带)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.35, h * 0.42);
    ctx.lineTo(w * 0.55, h * 0.44);
    ctx.stroke();
  });
}

// =========================================================================
// 10. SPECIAL MOON TEXTURES (特异卫星群)
// =========================================================================
export function createMoonTextureById(id) {
  return getOrCreateTexture(`moon_${id}`, 256, 128, (ctx, w, h) => {
    switch (id) {
      case 'io': {
        // Sulfur yellow/orange pizza world
        ctx.fillStyle = '#eab308';
        ctx.fillRect(0, 0, w, h);
        // Volcanic calderas (Loki, Pele)
        ctx.fillStyle = '#7f1d1d';
        for (let i = 0; i < 24; i++) {
          ctx.beginPath();
          ctx.arc(Math.random() * w, Math.random() * h, 3 + Math.random() * 6, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'europa': {
        // Smooth brilliant ice with reddish-brown cycloidal fractures
        ctx.fillStyle = '#f0f9ff';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#991b1b';
        ctx.lineWidth = 1.5;
        for (let l = 0; l < 18; l++) {
          ctx.beginPath();
          let x = Math.random() * w;
          let y = Math.random() * h;
          ctx.moveTo(x, y);
          ctx.bezierCurveTo(x + 40, y - 20, x + 80, y + 20, x + 120, y);
          ctx.stroke();
        }
        break;
      }
      case 'ganymede': {
        // Intermingled dark ancient polygons & light grooved terrain
        ctx.fillStyle = '#475569';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#94a3b8';
        for (let g = 0; g < 14; g++) {
          ctx.fillRect(Math.random() * w, 0, 18, h);
        }
        break;
      }
      case 'titan': {
        // Uniform golden orange hazy nitrogen shroud
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#b45309');
        grad.addColorStop(0.5, '#f59e0b');
        grad.addColorStop(1, '#92400e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        break;
      }
      case 'enceladus': {
        // Flawless snowy white with cyan tiger stripes at south pole
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;
        for (let t = 0; t < 4; t++) {
          ctx.beginPath();
          ctx.moveTo(w * 0.3 + t * 18, h * 0.85);
          ctx.lineTo(w * 0.4 + t * 18, h * 0.98);
          ctx.stroke();
        }
        break;
      }
      case 'iapetus': {
        // Yin-Yang: dark leading hemisphere, bright trailing
        ctx.fillStyle = '#18181b'; // Pitch black
        ctx.fillRect(0, 0, w * 0.5, h);
        ctx.fillStyle = '#f4f4f5'; // Snowy white
        ctx.fillRect(w * 0.5, 0, w * 0.5, h);
        break;
      }
      case 'triton': {
        // Cantaloupe melon-skin nitrogen ice
        ctx.fillStyle = '#a5f3fc';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#0891b2';
        for (let c = 0; c < 30; c++) {
          ctx.beginPath();
          ctx.arc(Math.random() * w, Math.random() * h, 4 + Math.random() * 5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      default: {
        // Default cratered rocky / icy moon surface
        ctx.fillStyle = '#71717a';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#3f3f46';
        for (let d = 0; d < 20; d++) {
          ctx.beginPath();
          ctx.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 8, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
    }
  });
}

// =========================================================================
// 11. 360° COSMIC DEEP SPACE BACKGROUND (星空天球)
// =========================================================================
export function createSpaceSkyboxTexture() {
  return getOrCreateTexture('skybox', 1024, 512, (ctx, w, h) => {
    // Void of deep cosmos
    ctx.fillStyle = '#02040a';
    ctx.fillRect(0, 0, w, h);

    // Faint ethereal Milky Way dust lane
    const mwGrad = ctx.createLinearGradient(0, 0, w, h);
    mwGrad.addColorStop(0.2, 'rgba(30, 27, 75, 0.3)');
    mwGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.15)');
    mwGrad.addColorStop(0.8, 'rgba(15, 23, 42, 0.4)');
    ctx.fillStyle = mwGrad;
    ctx.fillRect(0, 0, w, h);

    // Pinpoint stars
    for (let i = 0; i < 1600; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const brightness = Math.random();
      const r = brightness > 0.95 ? 1.4 : brightness > 0.8 ? 1.0 : 0.6;
      ctx.fillStyle = brightness > 0.9 ? '#fef08a' : brightness > 0.7 ? '#bfdbfe' : '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}
