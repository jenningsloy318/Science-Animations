// printing-press-age/js/facts.js — 蒸汽与热金属常量 SSOT（全 PROV）
'use strict';

/** 加压三代速度锚点（认证值，与 common/js/printing/speedLadder.js 同源口径） */
export const HAND_SPH = 250; // PROV: measured | Smithsonian/HistoryofInformation #39 | - | 手工木制印刷机 ~240–250 页/时
export const STEAM_SPH = 1100; // PROV: measured | HistoryofInformation #4613；Koenig & Bauer | 1814 | 科尼希蒸汽机《泰晤士报》，手工 4 倍以上
export const ROTARY_SPH = 8000; // PROV: measured | NIHF (invent.org) | 1847 | 霍伊轮转机 8,000 份/时
export const SHEETFED_SPH = 20000; // PROV: measured | Koenig & Bauer Rapida 106 X | 2008+ | 现代单张纸胶印上限
export const WEB_SPH = 90000; // PROV: measured | Koenig & Bauer Commander CT | - | 卷筒纸轮转（成品报纸）上限

export const KOENIG_YEAR = 1814; // PROV: measured | HistoryofInformation #4613 | 1814 | 11 月 29 日首印《泰晤士报》（固定史实）
export const HOE_YEAR = 1847; // PROV: measured | NIHF | 1847 | 轮转机首用于《公众纪事报》（固定史实）
export const LINOTYPE_YEAR = 1886; // PROV: measured | 书第 9 章 | 1886 | 《纽约论坛报》首次投产（固定史实）
export const LINOTYPE_FACTOR = [3, 5]; // PROV: measured | Wikipedia（与书一致；另口径 4–8×）| - | 相对手工排字提速倍数
export const MONOTYPE_YEAR = 1887; // PROV: measured | 书第 9 章 | 1887 | 兰斯顿单字铸排机（固定史实）
export const NYT_FAREWELL_YEAR = 1978; // PROV: measured | 书第 9 章 | 1978 | 最后一个铅版 "Farewell, Etaoin Shrdlu"（固定史实）
export const LINOTYPE_KEYS = 90; // PROV: measured | Wikipedia；linotype.wiki | - | 90 键键盘/字模库 90 通道
