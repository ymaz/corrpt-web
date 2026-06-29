uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;

uniform float u_pixelSize;    // 1-7: block size in screen pixels
uniform float u_dither;       // 0-1: Bayer dither strength
uniform float u_contrast;     // 0.5-2.5: pre-quantization contrast
uniform float u_hue;          // 0-1: primary palette hue
uniform float u_hueShift;     // 0-1: offset between primary and secondary hue
uniform float u_saturation;   // 0-1: palette saturation
uniform float u_intensity;    // 0-1: wet/dry blend with input — enables layering
uniform float u_levels;       // 2-6: number of palette tones

varying vec2 vUv;

#include ../common/utils.glsl;

// 4x4 Bayer ordered dither matrix value in [-0.5, 0.4375], computed
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

// Palette for `level` of `levels` tones:
//   level 0           -> black (shadow)
//   level levels-1    -> saturated primary at levels==2 (duotone), otherwise
//                        a near-white tint so 3+ tones have a distinct highlight
//   middle levels     -> hue lerps from primary to primary+hueShift, so N=4
//                        reproduces [black, primary, secondary, tint] and
//                        higher N inserts intermediate hues between them.
vec3 paletteColor(int level, float levels) {
  vec3 primary = hsv2rgb(vec3(u_hue, u_saturation, 1.0));
  if (level <= 0) return vec3(0.0);
  if (float(level) >= levels - 1.0) {
    return levels < 2.5 ? primary : mix(primary, vec3(1.0), 0.75);
  }
  // With only one middle slot (levels == 3) keep t = 0 so it lands on primary.
  float t = levels > 3.5 ? float(level - 1) / (levels - 3.0) : 0.0;
  return hsv2rgb(vec3(u_hue + u_hueShift * t, u_saturation, 1.0));
}

void main() {
  // Sample at center of pixelation block for the quantized output, and at
  // full resolution for the wet/dry blend (preserves upstream detail).
  // max() guards keep the divisors safe if a non-UI write ever bypasses the
  // param min clamps.
  float ps = max(u_pixelSize, 1.0);
  vec2 block = floor(vUv * u_resolution / ps);
  vec3 blockSrc = texture2D(u_texture, (block + 0.5) * ps / u_resolution).rgb;
  vec4 fullSrc = texture2D(u_texture, vUv);

  float steps = max(u_levels - 1.0, 1.0);
  float luma = clamp((getBrightness(blockSrc) - 0.5) * u_contrast + 0.5, 0.0, 1.0);
  float t = clamp(luma + bayer4x4(block) * u_dither / steps, 0.0, 1.0);
  int level = int(t * steps + 0.5);

  vec3 dithered = paletteColor(level, u_levels);
  gl_FragColor = vec4(mix(fullSrc.rgb, dithered, u_intensity), fullSrc.a);
}
