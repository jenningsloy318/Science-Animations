# Design Review: Design Review — 02-nuclear-fission-animation 07-design.md (round 2: verify F-D-05 & sourceAnchor resolutions)

- **Date**: 2026-08-27
- **Generated**: 2026-08-27T22:03:14.240+08:00
- **Author**: super-dev:design-reviewer

---

## Verdict: Approved with Comments

Round-2 review of the regenerated 07-design.md (2026-08-27T22:00). All four open convergence-ledger findings are resolved and verified against the live codebase. F-D-05: the unsatisfiable "Open → exactly once" gate is fixed in all three places (contract derivationRule, root-portal-card audit, fission-test-suite S3) to an incremental 7→8 delta+1 assertion; ground truth confirmed via grep (7 pre-existing occurrences at exactly the cited lines 196/203/210/217/224/232/239, all sibling span.card__arrow), and the change does not weaken AC-09g's existence-based requirement nor touch the fusion site. CF-design-0krjds9/1hml9qh/0grq8g9: all three sourceAnchors replaced with symbol-based anchors that exist in the cited files (index.html#link-solar-cell at line 235, index.html#card--fusion within the 7 ::before rules, nuclear-fusion-3d/index.html#es-module-shims@1.10.0). Enumeration-vs-reality verification (beyond the deterministic checker): root-link-id-allowlist's 7 pre-change ids match grep output at the exact cited lines and in order; card-before-rule-count-preservation's 7 rules match exactly; fusion-runtime-api-surface's 12 keys match the main.js 700-735 object literal verbatim; fission-mirror-runtime-tokens measured counts (importmap=1, three@0.160.0=2, es-module-shims@1.10.0=1) match the derivation rule; fission-shell-dom-ids arithmetic (30 total − 7 removed = 23) checks out. Requirements consistency: AC-01..AC-10 quantifiers mirrored without weakening any assertion, AC-08 zero-modification clause honored. No new blocking defects; one residual P3 advisory (line-range citation drift 703-727 vs 703-731 for the same fusionSim surface, owned upstream at requirements, no design change required). Design is fully grounded and ready for the spec stage.

## Findings

### F-D-R2-01: Line-range citation drift between design (main.js:703-731) and AC-03 (main.js:703-727) for the same fusionSim surface

- **Severity**: P3
- **Owner Stage**: requirements
- **Status**: open
- **Recommendation**: No design change required. When the spec stage cites the fusionSim surface, use the symbol anchor (nuclear-fusion-3d/js/main.js#fusionSim) or a single agreed range; optionally note the 727-vs-731 drift back to the requirements stage as a cosmetic correction.
01-requirements.md AC-03 cites the fusionSim surface as "nuclear-fusion-3d/js/main.js:703-727"; 07-design.md (fission-story-machine module and fusion-runtime-api-surface derivation rule) cites "main.js:703-731" (gotoPhase at 731 delegating to jumpToPhase at 638). Both refer to the same 12-key object literal (verified by grep of main.js 700-735: all 12 keys present), and AC-03 enumerates the identical 12 method names, so there is no semantic conflict — only a stale line-range upper bound in the requirements. Advisory only; the deterministic checker owns anchor existence, and the symbol anchor nuclear-fusion-3d/js/main.js#fusionSim is what actually gates implementation. Flagged so the spec stage cites one canonical range (or drops the range in favor of the symbol) rather than propagating two.

Evidence:
- 01-requirements.md AC-03: 『nuclear-fusion-3d/js/main.js:703-727：getPhase, …, gotoPhase(key)』
- 07-design.md fission-story-machine: 『window.fusionSim 实测表面（main.js:703-731）』
- 07-design.md fusion-runtime-api-surface derivation: 『行 703-731 … gotoPhase 在行 731 委托 jumpToPhase，行 638』
- grep of main.js 700-735 confirms the 12 keys getPhase…gotoPhase all present, matching both citations

## Prior Finding Resolutions

### F-D-05

- **Status**: verified
- **Owner Stage**: design
- **Evidence**: grep -c 'Open →' index.html = 7（行 196/203/210/217/224/232/239，全为既有卡 span.card__arrow）与设计声称的改前计数逐行一致；07-design.md Contract root-card-addition-markers derivationRule 明文『改前 7 → 改后恰 8（纯追加 delta 恰 +1），绝不作恰 1 断言』；root-portal-card 审计项与 fission-test-suite S3 同口径；AC-09g 存在性要求不受影响。
Design regenerated (2026-08-27T22:00) with the single-marker counting fix in all three required places: contract derivationRule (改前实测 7 → 改后恰 8, delta 恰 +1, 绝不作「恰 1」断言), module root-portal-card audit item, and fission-test-suite S3. Other six markers retain 0→恰1.
### CF-design-0krjds9

- **Status**: verified
- **Owner Stage**: design
- **Evidence**: sed -n '235p' index.html = '<a class="card card--solar" href="solar-cell/" id="link-solar-cell">'；grep -on 'id="link-…"' 输出 7 值与 root-link-id-allowlist 枚举逐一相符（192/199/206/213/220/228/235）。
sourceAnchor changed from phantom line number L196 to symbol index.html#link-solar-cell.
### CF-design-1hml9qh

- **Status**: verified
- **Owner Stage**: design
- **Evidence**: grep -o '\.card--\w+::before {' 实测恰 7 条（slingshot/car/ion/ion3d/atom/solar/fusion），与枚举闭包逐字一致；'.card--fusion::before {' 存在于 index.html 内联样式表。
sourceAnchor changed from L60 to symbol index.html#card--fusion.
### CF-design-0grq8g9

- **Status**: verified
- **Owner Stage**: design
- **Evidence**: sed -n '105,118p' 显示 script src=…es-module-shims@1.10.0/dist/es-module-shims.js；实测计数 importmap=1、three@0.160.0=2、es-module-shims@1.10.0=1，与 derivation rule (1/2/≥1) 一致。
sourceAnchor changed from L111 to symbol nuclear-fusion-3d/index.html#es-module-shims@1.10.0.

## Dimension Reviews

### D1 Interface contracts

- **Status**: pass

window.fissionSim 12-method surface (verbatim-mirrored from fusionSim), PHASES data shape {key,duration,label[]}, 23-id DOM contract, gotoPhase legal-key closure with silent-ignore on illegal keys, __errs/__ready bootstrap flags, pause/resume freeze semantics, and per-module 输入/输出 lines all explicit. No interface named without a shape.
### D2 Feasibility & grounding

- **Status**: pass

Every integration point re-verified against actual files this round: Open → pre-count 7 at cited lines; 7 sibling link ids at lines 192-235; 7 .card--X::before rules matching enumeration exactly; 12 fusionSim keys at main.js 703-731; runtime token counts 1/2/1 in fusion index.html; fusion test baseline 33/33 glob form. All sourceAnchors now cite real symbols, not phantom line numbers.
### D3 Consistency with requirements

- **Status**: pass

AC-01..AC-10 all mapped; AC-09a-g fully covered by root-portal-card audit and S3 assertions; the revised incremental Open → counting satisfies AC-09g's existence requirement without weakening any AC quantifier and requires zero changes to the fusion site (AC-08 zero-modification clause preserved). AC-04 circular wrap intentionally differs from fusion's clamp, as the AC mandates. Only cross-artifact residue: line-range citation nit (F-D-R2-01, non-blocking).
### D4 Data flow & state

- **Status**: pass

Input → fissionSim state machine (getDelta-accumulated phase clock) → single rAF loop → Three.js scene + HUD text; tour steps → gotoPhase; errors → __errs → friendly degradation → __ready terminal flag. No dangling producer/consumer; state {phaseKey,phaseTime,simTime,paused,autoAdvance} ownership explicit.
### D5 Complexity / YAGNI

- **Status**: pass

11 modules proportional to a mirrored static site; per-module mirror-copy strategy with directory-level decoupling justified by file:// self-containment (AC-01) and minimal regression surface; tempHud replacement with conservation HUD justified against AC-05/AC-06; rejected alternatives documented (clamp, 3/5-step tour, per-phase timers, shared npm).
### D6 Numeric constants

- **Status**: pass

Every constant is measurement-derived with method stated: Open → 7→8 delta +1, six markers 0→1, 7 ::before rules preserved, 8 link ids each exactly 1, token counts 1/2/1, rAF 1 / setInterval+setTimeout 0, 12-method surface, 23 mirrored ids from 30−7, a11y thresholds (44px, 4.5:1/3:1) with WCAG anchor. No unjustified magic numbers.
