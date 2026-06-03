import { getRunLevelAtIndex } from "../levelDefinitions.js";
import { getDeckCardUidSeq } from "../composables/useGameState.js";
import { normalizeRunSavePhase } from "./runSaveSchema.js";
import { serializeRunMatchStats } from "./runMatchStatsCodec.js";
import { serializeTreasureRunState } from "./treasureRunStateCodec.js";
import { serializeAchievementRunState } from "../achievements/achievementRunState.js";
import { cloneSaveData } from "./saveDataClone.js";
import { serializeOwnedTreasureSlots } from "../treasures/ownedTreasureSlot.js";
import { getTreasureDef } from "../treasures/treasureRegistry.js";
import { serializeRunDiscoveryLog } from "../game/runCollectionDiscoveries.js";

/**
 * @param {Record<string, unknown>} ctx
 * @returns {import('./runSavePayload.js').RunSavePayload}
 */
export function serializeRunSave(ctx) {
  const deckState = /** @type {ReturnType<import('../composables/useGameState.js').useGameState>['exportDeckState']>} */ (
    ctx.exportDeckState
  )();
  deckState.ownedUpgrades = cloneSaveData(ctx.ownedUpgrades ?? []);

  let phase = normalizeRunSavePhase(ctx.phase);
  if (ctx.showRunEnd && ctx.runEndOutcome === "win") phase = "run_end_win";
  else if (ctx.showRunEnd && ctx.runEndOutcome === "fail") phase = "run_end_fail";
  else if (ctx.showSettlement) phase = "settlement";
  else if (ctx.showShop) phase = "shop";

  return {
    runSeedNumeric: Math.floor(Number(ctx.runSeedNumeric) || 0) >>> 0,
    runSeedDisplay: String(ctx.runSeedDisplay ?? ""),
    rngState: Math.floor(Number(ctx.rngState) || 0) >>> 0,
    deckCardUidSeq: getDeckCardUidSeq(),
    levelIndex: Math.max(0, Math.floor(Number(ctx.levelIndex) || 0)),
    isEndlessRun: ctx.isEndlessRun === true,
    glyphShopSkipLevelAdvance: ctx.glyphShopSkipLevelAdvance === true,
    money: Math.max(0, Math.floor(Number(ctx.money) || 0)),
    phase,
    activeSlotIndex: Math.max(0, Math.floor(Number(ctx.activeSlotIndex) || 0)),
    deckState,
    ownedTreasures: serializeOwnedTreasureSlots(ctx.ownedTreasures ?? []),
    ownedVoucherIds: [...(ctx.ownedVoucherIds ?? [])].map(String),
    treasureRunState: serializeTreasureRunState(ctx.treasureRunState),
    spellCastHistory: [...(ctx.spellCastHistory ?? [])].map(String),
    lastReplayableSpellId: ctx.lastReplayableSpellId != null ? String(ctx.lastReplayableSpellId) : null,
    usedWordLengthsThisBoss: [...(ctx.usedWordLengthsThisBoss ?? [])].map((n) => Math.floor(Number(n) || 0)),
    mouthLockedLengthBoss:
      ctx.mouthLockedLengthBoss != null ? Math.floor(Number(ctx.mouthLockedLengthBoss)) : null,
    clubRequiredKeyBoss: ctx.clubRequiredKeyBoss != null ? String(ctx.clubRequiredKeyBoss) : null,
    pillarUsedDeckUids: [...(ctx.pillarUsedDeckUids ?? [])].map((n) => Math.floor(Number(n) || 0)),
    verdantTreasureSold: ctx.verdantTreasureSold === true,
    crimsonTreasureDisabledSlotIndex:
      ctx.crimsonTreasureDisabledSlotIndex != null
        ? Math.floor(Number(ctx.crimsonTreasureDisabledSlotIndex))
        : null,
    pendingBossSlugOverride: String(ctx.pendingBossSlugOverride ?? ""),
    settlementSnapshot: ctx.settlementSnapshot ? cloneSaveData(ctx.settlementSnapshot) : null,
    shopOffers: cloneSaveData(ctx.shopOffers ?? []),
    packOffers: cloneSaveData(ctx.packOffers ?? []),
    shopVoucherShelf: ctx.shopVoucherShelf ? cloneSaveData(ctx.shopVoucherShelf) : null,
    shopVoucherBonusShelf: ctx.shopVoucherBonusShelf ? cloneSaveData(ctx.shopVoucherBonusShelf) : null,
    shopRerollsThisVisit: Math.max(0, Math.floor(Number(ctx.shopRerollsThisVisit) || 0)),
    shopVoucherShelfGeneration: Math.floor(Number(ctx.shopVoucherShelfGeneration) || -1),
    packPickSession: ctx.packPickSession ? cloneSaveData(ctx.packPickSession) : null,
    bossRerollSession: ctx.bossRerollSession ? cloneSaveData(ctx.bossRerollSession) : null,
    runMatchStats: serializeRunMatchStats(ctx.runMatchStats),
    achievementRunState: serializeAchievementRunState(
      /** @type {import('../achievements/achievementRunState.js').AchievementRunState} */ (
        ctx.achievementRunState ?? { wordsPerLevelId: {}, interestEarnedTotal: 0, moneySpentTotal: 0, discardUsesCount: 0 }
      ),
    ),
    runEndOutcome: ctx.runEndOutcome === "win" ? "win" : "fail",
    runPresetId: String(ctx.runPresetId ?? "preset_01"),
    runDifficultyIndex: Math.max(0, Math.min(7, Math.floor(Number(ctx.runDifficultyIndex) || 0))),
    runDiscoveryLog: serializeRunDiscoveryLog(
      /** @type {import('../game/runCollectionDiscoveries.js').RunDiscoveryLog | null | undefined} */ (
        ctx.runDiscoveryLog
      ),
    ),
  };
}

/**
 * @param {import('./runSavePayload.js').RunSavePayload} payload
 * @param {number} levelIndex
 * @returns {import('./runSaveSchema.js').RunSaveMeta}
 */
export function buildRunSaveMetaFromPayload(payload, levelIndex) {
  const levelDef = getRunLevelAtIndex(levelIndex);
  const emojis = (payload.ownedTreasures ?? []).map((t) => {
    if (!t || typeof t !== "object") return null;
    const tid = String(/** @type {{ treasureId?: string }} */ (t).treasureId ?? "").trim();
    if (tid) {
      const def = getTreasureDef(tid);
      if (def?.emoji) return String(def.emoji);
    }
    const legacy = /** @type {{ emoji?: string }} */ (t).emoji;
    return legacy ? String(legacy) : null;
  });
  while (emojis.length < 5) emojis.push(null);
  return {
    seedDisplay: String(payload.runSeedDisplay ?? ""),
    levelId: levelDef?.id ?? "1-1",
    money: Math.max(0, Math.floor(Number(payload.money) || 0)),
    isEndlessRun: payload.isEndlessRun === true,
    phase: normalizeRunSavePhase(payload.phase),
    ownedTreasureEmojis: emojis.slice(0, 5),
    savedAt: Date.now(),
    runPresetId: String(payload.runPresetId ?? "preset_01"),
    runDifficultyIndex: Math.max(0, Math.min(7, Math.floor(Number(payload.runDifficultyIndex) || 0))),
  };
}
