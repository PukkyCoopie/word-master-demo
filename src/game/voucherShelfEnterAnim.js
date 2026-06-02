import gsap from "gsap";
import { shouldSkipDecorativeMotion } from "../settings/animationSpeed.js";

/** 优惠券货架格：0 → 略过冲 → 1 */
const OVERSHOOT = 1.12;
const IN_S = 0.3;
const SETTLE_S = 0.22;

/**
 * @param {HTMLElement | null | undefined} visualEl `.shop-treasure-visual` 或等价节点
 * @returns {Promise<void>}
 */
export function runVoucherShelfEnterPopAnim(visualEl) {
  return new Promise((resolve) => {
    if (!(visualEl instanceof HTMLElement)) {
      resolve();
      return;
    }
    gsap.killTweensOf(visualEl);
    if (shouldSkipDecorativeMotion()) {
      gsap.set(visualEl, { transformOrigin: "50% 50%", scale: 1, opacity: 1 });
      resolve();
      return;
    }
    gsap.set(visualEl, { transformOrigin: "50% 50%", scale: 0, opacity: 1 });
    const tl = gsap.timeline({ onComplete: resolve });
    tl.to(visualEl, { scale: OVERSHOOT, duration: IN_S, ease: "back.out(2.35)" });
    tl.to(visualEl, { scale: 1, duration: SETTLE_S, ease: "power3.out" });
  });
}
