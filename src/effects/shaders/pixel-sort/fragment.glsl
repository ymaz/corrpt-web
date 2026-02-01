uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_threshold;
uniform float u_upperThreshold;
uniform float u_spread;
uniform float u_direction;

varying vec2 vUv;

const int SAMPLES = 16;

void main() {
  vec4 original = texture2D(u_texture, vUv);
  float brightness = dot(original.rgb, vec3(0.299, 0.587, 0.114));

  if (brightness >= u_threshold && brightness <= u_upperThreshold) {
    vec2 dir = mix(vec2(1.0, 0.0), vec2(0.0, 1.0), u_direction);
    vec2 texelSize = dir * u_spread / u_resolution * u_resolution;
    vec2 step = dir * u_spread;

    vec4 sum = vec4(0.0);
    for (int i = 0; i < SAMPLES; i++) {
      float t = (float(i) / float(SAMPLES - 1)) - 0.5;
      vec2 offset = step * t;
      sum += texture2D(u_texture, vUv + offset);
    }
    gl_FragColor = sum / float(SAMPLES);
  } else {
    gl_FragColor = original;
  }
}
