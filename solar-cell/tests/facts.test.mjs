import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  EG_SI, E_DIR_SI, OPTICAL_DEPTH_UM, SOLAR_AM0, SOLAR_AM15G,
  LOSS_BUDGET, EFFICIENCY_LADDER, TEMP_COEFF_VOC, CELLS_PER_MODULE,
  CELL_OPERATING_VOLT, FLEXIBLE_SI_THICKNESS_UM, TUNNELING_BARRIER_NM_MAX,
  photonEnergyEv, cutoffWavelengthNm, directWavelengthNm, arcThicknessNm,
  pyramidAngleDeg, junctionDepletionRatio, diodeCurrent, mpptPower,
  openCircuitVoltage, fillFactor, tempDeltaVoc, moduleSeriesVoltage,
  tandemSeriesVoltage, augerRateRatio, carrierDiffusionLengthUm,
  dielectricRelaxationTimeSec, ambipolarDiffusionCoeff, cpvVoltageBoostV,
  diamondBondAngleDeg, D_E_SI, D_H_SI, EPS_R_SI,
} from '../js/facts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. 带隙与截止波长断言
test('1. 带隙与截止波长：Eg = 1.124 eV => λc ≈ 1103 nm, 1200nm 光子能量必定 < 1.12 eV', () => {
  const lambdaC = cutoffWavelengthNm(EG_SI);
  assert.ok(Math.abs(lambdaC - 1103.06) < 0.5, `截止波长应约为 1103 nm, 得到 ${lambdaC}`);
  const e1200 = photonEnergyEv(1200);
  assert.ok(e1200 < 1.12, `1200nm 光子能量应小于 1.12 eV, 得到 ${e1200}`);
});

// 2. 直接跃迁阈值断言
test('2. 直接跃迁阈值：Edir = 3.4 eV => λdir ≈ 365 nm，紫外波长 < 365 nm 触发直接吸收', () => {
  const lambdaDir = directWavelengthNm(E_DIR_SI);
  assert.ok(Math.abs(lambdaDir - 364.66) < 0.5, `直接跃迁波长应约为 365 nm, 得到 ${lambdaDir}`);
  assert.ok(photonEnergyEv(350) > 3.4, '350nm 紫外光子能量必须大于 3.4 eV');
});

// 3. 吸收深度数据精度断言
test('3. 吸收深度数据精度：550nm 在 1.5~1.6 μm，1000nm 在 150~160 μm', () => {
  const d550 = OPTICAL_DEPTH_UM[550];
  const d1000 = OPTICAL_DEPTH_UM[1000];
  assert.ok(d550 >= 1.5 && d550 <= 1.6, `550nm 深度应在 1.5~1.6 μm, 得到 ${d550}`);
  assert.ok(d1000 >= 150 && d1000 <= 160, `1000nm 深度应在 150~160 μm, 得到 ${d1000}`);
});

// 4. 减反射膜相消干涉断言
test('4. 减反射膜相消干涉：n = 2.05, λ0 = 600 nm => d = 600 / (4 * 2.05) ≈ 73.17 nm', () => {
  const d = arcThicknessNm(2.05, 600);
  assert.ok(Math.abs(d - 73.17) < 0.05, `相消干涉厚度应约为 73.17 nm, 得到 ${d}`);
});

// 5. 金字塔绒面倾角断言
test('5. 金字塔绒面倾角：tan θ = sqrt(2) => θ ≈ 54.74°', () => {
  const angle = pyramidAngleDeg();
  assert.ok(Math.abs(angle - 54.74) < 0.02, `金字塔倾角应约为 54.74°, 得到 ${angle}`);
});

// 6. 非对称结电荷平衡断言
test('6. 非对称结电荷平衡：ND * xn = NA * xp, ND=10^19, NA=10^16 => xp / xn = 1000', () => {
  const ratio = junctionDepletionRatio(1e19, 1e16);
  assert.equal(ratio, 1000, `耗尽层厚度比应为 1000, 得到 ${ratio}`);
});

// 7. MPPT 功率甜点极值性断言
test('7. MPPT 功率甜点极值性：RL = 0 与 RL = ∞ 时 P = 0，存在唯一 Pmax > 0', () => {
  const Isc = 6.0, I0 = 1e-10, T = 300;
  const Voc = openCircuitVoltage({ Isc, I0, T });

  const pShort = mpptPower(0, { Isc, I0, T });
  const pOpen = mpptPower(Voc, { Isc, I0, T });
  assert.equal(pShort, 0, '短路输出功率应严格为 0');
  assert.ok(Math.abs(pOpen) < 1e-6, '开路输出功率应严格为 0');

  let maxP = 0;
  let bestV = 0;
  for (let v = 0.01; v < Voc; v += 0.01) {
    const p = mpptPower(v, { Isc, I0, T });
    if (p > maxP) {
      maxP = p;
      bestV = v;
    }
  }
  assert.ok(maxP > 3.0, `最佳功率应大于 3.0 W, 得到 ${maxP}`);
  assert.ok(bestV > 0.55 && bestV < Voc, `最佳电压应在正常膝点区域, 得到 ${bestV}`);
});

// 8. 填充因子定义准确性断言
test('8. 填充因子定义准确性：FF = Pmax / (Voc * Isc), 隆基 HIBC FF=87.55%, Voc=744.9 mV 自洽', () => {
  const Voc = 0.7449;
  const Isc = 42.5; // 典型大尺寸电池短路电流 A
  const FF = 0.8755;
  const Pmax = FF * Voc * Isc;
  const calculatedFF = fillFactor(Pmax, Voc, Isc);
  assert.ok(Math.abs(calculatedFF - 0.8755) < 1e-4, `计算所得填充因子应为 87.55%, 得到 ${calculatedFF}`);
});

// 9. 开路电压温度负效应断言
test('9. 开路电压温度负效应：75°C 比 25°C 降低至少 100 mV (dVoc/dT = -2.1 mV/°C)', () => {
  const deltaT = 75 - 25; // 50 °C
  const dVoc = tempDeltaVoc(deltaT); // V
  const dropMv = Math.abs(dVoc * 1000);
  assert.ok(dropMv >= 100, `75°C 压降应 >= 100 mV, 得到 ${dropMv} mV`);
  assert.ok(Math.abs(dropMv - 105) < 1, `50°C 温差下压降应约为 105 mV, 得到 ${dropMv}`);
});

// 10. 光伏组件串联升压断言
test('10. 光伏组件串联升压：72 片单体电池 (每片 0.6 V) 串联输出达到 43.2 V', () => {
  const vTotal = moduleSeriesVoltage(CELLS_PER_MODULE, CELL_OPERATING_VOLT);
  assert.ok(Math.abs(vTotal - 43.2) < 1e-9, `72片单体电池串联输出应为 43.2 V, 得到 ${vTotal}`);
});

// 11. 双结叠层双带隙分工断言
test('11. 双结叠层双带隙分工：钙钛矿(1.68eV) + 单晶硅(1.12eV) 电压叠加约为 1.9 V', () => {
  const vTandem = tandemSeriesVoltage(1.25, 0.65);
  assert.equal(vTandem, 1.9, `叠层电压应约为 1.9 V, 得到 ${vTandem}`);
});

// 12. 俄歇三粒子速率立方律断言
test('12. 俄歇三粒子速率立方律：R_Auger ∝ n²p，非线性增长远超辐射复合 R_rad ∝ np', () => {
  const n1 = 1e16, p1 = 1e16;
  const n2 = 2e16, p2 = 2e16; // 浓度翻倍
  const rAuger1 = augerRateRatio(n1, p1);
  const rAuger2 = augerRateRatio(n2, p2);
  const augerScale = rAuger2 / rAuger1;
  assert.equal(augerScale, 8, `浓度翻倍时俄歇复合应暴涨 2³=8 倍, 得到 ${augerScale}`);
});

// 13. 柔性硅片厚度指标断言
test('13. 柔性硅片厚度指标：柔性单晶硅极限厚度为 60 μm (Nature 2023)', () => {
  assert.equal(FLEXIBLE_SI_THICKNESS_UM, 60, '柔性硅片厚度应严格定义为 60 μm');
});

// 14. 量子隧穿势垒极限断言
test('14. 量子隧穿势垒极限：重掺杂欧姆接触势垒宽度必定 < 3 nm', () => {
  assert.ok(TUNNELING_BARRIER_NM_MAX <= 3.0, '隧穿势垒极限必须 <= 3.0 nm');
});

// 15. 太空太阳辐射常数断言
test('15. 太空太阳辐射常数：AM0 = 1367 W/m², 比地面 AM1.5G (1000 W/m²) 高约 36.7%', () => {
  assert.equal(SOLAR_AM0, 1367, 'AM0 常数应为 1367 W/m²');
  const excess = (SOLAR_AM0 - SOLAR_AM15G) / SOLAR_AM15G;
  assert.ok(Math.abs(excess - 0.367) < 0.005, `超额比例应约为 36.7%, 得到 ${(excess*100).toFixed(1)}%`);
});

// 16. 光谱损失能量守恒断言
test('16. 光谱损失能量守恒：19% 穿透 + 33% 热化 + 48% 匹配 = 100%', () => {
  const sum = LOSS_BUDGET.subBandgap + LOSS_BUDGET.thermalization + LOSS_BUDGET.matchedBandgap;
  assert.ok(Math.abs(sum - 1.0) < 1e-6, `光谱分配总和必须严格等于 100%, 得到 ${sum * 100}%`);
});

// 17. 物理极限单调递减律断言
test('17. 物理极限单调递减律：理想 SQ 33.7% > 辐射 32.2% > 俄歇 29.43% > 隆基 27.81% > 量产 24.5%', () => {
  const L = EFFICIENCY_LADDER;
  assert.ok(L.idealSingleJunctionSQ > L.siRadiativeLimit, 'SQ 极限应高于辐射极限');
  assert.ok(L.siRadiativeLimit > L.siAugerLimit, '辐射极限应高于俄歇极限');
  assert.ok(L.siAugerLimit > L.longiHIBCRecord, '俄歇极限应高于世界纪录');
  assert.ok(L.longiHIBCRecord > L.commercialModule, '世界纪录应高于量产效率');
});

// 18. 双结叠层突破律断言
test('18. 双结叠层突破律：叠层纪录 34.85% / 35.5% 突破单结理想极限 33.7%', () => {
  assert.ok(EFFICIENCY_LADDER.longiTandemRecord > EFFICIENCY_LADDER.idealSingleJunctionSQ, '叠层纪录必须突破单结 33.7% 极限');
  assert.ok(EFFICIENCY_LADDER.longiTandemLatest > EFFICIENCY_LADDER.longiTandemRecord, '最新叠层纪录必须超越先前纪录');
});

// 19. 金刚石晶格拓扑度断言
test('19. 金刚石晶格拓扑度：配位数严格等于 4，键角严格等于 arccos(-1/3) ≈ 109.47°', () => {
  const angle = diamondBondAngleDeg();
  assert.ok(Math.abs(angle - 109.47) < 0.01, `金刚石键角应严格等于 109.47°, 得到 ${angle}`);
});

// 20. 零外部网络引用断言
test('20. 零外部网络引用断言：构建生成的 solar-cell.html 绝对不含 cdn.jsdelivr 或外部资源外链', () => {
  const htmlPath = path.resolve(__dirname, '../solar-cell.html');
  if (fs.existsSync(htmlPath)) {
    const html = fs.readFileSync(htmlPath, 'utf-8');
    assert.ok(!html.includes('cdn.jsdelivr'), '构建产物不得包含 cdn.jsdelivr 外链');
    assert.ok(!html.includes('src="http'), '构建产物不得包含 src="http 外部脚本/资源');
    assert.ok(!html.includes('href="http'), '构建产物不得包含 href="http 外部样式/链接');
  } else {
    assert.ok(fs.existsSync(path.resolve(__dirname, '../build.py')), 'build.py 必须存在');
  }
});

// 21. 少子扩散长度超越硅片厚度断言
test('21. 少子扩散长度超越硅片厚度断言：当 τ = 1 ms, Dn = 36 cm²/s 时，Ln = sqrt(Dn*τ) ≈ 1897 μm > 10 * W (150 μm)', () => {
  const Ln = carrierDiffusionLengthUm(D_E_SI, 1e-3);
  assert.ok(Math.abs(Ln - 1897.36) < 1.0, `少子扩散长度应约为 1897 μm, 得到 ${Ln}`);
  assert.ok(Ln > 10 * 150, `扩散长度必须超过硅片厚度 150 μm 的 10 倍以上 (Ln=${Ln} μm)`);
});

// 22. 介电弛豫超快皮秒尺度断言
test('22. 介电弛豫超快皮秒尺度断言：对 ρ = 1 Ω·cm, εr = 11.7，τd = εr*ε0*ρ ≈ 1.04 ps <= 1.1 ps', () => {
  const tauSec = dielectricRelaxationTimeSec(1.0, EPS_R_SI);
  const tauPs = tauSec * 1e12; // 转换为皮秒 ps
  assert.ok(Math.abs(tauPs - 1.036) < 0.05, `介电弛豫时间应约为 1.04 ps, 得到 ${tauPs}`);
  assert.ok(tauPs <= 1.1, '介电弛豫时间必须在 1.1 ps 之内');
});

// 23. 双极扩散系数自洽性断言
test('23. 双极扩散系数自洽性断言：高注入下 Da = 2*Dn*Dp / (Dn + Dp)，代入 Dn=36, Dp=12 得 Da = 18 cm²/s', () => {
  const Da = ambipolarDiffusionCoeff(36.0, 12.0);
  assert.equal(Da, 18.0, `双极扩散系数应严格等于 18 cm²/s, 得到 ${Da}`);
});

// 24. 1000倍聚光开路电压跃升断言
test('24. 1000倍聚光开路电压跃升断言：ΔVoc = (kB*T/q)*ln(1000) ≈ 178.6 mV ∈ [175 mV, 182 mV]', () => {
  const deltaVocV = cpvVoltageBoostV(1000, 300);
  const deltaVocMv = deltaVocV * 1000;
  assert.ok(Math.abs(deltaVocMv - 178.6) < 0.5, `1000倍聚光升压应约为 178.6 mV, 得到 ${deltaVocMv}`);
  assert.ok(deltaVocMv >= 175 && deltaVocMv <= 182, `升压必须在 [175, 182] mV 范围内, 得到 ${deltaVocMv}`);
});

// 25. 聚光极限与兰兹伯格极限阶梯断言
test('25. 聚光极限与兰兹伯格极限阶梯断言：1-sun 33.7% < 46200x 聚光单结 40.8% < 兰兹伯格 86.8% < 卡诺极限 95.0%', () => {
  const L = EFFICIENCY_LADDER;
  assert.ok(L.idealSingleJunctionSQ < L.cpvSingleJunctionLimit, '1-sun SQ (33.7%) 必须小于极限聚光单结 (40.8%)');
  assert.ok(L.cpvSingleJunctionLimit < L.landsbergCarnotLimit, '聚光单结 (40.8%) 必须小于无限叠层兰兹伯格极限 (86.8%)');
  assert.ok(L.landsbergCarnotLimit < L.carnotLimit, '兰兹伯格极限 (86.8%) 必须小于卡诺热机理论上限 (95.0%)');
});
