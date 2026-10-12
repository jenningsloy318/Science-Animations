// i18n.js — Bilingual dictionary & translations for how-cars-work
export const CAR_I18N = {
  appTitle: {
    zh: '汽车是怎么跑起来的？(3D 机械透视与四冲程全解)',
    en: 'How Cars Work: 3D Powertrain & 4-Stroke Engine'
  },
  appSub: {
    zh: '致敬 Animagraffs · 交互式 4 冲程发动机、离合器变速箱、差速器转向与纯电动力对比',
    en: 'Inspired by Animagraffs: 4-Stroke Engine, Gearbox, Differential, Steering & EV Powertrain'
  },
  homeTxt: {
    zh: '首页',
    en: 'Home'
  },
  shellBtn: {
    showZh: '🚘 车身外壳: 显示',
    hideZh: '🚘 车身外壳: 隐藏',
    showEn: '🚘 Body Shell: Shown',
    hideEn: '🚘 Body Shell: Hidden'
  },
  soundBtn: {
    onZh: '🔊 引擎声效: 开启',
    muteZh: '🔇 引擎声效: 静音',
    onEn: '🔊 Engine Sound: ON',
    muteEn: '🔇 Engine Sound: Muted'
  },
  btnICE: {
    zh: '🔥 燃油车 (油车)',
    en: '🔥 Gas Car (ICE)'
  },
  btnEV: {
    zh: '⚡ 电动车 (电车)',
    en: '⚡ Electric Car (EV)'
  },
  inspHint: {
    zh: '💡 提示：点击 3D 模型中的任何零件可查看对应原理',
    en: '💡 Tip: Click any 3D part to inspect its operating principle'
  },
  focusTitle: {
    zh: '🔍 视角镜头 Focus:',
    en: '🔍 Camera Focus:'
  },
  focusPresets: {
    overview: { zh: '🌐 全景 Overview', en: '🌐 Overview' },
    engine: { zh: '🔥 4冲程发动机', en: '🔥 4-Stroke Engine' },
    gearbox: { zh: '⚙️ 离合器与变速箱', en: '⚙️ Clutch & Transmission' },
    driveshaft: { zh: '🔗 传动轴万向节', en: '🔗 Driveshaft & U-Joint' },
    differential: { zh: '⚖️ 差速器', en: '⚖️ Differential' },
    steering: { zh: '☸️ 转向与悬挂', en: '☸️ Steering & Suspension' },
    brakes: { zh: '🛑 刹车系统', en: '🛑 Braking System' },
    cooling: { zh: '🔥 冷却/散热 Cooling', en: '🔥 Cooling System' },
    fuel: { zh: '⛽ 燃油与进气 Fuel & Intake', en: '⛽ Fuel & Air Intake' },
    exhaust: { zh: '💨 排气与排放 Exhaust', en: '💨 Exhaust System' },
    evMotor: { zh: '⚡ 电池与电驱动', en: '⚡ Battery & EV Motor' }
  },
  hudTitle: {
    zh: '⚡ 实时机械状态 Telemetry',
    en: '⚡ Live Telemetry'
  },
  hudLblRpm: { zh: '转速 RPM:', en: 'RPM:' },
  hudLblGear: { zh: '挡位 Gear:', en: 'Gear:' },
  hudLblStroke: { zh: '冲程 Phase:', en: 'Stroke Phase:' },
  hudLblDiff: { zh: '差速状态 Diff:', en: 'Differential:' },
  hudLblCoolant: { zh: '冷却液 Coolant:', en: 'Coolant:' },
  hudLblOil: { zh: '机油压力 Oil:', en: 'Oil Pressure:' },
  cockpitTitle: {
    zh: '🔑 驾驶操控 Cockpit Controls',
    en: '🔑 Cockpit Controls'
  },
  startBtnText: {
    idleZh: '一键启动',
    crankZh: '点火中...',
    runZh: '熄火 Stop',
    idleEn: 'START ENGINE',
    crankEn: 'Cranking...',
    runEn: 'STOP ENGINE'
  },
  brakeTxt: { zh: '🛑 踩下刹车', en: '🛑 Press Brake' },
  brakeSub: { zh: '刹车片发热磨擦', en: 'Brake friction heat' },
  replayBtnTxt: { zh: '🔁 重新播放点火', en: '🔁 Replay start' },
  replaySubTxt: { zh: 'Replay start', en: 'Watch ignition again' },
  throttleLbl: { zh: '⛽ 油门/加速 (Throttle / RPM)', en: '⛽ Throttle / RPM' },
  gearTitle: { zh: '⚙️ 变速箱挡位 (Gear Selector)', en: '⚙️ Gear Selector' },
  steerTitle: { zh: '☸️ 方向盘转向 (Steering & Differential)', en: '☸️ Steering & Differential' },
  steerLbl: { zh: '打方向盘 (Turn Angle)', en: 'Steering Turn Angle' },
  strokeTitle: { zh: '🔥 四冲程单步解析 (Stroke Breakdown)', en: '🔥 4-Stroke Engine Breakdown' },
  btnModeAuto: { zh: '▶ 连续运转', en: '▶ Continuous Run' },
  btnModeStep: { zh: '⏸ 单步单冲程', en: '⏸ Step-by-Step' },
  btnNextStroke: { zh: '⏭ 下一冲程 Next Stroke', en: '⏭ Next Stroke' },
  scName1: { zh: '1. 进气 Intake', en: '1. Intake Stroke' },
  scDesc1: { zh: '进气门打开，活塞向下，吸入汽油与空气混合气', en: 'Intake valve opens, piston moves down, drawing air-fuel mixture into cylinder' },
  scName2: { zh: '2. 压缩 Compression', en: '2. Compression Stroke' },
  scDesc2: { zh: '气门全关，活塞向上高压压缩混合气体', en: 'Both valves seal, piston travels up, compressing mixture under high pressure' },
  scName3: { zh: '3. 做功 Power', en: '3. Power Stroke' },
  scDesc3: { zh: '火花塞点火爆炸！高温高压爆发力猛推活塞向下', en: 'Spark plug ignites! Combustion explosion drives piston down with high force' },
  scName4: { zh: '4. 排气 Exhaust', en: '4. Exhaust Stroke' },
  scDesc4: { zh: '排气门打开，活塞向上把废气压出排气管', en: 'Exhaust valve opens, piston moves up, expelling exhaust gases out the tailpipe' },
  cmpTitle: { zh: '📊 油车 vs 电车核心区别', en: '📊 Gas vs. Electric Vehicle Comparison' },
  cmpIceTitle: { zh: '🔥 燃油车 (ICE)', en: '🔥 Gas Car (ICE)' },
  cmpEvTitle: { zh: '⚡ 电动车 (EV)', en: '⚡ Electric Car (EV)' },
  cmpIceList: {
    zh: [
      '4冲程爆炸产生动力',
      '必须有变速箱调节扭矩',
      '机械结构多，有排气噪音'
    ],
    en: [
      '4-stroke combustion creates motive power',
      'Requires multi-speed transmission to match torque',
      'Complex mechanical parts with exhaust emissions and noise'
    ]
  },
  cmpEvList: {
    zh: [
      '电池直流电转三相交流电',
      '电磁旋转磁场瞬间输出最大扭矩',
      '无需复杂变速箱，安静高效'
    ],
    en: [
      'Battery DC converted to 3-phase AC',
      'Rotating electromagnetic field delivers instant peak torque',
      'No complex gearbox needed, whisper-quiet and highly efficient'
    ]
  },
  gearDescMap: {
    '1': {
      zh: '1挡：低速大扭矩，适合起步爬坡。',
      en: 'Gear 1: High torque at low speed, ideal for starting and hill climbs.'
    },
    '2': {
      zh: '2挡：中速过度挡。',
      en: 'Gear 2: Intermediate transition gear.'
    },
    '3': {
      zh: '3挡：齿轮比接近1:1，平稳高效巡航。',
      en: 'Gear 3: Ratio ~1:1, smooth and efficient cruising.'
    },
    '4': {
      zh: '4挡：高速巡航，省油省动力。',
      en: 'Gear 4: Overdrive cruising, fuel efficient.'
    },
    'R': {
      zh: 'R挡：反向旋转，带动车轮向后倒车。',
      en: 'Reverse (R): Reverse rotation drives wheels backward.'
    }
  },
  diffHint: {
    straight: {
      zh: '直行时，左右半轴与车轮转速完全相同。',
      en: 'When driving straight, left and right half-shafts and wheels spin at identical speeds.'
    },
    turn: {
      zh: '转弯时，差速器内部行星齿轮自转，让外侧车轮转得比内侧快！',
      en: 'During turns, differential spider gears rotate so outer wheels turn faster than inner wheels!'
    }
  },
  explainerTitle: {
    ICE: {
      zh: '💡 燃油车动力传输全脉络：',
      en: '💡 Gas Car Powertrain Flow:'
    },
    EV: {
      zh: '💡 电动车动力传输全脉络：',
      en: '💡 Electric Car Powertrain Flow:'
    }
  },
  kidText: {
    ICE: {
      zh: '观察金色能量线条！活塞在发动机里进行“进气-压缩-做功-排气”四冲程循环 ➔ 推动曲轴高速旋转 ➔ 经过离合器与变速箱改变齿轮比 ➔ 通过传动轴与万向节传至车尾 ➔ 差速器分配左右轮转速 ➔ 驱动后轮前进！',
      en: 'Follow the golden energy line! Pistons cycle through Intake-Compression-Power-Exhaust ➔ spin crankshaft at high speed ➔ clutch and transmission adjust gear ratios ➔ driveshaft and universal joints transfer torque to the rear ➔ differential splits wheel speeds ➔ drive rear wheels forward!'
    },
    EV: {
      zh: '观察青色电流！电池包释放高压电 ➔ 逆变器转为三相交流电 ➔ 电机用旋转磁场让转子飞速旋转 ➔ 无需变速箱与活塞，瞬间输出最大扭矩直接带动车轮！',
      en: 'Follow the cyan electric flow! Battery pack releases DC power ➔ inverter converts to 3-phase AC ➔ motor rotating magnetic field spins rotor ➔ maximum torque delivered directly to wheels with no complex transmission!'
    }
  },
  storyCaptionDone: {
    ICE: {
      zh: '🎉 点火完成！发动机怠速运转中 —— 点「重新播放点火」再看一遍。',
      en: '🎉 Engine ignited! Idling smoothly — click "Replay start" to watch again.'
    },
    EV: {
      zh: '🎉 就绪！电机瞬间输出最大扭矩 —— 点「重新播放点火」再看一遍。',
      en: '🎉 EV ready! Motor delivers instant peak torque — click "Replay start" to watch again.'
    }
  },
  storyCaptionsEn: {
    keyPowerOn: 'Key ON! Dashboard warning lamps illuminate and electrical systems wake up.',
    batteryEnergizes: 'Battery delivers high surge current along thick cables toward the Starter.',
    starterSpins: 'Starter motor spins at high speed like a powerful compact electric motor.',
    bendixEngagesFlywheel: 'Solenoid plunger thrusts Bendix pinion gear forward to mesh with the Flywheel ring gear.',
    crankAndPistonsTurn: 'Starter cranks the Crankshaft, driving Pistons up and down inside the cylinders.',
    fuelPumpAndInjectors: 'Fuel Pump pressurizes gasoline to the Injectors, spraying fine fuel mist.',
    sparkPlugFires: 'Spark Plug snaps a brilliant blue ignition spark to ignite the compressed mixture.',
    firstCombustion: 'Boom! Cylinder 1 ignites on the power stroke, driving the engine on its own momentum.',
    catchesAndIdles: 'Engine catches and idles smoothly! Starter Bendix disengages automatically.',
    powerOn: 'Press Start! High-voltage contactors close with an audible clunk.',
    battery: 'Battery pack feeds hundreds of volts DC to the power inverter.',
    inverterDCtoAC: 'Inverter modulates DC into 3-phase AC frequency for the stator windings.',
    rotatingFieldSpinsRotor: 'Stator magnetic field rotates smoothly, dragging the permanent magnet rotor with it.',
    instantTorqueToWheels: 'Single-speed reduction gear delivers 100% maximum torque directly to drive axles!'
  }
};
