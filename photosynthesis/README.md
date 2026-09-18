# 光合作用 · 一片叶子里的能量工厂

用四个 3D 视图把光合作用讲清楚：先一句话看懂总故事 → 看发生在哪（一页三级放大）→ 在同一屏幕上看完整机器：膜上充电放氧、基质里花电池拼糖 → 用已核实的数字看真相。

## 五个视图

| 视图 | 内容 |
| --- | --- |
| ① 一图看懂 | 一片大叶子 + 实物流动：阳光雨、根送上来的水、空气里的 CO₂、拼出的糖块、冒走的氧气泡；“一分钟故事”四句大字幕带看 |
| ② 叶子里 | 一页同屏三级放大：叶片横切 →叶肉细胞 →叶绿体（放大镜锥连接），自动导览 |
| ③ 光反应 + 拼糖 | 一台完整的机器：上半类囊体膜充电+放氧（Kok 循环、ATP 合酶），下半基质拼糖环；ATP/NADPH 电池片掉进环里被花掉，空电池飞回膜上再充——闭环同屏 |
| ④ 数字与真相 | 吸收光谱（为什么叶子是绿的）、效率阶梯（作物 1–2% vs C3 理论 4.6% / C4 6% vs 太阳能板 24%）、全球尺度、历史时间线 |

## 核心数字（均已核实，见来源）

- 总反应：6 CO₂ + 6 H₂O + 光 → C₆H₁₂O₆ + 6 O₂（葡萄糖储能量 2870 kJ/mol）
- 量子需求：放 1 个 O₂ 理论最少 **8 个光子**（4e⁻ × 2 光系统），实测 8–10
- 卡尔文循环：每 CO₂ 花 **3 ATP + 2 NADPH**；每葡萄糖 18 ATP + 12 NADPH
- ATP 合酶：菠菜 c14 环，每转 14 H⁺ 合成 3 ATP（≈4.67 H⁺/ATP）
- 叶绿素 a 吸收峰 430 / 662 nm；叶绿素 b 455 / 642 nm
- 效率上限：C3 4.6%、C4 6%（Zhu et al. 2008）；田间实际约 1–2%
- OEC（Mn₄CaO₅）走 Kok 五态循环；RuBisCO 每秒约 3 次，是地球上最多的酶
- 全球：陆地 GPP ≈ 120 Gt C/年；大气 O₂ ≥ 一半来自海洋浮游植物（NOAA）

## 技术

three.js（WebGL2 渲染器；WebGPU 需要额外构建链且无离线/无头验证收益，本作沿用 hub 的 vendored three r160 方案）+ esbuild 打包为单文件 `photosynthesis.html`（零 CDN）。纯数据模块 `js/facts.js` 可直接 node 测试：

```bash
node --test tests/facts.test.mjs   # 10/10
python3 build.py                   # 生成单文件
```

本地预览遵循仓库规则：`make dev` 后访问 <http://localhost:8321/photosynthesis/>。

## 已知简化（诚实声明）

- 几何为示意：类囊体膜、光系统、ATP 合酶均为风格化模型，非分子结构
- 光反应动画为单电子因果示意；真实的 PQ/Q 循环化学计量（每 2e⁻ 约 4 H⁺ 入腔）做了可视化近似
- 卡尔文循环展示"一_cycle 示意"：真实循环中 5/6 的 G3P 留在循环里再生 RuBP
- 吸收曲线为高斯近似，非实测光谱数据

## 来源

| 事实 | 来源 |
| --- | --- |
| 理论效率上限 C3 4.6% / C4 6% | Zhu, Long & Ort 2008, Curr Opin Biotechnol |
| Kok 循环 S0–S4、Mn₄CaO₅ | Wikipedia: Oxygen-evolving complex; PMC10203033 |
| 叶绿素吸收峰 430/662、455/642 nm | Hamburg Univ. botany online; alpha-measure |
| c14 环、14 H⁺/转 | Vollmar et al. 2009 (PMC2709358) |
| O₂ ≥50% 来自浮游植物 | NOAA Ocean Service |
| Ruben & Kamen ¹⁸O (1941)、Priestley 1771、Ingenhousz 1779 | Khan Academy / Wikipedia: Sam Ruben |
| Z 方案电子传递链 | rseco.org 'Z-scheme electron flow'; LibreTexts |
| GPP ≈ 120 Gt C/年 | Liao et al. 2023 (Sci Data); NASA SVS |
| 太阳能板 24% 量产 / 27.81% 纪录 | 本仓库 solar-cell 项目已核实（LONGi HIBC 2025） |
