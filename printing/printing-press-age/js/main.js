// printing-press-age/js/main.js — 单页多 Tab 引导（v2.2：页顶 Tab 切换；?s=ID 直开）
'use strict';

import { bootProject } from '../../../common/js/printing/sceneKit.js';
import { PRESSAGE_I18N } from './dict.js';
import * as A1 from './scenes/a1.js';
import * as A2 from './scenes/a2.js';
import * as A3 from './scenes/a3.js';

bootProject({
  id: 'press-age',
  dict: PRESSAGE_I18N,
  scenes: [
  { id: 'A1', create: A1.create },
  { id: 'A2', create: A2.create },
  { id: 'A3', create: A3.create },
  ],
});
