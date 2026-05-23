# CLAUDE.md

Client-side SPA for real-time glitch/distortion effects on photos. All processing in browser via WebGL.

## Stack

React 19 + TypeScript 5 · Vite 5 · regl (WebGL wrapper) · Zustand · Radix UI · Tailwind · Biome (linting/formatting) · vite-plugin-glsl (`.glsl`/`.vert`/`.frag` → string imports)

## Commands

```bash
npm run dev      # dev server
npm run build    # tsc + production build
npm run lint     # Biome check
npm run lint:fix # Biome auto-fix formatting and safe lint issues — run before every commit
npm test         # Vitest unit tests
npm run test:e2e # playwright test
```

## Architecture

**Effect pipeline**: ping-pong FBO chain — `Original Texture → Effect 1 → Effect 2 → … → Screen`. `renderEffectChain()` (`src/effects/renderEffectChain.ts`) is a pure function shared by both live preview and export.

**Effect registration**: effect definition files in `src/effects/definitions/` self-register via `registerEffect()` as a barrel import side effect. New effects: add file + add to `src/effects/definitions/index.ts`.

**Implemented effects** (7): passthrough, rgbShift, pixelSort, crt, noise, sliceShift, smear.

**Zustand stores** (`src/store/`): `imageStore` (bitmap + dimensions), `effectStore` (activeEffects, parameters, previewMode), `uiStore` (sidebar, modals, theme). Use `getState()` inside the render loop — not React subscriptions.

## Non-obvious conventions

- **Uniform naming**: parameter `foo` → uniform `u_foo`; bool params sent as `0.0`/`1.0` float
- **Color management**: regl context defaults to non-sRGB texture upload (`flipY: false`, `premultiplyAlpha: false`) — bitmaps are pre-flipped at decode time so UV (0,0) reads the bottom
- **Geometry**: shared full-screen `[-1..1]` triangle strip owned by `reglContext`; vertex shaders write `gl_Position = vec4(a_position, 0.0, 1.0)` directly
- **Shader uniforms required by all effects**: `u_texture` (sampler2D), `u_resolution` (vec2, px), `u_time` (float, seconds)
- **Vertex inputs provided by the shared vertex shader** (`passthrough.vert`): `attribute vec2 a_position` (clip-space position) and `varying vec2 vUv` (0–1 UV, Y-up). Fragment shaders receive `vUv`; they do not need to declare or compute it.
- **Fragment precision**: `precision highp float;` is auto-prepended by `createPassCommand` — do not declare it in `.frag` files

## Path aliases

`@/components` `@/hooks` `@/store` `@/effects` `@/lib` `@/types` → respective `src/` dirs.

## Testing

- Unit tests: Vitest (`npm test`), files in `src/**/__tests__/`
- E2E: Playwright — `npm run test:e2e` (upload + effects suites)

## Status

Stages 1–3 complete. Stage 4 (UI polish) in progress. Stage 5 (export) partially done.
