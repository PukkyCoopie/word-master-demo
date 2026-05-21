import { describe } from "../treasureDescription.js";

const ID = "117";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 0,
  rarity: "legendary",
  shopEligible: false,
  description: describe("在离开商店时，重复你释放的上一个法术卡"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onShopLeave(ctx) {
    if (!(ctx.ownedSlotTreasureIds ?? []).includes(ID)) return;
    const sid = String(ctx.treasureRun?.lastSpellIdBeforeShopLeave ?? "").trim();
    if (!sid || sid === "restart" || sid === "dice") return;
    await ctx.replayLastSpellInRun?.(sid);
  },
};
