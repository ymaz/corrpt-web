# Corrpt Web App - Effects Reference

This document provides a comprehensive overview of all effects in the Corrpt Web App, including implemented and planned effects.

## Effects Overview

| Phase | Effect | Category | Description | Best Stacking Partners |
|-------|--------|----------|-------------|------------------------|
| 3.1 | Passthrough | color | Identity effect — outputs input unchanged | N/A (utility) |
| 3.2 | RGB Shift | color | Chromatic aberration — separates RGB channels directionally | Pixel Sort, CRT, Noise |
| 3.3 | Pixel Sort | aesthetic | Brightness-based sorting approximation with directional blur | RGB Shift, Smear |
| 3.4 | CRT | aesthetic | Retro CRT monitor with scanlines, curvature, vignette | RGB Shift, Noise, Slice/Shift |
| 3.5 | Noise | aesthetic | Film grain / static noise overlay | All effects |
| 3.6 | Slice/Shift | displacement | Horizontal band displacement — classic glitch | RGB Shift, CRT, Noise, Vertical Tear |
| 3.7 | Block Glitch | displacement | Rectangular block displacement | Noise, RGB Shift |
| 3.8 | Smear | displacement | Brightness-based pixel stretching | Pixel Sort, RGB Shift |
| 3.9 | Vertical Tear | displacement | Vertical column displacement | Slice/Shift (cross-hatch) |

---

## Implemented Effects

### RGB Shift (Phase 3.2)

**ID:** `rgbShift`
**Category:** color
**Description:** Separates RGB channels and offsets them directionally.

**Algorithm:**
1. Calculate offset vector from intensity and angle
2. Sample R channel at UV - offset
3. Sample G channel at original UV
4. Sample B channel at UV + offset
5. Combine into final color

**Parameters:**

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| intensity | float | 0.5 | 0-1 | Strength of channel offset |
| angle | float | 0.0 | 0-6.28 | Direction angle in radians |
| animated | bool | false | — | Enable time-based animation |

---

### Pixel Sort (Phase 3.3)

**ID:** `pixelSort`
**Category:** aesthetic
**Description:** GPU-friendly pixel sorting approximation using brightness threshold and directional blur.

**Algorithm:**
1. Calculate pixel brightness using luminance formula
2. If brightness falls within threshold range, apply directional smear
3. Sum samples across direction with configurable spread
4. Average samples for final color

**Parameters:**

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| threshold | float | 0.25 | 0-1 | Lower brightness bound |
| upperThreshold | float | 0.75 | 0-1 | Upper brightness bound |
| spread | float | 40 | 0-200 | Blur/sort distance in pixels |
| direction | float | 0.0 | 0-1 | 0=horizontal, 1=vertical |

---

### CRT (Phase 3.4)

**ID:** `crt`
**Category:** aesthetic
**Description:** Simulates retro CRT monitor with scanlines, curvature, and vignette.

**Algorithm:**
1. Apply barrel distortion for screen curvature (curveUV function)
2. Check bounds — black fill for curved edges
3. Apply horizontal scanlines using sin() on UV.y
4. Apply vignette darkening at edges

**Parameters:**

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| lineIntensity | float | 0.3 | 0-1 | Darkness of scanlines |
| lineCount | float | 300 | 100-800 | Number of scanlines |
| curvature | float | 0.1 | 0-0.5 | Barrel distortion amount |
| vignette | float | 0.3 | 0-1 | Edge darkening strength |

---

### Noise (Phase 3.5)

**ID:** `noise`
**Category:** aesthetic
**Description:** Adds film grain or static noise to the image.

**Algorithm:**
1. Scale UV coordinates for grain size control
2. Offset by seed for pattern variation
3. Generate hash-based pseudo-random values (-1 to 1 range)
4. Add noise to color (monochrome or per-channel)
5. Clamp output to valid range

**Parameters:**

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| intensity | float | 0.15 | 0-1 | Noise strength |
| scale | float | 1 | 1-100 | Grain coarseness (higher = coarser) |
| seed | float | 0 | 0-1000 | Pattern randomization |
| monochrome | bool | true | — | Grayscale vs colored noise |

---

## Pending Effects

### Slice/Shift (Phase 3.6)

**ID:** `sliceShift` (planned)
**Category:** displacement
**Description:** Horizontal band displacement — classic "broken TV signal" glitch.

**Algorithm:**
1. Divide image into horizontal bands: `floor(uv.y * sliceCount)`
2. Generate pseudo-random offset per slice using hash function
3. Shift UV.x by offset (positive=right, negative=left)
4. Threshold parameter to affect only some slices randomly

**Planned Parameters:**

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| intensity | float | 0.1 | 0-1 | Maximum horizontal displacement |
| sliceCount | float | 20 | 5-100 | Number of horizontal bands |
| sliceFill | float | 0.5 | 0-1 | Percentage of slices that shift |
| seed | float | 0 | 0-1000 | Randomization seed |

**Reference:** [Harry Alisavakis - Glitch Image Effect](https://halisavakis.com/my-take-on-shaders-glitch-image-effect/)

---

### Block Glitch (Phase 3.7)

**ID:** `blockGlitch` (planned)
**Category:** displacement
**Description:** Rectangular block displacement for "corrupted video frame" aesthetic.

**Algorithm:**
1. Define grid by quantizing UV: `floor(uv * gridSize) / gridSize`
2. Generate random offset per block using block coordinates as seed
3. Apply XY offset to UV within block boundaries
4. Optional: tint displaced blocks with RGB channel bias

**Planned Parameters:**

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| intensity | float | 0.1 | 0-1 | Maximum block displacement |
| gridSizeX | float | 8 | 2-32 | Horizontal block count |
| gridSizeY | float | 16 | 4-64 | Vertical block count |
| threshold | float | 0.5 | 0-1 | Percentage of blocks that displace |
| seed | float | 0 | 0-1000 | Randomization seed |

**Reference:** [Agate Dragon Games - Block Glitch Shader](https://agatedragon.blog/2023/12/21/glitch-shader-effect-using-blocks-part-2/)

---

### Smear (Phase 3.8)

**ID:** `smear` (planned)
**Category:** displacement
**Description:** Brightness-based pixel stretching — single-frame datamosh approximation.

**Algorithm:**
1. Sample pixels along horizontal/vertical scanline
2. Detect brightness threshold crossings (edge detection)
3. At threshold boundaries, stretch pixels by repeating UVs
4. Falloff parameter controls smear fade distance

**Planned Parameters:**

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| intensity | float | 0.2 | 0-1 | Smear length / stretch amount |
| threshold | float | 0.5 | 0-1 | Brightness threshold for smear trigger |
| direction | float | 0.0 | 0-1 | 0=horizontal, 1=vertical |
| falloff | float | 0.5 | 0-1 | How quickly smear fades |
| seed | float | 0 | 0-1000 | Randomization for smear origins |

**Reference:** [Haxademic - Pseudo Pixel Sorting](https://github.com/cacheflowe/haxademic/blob/master/data/haxademic/shaders/filters/glitch-pseudo-pixel-sorting.glsl)

**Note:** True datamoshing requires frame history (motion vectors). This is a single-frame approximation that creates similar visual results.

---

### Vertical Tear (Phase 3.9)

**ID:** `verticalTear` (planned)
**Category:** displacement
**Description:** Vertical column displacement — perpendicular complement to Slice/Shift.

**Algorithm:**
1. Divide image into vertical columns: `floor(uv.x * columnCount)`
2. Generate random vertical offset per column
3. Shift UV.y by offset (up/down displacement)
4. Threshold parameter to affect only some columns randomly

**Planned Parameters:**

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| intensity | float | 0.1 | 0-1 | Maximum vertical displacement |
| columnCount | float | 20 | 5-100 | Number of vertical bands |
| columnFill | float | 0.5 | 0-1 | Percentage of columns that shift |
| seed | float | 0 | 0-1000 | Randomization seed |

**Stacking Note:** Slice/Shift + Vertical Tear = grid-like cross-hatch destruction

---

## Effect Categories

| Category | Effects | Purpose |
|----------|---------|---------|
| **color** | Passthrough, RGB Shift | Color manipulation and channel effects |
| **aesthetic** | Pixel Sort, CRT, Noise | Visual style and texture effects |
| **displacement** | Slice/Shift, Block Glitch, Smear, Vertical Tear | Pixel position manipulation |

---

## Recommended Effect Stacks

| Stack Name | Effects | Visual Result |
|------------|---------|---------------|
| **Classic Glitch** | RGB Shift + Slice/Shift + Noise | Broken TV signal aesthetic |
| **Retro Corruption** | CRT + RGB Shift + Noise | VHS tape damage look |
| **Digital Chaos** | Block Glitch + RGB Shift + Noise | Corrupted video codec |
| **Total Destruction** | Slice/Shift + Vertical Tear | Cross-hatch grid displacement |
| **Organic Melt** | Smear + Pixel Sort | Fluid, melting pixels |
| **Cyberpunk** | RGB Shift + CRT + Pixel Sort | Futuristic display glitch |

---

## Technical Notes

### Uniform Naming Convention
All effect parameters map to shader uniforms with `u_` prefix:
- Parameter `intensity` → Uniform `u_intensity`
- Parameter `sliceCount` → Uniform `u_sliceCount`

### Standard Uniforms (all effects)
- `u_texture` (sampler2D): Input texture from previous pass
- `u_resolution` (vec2): Image dimensions in pixels
- `u_time` (float): Elapsed time in seconds

### Effect Pipeline
Effects are processed in order using ping-pong FBOs:
```
Original Texture → Effect 1 → Effect 2 → ... → Effect N → Screen
```
