/** 传说宝藏 116：整局内 Boss 软限制与格级能力失效 */

export const BOSS_SUPPRESS_TREASURE_ID = "116";

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds */
export function isBossEffectsSuppressedByTreasures(ownedSlotTreasureIds) {
  return (ownedSlotTreasureIds ?? []).some((id) => id === BOSS_SUPPRESS_TREASURE_ID);
}

/** @param {string | null | undefined} slug @param {(string | null | undefined)[]} ownedSlotTreasureIds */
export function resolveBossSlugForMechanics(slug, ownedSlotTreasureIds) {
  if (isBossEffectsSuppressedByTreasures(ownedSlotTreasureIds)) return "";
  return String(slug ?? "");
}
