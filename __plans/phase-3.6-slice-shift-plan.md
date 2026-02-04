# Phase 3.6: Slice/Shift Effect Implementation Plan

## Overview
Implement a horizontal slice displacement effect that divides the image into bands and shifts them left/right randomly, creating the classic "broken TV signal" glitch aesthetic.

## Files to Create/Modify

### 1. Create Fragment Shader
**File:** `src/effects/shaders/slice-shift/fragment.glsl`

```glsl
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;

uniform float u_intensity;    // 0-1: maximum horizontal displacement
uniform float u_sliceCount;   // 5-100: number of horizontal bands
uniform float u_sliceFill;    // 0-1: percentage of slices that shift
uniform float u_seed;         // 0-1000: randomization seed

varying vec2 vUv;

// Pseudo-random hash function (same as noise effect)
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec2 uv = vUv;

  // Determine which slice this pixel belongs to
  float slice = floor(uv.y * u_sliceCount);

  // Generate random value for this slice (0-1)
  float sliceRand = hash(vec2(slice, u_seed));

  // Only shift if random value exceeds threshold (1 - sliceFill)
  if (sliceRand > (1.0 - u_sliceFill)) {
    // Generate offset direction and magnitude (-1 to 1)
    float offset = (hash(vec2(slice + 100.0, u_seed)) * 2.0 - 1.0) * u_intensity;
    uv.x += offset;
  }

  // Clamp UV to prevent sampling outside texture (or use wrap mode)
  uv.x = clamp(uv.x, 0.0, 1.0);

  gl_FragColor = texture2D(u_texture, uv);
}
```

### 2. Create Effect Definition
**File:** `src/effects/definitions/sliceShift.ts`

```typescript
import { registerEffect } from "@/effects/registry";
import vertexShader from "@/effects/shaders/common/passthrough.vert";
import fragmentShader from "@/effects/shaders/slice-shift/fragment.glsl";
import type { EffectDefinition } from "@/effects/types";

const sliceShift: EffectDefinition = {
	id: "sliceShift",
	name: "Slice Shift",
	category: "displacement",
	description: "Horizontal band displacement — classic glitch effect.",
	parameters: [
		{
			name: "intensity",
			type: "float",
			default: 0.1,
			min: 0,
			max: 1,
			step: 0.01,
			label: "Intensity",
		},
		{
			name: "sliceCount",
			type: "float",
			default: 20,
			min: 5,
			max: 100,
			step: 1,
			label: "Slice Count",
		},
		{
			name: "sliceFill",
			type: "float",
			default: 0.5,
			min: 0,
			max: 1,
			step: 0.01,
			label: "Slice Fill",
		},
		{
			name: "seed",
			type: "float",
			default: 0,
			min: 0,
			max: 1000,
			step: 1,
			label: "Seed",
		},
	],
	vertexShader,
	fragmentShader,
};

registerEffect(sliceShift);
```

### 3. Update Barrel Export
**File:** `src/effects/definitions/index.ts`

Add import in alphabetical order:
```typescript
import "./crt";
import "./noise";
import "./passthrough";
import "./pixelSort";
import "./rgbShift";
import "./sliceShift";  // Add this line
```

## Implementation Steps

1. Create shader directory: `mkdir src/effects/shaders/slice-shift/`
2. Write fragment shader with slice-based UV displacement
3. Create effect definition with 4 parameters
4. Update barrel export (alphabetical order)
5. Test effect in dev panel
6. Test stacking with RGB Shift, CRT, Noise
7. Run linter: `npm run lint`
8. Run build: `npm run build`

## Shader Algorithm Details

### Slice Calculation
```glsl
float slice = floor(uv.y * u_sliceCount);
```
- Divides vertical space into discrete bands
- `sliceCount=20` creates 20 horizontal bands
- Each pixel gets assigned to one slice

### Random Selection (sliceFill)
```glsl
float sliceRand = hash(vec2(slice, u_seed));
if (sliceRand > (1.0 - u_sliceFill)) { ... }
```
- Each slice gets a deterministic random value (0-1)
- `sliceFill=0.5` means ~50% of slices will shift
- `sliceFill=1.0` means all slices shift
- `sliceFill=0.0` means no slices shift

### Offset Calculation
```glsl
float offset = (hash(vec2(slice + 100.0, u_seed)) * 2.0 - 1.0) * u_intensity;
```
- Second hash call with different input for offset magnitude
- Maps 0-1 to -1 to +1 range (bidirectional shift)
- Scaled by intensity parameter

### Edge Handling Options
- **Clamp (default):** `uv.x = clamp(uv.x, 0.0, 1.0)` — edge pixels repeat
- **Wrap:** `uv.x = fract(uv.x)` — wraps around to other side
- **Black:** Check bounds and output black if outside

## Default Parameter Values

| Parameter | Default | Rationale |
|-----------|---------|-----------|
| intensity | 0.1 | Subtle displacement, not overwhelming |
| sliceCount | 20 | Visible bands, not too fine |
| sliceFill | 0.5 | Half the slices shift |
| seed | 0 | Reproducible starting pattern |

## Verification Checklist

1. Run dev server: `npm run dev`
2. Upload a test image
3. Enable Slice Shift effect in dev panel
4. Verify:
   - Horizontal bands visibly shift left/right
   - Intensity slider controls displacement amount
   - Slice Count slider changes band thickness
   - Slice Fill slider controls how many bands shift
   - Seed slider produces different patterns
5. Test stacking:
   - Slice Shift + RGB Shift = chromatic displaced bands
   - Slice Shift + CRT = retro corruption
   - Slice Shift + Noise = grainy glitch
6. Run linter: `npm run lint`
7. Run build: `npm run build`
