# Implementation Plan: 核裂变 3D 交互动画页（nuclear-fission-3d）技术规范、实施计划与任务清单

- **Date**: 2026-08-27
- **Generated**: 2026-08-27T22:14:19.216+08:00

---

## Phase 1: Phase 1 静态外壳与测试脚手架（shell）

新建 nuclear-fission-3d/ 目录：index.html（内联 __errs 陷阱、es-module-shims+importmap 逐字镜像、#homeBtn/#stage/#tools/#btnTour/#bottomBar/#tourPanel 外壳、44px 控件）、css/style.css（暗空主题 + 对比度修正 + :focus-visible）与首个测试套件 phase1-shell.test.mjs。本 phase 结束即可 file:// 打开看静态外壳（无 JS 剧情亦可），且既有 33/33 基线门禁保持绿。与 Phase 2/3 无共享文件，可与其并行启动。

Scenario refs: SCENARIO-001, SCENARIO-002, SCENARIO-003
### Test deliverables (enforced contract)
- deliverables.requireScenarios: SCENARIO-001, SCENARIO-002, SCENARIO-003
- deliverables.requireFiles: nuclear-fission-3d/index.html, nuclear-fission-3d/css/style.css, nuclear-fission-3d/tests/phase1-shell.test.mjs
- deliverables.requireContains:
  - `nuclear-fission-3d/index.html` matches `type="importmap"`
  - `nuclear-fission-3d/index.html` matches `three@0\.160\.0`
  - `nuclear-fission-3d/index.html` matches `es-module-shims@1\.10\.0`
  - `nuclear-fission-3d/index.html` matches `id="homeBtn"`
  - `nuclear-fission-3d/index.html` matches `id="stage"`
  - `nuclear-fission-3d/index.html` matches `id="tools"`
  - `nuclear-fission-3d/index.html` matches `id="btnTour"`
  - `nuclear-fission-3d/index.html` matches `id="bottomBar"`
  - `nuclear-fission-3d/index.html` matches `id="toggleBtn"`
  - `nuclear-fission-3d/index.html` matches `id="resetBtn"`
  - `nuclear-fission-3d/index.html` matches `id="camBtn"`
  - `nuclear-fission-3d/index.html` matches `id="tourPanel"`
  - `nuclear-fission-3d/index.html` matches `href="\.\./index\.html"`
  - `nuclear-fission-3d/index.html` matches `__errs`
  - `nuclear-fission-3d/css/style.css` matches `:focus-visible`
- deliverables.requireNotContains:
  - `nuclear-fission-3d/index.html` must NOT match `0\.018884|0\.0189 u|17\.6 MeV|2\.82e-12|氘|氚`
  - `nuclear-fission-3d/css/style.css` must NOT match `0\.018884|0\.0189 u|17\.6 MeV|2\.82e-12|氘|氚`
  - `nuclear-fission-3d/css/style.css` must NOT match `color\s*:\s*#b45309`
## Phase 2: Phase 2 裂变运行时·状态机·控制与导览（runtime+interaction）

一次性交付 js/main.js 全部运行时（状态机、三相位 3D 场景、科学文案、fissionSim 表面、播放控制、导览）及另两个测试套件 phase2-runtime/phase3-interaction。状态机与交互控件共享同一 state 对象且同文件实现，按合并规则不得拆 phase；套件编写任务可与实现任务并行（不同文件）。

Scenario refs: SCENARIO-004, SCENARIO-005, SCENARIO-006, SCENARIO-007, SCENARIO-008, SCENARIO-009, SCENARIO-010, SCENARIO-011, SCENARIO-012, SCENARIO-013, SCENARIO-014, SCENARIO-015, SCENARIO-016, SCENARIO-018, SCENARIO-019, SCENARIO-020, SCENARIO-026, SCENARIO-027, SCENARIO-028
### Test deliverables (enforced contract)
- deliverables.requireScenarios: SCENARIO-004, SCENARIO-005, SCENARIO-006, SCENARIO-007, SCENARIO-008, SCENARIO-009, SCENARIO-010, SCENARIO-011, SCENARIO-012, SCENARIO-013, SCENARIO-014, SCENARIO-015, SCENARIO-016, SCENARIO-018, SCENARIO-019, SCENARIO-020, SCENARIO-026, SCENARIO-027, SCENARIO-028
- deliverables.requireFiles: nuclear-fission-3d/js/main.js, nuclear-fission-3d/tests/phase2-runtime.test.mjs, nuclear-fission-3d/tests/phase3-interaction.test.mjs
- deliverables.requireContains:
  - `nuclear-fission-3d/js/main.js` matches `window\.fissionSim`
  - `nuclear-fission-3d/js/main.js` matches `getPhase\s*:`
  - `nuclear-fission-3d/js/main.js` matches `getPhaseTime\s*:`
  - `nuclear-fission-3d/js/main.js` matches `getSimTime\s*:`
  - `nuclear-fission-3d/js/main.js` matches `isPaused\s*:`
  - `nuclear-fission-3d/js/main.js` matches `pause\s*:`
  - `nuclear-fission-3d/js/main.js` matches `resume\s*:`
  - `nuclear-fission-3d/js/main.js` matches `reset\s*:`
  - `nuclear-fission-3d/js/main.js` matches `isTourActive\s*:`
  - `nuclear-fission-3d/js/main.js` matches `getTourStep\s*:`
  - `nuclear-fission-3d/js/main.js` matches `getMode\s*:`
  - `nuclear-fission-3d/js/main.js` matches `setAutoAdvance\s*:`
  - `nuclear-fission-3d/js/main.js` matches `gotoPhase\s*:`
  - `nuclear-fission-3d/js/main.js` matches `requestAnimationFrame\(`
  - `nuclear-fission-3d/js/main.js` matches `clock\.getDelta\(\)`
  - `nuclear-fission-3d/js/main.js` matches `key\s*:\s*'atoms'`
  - `nuclear-fission-3d/js/main.js` matches `key\s*:\s*'neutron'`
  - `nuclear-fission-3d/js/main.js` matches `key\s*:\s*'fission'`
  - `nuclear-fission-3d/js/main.js` matches `铀-235`
  - `nuclear-fission-3d/js/main.js` matches `钡-141`
  - `nuclear-fission-3d/js/main.js` matches `氪-92`
  - `nuclear-fission-3d/js/main.js` matches `3 个中子`
  - `nuclear-fission-3d/js/main.js` matches `200 MeV`
  - `nuclear-fission-3d/js/main.js` matches `3\.2e-11`
  - `nuclear-fission-3d/js/main.js` matches `质量数`
  - `nuclear-fission-3d/js/main.js` matches `电荷数`
  - `nuclear-fission-3d/js/main.js` matches `236\s*=\s*141\s*\+\s*92\s*\+\s*3`
  - `nuclear-fission-3d/js/main.js` matches `92\s*=\s*56\s*\+\s*36`
  - `nuclear-fission-3d/js/main.js` matches `window\.__ready`
  - `nuclear-fission-3d/js/main.js` matches `__errs`
  - `nuclear-fission-3d/js/main.js` matches `MAX_PARTICLES`
  - `nuclear-fission-3d/tests/phase3-interaction.test.mjs` matches `TOUR_STEPS`
  - `nuclear-fission-3d/tests/phase3-interaction.test.mjs` matches `aria-pressed`
- deliverables.requireNotContains:
  - `nuclear-fission-3d/js/main.js` must NOT match `setInterval\(`
  - `nuclear-fission-3d/js/main.js` must NOT match `setTimeout\(`
  - `nuclear-fission-3d/js/main.js` must NOT match `setPhase`
  - `nuclear-fission-3d/js/main.js` must NOT match `toggleAuto`
  - `nuclear-fission-3d/js/main.js` must NOT match `0\.018884|0\.0189 u|17\.6 MeV|2\.82e-12|氘|氚`
## Phase 3: Phase 3 首页入口卡与全量回归门禁（hub+gate）

根 index.html 在 link-solar-cell 卡后纯追加 ☢️ card--fission 入口卡（不含新 ::before 规则），编写 phase4-gate.test.mjs（根卡审计计数 + 全树聚变字面量零出现扫描），最后跑完整门禁矩阵：变更前后 nuclear-fusion-3d/tests/*.test.mjs 均 33/33 exit 0、nuclear-fission-3d/tests/*.test.mjs 全绿、file:// 冒烟。依赖 Phase 1/2 完成（全树扫描需全部生产文件就位）。

Scenario refs: SCENARIO-017, SCENARIO-021, SCENARIO-022, SCENARIO-023, SCENARIO-024, SCENARIO-025
### Test deliverables (enforced contract)
- deliverables.requireScenarios: SCENARIO-017, SCENARIO-021, SCENARIO-022, SCENARIO-023, SCENARIO-024, SCENARIO-025
- deliverables.requireFiles: nuclear-fission-3d/tests/phase4-gate.test.mjs
- deliverables.requireContains:
  - `index.html` matches `<a class="card card--fission"`
  - `index.html` matches `id="link-nuclear-fission-3d"`
  - `index.html` matches `href="nuclear-fission-3d/"`
  - `index.html` matches `Nuclear Fission 核裂变`
  - `index.html` matches `☢️`
  - `index.html` matches `\.card--fission \.card__icon`
  - `nuclear-fission-3d/tests/phase4-gate.test.mjs` matches `0\.018884`
  - `nuclear-fission-3d/tests/phase4-gate.test.mjs` matches `card--\\w\+::before`
  - `nuclear-fission-3d/tests/phase4-gate.test.mjs` matches `node --test nuclear-fusion-3d/tests/\*\.test\.mjs`
- deliverables.requireNotContains:
  - `nuclear-fission-3d/css/style.css` must NOT match `color\s*:\s*#b45309`
