import gsap from "gsap";
import { shouldSkipDecorativeMotion } from "../settings/animationSpeed.js";

/** 宝藏入槽：小 → 略过冲 → 落回 1（与法术块 POP 节奏接近） */
const GRANT_POP_OVERSHOOT = 1.12;
const GRANT_POP_IN_S = 0.3;
const GRANT_POP_SETTLE_S = 0.22;

/**
 * @param {HTMLElement | null | undefined} slotEl `.treasure-slot` 根节点
 * @returns {Promise<void>}
 */
export function runTreasureGrantPopAnim(slotEl) {
  return new Promise((resolve) => {
    if (!(slotEl instanceof HTMLElement)) {
      resolve();
      return;
    }
    gsap.killTweensOf(slotEl);
    if (shouldSkipDecorativeMotion()) {
      gsap.set(slotEl, { transformOrigin: "50% 50%", scale: 1, opacity: 1 });
      resolve();
      return;
    }
    gsap.set(slotEl, { transformOrigin: "50% 50%", scale: 0, opacity: 1 });
    const tl = gsap.timeline({ onComplete: resolve });
    tl.to(slotEl, { scale: GRANT_POP_OVERSHOOT, duration: GRANT_POP_IN_S, ease: "back.out(2.35)" });
    tl.to(slotEl, { scale: 1, duration: GRANT_POP_SETTLE_S, ease: "power3.out" });
  });
}
