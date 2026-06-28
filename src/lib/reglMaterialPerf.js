/**
 * 材质 regl 展示层性能相关开关。
 * 离屏 WebGL/shader 纹理（`reglOffscreenTexPx` = 192）固定像素，不按 DPR 放大；
 * 2D 展示 canvas 缓冲可按设备 DPR 放大以保持清晰。
 */
import { ref, watch } from "vue";
import { gameSettings } from "../settings/gameSettings.js";
import { isMaterialBenchEnabled } from "../dev/materialBenchGate.js";
import { getSupportsBitmapRendererPipeline } from "../platform/webViewCapabilities.js";
import { resolveEffectiveMaterialAnimate } from "../settings/materialAnimationAvailability.js";

/** 材质动画设置变更时 bump，供 LetterTile 等重算 effectiveMaterialAnimate */
export const materialAnimationSignal = ref(0);

/** 设备材质能力降级后 bump（如 WebGL 不可用） */
export function notifyMaterialRenderingCapabilityChanged() {
  materialAnimationSignal.value += 1;
}

/** @returns {boolean} 用户是否开启材质逐帧动画 */
export function isMaterialAnimationEnabled() {
  return gameSettings.materialAnimationEnabled !== false;
}

let materialAnimationWatchInitialized = false;

/** 启动时调用一次；监听材质动画设置变化 */
export function initMaterialAnimationSettings() {
  if (materialAnimationWatchInitialized) return;
  materialAnimationWatchInitialized = true;
  watch(
    () => gameSettings.materialAnimationEnabled,
    () => {
      materialAnimationSignal.value += 1;
    },
  );
}

/** @returns {boolean} */
export function isNativeGamePlatform() {
  if (typeof window === "undefined") return false;
  return Boolean(window.Capacitor?.isNativePlatform?.());
}

/** @returns {boolean} */
export function isCoarsePointerDevice() {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
}

/** @returns {boolean} 触控/原生：移动端材质管线（关 MSAA、blit medium、wildcard 免 blur 等） */
export function useMobileMaterialLowPower() {
  try {
    const override = globalThis.__WM_MATERIAL_LOW_POWER__;
    if (override === true || override === "1") return true;
    if (override === false || override === "0") return false;
  } catch {
    // no-op
  }
  const built = import.meta.env.VITE_MATERIAL_LOW_POWER;
  if (built === "1" || built === "true") return true;
  if (built === "0" || built === "false") return false;
  return isNativeGamePlatform() || isCoarsePointerDevice();
}

/** @returns {boolean} 用户关闭材质动画时完全静态 */
export function preferStaticTileMaterialAnimation() {
  return !isMaterialAnimationEnabled();
}

/** @returns {boolean} bench 默认看真实策略；显式 stress 才放开材质 tick 上限。 */
function useMaterialBenchStressMode() {
  if (!isMaterialBenchEnabled()) return false;
  if (import.meta.env.VITE_MATERIAL_BENCH_STRESS === "1") return true;
  try {
    return new URLSearchParams(window.location.search).get("materialBenchStress") === "1";
  } catch {
    return false;
  }
}

/**
 * @param {string} _variant LetterTile variant
 * @param {boolean} propAnimate 组件 prop materialAnimate（父级按可见性传入）
 * @returns {boolean}
 */
export function resolveTileMaterialAnimate(_variant, propAnimate) {
  return resolveEffectiveMaterialAnimate(propAnimate);
}

/** @returns {number} 材质 hub 全局 tick 上限（Hz）；Infinity 表示不节流 */
export function getMaterialHubMaxHz() {
  if (!isMaterialAnimationEnabled()) return 0;
  return Number.POSITIVE_INFINITY;
}

/**
 * 原生 WebView 上 RAF 常被节流到 ~24–30Hz；材质 hub 改用 setInterval 与 RAF 解耦（实验）。
 * bench 构建取消 60Hz 上限时改回 RAF，避免 setInterval(16ms) 二次封顶。
 * @returns {boolean}
 */
export function useNativeMaterialHubIntervalScheduler() {
  if (isMaterialBenchEnabled()) return false;
  return false;
}

/** @returns {"blit" | "direct_webgl" | "video_atlas" | "bitmaprenderer"} */
export function getMaterialRenderPipeline() {
  try {
    const override = globalThis.__WM_MATERIAL_RENDER_PIPELINE__;
    if (
      override === "blit" ||
      override === "direct_webgl" ||
      override === "video_atlas" ||
      override === "bitmaprenderer"
    ) return override;
  } catch {
    // no-op
  }
  const built = import.meta.env.VITE_MATERIAL_RENDER_PIPELINE;
  if (
    built === "blit" ||
    built === "direct_webgl" ||
    built === "video_atlas" ||
    built === "bitmaprenderer"
  ) return built;
  if (useMobileMaterialLowPower()) {
    return getSupportsBitmapRendererPipeline() ? "bitmaprenderer" : "blit";
  }
  return "blit";
}

/** @returns {boolean} */
export function useDirectVisibleWebglMaterial() {
  return getMaterialRenderPipeline() === "direct_webgl";
}

/** @returns {boolean} */
export function useBitmapRendererDisplayResize() {
  try {
    const override = globalThis.__WM_MATERIAL_BITMAP_RESIZE__;
    if (override === true || override === "1") return true;
    if (override === false || override === "0") return false;
  } catch {
    // no-op
  }
  const built = import.meta.env.VITE_MATERIAL_BITMAP_RESIZE;
  return built === "1" || built === "true";
}

/** @returns {number} 离屏纹理边长（全材质统一） */
export function reglOffscreenTexPx() {
  return 192;
}

/**
 * WebGL→2D drawImage 在 Android WebView 上必须 preserveDrawingBuffer，否则离屏 canvas 读回为空。
 * （FBO+readPixels 在目标真机上仍空白，已停用。）
 * @returns {{ alpha: boolean, antialias: boolean, preserveDrawingBuffer: boolean }}
 */
export function reglHubWebglAttributes() {
  return {
    alpha: false,
    antialias: !useMobileMaterialLowPower(),
    preserveDrawingBuffer: true,
  };
}

/** @returns {{ alpha: boolean, desynchronized: boolean }} */
export function reglDisplayCanvas2dAttributes() {
  return {
    alpha: false,
    // 勿在 Android WebView 开 desynchronized：drawImage 写入 CPU 缓冲可读，但合成层常不显示（格面全白）。
    desynchronized: false,
  };
}

/** @returns {number} 展示 canvas 像素比：固定 1，不按设备 DPR 放大缓冲 */
export function reglMaterialDisplayDpr() {
  return 1;
}

/** @returns {"high" | "medium" | "low"} */
export function reglBlitImageSmoothingQuality() {
  return useMobileMaterialLowPower() ? "low" : "high";
}

/** @returns {boolean} 启动时不阻塞主线程同步预热；改在 idle 回调中执行 */
export function deferReglMaterialWarmupAtBoot() {
  return useMobileMaterialLowPower();
}
