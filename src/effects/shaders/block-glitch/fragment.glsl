uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;

uniform float u_intensity;   // 0-1: maximum block displacement (±30% of image)
uniform float u_gridSizeX;   // 2-32: horizontal block count
uniform float u_gridSizeY;   // 4-64: vertical block count
uniform float u_threshold;   // 0-1: fraction of blocks that displace
uniform float u_seed;        // 0-1000: randomization seed

varying vec2 vUv;

#include ../common/utils.glsl;

void main() {
  vec2 uv = vUv;
  vec2 blockCoord = floor(uv * vec2(u_gridSizeX, u_gridSizeY));

  float blockRand = hash(blockCoord + u_seed);
  float shouldDisplace = step(1.0 - u_threshold, blockRand);

  float offsetX = (hash(blockCoord + vec2(u_seed + 7.3, 0.0)) * 2.0 - 1.0) * u_intensity * 0.3;
  float offsetY = (hash(blockCoord + vec2(0.0, u_seed + 13.7)) * 2.0 - 1.0) * u_intensity * 0.3;
  vec2 dispUV = uv + vec2(offsetX, offsetY) * shouldDisplace;

  gl_FragColor = texture2D(u_texture, dispUV);
}
