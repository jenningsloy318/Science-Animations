    const canvas = document.getElementById('simCanvas');
    const ctx = canvas.getContext('2d');

    const SLING_I18N = {
      zh: {
        docTitle: '引力弹弓 — 太阳系航行模拟',
        appTitle: '🚀 引力弹弓 — 太阳系航行模拟',
        appSubtitle: '模拟旅行者号探测器利用行星引力弹弓穿越太阳系的壮举',
        lblCurSpeed: '当前速度:',
        lblSlingshotGain: '引力弹弓增速:',
        lblGravAcc: '引力加速度:',
        legTraj: '实际轨道 (引力弹弓)',
        legGhost: '无行星时直线轨道',
        legGrav: '引力 (指向行星)',
        secMission: '📡 任务状态',
        missionStart: '🌍 从地球出发，目标：木星',
        missionFlyby: (name, next) => `✅ ${name} 飞掠完成！下一站：${next}`,
        missionDeep: name => `✅ ${name} 飞掠完成！冲向星际空间…`,
        missionEscape: '🌌 <strong>任务完成！</strong>飞出太阳系！',
        secSpeed: '⚡ 航天器速度',
        lblTotalGain: '引力弹弓总增益:',
        secLog: '📋 飞行日志',
        nameEarth: '🌍 地球 (出发)',
        nameJupiter: '🪐 木星',
        nameSaturn: '🪐 土星',
        nameUranus: '⭐ 天王星',
        nameNeptune: '🔵 海王星',
        nameEscape: '🌌 飞出太阳系',
        waiting: '等待中…',
        secCtrl: '🎮 控制',
        lblAnimSpeed: '动画速度',
        play: '▶ 播放',
        pause: '⏸ 暂停',
        relaunch: '🔄 重新发射',
        secFaq: '📖 你知道吗？',
        faqBody: '<strong>旅行者2号</strong> 于1977年从地球发射，先后利用了 <strong>木星</strong>(1979)、<strong>土星</strong>(1981)、<strong>天王星</strong>(1986)、<strong>海王星</strong>(1989) 的引力弹弓加速，最终于2018年飞出太阳系日球层！<br><br>每次飞掠，行星的公转动能就"送"给航天器一点速度。观察<span style="color:#fb923c">橙色箭头</span>——那就是每颗行星对航天器施加的引力！',
        bodyNames: {
          sun: '太阳',
          mercury: '水星',
          venus: '金星',
          earth: '地球 🌍',
          mars: '火星',
          jupiter: '木星',
          saturn: '土星',
          uranus: '天王星',
          neptune: '海王星',
          craft: '航天器 🚀',
        },
        nextNames: ['土星', '天王星', '海王星', '太阳系边界'],
      },
      en: {
        docTitle: 'Gravity Assist — Solar System Trajectory Simulation',
        appTitle: '🚀 Gravity Assist — Solar System Trajectory Sim',
        appSubtitle: 'Simulating the Voyager spacecraft gravity assists across the Solar System',
        lblCurSpeed: 'Current Speed:',
        lblSlingshotGain: 'Gravity Assist Gain:',
        lblGravAcc: 'Gravitational Accel:',
        legTraj: 'Actual Trajectory (Gravity Assist)',
        legGhost: 'Linear Trajectory (No Gravity)',
        legGrav: 'Gravity (Towards Planets)',
        secMission: '📡 Mission Status',
        missionStart: '🌍 Departing Earth, destination: Jupiter',
        missionFlyby: (name, next) => `✅ ${name} flyby complete! Next: ${next}`,
        missionDeep: name => `✅ ${name} flyby complete! Heading into deep space…`,
        missionEscape: '🌌 <strong>Mission accomplished!</strong> Escaped the Solar System!',
        secSpeed: '⚡ Spacecraft Velocity',
        lblTotalGain: 'Total Assist Gain:',
        secLog: '📋 Flight Log',
        nameEarth: '🌍 Earth (Launch)',
        nameJupiter: '🪐 Jupiter',
        nameSaturn: '🪐 Saturn',
        nameUranus: '⭐ Uranus',
        nameNeptune: '🔵 Neptune',
        nameEscape: '🌌 Interstellar Escape',
        waiting: 'Waiting…',
        secCtrl: '🎮 Controls',
        lblAnimSpeed: 'Simulation Speed',
        play: '▶ Play',
        pause: '⏸ Pause',
        relaunch: '🔄 Relaunch',
        secFaq: '📖 Did You Know?',
        faqBody: 'Launched in 1977 from Earth, <strong>Voyager 2</strong> utilized successive gravity assists from <strong>Jupiter</strong> (1979), <strong>Saturn</strong> (1981), <strong>Uranus</strong> (1986), and <strong>Neptune</strong> (1989) to reach interstellar space in 2018!<br><br>With each flyby, orbital kinetic energy from the planet is transferred to the probe. The <span style="color:#fb923c">orange dashed arrows</span> represent instantaneous gravitational attraction from each giant planet!',
        bodyNames: {
          sun: 'Sun',
          mercury: 'Mercury',
          venus: 'Venus',
          earth: 'Earth 🌍',
          mars: 'Mars',
          jupiter: 'Jupiter',
          saturn: 'Saturn',
          uranus: 'Uranus',
          neptune: 'Neptune',
          craft: 'Spacecraft 🚀',
        },
        nextNames: ['Saturn', 'Uranus', 'Neptune', 'Solar System Boundary'],
      }
    };

    let currentLang = 'zh';
    const paramsUrl = new URLSearchParams(window.location.search);
    const qLang = paramsUrl.get('lang');
    if (qLang === 'zh' || qLang === 'en') {
      currentLang = qLang;
    } else {
      const saved = localStorage.getItem('science_lang');
      if (saved === 'zh' || saved === 'en') {
        currentLang = saved;
      } else if (navigator.language && !navigator.language.startsWith('zh')) {
        currentLang = 'en';
      }
    }

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
      const n = SLING_I18N[currentLang].bodyNames;
      bodies = [
        // 太阳
        { id:'sun', name:n.sun, x: 100, y: cy, r: 38, color:'#fbbf24', glow:'#f59e0b',
          type:'star', vx:0, vy:0, GM:0 },
        // 内行星（展示用）
        { id:'mercury', name:n.mercury, x: 185, y: cy - 12, r: 3, color:'#94a3b8',
          type:'inner', vx:0, vy:0, GM:0 },
        { id:'venus', name:n.venus, x: 240, y: cy + 8, r: 5, color:'#fcd34d',
          type:'inner', vx:0, vy:0, GM:0 },
        { id:'earth', name:n.earth, x: 320, y: cy, r: 7, color:'#3b82f6',
          type:'home', vx:0, vy:0, GM:0 },
        { id:'mars', name:n.mars, x: 420, y: cy - 18, r: 4.5, color:'#ef4444',
          type:'inner', vx:0, vy:0, GM:0 },
        // 外行星（引力弹弓）—— 精确校准轨道几何与引力场，确保航天器在各行星外侧安全飞掠，绝不与天体本体重叠
        { id:'jupiter', name:n.jupiter, x: 850, y: cy + 30, r: 26, color:'#f59e0b',
          type:'gas', vx: 0.9, vy:0, GM: 100 },
        { id:'saturn', name:n.saturn, x: 1450, y: cy + 0, r: 21, color:'#fbbf24',
          type:'gas', vx: 0.7, vy:0, GM: 120, hasRing: true },
        { id:'uranus', name:n.uranus, x: 2100, y: cy - 45, r: 15, color:'#67e8f9',
          type:'ice', vx: 0.45, vy:0, GM: 90 },
        { id:'neptune', name:n.neptune, x: 2750, y: cy - 40, r: 14, color:'#818cf8',
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
      document.getElementById('btnPlay').innerText = isPlaying ? SLING_I18N[currentLang].pause : SLING_I18N[currentLang].play;
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
        document.getElementById('log' + n).innerText = SLING_I18N[currentLang].waiting;
      });
      document.getElementById('dotEscape').style.background = 'transparent';
      document.getElementById('dotEscape').classList.remove('visited');
      document.getElementById('nameEscape').classList.remove('visited');
      document.getElementById('logEscape').innerText = '—';
      document.getElementById('logEarth').innerText = (Math.hypot(craft.vx, craft.vy) / 0.25).toFixed(1) + ' km/s';
      document.getElementById('missionStatus').innerText = SLING_I18N[currentLang].missionStart;

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
        // PROV: illustrative | 软化引力势（Plummer softening ε²=200） | - | 避免近距离奇点发散（见 spec 09 F13）
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
          document.getElementById('missionStatus').innerHTML = SLING_I18N[currentLang].missionEscape;
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

          // PROV: illustrative | 演示速度标度换算 | - | 速度为交互演示比例，四大行星交会年份为真实旅行者2号时序（见 spec 09 F13）
          const speedGain = m.speedAtPass - (initialSpeed / 0.25);
          document.getElementById('log' + c.id).innerText =
            m.speedAtPass.toFixed(1) + ' km/s (+' + speedGain.toFixed(1) + ')';

          // 更新任务状态
          if (i < checks.length - 1) {
            document.getElementById('missionStatus').innerText =
              SLING_I18N[currentLang].missionFlyby(body.name, SLING_I18N[currentLang].nextNames[i]);
          } else {
            document.getElementById('missionStatus').innerText =
              SLING_I18N[currentLang].missionDeep(body.name);
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

    /* ── 刷新率无关的固定步长驱动 ──
     * updatePhysics() 以"参考 60Hz 帧"为基准记账：高刷屏（144Hz）不再让
     * 模拟跑得更快，低帧率时补帧（上限防切标签页跳变）。 */
    let lastFrame = performance.now();
    let frameDebt = 0;

    function render() {
      const nowMs = performance.now();
      const rdt = Math.min((nowMs - lastFrame) / 1000, 0.05);
      lastFrame = nowMs;

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

      drawLabel(SLING_I18N[currentLang].bodyNames.craft, craft.x, craft.y - 5, '#38bdf8', 38);

      ctx.restore();

      fieldAngle += 0.24 * rdt;          /* 帧率无关的场线旋转 */
      if (isPlaying) {
        frameDebt += rdt * 60;           /* 折算成 60Hz 参考帧数 */
        let n = Math.min(Math.floor(frameDebt), 8);
        frameDebt -= n;
        while (n-- > 0) updatePhysics();
      } else {
        frameDebt = 0;
      }
      requestAnimationFrame(render);
    }

    function hexAlpha(hex, a) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${a})`;
    }

    function setLang(lang) {
      if (lang !== 'zh' && lang !== 'en') return;
      currentLang = lang;
      document.documentElement.lang = lang;
      try {
        localStorage.setItem('science_lang', lang);
      } catch (e) {}

      const u = new URL(window.location.href);
      u.searchParams.set('lang', lang);
      window.history.replaceState({}, '', u.toString());

      const homeBtn = document.getElementById('homeBtn');
      if (homeBtn) {
        homeBtn.href = '../index.html?lang=' + lang;
        const homeTxt = document.getElementById('homeTxt');
        if (homeTxt) homeTxt.textContent = lang === 'en' ? 'Home' : '首页';
      }

      document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
      });

      const t = SLING_I18N[lang];
      document.title = t.docTitle;
      const appTitle = document.getElementById('appTitle');
      if (appTitle) appTitle.textContent = t.appTitle;
      const appSubtitle = document.getElementById('appSubtitle');
      if (appSubtitle) appSubtitle.textContent = t.appSubtitle;

      const lblCurSpeed = document.getElementById('lblCurSpeed');
      if (lblCurSpeed) lblCurSpeed.textContent = t.lblCurSpeed;
      const lblSlingshotGain = document.getElementById('lblSlingshotGain');
      if (lblSlingshotGain) lblSlingshotGain.textContent = t.lblSlingshotGain;
      const lblGravAcc = document.getElementById('lblGravAcc');
      if (lblGravAcc) lblGravAcc.textContent = t.lblGravAcc;

      const legTraj = document.getElementById('legTraj');
      if (legTraj) legTraj.textContent = t.legTraj;
      const legGhost = document.getElementById('legGhost');
      if (legGhost) legGhost.textContent = t.legGhost;
      const legGrav = document.getElementById('legGrav');
      if (legGrav) legGrav.textContent = t.legGrav;

      const secMission = document.getElementById('secMission');
      if (secMission) secMission.textContent = t.secMission;
      const secSpeed = document.getElementById('secSpeed');
      if (secSpeed) secSpeed.textContent = t.secSpeed;
      const lblTotalGain = document.getElementById('lblTotalGain');
      if (lblTotalGain) lblTotalGain.textContent = t.lblTotalGain;
      const secLog = document.getElementById('secLog');
      if (secLog) secLog.textContent = t.secLog;

      const nameEarth = document.getElementById('nameEarth');
      if (nameEarth) nameEarth.textContent = t.nameEarth;
      const nameJupiter = document.getElementById('nameJupiter');
      if (nameJupiter) nameJupiter.textContent = t.nameJupiter;
      const nameSaturn = document.getElementById('nameSaturn');
      if (nameSaturn) nameSaturn.textContent = t.nameSaturn;
      const nameUranus = document.getElementById('nameUranus');
      if (nameUranus) nameUranus.textContent = t.nameUranus;
      const nameNeptune = document.getElementById('nameNeptune');
      if (nameNeptune) nameNeptune.textContent = t.nameNeptune;
      const nameEscape = document.getElementById('nameEscape');
      if (nameEscape) nameEscape.textContent = t.nameEscape;

      const secCtrl = document.getElementById('secCtrl');
      if (secCtrl) secCtrl.textContent = t.secCtrl;
      const lblAnimSpeed = document.getElementById('lblAnimSpeed');
      if (lblAnimSpeed) lblAnimSpeed.textContent = t.lblAnimSpeed;
      const btnPlay = document.getElementById('btnPlay');
      if (btnPlay) btnPlay.textContent = isPlaying ? t.pause : t.play;
      const btnReset = document.getElementById('btnReset');
      if (btnReset) btnReset.textContent = t.relaunch;

      const secFaq = document.getElementById('secFaq');
      if (secFaq) secFaq.textContent = t.secFaq;
      const faqBody = document.getElementById('faqBody');
      if (faqBody) faqBody.innerHTML = t.faqBody;

      // Update body names in memory
      for (const b of bodies) {
        if (t.bodyNames[b.id]) {
          b.name = t.bodyNames[b.id];
        }
      }

      // Update current mission status text if at initial state or escaped
      if (!milestones.jupiter.passed) {
        const ms = document.getElementById('missionStatus');
        if (ms) ms.textContent = t.missionStart;
      } else if (milestones.escaped) {
        const ms = document.getElementById('missionStatus');
        if (ms) ms.innerHTML = t.missionEscape;
      }
    }

    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => setLang(btn.dataset.lang));
    });

    window.addEventListener('storage', e => {
      if (e.key === 'science_lang' && (e.newValue === 'zh' || e.newValue === 'en') && e.newValue !== currentLang) {
        setLang(e.newValue);
      }
    });

    // --- 初始化 ---
    function init() {
      resizeCanvas();
      initStars();
      setLang(currentLang);
      render();
    }
    init();
