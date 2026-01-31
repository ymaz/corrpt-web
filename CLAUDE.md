# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Corrpt Web App** is a client-side SPA for applying real-time glitch and distortion effects to photos using WebGL/Three.js. Inspired by the Glitché iOS app, this web application transforms photos into glitch art entirely in the browser with no server processing.

## Technology Stack

- **Framework**: React 19.x + TypeScript 5.x
- **Build Tool**: Vite 5.x
- **Graphics**: Three.js (r160+) + @react-three/fiber + @react-three/drei
- **State Management**: Zustand (global state) + React Context (theme)
- **UI Components**: Radix UI primitives
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Linting/Formatting**: Biome (use default config)
- **Shader Loading**: vite-plugin-glsl

## Development Commands

```bash
# Development
npm run dev              # Start dev server with HMR

# Build
npm run build            # TypeScript check + production build

# Preview
npm run preview          # Preview production build locally

# Linting
npm run lint             # Run Biome check on all files
```

## Architecture

### High-Level Structure

The application follows a three-stage pipeline:

1. **Input Stage**: File upload, drag-and-drop, or WebRTC camera capture
2. **Processing Stage**: Three.js scene with WebGL shaders applying effects
3. **Output Stage**: Canvas export to PNG/JPEG with Web Share API support

### Core Systems

#### Effect Pipeline Architecture

Effects are processed using a multi-pass rendering system with Framebuffer Objects (FBOs):

```
Original Texture → Effect 1 (FBO 1) → Effect 2 (FBO 2) → Effect N (FBO N) → Screen
```

Each effect:
- Reads from the previous FBO (or original texture)
- Applies its shader transformation
- Writes to the next FBO in the chain
- Final pass renders to screen canvas

**Key Classes:**
- `BaseEffect`: Abstract base class for all effects (defines interface)
- `EffectPipeline`: Manages multi-pass rendering and effect ordering
- `EffectRegistry`: Effect discovery and metadata management

#### State Management (Zustand)

The store is organized into three slices:

**imageStore**:
- `texture`: THREE.Texture | null
- `dimensions`: { width, height }
- `originalDataUrl`: string | null
- `isLoading`, `error`

**effectStore**:
- `activeEffects`: string[] (effect IDs)
- `parameters`: Record<effectId, Record<paramName, value>>
- `previewMode`: 'split' | 'full' | 'compare'

**uiStore**:
- `sidebarOpen`: boolean
- `activeModal`: 'export' | 'camera' | 'source' | null
- `theme`: 'dark' | 'light'

State changes automatically trigger uniform updates in shaders via useEffect subscriptions.

#### Three.js Rendering Setup (Implemented — Phase 1.2)

- **Canvas**: R3F `<Canvas orthographic linear flat>` with `RENDERER_SETTINGS` from `src/lib/constants.ts`
- **Camera**: R3F orthographic camera (`zoom: 1, position: [0, 0, 1]`). Viewport units adapt to canvas size.
- **Geometry**: `PlaneGeometry(1, 1)` scaled by viewport dimensions for aspect-correct contain/letterbox display
- **Materials**: drei `shaderMaterial()` creates `PassthroughMaterial` registered as `<passthroughMaterial>` JSX element
- **Renderer**: WebGLRenderer with `preserveDrawingBuffer: true`, `alpha: true`, `antialias: false`, `powerPreference: "high-performance"`
- **Color Management**: `linear={true}` + `flat={true}` on Canvas + `NoColorSpace` on textures — bypasses Three.js color management for raw sRGB passthrough, avoids double-gamma issues with ShaderMaterial
- **Render Loop**: `useFrame` in `ImagePlane` increments `u_time` uniform each frame

#### Passthrough Shader (Standard Uniform Interface)

All effect shaders share the vertex shader `src/effects/shaders/common/passthrough.vert` and must accept these uniforms:
- `u_texture` (sampler2D): Input texture from previous pass
- `u_resolution` (vec2): Image dimensions in pixels
- `u_time` (float): Elapsed time in seconds

#### Image Loading (Implemented — Phase 1.2)

`useImageLoader` hook (`src/hooks/useImageLoader.ts`) manages the File → THREE.Texture pipeline as local React state. Will be migrated to Zustand in Phase 1.3.

- Validates file type (`SUPPORTED_IMAGE_TYPES`) and size (`MAX_FILE_SIZE` = 50MB)
- Pipeline: `File → FileReader → HTMLImageElement → THREE.Texture`
- Texture config: `needsUpdate`, `NoColorSpace`, `LinearFilter` min/mag
- Disposes texture on unmount and on new image load

### Folder Structure

```
src/
├── app/
│   ├── App.tsx              # [1.2] Test harness with EffectCanvas + file input
│   └── main.tsx             # [1.1] React entry point
├── components/
│   ├── canvas/
│   │   ├── EffectCanvas.tsx # [1.2] R3F Canvas wrapper (orthographic, linear, flat)
│   │   ├── EffectMaterial.tsx # [1.2] drei shaderMaterial + JSX type augmentation
│   │   └── ImagePlane.tsx   # [1.2] Aspect-correct fullscreen quad with u_time
│   ├── controls/            # (Phase 4) Effect control UI
│   ├── input/               # (Phase 2) Image input (DropZone, FileUpload, CameraCapture)
│   ├── layout/              # (Phase 4) Layout components (Header, Sidebar, Footer)
│   ├── export/              # (Phase 5) Export functionality
│   └── ui/                  # Shared UI primitives (Radix-based)
├── effects/
│   ├── shaders/
│   │   ├── common/
│   │   │   ├── passthrough.vert  # [1.2] Standard vertex shader (shared by all effects)
│   │   │   └── passthrough.frag  # [1.2] Identity fragment shader (standard uniform interface)
│   │   ├── rgb-shift/       # (Phase 3) fragment.glsl, vertex.glsl
│   │   └── pixel-sort/      # (Phase 3)
│   ├── processors/          # (Phase 3) Effect processor classes
│   ├── EffectPipeline.ts    # (Phase 3)
│   ├── EffectRegistry.ts    # (Phase 3)
│   └── types.ts             # (Phase 3)
├── hooks/
│   └── useImageLoader.ts    # [1.2] File → THREE.Texture pipeline (local state)
├── store/                   # (Phase 1.3) Zustand store slices
├── lib/
│   └── constants.ts         # [1.2] RENDERER_SETTINGS, SUPPORTED_IMAGE_TYPES, MAX_FILE_SIZE
├── styles/
│   └── globals.css          # [1.1] Tailwind import + base styles
└── types/
    └── glsl.d.ts            # [1.1] Shader import type declarations
```

## Initial Effects

### RGB Shift (Chromatic Aberration)
Separates RGB channels and offsets them directionally.

**Shader Algorithm:**
1. Calculate offset vector from intensity and angle
2. Sample R channel at UV - offset
3. Sample G channel at original UV
4. Sample B channel at UV + offset
5. Combine into final color

**Parameters:**
- `intensity` (0.0-1.0): Strength of channel offset
- `angle` (0.0-6.28): Direction angle in radians
- `animated` (bool): Enable time-based animation

### Pixel Sort
GPU-friendly approximation of pixel sorting using brightness threshold detection and directional blur.

**Shader Algorithm:**
1. Calculate pixel brightness
2. If brightness in threshold range, apply horizontal smear effect
3. Sum samples across direction with configurable spread

**Parameters:**
- `threshold` (0.0-1.0): Lower brightness bound
- `upperThreshold` (0.0-1.0): Upper brightness bound
- `spread` (0.0-0.1): Blur amount
- `direction` (0.0-1.0): 0=horizontal, 1=vertical

## Implementation Notes

### Shader Uniform Management

Uniforms flow from UI controls → Zustand store → Three.js materials:

```typescript
// UI slider onChange triggers store update
setEffectParam('rgbShift', { intensity: 0.75 });

// useEffect subscription updates material
material.uniforms.u_intensity.value = 0.75;

// Shader receives updated value
uniform float u_intensity;
```

### Image Loading Pipeline (Implemented — Phase 1.2)

File → FileReader → HTMLImageElement → THREE.Texture (in `useImageLoader` hook)

- Validates file type (JPEG/PNG/WebP) and size (max 50MB)
- Texture config: `needsUpdate`, `NoColorSpace`, `LinearFilter`
- Aspect-correct display via viewport contain/letterbox in `ImagePlane`
- EXIF orientation handling: deferred to Phase 2.1

### Export at Full Resolution

Use off-screen WebGLRenderer at original image dimensions:
1. Create temporary renderer with original dimensions
2. Render scene with all active effects
3. Extract via `toDataURL()` with format/quality
4. Trigger download or Web Share API
5. Dispose renderer to prevent memory leaks

## Development Stages

The project follows a 5-stage development plan:

1. **Foundation** (Week 1-2): Project setup, Three.js canvas, state management
   - Phase 1.1: Project setup — **DONE**
   - Phase 1.2: Core Three.js setup — **DONE**
   - Phase 1.3: State management — next
2. **Input System** (Week 2): File upload and camera capture
3. **Effect System** (Week 3): Effect architecture, RGB Shift, Pixel Sort
4. **User Interface** (Week 4): Layout, effect controls, visual polish
5. **Export & Finishing** (Week 5): Export system, testing, deployment

Refer to `__plans/corrpt-web-app-dev-stages-v1.md` for detailed phase breakdown.

## Performance Targets

- First Contentful Paint: < 1.5s
- Canvas render: ≥ 60fps
- Effect parameter change latency: < 16ms
- Export processing: < 2s
- Memory usage (4K image): < 200MB

## Path Aliases

Configure in `tsconfig.json` and `vite.config.ts`:
- `@/components` → `src/components`
- `@/hooks` → `src/hooks`
- `@/store` → `src/store`
- `@/effects` → `src/effects`
- `@/lib` → `src/lib`
- `@/types` → `src/types`

## GLSL Import Configuration

Use `vite-plugin-glsl` to import shaders as strings:

```typescript
import fragmentShader from './shader.glsl';
import vertexShader from './vertex.glsl';

const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: { /* ... */ },
});
```

Configure in `vite.config.ts`:
```typescript
glsl({
  include: ['**/*.glsl', '**/*.vert', '**/*.frag'],
  compress: true,
})
```

## Browser Compatibility

Target: Chrome 90+, Firefox 90+, Safari 14+, Edge 90+, iOS Safari 14+, Chrome Android 90+

## Key Design Decisions

1. **Client-side only**: All processing in browser, no server required
2. **React Three Fiber**: Preferred over vanilla Three.js for React integration
3. **Zustand over Redux**: Lightweight state management
4. **Radix UI**: Accessible, unstyled primitives for custom design
5. **Biome**: Modern, fast linting/formatting (use default config)
6. **FBO chain**: Multi-pass rendering for effect stacking
7. **GPU shaders**: All effects implemented as GLSL fragment shaders for performance
8. **drei `shaderMaterial()`** over raw `THREE.ShaderMaterial`: Typed uniform props, R3F reconciler key, reusable class pattern
9. **`PlaneGeometry(1,1)` + scale** over `PlaneGeometry(2,2)`: R3F orthographic camera adapts to canvas size; scaling a unit quad by viewport dimensions is the correct R3F approach
10. **`linear` + `flat` + `NoColorSpace`**: Bypasses Three.js color management entirely for raw sRGB passthrough — correct for sRGB content on sRGB monitors
11. **`.glsl` files** over inline strings: Validates vite-plugin-glsl pipeline, enables shader reuse, proper syntax highlighting

## Testing

- **Playwright** is installed as a dev dependency for headless browser validation
- Regression test script: `test-assets/validate-canvas.mjs` — starts dev server, uploads test image, takes screenshots at multiple viewport sizes
- Generated screenshots are in `test-assets/screenshots/` (gitignored)
- Run: `node test-assets/validate-canvas.mjs`
