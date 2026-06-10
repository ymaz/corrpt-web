uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_lineCount;    // 100-400: number of scanlines

varying vec2 vUv;

// Halation pass 2/2: vertical 5-tap Gaussian over the bright-passed,
// horizontally blurred buffer from bloom-h. Completes the separable
// radial glow.
vec3 tap(vec2 uv) {
  return texture2D(u_texture, clamp(uv, 0.0, 1.0)).rgb;
}

void main() {
  float lineH = max(2.0, u_resolution.y / u_lineCount);
  float stepY = lineH / u_resolution.y;

  vec3 sum =
    tap(vUv + vec2(0.0, -2.0 * stepY)) * 0.0625 +
    tap(vUv + vec2(0.0, -stepY))       * 0.25 +
    tap(vUv)                            * 0.375 +
    tap(vUv + vec2(0.0, stepY))        * 0.25 +
    tap(vUv + vec2(0.0, 2.0 * stepY))  * 0.0625;

  gl_FragColor = vec4(sum, 1.0);
}
