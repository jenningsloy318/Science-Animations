# printing-woodblock · 雕版印刷（W1–W3）

印刷史家族第 5 个开发动画（spec 10 §3 P4）。机器接管：加压三代（平压平→平压圆→圆压圆）与整行铸排。

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

- G01 `reverseForBlock("印刷术") === "术刷印"`（node:test 实测）
- G02 六步顺序断言（node:test 实测）
| A1 | 加压方式进化 | 平板折变成滚筒、速度跃迁 |
| A2 | 整行铸排机 | 字模队列滑行、铅水浇铸整行出炉 |
| A3 | 单字铸排与谢幕 | 铅字架暗下、最后一行铅字打上聚光 |
