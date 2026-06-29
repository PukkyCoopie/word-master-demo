/** water 材质 shader（由 waterReglMount.js 抽出，供统一 regl hub 使用） */
import { blitReglOffscreenToSubscriber } from "../reglSubscriberAnimation.js";
import { resolveMaterialShaderITime } from "../reglMaterialITime.js";

export const MATERIAL_ID = "water";

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

#define TAU 6.28318530718
#define MAX_ITER 5

void main() {
  float time = iTime * 0.5 + 23.0;
  vec2 uv = (vUv - 0.5) * 0.56 + 0.5;

  vec2 p = mod(uv * TAU, TAU) - 250.0;
  vec2 i = p;
  float c = 1.0;
  float inten = 0.005;
  for (int n = 0; n < MAX_ITER; n++) {
    float t = time * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
    c += 1.0 / length(vec2(
      p.x / (sin(i.x + t) / inten),
      p.y / (cos(i.y + t) / inten)
    ));
  }
  c /= float(MAX_ITER);
  c = 1.17 - pow(c, 1.4);
  vec3 colour = vec3(pow(abs(c), 8.0));
  colour = clamp(colour + vec3(0.0, 0.35, 0.5), 0.0, 1.0);

  float rim = smoothstep(0.86, 1.0, max(abs(vUv.x - 0.5), abs(vUv.y - 0.5)) * 2.0);
  colour *= 1.0 - rim * 0.08;
  gl_FragColor = vec4(colour, 1.0);
}
`;

export function getITime() {
  return resolveMaterialShaderITime(0.45);
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
