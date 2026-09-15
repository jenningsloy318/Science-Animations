// part-inspector-data.js — kid-level bilingual inspector copy for the 21
// closed-set subsystem partIds (SCENARIO-016). Chinese-first explanations with
// English key terms, matched to js/car-subsystems.js userData.partId tags.

export const PART_INFO = {
  // ── 燃油供给 Fuel Delivery ──
  fuelTank: {
    nameZh: '油箱',
    nameEn: 'Fuel Tank',
    kidDesc: '油箱 Fuel Tank 就像汽车的"能量水壶"，安安静静躺在车尾，把汽油安全存起来，等需要时再送出去。',
  },
  fuelPump: {
    nameZh: '电动燃油泵',
    nameEn: 'Electric Fuel Pump',
    kidDesc: '燃油泵 Fuel Pump 像一根会加压的吸管，把汽油从油箱吸出来并加高压，一路送到发动机的喷油嘴。',
  },
  fuelLine: {
    nameZh: '燃油管',
    nameEn: 'Fuel Line',
    kidDesc: '燃油管 Fuel Line 是汽油的"高速公路管道"，把高压汽油从油箱一路护送到每个喷油嘴，一滴也不乱跑。',
  },
  injector1: {
    nameZh: '1号喷油嘴',
    nameEn: 'Fuel Injector 1',
    kidDesc: '喷油嘴 Fuel Injector 像香水喷雾瓶，把汽油变成细细的油雾喷进气缸，和空气混合得越均匀，燃烧就越有力！',
  },
  injector2: {
    nameZh: '2号喷油嘴',
    nameEn: 'Fuel Injector 2',
    kidDesc: '喷油嘴 Fuel Injector 像香水喷雾瓶，把汽油变成细细的油雾喷进气缸，和空气混合得越均匀，燃烧就越有力！',
  },
  injector3: {
    nameZh: '3号喷油嘴',
    nameEn: 'Fuel Injector 3',
    kidDesc: '喷油嘴 Fuel Injector 像香水喷雾瓶，把汽油变成细细的油雾喷进气缸，和空气混合得越均匀，燃烧就越有力！',
  },
  injector4: {
    nameZh: '4号喷油嘴',
    nameEn: 'Fuel Injector 4',
    kidDesc: '喷油嘴 Fuel Injector 像香水喷雾瓶，把汽油变成细细的油雾喷进气缸，和空气混合得越均匀，燃烧就越有力！',
  },

  // ── 进气系统 Air Intake ──
  airFilter: {
    nameZh: '空气滤清器',
    nameEn: 'Air Filter',
    kidDesc: '空气滤清器 Air Filter 像给发动机戴的口罩，挡住灰尘和小虫子，只让干净新鲜的空气进入气缸。',
  },
  throttleBody: {
    nameZh: '节气门',
    nameEn: 'Throttle Body',
    kidDesc: '节气门 Throttle Body 像一个空气水龙头：你踩下油门踏板，它就转开阀门，让更多空气"哗"地冲进发动机！',
  },
  intakeManifold: {
    nameZh: '进气歧管',
    nameEn: 'Intake Manifold',
    kidDesc: '进气歧管 Intake Manifold 像一座分岔滑梯，把干净空气均匀分给 4 个气缸，谁也不多、谁也不少。',
  },

  // ── 冷却系统 Cooling ──
  radiator: {
    nameZh: '散热器',
    nameEn: 'Radiator',
    kidDesc: '散热器 Radiator 像小水箱一样给发动机降温：滚烫的冷却液流过无数细小水管，风扇一吹，热量就散到空气里啦。',
  },
  waterPump: {
    nameZh: '水泵',
    nameEn: 'Water Pump',
    kidDesc: '水泵 Water Pump 像发动机的"心脏"，不停推动冷却液在管路里循环流动，把发动机的热量带去散热器。',
  },
  thermostat: {
    nameZh: '节温器',
    nameEn: 'Thermostat',
    kidDesc: '节温器 Thermostat 是一个温度感应小阀门：发动机还冷时它关着让机器快点热起来，太热了就打开走大循环散热。',
  },
  coolantHose1: {
    nameZh: '上冷却水管',
    nameEn: 'Coolant Hose 1',
    kidDesc: '冷却水管 Coolant Hose 像汽车的"血管"，这根上水管把滚烫的冷却液从发动机送去散热器 Radiator 降温。',
  },
  coolantHose2: {
    nameZh: '下冷却水管',
    nameEn: 'Coolant Hose 2',
    kidDesc: '冷却水管 Coolant Hose 像汽车的"血管"，这根下水管把降温后的冷却液从散热器接回来，再送去冷却发动机。',
  },

  // ── 润滑系统 Lubrication ──
  oilPan: {
    nameZh: '油底壳',
    nameEn: 'Oil Pan',
    kidDesc: '油底壳 Oil Pan 是发动机底部的"存油盘子"，用过的机油都流回这里休息，等着被再次抽上去润滑。',
  },
  oilPump: {
    nameZh: '机油泵',
    nameEn: 'Oil Pump',
    kidDesc: '机油泵 Oil Pump 把机油加压送到每一个摩擦的零件，就像给机器的关节涂上润滑油，让它们转得又快又顺。',
  },

  // ── 排气系统 Exhaust ──
  exhaustManifold: {
    nameZh: '排气歧管',
    nameEn: 'Exhaust Manifold',
    kidDesc: '排气歧管 Exhaust Manifold 像 4 条汇合的滑梯，把各个气缸烧完的高温废气收集起来，汇成一股送出发动机。',
  },
  catalyticConverter: {
    nameZh: '三元催化器',
    nameEn: 'Catalytic Converter',
    kidDesc: '三元催化器 Catalytic Converter 是尾气"净化魔法师"，把有害气体转换成无害的气体，让排出的尾气干净很多。',
  },
  muffler: {
    nameZh: '消音器',
    nameEn: 'Muffler',
    kidDesc: '消音器 Muffler 像一座隔音迷宫，废气在里面绕来绕去、撞上吸音壁，"砰砰"的爆炸声就变成了轻轻的嘟嘟声。',
  },
  tailpipe: {
    nameZh: '排气管尾管',
    nameEn: 'Tailpipe',
    kidDesc: '尾管 Tailpipe 是废气的"出门通道"，净化并消音后的尾气从这里排出车外，旅程就结束啦。',
  },
};
