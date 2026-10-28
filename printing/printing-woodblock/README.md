# printing-woodblock · 雕版印刷（W1–W3）

印刷史家族第 1 个开发动画（spec 10 §3 P1）。凸版之源：从手抄的艰难，到雕版六步工艺，再到刷印工坊。

## 场景

| id | 名称 | 拍点 |
|----|------|------|
| W1 | 手抄的时代 | 日历纸页如雪片翻飞，一年过去书才抄一半 |
| W2 | 雕版诞生记 | 稿纸 180° 翻转上板、正字实时变反字 |
| W3 | 刷印工坊 | 揭纸瞬间正字显现 + 墨香粒子 |

## 运行 / 构建 / 测试

```bash
node --test tests/facts.test.mjs
```

## 页面（v2.3 统一单页）

全部 25 幕正片动画已合并到 **[`../printing/`](../printing/)** 一页：页顶 25 个 Tab 按时间轴顺序排列（W1 手抄 → F3 从印到造，五代配色），`?s=本页首幕` 深链直达。本项目保留 facts/模型/场景源码与测试。

## 数字来源

全部展示数字带 `// PROV:` 标签（见 `js/facts.js`），口径速查见
`docs/requirements/10-history-of-printing-animation-spec.md` 附录 11.1。

## 验证节

- G01 `reverseForBlock("印刷术") === "术刷印"`（node:test 实测）
- G02 六步顺序断言（node:test 实测）
