/**
 * data.js — Comprehensive Astronomical Database for the Solar System
 * Contains verified orbital and physical data for the Sun, 8 Planets, and 22 Moons.
 */

/**
 * @typedef {Object} CelestialBodyData
 * @property {string} id
 * @property {string} name
 * @property {string} nameZh
 * @property {'star'|'planet'|'moon'} type
 * @property {string|null} parent
 * @property {number} radiusKm
 * @property {number} displayRadius
 * @property {number} semiMajorAxisKm
 * @property {number} displayDistance
 * @property {number} orbitalPeriodDays
 * @property {number} rotationPeriodHours
 * @property {number} axialTiltDeg
 * @property {number} eccentricity
 * @property {number} inclinationDeg
 * @property {number} colorHex
 * @property {boolean} [hasAtmosphere]
 * @property {number} [atmosphereColor]
 * @property {boolean} [hasRings]
 * @property {number} [ringInnerRadius]
 * @property {number} [ringOuterRadius]
 * @property {string[]} factsZh
 * @property {string[]} factsEn
 * @property {string} massKg
 * @property {number} gravityMps2
 */

export const CELESTIAL_DATA = [
  // =========================================================================
  // 1. THE SUN (太阳)
  // =========================================================================
  {
    id: 'sun',
    name: 'Sun',
    nameZh: '太阳',
    type: 'star',
    parent: null,
    radiusKm: 696340,
    displayRadius: 18.0,
    semiMajorAxisKm: 0,
    displayDistance: 0,
    orbitalPeriodDays: 0,
    rotationPeriodHours: 609.12, // 25.4 Earth days at equator
    axialTiltDeg: 7.25,
    eccentricity: 0,
    inclinationDeg: 0,
    colorHex: 0xfdb813,
    massKg: '1.989 × 10³⁰ kg (99.86% 太阳系总质量)',
    gravityMps2: 274.0,
    factsZh: [
      '太阳是太阳系中心的黄矮星（G2V型主序星），直径约为地球的109倍。',
      '核心温度达1500万摄氏度，每秒将6亿吨氢聚变为5.96亿吨氦，释放出巨大能量。',
      '日冕层向外吹出时速高达400~800公里的带电粒子流，形成贯穿太阳系的太阳风。'
    ],
    factsEn: [
      'A G-type main-sequence star comprising 99.86% of the Solar System mass.',
      'Core temperature reaches 15 million °C, fusing 600 million tons of hydrogen every second.',
      'Solar wind of charged particles extends across the heliosphere out past Pluto.'
    ]
  },

  // =========================================================================
  // 2. MERCURY (水星)
  // =========================================================================
  {
    id: 'mercury',
    name: 'Mercury',
    nameZh: '水星',
    type: 'planet',
    parent: null,
    radiusKm: 2439.7,
    displayRadius: 1.2,
    semiMajorAxisKm: 57910000,
    displayDistance: 32,
    orbitalPeriodDays: 87.97,
    rotationPeriodHours: 1407.6, // 58.65 days
    axialTiltDeg: 0.034,
    eccentricity: 0.2056,
    inclinationDeg: 7.0,
    colorHex: 0xa8a29e,
    massKg: '3.301 × 10²³ kg (0.055 地球)',
    gravityMps2: 3.7,
    factsZh: [
      '离太阳最近的行星，昼夜温差极大，向阳面高达430℃，背阳面低至-180℃。',
      '表面布满撞击坑，外观酷似月球，最大的卡洛里斯撞击盆地直径达1550公里。',
      '拥有奇特的3:2自转-公转共振，公转两周自转三周。'
    ],
    factsEn: [
      'Closest planet to the Sun with extreme temperature swings from -180°C to 430°C.',
      'Heavily cratered surface featuring the massive 1,550-km-wide Caloris Basin.',
      'Locked in a 3:2 spin-orbit resonance: 3 rotations for every 2 orbits around the Sun.'
    ]
  },

  // =========================================================================
  // 3. VENUS (金星)
  // =========================================================================
  {
    id: 'venus',
    name: 'Venus',
    nameZh: '金星',
    type: 'planet',
    parent: null,
    radiusKm: 6051.8,
    displayRadius: 2.2,
    semiMajorAxisKm: 108200000,
    displayDistance: 48,
    orbitalPeriodDays: 224.7,
    rotationPeriodHours: -5832.5, // Retrograde rotation!
    axialTiltDeg: 177.36,
    eccentricity: 0.0067,
    inclinationDeg: 3.39,
    colorHex: 0xfde047,
    hasAtmosphere: true,
    atmosphereColor: 0xfef08a,
    massKg: '4.867 × 10²⁴ kg (0.815 地球)',
    gravityMps2: 8.87,
    factsZh: [
      '太阳系中最热的行星，极强的二氧化碳温室效应使地表温度高达465℃，足以熔化铅。',
      '浓厚云层含有浓硫酸，地表大气压相当于地球海平面92倍（相当于水下900米压力）。',
      '倒向逆行自转（自东向西），一“天”（243地球日）比一“年”（224.7地球日）还要长！'
    ],
    factsEn: [
      'Hottest planet in the Solar System due to runaway CO₂ greenhouse effect (surface 465°C).',
      'Surface atmospheric pressure is 92 times that of Earth with clouds of sulfuric acid.',
      'Rotates retrograde (clockwise) so slowly that a Venusian day is longer than its year!'
    ]
  },

  // =========================================================================
  // 4. EARTH & THE MOON (地球与月球)
  // =========================================================================
  {
    id: 'earth',
    name: 'Earth',
    nameZh: '地球',
    type: 'planet',
    parent: null,
    radiusKm: 6371.0,
    displayRadius: 2.4,
    semiMajorAxisKm: 149600000,
    displayDistance: 68,
    orbitalPeriodDays: 365.256,
    rotationPeriodHours: 23.934,
    axialTiltDeg: 23.44,
    eccentricity: 0.0167,
    inclinationDeg: 0.0,
    colorHex: 0x38bdf8,
    hasAtmosphere: true,
    atmosphereColor: 0x93c5fd,
    massKg: '5.972 × 10²⁴ kg',
    gravityMps2: 9.81,
    factsZh: [
      '目前已知全宇宙唯一孕育生命的星球，表面约71%被液态水海洋覆盖。',
      '拥有由液态铁核发电机效应产生的强大地磁场，阻挡了致命宇宙射线与太阳风。',
      '23.44度黄赤交角带来了丰富多彩的春夏秋冬四季更替。'
    ],
    factsEn: [
      'The only known harbour of life in the cosmos, with 71% of its surface covered in liquid water.',
      'Active molten iron-nickel core generates a protective magnetosphere.',
      'Axial tilt of 23.44° provides regular seasonal variations across northern and southern hemispheres.'
    ]
  },
  {
    id: 'moon',
    name: 'Moon',
    nameZh: '月球',
    type: 'moon',
    parent: 'earth',
    radiusKm: 1737.4,
    displayRadius: 0.65,
    semiMajorAxisKm: 384400,
    displayDistance: 5.5,
    orbitalPeriodDays: 27.32,
    rotationPeriodHours: 655.7, // Tidally locked
    axialTiltDeg: 1.54,
    eccentricity: 0.0549,
    inclinationDeg: 5.14,
    colorHex: 0xd6d3d1,
    massKg: '7.342 × 10²² kg (0.0123 地球)',
    gravityMps2: 1.62,
    factsZh: [
      '地球唯一的天然卫星，太阳系第五大卫星，潮汐锁定使它始终同一面朝向地球。',
      '表面分暗色的月海玄武岩熔岩平原和明亮的高地撞击坑。',
      '人类目前唯一肉身登临的地外天体（阿波罗计划共12人踏上月面）。'
    ],
    factsEn: [
      'Earth’s only natural satellite and tidally locked so the same face always points toward us.',
      'Surface divided into dark basaltic maria (volcanic plains) and brighter cratered terrae.',
      'The only extraterrestrial body ever visited by human footsteps (Apollo missions 1969-1972).'
    ]
  },

  // =========================================================================
  // 5. MARS & ITS MOONS (火星及其卫星)
  // =========================================================================
  {
    id: 'mars',
    name: 'Mars',
    nameZh: '火星',
    type: 'planet',
    parent: null,
    radiusKm: 3389.5,
    displayRadius: 1.5,
    semiMajorAxisKm: 227900000,
    displayDistance: 92,
    orbitalPeriodDays: 686.98,
    rotationPeriodHours: 24.62,
    axialTiltDeg: 25.19,
    eccentricity: 0.0934,
    inclinationDeg: 1.85,
    colorHex: 0xf97316,
    hasAtmosphere: true,
    atmosphereColor: 0xfdba74,
    massKg: '6.417 × 10²³ kg (0.107 地球)',
    gravityMps2: 3.72,
    factsZh: [
      '“红色星球”，表面因富含氧化铁（铁锈）而呈现橙红色。',
      '拥有全太阳系最高的火山——奥林匹斯山（高21.9公里，珠峰的2.5倍）与最长大峡谷水手号峡谷。',
      '南北极覆盖着水冰与干冰（固态二氧化碳）组成的极冠，随季节消长。'
    ],
    factsEn: [
      'The Red Planet owes its crimson tint to iron oxide dust across its surface.',
      'Home to Olympus Mons, the largest volcano in the Solar System (21.9 km high, 2.5× Everest).',
      'Possesses polar ice caps of water and dry ice (CO₂) that wax and wane with Martian seasons.'
    ]
  },
  {
    id: 'phobos',
    name: 'Phobos',
    nameZh: '火卫一',
    type: 'moon',
    parent: 'mars',
    radiusKm: 11.2,
    displayRadius: 0.3,
    semiMajorAxisKm: 9376,
    displayDistance: 3.2,
    orbitalPeriodDays: 0.319, // 7.66 hours! Faster than Mars rotation
    rotationPeriodHours: 7.66,
    axialTiltDeg: 0,
    eccentricity: 0.0151,
    inclinationDeg: 1.09,
    colorHex: 0x78716c,
    massKg: '1.066 × 10¹⁶ kg',
    gravityMps2: 0.0057,
    factsZh: [
      '形状极不规则的小行星捕获体，以直径9公里的巨大斯蒂克尼撞击坑最为著名。',
      '公转一圈仅需7小时39分，比火星自转还快，每天从西边升起东边落下两次！',
      '正以每百年1.8米的速度接近火星，预计3000万~5000万年后将被潮汐力撕裂成火星光环。'
    ],
    factsEn: [
      'An irregular captured asteroid dominated by the colossal 9-km Stickney crater.',
      'Orbits Mars in under 8 hours—faster than Mars rotates—so it rises in the west and sets in the east.',
      'Tidally spiraling inward and destined to either crash or shred into a Martian ring in 30-50M years.'
    ]
  },
  {
    id: 'deimos',
    name: 'Deimos',
    nameZh: '火卫二',
    type: 'moon',
    parent: 'mars',
    radiusKm: 6.2,
    displayRadius: 0.22,
    semiMajorAxisKm: 23463,
    displayDistance: 5.2,
    orbitalPeriodDays: 1.263,
    rotationPeriodHours: 30.3,
    axialTiltDeg: 0,
    eccentricity: 0.0003,
    inclinationDeg: 0.93,
    colorHex: 0xa8a29e,
    massKg: '1.476 × 10¹⁵ kg',
    gravityMps2: 0.003,
    factsZh: [
      '火星较小、较远的一颗卫星，表面被厚达100米的风化层尘埃平滑覆盖。',
      '逃逸速度仅有每秒5.6米，普通人用力一跃即可脱离其引力束缚飞入太空！'
    ],
    factsEn: [
      'Smaller and farther Martian moon, smoothed over by a deep blanket of loose regolith dust.',
      'Escape velocity is just 5.6 m/s—an athletic jump on Earth would launch you into orbit!'
    ]
  },

  // =========================================================================
  // 6. JUPITER & ITS MOONS (木星及卫星群)
  // =========================================================================
  {
    id: 'jupiter',
    name: 'Jupiter',
    nameZh: '木星',
    type: 'planet',
    parent: null,
    radiusKm: 69911,
    displayRadius: 7.2,
    semiMajorAxisKm: 778500000,
    displayDistance: 155,
    orbitalPeriodDays: 4332.59, // 11.86 Earth years
    rotationPeriodHours: 9.925, // Fastest rotator
    axialTiltDeg: 3.13,
    eccentricity: 0.0484,
    inclinationDeg: 1.30,
    colorHex: 0xd97706,
    hasAtmosphere: true,
    atmosphereColor: 0xfde68a,
    massKg: '1.898 × 10²⁷ kg (全系其他行星质量总和的2.5倍)',
    gravityMps2: 24.79,
    factsZh: [
      '太阳系最大的行星，质量是其他所有行星总和的2.5倍，充当着清理危险彗星的“宇宙吸尘器”。',
      '自转极快，一天不足10小时，导致赤道显著向外鼓起。',
      '大红斑（Great Red Spot）是一场已持续肆虐至少350年以上的超级反气旋风暴，能装下整个地球。'
    ],
    factsEn: [
      'King of Planets: more than twice as massive as all other planets combined.',
      'Shortest day in the Solar System (~9.9 hours), creating strong equatorial bulging.',
      'The Great Red Spot is a persistent anticyclonic storm larger than the diameter of Earth.'
    ]
  },
  {
    id: 'io',
    name: 'Io',
    nameZh: '木卫一',
    type: 'moon',
    parent: 'jupiter',
    radiusKm: 1821.6,
    displayRadius: 0.7,
    semiMajorAxisKm: 421700,
    displayDistance: 11.5,
    orbitalPeriodDays: 1.769,
    rotationPeriodHours: 42.46,
    axialTiltDeg: 0,
    eccentricity: 0.0041,
    inclinationDeg: 0.05,
    colorHex: 0xeab308,
    massKg: '8.932 × 10²² kg',
    gravityMps2: 1.796,
    factsZh: [
      '太阳系地质活动最活跃的天体，拥有超过400座活火山，不断喷射数百公里高的硫磺羽流。',
      '木星与其他伽利略卫星强大的引力潮汐共振产生的摩擦热是其火山能量来源。',
      '表面几乎没有撞击坑，全部被色彩斑斓的黄色硫磺和黑色硅酸盐熔岩覆盖。'
    ],
    factsEn: [
      'Most volcanically active body in the Solar System, boasting over 400 active volcanoes.',
      'Tidal heating from Jupiter and Laplace resonance keeps its molten interior constantly boiling.',
      'Lacks impact craters due to continuous resurfacing by sulfur plumes and lava lakes.'
    ]
  },
  {
    id: 'europa',
    name: 'Europa',
    nameZh: '木卫二',
    type: 'moon',
    parent: 'jupiter',
    radiusKm: 1560.8,
    displayRadius: 0.62,
    semiMajorAxisKm: 670900,
    displayDistance: 15.0,
    orbitalPeriodDays: 3.551,
    rotationPeriodHours: 85.2,
    axialTiltDeg: 0,
    eccentricity: 0.009,
    inclinationDeg: 0.47,
    colorHex: 0xe0f2fe,
    massKg: '4.800 × 10²² kg',
    gravityMps2: 1.315,
    factsZh: [
      '表面由极度光滑的水冰硬壳构成，密布红褐色交叉条纹裂痕（线状条带）。',
      '冰壳下方约15~25公里处存在一个深达100公里的全球性液态水海洋，水量超过地球所有海洋总和！',
      '拥有水、热源和有机物分子，被科学家认为是太阳系中最有可能存在地外生命的地方之一。'
    ],
    factsEn: [
      'Enclosed by a bright water-ice crust fractured by reddish-brown cycloidal lineae.',
      'Harbours a global subsurface ocean beneath 15-25 km of ice containing more water than Earth’s oceans combined.',
      'One of the top candidates in the Solar System for extraterrestrial life.'
    ]
  },
  {
    id: 'ganymede',
    name: 'Ganymede',
    nameZh: '木卫三',
    type: 'moon',
    parent: 'jupiter',
    radiusKm: 2634.1,
    displayRadius: 0.95,
    semiMajorAxisKm: 1070400,
    displayDistance: 20.0,
    orbitalPeriodDays: 7.155,
    rotationPeriodHours: 171.7,
    axialTiltDeg: 0.2,
    eccentricity: 0.0013,
    inclinationDeg: 0.20,
    colorHex: 0x94a3b8,
    massKg: '1.482 × 10²³ kg (大于水星)',
    gravityMps2: 1.428,
    factsZh: [
      '太阳系最大的卫星，直径5268公里，甚至超过了行星水星（4879公里）！',
      '全太阳系唯一已知拥有自身独立偶极磁场的卫星，内部拥有发电机机制的液态铁核。',
      '拥有由较暗的古老多坑区域和较明亮的地质断裂条带交错构成的复合地貌。'
    ],
    factsEn: [
      'Largest moon in the Solar System (5,268 km diameter), surpassing planet Mercury in size.',
      'The only moon known to generate its own permanent intrinsic magnetic dipole field.',
      'Surface is a mosaic of ancient dark cratered terrain and younger bright grooved ridges.'
    ]
  },
  {
    id: 'callisto',
    name: 'Callisto',
    nameZh: '木卫四',
    type: 'moon',
    parent: 'jupiter',
    radiusKm: 2410.3,
    displayRadius: 0.88,
    semiMajorAxisKm: 1882700,
    displayDistance: 26.0,
    orbitalPeriodDays: 16.689,
    rotationPeriodHours: 400.5,
    axialTiltDeg: 0,
    eccentricity: 0.0074,
    inclinationDeg: 0.28,
    colorHex: 0x64748b,
    massKg: '1.076 × 10²³ kg',
    gravityMps2: 1.235,
    factsZh: [
      '太阳系撞击坑密度最高的天体，几乎没有地质火山构造运动，完好保存着40亿年前的原始记忆。',
      '巨大的瓦尔哈拉撞击盆地（Valhalla）同心环断裂带直径延伸跨越近4000公里。',
      '远离木星强辐射带，是未来人类探索木星系统设立有人科考基地最理想的前哨站。'
    ],
    factsEn: [
      'The most heavily cratered object in the Solar System, with a 4-billion-year-old unrenewed surface.',
      'Features the gigantic Valhalla impact basin whose concentric multi-ring ripples stretch across 4,000 km.',
      'Resides outside Jupiter’s harsh radiation belt, making it an ideal future base for human exploration.'
    ]
  },
  {
    id: 'amalthea',
    name: 'Amalthea',
    nameZh: '木卫五',
    type: 'moon',
    parent: 'jupiter',
    radiusKm: 83.5,
    displayRadius: 0.35,
    semiMajorAxisKm: 181400,
    displayDistance: 8.5,
    orbitalPeriodDays: 0.498,
    rotationPeriodHours: 11.95,
    axialTiltDeg: 0,
    eccentricity: 0.0032,
    inclinationDeg: 0.37,
    colorHex: 0xef4444,
    massKg: '2.08 × 10¹⁸ kg',
    gravityMps2: 0.02,
    factsZh: [
      '木星内层的一颗不规则多面体卫星，呈现奇异的深红色彩，散发出多于其吸收的太阳辐射热量。',
      '公转极快，仅需12小时即可绕木星一周，处于木星环主环边缘。'
    ],
    factsEn: [
      'Inner reddish potato-shaped moon radiating more thermal heat than it receives from sunlight.',
      'Orbits right at the edge of Jupiter’s faint main dust ring every 12 hours.'
    ]
  },

  // =========================================================================
  // 7. SATURN & ITS MOONS (土星及其卫星群)
  // =========================================================================
  {
    id: 'saturn',
    name: 'Saturn',
    nameZh: '土星',
    type: 'planet',
    parent: null,
    radiusKm: 58232,
    displayRadius: 6.0,
    semiMajorAxisKm: 1433500000,
    displayDistance: 220,
    orbitalPeriodDays: 10759.22, // 29.45 Earth years
    rotationPeriodHours: 10.656,
    axialTiltDeg: 26.73,
    eccentricity: 0.0542,
    inclinationDeg: 2.49,
    colorHex: 0xfbbf24,
    hasAtmosphere: true,
    atmosphereColor: 0xfef3c7,
    hasRings: true,
    ringInnerRadius: 7.2,
    ringOuterRadius: 15.0,
    massKg: '5.683 × 10²⁶ kg (95.2 地球)',
    gravityMps2: 10.44,
    factsZh: [
      '拥有全太阳系最壮美宽广的行星光环系统，主要由数十亿颗从鹅卵石到大石块的99%纯水冰粒子构成。',
      '密度是太阳系所有行星中唯一小于水的（平均密度仅0.687 g/cm³，如果有一个足够大的水池，土星会漂在水面上）。',
      '北极存在一个巨大的常驻正六边形急流风暴系统，直径约3万公里。'
    ],
    factsEn: [
      'Crowned with the most extensive and magnificent planetary ring system in the Solar System, made of 99% pure water ice.',
      'The least dense planet (0.687 g/cm³)—it is the only planet that would float if placed in a giant bathtub of water.',
      'Displays a unique permanent hexagonal jet-stream atmospheric vortex at its north pole.'
    ]
  },
  {
    id: 'titan',
    name: 'Titan',
    nameZh: '土卫六',
    type: 'moon',
    parent: 'saturn',
    radiusKm: 2574.7,
    displayRadius: 0.92,
    semiMajorAxisKm: 1221870,
    displayDistance: 24.0,
    orbitalPeriodDays: 15.945,
    rotationPeriodHours: 382.7,
    axialTiltDeg: 0,
    eccentricity: 0.0288,
    inclinationDeg: 0.35,
    colorHex: 0xf59e0b,
    hasAtmosphere: true,
    atmosphereColor: 0xd97706,
    massKg: '1.345 × 10²³ kg',
    gravityMps2: 1.352,
    factsZh: [
      '全太阳系唯一拥有浓厚大气层（98%氮气，气压为地球1.5倍）的卫星，第二大卫星。',
      '表面存在由液态甲烷和乙烷汇聚成的湖泊与海洋（如克拉肯海），并拥有完整的甲烷“水文循环”（甲烷蒸发、成云、降雨）。',
      '惠更斯号探测器于2005年成功着陆于其表面，传回人类第一张外太阳系地表照片。'
    ],
    factsEn: [
      'Only moon with a dense nitrogen atmosphere (1.5× Earth’s sea level pressure) and second largest moon in the Solar System.',
      'Features hydrocarbon lakes and seas of liquid methane and ethane, with active rain and cloud cycles.',
      'ESA’s Huygens probe landed on its frozen orange surface in 2005, revealing rounded ice pebbles.'
    ]
  },
  {
    id: 'enceladus',
    name: 'Enceladus',
    nameZh: '土卫二',
    type: 'moon',
    parent: 'saturn',
    radiusKm: 252.1,
    displayRadius: 0.42,
    semiMajorAxisKm: 237948,
    displayDistance: 9.8,
    orbitalPeriodDays: 1.370,
    rotationPeriodHours: 32.88,
    axialTiltDeg: 0,
    eccentricity: 0.0047,
    inclinationDeg: 0.01,
    colorHex: 0xf8fafc,
    massKg: '1.08 × 10²⁰ kg',
    gravityMps2: 0.113,
    factsZh: [
      '表面反照率高达99%，像一面无暇镜子般洁白，是太阳系中最明亮的天体之一。',
      '南极“虎条纹”深裂隙不断喷发出巨大的冰晶与水蒸气低温间歇泉，直接构成了土星广阔的E环。',
      '卡西尼号飞越羽流时检测到了水、盐分、氢分子和简单有机物，证实其地下海洋存在海底热液活动！'
    ],
    factsEn: [
      'Highest geometric albedo in the Solar System (>99%), reflecting almost all sunlight hitting its pure snow crust.',
      'Active cryovolcanic geysers erupt from south-pole "tiger stripes", spraying water vapor that forms Saturn’s E ring.',
      'Cassini flybys detected molecular hydrogen and organics in the plumes, indicating hydrothermal vents on its ocean floor.'
    ]
  },
  {
    id: 'mimas',
    name: 'Mimas',
    nameZh: '土卫一',
    type: 'moon',
    parent: 'saturn',
    radiusKm: 198.2,
    displayRadius: 0.36,
    semiMajorAxisKm: 185520,
    displayDistance: 8.0,
    orbitalPeriodDays: 0.942,
    rotationPeriodHours: 22.61,
    axialTiltDeg: 0,
    eccentricity: 0.0202,
    inclinationDeg: 1.57,
    colorHex: 0xa1a1aa,
    massKg: '3.75 × 10¹⁹ kg',
    gravityMps2: 0.064,
    factsZh: [
      '外观酷似电影《星球大战》中的“死星”（Death Star），拥有直径达130公里的赫歇尔撞击坑。',
      '撞击坑边缘壁高近5公里，中央峰高达6公里，险些将整颗卫星撞成碎片。'
    ],
    factsEn: [
      'Famous for its uncanny resemblance to the Star Wars Death Star due to the colossal 130-km Herschel crater.',
      'The impact nearly shattered Mimas, raising a central peak 6 km high from the crater floor.'
    ]
  },
  {
    id: 'tethys',
    name: 'Tethys',
    nameZh: '土卫三',
    type: 'moon',
    parent: 'saturn',
    radiusKm: 531.1,
    displayRadius: 0.52,
    semiMajorAxisKm: 294660,
    displayDistance: 11.8,
    orbitalPeriodDays: 1.888,
    rotationPeriodHours: 45.31,
    axialTiltDeg: 0,
    eccentricity: 0.0001,
    inclinationDeg: 1.12,
    colorHex: 0xd4d4d8,
    massKg: '6.174 × 10²⁰ kg',
    gravityMps2: 0.146,
    factsZh: [
      '主要由低密度的水冰构成，几乎是一颗纯冰巨球。',
      '表面横贯着长达2000公里、深达3~5公里的巨大裂谷——伊萨卡峡谷（Ithaca Chasma）。'
    ],
    factsEn: [
      'Composed almost purely of water ice with an extremely low density close to 0.98 g/cm³.',
      'Dominated by Ithaca Chasma, a canyon system 2,000 km long and up to 5 km deep stretching 3/4 around the globe.'
    ]
  },
  {
    id: 'dione',
    name: 'Dione',
    nameZh: '土卫四',
    type: 'moon',
    parent: 'saturn',
    radiusKm: 561.4,
    displayRadius: 0.54,
    semiMajorAxisKm: 377400,
    displayDistance: 14.2,
    orbitalPeriodDays: 2.737,
    rotationPeriodHours: 65.69,
    axialTiltDeg: 0,
    eccentricity: 0.0022,
    inclinationDeg: 0.02,
    colorHex: 0xe4e4e7,
    massKg: '1.095 × 10²¹ kg',
    gravityMps2: 0.232,
    factsZh: [
      '后随半球密布着数百米高的明亮冰崖条纹（wispy terrain），是由构造构造断层暴露的纯净新鲜冰体。',
      '与土卫二存在轨道共振，帮助维持了土卫二的火山潮汐热源。'
    ],
    factsEn: [
      'Trailing hemisphere is covered in magnificent bright ice cliffs created by tectonic fracture rifts.',
      'Locked in a 2:1 mean-motion orbital resonance with Enceladus, helping power Enceladus’ tidal cryovolcanism.'
    ]
  },
  {
    id: 'rhea',
    name: 'Rhea',
    nameZh: '土卫五',
    type: 'moon',
    parent: 'saturn',
    radiusKm: 763.8,
    displayRadius: 0.60,
    semiMajorAxisKm: 527040,
    displayDistance: 17.5,
    orbitalPeriodDays: 4.518,
    rotationPeriodHours: 108.4,
    axialTiltDeg: 0,
    eccentricity: 0.0012,
    inclinationDeg: 0.35,
    colorHex: 0xc4b5fd,
    massKg: '2.307 × 10²¹ kg',
    gravityMps2: 0.264,
    factsZh: [
      '土星第二大卫星，由四分之三水冰与四分之一岩石构成的古老冰质星球。',
      '表面拥有极其稀薄但由氧气和二氧化碳构成的外逸层大气。'
    ],
    factsEn: [
      'Saturn’s second-largest moon, consisting of 75% water ice and 25% dense silicate rock.',
      'Possesses a tenuous exosphere of oxygen and carbon dioxide sustained by charged particle impacts.'
    ]
  },
  {
    id: 'iapetus',
    name: 'Iapetus',
    nameZh: '土卫八',
    type: 'moon',
    parent: 'saturn',
    radiusKm: 734.5,
    displayRadius: 0.58,
    semiMajorAxisKm: 3561300,
    displayDistance: 32.0,
    orbitalPeriodDays: 79.32,
    rotationPeriodHours: 1903.7,
    axialTiltDeg: 0,
    eccentricity: 0.0286,
    inclinationDeg: 15.47,
    colorHex: 0x52525b,
    factsZh: [
      '被称为太阳系的“太极阴阳星”：前进半球漆黑如沥青（反照率仅0.04），后随半球洁白如雪（反照率0.5）。',
      '赤道上精准环绕着一条高耸达20公里、宽20公里的巨大山脊，外观酷似一颗巨大胡桃壳。'
    ],
    factsEn: [
      'The "Yin-Yang" moon: leading hemisphere is coal-black (albedo 0.04) while trailing hemisphere is brilliant ice (albedo 0.5).',
      'Encircled around its equator by a mysterious 20-km-high mountain ridge, giving it the shape of a walnut.'
    ]
  },

  // =========================================================================
  // 8. URANUS & ITS MOONS (天王星及卫星群)
  // =========================================================================
  {
    id: 'uranus',
    name: 'Uranus',
    nameZh: '天王星',
    type: 'planet',
    parent: null,
    radiusKm: 25362,
    displayRadius: 4.2,
    semiMajorAxisKm: 2871000000,
    displayDistance: 310,
    orbitalPeriodDays: 30685.4, // 84 Earth years
    rotationPeriodHours: -17.24, // Retrograde
    axialTiltDeg: 97.77,        // Rolling on its side!
    eccentricity: 0.0457,
    inclinationDeg: 0.77,
    colorHex: 0x22d3ee,
    hasAtmosphere: true,
    atmosphereColor: 0x67e8f9,
    hasRings: true,
    ringInnerRadius: 5.2,
    ringOuterRadius: 7.8,
    massKg: '8.681 × 10²⁵ kg (14.5 地球)',
    gravityMps2: 8.69,
    factsZh: [
      '“躺着旋转”的冰巨星：自转轴倾角高达97.8度，几乎与公转轨道平面平行，公转一圈极昼与极夜各长达42年！',
      '大气中富含甲烷气体，强烈吸收红光反射蓝绿光，呈现纯净梦幻的淡青色。',
      '拥有全太阳系最低温的行星大气层，最低温度可跌至-224℃。'
    ],
    factsEn: [
      'The "sideways planet": extreme axial tilt of 97.8° means it literally rolls on its orbital plane.',
      'Atmospheric methane absorbs red light, giving the planet its serene, tranquil cyan-aquamarine hue.',
      'Coldest planetary atmosphere in the Solar System, plunging down to a record -224°C.'
    ]
  },
  {
    id: 'miranda',
    name: 'Miranda',
    nameZh: '天卫五',
    type: 'moon',
    parent: 'uranus',
    radiusKm: 235.8,
    displayRadius: 0.38,
    semiMajorAxisKm: 129390,
    displayDistance: 6.8,
    orbitalPeriodDays: 1.413,
    rotationPeriodHours: 33.91,
    axialTiltDeg: 0,
    eccentricity: 0.0013,
    inclinationDeg: 4.34,
    colorHex: 0xd1d5db,
    massKg: '6.59 × 10¹⁹ kg',
    gravityMps2: 0.079,
    factsZh: [
      '太阳系中最奇特破碎的地貌拼图：拥有高达20公里的维罗纳断崖（Verona Rupes，太阳系已知最高悬崖）。',
      '从悬崖顶端跳下需历时整整12分钟才能落到底部，地质学家推测它可能曾被撞得粉碎又在引力作用下重新拼合。'
    ],
    factsEn: [
      'A bizarre jigsaw of terrain featuring Verona Rupes—the tallest cliff face in the Solar System at 20 km high.',
      'A rock dropped from Verona Rupes would take 12 full minutes to hit the bottom under its gentle microgravity.'
    ]
  },
  {
    id: 'ariel',
    name: 'Ariel',
    nameZh: '天卫一',
    type: 'moon',
    parent: 'uranus',
    radiusKm: 578.9,
    displayRadius: 0.54,
    semiMajorAxisKm: 191020,
    displayDistance: 9.2,
    orbitalPeriodDays: 2.520,
    rotationPeriodHours: 60.48,
    axialTiltDeg: 0,
    eccentricity: 0.0012,
    inclinationDeg: 0.26,
    colorHex: 0xe5e7eb,
    massKg: '1.29 × 10²¹ kg',
    gravityMps2: 0.269,
    factsZh: [
      '天王星最明亮的一颗卫星，地表被纵横交错的巨大断裂地堑和冰火山熔岩流网络切开。'
    ],
    factsEn: [
      'Brightest of Uranus’ moons, dissected by extensive fault scarps and volcanic cryolava smooth graben floors.'
    ]
  },
  {
    id: 'umbriel',
    name: 'Umbriel',
    nameZh: '天卫二',
    type: 'moon',
    parent: 'uranus',
    radiusKm: 584.7,
    displayRadius: 0.55,
    semiMajorAxisKm: 266300,
    displayDistance: 11.5,
    orbitalPeriodDays: 4.144,
    rotationPeriodHours: 99.46,
    axialTiltDeg: 0,
    eccentricity: 0.0039,
    inclinationDeg: 0.21,
    colorHex: 0x4b5563,
    massKg: '1.22 × 10²¹ kg',
    gravityMps2: 0.237,
    factsZh: [
      '天王星卫星群中最黑暗古老的一颗，表面仅反射16%光线，拥有一个奇特的明亮白色光环环形山（温达撞击坑）。'
    ],
    factsEn: [
      'Darkest major Uranian moon (albedo 0.16) with an enigmatic bright fluorescent ring crater called Wunda.'
    ]
  },
  {
    id: 'titania',
    name: 'Titania',
    nameZh: '天卫三',
    type: 'moon',
    parent: 'uranus',
    radiusKm: 788.4,
    displayRadius: 0.62,
    semiMajorAxisKm: 435910,
    displayDistance: 15.0,
    orbitalPeriodDays: 8.706,
    rotationPeriodHours: 208.9,
    axialTiltDeg: 0,
    eccentricity: 0.0011,
    inclinationDeg: 0.34,
    colorHex: 0x9ca3af,
    massKg: '3.42 × 10²¹ kg',
    gravityMps2: 0.379,
    factsZh: [
      '天王星最大的卫星，太阳系第八大卫星，表面横亘着长达1600公里的梅西纳大峡谷。'
    ],
    factsEn: [
      'Largest moon of Uranus and eighth largest in the Solar System, marked by the 1,600-km-long Messina Chasma.'
    ]
  },
  {
    id: 'oberon',
    name: 'Oberon',
    nameZh: '天卫四',
    type: 'moon',
    parent: 'uranus',
    radiusKm: 761.4,
    displayRadius: 0.60,
    semiMajorAxisKm: 583520,
    displayDistance: 18.5,
    orbitalPeriodDays: 13.463,
    rotationPeriodHours: 323.1,
    axialTiltDeg: 0,
    eccentricity: 0.0014,
    inclinationDeg: 0.06,
    colorHex: 0x6b7280,
    massKg: '3.01 × 10²¹ kg',
    gravityMps2: 0.346,
    factsZh: [
      '天王星最外侧的大卫星，密布暗色撞击坑，坑底常常覆盖着神秘的暗黑色沉积物质。'
    ],
    factsEn: [
      'Outermost major moon of Uranus, heavily cratered with mysterious dark carbonaceous deposits on crater floors.'
    ]
  },

  // =========================================================================
  // 9. NEPTUNE & ITS MOONS (海王星及卫星群)
  // =========================================================================
  {
    id: 'neptune',
    name: 'Neptune',
    nameZh: '海王星',
    type: 'planet',
    parent: null,
    radiusKm: 24622,
    displayRadius: 4.0,
    semiMajorAxisKm: 4495000000,
    displayDistance: 400,
    orbitalPeriodDays: 60190.0, // 164.8 Earth years
    rotationPeriodHours: 16.11,
    axialTiltDeg: 28.32,
    eccentricity: 0.0086,
    inclinationDeg: 1.77,
    colorHex: 0x2563eb,
    hasAtmosphere: true,
    atmosphereColor: 0x60a5fa,
    hasRings: true,
    ringInnerRadius: 4.8,
    ringOuterRadius: 6.8,
    massKg: '1.024 × 10²⁶ kg (17.1 地球)',
    gravityMps2: 11.15,
    factsZh: [
      '人类“用笔尖算出来的行星”：1846年科学家通过天王星轨道摄动计算出其位置并成功观测到。',
      '太阳系风速之王：高层大气中狂风呼啸时速高达2100公里（超音速），超过5马赫！',
      '呈现浓烈深邃的皇家钴蓝色，曾出现比地球还大的大黑斑风暴与飞速变幻的白云斑块。'
    ],
    factsEn: [
      'The "planet found by mathematics": predicted by Urbain Le Verrier from orbital perturbations of Uranus in 1846.',
      'Wind speed champion: storms rage at supersonic speeds up to 2,100 km/h (>Mach 1.7).',
      'Deep azure appearance accompanied by white methane cirrus cloud streaks and dynamic giant dark vortices.'
    ]
  },
  {
    id: 'triton',
    name: 'Triton',
    nameZh: '海卫一',
    type: 'moon',
    parent: 'neptune',
    radiusKm: 1353.4,
    displayRadius: 0.56,
    semiMajorAxisKm: 354760,
    displayDistance: 8.5,
    orbitalPeriodDays: -5.877, // Retrograde orbit!
    rotationPeriodHours: 141.0,
    axialTiltDeg: 0,
    eccentricity: 0.000016,
    inclinationDeg: 156.88,   // Retrograde inclination
    colorHex: 0xa5f3fc,
    massKg: '2.14 × 10²² kg',
    gravityMps2: 0.779,
    factsZh: [
      '太阳系所有大卫星中唯一“逆向公转”的天体，原是一颗被海王星引力俘获的柯伊伯带矮行星（类似冥王星）。',
      '表面温度低至-235℃，拥有类似哈密瓜皮的“哈密瓜地形”，以及喷射高度达8公里的液氮低温间歇泉。',
      '逆行轨道导致潮汐力使其不断逼近海王星，预计约36亿年后将越过洛希极限粉碎为海王星环。'
    ],
    factsEn: [
      'The only large moon in retrograde orbit; a captured dwarf planet from the Kuiper Belt (Pluto’s cousin).',
      'Surface temperature drops to -235°C, featuring melon-skin cantaloupe terrain and active nitrogen geysers.',
      'Tidally decelerating and will cross Neptune’s Roche limit in ~3.6 billion years, forming a spectacular ring.'
    ]
  },
  {
    id: 'proteus',
    name: 'Proteus',
    nameZh: '海卫八',
    type: 'moon',
    parent: 'neptune',
    radiusKm: 210.0,
    displayRadius: 0.32,
    semiMajorAxisKm: 117647,
    displayDistance: 5.5,
    orbitalPeriodDays: 1.122,
    rotationPeriodHours: 26.9,
    axialTiltDeg: 0,
    eccentricity: 0.0005,
    inclinationDeg: 0.55,
    colorHex: 0x64748b,
    massKg: '4.4 × 10¹⁹ kg',
    gravityMps2: 0.07,
    factsZh: [
      '海王星第二大卫星，多面盒状的不规则形态，几乎达到了自身重力未能将其拉扯成球体的物理极限大小。'
    ],
    factsEn: [
      'Neptune’s second largest moon, right at the physical size limit of an unrounded, non-spherical body.'
    ]
  }
];

// Lookup maps for rapid querying
export const CELESTIAL_MAP = new Map();
CELESTIAL_DATA.forEach(b => CELESTIAL_MAP.set(b.id, b));

export const PLANETS = CELESTIAL_DATA.filter(b => b.type === 'planet');
export const MOONS = CELESTIAL_DATA.filter(b => b.type === 'moon');
