/**
 * audio.js - Web Audio API 程序化航天音效合成器
 * 纯数学波形合成，零外部音频文件加载
 */

let audioCtx = null;
let masterGain = null;
let isMuted = true;

function initAudio() {
  if (audioCtx) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  audioCtx = new AudioContext();
  masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(isMuted ? 0 : 0.4, audioCtx.currentTime);
  masterGain.connect(audioCtx.destination);
}

export function toggleAudio(muted) {
  if (muted !== undefined) isMuted = muted;
  else isMuted = !isMuted;

  if (!audioCtx && !isMuted) initAudio();
  if (audioCtx && masterGain) {
    if (audioCtx.state === 'suspended' && !isMuted) {
      audioCtx.resume();
    }
    masterGain.gain.setTargetAtTime(isMuted ? 0 : 0.35, audioCtx.currentTime, 0.05);
  }
  return !isMuted;
}

export function isAudioActive() {
  return !isMuted && audioCtx && audioCtx.state === 'running';
}

/**
 * 姿态控制喷气微推力音效 (白噪声脉冲)
 */
export function playThrusterBurst() {
  if (!isAudioActive()) return;
  try {
    const bufferSize = audioCtx.sampleRate * 0.15;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 2.0;

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    noise.start();
  } catch (e) {}
}

/**
 * 近拱点飞掠 (Closest Approach / Periapsis) 穿透和弦鸣音
 */
export function playPeriapsisChime() {
  if (!isAudioActive()) return;
  try {
    const t = audioCtx.currentTime;
    const freqs = [440, 554.37, 659.25, 880]; // A Major 7 纯净和弦
    freqs.forEach((f, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 1.05, t + 0.6);

      gain.gain.setValueAtTime(0.08 / (idx + 1), t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8 + idx * 0.1);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t + idx * 0.04);
      osc.stop(t + 1.2);
    });
  } catch (e) {}
}

/**
 * 速度增益跃升脉冲音 (Speed Boost Swell)
 */
export function playSpeedBoostTone(gainKms) {
  if (!isAudioActive()) return;
  try {
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = gainKms >= 0 ? 'triangle' : 'sawtooth';
    const baseFreq = gainKms >= 0 ? 220 : 380;
    const targetFreq = gainKms >= 0 ? baseFreq + Math.min(gainKms * 30, 400) : baseFreq - 150;

    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(targetFreq, t + 0.4);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.5);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.55);
  } catch (e) {}
}
