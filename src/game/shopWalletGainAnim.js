import gsap from "gsap";
import { watch } from "vue";
import { EASE_TRANSFORM } from "../constants.js";

/**
 * 商店顶栏钱包：数字从 start 滚到 end（仅展示）；实际余额在动画开始前即写入 money。
 *
 * @param {Object} deps
 * @param {import('vue').Ref<number>} deps.money
 * @param {import('vue').Ref<number | null>} deps.walletHeaderDisplayOverride
 * @param {() => HTMLElement | null} deps.getDefaultWalletEl
 * @param {{
 *   showShop?: import('vue').Ref<boolean>,
 *   transitionBusy?: import('vue').Ref<boolean>,
 * } | null} [deps.autoAnimateWhileInShop]
 */
export function createShopWalletGainAnim(deps) {
  const { money, walletHeaderDisplayOverride, getDefaultWalletEl, autoAnimateWhileInShop } = deps;
  /** @type {import('gsap').Timeline | null} */
  let walletGainTl = null;
  let suppressMoneyWatch = false;
  let shopWalletAutoAnimReady = false;
  /** @type {(() => void) | null} */
  let stopMoneyWatch = null;
  /** @type {(() => void) | null} */
  let stopShopGateWatch = null;

  /**
   * @param {number} start
   * @param {number} end
   * @param {HTMLElement | null} [elOverride]
   */
  function playWalletHeaderGainAnim(start, end, elOverride = null) {
    return new Promise((resolve) => {
      if (start === end) {
        resolve(undefined);
        return;
      }

      if (walletGainTl) {
        walletGainTl.kill();
        walletGainTl = null;
      }

      const el = elOverride ?? getDefaultWalletEl?.() ?? null;

      suppressMoneyWatch = true;
      money.value = end;
      walletHeaderDisplayOverride.value = start;
      suppressMoneyWatch = false;

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

  function setupShopWalletMoneyWatch() {
    const { showShop, transitionBusy } = autoAnimateWhileInShop ?? {};
    if (!showShop) return;

    stopShopGateWatch?.();
    stopMoneyWatch?.();

    stopShopGateWatch = watch(
      [showShop, () => transitionBusy?.value ?? false],
      ([shopOpen, busy]) => {
        shopWalletAutoAnimReady = false;
        if (!shopOpen || busy) return;
        void Promise.resolve().then(() => {
          shopWalletAutoAnimReady = !!(showShop.value && !(transitionBusy?.value ?? false));
        });
      },
      { immediate: true, flush: "post" },
    );

    stopMoneyWatch = watch(
      money,
      (next, prev) => {
        if (suppressMoneyWatch) return;
        if (!shopWalletAutoAnimReady) return;
        if (next === prev) return;

        const start =
          walletHeaderDisplayOverride.value !== null
            ? walletHeaderDisplayOverride.value
            : prev;
        if (start === next) return;

        void playWalletHeaderGainAnim(start, next);
      },
      { flush: "sync" },
    );
  }

  if (autoAnimateWhileInShop) {
    setupShopWalletMoneyWatch();
  }

  function disposeShopWalletGainAnim() {
    stopShopGateWatch?.();
    stopShopGateWatch = null;
    stopMoneyWatch?.();
    stopMoneyWatch = null;
    shopWalletAutoAnimReady = false;
    if (walletGainTl) {
      walletGainTl.kill();
      walletGainTl = null;
    }
    walletHeaderDisplayOverride.value = null;
  }

  return { playWalletHeaderGainAnim, disposeShopWalletGainAnim };
}
