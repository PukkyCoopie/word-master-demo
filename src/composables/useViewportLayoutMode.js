import { computed, onMounted, onUnmounted, ref } from "vue";
import { DESIGN_ASPECT, getViewportSize } from "./useScale.js";

/**
 * 视口比 750×1500 更窄（偏高、contain 上下留白）→ 浮层蒙层铺满视口；
 * 更宽（左右留白）→ 浮层限制在逻辑框内裁剪。
 * @param {number} [w]
 * @param {number} [h]
 */
export function isViewportNarrowerThanDesign(w, h) {
  if (w == null || h == null) {
    const { w: vw, h: vh } = getViewportSize();
    return isViewportNarrowerThanDesign(vw, vh);
  }
  return h > 0 && w / h < DESIGN_ASPECT;
}

/** 与 useScale 的 html 类同步，供 Teleport 目标等响应式切换 */
export function useViewportLayoutMode() {
  const narrowerThanDesign = ref(isViewportNarrowerThanDesign());

  function sync() {
    const { w, h } = getViewportSize();
    narrowerThanDesign.value = isViewportNarrowerThanDesign(w, h);
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

  const portalFrameTarget = "#game-view-portal-frame";
  const portalViewportTarget = "#game-view-portal";

  /** 须铺满整页视口的节点（虹膜、彩纸） */
  const portalFullscreenTarget = computed(() =>
    narrowerThanDesign.value ? portalViewportTarget : portalFrameTarget,
  );

  return {
    narrowerThanDesign,
    portalFrameTarget,
    portalViewportTarget,
    portalFullscreenTarget,
    sync,
  };
}

export { DESIGN_ASPECT };
