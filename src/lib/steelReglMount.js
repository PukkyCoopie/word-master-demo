/**
 * 不锈钢 tile：Quantock Voronoi + Shade + Sky（tap2 用 hash 替代 iChannel0）。
 * 平面 tile：主光绕 nAvg 每 18s 一圈，相位 easeInOutExpo；lightCol 按 dot(nAvg,L) clamp 补偿锁曝光；tilt 极弱。
 * 轻微「上亮下暗」放在 gamma 之后、小幅 sRGB 乘子。调试 NDJSON 常由 ingest 写入 `.cursor/debug-51e419.log`。
 */
import createREGL from "regl";
import { materialHubSubscribeTick, materialHubUnsubscribeTick } from "./reglMaterialTicker.js";
import { forceLoseWebglContext } from "./reglDebugLog.js";

const STEEL_VERT = `
precision highp float;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = 0.5 * (position + 1.0);
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const STEEL_FRAG = `
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
varying vec2 vUv;

/* ---------- 可调（保持 Shade 内公式结构；tile 上主要调这里） ---------- */
#define STEEL_POS_XY_SCALE 0.42
#define STEEL_POS_XY_OFF_X 0.29
#define STEEL_POS_XY_OFF_Y 0.21
#define STEEL_POS_Z 0.21
/* Voronoi 域：越大 tile 上越多「玑镂」小格；原 cube 面约 pos*4，tile 上略抬高密度 */
#define STEEL_UVW_MUL 6.4
#define STEEL_ANISOTROPY 0.78
#define STEEL_NH_Q_MUL 8.75
#define STEEL_AH_POW 4.0
/* ray 符号正确后可用更接近原版的指数；仍低于 4 以免小 tile 上过尖过曝 */
#define STEEL_SPEC_EXP2_K 2.72
#define STEEL_SPEC_OVERALL 2.0
#define STEEL_SPEC_SMOOTHSTEP_MAX 0.42
#define STEEL_FRENEL_POW 5.0
#define STEEL_FRENEL_MIX_HI 0.195
#define STEEL_ORBIT_DIFF_BLEND 0.40
#define STEEL_ORBIT_SPEC_BLEND 0.82
#define STEEL_FILL_DIFFUSE 0.08
#define STEEL_SPEC_NDOT_BOOST 0.07
/* 主光：18s 一圈，相位经 easeInOutExpo；lightCol 按 dot(nAvg,L) 补偿以锁曝光 */
#define STEEL_ORBIT_PERIOD_SEC 18.0
#define STEEL_EXPOS_LOCK_NDOT 0.40
#define STEEL_EXPOS_GAIN_MIN 0.90
#define STEEL_EXPOS_GAIN_MAX 1.12
#define STEEL_LIGHT_TILT_XY 0.018
#define STEEL_ALBEDO_R 0.29
#define STEEL_ALBEDO_G 0.30
#define STEEL_ALBEDO_B 0.32
/* 横向：BASE 抬 nx 下限保高光；钟形在 u=0.5 再加一档，把包络从纯右上往中上收 */
#define STEEL_N_BASE_X 0.27
#define STEEL_N_CENTER_BELL 0.085
#define STEEL_N_DOME_X 0.065
#define STEEL_N_BIAS_Y 0.26
#define STEEL_N_DOME_Y 0.055
/* gamma 后、sRGB 空间提亮（仍避免 clamp 前强线性倍率） */
#define STEEL_GAMMA_POST_GAIN 1.0
#define STEEL_GAMMA_V_BOT 1.02
#define STEEL_GAMMA_V_TOP 1.12
float h11(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
  p3 += dot(p3, p3.yxz + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float steelSmoothNoiseT(float t, float seed) {
  float i = floor(t);
  float f = fract(t);
  float u = f * f * (3.0 - 2.0 * f);
  return mix(h11(vec2(i + seed * 3.1, seed + 1.7)), h11(vec2(i + 1.0 + seed * 3.1, seed + 1.7)), u);
}

vec3 steelTileNAvg() {
  return normalize(vec3(
    STEEL_N_BASE_X + STEEL_N_CENTER_BELL,
    STEEL_N_BIAS_Y,
    1.0
  ));
}

vec3 steelRodrigues(vec3 v, vec3 k, float a) {
  vec3 kk = normalize(k);
  float ca = cos(a);
  float sa = sin(a);
  return v * ca + cross(kk, v) * sa + kk * dot(kk, v) * (1.0 - ca);
}

/* Robert Penner easeInOutExpo：0/1 端趋平，中段变化快；用于每圈相位的 u */
float steelEaseInOutExpo(float t) {
  if (t <= 0.0) return 0.0;
  if (t >= 1.0) return 1.0;
  if (t < 0.5) {
    return pow(2.0, 20.0 * t - 10.0) / 2.0;
  }
  return (2.0 - pow(2.0, -20.0 * t + 10.0)) / 2.0;
}

vec3 steelOrbitingLightDir(float t) {
  vec3 L0 = normalize(vec3(3.0, 2.0, -1.0));
  vec3 nAvg = steelTileNAvg();
  float phase = fract(t / STEEL_ORBIT_PERIOD_SEC);
  float u = steelEaseInOutExpo(phase);
  float ang = u * 6.28318530718;
  vec3 Lr = steelRodrigues(L0, nAvg, ang);
  vec3 aux = vec3(0.58, 0.58, 0.0);
  vec3 uu = cross(nAvg, aux);
  if (dot(uu, uu) < 1e-8) {
    uu = cross(nAvg, vec3(0.0, 1.0, 0.0));
  }
  uu = normalize(uu);
  vec3 vv = normalize(cross(nAvg, uu));
  float tx = (steelSmoothNoiseT(t * 0.07, 8.88) - 0.5) * STEEL_LIGHT_TILT_XY;
  float ty = (steelSmoothNoiseT(t * 0.065, 3.17) - 0.5) * STEEL_LIGHT_TILT_XY;
  return normalize(Lr + uu * tx + vv * ty);
}

vec4 tap2(vec3 p) {
  vec2 uv = p.xy + vec2(37.0, 17.0) * p.z;
  vec2 ip = floor(uv);
  return vec4(
    h11(ip + vec2(0.0, 0.0)),
    h11(ip + vec2(13.7, 2.4)),
    h11(ip + vec2(41.2, 11.0)),
    h11(ip + vec2(91.0, 67.0))
  );
}

vec3 Sky(vec3 ray) {
  return mix(vec3(.8), vec3(0.0), exp2(-(1.0 / max(ray.y, .01)) * vec3(.4, .6, 1.0)));
}

vec3 VoronoiNode(vec2 seed) {
  seed = seed - 0.5;
  float z = abs(seed.x) + abs(seed.y) - 0.5;
  if (z > 0.0) {
    seed = fract(seed) - 0.5;
    return vec3(seed, z);
  }
  return vec3(seed, z);
}

struct VoronoiNeighbours {
  vec3 p0;
  float d0;
  vec3 p1;
  float d1;
  float d2;
};

void VoronoiTest(inout VoronoiNeighbours r, vec3 pos, vec3 node) {
  float l = length(node - pos);
  if (l < r.d0) {
    r.d2 = r.d1;
    r.p1 = r.p0;
    r.d1 = r.d0;
    r.p0 = node;
    r.d0 = l;
  } else if (l < r.d1) {
    r.d2 = r.d1;
    r.p1 = node;
    r.d1 = l;
  } else if (l < r.d2) {
    r.d2 = l;
  }
}

VoronoiNeighbours Voronoi(vec3 x) {
  vec3 p = floor(x + 0.5);
  vec3 d = vec3(-1.0, 0.0, 1.0);

  vec4 _00 = tap2(p + d.xxx);
  vec2 _000 = _00.yw;
  vec2 _001 = _00.xz;
  vec4 _01 = tap2(p + d.xyx);
  vec2 _010 = _01.yw;
  vec2 _011 = _01.xz;
  vec4 _02 = tap2(p + d.xzx);
  vec2 _020 = _02.yw;
  vec2 _021 = _02.xz;
  vec4 _10 = tap2(p + d.yxx);
  vec2 _100 = _10.yw;
  vec2 _101 = _10.xz;
  vec4 _11 = tap2(p + d.yyx);
  vec2 _110 = _11.yw;
  vec2 _111 = _11.xz;
  vec4 _12 = tap2(p + d.yzx);
  vec2 _120 = _12.yw;
  vec2 _121 = _12.xz;
  vec4 _20 = tap2(p + d.zxx);
  vec2 _200 = _20.yw;
  vec2 _201 = _20.xz;
  vec4 _21 = tap2(p + d.zyx);
  vec2 _210 = _21.yw;
  vec2 _211 = _21.xz;
  vec4 _22 = tap2(p + d.zzx);
  vec2 _220 = _22.yw;
  vec2 _221 = _22.xz;

  vec4 t002 = tap2(p + d.xxz);
  vec2 _002 = t002.yw;
  vec4 t012 = tap2(p + d.xyz);
  vec2 _012 = t012.yw;
  vec4 t022 = tap2(p + d.xzz);
  vec2 _022 = t022.yw;
  vec4 t102 = tap2(p + d.yxz);
  vec2 _102 = t102.yw;
  vec4 t112 = tap2(p + d.yyz);
  vec2 _112 = t112.yw;
  vec4 t122 = tap2(p + d.yzz);
  vec2 _122 = t122.yw;
  vec4 t202 = tap2(p + d.zxz);
  vec2 _202 = t202.yw;
  vec4 t212 = tap2(p + d.zyz);
  vec2 _212 = t212.yw;
  vec4 t222 = tap2(p + d.zzz);
  vec2 _222 = t222.yw;

  VoronoiNeighbours r;
  r.p0 = vec3(0.0);
  r.d0 = 10.0;
  r.p1 = vec3(0.0);
  r.d1 = 10.0;
  r.d2 = 10.0;

  VoronoiTest(r, x, VoronoiNode(_000) + d.xxx + p);
  VoronoiTest(r, x, VoronoiNode(_001) + d.xxy + p);
  VoronoiTest(r, x, VoronoiNode(_002) + d.xxz + p);
  VoronoiTest(r, x, VoronoiNode(_010) + d.xyx + p);
  VoronoiTest(r, x, VoronoiNode(_011) + d.xyy + p);
  VoronoiTest(r, x, VoronoiNode(_012) + d.xyz + p);
  VoronoiTest(r, x, VoronoiNode(_020) + d.xzx + p);
  VoronoiTest(r, x, VoronoiNode(_021) + d.xzy + p);
  VoronoiTest(r, x, VoronoiNode(_022) + d.xzz + p);
  VoronoiTest(r, x, VoronoiNode(_100) + d.yxx + p);
  VoronoiTest(r, x, VoronoiNode(_101) + d.yxy + p);
  VoronoiTest(r, x, VoronoiNode(_102) + d.yxz + p);
  VoronoiTest(r, x, VoronoiNode(_110) + d.yyx + p);
  VoronoiTest(r, x, VoronoiNode(_111) + d.yyy + p);
  VoronoiTest(r, x, VoronoiNode(_112) + d.yyz + p);
  VoronoiTest(r, x, VoronoiNode(_120) + d.yzx + p);
  VoronoiTest(r, x, VoronoiNode(_121) + d.yzy + p);
  VoronoiTest(r, x, VoronoiNode(_122) + d.yzz + p);
  VoronoiTest(r, x, VoronoiNode(_200) + d.zxx + p);
  VoronoiTest(r, x, VoronoiNode(_201) + d.zxy + p);
  VoronoiTest(r, x, VoronoiNode(_202) + d.zxz + p);
  VoronoiTest(r, x, VoronoiNode(_210) + d.zyx + p);
  VoronoiTest(r, x, VoronoiNode(_211) + d.zyy + p);
  VoronoiTest(r, x, VoronoiNode(_212) + d.zyz + p);
  VoronoiTest(r, x, VoronoiNode(_220) + d.zzx + p);
  VoronoiTest(r, x, VoronoiNode(_221) + d.zzy + p);
  VoronoiTest(r, x, VoronoiNode(_222) + d.zzz + p);

  return r;
}

vec3 Shade(vec3 pos, vec3 ray, vec3 normal, vec3 lightDir, vec3 lightCol) {
  vec3 LFill = normalize(vec3(3.0, 2.0, -1.0));
  vec3 Ldiff = normalize(mix(LFill, lightDir, STEEL_ORBIT_DIFF_BLEND));
  vec3 Lspec = normalize(mix(LFill, lightDir, STEEL_ORBIT_SPEC_BLEND));
  float ndDiff = dot(normal, Ldiff);
  float ndFill = max(0.0, dot(normal, LFill));
  vec3 light = lightCol * max(0.0, ndDiff);
  light += lightCol * STEEL_FILL_DIFFUSE * ndFill;
  /* 原版面向整场景；平面小 tile 略抬环境瓣，避免只剩压暗的漫反射 */
  light += mix(vec3(.01, .04, .08), vec3(.15), (-normal.y + 1.0));

  vec3 h = normalize(Lspec - ray);

  vec3 uvw = pos * STEEL_UVW_MUL;
  VoronoiNeighbours v = Voronoi(uvw);

  float weight0 = max(0.0, 1.0 - v.d0) * pow(max(0.0001, v.d2 - v.d0), 2.0);
  float weight1 = max(0.0, 1.0 - v.d1) * pow(max(0.0001, v.d2 - v.d1), 2.0);

  vec3 aniso0 = v.p0 - uvw;
  vec3 aniso1 = v.p1 - uvw;
  aniso0 -= normal * dot(aniso0, normal);
  aniso1 -= normal * dot(aniso1, normal);
  aniso0 = normalize(aniso0 + 1e-5);
  aniso1 = normalize(aniso1 + 1e-5);

  float anisotropy = STEEL_ANISOTROPY;

  float nh = max(0.0, dot(normal, h));
  float ah0 = abs(dot(h, aniso0));
  float ah1 = abs(dot(h, aniso1));

  float q = exp2((1.0 - anisotropy) * 1.0);
  nh = pow(nh, q * STEEL_NH_Q_MUL);
  float nh0 = nh * pow(1.0 - ah0 * anisotropy, STEEL_AH_POW);
  float nh1 = nh * pow(1.0 - ah1 * anisotropy, STEEL_AH_POW);
  float specular0 = nh0 * exp2((1.0 - anisotropy) * STEEL_SPEC_EXP2_K);
  float specular1 = nh1 * exp2((1.0 - anisotropy) * STEEL_SPEC_EXP2_K);

  float wsum = weight0 + weight1;
  vec3 specular = lightCol * mix(specular0, specular1, wsum > 1e-6 ? (weight1 / wsum) : 0.0);
  specular *= STEEL_SPEC_OVERALL;
  float ndSpec = dot(normal, Lspec);
  float ndotGate = max(ndDiff, ndSpec * 0.94);
  specular *= smoothstep(0.0, STEEL_SPEC_SMOOTHSTEP_MAX, ndotGate + STEEL_SPEC_NDOT_BOOST);

  vec3 reflection = Sky(reflect(ray, normal));
  /* 与原版一致：ray 为射向表面的入射方向，dot(n,ray)<0，故 1+dot∈[0,1]；勿用 +Z「从面出发」视向量，否则 fresnel 爆炸、整面发白 */
  float fresnel = pow(1.0 + dot(normal, ray), STEEL_FRENEL_POW);
  fresnel = mix(0.0, STEEL_FRENEL_MIX_HI, clamp(fresnel, 0.0, 1.0));

  vec3 albedo = vec3(STEEL_ALBEDO_R, STEEL_ALBEDO_G, STEEL_ALBEDO_B);

  return mix(light * albedo, reflection, fresnel) + specular;
}

void main() {
  float asp = iResolution.x / max(iResolution.y, 1.0);
  vec3 ray = normalize(vec3(
    (vUv.x - 0.5) * asp * 0.48,
    (vUv.y - 0.5) * 0.48,
    -1.0
  ));
  float tcx = vUv.x - 0.5;
  float tcy = vUv.y - 0.5;
  float nx =
    STEEL_N_BASE_X +
    STEEL_N_CENTER_BELL * (1.0 - 4.0 * tcx * tcx) +
    tcx * STEEL_N_DOME_X;
  float ny = STEEL_N_BIAS_Y + tcy * STEEL_N_DOME_Y;
  vec3 normal = normalize(vec3(nx, ny, 1.0));
  vec3 lightDir = steelOrbitingLightDir(iTime);
  vec3 nAvgE = steelTileNAvg();
  float mu = max(0.12, dot(nAvgE, lightDir));
  float expGain = clamp(STEEL_EXPOS_LOCK_NDOT / mu, STEEL_EXPOS_GAIN_MIN, STEEL_EXPOS_GAIN_MAX);
  vec3 lightCol = vec3(0.98, 0.95, 0.92) * expGain;
  vec2 su = vec2(vUv.x, 1.0 - vUv.y);
  vec3 pos = vec3(
    su.x * STEEL_POS_XY_SCALE + STEEL_POS_XY_OFF_X,
    su.y * STEEL_POS_XY_SCALE + STEEL_POS_XY_OFF_Y,
    STEEL_POS_Z
  );

  vec3 col = Shade(pos, ray, normal, lightDir, lightCol);

  col = clamp(col, 0.0, 1.0);
  vec2 dedge = abs(vUv - 0.5) * 2.0;
  float rim = smoothstep(0.86, 1.0, max(dedge.x, dedge.y));
  col *= 1.0 - 0.06 * rim;
  col = pow(col, vec3(1.0 / 2.2));
  float vGrad = smoothstep(0.06, 0.94, vUv.y);
  col *= STEEL_GAMMA_POST_GAIN * mix(STEEL_GAMMA_V_BOT, STEEL_GAMMA_V_TOP, vGrad);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

const STEEL_SHADER_TIME0 = performance.now();

const OFFSCREEN_TEX_PX = 256;

/** @type {{ offscreen: HTMLCanvasElement, regl: object, draw: object } | null} */
let steelHub = null;

function ensureSteelHub() {
  if (steelHub) return steelHub;
  const offscreen = document.createElement("canvas");
  offscreen.width = OFFSCREEN_TEX_PX;
  offscreen.height = OFFSCREEN_TEX_PX;
  const regl = createREGL({
    canvas: offscreen,
    attributes: { alpha: false, antialias: false, preserveDrawingBuffer: true },
  });
  const draw = regl({
    vert: STEEL_VERT,
    frag: STEEL_FRAG,
    attributes: {
      position: [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ],
    },
    depth: { enable: false },
    cull: { enable: false },
    blend: { enable: false },
    count: 6,
    primitive: "triangles",
    uniforms: {
      iResolution: ({ viewportWidth, viewportHeight }) => [viewportWidth, viewportHeight],
      iTime: () => (performance.now() - STEEL_SHADER_TIME0) * 0.001,
    },
  });
  steelHub = { offscreen, regl, draw };
  return steelHub;
}

function destroySteelHub() {
  if (!steelHub) return;
  forceLoseWebglContext(steelHub.regl, steelHub.offscreen);
  try {
    steelHub.regl.destroy();
  } catch {
    // no-op
  }
  steelHub = null;
}

/** @typedef {{ canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, dpr: number, fixedCssWidth?: number, fixedCssHeight?: number }} SteelSubscriber */

/** @type {Set<SteelSubscriber>} */
const steelSubscribers = new Set();

function steelHubTick() {
  if (steelSubscribers.size === 0 || !steelHub) return;
  const { offscreen, regl, draw } = steelHub;
  regl.poll();
  draw({ viewport: { x: 0, y: 0, width: OFFSCREEN_TEX_PX, height: OFFSCREEN_TEX_PX } });
  for (const sub of steelSubscribers) {
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

let steelTickRegistered = false;

function ensureSteelTick() {
  if (steelTickRegistered) return;
  steelTickRegistered = true;
  materialHubSubscribeTick(steelHubTick);
}

function stopSteelTickIfIdle() {
  if (steelSubscribers.size > 0) return;
  if (steelTickRegistered) {
    materialHubUnsubscribeTick(steelHubTick);
    steelTickRegistered = false;
  }
}

function teardownSteelHubForHmr() {
  if (steelTickRegistered) {
    materialHubUnsubscribeTick(steelHubTick);
    steelTickRegistered = false;
  }
  steelSubscribers.clear();
  destroySteelHub();
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    teardownSteelHubForHmr();
  });
}

/**
 * @param {HTMLCanvasElement} canvas 展示用 2D 画布
 * @param {{ fixedCssWidth?: number, fixedCssHeight?: number }} [options]
 * @returns {() => void} dispose
 */
export function attachSteelRegl(canvas, options = {}) {
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

  /** @type {SteelSubscriber} */
  const sub = {
    canvas,
    ctx,
    dpr,
    fixedCssWidth: useFixedLayout ? fixedW : undefined,
    fixedCssHeight: useFixedLayout ? fixedH : undefined,
  };

  ensureSteelHub();
  steelSubscribers.add(sub);
  ensureSteelTick();
  steelHubTick();

  return function disposeSteelRegl() {
    steelSubscribers.delete(sub);
    stopSteelTickIfIdle();
  };
}

/** 启动时预创建 WebGL / 编译 shader；无订阅者时不参与每帧离屏绘制。 */
export function warmupSteelReglHub() {
  ensureSteelHub();
}
