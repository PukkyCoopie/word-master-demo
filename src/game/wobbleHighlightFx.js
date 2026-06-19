import gsap from "gsap";
import { triggerHaptic } from "../platform/haptics.js";
import { shouldSkipDecorativeMotion } from "../settings/animationSpeed.js";

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
  const ringW = 2.5 * rpx;
  const ringPeakW = 3.5 * rpx;
  const ringOffset = 2 * rpx;
  const peakColor = "rgba(255, 248, 220, 0.92)";
  const clearColor = "rgba(255, 248, 220, 0)";

  gsap.killTweensOf(el, "outlineColor,outlineWidth,outlineOffset");
  gsap.set(el, {
    outlineStyle: "solid",
    outlineColor: clearColor,
    outlineWidth: ringW,
    outlineOffset: ringOffset,
  });

  const tl = gsap.timeline({ delay: delayS });
  const riseS = WOBBLE_HIGHLIGHT_DURATION_S * 0.22;
  const fallS = WOBBLE_HIGHLIGHT_DURATION_S * 0.78;
  tl.call(() => triggerHaptic("wobble"), null, riseS * 0.45);
  tl.to(
    el,
    {
      outlineColor: peakColor,
      outlineWidth: ringPeakW,
      duration: riseS,
      ease: "power2.out",
    },
    0,
  );
  tl.to(
    el,
    {
      outlineColor: clearColor,
      outlineWidth: ringW,
      duration: fallS,
      ease: "power2.in",
      onComplete: () => {
        gsap.set(el, { clearProps: "outline,outlineColor,outlineWidth,outlineOffset,outlineStyle" });
      },
    },
    riseS,
  );
  return tl;
}

/**
 * @param {HTMLElement | null | undefined} el
 * @param {number} [speed]
 * @returns {gsap.core.Timeline | null}
 */
export function createWobbleOrHighlightTimeline(el, speed = 1, options = {}) {
  if (!el) return null;
  if (!shouldSkipDecorativeMotion()) return null;
  const tl = createWobbleHighlightTimeline(el, options);
  if (tl) {
    tl.timeScale(Math.max(0.01, Number(speed) || 1));
  }
  return tl;
}

/**
 * 面板 wobble 替代（ShopPanel / 局内 result-area 升级等）。
 * @param {HTMLElement | null | undefined} el
 * @param {number} [delayS]
 * @param {number} [speed]
 * @returns {gsap.core.Timeline | null}
 */
export function playPanelWobbleOrHighlight(el, delayS = 0, speed = 1) {
  if (!el) return null;
  const s = Math.max(0.01, Number(speed) || 1);
  if (!shouldSkipDecorativeMotion()) return null;
  const tl = createWobbleHighlightTimeline(el, { delayS });
  if (tl) tl.timeScale(s);
  return tl;
}
