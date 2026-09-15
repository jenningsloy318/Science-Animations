# Code Review: 核聚变 3D 动画 — Implementation Review vs 01-nuclear-fusion-3d-animation Spec (FR-001 / BDD-F-001 convergence re-verification)

- **Date**: 2026-08-27
- **Generated**: 2026-08-27T15:15:52.500+08:00
- **Author**: super-dev:code-reviewer
- **Verdict**: Approved

---

## Verdict: Approved

Reviewed nuclear-fusion-3d/ (index.html 87 L, css/style.css 170 L, js/main.js 686 L, plus tests/) against docs/specifications/01-nuclear-fusion-3d-animation/. Both convergence-ledger blockers from the rejected prior attempt are verified resolved at their owning stages AND in the implementation. FR-001: 01-requirements.md AC-06 now specifies the corrected chain (17.6 MeV; 14.1/3.5 MeV split; mass defect 0.018884 u ≈ 0.0189 u; ≈2.82e-12 J) with the wrong literals 0.0256/3.2e-11 explicitly forbidden, and grep confirms those literals appear in NO production file under nuclear-fusion-3d/ (only in tests asserting their absence); index.html:58-63 and main.js PHYS (31-46) display the correct chain; the deterministic pin was extended to '0.0189' as recommended. BDD-F-001: SCENARIO-017 now asserts the label toggle (⏸/▶), post-resume particle motion AND phase-clock resumption, and continuation from the exact frozen phase; main.js implements this (pause/resume swap labels at 622-629; the single rAF loop gates simTime/phaseTime/world/advancePhase behind !state.paused at 668 while still consuming clock.getDelta() each frame — clean freeze/resume semantics). AC checklist: AC-01 ✓ (zh-CN shell, #homeBtn, #stage), AC-02 ✓ (root index.html:227-230 card + :125,143 accents), AC-03 ✓ (import map pinned exclusively to three@0.160.0 + three/addons/, es-module-shims@1.10.0, no bundler), AC-04 ✓ (three phases, simTime-gated state machine, window.fusionSim observable API), AC-05 ✓ (5 TOUR_STEPS, tourPrev/tourNext/tourExit, forced-phase coupling), AC-06 ✓ (correct, internally consistent numbers), AC-07 ✓ (pause/resume/label swap, 🎥 camera restore, always-on OrbitControls with damping), AC-08 ✓ (🔄 = startRun('plasma') without touching tour state; auto-repeat to plasma after flash fade), AC-09 by design ✓ (WebGL2 gate with Chinese fallback before any renderer, __errs trap, single rAF, MeshBasicMaterial-only scene avoids r160 light warnings, dispose-on-rebuild in clearStory). Dimension scores: Correctness 5, Security 5 (static content, no user input into innerHTML, pinned HTTPS CDN, no eval), Performance 5 (single loop, ≤2000 particles in one THREE.Points, geometry/material/texture dispose per phase rebuild), Concurrency 5 (single-threaded rAF, clamped tour step index), Maintainability 4 (clear sectioning + traceability comments; magic numbers like MERGE_T/FLASH_T are local and commented), Testability 4 (window.fusionSim probes + two node test files pinning the physics chain), Error Handling 4 (WebGL2 degradation path; minor: __errs misses unhandledrejection, see F-003), Data Integrity N/A, Observability 4. Minor non-defect note: tour steps ③→④ both force phaseKey='fusion', so pressing 下一步 restarts the Coulomb-approach before the E=mc² flash narration becomes visible — this is exactly the spec-mandated forced-phase coupling, pedagogically acceptable (approach takes ~5.5 s), no change requested. No Critical/High/Medium open findings; one Low open observability gap (F-003, non-blocking).

## Findings

### F-001: FR-001 (AC-06 wrong physics numbers) verified resolved end-to-end

- **Severity**: high
- **Status**: verified
- **Blocking**: false
- **Confidence**: 0.97
- **Line**: 18 (AC-06)
The rejected prior finding (AC-06 demanded 17.6 MeV alongside a wrong 0.0256 u mass defect that converts to ~23.85 MeV and a fission-era 3.2e-11 J) is resolved at every stage. 01-requirements.md AC-06 now specifies the corrected, internally consistent chain: 2.014102 u + 3.016049 u − 4.002602 u − 1.008665 u = 0.018884 u ≈ 0.0189 u; 0.018884 u × 931.494 MeV/u ≈ 17.59 ≈ 17.6 MeV; 17.6 MeV × 1.602e-13 J/MeV ≈ 2.82e-12 J; and explicitly FORBIDS the literals '0.0256' and '3.2e-11'. The delivered page carries the corrected chain verbatim (index.html lines 58–63: reaction +17.6 MeV, split 14.1/3.5 MeV, mass defect 0.018884≈0.0189 u, E=mc² ≈2.82e-12 J) and js/main.js PHYS (lines 31–46) is the single source with MASS_DEFECT_U=0.018884, E_J=2.82e-12. grep over nuclear-fusion-3d/ confirms the forbidden literals appear in ZERO production files (only in the tests that assert their absence, tests/phase1-shell.test.mjs:223-230, tests/phase2-runtime.test.mjs:236-237 — which also extends the deterministic pin to '0.0189' as the gate feedback recommended).

**Evidence**
- docs/specifications/.../01-requirements.md:18 AC-06 'mass defect ≈ 0.0189 u … = 0.018884 u … ≈ 2.8×10⁻¹² J (2.82e-12 J) … must NOT contain the incorrect literals 0.0256 or 3.2e-11'
- nuclear-fusion-3d/index.html:61-63 '0.018884 u ≈ 0.0189 u' / '× 931.494 MeV/u ≈ 17.6 MeV' / '≈ 2.82e-12 J'
- nuclear-fusion-3d/js/main.js:39,41,45 MASS_DEFECT_U_ROUNDED '0.0189 u', Q_MEV 17.6, E_J 2.82e-12
- grep '0.0256|3.2e-11' nuclear-fusion-3d/ → matches only in tests/*.mjs (negative assertions), none in html/css/js production files

**Recommendation**

No action. The corrected requirements artifact was revised upstream, downstream artifacts (BDD SCENARIO-014/015/016, spec, implementation, tests) explicitly respond to it, and the deterministic gate now pins '0.0189' while forbidding the wrong literals. Keep the PHYS single-source pattern if numbers ever change again.
### F-002: BDD-F-001 (SCENARIO-017 missing post-resume assertions) verified resolved

- **Severity**: medium
- **Status**: verified
- **Blocking**: false
- **Confidence**: 0.96
The rejected prior finding (SCENARIO-017's Then asserted only freeze outcomes, so a never-resumes implementation would pass) is resolved. 03-bdd-scenarios.md SCENARIO-017 now asserts, in addition to the freeze outcomes: 'the control toggles between the ⏸ 暂停 and ▶ 继续 labels as the state changes', 'after ▶ 继续 is pressed, all particle motion resumes and the phase clock advances again — the story is not stuck frozen', and 'the story continues from exactly the phase where it was frozen, with no phase skipped or replayed'. The implementation satisfies the new clauses: pause() sets state.paused=true and swaps the label to '▶ 继续' (main.js:622-625); resume() clears it and swaps back to '⏸ 暂停' (main.js:626-629); the single rAF loop gates ALL state accumulation (state.simTime += dt, state.phaseTime += dt, starfield motion, world.update, advancePhase) behind if (!state.paused) at main.js:668 while still calling clock.getDelta() every frame — so on resume the story continues from the frozen phaseTime with no phase skip or replay (each phase's update(), e.g. buildFusion's MERGE_T, is driven by state.phaseTime, not wall time).

**Evidence**
- docs/specifications/.../03-bdd-scenarios.md SCENARIO-017 Then block: 'And the control toggles between the ⏸ 暂停 and ▶ 继续 labels…' / 'And after ▶ 继续 is pressed, all particle motion resumes and the phase clock advances again — the story is not stuck frozen' / 'continues from exactly the phase where it was frozen'
- nuclear-fusion-3d/js/main.js:622-629 pause()/resume() with label swap
- nuclear-fusion-3d/js/main.js:668 'if (!state.paused) { state.simTime += dt; state.phaseTime += dt; … updateWorld(dt); advancePhase(); }' — every frame still consumes clock.getDelta() so no time jump on resume

**Recommendation**

No action. Both halves of AC-07 (freeze AND resume) are now observable in the scenario and implemented; regression risk is covered by the window.fusionSim.isPaused/getPhaseTime probes usable at runtime.
### F-003: window.__errs trap misses unhandledrejection, so module/CDN load failures can evade the AC-09 clean-load gate

- **Severity**: low
- **Status**: open
- **Blocking**: false
- **Confidence**: 0.6
- **Line**: 72-73
The console-error trap used by the AC-09 clean-load gate registers only window.addEventListener('error', …). Static script and window errors are captured, but ES-module import failures (e.g., a failed three.js CDN fetch in <script type="module">) surface as unhandled promise rejections in Chromium and would NOT be recorded in window.__errs — a page could appear 'clean' to the trap while its animation silently never starts. Suggested fix: window.addEventListener('unhandledrejection', e => window.__errs.push(String(e.reason && e.reason.message || e.reason))); alongside the existing handler. Optionally also set window.__ready only after a successful first render if a stronger gate is wanted — though the current __ready semantics (module top-level executed) is acceptable.

**Evidence**
- nuclear-fusion-3d/index.html:72-73 'window.__errs = []; window.addEventListener('error', e => window.__errs.push(e.message));' — the only trap registered; no 'unhandledrejection' listener anywhere in the page (grep confirmed 0 hits)
- nuclear-fusion-3d/js/main.js:686 'window.__ready = true' set at module top-level after init() regardless of whether any import/render subsequently fails asynchronously

**Recommendation**

Add an unhandledrejection listener pushing into window.__errs (one line) so CDN/module-load failures are visible to the AC-09 manual gate. Non-blocking; this mirrors the established site pattern, so adopting it site-wide is a follow-up, not a merge gate for this page.
