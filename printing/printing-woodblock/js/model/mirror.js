// printing-woodblock/js/model/mirror.js — 反贴镜像模型（G01/G02）
// 纯函数：反贴上板时稿纸文字的「字符序」反转；字形镜像由渲染层 scale(-1,1) 完成。
'use strict';

/**
 * 雕版写样反贴：读入者看到的字符序反转。
 * @param {string} text 正字文本
 * @returns {string} 反序文本（印到版上即镜像文字）
 */
export function reverseForBlock(text) {
  return Array.from(String(text)).reverse().join('');
}

/** 雕版六步的合法顺序（G02 数据契约；步骤文案在 facts.SIX_STEPS） */
export const STEP_COUNT = 6; // NO-PROV: 非数值常量（流程长度）
