// ignition-story.js — Phase 3 narrated ignition walkthrough timelines for
// how-cars-work. Covers SCENARIO-005 (the 9 ordered narrated ICE stages with
// 中英混排 kid-level captions and 1400–2400 ms stage durations),
// SCENARIO-007 (every stage carries its own cameraFocus preset key so the
// camera pans to the part that is actually working during that stage),
// SCENARIO-008 (the step timeline ships as pure data {caption, cameraFocus,
// duration} in this dedicated module) and SCENARIO-022 (the 5 ordered EV
// stages, 1200–1800 ms, replayed through the same framework by btnEV mode).
// Pure data ES module on the existing importmap — no build step.

// Scenario closure for this module (spec Phase 3 union rule).
export const IGNITION_SCENARIO_TAGS = Object.freeze([
  'SCENARIO-001', 'SCENARIO-005', 'SCENARIO-006', 'SCENARIO-007',
  'SCENARIO-008', 'SCENARIO-009', 'SCENARIO-010', 'SCENARIO-022',
]);

// The ordered 9-stage ICE ignition story: keyPowerOn → catchesAndIdles.
// cameraFocus values are keys into main.js CAMERA_PRESETS; duration is the
// per-stage on-screen time in milliseconds (total ≈ 17 s).
export const ICE_STEPS = [
  {
    id: 'keyPowerOn',
    caption: '转动钥匙 Key ON！仪表盘灯全亮，全车电路通电醒来。',
    cameraFocus: 'steering',
    duration: 1600,
  },
  {
    id: 'batteryEnergizes',
    caption: '蓄电池 Battery 送出大电流，沿电缆涌向起动机 Starter。',
    cameraFocus: 'starter',
    duration: 1500,
  },
  {
    id: 'starterSpins',
    caption: '起动机 Starter 嗡嗡高速旋转，像一台力大无穷的小马达。',
    cameraFocus: 'starter',
    duration: 1800,
  },
  {
    id: 'bendixEngagesFlywheel',
    caption: '电磁吸铁推出 Bendix 小齿轮，咔哒咬住飞轮 Flywheel 外齿圈。',
    cameraFocus: 'engine',
    duration: 2000,
  },
  {
    id: 'crankAndPistonsTurn',
    caption: '起动机拖着曲轴 Crankshaft 转，活塞 Piston 在气缸里上下往复。',
    cameraFocus: 'engine',
    duration: 2200,
  },
  {
    id: 'fuelPumpAndInjectors',
    caption: '燃油泵 Fuel Pump 把汽油压向喷油器 Injector，喷出细细的油雾。',
    cameraFocus: 'fuel',
    duration: 2000,
  },
  {
    id: 'sparkPlugFires',
    caption: '火花塞 Spark Plug 啪地打出蓝色电火花，准备点燃压缩混合气。',
    cameraFocus: 'engine',
    duration: 1800,
  },
  {
    id: 'firstCombustion',
    caption: '第一次爆炸 Combustion！高温高压气体猛推活塞向下做功。',
    cameraFocus: 'engine',
    duration: 2000,
  },
  {
    id: 'catchesAndIdles',
    caption: '发动机着车并怠速 Idle 运转，起动机退回，水箱 Coolant 开始升温。',
    cameraFocus: 'overview',
    duration: 2400,
  },
];

// The ordered 5-stage EV story: powerOn → instantTorqueToWheels (total ≈ 8 s).
export const EV_STEPS = [
  {
    id: 'powerOn',
    caption: '按下启动键 Power ON，高压继电器闭合，电车悄无声息地就绪。',
    cameraFocus: 'overview',
    duration: 1400,
  },
  {
    id: 'battery',
    caption: '电池包 Battery Pack 释放直流电 DC，安静又强劲。',
    cameraFocus: 'evMotor',
    duration: 1400,
  },
  {
    id: 'inverterDCtoAC',
    caption: '逆变器 Inverter 把直流 DC 电变成三相交流 AC 电。',
    cameraFocus: 'evMotor',
    duration: 1600,
  },
  {
    id: 'rotatingFieldSpinsRotor',
    caption: '旋转磁场拖着转子 Rotor 飞速旋转，没有活塞也没有齿轮。',
    cameraFocus: 'evMotor',
    duration: 1600,
  },
  {
    id: 'instantTorqueToWheels',
    caption: '瞬间最大扭矩 Torque 直达车轮 Wheels，起步像箭一样快！',
    cameraFocus: 'differential',
    duration: 1800,
  },
];
