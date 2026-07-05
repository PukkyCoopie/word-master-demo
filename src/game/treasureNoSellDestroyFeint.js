import gsap from "gsap";

/** 禁售假自毁/爆炸/摧毁气泡：叠加在原有 kind 样式之上 */
export const NO_SELL_FEINT_BUBBLE_CLASS = "score-popup-bubble--no-sell-feint";

/** @param {HTMLElement | null | undefined} bubble */
export function applyNoSellFeintBubbleStyle(bubble) {
  if (bubble instanceof HTMLElement) {
    bubble.classList.add(NO_SELL_FEINT_BUBBLE_CLASS);
  }
}

/**
 * 禁售槽位：缩至 0 后从 0 弹回（不删槽）。
 * @param {HTMLElement} el
 * @param {number} [sp]
 */
export function restoreTreasureSlotAfterNoSellFeint(el, sp = 1) {
  const s = Math.max(0.01, Number(sp) || 1);
  gsap.killTweensOf(el);
  return new Promise((resolve) => {
    gsap.fromTo(
      el,
      { scale: 0, opacity: 0 },
      {
        scale: 1,
        opacity: 1,
        duration: 0.38 / s,
        ease: "back.out(1.55)",
        transformOrigin: "50% 50%",
        onComplete: () => {
          gsap.set(el, { clearProps: "scale,opacity,transform" });
          resolve();
        },
      },
    );
  });
}
