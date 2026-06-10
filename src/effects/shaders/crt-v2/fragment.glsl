uniform sampler2D u_texture;  // blurred bright-pass from bloom-h → bloom-v
uniform sampler2D u_source;   // the effect's original input image
uniform vec2 u_resolution;
uniform float u_time;

uniform float u_scanlines;    // 0-1: scanline visibility/sharpness
uniform float u_phosphor;     // 0-1: shadow mask strength + bloom
uniform float u_bleed;        // 0-1: horizontal chroma bleed
uniform float u_degradation;  // 0-1: signal noise + hsync jitter
uniform float u_curvature;    // 0-0.15: barrel distortion
uniform float u_lineCount;    // 100-400: number of scanlines
uniform float u_seed;         // 0-1000: randomization seed

varying vec2 vUv;

#include ../common/utils.glsl;

// Standard radial barrel distortion
vec2 curveUV(vec2 uv, float amount) {
  uv = uv * 2.0 - 1.0;
  float r2 = dot(uv, uv);
  uv *= 1.0 + amount * r2;
  return uv * 0.5 + 0.5;
}

void main() {
  vec2 uv = u_curvature > 0.0 ? curveUV(vUv, u_curvature) : vUv;

  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  vec2 sc = uv * u_resolution;

  // Scanline spacing: derived from lineCount, clamped to min 2px
  float lineH = max(2.0, u_resolution.y / u_lineCount);

  // H-sync jitter: per-row horizontal drift, flickers at ~8fps.
  // Frame counter wrapped to keep hash inputs within float32 precision.
  float row = floor(sc.y / lineH);
  float jFrame = mod(floor(u_time * 8.0), 1024.0);
  float jPx = (hash(vec2(row, jFrame + u_seed)) - 0.5) * u_degradation * 6.0;
  vec2 juv = vec2(clamp(uv.x + jPx / u_resolution.x, 0.0, 1.0), uv.y);
  vec2 jsc = juv * u_resolution;

  // Chroma bleed: R drifts left, B drifts right (composite-style offset)
  float bPx = u_bleed * 10.0;
  float smearW = bPx / u_resolution.x;
  vec2 uvR = clamp(juv + vec2(-bPx / u_resolution.x, 0.0), 0.0, 1.0);
  vec2 uvG = juv;
  vec2 uvB = clamp(juv + vec2(bPx * 0.6 / u_resolution.x, 0.0), 0.0, 1.0);

  // 3-tap weighted smear on R and B (bandwidth-limited chroma like composite video)
  float r = mix(
    texture2D(u_source, uvR).r,
    texture2D(u_source, clamp(uvR - vec2(smearW,     0.0), 0.0, 1.0)).r * 0.3 +
    texture2D(u_source, uvR).r * 0.4 +
    texture2D(u_source, clamp(uvR + vec2(smearW,     0.0), 0.0, 1.0)).r * 0.3,
    u_bleed * 0.6);
  float g = texture2D(u_source, uvG).g;
  float b = mix(
    texture2D(u_source, uvB).b,
    texture2D(u_source, clamp(uvB - vec2(smearW * 0.5, 0.0), 0.0, 1.0)).b * 0.3 +
    texture2D(u_source, uvB).b * 0.4 +
    texture2D(u_source, clamp(uvB + vec2(smearW * 0.5, 0.0), 0.0, 1.0)).b * 0.3,
    u_bleed * 0.45);

  vec3 color = vec3(r, g, b);

  // Pre-compensate brightness so mask + scanlines don't just crush the image dark
  color *= 1.0 + u_phosphor * 0.55 + u_scanlines * 0.4;

  // Scanlines: Gaussian electron beam profile (sharp at high scanlines, soft at low)
  float scanPhase = fract(jsc.y / lineH);
  float beamConc = mix(2.0, 14.0, u_scanlines);
  float beam = exp(-pow((scanPhase - 0.5) * beamConc, 2.0));
  color *= mix(1.0, beam, u_scanlines * 0.9);

  // Shadow mask: sine-wave aperture grille (RGB vertical stripe triads)
  // Cell width tracks scanline height so triads stay square-ish at any resolution
  float cellW = max(3.0, lineH);
  float mc = jsc.x * 6.28318 / (3.0 * cellW);
  float rMask = cos(mc)          * 0.5 + 0.5;
  float gMask = cos(mc - 2.09440) * 0.5 + 0.5;
  float bMask = cos(mc - 4.18879) * 0.5 + 0.5;
  float maskFloor = mix(1.0, 0.2, u_phosphor);
  rMask = mix(maskFloor, 1.0, rMask);
  gMask = mix(maskFloor, 1.0, gMask);
  bMask = mix(maskFloor, 1.0, bMask);
  // Mask is more visible on dark areas (bright areas light all three phosphors)
  float luma = dot(color, vec3(0.299, 0.587, 0.114));
  float maskVis = u_phosphor * (1.0 - luma * 0.45);
  color.r *= mix(1.0, rMask, maskVis);
  color.g *= mix(1.0, gMask, maskVis);
  color.b *= mix(1.0, bMask, maskVis);

  // Phosphor bloom/halation: bright pixels glow into dark neighbors.
  // u_texture is the separably-blurred bright-pass from bloom-h → bloom-v,
  // so a single fetch yields the radial glow (threshold applied in pass 1).
  vec3 glow = texture2D(u_texture, uvG).rgb;
  color += glow * u_phosphor * 1.2;

  // Signal noise (frame-animated). Time wrapped so hash inputs stay within
  // float32 precision on long sessions.
  float tNoise = mod(u_time, 64.0);
  float ns = hash(jsc + vec2(tNoise * 97.3 + u_seed, tNoise * 131.7));
  color = clamp(color + (ns - 0.5) * u_degradation * 0.18, 0.0, 1.0);

  // Subtle always-on vignette
  vec2 vig = vUv * 2.0 - 1.0;
  color *= clamp(1.0 - dot(vig, vig) * 0.3, 0.0, 1.0);

  gl_FragColor = vec4(color, 1.0);
}
