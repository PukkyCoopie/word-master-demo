import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { gameSettings } from "../settings/gameSettings.js";
import {
  isViewportNarrowerThanDesign,
  resolveBorderlessLayout,
} from "../settings/displayLayoutMode.js";
import { getViewportSize } from "./viewportSize.js";

export { isViewportNarrowerThanDesign } from "../settings/displayLayoutMode.js";
export { DESIGN_ASPECT } from "./viewportSize.js";

/** 与 useScale 的 html 类同步，供 Teleport 目标等响应式切换 */
export function useViewportLayoutMode() {
  const narrowerThanDesign = ref(resolveBorderlessLayout());

  function sync() {
    const { w, h } = getViewportSize();
    narrowerThanDesign.value = resolveBorderlessLayout(w, h);
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

  watch(
    () => gameSettings.displayLayoutMode,
    () => sync(),
  );

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
