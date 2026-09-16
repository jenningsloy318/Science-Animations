# 🔭 观天仪器 observatory-3d

中文 Three.js 多页签交互动画——**我们怎么观测宇宙**：把 8 件天文仪器拆成 8 个可玩的 3D 场景。
依据 `docs/requirements/05-observatory-3d-animation-spec.md`（v1.3，三轮在线事实复核）。

## 运行

- **推荐（开发）**：直接打开 `index.html`（模块化入口，`file://` 可开，改完即时生效）。
- **离线单文件**：`python3 build.py` → 生成 `observatory.html`（所有脚本内联，零外链，离线可开）。
  > `observatory.html` 是**生成物**，请勿手改；改源码后重跑 `build.py`。

## 8 个页签

| # | 页签 | 讲什么 | 核心方程 |
|---|------|--------|---------|
| T1 | 📨 信使全家福 | 五信使 vs 四可观测量 | — |
| T2 | 🔭 望远镜 | 口径越大越强：聚光与衍射 | θ=1.22λ/D；聚光∝D² |
| T3 | 🌈 光谱仪 | 光怎么读出温度和成分 | λmax=2.898×10⁻³/T |
| T4 | 🚑 多普勒 | 谱线位移测速、给行星称重 | Δλ/λ=v/c；K=28.4·… |
| T5 | 📡 干涉仪 | 小镜子装成大眼睛 | θ=λ/B（阵列约定） |
| T6 | ✨ 自适应光学 | 除掉星星的眨眼 | seeing vs 衍射极限 |
| T7 | 📷 探测器 | 光怎么变成数字 | F=N/(QE·t·A) |
| T8 | 🌊 光之外 | LIGO / IceCube / 样品返回 | h=ΔL/L |

每个页签 3 拍（提问 6 s → 方法 14 s → 你来玩 20 s），底部「语言条」标注该仪器真正输出的可观测量。

## 「数据流水线」

每页签右侧固定一条流水线，演示真实计算链：

```
原始读数 → 应用方程 → 逐步算术 → 真实结果
```

拖滑块时四段同步更新。所有数字核对至 2026-09-16，来源见规格附录 11.1/11.3。

## 文件

```
observatory-3d/
  index.html              # 模块化入口（开发用）
  observatory.html        # build.py 生成的单文件（离线，勿手改）
  build.py                # 内联脚本 → 单文件
  README.md
  vendor/three.min.js     # three.js r158 UMD（不改）
  js/
    data.js               # 事实文案 + 纯函数（数据正确性唯一来源）
    utils.js              # OrbitLite / tween / RNG / 标签(引线+箭头) / 波前环 / 光路
    materials.js          # PBR 材质 + 程序化 PMREM 环境光
    pipeline.js           # 「数据流水线」组件
    ui.js                 # 页签条 / 拍进度 / 讲解面板 / 语言条 / 帮助
    main.js               # 渲染器 / 相机 / 页签状态机 / 拍时钟 / 键盘
    tab-t1..t8.js         # 8 个页签模块（build/update/dispose/reset/probe）
```

## 测试

- 纯函数（`data.js` 的 `APP.F.*`）：`node --check js/*.js` + golden values 断言脚本。
- 交互：headless Chrome（CDP），`window.__errs` 必须为空，`APP.app.probe()` 返回非空。
- 数学契约（规格 §7.2，12 条）：见 `docs/requirements/05-observatory-3d-animation-spec.md`。

### 2026-09-16 验收结果（headless Chrome）

- 12/12 golden values 在 node 中重算通过（±2%）：人眼衍射 19.8″ / 哈勃 0.058″ / ELT 3.5 mas、
  聚光 ELT 3.10×10⁷、Wien 5,772 K → 502 nm、3,000 K → 966 nm、多普勒 +234 km/s、
  HARPS 0.97 m/s → 2.1 fm、**EHT 1.3 mm/10,700 km → 25.1 μas（分辨 M87 环）**、
  ALMA 1 mm/16 km → 12.9 mas、GW 应变 4×10⁻¹⁸ m。
- 8 个页签全部 0 JS 错误、0 console.error，逐页签截图 PIL 墨量分析均非空（中心亮度 14.9–66.3）。
- 规格 §7.3 交互验收 4/4：
  1. T2 拖到 ELT → 聚光 3.10×10⁷、分辨 0.0035″ ✓
  2. T4 拖到 +234 km/s → 谱线位移 + z=0.00077 更新 ✓
  3. 语言条：T2 亮度+角度、T4 波长、T8 时间+亮度+波长 ✓
  4. OrbitLite 视角经页签往返**保留**（拖动后 az −0.3/pol 0.95，切走再切回不变）✓
- T8 A/B/C 三段切换、T1 点击信使联动语言条、T5 基线档位（含 EHT「分辨/未分辨」判定）均验证通过。
- 单文件 `observatory.html`：15 个脚本内联、**零外链**（离线可开），逐页签冒烟 8/8 ok。

## 快捷键

`←/→` 换页签 · `↑/↓` 换拍 · `空格` 暂停 · `1–8` 跳页签 · `R` 重置视角 · `H` 帮助 · 拖拽/滚轮/双击 控相机

---

⚠ 所有 3D 场景为**示意图**，结构与比例经简化，**非实时观测数据**。
