import test from "node:test";
import assert from "node:assert/strict";
import { ACHIEVEMENT_DEFINITIONS } from "./achievementDefinitions.js";
import { evaluateAndUnlockAchievements } from "./achievementEvaluate.js";
import { normalizeSlotCareerStats } from "../save/slotCareerStats.js";
import { createAchievementRunState } from "./achievementRunState.js";
import { createRunMatchStats } from "../game/runMatchStats.js";
import { getLevelIndexForId } from "./achievementCareer.js";
import { LEVELS } from "../levelDefinitions.js";
import { TREASURE_CATALOG } from "../treasures/treasureCatalog.js";
import { SPELL_DEFINITIONS } from "../spells/spellDefinitions.js";
import { COLLECTION_UPGRADE_TREASURE_IDS } from "../collection/collectionUpgradeCatalog.js";
import { VOUCHER_PAIR_ORDER } from "../vouchers/voucherDefinitions.js";
import { COLLECTION_MATERIAL_DISPLAY_ORDER } from "../collection/collectionMaterialRichDesc.js";
import { ACCESSORY_CATALOG } from "../accessories/accessoryCatalog.js";

/** @param {import('./achievementTypes.js').AchievementDefinition} def */
function careerWithFullCollectionTab(def) {
  const career = normalizeSlotCareerStats({});
  const c = def.condition;
  switch (c.kind) {
    case "discover_all_treasures":
      career.discoveredTreasureIds = TREASURE_CATALOG.map((t) => t.treasureId);
      break;
    case "discover_all_spells":
      career.discoveredSpellIds = SPELL_DEFINITIONS.map((s) => s.id).filter(Boolean);
      break;
    case "discover_all_upgrades":
      career.discoveredUpgradeIds = [...COLLECTION_UPGRADE_TREASURE_IDS];
      break;
    case "discover_all_vouchers": {
      /** @type {Record<string, number>} */
      const tiers = {};
      for (const pairId of VOUCHER_PAIR_ORDER.keys()) tiers[pairId] = 2;
      career.discoveredVoucherTiers = tiers;
      break;
    }
    case "discover_all_materials":
      career.discoveredMaterialIds = [...COLLECTION_MATERIAL_DISPLAY_ORDER];
      break;
    case "discover_all_accessories":
      career.discoveredAccessoryIds = Object.keys(ACCESSORY_CATALOG);
      break;
    default:
      break;
  }
  return career;
}

/** @param {import('./achievementTypes.js').AchievementDefinition} def */
function buildUnlockFixture(def) {
  const c = def.condition;
  const career = normalizeSlotCareerStats({});
  /** @type {import('./achievementEvaluate.js').AchievementEvalContext} */
  const ctx = {
    achievementRun: createAchievementRunState(),
    runMatchStats: createRunMatchStats(),
  };

  switch (c.kind) {
    case "career_level_reached": {
      career.maxLevelIndexReached = getLevelIndexForId(c.levelId ?? "");
      break;
    }
    case "career_words":
      career.totalWordsSubmitted = c.threshold ?? 0;
      break;
    case "career_tiles_used":
      career.totalLettersUsed = c.threshold ?? 0;
      break;
    case "career_tiles_discarded":
      career.totalLettersDiscarded = c.threshold ?? 0;
      break;
    case "career_wallet_peak":
      career.peakWalletAmount = c.threshold ?? 0;
      break;
    case "submit_all_wildcard":
      ctx.submit = { allWildcard: true };
      break;
    case "run_win":
      ctx.runWon = true;
      break;
    case "run_one_word_per_level_win": {
      ctx.runWon = true;
      const completedLevelIds = LEVELS.slice(0, 3).map((l) => l.id);
      for (const levelId of completedLevelIds) {
        ctx.achievementRun.wordsPerLevelId[levelId] = 1;
      }
      ctx.runMatchStats.wordsSubmitted = completedLevelIds.length;
      ctx.completedLevelIds = completedLevelIds;
      break;
    }
    case "run_no_discard_win":
      ctx.runWon = true;
      break;
    case "run_no_reroll_win":
      ctx.runWon = true;
      break;
    case "submit_double_ice":
      ctx.submit = { iceShatterCount: 2 };
      break;
    case "level_vouchers":
      ctx.currentLevelId = c.levelId ?? "";
      ctx.ownedVoucherCount = c.voucherCount ?? 0;
      break;
    case "max_length_level":
      ctx.maxLengthLevel = c.threshold ?? 0;
      break;
    case "max_rarity_level":
      ctx.maxRarityLevel = c.threshold ?? 0;
      break;
    case "submit_score":
      ctx.submit = { score: c.threshold ?? 0 };
      break;
    case "submit_word_length":
      ctx.submit = {
        wordLength: c.exactLength ? (c.threshold ?? 0) : (c.threshold ?? 0),
      };
      break;
    case "deck_size":
      ctx.deckSize = c.exactLength === false ? (c.threshold ?? 0) : (c.threshold ?? 0);
      break;
    case "discover_all_treasures":
      return { career: careerWithFullCollectionTab(def), ctx };
    case "discover_all_spells":
      return { career: careerWithFullCollectionTab(def), ctx };
    case "discover_all_upgrades":
      return { career: careerWithFullCollectionTab(def), ctx };
    case "discover_all_vouchers":
      return { career: careerWithFullCollectionTab(def), ctx };
    case "discover_all_materials":
      return { career: careerWithFullCollectionTab(def), ctx };
    case "discover_all_accessories":
      return { career: careerWithFullCollectionTab(def), ctx };
    case "run_difficulty_win":
      ctx.runWon = true;
      ctx.runDifficultyIndex = c.difficultyIndex ?? 0;
      break;
    case "submit_letter_score_triggers":
      ctx.submit = { maxLetterScoreTriggers: c.threshold ?? 0 };
      break;
    case "run_interest_total":
      ctx.achievementRun.interestEarnedTotal = c.threshold ?? 0;
      break;
    case "run_money_spent":
      ctx.achievementRun.moneySpentTotal = c.threshold ?? 0;
      break;
    case "event_safe_bomb_blast":
      ctx.achievementRun.safeBombBlastOccurred = true;
      break;
    case "event_volcano_eruption":
      ctx.achievementRun.volcanoEruptionOccurred = true;
      break;
    case "run_lucky_triggers":
      ctx.achievementRun.luckyTriggersTotal = c.threshold ?? 0;
      break;
    case "submit_steel_enhancements":
      ctx.submit = { steelEnhancementCount: c.threshold ?? 0 };
      break;
    case "acquire_legendary_treasure":
      ctx.treasureAcquiredLegendary = true;
      break;
    default:
      assert.fail(`missing audit fixture for ${def.id} (${c.kind})`);
  }

  return { career, ctx };
}

for (const def of ACHIEVEMENT_DEFINITIONS) {
  test(`achievement unlock audit: ${def.id}`, () => {
    const { career, ctx } = buildUnlockFixture(def);
    const unlocked = evaluateAndUnlockAchievements(career, ctx);
    assert.ok(
      unlocked.some((d) => d.id === def.id),
      `expected ${def.id} to unlock with fixture`,
    );
    assert.ok(
      career.unlockedAchievementIds.includes(def.id),
      `expected ${def.id} in career.unlockedAchievementIds`,
    );
  });
}

test("career reconcile unlocks persisted counters without run context", () => {
  const career = normalizeSlotCareerStats({
    totalWordsSubmitted: 50,
    maxLevelIndexReached: getLevelIndexForId("4-1"),
    peakWalletAmount: 400,
  });
  const unlocked = evaluateAndUnlockAchievements(career, {});
  const ids = unlocked.map((d) => d.id);
  assert.ok(ids.includes("words_50"));
  assert.ok(ids.includes("reach_4_1"));
  assert.ok(ids.includes("wallet_400"));
});
