import { describe } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "common",
  description: describe("提高分数和倍率，数值等同于当前长度在本轮游戏内被拼出的次数"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  collectPostLetterSteps(ctx) {
    const len = Math.max(0, Number(ctx.lengthTableLen ?? ctx.tiles?.length) || 0);
    if (len <= 0) return null;
    const byLen = ctx.spellCountsByLength ?? {};
    const spelledBefore = Math.max(0, Number(byLen[String(len)]) || 0);
    const gain = spelledBefore + 1;
    if (gain <= 0) return null;
    return [{ scoreAdd: gain }, { multAdd: gain }];
  },
};
