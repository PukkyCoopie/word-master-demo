/**
 * 水纹底纹：全局单 WebGL + 单 regl，离屏固定分辨率绘制后贴到各 tile canvas。
 * 视觉目标：接近泳池底的流动光波（caustics）与清澈蓝绿色基底。
 */
import createREGL from "regl";
import { materialHubSubscribeTick, materialHubUnsubscribeTick } from "./reglMaterialTicker.js";
import { forceLoseWebglContext } from "./reglDebugLog.js";

const WATER_VERT = `
precision highp float;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = 0.5 * (position + 1.0);
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const WATER_FRAG = `
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
varying vec2 vUv;

#define TAU 6.28318530718
#define MAX_ITER 5

void main() {
  float time = iTime * 0.5 + 23.0;
  // 缩到 tile 后将原图案进一步放大，避免过于细密。
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

const WATER_SHADER_TIME0 = performance.now();
const OFFSCREEN_TEX_PX = 192;

/** @type {{ offscreen: HTMLCanvasElement, regl: object, draw: object } | null} */
let waterHub = null;

function ensureWaterHub() {
  if (waterHub) return waterHub;
  const offscreen = document.createElement("canvas");
  offscreen.width = OFFSCREEN_TEX_PX;
  offscreen.height = OFFSCREEN_TEX_PX;
  const regl = createREGL({
    canvas: offscreen,
    attributes: { alpha: false, antialias: false, preserveDrawingBuffer: true },
  });
  const draw = regl({
    vert: WATER_VERT,
    frag: WATER_FRAG,
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
      iTime: () => (performance.now() - WATER_SHADER_TIME0) * 0.001 * 0.45,
    },
  });
  waterHub = { offscreen, regl, draw };
  return waterHub;
}

function destroyWaterHub() {
  if (!waterHub) return;
  forceLoseWebglContext(waterHub.regl, waterHub.offscreen);
  try {
    waterHub.regl.destroy();
  } catch {
    // no-op
  }
  waterHub = null;
}

/** @typedef {{ canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, dpr: number, fixedCssWidth?: number, fixedCssHeight?: number }} WaterSubscriber */

/** @type {Set<WaterSubscriber>} */
const waterSubscribers = new Set();

function waterHubTick() {
  if (waterSubscribers.size === 0 || !waterHub) return;
  const { offscreen, regl, draw } = waterHub;
  regl.poll();
  draw({ viewport: { x: 0, y: 0, width: OFFSCREEN_TEX_PX, height: OFFSCREEN_TEX_PX } });
  for (const sub of waterSubscribers) {
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
    sub.ctx.drawImage(offscreen, 0, 0, OFFSCREEN_TEX_PX, OFFSCREEN_TEX_PX, 0, 0, pw, ph);
  }
}

let waterTickRegistered = false;

function ensureWaterTick() {
  if (waterTickRegistered) return;
  waterTickRegistered = true;
  materialHubSubscribeTick(waterHubTick);
}

function stopWaterTickIfIdle() {
  if (waterSubscribers.size > 0) return;
  if (waterTickRegistered) {
    materialHubUnsubscribeTick(waterHubTick);
    waterTickRegistered = false;
  }
}

function teardownWaterHubForHmr() {
  if (waterTickRegistered) {
    materialHubUnsubscribeTick(waterHubTick);
    waterTickRegistered = false;
  }
  waterSubscribers.clear();
  destroyWaterHub();
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    teardownWaterHubForHmr();
  });
}

/**
 * @param {HTMLCanvasElement} canvas 展示用 2D 画布
 * @param {{ fixedCssWidth?: number, fixedCssHeight?: number }} [options]
 * @returns {() => void} dispose
 */
export function attachWaterRegl(canvas, options = {}) {
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
  if (!ctx) {
    return () => {};
  }

  /** @type {WaterSubscriber} */
  const sub = {
    canvas,
    ctx,
    dpr,
    fixedCssWidth: useFixedLayout ? fixedW : undefined,
    fixedCssHeight: useFixedLayout ? fixedH : undefined,
  };

  ensureWaterHub();
  waterSubscribers.add(sub);
  ensureWaterTick();
  waterHubTick();

  return function disposeWaterRegl() {
    waterSubscribers.delete(sub);
    stopWaterTickIfIdle();
  };
}

/** 启动时预创建 WebGL / 编译 shader；无订阅者时不参与每帧离屏绘制。 */
export function warmupWaterReglHub() {
  ensureWaterHub();
}
