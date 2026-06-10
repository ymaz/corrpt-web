uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_intensity;
uniform float u_angle;
uniform float u_jitter;
uniform float u_bands;
uniform float u_seed;       // 0-1000: randomization seed

varying vec2 vUv;

#include ../common/utils.glsl;

void main() {
  vec2 dir = vec2(cos(u_angle), sin(u_angle));
  float base = u_intensity * 0.1;

  // chunky scanline bands: groups of 8px rows, each gets a random CA multiplier
  // range [-0.5, 2.5] at max bands — some rows shift backwards, some 2.5x harder
  float bandRow = floor(vUv.y * u_resolution.y / 8.0);
  float bandMult = mix(1.0, hash(vec2(bandRow, u_seed + 3.14)) * 3.0 - 0.5, u_bands);

  // per-pixel jitter: random UV displacement per channel, distinct from additive color noise
  float jR = (hash(vUv * u_resolution + vec2(0.11 + u_seed, 0.23)) * 2.0 - 1.0) * u_jitter * 0.02;
  float jB = (hash(vUv * u_resolution + vec2(0.83 + u_seed, 0.97)) * 2.0 - 1.0) * u_jitter * 0.02;

  float scaleR = (base + jR) * bandMult;
  float scaleB = (base + jB) * bandMult;

  // G anchored at vUv — same behaviour as v1, preserves the "main image" feel
  float r = texture2D(u_texture, vUv - dir * scaleR).r;
  float g = texture2D(u_texture, vUv).g;
  float b = texture2D(u_texture, vUv + dir * scaleB).b;

  gl_FragColor = vec4(r, g, b, 1.0);
}
