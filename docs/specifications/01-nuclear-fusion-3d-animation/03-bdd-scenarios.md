# Behavior Scenarios: Nuclear Fusion 3D Animation — 核聚变 3D 交互动画 BDD Scenarios

- **Date**: 2026-08-27
- **Generated**: 2026-08-27T13:46:51.761+08:00
- **Author**: super-dev:bdd-scenario-writer
- **Source**: /home/jenningsl/Documents/儿子学习/science/.worktree/01-nuclear-fusion-3d-animation/docs/specifications/01-nuclear-fusion-3d-animation/01-requirements.md
- **Total Scenarios**: 24

---
## Feature: Page Structure & Entry Point 页面结构与入口 (AC-01, AC-02)

### SCENARIO-001: Fusion page follows the established site page layout

- **Acceptance Criteria**: AC-01
- **Priority**: high

**Given** the established science site with the ion-thruster-3d/ and atomic-model/ pages already following the site page layout
**When** the learner opens the 核聚变 nuclear fusion page
**Then** the new page exists at the repo root under nuclear-fusion-3d/ following the same layout conventions
**And** the directory contains index.html plus css/ and js/ subdirectories following the ion-thruster-3d/ and atomic-model/ page layout
**And** the page is declared as Chinese-language content (lang=zh-CN)
**And** a home back-link labeled 🏠 首页 with the 返回首页 Back to home tooltip leads back to the site home page
**And** a stage container element hosts the three.js canvas
### SCENARIO-002: The 3D canvas is hosted inside the stage element

- **Acceptance Criteria**: AC-01
- **Priority**: medium

**Given** the fusion page has loaded and the 3D scene is rendering
**When** the three.js scene is displayed
**Then** the 3D animation canvas appears inside the stage container, keeping the page layout intact
### SCENARIO-003: Home page card grid gains the fusion card

- **Acceptance Criteria**: AC-02
- **Priority**: high

**Given** the site home page with its existing card grid (ion3d and atom cards)
**When** the learner views the home page
**Then** a new fusion card appears in the grid pointing to nuclear-fusion-3d/
**And** the card carries the bilingual title "Nuclear Fusion 核聚变"
**And** the card shows an emoji icon and a one-line English description of the fusion journey
**And** the card ends with an "Open →" arrow
**And** a .card--fusion accent-color rule exists in the inline card CSS alongside the existing .card--ion3d and .card--atom rules
### SCENARIO-004: Fusion card leads the learner to the fusion page

- **Acceptance Criteria**: AC-02
- **Priority**: medium

**Given** the learner is on the home page card grid
**When** the learner opens the fusion card
**Then** they arrive at the nuclear-fusion-3d/ page
## Feature: Pinned three.js Loading 固定版本加载 (AC-03)

### SCENARIO-005: three.js loads exclusively through the pinned import map

- **Acceptance Criteria**: AC-03
- **Priority**: high

**Given** the fusion page is opened in the learner's browser
**When** the page loads its 3D library
**Then** the 3D library is provided via a single import map with an exact version pin
**And** three.js loads exclusively from the jsdelivr import map pinned to three@0.160.0
**And** the "three/addons/" mapping points to the matching three@0.160.0 examples/jsm/ location
### SCENARIO-006: Version pin is identical to the ion-thruster page and nothing else is introduced

- **Acceptance Criteria**: AC-03
- **Priority**: medium

**Given** the ion-thruster-3d page already pins three@0.160.0 on jsdelivr
**When** the two pages' 3D library loading is compared
**Then** the fusion page uses the identical three@0.160.0 pin
**And** no other three.js version appears anywhere in the page
**And** no bundler and no build step are introduced — the page runs directly as static files
## Feature: D–T Fusion Story Phases 聚变故事三阶段 (AC-04)

### SCENARIO-007: Phase 1 原子结构 shows the deuterium and tritium atoms

- **Acceptance Criteria**: AC-04
- **Priority**: high

**Given** the fusion animation begins
**When** the first phase of the story is displayed
**Then** the 原子结构 phase shows the two atoms side by side
**And** a deuterium atom shows a nucleus of 1 red proton and 1 gray-blue neutron with 1 tiny electron orbiting it
**And** a tritium atom beside it shows a nucleus of 1 proton and 2 neutrons with 1 orbiting electron
### SCENARIO-008: Phase 2 加热 → 等离子体 strips electrons into fast plasma

- **Acceptance Criteria**: AC-04
- **Priority**: high

**Given** the 原子结构 phase has completed
**When** the heating phase of the story runs
**Then** the 加热 → 等离子体 phase shows the heated plasma state
**And** electrons are stripped away from their nuclei and fly freely
**And** the nuclei move fast with random motion
### SCENARIO-009: Phase 3 聚变反应 collides D and T into helium-4 plus a neutron and energy

- **Acceptance Criteria**: AC-04
- **Priority**: high

**Given** the plasma phase with fast-moving nuclei
**When** the fusion reaction phase of the story runs
**Then** the 聚变反应 phase shows the full fusion event
**And** the D and T nuclei move toward each other against their mutual electrostatic repulsion
**And** they merge into a ⁴He nucleus of 2 protons and 2 neutrons
**And** a free gray neutron is ejected
**And** an expanding energy flash is emitted
### SCENARIO-010: The phase state machine exposes an observable current phase that advances in order within one run

- **Acceptance Criteria**: AC-04
- **Priority**: medium

**Given** the phase state machine drives the animation in js/
**When** the current phase state is queried programmatically as the story advances
**Then** the animation advances through 原子结构, 加热 → 等离子体, and 聚变反应 as sequential phases
**And** the current phase is programmatically observable at any time
**And** the phases advance in order 原子结构 → 加热 → 等离子体 → 聚变反应 without skipping or replaying out of sequence within one single run
**And** a run that begins at 等离子体 (after 🔄 重置 or auto-repeat) likewise advances 等离子体 → 聚变反应 in order — it is not required to replay 原子结构
## Feature: Guided Tour 引导浏览 (AC-05)

### SCENARIO-011: Guided tour starts from the 🎬 button with Chinese narration

- **Acceptance Criteria**: AC-05
- **Priority**: high

**Given** the learner is on the fusion page
**When** the learner starts the 引导浏览 guided tour
**Then** the guided tour begins with a Chinese narration panel
**And** a 🎬 tour button with a title containing 引导浏览 starts the tour
**And** the tour offers at least 5 steps defined as data in js/
**And** a Chinese narration panel is shown for each step
### SCENARIO-012: Tour steps cover the five required learning topics

- **Acceptance Criteria**: AC-05
- **Priority**: high

**Given** the guided tour is active
**When** the learner reads through the tour step list
**Then** the tour steps cover, at minimum, the five key learning topics of the fusion story
**And** 原子结构（质子/中子/电子）
**And** 加热变成等离子体
**And** 克服库仑斥力（原子核相互排斥）
**And** 聚变反应生成氦-4 和中子
**And** E=mc² 质量变成能量
### SCENARIO-013: Tour navigation moves step by step and can exit

- **Acceptance Criteria**: AC-05
- **Priority**: medium

**Given** the learner is on a middle step of the guided tour with its narration panel shown
**When** the learner navigates with the tour controls tourPrev, tourNext, or tourExit
**Then** the narration panel reflects the newly current step, and exiting the tour returns the learner to free exploration
**And** tourPrev（← 上一步）moves to the previous step
**And** tourNext（下一步 →）moves to the next step
**And** tourExit（退出）ends the tour
**And** the buttons follow the established ion-thruster-3d tour pattern
## Feature: Physics Numbers & E=mc² 物理数值 (AC-06)

### SCENARIO-014: Page displays the physically correct D–T fusion numbers

- **Acceptance Criteria**: AC-06
- **Priority**: critical

**Given** the learner is studying the fusion page content
**When** the learner reads the physics information panel
**Then** the page presents the physically correct D–T fusion figures together with the E=mc² 质能方程 explanation
**And** the reaction is shown as ²H + ³H → ⁴He + n + 17.6 MeV
**And** the energy split shows 中子 ~14.1 MeV and α 粒子（氦核）~3.5 MeV
**And** the mass defect is shown as ≈ 0.0189 u (2.014102 u + 3.016049 u − 4.002602 u − 1.008665 u = 0.018884 u)
**And** the released energy is shown as ≈ 2.8×10⁻¹² J (2.82e-12 J)
### SCENARIO-015: Correct values appear and wrong values never appear in the page source

- **Acceptance Criteria**: AC-06
- **Priority**: critical

**Given** the delivered fusion page source
**When** the page source is checked for the key physics literals
**Then** the page contains the literal strings '17.6', '0.0189', and 'mc' (from E=mc²)
**And** the page does not contain the incorrect literal '0.0256' (wrong mass defect)
**And** the page does not contain the incorrect literal '3.2e-11' (fission-value energy)
### SCENARIO-016: Displayed numbers are internally consistent under conversion

- **Acceptance Criteria**: AC-06
- **Priority**: medium

**Given** the numbers displayed on the fusion page
**When** the learner (or a reviewer) converts between mass defect, MeV, and joules
**Then** mass defect, released energy in MeV, and released energy in joules all agree with one another
**And** 0.018884 u × 931.494 MeV/u ≈ 17.59 MeV ≈ 17.6 MeV
**And** 17.6 MeV × 1.602×10⁻¹³ J/MeV ≈ 2.82×10⁻¹² J
## Feature: Playback Controls & Camera 播放控制与视角 (AC-07)

### SCENARIO-017: Pause freezes all particle motion and the phase clock; resume continues from the frozen phase

- **Acceptance Criteria**: AC-07
- **Priority**: high

**Given** the fusion animation is playing in a mid-story phase (for example 等离子体) with particles in motion, and the control bar below the stage is available
**When** the learner pauses with ⏸ 暂停, and later resumes with ▶ 继续
**Then** the animation suspends completely
**And** all particle motion in the scene freezes
**And** the phase clock freezes so no phase advances while paused
**And** the control toggles between the ⏸ 暂停 and ▶ 继续 labels as the state changes
**And** after ▶ 继续 is pressed, all particle motion resumes and the phase clock advances again — the story is not stuck frozen
**And** the story continues from exactly the phase where it was frozen, with no phase skipped or replayed
### SCENARIO-018: Reset camera restores the default viewpoint

- **Acceptance Criteria**: AC-07
- **Priority**: medium

**Given** the learner has rotated and zoomed the camera away from its initial view
**When** the learner uses the 🎥 重置视角 control
**Then** the camera returns to the default view
### SCENARIO-019: Drag-rotate and zoom never break the running animation

- **Acceptance Criteria**: AC-07
- **Priority**: medium

**Given** the fusion animation is running
**When** the learner drag-rotates or wheel/pinch-zooms the scene at any moment
**Then** the learner can freely rotate and zoom while the animation keeps running correctly
**And** the camera changes viewpoint without interrupting particle motion or the phase clock
**And** wheel and pinch zoom work at all times
## Feature: Reset & Auto-Repeat Semantics 重置与自动重复 (AC-08)

### SCENARIO-020: Reset restarts the animation from the plasma phase without disturbing the tour

- **Acceptance Criteria**: AC-08
- **Priority**: critical

**Given** the guided tour is active and the learner is on a narration step mid-tour
**When** the learner presses 🔄 重置
**Then** only the animation resets — the tour stays exactly where the learner left it
**And** the 3D animation restarts immediately from the 等离子体 phase
**And** the current guided-tour step is unchanged
**And** the narration panel still shows exactly the step the learner left it on
### SCENARIO-021: Free-explore mode auto-repeats the fusion event

- **Acceptance Criteria**: AC-08
- **Priority**: high

**Given** the learner is in free-explore mode (no tour active)
**When** a fusion event completes and its energy flash fades
**Then** the animation auto-repeats back to the 等离子体 phase for the next run
**And** the animation returns to the 等离子体 phase without learner intervention
**And** the reaction can be watched repeatedly in free exploration
## Feature: Clean Delivery, Network Hygiene & Degradation 加载洁净度与降级 (AC-09)

### SCENARIO-022: Page loads from the existing static server with a clean console

- **Acceptance Criteria**: AC-09
- **Priority**: high

**Given** the site is served by the existing static server at http://localhost:8321/nuclear-fusion-3d/ with no server configuration changes
**When** the learner opens the page in a current browser
**Then** the fusion page loads cleanly
**And** the page loads with zero browser-console errors
**And** the page loads with zero browser-console warnings
### SCENARIO-023: Only the pinned jsdelivr three.js modules are requested externally

- **Acceptance Criteria**: AC-09
- **Priority**: high

**Given** the fusion page is loading in the browser
**When** the learner observes the network requests the page makes
**Then** the only non-local requests are the pinned jsdelivr three@0.160.0 modules (optionally Google Fonts)
**And** no other three.js version or source is requested
**And** no telemetry, analytics, or other third-party calls are made
### SCENARIO-024: WebGL-unavailable browsers get a Chinese explanation instead of a blank canvas (NFR-backed degradation)

- **Acceptance Criteria**: AC-09
- **Priority**: low

**Given** a current browser in which WebGL is unavailable (NFR: Compatibility & degradation)
**When** the learner opens the fusion page served from the science site
**Then** a Chinese explanation message is shown instead of a blank canvas
**And** the page degrades gracefully without a blank canvas or a crashed page
**And** no unhandled browser-console error is thrown by the degradation path
---

## Traceability

- **AC-01**: New nuclear-fusion-3d/ directory following established page layout (index.html + css/ + js/, lang=zh-CN, #homeBtn back-link, #stage hosting the canvas) → SCENARIO-001, SCENARIO-002
- **AC-02**: Root index.html card grid gains the bilingual fusion card with .card--fusion accent rule → SCENARIO-003, SCENARIO-004
- **AC-03**: three.js loaded exclusively via import map pinned to three@0.160.0 on jsdelivr; no bundler, no build step → SCENARIO-005, SCENARIO-006
- **AC-04**: Three sequential phases (原子结构 / 加热→等离子体 / 聚变反应) driven by an observable phase state machine; ordering claim scoped per review finding BDD-F-002 to one single run, explicitly allowing restart-from-等离子体 runs → SCENARIO-007, SCENARIO-008, SCENARIO-009, SCENARIO-010
- **AC-05**: 🎬 引导浏览 guided tour of ≥5 steps covering the five required topics, Chinese narration, tourPrev/tourNext/tourExit controls → SCENARIO-011, SCENARIO-012, SCENARIO-013
- **AC-06**: Physically correct, internally consistent D–T numbers (17.6 MeV, 0.0189 u, 2.82e-12 J) with E=mc²; wrong literals 0.0256/3.2e-11 forbidden → SCENARIO-014, SCENARIO-015, SCENARIO-016
- **AC-07**: ctrl-bar controls: ⏸/▶ pause-resume freezing AND resuming motion and the phase clock — review finding BDD-F-001 resolved: SCENARIO-017 now asserts resumed particle motion, resumed phase-clock advance, continuation from the frozen phase, and the toggle label switch; 🎥 重置视角; and OrbitControls never break the animation → SCENARIO-017, SCENARIO-018, SCENARIO-019
- **AC-08**: 🔄 重置 restarts from 等离子体 phase without changing tour step; free-explore mode auto-repeats after flash fades → SCENARIO-020, SCENARIO-021
- **AC-09**: Serves at localhost:8321 with zero console errors/warnings; only pinned jsdelivr three@0.160.0 requests (optionally Google Fonts); SCENARIO-024 additionally covers the NFR-defined WebGL-unavailable degradation path (review finding BDD-F-003 resolved) → SCENARIO-022, SCENARIO-023, SCENARIO-024
---

## Coverage Summary

- **Total Acceptance Criteria**: 9
- **Covered by Scenarios**: 9
- **Uncovered**: 0
- **Total Scenarios**: 24
