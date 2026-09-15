/* ============================================================================
 * data.js — verified facts & educational copy
 * Sources (consulted 2026-09, official CERN references):
 *   https://home.cern/science/accelerators/large-hadron-collider
 *   https://home.cern/science/experiments/atlas
 *   https://atlas.cern/Discover/Detector            (+ Inner-Detector / Muon-Spectrometer /
 *        Calorimeter / Magnet-System / Trigger-DAQ sub-pages)
 * This is an educational fan visualization. Not affiliated with or endorsed by CERN.
 * ==========================================================================*/
window.APP = window.APP || {};

APP.DATA = {
  about:
    'An interactive, simplified model inspired by CERN\u2019s LHC and the ATLAS detector. ' +
    'Geometry is schematic: proportions (especially the inner radii) are exaggerated so every layer stays readable. ' +
    'All collision events are synthetic \u2014 generated from math, never real data.',

  disclaimer: 'Simplified geometry \u00B7 Synthetic events \u00B7 Not an official CERN product',

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
           'Dipoles run at 1.9 K (\u2212271.3 \u00B0C) \u2014 colder than outer space',
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
    title:'Synthetic collision display',
    body:'A schematic cut-away of the detector with a mathematically generated event. This is NOT real ATLAS data: '
       + 'track curvature, jets and energy towers are sampled from simplified physics-inspired distributions.',
    facts:['Charged tracks curve in the 2 T solenoid field \u2014 curvature \u221D 1/p\u209C',
           'Sprays of hadrons = \u201Cjets\u201D, shown as energy towers on the calorimeter skins',
           'Gold tracks reaching the outer rings are muons \u2014 they traverse the whole detector'],
    badge:'SYNTHETIC EVENT \u2014 not real data' },

  credits: [
    { t:'CERN \u2014 The Large Hadron Collider', u:'https://home.cern/science/accelerators/large-hadron-collider' },
    { t:'CERN \u2014 ATLAS experiment', u:'https://home.cern/science/experiments/atlas' },
    { t:'ATLAS \u2014 Detector & Technology', u:'https://atlas.cern/Discover/Detector' },
    { t:'ATLAS \u2014 Inner Detector', u:'https://atlas.cern/Discover/Detector/Inner-Detector' },
    { t:'ATLAS \u2014 Calorimeter', u:'https://atlas.cern/Discover/Detector/Calorimeter' },
    { t:'ATLAS \u2014 Magnet System', u:'https://atlas.cern/Discover/Detector/Magnet-System' },
    { t:'ATLAS \u2014 Muon Spectrometer', u:'https://atlas.cern/Discover/Detector/Muon-Spectrometer' },
    { t:'ATLAS \u2014 Trigger & DAQ', u:'https://atlas.cern/Discover/Detector/Trigger-DAQ' },
  ],

  triggerNote:'Trigger & DAQ (real ATLAS): L1 hardware decides in < 2.5 \u03BCs; the software farm '
    + '(~40,000 CPU cores) narrows up to 100,000 accepted events/s down to ~1,000 recorded/s. '
    + 'Here, every event is shown \u2014 a luxury no physicist has.' };
