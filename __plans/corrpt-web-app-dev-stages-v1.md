## Development Stages

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DEVELOPMENT ROADMAP                                 │
└─────────────────────────────────────────────────────────────────────────────┘


STAGE 1: FOUNDATION                                          [WEEK 1-2]
═══════════════════════════════════════════════════════════════════════

  ┌────────────────────────────────────────────────────────────────────┐
  │ PHASE 1.1: Project Setup                              [Days 1-2]   │
  ├────────────────────────────────────────────────────────────────────┤
  │                                                                    │
  │  ✅ Initialize Vite + React + TypeScript project                   │
  │  ✅ Configure Tailwind CSS                                         │
  │  ✅ Setup Biome for code format and linting (use default config)   │
  │  ✅ Configure path aliases (@/components, @/hooks, etc.)           │
  │  ✅ Install core dependencies:                                     │
  │    • three, @react-three/fiber                                     │
  │    • zustand                                                       │
  │    • @radix-ui/react-*                                             │
  │    • vite-plugin-glsl                                              │
  │  ✅ Setup folder structure                                         │
  │  ✅ Configure GLSL imports in TypeScript                           │
  │                                                                    │
  │  Deliverable: Runnable empty project with all tooling              │
  └────────────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────────────┐
  │ PHASE 1.2: Core Three.js Setup                        [Days 3-5]   │
  ├────────────────────────────────────────────────────────────────────┤
  │                                                                    │
  │  ✅ Create EffectCanvas component with R3F                         │
  │  ✅ Setup OrthographicCamera for 2D rendering                      │
  │  ✅ Create full-screen quad geometry                               │
  │  ✅ Implement basic ShaderMaterial with passthrough                │
  │  ✅ Test texture loading and display                               │
  │  ✅ Implement responsive canvas sizing                             │
  │  ✅ Setup render loop with proper timing                           │
  │                                                                    │
  │  Deliverable: Canvas displays uploaded image at correct aspect     │
  └────────────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────────────┐
  │ PHASE 1.3: State Management                           [Days 6-7]   │
  ├────────────────────────────────────────────────────────────────────┤
  │                                                                    │
  │  ✅ Design Zustand store schema                                     │
  │  ✅ Implement imageStore slice:                                     │
  │    • texture, dimensions, loading state                            │
  │  ✅ Implement effectStore slice:                                    │
  │    • activeEffects[], parameters, intensity                        │
  │  ✅ Implement uiStore slice:                                        │
  │    • modals, sidebar, theme                                        │
  │  ✅ Create TypeScript interfaces for all state                      │
  │  ✅ Wire store to canvas component                                  │
  │                                                                    │
  │  Deliverable: State changes reflected in canvas                    │
  └────────────────────────────────────────────────────────────────────┘


STAGE 2: INPUT SYSTEM                                        [WEEK 2]
═══════════════════════════════════════════════════════════════════════

  ┌────────────────────────────────────────────────────────────────────┐
  │ PHASE 2.1: File Upload                                [Days 1-2]   │
  ├────────────────────────────────────────────────────────────────────┤
  │                                                                    │
  │  ✅ Create DropZone component with drag state styling              │
  │  ✅ Implement file validation (type, size)                         │
  │  ✅ Create useImageLoader hook:                                    │
  │    • FileReader → Image → THREE.Texture pipeline                   │
  │  ✅ Handle EXIF orientation (native browser support)               │
  │  ✅ Implement loading states and error handling                    │
  │  ✅ Add FileUpload button as fallback                              │
  │  ✅ DropZoneLanding card (empty state, click-to-browse)            │
  │  ✅ DropZoneOverlay (drag-over replacement indicator)              │
  │  ✅ ImageActions floating replace button                           │
  │  ✅ Playwright regression tests (12 assertions)                    │
  │                                                                    │
  │  Deliverable: Users can upload images via drag/drop or click       │
  └────────────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────────────┐
  │ PHASE 2.2: Camera Capture                             [Days 3-4]   │
  ├────────────────────────────────────────────────────────────────────┤
  │                                                                    │
  │  □ Create useCamera hook with WebRTC                               │
  │  □ Request camera permissions with user feedback                   │
  │  □ Create CameraCapture component:                                 │
  │    • Live preview in modal                                         │
  │    • Shutter button                                                │
  │    • Camera switch (front/back on mobile)                          │
  │  □ Capture frame to canvas → texture                               │
  │  □ Handle permission denied gracefully                             │
  │                                                                    │
  │  Deliverable: Users can take  photos with device camera             │
  └────────────────────────────────────────────────────────────────────┘


STAGE 3: EFFECT SYSTEM                                       [WEEK 3]
═══════════════════════════════════════════════════════════════════════

  ┌────────────────────────────────────────────────────────────────────┐
  │ PHASE 3.1: Effect Architecture                        [Days 1-2]   │
  ├────────────────────────────────────────────────────────────────────┤
  │                                                                    │
  │  ✅ Design EffectDefinition interface + EffectParameterDef         │
  │  ✅ Create EffectRegistry for effect discovery                     │
  │  ✅ Implement EffectPipeline component:                            │
  │    • Multi-pass rendering with ping-pong FBOs                      │
  │    • Effect ordering via activeEffects array                       │
  │    • Material cache with lazy creation + disposal                  │
  │    • Skip inactive effects (passthrough when none active)          │
  │  ✅ Define EffectParameter interface (float, bool types)           │
  │  ✅ Setup uniform update system (store → u_ prefixed uniforms)     │
  │  ✅ Self-registering definition pattern (import-time side effects)  │
  │                                                                    │
  │  Deliverable: Framework ready for adding effects                   │
  └────────────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────────────┐
  │ PHASE 3.2: RGB Shift Effect                           [Days 3-4]   │
  ├────────────────────────────────────────────────────────────────────┤
  │                                                                    │
  │  ✅ Reuse shared passthrough.vert (no custom vertex shader needed) │
  │  ✅ Write fragment shader:                                         │
  │    • Channel separation logic (R/G/B sampled at offset UVs)        │
  │    • Directional offset from intensity + angle uniforms            │
  │    • Optional time-based animation via u_animated toggle           │
  │  ✅ Create rgbShift effect definition (self-registering)           │
  │  ✅ Define parameter schema (intensity, angle, animated)           │
  │  ✅ EffectDevPanel: floating dev controls for live tweaking        │
  │  ✅ Playwright regression tests still pass (8 assertions)          │
  │                                                                    │
  │  Deliverable: Working RGB shift effect with parameters             │
  └────────────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────────────┐
  │ PHASE 3.3: Pixel Sort Effect                          [Days 5-6]   │
  ├────────────────────────────────────────────────────────────────────┤
  │                                                                    │
  │  ✅ Research GPU pixel sort techniques                              │
  │  ✅ Implement brightness threshold detection                       │
  │  ✅ Write directional blur shader                                  │
  │  ✅ Create pixelSort effect definition (self-registering)          │
  │  ✅ Tune threshold parameters (threshold, upperThreshold, spread)  │
  │  ✅ Add direction parameter (H/V)                                  │
  │  ✅ Playwright E2E tests (30 assertions across effect pipeline)    │
  │                                                                    │
  │  Deliverable: Working pixel sort effect                            │
  └────────────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────────────┐
  │ PHASE 3.4: CRT Effect                                    [Day 7]   │
  ├────────────────────────────────────────────────────────────────────┤
  │                                                                    │
  │  ✅ Write CRT fragment shader:                                     │
  │    • Horizontal scanlines using sin on UV.y                        │
  │    • Barrel distortion for screen curvature (curveUV function)     │
  │    • Vignette darkening at edges                                   │
  │    • Out-of-bounds handling for curved edges (black fill)          │
  │  ✅ Create crt effect definition (self-registering)                │
  │  ✅ Define parameters:                                             │
  │    • lineIntensity (0-1): darkness of scanlines                    │
  │    • lineCount (100-800): number of scanlines                      │
  │    • curvature (0-0.5): barrel distortion amount                   │
  │    • vignette (0-1): edge darkening strength                       │
  │  ✅ Test effect stacking with RGB Shift + Pixel Sort               │
  │  ✅ Update effect definitions barrel export                        │
  │                                                                    │
  │  Deliverable: Working CRT/scanlines effect with retro aesthetic    │
  └────────────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────────────┐
  │ PHASE 3.5: Noise / Static Effect                         [Day 8]   │
  ├────────────────────────────────────────────────────────────────────┤
  │                                                                    │
  │  ✅ Write noise fragment shader:                                   │
  │    • Hash-based pseudo-random noise (arithmetic hash, GPU-stable)  │
  │    • Additive noise blend with original image                      │
  │    • Chromatic noise option (independent R/G/B channel noise)      │
  │    • Seed parameter for reproducible/varied patterns               │
  │  ✅ Create noise effect definition (self-registering)              │
  │  ✅ Define parameters:                                             │
  │    • intensity (0-1): noise strength                               │
  │    • scale (1-100): grain coarseness (higher = coarser)            │
  │    • seed (0-1000): pattern randomization                          │
  │    • monochrome (bool): grayscale vs colored noise                 │
  │  ✅ Test effect stacking with all other effects                    │
  │  ✅ Update effect definitions barrel export                        │
  │                                                                    │
  │  Deliverable: Working noise/static effect for digital corruption   │
  └────────────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────────────┐
  │ PHASE 3.6: Slice/Shift Effect                           [Day 9]    │
  ├────────────────────────────────────────────────────────────────────┤
  │                                                                    │
  │  ✅ Write slice/shift fragment shader:                              │
  │    • Divide image into horizontal bands: floor(uv.y * sliceCount)  │
  │    • Generate pseudo-random offset per slice using hash function   │
  │    • Shift UV.x by offset (positive=right, negative=left)          │
  │    • Threshold parameter to affect only some slices randomly       │
  │  ✅ Create sliceShift effect definition (self-registering)          │
  │  ✅ Define parameters:                                              │
  │    • intensity (0-1): maximum horizontal displacement              │
  │    • sliceCount (5-100): number of horizontal bands                │
  │    • sliceFill (0-1): percentage of slices that shift              │
  │    • seed (0-1000): randomization seed                             │
  │    • vertical (bool): vertical slices instead of horizontal        │
  │  ✅ Test effect stacking (pairs well with RGB Shift, CRT, Noise)    │
  │  ✅ Update effect definitions barrel export                         │
  │                                                                    │
  │  Algorithm: Classic "broken TV signal" displacement                │
  │  Reference: halisavakis.com/my-take-on-shaders-glitch-image-effect │
  │                                                                    │
  │  Deliverable: Horizontal slice displacement for glitch aesthetic   │
  └────────────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────────────┐
  │ PHASE 3.7: Block Glitch Effect                         [Day 10]    │
  ├────────────────────────────────────────────────────────────────────┤
  │                                                                    │
  │  □ Write block glitch fragment shader:                             │
  │    • Define grid: floor(uv * gridSize) / gridSize                  │
  │    • Generate random offset per block using block coords as seed   │
  │    • Apply XY offset to UV within block boundaries                 │
  │    • Optional: tint displaced blocks with RGB channel bias         │
  │  □ Create blockGlitch effect definition (self-registering)         │
  │  □ Define parameters:                                              │
  │    • intensity (0-1): maximum block displacement                   │
  │    • gridSizeX (2-32): horizontal block count                      │
  │    • gridSizeY (4-64): vertical block count                        │
  │    • threshold (0-1): percentage of blocks that displace           │
  │    • seed (0-1000): randomization seed                             │
  │  □ Test effect stacking (pairs well with Noise, RGB Shift)         │
  │  □ Update effect definitions barrel export                         │
  │                                                                    │
  │  Algorithm: Rectangular block displacement using SDF or grid UV    │
  │  Reference: agatedragon.blog/2023/12/21/glitch-shader-blocks       │
  │                                                                    │
  │  Deliverable: Block-based displacement for digital corruption      │
  └────────────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────────────┐
  │ PHASE 3.8: Smear Effect                                [Day 11]    │
  ├────────────────────────────────────────────────────────────────────┤
  │                                                                    │
  │  ✅ Write smear fragment shader:                                    │
  │    • Bright pixels (above threshold) stay intact as "sources"      │
  │    • Dark pixels look backward for bright source pixel             │
  │    • Propagate source color into dark areas (directional streaks)  │
  │    • Per-scanline randomization for organic variation              │
  │  ✅ Create smear effect definition (self-registering)               │
  │  ✅ Define parameters:                                              │
  │    • intensity (0-1): smear length (max 150 pixels)                │
  │    • threshold (0-1): brightness threshold for smear sources       │
  │    • falloff (0-1): edge hardness (0=hard, 1=soft gradient)        │
  │    • seed (0-1000): per-scanline randomization                     │
  │    • vertical (bool): vertical smear instead of horizontal         │
  │  ✅ Test effect stacking (pairs well with Pixel Sort, RGB Shift)    │
  │  ✅ Update effect definitions barrel export                         │
  │                                                                    │
  │  Algorithm: Brightness-based color propagation (datamosh approx)   │
  │  Note: Distinct from Pixel Sort — propagates vs blurs/averages     │
  │                                                                    │
  │  Deliverable: Pixel smearing for organic/fluid corruption          │
  └────────────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────────────┐
  │ PHASE 3.9: Vertical Tear Effect                        [Day 12]    │
  ├────────────────────────────────────────────────────────────────────┤
  │                                                                    │
  │  □ Write vertical tear fragment shader:                            │
  │    • Divide image into vertical columns: floor(uv.x * columnCount) │
  │    • Generate random vertical offset per column                    │
  │    • Shift UV.y by offset (up/down displacement)                   │
  │    • Threshold parameter to affect only some columns randomly      │
  │  □ Create verticalTear effect definition (self-registering)        │
  │  □ Define parameters:                                              │
  │    • intensity (0-1): maximum vertical displacement                │
  │    • columnCount (5-100): number of vertical bands                 │
  │    • columnFill (0-1): percentage of columns that shift            │
  │    • seed (0-1000): randomization seed                             │
  │  □ Test effect stacking (pairs with Slice/Shift for cross-hatch)   │
  │  □ Update effect definitions barrel export                         │
  │                                                                    │
  │  Algorithm: Perpendicular complement to horizontal Slice/Shift     │
  │  Stacking: Slice/Shift + Vertical Tear = grid-like destruction     │
  │                                                                    │
  │  Deliverable: Vertical displacement for "torn paper" aesthetic     │
  └────────────────────────────────────────────────────────────────────┘


STAGE 4: USER INTERFACE                                      [WEEK 4]
═══════════════════════════════════════════════════════════════════════

  ┌────────────────────────────────────────────────────────────────────┐
  │ PHASE 4.1: Layout & Navigation                        [Days 1-2]   │
  ├────────────────────────────────────────────────────────────────────┤
  │                                                                    │
  │  □ Design responsive layout system:                                │
  │                                                                    │
  │    DESKTOP                          MOBILE                         │
  │    ┌─────────────────────┐          ┌─────────────────┐            │
  │    │      Header         │          │     Header      │            │
  │    ├──────────┬──────────┤          ├─────────────────┤            │
  │    │          │          │          │                 │            │
  │    │  Canvas  │ Sidebar  │          │     Canvas      │            │
  │    │          │          │          │                 │            │
  │    │          │          │          ├─────────────────┤            │
  │    │          │          │          │  Bottom Sheet   │            │
  │    └──────────┴──────────┘          └─────────────────┘            │
  │                                                                    │
  │  □ Implement Header with logo, undo/redo, export                   │
  │  □ Create collapsible Sidebar                                      │
  │  □ Build responsive breakpoint system                              │
  │                                                                    │
  │  Deliverable: Responsive app shell                                 │
  └────────────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────────────┐
  │ PHASE 4.2: Effect Controls                            [Days 3-4]   │
  ├────────────────────────────────────────────────────────────────────┤
  │                                                                    │
  │  □ Create EffectPanel component:                                   │
  │    • Effect grid/list view                                         │
  │    • Category filtering                                            │
  │    • Search functionality                                          │
  │  □ Build EffectCard with:                                          │
  │    • Thumbnail preview                                             │
  │    • Title and description                                         │
  │    • Active state indicator                                        │
  │  □ Create ParameterSlider component:                               │
  │    • Custom styled range input                                     │
  │    • Real-time value display                                       │
  │    • Reset to default button                                       │
  │  □ Wire controls to Zustand store                                  │
  │                                                                    │
  │  Deliverable: Full effect control UI                               │
  └────────────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────────────┐
  │ PHASE 4.3: Visual Polish                              [Days 5-6]   │
  ├────────────────────────────────────────────────────────────────────┤
  │                                                                    │
  │  □ Implement dark theme with CSS variables                         │
  │  □ Add micro-animations:                                           │
  │    • Button hover states                                           │
  │    • Panel transitions                                             │
  │    • Loading spinners                                              │
  │  □ Create custom cursor for canvas                                 │
  │  □ Add keyboard shortcuts                                          │
  │  □ Implement toast notifications                                   │
  │                                                                    │
  │  Deliverable: Polished, professional UI                            │
  └────────────────────────────────────────────────────────────────────┘


STAGE 5: EXPORT & FINISHING                                  [WEEK 5]
═══════════════════════════════════════════════════════════════════════

  ┌────────────────────────────────────────────────────────────────────┐
  │ PHASE 5.1: Export System                              [Days 1-2]   │
  ├────────────────────────────────────────────────────────────────────┤
  │                                                                    │
  │  □ Create useCanvasExport hook:                                    │
  │    • Render to off-screen canvas at full resolution                │
  │    • toDataURL → Blob conversion                                   │
  │  □ Build ExportModal with:                                         │
  │    • Format selection (PNG/JPEG)                                   │
  │    • Quality slider for JPEG                                       │
  │    • Resolution options                                            │
  │  □ Implement download trigger                                      │
  │  □ Add Web Share API integration (mobile)                          │
  │                                                                    │
  │  Deliverable: Users can export processed images                    │
  └────────────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────────────┐
  │ PHASE 5.2: Testing & Optimization                     [Days 3-4]   │
  ├────────────────────────────────────────────────────────────────────┤
  │                                                                    │
  │  □ Performance profiling                                           │
  │    • Identify GPU bottlenecks                                      │
  │    • Optimize shader complexity                                    │
  │  □ Memory leak testing                                             │
  │    • Texture disposal                                              │
  │    • FBO cleanup                                                   │
  │  □ Cross-browser testing:                                          │
  │    • Chrome, Firefox, Safari, Edge                                 │
  │  □ Mobile device testing                                           │
  │  □ Accessibility audit (WCAG)                                      │
  │                                                                    │
  │  Deliverable: Production-ready, optimized app                      │
  └────────────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────────────┐
  │ PHASE 5.3: Deployment                                 [Day 5]      │
  ├────────────────────────────────────────────────────────────────────┤
  │                                                                    │
  │  □ Configure production build                                      │
  │  □ Setup Vercel/Netlify deployment                                 │
  │  □ Configure caching headers                                       │
  │  □ Setup error monitoring (Sentry)                                 │
  │  □ Create README documentation                                     │
  │                                                                    │
  │  Deliverable: Live deployed application                            │
  └────────────────────────────────────────────────────────────────────┘
```
