import { describe, money } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 4,
  rarity: "common",
  description: describe("如果你拼写单词后的余额少于", money("8"), "，随机释放一个法术"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onSuccessfulWordSubmit(ctx) {
    const bal = Math.floor(Number(ctx.moneyAfterSubmit) || 0);
    if (bal >= 8) return;
    const slotIx = ctx.findOwnedTreasureSlotIndex?.("56") ?? -1;
    await ctx.requestInRunSpellGrant?.({
      treasureId: "56",
      treasureSlotIndex: slotIx >= 0 ? slotIx : undefined,
    });
  },
};
