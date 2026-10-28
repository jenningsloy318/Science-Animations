// printing-movable-type/js/main.js — 单页多 Tab 引导（v2.2：页顶 Tab 切换；?s=ID 直开）
'use strict';

import { bootProject } from '../../../common/js/printing/sceneKit.js';
import { MOVABLE_I18N } from './dict.js';
import * as M1 from './scenes/m1.js';
import * as M2 from './scenes/m2.js';
import * as M3 from './scenes/m3.js';
import * as M4 from './scenes/m4.js';

bootProject({
  id: 'movable-type',
  dict: MOVABLE_I18N,
  scenes: [
  { id: 'M1', create: M1.create },
  { id: 'M2', create: M2.create },
  { id: 'M3', create: M3.create },
  { id: 'M4', create: M4.create },
  ],
});
