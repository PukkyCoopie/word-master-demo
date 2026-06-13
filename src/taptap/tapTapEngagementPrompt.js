import { normalizeRunDifficultyIndex } from "../game/runDifficultyDefinitions.js";

/** 自动弹窗对应的难度 index（「难度1」） */
export const TAP_TAP_ENGAGEMENT_AUTO_DIFFICULTY_INDEX = 1;

/** 回到主菜单后延迟弹出（毫秒） */
export const TAP_TAP_ENGAGEMENT_AUTO_DELAY_MS = 500;

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats | null | undefined} career
 */
export function isTapTapEngagementPromptHandled(career) {
  return career?.tapTapEngagementPromptHandled === true;
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats | null | undefined} career
 */
export function isTapTapEngagementAutoPending(career) {
  return career?.tapTapEngagementAutoPending === true;
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats | null | undefined} career
 * @param {'win' | 'fail'} outcome
 * @param {number | string | null | undefined} difficultyIndex
 */
export function shouldMarkTapTapEngagementAutoPending(career, outcome, difficultyIndex) {
  if (outcome !== "win") return false;
  if (normalizeRunDifficultyIndex(difficultyIndex) !== TAP_TAP_ENGAGEMENT_AUTO_DIFFICULTY_INDEX) {
    return false;
  }
  return !isTapTapEngagementPromptHandled(career);
}

/** @param {import('../save/runSaveSchema.js').SlotCareerStats} career */
export function markTapTapEngagementAutoPending(career) {
  career.tapTapEngagementAutoPending = true;
}

/** @param {import('../save/runSaveSchema.js').SlotCareerStats} career */
export function clearTapTapEngagementAutoPending(career) {
  career.tapTapEngagementAutoPending = false;
}

/** @param {import('../save/runSaveSchema.js').SlotCareerStats} career */
export function markTapTapEngagementPromptHandled(career) {
  career.tapTapEngagementPromptHandled = true;
  career.tapTapEngagementAutoPending = false;
}
