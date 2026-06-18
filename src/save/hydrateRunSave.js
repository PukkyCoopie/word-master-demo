import { normalizeRunDifficultyIndex } from "../game/runDifficultyDefinitions.js";
import { createRunRng } from "../game/runRng.js";
import { deserializeRunMatchStats } from "./runMatchStatsCodec.js";
import { deserializeTreasureRunState } from "./treasureRunStateCodec.js";
import { deserializeAchievementRunState } from "../achievements/achievementRunState.js";
import { normalizeRunSavePhase } from "./runSaveSchema.js";
import { cloneSaveData } from "./saveDataClone.js";
import { hydrateOwnedTreasureSlots } from "../treasures/ownedTreasureSlot.js";
import { deserializeRunDiscoveryLog } from "../game/runCollectionDiscoveries.js";

/**
 * @param {import('./runSavePayload.js').RunSavePayload} payload
 * @param {Record<string, unknown>} ctx
 */
export function hydrateRunSave(payload, ctx) {
  if (!payload || typeof payload !== "object") return;

  const runRng = createRunRng(payload.runSeedNumeric, payload.rngState);
  if (ctx.runRngRef && typeof ctx.runRngRef === "object" && "value" in ctx.runRngRef) {
    ctx.runRngRef.value = runRng;
  }

  if (ctx.levelIndexRef) ctx.levelIndexRef.value = Math.max(0, Math.floor(Number(payload.levelIndex) || 0));
  if (ctx.isEndlessRunRef) ctx.isEndlessRunRef.value = payload.isEndlessRun === true;
  if (ctx.glyphShopSkipLevelAdvanceRef) {
    ctx.glyphShopSkipLevelAdvanceRef.value = payload.glyphShopSkipLevelAdvance === true;
  }
  if (ctx.moneyRef) ctx.moneyRef.value = Math.max(0, Math.floor(Number(payload.money) || 0));

  if (ctx.ownedTreasuresRef) {
    ctx.ownedTreasuresRef.value = hydrateOwnedTreasureSlots(payload.ownedTreasures ?? []);
  }
  if (ctx.ownedVoucherIdsRef) ctx.ownedVoucherIdsRef.value = [...(payload.ownedVoucherIds ?? [])].map(String);
  if (ctx.treasureRunStateRef) {
    ctx.treasureRunStateRef.value = deserializeTreasureRunState(payload.treasureRunState);
  }
  if (ctx.spellCastHistoryRef) ctx.spellCastHistoryRef.value = [...(payload.spellCastHistory ?? [])].map(String);
  if (ctx.lastReplayableSpellIdRef) {
    ctx.lastReplayableSpellIdRef.value =
      payload.lastReplayableSpellId != null ? String(payload.lastReplayableSpellId) : null;
  }

  if (ctx.usedWordLengthsThisBossRef) {
    ctx.usedWordLengthsThisBossRef.value = new Set(
      (payload.usedWordLengthsThisBoss ?? []).map((n) => Math.floor(Number(n) || 0)),
    );
  }
  if (ctx.mouthLockedLengthBossRef) {
    ctx.mouthLockedLengthBossRef.value =
      payload.mouthLockedLengthBoss != null ? Math.floor(Number(payload.mouthLockedLengthBoss)) : null;
  }
  if (ctx.clubRequiredKeyBossRef) {
    ctx.clubRequiredKeyBossRef.value =
      payload.clubRequiredKeyBoss != null ? String(payload.clubRequiredKeyBoss) : null;
  }
  if (ctx.pillarUsedDeckUidsRef) {
    ctx.pillarUsedDeckUidsRef.value = new Set(
      (payload.pillarUsedDeckUids ?? []).map((n) => Math.floor(Number(n) || 0)),
    );
  }
  if (ctx.verdantTreasureSoldRef) ctx.verdantTreasureSoldRef.value = payload.verdantTreasureSold === true;
  if (ctx.crimsonTreasureDisabledSlotIndexRef) {
    ctx.crimsonTreasureDisabledSlotIndexRef.value =
      payload.crimsonTreasureDisabledSlotIndex != null
        ? Math.floor(Number(payload.crimsonTreasureDisabledSlotIndex))
        : null;
  }
  if (ctx.pendingBossSlugOverrideRef) {
    ctx.pendingBossSlugOverrideRef.value = String(payload.pendingBossSlugOverride ?? "");
  }

  if (ctx.hydrateDeckState && payload.deckState) {
    ctx.hydrateDeckState(payload.deckState, payload.deckState.ownedUpgrades ?? []);
  }
  if (ctx.ownedUpgradesRef) {
    ctx.ownedUpgradesRef.value = cloneSaveData(payload.deckState?.ownedUpgrades ?? []);
  }

  if (ctx.runMatchStatsRef) {
    ctx.runMatchStatsRef.value = deserializeRunMatchStats(payload.runMatchStats);
  }
  if (ctx.achievementRunStateRef) {
    ctx.achievementRunStateRef.value = deserializeAchievementRunState(payload.achievementRunState);
  }
  if (ctx.runEndOutcomeRef) {
    ctx.runEndOutcomeRef.value = payload.runEndOutcome === "win" ? "win" : "fail";
  }

  if (ctx.settlementSnapshotRef) {
    ctx.settlementSnapshotRef.value = payload.settlementSnapshot
      ? cloneSaveData(payload.settlementSnapshot)
      : null;
  }
  if (ctx.shopOffersRef) ctx.shopOffersRef.value = cloneSaveData(payload.shopOffers ?? []);
  if (ctx.packOffersRef) ctx.packOffersRef.value = cloneSaveData(payload.packOffers ?? []);
  if (ctx.shopVoucherShelfRef) {
    ctx.shopVoucherShelfRef.value = payload.shopVoucherShelf
      ? cloneSaveData(payload.shopVoucherShelf)
      : null;
  }
  if (ctx.shopVoucherBonusShelfRef) {
    ctx.shopVoucherBonusShelfRef.value = payload.shopVoucherBonusShelf
      ? cloneSaveData(payload.shopVoucherBonusShelf)
      : null;
  }
  if (ctx.shopRerollsThisVisitRef) {
    ctx.shopRerollsThisVisitRef.value = Math.max(0, Math.floor(Number(payload.shopRerollsThisVisit) || 0));
  }
  if (ctx.shopVoucherShelfGenerationRef) {
    ctx.shopVoucherShelfGenerationRef.value = Math.floor(Number(payload.shopVoucherShelfGeneration) || -1);
  }
  if (ctx.packPickSessionRef) {
    ctx.packPickSessionRef.value = payload.packPickSession ? cloneSaveData(payload.packPickSession) : null;
  }
  if (ctx.bossRerollSessionRef) {
    ctx.bossRerollSessionRef.value = payload.bossRerollSession
      ? cloneSaveData(payload.bossRerollSession)
      : null;
  }

  const phase = normalizeRunSavePhase(payload.phase);
  if (ctx.showSettlementRef) ctx.showSettlementRef.value = phase === "settlement";
  if (ctx.showShopRef) ctx.showShopRef.value = phase === "shop";
  if (ctx.showRunEndRef) ctx.showRunEndRef.value = phase === "run_end_win" || phase === "run_end_fail";
  if (ctx.runPresetIdRef) {
    ctx.runPresetIdRef.value = String(payload.runPresetId ?? "preset_01");
  }
  if (ctx.runDifficultyIndexRef) {
    ctx.runDifficultyIndexRef.value = normalizeRunDifficultyIndex(payload.runDifficultyIndex);
  }
  if (ctx.runDiscoveryLogRef) {
    ctx.runDiscoveryLogRef.value = deserializeRunDiscoveryLog(payload.runDiscoveryLog);
  }
}
