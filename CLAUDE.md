# CLAUDE.md

Client-side SPA for real-time glitch/distortion effects on photos. All processing in browser via WebGL.

## Stack

React 19 + TypeScript 6 · Vite 8 · regl (WebGL wrapper) · Zustand · Radix UI · Tailwind 4 · Biome (linting/formatting) · vite-plugin-glsl (`.glsl`/`.vert`/`.frag` → string imports)

## Commands

```bash
npm run dev      # dev server
npm run build    # tsc + production build
npm run lint     # Biome check
npm run lint:fix # Biome auto-fix formatting and safe lint issues — run before every commit
npm test         # Vitest unit tests
npm run test:e2e # Playwright e2e tests
```

## Architecture

**Effect pipeline**: ping-pong FBO chain — `Original Texture → Effect 1 → Effect 2 → … → Screen`. `renderEffectChain()` (`src/effects/renderEffectChain.ts`) is a pure function shared by live preview and export.

**Engine** (`src/engine/`): `reglContext.ts` owns the regl instance and shared geometry; `createEffectChainRenderer.ts` is the functional factory for driving the chain.

**Effect registration**: definition files in `src/effects/definitions/` self-register via `registerEffect()` as a barrel import side effect. To add an effect: create the file, add it to `src/effects/definitions/index.ts`.

**Implemented effects**: see `src/effects/definitions/index.ts` — catalog is in flux, do not rely on a hardcoded list.

**Zustand stores** (`src/store/`): `imageStore` (bitmap + dimensions), `effectStore` (active effects, parameters, previewMode), `uiStore` (sidebar, modals, theme), `presetStore`. Use `getState()` inside the render loop — not React subscriptions.

## Non-obvious conventions

- **Uniform naming**: parameter `foo` → uniform `u_foo`; bool params sent as `0.0`/`1.0` float; enum params sent as their option index (float)
- **Color management**: regl textures use `flipY: false`, `premultiplyAlpha: false` — bitmaps are pre-flipped at decode time so UV (0,0) reads the bottom
- **Geometry**: shared full-screen `[-1..1]` triangle strip owned by `reglContext`; vertex shaders write `gl_Position = vec4(a_position, 0.0, 1.0)` directly
- **Shader uniforms required by all effects**: `u_texture` (sampler2D), `u_resolution` (vec2, px), `u_time` (float, seconds)
- **Vertex inputs** (`passthrough.vert`): `attribute vec2 a_position` (clip-space) and `varying vec2 vUv` (0–1, Y-up). Fragment shaders receive `vUv`; they do not declare or compute it.
- **Fragment precision**: `precision highp float;` is auto-prepended by `createEffectCommand` — do not declare it in `.frag` files

## Path aliases

`@` → `src/` (e.g. `@/store`, `@/effects`, `@/components`)

## Testing

- Unit tests: Vitest (`npm test`), files in `src/**/__tests__/`
- E2E: Playwright — `npm run test:e2e`
