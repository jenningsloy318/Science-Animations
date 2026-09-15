# Code Assessment: Codebase Assessment: Static multi-page science-animation site — conventions for the 核聚变 3D animation (nuclear-fusion-3d/)

- **Date**: 2026-08-27
- **Generated**: 2026-08-27T13:54:51.488+08:00
- **Author**: super-dev:code-assessor

---

## Executive Summary

This repo is a static, zero-build "science animations for kids" site: no package.json, no bundler, no tests. Each topic is a self-contained folder (index.html + css/style.css + js/main.js) linked from a root card-grid index.html, served by Caddy on :8321 via `make dev`/`make start` (Caddyfile, file_server browse, no-cache headers). The canonical 3D reference is ion-thruster-3d/: zh-CN page with a fixed #stage canvas div, #homeBtn back link, emoji tool-btn nav (#tools) with title tooltips, #bottomBar ctrl-btn controls (⏸ 暂停 / 🔄 重置 / 🎥 重置视角) plus range sliders; three.js r0.160.0 loaded ESM-only via a jsdelivr import map (with es-module-shims and a window.__errs error trap). js/main.js is a single ~1350-line ES module: module-scope renderer/CSS2DRenderer/scene/camera/OrbitControls/EffectComposer(UnrealBloom) init, one animate() rAF loop (controls.update → composer.render → labelRenderer.render), resize listener, first-frame loading fade, and window.__ready = true at the end. CSS is one dark-space-theme file (#04060d bg, Outfit + PingFang SC, gradient h1, fixed overlay UI, box-sizing reset). The spec (01-requirements.md + 05-research-report.md) mandates a new nuclear-fusion-3d/ folder following exactly this layout, a phase state machine (原子结构 → 等离子体 → 聚变反应), ≥5-step guided tour with tourPrev/tourNext/tourExit ids, a simTime-accumulator pause pattern (never toggle THREE.Clock.running), ≤2000-particle THREE.Points plasma, dispose() on phase rebuild, zero-console-warnings r160 rules (no useLegacyLights/outputEncoding writes, SRGBColorSpace for color textures), WebGL2 detection via three/addons/capabilities/WebGL.js with a custom Chinese fallback message, and physically consistent D–T numbers (17.6 MeV, 0.0189 u, 2.82e-12 J; literals 0.0256 / 3.2e-11 forbidden). Only files to touch: new nuclear-fusion-3d/ folder + one new card + one .card--fusion accent rule in root index.html.

## Patterns

### Self-contained topic folder per animation

- **Example**: ion-thruster-3d/ (index.html + css/style.css + js/main.js)
- **Consistency**: Every topic folder (atomic-model, gravity-slingshot, how-cars-work, ion-thruster, ion-thruster-3d, solar-cell) follows it exactly; requirements AC-01 mandates the same for nuclear-fusion-3d/.
### three.js loaded via pinned import map + es-module-shims (no bundler)

- **Example**: ion-thruster-3d/index.html:96-110
- **Consistency**: 100% across 3D pages; AC-03 pins the identical import map for the fusion page.
### Module-scope single-file main.js with imperative init chain

- **Example**: ion-thruster-3d/js/main.js:10-48 (renderer→labelRenderer→scene→camera→OrbitControls→composer/bloom)
- **Consistency**: Same recipe in every 3D main.js; end with `window.__ready = true;` as readiness marker.
### Fixed-overlay Chinese UI: #homeBtn, #stage, emoji tool-btn nav, #bottomBar ctrl-btns

- **Example**: ion-thruster-3d/index.html:12-50
- **Consistency**: Uniform across pages; fusion page must mirror ids (btnTour/tourPrev/tourNext/tourExit, toggleBtn, resetBtn, camBtn) per AC-05/AC-07.
### Dark space theme CSS with Outfit font and gradient headings

- **Example**: ion-thruster-3d/css/style.css:1-30
- **Consistency**: Site-wide visual language; Outfit font + PingFang SC fallback, user-select:none, #stage:active grab cursor.
### Root index.html card grid with per-card accent classes

- **Example**: index.html:118-139
- **Consistency**: All six cards follow; new card needs id link-nuclear-fusion-3d (AC-02).
### Frame loop + resize + first-frame loading-fade pattern

- **Example**: ion-thruster-3d/js/main.js (tail): controls.update(); composer.render(); labelRenderer.render(); plus resize listener
- **Consistency**: Use one THREE.Points + BufferGeometry for ≤2000 plasma particles, AdditiveBlending sprite flash, dispose() on phase rebuild; pause via custom simTime accumulator (never toggle Clock.running) per research report.
### Bilingual titles, cited-real-data stats bar

- **Example**: ion-thruster-3d/index.html:9 ('🚀 离子推进器 · 3D 交互式工作原理', subtitle cites NASA NSTAR/NEXT)
- **Consistency**: Site language is Chinese for pages, English on the landing card grid; physics numbers must match the verified chain 0.018884 u × 931.494 ≈ 17.6 MeV ≈ 2.82e-12 J (AC-06; forbidden literals 0.0256 / 3.2e-11).

## Files Assessed

- index.html
- Caddyfile
- Makefile
- ion-thruster-3d/index.html
- ion-thruster-3d/js/main.js
- ion-thruster-3d/css/style.css
- atomic-model/ (layout only)
- docs/specifications/01-nuclear-fusion-3d-animation/01-requirements.md
- docs/specifications/01-nuclear-fusion-3d-animation/05-research-report.md

## Recommendations

- Mirror ion-thruster-3d/ as the canonical template: create nuclear-fusion-3d/index.html (lang=zh-CN, #homeBtn back link, #stage, import map pinned to three@0.160.0 + es-module-shims), css/style.css, and one js/main.js module — no build step, no package.json, no other three.js version.
- Implement pause/reset with a custom simTime accumulator gated by a paused flag (keep calling clock.getDelta() every frame; never toggle Clock.running), so ⏸ freezes particles + phase clock together and 🔄 重置 rewinds to the 等离子体 phase without touching tour state (AC-07/AC-08).
- Physics display must use the exact verified chain: 2.014102 + 3.016049 − 4.002602 − 1.008665 = 0.018884 u ≈ 0.0189 u; ×931.494 MeV/u ≈ 17.6 MeV (中子 14.1 / α 3.5); ≈ 2.82e-12 J — the literals '0.0256' and '3.2e-11' are forbidden by deterministic check.
- Follow r160 clean-console rules (research report): do not set useLegacyLights/outputEncoding/texture.encoding; set texture.colorSpace=SRGBColorSpace only for color textures; use three/addons/capabilities/WebGL.js isWebGL2Available() but render a custom Chinese fallback message; dispose geometries/materials on phase rebuild for the infinite auto-repeat loop.
- Add the root index.html card (a.card.card--fusion#link-nuclear-fusion-3d, bilingual 'Nuclear Fusion 核聚变', emoji, one-line description, 'Open →') plus .card--fusion::before / .card--fusion .card__icon accent rules alongside the existing ones — this is the only edit outside the new folder.
- Verification caveat: the Caddyfile root is pinned to /home/jenningsl/Documents/儿子学习/science (the MAIN checkout), so worktree edits are not visible under `make dev` until merged; for local worktree testing serve the worktree directly, e.g. `caddy file-server --root "$PWD" --listen :8321` then check http://localhost:8321/nuclear-fusion-3d/.
