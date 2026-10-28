// common/js/printing/speedLadder.js — 认证速度阶梯 + 对数轴换算（spec 10 §2.3/S5/G10）
// 锚点全部一手来源（spec 10 附录 11.1）；纯数据无 DOM，可 node:test。
'use strict';

/**
 * 认证锚点（页/小时）。value 严格递增；G10 断言依赖此表。
 * prov: certified = 史书/机构记录；measured = 厂商公开参数。
 */
export const SPEED_ANCHORS = Object.freeze([
  {
    value: 250, order: 0,
    zh: '手工木制印刷机（两人操作，~1800s 口径）', en: 'Wooden hand press (two-man, ~c.1800)',
    prov: 'measured', src: 'Smithsonian: Wooden Hand Presses; HistoryofInformation #39; Britannica (240–250 sph)',
  },
  {
    value: 1100, order: 1,
    zh: '科尼希蒸汽圆筒机（1814，《泰晤士报》）', en: 'Koenig steam cylinder press (1814, The Times)',
    prov: 'certified', src: 'HistoryofInformation #4613; Koenig & Bauer (4× hand presses)',
  },
  {
    value: 8000, order: 2,
    zh: '霍伊轮转机（1847，圆压圆）', en: 'Hoe type-revolving rotary (1847)',
    prov: 'certified', src: 'NIHF (invent.org): ~8,000 papers/hr',
  },
  {
    value: 20000, order: 3,
    zh: '现代单张纸胶印上限', en: 'Modern sheetfed offset (max)',
    prov: 'measured', src: 'Koenig & Bauer Rapida 106 (18,000) / 106 X (20,000 sph)',
  },
  {
    value: 90000, order: 4,
    zh: '卷筒纸轮转胶印（成品报纸）', en: 'Web offset (finished newspapers)',
    prov: 'measured', src: 'Koenig & Bauer Commander CT: up to 90,000 cph',
  },
]);

/** G10：阶梯单调 + 蒸汽机 ≥4× 手工机 */
export function ladderChecks() {
  const vs = SPEED_ANCHORS.map((a) => a.value);
  let monotonic = true;
  for (let i = 1; i < vs.length; i++) if (!(vs[i] > vs[i - 1])) monotonic = false;
  const ratio = vs[1] / vs[0];
  return { monotonic, ratio, pass: monotonic && ratio >= 4, values: vs };
}

/** 对数轴归一化：250 → 0.0，90000 → 1.0（低于/高于锚点则钳制） */
export function logPos(value) {
  const lo = SPEED_ANCHORS[0].value;
  const hi = SPEED_ANCHORS[SPEED_ANCHORS.length - 1].value;
  if (typeof value !== 'number' || value <= 0) return 0;
  return Math.min(1, Math.max(0, Math.log(value / lo) / Math.log(hi / lo)));
}

/** 人类可读速度文案（对数量级示意；低于锚点按示意处理由调用方标注） */
export function formatSpeed(value, lang = 'zh') {
  if (lang === 'en') return `${value.toLocaleString('en-US')} sheets/hr`;
  return `${value.toLocaleString('zh-CN')} 页/时`;
}
