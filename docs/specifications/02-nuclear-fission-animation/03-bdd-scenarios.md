# Behavior Scenarios: 核裂变交互动画页（nuclear-fission-3d）

- **Date**: 2026-08-27
- **Generated**: 2026-08-27T21:06:05.054+08:00
- **Author**: super-dev:bdd-scenario-writer
- **Source**: docs/specifications/02-nuclear-fission-animation/01-requirements.md
- **Total Scenarios**: 28

---
## Feature: 站点骨架与依赖外壳

### SCENARIO-001: 纯静态目录可直接以 file:// 打开运行

- **Acceptance Criteria**: AC-01
- **Priority**: high

**Given** 新建独立目录 nuclear-fission-3d/ 中包含 index.html、css/style.css、js/main.js，以及 tests/ 下不少于 3 个 *.test.mjs 测试套件文件
**When** 学习者直接以 file:// 协议打开该 index.html
**Then** 页面无需任何构建步骤或本地服务即可正常加载运行动画
**And** 测试仅依赖 node:test 与 node:assert，零 npm 依赖
### SCENARIO-002: 外壳元素与运行时依赖逐项镜像聚变兄弟页

- **Acceptance Criteria**: AC-02
- **Priority**: high

**Given** 以实测存在的 nuclear-fusion-3d/index.html 作为外壳与依赖基准
**When** 逐项核对新建的 nuclear-fission-3d/index.html 的外壳结构与外部依赖声明
**Then** 页面包含返回首页入口、三维舞台区、工具区、🎬 引导浏览按钮、底部控制栏（⏸ 暂停 / 🔄 重置 / 🎥 重置视角）以及导览面板覆盖层
**And** script type="importmap" 恰好出现 1 次
**And** 字符串 three@0.160.0 恰好出现 2 次且两条为逐字相同的 jsdelivr 地址
**And** 加载器 es-module-shims@1.10.0 至少出现 1 次
### SCENARIO-003: 任一量化钉定项不满足即判定外壳不合规

- **Acceptance Criteria**: AC-02
- **Priority**: medium

**Given** 新建的 nuclear-fission-3d/index.html 已按镜像要求生成
**When** 对照量化钉定口径核查发现 importmap 数量不为 1、three.js 地址不为恰好两条逐字相同的 jsdelivr 地址、或缺失 es-module-shims 加载器中的任意一项
**Then** 该页面判定为不合规必须修正后重验
## Feature: 三相位剧情状态机

### SCENARIO-004: 剧情恰按三个相位顺序推进

- **Acceptance Criteria**: AC-03
- **Priority**: high

**Given** 模拟从初始状态启动
**When** 剧情随各相时长自动推进
**Then** 相位依次经历 atoms（原子结构·初始相）、neutron（中子俘获·形成激发复核铀-236*）、fission（裂变反应·分裂成 Ba/Kr+3n 并释放能量），总数恰为三个
**And** 每个相位带有自己的 duration 时长与中文标签
### SCENARIO-005: window.fissionSim 方法表面与聚变站完全一致

- **Acceptance Criteria**: AC-03
- **Priority**: high

**Given** 页面加载完成后浏览器全局存在句柄 window.fissionSim
**When** 枚举其对外暴露的方法名集合
**Then** 该集合与 window.fusionSim 的实测表面完全一致：getPhase、getPhaseTime、getSimTime、isPaused、pause、resume、reset、isTourActive、getTourStep、getMode、setAutoAdvance(on)、gotoPhase(key)
**And** 集合中不存在 setPhase 或 toggleAuto 等禁用名称
### SCENARIO-006: gotoPhase 合法键立即跳相并优先退出导览

- **Acceptance Criteria**: AC-03
- **Priority**: medium

**Given** 导览处于激活状态、场景停在中间相位
**When** 以合法相位键调用 gotoPhase("fission")
**Then** 场景立即切换到 fission 相位
**And** 若导览激活则先退出导览再完成跳相
### SCENARIO-007: gotoPhase 非法键被静默忽略

- **Acceptance Criteria**: AC-03
- **Priority**: medium

**Given** 场景正处于 neutron 相位
**When** 以不存在的键调用 gotoPhase("meltdown")
**Then** 当前相位保持 neutron 不变
**And** 不抛出异常也不产生任何报错提示（静默容错）
### SCENARIO-008: reset 从初始相重启且不影响导览状态

- **Acceptance Criteria**: AC-03
- **Priority**: medium

**Given** 剧情已推进到 fission 相位
**When** 调用 reset()
**Then** 场景回到 atoms 初始相位重新计时
**And** 导览激活状态与当前导览步骤不受 reset 影响
## Feature: 播放控制与可及交互

### SCENARIO-009: 上一步/下一步按相位环绕循环

- **Acceptance Criteria**: AC-04
- **Priority**: high

**Given** 场景处于 neutron 相位
**When** 连续执行两次下一步切换
**Then** 相位经 fission 后环绕回到 atoms
**And** 反向执行上一步时同样自 atoms 环绕回 fission，形成 atoms↔neutron↔fission 闭环
### SCENARIO-010: 暂停冻结时间累积并在恢复后原样续播

- **Acceptance Criteria**: AC-04
- **Priority**: high

**Given** 剧情正在播放且模拟时间持续累积
**When** 学习者请求暂停后再读数，然后恢复播放
**Then** 暂停期间 getSimTime 读数完全停止增长、画面时钟冻结
**And** resume 后时间从冻结点原样继续累加而非重新计时
**And** ⏸ 暂停 与 ▶ 继续 文案随播放状态来回切换
### SCENARIO-011: 重置视角恢复默认机位

- **Acceptance Criteria**: AC-04
- **Priority**: medium

**Given** 相机已被拖转或缩放到偏离初始观察角度的位置
**When** 学习者请求重置视角
**Then** 相机回到默认机位
### SCENARIO-012: 自动换幕开关同步刷新按钮文案与 aria-pressed

- **Acceptance Criteria**: AC-04
- **Priority**: medium

**Given** 换幕模式处于手动档
**When** 学习者将自动换幕开启或关闭
**Then** 按钮文案即时反映当前档位
**And** aria-pressed 状态与实际档位严格同步
### SCENARIO-013: 控件键盘可达并具备可见焦点态

- **Acceptance Criteria**: AC-04
- **Priority**: medium

**Given** 页面包含全部工具栏与底栏控制件
**When** 学习者仅用键盘把焦点移动到任一控件上
**Then** 该控件获得清晰的 :focus-visible 可见焦点样式
**And** 键盘触发与指针触发的行为结果完全一致
## Feature: 科学文案与守恒验算

### SCENARIO-014: 讲解文案逐字锚定人教版术语与常数

- **Acceptance Criteria**: AC-05
- **Priority**: high

**Given** nuclear-fission-3d/** 下的 html/js 讲解文案已定稿
**When** 检索其中的科学术语与能量常数表述
**Then** 同时出现「铀-235」「钡-141」「氪-92」「3 个中子」「200 MeV」与「≈3.2e-11 J」形式的能量表述
**And** 同时包含「质量数」与「电荷数」两个术语
### SCENARIO-015: 守恒验算可视化呈现且数字自洽

- **Acceptance Criteria**: AC-05
- **Priority**: high

**Given** 激发复核铀-236* 分裂成钡、氪与中子的画面正在讲解
**When** 页面展示质量数与电荷数的守恒验算
**Then** 呈现 质量数 236 = 141 + 92 + 3 与 电荷数 92 = 56 + 36 两组验算式
### SCENARIO-016: 解说节奏按相位推进讲述裂变故事

- **Acceptance Criteria**: AC-05
- **Priority**: low

**Given** 剧情依次进入三个相位
**When** 各相位解说随之展开
**Then** 讲解顺序为原子结构 → 中子被俘获形成激发复核铀-236* → 复核分裂并伴随能量闪光，与相位推进一致
## Feature: 跨题污染守卫

### SCENARIO-017: 裂变源码中聚变专属字面量零出现

- **Acceptance Criteria**: AC-06
- **Priority**: high

**Given** nuclear-fission-3d/** 下全部 html/css/js 源码作为受检范围
**When** 逐一扫描 D-T 聚变专属字面量 '0.018884'、'0.0189 u'、'17.6 MeV'、'2.82e-12'、「氘」、「氚」
**Then** 每个字面量的出现次数均为 0
**And** 发现任何一次出现即视为污染违规，必须清除后重验
## Feature: 四步导览映射

### SCENARIO-018: 导览面板恰有 4 条有序步骤且映射固定

- **Acceptance Criteria**: AC-07
- **Priority**: high

**Given** 学习者在动画页发起引导浏览
**When** 导览面板展开并列出步骤序列
**Then** 恰有 4 条有序步骤，映射固定为 步骤①→atoms、步骤②→neutron、步骤③→fission、步骤④→fission（总结步场景停留在 fission）
### SCENARIO-019: 进入任一导览步骤即时切换至映射相位

- **Acceptance Criteria**: AC-07
- **Priority**: high

**Given** 导览进行中
**When** 进入任意一个导览步骤
**Then** window.fissionSim.getPhase() 立即等于该步所映射的相位键，无需等待过渡
### SCENARIO-020: 再次发起导览或关闭面板即退出导览

- **Acceptance Criteria**: AC-07
- **Priority**: medium

**Given** 导览处于激活状态且停在某一步骤上
**When** 学习者再次发起导览或关闭导览面板
**Then** 导览退出，getTourStep() 返回 null 且 isTourActive() 返回 false
## Feature: 回归门禁

### SCENARIO-021: 变更前后聚变测试套件经 glob 形式全绿

- **Acceptance Criteria**: AC-08
- **Priority**: high

**Given** 既有基线实测 node --test nuclear-fusion-3d/tests/*.test.mjs 为 33/33 通过
**When** 分别在本次变更前与变更后以同一 glob 形式重跑聚变测试套件
**Then** 两次运行均 exit 0 且全部通过
### SCENARIO-022: 禁止目录参数形式运行回归门禁

- **Acceptance Criteria**: AC-08
- **Priority**: medium

**Given** 回归门禁的执行方式待选择
**When** 误用目录参数形式 node --test <dir>/ 在 Node v24.15.0 下执行
**Then** 该形式因确定性失败被明令禁止，门禁一律采用经实证的 glob 形式
### SCENARIO-023: 新套件全绿且既有断言常数零改动

- **Acceptance Criteria**: AC-08
- **Priority**: high

**Given** tests/ 下新增不少于 3 个 *.test.mjs 裂变套件，且本规范唯一触及既有文件的条款是根 index.html 的纯追加
**When** 运行 node --test nuclear-fission-3d/tests/*.test.mjs 并核对 nuclear-fusion-3d/** 全部文件
**Then** 新增套件全部通过且聚变站点连同其全部测试文件与常量保持零改动（根 index.html 强调规则计数在改动后保持恰为 7 不变）
**And** 若任一门禁转红只允许修正本次新增物自身使之兼容既有断言，不得削弱、删除或上调任何既有断言常数
## Feature: 首页入口卡片纯追加

### SCENARIO-024: 核裂变卡片恰好一处追加于 solar-cell 之后

- **Acceptance Criteria**: AC-09
- **Priority**: high

**Given** 根 index.html 现有七张卡片锚点及其 href 完好
**When** 在 solar-cell 卡片之后追加新的核裂变入口卡
**Then** 锚点模式 <a class="card card--fission" 恰好匹配 1 处，字符串 id="link-nuclear-fission-3d" 恰好出现 1 次
**And** 卡片内容含 ☢️ 图标、双语文案 Nuclear Fission 核裂变、一句描述与 Open → 箭头，href 指向 nuclear-fission-3d/
**And** 现有七张卡片锚点原样保留、七个 id="link-*" 字符串各恰好出现 1 次，card--fusion 锚点仍恰好 1 处（CSS 规则中的 .card--fusion 类引用不计入）
### SCENARIO-025: 追加改动不新增强调规则且计数仍为 7

- **Acceptance Criteria**: AC-09
- **Priority**: high

**Given** 改动前根 index.html 中正则 /\.card--\w+::before\s*\{/g 匹配恰为 7 处
**When** 完成核裂变卡片的纯追加改动
**Then** 该正则匹配数保持 7 不变（零增量），未引入新的 .card--X::before { 规则
**And** 核裂变卡的强调色只落在不受该计数管制的规则上，例如 .card--fission .card__icon { background: … } 或 hover 边框描边
## Feature: 运行时约定与健壮性

### SCENARIO-026: 单一主循环驱动全部相位渲染与时钟

- **Acceptance Criteria**: AC-10
- **Priority**: high

**Given** nuclear-fission-3d/js/main.js 已实现三个相位的渲染与时钟逻辑
**When** 审查其动画循环实现方式
**Then** requestAnimationFrame( 恰好出现 1 次，setInterval( 与 setTimeout( 出现次数均为 0
**And** 相位时钟由 clock.getDelta() 驱动，全场景粒子数不超过硬上限 2000
### SCENARIO-027: 启动流程末尾置就绪标记并收集异常

- **Acceptance Criteria**: AC-10
- **Priority**: medium

**Given** 页面初始化时创建 window.__errs = [] 并注册 error 监听收集异常
**When** 启动流程走到末尾成功完成
**Then** window.__ready 被置为 true
**And** 运行期异常由收集机制捕获而非未捕获逃逸破坏页面
### SCENARIO-028: WebGL 不可用时显示友好降级提示

- **Acceptance Criteria**: AC-10
- **Priority**: high

**Given** 学习者设备的浏览器不支持 WebGL2 或上下文创建失败
**When** 页面尝试初始化三维场景
**Then** 界面显示友好的降级文字提示说明无法渲染立体画面
**And** 不出现白屏也不产生未捕获异常
---

## Traceability

- **AC-01**: 独立纯静态目录结构、file:// 直开可用、无构建无 npm 依赖、tests/ 下 ≥3 个 *.test.mjs → SCENARIO-001
- **AC-02**: 外壳元素镜像 fusion 兄弟页；importmap ×1、three@0.160.0 jsdelivr 地址 ×2 逐字相同、es-module-shims ≥1 的量化钉定 → SCENARIO-002, SCENARIO-003
- **AC-03**: 三相位状态机 atoms→neutron→fission（各带 duration 与中文标签）；window.fissionSim 方法表面与 fusionSim 完全一致且禁 setPhase/toggleAuto；gotoPhase 合法键跳相退导览、非法键静默忽略；reset 从 atoms 重启不动导览 → SCENARIO-004, SCENARIO-005, SCENARIO-006, SCENARIO-007, SCENARIO-008
- **AC-04**: 上一步/下一步环绕循环；暂停冻结时间并从冻结点续播（⏸/▶ 文案切换）；重置视角默认机位；自动换幕文案与 aria-pressed 同步；控件键盘可达并有 :focus-visible 焦点态 → SCENARIO-009, SCENARIO-010, SCENARIO-011, SCENARIO-012, SCENARIO-013
- **AC-05**: 人教版口径逐字锚定「铀-235」「钡-141」「氪-92」「3 个中子」「200 MeV」「≈3.2e-11 J」「质量数」「电荷数」；守恒验算 236=141+92+3 与 92=56+36；故事节奏按相推进 → SCENARIO-014, SCENARIO-015, SCENARIO-016
- **AC-06**: nuclear-fission-3d/** 内 D-T 聚变专属字面量出现次数均为 0 的跨题污染守卫 → SCENARIO-017
- **AC-07**: 导览面板恰 4 步且映射钉死 ①atoms②neutron③fission④fission；入步即时切相；退出后 getTourStep 为 null、isTourActive 为 false → SCENARIO-018, SCENARIO-019, SCENARIO-020
- **AC-08**: glob 形式回归门禁前后均 exit 0（禁目录参数形式）；新裂变套件全绿；fusion 站零改动、根 index.html 强调规则计数保持 7；门禁转红仅许修正新增物 → SCENARIO-021, SCENARIO-022, SCENARIO-023
- **AC-09**: 根 index.html 纯追加 card--fission 卡：锚点与 id 各恰 1 次、置于 solar-cell 后、七卡原样保留、fusion 卡锚点仍 1 处、::before 规则计数恒为 7、☢️ 双语卡内容齐全 → SCENARIO-024, SCENARIO-025
- **AC-10**: rAF 恰 1 次、无 setInterval/setTimeout、clock.getDelta() 驱动时钟；__errs/__ready 引导守卫；WebGL 失败友好降级不白屏 → SCENARIO-026, SCENARIO-027, SCENARIO-028
---

## Coverage Summary

- **Total Acceptance Criteria**: 10
- **Covered by Scenarios**: 10
- **Uncovered**: 0
- **Total Scenarios**: 28
