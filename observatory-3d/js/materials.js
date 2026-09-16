// materials.js — 共享材质：金属 PBR / 发光光路 / 半透明 / 程序化 PMREM
'use strict';

const PALETTE = {
  bg: 0x05070a, fog: 0x05070a,
  gold: 0xd8b25c, steel: 0x8a93a0, dark: 0x14181f,
  glass: 0x9fd8ff, hot: 0xff7a3d, cool: 0x4cc9f0,
  violet: 0xa78bfa, cyan: 0x22d3ee, amber: 0xf59e0b, teal: 0x2dd4bf,
  red: 0xff5e5e, green: 0x7ee787
};

function buildPMREM(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101620);
  // 三条程序化光带：主光、冷光、金边
  const mk = (color, y, z, intensity) => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 64);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, color);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(30, 30),
      new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: intensity,
        blending: THREE.AdditiveBlending, depthWrite: false }));
    s.position.set(0, y, z); s.lookAt(0, 0, 0);
    scene.add(s);
  };
  mk('#fff2d8', 8, -12, 0.9);
  mk('#5fa8ff', -6, -10, 0.6);
  mk('#d8b25c', 0, 14, 0.55);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(18, 48),
    new THREE.MeshBasicMaterial({ color: 0x0b1018 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -9;
  scene.add(floor);
  const env = pmrem.fromScene(scene, 0.08);
  return env ? env.texture : null;
}

function build(renderer) {
  const env = buildPMREM(renderer);

  const m = (o) => {
    const mat = new THREE.MeshStandardMaterial(o);
    if (env) { mat.envMap = env; mat.envMapIntensity = 1.15; }
    return mat;
  };

  const MATS = {
    gold:    m({ color: PALETTE.gold, metalness: 0.95, roughness: 0.22 }),
    mirror:  m({ color: 0xcfd8e3, metalness: 1.0, roughness: 0.05 }),
    steel:   m({ color: PALETTE.steel, metalness: 0.9, roughness: 0.35 }),
    dark:    m({ color: PALETTE.dark, metalness: 0.6, roughness: 0.6 }),
    copper:  m({ color: 0xc8753c, metalness: 0.9, roughness: 0.3 }),
    glass:   m({ color: PALETTE.glass, metalness: 0.1, roughness: 0.1,
                transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }),
    shell:   m({ color: 0x2a3340, metalness: 0.5, roughness: 0.5,
                transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }),
    beam:    new THREE.LineBasicMaterial({ color: PALETTE.gold, transparent: true,
                opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }),
    glow:    new THREE.SpriteMaterial({ color: PALETTE.gold, transparent: true,
                opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }),
    ring:    new THREE.LineBasicMaterial({ color: PALETTE.cyan, transparent: true, opacity: 0.8 }),
    // 组色（页签面板描边与高亮用）
    group: {
      gaze: PALETTE.gold, read: PALETTE.violet, sharp: PALETTE.cyan,
      rec: PALETTE.amber, other: PALETTE.teal
    }
  };

  // 发光纹理（光子、耀斑）
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.3, 'rgba(255,240,200,0.8)');
  gr.addColorStop(1, 'rgba(255,240,200,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const glowTex = new THREE.CanvasTexture(c);
  MATS.glowTex = glowTex;
  MATS.glow = new THREE.SpriteMaterial({ map: glowTex, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false });

  MATS.dispose = () => { glowTex.dispose(); };
  return MATS;
}

window.APP = window.APP || {};
APP.MATS = { build, PALETTE };
APP.PALETTE = PALETTE;
