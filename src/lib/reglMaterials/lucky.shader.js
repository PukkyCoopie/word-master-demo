/** lucky 材质 shader（由 luckyReglMount.js 抽出，供统一 regl hub 使用） */
import { blitReglOffscreenToSubscriber } from "../reglSubscriberAnimation.js";
import { resolveMaterialShaderITime } from "../reglMaterialITime.js";

export const MATERIAL_ID = "lucky";

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

void main() {
  vec2 fragCoord = vec2(vUv.x * iResolution.x, vUv.y * iResolution.y);
  float mr = min(iResolution.x, iResolution.y);
  vec2 uv = (fragCoord * 2.0 - iResolution.xy) / mr;

  float d = -iTime * 0.5;
  float a = 0.0;
  for (float i = 0.0; i < 8.0; i++) {
    a += cos(i - d - a * uv.x);
    d += sin(uv.y * i + a);
  }
  d += iTime * 0.5;

  vec3 col = vec3(cos(uv * vec2(d, a)) * 0.6 + 0.4, cos(a + d) * 0.5 + 0.5);
  col = cos(col * cos(vec3(d, a, 2.5)) * 0.5 + 0.5);
  col = clamp(col, 0.0, 1.0);
  float rim = smoothstep(0.86, 1.0, max(abs(vUv.x - 0.5), abs(vUv.y - 0.5)) * 2.0);
  col *= 1.0 - rim * 0.08;
  gl_FragColor = vec4(col, 1.0);
}
`;

export function getITime() {
  return resolveMaterialShaderITime(0.7);
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
