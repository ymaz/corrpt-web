uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_intensity;
uniform float u_angle;
uniform float u_animated;

varying vec2 vUv;

void main() {
  float angle = u_angle + u_animated * u_time;
  vec2 dir = vec2(cos(angle), sin(angle));
  vec2 offset = dir * u_intensity * 0.02;

  float r = texture2D(u_texture, vUv - offset).r;
  float g = texture2D(u_texture, vUv).g;
  float b = texture2D(u_texture, vUv + offset).b;

  gl_FragColor = vec4(r, g, b, 1.0);
}
