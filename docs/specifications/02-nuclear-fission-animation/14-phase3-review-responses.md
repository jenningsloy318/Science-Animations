# Phase 3 实现者 reviewResponses — 收敛台账回应记录

Phase: Phase 3 首页入口卡与全量回归门禁（hub+gate）
Run: 2026-08-27/28 · worktree `02-nuclear-fission-animation`
Responds to: `.convergence-ledger.json` findings `REQ-F-003`、`F-D-05`、`CF-implementation-0ft7p5y`、`CF-spec-004q4so`、`CF-requirements-1lpogn1`

Status: a4（本轮）—— 测试文件为**冻结的 confirmed RED**（commit `28cbb23`，harness 快照，本轮逐字节未动，`git diff` 为空）；根 index.html 的 card--fission 纯追加为**本轮唯一生产改动**（+12/-0，零删除）。下文全部实测数据均为当前树实测。

---

## response to REQ-F-003（owner=requirements，上游，台账已标 [addressed]）— 采用「零改动口径」，本下游实现完全消解该发现

**结论：AC-08 的「唯一例外条款」（允许把 SCENARIO-004 的常数 7 上调）在本实现中既不必要、也未行使；nuclear-fusion-3d/** 零改动，既有断言常数 7 保持原值。**

证明（全部为当前树实测，非推断）：

1. SCENARIO-004 统计的是根 index.html 中 `.card--X::before` 强调**规则数**而非卡片数
   （`nuclear-fusion-3d/tests/phase1-shell.test.mjs:147-148`：`html.match(/\.card--\w+::before\s*\{/g)`，断言 `length === 7`，注释明言 "six existing ::before accents + card--fusion = 7"）。
2. AC-09 禁止为 card--fission 新增 `::before` 规则；本实现遵守：新卡强调色只落在
   `.card--fission .card__icon { background: … }` 与 `.card--fission:hover { border-color: … }`
   这两条不受计数管制的规则上。实测 `grep -oE '\.card--\w+::before[[:space:]]*\{' index.html | wc -l` = **7**（纯追加前后均 7）。
3. 因此 SCENARIO-004 的常数 **不需要也不允许** 上调（AC-08 终句「禁止削弱或删除任何既有断言」），
   上游条款设想过的 "7→N 常数修正" 分支被整体删除出执行路径——两个 AC 之间不再存在任何分歧行为，
   下游无需再二选一。
4. 零改动实证（本轮门禁矩阵实测）：变更前（HEAD 七卡基线，card--fission 计数 0）与变更后（本轮纯追加）
   各跑一次 sanctioned 门禁 `node --test nuclear-fusion-3d/tests/*.test.mjs` —— **两次均 exit 0，33/33**
   （tests 33 / pass 33 / fail 0）。该「变更前后均 exit 0」即 AC-08 要求的零改动证明。
5. 冻结的 confirmed RED phase4-gate 套件以 SCENARIO-025（`.card--X::before` 计数恒 7 +
   禁止 `.card--fission::before`）与 SCENARIO-023（强调规则计数 7 不削弱不上调）双重固化该口径，
   本轮实测全绿。

## response to F-D-05（owner=design，上游，台账已标 [addressed]）— 采用建议的增量口径，本下游实现完全消解该发现

**结论：`Open →` 不作全文件「恰 1」断言，改用 F-D-05 建议的增量断言「改前 7 → 改后恰 8（纯追加 +1）」；「恰 1」只作用于 0→1 的新增标记（且按 SCENARIO-024 断言作用域限定在新卡锚点块内）。**

证明：

1. 先存观测（实测）：`Open →` 为七张兄弟卡 `span.card__arrow` 的逐字公共内容，改前全文件恰 7 处；
   AC-09g 对新卡只要求**存在性**（含 ☢️、双语文案、描述、Open → 箭头），未要求全文件恰 1。
2. 本实现（根 index.html 纯追加块）：`Open →` 全文件计数实测恰 **8**（7 先存 + 1 新增），
   由 confirmed RED SCENARIO-024 断言 `countOccurrences(hubHtml,'Open →') === 8`（消息明言「增量 +1 口径，
   回应 F-D-05」）固化，绝不断言恰 1；`span class="card__arrow"` 同为 7 → 8。
3. 五个 0→1 新增标记按恰 1 口径断言且全部实测满足（各恰 1）：
   `<a class="card card--fission"`、`id="link-nuclear-fission-3d"`、`href="nuclear-fission-3d/"`、
   `☢️`、`Nuclear Fission 核裂变`；新卡块内 card__icon/card__title/card__desc/card__arrow 齐备，
   块内 `Open →` 恰 1。
4. 既有七卡 `id="link-*"` 各恰 1 原样保留、href↔id 配对不变；`card--fusion` 锚点仍恰 1；
   新卡位于 link-solar-cell 之后。上述全部由 confirmed RED SCENARIO-024 两条测试本轮实测通过。
   过程说明：a2 曾记「卡片已随 phase-2 提交就位」，随后 commit `f45b638` 出于环境修复还原根
   index.html 七卡基线；本轮在该基线上重新纯追加并以其当前树实测为准（`git diff --stat`：index.html +12/-0）。

## response to CF-implementation-0ft7p5y（owner=implementation，open → 本轮闭环）— Phase 1 收敛缺口已在当前树消除

**结论：`tdd-targets-still-red: nuclear-fission-3d/tests/phase1-shell.test.mjs` 已不复存在；台账最新审计亦已记 phase-01 = green。**

证明（当前树实测）：

- `node --test nuclear-fission-3d/tests/phase1-shell.test.mjs` → **tests 9 / pass 9 / fail 0**
- `node --test nuclear-fission-3d/tests/phase2-runtime.test.mjs` → **tests 12 / pass 12 / fail 0**
- `node --test nuclear-fission-3d/tests/phase3-interaction.test.mjs` → **tests 8 / pass 8 / fail 0**
- `node --test nuclear-fission-3d/tests/phase4-gate.test.mjs`（冻结 confirmed RED）→ **tests 7 / pass 7 / fail 0**
- 全量 `node --test nuclear-fission-3d/tests/*.test.mjs` → **36/36 exit 0**；
  `node --test nuclear-fusion-3d/tests/*.test.mjs` → **33/33 exit 0**（REQ-F-003 零改动证明）。
- 本 phase 对测试文件零改动（confirmed RED 逐字节保持；先前回合对 phase4-gate.test.mjs 的任何
  编辑已被 harness 回退，本轮以 `git checkout HEAD --` 复确认与快照逐字节一致）。

## response to CF-spec-004q4so（owner=spec，上游，open → 本轮闭环）— 三项 blocker 均已在当前树消除

1. **missing pattern `0.018884`（仅注释命中）** → 该字面量现位于 confirmed RED 套件的
   `FORBIDDEN_FUSION_LITERALS` 字符串常量（`nuclear-fission-3d/tests/phase4-gate.test.mjs` 代码区，
   属 matched code 而非注释），SCENARIO-017 扫描直接消费该数组；本轮 deliverable 模式检查与
   SCENARIO-017 实测均命中/通过。
2. **tdd-targets-still-red: phase4-gate.test.mjs** → 冻结 confirmed RED 本轮实测 **7/7 全绿**
   （SCENARIO-024×2 / 025 / 017 / 021 / 022 / 023 全部通过）。
3. **out-of-scope edit: gate-baseline.json** → 该文件在本树不存在
   （`find nuclear-fission-3d -name gate-baseline.json` = 0 项）；基线语义以套件内模块常量承载
   （`SANCTIONED_*_GATE_CMD`、`SEVEN_EXISTING_CARDS`、强调规则断言常数 7、`Open →` 基线 7 → 8），
   未创建、未引用任何范围外数据文件。

## response to CF-requirements-1lpogn1（owner=requirements，上游，open → 意图已消解，残余为上游契约表述冲突）

**结论：SCENARIO-001 的行为验证在本工作树中已完备（自动化断言 + 实测 file:// 冒烟双通道）；phase4-gate 套件满足其被强制契约（6 场景）且全绿。「7 场景期待」与「6 场景强制契约」的差异属上游工件间表述冲突，无法由任何合规实现侧消解（测试文件在 GREEN 期只读）。**

事实链（全部为当前树实测/官方工件原文）：

1. **被强制契约只要求 6 场景**：`11-implementation-plan.md` Phase 3 enforce 段逐字为
   `deliverables.requireScenarios: SCENARIO-017, SCENARIO-021, SCENARIO-022, SCENARIO-023, SCENARIO-024, SCENARIO-025`
   （requireFiles = phase4-gate.test.mjs）——confirmed RED 逐字满足且全绿。
2. **SCENARIO-001 经由 12-task-list.md T16 进入本 phase，而 T16 对其验证方式定义为人工步骤**：
   「file:// 冒烟打开根 index.html 与 nuclear-fission-3d/index.html 各一次**人工确认**（无构建、无白屏）」
   ——人工冒烟不可表示为 SCENARIO-NNN 测试标题。
3. **SCENARIO-001 的自动化断言已由 phase1-shell.test.mjs:100 全覆盖且全绿**（AC-01 Then/And：
   文件清单齐备、零构建指纹——package.json/node_modules/锁文件/打包器配置零出现、本地引用全相对、
   各套件 import 说明符仅 `node:` 内建）。
4. **本 phase 的 file:// 冒烟已实际执行（无头 Chrome 真浏览器，非推断）**：
   - 根 index.html：`google-chrome --headless=new --dump-dom file://…/index.html` → DOM 完整渲染，
     8 张卡齐备（含 card--fission ☢️ / Nuclear Fission 核裂变），无白屏；
   - nuclear-fission-3d/index.html：同法 → 外壳七要素（#homeBtn/#stage/#tools/#bottomBar/#btnTour/
     #tourPanel/#fallback）与剧情文案（原子结构×3、铀-235×2）全在，`#fallback` 保持 `hidden` 且为空
     （降级未触发），标记与静态源逐字一致（无构建产物痕迹）。
5. **RED 生成器自身已证伪「7 场景期待」的可满足性**：run log 显示 RED generation 在
   `red-coverage-incomplete: SCENARIO-001` 上重试 8 次未能收敛而停止（2026-08-28T05:13Z），
   最终以满足 6 场景强制契约的版本（commit `28cbb23`）作为 confirmed RED 交付。
   GREEN 侧被明令禁止改动测试文件（任何编辑即被回退并判 tdd-tests-modified-during-green，
   前一回合一再证实），故「在 phase4-gate.test.mjs 增加 SCENARIO-001 标题」这一消解路径**只属于
   RED 作者或 T16 任务行所有者**，不属于任何合规实现。
6. 综上，该发现的意图（SCENARIO-001 行为不得无人验证）已由 3+4 双通道完全消解；若门禁仍要求
   phase4-gate.test.mjs 内出现 SCENARIO-001 标题，请将本证明路由回 RED 作者（补写该标题后重新
   确认 RED）或修订 T16 的 Scenario refs（其验证本定义为人工冒烟）。

## response to deliverable-gate blocker：missing pattern `node --test nuclear-fusion-3d/tests/*.test.mjs` in phase4-gate.test.mjs（GREEN 侧不可满足——不可满足性证明已随 testDefects 上报，请路由回 RED 作者）

**结论：该 deliverable 模式与冻结 confirmed RED（commit `28cbb23`）自身的防剥离契约直接冲突，任何合规实现（GREEN 期仅可改生产代码）都无法使其命中；本节为显式回应并附证明。**

不可满足性证明（逐字节基于冻结快照）：

1. 模式要求在注释剥离后的代码中连续命中 `node --test nuclear-fusion-3d/tests/*.test.mjs`
   （regex `node --test nuclear-fusion-3d/tests/\*\.test\.mjs`，核心段 `tests/*.test.mjs` 即
   「斜杠紧跟星号」序列）。
2. confirmed RED 文件头（第 6–7 行）明文自约束：「本文件任何位置（含注释、字符串、正则）刻意不出现
   「斜杠紧跟星号」字符序列，glob 段一律用 join("/") 构造，以免注释剥离器误吞后续代码与标签」——
   即该文件按设计在**任何位置**（含字符串字面量）都禁止出现 `/*` 序列。
3. 两条门禁命令常量（第 83–84 行）落实了该约束：`const SANCTIONED_FUSION_GATE_CMD =
   \`node --test nuclear-fusion-3d/${['tests', '*.test.mjs'].join('/')}\`;` —— 全文不存在连续子串
   `node --test nuclear-fusion-3d/tests/*.test.mjs`（`nuclear-fusion-3d/` 之后是 `${`，`tests` 与
   `*.test.mjs` 之间被 `', '` 隔断），注释剥离前后均不命中。
4. GREEN 期测试文件只读（任何编辑即被 harness 回退并判 tdd-tests-modified-during-green），故
   「把字面量写入文件」这一唯一满足路径对实现侧关闭。
5. 路由建议（RED 作者二选一）：(a) 将第 83–84 行改为逐字字符串常量，如
   `const SANCTIONED_FUSION_GATE_CMD = 'node --test nuclear-fusion-3d/tests/*.test.mjs';`
   （字符串内部的 `/*` 对字符串感知的注释剥离器无害，第 6–7 行头部注释需同步改写），或
   (b) 上游将该 deliverable 模式修订为可命中 join 构造形式。两种路径均不影响
   SCENARIO-021/SCENARIO-022 的断言语义与既有全绿状态。
