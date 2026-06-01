import gsap from "gsap";
import { shouldSkipDecorativeMotion } from "../settings/animationSpeed.js";

/**
 * 开局预设/难度卡片切换：横向挤压 → 内容交换 → 弹性回弹（jelly）。
 * `onSwap` 在挤压谷底调用，便于中途换内容。
 *
 * @param {HTMLElement | null | undefined} el
 * @param {1 | -1} direction 1=下一项，-1=上一项
 * @param {() => void} onSwap
 * @returns {gsap.core.Timeline | null}
 */
export function playRunStartContentJellySwap(el, direction, onSwap) {
  if (!el) {
    onSwap?.();
    return null;
  }

  const dir = direction >= 0 ? 1 : -1;

  if (shouldSkipDecorativeMotion()) {
    onSwap?.();
    return null;
  }

  gsap.killTweensOf(el, "scale,scaleX,scaleY,x,rotation");
  gsap.set(el, {
    transformOrigin: "50% 50%",
    scaleX: 1,
    scaleY: 1,
    x: 0,
    rotation: 0,
    force3D: true,
  });

  const tl = gsap.timeline({
    onComplete: () => {
      gsap.set(el, { clearProps: "transform" });
    },
  });

  tl.to(el, {
    scaleX: 0.82,
    scaleY: 1.14,
    x: dir * -12,
    rotation: dir * -1.6,
    duration: 0.045,
    ease: "expo.in",
    onComplete: () => onSwap?.(),
  });

  tl.to(el, {
    scaleX: 1.1,
    scaleY: 0.91,
    x: dir * 6,
    rotation: dir * 0.7,
    duration: 0.08,
    ease: "power3.out",
  });

  tl.to(el, {
    scaleX: 1,
    scaleY: 1,
    x: 0,
    rotation: 0,
    duration: 0.62,
    ease: "elastic.out(1, 0.48)",
  });

  return tl;
}

/** @param {HTMLElement | null | undefined} el */
export function resetRunStartContentJellyTransform(el) {
  if (!el) return;
  gsap.killTweensOf(el, "scale,scaleX,scaleY,x,rotation");
  gsap.set(el, { clearProps: "transform" });
}
