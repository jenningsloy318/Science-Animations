// common/js/printing/sceneKit.js — 场景工厂 kit（spec 10 v3.0：全量 Three.js 3D 空间机构 + 共享 WebGLRenderer + 3D 空间标注与工序 HUD）
'use strict';

import * as THREE from 'three';
import { i18n } from '../i18n.js';
import { renderFamilyNav } from './familyNav.js';
import { renderPlateBar, PROJECT_PLATES } from './plateBar.js';
import { logPos } from './speedLadder.js';
import * as sound from './sound.js';
import {
  woodCanvas, metalCanvas, paperCanvas, stoneCanvas, glyphCanvas,
  toTexture, studioEquirect,
} from './textures.js';

export {
  THREE, sound, i18n,
  woodCanvas, metalCanvas, paperCanvas, stoneCanvas, glyphCanvas, toTexture, studioEquirect,
};

/** 基础项目样式（首次引导注入一次；项目 css 只放项目私有样式） */
const BASE_CSS = `
body{margin:0;min-height:100vh;display:flex;flex-direction:column;
  background:radial-gradient(circle at 12% 8%, rgba(181,101,29,0.06), transparent 42%),
             radial-gradient(circle at 88% 90%, rgba(79,70,229,0.05), transparent 42%),
             #faf6ee;color:#1a1a1a;
  font-family:'Outfit',-apple-system,'Noto Sans SC','PingFang SC',sans-serif}
main{flex:1;width:min(1180px,94vw);margin:0 auto;padding:18px 0 40px}
h1{font-size:clamp(18px,2.3vw,23px);margin:0 0 10px;font-weight:750;letter-spacing:-0.01em}
.subtitle{color:#6b6357;margin:4px 0 16px;font-size:14.5px}
.scene{display:none}
.scene.active{display:block;animation:sceneIn .42s cubic-bezier(0.22,1,0.36,1)}
.stickyhead{position:sticky;top:0;z-index:30;background:rgba(250,246,238,.94);backdrop-filter:blur(10px);
  padding:10px 0 8px;margin:0 -8px;padding-left:8px;padding-right:8px;border-bottom:1px solid rgba(0,0,0,.07);
  box-shadow:0 4px 16px -6px rgba(45,35,20,.05)}
.scene-layout{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(280px,1fr);gap:20px;align-items:start}
.explain-col .explain{grid-template-columns:1fr;margin-top:0}
@media(max-width:880px){.scene-layout{grid-template-columns:1fr}.explain-col .explain{grid-template-columns:1fr 1fr;margin-top:14px}}
@keyframes sceneIn{from{opacity:0;transform:translateY(10px) scale(0.992)}to{opacity:1;transform:none}}
.scene-title{font-size:21px;font-weight:750;margin-bottom:3px;letter-spacing:-0.01em}
.scene-hint{color:#6b6357;font-size:13.5px;margin-bottom:12px}
.stage-wrap{background:radial-gradient(ellipse at 50% 38%, #26211c 0%, #141210 100%);
  border:1px solid rgba(90,70,45,.22);border-radius:16px;overflow:hidden;position:relative;
  box-shadow:0 12px 28px -8px rgba(25,18,10,.25), inset 0 1px 0 rgba(255,255,255,.12);
  user-select:none;touch-action:none}
.stage-wrap canvas{display:block;width:100%}
.stage-gl-slot{position:absolute;inset:0;z-index:1}
.stage-hud-canvas{position:absolute;inset:0;z-index:2;pointer-events:none;width:100%;height:100%}
.cam-badge{position:absolute;left:10px;top:10px;z-index:3;border:1px solid rgba(255,245,225,.22);
  background:rgba(20,18,16,.72);backdrop-filter:blur(6px);color:#f5ebd6;font-size:11px;font-weight:600;
  padding:4px 9px;border-radius:999px;cursor:pointer;font-family:inherit;transition:all .16s ease}
.cam-badge:hover{background:rgba(181,101,29,.85);border-color:rgba(255,255,255,.5);color:#fff}
.steps{display:flex;gap:7px;flex-wrap:wrap;margin-top:11px;align-items:center}
.steps button, button.steps{border:1px solid rgba(70,55,35,.16);background:linear-gradient(180deg,#ffffff 0%,#f8f4ec 100%);
  border-radius:10px;padding:6px 13px;font-size:13px;font-weight:550;cursor:pointer;color:#221e1a;font-family:inherit;
  box-shadow:0 2px 5px rgba(0,0,0,.04), inset 0 1px 0 rgba(255,255,255,.9);
  transition:transform .16s cubic-bezier(.2,1,.3,1), box-shadow .16s ease, background .16s ease, border-color .16s ease}
.steps button:hover, button.steps:hover{transform:translateY(-1px);box-shadow:0 4px 10px rgba(0,0,0,.08);border-color:rgba(181,101,29,.45)}
.steps button:active, button.steps:active{transform:translateY(0.5px)}
.steps button.on, button.steps.on{background:linear-gradient(180deg,#2c2621 0%,#1a1613 100%);color:#fffdf7;
  border-color:#1a1613;box-shadow:0 3px 10px rgba(26,22,19,.22)}
.card{margin-top:12px;padding:12px 15px;border-radius:13px;background:rgba(255,255,255,.9);
  border:1px solid rgba(70,55,35,.1);border-left:4px solid #b5651d;font-size:13.5px;line-height:1.65;
  box-shadow:0 3px 10px rgba(45,35,20,.03)}
.card.prov{font-size:12px;color:#6b6357;border-left-color:#8d99ae}
.readout{display:flex;gap:14px;flex-wrap:wrap;margin-top:10px;padding:8px 12px;border-radius:11px;
  background:rgba(244,239,228,.65);border:1px solid rgba(70,55,35,.08);
  font-variant-numeric:tabular-nums;font-size:13.5px;align-items:center}
.readout b{font-size:15.5px;color:#1a1613}
.explain{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}
.ex-row{padding:11px 13px;border-radius:12px;background:rgba(255,255,255,.92);border:1px solid rgba(70,55,35,.1);
  font-size:13px;line-height:1.7;box-shadow:0 2px 8px rgba(45,35,20,.025)}
.ex-h{font-weight:700;font-size:12.5px;margin-bottom:4px}
.ex-what{border-left:4px solid #b5651d}.ex-what .ex-h{color:#b5651d}
.ex-steps{border-left:4px solid #4a6274}.ex-steps .ex-h{color:#4a6274}
.ex-why{border-left:4px solid #4f46e5}.ex-why .ex-h{color:#4f46e5}
.ex-diy{border-left:4px solid #059669}.ex-diy .ex-h{color:#059669}
.ex-struct{border-left:4px solid #6b6357}.ex-struct .ex-h{color:#6b6357}
.ex-steps .ex-step{opacity:.58;transition:opacity .25s ease, color .25s ease}
.ex-steps .ex-step.on{opacity:1;font-weight:700;color:#1a1613}
.steprail{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:0 0 10px}
.steprail .sr-step{border:1px solid rgba(70,55,35,.14);background:#fff;color:#4a433b;padding:4px 11px;
  border-radius:9999px;font-size:12px;cursor:default;font-family:inherit;transition:all .25s cubic-bezier(.2,1,.3,1)}
.steprail .sr-step.on{background:#1a1613;color:#fffdf7;border-color:#1a1613;transform:translateY(-1px);
  box-shadow:0 3px 8px rgba(0,0,0,.14)}
.steprail .sr-replay{margin-left:auto;border:1px solid rgba(70,55,35,.16);background:#fff;color:#5a5248;
  padding:4px 11px;border-radius:9999px;font-size:12px;cursor:pointer;font-family:inherit;transition:all .16s ease}
.steprail .sr-replay:hover{background:#f5efe2;color:#1a1613;border-color:rgba(181,101,29,.4)}
.era-ribbon{display:flex;gap:5px;margin:0 0 11px}
.era-ribbon .era-seg{flex:1;height:10px;border:none;border-radius:5px;cursor:pointer;padding:0;
  transition:height .25s cubic-bezier(.2,1,.3,1),background .3s ease, box-shadow .25s ease;min-width:34px}
.era-ribbon .era-seg.cur{height:15px;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,.14)}
.gen-chip{display:inline-block;margin-left:8px;padding:1px 8px;border-radius:9999px;font-size:11px;
  background:rgba(181,101,29,.1);color:#8a4b14;vertical-align:1px;font-weight:600}
@media(max-width:720px){.explain{grid-template-columns:1fr}}
@media(max-width:720px){
  .tabs{flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch}
  .tabs button{white-space:nowrap;flex:0 0 auto}
  .steprail{flex-wrap:nowrap;overflow-x:auto}
  .steprail .sr-step{white-space:nowrap;flex:0 0 auto}
}
.slider-row{display:flex;align-items:center;gap:10px;margin:7px 0;font-size:13px}
.slider-row input[type=range]{flex:1;accent-color:#b5651d;cursor:pointer}
.slider-row .val{min-width:64px;text-align:right;font-variant-numeric:tabular-nums;font-weight:600}
.tabs{display:flex;gap:5px;flex-wrap:wrap;margin:0}
.tabs button{border:1px solid rgba(70,55,35,.14);background:rgba(255,255,255,.88);color:#3a342e;padding:4px 9.5px;
  border-radius:8px;cursor:pointer;font-size:12.5px;font-family:inherit;transition:all .16s ease}
.tabs button:hover{background:#fff;transform:translateY(-1px);box-shadow:0 2px 6px rgba(0,0,0,.06)}
.tabs button.on{background:#1a1613;color:#fffdf7;border-color:#1a1613;font-weight:600;box-shadow:0 3px 8px rgba(0,0,0,.15)}
.scene-nav{display:flex;align-items:center;justify-content:center;gap:18px;margin-top:24px}
.scene-nav a,.scene-nav button{border:1px solid rgba(0,0,0,.12);background:#fff;color:inherit;padding:8px 16px;
  border-radius:10px;cursor:pointer;font-size:14px;font-family:inherit;text-decoration:none}
.scene-nav a.is-off{opacity:0.3;pointer-events:none}
.scene-nav .page-pos{color:#6b6357;font-size:13px;font-variant-numeric:tabular-nums}
footer{padding:12px 20px;border-top:1px solid rgba(0,0,0,.08);color:#6b6357;font-size:13px}
footer a{color:inherit}
@media (prefers-reduced-motion:reduce){.scene.active{animation:none}}
`;

/** 五代历程：场景首字母 → 时代序号 */
const ERA_OF = { w: 0, m: 1, g: 1, a: 2, o: 3, d: 3, f: 4 };
const ERAS = [
  { zh: '1 手工复制', en: '1 Hand copy', color: '#8d6e63', at: 'W1' },
  { zh: '2 活字时代', en: '2 Movable type', color: '#b5651d', at: 'M1' },
  { zh: '3 工业时代', en: '3 Industrial', color: '#4a6274', at: 'A1' },
  { zh: '4 光电时代', en: '4 Photoelectric', color: '#4f46e5', at: 'O1' },
  { zh: '5 造物时代', en: '5 Making', color: '#059669', at: 'F1' },
];

const GEN_OF = {
  w: ['第1代 · 手工复制', 'Gen 1 · Hand copying'],
  m: ['第2代 · 活字时代', 'Gen 2 · Movable type'],
  g: ['第2代 · 活字时代', 'Gen 2 · Movable type'],
  a: ['第3代 · 工业时代', 'Gen 3 · Industrial'],
  o: ['第4代 · 光电时代', 'Gen 4 · Photoelectric'],
  d: ['第4代 · 光电时代', 'Gen 4 · Photoelectric'],
  f: ['第5代 · 造物时代', 'Gen 5 · Making'],
};

function renderExplain(sec, t, id) {
  const key = (f) => `scene.${id.toLowerCase()}.f` ? `scene.${id.toLowerCase()}.${f}` : '';
  const rows = [
    ['what', 'ex-what', '🎬 场景', 'Scenario'],
    ['steps', 'ex-steps', '🧭 流程', 'Procedure'],
    ['why', 'ex-why', '💡 原理', 'Theory'],
    ['diy', 'ex-diy', '🛠️ 复刻', 'Make one'],
    ['struct', 'ex-struct', '🔧 结构', 'Anatomy'],
  ];
  const filled = rows.filter(([f]) => (t(key(f)) || '').trim());
  if (!filled.length) return;
  const gen = GEN_OF[id.toLowerCase()[0]];
  const chip = gen && id.toLowerCase()[0] !== 'h'
    ? `<span class="gen-chip">⏳ ${i18n.currentLang === 'en' ? gen[1] : gen[0]}</span>` : '';
  const wrap = document.createElement('div');
  wrap.className = 'explain';
  const stepHtml = (f, txt) => {
    if (f !== 'steps') return null;
    const marks = [];
    let m; const re = /[①-⑳]|\d+\)/g;
    while ((m = re.exec(txt)) !== null) marks.push({ i: m.index });
    if (!marks.length) return null;
    return marks.map((mk, j) => {
      const end = j + 1 < marks.length ? marks[j + 1].i : txt.length;
      return `<span class="ex-step" data-step="${j}">${txt.slice(mk.i, end).trim()}</span>`;
    }).join(' ');
  };
  wrap.innerHTML = filled.map(([f, cls, zhH, enH]) => {
    const txt = t(key(f));
    const body = stepHtml(f, txt) || txt;
    return `<div class="ex-row ${cls}"><div class="ex-h">${i18n.currentLang === 'en' ? enH : zhH}${f === 'what' ? chip : ''}</div><div class="ex-b">${body}</div></div>`;
  }).join('');
  sec.appendChild(wrap);
  const stepSpans = wrap.querySelectorAll('.ex-steps .ex-step');
  if (stepSpans.length) RAIL_SPANS.set(id.toUpperCase(), Array.from(stepSpans));
}

const RAIL_SETTERS = new Map();
const RAIL_SPANS = new Map();
function buildStepRail(sec, t, id) {
  const labels = (t(`scene.${id.toLowerCase()}.stepLabels`) || '').split('|').map((s) => s.trim()).filter(Boolean);
  if (!labels.length) return;
  const rail = document.createElement('div');
  rail.className = 'steprail';
  const pills = labels.map((lb) => {
    const b = document.createElement('span');
    b.className = 'sr-step';
    b.textContent = lb;
    rail.appendChild(b);
    return b;
  });
  const replay = document.createElement('button');
  replay.className = 'sr-replay';
  replay.textContent = '↻ ' + (i18n.currentLang === 'en' ? 'Replay' : '重播');
  replay.addEventListener('click', () => {
    pills.forEach((p) => p.classList.remove('on'));
    const mod = sec._mod;
    if (!mod) return;
    try { mod.onHide && mod.onHide(); } catch (e) {}
    setTimeout(() => { try { mod.onShow && mod.onShow(); } catch (e) { console.error('[replay]', e); } }, 60);
  });
  rail.appendChild(replay);
  sec.appendChild(rail);
  RAIL_SETTERS.set(id.toUpperCase(), (i) => pills.forEach((p, j) => p.classList.toggle('on', j === i)));
}

export function bootProject({ id, dict, scenes }) {
  i18n.loadDict(dict);
  const nav = document.getElementById('familyNav');
  if (nav) renderFamilyNav(nav, id);

  const bar = document.getElementById('plateBar');
  let idx = 0;
  let renderBar = () => {};
  if (bar) {
    renderBar = () => {
      const cur = scenes[idx];
      if (cur && cur.plate) {
        bar.hidden = false;
        renderPlateBar(bar, cur.plate, i18n.currentLang === 'en' ? 'en' : 'zh', logPos);
      } else {
        bar.hidden = true;
        bar.innerHTML = '';
      }
    };
    renderBar();
    i18n.subscribe(renderBar);
  }

  if (!document.getElementById('scene-kit-css')) {
    const s = document.createElement('style');
    s.id = 'scene-kit-css';
    s.textContent = BASE_CSS;
    document.head.appendChild(s);
  }

  const container = document.getElementById('scenes');
  const tabBar = document.getElementById('tabs');
  const t = (k, fb) => i18n.t(k, fb);
  const kit = { t, lang: () => i18n.currentLang, sound, step: () => {} };
  CUR_KIT = kit;

  const eraBtns = [];
  let ribbon = null;
  if (tabBar) {
    ribbon = document.createElement('div');
    ribbon.className = 'era-ribbon';
    ERAS.forEach((e) => {
      const b = document.createElement('button');
      b.className = 'era-seg';
      b.style.background = e.color + '30';
      b.title = i18n.currentLang === 'en' ? e.en : e.zh;
      b.addEventListener('click', () => go(scenes.findIndex((s) => s.id === e.at) - idx));
      ribbon.appendChild(b);
      eraBtns.push(b);
    });
    const stick = document.createElement('div');
    stick.className = 'stickyhead';
    tabBar.before(stick);
    stick.append(ribbon, tabBar);
  }

  const mods = scenes.map((def) => {
    const sec = document.createElement('section');
    sec.className = 'scene';
    buildStepRail(sec, t, def.id, kit);
    const h = document.createElement('h2');
    h.className = 'scene-title';
    const hint = document.createElement('p');
    hint.className = 'scene-hint';
    sec.append(h, hint);
    const layout = document.createElement('div');
    layout.className = 'scene-layout';
    const mainCol = document.createElement('div'); mainCol.className = 'scene-main';
    const explainCol = document.createElement('div'); explainCol.className = 'explain-col';
    layout.append(mainCol, explainCol);
    sec.append(layout);
    container.appendChild(sec);
    let mod = null;
    try { mod = def.create(mainCol, kit); } catch (e) { console.error(`[${def.id} create]`, e); }
    sec._mod = mod;
    renderExplain(explainCol, t, def.id);
    const structText = t(`scene.${def.id.toLowerCase()}.struct`) || '';
    const stepsText = t(`scene.${def.id.toLowerCase()}.steps`) || '';
    if (mainCol._stageApi) {
      mainCol._stageApi._meta = { id: def.id, structText, stepsText, t };
    }
    return {
      id: def.id, mod, sec, h, hint, mainCol, explainCol,
      titleKey: `scene.${def.id.toLowerCase()}.title`,
      hintKey: `scene.${def.id.toLowerCase()}.hint`,
    };
  });

  const tabs = mods.map((m, i) => {
    const b = document.createElement('button');
    const c = scenes[i].color;
    if (c) b.style.borderBottom = `3px solid ${c}`;
    b.addEventListener('click', () => go(i - idx));
    if (tabBar) tabBar.appendChild(b);
    return b;
  });

  function apply() {
    mods.forEach((m, i) => {
      const show = i === idx;
      m.sec.classList.toggle('active', show);
      if (show) { try { m.mod.onShow(); } catch (e) { console.error(`[${m.id} onShow]`, e); } }
      else { try { m.mod.onHide(); } catch (e) { console.error(`[${m.id} onHide]`, e); } }
    });
    tabs.forEach((b, i) => {
      b.classList.toggle('on', i === idx);
      b.textContent = `${mods[i].id} ${t(mods[i].titleKey)}`;
    });
    renderBar();
    const ce = ERA_OF[mods[idx].id.toLowerCase()[0]] ?? 0;
    eraBtns.forEach((b, j) => {
      b.style.background = j <= ce ? ERAS[j].color : ERAS[j].color + '30';
      b.classList.toggle('cur', j === ce);
      b.title = i18n.currentLang === 'en' ? ERAS[j].en : ERAS[j].zh;
    });
    history.replaceState(null, '', idx === 0 ? './' : `?s=${mods[idx].id}`);
    document.title = `${t('app.title')} · ${t(mods[idx].titleKey)}`;
  }
  function go(delta) { idx = Math.min(mods.length - 1, Math.max(0, idx + delta)); apply(); }
  function rerender() {
    mods.forEach((m) => {
      m.h.textContent = t(m.titleKey);
      m.hint.textContent = t(m.hintKey);
      const old = m.explainCol.querySelector('.explain');
      if (old) old.remove();
      renderExplain(m.explainCol, t, m.id);
      if (m.mainCol && m.mainCol._stageApi) {
        m.mainCol._stageApi._meta = {
          id: m.id,
          structText: t(`scene.${m.id.toLowerCase()}.struct`) || '',
          stepsText: t(`scene.${m.id.toLowerCase()}.steps`) || '',
          t,
        };
      }
      const rail = m.sec.querySelector('.steprail .sr-replay');
      if (rail) rail.textContent = '↻ ' + (i18n.currentLang === 'en' ? 'Replay' : '重播');
      const labels = (t(`scene.${m.id.toLowerCase()}.stepLabels`) || '').split('|').map((s) => s.trim()).filter(Boolean);
      const pills = m.sec.querySelectorAll('.steprail .sr-step');
      pills.forEach((p, j) => { if (labels[j]) p.textContent = labels[j]; });
      const badge = m.sec.querySelector('.cam-badge');
      if (badge) {
        badge.textContent = i18n.currentLang === 'en'
          ? '🎥 3D Auto-Play · Drag Orbit · Scroll Zoom · Reset'
          : '🎥 3D 连续动画 · 拖拽旋转 · 滚轮缩放 · 复位';
      }
      if (m.mod && m.mod.rerender) m.mod.rerender();
    });
    apply();
  }

  const fromUrl = (new URLSearchParams(location.search).get('s') || '').toUpperCase();
  const i0 = Math.max(0, scenes.findIndex((s) => s.id === fromUrl));
  kit.step = (i) => {
    const curScene = scenes[Math.max(0, idx)];
    if (!curScene) return;
    const sid = curScene.id.toUpperCase();
    const fn = RAIL_SETTERS.get(sid);
    if (fn) fn(i);
    const spans = RAIL_SPANS.get(sid);
    if (spans) spans.forEach((s, j) => s.classList.toggle('on', j <= i));
    const curMod = mods[idx];
    if (curMod && curMod.mainCol && curMod.mainCol._stageApi) {
      curMod.mainCol._stageApi._activeStep = i;
    }
  };
  mods.forEach((m) => { if (m.mod && m.mod.mount) { try { m.mod.mount(); } catch (e) { console.error(`[${m.id} mount]`, e); } } });
  idx = i0;
  rerender();
  i18n.subscribe(rerender);

  document.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') go(1);
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(-1);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// v3.0 共享单 WebGLRenderer + Three.js 3D 舞台 (stage3d)
// ═══════════════════════════════════════════════════════════════════════════

let SHARED_RENDERER = null;
let SHARED_ENV_TEX = null;

function getSharedWebGL() {
  if (!SHARED_RENDERER) {
    SHARED_RENDERER = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    SHARED_RENDERER.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    SHARED_RENDERER.toneMapping = THREE.ACESFilmicToneMapping;
    SHARED_RENDERER.toneMappingExposure = 1.12;
    const pmrem = new THREE.PMREMGenerator(SHARED_RENDERER);
    SHARED_ENV_TEX = pmrem.fromEquirectangular(studioEquirect(THREE)).texture;
    pmrem.dispose();
  }
  return { renderer: SHARED_RENDERER, envTex: SHARED_ENV_TEX };
}

/**
 * 创建全功能 Three.js 3D 舞台 + 2D 空间引线标注 HUD + 交互式球面轨道相机 (Orbit Rig)
 */
export function stage3d(parent, arg2 = {}, arg3 = {}) {
  const opts = (arg2 && arg2.WebGLRenderer) ? arg3 : arg2;

  // 支持 camPos/camTarget 与 theta/phi/radius/target 两种相机配置方式
  let initTheta = opts.theta ?? 0.30;
  let initPhi = opts.phi ?? 1.04;
  let initRadius = opts.radius ?? 5.4;
  let initTarget = opts.target || opts.camTarget || [0, 0.3, 0];

  if (opts.camPos) {
    const dx = opts.camPos[0] - initTarget[0];
    const dy = opts.camPos[1] - initTarget[1];
    const dz = opts.camPos[2] - initTarget[2];
    initRadius = Math.max(2.2, Math.hypot(dx, dy, dz));
    initPhi = Math.acos(Math.max(-0.98, Math.min(0.98, dy / initRadius)));
    initTheta = Math.atan2(dx, dz);
  }

  const {
    height = 315,
    warm = true,
    bg = warm ? '#1c1713' : '#111824',
    fov = 42,
    table = true,
    tableY = opts.theta !== undefined ? -0.56 : -0.02,
  } = opts;

  const actualHeight = Math.max(305, height);

  const wrap = document.createElement('div');
  wrap.className = 'stage-wrap';
  wrap.style.height = actualHeight + 'px';
  parent.appendChild(wrap);

  const glSlot = document.createElement('div');
  glSlot.className = 'stage-gl-slot';
  wrap.appendChild(glSlot);

  const hudCanvas = document.createElement('canvas');
  hudCanvas.className = 'stage-hud-canvas';
  wrap.appendChild(hudCanvas);
  const g = hudCanvas.getContext('2d');

  const badge = document.createElement('button');
  badge.type = 'button';
  badge.className = 'cam-badge';
  badge.textContent = i18n.currentLang === 'en'
    ? '🎥 3D Auto-Play · Drag Orbit · Scroll Zoom · Reset'
    : '🎥 3D 连续动画 · 拖拽旋转 · 滚轮缩放 · 复位';
  wrap.appendChild(badge);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bg);

  const camera = new THREE.PerspectiveCamera(fov, 16 / 9, 0.1, 80);

  // 影棚三点光源 (Key + Fill + Rim)
  const amb = new THREE.AmbientLight(warm ? 0xffeacc : 0xdbeafe, 0.72);
  const keyLight = new THREE.DirectionalLight(warm ? 0xfff0d6 : 0xf8fafc, 1.65);
  keyLight.position.set(4.5, 7.2, 5.2);
  const rimLight = new THREE.DirectionalLight(warm ? 0xf59e0b : 0x38bdf8, 0.68);
  rimLight.position.set(-5.0, 3.4, -4.2);
  const fillLight = new THREE.DirectionalLight(0x94a3b8, 0.42);
  fillLight.position.set(-3.2, -2.0, 4.0);
  scene.add(amb, keyLight, rimLight, fillLight);

  const world = new THREE.Group();
  scene.add(world);

  // 3D 工坊圆台面与刻度环
  if (table) {
    const tbTex = toTexture(THREE, warm ? woodCanvas('#6e4b2a', 19, 256, 256) : stoneCanvas('#283242', 29, 256, 256), 2, 2);
    const tbMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(4.6, 4.8, 0.16, 48),
      new THREE.MeshStandardMaterial({
        map: tbTex,
        roughness: warm ? 0.72 : 0.45,
        metalness: warm ? 0.08 : 0.35,
      })
    );
    tbMesh.position.y = tableY - 0.08;
    scene.add(tbMesh);

    const ringMesh = new THREE.Mesh(
      new THREE.RingGeometry(3.85, 3.92, 64),
      new THREE.MeshBasicMaterial({ color: warm ? 0xd97706 : 0x38bdf8, transparent: true, opacity: 0.22, side: THREE.DoubleSide })
    );
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = tableY + 0.005;
    scene.add(ringMesh);
  }

  // 3D 空间光尘微粒
  const dustCount = 36;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.sin(i * 7.13) * 0.5) * 6.5;
    dustPos[i * 3 + 1] = -0.3 + ((i * 0.37) % 1) * 3.0;
    dustPos[i * 3 + 2] = (Math.cos(i * 5.71) * 0.5) * 4.5;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    color: warm ? 0xfcd34d : 0x7dd3fc,
    size: 0.045,
    transparent: true,
    opacity: 0.38,
  });
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  scene.add(dustPoints);

  // 球面轨道相机控制状态 (Orbit Rig)
  const orbit = {
    theta: initTheta,
    phi: initPhi,
    radius: initRadius,
    targetTheta: initTheta,
    targetPhi: initPhi,
    targetRadius: initRadius,
    target: new THREE.Vector3(...initTarget),
    goalTarget: new THREE.Vector3(...initTarget),
    dragging: false,
    lastX: 0,
    lastY: 0,
    userTouchedUntil: 0,
    reset() {
      this.targetTheta = initTheta;
      this.targetPhi = initPhi;
      this.targetRadius = initRadius;
      this.goalTarget.set(...initTarget);
      this.userTouchedUntil = 0;
    },
    setPose({ theta, phi, radius, target }) {
      if (performance.now() < this.userTouchedUntil) return;
      if (theta !== undefined) this.targetTheta = theta;
      if (phi !== undefined) this.targetPhi = phi;
      if (radius !== undefined) this.targetRadius = radius;
      if (target) this.goalTarget.set(target[0], target[1], target[2]);
    },
  };

  badge.addEventListener('click', (e) => {
    e.stopPropagation();
    orbit.reset();
    sound.play('tick');
  });

  wrap.addEventListener('pointerdown', (e) => {
    if (e.target === badge) return;
    orbit.dragging = true;
    orbit.lastX = e.clientX;
    orbit.lastY = e.clientY;
    orbit.userTouchedUntil = performance.now() + 8000;
    try { wrap.setPointerCapture(e.pointerId); } catch (_) {}
  });
  wrap.addEventListener('pointermove', (e) => {
    if (!orbit.dragging) return;
    const dx = e.clientX - orbit.lastX;
    const dy = e.clientY - orbit.lastY;
    orbit.lastX = e.clientX;
    orbit.lastY = e.clientY;
    orbit.targetTheta -= dx * 0.0085;
    orbit.targetPhi = Math.max(0.28, Math.min(1.48, orbit.targetPhi - dy * 0.0075));
    orbit.userTouchedUntil = performance.now() + 8000;
  });
  const endDrag = () => { orbit.dragging = false; };
  wrap.addEventListener('pointerup', endDrag);
  wrap.addEventListener('pointercancel', endDrag);
  wrap.addEventListener('dblclick', () => orbit.reset());
  wrap.addEventListener('wheel', (e) => {
    e.preventDefault();
    orbit.targetRadius = Math.max(2.2, Math.min(12.5, orbit.targetRadius + e.deltaY * 0.004));
    orbit.userTouchedUntil = performance.now() + 8000;
  }, { passive: false });

  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let w = 640, hh = actualHeight;

  function size() {
    const r = wrap.getBoundingClientRect();
    w = Math.max(300, r.width || wrap.clientWidth || 640);
    hh = actualHeight;
    hudCanvas.width = w * dpr;
    hudCanvas.height = hh * dpr;
    camera.aspect = w / hh;
    camera.updateProjectionMatrix();
    if (SHARED_RENDERER && SHARED_RENDERER.domElement.parentElement === glSlot) {
      SHARED_RENDERER.setSize(w, hh);
    }
  }
  size();
  window.addEventListener('resize', size);

  const projVec = new THREE.Vector3();
  const pendingLabels = [];

// ── 25 幕场景专属【工序 · 工具 · 材料】空间锚点与解析表 ──
const SCENE_CALLOUTS = {
  W1: {
    tools: { zh: '抄书竹笔 · 砚台 · 书案', en: 'Brush · Inkstone · Desk', pos: [-1.25, 0.45, 0] },
    materials: { zh: '宣纸卷轴 · 松烟墨', en: 'Xuan Scroll · Pine Ink', pos: [-0.1, 0.12, 0] },
    processPos: [1.45, 0.35, 0],
  },
  W2: {
    tools: { zh: '雕花拳刀 · 棕毛刷', en: 'Carving Chisel · Hair Brush', pos: [-0.65, 0.25, 0.4] },
    materials: { zh: '梨木板 (2–3cm) · 反贴写样纸', en: 'Pearwood Block · Mirrored Draft', pos: [0, -0.2, 0] },
    processPos: [0, 0.15, 0],
  },
  W3: {
    tools: { zh: '圆墨刷 · 棕擦包', en: 'Round Ink Brush · Coir Pad', pos: [-1.15, 0.25, 0.2] },
    materials: { zh: '凸字雕版 · 生宣纸 · 徽墨', en: 'Relief Wood · Raw Xuan · Pine Ink', pos: [-0.35, -0.15, 0] },
    processPos: [0.2, 0.15, 0],
  },
  M1: {
    tools: { zh: '刻字铁刀 · 烧结砖窑', en: 'Carving Knife · Terracotta Kiln', pos: [-0.75, 0.75, -0.35] },
    materials: { zh: '细腻胶泥块 · 陶化活字', en: 'Fine Silt Clay · Ceramic Types', pos: [-0.35, 0.25, 0.85] },
    processPos: [0.65, 0.35, 0.2],
  },
  M2: {
    tools: { zh: '铁范板框 · 砥平木板 · 炭火炉', en: 'Iron Chase · Leveler · Brazier', pos: [-1.35, 0.45, 0] },
    materials: { zh: '松脂蜡药剂 · 陶活字 (8枚)', en: 'Resin-Wax Bed · Clay Types (8)', pos: [0, 0.22, 0] },
    processPos: [1.35, 0.35, 0],
  },
  M3: {
    tools: { zh: '楠木大转轮 (七尺) · 拣字夹', en: 'Rotating Wheel (7-chi) · Tongs', pos: [0, 0.65, 2.1] },
    materials: { zh: '24韵部木活字格 · 排字盘', en: '24-Rhyme Cases · Galley Tray', pos: [0, -0.05, 2.75] },
    processPos: [0, 0.28, -1.2],
  },
  M4: {
    tools: { zh: '武英殿排字盘 · 金简算盘', en: 'Palace Galley · Cost Abacus', pos: [1.35, 0.6, 0.15] },
    materials: { zh: '25.3万枣木活字 · 高丽铜字', en: '253k Jujube Types · Bronze Types', pos: [-0.85, 0.45, 0] },
    processPos: [0.4, 0.5, -0.15],
  },
  G1: {
    tools: { zh: '淬火钢冲 · 铜凹模 · 双瓣手模', en: 'Steel Punch · Copper Matrix · Hand Mould', pos: [-0.75, 0.75, 0] },
    materials: { zh: '铅锑锡熔液 (280°C) · 铸字', en: 'Molten Alloy (280°C) · Types', pos: [0.45, 0.35, 0.1] },
    processPos: [0, 0.45, 0],
  },
  G2: {
    tools: { zh: '熔铅坩埚 · 倾注勺 · 倒角模', en: 'Crucible · Ladle · Apex Mould', pos: [-0.85, 0.65, 0] },
    materials: { zh: '铅80% · 锑15%(膨胀) · 锡5%', en: 'Pb 80% · Sb 15% (expands) · Sn 5%', pos: [0, 0.35, 0] },
    processPos: [0.65, 0.45, 0.2],
  },
  G3: {
    tools: { zh: '木螺压机 · 亚麻油墨球皮墩', en: 'Screw Press · Ink Balls · Platen', pos: [-0.65, 0.85, 0] },
    materials: { zh: '亚麻油黑墨 · 42行圣经纸', en: 'Linseed Ink · Bible Rag Paper', pos: [0.55, 0.45, 0] },
    processPos: [0, 0.65, 0],
  },
  G4: {
    tools: { zh: '铸造+油墨+压机 四流合一产线', en: '4-Stream Gutenberg Pressline', pos: [0, 0.95, 0] },
    materials: { zh: '1282页双色圣经 · 羊皮/麻纸', en: '1282p Two-color Bible · Vellum', pos: [0, 0.35, 0.2] },
    processPos: [0, 0.5, 0],
  },
  A1: {
    tools: { zh: '木螺平压 → 蒸汽圆筒 → 双轮转', en: 'Platen → Cylinder → Rotary Press', pos: [0, 0.85, 0] },
    materials: { zh: '单张纸 → 连续卷筒纸带', en: 'Sheetfed Paper → Web Paper', pos: [0, 0.25, 0] },
    processPos: [0, 0.55, 0],
  },
  A2: {
    tools: { zh: '90键键盘 · 组装器 · 铅锅', en: '90-Key Keyboard · Assembler · Pot', pos: [-0.65, 0.75, 0] },
    materials: { zh: '黄铜字模 · 双楔铁 · 铅铸行条', en: 'Brass Matrices · Spacebands · Slugs', pos: [0.25, 0.35, 0] },
    processPos: [0, 0.5, 0],
  },
  A3: {
    tools: { zh: '穿孔纸带机 · 31孔吹气导针', en: 'Perforated Tape · 31 Air Valves', pos: [-0.45, 0.65, 0] },
    materials: { zh: '穿孔纸带 · 铅合金独立单字', en: 'Punched Tape · Monotype Types', pos: [0.35, 0.35, 0] },
    processPos: [0, 0.4, 0],
  },
  O1: {
    tools: { zh: '亲水水辊 · 亲油墨辊 · 蜡笔', en: 'Dampener Roller · Inker · Crayon', pos: [-0.4, 0.55, 0] },
    materials: { zh: '石灰石板 · 阿拉伯胶 · 亲油蜡', en: 'Limestone Slab · Gum · Oleo Wax', pos: [0, 0.25, 0] },
    processPos: [0.4, 0.35, 0],
  },
  O2: {
    tools: { zh: '交叉玻璃网屏 · UV曝光灯', en: 'Cross-line Screen · UV Arc Lamp', pos: [-0.45, 0.55, 0] },
    materials: { zh: '感光胶层 · 铜版微雕网点柱', en: 'Photoresist · Halftone Dots', pos: [0, 0.22, 0] },
    processPos: [0.35, 0.35, 0],
  },
  O3: {
    tools: { zh: '印版滚筒 · 橡皮布滚筒 · 压印滚筒', en: 'Plate · Blanket · Impression Cylinders', pos: [0, 0.95, 0] },
    materials: { zh: '疏水橡皮布 · 连续纸带 · 润版水', en: 'Blanket Rubber · Paper Web · Water', pos: [0.66, 0.92, 0] },
    processPos: [-0.55, 1.25, 0.3],
  },
  O4: {
    tools: { zh: 'CMYK 四联塔式色组 · 墨路辊', en: '4 CMYK Offset Towers · Inkers', pos: [-0.45, 0.65, -0.6] },
    materials: { zh: 'C/M/Y/K 四色油墨 · 玫瑰斑纸', en: 'CMYK Inks · Rosette Coated Paper', pos: [-0.45, 0.15, 0.65] },
    processPos: [0, 0.4, 0],
  },
  D1: {
    tools: { zh: '激光管 · 多面旋转棱镜 · 定影热辊', en: 'Laser Diode · Polygon Mirror · Fuser', pos: [-0.75, 0.85, 0] },
    materials: { zh: 'OPC 光导鼓 · 静电碳粉 (-600V)', en: 'OPC Drum · Charged Toner (-600V)', pos: [0, 0.55, 0] },
    processPos: [0.55, 0.65, 0],
  },
  D2: {
    tools: { zh: '热发泡微热阻 / PZT 压电晶体', en: 'Thermal Vapor Resistor / PZT Crystal', pos: [-0.82, 0.85, 0] },
    materials: { zh: '皮升墨滴 (1–5 pL) · 打印介质', en: 'Picoliter Droplets (1-5pL) · Media', pos: [0.82, 0.85, 0] },
    processPos: [0, 0.35, 0],
  },
  D3: {
    tools: { zh: 'Lumitype 旋转字盘 · 频闪光源', en: 'Lumitype Rotating Disc · Strobe', pos: [-0.45, 0.65, 0] },
    materials: { zh: '万字字形底片 · 感光胶纸', en: '10,000 Glyph Film · Photo Paper', pos: [0.35, 0.45, 0] },
    processPos: [0, 0.3, 0],
  },
  D4: {
    tools: { zh: '激光光栅发生器 · 曲线解释器', en: 'Laser Raster Engine · RIP Curve Gen', pos: [-0.65, 0.65, 0] },
    materials: { zh: '矢量轮廓数学参数 · 照排胶片', en: 'Vector Bézier Parameters · Film', pos: [0.35, 0.35, 0] },
    processPos: [0, 0.45, 0],
  },
  F1: {
    tools: { zh: '高温 3D 打印喷头 · 升降热床', en: 'Extrusion Nozzle · Build Plate', pos: [0, 1.85, 0] },
    materials: { zh: '熔融线材层堆 (把薄层当活字)', en: 'Molten Layer Stacks (Layers as Types)', pos: [0, 0.9, 0] },
    processPos: [0, 0.25, 0],
  },
  F2: {
    tools: { zh: 'EUV 13.5nm 光源 · 布拉格反射镜', en: 'EUV 13.5nm Source · Bragg Mirrors', pos: [-0.45, 0.85, 0] },
    materials: { zh: '极紫外光刻胶 · 300mm 晶圆芯片', en: 'EUV Photoresist · 300mm Wafer', pos: [0.45, 0.35, 0] },
    processPos: [0, 0.55, 0],
  },
  F3: {
    tools: { zh: '石英纳米模板 · 压印机 · 生物喷头', en: 'Quartz NIL Stamp · Bioprint Nozzle', pos: [0, 0.65, 0] },
    materials: { zh: '纳米聚合物 · 人造器官生物墨水', en: 'Resist Polymer · Bio-inks', pos: [0, 0.25, 0] },
    processPos: [0, 0.45, 0],
  },
};

  // 自动绘制底部【⚙️ 实时工序 · 🔧 核心工具 · 🧱 关键材料】连续动画状态栏
  function drawAutoProcessHud(nowSec) {
    const meta = stageApi._meta;
    if (!meta) return;
    const isEn = i18n.currentLang === 'en';
    const sId = (meta.id || '').toUpperCase();
    const callout = SCENE_CALLOUTS[sId] || null;

    const stepLabels = (meta.t(`scene.${meta.id.toLowerCase()}.stepLabels`) || '')
      .split('|').map((s) => s.trim()).filter(Boolean);
    const curStep = Math.max(0, Math.min(stepLabels.length - 1, stageApi._activeStep || 0));
    const curStepName = stepLabels[curStep] || '';

    const toolSummary = callout
      ? (isEn ? callout.tools.en : callout.tools.zh)
      : (meta.structText || '').split(/[·；;]/)[0] || '';
    const matSummary = callout
      ? (isEn ? callout.materials.en : callout.materials.zh)
      : (meta.structText || '').split(/[·；;]/)[1] || '';

    // 1. 为场景中的 3D 核心部件投射空间引线标签 (3D Spatial Callout Pins)
    if (pendingLabels.length === 0 && callout) {
      // Tool Pin (Cyan)
      stageApi.label3D(
        [callout.tools.pos[0], callout.tools.pos[1] + Math.sin(nowSec * 2.2) * 0.03, callout.tools.pos[2]],
        `🔧 ${toolSummary.split('·')[0].trim()}`,
        { dx: -38, dy: -24, color: '#38bdf8' }
      );
      // Material Pin (Emerald)
      stageApi.label3D(
        [callout.materials.pos[0], callout.materials.pos[1] + Math.cos(nowSec * 2.0) * 0.03, callout.materials.pos[2]],
        `🧱 ${matSummary.split('·')[0].trim()}`,
        { dx: 36, dy: -24, color: '#34d399' }
      );
      // Process Pin (Amber)
      if (curStepName) {
        stageApi.label3D(
          [callout.processPos[0] + Math.sin(nowSec * 1.5) * 0.04, callout.processPos[1], callout.processPos[2]],
          `⚙️ ${curStepName}`,
          { dx: 18, dy: 24, color: '#fbbf24' }
        );
      }
    }

    // 冲洗并绘制全部 3D 空间引线标签
    while (pendingLabels.length > 0) {
      const lb = pendingLabels.shift();
      projVec.set(lb.pos[0], lb.pos[1], lb.pos[2]);
      projVec.project(camera);
      if (projVec.z > 1) continue;
      const sx = (projVec.x * 0.5 + 0.5) * w;
      const sy = (-projVec.y * 0.5 + 0.5) * hh;
      if (sx < 16 || sx > w - 160 || sy < 28 || sy > hh - 56) continue;

      const bx = Math.max(12, Math.min(w - 200, sx + lb.dx));
      const by = Math.max(32, Math.min(hh - 64, sy + lb.dy));

      g.save();
      // 3D 锚点呼吸光环
      g.fillStyle = lb.color;
      g.beginPath();
      g.arc(sx, sy, 3.2, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = lb.color;
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(sx, sy);
      g.lineTo(bx + 10, by);
      g.stroke();

      // 悬浮玻璃胶囊标签
      g.font = '600 11px system-ui, sans-serif';
      const tw = Math.min(210, g.measureText(lb.text).width + 16);
      g.fillStyle = 'rgba(12, 16, 24, 0.86)';
      roundRect(g, bx, by - 11, tw, 22, 6);
      g.fill();
      g.strokeStyle = lb.color;
      g.lineWidth = 1.2;
      roundRect(g, bx, by - 11, tw, 22, 6);
      g.stroke();

      g.fillStyle = '#f8fafc';
      g.textAlign = 'left';
      g.textBaseline = 'middle';
      g.fillText(lb.text, bx + 8, by, tw - 14);
      g.restore();
    }

    // 2. 底部全宽【⚙️ 工序 · 🔧 工具 · 🧱 材料】全景导览 HUD 坞站
    const barH = 34;
    const barY = hh - barH - 8;
    const barW = Math.max(300, Math.min(w - 20, 820));
    const barX = Math.max(10, (w - barW) / 2);

    g.save();
    g.fillStyle = 'rgba(10, 14, 20, 0.88)';
    roundRect(g, barX, barY, barW, barH, 9);
    g.fill();
    g.strokeStyle = 'rgba(245, 178, 76, 0.55)';
    g.lineWidth = 1.2;
    roundRect(g, barX, barY, barW, barH, 9);
    g.stroke();

    // 动态工序进度底光条
    const prog = stepLabels.length > 1
      ? ((curStep + 0.5 + 0.45 * Math.sin(nowSec * 2.5)) / stepLabels.length)
      : ((nowSec * 0.25) % 1);
    g.fillStyle = 'rgba(245, 158, 11, 0.25)';
    roundRect(g, barX + 1, barY + 1, Math.max(16, (barW - 2) * Math.min(1, prog)), barH - 2, 8);
    g.fill();

    // 内部三栏布局：[⚙️ 工序] | [🔧 工具] | [🧱 材料]
    g.font = '600 11px system-ui, sans-serif';
    g.textBaseline = 'middle';
    g.textAlign = 'left';

    const stepBadge = isEn
      ? `⚙️ Step ${curStep + 1}/${Math.max(1, stepLabels.length)}: ${curStepName}`
      : `⚙️ 工序 ${curStep + 1}/${Math.max(1, stepLabels.length)}：${curStepName}`;
    g.fillStyle = '#fde68a';
    g.fillText(stepBadge, barX + 12, barY + barH / 2);

    const stepW = g.measureText(stepBadge).width;
    const remainW = barW - stepW - 36;
    if (remainW > 120) {
      const halfW = remainW / 2;
      // 工具 Badge
      g.fillStyle = '#38bdf8';
      const toolText = (isEn ? ' ｜ 🔧 Tools: ' : ' ｜ 🔧 工具：') + toolSummary;
      g.fillText(toolText, barX + 16 + stepW, barY + barH / 2, halfW - 10);

      // 材料 Badge
      if (remainW > 240) {
        g.fillStyle = '#34d399';
        const matText = (isEn ? ' ｜ 🧱 Mat: ' : ' ｜ 🧱 材料：') + matSummary;
        g.fillText(matText, barX + 16 + stepW + halfW, barY + barH / 2, halfW - 10);
      }
    }
    g.restore();
  }

  const stageApi = {
    THREE,
    wrap,
    scene,
    camera,
    world,
    orbit,
    canvas: hudCanvas,
    hudCanvas,
    g,
    _activeStep: 0,
    _meta: null,
    get w() { return w; },
    get h() { return hh; },
    dpr,
    /**
     * 在 3D 空间坐标 [x,y,z] 上挂载实时跟随的 2D 引线标签（指示工具/材料/工序）
     */
    label3D(pos, text, { dx = 22, dy = -22, color = '#fbbf24' } = {}) {
      const arr = Array.isArray(pos) ? pos : [pos.x || 0, pos.y || 0, pos.z || 0];
      pendingLabels.push({ pos: arr, text, dx, dy, color });
    },
    begin() {
      if (wrap.clientWidth > 0 && Math.abs(wrap.clientWidth - w) > 4) size();
      g.save();
      g.scale(dpr, dpr);
      g.clearRect(0, 0, w, hh);
    },
    backdrop() {
      // 3D 模式下背景由 WebGLRenderer 渲染
    },
    end() {
      const nowSec = performance.now() / 1000;
      stageApi.render3D(0.016, nowSec);
      drawAutoProcessHud(nowSec);
      g.restore();
    },
    render3D(dt = 0.016, nowSec = performance.now() / 1000) {
      const { renderer, envTex } = getSharedWebGL();
      if (!scene.environment) scene.environment = envTex;
      if (renderer.domElement.parentElement !== glSlot) {
        glSlot.appendChild(renderer.domElement);
        size();
      }
      // 连续柔和环绕呼吸运镜 + 球面轨道平滑插值
      const sway = (performance.now() > orbit.userTouchedUntil) ? Math.sin(nowSec * 0.75) * 0.14 : 0;
      const pitchSway = (performance.now() > orbit.userTouchedUntil) ? Math.cos(nowSec * 0.55) * 0.04 : 0;
      orbit.theta += (orbit.targetTheta + sway - orbit.theta) * Math.min(1, dt * 6);
      orbit.phi += (orbit.targetPhi + pitchSway - orbit.phi) * Math.min(1, dt * 6);
      orbit.radius += (orbit.targetRadius - orbit.radius) * Math.min(1, dt * 6);
      orbit.target.lerp(orbit.goalTarget, Math.min(1, dt * 6));

      const sinPhi = Math.sin(orbit.phi);
      camera.position.set(
        orbit.target.x + orbit.radius * sinPhi * Math.sin(orbit.theta),
        orbit.target.y + orbit.radius * Math.cos(orbit.phi),
        orbit.target.z + orbit.radius * sinPhi * Math.cos(orbit.theta)
      );
      camera.lookAt(orbit.target);

      dustPoints.rotation.y = nowSec * 0.06;
      renderer.render(scene, camera);
    },
    resize() { size(); },
    onFrame(fn) {
      this._frameFn = fn;
      if (!this._internalLoop) {
        this._internalLoop = makeLoop((dt, nowSec) => {
          stageApi.begin();
          if (stageApi._frameFn) stageApi._frameFn(dt, nowSec);
          stageApi.end();
        });
      }
    },
    onShow() {
      size();
      if (this._internalLoop) this._internalLoop.start();
    },
    onHide() {
      if (this._internalLoop) this._internalLoop.stop();
    },
    dispose() {
      if (this._internalLoop) this._internalLoop.stop();
      window.removeEventListener('resize', size);
    },
  };

  parent._stageApi = stageApi;
  return stageApi;
}

/** 保留 2D stage 别名，直接委托给带 3D 能力的舞台 */
export function stage(parent, h = 300) {
  return stage3d(parent, { height: Math.max(305, h) });
}

// ═══════════════════════════════════════════════════════════════════════════
// v3.0 通用 3D 印刷机构生成器（兼容全部调用签名）
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 1. 创建 3D 凸版/雕版/石版组件
 * 兼容 createReliefPlate3D(opts) 与 createReliefPlate3D('BIBLE 42', opts) 两种调用签名
 */
export function createReliefPlate3D(arg1 = {}, arg2 = {}) {
  const opts = typeof arg1 === 'string'
    ? { ...arg2, chars: Array.from(arg1.replace(/\s+/g, '')).slice(0, 6) }
    : arg1;

  const {
    width = 2.8,
    depth = 1.9,
    thickness = 0.24,
    chars = ['印', '刷', '术'],
    mirror = true,
    baseColor = opts.type === 'stone' ? '#9ea7b4' : opts.type === 'metal' ? '#64748b' : '#8f5d32',
    reliefHeight = 0.09,
    type = 'wood', // 'wood' | 'stone' | 'metal'
  } = opts;

  const group = new THREE.Group();
  const baseTex = toTexture(
    THREE,
    type === 'stone' ? stoneCanvas(baseColor, 17) : type === 'metal' ? metalCanvas(baseColor, 13) : woodCanvas(baseColor, 7),
    2, 2
  );
  const baseMat = new THREE.MeshStandardMaterial({
    map: baseTex,
    roughness: type === 'metal' ? 0.32 : type === 'stone' ? 0.58 : 0.72,
    metalness: type === 'metal' ? 0.78 : 0.06,
  });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(width, thickness, depth), baseMat);
  slab.position.y = thickness / 2;
  group.add(slab);

  const glyphsGroup = new THREE.Group();
  glyphsGroup.position.y = thickness;
  group.add(glyphsGroup);

  const inkMats = [];
  const reliefMeshes = [];
  const cols = Math.max(1, chars.length);
  const cellW = (width * 0.82) / cols;

  chars.forEach((ch, i) => {
    const gx = -width * 0.41 + cellW * (i + 0.5);
    const gTex = new THREE.CanvasTexture(glyphCanvas(ch, {
      bg: type === 'metal' ? '#9ba6b2' : type === 'stone' ? '#b0b8c4' : '#b8824c',
      fg: '#fff6e5',
      mirror,
    }));
    const reliefMat = new THREE.MeshStandardMaterial({
      map: gTex,
      roughness: 0.45,
      metalness: type === 'metal' ? 0.68 : 0.1,
    });
    const rMesh = new THREE.Mesh(
      new THREE.BoxGeometry(cellW * 0.82, Math.max(0.008, reliefHeight), Math.min(depth * 0.66, cellW * 0.92)),
      reliefMat
    );
    rMesh.position.set(gx, Math.max(0.004, reliefHeight / 2), 0);
    glyphsGroup.add(rMesh);
    reliefMeshes.push(rMesh);

    const inkTex = new THREE.CanvasTexture(glyphCanvas(ch, {
      bg: '#121316',
      fg: '#050506',
      border: 'rgba(30,30,35,0.8)',
      mirror,
    }));
    const inkMat = new THREE.MeshStandardMaterial({
      map: inkTex,
      roughness: 0.25,
      metalness: 0.15,
      transparent: true,
      opacity: 0,
    });
    const inkCap = new THREE.Mesh(
      new THREE.PlaneGeometry(cellW * 0.8, Math.min(depth * 0.64, cellW * 0.9)),
      inkMat
    );
    inkCap.rotation.x = -Math.PI / 2;
    inkCap.position.set(gx, Math.max(0.008, reliefHeight) + 0.004, 0);
    glyphsGroup.add(inkCap);
    inkMats.push(inkMat);
  });

  group.setInk = (alpha) => {
    const a = Math.max(0, Math.min(1, alpha));
    inkMats.forEach((m) => { m.opacity = a; });
  };
  group.setCarveProgress = (k) => {
    const c = Math.max(0.05, Math.min(1, k));
    reliefMeshes.forEach((m, idx) => {
      const local = Math.max(0.05, Math.min(1, c * 1.3 - idx * 0.15));
      m.scale.y = local;
      m.position.y = (reliefHeight * local) / 2;
    });
  };
  return group;
}

/**
 * 2. 创建单枚 3D 活字字模（兼容 { w, h, d } 与 { size, height } 两种参数名）
 */
export function createMovableType3D(ch = '活', opts = {}) {
  const w = opts.w ?? opts.size ?? 0.38;
  const h = opts.h ?? opts.height ?? 0.54;
  const d = opts.d ?? opts.size ?? 0.38;
  const {
    mirror = true,
    materialType = 'clay', // 'clay' | 'wood' | 'bronze' | 'lead'
  } = opts;

  const group = new THREE.Group();
  const colors = {
    clay: { body: 0x9e5a3c, rough: 0.75, metal: 0.05, faceBg: '#b86b48', faceFg: '#fcebd5' },
    wood: { body: 0x8f5b34, rough: 0.70, metal: 0.06, faceBg: '#a87042', faceFg: '#fff3dc' },
    bronze: { body: 0xc28d38, rough: 0.30, metal: 0.84, faceBg: '#d4a048', faceFg: '#fff9e6' },
    lead: { body: 0x8a95a5, rough: 0.26, metal: 0.88, faceBg: '#9aa6b8', faceFg: '#ffffff' },
  };
  const cfg = colors[materialType] || colors.clay;

  const bodyMat = new THREE.MeshStandardMaterial({
    color: cfg.body,
    roughness: cfg.rough,
    metalness: cfg.metal,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bodyMat);
  body.position.y = h / 2;
  group.add(body);

  // 字身正面定位沟槽 (Nick)
  const nick = new THREE.Mesh(
    new THREE.BoxGeometry(w * 1.02, h * 0.1, d * 0.16),
    new THREE.MeshStandardMaterial({ color: 0x1e242b, roughness: 0.8 })
  );
  nick.position.set(0, h * 0.38, d * 0.46);
  group.add(nick);

  // 顶部凸起字面 (Raised Bevel Glyph Face)
  const faceTex = new THREE.CanvasTexture(glyphCanvas(ch, {
    bg: cfg.faceBg,
    fg: cfg.faceFg,
    mirror,
  }));
  const faceMat = new THREE.MeshStandardMaterial({
    map: faceTex,
    roughness: cfg.rough * 0.8,
    metalness: cfg.metal,
  });
  const headH = h * 0.15;
  const head = new THREE.Mesh(new THREE.BoxGeometry(w * 0.88, headH, d * 0.88), faceMat);
  head.position.y = h + headH / 2;
  group.add(head);

  group.bodyMat = bodyMat;
  group.faceMat = faceMat;
  return group;
}

/**
 * 3. 创建可三维形变的纸张网格
 * 兼容 createDeformablePaper3D(w, d, opts) 与 createDeformablePaper3D(w, d, segX, segZ, text) 两种签名
 */
export function createDeformablePaper3D(width = 2.5, depth = 1.65, arg3 = {}, arg4 = 18, arg5 = '印刷术') {
  const opts = typeof arg3 === 'number'
    ? { segX: arg3, segZ: arg4, text: String(arg5 || '印刷术'), showTextAlpha: 0.92 }
    : (arg3 || {});

  const {
    text = '印刷术',
    mirrorFront = false,
    showTextAlpha = 1,
    segX = 28,
    segZ = 18,
  } = opts;

  const geo = new THREE.PlaneGeometry(width, depth, segX, segZ);
  geo.rotateX(-Math.PI / 2);
  const basePos = geo.attributes.position.array.slice();

  const texCanvas = document.createElement('canvas');
  texCanvas.width = 512;
  texCanvas.height = 340;
  const tg = texCanvas.getContext('2d');
  const tex = new THREE.CanvasTexture(texCanvas);

  function redrawPaper({ alpha = showTextAlpha, bleed = 0, mirror = mirrorFront, customDraw = null } = {}) {
    tg.fillStyle = '#fdfaf0';
    tg.fillRect(0, 0, 512, 340);
    tg.strokeStyle = 'rgba(160, 120, 75, 0.38)';
    tg.lineWidth = 6;
    tg.strokeRect(18, 18, 476, 304);

    const lines = String(text).split('\n');
    const drawLines = (color, isMirrored) => {
      tg.save();
      tg.translate(256, 170);
      if (isMirrored) tg.scale(-1, 1);
      tg.fillStyle = color;
      const fontSize = lines.length > 1 ? 56 : (text.length > 6 ? 48 : 104);
      tg.font = `700 ${fontSize}px 'Noto Serif SC', 'Noto Sans SC', serif`;
      tg.textAlign = 'center';
      tg.textBaseline = 'middle';
      lines.forEach((ln, idx) => {
        const yOff = (idx - (lines.length - 1) / 2) * (fontSize * 1.25);
        tg.fillText(ln, 0, yOff);
      });
      tg.restore();
    };

    if (customDraw) {
      customDraw(tg, 512, 340);
    } else if (alpha > 0.01) {
      tg.save();
      tg.globalAlpha = Math.min(1, alpha);
      drawLines('#161618', mirror);
      tg.restore();
    }
    if (bleed > 0.01) {
      tg.save();
      tg.globalAlpha = Math.min(0.68, bleed);
      drawLines('#2d2a26', true);
      tg.restore();
    }
    tex.needsUpdate = true;
  }
  redrawPaper();

  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.82,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.redrawPaper = redrawPaper;

  mesh.setDeform = ({ peel = 0, flip = 0, wave = 0, curl = 0, press = 0, time = 0, wavePhase = 0 } = {}) => {
    const pos = geo.attributes.position;
    const arr = pos.array;
    const tVal = time || wavePhase;
    for (let i = 0; i < arr.length; i += 3) {
      const x0 = basePos[i];
      const y0 = basePos[i + 1];
      const z0 = basePos[i + 2];

      let x = x0, y = y0, z = z0;

      if (peel > 0.001) {
        const u = (x0 + width / 2) / width;
        const liftZone = Math.max(0, u - (1 - peel));
        const angle = liftZone * Math.PI * 0.85;
        y += Math.sin(angle) * (0.65 * peel) + liftZone * liftZone * 0.55;
        x -= (1 - Math.cos(angle)) * 0.28 * peel;
      }

      if (flip > 0.001 && flip < 0.999) {
        const arch = Math.sin(flip * Math.PI);
        const u = (x0 + width / 2) / width;
        y += Math.sin(u * Math.PI) * arch * 0.45;
      }

      if (Math.abs(curl) > 0.001) {
        const u = x0 / (width / 2);
        y += (u * u) * curl * 0.22;
      }

      if (press > 0.001) {
        y -= Math.cos((x0 / width) * Math.PI) * 0.03 * press;
      }

      if (wave > 0.001) {
        y += Math.sin(x0 * 2.4 + tVal * 4.5) * 0.08 * wave + Math.cos(z0 * 2.8 + tVal * 3.2) * 0.05 * wave;
      }

      arr[i] = x;
      arr[i + 1] = y;
      arr[i + 2] = z;
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  };

  return mesh;
}

/**
 * 4. 创建 3D 工业滚筒 + 轴颈 + 端面辐条组件（支持数字 hex 与 CSS 颜色字符串）
 */
export function createRoller3D(radius = 0.55, length = 2.4, opts = {}) {
  const {
    color = '#5b6770',
    stripeColor = '#2b3440',
    metalness = 0.72,
    roughness = 0.32,
  } = opts;

  const cssColor = typeof color === 'number' ? '#' + color.toString(16).padStart(6, '0') : color;

  const group = new THREE.Group();
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const cg = c.getContext('2d');
  cg.fillStyle = cssColor;
  cg.fillRect(0, 0, 256, 128);
  cg.fillStyle = stripeColor;
  for (let i = 0; i < 8; i++) cg.fillRect(i * 32 + 6, 0, 10, 128);
  const drumTex = new THREE.CanvasTexture(c);

  const drum = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, 40),
    new THREE.MeshStandardMaterial({ map: drumTex, roughness, metalness })
  );
  drum.rotation.z = Math.PI / 2;
  group.add(drum);

  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.24, radius * 0.24, length + 0.45, 20),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.25, metalness: 0.88 })
  );
  shaft.rotation.z = Math.PI / 2;
  group.add(shaft);

  return group;
}

/** 钳制主循环：fn(dtSeconds, nowSeconds) */
export function makeLoop(fn) {
  let raf = 0, last = 0, on = false;
  function frame(now) {
    if (!on) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    try { fn(dt, now / 1000); } catch (e) { console.error('[loop]', e); }
  }
  return {
    start() { if (on) return; on = true; last = performance.now(); raf = requestAnimationFrame(frame); },
    stop() { on = false; cancelAnimationFrame(raf); },
  };
}

/** 补间：dur(ms)、fn(eased01, raw01) —— 始终保持平滑完整动画时长，绝不跳帧截断 */
export function tween(dur, fn, ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)) {
  const actualDur = Math.max(120, dur);
  return new Promise((res) => {
    const t0 = performance.now();
    function step(now) {
      const k = Math.min(1, (now - t0) / actualDur);
      fn(ease(k), k);
      if (k < 1) requestAnimationFrame(step); else res();
    }
    requestAnimationFrame(step);
  });
}

/** 拟物绘制辅助：圆角矩形路径 */
export function roundRect(g, x, y, w, h, r = 6) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}

export function drawWoodBlock(g, x, y, w, h, opts = {}) {
  const { depth = 8, topColor = '#b07c4b', sideColor = '#7d532c', r = 5 } = opts;
  g.save();
  g.fillStyle = 'rgba(35,22,10,0.22)';
  roundRect(g, x + 2, y + depth + 4, w, h, r);
  g.fill();
  if (depth > 0) {
    g.fillStyle = sideColor;
    roundRect(g, x, y + depth, w, h, r);
    g.fill();
  }
  const grd = g.createLinearGradient(x, y, x, y + h);
  grd.addColorStop(0, topColor);
  grd.addColorStop(1, sideColor);
  g.fillStyle = grd;
  roundRect(g, x, y, w, h, r);
  g.fill();
  g.restore();
}

export function drawMetalBlock(g, x, y, w, h, opts = {}) {
  const { depth = 6, c0 = '#9aa5b1', c1 = '#5b6770', side = '#3e4750', r = 4 } = opts;
  g.save();
  g.fillStyle = 'rgba(20,25,32,0.24)';
  roundRect(g, x + 2, y + depth + 3, w, h, r);
  g.fill();
  if (depth > 0) {
    g.fillStyle = side;
    roundRect(g, x, y + depth, w, h, r);
    g.fill();
  }
  const grd = g.createLinearGradient(x, y, x + w, y + h);
  grd.addColorStop(0, c0);
  grd.addColorStop(0.48, '#b8c2cc');
  grd.addColorStop(1, c1);
  g.fillStyle = grd;
  roundRect(g, x, y, w, h, r);
  g.fill();
  g.restore();
}

export function drawPaperSheet(g, x, y, w, h, opts = {}) {
  const { color = '#fffdf7', shadow = 0.16, r = 3 } = opts;
  g.save();
  g.fillStyle = `rgba(40,30,15,${shadow})`;
  roundRect(g, x + 2, y + 4, w, h, r);
  g.fill();
  const grd = g.createLinearGradient(x, y, x + w * 0.3, y + h);
  grd.addColorStop(0, '#ffffff');
  grd.addColorStop(1, color);
  g.fillStyle = grd;
  roundRect(g, x, y, w, h, r);
  g.fill();
  g.restore();
}

/**
 * 右上角微距宏定义：保持 API 签名完全兼容，但不绘制遮挡 3D 主体机构的 2D 静态图框
 * 让 100% 视口空间呈现纯正 3D 连续动画与空间引线标注
 */
export function drawMacroInset(g, x, y, w, h, title, drawContent) {
  // 无遮挡：把完整 3D 舞台留给立体动画与空间引线
}

let CUR_KIT = null;
export function stepsBar(parent, labels, onPick) {
  const wrap = document.createElement('div');
  wrap.className = 'steps';
  const btns = labels.map((lb, i) => {
    const b = document.createElement('button');
    b.textContent = lb;
    b.addEventListener('click', () => { set(i); onPick(i); });
    wrap.appendChild(b);
    return b;
  });
  function set(i) {
    btns.forEach((b, j) => b.classList.toggle('on', j === i));
    if (CUR_KIT) CUR_KIT.step(i);
  }
  set(0);
  parent.appendChild(wrap);
  return { set };
}
