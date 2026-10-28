// printing-digital/js/model/xerography.js — 静电照相网格模型（G16；D1 激光画板）
// 纯函数：charge → expose → develop。电位格 -100（充电满）→ 0（激光放电）；显影阈值 -40。
'use strict';

export const CHARGED = -100; // NO-PROV: 模型常量（充电满电位）
export const DISCHARGED = 0; // NO-PROV: 模型常量（曝光放空电位）
export const DEVELOP_THRESHOLD = -40; // NO-PROV: 模型常量（显影阈值）

export function makeGrid(cols, rows) {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => CHARGED));
}

/** 曝光：激光路径上的格放电到 DISCHARGED */
export function expose(grid, cells) {
  for (const [x, y] of cells) {
    if (grid[y] && grid[y][x] !== undefined) grid[y][x] = DISCHARGED;
  }
  return grid;
}

/** 显影：放电格（激光写过的图文区）吸附带电碳粉（write-black）；返回掩码 */
export function develop(grid, threshold = DEVELOP_THRESHOLD) {
  return grid.map((row) => row.map((v) => v >= threshold));
}
