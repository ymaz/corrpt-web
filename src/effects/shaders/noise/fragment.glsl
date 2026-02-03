uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;

uniform float u_intensity;    // 0-1: noise strength
uniform float u_scale;        // 1-100: grain size (higher = coarser)
uniform float u_seed;         // 0-1000: randomization seed
uniform float u_monochrome;   // 0 or 1: grayscale vs colored noise

varying vec2 vUv;

// Pseudo-random hash function
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec4 color = texture2D(u_texture, vUv);

  // Scale UV coordinates for grain size control
  vec2 noiseCoord = vUv * u_resolution / u_scale;

  // Add seed offset for different noise patterns
  noiseCoord += vec2(u_seed);

  if (u_monochrome > 0.5) {
    // Grayscale noise
    float n = hash(noiseCoord) * 2.0 - 1.0;
    color.rgb += vec3(n) * u_intensity;
  } else {
    // Colored noise (RGB channels independent)
    float r = hash(noiseCoord) * 2.0 - 1.0;
    float g = hash(noiseCoord + vec2(1.0, 0.0)) * 2.0 - 1.0;
    float b = hash(noiseCoord + vec2(0.0, 1.0)) * 2.0 - 1.0;
    color.rgb += vec3(r, g, b) * u_intensity;
  }

  gl_FragColor = clamp(color, 0.0, 1.0);
}
