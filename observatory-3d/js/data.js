// data.js — 事实、文案、纯函数（数据正确性的唯一来源）
// 所有数字核对至 2026-09-16，来源标号见规格附录 11.1/11.3。
'use strict';

const C_KMS = 299792.458;          // km/s
const C_MS = 299792458;            // m/s
const WIEB = 2.897771955e-3;       // 维恩位移常数 m·K（CODATA/SI 2019；四位有效数字 2.898e-3）
const RAYLEIGH = 1.22;             // 单口径艾里斑因子（**仅用于装满的单口径**）
const EYE_D = 0.007;               // 人眼暗适应瞳孔 m

// ── 5.3 纯函数（phase2 golden values 直接断言）──────────────────────────
function rayleigh(lam, D) { return RAYLEIGH * lam / D; }          // θ=1.22λ/D (rad) 单口径
function gather(D, Dref) { const r = D / Dref; return r * r; }    // 聚光面积比
function wien(T) { return WIEB / T; }                              // λmax (m)
function dopplerV(dlam, lam0) { return C_MS * dlam / lam0; }      // 视向速度 (m/s)
function shiftLam(v, lam0) { return lam0 * v / C_MS; }            // 波长位移 (m)
function magLimit(D) { return 6.5 + 5 * Math.log10(D / EYE_D); }  // 极限星等估算
function baseline(lam, B) { return lam / B; }                     // θ=λ/B (rad) **阵列约定，不乘 1.22**
function strainDisp(h, L) { return h * L; }                       // 引力波位移 (m)

const RAD2ARCSEC = 206264.806;
const RAD2MAS = RAD2ARCSEC * 1e3;
const RAD2UAS = RAD2ARCSEC * 1e6;
function radToArcsec(r) { return r * RAD2ARCSEC; }
function radToMas(r) { return r * RAD2MAS; }
function radToUas(r) { return r * RAD2UAS; }

// K 视向速度振幅：K = 28.4·(Mp sini/M_J)·(P/yr)^(−⅓)·(M*/M_sun)^(−⅔) m/s
function rvK(MpJup, Pday, Msun) {
  const P = Pday / 365.25;
  return 28.4 * MpJup * Math.pow(P, -1 / 3) * Math.pow(Msun, -2 / 3);
}

// ── 格式化 ────────────────────────────────────────────────────────────
function fmt(v, d) { return (+v).toLocaleString('zh-CN', { maximumFractionDigits: d == null ? 2 : d, minimumFractionDigits: 0 }); }
function sci(v, d) {
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 1e4 || a < 1e-2) return v.toExponential(d == null ? 2 : d);
  return fmt(v, d);
}
// 角度自动选单位
function fmtAngle(rad) {
  const a = Math.abs(rad);
  if (a < RAD2MAS / 1e3) return fmt(radToUas(rad) * 1e3, 2) + ' nrad'; // 极小
  if (a < RAD2ARCSEC / 60) return fmt(radToMas(rad), 2) + ' mas';
  if (a < RAD2ARCSEC * 60) return fmt(radToArcsec(rad), 2) + ' ″';
  return fmt(radToArcsec(rad) / 3600, 2) + ' °';
}

window.APP = window.APP || {};
APP.F = { rayleigh, gather, wien, dopplerV, shiftLam, magLimit, baseline, strainDisp, rvK,
  radToArcsec, radToMas, radToUas, fmt, sci, fmtAngle };
APP.C = { C_KMS, C_MS, WIEB, RAYLEIGH, EYE_D };
APP.RAD2 = { ARCSEC: RAD2ARCSEC, MAS: RAD2MAS, UAS: RAD2UAS };

// ── 页签元数据（2.1 页签清单 + 组色）────────────────────────────────────
const GROUPS = {
  gaze: { name: '望 · 接光', color: '#d8b25c' },
  read: { name: '读 · 拆光', color: '#a78bfa' },
  sharp: { name: '锐 · 合成', color: '#22d3ee' },
  rec: { name: '录 · 成数', color: '#f59e0b' },
  other: { name: '闻 · 换信使', color: '#2dd4bf' }
};

const TABS = [
  { id: 't1', key: 't1-messengers', icon: '📨', name: '信使全家福', group: 'gaze',
    q: '宇宙的信息怎么送到地球？', observ: ['angle', 'time', 'bright', 'wave'] },
  { id: 't2', key: 't2-telescope', icon: '🔭', name: '望远镜', group: 'gaze',
    q: '镜片越大为什么越强？', observ: ['bright', 'angle'] },
  { id: 't3', key: 't3-spectrograph', icon: '🌈', name: '光谱仪', group: 'read',
    q: '一束光怎么读出温度和成分？', observ: ['wave', 'bright'] },
  { id: 't4', key: 't4-doppler', icon: '🚑', name: '多普勒', group: 'read',
    q: '不看本体怎么知道它在动？', observ: ['wave'] },
  { id: 't5', key: 't5-interferometer', icon: '📡', name: '干涉仪', group: 'sharp',
    q: '小镜子怎么装成大眼睛？', observ: ['angle'] },
  { id: 't6', key: 't6-ao', icon: '✨', name: '自适应光学', group: 'sharp',
    q: '星星为什么眨眼？', observ: ['angle'] },
  { id: 't7', key: 't7-detector', icon: '📷', name: '探测器', group: 'rec',
    q: '光到了焦点怎么变数字？', observ: ['bright', 'time'] },
  { id: 't8', key: 't8-nonlight', icon: '🌊', name: '光之外', group: 'other',
    q: '光看不见的地方拿什么看？', observ: ['time', 'bright', 'wave'] }
];

const OBSERV_META = {
  angle:  { label: '角度', unit: '天球位置 / 分辨' },
  time:   { label: '时间', unit: '到达时刻 / 周期' },
  bright: { label: '亮度', unit: '光子计数' },
  wave:   { label: '波长', unit: '谱线 / 频率' }
};

// ── 仪器数字（附录 11.1，来源标号 ¹..²⁵ 见 11.3）──────────────────────
const D = {
  eye: { d: 0.007, diffArcsec: 19.8, physioArcsec: 60 },           // ¹⁷ 衍射 vs 生理分开
  hubble:  { D: 2.4, altKm: 483, incl: 28.5, wl: '80 nm–1.7 μm', lenM: 13.2, resArcsec: 0.058 },
  jwst:    { D: 6.5, segs: 18, shield: 'SPF 1,000,000', orbit: 'L2', miriK: 7, nirspec: '~250,000 快门 / ~100 天体' },
  elt:     { D: 39, site: 'Cerro Armazones', firstLight: '2029-03', sciFirstLight: '2030-12', aoRes: '4–12 mas' },
  vlt:     { D: 8.2, nUT: 4, nAT: 4, astromUas: 10 },
  alma:    { n: 66, wl: '0.32–3.6 mm', Bmin: 150, Bmax: 16000, correlator: '1.6×10¹⁶ ops/s', resMas: 5 },
  eht:     { wl: 1.3e-3, Bmax: 1.07e7, resUas: 25, stations: 8,
            names: 'ALMA · APEX · IRAM 30 m · JCMT · LMT · SMA · SMT · SPT' },
  m87:     { mass: '6.5×10⁹ M☉', dist: '5,500 万光年', eh: '<400 亿 km', shadow: '≈2.5 倍', date: '2019-04-10' },
  gaia:    { stars: '约 20 亿', lim: 'G≈20.7', astrom: 'μas' },
  seeing:  { good: '0.5–1″', vltBefore: 0.8, vltAfter: '0.02–0.05″' },
  ao:      { laser: '589 nm 钠光', layerKm: 90, sh: '41×41', actuators: 1377, khz: 1.2 },
  ccd:     { year: 1969, qe: '80–90%', film: '<5%' },
  pmt:     { gain: '~10⁶', dom: '10 英寸' },
  icecube: { vol: '1 km³', strings: 86, doms: 5160, deep: '1,450–2,450 m',
             stringSp: 125, vertSp: 17, deepCore: 8, cerenkovDeg: 41, n: '1.31–1.33' },
  ligo:    { armKm: 4, strain: 1e-21, disp: 4e-18, gw: 'GW150914', date: '2015-09-14',
             mass: '36+29→62 M☉', dist: '13 亿光年', radiated: '3 M☉' },
  lisa:    { armKm: '2.5×10⁶', year: '~2035', band: 'mHz' },
  gw170817:{ gap: '1.7 s', h0: '≈70 km/s/Mpc' },
  samples: [
    { name: '阿波罗', mass: '382 kg' }, { name: '嫦娥五号', mass: '1,731 g' },
    { name: '嫦娥六号', mass: '1,935.3 g（首份月背）' }, { name: '隼鸟 2 号', mass: '5.4 g' },
    { name: 'OSIRIS-REx', mass: '121.6 g' }
  ],
  messengers: [
    { id: 'em',   name: '电磁波（光）', year: 1609, info: '携带：能量、波长、方向、偏振',
      obs: ['angle', 'time', 'bright', 'wave'] },
    { id: 'nu',   name: '中微子', year: 1968, info: '弱相互作用，穿过地球不回头；读它点亮 DOM 的时刻',
      obs: ['angle', 'time'] },
    { id: 'gw',   name: '引力波', year: 2015, info: '时空涟漪；读两臂干涉条纹的相位差与时刻',
      obs: ['time', 'bright'] },
    { id: 'cr',   name: '宇宙线 / 高能 γ', year: 1912, info: '带电粒子被磁场螺旋偏折，指不回源头',
      obs: ['angle', 'bright'] },
    { id: 'smp',  name: '样品返回', year: 1969, info: '唯一能上手的"天文学"；同位素钟直接读年龄',
      obs: ['time', 'bright'] }
  ],
  icecube170922: { date: '2017-09-22', e: '≈290 TeV', err: '≈0.15°',
                   alert: '分钟级实时警报', gcn: '约 4 小时 GCN 快报', src: 'TXS 0506+056', sigma: '~3σ' },
  elements: [
    { sym: 'H',  name: '氢',  lines: [656.3, 486.1, 434.0], color: '#ff5e5e' },
    { sym: 'He', name: '氦',  lines: [587.6, 501.6, 471.3], color: '#ffd166' },
    { sym: 'Na', name: '钠',  lines: [589.0, 589.6], color: '#ff9f43' },
    { sym: 'Ca', name: '钙',  lines: [422.7, 393.4, 396.8], color: '#7ee787' },
    { sym: 'Fe', name: '铁',  lines: [438.4, 489.1, 495.7, 516.7], color: '#9ecbff' }
  ],
  stars: [
    { id: 'sun',  name: '太阳', type: 'G2V', T: 5772, lmax: 502 },
    { id: 'bet',  name: '参宿四', type: 'M1-2 Ia', T: 3500, lmax: 828 },
    { id: 'rigel', name: '参宿七', type: 'B8 Ia', T: 12100, lmax: 239 }
  ],
  obafgkm: ['O', 'B', 'A', 'F', 'G', 'K', 'M'],
  harps: { prec: 0.97, shiftFm: 2.1 },
  peg51: { K: '≈58', lit: '55.2–57.3', MpSini: 0.46, Pday: 4.23 },
  planets: [
    { name: '地球', K: '9 cm/s' }, { name: '木星', K: '12.5 m/s' }, { name: '51 Peg b', K: '≈58 m/s' }
  ],
  andromeda: { v: -300, merge: '45 亿年后相撞' },
  almaBands: { lam1mm: 1.0e-3, lamBand10: 0.32e-3 }
};

APP.DATA = { TABS, GROUPS, OBSERV_META, D };
