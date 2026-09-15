# Specification: 核裂变 3D 交互动画页（nuclear-fission-3d）技术规范、实施计划与任务清单

- **Date**: 2026-08-27
- **Generated**: 2026-08-27T22:14:19.215+08:00

---

## Summary

新建独立纯静态目录 nuclear-fission-3d/，逐字镜像实测存在的 nuclear-fusion-3d 成品架构（同款 import map：importmap×1、three@0.160.0 jsdelivr 地址×2、es-module-shims@1.10.0≥1；#homeBtn/#stage/#tools/#bottomBar/#btnTour/#tourPanel 外壳；单一 rAF 主循环 + clock.getDelta；__errs/__ready 引导守卫），把剧情内容替换为三相位核裂变故事：atoms（原子结构）→ neutron（中子俘获形成激发复核铀-236*）→ fission（裂变为钡-141+氪-92+3 个中子并释放 200 MeV ≈3.2e-11 J），运行时句柄 window.fissionSim 与 window.fusionSim 的 12 方法表面完全一致，配 4 步导览（①atoms②neutron③fission④fission，步数≠相位数）。既有文件仅允许一处改动：根 index.html 在 link-solar-cell 卡后纯追加 ☢️ card--fission 入口卡（不新增 .card--X::before 规则，/\.card--\w+::before\s*\{/g 计数恒为 7）；nuclear-fusion-3d/** 全部零改动。回归门禁一律 glob 形式（变更前后 nuclear-fusion-3d/tests/*.test.mjs 均 33/33 exit 0；新站 ≥4 套件全绿；禁止目录参数形式）。实施分 3 个粗粒度、独立可验 phase：①静态外壳+脚手架，②运行时状态机+控制+导览（共享 main.js 故合并），③首页卡+全量门禁；共 16 个任务。原型报告 verdict=pass，其对比度使用限制（#b45309 禁作暗面文字色）与「勿照抄 fusion 42×42/38px 按钮尺寸（须 ≥44×44）」两条修正已写入架构与门禁。

## Architecture

## 1. 总体策略：结构克隆 + 内容置换

以实测存在的 nuclear-fusion-3d/（123 行 HTML 外壳 / 783 行单文件 JS / 220 行暗空 CSS / 3 个 node:test 套件）为唯一结构基准，新建 nuclear-fission-3d/ 为其结构克隆，仅置换故事层。不引入任何构建步骤、npm 依赖或新 CDN 来源（外部域名仅继承 cdn.jsdelivr.net 的 three@0.160.0 与 es-module-shims@1.10.0，import map 逐字一致），file:// 直开可用。

### 文件清单
**新建（7 个）**
- `nuclear-fission-3d/index.html` — 页面外壳
- `nuclear-fission-3d/css/style.css` — 暗空主题
- `nuclear-fission-3d/js/main.js` — 单文件运行时
- `nuclear-fission-3d/tests/phase1-shell.test.mjs`、`phase2-runtime.test.mjs`、`phase3-interaction.test.mjs`、`phase4-gate.test.mjs` — 4 个 node:test 内容断言套件（AC-01 要求 ≥3）

**修改（1 个，仅纯追加）**
- 根 `index.html`：在 id="link-solar-cell" 卡片之后追加一张 `<a class="card card--fission" … id="link-nuclear-fission-3d" href="nuclear-fission-3d/">` 卡及其非 ::before 强调色规则（实测基线：`.card--\w+::before {` 规则恰 7 条、`Open →`×7、`id="link-*"`×7、card--fission=0，原型已复测）。注意：计数正则必须用 `\.card--\w+::before\s*\{`（`\w+`，实测 7）；不可用 `[a-z]*` 等窄化字符类（实测会漏计含数字的卡类名得 6）。
**删除：无。nuclear-fusion-3d/** 零改动。**

## 2. HTML 外壳（nuclear-fission-3d/index.html）

镜像 nuclear-fusion-3d/index.html:99-117 的引导顺序：
1. `<head>` 内**先于** module 标签的内联陷阱脚本：`window.__errs = []; window.addEventListener('error', e => window.__errs.push(String(e.message || e)));`（模块加载失败也能收集）。
2. async 加载 `es-module-shims@1.10.0`，随后**恰好 1 个** `script type="importmap"`，内含**恰好 2 条逐字相同**的 three@0.160.0 jsdelivr 地址（build 与 three/addons/ 前缀）。
3. `script type="module" src="./js/main.js"`。

Chrome 元素 ID 与文案逐字钉定（AC-02）：`#homeBtn`（href="../index.html"）、`#stage`（全屏 canvas 容器）、`#tools`、`#btnTour`（🎬 引导浏览）、`#bottomBar` 内 `#toggleBtn`（初始 ⏸ 暂停）、`#resetBtn`（🔄 重置）、`#camBtn`（🎥 重置视角）、`#tourPanel` 覆盖层（含 `#tourCloseBtn` 与 4 个带 data-step 的步骤项）。fission 特有（spec 钉定，非 AC 强制命名）：`#prevBtn`（⏮ 上一步）、`#nextBtn`（⏭ 下一步）、`#autoBtn`（自动换幕：开/关）、`#phaseTitle`/`#phaseText` 相位字幕、`#ledgerPanel` 守恒验算面板、`#fallback` 降级提示层（默认隐藏）。全部控件为原生 `<button>`/`<a>`（天然键盘可达），配 title/aria-label，最小尺寸 44×44px。

## 3. JS 运行时（nuclear-fission-3d/js/main.js）——契约优先

**纯数据常量**（镜像 fusion main.js:26-67 的数据形态，原型确认 {key, zh, duration} 形态必须逐字保留）：
- `const MAX_PARTICLES = 2000;`（硬上限）
- `const PHASES = [ {key:'atoms', zh:'原子结构', duration:10}, {key:'neutron', zh:'中子俘获', duration:12}, {key:'fission', zh:'裂变反应', duration:14} ];`（恰 3 项，数值型秒；总 36s）
- `const TOUR_STEPS = [ {phaseKey:'atoms', …}, {phaseKey:'neutron', …}, {phaseKey:'fission', …}, {phaseKey:'fission', …} ];`（恰 4 项：①→atoms ②→neutron ③→fission ④→fission 总结步）

**状态**：`const state = { phaseKey:'atoms', phaseTime:0, simTime:0, paused:false, autoAdvance:true, tourActive:false, tourStep:null };`

**核心函数签名**：
- `initThree(): {renderer, camera, controls, clock} | null` — WebGL2 上下文创建失败时返回 null 并走降级
- `buildU235Nucleus(): Group`、`spawnNeutron(): Mesh`、`buildExcitedU236(): Group`、`buildFragments(): {barium:Group, krypton:Group, neutrons:Group}`、`flashEnergy(): void`
- `advancePhase(): void` — `phaseTime ≥ duration` 时切下一相；**末相 fission 自动推进后保持停留**（phaseTime 钳制在 duration，getSimTime 继续累积），此为 spec 钉定决策
- `jumpToPhase(key: string): boolean` — 合法键：退出导览（若激活）→ 置 phaseKey 并清零 phaseTime，返回 true；非法键：静默忽略（不抛错、不提示），返回 false（镜像 fusion jumpToPhase）
- `startRun(key: PhaseKey): void` — 重置 simTime/phaseTime 并从指定相开演
- `animate(): void` — **全文件唯一一处** `requestAnimationFrame(animate)`；`const dt = Math.min(clock.getDelta(), 0.05);`；`if (!state.paused) { state.simTime += dt; state.phaseTime += dt; if (state.autoAdvance) advancePhase(); }`；暂停时粒子运动与时钟完全冻结，resume 从冻结点原样续算
- `showFallback(msg: string): void` — 显示 #fallback 友好文字（非白屏、无未捕获异常）

**window.fissionSim 方法表面（与 window.fusionSim @ nuclear-fusion-3d/js/main.js:703-727 逐项一致，恰 12 个，禁 setPhase/toggleAuto）**：
`getPhase(): 'atoms'|'neutron'|'fission'`；`getPhaseTime(): number`；`getSimTime(): number`；`isPaused(): boolean`；`pause(): void`（置 paused 且 toggleBtn 文案→▶ 继续）；`resume(): void`（清 paused 且文案→⏸ 暂停）；`reset(): void`（= startRun('atoms')，**不触碰** tourActive/tourStep）；`isTourActive(): boolean`；`getTourStep(): number|null`（未激活返回 null）；`getMode(): 'auto'|'manual'`；`setAutoAdvance(on: boolean): void`（同步 #autoBtn 文案与 aria-pressed）；`gotoPhase(key: string): void`（委托 jumpToPhase：合法键先退导览再跳相，非法键静默）。句柄命名必须为 `fissionSim`；即使 WebGL 降级也照常定义（纯状态机不依赖渲染器），保证 SCENARIO-005 在降级页仍成立。

**三相位场景叙事**（对应 SCENARIO-016 节奏）：atoms：铀-235 原子结构（质子/中子聚类球 + 电子云示意）；neutron：一个慢中子飞入被俘获，形成激发复核铀-236*（形变抖动 + 红移脉冲）；fission：复核分裂为钡-141 + 氪-92 + 3 个中子，能量闪光（发光脉冲 + 粒子簇 ≤ MAX_PARTICLES），同时 #ledgerPanel 展示守恒验算「质量数 236 = 141 + 92 + 3」「电荷数 92 = 56 + 36」。

**科学文案逐字锚定（AC-05）**：html/js 源码同时包含子串「铀-235」「钡-141」「氪-92」「3 个中子」「200 MeV」「3.2e-11」（作 ≈3.2e-11 J）「质量数」「电荷数」，全部置于字符串字面量（非注释）。

**启动契约（AC-10）**：`window.__errs = []` 在 HTML 内联陷阱收集；main.js 末行 `window.__ready = true;`；WebGL 失败 → showFallback + 仍置 __ready + 仍定义 fissionSim + 跳过 rAF 循环。**禁止** setInterval(/setTimeout(（全文件 0 处），rAF( 恰 1 处，时钟只由 clock.getDelta() 驱动。

**导览交互（AC-07）**：点击 #btnTour → tourActive=true、tourStep=0、展开 #tourPanel；进入第 k 步立即 jumpToPhase(TOUR_STEPS[k].phaseKey)（导览中 getPhase() === 映射键）；再次点击 #btnTour 或点 #tourCloseBtn → tourActive=false、tourStep=null、收起面板。

## 4. CSS（nuclear-fission-3d/css/style.css）

克隆 fusion 暗空主题（body #04060d、panel rgba(15,23,42,.82)、ctrl #1e293b、tool rgba(15,20,32,.72)，原型实测面），琥珀主色 primaryMain #f59e0b（暗面文字对比 6.81–9.43:1 通过）。**原型修正硬约束**：(a) primaryDark #b45309 实测 2.91–4.03:1，禁止以 `color:` 形式用于任何暗底文字，仅限浅底或非文字描边/border/hover；(b) error #dc2626(3.03) 与 success #16a34a(4.44) 仅限大字号/UI 组件，正文状态文字改用 #ef4444/#22c55e；(c) 全部工具/底栏按钮 min 44×44px——**不得照抄 fusion 实测的 42×42(.tool-btn) 与 38px(#homeBtn)**；(d) 8px 栅格 + 4px 半步（间距 0/4/8/16/24/32/48、圆角 4/8/12），断点 640/768/1024；(e) 每个可聚焦控件有清晰 :focus-visible 轮廓；粒子身份靠大小+图例区分而非仅颜色。

## 5. 根 index.html 纯追加（AC-09）

在 id="link-solar-cell" 卡片之后（卡片网格末尾）追加：
`<a class="card card--fission" href="nuclear-fission-3d/" id="link-nuclear-fission-3d">`，内含 ☢️ 图标（.card__icon）、「Nuclear Fission 核裂变」双语标题（.card__title）、一句描述（.card__desc）与 Open → 箭头（.card__arrow）。强调色只落在**不受计数管制**的规则：`.card--fission .card__icon { background: … }` 与 `.card--fission:hover { border-color: … }`；**禁止**新增任何 `.card--X::before {` 规则（`\.card--\w+::before\s*\{` 计数改动前后恒为 7）。既有七卡锚点、href 与七个 id="link-*" 一律原样保留；card--fusion 锚点保持恰 1 处（CSS 里的 .card--fusion 类引用不计入锚点计数）。

## 6. 跨题污染守卫（AC-06）

nuclear-fission-3d 的**生产源码**（index.html、css/**、js/**；排除 tests/ ——镜像 fusion walkProduction 跳过 tests 的既有约定，套件自身的禁用清单数组不算源码）中，D-T 聚变专属字面量 '0.018884'、'0.0189 u'、'17.6 MeV'、'2.82e-12'、「氘」、「氚」出现次数全部为 0。该清单与 AC-05 锚定清单互为镜像约束，均由 phase4-gate 套件枚举闭环（清单=规则=测试数组三方同源）。

## Testing Strategy

沿用兄弟站已实证的 node:test + node:assert/strict 内容断言模式（fs.readFileSync 把生产文件读成字符串做正则断言，零 npm 依赖、零浏览器），4 个新套件与 28 个 BDD 场景一一对应（测试名前缀携带 SCENARIO-NNN (AC-NN) 标签，作为稳定可 grep 的交付锚）。file:// 直开（SCENARIO-001）由无构建指纹断言：目录内无 package.json、资源全为 ./ 与 ../ 相对路径、依赖仅 importmap CDN；WebGL 降级（SCENARIO-028）以 initThree 失败分支的代码断言 + 降级 DOM（#fallback）存在性断言覆盖（CI 无浏览器，镜像 fusion SCENARIO-024 的同款做法）。

**门禁命令（AC-08，逐字钉定）**：仅允许 glob 形式 —— ① 变更前基线 `node --test nuclear-fusion-3d/tests/*.test.mjs`（实测 33/33，exit 0）；② 变更后重跑同一命令必须仍 33/33 exit 0（nuclear-fusion-3d/** 零改动的机械证明）；③ 新站 `node --test nuclear-fission-3d/tests/*.test.mjs` 全绿。目录参数形式 `node --test <dir>/` 在 Node v24.15.0 下确定性失败，明令禁止（SCENARIO-022 在 phase4 套件中锁定 sanctioned 命令字符串）。任一门禁转红只许修新增物自身，禁止削弱/删除/上调任何既有断言常数。

**各套件覆盖面**：phase1-shell（SCENARIO-001/002/003）断言文件清单、chrome ID 集合、importmap×1、three@0.160.0×2 逐字相同 jsdelivr 地址、es-module-shims≥1、href="../index.html"；phase2-runtime（SCENARIO-004..008、014..016、026..028）断言 PHASES 三相顺序/键/duration 数值型、fissionSim 恰 12 方法名且无 setPhase/toggleAuto、gotoPhase 非法键静默守卫、reset 起始 atoms 不动导览、AC-05 八个子串与两条验算式、rAF(×1、setInterval(/setTimeout(×0、clock.getDelta、__errs/__ready、WebGL 降级分支、MAX_PARTICLES≤2000；phase3-interaction（SCENARIO-009..013、018..020）断言 prev/next 环绕、⏸/▶ 文案切换、暂停冻结续播语义、camBtn 复位、autoBtn 文案+aria-pressed 同步、按钮原生元素与 :focus-visible 样式、TOUR_STEPS 恰 4 条映射 ①atoms②neutron③fission④fission、退出置 null/false；phase4-gate（SCENARIO-017、021..025）断言根卡锚点/`id="link-nuclear-fission-3d"` 各恰 1 处、位于 link-solar-cell 之后、七卡原样、card--fusion 锚点仍 1 处、`\.card--\w+::before\s*\{` 计数恒 7、☢️+双语+Open →+href 齐全，并对生产源码树做六字面量零出现扫描（排除 tests/）。

**原型证据并入测试**：对比度修正以否定断言固化——style.css 禁止 `color:#b45309`（暗面文字），状态文字优先 #ef4444/#22c55e；控件尺寸断言 ≥44px（防止照抄 fusion 42/38）；守恒算术 235+1=236、236=141+92+3、92=56+36 由套件复核。每 phase 交付以「build 绿 + requireScenarios 标签在对应套件中出现 + requireContains/requireNotContains 语义锚」三重 AND 判定，缺一即 phase 失败，杜绝编译绿但零交付。

## Acceptance Criteria References

- AC-01
- AC-02
- AC-03
- AC-04
- AC-05
- AC-06
- AC-07
- AC-08
- AC-09
- AC-10

## BDD Scenario References

- SCENARIO-001
- SCENARIO-002
- SCENARIO-003
- SCENARIO-004
- SCENARIO-005
- SCENARIO-006
- SCENARIO-007
- SCENARIO-008
- SCENARIO-009
- SCENARIO-010
- SCENARIO-011
- SCENARIO-012
- SCENARIO-013
- SCENARIO-014
- SCENARIO-015
- SCENARIO-016
- SCENARIO-017
- SCENARIO-018
- SCENARIO-019
- SCENARIO-020
- SCENARIO-021
- SCENARIO-022
- SCENARIO-023
- SCENARIO-024
- SCENARIO-025
- SCENARIO-026
- SCENARIO-027
- SCENARIO-028

## Prior Review Responses

### REQ-F-003

- **Status**: verified
- **Owner Stage**: requirements
- **Evidence**: 01-requirements.md AC-08 修正文本；原型报告实测根 index.html ::before 规则=7、Open →=7、id="link-*"=7、card--fission=0，全部复现。
需求侧已在 AC-08 全文撤销『允许修正 SCENARIO-004 数值常数』的唯一例外授权。本规范沿用该修正：不设任何触碰既有断言的条款，nuclear-fusion-3d/**（含全部测试与常数）零改动成为硬门禁（Phase 3 任务 T16 变更前后双跑 33/33），SCENARIO-004 重新锚定为根 index.html 的 /\.card--\w+::before\s*\{/g 强调规则计数（恒 7），唯一例外路径已被删除。
### REQ-F-004

- **Status**: verified
- **Owner Stage**: requirements
- **Evidence**: 01-requirements.md AC-09 a)–g)；实测根 index.html:235 id="link-solar-cell" 为插入位锚点，:228 既有 card--fusion 锚点（CSS 类引用不计入锚点计数）。
需求侧已按实测正则重新钉定 AC-09 全部量化词（锚点/id 各恰 1、置于 link-solar-cell 后、七卡原样、fusion 锚点 1 处、::before 计数恒 7、内容四要素）。本规范将其逐项落进 Phase 3 交付物 requireContains（<a class="card card--fission"、id="link-nuclear-fission-3d"、href="nuclear-fission-3d/"、Nuclear Fission 核裂变、☢️、.card--fission .card__icon）与 phase4-gate 套件的计数断言；强调色走 .card__icon 背景与 :hover 描边两条不受计数管制的规则。
### F-D-05

- **Status**: verified
- **Owner Stage**: prototype
- **Evidence**: 09-prototype-report.md Measurements『root-card audit baseline … all F-D-05 pre-change constants reproduce exactly, PASS』；本地复核 grep 计数差异源于字符类宽窄，已用 \w+ 口径纠正。
原型报告判定根卡审计基线常数全部真实可复现（pre-change ::before=7、Open →=7、id="link-*"=7、card--fission=0），故 Phase 3 的计数断言按这些实测值钉死；计数正则采用原型确认的 \.card--\w+::before\s*\{（\w+ 形式；窄化为 [a-z]* 会漏计含数字卡类名，实测得 6，禁止）。
