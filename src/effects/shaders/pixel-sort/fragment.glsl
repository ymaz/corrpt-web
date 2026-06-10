uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_threshold;
uniform float u_upperThreshold;
uniform float u_spread;
uniform float u_angle;

varying vec2 vUv;

#include ../common/utils.glsl;

const int SAMPLES = 32;

void main() {
  vec4 original = texture2D(u_texture, vUv);
  float brightness = getBrightness(original.rgb);

  // Robust to swapped thresholds (user may set threshold > upperThreshold)
  float lo = min(u_threshold, u_upperThreshold);
  float hi = max(u_threshold, u_upperThreshold);

  if (brightness >= lo && brightness <= hi) {
    vec2 dir = vec2(cos(u_angle), sin(u_angle));
    vec2 sortStep = dir * u_spread / u_resolution;

    vec4 sum = vec4(0.0);
    for (int i = 0; i < SAMPLES; i++) {
      float t = float(i) / float(SAMPLES - 1);
      vec2 offset = sortStep * t;
      sum += texture2D(u_texture, vUv + offset);
    }
    gl_FragColor = sum / float(SAMPLES);
  } else {
    gl_FragColor = original;
  }
}
