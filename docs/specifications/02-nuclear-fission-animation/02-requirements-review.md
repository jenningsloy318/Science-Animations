# Requirements Review: Requirements Review — 核裂变交互动画页（nuclear-fission-3d）修订版审查（第 2 轮）

- **Date**: 2026-08-27
- **Generated**: 2026-08-27T21:02:16.686+08:00
- **Author**: super-dev:requirements-reviewer

---

## Verdict: Approved with Comments

Round-2 review of the revised requirements for 核裂变交互动画页 (nuclear-fission-3d). The prior blocking defect REQ-F-003 is RESOLVED in this revision: AC-08 now explicitly revokes the sole-exception clause that authorized editing SCENARIO-004's numeric constant, correctly restates that SCENARIO-004 counts .card--X::before accent RULES in root index.html (live count exactly 7, not cards), and pins nuclear-fusion-3d/** to zero changes outright — eliminating the prior contradiction with AC-09's zero-increment mandate and with AC-08's own no-weakening sentence. The red-suite trap (bumping 7→8 under a rule that forbids an 8th ::before rule) is gone. REQ-F-004 is likewise addressed: AC-09 now quantifies every root-index.html assertion with concrete regex scopes (anchor exactly 1, id exactly once, placement after link-solar-cell, seven link-* ids each exactly once, card--fusion anchor exactly 1 excluding CSS references, ::before count stays exactly 7). All D7 existence-grounding claims verified live against the repo: 7 card anchors including card--ion3d, ::before rule count = 7, window.fusionSim method surface at main.js:703-731 matches AC-03 exactly (getPhase/getPhaseTime/getSimTime/isPaused/pause/resume/reset/isTourActive/getTourStep/getMode/setAutoAdvance/gotoPhase; no setPhase/toggleAuto), three@0.160.0 ×2 verbatim-identical jsdelivr addresses, es-module-shims@1.10.0 present, #homeBtn href="../index.html", 33 sibling tests. AC-08 and AC-09 are now mutually consistent (both imply the ::before count stays 7 and the fusion tree needs zero edits). One new advisory (non-blocking) remains: AC-06's literal scope "nuclear-fission-3d/** 下全部 html/css/js 源码" can be read to include the enforcing tests/*.mjs, whose assertion strings must reference the forbidden fusion literals — recommend clarifying the scope to production sources (mirroring the sibling's walkProduction approach) to avoid a self-referential gate. No blocking findings remain.

## Findings

### REQ-F-005: AC-06 禁用字面量守卫的字面范围可读为包含 tests/*.mjs，执行该守卫的测试文件将自证违规

- **Severity**: P3
- **Owner Stage**: requirements
- **Status**: open
- **Recommendation**: 在 AC-06 增加一句范围界定：「本守卫扫描范围为 nuclear-fission-3d/ 的生产源文件（index.html、css/style.css、js/main.js），不含 tests/ 断言源码自身」，或将 tests/*.test.mjs 中的断言字符串形式显式豁免，与兄弟站 walkProduction 口径对齐。
AC-06 规定「nuclear-fusion-3d/** 下全部 html/css/js 源码中，D-T 聚变专属字面量 '0.018884'、'0.0189 u'、'17.6 MeV'、'2.82e-12'、'氘'、'氚' 的出现次数均必须为 0」。按字面读取，nuclear-fusion-3d/tests/*.test.mjs 属于该路径下的 js 源码；而执行该守卫的确定性测试文件自身必然以断言字符串形式引用这些禁用字面量（如 includes('氘')），按全树口径自证违规、套件恒红。兄弟站同类守卫（phase1-shell.test.mjs 的 forbidden-literals sweep）通过 walkProduction 只扫描生产文件（html+css+js，排除 tests/），规避了同一陷阱。建议非阻塞澄清：明确 AC-06 范围为生产源文件（index.html、css/style.css、js/main.js），排除 tests/ 下断言源码自身（或显式允许测试文件以断言字符串形式引用禁用字面量）。下游 BDD 大概率按生产文件口径实现（镜像兄弟站），故不构成阻塞。

Evidence:
- AC-06 原文：「直接规定 nuclear-fusion-3d/** 下全部 html/css/js 源码中，D-T 聚变专属字面量 '0.018884'、'0.0189 u'、'17.6 MeV'、'2.82e-12'、'氘'、'氚' 的出现次数均必须为 0」
- AC-01 要求新测试套件位于 nuclear-fission-3d/tests/（*.test.mjs，属 js 源码）
- nuclear-fusion-3d/tests/phase1-shell.test.mjs 的 forbidden-literals 扫描使用 walkProduction(pageDir)（仅生产文件，排除 tests/），存在可镜像的安全口径

## Prior Finding Resolutions

### REQ-F-003

- **Status**: verified
- **Owner Stage**: requirements
- **Evidence**: 当前 AC-08：「兼容语义修正（本条全文撤销此前『允许修正 SCENARIO-004 数值常数』的唯一例外授权，回应审查发现 REQ-F-003）：SCENARIO-004 实际统计的是根 index.html 中 /\.card--\w+::before\s*\{/g 强调规则的条数（当前实测恰为 7），并非卡片数目；由于 AC-09 禁止为 card--fission 新增此类规则，该计数在改动后保持 7 不变，因此 nuclear-fusion-3d/** 全部文件（含全部测试文件与任何常量）零改动。」实测复核：grep -oE '\.card--\w+::before[[:space:]]*\{' index.html | wc -l → 7；phase1-shell.test.mjs:147-148 统计的正是该正则的规则条数；AC-09 f) 明令该计数零增量，两 AC 现互恰。
修订版 AC-08 全文撤销了『允许修正 SCENARIO-004 数值常数』的唯一例外授权，并正确改述语义：SCENARIO-004 统计的是根 index.html 中 .card--X::before 强调规则条数（实测恰为 7），并非卡片数；由于 AC-09 禁止新增此类规则，计数保持 7，nuclear-fusion-3d/** 全部文件零改动。此修复消除了与 AC-09『正则匹配计数零增量』及 AC-08 自身『禁止削弱既有断言』的双重矛盾，也消除了『改常数到 8 将使聚变套件永久红』的门禁自毁路径。执行摘要同步声明『nuclear-fusion-3d/** 连同其全部测试一律零改动——本规范不授权任何例外』。
### REQ-F-004

- **Status**: verified
- **Owner Stage**: requirements
- **Evidence**: 当前 AC-09 原文：「根 index.html 仅做纯追加，全部量化词按实测正则界定范围（回应审查发现 REQ-F-004）：a) <a class="card card--fission" 恰好 1 处；b) id="link-nuclear-fission-3d" 恰好 1 次；c) 置于 link-solar-cell 之后；d) 七个 id="link-*" 各恰好 1 次；e) card--fusion 锚点仍恰 1 处（排除 CSS 类引用）；f) ::before 计数零增量；g) ☢️ 双语卡面与 href」
AC-09 现将根 index.html 的改动逐项量化为可判定的正则计数（锚点模式恰 1 处、id 字符串恰 1 次、置于 solar-cell 卡之后、七张既有卡锚点与 href 原样保留、card--fusion 锚点口径与 SCENARIO-003 一致排除 CSS 规则引用、::before 规则计数零增量、强调色只落在不受计数的规则上），范围界定与实测基线一致。

## Dimension Reviews

### D1 Testability

- **Status**: pass

Every AC carries objectively verifiable assertions: exact regex counts (importmap ×1, three@0.160.0 ×2, card--fission anchor ×1, ::before count stays 7), pinned API surface, verbatim science literals, and exit-code gates with the empirically validated glob form. No metric-free adjectives remain.
### D2 Unambiguity

- **Status**: pass-with-notes

Pass with one advisory (REQ-F-005): AC-06's forbidden-literal scope ('nuclear-fission-3d/** 下全部 html/css/js 源码') admits a reading that includes the enforcing test files, creating a self-referential gate; recommend scoping to production sources. All other ACs state inputs, outputs, error behavior, and edge boundaries explicitly.
### D3 Consistency

- **Status**: pass

The prior AC-08/AC-09 contradiction is eliminated: the sole-exception clause is revoked, and both ACs now independently imply the ::before count stays 7 and nuclear-fusion-3d/** needs zero edits — no clause authorizes weakening existing assertions. Terminology uniform (相位 keys, window.fissionSim, card--fission).
### D4 Completeness

- **Status**: pass

Error/edge paths present: WebGL degradation, pause-freeze/resume semantics, illegal gotoPhase keys, tour exit states. NFRs cover performance (≤2000 particles, single rAF, 60fps target, <2s first frame), accessibility (keyboard, focus-visible, aria-pressed, WCAG AA), robustness, and security (no eval/new Function, zero new third-party origins).
### D5 Feasibility/Scope

- **Status**: pass

Bounded and achievable: mirrors the proven nuclear-fusion-3d architecture, root index.html change is pure-append of one card, no build step, no hidden mega-requirement or gold-plating.
### D6 Resolved decisions

- **Status**: pass

No openQuestions section rendered; no deferred design work masquerading as requirements. All formerly contested semantics (SCENARIO-004 counting rules, exception revocation) are resolved in-document.
### D7 Existence grounding

- **Status**: pass

All cited baselines verified live: 7 card anchors incl. card--fusion and card--ion3d; ::before accent-rule count exactly 7; window.fusionSim surface incl. gotoPhase (main.js:731) matches AC-03 with setPhase/toggleAuto absent; 33 fusion tests; three@0.160.0 ×2 and es-module-shims@1.10.0 in sibling index.html; #homeBtn href="../index.html" present; SCENARIO-004 counts rules, as the corrected AC-08 now states.
