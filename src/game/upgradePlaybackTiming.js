import { animSleep } from "../settings/animationSpeed.js";

export {
  UPGRADE_ACCESSORY_CUE_DELAY_MS,
  UPGRADE_FINAL_HOLD_MS,
  UPGRADE_FIRST_LEAD_IN_GAP_MS,
  UPGRADE_FIRST_RARITY_INTRO_MS,
  UPGRADE_SEQUENCE_GAP_MS,
  UPGRADE_STEP_GAP_MS,
  UPGRADE_SWITCH_GAP_MS,
  UPGRADE_SWITCH_SETTLE_MS,
  UPGRADE_VALUE_TWEEN_S,
  UPGRADE_WOBBLE_BUBBLE_MS,
  getSubmitScoringTriggeredUpgradeLocalSpeed,
  resetSubmitScoringBeatSpeedSnapshot,
  resolveScoringTriggeredUpgradeLocalSpeed,
  setSubmitScoringBeatSpeedSnapshot,
} from "./upgradePlaybackSpeed.js";

/**
 * @param {number} ms
 * @param {number} [localSpeed]
 * @returns {Promise<void>}
 */
export function upgradeAnimSleep(ms, localSpeed = 1) {
  return animSleep(ms, localSpeed);
}
