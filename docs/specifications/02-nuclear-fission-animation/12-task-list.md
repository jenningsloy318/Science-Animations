# Task List: 核裂变 3D 交互动画页（nuclear-fission-3d）技术规范、实施计划与任务清单

- **Date**: 2026-08-27
- **Generated**: 2026-08-27T22:14:19.217+08:00

---

- [ ] **Phase 1 静态外壳与测试脚手架（shell）**: 创建 nuclear-fission-3d/index.html：head 内联 __errs=[] 陷阱（先于 module 标签）、async es-module-shims@1.10.0、恰 1 个 importmap（three@0.160.0 两条逐字相同 jsdelivr 地址）、module 引 ./js/main.js；body 含 #homeBtn(href="../index.html")/#stage/#tools(#btnTour 🎬 引导浏览、#autoBtn、#prevBtn ⏮ 上一步、#nextBtn ⏭ 下一步)/#bottomBar(#toggleBtn ⏸ 暂停、#resetBtn 🔄 重置、#camBtn 🎥 重置视角)/#tourPanel(含 #tourCloseBtn 与 4 个 data-step 步骤项)/#phaseTitle/#phaseText/#ledgerPanel/#fallback。全部控件原生 button、title/aria-label、min 44×44px。
  - Scenario refs: SCENARIO-001, SCENARIO-002, SCENARIO-003
- [ ] **Phase 1 静态外壳与测试脚手架（shell）**: 创建 nuclear-fission-3d/css/style.css：克隆 fusion 暗空主题（body #04060d、panel rgba(15,23,42,.82)、ctrl #1e293b）；primaryMain #f59e0b 作琥珀主色；硬约束：禁 color:#b45309 于暗面文字、error/success 仅大字号/UI（正文状态用 #ef4444/#22c55e）、控件 ≥44px（不得照抄 fusion 42/38）、8px 栅格、断点 640/768/1024、全部控件 :focus-visible 轮廓。与 T1 可并行（不同文件）。
  - Scenario refs: SCENARIO-013
- [ ] **Phase 1 静态外壳与测试脚手架（shell）**: 编写 nuclear-fission-3d/tests/phase1-shell.test.mjs（node:test+node:assert/strict，复用 mustRead/walkProduction 辅助，测试名带 SCENARIO-NNN 标签）：①文件清单与无构建指纹（无 package.json、相对路径）；②chrome ID 全集合与 href；③importmap×1、three@0.160.0×2 逐字相同、es-module-shims≥1；④生产源码六聚变字面量扫描器（排除 tests/）。与 T1/T2 并行。
  - Scenario refs: SCENARIO-001, SCENARIO-002, SCENARIO-003
- [ ] **Phase 1 静态外壳与测试脚手架（shell）**: Phase 1 门禁：node --test nuclear-fusion-3d/tests/*.test.mjs（须 33/33 exit 0）与 node --test nuclear-fission-3d/tests/*.test.mjs（全绿）；禁止目录参数形式。
  - Scenario refs: SCENARIO-021, SCENARIO-022
- [ ] **Phase 2 裂变运行时·状态机·控制与导览（runtime+interaction）**: main.js 常量与状态机：MAX_PARTICLES=2000；PHASES 恰 3 项 [{key:'atoms',zh:'原子结构',duration:10},{key:'neutron',zh:'中子俘获',duration:12},{key:'fission',zh:'裂变反应',duration:14}]；TOUR_STEPS 恰 4 项（①atoms②neutron③fission④fission）；state 对象；advancePhase()（phaseTime≥duration 切下一相，末相 fission 保持停留、phaseTime 钳制）；jumpToPhase(key):boolean（合法键退导览→跳相清 phaseTime；非法键静默 return false）；startRun(key)。依赖：无（Phase 2 首任务）。
  - Scenario refs: SCENARIO-004, SCENARIO-006, SCENARIO-007
- [ ] **Phase 2 裂变运行时·状态机·控制与导览（runtime+interaction）**: main.js 三相位 3D 场景与主循环：initThree()（WebGL 失败返回 null）、buildU235Nucleus/spawnNeutron/buildExcitedU236/buildFragments(barium+krypton+3neutrons)/flashEnergy；animate() 含全文件唯一 requestAnimationFrame(，dt=Math.min(clock.getDelta(),0.05)，paused 门控 simTime/phaseTime 累积与粒子运动（冻结→冻结点续播），autoAdvance 时 advancePhase。依赖 T5。
  - Scenario refs: SCENARIO-010, SCENARIO-016, SCENARIO-026
- [ ] **Phase 2 裂变运行时·状态机·控制与导览（runtime+interaction）**: main.js 科学文案与守恒面板：字符串字面量逐字含「铀-235」「钡-141」「氪-92」「3 个中子」「200 MeV」「≈3.2e-11 J」「质量数」「电荷数」；fission 相显示 #ledgerPanel 两条验算式「质量数 236 = 141 + 92 + 3」「电荷数 92 = 56 + 36」；按相更新 #phaseTitle/#phaseText（原子结构→中子俘获→复核分裂+能量闪光）。依赖 T5，可与 T6 并行（同文件不同段落，顺序提交）。
  - Scenario refs: SCENARIO-014, SCENARIO-015, SCENARIO-016
- [ ] **Phase 2 裂变运行时·状态机·控制与导览（runtime+interaction）**: main.js window.fissionSim 恰 12 方法表面（getPhase/getPhaseTime/getSimTime/isPaused/pause/resume/reset/isTourActive/getTourStep/getMode/setAutoAdvance/gotoPhase；pause↔resume 同步 ⏸/▶ 文案；reset=startRun('atoms') 不动导览；getTourStep 未激活返回 null）+ 末行 window.__ready = true + WebGL 失败分支 showFallback（仍定义 fissionSim、仍置 __ready、跳过循环）。依赖 T5/T6。
  - Scenario refs: SCENARIO-005, SCENARIO-006, SCENARIO-007, SCENARIO-008, SCENARIO-027, SCENARIO-028
- [ ] **Phase 2 裂变运行时·状态机·控制与导览（runtime+interaction）**: main.js 播放控制接线：#prevBtn/#nextBtn 环绕（next: atoms→neutron→fission→atoms；prev 反向）；#toggleBtn ⏸/▶ 切换调 pause/resume；#camBtn 恢复默认机位（保存初始 camera.position+target，点击还原）；#autoBtn 调 setAutoAdvance 并同步文案「自动换幕：开/关」与 aria-pressed。依赖 T8。
  - Scenario refs: SCENARIO-009, SCENARIO-010, SCENARIO-011, SCENARIO-012, SCENARIO-013
- [ ] **Phase 2 裂变运行时·状态机·控制与导览（runtime+interaction）**: main.js 四步导览：#btnTour 点击开合；开启→tourActive=true、tourStep=0、展开 #tourPanel；进入第 k 步立即 jumpToPhase(TOUR_STEPS[k].phaseKey)（导览中 getPhase()===映射键）；再次点击 #btnTour 或 #tourCloseBtn→tourActive=false、tourStep=null、收起面板。依赖 T8。
  - Scenario refs: SCENARIO-018, SCENARIO-019, SCENARIO-020
- [ ] **Phase 2 裂变运行时·状态机·控制与导览（runtime+interaction）**: 编写 nuclear-fission-3d/tests/phase2-runtime.test.mjs：PHASES 形态/顺序/数值 duration、fissionSim 12 方法名白名单与 setPhase/toggleAuto 黑名单、gotoPhase 非法键静默守卫、reset 起始 atoms 不动导览、AC-05 八子串与两验算式、rAF(×1、setInterval(/setTimeout(×0、clock.getDelta、__errs/__ready、WebGL 降级分支、MAX_PARTICLES≤2000、守恒算术复核（235+1=236 等）。可与 T6-T10 并行（独立文件）。
  - Scenario refs: SCENARIO-004, SCENARIO-005, SCENARIO-006, SCENARIO-007, SCENARIO-008, SCENARIO-014, SCENARIO-015, SCENARIO-016, SCENARIO-026, SCENARIO-027, SCENARIO-028
- [ ] **Phase 2 裂变运行时·状态机·控制与导览（runtime+interaction）**: 编写 nuclear-fission-3d/tests/phase3-interaction.test.mjs：prev/next 环绕逻辑断言、⏸ 暂停/▶ 继续文案与冻结续播语义断言、camBtn 复位断言、autoBtn 文案+aria-pressed 同步断言、控件为原生 button 且 css 含 :focus-visible 与 ≥44px 尺寸、TOUR_STEPS 恰 4 条映射 ①atoms②neutron③fission④fission、退出后 getTourStep→null 与 isTourActive→false 断言。与 T11 并行。
  - Scenario refs: SCENARIO-009, SCENARIO-010, SCENARIO-011, SCENARIO-012, SCENARIO-013, SCENARIO-018, SCENARIO-019, SCENARIO-020
- [ ] **Phase 2 裂变运行时·状态机·控制与导览（runtime+interaction）**: Phase 2 门禁：node --test nuclear-fusion-3d/tests/*.test.mjs（仍 33/33）与 node --test nuclear-fission-3d/tests/*.test.mjs（phase1+2+3 套件全绿）。
  - Scenario refs: SCENARIO-021, SCENARIO-022
- [ ] **Phase 3 首页入口卡与全量回归门禁（hub+gate）**: 根 index.html 纯追加（唯一授权的既有文件改动）：在 id="link-solar-cell" 卡后插入 <a class="card card--fission" href="nuclear-fission-3d/" id="link-nuclear-fission-3d">（☢️ .card__icon + 「Nuclear Fission 核裂变」.card__title + 一句描述 .card__desc + Open → .card__arrow）；强调色只加 .card--fission .card__icon{background:…} 与 .card--fission:hover{border-color:…}，严禁新增 .card--X::before 规则；既有七卡锚点/href/id 原样保留。
  - Scenario refs: SCENARIO-024, SCENARIO-025
- [ ] **Phase 3 首页入口卡与全量回归门禁（hub+gate）**: 编写 nuclear-fission-3d/tests/phase4-gate.test.mjs：①根卡审计——<a class="card card--fission" 恰 1、id="link-nuclear-fission-3d" 恰 1、位置在 link-solar-cell 之后、七个 id="link-*" 各恰 1、<a class="card card--fusion" 锚点恰 1、/\.card--\w+::before\s*\{/g 计数恒 7、☢️/双语/Open →/href 断言；②全树污染扫描——nuclear-fission-3d 生产源码（排除 tests/）六字面量零出现；③锁定 sanctioned 门禁命令字符串 'node --test nuclear-fusion-3d/tests/*.test.mjs'。
  - Scenario refs: SCENARIO-017, SCENARIO-021, SCENARIO-022, SCENARIO-023, SCENARIO-024, SCENARIO-025
- [ ] **Phase 3 首页入口卡与全量回归门禁（hub+gate）**: 最终门禁矩阵：变更前基线与变更后各跑一次 node --test nuclear-fusion-3d/tests/*.test.mjs（均 33/33 exit 0，证 fusion 零改动）；node --test nuclear-fission-3d/tests/*.test.mjs 全绿（4 套件 ≥28 个场景标签全覆盖）；file:// 冒烟打开根 index.html 与 nuclear-fission-3d/index.html 各一次人工确认（无构建、无白屏）。依赖 T14/T15。
  - Scenario refs: SCENARIO-001, SCENARIO-021, SCENARIO-022, SCENARIO-023
