// printing/js/main.js — 印刷史 · 单页 28 Tab（v2.3：无层级，一页全部动画，按五代着色）
'use strict';

import { bootProject, sound as _sound } from '../../common/js/printing/sceneKit.js';
import { PROJECT_PLATES } from '../../common/js/printing/plateBar.js';
import { HUB_I18N } from './dict.js';
import { WOODBLOCK_I18N } from '../printing-woodblock/js/dict.js';
import { MOVABLE_I18N } from '../printing-movable-type/js/dict.js';
import { GUTENBERG_I18N } from '../printing-gutenberg/js/dict.js';
import { PRESSAGE_I18N } from '../printing-press-age/js/dict.js';
import { OFFSET_I18N } from '../printing-offset/js/dict.js';
import { DIGITAL_I18N } from '../printing-digital/js/dict.js';
import { FRONTIER_I18N } from '../printing-frontier/js/dict.js';

import * as W1 from '../printing-woodblock/js/scenes/w1.js';
import * as W2 from '../printing-woodblock/js/scenes/w2.js';
import * as W3 from '../printing-woodblock/js/scenes/w3.js';
import * as M1 from '../printing-movable-type/js/scenes/m1.js';
import * as M2 from '../printing-movable-type/js/scenes/m2.js';
import * as M3 from '../printing-movable-type/js/scenes/m3.js';
import * as M4 from '../printing-movable-type/js/scenes/m4.js';
import * as G1 from '../printing-gutenberg/js/scenes/g1.js';
import * as G2 from '../printing-gutenberg/js/scenes/g2.js';
import * as G3 from '../printing-gutenberg/js/scenes/g3.js';
import * as G4 from '../printing-gutenberg/js/scenes/g4.js';
import * as A1 from '../printing-press-age/js/scenes/a1.js';
import * as A2 from '../printing-press-age/js/scenes/a2.js';
import * as A3 from '../printing-press-age/js/scenes/a3.js';
import * as O1 from '../printing-offset/js/scenes/o1.js';
import * as O2 from '../printing-offset/js/scenes/o2.js';
import * as O3 from '../printing-offset/js/scenes/o3.js';
import * as O4 from '../printing-offset/js/scenes/o4.js';
import * as D1 from '../printing-digital/js/scenes/d1.js';
import * as D2 from '../printing-digital/js/scenes/d2.js';
import * as D3 from '../printing-digital/js/scenes/d3.js';
import * as D4 from '../printing-digital/js/scenes/d4.js';
import * as F1 from '../printing-frontier/js/scenes/f1.js';
import * as F2 from '../printing-frontier/js/scenes/f2.js';
import * as F3 from '../printing-frontier/js/scenes/f3.js';

// 合并 8 份字典；app.title 用统一页标题
const DICT = Object.assign({}, HUB_I18N, WOODBLOCK_I18N, MOVABLE_I18N, GUTENBERG_I18N,
  PRESSAGE_I18N, OFFSET_I18N, DIGITAL_I18N, FRONTIER_I18N);
DICT['app.title'] = { zh: '印刷史 · 25 幕动画', en: 'Printing History · 25 Animations' };

const C = { g1: '#8d6e63', g2: '#b5651d', g3: '#4a6274', g4: '#4f46e5', g5: '#059669', hub: '#1a1a1a' }; /* edited placeholder */
const plate = (p) => PROJECT_PLATES[p] || null;

bootProject({
  id: 'hub',
  dict: DICT,
  scenes: [
    // ── 正片：按年代 25 幕 ──
    { id: 'W1', create: W1.create, plate: plate('woodblock'),    color: C.g1 },
    { id: 'W2', create: W2.create, plate: plate('woodblock'),    color: C.g1 },
    { id: 'W3', create: W3.create, plate: plate('woodblock'),    color: C.g1 },
    { id: 'M1', create: M1.create, plate: plate('movable-type'), color: C.g2 },
    { id: 'M2', create: M2.create, plate: plate('movable-type'), color: C.g2 },
    { id: 'M3', create: M3.create, plate: plate('movable-type'), color: C.g2 },
    { id: 'M4', create: M4.create, plate: plate('movable-type'), color: C.g2 },
    { id: 'G1', create: G1.create, plate: plate('gutenberg'),    color: C.g2 },
    { id: 'G2', create: G2.create, plate: plate('gutenberg'),    color: C.g2 },
    { id: 'G3', create: G3.create, plate: plate('gutenberg'),    color: C.g2 },
    { id: 'G4', create: G4.create, plate: plate('gutenberg'),    color: C.g2 },
    { id: 'A1', create: A1.create, plate: plate('press-age'),    color: C.g3 },
    { id: 'A2', create: A2.create, plate: plate('press-age'),    color: C.g3 },
    { id: 'A3', create: A3.create, plate: plate('press-age'),    color: C.g3 },
    { id: 'O1', create: O1.create, plate: plate('offset'),       color: C.g4 },
    { id: 'O2', create: O2.create, plate: plate('offset'),       color: C.g4 },
    { id: 'O3', create: O3.create, plate: plate('offset'),       color: C.g4 },
    { id: 'O4', create: O4.create, plate: plate('offset'),       color: C.g4 },
    { id: 'D1', create: D1.create, plate: plate('digital'),      color: C.g4 },
    { id: 'D2', create: D2.create, plate: plate('digital'),      color: C.g4 },
    { id: 'D3', create: D3.create, plate: plate('digital'),      color: C.g4 },
    { id: 'D4', create: D4.create, plate: plate('digital'),      color: C.g4 },
    { id: 'F1', create: F1.create, plate: plate('frontier'),     color: C.g5 },
    { id: 'F2', create: F2.create, plate: plate('frontier'),     color: C.g5 },
    { id: 'F3', create: F3.create, plate: plate('frontier'),     color: C.g5 },
  ],
});
