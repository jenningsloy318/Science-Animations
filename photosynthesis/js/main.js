// ═══════════════════════════════════════════════════════
// main.js — 光合作用 · 四标签共享渲染器
// ①叶子里 ②光反应 ③合成循环 ④数字与真相
// ═══════════════════════════════════════════════════════
import * as THREE from 'three';
import { buildStory } from './story.js';
import { buildLeaf } from './chloroplast.js';
import { buildLight } from './light.js';
import { buildFacts } from './spectrum.js';
import { i18n } from '../../common/js/i18n.js';

export const photoDict = {
  'nav.home': { zh: '🏠 首页', en: '🏠 Home' },
  'nav.home_tip': { zh: '返回首页 Back to home', en: 'Return to home portal' },
  'meta.title': {
    zh: '光合作用 · 一片叶子里的能量工厂',
    en: 'Photosynthesis · Energy Factory in a Leaf'
  },
  'meta.description': {
    zh: '3D 探索光合作用：从叶片横切、叶绿体到类囊体膜上的 Z 方案电子传递链、水分解放氧、ATP 合酶与卡尔文循环拼糖。',
    en: 'Explore photosynthesis in 3D: leaf cross-section, chloroplasts, thylakoid Z-scheme electron transport, water oxidation, ATP synthase, and Calvin cycle.'
  },
  'photo.title': { zh: '光合作用', en: 'Photosynthesis' },
  'photo.tab_story': { zh: '① 一图看懂', en: '① Overview' },
  'photo.tab_leaf': { zh: '② 叶子里', en: '② Inside Leaf' },
  'photo.tab_light': { zh: '③ 光反应 + 拼糖', en: '③ Light Rxn & Sugar' },
  'photo.tab_facts': { zh: '④ 数字与真相', en: '④ Numbers & Facts' },

  'photo.story_h2': { zh: '光合作用，一句话', en: 'Photosynthesis in a Nutshell' },
  'photo.story_sub': { zh: '讲给小朋友', en: 'For Curious Kids' },
  'photo.story_formula': { zh: '光 + 水 + 二氧化碳 → 糖 + 氧气', en: 'Light + Water + Carbon Dioxide → Sugar + Oxygen' },
  'photo.story_desc': {
    zh: '<b>植物是一座“吃阳光的糖工厂”</b>：它从空气里抓住二氧化碳，从根里喝水，在阳光下把这两样拼成自己的食物——糖；顺便送给我们氧气。',
    en: '<b>Plants are sun-eating sugar factories</b>: they capture CO₂ from air, take water from roots, and use sunlight to build sugar (their food), releasing oxygen for us.'
  },
  'photo.stat_water': { zh: '💧 喝掉的水', en: '💧 Water Consumed' },
  'photo.stat_co2': { zh: '💨 抓住的二氧化碳', en: '💨 CO₂ Captured' },
  'photo.stat_sugar': { zh: '🍬 拼出的糖', en: '🍬 Sugar Produced' },
  'photo.stat_o2': { zh: '😮‍💨 送出的氧气', en: '😮‍💨 Oxygen Released' },
  'photo.story_tip': {
    zh: '点 <b>▶ 一分钟故事</b>，让相机带你逐句看。后面的标签是给想深入的小朋友准备的。',
    en: 'Click <b>▶ 1-Minute Story</b> for a guided walkthrough. Tabs above explore deeper levels.'
  },
  'photo.story_fact1': {
    zh: '<b>为什么重要</b> — 你吃的米饭、面包、肉，能量都能追回到这片“糖工厂”；你呼出的二氧化碳也会被它抓回去。',
    en: '<b>Why it matters</b> — Rice, bread, and meat all trace their energy back to this sugar factory. It also absorbs the CO₂ we exhale.'
  },
  'photo.story_fact2': {
    zh: '<b>氧气从哪来</b> — 空气里的氧，大半是这座工厂 24 亿年来放出的“副产品”。',
    en: '<b>Where oxygen comes from</b> — Most oxygen in Earth’s atmosphere is a 2.4-billion-year byproduct of this factory.'
  },

  'photo.leaf_h2': { zh: '工厂在哪？', en: 'Where is the Factory?' },
  'photo.leaf_sub': { zh: '三级放大，一页看完', en: '3-tier zoom at a glance' },
  'photo.leaf_p1': {
    zh: '这张图从左到右连着看：<b>① 叶片横切</b> → 金圈挑出一个细胞 → <b>② 放大它</b>：里面漂着绿色“豆豆”（叶绿体）→ 金圈挑出一个豆豆 → <b>③ 再放大</b>：一摞摞“硬币”叫<b>基粒</b>（光反应在它膜上），周围液体叫<b>基质</b>（拼糖循环在这）。',
    en: 'Read left to right: <b>① Leaf cross-section</b> → highlight a single cell → <b>② Zoom in</b>: green chloroplast organelles inside → <b>③ Zoom further</b>: coin-like stacks called <b>grana</b> (light reactions on thylakoids), surrounded by liquid <b>stroma</b> (Calvin cycle).'
  },
  'photo.leaf_p2': {
    zh: '点 <b>🎬 自动导览</b>，相机会带你依次飞近三级；随时拖动画面自己看。',
    en: 'Click <b>🎬 Auto Tour</b> to fly through all 3 tiers, or drag anytime to explore.'
  },
  'photo.leaf_fact1': {
    zh: '<b>叶绿体</b> — 一个细胞里约 20–100 个，是细胞里的“太阳能车间”。',
    en: '<b>Chloroplasts</b> — 20–100 per plant cell; miniature solar power workshops.'
  },
  'photo.leaf_fact2': {
    zh: '<b>类囊体</b> — 基粒里一层层薄膜；阳光在这里被装进“电池”。',
    en: '<b>Thylakoid</b> — Membrane sacs where sunlight charges chemical batteries.'
  },
  'photo.leaf_fact3': {
    zh: '<b>总账</b> — 每合成 1 mol 葡萄糖储存 2870 kJ 能量，全部来自光子。',
    en: '<b>Energy balance</b> — Storing 1 mol glucose absorbs 2,870 kJ, all from photons.'
  },

  'photo.light_h2': { zh: '一台完整的机器', en: 'A Complete Machine' },
  'photo.light_sub': { zh: '充电 + 拼糖 · 同屏看', en: 'Light rxn + Calvin cycle side by side' },
  'photo.btn_live': { zh: '⚡ 连续运转', en: '⚡ Continuous Run' },
  'photo.btn_tour': { zh: '🎬 讲透四步曲', en: '🎬 4-Step Walkthrough' },
  'photo.tour_step1': { zh: '① 全景叶绿体', en: '① Chloroplast Pan' },
  'photo.tour_step2': { zh: '② 膜上发电', en: '② Membrane Power' },
  'photo.tour_step3': { zh: '③ 能量专线', en: '③ Energy Transfer' },
  'photo.tour_step4': { zh: '④ 基质拼糖', en: '④ Stroma Calvin Cycle' },
  'photo.light_formula': { zh: '光能 → 电子电梯 → H⁺ 大坝水压 → ATP + NADPH 电池 → 拼装出糖', en: 'Light → Electron Elevators → H⁺ Dam Pressure → ATP + NADPH Batteries → Sugar Assembly' },

  'photo.legend_photon': { zh: '光子', en: 'Photon' },
  'photo.legend_electron': { zh: 'e⁻ 电子', en: 'e⁻ Electron' },
  'photo.legend_proton': { zh: 'H⁺ 质子', en: 'H⁺ Proton' },
  'photo.legend_o2': { zh: 'O₂ 氧气', en: 'O₂ Oxygen' },
  'photo.legend_atp_full': { zh: '🔋ATP满电', en: '🔋ATP Charged' },
  'photo.legend_adp_empty': { zh: '🪫ADP待充', en: '🪫ADP Empty' },
  'photo.legend_nadph_full': { zh: '⚡NADPH满载', en: '⚡NADPH Loaded' },
  'photo.legend_nadp_empty': { zh: '📦NADP⁺待装', en: '📦NADP⁺ Empty' },
  'photo.legend_co2': { zh: '1碳 CO₂', en: '1-C CO₂' },
  'photo.legend_g3p': { zh: '3碳糖 G3P', en: '3-C G3P Sugar' },

  'photo.step1': {
    zh: '① 光子打入 PSII：电子乘<b>阳光电梯 1</b> 跃迁（水被拆开放出 O₂ 与 H⁺）',
    en: '① Photon strikes PSII: electron rides <b>Sun Elevator 1</b> (water splits into O₂ and H⁺)'
  },
  'photo.step2': {
    zh: '② 电子滑过 b6f：做功像<b>抽水泵把 H⁺ 压入腔内大坝</b>',
    en: '② Electron flows through b6f: pumps <b>H⁺ into lumen like a water dam</b>'
  },
  'photo.step3': {
    zh: '③ 电子到 PSI 没劲了：第二个光子启动<b>阳光电梯 2</b> 再次激发',
    en: '③ Low-energy electron reaches PSI: 2nd photon fires <b>Sun Elevator 2</b>'
  },
  'photo.step4': {
    zh: '④ FNR 酶把高能电子和 H⁺ 封装入 NADP⁺ → <b>NADPH 满载电池</b>',
    en: '④ FNR enzyme loads electrons and H⁺ onto NADP⁺ → <b>NADPH battery</b>'
  },
  'photo.step5': {
    zh: '⑤ 腔内高压 H⁺ 喷涌推动水轮机 → 旋转压出 <b>ATP 满电电池</b>',
    en: '⑤ High H⁺ lumen pressure spins turbine rotor → generates <b>ATP battery</b>'
  },

  'photo.stat_o2_out': { zh: '😮‍💨 O₂ 放出', en: '😮‍💨 O₂ Released' },
  'photo.stat_battery': { zh: '🔋 满格电池（ATP / NADPH）', en: '🔋 Full Batteries (ATP / NADPH)' },
  'photo.stat_turns': { zh: '🍬 拼糖圈数', en: '🍬 Calvin Cycle Turns' },
  'photo.stat_g3p': { zh: '🧱 净得糖块（G3P）', en: '🧱 Net G3P Synthesized' },
  'photo.stat_kok': { zh: '放氧复合体（Kok 态）', en: 'Oxygen-Evolving Complex (Kok)' },

  'photo.exp_title': { zh: '🔬 独立与联系 · 遮光小实验', en: '🔬 Independence & Link · Light Cut Experiment' },
  'photo.exp_btn_off': { zh: '🌑 关掉太阳', en: '🌑 Turn Off Sun' },
  'photo.exp_btn_on': { zh: '☀️ 重新开启太阳', en: '☀️ Turn Sun Back On' },
  'photo.exp_msg_init': {
    zh: '点“关掉太阳”观察：光反应立刻断电，但拼糖车间如何利用【存量电池】独立继续运转！',
    en: 'Click "Turn Off Sun": light rxn halts, but Calvin cycle keeps running on stored batteries!'
  },

  'photo.insp_default_title': { zh: '💡 点击 3D 部件看大白话档案', en: '💡 Click 3D Parts for Info Dossier' },
  'photo.insp_default_tag': { zh: '可随时点击', en: 'Click anytime' },
  'photo.insp_default_desc': {
    zh: '拖动旋转场景，点击膜上的蛋白质、旋转的水轮机或拼糖车间，揭秘微观机器的精妙分工！',
    en: 'Rotate scene and click membrane proteins, rotating turbine, or Calvin cycle workshop!'
  },

  'photo.light_fact1': {
    zh: '<b>为什么叫“拼糖”？</b> 空气中的 CO₂ 只有 1 个碳，是散落的积木。植物用 5 碳抓手（RuBP）把它们抓牢，并消耗光反应做好的化学电池（ATP 与 NADPH）注入高能量，拼合成真正的食物——糖（G3P）。',
    en: '<b>Why "Sugar Assembly"?</b> Airborne CO₂ has only 1 carbon atom. RuBisCO captures it with a 5-carbon acceptor (RuBP), then ATP and NADPH batteries infuse energy to forge 3-carbon sugar (G3P).'
  },
  'photo.light_fact2': {
    zh: '<b>为什么要充两次电？</b> 阳光单个光子的能量不足以一口气把电子从水直接顶上 NADPH。大自然巧妙设计了两个“阳光充电站”（PSII 和 PSI），接力把电子能量推上巅峰！',
    en: '<b>Why charge twice?</b> A single photon cannot boost an electron from H₂O all the way to NADPH. Nature uses two tandem stations (PSII & PSI) to step up the potential in the Z-scheme.'
  },
  'photo.light_fact3': {
    zh: '<b>暗反应真的不需要光吗？</b> 暗反应本身不需要光子直接轰击，但它极其依赖光反应送来的新鲜 ATP 和 NADPH 电池；如果长时间没光，电池耗尽，拼糖车间立刻停摆！',
    en: '<b>Does Dark Reaction really need no light?</b> Enzymes do not directly absorb photons, but require continuous ATP/NADPH from light reactions. When stored batteries deplete, sugar synthesis stops.'
  },

  'photo.facts_h2': { zh: '数字与真相', en: 'Numbers & Truth' },
  'photo.facts_sub': { zh: '全部来自已核实来源', en: 'Verified scientific sources' },
  'photo.facts_p1': {
    zh: '<b>为什么叶子是绿色的？</b> 叶绿素强吸收蓝光（约 430 nm）和红光（约 662 nm），把绿光（约 550 nm）反射回你的眼睛。1882 年 Engelmann 用好氧菌找出“哪种颜色的光最管用”——红光和蓝光。',
    en: '<b>Why are leaves green?</b> Chlorophyll strongly absorbs blue (~430 nm) and red (~662 nm) light, reflecting green (~550 nm) to your eyes. In 1882 Engelmann used aerobic bacteria to map the action spectrum.'
  },
  'photo.facts_stat1': { zh: '放 1 个 O₂ 的光子账单', en: 'Photons required per O₂' },
  'photo.facts_stat1_val': { zh: '8–10 个', en: '8–10 photons' },
  'photo.facts_stat2': { zh: '植物理论效率上限', en: 'Theoretical plant efficiency' },
  'photo.facts_stat3': { zh: '实际田间作物', en: 'Field crop efficiency' },
  'photo.facts_stat3_val': { zh: '约 1–2%', en: '~1–2%' },
  'photo.facts_stat4': { zh: '商品太阳能板（对比）', en: 'Commercial solar panel (comparison)' },
  'photo.facts_stat4_val': { zh: '约 24%', en: '~24%' },
  'photo.facts_p2': {
    zh: '<b>规模</b>：陆地光合作用每年固碳约 120 Gt；大气里的 O₂ 至少一半来自海洋浮游植物。约 24 亿年前，光合细菌引发的“大氧化事件”永远改写了大气。',
    en: '<b>Global Scale</b>: Terrestrial plants fix ~120 Gt carbon yearly; at least half of atmospheric O₂ originates from marine phytoplankton. ~2.4 billion years ago, cyanobacteria triggered the Great Oxidation Event.'
  },
  'photo.tl_1': { zh: '<b>1771</b> Priestley：薄荷“净化”蜡烛烧坏的空气', en: '<b>1771</b> Priestley: Mint sprig restores air fouled by candle' },
  'photo.tl_2': { zh: '<b>1779</b> Ingenhousz：只有绿色植物在光下才这么做', en: '<b>1779</b> Ingenhousz: Only green parts in sunlight produce clean air' },
  'photo.tl_3': { zh: '<b>1882</b> Engelmann：细菌找红光——作用光谱', en: '<b>1882</b> Engelmann: Bacteria swarm blue/red zones — action spectrum' },
  'photo.tl_4': { zh: '<b>1941</b> Ruben & Kamen：¹⁸O 证实 O₂ 来自水', en: '<b>1941</b> Ruben & Kamen: ¹⁸O tracer proves O₂ originates from H₂O' },
  'photo.tl_5': { zh: '<b>1961</b> Calvin：¹⁴C 解出固碳循环（诺贝尔奖）', en: '<b>1961</b> Calvin: ¹⁴C tracer uncovers carbon fixation cycle (Nobel Prize)' },

  'photo.btn_story_play': { zh: '▶ 一分钟故事', en: '▶ 1-Min Story' },
  'photo.btn_story_stop': { zh: '⏹ 停止故事', en: '⏹ Stop Story' },
  'photo.btn_pause': { zh: '⏸ 暂停', en: '⏸ Pause' },
  'photo.btn_resume': { zh: '▶ 继续', en: '▶ Resume' },
  'photo.btn_home_view': { zh: '⟲ 回到全景', en: '⟲ Reset View' },
  'photo.btn_leaf_tour': { zh: '🎬 自动导览', en: '🎬 Auto Tour' },
  'photo.btn_leaf_stop': { zh: '⏹ 停止导览', en: '⏹ Stop Tour' },
  'photo.btn_labels': { zh: '🏷 标签', en: '🏷 Labels' },
  'photo.ctl_light': { zh: '光强', en: 'Light' },
  'photo.ctl_speed': { zh: '速度', en: 'Speed' },
  'photo.ctl_view': { zh: '视角', en: 'View' },
  'photo.view_spectrum': { zh: '吸收光谱', en: 'Absorption Spectrum' },
  'photo.view_efficiency': { zh: '效率阶梯', en: 'Efficiency Ladder' },
  'photo.view_scale': { zh: '地球规模', en: 'Global Scale' },
  'photo.badge': { zh: '真实生化过程 · 示意几何 · 数据来源见 README', en: 'Realistic biochemistry · Schematic geometry · Sources in README' },

  // 3D labels - Light tab
  'photo.lbl_chloro_matrix': {
    zh: '🍃 叶绿体内部微宇宙 (Chloroplast Matrix · 统一生命机器)',
    en: '🍃 Inside Chloroplast Matrix (Life Machinery)'
  },
  'photo.lbl_light_zone': {
    zh: '🏭 过程 ① · 光反应发电工场 (类囊体膜系统)',
    en: '🏭 Process ① · Light-Dependent Power Factory (Thylakoids)'
  },
  'photo.lbl_light_zone_sub': {
    zh: '水裂发放氧 · 质子水库大坝 · 纳米水轮机压制满电电池',
    en: 'Water splitting O₂ · Proton dam · Nanoturbine synthesizing batteries'
  },
  'photo.lbl_lumen_dam': {
    zh: '类囊体腔 · 质子水库 (高压蓄水大坝 · 充盈 H⁺)',
    en: 'Thylakoid Lumen · Proton Reservoir (High-pressure Dam · H⁺)'
  },
  'photo.lbl_hplus_flow': {
    zh: 'H⁺ 顺水势冲向水轮机 →',
    en: 'H⁺ rushes toward ATP synthase turbine →'
  },
  'photo.lbl_psii': {
    zh: '① PSII · 拆水放氧',
    en: '① PSII · Water Splitting & O₂'
  },
  'photo.lbl_oec': {
    zh: 'OEC 锰簇 (拆水刀)',
    en: 'OEC Mn₄CaO₅ Cluster (Water Splitter)'
  },
  'photo.lbl_b6f': {
    zh: '② b6f · 泵 H⁺ 入大坝',
    en: '② Cyt b₆f · Pumps H⁺ into Dam'
  },
  'photo.lbl_psi': {
    zh: '③ PSI · 二次充能',
    en: '③ PSI · Second Solar Boost'
  },
  'photo.lbl_fnr': {
    zh: '④ FNR · 封装 NADPH',
    en: '④ FNR · Packaging NADPH'
  },
  'photo.lbl_atp_synth': {
    zh: '⑤ ATP 合酶 · 旋转发电',
    en: '⑤ ATP Synthase · Rotary Generator'
  },
  'photo.lbl_highway_forward': {
    zh: '⚡ 满电前送 (3 ATP + 2 NADPH) →',
    en: '⚡ Forward Power (3 ATP + 2 NADPH) →'
  },
  'photo.lbl_pipe_nadph': {
    zh: '④ 还原力管道 (NADPH 电池) →',
    en: '④ Reducing Power Pipeline (NADPH Battery) →'
  },
  'photo.lbl_pipe_atp': {
    zh: '⑤ 能量货币管道 (ATP 电池) →',
    en: '⑤ Energy Currency Pipeline (ATP Battery) →'
  },
  'photo.lbl_highway_shuttle': {
    zh: '⇄ 能量与原料穿梭专线 ⇄',
    en: '⇄ Energy & Material Shuttle Line ⇄'
  },
  'photo.lbl_highway_return': {
    zh: '← 🪫 空电回充 (3 ADP + 2 NADP⁺)',
    en: '← 🪫 Empty Recharge (3 ADP + 2 NADP⁺)'
  },
  'photo.lbl_calvin_zone': {
    zh: '🍬 过程 ② · 碳反应拼糖工场 (叶绿体基质)',
    en: '🍬 Process ② · Calvin Cycle Sugar Workshop (Stroma)'
  },
  'photo.lbl_calvin_zone_sub': {
    zh: 'RuBisCO 抓碳 · 注入氢能 · 组装产出糖',
    en: 'RuBisCO fixes carbon · Injects energy · Assembles sugar'
  },
  'photo.lbl_calvin_fix': {
    zh: '① 抓碳固定 (RuBisCO)',
    en: '① Carbon Fixation (RuBisCO)'
  },
  'photo.lbl_calvin_red': {
    zh: '② 充能还原 (注入能量)',
    en: '② Reduction (Energy Injection)'
  },
  'photo.lbl_calvin_reg': {
    zh: '③ 抓手再生 (RuBP)',
    en: '③ Regeneration (RuBP)'
  },
  'photo.lbl_sugar_exit': {
    zh: '🍬 纯赚 1 块糖出厂 (G3P)',
    en: '🍬 Net 1 Sugar Discharged (G3P)'
  },

  // Interactive Inspector Details
  'photo.insp_click_tag': { zh: '💡 点击查看档案', en: '💡 Info Dossier' },
  'photo.insp_in_label': { zh: '输入 (Inputs)：', en: 'Inputs:' },
  'photo.insp_out_label': { zh: '输出 (Outputs)：', en: 'Outputs:' },

  'photo.comp_psii_name': { zh: '光系统 II (PSII / P680)', en: 'Photosystem II (PSII / P680)' },
  'photo.comp_psii_metaphor': { zh: '【阳光电梯 1 号 + 拆水放氧】', en: '【Sun Elevator 1 + Water Splitting】' },
  'photo.comp_psii_desc': {
    zh: '叶绿素吸收光子，将电子顶上高能态；底部锰簇（OEC）从水里夺走电子补位，水被拆开释放 O₂ 和 H⁺！',
    en: 'Chlorophyll absorbs photons to boost electrons to high energy. The manganese cluster (OEC) strips electrons from water to replenish, releasing O₂ and H⁺ into lumen!'
  },
  'photo.comp_psii_in': {
    zh: '光子 (680 nm) + 2 H₂O',
    en: 'Photons (680 nm) + 2 H₂O'
  },
  'photo.comp_psii_out': {
    zh: '4 高能 e⁻ + 4 H⁺ (腔内) + O₂',
    en: '4 high-energy e⁻ + 4 H⁺ (in lumen) + O₂'
  },

  'photo.comp_b6f_name': { zh: '细胞色素 b6f 复合体', en: 'Cytochrome b₆f Complex' },
  'photo.comp_b6f_metaphor': { zh: '【质子抽水泵】', en: '【Proton Water Pump】' },
  'photo.comp_b6f_desc': {
    zh: '电子像滑梯滑经它时，它利用电子下坡的能量，将基质中的 H⁺ 强行泵进类囊体腔，造出大坝水压！',
    en: 'As electrons flow through, it harnesses downhill energy to pump stromal H⁺ into the thylakoid lumen, building up proton dam pressure!'
  },
  'photo.comp_b6f_in': {
    zh: '高能 e⁻ (自 PSII/质体醌 PQ) + 基质 H⁺',
    en: 'High-energy e⁻ (via PQ) + Stromal H⁺'
  },
  'photo.comp_b6f_out': {
    zh: '低能 e⁻ (送往质体蓝素 PC) + 腔内浓缩 H⁺ (构建 ΔpH)',
    en: 'Lower-energy e⁻ (to Plastocyanin PC) + Lumen H⁺ (building ΔpH)'
  },

  'photo.comp_psi_name': { zh: '光系统 I (PSI / P700)', en: 'Photosystem I (PSI / P700)' },
  'photo.comp_psi_metaphor': { zh: '【阳光电梯 2 号】', en: '【Sun Elevator 2】' },
  'photo.comp_psi_desc': {
    zh: '到达这里的电子已经疲惫没劲了；第二个光子打入，将电子再次顶上极高能态，准备送去装包！',
    en: 'De-energized electrons arrive here. A second photon strikes P700, re-energizing electrons to peak potential for NADPH packaging!'
  },
  'photo.comp_psi_in': {
    zh: '光子 (700 nm) + 低能 e⁻ (来自 PC)',
    en: 'Photons (700 nm) + De-energized e⁻ (from PC)'
  },
  'photo.comp_psi_out': {
    zh: '极高能 e⁻ (送往铁氧还蛋白 Fd)',
    en: 'Peak-energy e⁻ (transferred to Ferredoxin Fd)'
  },

  'photo.comp_fnr_name': { zh: 'FNR (铁氧还蛋白-NADP⁺ 还原酶)', en: 'FNR (Ferredoxin-NADP⁺ Reductase)' },
  'photo.comp_fnr_metaphor': { zh: '【电池打包车间】', en: '【Battery Packaging Workshop】' },
  'photo.comp_fnr_desc': {
    zh: '把从 PSI 送来的 2 个高能电子与基质 H⁺ 装进 NADP⁺，封装成满电化学电池 NADPH！',
    en: 'Transfers 2 high-energy electrons from Ferredoxin and 1 stromal H⁺ to NADP⁺, packaging reduced coenzyme NADPH!'
  },
  'photo.comp_fnr_in': {
    zh: '2 还原态铁氧还蛋白 (2 Fd_red, 携 2e⁻) + 1 NADP⁺ + 1 基质 H⁺',
    en: '2 Reduced Ferredoxin (2 Fd_red, 2e⁻) + 1 NADP⁺ + 1 Stromal H⁺'
  },
  'photo.comp_fnr_out': {
    zh: '1 NADPH (高能氢与电子载体电池) + 2 氧化态铁氧还蛋白 (2 Fd_ox)',
    en: '1 NADPH (high-energy electron & H carrier battery) + 2 Oxidized Ferredoxin (2 Fd_ox)'
  },

  'photo.comp_atp_name': { zh: 'ATP 合酶 (分子水轮发电机)', en: 'ATP Synthase (Molecular Hydro Turbine)' },
  'photo.comp_atp_metaphor': { zh: '【水轮发电机】', en: '【Rotary Hydro Generator】' },
  'photo.comp_atp_desc': {
    zh: '类囊体腔内高压 H⁺ 喷涌而出推着 c 环高速旋转，带动转轴在球头里咔哒组装 ADP + Pi → ATP 满电电池！',
    en: 'Protons trapped in lumen rush down electrochemical gradient through c-rotor, spinning F₁ head to synthesize ATP from ADP and Pi!'
  },
  'photo.comp_atp_in': {
    zh: '约 4.67 H⁺ (腔内水库高压流) + 1 ADP + 1 Pi (无机磷酸)',
    en: '~4.67 H⁺ (from lumen dam gradient) + 1 ADP + 1 Pi (inorganic phosphate)'
  },
  'photo.comp_atp_out': {
    zh: '1 ATP (通用能量货币电池) + 约 4.67 H⁺ (释放至基质) + 1 H₂O',
    en: '1 ATP (universal cellular energy currency) + ~4.67 H⁺ (released into stroma) + 1 H₂O'
  },

  'photo.comp_rubisco_name': { zh: 'RuBisCO (核酮糖二磷酸羧化酶)', en: 'RuBisCO (Ribulose-1,5-bisphosphate Carboxylase)' },
  'photo.comp_rubisco_metaphor': { zh: '【抓碳机械手】', en: '【Carbon-Fixing Robotic Arm】' },
  'photo.comp_rubisco_desc': {
    zh: '地球上最多的酶！负责从空气中抓住只有 1 个碳的 CO₂，强行扣在 5 碳抓手 RuBP 上，拉开拼糖序幕！',
    en: 'The most abundant enzyme on Earth! Captures 1-carbon CO₂ from air and binds it onto 5-carbon RuBP, kicking off sugar synthesis!'
  },
  'photo.comp_rubisco_in': {
    zh: '1 CO₂ + 1 RuBP (5碳双磷酸核酮糖) + H₂O',
    en: '1 CO₂ + 1 RuBP (5-carbon sugar) + H₂O'
  },
  'photo.comp_rubisco_out': {
    zh: '2 分子 3-PGA (3碳甘油酸-3-磷酸)',
    en: '2 molecules of 3-PGA (3-phosphoglycerate)'
  },

  'photo.comp_red_name': { zh: '还原工位 (能量与电子注入)', en: 'Reduction Workshop (Energy & Electron Injection)' },
  'photo.comp_red_metaphor': { zh: '【电池花在这里！】', en: '【Batteries Spent Here!】' },
  'photo.comp_red_desc': {
    zh: '3-PGA 吸收 ATP 提供的能量磷酸，并吞下 NADPH 送来的高能电子与氢，蜕变为甜美的高能糖砖 G3P！',
    en: '3-PGA absorbs high-energy phosphate from ATP and electrons/hydrogen from NADPH, converting into sweet 3-carbon G3P sugar bricks!'
  },
  'photo.comp_red_in': {
    zh: '2 × 3-PGA + 2 ATP + 2 NADPH',
    en: '2 × 3-PGA + 2 ATP + 2 NADPH'
  },
  'photo.comp_red_out': {
    zh: '2 × G3P (3碳糖) + 2 ADP + 2 Pi + 2 NADP⁺',
    en: '2 × G3P (3-carbon sugar) + 2 ADP + 2 Pi + 2 NADP⁺'
  },

  'photo.comp_reg_name': { zh: '再生与出糖工位', en: 'Regeneration & Sugar Output Workshop' },
  'photo.comp_reg_metaphor': { zh: '【1 块出厂，5 块回炉】', en: '【1 Discharged, 5 Recycled】' },
  'photo.comp_reg_desc': {
    zh: '3 圈积攒 6 块 G3P，其中 1 块作为纯收入离开车间去造葡萄糖；剩余 5 块在 ATP 支持下重新拼回 3 个 RuBP 抓手！',
    en: 'Every 3 turns yield 6 G3P. 1 G3P exits as net harvest for glucose synthesis; 5 G3P recycle with 1 ATP to regenerate 3 RuBP acceptors!'
  },
  'photo.comp_reg_in': {
    zh: '5 × G3P (共 15 个碳) + 1 ATP',
    en: '5 × G3P (15 carbons total) + 1 ATP'
  },
  'photo.comp_reg_out': {
    zh: '3 × RuBP (5碳抓手，共 15 个碳) + 1 ADP',
    en: '3 × RuBP (5-carbon acceptors, 15 carbons total) + 1 ADP'
  },

  // Z-Scheme 2D Canvas
  'photo.z_title': { zh: 'Z 方案：电子能量过山车 (两次充能)', en: 'Z-Scheme: Electron Energy Coaster (Dual Excitation)' },
  'photo.z_axis': { zh: '势能 ↑ (高能量)', en: 'Redox Potential ↑ (High Energy)' },
  'photo.z_node_0': { zh: '水 (H₂O)', en: 'Water (H₂O)' },
  'photo.z_node_1': { zh: '☀️ 电梯 1 (P680*)', en: '☀️ Elevator 1 (P680*)' },
  'photo.z_node_2': { zh: 'b6f (泵 H⁺)', en: 'Cyt b₆f (Pumps H⁺)' },
  'photo.z_node_3': { zh: '☀️ 电梯 2 (P700*)', en: '☀️ Elevator 2 (P700*)' },
  'photo.z_node_4': { zh: '📦 NADPH', en: '📦 NADPH' },

  // Light tour steps
  'photo.light_tour_title_1': { zh: '① 全景叶绿体微宇宙 (宏观总揽 · 生命机器)', en: '① Panoramic Chloroplast Microcosm (Overview · Life Machine)' },
  'photo.light_tour_desc_1': {
    zh: '【置身叶绿体内部】左侧固态膜系统阳光充电放氧，右侧液态基质里吃电池拼糖，中间是源源不断的能量对流高铁。两厂分工明确、浑然一体！',
    en: '【Inside the Chloroplast】On the left, solid thylakoid membranes split water and charge batteries. On the right, liquid stroma consumes batteries to assemble sugar. In between, shuttle highways link the two in a seamless cycle!'
  },
  'photo.light_tour_title_2': { zh: '② 过程 ① · 膜上发电大坝 (类囊体膜系统)', en: '② Process ① · Membrane Power Dam (Thylakoids)' },
  'photo.light_tour_desc_2': {
    zh: '【独立硬件：固态膜机器】阳光打入 PSII 和 PSI，水分子在 OEC 刀口被切开发出氧气。下坡电子推动 b6f 泵建起质子大坝，高压质子冲刷纳米水轮机（ATP合酶）飞转压出满格电池！',
    en: '【Solid-state Membrane Machinery】Photons strike PSII and PSI; water splits at the OEC cluster, releasing oxygen. Downhill electrons drive b₆f to pump protons, forming a high-pressure dam that spins ATP synthase to produce charged batteries!'
  },
  'photo.light_tour_title_3': { zh: '③ 唯一纽带 · 能量与原料穿梭专线 (城际物流)', en: '③ The Crucial Link · Energy Shuttle Line (Inter-factory Logistics)' },
  'photo.light_tour_desc_3': {
    zh: '【两厂生死脐带】光反应绝不直接造糖，拼糖车间绝不直接吃光！两厂空间独立，全靠专线连结：上层紫色管道专送 ④ FNR 封装的 NADPH，金黄管道专送 ⑤ ATP合酶压制的 ATP；下层青灰管道空电回膜充电！',
    en: '【The Vital Lifeline】Light reactions never make sugar; Calvin cycle never absorbs photons directly! Connected by dedicated conduits: purple pipeline delivers ④ NADPH, golden pipeline delivers ⑤ ATP; gray conduit returns empty batteries below!'
  },
  'photo.light_tour_title_4': { zh: '④ 过程 ② · 碳反应拼糖工场 (叶绿体基质液相)', en: '④ Process ② · Calvin Cycle Sugar Workshop (Stroma)' },
  'photo.light_tour_desc_4': {
    zh: '【独立软件：液相自催化循环】RuBisCO 抓取空气中的 CO₂，吞下送来的满电电池注入高能氢，拼装出 3碳糖 G3P！每 3 圈纯赚 1 块糖出厂，其余回炉再生抓手！',
    en: '【Liquid-phase Catalytic Cycle】RuBisCO captures CO₂ from the air. Powered by ATP and NADPH, it synthesizes 3-carbon G3P sugar. Every 3 turns, 1 net sugar exits while the remaining 5 recycle into RuBP acceptors!'
  },

  // Experiment messages
  'photo.exp_msg_dark_run': {
    zh: '<b>🌑 暗室拼糖中：</b>消耗存量电池！剩余 <b style="color:var(--orange)">{atp} ATP</b> / <b style="color:var(--violet)">{nadph} NADPH</b>（印证：拼糖过程不吃光，吃电池即可独立运行）...',
    en: '<b>🌑 Synthesizing in the dark:</b> Consuming stored batteries! Remaining: <b style="color:var(--orange)">{atp} ATP</b> / <b style="color:var(--violet)">{nadph} NADPH</b> (proves: Calvin cycle consumes batteries, not photons)...'
  },
  'photo.exp_msg_depleted': {
    zh: '<b style="color:#f43f5e">🪫 存量电池耗尽！</b>过程 ② 拼糖厂因缺电停工。<br><b>揭示本质：</b>两厂物理独立，但因电池纽带生死与共！点“重新打开太阳”复工。',
    en: '<b style="color:#f43f5e">🪫 Stored Batteries Depleted!</b> Sugar workshop halted due to power shortage.<br><b>Key takeaway:</b> The two processes are physically separate but interdependent through chemical batteries! Click "Turn Sun Back On".'
  },
  'photo.exp_msg_sun_off': {
    zh: '<b>🌑 太阳已熄灭！</b>过程 ① 光反应断电停产。<br>此时过程 ② 拼糖厂有 <b style="color:var(--orange)">{atp} ATP</b> 与 <b style="color:var(--violet)">{nadph} NADPH</b> 存量电池，正在【独立】运转...',
    en: '<b>🌑 Sun Turned Off!</b> Light reaction stops immediately.<br>Sugar workshop has <b style="color:var(--orange)">{atp} ATP</b> and <b style="color:var(--violet)">{nadph} NADPH</b> stored batteries, running independently...'
  },
  'photo.exp_msg_sun_restored': {
    zh: '<b style="color:var(--green)">⚡ 阳光恢复！</b>光反应重新发电，电池送达，拼糖车间瞬间复工！',
    en: '<b style="color:var(--green)">⚡ Sunlight Restored!</b> Light reactions generate fresh batteries, resuming sugar synthesis!'
  },

  // 3D labels - Story tab
  'photo.story_lbl_leaf': { zh: '叶子 = 糖工厂', en: 'Leaf = Sugar Factory' },
  'photo.story_lbl_sun': { zh: '☀ 阳光（能量）', en: '☀ Sunlight (Energy)' },
  'photo.story_lbl_water': { zh: '💧 水（根送上来）', en: '💧 Water (From Roots)' },
  'photo.story_lbl_co2': { zh: '💨 二氧化碳（从空气）', en: '💨 CO₂ (From Air)' },
  'photo.story_lbl_o2': { zh: '😮‍💨 氧气（我们呼吸！）', en: '😮‍💨 Oxygen (We Breathe!)' },
  'photo.story_lbl_sugar': { zh: '🍬 糖（植物的食物）', en: '🍬 Sugar (Plant Food)' },

  // Story captions
  'photo.story_cap_0': {
    zh: '看！阳光照在叶子上 —— 叶子里有会"吃光"的小工厂。',
    en: 'Look! Sunlight shines on the leaf — inside are microscopic factories that harvest light.'
  },
  'photo.story_cap_1': {
    zh: '工厂需要两样原料：根里送上来的【水】，和空气里抓来的【二氧化碳】。',
    en: 'The factory needs two raw materials: water from roots and carbon dioxide captured from the air.'
  },
  'photo.story_cap_2': {
    zh: '光先干一件事：把水拆开，放出【氧气】—— 你呼吸的氧，就是植物放出来的！',
    en: 'Light first splits water molecules, releasing oxygen — the very air you breathe!'
  },
  'photo.story_cap_3': {
    zh: '再用阳光充的"电池"把二氧化碳拼成【糖】—— 植物自己的食物。这件事就叫：光合作用！',
    en: 'Then, solar-charged batteries assemble CO₂ into sugar — plant food. This whole wonder is Photosynthesis!'
  },

  // 3D labels - Leaf tab
  'photo.leaf_lbl_section': { zh: '① 这是一片叶子（横切面）', en: '① Leaf Cross-Section' },
  'photo.leaf_lbl_sun': { zh: '☀ 阳光从这里进来', en: '☀ Sunlight Enters Here' },
  'photo.leaf_lbl_cell': { zh: '② 放大其中一个细胞', en: '② Zoom In: Single Cell' },
  'photo.leaf_lbl_chloro_dots': { zh: '绿色豆豆 = 叶绿体', en: 'Green Granules = Chloroplasts' },
  'photo.leaf_lbl_chloro_cut': { zh: '③ 再放大：叶绿体（剖开）', en: '③ Zoom Further: Chloroplast (Cutaway)' },
  'photo.leaf_lbl_grana': { zh: '硬币堆 = 基粒（光反应②在这层膜上）', en: 'Coin Stacks = Grana (Light Rxn on Membrane)' },
  'photo.leaf_lbl_stroma': { zh: '周围液体 = 基质（合成循环③在这）', en: 'Surrounding Liquid = Stroma (Calvin Cycle)' },
  'photo.leaf_lbl_zoom1': { zh: '放大 →', en: 'Zoom In →' },
  'photo.leaf_lbl_zoom2': { zh: '再放大 →', en: 'Zoom Further →' },
  'photo.leaf_tour_1': { zh: '① 叶片横切', en: '① Leaf Cross-Section' },
  'photo.leaf_tour_2': { zh: '② 叶肉细胞', en: '② Mesophyll Cell' },
  'photo.leaf_tour_3': { zh: '③ 叶绿体', en: '③ Chloroplast' },

  // 3D labels - Facts tab
  'photo.facts_lbl_spectrum': { zh: '吸收光谱：叶绿素爱吃蓝光和红光', en: 'Absorption: Chlorophyll absorbs blue & red light' },
  'photo.facts_lbl_green_reflect': { zh: '绿光（约550nm）几乎不被吸收 → 被反射回你的眼睛', en: 'Green light (~550nm) is reflected back to your eyes' },
  'photo.facts_lbl_blue': { zh: '蓝 430nm', en: 'Blue 430nm' },
  'photo.facts_lbl_red': { zh: '红 662nm', en: 'Red 662nm' },
  'photo.facts_lbl_green': { zh: '绿 550nm（被反射）', en: 'Green 550nm (Reflected)' },
  'photo.facts_lbl_ladder': { zh: '光合 vs 太阳能板：把光变成可储存能量的效率', en: 'Photosynthesis vs Solar Panels: Energy Conversion Efficiency' },
  'photo.facts_lbl_globe_c': { zh: '陆地每年固碳 ≈ 120 Gt', en: 'Terrestrial C-fixation ≈ 120 Gt/yr' },
  'photo.facts_lbl_globe_o2': { zh: '大气 O₂ ≥ 一半来自海洋浮游植物（NOAA）', en: 'Atmospheric O₂: ≥50% from Marine Phytoplankton (NOAA)' },
  'photo.facts_lbl_globe_goe': { zh: '24 亿年前：大氧化事件', en: '2.4 Billion Years Ago: Great Oxidation Event' },
  'photo.facts_eff_crop': { zh: '实际作物（田间）', en: 'Field Crops' },
  'photo.facts_eff_c3': { zh: 'C3 理论上限', en: 'C3 Theoretical' },
  'photo.facts_eff_c4': { zh: 'C4 理论上限', en: 'C4 Theoretical' },
  'photo.facts_eff_pv': { zh: '商品太阳能板', en: 'Commercial PV' },
  'photo.facts_eff_pv_rec': { zh: '太阳能板纪录', en: 'Record PV' }
};

i18n.loadDict(photoDict);

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const views = {
  story: buildStory(),
  leaf: buildLeaf(),
  light: buildLight(),
  facts: buildFacts(),
};
let current = 'story';

function applyI18n() {
  i18n.bind(document.body);
  const homeBtn = document.getElementById('homeBtn');
  if (homeBtn) {
    homeBtn.href = `../index.html?lang=${i18n.currentLang}`;
    homeBtn.title = i18n.t('nav.home_tip');
  }
  document.title = i18n.t('meta.title');
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', i18n.t('meta.description'));
  document.documentElement.classList.remove('i18n-loading');

  if (typeof views !== 'undefined') {
    for (const v of Object.values(views)) {
      v.onLangChange?.(i18n.currentLang);
    }
  }
}

i18n.subscribe(() => {
  applyI18n();
});

document.getElementById('btnLangZh')?.addEventListener('click', () => i18n.setLanguage('zh'));
document.getElementById('btnLangEn')?.addEventListener('click', () => i18n.setLanguage('en'));
applyI18n();

function setView(name) {
  current = name;
  document.body.dataset.view = name;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === name));
  document.querySelectorAll('.viewpanel').forEach(p => p.classList.toggle('active', p.dataset.panel === name));
  document.querySelectorAll('.viewbar').forEach(b => b.classList.toggle('active', b.dataset.bar === name));
  for (const [k, v] of Object.entries(views)) {
    if (v.controls) v.controls.enabled = (k === name);
  }
  views[name].onShow?.();
}

for (const [k, v] of Object.entries(views)) {
  if (v.controls) v.controls.enabled = (k === current);
}

document.querySelectorAll('.tab').forEach(t =>
  t.addEventListener('click', () => setView(t.dataset.view)));

const initialView = new URLSearchParams(location.search).get('view') || location.hash.replace('#', '');
if (initialView && views[initialView]) {
  setView(initialView);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  const v = views[current];
  v.update(dt);
  renderer.render(v.scene, v.camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

addEventListener('resize', () => {
  for (const v of Object.values(views)) v.onResize?.(innerWidth, innerHeight);
  renderer.setSize(innerWidth, innerHeight);
});

// HUD 刷新（每 0.2s）
setInterval(() => {
  const v = views[current];
  v.refreshHUD?.();
}, 200);

// 调试钩子
window.__ps = () => ({ view: current, ...(views[current].getInfo?.() || {}) });
window.__psViews = views;
