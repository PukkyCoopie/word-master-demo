import { describe } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "rare",
  description: describe("将每种长度的单词在本轮游戏内被拼写过的次数添加至倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep(ctx) {
    const len = Math.max(0, Number(ctx.tiles?.length) || 0);
    if (len <= 0) return null;
    const byLen = ctx.spellCountsByLength ?? {};
    const spelledBefore = Math.max(0, Number(byLen[String(len)]) || 0);
    // 结算时尚未 record 当前词长度，这里补上本次提交。
    return { multAdd: spelledBefore + 1 };
  },
};
