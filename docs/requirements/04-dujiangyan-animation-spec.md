# Animation Specification: Taming the Dragon with Wisdom (巧借自然：李冰与都江堰的治水智慧)

> **Document Version:** 2.0 (Hybrid Programmatic Architecture)  
> **Project Purpose:** Stage Animation Specification & Automated Pipeline for a 2.5-minute public speech on Chinese wisdom, Li Bing, and Dujiangyan.  
> **Target Output Path:** `docs/requirements/dujiangyan-animation-spec.md`  
> **Aspect Ratio:** 16:9 (4K UHD 3840x2160 / 1080p Stage LED Screen)  
> **Frame Rate:** 60 FPS (Smooth fluid dynamics & motion graphics)  
> **Target Duration:** 2 minutes 30 seconds (150 Seconds / 9,000 Frames @ 60fps)  
> **Visual Style:** Oriental Ink-Wash Fusion + Modern 3D Kinetic Motion Graphics (水墨意境 + 3D数据流工程原理图解)  
> **Production Architecture:** Combined Hybrid Pipeline (**Blender Python API + Manim Python + Remotion React Master Compositor**)

---

## 1. Hybrid Programmatic Architecture Overview

To achieve cinematic 3D realism alongside pixel-perfect 2D/2.5D vector diagrams, the production uses a **three-engine hybrid pipeline**. Each tool is assigned to its domain of strength and orchestrated into a single automated build system.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               HYBRID PROGRAMMATIC VIDEO PIPELINE                                │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────┐
  │  1. Blender Python (bpy)    │ ───► Scene 1 & 2: 3D Wave & Water Dragon (.mp4) ──┐
  │  • Mantaflow Fluid Physics  │                                                   │
  │  • Rigid Body Destruction   │                                                   │
  └─────────────────────────────┘                                                   │
                                                                                    │
  ┌─────────────────────────────┐                                                   ▼
  │  2. Manim (Python Engine)   │ ───► Scene 3, 4 & 6: Vector Flow & Mechanics ───► ┌─────────────────────────────┐
  │  • StreamLines / Field Vectors│    (Yuzui 60/40 Split, Calligraphy .mp4)         │  3. Remotion (React / TS)   │
  │  • Isometric 2.5D Diagrams  │                                                   │  • Audio/Voiceover Track    │
  └─────────────────────────────┘                                                   │  • Subtitles & Stage Cues   │
                                                                                    │  • Layer Transitions        │
  ┌─────────────────────────────┐                                                   │  • 4K Final Render Output   │
  │  4. Midjourney / AI / Assets│ ───► Scene 5: Background Landscapes & Ink Wash ───┘  └─────────────────────────────┘
  │  • Textures & Backgrounds   │
  └─────────────────────────────┘
```

### 1.1 Tool Responsibilities Matrix

| Engine | Primary Role | Output Format | Assigned Scenes |
| :--- | :--- | :--- | :--- |
| **Blender 3D (`bpy`)** | High-fidelity fluid dynamics, wave impacts, stone destruction, and 3D volumetric smoke. | Raw MP4 Clips (`assets/raw/blender_*.mp4`) | **Scene 1** (Tsunami & Shattered Wall), **Scene 2** (3D Min River Dragon) |
| **Manim (Python)** | Mathematical vector diagrams, river flow split algorithms (60/40), isometric schematics, vector animations. | Raw MP4 Clips (`assets/raw/manim_*.mp4`) | **Scene 3** (Vector Vision), **Scene 4** (Dujiangyan Engineering Breakdown), **Scene 6** (Calligraphy) |
| **Remotion (React)** | Master Video Container, timeline sequencing, frame-accurate audio sync, lower-third titles, subtitle rendering, stage cue markers. | Final Master 4K MP4 (`dist/dujiangyan_master.mp4`) | **All Scenes Container** + **Scene 5** (Time-Lapse & Blooming Fields) |
| **FFmpeg / Node** | Asset validation, audio mastering (-18dB normalization), proxy generation. | Intermediary streams | Pipeline automation |

---

## 2. Directory Layout & Build Hierarchy

**As-built (v2):** all production code lives under a `dujiangyan/` project root
(keeps the science repo tidy next to sibling HTML-animation projects). The
Remotion public dir is pointed at `dujiangyan/assets` via
`Config.setPublicDir('../assets')`, so raw clips and audio need no copying.

```filetree
docs/
└── requirements/
    └── dujiangyan-animation-spec.md   # This specification file
dujiangyan/
├── assets/
│   ├── audio/
│   │   └── soundscape.wav           # 150s synthesized bed (no voiceover:
│   │                                #   live presenter; see §8)
│   ├── fluid_cache/                 # Mantaflow + point caches (gitignored)
│   │   ├── scene1a/  scene1b/  scene2/
│   └── raw/                         # Generated intermediate clips (1080p60)
│       ├── blender_scene1a_droplet.mp4
│       ├── blender_scene1b_tsunami.mp4
│       ├── blender_scene2_dragon.mp4
│       ├── manim_scene3_philosophy.mp4
│       ├── manim_scene4_mechanics.mp4
│       └── manim_scene6_finale.mp4
├── blender/
│   ├── scripts/
│   │   ├── common.py                # Shared helpers (skill-compliant data API)
│   │   ├── scene1a_droplet.py       # Scene 1a: macro droplet (0:00-0:10)
│   │   ├── scene1b_tsunami.py       # Scene 1b: tsunami vs wall (0:10-0:25)
│   │   └── scene2_dragon.py         # Scene 2: river dragon (0:25-0:45)
│   └── scenes/                      # Saved .blend files (build artifacts)
├── manim/
│   └── scripts/
│       ├── manim_common.py          # Palette + CJK text helpers
│       ├── scene3_philosophy.py     # Scene 3 (0:45-1:05)
│       ├── scene4_mechanics.py      # Scene 4 (1:05-1:45)
│       └── scene6_finale.py         # Scene 6 (2:10-2:30)
├── audio/
│   └── make_soundscape.py           # numpy synthesis -> assets/audio
└── remotion/
    ├── src/
    │   ├── index.ts                 # registerRoot
    │   ├── Root.tsx                 # 4K/60fps Composition registration
    │   ├── DujiangyanMaster.tsx     # Timeline slots + chapter marks + audio
    │   └── components/
    │       ├── Subtitles.tsx        # Timed speech-line cues
    │       └── Scene5Land.tsx       # Scene 5 canvas (time-lapse & abundance)
    ├── package.json
    └── remotion.config.ts
```

---

## 3. Detailed Storyboard & Scene-Engine Assignment

Total Length: **150 Seconds (9,000 Frames @ 60 FPS)**

```
Timeline Overview:
[0:00 - 0:25] Scene 1: The Softness & Fury of Water       │ Engine: Blender 3D + Remotion
[0:25 - 0:45] Scene 2: The Min River Water-Dragon          │ Engine: Blender 3D
[0:45 - 1:05] Scene 3: Li Bing's Mindset Shift            │ Engine: Manim (Python)
[1:05 - 1:45] Scene 4: Core Mechanics — Dujiangyan 3D      │ Engine: Manim (Python) + Remotion
[1:45 - 2:10] Scene 5: 2,200 Years Time-Lapse & Abundance │ Engine: Remotion Canvas / AI Art
[2:10 - 2:30] Scene 6: Philosophical Finale               │ Engine: Manim + Remotion
```

---

### Scene 1: The Softness & Fury of Water (0:00 – 0:25)
* **Duration:** 25 Seconds (Frames 0 – 1,500)
* **Speech Line:** *(Holding a cup of water...)* *"Water is one of the softest things in the world, yet when it gathers into a raging flood, nothing can stop it. Have you ever tried to push against a giant wave? The harder you push, the stronger it pushes back."*
* **Engine:** **Blender 3D (`blender_scene1_wave.mp4`)** + Remotion Ink Layer.
* **Visual Animation Spec:**
  * **0:00 - 0:10 (Frames 0–600):** Ultra-macro shot of a single crystal water droplet falling into a calm pool against an ink-wash paper texture. Concentric ripples ripple outward with soft cyan lighting.
  * **0:10 - 0:25 (Frames 600–1,500):** Camera pulls back exponentially. Ripples turn into a 3D dark tsunami (Mantaflow fluid simulation). A rigid, dark stone wall rises. The wave crashes violently into the wall, triggering Blender Rigid-Body destruction: stone blocks fracture and debris flies toward the lens.
* **Speaker Cue Sync (0:15 - 0:20):** Speaker performs "pushing against a wave and being pushed back half a step."

---

### Scene 2: The Min River Water-Dragon (0:25 – 0:45)
* **Duration:** 20 Seconds (Frames 1,500 – 2,700)
* **Speech Line:** *"Over two thousand two hundred years ago, ancient China faced this exact challenge. Every summer, the mighty Min River roared like a fierce dragon, destroying crops and washing away entire villages..."*
* **Engine:** **Blender 3D (`blender_scene2_dragon.mp4`)**.
* **Visual Animation Spec:**
  * **0:25 - 0:35 (Frames 1,500–2,100):** Topographic lines of ancient Sichuan emerge. The river path ignites into a roaring 3D Water Dragon formed of churning foam, white water, and dark stormy clouds.
  * **0:35 - 0:45 (Frames 2,100–2,700):** Split-screen visual: On the left, traditional ancient dikes collapse as the dragon smashes them. Charcoal-style village houses dissolve into ink particles.

---

### Scene 3: Li Bing's Philosophy Shift (0:45 – 1:05)
* **Duration:** 20 Seconds (Frames 2,700 – 3,900)
* **Speech Line:** *"Most leaders believed the only way to stop a flood was to build massive, hard walls to trap the water. But the visionary engineer, Li Bing, saw things differently. He asked: 'Why fight the fierce power of nature with force, when we can gently guide it?' Instead of blocking the dragon, Li Bing decided to ride with it."*
* **Engine:** **Manim Python (`manim_scene3_vision.mp4`)**.
* **Visual Animation Spec:**
  * **0:45 - 0:55 (Frames 2,700–3,300):** The chaotic storm fades. A clean vector silhouette of Li Bing stands on a cliff. Glowing cyan vector flow lines (`StreamLines`) appear around his head, illustrating fluid dynamics calculations.
  * **0:55 - 1:05 (Frames 3,300–3,900):** The aggressive water dragon is surrounded by golden vector energy curves. Instead of colliding, the dragon gracefully bends its trajectory along Li Bing’s guided flow lines.

---

### Scene 4: Core Technical Masterpiece — 3D Dujiangyan Breakdown (1:05 – 1:45)
* **Duration:** 40 Seconds (Frames 3,900 – 6,300)
* **Speech Line:** *"He built a fish-mouth-shaped levee right in the middle of the river, smoothly dividing the water into two channels. In the dry spring, sixty percent of the water flowed naturally into fields to nourish crops. In the stormy summer, the excess flood spilled harmlessly away into the wide riverbed. Without a single modern machine or concrete dam..."*
* **Engine:** **Manim Python (`manim_scene4_mechanics.mp4`)** (Diagrams & Vector Streams) + Remotion UI.
* **Visual Animation Spec (Crucial Engineering Diagram):**
  * **1:05 - 1:18 (Yuzui Levee Split):** Isometric 2.5D schematic of the Min Riverbed. The **Yuzui Levee (鱼嘴分水堤)** draws itself out of golden ink. The main river splits into the **Inner River (内江)** and **Outer River (外江)**.
  * **1:18 - 1:32 (Spring vs. Summer Dynamic Flow):**
    * **Dry Spring Mode:** Water level drops. Manim animated data overlays highlight: **60% Flow** glides into the deeper Inner River (irrigation channel for crops), **40% Flow** glides to the Outer River.
    * **Stormy Summer Mode:** Flood surges. The high surface water automatically redirects: **60% Flood** spills into the wider Outer River, while **40%** enters the Inner River safely.
  * **1:32 - 1:45 (Feishanyan & Baopingkou):**
    * **Feishanyan (飞沙堰 Overflow & Sediment Flushing):** Animated swirling vortex illustrates gravel and excessive flood waters spilling automatically over the low weir into the Outer River.
    * **Baopingkou (宝瓶口 Bottleneck):** Golden glowing cut-out shows the narrow mountain neck limiting flow entering the Chengdu Plain.
* **Speaker Cue Sync (1:10):** Presenter performs hand-splitting gesture (*"dividing the water into two channels"*). Screen splits water stream into cyan (inner) and cobalt blue (outer).

---

### Scene 5: 2,200 Years Time-Lapse & Land of Abundance (1:45 – 2:10)
* **Duration:** 25 Seconds (Frames 6,300 – 7,800)
* **Speech Line:** *"this living miracle—Dujiangyan—tamed the flood and transformed Sichuan into the 'Land of Abundance.' Even more breathtaking, it still works flawlessly today, after more than twenty-two centuries!"*
* **Engine:** **Remotion Canvas + AI Ink Landscapes (`remotion/components/Scene5Land.tsx`)**.
* **Visual Animation Spec:**
  * **1:45 - 1:58 (Frames 6,300–7,080):** Time-lapse transition: Fast sun/moon rotations, seasonal shifts from snowy Qinghai-Tibet mountains to emerald green and golden rice paddies across the Sichuan basin.
  * **1:58 - 2:10 (Frames 7,080–7,800):** Camera morphs into a modern 4K aerial shot aesthetic. Water continues flowing flawlessly through Dujiangyan today, highlighting 2,200 years of unbroken functionality.

---

### Scene 6: Philosophical Conclusion & Calligraphy Finale (2:10 – 2:30)
* **Duration:** 20 Seconds (Frames 7,800 – 9,000)
* **Speech Line:** *"This is the timeless wisdom of China: true strength lies not in conquering nature, but in understanding its flow, turning obstacles into harmony, and turning a raging beast into a fountain of life. Thank you!"*
* **Engine:** **Manim Python (`manim_scene6_finale.mp4`)** + Remotion Typography.
* **Visual Animation Spec:**
  * **2:10 - 2:20 (Frames 7,800–8,400):** The water dragon completes its transformation into a golden, glowing river of light that feeds a blooming lotus (symbolizing harmony).
  * **2:20 - 2:30 (Frames 8,400–9,000):** Background fades to a warm Xuan Paper backdrop. Elegant golden calligraphy strokes write out:  
    `巧借自然 · 顺应规律`  
    `Taming the Dragon with Wisdom`
  * Final frame holds cleanly as stage lights rise.

---

## 4. Stage & Speaker Interaction Sync Matrix

| Timestamp | Presentation Speech Line | Speaker Gesture | Animation Visual Cue |
| :--- | :--- | :--- | :--- |
| **0:00 - 0:10** | *"Water is one of the softest things..."* | Pouring water / holding cup. | Single drop falls, calm ripples expand. |
| **0:15 - 0:25** | *"The harder you push, the stronger it pushes back."* | Push hands forward & step back. | Giant dark tsunami shatters stone wall. |
| **0:45 - 0:55** | *"Why fight the fierce power of nature with force..."* | Open palms upward, inviting gesture. | Storm clears; Li Bing silhouette appears with cyan flow lines. |
| **1:10 - 1:20** | *"dividing the water into two channels..."* | Hands split from center to sides. | Yuzui levee cuts through water; Cyan/Blue 60/40 split appears. |
| **1:55 - 2:05** | *"after more than twenty-two centuries..."* | Posture erect, confident eye contact. | Chengdu Plain blooms into golden wheat & rice fields. |
| **2:25 - 2:30** | *"Thank you!"* | Gentle bow, hands together. | Calligraphy locks on screen; golden glowing particles fade. |

---

## 5. Technical Build Scripts & Code Implementations

### 5.1 Blender Headless Build & Bake (`blender/scripts/*.py`)

**Verified against Blender 5.2 LTS** — several v1 assumptions were wrong and
are corrected here (full list in §8):

| v1 assumption | Blender 5.2 reality |
|---|---|
| `BLENDER_EEVEE_NEXT` | `BLENDER_EEVEE` (5.x consolidated the id) |
| `image_settings.file_format = 'FFMPEG'` | `media_type = 'VIDEO'` (FFMPEG removed from the format enum) |
| `resolution_max` → `resolution` | still `resolution_max` ✓ (v1 spec said nothing; noted) |
| Cell Fracture addon | **not enabled**; walls built from discrete rigid-body bricks |
| CURLNOISE force field | not present; use `TURBULENCE` |
| `scene.rigidbody_world` assignable | read-only RNA; create only when `None` via `bpy.ops.rigidbody.world_add` |

Each scene script is written **skill-compliant**: direct `bpy.data`/`bmesh`
construction everywhere; `bpy.ops` reserved for actions with no data-API
equivalent (`fluid.bake_all`, `ptcache.bake_all`, `rigidbody.*`,
`object.forcefield_toggle`, `render.render`, save). The same script therefore
runs identically in the GUI, via MCP remote execution, and headless.

```python
# common.py exposes the version-tolerant render setup:
def render_settings(scene, out_path, fps=60, res=(1920, 1080), samples=32):
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.fps = fps
    scene.render.filepath = out_path
    try:                    # Blender 5.x: video output selected via media_type
        scene.render.image_settings.media_type = "VIDEO"
    except (TypeError, AttributeError):   # Blender <= 4.x
        scene.render.image_settings.file_format = "FFMPEG"
    scene.render.ffmpeg.format = "MPEG4"
    scene.render.ffmpeg.codec = "H264"
    scene.eevee.taa_render_samples = samples
```

**Execution (two-pass, supports rebuild + rebake):**
```bash
# build (fresh scene) or reuse the saved .blend, then bake + render:
blender -b --factory-startup -noaudio --python dujiangyan/blender/scripts/scene1a_droplet.py -- --full
blender -b dujiangyan/blender/scenes/scene1a_droplet.blend --factory-startup -noaudio --python dujiangyan/blender/scripts/scene1a_droplet.py -- --full
```
Long jobs use a **status-file protocol**: each phase writes
`assets/raw/sceneN_status.json` (`bake → render → done`), so a supervisor can
fire the job and poll the filesystem instead of blocking.

---

### 5.2 Manim Scene Script (`manim/scenes/scene4_mechanics.py`)

Renders the 60/40 water split diagram in high resolution:

```python
from manim import *

class DujiangyanMechanics(ThreeDScene):
    def construct(self):
        self.camera.background_color = "#F9FAFB" # Xuan paper background
        
        # Title
        title = Text("都江堰自动分流原理 (Dujiangyan 60/40 Split)", font="PingFang SC", font_size=28, color="#1F2937")
        title.to_edge(UP)
        self.add(title)
        
        # Yuzui Levee (Fish Mouth)
        yuzui = Polygon([-1.5, 0, 0], [1, 0.8, 0], [1, -0.8, 0], color="#F59E0B", fill_color="#F59E0B", fill_opacity=0.9)
        yuzui_label = Text("鱼嘴分水堤 (Yuzui)", font_size=18, color="#78350F").next_to(yuzui, LEFT)
        
        # Spring Flow (Inner River 60%)
        inner_flow = StreamLines(
            lambda pos: np.array([1.5, -0.8, 0]),
            x_range=[-3, 3], y_range=[-2, 0],
            stroke_width=4, color="#06B6D4"
        )
        spring_tag = Text("春耕干旱期：内江 60% 灌溉农田", font_size=20, color="#06B6D4").move_to([2, -1.5, 0])
        
        # Summer Flow (Outer River 60%)
        outer_flow = StreamLines(
            lambda pos: np.array([1.5, 0.8, 0]),
            x_range=[-3, 3], y_range=[0, 2],
            stroke_width=6, color="#1D4ED8"
        )
        summer_tag = Text("夏秋洪水中：外江 60% 排走洪水", font_size=20, color="#1D4ED8").move_to([2, 1.5, 0])

        # Animation Sequence
        self.play(Create(yuzui), Write(yuzui_label), run_time=2)
        self.play(Create(inner_flow), Write(spring_tag), run_time=3)
        self.play(Create(outer_flow), Write(summer_tag), run_time=3)
        self.wait(2)
```

**Execution Command (as-built; manim not installed system-wide, runs via uv):**
```bash
cd dujiangyan/manim/scripts
uv tool run --from manim manim -qh scene4_mechanics.py Scene4
# -> media/videos/scene4_mechanics/1080p60/Scene4.mp4, then copy to assets/raw/
```
The v1 sample used a light Xuan-paper background (`#F9FAFB`); the as-built
scenes use the night-paper palette (`#101014`) matched to the Blender clips —
the video plays on an LED wall next to a live speaker, so dark backgrounds
read better and match the ink aesthetic (§7 luminance notes still apply).

---

### 5.3 Remotion Master Container (`remotion/src/DujiangyanMaster.tsx`)

The as-built master is a **timeline-slot composition**: each scene occupies a
fixed frame slot; slots read a `CLIPS`/`AVAILABLE` manifest so unfinished
clips degrade to elegant placeholders during development. Chapter marks,
opening title, subtitles, and the soundscape are all sequences of the master.

```tsx
import { Composition, Series, Video, Audio, staticFile } from 'remotion';
import { Subtitles } from './components/Subtitles';
import { InkOverlay } from './components/InkOverlay';

export const MainComposition = () => {
  return (
    <div style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Background Texture Blend */}
      <InkOverlay />
      
      {/* Frame-accurate Audio Track */}
      <Audio src={staticFile('audio/speech_voiceover.wav')} volume={1.0} />
      <Audio src={staticFile('audio/background_soundscape.mp3')} volume={0.15} />

      {/* Main Video Sequence */}
      <Series>
        {/* Scene 1: Water Softness & Wave (0:00 - 0:25 / 1500 frames) */}
        <Series.Sequence durationInFrames={1500}>
          <Video src={staticFile('raw/blender_scene1_wave.mp4')} />
        </Series.Sequence>

        {/* Scene 2: Water Dragon (0:25 - 0:45 / 1200 frames) */}
        <Series.Sequence durationInFrames={1200}>
          <Video src={staticFile('raw/blender_scene2_dragon.mp4')} />
        </Series.Sequence>

        {/* Scene 3: Li Bing Vision (0:45 - 1:05 / 1200 frames) */}
        <Series.Sequence durationInFrames={1200}>
          <Video src={staticFile('raw/manim_scene3_vision.mp4')} />
        </Series.Sequence>

        {/* Scene 4: Engineering Mechanics (1:05 - 1:45 / 2400 frames) */}
        <Series.Sequence durationInFrames={2400}>
          <Video src={staticFile('raw/manim_scene4_mechanics.mp4')} />
        </Series.Sequence>

        {/* Scene 5: Time-Lapse & Abundance (1:45 - 2:10 / 1500 frames) */}
        <Series.Sequence durationInFrames={1500}>
          <Video src={staticFile('raw/scene5_timelapse.mp4')} />
        </Series.Sequence>

        {/* Scene 6: Finale (2:10 - 2:30 / 1200 frames) */}
        <Series.Sequence durationInFrames={1200}>
          <Video src={staticFile('raw/manim_scene6_finale.mp4')} />
        </Series.Sequence>
      </Series>

      {/* Subtitles Overlay across all frames */}
      <Subtitles />
    </div>
  );
};
```

---

## 6. Pipeline Automation (`dujiangyan/build_all.sh`)

The as-built pipeline is a bash orchestrator: manim first (fast, CPU), then
Blender builds → bakes → renders (headless, status-file polling), then the
Remotion master. Every stage is idempotent and can be run individually.

```bash
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"          # dujiangyan/
B="$ROOT/blender"; M="$ROOT/manim/scripts"; A="$ROOT/assets"

# 1) Manim scenes (1080p60 via -qh)
(cd "$M" && uv tool run --from manim manim -qh scene3_philosophy.py Scene3 && \
  cp media/videos/scene3_philosophy/1080p60/Scene3.mp4 "$A/raw/manim_scene3_philosophy.mp4")
# ... scene4, scene6 likewise

# 2) Soundscape
python3 "$ROOT/audio/make_soundscape.py"

# 3) Blender scenes: build (fresh) then bake+render; poll status files
blender -b --factory-startup -noaudio --python "$B/scripts/scene1a_droplet.py" -- --full
blender -b --factory-startup -noaudio --python "$B/scripts/scene1b_tsunami.py" -- --full
blender -b --factory-startup -noaudio --python "$B/scripts/scene2_dragon.py" -- --full

# 4) Remotion master (4K); public dir already points at dujiangyan/assets
cd "$ROOT/remotion" && npx remotion render src/index.ts DujiangyanMaster out/dujiangyan_master.mp4
```

**Iterative workflow note:** during development the Blender MCP server
(`pi -> blender-mcp -> Blender addon :9876`) drives the live GUI instance for
scene construction and QA — the same generator scripts are executed in-place,
and long bake/render jobs are fired fire-and-poll (the MCP call times out,
the in-GUI job continues; the filesystem status file is the source of truth).
QA without vision: `ffmpeg signalstats` on still frames (YAVG/YMAX ranges,
channel bias) plus depsgraph-evaluated mesh counts for fluid presence.

---

## 7. Delivery & Stage Equipment Specifications

1. **Master Render Output:**
   * File: `dist/dujiangyan_master.mp4`
   * Container: MP4 (H.264 / H.265 Dual Export)
   * Resolution: 3840 x 2160 (4K UHD) @ 60.00 FPS
   * Audio: Stereo AAC, 48 kHz, 320 kbps (Normalized to -18 dB FS to prioritize presenter microphone).
2. **Stage LED Screen Calibration:**
   * Color Space: Rec.709 / sRGB.
   * Contrast & Brightness: Deep ink blacks (`#111827`) turned to true black; highlight peaks at max 85% luminance to prevent washing out presenter under stage lights.
3. **Backup Fallback:**
   * 1080p 60fps lightweight version (`dist/dujiangyan_master_1080p.mp4`).

---
*Specification Document generated under `docs/requirements/dujiangyan-animation-spec.md`. Revised as-built (v2) after implementation on Blender 5.2 LTS — see §8.*

---

## 8. As-Built Implementation Notes (v2)

Recorded during the actual build so future re-renders don't rediscover these.

### 8.1 Environment

* Blender **5.2 LTS**; intermediate clips render at **1080p60** and the Remotion
  master upscales to 4K (EEVEE raster cost at 4K is wasted on a stage LED wall).
* Headless `blender -b` **works** for construction *and* EEVEE rendering.
  Start-up noise (`ModuleNotFoundError: cattrs`, numpy warnings) comes from the
  broken `bl_pkg` addon in the distro package — harmless; filter it.
* Manim **0.21.0** via `uv tool run --from manim` (no system install).
  `-qh` = 1080p60. Field functions receive `numpy.ndarray` (no `.x`/`.y`).
* Fonts: `KaiTi` for calligraphy, `Noto Serif CJK SC` for labels, both present.
* Remotion 4.x with `Config.setPublicDir('../assets')`; test a few frames with
  `--frames=A-B` before committing to a full 9000-frame render.

### 8.2 Blender API findings (5.2)

* Video output: `scene.render.image_settings.media_type = 'VIDEO'`
  (`'FFMPEG'` no longer exists in `file_format`).
* Fluid domain: `resolution_max`, flow behavior `GEOMETRY` (initial liquid),
  `INFLOW`, gravity may be scalar **or** float[3] depending on build — wrap it.
* Rigid body: `scene.rigidbody_world` is **read-only**; create via operator
  only when `None`. Loading a blend that already has an RB world makes
  `rigidbody.world_add`'s poll fail — scripts must skip creation in that case.
* Force fields: no `CURLNOISE`; `FieldSettings.flow` is a **float**, not enum.
  Wind blows along local **−Z** (rotate the empty, e.g. `(0, −90°, 0)` → +X).
* Particles: no `seed` (it's `ParticleSystem.seed`), no `object_damping`,
  no `draw_method`. Zero gravity per-system via
  `settings.effector_weights.gravity = 0` (particles don't collide with
  meshes by default — stylized flows fly instead of sinking).
* Cache paths saved in blends are `//`-relative: re-absolutize with
  `bpy.path.abspath()` before `os.makedirs` / reassignment.

### 8.3 Deviations from v1 storyboard

| Item | v1 | As-built | Why |
|---|---|---|---|
| Scene 1 | one `scene1_wave` | **scene1a** droplet macro (600f) + **scene1b** tsunami-vs-wall (900f) | independent bakes; macro shot can re-render cheaply |
| Destruction | Cell Fracture | 64 discrete rigid bricks + wind gust impulse at impact | addon unavailable; wind-driven scatter is robust and reads at distance |
| Scene 2 river | full Mantaflow river | terrain with carved valley + particle braid (paths) + glowing dragon stream + ink-dissolve houses | full-river fluid at 4K budget is infeasible; particles are deterministic (seeded) |
| Scene 4 | 40s | 32.4s + hold-last-frame to fill the slot | Remotion holds the final frame; pacing preserved |
| Scene 5 | "AI art / timelapse clip" | Remotion canvas: ink mountains, dynasty sweep 秦→今, growing wheat field, counters (2,280 yrs / 1,164万亩) | fully programmatic, no external assets |
| Voiceover | `speech_voiceover.wav` | **none** — live presenter; `soundscape.wav` (numpy synthesis: river noise + storm surge synced to 0:10–0:25 + Karplus-Strong guqin in C-pentatonic + closing chord) | no VO file exists; spec's VO slot replaced |
| Subtitles | generic | 8 timed cues from the §3 speech lines, styled lower-third | presenter sync |
| Layout | repo root | `dujiangyan/` project root | keeps repo tidy; public dir mapped, no copying |

### 8.4 Determinism & QA protocol

* All generators are seeded (`random.seed`, particle seeds) and idempotent
  (`--build-only` rebuilds from empty; `--full` on a built blend skips to bake).
* Numeric QA (no vision in the loop): `ffmpeg -vf signalstats` per-beat frame
  checks — YAVG ~30–40 (dark ink ground), YMAX > 120 (content present), U/V
  channel bias for the cyan rim; fluid presence via depsgraph-evaluated mesh
  poly counts; bake progress via cache-file counts and status JSONs.
* Master flags: clip availability flips in `DujiangyanMaster.tsx` `AVAILABLE`
  as renders land — the master is renderable at every stage.

---

## 9. v3 Revision (2026-09-01): Diagram-First Rebuild — SUPERSEDES §1–§6

The v2 master was technically valid but **content-empty**: abstract 3D water
(droplet, tsunami, particle dragon) looks pretty and teaches nothing. Review
of the most-viewed Dujiangyan explainers (Bilibili search "都江堰原理": 三分钟了解
都江堰 2.35M views, 都江堰的工作原理 944K, 地理动画视频 185K; the viral 193-second
recreation by 蚂蚁爱游戏/刘勇 with 10M+ plays and comments like “高中没学会，
3分钟看懂了”) shows the format that actually lands:

1. **Plan-view diagrams of the real site**, north-up, terrain-honest — viewer
   watches water *behave* through the structures.
2. **Cause → effect on screen**: animated flow lines, silt dots, ratio counters
   (四六分水 60/40, 二八分沙 80/20, ~4% silt past Baopingkou).
3. **Season toggle** (枯水期 vs 洪水期) shown on the *same* diagram — the whole
   genius is that geometry alone inverts the split.
4. One question per beat, answered visually before the narrator finishes the
   sentence.

### 9.0 v3.2 river-morphology upgrade (2026-09-01)

First v3 render feedback: the river was stick-thin (6–7 pt strokes), so the
spatial story — 峡谷 → 弯道 → 鱼嘴分流 → 金刚堤 → 内江沿山 → 飞沙堰泄槽 → 宝瓶口
— did not read. v3.2 rebuilds `dj_map.py` as real hydrography:

- **Variable-width filled channels** (bank polygons from centerline + width
  profile): gorge river 0.26→0.80, inner 0.42→0.28 (narrow/deep), outer
  0.46→0.92 (wide/shallow), canal 0.28 — width contrast IS the 四六分水
  argument.
- **Terrain bodies**: north massif with the gorge notch, 玉垒山 massif with
  the Baopingkou slot + 离堆 knob + 虎头岩 outcrop, hatched crests.
- **鱼嘴 island teardrop** (nose upstream) + 金刚堤 dike strips; 飞沙堰
  hatched low-weir bar on the inner bank + dashed spill channel rejoining the
  outer river, which now wraps the plain south of the inner river.
- Geometry is machine-checked (`manim/scripts/v3/test_map_geometry.py`):
  anchors on banks, canal inside the slot, channels separated, island
  clearance, spill rejoin, flow directions.
- Beats 1/3/5 close-ups rebuilt on the same `channel()` builder; dam in B1
  now spans the gorge exit and a silt wedge piles upstream (筑坝自埋).

### 9.1 v3 tooling decision

* **Blender is dropped entirely.** All six scenes are **Manim** diagram
  animations (one visual language, deterministic, minutes-per-render, and the
  medium that matches the content: labeled engineering diagrams).
* **Remotion stays** as master assembler: opening/closing fades, lower-third
  subtitles, soundscape, final encode. Same slot machinery, new clips.
* Soundscape, palette, fonts, QA protocol carry over unchanged (§5.2, §8).

### 9.2 v3 storyboard (150 s, six Manim beats, exact slot math)

All beats are 1080p60 Manim renders; `X s → X*60 frames`; hold-last-frame is
baked into each scene (`self.wait()`) so durations match the master exactly.

| # | File (`manim/scripts/v3/`) | Slot (frames) | Duration | Beat |
|---|---|---|---|---|
| 1 | `beat1_problem.py` | 0–1080 | 18 s | The problem: flood & drought & silt; “why not a dam?” → crossed out; Li Bing's answer 分水，不筑坝 |
| 2 | `beat2_map.py` | 1080–2280 | 20 s | The map: Min River exits the mountains; 鱼嘴 / 飞沙堰 / 宝瓶口 drawn and labeled on a stylized north-up plan |
| 3 | `beat3_fishmouth.py` | 2280–4080 | 30 s | Fish Mouth: four-six split with live counters; dry season 60→内江, flood season 60→外江; “no gates — geometry” |
| 4 | `beat4_curvature.py` | 4080–5880 | 30 s | Curved-channel circulation: cross-section spiral (surface→concave, bottom+silt→convex); applied: 80% of silt rides the outer river |
| 5 | `beat5_weir.py` | 5880–7380 | 25 s | Flood cooperation: water slams 虎头岩， spills over 飞沙堰 (240 m × 2.15 m, second silt cut), 宝瓶口 (20.4 m wide) throttles; ~4% silt reaches the plain |
| 6 | `beat6_legacy.py` | 7380–9000 | 27 s | Zoom back to the map; canal fan onto the plain; 深淘滩低作堰 + translation; 2,280 yrs · no dam · no gates · UNESCO 2000 · seal |

### 9.3 v3 subtitles (8 cues, replace §3 speech-derived cues)

| Window (s) | Cue |
|---|---|
| 0.5–9.5 | One river made the richest land in southwest China — and keeps trying to destroy it. |
| 10–17.5 | Summer floods, winter drought, and a riverbed full of silt. Li Bing's answer: no dam at all. |
| 19–37.5 | Three structures, no moving parts: the Fish Mouth splits the river, the Flying-Sand Weir spills the floods, the Bottle-Neck gates the flow. |
| 39–67 | The Fish Mouth divides four–six. Dry season: sixty percent into the irrigation canal. Flood: the split inverts — again sixty percent, now down the flood channel. Not a gate in sight: just the shape of the riverbed. |
| 69–97 | A curving river hides a spiral. Clear surface water hugs the inner bank — into the canal. The silt rides along the bottom, out toward the flood channel: eighty percent of the sand never gets in. |
| 99–122.5 | In flood, water slams the rock face, spills over the low weir — scrubbing out even more silt — while the Bottle-Neck admits only what the plain can drink. Four percent silt. |
| 124–141 | “Dredge the channel deep; keep the weir low.” Two lines of maintenance, recited for 2,280 years. |
| 142–149.3 | No dam. No gates. Just geometry — the river governs itself. 谢谢大家。 |

### 9.4 v3 delivery

* `dujiangyan/dist/dujiangyan_master.mp4` (4K) and
  `dujiangyan_master_1080p.mp4` — rebuilt from the six v3 beats.
* The v2 Blender pipeline (`blender/`, 3 raw clips) is retained on disk for
  reference only; `build_all.sh` gains a `V3=1` mode that renders the six Manim
  beats and skips Blender stages.

---

## 10. Screenplay & Shot Design (v3.1 剧本·分镜) — SUPERSEDES §9.3 cues

> **v3.4 build-order revision (2026-09-01, from `dujiangyan/doc.md`):** the six
> beats now follow the CONSTRUCTION ORDER, and the map itself evolves stage by
> stage — B1 shows the NATURAL Min River (Yulei uncut, one channel turning
> south; narrative 西涝东旱: flooded west, parched plain east of Yulei; payoff
> 劈玉垒，引岷水) → B2 cuts Baopingkou with the 火攻 fire-and-quench inset
> (30 年 → 8 年; stage 0→1) → B3 grows the Fish Mouth + Inner River (stage
> 1→2) and runs the four-six counters → B4 explains the physics (弯道环流 +
> 二八分沙) → B5 adds Feishayan at the dike tail (低作堰, stage 2→3) plus the
> 深淘滩 dredge-to-卧铁 inset and the 4 % silt payoff → B6 shows the finished
> machine and the second maxim 遇弯截角，逢正抽心 (深淘滩，低作堰 now lands in
> B5). `site_map(stage=N)` in `dj_map.py` builds each stage; stage keys match
> v3.2 with unbuilt features as empty VGroups. **On-screen text rule:** no
> text may cover the map/diagram graphics — feature labels sit in clear space
> with thin leader arrows (`Arrow` stroke 2.5) pointing at the feature, and
> the Remotion master letterboxes each clip to 86 % top-anchored so the
> bottom band is pure paper for the English subtitles.
>
> **v3.5 continuity fixes (2026-09-01, user screenshots):** (1) the B2
> fire-and-quench inset moved from the gorge (-3.6, -0.3 — it covered the
> river) onto Yulei's south face at (1.9, -1.8), where the cut actually
> happened; slab top y=-0.95 clears the canal water (south edge y=-0.69),
> caption sits left of the slab, year counter to its right.  (2) CANAL_PATH
> now starts INSIDE the main-river mouth (-2.18, 0.02) and follows the future
> Inner-River line through the slot, so at stage 1 the water reads as one
> connected run (main river -> mountain gap -> plain; pixel-verified at 10
> sample points).  At stage >= 2 the wider Inner River is drawn over the
> shared stretch (bodies z-order: canal under main/inner/outer) and the
> extension disappears beneath it; canal widths taper 0.38 -> 0.26.
>
> **v3.6 overlap/continuity fixes (2026-09-02, user screenshots):** (1) B5
> now fades the docked map (+ its labels) BEFORE the 5-3 flood close-up —
> the close-up river (x -6.4..6.5) used to cross the still-visible map
> junction and read as the Inner River poking out to the west, with two
> Feishayan labels on screen at once.  (2) B3 season titles anchor to the
> zoomed view (camera nets to scale 1.0 after the 0.5 push-in x 2.0 reset);
> dry/flood crossfade instead of stacking.  (3) B3/B4 live counters redraw
> at fixed anchors (always_redraw Integer + static %) so 0->60/0->80 digit
> growth never overlaps the percent sign and no set_value ghosts remain.
> (4) B5 spill note lifted to y=-2.6, above the Remotion subtitle band
> (canvas hides map y < -2.92 at scale 0.86).
>
> **v3.7 magnifier + English-only (2026-09-02, user direction):**
> (1) stage 0/1 rivers are ONE continuous NATURAL channel (gorge -> junction
> -> plain wrap, NATURAL_PTS) so the opening never shows a split river; the
> Outer channel's start cap now hides inside the gorge body at stage 2/3.
> (2) Every detail shot is a MAGNIFYING GLASS (dj_map.lens(): paper disk +
> ring + handle + dashed connector + anchor dot) over the always-visible
> global map: B2 fire/quench anchored at the slot, B3 dry/flood split
> anchored at the fish mouth (map shrinks left via a shared affine
> transform), B4 cross-section spiral anchored at the inner bend, B5 dredge
> + flood-spill lenses.  Lens bottoms stay above the subtitle band.
> (3) ALL on-screen text is English (labels, titles, payoffs, B6 maxim and
> seal "LI BING", CHENGDU map label); Remotion chapter labels and opening
> title stripped to English; Subtitles were already EN-only.
> Manim gotcha: this manim build crashes on Text(weight=None) — pass the
> kwarg conditionally.
>
> **v3.8 magnifier/readability fixes (2026-09-02, user screenshots):**
> (1) beat3 lens: channel centerline paths removed from the lens schematic
> (they poked past the water bodies and read as two stray arrows); dry/flood
> emphasis now animates body fill+stroke only; "Outer River" label DIM ->
> SAND; why-captions resized (14 pt) and repositioned to stay inside the
> lens rim.  (2) beat4: the standing title now fades before the 80/20
> payoff writes its gold title in the same top slot (text overlap fix);
> lens origin made legible — anchor highlight ring (SAND r0.55) on the map
> at the inner bend + brighter lens connector + anchor dot in dj_map.lens()
> + map water fill 0.32 -> 0.5 and path strokes 3.2 -> 4 so the big-picture
> anchor is findable.  lesson: a magnifier needs a VISIBLE anchor in the
> global picture or it seems to pop from nowhere.
>
> **v3.9 frame-by-frame audit + delivery polish (2026-09-03, user
> directive: terrain-first opening, three-structure focus, magnifier
> everywhere, global map always present, zero text overlap/cover):**
> full 1 fps audit of all 150 s (38 contact sheets, every frame read).
> fixes: opening title moved to the empty right-middle plain (was crossing
> the river); B3 payoff moved right+up, line 1 shortened to "Four-six
> split - wet or dry", shrunken map dimmed to 15 % under it (old line
> clipped at the frame edge and its tail sat on the outer-river band);
> B4 lens captions 17 -> 14 pt inside the rim; B5 dredge caption split to
> two 14 pt lines inside the rim, map label "Feishayan - keep it LOW"
> fades when the flood lens covers it, 4 % counter caption moved to the
> dark gap below both channels; B6 stats moved to the camera centre (old
> spot clipped left of the 6-1 camera crop), whole map dimmed to 16 %
> before the maxim/"Nature does the work" (text no longer covers the
> map), LI BING seal stacked below the line instead of right (was cropped
> by the camera edge), end card now HOLDS to the end (the old fade-all
> left ~3 s of black). Opening title text: "Taming the Water with
> Wisdom" (user: tame the water, not taming dragon).

Production method follows the research standard (Kurzgesagt process, BBC
commentary rules, explainer AV-script format):

Production method follows the research standard (Kurzgesagt process, BBC
commentary rules, explainer AV-script format):

1. **Narration is written first** and everything visual is cut to it. The
   visuals *demonstrate*; the narration *explains* — never repeat.
2. **BBC commentary rules**: present tense, short subject-verb-object
   sentences, conversational, no subordinate-clause openers, claims pinned to
   the diagram on screen.
3. **Shot grammar**: every beat alternates 景别 — 全景 (wide map), 中景
   (diagram panel), 近景/特写 (push-in on counters or a single structure) —
   with an explicit 运镜 (push-in / pull-back / pan) and a visible change
   every 4–6 s.
4. **Subtitles** (Netflix Timed-Text style): ≤ 2 lines, ≤ 42 chars/line,
   ≤ 20 chars/s (17 target for a young presenter), bottom safe area, and they
   mirror the spoken lines verbatim.
5. **Narration budget**: ~130 wpm → ≤ 340 words total. The presenter (a
   schoolkid) must be able to speak each shot in one breath.

### 10.1 旁白词 (narration script, timed; speak live over the film)

| Time | Beat | Narration (EN) | 参考 (ZH) |
|---|---|---|---|
| 0:00–0:04 | B1 hook | Here is the Min River — one wild river, running south along the mountains. | 这就是岷江：一条桀骜的河，沿着高山一路南去。 |
| 0:04–0:08 | B1 flood | In summer, meltwater and silt burst out of the gorge and drown the valley. | 夏天，雪水和泥沙冲出峡谷，淹没河谷。 |
| 0:08–0:12 | B1 drought | Mount Yulei turns the river south — the Chengdu Plain, just east, stays bone dry. | 玉垒山把江水拦向南去——一山之隔的成都平原却干渴难耐。 |
| 0:12–0:18 | B1 plan | In 256 BC, governor Li Bing saw the answer: cut through the mountain, and lead the river in. | 公元前 256 年，郡守李冰找到了答案：劈开玉垒山，把江水引进来。 |
| 0:18–0:22 | B2 method | There was no gunpowder. Li Bing used fire and water. | 那时没有火药，李冰用的是火和水。 |
| 0:22–0:26 | B2 fire | Heat the rock red-hot, then quench it with cold river water — it cracks apart. | 先把岩石烧得滚红，再用冰冷的江水浇上去——石头崩裂。 |
| 0:26–0:31 | B2 years | Eight years of burning and digging opened a gap twenty meters wide — like a bottle's mouth. | 烧了八年，凿开一个二十米宽的口子——像瓶口一样。 |
| 0:31–0:35 | B2 name | They called it Baopingkou — the Bottle-Neck. And the Min River reached the plain. | 这就是“宝瓶口”。岷江水，第一次流进了平原。 |
| 0:35–0:38 | B2 bridge | But the flow was unstable — and the silt rode right through. | 但水流不稳，泥沙也跟着进来了。 |
| 0:38–0:44 | B3 build | So Li Bing built a dike in the bend, its head splitting the river like a fish's mouth. | 于是李冰在弯道筑堤，堤头像鱼嘴一样把江水劈开。 |
| 0:44–0:50 | B3 split | The inner channel runs deep; the outer channel runs wide. | 内江窄而深，外江宽而浅。 |
| 0:50–0:56 | B3 dry | In the dry season, the deep inner channel takes sixty percent of the water. | 枯水季，深的内江分走六成水。 |
| 0:56–1:02 | B3 flood | In flood, the wide straight outer channel wins — and the split flips, by itself. | 洪水一来，宽直的外江占上风——比例自己翻转。 |
| 1:02–1:08 | B3 payoff | Four–six, wet or dry. No gates. The shape of the riverbed decides. | 分四六，平潦旱。没有闸门——河床的形状自己会分配。 |
| 1:08–1:13 | B4 bend | Why does the split flip? The secret hides in the bend itself. | 为什么比例会翻转？秘密就藏在弯道里。 |
| 1:13–1:19 | B4 spiral | Water rounding a corner spirals: clean surface water slides toward the inner river. | 弯道水流会打转：表层清水滑向内江一侧。 |
| 1:19–1:25 | B4 silt | The heavy silt hugs the bottom and sweeps along the straight outer river. | 重的泥沙贴着河底，顺直直的外江冲走。 |
| 1:25–1:31 | B4 payoff | Eight parts of sand out, two parts in — the eight-two rule. | 八成沙走外江，两成入内江——二八分沙。 |
| 1:31–1:38 | B4 close | The water reaching the fields runs clearer — year after year. | 流进田里的水，一年比一年清。 |
| 1:38–1:42 | B5 problem | One problem remains: the river never stops bringing silt. | 还有一个问题：泥沙年年都在淤积。 |
| 1:42–1:48 | B5 dredge | So every winter, workers dam the channel and dredge the bed — down to the buried iron bars. | 于是每年冬天，拦断江水，清淤淘滩——一直淘到埋在滩下的卧铁。 |
| 1:48–1:53 | B5 weir | And the spill weir stays LOW: in flood, extra water rolls over it, carrying the silt out. | 飞沙堰必须低：洪水一涨，多余的水翻堰而出，泥沙随之排走。 |
| 1:53–1:58 | B5 throttle | The Bottle-Neck takes only what the fields need; the rest spills home. | 宝瓶口只放农田够用的水，其余从堰顶排回大江。 |
| 1:58–2:03 | B5 payoff | Deep dredge, low weir — shen tao tan, di zuo yan. Four percent silt. | 深淘滩，低作堰——进入灌区的泥沙只剩约 4%。 |
| 2:03–2:09 | B6 manual | Two more lines guide the craft: cut the point at a bend; dredge the middle of a straight. | 还有两句口诀：遇弯截角，逢正抽心。 |
| 2:09–2:15 | B6 time | This system has run for 2,280 years and waters eleven million mu of farmland. | 这个系统运转了 2280 年，灌溉着 1100 多万亩农田。 |
| 2:15–2:21 | B6 theme | No dam. No gates. No moving parts. Only nature, understood. | 不筑坝，不设闸，没有活动部件——只是读懂了自然。 |
| 2:21–2:30 | B6 close | (music) 道法自然 — follow the way of nature. | 道法自然。 |

### 10.2 分镜头表 (shot table)

景别 in a programmatic film = camera frame scale: 全景 wide (full map),
中景 mid (one diagram panel), 近景 close (push-in). 运镜 = animated
`camera.frame` move. Every shot shows a new visual event; nothing repeats
what the narration already says.

**B1 — One Wild River (0:00–0:18)** — stage-0 map, no works yet

| 镜 | 时码 | 景别/运镜 | 画面 | 屏幕文字 |
|---|---|---|---|---|
| 1-1 | 0:00–0:05 | 全景 | The natural river draws on: gorge → bend → south around solid Yulei (no canal, no split) | 岷江 · 一条向南的河 |
| 1-2 | 0:05–0:09 | 全景，缓推 | Summer flood: storm-tint pulses down the single channel; flash at the bend | 夏 · 涝 |
| 1-3 | 0:09–0:13 | 中景 | East of Yulei the plain is dry; thin arrow wants the water; dashed block at the mountain | 旱 · 平原无水 |
| 1-4 | 0:13–0:18 | 中景 | Li Bing's plan written over the empty plain | 劈玉垒，引岷水 |

**B2 — Cutting Baopingkou (0:18–0:38)** — stage 0 → 1

| 镜 | 时码 | 景别/运镜 | 画面 | 屏幕文字 |
|---|---|---|---|---|
| 2-1 | 0:18–0:21 | 全景 | The stage-0 map stands; title top-left | 火攻凿山 · no gunpowder |
| 2-2 | 0:21–0:28 | 特写 inset | Fire-and-quench: flames heat the slab red, cold drops quench, steam, cracks; year counter 0→8 | 烧石泼水 · 30 年 → 8 年 |
| 2-3 | 0:28–0:38 | 全景 | Solid Yulei crossfades to massif + 离堆 (slot opens); canal + fan grow; water pulses to 成都; gold label + leader arrow; payoff mid-plain | 宝瓶口 · 20 m×40 m×80 m / 岷江水，入平原 |

**B3 — Building the Fish Mouth (0:38–1:08)** — stage 1 → 2

| 镜 | 时码 | 景别/运镜 | 画面 | 屏幕文字 |
|---|---|---|---|---|
| 3-1 | 0:38–0:45 | 全景→中景推 | Stage-1 map (one river + canal, no island); island grows in the bend, inner channel opens; push to the split | 鱼嘴 · 分水 |
| 3-2 | 0:45–0:53 | 近景 | Split diagram; flow widths 60/40; live counters; caption 枯水期 | 内江 60% / 外江 40% |
| 3-3 | 0:53–1:01 | 近景，同机位 | Season toggle: widths animate to 40/60; counters roll | 洪水期 · 内江 40% / 外江 60% |
| 3-4 | 1:01–1:08 | 中景回拉 | Settle; no-gate line | 分四六，平潦旱 · no gates |

**B4 — Curvature (1:08–1:38)** — physics of the split (map at stage 2)

| 镜 | 时码 | 景别/运镜 | 画面 | 屏幕文字 |
|---|---|---|---|---|
| 4-1 | 1:08–1:15 | 中景 | A river bend draws on (pure geometry); flow train runs | 弯道 · the bend |
| 4-2 | 1:15–1:24 | 中景 | Cross-section: spiral circulation; cyan surface dots slide to the concave side, silt dots hug the bottom the other way | 表层→内江 · 底层→外江 |
| 4-3 | 1:24–1:32 | 中景→全景 | Spiral panel docks beside the stage-2 map; silt streams down the outer river | canal mouth on the clean side |
| 4-4 | 1:32–1:38 | 近景 | Counter spins to 80%; caption 二八分沙 | 80% · 二八分沙 |

**B5 — 岁修: Deep Dredge, Low Weir (1:38–2:03)** — stage 2 → 3

| 镜 | 时码 | 景别/运镜 | 画面 | 屏幕文字 |
|---|---|---|---|---|
| 5-1 | 1:38–1:42 | 全景 | Stage-2 map; the gold weir grows at the dike tail + spill dashes (低作堰 build moment) | 岁修 · 深淘滩，低作堰 |
| 5-2 | 1:42–1:48 | 特写 inset | 深淘滩: water drains, 杩槎 tripod, dredge arrows, three gold 卧铁 bars flash at pit bottom | 深淘滩 · 淘至卧铁 |
| 5-3 | 1:48–1:56 | 特写 | Flood close-up: level rises over the crest; silt dots arc over 飞沙堰 back to the outer river | 洪水 · flood stage |
| 5-4 | 1:56–2:03 | 近景 | Counter 20→4%; clean canal flow continues | ~4% silt |

**B6 — Legacy (2:03–2:30)** — the finished machine (stage 3)

| 镜 | 时码 | 景别/运镜 | 画面 | 屏幕文字 |
|---|---|---|---|---|
| 6-1 | 2:03–2:10 | 全景 | Full stage-3 map; canal fan grows; gold plain; stats in clear plain area | 2,280 years · 1,164 万亩 |
| 6-2 | 2:10–2:18 | 中景 | Calligraphy brush-writes 遇弯截角，逢正抽心 + translation | Cut the bend · dredge the straight |
| 6-3 | 2:18–2:26 | 中景 | Big gold 道法自然; red seal 李冰 stamps | 道法自然 · 李冰印 |
| 6-4 | 2:26–2:30 | 全景→收 | End card: 巧借自然 · Taming the Dragon with Wisdom; fade out | end card |

### 10.3 字幕规范 (subtitles)

* English verbatim of §10.1; max 2 lines, ≤ 42 chars/line, ≤ 20 chars/s
  (target ≤ 17), sentence-case, bottom 15% safe area, Noto Serif CJK SC.
* Timed to the narration windows above (see `remotion/src/Subtitles.tsx`).
* Chinese 参考 lines stay in the spec for rehearsal only — they are not
  rendered (the presenter speaks English; on-screen Chinese labels live in
  the Manim diagrams).
