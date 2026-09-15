# Prototype Report: Prototype Round 1 — Numeric Design-Constant Validation (核裂变 3D, vs real fusion-site inputs)

- **Date**: 2026-08-27
- **Generated**: 2026-08-27T22:06:54.893+08:00
- **Verdict**: pass

---

## Summary

Built a 90-line zero-dependency Node prototype (/tmp/fission-proto.mjs) and ran 20 empirical checks of the spec's numeric constants against REAL inputs in the worktree: the actual nuclear-fusion-3d/css/style.css surfaces (body #04060d, panel rgba(15,23,42,.82), ctrl #1e293b, tool rgba(15,20,32,.72)), fusion js/main.js story machine, and the live root index.html. WCAG 2.1 contrast was computed with the real formula over the real composited surfaces; grid/radius/breakpoint divisibility, mass/charge conservation arithmetic, story-machine mirror shape, and all root-card audit baselines were measured, not assumed. Result 19/20 pass. Single outlier: primaryDark #b45309 measures 2.91–4.03:1 across the four real dark surfaces (below both 4.5 body and the 3.0 large-text floor on #1e293b) — it is the dark-variant token and reads 5.02:1 on white, so the fix is a documented usage restriction (light-surface/non-text only), not a palette redesign. error #dc2626 (3.03) and success #16a34a (4.44, Δ−0.06) are large-text/UI-only on dark surfaces. All S1/S3 quantitative anchors reproduce exactly: rAF(=1, setInterval(=0, setTimeout(=0 in real fusion main.js; PHASES=3 with numeric durations 10/12/14s (36s total) confirming the mirror shape; root index.html measures \.card--\w+::before\{=7, 'Open →'=7, id="link-*"=7, card--fission=0 — the F-D-05 audit constants are real, so S3 will be writable as pinned. One mirror-fidelity trap found: real fusion buttons are 42×42 (.tool-btn) and 38px (#homeBtn), BELOW the spec's ≥44×44 touch-target AC — implementers must not copy fusion dimensions verbatim. No pivot needed.

## Measurements

- contrast primaryMain #f59e0b on 4 real dark surfaces: 6.81–9.43:1 (worst on #1e293b) — clears ≥4.5 body threshold everywhere, PASS
- contrast primaryLight #fbbf24: 8.76–12.13:1 — PASS body
- contrast primaryDark #b45309: 2.91 (ctrl #1e293b) / 3.66–4.03 (other surfaces) — FAILS 4.5 everywhere and 3.0 large-text floor on ctrl (Δ−0.09); reads 5.02:1 on white, i.e. dark-variant token is light-surface-only
- contrast error #dc2626: 3.03–4.19:1 — large-text/UI-only (Δ−1.47 vs 4.5 body)
- contrast warning #d97706: 4.59–6.36:1 — PASS body
- contrast success #16a34a: 4.44–6.14:1 — BORDERLINE (Δ−0.06 vs 4.5; large-text PASS)
- contrast bodyText #e2e8f0: 11.87–16.43:1 — PASS body
- 8px-grid discipline: spacing 0/4/8/16/24/32/48, radii 4/8/12, touch 44 all ≡0 (mod 4) — 8px grid + 4px half-step holds; breakpoints 640/768/1024 ≡0 (mod 8) — PASS
- conservation: 235+1=236; 236=141+92+3; 92=56+36 — all hold, PASS
- story-machine mirror (measured in real fusion main.js): PHASES=3 (atoms:10, plasma:12, fusion:14, total 36s), requestAnimationFrame(=1, setInterval(=0, setTimeout(=0 — matches every S1 quantitative pin, PASS
- root-card audit baseline (real root index.html, spec regex \.card--\w+::before\s*\{): ::before rules=7, 'Open →'=7, id="link-*"=7, card--fission=0 — all F-D-05 pre-change constants reproduce exactly, PASS
- touch-target reality check: real fusion .tool-btn=42×42, #homeBtn=38px — below the spec's ≥44×44 AC, so 'mirror the fusion structure' must exclude dimension copying

## Adjustments

- Do not use primaryDark #b45309 as text on any dark surface (measured 2.91–4.03:1, worst-case below even the 3:1 large-text floor). Restrict it in the spec to light-surface or non-text usage (borders/hover strokes), and reach for primaryMain #f59e0b or warning #d97706 (4.59:1) when amber text is needed on dark — recommend documenting this restriction; NOT silently changing the token value.
- Treat error #dc2626 and success #16a34a as large-text/UI-component-only on dark surfaces (3.03/4.44:1); if body-size status text is ever required, prefer lighter tints (#ef4444 / #22c55e class) which clear 4.5:1. success at 4.44 is within 0.06 of the line — flag as borderline in S1/S4 test expectations.
- Add an explicit spec note that 'mirror fusion structure' covers DOM/ID/method-surface shape only: real fusion controls measure 42×42 and 38px, violating the fission spec's own ≥44×44 touch-target AC; fission buttons must be sized to spec, not copied.
- Keep fission PHASES durations as numeric tokens (fusion reference uses 10/12/14s); durations are not pinned by the modules under test, so nothing to pivot — but preserve the data shape {key, zh, duration} exactly as measured.
- Recommendation: PROCEED to specification writing with the contrast usage-restriction caveat recorded; all quantitative anchors (importmap/three@0.160.0/timer pins, conservation formulas, root-card audit counts) are empirically reproducible against the real tree, so no pivot protocol is required.
