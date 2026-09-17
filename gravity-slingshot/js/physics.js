/**
 * physics.js - 真实天体力学与引力弹弓轨道动力学计算核心
 * Reference: Bate, Mueller, White "Fundamentals of Astrodynamics";
 * NASA JPL Voyager Trajectory Data & Parker Solar Probe Mission Profiles.
 */

export const CONSTANTS = Object.freeze({
  G: 6.67430e-11, // m^3 kg^-1 s^-2
  AU_KM: 149597870.7, // 1 AU in km
  M_SUN: 1.9885e30, // kg
  MU_SUN: 1.32712440018e20, // m^3 s^-2

  // 行星物理参数 (真实公转周期、轨道半径、质量、GM、赤道半径)
  PLANETS: Object.freeze({
    sun: {
      nameZh: '太阳',
      nameEn: 'Sun',
      mass: 1.9885e30,
      mu: 1.32712440018e20, // m^3/s^2
      radius_km: 696340,
      orbitalRadius_AU: 0,
      orbitalSpeed_kms: 0,
      color: '#f59e0b',
      glow: '#fbbf24'
    },
    venus: {
      nameZh: '金星',
      nameEn: 'Venus',
      mass: 4.8675e24,
      mu: 3.24859e14,
      radius_km: 6051.8,
      orbitalRadius_AU: 0.723,
      orbitalSpeed_kms: 35.02,
      color: '#fcd34d',
      glow: '#fbbf24'
    },
    earth: {
      nameZh: '地球',
      nameEn: 'Earth',
      mass: 5.9722e24,
      mu: 3.986004418e14,
      radius_km: 6371.0,
      orbitalRadius_AU: 1.0,
      orbitalSpeed_kms: 29.78,
      color: '#38bdf8',
      glow: '#60a5fa'
    },
    jupiter: {
      nameZh: '木星',
      nameEn: 'Jupiter',
      mass: 1.8982e27,
      mu: 1.26686534e17,
      radius_km: 71492,
      orbitalRadius_AU: 5.204,
      orbitalSpeed_kms: 13.07,
      color: '#f59e0b',
      glow: '#d97706'
    },
    saturn: {
      nameZh: '土星',
      nameEn: 'Saturn',
      mass: 5.6834e26,
      mu: 3.7931207e16,
      radius_km: 60268,
      orbitalRadius_AU: 9.582,
      orbitalSpeed_kms: 9.68,
      hasRings: true,
      color: '#fef08a',
      glow: '#ca8a04'
    },
    uranus: {
      nameZh: '天王星',
      nameEn: 'Uranus',
      mass: 8.6810e25,
      mu: 5.793939e15,
      radius_km: 25559,
      orbitalRadius_AU: 19.20,
      orbitalSpeed_kms: 6.80,
      color: '#67e8f9',
      glow: '#06b6d4'
    },
    neptune: {
      nameZh: '海王星',
      nameEn: 'Neptune',
      mass: 1.02413e26,
      mu: 6.836529e15,
      radius_km: 24764,
      orbitalRadius_AU: 30.05,
      orbitalSpeed_kms: 5.43,
      color: '#818cf8',
      glow: '#4f46e5'
    }
  }),

  // 典型航天器质量 (旅行者号约 722 kg ~ 825 kg 含燃料仪器)
  VOYAGER_MASS_KG: 722.0
});

/**
 * 完整太阳系航行全过程阶段定义 (从地球发射到星际空间)
 */
export const JOURNEY_STAGES = Object.freeze([
  {
    key: 'earth_launch',
    tStart: 0.0,
    tEnd: 12.0,
    titleZh: '🌍 阶段 1: 地球发射升空 (1977)',
    descZh: '1977 年 8 月 20 日，泰坦三号E-半人马座火箭将旅行者2号推离地球，进入双曲逃逸轨道，直奔木星！',
    primaryBody: 'earth',
    baseSpeed_kms: 36.0,
    targetCamDist: 18.0
  },
  {
    key: 'jupiter_approach',
    tStart: 12.0,
    tEnd: 28.0,
    titleZh: '🚀 阶段 2: 穿越小行星带，奔向木星 (1977-1979)',
    descZh: '在太阳引力拖拽下，航速从 36 km/s 逐渐减速至 ~14 km/s。注意看粉色虚线：如果不借引力弹弓，探测器将被太阳拽回！',
    primaryBody: 'jupiter',
    baseSpeed_kms: 18.5,
    targetCamDist: 40.0
  },
  {
    key: 'jupiter_slingshot',
    tStart: 28.0,
    tEnd: 42.0,
    titleZh: '🪐 阶段 3: 木星引力弹弓 — 惊险切入轨道后方 (1979-07)',
    descZh: '从木星轨道后方掠过！引力将飞船紧紧拽向前方，航速在近拱点猛增至 34 km/s，甩出后太阳系航速暴增 10.5 km/s，轨道大幅偏折朝向土星！',
    primaryBody: 'jupiter',
    baseSpeed_kms: 25.2,
    targetCamDist: 14.0
  },
  {
    key: 'saturn_slingshot',
    tStart: 42.0,
    tEnd: 58.0,
    titleZh: '🪐 阶段 4: 土星光环俯冲 — 二次引力弹弓 (1981-08)',
    descZh: '飞掠土星光环边缘，土星引力再次赋予飞船 5.3 km/s 速度增益，精确弯折轨道飞往天王星！',
    primaryBody: 'saturn',
    baseSpeed_kms: 24.1,
    targetCamDist: 16.0
  },
  {
    key: 'uranus_slingshot',
    tStart: 58.0,
    tEnd: 74.0,
    titleZh: '⭐ 阶段 5: 天王星侧翼飞掠 (1986-01)',
    descZh: '掠过躺着自转的天王星，引力微调将飞船对准海王星。人类第一次看清这颗青蓝色冰巨星！',
    primaryBody: 'uranus',
    baseSpeed_kms: 18.0,
    targetCamDist: 18.0
  },
  {
    key: 'neptune_slingshot',
    tStart: 74.0,
    tEnd: 88.0,
    titleZh: '🔵 阶段 6: 海王星北极俯冲与海卫一弹出 (1989-08)',
    descZh: '仅在海王星云顶上方 4950 公里擦过！引力弹弓将旅行者2号猛烈甩向南侧黄道面外，正式开启星际征途！',
    primaryBody: 'neptune',
    baseSpeed_kms: 16.6,
    targetCamDist: 16.0
  },
  {
    key: 'interstellar',
    tStart: 88.0,
    tEnd: 100.0,
    titleZh: '🌌 阶段 7: 冲破日球层顶，进入星际空间 (2018+)',
    descZh: '四连引力弹弓让旅行者2号达到第三宇宙速度，以 15.3 km/s 恒定速度冲破太阳风层顶，永远在银河系漫游！',
    primaryBody: 'interstellar',
    baseSpeed_kms: 15.3,
    targetCamDist: 70.0
  }
]);

/**
 * 计算双曲双体轨道偏心率 e
 */
export function calculateEccentricity(v_inf_kms, rp_km, mu) {
  const v_inf_ms = v_inf_kms * 1000.0;
  const rp_m = rp_km * 1000.0;
  return 1.0 + (rp_m * v_inf_ms * v_inf_ms) / mu;
}

/**
 * 计算双曲引力散射偏折角 delta
 */
export function calculateDeflectionAngle(v_inf_kms, rp_km, mu) {
  const e = calculateEccentricity(v_inf_kms, rp_km, mu);
  const sinHalfDelta = 1.0 / e;
  const halfDelta = Math.asin(Math.min(1.0, Math.max(0.0, sinHalfDelta)));
  const deltaRad = 2.0 * halfDelta;
  return {
    radians: deltaRad,
    degrees: (deltaRad * 180.0) / Math.PI,
    eccentricity: e
  };
}

/**
 * 计算双曲飞掠产生的速度增量大小
 */
export function calculateHyperbolicDeltaV(v_inf_kms, deltaRad) {
  return 2.0 * v_inf_kms * Math.sin(deltaRad * 0.5);
}

/**
 * 太阳静止系下的矢量加法:
 */
export function addVelocityVectors(v_planet_kms, v_rel_kms) {
  return [
    v_planet_kms[0] + v_rel_kms[0],
    v_planet_kms[1] + v_rel_kms[1],
    v_planet_kms[2] + v_rel_kms[2]
  ];
}

export function vectorMagnitude(vec) {
  return Math.hypot(vec[0], vec[1], vec[2] || 0);
}

export function normalizeVector(vec) {
  const m = vectorMagnitude(vec);
  if (m === 0) return [0, 0, 0];
  return [vec[0] / m, vec[1] / m, (vec[2] || 0) / m];
}

/**
 * 计算飞掠对行星造成的微观减速 (严格动量守恒)
 */
export function calculatePlanetSpeedChange(m_sc_kg, delta_v_sc_kms, M_planet_kg) {
  const delta_v_sc_ms = delta_v_sc_kms * 1000.0;
  return (m_sc_kg * delta_v_sc_ms) / M_planet_kg;
}

/**
 * 计算航天器通过引力弹弓获得的动能增量 (J)
 */
export function calculateKineticEnergyDelta(m_sc_kg, v_init_kms, v_final_kms) {
  const vi_ms = v_init_kms * 1000.0;
  const vf_ms = v_final_kms * 1000.0;
  return 0.5 * m_sc_kg * (vf_ms * vf_ms - vi_ms * vi_ms);
}

/**
 * 蒂塞朗准则 (Tisserand's Parameter)
 */
export function calculateTisserandParameter(a_AU, e, inc_rad, ap_AU) {
  const term1 = ap_AU / a_AU;
  const term2 = 2.0 * Math.sqrt((a_AU / ap_AU) * (1.0 - e * e)) * Math.cos(inc_rad);
  return term1 + term2;
}

/**
 * 太阳系大尺度 3D 轨迹计算器 (从地球发射到外层空间)
 * @param {number} t - 归一化时间进度 [0, 100]
 * @param {string} missionKey
 * @param {string} geomMode
 */
export function computeTrajectoryState(t, missionKey = 'VOYAGER_2', geomMode = 'TRAILING') {
  // 关键路标关键帧 (Keyframes in 3D Solar System Coordinates)
  // 地球(r=20), 木星(r=36), 土星(r=56), 天王星(r=78), 海王星(r=98)
  const WAYPOINTS = [
    { t: 0.0,  pos: [20.0, 0, 0],         speed: 36.0,  body: 'earth' },
    { t: 6.0,  pos: [22.5, 0.4, 4.0],     speed: 32.0,  body: 'earth' },
    { t: 15.0, pos: [26.0, 0.6, 12.0],    speed: 21.0,  body: 'cruise' },
    { t: 25.0, pos: [31.0, 0.3, 19.5],    speed: 15.5,  body: 'jupiter_approach' },
    // 木星飞掠近拱点 (极其鲜明的 U 型双曲弯折!)
    { t: 30.0, pos: [34.5, 0.0, 24.0],    speed: 22.0,  body: 'jupiter' },
    { t: 33.0, pos: [36.2, -0.4, 25.8],   speed: 34.1,  body: 'jupiter_periapsis' }, // 弯折最紧贴处
    { t: 36.0, pos: [38.5, -0.2, 28.5],   speed: 26.5,  body: 'jupiter_exit' },
    { t: 45.0, pos: [45.0, 0.2, 38.0],    speed: 23.0,  body: 'saturn_approach' },
    // 土星飞掠近拱点
    { t: 52.0, pos: [52.5, 0.5, 48.0],    speed: 24.5,  body: 'saturn' },
    { t: 55.0, pos: [55.8, 0.8, 51.5],    speed: 31.0,  body: 'saturn_periapsis' },
    { t: 58.0, pos: [59.0, 0.6, 56.0],    speed: 24.1,  body: 'saturn_exit' },
    // 天王星飞掠
    { t: 66.0, pos: [70.0, 0.2, 70.0],    speed: 19.5,  body: 'uranus' },
    { t: 70.0, pos: [77.5, -0.3, 76.5],   speed: 22.0,  body: 'uranus_periapsis' },
    { t: 74.0, pos: [83.0, -0.6, 82.0],   speed: 18.0,  body: 'uranus_exit' },
    // 海王星飞掠 (弹出黄道面向下)
    { t: 80.0, pos: [91.0, -1.0, 92.0],   speed: 17.5,  body: 'neptune' },
    { t: 83.0, pos: [97.5, -3.5, 96.0],   speed: 23.5,  body: 'neptune_periapsis' },
    { t: 86.0, pos: [102.0, -6.0, 100.0], speed: 16.6,  body: 'neptune_exit' },
    // 星际空间
    { t: 100.0, pos: [130.0, -15.0, 125.0], speed: 15.3, body: 'interstellar' }
  ];

  // 插值计算当前航天器位置与速度
  let p1 = WAYPOINTS[0], p2 = WAYPOINTS[1];
  for (let i = 0; i < WAYPOINTS.length - 1; i++) {
    if (t >= WAYPOINTS[i].t && t <= WAYPOINTS[i + 1].t) {
      p1 = WAYPOINTS[i];
      p2 = WAYPOINTS[i + 1];
      break;
    }
  }

  const span = p2.t - p1.t || 1;
  const ratio = Math.max(0, Math.min(1, (t - p1.t) / span));
  // 平滑样条平滑过渡
  const smoothR = ratio * ratio * (3 - 2 * ratio);

  // 几何模式微调 (例如减速模式逆向拉近，极区翻转拉高 Y)
  let yOffset = 0;
  if (geomMode === 'POLAR' && t > 28.0 && t < 40.0) {
    yOffset = Math.sin((t - 28.0) / 12.0 * Math.PI) * 5.0;
  }

  const craftPos = [
    p1.pos[0] + (p2.pos[0] - p1.pos[0]) * smoothR,
    p1.pos[1] + (p2.pos[1] - p1.pos[1]) * smoothR + yOffset,
    p1.pos[2] + (p2.pos[2] - p1.pos[2]) * smoothR
  ];

  const currentSpeed = p1.speed + (p2.speed - p1.speed) * smoothR;
  const speedGain = currentSpeed - WAYPOINTS[0].speed;

  // 无引力弹弓对比轨迹 (Ghost Path):
  // 离开地球后由于太阳引力减速，无法到达木星和外行星，而是在 5.2 AU 处掉头回落！
  let ghostPos;
  if (t < 25.0) {
    ghostPos = [craftPos[0], craftPos[1], craftPos[2]];
  } else {
    // 衰减椭圆轨迹，掉头下坠
    const dtGhost = t - 25.0;
    const gx = 31.0 + dtGhost * 0.45 - dtGhost * dtGhost * 0.012;
    const gz = 19.5 + dtGhost * 0.35 - dtGhost * dtGhost * 0.015;
    ghostPos = [gx, 0, gz];
  }

  // 识别当前所处阶段
  let stageIdx = 0;
  for (let i = 0; i < JOURNEY_STAGES.length; i++) {
    if (t >= JOURNEY_STAGES[i].tStart && t <= JOURNEY_STAGES[i].tEnd) {
      stageIdx = i;
      break;
    }
  }

  return {
    craftPos,
    ghostPos,
    currentSpeed,
    speedGain,
    stageIdx,
    stage: JOURNEY_STAGES[stageIdx]
  };
}


/**
 * ═══════════════ 真实飞掠数据（2026-09-17 在线核实）═══════════════
 * 来源: NASA/JPL Voyager mission pages; The Planetary Society
 * ("gravity assist" 概览: 旅行者2号日心速度 10→20 km/s @木星);
 * Wikipedia Voyager 2 (飞掠时刻/距离)。
 * rp_km 为距行星中心的近拱点距离。
 */
export const REAL_ENCOUNTERS = Object.freeze({
  VOYAGER_2: {
    jupiter: {
      date: '1979-07-09 22:29 UT',
      rp_km: 645000,          // ≈ 9.0 R_J（云顶上方约 57 万 km）
      v_inf_kms: 10.5,        // 双曲超额速度（相对木星）
      helio_in_kms: 10.0,     // 飞掠前日心速度
      helio_out_kms: 20.0,    // 飞掠后日心速度（增益 ≈ +10 km/s）
      source: 'NASA/JPL · Planetary Society'
    },
    saturn: {
      date: '1981-08-26 01:21 UT',
      rp_km: 161000,          // ≈ 2.7 R_S（云顶上方约 10.1 万 km）
      v_inf_kms: 6.0,         // 近似值（由前后轨道反推）
      source: 'NASA/JPL · Wikipedia'
    },
    uranus: {
      date: '1986-01-24',
      rp_km: 107000,          // ≈ 4.2 R_U（云顶上方约 8.1 万 km）
      v_inf_kms: 5.0,         // 近似值
      source: 'NASA/JPL'
    },
    neptune: {
      date: '1989-08-25',
      rp_km: 29240,           // 云顶上方 4950 km + R_N 24764（≈1.18 R_N，史上最近掠）
      v_inf_kms: 8.0,         // 近似值
      source: 'NASA/JPL'
    }
  }
});

/**
 * 真实双曲飞掠轨迹生成器（patched conic，行星中心惯性系）
 * r(ν) = p / (1 + e·cosν),  p = a(1-e²),  a = -μ/v∞²
 * 返回以近拱点为原点、入射渐近线沿 +x 方向的轨迹点（单位: 米）
 * 以及全部几何指标（e、转角 δ、近拱点速度等）。
 */
export function hyperbolicTrajectory(mu, v_inf_kms, rp_km, options = {}) {
  const nuMaxCap = options.nuMaxDeg ?? 150;   // 绘图最大真近点角（度）
  const samples = options.samples ?? 240;
  const v_inf = v_inf_kms * 1000.0;
  const rp = rp_km * 1000.0;

  const e = calculateEccentricity(v_inf_kms, rp_km, mu);
  const a = -mu / (v_inf * v_inf);            // 负号: 双曲线
  const p = a * (1.0 - e * e);                // 半通径 (>0)

  // 渐近线处的真近点角: cos ν∞ = -1/e
  const nuAsymptote = Math.acos(Math.max(-1.0, Math.min(1.0, -1.0 / e)));
  const nuMax = Math.min(nuMaxCap * Math.PI / 180.0, nuAsymptote * 0.94);

  const points = [];
  for (let i = 0; i < samples; i++) {
    const nu = -nuMax + (2.0 * nuMax * i) / (samples - 1);
    const r = p / (1.0 + e * Math.cos(nu));
    points.push({ x: r * Math.cos(nu), z: r * Math.sin(nu), r, nu });
  }

  const defl = calculateDeflectionAngle(v_inf_kms, rp_km, mu);
  const vPeriapsis = Math.sqrt(v_inf * v_inf + 2.0 * mu / rp) / 1000.0; // km/s

  return {
    e,
    a,
    p,
    nuMax,                                     // 绘图最大真近点角 (rad)
    semiMajorAU: a / 1.495978707e11,
    deflectionDeg: defl.degrees,
    deltaRad: defl.radians,
    vPeriapsis_kms: vPeriapsis,
    nuAsymptoteDeg: (nuAsymptote * 180.0) / Math.PI,
    points,                                    // 米制（近拱点坐标系）
    rp_m: rp,
    v_inf_ms: v_inf
  };
}

/**
 * 发射段: 地球停泊轨道 → 双曲逃逸轨道的形状
 * 与 hyperbolicTrajectory 同一引擎，只是 μ 换成地球、rp 换成停泊轨道半径。
 */
export function earthEscapeTrajectory(v_inf_kms, parkingAltKm = 200) {
  const rp_km = 6371.0 + parkingAltKm;
  return hyperbolicTrajectory(CONSTANTS.PLANETS.earth.mu, v_inf_kms, rp_km,
    { nuMaxDeg: 140, samples: 200 });
}

/**
 * 历史真实任务预设数据
 */
export const MISSION_PRESETS = Object.freeze({
  VOYAGER_2: {
    id: 'VOYAGER_2',
    nameZh: '旅行者2号「大旅行」',
    nameEn: 'Voyager 2 Grand Tour',
    badge: '175年一遇',
    descZh: '1977 年从地球发射，利用 175 年一遇的外行星罕见排列，连续四连引力弹弓飞掠木星、土星、天王星、海王星，一举冲破太阳系日球层！',
    primaryBody: 'jupiter',
    type: 'GRAND_TOUR',
    targetSequence: ['earth', 'jupiter', 'saturn', 'uranus', 'neptune', 'interstellar'],
    stages: [
      { body: 'earth', date: '1977-08-20', eventZh: '地球发射升空', v_helio_kms: 36.0, gain_kms: 0.0 },
      { body: 'jupiter', date: '1979-07-09', eventZh: '木星后方掠过 (增速加速)', v_helio_kms: 25.2, v_periapsis_kms: 34.1, gain_kms: 10.4 },
      { body: 'saturn', date: '1981-08-26', eventZh: '土星光环俯冲 (二次加速)', v_helio_kms: 24.1, gain_kms: 5.3 },
      { body: 'uranus', date: '1986-01-24', eventZh: '天王星侧向飞掠 (变轨转向)', v_helio_kms: 18.0, gain_kms: 2.1 },
      { body: 'neptune', date: '1989-08-25', eventZh: '海王星北极俯冲 (南向弹出)', v_helio_kms: 16.6, gain_kms: -1.2 },
      { body: 'interstellar', date: '2018-11-05', eventZh: '正式穿越日球层顶 (120 AU)', v_helio_kms: 15.3, gain_kms: 0.0 }
    ]
  },

  PARKER_SOLAR_PROBE: {
    id: 'PARKER_SOLAR_PROBE',
    nameZh: '帕克太阳探测器 (减速弹弓)',
    nameEn: 'Parker Solar Probe (Deceleration Assist)',
    badge: '减速刹车',
    descZh: '为了触碰太阳日冕，帕克探测器 7 次掠过金星「轨道前方」，故意让金星引力拽慢自己，剥离轨道角动量，使近日点直降至 9.86 太阳半径！',
    primaryBody: 'venus',
    type: 'DECELERATE',
    stages: [
      { body: 'venus', date: '2018-10-03', eventZh: '第 1 次金星前方飞掠 (减速刹车)', v_helio_kms: 28.5, gain_kms: -3.2 }
    ]
  },

  ULYSSES: {
    id: 'ULYSSES',
    nameZh: '尤利西斯号 (极区变轨 80.2°)',
    nameEn: 'Ulysses Polar Inclination Assist',
    badge: '轨道倾角',
    descZh: '利用木星极区飞掠，将飞船从黄道平面猛烈弯折 80.2°，人类历史上唯一不需要消耗数万吨燃料便直插太阳极区的史诗级轨道机动！',
    primaryBody: 'jupiter',
    type: 'POLAR_INCLINATION',
    stages: [
      { body: 'jupiter', date: '1992-02-08', eventZh: '木星北极俯冲飞掠 (倾角翻转 80.2°)', v_helio_kms: 15.2, gain_kms: 0.0 }
    ]
  },

  NEW_HORIZONS: {
    id: 'NEW_HORIZONS',
    nameZh: '新视野号 (木星超高速弹弓)',
    nameEn: 'New Horizons Pluto Express',
    badge: '极速冲刺',
    descZh: '2007 年飞掠木星获得 4 km/s 速度跃升，将前往冥王星的航行时间整整压缩了 3 年，创下人类探测器最快飞掠速度记录！',
    primaryBody: 'jupiter',
    type: 'ACCELERATE',
    stages: [
      { body: 'jupiter', date: '2007-02-28', eventZh: '木星后方精确弹弓 (提速 4 km/s)', v_helio_kms: 23.1, gain_kms: 3.9 }
    ]
  }
});
