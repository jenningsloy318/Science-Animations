# Code Assessment: Codebase Assessment — nuclear-fission-3d feature (mirror of nuclear-fusion-3d static site)

- **Date**: 2026-08-27
- **Generated**: 2026-08-27T21:22:37.985+08:00
- **Author**: super-dev:code-assessor

---

## Executive Summary

This repo is a zero-build collection of pure-static 3D educational animation sites: a root index.html hub links one subdirectory per topic (each dir = index.html + css/style.css + js/main.js [+ tests/]). There is no package.json, no npm dependency, and no bundler anywhere — three.js r160 arrives exclusively via a CDN import map + es-module-shims so pages even work over file://. The task ("create 核裂变 animation like 核聚变") maps directly onto requirements already drafted in docs/specifications/02-nuclear-fission-animation/: create nuclear-fission-3d/ as a structural clone of nuclear-fusion-3d/ (the canonical, most complete sibling, 123-line HTML shell / 783-line single-file JS runtime / 220-line dark-space stylesheet / 3 node:test suites) with a fission story: 3 phases atoms→neutron→fission, window.fissionSim API mirroring window.fusionSim's exact method surface (main.js:703-727), 4-step guided tour, verbatim 人教版 physics copy (铀-235→铀-236*→钡-141+氪-92+3个中子, 200 MeV ≈ 3.2e-11 J), plus a pure-append card in the root hub. Strong quantitative invariants dominate: importmap/three@0.160.0/es-module-shims string counts, zero D-T fusion literals in fission files (cross-pollution guard), requestAnimationFrame( exactly once and setInterval(/setTimeout( = 0 in main.js, glob-form node --test gates only, and the root-index /\.card--\w+::before\s*\{/g count frozen at 7. Serving is by Caddy (make dev, port 8321 hardcoded); tests are content-assertion scripts run by Node's built-in runner (Node v24.15.0).

## Patterns

### Per-topic self-contained site directories behind a static hub index.html (no build system, no package.json)

- **Example**: index.html:192-218 (cards per site) alongside sibling dirs solar-cell/, gravity-slingshot/, nuclear-fusion-3d/
- **Consistency**: Very consistent — every existing feature is one folder with index.html + css/ + js/(+ tests/)
### CDN-only ES-module dependency shell: es-module-shims loader + import map pinning three@0.160.0 (build + 'three/addons/' prefix), making file:// opening possible

- **Example**: nuclear-fusion-3d/index.html:104-117 (async es-module-shims@1.10.0 script, then type=importmap with two verbatim jsdelivr URLs)
- **Consistency**: Consistent across 3D siblings; requirement AC-02 pins the same counts (importmap ×1, three@0.160.0 ×2, es-module-shims@1.10.0 ≥1) verbatim into the new fission page
### Inline pre-module error trap + ready flag bootstrap contract

- **Example**: nuclear-fusion-3d/index.html:99-102 registers window.__errs=[] and an error listener BEFORE any module code; nuclear-fusion-3d/js/main.js:782 sets window.__ready = true last
- **Consistency**: Consistent (SCENARIO-001/024 in fusion); AC-10 requires the identical arrangement so degradation works even if module loading fails
### Single-rAF simulation loop with gated getDelta accumulator for pause/resume — never clock.running toggles, never timers

- **Example**: nuclear-fusion-3d/js/main.js:758-772 (requestAnimationFrame(animate) once; const dt = Math.min(clock.getDelta(), 0.05); if (!state.paused) { state.simTime += dt; ... advancePhase(); })
- **Consistency**: Consistent (SCENARIO-022); AC-10 quantifies it: requestAnimationFrame( exactly 1×, setInterval(/setTimeout( exactly 0× in fission main.js
### Plain-data constants drive everything: PHYS physics numbers, PHASES array {key, zh, duration}, TOUR_STEPS narration array with phaseKey mapping

- **Example**: nuclear-fusion-3d/js/main.js:26-43 (PHYS), :47-52 (PHASES atoms/plasma/fusion), :57-67 (TOUR_STEPS)
- **Consistency**: Consistent (SCENARIO-010/011/012); fission must use key sequence atoms→neutron→fission and a 4-step tour mapping ①→atoms ②→neutron ③→fission ④→fission (steps ≠ phases)
### Observable runtime handle on window with a fixed method surface for deterministic testing

- **Example**: nuclear-fusion-3d/js/main.js:700-727 (window.fusionSim = { getPhase, getPhaseTime, getSimTime, isPaused, pause, resume, reset, isTourActive, getTourStep, getMode, setAutoAdvance(on), gotoPhase(key) })
- **Consistency**: Consistent; AC-03 mandates window.fissionSim with EXACTLY these method names (setPhase/toggleAuto forbidden), gotoPhase ignores invalid keys silently, reset() restarts at atoms without touching tour state
### Traceability comments everywhere: // SCENARIO-XXX (AC-YY): precedes every owning code section; HTML elements carry data-phase and ids like #homeBtn/#stage/#tools/#btnTour/#bottomBar/#tourPanel

- **Example**: nuclear-fusion-3d/index.html:29-42 (#tools nav, #tempHud, #bottomBar rows) and nuclear-fusion-3d/js/main.js:5-16 header comment enumerating scenario tags
- **Consistency**: Uniform convention in all fusion files; fission page should reuse the same chrome element IDs since AC-02 requires them verbatim
### Content-assertion test suites via node:test reading production files as strings (fs.readFileSync + regex), including negative 'forbidden literal' sweeps walked over the production tree excluding tests/

- **Example**: nuclear-fusion-3d/tests/phase1-shell.test.mjs:26-49 (mustRead, walkProduction skipping tests/node_modules/dotfiles, MINUS unicode-hyphen helper)
- **Consistency**: Consistent (phase1/2/3 suite trio mirrors requirements); AC-06 demands the same sweep style forbidding fusion literals ('0.018884','17.6 MeV','2.82e-12','氘','氚') in all fission html/css/js
### Dark-space CSS theme: full-viewport #stage canvas, fixed glassmorphism overlay bars (#homeBtn, header gradient title, .ctrl-bar bottom bar, #tourPanel slide-in, focus-visible outlines), Google Fonts Outfit @import

- **Example**: nuclear-fusion-3d/css/style.css:1-40 (#stage vignette ::after, gradient h1 clip, fixed #homeBtn pill)
- **Consistency**: Shared across 3D siblings; new page copies selectors/IDs so shell-mirror tests pass
### Root hub cards follow <a class="card card--<topic>" href="<dir>/" id="link-<dir>"> with card__icon/card__title/card__desc/card__arrow children

- **Example**: index.html:206-211 (card--ion ⚡ Ion Thruster entry)
- **Consistency**: Consistent (7 cards currently); AC-09: append card--fission ☢️ Nuclear Fission 核裂变 AFTER the solar-cell card, id="link-nuclear-fission-3d", href="nuclear-fission-3d/", and add NO new `.card--X::before {` rule (count must stay exactly 7)

## Files Assessed

- index.html
- Makefile
- Caddyfile
- nuclear-fusion-3d/index.html
- nuclear-fusion-3d/js/main.js
- nuclear-fusion-3d/css/style.css
- nuclear-fusion-3d/tests/phase1-shell.test.mjs
- docs/specifications/02-nuclear-fission-animation/01-requirements.md
- docs/specifications/02-nuclear-fission-animation/05-research-report.md

## Recommendations

- Build nuclear-fission-3d/ as a deliberate structural clone of nuclear-fusion-3d/ (same file set incl. ≥3 tests/*.test.mjs): keep the exact HTML chrome (#homeBtn, #stage, #tools/#btnTour, #bottomBar, #tourPanel) and the byte-exact import-map block (importmap ×1, three@0.160.0 exactly 2× jsdelivr URLs, es-module-shims@1.10.0 ≥1), then change ONLY story content: PHASES = [{atoms 原子结构},{neutron 中子俘获·激发复核铀-236*},{fission 裂变反应}] and expose window.fissionSim with the exact 12-method surface copied from nuclear-fusion-3d/js/main.js:703-727.
- Honor both directions of the cross-pollution guards: embed verbatim AC-05 substrings 「铀-235」「钡-141」「氪-92」「3 个中子」「200 MeV」「3.2e-11」(≈3.2e-11 J)「质量数」「电荷数」 plus conservation lines 236 = 141 + 92 + 3 and 92 = 56 + 36, while keeping 0 occurrences of '0.018884'/'0.0189 u'/'17.6 MeV'/'2.82e-12'/'氘'/'氚' anywhere in nuclear-fission-3d/**/*.html/css/js.
- Treat root index.html as append-only: insert the ☢️ card (`<a class="card card--fission" … id="link-nuclear-fission-3d" href="nuclear-fission-3d/">`) immediately after the id="link-solar-cell" card; style its accent WITHOUT introducing a new `.card--X::before {` rule — e.g. `.card--fission .card__icon { background: … }` or a :hover border — because the regex /\.card--\w+::before\s*\{/g must still match exactly 7 times.
- Keep runtime and gate invariants mechanical from the start: exactly ONE requestAnimationFrame( call site in js/main.js driving all three phases, ZERO setInterval(/setTimeout(, clock-driven delta clamped (~Math.min(delta, 0.05)) accumulated only when not paused, window.__errs=[] collector inline BEFORE the module tag and window.__ready=true at the end, WebGL2 fallback message mirroring main.js init(); validate with glob-form commands only — `node --test nuclear-fusion-3d/tests/*.test.mjs` (baseline 33/33, suite stays untouched) and `node --test nuclear-fission-3d/tests/*.test.mjs` — never the directory-argument form, which deterministically fails on Node v24.15.0 (AC-08).
