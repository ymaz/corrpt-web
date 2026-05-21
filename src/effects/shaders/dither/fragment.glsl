uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;

uniform float u_pixelSize;    // 2-40: block size in screen pixels
uniform float u_dither;       // 0-1: Bayer dither strength
uniform float u_contrast;     // 0.5-2.5: pre-quantization contrast
uniform float u_hue;          // 0-1: primary palette hue
uniform float u_hueShift;     // 0-1: offset between primary and secondary hue
uniform float u_saturation;   // 0-1.5: palette saturation

varying vec2 vUv;

#include ../common/utils.glsl;

// 4x4 Bayer ordered dither matrix, returns value in [-0.5, 0.5].
// Branch chain avoids dynamic array/matrix indexing (WebGL 1 safe).
float bayer4x4(vec2 p) {
  vec2 q = floor(mod(p, 4.0));
  vec4 row;
  if (q.y < 0.5)      row = vec4( 0.0,  8.0,  2.0, 10.0);
  else if (q.y < 1.5) row = vec4(12.0,  4.0, 14.0,  6.0);
  else if (q.y < 2.5) row = vec4( 3.0, 11.0,  1.0,  9.0);
  else                row = vec4(15.0,  7.0, 13.0,  5.0);
  float v;
  if (q.x < 0.5)      v = row.x;
  else if (q.x < 1.5) v = row.y;
  else if (q.x < 2.5) v = row.z;
  else                v = row.w;
  return v / 16.0 - 0.5;
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// 4-tone palette derived from hue / hueShift / saturation.
// Indices 0..3 map shadow -> primary -> secondary -> highlight.
vec3 paletteColor(int idx) {
  if (idx <= 0) return vec3(0.0);
  if (idx == 1) return hsv2rgb(vec3(fract(u_hue), u_saturation, 1.0));
  if (idx == 2) return hsv2rgb(vec3(fract(u_hue + u_hueShift), u_saturation, 1.0));
  vec3 tint = hsv2rgb(vec3(fract(u_hue), u_saturation * 0.35, 1.0));
  return mix(tint, vec3(1.0), 0.4);
}

void main() {
  // Snap to pixel-block grid; sample at block center for stable color.
  float ps = max(1.0, u_pixelSize);
  vec2 block = floor(vUv * u_resolution / ps);
  vec2 snappedUv = (block * ps + ps * 0.5) / u_resolution;
  vec3 src = texture2D(u_texture, snappedUv).rgb;

  // Luma with contrast pivoted around mid-gray.
  float luma = getBrightness(src);
  luma = clamp((luma - 0.5) * u_contrast + 0.5, 0.0, 1.0);

  // Bayer dither offset scaled into one quantization step so it nudges
  // brightness across a level boundary instead of full-range jitter.
  float levels = 4.0;
  float stepSize = 1.0 / (levels - 1.0);
  float d = bayer4x4(block) * u_dither * stepSize;
  float dithered = clamp(luma + d, 0.0, 1.0);

  // Quantize to one of `levels` discrete tones.
  float level = floor(dithered * (levels - 1.0) + 0.5);

  vec3 color = paletteColor(int(level));

  gl_FragColor = vec4(color, 1.0);
}
