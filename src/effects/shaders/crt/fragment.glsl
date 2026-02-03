uniform sampler2D u_texture;
uniform vec2 u_resolution;

uniform float u_lineIntensity;  // 0-1: darkness of scanlines
uniform float u_lineCount;      // 100-800: number of scanlines
uniform float u_curvature;      // 0-0.5: barrel distortion amount
uniform float u_vignette;       // 0-1: edge darkening strength

varying vec2 vUv;

// Barrel distortion for screen curvature
vec2 curveUV(vec2 uv, float amount) {
  uv = uv * 2.0 - 1.0;  // Center UV at origin
  vec2 offset = uv.yx * uv.yx * uv.xy * amount;
  uv += offset;
  return uv * 0.5 + 0.5;  // Back to 0-1 range
}

// Vignette darkening at edges
float vignette(vec2 uv, float strength) {
  uv = uv * 2.0 - 1.0;
  float v = 1.0 - dot(uv, uv) * strength;
  return clamp(v, 0.0, 1.0);
}

void main() {
  // Apply barrel distortion
  vec2 uv = u_curvature > 0.0 ? curveUV(vUv, u_curvature) : vUv;

  // Check if UV is out of bounds (due to curvature)
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  // Sample the texture
  vec4 color = texture2D(u_texture, uv);

  // Apply scanlines
  float scanline = sin(uv.y * u_lineCount * 3.14159) * 0.5 + 0.5;
  scanline = pow(scanline, 0.5);  // Soften the scanlines
  float scanlineFactor = 1.0 - (1.0 - scanline) * u_lineIntensity;
  color.rgb *= scanlineFactor;

  // Apply vignette
  color.rgb *= vignette(vUv, u_vignette);

  gl_FragColor = color;
}
