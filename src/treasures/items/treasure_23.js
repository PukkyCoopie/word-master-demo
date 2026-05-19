import { getRarityBonusForRarity } from "../../composables/useScoring.js";
import { describe } from "../treasureDescription.js";
import { highestRarityAmongTiles } from "../treasureLogicShared.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "common",
  description: describe("会将棋盘中最高的稀有度对应的奖励分数添加至倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep(ctx) {
    const tiles = ctx.gridTiles ?? [];
    if (!tiles.length) return null;
    const best = highestRarityAmongTiles(tiles);
    const bonus = getRarityBonusForRarity(best, ctx.rarityLevelsByRarity ?? null);
    return bonus > 0 ? { multAdd: bonus } : null;
  },
};
