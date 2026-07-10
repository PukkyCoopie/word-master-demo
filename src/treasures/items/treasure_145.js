import { describe, handDelta } from "../treasureDescription.js";
import { normalizeLetterChar } from "../treasureLifecycleShared.js";

export const TREASURE_145_ID = "145";
export const BOW_ARROW_XYZ_LETTERS = new Set(["x", "y", "z"]);
export const BOW_ARROW_LENGTH_BONUS_PER_LETTER = 3;
export const BOW_ARROW_REPLAY_COUNT = 3;

/** @param {string | null | undefined} letter */
export function isBowArrowXyzLetter(letter) {
  return BOW_ARROW_XYZ_LETTERS.has(normalizeLetterChar(letter));
}

/**
 * 计 XYZ 个数：优先整词解析结果（嘴邻位 / 万能变形后的拼写词），无解析时再回退 tile 字母。
 * @param {import('../treasureTypes.js').TreasureLogicContext} ctx
 */
export function countBowArrowXyzLetters(ctx) {
  const word = String(ctx.resolvedWord ?? "").toLowerCase();
  if (word) {
    let n = 0;
    for (const ch of word) {
      if (BOW_ARROW_XYZ_LETTERS.has(ch)) n += 1;
    }
    return n;
  }
  const tiles = ctx.tiles;
  if (Array.isArray(tiles) && tiles.length > 0) {
    let n = 0;
    for (const t of tiles) {
      if (isBowArrowXyzLetter(t?.letter)) n += 1;
    }
    return n;
  }
  return 0;
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 10,
  rarity: "legendary",
  shopEligible: false,
  description: describe(
    "每个拼写的 X, Y, Z 提供",
    handDelta("+3"),
    "长度，且额外触发3次计分",
  ),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  getSubmitScoringWordLetterCountBonus(ctx) {
    return countBowArrowXyzLetters(ctx) * BOW_ARROW_LENGTH_BONUS_PER_LETTER;
  },
  getLetterReplayCountForLetter(_ctx, part) {
    return isBowArrowXyzLetter(part?.letter) ? BOW_ARROW_REPLAY_COUNT : 0;
  },
};
