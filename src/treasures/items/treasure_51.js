import { describe } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 4,
  rarity: "common",
  description: describe("如果你拼写的单词以tion结尾，随机释放一个法术"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onSuccessfulWordSubmit(ctx) {
    const word = String(ctx.resolvedWord ?? "").toLowerCase();
    if (!word.endsWith("tion")) return;
    const slotIx = ctx.findOwnedTreasureSlotIndex?.("51") ?? -1;
    await ctx.requestInRunSpellGrant?.({
      treasureId: "51",
      treasureSlotIndex: slotIx >= 0 ? slotIx : undefined,
    });
  },
};
