// main.js — 引导：渲染器 / 相机 / 页签状态机 / 拍时钟 / 键盘（§5.2）
'use strict';

window.APP = window.APP || {};

const BEAT_DUR = [6, 14, 20];        // §3：提问 6s / 方法 14s / 你来玩 20s
const TAB_IDS = ['t1','t2','t3','t4','t5','t6','t7','t8'];

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gl');
  const labelLayer = document.getElementById('labelLayer');

  // ── 渲染器（r158 兼容，复用 collider）────────────────────────────
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
  if ('useLegacyLights' in renderer) renderer.useLegacyLights = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070a);
  scene.fog = new THREE.Fog(0x05070a, 40, 140);

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 600);

  // 共享材质
  const MATS = APP.MATS.build(renderer);

  // ── 上下文：所有页签模块拿到的同一套东西 ─────────────────────────
  const ctx = {
    renderer, scene, camera, MATS, labelLayer,
    F: APP.F, D: APP.DATA.D, U: APP.U,
    PIPE: APP.PIPE, UI: APP.UI,
    // 每页签独立 OrbitLite，切走保存切回恢复
    orbits: {}, orbit: null,
    // 当前页签的流水线实例
    pipe: null
  };
  ctx.orbitFor = function (id) {
    if (!this.orbits[id]) {
      const o = new APP.U.OrbitLite(camera, canvas);
      this.orbits[id] = o;
    }
    return this.orbits[id];
  };

  // ── 应用状态 ──────────────────────────────────────────────────────
  const app = {
    tab: 't2', beat: 1, auto: true, beatT: 0,
    frozen: false,
    setTab(id, opts) {
      if (!APP.Tabs || !APP.Tabs[APP.DATA.TABS.find(t => t.id === id).key]) return;
      if (fading) { pendingTab = id; return; }   // 正在淡入：排队，稍后重放
      const prev = this.tab;
      fade(() => {
        // dispose 旧页签
        const pk = APP.DATA.TABS.find(t => t.id === prev);
        if (pk && APP.Tabs[pk.key]) { APP.Tabs[pk.key].dispose(); }
        // 清旧标签
        APP.U.LabelSys.clear(ctx);
        // 清旧流水线/滑块（各页签 onEnter 重建）
        const pBox = document.getElementById('pipelineBox');
        if (pBox) pBox.innerHTML = '';
        // 讲解面板复位
        APP.UI.setPanel('');
        // 清场景中残留（灯光/辅助由各页签自管）
        const key = APP.DATA.TABS.find(t => t.id === id).key;
        const mod = APP.Tabs[key];
        ctx.orbit = ctx.orbitFor(id);
        mod.build(ctx);
        mod.reset && mod.reset();
        this.tab = id;
        this.beat = (opts && opts.beat) || 1;
        this.beatT = 0;
        APP.UI.setActive(id);
        APP.UI.setBeat(this.beat, this.auto);
        APP.UI.markPlayed(id);
        // 语言条
        const meta = APP.DATA.TABS.find(t => t.id === id);
        APP.UI.setLang(meta.observ);
        // 页签模块可声明 onEnter 重建流水线/面板
        if (mod.onEnter) mod.onEnter(ctx);
        // 通用「🧮 推导链」卡：把本仪器的读数接进六个推理模式（书 006 第 9 章）
        if (window.APP.Derive) APP.Derive.mount(id);
      });
    },
    setBeat(b) { this.beat = b; this.beatT = 0; APP.UI.setBeat(b, this.auto); },
    nextBeat() { this.setBeat(this.beat >= 3 ? 3 : this.beat + 1); },
    togglePlay() {
      this.auto = !this.auto;
      this.beatT = 0;
      APP.UI.setBeat(this.beat, this.auto);
      APP.UI.toast(this.auto ? '自动播放' : '已暂停');
    },
    probe(name) {
      const key = APP.DATA.TABS.find(t => t.id === this.tab).key;
      const mod = APP.Tabs[key];
      return mod && mod.probe ? mod.probe(name) : null;
    },
    // 调试/验收用：当前相机的轨道状态（az/pol/dist）
    orbitState() {
      const o = ctx.orbit;
      return o ? { az: +o.az.toFixed(3), pol: +o.pol.toFixed(3), dist: +o.dist.toFixed(3) } : null;
    }
  };
  APP.app = app;

  // 淡出/淡入遮罩
  const fader = document.getElementById('fader');
  let fading = false, pendingTab = null;
  function fade(fn) {
    if (fading) return; fading = true;
    fader.classList.add('on');
    setTimeout(() => {
      try { fn(); } catch (e) { console.error(e); }
      setTimeout(() => {
        fader.classList.remove('on'); fading = false;
        // 丢弃的切换请求在淡入后补上，避免快速点击被静默吞掉
        if (pendingTab) { const t = pendingTab; pendingTab = null; app.setTab(t); }
      }, 60);
    }, 180);
  }

  // ── 键盘（§4.1）──────────────────────────────────────────────────
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const k = e.key;
    if (k === 'ArrowRight') { const i = TAB_IDS.indexOf(app.tab); app.setTab(TAB_IDS[(i + 1) % 8]); }
    else if (k === 'ArrowLeft') { const i = TAB_IDS.indexOf(app.tab); app.setTab(TAB_IDS[(i + 7) % 8]); }
    else if (k === 'ArrowUp') { app.setBeat(Math.max(1, app.beat - 1)); }
    else if (k === 'ArrowDown') { app.nextBeat(); }
    else if (k === ' ') { e.preventDefault(); app.togglePlay(); }
    else if (k >= '1' && k <= '8') { app.setTab(TAB_IDS[+k - 1]); }
    else if (k === 'r' || k === 'R') { if (ctx.orbit) ctx.orbit.reset(); }
    else if (k === 'h' || k === 'H') { APP.UI.toggleHelp(); }
  });

  document.getElementById('helpBtn').addEventListener('click', () => APP.UI.toggleHelp());
  document.getElementById('helpClose').addEventListener('click', () => APP.UI.toggleHelp(false));
  document.getElementById('beatPlay').addEventListener('click', () => app.togglePlay());
  document.getElementById('beatNext').addEventListener('click', () => app.nextBeat());
  document.getElementById('beatReset').addEventListener('click', () => app.setBeat(1));
  document.getElementById('camReset').addEventListener('click', () => { if (ctx.orbit) ctx.orbit.reset(); });

  // ── 拾取：点击 3D 对象（区分点击与拖拽旋转）──────────────────────
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let downPos = null, downT = 0;
  canvas.addEventListener('pointerdown', e => {
    downPos = { x: e.clientX, y: e.clientY }; downT = performance.now();
  });
  canvas.addEventListener('pointerup', e => {
    if (!downPos) return;
    const dx = e.clientX - downPos.x, dy = e.clientY - downPos.y;
    const moved = Math.hypot(dx, dy);
    const dtMs = performance.now() - downT;
    downPos = null;
    if (moved > 6 || dtMs > 600) return;                 // 拖拽/长按 → 交给轨道控制
    const r = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(scene.children, true);
    for (const h of hits) {
      let o = h.object;
      while (o && !o.userData.select && o.parent) o = o.parent;
      if (o && o.userData.select) {
        const key = APP.DATA.TABS.find(t => t.id === app.tab).key;
        const mod = APP.Tabs[key];
        if (mod && mod.onPick) { mod.onPick(o.userData.select); return; }
      }
    }
  });

  // ── 拍时钟 ────────────────────────────────────────────────────────
  function tickBeats(dt) {
    if (!app.auto || app.beat >= 3) return;      // 拍③ 手动模式无限循环
    app.beatT += dt;
    if (app.beatT >= BEAT_DUR[app.beat - 1]) { app.nextBeat(); }
  }

  // ── FPS 表（0.5s 采样）────────────────────────────────────────────
  let fpsT = 0, fpsN = 0;
  function tickFps(dt) {
    fpsT += dt; fpsN++;
    if (fpsT >= 0.5) {
      const fpsEl = document.getElementById('fps');
      if (fpsEl) fpsEl.textContent = Math.round(fpsN / fpsT) + ' fps';
      fpsT = 0; fpsN = 0;
    }
  }

  // ── 主循环 ────────────────────────────────────────────────────────
  let last = performance.now() / 1000;
  function loop() {
    requestAnimationFrame(loop);
    const now = performance.now() / 1000;
    let dt = Math.min(0.05, now - last);        // dt clamp，后台标签防慢放
    last = now;
    if (app.frozen) { renderer.render(scene, camera); return; }

    tickBeats(dt); tickFps(dt);
    APP.U.Tweens.update(dt);

    const key = APP.DATA.TABS.find(t => t.id === app.tab).key;
    const mod = APP.Tabs[key];
    if (mod) mod.update(dt, true);
    if (ctx.orbit) ctx.orbit.apply();
    APP.U.LabelSys.update(ctx);

    renderer.render(scene, camera);
  }

  // ── resize ────────────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  // ── 启动：UI 初始化后进 T2（方程密度最高的页签）──────────────────
  APP.UI.init(document);
  APP.UI.buildBeats();
  APP.UI.setActive(app.tab);
  APP.UI.setBeat(1, true);
  app.setTab('t2');
  loop();
});
