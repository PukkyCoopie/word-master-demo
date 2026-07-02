import { ACCESSORY_CROP } from "../accessories/accessoryCatalog.js";
import { initTreasureBankOnAcquire } from "../treasures/treasureAcquireInit.js";
import { devConvertDeckTiles } from "../dev/devDeckTileConvert.js";
import { grantDevOwnedTreasuresByIds } from "../dev/devGrantTreasures.js";

/** @param {number} amount */
function formatDevBalanceLabel(amount) {
  const x = Math.floor(Number(amount) || 0);
  return x < 0 ? `-$${Math.abs(x)}` : `$${x}`;
}

/**
 * Developer 选项层回调 + dev grant deps。
 * @param {object} d
 */
export function createGamePanelDevHandlers(d) {
  function buildDevGrantTreasureDeps() {
    return {
      getOwnedTreasures: () => d.ownedTreasures.value,
      setOwnedTreasures: (slots) => {
        d.ownedTreasures.value = slots;
      },
      findTreasurePlacementIndex: d.findTreasurePlacementIndex,
      buildOwnedTreasureSlot: d.buildOwnedTreasureSlot,
      noteCollectionTreasureAcquired: d.noteCollectionTreasureAcquired,
      initTreasureBankOnAcquire,
      applyTreasureAcquireImmediateEffectsForRun: d.applyTreasureAcquireImmediateEffectsForRun,
      getTreasureRunState: () => d.treasureRunState.value,
      accessoryCropId: ACCESSORY_CROP,
      expandWithCropWhenFull: true,
    };
  }

  function onDeveloperConvertDeck(payload) {
    const result = devConvertDeckTiles({
      deck: d.deck.value,
      grid: d.grid.value,
      rows: d.ROWS,
      cols: d.COLS,
      scope: payload?.scope,
      target: payload?.target ?? payload?.targetMaterialId,
      rng: d.runRandom,
      rarityLevelsByRarity: d.rarityLevelsByRarity.value,
    });
    d.touchGrid();
    d.scheduleRunAutoSave();
    d.developerOptionsLayerRef.value?.reportConvertResult?.(result);
  }

  async function onDeveloperJumpLevel(payload) {
    const levelId = String(payload?.levelId ?? "").trim();
    if (!levelId) return;
    await d.devCommandsRef.current?.jumpToLevelDev(levelId, { skipIntro: true });
  }

  async function onDeveloperJumpBossShop(payload) {
    const bossSlug = String(payload?.bossSlug ?? "").trim();
    if (!bossSlug) return;
    const result = await d.devCommandsRef.current?.jumpToBossShopDev?.(
      bossSlug,
      payload?.levelId ?? "",
    );
    d.developerOptionsLayerRef.value?.reportBossShopJumpResult?.(result ?? {
      ok: false,
      message: "跳转失败（开发命令未就绪）",
    });
  }

  function onDeveloperGrantTreasures(payload) {
    const ids = Array.isArray(payload?.treasureIds) ? payload.treasureIds : [];
    if (!ids.length) return;
    const results = grantDevOwnedTreasuresByIds(ids, buildDevGrantTreasureDeps());
    let granted = 0;
    let failed = 0;
    let cropCount = 0;
    for (const r of results) {
      if (r.ok) {
        granted += 1;
        if (r.usedCrop) cropCount += 1;
      } else {
        failed += 1;
      }
    }
    d.scheduleRunAutoSave();
    d.developerOptionsLayerRef.value?.reportGrantResult?.({ granted, failed, cropCount });
  }

  async function onDeveloperCastSpell(payload) {
    const spellId = String(payload?.spellId ?? "").trim();
    if (!spellId) return;
    d.showDeveloperOptions.value = false;
    d.showPauseOptions.value = false;
    await d.nextTick();
    await d.runInRunSpellGrant(spellId, { cdShopLeaveReplay: d.showShop.value });
  }

  function onDeveloperSetBalance(payload) {
    const raw = String(payload?.amountRaw ?? "").trim();
    if (!raw) {
      d.developerOptionsLayerRef.value?.reportBalanceResult?.({
        ok: false,
        message: "请输入目标余额。",
      });
      return;
    }
    if (!/^-?\d+$/.test(raw)) {
      d.developerOptionsLayerRef.value?.reportBalanceResult?.({
        ok: false,
        message: "请输入整数（可带负号）。",
      });
      return;
    }
    const target = Math.floor(Number(raw));
    const floor = Math.floor(Number(d.runWalletFloor?.value ?? 0) || 0);
    const applied = Math.max(floor, target);
    d.money.value = applied;
    d.scheduleRunAutoSave();
    d.developerOptionsLayerRef.value?.reportBalanceResult?.({
      ok: true,
      amount: applied,
      message:
        applied !== target
          ? `已设为 ${formatDevBalanceLabel(applied)}（不低于钱包下限 ${formatDevBalanceLabel(floor)}）。`
          : `已设为 ${formatDevBalanceLabel(applied)}。`,
    });
  }

  return {
    buildDevGrantTreasureDeps,
    onDeveloperConvertDeck,
    onDeveloperJumpLevel,
    onDeveloperJumpBossShop,
    onDeveloperGrantTreasures,
    onDeveloperCastSpell,
    onDeveloperSetBalance,
  };
}

/**
 * @param {object} d
 */
export function buildGamePanelDevCommandsOptions(d) {
  return {
    refs: {
      maskBubbleDevScenarioActive: d.maskBubbleDevScenarioActive,
      allIceDevScenarioActive: d.allIceDevScenarioActive,
      ceruleanBellDevScenarioActive: d.ceruleanBellDevScenarioActive,
      pagerDevScenarioActive: d.pagerDevScenarioActive,
      ectoplasmDevScenarioActive: d.ectoplasmDevScenarioActive,
      mouthQuProblemDevScenarioActive: d.mouthQuProblemDevScenarioActive,
      promoScreenshotDevPresetActive: d.promoScreenshotDevPresetActive,
      ownedTreasures: d.ownedTreasures,
      transitionBusy: d.transitionBusy,
      showShop: d.showShop,
      showSettlement: d.showSettlement,
      showRunEnd: d.showRunEnd,
      showPauseOptions: d.showPauseOptions,
      showDeveloperOptions: d.showDeveloperOptions,
      levelIndex: d.levelIndex,
      pendingBossSlugOverride: d.pendingBossSlugOverride,
      gridIntroDone: d.gridIntroDone,
      gridRefillAnimating: d.gridRefillAnimating,
      gridTileRefs: d.gridTileRefs,
      glyphShopSkipLevelAdvance: d.glyphShopSkipLevelAdvance,
      runDifficultyIndex: d.runDifficultyIndex,
      money: d.money,
      shopOverlayLayersSuppressed: d.shopOverlayLayersSuppressed,
      packPickOverlaySuppressed: d.packPickOverlaySuppressed,
      packPickSession: d.packPickSession,
      debugScoreCardTargetOverride: d.debugScoreCardTargetOverride,
      debugScoreCardRoundOverride: d.debugScoreCardRoundOverride,
      dictionaryReady: d.dictionaryReady,
    },
    ROWS: d.ROWS,
    COLS: d.COLS,
    buildOwnedTreasureSlot: d.buildOwnedTreasureSlot,
    getCurrentLevel: () => d.currentLevel.value,
    getRunLevelAtIndex: d.getRunLevelAtIndex,
    getRunLevelIndexForId: d.getRunLevelIndexForId,
    resetLevelAfterTreasurePrep: d.resetLevelAfterTreasurePrep,
    resetDeckAfterStageEnd: d.resetDeckAfterStageEnd,
    runPendingAfterGridTilesSettled: d.runPendingAfterGridTilesSettled,
    runGridIntroAfterReset: d.runGridIntroAfterReset,
    playLevelAdvanceHeaderFx: d.playLevelAdvanceHeaderFx,
    touchGrid: d.touchGrid,
    updateSlotPositions: d.updateSlotPositions,
    scheduleRunAutoSave: d.scheduleRunAutoSave,
    nextTick: d.nextTick,
    runRandom: d.runRandom,
    shopTreasurePool: d.shopPhase.shopTreasurePool,
    loadDictionary: d.loadDictionary,
    getGamePanelAlive: d.getGamePanelAlive,
    isWildcardMaterialTile: d.isWildcardMaterialTile,
    getCandidateWordsByLength: d.getCandidateWordsByLength,
    resolveWordPattern: d.resolveWordPattern,
    rarityLevelsByRarity: d.rarityLevelsByRarity,
    buildBossWildcardResolveContext: d.buildBossWildcardResolveContext,
    nextOfferInstanceId: d.shopPhase.nextOfferInstanceId,
    grantRandomOwnedTreasuresInRunWithPopAnim: d.grantRandomOwnedTreasuresInRunWithPopAnim,
    tryCeruleanBellMarkAfterGridStable: d.tryCeruleanBellMarkAfterGridStable,
    getGrid: () => d.grid.value,
    selectTile: d.selectTile,
    removeFromSlot: d.removeFromSlot,
    getSelectedOrderLength: () => d.selectedOrder.value.length,
    submitWord: d.submitWord,
    getScoringAnimating: () => d.scoringAnimating.value,
    getGridRefillAnimating: () => d.gridRefillAnimating.value,
    getSubmitWordBusy: () => d.submitWordBusy.value,
  };
}
