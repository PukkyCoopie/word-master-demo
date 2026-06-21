/**
 * Lucky 底纹：基于 shader_glossy_gradient（Shadertoy）改造成 tile 可用的离屏 regl 材质。
 */
import createREGL from "regl";
import { materialHubSubscribeTick, materialHubUnsubscribeTick } from "./reglMaterialTicker.js";
import { forceLoseWebglContext } from "./reglDebugLog.js";

const LUCKY_VERT = `
precision highp float;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = 0.5 * (position + 1.0);
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const LUCKY_FRAG = `
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

const LUCKY_SHADER_TIME0 = performance.now();
const OFFSCREEN_TEX_PX = 192;

/** @type {{ offscreen: HTMLCanvasElement, regl: object, draw: object } | null} */
let luckyHub = null;

function ensureLuckyHub() {
  if (luckyHub) return luckyHub;
  const offscreen = document.createElement("canvas");
  offscreen.width = OFFSCREEN_TEX_PX;
  offscreen.height = OFFSCREEN_TEX_PX;
  const regl = createREGL({
    canvas: offscreen,
    attributes: { alpha: false, antialias: false, preserveDrawingBuffer: true },
  });
  const draw = regl({
    vert: LUCKY_VERT,
    frag: LUCKY_FRAG,
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
      iTime: () => (performance.now() - LUCKY_SHADER_TIME0) * 0.001 * 0.7,
    },
  });
  luckyHub = { offscreen, regl, draw };
  return luckyHub;
}

function destroyLuckyHub() {
  if (!luckyHub) return;
  forceLoseWebglContext(luckyHub.regl, luckyHub.offscreen);
  try {
    luckyHub.regl.destroy();
  } catch {
    // no-op
  }
  luckyHub = null;
}

/** @typedef {{ canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, dpr: number, fixedCssWidth?: number, fixedCssHeight?: number }} LuckySubscriber */

/** @type {Set<LuckySubscriber>} */
const luckySubscribers = new Set();

function luckyHubTick() {
  if (luckySubscribers.size === 0 || !luckyHub) return;
  const { offscreen, regl, draw } = luckyHub;
  regl.poll();
  draw({ viewport: { x: 0, y: 0, width: OFFSCREEN_TEX_PX, height: OFFSCREEN_TEX_PX } });
  for (const sub of luckySubscribers) {
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

let luckyTickRegistered = false;

function ensureLuckyTick() {
  if (luckyTickRegistered) return;
  luckyTickRegistered = true;
  materialHubSubscribeTick(luckyHubTick);
}

function stopLuckyTickIfIdle() {
  if (luckySubscribers.size > 0) return;
  if (luckyTickRegistered) {
    materialHubUnsubscribeTick(luckyHubTick);
    luckyTickRegistered = false;
  }
}

function teardownLuckyHubForHmr() {
  if (luckyTickRegistered) {
    materialHubUnsubscribeTick(luckyHubTick);
    luckyTickRegistered = false;
  }
  luckySubscribers.clear();
  destroyLuckyHub();
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    teardownLuckyHubForHmr();
  });
}

/**
 * @param {HTMLCanvasElement} canvas 展示用 2D 画布
 * @param {{ fixedCssWidth?: number, fixedCssHeight?: number }} [options]
 * @returns {() => void} dispose
 */
export function attachLuckyRegl(canvas, options = {}) {
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

  /** @type {LuckySubscriber} */
  const sub = {
    canvas,
    ctx,
    dpr,
    fixedCssWidth: useFixedLayout ? fixedW : undefined,
    fixedCssHeight: useFixedLayout ? fixedH : undefined,
  };

  ensureLuckyHub();
  luckySubscribers.add(sub);
  ensureLuckyTick();
  luckyHubTick();

  return function disposeLuckyRegl() {
    luckySubscribers.delete(sub);
    stopLuckyTickIfIdle();
  };
}

/** 启动时预创建 WebGL / 编译 shader；无订阅者时不参与每帧离屏绘制。 */
export function warmupLuckyReglHub() {
  ensureLuckyHub();
}
