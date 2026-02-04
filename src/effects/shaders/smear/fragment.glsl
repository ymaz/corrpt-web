uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;

uniform float u_intensity;   // 0-1: smear length
uniform float u_threshold;   // 0-1: brightness threshold for smear source
uniform float u_vertical;    // 0 or 1: vertical smear instead of horizontal
uniform float u_falloff;     // 0-1: how hard/soft the smear edge is
uniform float u_seed;        // 0-1000: randomization seed

varying vec2 vUv;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float getBrightness(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

void main() {
  vec4 original = texture2D(u_texture, vUv);
  float origBrightness = getBrightness(original.rgb);
  float vert = step(0.5, u_vertical);

  // Per-scanline random smear length variation
  float scanline = vert > 0.5 ? vUv.x : vUv.y;
  float scanRes = vert > 0.5 ? u_resolution.x : u_resolution.y;
  float randFactor = hash(vec2(floor(scanline * scanRes), u_seed));

  // Smear length in pixels, randomized per scanline
  float maxDist = u_intensity * 150.0 * (0.5 + randFactor);

  // Direction to look backward (left or up)
  vec2 dir = mix(vec2(-1.0, 0.0), vec2(0.0, -1.0), vert);
  vec2 pixelStep = dir / u_resolution;

  // If current pixel is already bright, keep it (it's a smear source)
  if (origBrightness > u_threshold) {
    gl_FragColor = original;
    return;
  }

  // Walk backward to find a bright "source" pixel
  vec4 sourceColor = original;
  float sourceDist = 0.0;
  bool foundSource = false;

  for (int i = 1; i <= 150; i++) {
    if (float(i) > maxDist) break;

    vec2 sampleUV = vUv + pixelStep * float(i);
    if (sampleUV.x < 0.0 || sampleUV.y < 0.0 || sampleUV.x > 1.0 || sampleUV.y > 1.0) break;

    vec4 sampleColor = texture2D(u_texture, sampleUV);
    float sampleBrightness = getBrightness(sampleColor.rgb);

    // Found a bright source pixel
    if (sampleBrightness > u_threshold) {
      sourceColor = sampleColor;
      sourceDist = float(i);
      foundSource = true;
      break;
    }
  }

  if (foundSource) {
    // Hard smear: replace pixel with source color
    // Falloff controls edge hardness (0 = hard replacement, 1 = gradient fade)
    float t = sourceDist / maxDist;
    float blend = 1.0 - smoothstep(0.0, u_falloff + 0.01, t);
    gl_FragColor = mix(original, sourceColor, blend);
  } else {
    gl_FragColor = original;
  }
}
