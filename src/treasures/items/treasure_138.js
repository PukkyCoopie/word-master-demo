import { describe, mult, rarity } from "../treasureDescription.js";
import { getTreasureDef } from "../treasureRegistry.js";

export const TROPHY_TREASURE_ID = "138";

const ID = TROPHY_TREASURE_ID;

/** @type {Readonly<Record<string, number>>} */
const MULT_BY_RARITY = Object.freeze({
  epic: 1.5,
  legendary: 2,
});

/** @param {string | null | undefined} rarityKey */
function trophyBoostMultForRarityKey(rarityKey) {
  const m = MULT_BY_RARITY[String(rarityKey ?? "").trim()];
  return m && m > 1 ? m : null;
}

/** @param {string} treasureId */
export function trophyBoostMultForOwnedTreasureId(treasureId) {
  const tid = String(treasureId ?? "").trim();
  if (!tid || tid === ID) return null;
  return trophyBoostMultForRarityKey(getTreasureDef(tid)?.rarity ?? "common");
}

/** @param {(string | null | undefined)[]} slots */
export function ownedHasTrophyInSlots(slots) {
  return (slots ?? []).some((raw) => String(raw ?? "").trim() === ID);
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 8,
  rarity: "epic",
  description: describe(
    "你的其他",
    rarity("史诗"),
    "和",
    rarity("传说"),
    "宝藏分别提供",
    mult("x1.5"),
    "/",
    mult("x2"),
    "倍率",
  ),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {};
