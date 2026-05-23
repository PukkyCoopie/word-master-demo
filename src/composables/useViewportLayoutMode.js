import { computed, onMounted, onUnmounted, ref } from "vue";

export const DESIGN_ASPECT = 750 / 1500;

/**
 * 视口比 750×1500 更窄（偏高、上下留白）→ 浮层蒙层铺满视口；
 * 更宽（左右留白）→ 浮层限制在逻辑框内裁剪。
 * @param {number} [w]
 * @param {number} [h]
 */
export function isViewportNarrowerThanDesign(w, h) {
  if (w == null || h == null) {
    return document.documentElement.classList.contains("viewport-narrower-than-design");
  }
  return h > 0 && w / h < DESIGN_ASPECT;
}

/** 与 useScale 的 html 类同步，供 Teleport 目标等响应式切换 */
export function useViewportLayoutMode() {
  const narrowerThanDesign = ref(isViewportNarrowerThanDesign());

  function sync() {
    narrowerThanDesign.value = isViewportNarrowerThanDesign();
  }

  onMounted(() => {
    sync();
    window.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("resize", sync);
  });

  onUnmounted(() => {
    window.removeEventListener("resize", sync);
    window.visualViewport?.removeEventListener("resize", sync);
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
