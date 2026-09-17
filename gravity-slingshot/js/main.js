    const canvas = document.getElementById('simCanvas');
    const ctx = canvas.getContext('2d');

    let isPlaying = true;
    let simSpeed = 0.35;
    let camX = 0, camY = 0;
    let starTime = 0;

    // ——— 太阳系天体数据 ———
    // 内行星仅用于展示，外行星参与引力计算
    let centerY = 0;
    let bodies = [];   // 所有天体
    let gravBodies = []; // 参与引力的天体
    let craft = { x: 0, y: 0, vx: 0, vy: 0, path: [] };
    let ghost = { x: 0, y: 0, vx: 0, vy: 0, path: [] };
    let initialSpeed = 0;

    // 飞行里程碑
    const milestones = {
      jupiter: { passed: false, minDist: Infinity, speedAtPass: 0 },
      saturn:  { passed: false, minDist: Infinity, speedAtPass: 0 },
      uranus:  { passed: false, minDist: Infinity, speedAtPass: 0 },
      neptune: { passed: false, minDist: Infinity, speedAtPass: 0 },
      escaped: false,
    };

    function buildSolarSystem() {
      const cy = centerY;
      bodies = [
        // 太阳
        { id:'sun', name:'太阳', x: 100, y: cy, r: 38, color:'#fbbf24', glow:'#f59e0b',
          type:'star', vx:0, vy:0, GM:0 },
        // 内行星（展示用）
        { id:'mercury', name:'水星', x: 185, y: cy - 12, r: 3, color:'#94a3b8',
          type:'inner', vx:0, vy:0, GM:0 },
        { id:'venus', name:'金星', x: 240, y: cy + 8, r: 5, color:'#fcd34d',
          type:'inner', vx:0, vy:0, GM:0 },
        { id:'earth', name:'地球 🌍', x: 320, y: cy, r: 7, color:'#3b82f6',
          type:'home', vx:0, vy:0, GM:0 },
        { id:'mars', name:'火星', x: 420, y: cy - 18, r: 4.5, color:'#ef4444',
          type:'inner', vx:0, vy:0, GM:0 },
        // 外行星（引力弹弓）—— 精确校准轨道几何与引力场，确保航天器在各行星外侧安全飞掠，绝不与天体本体重叠
        { id:'jupiter', name:'木星', x: 850, y: cy + 30, r: 26, color:'#f59e0b',
          type:'gas', vx: 0.9, vy:0, GM: 100 },
        { id:'saturn', name:'土星', x: 1450, y: cy + 0, r: 21, color:'#fbbf24',
          type:'gas', vx: 0.7, vy:0, GM: 120, hasRing: true },
        { id:'uranus', name:'天王星', x: 2100, y: cy - 45, r: 15, color:'#67e8f9',
          type:'ice', vx: 0.45, vy:0, GM: 90 },
        { id:'neptune', name:'海王星', x: 2750, y: cy - 40, r: 14, color:'#818cf8',
          type:'ice', vx: 0.35, vy:0, GM: 90 },
      ];

      gravBodies = bodies.filter(b => b.GM > 0);
    }

    function resizeCanvas() {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
      centerY = canvas.height / 2;
      resetSim();
    }

    let stars = [];
    function initStars() {
      stars = [];
      for (let i = 0; i < 200; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: Math.random() * 1.1 + 0.2,
          a: Math.random() * 0.4 + 0.15,
          sp: Math.random() * 0.015 + 0.003,
          ph: Math.random() * Math.PI * 2,
        });
      }
    }

    function drawStars() {
      starTime++;
      for (const s of stars) {
        const a = s.a + Math.sin(starTime * s.sp + s.ph) * 0.12;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${Math.max(0.03, a)})`;
        ctx.fill();
      }
    }

    window.addEventListener('resize', () => { resizeCanvas(); initStars(); });

    function togglePlay() {
      isPlaying = !isPlaying;
      document.getElementById('btnPlay').innerText = isPlaying ? '⏸ 暂停' : '▶ 播放';
    }
    function updateSpeed() {
      simSpeed = parseFloat(document.getElementById('sliderSpeed').value);
      document.getElementById('valSpeed').innerText = simSpeed.toFixed(2) + '×';
    }

    function resetSim() {
      buildSolarSystem();

      const earth = bodies.find(b => b.id === 'earth');
      craft.x = earth.x + 15;
      craft.y = earth.y;
      craft.vx = 3.6;
      craft.vy = 0.45; // 瞄准木星外侧安全飞掠走廊（确保不穿过天体表面）
      craft.path = [];

      ghost.x = craft.x;
      ghost.y = craft.y;
      ghost.vx = craft.vx;
      ghost.vy = craft.vy;
      ghost.path = [];

      initialSpeed = Math.hypot(craft.vx, craft.vy);
      camX = 0; camY = 0;

      // 重置里程碑
      for (const k in milestones) {
        if (k === 'escaped') { milestones.escaped = false; continue; }
        milestones[k] = { passed: false, minDist: Infinity, speedAtPass: 0 };
      }

      // 重置飞行日志 UI
      ['Jupiter','Saturn','Uranus','Neptune'].forEach(n => {
        document.getElementById('dot' + n).style.background = 'transparent';
        document.getElementById('dot' + n).classList.remove('visited');
        document.getElementById('name' + n).classList.remove('visited');
        document.getElementById('log' + n).innerText = '等待中…';
      });
      document.getElementById('dotEscape').style.background = 'transparent';
      document.getElementById('dotEscape').classList.remove('visited');
      document.getElementById('nameEscape').classList.remove('visited');
      document.getElementById('logEscape').innerText = '—';
      document.getElementById('logEarth').innerText = (Math.hypot(craft.vx, craft.vy) / 0.25).toFixed(1) + ' km/s';
      document.getElementById('missionStatus').innerText = '🌍 从地球出发，目标：木星';

      updateHUD();
    }

    function updatePhysics() {
      if (!isPlaying) return;
      const dt = simSpeed;
      const subSteps = 4;
      const sdt = dt / subSteps;

      for (let step = 0; step < subSteps; step++) {
        let totalAx = 0, totalAy = 0;

        // 引力叠加（带核心平滑，保证近距飞掠轨道精准平滑，永不奇点震荡）
        for (const p of gravBodies) {
          const dx = p.x - craft.x;
          const dy = p.y - craft.y;
          const rSq = dx * dx + dy * dy;
          const r = Math.sqrt(rSq);
          const acc = p.GM / (rSq + 200);
          totalAx += acc * (dx / r);
          totalAy += acc * (dy / r);
        }

        craft.vx += totalAx * sdt;
        craft.vy += totalAy * sdt;
        craft.x += craft.vx * sdt;
        craft.y += craft.vy * sdt;

        // 移动行星（模拟公转）
        for (const b of bodies) {
          b.x += b.vx * sdt;
          b.y += b.vy * sdt;
        }

        // 幽灵（匀速直线）
        ghost.x += ghost.vx * sdt;
        ghost.y += ghost.vy * sdt;
      }

      craft.path.push({ x: craft.x, y: craft.y });
      ghost.path.push({ x: ghost.x, y: ghost.y });
      if (craft.path.length > 2000) craft.path.shift();
      if (ghost.path.length > 2000) ghost.path.shift();

      // 相机跟随
      const tCamX = craft.x - canvas.width * 0.35;
      const tCamY = craft.y - canvas.height * 0.5;
      camX += (tCamX - camX) * 0.035;
      camY += (tCamY - camY) * 0.035;

      // 检查飞行里程碑
      checkMilestones();

      // 越界重置
      const neptune = bodies.find(b => b.id === 'neptune');
      if (craft.x > neptune.x + 1200) {
        if (!milestones.escaped) {
          milestones.escaped = true;
          const el = document.getElementById('dotEscape');
          el.style.background = '#a78bfa';
          el.classList.add('visited');
          document.getElementById('nameEscape').classList.add('visited');
          document.getElementById('logEscape').innerText = curSpeed().toFixed(1) + ' km/s 🎉';
          document.getElementById('missionStatus').innerHTML = '🌌 <strong>任务完成！</strong>飞出太阳系！';
        }
        if (craft.x > neptune.x + 2000) resetSim();
      }

      updateHUD();
    }

    function curSpeed() { return Math.hypot(craft.vx, craft.vy) / 0.25; }

    function checkMilestones() {
      const checks = [
        { key: 'jupiter', id: 'Jupiter' },
        { key: 'saturn',  id: 'Saturn' },
        { key: 'uranus',  id: 'Uranus' },
        { key: 'neptune', id: 'Neptune' },
      ];
      const nextNames = ['土星', '天王星', '海王星', '太阳系边界'];

      for (let i = 0; i < checks.length; i++) {
        const c = checks[i];
        const m = milestones[c.key];
        if (m.passed) continue;

        const body = bodies.find(b => b.id === c.key);
        const dx = craft.x - body.x;
        const dy = craft.y - body.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < m.minDist) {
          m.minDist = dist;
          m.speedAtPass = curSpeed();
        }

        // 航天器已经飞过这个行星（x 方向超过了行星）
        if (craft.x > body.x + 80 && m.minDist < 300) {
          m.passed = true;
          const dot = document.getElementById('dot' + c.id);
          dot.style.background = getComputedStyle(dot).borderColor;
          dot.classList.add('visited');
          document.getElementById('name' + c.id).classList.add('visited');

          const speedGain = m.speedAtPass - (initialSpeed / 0.25);
          document.getElementById('log' + c.id).innerText =
            m.speedAtPass.toFixed(1) + ' km/s (+' + speedGain.toFixed(1) + ')';

          // 更新任务状态
          if (i < checks.length - 1) {
            document.getElementById('missionStatus').innerText =
              '✅ ' + body.name + ' 飞掠完成！下一站：' + nextNames[i];
          } else {
            document.getElementById('missionStatus').innerText =
              '✅ ' + body.name + ' 飞掠完成！冲向星际空间…';
          }
        }
      }
    }

    function updateHUD() {
      const speed = curSpeed();
      const gain = speed - (initialSpeed / 0.25);

      document.getElementById('hudSpeed').innerText = speed.toFixed(1) + ' km/s';
      document.getElementById('hudGain').innerText = (gain >= 0 ? '+' : '') + gain.toFixed(1) + ' km/s';
      document.getElementById('bigSpeed').innerText = speed.toFixed(1);
      document.getElementById('totalGain').innerText = (gain >= 0 ? '+' : '') + gain.toFixed(1) + ' km/s';
      document.getElementById('totalGain').className = gain >= 0 ? 'speed-gain' : 'speed-loss';

      // 引力加速度
      let gAcc = 0;
      for (const p of gravBodies) {
        const dx = p.x - craft.x;
        const dy = p.y - craft.y;
        gAcc += p.GM / (dx * dx + dy * dy + 200);
      }
      document.getElementById('hudGrav').innerText = (gAcc * 1000).toFixed(2) + ' m/s²';
    }

    // ——— 渲染 ———
    function drawArrow(x1, y1, x2, y2, color, lw = 2, head = 6) {
      const a = Math.atan2(y2 - y1, x2 - x1);
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - head * Math.cos(a - 0.4), y2 - head * Math.sin(a - 0.4));
      ctx.lineTo(x2 - head * Math.cos(a + 0.4), y2 - head * Math.sin(a + 0.4));
      ctx.closePath();
      ctx.fill();
    }

    function drawLabel(text, x, y, color, offY = 38) {
      const ly = y - offY;
      ctx.save();
      ctx.font = '11px Outfit, sans-serif';
      const w = ctx.measureText(text).width + 10;
      ctx.fillStyle = 'rgba(5,8,15,0.85)';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.roundRect(x - w / 2, ly - 9, w, 18, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x, ly);
      // leader line
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.8;
      ctx.setLineDash([2, 2]);
      ctx.moveTo(x, y - 8);
      ctx.lineTo(x, ly + 10);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    let fieldAngle = 0;

    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawStars();

      ctx.save();
      ctx.translate(-camX, -camY);

      // --- 幽灵轨迹 ---
      if (ghost.path.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(244,114,182,0.35)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        for (let i = 0; i < ghost.path.length; i++) {
          if (i === 0) ctx.moveTo(ghost.path[i].x, ghost.path[i].y);
          else ctx.lineTo(ghost.path[i].x, ghost.path[i].y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        // ghost dot
        ctx.beginPath();
        ctx.arc(ghost.x, ghost.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(244,114,182,0.4)';
        ctx.fill();
      }

      // --- 航天器轨迹 ---
      if (craft.path.length > 1) {
        for (let i = 1; i < craft.path.length; i++) {
          const a = 0.15 + 0.85 * (i / craft.path.length);
          ctx.beginPath();
          ctx.strokeStyle = `rgba(56,189,248,${a})`;
          ctx.lineWidth = 2.5;
          ctx.moveTo(craft.path[i - 1].x, craft.path[i - 1].y);
          ctx.lineTo(craft.path[i].x, craft.path[i].y);
          ctx.stroke();
        }
      }

      // --- 天体 ---
      for (const b of bodies) {
        // 太阳
        if (b.type === 'star') {
          // 日冕
          const sg = ctx.createRadialGradient(b.x, b.y, b.r * 0.3, b.x, b.y, b.r * 3);
          sg.addColorStop(0, 'rgba(251,191,36,0.3)');
          sg.addColorStop(0.5, 'rgba(245,158,11,0.08)');
          sg.addColorStop(1, 'rgba(245,158,11,0)');
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r * 3, 0, Math.PI * 2);
          ctx.fillStyle = sg;
          ctx.fill();
          // 太阳本体
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.fillStyle = '#fbbf24';
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 25;
          ctx.fill();
          ctx.shadowBlur = 0;
          drawLabel('太阳 ☀', b.x, b.y - b.r, '#fbbf24', 50);
          continue;
        }

        // 地球（出发点）
        if (b.type === 'home') {
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.fillStyle = b.color;
          ctx.shadowColor = b.color;
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
          drawLabel(b.name, b.x, b.y - b.r, b.color, 30);
          continue;
        }

        // 内行星（小点 + 名字）
        if (b.type === 'inner') {
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.fillStyle = b.color;
          ctx.fill();
          drawLabel(b.name, b.x, b.y - b.r, b.color, 22);
          continue;
        }

        // 外行星（有引力）
        // 引力场辐射线
        const nLines = 8;
        for (let i = 0; i < nLines; i++) {
          const ang = (i / nLines) * Math.PI * 2 + fieldAngle;
          const inner = b.r + 6;
          const outer = b.r + 70;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(251,146,60,0.1)`;
          ctx.lineWidth = 0.8;
          ctx.setLineDash([2, 4]);
          ctx.moveTo(b.x + Math.cos(ang) * outer, b.y + Math.sin(ang) * outer);
          ctx.lineTo(b.x + Math.cos(ang) * inner, b.y + Math.sin(ang) * inner);
          ctx.stroke();
          ctx.setLineDash([]);
          // tiny arrowhead
          const a2 = Math.atan2(-Math.sin(ang), -Math.cos(ang));
          const tx = b.x + Math.cos(ang) * inner;
          const ty = b.y + Math.sin(ang) * inner;
          ctx.beginPath();
          ctx.fillStyle = 'rgba(251,146,60,0.15)';
          ctx.moveTo(tx, ty);
          ctx.lineTo(tx - 3 * Math.cos(a2 - 0.5), ty - 3 * Math.sin(a2 - 0.5));
          ctx.lineTo(tx - 3 * Math.cos(a2 + 0.5), ty - 3 * Math.sin(a2 + 0.5));
          ctx.closePath();
          ctx.fill();
        }

        // 引力场圈
        for (let ring = 1; ring <= 2; ring++) {
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r + ring * 35, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(251,146,60,${0.06 / ring})`;
          ctx.lineWidth = 0.8;
          ctx.setLineDash([3, 5]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // 光晕
        const g = ctx.createRadialGradient(b.x, b.y, b.r * 0.3, b.x, b.y, b.r * 2.5);
        g.addColorStop(0, hexAlpha(b.color, 0.2));
        g.addColorStop(1, hexAlpha(b.color, 0));
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();

        // 土星环
        if (b.hasRing) {
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(b.x, b.y, b.r * 2.2, b.r * 0.5, -0.15, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(251,191,36,0.35)';
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.restore();
        }

        // 行星本体
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;

        // 公转速度箭头
        if (b.vx > 0) {
          drawArrow(b.x, b.y, b.x + b.vx * 20, b.y, hexAlpha(b.color, 0.7), 1.5, 4);
        }

        drawLabel(b.name, b.x, b.y - b.r, b.color, 38);
      }

      // --- 引力箭头（从航天器指向每颗行星）---
      for (const p of gravBodies) {
        const dx = p.x - craft.x;
        const dy = p.y - craft.y;
        const r = Math.sqrt(dx * dx + dy * dy);
        if (r < 5) continue;
        const fMag = p.GM / (r * r + 200);
        const arrowLen = Math.min(fMag * 2200, 70);
        if (arrowLen < 4) continue;
        const nx = dx / r, ny = dy / r;
        const sx = craft.x + nx * 12;
        const sy = craft.y + ny * 12;
        const ex = craft.x + nx * (12 + arrowLen);
        const ey = craft.y + ny * (12 + arrowLen);
        const alpha = Math.min(0.9, arrowLen / 15);
        ctx.save();
        ctx.setLineDash([4, 3]);
        drawArrow(sx, sy, ex, ey, `rgba(251,146,60,${alpha})`, 2, 5);
        ctx.setLineDash([]);
        ctx.restore();
      }

      // --- 航天器 ---
      ctx.beginPath();
      ctx.arc(craft.x, craft.y, 12, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(56,189,248,0.1)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(craft.x, craft.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // 速度箭头
      drawArrow(craft.x, craft.y,
        craft.x + craft.vx * 10, craft.y + craft.vy * 10,
        '#4ade80', 2, 6);

      drawLabel('航天器 🚀', craft.x, craft.y - 5, '#38bdf8', 38);

      ctx.restore();

      fieldAngle += 0.004;
      updatePhysics();
      requestAnimationFrame(render);
    }

    function hexAlpha(hex, a) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${a})`;
    }

    // --- 初始化 ---
    function init() {
      resizeCanvas();
      initStars();
      render();
    }
    init();
