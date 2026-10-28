// printing-offset/js/main.js — 单页多 Tab 引导（v2.2：页顶 Tab 切换；?s=ID 直开）
'use strict';

import { bootProject } from '../../../common/js/printing/sceneKit.js';
import { OFFSET_I18N } from './dict.js';
import * as O1 from './scenes/o1.js';
import * as O2 from './scenes/o2.js';
import * as O3 from './scenes/o3.js';
import * as O4 from './scenes/o4.js';

bootProject({
  id: 'offset',
  dict: OFFSET_I18N,
  scenes: [
  { id: 'O1', create: O1.create },
  { id: 'O2', create: O2.create },
  { id: 'O3', create: O3.create },
  { id: 'O4', create: O4.create },
  ],
});
