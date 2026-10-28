// common/js/printing/sceneKit.js — 场景工厂 kit（spec 10 v3.2：全宽 3D 舞台 + 慢速精讲控制栏 + 实时同步分步解说 + 微距原理剖面窗 + 下方双列详解）
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

// 全局播放控制状态（支持暂停、0.5x~2.0x 变速、微视窗开关、3D 标签开关）
const PLAY_STATE = {
  paused: false,
  speed: 1.0,      // 1.0 = 默认慢速精讲（比原版慢约 2.8 倍，留足观察与理解时间）
  showInset: true, // 右上角微距原理剖面窗
  showLabels: true,// 3D 空间引线标签
};
const TOOLBAR_SYNC_FNS = new Set();
function syncAllToolbars() {
  TOOLBAR_SYNC_FNS.forEach((fn) => { try { fn(); } catch (_) {} });
}

let ACTIVE_TWEEN_TOKEN = 0;

/** 基础项目样式（全宽 3D 播放器 + 实时解说字幕栏 + 离子推进器级控制栏 + 下方 2 列说明面板） */
const BASE_CSS = `
body{margin:0;min-height:100vh;display:flex;flex-direction:column;
  background:radial-gradient(circle at 12% 8%, rgba(181,101,29,0.06), transparent 42%),
             radial-gradient(circle at 88% 90%, rgba(79,70,229,0.05), transparent 42%),
             #faf6ee;color:#1a1a1a;
  font-family:'Outfit',-apple-system,'Noto Sans SC','PingFang SC',sans-serif}
main{flex:1;width:min(1340px,95vw);margin:0 auto;padding:18px 0 44px}
h1{font-size:clamp(19px,2.4vw,25px);margin:0 0 10px;font-weight:750;letter-spacing:-0.01em}
.subtitle{color:#6b6357;margin:4px 0 16px;font-size:14.5px}
.scene{display:none}
.scene.active{display:block;animation:sceneIn .42s cubic-bezier(0.22,1,0.36,1)}
.stickyhead{background:linear-gradient(180deg,rgba(255,253,248,.98) 0%,rgba(247,242,232,.96) 100%);
  padding:12px 14px 10px;margin:10px 0 16px;border-radius:16px;border:1px solid rgba(110,85,55,.18);
  box-shadow:0 8px 24px -8px rgba(45,35,20,.08), inset 0 1px 0 rgba(255,255,255,.9)}
.stickyhead.is-collapsed .tl-scroll-wrap{display:none}

/* ── 全宽播放器 + 下方 2 列解说布局 ── */
.scene-layout{display:flex;flex-direction:column;gap:20px;width:100%}
.scene-main{width:100%;min-width:0}
.explain-col{width:100%;min-width:0}
.explain-col .explain{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:0}
@media(max-width:780px){.explain-col .explain{grid-template-columns:1fr}}

@keyframes sceneIn{from{opacity:0;transform:translateY(10px) scale(0.994)}to{opacity:1;transform:none}}
.scene-title{font-size:22px;font-weight:750;margin-bottom:4px;letter-spacing:-0.01em}
.scene-hint{color:#6b6357;font-size:14px;margin-bottom:12px}

/* ── 3D 舞台容器（全宽大视野 + 底部实时解说舱 + 交互控制栏） ── */
.stage-wrap{background:radial-gradient(ellipse at 50% 36%, #28221d 0%, #12100e 100%);
  border:1px solid rgba(90,70,45,.28);border-radius:18px;overflow:hidden;position:relative;
  box-shadow:0 16px 36px -10px rgba(25,18,10,.32), inset 0 1px 0 rgba(255,255,255,.12);
  user-select:none;display:flex;flex-direction:column;width:100%}
.stage-viewport{position:relative;width:100%;overflow:hidden;touch-action:none}
.stage-gl-slot{position:absolute;inset:0;z-index:1}
.stage-gl-slot canvas{display:block;width:100%!important;height:100%!important}
.stage-hud-canvas{position:absolute;inset:0;z-index:2;pointer-events:none;width:100%;height:100%}

.cam-badge{position:absolute;left:12px;top:12px;z-index:3;border:1px solid rgba(255,245,225,.22);
  background:rgba(15,18,24,.78);backdrop-filter:blur(8px);color:#f5ebd6;font-size:11.5px;font-weight:600;
  padding:5px 11px;border-radius:999px;cursor:pointer;font-family:inherit;transition:all .16s ease}
.cam-badge:hover{background:rgba(181,101,29,.9);border-color:rgba(255,255,255,.5);color:#fff}

/* ── 实时分步解说与工序/工具/材料遥测舱 (.live-narrator) ── */
.live-narrator{background:linear-gradient(180deg,rgba(14,18,26,.96) 0%,rgba(10,13,19,.98) 100%);
  border-top:1px solid rgba(245,178,76,.28);padding:12px 16px;color:#f1f5f9;z-index:4}
.ln-top{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:7px}
.ln-step-badge{background:linear-gradient(135deg,#d97706,#b45309);color:#fff;font-size:12.5px;font-weight:700;
  padding:3px 11px;border-radius:999px;letter-spacing:.02em;box-shadow:0 2px 8px rgba(217,119,6,.35)}
.ln-prog-wrap{flex:1;min-width:140px;height:6px;background:rgba(255,255,255,.1);border-radius:999px;overflow:hidden}
.ln-prog-bar{height:100%;background:linear-gradient(90deg,#f59e0b,#34d399);border-radius:999px;transition:width .25s ease}
.ln-state-tag{font-size:12px;color:#fde68a;font-weight:600}
.ln-desc{font-size:14px;line-height:1.62;color:#f8fafc;margin-bottom:9px;padding:7px 11px;
  background:rgba(255,255,255,.045);border-left:3px solid #f59e0b;border-radius:0 8px 8px 0}
.ln-meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;font-size:12.5px}
.ln-chip{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:8px;padding:6px 10px;
  line-height:1.45;color:#cbd5e1}
.ln-chip b{display:inline-block;margin-right:4px;font-weight:700}
.ln-chip.c-tool b{color:#38bdf8}
.ln-chip.c-mat b{color:#34d399}
.ln-chip.c-watch b{color:#fbbf24}
@media(max-width:860px){.ln-meta{grid-template-columns:1fr}}

/* ── 离子推进器风格 3D 播放器控制栏 (.player-toolbar) ── */
.player-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;
  background:#141821;border-top:1px solid rgba(255,255,255,.09);padding:9px 14px;color:#e2e8f0;z-index:4;font-size:12.5px}
.pt-group{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.pt-label{color:#94a3b8;font-size:11.5px;font-weight:600;margin-right:2px}
.pt-btn{border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#f1f5f9;
  padding:5px 11px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;
  transition:all .15s ease;display:inline-flex;align-items:center;gap:4px}
.pt-btn:hover{background:rgba(255,255,255,.15);border-color:rgba(245,158,11,.55);color:#fff}
.pt-btn.active{background:linear-gradient(180deg,#d97706,#b45309);color:#fff;border-color:#f59e0b;
  box-shadow:0 2px 8px rgba(217,119,6,.35)}
.pt-btn.pause-on{background:linear-gradient(180deg,#e11d48,#be123c);border-color:#fb7185;color:#fff}

/* ── 场景内交互控件与读数面板 ── */
.steps{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;align-items:center}
.steps button, button.steps{border:1px solid rgba(70,55,35,.18);background:linear-gradient(180deg,#ffffff 0%,#f8f4ec 100%);
  border-radius:10px;padding:7px 14px;font-size:13.5px;font-weight:600;cursor:pointer;color:#221e1a;font-family:inherit;
  box-shadow:0 2px 5px rgba(0,0,0,.04), inset 0 1px 0 rgba(255,255,255,.9);
  transition:transform .16s cubic-bezier(.2,1,.3,1), box-shadow .16s ease, background .16s ease, border-color .16s ease}
.steps button:hover, button.steps:hover{transform:translateY(-1px);box-shadow:0 4px 10px rgba(0,0,0,.08);border-color:rgba(181,101,29,.45)}
.steps button:active, button.steps:active{transform:translateY(0.5px)}
.steps button.on, button.steps.on{background:linear-gradient(180deg,#2c2621 0%,#1a1613 100%);color:#fffdf7;
  border-color:#1a1613;box-shadow:0 3px 10px rgba(26,22,19,.22)}
.card{margin-top:12px;padding:13px 16px;border-radius:13px;background:rgba(255,255,255,.94);
  border:1px solid rgba(70,55,35,.12);border-left:4px solid #b5651d;font-size:14px;line-height:1.68;
  box-shadow:0 3px 10px rgba(45,35,20,.035)}
.card.prov{font-size:12.5px;color:#6b6357;border-left-color:#8d99ae}
.readout{display:flex;gap:16px;flex-wrap:wrap;margin-top:11px;padding:10px 14px;border-radius:11px;
  background:rgba(244,239,228,.75);border:1px solid rgba(70,55,35,.1);
  font-variant-numeric:tabular-nums;font-size:14px;align-items:center}
.readout b{font-size:16px;color:#1a1613}

/* ── 下方 2 列深度解说卡片 (.explain) ── */
.explain{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:14px}
.ex-row{padding:14px 16px;border-radius:14px;background:rgba(255,255,255,.95);border:1px solid rgba(70,55,35,.12);
  font-size:13.8px;line-height:1.72;box-shadow:0 4px 12px rgba(45,35,20,.035)}
.ex-h{font-weight:750;font-size:14px;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between}
.ex-what{border-left:4px solid #b5651d}.ex-what .ex-h{color:#b5651d}
.ex-steps{border-left:4px solid #0284c7}.ex-steps .ex-h{color:#0284c7}
.ex-why{border-left:4px solid #4f46e5}.ex-why .ex-h{color:#4f46e5}
.ex-struct{border-left:4px solid #d97706}.ex-struct .ex-h{color:#b45309}
.ex-watch{border-left:4px solid #e11d48}.ex-watch .ex-h{color:#be123c}
.ex-diy{border-left:4px solid #059669}.ex-diy .ex-h{color:#059669}
.ex-steps .ex-step{display:block;padding:4px 8px;margin:3px 0;border-radius:7px;opacity:.68;cursor:pointer;
  transition:all .22s ease;border-left:2px solid transparent}
.ex-steps .ex-step:hover{opacity:.95;background:rgba(2,132,199,.06)}
.ex-steps .ex-step.on{opacity:1;font-weight:700;color:#0f172a;background:rgba(245,158,11,.14);border-left-color:#d97706}

/* ── 顶部可点击步骤轨道 (.steprail) ── */
.steprail{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin:0 0 10px}
.steprail .sr-step{border:1px solid rgba(70,55,35,.18);background:#fff;color:#4a433b;padding:5px 13px;
  border-radius:9999px;font-size:12.5px;font-weight:550;cursor:pointer;font-family:inherit;
  transition:all .22s cubic-bezier(.2,1,.3,1)}
.steprail .sr-step:hover{border-color:#b5651d;background:#fdf8f0;transform:translateY(-1px)}
.steprail .sr-step.on{background:#1a1613;color:#fffdf7;border-color:#1a1613;font-weight:700;transform:translateY(-1px);
  box-shadow:0 3px 8px rgba(0,0,0,.16)}
.steprail .sr-replay{margin-left:auto;border:1px solid rgba(70,55,35,.18);background:#fff;color:#5a5248;
  padding:5px 13px;border-radius:9999px;font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .16s ease}
.steprail .sr-replay:hover{background:#f5efe2;color:#1a1613;border-color:rgba(181,101,29,.45)}

/* ── 顶部五代导航与全景分叉时间轴 (.era-ribbon + .tabs.tl-bifurcate) ── */
.era-ribbon{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin:0 0 10px;
  padding-bottom:9px;border-bottom:1px dashed rgba(110,85,55,.16)}
.era-stages{display:flex;align-items:center;gap:6px;flex-wrap:wrap;flex:1}
.era-ribbon .era-seg{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:999px;
  border:1px solid rgba(70,55,35,.15);background:rgba(255,255,255,.85);color:#3a322b;font-size:12.5px;font-weight:650;
  cursor:pointer;font-family:inherit;transition:all .2s cubic-bezier(.2,1,.3,1)}
.era-ribbon .era-seg:hover{transform:translateY(-1px);background:#fff;box-shadow:0 3px 8px rgba(0,0,0,.07)}
.era-ribbon .era-seg .era-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.era-ribbon .era-seg .era-yrs{font-size:11px;opacity:.72;font-weight:500;font-variant-numeric:tabular-nums}
.era-ribbon .era-seg.cur{color:#fffdf7;border-color:transparent;box-shadow:0 4px 12px rgba(0,0,0,.16);transform:translateY(-1px)}
.era-ribbon .era-seg.cur .era-dot{background:#fff!important;box-shadow:0 0 0 3px rgba(255,255,255,.28)}
.era-ribbon .era-seg.cur .era-yrs{opacity:.92}
.tl-quick-ctrl{display:flex;align-items:center;gap:6px;flex-shrink:0}
.tl-qbtn{border:1px solid rgba(70,55,35,.18);background:#fff;color:#2c251f;padding:4px 10px;border-radius:8px;
  font-size:12px;font-weight:650;cursor:pointer;font-family:inherit;transition:all .15s ease}
.tl-qbtn:hover:not(:disabled){background:#2c251f;color:#fffdf7;border-color:#2c251f}
.tl-qbtn:disabled{opacity:.35;cursor:not-allowed}
.tl-qpos{font-size:12px;font-weight:700;color:#6b6357;padding:0 4px;font-variant-numeric:tabular-nums}

.tl-scroll-wrap{position:relative;display:flex;align-items:center}
.tl-paddle{position:absolute;top:50%;transform:translateY(-50%);z-index:5;width:28px;height:64px;border-radius:10px;
  border:1px solid rgba(70,55,35,.22);background:rgba(255,253,248,.94);backdrop-filter:blur(6px);color:#2c251f;
  font-size:16px;font-weight:800;cursor:pointer;display:grid;place-items:center;box-shadow:0 4px 12px rgba(0,0,0,.1);
  transition:all .16s ease}
.tl-paddle:hover{background:#1a1613;color:#fff;border-color:#1a1613}
.tl-paddle.left{left:-6px}
.tl-paddle.right{right:-6px}

.tabs.tl-bifurcate{display:flex;align-items:stretch;gap:0;flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;
  padding:6px 26px 10px;margin:0;scroll-behavior:smooth;-webkit-overflow-scrolling:touch;scrollbar-width:thin;
  scrollbar-color:rgba(181,101,29,.35) rgba(0,0,0,.04);width:100%}
.tabs.tl-bifurcate::-webkit-scrollbar{height:6px}
.tabs.tl-bifurcate::-webkit-scrollbar-track{background:rgba(0,0,0,.04);border-radius:999px}
.tabs.tl-bifurcate::-webkit-scrollbar-thumb{background:rgba(181,101,29,.35);border-radius:999px}

.tl-stage-block{display:flex;flex-direction:column;justify-content:center;position:relative;
  background:rgba(255,255,255,.55);border:1px solid rgba(110,85,55,.14);border-radius:13px;padding:7px 10px 8px;
  flex-shrink:0;transition:border-color .2s ease, background .2s ease}
.tl-stage-block.is-active-era{background:rgba(255,255,255,.92);border-color:rgba(181,101,29,.42);
  box-shadow:0 4px 14px rgba(181,101,29,.08)}
.tl-stage-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;
  padding-bottom:4px;border-bottom:1px solid rgba(0,0,0,.06);font-size:11.5px;font-weight:750;letter-spacing:.01em}
.tl-stage-head .tl-sh-tag{padding:1px 7px;border-radius:999px;font-size:10.5px;font-weight:700;background:rgba(0,0,0,.05)}

.tl-lane{display:flex;align-items:center;gap:6px;position:relative;padding:3px 0}
.tl-lane + .tl-lane{margin-top:5px;padding-top:6px;border-top:1px dashed rgba(110,85,55,.16)}
.tl-lane-badge{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:3px 8px;
  border-radius:7px;white-space:nowrap;min-width:112px;border:1px solid transparent}
.tl-lane-badge.east{background:rgba(181,101,29,.12);color:#8a450d;border-color:rgba(181,101,29,.24)}
.tl-lane-badge.west{background:rgba(37,99,235,.10);color:#1e40af;border-color:rgba(37,99,235,.22)}
.tl-lane-badge.mech{background:rgba(71,85,105,.12);color:#334155;border-color:rgba(71,85,105,.24)}
.tl-lane-badge.color{background:rgba(219,39,119,.10);color:#9d174d;border-color:rgba(219,39,119,.22)}
.tl-lane-badge.main{background:rgba(5,150,105,.11);color:#065f46;border-color:rgba(5,150,105,.22)}

.tl-nodes{display:flex;align-items:center;gap:6px; position:relative}
.tl-arrow{color:rgba(110,85,55,.4);font-size:11px;font-weight:700;user-select:none;margin:0 -1px}

.tabs button.tl-node{display:inline-flex;flex-direction:column;align-items:flex-start;gap:2px;
  border:1px solid rgba(70,55,35,.16);background:#fff;color:#2c251f;padding:5px 10px;border-radius:10px;
  cursor:pointer;font-family:inherit;text-align:left;min-width:124px;position:relative;
  transition:all .18s cubic-bezier(.2,1,.3,1);box-shadow:0 1px 3px rgba(0,0,0,.03)}
.tabs button.tl-node:hover{transform:translateY(-1.5px);border-color:#b5651d;background:#fffdf9;
  box-shadow:0 4px 10px rgba(181,101,29,.12)}
.tabs button.tl-node .tl-yr{font-size:10.5px;font-weight:700;color:#7c6f60;font-variant-numeric:tabular-nums;
  display:flex;align-items:center;justify-content:space-between;width:100%;gap:6px}
.tabs button.tl-node .tl-yr i{font-style:normal;opacity:.68;font-weight:600}
.tabs button.tl-node .tl-ttl{font-size:12.5px;font-weight:700;color:#1a1613;white-space:nowrap;line-height:1.25}
.tabs button.tl-node.on{background:linear-gradient(135deg,#231e19 0%,#14110e 100%);color:#fffdf7;
  border-color:#d97706;box-shadow:0 5px 14px rgba(26,22,19,.26), 0 0 0 2px rgba(245,158,11,.32);transform:translateY(-1.5px)}
.tabs button.tl-node.on .tl-yr{color:#fcd34d}
.tabs button.tl-node.on .tl-ttl{color:#ffffff}

.tl-connector{width:34px;flex-shrink:0;display:flex;align-items:center;justify-content:center}
.tl-connector svg{width:34px;height:108px;overflow:visible;display:block}

.gen-chip{display:inline-flex;align-items:center;gap:4px;margin-left:8px;padding:3px 10px;border-radius:9999px;font-size:12px;
  background:rgba(181,101,29,.12);color:#8a4b14;vertical-align:2px;font-weight:650}
.yr-chip{display:inline-flex;align-items:center;margin-right:8px;padding:3px 10px;border-radius:8px;font-size:13px;
  background:#231e19;color:#fcd34d;vertical-align:2px;font-weight:700;font-variant-numeric:tabular-nums}
.branch-chip{display:inline-flex;align-items:center;margin-left:6px;padding:3px 10px;border-radius:9999px;font-size:12px;
  background:rgba(37,99,235,.10);color:#1e40af;vertical-align:2px;font-weight:650}

.slider-row{display:flex;align-items:center;gap:12px;margin:8px 0;font-size:13.5px}
.slider-row input[type=range]{flex:1;accent-color:#b5651d;cursor:pointer}
.slider-row .val{min-width:68px;text-align:right;font-variant-numeric:tabular-nums;font-weight:650}
.scene-nav{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:24px;padding:12px 16px;
  border-radius:14px;background:rgba(255,255,255,.88);border:1px solid rgba(110,85,55,.16)}
.scene-nav button{border:1px solid rgba(70,55,35,.18);background:#fff;color:#1a1613;padding:8px 16px;
  border-radius:10px;cursor:pointer;font-size:13.5px;font-weight:650;font-family:inherit;transition:all .16s ease}
.scene-nav button:hover:not(:disabled){background:#1a1613;color:#fffdf7;border-color:#1a1613}
.scene-nav button:disabled{opacity:.35;cursor:not-allowed}
.scene-nav .page-pos{color:#5a5248;font-size:13.5px;font-weight:650;font-variant-numeric:tabular-nums;text-align:center}
footer{padding:12px 20px;border-top:1px solid rgba(0,0,0,.08);color:#6b6357;font-size:13px}
footer a{color:inherit}
@media (prefers-reduced-motion:reduce){.scene.active{animation:none}}
`;

/** 五代历程：场景首字母 → 时代序号 */
const ERA_OF = { w: 0, m: 1, g: 1, a: 2, o: 2, d: 3, f: 4 };
const ERAS = [
  { zh: '① 雕版源流', en: '① Woodblock Origin', yrs: '105–932', color: '#8d6e63', at: 'W1' },
  { zh: '② 活字时代 · 东西分叉', en: '② Movable Type: East ∥ West', yrs: '1041–1773', color: '#b5651d', at: 'M1' },
  { zh: '③ 工业时代 · 蒸汽与胶印', en: '③ Industrial: Steam ∥ Offset', yrs: '1796–1904', color: '#4a6274', at: 'A1' },
  { zh: '④ 光电时代 · 东西数字并进', en: '④ Digital: Laser ∥ CJK Leap', yrs: '1938–1993', color: '#4f46e5', at: 'D1' },
  { zh: '⑤ 造物时代 · 3D与芯片光刻', en: '⑤ Making: 3D & EUV Litho', yrs: '1984–今', color: '#059669', at: 'F1' },
];

const GEN_OF = {
  w: ['第1代 · 手工与雕版源流', 'Gen 1 · Hand Copying & Woodblock'],
  m: ['第2代 · 活字时代', 'Gen 2 · Movable Type Era'],
  g: ['第2代 · 活字时代', 'Gen 2 · Movable Type Era'],
  a: ['第3代 · 工业时代', 'Gen 3 · Industrial Era'],
  o: ['第3代 · 工业与彩印', 'Gen 3 · Industrial & Color Offset'],
  d: ['第4代 · 光电与数字时代', 'Gen 4 · Photo-Electric & Digital'],
  f: ['第5代 · 当代造物时代', 'Gen 5 · Print-to-Make Frontier'],
};

/** 25 幕历史年代坐标与分叉支线元数据（消除晦涩的 W1/M1/G1 编号，直接呈现年代 + 地域 + 支线） */
const SCENE_TIMELINE_META = {
  W1: { yr: { zh: '公元2–7世纪', en: '2nd–7th C.' }, loc: { zh: '中国', en: 'China' }, branch: { zh: '🌏 东方起源主线', en: '🌏 Eastern Origin' } },
  W2: { yr: { zh: '约650年 · 唐', en: 'c. 650 · Tang' }, loc: { zh: '中国', en: 'China' }, branch: { zh: '🌏 东方起源主线', en: '🌏 Eastern Origin' } },
  W3: { yr: { zh: '868年 · 敦煌', en: '868 · Dunhuang' }, loc: { zh: '中国', en: 'China' }, branch: { zh: '🌏 东方起源主线', en: '🌏 Eastern Origin' } },

  M1: { yr: { zh: '1041年 · 北宋', en: '1041 · Song' }, loc: { zh: '中国', en: 'China' }, branch: { zh: '🌏 东方汉字活字支线', en: '🌏 East Movable-Type Branch' } },
  M2: { yr: { zh: '约1045年 · 北宋', en: 'c. 1045 · Song' }, loc: { zh: '中国', en: 'China' }, branch: { zh: '🌏 东方汉字活字支线', en: '🌏 East Movable-Type Branch' } },
  M3: { yr: { zh: '1298年 · 元代', en: '1298 · Yuan' }, loc: { zh: '中国', en: 'China' }, branch: { zh: '🌏 东方汉字活字支线', en: '🌏 East Movable-Type Branch' } },
  M4: { yr: { zh: '1377–1773年', en: '1377–1773' }, loc: { zh: '高丽/清', en: 'Korea/Qing' }, branch: { zh: '🌏 东方汉字活字支线', en: '🌏 East Movable-Type Branch' } },

  G1: { yr: { zh: '约1440年 · 美因茨', en: 'c. 1440 · Mainz' }, loc: { zh: '德国', en: 'Germany' }, branch: { zh: '🌍 西方谷登堡铅字支线', en: '🌍 West Gutenberg Branch' } },
  G2: { yr: { zh: '约1445年 · 美因茨', en: 'c. 1445 · Mainz' }, loc: { zh: '德国', en: 'Germany' }, branch: { zh: '🌍 西方谷登堡铅字支线', en: '🌍 West Gutenberg Branch' } },
  G3: { yr: { zh: '约1450年 · 美因茨', en: 'c. 1450 · Mainz' }, loc: { zh: '德国', en: 'Germany' }, branch: { zh: '🌍 西方谷登堡铅字支线', en: '🌍 West Gutenberg Branch' } },
  G4: { yr: { zh: '1455年 · 美因茨', en: '1455 · Mainz' }, loc: { zh: '德国', en: 'Germany' }, branch: { zh: '🌍 西方谷登堡铅字支线', en: '🌍 West Gutenberg Branch' } },

  A1: { yr: { zh: '1814–1846年', en: '1814–1846' }, loc: { zh: '英/美', en: 'UK/USA' }, branch: { zh: '⚙️ 蒸汽加压与热金属排字', en: '⚙️ Steam & Hot-Metal Branch' } },
  A2: { yr: { zh: '1886年 · 巴尔的摩', en: '1886 · USA' }, loc: { zh: '美国', en: 'USA' }, branch: { zh: '⚙️ 蒸汽加压与热金属排字', en: '⚙️ Steam & Hot-Metal Branch' } },
  A3: { yr: { zh: '1887–1978年', en: '1887–1978' }, loc: { zh: '英/美', en: 'UK/USA' }, branch: { zh: '⚙️ 蒸汽加压与热金属排字', en: '⚙️ Steam & Hot-Metal Branch' } },

  O1: { yr: { zh: '1796年 · 慕尼黑', en: '1796 · Munich' }, loc: { zh: '德国', en: 'Germany' }, branch: { zh: '🎨 平版石印与四色胶印', en: '🎨 Litho & Color Offset Branch' } },
  O2: { yr: { zh: '1880年 · 纽约', en: '1880 · New York' }, loc: { zh: '美国', en: 'USA' }, branch: { zh: '🎨 平版石印与四色胶印', en: '🎨 Litho & Color Offset Branch' } },
  O3: { yr: { zh: '1904年 · 新泽西', en: '1904 · USA' }, loc: { zh: '美国', en: 'USA' }, branch: { zh: '🎨 平版石印与四色胶印', en: '🎨 Litho & Color Offset Branch' } },
  O4: { yr: { zh: '20世纪 · 现代', en: '20th C. · Modern' }, loc: { zh: '全球', en: 'Global' }, branch: { zh: '🎨 平版石印与四色胶印', en: '🎨 Litho & Color Offset Branch' } },

  D1: { yr: { zh: '1938–1969年', en: '1938–1969' }, loc: { zh: '美国', en: 'USA' }, branch: { zh: '🌍 西方光电无版直印', en: '🌍 West Electrostatic & Inkjet' } },
  D2: { yr: { zh: '1976年 · 现代', en: '1976 · Modern' }, loc: { zh: '美/日', en: 'USA/JP' }, branch: { zh: '🌍 西方光电无版直印', en: '🌍 West Electrostatic & Inkjet' } },
  D3: { yr: { zh: '1949–1974年', en: '1949–1974' }, loc: { zh: '中国', en: 'China' }, branch: { zh: '🌏 东方汉字激光照排破局', en: '🌏 East Chinese Laser Leap' } },
  D4: { yr: { zh: '1979–1993年', en: '1979–1993' }, loc: { zh: '中国', en: 'China' }, branch: { zh: '🌏 东方汉字激光照排破局', en: '🌏 East Chinese Laser Leap' } },

  F1: { yr: { zh: '1984年 · 增材制造', en: '1984 · 3D Print' }, loc: { zh: '全球', en: 'Global' }, branch: { zh: '🌐 全球合流 · 从印到造', en: '🌐 Global Convergence: Making' } },
  F2: { yr: { zh: '2023年 · 芯片光刻', en: '2023 · EUV Litho' }, loc: { zh: '全球', en: 'Global' }, branch: { zh: '🌐 全球合流 · 从印到造', en: '🌐 Global Convergence: Making' } },
  F3: { yr: { zh: '当代与未来', en: 'Present & Future' }, loc: { zh: '全球', en: 'Global' }, branch: { zh: '🌐 全球合流 · 从印到造', en: '🌐 Global Convergence: Making' } },
};

/** 横向可分叉东西方并行时间轴拓扑结构（5 大阶段 · 3 段双轨并行分叉 + 首尾主干合流） */
const TIMELINE_TOPOLOGY = [
  {
    eraIdx: 0,
    color: '#8d6e63',
    head: { zh: '一 · 雕版源流（公元 2–9 世纪）', en: 'I · Woodblock Origin (2nd–9th C.)' },
    tag: { zh: '东方起源主线', en: 'Eastern Origin' },
    lanes: [
      { cls: 'east', label: { zh: '🌏 东方雕版源流', en: '🌏 East Woodblock' }, ids: ['W1', 'W2', 'W3'] },
    ],
    connectorAfter: 'fork',
  },
  {
    eraIdx: 1,
    color: '#b5651d',
    head: { zh: '二 · 活字分叉：东西方双轨并行（11–18 世纪）', en: 'II · Movable Type Fork: East ∥ West (11th–18th C.)' },
    tag: { zh: '东西方分叉并行', en: 'East ∥ West Fork' },
    lanes: [
      { cls: 'east', label: { zh: '🌏 东方汉字活字', en: '🌏 East CJK Type' }, ids: ['M1', 'M2', 'M3', 'M4'] },
      { cls: 'west', label: { zh: '🌍 西方谷登堡铅字', en: '🌍 West Gutenberg' }, ids: ['G1', 'G2', 'G3', 'G4'] },
    ],
    connectorAfter: 'parallel',
  },
  {
    eraIdx: 2,
    color: '#4a6274',
    head: { zh: '三 · 工业双翼：高速铸排 ∥ 平版彩印（18–20 世纪）', en: 'III · Industrial Wings: Steam Press ∥ Color Offset' },
    tag: { zh: '文字与彩印并行', en: 'Text ∥ Color Parallel' },
    lanes: [
      { cls: 'mech', label: { zh: '⚙️ 蒸汽与热排字', en: '⚙️ Steam & Hot Metal' }, ids: ['A1', 'A2', 'A3'] },
      { cls: 'color', label: { zh: '🎨 石版与四色胶印', en: '🎨 Litho & Offset' }, ids: ['O1', 'O2', 'O3', 'O4'] },
    ],
    connectorAfter: 'parallel',
  },
  {
    eraIdx: 3,
    color: '#4f46e5',
    head: { zh: '四 · 光电时代：东西方数字化破局（1938–1993）', en: 'IV · Digital Era: East Laser Leap ∥ West Direct Print' },
    tag: { zh: '东西数字合流', en: 'Digital Convergence' },
    lanes: [
      { cls: 'east', label: { zh: '🌏 东方汉字照排', en: '🌏 Chinese Laser Leap' }, ids: ['D3', 'D4'] },
      { cls: 'west', label: { zh: '🌍 西方光电直印', en: '🌍 Electrostatic/Inkjet' }, ids: ['D1', 'D2'] },
    ],
    connectorAfter: 'merge',
  },
  {
    eraIdx: 4,
    color: '#059669',
    head: { zh: '五 · 造物时代：从印文字到造万物（1984–未来）', en: 'V · Print-to-Make: 3D, EUV Chips & Bioprinting' },
    tag: { zh: '全球前沿合流', en: 'Global Frontier' },
    lanes: [
      { cls: 'main', label: { zh: '🌐 全球造物前沿', en: '🌐 Print-to-Make' }, ids: ['F1', 'F2', 'F3'] },
    ],
    connectorAfter: null,
  },
];

// ── 25 幕场景专属【工序 · 工具 · 材料 · 观察看点】空间锚点与深度解析表 ──
const SCENE_CALLOUTS = {
  W1: {
    tools: { zh: '抄书狼毫竹笔 · 端砚 · 印章/拓包', en: 'Calligraphy Brush · Inkstone · Seal/Dabber', pos: [-1.25, 0.45, 0] },
    materials: { zh: '宣纸长卷 · 松烟墨 · 朱砂印泥', en: 'Xuan Scroll · Pine-soot Ink · Cinnabar Paste', pos: [-0.1, 0.12, 0] },
    watch: { zh: '左侧毛笔逐字慢抄耗时 1,200 天；右侧对比印章（阳文反字盖红印）与拓碑（阴文正字拍黑墨）两大源头。', en: 'Left: brush copying takes ~1,200 days; Right: compare relief seal (mirrored red stamp) vs intaglio stele rubbing (upright white chars).' },
    processPos: [1.45, 0.35, 0],
  },
  W2: {
    tools: { zh: '雕花拳刀 (斜刃) · 棕毛刷 · 校对放大镜', en: 'Slant Carving Chisel · Coir Brush · Proofing Loupe', pos: [-0.65, 0.25, 0.4] },
    materials: { zh: '梨木/枣木板 (厚 2–3cm) · 薄宣写样纸', en: 'Pear/Jujube Woodblock (2–3cm) · Thin Xuan Draft', pos: [0, -0.2, 0] },
    watch: { zh: '重点观察第 3 步“反贴上板”（纸稿在 3D 空间翻转 180° 使正字变反字）和第 4 步拳刀铲除空白、留下凸起阳文反字。', en: 'Watch Step 3 (180° 3D paper flip making characters mirrored) and Step 4 (chisel carving away blanks to leave raised mirrored strokes).' },
    processPos: [0, 0.15, 0],
  },
  W3: {
    tools: { zh: '圆头松烟墨刷 · 长柄棕擦包', en: 'Round Pine-ink Brush · Coir Rubbing Pad', pos: [-1.15, 0.25, 0.2] },
    materials: { zh: '阳文反字雕版 · 生宣纸 · 徽墨', en: 'Mirrored Relief Woodblock · Raw Xuan Paper · Pine Ink', pos: [-0.35, -0.15, 0] },
    watch: { zh: '观察圆墨刷先给凸起反字均匀上墨，覆纸后用棕刷在纸背加压摩擦，最后弧形揭纸：版上反字再翻一次还原为纸上正字！', en: 'Watch the round brush ink raised mirrored strokes, lay paper, rub the back with the coir pad, and peel: mirror × mirror = upright print!' },
    processPos: [0.2, 0.15, 0],
  },
  M1: {
    tools: { zh: '刻字细铁刀 · 拱顶烧结砖窑', en: 'Engraving Knife · Arched Terracotta Kiln', pos: [-0.75, 0.75, -0.35] },
    materials: { zh: '细澄胶泥坯 (薄如钱唇) · 陶化活字 · 韵部木格', en: 'Fine Silt Clay (Coin-lip Thin) · Fired Ceramic Types', pos: [-0.35, 0.25, 0.85] },
    watch: { zh: '观察胶泥字坯先用铁刀刻反字，推入砖窑经烈火烧结由土黄变赤陶（坚硬不吸水），出窑后按韵部收入木格，常用字“之、也”备 20 枚以上。', en: 'Watch wet clay carved with mirrored characters, pushed into the kiln to fire into hard terracotta, then sorted into wooden rhyme cases (20+ duplicates for common words).' },
    processPos: [0.65, 0.35, 0.2],
  },
  M2: {
    tools: { zh: '铸铁范框 · 炭火烘炉 · 砥平木板', en: 'Cast-Iron Chase · Charcoal Brazier · Planer Board', pos: [-1.35, 0.45, 0] },
    materials: { zh: '松脂+蜡+纸灰药剂层 · 陶活字 · 双铁板', en: 'Pine-Resin/Wax/Ash Bed · Clay Types · Dual Iron Plates', pos: [0, 0.22, 0] },
    watch: { zh: '重点看“药剂固版”与“两版交替”：微火熔化松脂蜡后用平木板下压，把高低不平的陶字顶面压得平如磨刀石；一版刷印时另一版同步排字！', en: 'Watch "Resin-wax leveling" (warming wax and pressing a flat wooden board to level all type faces) and "Two-form alternation" (one plate prints while the other composes).' },
    processPos: [1.35, 0.35, 0],
  },
  M3: {
    tools: { zh: '王祯七尺楠木大转轮 · 中心铁轴 · 拣字竹夹', en: 'Wang Zhen 7-Chi Rotating Wheel · Iron Axle · Bamboo Tongs', pos: [0, 0.65, 2.1] },
    materials: { zh: '24韵部扇形字格 · 编号木活字 · 排字盘', en: '24-Rhyme Sector Trays · Numbered Wood Types · Galley', pos: [0, -0.05, 2.75] },
    watch: { zh: '观察“以字就人”：排字工坐定不动，一人呼韵报号，轻推七尺大转轮将对应扇区转至胸前，竹夹取字入盘，检字耗时从 ~15 秒缩至 ~1.5 秒。', en: 'Watch "Words come to the person": the compositor sits still while the 24-sector wheel spins the target rhyme slot right to the front, cutting retrieval time 10×.' },
    processPos: [0, 0.28, -1.2],
  },
  M4: {
    tools: { zh: '武英殿枣木活字柜 · 高丽铜范 · 金简成本算盘', en: 'Wuying Palace Wood Cases · Bronze Mould · Cost Abacus', pos: [1.35, 0.6, 0.15] },
    materials: { zh: '25.3万枚枣木活字 · 铜活字 · 梨木整版', en: '253,000 Jujube Wood Types · Bronze Types · Woodblocks', pos: [-0.85, 0.45, 0] },
    watch: { zh: '拖动“印书种类 N”滑块并观察右上角成本交叉图：印 1 部书时雕版更便宜，但重排印到 3–4 部书以上时，活字复用展现出压倒性成本优势！', en: 'Drag the "Editions N" slider and watch the cost crossover chart: woodblock is cheaper for 1 book, but movable type wins decisively past 3–4 editions.' },
    processPos: [0.4, 0.5, -0.15],
  },
  G1: {
    tools: { zh: '高碳钢父冲 (Punch) · 紫铜母模 (Matrix) · 双瓣手模', en: 'Hardened Steel Punch · Copper Matrix · Split Hand Mould', pos: [-0.75, 0.75, 0] },
    materials: { zh: '280°C 铅锑锡熔液 · 批量同高铅字群', en: '280°C Molten Pb-Sb-Sn Alloy · Identical Lead Types', pos: [0.45, 0.35, 0.1] },
    watch: { zh: '从左至右观察三级指数放大链：① 坚硬钢冲砸入软紫铜条打出凹字母模 → ② 铜模嵌在双瓣手模底部灌入铅水 → ③ 弹簧开模秒出上百枚同高铅字！', en: 'Follow the 3-stage chain left to right: ① Steel punch strikes copper bar → ② Copper matrix sits in split hand mould for molten lead pour → ③ Hundreds of identical types emerge.' },
    processPos: [0, 0.45, 0],
  },
  G2: {
    tools: { zh: '控温熔铅坩埚 · 倾注铁勺 · V型字锋铜模', en: 'Melting Crucible · Pouring Ladle · V-Groove Matrix', pos: [-0.85, 0.65, 0] },
    materials: { zh: '铅 Pb 80% + 锑 Sb 15% (反常膨胀) + 锡 Sn 5%', en: 'Pb 80% (soft/low MP) + Sb 15% (expands!) + Sn 5% (tough)', pos: [0, 0.35, 0] },
    watch: { zh: '重点看右上角字锋尖角微视窗与中央 V 型槽：大多数金属冷却收缩会导致笔画尖角残缺，唯有加入 15% 锑 (Sb) 凝固时晶格反常微胀 (+0.6%)，把铜模尖角顶得锋利无比！', en: 'Watch the V-groove apex: normal metals shrink on cooling (blunt edges), whereas 15% Antimony (Sb) expands on solidification (+0.6%), forcing metal into razor-sharp serifs!' },
    processPos: [0.65, 0.45, 0.2],
  },
  G3: {
    tools: { zh: '葡萄榨汁木螺杆压机 · 狗皮亚麻油墨球 · 压板', en: 'Wooden Screw Press · Leather Ink Balls · Platen', pos: [-0.65, 0.85, 0] },
    materials: { zh: '亚麻籽油熬制黑墨+朱墨 · 42行圣经麻纸', en: 'Boiled Linseed Oil Ink (Black/Red) · Rag Paper', pos: [0.55, 0.45, 0] },
    watch: { zh: '观察右上角水墨 vs 油墨接触角对比：水墨在金属铅字上聚成水珠挂不住，古腾堡改用亚麻籽油墨才完美润湿铅字；再扳动木螺杆施加强大垂直面压力印出双色《42行圣经》。', en: 'Watch the wetting inset: water ink beads up on metal, whereas linseed oil ink wets lead evenly; pulling the screw lever drives the platen down with ~10× hand pressure.' },
    processPos: [0, 0.65, 0],
  },
  G4: {
    tools: { zh: '铸造+合金+油墨+压机 四大子系统耦合产线', en: '4-Subsystem Coupled Gutenberg Production Line', pos: [0, 0.95, 0] },
    materials: { zh: '290种字形铅字 · 亚麻油墨 · 约180部《42行圣经》', en: '290 Glyph Sorts · Oil Ink · ~180 Gutenberg Bibles', pos: [0, 0.35, 0.2] },
    watch: { zh: '点击底部的 4 个子系统开关试着关掉任意一项：缺手模则字高不一、缺锑则字迹模糊、缺油墨则金属拒水、缺压机则印迹虚浮——证明古腾堡是系统工程的胜利。', en: 'Toggle any of the 4 subsystems off: without hand mould, antimony, oil ink, or screw press, the whole pipeline fails — proving Gutenberg succeeded through system integration.' },
    processPos: [0, 0.5, 0],
  },
  A1: {
    tools: { zh: '木螺平压机 → 科尼希蒸汽滚筒机 → 霍伊轮转机', en: 'Flat Platen → Koenig Cylinder (1814) → Hoe Rotary (1847)', pos: [0, 0.85, 0] },
    materials: { zh: '单张铜版纸 → 连续高速卷筒纸带 (Web)', en: 'Sheetfed Paper → Continuous Web Paper Roll', pos: [0, 0.25, 0] },
    watch: { zh: '切换三种加压构型并对照右上角接触力学图：平压平是“整面受压”（250页/时），平压圆改为“滚动线接触”（1,100页/时），圆压圆消除往复空程实现连续切线高速轮转（8,000页/时）！', en: 'Switch between the 3 press geometries: Flat Platen (area contact, 250 sph) → Cylinder (rolling line nip, 1,100 sph) → Rotary Web (no reciprocating return, 8,000 sph).' },
    processPos: [0, 0.55, 0],
  },
  A2: {
    tools: { zh: '90键打字键盘 · 滑道组装器 · 双楔空格 · 280°C铅锅', en: '90-Key Keyboard · Assembler · Spacebands · 280°C Lead Pot', pos: [-0.65, 0.75, 0] },
    materials: { zh: '黄铜凹字铜模 · 整行铅合金铸条 (Slug)', en: 'Brass Matrices (V-teeth) · Solid Line-of-Type Slug', pos: [0.25, 0.35, 0] },
    watch: { zh: '慢速观察 Linotype 四大绝技：① 敲键释放黄铜字模滑落成行 → ② 双楔空格向上顶起自动撑满行宽 → ③ 泵入铅水一次铸出整行铅条 (Slug) → ④ 顶部 V 型齿码自动把铜模分拣归位！', en: 'Watch the 4 Linotype miracles: ① Keystroke drops brass matrices → ② Sliding spacebands justify the line → ③ Molten lead casts a whole line slug → ④ V-teeth distribute matrices home.' },
    processPos: [0, 0.5, 0],
  },
  A3: {
    tools: { zh: '31孔穿孔纸带机 · 压缩空气导针 · X-Y定位铜模盒', en: '31-Hole Paper Tape Tower · Pneumatic Pins · X-Y Matrix Case', pos: [-0.45, 0.65, 0] },
    materials: { zh: '二进制穿孔纸带 · 15×17矩阵铜模 · 独立单字铅字', en: 'Perforated Paper Tape · 15×17 Matrix Grid · Single Types', pos: [0.35, 0.35, 0] },
    watch: { zh: '观察键盘打字与铸字机首次解耦：左侧打孔纸带利用压缩空气吹起 X/Y 坐标定位销，驱动右侧铜模盒在毫厘间精准平移，铸出可单字抽换修改的独立铅字（科学公式排版神器）。', en: 'Watch keyboard and caster decoupled by punched paper tape: compressed air pops X-Y stop pins to position the matrix case and cast individually replaceable characters.' },
    processPos: [0, 0.4, 0],
  },
  O1: {
    tools: { zh: '油脂画蜡笔 · 蓝色亲水润版辊 · 黑色亲油墨辊', en: 'Greasy Wax Crayon · Blue Water Roller · Black Ink Roller', pos: [-0.4, 0.55, 0] },
    materials: { zh: '巴伐利亚微孔石灰石板 (Δh≈0) · 阿拉伯树胶液', en: 'Bavarian Limestone Slab (Δh≈0) · Gum Arabic Solution', pos: [0, 0.25, 0] },
    watch: { zh: '仔细看石板表面：图文与空白完全在同一平面（不凸也不凹）！先滚水时水膜占据空白区，再滚墨时油墨被水膜排斥、只吸附在油脂字迹上——靠界面化学互斥完成平版印刷。', en: 'Look closely at the flat stone (zero height relief!): the blue water roller wets blank pores, then the black ink roller is repelled by water and inks only the greasy image.' },
    processPos: [0.4, 0.35, 0],
  },
  O2: {
    tools: { zh: '正交玻璃网屏 · 紫外曝光弧光灯 · 酸蚀显影槽', en: 'Cross-line Halftone Screen · UV Lamp · Etching Bath', pos: [-0.45, 0.55, 0] },
    materials: { zh: '连续调黑白原稿 · 大小疏密不等的调幅网点 (AM Dots)', en: 'Continuous-Tone Photo · Variable-Size Halftone Dots', pos: [0, 0.22, 0] },
    watch: { zh: '印刷油墨只有“有墨/无墨”两种状态，怎么印出照片的深浅灰阶？看玻璃网屏把连续灰度切分为网点阵列：暗部网点粗大 (85%)、高光网点细小 (15%)，人眼远看自动融合成连续明暗！', en: 'Since ink is binary (on/off), how do we print gray tones? Watch the glass screen diffract light into big dots in shadows (85%) and tiny dots in highlights (15%).' },
    processPos: [0.35, 0.35, 0],
  },
  O3: {
    tools: { zh: '印版滚筒 (Plate) · 橡皮布滚筒 (Blanket) · 压印滚筒', en: 'Plate Cylinder · Rubber Blanket Cylinder · Impression Cylinder', pos: [0, 0.95, 0] },
    materials: { zh: '亲油疏水弹性橡皮布 · 高速连续纸带 · 润版水雾', en: 'Hydrophobic Elastic Blanket · Paper Web · Water Mist', pos: [0.66, 0.92, 0] },
    watch: { zh: '观察三滚筒啮合与蓝色水雾粒子：印版(正字)先把油墨转印到中间的弹性橡皮布(变反字)，同时橡皮布将多余水分甩飞（纸张不湿不皱），再柔韧地把油墨压印到粗糙纸面上还原正字！', en: 'Watch the 3 cylinders and blue water mist: Plate (upright) → Rubber Blanket (mirrored, sheds water droplets so paper stays dry) → Paper on Impression Cylinder (upright).' },
    processPos: [-0.55, 1.25, 0.3],
  },
  O4: {
    tools: { zh: 'C / M / Y / K 四联串联胶印色组 · 网角放大镜', en: '4 Inline CMYK Offset Towers · Rosette Loupe', pos: [-0.45, 0.65, -0.6] },
    materials: { zh: '青(15°)·品红(75°)·黄(90°)·黑(45°) 四色油墨', en: 'Cyan(15°) · Magenta(75°) · Yellow(90°) · Key Black(45°)', pos: [-0.45, 0.15, 0.65] },
    watch: { zh: '观察纸带依次穿过 C→M→Y→K 四座色塔逐次叠色，并看右上角放大镜：四色网屏错开 30° 排布成精致“玫瑰斑”以避免龟纹；点击“对比 K 黑版”看为什么必须加第 4 色纯黑。', en: 'Watch paper pass through C→M→Y→K towers sequentially; check the top-right loupe for 30°-offset rosette dots, and click "Compare K Black" to see why CMY alone looks muddy.' },
    processPos: [0, 0.4, 0],
  },
  D1: {
    tools: { zh: '电晕充电丝 · 八面旋转棱镜激光 · 190°C热压定影辊', en: 'Corona Charger · Polygon Laser Mirror · 190°C Fuser Rollers', pos: [-0.75, 0.85, 0] },
    materials: { zh: 'OPC 有机光导鼓 · 带电碳粉微粒 · 普通复印纸', en: 'OPC Photoconductor Drum · Charged Toner · Plain Paper', pos: [0, 0.55, 0] },
    watch: { zh: '跟随感光鼓旋转看齐静电六步：① 均匀充负电 → ② 激光扫描处导电泄荷形成“静电潜像” → ③ 碳粉跳上曝光区显影 → ④ 转印到纸面 → ⑤ 190°C 热辊熔融定影 → ⑥ 刮刀清洁残粉（每页都可换新图！）。', en: 'Follow the 6 xerographic steps around the drum: ① Charge → ② Laser exposure (latent image) → ③ Toner development → ④ Transfer → ⑤ 190°C thermal fusing → ⑥ Clean.' },
    processPos: [0.55, 0.65, 0],
  },
  D2: {
    tools: { zh: '左：300°C热发泡微电阻 ｜ 右：PZT压电陶瓷振膜', en: 'Left: 300°C Thermal Bubble Resistor ｜ Right: Piezo PZT Actuator', pos: [-0.82, 0.85, 0] },
    materials: { zh: '1–5 pL (皮升，万亿分之一升) 超微墨滴 · 相纸', en: '1–5 pL (Picoliter) Micro-Droplets · Photo Paper', pos: [0.82, 0.85, 0] },
    watch: { zh: '对比左右两座透明喷腔剖面：左侧热发泡瞬间加热至 ~300°C 产生蒸汽泡把墨滴顶出；右侧压电陶瓷通电弯曲机械挤出墨滴（不加热，可喷敏感化学/生物墨水）。', en: 'Compare the two transparent nozzle chambers: Thermal bubble (300°C vapor explosion ejects drop) vs Piezoelectric PZT (mechanical crystal flex without heat).' },
    processPos: [0, 0.35, 0],
  },
  D3: {
    tools: { zh: '左：26格西文字盒 ｜ 右：万字汉字铜模架 & 光学字盘', en: 'Left: 26-Slot Latin Case ｜ Right: 10,000-Char Chinese Rack & Disc', pos: [-0.45, 0.65, 0] },
    materials: { zh: '26枚拉丁铅字 vs 7,000+常用汉字 × 多字号百万字模', en: '26 Latin Sorts vs 7,000+ Chinese Chars × Multi-size Fonts', pos: [0.35, 0.45, 0] },
    watch: { zh: '观察镜头从前景小巧的 26 格英文字盒拉远，显露出背后如高墙般的汉字铅字矩阵与 1949 光学旋转字盘：汉字数量是字母的数百倍，字盘转不动、存不下，迫切需要数学压缩革命！', en: 'Watch the camera pull back from the tiny 26-letter Latin case to the towering wall of Chinese lead types and the 1949 optical disc bottleneck.' },
    processPos: [0, 0.3, 0],
  },
  D4: {
    tools: { zh: '王选轮廓+规则笔画压缩算法 · 激光光栅照排机 (RIP)', en: 'Wang Xuan Contour+Stem Compression · Laser Raster Setter', pos: [-0.65, 0.65, 0] },
    materials: { zh: '贝塞尔曲线控制点 + 横竖笔画主干参数 (500:1压缩)', en: 'Bézier Outline Points + Stroke Stem Rules (500:1 Compression)', pos: [0.35, 0.35, 0] },
    watch: { zh: '观察“永”字的三阶段蜕变：① 原始点阵占海量内存 → ② 绿色贝塞尔外轮廓 + 金色笔画主干参数将字库体积压缩 500–1000 倍 → ③ 红色激光扫描实时还原高精度字形，彻底告别铅与火！', en: 'Watch the 3-stage leap on "永": ① Huge raw bitmap → ② Green Bézier outlines + gold stroke stems (500–1000× compression) → ③ Red laser raster scan reconstructs crisp type.' },
    processPos: [0, 0.45, 0],
  },
  F1: {
    tools: { zh: '高温熔融喷头 / 选区激光头 · 精密 Z 轴升降热床', en: 'Heated Extrusion Nozzle / Laser Head · Z-Axis Build Plate', pos: [0, 1.85, 0] },
    materials: { zh: '数千层 0.1–0.2mm 二维截面切片层堆 (把薄层当活字)', en: 'Thousands of 0.1–0.2mm 2D Sliced Layers ("Layers as Types")', pos: [0, 0.9, 0] },
    watch: { zh: '观察发光喷头沿圆周高速走刀，将三维花瓶拆解为一层层二维平面“印刷”出来并向上累积生长；拖动右侧高度 H 与层厚 Δz 滑块，实时验证层数 N = H / Δz！', en: 'Watch the glowing nozzle trace 2D cross-sections layer by layer to grow a 3D vase; drag Height H and Layer Δz sliders to verify Layers N = H / Δz.' },
    processPos: [0, 0.25, 0],
  },
  F2: {
    tools: { zh: '左：DUV 193nm 折射透镜组 ｜ 右：EUV 13.5nm 布拉格反射镜', en: 'Left: DUV 193nm Refractive Lenses ｜ Right: EUV 13.5nm Bragg Mirrors', pos: [-0.45, 0.85, 0] },
    materials: { zh: '40层钼/硅纳米反射多层膜 · 光刻胶 · 300mm 硅晶圆', en: '40-Pair Mo/Si Bragg Mirror · Photoresist · 300mm Silicon Wafer', pos: [0.45, 0.35, 0] },
    watch: { zh: '对比左右两条光路：193nm 深紫外光还能穿过玻璃透镜折射；而 13.5nm 极紫外光 (EUV) 会被任何玻璃吸收，必须在真空中靠 40 层钼/硅布拉格反射镜反射，在晶圆上印出纳米级芯片电路！', en: 'Compare the two optical columns: 193nm DUV refracts through glass lenses, whereas 13.5nm EUV is absorbed by matter and must bounce off Mo/Si Bragg mirrors in vacuum.' },
    processPos: [0, 0.55, 0],
  },
  F3: {
    tools: { zh: '雕版木模 → 石英纳米压印模板 (NIL) → 3D 生物打印喷头', en: 'Woodblock → Quartz Nanoimprint Stamp (NIL) → 3D Bioprinter', pos: [0, 0.65, 0] },
    materials: { zh: '宣纸松烟墨 → 纳米紫外光刻胶 → 活细胞水凝胶生物墨水', en: 'Xuan Paper & Ink → UV Nano-resist → Living-Cell Bio-ink Hydrogel', pos: [0, 0.25, 0] },
    watch: { zh: '观察横跨五千年的三座工位同台演进：① 唐代雕版盖印文字 → ② 纳米压印光刻 (NIL) 用石英物理印章直接压出 ~10nm 芯片结构 → ③ 生物打印用活细胞水凝胶逐层打印活性软骨组织！', en: 'Watch 3 stations across 5,000 years: ① Woodblock relief text → ② Nanoimprint Lithography (NIL) stamping ~10nm chip features → ③ 3D Bioprinting living cell hydrogel.' },
    processPos: [0, 0.45, 0],
  },
};

/** 提取步骤数组（从 scene.xx.steps 拆出 ① ② ③ 详细解说句） */
function parseStepSentences(stepsText) {
  if (!stepsText) return [];
  const marks = [];
  let m;
  const re = /[①-⑳]|\d+\)/g;
  while ((m = re.exec(stepsText)) !== null) marks.push({ i: m.index });
  if (!marks.length) return [stepsText.trim()];
  return marks.map((mk, j) => {
    const end = j + 1 < marks.length ? marks[j + 1].i : stepsText.length;
    return stepsText.slice(mk.i, end).trim();
  });
}

function renderExplain(sec, t, id, onSelectStep) {
  const sid = id.toLowerCase();
  const key = (f) => `scene.${sid}.${f}`;
  const callout = SCENE_CALLOUTS[id.toUpperCase()];
  const isEn = i18n.currentLang === 'en';

  const rows = [
    ['what', 'ex-what', '🎬 场景定位与背景', '🎬 Scenario & Context', t(key('what'))],
    ['steps', 'ex-steps', '🧭 完整工序分步详解（点击任意步骤可跳转）', '🧭 Step-by-Step Procedure (Click to jump)', t(key('steps'))],
    ['why', 'ex-why', '💡 核心科学原理', '💡 Core Scientific Principle', t(key('why'))],
    ['struct', 'ex-struct', '🔧 核心工具与材料解剖', '🔧 Tools & Materials Anatomy', t(key('struct'))],
    ['watch', 'ex-watch', '🔍 细节看点与观察指南', '🔍 What to Watch Closely', callout ? (isEn ? callout.watch.en : callout.watch.zh) : ''],
    ['diy', 'ex-diy', '🛠️ 动手复刻与实验验证', '🛠️ Hands-on Verification', t(key('diy'))],
  ];
  const filled = rows.filter(([, , , , txt]) => (txt || '').trim());
  if (!filled.length) return;
  const gen = GEN_OF[sid[0]];
  const chip = gen && sid[0] !== 'h'
    ? `<span class="gen-chip">⏳ ${isEn ? gen[1] : gen[0]}</span>` : '';
  const wrap = document.createElement('div');
  wrap.className = 'explain';

  const stepHtml = (f, txt) => {
    if (f !== 'steps') return null;
    const parts = parseStepSentences(txt);
    if (parts.length <= 1) return null;
    return parts.map((p, j) => `<span class="ex-step" data-step="${j}">${p}</span>`).join('');
  };

  wrap.innerHTML = filled.map(([f, cls, zhH, enH, txt]) => {
    const body = stepHtml(f, txt) || txt;
    return `<div class="ex-row ${cls}"><div class="ex-h"><span>${isEn ? enH : zhH}</span>${f === 'what' ? chip : ''}</div><div class="ex-b">${body}</div></div>`;
  }).join('');
  sec.appendChild(wrap);

  const stepSpans = wrap.querySelectorAll('.ex-steps .ex-step');
  if (stepSpans.length) {
    stepSpans.forEach((sp, j) => {
      sp.addEventListener('click', () => {
        if (onSelectStep) onSelectStep(j);
      });
    });
    RAIL_SPANS.set(id.toUpperCase(), Array.from(stepSpans));
  }
}

const RAIL_SETTERS = new Map();
const RAIL_SPANS = new Map();
const SCENE_STEP_HANDLERS = new Map();

function buildStepRail(sec, t, id) {
  const labels = (t(`scene.${id.toLowerCase()}.stepLabels`) || '').split('|').map((s) => s.trim()).filter(Boolean);
  if (!labels.length) return;
  const rail = document.createElement('div');
  rail.className = 'steprail';
  const pills = labels.map((lb, idx) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sr-step';
    b.textContent = `${idx + 1}. ${lb}`;
    b.addEventListener('click', () => {
      triggerSceneStep(sec, id.toUpperCase(), idx);
    });
    rail.appendChild(b);
    return b;
  });
  const replay = document.createElement('button');
  replay.type = 'button';
  replay.className = 'sr-replay';
  replay.textContent = '↻ ' + (i18n.currentLang === 'en' ? 'Replay Scene' : '重播本幕');
  replay.addEventListener('click', () => {
    ACTIVE_TWEEN_TOKEN++;
    PLAY_STATE.paused = false;
    syncAllToolbars();
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

/** 触发某幕的指定步骤（供顶部步骤胶囊、控制栏上下步按钮、下方流程列表共用） */
function triggerSceneStep(sec, sid, targetStepIdx) {
  const handler = SCENE_STEP_HANDLERS.get(sid);
  if (handler) {
    handler(targetStepIdx);
    return;
  }
  // 若场景内有 .steps 按钮组且数量大于 1，直接联动对应按钮
  const stepBtns = sec.querySelectorAll('.steps button');
  if (stepBtns && stepBtns.length > 1 && stepBtns[targetStepIdx]) {
    stepBtns[targetStepIdx].click();
    return;
  }
  if (CUR_KIT) CUR_KIT.step(targetStepIdx);
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
  const stageBlocks = [];
  let ribbon = null;
  let stick = null;
  let prevTopBtn = null;
  let nextTopBtn = null;
  let posTopSpan = null;
  let foldTopBtn = null;

  if (tabBar) {
    tabBar.classList.add('tl-bifurcate');
    ribbon = document.createElement('div');
    ribbon.className = 'era-ribbon';

    const eraStagesWrap = document.createElement('div');
    eraStagesWrap.className = 'era-stages';
    ERAS.forEach((e) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'era-seg';
      b.innerHTML = `<span class="era-dot" style="background:${e.color}"></span><span class="era-lbl"></span><span class="era-yrs">${e.yrs}</span>`;
      b.addEventListener('click', () => go(scenes.findIndex((s) => s.id === e.at) - idx));
      eraStagesWrap.appendChild(b);
      eraBtns.push(b);
    });

    const quickCtrl = document.createElement('div');
    quickCtrl.className = 'tl-quick-ctrl';
    prevTopBtn = document.createElement('button');
    prevTopBtn.type = 'button';
    prevTopBtn.className = 'tl-qbtn';
    prevTopBtn.addEventListener('click', () => go(-1));
    posTopSpan = document.createElement('span');
    posTopSpan.className = 'tl-qpos';
    nextTopBtn = document.createElement('button');
    nextTopBtn.type = 'button';
    nextTopBtn.className = 'tl-qbtn';
    nextTopBtn.addEventListener('click', () => go(1));
    foldTopBtn = document.createElement('button');
    foldTopBtn.type = 'button';
    foldTopBtn.className = 'tl-qbtn';
    foldTopBtn.addEventListener('click', () => {
      if (!stick) return;
      stick.classList.toggle('is-collapsed');
      const en = i18n.currentLang === 'en';
      const col = stick.classList.contains('is-collapsed');
      foldTopBtn.textContent = col ? (en ? '🗺️ Expand Timeline' : '🗺️ 展开时间轴') : (en ? '🔼 Fold' : '🔼 收起');
    });
    quickCtrl.append(prevTopBtn, posTopSpan, nextTopBtn, foldTopBtn);
    ribbon.append(eraStagesWrap, quickCtrl);

    stick = document.createElement('div');
    stick.className = 'stickyhead';
    const scrollWrap = document.createElement('div');
    scrollWrap.className = 'tl-scroll-wrap';

    const leftPad = document.createElement('button');
    leftPad.type = 'button';
    leftPad.className = 'tl-paddle left';
    leftPad.textContent = '‹';
    leftPad.title = 'Scroll Timeline Left';
    leftPad.addEventListener('click', () => { tabBar.scrollBy({ left: -380, behavior: 'smooth' }); });

    const rightPad = document.createElement('button');
    rightPad.type = 'button';
    rightPad.className = 'tl-paddle right';
    rightPad.textContent = '›';
    rightPad.title = 'Scroll Timeline Right';
    rightPad.addEventListener('click', () => { tabBar.scrollBy({ left: 380, behavior: 'smooth' }); });

    // 支持鼠标滚轮横向滚动时间轴
    tabBar.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        tabBar.scrollLeft += e.deltaY * 0.9;
      }
    }, { passive: false });

    tabBar.before(stick);
    scrollWrap.append(leftPad, tabBar, rightPad);
    stick.append(ribbon, scrollWrap);
  }

  const mods = scenes.map((def) => {
    const sec = document.createElement('section');
    sec.className = 'scene';
    buildStepRail(sec, t, def.id);
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
    const sidUpper = def.id.toUpperCase();
    renderExplain(explainCol, t, def.id, (stepIdx) => triggerSceneStep(sec, sidUpper, stepIdx));
    const structText = t(`scene.${def.id.toLowerCase()}.struct`) || '';
    const stepsText = t(`scene.${def.id.toLowerCase()}.steps`) || '';
    if (mainCol._stageApi) {
      mainCol._stageApi._meta = { id: def.id, structText, stepsText, t, sec };
      mainCol._stageApi.updateNarrator();
    }
    return {
      id: def.id, mod, sec, h, hint, mainCol, explainCol,
      titleKey: `scene.${def.id.toLowerCase()}.title`,
      hintKey: `scene.${def.id.toLowerCase()}.hint`,
    };
  });

  // ── 构建横向可分叉（东西方并行双轨）全景时间轴 ──
  const tabsById = new Map();
  const tabs = mods.map((m, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tl-node';
    b.dataset.sceneId = m.id;
    const c = scenes[i].color;
    if (c) b.style.borderLeft = `3.5px solid ${c}`;
    b.addEventListener('click', () => go(i - idx));
    tabsById.set(m.id.toUpperCase(), b);
    return b;
  });

  function makeSvgConnector(type, c1, c2) {
    const wrap = document.createElement('div');
    wrap.className = 'tl-connector';
    if (type === 'fork') {
      wrap.innerHTML = `<svg viewBox="0 0 34 108" aria-hidden="true">
        <path d="M 0 54 C 15 54, 17 28, 34 28" fill="none" stroke="${c1}" stroke-width="2.4" stroke-dasharray="3 2"/>
        <path d="M 0 54 C 15 54, 17 82, 34 82" fill="none" stroke="${c2}" stroke-width="2.4" stroke-dasharray="3 2"/>
        <circle cx="4" cy="54" r="3.5" fill="${c1}"/>
        <circle cx="30" cy="28" r="3" fill="${c1}"/>
        <circle cx="30" cy="82" r="3" fill="${c2}"/>
      </svg>`;
    } else if (type === 'merge') {
      wrap.innerHTML = `<svg viewBox="0 0 34 108" aria-hidden="true">
        <path d="M 0 28 C 17 28, 19 54, 34 54" fill="none" stroke="${c1}" stroke-width="2.4" stroke-dasharray="3 2"/>
        <path d="M 0 82 C 17 82, 19 54, 34 54" fill="none" stroke="${c2}" stroke-width="2.4" stroke-dasharray="3 2"/>
        <circle cx="4" cy="28" r="3" fill="${c1}"/>
        <circle cx="4" cy="82" r="3" fill="${c2}"/>
        <circle cx="30" cy="54" r="3.5" fill="${c2}"/>
      </svg>`;
    } else {
      wrap.innerHTML = `<svg viewBox="0 0 34 108" aria-hidden="true">
        <path d="M 0 28 C 14 28, 20 28, 34 28" fill="none" stroke="${c1}" stroke-width="2.2" stroke-dasharray="3 2"/>
        <path d="M 0 82 C 14 82, 20 82, 34 82" fill="none" stroke="${c2}" stroke-width="2.2" stroke-dasharray="3 2"/>
        <path d="M 6 28 C 17 28, 17 82, 28 82" fill="none" stroke="${c1}" stroke-opacity="0.32" stroke-width="1.5"/>
        <path d="M 6 82 C 17 82, 17 28, 28 28" fill="none" stroke="${c2}" stroke-opacity="0.32" stroke-width="1.5"/>
        <circle cx="30" cy="28" r="2.8" fill="${c1}"/>
        <circle cx="30" cy="82" r="2.8" fill="${c2}"/>
      </svg>`;
    }
    return wrap;
  }

  if (tabBar) {
    tabBar.innerHTML = '';
    TIMELINE_TOPOLOGY.forEach((st, sIdx) => {
      const block = document.createElement('div');
      block.className = 'tl-stage-block';
      block.style.borderTop = `3px solid ${st.color}`;

      const head = document.createElement('div');
      head.className = 'tl-stage-head';
      head.style.color = st.color;
      head.innerHTML = `<span class="tl-sh-title"></span><span class="tl-sh-tag"></span>`;
      block.appendChild(head);

      const laneEls = [];
      st.lanes.forEach((ln) => {
        const laneDiv = document.createElement('div');
        laneDiv.className = 'tl-lane';
        const badge = document.createElement('span');
        badge.className = `tl-lane-badge ${ln.cls}`;
        laneDiv.appendChild(badge);

        const nodesWrap = document.createElement('div');
        nodesWrap.className = 'tl-nodes';
        ln.ids.forEach((sid, k) => {
          const btn = tabsById.get(sid);
          if (!btn) return;
          if (k > 0) {
            const arr = document.createElement('span');
            arr.className = 'tl-arrow';
            arr.textContent = '→';
            nodesWrap.appendChild(arr);
          }
          nodesWrap.appendChild(btn);
        });
        laneDiv.appendChild(nodesWrap);
        block.appendChild(laneDiv);
        laneEls.push({ badge, spec: ln });
      });

      tabBar.appendChild(block);
      stageBlocks.push({ block, head, laneEls, spec: st });

      if (st.connectorAfter) {
        const nextColor = (TIMELINE_TOPOLOGY[sIdx + 1] && TIMELINE_TOPOLOGY[sIdx + 1].color) || st.color;
        tabBar.appendChild(makeSvgConnector(st.connectorAfter, st.color, nextColor));
      }
    });
  }

  // 底部跨幕导航条 (.scene-nav)
  let botNav = null;
  let botPrev = null;
  let botNext = null;
  let botPos = null;
  if (container) {
    botNav = document.createElement('nav');
    botNav.className = 'scene-nav';
    botPrev = document.createElement('button');
    botPrev.type = 'button';
    botPrev.addEventListener('click', () => { go(-1); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    botPos = document.createElement('span');
    botPos.className = 'page-pos';
    botNext = document.createElement('button');
    botNext.type = 'button';
    botNext.addEventListener('click', () => { go(1); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    botNav.append(botPrev, botPos, botNext);
    container.after(botNav);
  }

  function renderSceneHeading(m) {
    const isEn = i18n.currentLang === 'en';
    const meta = SCENE_TIMELINE_META[m.id.toUpperCase()];
    const gen = GEN_OF[m.id.toLowerCase()[0]];
    m.h.innerHTML = '';
    if (meta) {
      const yrSpan = document.createElement('span');
      yrSpan.className = 'yr-chip';
      yrSpan.textContent = `🗓️ ${isEn ? meta.yr.en : meta.yr.zh}`;
      m.h.appendChild(yrSpan);
    }
    m.h.appendChild(document.createTextNode(t(m.titleKey)));
    if (gen) {
      const gChip = document.createElement('span');
      gChip.className = 'gen-chip';
      gChip.textContent = isEn ? gen[1] : gen[0];
      m.h.appendChild(gChip);
    }
    if (meta && meta.branch) {
      const bChip = document.createElement('span');
      bChip.className = 'branch-chip';
      bChip.textContent = isEn ? meta.branch.en : meta.branch.zh;
      m.h.appendChild(bChip);
    }
  }

  function apply() {
    ACTIVE_TWEEN_TOKEN++;
    const isEn = i18n.currentLang === 'en';
    mods.forEach((m, i) => {
      const show = i === idx;
      m.sec.classList.toggle('active', show);
      if (show) { try { m.mod.onShow(); } catch (e) { console.error(`[${m.id} onShow]`, e); } }
      else { try { m.mod.onHide(); } catch (e) { console.error(`[${m.id} onHide]`, e); } }
    });
    tabs.forEach((b, i) => {
      const sid = mods[i].id.toUpperCase();
      const meta = SCENE_TIMELINE_META[sid];
      const yrStr = meta ? (isEn ? meta.yr.en : meta.yr.zh) : '';
      const locStr = meta ? (isEn ? meta.loc.en : meta.loc.zh) : '';
      b.classList.toggle('on', i === idx);
      b.innerHTML = `<span class="tl-yr"><span>${yrStr}</span><i>${locStr}</i></span><span class="tl-ttl">${t(mods[i].titleKey)}</span>`;
    });

    const activeBtn = tabs[idx];
    if (activeBtn && tabBar) {
      try {
        const bRect = activeBtn.getBoundingClientRect();
        const tRect = tabBar.getBoundingClientRect();
        if (tRect.width > 0) {
          const offset = (bRect.left - tRect.left) - (tRect.width / 2) + (bRect.width / 2);
          tabBar.scrollBy({ left: offset, behavior: 'smooth' });
        }
      } catch (_) {}
    }

    renderBar();
    const ce = ERA_OF[mods[idx].id.toLowerCase()[0]] ?? 0;
    eraBtns.forEach((b, j) => {
      const lbl = b.querySelector('.era-lbl');
      if (lbl) lbl.textContent = isEn ? ERAS[j].en : ERAS[j].zh;
      b.style.background = j === ce ? ERAS[j].color : (j < ce ? ERAS[j].color + '22' : 'rgba(255,255,255,0.88)');
      b.style.borderColor = j <= ce ? ERAS[j].color : 'rgba(70,55,35,0.16)';
      b.classList.toggle('cur', j === ce);
      b.title = isEn ? ERAS[j].en : ERAS[j].zh;
    });

    stageBlocks.forEach((sb) => {
      sb.block.classList.toggle('is-active-era', sb.spec.eraIdx === ce);
      const tEl = sb.head.querySelector('.tl-sh-title');
      const tagEl = sb.head.querySelector('.tl-sh-tag');
      if (tEl) tEl.textContent = isEn ? sb.spec.head.en : sb.spec.head.zh;
      if (tagEl) tagEl.textContent = isEn ? sb.spec.tag.en : sb.spec.tag.zh;
      sb.laneEls.forEach((le) => {
        le.badge.textContent = isEn ? le.spec.label.en : le.spec.label.zh;
      });
    });

    if (prevTopBtn) {
      prevTopBtn.disabled = idx <= 0;
      prevTopBtn.textContent = isEn ? '◀ Prev' : '◀ 上一幕';
    }
    if (nextTopBtn) {
      nextTopBtn.disabled = idx >= mods.length - 1;
      nextTopBtn.textContent = isEn ? 'Next ▶' : '下一幕 ▶';
    }
    if (posTopSpan) {
      posTopSpan.textContent = isEn ? `Scene ${idx + 1} / ${mods.length}` : `第 ${idx + 1} / ${mods.length} 幕`;
    }
    if (foldTopBtn && stick) {
      const col = stick.classList.contains('is-collapsed');
      foldTopBtn.textContent = col ? (isEn ? '🗺️ Expand Timeline' : '🗺️ 展开时间轴') : (isEn ? '🔼 Fold' : '🔼 收起');
    }

    if (botPrev && botNext && botPos) {
      botPrev.disabled = idx <= 0;
      botNext.disabled = idx >= mods.length - 1;
      const prevTitle = idx > 0 ? t(mods[idx - 1].titleKey) : '';
      const nextTitle = idx < mods.length - 1 ? t(mods[idx + 1].titleKey) : '';
      botPrev.textContent = idx > 0 ? `◀ ${isEn ? 'Prev: ' : '上一幕：'}${prevTitle}` : (isEn ? '◀ First Scene' : '◀ 已是第一幕');
      botNext.textContent = idx < mods.length - 1 ? `${isEn ? 'Next: ' : '下一幕：'}${nextTitle} ▶` : (isEn ? 'Last Scene ▶' : '已是最后一幕 ▶');
      botPos.textContent = isEn
        ? `Historical Timeline · Scene ${idx + 1} of ${mods.length}`
        : `历史时间轴 · 第 ${idx + 1} / ${mods.length} 幕`;
    }

    history.replaceState(null, '', idx === 0 ? './' : `?s=${mods[idx].id}`);
    document.title = `${t('app.title')} · ${t(mods[idx].titleKey)}`;
    const curStage = mods[idx] && mods[idx].mainCol && mods[idx].mainCol._stageApi;
    if (curStage) curStage.updateNarrator();
  }
  function go(delta) { idx = Math.min(mods.length - 1, Math.max(0, idx + delta)); apply(); }
  function rerender() {
    mods.forEach((m) => {
      renderSceneHeading(m);
      m.hint.textContent = t(m.hintKey);
      const old = m.explainCol.querySelector('.explain');
      if (old) old.remove();
      renderExplain(m.explainCol, t, m.id, (stepIdx) => triggerSceneStep(m.sec, m.id.toUpperCase(), stepIdx));
      if (m.mainCol && m.mainCol._stageApi) {
        m.mainCol._stageApi._meta = {
          id: m.id,
          structText: t(`scene.${m.id.toLowerCase()}.struct`) || '',
          stepsText: t(`scene.${m.id.toLowerCase()}.steps`) || '',
          t,
          sec: m.sec,
        };
        m.mainCol._stageApi.updateNarrator();
      }
      const rail = m.sec.querySelector('.steprail .sr-replay');
      if (rail) rail.textContent = '↻ ' + (i18n.currentLang === 'en' ? 'Replay Scene' : '重播本幕');
      const labels = (t(`scene.${m.id.toLowerCase()}.stepLabels`) || '').split('|').map((s) => s.trim()).filter(Boolean);
      const pills = m.sec.querySelectorAll('.steprail .sr-step');
      pills.forEach((p, j) => { if (labels[j]) p.textContent = `${j + 1}. ${labels[j]}`; });
      const badge = m.sec.querySelector('.cam-badge');
      if (badge) {
        badge.textContent = i18n.currentLang === 'en'
          ? '🎥 3D Interactive Stage · Drag to Orbit · Scroll to Zoom · Click to Reset'
          : '🎥 3D 交互式工坊 · 拖拽自由旋转 · 滚轮缩放微距 · 点击复位视角';
      }
      if (m.mod && m.mod.rerender) m.mod.rerender();
    });
    syncAllToolbars();
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
    if (spans) spans.forEach((s, j) => s.classList.toggle('on', j === i));
    const curMod = mods[idx];
    if (curMod && curMod.mainCol && curMod.mainCol._stageApi) {
      if (curMod.mainCol._stageApi._activeStep !== i) {
        curMod.mainCol._stageApi._activeStep = i;
        curMod.mainCol._stageApi.updateNarrator();
      }
    }
  };
  mods.forEach((m) => { if (m.mod && m.mod.mount) { try { m.mod.mount(); } catch (e) { console.error(`[${m.id} mount]`, e); } } });
  idx = i0;
  rerender();
  i18n.subscribe(rerender);

  document.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.code === 'Space') {
      e.preventDefault();
      PLAY_STATE.paused = !PLAY_STATE.paused;
      syncAllToolbars();
      return;
    }
    if (e.key === 'ArrowRight' || e.key === 'PageDown') go(1);
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(-1);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// v3.2 共享单 WebGLRenderer + Three.js 全宽 3D 舞台 (stage3d)
// ═══════════════════════════════════════════════════════════════════════════

let SHARED_RENDERER = null;
let SHARED_ENV_TEX = null;
let CUR_STAGE = null;

function getSharedWebGL() {
  if (!SHARED_RENDERER) {
    SHARED_RENDERER = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    SHARED_RENDERER.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    SHARED_RENDERER.toneMapping = THREE.ACESFilmicToneMapping;
    SHARED_RENDERER.toneMappingExposure = 1.15;
    SHARED_RENDERER.shadowMap.enabled = true;
    SHARED_RENDERER.shadowMap.type = THREE.PCFSoftShadowMap;
    const pmrem = new THREE.PMREMGenerator(SHARED_RENDERER);
    SHARED_ENV_TEX = pmrem.fromEquirectangular(studioEquirect(THREE)).texture;
    pmrem.dispose();
  }
  return { renderer: SHARED_RENDERER, envTex: SHARED_ENV_TEX };
}

/**
 * 创建全宽 Three.js 3D 舞台 + 右上角微距原理剖面窗 + 底部实时分步解说舱 + 离子推进器级交互控制栏
 */
export function stage3d(parent, arg2 = {}, arg3 = {}) {
  const opts = (arg2 && arg2.WebGLRenderer) ? arg3 : arg2;

  let initTheta = opts.theta ?? 0.30;
  let initPhi = opts.phi ?? 1.02;
  let initRadius = opts.radius ?? 5.2;
  let initTarget = opts.target || opts.camTarget || [0, 0.3, 0];

  if (opts.camPos) {
    const dx = opts.camPos[0] - initTarget[0];
    const dy = opts.camPos[1] - initTarget[1];
    const dz = opts.camPos[2] - initTarget[2];
    initRadius = Math.max(2.2, Math.hypot(dx, dy, dz));
    initPhi = Math.acos(Math.max(-0.98, Math.min(0.98, dy / initRadius)));
    initTheta = Math.atan2(dx, dz);
  }
  // 适度拉近默认相机距离，让 3D 主体机构在大画幅中更饱满清晰
  initRadius = Math.max(2.4, initRadius * 0.88);

  const {
    height = 480,
    warm = true,
    bg = warm ? '#1c1713' : '#111824',
    fov = 38,
    table = true,
    tableY = opts.theta !== undefined ? -0.56 : -0.02,
  } = opts;

  // 全宽大画幅 3D 视口高度至少 470px，保证细节一览无余
  const actualHeight = Math.max(470, height);

  const wrap = document.createElement('div');
  wrap.className = 'stage-wrap';
  parent.appendChild(wrap);

  const viewport = document.createElement('div');
  viewport.className = 'stage-viewport';
  viewport.style.height = actualHeight + 'px';
  wrap.appendChild(viewport);

  const glSlot = document.createElement('div');
  glSlot.className = 'stage-gl-slot';
  viewport.appendChild(glSlot);

  const hudCanvas = document.createElement('canvas');
  hudCanvas.className = 'stage-hud-canvas';
  viewport.appendChild(hudCanvas);
  const g = hudCanvas.getContext('2d');

  const badge = document.createElement('button');
  badge.type = 'button';
  badge.className = 'cam-badge';
  badge.textContent = i18n.currentLang === 'en'
    ? '🎥 3D Interactive Stage · Drag to Orbit · Scroll to Zoom · Click to Reset'
    : '🎥 3D 交互式工坊 · 拖拽自由旋转 · 滚轮缩放微距 · 点击复位视角';
  viewport.appendChild(badge);

  // ── 实时分步解说与工序/工具/材料遥测舱 (.live-narrator) ──
  const narrator = document.createElement('div');
  narrator.className = 'live-narrator';
  narrator.innerHTML = `
    <div class="ln-top">
      <span class="ln-step-badge">⚙️ 工序 1/4</span>
      <div class="ln-prog-wrap"><div class="ln-prog-bar" style="width:25%"></div></div>
      <span class="ln-state-tag">▶ 慢速精讲中</span>
    </div>
    <div class="ln-desc">—</div>
    <div class="ln-meta">
      <div class="ln-chip c-tool"><b>🔧 核心工具:</b> <span>—</span></div>
      <div class="ln-chip c-mat"><b>🧱 作用材料:</b> <span>—</span></div>
      <div class="ln-chip c-watch"><b>🔍 观察看点:</b> <span>—</span></div>
    </div>
  `;
  wrap.appendChild(narrator);

  // ── 离子推进器风格 3D 播放器控制栏 (.player-toolbar) ──
  const toolbar = document.createElement('div');
  toolbar.className = 'player-toolbar';
  wrap.appendChild(toolbar);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bg);

  const camera = new THREE.PerspectiveCamera(fov, 16 / 9, 0.1, 80);

  // 影棚四点照明系统 (Key + Rim + Fill + 动态工序聚光灯 ActionSpot)
  const amb = new THREE.AmbientLight(warm ? 0xffeacc : 0xdbeafe, 0.76);
  const keyLight = new THREE.DirectionalLight(warm ? 0xfff2dc : 0xf8fafc, 1.75);
  keyLight.position.set(4.5, 7.5, 5.2);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 20;
  const dCam = 4.2;
  keyLight.shadow.camera.left = -dCam;
  keyLight.shadow.camera.right = dCam;
  keyLight.shadow.camera.top = dCam;
  keyLight.shadow.camera.bottom = -dCam;
  keyLight.shadow.bias = -0.0015;

  const rimLight = new THREE.DirectionalLight(warm ? 0xf59e0b : 0x38bdf8, 0.75);
  rimLight.position.set(-5.0, 3.6, -4.2);
  const fillLight = new THREE.DirectionalLight(0x94a3b8, 0.48);
  fillLight.position.set(-3.2, -2.0, 4.0);
  const actionSpot = new THREE.PointLight(warm ? 0xffb74d : 0x38bdf8, 0.9, 4.5, 1.5);
  actionSpot.position.set(0, 1.4, 0.5);
  scene.add(amb, keyLight, rimLight, fillLight, actionSpot);

  const world = new THREE.Group();
  scene.add(world);

  // ── 精工双层 3D 工坊圆台面 + 黄铜刻度圈 + 36 道径向刻度齿 + 锚定螺栓 ──
  if (table) {
    const tbGroup = new THREE.Group();
    const tbTex = toTexture(THREE, warm ? woodCanvas('#6e4b2a', 19, 256, 256) : stoneCanvas('#283242', 29, 256, 256), 2, 2);
    const tbMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(4.65, 4.85, 0.16, 64),
      new THREE.MeshStandardMaterial({
        map: tbTex,
        roughness: warm ? 0.70 : 0.44,
        metalness: warm ? 0.08 : 0.36,
      })
    );
    tbMesh.position.y = tableY - 0.08;
    tbMesh.receiveShadow = true;
    tbGroup.add(tbMesh);

    // 底层金属法兰基座
    const plinthMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(4.92, 5.08, 0.10, 64),
      new THREE.MeshStandardMaterial({
        color: warm ? 0x3d2918 : 0x1e293b,
        roughness: 0.45,
        metalness: 0.65,
      })
    );
    plinthMesh.position.y = tableY - 0.20;
    tbGroup.add(plinthMesh);

    // 外圈立体黄铜/钢制倒角护圈
    const bezelMat = new THREE.MeshStandardMaterial({
      color: warm ? 0xb47b38 : 0x475569,
      roughness: 0.32,
      metalness: 0.82,
    });
    const bezelMesh = new THREE.Mesh(new THREE.TorusGeometry(4.62, 0.045, 14, 72), bezelMat);
    bezelMesh.rotation.x = Math.PI / 2;
    bezelMesh.position.y = tableY;
    tbGroup.add(bezelMesh);

    // 内圈刻度光环 + 36 道精密径向刻度块
    const ringMesh = new THREE.Mesh(
      new THREE.RingGeometry(3.82, 3.90, 64),
      new THREE.MeshBasicMaterial({ color: warm ? 0xd97706 : 0x38bdf8, transparent: true, opacity: 0.26, side: THREE.DoubleSide })
    );
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = tableY + 0.004;
    tbGroup.add(ringMesh);

    const tickGeo = new THREE.BoxGeometry(0.035, 0.008, 0.18);
    const tickMat = new THREE.MeshBasicMaterial({ color: warm ? 0xf59e0b : 0x38bdf8, transparent: true, opacity: 0.35 });
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const tick = new THREE.Mesh(tickGeo, tickMat);
      tick.position.set(Math.sin(a) * 4.15, tableY + 0.005, Math.cos(a) * 4.15);
      tick.rotation.y = a;
      if (i % 3 === 0) tick.scale.set(1.6, 1, 1.5);
      tbGroup.add(tick);
    }
    scene.add(tbGroup);
  }

  // 3D 空间光尘微粒
  const dustCount = 42;
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
    size: 0.042,
    transparent: true,
    opacity: 0.35,
  });
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  scene.add(dustPoints);

  // 球面轨道相机控制状态 (Orbit Rig + 多视角预设)
  let camPreset = 'overview'; // 'overview' | 'closeup' | 'topdown'
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
      camPreset = 'overview';
      this.targetTheta = initTheta;
      this.targetPhi = initPhi;
      this.targetRadius = initRadius;
      this.goalTarget.set(...initTarget);
      this.userTouchedUntil = 0;
      syncAllToolbars();
    },
    applyPreset(mode, calloutPos) {
      camPreset = mode;
      this.userTouchedUntil = performance.now() + 18000;
      if (mode === 'overview') {
        this.targetTheta = initTheta;
        this.targetPhi = initPhi;
        this.targetRadius = initRadius;
        this.goalTarget.set(...initTarget);
      } else if (mode === 'closeup') {
        this.targetTheta = initTheta + 0.15;
        this.targetPhi = Math.max(0.55, initPhi * 0.86);
        this.targetRadius = Math.max(2.3, initRadius * 0.62);
        if (calloutPos) {
          this.goalTarget.set(calloutPos[0] * 0.55, calloutPos[1] * 0.7 + 0.15, calloutPos[2] * 0.55);
        } else {
          this.goalTarget.set(...initTarget);
        }
      } else if (mode === 'topdown') {
        this.targetTheta = 0.02;
        this.targetPhi = 0.36;
        this.targetRadius = Math.max(3.2, initRadius * 0.88);
        this.goalTarget.set(...initTarget);
      }
      syncAllToolbars();
    },
    setPose({ theta, phi, radius, target }) {
      if (performance.now() < this.userTouchedUntil) return;
      if (theta !== undefined) this.targetTheta = theta;
      if (phi !== undefined) this.targetPhi = phi;
      if (radius !== undefined) this.targetRadius = radius * 0.88;
      if (target) this.goalTarget.set(target[0], target[1], target[2]);
    },
  };

  badge.addEventListener('click', (e) => {
    e.stopPropagation();
    orbit.reset();
    sound.play('tick');
  });

  viewport.addEventListener('pointerdown', (e) => {
    if (e.target === badge) return;
    orbit.dragging = true;
    orbit.lastX = e.clientX;
    orbit.lastY = e.clientY;
    orbit.userTouchedUntil = performance.now() + 12000;
    try { viewport.setPointerCapture(e.pointerId); } catch (_) {}
  });
  viewport.addEventListener('pointermove', (e) => {
    if (!orbit.dragging) return;
    const dx = e.clientX - orbit.lastX;
    const dy = e.clientY - orbit.lastY;
    orbit.lastX = e.clientX;
    orbit.lastY = e.clientY;
    orbit.targetTheta -= dx * 0.0085;
    orbit.targetPhi = Math.max(0.24, Math.min(1.48, orbit.targetPhi - dy * 0.0075));
    orbit.userTouchedUntil = performance.now() + 12000;
  });
  const endDrag = () => { orbit.dragging = false; };
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);
  viewport.addEventListener('dblclick', () => orbit.reset());
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    orbit.targetRadius = Math.max(2.0, Math.min(12.5, orbit.targetRadius + e.deltaY * 0.0038));
    orbit.userTouchedUntil = performance.now() + 12000;
  }, { passive: false });

  // ── 构建播放器交互控制栏 (暂停/播放、上下步、重播、视角预设、微视窗/标签开关、速度调节) ──
  function buildToolbar() {
    const isEn = i18n.currentLang === 'en';
    toolbar.innerHTML = `
      <div class="pt-group">
        <button type="button" class="pt-btn" data-act="toggle-pause"></button>
        <button type="button" class="pt-btn" data-act="prev-step" title="${isEn ? 'Previous Step' : '上一步'}">⏮ ${isEn ? 'Prev' : '上一步'}</button>
        <button type="button" class="pt-btn" data-act="next-step" title="${isEn ? 'Next Step' : '下一步'}">⏭ ${isEn ? 'Next' : '下一步'}</button>
        <button type="button" class="pt-btn" data-act="replay" title="${isEn ? 'Replay Scene' : '从头重播本幕'}">🔄 ${isEn ? 'Replay' : '重播'}</button>
      </div>
      <div class="pt-group">
        <span class="pt-label">${isEn ? 'Camera:' : '视角：'}</span>
        <button type="button" class="pt-btn" data-cam="overview">🎥 ${isEn ? 'Overview' : '全景'}</button>
        <button type="button" class="pt-btn" data-cam="closeup">🔍 ${isEn ? 'Close-up' : '微距特写'}</button>
        <button type="button" class="pt-btn" data-cam="topdown">📐 ${isEn ? 'Top-Down' : '俯视剖面'}</button>
      </div>
      <div class="pt-group">
        <button type="button" class="pt-btn" data-act="toggle-inset">🔬 ${isEn ? 'Micro Loupe' : '原理微视窗'}</button>
        <button type="button" class="pt-btn" data-act="toggle-labels">🏷️ ${isEn ? '3D Labels' : '3D标签'}</button>
      </div>
      <div class="pt-group">
        <span class="pt-label">⏱️ ${isEn ? 'Speed:' : '速度：'}</span>
        <button type="button" class="pt-btn" data-spd="0.5">0.5× ${isEn ? 'Slow' : '极慢'}</button>
        <button type="button" class="pt-btn" data-spd="1">1.0× ${isEn ? 'Guided' : '慢速精讲'}</button>
        <button type="button" class="pt-btn" data-spd="1.6">1.6×</button>
        <button type="button" class="pt-btn" data-spd="2.4">2.4×</button>
      </div>
    `;

    const pauseBtn = toolbar.querySelector('[data-act="toggle-pause"]');
    const insetBtn = toolbar.querySelector('[data-act="toggle-inset"]');
    const labelsBtn = toolbar.querySelector('[data-act="toggle-labels"]');
    const camBtns = toolbar.querySelectorAll('[data-cam]');
    const spdBtns = toolbar.querySelectorAll('[data-spd]');

    const syncUI = () => {
      const en = i18n.currentLang === 'en';
      if (pauseBtn) {
        pauseBtn.classList.toggle('pause-on', PLAY_STATE.paused);
        pauseBtn.textContent = PLAY_STATE.paused
          ? (en ? '▶ Resume' : '▶ 继续播放')
          : (en ? '⏸ Pause' : '⏸ 暂停细看');
      }
      if (insetBtn) insetBtn.classList.toggle('active', PLAY_STATE.showInset);
      if (labelsBtn) labelsBtn.classList.toggle('active', PLAY_STATE.showLabels);
      camBtns.forEach((b) => b.classList.toggle('active', b.getAttribute('data-cam') === camPreset));
      spdBtns.forEach((b) => b.classList.toggle('active', Math.abs(Number(b.getAttribute('data-spd')) - PLAY_STATE.speed) < 0.05));
      stageApi.updateNarrator();
    };
    TOOLBAR_SYNC_FNS.add(syncUI);
    syncUI();

    pauseBtn.addEventListener('click', () => {
      PLAY_STATE.paused = !PLAY_STATE.paused;
      sound.play('tick');
      syncAllToolbars();
    });

    toolbar.querySelector('[data-act="prev-step"]').addEventListener('click', () => {
      const meta = stageApi._meta;
      if (!meta) return;
      const stepLabels = (meta.t(`scene.${meta.id.toLowerCase()}.stepLabels`) || '').split('|').filter(Boolean);
      const n = Math.max(1, stepLabels.length);
      const nextIdx = (stageApi._activeStep - 1 + n) % n;
      triggerSceneStep(meta.sec, meta.id.toUpperCase(), nextIdx);
      sound.play('tick');
    });

    toolbar.querySelector('[data-act="next-step"]').addEventListener('click', () => {
      const meta = stageApi._meta;
      if (!meta) return;
      const stepLabels = (meta.t(`scene.${meta.id.toLowerCase()}.stepLabels`) || '').split('|').filter(Boolean);
      const n = Math.max(1, stepLabels.length);
      const nextIdx = (stageApi._activeStep + 1) % n;
      triggerSceneStep(meta.sec, meta.id.toUpperCase(), nextIdx);
      sound.play('tick');
    });

    toolbar.querySelector('[data-act="replay"]').addEventListener('click', () => {
      const meta = stageApi._meta;
      if (!meta || !meta.sec) return;
      const replayBtn = meta.sec.querySelector('.steprail .sr-replay');
      if (replayBtn) replayBtn.click();
      sound.play('tick');
    });

    camBtns.forEach((b) => {
      b.addEventListener('click', () => {
        const mode = b.getAttribute('data-cam');
        const sId = stageApi._meta ? stageApi._meta.id.toUpperCase() : '';
        const callout = SCENE_CALLOUTS[sId];
        orbit.applyPreset(mode, callout ? callout.processPos : null);
        sound.play('tick');
      });
    });

    insetBtn.addEventListener('click', () => {
      PLAY_STATE.showInset = !PLAY_STATE.showInset;
      sound.play('tick');
      syncAllToolbars();
    });

    labelsBtn.addEventListener('click', () => {
      PLAY_STATE.showLabels = !PLAY_STATE.showLabels;
      sound.play('tick');
      syncAllToolbars();
    });

    spdBtns.forEach((b) => {
      b.addEventListener('click', () => {
        PLAY_STATE.speed = Number(b.getAttribute('data-spd')) || 1.0;
        PLAY_STATE.paused = false;
        sound.play('tick');
        syncAllToolbars();
      });
    });
  }
  buildToolbar();

  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let w = 960, hh = actualHeight;

  function size() {
    const r = viewport.getBoundingClientRect();
    w = Math.max(320, r.width || viewport.clientWidth || 960);
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

  // 更新底部实时同步分步解说面板 (.live-narrator)
  function updateNarrator() {
    const meta = stageApi._meta;
    if (!meta) return;
    const isEn = i18n.currentLang === 'en';
    const sId = (meta.id || '').toUpperCase();
    const callout = SCENE_CALLOUTS[sId] || null;

    const stepLabels = (meta.t(`scene.${meta.id.toLowerCase()}.stepLabels`) || '')
      .split('|').map((s) => s.trim()).filter(Boolean);
    const totalSteps = Math.max(1, stepLabels.length);
    const curStep = Math.max(0, Math.min(totalSteps - 1, stageApi._activeStep || 0));
    const curStepName = stepLabels[curStep] || '';

    const stepSentences = parseStepSentences(meta.t(`scene.${meta.id.toLowerCase()}.steps`) || '');
    const curSentence = stepSentences[Math.min(curStep, Math.max(0, stepSentences.length - 1))]
      || meta.t(`scene.${meta.id.toLowerCase()}.what`) || '';

    const badgeEl = narrator.querySelector('.ln-step-badge');
    const progEl = narrator.querySelector('.ln-prog-bar');
    const stateEl = narrator.querySelector('.ln-state-tag');
    const descEl = narrator.querySelector('.ln-desc');
    const toolEl = narrator.querySelector('.c-tool');
    const matEl = narrator.querySelector('.c-mat');
    const watchEl = narrator.querySelector('.c-watch');

    if (badgeEl) {
      badgeEl.textContent = isEn
        ? `⚙️ Step ${curStep + 1} / ${totalSteps} · ${curStepName}`
        : `⚙️ 工序 ${curStep + 1} / ${totalSteps} · ${curStepName}`;
    }
    if (progEl) {
      progEl.style.width = `${Math.round(((curStep + 1) / totalSteps) * 100)}%`;
    }
    if (stateEl) {
      if (PLAY_STATE.paused) {
        stateEl.textContent = isEn ? '⏸ Paused (Drag 3D to inspect)' : '⏸ 已暂停（可自由拖拽旋转 3D 模型观察细节）';
      } else {
        stateEl.textContent = isEn
          ? `▶ Playing (${PLAY_STATE.speed}× Guided Pace)`
          : `▶ 连续演示中（${PLAY_STATE.speed}× 慢速精讲）`;
      }
    }
    if (descEl) {
      const prefix = curStepName ? `【${curStepName}】` : '';
      descEl.textContent = curSentence.includes(curStepName) ? curSentence : `${prefix}${curSentence}`;
    }
    if (callout) {
      if (toolEl) {
        toolEl.innerHTML = `<b>${isEn ? '🔧 Key Tools:' : '🔧 核心工具：'}</b> <span>${isEn ? callout.tools.en : callout.tools.zh}</span>`;
      }
      if (matEl) {
        matEl.innerHTML = `<b>${isEn ? '🧱 Materials:' : '🧱 作用材料：'}</b> <span>${isEn ? callout.materials.en : callout.materials.zh}</span>`;
      }
      if (watchEl) {
        watchEl.innerHTML = `<b>${isEn ? '🔍 Watch For:' : '🔍 观察重点：'}</b> <span>${isEn ? callout.watch.en : callout.watch.zh}</span>`;
      }
    }
  }

  // 绘制 3D 空间引线标签 (3D Spatial Callout Pins)
  function drawAutoProcessHud(nowSec) {
    const meta = stageApi._meta;
    if (!meta) return;
    const isEn = i18n.currentLang === 'en';
    const sId = (meta.id || '').toUpperCase();
    const callout = SCENE_CALLOUTS[sId] || null;

    if (callout && callout.processPos) {
      actionSpot.position.set(
        callout.processPos[0],
        callout.processPos[1] + 1.15,
        callout.processPos[2] + 0.45
      );
    }

    if (!PLAY_STATE.showLabels) {
      pendingLabels.length = 0;
      return;
    }

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

    if (pendingLabels.length === 0 && callout) {
      stageApi.label3D(
        [callout.tools.pos[0], callout.tools.pos[1] + Math.sin(nowSec * 1.6) * 0.025, callout.tools.pos[2]],
        `🔧 ${toolSummary}`,
        { dx: -44, dy: -28, color: '#38bdf8' }
      );
      stageApi.label3D(
        [callout.materials.pos[0], callout.materials.pos[1] + Math.cos(nowSec * 1.5) * 0.025, callout.materials.pos[2]],
        `🧱 ${matSummary}`,
        { dx: 38, dy: -26, color: '#34d399' }
      );
      if (curStepName) {
        stageApi.label3D(
          [callout.processPos[0], callout.processPos[1] + 0.15, callout.processPos[2]],
          `⚙️ ${isEn ? 'Active Step' : '当前工序'} (${curStep + 1}/${Math.max(1, stepLabels.length)}): ${curStepName}`,
          { dx: 20, dy: 28, color: '#fbbf24' }
        );
      }
    }

    // 冲洗并绘制全部 3D 空间引线标签
    const rightGuard = PLAY_STATE.showInset ? 255 : 210;
    while (pendingLabels.length > 0) {
      const lb = pendingLabels.shift();
      projVec.set(lb.pos[0], lb.pos[1], lb.pos[2]);
      projVec.project(camera);
      if (projVec.z > 1) continue;
      const sx = (projVec.x * 0.5 + 0.5) * w;
      const sy = (-projVec.y * 0.5 + 0.5) * hh;
      if (sx < 16 || sx > w - 30 || sy < 24 || sy > hh - 24) continue;

      g.save();
      g.font = '600 12px system-ui, sans-serif';
      const tw = Math.min(280, g.measureText(lb.text).width + 20);
      const maxBx = (sy < 210 && PLAY_STATE.showInset) ? (w - rightGuard - tw) : (w - tw - 14);
      const bx = Math.max(14, Math.min(maxBx, sx + lb.dx));
      const by = Math.max(44, Math.min(hh - 36, sy + lb.dy));

      // 3D 锚点双层光环
      g.fillStyle = lb.color;
      g.beginPath();
      g.arc(sx, sy, 4.0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = lb.color;
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(sx, sy, 7.5, 0, Math.PI * 2);
      g.stroke();

      // 折线引线
      g.beginPath();
      g.moveTo(sx, sy);
      g.lineTo(bx + 12, by);
      g.stroke();

      // 悬浮毛玻璃胶囊标签
      g.fillStyle = 'rgba(10, 14, 22, 0.88)';
      roundRect(g, bx, by - 13, tw, 26, 7);
      g.fill();
      g.strokeStyle = lb.color;
      g.lineWidth = 1.3;
      roundRect(g, bx, by - 13, tw, 26, 7);
      g.stroke();

      g.fillStyle = '#f8fafc';
      g.textAlign = 'left';
      g.textBaseline = 'middle';
      g.fillText(lb.text, bx + 10, by, tw - 18);
      g.restore();
    }
  }

  let shadowTagged = false;

  const stageApi = {
    THREE,
    wrap,
    viewport,
    scene,
    camera,
    world,
    orbit,
    canvas: hudCanvas,
    hudCanvas,
    g,
    _activeStep: 0,
    _meta: null,
    updateNarrator,
    get w() { return w; },
    get h() { return hh; },
    dpr,
    label3D(pos, text, { dx = 22, dy = -22, color = '#fbbf24' } = {}) {
      const arr = Array.isArray(pos) ? pos : [pos.x || 0, pos.y || 0, pos.z || 0];
      pendingLabels.push({ pos: arr, text, dx, dy, color });
    },
    begin() {
      CUR_STAGE = stageApi;
      if (viewport.clientWidth > 0 && Math.abs(viewport.clientWidth - w) > 4) size();
      g.save();
      g.scale(dpr, dpr);
      g.clearRect(0, 0, w, hh);
    },
    backdrop() {},
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
      if (!shadowTagged) {
        shadowTagged = true;
        world.traverse((obj) => {
          if (obj.isMesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
          }
        });
      }
      // 柔和呼吸环绕运镜（暂停或用户手动拖拽时保持稳定）
      const canSway = !PLAY_STATE.paused && (performance.now() > orbit.userTouchedUntil);
      const sway = canSway ? Math.sin(nowSec * 0.38) * 0.10 : 0;
      const pitchSway = canSway ? Math.cos(nowSec * 0.28) * 0.025 : 0;
      orbit.theta += (orbit.targetTheta + sway - orbit.theta) * Math.min(1, dt * 5);
      orbit.phi += (orbit.targetPhi + pitchSway - orbit.phi) * Math.min(1, dt * 5);
      orbit.radius += (orbit.targetRadius - orbit.radius) * Math.min(1, dt * 5);
      orbit.target.lerp(orbit.goalTarget, Math.min(1, dt * 5));

      const sinPhi = Math.sin(orbit.phi);
      camera.position.set(
        orbit.target.x + orbit.radius * sinPhi * Math.sin(orbit.theta),
        orbit.target.y + orbit.radius * Math.cos(orbit.phi),
        orbit.target.z + orbit.radius * sinPhi * Math.cos(orbit.theta)
      );
      camera.lookAt(orbit.target);

      if (!PLAY_STATE.paused) dustPoints.rotation.y = nowSec * 0.035;
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
      updateNarrator();
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
export function stage(parent, h = 470) {
  return stage3d(parent, { height: Math.max(470, h) });
}

// ═══════════════════════════════════════════════════════════════════════════
// v3.2 高精度 3D 印刷机构生成器（雕版穿带+界行、活字字肩+脚槽、滚筒传动齿轮）
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 1. 创建 3D 凸版/雕版/石版组件（带端木穿带、四周双栏界行与高分字模）
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
    type = 'wood',
  } = opts;

  const group = new THREE.Group();
  const baseTex = toTexture(
    THREE,
    type === 'stone' ? stoneCanvas(baseColor, 17) : type === 'metal' ? metalCanvas(baseColor, 13) : woodCanvas(baseColor, 7),
    2, 2
  );
  const baseMat = new THREE.MeshStandardMaterial({
    map: baseTex,
    roughness: type === 'metal' ? 0.32 : type === 'stone' ? 0.58 : 0.70,
    metalness: type === 'metal' ? 0.78 : 0.06,
  });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(width, thickness, depth), baseMat);
  slab.position.y = thickness / 2;
  slab.castShadow = true;
  slab.receiveShadow = true;
  group.add(slab);

  // 木雕版两侧防翘端木穿带 (End-grain Battens) + 四周凸起版框界栏 (Frame Rules)
  if (type === 'wood') {
    const battenMat = new THREE.MeshStandardMaterial({ color: 0x5c3818, roughness: 0.65 });
    [-1, 1].forEach((side) => {
      const batten = new THREE.Mesh(new THREE.BoxGeometry(0.12, thickness * 1.04, depth * 1.03), battenMat);
      batten.position.set(side * (width / 2 + 0.05), thickness / 2, 0);
      group.add(batten);
    });
    const ruleMat = new THREE.MeshStandardMaterial({ color: 0x6e4422, roughness: 0.55 });
    const ruleH = Math.max(0.015, reliefHeight * 0.65);
    const fbRule = new THREE.BoxGeometry(width * 0.92, ruleH, 0.035);
    [-1, 1].forEach((s) => {
      const r = new THREE.Mesh(fbRule, ruleMat);
      r.position.set(0, thickness + ruleH / 2, s * depth * 0.44);
      group.add(r);
    });
  }

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
      roughness: 0.42,
      metalness: type === 'metal' ? 0.68 : 0.1,
    });
    const rMesh = new THREE.Mesh(
      new THREE.BoxGeometry(cellW * 0.82, Math.max(0.008, reliefHeight), Math.min(depth * 0.66, cellW * 0.92)),
      reliefMat
    );
    rMesh.position.set(gx, Math.max(0.004, reliefHeight / 2), 0);
    rMesh.castShadow = true;
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
      roughness: 0.22,
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
 * 2. 创建单枚 3D 活字字模（含字身、定位槽 Nick、字肩 Bevel Shoulder、底部脚槽 Foot Groove、凸起反字面）
 */
export function createMovableType3D(ch = '活', opts = {}) {
  const w = opts.w ?? opts.size ?? 0.38;
  const h = opts.h ?? opts.height ?? 0.54;
  const d = opts.d ?? opts.size ?? 0.38;
  const {
    mirror = true,
    materialType = opts.matType || 'clay',
  } = opts;

  const group = new THREE.Group();
  const colors = {
    clay: { body: 0x9e5a3c, rough: 0.72, metal: 0.06, faceBg: '#b86b48', faceFg: '#fcebd5' },
    wood: { body: 0x8f5b34, rough: 0.68, metal: 0.06, faceBg: '#a87042', faceFg: '#fff3dc' },
    bronze: { body: 0xc28d38, rough: 0.28, metal: 0.85, faceBg: '#d4a048', faceFg: '#fff9e6' },
    lead: { body: 0x8a95a5, rough: 0.24, metal: 0.88, faceBg: '#9aa6b8', faceFg: '#ffffff' },
  };
  const cfg = colors[materialType] || colors.clay;

  const bodyMat = new THREE.MeshStandardMaterial({
    color: cfg.body,
    roughness: cfg.rough,
    metalness: cfg.metal,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bodyMat);
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // 字身正面定位沟槽 (Nick)
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e242b, roughness: 0.8 });
  const nick = new THREE.Mesh(new THREE.BoxGeometry(w * 1.02, h * 0.11, d * 0.16), darkMat);
  nick.position.set(0, h * 0.42, d * 0.46);
  group.add(nick);

  // 字肩过渡台面 (Shoulder Bevel)
  const shoulder = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, h * 0.06, d * 0.94), bodyMat);
  shoulder.position.y = h + h * 0.03;
  group.add(shoulder);

  // 顶部凸起字面 (Raised Bevel Glyph Face)
  const faceTex = new THREE.CanvasTexture(glyphCanvas(ch, {
    bg: cfg.faceBg,
    fg: cfg.faceFg,
    mirror,
  }));
  const faceMat = new THREE.MeshStandardMaterial({
    map: faceTex,
    roughness: cfg.rough * 0.78,
    metalness: cfg.metal,
  });
  const headH = h * 0.16;
  const head = new THREE.Mesh(new THREE.BoxGeometry(w * 0.86, headH, d * 0.86), faceMat);
  head.position.y = h + h * 0.06 + headH / 2;
  head.castShadow = true;
  group.add(head);

  group.bodyMat = bodyMat;
  group.faceMat = faceMat;
  return group;
}

/**
 * 3. 创建可三维形变的纸张网格
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
    tg.strokeStyle = 'rgba(160, 120, 75, 0.42)';
    tg.lineWidth = 6;
    tg.strokeRect(18, 18, 476, 304);
    tg.lineWidth = 2;
    tg.strokeRect(26, 26, 460, 288);

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
    roughness: 0.80,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
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
 * 4. 创建 3D 工业滚筒 + 两侧传动齿轮法兰 + 轴承颈组件
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
    new THREE.CylinderGeometry(radius, radius, length, 44),
    new THREE.MeshStandardMaterial({ map: drumTex, roughness, metalness })
  );
  drum.rotation.z = Math.PI / 2;
  drum.castShadow = true;
  drum.receiveShadow = true;
  group.add(drum);

  // 两侧传动齿轮环 (End Flange Gear Rings)
  const gearMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.32, metalness: 0.85 });
  [-1, 1].forEach((side) => {
    const flange = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 1.05, radius * 1.05, 0.06, 24),
      gearMat
    );
    flange.rotation.z = Math.PI / 2;
    flange.position.x = side * (length / 2 - 0.02);
    group.add(flange);
  });

  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.24, radius * 0.24, length + 0.48, 24),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.25, metalness: 0.88 })
  );
  shaft.rotation.z = Math.PI / 2;
  group.add(shaft);

  return group;
}

/**
 * 钳制慢速主循环：fn(simDtSeconds, simNowSeconds)
 * - 默认将仿真推进速度放慢至原来的 0.36 倍，让每个动作、工具运动与材料变化都从容清晰；
 * - 暂停时 simDt = 0 且 simNow 冻结，但每帧依然调用 fn 以保持 3D 舞台 60fps 自由旋转缩放！
 */
export function makeLoop(fn) {
  let raf = 0, last = 0, on = false;
  let simNow = 0;
  function frame(now) {
    if (!on) return;
    raf = requestAnimationFrame(frame);
    const rawDt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    const simDt = PLAY_STATE.paused ? 0 : rawDt * 0.36 * PLAY_STATE.speed;
    simNow += simDt;
    try { fn(simDt, simNow); } catch (e) { console.error('[loop]', e); }
  }
  return {
    start() { if (on) return; on = true; last = performance.now(); raf = requestAnimationFrame(frame); },
    stop() { on = false; cancelAnimationFrame(raf); },
  };
}

/**
 * 慢速精讲补间：dur(ms)、fn(eased01, raw01)
 * - 自动将原短促时长放大 2.8 倍（单步最少 2.1 秒），支持中途暂停与实时倍速调节！
 */
export function tween(dur, fn, ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)) {
  const baseDur = Math.max(2100, dur * 2.8);
  const myToken = ACTIVE_TWEEN_TOKEN;
  return new Promise((res) => {
    let elapsed = 0;
    let last = performance.now();
    function step(now) {
      if (myToken !== ACTIVE_TWEEN_TOKEN) {
        res();
        return;
      }
      const dtMs = Math.min(50, Math.max(0, now - last));
      last = now;
      if (!PLAY_STATE.paused) {
        elapsed += dtMs * PLAY_STATE.speed;
      }
      const k = Math.min(1, elapsed / baseDur);
      try { fn(ease(k), k); } catch (e) { console.error('[tween]', e); }
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
 * 右上角科学微距原理剖面窗 (Macro Cross-Section Loupe Inset)
 * - 兼容 (mg, iw, ih) 3 参数相对坐标签名 与 (gg, x, y, w, h) 5 参数绝对坐标签名；
 * - 在大画幅 3D 视口右上角绘制半透明深色毛玻璃原理框，可通过控制栏「🔬 原理微视窗」一键显隐。
 */
export function drawMacroInset(g, x, y, w, h, title, drawContent) {
  if (!PLAY_STATE.showInset || !drawContent) return;
  const stageW = (CUR_STAGE && CUR_STAGE.w) || (x + w + 12);
  if (stageW < 520) return; // 极窄屏幕自动收起防遮挡

  const scale = 1.18;
  const boxW = Math.round(w * scale);
  const boxH = Math.round(h * scale) + 26;
  const boxX = stageW - boxW - 14;
  const boxY = 12;

  g.save();
  // 毛玻璃深色卡片底板
  g.fillStyle = 'rgba(11, 15, 25, 0.86)';
  roundRect(g, boxX, boxY, boxW, boxH, 11);
  g.fill();
  g.strokeStyle = 'rgba(245, 178, 76, 0.55)';
  g.lineWidth = 1.4;
  roundRect(g, boxX, boxY, boxW, boxH, 11);
  g.stroke();

  // 顶部标题栏
  g.fillStyle = 'rgba(245, 158, 11, 0.16)';
  roundRect(g, boxX + 1, boxY + 1, boxW - 2, 24, 10);
  g.fill();

  g.fillStyle = '#fde68a';
  g.font = '700 11.5px system-ui, sans-serif';
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.fillText(`🔬 ${title}`, boxX + 10, boxY + 13, boxW - 18);

  // 内容绘制区（自动适配 3 参数相对坐标与 5 参数绝对坐标两种回调签名）
  g.save();
  g.beginPath();
  roundRect(g, boxX + 2, boxY + 25, boxW - 4, boxH - 27, 8);
  g.clip();

  if (drawContent.length >= 4) {
    g.translate(boxX, boxY + 24);
    g.scale(scale, scale);
    drawContent(g, 0, 0, w, h);
  } else {
    g.translate(boxX, boxY + 26);
    g.scale(scale, scale);
    drawContent(g, w, h);
  }
  g.restore();
  g.restore();
}

let CUR_KIT = null;
export function stepsBar(parent, labels, onPick) {
  const wrap = document.createElement('div');
  wrap.className = 'steps';
  const btns = labels.map((lb, i) => {
    const b = document.createElement('button');
    b.type = 'button';
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
