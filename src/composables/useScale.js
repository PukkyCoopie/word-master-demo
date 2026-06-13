import { onMounted, onUnmounted, watch } from "vue";
import { gameSettings } from "../settings/gameSettings.js";
import { applyBorderlessLayoutHtmlClass } from "../settings/displayLayoutMode.js";
import { syncPortalFrameToGameSurface } from "./usePortalFrameSync.js";
import { getViewportSize, LOGIC_H, LOGIC_W } from "./viewportSize.js";

export { DESIGN_ASPECT, getViewportSize, LOGIC_H, LOGIC_W } from "./viewportSize.js";

/** 视口比 750×1500 更窄（偏高）时：留白与容器同色、去掉圆角与阴影 */
function updateViewportAspectLayoutClass(w, h) {
  applyBorderlessLayoutHtmlClass(w, h);
}

/** 原生 WebView 偶发注入 safe-area 变量，清零以免顶栏留白 */
function isNativeApp() {
  return typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.() === true;
}

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

/** 逻辑画布像素尺寸超出视口时，用绝对定位 + translate 保证上下/左右对称超出 */
function updateUiScaleOverflowLayout(w, h, rpx) {
  const logicW = LOGIC_W * rpx;
  const logicH = LOGIC_H * rpx;
  const overflows = logicW > w + 0.5 || logicH > h + 0.5;
  document.documentElement.classList.toggle("ui-scale-overflows-viewport", overflows);
}

/** 设置 --rpx：contain 适配（宽/高取较小缩放，窄屏宽顶满、上下留白） */
export function useScale() {
  function updateRpx() {
    const { w, h } = getViewportSize();
    const fitW = w / LOGIC_W;
    const fitH = h / LOGIC_H;
    const base = Math.min(fitW, fitH);
    const pct = gameSettings.uiScalePercent / 100;
    const rpx = base * pct;
    document.documentElement.style.setProperty("--rpx", `${rpx}px`);
    updateUiScaleOverflowLayout(w, h, rpx);
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
  watch(
    () => gameSettings.displayLayoutMode,
    () => updateRpx(),
  );

  return { LOGIC_W, LOGIC_H, updateRpx };
}
