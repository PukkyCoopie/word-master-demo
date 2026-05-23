import { onMounted, onUnmounted, watch } from "vue";
import { gameSettings } from "../settings/gameSettings.js";
import { syncPortalFrameToGameSurface } from "./usePortalFrameSync.js";

const LOGIC_W = 750;
const LOGIC_H = 1500;
/** 设计画布宽高比（750×1500）；视口更「窄」时 w/h 小于该值（与 useViewportLayoutMode 一致） */
export const DESIGN_ASPECT = LOGIC_W / LOGIC_H;

function isNativeApp() {
  return typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.() === true;
}

export function getViewportSize() {
  const vv = window.visualViewport;
  if (vv && vv.width > 0 && vv.height > 0) {
    return {
      w: Math.round(vv.width),
      h: Math.round(vv.height),
    };
  }
  return {
    w: window.innerWidth,
    h: window.innerHeight,
  };
}

/** 视口比 750×1500 更窄（偏高）时：留白与容器同色、去掉圆角与阴影 */
function updateViewportAspectLayoutClass(w, h) {
  const narrowerThanDesign = h > 0 && w / h < DESIGN_ASPECT;
  document.documentElement.classList.toggle(
    "viewport-narrower-than-design",
    narrowerThanDesign,
  );
}

/** 原生 WebView 偶发注入 safe-area 变量，清零以免顶栏留白 */
function resetNativeSafeAreaInsets() {
  if (!isNativeApp()) {
    return;
  }
  const root = document.documentElement;
  root.style.setProperty("--safe-area-inset-top", "0px");
  root.style.setProperty("--safe-area-inset-right", "0px");
  root.style.setProperty("--safe-area-inset-bottom", "0px");
  root.style.setProperty("--safe-area-inset-left", "0px");
}

/** 设置 --rpx：contain 适配（宽/高取较小缩放，窄屏宽顶满、上下留白） */
export function useScale() {
  function updateRpx() {
    const { w, h } = getViewportSize();
    const fitW = w / LOGIC_W;
    const fitH = h / LOGIC_H;
    const base = Math.min(fitW, fitH);
    const pct = gameSettings.uiScalePercent / 100;
    document.documentElement.style.setProperty("--rpx", `${base * pct}px`);
    updateViewportAspectLayoutClass(w, h);
    resetNativeSafeAreaInsets();
    requestAnimationFrame(() => syncPortalFrameToGameSurface());
  }

  onMounted(() => {
    updateRpx();
    window.addEventListener("resize", updateRpx);
    window.visualViewport?.addEventListener("resize", updateRpx);
    window.visualViewport?.addEventListener("scroll", updateRpx);
  });

  onUnmounted(() => {
    window.removeEventListener("resize", updateRpx);
    window.visualViewport?.removeEventListener("resize", updateRpx);
    window.visualViewport?.removeEventListener("scroll", updateRpx);
  });
  watch(
    () => gameSettings.uiScalePercent,
    () => updateRpx(),
  );

  return { LOGIC_W, LOGIC_H, updateRpx };
}
