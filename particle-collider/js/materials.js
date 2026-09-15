/* ============================================================================
 * materials.js — palette, procedural environment map, cinematic materials
 * The "shimmer" adds a GPU-side animated emissive wave per instance, so tens
 * of thousands of parts stay individually alive with zero CPU cost.
 * ==========================================================================*/
(function () {
  const U = APP.U;

  APP.MATS = {
    /* global animated time shared by all shimmer materials */
    uniforms: { uTime: { value: 0 } },

    PALETTE: {
      bg: 0x05070a, fog: 0x05070a,
      gold: 0xd8b25c, goldDeep: 0x8a6f35,
      dark: 0x23272e, dark2: 0x2d323a,
      steel: 0x8b95a2, steelD: 0x4a5560,
      straw: 0xcfd6dd, copper: 0xb0703c,
      cyan: 0x6fd3e8, mint: 0x6fe3c4, amber: 0xe0a84c,
    },

    build(renderer) {
      const P = this.PALETTE;
      this.env = this._makeEnv(renderer);

      const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ envMap: this.env, envMapIntensity: 1.25 }, o));

      /* shimmer(capableMat, accentHex, amp, azimuthFreq) — animated emissive wave */
      const shimmer = (mat, accent, amp, freq) => {
        const instanced = mat.userData.instanced = !!mat.userData.instanced;
        mat.onBeforeCompile = (shader) => {
          shader.uniforms.uTime = this.uniforms.uTime;
          shader.uniforms.uAccent = { value: new THREE.Color(accent) };
          shader.uniforms.uAmp = { value: amp };
          shader.uniforms.uFreq = { value: freq };
          shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vShimmerPos;')
            .replace('#include <project_vertex>',
              '#include <project_vertex>\n' +
              'vShimmerPos = (modelMatrix * ' + (instanced ? 'instanceMatrix * ' : '') + 'vec4(transformed, 1.0)).xyz;');
          shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>',
              '#include <common>\nvarying vec3 vShimmerPos;\nuniform float uTime;\nuniform vec3 uAccent;\nuniform float uAmp;\nuniform float uFreq;')
            .replace('#include <emissivemap_fragment>',
              '#include <emissivemap_fragment>\n' +
              'float shAng = atan(vShimmerPos.z, vShimmerPos.x);\n' +
              'float shWave = 0.5 + 0.5 * sin(shAng * uFreq - uTime * 1.7 + vShimmerPos.y * 0.25 + vShimmerPos.z * 0.12);\n' +
              'totalEmissiveRadiance += uAccent * (shWave * shWave) * uAmp;');
        };
        return mat;
      };

      const inst = () => { const m = std({ color: P.dark }); m.userData.instanced = true; return m; };

      this.m = {
        /* structures */
        structure: std({ color: 0x454e5a, metalness: 0.85, roughness: 0.42 }),
        structureDark: std({ color: 0x2b313a, metalness: 0.8, roughness: 0.55 }),
        gold: std({ color: P.gold, metalness: 1.0, roughness: 0.28, emissive: P.goldDeep, emissiveIntensity: 0.12 }),
        copper: std({ color: P.copper, metalness: 1.0, roughness: 0.35 }),
        steel: std({ color: P.steel, metalness: 0.95, roughness: 0.32 }),
        steelD: std({ color: 0x626d7a, metalness: 0.9, roughness: 0.48 }),

        /* magnets */
        coil: std({ color: 0x39424e, metalness: 0.9, roughness: 0.35, emissive: 0x1a2a3a, emissiveIntensity: 0.35 }),
        solenoidShell: std({ color: 0x39424e, metalness: 0.92, roughness: 0.3, side: THREE.DoubleSide, transparent: true, opacity: 0.45, depthWrite: false }),

        /* calorimeters */
        emLead: shimmer((() => { const m = inst(); m.color = new THREE.Color(0x8f7a45); m.metalness = 0.9; m.roughness = 0.42; return m; })(), 0xe0c07a, 0.10, 6.0),
        emGirder: std({ color: 0x454f5c, metalness: 0.85, roughness: 0.5,
      transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }),
        tile: shimmer((() => { const m = inst(); m.color = new THREE.Color(0x515a66); m.metalness = 0.75; m.roughness = 0.5; return m; })(), 0xe0a84c, 0.07, 5.0),
        tileSteel: std({ color: 0x57626f, metalness: 0.7, roughness: 0.5,
      transparent: true, opacity: 0.34, side: THREE.DoubleSide, depthWrite: false }),

        /* trackers */
        straw: shimmer((() => { const m = inst(); m.color = new THREE.Color(P.straw); m.metalness = 0.35; m.roughness = 0.5; return m; })(), 0x9fd8e8, 0.045, 9.0),
        sctModule: shimmer((() => { const m = inst(); m.color = new THREE.Color(0x2f4a52); m.metalness = 0.7; m.roughness = 0.4; return m; })(), 0x6fd3e8, 0.10, 7.0),
        pixelModule: shimmer((() => { const m = inst(); m.color = new THREE.Color(0x274038); m.metalness = 0.7; m.roughness = 0.4; return m; })(), 0x6fe3c4, 0.14, 8.0),

        /* muon */
        mdtTube: shimmer((() => { const m = inst(); m.color = new THREE.Color(0x6d7a88); m.metalness = 0.7; m.roughness = 0.45; return m; })(), 0xd8b25c, 0.05, 6.0),
        mdtFrame: std({ color: 0x3c4550, metalness: 0.85, roughness: 0.5 }),
        tgc: std({ color: 0x6b5a2e, metalness: 0.9, roughness: 0.4, emissive: 0x3d3208, emissiveIntensity: 0.4 }),

        /* beam pipe */
        pipe: std({ color: 0x88c0d8, metalness: 0.85, roughness: 0.2, transparent: true, opacity: 0.65, depthWrite: false }),
        pipeGlow: new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }),
      };
      return this.m;
    },

    /* small procedural room → PMREM env for metallic reflections */
    _makeEnv(renderer) {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x2a3340);
      const geo = new THREE.SphereGeometry(60, 16, 12);
      const mat = new THREE.MeshBasicMaterial({ color: 0x2a3340, side: THREE.BackSide });
      scene.add(new THREE.Mesh(geo, mat));
      const strip = (w, h, x, y, z, ry, color, i) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
          new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
        m.position.set(x, y, z); m.rotation.y = ry; m.rotation.x = i || 0;
        scene.add(m);
      };
      strip(40, 18, 0, 34, 0, 0, 0xffffff, Math.PI / 2);        // key top light
      strip(26, 10, -34, 8, 0, Math.PI / 2, 0xb8d4ea);          // cool side
      strip(26, 10, 34, 6, 0, -Math.PI / 2, 0xf0d9a0);          // gold side
      strip(50, 8, 0, -18, -30, 0, 0x4a5c6e);                   // floor bounce
      const pmrem = new THREE.PMREMGenerator(renderer);
      const rt = pmrem.fromScene(scene, 0.04);
      pmrem.dispose();
      return rt.texture;
    },
  };
})();
