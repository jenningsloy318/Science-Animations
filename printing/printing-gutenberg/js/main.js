// printing-gutenberg/js/main.js — 单页多 Tab 引导（v2.2：页顶 Tab 切换；?s=ID 直开）
'use strict';

import { bootProject } from '../../../common/js/printing/sceneKit.js';
import { GUTENBERG_I18N } from './dict.js';
import * as G1 from './scenes/g1.js';
import * as G2 from './scenes/g2.js';
import * as G3 from './scenes/g3.js';
import * as G4 from './scenes/g4.js';

bootProject({
  id: 'gutenberg',
  dict: GUTENBERG_I18N,
  scenes: [
  { id: 'G1', create: G1.create },
  { id: 'G2', create: G2.create },
  { id: 'G3', create: G3.create },
  { id: 'G4', create: G4.create },
  ],
});
