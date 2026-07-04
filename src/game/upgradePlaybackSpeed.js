/** 升级各环节之间的节拍（较旧版略紧凑） */
export const UPGRADE_STEP_GAP_MS = 160;
export const UPGRADE_FIRST_LEAD_IN_GAP_MS = 120;
export const UPGRADE_VALUE_TWEEN_S = 0.46;
export const UPGRADE_FINAL_HOLD_MS = 380;
export const UPGRADE_SEQUENCE_GAP_MS = 24;
export const UPGRADE_SWITCH_GAP_MS = 50;
export const UPGRADE_SWITCH_SETTLE_MS = 150;
export const UPGRADE_WOBBLE_BUBBLE_MS = 120;
export const UPGRADE_FIRST_RARITY_INTRO_MS = 96;
/** 格子上「升级」气泡后、顶栏升级动效前的短休 */
export const UPGRADE_ACCESSORY_CUE_DELAY_MS = 240;

/** @type {number} 本词计分 timeline 末拍速度快照（供 post-score 升级继承） */
let submitScoringBeatSpeedSnapshot = 1;

/** @param {number} speed */
export function setSubmitScoringBeatSpeedSnapshot(speed) {
  submitScoringBeatSpeedSnapshot = Math.max(0.01, Number(speed) || 1);
}

export function resetSubmitScoringBeatSpeedSnapshot() {
  submitScoringBeatSpeedSnapshot = 1;
}

/**
 * 计分 timeline 额外速度的 50% 叠加到升级局部倍率（1× 基线 + 50%×(timeline−1)）。
 * @param {number} [scoringBeatSpeed]
 * @returns {number}
 */
export function resolveScoringTriggeredUpgradeLocalSpeed(scoringBeatSpeed = submitScoringBeatSpeedSnapshot) {
  const s = Math.max(0.01, Number(scoringBeatSpeed) || 1);
  return 1 + Math.max(0, s - 1) * 0.5;
}

/** 当前提交计分流程触发的升级局部倍率（含 timeline 继承，不含用户动画速度档）。 */
export function getSubmitScoringTriggeredUpgradeLocalSpeed() {
  return resolveScoringTriggeredUpgradeLocalSpeed(submitScoringBeatSpeedSnapshot);
}
