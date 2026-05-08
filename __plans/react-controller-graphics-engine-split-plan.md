# React Controller and Imperative Graphics Engine Split Plan

## Summary

Refactor Corrpt so React remains the controller and UI layer while the graphics engine becomes a framework-free imperative service attached to a canvas.

The goal is not to remove React. The goal is to stop React components from owning WebGL correctness, resource lifetime, export behavior, and render-loop details.

Target boundary:

```txt
React + Zustand
- Owns editor/product state
- Renders controls, modals, shortcuts, presets, history, export settings
- Passes render inputs to the engine
- Displays engine status/errors

Graphics engine
- Owns Three.js/WebGL renderer
- Owns textures, materials, render targets, shader compilation, render loop
- Owns preview rendering and export rendering
- Exposes a small imperative TypeScript API
- Has its own tests independent from React
```

## Goals

- Keep React for the features planned down the road: presets, stack reordering, undo/redo, export settings, modals, keyboard shortcuts, and compare modes.
- Move WebGL lifecycle out of React components and into explicit engine classes/functions.
- Make preview and export share the same rendering implementation and parameter semantics.
- Make image budget validation and downscaling part of the image/engine boundary, not scattered through UI components.
- Add a separate graphics-engine test suite that does not depend on React rendering.
- Preserve current MVP behavior during migration.

## Non-Goals

- Do not rewrite the app to vanilla JS.
- Do not introduce a worker message protocol yet.
- Do not change the visual design as part of this refactor.
- Do not add new end-user features until the engine boundary is stable.
- Do not migrate every effect at once if an incremental adapter can keep the app working.

## Current State

Current strengths:

- Effects are already registered through definitions.
- `renderEffectChain` is mostly framework-free and reused by preview/export.
- Zustand already separates app state from UI components.
- The UI is simple enough that migration can be incremental.

Current coupling to reduce:

- `EffectPipeline.tsx` owns FBO allocation, material cache, render loop, and resource disposal.
- React Three Fiber owns the canvas/renderer lifecycle.
- Export creates a separate renderer but still relies on the same loose state snapshot shape.
- Image decode, texture creation, and decoded pixel budget are not cleanly represented as an engine input.
- Tests are mostly Playwright UI smoke tests and do not prove rendering correctness.

## Target Architecture

```txt
src/
  app/
    App.tsx

  components/
    canvas/
      EffectCanvas.tsx          # React host for <canvas>
    controls/
      EffectPanel.tsx           # UI only
      ExportSettingsModal.tsx   # UI only, later

  store/
    editorStore.ts              # Product/editor state
    historyStore.ts             # Undo/redo or history helpers, later

  engine/
    types.ts
    createPreviewRenderer.ts
    PreviewRenderer.ts
    ExportRenderer.ts
    ImageLoader.ts
    ImageBudget.ts
    EffectChainRenderer.ts
    RenderTargetPool.ts
    ShaderMaterialCache.ts
    WebGLCapabilities.ts
    errors.ts

  effects/
    definitions/
    shaders/
    registry.ts
    types.ts

  tests/
    engine/
      imageBudget.test.ts
      effectChain.test.ts
      exportRenderer.test.ts
      resourceLifecycle.test.ts
      shaderCompile.spec.ts
      visualParity.spec.ts
```

The exact test directory can differ, but the important rule is that engine tests are a separate suite from UI E2E tests.

Before creating these paths, choose the test runner in Phase 0. Do not add test scripts in this plan unless the corresponding dependencies/configuration are added in the same implementation phase.

## Ownership Boundary

React owns product state and user intent:

- Selected image metadata.
- Effect stack order.
- Effect instance selection.
- Parameter edits.
- Presets.
- Undo/redo history.
- Export settings.
- Modal visibility.
- Keyboard shortcut handling.
- Compare/split/full preview mode.
- User-visible errors.

The graphics engine owns rendering mechanics:

- WebGLRenderer creation and disposal.
- Texture creation and disposal.
- ShaderMaterial creation and disposal.
- RenderTarget/FBO allocation and reuse.
- Render loop start/stop.
- Frame timing used by animated effects.
- GPU capability checks.
- Preview drawing.
- Export drawing.
- Render statistics.
- Context loss handling.

The engine must not own product semantics such as undo, selected effect, modal state, preset names, or UI layout.

## Core Data Types

Introduce plain TypeScript types that can be used by both React and the engine.

```ts
export type EffectInstance = {
  instanceId: string;
  effectId: string;
  enabled: boolean;
  parameters: Record<string, EffectParameterValue>;
};

export type PreviewMode = "full" | "split" | "compare";

export type LoadedImage = {
  source: ImageBitmap;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  fileName: string;
  mimeType: string;
  wasDownscaled: boolean;
};

export type LoadedImageHandle = {
  image: LoadedImage;
  warnings: string[];
  dispose(): void;
};

export type ExportSettings = {
  format: "png" | "jpeg" | "webp";
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
};
```

Prefer effect instances over effect IDs in the editor state. This enables duplicate effects later:

```txt
RGB Shift #1
Pixel Sort
RGB Shift #2
```

During migration, do not block engine extraction on a full store rewrite. Add a temporary adapter:

```ts
export function selectEffectInstances(state: EffectStore): EffectInstance[];
```

The adapter converts the current `activeEffects + parameters` shape to `EffectInstance[]`. Remove it after the editor store natively uses effect instances.

## Preview Renderer Interface

Start with an in-process imperative TypeScript API.

```ts
export type RenderStats = {
  fps: number;
  frameMs: number;
  width: number;
  height: number;
};

export type RenderError = {
  code: string;
  message: string;
  cause?: unknown;
};

export type PreviewRendererEvents = {
  onReady?: () => void;
  onError?: (error: RenderError) => void;
  onContextLost?: () => void;
  onContextRestored?: () => void;
  onStats?: (stats: RenderStats) => void;
};

export interface PreviewRenderer {
  setImage(image: LoadedImage | null): void;
  setEffects(effects: EffectInstance[]): void;
  setPreviewMode(mode: PreviewMode): void;
  resize(width: number, height: number): void;
  renderFrame(time: number): void;
  start(): void;
  stop(): void;
  getCurrentTime(): number;
  dispose(): void;
}

export function createPreviewRenderer(
  canvas: HTMLCanvasElement,
  events?: PreviewRendererEvents,
): PreviewRenderer;
```

This is enough for React to host the engine without knowing about Three.js internals.

`renderFrame(time)` is required for deterministic engine tests and export/preview parity checks. Production preview can still use `start()` and an internal `requestAnimationFrame` loop.

## Export Renderer Interface

Export should be asynchronous and testable.

```ts
export type ExportRequest = {
  image: LoadedImage;
  effects: EffectInstance[];
  settings: ExportSettings;
  time: number;
};

export type ExportResult = {
  blob: Blob;
  width: number;
  height: number;
  mimeType: string;
};

export interface ExportRenderer {
  exportImage(request: ExportRequest): Promise<ExportResult>;
  dispose(): void;
}
```

React calls this from the export UI:

```ts
const result = await exportRenderer.exportImage({
  image: imageHandle.image,
  effects,
  settings,
  time: previewRenderer.getCurrentTime(),
});
```

This fixes the current class of problems where preview and export can disagree for animated effects.

## React Integration Pattern

React should create the renderer once and feed it state updates.

```tsx
export function EffectCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<PreviewRenderer | null>(null);

  const imageHandle = useEditorStore((s) => s.imageHandle);
  const effects = useEditorStore((s) => s.effects);
  const previewMode = useEditorStore((s) => s.previewMode);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = createPreviewRenderer(canvas, {
      onError: (error) => useEditorStore.getState().setRenderError(error.message),
    });

    rendererRef.current = renderer;
    renderer.start();

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      renderer.resize(width, height);
    });
    observer.observe(canvas);

    return () => {
      observer.disconnect();
      renderer.dispose();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    rendererRef.current?.setImage(imageHandle?.image ?? null);
  }, [imageHandle]);

  useEffect(() => {
    rendererRef.current?.setEffects(effects);
  }, [effects]);

  useEffect(() => {
    rendererRef.current?.setPreviewMode(previewMode);
  }, [previewMode]);

  return <canvas ref={canvasRef} />;
}
```

Later, this can be made cleaner with a binding helper that subscribes to Zustand directly:

```ts
export function bindRendererToStore(
  renderer: PreviewRenderer,
  store: EditorStoreApi,
): () => void;
```

Use the direct React hook approach first unless subscriptions become noisy.

The real implementation must also account for `devicePixelRatio` changes. A `ResizeObserver` is enough for the initial refactor, but the renderer should internally clamp DPR and expose one place where DPR policy is configured.

## Image Budget and Loading Boundary

Move image validation into a framework-free image loader:

```ts
export type ImageBudget = {
  maxBytes: number;
  maxPixels: number;
  maxDimension: number;
  previewMaxPixels: number;
};

export type LoadImageResult =
  | { ok: true; handle: LoadedImageHandle }
  | { ok: false; error: RenderError };

export async function loadImageFile(
  file: File,
  budget: ImageBudget,
): Promise<LoadImageResult>;
```

Rules:

- Validate MIME and file bytes before decode.
- Decode image to discover actual dimensions.
- Reject dimensions that exceed hard app limits.
- Downscale if dimensions exceed preview budget but are still supported.
- Return explicit warnings so React can show user-facing messaging.
- Return a `LoadedImageHandle` and make its `dispose()` method the single owner of `ImageBitmap.close()` and temporary object URL cleanup.
- Standardize the engine input on `ImageBitmap`; do not pass raw `HTMLImageElement` into the engine after this refactor.

The engine receives a `LoadedImage`, not a raw `File`.

## WebGL Capability Boundary

Static budgets protect the app from obviously oversized images, but final safety must be checked against the current browser/GPU.

Create:

```ts
export type WebGLCapabilities = {
  maxTextureSize: number;
  maxRenderbufferSize: number;
  maxViewportDims: [number, number];
  maxSupportedPixels: number;
};

export function readWebGLCapabilities(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
): WebGLCapabilities;

export function validateRenderDimensions(
  width: number,
  height: number,
  capabilities: WebGLCapabilities,
): RenderError | null;
```

Validation order:

- Before decode: validate MIME and compressed byte size.
- After decode: validate decoded app budget and decide whether to downscale.
- After renderer creation: validate preview/export dimensions against real WebGL capabilities.
- Before export: validate requested output dimensions against real WebGL capabilities.

The user-facing error should say what failed and what size is supported, not just "WebGL error".

## Migration Plan

### Phase 0: Tooling and Compatibility Baseline

Decide and add the test tooling before engine extraction.

Recommended approach:

- Add Vitest for pure TypeScript engine tests.
- Add Playwright Test only for browser/WebGL engine tests, or explicitly extend the current custom `test-assets` harness instead.
- Do not mix both approaches without clear scripts and CI ownership.

Create baseline adapters and tests:

- Add `selectEffectInstances(state)` to adapt current `activeEffects + parameters` into `EffectInstance[]`.
- Add a passthrough pixel baseline test for the current renderer/export path.
- Document current color-space behavior and accepted pixel tolerance.
- Add a CI/test script plan that matches actual dependencies.

Acceptance criteria:

- `npm run build` still passes.
- `npm run lint` still passes.
- Existing E2E tests still pass.
- The chosen engine test command exists and runs at least one placeholder or baseline test.
- The plan no longer references test commands that do not exist.

### Phase 1: Define Engine Types and Loader

Add:

- `src/engine/types.ts`
- `src/engine/ImageBudget.ts`
- `src/engine/ImageLoader.ts`
- `src/engine/errors.ts`
- `src/engine/WebGLCapabilities.ts`

Refactor the image store to call `loadImageFile(file, budget)` and store a `LoadedImageHandle`.

Acceptance criteria:

- Existing upload UI still works.
- Oversized decoded images show a clear error.
- Downscaled images show a clear warning.
- Replacing/clearing an image calls `LoadedImageHandle.dispose()`.
- `ImageBitmap.close()` ownership is covered by tests.
- No WebGL code has moved yet.

### Phase 2: Extract Effect Chain Renderer

Create:

- `src/engine/EffectChainRenderer.ts`
- `src/engine/ShaderMaterialCache.ts`
- `src/engine/RenderTargetPool.ts`

Move material cache and FBO ownership out of `EffectPipeline.tsx`.

Acceptance criteria:

- `renderEffectChain` remains framework-free.
- `selectEffectInstances(state)` feeds the extracted renderer.
- Preview still matches current behavior.
- Materials and render targets are disposed through engine-owned APIs.

### Phase 3: Replace React Three Fiber Canvas Host

Introduce:

- `src/engine/PreviewRenderer.ts`
- `src/engine/createPreviewRenderer.ts`
- `src/components/canvas/EffectCanvas.tsx` as a plain `<canvas>` host.

Remove React Three Fiber from the preview path after parity is verified.

Acceptance criteria:

- Canvas renders the uploaded image.
- Effects apply in real time.
- Resize behavior preserves aspect ratio.
- Device pixel ratio is handled and clamped in one place.
- Color-space behavior matches the baseline from Phase 0.
- The projection/plane mapping matches current preview output within tolerance.
- Context-loss events are handled or explicitly surfaced as unsupported.
- Engine emits errors to React.
- No Three.js object lifecycle remains in React components except `createPreviewRenderer`.

### Phase 4: Refactor Export

Introduce:

- `src/engine/ExportRenderer.ts`

Make export return a `Promise<ExportResult>`.

Acceptance criteria:

- Export UI loading state remains active until blob creation finishes.
- Export errors are displayed to the user.
- Export receives the same effect instances and current preview time.
- Export output dimensions are deterministic and based on `ExportSettings`.

### Phase 5: Editor State Upgrade

Replace `activeEffects: string[]` and `parameters: Record<string, ...>` with effect instances:

```ts
effects: EffectInstance[];
```

Add actions:

- `addEffect(effectId)`
- `removeEffect(instanceId)`
- `setEffectParam(instanceId, paramName, value)`
- `reorderEffects(instanceIds)`
- `duplicateEffect(instanceId)`

Acceptance criteria:

- Existing dev panel behavior still works.
- Duplicate effects become possible.
- Reordering becomes a state-only operation that the engine naturally consumes.
- The temporary `selectEffectInstances(state)` compatibility adapter is removed.

### Phase 6: Prepare for Future Editor Features

After the boundary is stable, implement UI features on top of editor state:

- Presets as serialized editor state.
- Undo/redo as history over editor state.
- Export settings modal.
- Keyboard shortcuts dispatching store actions.
- Compare modes passed to `renderer.setPreviewMode`.

No engine rewrite should be required for these features.

## Separate Graphics Engine Test Suite

The project should have a dedicated graphics-engine test suite separate from React UI tests.

Recommended scripts:

```json
{
  "scripts": {
    "test:engine": "vitest run src/engine",
    "test:engine:browser": "playwright test tests/engine",
    "test:e2e": "node test-assets/run-all.js"
  }
}
```

These scripts are examples, not current project state. Add them only after adding the matching dependencies/configuration. If the current custom Playwright harness is extended instead, use scripts that match that harness.

Use two layers of engine tests:

```txt
Pure TypeScript tests
- Image budget validation
- Effect instance normalization
- Export settings resolution
- Error mapping
- Resource lifecycle bookkeeping with mocks

Browser/WebGL tests
- Shader compilation
- Render output checks
- Preview/export parity
- Alpha preservation
- Multi-pass effect chain correctness
- Context-loss behavior where practical
```

### Engine Tests Must Not Depend on React

Rules:

- Do not import React components in engine tests.
- Do not render `App`.
- Do not use UI selectors.
- Use engine public APIs directly.
- Use deterministic test images.
- Test output pixels or image hashes where possible.

Example browser test shape:

```ts
test("rgb shift preserves alpha", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    const renderer = createPreviewRenderer(canvas);

    const image = await createTransparentTestImage();
    renderer.setImage(image);
    renderer.setEffects([
      {
        instanceId: "effect-1",
        effectId: "rgbShift",
        enabled: true,
        parameters: { intensity: 0.5, angle: 0, animated: false },
      },
    ]);

    renderer.renderFrame(0);
    return readCenterPixel(canvas);
  });

  expect(result.alpha).toBeLessThan(255);
});
```

The exact helper APIs can differ, but the principle matters: call the graphics engine directly and assert pixels.

### Minimum Engine Test Coverage

Add these tests before or during the migration:

- `ImageBudget` rejects images over max dimension.
- `ImageBudget` rejects images over max decoded pixels.
- `ImageLoader` downscales images that exceed preview budget.
- `PreviewRenderer` disposes textures, materials, and render targets on image replacement.
- `EffectChainRenderer` renders passthrough with no pixel changes beyond tolerance.
- `EffectChainRenderer` applies a single deterministic effect.
- `EffectChainRenderer` applies a multi-pass chain in order.
- RGB Shift preserves alpha.
- Export renderer matches preview for deterministic effects.
- Export renderer uses current preview time for animated effects.
- Export renderer rejects unsupported output sizes.
- `LoadedImageHandle.dispose()` closes image resources exactly once.
- `WebGLCapabilities` rejects dimensions above actual GPU limits.

### Pixel Test Strategy

Use small deterministic fixtures:

```txt
16x16 checkerboard PNG
16x16 transparent PNG
32x16 gradient PNG
64x64 color bars PNG
```

For pixel assertions:

- Prefer exact comparisons for passthrough.
- Use small tolerances for shader output due to GPU/browser differences.
- Compare selected sample pixels first.
- Add whole-image hash tests only after browser variance is understood.

Suggested tolerance:

```ts
const CHANNEL_TOLERANCE = 2;
```

### Why Separate Engine Tests Matter

UI E2E tests answer:

```txt
Can a user click controls and avoid console errors?
```

Engine tests answer:

```txt
Did the shader produce the right pixels?
Were GPU resources released?
Does export match preview?
Do large images fail gracefully?
```

Both are needed. UI E2E alone is not enough for a graphics app.

## Worker Protocol Later

Do not introduce a command protocol during this refactor.

If rendering later moves to a Web Worker with `OffscreenCanvas`, introduce a message protocol then:

```ts
type EngineCommand =
  | { type: "set-image"; image: ImageBitmap }
  | { type: "set-effects"; effects: EffectInstance[] }
  | { type: "resize"; width: number; height: number }
  | { type: "export"; requestId: string; settings: ExportSettings }
  | { type: "dispose" };

type EngineEvent =
  | { type: "ready" }
  | { type: "error"; error: RenderError }
  | { type: "export-complete"; requestId: string; result: ExportResult }
  | { type: "stats"; stats: RenderStats };
```

Until then, a plain TypeScript interface is simpler and easier to test.

## Risk Register

### Risk: Preview parity regressions

Mitigation:

- Add pixel tests before removing React Three Fiber from the preview path.
- Keep old preview path available behind a temporary dev flag during migration if needed.

### Risk: Resource leaks

Mitigation:

- Centralize texture/material/render-target ownership.
- Add explicit `dispose()` tests.
- Use browser devtools during manual stress testing.

### Risk: Browser WebGL differences

Mitigation:

- Keep pixel tolerances small but realistic.
- Run browser engine tests in Chromium first.
- Add Safari/Firefox manual or automated coverage later.

### Risk: Scope creep

Mitigation:

- Do not add presets, undo/redo, or reordering UI until the engine boundary is stable.
- Treat the split as infrastructure work with strict acceptance criteria.

## Acceptance Criteria for the Whole Refactor

- React components do not allocate or dispose Three.js textures, materials, or render targets.
- React hosts the canvas and passes state into a `PreviewRenderer`.
- Export uses `ExportRenderer` and returns a Promise.
- Preview and export consume the same `EffectInstance[]` representation.
- Image loading validates decoded pixel budget before texture allocation.
- Image loading has explicit ownership and cleanup through `LoadedImageHandle.dispose()`.
- Preview/export dimensions are validated against actual WebGL capabilities.
- Direct canvas implementation preserves current DPR, color, aspect-ratio, and resize behavior within test tolerance.
- Engine errors are surfaced in React UI.
- Existing E2E tests pass.
- New `test:engine` suite exists and can run without rendering React.
- New browser/WebGL engine tests cover shader compilation, pixel output, alpha preservation, and export parity.

## Recommended Implementation Order

1. Add Phase 0 test tooling/baseline and the `selectEffectInstances` compatibility adapter.
2. Add engine types, image budget validation, `LoadedImageHandle`, and WebGL capability helpers.
3. Add engine tests for image budget, capability validation, image disposal, and effect instance adaptation.
4. Extract effect chain resource management.
5. Add browser engine tests for passthrough, DPR/resize parity, and RGB Shift alpha.
6. Create `PreviewRenderer` while keeping UI behavior unchanged.
7. Replace React Three Fiber canvas host with plain canvas host after parity tests pass.
8. Refactor export to `ExportRenderer`.
9. Upgrade editor store to native effect instances and remove the compatibility adapter.
10. Add UI features on top of the new boundary.
