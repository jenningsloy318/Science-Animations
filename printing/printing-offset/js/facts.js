// printing-offset/js/facts.js — 胶印常量 SSOT（全 PROV）
'use strict';

/** 标准四色网角（度）：K45/C15/M75/Y90(≡0°)；青-品红有效相隔 30° 防龟纹 */
export const SCREEN_ANGLES = { k: 45, c: 15, m: 75, y: 90 }; // PROV: measured | PrintPlanet；Kent the Book Printer（行业标准约定）| - | 四色网角通行约定

export const LITHO_YEAR = 1796; // PROV: measured | 书第 8 章 | 1796 | 塞内菲尔德发明石版印刷（固定史实）
export const OFFSET_YEAR = 1904; // PROV: measured | 书第 10 章 | 1904 | 橡皮布间接转印商业化（固定史实）
export const HALFTONE_YEAR = 1880; // PROV: measured | 书附录 | 1880 | 首张半色调照片上报（固定史实）
export const CTP_NOTE = { zh: 'CTP 直接制版：热敏/紫激光在 PS 版上直接成像，网点还原 1%–99%', en: 'CTP: thermal/violet laser images the plate directly, 1%–99% dot reproduction' }; // NO-PROV: 非数值常量
