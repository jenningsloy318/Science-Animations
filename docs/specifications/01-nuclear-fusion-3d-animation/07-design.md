# Design: UI/UX Architecture — 核聚变 3D 交互动画 (Nuclear Fusion 3D Animation, nuclear-fusion-3d/)

- **Date**: 2026-08-27
- **Generated**: 2026-08-27T13:59:08.932+08:00
- **Designer**: super-dev:ui-ux-designer

---

## Summary

A self-contained nuclear-fusion-3d/ page (index.html + css/ + js/) teaches kids 核聚变 via three.js r160 (pinned jsdelivr import map, identical to ion-thruster-3d). The scene is driven by a closed phase state machine — atoms (原子结构: deuterium 1p+1n + orbiting electron beside tritium 1p+2n + electron) → plasma (加热→等离子体: electrons stripped into a ≤2,000-particle THREE.Points cloud, nuclei fast/random) → fusion (聚变反应: D–T collision against Coulomb repulsion → ⁴He 2p+2n + ejected 14.1 MeV neutron + expanding AdditiveBlending energy flash). Phase state is programmatically observable (window.__fusionPhase + #stage[data-phase]). Pause uses a simTime accumulator (clock.getDelta() every frame, accumulate only when unpaused — never toggle THREE.Clock.running); 🔄 重置 restarts from the plasma phase WITHOUT touching tour state, and free-explore auto-repeats after the flash fades. A 🎬 引导浏览 tour of ≥5 data-driven steps (tourPrev/tourNext/tourExit ids per ion-thruster-3d) maps each narration step onto the phase machine with highlight pulsing. HUD shows the verified D–T numbers (17.6 MeV = 中子 14.1 + α 3.5; Δm 0.018884 u ≈ 0.0189 u; ≈2.82e-12 J) with the E=mc² chain. Data flow: UI events (ctrl-btns/tour) → phase machine → scene builders (atoms/plasma/fusion) → shared rAF render loop → canvas; PHYS constants feed both the stats bar and tour narration text. WebGL2 unavailable ⇒ Chinese fallback message via three/addons/capabilities/WebGL.js detection. Root index.html gains one card--fusion card. Zero console warnings, zero build step, no other third-party calls.

## Modules

### page-shell · nuclear-fusion-3d/index.html

index.html (zh-CN): #homeBtn back-link (title="返回首页 Back to home"), <div id="stage"> canvas host, #tools nav (btnTour 🎬 title="引导浏览（分步讲解）", btnExplore 🖱️ 自由探索, btnLabels 🏷️ 图例), #bottomBar (#stats physics bar: 17.6 MeV · 中子 14.1 / α 3.5 MeV · 质量亏损 ≈0.0189 u → ≈2.82e-12 J; ctrl-btns toggleBtn ⏸ 暂停/▶ 继续, resetBtn 🔄 重置, camBtn 🎥 重置视角), legend chips 质子(红·核尺度)/中子(灰蓝·核尺度)/电子(微小·亮), #tourPanel (tourTitle/tourText/tourPrev ← 上一步/tourDots/tourNext 下一步 →/tourExit 退出), #hint, #loading, WebGL2-fallback Chinese message div, and the pinned import map: "three" → https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js, "three/addons/" → .../examples/jsm/ + es-module-shims@1.10.0 async (byte-identical to ion-thruster-3d).
### root-card · index.html (site root, one-card edit)

Adds <a class="card card--fusion" href="nuclear-fusion-3d/" id="link-nuclear-fusion-3d"> with bilingual title "Nuclear Fusion 核聚变", ☀️/⚛️ emoji icon, one-line English description of the D→T fusion journey, and <span class="card__arrow">Open →</span>; adds the .card--fusion accent rules (::before radial glow + .card__icon background) in the inline card CSS alongside .card--ion3d/.card--atom, matching the existing 6-card grid pattern.
### styles · css/style.css

Site dark-space theme (#04060d, Outfit + PingFang SC): fixed-overlay #homeBtn/#tools/#bottomBar/#tourPanel/#legend, .ctrl-btn/.tool-btn pill styles with :hover/:active/:focus-visible rings (≥44px touch targets), tour panel slide-up with .open class, legend chips with color-blind-safe dot+size cues, stats-bar monospace numbers, responsive stacking at ≤768px tablet width, #webgl-fallback message styling, user-select:none, #stage{cursor:grab}.
### bootstrap & renderer · main.js §1

Import WebGL from 'three/addons/capabilities/WebGL.js'; if !isWebGL2Available() render the custom Chinese fallback (#webgl-fallback: '你的浏览器不支持 WebGL2，无法显示 3D 核聚变动画…') and abort — never appendChild the English built-in message. Else: WebGLRenderer({antialias:true, pixelRatio:min(devicePixelRatio,2)}) with NO legacy writes (no useLegacyLights/outputEncoding/texture.encoding) so r160 loads with zero console warnings; scene, PerspectiveCamera(fov 50, pos (0,2.4,7.5)), OrbitControls (enableDamping, always-on so drag/wheel/pinch never breaks the animation), resize listener, single rAF loop controls.update→renderer.render, first-frame #loading fade, window.__ready=true. Optional additive glow sprite texture sets colorSpace=SRGBColorSpace only.
### physics data · main.js §2 (PHYS)

The single source of physics truth, mirrored 1:1 into the #stats bar and tour narration: M_D=2.014102 u, M_T=3.016049 u, M_He4=4.002602 u, M_n=1.008665 u, Δm=0.018884 u (displayed ≈0.0189 u), 931.494 MeV/u, E_total=17.6 MeV (≈17.59), E_n=14.1 MeV, E_alpha=3.5 MeV, 1.602e-13 J/MeV, E_J≈2.82e-12 J, plus the E=mc² 质能方程 explanation string. Guarantees the required literals '17.6', '0.0189', 'mc' appear and the forbidden literals '0.0256' / '3.2e-11' never do. All narration strings reference PHYS fields, never duplicated raw numbers.
### phase state machine · main.js §3

Closed phase set PHASES = {atoms, plasma, fusion} with durations atoms 0–6 s, plasma 6–16 s, fusion 16–22 s (flash fades by 24.5 s). Observability contract: window.__fusionPhase always equals the current key AND #stage carries data-phase="atoms|plasma|fusion" for deterministic checks (AC-04). Pause via simTime accumulator (clock.getDelta() every frame; accumulate only when !paused) — never toggling THREE.Clock.running (post-resume delta jump trap). resetToPlasma(): disposes and rebuilds the plasma scene, rewinds simTime to 6 s, and never touches tourIdx/tourPanel (AC-08). Free-explore auto-repeat: after flash fade, schedule loop back to plasma.
### particle system · main.js §4

Atoms phase: deuterium nucleus (1 red proton sphere + 1 gray-blue neutron, close-packed) with 1 tiny bright electron on an inclined circular orbit; tritium nucleus (1 proton + 2 neutrons) with its own orbiting electron; orbit rings faintly drawn; both atoms labeled 氘 D / 氚 T. Plasma phase: electrons stripped — fly as free points in ONE THREE.Points + BufferGeometry (≤2,000 particles, typed-array position writes, single draw call, 60 fps) while D/T nuclei (a few Mesh sphere clusters) move fast with random-walk jitter; color ramp from cool to hot. Every rebuild (phase change or reset) calls geometry/material .dispose() to avoid GPU leaks under the infinite auto-repeat loop.
### fusion event · main.js §5

Scripted hero event: one D and one T nucleus decelerate toward each other against a visualized electrostatic repulsion (repulsion halo / field-line sprites that compress as r shrinks, force ~ k/r² scaled for legibility), touch, and merge into a ⁴He nucleus (2 protons + 2 neutrons in a tetrahedral cluster) while one gray neutron is ejected fast along the exit vector with a 中子 14.1 MeV energy tag; an expanding Sprite (SpriteMaterial{blending:AdditiveBlending, transparent, depthWrite:false}) flashes and fades, with an E=mc² overlay chip (质量亏损 0.018884 u → 17.6 MeV → 2.82e-12 J) appearing at flash peak. This module ends by emitting the fusion-complete → auto-repeat transition in free mode.
### guided tour · main.js §6

TOUR = data array of ≥5 steps (ids atoms-structure / heating-plasma / coulomb-barrier / fusion-helium4-neutron / emc2-mass-to-energy), each {key, phase, title, text(中文解说), hl[highlights]}; step→phase mapping drives the same phase machine (e.g. entering coulomb-barrier forces phase=fusion and pulses the repulsion halo; emc2 step freezes at flash peak and highlights the PHYS chip). Navigation exactly per ion-thruster-3d: btnTour toggles, tourPrev/tourNext clamp at ends, tourDots reflect position, tourExit/Esc closes and returns to free-explore. Tour state is fully independent of resetBtn — reset restarts visuals only, narration panel and current step untouched (AC-08).
### controls & HUD · main.js §7

toggleBtn flips paused (label ⏸ 暂停 ↔ ▶ 继续; freezes particle motion + phase clock together); resetBtn → resetToPlasma(); camBtn restores default camera position/target; keyboard: Space pause, Esc exit tour; hint strip (拖拽旋转 · 滚轮缩放 · 空格暂停 · Esc 退出); all buttons title-tooltipped and keyboard-focusable with visible :focus-visible rings.

## Numeric Constants

- **Has numeric constants requiring validation**: Yes — two classes. (A) VERIFIED PHYSICS (frozen PHYS object, displayed verbatim per AC-06): nuclear masses 2.014102 u (²H), 3.016049 u (³H), 4.002602 u (⁴He), 1.008665 u (n); mass defect 0.018884 u shown rounded as ≈0.0189 u; conversion 931.494 MeV/u; reaction energy 17.6 MeV (≈17.59); split 中子 14.1 MeV / α 3.5 MeV; 1.602e-13 J/MeV; released energy ≈2.82e-12 J (≈2.8×10⁻¹² J); consistency chain 0.018884×931.494≈17.59≈17.6 MeV and 17.6×1.602e-13≈2.82e-12 J; REQUIRED literals 17.6, 0.0189, mc; FORBIDDEN literals 0.0256, 3.2e-11. (B) ENGINE/ANIMATION: plasma particle cap 2000; renderer pixelRatio min(devicePixelRatio,2); ≥60 fps target; phase timeline atoms 0–6 s, plasma 6–16 s, fusion 16–22 s, flash fade by 24.5 s, auto-repeat after 25 s; camera fov 50°, position (0, 2.4, 7.5) for camBtn restore; electron orbit radius 0.75; proton radius 0.22, neutron 0.22, electron 0.07; Coulomb visualization force ~ k/r² with k=1.8 (display scaling only).

## Contract Claims

Each paired generate/validate contract below ships its enumerated closure — derived from the cited source, not hand-written. A deterministic checker verifies pattern-vs-enumeration closure and anchor existence.

### fusion-phase-keys

- **Pattern**: `^(atoms|plasma|fusion)$`
- **Derivation rule**: AC-04 enumerates exactly three sequential phases — 原子结构, 加热→等离子体, 聚变反应 — each mapped 1:1 to a machine key; main.js exposes the current key simultaneously as window.__fusionPhase and as #stage[data-phase], and the validator asserts every emitted value lies in this closed set.
- **Source anchor**: `docs/specifications/01-nuclear-fusion-3d-animation/01-requirements.md`
- **Uniqueness**: the enumeration is duplicate-free
- **Enumerated closure (3 value)**:

  - `atoms`
  - `plasma`
  - `fusion`
### tour-step-keys

- **Pattern**: `^[a-z][a-z0-9-]{2,30}$`
- **Derivation rule**: One kebab-case key per AC-05 mandatory topic, in order: 原子结构（质子/中子/电子）→ atoms-structure, 加热变成等离子体 → heating-plasma, 克服库仑斥力（原子核相互排斥）→ coulomb-barrier, 聚变反应生成氦-4 和中子 → fusion-helium4-neutron, E=mc² 质量变成能量 → emc2-mass-to-energy; the TOUR array in js/main.js produces these keys (AC-05 allows 'at least 5', extras optional) and the validator asserts all five are present.
- **Source anchor**: `docs/specifications/01-nuclear-fusion-3d-animation/01-requirements.md`
- **Uniqueness**: the enumeration is duplicate-free
- **Enumerated closure (5 value)**:

  - `atoms-structure`
  - `heating-plasma`
  - `coulomb-barrier`
  - `fusion-helium4-neutron`
  - `emc2-mass-to-energy`
### ctrl-dom-id-set

- **Pattern**: `^(homeBtn|stage|btnTour|toggleBtn|resetBtn|camBtn|tourPrev|tourNext|tourExit|tourPanel|tourTitle|tourText|tourDots)$`
- **Derivation rule**: Ids present in the canonical ion-thruster-3d/index.html that AC-01/AC-05/AC-07 explicitly re-require for the fusion page: AC-01 names homeBtn + stage; AC-05 names tourPrev/tourNext/tourExit and the 🎬 引导浏览 button (btnTour, same id family as the reference page); AC-07 names the three ctrl-btn controls (toggleBtn/resetBtn/camBtn per the reference markup); tourPanel/tourTitle/tourText/tourDots are the remaining members of the same tour-panel block in the reference page. All are produced by nuclear-fusion-3d/index.html and validated by deterministic DOM checks.
- **Source anchor**: `ion-thruster-3d/index.html`
- **Uniqueness**: the enumeration is duplicate-free
- **Enumerated closure (13 value)**:

  - `homeBtn`
  - `stage`
  - `btnTour`
  - `toggleBtn`
  - `resetBtn`
  - `camBtn`
  - `tourPrev`
  - `tourNext`
  - `tourExit`
  - `tourPanel`
  - `tourTitle`
  - `tourText`
  - `tourDots`
### card-accent-class-allowlist

- **Pattern**: `^card--[a-z0-9]+$`
- **Derivation rule**: grep class="card card-- in root index.html yields exactly six existing accent classes (lines 190–225: slingshot, car, ion, ion3d, atom, solar); AC-02 adds exactly one new member card--fusion (with matching .card--fusion::before and .card--fusion .card__icon rules); the validator checks every .card element in root index.html carries a class from this closed set and that card--fusion occurs exactly once.
- **Source anchor**: `index.html`
- **Uniqueness**: the enumeration is duplicate-free
- **Enumerated closure (7 value)**:

  - `card--slingshot`
  - `card--car`
  - `card--ion`
  - `card--ion3d`
  - `card--atom`
  - `card--solar`
  - `card--fusion`
### dt-fusion-required-literals

- **Pattern**: `^(17\.6|0\.0189|mc)$`
- **Derivation rule**: AC-06's deterministic check names the three literal strings the delivered page source must contain: '17.6' (reaction energy MeV, emitted by the PHYS block / stats bar / narration), '0.0189' (displayed rounded mass defect u), 'mc' (from the E=mc² explanation); produced by nuclear-fusion-3d/ sources, validated by substring scan.
- **Source anchor**: `docs/specifications/01-nuclear-fusion-3d-animation/01-requirements.md`
- **Uniqueness**: the enumeration is duplicate-free
- **Enumerated closure (3 value)**:

  - `17.6`
  - `0.0189`
  - `mc`
### dt-fusion-forbidden-literals

- **Pattern**: `^(0\.0256|3\.2e-11)$`
- **Derivation rule**: AC-06 names the two incorrect literals that must NOT occur anywhere in the delivered sources (wrong mass defect 0.0256 u; fission-value energy 3.2e-11 J); the validator asserts zero substring occurrences in nuclear-fusion-3d/index.html, css/style.css and js/main.js.
- **Source anchor**: `docs/specifications/01-nuclear-fusion-3d-animation/01-requirements.md`
- **Uniqueness**: the enumeration is duplicate-free
- **Enumerated closure (2 value)**:

  - `0.0256`
  - `3.2e-11`

## Alternatives Considered

- **JS file layout for the new page**: chose single-file js/main.js with clearly bounded internal sections (§1–§7), matching the ion-thruster-3d convention — AC-01 mandates 'the established page layout (as in ion-thruster-3d/ and atomic-model/)' and the code assessment confirms every 3D page uses one js/main.js ES module with module-scope init; one file keeps deterministic greps (AC-05/06 literals, ids) trivial and adds zero import-map surface. Multi-file is defensible for reviewability but breaks the strongest consistency signal in the repo. (alternatives rejected: multi-file js/ (main.js + phaseMachine.js + tour.js + particles.js as native ESM imports via the same import map))- **Pause/resume mechanism (AC-07/AC-08)**: chose custom simTime accumulator — call clock.getDelta() every frame, accumulate and advance particles/phases only when !paused — Research-verified three.js trap: toggling Clock.running makes getDelta() return a huge jump after resume (stale oldTime) and clock.start() resets elapsedTime — both break 'resume continues exactly from the frozen phase'. The accumulator freezes particle motion and the phase clock together with no jump and makes 重置 a trivial simTime rewind. (alternatives rejected: toggle THREE.Clock.running on pause; rebuild a new Clock on resume)- **Nuclear mass precision displayed on the page (AC-06)**: chose rounded textbook mass set (2.014102/3.016049/4.002602/1.008665 u → 0.018884 u ≈ 0.0189 u) — Full-precision AME2020 values give 0.018883 u, which breaks the exact on-page arithmetic chain and the deterministic literal '0.0189' required by AC-06; the rounded set is simultaneously physically correct (verified vs Wikipedia/HyperPhysics/NIST) and internally consistent: 0.018884 u × 931.494 ≈ 17.59 ≈ 17.6 MeV → ≈2.82e-12 J. (alternatives rejected: full-precision AME2020 set (2.01410178/3.01604928/4.00260325/1.00866492 → 0.018883 u))- **Reset semantics for 🔄 重置 (AC-08)**: chose 🔄 重置 restarts the 3D animation immediately from the 等离子体 (plasma) phase, leaving tourIdx and the narration panel untouched — AC-08 explicitly pins this after review FR-002: the learner watching the fusion story wants to re-watch the reaction, not the slow atom intro; page reload would destroy tour position; restarting from atoms re-teaches known content. (alternatives rejected: restart from the 原子结构 phase; full page reload for reset)- **WebGL degradation path (NFR)**: chose detect via WebGL.isWebGL2Available() from 'three/addons/capabilities/WebGL.js', then inject our own Chinese message div — The r160 built-in message is English-only and would fail the Chinese-explanation NFR; try/catch around new WebGLRenderer() risks three.js logging console errors during construction (violating the zero-console-error degradation path), while the capability module detects cleanly. (alternatives rejected: appendChild(WebGL.getWebGL2ErrorMessage()) — English-only built-in)- **Tour engine design (AC-05)**: chose TOUR data steps map onto the SAME phase machine ({key, phase, title, text, hl}) with highlight pulsing, reusing static tourPanel DOM (tourTitle/tourText/tourPrev/tourNext/tourExit/tourDots) — YAGNI/boring-patterns: ion-thruster-3d already proves this exact data-driven tour shape with those ids (AC-05 mandates following it); reusing the phase machine guarantees reset↔tour independence (AC-08) for free instead of coordinating two timelines. (alternatives rejected: separate tour choreography that independently scripts the scene (duplicate timeline code); rebuild #tourPanel DOM via innerHTML per step)- **What freezes when paused (AC-07 'freezes all particle motion and the phase clock' while OrbitControls stays live)**: chose keep the single rAF loop alive while paused — OrbitControls damping/camera keeps responding, only simTime accumulation and particle/phase updates are gated — AC-07 requires drag-rotate and wheel/pinch-zoom to work at all times without breaking the animation; stopping the loop would freeze the canvas including camera; gating only the simulation is the minimal freeze that satisfies both clauses. (alternatives rejected: run rAF but skip particle integration while paused; stop the rAF loop entirely on pause)