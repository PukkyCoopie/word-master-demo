import { describe, money } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 4,
  rarity: "common",
  description: describe("在关卡完成时，如果你没有使用过丢弃，则每个丢弃次数会给予你", money("2")),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  onLevelComplete(ctx) {
    const rs = ctx.treasureRun;
    if (!rs || rs.levelDiscardsUsed) return;
    const remaining = Math.max(0, Math.floor(Number(ctx.remainingRemovals) || 0));
    if (remaining <= 0) return;
    ctx.addMoney?.(remaining * 2);
  },
};
