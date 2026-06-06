/**
 * 局内 GamePanel 的 Android 返回逻辑（由 GamePanel 注入运行时状态）。
 * @param {object} ctx
 * @returns {boolean}
 */
export function handleGameAndroidBack(ctx) {
  if (ctx.transitionBusy.value) return true;
  if (ctx.shopUpgradeAnimating.value || ctx.packPickBusy.value || ctx.packPickSkipBusy?.value) return true;
  if (ctx.submitWordBusy.value || ctx.scoringAnimating.value || ctx.gridRefillAnimating.value) {
    return true;
  }

  if (ctx.spellTargetSession.value) {
    void ctx.onSpellTargetCancel();
    return true;
  }

  if (ctx.bossRerollSession.value) {
    void ctx.dismissBossReroll();
    return true;
  }

  if (ctx.treasureDetail.value) {
    void ctx.dismissTreasureDetail();
    return true;
  }

  if (ctx.spellReferencePreview.value) {
    ctx.spellReferencePreview.value = null;
    return true;
  }

  if (ctx.tileDetailPayload.value) {
    void ctx.dismissTileDetail();
    return true;
  }

  if (ctx.packPickSession.value) {
    void ctx.onPackPickSkip();
    return true;
  }

  if (ctx.showShop.value) {
    ctx.openPauseOptionsFromShop();
    return true;
  }

  if (ctx.showDeckLayer.value) {
    ctx.showDeckLayer.value = false;
    return true;
  }

  if (ctx.showInfoLayer.value) {
    ctx.showInfoLayer.value = false;
    return true;
  }

  if (ctx.showPauseOptions.value) {
    ctx.closePauseOptions();
    return true;
  }

  if (ctx.showSettlement.value) {
    if (ctx.settlementIntroPending()) {
      ctx.finishSettlementIntroInstant();
    } else {
      ctx.onSettlementContinue();
    }
    return true;
  }

  if (ctx.showRunEnd.value) {
    return true;
  }

  if (ctx.dictFatalError.value) {
    return true;
  }

  if (!ctx.isBlockingPauseOpen()) {
    ctx.openPauseOptions();
    return true;
  }

  return false;
}
