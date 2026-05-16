/**
 * 项目动画约定（细则见 .cursor/rules/animation-easing.mdc）
 *
 * ## expo.out（EASE_TRANSFORM）
 * 凡涉及 **位移**（x/y、left/top）、**尺寸**（width/height、fontSize 等）、**缩放/旋转**
 * （scale、rotation）的动画，GSAP 一律：`ease: EASE_TRANSFORM`（即 "expo.out"）。
 *
 * ## CSS
 * 与 transform 或布局尺寸相关的 transition/animation，使用 `var(--ease-expo-out)`（game.css）。
 *
 * ## 例外（勿改）
 * - 棋盘竖直下落：EASE_GRID_GRAVITY_Y（power2.in）
 * - 同段抛物线水平分量：EASE_GRID_LINEAR（none）
 * - 纯透明度/颜色、装饰性 infinite 动画：见 animation-easing.mdc
 */

export const EASE_TRANSFORM = "expo.out";
/** 竖直匀加速下落（近 s = ½gt²） */
export const EASE_GRID_GRAVITY_Y = "power2.in";
/** 与重力合成抛物线时，水平分量匀速 */
export const EASE_GRID_LINEAR = "none";

/** 结算利息：钱包中每 5 元产生 1 元利息，单次结算上限 */
export const ECONOMY_INTEREST_PER_5 = 5;
export const ECONOMY_INTEREST_CAP = 5;

/**
 * @param {number} walletBeforeSettlement 结算前持有金额（未加本关奖励）
 * @returns {number} 本关结算可获得的利息（元）
 */
export function computeWalletInterest(walletBeforeSettlement, capOverride = null) {
  const w = Math.max(0, Math.floor(Number(walletBeforeSettlement) || 0));
  const cap =
    capOverride != null && Number.isFinite(Number(capOverride))
      ? Math.max(0, Math.floor(Number(capOverride)))
      : ECONOMY_INTEREST_CAP;
  return Math.min(cap, Math.floor(w / ECONOMY_INTEREST_PER_5));
}

/**
 * Balatro 商店刷新：起价 $5，每在本店多刷一次 +$1；下次进店由 GamePanel 将「本店已刷次数」清零，等价于进店重置为 $5。
 * @param {number} rerollsAlreadyDoneThisVisit 本段商店停留内已成功刷新的次数（0 表示尚未刷过）
 */
export function computeShopRerollCost(rerollsAlreadyDoneThisVisit) {
  const n = Math.max(0, Math.floor(Number(rerollsAlreadyDoneThisVisit) || 0));
  return SHOP_REROLL_BASE_COST + n * SHOP_REROLL_COST_INCREMENT_PER_USE;
}

export const SHOP_REROLL_BASE_COST = 5;
export const SHOP_REROLL_COST_INCREMENT_PER_USE = 1;

/** @deprecated 使用 `computeShopRerollCost(0)` 或进店动态费用 */
export const SHOP_REROLL_COST = SHOP_REROLL_BASE_COST;
