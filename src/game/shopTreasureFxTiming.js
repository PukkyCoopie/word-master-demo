import { getAnimationSpeedScale } from "../settings/animationSpeed.js";

/** 结算进店虹膜 reveal 期间：略延后 onShopEnter FX，避免被转场遮住；不等到 transitionBusy 结束。 */
const SHOP_ENTER_TREASURE_FX_DELAY_MS = 280;

function effectiveShopEnterTreasureFxDelayMs() {
  const scale = getAnimationSpeedScale();
  return Math.max(0, Math.round(SHOP_ENTER_TREASURE_FX_DELAY_MS / scale));
}

/**
 * 商店 onShopEnter 类 FX 的轻量入场等待（小票「免费刷新」等）。
 * @param {{
 *   getShowShop: () => boolean,
 *   getTransitionBusy: () => boolean,
 *   nextTick: () => Promise<void>,
 * }} deps
 * @returns {Promise<boolean>} 仍为商店且可播 FX 时 true
 */
export async function waitForShopPresentationBeforeTreasureFx(deps) {
  if (!deps.getShowShop()) return false;

  if (deps.getTransitionBusy()) {
    await new Promise((resolve) => {
      setTimeout(resolve, effectiveShopEnterTreasureFxDelayMs());
    });
  } else {
    await deps.nextTick();
  }

  if (!deps.getShowShop()) return false;
  return true;
}
