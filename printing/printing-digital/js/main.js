// printing-digital/js/main.js — 单页多 Tab 引导（v2.2：页顶 Tab 切换；?s=ID 直开）
'use strict';

import { bootProject } from '../../../common/js/printing/sceneKit.js';
import { DIGITAL_I18N } from './dict.js';
import * as D1 from './scenes/d1.js';
import * as D2 from './scenes/d2.js';
import * as D3 from './scenes/d3.js';
import * as D4 from './scenes/d4.js';

bootProject({
  id: 'digital',
  dict: DIGITAL_I18N,
  scenes: [
  { id: 'D1', create: D1.create },
  { id: 'D2', create: D2.create },
  { id: 'D3', create: D3.create },
  { id: 'D4', create: D4.create },
  ],
});
