# BDD Scenarios Review: BDD Scenario Review — 核裂变交互动画页（nuclear-fission-3d）03-bdd-scenarios.md

- **Date**: 2026-08-27
- **Generated**: 2026-08-27T21:09:23.056+08:00
- **Author**: super-dev:bdd-reviewer

---

## Verdict: Approved with Comments

Reviewed 28 scenarios against 10 acceptance criteria. D1 is fully satisfied: every AC-01..AC-10 maps to at least one scenario, every acRef is valid, and the traceability/coverage sections are internally consistent. Externally pinned facts were spot-verified against reality: window.fusionSim's measured surface (nuclear-fusion-3d/js/main.js:704-731) matches SCENARIO-005's 12-method set exactly (incl. gotoPhase and absence of setPhase/toggleAuto), and root index.html baselines (7 × .card--X::before rules, 7 link-* ids each ×1, exactly 1 card--fusion anchor) match the counts pinned in SCENARIO-021/023/024/025. Path completeness is strong: error paths exist for illegal gotoPhase keys (SC-007), pin violations (SC-003), gate-red compatibility (SC-023), and WebGL failure (SC-028); the requirements-stage corrections REQ-F-003/REQ-F-004 are correctly folded into SC-023/024/025 (count stays 7, fusion untouched, anchor-level regex scope). Terminology and all quantified literals match requirements verbatim. Three advisory items remain (none blocks implementation): SC-024 asserts card counts/content but leaves the after-solar-cell placement only in the When; SC-002 weakens the #homeBtn href=\"../index.html\" pin; SC-022/SC-003 state a policy/audit verdict rather than an observable outcome. This is round 1 of the BDD review loop — no prior BDD findings exist, so priorFindingResolutions is intentionally empty. All items are P3 suggestion-only — verdict: Approved with Comments.

## Findings

### BDD-F-001: SCENARIO-024 leaves card position after solar-cell unasserted in Then

- **Severity**: P3
- **Owner Stage**: bdd
- **Status**: open
- **Recommendation**: Add a Then clause asserting the card--fission anchor appears immediately after the id="link-solar-cell" card (e.g., document-order assertion), so placement is an observable outcome rather than a precondition of the action.
SCENARIO-024 embeds AC-09 clause c) — the new card must sit after the solar-cell card (id="link-solar-cell") — only in the When clause ('在 solar-cell 卡片之后追加新的核裂变入口卡'). The Then asserts anchor/id counts, card content, and preservation of existing anchors, but never asserts relative position. A wrong implementation that appends the card anywhere else in the file would still satisfy the Then, leaving AC-09c unverified by any scenario outcome.

Evidence:
- 03-bdd-scenarios.md SCENARIO-024 Given/When/Then
- 01-requirements.md AC-09 clause c)
### BDD-F-002: SCENARIO-002 drops the href="../index.html" pin for the home button

- **Severity**: P3
- **Owner Stage**: bdd
- **Status**: open
- **Recommendation**: Tighten the Then to '包含 #homeBtn 且 href="../index.html"' so the deterministic pin from AC-02 survives into the scenario and downstream tests.
AC-02 quantifies the home entry as #homeBtn with href="../index.html", but SCENARIO-002's Then only requires '页面包含返回首页入口'. A wrong href (e.g., absolute path or missing ../ prefix) would pass the scenario, weakening the mirror-the-sibling-shell contract that the AC pins deterministically. All other shell elements in this scenario (🎬 引导浏览按钮, ⏸/🔄/🎥 texts) keep their quantified wording.

Evidence:
- 03-bdd-scenarios.md SCENARIO-002 Then
- 01-requirements.md AC-02: '#homeBtn（href="../index.html"）'
### BDD-F-003: SCENARIO-022 (and SCENARIO-003) Then states policy rather than an observable outcome

- **Severity**: P3
- **Owner Stage**: bdd
- **Status**: open
- **Recommendation**: Optionally reformulate SC-022's Then as the observable outcome (directory-form invocation exits non-zero on Node v24.15.0, so gates use the glob form which exits 0), keeping the prohibition language in the AC only.
SCENARIO-022's Then asserts '该形式因确定性失败被明令禁止，门禁一律采用经实证的 glob 形式' — a policy statement about gate methodology, not an observable runtime outcome; the observable fact (directory-form run exits non-zero on Node v24.15.0) is only implied. Similarly, SCENARIO-003's Then ('判定为不合规必须修正后重验') asserts an audit verdict rather than a system effect. Both bind to real ACs (AC-08/AC-02) so coverage holds, and the observable enforcement lives in SCENARIO-021/SC-023; this is wording polish only.

Evidence:
- 03-bdd-scenarios.md SCENARIO-022 Then
- 03-bdd-scenarios.md SCENARIO-003 Then
- 01-requirements.md AC-08


## Dimension Reviews

### D1 AC coverage

- **Status**: pass

All 10 ACs covered by 28 scenarios; every acRef names a real AC; traceability section is bidirectionally complete and consistent with the coverage summary.
### D2 Path completeness

- **Status**: pass

Happy, edge, and error paths all present: illegal gotoPhase key (SC-007), wraparound both directions (SC-009), frozen-time resume (SC-010), shell pin violations (SC-003), gate-red compatibility rule (SC-023), WebGL failure fallback (SC-028).
### D3 Observable behavior

- **Status**: pass-with-notes

Then-clauses are overwhelmingly observable (counts, method sets, getPhase/getTourStep/getSimTime values, exit codes). Two audit-style scenarios (SC-003, SC-022) assert a compliance verdict/policy rather than a runtime outcome — advisory only since the underlying ACs are gate-methodology rules already enforced by SC-021/SC-023.
### D4 Given/When/Then integrity

- **Status**: pass-with-notes

Concrete and self-consistent throughout. One asymmetry: SC-024 places the after-solar-cell ordering (AC-09c) in the When rather than asserting it in the Then; SC-002 drops the href="../index.html" pin present in AC-02.
### D5 Consistency

- **Status**: pass

No contradictions; terminology, literals, counts (7 cards, 4 tour steps, 3 phases, 12-method API surface), and phase keys all match requirements verbatim; externally verified against the actual fusion main.js and root index.html.
