// ═══════════════════════════════════════════════════════════════
// topview.js — 视图②扫角几何：俯视平面里的视线扫角 + 实时 ω(t) 曲线
// 纯 Canvas 2D。三个目标 d = 10 / 60 / 200 m，同样的 ω = v·d/(d²+x²)。
// ═══════════════════════════════════════════════════════════════
import { omegaExact, omegaPeak, toDegPerS, KMH_TO_MS } from './parallax.js';

const OBJ = [
  { name: '树', d: 10, x0: -60, color: '#e8b84b' },
  { name: '房', d: 60, x0: 40, color: '#7dd3fc' },
  { name: '远树', d: 200, x0: 130, color: '#6ee7b7' },
];
const P = 300;          // 循环周期 m
const WINDOW = 300;     // 俯视图可视半宽 m（对称 ±150）
const CHART_T = 12;     // 曲线窗口 s

function wrap(u) { return ((u % P) + P * 1.5) % P - P / 2; }

export function buildTopView() {
  const canvas = document.getElementById('topo');
  const ctx = canvas.getContext('2d');
  const state = { v_kmh: 72, dist: 0, paused: false, t: 0 };
  const trail = OBJ.map(() => []);   // [{t, phi}]
  const hist = OBJ.map(() => []);    // [{t, w}]
  let dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
  }
  resize();

  // ── 面板（独立容器）──
  const panel = document.createElement('div');
  panel.className = 'viewpanel'; panel.dataset.view = 'topo';
  document.getElementById('sidePanel').appendChild(panel);
  panel.innerHTML = `
    <h2>视线扫过的角度<small>俯视几何</small></h2>
    <div class="formula">ω = v·d / (d² + x²)</div>
    <p class="note">① Δt 内车前进 Δx = v·Δt；② tan Δθ ≈ Δx / d；
    ③ 小角度近似 → Δθ ≈ v·Δt/d，除以 Δt 得 <b>ω ≈ v/d</b>（x=0 齐平时的峰值）。</p>
    <p class="note">一般时刻用精确式：沿轨偏移 x 越大 ω 越小，所以曲线呈"山峰"——
    目标掠过身边时最陡。三条曲线就是三座高度不同的山。</p>
    <p class="note">上图中彩色射线是视线，浅色余迹是过去几秒的视线方向——
    <b>近的目标同一时间扫过大角</b>，这就是大脑感知到的"快"。</p>
    <p class="note">2000 m 的高山？它的曲线在①里平得几乎贴地——
    ω(2000m) = 0.01 rad/s ≈ 0.57°/s，只有大树的 1/200。</p>
  `;

  // ── 控制 ──
  const bar = document.createElement('div');
  bar.className = 'viewbar'; bar.dataset.view = 'topo';
  document.getElementById('bottomBar').appendChild(bar);
  bar.innerHTML = `
    <div class="ctl"><label>车速 v</label>
      <input type="range" id="tV" min="10" max="120" step="2" value="72">
      <output id="tVOut">72 km/h = 20.0 m/s</output></div>
    <button class="btn" id="tPause">⏸ 暂停</button>
    <button class="btn" id="tReset">↺ 复位</button>
  `;
  const vS = bar.querySelector('#tV'), vOut = bar.querySelector('#tVOut');
  vS.addEventListener('input', () => {
    state.v_kmh = +vS.value;
    vOut.textContent = `${state.v_kmh} km/h = ${(state.v_kmh * KMH_TO_MS).toFixed(1)} m/s`;
  });
  bar.querySelector('#tPause').addEventListener('click', e => {
    state.paused = !state.paused;
    e.target.textContent = state.paused ? '▶ 继续' : '⏸ 暂停';
    e.target.classList.toggle('on', state.paused);
  });
  bar.querySelector('#tReset').addEventListener('click', () => {
    state.dist = 0; state.t = 0;
    trail.forEach(a => a.length = 0); hist.forEach(a => a.length = 0);
  });

  function update(dt) {
    if (!state.paused) {
      state.t += dt;
      state.dist += state.v_kmh * KMH_TO_MS * dt;
    }
    OBJ.forEach((o, i) => {
      const x = wrap(o.x0 - state.dist);
      const phi = Math.atan2(o.d, x);                    // 相对 +x 前向的视线角
      if (!state.paused) {
        trail[i].push({ t: state.t, phi });
        while (trail[i].length && state.t - trail[i][0].t > 3) trail[i].shift();
        hist[i].push({ t: state.t, w: toDegPerS(omegaExact(state.v_kmh * KMH_TO_MS, o.d, x)) });
        while (hist[i].length && state.t - hist[i][0].t > CHART_T) hist[i].shift();
      }
      o.x = x; o.phi = phi;
      o.omega = toDegPerS(omegaExact(state.v_kmh * KMH_TO_MS, o.d, x));
    });
  }

  function draw() {
    const W = canvas.width, H = canvas.height;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = W / dpr, h = H / dpr;
    ctx.fillStyle = '#070b16'; ctx.fillRect(0, 0, w, h);

    const topH = h * 0.56, gap = 8;
    const pad = 60;
    drawTop(w, topH - gap, pad);
    drawChart(0, topH + gap + 44, w, h - topH - gap - 54, pad);
  }

  function xToPx(x, w, pad) { return pad + (x + WINDOW) / (2 * WINDOW) * (w - 2 * pad); }
  function dToPy(d, topH) {
    const lo = 108, hi = topH - 48;   // y0=58 面板内可用范围
    return hi - Math.min(d, 260) / 260 * (hi - lo);
  }

  function drawTop(w, topH, pad) {
    ctx.save();
    const y0 = 58;                 // 顶栏之下
    // 面板背景
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    roundRect(ctx, pad * 0.4, y0, w - pad * 0.8, topH - y0 - 4, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#97a3b8'; ctx.font = '13px sans-serif';
    ctx.fillText('俯视图 · 车固定在原点，世界向后流', pad * 0.4 + 16, y0 + 22);

    const roadY = topH - 34;
    // 道路
    ctx.fillStyle = '#2c303a';
    ctx.fillRect(pad * 0.4, roadY, w - pad * 0.8, 14);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    for (let x = -WINDOW; x < WINDOW; x += 24) {
      const xx = xToPx(wrap(x - (state.dist % 24)), w, pad);
      ctx.fillRect(xx, roadY + 6, 10, 2);
    }

    const carPx = xToPx(0, w, pad);
    // 视线 + 余迹
    OBJ.forEach((o, i) => {
      const oPx = xToPx(o.x, w, pad), oPy = dToPy(o.d, topH);
      // 余迹
      for (let k = 0; k < trail[i].length; k += 2) {
        const s = trail[i][k];
        const age = (state.t - s.t) / 3;
        ctx.strokeStyle = o.color; ctx.globalAlpha = 0.28 * (1 - age);
        ctx.beginPath(); ctx.moveTo(carPx, roadY);
        ctx.lineTo(carPx + Math.cos(s.phi) * 900, roadY - Math.sin(s.phi) * 900);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // 当前视线
      ctx.strokeStyle = o.color; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(carPx, roadY);
      ctx.lineTo(carPx + Math.cos(o.phi) * 900, roadY - Math.sin(o.phi) * 900);
      ctx.stroke(); ctx.lineWidth = 1;
      // 目标
      ctx.fillStyle = o.color;
      ctx.beginPath(); ctx.arc(oPx, oPy, 7, 0, 6.29); ctx.fill();
      ctx.fillStyle = '#0a0e1a'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(o.name, oPx, oPy + 3.5);
      ctx.fillStyle = o.color; ctx.font = '12px sans-serif';
      ctx.fillText(`d=${o.d}m  ω=${fmt(o.omega)}°/s`, oPx, oPy - 13);
      ctx.textAlign = 'left';
    });

    // 树的 Δθ 括弧（过去 1.2 s）
    const tr = trail[0];
    const old = tr.find(s => state.t - s.t <= 1.2);
    if (old && tr.length) {
      const nowPhi = tr[tr.length - 1].phi;
      ctx.strokeStyle = 'rgba(232,184,75,0.85)'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(carPx, roadY, 54, -nowPhi, -old.phi, old.phi > nowPhi);
      ctx.stroke(); ctx.lineWidth = 1;
      const mid = (-nowPhi - old.phi) / 2;
      const dDeg = Math.abs(nowPhi - old.phi) * 180 / Math.PI;
      ctx.fillStyle = '#ffe9ae'; ctx.font = '12px sans-serif';
      ctx.fillText(`Δθ(1.2s)=${dDeg.toFixed(1)}°`,
        carPx + Math.cos(mid) * 72 - 30, roadY - Math.sin(mid) * 72);
    }

    // 小车
    ctx.fillStyle = '#e8b84b';
    ctx.beginPath(); ctx.arc(carPx, roadY, 6, 0, 6.29); ctx.fill();
    ctx.strokeStyle = '#e8b84b';
    ctx.beginPath(); ctx.moveTo(carPx, roadY); ctx.lineTo(carPx + 26, roadY); ctx.stroke();
    ctx.fillStyle = '#97a3b8'; ctx.font = '12px sans-serif';
    ctx.fillText(`v = ${state.v_kmh} km/h`, carPx + 10, roadY + 30);
    // 距离轴
    [10, 60, 200].forEach(dd => {
      const py = dToPy(dd, topH);
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.beginPath(); ctx.moveTo(pad * 0.4, py); ctx.lineTo(w - pad * 0.4, py); ctx.stroke();
      ctx.fillStyle = 'rgba(151,163,184,0.8)'; ctx.font = '11px sans-serif';
      ctx.fillText(dd + ' m', pad * 0.4 + 4, py - 3);
    });
    ctx.restore();
  }

  function drawChart(_x, y0, w, hChart, pad) {
    if (hChart < 60) return;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    roundRect(ctx, pad * 0.4, y0, w - pad * 0.8, hChart, 12); ctx.fill(); ctx.stroke();

    const v_ms = state.v_kmh * KMH_TO_MS;
    const maxW = toDegPerS(omegaPeak(v_ms, 10)) * 1.12;
    const px0 = pad + 8, px1 = w - pad - 8, py0 = y0 + 14, py1 = y0 + hChart - 26;
    const t1 = state.t, t0 = t1 - CHART_T;
    const tToPx = t => px0 + (t - t0) / CHART_T * (px1 - px0);
    const wToPy = wv => py1 - Math.min(wv, maxW) / maxW * (py1 - py0);

    ctx.fillStyle = '#97a3b8'; ctx.font = '13px sans-serif';
    ctx.fillText('感知角速度 ω(t) —— 每个目标掠过身边时出现"山峰"（齐平 = v/d）', px0, y0 + 24);
    // 网格
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath(); ctx.moveTo(px0, py1); ctx.lineTo(px1, py1); ctx.stroke();

    OBJ.forEach((o, i) => {
      const a = hist[i]; if (a.length < 2) return;
      ctx.strokeStyle = o.color; ctx.lineWidth = 2;
      ctx.beginPath();
      a.forEach((p, k) => { const X = tToPx(p.t), Y = wToPy(p.w); k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      ctx.stroke(); ctx.lineWidth = 1;
      const last = a[a.length - 1];
      ctx.fillStyle = o.color;
      ctx.beginPath(); ctx.arc(tToPx(last.t), wToPy(last.w), 3.5, 0, 6.29); ctx.fill();
      ctx.font = '12px sans-serif';
      ctx.fillText(`${o.name} ${fmt(last.w)}`, Math.min(last.t === t1 ? px1 - 88 : tToPx(last.t) + 6, px1 - 88), wToPy(last.w) - 6);
    });

    // 峰值参考线（树的 v/d）
    const pk = wToPy(toDegPerS(omegaPeak(v_ms, 10)));
    ctx.strokeStyle = 'rgba(232,184,75,0.4)'; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(px0, pk); ctx.lineTo(px1, pk); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(232,184,75,0.75)';
    ctx.fillText('树的峰值 ω = v/d', px0 + 6, pk - 5);
    ctx.restore();
  }

  function fmt(v) {
    return v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v >= 0.1 ? v.toFixed(2) : v.toExponential(1);
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function onResize() { resize(); }
  function getInfo() {
    return { view: 'topo', v_kmh: state.v_kmh, dist: state.dist, paused: state.paused };
  }

  return { update, draw, onResize, getInfo, state };
}
