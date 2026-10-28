// printing-gutenberg/js/facts.js — 谷登堡常量 SSOT（全 PROV）
'use strict';

/** 谷登堡合金配比窗口（书第 6 章配方表；G06–G08 断言依据） */
export const ALLOY_WINDOW = {
  pb: [80, 85], // PROV: measured | 书第 6 章配方表 | - | 铅 80–85%（基体，熔点低）
  sb: [10, 15], // PROV: measured | 书第 6 章配方表 | - | 锑 10–15%（热缩冷胀剂）
  sn: [5, 10],  // PROV: measured | 书第 6 章配方表 | - | 锡 5–10%（降熔增韧）
};

/** 《42 行圣经》（UNESCO/Wikipedia/Clausen census；G09 数据源） */
export const BIBLE_PAGES = 1282; // PROV: measured | UNESCO Memory of the World | - | 42 行圣经总页数（固定史实）
export const BIBLE_PRINTED = 180; // PROV: measured | Wikipedia/Clausen census | - | 印量约 180 部（固定史实）
export const BIBLE_PAPER = 150; // PROV: measured | Clausen census | - | 纸印 150 部
export const BIBLE_VELLUM = 30; // PROV: measured | Clausen census | - | 羊皮纸印 30 部
export const BIBLE_SURVIVING = 49; // PROV: measured | UNESCO/Wikipedia | - | 现存约 49 部
export const BIBLE_VELLUM_COMPLETE = 4; // PROV: measured | UNESCO | - | 羊皮完本 4 部
export const BIBLE_YEAR = 1455; // PROV: measured | 书第 6 章 | 1455 | 完成年（固定史实）
