/* ============================================================================
 * data.js — verified facts & educational copy (EN + 中文)
 * Sources (consulted 2026-09, official CERN references):
 *   https://home.cern/science/accelerators/large-hadron-collider
 *   https://home.cern/science/experiments/atlas
 *   https://atlas.cern/Discover/Detector            (+ Inner-Detector / Muon-Spectrometer /
 *        Calorimeter / Magnet-System / Trigger-DAQ sub-pages)
 * This is an educational fan visualization. Not affiliated with or endorsed by CERN.
 * ==========================================================================*/
window.APP = window.APP || {};

/* language: 'zh' | 'en' — defaults to 'zh', persisted in localStorage */
const savedLang = (typeof localStorage !== 'undefined' && localStorage.getItem('collider_lang'));
APP.lang = (savedLang === 'en' || savedLang === 'zh') ? savedLang : 'zh';
APP.L = () => (APP.lang === 'zh' ? APP.DATA.zh : APP.DATA);
APP.tr = (k) => {
  const e = APP.DATA.ui[k];
  return e ? (e[APP.lang] || e.en) : k;
};

APP.DATA = {
  about:
    'An interactive, simplified model inspired by CERN\u2019s LHC and the ATLAS detector. ' +
    'Geometry is schematic: proportions (especially the inner radii) are exaggerated so every layer stays readable. ' +
    'Collision kinematics come from REAL Standard Model processes (PDG masses, branching ratios; ATLAS Run 3 cross sections) \u2014 the detector response is still simulated schematically.',

  disclaimer: 'Real SM kinematics \u00B7 Simplified geometry \u00B7 Not an official CERN product',

  /* ---- detector systems (visibility switches, left panel) --------------- */
  systems: [
    { id:'muon',   name:'Muon Spectrometer', color:'#9fb4c9',
      real:'1,171 MDT chambers \u00B7 354,240 drift tubes \u00B7 TGC + CSC trigger chambers',
      blurb:'The outermost shell. Giant drift-tube chambers, arranged in barrel rings and two huge '
          + '\u201Cbig wheels\u201D at each end, re-measure muon tracks after the toroid magnets have bent them. '
          + 'Muons are the only charged particles energetic enough to cross every inner layer and reach it.',
      facts:['1,171 MDT chambers with 354,240 tubes (\u00D83 cm, 0.85\u20136.5 m long)',
             'Tube resolution: 80 \u03BCm',
             'Thin Gap Chambers (TGC) and Cathode Strip Chambers (CSC) provide fast triggering'] },
    { id:'toroid', name:'Toroid Magnets', color:'#d8b25c',
      real:'Barrel: 8 coils \u00B7 25.3 m long \u00B7 830 t \u00B7 End-caps: 8 coils each \u00B7 240 t each',
      blurb:'Three huge air-core toroids \u2014 one barrel + two end-caps \u2014 produce a field that wraps '
          + 'around the beam axis, bending muon tracks sideways so their momentum can be measured from the curvature. '
          + 'It is the largest toroidal magnet ever built.',
      facts:['Barrel toroid: 25.3 m long, 20.1 m outer diameter, 830 t, 8 coils',
             'Each end-cap toroid: 10.7 m diameter, 5.0 m thick, 240 t, 8 coils in a common cryostat',
             'Field up to ~3.5 T; 20.5 kA; cooled to 4.7 K'] },
    { id:'hadcal', name:'Hadronic Calorimeter', color:'#8b95a2',
      real:'Tile: 420,000 scintillator tiles \u00B7 2,900 t \u00B7 9,500 photomultipliers + LAr end-caps',
      blurb:'Steel absorber plates interleaved with plastic scintillator tiles stop hadrons (protons, neutrons, pions) '
          + 'and measure their energy from the light produced in the tiles. Copper/liquid-argon wheels do the same job '
          + 'in the forward direction. It is the heaviest part of ATLAS.',
      facts:['~420,000 plastic scintillating tiles (40 t) + steel absorbers \u2192 2,900 t total',
             'Central barrel: 64 wedges, 5.6 m long; two extended barrels: 64 wedges, 2.6 m',
             '9,500 photomultiplier tubes read the scintillation light'] },
    { id:'emcal',  name:'EM Calorimeter (LAr)', color:'#e0c07a',
      real:'Lead/liquid-argon accordion \u00B7 barrel 6.4 m long \u00B7 110,000 channels \u00B7 \u2212184 \u00B0C',
      blurb:'Lead absorber plates folded into ATLAS\u2019 signature accordion shape, cooled in a liquid-argon bath at '
          + '\u2212184 \u00B0C. Electrons and photons shower in the lead; the ionised argon between the plates is read out '
          + 'with no dead zones \u2014 no particle escapes unchallenged.',
      facts:['Accordion structure with lead absorbers, liquid argon sensor',
             'Barrel: 6.4 m long, 53 cm thick, 110,000 channels, held at \u2212184 \u00B0C',
             'End-caps add EM, hadronic and forward (FCAL) wheels'] },
    { id:'solenoid', name:'Central Solenoid', color:'#d8b25c',
      real:'2 T \u00B7 5.3 m long \u00B7 2.56 m \u00D8 \u00B7 5 t \u00B7 9 km NbTi wire',
      blurb:'A slender 2-tesla superconducting solenoid wrapped around the inner detector. Its nearly uniform field '
          + 'runs along the beam axis, bending charged-particle tracks so their momentum can be measured. '
          + 'Only 4.5 cm thick \u2014 engineered to barely disturb the particles it must measure.',
      facts:['2 T field, stored energy 38 MJ, 7.73 kA current',
             '5.3 m long, 2.56 m outer diameter, only 4.5 cm thick, ~5 t',
             '9 km of niobium-titanium superconductor in aluminium strips'] },
    { id:'trt',    name:'TRT \u2014 Transition Radiation Tracker', color:'#c9d2dc',
      real:'~300,000 straw tubes \u00B7 350,000 channels \u00B7 4 mm straws, 30 \u03BCm gold wire',
      blurb:'Hundreds of thousands of thin gas-filled straw tubes. Charged particles ionise the gas; a gold-plated '
          + 'wire in each straw picks up the signal. It also detects \u201Ctransition radiation\u201D \u2014 X-rays emitted '
          + 'mainly by electrons \u2014 helping to tell electrons from pions.',
      facts:['~300,000 straws: 50,000 in the barrel (144 cm long), 250,000 in the end-caps (39 cm)',
             '4 mm straw diameter with a 30 \u03BCm gold-plated tungsten wire',
             'Track precision 0.17 mm; volume 12 m\u00B3'] },
    { id:'sct',    name:'SCT \u2014 Semiconductor Tracker', color:'#7fd8e8',
      real:'4,088 modules \u00B7 6 M readout strips \u00B7 60 m\u00B2 silicon \u00B7 4 barrel layers + 18 disks',
      blurb:'Silicon micro-strips, 80 \u03BCm apart, in four barrel layers and eighteen end-cap disks. '
          + 'Each particle crosses at least four layers, letting ATLAS reconstruct tracks to ~25 \u03BCm \u2014 '
          + 'less than half the width of a human hair.',
      facts:['4,088 two-sided modules, > 6 million readout strips',
             '60 m\u00B2 of silicon \u2014 four cylindrical barrel layers, 18 planar end-cap disks',
             'Readout strips every 80 \u03BCm; precision up to 25 \u03BCm'] },
    { id:'pixel',  name:'Pixel Detector', color:'#6fe3c4',
      real:'~2,000 modules \u00B7 92 M pixels \u00B7 1.9 m\u00B2 \u00B7 3.3 cm from the beam',
      blurb:'The first point of detection, just 3.3 cm from the beam. Four barrel layers plus three disks per end-cap, '
          + 'with pixels smaller than a grain of sand, locate the origin of every particle to ~10 \u03BCm \u2014 '
          + 'vital for spotting displaced vertices from b-hadron decays.',
      facts:['92 million pixels across ~1,736 barrel + 288 end-cap modules',
             'Pixel size 50\u00D7400 \u03BCm\u00B2 (50\u00D7250 \u03BCm\u00B2 innermost layer)',
             'Silicon area ~1.9 m\u00B2; hit precision ~10 \u03BCm'] },
    { id:'pipe',   name:'Beam Pipe & Interaction Point', color:'#e8eaed',
      real:'Beams collide 25 ns apart \u00B7 1.5 billion collisions/s in ATLAS',
      blurb:'At the very centre, counter-rotating proton bunches cross every 25 nanoseconds at the interaction point. '
          + 'A slim beryllium-aluminium pipe keeps the ultra-high vacuum that carries the beams through the detector.',
      facts:['Bunches cross every 25 ns; up to ~1.5 billion collisions per second',
             'Collision energy 13.6 TeV (Run 3)',
             'Protons move at 99.999999% of light speed'] },
    { id:'support', name:'Support Structure & Feet', color:'#5c646e',
      real:'Detector: 46 m long \u00B7 25 m high \u00B7 25 m wide \u00B7 7,000 t',
      blurb:'The steel skeleton that carries 7,000 tonnes \u2014 about the weight of the Eiffel Tower \u2014 '
          + 'aligned to fractions of a millimetre, 100 m underground in a cavern at the LHC\u2019s Point 1.',
      facts:['ATLAS: 46 m long, 25 m high and wide, 7,000 tonnes',
             'Installed 100 m below ground near Meyrin, Switzerland',
             'Six subsystems arranged in concentric layers'] },
  ],

  /* ---- 6 unfold stages ---------------------------------------------------*/
  stages: [
    { key:'muon',  chip:'Muon wheels',
      title:'Stage 1 \u00B7 Muon Spectrometer',
      body:'We peel the detector from the outside in. First the giant end-cap \u201Cbig wheels\u201D \u2014 ~25 m of '
         + 'drift-tube chambers \u2014 slide along the beam axis, while the eight barrel muon sectors fan outward. '
         + 'Only muons ever reach this layer.',
      facts:['Outermost layer \u2014 measures muon momentum to ~10% at 1 TeV',
             'Barrel chambers sit inside the toroid field; wheels behind the end-cap toroids'] },
    { key:'toroid', chip:'Toroid magnets',
      title:'Stage 2 \u00B7 Toroid Magnet System',
      body:'Eight colossal D-shaped barrel coils (25.3 m long, 830 t in total) plus the two end-cap toroids pull apart, '
         + 'exposing the calorimeter cryostats they usually hide. Their field wraps around the beam axis \u2014 a '
         + '\u201Ctoroidal\u201D field \u2014 bending muons in the r\u2013z plane.',
      facts:['Largest toroidal magnet ever constructed',
             'Field up to ~3.5 T; stored energy 1.08 GJ in the barrel alone'] },
    { key:'calo',  chip:'Calorimeters',
      title:'Stage 3 \u00B7 Calorimeters',
      body:'The two barrel calorimeters split and slide apart: inside, the lead/liquid-argon EM accordion; outside, '
         + 'the 2,900-tonne steel-and-scintillator tile calorimeter. The forward liquid-argon wheels retreat along '
         + 'the beam pipe. Together they measure almost every particle\u2019s energy.',
      facts:['EM barrel: 6.4 m long, 110,000 channels at \u2212184 \u00B0C',
             'Tile calorimeter: 420,000 scintillator tiles, 2,900 t \u2014 the heaviest layer'] },
    { key:'solenoid', chip:'Solenoid',
      title:'Stage 4 \u00B7 Central Solenoid & Structure',
      body:'The slender 2 T superconducting solenoid opens along its seam. Just 4.5 cm thick and 5 t in mass, it sits '
         + 'inside the calorimeter bore and bends inner-detector tracks along the beam axis. Support feet and rails '
         + 'spread to reveal how the 7,000 t stack is carried.',
      facts:['9 km of NbTi superconductor; 38 MJ stored energy',
             'Field 2 T, nearly uniform inside the tracker volume'] },
    { key:'trackers', chip:'TRT + SCT',
      title:'Stage 5 \u00B7 Silicon Strips & Straw Tubes',
      body:'The tracker layers separate radially: the TRT\u2019s ~300,000 straw tubes fan out, the SCT\u2019s four silicon '
         + 'barrel layers spread apart and its eighteen end-cap disks glide away from the beam axis. This is where '
         + 'particle tracks are charted with up to 25 \u03BCm precision.',
      facts:['TRT: 350,000 channels; SCT: 4,088 modules, 6 M strips',
             'Each particle crosses \u2265 4 silicon layers'] },
    { key:'pixel', chip:'Pixel + beam pipe',
      title:'Stage 6 \u00B7 Pixel Detector & Interaction Point',
      body:'Finally the innermost layer: four pixel barrel layers and the end-cap disks drift outward, exposing the '
         + 'beam pipe and the interaction point, where proton bunches collide every 25 ns at 13.6 TeV. '
         + '92 million pixels watch the debris from 3.3 cm away.',
      facts:['92 M pixels, ~10 \u03BCm hit precision, 1.9 m\u00B2 silicon',
             'Beams cross every 25 ns \u2014 up to 1.5 billion collisions/s'] },
  ],

  overview: {
    title:'Assembled detector',
    body:'This is a simplified, layered model inspired by the ATLAS detector at CERN\u2019s LHC \u2014 46 m long, '
       + '25 m high, 7,000 tonnes, installed 100 m underground. Scroll to disassemble it in six stages, '
       + 'or use the playback controls. Toggle systems on the left; click a system to read about it.',
    facts:['Scroll = disassemble \u00B7 Space = play/pause \u00B7 R = reverse',
           'Proportions exaggerated for readability \u2014 geometry is schematic'] },

  /* ---- accelerator (ring) view ------------------------------------------*/
  ring: {
    title:'Large Hadron Collider \u2014 schematic',
    body:'Two counter-rotating proton beams share a 26,659 m ring of superconducting magnets 100 m underground. '
       + 'Four experiment halls sit at interaction points. Ring radius here is compressed roughly 60\u00D7 so the '
       + 'whole machine fits one screen \u2014 the real tunnel would dwarf the Eiffel Tower\u2019s footprint.',
    facts:['26,659 m circumference \u00B7 tunnel 100 m underground',
           '1,232 main dipole magnets + 392 main quadrupoles (9,593 magnets in total)',
           'Dipole field 8.33 T at 1.9 K (\u2212271.3 \u00B0C) \u2014 colder than outer space',
           '~2,500 bunches per beam \u00B7 1.6\u00D710\u00B9\u00B9 protons per bunch \u00B7 25 ns spacing',
           '6.8 TeV per beam \u2192 13.6 TeV collisions \u00B7 11,245 turns per second'],
    points:[
      { name:'ATLAS', pt:'Point 1', angle:0,    fact:'7,000 t general-purpose detector' },
      { name:'ALICE', pt:'Point 2', angle:90,   fact:'heavy-ion physics, quark\u2013gluon plasma' },
      { name:'RF cavities', pt:'Point 4', angle:135, small:true, fact:'8 cavities per beam re-boost energy each turn' },
      { name:'Beam dump', pt:'Point 6', angle:225, small:true, fact:'absorbs the full beam in 89 \u03BCs' },
      { name:'CMS',   pt:'Point 5', angle:180,  fact:'general-purpose, giant solenoid' },
      { name:'LHCb',  pt:'Point 8', angle:270,  fact:'b-hadron (beauty) physics' },
    ],
    flight:[
      { caption:'LHC \u2014 a 26,659 m ring of superconducting magnets, 100 m underground', at:0.00 },
      { caption:'Point 1 \u00B7 ATLAS \u2014 the 7,000-tonne general-purpose detector', at:0.16 },
      { caption:'Counter-rotating beams \u2014 ~2,500 bunches of 1.6\u00D710\u00B9\u00B9 protons each', at:0.34 },
      { caption:'1,232 dipole magnets steer the beams at 1.9 K \u2014 colder than outer space', at:0.50 },
      { caption:'Point 5 \u00B7 CMS and Point 2 \u00B7 ALICE share the ring with ATLAS', at:0.66 },
      { caption:'Point 4 RF cavities re-boost the beam every turn \u2014 11,245 turns per second', at:0.84 },
      { caption:'Collisions at 13.6 TeV \u2014 up to 1.5 billion per second in ATLAS & CMS', at:0.95 },
    ],
    legendBeamA:'Beam 1 \u2014 clockwise', legendBeamB:'Beam 2 \u2014 counter-clockwise' },

  /* ---- collision view ----------------------------------------------------*/
  collision: {
    title:'Real-process collision display',
    body:'A schematic cut-away of the detector showing events generated from REAL Standard Model processes \u2014 '
       + 'PDG masses and branching ratios, exact two-body decay kinematics, invariant-mass reconstruction. '
       + 'The detector response (resolutions, showers) is still simulated schematically.',
    facts:['Curvature is REAL: radius r = p\u209C/(0.3B) = p\u209C/6 metres in the 2 T solenoid \u2014 Z muons (45 GeV) barely bend',
           'Sprays of hadrons = \u201Cjets\u201D, shown as energy towers on the calorimeter skins',
           'Gold tracks reaching the outer rings are muons \u2014 they traverse the whole detector'],
    /* captions for the "clean" processes (no hadrons in the decay itself) */
    seqClean:{
      flight:'The decay products fly out from the interaction point \u2014 charged particles bend in the magnetic field; photons fly straight.',
      readout:'Watch where each one stops: electrons and photons are caught by the EM calorimeter \u2014 only muons punch through to the outermost layer.',
    },
    badge:'REAL DECAY KINEMATICS \u00B7 simplified detector response',

    /* per-process copy — keys match APP.PP.TYPES */
    processes:{
      qcd:{ chip:'QCD jets', sigma:'\u03C3 \u2248 80 mb (inelastic pp)',
        cap0:'Two partons slam together in a hard scatter \u2014 the most common proton\u2013proton process of all, happening billions of times per second.',
        capEnd:'A QCD multijet event. Inelastic pp collisions (\u03C3 \u2248 80 mb) occur ~1.6 billion times per second at peak luminosity.' },
      z_mumu:{ chip:'Z\u2192\u03BC\u207A\u03BC\u207B', sigma:'\u03C3\u00D7BR \u2248 2.0 nb',
        cap0:'A Z\u2070 boson (mass 91.188 GeV, PDG) is born and decays into two muons \u2014 note the two nearly straight gold tracks: 45 GeV of transverse momentum barely bends in a 2 T field.',
        capEnd:'Reconstructed m(\u03BC\u03BC) \u2248 91.2 GeV \u2014 exactly the Z mass. At peak luminosity Z\u2192\u03BC\u03BC happens about 40 times per second.' },
      z_ee:{ chip:'Z\u2192e\u207Ae\u207B', sigma:'\u03C3\u00D7BR \u2248 2.0 nb',
        cap0:'The Z\u2070 also decays into an electron pair (BR 3.363%) \u2014 watch the cyan tracks end in EM showers inside the calorimeter.',
        capEnd:'m(ee) \u2248 91.2 GeV. W and Z bosons were discovered at CERN in 1983 \u2014 today they are everyday tools.' },
      z_jj:{ chip:'Z\u2192qq\u0304', sigma:'\u03C3\u00D7BR \u2248 41 nb',
        cap0:'The Z\u2070 most often decays into a quark pair (BR 69%) \u2014 quarks immediately hadronize into two back-to-back jets.',
        capEnd:'Dijet mass \u2248 91.2 GeV (jet energy resolution is coarse, so the peak is wide). This channel is also a major background in Higgs searches.' },
      h_gamgam:{ chip:'H\u2192\u03B3\u03B3', sigma:'\u03C3\u00D7BR \u2248 0.14 pb',
        cap0:'A Higgs boson (\u2248125.2 GeV) decays into two photons \u2014 branching ratio just 0.227%. White dashed lines are photons: neutral, so the magnetic field cannot bend them.',
        capEnd:'m(\u03B3\u03B3) \u2248 125.2 GeV! On 4 July 2012 ATLAS and CMS announced the Higgs discovery (5\u03C3) using exactly this \u03B3\u03B3 peak plus the 4-lepton channel. At peak luminosity one H\u2192\u03B3\u03B3 is produced only every ~6 minutes.' },
      h_zz4l:{ chip:'H\u2192ZZ*\u21924\u2113', sigma:'\u03C3\u00D7BR \u2248 0.007 pb',
        cap0:'The \u201Cgolden channel\u201D: Higgs \u2192 Z + Z* (one Z forced off its mass shell, since 125 < 2\u00D791) \u2192 then into 2 electrons + 2 muons. Branching ratio only \u22480.012%.',
        capEnd:'m(4\u2113) \u2248 125.2 GeV \u2014 the clean four-lepton peak is the ruler of the Higgs mass. At peak luminosity only ~one per 2 hours is produced.' },
      ttbar:{ chip:'tt\u0304\u2192\u2113+jets', sigma:'\u03C3 \u2248 0.9 nb',
        cap0:'A top-quark pair (\u2248172.7 GeV each \u2014 the heaviest known elementary particle) is produced and decays instantly: t\u2192Wb. One W goes to \u2113\u03BD, the other to qq\u0304.',
        capEnd:'Final state: 1 lepton track + \u22654 jets (2 of them b-jets) + missing transverse momentum from the neutrino (white dashed = the REAL invisible-pT vector sum). About 18 tt\u0304 pairs per second at peak luminosity.' },
    },
    /* the step-by-step sequence played on every trigger */
    seq:[
      { phase:'approach', cap:'Two protons race toward each other along the beam pipe at almost the speed of light\u2026' },
      { phase:'impact',   cap:'IMPACT! All their energy concentrates at one point \u2014 and becomes new particles (E = mc\u00B2).' },
      { phase:'flight',   cap:'Everything flies out at near light-speed. In the magnetic field, charged particles curve \u2014 watch each one stop where its energy runs out.' },
      { phase:'readout',  cap:'Where a particle stops, a tower lights up: electrons die in the EM calorimeter, hadrons in the steel one \u2014 only muons punch through everything.' },
      { phase:'done',     cap:'Event measured.' },
    ] },

  credits: [
    { t:'CERN \u2014 The Large Hadron Collider', u:'https://home.cern/science/accelerators/large-hadron-collider' },
    { t:'CERN \u2014 ATLAS experiment', u:'https://home.cern/science/experiments/atlas' },
    { t:'ATLAS \u2014 Detector & Technology', u:'https://atlas.cern/Discover/Detector' },
    { t:'ATLAS \u2014 Inner Detector', u:'https://atlas.cern/Discover/Detector/Inner-Detector' },
    { t:'ATLAS \u2014 Calorimeter', u:'https://atlas.cern/Discover/Detector/Calorimeter' },
    { t:'ATLAS \u2014 Magnet System', u:'https://atlas.cern/Discover/Detector/Magnet-System' },
    { t:'ATLAS \u2014 Muon Spectrometer', u:'https://atlas.cern/Discover/Detector/Muon-Spectrometer' },
    { t:'ATLAS \u2014 Trigger & DAQ', u:'https://atlas.cern/Discover/Detector/Trigger-DAQ' },
    { t:'ATLAS \u2014 Higgs at 13.6 TeV (Run 3 brief)', u:'https://atlas.cern/Updates/Briefing/Run3-Higgs' },
    { t:'PDG \u2014 Particle Data Group (masses, widths, BRs)', u:'https://pdg.lbl.gov/' },
  ],

  triggerNote:'Trigger & DAQ (real ATLAS): L1 hardware decides in < 2.5 \u03BCs; the software farm '
    + '(~40,000 CPU cores) narrows up to 100,000 accepted events/s down to ~1,000 recorded/s. '
    + 'Here, every event is shown \u2014 a luxury no physicist has.'};

/* ======================= 中文（简体）镜像文案 =============================
 * 结构与英文树完全一致 — APP.L() 按当前语言返回对应树。
 * ==========================================================================*/
APP.DATA.zh = {
  about:'这是一个受 CERN 大型强子对撞机（LHC）与 ATLAS 探测器启发的交互式简化模型。'
      + '几何为示意性质：比例（尤其是内层半径）经过夸大，以便每一层都清晰可读。'
      + '对撞运动学来自真实的标准模型过程（PDG 质量、分支比；ATLAS Run 3 截面）—— 探测器响应仍为简化模拟。',
  disclaimer:'真实标准模型运动学 · 简化几何 · 非官方 CERN 产品',

  systems:[
    { id:'muon',   name:'缪子谱仪', color:'#9fb4c9',
      real:'1,171 个 MDT 腔室 · 354,240 根漂移管 · TGC + CSC 触发腔室',
      blurb:'最外层的壳体。巨大的漂移管腔室排成桶部环带，加上两端两个\u201C大轮\u201D，'
          + '在环形磁铁弯折缪子径迹之后重新测量它们。缪子是唯一有能力穿越所有内层、'
          + '抵达这里的带电粒子。',
      facts:['1,171 个 MDT 腔室，共 354,240 根漂移管（直径 3 cm，长 0.85\u20136.5 m）',
             '漂移管分辨率：80 \u03BCm',
             '薄隙室（TGC）与阴极条室（CSC）提供快速触发'] },
    { id:'toroid', name:'环形磁铁', color:'#d8b25c',
      real:'桶部：8 个线圈 · 长 25.3 m · 830 吨 · 端盖：各 8 个线圈 · 各 240 吨',
      blurb:'三个巨大的空气芯环形磁铁 —— 一个桶部 + 两个端盖 —— 产生环绕束流轴的磁场，'
          + '把缪子径迹向侧面弯折，从而通过弯曲程度测出动量。'
          + '这是迄今建成的最大环形磁铁系统。',
      facts:['桶部环形磁铁：长 25.3 m，外径 20.1 m，重 830 吨，8 个线圈',
             '每个端盖环形磁铁：直径 10.7 m，厚 5.0 m，重 240 吨，8 个线圈共用低温恒温器',
             '磁场最高约 3.5 T；电流 20.5 kA；冷却至 4.7 K'] },
    { id:'hadcal', name:'强子量能器', color:'#8b95a2',
      real:'Tile：420,000 片闪烁体 · 2,900 吨 · 9,500 支光电倍增管 + LAr 端盖',
      blurb:'钢板吸收体与塑料闪烁体 tiles 交错叠放，把强子（质子、中子、π 介子）停下来，'
          + '通过 tiles 产生的荧光测量能量。前向则由铜/液氩轮完成同样的工作。'
          + '它是 ATLAS 最重的部分。',
      facts:['约 420,000 片塑料闪烁 tile（40 吨）+ 钢吸收体 → 总重 2,900 吨',
             '中心桶部：64 个楔形块，长 5.6 m；两个加长桶部：各 64 个楔形块，长 2.6 m',
             '9,500 支光电倍增管读出闪烁光'] },
    { id:'emcal',  name:'电磁量能器（LAr）', color:'#e0c07a',
      real:'铅/液氩手风琴结构 · 桶部长 6.4 m · 110,000 通道 · \u2212184 \u00B0C',
      blurb:'铅吸收板折叠成 ATLAS 标志性的手风琴形状，浸在 \u2212184 \u00B0C 的液氩浴中。'
          + '电子和光子在铅中簇射；板间被电离的液氩被完整读出，没有死角 —— '
          + '没有粒子能逃过它的测量。',
      facts:['手风琴结构：铅吸收体 + 液氩探测介质',
             '桶部：长 6.4 m，厚 53 cm，110,000 通道，保持 \u2212184 \u00B0C',
             '端盖还有电磁、强子与前向（FCAL）轮'] },
    { id:'solenoid', name:'中心螺线管', color:'#d8b25c',
      real:'2 T · 长 5.3 m · 直径 2.56 m · 5 吨 · 9 km NbTi 线材',
      blurb:'一根细长的 2 特斯拉超导螺线管，包裹在内探测器外侧。它沿束流轴产生近乎均匀的磁场，'
          + '使带电粒子的径迹发生弯曲，从而测量动量。它只有 4.5 cm 厚 —— '
          + '刻意设计得几乎不干扰它要测量的粒子。',
      facts:['磁场 2 T，储能 38 MJ，电流 7.73 kA',
             '长 5.3 m，外径 2.56 m，仅厚 4.5 cm，重约 5 吨',
             '9 km 铌钛超导线材镶嵌在铝带中'] },
    { id:'trt',    name:'TRT — 转换辐射径迹器', color:'#c9d2dc',
      real:'约 300,000 根 straw 管 · 350,000 通道 · 4 mm 管 + 30 \u03BCm 金丝',
      blurb:'数十万根细长的充气 straw 管。带电粒子电离管内气体，每根管中央的镀金丝接收信号。'
          + '它还能探测\u201C转换辐射\u201D —— 主要由电子发出的 X 射线 —— '
          + '帮助区分电子和 π 介子。',
      facts:['约 300,000 根 straw：桶部 50,000 根（长 144 cm），端盖 250,000 根（长 39 cm）',
             'straw 直径 4 mm，中央是 30 \u03BCm 镀金钨丝',
             '径迹精度 0.17 mm；体积 12 m\u00B3'] },
    { id:'sct',    name:'SCT — 半导体径迹器', color:'#7fd8e8',
      real:'4,088 个模块 · 600 万条读出条 · 60 m\u00B2 硅 · 4 层桶部 + 18 个端盘',
      blurb:'间距 80 \u03BCm 的硅微条，排成四层桶部与十八个端盖圆盘。'
          + '每个粒子至少穿过四层，使 ATLAS 能以约 25 \u03BCm 的精度重建径迹 —— '
          + '不到头发丝直径的一半。',
      facts:['4,088 个双面模块，超过 600 万条读出条',
             '60 m\u00B2 硅面积 —— 四层圆柱桶部 + 18 片端盖圆盘',
             '读出条间距 80 \u03BCm；精度最高 25 \u03BCm'] },
    { id:'pixel',  name:'像素探测器', color:'#6fe3c4',
      real:'约 2,000 个模块 · 9,200 万像素 · 1.9 m\u00B2 · 距束流 3.3 cm',
      blurb:'第一探测点，距束流仅 3.3 cm。四层桶部 + 每侧三片端盘，'
          + '像素比沙粒还小，把每个粒子的起点定位到约 10 \u03BCm —— '
          + '这对发现 b 强子衰变的位移顶点至关重要。',
      facts:['9,200 万像素，约 1,736 个桶部 + 288 个端盖模块',
             '像素尺寸 50\u00D7400 \u03BCm\u00B2（最内层 50\u00D7250 \u03BCm\u00B2）',
             '硅面积约 1.9 m\u00B2；命中精度约 10 \u03BCm'] },
    { id:'pipe',   name:'束流管与对撞点', color:'#e8eaed',
      real:'束团每 25 ns 对撞一次 · ATLAS 中每秒约 15 亿次对撞',
      blurb:'在最中心，反向旋转的质子束团每 25 纳秒在对撞点交汇一次。'
          + '细长的铍-铝束流管维持超高真空，载着束流穿过探测器。',
      facts:['束团每 25 ns 交汇一次；每秒最多约 15 亿次对撞',
             '对撞能量 13.6 TeV（Run 3）',
             '质子以 99.999999% 光速运动'] },
    { id:'support', name:'支撑结构与底座', color:'#5c646e',
      real:'探测器：长 46 m · 高 25 m · 宽 25 m · 7,000 吨',
      blurb:'承载 7,000 吨重量的钢骨架 —— 差不多等于一座埃菲尔铁塔 —— '
          + '在 LHC 1 号点地下 100 m 的洞室里，以不到一毫米的误差精确对齐。',
      facts:['ATLAS：长 46 m，高宽各 25 m，重 7,000 吨',
             '安装在瑞士梅兰附近地下 100 m 处',
             '六个子系统按同心层排列'] },
  ],

  stages:[
    { key:'muon',  chip:'缪子大轮',
      title:'第 1 阶段 · 缪子谱仪',
      body:'我们从外向内\u201C剥开\u201D探测器。首先是巨大的端盖\u201C大轮\u201D —— 约 25 m 的'
         + '漂移管腔室 —— 沿束流轴滑出，八个桶部缪子扇区向外展开。'
         + '只有缪子能到达这一层。',
      facts:['最外层 —— 在 1 TeV 处把缪子动量测到约 10% 精度',
             '桶部腔室位于环形磁场内；大轮在端盖环形磁铁之后'] },
    { key:'toroid', chip:'环形磁铁',
      title:'第 2 阶段 · 环形磁铁系统',
      body:'八个巨大的 D 形桶部线圈（总长 25.3 m，重 830 吨）与两个端盖环形磁铁分开，'
         + '露出它们通常遮住的量能器低温恒温器。磁场环绕束流轴 —— '
         + '这就是\u201C环形（toroidal）\u201D磁场，在 r\u2013z 平面弯折缪子。',
      facts:['迄今建成的最大环形磁铁',
             '磁场最高约 3.5 T；仅桶部储能就达 1.08 GJ'] },
    { key:'calo',  chip:'量能器',
      title:'第 3 阶段 · 量能器',
      body:'两个桶部量能器分开滑出：内侧是铅/液氩电磁手风琴，外侧是 2,900 吨的'
         + '钢-闪烁体 Tile 量能器。前向液氩轮沿束流管退后。'
         + '它们共同测量几乎所有粒子的能量。',
      facts:['电磁桶部：长 6.4 m，110,000 通道，\u2212184 \u00B0C',
             'Tile 量能器：420,000 片闪烁 tile，2,900 吨 —— 最重的一层'] },
    { key:'solenoid', chip:'螺线管',
      title:'第 4 阶段 · 中心螺线管与支撑结构',
      body:'细长的 2 T 超导螺线管沿接缝打开。它只有 4.5 cm 厚、5 吨重，'
         + '坐在量能器内孔中，沿束流轴弯折内探测器径迹。支撑底座与导轨展开，'
         + '展示 7,000 吨塔是如何被托起的。',
      facts:['9 km NbTi 超导线；储能 38 MJ',
             '磁场 2 T，在径迹器体积内近乎均匀'] },
    { key:'trackers', chip:'TRT + SCT',
      title:'第 5 阶段 · 硅微条与 straw 管',
      body:'径迹器各层沿径向分开：TRT 的约 300,000 根 straw 管呈扇形展开，'
         + 'SCT 的四层硅桶部拉开，十八片端盖圆盘滑离束流轴。'
         + '粒子径迹就是在这里以最高 25 \u03BCm 的精度被描绘出来的。',
      facts:['TRT：350,000 通道；SCT：4,088 模块，600 万读出条',
             '每个粒子至少穿过 4 层硅'] },
    { key:'pixel', chip:'像素 + 束流管',
      title:'第 6 阶段 · 像素探测器与对撞点',
      body:'最后是最内层：四层像素桶部与端盘向外漂移，露出束流管和对撞点 —— '
         + '质子束团在这里每 25 ns 以 13.6 TeV 对撞一次。'
         + '9,200 万个像素在 3.3 cm 外注视着这些\u201C碎片\u201D。',
      facts:['9,200 万像素，约 10 \u03BCm 命中精度，1.9 m\u00B2 硅',
             '束团每 25 ns 交汇 —— 每秒最多 15 亿次对撞'] },
  ],

  overview:{
    title:'组装完成的探测器',
    body:'这是受 CERN LHC 的 ATLAS 探测器启发的简化分层模型 —— 长 46 m，高 25 m，'
       + '重 7,000 吨，安装在地下 100 m。滚动滚轮可分六个阶段拆解，或使用播放控制。'
       + '左侧开关控制各系统；点击系统名称可以聚焦并阅读介绍。',
    facts:['滚轮 = 拆解 · 空格 = 播放/暂停 · R = 反向',
           '比例为可读性做了夸大 —— 几何为示意性质'] },

  ring:{
    title:'大型强子对撞机 — 示意图',
    body:'两束反向旋转的质子束共用一条 26,659 m 的超导磁铁环，位于地下 100 m。'
       + '四个实验大厅坐落在对撞点上。此图把环半径压缩了约 60 倍，'
       + '让整台机器装进一块屏幕 —— 真实隧道的占地面积将远超埃菲尔铁塔。',
    facts:['周长 26,659 m · 隧道位于地下 100 m',
           '1,232 块主二极磁铁 + 392 块主四极磁铁（共 9,593 块磁铁）',
           '二极磁铁磁场 8.33 T，运行在 1.9 K（\u2212271.3 \u00B0C）—— 比外太空还冷',
           '每束约 2,500 个束团 · 每束团 1.6\u00D710\u00B9\u00B9 个质子 · 间隔 25 ns',
           '每束 6.8 TeV → 对撞能量 13.6 TeV · 每秒转 11,245 圈'],
    points:[
      { name:'ATLAS', pt:'1 号点', angle:0,    fact:'7,000 吨通用型探测器' },
      { name:'ALICE', pt:'2 号点', angle:90,   fact:'重离子物理，夸克-胶子等离子体' },
      { name:'射频腔', pt:'4 号点', angle:135, small:true, fact:'每束 8 个腔体，每圈为束流补充能量' },
      { name:'束流垃圾站', pt:'6 号点', angle:225, small:true, fact:'在 89 \u03BCs 内吸收整条束流' },
      { name:'CMS',   pt:'5 号点', angle:180,  fact:'通用型，巨型螺线管' },
      { name:'LHCb',  pt:'8 号点', angle:270,  fact:'b 强子（底夸克）物理' },
    ],
    flight:[
      { caption:'LHC —— 26,659 m 的超导磁铁环，位于地下 100 m', at:0.00 },
      { caption:'1 号点 · ATLAS —— 7,000 吨通用型探测器', at:0.16 },
      { caption:'反向旋转的束流 —— 每束约 2,500 个束团，每团 1.6\u00D710\u00B9\u00B9 个质子', at:0.34 },
      { caption:'1,232 块二极磁铁在 1.9 K 下引导束流 —— 比外太空还冷', at:0.50 },
      { caption:'5 号点 · CMS 与 2 号点 · ALICE 与 ATLAS 共用这条环', at:0.66 },
      { caption:'4 号点射频腔每圈为束流补充能量 —— 每秒转 11,245 圈', at:0.84 },
      { caption:'13.6 TeV 对撞 —— ATLAS 与 CMS 中每秒最多 15 亿次', at:0.95 },
    ],
    legendBeamA:'束流 1 —— 顺时针', legendBeamB:'束流 2 —— 逆时针' },

  collision:{
    title:'真实过程对撞显示',
    body:'探测器的示意剖面图，展示由真实标准模型过程生成的事件 —— '
       + 'PDG 质量与分支比、精确两体衰变运动学、不变质量重建。'
       + '探测器响应（分辨率、簇射）仍为简化模拟。',
    facts:['曲率是真实的：2 T 螺线管中半径 r = p\u209C/(0.3B) = p\u209C/6 米 —— Z 缪子（45 GeV）几乎不弯',
           '强子喷雾 = \u201C喷注（jet）\u201D，显示为量能器表皮上的能量塔',
           '到达外环的金色径迹是缪子 —— 它们贯穿整个探测器'],
    seqClean:{
      flight:'衰变产物从对撞点飞出 —— 磁场中带电粒子转弯，光子沿直线飞行。',
      readout:'看它们停在哪一层：电子和光子被电磁量能器截住 —— 只有缪子一路穿透到最外层。',
    },
    badge:'真实衰变运动学 · 简化探测器响应',

    processes:{
      qcd:{ chip:'QCD 喷注', sigma:'σ ≈ 80 mb（非弹性 pp）',
        cap0:'两个部分子发生硬散射 —— 这是质子对撞中最常见的过程，峰值亮度下每秒发生约 16 亿次。',
        capEnd:'QCD 多喷注事件。非弹性 pp 对撞截面约 80 mb —— 峰值亮度下每秒约 16 亿次。' },
      z_mumu:{ chip:'Z→μ⁺μ⁻', sigma:'σ×BR ≈ 2.0 nb',
        cap0:'一个 Z⁰ 玻色子（质量 91.188 GeV，PDG）诞生并衰变成一对缪子 —— 注意两条近乎笔直的金色径迹：45 GeV 的横动量在 2 T 磁场里几乎弯不动。',
        capEnd:'重建的 m(μμ) ≈ 91.2 GeV —— 正是 Z 玻色子的质量。峰值亮度下 Z→μμ 每秒约发生 40 次。' },
      z_ee:{ chip:'Z→e⁺e⁻', sigma:'σ×BR ≈ 2.0 nb',
        cap0:'Z⁰ 也能衰变成一对电子（分支比 3.363%）—— 注意青色径迹在量能器里终点处的电磁簇射。',
        capEnd:'m(ee) ≈ 91.2 GeV。W 与 Z 玻色子 1983 年就在 CERN 被发现 —— 如今已是物理学家手里的日常工具。' },
      z_jj:{ chip:'Z→qq̄', sigma:'σ×BR ≈ 41 nb',
        cap0:'Z⁰ 最常衰变成一对夸克（分支比 69%）—— 夸克立即强子化，喷出两道背对背的喷注。',
        capEnd:'双喷注质量 ≈ 91.2 GeV（喷注能量分辨率较粗，所以峰更宽）。它也是希格斯搜索的主要背景之一。' },
      h_gamgam:{ chip:'H→γγ', sigma:'σ×BR ≈ 0.14 pb',
        cap0:'希格斯玻色子（≈125.2 GeV）衰变成两个光子 —— 分支比只有 0.227%。白色虚线是光子：不带电，磁场弯不动它。',
        capEnd:'m(γγ) ≈ 125.2 GeV！2012 年 7 月 4 日，ATLAS 与 CMS 正是用这条 γγ 峰加上 4 轻子通道以 5σ 宣布发现希格斯。峰值亮度下每约 6 分钟才产生一个 H→γγ。' },
      h_zz4l:{ chip:'H→ZZ*→4ℓ', sigma:'σ×BR ≈ 0.007 pb',
        cap0:'“黄金通道”：希格斯 → Z + Z*（一个 Z 被迫偏离质量壳，因为 125 < 2×91）→ 再衰变成 2e2μ。分支比仅约 0.012%。',
        capEnd:'m(4ℓ) ≈ 125.2 GeV —— 干净的 4 轻子峰是测量希格斯质量的“标尺”。峰值亮度下每约 2 小时才产生一个。' },
      ttbar:{ chip:'tt̄→ℓ+喷注', sigma:'σ ≈ 0.9 nb',
        cap0:'一对顶夸克（各 ≈172.7 GeV —— 已知最重的基本粒子）产生后立即衰变：t→Wb。一个 W→ℓν，另一个 W→qq̄。',
        capEnd:'最终态：1 条轻子径迹 + ≥4 道喷注（其中 2 道 b 喷注）+ 中微子造成的丢失横动量（白虚线 = 真实的不可见粒子横动量矢量和）。峰值亮度下每秒约产生 18 对 tt̄。' },
    },
    seq:[
      { phase:'approach', cap:'两个质子以接近光速沿束流管相向飞来\u2026\u2026' },
      { phase:'impact',   cap:'对撞！全部能量集中在一点 —— 并转化为新的粒子（E = mc\u00B2）。' },
      { phase:'flight',   cap:'所有产物以接近光速飞出 —— 磁场中带电粒子转弯；看每一颗粒子在哪里耗尽能量、停下脚步。' },
      { phase:'readout',  cap:'粒子停在哪一层，哪一层就亮起能量塔：电子停在电磁量能器，强子穿进钢-闪烁体量能器 —— 只有缪子能一路穿透到底。' },
      { phase:'done',     cap:'事件测量完成。' },
    ] },

  credits:[
    { t:'CERN — 大型强子对撞机（英文）', u:'https://home.cern/science/accelerators/large-hadron-collider' },
    { t:'CERN — ATLAS 实验（英文）', u:'https://home.cern/science/experiments/atlas' },
    { t:'ATLAS — 探测器与技术（英文）', u:'https://atlas.cern/Discover/Detector' },
    { t:'ATLAS — 内探测器（英文）', u:'https://atlas.cern/Discover/Detector/Inner-Detector' },
    { t:'ATLAS — 量能器（英文）', u:'https://atlas.cern/Discover/Detector/Calorimeter' },
    { t:'ATLAS — 磁铁系统（英文）', u:'https://atlas.cern/Discover/Detector/Magnet-System' },
    { t:'ATLAS — 缪子谱仪（英文）', u:'https://atlas.cern/Discover/Detector/Muon-Spectrometer' },
    { t:'ATLAS — 触发与数据采集（英文）', u:'https://atlas.cern/Discover/Detector/Trigger-DAQ' },
    { t:'ATLAS — 13.6 TeV 希格斯测量（Run 3 简报，英文）', u:'https://atlas.cern/Updates/Briefing/Run3-Higgs' },
    { t:'PDG — 粒子数据组（质量、宽度、分支比，英文）', u:'https://pdg.lbl.gov/' },
  ],

  triggerNote:'触发与数据采集（真实 ATLAS）：一级硬件触发在 2.5 \u03BCs 内做出判断；'
    + '软件农场（约 40,000 个 CPU 核心）把每秒最多 100,000 个候选事件筛选到每秒约 1,000 个记录在案。'
    + '而在这里，每个事件都会被展示 —— 物理学家可没这待遇。'};

/* ======================= UI chrome strings ===============================
 * Static interface labels, keyed for APP.tr().
 * ==========================================================================*/
APP.DATA.ui = {
  'brand.title':     { en:'COLLIDER EXPLORER', zh:'粒子对撞机探秘' },
  'tab.detector':    { en:'Detector',    zh:'探测器' },
  'tab.ring':        { en:'Accelerator', zh:'加速器' },
  'tab.collision':   { en:'Collisions',  zh:'对撞' },
  'brand.sub':       { en:'LHC · ATLAS-inspired — educational', zh:'LHC · ATLAS 灵感 — 科普可视化' },
  'panel.systems':   { en:'Detector systems', zh:'探测器系统' },
  'panel.note':      { en:'Counts = parts rendered in this simplified model — hover a row for the real CERN figures. Click a system name to focus the camera and read about it.',
                       zh:'数字 = 此简化模型渲染的部件数 —— 悬停一行可查看真实 CERN 数据。点击系统名称可聚焦相机并阅读介绍。' },
  'panel.edu':       { en:'Education', zh:'科普专栏' },
  'btn.all':         { en:'All', zh:'全选' },
  'btn.solo':        { en:'Solo core', zh:'只看芯部' },
  'btn.assemble':    { en:'Assemble', zh:'复原' },
  'btn.cutaway':     { en:'✂️ Cutaway', zh:'✂️ 剖切视图' },
  'btn.flight':      { en:'\u25B6\u00A0 Camera flight around the ring', zh:'\u25B6\u00A0 环形加速器镜头巡礼' },
  'btn.trigger':     { en:'Trigger event', zh:'触发对撞事件' },
  'btn.close':       { en:'Close \u2715', zh:'关闭 \u2715' },
  'beamspeed':       { en:'Beam speed', zh:'束流速度' },
  'hint.ring':       { en:'drag to orbit · wheel to zoom · F to fly', zh:'拖拽旋转 · 滚轮缩放 · F 键巡礼' },
  'autorenew':       { en:'auto-renew', zh:'自动刷新' },
  'ev.event':        { en:'event', zh:'事件' },
  'ev.tracks':       { en:'tracks', zh:'径迹' },
  'ev.jets':         { en:'jets', zh:'喷注' },
  'ev.muons':        { en:'muons', zh:'\u03BC 子' },
  'ev.rate':         { en:'Rate at peak lumi.', zh:'峰值亮度产率' },
  'coll.pause':      { en:'\u23F8 Pause', zh:'\u23F8 暂停' },
  'coll.speed':      { en:'Speed', zh:'速度' },
  'coll.play':       { en:'\u25B6 Play', zh:'\u25B6 播放' },
  'ph.approach':     { en:'Approach', zh:'入场' },
  'ph.impact':       { en:'Impact', zh:'对撞' },
  'ph.flight':       { en:'Flight', zh:'飞行' },
  'ph.readout':      { en:'Readout', zh:'读出' },
  'ph.done':         { en:'Reconstruct', zh:'重建' },
  'story.title':     { en:'Event story \u2014 what happened', zh:'事件故事 —— 每一步发生了什么' },
  'ph.hint':         { en:'Click a phase to jump \u00B7 Space pause \u00B7 \u2190/\u2192 step',
                       zh:'点击相位跳转 · 空格暂停 · \u2190/\u2192 单步' },
  'badge':           { en:'REAL DECAY KINEMATICS \u00B7 SIMPLIFIED DETECTOR RESPONSE', zh:'真实衰变运动学 —— 简化探测器响应' },
  'legend.ring':     { en:'Counter-rotating beams', zh:'反向旋转的质子束' },
  'legend.collision':{ en:'Event legend', zh:'事件图例' },
  'leg.hadron':      { en:'charged hadron track', zh:'带电强子径迹' },
  'leg.em':          { en:'electron / EM tower', zh:'电子 / 电磁塔' },
  'leg.muon':        { en:'muon (reaches outer layers)', zh:'\u03BC 子（到达外层）' },
  'leg.jet':         { en:'jet energy towers', zh:'喷注能量塔' },
  'leg.met':         { en:'missing E\u209C (vector sum)', zh:'丢失横向能量 E\u209C（矢量和）' },
  'leg.note':        { en:'Schematic — ring radius compressed \u224860\u00D7; magnet boxes represent clusters of the 1,232 real dipoles.',
                       zh:'示意图 —— 环半径压缩约 60 倍；磁铁方块代表 1,232 块真实二极磁铁的集群。' },
  'stage.assembled': { en:'Assembled', zh:'完整组装' },
  'stage.fmt':       { en:'Stage {n} / 6 \u2014 {chip}', zh:'第 {n} / 6 阶段 — {chip}' },
  'stats.parts':     { en:' parts', zh:' 个部件' },
  'help.about':      { en:'About', zh:'关于' },
  'help.controls':   { en:'Controls', zh:'操作' },
  'help.refs':       { en:'Official CERN references', zh:'CERN 官方参考资料' },
  'help.foot':       { en:'Educational visualization by an independent author — not affiliated with or endorsed by CERN. Geometry is simplified (proportions exaggerated for readability; ring radius compressed \u224860\u00D7). Collision kinematics use real Standard Model values (PDG masses & branching ratios, ATLAS Run 3 cross sections — verified 2026-09); detector response is schematic. Facts sourced from home.cern, atlas.cern and PDG (2026). Rendering: Three.js r158 (MIT). Local, offline, no tracking.',
                       zh:'由独立作者制作的科普可视化 —— 与 CERN 无关，亦未获其认可。几何经过简化（比例为可读性而夸大；环半径压缩约 60 倍）。对撞运动学采用真实标准模型数值（PDG 质量与分支比、ATLAS Run 3 截面 —— 2026-09 核实）；探测器响应为示意模拟。事实来源：home.cern、atlas.cern 与 PDG（2026）。渲染：Three.js r158（MIT）。本地离线运行，无追踪。' },
  'ctl.scroll':      { en:'scroll (Detector)', zh:'滚轮（探测器）' },
  'ctl.scroll.d':    { en:'disassemble / assemble the detector in six stages', zh:'分六个阶段拆解 / 组装探测器' },
  'ctl.drag':        { en:'drag · right-drag', zh:'拖拽 · 右键拖拽' },
  'ctl.drag.d':      { en:'orbit · pan (all views)', zh:'旋转 · 平移（所有视图）' },
  'ctl.wheel':       { en:'wheel (Accelerator / Collisions)', zh:'滚轮（加速器 / 对撞）' },
  'ctl.wheel.d':     { en:'zoom', zh:'缩放' },
  'ctl.space':       { en:'Space · R', zh:'空格 · R' },
  'ctl.space.d':     { en:'play/pause · reverse assembly', zh:'播放/暂停 · 反向组装' },
  'ctl.arrows':      { en:'\u2190 / \u2192', zh:'\u2190 / \u2192' },
  'ctl.arrows.d':    { en:'previous / next stage', zh:'上一阶段 / 下一阶段' },
  'ctl.views':       { en:'1 · 2 · 3', zh:'1 · 2 · 3' },
  'ctl.views.d':     { en:'Detector · Accelerator · Collisions views', zh:'探测器 · 加速器 · 对撞视图' },
  'ctl.cutaway':     { en:'C', zh:'C' },
  'ctl.cutaway.d':   { en:'toggle 3D cutaway view (reveals interior & center)', zh:'切换 3D 剖切视图（展示内部构造与中空核心）' },
  'ctl.fe':          { en:'F · E', zh:'F · E' },
  'ctl.fe.d':        { en:'ring camera flight · trigger synthetic event', zh:'环形相机巡礼 · 触发合成事件' },
  'ctl.esc':         { en:'H · Esc', zh:'H · Esc' },
  'ctl.esc.d':       { en:'help · close', zh:'帮助 · 关闭' },
  'toast.assembled': { en:'Assembled view', zh:'完整组装视图' },
  'toast.stage':     { en:'Stage {n} \u2014 {chip}', zh:'第 {n} 阶段 — {chip}' },
  'toast.dirFwd':    { en:'Disassembly direction', zh:'拆解方向' },
  'toast.dirRev':    { en:'Assembly direction (reverse)', zh:'组装方向（反向）' },
  'toast.playback':  { en:'Playback: {d} s full cycle', zh:'播放：完整周期 {d} 秒' },
  'toast.cutawayOn': { en:'Cutaway view enabled', zh:'剖切视图已开启（展示中空核心）' },
  'toast.cutawayOff':{ en:'Cutaway view disabled', zh:'剖切视图已关闭' },
  'toast.flightOff': { en:'Flight cancelled', zh:'巡礼已取消' },
  'toast.flight':    { en:'Camera flight — drag to cancel', zh:'镜头巡礼 —— 拖拽可取消' },
  'toast.lang':      { en:'Language: English', zh:'语言已切换为：中文' },
};
