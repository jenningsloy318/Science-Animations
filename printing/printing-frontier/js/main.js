// printing-frontier/js/main.js — 单页多 Tab 引导（v2.2：页顶 Tab 切换；?s=ID 直开）
'use strict';

import { bootProject } from '../../../common/js/printing/sceneKit.js';
import { FRONTIER_I18N } from './dict.js';
import * as F1 from './scenes/f1.js';
import * as F2 from './scenes/f2.js';
import * as F3 from './scenes/f3.js';

bootProject({
  id: 'frontier',
  dict: FRONTIER_I18N,
  scenes: [
  { id: 'F1', create: F1.create },
  { id: 'F2', create: F2.create },
  { id: 'F3', create: F3.create },
  ],
});
