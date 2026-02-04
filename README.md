# Corrpt

A client-side web app for applying real-time glitch and distortion effects to images. Inspired by the Glitche iOS app.

## Features

- Real-time WebGL effects with instant preview
- Multi-pass effect chaining (stack multiple effects)
- Full-resolution export
- Drag-and-drop image upload

### Effects

- RGB Shift (chromatic aberration)
- Pixel Sort
- CRT
- Noise
- Smear
- Slice Shift

## Tech Stack

- React + TypeScript
- Three.js / React Three Fiber
- Zustand (state management)
- Tailwind CSS
- Vite

## Development

```bash
npm install
npm run dev
```

## Privacy and Data Collection

Your images never leave your device. All processing happens client-side (on device) in your browser using WebGL. No data is collected, stored, or transmitted to any server.

## License

[Polyform Noncommercial 1.0.0](LICENSE.md) - Source code is provided for reference and educational purposes only. See license for details.
