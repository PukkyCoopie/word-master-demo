import { watch } from "vue";
import {
  applyGamePanelSave,
  checkGamePanelCanSave,
  saveGamePanelToSlot,
} from "../../save/gamePanelSaveApi.js";
import { createRunAutoSave } from "../../save/runAutoSave.js";

/** @typedef {import('../runSessionTypes.js').SaveBridge} SaveBridge */
/** @typedef {import('../runSessionTypes.js').CanSaveSnapshot} CanSaveSnapshot */
/** @typedef {import('../runSessionTypes.js').RunStore} RunStore */

/**
 * @typedef {Object} RunSaveBridgeOptions
 * @property {() => number} getSaveSlotIndex
 * @property {() => string} getRunSeedDisplay
 * @property {() => boolean} isAlive
 * @property {RunStore} run
 * @property {{
 *   exportDeckState: () => import('../../save/runSavePayload.js').SerializedDeckState,
 *   hydrateDeckState: (state: import('../../save/runSavePayload.js').SerializedDeckState, ownedUpgrades?: unknown[]) => void,
 * }} grid
 * @property {{
 *   showShop: import('vue').Ref<boolean>,
 *   showSettlement: import('vue').Ref<boolean>,
 *   showRunEnd: import('vue').Ref<boolean>,
 * }} overlay
 * @property {{
 *   transitionBusy: import('vue').Ref<boolean>,
 *   scoringAnimating: import('vue').Ref<boolean>,
 *   gridRefillAnimating: import('vue').Ref<boolean>,
 *   flyingLetters: import('vue').Ref<unknown[]>,
 *   flyingBackBatches: import('vue').Ref<unknown[]>,
 *   submitWordBusy: import('vue').Ref<boolean>,
 * }} anim
 * @property {{
 *   shopOffers: import('vue').Ref<unknown[]>,
 *   packOffers: import('vue').Ref<unknown[]>,
 *   shopVoucherShelf: import('vue').Ref<unknown | null>,
 *   shopVoucherBonusShelf: import('vue').Ref<unknown | null>,
 *   shopRerollsThisVisit: import('vue').Ref<number>,
 *   shopVoucherShelfGeneration: import('vue').Ref<number>,
 *   packPickSession: import('vue').Ref<unknown | null>,
 * }} shop
 * @property {{
 *   usedWordLengthsThisBoss: import('vue').Ref<Set<number>>,
 *   mouthLockedLengthBoss: import('vue').Ref<number | null>,
 *   clubRequiredKeyBoss: import('vue').Ref<string | null>,
 *   pillarUsedDeckUids: import('vue').Ref<Set<number>>,
 *   verdantTreasureSold: import('vue').Ref<boolean>,
 *   crimsonTreasureDisabledSlotIndex: import('vue').Ref<number | null>,
 *   pendingBossSlugOverride: import('vue').Ref<string>,
 *   bossRerollSession: import('vue').Ref<unknown | null>,
 * }} boss
 * @property {{
 *   spellCastHistory: import('vue').Ref<string[]>,
 *   lastReplayableSpellId: import('vue').Ref<string | null>,
 * }} spell
 * @property {{
 *   glyphShopSkipLevelAdvance: import('vue').Ref<boolean>,
 *   settlementSnapshot: import('vue').Ref<unknown | null>,
 *   runDiscoveryLog: import('vue').Ref<unknown>,
 *   runEndOutcome: import('vue').Ref<string>,
 * }} misc
 */

/**
 * 局内存档桥：buildSaveContext / hydrate / 自动存档 debounce+watch（任务 1.4）。
 * 序列化仍经 `gamePanelSaveApi.js`。
 *
 * @param {RunSaveBridgeOptions} options
 * @returns {SaveBridge & {
 *   scheduleAutoSave: () => void,
 *   tryFlush: (opts?: { force?: boolean }) => void,
 *   cancelPending: () => void,
 *   saveCurrentRun: (slotIndex?: number, opts?: { immediate?: boolean }) => ReturnType<typeof saveGamePanelToSlot>,
 *   buildHydrateContext: () => Record<string, unknown>,
 * }}
 */
export function useRunSaveBridge(options) {
  const { getSaveSlotIndex, getRunSeedDisplay, isAlive, run, grid, overlay, anim, shop, boss, spell, misc } =
    options;

  function buildSaveContext() {
    return {
      exportDeckState: grid.exportDeckState,
      ownedUpgrades: run.ownedUpgrades.value,
      runSeedNumeric: run.runSeedNumeric,
      runSeedDisplay: getRunSeedDisplay(),
      rngState: run.runRng.value.getState(),
      levelIndex: run.levelIndex.value,
      isEndlessRun: run.isEndlessRun.value,
      glyphShopSkipLevelAdvance: misc.glyphShopSkipLevelAdvance.value,
      money: run.money.value,
      phase: "playing",
      activeSlotIndex: getSaveSlotIndex(),
      ownedTreasures: run.ownedTreasures.value,
      ownedVoucherIds: run.ownedVoucherIds.value,
      treasureRunState: run.treasureRunState.value,
      spellCastHistory: spell.spellCastHistory.value,
      lastReplayableSpellId: spell.lastReplayableSpellId.value,
      usedWordLengthsThisBoss: [...boss.usedWordLengthsThisBoss.value],
      mouthLockedLengthBoss: boss.mouthLockedLengthBoss.value,
      clubRequiredKeyBoss: boss.clubRequiredKeyBoss.value,
      pillarUsedDeckUids: [...boss.pillarUsedDeckUids.value],
      verdantTreasureSold: boss.verdantTreasureSold.value,
      crimsonTreasureDisabledSlotIndex: boss.crimsonTreasureDisabledSlotIndex.value,
      pendingBossSlugOverride: boss.pendingBossSlugOverride.value,
      settlementSnapshot: misc.settlementSnapshot.value,
      shopOffers: shop.shopOffers.value,
      packOffers: shop.packOffers.value,
      shopVoucherShelf: shop.shopVoucherShelf.value,
      shopVoucherBonusShelf: shop.shopVoucherBonusShelf.value,
      shopRerollsThisVisit: shop.shopRerollsThisVisit.value,
      shopVoucherShelfGeneration: shop.shopVoucherShelfGeneration.value,
      packPickSession: shop.packPickSession.value,
      bossRerollSession: boss.bossRerollSession.value,
      runMatchStats: run.runMatchStats.value,
      runDiscoveryLog: misc.runDiscoveryLog.value,
      achievementRunState: run.achievementRunState.value,
      runEndOutcome: misc.runEndOutcome.value,
      showShop: overlay.showShop.value,
      showSettlement: overlay.showSettlement.value,
      showRunEnd: overlay.showRunEnd.value,
      runPresetId: run.runPresetId.value,
      runDifficultyIndex: run.runDifficultyIndex.value,
    };
  }

  function buildHydrateContext() {
    return {
      runRngRef: run.runRng,
      levelIndexRef: run.levelIndex,
      isEndlessRunRef: run.isEndlessRun,
      glyphShopSkipLevelAdvanceRef: misc.glyphShopSkipLevelAdvance,
      moneyRef: run.money,
      ownedTreasuresRef: run.ownedTreasures,
      ownedVoucherIdsRef: run.ownedVoucherIds,
      treasureRunStateRef: run.treasureRunState,
      spellCastHistoryRef: spell.spellCastHistory,
      lastReplayableSpellIdRef: spell.lastReplayableSpellId,
      usedWordLengthsThisBossRef: boss.usedWordLengthsThisBoss,
      mouthLockedLengthBossRef: boss.mouthLockedLengthBoss,
      clubRequiredKeyBossRef: boss.clubRequiredKeyBoss,
      pillarUsedDeckUidsRef: boss.pillarUsedDeckUids,
      verdantTreasureSoldRef: boss.verdantTreasureSold,
      crimsonTreasureDisabledSlotIndexRef: boss.crimsonTreasureDisabledSlotIndex,
      pendingBossSlugOverrideRef: boss.pendingBossSlugOverride,
      hydrateDeckState: grid.hydrateDeckState,
      ownedUpgradesRef: run.ownedUpgrades,
      runMatchStatsRef: run.runMatchStats,
      runDiscoveryLogRef: misc.runDiscoveryLog,
      achievementRunStateRef: run.achievementRunState,
      runEndOutcomeRef: misc.runEndOutcome,
      showSettlementRef: overlay.showSettlement,
      showShopRef: overlay.showShop,
      showRunEndRef: overlay.showRunEnd,
      settlementSnapshotRef: misc.settlementSnapshot,
      shopOffersRef: shop.shopOffers,
      packOffersRef: shop.packOffers,
      shopVoucherShelfRef: shop.shopVoucherShelf,
      shopVoucherBonusShelfRef: shop.shopVoucherBonusShelf,
      shopRerollsThisVisitRef: shop.shopRerollsThisVisit,
      shopVoucherShelfGenerationRef: shop.shopVoucherShelfGeneration,
      packPickSessionRef: shop.packPickSession,
      bossRerollSessionRef: boss.bossRerollSession,
      runPresetIdRef: run.runPresetId,
      runDifficultyIndexRef: run.runDifficultyIndex,
    };
  }

  /** @returns {CanSaveSnapshot} */
  function getCanSaveSnapshot() {
    return {
      transitionBusy: anim.transitionBusy.value,
      scoringAnimating: anim.scoringAnimating.value,
      gridRefillAnimating: anim.gridRefillAnimating.value,
      flyingLettersCount: anim.flyingLetters.value.length,
      flyingBackBatchesCount: anim.flyingBackBatches.value.length,
      submitWordBusy: anim.submitWordBusy.value,
    };
  }

  function canSaveNow() {
    return checkGamePanelCanSave(getCanSaveSnapshot());
  }

  /** @param {number} [slotIndex] @param {{ immediate?: boolean }} [opts] */
  function saveCurrentRun(slotIndex = getSaveSlotIndex(), opts = {}) {
    return saveGamePanelToSlot(buildSaveContext(), slotIndex, opts);
  }

  /** @param {import('../../save/runSavePayload.js').RunSavePayload} payload */
  function hydrateFromPayload(payload) {
    applyGamePanelSave(payload, buildHydrateContext());
  }

  const runAutoSave = createRunAutoSave({
    canSave: canSaveNow,
    save: (opts) => {
      saveCurrentRun(getSaveSlotIndex(), opts);
    },
    isAlive,
  });

  watch(
    () => [
      anim.scoringAnimating.value,
      anim.gridRefillAnimating.value,
      anim.flyingLetters.value.length,
      anim.flyingBackBatches.value.length,
      anim.transitionBusy.value,
      anim.submitWordBusy.value,
    ],
    () => {
      runAutoSave.tryFlush();
    },
  );

  /** @returns {Promise<void>} */
  async function flushAutoSave() {
    runAutoSave.tryFlush({ force: true });
  }

  return {
    getCanSaveSnapshot,
    canSaveNow,
    buildSaveContext,
    buildHydrateContext,
    hydrateFromPayload,
    saveCurrentRun,
    flushAutoSave,
    scheduleAutoSave: () => runAutoSave.scheduleAutoSave(),
    tryFlush: runAutoSave.tryFlush,
    cancelPending: runAutoSave.cancelPending,
  };
}
