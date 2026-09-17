/* ============================================================================
 * ppevents.js — REAL Standard Model event kinematics (PDG-verified numbers).
 *
 * What is real here:
 *   • particle masses & widths  (PDG 2024 / ATLAS Run 3 briefing, 2026-09)
 *   • branching ratios          (PDG)
 *   • production cross sections (ATLAS Run 3 measurement/prediction, LHC top WG)
 *   • two-body decay kinematics + transverse boosts (exact relativistic kinematics)
 *   • invariant-mass reconstruction from the visible four-momenta
 * What is still simplified (labelled in the UI):
 *   • shower/hadronization is a coarse cone model, not Pythia
 *   • detector response (resolutions) are Gaussian stand-ins
 *
 * Sources consulted 2026-09:
 *   https://en.wikipedia.org/wiki/W_and_Z_bosons   (PDG 2024: mZ 91.1880±0.0020,
 *        ΓZ 2.4955±0.0023 GeV, BR(Z→μμ) 3.366%, BR(Z→ee) 3.363%)
 *   https://en.wikipedia.org/wiki/Higgs_boson      (BR(H→bb) 57.7%, WW 21.5%,
 *        ττ 6.3%, ZZ 2.6%, γγ ≈0.2%; discovered 4 Jul 2012 in γγ + 4l at 5σ)
 *   https://atlas.cern/Updates/Briefing/Run3-Higgs (13.6 TeV: σ(H)=59.9±2.6 pb
 *        SM prediction; σ(H→γγ)fid 67.6 fb; σ(H→4l)fid 3.67 fb)
 *   tt̄ at 13.6 TeV ≈ 0.9 nb (LHC top WG NLO+NNLL); pp→Z ≈ 60 nb;
 *   peak luminosity Run 3 ≈ 2×10³⁴ cm⁻²s⁻¹ (CERN accelerator report).
 *
 * Pure module — no THREE dependency. Node-testable.
 * ==========================================================================*/
(function () {
  'use strict';
  window.APP = window.APP || {};

  const TAU = Math.PI * 2;

  /* ---- verified constants (GeV, natural units c=1) ----------------------- */
  const M = {
    e: 0.000511, mu: 0.105658,
    gamma: 0,
    b: 4.18,
    W: 80.4,           /* PDG 2024 ≈80.37; display precision 1 dp  */
    Z: 91.1880,
    H: 125.20,         /* PDG-2024-era combined ≈125.2 (ATLAS 125.11, CMS 125.35) */
    t: 172.7,
  };
  const GAMMA_Z = 2.4955;

  const BR = {
    Z_mumu: 0.03366, Z_ee: 0.03363, Z_qq: 0.6911,
    H_gamgam: 0.00227, H_ZZ: 0.0264, H_bb: 0.577, H_WW: 0.215, H_tautau: 0.063,
    W_lnu: 0.1086, W_jj: 0.674,
  };

  /* production cross sections at √s = 13.6 TeV, in pb */
  const SIGMA = {
    inelastic: { v: 80e6,  note: '≈80 mb（非弹性 pp，量级估计）' },
    Z:         { v: 60e3,  note: '≈60 nb（pp→Z，量级估计）' },
    ttbar:     { v: 924,   note: '≈0.9 nb（LHC top WG NLO+NNLL 预测）' },
    H_total:   { v: 59.9,  note: '59.9±2.6 pb（SM 预测，ATLAS Run 3 简报）' },
    H_gamgam_fid: { v: 0.0676, note: '67.6 fb（fiducial 预测，ATLAS Run 3）' },
    H_4l_fid:     { v: 0.00367, note: '3.67 fb（fiducial 预测，ATLAS Run 3）' },
  };
  const PEAK_LUMI = 2e34;   /* cm⁻² s⁻¹, Run 3 peak (≈2.1e34) */

  /* events per second at peak luminosity: L[cm⁻²s⁻¹] × σ[pb]×1e-36 */
  function ratePerS(sigmaPb, lumi) { return (lumi === undefined ? PEAK_LUMI : lumi) * sigmaPb * 1e-36; }

  /* deterministic rng — same mulberry32 family as utils.js, kept standalone */
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(rnd) {  /* Box–Muller */
    const u = Math.max(rnd(), 1e-12), v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
  }
  function expSample(rnd, scale) { return -scale * Math.log(Math.max(rnd(), 1e-12)); }

  /* ---- four-vectors & kinematics -----------------------------------------*/
  /* two-body decay in the parent rest frame → lab via transverse boost */
  function twoBodyDecay(M0, m1, m2, rnd) {
    const E1 = (M0 * M0 + m1 * m1 - m2 * m2) / (2 * M0);
    const p1 = Math.sqrt(Math.max(0, E1 * E1 - m1 * m1));
    const cth = 2 * rnd() - 1, phi = rnd() * TAU, sth = Math.sqrt(1 - cth * cth);
    return [
      { e: E1, px: p1 * sth * Math.cos(phi), py: p1 * sth * Math.sin(phi), pz: p1 * cth },
      { e: Math.sqrt(p1 * p1 + m2 * m2), px: -p1 * sth * Math.cos(phi), py: -p1 * sth * Math.sin(phi), pz: -p1 * cth },
    ];
  }
  function boost(v, bx, by, bz) {  /* full Lorentz boost with β⃗ = (bx,by,bz) */
    const b2 = bx * bx + by * by + bz * bz;
    const g = 1 / Math.sqrt(1 - b2);
    const bd = bx * v.px + by * v.py + bz * v.pz;   /* β⃗·p⃗ */
    const k = (g - 1) * bd / b2;                     /* (γ−1)(β⃗·p⃗)/β² */
    return {
      e: g * (v.e + bd),
      px: v.px + bx * (g * v.e + k),
      py: v.py + by * (g * v.e + k),
      pz: v.pz + bz * (g * v.e + k),
    };
  }
  const pT = (v) => Math.hypot(v.px, v.py);
  function etaOf(v) {
    const p = Math.sqrt(v.px * v.px + v.py * v.py + v.pz * v.pz);
    const cth = p > 0 ? v.pz / p : 0;
    return 0.5 * Math.log((1 + Math.min(cth, 0.999999)) / (1 - Math.max(-0.999999, cth)));
  }
  function phiOf(v) { return Math.atan2(v.py, v.px); }
  function invMass(a, b) {
    const e = a.e + b.e, px = a.px + b.px, py = a.py + b.py, pz = a.pz + b.pz;
    const m2 = e * e - px * px - py * py - pz * pz;
    return m2 > 0 ? Math.sqrt(m2) : 0;
  }

  /* ---- display-ready event spec -------------------------------------------
   * particle: { kind:'muon'|'electron'|'photon'|'hadron', pT [GeV], phi, eta,
   *             q (±1 charged, 0 neutral), group:'early'|'late', stop:layer }
   * tower:    { phi, eta, e [GeV], em:boolean }
   * ------------------------------------------------------------------------ */
  const ETA_MAX = 2.4;   /* tracker acceptance — forward tracks are not drawn */

  function clampEta(eta) { return Math.max(-ETA_MAX, Math.min(ETA_MAX, eta)); }

  /* jet cone: coarse hadronization — n tracks inside ΔR≈0.5, ET-conserving-ish */
  function fillJet(rnd, jetP, out, opts) {
    const jphi = phiOf(jetP), jeta = clampEta(etaOf(jetP));
    const n = opts.nMin + Math.floor(rnd() * (opts.nMax - opts.nMin + 1));
    const frac = [];
    let sum = 0;
    for (let i = 0; i < n; i++) { frac.push(0.05 + rnd() * 0.3); sum += frac[i]; }
    for (let i = 0; i < n; i++) {
      const pTi = pT(jetP) * frac[i] / sum;
      const phi = jphi + (rnd() - 0.5) * 0.5;
      const eta = clampEta(jeta + (rnd() - 0.5) * 0.6);
      const hard = i === 0;
      out.particles.push({
        kind: 'hadron', pT: pTi, phi, eta, q: rnd() > 0.5 ? 1 : -1,
        group: hard ? 'early' : 'late', stop: rnd() > 0.5 ? 'trt' : 'had',
      });
    }
    /* calorimeter towers: ~1/3 of the jet energy EM-shower first */
    out.towers.push({ phi: jphi, eta: jeta, e: jetP.e / 3, em: true });
    out.towers.push({ phi: jphi + 0.04, eta: jeta, e: (jetP.e * 2) / 3, em: false });
    out.jets.push({ phi: jphi, eta: jeta, e: jetP.e, b: !!opts.b });
  }

  function finish(out, type, mass) {
    /* MET = true vector sum of invisible particles (neutrinos) */
    let mx = 0, my = 0;
    for (const inv of out.invisible) { mx += inv.px; my += inv.py; }
    out.met = out.invisible.length ? { phi: Math.atan2(my, mx), mag: Math.hypot(mx, my) } : null;
    delete out.invisible;
    out.type = type;
    if (mass) out.mass = mass;
    return out;
  }

  const builders = {

    /* QCD multijet — the overwhelming background (σ ≈ 80 mb inelastic) */
    qcd(rnd) {
      const out = { particles: [], towers: [], jets: [], invisible: [] };
      const nJets = 2 + Math.floor(rnd() * 3);
      for (let j = 0; j < nJets; j++) {
        /* steep pT spectrum: leading jet well separated */
        const pTj = 30 + 570 * Math.pow(rnd(), 2.6);
        const E = pTj * Math.cosh((rnd() - 0.5) * 2.4);
        const th = 2 * Math.atan(Math.exp(-(rnd() - 0.5) * 2.4)) ;
        const phi = rnd() * TAU;
        fillJet(rnd, { e: E, px: pTj * Math.cos(phi), py: pTj * Math.sin(phi),
                       pz: E * Math.cos(th) }, out, { nMin: 5, nMax: 9 });
      }
      /* underlying event — soft tracks everywhere */
      const nUE = 8 + Math.floor(rnd() * 8);
      for (let k = 0; k < nUE; k++) {
        out.particles.push({ kind: 'hadron', pT: 0.4 + 2.2 * rnd() * rnd(), phi: rnd() * TAU,
          eta: clampEta((rnd() - 0.5) * 3.6), q: rnd() > 0.5 ? 1 : -1,
          group: 'late', stop: rnd() > 0.6 ? 'trt' : 'pixel' });
      }
      out.sigmaPb = SIGMA.inelastic.v;
      return finish(out, 'qcd', null);
    },

    /* Z → μ⁺μ⁻ — BR 3.366%, clean two clean muons, m(μμ) ≈ 91.19 */
    z_mumu(rnd) {
      const zPt = Math.min(25, expSample(rnd, 4)), zPhi = rnd() * TAU;
      const bx = (zPt / M.Z) * Math.cos(zPhi), by = (zPt / M.Z) * Math.sin(zPhi);
      const [m1, m2] = twoBodyDecay(M.Z, M.mu, M.mu, rnd).map((v) => boost(v, bx, by, 0));
      const out = { particles: [], towers: [], jets: [], invisible: [] };
      for (const [v, q] of [[m1, -1], [m2, 1]]) {
        out.particles.push({ kind: 'muon', pT: pT(v), phi: phiOf(v), eta: clampEta(etaOf(v)), q,
          group: 'early', stop: 'muon' });
      }
      const mRec = invMass(m1, m2) + gauss(rnd) * 1.3;  /* detector resolution stand-in */
      out.sigmaPb = SIGMA.Z.v * BR.Z_mumu;
      return finish(out, 'z_mumu', { value: mRec, label: 'm(μμ)', truth: M.Z, truthName: 'Z⁰', res: 1.3 });
    },

    /* Z → e⁺e⁻ — BR 3.363%, two EM showers + two electrons */
    z_ee(rnd) {
      const zPt = Math.min(25, expSample(rnd, 4)), zPhi = rnd() * TAU;
      const bx = (zPt / M.Z) * Math.cos(zPhi), by = (zPt / M.Z) * Math.sin(zPhi);
      const [e1, e2] = twoBodyDecay(M.Z, M.e, M.e, rnd).map((v) => boost(v, bx, by, 0));
      const out = { particles: [], towers: [], jets: [], invisible: [] };
      for (const v of [e1, e2]) {
        out.particles.push({ kind: 'electron', pT: pT(v), phi: phiOf(v), eta: clampEta(etaOf(v)),
          q: v === e1 ? -1 : 1, group: 'early', stop: 'em' });
        out.towers.push({ phi: phiOf(v), eta: clampEta(etaOf(v)), e: v.e, em: true });
      }
      const mRec = invMass(e1, e2) + gauss(rnd) * 1.6;
      out.sigmaPb = SIGMA.Z.v * BR.Z_ee;
      return finish(out, 'z_ee', { value: mRec, label: 'm(ee)', truth: M.Z, truthName: 'Z⁰', res: 1.6 });
    },

    /* Z → qq̄ — BR 69.1%: two back-to-back jets, dijet mass ≈ 91.19 */
    z_jj(rnd) {
      const zPt = Math.min(25, expSample(rnd, 4)), zPhi = rnd() * TAU;
      const bx = (zPt / M.Z) * Math.cos(zPhi), by = (zPt / M.Z) * Math.sin(zPhi);
      const [q1, q2] = twoBodyDecay(M.Z, 0.3, 0.3, rnd).map((v) => boost(v, bx, by, 0));
      const out = { particles: [], towers: [], jets: [], invisible: [] };
      fillJet(rnd, q1, out, { nMin: 5, nMax: 8 });
      fillJet(rnd, q2, out, { nMin: 5, nMax: 8 });
      if (rnd() > 0.7) {  /* initial-state radiation: a third forward jet */
        const pTj = 10 + 25 * rnd(), phi = rnd() * TAU;
        fillJet(rnd, { e: pTj * 2, px: pTj * Math.cos(phi), py: pTj * Math.sin(phi), pz: pTj },
          out, { nMin: 3, nMax: 5 });
      }
      const mRec = invMass(q1, q2) + gauss(rnd) * 9;   /* jet energy resolution */
      out.sigmaPb = SIGMA.Z.v * BR.Z_qq;
      return finish(out, 'z_jj', { value: mRec, label: 'm(jj)', truth: M.Z, truthName: 'Z⁰', res: 9 });
    },

    /* H → γγ — BR 0.227%: the discovery channel. m(γγ) ≈ 125.2 ± ~1.5 GeV */
    h_gamgam(rnd) {
      const hPt = Math.min(60, expSample(rnd, 15)), hPhi = rnd() * TAU;
      const bx = (hPt / M.H) * Math.cos(hPhi), by = (hPt / M.H) * Math.sin(hPhi);
      const [g1, g2] = twoBodyDecay(M.H, 0, 0, rnd).map((v) => boost(v, bx, by, 0));
      const out = { particles: [], towers: [], jets: [], invisible: [] };
      for (const v of [g1, g2]) {
        out.particles.push({ kind: 'photon', pT: pT(v), phi: phiOf(v), eta: clampEta(etaOf(v)),
          q: 0, group: 'early', stop: 'em' });
        out.towers.push({ phi: phiOf(v), eta: clampEta(etaOf(v)), e: v.e, em: true });
      }
      const mRec = invMass(g1, g2) + gauss(rnd) * 1.5;
      out.sigmaPb = SIGMA.H_total.v * BR.H_gamgam;
      return finish(out, 'h_gamgam', { value: mRec, label: 'm(γγ)', truth: M.H, truthName: 'H', res: 1.5 });
    },

    /* H → ZZ* → 2e2μ — the "golden channel" (BR(H→ZZ) 2.64%, 4l ≈ 0.04%):
     * one Z on-shell (BW-smeared), the partner off-shell from phase space. */
    h_zz4l(rnd) {
      const hPt = Math.min(60, expSample(rnd, 15)), hPhi = rnd() * TAU;
      const bx = (hPt / M.H) * Math.cos(hPhi), by = (hPt / M.H) * Math.sin(hPhi);
      /* on-shell Z sampled within ±Γ of its pole (width effect, teaching-grade);
         its off-shell partner then carries mH − mZ1 ≈ 30–40 GeV — as in real 4l events */
      const mZ1 = M.Z + (rnd() * 2 - 1) * GAMMA_Z;
      const mZ2 = M.H - mZ1;                     /* off-shell partner (phase space) */
      const [z1, z2] = twoBodyDecay(M.H, mZ1, mZ2, rnd).map((v) => boost(v, bx, by, 0));
      const [eP, eM] = twoBodyDecay(mZ1, M.e, M.e, rnd).map((v) => boost(v, ...beta3(z1)));
      const [mP, mM] = twoBodyDecay(mZ2, M.mu, M.mu, rnd).map((v) => boost(v, ...beta3(z2)));
      const out = { particles: [], towers: [], jets: [], invisible: [] };
      const put = (v, kind, q) => {
        out.particles.push({ kind, pT: pT(v), phi: phiOf(v), eta: clampEta(etaOf(v)), q,
          group: 'early', stop: kind === 'muon' ? 'muon' : 'em' });
        if (kind === 'electron') out.towers.push({ phi: phiOf(v), eta: clampEta(etaOf(v)), e: v.e, em: true });
      };
      put(eP, 'electron', -1); put(eM, 'electron', 1);
      put(mP, 'muon', -1); put(mM, 'muon', 1);
      const m4 = invMass(invMassV(eP, eM), invMassV(mP, mM));
      out.sigmaPb = SIGMA.H_total.v * BR.H_ZZ * (4 * BR.Z_ee * BR.Z_mumu);
      return finish(out, 'h_zz4l', { value: m4 + gauss(rnd) * 1.7, label: 'm(4l)', truth: M.H, truthName: 'H', res: 1.7 });
    },

    /* tt̄ → ℓν + 4 jets + 2 b — σ ≈ 0.9 nb. Real MET from the neutrino. */
    ttbar(rnd) {
      const tPt = Math.min(150, expSample(rnd, 40)), tPhi = rnd() * TAU;
      const bx = (tPt / (2 * M.t)) * Math.cos(tPhi), by = (tPt / (2 * M.t)) * Math.sin(tPhi);
      const [t1, t2] = twoBodyDecay(2 * M.t, M.t, M.t, rnd).map((v) => boost(v, bx, by, 0));
      /* t → W b  (m_b small vs top — coarse but kinematically sound) */
      const [wP, b1] = twoBodyDecay(M.t, M.W, M.b, rnd).map((v) => boost(v, ...beta3(t1)));
      const [wM, b2] = twoBodyDecay(M.t, M.W, M.b, rnd).map((v) => boost(v, ...beta3(t2)));
      /* W+ → ℓ⁺ν (e or μ), W− → qq̄ */
      const lepton = rnd() > 0.5 ? 'e' : 'mu';
      const mL = lepton === 'e' ? M.e : M.mu;
      const [lep, nu] = twoBodyDecay(M.W, mL, 0, rnd).map((v) => boost(v, ...beta3(wP)));
      const [q1, q2] = twoBodyDecay(M.W, 0.3, 0.3, rnd).map((v) => boost(v, ...beta3(wM)));
      const out = { particles: [], towers: [], jets: [], invisible: [nu] };
      out.particles.push({ kind: lepton === 'e' ? 'electron' : 'muon', pT: pT(lep), phi: phiOf(lep),
        eta: clampEta(etaOf(lep)), q: 1, group: 'early', stop: lepton === 'e' ? 'em' : 'muon' });
      if (lepton === 'e') out.towers.push({ phi: phiOf(lep), eta: clampEta(etaOf(lep)), e: lep.e, em: true });
      for (const [jp, isB] of [[b1, true], [b2, true], [q1, false], [q2, false]]) {
        fillJet(rnd, jp, out, { nMin: isB ? 6 : 4, nMax: isB ? 9 : 7, b: isB });
      }
      out.sigmaPb = SIGMA.ttbar.v;
      return finish(out, 'ttbar', null);
    },
  };

  /* helpers */
  function invMassV(a, b) { /* pair as a four-vector for chaining */
    return { e: a.e + b.e, px: a.px + b.px, py: a.py + b.py, pz: a.pz + b.pz };
  }
  /* boost velocity of a four-vector: β⃗ = p⃗/E (always < 1 for massive parents) */
  function beta3(v) {
    return [v.px / v.e, v.py / v.e, v.pz / v.e];
  }

  const TYPES = ['qcd', 'z_mumu', 'z_ee', 'z_jj', 'h_gamgam', 'h_zz4l', 'ttbar'];

  /* public API */
  APP.PP = {
    M, GAMMA_Z, BR, SIGMA, PEAK_LUMI, TYPES,
    ratePerS,
    makeEvent(type, seed) {
      const r = rng(seed === undefined ? (Date.now() & 0xffff) * 2654435761 + Math.floor(Math.random() * 65536) : seed);
      const b = builders[type] || builders.qcd;
      return b(r);
    },
  };
})();
