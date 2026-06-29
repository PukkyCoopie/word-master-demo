/** gold 材质 shader（由 goldReglMount.js 抽出，供统一 regl hub 使用） */
import { blitReglOffscreenToSubscriber } from "../reglSubscriberAnimation.js";
import { resolveMaterialShaderITime } from "../reglMaterialITime.js";

export const MATERIAL_ID = "gold";

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
  float T = iTime;
  vec2 fragCoord = vec2(vUv.x * iResolution.x, (1.0 - vUv.y) * iResolution.y);
  float stretch = 1.1;
  vec2 p = stretch * ((fragCoord - 0.5 * iResolution.xy) / iResolution.y) - 0.5;
  vec2 acc = p;
  float c = 0.0;
  float r = length(p + vec2(sin(T), sin(T * 0.222 + 99.0)) * 1.5);
  float d = length(p);
  float rot = d + T + p.x * 0.15;
  for (float n = 0.0; n < 4.0; n += 1.0) {
    mat2 R = mat2(
      cos(rot - sin(T / 4.0)), -sin(cos(rot) - T),
      sin(rot), cos(rot)
    );
    p = -0.15 * (R * p);
    float tn = r - T / (n + 1.5);
    acc -= p + vec2(cos(tn - acc.x - r) + sin(tn + acc.y), sin(tn - acc.y) + cos(tn + acc.x) + r);
    vec2 denom = vec2(sin(acc.x + tn) / 0.15, cos(acc.y + tn) / 0.15);
    c += 1.0 / max(0.001, length(denom));
  }
  c /= 4.0;
  vec3 goldRgb = vec3(c) * vec3(3.55, 2.65, 0.2) - vec3(0.26, 0.3, 0.34);
  vec3 col = mix(vec3(0.5, 0.4, 0.36), goldRgb, 0.8);
  col = clamp(col, 0.0, 1.0);
  vec2 dedge = abs(vUv - 0.5) * 2.0;
  float rim = smoothstep(0.72, 1.0, max(dedge.x, dedge.y));
  col *= 1.0 - 0.07 * rim;
  float topLift = (1.0 - vUv.y) * 0.045;
  col += topLift * vec3(1.0, 0.93, 0.9);
  col = clamp(col, 0.0, 1.0);
  gl_FragColor = vec4(col, 1.0);
}
`;

export function getITime() {
  return resolveMaterialShaderITime(0.14);
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
