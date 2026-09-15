# Implementation Plan: 核聚变 3D 交互动画 (Nuclear Fusion 3D Animation) — Technical Specification, Implementation Plan & Task List for nuclear-fusion-3d/

- **Date**: 2026-08-27
- **Generated**: 2026-08-27T14:07:29.245+08:00

---

## Phase 1: Phase 1: Static Page Shell, Physics Panel & Site Card

Independently testable via deterministic static checks (file existence + content patterns) plus a clean first load. Creates nuclear-fusion-3d/index.html (lang=zh-CN, #homeBtn back-link, #stage, #tools/#btnTour 引导浏览, #bottomBar ctrl-bar #toggleBtn/#resetBtn/#camBtn, #tourPanel overlay with #tourTitle/#tourText/#tourDots/#tourPrev/#tourNext/#tourExit, physics info panel with the verified D–T numbers and E=mc², window.__errs trap, es-module-shims@1.10.0, import map pinned exclusively to three@0.160.0 + three/addons/, module script ./js/main.js), nuclear-fusion-3d/css/style.css (dark-space theme, fixed overlay UI, responsive tablet width, keyboard-focusable ctrl-btns), and a bootstrap slice of nuclear-fusion-3d/js/main.js (WebGL2 capability check with custom Chinese fallback, renderer/camera/OrbitControls/clock, single rAF loop rendering a placeholder starfield, resize listener, window.__ready = true) so the shell loads with zero console errors before the story runtime lands. Edits root index.html to add the single fusion card + two .card--fusion accent rules. Covers AC-01, AC-02, AC-03, AC-06 and the AC-09 degradation path. Embeds SCENARIO-001..006/014..016/024 traceability comments in the created files.

Scenario refs: SCENARIO-001, SCENARIO-002, SCENARIO-003, SCENARIO-004, SCENARIO-005, SCENARIO-006, SCENARIO-014, SCENARIO-015, SCENARIO-016, SCENARIO-024
### Test deliverables (enforced contract)
- deliverables.requireScenarios: SCENARIO-001, SCENARIO-002, SCENARIO-003, SCENARIO-004, SCENARIO-005, SCENARIO-006, SCENARIO-014, SCENARIO-015, SCENARIO-016, SCENARIO-024
- deliverables.requireFiles: nuclear-fusion-3d/index.html, nuclear-fusion-3d/css/style.css, nuclear-fusion-3d/js/main.js
- deliverables.requireContains:
  - `nuclear-fusion-3d/index.html` matches `<html lang="zh-CN">`
  - `nuclear-fusion-3d/index.html` matches `id="homeBtn"`
  - `nuclear-fusion-3d/index.html` matches `\.\./index\.html`
  - `nuclear-fusion-3d/index.html` matches `id="stage"`
  - `nuclear-fusion-3d/index.html` matches `cdn\.jsdelivr\.net/npm/three@0\.160\.0/build/three\.module\.js`
  - `nuclear-fusion-3d/index.html` matches `cdn\.jsdelivr\.net/npm/three@0\.160\.0/examples/jsm/`
  - `nuclear-fusion-3d/index.html` matches `id="btnTour"`
  - `nuclear-fusion-3d/index.html` matches `引导浏览`
  - `nuclear-fusion-3d/index.html` matches `id="tourPrev"`
  - `nuclear-fusion-3d/index.html` matches `id="tourNext"`
  - `nuclear-fusion-3d/index.html` matches `id="tourExit"`
  - `nuclear-fusion-3d/index.html` matches `id="toggleBtn"`
  - `nuclear-fusion-3d/index.html` matches `id="resetBtn"`
  - `nuclear-fusion-3d/index.html` matches `id="camBtn"`
  - `nuclear-fusion-3d/index.html` matches `id="tourPanel"`
  - `nuclear-fusion-3d/index.html` matches `17\.6`
  - `nuclear-fusion-3d/index.html` matches `0\.0189`
  - `nuclear-fusion-3d/index.html` matches `E=mc`
  - `nuclear-fusion-3d/index.html` matches `14\.1`
  - `nuclear-fusion-3d/index.html` matches `2\.82`
  - `index.html` matches `card--fusion`
  - `index.html` matches `id="link-nuclear-fusion-3d"`
  - `index.html` matches `nuclear-fusion-3d/`
  - `index.html` matches `Nuclear Fusion 核聚变`
  - `index.html` matches `Open →`
  - `nuclear-fusion-3d/css/style.css` matches `#stage`
  - `nuclear-fusion-3d/css/style.css` matches `ctrl-btn`
  - `nuclear-fusion-3d/css/style.css` matches `#tourPanel`
  - `nuclear-fusion-3d/js/main.js` matches `isWebGL2Available`
  - `nuclear-fusion-3d/js/main.js` matches `__ready`
- deliverables.requireNotContains:
  - `nuclear-fusion-3d/index.html` must NOT match `0\.0256`
  - `nuclear-fusion-3d/index.html` must NOT match `3\.2e-11`
  - `nuclear-fusion-3d/index.html` must NOT match `unpkg`
  - `nuclear-fusion-3d/index.html` must NOT match `three\.min\.js`
  - `nuclear-fusion-3d/index.html` must NOT match `three@0\.15`
  - `nuclear-fusion-3d/index.html` must NOT match `three@0\.16[1-9]`
  - `nuclear-fusion-3d/js/main.js` must NOT match `0\.0256`
  - `nuclear-fusion-3d/js/main.js` must NOT match `3\.2e-11`
## Phase 2: Phase 2: Fusion Story Runtime, Guided Tour & Playback Controls

Independently testable via browser runtime assertions against window.fusionSim plus console/network capture. Completes nuclear-fusion-3d/js/main.js: PHYS constants (single source of the AC-06 chain), the simTime-gated phase state machine with the observable window.fusionSim API, the three story phases (原子结构 atoms with D/T nuclei + orbiting electrons and CSS2D 质子/中子/电子 labels; 加热 → 等离子体 plasma with stripped free electrons, random-motion nuclei and a single THREE.Points ambient field ≤2,000 particles; 聚变反应 fusion with Coulomb-repulsion collision, ⁴He merge, gray-neutron ejection and an AdditiveBlending energy flash), free-explore auto-repeat back to 等离子体 after the flash fades, the 5-step TOUR_STEPS guided tour with forced-phase coupling and tourPrev/tourNext/tourExit navigation, and the control bar (⏸ 暂停/▶ 继续 simTime-accumulator pause with label swap, 🔄 重置 = startRun('plasma') without touching tour state, 🎥 重置视角 camera restore, always-on OrbitControls). Keeps the r160 zero-console-warning rules and dispose-on-rebuild hygiene. Covers AC-04, AC-05, AC-07, AC-08 and the runtime side of AC-09. Embeds SCENARIO-007..013/017..023 traceability comments in js/main.js.

Scenario refs: SCENARIO-007, SCENARIO-008, SCENARIO-009, SCENARIO-010, SCENARIO-011, SCENARIO-012, SCENARIO-013, SCENARIO-017, SCENARIO-018, SCENARIO-019, SCENARIO-020, SCENARIO-021, SCENARIO-022, SCENARIO-023
### Test deliverables (enforced contract)
- deliverables.requireScenarios: SCENARIO-007, SCENARIO-008, SCENARIO-009, SCENARIO-010, SCENARIO-011, SCENARIO-012, SCENARIO-013, SCENARIO-017, SCENARIO-018, SCENARIO-019, SCENARIO-020, SCENARIO-021, SCENARIO-022, SCENARIO-023
- deliverables.requireFiles: nuclear-fusion-3d/js/main.js
- deliverables.requireContains:
  - `nuclear-fusion-3d/js/main.js` matches `window\.fusionSim`
  - `nuclear-fusion-3d/js/main.js` matches `getPhase`
  - `nuclear-fusion-3d/js/main.js` matches `PHYS`
  - `nuclear-fusion-3d/js/main.js` matches `TOUR_STEPS`
  - `nuclear-fusion-3d/js/main.js` matches `原子结构`
  - `nuclear-fusion-3d/js/main.js` matches `等离子体`
  - `nuclear-fusion-3d/js/main.js` matches `聚变反应`
  - `nuclear-fusion-3d/js/main.js` matches `库仑斥力`
  - `nuclear-fusion-3d/js/main.js` matches `E=mc`
  - `nuclear-fusion-3d/js/main.js` matches `simTime`
  - `nuclear-fusion-3d/js/main.js` matches `getDelta`
  - `nuclear-fusion-3d/js/main.js` matches `startRun\('plasma'\)`
  - `nuclear-fusion-3d/js/main.js` matches `AdditiveBlending`
  - `nuclear-fusion-3d/js/main.js` matches `dispose`
  - `nuclear-fusion-3d/js/main.js` matches `OrbitControls`
  - `nuclear-fusion-3d/js/main.js` matches `CSS2DRenderer`
  - `nuclear-fusion-3d/js/main.js` matches `BufferGeometry`
- deliverables.requireNotContains:
  - `nuclear-fusion-3d/js/main.js` must NOT match `\.running\s*=`
  - `nuclear-fusion-3d/js/main.js` must NOT match `useLegacyLights`
  - `nuclear-fusion-3d/js/main.js` must NOT match `outputEncoding`
  - `nuclear-fusion-3d/js/main.js` must NOT match `texture\.encoding`
  - `nuclear-fusion-3d/js/main.js` must NOT match `0\.0256`
  - `nuclear-fusion-3d/js/main.js` must NOT match `3\.2e-11`
