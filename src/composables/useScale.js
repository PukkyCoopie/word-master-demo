import { onMounted, onUnmounted } from "vue";

const LOGIC_W = 750;
const LOGIC_H = 1500;

/** 设置 --rpx，使 750×1500 逻辑尺寸以 contain 方式适配视口；所有尺寸用 calc(n * var(--rpx)) */
export function useScale() {
  function updateRpx() {
    const scale = Math.min(
      window.innerWidth / LOGIC_W,
      window.innerHeight / LOGIC_H
    );
    document.documentElement.style.setProperty("--rpx", `${scale}px`);
  }

  onMounted(() => {
    updateRpx();
    window.addEventListener("resize", updateRpx);
  });
  onUnmounted(() => {
    window.removeEventListener("resize", updateRpx);
  });

  return { LOGIC_W, LOGIC_H };
}
