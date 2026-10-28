// printing/js/data/scenes.js — 家族 28 场景清单（spec 10 §3；G23 数据源）
// id 全局唯一；project = FAMILY id；beat = 拍点一句话（评审必审帧）。
'use strict';

export const SCENES = Object.freeze([
  // 枢纽 printing/
  { id: 'H1', project: 'hub',          zh: '五千年时间轴',   en: '5,000-year timeline',      beat: '拖动时五段色带如画卷展开、事件逐个点亮' },
  { id: 'H2', project: 'hub',          zh: '四大印版对照',   en: 'Four plate families',      beat: '四联同时上墨、墨各就各位的瞬间' },
  { id: 'H3', project: 'hub',          zh: '三大规律与三工艺', en: 'Three laws, three crafts', beat: '三卡翻开后合流成“从复制文字到复制物质”' },
  // printing-woodblock
  { id: 'W1', project: 'woodblock',    zh: '手抄的时代',     en: 'Age of hand copying',      beat: '日历纸页如雪片翻飞，一年过去书才抄一半' },
  { id: 'W2', project: 'woodblock',    zh: '雕版诞生记',     en: 'Birth of the block',       beat: '稿纸 180° 翻转上板、正字实时变反字' },
  { id: 'W3', project: 'woodblock',    zh: '刷印工坊',       en: 'Printing workshop',        beat: '揭纸瞬间正字显现 + 墨香粒子' },
  // printing-movable-type
  { id: 'M1', project: 'movable-type', zh: '毕昇的字库',     en: 'Bi Sheng’s type library',  beat: '窑火中胶泥灼烧成陶的变色瞬间' },
  { id: 'M2', project: 'movable-type', zh: '排版印刷循环',   en: 'Compose–print–dismantle',  beat: '双版如齿轮般交替换位的循环动画' },
  { id: 'M3', project: 'movable-type', zh: '转轮排字盘',     en: 'The type wheel',           beat: '大转轮载着字格转到面前的“以字就人”' },
  { id: 'M4', project: 'movable-type', zh: '东方支线',       en: 'Eastern offshoots',        beat: '25.3 万枚活字粒子汇聚成书山' },
  // printing-gutenberg
  { id: 'G1', project: 'gutenberg',    zh: '三级铸造',       en: 'Three-stage casting',      beat: '一颗钢冲分身出漫天铅字的分身瞬间' },
  { id: 'G2', project: 'gutenberg',    zh: '合金实验室',     en: 'Alloy lab',                beat: '铅水注入模具的凝固微膨胀特写' },
  { id: 'G3', project: 'gutenberg',    zh: '油墨与压机',     en: 'Ink & press',              beat: '压机压下、第一页《42 行圣经》显现' },
  { id: 'G4', project: 'gutenberg',    zh: '系统的胜利',     en: 'A system wins',            beat: '四路创新光流汇成一页完整书页' },
  // printing-press-age
  { id: 'A1', project: 'press-age',    zh: '加压方式进化',   en: 'Pressure evolves',         beat: '平板折变成滚筒、纸张如带飞驰的速度跃迁' },
  { id: 'A2', project: 'press-age',    zh: '整行铸排机',     en: 'The Linotype',             beat: '字模队列滑行、铅水浇铸整行出炉的长镜头' },
  { id: 'A3', project: 'press-age',    zh: '单字铸排与谢幕', en: 'Monotype & farewell',      beat: '铅字架暗下、最后一行铅字打上聚光的谢幕' },
  // printing-offset
  { id: 'O1', project: 'offset',       zh: '石版的秘密',     en: 'Secret of the stone',      beat: '水膜与油墨在平面上楚河汉界对峙' },
  { id: 'O2', project: 'offset',       zh: '从照片到网点',   en: 'Photo to halftone',        beat: '照片在网屏下碎成万点的分解瞬间' },
  { id: 'O3', project: 'offset',       zh: '橡皮布与三滚筒', en: 'Blanket & three cylinders', beat: '水膜被橡皮布甩飞的水雾粒子镜头' },
  { id: 'O4', project: 'offset',       zh: '全彩印刷工厂',   en: 'Full-color plant',         beat: '四色网点叠加显影出全彩照片的瞬间' },
  // printing-digital
  { id: 'D1', project: 'digital',      zh: '静电的魔法',     en: 'Electrostatic magic',      beat: '激光扫过处电荷熄灭、碳粉如铁屑吸附显影' },
  { id: 'D2', project: 'digital',      zh: '喷墨微滴',       en: 'Inkjet droplets',          beat: '皮升墨滴微距弹射的慢镜头' },
  { id: 'D3', project: 'digital',      zh: '汉字的绊脚石',   en: 'The Chinese wall',         beat: '镜头从一座铅字架拉远成字模之海' },
  { id: 'D4', project: 'digital',      zh: '王选的跨越',     en: 'Wang Xuan’s leap',         beat: '轮廓线收拢成一个汉字、铅字架整体退场' },
  // printing-frontier
  { id: 'F1', project: 'frontier',     zh: '把层当活字',     en: 'Layers as type',           beat: '千层薄片逐层生长成花瓶的延时镜头' },
  { id: 'F2', project: 'frontier',     zh: '光刻：终极印刷', en: 'Litho: final printing',    beat: 'EUV 光束穿过掩膜、纳米图案在晶圆显影' },
  { id: 'F3', project: 'frontier',     zh: '从复制到创造',   en: 'Copy → create',            beat: '一页纸→一张图→一个器官的三级跳收束' },
]);

export const SCENE_IDS = SCENES.map((s) => s.id);

/**
 * 已交付项目清单（G21 渐进门禁数据源）：时间轴卡片只给这里的 id 渲染“去看看”链接，
 * 测试断言 DELIVERED ⊆ 磁盘上实际存在的 printing-* 目录。新项目交付时在此追加。
 */
export const DELIVERED = Object.freeze(['hub', 'woodblock', 'movable-type', 'gutenberg', 'press-age', 'offset', 'digital', 'frontier']);
