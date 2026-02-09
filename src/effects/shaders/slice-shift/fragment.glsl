uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;

uniform float u_intensity;    // 0-1: maximum displacement
uniform float u_sliceCount;   // 5-100: number of bands
uniform float u_sliceFill;    // 0-1: percentage of slices that shift
uniform float u_seed;         // 0-1000: randomization seed
uniform float u_vertical;     // 0 or 1: vertical slices instead of horizontal

varying vec2 vUv;

#include ../common/utils.glsl;

void main() {
  vec2 uv = vUv;

  // Determine which slice this pixel belongs to
  // Horizontal: slice by Y, shift X
  // Vertical: slice by X, shift Y
  float sliceCoord = u_vertical > 0.5 ? uv.x : uv.y;
  float slice = floor(sliceCoord * u_sliceCount);

  // Generate random value for this slice (0-1)
  float sliceRand = hash(vec2(slice, u_seed));

  // Only shift if random value exceeds threshold (1 - sliceFill)
  float shouldShift = step(1.0 - u_sliceFill, sliceRand);

  // Generate offset direction and magnitude (-1 to 1)
  float offset = (hash(vec2(slice + 100.0, u_seed)) * 2.0 - 1.0) * u_intensity * shouldShift;

  // Apply offset to appropriate axis (branchless)
  float vert = step(0.5, u_vertical);
  uv += vec2(offset * (1.0 - vert), offset * vert);
  uv = clamp(uv, 0.0, 1.0);

  gl_FragColor = texture2D(u_texture, uv);
}
