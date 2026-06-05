/** fire 材质 shader（由 fireReglMount.js 抽出，供统一 regl hub 使用） */
import { blitReglOffscreenToSubscriber } from "../reglSubscriberAnimation.js";

export const MATERIAL_ID = "fire";

export const VERT = `
precision highp float;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = 0.5 * (position + 1.0);
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

export const FRAG = `
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
varying vec2 vUv;

float rand(vec2 n) {
  return fract(sin(cos(dot(n, vec2(12.9898, 12.1414)))) * 83758.5453);
}

float noise(vec2 n) {
  const vec2 d = vec2(0.0, 1.0);
  vec2 b = floor(n);
  vec2 f = smoothstep(vec2(0.0), vec2(1.0), fract(n));
  return mix(
    mix(rand(b), rand(b + d.yx), f.x),
    mix(rand(b + d.xy), rand(b + d.yy), f.x),
    f.y
  );
}

float fbm(vec2 n) {
  float total = 0.0;
  float amplitude = 1.0;
  for (int i = 0; i < 5; i++) {
    total += noise(n) * amplitude;
    n += n * 1.7;
    amplitude *= 0.47;
  }
  return total;
}

void main() {
  vec2 fragCoord = vec2(vUv.x * iResolution.x, vUv.y * iResolution.y);
  float alpha = 1.0;

  vec2 uv = fragCoord.xy / iResolution.xy;
  // 小 tile 上保持放大，并再小幅回调一点。
  uv = (uv - 0.5) * 0.28 + 0.5;

  float dist = 3.5 - sin(iTime * 0.4) / 1.89;
  vec2 p = fragCoord.xy * dist / iResolution.xx;
  p *= 0.22;
  p += sin(p.yx * 2.8 + vec2(0.2, -0.3) * iTime) * 0.04;
  p += sin(p.yx * 5.2 + vec2(0.6, 0.1) * iTime) * 0.01;

  p.x -= iTime / 1.1;
  float q = fbm(p - iTime * 0.3 + 1.0 * sin(iTime + 0.5) / 2.0);
  float qb = fbm(p - iTime * 0.4 + 0.1 * cos(iTime) / 2.0);
  float q2 = fbm(p - iTime * 0.44 - 5.0 * cos(iTime) / 2.0) - 6.0;
  float q3 = fbm(p - iTime * 0.9 - 10.0 * cos(iTime) / 15.0) - 4.0;
  float q4 = fbm(p - iTime * 1.4 - 20.0 * sin(iTime) / 14.0) + 2.0;
  q = (q + qb - 0.4 * q2 - 2.0 * q3 + 0.6 * q4) / 3.8;
  vec2 r = vec2(
    fbm(p + q / 2.0 + iTime * 0.1 - p.x - p.y),
    fbm(p + q - iTime * 0.9)
  );

  vec3 color = vec3(1.0, 0.2, 0.05) / (pow((r.y + r.y) * max(0.0, p.y) + 0.1, 4.0));
  float fireNoise = fbm(uv * 5.0 + vec2(iTime * 0.3, -iTime * 0.2));
  vec3 pseudoTex = vec3(fireNoise);
  color += (pseudoTex * 0.01 * pow((r.y + r.y) * 0.65, 5.0) + 0.055) *
    mix(vec3(0.9, 0.4, 0.3), vec3(0.7, 0.5, 0.2), uv.y);
  color = color / (1.0 + max(vec3(0.0), color));

  // 底部亮度稍降，避免过白发亮。
  float bottomMask = 1.0 - smoothstep(0.0, 0.38, uv.y);
  color *= 1.0 - 0.22 * bottomMask;
  // 亮部从偏白转为偏黄。
  float highlight = smoothstep(0.52, 0.95, max(color.r, max(color.g, color.b)));
  color = mix(color, color * vec3(1.0, 0.9, 0.55), 0.42 * highlight);
  // 中上区域火焰偏红。
  float upperMask = smoothstep(0.36, 0.9, uv.y);
  color = mix(color, color * vec3(1.22, 0.8, 0.78), 0.35 * upperMask);
  color = clamp(color, 0.0, 1.0);

  float rim = smoothstep(0.84, 1.0, max(abs(vUv.x - 0.5), abs(vUv.y - 0.5)) * 2.0);
  color *= 1.0 - rim * 0.1;
  gl_FragColor = vec4(color, alpha);
}
`;

const SHADER_TIME0 = performance.now();
export function getITime() {
  return (performance.now() - SHADER_TIME0) * 0.001 * 0.25;
}

/** @param {import("regl").Regl} regl */
export function createDraw(regl) {
  return regl({
    vert: VERT,
    frag: FRAG,
    attributes: {
      position: [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ],
    },
    depth: { enable: false },
    count: 4,
    primitive: "triangle strip",
    uniforms: {
      iResolution: ({ viewportWidth, viewportHeight }) => [viewportWidth, viewportHeight],
      iTime: getITime,
    },
  });
}

/** @param {import("../reglSubscriberAnimation.js").ReglDisplaySubscriber} sub */
export function blitSubscriber(sub, offscreen, texPx) {
  blitReglOffscreenToSubscriber(sub, offscreen, texPx);
}
