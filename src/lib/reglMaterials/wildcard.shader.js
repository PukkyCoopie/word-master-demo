/** wildcard 材质 shader（由 wildcardReglMount.js 抽出，供统一 regl hub 使用） */

import { useMobileMaterialLowPower, reglBlitImageSmoothingQuality } from "../reglMaterialPerf.js";
import { resolveMaterialShaderITime } from "../reglMaterialITime.js";

/** @param {import("../reglSubscriberAnimation.js").ReglDisplaySubscriber} sub */
export function blitWildcardSubscriber(sub, offscreen, texPx) {
  let cssW = sub.canvas.clientWidth;
  let cssH = sub.canvas.clientHeight;
  const useFixed =
    typeof sub.fixedCssWidth === "number" &&
    typeof sub.fixedCssHeight === "number" &&
    Number.isFinite(sub.fixedCssWidth) &&
    Number.isFinite(sub.fixedCssHeight) &&
    sub.fixedCssWidth > 0 &&
    sub.fixedCssHeight > 0;
  if (useFixed) {
    cssW = sub.fixedCssWidth;
    cssH = sub.fixedCssHeight;
  }
  if (cssW <= 0 || cssH <= 0) return;
  const pw = Math.max(2, Math.ceil(cssW * sub.dpr));
  const ph = Math.max(2, Math.ceil(cssH * sub.dpr));
  if (sub.canvas.width !== pw || sub.canvas.height !== ph) {
    sub.canvas.width = pw;
    sub.canvas.height = ph;
  }
  sub.ctx.imageSmoothingEnabled = true;
  sub.ctx.imageSmoothingQuality = reglBlitImageSmoothingQuality();
  const downsampleRatio = texPx / Math.max(1, Math.max(pw, ph));
  const blurPx =
    useMobileMaterialLowPower() || downsampleRatio <= 1.0
      ? 0
      : Math.min(0.35, (downsampleRatio - 1.0) * 0.2);
  sub.ctx.filter = blurPx > 0.0 ? `blur(${blurPx.toFixed(3)}px)` : "none";
  sub.ctx.drawImage(offscreen, 0, 0, texPx, texPx, 0, 0, pw, ph);
  sub.ctx.filter = "none";
}

export const MATERIAL_ID = "wildcard";

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

/* 替代 texture(iChannel3, F/1024.).r */
float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
  p3 += dot(p3, p3.yxz + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float channel3Hash(vec2 F, float t) {
  /* 用低频平滑噪声替代 iChannel3，避免固定高频 grain */
  vec2 uv = (F / 1024.0) * 96.0 + vec2(t * 0.05, -t * 0.035);
  vec2 i = floor(uv);
  vec2 f = fract(uv);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  vec2 dim = iResolution.xy;
  vec2 F = vec2(vUv.x * dim.x, vUv.y * dim.y);

  vec4 O = vec4(0.0);
  float march = 0.0;
  vec3 A = vec3(dim.xy, dim.y);
  float a = iTime;
  float zoom = 0.82;
  vec2 FZoom = (F - A.xy * 0.5) * zoom + A.xy * 0.5;

  for (int i = 0; i < 56; i++) {
    vec3 p = march * normalize(vec3(FZoom + FZoom - A.xy, A.y));
    p.z -= 2.0;
    float r = length(p);
    /* 轻降频，减少 tile 缩放后的摩尔纹 */
    p /= r * 0.115;
    p.xz *= mat2(cos(a * 0.2 + vec4(0.0, 33.0, 11.0, 0.0)));
    float o = min(r - 0.3, channel3Hash(FZoom, a) * 0.055) + 0.1;
    march += o;
    float pattern = sin(p.x + cos(p.y) * cos(p.z))
      * sin(p.z + sin(p.y) * cos(p.x + a));
    O += 0.05 / (0.4 + o)
      * mix(
          smoothstep(
            0.5,
            0.7,
            pattern * 0.9
          ),
          1.0,
          0.15 / (r * r)
        )
      /* 原版 smoothstep(5,0,r) 在 GLSL ES 中 edge0>=edge1 未定义，WebGL1 上常恒为 0 */
      * (1.0 - smoothstep(0.0, 5.0, r))
      * (1.0 + cos(march * 3.0 + vec4(0.0, 1.0, 2.0, 0.0)));
  }

  vec3 col = clamp(O.rgb, 0.0, 1.0);
  /* 极弱抖动，打散 8-bit 量化导致的“等高线”条带 */
  float dither = (hash21(gl_FragCoord.xy + fract(iTime * 3.1) * 127.0) - 0.5) / 255.0;
  col += vec3(dither);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

export function getITime() {
  return resolveMaterialShaderITime(1, { wallClock: true });
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

export { blitWildcardSubscriber as blitSubscriber };
