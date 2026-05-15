/**
 * 万能符材质底纹：Aurora（Shadertoy M3dSzs，@kishimisu，CC BY-NC-SA 4.0）。
 * iChannel3 用 hash 程序化替代；小 tile 上经曝光与边缘压暗与旧版一致。
 */
import createREGL from "regl";
import { materialHubSubscribeTick, materialHubUnsubscribeTick } from "./reglMaterialTicker.js";
import { forceLoseWebglContext } from "./reglDebugLog.js";

const WILDCARD_VERT = `
precision highp float;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = 0.5 * (position + 1.0);
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const WILDCARD_FRAG = `
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

const OFFSCREEN_TEX_PX = 256;

/** @type {{ offscreen: HTMLCanvasElement, regl: object, draw: object } | null } */
let wildcardHub = null;

function ensureWildcardHub() {
  if (wildcardHub) return wildcardHub;
  const offscreen = document.createElement("canvas");
  offscreen.width = OFFSCREEN_TEX_PX;
  offscreen.height = OFFSCREEN_TEX_PX;
  const regl = createREGL({
    canvas: offscreen,
    attributes: { alpha: false, antialias: false, preserveDrawingBuffer: true },
  });
  const draw = regl({
    vert: WILDCARD_VERT,
    frag: WILDCARD_FRAG,
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
      iTime: () => performance.now() * 0.001,
    },
  });
  wildcardHub = { offscreen, regl, draw };
  return wildcardHub;
}

function destroyWildcardHub() {
  if (!wildcardHub) return;
  forceLoseWebglContext(wildcardHub.regl, wildcardHub.offscreen);
  try {
    wildcardHub.regl.destroy();
  } catch {
    // no-op
  }
  wildcardHub = null;
}

/** @typedef {{ canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, dpr: number, fixedCssWidth?: number, fixedCssHeight?: number }} WildcardSubscriber */
/** @type {Set<WildcardSubscriber>} */
const wildcardSubscribers = new Set();

function wildcardHubTick() {
  if (wildcardSubscribers.size === 0 || !wildcardHub) return;
  const { offscreen, regl, draw } = wildcardHub;
  regl.poll();
  draw({ viewport: { x: 0, y: 0, width: OFFSCREEN_TEX_PX, height: OFFSCREEN_TEX_PX } });
  for (const sub of wildcardSubscribers) {
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
    if (cssW <= 0 || cssH <= 0) continue;
    const pw = Math.max(2, Math.ceil(cssW * sub.dpr));
    const ph = Math.max(2, Math.ceil(cssH * sub.dpr));
    if (sub.canvas.width !== pw || sub.canvas.height !== ph) {
      sub.canvas.width = pw;
      sub.canvas.height = ph;
    }
    sub.ctx.imageSmoothingEnabled = true;
    sub.ctx.imageSmoothingQuality = "high";
    const downsampleRatio = OFFSCREEN_TEX_PX / Math.max(1, Math.max(pw, ph));
    const blurPx = downsampleRatio > 1.0 ? Math.min(0.35, (downsampleRatio - 1.0) * 0.2) : 0.0;
    sub.ctx.filter = blurPx > 0.0 ? `blur(${blurPx.toFixed(3)}px)` : "none";
    sub.ctx.drawImage(offscreen, 0, 0, OFFSCREEN_TEX_PX, OFFSCREEN_TEX_PX, 0, 0, pw, ph);
    sub.ctx.filter = "none";
  }
}

let wildcardTickRegistered = false;

function ensureWildcardTick() {
  if (wildcardTickRegistered) return;
  wildcardTickRegistered = true;
  materialHubSubscribeTick(wildcardHubTick);
}

function stopWildcardTickIfIdle() {
  if (wildcardSubscribers.size > 0) return;
  if (wildcardTickRegistered) {
    materialHubUnsubscribeTick(wildcardHubTick);
    wildcardTickRegistered = false;
  }
}

function teardownWildcardHubForHmr() {
  if (wildcardTickRegistered) {
    materialHubUnsubscribeTick(wildcardHubTick);
    wildcardTickRegistered = false;
  }
  wildcardSubscribers.clear();
  destroyWildcardHub();
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    teardownWildcardHubForHmr();
  });
}

/**
 * @param {HTMLCanvasElement} canvas 展示用 2D 画布
 * @param {{ fixedCssWidth?: number, fixedCssHeight?: number }} [options]
 * @returns {() => void} dispose
 */
export function attachWildcardRegl(canvas, options = {}) {
  const dpr = Math.min(2.25, Math.max(1, window.devicePixelRatio || 1));
  const fixedW = options.fixedCssWidth;
  const fixedH = options.fixedCssHeight;
  const useFixedLayout =
    typeof fixedW === "number" &&
    typeof fixedH === "number" &&
    Number.isFinite(fixedW) &&
    Number.isFinite(fixedH) &&
    fixedW > 0 &&
    fixedH > 0;

  const ctx = canvas.getContext("2d", { alpha: false, desynchronized: false });
  if (!ctx) return () => {};

  /** @type {WildcardSubscriber} */
  const sub = {
    canvas,
    ctx,
    dpr,
    fixedCssWidth: useFixedLayout ? fixedW : undefined,
    fixedCssHeight: useFixedLayout ? fixedH : undefined,
  };

  ensureWildcardHub();
  wildcardSubscribers.add(sub);
  ensureWildcardTick();
  wildcardHubTick();

  return function disposeWildcardRegl() {
    wildcardSubscribers.delete(sub);
    stopWildcardTickIfIdle();
  };
}

/** 启动时预创建 WebGL / 编译 shader；无订阅者时不参与每帧离屏绘制。 */
export function warmupWildcardReglHub() {
  ensureWildcardHub();
}
