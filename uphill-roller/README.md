# 锥体上滚 · 双锥体在 V 型轨道上的视觉错觉

把一颗双锥体放在两根倾斜且向外张开的木棍（V 型轨道）上，它会沿着轨道向**高端**滚动，看起来在爬坡——实际上它的**重心一直在下降**。这是 1694 年 William Leybourn《Pleasure with Profit》里记载的经典力学错觉。

## 三视图

- **3D 场景**：真实几何。金色锥体沿轨道上行，下方金色曲线是重心实际路径（下降），蓝色标记是接触点（视觉上升）。
- 调节 α（倾角）/ β（张口）/ γ（锥角）滑块，实时查看条件 `tanα < tanβ·tanγ` 是否成立；点 **Leybourn 配方** 回到 1694 年实测模型（推导结果等价于 **143 > 134**）。

## 物理公式

重心高度 `y(x) = r + x·(tanα − tanβ·tanγ)`（x 为沿轨道的水平位移）。
上坡充要条件：`tanα < tanβ·tanγ` —— 轨道越缓、张口越大、锥体越钝，越容易上坡。

纯数学模块 `js/roller.js` 无 THREE 依赖，可直接跑 `node --test tests/roller.test.mjs`（12 项）。

## 在线验证

`make dev` 启动开发服务器后打开 <http://localhost:8321/uphill-roller/>；
单文件版 `uphill-roller.html` 离线可用（零 CDN）。

## 数据来源

- plus.maths.org, *"Defying gravity: The Uphill Roller"* — 公式 y(x)、条件 tanα < tanβ·tanγ、Leybourn 实测角度 α=4.6° β=15.3° γ=25.4°。
- William Leybourn, *Pleasure with Profit* (1694), pp.12–13 —— 历史配方与"143 > 134"推导。
- arXiv:2608.19541 (Van-Duy Nguyen, 2026) —— 双锥体悖论推广至球体（玻璃珠）与椭球体。
- 《大学物理》/ 理论力学课程相关教学分析（锥体在 V 槽中的质心轨迹与纯滚动条件）。

## 本地构建

```bash
cd uphill-roller && python3 build.py     # 生成 uphill-roller.html（单文件）
node --test tests/roller.test.mjs       # 数学模块测试
```
