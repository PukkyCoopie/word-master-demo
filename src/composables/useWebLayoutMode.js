import { computed } from "vue";
import { useViewportLayoutMode } from "./useViewportLayoutMode.js";

/**
 * Web 布局：视口宽高比 ≥ 750/1500 视为「电脑」（左右留白），否则为「手机」。
 */
export function useWebLayoutMode() {
  const { narrowerThanDesign } = useViewportLayoutMode();
  const isDesktopLayout = computed(() => !narrowerThanDesign.value);
  const isMobileLayout = computed(() => narrowerThanDesign.value);
  return { isDesktopLayout, isMobileLayout, narrowerThanDesign };
}
