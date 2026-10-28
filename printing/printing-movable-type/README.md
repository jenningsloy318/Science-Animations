# printing-movable-type · 活字重组（M1–M4）

印刷史家族第 2 个开发动画（spec 10 §3 P2）。字的重组跃迁：毕昇泥活字 → 王祯转轮 → 《直指》/聚珍版。

## 场景

| id | 名称 | 拍点 |
|----|------|------|
| M1 | 毕昇的字库 | 窑火中胶泥灼烧成陶的变色瞬间 |
| M2 | 排版印刷循环 | 双版如齿轮般交替换位的循环动画 |
| M3 | 转轮排字盘 | 大转轮载着字格转到面前的"以字就人"（three.js） |
| M4 | 东方支线 | 25.3 万枚活字粒子汇聚成书山；金简算账（G03 场景家） |

## 运行 / 构建 / 测试

```bash
node --test tests/facts.test.mjs
```

## 页面（v2.3 统一单页）

全部 25 幕正片动画已合并到 **[`../printing/`](../printing/)** 一页：页顶 25 个 Tab 按时间轴顺序排列（W1 手抄 → F3 从印到造，五代配色），`?s=本页首幕` 深链直达。本项目保留 facts/模型/场景源码与测试。

## 验证节

- G03 活字经济性 crossover（editions=1 block ≤ movable；editions=50 movable < block；优势单调）
- G04 常用字备字 ≥ 20（《梦溪笔谈》"二十余"）
- G05 同一时间模型 wheelRetrievalTime ≤ shelfWalkTime
