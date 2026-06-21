/**
 * 冰裂材质底纹：采用实验页已确认的 Frozen Lake 方案。
 * 全局单 WebGL + 单 regl，离屏渲染后贴到各 tile 的 2D canvas。
 */
import createREGL from "regl";
import { materialHubSubscribeTick, materialHubUnsubscribeTick } from "./reglMaterialTicker.js";
import { forceLoseWebglContext } from "./reglDebugLog.js";

const ICE_VERT = `
precision highp float;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = 0.5 * (position + 1.0);
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const ICE_FRAG = `
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
varying vec2 vUv;

#define HASHSCALE3 vec3(.1031, .1030, .0973)
const float PI = 3.141592;

float saturate(float x) { return clamp(x,0.0,1.0); }
float mul(vec2 x) { return x.x*x.y; }
mat3 fromEuler(vec3 ang) {
 vec2 a1 = vec2(sin(ang.x),cos(ang.x));
 vec2 a2 = vec2(sin(ang.y),cos(ang.y));
 vec2 a3 = vec2(sin(ang.z),cos(ang.z));
 mat3 m;
 m[0] = vec3(a1.y*a3.y+a1.x*a2.x*a3.x,a1.y*a2.x*a3.x+a3.y*a1.x,-a2.y*a3.x);
 m[1] = vec3(-a2.y*a1.x,a1.y*a2.y,a2.x);
 m[2] = vec3(a3.y*a1.x*a2.x+a1.y*a3.x,a1.x*a3.x-a1.y*a3.y*a2.x,a2.y*a3.y);
 return m;
}

bool intersectionPlane(vec3 o, vec3 d, out vec3 p) {
 float t = o.y / d.y;
 p = o - d * t;
 return bool(step(t,0.0));
}

float hash11(float x) {
 return fract(sin(x) * 43758.5453);
}
float hash12(vec2 p) {
 float h = dot(p,vec2(127.1,311.7));
 return fract(sin(h)*43758.5453123);
}

float hash21(vec2 p) {
 vec3 p3 = fract(vec3(p.xyx) * HASHSCALE3);
 p3 += dot(p3, p3.yzx+19.19);
 return fract((p3.x+p3.y)*p3.z);
}
vec2 hash22(vec2 p) {
 vec3 p3 = fract(vec3(p.xyx) * HASHSCALE3);
 p3 += dot(p3, p3.yzx+19.19);
 return fract((p3.xx+p3.yz)*p3.zy);
}
float hash13(vec3 p) {
 p = fract(p*0.3183099+.1);
 p *= 17.0;
 return fract(p.x*p.y*p.z*(p.x+p.y+p.z));
}
float noise11(float p) {
 float i = floor(p);
 float f = fract(p);
 float u = f*f*(3.0-2.0*f);
 return -1.0+2.0*mix(hash11(i),hash11(i+1.0),u);
}
float noise12(vec2 p) {
 vec2 i = floor(p);
 vec2 f = fract(p);
 vec2 u = f*f*(3.0-2.0*f);
 return -1.0+2.0*mix(
   mix(hash12(i + vec2(0.0,0.0)), hash12(i + vec2(1.0,0.0)), u.x),
   mix(hash12(i + vec2(0.0,1.0)), hash12(i + vec2(1.0,1.0)), u.x),
   u.y
 );
}
vec2 noise2(vec2 p) {
 vec2 i = floor(p);
 vec2 f = fract(p);
 vec2 u = f*f*(3.0-2.0*f);
 return -1.0+2.0*mix(
   mix(hash22(i + vec2(0.0,0.0)), hash22(i + vec2(1.0,0.0)), u.x),
   mix(hash22(i + vec2(0.0,1.0)), hash22(i + vec2(1.0,1.0)), u.x),
   u.y
 );
}
float noise13(vec3 p) {
 vec3 i = floor(p);
 vec3 f = fract(p);
 vec3 u = f*f*(3.0-2.0*f);

 float a = hash13(i + vec3(0.0,0.0,0.0));
 float b = hash13(i + vec3(1.0,0.0,0.0));
 float c = hash13(i + vec3(0.0,1.0,0.0));
 float d = hash13(i + vec3(1.0,1.0,0.0));
 float v1 = mix(mix(a,b,u.x), mix(c,d,u.x), u.y);

 a = hash13(i + vec3(0.0,0.0,1.0));
 b = hash13(i + vec3(1.0,0.0,1.0));
 c = hash13(i + vec3(0.0,1.0,1.0));
 d = hash13(i + vec3(1.0,1.0,1.0));
 float v2 = mix(mix(a,b,u.x), mix(c,d,u.x), u.y);

 return abs(mix(v1,v2,u.z));
}

float fbm1(float p) {
 float m = 2.0;
 float a = 1.0;
 float w = 1.0;
 float f = noise11(p);
 for(int i = 0; i < 8; i++) {
   p *= m; a /= 1.8;
   f += a*noise11(p);
   w += a;
 }
 return f / w;
}

float fbm2(vec2 p, float t) {
 float m = 2.0;
 float a = 1.0;
 float w = 1.0;
 float f = noise12(p);
 for(int i = 0; i < 8; i++) {
   p *= m; a /= 1.5;
   f += a*noise12(p+t);
   w += a;
 }
 return f / w;
}

float fbmClouds(vec2 p) {
 p *= 0.001;
 float m = 2.0;
 float a = 1.0;
 float w = 1.0;
 float f = noise12(p);
 for(int i = 0; i < 4; i++) {
   p *= m; a /= 1.5;
   f += a*abs(noise12(p));
   w += a;
 }
 f /= w;
 f = max((f - 0.4) / (1.0 - 0.4), 1e-4);
 f = sqrt(f);
 return f;
}

vec3 voronoi(in vec2 x) {
 vec2 n = floor(x);
 vec2 f = fract(x);

 vec2 mg, mr;
 float md = 8.0;
 for(int j=-1; j<=1; j++) {
   for(int i=-1; i<=1; i++) {
     vec2 g = vec2(float(i),float(j));
     vec2 o = hash22(n + g);
     vec2 r = g + o - f;
     float d = dot(r,r);
     if(d < md) {
       md = d;
       mr = r;
       mg = g;
     }
   }
 }

 md = 8.0;
 for(int j=-2; j<=2; j++) {
   for(int i=-2; i<=2; i++) {
     vec2 g = mg + vec2(float(i),float(j));
     vec2 o = hash22(n + g);
     vec2 r = g + o - f;
     if(dot(mr-r,mr-r) > 0.00001) {
       md = min(md, dot(0.5*(mr+r), normalize(r-mr)));
     }
   }
 }

 return vec3(md, mr);
}

float triangle(float x) {
 return abs(1.0 - mod(abs(x), 2.0)) * 2.0 - 1.0;
}

const float GAMMA = 2.2;
float toLinear(float c) { return pow(c,GAMMA); }
vec3 toLinear(vec3 c) { return pow(c,vec3(GAMMA)); }

const float THRESHOLD = 0.001;
const float EPSILON = 5e-3;
const float HEIGHT_POWER = 5.0;
const float CRACKS_SCALE = 0.6;
const float CRACKS_THICKNESS = 0.9;
const float CRACKS_ALPHA = 0.8;
const float REFRACTION = 0.8;
const float BUBBLES_BRIGHTNESS = 0.4;
const vec3 SNOW_COLOR = vec3(0.85,0.98,1.0);
const vec3 DEEP_COLOR = vec3(0.0,0.16,0.30);
const vec3 CRACKS_COLOR = vec3(0.3,0.95,1.0) * 1.2;
const vec3 CRACKS_COLOR_TOP = vec3(1.6);

float mapCracks1(vec3 p) {
 const float SCALE = 0.1;
 p.x += sin(p.z*0.2) * 2.0;
 p.x += triangle(p.z * 0.053) * 2.0;
 p.z += triangle(p.x * 0.103) * 2.0;
 return voronoi(p.xz*SCALE).x / SCALE * 0.9;
}

float mapCracks2(vec3 p) {
 const float SCALE = 0.25;
 p.x += triangle(p.z * 0.153) * 1.5;
 p.z += triangle(p.x * 0.203) * 1.5;
 return voronoi(p.xz*SCALE).x / SCALE * 0.9;
}

vec2 traceCracks1(vec3 ori, vec3 dir, out vec3 p) {
 float t = 0.0;
 float d = 0.0;
 for(int i = 0; i < 10; i++) {
   p = ori + dir * t;
   d = mapCracks1(p);
   if(d < THRESHOLD) break;
   t += d * 0.9;
 }
 return vec2(d,t);
}
vec2 traceCracks2(vec3 ori, vec3 dir, float s, out vec3 p) {
 float t = 0.0;
 float d = 0.0;
 for(int i = 0; i < 8; i++) {
   p = ori + dir * t;
   d = mapCracks2(p*s);
   if(d < THRESHOLD) break;
   t += d * 0.9;
 }
 return vec2(d,t);
}
vec2 traceCracks3(vec3 ori, vec3 dir, out vec3 p) {
 float t = 0.0;
 float d = 0.0;
 for(int i = 0; i < 3; i++) {
   p = ori + dir * t;
   d = mapCracks1(p*0.7);
   if(d < THRESHOLD) break;
   t += d;
 }
 return vec2(d,t);
}
vec2 getNormalCracks1(vec3 p) {
 float t = mapCracks1(p);
 vec2 n;
 n.x = mapCracks1(vec3(p.x+EPSILON,p.y,p.z)) - t;
 n.y = mapCracks1(vec3(p.x,p.y,p.z+EPSILON)) - t;
 return normalize(n);
}
vec2 getNormalCracks2(vec3 p) {
 float t = mapCracks2(p);
 vec2 n;
 n.x = mapCracks2(vec3(p.x+EPSILON,p.y,p.z)) - t;
 n.y = mapCracks2(vec3(p.x,p.y,p.z+EPSILON)) - t;
 return normalize(n);
}

vec3 getSkyColor(vec3 e, bool isReflection) {
 e.y = max(e.y,0.0);
 float yy = pow(e.y, 0.9);
 vec3 ret;
 ret.x = pow(1.0-yy-0.05,8.0) * 0.75;
 ret.y = pow(1.0-yy, 4.0) * 0.75;
 ret.z = pow(1.0-yy,2.0);
 ret = mix(vec3(0.03, 0.05, 0.10), vec3(0.10, 0.18, 0.30), ret.z * 0.48);
 return ret;
}

float getSnowMask(vec2 p) {
 mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
 float a = 1.0;
 float w = 1.0;
 float f = noise12(p);
 for(int i = 0; i < 6; i++) {
   p = m * p; a /= 1.5;
   f += a * abs(noise12(p));
   w += a;
 }
 f /= w;
 f = smoothstep(0.55,0.65,f);
 f = pow(f,0.25);
 f = f * 0.9;
 return f;
}

vec3 getObjectColor(vec3 p, vec3 cam, vec3 e) {
 vec3 dir = e;
 const vec3 n = vec3(0.0,1.0,0.0);
 float depth = length(p - cam);
 float depth_f = max(depth*0.8, 1.0);
 p *= CRACKS_SCALE;

 float gth = 0.6 + 0.8 * smoothstep(0.2,0.8, noise13(p*0.05));
 gth *= CRACKS_THICKNESS;

 vec3 cp;
 vec3 norm = vec3(1.0,noise2(p.xz*3.0)*0.2);
 norm.yz += noise2(p.xz*10.0)*0.2;
 norm.x *= depth_f;
 norm = normalize(norm.yxz);
 e.xz += norm.xz * REFRACTION;

 traceCracks1(p,e,cp);
 vec2 cr1_normal = getNormalCracks1(cp);
 float crack_depth = abs(cp.y - p.y);
 crack_depth = pow(max(1.0-crack_depth*0.2/gth, 0.0),HEIGHT_POWER) * 0.6;
 crack_depth *= 0.5 + 0.5 * noise13(cp*vec3(0.7,10.0,0.7));
 crack_depth *= abs(cr1_normal.x) * 0.6 + 0.4;

 traceCracks2(p,e,1.0,cp);
 vec2 cr2_normal = getNormalCracks2(cp);
 float crack_depth_2 = abs(cp.y - p.y);
 crack_depth_2 = pow(max(1.0 - crack_depth_2 * 0.4/gth, 0.0), HEIGHT_POWER) * 0.6;
 crack_depth_2 *= 0.5 + 0.5 * smoothstep(0.2,0.9, noise13(cp*vec3(12.0,1.0,12.0)));
 crack_depth_2 *= 0.5 + 0.5 * noise13(cp*vec3(1.0,20.0,1.0));
 crack_depth_2 *= abs(cr2_normal.x) * 0.6 + 0.4;

 traceCracks2(p,e,1.5,cp);
 float crack_depth_3 = abs(cp.y - p.y);
 crack_depth_3 = pow(max(1.0 - crack_depth_3 * 3.0/gth, 0.0), HEIGHT_POWER) * 0.3;
 crack_depth_3 *= 0.5 + 0.5 * smoothstep(0.3,0.9, noise13(cp*vec3(17.0,1.0,17.0)));

 vec2 c4n = noise2(p.xz*30.0) * 0.4;
 traceCracks3(p,e+c4n.xxy,cp);
 float crack_depth_4 = abs(cp.y - p.y + 2.0);
 crack_depth_4 = pow(max(1.0-crack_depth_4*0.2/gth, 0.0),3.0) * 0.15;
 crack_depth_4 *= 0.5 + 0.5 * noise13(cp*vec3(0.7,10.0,0.7));

 vec3 col = toLinear(DEEP_COLOR);

 dir.xz += norm.xz * REFRACTION * 0.3;
 vec3 bp;
 intersectionPlane(cam+vec3(0.0,0.5,0.0),dir,bp);
 col += pow(noise13(bp * 14.0),20.0) * BUBBLES_BRIGHTNESS * gth;
 intersectionPlane(cam+vec3(0.0,1.0,0.0),dir,bp);
 col += pow(noise13(bp * 15.0),20.0) * BUBBLES_BRIGHTNESS * gth;
 intersectionPlane(cam+vec3(0.0,2.0,0.0),dir,bp);
 col += pow(noise13(bp * 16.0),20.0) * BUBBLES_BRIGHTNESS * gth;

 vec3 crc = toLinear(CRACKS_COLOR);
 vec3 crct = toLinear(CRACKS_COLOR_TOP);
 float a = 0.4 + 0.6 * smoothstep(0.2,0.8, noise13(p*0.07));
 a *= CRACKS_ALPHA;
 col = mix(col, mix(crc,crct,crack_depth_4), crack_depth_4 * a);
 col = mix(col, mix(crc,crct,crack_depth_3), crack_depth_3 * a);
 col = mix(col, mix(crc,crct,crack_depth_2), crack_depth_2 * a);
 col = mix(col, mix(crc,crct,crack_depth), crack_depth * a);

 float fresnel = pow(max(1.0 - dot(-e,n),0.0),5.0) * 0.9 + 0.1;
 vec3 rdir = reflect(e,norm);
 vec3 reflection = getSkyColor(rdir,true);
 col = mix(col,reflection,fresnel);

 return col;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
 vec2 iuv = fragCoord.xy / iResolution.xy * 2.0 - 1.0;
 vec2 uv = iuv;
 uv.x *= iResolution.x / iResolution.y;

 float xst = iTime * 0.15;
 vec3 ori = vec3(sin(xst) * 10.0, 5.0, -iTime * 2.5);
 vec3 dir = normalize(vec3(uv.x * 0.78, -0.55 + uv.y * 0.44, -1.5));

 vec3 p;
 vec3 color = getSkyColor(dir,false);
 if(intersectionPlane(ori,dir,p)) {
   color = getObjectColor(p,ori,dir);
 }

 color = pow(color,vec3(0.4545));
 // 轻微提亮并向蓝色偏移，避免整体偏暗偏绿。
 color *= vec3(0.98, 1.03, 1.14);
 color += vec3(0.012, 0.018, 0.034);
 float vgn = smoothstep(1.2,0.5,abs(iuv.y)) * smoothstep(1.2,0.5,abs(iuv.x));
 color *= vgn * 0.3 + 0.7;
 color = clamp(color, 0.0, 1.0);
 fragColor = vec4(color,1.0);
}

void main() {
 vec2 fragCoord = vec2(vUv.x * iResolution.x, vUv.y * iResolution.y);
 vec4 c = vec4(0.0);
 mainImage(c, fragCoord);
 gl_FragColor = c;
}
`;

const ICE_SHADER_TIME0 = performance.now();
const OFFSCREEN_TEX_PX = 256;

/** @type {{ offscreen: HTMLCanvasElement, regl: object, draw: object } | null} */
let iceHub = null;

function ensureIceHub() {
  if (iceHub) return iceHub;
  const offscreen = document.createElement("canvas");
  offscreen.width = OFFSCREEN_TEX_PX;
  offscreen.height = OFFSCREEN_TEX_PX;
  const regl = createREGL({
    canvas: offscreen,
    attributes: { alpha: false, antialias: true, preserveDrawingBuffer: true },
  });
  const draw = regl({
    vert: ICE_VERT,
    frag: ICE_FRAG,
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
      iTime: () => (performance.now() - ICE_SHADER_TIME0) * 0.001,
    },
  });
  iceHub = { offscreen, regl, draw };
  return iceHub;
}

function destroyIceHub() {
  if (!iceHub) return;
  forceLoseWebglContext(iceHub.regl, iceHub.offscreen);
  try {
    iceHub.regl.destroy();
  } catch {
    // no-op
  }
  iceHub = null;
}

/** @typedef {{ canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, dpr: number, fixedCssWidth?: number, fixedCssHeight?: number }} IceSubscriber */

/** @type {Set<IceSubscriber>} */
const iceSubscribers = new Set();

function iceHubTick() {
  if (iceSubscribers.size === 0 || !iceHub) return;
  const { offscreen, regl, draw } = iceHub;
  regl.poll();
  draw({ viewport: { x: 0, y: 0, width: OFFSCREEN_TEX_PX, height: OFFSCREEN_TEX_PX } });
  for (const sub of iceSubscribers) {
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

let iceTickRegistered = false;

function ensureIceTick() {
  if (iceTickRegistered) return;
  iceTickRegistered = true;
  materialHubSubscribeTick(iceHubTick);
}

function stopIceTickIfIdle() {
  if (iceSubscribers.size > 0) return;
  if (iceTickRegistered) {
    materialHubUnsubscribeTick(iceHubTick);
    iceTickRegistered = false;
  }
}

function teardownIceHubForHmr() {
  if (iceTickRegistered) {
    materialHubUnsubscribeTick(iceHubTick);
    iceTickRegistered = false;
  }
  iceSubscribers.clear();
  destroyIceHub();
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    teardownIceHubForHmr();
  });
}

/**
 * @param {HTMLCanvasElement} canvas 展示用 2D 画布
 * @param {{ fixedCssWidth?: number, fixedCssHeight?: number }} [options]
 * @returns {() => void} dispose
 */
export function attachIceRegl(canvas, options = {}) {
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

  /** @type {IceSubscriber} */
  const sub = {
    canvas,
    ctx,
    dpr,
    fixedCssWidth: useFixedLayout ? fixedW : undefined,
    fixedCssHeight: useFixedLayout ? fixedH : undefined,
  };

  ensureIceHub();
  iceSubscribers.add(sub);
  ensureIceTick();
  iceHubTick();

  return function disposeIceRegl() {
    iceSubscribers.delete(sub);
    stopIceTickIfIdle();
  };
}

/** 启动时预创建 WebGL / 编译 shader；无订阅者时不参与每帧离屏绘制。 */
export function warmupIceReglHub() {
  ensureIceHub();
}
