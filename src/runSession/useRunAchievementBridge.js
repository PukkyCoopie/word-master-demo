import { inject, ref } from "vue";
import {
  createAchievementRunState,
  recordAchievementRunLuckyTriggers,
  recordAchievementRunMoneySpent,
  recordAchievementRunSafeBombBlast,
  recordAchievementRunVolcanoEruption,
  recordAchievementRunWordSubmitted,
} from "../achievements/achievementRunState.js";
import { resolveMaxLengthAndRarityLevel } from "../achievements/achievementEvaluate.js";
import {
  computeMaxLetterScoreTriggers,
  countLuckyMaterialTriggers,
  countSteelGridPresenceEnhancements,
} from "../achievements/achievementSubmitMetrics.js";
import {
  getUpgradeTreasureIdForRandomPick,
  getUpgradeTreasureIdForRarityKey,
  getUpgradeTreasureIdForWordLen,
} from "../collection/collectionUpgradeCatalog.js";
import { isWildcardMaterialTile } from "../composables/useScoring.js";
import { appendRunDiscovery } from "../game/runCollectionDiscoveries.js";
import {
  recordAccessoryDiscovered,
  recordMaterialDiscovered,
  recordSpellDiscovered,
  recordTreasureDiscovered,
  recordUpgradeDiscovered,
  recordVoucherDiscovered,
} from "../collection/collectionCareer.js";
import { readTreasureAccessoryIds } from "../accessories/accessoryState.js";
import {
  UPGRADE_LENGTH_GROUPS,
  UPGRADE_RARITY_LETTER_LABEL,
} from "../shop/shopOfferRowBuilders.js";
import { parseLevelSubFromId } from "../vouchers/voucherRuntime.js";
import { getTreasureDef } from "../treasures/treasureRegistry.js";

/**
 * @param {Object} deps
 * @param {import('vue').Ref<number>} deps.money
 * @param {import('vue').Ref<string[]>} deps.ownedVoucherIds
 * @param {import('vue').Ref<Record<number, number>>} deps.lengthLevelsByLength
 * @param {import('vue').Ref<Record<string, number>>} deps.rarityLevelsByRarity
 * @param {import('vue').ComputedRef<{ id?: string } | null | undefined>} deps.currentLevel
 * @param {import('vue').Ref<import('../game/runMatchStats.js').RunMatchStats>} deps.runMatchStats
 * @param {import('vue').Ref<number>} deps.runDifficultyIndex
 * @param {import('vue').Ref<import('../game/runCollectionDiscoveries.js').RunDiscoveryLog>} deps.runDiscoveryLog
 * @param {import('vue').Ref<unknown[]>} deps.ownedTreasures
 * @param {import('vue').Ref<unknown[]>} deps.initialDeckSnapshot
 * @param {import('vue').Ref<number>} deps.remainingRemovals
 * @param {() => import('../treasures/treasureRunState.js').TreasureRunState} deps.getTreasureRunState
 * @param {(ctx: import('../achievements/achievementEvaluate.js').AchievementEvalContext) => import('../achievements/achievementTypes.js').AchievementDefinition[]} [deps.tryUnlockAchievements]
 */
export function useRunAchievementBridge(deps) {
  const tryUnlockAchievementsInject =
    deps.tryUnlockAchievements ?? inject("tryUnlockAchievements", null);
  const recordCollectionDiscovery = inject("recordCollectionDiscovery", null);
  const patchActiveSlotCareer = inject("patchActiveSlotCareer", null);
  const recordCollectionWordSubmit = inject("recordCollectionWordSubmit", null);

  const achievementRunState = ref(createAchievementRunState());

  /** @param {import('../achievements/achievementEvaluate.js').AchievementEvalContext} [overrides] */
  function buildAchievementEvalContext(overrides = {}) {
    const { maxLengthLevel, maxRarityLevel } = resolveMaxLengthAndRarityLevel(
      deps.lengthLevelsByLength.value,
      deps.rarityLevelsByRarity.value,
    );
    return {
      currentLevelId: deps.currentLevel.value?.id ?? "1-1",
      wallet: deps.money.value,
      ownedVoucherCount: (deps.ownedVoucherIds.value ?? []).length,
      maxLengthLevel,
      maxRarityLevel,
      runMatchStats: deps.runMatchStats.value,
      achievementRun: achievementRunState.value,
      runDifficultyIndex: deps.runDifficultyIndex.value,
      ...overrides,
    };
  }

  /** @param {import('../achievements/achievementEvaluate.js').AchievementEvalContext} [overrides] */
  function flushAchievementUnlocks(overrides = {}) {
    const unlockFn =
      tryUnlockAchievementsInject ??
      (import.meta.env?.DEV
        ? () => {
            console.warn("[achievement] tryUnlockAchievements 未注入，本局成就解锁被跳过");
            return [];
          }
        : () => []);
    unlockFn(buildAchievementEvalContext(overrides));
  }

  function noteRunMoneySpent(amount) {
    recordAchievementRunMoneySpent(achievementRunState.value, amount);
    flushAchievementUnlocks();
  }

  /**
   * @param {unknown[]} tiles
   * @param {Record<string, unknown>} detailed
   * @param {number} iceShatterCount
   */
  function buildSubmitAchievementSnapshot(tiles, detailed, iceShatterCount) {
    const list = Array.isArray(tiles) ? tiles : [];
    return {
      score: Math.round(Number(detailed.finalScore) || 0),
      wordLength: Math.max(
        0,
        Math.floor(Number(detailed.lengthTableLen ?? list.length) || list.length),
      ),
      allWildcard: list.length > 0 && list.every((t) => isWildcardMaterialTile(t)),
      iceShatterCount: Math.max(0, Math.floor(Number(iceShatterCount) || 0)),
      maxLetterScoreTriggers: computeMaxLetterScoreTriggers(detailed),
      steelEnhancementCount: countSteelGridPresenceEnhancements(detailed),
    };
  }

  function getFullDeckMultisetSize() {
    const snap = deps.initialDeckSnapshot.value;
    return Array.isArray(snap) ? snap.filter((c) => c && typeof c === "object").length : 0;
  }

  /** 字母库 multiset 永久增删后检查「大道至简 / 包罗万象」等成就 */
  function flushDeckMultisetAchievements() {
    flushAchievementUnlocks({ deckSize: getFullDeckMultisetSize() });
  }

  /** @param {unknown[]} tiles @param {Record<string, unknown>} detailed @param {number} iceShatterCount */
  function flushSubmitAchievements(tiles, detailed, iceShatterCount) {
    recordAchievementRunWordSubmitted(
      achievementRunState.value,
      deps.currentLevel.value?.id ?? "1-1",
    );
    recordAchievementRunLuckyTriggers(
      achievementRunState.value,
      countLuckyMaterialTriggers(detailed),
    );
    flushAchievementUnlocks({
      submit: buildSubmitAchievementSnapshot(tiles, detailed, iceShatterCount),
    });
  }

  /**
   * @param {{ treasureId?: string, spellId?: string, upgradeId?: string, voucherId?: string, materialId?: string, accessoryId?: string }} payload
   */
  function persistDiscoveryPayloadToCareer(payload) {
    if (recordCollectionDiscovery) {
      return recordCollectionDiscovery(payload) ?? false;
    }
    let wasNew = false;
    patchActiveSlotCareer?.((career) => {
      if (payload.treasureId) wasNew = recordTreasureDiscovered(career, payload.treasureId) || wasNew;
      if (payload.spellId) wasNew = recordSpellDiscovered(career, payload.spellId) || wasNew;
      if (payload.upgradeId) wasNew = recordUpgradeDiscovered(career, payload.upgradeId) || wasNew;
      if (payload.voucherId) wasNew = recordVoucherDiscovered(career, payload.voucherId) || wasNew;
      if (payload.materialId) wasNew = recordMaterialDiscovered(career, payload.materialId) || wasNew;
      if (payload.accessoryId) wasNew = recordAccessoryDiscovered(career, payload.accessoryId) || wasNew;
    });
    return wasNew;
  }

  function noteCollectionDiscovery(payload) {
    const wasNewCareer = persistDiscoveryPayloadToCareer(payload);
    const wasNewLog = appendRunDiscovery(deps.runDiscoveryLog.value, payload);
    if (wasNewCareer || wasNewLog) flushAchievementUnlocks();
  }

  /** @param {string} treasureId */
  function noteCollectionTreasureAcquired(treasureId) {
    const tid = String(treasureId ?? "").trim();
    if (!tid) return;
    noteCollectionDiscovery({ treasureId: tid });
    if (getTreasureDef(tid)?.rarity === "legendary") {
      flushAchievementUnlocks({ treasureAcquiredLegendary: true });
    }
  }

  function noteAchievementSafeBombBlast() {
    recordAchievementRunSafeBombBlast(achievementRunState.value);
    flushAchievementUnlocks();
  }

  function noteAchievementVolcanoEruption() {
    recordAchievementRunVolcanoEruption(achievementRunState.value);
    flushAchievementUnlocks();
  }

  /** @param {string} voucherId */
  function noteCollectionVoucherAcquired(voucherId) {
    const vid = String(voucherId ?? "").trim();
    if (!vid) return;
    noteCollectionDiscovery({ voucherId: vid });
  }

  /** @param {string} materialId */
  function noteCollectionMaterialAcquired(materialId) {
    const id = String(materialId ?? "").trim();
    if (!id) return;
    noteCollectionDiscovery({ materialId: id });
  }

  function noteCollectionUpgradeUsed(upgradeTreasureId) {
    const id = String(upgradeTreasureId ?? "").trim();
    if (!id) return;
    noteCollectionDiscovery({ upgradeId: id });
  }

  /** @param {{ kind: "rarity", rk: string } | { kind: "length", g: { key?: string } }} pick */
  function noteCollectionUpgradeFromRandomPick(pick) {
    const id = getUpgradeTreasureIdForRandomPick(pick);
    if (id) noteCollectionUpgradeUsed(id);
  }

  /** @param {number} len */
  function noteCollectionUpgradeForWordLen(len) {
    const id = getUpgradeTreasureIdForWordLen(len);
    if (id) noteCollectionUpgradeUsed(id);
  }

  function noteCollectionAllLengthUpgrades() {
    for (const g of UPGRADE_LENGTH_GROUPS) {
      noteCollectionUpgradeUsed(`upgrade_${g.key}`);
    }
  }

  function noteCollectionAllRarityUpgrades() {
    for (const rk of Object.keys(UPGRADE_RARITY_LETTER_LABEL)) {
      noteCollectionUpgradeUsed(getUpgradeTreasureIdForRarityKey(rk));
    }
  }

  /** @param {string} accessoryId */
  function noteCollectionAccessoryAcquired(accessoryId) {
    const id = String(accessoryId ?? "").trim();
    if (!id) return;
    noteCollectionDiscovery({ accessoryId: id });
  }

  /**
   * @param {{ materialId?: string | null, accessoryId?: string | null, treasureAccessoryId?: string | null } | null | undefined} entry
   */
  function noteCollectionDeckEntryModifiers(entry) {
    if (!entry) return;
    noteCollectionMaterialAcquired(entry.materialId);
    if (entry.accessoryId) noteCollectionAccessoryAcquired(entry.accessoryId);
    if (entry.treasureAccessoryId) noteCollectionAccessoryAcquired(entry.treasureAccessoryId);
  }

  /** @param {{ treasureAccessoryId?: string | null, treasureAccessoryIds?: string[] } | null | undefined} input */
  function noteCollectionTreasureSlotAccessories(input) {
    for (const id of readTreasureAccessoryIds(input ?? {})) {
      noteCollectionAccessoryAcquired(id);
    }
  }

  /** @param {{ word: string, score: number, length: number, tiles: unknown[] }} payload */
  function noteCollectionWordSubmitted(payload) {
    recordCollectionWordSubmit?.({
      ...payload,
      ownedTreasures: deps.ownedTreasures.value,
    });
  }

  function noteDiscardExhaustedForChapterUnlock() {
    if (deps.remainingRemovals.value > 0) return;
    const sub = parseLevelSubFromId(deps.currentLevel.value?.id ?? "1-1");
    const rs = deps.getTreasureRunState();
    if (!(rs.discardExhaustedSubsThisChapter instanceof Set)) {
      rs.discardExhaustedSubsThisChapter = new Set();
    }
    rs.discardExhaustedSubsThisChapter.add(sub);
    if (
      rs.discardExhaustedSubsThisChapter.has(1)
      && rs.discardExhaustedSubsThisChapter.has(2)
      && rs.discardExhaustedSubsThisChapter.has(3)
    ) {
      rs.chapterAllDiscardsExhausted = true;
    }
  }

  return {
    achievementRunState,
    flushAchievementUnlocks,
    flushDeckMultisetAchievements,
    flushSubmitAchievements,
    noteRunMoneySpent,
    noteCollectionDiscovery,
    noteCollectionTreasureAcquired,
    noteAchievementSafeBombBlast,
    noteAchievementVolcanoEruption,
    noteCollectionVoucherAcquired,
    noteCollectionMaterialAcquired,
    noteCollectionUpgradeUsed,
    noteCollectionUpgradeFromRandomPick,
    noteCollectionUpgradeForWordLen,
    noteCollectionAllLengthUpgrades,
    noteCollectionAllRarityUpgrades,
    noteCollectionAccessoryAcquired,
    noteCollectionDeckEntryModifiers,
    noteCollectionTreasureSlotAccessories,
    noteCollectionWordSubmitted,
    noteDiscardExhaustedForChapterUnlock,
  };
}
