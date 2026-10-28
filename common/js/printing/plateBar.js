// common/js/printing/plateBar.js — 版性条：墨位 / 可重组 / 速度 三芯片（spec 10 §2.3/D4）
// 全家族唯一实现。纯函数 + 轻量 DOM 渲染；不 import i18n（Node 测试安全），语言由调用方传入。
'use strict';

/** 取值域（§2.3，G22 校验依据） */
export const INK_VALUES = Object.freeze(['relief', 'intaglio', 'planographic', 'stencil', 'plateless']);
export const RECOMBINE_VALUES = Object.freeze(['fixed', 'movable', 'recast', 'perpage', 'direct']);

/** 组件自包含样式（首次渲染注入一次；项目 css 无需复制） */
const PB_CSS = `
.plate-bar{display:flex;gap:10px;flex-wrap:wrap;align-items:stretch}
.plate-bar .pb-chip{display:inline-flex;flex-direction:column;gap:2px;padding:6px 12px;border-radius:10px;
  background:rgba(0,0,0,0.045);border:1px solid rgba(0,0,0,0.08);font-size:13px;line-height:1.35}
.plate-bar .pb-chip i{font-style:normal;font-size:11px;opacity:0.62;letter-spacing:0.05em}
.plate-bar .pb-chip em{font-style:normal;font-size:11px;opacity:0.6}
.plate-bar .pb-spd{min-width:150px}
.plate-bar .pb-meter{display:block;height:5px;border-radius:3px;background:rgba(0,0,0,0.1);margin-top:4px;overflow:hidden}
.plate-bar .pb-meter>span{display:block;height:100%;border-radius:3px;background:linear-gradient(90deg,#b5651d,#4f46e5,#059669)}
`;
function ensureStyle() {
  if (typeof document === 'undefined') return;
  if (!document.getElementById('plate-bar-css')) {
    const s = document.createElement('style'); s.id = 'plate-bar-css'; s.textContent = PB_CSS;
    document.head.appendChild(s);
  }
}

const LABELS = {
  ink: {
    relief:       { zh: '墨在凸起高处', en: 'Ink on raised areas' },
    intaglio:     { zh: '墨在凹陷低处', en: 'Ink in recessed lines' },
    planographic: { zh: '墨在亲油平面', en: 'Ink on oily flat' },
    stencil:      { zh: '墨从网孔漏下', en: 'Ink through mesh' },
    plateless:    { zh: '无版直印', en: 'Plateless direct' },
  },
  recombine: {
    fixed:   { zh: '一书一版', en: 'One book, one plate' },
    movable: { zh: '活字重组', en: 'Movable type' },
    recast:  { zh: '机器重铸', en: 'Machine recast' },
    perpage: { zh: '每页重刻', en: 'Re-made per page' },
    direct:  { zh: '直接成形', en: 'Direct forming' },
  },
  head: {
    ink:       { zh: '墨位', en: 'Ink seat' },
    recombine: { zh: '可重组', en: 'Recombination' },
    speed:     { zh: '速度', en: 'Speed' },
    perHour:   { zh: '页/时', en: ' sheets/hr' },
    na:        { zh: '另纲（按需/分层）', en: 'n/a (on-demand / layers)' },
    approx:    { zh: '约', en: '~' },
  },
};

/** 家族 7 个开发项目的版性取值（§2.3；G22 数据源）。hub 不挂版性条。 */
export const PROJECT_PLATES = Object.freeze({
  'woodblock':     { ink: 'relief',       recombine: 'fixed',   speed: 250,   note: { zh: '一版数百至数千张', en: 'A few hundred to a few thousand sheets per block' } },
  'movable-type':  { ink: 'relief',       recombine: 'movable', speed: 250,   note: null },
  'gutenberg':     { ink: 'relief',       recombine: 'movable', speed: 250,   note: { zh: '活字本就重组；跃迁在铸造精度与成本', en: 'Type was already movable; the leap was precision & cost' } },
  'press-age':     { ink: 'relief',       recombine: 'recast',  speed: 8000,  note: { zh: '整行铅版用毕回炉', en: 'Line slugs melted down after use' } },
  'offset':        { ink: 'planographic', recombine: 'fixed',   speed: 20000, note: { zh: '机制版，一版可印数万', en: 'Photo-made plate; tens of thousands per plate' } },
  'digital':       { ink: 'plateless',    recombine: 'perpage', speed: 'n/a', note: null },
  'frontier':      { ink: 'plateless',    recombine: 'direct',  speed: 'n/a', note: null },
});

/** 纯校验（G22）：spec = {ink, recombine, speed, note?} */
export function validatePlateBar(spec) {
  const errors = [];
  if (!spec || typeof spec !== 'object') return { ok: false, errors: ['spec is not an object'] };
  if (!INK_VALUES.includes(spec.ink)) errors.push(`bad ink: ${spec.ink}`);
  if (!RECOMBINE_VALUES.includes(spec.recombine)) errors.push(`bad recombine: ${spec.recombine}`);
  const s = spec.speed;
  if (!(typeof s === 'number' && s > 0) && s !== 'n/a') errors.push(`bad speed: ${s}`);
  return { ok: errors.length === 0, errors };
}

function L(group, key, lang) {
  const e = LABELS[group] && LABELS[group][key];
  if (!e) return key;
  return e[lang] || e.zh;
}

/** 渲染版性条到 el。lang = 'zh' | 'en'；speed 数字走 speedLadder 对数位。 */
export function renderPlateBar(el, spec, lang = 'zh', logPos = null) {
  ensureStyle();
  const v = validatePlateBar(spec);
  el.classList.add('plate-bar');
  if (!v.ok) {
    el.textContent = '⚠️ plateBar: ' + v.errors.join('; ');
    return v;
  }
  const speedTxt = spec.speed === 'n/a'
    ? L('head', 'na', lang)
    : `${L('head', 'approx', lang)}${spec.speed.toLocaleString(lang === 'en' ? 'en-US' : 'zh-CN')}${L('head', 'perHour', lang)}`;
  const pos = (typeof spec.speed === 'number' && logPos) ? logPos(spec.speed) : null;
  el.innerHTML = `
    <span class="pb-chip pb-ink"><i>${L('head', 'ink', lang)}</i>${L('ink', spec.ink, lang)}</span>
    <span class="pb-chip pb-rec"><i>${L('head', 'recombine', lang)}</i>${L('recombine', spec.recombine, lang)}${spec.note ? `<em>${spec.note[lang] || spec.note.zh}</em>` : ''}</span>
    <span class="pb-chip pb-spd"><i>${L('head', 'speed', lang)}</i>${speedTxt}
      ${pos !== null ? `<span class="pb-meter"><span style="width:${(pos * 100).toFixed(1)}%"></span></span>` : ''}
    </span>`;
  return v;
}
