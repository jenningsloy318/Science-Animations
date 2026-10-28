// printing-woodblock/js/main.js — 单页多 Tab 引导（v2.2：页顶 Tab 切换；?s=ID 直开）
'use strict';

import { bootProject } from '../../../common/js/printing/sceneKit.js';
import { WOODBLOCK_I18N } from './dict.js';
import * as W1 from './scenes/w1.js';
import * as W2 from './scenes/w2.js';
import * as W3 from './scenes/w3.js';

bootProject({
  id: 'woodblock',
  dict: WOODBLOCK_I18N,
  scenes: [
  { id: 'W1', create: W1.create },
  { id: 'W2', create: W2.create },
  { id: 'W3', create: W3.create },
  ],
});
