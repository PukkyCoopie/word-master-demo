/** 传说宝藏 116：整局内 Boss 软限制与格级能力失效；136 钥匙：仅当前小关 */

export const BOSS_SUPPRESS_TREASURE_ID = "116";

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds @param {import('../treasures/treasureRunState.js').TreasureRunState | null | undefined} [treasureRun] */
export function isBossEffectsSuppressedByTreasures(ownedSlotTreasureIds, treasureRun) {
  if (treasureRun?.levelBossRestrictionSuppressed === true) return true;
  return (ownedSlotTreasureIds ?? []).some((id) => id === BOSS_SUPPRESS_TREASURE_ID);
}

/** @param {string | null | undefined} slug @param {(string | null | undefined)[]} ownedSlotTreasureIds @param {import('../treasures/treasureRunState.js').TreasureRunState | null | undefined} [treasureRun] */
export function resolveBossSlugForMechanics(slug, ownedSlotTreasureIds, treasureRun) {
  if (isBossEffectsSuppressedByTreasures(ownedSlotTreasureIds, treasureRun)) return "";
  return String(slug ?? "");
}
