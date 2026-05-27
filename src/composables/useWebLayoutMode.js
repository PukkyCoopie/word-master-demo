import { computed, onMounted, onUnmounted, ref } from "vue";
import { getViewportSize } from "./useScale.js";

/**
 * 视口宽高比是否大于 1:1（比正方形更宽）。
 * @param {number} [w]
 * @param {number} [h]
 */
export function isViewportWiderThanSquare(w, h) {
  if (w == null || h == null) {
    const { w: vw, h: vh } = getViewportSize();
    return isViewportWiderThanSquare(vw, vh);
  }
  return h > 0 && w / h > 1;
}

/**
 * 仅用于 TapTap 推广图标：视口比 1:1 宽 → 电脑端（视口固定 + 悬停文案）；
 * 比 1:1 窄 → 手机端（主菜单内）。与 `useViewportLayoutMode`（设计比例、浮层）无关。
 */
export function useWebLayoutMode() {
  const widerThanSquare = ref(isViewportWiderThanSquare());

  function sync() {
    const { w, h } = getViewportSize();
    widerThanSquare.value = isViewportWiderThanSquare(w, h);
  }

  onMounted(() => {
    sync();
    window.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("scroll", sync);
  });

  onUnmounted(() => {
    window.removeEventListener("resize", sync);
    window.visualViewport?.removeEventListener("resize", sync);
    window.visualViewport?.removeEventListener("scroll", sync);
  });

  const isDesktopLayout = computed(() => widerThanSquare.value);
  const isMobileLayout = computed(() => !widerThanSquare.value);

  return { isDesktopLayout, isMobileLayout };
}
