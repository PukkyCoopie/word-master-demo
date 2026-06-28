import gsap from "gsap";
import { EASE_TRANSFORM } from "../constants.js";

/**
 * 结算后进商店：顶栏钱包数字从 start 滚到 end（仅展示）；入账在 end>start 时于动画开始前即写入 money。
 *
 * @param {Object} deps
 * @param {import('vue').Ref<number>} deps.money
 * @param {import('vue').Ref<number | null>} deps.walletHeaderDisplayOverride
 * @param {() => HTMLElement | null} deps.getDefaultWalletEl
 */
export function createShopWalletGainAnim(deps) {
  const { money, walletHeaderDisplayOverride, getDefaultWalletEl } = deps;
  /** @type {import('gsap').Timeline | null} */
  let walletGainTl = null;

  /**
   * @param {number} start
   * @param {number} end
   * @param {HTMLElement | null} [elOverride]
   */
  function playWalletHeaderGainAnim(start, end, elOverride = null) {
    return new Promise((resolve) => {
      if (walletGainTl) {
        walletGainTl.kill();
        walletGainTl = null;
      }
      const el = elOverride ?? getDefaultWalletEl?.() ?? null;
      if (end <= start) {
        money.value = end;
        walletHeaderDisplayOverride.value = null;
        if (el) gsap.set(el, { scale: 1 });
        resolve(undefined);
        return;
      }

      money.value = end;
      walletHeaderDisplayOverride.value = start;
      const o = { v: start };

      walletGainTl = gsap.timeline({
        onComplete: () => {
          walletGainTl = null;
          walletHeaderDisplayOverride.value = null;
          if (el) gsap.set(el, { scale: 1 });
          resolve(undefined);
        },
      });

      walletGainTl.to(
        o,
        {
          v: end,
          duration: 0.78,
          ease: EASE_TRANSFORM,
          onUpdate: () => {
            walletHeaderDisplayOverride.value = Math.round(o.v);
          },
        },
        0,
      );

      if (el) {
        gsap.killTweensOf(el, "scale");
        gsap.set(el, { transformOrigin: "50% 50%", scale: 1 });
        walletGainTl.fromTo(
          el,
          { scale: 1 },
          { scale: 1.18, duration: 0.22, ease: EASE_TRANSFORM },
          0,
        );
        walletGainTl.to(el, { scale: 1, duration: 0.6, ease: EASE_TRANSFORM }, 0.1);
      }
    });
  }

  function disposeShopWalletGainAnim() {
    if (walletGainTl) {
      walletGainTl.kill();
      walletGainTl = null;
    }
  }

  return { playWalletHeaderGainAnim, disposeShopWalletGainAnim };
}
