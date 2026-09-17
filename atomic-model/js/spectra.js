/**
 * spectra.js — 氢原子光谱真实物理（纯函数，node 可测）
 * 里德伯公式: 1/λ = R_H · Z² · (1/n₁² − 1/n₂²)   (Bohr 1913)
 * 能级:       E_n = −13.5984·Z²/n²  eV (n=1 基态)
 * 来源: Wikipedia "Hydrogen spectral series" / NIST ASD（2026-09-17 在线核实）
 *       R_H = 1.0967758×10⁷ m⁻¹（氢）；氢电离能 13.5984 eV。
 * 注意: 多电子元素(He/O/Si/Fe)的真实谱线不是类氢公式能算的——那些壳层
 *       能级在本应用中一律标注"示意"。
 */

export const R_H = 1.0967758e7;          // m^-1 氢的里德伯常数
export const E_ION_EV = 13.5984;         // 氢基态电离能 eV
export const EV_NM = 1239.841984;        // E(eV)·λ(nm) = 1239.84 (普朗克换算)

/** 类氢离子 n 能级能量 (eV, 负值) */
export function levelEnergyEv(n, Z = 1) {
  return -E_ION_EV * Z * Z / (n * n);
}

/** 跃迁波长 (nm)。n1 < n2, 类氢离子 Z。 */
export function transitionNm(n1, n2, Z = 1) {
  const dInv = 1.0 / (n1 * n1) - 1.0 / (n2 * n2);
  const lamM = 1.0 / (R_H * Z * Z * dInv);
  return lamM * 1e9;
}

/** 光子能量 (eV) 由波长 */
export function nmToEv(nm) { return EV_NM / nm; }

/** 谱线系名称（下能级 n1 决定）*/
export function seriesName(n1) {
  switch (n1) {
    case 1: return { zh: '莱曼系', en: 'Lyman', band: '紫外 UV' };
    case 2: return { zh: '巴耳末系', en: 'Balmer', band: '可见 Visible' };
    case 3: return { zh: '帕邢系', en: 'Paschen', band: '红外 IR' };
    case 4: return { zh: '布拉开系', en: 'Brackett', band: '红外 IR' };
    default: return { zh: '普丰德系', en: 'Pfund', band: '红外 IR' };
  }
}

/**
 * 波长 → 近似显示颜色。
 * 可见光 380–750 nm 用标准分段近似；紫外 → 淡紫白；红外 → 暗红。
 */
export function wavelengthColor(nm) {
  if (nm < 380) return { r: 0.62, g: 0.55, b: 1.00, label: '紫外 UV', hex: 0x9e8cff };
  if (nm > 750) return { r: 0.45, g: 0.08, b: 0.08, label: '红外 IR', hex: 0x731414 };
  let r = 0, g = 0, b = 0;
  if (nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
  else { r = 1; }
  // 边缘淡出
  let f = 1;
  if (nm < 420) f = 0.3 + 0.7 * (nm - 380) / 40;
  else if (nm > 700) f = 0.3 + 0.7 * (750 - nm) / 50;
  const to255 = v => Math.round(255 * Math.pow(v * f, 0.8));
  const R = to255(r), G = to255(g), B = to255(b);
  return {
    r: R / 255, g: G / 255, b: B / 255,
    hex: (R << 16) | (G << 8) | B,
    label: nm < 450 ? '紫' : nm < 490 ? '蓝' : nm < 510 ? '青' : nm < 580 ? '绿' : nm < 645 ? '黄橙' : '红'
  };
}

/**
 * 氢跃迁完整信息（UI 用）。shellIndex 从 0 开始 → n = shellIndex+1。
 */
export function hydrogenTransition(fromIdx, toIdx) {
  const n1 = Math.min(fromIdx, toIdx) + 1;
  const n2 = Math.max(fromIdx, toIdx) + 1;
  const nm = transitionNm(n1, n2, 1);
  const ev = nmToEv(nm);
  const col = wavelengthColor(nm);
  const ser = seriesName(n1);
  return {
    nm, ev,
    eVText: ev >= 10 ? ev.toFixed(1) + ' eV' : ev.toFixed(2) + ' eV',
    nmText: nm >= 1000 ? Math.round(nm) + ' nm' : nm.toFixed(1) + ' nm',
    hex: col.hex, cssColor: col.label === '紫外 UV' ? '#9e8cff' : col.label === '红外 IR' ? '#731414' : `rgb(${col.r * 255 | 0},${col.g * 255 | 0},${col.b * 255 | 0})`,
    series: ser,
    bandLabel: ser.band,
    colorName: `${ser.zh} · ${col.label}光`
  };
}
