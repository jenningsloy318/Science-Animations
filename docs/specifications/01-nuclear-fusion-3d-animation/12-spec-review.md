# Specification Review: Spec Review — 核聚变 3D 交互动画 (nuclear-fusion-3d/) Technical Specification, Implementation Plan & Task List

- **Date**: 2026-08-27
- **Generated**: 2026-08-27T14:09:57.959+08:00
- **Author**: super-dev:spec-reviewer

---

## Verdict: Approved with Comments

Round-2 Fagan inspection of the nuclear-fusion-3d specification trio (09-specification.md, 10-implementation-plan.md, 11-task-list.md). Both previously blocking convergence-ledger findings are now GENUINELY resolved upstream and verified by direct artifact inspection: (1) FR-001 — 01-requirements.md AC-06 now carries the physically correct, internally consistent D–T chain (mass defect 0.018884 u ≈ 0.0189 u; ×931.494 MeV/u ≈ 17.59 ≈ 17.6 MeV; ×1.602e-13 J/MeV ≈ 2.82e-12 J; split 14.1/3.5 MeV) and its deterministic gate requires '17.6'/'0.0189'/'mc' while forbidding '0.0256'/'3.2e-11'; the spec engineers this into §2 PHYS (single source) + the index.html physics panel, and the Phase-1 enforced deliverables pin '17\.6'/'0\.0189'/'E=mc'/'14\.1'/'2\.82' positively and forbid '0\.0256'/'3\.2e-11' on index.html and js/main.js. (2) BDD-F-001 — SCENARIO-017's Then block now asserts post-resume outcomes verbatim: "after ▶ 继续 is pressed, all particle motion resumes and the phase clock advances again — the story is not stuck frozen", continuation from exactly the frozen phase with no skip/replay, and the ⏸/▶ label toggle; the spec's §1/§7 simTime-accumulator pattern plus the Phase-2 '.running\s*=' forbid satisfies every clause by construction, and Phase-2 testing step (4) asserts it at runtime. Traceability is fully closed: all 9 ACs (verified to exist in 01-requirements.md) and all 24 SCENARIOs (verified against 03-bdd-scenarios.md, coverage summary 9/9, 0 uncovered) are cited, phase-mapped (Phase 1 = 10 scenarios, Phase 2 = 14), and every task carries scenario refs. Testability contract is satisfied: BOTH scenario-mapped phases declare enforced deliverables.requireScenarios (PREFERRED form) with explicit SCENARIO-NNN ids, plus requireFiles/requireContains/requireNotContains. FR-002, BDD-F-002, BDD-F-003 verified; FR-003 addressed (the '2\.82' positive pin is in the enforced contract); BDD-R3-001 correctly deferred. One residual P3 advisory: the spec's Testing-Strategy narrative and FR-003 response name a '3\.5' positive pin and a css-file sweep of the forbidden literals that the enforced Phase-1 deliverables contract does not carry (contract pins '14\.1' and '2\.82' but not '3\.5'; requireNotContains covers index.html and js/main.js but not css/style.css) — cosmetic narrative/contract drift, non-blocking, the corrected joule figure is enforced either way. No P0/P1 defects; all prior blockers resolved; verdict: Approved with Comments.

## Findings

### SPEC-F-001: Testing-strategy narrative names checks the enforced deliverables contract does not carry ('3\.5' pin; css-file forbidden-literal sweep)

- **Severity**: P3
- **Owner Stage**: spec
- **Status**: open
- **Recommendation**: Either add `nuclear-fusion-3d/index.html matches 3\.5` to Phase 1 deliverables.requireContains (and optionally a css requireNotContains for 0\.0256/3\.2e-11), or drop '3.5' and the every-file wording from the Testing Strategy narrative and the FR-003 response text. No upstream change required.
The spec's Testing Strategy (c) and the FR-003 response claim positive pins '14.1', '3.5', '2.82' plus forbidden '0.0256'/'3.2e-11' 'absent from every file under nuclear-fusion-3d/'. The plan's enforced Phase 1 deliverables contract implements '14\.1' and '2\.82' in requireContains but omits '3\.5'; and requireNotContents for the forbidden literals cover index.html and js/main.js only, not css/style.css (the task-list verification prose does cover css, so the gap is contract-vs-narrative, not a coverage hole in the runbook). Impact is cosmetic: the corrected joule figure '2\.82' — the actual FR-003 ask — IS enforced, and 0.0256/3.2e-11 cannot legitimately appear in css anyway. Generalization rule: wherever the spec narrative names a deterministic check, the plan's enforced deliverables block must carry the identical literal, or the narrative must not claim it.

Evidence:
- 09-specification.md Testing Strategy: "plus spec-strengthened positive pins '14.1', '3.5', '2.82'" and "forbidden literals '0.0256'/'3.2e-11' absent from every file under nuclear-fusion-3d/"
- Prior Review Response FR-003: "alongside additional positive pins '14\.1' and '3\.5'"
- 10-implementation-plan.md Phase 1 requireContains: index.html matches 17\.6 / 0\.0189 / E=mc / 14\.1 / 2\.82 — no 3\.5 entry; requireNotContains for 0\.0256 / 3\.2e-11 list only index.html and js/main.js

## Prior Finding Resolutions

### FR-001

- **Status**: verified
- **Owner Stage**: requirements
- **Evidence**: 01-requirements.md AC-06: "mass defect ≈ 0.0189 u (... = 0.018884 u), released energy ≈ 2.8×10⁻¹² J (2.82e-12 J)... 0.018884 u × 931.494 MeV/u ≈ 17.59 ≈ 17.6 MeV; 17.6 MeV × 1.602×10⁻¹³ ≈ 2.82×10⁻¹² J; must NOT contain '0.0256' or '3.2e-11'"; spec §2 PHYS chain matches; plan Phase 1 requireContains 17\.6/0\.0189/2\.82/14\.1 + requireNotContains 0\.0256/3\.2e-11 on index.html and js/main.js.
Verified in the current upstream artifact: AC-06 in 01-requirements.md now carries the physically correct and internally consistent chain — 0.018884 u (= 2.014102 + 3.016049 − 4.002602 − 1.008665), × 931.494 MeV/u ≈ 17.59 ≈ 17.6 MeV, 17.6 × 1.602e-13 ≈ 2.82e-12 J, split 14.1/3.5 — and the deterministic gate requires '17.6'/'0.0189'/'mc' while forbidding '0.0256'/'3.2e-11'. The spec engineers this into the §2 PHYS single-source module and the index.html physics panel, with the literals enforced in the Phase 1 deliverables contract.
### FR-002

- **Status**: verified
- **Owner Stage**: requirements
- **Evidence**: 01-requirements.md AC-08: "restarts the 3D animation immediately from the 等离子体 phase WITHOUT changing the current guided-tour step or its narration panel"; 09-specification.md §6/§7 ownership contract; 10-implementation-plan.md Phase 2 requireContains `startRun\('plasma'\)`.
Verified: AC-08 explicitly pins reset semantics (restart from 等离子体, tour step/narration unchanged, auto-repeat after flash fade), and the spec implements the separation of concerns — §7 reset() = startRun('plasma') touching animation state only; tour state is owned exclusively by §6 and never read or written by reset. Phase 2 runtime check (5) asserts exactly this.
### FR-003

- **Status**: addressed
- **Owner Stage**: requirements
- **Evidence**: 10-implementation-plan.md Phase 1: "`nuclear-fusion-3d/index.html` matches `2\.82`"; minor narrative drift on the '3\.5' pin captured as SPEC-F-001 (P3, non-blocking).
Core advisory satisfied: the enforced Phase 1 contract positively pins the corrected joule figure via requireContains '2\.82' on nuclear-fusion-3d/index.html alongside '14\.1', strictly stronger than AC-06's minimum gate ('17.6', '0.0189', 'mc'). Note: the response text also names a '3\.5' pin that is absent from the enforced requireContains list — tracked as advisory SPEC-F-001; does not affect resolution of the original ask (the joule pin).
### BDD-F-001

- **Status**: verified
- **Owner Stage**: bdd
- **Evidence**: 03-bdd-scenarios.md SCENARIO-017: "And after ▶ 继续 is pressed, all particle motion resumes and the phase clock advances again — the story is not stuck frozen / And the story continues from exactly the phase where it was frozen, with no phase skipped or replayed"; AC-07 traceability entry records BDD-F-001 resolved; 10-implementation-plan.md Phase 2 requireNotContains `\.running\s*=`.
Verified in the current upstream artifact: SCENARIO-017's Then block now binds observable resume outcomes — "after ▶ 继续 is pressed, all particle motion resumes and the phase clock advances again — the story is not stuck frozen", "the story continues from exactly the phase where it was frozen, with no phase skipped or replayed", plus the ⏸/▶ label-toggle clause. The spec's §1/§7 simTime-accumulator pattern (clock.getDelta() every frame, accumulate only when unpaused) satisfies them by construction; Phase 2's runtime check (4) asserts resume with no time jump and no phase skip/replay, and the enforced forbid of '.running\s*=' prevents the THREE.Clock trap.
### BDD-F-002

- **Status**: verified
- **Owner Stage**: bdd
- **Evidence**: 03-bdd-scenarios.md Traceability AC-04 entry; 09-specification.md §3 startRun('atoms') for initial load, startRun('plasma') for reset/auto-repeat; Phase 2 runtime check (3).
Verified: SCENARIO-010/AC-04 traceability entry scopes strict atoms→plasma→fusion ordering to one single run and explicitly allows restart-from-等离子体 runs; the spec implements startRun('atoms') for initial load and startRun('plasma') for reset and auto-repeat, matching the scoped claim exactly.
### BDD-F-003

- **Status**: verified
- **Owner Stage**: bdd
- **Evidence**: 09-specification.md Module Map §1; 10-implementation-plan.md Phase 1 requireContains `isWebGL2Available` on js/main.js; task-list bootstrap task.
Verified: the spec uses WebGL.isWebGL2Available() for detection, renders a custom Chinese fallback div into #stage, and returns before constructing WebGLRenderer — so no English getWebGL2ErrorMessage() text and no renderer-construction console error can occur on the degradation path; SCENARIO-024 is mapped to Phase 1 and verified by inspection (no forced-failure hook shipped).
### BDD-R3-001

- **Status**: deferred
- **Owner Stage**: bdd
- **Evidence**: 10-implementation-plan.md Phase 1 deliverables.requireScenarios includes SCENARIO-014/015/016; requireContains pins 17\.6/0\.0189/E=mc/14\.1/2\.82; requireNotContains 0\.0256/3\.2e-11.
Deferred is correct: the advisory concerns When-clause phrasing in the BDD document itself (SCENARIO-015/016 reviewer-action wording), not the deliverable; the deterministic source-literal checks it pointed at are fully implemented in the Phase 1 enforced contract, so no spec or code action is possible or needed.

## Dimension Reviews

### Completeness

- **Status**: pass

5/5 — All 9 ACs (AC-01..09) and all 24 scenarios have owning spec sections and phases; error path (WebGL2 fallback, SCENARIO-024) fully specified; NFRs (≥60 fps, ≤2,000-particle cap, pixelRatio≤2, dispose-on-rebuild, network hygiene) covered in spec + plan + tasks.
### Consistency

- **Status**: pass-with-comments

4/5 — DOM ids (btnTour/toggleBtn/resetBtn/camBtn/tourPanel set), PHYS, TOUR_STEPS, window.fusionSim, startRun('plasma'), and phase labels are identical across spec/plan/task-list. One P3 drift: Testing-Strategy/FR-003-response narrate a '3\.5' positive pin and a css-file forbidden-literal sweep that the enforced Phase-1 requireContains/requireNotContains contract omits (SPEC-F-001).
### Feasibility

- **Status**: pass

5/5 — Zero-build static pattern mirrors the verified ion-thruster-3d/ template; all three/addons imports (OrbitControls, CSS2DRenderer, capabilities/WebGL) exist in the pinned three@0.160.0; simTime-accumulator pause and dispose-on-rebuild patterns are sound; single-file module map with no circular dependencies; worktree caddy file-server workaround for the main-checkout Caddyfile root is correctly engineered.
### Testability

- **Status**: pass

5/5 — Both scenario-mapped phases declare enforced deliverables.requireScenarios (Phase 1: 001-006/014/015/016/024; Phase 2: 007-013/017-023), plus requireFiles/requireContains/requireNotContains regex gates. Runtime checks are concrete and observable via the enumerated window.fusionSim API; thresholds numeric (60 fps, 2,000 particles, 5 tour steps, 3 phases, pixelRatio≤2, ≥3 auto-repeat cycles for memory stability).
### Traceability

- **Status**: pass

5/5 — Spec cites AC-01..AC-09 and SCENARIO-001..SCENARIO-024, all verified to exist in 01-requirements.md and 03-bdd-scenarios.md (BDD coverage summary: 9/9 ACs, 24/24 scenarios, 0 uncovered). Summary trace matrix maps every AC→scenarios→phase with no orphans; every task lists scenario refs. All six prior findings dispositioned in Prior Review Responses; both previously-blocking ones (FR-001, BDD-F-001) now verified in the upstream artifacts themselves.
### Grounding

- **Status**: pass

5/5 (~98%) — Repo-baseline claims (ion-thruster-3d template ids, import-map pin pattern, root card grid lines 119–141/190–229, Caddyfile :8321 root behavior) are consistent with the research/code-assessment prior-stage record and mutually consistent across all three artifacts; every file path, DOM id, addon path, and constant named in the spec maps to a real repo pattern or an explicitly CREATEd file. No hallucinated references found.
### Complexity

- **Status**: pass

5/5 — 3 created files + 1 tightly-scoped root index.html edit; no bundler/build/tooling; single PHYS single-source module prevents dual-source physics drift; TOUR_STEPS as a data array mirrors the existing template convention. No gold-plating or premature abstraction.
### Ambiguity

- **Status**: pass-with-comments

4/5 — window.fusionSim API fully enumerated with return types; state machine states/labels/advance gating explicit; PHYS constants fully numeric; pause/reset/camera/tour behaviors each given a precise contract; fallback path specified to the message language and return-before-renderer level. Residual: per-phase durations are intentionally implementation-defined (acceptable since tests poll getPhase() transitions, not fixed timings); '3\.5' narrative pin ambiguity captured as SPEC-F-001.
