/**
 * 闪箔覆层：基于 shader_foil 改造为「单色 + 动态 alpha」。
 * 展示端任意 `position:relative` 容器内铺一块 canvas 即可（字母块、宝藏格等共用）。
 */
import createREGL from "regl";
import { materialHubSubscribeTick, materialHubUnsubscribeTick } from "./reglMaterialTicker.js";
import { forceLoseWebglContext } from "./reglDebugLog.js";

const FOIL_VERT = `
precision highp float;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = 0.5 * (position + 1.0);
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FOIL_FRAG = `
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
varying vec2 vUv;

void main() {
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  /* <1：整体放大纹样，减轻细碎感（与 Shadertoy 原版相比略收空间频率） */
  const float FOIL_PATTERN_SCALE = 0.84;
  vec2 adjustedUv = (uv - 0.5) * vec2(iResolution.x / iResolution.y, 1.0) * FOIL_PATTERN_SCALE;
  vec2 foil = vec2(iTime, iTime * 0.5);

  float fac = clamp(
    2.0 * sin(
      length(90.0 * adjustedUv) + foil.x * 2.0 +
      3.0 * (1.0 + 0.8 * cos(length(113.1121 * adjustedUv) - foil.x * 3.121))
    ) - 1.0 - max(5.0 - length(90.0 * adjustedUv), 0.0),
    0.0,
    1.0
  );

  vec2 rotater = vec2(cos(foil.x * 0.1221), sin(foil.x * 0.3512));
  float angle = dot(rotater, adjustedUv) / max(length(rotater) * length(adjustedUv), 1e-5);
  float fac2 = clamp(
    5.0 * cos(
      foil.y * 0.3 + angle * 3.1415 *
      (2.2 + 0.9 * sin(foil.x * 1.65 + 0.2 * foil.y))
    ) - 4.0 - max(2.0 - length(20.0 * adjustedUv), 0.0),
    0.0,
    1.0
  );

  float fac3 = 0.3 * clamp(
    2.0 * sin(
      foil.x * 5.0 + uv.x * 3.0 * FOIL_PATTERN_SCALE +
      3.0 * (1.0 + 0.5 * cos(foil.x * 7.0))
    ) - 1.0,
    -1.0,
    1.0
  );
  float fac4 = 0.3 * clamp(
    2.0 * sin(
      foil.x * 6.66 + uv.y * 3.8 * FOIL_PATTERN_SCALE +
      3.0 * (1.0 + 0.5 * cos(foil.x * 3.414))
    ) - 1.0,
    -1.0,
    1.0
  );

  float maxfac = max(max(fac, max(fac2, max(fac3, fac4))) + 2.2 * (fac + fac2 + fac3 + fac4), 0.0);
  float alpha = clamp(maxfac * 0.22, 0.0, 0.78);
  if (alpha < 0.01) {
    gl_FragColor = vec4(0.0);
    return;
  }

  /* 淡蓝底；fac2 为角度项，呈锥状光束，亮部略偏白（硬叠交给 CSS mix-blend-mode） */
  vec3 baseColor = vec3(0.15, 0.2, 0.4);
  vec3 bodyBlue = clamp(baseColor + maxfac * vec3(0.08, 0.10, 0.32), 0.0, 1.0);
  vec3 beamHi = vec3(0.94, 0.96, 1.0);
  float conicBeam = clamp(pow(fac2, 0.82) * (0.28 + 0.72 * maxfac), 0.0, 1.0);
  vec3 foilColor = mix(bodyBlue, beamHi, conicBeam);
  vec3 premul = foilColor * alpha;
  gl_FragColor = vec4(premul, alpha);
}
`;

const FOIL_SHADER_TIME0 = performance.now();
const OFFSCREEN_TEX_PX = 192;

/** @type {{ offscreen: HTMLCanvasElement, regl: object, draw: object } | null} */
let foilHub = null;

function ensureFoilHub() {
  if (foilHub) return foilHub;
  const offscreen = document.createElement("canvas");
  offscreen.width = OFFSCREEN_TEX_PX;
  offscreen.height = OFFSCREEN_TEX_PX;
  const regl = createREGL({
    canvas: offscreen,
    attributes: {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      preserveDrawingBuffer: true,
    },
  });
  const draw = regl({
    vert: FOIL_VERT,
    frag: FOIL_FRAG,
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
      iTime: () => (performance.now() - FOIL_SHADER_TIME0) * 0.001 * 0.22,
    },
  });
  foilHub = { offscreen, regl, draw };
  return foilHub;
}

function destroyFoilHub() {
  if (!foilHub) return;
  forceLoseWebglContext(foilHub.regl, foilHub.offscreen);
  try {
    foilHub.regl.destroy();
  } catch {
    // no-op
  }
  foilHub = null;
}

/** @typedef {{ canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, dpr: number, fixedCssWidth?: number, fixedCssHeight?: number }} FoilSubscriber */

/** @type {Set<FoilSubscriber>} */
const foilSubscribers = new Set();

function foilHubTick() {
  if (foilSubscribers.size === 0 || !foilHub) return;
  const { offscreen, regl, draw } = foilHub;
  regl.poll();
  regl.clear({ color: [0, 0, 0, 0], depth: 1 });
  draw({ viewport: { x: 0, y: 0, width: OFFSCREEN_TEX_PX, height: OFFSCREEN_TEX_PX } });
  for (const sub of foilSubscribers) {
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
    const pw = Math.max(2, Math.floor(cssW * sub.dpr));
    const ph = Math.max(2, Math.floor(cssH * sub.dpr));
    if (sub.canvas.width !== pw || sub.canvas.height !== ph) {
      sub.canvas.width = pw;
      sub.canvas.height = ph;
    }
    sub.ctx.clearRect(0, 0, pw, ph);
    sub.ctx.imageSmoothingEnabled = true;
    sub.ctx.imageSmoothingQuality = "high";
    sub.ctx.drawImage(offscreen, 0, 0, OFFSCREEN_TEX_PX, OFFSCREEN_TEX_PX, 0, 0, pw, ph);
  }
}

let foilTickRegistered = false;

function ensureFoilTick() {
  if (foilTickRegistered) return;
  foilTickRegistered = true;
  materialHubSubscribeTick(foilHubTick);
}

function stopFoilTickIfIdle() {
  if (foilSubscribers.size > 0) return;
  if (foilTickRegistered) {
    materialHubUnsubscribeTick(foilHubTick);
    foilTickRegistered = false;
  }
  destroyFoilHub();
}

function teardownFoilHubForHmr() {
  if (foilTickRegistered) {
    materialHubUnsubscribeTick(foilHubTick);
    foilTickRegistered = false;
  }
  foilSubscribers.clear();
  destroyFoilHub();
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    teardownFoilHubForHmr();
  });
}

/**
 * @param {HTMLCanvasElement} canvas 展示用 2D 画布
 * @param {{ fixedCssWidth?: number, fixedCssHeight?: number }} [options]
 * @returns {() => void} dispose
 */
export function attachFoilRegl(canvas, options = {}) {
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

  const ctx = canvas.getContext("2d", { alpha: true, desynchronized: false });
  if (!ctx) return () => {};

  /** @type {FoilSubscriber} */
  const sub = {
    canvas,
    ctx,
    dpr,
    fixedCssWidth: useFixedLayout ? fixedW : undefined,
    fixedCssHeight: useFixedLayout ? fixedH : undefined,
  };

  ensureFoilHub();
  foilSubscribers.add(sub);
  ensureFoilTick();
  foilHubTick();

  return function disposeFoilRegl() {
    foilSubscribers.delete(sub);
    stopFoilTickIfIdle();
  };
}
