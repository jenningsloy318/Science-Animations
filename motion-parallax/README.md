# 运动视差 Motion Parallax

为什么坐在车里，近处的树"嗖"地飞过，远处的山却纹丝不动？

一个面向孩子的三视图交互演示：**感知速度 = 角速度 ω ≈ v/d**。
浏览器地址：`http://localhost:8321/motion-parallax/`（`make dev`）。

## 三个视图

| 视图 | 内容 |
| --- | --- |
| ① 乘车体验 | 黄金时刻的第一人称驾驶（可切后跟随）。路边大树 d=10 m、房子 60 m、山丘 540 m、高山 2.1 km、月亮——右侧 HUD 实时显示每个物体的感知角速度（°/s）与条形计。可开"视线扇"直接看到视线扫角。 |
| ② 扫角几何 | 俯视真实比例：只放两个目标（树 d=10 m / 山 d=200 m）同速出发，金色扫角扇面 + 量角器 + 齐平线；下方 ω(t) 曲线显示掠过时的“山峰”（齐平 = v/d，树 57°/s vs 山 2.9°/s）。默认 36 km/h 慢速，可暂停/重播。 |
| ③ 从树木到星空 | 恒星周年视差：地球公转为"车"（基线 2 AU），近距恒星相对背景星场画出视差椭圆。附鸽子点头 / 蜜蜂光流 / 移动 vs 变焦 / VR·SLAM 四张事实卡。 |

## 物理

- 精确瞬时角速度：**ω = v·d / (d² + x²)**（x 为沿轨偏移）；x = 0（齐平）时取峰值 **ω = v/d**——科普中常见的 ω ≈ v/d 是这个峰值。`js/parallax.js` 为纯计算模块，`tests/parallax.test.mjs` 9 项断言全部通过（`node --test tests/parallax.test.mjs`）。
- 标准算例（v = 72 km/h = 20 m/s）：树 10 m → 2.0 rad/s ≈ **114.6°/s**；山 2000 m → 0.01 rad/s ≈ **0.57°/s**；相差 **200 倍**。
- 月亮：步行 1.4 m/s、d = 384,400 km → ω ≈ 3.6×10⁻⁹ rad/s——树比月亮"快"约 4000 万倍。

## 诚实标注（简化与事实来源）

- ①的位移、距离为真实米制；画面就是浏览器的真实透视渲染——"近快远慢"是 3D 透视本身，不是图层速度差。雾气 = 大气透视（另一种静态深度线索），同时用来藏远处的场景循环。
- 月亮网格每帧跟随相机：距离趋于无穷时视差为零，这是物理本身而不是取巧。
- 车与树为风格化低多边形；③中星距被压缩约 10¹⁵ 倍才能"看见"视差角。
- 大树齐平时 ω 超过 ~100°/s——超过人眼平滑追踪上限，所以近处物体只能"扫过"。

## 验证过的事实与出处

| 事实 | 出处 |
| --- | --- |
| 鸽子/鸡"定点-前伸"头部点动，定点相为纯平移、用于光流稳定与深度（运动视差）采样 | Friedman 1975, *J. Exp. Biol.* 74:187 — "The Optokinetic Basis of Head-Bobbing in the Pigeon" |
| 蜜蜂用光流调控飞行速度（恒定视网膜流速 → v ∝ d 的逆用）；隧道壁越近飞得越慢；并以积分光流测量飞行距离（喂舞距离误读） | Srinivasan 等, "Visual control of flight speed in honeybees", *J. Exp. Biol.* 208 (2005)；Esch, Zhang, Srinivasan & Tautz, *Nature* (2001) "Honeybee dances communicate distances measured by optic flow" |
| 贝塞尔 1838 年发表 61 Cygni 视差 0.3136″ ± 0.0202″（现代值 0.286″，约 11.4 光年）——首颗视差测距恒星 | AAS "This Month in Astronomical History" 2021-11；Reid 2020 arXiv:2009.11913；ESA Gaia 史话 |
| 1 秒差距 ≡ 视差 1″ 的距离 ≈ 3.26 光年；比邻星视差 0.7685″ → 1.30 pc | 天文标准定义（Wikipedia: Stellar parallax / Parsec） |
| 人眼平滑追踪上限约 30–100°/s，超过需跳动式扫视；扫视峰值 700–900°/s 且期间视觉抑制 | Wikipedia: Smooth pursuit / Saccade；EyeWiki |
| 运动视差与双目立体可产生相当的深度知觉；仅给单一深度线索时视差常占优 → VR 需 6DoF 头部平移追踪 | *Annual Review of Vision Science* (2024) "Reexamining the Relationship Between Stereopsis and Motion Parallax"；IS&T JPI 等研究综述 |
| 变焦等比放大（无视差），摄影机移动才产生视差；《迷魂记》(1958) 首创"滑动变焦"反用两者 | Wikipedia: Dolly zoom；The Conversation 专题 |

## 构建与测试

```sh
node --test tests/parallax.test.mjs   # 数学模块 9 项断言
python3 build.py                      # esbuild 打包单文件 motion-parallax.html（离线可用）
make dev                              # 仓库根 Caddy 开发服务器 :8321
```

单文件 `motion-parallax.html` 无任何 CDN 依赖，可直接双击或部署到任意静态服务器。
