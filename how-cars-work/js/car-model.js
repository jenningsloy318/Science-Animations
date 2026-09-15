// car-model.js — rebuilt from real automotive anatomy (research-verified):
// longitudinal inline-4 with flat-plane crank, DOHC 8V crossflow head, timing
// belt drive at 2:1, cutaway block/head/oil-pan stack, intake plenum with
// curved runners, 4-into-1 exhaust, flywheel-clutch-gearbox-driveshaft-
// differential chain, and a 3-box sedan shell with wheel arches.
//
// Real-shape anchors (SCENARIO-011/012/024/025):
//   • crankshaft = 5 main journals + 4 rod journals (throw r=0.22) + webs +
//     pie-sector counterweights, phases [0,π,π,0] (pistons 1&4 / 2&3 paired)
//   • cam lobes = smooth polar profile r(a)=rb+(rl−rb)·cos³(a) — an egg-shaped
//     lobe like a real cam, extruded, timed so the nose presses the bucket at
//     mid-stroke (intake center φ=π/2, exhaust center φ=3.5π on the 4π cycle)
//   • timing: crank sprocket 12 teeth → cam sprockets 24 teeth = 2:1, cam
//     speed = crank/2, one cam revolution per 720° four-stroke cycle
//   • valves = tulip head + stem + pinned 48/6 helical spring + retainer +
//     angled seat + bucket tappet that rides under its cam lobe
//   • pistons = crown + ring belt (3 grooves + shiny rings) + skirt + wrist pin
//   • rods = I-beam shaft, big end with split cap + 2 bolts, small end bushing
//   • firing order 1-3-4-2 emerges from the phase wiring in main.js
import * as THREE from 'three';

export const REALISM_SCENARIO_TAGS = Object.freeze([
  'SCENARIO-011',
  'SCENARIO-012',
  'SCENARIO-024',
  'SCENARIO-025',
]);

// ── Real engine layout constants (shared with kinematics.js / main.js) ──
export const CYL_X = [-5.6, -5.05, -4.5, -3.95];   // cylinder centers, front→rear (cyl 1 at timing end)
export const CRANK_Y = 0;                           // crankshaft centerline
export const DECK_Y = 1.25;                         // top of block / bottom of head
export const CAM_Y = 1.795;                         // camshaft centerline (bucket top 1.72 + base circle 0.075)
export const CAM_Z = 0.30;                          // intake cam z=+0.30, exhaust cam z=−0.30
export const VALVE_LIFT = 0.07;                     // max visual valve lift (lobe nose 0.145 − base 0.075)
export const VALVE_BASE_Y = DECK_Y + 0.284;         // valve group origin: closed face flush on the deck
export const ROD_CENTER_DIST = 0.80;                // big-end→small-end visual distance (kinematics anchor 0.15 + rod 0.65)
export const TIMING_X = -6.15;                      // timing belt plane
export const WHEEL_X = [-5.3, -5.3, 3.6, 3.6];      // FL FR RL RR
export const WHEEL_Z = [-2.3, 2.3, -2.3, 2.3];

export function buildCarModel(scene) {
  const parts = {
    iceParts: new THREE.Group(),
    evParts: new THREE.Group(),
    driveline: new THREE.Group(),
    inspectableObjects: [],

    pistons: [],
    connectingRods: [],
    sparkSparks: [],
    intakeValves: [],
    exhaustValves: [],
    camshaft: null, intakeCam: null, exhaustCam: null,
    crankshaft: null,
    flywheel: null, flywheelRingGear: null,
    starterMotor: null, starterBendixGear: null,
    clutchDisc: null, pressurePlate: null,
    gearSets: [],
    propShaft: null, uJointFront: null, uJointRear: null,
    differential: null,
    rearAxleLeft: null, rearAxleRight: null,
    wheels: [], brakeDiscs: [], brakeCalipers: [],
    frontSteeringAssembly: null,
    motorRotor: null, batteryPack: null,
    timingBelt: null, crankSprocket: null,
    oilPan: null, intakeManifold: null, exhaustManifold: null, bodyShell: null,
    torqueFlowParticles: [],
  };

  scene.add(parts.iceParts, parts.evParts, parts.driveline);

  // ── PBR material palette (distinct metalness/roughness per SCENARIO-012) ──
  const castAlu  = (color = 0x9aa5b1) => new THREE.MeshStandardMaterial({ color, metalness: 0.85, roughness: 0.35 });
  const steelMat = (color = 0x4b5563) => new THREE.MeshStandardMaterial({ color, metalness: 0.85, roughness: 0.25 });
  const shinyMat = (color = 0xd7dde5) => new THREE.MeshStandardMaterial({ color, metalness: 0.95, roughness: 0.15 });
  const plainMat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, ...extra });
  const glassMat = (color, opacity = 0.22) => new THREE.MeshStandardMaterial({
    color, transparent: true, opacity, side: THREE.DoubleSide, metalness: 0.1, roughness: 0.05,
  });
  const rubberMat = new THREE.MeshStandardMaterial({ color: 0x17171c, metalness: 0.0, roughness: 0.95 });

  const tagInspectable = (mesh, name, category, description) => {
    mesh.userData.inspectable = true;
    mesh.userData.name = name;
    mesh.userData.category = category;
    mesh.userData.description = description;
    parts.inspectableObjects.push(mesh);
    return mesh;
  };

  // ═══════════ 1. 车身外壳 3-Box Sedan Shell ═══════════
  // Real silhouette: hood → windshield → roof → rear glass → trunk, with
  // true wheel-arch notches cut on the wheel centerline (radius 1.18 around
  // the 0.85 tire). Semi-transparent so the cutaway powertrain stays visible.
  {
    const body = new THREE.Group();
    const underY = -0.55;
    const archR = 1.18;
    const archHalf = Math.sqrt(archR * archR - underY * underY); // ≈1.043
    const archA1 = Math.atan2(underY, archHalf);                 // ≈−0.485 rad

    const profile = new THREE.Shape();
    profile.moveTo(-7.35, 0.55);                        // front bumper face
    profile.quadraticCurveTo(-7.42, 1.0, -6.95, 1.35);  // nose → hood front
    profile.lineTo(-4.85, 1.6);                         // gently raked hood
    profile.quadraticCurveTo(-4.4, 1.72, -3.45, 3.0);   // windshield rake
    profile.quadraticCurveTo(-2.7, 3.3, -1.75, 3.32);   // roof front
    profile.lineTo(0.35, 3.28);                         // roof
    profile.quadraticCurveTo(1.6, 3.15, 2.5, 2.55);     // rear glass slope
    profile.lineTo(4.95, 2.3);                          // trunk lid
    profile.quadraticCurveTo(6.25, 2.2, 6.35, 1.5);     // rear deck → face
    profile.lineTo(6.5, 0.55);                          // rear bumper
    profile.quadraticCurveTo(6.5, underY, 6.15, underY);// rear bumper bottom
    // rear wheel arch: semicircular notch centered ON the wheel (x=3.6, y=0)
    profile.lineTo(3.6 + archHalf, underY);
    profile.absarc(3.6, 0, archR, archA1, Math.PI - archA1, false);
    // front wheel arch (x=-5.3)
    profile.lineTo(-5.3 - archHalf, underY);
    profile.absarc(-5.3, 0, archR, archA1, Math.PI - archA1, false);
    profile.lineTo(-7.1, underY);
    profile.quadraticCurveTo(-7.4, underY, -7.35, 0.55);
    profile.closePath();

    const shellGeo = new THREE.ExtrudeGeometry(profile, { depth: 4.4, bevelEnabled: false });
    shellGeo.translate(0, 0, -2.2);
    const shell = tagInspectable(
      new THREE.Mesh(shellGeo, glassMat(0x38bdf8, 0.14)),
      '车身外壳 Car Body Shell', '车身结构', '半透明的三厢轿车车身：发动机舱、乘客舱、行李厢。透明外壳让你看清里面每个零件！'
    );
    shell.name = 'bodyShell';
    body.add(shell);

    // Greenhouse: the actual glazed cabin band (windshield + side windows +
    // rear glass) extruded as its own darker-glass profile above the beltline.
    const glass2 = new THREE.Shape();
    glass2.moveTo(-4.25, 1.95);           // base of windshield
    glass2.lineTo(-3.35, 2.95);           // windshield inner edge
    glass2.quadraticCurveTo(-2.65, 3.24, -1.8, 3.26);
    glass2.lineTo(0.3, 3.22);
    glass2.quadraticCurveTo(1.55, 3.05, 2.45, 2.5);
    glass2.lineTo(2.95, 1.95);            // base of rear glass
    glass2.closePath();
    const cabinGeo = new THREE.ExtrudeGeometry(glass2, { depth: 3.9, bevelEnabled: false });
    cabinGeo.translate(0, 0, -1.95);
    const cabin = new THREE.Mesh(cabinGeo, glassMat(0x0c4a6e, 0.42));
    cabin.name = 'cabinGlass';
    body.add(cabin);

    // Rocker panel strip between the arches
    const rocker = new THREE.Mesh(new THREE.BoxGeometry(8.0, 0.16, 4.42), plainMat(0x1e3a8a, { metalness: 0.5, roughness: 0.5, transparent: true, opacity: 0.5 }));
    rocker.name = 'rockerPanel';
    rocker.position.set(-0.9, -0.45, 0);
    body.add(rocker);

    // Headlights & taillights — mounted flush on semi-opaque FASCIA panels.
    // (On a see-through cutaway, lamps floating on the 0.14-opacity shell
    // read as debris in mid-air; the fascia band gives them a real surface.)
    const fasciaMat = plainMat(0x1e293b, { metalness: 0.55, roughness: 0.45, transparent: true, opacity: 0.72 });
    const rearFascia = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.5, 4.3), fasciaMat);
    rearFascia.name = 'rearFascia';
    rearFascia.position.set(6.52, 1.3, 0);
    body.add(rearFascia);
    const frontFascia = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.85, 4.3), fasciaMat);
    frontFascia.name = 'frontFascia';
    frontFascia.position.set(-7.32, 0.95, 0);
    body.add(frontFascia);
    for (const z of [-1.7, 1.7]) {
      const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.3, 0.55), plainMat(0xfff7cc, { emissive: 0x555500, metalness: 0.2, roughness: 0.3 }));
      headlight.position.set(-7.36, 1.05, z);
      headlight.name = 'headlight';
      body.add(headlight);
      const taillight = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.28, 0.55), plainMat(0xdc2626, { emissive: 0x330000, metalness: 0.2, roughness: 0.4 }));
      taillight.position.set(6.56, 1.75, z);
      taillight.name = 'taillight';
      body.add(taillight);
    }

    body.position.y = 0;
    parts.driveline.add(body);
    parts.bodyShell = body;
  }

  // ═══════════ 2. 发动机缸体总成 Block + Head + Oil Pan ═══════════
  // Real stack: crankcase (houses crank) → cylinder block with 4 bores →
  // head deck gasket → cylinder head (valves/ports) → valve cover.
  {
    const blockGroup = new THREE.Group();

    // Crankcase: wide skirt around the crank, semi-transparent
    const crankcase = tagInspectable(
      new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.72, 1.35), glassMat(0x64748b, 0.25)),
      '曲轴箱 Crankcase', '发动机机体', '包裹曲轴的箱体，5道主轴承座支撑曲轴高速旋转。'
    );
    crankcase.position.set(-4.78, 0.0, 0);
    blockGroup.add(crankcase);

    // 5 main bearing caps with bolt bumps (visible through the glass case)
    for (let i = 0; i < 5; i++) {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.3, 1.1), castAlu(0x7c8894));
      cap.name = `mainBearingCap${i + 1}`;
      cap.position.set(-5.83 + i * 0.53, -0.12, 0);
      blockGroup.add(cap);
    }

    // Cylinder block proper (deck at DECK_Y)
    const blockMesh = tagInspectable(
      new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.95, 1.1), glassMat(0x9aa5b1, 0.20)),
      '发动机气缸体 Cylinder Block', '发动机机体', '铝合金缸体，内有4个气缸孔。活塞就在这些孔里上下飞奔！'
    );
    blockMesh.position.set(-4.78, 0.78, 0);
    blockMesh.name = 'cylinderBlock';
    blockGroup.add(blockMesh);

    // Water jacket: coolant sheets sandwiching the bores (blue tint)
    for (const z of [-0.42, 0.42]) {
      const jacket = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.8, 0.14), glassMat(0x0ea5e9, 0.35));
      jacket.name = 'waterJacket';
      jacket.position.set(-4.78, 0.78, z);
      blockGroup.add(jacket);
    }

    // 4 cylinder liners (open glass tubes)
    for (let i = 0; i < 4; i++) {
      const liner = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 0.88, 18, 1, true),
        glassMat(0xe2e8f0, 0.18)
      );
      liner.name = `cylinderLiner${i + 1}`;
      liner.position.set(CYL_X[i], 0.84, 0);
      blockGroup.add(liner);
    }

    // Head gasket line
    const gasket = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.045, 1.1), plainMat(0x1f2937, { metalness: 0.3, roughness: 0.7 }));
    gasket.name = 'headGasket';
    gasket.position.set(-4.78, DECK_Y + 0.02, 0);
    blockGroup.add(gasket);

    // Cylinder head with intake/exhaust port stubs
    const head = tagInspectable(
      new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.5, 1.1), glassMat(0xaab4bf, 0.22)),
      '气缸盖 Cylinder Head', '配气机构', '缸盖里藏着进气道、排气道和气门。进气门放混合气进来，排气门把废气放走！'
    );
    head.position.set(-4.78, DECK_Y + 0.28, 0);
    head.name = 'cylinderHead';
    blockGroup.add(head);

    // Valve cover with lengthwise ribs + oil filler cap (real DOHC look)
    const cover = new THREE.Group();
    const coverTop = tagInspectable(
      new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.24, 0.95), glassMat(0xb91c1c, 0.35)),
      '气门室盖 Valve Cover', '配气机构', '红色透明气门室盖保护着两根凸轮轴，你能看到凸轮压气门的全过程！'
    );
    coverTop.name = 'coverTop';
    cover.add(coverTop);
    for (let r = 0; r < 4; r++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.9), castAlu(0x7f1d1d));
      rib.name = `coverRib${r + 1}`;
      rib.position.set(-0.85 + r * 0.56, 0.14, 0);
      cover.add(rib);
    }
    const fillerCap = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 10), shinyMat(0xfacc15));
    fillerCap.name = 'oilFillerCap';
    fillerCap.position.set(-0.6, 0.16, 0.28);
    cover.add(fillerCap);
    cover.position.set(-4.78, DECK_Y + 0.65, 0);
    blockGroup.add(cover);

    // Oil pan: stamped steel sump with drain plug
    const pan = new THREE.Group();
    const panBody = tagInspectable(
      new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.5, 1.05), castAlu(0x5b6672)),
      '油底壳 Oil Pan', '润滑系统', '发动机的"油库"在最底部，机油泵把机油吸上来润滑曲轴和活塞。'
    );
    panBody.name = 'panBody';
    pan.add(panBody);
    const sump = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.22, 1.0), castAlu(0x525c68));
    sump.name = 'sumpDeeperSection';
    sump.position.set(0.35, -0.34, 0);
    pan.add(sump);
    const drainPlug = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 6), shinyMat(0xcbd5e1));
    drainPlug.name = 'drainPlug';
    drainPlug.position.set(0.35, -0.48, 0);
    pan.add(drainPlug);
    pan.position.set(-4.78, -0.62, 0);
    blockGroup.add(pan);
    parts.oilPan = pan;

    blockGroup.position.y = 0;
    parts.iceParts.add(blockGroup);
  }

  // ═══════════ 3. 曲轴 Crankshaft（真实形状） ═══════════
  // 5 mains + 4 offset rod journals + webs + pie counterweights, flat-plane
  // phases [0,π,π,0]. Rotates about X at CRANK_Y; carries the crank sprocket.
  {
    const crank = new THREE.Group();
    const PHASE = [0, Math.PI, Math.PI, 0];

    // Main journals (on the crank axis)
    for (let i = 0; i < 5; i++) {
      const main = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.14, 10), shinyMat(0xe8edf3));
      main.rotation.z = Math.PI / 2;
      main.name = `mainJournal${i + 1}`;
      main.position.set(-5.85 + i * 0.53, 0, 0);
      crank.add(main);
    }

    // Rod journals + web pairs + counterweights
    for (let i = 0; i < 4; i++) {
      const a = PHASE[i];
      const pinY = Math.cos(a) * 0.22;
      const pinZ = Math.sin(a) * 0.22;

      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.18, 10), shinyMat(0xf1f5f9));
      pin.rotation.z = Math.PI / 2;
      pin.name = `rodJournal${i + 1}`;
      pin.position.set(CYL_X[i], pinY, pinZ);
      crank.add(pin);

      // Web plates connecting main axis to the pin
      for (const wx of [CYL_X[i] - 0.13, CYL_X[i] + 0.13]) {
        const web = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.5, 0.26), steelMat(0x52606f));
        web.name = `crankWeb`;
        web.position.set(wx, pinY * 0.5, pinZ * 0.5);
        web.rotation.x = -a;
        crank.add(web);
      }

      // Pie-sector counterweight opposite the pin (real crank balance mass)
      for (const wx of [CYL_X[i] - 0.2, CYL_X[i] + 0.2]) {
        const cw = new THREE.Mesh(
          new THREE.CylinderGeometry(0.33, 0.33, 0.075, 12, 1, false, 0, Math.PI * 0.78),
          steelMat(0x3f4a57)
        );
        cw.rotation.z = Math.PI / 2;       // axis along X
        cw.rotation.x = a + Math.PI;       // sector points opposite the pin
        cw.name = `counterweight${i + 1}`;
        cw.position.set(wx, 0, 0);
        crank.add(cw);
      }
    }

    // Front nose (carries the timing sprocket) + rear flange (carries flywheel)
    const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.7, 12), shinyMat(0xe8edf3));
    nose.rotation.z = Math.PI / 2;
    nose.name = 'crankNose';
    nose.position.set(TIMING_X + 0.15, 0, 0);
    crank.add(nose);
    const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 16), steelMat(0x52606f));
    flange.rotation.z = Math.PI / 2;
    flange.name = 'crankRearFlange';
    flange.position.set(-3.62, 0, 0);
    crank.add(flange);
    tagInspectable(flange, '发动机曲轴 Crankshaft', '曲柄连杆', '把活塞的上下直线运动变成旋转！曲柄销偏心0.22，对侧配重块保持平衡。');

    // Crank timing sprocket: 12 teeth, on the nose — drives the belt at 2:1
    const crankSprocket = buildToothedGear(0.14, 0.11, shinyMat(0xfacc15), null, null, null, 12);
    crankSprocket.name = 'crankSprocket';
    crankSprocket.position.set(TIMING_X, 0, 0);
    crank.add(crankSprocket);
    parts.crankSprocket = crankSprocket;

    crank.position.set(0, 0, 0);
    parts.iceParts.add(crank);
    parts.crankshaft = crank;
  }

  // ═══════════ 4. 活塞 + 连杆 Pistons & Connecting Rods（真实形状） ═══════════
  for (let i = 0; i < 4; i++) {
    const cx = CYL_X[i];

    // Piston: crown + ring belt (3 grooves & rings) + skirt + wrist pin
    const pGroup = new THREE.Group();
    const crown = tagInspectable(
      new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.215, 0.07, 18), shinyMat(0xe2e8f0)),
      `气缸 ${i + 1} 活塞 Piston`, '曲柄连杆', '顶部承受爆炸推力。侧面3道活塞环密封高温高压气体并刮油。'
    );
    crown.name = 'pistonCrown';
    crown.position.y = 0.14;
    pGroup.add(crown);

    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.215, 0.14, 18), steelMat(0x94a3b8));
    belt.name = 'ringBelt';
    belt.position.y = 0.035;
    pGroup.add(belt);

    for (let r = 0; r < 3; r++) {
      const ringGroove = new THREE.Mesh(new THREE.TorusGeometry(0.212, 0.016, 4, 6), steelMat(0x334155));
      ringGroove.name = `ringGroove${r + 1}`;
      ringGroove.rotation.x = Math.PI / 2;
      ringGroove.position.y = 0.1 - r * 0.055;
      pGroup.add(ringGroove);
      const pistonRing = new THREE.Mesh(new THREE.TorusGeometry(0.222, 0.009, 6, 10), shinyMat(0x0f172a));
      pistonRing.name = `pistonRing${r + 1}`;
      pistonRing.rotation.x = Math.PI / 2;
      pistonRing.position.y = 0.1 - r * 0.055;
      pGroup.add(pistonRing);
    }

    const skirt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.208, 0.208, 0.2, 16, 1, true),
      steelMat(0x8798ab)
    );
    skirt.name = 'pistonSkirt';
    skirt.position.y = -0.14;
    pGroup.add(skirt);

    const wristPin = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.34, 10), shinyMat(0x475569));
    wristPin.rotation.x = Math.PI / 2;
    wristPin.name = 'wristPin';
    pGroup.add(wristPin);

    pGroup.position.set(cx, 0.8, 0);
    parts.iceParts.add(pGroup);
    parts.pistons.push(pGroup);

    // Connecting rod: I-beam shaft, big end with cap+bolts, small end with bushing.
    // Origin at the BIG END center; small end at +ROD_CENTER_DIST local Y.
    const rodGroup = new THREE.Group();
    const web = new THREE.Mesh(new THREE.BoxGeometry(0.032, ROD_CENTER_DIST, 0.05), steelMat(0x8798ab));
    web.name = 'rodWeb';
    web.position.y = ROD_CENTER_DIST / 2;
    rodGroup.add(web);
    for (const fz of [0.038, -0.038]) {
      const flange = new THREE.Mesh(new THREE.BoxGeometry(0.012, ROD_CENTER_DIST, 0.082), steelMat(0x94a3b8));
      flange.name = 'rodFlange';
      flange.position.set(0, ROD_CENTER_DIST / 2, fz);
      rodGroup.add(flange);
    }

    const bigEnd = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.11, 12), steelMat(0x64748b));
    bigEnd.rotation.x = Math.PI / 2;
    bigEnd.name = 'bigEnd';
    rodGroup.add(bigEnd);
    const bigEndCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.105, 0.105, 0.115, 12, 1, false, Math.PI, Math.PI),
      steelMat(0x52606f)
    );
    bigEndCap.rotation.x = Math.PI / 2;
    bigEndCap.name = 'bigEndCap';
    rodGroup.add(bigEndCap);
    for (const bx of [0.09, -0.09]) {
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.22, 6), shinyMat(0xcbd5e1));
      bolt.rotation.x = Math.PI / 2;
      bolt.name = 'bigEndCapBolt';
      bolt.position.set(0, -0.02, bx);
      rodGroup.add(bolt);
    }

    const smallEnd = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.085, 10), steelMat(0x64748b));
    smallEnd.rotation.x = Math.PI / 2;
    smallEnd.name = 'smallEnd';
    smallEnd.position.y = ROD_CENTER_DIST;
    rodGroup.add(smallEnd);
    const bushing = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.014, 4, 8), shinyMat(0xfacc15));
    bushing.name = 'smallEndBushing';
    bushing.position.y = ROD_CENTER_DIST;
    rodGroup.add(bushing);

    tagInspectable(smallEnd, `气缸 ${i + 1} 连杆 Connecting Rod`, '曲柄连杆', 'I字梁连杆：小头连活塞销，大头抱曲柄销，把推力传给曲轴！');
    rodGroup.position.set(cx, 0.8, 0);
    parts.iceParts.add(rodGroup);
    parts.connectingRods.push(rodGroup);
  }

  // ═══════════ 5. DOHC 配气机构 Valvetrain（真实凸轮轮廓） ═══════════
  // Two camshafts (intake z+0.30 / exhaust z−0.30), each a shaft with 4 egg
  // lobes timed to its cylinder's stroke phase; bucket tappets ride under the
  // lobes; valves open downward into the head.
  const lobeShape = (() => {
    // Smooth polar cam profile: base circle 0.075 with a nose to 0.145
    // r(a) = 0.075 + 0.07·max(0,cos a)³ — egg/teardrop like a real lobe.
    const s = new THREE.Shape();
    const N = 24;
    for (let k = 0; k <= N; k++) {
      const a = -Math.PI + (k / N) * Math.PI * 2;
      const r = 0.075 + 0.07 * Math.pow(Math.max(0, Math.cos(a)), 3);
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (k === 0) s.moveTo(x, y); else s.lineTo(x, y);
    }
    s.closePath();
    return s;
  })();
  const lobeGeo = new THREE.ExtrudeGeometry(lobeShape, { depth: 0.09, bevelEnabled: false });
  lobeGeo.translate(0, 0, -0.045);
  lobeGeo.rotateY(Math.PI / 2); // thickness now along X; nose along +Y

  const PHASE = [0, Math.PI, Math.PI, 0];
  const buildCam = (isIntake) => {
    const cam = new THREE.Group();
    const z = isIntake ? CAM_Z : -CAM_Z;

    const shaft = tagInspectable(
      new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 2.6, 10), shinyMat(0xfbbf24)),
      `${isIntake ? '进气' : '排气'}凸轮轴 ${isIntake ? 'Intake' : 'Exhaust'} Camshaft`, '配气机构',
      isIntake ? '蛋形凸轮每转一圈精确压开进气门一次，转速是曲轴的一半。' : '排气凸轮轴与进气凸轮轴同款，按排气冲程时序压开排气门。'
    );
    shaft.rotation.z = Math.PI / 2;
    shaft.name = 'camShaftBar';
    shaft.position.x = -4.95;
    cam.add(shaft);

    // 4 lobes; nose hits the bucket at mid-stroke:
    //   intake center φ=π/2  → lobe offset δ = 3π/4 + phase/2
    //   exhaust center φ=3.5π → lobe offset δ = −3π/4 + phase/2
    for (let i = 0; i < 4; i++) {
      const lobe = new THREE.Mesh(lobeGeo, steelMat(0xd9a441));
      lobe.name = `camLobe${i + 1}`;
      lobe.position.set(CYL_X[i], 0, 0);
      lobe.rotation.x = isIntake
        ? (3 * Math.PI) / 4 + PHASE[i] / 2
        : (-3 * Math.PI) / 4 + PHASE[i] / 2;
      cam.add(lobe);
    }

    // Cam journal caps
    for (let i = 0; i < 5; i++) {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.12), castAlu(0x7c8894));
      cap.name = 'camJournalCap';
      cap.position.set(-5.85 + i * 0.53, 0.05, 0);
      cam.add(cap);
    }

    // Cam sprocket: 24 teeth = 2× crank sprocket (the visible 2:1 ratio)
    const sprocket = buildToothedGear(0.28, 0.1, shinyMat(0xfacc15), null, null, null, 24);
    sprocket.name = isIntake ? 'intakeCamSprocket' : 'exhaustCamSprocket';
    sprocket.position.set(TIMING_X, 0, 0);
    cam.add(sprocket);

    cam.position.set(0, CAM_Y, z);
    parts.iceParts.add(cam);
    return cam;
  };
  parts.intakeCam = buildCam(true);
  parts.exhaustCam = buildCam(false);
  const camContainer = new THREE.Group();
  camContainer.name = 'camshaftAssembly';
  camContainer.add(parts.intakeCam, parts.exhaustCam);
  parts.iceParts.add(camContainer);
  parts.camshaft = camContainer; // container: main.js rotates intakeCam/exhaustCam individually

  // Valves: tulip head + stem + pinned 48/6 spring + retainer + tilted seat +
  // bucket tappet under the lobe. Closed-state stack: face flush on the deck
  // (group origin at DECK_Y+0.284), bucket top at 1.72 just under the cam
  // base circle (CAM_Y−0.075); main.js pushes the group down by the lift.
  const buildValve = (cx, isIntake, i) => {
    const valve = new THREE.Group();
    valve.name = isIntake ? `intakeValve${i + 1}` : `exhaustValve${i + 1}`;

    const stem = tagInspectable(
      new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.36, 8), shinyMat(isIntake ? 0x7dd3fc : 0xfca5a5)),
      `气缸 ${i + 1} ${isIntake ? '进气门 Intake Valve' : '排气门 Exhaust Valve'}`, '配气机构',
      isIntake ? '凸轮把它压下时，新鲜混合气冲进气缸。' : '排气冲程被压下，把废气推出气缸。'
    );
    stem.name = 'valveStem';
    stem.position.y = 0.0;
    valve.add(stem);

    const head = new THREE.Mesh(
      new THREE.CylinderGeometry(0.088, 0.025, 0.095, 12),
      shinyMat(isIntake ? 0x38bdf8 : 0xef4444)
    );
    head.name = 'valveHead';
    head.position.y = -0.24;
    valve.add(head);

    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.012, 12), shinyMat(0xe2e8f0));
    face.name = 'valveFace';
    face.position.y = -0.284;
    valve.add(face);

    // Pinned helical spring: TubeGeometry(catmull, 48, r, 6)
    const springPoints = [];
    const turns = 5, samples = 40;
    for (let s = 0; s <= samples; s++) {
      const t = s / samples;
      const a = t * turns * Math.PI * 2;
      springPoints.push(new THREE.Vector3(Math.cos(a) * 0.055, -0.08 + t * 0.18, Math.sin(a) * 0.055));
    }
    const spring = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(springPoints), 48, 0.011, 6),
      shinyMat(0xcbd5e1)
    );
    spring.name = 'valveSpring';
    valve.add(spring);

    const retainer = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.05, 0.025, 10), steelMat(0x64748b));
    retainer.name = 'springRetainer';
    retainer.position.y = 0.135;
    valve.add(retainer);

    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.062, 0.055, 10), steelMat(0x64748b));
    seat.name = 'valveSeat';
    seat.position.y = -0.235;
    seat.rotation.z = Math.PI / 6; // angled seat ring (≈30°)
    valve.add(seat);

    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.07, 10), shinyMat(0xa8b3c1));
    bucket.name = 'bucketTappet';
    bucket.position.y = 0.15;
    valve.add(bucket);

    valve.position.set(cx, VALVE_BASE_Y, isIntake ? CAM_Z : -CAM_Z);
    parts.iceParts.add(valve);
    return valve;
  };

  for (let i = 0; i < 4; i++) {
    parts.intakeValves.push(buildValve(CYL_X[i], true, i));
    parts.exhaustValves.push(buildValve(CYL_X[i], false, i));
  }

  // Spark plugs: ceramic ribbed insulator + hex + electrode, center of head
  for (let i = 0; i < 4; i++) {
    const plug = new THREE.Group();
    const electrode = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 6), shinyMat(0xf8fafc));
    electrode.name = 'plugElectrode';
    electrode.position.y = -0.06;
    plug.add(electrode);
    const hex = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.09, 6), steelMat(0x8798ab));
    hex.name = 'plugHex';
    hex.position.y = 0.03;
    plug.add(hex);
    const insulator = tagInspectable(
      new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.055, 0.22, 10), plainMat(0xf8fafc, { metalness: 0.05, roughness: 0.35 })),
      `气缸 ${i + 1} 火花塞 Spark Plug`, '点火系统', '压缩冲程结束瞬间打出上万伏电火花，点燃混合气——爆炸推动活塞！'
    );
    insulator.name = 'plugInsulator';
    insulator.position.y = 0.18;
    plug.add(insulator);
    for (let rib = 0; rib < 3; rib++) {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.02, 8), plainMat(0xeef2f7, { metalness: 0.05, roughness: 0.35 }));
      ring.name = 'plugRib';
      ring.position.y = 0.12 + rib * 0.05;
      plug.add(ring);
    }
    const terminal = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.05, 6), steelMat(0x94a3b8));
    terminal.name = 'plugTerminal';
    terminal.position.y = 0.31;
    plug.add(terminal);

    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xff4500, transparent: true, opacity: 0 })
    );
    flame.position.set(CYL_X[i], 1.0, 0);
    parts.iceParts.add(flame);

    plug.position.set(CYL_X[i], DECK_Y + 0.38, 0);
    parts.iceParts.add(plug);
    parts.sparkSparks.push({ spark: insulator, flame, inValve: parts.intakeValves[i], exValve: parts.exhaustValves[i] });
  }

  // ═══════════ 6. 正时皮带传动 Timing Belt Drive ═══════════
  // Black toothed belt wrapping crank sprocket → both cam sprockets (2:1).
  {
    const beltPts = [
      new THREE.Vector3(TIMING_X, -0.18, 0),
      new THREE.Vector3(TIMING_X, -0.02, 0.17),
      new THREE.Vector3(TIMING_X, 0.75, 0.36),
      new THREE.Vector3(TIMING_X, CAM_Y - 0.05, CAM_Z + 0.33),
      new THREE.Vector3(TIMING_X, CAM_Y + 0.13, CAM_Z + 0.2),
      new THREE.Vector3(TIMING_X, CAM_Y + 0.3, 0),
      new THREE.Vector3(TIMING_X, CAM_Y + 0.13, -CAM_Z - 0.2),
      new THREE.Vector3(TIMING_X, CAM_Y - 0.05, -CAM_Z - 0.33),
      new THREE.Vector3(TIMING_X, 0.75, -0.36),
      new THREE.Vector3(TIMING_X, -0.02, -0.17),
    ];
    const belt = tagInspectable(
      new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(beltPts, true), 36, 0.035, 6, true),
        rubberMat
      ),
      '正时皮带 Timing Belt', '配气机构', '黑色齿形皮带连接曲轴与两根凸轮轴：曲轴转两圈，凸轮轴转一圈(2:1)，气门开闭永远和活塞同步！'
    );
    belt.name = 'timingBelt';
    parts.iceParts.add(belt);
    parts.timingBelt = belt;

    // Belt tensioner idler pulley (real engines have one)
    const tensioner = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.09, 10), steelMat(0x64748b));
    tensioner.rotation.z = Math.PI / 2;
    tensioner.name = 'beltTensioner';
    tensioner.position.set(TIMING_X, 0.8, 0.44);
    parts.iceParts.add(tensioner);
  }

  // ═══════════ 7. 进气系统 Intake Manifold（谐腔 + 弯管） ═══════════
  {
    const intake = new THREE.Group();
    const plenum = tagInspectable(
      new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 1.9, 12), plainMat(0x0284c7, { metalness: 0.6, roughness: 0.3 })),
      '进气歧管谐腔 Intake Plenum', '进气系统', '稳压腔把空气均匀分配给4根弯曲进气歧管，每根都通向一个气缸的进气门。'
    );
    plenum.rotation.z = Math.PI / 2;
    plenum.position.set(-4.78, 1.98, 0.95);
    intake.add(plenum);

    // 4 curved runners arcing down into the head's intake ports
    for (let i = 0; i < 4; i++) {
      const runner = new THREE.Mesh(
        new THREE.TorusGeometry(0.36, 0.085, 8, 12, Math.PI * 0.62),
        plainMat(0x38bdf8, { metalness: 0.5, roughness: 0.35, transparent: true, opacity: 0.9 })
      );
      runner.name = `intakeRunner${i + 1}`;
      runner.rotation.y = Math.PI / 2;
      runner.position.set(CYL_X[i], 1.7, 0.72);
      intake.add(runner);
    }

    // Throttle body with plate at the plenum front + intake duct
    const throttle = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.3, 10), shinyMat(0x94a3b8));
    throttle.rotation.z = Math.PI / 2;
    throttle.name = 'throttleBody';
    throttle.position.set(-5.95, 1.98, 0.95);
    intake.add(throttle);
    const duct = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.8, 8), rubberMat);
    duct.rotation.z = Math.PI / 2 - 0.18;
    duct.name = 'intakeDuct';
    duct.position.set(-6.55, 2.12, 1.05);
    intake.add(duct);

    parts.iceParts.add(intake);
    parts.intakeManifold = intake;
  }

  // ═══════════ 8. 排气系统 Exhaust Manifold + 中段 + 消音器 ═══════════
  {
    const exhaust = new THREE.Group();

    // 4 curved primaries from the exhaust ports, merging into a collector
    for (let i = 0; i < 4; i++) {
      const from = new THREE.Vector3(CYL_X[i], DECK_Y + 0.15, -0.62);
      const to = new THREE.Vector3(-4.35 + i * 0.12, 0.35, -0.82);
      const mid = from.clone().lerp(to, 0.5).add(new THREE.Vector3(0, -0.15, -0.12));
      const primary = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3([from, mid, to]), 14, 0.07, 6, false),
        steelMat(0x52606f)
      );
      primary.name = `exhaustPrimary${i + 1}`;
      exhaust.add(primary);
    }

    // Collector → mid pipe under the floor → muffler → tailpipe
    const midPts = [
      new THREE.Vector3(-4.1, 0.3, -0.85),
      new THREE.Vector3(-2.5, -0.72, -0.85),
      new THREE.Vector3(0.5, -0.78, -0.85),
      new THREE.Vector3(3.4, -0.78, -0.8),
    ];
    const midPipe = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(midPts), 30, 0.09, 6, false),
      steelMat(0x3f4a57)
    );
    midPipe.name = 'exhaustMidPipe';
    exhaust.add(midPipe);

    const muffler = tagInspectable(
      new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.3, 10), steelMat(0x4b5563)),
      '消音器 Muffler', '排气系统', '里面的隔板和管道把高压废气的噪音"揉碎"，最后从尾管安静地排出。'
    );
    muffler.rotation.z = Math.PI / 2;
    muffler.position.set(4.6, -0.78, -0.75);
    exhaust.add(muffler);
    const tailpipe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.7, 8), shinyMat(0x94a3b8));
    tailpipe.rotation.z = Math.PI / 2;
    tailpipe.name = 'tailpipe';
    tailpipe.position.set(5.6, -0.78, -0.75);
    exhaust.add(tailpipe);

    parts.iceParts.add(exhaust);
    parts.exhaustManifold = exhaust;
  }

  // ═══════════ 9. 飞轮 + 起动机 + 离合器 ═══════════
  {
    const flywheel = new THREE.Group();
    const fwMesh = tagInspectable(
      new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.12, 20), steelMat(0x64748b)),
      '发动机飞轮 Flywheel', '启动与传动', '又大又重的金属盘存住每一爆冲的能量，让曲轴转得平顺。外圈齿圈专供起动机咬合！'
    );
    fwMesh.rotation.z = Math.PI / 2;
    fwMesh.name = 'flywheelDisc';
    flywheel.add(fwMesh);

    const ringGearTeeth = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.04, 6, 20), shinyMat(0xfacc15));
    ringGearTeeth.rotation.y = Math.PI / 2;
    ringGearTeeth.name = 'ringGearTeeth';
    flywheel.add(ringGearTeeth);
    parts.flywheelRingGear = ringGearTeeth;

    for (let k = 0; k < 4; k++) {
      const mark = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 0.66), plainMat(0xf59e0b, { metalness: 0.4, roughness: 0.4 }));
      const rad = (k / 6) * Math.PI * 2;
      mark.position.set(0, Math.cos(rad) * 0.5, Math.sin(rad) * 0.5);
      mark.rotation.x = rad;
      mark.name = 'flywheelMark';
      flywheel.add(mark);
    }
    flywheel.position.set(-3.45, 0, 0);
    parts.iceParts.add(flywheel);
    parts.flywheel = flywheel;

    // Starter motor: body + solenoid on top + extendable Bendix pinion.
    // Pinion meshes the ring gear: dist from crank axis = 0.74+0.16 = 0.90.
    const starterGroup = new THREE.Group();
    const starterBody = tagInspectable(
      new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.75, 12), steelMat(0x334155)),
      '起动机 Starter Motor', '启动系统', '按启动键→蓄电池供电→起动机全力旋转，通过小齿轮带动飞轮把发动机甩起来！'
    );
    starterBody.rotation.z = Math.PI / 2;
    starterBody.position.x = -0.3;
    starterGroup.add(starterBody);

    const solenoid = tagInspectable(
      new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.45, 10), steelMat(0x0284c7)),
      '起动机电磁开关 Solenoid', '启动系统', '电磁铁一吸，就把驱动齿轮推出去咬住飞轮齿圈；启动完成自动弹回。'
    );
    solenoid.rotation.z = Math.PI / 2;
    solenoid.position.set(-0.15, 0.3, 0);
    starterGroup.add(solenoid);

    const bendixPinion = buildToothedGear(0.16, 0.14, shinyMat(0xfacc15), null, null, null, 12);
    bendixPinion.name = 'bendixPinion';
    bendixPinion.position.x = 0.22; // retracted; extended = 0.45 (main.js)
    starterGroup.add(bendixPinion);
    parts.starterBendixGear = bendixPinion;

    starterGroup.position.set(-3.9, -0.65, 0.65);
    parts.iceParts.add(starterGroup);
    parts.starterMotor = starterGroup;

    // Clutch: friction disc with sprung hub + pressure plate ring
    const clutchDisc = tagInspectable(
      new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.055, 18), plainMat(0xb91c1c, { metalness: 0.5, roughness: 0.6 })),
      '离合器摩擦片 Clutch Disc', '离合器', '摩擦片被压盘压在飞轮上传递动力；踩下离合踏板，动力被切断才能换挡。'
    );
    clutchDisc.rotation.z = Math.PI / 2;
    clutchDisc.position.set(-3.34, 0, 0);
    parts.iceParts.add(clutchDisc);
    parts.clutchDisc = clutchDisc;

    const pressurePlate = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.07, 6, 16), steelMat(0x52606f));
    pressurePlate.rotation.y = Math.PI / 2;
    pressurePlate.name = 'pressurePlate';
    pressurePlate.position.set(-3.28, 0, 0);
    parts.iceParts.add(pressurePlate);
    parts.pressurePlate = pressurePlate;
  }

  // ═══════════ 10. 变速箱 Gearbox（双轴 5 组齿轮） ═══════════
  {
    const gearboxCase = tagInspectable(
      new THREE.Mesh(new THREE.BoxGeometry(1.85, 1.6, 1.4), glassMat(0x38bdf8, 0.16)),
      '变速箱 Gearbox', '变速箱', '两组轴、5对齿轮：低挡扭矩大、高挡跑得快，R挡反转倒车。'
    );
    gearboxCase.position.set(-2.4, 0, 0);
    parts.iceParts.add(gearboxCase);

    const inputShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.7, 8), shinyMat(0xe8edf3));
    inputShaft.rotation.z = Math.PI / 2;
    inputShaft.name = 'gearboxInputShaft';
    inputShaft.position.set(-2.4, 0.3, 0);
    parts.iceParts.add(inputShaft);
    const outputShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.7, 8), shinyMat(0xe8edf3));
    outputShaft.rotation.z = Math.PI / 2;
    outputShaft.name = 'gearboxOutputShaft';
    outputShaft.position.set(-2.4, -0.35, 0);
    parts.iceParts.add(outputShaft);

    const gearRatios = [0.4, 0.65, 0.85, 1.1, -0.5];
    const gearColors = [0xef4444, 0xf97316, 0x38bdf8, 0x10b981, 0xa855f7];
    const gearNames = ['1挡齿轮', '2挡齿轮', '3挡齿轮', '4挡齿轮', 'R挡倒车齿轮'];

    for (let g = 0; g < 5; g++) {
      const ratio = Math.abs(gearRatios[g]);
      const r1 = 0.45 * ratio;
      const r2 = 0.65 - r1;

      const gGroup1 = buildToothedGear(
        r1, 0.1, steelMat(gearColors[g]),
        `变速箱 ${gearNames[g]}`, '变速箱', `齿轮比 ${gearRatios[g]}：小齿轮带大齿轮=扭矩放大；大带小=速度加快。`
      );
      gGroup1.position.set(-3.05 + g * 0.31, 0.3, 0);
      parts.iceParts.add(gGroup1);

      const gGroup2 = buildToothedGear(r2, 0.1, steelMat(0x64748b), null, null, null);
      gGroup2.position.set(-3.05 + g * 0.31, -0.35, 0);
      parts.iceParts.add(gGroup2);

      parts.gearSets.push({ g1: gGroup1, g2: gGroup2, ratio: gearRatios[g] });
    }
  }

  // ═══════════ 11. 传动轴 + 万向节 + 差速器 + 半轴 ═══════════
  {
    const shaftGroup = new THREE.Group();
    const shaft = tagInspectable(
      new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 4.15, 10), steelMat(0x94a3b8)),
      '传动轴 Propeller Shaft', '底盘传动', '长旋转轴把变速箱的动力送到后桥，后端斜向下接小锥齿轮。'
    );
    shaft.rotation.z = Math.PI / 2;
    shaft.name = 'propShaftTube';
    shaftGroup.add(shaft);
    shaftGroup.position.set(0.475, 0, 0);
    parts.driveline.add(shaftGroup);
    parts.propShaft = shaftGroup;

    parts.uJointFront = buildUJoint(-1.35, 0, 0, '前万向节 Front U-Joint');
    parts.uJointRear = buildUJoint(2.57, -0.02, 0, '后万向节 Rear U-Joint');
    parts.driveline.add(parts.uJointFront, parts.uJointRear);

    // Sloped yoke: rear U-joint drops down ~27° to the pinion nose — exactly
    // how a real prop shaft meets the offset hypoid pinion (instead of poking
    // straight through the ring-gear disc, which the old full-length tube did).
    {
      const dir = new THREE.Vector3(0.55, -0.28, 0); // (2.57,−0.02) → (3.12,−0.30)
      const yoke = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, dir.length(), 8), steelMat(0x94a3b8));
      yoke.rotation.z = Math.atan2(-dir.x, dir.y);
      yoke.position.set(2.845, -0.16, 0);
      yoke.name = 'pinionYoke';
      parts.driveline.add(yoke);
    }

    parts.differential = buildDetailedDifferential(3.6, 0, 0);
    parts.driveline.add(parts.differential);

    // Rotation-direction arrows: orange arc around the prop shaft (longitudinal
    // spin) and cyan arcs around both rear axles (transverse spin) — the two
    // arcs meet at the differential so the 90° direction flip is instantly
    // readable. Visibility is driven by main.js (engine running).
    {
      const arrows = new THREE.Group();
      arrows.name = 'rotationArrows';
      const arrowOrangeMat = new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.85 });
      const arrowCyanMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.85 });

      // Arc arrow helper: arc in the local XY plane around local Z, cone tip
      // tangential at the arc end. Rotate the returned group to the target axis.
      const buildArcArrow = (radius, arcAngle, mat) => {
        const g = new THREE.Group();
        const arc = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.036, 4, 9, arcAngle), mat);
        arc.name = 'arrowArc';
        g.add(arc);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.18, 7), mat);
        tip.name = 'arrowTip';
        tip.position.set(Math.cos(arcAngle) * radius, Math.sin(arcAngle) * radius, 0);
        tip.rotation.z = arcAngle; // +Y of the cone rides the arc tangent
        g.add(tip);
        return g;
      };

      // Prop shaft (world X axis): local Z → world X via rotation.y = π/2
      const propArrow = buildArcArrow(0.3, Math.PI * 1.15, arrowOrangeMat);
      propArrow.rotation.y = Math.PI / 2;
      propArrow.position.set(1.55, 0.08, 0); // mid-shaft, clear of the diff from rear angles
      propArrow.name = 'propShaftArrow';
      arrows.add(propArrow);

      // Rear axles (world Z axis): torus already lies around Z
      for (const side of [-1, 1]) {
        const axArrow = buildArcArrow(0.22, Math.PI * 1.15, arrowCyanMat);
        axArrow.position.set(3.6, 0, 1.75 * side);
        axArrow.name = `axleArrow${side < 0 ? 'L' : 'R'}`;
        arrows.add(axArrow);
      }

      // L-shaped 90° HAND-OFF arrow right at the pinion/ring mesh: an orange
      // arc spinning AROUND the prop shaft (X) hands off to a cyan arc
      // spinning AROUND the axle (Z), corner to corner. Even when viewing
      // straight down the shaft (where every cone reads as a disc), this L
      // shows the spin direction turning 90° (user: 顺着看还是不清楚).
      {
        const meshPt = { x: 3.42, y: -0.52, z: 0 };
        // orange: arc around X (YZ plane) on the incoming (prop) side
        const inArc = new THREE.Mesh(new THREE.TorusGeometry(0.20, 0.034, 4, 8, Math.PI * 0.9), arrowOrangeMat);
        inArc.rotation.y = Math.PI / 2;
        inArc.position.set(meshPt.x - 0.26, meshPt.y, meshPt.z);
        inArc.name = 'handOffIn';
        arrows.add(inArc);
        const inTip = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.16, 6), arrowOrangeMat);
        inTip.position.set(meshPt.x - 0.26, meshPt.y - 0.20, meshPt.z);
        inTip.rotation.x = 0; // tangent at arc end (bottom), pointing +Z
        inTip.name = 'handOffInTip';
        arrows.add(inTip);
        // cyan: arc around Z (XY plane) on the outgoing (axle) side
        const outArc = new THREE.Mesh(new THREE.TorusGeometry(0.20, 0.034, 4, 8, Math.PI * 0.9), arrowCyanMat);
        outArc.rotation.z = -Math.PI * 0.05;
        outArc.position.set(meshPt.x + 0.26, meshPt.y, meshPt.z);
        outArc.name = 'handOffOut';
        arrows.add(outArc);
        const outTip = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.16, 6), arrowCyanMat);
        outTip.position.set(meshPt.x + 0.46, meshPt.y, meshPt.z);
        outTip.rotation.z = -Math.PI / 2; // tangent at arc end, pointing +X→ outward
        outTip.name = 'handOffOutTip';
        arrows.add(outTip);
      }

      arrows.visible = false;
      parts.driveline.add(arrows);
      parts.rotationArrows = arrows;
      parts.rotationArrowMats = [arrowOrangeMat, arrowCyanMat];
    }

    for (const side of [-1, 1]) {
      const axleGroup = new THREE.Group();
      const axle = tagInspectable(
        new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.15, 10), steelMat(0xf97316)),
        `${side < 0 ? '左' : '右'}后驱动半轴 Rear Axle`, '底盘传动', '差速器把扭矩分开后，经左右半轴各自驱动车轮。'
      );
      axle.rotation.x = Math.PI / 2;
      axleGroup.add(axle);
      axleGroup.position.set(3.6, 0, 1.1 * side);
      parts.driveline.add(axleGroup);
      parts[side < 0 ? 'rearAxleLeft' : 'rearAxleRight'] = axleGroup;
    }
  }

  // ═══════════ 12. 转向系统 Steering ═══════════
  {
    const steer = new THREE.Group();
    const rack = tagInspectable(
      new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.3, 10), steelMat(0x475569)),
      '齿轮齿条转向器 Rack & Pinion', '转向系统', '方向盘转小齿轮→推拉齿条横移→带动前轮左右摆动！'
    );
    rack.rotation.x = Math.PI / 2;
    rack.name = 'steeringRack';
    steer.add(rack);
    for (const side of [-1, 1]) {
      const tieRod = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.85, 8), steelMat(0x94a3b8));
      tieRod.rotation.x = Math.PI / 2;
      tieRod.name = `tieRod${side < 0 ? 'L' : 'R'}`;
      tieRod.position.set(0.4, -0.05, 1.35 * side);
      steer.add(tieRod);
      const tieRodEnd = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), steelMat(0x334155));
      tieRodEnd.name = 'tieRodEnd';
      tieRodEnd.position.set(0.4, -0.05, 1.95 * side);
      steer.add(tieRodEnd);
    }
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 8), steelMat(0x475569));
    column.rotation.z = Math.PI / 2 - 0.5;
    column.name = 'steeringColumn';
    column.position.set(0.55, 0.35, 0.3);
    steer.add(column);

    // ═══════════ 12b. 副车架 Front & Rear Subframes ═══════════
    // Real cars bolt engine + steering rack + suspension onto a SUBFRAME,
    // which then bolts to the body. Without it, those parts look like they
    // float in mid-air. Two longitudinal rails + crossmembers per axle.
    {
      const sub = new THREE.Group();
      const railMat = plainMat(0x334155, { metalness: 0.7, roughness: 0.4 });
      const subframeTag = (mesh, labelZh, extra) => tagInspectable(mesh, labelZh, '车身结构', extra);

      // FRONT subframe: rails x -6.7 → -4.3 at z ±0.85, y just under the rack
      for (const side of [-1, 1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.14, 0.16), railMat);
        rail.name = `frontSubframeRail${side < 0 ? 'L' : 'R'}`;
        rail.position.set(-5.5, -0.68, 0.85 * side);
        sub.add(rail);
      }
      // crossmembers: ahead of the rack and behind it (the rack clamps between)
      for (const [cx, name] of [[-6.55, 'front'], [-4.95, 'rear']]) {
        const cross = subframeTag(
          new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 1.86), railMat),
          '副车架 Front Subframe',
          '发动机、转向器、前悬架都装在这个“骨架”上，再由它连到车身——它们可不是悬空的！'
        );
        cross.name = `frontSubframeCross_${name}`;
        cross.position.set(cx, -0.68, 0);
        sub.add(cross);
      }
      // rack clamps: two little brackets visually bolting the rack down
      for (const side of [-1, 1]) {
        const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.1), railMat);
        clamp.name = 'rackClamp';
        clamp.position.set(-5.9, -0.58, 0.28 * side);
        sub.add(clamp);
      }

      // LOWER CONTROL ARMS: subframe rail → wheel-hub ball joint
      // (completes the front suspension visually: wheel ↔ arm ↔ subframe ↔ body)
      for (const side of [-1, 1]) {
        const arm = subframeTag(
          new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 1.35), railMat),
          '下摆臂 Lower Control Arm',
          '悬架的下臂：一头接副车架，一头接车轮，车轮颠簸时它上下摆动！'
        );
        arm.name = `controlArm${side < 0 ? 'L' : 'R'}`;
        arm.position.set(-5.35, -0.42, (0.85 + 2.1) / 2 * side);
        sub.add(arm);
      }

      // REAR subframe: cradles the differential + rear suspension
      for (const side of [-1, 1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.14, 0.16), railMat);
        rail.name = `rearSubframeRail${side < 0 ? 'L' : 'R'}`;
        rail.position.set(3.6, -0.68, 0.85 * side);
        sub.add(rail);
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 1.35), railMat);
        arm.name = `rearToeArm${side < 0 ? 'L' : 'R'}`;
        arm.position.set(3.6, -0.42, (0.85 + 2.1) / 2 * side);
        sub.add(arm);
      }
      for (const cx of [2.7, 4.5]) {
        const cross = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 1.86), railMat);
        cross.name = 'rearSubframeCross';
        cross.position.set(cx, -0.68, 0);
        sub.add(cross);
      }

      parts.driveline.add(sub);
      parts.subframes = sub;
    }

    steer.position.set(-5.9, -0.5, 0);
    parts.driveline.add(steer);
    parts.frontSteeringAssembly = steer;
  }

  // ═══════════ 13. 车轮 + 制动 + 悬架 ═══════════
  const wheelNames = ['前左车轮 FL Wheel', '前右车轮 FR Wheel', '后左驱动轮 RL Wheel', '后右驱动轮 RR Wheel'];
  for (let w = 0; w < 4; w++) {
    const x = WHEEL_X[w], z = WHEEL_Z[w];
    const wGroup = new THREE.Group();

    // Tire: torus + sidewall + 12 tread blocks (name tread1..12)
    const tire = tagInspectable(
      new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.25, 8, 18), plainMat(0x14141a, { roughness: 0.95, metalness: 0.0 })),
      wheelNames[w], '行驶系统', '橡胶轮胎抓住地面，把旋转力变成向前的推力！'
    );
    tire.name = 'tire';
    wGroup.add(tire);

    for (let t = 0; t < 7; t++) {
      const ang = (t / 12) * Math.PI * 2;
      const tread = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.22, 0.36), plainMat(0x1f2937, { roughness: 0.9, metalness: 0.0 }));
      tread.name = `tread${t + 1}`;
      tread.position.set(Math.cos(ang) * 0.83, Math.sin(ang) * 0.83, 0);
      tread.rotation.z = ang;
      wGroup.add(tread);
    }

    // Rim: barrel + face + 5 spokes + hub + lug nuts
    const rimBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.26, 14), shinyMat(0xcbd5e1));
    rimBarrel.rotation.x = Math.PI / 2;
    rimBarrel.name = 'rimBarrel';
    wGroup.add(rimBarrel);
    for (let s = 0; s < 5; s++) {
      const ang = (s / 5) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.34, 0.06), shinyMat(0x0ea5e9));
      spoke.name = `spoke${s + 1}`;
      spoke.position.set(Math.cos(ang) * 0.22, Math.sin(ang) * 0.22, 0.11);
      spoke.rotation.z = ang + Math.PI / 2;
      wGroup.add(spoke);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.32, 10), shinyMat(0x94a3b8));
    hub.rotation.x = Math.PI / 2;
    hub.name = 'hub';
    wGroup.add(hub);
    for (let n = 0; n < 5; n++) {
      const ang = (n / 5) * Math.PI * 2;
      const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.045, 6), shinyMat(0xfacc15));
      nut.rotation.x = Math.PI / 2;
      nut.name = `lugNut${n + 1}`;
      nut.position.set(Math.cos(ang) * 0.07, Math.sin(ang) * 0.07, 0.14);
      wGroup.add(nut);
    }

    wGroup.position.set(x, 0, z);
    parts.driveline.add(wGroup);
    parts.wheels.push(wGroup);

    // Brake disc + caliper (disc rotates with wheel; caliper steers on front)
    const disc = tagInspectable(
      new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.055, 14), steelMat(0xe2e8f0)),
      '制动盘 Brake Disc', '制动系统', '随车轮旋转的钢盘，刹车时卡钳夹住它，摩擦把动能变成热！'
    );
    disc.rotation.x = Math.PI / 2;
    disc.position.set(x, 0, z > 0 ? z - 0.28 : z + 0.28);
    parts.driveline.add(disc);
    parts.brakeDiscs.push(disc);

    const caliper = tagInspectable(
      new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26, 0.13), plainMat(0xdc2626, { metalness: 0.6, roughness: 0.4 })),
      '刹车卡钳 Brake Caliper', '制动系统', '红色卡钳像钳子一样夹住制动盘——这就是刹车的力量来源！'
    );
    caliper.position.set(x, 0.3, z > 0 ? z - 0.28 : z + 0.28);
    parts.driveline.add(caliper);
    parts.brakeCalipers.push(caliper);

    // MacPherson strut: damper rod + coil spring, body→wheel
    const strut = new THREE.Group();
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.8, 8), shinyMat(0xcbd5e1));
    rod.name = 'strutRod';
    rod.position.y = 0.4;
    strut.add(rod);
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 5, 8, Math.PI * 5), shinyMat(0xfacc15));
    coil.name = 'coilSpring';
    coil.position.y = 0.35;
    strut.add(coil);
    strut.position.set(x, 0.35, z > 0 ? z - 0.55 : z + 0.55);
    strut.rotation.x = (z > 0 ? -0.25 : 0.25);
    parts.driveline.add(strut);

    // Strut tower: cylinder housing + top plate that meets the body above
    // the wheel-arch rim (y≈1.18) — otherwise the strut top floats in the
    // arch void (user: 剩下这些零件怎么还是悬空的).
    const towerZ = z > 0 ? z - 0.55 : z + 0.55;
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.58, 8), plainMat(0x334155, { metalness: 0.7, roughness: 0.4 }));
    tower.name = `strutTower${z > 0 ? 'R' : 'L'}${x > 0 ? '_rear' : '_front'}`;
    tower.position.set(x, 1.01, towerZ);
    parts.driveline.add(tower);
    const towerPlate = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.05, 0.52), plainMat(0x334155, { metalness: 0.7, roughness: 0.4 }));
    towerPlate.name = 'strutMountPlate';
    towerPlate.position.set(x, 1.30, towerZ);
    parts.driveline.add(towerPlate);
  }

  // ═══════════ 14. 电动车三电 EV Battery & Motor ═══════════
  {
    const batteryPack = new THREE.Group();
    const batSlab = tagInspectable(
      new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.4, 3.4), glassMat(0x06b6d4, 0.35)),
      '电池包 EV Battery Pack', '三电系统', '底盘里几百个电芯串并联，输出高压直流电驱动电机。'
    );
    batteryPack.add(batSlab);
    for (let bx = -2.0; bx <= 2.0; bx += 2.0) {
      for (let bz = -1.0; bz <= 1.0; bz += 2.0) {
        const cell = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.32, 0.55), plainMat(0x0e7490, { metalness: 0.4, roughness: 0.4, transparent: true, opacity: 0.85 }));
        cell.position.set(bx, 0, bz);
        batteryPack.add(cell);
      }
    }
    batteryPack.position.set(0, -0.75, 0);
    parts.evParts.add(batteryPack);
    parts.batteryPack = batteryPack;

    const motorGroup = new THREE.Group();
    const stator = tagInspectable(
      new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.1, 14), steelMat(0x334155)),
      '电机定子 Motor Stator', '电驱动', '三相交流电在线圈里产生旋转磁场，拖着转子转。'
    );
    stator.rotation.z = Math.PI / 2;
    motorGroup.add(stator);
    const rotor = new THREE.Group();
    const rotorMesh = tagInspectable(
      new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.16, 12), shinyMat(0xe2e8f0)),
      '电机转子 Motor Rotor', '电驱动', '永磁转子被磁场推着高速旋转，一转就是最大扭矩！'
    );
    rotorMesh.rotation.z = Math.PI / 2;
    rotor.add(rotorMesh);
    motorGroup.add(rotor);
    motorGroup.position.set(-1.6, 0, 0);
    parts.evParts.add(motorGroup);
    parts.motorRotor = rotor;
  }

  // ═══════════ 15. 扭矩流粒子 ═══════════
  const particleMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.9 });
  const particleGeo = new THREE.SphereGeometry(0.09, 8, 6);
  for (let i = 0; i < 26; i++) {
    const p = new THREE.Mesh(particleGeo, particleMat);
    p.visible = false;
    scene.add(p);
    parts.torqueFlowParticles.push(p);
  }
  parts.particleMat = particleMat;

  return parts;

  // ── helpers ──
  // Radius-scaled tooth count with an explicit override for sprockets:
  // gearbox keeps the 12–24 rules; crank sprocket = 12, cam sprockets = 24.
  function toothCountForRadius(radius, override) {
    if (Number.isFinite(override)) return override;
    if (radius >= 0.45) return 24;
    if (Math.abs(radius - 0.18) <= 0.015 || Math.abs(radius - 0.225) <= 0.015) return 14;
    return Math.max(12, Math.min(24, Math.round(12 + (radius / 0.65) * 12)));
  }

  function buildToothedGear(radius, thickness, material, name, category, description, toothOverride) {
    const gear = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, thickness, 10), material);
    body.rotation.z = Math.PI / 2;
    if (name) tagInspectable(body, name, category, description);
    gear.add(body);

    const toothCount = toothCountForRadius(radius, toothOverride);
    for (let t = 0; t < toothCount; t++) {
      const ang = (t / toothCount) * Math.PI * 2;
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(thickness + 0.02, 0.045, 0.06), shinyMat(0xfbbf24));
      tooth.name = `tooth${t + 1}`;
      tooth.position.set(0, Math.cos(ang) * (radius + 0.012), Math.sin(ang) * (radius + 0.012));
      tooth.rotation.x = ang;
      gear.add(tooth);
    }
    gear.userData.toothCount = toothCount;
    return gear;
  }

  function buildUJoint(x, y, z, name) {
    const g = new THREE.Group();
    const cross = tagInspectable(
      new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.26), steelMat(0x475569)),
      name, '底盘传动', '十字轴万向节：传动轴角度变化时也能继续传扭矩。'
    );
    g.add(cross);
    for (const dir of [[0.22, 0, 0], [-0.22, 0, 0], [0, 0.22, 0], [0, -0.22, 0]]) {
      const yoke = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.16, 8), steelMat(0x94a3b8));
      yoke.position.set(...dir);
      g.add(yoke);
    }
    g.position.set(x, y, z);
    return g;
  }

  function buildDetailedDifferential(x, y, z) {
    const diffGroup = new THREE.Group();

    // Open case shell — smaller than the ring gear so the rim and the pinion
    // mesh stay visible (real ring gears bolt to the OUTSIDE of the case).
    const shell = tagInspectable(
      new THREE.Mesh(new THREE.SphereGeometry(0.48, 12, 6, 0, Math.PI * 1.55), glassMat(0xea580c, 0.13)),
      '差速器 Differential', '差速器', '转弯时左右轮走的路不一样长，差速器让外侧轮转快、内侧转慢！'
    );
    shell.rotation.y = -Math.PI / 2; // opening faces the pinion-mesh side
    diffGroup.add(shell);

    // ── Drive pinion: a REAL truncated cone (nose toward the prop shaft,
    // big end facing the ring) with 9 teeth riding the cone surface, leaning
    // along the slant like teeth cut into a bevel gear. Tooth tips (r 0.28
    // from the pinion axis, which sits 0.32 below the axle axis) land inside
    // the ring's rim-tooth band (0.465–0.635) → genuine interleaving.
    const PINION_R = 0.18;    // big-end radius
    const PINION_NOSE = 0.09; // small end (flange side)
    const PINION_X = -0.30;   // ahead of ring center
    const PINION_Y = -0.32;   // hypoid offset below ring center
    const pinionGearGroup = new THREE.Group();
    const pBase = new THREE.Mesh(
      new THREE.CylinderGeometry(PINION_NOSE, PINION_R, 0.40, 12),
      steelMat(0xf97316)
    );
    pBase.rotation.z = Math.PI / 2; // top(small nose) → −X: nose forward, big end faces ring
    pBase.name = 'pinionCone';
    pinionGearGroup.add(pBase);
    for (let t = 0; t < 9; t++) {
      const tAng = (t / 9) * Math.PI * 2;
      const holder = new THREE.Group();
      holder.position.set(0.10, Math.cos(tAng) * 0.215, Math.sin(tAng) * 0.215);
      holder.rotation.x = tAng; // local +Y → radial around the X axis
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.16, 0.105), shinyMat(0xfbbf24));
      tooth.name = `tooth${t + 1}`;
      tooth.rotation.z = -0.28; // lean along the cone slant toward the big end
      holder.add(tooth);
      pinionGearGroup.add(holder);
    }
    pinionGearGroup.position.set(PINION_X, PINION_Y, 0);
    diffGroup.add(pinionGearGroup);

    // Pinion flange at the nose — spins WITH the pinion (it is the companion
    // flange the prop-shaft yoke bolts to) and carries a white spin bar so
    // the pinion's rotation about the lengthwise axis is readable too.
    {
      const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.07, 10), steelMat(0x64748b));
      flange.position.set(-0.16, 0, 0);
      flange.rotation.z = Math.PI / 2;
      flange.name = 'pinionFlange';
      pinionGearGroup.add(flange);
      const flangeBar = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.19, 0.05), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      flangeBar.name = 'pinionSpinMark';
      flangeBar.position.set(-0.16, 0.055, 0);
      pinionGearGroup.add(flangeBar);
    }

    // ── Ring gear: vertical disc on the AXLE axis (Z), teeth radius 0.55.
    // Mesh point check: rim at x=−0.30 → y=−√(0.55²−0.30²)=−0.461 = the
    // pinion's lowest tooth reach (PINION_Y − PINION_R − tooth) → they touch.
    const ringGearGroup = new THREE.Group();
    const ringBase = tagInspectable(
      new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.09, 18), plainMat(0x075985, { metalness: 0.6, roughness: 0.35 })),
      '主减速器齿圈 Ring Gear', '差速器', '传动轴纵着转 → 小锥齿轮带动立着的大齿圈横着转：方向转90°，扭矩再放大！'
    );
    ringBase.rotation.x = Math.PI / 2;
    ringGearGroup.add(ringBase);
    // 18 rim teeth like a real crown/bevel ring gear: mounted around the
    // OUTER EDGE (radially outward), each flared 0.3 rad out of plane so
    // the crown reads even from a top-down view. The pinion's teeth pass
    // BETWEEN these (rim tooth band r∈[0.455, 0.645]; pinion tooth center
    // lands at r≈0.556 → interleaved, not side-by-side).
    for (let t = 0; t < 18; t++) {
      const tAng = (t / 18) * Math.PI * 2;
      const holder = new THREE.Group();
      holder.rotation.z = tAng; // local +X → radial in the XY plane
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.085, 0.085), shinyMat(0x22d3ee));
      tooth.name = `tooth${t + 1}`;
      tooth.position.x = 0.55; // rim
      tooth.rotation.x = 0.3; // crown flare
      holder.add(tooth);
      ringGearGroup.add(holder);
    }
    // Spin marks (user: 横向的怎么转动不清晰): 4 radial white bars on EACH
    // face of the disc (rear face offset half-pitch) — like clock hands, they
    // make the disc's rotation about the transverse axle axis readable from
    // ANY angle, even edge-on or face-on.
    const markMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (const face of [1, -1]) {
      for (let m = 0; m < 4; m++) {
        const holder = new THREE.Group();
        holder.rotation.z = (m / 4) * Math.PI * 2 + (face < 0 ? Math.PI / 4 : 0);
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.055, 0.016), markMat);
        bar.name = `ringSpinMark${face < 0 ? 'R' : 'F'}${m + 1}`;
        bar.position.set(0.32, 0, face * 0.055);
        holder.add(bar);
        ringGearGroup.add(holder);
      }
    }
    ringGearGroup.position.set(0, 0, 0);
    diffGroup.add(ringGearGroup);

    // Spider gear cross shaft + 4 bevel spiders, concentric with the ring
    const spiderGearsGroup = new THREE.Group();
    const cross1 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 8), steelMat(0x475569));
    const cross2 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 8), steelMat(0x475569));
    cross2.rotation.z = Math.PI / 2;
    spiderGearsGroup.add(cross1, cross2);
    for (let s = 0; s < 4; s++) {
      const sAng = (s / 4) * Math.PI * 2;
      const sGear = tagInspectable(
        new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.16, 8), shinyMat(0xfacc15)),
        `行星齿轮 Spider Gear ${s + 1}`, '差速器', '直行时只公转；转弯时一边自转，把速度"匀"给左右轮。'
      );
      sGear.position.set(Math.cos(sAng) * 0.19, Math.sin(sAng) * 0.19, 0);
      sGear.rotation.z = sAng - Math.PI / 2;
      spiderGearsGroup.add(sGear);
    }
    diffGroup.add(spiderGearsGroup);

    diffGroup.position.set(x, y, z);
    diffGroup.userData = { pinionGearGroup, ringGearGroup, spiderGearsGroup };
    return diffGroup;
  }
}
