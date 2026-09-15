# Interstellar Black Hole (Gargantua) 🕳️

A physically inspired 3D model and render of a supermassive black hole like **Gargantua** from Christopher Nolan's *Interstellar*, created in Blender 5.2 LTS.

![Gargantua](gargantua.png)

---

## 🌌 Key Physics & Visual Features

1. **Event Horizon (事件视界)**:
   - Central pitch-black sphere ($R = 2.0$) using a pure absorption/holdout shader representing the boundary from which nothing, not even light, can escape.
2. **Einstein Photon Ring (光子环)**:
   - A razor-thin, intensely bright cyan-white rim ($R \approx 2.01 - 2.05$) right outside the event horizon where photon orbits become unstable.
3. **Gravitational Lensing Halo (引力透镜光晕)**:
   - Spacetime curvature is simulated using physical optical refraction ($IOR = 1.20$) on a gravitational lensing sphere surrounding the black hole.
   - Light rays from the rear of the accretion disk curve over the top and under the bottom of the black hole, creating the iconic continuous circular halo.
4. **Procedural Plasma Accretion Disk (吸积盘)**:
   - Dense annulus mesh ($R_{in} = 2.45, R_{out} = 10.5$) with multi-layered procedural noise filaments.
   - Temperature color gradient: ultra-hot cyan-white at the Innermost Stable Circular Orbit (ISCO), transitioning into intense golden plasma and deep amber/red outer dust.
5. **Relativistic Doppler Beaming (相对论多普勒效应)**:
   - The plasma rotates at relativistic speeds. The side approaching the observer (left) is amplified in brightness and blue-shifted, while the receding side (right) is dimmer and red-shifted.
6. **Compositing & Post-Processing**:
   - AgX High-Contrast color management.
   - High-quality `Fog Glow` glare bloom simulating intense plasma radiance.
   - Deep space environment with procedural starfield.

---

## 📁 Files

- `gargantua.blend`: Complete Blender scene file ready to open and explore in the Blender viewport.
- `gargantua.png`: 1080p high-resolution rendered output.
- `make_gargantua.py`: Python automation script to programmatically build the scene and render.
- `index.html`: Interactive web presentation and educational guide.

---

## 🚀 How to Run / Render

### Open in Blender GUI
```bash
blender gargantua.blend
```

### Re-render via Command Line
```bash
blender -b --factory-startup -P make_gargantua.py
```
Output render will be generated at `/tmp/gargantua_masterpiece.png` or your configured path.
