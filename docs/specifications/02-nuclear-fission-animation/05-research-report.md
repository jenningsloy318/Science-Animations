# Research Report: 核裂变交互动画（nuclear-fission-3d）外部知识研究：物理常数锚定、three@0.160.0+es-module-shims 依赖外壳、file:// 运行时与单 rAF 时钟模式、node:test 门禁形式

- **Date**: 2026-08-27
- **Generated**: 2026-08-27T21:20:52.738+08:00
- **Author**: super-dev:research-agent

---

## Summary

在线研究确认本规格的全部外锚点均可落地。(1) 物理常数：AC-05 锚定的 n+²³⁵U→激发复核²³⁶U*→钡-141+氪-92+3个中子链条与守恒验算（质量数236=141+92+3、电荷数92=56+36）经 OpenStax College Physics 2e §32.6、Wikipedia/U-235(NPL Kaye&Laby 数据) 及人教版配套课件交叉核实，能量口径「200 MeV ≈ 3.2×10⁻¹¹ J」成立（Wikipedia 给出精确值 202.5 MeV = 3.24×10⁻¹¹ J；人教版教辅以 Δm≈0.3578×10⁻²⁷kg 算得 ≈3.22×10⁻¹¹ J）；需留意教材插图用的是钡144/氪89 变体并自称『铀核裂变的产物是多样的』，AC-05 钉定的钡141/氪92 同样是真实典型裂变道，文案照抄 AC 即可并建议补一句教科书原话消歧。(2) 依赖外壳：三个被钉定的 CDN 产物当日实测均 HTTP 200 且返回 access-control-allow-origin:*（jsdelivr three@0.160.0 build/three.module.js、examples/jsm/ 前缀映射、es-module-shims@1.10.0），这正是 import map + 远程模块能在 file:// 不透明源下工作的关键；MDN 明确告诫纯本地 ES 模块在 CORS 执行严格的浏览器中会报错，es-module-shims 在原生支持 import map 的现代浏览器里惰性不动——故 SCENARIO-001 的 file:// 直开可用性与降级提示的可达性取决于外壳如何拉起 main.js，须在实现阶段逐字镜像兄弟站既有机制，并把友好降级提示做成默认可见、JS 成功后再隐藏。(3) 运行时：three.js r160 官方 Clock 文档证实 getDelta() 每次调用都会重置 oldTime、getElapsedTime() 也共享该内部状态，因此暂停冻结必须走「每帧一次 getDelta + 受门控累加器」而非切换 clock.running；r152+ 需用 outputColorSpace，useLegacyLights 到 r165 已移除、r160 时代只能接受其弃用警告。(4) 门禁：Node v24 测试运行器文档背书 glob 参数形式（默认匹配族包含 **/*.test.{cjs,mjs,js}），与 AC-08 的实测基线方向一致。aria-pressed 切换按钮、:focus-visible 可见焦点样式均有 MDN/W3C C45 权威出处。未发现需要再一轮联网研究的阻塞性问题。

## Options Considered

### OPT-01 | 依赖外壳：逐字镜像聚变站 import map（three@0.160.0 ×2 指向 jsdelivr build/three.module.js 与 examples/jsm/ 前缀映射 + es-module-shims@1.10.0 加载器）【推荐】

推荐：已实测验证（2026-08-27 当日 HTTP 探测）cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js、examples/jsm/controls/OrbitControls.js、es-module-shims@1.10.0/dist/es-module-shims.js 三者均 200 且 access-control-allow-origin:*——正是 ACAO:* 使 CDN 模块能被 file:// 不透明源(null)页面加载；import map 形状遵循官方三件套："three" 映射 build/three.module.js、"three/addons/" 尾斜杠路径前缀映射 examples/jsm/（MDN 确认尾斜杠键按最长前缀匹配），这正解释了 AC-02 要求 three@0.160.0 字符串恰好出现 2 次。备选方案均不合规：升级到 r165+ 会撞上 useLegacyLights 已在 r165 移除、光照物理化默认值变化与 AC-02 的版本钉定双重冲突；换成 unpkg 则违反 jsdelivr 逐字地址钉定。es-module-shims 在支持原生 import map 的浏览器（Chromium≥89/Firefox≥108/Safari≥16.4）里经特征检测后完全惰性、不产生额外开销，仅在旧浏览器进入基于 fetch 的 shim 重载（该模式在 file:// 下无法工作）。服务于 AC-01/AC-02/SCENARIO-001~003。
### OPT-02 | 科学文案：采用 AC-05 钉定的 铀-235→铀-236*→钡-141+氪-92+3个中子 通道并展示 质量数236=141+92+3、电荷数92=56+36 【必须，且可加一句教科书原话消歧】

必须：守恒验算自洽（Ba Z=56、Kr Z=36 为元素周期表事实，多份资料方程中直接标出 ₅₆Ba、₃₆Kr），能量口径获权威数据支撑：Wikipedia(U-235) 引 NPL Kaye&Laby 给出每次裂变 202.5 MeV＝3.24×10⁻¹¹ J，OpenStax 例32.4 以『average fission produces 200 MeV、1 MeV=1.60×10⁻¹³ J』演算，人教版教辅以 Δm≈0.3578×10⁻²⁷kg 算得 ≈3.2×10⁻¹¹ J(≈201MeV)，故「200 MeV」「≈3.2e-11 J」逐字锚定无科学错误。注意点：人教版教材正文插图（图5.4-1，电子扫描见 Scribd 全本）画的是 钡144+氪89+3n，而课件/教辅最典型方程又写 ¹⁴¹Ba+⁹²Kr——教材自己声明『铀核裂变的产物是多样的，一种典型的铀核裂变是生成钡和氪』，两对产物都是真实裂变道。建议文案照搬该句消歧，既贴近人教版原文又不与 AC-05 字面冲突。禁止改用 Ba-144/Kr-89，否则违反 AC-05 逐字锚定。服务 AC-05/SCENARIO-014~016。
### OPT-03 | 启动健壮性：把 window.__errs=[] 收集器注册进 index.html 里一段早于模块的代码，且降级提示层默认可见、由 JS 成功后再隐藏【推荐】

推荐：MDN《JavaScript Guide — Modules》明确指出以 file:// 打开含模块的本地页会因模块安全(CORS/不透明源)要求报错，Chromium 下外部 file:// 模块脚本会被 CORS 拦截（Firefox 对同目录子树放行、Safari 宽松），es-module-shims 又在原生支持 import map 的现代浏览器中完全不接管加载——因此若所有防御逻辑都写在 js/main.js 里，一旦模块本身没被加载就全部失效。把错误收集器与降级提示做成 HTML 内联/默认可见，可同时满足 SCENARIO-001（无需本地服务）、SCENARIO-027（__errs 监听先于运行期异常）与 SCENARIO-028/AC-10（WebGL 失败友好文字而非白屏），并与镜像兄弟站的既有行为一致（实现阶段须以代码评估阶段实测的兄弟站机制为准逐字复制，勿自行发明第三种加载方式以免破坏 AC-02 镜像断言）。WebGL 检测沿用 Three 场景创建 try/catch + WebGL2 能力探测即可。服务 AC-10/SCENARIO-001/026~028。
### OPT-04 | 相位时钟：getDelta() 每帧调用一次，用受门控的累加器驱动暂停冻结（simTime += paused ? 0 : Math.min(delta, 上限)），不要碰 getElapsedTime() 或手动开关 clock.running【推荐】

推荐：r160 版 Clock 文档（仓库内 Clock.html 源文，已逐字核对）明确 getDelta() 返回自 oldTime 以来的秒数并把 oldTime 重置为当前时间，而 getElapsedTime() 同样会写 oldTime——两者同帧混用必然互相污染 delta；社区共识（threejs 论坛/Timer 文档）为每帧只调一次 getDelta 并避免随意改 running 标志（start() 会清零 elapsedTime、resume 时序不当会产生大 delta 尖峰）。门控累加器天然满足 AC-04 的语义：pause 后 getSimTime 读数零增长、resume 从冻结点续算、reset 归零回到 atoms 相重新计时；delta 用 Math.min(~50ms) 截顶防止标签页后台节流恢复后相位跳变。该方案同时守住 AC-10 的量化约束：requestAnimationFrame( 恰好 1 次、setInterval(/setTimeout( 为 0、时钟由 clock.getDelta() 驱动。gotoPhase 合法键立即切相、非法键静默忽略、reset 不动导览，均为纯状态机分支，不引入任何额外定时器。服务 AC-03/AC-04/AC-10/SCENARIO-008~010/026。
### OPT-05 | 回归门禁执行形式：坚持 node --test nuclear-fusion-3d/tests/*.test.mjs 与 nuclear-fission-3d/tests/*.test.mjs 的 glob 参数形式，禁用目录参数形式【照办】

照办并有文档背书：Node v24 官方测试运行器文档写明可在命令行最后位置提供一个或多个 glob 模式参数、模式遵循 glob(7)、建议加引号防 shell 展开（默认发现模式族恰好包含 **/*.test.{cjs,mjs,js}，*.test.mjs 属一等公民）；因此未加引号时由 shell 展开成显式文件路径列表、加了引号时由 Node 自建 glob，两条路径都成立且跨版本稳定。目录参数形式（node --test <dir>/）在基线环境 Node v24.15.0 被实测确定性失败，属项目钉定事实，规范明令禁止即采信；文档并未赋予目录形式更优保证。新增 3 个以上套件文件沿用同一 glob 门禁全绿，且任何转红仅允许修正新增物自身（AC-08 兼容边界条款）。服务 AC-08/SCENARIO-021~023。

## Sources

- [OpenStax College Physics 2e — 32.6 Fission（典型中子诱发裂变式 n+²³⁵U→¹⁴²Ba+⁹¹Kr+3n 的 Z/A 守恒演算；200 MeV 平均值与 1 MeV=1.60×10⁻¹³ J 换算示例）](https://openstax.org/books/college-physics-2e/pages/32-6-fission)
- [Wikipedia: Uranium-235（每次裂变 202.5 MeV = 3.24×10⁻¹¹ J；复合核 ²³⁶U 中间态；分项能量预算表）](https://en.wikipedia.org/wiki/Uranium-235)
- [LBL Isotopes Project — Nuclear Fission Energy wallchart chapter（搜索结果来源）](https://www2.lbl.gov/nsd/education/ABC/wallchart/chapters/14/1.html)
- [夸克文档 — 人教版高中物理选修三 5.4 核裂变核聚变课件（最典型核反应方程式 ²³⁵U+n→¹⁴¹₅₆Ba+⁹²₃₆Kr+3n）](https://doc.quark.cn/preview/577164FEEBE532F004F98A87374DC1A9)
- [Scribd — 普通高中教科书·物理选择性必修第三册全本扫描（图5.4-1 示意图为 钡144/氪89；『铀核裂变的产物是多样的』原文表述）](https://www.scribd.com/document/1027646632/%E6%99%AE%E9%80%9A%E9%AB%98%E4%B8%AD%E6%95%99%E7%A7%91%E4%B9%A6-%E7%89%A9%E7%90%86%E9%80%89%E6%8B%A9%E6%80%A7%E5%BF%85%E4%BF%AE-%E7%AC%AC%E4%B8%89%E5%86%8C)
- [学科网 — 5.4 核裂变与核聚变 教学课件（中间产物铀236 讲解口径）](https://www.zxxk.com/soft/51611043.html)
- [jsdelivr CDN 实测：three@0.160.0 build/three.module.js（HTTP 200, ACAO *, 1.27MB）](https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js)
- [jsdelivr CDN 实测：three@0.160.0 examples/jsm/controls/OrbitControls.js（HTTP 200, ACAO *）](https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js)
- [jsdelivr CDN 实测：es-module-shims@1.10.0 dist/es-module-shims.js（HTTP 200, ACAO *；2024-04-28 发布）](https://cdn.jsdelivr.net/npm/es-module-shims@1.10.0/dist/es-module-shims.js)
- [MDN — JavaScript Guide: Modules（file:// 本地打开会遇到 CORS 错误需经服务器测试；import map 尾斜杠路径前缀匹配语义；inline module 可行性）](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [GitHub guybedford/es-module-shims README（polyfill 经特性检测，基线满足时不做任何事；动态导入不被 polyfill）](https://github.com/guybedford/es-module-shims)
- [Three.js r160 仓库源文档 — Clock（getDelta/getElapsedTime 均重置 oldTime；autoStart/start/reset 语义）](https://raw.githubusercontent.com/mrdoob/three.js/r160/docs/api/en/core/Clock.html)
- [Node.js v24 Test Runner 文档（glob 模式作为末位参数、遵循 glob(7)、建议引号；默认匹配 **/*.test.{cjs,mjs,js} 等）](https://nodejs.org/docs/latest-v24.x/api/test.html)
- [Three.js Wiki — Migration Guide（r152 起 outputColorSpace 取代 outputEncoding；useLegacyLights 时间线）](https://github.com/mrdoob/three.js/wiki/Migration-Guide)
- [Three.js r165 Release Notes（useLegacyLights 在 r165 被移除——r160 页面不得依赖它）](https://github.com/mrdoob/three.js/releases/tag/r165)
- [StackOverflow — Access to script at 'file://...' from origin 'null' blocked by CORS policy（经典案例帖；页面抓取被 403 拒，结论以 MDN 主源为准）](https://stackoverflow.com/questions/52919331/access-to-script-at-from-origin-null-has-been-blocked-by-cors-policy)
- [Three.js Discourse — CDN ES6 module import requires importmap (vanilla JS)](https://discourse.threejs.org/t/cdn-es6-module-import-requires-importmap-vanilla-js/68353)
- [MDN — ARIA button role（aria-pressed 将按钮定义为切换按钮；accName 来源规则）](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/button_role)
- [MDN — :focus-visible CSS 伪类（键盘焦点可见样式）](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:focus-visible)
- [W3C WAI — WCAG22 CSS Technique C45: Using CSS :focus-visible to provide keyboard focus indication](https://www.w3.org/WAI/WCAG22/Techniques/css/C45)
