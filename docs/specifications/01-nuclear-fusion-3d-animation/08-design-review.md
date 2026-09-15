# Design Review: Design Review — 核聚变 3D 交互动画 (nuclear-fusion-3d/) UI/UX Architecture

- **Date**: 2026-08-27
- **Generated**: 2026-08-27T14:01:44.740+08:00
- **Author**: super-dev:design-reviewer

---

## Verdict: Approved with Comments

Round-1 design review of 07-design.md for nuclear-fusion-3d/. The design is exceptionally well-grounded: every integration claim checks out against the actual repo — the 6 existing root-index card accent classes match the enumerated closure exactly (index.html:190–229), all 13 claimed ctrl/tour DOM ids exist in ion-thruster-3d/index.html (tourNext:86, tourExit:87, tourDots:85, tourPrev:84, tourPanel:80, tourTitle:81, tourText:82), the import map + es-module-shims@1.10.0 pin matches the reference byte-for-byte, and the r160 patterns (WebGL.js capability detection with custom Chinese fallback, no legacy color/light writes, dispose-on-rebuild, simTime accumulator) are all research-verified. All 9 ACs map cleanly to modules with no required-vs-designed conflicts; the AC-06 physics chain and required/forbidden literals are engineered directly into the PHYS single-source module. Contract-claim enumerations (3 phase keys, 5 tour keys, 13 ids, 7 card classes, 3 required + 2 forbidden literals) each match reality. Three P3 advisory gaps remain — on-canvas label rendering mechanism, tour-forced-phase↔simTime coupling, and btnLabels toggle behavior — none of which block the spec from proceeding. No prior findings existed in this round, so priorFindingResolutions is empty. Verdict: Approved with Comments.

## Findings

### DR-001: On-canvas label rendering mechanism unspecified

- **Severity**: P3
- **Owner Stage**: design
- **Status**: open
- **Recommendation**: Add one sentence to §1 or §4 naming the label mechanism (e.g. CSS2DRenderer per the ion-thruster-3d pattern, with labelRenderer.render() added to the rAF loop and its DOM layer resized on window resize; or sprite/Canvas textures covered by the existing dispose rule).
The design promises on-canvas labels 氘 D / 氚 T (§4 particle system), a 中子 14.1 MeV energy tag and an E=mc² overlay chip (§5 fusion event), but never states the rendering mechanism. The reference page ion-thruster-3d uses CSS2DRenderer with a separate labelRenderer.render() call in the rAF loop (verified: code assessment 'renderer/CSS2DRenderer… labelRenderer.render'), whereas the design's §1 loop contract is only 'controls.update→renderer.render'. Whether labels are CSS2D objects, Canvas-texture sprites, or HTML overlays changes the bootstrap module's loop contract and dispose obligations. Any choice is feasible; the design just needs to name one so the spec's phase deliverables don't have to guess.

Evidence:
- 07-design.md §4: 'both atoms labeled 氘 D / 氚 T'
- 07-design.md §5: '中子 14.1 MeV energy tag', 'E=mc² overlay chip… appearing at flash peak'
- 07-design.md §1: 'single rAF loop controls.update→renderer.render' (no label renderer step)
- ion-thruster-3d/js/main.js uses CSS2DRenderer with labelRenderer.render per code assessment
### DR-002: Tour-forced phase and flash-peak freeze not tied to the simTime accumulator

- **Severity**: P3
- **Owner Stage**: design
- **Status**: open
- **Recommendation**: State the rule explicitly, e.g. 'entering a tour step sets simTime to the step's anchor time inside its phase window (paused-flag untouched); tourExit resumes free-explore from the current simTime/phase' — one sentence closes the ambiguity for both implementer and validator.
The phase machine is defined as simTime windows (atoms 0–6 s, plasma 6–16 s, fusion 16–22 s), and tour steps 'drive the same phase machine' — e.g. entering coulomb-barrier 'forces phase=fusion', and emc2 'freezes at flash peak'. The coupling mechanism is inferable (set simTime into the target window; hold simTime constant to freeze) but unstated, as is what happens to simTime/phase when tourExit returns to free-explore (resume from current simTime? restart?). Since window.__fusionPhase/#stage[data-phase] is the deterministic observability contract of AC-04, leaving the tour→simTime write rule implicit risks the spec defining inconsistent validator expectations for data-phase during tour navigation.

Evidence:
- 07-design.md §3: 'durations atoms 0–6 s, plasma 6–16 s, fusion 16–22 s'
- 07-design.md §6: 'entering coulomb-barrier forces phase=fusion', 'emc2 step freezes at flash peak'
- 07-design.md §3: 'window.__fusionPhase always equals the current key' — must remain true under tour-forced transitions
### DR-003: btnLabels (🏷️ 图例) toggle behavior unspecified

- **Severity**: P3
- **Owner Stage**: design
- **Status**: open
- **Recommendation**: Either drop btnLabels from the page-shell (YAGNI — legend chips are always visible per the accessibility NFR) or add one clause to §7: 'btnLabels toggles the on-canvas 氘 D / 氚 T / energy-tag labels'.
The page-shell lists a btnLabels 🏷️ 图例 tool button (mirroring ion-thruster-3d's btnLabels 部件标签, which toggles CSS2D part labels there), but no module defines what it toggles on the fusion page: the static legend chips already sit in #bottomBar, so is btnLabels toggling on-canvas 氘/氚 labels, the legend chips, or both? Not required by any AC (AC-01/05/07 name only homeBtn/stage/btnTour/tour*/ctrl-btns), so this is an unspecified extra control rather than a contract gap — but an implementer following the page-shell literally will hit undefined behavior.

Evidence:
- 07-design.md page-shell: '#tools nav (btnTour …, btnExplore 🖱️ 自由探索, btnLabels 🏷️ 图例)'
- §4/§5/§6/§7 define behavior for btnTour, tourPrev/Next/Exit, toggleBtn, resetBtn, camBtn — none for btnLabels
- ion-thruster-3d/index.html:27 btnLabels title '部件标签' toggles part labels


## Dimension Reviews

### D1 Interface contracts

- **Status**: pass

All module interfaces (phase machine observability window.__fusionPhase/#stage[data-phase], pause accumulator, reset semantics, tour API, PHYS block, WebGL fallback) are specified. Two minor gaps: on-canvas label rendering mechanism and btnLabels toggle behavior — both advisory.
### D2 Feasibility & grounding

- **Status**: pass

Every integration point verified against the actual repo: 6 existing card--* classes (index.html:190-229; the 7th card--fusion is new), all 13 claimed ion-thruster-3d ids exist, import map + es-module-shims@1.10.0 pin byte-matches, WebGL.js capability module path correct for r160. No ungrounded claims found.
### D3 Consistency with requirements

- **Status**: pass

All 9 ACs mapped 1:1 to modules; AC-06 literal requirements and AC-08 reset semantics explicitly engineered for; the reset-vs-tour-step visual mismatch on the atoms-structure step is pinned by AC-08 itself and correctly not re-litigated by the design.
### D4 Data flow & state

- **Status**: pass

End-to-end flow complete (UI events → phase machine → scene builders → rAF → canvas; PHYS → stats bar + narration); state ownership (simTime/paused/tourIdx/phase) explicit. Minor: tour-forced phase/freeze ↔ simTime coupling mechanism inferable but unstated (DR-002).
### D5 Complexity/YAGNI

- **Status**: pass

Single main.js with §1–§7 sections matches the strongest repo convention; TOUR data array and reuse of the phase machine for the tour avoids duplicate timelines; rejected alternatives are reasoned, not padded. btnLabels is a minor YAGNI candidate (DR-003).
### D6 Numeric constants

- **Status**: pass

Exemplary: physics class frozen in PHYS with the consistency chain shown; engine class (2000 particle cap, pixelRatio cap, phase timeline 0-6-16-22s, flash fade 24.5s, camera pose, sphere radii, k=1.8 Coulomb scaling flagged display-only) all enumerated and justified.
