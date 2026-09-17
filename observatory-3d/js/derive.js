// derive.js — 「推导链」：把每个仪器的原始读数往后推，织出宇宙的某个方面
// 设计（书 006 第 9 章）：六个推理模式（代理物/三角几何/自然时钟/引力当秤/背景参照/统计总体）
// 是全书的方法论骨架。本组件在 8 个仪器页签的 pipelineBox 末尾挂一张「🧮 推导链」卡：
// 原始读数 → 推理模式 → 方程 → 逐步算术 → 真实结果 → 军规（偏置警示）。
// 所有算术已于 2026-09-17 用 node 逐条验证（见 README 验证节）。
'use strict';

window.APP = window.APP || {};
(function () {
  const P = {
    proxy: { n: '①', name: '代理物', tip: 'X 测不了 → 找与 X 锁定的可观测量' },
    tri:   { n: '②', name: '三角几何', tip: '已知基线 + 测角度 = 距离' },
    clock: { n: '③', name: '自然时钟', tip: '速率已知的过程，比率即年龄' },
    scale: { n: '④', name: '引力当秤', tip: '轨道周期 + 开普勒定律 = 质量' },
    back:  { n: '⑤', name: '背景参照物', tip: '让目标遮挡 / 弯曲 / 染色已知的光' },
    stat:  { n: '⑥', name: '统计总体', tip: '单个模糊 → 上千个一起收敛' },
  };
  const STEP_T = { read: '原始读数', eq: '方程', calc: '逐步算术', res: '真实结果' };

  /* ── 每个页签的推导链（target 可多个，chip 切换）──────────────── */
  const CHAINS = {
    t1: [
      {
        target: '六个推理模式：把"测不了"翻译成"测得了"',
        pattern: null, obs: ['angle', 'time', 'bright', 'wave'],
        steps: [
          { k: 'read', t: '天文学家手里永远只有四样原料：<b>角度、时间、亮度、波长</b>。可我们却知道恒星的质量、星系的距离、宇宙的年龄——全靠六种"翻译套路"：' },
          { k: 'eq', t: P.proxy.n + ' <b>代理物</b>：X 测不了 → 找与 X 严格锁定的可观测量<br>' + P.tri.n + ' <b>三角几何</b>：基线 + 角度 = 距离<br>' + P.clock.n + ' <b>自然时钟</b>：速率已知 → 比率即年龄<br>' + P.scale.n + ' <b>引力当秤</b>：轨道 + 开普勒 = 质量<br>' + P.back.n + ' <b>背景参照物</b>：遮挡 / 弯曲 / 染色已知的光<br>' + P.stat.n + ' <b>统计总体</b>：单个模糊 → 一千个一起收敛' },
          { k: 'calc', t: '每个仪器页签左下角的「🧮 推导链」，就是把那台仪器的读数接进其中一条套路：<br>光谱仪→①（谱线代理温度与成分）· 多普勒→④（引力当秤称行星）· 干涉仪→②（角径×距离）· 探测器→③⑥（周期与统计）…' },
          { k: 'res', t: '<b>模式比结论重要——因为模式能造出下一个发现。</b>勒维特数了 1,777 颗变星（1908），"距离"才有了代理物；哈勃认出其中一颗（1923），宇宙才有了边界。' },
        ],
        bias: '军规三条：① 每个方法都有偏置；② 独立方法必须收敛，"对不上"是礼物（H₀ 之争）；③ 新窗口必有新宇宙。',
      },
    ],
    t2: [
      {
        target: '亮度 + 角度 → 光度与距离（阶梯的起点）',
        pattern: 'tri', obs: ['bright', 'angle'],
        steps: [
          { k: 'read', t: '盖亚卫星（μas 级角度）测得<b>织女星</b>视差 π = 130.2 mas；光度计测得视星等 m = +0.03' },
          { k: 'eq', t: '距离 d(pc) = 1 / π(″)<br>距离模数：M = m + 5 − 5·lg d（M = 10 pc 处的亮度）' },
          { k: 'calc', t: 'd = 1 / 0.1302 = <b>7.68 pc</b><br>M = 0.03 + 5 − 5×lg 7.68 = 0.03 + 5 − 4.42 = <b>+0.61</b>' },
          { k: 'res', t: '织女星绝对星等 +0.61，太阳是 +4.83 → 差 4.22 星等 = <b>织女星比太阳亮 50 倍</b>。口径把 m 量准、天测把 d 量准，"光度"这台仪器 alone 推不出来——<b>读数要接力</b>。' },
        ],
        bias: '军规①：视差只覆盖最近的天体（地面 ~100 pc → 盖亚 ~万 pc）；更远要换代理物（造父、Ia 型超新星）——下一级台阶。',
      },
      {
        target: '口径 → 更暗的极限 → 更早的宇宙',
        pattern: 'stat', obs: ['bright'],
        steps: [
          { k: 'read', t: '人眼瞳孔 D ≈ 7 mm，极限星等 m ≈ 6.5；ELT 口径 D = 39 m' },
          { k: 'eq', t: '集光比 = (D₁/D₂)²<br>极限星等 m_lim ≈ 6.5 + 5·lg(D / 7mm)' },
          { k: 'calc', t: 'ELT 集光 = (39000/7)² = <b>3.1×10⁷ 倍</b>人眼<br>m_lim = 6.5 + 5×lg(39000/7) = <b>25.2 等</b>' },
          { k: 'res', t: '星等差 1 = 亮度比 2.512。比肉眼暗 10¹⁸ 倍的天体 = <b>百亿光年外的年轻星系</b>。口径每翻一倍，可见宇宙的"深 度"就往前推一段。' },
        ],
        bias: '军规①：口径够也不够——还要第 6 页签的分辨率与第 7 页签的探测器效率，三者相乘才是真实灵敏度。',
      },
    ],
    t3: [
      {
        target: '连续谱形状 → 温度（维恩位移）',
        pattern: 'proxy', obs: ['wave'],
        steps: [
          { k: 'read', t: '把星光过棱镜/光栅：连续谱在 λmax = <b>502 nm</b>（绿光）处最亮——这是原始读数，一个波长而已' },
          { k: 'eq', t: '维恩位移定律：T = 2.898×10⁻³ m·K / λmax<br>（λmax 越短 → 温度越高）' },
          { k: 'calc', t: 'T = 2.898×10⁻³ / 502×10⁻⁹ = <b>5,772 K</b><br>参宿七 λmax ≈ 240 nm → T ≈ 12,100 K' },
          { k: 'res', t: '没有温度计能插进恒星——但<b>颜色就是温度计</b>。谱线代理物①：一整条连续谱曲线，吐出一个开尔文数。' },
        ],
        bias: '军规①：星际尘埃会让星光变红（消光），把温度估低；必须用多波段互相校正。',
      },
      {
        target: '吸收线的位置 → 化学成分（宇宙指纹库）',
        pattern: 'proxy', obs: ['wave'],
        steps: [
          { k: 'read', t: '太阳连续谱上叠着几千条暗线（夫琅禾费 1814 年编目，用字母 A–K 命名，连他自己都不知道是什么）' },
          { k: 'eq', t: '基尔霍夫 & 本生（1859）：在实验室给每种元素的火焰光谱建指纹库 → <b>波长对上 = 元素对上</b>' },
          { k: 'calc', t: 'D 线对上钠（589.0/589.6 nm 双线）→ 太阳里有钠；1868 年日珥光谱出现 587.6 nm 的"无名线"→ 新元素！命名为 Helium（太阳的）' },
          { k: 'res', t: '<b>氦在太阳里被发现（1868），27 年后才在地球找到（1895）</b>——"光谱指纹"第一次预言了新元素，天体物理诞生。' },
        ],
        bias: '军规①：谱线强度还受温度、压力、丰度共同影响——解谱是"多解反演"，要用恒星模型约束，不是简单的查表。',
      },
    ],
    t4: [
      {
        target: '摆动的谱线 → 一颗看不见的行星（引力当秤）',
        pattern: 'scale', obs: ['wave', 'time'],
        steps: [
          { k: 'read', t: '51 Peg（飞马座）的谱线以 <b>P = 4.23 天</b>为周期来回摆动；摆幅换算成视向速度 K ≈ 58 m/s（文献 55.2–57.3）' },
          { k: 'eq', t: '开普勒第三定律改写（地球单位）：<br>K ≈ 28.4·(Mp·sin i)·(P/yr)^(−⅓)·(M★/M☉)^(−⅔) m/s' },
          { k: 'calc', t: 'Mp·sin i = 58 / 28.4 × (4.23/365.25)^(⅓) ≈ <b>0.46 M木</b><br>（M★≈1.0 M☉；i 未知 → 这是下限）' },
          { k: 'res', t: '<b>1995 年第一颗绕类日恒星的行星 51 Peg b</b>——看不到它，只看它拽着恒星"抖"了 58 m/s（比 HARPS 还能测的 0.97 m/s 粗 60 倍）。诺奖 2019。' },
        ],
        bias: '军规①：视向速度偏爱"大质量 + 近轨道"（信号强）——所以早期找到的全是热木星；冷木星、地球要等凌星法（第 6/7 页签的接力）。',
      },
      {
        target: '平坦的旋转曲线 → 暗物质（引力当秤的宇宙级）',
        pattern: 'scale', obs: ['wave', 'angle'],
        steps: [
          { k: 'read', t: '测星系盘的 21 cm 氢线：不同半径处的多普勒速度给出<b>旋转曲线 v(r)</b>。太阳位于银河系 r = 8.2 kpc 处，v ≈ 240 km/s' },
          { k: 'eq', t: '圆轨道引力平衡：M(&lt;r) = v²·r / G' },
          { k: 'calc', t: 'M = (2.4×10⁵)² × (8.2×3.086×10¹⁹) / 6.674×10⁻¹¹<br>= 2.18×10⁴¹ kg ÷ 1.989×10³⁰ = <b>1.1×10¹¹ M☉</b>' },
          { k: 'res', t: '可数的恒星 + 气体 ≈ 5–6×10¹⁰ M☉ → <b>至少一半的质量是"暗"的</b>。曲线不衰减 = 外围还有更多——暗物质不是显微镜看到的，是<b>开普勒定律算出来的亏空</b>。' },
        ],
        bias: '军规②：也可以改引力定律（MOND）来消掉亏空——两种假设都活着，靠多路证据收敛（引力透镜、CMB）才站稳暗物质一侧。',
      },
    ],
    t5: [
      {
        target: '角径 × 距离 → 真实尺寸（三角几何收口）',
        pattern: 'tri', obs: ['angle', 'bright'],
        steps: [
          { k: 'read', t: '红外干涉仪测得<b>参宿四</b>角直径 θ ≈ 42 mas；盖亚测其距离 d ≈ 197 pc' },
          { k: 'eq', t: '物理半径 R = d × tan(θ/2) ≈ d·θ/2（小角近似）' },
          { k: 'calc', t: 'R = 197×3.086×10¹⁶ m × (42×4.848×10⁻⁹)/2<br>= 6.19×10¹¹ m ÷ 6.957×10⁸ = <b>≈890 R☉</b>' },
          { k: 'res', t: '参宿四塞进太阳系，<b>表面越过木星轨道</b>。角度本身毫无意义——<b>乘上距离才变成尺寸</b>；而距离又来自视差（②②接力）。' },
        ],
        bias: '军规①：红超巨星有巨大尘埃包层，不同波长测出的"直径"差 20%——42 mas 是特定波段的值。',
      },
      {
        target: '一个影子 → 一个质量（EHT 的 6.5×10⁹ M☉）',
        pattern: 'back', obs: ['angle', 'bright'],
        steps: [
          { k: 'read', t: 'EHT 拍到 M87 中心阴影角直径 ≈ <b>42 μas</b>（地球当镜筒）；已知距离 d ≈ 16.8 Mpc' },
          { k: 'eq', t: '阴影半径 r̂ = √27·GM/c²（史瓦西黑洞的"钥匙孔"比视界大 2.6 倍）<br>→ M = r̂/√27 × c²/G' },
          { k: 'calc', t: 'r̂ = 16.8 Mpc × (21 μas) = 5.28×10¹³ m<br>M = 5.28×10¹³/5.196 × 8.988×10¹⁶/6.674×10⁻¹¹ = <b>6.9×10⁹ M☉</b>' },
          { k: 'res', t: 'EHT 发表值 <b>6.5×10⁹ M☉</b>（42±3 μas 的误差 + 建模差）→ 与引力动力学法（恒星/气体绕转）<b>独立收敛</b>——军规②的教科书案例。' },
        ],
        bias: '军规①：阴影大小依赖黑洞自旋与吸积模型（±20%）；这就是为什么还要恒星动力学第二条路。',
      },
    ],
    t6: [
      {
        target: 'μas 级位置 → 视差 → 整个宇宙的距离骨架',
        pattern: 'tri', obs: ['angle', 'time'],
        steps: [
          { k: 'read', t: '1838 年贝塞尔盯着天鹅座 61 一整年：它相对背景移动了 <b>π ≈ 0.3″</b>（哥白尼 1543 年预言的摆动，等了 295 年）' },
          { k: 'eq', t: '1 pc 的定义：视差 1″ 对应的距离 → d(pc) = 1/π(″)' },
          { k: 'calc', t: 'd = 1/0.3 = 3.3 pc ≈ 11 光年（现代值 0.286″ → 11.4 ly）<br>盖亚：20 亿颗星、精度 0.015–2 mas → 太阳系外<b>第一个三维大地图</b>' },
          { k: 'res', t: '<b>人类第一次"摸到"恒星的距离</b>——之后所有更远的尺子（造父、Ia、哈勃律）都钉在这根视差地基上。AO/天测卫星把 ②推到 μas，地基就延伸到万秒差距。' },
        ],
        bias: '军规①：视差天生只管"近"。地基之外的一切距离都是<b>接力代理物</b>，每接一棒误差就累积一截（→ 第 7 页签的阶梯）。',
      },
      {
        target: 'AO + 日冕仪 → 给系外行星直接拍照',
        pattern: 'back', obs: ['angle', 'bright'],
        steps: [
          { k: 'read', t: '2004 年 VLT + 自适应光学（本页签的技术）：在 2M1207 恒星旁 0.78″ 处直接拍到一枚暗红斑点' },
          { k: 'eq', t: '能否拍到 = 角分离 vs 衍射极限 + 残余光晕：AO 把 0.5″ 光斑压到 ~0.02″，行星才不被恒星光淹没' },
          { k: 'calc', t: '0.78″ ÷ 0.02″ ≈ 40 倍分离 → 斑点可分辨；红外颜色像冷天体 → 确认为共动伴星' },
          { k: 'res', t: '<b>2M1207b：第一颗被直接成像的系外行星</b>。AO 的价值不在"看得清"，在<b>把恒星的眩光压下去</b>——从百万比一压到十万比一，暗斑才浮出。' },
        ],
        bias: '军规①：直接成像偏爱"年轻 + 热 + 轨道很远"的行星；要找地球 2.0 还得等下一代星冕仪。',
      },
    ],
    t7: [
      {
        target: '光子计数的时间序列 → 周期 → 距离（阶梯第一级）',
        pattern: 'clock', obs: ['time', 'bright'],
        steps: [
          { k: 'read', t: '探测器逐帧记录某星亮度 → 一条<b>光变曲线</b>：周期性脉动，周期 P = <b>10 天</b>（示例）' },
          { k: 'eq', t: '勒维特定律（1908，数了 1,777 颗变星）：<br>M_V = −2.76·lg P − 1.40；距离模数 μ = m − M → d = 10^(1+μ/5) pc' },
          { k: 'calc', t: 'M_V = −2.76×1 − 1.40 = <b>−4.16</b><br>若测得 m = 14.16 → μ = 18.32 → d = 10^(1+3.66) = <b>4.6×10⁴ pc ≈ 15 万光年</b>（示例数字，方法真实）' },
          { k: 'res', t: '<b>测时间就能得距离</b>——因为造父的周期与光度严格锁定（代理物①）。1923 年哈勃在仙女座认出一颗，一锤定音"银河系不是全部"。' },
        ],
        bias: '军规①+②的百年案例：早期把造父当单一种类，哈勃 1929 年的 H₀ = 500；1952 年巴德发现两族造父 → H₀ 砍半再砍半 → 今日 73.0±1.0（SH0ES）vs 67.4±0.5（Planck），张力 >5σ——<b>仍在进行的军规②</b>。',
      },
      {
        target: '光子计数 + 统计 → 检出极限（信噪比）',
        pattern: 'stat', obs: ['bright', 'time'],
        steps: [
          { k: 'read', t: '某暗星 1000 秒累计 900 个信号电子（QE = 0.85，进来的光子 ≈ 1060 个）' },
          { k: 'eq', t: '散粒噪声 σ = √N → 信噪比 SNR = N/√N = √N' },
          { k: 'calc', t: 'SNR = √900 = <b>30</b>（3% 精度）<br>想把精度翻 10 倍 → 需要 N ×100 → <b>曝光 100 倍（10 万秒）</b>' },
          { k: 'res', t: '单个光子毫无意义，<b>定律活在计数里</b>：√N 增长是探测器给天文学定下的节奏——深场照片为什么按小时/天曝光，答案就是这行算术。' },
        ],
        bias: '军规①：还有读出噪声、暗电流、宇宙线 hits——真实 SNR 分母更长；QE 85% 意味着 15% 的光子永远丢失。',
      },
    ],
    t8: [
      {
        target: '两路数据 → 距离 + 质量（标准汽笛）',
        pattern: 'back', obs: ['time', 'bright'],
        steps: [
          { k: 'read', t: 'GW150914 只给了两样东西：应变幅度 h ≈ 10⁻²¹（臂长 4 km 伸缩 4×10⁻¹⁸ m）+ 频率的"啁啾"轨迹' },
          { k: 'eq', t: '幅度 ∝ 1/距离 → <b>距离</b>；啁啾速率 ∝ 啁啾质量^(5/3) → <b>质量</b>。引力波振幅自带"标准音量"——标准汽笛。' },
          { k: 'calc', t: '波形反演：36 + 29 → 62 M☉，3 M☉ 在 0.2 秒内化成引力波；幅度 → 距离 <b>13 亿光年</b>' },
          { k: 'res', t: '<b>三条信息（距离、两个质量）全部来自时间+幅度</b>，不需要任何光度阶梯——史上最省的测量。2017 年 GW170817 + 1.7 秒后的 γ 暴：H₀ ≈ 70，独立第三票。' },
        ],
        bias: '军规①：幅度→距离在"边看边转"时会平均掉取向信息（哑铃侧对 vs 正对差 2 倍）；单事件距离误差可达数十个百分点。',
      },
      {
        target: '纳秒时间差 → 方向 → 一颗耀变体（多信使收敛）',
        pattern: 'tri', obs: ['time', 'angle'],
        steps: [
          { k: 'read', t: '2017-09-22，IceCube 记到一颗 ~290 TeV 中微子：86 根弦上 5,160 个 DOM 的<b>到达时刻差</b>（纳秒级）' },
          { k: 'eq', t: '切伦科夫光锥（冰中 ~41° 半角）扫过不同深度 → 时间差 = 三角定位的原始数据' },
          { k: 'calc', t: '重建方向误差 <b>≈0.15°</b>；分钟级实时警报，4 小时后 GCN 快报精化' },
          { k: 'res', t: '该方向的耀变体 <b>TXS 0506+056</b> 恰在 γ 耀发（费米确认，~3σ）→ 人类第一次把一颗宇宙中微子<b>钉回具体天体</b>。信使换了，语言仍是时间与角度。' },
        ],
        bias: '军规②：~3σ 只是"候选"——独立的正确姿势是等下一个事件、更多信使一起说话。',
      },
    ],
  };

  /* ── 渲染 ────────────────────────────────────────────────────── */
  let state = {};   // tabId → { chainIdx, stepIdx }

  function observIcons(list) {
    return (list || []).map(o => {
      const m = APP.DATA.OBSERV_META[o];
      return m ? '<span class="dc-obs">' + m.label + '</span>' : '';
    }).join('');
  }
  function badge(chain) {
    if (!chain.pattern) return '';
    const p = P[chain.pattern];
    return '<span class="dc-badge" title="' + p.tip + '">🧭 ' + p.n + p.name + '</span>';
  }

  function render(tabId) {
    const box = document.getElementById('pipelineBox');
    if (!box) return;
    const chains = CHAINS[tabId];
    if (!chains || !chains.length) return;
    const st = state[tabId] || (state[tabId] = { c: 0, s: 0 });
    if (st.c >= chains.length) st.c = 0;
    const chain = chains[st.c];

    const card = document.createElement('details');
    card.className = 'derive-card';
    card.open = true;
    let html =
      '<summary>🧮 推导链 · 这台仪器的读数怎么推出宇宙？</summary>' +
      '<div class="dc-target">' + chain.target + ' ' + badge(chain) + ' ' + observIcons(chain.obs) + '</div>' +
      '<div class="dc-steps">';
    for (let i = 0; i <= st.s && i < chain.steps.length; i++) {
      const sp = chain.steps[i];
      html += '<div class="dc-st dc-' + sp.k + '"><div class="dc-k">' + (STEP_T[sp.k] || sp.k) + '</div><div class="dc-t">' + sp.t + '</div></div>';
    }
    html += '</div>';
    if (st.s < chain.steps.length - 1) {
      html += '<div class="dc-nav"><button class="chip dc-next">走一步 →</button><span class="dc-prog">' + (st.s + 1) + ' / ' + chain.steps.length + '</span></div>';
    } else {
      html += '<div class="dc-bias">⚖️ ' + chain.bias + '</div>';
    }
    if (chains.length > 1) {
      html += '<div class="chip-row dc-chips">' + chains.map((c, i) =>
        '<button class="chip' + (i === st.c ? ' on' : '') + '" data-i="' + i + '">' + c.target.split('（')[0].split('：')[0].slice(0, 14) + '</button>').join('') + '</div>';
    }
    card.innerHTML = html;
    box.appendChild(card);

    const nxt = card.querySelector('.dc-next');
    if (nxt) nxt.addEventListener('click', () => { st.s++; replaceCard(card, tabId); });
    card.querySelectorAll('.dc-chips .chip').forEach(ch =>
      ch.addEventListener('click', () => { state[tabId] = { c: +ch.dataset.i, s: 0 }; replaceCard(card, tabId); }));
  }
  /* replace helper: rebuild the card in place */
  function replaceCard(old, tabId) {
    const box = document.getElementById('pipelineBox');
    if (!box) return;
    old.remove();
    render(tabId);
  }

  function mount(tabId) {
    const box = document.getElementById('pipelineBox');
    if (!box) return;
    box.querySelectorAll('.derive-card').forEach(d => d.remove());
    delete state[tabId];
    render(tabId);
  }

  window.APP.Derive = { mount, CHAINS, PATTERNS: P };
})();
