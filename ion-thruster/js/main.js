    const canvas = document.getElementById('c');
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    let isRunning = true;
    let voltage = 15;
    let flowRate = 4;
    let tick = 0;

    // ——— 结构布局 ———
    // 太阳能板 → 电源 → 氙气罐 → 管道 → 放电室(含空心阴极+磁铁) → 栅格 → 排气 → 中和器
    const layout = {
      // 太阳能板
      solarPanel: { x: 10, y: 100, w: 60, h: 320 },
      // 电源处理单元
      ppu: { x: 85, y: 190, w: 55, h: 140 },
      // 氙气储存罐
      tank: { cx: 205, cy: 260, r: 55 },
      // 供气管道
      pipe: { x: 255, y: 252, w: 60, h: 16 },
      // 放电室（锥形）
      chamber: { x: 315, y: 110, w: 340, h: 300,
                 // 锥形：左窄右宽
                 leftNarrow: 70 },
      // 空心阴极（放电室左端内部）
      cathode: { x: 325, cy: 260, w: 30, h: 14 },
      // 栅格系统
      screenGrid: { x: 655 },
      accelGrid: { x: 678 },
      gridGap: 23,
      // 中和器
      neutralizer: { x: 690, y: 420, w: 35, h: 20 },
      // 排气区域
      exhaust: { x: 700 },
    };

    // 磁铁位置（环形磁铁在放电室壁上）
    const magnets = [
      { x: 370, y: 135 }, { x: 370, y: 385 },
      { x: 450, y: 120 }, { x: 450, y: 400 },
      { x: 530, y: 115 }, { x: 530, y: 405 },
      { x: 610, y: 112 }, { x: 610, y: 408 },
    ];

    // ——— 粒子 ———
    let tankAtoms = [], pipeAtoms = [], chamberAtoms = [];
    let ions = [], electrons = [], neutElectrons = [];

    class TankAtom {
      constructor() { this.r = 4.5; this.reset(); }
      reset() {
        const a = Math.random() * Math.PI * 2;
        const d = Math.random() * (layout.tank.r - 10);
        this.x = layout.tank.cx + Math.cos(a) * d;
        this.y = layout.tank.cy + Math.sin(a) * d;
        this.vx = (Math.random() - 0.3) * 1.8;
        this.vy = (Math.random() - 0.5) * 1.8;
      }
      update() {
        const pipeX = layout.pipe.x;
        const pipeY = layout.pipe.y + layout.pipe.h / 2;
        const ang = Math.atan2(pipeY - this.y, pipeX - this.x);

        // 高压推力 → 管道口
        this.vx += Math.cos(ang) * 0.035;
        this.vy += Math.sin(ang) * 0.035;
        const dist = Math.hypot(this.x - pipeX, this.y - pipeY);
        if (dist < 70) {
          this.vx += Math.cos(ang) * 0.18;
          this.vy += Math.sin(ang) * 0.18;
        }

        // 热运动
        this.vx += (Math.random() - 0.5) * 0.25;
        this.vy += (Math.random() - 0.5) * 0.25;

        // 限速
        const sp = Math.hypot(this.vx, this.vy);
        if (sp > 2.8) { this.vx *= 2.8/sp; this.vy *= 2.8/sp; }

        this.x += this.vx;
        this.y += this.vy;

        // 罐壁反弹
        const dx = this.x - layout.tank.cx;
        const dy = this.y - layout.tank.cy;
        const dc = Math.hypot(dx, dy);
        if (dc > layout.tank.r - this.r) {
          // 允许从管道口出去
          if (!(this.x > pipeX - 8 && Math.abs(this.y - pipeY) < layout.pipe.h / 2)) {
            const a2 = Math.atan2(dy, dx);
            this.x = layout.tank.cx + Math.cos(a2) * (layout.tank.r - this.r - 1);
            this.y = layout.tank.cy + Math.sin(a2) * (layout.tank.r - this.r - 1);
            this.vx = -Math.cos(a2) * Math.abs(this.vx || 0.8);
            this.vy = -Math.sin(a2) * Math.abs(this.vy || 0.8);
          }
        }

        // 进入管道
        if (this.x >= pipeX && Math.abs(this.y - pipeY) < layout.pipe.h / 2 - 1) {
          pipeAtoms.push({ x: this.x, y: this.y, vx: Math.max(this.vx, 1.5) + Math.random() * 0.5 });
          this.reset();
        }
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = '#94a3b8';
        ctx.fill();
      }
    }

    class ChamberAtom {
      constructor(x, y, vx) {
        this.x = x; this.y = y;
        this.vx = (vx || 1.2) + Math.random() * 0.8;
        this.vy = (Math.random() - 0.5) * 2.5;
        this.r = 5;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        // 放电室边界（梯形）
        const progress = (this.x - layout.chamber.x) / layout.chamber.w;
        const narrow = layout.chamber.leftNarrow;
        const topY = layout.chamber.y + narrow * (1 - progress);
        const botY = layout.chamber.y + layout.chamber.h - narrow * (1 - progress);
        if (this.y - this.r < topY) { this.y = topY + this.r; this.vy = Math.abs(this.vy); }
        if (this.y + this.r > botY) { this.y = botY - this.r; this.vy = -Math.abs(this.vy); }
        if (this.x < layout.chamber.x + 5) { this.vx = Math.abs(this.vx); }
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = '#94a3b8';
        ctx.fill();
      }
    }

    class Ion {
      constructor(x, y) {
        this.x = x; this.y = y;
        this.vx = 0.5; this.vy = (Math.random() - 0.5) * 0.3;
        this.r = 4.5;
        this.neutralized = false;
        this.trail = [];
      }
      update() {
        // 在栅格区域被电场加速
        if (this.x >= layout.screenGrid.x && this.x <= layout.accelGrid.x + 80) {
          this.vx += voltage * 0.07;
        } else if (this.x < layout.screenGrid.x) {
          this.vx += 0.04;
        }
        this.x += this.vx;
        this.y += this.vy;
        // 尾迹
        if (this.x > layout.accelGrid.x) {
          this.trail.push({ x: this.x, y: this.y });
          if (this.trail.length > 8) this.trail.shift();
        }
      }
      draw() {
        // 排气尾迹
        for (let i = 0; i < this.trail.length; i++) {
          const a = (i / this.trail.length) * 0.4;
          ctx.beginPath();
          ctx.arc(this.trail[i].x, this.trail[i].y, 2, 0, Math.PI * 2);
          ctx.fillStyle = this.neutralized
            ? `rgba(168,85,247,${a})` : `rgba(56,189,248,${a})`;
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = this.neutralized ? '#a855f7' : '#38bdf8';
        ctx.shadowColor = this.neutralized ? '#a855f7' : '#38bdf8';
        ctx.shadowBlur = this.neutralized ? 5 : 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    class Electron {
      constructor() {
        // 从空心阴极发射
        this.x = layout.cathode.x + layout.cathode.w;
        this.y = layout.cathode.cy + (Math.random() - 0.5) * 8;
        this.vx = 3 + Math.random() * 4;
        this.vy = (Math.random() - 0.5) * 6;
        this.r = 2;
        this.life = 0;
      }
      update() {
        this.life++;
        this.x += this.vx;
        this.y += this.vy;

        // 磁场约束 — 电子在放电室内螺旋运动
        this.vy += (Math.random() - 0.5) * 1.5;
        if (Math.random() < 0.03) this.vx *= -0.8;

        const progress = (this.x - layout.chamber.x) / layout.chamber.w;
        const narrow = layout.chamber.leftNarrow;
        const topY = layout.chamber.y + narrow * (1 - Math.max(0, progress)) + 10;
        const botY = layout.chamber.y + layout.chamber.h - narrow * (1 - Math.max(0, progress)) - 10;

        if (this.y < topY) { this.y = topY; this.vy = Math.abs(this.vy); }
        if (this.y > botY) { this.y = botY; this.vy = -Math.abs(this.vy); }
        if (this.x < layout.cathode.x + layout.cathode.w + 5) { this.vx = Math.abs(this.vx); }
        if (this.x > layout.screenGrid.x - 15) { this.vx = -Math.abs(this.vx); }
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = '#f43f5e';
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 3;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    class NeutElectron {
      constructor() {
        const n = layout.neutralizer;
        this.x = n.x + n.w / 2;
        this.y = n.y;
        this.vx = 1.5 + Math.random() * 3;
        this.vy = -2 - Math.random() * 2.5;
        this.r = 2;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = '#facc15';
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 3;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    function init() {
      tankAtoms = []; pipeAtoms = []; chamberAtoms = [];
      ions = []; electrons = []; neutElectrons = [];
      for (let i = 0; i < 40; i++) tankAtoms.push(new TankAtom());
      for (let i = 0; i < 28; i++) electrons.push(new Electron());
      tick = 0;
    }

    // ——— 绘制结构 ———
    function drawStructure() {
      // === 太阳能板 ===
      const sp = layout.solarPanel;
      ctx.fillStyle = '#1a237e';
      ctx.fillRect(sp.x, sp.y, sp.w, sp.h);
      // 网格线
      ctx.strokeStyle = '#3949ab';
      ctx.lineWidth = 0.8;
      for (let gy = sp.y; gy < sp.y + sp.h; gy += 20) {
        ctx.beginPath(); ctx.moveTo(sp.x, gy); ctx.lineTo(sp.x + sp.w, gy); ctx.stroke();
      }
      for (let gx = sp.x; gx < sp.x + sp.w; gx += 15) {
        ctx.beginPath(); ctx.moveTo(gx, sp.y); ctx.lineTo(gx, sp.y + sp.h); ctx.stroke();
      }
      ctx.strokeStyle = '#5c6bc0';
      ctx.lineWidth = 2;
      ctx.strokeRect(sp.x, sp.y, sp.w, sp.h);
      // 连接杆
      ctx.fillStyle = '#475569';
      ctx.fillRect(sp.x + sp.w, sp.y + sp.h/2 - 4, 15, 8);

      label('太阳能电池板', sp.x + sp.w/2, sp.y - 12, '#7986cb', 10);
      label('(供电 2.3kW)', sp.x + sp.w/2, sp.y - 1, '#5c6bc0', 9);

      // === PPU 电源处理单元 ===
      const ppu = layout.ppu;
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.fillRect(ppu.x, ppu.y, ppu.w, ppu.h);
      ctx.strokeRect(ppu.x, ppu.y, ppu.w, ppu.h);
      // 闪烁指示灯
      ctx.fillStyle = tick % 40 < 20 ? '#4ade80' : '#166534';
      ctx.beginPath();
      ctx.arc(ppu.x + 15, ppu.y + 15, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = tick % 50 < 25 ? '#facc15' : '#713f12';
      ctx.beginPath();
      ctx.arc(ppu.x + 30, ppu.y + 15, 4, 0, Math.PI * 2);
      ctx.fill();

      label('电源处理', ppu.x + ppu.w/2, ppu.y + ppu.h/2 - 8, '#94a3b8', 10);
      label('单元 PPU', ppu.x + ppu.w/2, ppu.y + ppu.h/2 + 5, '#94a3b8', 10);

      // PPU → 放电室连线
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(ppu.x + ppu.w, ppu.y + 30);
      ctx.lineTo(layout.cathode.x, layout.cathode.cy);
      ctx.stroke();
      // PPU → 屏栅极/加速极连线
      ctx.strokeStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(ppu.x + ppu.w, ppu.y + ppu.h - 40);
      ctx.lineTo(layout.screenGrid.x, layout.chamber.y + layout.chamber.h + 15);
      ctx.stroke();

      // PPU → 中和器供电线（提供加热与发射电流）
      ctx.strokeStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(ppu.x + ppu.w, ppu.y + ppu.h - 10);
      ctx.lineTo(layout.neutralizer.x + layout.neutralizer.w / 2, layout.neutralizer.y + layout.neutralizer.h + 5);
      ctx.stroke();
      ctx.setLineDash([]);

      // === 氙气储存罐 ===
      const tk = layout.tank;
      ctx.beginPath();
      ctx.arc(tk.cx, tk.cy, tk.r, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // 压力刻度
      ctx.strokeStyle = 'rgba(56,189,248,0.2)';
      ctx.lineWidth = 0.8;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(tk.cx, tk.cy, tk.r * i / 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      label('储存罐', tk.cx, tk.cy - tk.r - 18, '#38bdf8', 12, true);
      label('(高压氙气 Xe)', tk.cx, tk.cy - tk.r - 5, '#64748b', 9);

      // === 供气管道 + 阀门 ===
      const pp = layout.pipe;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(pp.x, pp.y, pp.w, pp.h);
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(pp.x, pp.y, pp.w, pp.h);
      // 阀门
      ctx.fillStyle = '#f59e0b';
      const valveX = pp.x + pp.w / 2 - 7;
      ctx.fillRect(valveX, pp.y - 10, 14, 10);
      ctx.fillRect(valveX + 4, pp.y - 3, 6, 6);
      label('流量阀', pp.x + pp.w / 2, pp.y - 16, '#f59e0b', 9);

      // 气源分支管道 → 中和器（提供微量氙气维持放电）
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(pp.x + 10, pp.y + pp.h);
      ctx.lineTo(pp.x + 10, layout.neutralizer.y + 10);
      ctx.lineTo(layout.neutralizer.x, layout.neutralizer.y + 10);
      ctx.stroke();
      ctx.setLineDash([]);
      label('微量氙气支路', pp.x + 35, layout.neutralizer.y + 14, '#38bdf8', 8);

      // === 放电室（锥形） ===
      const ch = layout.chamber;
      const n = ch.leftNarrow;
      ctx.beginPath();
      ctx.moveTo(ch.x, ch.y + n);
      ctx.lineTo(ch.x + ch.w, ch.y);
      ctx.lineTo(ch.x + ch.w, ch.y + ch.h);
      ctx.lineTo(ch.x, ch.y + ch.h - n);
      ctx.closePath();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fill();
      ctx.strokeStyle = '#0ea5e9';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      label('放电室 (Discharge Chamber)', ch.x + ch.w/2, ch.y - 18, '#0ea5e9', 12, true);

      // === 阳极壁标注 ===
      label('阳极壁 (Anode)', ch.x + ch.w / 2, ch.y + ch.h + 18, '#64748b', 9);

      // === 空心阴极 ===
      const ca = layout.cathode;
      ctx.fillStyle = '#475569';
      ctx.fillRect(ca.x, ca.cy - ca.h/2, ca.w, ca.h);
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(ca.x, ca.cy - ca.h/2, ca.w, ca.h);
      // 发射口发光
      const cGlow = ctx.createRadialGradient(ca.x + ca.w, ca.cy, 2, ca.x + ca.w, ca.cy, 15);
      cGlow.addColorStop(0, 'rgba(244,63,94,0.5)');
      cGlow.addColorStop(1, 'rgba(244,63,94,0)');
      ctx.beginPath();
      ctx.arc(ca.x + ca.w, ca.cy, 15, 0, Math.PI * 2);
      ctx.fillStyle = cGlow;
      ctx.fill();

      label('空心阴极', ca.x + ca.w/2, ca.cy - ca.h/2 - 14, '#f43f5e', 10, true);
      label('(Hollow Cathode)', ca.x + ca.w/2, ca.cy - ca.h/2 - 3, '#fda4af', 8);
      label('发射 e⁻', ca.x + ca.w + 20, ca.cy - 18, '#f43f5e', 9);

      // === 磁铁 ===
      for (const m of magnets) {
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(m.x - 6, m.y - 5, 12, 10);
        ctx.fillStyle = '#1d4ed8';
        ctx.fillRect(m.x - 6, m.y + 1, 12, 4);
      }
      label('环形磁铁', magnets[0].x, magnets[0].y - 14, '#ef4444', 8);
      label('(约束电子)', magnets[1].x, magnets[1].y + 18, '#ef4444', 8);

      // === 磁力线 ===
      drawMagneticField();

      // === 栅格系统 ===
      const sg = layout.screenGrid.x;
      const ag = layout.accelGrid.x;
      // 屏栅极（正极）
      ctx.fillStyle = '#ef4444';
      for (let y = ch.y + 8; y < ch.y + ch.h - 8; y += 22) {
        ctx.fillRect(sg, y, 7, 14);
      }
      // 加速极（负极）
      ctx.fillStyle = '#3b82f6';
      for (let y = ch.y + 8; y < ch.y + ch.h - 8; y += 22) {
        ctx.fillRect(ag, y, 7, 14);
      }
      // 电场箭头
      ctx.strokeStyle = 'rgba(239,68,68,0.3)';
      ctx.lineWidth = 1;
      for (let y = ch.y + 15; y < ch.y + ch.h - 15; y += 44) {
        drawSmallArrow(sg + 10, y, ag - 2, y, 'rgba(239,68,68,0.35)');
      }

      label('+1500V', sg - 5, ch.y + ch.h + 18, '#ef4444', 10, true);
      label('屏栅极', sg - 5, ch.y + ch.h + 30, '#ef4444', 9);
      label('-300V', ag + 5, ch.y + ch.h + 18, '#3b82f6', 10, true);
      label('加速极', ag + 5, ch.y + ch.h + 30, '#3b82f6', 9);

      // === 排气羽流光晕 ===
      const exGlow = ctx.createRadialGradient(ag + 60, ch.y + ch.h/2, 20, ag + 60, ch.y + ch.h/2, 200);
      exGlow.addColorStop(0, 'rgba(56,189,248,0.08)');
      exGlow.addColorStop(0.5, 'rgba(56,189,248,0.03)');
      exGlow.addColorStop(1, 'rgba(56,189,248,0)');
      ctx.beginPath();
      ctx.arc(ag + 60, ch.y + ch.h/2, 200, 0, Math.PI * 2);
      ctx.fillStyle = exGlow;
      ctx.fill();

      // === 中和器 ===
      const ne = layout.neutralizer;
      ctx.fillStyle = '#334155';
      ctx.fillRect(ne.x, ne.y, ne.w, ne.h);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(ne.x, ne.y, ne.w, ne.h);
      // 发射口
      const nGlow = ctx.createRadialGradient(ne.x + ne.w/2, ne.y, 2, ne.x + ne.w/2, ne.y, 10);
      nGlow.addColorStop(0, 'rgba(250,204,21,0.5)');
      nGlow.addColorStop(1, 'rgba(250,204,21,0)');
      ctx.beginPath();
      ctx.arc(ne.x + ne.w/2, ne.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = nGlow;
      ctx.fill();

      label('中和器 (Neutralizer)', ne.x + ne.w/2, ne.y + ne.h + 14, '#facc15', 10, true);
      label('独立空心阴极 · 白热热发射 e⁻', ne.x + ne.w/2, ne.y + ne.h + 26, '#fde68a', 8);

      // === 排气方向和推力标注 ===
      label('高速离子束 →', ag + 160, ch.y + ch.h/2 - 30, '#38bdf8', 11, true);
      label('(~30,000 m/s)', ag + 160, ch.y + ch.h/2 - 16, '#64748b', 9);
      label('← 推力方向', ch.x - 10, ch.y + ch.h/2, '#4ade80', 11, true);

      // === 过程编号标注 ===
      stepLabel('①', '注入氙气', layout.pipe.x + layout.pipe.w/2, layout.pipe.y + layout.pipe.h + 22);
      stepLabel('②', '电子轰击电离', ch.x + 100, ch.y + 48);
      stepLabel('③', '电场加速', sg + 10, ch.y + 48);
      stepLabel('④', '中和排出', ag + 80, ne.y + 5);
    }

    function drawMagneticField() {
      ctx.save();
      ctx.strokeStyle = 'rgba(34,211,238,0.12)';
      ctx.lineWidth = 0.8;
      const ch = layout.chamber;
      const cx = ch.x + ch.w * 0.5;
      const cy = ch.y + ch.h / 2;

      for (let i = 0; i < 6; i++) {
        const rx = 40 + i * 35;
        const ry = 20 + i * 22;
        ctx.beginPath();
        ctx.ellipse(cx - 50 + i * 20, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawSmallArrow(x1, y1, x2, y2, color) {
      const a = Math.atan2(y2 - y1, x2 - x1);
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - 5 * Math.cos(a - 0.4), y2 - 5 * Math.sin(a - 0.4));
      ctx.lineTo(x2 - 5 * Math.cos(a + 0.4), y2 - 5 * Math.sin(a + 0.4));
      ctx.fill();
    }

    function label(text, x, y, color, size = 11, bold = false) {
      ctx.fillStyle = color;
      ctx.font = (bold ? 'bold ' : '') + size + 'px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(text, x, y);
    }

    function stepLabel(num, text, x, y) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 14px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(num, x, y);
      ctx.fillStyle = '#fde68a';
      ctx.font = '9px Outfit, sans-serif';
      ctx.fillText(text, x, y + 13);
    }

    // ——— 碰撞检测 ———
    function handleCollisions() {
      // 电子碰氙原子 → 产生离子
      for (let i = chamberAtoms.length - 1; i >= 0; i--) {
        for (let j = 0; j < electrons.length; j++) {
          const dx = chamberAtoms[i].x - electrons[j].x;
          const dy = chamberAtoms[i].y - electrons[j].y;
          if (dx * dx + dy * dy < 100) {
            ions.push(new Ion(chamberAtoms[i].x, chamberAtoms[i].y));
            chamberAtoms.splice(i, 1);
            break;
          }
        }
      }
      // 中和（正离子吸引中和电子，几乎全部被中和）
      for (const ion of ions) {
        if (ion.x > layout.accelGrid.x + 20 && !ion.neutralized) {
          for (let j = neutElectrons.length - 1; j >= 0; j--) {
            const dx = ion.x - neutElectrons[j].x;
            const dy = ion.y - neutElectrons[j].y;
            const distSq = dx * dx + dy * dy;

            // 异性电荷库仑吸引力：中和电子朝附近正离子加速靠拢
            if (distSq < 15000 && distSq > 0) {
              const dist = Math.sqrt(distSq);
              neutElectrons[j].vx += (dx / dist) * 0.4;
              neutElectrons[j].vy += (dy / dist) * 0.4;
            }

            // 碰撞中和判定（判定距离提高，确保几乎全中和）
            if (distSq < 1600 || (ion.x > layout.accelGrid.x + 120 && Math.random() < 0.15)) {
              ion.neutralized = true;
              neutElectrons.splice(j, 1);
              break;
            }
          }
        }
      }
    }

    // ——— 动画主循环 ———
    function animate() {
      if (!isRunning) { requestAnimationFrame(animate); return; }
      tick++;
      ctx.clearRect(0, 0, W, H);

      drawStructure();

      // 补充电子
      if (electrons.length < 30 && tick % 8 === 0) electrons.push(new Electron());
      // 补充中和电子（提高发射频率，确保电子充足）
      if (tick % 2 === 0) {
        neutElectrons.push(new NeutElectron());
        neutElectrons.push(new NeutElectron());
      }

      // 罐中原子
      for (const a of tankAtoms) { a.update(); a.draw(); }

      // 管道原子
      for (let i = pipeAtoms.length - 1; i >= 0; i--) {
        const p = pipeAtoms[i];
        p.x += p.vx;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#cbd5e1';
        ctx.fill();
        if (p.x >= layout.pipe.x + layout.pipe.w) {
          chamberAtoms.push(new ChamberAtom(p.x, p.y, p.vx));
          pipeAtoms.splice(i, 1);
        }
      }

      // 放电室原子
      for (let i = chamberAtoms.length - 1; i >= 0; i--) {
        chamberAtoms[i].update();
        chamberAtoms[i].draw();
        if (chamberAtoms[i].x > layout.screenGrid.x - 3) {
          chamberAtoms.splice(i, 1);
        }
      }

      // 电子
      for (const e of electrons) { e.update(); e.draw(); }

      // 离子
      for (let i = ions.length - 1; i >= 0; i--) {
        ions[i].update();
        ions[i].draw();
        if (ions[i].x > W + 20) ions.splice(i, 1);
      }

      // 中和电子
      for (let i = neutElectrons.length - 1; i >= 0; i--) {
        neutElectrons[i].update();
        neutElectrons[i].draw();
        if (neutElectrons[i].x > W || neutElectrons[i].y < 0) neutElectrons.splice(i, 1);
      }

      handleCollisions();
      requestAnimationFrame(animate);
    }

    // ——— 控制 ———
    document.getElementById('toggleBtn').addEventListener('click', () => {
      isRunning = !isRunning;
      document.getElementById('toggleBtn').innerText = isRunning ? '⏸ 暂停' : '▶ 继续';
    });
    document.getElementById('voltageSlider').addEventListener('input', e => {
      voltage = parseFloat(e.target.value);
      document.getElementById('voltageVal').innerText = (voltage * 100) + 'V';
    });
    document.getElementById('flowSlider').addEventListener('input', e => {
      flowRate = parseFloat(e.target.value);
    });

    init();
    animate();
