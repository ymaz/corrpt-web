uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;

uniform float u_intensity;  // 0-1: grain strength
uniform float u_size;       // 1-8: grain cell size in pixels
uniform float u_speed;      // 0-1: 0=static, 1=30fps animation
uniform float u_seed;       // 0-99: pattern seed (offsets frame counter)
uniform float u_monochrome; // bool: mono vs RGB grain

varying vec2 vUv;

#include ../common/utils.glsl;

// Bilinearly-interpolated smooth noise — organic spatial coherence
float smoothNoise(vec2 uv) {
  vec2 i = floor(uv);
  vec2 f = fract(uv);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i),                  hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

// 4-sample CLT: sum of independent uniform(0,1) → approximately Gaussian
// Returns ~[-1, 1] centered at 0
float grainSample(vec2 uv) {
  float n = smoothNoise(uv)
          + smoothNoise(uv + vec2(19.3, 47.2))
          + smoothNoise(uv + vec2(38.7, 11.5))
          + smoothNoise(uv + vec2(56.1, 73.8));
  return (n - 2.0) * 0.5;
}

// Overlay blend: grain multiplies into shadows, screens into highlights.
// At g=0.5 (neutral): identity. Grain bends with image tonality instead
// of adding a flat brightness delta — this is what makes it feel embedded.
// Also naturally suppresses grain in pure black and pure white.
float overlayBlend(float base, float g) {
  return base < 0.5
    ? 2.0 * base * g
    : 1.0 - 2.0 * (1.0 - base) * (1.0 - g);
}

void main() {
  vec4 color = texture2D(u_texture, vUv);

  // Frame counter: speed=0 → frozen (seed picks pattern), speed=1 → 30fps
  float frame = mod(floor(u_time * u_speed * 30.0) + u_seed, 1024.0);

  vec2 grainUV = vUv * u_resolution / max(1.0, u_size)
               + vec2(frame * 7.31, frame * 4.73);

  if (u_monochrome > 0.5) {
    float n = grainSample(grainUV);
    // Map [-1,1] → [0.5 ± intensity/2]: 0.5 = neutral, wings drive overlay
    float g = clamp(0.5 + n * 0.5 * u_intensity, 0.0, 1.0);
    color.r = overlayBlend(color.r, g);
    color.g = overlayBlend(color.g, g);
    color.b = overlayBlend(color.b, g);
  } else {
    float r = grainSample(grainUV);
    float g = grainSample(grainUV + vec2(100.0, 0.0));
    float b = grainSample(grainUV + vec2(0.0, 100.0));
    color.r = overlayBlend(color.r, clamp(0.5 + r * 0.5 * u_intensity, 0.0, 1.0));
    color.g = overlayBlend(color.g, clamp(0.5 + g * 0.5 * u_intensity, 0.0, 1.0));
    color.b = overlayBlend(color.b, clamp(0.5 + b * 0.5 * u_intensity, 0.0, 1.0));
  }

  gl_FragColor = clamp(color, 0.0, 1.0);
}
