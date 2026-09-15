# Specification: 核聚变 3D 交互动画 (Nuclear Fusion 3D Animation) — Technical Specification, Implementation Plan & Task List for nuclear-fusion-3d/

- **Date**: 2026-08-27
- **Generated**: 2026-08-27T14:07:29.244+08:00

---

## Summary

Technical specification, implementation plan, and task list for nuclear-fusion-3d/ — a self-contained, zero-build three.js@0.160.0 page teaching children D–T 核聚变 (theory → process → 质子/中子/电子 motion) via a three-phase story (原子结构 → 加热→等离子体 → 聚变反应), a 5-step 🎬 引导浏览 tour, verified physics numbers (17.6 MeV, 0.0189 u, 2.82e-12 J, E=mc²), and the site-standard ctrl-bar — linked from the root index.html card grid. TRACE MATRIX (every AC → every BDD scenario → owning phase): AC-01 → SCENARIO-001, SCENARIO-002 → Phase 1; AC-02 → SCENARIO-003, SCENARIO-004 → Phase 1; AC-03 → SCENARIO-005, SCENARIO-006 → Phase 1; AC-04 → SCENARIO-007, SCENARIO-008, SCENARIO-009, SCENARIO-010 → Phase 2; AC-05 → SCENARIO-011, SCENARIO-012, SCENARIO-013 → Phase 2; AC-06 → SCENARIO-014, SCENARIO-015, SCENARIO-016 → Phase 1 (display literals) with the PHYS single-source module enforced in Phase 2; AC-07 → SCENARIO-017, SCENARIO-018, SCENARIO-019 → Phase 2; AC-08 → SCENARIO-020, SCENARIO-021 → Phase 2; AC-09 → SCENARIO-024 → Phase 1 (degradation path) and SCENARIO-022, SCENARIO-023 → Phase 2 (final runtime cleanliness/network hygiene). All 9 ACs and all 24 scenarios are covered; no scenario is orphaned and no AC is unaddressed. Upstream review state: FR-001/FR-002 (requirements), BDD-F-001/002/003 (BDD) verified resolved upstream and engineered into this spec; remaining P3 advisories FR-003 and BDD-R3-001 are dispositioned in reviewResponses. No Prototype Report exists, so no prototype evidence needed incorporation.

## Architecture

REPO BASELINE (verified by source inspection): static zero-build site; each topic is a self-contained folder; canonical 3D template ion-thruster-3d/ (index.html + css/style.css + js/main.js) with zh-CN shell, #homeBtn, #stage, emoji tool-btn nav (#btnTour title 引导浏览（分步讲解）), #bottomBar ctrl-btns (#toggleBtn/#resetBtn/#camBtn), tour overlay (#tourPanel/#tourTitle/#tourText/#tourDots/#tourPrev/#tourNext/#tourExit), window.__errs trap, es-module-shims@1.10.0 + import map pinned to https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js with "three/addons/" → .../three@0.160.0/examples/jsm/, single-module main.js ending window.__ready = true. Root index.html has 6 card accent classes (.card--slingshot/--car/--ion/--ion3d/--atom/--solar) at lines 119–141 and 6 cards at lines 190–229. Caddyfile serves :8321 but its root pins the MAIN checkout — worktree testing must run `caddy file-server --root "$PWD" --listen :8321` from the worktree; no Caddyfile changes.

FILE INVENTORY — CREATE: nuclear-fusion-3d/index.html, nuclear-fusion-3d/css/style.css, nuclear-fusion-3d/js/main.js. MODIFY: index.html (root — exactly one new card block + two .card--fusion accent rules; nothing else). DELETE: none. No package.json, no bundler, no build step, no other file touched.

MODULE MAP (single-file js/main.js, contract-first, mirroring 07-design.md §1–§7):
§1 bootstrap: import WebGL from 'three/addons/capabilities/WebGL.js'; if (!WebGL.isWebGL2Available()) inject a custom Chinese fallback div into #stage and return before constructing WebGLRenderer (built-in getWebGL2ErrorMessage() is English-only and renderer construction logs errors — both forbidden by SCENARIO-024). Otherwise: WebGLRenderer with setPixelRatio(Math.min(devicePixelRatio, 2)); scene; PerspectiveCamera whose default position/target are named constants DEFAULT_CAMERA_POS/DEFAULT_CAMERA_TARGET (restored by 🎥 重置视角); OrbitControls (enableDamping, wheel + touch zoom) from 'three/addons/controls/OrbitControls.js'; CSS2DRenderer from 'three/addons/renderers/CSS2DRenderer.js' for on-canvas 质子/中子/电子 labels (same mechanism as ion-thruster-3d/js/main.js per code assessment); THREE.Clock; ONE requestAnimationFrame loop that ALWAYS calls clock.getDelta() and, only when !state.paused, advances state.simTime and updates the world — the research-verified pause pattern (never write clock.running: getDelta() jumps after resume and start() resets elapsedTime). Resize listener; window.__ready = true at end.
§2 PHYS (single source of physics constants): masses {2.014102, 3.016049, 4.002602, 1.008665} u; MASS_DEFECT_U = 0.018884 (displayed ≈ 0.0189 u); MEV_PER_U = 931.494; Q_MEV = 17.6; SPLIT {neutron 14.1, alpha 3.5}; J_PER_MEV = 1.602e-13; E_J = 2.82e-12; E_MC2_LABEL = 'E=mc²'. The index.html physics panel displays the identical strings (both are deliverable-gated, so no dual-source drift).
§3 phase state machine: PHASES ordered keys ['atoms','plasma','fusion'] with labels {'原子结构','加热 → 等离子体','聚变反应'}; explicit per-phase durations in seconds; state = {phaseKey, phaseTime, simTime, paused}; advancePhase() gates strictly on simTime so pause freezes particles AND the phase clock together; startRun(fromKey) accepts 'atoms' (initial page load) or 'plasma' (🔄 重置 and auto-repeat restarts). Observable API (AC-04 programmatically observable): window.fusionSim = { getPhase(): 'atoms'|'plasma'|'fusion', getPhaseTime(): number, getSimTime(): number, isPaused(): boolean, pause(): void, resume(): void, reset(): void, isTourActive(): boolean, getTourStep(): number|null }.
§4 particles: atoms phase renders hero nuclei as Mesh spheres — deuterium (1 red proton + 1 gray-blue neutron + 1 tiny bright orbiting electron), tritium (1 proton + 2 neutrons + 1 orbiting electron) — distinguishable by size + CSS2D labels, not hue alone. Plasma phase strips both electrons into free flight and adds an ambient plasma field rendered as ONE THREE.Points + BufferGeometry with typed-array position updates (single draw call, ≤2,000 total animated particles). §5 fusion event: the hero D and T nuclei travel a collision axis with a decelerating Coulomb-repulsion arc (visually 克服库仑斥力), merge into a ⁴He cluster (2 protons + 2 neutrons), eject a free gray neutron with recoil momentum, and emit an expanding energy-flash Sprite (SpriteMaterial {blending: AdditiveBlending, transparent: true, depthWrite: false}, scale+opacity animating then fading). When the flash fades in free-explore mode the machine auto-calls startRun('plasma') — the infinite auto-repeat loop — and every phase rebuild dispose()s replaced geometries/materials (GPU resources are not GC-managed).
§6 guided tour: TOUR_STEPS — a data array in js/ of exactly the 5 required steps, each {key, title, zhText, phaseKey}: (1) atoms 原子结构（质子/中子/电子）, (2) heating 加热变成等离子体, (3) coulomb 克服库仑斥力（原子核相互排斥）, (4) fusion 聚变反应生成氦-4 和中子, (5) emc2 E=mc² 质量变成能量. btnTour opens at step 0; entering step i sets tour.index = i and forces the phase machine to step.phaseKey anchored at phase start (phaseKey = step.phaseKey; phaseTime = 0; simTime snapped to that phase's boundary) WITHOUT pausing playback; tourPrev (← 上一步) / tourNext (下一步 →) clamp at bounds; tourExit (退出) closes the overlay leaving the scene running; tourDots highlights the current step. Tour state is owned exclusively by §6 — §7's reset() never reads or writes it (AC-08).
§7 controls & HUD: toggleBtn toggles state.paused and swaps its label ⏸ 暂停 ⇄ ▶ 继续; resetBtn calls fusionSim.reset() = startRun('plasma') only; camBtn restores DEFAULT_CAMERA_POS/DEFAULT_CAMERA_TARGET; OrbitControls stay enabled in every phase and never gate the rAF loop (drag-rotate/zoom cannot break the animation). HUD phase label shows the current PHASES label; the physics info panel is static markup in index.html.

r160 CLEAN-CONSOLE RULES (engineered in, per research): never write useLegacyLights, outputEncoding, or texture.encoding; set texture.colorSpace = SRGBColorSpace only for color textures (canvas-generated glow texture for the flash); no light-intensity rescaling needed for the emissive/unlit particle scene. NETWORK HYGIENE: the only non-local requests are the pinned jsdelivr three@0.160.0 modules and es-module-shims@1.10.0 (already part of the ion-thruster-3d pin pattern) plus optional Google Fonts (Outfit). SECURITY: no eval, no user text input, no telemetry/analytics.

ROOT index.html EDIT (only edit outside the new folder): insert after the atomic-model card — <a class="card card--fusion" href="nuclear-fusion-3d/" id="link-nuclear-fusion-3d"> containing an emoji icon (☀️), bilingual title "Nuclear Fusion 核聚变", one-line English description of the fusion journey, and an "Open →" arrow — plus two inline rules alongside the existing six: .card--fusion::before { radial-gradient accent } and .card--fusion .card__icon { background: … }. No other root changes (SCENARIO-003/004).

## Testing Strategy

Two-phase verification, each phase independently gated. PHASE 1 — deterministic static checks (grep-level, run against the worktree): (a) required files exist (nuclear-fusion-3d/index.html, css/style.css, js/main.js); (b) index.html contains <html lang="zh-CN">, id="homeBtn" with ../index.html href and 返回首页 title, id="stage", the exact two jsdelivr three@0.160.0 import-map URLs and no other three source/version, es-module-shims loader, module script ./js/main.js, all ctrl/tour DOM ids (btnTour with 引导浏览 title, toggleBtn, resetBtn, camBtn, tourPanel, tourTitle, tourText, tourDots, tourPrev, tourNext, tourExit, bottomBar, tools); (c) physics literals present — '17.6', '0.0189', 'E=mc' (satisfies the 'mc' requirement), plus spec-strengthened positive pins '14.1', '3.5', '2.82' — and forbidden literals '0.0256'/'3.2e-11' absent from every file under nuclear-fusion-3d/; (d) root index.html contains the card--fusion card (id link-nuclear-fusion-3d, href nuclear-fusion-3d/, bilingual title, Open → arrow) and both .card--fusion accent rules, with no other diffs; (e) shell loads clean when served (caddy file-server from the worktree, since the Caddyfile root pins the main checkout) with zero console errors/warnings. PHASE 2 — browser runtime checks at http://localhost:8321/nuclear-fusion-3d/ (headless or manual): (1) console capture shows zero errors AND zero warnings, window.__errs stays empty, window.__ready becomes true; (2) network capture shows only local assets + jsdelivr three@0.160.0 (+ optional Google Fonts) — no telemetry/analytics; (3) AC-04 observability: poll window.fusionSim.getPhase() and assert the ordered sequence atoms → plasma → fusion within one run, and plasma → fusion after a reset run; (4) AC-07 pause: press ⏸ 暂停, assert isPaused() true, label swapped to ▶ 继续, particle positions and getSimTime() frozen across frames; press ▶ 继续 and assert motion and the phase clock resume with no time jump and no phase skip/replay; (5) AC-08 reset: start the tour, step to a middle step, press 🔄 重置, assert getPhase()==='plasma' immediately, tour step and narration text unchanged; leave the tour and assert the flash-fade auto-repeat returns to plasma with no learner action; (6) 🎥 重置视角 restores the default camera after orbit+zoom; drag-rotate/wheel-zoom during every phase never stops particle motion; (7) SCENARIO-024 degradation: verify the fallback branch by inspection (isWebGL2Available() gate precedes renderer construction and renders the custom Chinese div) — no browser-side forced-failure hook is added to the shipped page; (8) NFR sanity: ≥60 fps at 1080p integrated graphics (particle budget ≤2,000, single THREE.Points draw call), pixelRatio ≤2, and no geometry/material leak across ≥3 auto-repeat cycles (renderer.info.memory stable). Scenario traceability comments (SCENARIO-NNN tags embedded in the created files at the implementing sections) provide stable grep anchors for the deliverable gates of both phases.

## Acceptance Criteria References

- AC-01
- AC-02
- AC-03
- AC-04
- AC-05
- AC-06
- AC-07
- AC-08
- AC-09

## BDD Scenario References

- SCENARIO-001
- SCENARIO-002
- SCENARIO-003
- SCENARIO-004
- SCENARIO-005
- SCENARIO-006
- SCENARIO-007
- SCENARIO-008
- SCENARIO-009
- SCENARIO-010
- SCENARIO-011
- SCENARIO-012
- SCENARIO-013
- SCENARIO-014
- SCENARIO-015
- SCENARIO-016
- SCENARIO-017
- SCENARIO-018
- SCENARIO-019
- SCENARIO-020
- SCENARIO-021
- SCENARIO-022
- SCENARIO-023
- SCENARIO-024

## Prior Review Responses

### FR-001

- **Status**: verified
- **Owner Stage**: requirements
Physics numbers corrected upstream in AC-06 and independently recomputed by the round-2 requirements review (0.018884 u × 931.494 = 17.590 ≈ 17.6 MeV; 17.6 × 1.602e-13 = 2.8195e-12 J; 14.1 + 3.5 = 17.6). Spec engineers the verified chain into the §2 PHYS single-source module and the index.html physics panel, and enforces the required literals '17.6'/'0.0189'/'E=mc' plus forbidden '0.0256'/'3.2e-11' via Phase 1 deliverables.
### FR-002

- **Status**: verified
- **Owner Stage**: requirements
Reset semantics pinned upstream in AC-08/SCENARIO-020. Spec's §7 contract makes reset() exactly startRun('plasma') — animation state only; tour state is owned exclusively by §6 and never read or written by reset, satisfying 'restart from 等离子体 without changing the current tour step'.
### FR-003

- **Status**: addressed
- **Owner Stage**: requirements
- **Evidence**: Phase 1 deliverables.requireContains entries on nuclear-fusion-3d/index.html.
Advisory adopted at spec level: Phase 1 deliverables positively pin the corrected joule figure via requireContains '2\.82' on nuclear-fusion-3d/index.html (AC-06's own text displays 2.82e-12 J), alongside additional positive pins '14\.1' and '3\.5' — strictly stronger than the AC-06 minimum gate ('17.6', '0.0189', 'mc') and fully consistent with it.
### BDD-F-001

- **Status**: verified
- **Owner Stage**: bdd
Verified resolved upstream in SCENARIO-017 (resume binds observable outcomes: label toggle, resumed particle motion, resumed phase-clock advance, continuation from the frozen phase). Spec's §1/§7 simTime-accumulator pause pattern (clock.getDelta() every frame, accumulate only when unpaused) satisfies every Then clause by construction; Phase 2 forbids '.running\s*=' so the THREE.Clock trap cannot be reintroduced.
### BDD-F-002

- **Status**: verified
- **Owner Stage**: bdd
Verified resolved upstream: SCENARIO-010 scopes strict ordering to one single run and explicitly allows restart-from-等离子体 runs. Spec's startRun('atoms') for initial load and startRun('plasma') for reset/auto-repeat implement exactly this.
### BDD-F-003

- **Status**: verified
- **Owner Stage**: bdd
Verified resolved upstream in SCENARIO-024. Spec uses three/addons/capabilities/WebGL.js isWebGL2Available() for detection but renders a custom Chinese message div and returns before constructing WebGLRenderer, so no English message and no console error is thrown on the degradation path.
### BDD-R3-001

- **Status**: deferred
- **Owner Stage**: bdd
Non-blocking P3 advisory about reviewer-action When phrasing in the BDD document itself (SCENARIO-015/016); no spec or code action possible or needed — the deterministic source-literal checks are implemented verbatim in Phase 1 deliverables.
