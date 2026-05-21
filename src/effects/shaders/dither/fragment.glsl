uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;

uniform float u_pixelSize;    // 1-7: block size in screen pixels
uniform float u_dither;       // 0-1: Bayer dither strength
uniform float u_contrast;     // 0.5-2.5: pre-quantization contrast
uniform float u_hue;          // 0-1: primary palette hue
uniform float u_hueShift;     // 0-1: offset between primary and secondary hue
uniform float u_saturation;   // 0-1.5: palette saturation
uniform float u_intensity;    // 0-1: wet/dry blend with input — enables layering

varying vec2 vUv;

#include ../common/utils.glsl;

// 4x4 Bayer ordered dither matrix value in [-0.5, 0.5], computed
// recursively from the 2x2 cell B2(x,y) = (2x + 3y) mod 4.
float bayer4x4(vec2 p) {
  vec2 q = floor(mod(p, 4.0));
  vec2 lo = mod(q, 2.0);
  vec2 hi = floor(q / 2.0);
  float b2lo = mod(lo.x * 2.0 + lo.y * 3.0, 4.0);
  float b2hi = mod(hi.x * 2.0 + hi.y * 3.0, 4.0);
  return (4.0 * b2lo + b2hi) / 16.0 - 0.5;
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  // Sample at center of pixelation block for the quantized output, and at
  // full resolution for the wet/dry blend (preserves upstream detail).
  vec2 block = floor(vUv * u_resolution / u_pixelSize);
  vec3 blockSrc = texture2D(u_texture, (block + 0.5) * u_pixelSize / u_resolution).rgb;
  vec3 fullSrc = texture2D(u_texture, vUv).rgb;

  // Contrast-stretched luma + Bayer nudge sized to one tone step (1/3),
  // so full-strength dither moves a value across exactly one boundary.
  float luma = clamp((getBrightness(blockSrc) - 0.5) * u_contrast + 0.5, 0.0, 1.0);
  float t = clamp(luma + bayer4x4(block) * u_dither / 3.0, 0.0, 1.0);
  int level = int(t * 3.0 + 0.5);

  // 4-tone palette: black, primary, hue-shifted secondary, white-tinted primary.
  vec3 primary = hsv2rgb(vec3(u_hue, u_saturation, 1.0));
  vec3 dithered = vec3(0.0);
  if (level == 1) dithered = primary;
  else if (level == 2) dithered = hsv2rgb(vec3(u_hue + u_hueShift, u_saturation, 1.0));
  else if (level == 3) dithered = mix(primary, vec3(1.0), 0.75);

  gl_FragColor = vec4(mix(fullSrc, dithered, u_intensity), 1.0);
}
