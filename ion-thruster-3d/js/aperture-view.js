/**
 * js/aperture-view.js — Microscopic Single-Aperture Ion Optics & Sheath Meniscus Visualizer
 * Simulates Pierce-geometry electrostatic extraction across screen, accelerator, and decelerator grids.
 */

import { calculateApertureOptics } from './physics.js';
import { playClickSound } from './audio.js';

let modalEl = null;
let canvasEl = null;
let ctx2d = null;
let isOpen = false;
let animFrameId = null;

// Aperture simulation state
let currentScreenV = 1500;
let currentAccelV = -300;
let currentDensityNorm = 1.0;
let isThreeGrid = true;
let simT = 0;

// Aperture particles (ions flowing through single hole)
const apertureIons = [];
for (let i = 0; i < 48; i++) {
  apertureIons.push({
    x: Math.random() * 0.35,
    y: (Math.random() - 0.5) * 1.6,
    vx: 0.8 + Math.random() * 0.4,
    vy: (Math.random() - 0.5) * 0.2,
    life: Math.random() * 2.0
  });
}

export function initApertureView() {
  modalEl = document.getElementById('apertureModal');
  if (!modalEl) return;
  canvasEl = document.getElementById('apertureCanvas');
  if (!canvasEl) return;
  ctx2d = canvasEl.getContext('2d');

  // Wire close button
  const closeBtn = document.getElementById('apertureClose');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeApertureView);
  }

  // Wire sliders inside aperture modal
  const vSlider = document.getElementById('apertureVSlider');
  const nSlider = document.getElementById('apertureNSlider');
  const gridBtn = document.getElementById('apertureGridBtn');

  if (vSlider) {
    vSlider.addEventListener('input', (e) => {
      currentScreenV = parseFloat(e.target.value);
      document.getElementById('apertureVVal').textContent = `${currentScreenV} V`;
    });
  }
  if (nSlider) {
    nSlider.addEventListener('input', (e) => {
      currentDensityNorm = parseFloat(e.target.value);
      document.getElementById('apertureNVal').textContent = `${currentDensityNorm.toFixed(2)}×`;
    });
  }
  if (gridBtn) {
    gridBtn.addEventListener('click', () => {
      isThreeGrid = !isThreeGrid;
      gridBtn.textContent = isThreeGrid ? '当前：三栅极 (Screen + Accel + Decel)' : '当前：双栅极 (Screen + Accel)';
      gridBtn.classList.toggle('active', isThreeGrid);
      playClickSound();
    });
  }
}

export function openApertureView(screenV = 1500, accelV = -300, flow = 4) {
  if (!modalEl) initApertureView();
  if (!modalEl) return;
  isOpen = true;
  modalEl.classList.add('open');

  currentScreenV = screenV;
  currentAccelV = accelV;
  currentDensityNorm = Math.max(0.5, Math.min(2.0, flow / 4));

  const vSlider = document.getElementById('apertureVSlider');
  if (vSlider) {
    vSlider.value = currentScreenV;
    document.getElementById('apertureVVal').textContent = `${currentScreenV} V`;
  }
  const nSlider = document.getElementById('apertureNSlider');
  if (nSlider) {
    nSlider.value = currentDensityNorm;
    document.getElementById('apertureNVal').textContent = `${currentDensityNorm.toFixed(2)}×`;
  }

  resizeCanvas();
  renderApertureLoop();
}

export function closeApertureView() {
  isOpen = false;
  if (modalEl) modalEl.classList.remove('open');
  if (animFrameId) cancelAnimationFrame(animFrameId);
}

function resizeCanvas() {
  if (!canvasEl) return;
  const rect = canvasEl.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvasEl.width = rect.width * dpr;
  canvasEl.height = rect.height * dpr;
}

function renderApertureLoop() {
  if (!isOpen) return;
  renderApertureFrame(0.016);
  animFrameId = requestAnimationFrame(renderApertureLoop);
}

function renderApertureFrame(dt) {
  if (!ctx2d || !canvasEl) return;
  simT += dt;

  const w = canvasEl.width;
  const h = canvasEl.height;
  const cx = w * 0.5;
  const cy = h * 0.5;

  ctx2d.clearRect(0, 0, w, h);

  // Background
  const bgGrad = ctx2d.createLinearGradient(0, 0, w, 0);
  bgGrad.addColorStop(0, '#040714');
  bgGrad.addColorStop(0.35, '#070b1e');
  bgGrad.addColorStop(1, '#02040a');
  ctx2d.fillStyle = bgGrad;
  ctx2d.fillRect(0, 0, w, h);

  // Calculate optics
  const optics = calculateApertureOptics(currentScreenV, currentAccelV, currentDensityNorm);

  // Update telemetry text
  const regimeEl = document.getElementById('apertureRegimeTag');
  const descEl = document.getElementById('apertureDescText');
  const marginEl = document.getElementById('apertureMarginVal');
  const pervEl = document.getElementById('aperturePervVal');

  if (regimeEl) {
    regimeEl.textContent = optics.regime === 'OPTIMAL' ? '✅ 最佳匹配 (Optimal)' :
      (optics.regime === 'UNDER_FOCUSED' ? '⚠️ 欠聚焦 (Under-focused / Impingement)' : '⚡ 过聚焦 (Over-focused)');
    regimeEl.className = 'regime-tag ' + optics.regime.toLowerCase();
  }
  if (descEl) descEl.textContent = optics.descZh;
  if (marginEl) marginEl.textContent = `${optics.safeMarginPct.toFixed(1)}%`;
  if (pervEl) pervEl.textContent = `${optics.perveanceRatio.toFixed(2)}`;

  // Physical grid layout coordinates in pixel space
  const scale = Math.min(w / 7.5, h / 3.8);

  // X locations of grids:
  // Screen grid: x = cx - 1.2 * scale
  // Accel grid:  x = cx + 0.8 * scale (gap ~ 2.0 mm)
  // Decel grid:  x = cx + 2.0 * scale (gap ~ 1.2 mm)
  const xScreen = cx - 1.2 * scale;
  const xAccel  = cx + 0.8 * scale;
  const xDecel  = cx + 2.0 * scale;

  const screenThick = 0.35 * scale;
  const accelThick  = 0.45 * scale;
  const decelThick  = 0.35 * scale;

  // Aperture radii (semi-heights in 2D cross-section)
  const rScreenAperture = 0.95 * scale;
  const rAccelAperture  = 0.57 * scale;
  const rDecelAperture  = 0.75 * scale;

  // 1. Draw Equipotential Contour Lines between Screen and Accel
  drawEquipotentials(ctx2d, xScreen, xAccel, xDecel, cy, rScreenAperture, rAccelAperture, optics, isThreeGrid, scale);

  // 2. Draw Plasma Region (Left)
  const plasmaGrad = ctx2d.createRadialGradient(xScreen - 1.5 * scale, cy, 10, xScreen, cy, h * 0.7);
  plasmaGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
  plasmaGrad.addColorStop(0.7, 'rgba(30, 64, 175, 0.25)');
  plasmaGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx2d.fillStyle = plasmaGrad;
  ctx2d.fillRect(0, 0, xScreen + 0.1 * scale, h);

  // 3. Draw Plasma Sheath (Meniscus)
  // Curvature: concave inward if optimal/overfocused, bulging if underfocused
  const meniscusBulge = (optics.perveanceRatio - 1.0) * 0.35 * scale;
  const meniscusControlX = xScreen - 0.2 * scale + meniscusBulge;

  ctx2d.beginPath();
  ctx2d.moveTo(xScreen, cy - rScreenAperture);
  ctx2d.quadraticCurveTo(meniscusControlX, cy, xScreen, cy + rScreenAperture);
  ctx2d.strokeStyle = '#38bdf8';
  ctx2d.lineWidth = 3;
  ctx2d.shadowColor = '#38bdf8';
  ctx2d.shadowBlur = 12;
  ctx2d.stroke();
  ctx2d.shadowBlur = 0;

  // Sheath glow fill
  ctx2d.lineTo(xScreen - 0.4 * scale, cy + rScreenAperture);
  ctx2d.lineTo(xScreen - 0.4 * scale, cy - rScreenAperture);
  ctx2d.closePath();
  ctx2d.fillStyle = 'rgba(56, 189, 248, 0.18)';
  ctx2d.fill();

  // Label Meniscus
  ctx2d.fillStyle = '#7dd3fc';
  ctx2d.font = '11px sans-serif';
  ctx2d.fillText('等离子体鞘层 (Meniscus 静电凹透镜)', xScreen - 2.2 * scale, cy - rScreenAperture - 8);

  // 4. Draw Grid Plates (Cross-section upper & lower blocks)
  drawGridPlate(ctx2d, xScreen, cy, screenThick, rScreenAperture, h, '#ef4444', `屏栅极 (+${currentScreenV}V)`);
  drawGridPlate(ctx2d, xAccel, cy, accelThick, rAccelAperture, h, '#3b82f6', `加速栅 (${currentAccelV}V)`);
  if (isThreeGrid) {
    drawGridPlate(ctx2d, xDecel, cy, decelThick, rDecelAperture, h, '#10b981', '减速栅 (0V 地电位)');
  }

  // 5. Simulate & Draw Ion Beamlets flowing through aperture
  const vTotal = Math.max(300, currentScreenV - currentAccelV);
  const maxSpeed = 3.5 * Math.sqrt(vTotal / 1800);

  apertureIons.forEach((ion, idx) => {
    // Upstream drift towards sheath
    if (ion.x < 1.0) {
      ion.vx = 0.8 + 0.3 * currentDensityNorm;
      ion.x += ion.vx * dt;
    } else {
      // In gap: rapid electrostatic acceleration
      ion.vx += 4.5 * (vTotal / 1800) * dt;
      ion.x += ion.vx * dt;

      // Electrostatic focusing force from curved sheath & aperture field
      const yRel = ion.y;
      const focusStrength = 1.8 * (1.25 - optics.perveanceRatio);
      ion.vy += -yRel * focusStrength * dt * 4.0;
      ion.y += ion.vy * dt;
    }

    // Reset ion when past downstream boundary
    if (ion.x > 5.5) {
      ion.x = Math.random() * 0.3;
      ion.y = (Math.random() - 0.5) * 1.5;
      ion.vx = 0.8 + Math.random() * 0.4;
      ion.vy = (Math.random() - 0.5) * 0.15;
    }

    // Map simulation coords to pixel coords
    const px = (xScreen - 1.4 * scale) + ion.x * scale;
    const py = cy + ion.y * (scale * 0.9);

    // Color: cyan in plasma -> intense violet/blue in beamlet
    const tProgress = Math.max(0, Math.min(1, (px - xScreen) / (2.5 * scale)));
    ctx2d.beginPath();
    ctx2d.arc(px, py, 2.5 + tProgress * 1.0, 0, Math.PI * 2);
    ctx2d.fillStyle = tProgress > 0.3 ? '#c084fc' : '#38bdf8';
    ctx2d.shadowColor = ctx2d.fillStyle;
    ctx2d.shadowBlur = 6;
    ctx2d.fill();
    ctx2d.shadowBlur = 0;
  });
}

function drawGridPlate(ctx, x, cy, thick, apertureRadius, totalHeight, color, label) {
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  // Upper plate
  ctx.fillRect(x, 0, thick, cy - apertureRadius);
  ctx.strokeRect(x, 0, thick, cy - apertureRadius);

  // Lower plate
  ctx.fillRect(x, cy + apertureRadius, thick, totalHeight - (cy + apertureRadius));
  ctx.strokeRect(x, cy + apertureRadius, thick, totalHeight - (cy + apertureRadius));

  // Chamfered corner highlights
  ctx.fillStyle = color;
  ctx.fillRect(x, cy - apertureRadius, 3, 3);
  ctx.fillRect(x, cy + apertureRadius - 3, 3, 3);

  // Plate voltage label
  ctx.fillStyle = color;
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText(label, x - 10, cy - apertureRadius - 12);
}

function drawEquipotentials(ctx, xs, xa, xd, cy, rs, ra, optics, is3Grid, scale) {
  ctx.lineWidth = 1;
  const numLines = 7;
  for (let i = 1; i <= numLines; i++) {
    const t = i / (numLines + 1);
    const xBase = xs + (xa - xs) * t;
    // Lines curve concavely inside aperture
    const bulge = (1 - t) * 0.35 * scale * (optics.perveanceRatio < 1 ? -1 : 1);

    ctx.beginPath();
    ctx.moveTo(xBase, cy - rs * 1.1);
    ctx.quadraticCurveTo(xBase + bulge, cy, xBase, cy + rs * 1.1);
    ctx.strokeStyle = `rgba(148, 163, 184, ${0.12 + (1 - t) * 0.25})`;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}
