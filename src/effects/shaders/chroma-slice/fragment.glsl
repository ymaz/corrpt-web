uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;

uniform float u_bandCount;     // 3-12: number of horizontal bands
uniform float u_tintStrength;  // 0-1: tint mix over original color
uniform float u_paletteMode;   // 0=warm 1=cool 2=mono 3=chaos
uniform float u_seed;          // 0-1000: randomization seed

varying vec2 vUv;

#include ../common/utils.glsl;

vec3 hsv2rgb(float h, float s, float v) {
  vec3 rgb = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return v * mix(vec3(1.0), rgb, s);
}

vec3 getTint(float band, float mode, float seed) {
  float h      = hash(vec2(band + 0.5, seed + 17.0));
  float s      = hash(vec2(band + 1.5, seed + 31.0));
  float chance = hash(vec2(band + 2.5, seed + 53.0));

  if (mode > 1.5) {
    if (mode < 2.5) return vec3(1.0);
    return hsv2rgb(h, 0.6 + s * 0.4, 1.0);
  }

  // warm (mode < 0.5): reds–yellow-greens; cool (mode < 1.5): teals–indigos; ~30% go mono
  float hue = mode < 0.5 ? h * 0.18 : 0.5 + h * 0.2;
  vec3 tintColor = hsv2rgb(hue, 0.4 + s * 0.5, 1.0);
  return mix(tintColor, vec3(1.0), step(0.7, chance));
}

void main() {
  float band = floor(vUv.y * u_bandCount);

  vec4 color = texture2D(u_texture, vUv);

  float luma = getBrightness(color.rgb);
  vec3 tint = getTint(band, u_paletteMode, u_seed);
  vec3 tinted = (luma * tint) / max(getBrightness(tint), 0.3);
  color.rgb = mix(color.rgb, tinted, u_tintStrength);

  gl_FragColor = color;
}
