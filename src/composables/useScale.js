import { onMounted, onUnmounted, watch } from "vue";
import { gameSettings } from "../settings/gameSettings.js";

const LOGIC_W = 750;
const LOGIC_H = 1500;

/** 设置 --rpx，使 750×1500 逻辑尺寸以 contain 方式适配视口；所有尺寸用 calc(n * var(--rpx)) */
export function useScale() {
  function updateRpx() {
    const base = Math.min(
      window.innerWidth / LOGIC_W,
      window.innerHeight / LOGIC_H,
    );
    const pct = gameSettings.uiScalePercent / 100;
    document.documentElement.style.setProperty("--rpx", `${base * pct}px`);
  }

  onMounted(() => {
    updateRpx();
    window.addEventListener("resize", updateRpx);
  });

  onUnmounted(() => {
    window.removeEventListener("resize", updateRpx);
  });

  watch(
    () => gameSettings.uiScalePercent,
    () => updateRpx(),
  );

  return { LOGIC_W, LOGIC_H, updateRpx };
}
