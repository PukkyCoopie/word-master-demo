import { getCollectionTabProgress } from "../collection/collectionProgress.js";
import { getLevelIndexForId, isAchievementUnlocked, unlockAchievementId } from "./achievementCareer.js";
import { ACHIEVEMENT_DEFINITIONS } from "./achievementDefinitions.js";
import { checkOneWordPerLevelWin } from "./achievementRunState.js";

/**
 * @typedef {Object} AchievementSubmitSnapshot
 * @property {number} [score]
 * @property {number} [wordLength]
 * @property {boolean} [allWildcard]
 * @property {number} [iceShatterCount]
 * @property {number} [maxLetterScoreTriggers]
 */

/**
 * @typedef {Object} AchievementEvalContext
 * @property {boolean} [runWon]
 * @property {number} [runDifficultyIndex]
 * @property {string} [currentLevelId]
 * @property {number} [wallet]
 * @property {number} [ownedVoucherCount]
 * @property {number} [maxLengthLevel]
 * @property {number} [maxRarityLevel]
 * @property {number} [deckSize] 完整牌库 multiset 张数；仅在永久增删牌张后传入
 * @property {import('../game/runMatchStats.js').RunMatchStats} [runMatchStats]
 * @property {import('./achievementRunState.js').AchievementRunState} [achievementRun]
 * @property {readonly string[]} [completedLevelIds]
 * @property {AchievementSubmitSnapshot} [submit]
 */

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @param {import('./achievementTypes.js').AchievementDefinition} def
 * @param {AchievementEvalContext} ctx
 */
function isConditionMet(career, def, ctx) {
  const c = def.condition;
  switch (c.kind) {
    case "career_level_reached": {
      const need = getLevelIndexForId(c.levelId ?? "");
      return need >= 0 && (career.maxLevelIndexReached ?? -1) >= need;
    }
    case "career_words":
      return (
        (career.totalWordsSubmitted ?? 0) + (ctx.runMatchStats?.wordsSubmitted ?? 0) >= (c.threshold ?? 0)
      );
    case "career_tiles_used":
      return (
        (career.totalLettersUsed ?? 0) + (ctx.runMatchStats?.lettersUsed ?? 0) >= (c.threshold ?? 0)
      );
    case "career_tiles_discarded":
      return (
        (career.totalLettersDiscarded ?? 0) + (ctx.runMatchStats?.lettersDiscarded ?? 0) >=
        (c.threshold ?? 0)
      );
    case "career_wallet_peak": {
      const peak = Math.max(career.peakWalletAmount ?? 0, ctx.wallet ?? 0);
      return peak >= (c.threshold ?? 0);
    }
    case "submit_all_wildcard":
      return ctx.submit?.allWildcard === true;
    case "run_win":
      return ctx.runWon === true;
    case "run_one_word_per_level_win":
      return (
        ctx.runWon === true &&
        !!ctx.achievementRun &&
        !!ctx.completedLevelIds?.length &&
        !!ctx.runMatchStats &&
        checkOneWordPerLevelWin(ctx.achievementRun, ctx.runMatchStats, ctx.completedLevelIds)
      );
    case "run_no_discard_win":
      return ctx.runWon === true && (ctx.achievementRun?.discardUsesCount ?? 0) === 0;
    case "run_no_reroll_win":
      return ctx.runWon === true && (ctx.runMatchStats?.rerolls ?? 0) === 0;
    case "submit_double_ice":
      return (ctx.submit?.iceShatterCount ?? 0) >= 2;
    case "level_vouchers":
      return (
        String(ctx.currentLevelId ?? "") === String(c.levelId ?? "") &&
        (ctx.ownedVoucherCount ?? 0) >= (c.voucherCount ?? 0)
      );
    case "max_length_level":
      return (ctx.maxLengthLevel ?? 0) >= (c.threshold ?? 0);
    case "max_rarity_level":
      return (ctx.maxRarityLevel ?? 0) >= (c.threshold ?? 0);
    case "submit_score":
      return (ctx.submit?.score ?? 0) >= (c.threshold ?? 0);
    case "submit_word_length": {
      const len = ctx.submit?.wordLength ?? 0;
      if (c.exactLength) return len === (c.threshold ?? 0);
      return len >= (c.threshold ?? 0);
    }
    case "deck_size": {
      const size = ctx.deckSize ?? 0;
      if (size <= 0) return false;
      if (c.exactLength === false) return size <= (c.threshold ?? 0);
      return size >= (c.threshold ?? 0);
    }
    case "discover_all_treasures": {
      const p = getCollectionTabProgress(career, "treasures");
      return !!p && p.total > 0 && p.unlocked >= p.total;
    }
    case "discover_all_spells": {
      const p = getCollectionTabProgress(career, "spells");
      return !!p && p.total > 0 && p.unlocked >= p.total;
    }
    case "discover_all_upgrades": {
      const p = getCollectionTabProgress(career, "upgrades");
      return !!p && p.total > 0 && p.unlocked >= p.total;
    }
    case "discover_all_vouchers": {
      const p = getCollectionTabProgress(career, "vouchers");
      return !!p && p.total > 0 && p.unlocked >= p.total;
    }
    case "discover_all_materials": {
      const p = getCollectionTabProgress(career, "materials");
      return !!p && p.total > 0 && p.unlocked >= p.total;
    }
    case "discover_all_accessories": {
      const p = getCollectionTabProgress(career, "accessories");
      return !!p && p.total > 0 && p.unlocked >= p.total;
    }
    case "run_difficulty_win":
      return ctx.runWon === true && (ctx.runDifficultyIndex ?? 0) === (c.difficultyIndex ?? 0);
    case "submit_letter_score_triggers":
      return (ctx.submit?.maxLetterScoreTriggers ?? 0) >= (c.threshold ?? 0);
    case "run_interest_total":
      return (ctx.achievementRun?.interestEarnedTotal ?? 0) >= (c.threshold ?? 0);
    case "run_money_spent":
      return (ctx.achievementRun?.moneySpentTotal ?? 0) >= (c.threshold ?? 0);
    default:
      return false;
  }
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @param {AchievementEvalContext} ctx
 * @returns {import('./achievementTypes.js').AchievementDefinition[]}
 */
export function evaluateAndUnlockAchievements(career, ctx) {
  /** @type {import('./achievementTypes.js').AchievementDefinition[]} */
  const newly = [];
  for (const def of ACHIEVEMENT_DEFINITIONS) {
    if (isAchievementUnlocked(career, def.id)) continue;
    if (!isConditionMet(career, def, ctx)) continue;
    if (unlockAchievementId(career, def.id)) newly.push(def);
  }
  return newly;
}

/** @param {Record<string, number>} lengthLevels @param {Record<string, number>} rarityLevels */
export function resolveMaxLengthAndRarityLevel(lengthLevels, rarityLevels) {
  let maxLen = 0;
  for (const v of Object.values(lengthLevels ?? {})) {
    maxLen = Math.max(maxLen, Math.max(0, Math.floor(Number(v) || 0)));
  }
  let maxRar = 0;
  for (const v of Object.values(rarityLevels ?? {})) {
    maxRar = Math.max(maxRar, Math.max(0, Math.floor(Number(v) || 0)));
  }
  return { maxLengthLevel: maxLen, maxRarityLevel: maxRar };
}
