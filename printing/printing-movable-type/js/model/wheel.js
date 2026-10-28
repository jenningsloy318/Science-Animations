// printing-movable-type/js/model/wheel.js — 转轮检字时间模型（G05；M3 场景）
// 纯函数：同一时间量纲下比较「转轮以字就人」与「线性字架走向字架」。
'use strict';

/**
 * 转轮取字耗时（秒）：转动半圈以内的弧长 / 轮转速。
 * @param {{sectors:number, targetIndex:number, rpm:number}} p
 */
export function wheelRetrievalTime(p) {
  const halfTurn = Math.floor(p.sectors / 2);
  const steps = Math.min(p.targetIndex % p.sectors, halfTurn);
  const turns = steps / p.sectors;
  return (turns / p.rpm) * 60;
}

/**
 * 线性字架取字耗时（秒）：走到目标格再走回。
 * @param {{cells:number, targetIndex:number, paceCellsPerSec:number}} p
 */
export function shelfWalkTime(p) {
  const backForth = 2 * p.targetIndex;
  return backForth / p.paceCellsPerSec;
}
