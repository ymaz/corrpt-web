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

#### Three.js Rendering Setup

- **Camera**: OrthographicCamera (left: -1, right: 1, top: 1, bottom: -1) for 2D rendering
- **Geometry**: Full-screen quad (PlaneGeometry)
- **Materials**: ShaderMaterial for each effect with custom GLSL
- **Renderer**: WebGLRenderer with `preserveDrawingBuffer: true` for export

### Folder Structure

```
src/
├── app/                    # App-level config (App.tsx, main.tsx, providers.tsx)
├── components/
│   ├── canvas/            # Three.js canvas components (EffectCanvas, ImagePlane, EffectMaterial)
│   ├── controls/          # Effect control UI (EffectPanel, ParameterSlider, EffectCard)
│   ├── input/             # Image input (DropZone, FileUpload, CameraCapture)
│   ├── layout/            # Layout components (Header, Sidebar, Footer, MainLayout)
│   ├── export/            # Export functionality (ExportModal, FormatSelector, QualitySlider)
│   └── ui/                # Shared UI primitives (Button, Slider, Modal, Tooltip)
├── effects/
│   ├── shaders/           # GLSL shader files organized by effect
│   │   ├── rgb-shift/    # fragment.glsl, vertex.glsl, index.ts
│   │   ├── pixel-sort/
│   │   └── common/       # Shared utilities (noise.glsl, color.glsl, distortion.glsl)
│   ├── processors/        # Effect processor classes (BaseEffect, RGBShiftEffect, PixelSortEffect)
│   ├── EffectPipeline.ts
│   ├── EffectRegistry.ts
│   └── types.ts
├── hooks/                 # Custom React hooks (useImageLoader, useEffectProcessor, useCanvasExport, useCamera)
├── store/                 # Zustand store slices (imageStore, effectStore, uiStore, index.ts)
├── lib/                   # Utilities (three-utils, image-utils, export-utils, constants)
├── styles/                # Global styles (globals.css, fonts.css, animations.css)
└── types/                 # TypeScript definitions (effects.d.ts, glsl.d.ts, global.d.ts)
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

### Image Loading Pipeline

File/Blob → FileReader → Image element → THREE.Texture

- Handle EXIF orientation automatically
- Validate file type and size
- Calculate aspect-correct sizing for canvas display

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
