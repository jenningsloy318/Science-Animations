# printing-frontier · 从印到造（F1–F3）

印刷史家族第 8 个开发动画（spec 10 §3 P7）。从印到造：SLA/FDM/SLS 切片、EUV 光刻、纳米压印与三级跳收束。

## 场景

| id | 名称 | 拍点 |
|----|------|------|




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

- G01 `(G18) slice(20,0.2)=100 层、(G19) EUV 13/8 nm 锚点`（node:test 实测）
- G02 六步顺序断言（node:test 实测）
| F1 | 把层当活字 | 千层薄片逐层生长成花瓶的延时镜头（three.js） |
| F2 | 光刻：终极印刷 | EUV 光束穿过掩膜、纳米图案在晶圆显影 |
| F3 | 从复制到创造 | 一页纸→一张图→一个器官的三级跳收束 |
