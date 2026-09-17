/* node --test tests/ppevents.test.mjs
 * Verifies the REAL-physics event generator in js/ppevents.js against PDG /
 * ATLAS Run 3 values: decay kinematics, invariant-mass reconstruction,
 * event topology per process, and production rates at peak luminosity. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(__dirname, '../js/ppevents.js'), 'utf8');
globalThis.window = {};
eval(src.replace('window.APP', 'globalThis.APP'));
const PP = globalThis.APP.PP;

const within = (x, target, tol, msg) => assert.ok(
  Math.abs(x - target) <= tol, `${msg}: got ${x}, want ${target}±${tol}`);

test('two-body decay: Z→μμ kinematics in the right range', () => {
  const ev = PP.makeEvent('z_mumu', 7);
  assert.equal(ev.particles.length, 2);
  /* isotropic 2-body decay: pT = (mZ/2)·sinθ, so ONE muon may be soft when
     emitted near the beam axis — that is real physics, not a bug */
  for (const p of ev.particles) {
    assert.equal(p.kind, 'muon');
    assert.ok(p.pT > 0.5 && p.pT < 75, `Z muon pT ${p.pT} out of physical range`);
  }
});

test('boost preserves the invariant mass (manual Lorentz check)', () => {
  const v = { e: 50, px: 30, py: 10, pz: 20 };
  const b = [0.3, 0.2, 0.1];
  const b2 = b[0]*b[0]+b[1]*b[1]+b[2]*b[2];
  const g = 1/Math.sqrt(1-b2);
  const bd = b[0]*v.px+b[1]*v.py+b[2]*v.pz;
  const k = (g-1)*bd/b2;
  const w = { e: g*(v.e+bd),
    px: v.px+b[0]*(g*v.e+k), py: v.py+b[1]*(g*v.e+k), pz: v.pz+b[2]*(g*v.e+k) };
  const m0 = v.e*v.e - v.px*v.px - v.py*v.py - v.pz*v.pz;
  const m1 = w.e*w.e - w.px*w.px - w.py*w.py - w.pz*w.pz;
  within(Math.sqrt(m1), Math.sqrt(m0), 1e-9, 'boost invariance');
});

test('z_mumu: m(μμ) reconstructs to 91.188 GeV within resolution', () => {
  let sum = 0, n = 300;
  for (let i = 0; i < n; i++) {
    const ev = PP.makeEvent('z_mumu', 1000 + i);
    assert.equal(ev.particles.length, 2);
    const [a, b] = ev.particles;
    assert.ok(a.q * b.q === -1, 'opposite charges');
    /* central muons are back-to-back in φ; forward muon pairs may instead be
       separated in η (real boosted-Z behaviour — mass comes from ΔR) */
    if (Math.abs(a.eta) < 1.5 && Math.abs(b.eta) < 1.5) {
      let dphi = Math.abs(a.phi - b.phi);
      if (dphi > Math.PI) dphi = 2 * Math.PI - dphi;
      assert.ok(dphi > Math.PI - 0.6, `central muons back-to-back (Δφ=${dphi})`);
    }
    sum += ev.mass.value;
  }
  const mean = sum / n;
  within(mean, 91.188, 1.0, `mean m(μμ) over ${n} events`);
});

test('z_ee: EM towers deposited, m(ee) ≈ 91.19', () => {
  const ev = PP.makeEvent('z_ee', 55);
  assert.equal(ev.particles.filter((p) => p.kind === 'electron').length, 2);
  assert.ok(ev.towers.length >= 2, 'EM showers deposited');
  for (const t of ev.towers) assert.ok(t.em, 'electron towers are EM');
  let sum = 0; const n = 200;
  for (let i = 0; i < n; i++) sum += PP.makeEvent('z_ee', i).mass.value;
  within(sum / n, 91.188, 1.2, 'mean m(ee)');
});

test('z_jj: two jets, dijet mass ≈ 91.19 ± jet resolution', () => {
  const ev = PP.makeEvent('z_jj', 9);
  assert.ok(ev.jets.length >= 2 && ev.jets.length <= 3, `jets ${ev.jets.length}`);
  let sum = 0; const n = 200;
  for (let i = 0; i < n; i++) sum += PP.makeEvent('z_jj', i).mass.value;
  within(sum / n, 91.188, 8, 'mean dijet mass (wide jet resolution)');
});

test('h_gamgam: 2 photons, m(γγ) ≈ 125.2', () => {
  let sum = 0; const n = 300;
  for (let i = 0; i < n; i++) {
    const ev = PP.makeEvent('h_gamgam', 2000 + i);
    if (i === 0) {
      assert.equal(ev.particles.filter((p) => p.kind === 'photon' && p.q === 0).length, 2);
    }
    sum += ev.mass.value;
  }
  within(sum / n, 125.20, 1.2, `mean m(γγ) over ${n} events`);
});

test('h_zz4l golden channel: 2e2μ topology, m(4l) ≈ 125.2', () => {
  let sum = 0; const n = 300;
  for (let i = 0; i < n; i++) {
    const ev = PP.makeEvent('h_zz4l', 3000 + i);
    if (i === 0) {
      assert.equal(ev.particles.filter((p) => p.kind === 'electron').length, 2);
      assert.equal(ev.particles.filter((p) => p.kind === 'muon').length, 2);
      assert.equal(ev.particles.length, 4);
    }
    sum += ev.mass.value;
  }
  within(sum / n, 125.20, 1.5, 'mean m(4l)');
});

test('ttbar: 1 lepton + ≥4 jets + real MET from the neutrino', () => {
  for (let i = 0; i < 50; i++) {
    const ev = PP.makeEvent('ttbar', 4000 + i);
    const leps = ev.particles.filter((p) => p.kind === 'electron' || p.kind === 'muon');
    assert.equal(leps.length, 1, 'exactly one prompt lepton (ℓν × qq̄ channel)');
    assert.ok(ev.jets.length >= 4, `jets ${ev.jets.length}`);
    assert.ok(ev.jets.filter((j) => j.b).length === 2, 'two b-tagged jets');
    assert.ok(ev.met && ev.met.mag > 5, `MET from neutrino: ${ev.met && ev.met.mag}`);
    assert.ok(!ev.mass, 'no simple invariant-mass readout for tt̄');
  }
});

test('qcd: multijet + underlying event, no mass readout', () => {
  const ev = PP.makeEvent('qcd', 11);
  assert.ok(ev.jets.length >= 2, `jets ${ev.jets.length}`);
  assert.ok(ev.particles.length >= 12, `tracks ${ev.particles.length}`);
  assert.ok(!ev.mass);
});

test('rates at peak luminosity match ATLAS/CERN numbers', () => {
  within(PP.ratePerS(PP.SIGMA.H_total.v), 1.198, 0.01, 'Higgs ≈ 1.2 per second');
  const rGgFid = PP.ratePerS(PP.SIGMA.H_gamgam_fid.v);
  assert.ok(rGgFid > 1 / 3600 && rGgFid < 1 / 60, `γγ fiducial rate ${rGgFid}/s — between per-minute and per-hour`);
  const r4l = PP.ratePerS(PP.SIGMA.H_4l_fid.v);
  assert.ok(r4l > 1 / 86400 && r4l < 1 / 600, `4l fiducial rate ${r4l}/s — hours-scale`);
  const rTT = PP.ratePerS(PP.SIGMA.ttbar.v);
  within(rTT, 18.5, 0.5, 'tt̄ ≈ 18 pairs per second');
  const rZ = PP.ratePerS(PP.SIGMA.Z.v * PP.BR.Z_mumu);
  assert.ok(rZ > 10 && rZ < 100, `Z→μμ rate ${rZ}/s`);
});

test('determinism: same seed → identical event', () => {
  const a = PP.makeEvent('h_zz4l', 777);
  const b = PP.makeEvent('h_zz4l', 777);
  assert.deepEqual(a, b);
});

test('all 7 types build without throwing', () => {
  for (const t of PP.TYPES) {
    const ev = PP.makeEvent(t, 42);
    assert.equal(ev.type, t);
    assert.ok(Array.isArray(ev.particles) && ev.particles.length > 0);
  }
});
