import gsap from "gsap";
import { triggerHaptic } from "../platform/haptics.js";

/** 与词槽 wobble 总时长接近，供减少动画下的高亮替代 */
export const WOBBLE_HIGHLIGHT_DURATION_S = 0.42;

function readRpx() {
  if (typeof document === "undefined") return 1;
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--rpx").trim()) || 1;
}

/**
 * 减少动画：词槽/面板 wobble 替代——外圈高亮闪一下（GSAP timeline，兼容 timeScale）。
 * @param {HTMLElement | null | undefined} el
 * @param {{ delayS?: number }} [options]
 * @returns {gsap.core.Timeline | null}
 */
export function createWobbleHighlightTimeline(el, options = {}) {
  if (!el) return null;
  const delayS = Number.isFinite(options.delayS) ? options.delayS : 0;
  const rpx = readRpx();
  const ringPeak = `0 0 0 ${2.5 * rpx}px rgba(255, 248, 220, 0.75), inset 0 0 ${14 * rpx}px rgba(255, 255, 255, 0.18)`;
  const computed = getComputedStyle(el).boxShadow;
  const base = computed && computed !== "none" ? computed : "";
  const shadowPeak = base ? `${base}, ${ringPeak}` : ringPeak;
  const shadowClear = base || "none";

  gsap.killTweensOf(el, "boxShadow");
  gsap.set(el, { boxShadow: shadowClear });

  const riseS = WOBBLE_HIGHLIGHT_DURATION_S * 0.22;
  const fallS = WOBBLE_HIGHLIGHT_DURATION_S * 0.78;
  const tl = gsap.timeline({ delay: delayS });
  tl.call(() => triggerHaptic("wobble"), null, riseS * 0.45);
  tl.to(el, { boxShadow: shadowPeak, duration: riseS, ease: "power2.out" }, 0);
  tl.to(el, {
    boxShadow: shadowClear,
    duration: fallS,
    ease: "power2.in",
    onComplete: () => {
      if (base) gsap.set(el, { boxShadow: base });
      else gsap.set(el, { clearProps: "boxShadow" });
    },
  }, riseS);
  return tl;
}
