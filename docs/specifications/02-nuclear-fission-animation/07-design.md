# Design: 02-nuclear-fission-animation UI/UX 设计规格（核裂变 3D 交互动画）

- **Date**: 2026-08-27
- **Generated**: 2026-08-27T22:00:29.143+08:00
- **Designer**: ui-ux-designer

---

## Summary

为「核裂变」新建独立纯静态 3D 交互动画站 nuclear-fission-3d/（index.html + css/style.css + js/main.js + tests/*.test.mjs ≥3 套件），并在根 index.html 纯追加一张 card--fission 门户卡。整体镜像实测存在的兄弟站 nuclear-fusion-3d：外壳 DOM id 集、importmap(×1)/three@0.160.0(×2 同一 jsdelivr 地址)/es-module-shims@1.10.0(≥1) 运行时钉定、window.fissionSim 与 window.fusionSim 实测 12 方法面逐一同名（getPhase,getPhaseTime,getSimTime,isPaused,pause,resume,reset,isTourActive,getTourStep,getMode,setAutoAdvance,gotoPhase；禁用不存在的 setPhase/toggleAuto）。三相位状态机 atoms→neutron→fission（中文标签+duration），rAF×1 单主循环 + clock.getDelta() 相位时钟，setInterval/setTimeout×0；导览 4 步固定映射 ①atoms②neutron③fission④fission(总结)；科学文案逐字锚定人教版（铀-235/钡-141/氪-92/3 个中子/200 MeV/3.2e-11/质量数/电荷数 + 守恒验算 236=141+92+3、92=56+36）；聚变专属 6 常数（0.018884/0.0189 u/17.6 MeV/2.82e-12/氘/氚）在本站出现次数必须为 0。接口面：①window.fissionSim 12 方法；②PHASES 数据形态 {key,duration,label[]}；③DOM id 契约（23 个镜像 id）；④根卡 8 个 id="link-*" 各恰 1。数据流：键盘/指针 → 控制层 → fissionSim 状态机（getDelta 累积相位时钟）→ 单 rAF 循环渲染 Three.js 场景与 HUD 文案；导览 → gotoPhase 切相；异常 → window.__errs 收集 → 友好降级 + __ready 终置。【本轮修订（reviewResponses）】F-D-05：`Open →` 标记全文件「恰 1」系门禁自败（先存 7 处 span.card__arrow，行 196/203/210/217/224/232/239，追加后必为 8）——已将该单一标记改为增量断言「改动前 7 → 改动后恰 8（纯追加 delta 恰 +1）」，并在契约 root-card-addition-markers 的 derivationRule、模块 root-portal-card 审计项、模块 fission-test-suite S3 断言三处同步；其余 6 标记实测改前为 0，维持「改后恰 1」。AC-09g 原文仅要求卡片内容含 Open →（存在性），本口径不削弱任何既有断言、零改动融合站。CF-design-0krjds9 / CF-design-1hml9qh / CF-design-0grq8g9：三个契约的 sourceAnchor 已从行号（L196/L60/L111）改为经本次实测验证真实存在于目标文件中的符号——root-card-addition-markers→index.html#link-solar-cell、card-before-rule-count-preservation→index.html#card--fusion、fission-mirror-runtime-tokens→nuclear-fusion-3d/index.html#es-module-shims@1.10.0，全部枚举值由 grep 实测派生（非手写）。

## Modules

### fission-site-shell

nuclear-fission-3d/index.html：静态外壳，镜像融合站实测结构——#homeBtn(href="../index.html")、#stage(Three.js 画布容器)、#tools(#btnTour 🎬)、#bottomBar(#toggleBtn ⏸ 暂停 / #resetBtn 🔄 重置 / #camBtn 🎥 重置视角)、#tourPanel 覆盖层及 tourTitle/tourText/tourNav/tourPrev/tourDots/tourNext/tourExit 内部件。量化钉定（仅限本文件）：<script type="importmap"> 恰 1 次；字符串 three@0.160.0 恰 2 次且为逐字相同的 jsdelivr 地址；es-module-shims@1.10.0 ≥1 次。file:// 直开可运行，无构建、无 npm。输入：无（自足静态）；输出：挂载 #stage 与全部控件供运行时绑定。
### fission-3d-scene

Three.js 视觉编排（js/main.js 渲染层）：相① atoms——铀-235 原子核为质子/中子核子簇 + 轨道电子示意；相② neutron——一颗中子入射被俘获，俘获闪光，形成激发复核铀-236*（整体震颤/泛红提示激发态）；相③ fission——复核非对称分裂为钡-141 + 氪-92 + 3 个中子四散，伴随能量闪光。HUD 覆盖层同步中文相名标签与守恒验算文本：质量数 236 = 141 + 92 + 3，电荷数 92 = 56 + 36。默认机位 + #camBtn 一键复位；相机参数为设计 token（见 design-tokens）。输入：状态机相位与相位时钟；输出：每帧场景图元变换。
### fission-story-machine

剧情状态机（js/main.js 逻辑层）：PHASES = [{key:'atoms',…},{key:'neutron',…},{key:'fission',…}] 恰三相，各带 duration 与中文标签（原子结构/中子俘获·形成激发复核铀-236*/裂变反应·分裂成 Ba/Kr+3n 并释放能量），数据形态镜像融合站 PHASES（main.js:52）。window.fissionSim 方法面与 window.fusionSim 实测表面（main.js:703-731）逐一同名同语义：getPhase/getPhaseTime/getSimTime/isPaused/pause/resume/reset/isTourActive/getTourStep/getMode/setAutoAdvance(on)/gotoPhase(key)；明确禁止 setPhase/toggleAuto。gotoPhase 合法键即跳相（导览激活时先退出导览），非法键静默忽略保持当前相（镜像 jumpToPhase, main.js:638 行为）；reset() 从 atoms 相重启且不动导览状态。输入：控件事件/导览步进；输出：state{phaseKey,phaseTime,simTime,paused,autoAdvance}。
### fission-controls-hud

交互控制层：上一步/下一步按 atoms↔neutron↔fission 循环环绕（AC-04 明文，与融合站 clamp 行为有意不同）；#toggleBtn 在「⏸ 暂停/▶ 继续」间切换，文案与 aria-pressed 同步刷新，暂停冻结时间累积（pause 后 getSimTime() 读数不再增长，resume 后自冻结点原样续播）；#camBtn 恢复默认机位；#autoBtn 经 setAutoAdvance 切换自动/手动换幕并同步按钮文案。全部控件键盘可操作并具 :focus-visible 可见焦点样式。输入：键盘/指针事件；输出：状态机命令 + ARIA 状态。
### fission-tour-system

导览系统：点击 #btnTour 打开 #tourPanel，恰 4 条有序步骤，映射钉死：步骤①→atoms、步骤②→neutron、步骤③→fission、步骤④→fission（总结步场景停留在 fission）。进入任一步骤立即把场景切至对应相位（导览进行中 fissionSim.getPhase() === 该步映射值）；再次点击 #btnTour 或 tourExit 关闭面板退出导览，退出后 getTourStep() 返回 null 且 isTourActive() 返回 false。面板文案逐步骤给出中文科学解说（锚定人教版口径）。输入：btnTour/tourPrev/tourNext/tourExit 事件；输出：gotoPhase 调用 + 面板 DOM 更新。
### fission-bootstrap-guard

启动与错误守卫（镜像融合站 SCENARIO-024 bootstrap 契约）：初始化 window.__errs = [] 并注册 error 监听收集异常；启动流程末尾置 window.__ready = true（融合站 main.js:783 同语义）；WebGL 能力检测/上下文创建失败时在 #stage 显示友好中文降级文字提示，绝不白屏或抛未捕获异常。计时纪律：requestAnimationFrame( 恰 1 次（单一主循环驱动三相渲染与时钟），setInterval( 与 setTimeout( 均为 0 次，相位时钟由 clock.getDelta() 累积驱动（暂停=停止累积）。输入：DOMContentLoaded；输出：__ready 标志 + 主循环句柄。
### root-portal-card

根 index.html 纯追加模块（唯一被授权触及的既有文件）：在 solar-cell 卡（id="link-solar-cell"，行 235）之后插入 <a class="card card--fission" href="nuclear-fission-3d/" id="link-nuclear-fission-3d">，内部结构逐字段复刻兄弟卡模式：div.card__icon（☢️）+ div.card__title（Nuclear Fission）+ 双语副题（核裂变）+ 一句 div.card__desc + <span class="card__arrow">Open →</span>。审计口径（F-D-05 修订版）：☢️、Nuclear Fission、核裂变、card--fission 锚点、id="link-nuclear-fission-3d"、href="nuclear-fission-3d/" 六者改前实测 0 → 改后各恰 1；Open → 改前实测 7 → 改后恰 8（增量恰 +1，不作「恰 1」断言）；既有七卡锚点、href 与 7 个 id="link-*" 逐字保留各恰 1。CSS 纪律：禁新增 .card--fission::before（\.card--\w+::before\s*\{ 计数改后仍恰 7），强调色只落在 .card--fission .card__icon { background: … } 与 :hover 边框描边。输入：无；输出：门户卡 DOM + 少量增量 CSS 规则。
### fission-design-tokens

设计令牌（css/style.css + 根卡增量样式）：间距 8px 栅格（0/4/8/16/24/32/48）；字号 xs 12/sm 14/md 16/lg 18/xl 24/2xl 32/3xl 40px，字重 400/500/600/700；语义色——primary 裂变主题琥珀-橙（main #f59e0b/light #fbbf24/dark #b45309）、error #dc2626、warning #d97706、success #16a34a、surface 深空底色沿用兄弟站暗色调性；圆角 none/sm 4/md 8/lg 12/full；断点 sm 640/md 768/lg 1024（根卡栅格自动随既有 .grid 断点流式换行，无需新增媒体查询）；触控目标 ≥44×44；正文对比 ≥4.5:1、大字 ≥3:1。输出：CSS 自定义属性集，供场景 HUD 与根卡消费。
### fission-a11y-layer

可访问性层（WCAG 2.1 AA）：全部交互元素原生 button/a 承载、键盘可达、逻辑 Tab 序、:focus-visible 高亮环；#toggleBtn/#autoBtn 带 aria-pressed，#stage 容器 aria-label「核裂变 3D 演示」，相位切换经 aria-live=polite 区域播报中文相名；prefers-reduced-motion 用户降级：禁用裂变闪光频闪（改为单次淡入）、默认低速播放；触控目标 ≥44×44；颜色对比满足 4.5:1（正文）/3:1（大字）。输入：系统偏好 + 用户输入；输出：ARIA 状态与降级渲染参数。
### fission-test-suite

测试套件（tests/ 下 ≥3 个 *.test.mjs，node:test + node:assert，零 npm）：S1 runtime-mirror——AC-02/AC-03/AC-10 全量化词（importmap 恰 1、three@0.160.0 恰 2、es-module-shims@1.10.0 ≥1、rAF( 恰 1、setInterval(/setTimeout( 均 0、__errs/__ready、fissionSim 12 方法名集合）+ 非法键静默/导览退出语义；S2 science-copy——AC-05 八锚点子串 + 守恒验算式 + AC-06 六禁词计数为 0；S3 root-card——AC-09 全量化词：六标记各恰 1、Open → 增量断言（改前 7 → 改后恰 8，delta 恰 +1；F-D-05 修订口径，绝不断言恰 1）、::before 规则计数恰 7、七 link id 各恰 1、新卡位于 link-solar-cell 之后；S4 tour-controls——AC-04/AC-07 语义断言。运行一律 glob 形式：node --test nuclear-fission-3d/tests/*.test.mjs；回归门禁：node --test nuclear-fusion-3d/tests/*.test.mjs 前后均 exit 0（基线 33/33，Node v24.15.0；禁 <dir>/ 目录参数形式）；既有 fusion 文件零改动，若门禁转红只许修正新增物。

## Numeric Constants

- **Has numeric constants requiring validation**: true

## Contract Claims

Each paired generate/validate contract below ships its enumerated closure — derived from the cited source, not hand-written. A deterministic checker verifies pattern-vs-enumeration closure and anchor existence.

### root-card-addition-markers

- **Pattern**: `^(<a class="card card--fission"|id="link-nuclear-fission-3d"|href="nuclear-fission-3d/"|Nuclear Fission|核裂变|☢️|Open →)$`
- **Derivation rule**: 新增卡逐字段复刻根 index.html 行 192-240 七张兄弟卡的实测标记模式（每卡含 <span class="card__arrow">Open →</span>）。六个新贡献标记经 grep 实测改前计数为 0（☢️=0、核裂变=0、Nuclear Fission=0、card--fission=0），故断言为 0→1（改后各恰 1）；第七个标记 Open → 经 grep -c 实测改前已存在 7 次（行 196/203/210/217/224/232/239，均为既有兄弟卡 span.card__arrow），故其断言为增量口径：改前 7 → 改后恰 8（纯追加 delta 恰 +1），绝不作「恰 1」断言（修订 F-D-05 门禁自败；AC-09g 原文仅要求卡片内容含 Open → 的存在性）。新卡置于 id="link-solar-cell"（行 235）之后。
- **Source anchor**: `index.html#link-solar-cell`
- **Uniqueness**: the enumeration is duplicate-free
- **Enumerated closure (7 value)**:

  - `<a class="card card--fission"`
  - `id="link-nuclear-fission-3d"`
  - `href="nuclear-fission-3d/"`
  - `Nuclear Fission`
  - `核裂变`
  - `☢️`
  - `Open →`
### card-before-rule-count-preservation

- **Pattern**: `^\.card--\w+::before\s*\{$`
- **Derivation rule**: 对根 index.html 应用正则 /\.card--\w+::before\s*\{/g 实测提取（行 119-125 内联样式表），恰得 7 条：slingshot/car/ion/ion3d/atom/solar/fusion。改动后全文件匹配数必须仍恰为 7（零增量）：禁止为 card--fission 新增 ::before 强调规则，强调色只允许落在不受该正则管制的 .card--fission .card__icon 背景 / :hover 边框描边上（与 SCENARIO-003/AC-09f 口径一致）。
- **Source anchor**: `index.html#card--fusion`
- **Uniqueness**: the enumeration is duplicate-free
- **Enumerated closure (7 value)**:

  - `.card--slingshot::before {`
  - `.card--car::before {`
  - `.card--ion::before {`
  - `.card--ion3d::before {`
  - `.card--atom::before {`
  - `.card--solar::before {`
  - `.card--fusion::before {`
### root-link-id-allowlist

- **Pattern**: `^id="link-[a-z0-9-]+"$`
- **Derivation rule**: 对根 index.html 应用 grep -o 'id="link-[a-z0-9-]*"' 实测得改前 7 值（行 192/199/206/213/220/228/235，各恰 1）；追加新卡后集合新增第 8 值 id="link-nuclear-fission-3d"（恰 1）。改后 8 值各恰出现 1 次，既有 7 卡锚点与 href 逐字节保留。
- **Source anchor**: `index.html#link-solar-cell`
- **Uniqueness**: the enumeration is duplicate-free
- **Enumerated closure (8 value)**:

  - `id="link-gravity-slingshot"`
  - `id="link-how-cars-work"`
  - `id="link-ion-thruster"`
  - `id="link-ion-thruster-3d"`
  - `id="link-atomic-model"`
  - `id="link-nuclear-fusion-3d"`
  - `id="link-solar-cell"`
  - `id="link-nuclear-fission-3d"`
### fission-mirror-runtime-tokens

- **Pattern**: `^(importmap|three@0\.160\.0|es-module-shims@1\.10\.0)$`
- **Derivation rule**: 对兄弟站 nuclear-fusion-3d/index.html 实测计数并镜像到新建 nuclear-fission-3d/index.html：'importmap'（type="importmap" script 标签）改后在 fission 站恰 1 次；'three@0.160.0' 恰 2 次且两处为逐字相同的 jsdelivr 地址；'es-module-shims@1.10.0' 加载器至少 1 次。三值均由融合站文件 grep 实测（1/2/1）派生，非手写。
- **Source anchor**: `nuclear-fusion-3d/index.html#es-module-shims@1.10.0`
- **Uniqueness**: the enumeration is duplicate-free
- **Enumerated closure (3 value)**:

  - `importmap`
  - `three@0.160.0`
  - `es-module-shims@1.10.0`
### fusion-runtime-api-surface

- **Pattern**: `^[a-z][A-Za-z0-9]*$`
- **Derivation rule**: 从 nuclear-fusion-3d/js/main.js 行 703-731 的 window.fusionSim 对象字面量逐键实测提取（gotoPhase 在行 731 委托 jumpToPhase，行 638）；window.fissionSim 键集合必须与之完全一致且仅此 12 个；setPhase/toggleAuto 等不存在的方法名禁止出现。
- **Source anchor**: `nuclear-fusion-3d/js/main.js#fusionSim`
- **Uniqueness**: the enumeration is duplicate-free
- **Enumerated closure (12 value)**:

  - `getPhase`
  - `getPhaseTime`
  - `getSimTime`
  - `isPaused`
  - `pause`
  - `resume`
  - `reset`
  - `isTourActive`
  - `getTourStep`
  - `getMode`
  - `setAutoAdvance`
  - `gotoPhase`
### fission-shell-dom-ids

- **Pattern**: `^[a-z][A-Za-z0-9]*$`
- **Derivation rule**: 对 nuclear-fusion-3d/index.html 应用 grep -o 'id="[a-zA-Z]*"' 实测提取全部 30 个 id，剔除融合站专属温控组件组（tempHud/tempNow/tempBarWrap/tempBar/tempStage/tempGoal——D-T 加热叙事，AC-06 污染风险）与 physicsPanel（裂变站 AC 无此面板），余 23 个为裂变站外壳必镜像 id 集；裂变站以守恒验算 HUD（新命名）替换温控组。
- **Source anchor**: `nuclear-fusion-3d/index.html#btnTour`
- **Uniqueness**: the enumeration is duplicate-free
- **Enumerated closure (23 value)**:

  - `homeBtn`
  - `stage`
  - `tools`
  - `btnTour`
  - `bottomBar`
  - `phaseTabs`
  - `prevPhaseBtn`
  - `nextPhaseBtn`
  - `autoBtn`
  - `phaseBar`
  - `phaseLabel`
  - `toggleBtn`
  - `resetBtn`
  - `camBtn`
  - `tourPanel`
  - `tourTitle`
  - `tourText`
  - `tourNav`
  - `tourPrev`
  - `tourDots`
  - `tourNext`
  - `tourExit`
  - `hint`
### fission-phase-keys

- **Pattern**: `^[a-z]+$`
- **Derivation rule**: AC-03 钉定剧情状态机恰三相且 key 依次为 atoms（原子结构·初始相）→ neutron（中子俘获·形成激发复核铀-236*）→ fission（裂变反应·分裂成 Ba/Kr+3n 并释放能量），数据形态镜像融合站 PHASES（main.js:52）；gotoPhase 合法键闭包即此 3 值，非法键静默忽略。
- **Source anchor**: `docs/specifications/02-nuclear-fission-animation/01-requirements.md#AC-03`
- **Uniqueness**: the enumeration is duplicate-free
- **Enumerated closure (3 value)**:

  - `atoms`
  - `neutron`
  - `fission`
### tour-step-mapping

- **Pattern**: `^[1-4]→(atoms|neutron|fission)$`
- **Derivation rule**: AC-07 钉死导览恰 4 条有序步骤且步骤数≠相位数：步骤①→atoms、②→neutron、③→fission、④→fission（总结步场景停留在 fission）；映射闭包由 AC-07 原文逐字派生，任一步骤激活时 fissionSim.getPhase() 必须等于映射值。
- **Source anchor**: `docs/specifications/02-nuclear-fission-animation/01-requirements.md#AC-07`
- **Uniqueness**: the enumeration is duplicate-free
- **Enumerated closure (4 value)**:

  - `1→atoms`
  - `2→neutron`
  - `3→fission`
  - `4→fission`
### science-copy-anchors

- **Pattern**: `^(铀-235|钡-141|氪-92|3 个中子|200 MeV|3\.2e-11|质量数|电荷数)$`
- **Derivation rule**: AC-05 逐字列出的 8 个科学文案锚点子串：nuclear-fission-3d/** 全部 html/js 源码中每个子串须出现 ≥1 次（3.2e-11 可作 ≈3.2e-11 J 表述）；并须展示守恒验算：质量数 236 = 141 + 92 + 3，电荷数 92 = 56 + 36。
- **Source anchor**: `docs/specifications/02-nuclear-fission-animation/01-requirements.md#AC-05`
- **Uniqueness**: the enumeration is duplicate-free
- **Enumerated closure (8 value)**:

  - `铀-235`
  - `钡-141`
  - `氪-92`
  - `3 个中子`
  - `200 MeV`
  - `3.2e-11`
  - `质量数`
  - `电荷数`
### forbidden-fusion-literals

- **Pattern**: `^(0\.018884|0\.0189 u|17\.6 MeV|2\.82e-12|氘|氚)$`
- **Derivation rule**: AC-06 跨题污染守卫逐字列出的 6 个 D-T 聚变专属字面量：改动后 nuclear-fission-3d/** 全部 html/css/js 源码中每个字面量出现次数必须为 0（方向性守卫：聚变常数不得误入裂变页面）。
- **Source anchor**: `docs/specifications/02-nuclear-fission-animation/01-requirements.md#AC-06`
- **Uniqueness**: the enumeration is duplicate-free
- **Enumerated closure (6 value)**:

  - `0.018884`
  - `0.0189 u`
  - `17.6 MeV`
  - `2.82e-12`
  - `氘`
  - `氚`
### bootstrap-loop-constants

- **Pattern**: `^(__errs|__ready|requestAnimationFrame\(|setInterval\(|setTimeout\(|getDelta\()$`
- **Derivation rule**: 对 nuclear-fusion-3d/js/main.js 实测：requestAnimationFrame( = 1（行 7 注释亦述单一主循环）、setInterval( = 0、setTimeout( = 0、getDelta( ≥ 1、window.__ready = true 终置（行 783）、__errs 错误收集守卫；镜像到 nuclear-fission-3d/js/main.js 时计数语义逐一保持：rAF 恰 1、setInterval/setTimeout 均 0、相位时钟由 clock.getDelta() 驱动、__ready 为启动完成终置标志。
- **Source anchor**: `nuclear-fusion-3d/js/main.js#__ready`
- **Uniqueness**: the enumeration is duplicate-free
- **Enumerated closure (6 value)**:

  - `__errs`
  - `__ready`
  - `requestAnimationFrame(`
  - `setInterval(`
  - `setTimeout(`
  - `getDelta(`

## Alternatives Considered

- **F-D-05：`Open →` 标记的门禁计数口径**: chose 文件级增量断言——改前实测 7 → 改后恰 8（纯追加 delta 恰 +1），同契约其余六个改前实测为 0 的标记维持「改后恰 1」 — AC-09g 原文只要求卡片内容含 Open →（存在性）；「全文件恰 1」在先存 7 处 span.card__arrow（行 196-239）的前提下数学不可满足，会把实现锁进必红。增量口径既保纯追加性（不得改动既有 7 卡）又确定性可判定，且不削弱任何既有断言、融合站零改动。 (alternatives rejected: 全文件恰 1（被 F-D-05 否决：先存 7 处，追加后必为 8，确定性失败）; 作用域限定为新增卡片块内恰 1（需块级 HTML 解析定位锚点块，实现脆弱且测试复杂度不成比例）)- **三个契约 sourceAnchor 的锚点形式**: chose 改为经实测验证真实存在于目标文件中的符号/字面量：#link-solar-cell、#card--fusion、#es-module-shims@1.10.0、#fusionSim、#btnTour、#__ready 及需求文档 #AC-xx — 此前用行号（L196/L60/L111）作 export 名，行号随文件演化为幻影锚点且不具语义；文件内实际存在的符号串可被确定性 grep 验证，枚举全部由 grep 实测派生而非手写（响应 CF-design-0krjds9/1hml9qh/0grq8g9）。 (alternatives rejected: 行号锚点（已否决：外部验证不可解析、文件漂移即失效）; 仅文件路径不带符号（定位粒度过粗，无法说明枚举派生自文件哪一符号）)- **新卡 CSS 强调色的落点**: chose .card--fission .card__icon { background: … } 与 :hover 边框描边 — AC-09f 禁新增 .card--X::before 规则且 \.card--\w+::before\s*\{ 计数必须保持 7；icon 背景与 hover 描边落在不受该正则管制的规则上，视觉强调与计数守卫兼得。 (alternatives rejected: .card--fission::before 新规则（被 AC-09f 明令禁止）; 元素行内 style（污染标记、难以为 S3 套件断言）)- **与融合站的代码复用策略**: chose 逐字段镜像复制外壳/运行时形态到 nuclear-fission-3d/，零跨目录 import，既有 33/33 测试与融合站文件零改动 — AC-01 要求 file:// 直开无构建无 npm，AC-08 要求融合站回归门禁前后均绿且唯一授权改动是 AC-09 根卡纯追加；目录级解耦使回归面最小化。 (alternatives rejected: 相对路径 import ../nuclear-fusion-3d/ 模块（破坏自足性与 file:// 直开）; 抽取共享 npm 包（AC-01 明令无 npm 依赖）)- **上一步/下一步的边界行为**: chose 按 atoms↔neutron↔fission 循环环绕 — AC-04 明文要求循环环绕；融合站 jumpToPhase 用 Math.max/min clamp（main.js:651-652）是其自身行为，AC-03 仅钉 API 面与 gotoPhase/非法键语义，不约束 prev/next 边界。 (alternatives rejected: clamp 到首尾（融合站行为，违反 AC-04）)- **导览步骤数与映射**: chose 恰 4 步：①atoms②neutron③fission④fission(总结) — AC-07 钉死步骤数≠相位数并固定映射，第 4 步为总结解说不切相；进入任一步骤立即把场景切至映射相位。 (alternatives rejected: 3 步 1:1 映射相位（违反 AC-07）; 5 步追加核安全科普步（需求未要求，YAGNI）)- **计时与调度机制**: chose 单一 requestAnimationFrame 主循环 + clock.getDelta() 累积相位时钟，暂停即停止累积 — AC-10 钉定 rAF( 恰 1、setInterval(/setTimeout( 均 0；单循环消除多定时器漂移，使 pause→getSimTime 冻结、resume 原样续播成为可断言行为（镜像融合站实测 1/0/0）。 (alternatives rejected: 每相独立 setInterval 计时器（被 AC-10 禁止）; CSS animation 驱动（无法编程暂停与读时，不满足 fissionSim API）)- **裂变站专属 HUD 组件**: chose 以守恒验算 HUD（质量数 236=141+92+3 / 电荷数 92=56+36）替换融合站 tempHud 温控组件组 — AC-05 要求展示守恒验算；融合站 tempNow/tempBar/tempStage/tempGoal 是 D-T 加热专属叙事，原样复用会引入与裂变无关文案并构成 AC-06 方向的跨题污染风险；其余 23 个外壳 id 逐一镜像（见 fission-shell-dom-ids 派生规则）。 (alternatives rejected: 原样镜像 tempHud 仅改名（引入无关温度叙事，YAGNI 且有污染风险）; 完全不设数据 HUD（无法满足 AC-05 守恒验算展示）)