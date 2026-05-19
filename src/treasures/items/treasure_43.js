import { describe, mult, rarity } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  description: describe("如果棋盘中剩下的都是", rarity("普通"), "或", rarity("稀有"), "字母，", mult("x3"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep(ctx) {
    const tiles = ctx.remainingGridTiles ?? [];
    if (!tiles.length) return null;
    const ok = tiles.every((t) => {
      const r = String(t?.rarity ?? "common");
      return r === "common" || r === "rare";
    });
    return ok ? { multMul: 3 } : null;
  },
};
