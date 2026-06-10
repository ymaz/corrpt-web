uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_lineCount;    // 100-400: number of scanlines

varying vec2 vUv;

// Halation pass 1/2: bright-pass + horizontal 5-tap Gaussian.
// Tap spacing tracks scanline height so the glow radius scales with the
// simulated phosphor grid rather than the raw pixel grid.
vec3 brightTap(vec2 uv) {
  return max(vec3(0.0), texture2D(u_texture, clamp(uv, 0.0, 1.0)).rgb - 0.5);
}

void main() {
  float lineH = max(2.0, u_resolution.y / u_lineCount);
  float stepX = lineH / u_resolution.x;

  vec3 sum =
    brightTap(vUv + vec2(-2.0 * stepX, 0.0)) * 0.0625 +
    brightTap(vUv + vec2(-stepX,       0.0)) * 0.25 +
    brightTap(vUv)                            * 0.375 +
    brightTap(vUv + vec2(stepX,        0.0)) * 0.25 +
    brightTap(vUv + vec2(2.0 * stepX,  0.0)) * 0.0625;

  gl_FragColor = vec4(sum, 1.0);
}
