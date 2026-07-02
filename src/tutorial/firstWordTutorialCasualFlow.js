import { normalizeRunPresetId } from "../game/runPresetDefinitions.js";
import { CASUAL_EXPERIENCE_PRESET_ID } from "../profile/slotExperienceModePure.js";

/** @typedef {{ row: number, col: number, letter: string }} TutorialLetterPlacement */

/**
 * 首词 play 提交补牌后：在 play 原格位落下 g-a-m-e（casual 教程第二词）。
 * @type {readonly TutorialLetterPlacement[]}
 */
export const TUTORIAL_GAME_LETTER_PLACEMENTS = Object.freeze([
  { row: 0, col: 1, letter: "g" },
  { row: 2, col: 0, letter: "a" },
  { row: 1, col: 3, letter: "m" },
  { row: 3, col: 2, letter: "e" },
]);

/**
 * @param {import('../profile/slotExperienceModePure.js').SlotExperienceMode | null | undefined} experienceMode
 * @param {string | null | undefined} runPresetId
 */
export function resolveCasualTutorialExperience(experienceMode, runPresetId) {
  if (experienceMode === "casual") return true;
  if (experienceMode === "classic") return false;
  return normalizeRunPresetId(runPresetId) === CASUAL_EXPERIENCE_PRESET_ID;
}

/**
 * @param {string | null | undefined} tutorialPhase
 * @param {import('../profile/slotExperienceModePure.js').SlotExperienceMode | null | undefined} experienceMode
 * @param {string | null | undefined} [runPresetId]
 */
export function shouldApplyTutorialGameRefillAfterPlay(tutorialPhase, experienceMode, runPresetId) {
  return (
    tutorialPhase === "scoring" && resolveCasualTutorialExperience(experienceMode, runPresetId)
  );
}

/**
 * casual 教程 retryHint：允许拼词区行内释义（classic 仍等教程结束）。
 * @param {string | null | undefined} tutorialPhase
 * @param {import('../profile/slotExperienceModePure.js').SlotExperienceMode | null | undefined} experienceMode
 * @param {string | null | undefined} [runPresetId]
 */
export function shouldShowWordDefinitionDuringTutorial(tutorialPhase, experienceMode, runPresetId) {
  return (
    tutorialPhase === "retryHint" && resolveCasualTutorialExperience(experienceMode, runPresetId)
  );
}

/** @returns {{ word: string, path: { row: number, col: number }[] }} */
export function buildTutorialGameHintPick() {
  return {
    word: "game",
    path: TUTORIAL_GAME_LETTER_PLACEMENTS.map(({ row, col }) => ({ row, col })),
  };
}
