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
 * 计算双曲双体轨道偏心率 e
 * @param {number} v_inf_kms - 双曲渐近速度 (km/s)
 * @param {number} rp_km - 近拱点/最近飞掠距离 (km)
 * @param {number} mu - 行星引力常数 (m^3/s^2)
 * @returns {number} 偏心率 e (e > 1 为双曲线)
 */
export function calculateEccentricity(v_inf_kms, rp_km, mu) {
  const v_inf_ms = v_inf_kms * 1000.0;
  const rp_m = rp_km * 1000.0;
  // e = 1 + (rp * v_inf^2) / mu
  return 1.0 + (rp_m * v_inf_ms * v_inf_ms) / mu;
}

/**
 * 计算双曲引力散射偏折角 delta (弧度 & 角度)
 * sin(delta / 2) = 1 / e
 * @param {number} v_inf_kms
 * @param {number} rp_km
 * @param {number} mu
 * @returns {{ radians: number, degrees: number, eccentricity: number }}
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
 * 计算双曲飞掠产生的速度增量大小 (行星参考系内双曲超速转向)
 * |delta_v| = 2 * v_inf * sin(delta / 2) = 2 * v_inf / e
 * @param {number} v_inf_kms
 * @param {number} deltaRad
 * @returns {number} deltaV (km/s)
 */
export function calculateHyperbolicDeltaV(v_inf_kms, deltaRad) {
  return 2.0 * v_inf_kms * Math.sin(deltaRad * 0.5);
}

/**
 * 太阳静止系下的矢量加法:
 * v_heliocentric = V_planet + v_relative
 * @param {[number, number, number]} v_planet_kms
 * @param {[number, number, number]} v_rel_kms
 * @returns {[number, number, number]}
 */
export function addVelocityVectors(v_planet_kms, v_rel_kms) {
  return [
    v_planet_kms[0] + v_rel_kms[0],
    v_planet_kms[1] + v_rel_kms[1],
    v_planet_kms[2] + v_rel_kms[2]
  ];
}

/**
 * 矢量模长 (km/s)
 */
export function vectorMagnitude(vec) {
  return Math.hypot(vec[0], vec[1], vec[2] || 0);
}

/**
 * 归一化矢量
 */
export function normalizeVector(vec) {
  const m = vectorMagnitude(vec);
  if (m === 0) return [0, 0, 0];
  return [vec[0] / m, vec[1] / m, (vec[2] || 0) / m];
}

/**
 * 计算飞掠对行星造成的微观减速 (严格动量守恒)
 * m_sc * delta_v_sc = M_planet * delta_V_planet
 * @param {number} m_sc_kg 航天器质量 (kg)
 * @param {number} delta_v_sc_kms 航天器速度增益 (km/s)
 * @param {number} M_planet_kg 行星质量 (kg)
 * @returns {number} 行星轨道速度微观改变值 (m/s)
 */
export function calculatePlanetSpeedChange(m_sc_kg, delta_v_sc_kms, M_planet_kg) {
  const delta_v_sc_ms = delta_v_sc_kms * 1000.0;
  return (m_sc_kg * delta_v_sc_ms) / M_planet_kg;
}

/**
 * 计算航天器通过引力弹弓获得的动能增量 (J)
 * Delta_Ek = 0.5 * m * (v_final^2 - v_initial^2)
 * @param {number} m_sc_kg
 * @param {number} v_init_kms
 * @param {number} v_final_kms
 * @returns {number} Joules
 */
export function calculateKineticEnergyDelta(m_sc_kg, v_init_kms, v_final_kms) {
  const vi_ms = v_init_kms * 1000.0;
  const vf_ms = v_final_kms * 1000.0;
  return 0.5 * m_sc_kg * (vf_ms * vf_ms - vi_ms * vi_ms);
}

/**
 * 蒂塞朗准则 (Tisserand's Parameter)
 * 在三体摄动下近似守恒: T_P = a_p / a + 2 * sqrt(a / a_p * (1 - e^2)) * cos(i)
 */
export function calculateTisserandParameter(a_AU, e, inc_rad, ap_AU) {
  const term1 = ap_AU / a_AU;
  const term2 = 2.0 * Math.sqrt((a_AU / ap_AU) * (1.0 - e * e)) * Math.cos(inc_rad);
  return term1 + term2;
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
    descZh: '1977 年发射，利用 175 年一遇的外行星同侧罕见几何排列，连续完成木星、土星、天王星、海王星四连引力弹弓，一举冲破太阳系日球层！',
    primaryBody: 'jupiter',
    type: 'GRAND_TOUR',
    targetSequence: ['earth', 'jupiter', 'saturn', 'uranus', 'neptune', 'interstellar'],
    stages: [
      {
        body: 'earth',
        date: '1977-08-20',
        eventZh: '地球发射升空',
        v_helio_kms: 36.0,
        gain_kms: 0.0,
        altitude_km: 0
      },
      {
        body: 'jupiter',
        date: '1979-07-09',
        eventZh: '木星后方掠过 (增速加速)',
        v_helio_kms: 25.2,
        v_periapsis_kms: 34.1,
        gain_kms: 10.4,
        rp_km: 643000, // ~9 R_J
        v_inf_kms: 10.8
      },
      {
        body: 'saturn',
        date: '1981-08-26',
        eventZh: '土星光环俯冲飞掠 (二次加速)',
        v_helio_kms: 24.1,
        gain_kms: 5.3,
        rp_km: 101000,
        v_inf_kms: 12.0
      },
      {
        body: 'uranus',
        date: '1986-01-24',
        eventZh: '天王星侧向飞掠 (变轨转向)',
        v_helio_kms: 18.0,
        gain_kms: 2.1,
        rp_km: 81500,
        v_inf_kms: 14.5
      },
      {
        body: 'neptune',
        date: '1989-08-25',
        eventZh: '海王星北极掠过指向海卫一 (南向弹出)',
        v_helio_kms: 16.6,
        gain_kms: -1.2, // 故意减速俯冲海卫一并弹出黄道面
        rp_km: 29200,
        v_inf_kms: 15.1
      },
      {
        body: 'interstellar',
        date: '2018-11-05',
        eventZh: '正式穿越星际空间日球层顶 (120 AU)',
        v_helio_kms: 15.3,
        gain_kms: 0.0,
        rp_km: 0
      }
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
      {
        body: 'venus',
        date: '2018-10-03',
        eventZh: '第 1 次金星前方飞掠 (减速刹车)',
        v_helio_kms: 28.5,
        gain_kms: -3.2,
        rp_km: 8498,
        v_inf_kms: 11.2
      }
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
      {
        body: 'jupiter',
        date: '1992-02-08',
        eventZh: '木星北极俯冲飞掠 (倾角翻转 80.2°)',
        v_helio_kms: 15.2,
        gain_kms: 0.0,
        rp_km: 450000,
        v_inf_kms: 13.5,
        inclinationChangeDeg: 80.2
      }
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
      {
        body: 'jupiter',
        date: '2007-02-28',
        eventZh: '木星后方精确弹弓 (提速 4 km/s)',
        v_helio_kms: 23.1,
        gain_kms: 3.9,
        rp_km: 2300000,
        v_inf_kms: 18.2
      }
    ]
  }
});
