import { describe, money } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  description: describe(
    "如果每关拼写的第一个单词只有3个字母，从牌库中移除这3个字母并获得",
    money("3"),
  ),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  onSuccessfulWordSubmit(ctx) {
    const rs = ctx.treasureRun;
    if (!rs || rs.levelFirstWordSubmitted) return;
    rs.levelFirstWordSubmitted = true;
    const len = Math.max(0, Math.round(Number(ctx.judgedWordLength) || 0));
    rs.levelFirstWordLength = len;
    if (len !== 3) return;
    const tiles = ctx.submittedScoringTiles;
    if (!Array.isArray(tiles) || tiles.length !== 3) return;
    const raws = tiles.map((t) => String(t?.letter ?? "").toLowerCase()).filter(Boolean);
    if (raws.length !== 3) return;
    ctx.removeDeckLettersByRaws?.(raws);
    ctx.addMoney?.(3);
  },
};
