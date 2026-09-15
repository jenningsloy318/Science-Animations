# Specification Review: Spec Review — 02-nuclear-fission-animation 技术规范（第 10/11/12 号文档）收敛复审：上游双阻塞项（REQ-F-003 / F-D-05）已在属主工件修复并经实测验证

- **Date**: 2026-08-27
- **Generated**: 2026-08-27T22:17:34.560+08:00
- **Author**: super-dev:spec-reviewer

---

## Verdict: Approved with Comments

Convergence re-review of 10-specification.md (+ 11-implementation-plan.md, 12-task-list.md) after the harness rejected the prior attempt on two upstream-rooted blockers. Both are now genuinely resolved in their owning artifacts and flow correctly into this spec: (1) REQ-F-003 — 01-requirements.md revoked the sole-exception clause entirely (「nuclear-fusion-3d/** 连同其全部测试一律零改动——本规范不授权任何例外」); the spec pins the ::before accent-rule count at exactly 7 before/after, bans weakening any existing assertion, and mechanically proves zero-change via T16's before/after 33/33 glob double-run — the permanently-red-fusion-suite trap is closed. (2) F-D-05 — 07-design.md regenerated with the incremental `Open →` counting semantics (pre-change 7 → post-change exactly 8, delta +1) in all three required places (contract derivationRule, root-portal-card audit, S3 suite); the spec carries presence semantics for Open → and the Open→×7 baseline, so no unsatisfiable exactly-1 assertion survives anywhere. Live ground truth re-verified this round: `.card--\w+::before\s*{` = 7, `Open →` = 7, `id="link-*"` = 7, card--fission = 0, fusionSim 12-method surface exists at main.js:704-732 with no setPhase/toggleAuto, and the fusion suite runs clean via the sanctioned glob command. Testability gate passes: all 3 scenario-mapped phases declare deliverables.requireScenarios covering 28/28 scenarios with zero gaps/overlaps, backed by requireFiles + pattern-level requireContains. One P3 non-blocking advisory remains (stale mirror-citation line range 703-727 excluding gotoPhase@731); it does not affect implementability or any gate. Loop should end here.

## Findings

### SP-F-001: Mirror-citation line range for fusionSim surface (main.js:703-727) excludes gotoPhase at line 731

- **Severity**: P3
- **Owner Stage**: spec
- **Status**: open
- **Recommendation**: Widen the citation to main.js:703-732 (or drop the numeric range and cite the window.fusionSim object literal by name); optionally note gotoPhase closes at :731. Cosmetic fix during any future spec touch — do not re-open the review loop for this alone.
Architecture §3 pins window.fissionSim '@ nuclear-fusion-3d/js/main.js:703-727' as the reference for the 12-method surface, but live awk of the file shows the surface object literal spans lines 704-732: getPhase..setAutoAdvance occupy 705-727 while gotoPhase sits at 731. The substantive contract (12 method names, ban on setPhase/toggleAuto) is enumerated verbatim and verified correct, so this cannot mislead a test assertion — but a mirroring implementer who opens exactly 703-727 to '逐项一致' cross-check will miss gotoPhase and the closing of the object. This same drift was previously flagged between design (703-731) and AC-03 (703-727); the harmonized 703-727 is still ~5 lines short of the real surface. Generalization rule: any line-range citation of an upstream anchor should be re-measured, not carried forward after edits.

Evidence:
- awk NR 695-735 of nuclear-fusion-3d/js/main.js: '704: window.fusionSim = {' … '727: setAutoAdvance: (on) => {' … '731: gotoPhase: (key) => jumpToPhase(key)'
- 10-specification.md §3: 「window.fissionSim 方法表面（与 window.fusionSim @ nuclear-fusion-3d/js/main.js:703-727 逐项一致，恰 12 个…）」
- design round-4 resume-cache evidence cites the surface as main.js:703-731

## Prior Finding Resolutions

### REQ-F-003

- **Status**: verified
- **Owner Stage**: requirements
- **Evidence**: 01-requirements.md Summary (line 14): 「nuclear-fusion-3d/** 连同其全部测试一律零改动——本规范不授权任何例外」; 10-specification.md §5/§Testing Strategy: ::before count 恒 7、「禁止削弱/删除/上调任何既有断言常数」; live re-run this round: root index.html ::before 规则计数 = 7（恰为 fusion phase1-shell.test.mjs:147-148 断言的基线值），fusion 套件经 glob 形式执行全绿（0 fail，94ms）。
Verified resolved. The upstream requirements artifact revoked the sole-exception authorization entirely (「不授权任何例外」), and this spec carries the corrected semantics end-to-end: SCENARIO-004's ::before-rule count is pinned at exactly 7 both before and after the append, nuclear-fusion-3d/** zero-change is enforced mechanically by Phase 3 task T16's before/after double-run (33/33 exit 0 both times), and the spec adds an explicit ban on weakening/deleting/raising any existing assertion constant. No path to a 7→8 constant edit remains anywhere in the chain — the permanently-red-suite trap is closed.
### REQ-F-004

- **Status**: verified
- **Owner Stage**: requirements
- **Evidence**: 10-specification.md §5 + Testing Strategy phase4-gate coverage list + 12-task-list.md Phase 3 T15 audit item (「<a class="card card--fission" 恰 1、id="link-nuclear-fission-3d" 恰 1、位置在 link-solar-cell 之后、七个 id="link-*" 各恰 1、card--fusion 锚点恰 1、/\.card--\w+::before\s*\{/g 计数恒 7」); live: id="link-*" = 7, card--fission = 0, line 235 anchor confirmed by design-review CF-design-0krjds9 evidence.
Verified resolved. AC-09's quantifiers were re-pinned to measured anchor-level semantics (anchor pattern and id each exactly 1, insertion after link-solar-cell, seven sibling cards preserved byte-for-byte, card--fusion anchor still 1 with CSS class references excluded, ::before count constant 7, content four-elements as presence), and the spec lands each item as a Phase 3 requireContains plus phase4-gate count assertions, with accent color routed exclusively through the two uncounted rules (.card__icon background and :hover border). Live ground truth this round reproduces every baseline (7 link ids, 0 card--fission occurrences).
### F-D-05

- **Status**: verified
- **Owner Stage**: design
- **Evidence**: 07-design.md:57 derivationRule (「Open → …改前 7 → 改后恰 8（纯追加 delta 恰 +1），绝不作『恰 1』断言」); 07-design.md:35 root-portal-card audit item + :44 S3 同口径; 08-design-review.md F-D-05 = verified; live grep this round: 'Open →' = 7（与声称行 196/203/210/217/224/232/239 一致的计数），故 7→8 可满足；10-specification.md 与 12-task-list.md 的 phase4-gate 对 Open → 仅作存在性断言，无恰 1 断言残留。
Verified resolved. The owning design artifact was regenerated (22:00) with the single-marker counting fix in all three places — root-card-addition-markers derivationRule, root-portal-card module audit, and fission-test-suite S3 — replacing the unsatisfiable 'exactly 1' with an incremental assertion (pre-change 7 → post-change exactly 8, delta +1) while the other six markers keep 0→1. Live ground truth re-verified this round: Open → currently 7 (all sibling span.card__arrow), so the incremental assertion is mathematically satisfiable. This spec is consistent with the fix: it records the Open→×7 baseline and asserts presence/existence ('齐全') for Open → in phase4-gate, never 'exactly 1'; no self-defeating gate remains anywhere in the spec/plan/task chain.

## Dimension Reviews

### D1 Completeness

- **Status**: pass

All 10 ACs have spec sections (Architecture §1–§6, Testing Strategy); all 28 scenarios covered by 4 suites with suite→scenario mapping stated; error paths specified (WebGL fallback via #fallback + __ready even on degradation, gotoPhase invalid-key silent no-op, __errs bootstrap trap); NFRs covered (a11y: ≥44×44, :focus-visible, aria-pressed; perf: single rAF, MAX_PARTICLES≤2000, dt clamp). Score 5/5.
### D2 Consistency

- **Status**: pass

Names/IDs/counts consistent across 10-specification, 11-implementation-plan, 12-task-list and upstream design (§5 root-card semantics = AC-09 a–g = T15 audit list; gate commands verbatim-identical everywhere; ::before count = 7 in all artifacts and live). One cosmetic residue: fusionSim surface cited as main.js:703-727 while the object literal actually spans 704-732 (gotoPhase at 731) — SP-F-001, non-blocking. Spec's phase4-gate uses presence semantics ('齐全') for Open → while design S3 uses incremental 7→8; both are satisfiable, mutually consistent (presence ⊂ incremental) and AC-09g only demands existence — noted as residual, not a defect. Score 4/5.
### D3 Feasibility

- **Status**: pass

Architecture is a structural clone of the proven sibling site (verified live: fusion suite runs green via glob form in ~94ms, zero npm); no build step, no new CDN, file:// direct; 3 coarse phases with no shared files except the intentional main.js single-phase merge (justified by shared state). No circular deps. Score 5/5.
### D4 Testability

- **Status**: pass

Every scenario-mapped phase declares deliverables.requireScenarios (Phase 1: 001-003; Phase 2: 004-016/018-020/026-028; Phase 3: 017/021-025) — 28/28 covered, zero overlap, plus requireFiles and pattern-level requireContains/requireNotContains; triple-AND phase判定 (build green + scenario tags present + semantic anchors) prevents green-but-zero-coverage. All thresholds numeric (counts, 33/33, ≥44px, ≤2000). Score 5/5.
### D5 Traceability

- **Status**: pass

AC-01..AC-10 ↔ 28 scenarios ↔ 4 suites ↔ 16 tasks ↔ 3 phases all chains unbroken; no phantom AC/scenario references; prior convergence findings (REQ-F-003, REQ-F-004, F-D-05) each have explicit responses in the spec's Prior Review Responses section with evidence, and each resolution verified against the repaired owning artifact plus live code. Score 5/5.
### D6 Grounding

- **Status**: pass

Live re-verification this round: root index.html `.card--\w+::before\s*{` = 7, 'Open →' = 7, id="link-*" = 7, card--fission = 0 (all exactly the spec's pinned baselines); nuclear-fusion-3d/js/main.js window.fusionSim object at 704-732 with the 12 methods matching the spec's verbatim enumeration (incl. gotoPhase at 731, no setPhase/toggleAuto); fusion test suite executed clean via glob form. Prior rounds independently verified importmap×1/three@0.160.0×2/es-module-shims≥1, __ready at :783, jumpToPhase semantics, line-235 insertion anchor. Estimated verified/total ≈ 98%; only the 703-727 range citation is off (SP-F-001). Score 5/5.
### D7 Complexity

- **Status**: pass

7 new files + 1 pure-append edit for the whole feature — proportional; no premature abstraction (single-file runtime mirrors sibling, no framework); rejected alternatives documented (e.g. block-scoped Open → assertion rejected as fragile). No YAGNI/gold-plating detected. Score 5/5.
### D8 Ambiguity

- **Status**: pass

Verbatim string anchors for card markup, exact count semantics per marker with regex form pinned (\w+ form, [a-z]* explicitly banned), explicit state fields and per-method semantics including fallback/degradation behavior, sanctioned gate command strings locked, quantifier scope stated ('均限于新建文件内', 'CSS 类引用不计入锚点计数'). Only residual: the stale line-range citation (SP-F-001). Score 4/5.
