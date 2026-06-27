import { describe } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "common",
  description: describe("关卡开始时，将你的所有丢弃次数转化为拼写次数"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  adjustLevelStartActionCounts(ctx) {
    const rem = Math.max(0, Math.floor(Number(ctx.removals) || 0));
    if (rem <= 0) return null;
    return {
      hands: Math.max(0, Math.floor(Number(ctx.hands) || 0)) + rem,
      removals: 0,
    };
  },
};
