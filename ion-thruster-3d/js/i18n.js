/**
 * js/i18n.js - Complete bilingual (zh-CN / en-US) dictionary for Ion Thruster 3D
 */

export const THRUSTER_I18N = {
  zh: {
    pageTitle: '🚀 离子推进器 · 3D 交互式工作原理',
    homeTxt: '首页',
    headerTitle: '🚀 离子推进器 · 3D 交互式工作原理',
    subtitle: '参考 NASA NSTAR / NEXT / ESA T6 栅格离子推进器 — 真实深空探测电推进工程',
    missionLabel: '深空任务预设：',
    missions: {
      NSTAR_DAWN: '🛸 黎明号 NSTAR (30cm)',
      NEXT_NASA: '🚀 NASA NEXT (40cm)',
      BEPICOLOMBO_T6: '🪐 贝皮科伦坡 T6',
      LIPS_300: '🇨🇳 天宫/实践 LIPS-300'
    },
    missionDetails: {
      destinations: '目标天体 / 载荷',
      burnHours: '点火记录',
      highlight: '核心技术亮点',
      beamDia: '束直径',
      nomThrust: '额定推力',
      nomIsp: '额定比冲',
      inPower: '输入功率',
      exhaustVe: '排气速度',
      NSTAR_DAWN: {
        name: 'NASA 黎明号 (Dawn) · NSTAR',
        destinations: '灶神星 (Vesta) 与 谷神星 (Ceres) 小行星带',
        burnHours: '48,700 小时 (5.5 年累计点火，创深空记录)',
        highlight: '人类首个先后环绕两颗地外天体的深空探测器，累计提供 11.5 km/s 速度增量 (Δv)。'
      },
      NEXT_NASA: {
        name: 'NASA 下一代离子推进器 · NEXT',
        destinations: 'DART 双小行星重定向测试 (备选) 与外行星旗舰探测',
        burnHours: '51,184 小时地面连续寿命测试 (耗费 918 kg 氙气无故障)',
        highlight: '更大孔径与 4170 秒超高比冲，大幅降低深空飞行时间与燃料消耗。'
      },
      BEPICOLOMBO_T6: {
        name: 'ESA 水星探测器 · T6 离子推进器',
        destinations: '水星 (Mercury) 极端引力场捕获轨道',
        burnHours: '4台 T6 推进器轮流工作，抗衡太阳强引力刹车制动',
        highlight: '水星距太阳最近，需要巨大的负向加速才能克服太阳引力坠落，离子电推是唯一可行方案。'
      },
      LIPS_300: {
        name: '中国空间站/实践二十号 · LIPS-300',
        destinations: '天宫空间站轨道维持、实践二十号东方红五号大型卫星平台',
        burnHours: '设计寿命 >15,000 小时，多次完成空间轨道维持试验',
        highlight: '航天五院510所研制，三栅极高寿命设计，大幅减少空间站每年推进剂补给需求。'
      }
    },
    tools: {
      explore: '自由探索',
      tour: '引导浏览（分步讲解）',
      cut: '放电室剖面视图',
      explode: '爆炸分离视图',
      follow: '跟随一颗离子飞出栅格',
      aperture: '🔬 栅格单孔微观等离子体透镜视图',
      gimbal: '🎛️ 常平架推力矢量偏转',
      gridMode: '📐 双栅极 / 三栅极 (Decel Grid) 切换',
      sound: '🔊 引擎声效开关',
      labels: '部件标签',
      mag: '环形尖点磁力线',
      field: '栅格间加速电场'
    },
    followChip: '🎯 正在跟随一颗 Xe⁺ 离子穿越栅格…（再次点击 🎯 退出）',
    gimbal: {
      title: '🎛️ 常平架推力矢量',
      subtitle: 'Gimbal 2-Axis',
      pitch: '俯仰角 (Pitch):',
      yaw: '偏航角 (Yaw):',
      reset: '回正 0°'
    },
    stats: {
      thrust: '推力',
      isp: '比冲',
      ve: '排气速度',
      mdot: '质量流量',
      ib: '束电流',
      pow: '总功率',
      eff: '电气效率'
    },
    controls: {
      pause: '⏸ 暂停',
      resume: '▶ 继续',
      reset: '🔄 重置粒子',
      camera: '🎥 重置视角',
      screenV: '屏栅电压 (屏极)',
      accelV: '加速极电压',
      flow: '氙气流量',
      time: '时间流速'
    },
    legend: {
      atom: '氙原子 (Xe⁰)',
      ion: 'Xe⁺ 离子束',
      plume: '中和原子 (羽流)',
      cathode: '阴极轰击电子',
      neutralizerE: '中和电子',
      magLines: '尖点磁力线'
    },
    tourNav: {
      prev: '← 上一步',
      next: '下一步 →',
      exit: '退出'
    },
    tour: [
      {
        title: '🛰 总览 — 栅格静电离子推进器',
        text: '参考 NASA NSTAR / NEXT 真实工程：“黎明号”与“深空一号”同款技术架构。<strong>高压贮箱供氙 → 空心阴极起弧电离 → 环形尖点磁场增效 → 双/三栅极静电加速 → 外置中和器中和</strong>。推力虽仅几十至几百毫牛，但比冲高达化学火箭的 10 倍，可连续工作数万小时！'
      },
      {
        title: '① 氙气供应与反向供气歧管',
        text: '氙气常温高压储存（150 bar），经比例流量阀以毫克/秒量级节流。<strong>反向供气环</strong>位于栅极前方，朝后方反吹喷气；微量支路供电离阴极与中和器。拖动“氙气流量”滑块观察气体补充。'
      },
      {
        title: '② 空心阴极与环形尖点磁约束',
        text: '<strong>中心空心阴极</strong>加热发射热电子；<strong>环形钐钴磁钢（交替极性 N-S-N）</strong>构建内壁尖点磁屏蔽，迫使电子沿磁力线做 <strong>Larmor 螺旋回旋</strong>并受磁镜反射，大幅增加与氙原子的碰撞电离概率！'
      },
      {
        title: '③ 球面静电栅极与单孔微透镜',
        text: '<strong>球面冲压屏栅极 (+1500V)</strong> 与 <strong>加速栅极 (−300V)</strong> 相距仅 2 mm。等离子体界面自然凹陷成<strong>静电聚焦透镜</strong>，将离子抽离并加速至 <strong>47 km/s</strong>！点击左侧 🔬 可进入单孔微观视图探索导流匹配。'
      },
      {
        title: '④ 外置中和器与空间电荷平衡',
        text: '外置空心阴极向排气羽流注入等量电子。<strong>中和正电荷</strong>是离子推进器的生命线——若不中和，探测器带负电瞬间将离子束全部吸回，推力归零并烧毁壳体。中和后形成安静、深邃的天蓝色中性羽流。'
      },
      {
        title: '⑤ 常平架推力矢量偏转 (Gimbal)',
        text: '深空飞行数年，燃料消耗使飞船质心缓慢漂移。<strong>两轴常平架（±5°）</strong>实时微调推力矢量对准飞船质心，防止翻滚失控。点击左侧 🎛️ 可直接操控推力矢量偏转！'
      }
    ],
    aperture: {
      title: '🔬 栅格单孔微观离子光学 · 等离子体鞘层凹透镜',
      close: '✕ 关闭',
      screenV: '屏极电压:',
      density: '等离子体密度:',
      threeGrid: '当前：三栅极 (Screen + Accel + Decel)',
      twoGrid: '当前：双栅极 (Screen + Accel)',
      focusState: '聚焦状态：',
      pervRatio: '导流系数比 (Perveance Ratio)：',
      safeMargin: '孔壁安全间隙裕度：',
      regimes: {
        optimal: '✅ 最佳匹配 (Optimal)',
        under: '⚠️ 欠聚焦 (Under-focused / Impingement)',
        over: '⚡ 过聚焦 (Over-focused)'
      },
      desc: {
        optimal: '最佳导流匹配：等离子体鞘层界面（Meniscus）受等离子体热压与电场拉力平衡形成凹面，天然构成凹面静电聚焦透镜，将提取的离子精准聚焦成细窄束腰（Beamlet Waist），穿过加速栅孔心而完全不碰伤栅极孔壁（避免溅射腐蚀）。',
        under: '欠聚焦：等离子体过密或提取电压不足，鞘层前凸，离子束发散过大，边缘离子直接轰击加速栅孔壁（造成严重的孔径侵蚀与栅极寿命短路！）。',
        over: '过聚焦：电场拉力过强，鞘层凹陷过深导致离子在孔径内发生轨迹交叉（Beamlet Crossover），在加速栅出口形成过大发散角，增加溅射与杂散粒子。'
      }
    },
    hint: '拖拽旋转 · 滚轮缩放 · 右键平移<br>点击任意部件查看详解 · 空格暂停 · Esc 退出模式',
    loading: '正在构建 3D 场景…',
    tooltipSuffix: ' · 点击查看详解',
    labels3D: {
      solar: '太阳能电池翼',
      ppu: 'PPU 电源处理器',
      tank: '氙气 COPV 贮箱',
      pipe: '流量控制阀',
      cathode: '中心空心阴极',
      magnets: '环形尖点磁钢 (SmCo)',
      plenum: '反向供气喷嘴环',
      chamber: '放电室阳极',
      screen: '屏栅极 (+1500V)',
      accel: '加速栅极 (−300V)',
      neutralizer: '外置中和器',
      plume: '高比冲离子束 ~47 km/s',
      gimbal: '常平架矢量机构 (2-Axis)'
    },
    info: {
      solar: {
        name: '太阳能电池阵翼',
        desc: '深空探测器远离太阳，光照按平方反比衰减。“黎明号”翼展近 <strong>19 m</strong>，在 2.8 AU 处依然能提供千瓦级电力驱动 PPU。',
        chips: ['三结砷化镓', '翼展 19 m', '提供 2.3–10 kW 电力']
      },
      ppu: {
        name: '电源处理单元 (PPU)',
        desc: '推进系统的“心脏控制中心”：把太阳能母线电压变换成多路高低压电源——阴极加热电流、放电电压、屏栅极 <strong>+1500 V 束电源</strong>、加速极 <strong>−300 V</strong> 及中和器供电。',
        chips: ['效率 ~93%', '多路高压隔离输出', '自主故障保护']
      },
      tank: {
        name: '氙气储罐 (COPV)',
        desc: '碳纤维缠绕铝内胆高压储罐（<strong>150 bar</strong>）。选氙（Xe）是因为：<strong>惰性安全</strong>、原子量大（<strong>131.3 u</strong>）、电离能低（<strong>12.13 eV</strong>），常温超临界高密度储存。“黎明号”携带 425 kg 氙气支持了 11 年深空飞行。',
        chips: ['Xe 原子量 131.3 u', '储存压力 150 bar', '电离能 12.13 eV']
      },
      pipe: {
        name: '推进剂供气管路与比例阀',
        desc: '双级精密减压阀与比例流量控制器，将高压气瓶精确节流至 <strong>毫克/秒 (mg/s)</strong>：主流量送至放电室，微量支路同时供给空心阴极与中和器。',
        chips: ['流量 mg/s 级', '热节流阀', '多支路分配']
      },
      cathode: {
        name: '放电室中心空心阴极',
        desc: '电子枪源：内置低逸出功 <strong>LaB₆</strong>（六硼化镧）或 BaO-W 发射体，通电加热至 <strong>>1000 °C</strong> 产生热电子发射。外设金属触极盘（Keeper）引燃电弧，持续向放电室内喷射电子撞击氙气。',
        chips: ['LaB₆ 发射体', '热电子发射', '触极 Keeper 引弧']
      },
      plenum: {
        name: '反向供气喷嘴歧管环',
        desc: '环形不锈钢管环绕在屏栅极前端，喷嘴<strong>朝后方（锥段）反向喷射</strong>氙气。这极大增加了氙原子在放电室内的停留时间与循环行程，将气体电离利用率提升至 <strong>85% 以上</strong>。',
        chips: ['反向反吹设计', '大幅提升停留时间', '电离利用率 >85%']
      },
      chamber: {
        name: '放电室与阳极内壁',
        desc: '“电离工厂”：筒体作为正阳极（约 <strong>+25 V</strong>）。电子在尖点磁场约束下反复回旋游弋，高速撞击中性氙原子：<strong>Xe + e⁻ → Xe⁺ + 2e⁻</strong>。',
        chips: ['阳极电压 ~25 V', '电子撞击电离', '等离子体密度 10¹² cm⁻³']
      },
      magnets: {
        name: '环形尖点磁钢 (SmCo)',
        desc: '钐钴高强永磁体沿轴向排布为<strong>交替极性环（N-S-N）</strong>，在内壁形成磁屏蔽拱弧（尖点场）。中心区域近乎无磁场保证束流均匀；近壁强磁场约束电子沿磁力线螺旋回旋，大幅延长碰撞行程。',
        chips: ['轴向交替极性', '磁镜反射电子', '中心低杂散磁场']
      },
      screen: {
        name: '球面屏栅极 (Screen Grid)',
        desc: '<strong>球面冲压微弧形状</strong>（抗热变形），开有数千个高精度微孔（开孔率 ~67%）。带 <strong>+1500 V</strong> 高压，是离子的出发平台。与放电室等离子体交界面形成凹形等离子体鞘层（Meniscus）。',
        chips: ['+1500 V', '球面凹凸抗变形', '开孔率 ~67%']
      },
      accel: {
        name: '球面加速极 (Accel Grid)',
        desc: '与屏栅极相距仅约 <strong>1.5–2.0 mm</strong>，施加 <strong>−300 V</strong> 强负压。极强静电场将正离子瞬间加速至 <strong>30–50 km/s</strong>！负电位同时构筑势垒，严禁下游电子倒流入放电室。',
        chips: ['−300 V', '间隙 1.5–2.0 mm', '防电子倒流 (Backstreaming)']
      },
      decel: {
        name: '减速接地栅 (Decel Grid)',
        desc: '第三片金属栅极（地电位 0V）。阻挡离子束与空间中性气体发生<strong>电荷交换 (CEX)</strong> 产生的慢离子倒吸腐蚀加速栅极，大幅延长推进器使用寿命至 <strong>50,000+ 小时</strong>。',
        chips: ['地电位 0 V', '三栅极长寿命设计', '减少 CEX 离子腐蚀']
      },
      neutralizer: {
        name: '外置中和器',
        desc: '独立空心阴极，向排出的正离子束注入等量<strong>电子</strong>保持整船电中性。若缺少中和，探测器将迅速积攒巨大负电荷，把正离子全拉回来，导致推力彻底归零并打火烧毁器壁。',
        chips: ['发射等量电子', '消除空间电荷积聚', '防止正离子回吸']
      },
      plume: {
        name: '高比冲离子羽流',
        desc: '高能氙离子发射出特征<strong>天蓝/淡紫色辉光</strong>。排气速度达到 <strong>40–50 km/s</strong>（化学火箭的 10 倍以上！）。单台推力约 <strong>92–236 mN</strong>，但连续推进数年可积累巨大速度增量。',
        chips: ['排速 40–50 km/s', '比冲 3100–4200 s', '淡紫色氙离子发光']
      },
      gimbal: {
        name: '两轴常平架推力矢量机构',
        desc: '双轴常平架支撑环与两台机电直线作动器，提供 <strong>±5° 俯仰与偏航推力偏转</strong>。当主推力点火、氙气消耗使探测器质心漂移时，常平架实时修正推力线对准质心，实现姿轨一体化控制。',
        chips: ['双轴偏转 ±5°', '质心自适应对齐', '机电推杆伺服']
      },
      bus: {
        name: '探测器本体',
        desc: '深空探测器主框架，外覆金色多层隔热组件 (MLI)，搭载恒星敏感器、星载计算机与推进推进剂管路系统。',
        chips: ['金色 MLI 隔热', '星敏感器', '承力主结构']
      }
    }
  },

  en: {
    pageTitle: '🚀 Ion Thruster · 3D Interactive Working Principle',
    homeTxt: 'Home',
    headerTitle: '🚀 Ion Thruster · 3D Interactive Principle',
    subtitle: 'Based on NASA NSTAR / NEXT & ESA T6 Gridded Ion Thrusters — Deep Space Electric Propulsion',
    missionLabel: 'Mission Presets:',
    missions: {
      NSTAR_DAWN: '🛸 Dawn NSTAR (30cm)',
      NEXT_NASA: '🚀 NASA NEXT (40cm)',
      BEPICOLOMBO_T6: '🪐 BepiColombo T6',
      LIPS_300: '🇨🇳 Tiangong LIPS-300'
    },
    missionDetails: {
      destinations: 'Target Bodies / Payload',
      burnHours: 'Burn Records',
      highlight: 'Core Engineering Highlights',
      beamDia: 'Beam Diameter',
      nomThrust: 'Nominal Thrust',
      nomIsp: 'Nominal Isp',
      inPower: 'Input Power',
      exhaustVe: 'Exhaust Speed',
      NSTAR_DAWN: {
        name: 'NASA Dawn / Deep Space 1 — NSTAR 30cm',
        destinations: 'Asteroid Belt: Vesta & Ceres orbits',
        burnHours: '48,700 hours (5.5 years cumulative burn, deep space record)',
        highlight: 'First spacecraft to orbit two separate extraterrestrial bodies, providing 11.5 km/s total velocity change (Δv).'
      },
      NEXT_NASA: {
        name: 'NASA Evolutionary Xenon Thruster (NEXT-C) 40cm',
        destinations: 'DART double-asteroid redirection backup & outer planet flagships',
        burnHours: '51,184 hours continuous ground life-test (918 kg Xe without failure)',
        highlight: 'Larger aperture and 4170 s ultra-high Isp, radically cutting transit durations and propellant load.'
      },
      BEPICOLOMBO_T6: {
        name: 'ESA/JAXA BepiColombo — QinetiQ T6 22cm',
        destinations: 'Mercury extreme gravitational capture insertion',
        burnHours: '4x T6 thruster cluster cycling continuously to brake against solar pull',
        highlight: 'Proximity to the Sun requires enormous reverse velocity reduction against solar gravity.'
      },
      LIPS_300: {
        name: 'CNSA Tiangong / Shijian-20 — LIPS-300',
        destinations: 'Tiangong Space Station orbit keeping & DFH-5 satellite bus',
        burnHours: 'Designed life >15,000 hours, completed multi-campaign flight tests',
        highlight: 'Triple-grid high-endurance design by CAST 510, drastically curtailing annual propellant resupply.'
      }
    },
    tools: {
      explore: 'Free Orbit Explore',
      tour: 'Guided Tour (Step-by-step)',
      cut: 'Discharge Chamber Cutaway',
      explode: 'Exploded Disassembly View',
      follow: 'Follow an Ion through Grids',
      aperture: '🔬 Single-Aperture Plasma Meniscus Optics',
      gimbal: '🎛️ 2-Axis Thrust Gimbal Vectoring',
      gridMode: '📐 Dual-Grid / Triple-Grid (Decel) Mode',
      sound: '🔊 Engine Audio Toggle',
      labels: 'Component Labels',
      mag: 'Ring-Cusp Magnetic Lines',
      field: 'Inter-Grid Electric Field'
    },
    followChip: '🎯 Following a Xe⁺ ion accelerating through grids... (Click 🎯 to exit)',
    gimbal: {
      title: '🎛️ Thrust Vector Gimbal',
      subtitle: 'Gimbal 2-Axis',
      pitch: 'Pitch Angle:',
      yaw: 'Yaw Angle:',
      reset: 'Center 0°'
    },
    stats: {
      thrust: 'Thrust',
      isp: 'Isp',
      ve: 'Exhaust Speed',
      mdot: 'Mass Flow',
      ib: 'Beam Current',
      pow: 'Total Power',
      eff: 'Efficiency'
    },
    controls: {
      pause: '⏸ Pause',
      resume: '▶ Resume',
      reset: '🔄 Reset Particles',
      camera: '🎥 Reset Camera',
      screenV: 'Screen Grid (+V)',
      accelV: 'Accel Grid (−V)',
      flow: 'Xenon Flow',
      time: 'Time Scale'
    },
    legend: {
      atom: 'Xenon Atoms (Xe⁰)',
      ion: 'Xe⁺ Ion Beam',
      plume: 'Neutralized Plume',
      cathode: 'Cathode Electrons',
      neutralizerE: 'Neutralizer Electrons',
      magLines: 'Ring Cusp B-Lines'
    },
    tourNav: {
      prev: '← Previous',
      next: 'Next →',
      exit: 'Exit'
    },
    tour: [
      {
        title: '🛰 Overview — Gridded Electrostatic Ion Thruster',
        text: 'Based on flight-proven NASA NSTAR / NEXT architecture used on Dawn and Deep Space 1: <strong>High-pressure Xenon storage → Hollow cathode arc discharge → Ring-cusp magnetic confinement → Electrostatic grid acceleration → External neutralizer cathode</strong>. Yields 10x the specific impulse of chemical engines!'
      },
      {
        title: '① Propellant Storage & Reverse Plenum',
        text: 'Xenon propellant is stored at high pressure (150 bar) and throttled to milligrams per second. The <strong>reverse plenum ring</strong> blows gas backward into the chamber, greatly boosting residency time and ionization efficiency (>85%).'
      },
      {
        title: '② Hollow Cathode & Ring-Cusp Magnetic Confinement',
        text: 'The <strong>center hollow cathode</strong> emits hot primary electrons. <strong>Alternating samarium-cobalt magnet rings (N-S-N)</strong> create a magnetic mirror barrier on the chamber wall, trapping electrons into helical Larmor spirals to dramatically increase collision ionization.'
      },
      {
        title: '③ Dished Electrostatic Grids & Aperture Micro-Lens',
        text: 'The <strong>screen grid (+1500V)</strong> and <strong>accel grid (−300V)</strong> are spaced just 2 mm apart. The plasma boundary naturally indents into a <strong>concave electrostatic lens</strong>, accelerating ions up to <strong>47 km/s</strong> without grid erosion! Click 🔬 to inspect single-hole optics.'
      },
      {
        title: '④ External Neutralizer & Space-Charge Balance',
        text: 'An external cathode injects an equal electron flux into the exhaust beam. <strong>Neutralizing positive charge</strong> is vital—without it, the negatively charged spacecraft would violently suck the ion beam back, dropping thrust to zero and sputtering the hull.'
      },
      {
        title: '⑤ 2-Axis Thrust Vector Gimbal',
        text: 'Across multi-year missions, fuel consumption causes spacecraft center-of-mass drift. A <strong>two-axis gimbal ring (±5°)</strong> continuously trims the thrust vector to point through the center of mass, preventing tumble.'
      }
    ],
    aperture: {
      title: '🔬 Microscopic Ion Optics · Sheath Meniscus Lens',
      close: '✕ Close',
      screenV: 'Screen Voltage:',
      density: 'Plasma Density:',
      threeGrid: 'Current: Triple-Grid (Screen + Accel + Decel)',
      twoGrid: 'Current: Dual-Grid (Screen + Accel)',
      focusState: 'Focusing State:',
      pervRatio: 'Perveance Ratio:',
      safeMargin: 'Clearance Margin:',
      regimes: {
        optimal: '✅ Optimal Match',
        under: '⚠️ Under-focused (Impingement Risk)',
        over: '⚡ Over-focused (Crossover)'
      },
      desc: {
        optimal: 'Optimal perveance match: The plasma meniscus balances thermal pressure and electrostatic pull into a natural concave electrostatic lens, focusing extracted ions into a narrow beamlet waist that traverses the aperture center without grid wall impingement.',
        under: 'Under-focused: Plasma density too high or extraction voltage too low. The sheath bulges downstream, causing wide beam divergence that directly bombards the accelerator aperture walls (severe sputtering erosion and short-circuit risk!).',
        over: 'Over-focused: Electric extraction field is excessively strong, bowing the meniscus too deeply. Ion trajectories cross over inside the gap, producing excessive beam divergence and downstream erosion.'
      }
    },
    hint: 'Drag to rotate · Scroll to zoom · Right-click to pan<br>Click any component for details · Space to pause · Esc to exit',
    loading: 'Building 3D Scene…',
    tooltipSuffix: ' · Click for details',
    labels3D: {
      solar: 'Solar Array Wings',
      ppu: 'PPU Power Processor',
      tank: 'Xenon COPV Tank',
      pipe: 'Flow Control Valve',
      cathode: 'Discharge Cathode',
      magnets: 'Ring Cusp Magnets',
      plenum: 'Reverse Plenum Ring',
      chamber: 'Discharge Chamber Anode',
      screen: 'Screen Grid (+1500V)',
      accel: 'Accel Grid (−300V)',
      neutralizer: 'Neutralizer Cathode',
      plume: 'High-Isp Ion Beam ~47 km/s',
      gimbal: '2-Axis Thrust Gimbal'
    },
    info: {
      solar: {
        name: 'Solar Array Wings',
        desc: 'In deep space, sunlight decays with inverse square law. Dawn spanned nearly <strong>19 meters</strong> tip-to-tip, sustaining kilowatt electrical output even at 2.8 AU.',
        chips: ['Triple-Junction GaAs', '19 m Wingspan', '2.3–10 kW Power']
      },
      ppu: {
        name: 'Power Processing Unit (PPU)',
        desc: 'Heart of the electric propulsion system: transforms raw solar bus voltage into regulated supplies for cathode heaters, keeper arcs, <strong>+1500 V beam power</strong>, <strong>−300 V accel grid</strong>, and neutralizer.',
        chips: ['~93% Efficiency', 'High-Voltage Isolation', 'Autonomous Fault Logic']
      },
      tank: {
        name: 'Xenon Tank (COPV)',
        desc: 'Carbon composite overwrapped pressure vessel (<strong>150 bar</strong>). Xenon is ideal: <strong>inert, heavy (131.3 u), low ionization potential (12.13 eV)</strong>, and stores densely at room temperature.',
        chips: ['Atomic Mass 131.3 u', 'Pressure 150 bar', 'Ionization 12.13 eV']
      },
      pipe: {
        name: 'Propellant Feed & Flow Control',
        desc: 'Dual-stage pressure regulation and thermal proportional valves metering micro-flows of <strong>milligrams per second</strong> to main discharge and cathode lines.',
        chips: ['mg/s Metering', 'Proportional Flow Valve', 'Multi-Branch Distribution']
      },
      cathode: {
        name: 'Discharge Hollow Cathode & Keeper',
        desc: 'Primary electron emitter: heated low work-function insert (<strong>LaB₆</strong> or BaO-W) operating at <strong>>1000 °C</strong>. The keeper electrode strikes and sustains the internal discharge arc.',
        chips: ['LaB₆ Insert', 'Thermionic Emission', 'Keeper Arc Ignition']
      },
      plenum: {
        name: 'Reverse Gas Plenum Ring',
        desc: 'Stainless steel toroidal manifold located near the screen grid that injects xenon <strong>backward into the conical chamber</strong>, greatly boosting residency time and ionization efficiency to >85%.',
        chips: ['Reverse Injection', 'Extended Transit Path', 'Ionization >85%']
      },
      chamber: {
        name: 'Discharge Chamber / Anode',
        desc: 'Ion production volume: the cylindrical shell acts as the anode (+25 V). Confined electrons spiral through the volume, ionizing neutral xenon via electron impact: <strong>Xe + e⁻ → Xe⁺ + 2e⁻</strong>.',
        chips: ['Anode Bias ~25 V', 'Electron Impact Ionization', 'Plasma Density 10¹² cm⁻³']
      },
      magnets: {
        name: 'Ring Cusp Magnets (SmCo)',
        desc: 'High-energy samarium-cobalt permanent magnets arranged in <strong>alternating polarity rings (N-S-N)</strong>. Creates a strong magnetic mirror barrier on the walls while leaving the center core field-free.',
        chips: ['Alternating Polarity', 'Magnetic Mirror Reflection', 'Low-B Axis Core']
      },
      screen: {
        name: 'Dished Screen Grid (+1500V)',
        desc: 'Hydroformed dish molybdenum grid with thousands of apertures (~67% open area). Biased at <strong>+1500 V</strong>, interfacing with the plasma boundary to form concave extraction menisci.',
        chips: ['+1500 V', 'Dished Stability', '67% Open Area']
      },
      accel: {
        name: 'Dished Accel Grid (−300V)',
        desc: 'Positioned <strong>1.5–2.0 mm</strong> downstream of the screen grid at <strong>−300 V</strong>. Strong electrostatic gap accelerates positive ions to <strong>30–50 km/s</strong> while blocking backstreaming electrons.',
        chips: ['−300 V', '1.5–2.0 mm Gap', 'Electron Backstream Prevention']
      },
      decel: {
        name: 'Decelerator Grid (0V Ground)',
        desc: 'Third grounded metal grid (0V). Shields the accelerator grid from charge-exchange (CEX) slow ion back-sputtering, extending operational engine life to <strong>50,000+ hours</strong>.',
        chips: ['0 V Ground Bias', 'Triple-Grid Architecture', 'CEX Erosion Mitigation']
      },
      neutralizer: {
        name: 'External Neutralizer Cathode',
        desc: 'Dedicated hollow cathode ejecting an equal flux of <strong>electrons</strong> directly into the ion plume. Without neutralization, negative spacecraft charge would instantly pull the beam back.',
        chips: ['Equal Electron Injection', 'Zero Net Space Charge', 'Prevents Beam Recoil']
      },
      plume: {
        name: 'Ion Beam Plume & CEX Wings',
        desc: 'Energetic xenon ions emitting characteristic <strong>azure/violet glow</strong>. Exhaust velocity reaches <strong>40–50 km/s</strong> (10x chemical rockets) with total thrust of 92–236 mN.',
        chips: ['Exhaust 40–50 km/s', 'Isp 3100–4200 s', 'Azure/Violet Xenon Luminescence']
      },
      gimbal: {
        name: 'Two-Axis Gimbal Assembly',
        desc: 'Gimbal ring with dual linear actuators providing <strong>±5° pitch and yaw thrust vectoring</strong> to track the spacecraft center-of-mass as propellant depletes.',
        chips: ['±5° Dual-Axis Gimbal', 'Center-of-Mass Alignment', 'Linear Servo Actuators']
      },
      bus: {
        name: 'Spacecraft Main Bus',
        desc: 'Main spacecraft core wrapped in gold multi-layer insulation (MLI), housing star trackers, avionics, and high-pressure propellant manifolds.',
        chips: ['Gold MLI Blankets', 'Star Trackers', 'Primary Bus Structure']
      }
    }
  }
};
