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
  │  □ Research GPU pixel sort techniques                              │
  │  □ Implement brightness threshold detection                        │
  │  □ Write directional blur shader                                   │
  │  □ Create PixelSortEffect processor class                          │
  │  □ Tune threshold parameters                                       │
  │  □ Add direction parameter (H/V)                                   │
  │                                                                    │
  │  Deliverable: Working pixel sort effect                            │
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
