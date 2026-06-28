import gsap from "gsap";

/**
 * 开局预设/难度卡片切换：横向挤压 → 内容交换 → 弹性回弹（jelly）。
 * `onSwap` 在挤压谷底调用，便于中途换内容。
 *
 * @param {HTMLElement | null | undefined} el
 * @param {1 | -1} _direction 1=下一项，-1=上一项（保留参数位，当前不参与位移）
 * @param {() => void} onSwap
 * @returns {gsap.core.Timeline | null}
 */
export function playRunStartContentJellySwap(el, _direction, onSwap) {
  if (!el) {
    onSwap?.();
    return null;
  }

  gsap.killTweensOf(el, "scale,scaleX,scaleY");
  gsap.set(el, {
    transformOrigin: "50% 50%",
    scaleX: 1,
    scaleY: 1,
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
    duration: 0.045,
    ease: "expo.in",
    onComplete: () => onSwap?.(),
  });

  tl.to(el, {
    scaleX: 1.1,
    scaleY: 0.91,
    duration: 0.08,
    ease: "power3.out",
  });

  tl.to(el, {
    scaleX: 1,
    scaleY: 1,
    duration: 0.62,
    ease: "elastic.out(1, 0.48)",
  });

  return tl;
}

/** @param {HTMLElement | null | undefined} el */
export function resetRunStartContentJellyTransform(el) {
  if (!el) return;
  gsap.killTweensOf(el, "scale,scaleX,scaleY");
  gsap.set(el, { clearProps: "transform" });
}
