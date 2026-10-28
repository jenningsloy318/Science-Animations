// tests/printing.test.mjs — printing 家族门禁（spec 10 §7.1 G20–G24）
// G20 时间轴数据 · G21 渐进双向覆盖 · G22 版性条值域 · G23-①矩阵自洽 · G24 声音纯合成
'use strict';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

import { TIMELINE } from '../printing/js/data/timeline.js';
import { SCENES, SCENE_IDS, DELIVERED } from '../printing/js/data/scenes.js';
import { COVERAGE } from '../printing/js/data/coverage.js';
import { SPEED_ANCHORS, ladderChecks } from '../common/js/printing/speedLadder.js';
import { PROJECT_PLATES, validatePlateBar, INK_VALUES, RECOMBINE_VALUES } from '../common/js/printing/plateBar.js';
import { SOUND_NAMES } from '../common/js/printing/sound.js';
import { WOODBLOCK_I18N } from '../printing/printing-woodblock/js/dict.js';
import { MOVABLE_I18N } from '../printing/printing-movable-type/js/dict.js';
import { GUTENBERG_I18N } from '../printing/printing-gutenberg/js/dict.js';
import { PRESSAGE_I18N } from '../printing/printing-press-age/js/dict.js';
import { OFFSET_I18N } from '../printing/printing-offset/js/dict.js';
import { DIGITAL_I18N } from '../printing/printing-digital/js/dict.js';
import { FRONTIER_I18N } from '../printing/printing-frontier/js/dict.js';

// ── G20 时间轴数据完整性 ────────────────────────────────────────
test('G20: timeline 39 事件（书附录 40 行 − 表头，程序化核对）', () => {
  assert.equal(TIMELINE.length, 39);
});

test('G20: 年份非降序 + 每条含 prov/gen/scene 字段', () => {
  for (let i = 1; i < TIMELINE.length; i++) {
    assert.ok(TIMELINE[i].y >= TIMELINE[i - 1].y, `年份倒退于 #${i}: ${TIMELINE[i].y} < ${TIMELINE[i - 1].y}`);
  }
  for (const e of TIMELINE) {
    assert.ok(typeof e.prov === 'string' && e.prov.length > 0, `缺 prov: ${e.y}`);
    assert.ok(e.g >= 1 && e.g <= 5, `缺 gen: ${e.y}`);
    assert.ok('s' in e, `缺 scene 字段: ${e.y}`);
    assert.ok(e.t && e.t.zh && e.t.en, `缺双语标题: ${e.y}`);
  }
});

// ── G21 渐进双向覆盖 ────────────────────────────────────────
test('G21: DELIVERED ⊆ 磁盘上实际存在的 printing* 目录（渐进门禁数据源防假）', () => {
  for (const id of DELIVERED) {
    const fam = { hub: 'printing' }[id] || `printing/printing-${id}`;
    assert.ok(fs.existsSync(path.join(ROOT, fam)), `DELIVERED 声明的 ${fam}/ 不存在`);
  }
});

test('G21: 门户卡存在（card--printing + href=printing/ + portalDict 两键）', () => {
  const portal = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(portal.includes('class="card card--printing"'), '门户缺 card--printing 卡');
  assert.ok(portal.includes('href="printing/"'), '门户卡 href 错误');
  assert.ok(portal.includes("'card.printing.title'"), '门户缺 card.printing.title 键');
  assert.ok(portal.includes("'card.printing.desc'"), '门户缺 card.printing.desc 键');
});

test('G21: 枢纽 index.html 存在且挂 familyNav + Tab 条 + 场景容器（v2.2 单页多 Tab）', () => {
  const hub = fs.readFileSync(path.join(ROOT, 'printing/index.html'), 'utf8');
  assert.ok(hub.includes('id="familyNav"'), '枢纽缺 familyNav 挂载点');
  assert.ok(hub.includes('id="scenes"'), '枢纽缺 scenes 容器');
  assert.ok(hub.includes('id="tabs"'), '枢纽缺 Tab 条');
  assert.ok(hub.includes('js/main.js'), '枢纽缺入口脚本');
});

test('G21b: 统一单页 25 Tab——main.js 按时间序注册全部正片场景（v2.3 架构门禁）', () => {
  const main = fs.readFileSync(path.join(ROOT, 'printing/js/main.js'), 'utf8');
  const order = ['W1','W2','W3','M1','M2','M3','M4','G1','G2','G3','G4','A1','A2','A3',
                 'O1','O2','O3','O4','D1','D2','D3','D4','F1','F2','F3'];
  let pos = -1;
  for (const sid of order) {
    const at = main.indexOf(`id: '${sid}'`);
    assert.ok(at > pos, `${sid} 缺失或乱序`);
    pos = at;
  }
  assert.equal((main.match(/create:/g) || []).length, 25, 'Tab 数应为 25（附录 H1–H3 已删）');
  for (const hid of ['H1', 'H2', 'H3']) {
    assert.ok(!main.includes(`id: '${hid}'`), `附录 ${hid} 不应再挂载`);
  }
  // 统一页挂 Tab 条 + 版性条；importmap 指向 printing/vendor
  const idxHtml = fs.readFileSync(path.join(ROOT, 'printing/index.html'), 'utf8');
  assert.ok(idxHtml.includes('id="tabs"') && idxHtml.includes('id="plateBar"'));
  assert.ok(fs.existsSync(path.join(ROOT, 'printing/vendor/three.module.js')), '统一页缺 three vendor');
  // 7 个项目 index 深链重定向到统一页对应首幕
  const firstOf = { woodblock: 'W1', 'movable-type': 'M1', gutenberg: 'G1', 'press-age': 'A1',
                    offset: 'O1', digital: 'D1', frontier: 'F1' };
  for (const [proj, sid] of Object.entries(firstOf)) {
    const idx = fs.readFileSync(path.join(ROOT, `printing/printing-${proj}`, 'index.html'), 'utf8');
    assert.ok(idx.includes(`location.replace('../?s=${sid}')`), `printing/printing-${proj}/index 应重定向 ?s=${sid}`);
  }
});

// ── G22 版性条值域 ────────────────────────────────────────
test('G22: 7 个开发项目版性取值全部在 §2.3 值域内', () => {
  const keys = Object.keys(PROJECT_PLATES);
  assert.equal(keys.length, 7);
  for (const [proj, spec] of Object.entries(PROJECT_PLATES)) {
    const v = validatePlateBar(spec);
    assert.ok(v.ok, `${proj} 版性非法: ${v.errors.join('; ')}`);
  }
  // 语义抽查（v1.5 修正后的诚实信号）
  assert.equal(PROJECT_PLATES['gutenberg'].recombine, 'movable');
  assert.equal(PROJECT_PLATES['offset'].recombine, 'fixed');
  assert.equal(PROJECT_PLATES['digital'].recombine, 'perpage');
});

// ── G23-① 矩阵自洽（M0 可查的纯数据级） ─────────────────────
test('G23-①: 覆盖矩阵每行 owner ∈ 28 场景清单，且每场景至少拥有一节', () => {
  assert.equal(SCENE_IDS.length, 28);
  for (const row of COVERAGE) {
    assert.ok(SCENE_IDS.includes(row.owner), `矩阵行 "${row.section}" 的 owner ${row.owner} 不在场景清单`);
  }
  const owners = new Set(COVERAGE.map((r) => r.owner));
  for (const id of SCENE_IDS) {
    assert.ok(owners.has(id), `场景 ${id} 未覆盖书任何一节（盲区）`);
  }
  assert.ok(COVERAGE.length >= 48, `矩阵行数过少: ${COVERAGE.length}`);
});

// ── G24 声音纯合成 ────────────────────────────────────────
test('G24: 8 音色全部程序化合成（仓库无音频文件引用，静音键存在）', () => {
  assert.ok(SOUND_NAMES.length >= 8, `音色不足: ${SOUND_NAMES.join(',')}`);
  const src = fs.readFileSync(path.join(ROOT, 'common/js/printing/sound.js'), 'utf8');
  assert.ok(!/\.mp3|\.wav|\.ogg|new Audio\s*\(/.test(src), 'sound.js 含音频文件引用');
  assert.ok(src.includes('printing_sound'), '静音持久化键缺失');
  // 家族全目录无音频资产
  for (const dir of ['printing', 'common/js/printing']) {
    const p = path.join(ROOT, dir);
    if (fs.existsSync(p)) {
      const files = fs.readdirSync(p, { recursive: true });
      for (const f of files) {
        assert.ok(!/\.(mp3|wav|ogg|m4a)$/i.test(String(f)), `发现音频文件: ${dir}/${f}`);
      }
    }
  }
});


// ── G25 讲解面板门禁（v2.4：每幕必含 场景/流程/原理/复刻 四块，双语） ──
test('G25: 25 幕每幕都有 场景/流程/原理/复刻/步骤轨道/结构 六键齐全(双语)', () => {
  const DICTS = [
    WOODBLOCK_I18N, MOVABLE_I18N, GUTENBERG_I18N,
    PRESSAGE_I18N, OFFSET_I18N, DIGITAL_I18N, FRONTIER_I18N,
  ];
  const merged = Object.assign({}, ...DICTS);
  const order = ['w1','w2','w3','m1','m2','m3','m4','g1','g2','g3','g4','a1','a2','a3',
                 'o1','o2','o3','o4','d1','d2','d3','d4','f1','f2','f3'];
  for (const sid of order) {
    for (const f of ['what', 'steps', 'why', 'diy', 'stepLabels', 'struct']) {
      const e = merged[`scene.${sid}.${f}`];
      assert.ok(e, `缺讲解键 scene.${sid}.${f}`);
      const min = f === 'stepLabels' ? 6 : 20;
      assert.ok(e.zh && e.zh.length >= min, `scene.${sid}.${f}.zh 太短`);
      assert.ok(e.en && e.en.length >= min, `scene.${sid}.${f}.en 太短`);
    }
  }
});

// ── 附带：速度阶梯锚点自检（G10 的数据半边；断言另一半在 press-age 项目测试） ──
test('G10(数据半边): 锚点单调 250<1100<8000<20000<90000 且 1100/250 ≥ 4', () => {
  const c = ladderChecks();
  assert.ok(c.monotonic);
  assert.ok(c.ratio >= 4);
  assert.deepEqual(c.values, [250, 1100, 8000, 20000, 90000]);
});

// ── G26 全量 Three.js 3D 空间机构门禁（spec 10 v3.0） ──
test('G26: 全部 25 幕正片（W1–F3）100% 使用 Three.js (THREE / stage3d) 构建 3D 空间机构', () => {
  const sceneFiles = [
    ['printing-woodblock', ['w1', 'w2', 'w3']],
    ['printing-movable-type', ['m1', 'm2', 'm3', 'm4']],
    ['printing-gutenberg', ['g1', 'g2', 'g3', 'g4']],
    ['printing-press-age', ['a1', 'a2', 'a3']],
    ['printing-offset', ['o1', 'o2', 'o3', 'o4']],
    ['printing-digital', ['d1', 'd2', 'd3', 'd4']],
    ['printing-frontier', ['f1', 'f2', 'f3']],
  ];
  let count = 0;
  for (const [proj, ids] of sceneFiles) {
    for (const id of ids) {
      const p = path.join(ROOT, 'printing', proj, 'js', 'scenes', `${id}.js`);
      const src = fs.readFileSync(p, 'utf8');
      assert.ok(
        src.includes('THREE.') || src.includes('stage3d'),
        `${proj}/js/scenes/${id}.js 未使用 Three.js / stage3d 构建 3D 场景`
      );
      assert.ok(
        /new\s+THREE\.|createReliefPlate3D|createMovableType3D|createDeformablePaper3D|createRoller3D/.test(src),
        `${proj}/js/scenes/${id}.js 缺少真实 3D 几何体或 3D 机构构建`
      );
      assert.ok(
        src.includes('drawMacroInset('),
        `${proj}/js/scenes/${id}.js 缺少右上角微观原理剖面画中画 drawMacroInset`
      );
      count++;
    }
  }
  assert.equal(count, 25);
});

// ── G27 全宽播放器 + 下方双列解说 + 慢速精讲播控台门禁（v3.2） ──
test('G27: sceneKit v3.2 具备全宽 3D 播放器、下方 2 列解说卡片、慢速倍速控制与实时解说栏', () => {
  const kitSrc = fs.readFileSync(path.join(ROOT, 'common/js/printing/sceneKit.js'), 'utf8');
  // 1. 全宽上下布局 + 下方 2 列网格解说
  assert.ok(
    /\.scene-layout\s*\{[^}]*flex-direction:\s*column/.test(kitSrc),
    'scene-layout 应为上下垂直堆叠（播放器全宽在上、解说在下）'
  );
  assert.ok(
    /\.explain-col\s+\.explain\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(kitSrc),
    '下方说明与解说区应为 2 列网格布局'
  );
  // 2. 实时分步解说栏 + 播放控制台（暂停/步进/镜头预设/倍速）
  assert.ok(kitSrc.includes('live-narrator'), '缺少实时同步解说栏 .live-narrator');
  assert.ok(kitSrc.includes('player-toolbar'), '缺少交互式播放控制台 .player-toolbar');
  for (const act of ['toggle-pause', 'prev-step', 'next-step', 'replay', 'toggle-inset', 'toggle-labels']) {
    assert.ok(kitSrc.includes(`data-act="${act}"`), `播控台缺少动作按钮 ${act}`);
  }
  for (const cam of ['overview', 'closeup', 'topdown']) {
    assert.ok(kitSrc.includes(`data-cam="${cam}"`), `播控台缺少视角按钮 ${cam}`);
  }
  for (const spd of ['0.5', '1', '1.6', '2.4']) {
    assert.ok(kitSrc.includes(`data-spd="${spd}"`), `播控台缺少倍速档位 ${spd}`);
  }
  // 3. 横向可分叉东西方并行时间轴（消除 W1/M1/G1 晦涩前缀，改为年代 + 地域 + 分叉支线）
  assert.ok(kitSrc.includes('TIMELINE_TOPOLOGY'), '缺少横向分叉时间轴拓扑定义 TIMELINE_TOPOLOGY');
  assert.ok(kitSrc.includes('SCENE_TIMELINE_META'), '缺少 25 幕历史年代与支线元数据 SCENE_TIMELINE_META');
  assert.ok(kitSrc.includes('tl-bifurcate'), '缺少横向可分叉时间轴容器样式 .tl-bifurcate');
  assert.ok(!kitSrc.includes('`${mods[i].id} ${t(mods[i].titleKey)}`'), '不应再向用户直接展示晦涩的 W1/M1/G1 内部代号前缀');
});


