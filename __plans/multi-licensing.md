# Multi-Licensing Strategy

Reference document for future licensing decisions.

## Current Setup

```
corrpt-web (main app)
└── License: Polyform Noncommercial 1.0.0
```

## Planned Future Setup

```
┌─────────────────────────────────────────────────────────────┐
│                    corrpt-web (main app)                    │
│                   License: Polyform NC 1.0.0                │
│                                                             │
│   - App shell, UI components                                │
│   - State management                                        │
│   - Export system                                           │
│   - Premium features                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              corrpt-effects (separate npm package)          │
│                       License: MIT                          │
│                                                             │
│   - GLSL shaders (rgb-shift, pixel-sort, crt, etc.)         │
│   - Effect definitions                                      │
│   - Utility functions for WebGL effects                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Why Multi-License?

| Component | License | Reason |
|-----------|---------|--------|
| Main App | Polyform NC | Protect business, prevent clones |
| Effects/Shaders | MIT | Community adoption, contributions, reputation |

## How It Works

- **You own the code** - You can license different parts differently
- **Each repo has its own LICENSE** - Clear separation
- **No conflict** - They're separate distributions
- **Can change later** - Not locked into any decision

## Implementation Steps (Future)

1. Create new repository: `corrpt-effects`
2. Extract shaders and effect utilities
3. Add MIT LICENSE to that repo
4. Publish to npm: `npm publish`
5. Main app imports from npm package: `import { rgbShift } from 'corrpt-effects'`

## License Comparison

| Aspect | Polyform NC (Main App) | MIT (Effects Package) |
|--------|------------------------|----------------------|
| View source | Yes | Yes |
| Learn from | Yes | Yes |
| Use in projects | No | Yes |
| Commercial use | No | Yes |
| Must credit | Yes | Yes (simple notice) |
| Contributions back | Optional | Optional |

## Legal Notes

- Old versions retain their original license
- New versions can have different license
- As copyright holder, you have full control
- When in doubt, consult an IP attorney

## Files Reference

| File | Location | Purpose |
|------|----------|---------|
| LICENSE.md | /corrpt-web/LICENSE.md | Polyform NC for main app |
| LICENSE | /corrpt-effects/LICENSE | MIT for effects (future) |
| Terms of Service | Deployed app /terms | User agreement (when payments added) |
| Privacy Policy | Deployed app /privacy | If collecting user data |
