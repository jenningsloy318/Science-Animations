// ═══════════════════════════════════════════════════════════════
// topview.js — 视图②扫角几何：俯视平面里的视线扫角 + 实时 ω(t) 曲线
// 纯 Canvas 2D。只放两个目标（树 d=10 m 主角 / 山 d=200 m 对比），
// 同起点同时出发 —— 唯一的变量就是距离。
// 比例尺为真：x、y 同一 px/m，视线在屏幕上的角度就是真实视线角。
// 目标从 x=+45 m 出发：在 √(d₁·d₂)=45 m 之内"近的扫得快"恒成立，
// 避开前方远区（x ≫ √(d₁d₂)）远物角速反而略高的反直觉段。
// 同样的 ω = v·d/(d²+x²)。
// ═══════════════════════════════════════════════════════════════
import { omegaExact, omegaPeak, toDegPerS, KMH_TO_MS } from './parallax.js';

const OBJ = [
  { name: '树', d: 10, x0: 45, color: '#e8b84b', hero: true },
  { name: '山', d: 200, x0: 45, color: '#6ee7b7' },
];
const P = 300;          // 循环周期 m
const K0 = 1.5;         // px / m（x、y 共用，真实角度）
const CHART_T = 14;     // 曲线窗口 s
const TRAIL_T = 3;      // 扫角扇面回看窗口 s

function wrap(u) { return ((u % P) + P * 1.5) % P - P / 2; }

export function buildTopView() {
  const canvas = document.getElementById('topo');
  const ctx = canvas.getContext('2d');
  const state = { v_kmh: 36, dist: 0, paused: false, t: 0 };
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
    <h2>扫角几何：为什么近的快<small>俯视图 · 真实比例 · 两个目标同速出发</small></h2>
    <div class="formula">ω = v·d / (d² + x²)</div>
    <p class="note"><b>① 只盯金色的树。</b>车向前开，视线必须一直"追着"它转。
    树身后拖出的金色扇面 = 过去 3 秒视线扫过的角。<b>扇面张开得越大，感觉越快。</b></p>
    <p class="note"><b>② 同一时刻比两条视线。</b>树近（d=10 m），掠过身边时 1 秒转几十度；
    山远（d=200 m），从头到尾每秒不超过 3°——所以山看起来"永远不动"。</p>
    <p class="note"><b>③ 齐平的一刻最快。</b>目标穿过白色虚线时 ω 达到峰值 = v/d。
    车速 36 km/h（10 m/s）：树 10÷10 ≈ <b>57°/s</b>，山要除以 200，只有 <b>2.9°/s</b>——差 20 倍。</p>
    <p class="note"><b>④ 下方的曲线</b>记录每一刻的扫速：树掠过身边时拱起高高的"山峰"，
    山的峰只有一点点——这就是"近的快、远的慢"的全部秘密。</p>
  `;

  // ── 控制 ──
  const bar = document.createElement('div');
  bar.className = 'viewbar'; bar.dataset.view = 'topo';
  document.getElementById('bottomBar').appendChild(bar);
  bar.innerHTML = `
    <div class="ctl"><label>车速 v</label>
      <input type="range" id="tV" min="10" max="72" step="2" value="36">
      <output id="tVOut">36 km/h = 10.0 m/s</output></div>
    <button class="btn" id="tPause">⏸ 暂停</button>
    <button class="btn" id="tReset">↺ 重播</button>
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
        // wrap 瞬间视线角跳变（≈180°），清空余迹避免扇形横扫全屏
        const prev = trail[i][trail[i].length - 1];
        if (prev && Math.abs(phi - prev.phi) > Math.PI / 2) trail[i].length = 0;
        trail[i].push({ t: state.t, phi });
        while (trail[i].length && state.t - trail[i][0].t > TRAIL_T) trail[i].shift();
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

    const topH = h * 0.58, gap = 8;
    const pad = 60;
    drawTop(w, topH - gap, pad);
    drawChart(0, topH + gap + 44, w, h - topH - gap - 54, pad);
  }

  // 俯视图几何：真实比例。车不放在画布正中，而是避开右侧面板。
  function geo(w, topH) {
    const rect = panel.getBoundingClientRect();
    const panelW = (rect && rect.width > 40) ? rect.width : 330;
    const roadY = topH - 34;
    const carPx = Math.max(150, Math.min(w - panelW - 60 - 240, 780));
    const K = K0;                                     // px / m，x、y 共用
    return {
      roadY, carPx, K,
      xToPx: x => carPx + x * K,
      dToPy: d => roadY - d * K,
    };
  }

  // 过去 DT 秒目标 i 扫过多少度（Δθ 对比标签）
  function sweptDeg(i, DT) {
    const tr = trail[i];
    const old = tr.find(s => state.t - s.t <= DT);
    if (!old || !tr.length) return 0;
    return Math.abs(tr[tr.length - 1].phi - old.phi) * 180 / Math.PI;
  }

  function drawTop(w, topH, pad) {
    ctx.save();
    const y0 = 58;                 // 顶栏之下
    const g = geo(w, topH);
    // 面板背景
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    roundRect(ctx, pad * 0.4, y0, w - pad * 0.8, topH - y0 - 4, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#97a3b8'; ctx.font = '13px sans-serif';
    ctx.fillText('俯视图 · 真实比例 · 车固定在原点，世界向后流（两目标同速，只差远近）', pad * 0.4 + 16, y0 + 22);

    const roadY = g.roadY, carPx = g.carPx;
    // 道路
    ctx.fillStyle = '#2c303a';
    ctx.fillRect(pad * 0.4, roadY, w - pad * 0.8, 14);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    for (let x = -P / 2; x < P / 2; x += 24) {
      const xx = g.xToPx(wrap(x - (state.dist % 24)));
      if (xx > pad * 0.4 && xx < w - pad * 0.4) ctx.fillRect(xx, roadY + 6, 10, 2);
    }

    // 量角器刻度：每 15° 一根短线，30/60/90 带标签
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.fillStyle = 'rgba(151,163,184,0.55)';
    ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
    for (let a = 0; a <= 90; a += 15) {
      const rad = a * Math.PI / 180;
      const r1 = 34, r2 = a % 30 === 0 ? 46 : 41;
      ctx.beginPath();
      ctx.moveTo(carPx + Math.cos(rad) * r1, roadY - Math.sin(rad) * r1);
      ctx.lineTo(carPx + Math.cos(rad) * r2, roadY - Math.sin(rad) * r2);
      ctx.stroke();
      if (a % 30 === 0 && a > 0) {
        ctx.fillText(a + '°', carPx + Math.cos(rad) * 58, roadY - Math.sin(rad) * 58 + 3);
      }
    }
    ctx.textAlign = 'left';

    // 齐平线（x=0）：目标穿过它的一刻 ω = v/d
    ctx.strokeStyle = 'rgba(255,255,255,0.30)'; ctx.setLineDash([4, 6]);
    ctx.beginPath(); ctx.moveTo(carPx, y0 + 34); ctx.lineTo(carPx, roadY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('齐平线 —— 穿过的一刻最快 ω = v/d', carPx, y0 + 30);
    ctx.textAlign = 'left';

    // 距离参考横线（真实比例）
    [10, 100, 200].forEach(dd => {
      const py = g.dToPy(dd);
      if (py < y0 + 40) return;
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.beginPath(); ctx.moveTo(pad * 0.4, py); ctx.lineTo(w - pad * 0.4, py); ctx.stroke();
      ctx.fillStyle = 'rgba(151,163,184,0.8)'; ctx.font = '11px sans-serif';
      ctx.fillText(dd + ' m', pad * 0.4 + 4, py - 3);
    });

    // ── 目标（先画对比山，再画主角树，主角永远在上层）──
    const order = [1, 0];
    order.forEach(i => {
      const o = OBJ[i];
      const oPx = g.xToPx(o.x), oPy = g.dToPy(o.d);
      const inView = oPx > pad * 0.4 - 20 && oPx < w - pad * 0.4 + 20;

      // 主角：过去 TRAIL_T 秒扫过的扇形（填充）—— "快"本身
      if (o.hero && inView) {
        const tr = trail[i];
        if (tr.length > 2) {
          const old = tr[0], now = tr[tr.length - 1];
          // 世界角 phi 向上为正，画布角取负；接近时 now>old，沿画布逆时针才走短弧
          const ccw = now.phi > old.phi;
          ctx.save();
          ctx.beginPath();                                     // 裁剪到面板内，不溢出
          roundRect(ctx, pad * 0.4, y0, w - pad * 0.8, topH - y0 - 4, 12);
          ctx.clip();
          const grad = ctx.createRadialGradient(carPx, roadY, 6, carPx, roadY, 330);
          grad.addColorStop(0, 'rgba(232,184,75,0.30)');
          grad.addColorStop(1, 'rgba(232,184,75,0.07)');
          ctx.fillStyle = grad;
          ctx.beginPath(); ctx.moveTo(carPx, roadY);
          ctx.arc(carPx, roadY, 330, -old.phi, -now.phi, ccw);
          ctx.closePath(); ctx.fill();
          // 扇面旧边界（淡）
          ctx.strokeStyle = 'rgba(232,184,75,0.35)';
          ctx.beginPath(); ctx.moveTo(carPx, roadY);
          ctx.lineTo(carPx + Math.cos(old.phi) * 330, roadY - Math.sin(old.phi) * 330);
          ctx.stroke();
          ctx.restore();
        }
      }

      // 视线：从车画到目标为止（真实角度、真实长度），主角粗、对比细
      if (inView) {
        ctx.strokeStyle = o.color;
        ctx.lineWidth = o.hero ? 2.2 : 1.2;
        ctx.setLineDash(o.hero ? [] : [6, 5]);
        ctx.beginPath(); ctx.moveTo(carPx, roadY); ctx.lineTo(oPx, oPy);
        ctx.stroke();
        ctx.setLineDash([]); ctx.lineWidth = 1;

        // 目标本体
        ctx.fillStyle = o.color;
        ctx.beginPath(); ctx.arc(oPx, oPy, o.hero ? 8 : 6, 0, 6.29); ctx.fill();
        ctx.fillStyle = '#0a0e1a'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(o.name, oPx, oPy + 3.5);
        ctx.textAlign = 'left';
        // 标签：描边垫底保证可读；山标在点上方居中，树标在点左侧
        ctx.font = o.hero ? 'bold 12px sans-serif' : 'bold 12px sans-serif';
        const lbl = `d=${o.d}m  ω=${fmt(o.omega)}°/s`;
        const lx = o.hero ? oPx - 14 : oPx;
        const ly = o.hero ? oPy - 12 : oPy - 14;
        ctx.textAlign = o.hero ? 'right' : 'center';
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(7,11,22,0.75)';
        ctx.strokeText(lbl, lx, ly);
        ctx.fillStyle = o.color; ctx.fillText(lbl, lx, ly);
        ctx.lineWidth = 1; ctx.textAlign = 'left';
      }
    });

    // 主角的 Δθ 括弧（过去 1.2 s）+ 两目标对比读数
    const tr = trail[0];
    if (tr.length > 2) {
      const old = tr.find(s => state.t - s.t <= 1.2) || tr[0];
      const nowPhi = tr[tr.length - 1].phi;
      ctx.strokeStyle = 'rgba(255,233,174,0.9)'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(carPx, roadY, 64, -nowPhi, -old.phi, old.phi > nowPhi);
      ctx.stroke(); ctx.lineWidth = 1;
      const dT = sweptDeg(0, 1.2), dM = sweptDeg(1, 1.2);
      // 文字固定在车左侧的空白区，永不撞右侧面板；垫一条深色底保证可读
      ctx.font = 'bold 13px sans-serif';
      const msg = dT >= dM
        ? `同样 1.2 秒：树转 ${dT.toFixed(1)}° · 山只转 ${dM.toFixed(1)}°`
        : `同样 1.2 秒：树 ${dT.toFixed(1)}° · 山 ${dM.toFixed(1)}°（都很慢——快慢差在齐平附近才拉开）`;
      const tw = ctx.measureText(msg).width;
      const tx = carPx - 24 - tw, ty = roadY - 46;
      ctx.fillStyle = 'rgba(7,11,22,0.66)';
      ctx.fillRect(tx - 8, ty - 16, tw + 16, 22);
      ctx.fillStyle = '#ffe9ae';
      ctx.fillText(msg, tx, ty);
    }

    // 小车
    ctx.fillStyle = '#e8b84b';
    ctx.beginPath(); ctx.arc(carPx, roadY, 6, 0, 6.29); ctx.fill();
    ctx.strokeStyle = '#e8b84b';
    ctx.beginPath(); ctx.moveTo(carPx, roadY); ctx.lineTo(carPx + 26, roadY); ctx.stroke();
    ctx.fillStyle = '#97a3b8'; ctx.font = '12px sans-serif';
    ctx.fillText(`v = ${state.v_kmh} km/h`, carPx + 10, roadY + 30);
    ctx.restore();
  }

  function drawChart(_x, y0, w, hChart, pad) {
    if (hChart < 60) return;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    roundRect(ctx, pad * 0.4, y0, w - pad * 0.8, hChart, 12); ctx.fill(); ctx.stroke();

    const v_ms = state.v_kmh * KMH_TO_MS;
    const peak = toDegPerS(omegaPeak(v_ms, 10));
    const maxW = peak * 1.15;
    const px0 = pad + 8, px1 = w - pad - 8, py0 = y0 + 14, py1 = y0 + hChart - 26;
    const t1 = state.t, t0 = t1 - CHART_T;
    const tToPx = t => px0 + (t - t0) / CHART_T * (px1 - px0);
    const wToPy = wv => py1 - Math.min(wv, maxW) / maxW * (py1 - py0);

    ctx.fillStyle = '#97a3b8'; ctx.font = '13px sans-serif';
    ctx.fillText('感知角速度 ω(t) —— 掠过身边时拱起"山峰"（齐平 = v/d）', px0, y0 + 24);

    // y 轴刻度：0 / 半峰 / 峰值
    ctx.font = '11px sans-serif';
    [[0, '0'], [peak / 2, `${(peak / 2).toFixed(0)}`], [peak, `峰值 ${peak.toFixed(0)}°/s`]].forEach(([wv, txt]) => {
      const py = wToPy(wv);
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.beginPath(); ctx.moveTo(px0, py); ctx.lineTo(px1, py); ctx.stroke();
      ctx.fillStyle = 'rgba(151,163,184,0.7)';
      ctx.fillText(txt, px0 + 4, py - 3);
    });

    OBJ.forEach((o, i) => {
      const a = hist[i]; if (a.length < 2) return;
      ctx.strokeStyle = o.color; ctx.lineWidth = o.hero ? 2.4 : 1.4;
      ctx.beginPath();
      a.forEach((p, k) => { const X = tToPx(p.t), Y = wToPy(p.w); k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      ctx.stroke(); ctx.lineWidth = 1;
      const last = a[a.length - 1];
      ctx.fillStyle = o.color;
      ctx.beginPath(); ctx.arc(tToPx(last.t), wToPy(last.w), 3.5, 0, 6.29); ctx.fill();
      ctx.font = o.hero ? 'bold 12px sans-serif' : '12px sans-serif';
      ctx.fillText(`${o.name} ${fmt(last.w)}°/s`, Math.min(tToPx(last.t) + 6, px1 - 92), wToPy(last.w) - 6);
    });
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
