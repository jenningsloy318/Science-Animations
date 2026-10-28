// printing-woodblock/js/facts.js — 雕版项目常量 SSOT（全 PROV；G01/G02 数据源）
// 格式对齐 particle-collider/js/data.js：行尾 // PROV: <tag> | <source> | <date|-> | <premise>
'use strict';

/** 雕版六步（书第 2 章工艺流程；顺序不可变） */
export const SIX_STEPS = [
  { zh: '选材备板', en: 'Select & plane wood' },
  { zh: '写样',     en: 'Write the master' },
  { zh: '反贴上板', en: 'Paste face-down' },
  { zh: '雕刻',     en: 'Carve' },
  { zh: '校对修版', en: 'Proof & repair' },
  { zh: '刷印',     en: 'Print' },
]; // NO-PROV: 非数值常量（流程名）

/** 合格印版厚度区间（厘米） */
export const BLOCK_THICKNESS_CM = [2, 3]; // PROV: measured | 书第 2 章 | - | 印版通常厚约 2–3 厘米

/** 一版可连续印刷张数（量级区间） */
export const BLOCK_LIFE_SHEETS = [300, 2000]; // PROV: measured | 书第 2 章（"数百乃至数千张"）| - | 版面磨损前的印数量级

/** 现存最早有明确纪年的雕版印刷品 */
export const DIAMOND_SUTRA_YEAR = 868; // PROV: measured | 书附录（敦煌《金刚经》，史有明纪）| 868 | 事件年份为固定史实，不适用保鲜期

/** W1 抄书天数演示参数（一本 ~5 万字的书，量级示意） */
export const HAND_COPY_DAYS = 1200; // PROV: illustrative | spec 10 §11.1（学术锚点 Overgaauw 1995）| - | 抄完一本书的天数，仅量级示意

/** 反贴演示用文本 */
export const DEMO_TEXT = '印刷术'; // NO-PROV: 非数值常量（演示文本）
