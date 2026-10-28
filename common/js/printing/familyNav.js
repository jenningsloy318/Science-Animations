// common/js/printing/familyNav.js — 家族页头导航条（spec 10 §4/D7）
// 🖨️ 回枢纽 + ← 上一段 / 下一段 → + 🏠 门户 + 语言按钮 + 声音开关。
// 仅浏览器使用（import i18n 单例），不进入 node:test。
'use strict';

import { i18n } from '../i18n.js';
import * as sound from './sound.js';

/** 家族清单（顺序 = 发展顺序；dir = 仓库目录名） */
export const FAMILY = Object.freeze([
  { id: 'hub',          dir: 'printing',                icon: '📜', zh: '时间轴枢纽', en: 'Timeline hub',        sceneHome: null },
  { id: 'woodblock',    dir: 'printing-woodblock',      icon: '🪵', zh: '雕版',       en: 'Woodblock',           sceneHome: 'W1' },
  { id: 'movable-type', dir: 'printing-movable-type',   icon: '🏺', zh: '活字重组',   en: 'Movable type',        sceneHome: 'M1' },
  { id: 'gutenberg',    dir: 'printing-gutenberg',      icon: '⚙️', zh: '谷登堡系统', en: 'Gutenberg system',    sceneHome: 'G1' },
  { id: 'press-age',    dir: 'printing-press-age',      icon: '🔥', zh: '蒸汽与热金属', en: 'Steam & hot metal', sceneHome: 'A1' },
  { id: 'offset',       dir: 'printing-offset',         icon: '💧', zh: '胶印',       en: 'Offset',              sceneHome: 'O1' },
  { id: 'digital',      dir: 'printing-digital',        icon: '⚡', zh: '光与电',     en: 'Light & electric',    sceneHome: 'D1' },
  { id: 'frontier',     dir: 'printing-frontier',       icon: '🚀', zh: '从印到造',   en: 'Print to make',       sceneHome: 'F1' },
]);

function label(entry, lang) { return entry[lang] || entry.zh; }

/** 组件自包含样式（首次渲染注入一次） */
const FNAV_CSS = `
.family-nav{display:flex;align-items:center;gap:14px;padding:10px 16px;flex-wrap:wrap;
  background:rgba(255,253,247,0.9);border-bottom:1px solid rgba(0,0,0,0.08);font-size:14px}
.family-nav a{color:inherit;text-decoration:none}
.family-nav .fnav-hub{font-weight:700}
.family-nav .fnav-cur{font-weight:600;opacity:0.85}
.family-nav .fnav-step{opacity:0.85;padding:2px 6px;border-radius:8px}
.family-nav .fnav-step:hover{background:rgba(0,0,0,0.05)}
.family-nav .fnav-step.is-off{opacity:0.3;pointer-events:none}
.family-nav .fnav-spacer{flex:1}
.family-nav .fnav-sound{border:none;background:rgba(0,0,0,0.05);border-radius:8px;padding:4px 8px;cursor:pointer;font-size:15px}
.family-nav .lang-btn{border:none;background:transparent;cursor:pointer;padding:3px 8px;border-radius:9999px;font-size:12.5px}
.family-nav .lang-btn.active{background:rgba(0,0,0,0.08)}
.family-nav #homeBtn{padding:3px 8px;border-radius:8px;background:rgba(0,0,0,0.05)}
`;
function ensureStyle() {
  if (typeof document === 'undefined') return;
  if (!document.getElementById('family-nav-css')) {
    const s = document.createElement('style'); s.id = 'family-nav-css'; s.textContent = FNAV_CSS;
    document.head.appendChild(s);
  }
}

/**
 * 渲染导航条到 el。
 * @param currentId FAMILY.id（hub 时不渲染 prev/next，改为家族索引提示）
 * @param opts.scene 可选：当前场景 id（ hubs 用于“回到历史坐标”高亮）
 */
export function renderFamilyNav(el, currentId, opts = {}) {
  ensureStyle();
  const idx = FAMILY.findIndex((f) => f.id === currentId);
  const cur = FAMILY[idx];
  const lang = i18n.currentLang === 'en' ? 'en' : 'zh';
  const prev = idx > 0 ? FAMILY[idx - 1] : null;
  const next = idx >= 0 && idx < FAMILY.length - 1 ? FAMILY[idx + 1] : null;

  const hubHref = currentId === 'hub' ? './' : '../printing/';
  const backHome = `<a id="homeBtn" href="../index.html" title="返回首页 Back to home">🏠 首页</a>`;

  let steps = '';
  if (currentId !== 'hub') {
    steps = `
      <a class="fnav-step ${prev ? '' : 'is-off'}" href="${prev ? '../' + prev.dir + '/' : '#'}">${prev ? '← ' + prev.icon + ' ' + label(prev, lang) : '←'}</a>
      <span class="fnav-cur">${cur.icon} ${label(cur, lang)}</span>
      <a class="fnav-step ${next ? '' : 'is-off'}" href="${next ? '../' + next.dir + '/' : '#'}">${next ? label(next, lang) + ' ' + next.icon + ' →' : '→'}</a>`;
  } else {
    steps = `<span class="fnav-cur">${cur.icon} ${label(cur, lang)}</span>`;
  }

  el.className = 'family-nav';
  el.innerHTML = `
    <a class="fnav-hub" href="${hubHref}">🖨️ <span data-i18n="nav.family">印刷史</span></a>
    ${steps}
    <span class="fnav-spacer"></span>
    <button id="soundBtn" class="fnav-sound" title="Sound on/off" aria-pressed="${!sound.isMuted()}">${sound.isMuted() ? '🔇' : '🔊'}</button>
    <span class="fnav-lang">
      <button class="lang-btn" data-lang-btn="zh">🇨🇳 中文</button>
      <button class="lang-btn" data-lang-btn="en">🇬🇧 EN</button>
    </span>
    ${backHome}`;

  // 声音开关
  el.querySelector('#soundBtn').addEventListener('click', (e) => {
    const m = sound.toggleMute();
    e.currentTarget.textContent = m ? '🔇' : '🔊';
    e.currentTarget.setAttribute('aria-pressed', String(!m));
  });

  // 语言按钮（ScienceI18n 内建持久化 + 跨标签同步）
  const syncLangBtns = () => el.querySelectorAll('[data-lang-btn]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.langBtn === i18n.currentLang);
  });
  syncLangBtns();
  el.querySelectorAll('[data-lang-btn]').forEach((btn) => {
    btn.addEventListener('click', () => i18n.setLanguage(btn.dataset.langBtn));
  });

  // 重渲染（语言切换后刷新本条 + 通知宿主）
  const unsub = i18n.subscribe(() => {
    const scrollY = window.scrollY;
    renderFamilyNav(el, currentId, opts);
    window.scrollTo(0, scrollY);
    if (typeof opts.onRerender === 'function') opts.onRerender();
  });
  return { unsub };
}
