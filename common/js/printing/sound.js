// common/js/printing/sound.js — 轻量合成音效（spec 10 D10/G24）
// 8 个音色全部 WebAudio 程序化合成，零音频文件。静音态持久化 printing_sound（默认开）。
// AudioContext 遵守浏览器自动播放策略：首次手势调用 play() 时才创建/恢复。
'use strict';

const MUTE_KEY = 'printing_sound';

let ctx = null;
let muted = false;
try { muted = (typeof localStorage !== 'undefined') && localStorage.getItem(MUTE_KEY) === 'off'; } catch (e) { /* no storage */ }

function ac() {
  if (typeof window === 'undefined') return null; // Node 测试安全
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
  }
  if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) { /* ignore */ } }
  return ctx;
}

function noiseBuffer(c, seconds) {
  const len = Math.max(1, Math.floor(c.sampleRate * seconds));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function env(c, node, t0, attack, hold, release, peak = 0.08) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + attack);
  g.gain.setValueAtTime(peak, t0 + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + hold + release);
  node.connect(g).connect(c.destination);
  return g;
}

const SOUNDS = {
  // 浇铅嘶响：噪声 + 低通下扫
  pour(c) {
    const t = c.currentTime;
    const src = c.createBufferSource(); src.buffer = noiseBuffer(c, 0.6);
    const f = c.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(1400, t); f.frequency.exponentialRampToValueAtTime(260, t + 0.55);
    src.connect(f); env(c, f, t, 0.02, 0.25, 0.35, 0.06);
    src.start(t); src.stop(t + 0.65);
  },
  // 压机落印：低频坠 + 微噪点击
  thud(c) {
    const t = c.currentTime;
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.14);
    env(c, o, t, 0.005, 0.03, 0.16, 0.12);
    o.start(t); o.stop(t + 0.22);
  },
  // 翻纸：高通短噪声拂
  paper(c) {
    const t = c.currentTime;
    const src = c.createBufferSource(); src.buffer = noiseBuffer(c, 0.14);
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3200; f.Q.value = 0.8;
    src.connect(f); env(c, f, t, 0.01, 0.04, 0.1, 0.035);
    src.start(t); src.stop(t + 0.16);
  },
  // 转轮棘轮：木质 click 序列
  ratchet(c) {
    const t = c.currentTime;
    for (let i = 0; i < 5; i++) {
      const o = c.createOscillator(); o.type = 'square'; o.frequency.value = 1900 + i * 60;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t + i * 0.045);
      g.gain.linearRampToValueAtTime(0.03, t + i * 0.045 + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.045 + 0.03);
      o.connect(g).connect(c.destination);
      o.start(t + i * 0.045); o.stop(t + i * 0.045 + 0.04);
    }
  },
  // 激光扫描：安静扫频
  laser(c) {
    const t = c.currentTime;
    const o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(420, t);
    o.frequency.linearRampToValueAtTime(2400, t + 0.16);
    o.frequency.linearRampToValueAtTime(420, t + 0.34);
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 3200;
    o.connect(f); env(c, f, t, 0.02, 0.26, 0.08, 0.018);
    o.start(t); o.stop(t + 0.38);
  },
  // 网点显影：软 pop
  pop(c) {
    const t = c.currentTime;
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(620, t); o.frequency.exponentialRampToValueAtTime(210, t + 0.07);
    env(c, o, t, 0.004, 0.02, 0.06, 0.05);
    o.start(t); o.stop(t + 0.1);
  },
  // EUV 深脉冲
  euv(c) {
    const t = c.currentTime;
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = 58;
    const lfo = c.createOscillator(); lfo.frequency.value = 13;
    const lg = c.createGain(); lg.gain.value = 26;
    lfo.connect(lg).connect(o.frequency);
    env(c, o, t, 0.03, 0.22, 0.18, 0.09);
    o.start(t); lfo.start(t); o.stop(t + 0.46); lfo.stop(t + 0.46);
  },
  // UI 滴答
  tick(c) {
    const t = c.currentTime;
    const o = c.createOscillator(); o.type = 'square'; o.frequency.value = 2100;
    env(c, o, t, 0.001, 0.004, 0.014, 0.02);
    o.start(t); o.stop(t + 0.025);
  },
};

export const SOUND_NAMES = Object.freeze(Object.keys(SOUNDS));

/** 播放一个音色；静音/未解锁时安全跳过 */
export function play(name) {
  if (muted) return false;
  const c = ac();
  if (!c || typeof SOUNDS[name] !== 'function') return false;
  try { SOUNDS[name](c); return true; } catch (e) { return false; }
}

export function isMuted() { return muted; }
export function setMuted(m) {
  muted = !!m;
  try { localStorage.setItem(MUTE_KEY, muted ? 'off' : 'on'); } catch (e) { /* no storage */ }
  return muted;
}
export function toggleMute() { return setMuted(!muted); }
export function MUTE_KEY_NAME() { return MUTE_KEY; }
