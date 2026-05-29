import { buildRunSaveMetaFromPayload, serializeRunSave } from "./serializeRunSave.js";
import { hydrateRunSave } from "./hydrateRunSave.js";
import { canSaveNow } from "./runSaveGuards.js";
import { getSlotCareer, writeSlot } from "./runSaveStorage.js";
import { normalizeSlotCareerStats, recordCareerRunStarted } from "./slotCareerStats.js";
import { createEmptySlotCareerStats } from "./runSaveSchema.js";

/**
 * @param {Record<string, unknown>} ctx
 */
export function buildGamePanelSaveContext(ctx) {
  return {
    ...ctx,
    exportDeckState: ctx.exportDeckState,
    ownedUpgrades: ctx.ownedUpgrades,
    runSeedNumeric: ctx.runSeedNumeric,
    runSeedDisplay: ctx.runSeedDisplay,
    rngState: ctx.rngState,
    levelIndex: ctx.levelIndex,
    isEndlessRun: ctx.isEndlessRun,
    glyphShopSkipLevelAdvance: ctx.glyphShopSkipLevelAdvance,
    money: ctx.money,
    phase: ctx.phase,
    activeSlotIndex: ctx.activeSlotIndex,
    ownedTreasures: ctx.ownedTreasures,
    ownedVoucherIds: ctx.ownedVoucherIds,
    treasureRunState: ctx.treasureRunState,
    spellCastHistory: ctx.spellCastHistory,
    lastReplayableSpellId: ctx.lastReplayableSpellId,
    usedWordLengthsThisBoss: ctx.usedWordLengthsThisBoss,
    mouthLockedLengthBoss: ctx.mouthLockedLengthBoss,
    clubRequiredKeyBoss: ctx.clubRequiredKeyBoss,
    pillarUsedDeckUids: ctx.pillarUsedDeckUids,
    verdantTreasureSold: ctx.verdantTreasureSold,
    crimsonTreasureDisabledSlotIndex: ctx.crimsonTreasureDisabledSlotIndex,
    pendingBossSlugOverride: ctx.pendingBossSlugOverride,
    settlementSnapshot: ctx.settlementSnapshot,
    shopOffers: ctx.shopOffers,
    packOffers: ctx.packOffers,
    shopVoucherShelf: ctx.shopVoucherShelf,
    shopRerollsThisVisit: ctx.shopRerollsThisVisit,
    shopVoucherShelfGeneration: ctx.shopVoucherShelfGeneration,
    packPickSession: ctx.packPickSession,
    bossRerollSession: ctx.bossRerollSession,
    runMatchStats: ctx.runMatchStats,
    runEndOutcome: ctx.runEndOutcome,
    showShop: ctx.showShop,
    showSettlement: ctx.showSettlement,
    showRunEnd: ctx.showRunEnd,
  };
}

/**
 * @param {Record<string, unknown>} ctx
 * @param {number} slotIndex
 */
export function saveGamePanelToSlot(ctx, slotIndex) {
  const payload = serializeRunSave(buildGamePanelSaveContext(ctx));
  const meta = buildRunSaveMetaFromPayload(payload, payload.levelIndex);
  const prevCareer = normalizeSlotCareerStats(getSlotCareer(slotIndex) ?? createEmptySlotCareerStats());
  if (prevCareer.runsStarted === 0 && payload.phase === "playing") {
    recordCareerRunStarted(prevCareer);
  }
  const ok = writeSlot(slotIndex, meta, payload, prevCareer);
  return ok ? { ok: true } : { ok: false, message: "存储空间不足或无法写入" };
}

/**
 * @param {import('./runSavePayload.js').RunSavePayload} payload
 * @param {Record<string, unknown>} hydrateCtx
 */
export function applyGamePanelSave(payload, hydrateCtx) {
  hydrateRunSave(payload, hydrateCtx);
}

/**
 * @param {Record<string, unknown>} idleCtx
 */
export function checkGamePanelCanSave(idleCtx) {
  const idle =
    !idleCtx.transitionBusy &&
    !idleCtx.scoringAnimating &&
    !idleCtx.gridRefillAnimating &&
    (idleCtx.flyingLettersCount ?? 0) === 0 &&
    (idleCtx.flyingBackBatchesCount ?? 0) === 0 &&
    !idleCtx.submitWordBusy;
  return canSaveNow({
    idle,
    transitionBusy: idleCtx.transitionBusy,
    scoringAnimating: idleCtx.scoringAnimating,
    gridRefillAnimating: idleCtx.gridRefillAnimating,
    flyingLettersCount: idleCtx.flyingLettersCount,
    flyingBackBatchesCount: idleCtx.flyingBackBatchesCount,
    submitWordBusy: idleCtx.submitWordBusy,
  });
}
