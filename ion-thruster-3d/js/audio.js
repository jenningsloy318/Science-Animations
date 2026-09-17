/**
 * js/audio.js — Procedural Web Audio API Sound Synthesizer for Ion Thruster
 * Zero external audio files required. All sounds generated procedurally via oscillators and noise nodes.
 */

let ctx = null;
let isMuted = true; // start muted by default, user toggles or enables
let masterGain = null;

let ppuOsc = null;
let ppuGain = null;

let gasSource = null;
let gasGain = null;
let gasFilter = null;

let beamSource = null;
let beamGain = null;
let beamFilter = null;

function initAudioContext() {
  if (ctx) return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  ctx = new AudioCtx();

  masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(isMuted ? 0 : 0.45, ctx.currentTime);
  masterGain.connect(ctx.destination);

  // 1. PPU High-Voltage Inverter Resonant Hum (400 Hz sine + gentle harmonics)
  ppuOsc = ctx.createOscillator();
  ppuOsc.type = 'triangle';
  ppuOsc.frequency.setValueAtTime(420, ctx.currentTime);

  const ppuFilter = ctx.createBiquadFilter();
  ppuFilter.type = 'bandpass';
  ppuFilter.frequency.setValueAtTime(420, ctx.currentTime);
  ppuFilter.Q.setValueAtTime(3.5, ctx.currentTime);

  ppuGain = ctx.createGain();
  ppuGain.gain.setValueAtTime(0.08, ctx.currentTime);

  ppuOsc.connect(ppuFilter);
  ppuFilter.connect(ppuGain);
  ppuGain.connect(masterGain);
  ppuOsc.start();

  // 2. Procedural Noise Buffer (2 seconds looping white/pink noise)
  const bufferSize = ctx.sampleRate * 2;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    // Pink noise filter approximation
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    data[i] = (b0 + b1 + b2 + white * 0.5362) * 0.12;
  }

  // 3. Xenon Gas Injection Hiss
  gasSource = ctx.createBufferSource();
  gasSource.buffer = noiseBuffer;
  gasSource.loop = true;

  gasFilter = ctx.createBiquadFilter();
  gasFilter.type = 'bandpass';
  gasFilter.frequency.setValueAtTime(1800, ctx.currentTime);
  gasFilter.Q.setValueAtTime(1.8, ctx.currentTime);

  gasGain = ctx.createGain();
  gasGain.gain.setValueAtTime(0.04, ctx.currentTime);

  gasSource.connect(gasFilter);
  gasFilter.connect(gasGain);
  gasGain.connect(masterGain);
  gasSource.start();

  // 4. Ethereal Ion Beam Whisper
  beamSource = ctx.createBufferSource();
  beamSource.buffer = noiseBuffer;
  beamSource.loop = true;

  beamFilter = ctx.createBiquadFilter();
  beamFilter.type = 'lowpass';
  beamFilter.frequency.setValueAtTime(650, ctx.currentTime);

  beamGain = ctx.createGain();
  beamGain.gain.setValueAtTime(0.06, ctx.currentTime);

  beamSource.connect(beamFilter);
  beamFilter.connect(beamGain);
  beamGain.connect(masterGain);
  beamSource.start();
}

/**
 * Updates telemetry-driven audio parameters (voltage hum, gas flow hiss, beam whisper).
 */
export function updateAudio(voltage, flow, isRunning) {
  if (!ctx) return;
  if (ctx.state === 'suspended') return;

  const now = ctx.currentTime;
  const runningMult = isRunning ? 1.0 : 0.0;

  // PPU frequency scales from ~320 Hz at 800V to ~600 Hz at 2500V
  if (ppuOsc && ppuGain) {
    const freq = 300 + (voltage / 2500) * 320;
    ppuOsc.frequency.setTargetAtTime(freq, now, 0.1);
    ppuGain.gain.setTargetAtTime(0.06 * runningMult, now, 0.1);
  }

  // Gas hiss scales with mass flow slider
  if (gasGain && gasFilter) {
    const targetGasGain = (0.015 + (flow / 8) * 0.05) * runningMult;
    gasGain.gain.setTargetAtTime(targetGasGain, now, 0.1);
    gasFilter.frequency.setTargetAtTime(1200 + (flow / 8) * 1200, now, 0.1);
  }

  // Beam whisper scales with beam velocity / power
  if (beamGain) {
    const targetBeamGain = (0.02 + (voltage / 2500) * 0.07) * runningMult;
    beamGain.gain.setTargetAtTime(targetBeamGain, now, 0.1);
  }
}

/**
 * Toggles audio mute state.
 * @returns {boolean} New mute state (true = muted, false = unmuted)
 */
export function toggleMute() {
  if (!ctx) initAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume();
  }

  isMuted = !isMuted;
  if (masterGain && ctx) {
    masterGain.gain.setTargetAtTime(isMuted ? 0 : 0.45, ctx.currentTime, 0.05);
  }
  return isMuted;
}

export function isAudioMuted() {
  return isMuted;
}

/**
 * Plays a quick UI tactile click sound.
 */
export function playClickSound() {
  if (isMuted || !ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.045);
  } catch (_) {}
}

/**
 * Plays a soft electron-spark ionization chirp.
 */
export function playIonizeSound() {
  if (isMuted || !ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(2400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.085);
  } catch (_) {}
}
