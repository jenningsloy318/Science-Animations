// printing-digital/js/model/glyphSize.js — 字库级存储模型（G17；D4 王选场景）
// 分层纪律：模型输出是 derived（≥100×）；页面展示的 500–1000× 是 certified 史实（新华社），不作模型输出。
'use strict';

export const BOOK_HISTORIC_DEFAULTS = Object.freeze({
  chars: 7000,   // NO-PROV: illustrative（书史参数：常用汉字库量级）
  sizes: 16,     // NO-PROV: illustrative（十余种字号）
  fonts: 4,      // NO-PROV: illustrative（宋/黑/楷/仿）
  glyphPx: 96,   // NO-PROV: illustrative（排版质量点阵边长）
  outlineBytes: 300, // NO-PROV: illustrative（单字轮廓+参数描述字节数）
});

/**
 * 字库存储估算（位图法 vs 轮廓法）。
 * 位图 = chars × sizes × fonts × (glyphPx²/8)；轮廓 = chars × outlineBytes。
 * @returns {{bitmapBytes:number, outlineBytes:number, ratio:number}}
 */
export function libraryRatio(p = {}) {
  const q = { ...BOOK_HISTORIC_DEFAULTS, ...p };
  const bitmapBytes = q.chars * q.sizes * q.fonts * ((q.glyphPx * q.glyphPx) / 8);
  const outlineBytes = q.chars * q.outlineBytes;
  return { bitmapBytes, outlineBytes, ratio: bitmapBytes / outlineBytes };
}
