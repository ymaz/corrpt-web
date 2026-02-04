# Corrpt Web - Image Pipeline

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           CORRPT WEB - IMAGE PIPELINE                         ║
╚═══════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────────┐
│  1. INPUT STAGE                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   ┌──────────┐     ┌────────────┐     ┌──────────────┐     ┌───────────────┐   │
│   │   File   │────▶│ FileReader │────▶│ HTMLImage    │────▶│ THREE.Texture │   │
│   │(drop/btn)│     │.readAsData │     │ Element      │     │               │   │
│   └──────────┘     │   URL()    │     │ (decode)     │     │ NoColorSpace  │   │
│                    └────────────┘     └──────────────┘     │ LinearFilter  │   │
│                          │                   │             └───────┬───────┘   │
│                          ▼                   ▼                     │           │
│                    ┌──────────┐        ┌──────────┐               │           │
│                    │ DataURL  │        │  width   │               │           │
│                    │ (backup) │        │  height  │               │           │
│                    └──────────┘        └──────────┘               │           │
│                          │                   │                     │           │
│                          └───────────────────┴─────────────────────┘           │
│                                              │                                 │
│                                              ▼                                 │
│                               ┌────────────────────────┐                       │
│                               │      Zustand Store     │                       │
│                               │      (imageStore)      │                       │
│                               │ • texture              │                       │
│                               │ • dimensions           │                       │
│                               │ • originalDataUrl      │                       │
│                               │ • fileName, mimeType   │                       │
│                               └───────────┬────────────┘                       │
│                                           │                                    │
└───────────────────────────────────────────┼────────────────────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  2. RENDER STAGE (EffectPipeline + React Three Fiber)                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                     MULTI-PASS FBO RENDERING                            │   │
│   │                                                                         │   │
│   │   Original     FBO A          FBO B          FBO A          Screen      │   │
│   │   Texture      (write)        (write)        (write)        Canvas      │   │
│   │      │            │              │              │              │        │   │
│   │      ▼            ▼              ▼              ▼              ▼        │   │
│   │   ┌──────┐    ┌──────┐      ┌──────┐      ┌──────┐      ┌──────────┐   │   │
│   │   │ TEX  │───▶│Effect│─────▶│Effect│─────▶│Effect│─────▶│Passthru  │   │   │
│   │   │      │    │  #1  │      │  #2  │      │  #N  │      │ Material │   │   │
│   │   └──────┘    │ RGB  │      │Pixel │      │ CRT  │      │          │   │   │
│   │               │Shift │      │Sort  │      │      │      │ Display  │   │   │
│   │               └──────┘      └──────┘      └──────┘      └──────────┘   │   │
│   │                   │              │              │              │        │   │
│   │                   └──────────────┴──────────────┴──────────────┘        │   │
│   │                                  PING-PONG                              │   │
│   │                            (alternating FBOs)                           │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│   Per-Frame (useFrame):                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │  1. Read activeEffects + parameters from effectStore                    │   │
│   │  2. For each effect in chain:                                           │   │
│   │     • Get/create ShaderMaterial from cache                              │   │
│   │     • Set uniforms: u_texture, u_resolution, u_time, u_<param>...      │   │
│   │     • Render off-screen mesh to next FBO                                │   │
│   │  3. Final texture → passthroughMaterial → visible mesh                  │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│   Off-Screen Scene:                      Visible Scene:                         │
│   ┌────────────────────┐                ┌────────────────────┐                  │
│   │ OrthographicCamera │                │ R3F Canvas         │                  │
│   │ PlaneGeometry(1,1) │                │ Orthographic       │                  │
│   │ Effect Materials   │                │ Scaled Plane       │                  │
│   └────────────────────┘                │ (contain/letterbox)│                  │
│                                         └────────────────────┘                  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                            │
                                            │ User clicks "Download"
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  3. EXPORT STAGE (exportImage.ts)                                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   ┌───────────────────────────────────────────────────────────────────────┐     │
│   │                  OFF-SCREEN FULL-RESOLUTION RENDER                    │     │
│   │                                                                       │     │
│   │   1. Create NEW WebGLRenderer (canvas @ original dimensions)          │     │
│   │   2. Create NEW FBO pair (full resolution)                            │     │
│   │   3. Create NEW off-screen scene + camera + mesh                      │     │
│   │   4. Run SAME renderEffectChain() as live preview                     │     │
│   │   5. Render final texture to off-screen canvas                        │     │
│   │                                                                       │     │
│   │   ┌──────────┐    ┌──────────────┐    ┌──────────────┐                │     │
│   │   │ Original │───▶│ Effect Chain │───▶│ Final Canvas │                │     │
│   │   │ Texture  │    │ (all passes) │    │ (full res)   │                │     │
│   │   └──────────┘    └──────────────┘    └──────┬───────┘                │     │
│   │                                              │                        │     │
│   └──────────────────────────────────────────────┼────────────────────────┘     │
│                                                  │                              │
│                                                  ▼                              │
│   ┌──────────────────────────────────────────────────────────────────────┐      │
│   │                        BLOB + DOWNLOAD                               │      │
│   │                                                                      │      │
│   │   canvas.toBlob()     URL.createObjectURL()     <a>.click()          │      │
│   │        │                      │                      │               │      │
│   │        ▼                      ▼                      ▼               │      │
│   │   ┌─────────┐           ┌──────────┐          ┌───────────┐          │      │
│   │   │  Blob   │──────────▶│ Blob URL │─────────▶│ Download  │          │      │
│   │   │(jpg/png)│           │          │          │ Link      │          │      │
│   │   └─────────┘           └──────────┘          └───────────┘          │      │
│   │                                                     │                │      │
│   │                                                     ▼                │      │
│   │                                           "filename__corrpt.jpg"     │      │
│   └──────────────────────────────────────────────────────────────────────┘      │
│                                                                                 │
│   Cleanup: dispose renderer, FBOs, materials, geometry                          │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘


╔═══════════════════════════════════════════════════════════════════════════════╗
║                              DATA FLOW SUMMARY                                ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║   File ──▶ FileReader ──▶ Image ──▶ Texture ──▶ FBO Chain ──▶ Screen          ║
║                │                        │                                     ║
║                ▼                        │                                     ║
║           DataURL                       └───────┐                             ║
║           (backup)                              │                             ║
║                                                 ▼                             ║
║                                    Export: Texture ──▶ FBO Chain ──▶ Blob     ║
║                                                                      │        ║
║                                                                      ▼        ║
║                                                                  Download     ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

## Key Points

1. **Import** - File is read as DataURL, decoded to HTMLImageElement, then converted to `THREE.Texture` with linear filtering and no color space conversion (raw sRGB passthrough)

2. **Live Render** - Uses ping-pong FBOs (alternating between two render targets) to chain effects. Each frame reads from effectStore and updates shader uniforms. Final texture displayed on aspect-correct scaled mesh

3. **Export** - Creates a completely separate off-screen WebGLRenderer at original image dimensions, re-runs the entire effect chain, then extracts pixels via `canvas.toBlob()` for download. All temporary resources are disposed after

## Source Files

| Stage | File |
|-------|------|
| Input | `src/store/imageStore.ts` |
| Input | `src/components/input/DropZone.tsx` |
| Render | `src/components/canvas/EffectPipeline.tsx` |
| Render | `src/effects/renderEffectChain.ts` |
| Export | `src/lib/exportImage.ts` |
