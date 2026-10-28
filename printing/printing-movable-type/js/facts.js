// printing-movable-type/js/facts.js — 活字项目常量 SSOT（全 PROV）
'use strict';

/** 毕昇泥活字（书第 3 章口径：时间轴排序年 1040；展示文案用"庆历年间"） */
export const BISHENG_SORT_YEAR = 1040; // PROV: measured | 书附录 | 1040 | 时间轴排序口径（固定史实）
export const QINGLI_RANGE = [1041, 1048]; // PROV: measured | 《梦溪笔谈》"庆历中" | 1041–1048 | 发明年代区间（固定史实）
export const CLAY_THIN_NOTE = { zh: '薄如钱唇', en: 'thin as a coin’s rim' }; // NO-PROV: 非数值常量（原文引用）
export const COMMON_DUP = 20; // PROV: measured | 《梦溪笔谈》（书第 3 章）| - | 常用字每字备制二十余枚

/** 王祯转轮（书第 4 章；转引《农书·造活字印书法》） */
export const JINGDE_YEAR = 1298; // PROV: measured | 书第 4 章 | 1298 | 《旌德县志》排印年（固定史实）
export const JINGDE_CHARS = 30000; // PROV: measured | 书第 4 章（约 3 万木活字）| - | 旌德县志用字模数
export const JINGDE_COPIES = 100; // PROV: measured | 书第 4 章（不出一月印百部）| - | 印数
export const WHEEL_DIAMETER_CHI = 7; // PROV: measured | 《农书》转引（徽文化频道）| - | 转轮直径可达约七尺
export const WHEEL_HEIGHT_CHI = 3; // PROV: measured | 《农书》转引（徽文化频道）| - | 轮面离地约三尺

/** 朝鲜《直指》（书第 5 章/附录） */
export const JIKJI_YEAR = 1377; // PROV: measured | 书附录 | 1377 | 清州兴德寺金属活字印本（固定史实）
export const JIKJI_UNESCO_YEAR = 2001; // PROV: measured | 书附录 | 2001 | 入选世界记忆名录（固定史实）

/** 武英殿聚珍版（书第 7 章；御制诗文作"单字计二十五万馀"） */
export const JUZHEN_YEAR = 1773; // PROV: measured | 书第 7 章 | 1773 | 乾隆批准金简奏请（固定史实）
export const JUZHEN_TYPES = 253500; // PROV: measured | 书第 7 章（御制诗"二十五万馀"）| - | 枣木活字数（通称）
export const JUZHEN_TITLES = 138; // PROV: measured | 书第 7 章（哈佛藏本 138 种 2416 卷）| - | 印书种数
export const JUZHEN_VOLS = 2416; // PROV: measured | 书第 7 章（哈佛藏本）| - | 印书卷数

/** M4 金简算账 / M2 演示字库 */
export const DEMO_LIB_SIZE = 3000; // PROV: illustrative | 场景演示参数 | - | 模型字库规模（量级示意）
export const DEMO_CHARS_PER_EDITION = 100; // PROV: illustrative | 场景演示参数 | - | 每版字数示意
