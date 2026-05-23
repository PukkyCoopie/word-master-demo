import { onMounted, onUnmounted, watch } from "vue";
import { gameSettings } from "../settings/gameSettings.js";

function getViewportSize() {
  const vv = window.visualViewport;
  if (vv && vv.width > 0 && vv.height > 0) {
    return { w: vv.width, h: vv.height };
  }
  return { w: window.innerWidth, h: window.innerHeight };
}

/** 将 #game-view-portal-frame 与 .game-surface 的视口矩形对齐（含 rpx / 界面缩放） */
export function syncPortalFrameToGameSurface() {
  const surface = document.querySelector(".game-surface");
  if (!surface || typeof surface.getBoundingClientRect !== "function") return;

  const r = surface.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return;

  const root = document.documentElement;
  root.style.setProperty("--portal-frame-left", `${r.left}px`);
  root.style.setProperty("--portal-frame-top", `${r.top}px`);
  root.style.setProperty("--portal-frame-width", `${r.width}px`);
  root.style.setProperty("--portal-frame-height", `${r.height}px`);
}

/**
 * 监听 .game-surface 布局变化，保持浮层逻辑框与主画布对齐。
 * 须在 App 根组件挂载（.game-surface 已存在）。
 */
export function usePortalFrameSync() {
  /** @type {ResizeObserver | null} */
  let resizeObserver = null;

  function bindSurface(surface) {
    resizeObserver?.disconnect();
    resizeObserver = null;
    if (!surface) return;

    const update = () => syncPortalFrameToGameSurface();
    resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(surface);
    update();
  }

  function onViewportChange() {
    syncPortalFrameToGameSurface();
  }

  onMounted(() => {
    bindSurface(document.querySelector(".game-surface"));

    window.addEventListener("resize", onViewportChange);
    window.visualViewport?.addEventListener("resize", onViewportChange);
    window.visualViewport?.addEventListener("scroll", onViewportChange);
  });

  onUnmounted(() => {
    resizeObserver?.disconnect();
    resizeObserver = null;
    window.removeEventListener("resize", onViewportChange);
    window.visualViewport?.removeEventListener("resize", onViewportChange);
    window.visualViewport?.removeEventListener("scroll", onViewportChange);
  });

  watch(
    () => gameSettings.uiScalePercent,
    () => {
      requestAnimationFrame(() => syncPortalFrameToGameSurface());
    },
  );

  return { syncPortalFrameToGameSurface, bindSurface };
}

export { getViewportSize };
