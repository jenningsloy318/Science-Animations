// printing-frontier/js/model/slicing.js — 3D 切片模型（G18；F1 切片台）
'use strict';

/**
 * @param {number} heightMm 模型高
 * @param {number} layerMm 层高
 * @returns {{layers:number, timeMin:number}} layers = ceil(h/l)；时间与层数线性（0.2 mm 层 ~1.2 min/层 示意）
 */
export function slice(heightMm, layerMm, minPerLayer = 1.2) {
  const layers = Math.ceil(heightMm / layerMm);
  return { layers, timeMin: Math.round(layers * minPerLayer) };
}
