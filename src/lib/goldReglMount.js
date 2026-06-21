/**
 * 流动黄金底纹：全局单 WebGL + 单 regl，离屏固定 128×128 绘制；各展示位 2D canvas drawImage 拉伸填满（fill）。
 * 避免每块 tile / 每次飞回 clone 都 createREGL 造成初始化卡顿。
 */
import createREGL from "regl";
import { materialHubSubscribeTick, materialHubUnsubscribeTick } from "./reglMaterialTicker.js";
import { forceLoseWebglContext } from "./reglDebugLog.js";

const GOLD_FRAG = `
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

const GOLD_VERT = `
precision highp float;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = 0.5 * (position + 1.0);
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const GOLD_SHADER_TIME0 = performance.now();

/** 离屏 shader 固定渲染分辨率；展示位用 2D drawImage 拉伸填充（fill） */
const OFFSCREEN_TEX_PX = 128;

/** @type {{ offscreen: HTMLCanvasElement, regl: object, draw: object } | null} */
let goldHub = null;

function ensureGoldHub() {
  if (goldHub) return goldHub;
  const offscreen = document.createElement("canvas");
  offscreen.width = OFFSCREEN_TEX_PX;
  offscreen.height = OFFSCREEN_TEX_PX;
  const regl = createREGL({
    canvas: offscreen,
    attributes: { alpha: false, antialias: false, preserveDrawingBuffer: true },
  });
  const draw = regl({
    vert: GOLD_VERT,
    frag: GOLD_FRAG,
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
      iTime: () => (performance.now() - GOLD_SHADER_TIME0) * 0.001 * 0.14,
    },
  });
  goldHub = { offscreen, regl, draw };
  return goldHub;
}

function destroyGoldHub() {
  if (!goldHub) return;
  forceLoseWebglContext(goldHub.regl, goldHub.offscreen);
  try {
    goldHub.regl.destroy();
  } catch {
    // no-op
  }
  goldHub = null;
}

/** @typedef {{ canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, dpr: number, fixedCssWidth?: number, fixedCssHeight?: number }} GoldSubscriber */

/** @type {Set<GoldSubscriber>} */
const goldSubscribers = new Set();

function goldHubTick() {
  if (goldSubscribers.size === 0 || !goldHub) return;
  const { offscreen, regl, draw } = goldHub;
  regl.poll();
  draw({ viewport: { x: 0, y: 0, width: OFFSCREEN_TEX_PX, height: OFFSCREEN_TEX_PX } });
  for (const sub of goldSubscribers) {
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
    /* 128×128 离屏整幅 stretch 填满展示位（fill） */
    sub.ctx.drawImage(offscreen, 0, 0, OFFSCREEN_TEX_PX, OFFSCREEN_TEX_PX, 0, 0, pw, ph);
  }
}

let goldTickRegistered = false;

function ensureGoldTick() {
  if (goldTickRegistered) return;
  goldTickRegistered = true;
  materialHubSubscribeTick(goldHubTick);
}

function stopGoldTickIfIdle() {
  if (goldSubscribers.size > 0) return;
  if (goldTickRegistered) {
    materialHubUnsubscribeTick(goldHubTick);
    goldTickRegistered = false;
  }
}

function teardownGoldHubForHmr() {
  if (goldTickRegistered) {
    materialHubUnsubscribeTick(goldHubTick);
    goldTickRegistered = false;
  }
  goldSubscribers.clear();
  destroyGoldHub();
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    teardownGoldHubForHmr();
  });
}

/**
 * @param {HTMLCanvasElement} canvas 展示用 2D 画布（与 TileGoldRegl / 飞回 DOM 共用类名即可）
 * @param {{ fixedCssWidth?: number, fixedCssHeight?: number }} [options] 飞回动画连续改宽高时用固定 CSS 尺寸，不挂 ResizeObserver
 * @returns {() => void} dispose
 */
export function attachGoldRegl(canvas, options = {}) {
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

  /** @type {GoldSubscriber} */
  const sub = {
    canvas,
    ctx,
    dpr,
    fixedCssWidth: useFixedLayout ? fixedW : undefined,
    fixedCssHeight: useFixedLayout ? fixedH : undefined,
  };

  ensureGoldHub();
  goldSubscribers.add(sub);
  ensureGoldTick();
  goldHubTick();

  return function disposeGoldRegl() {
    goldSubscribers.delete(sub);
    stopGoldTickIfIdle();
  };
}

/** 启动时预创建 WebGL / 编译 shader；无订阅者时不参与每帧离屏绘制。 */
export function warmupGoldReglHub() {
  ensureGoldHub();
}
