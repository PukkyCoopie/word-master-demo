import { describe, money } from "../treasureDescription.js";
import { wobbleTreasureHookContributor } from "../treasureBankHelpers.js";

const ID = "133";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "rare",
  description: describe("每个关卡完成时，使你其他宝藏的售价增加", money("1")),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onLevelComplete(ctx) {
    const slotIds = ctx.ownedSlotTreasureIds ?? [];
    for (let i = 0; i < slotIds.length; i += 1) {
      const tid = String(slotIds[i] ?? "");
      if (!tid || tid === ID) continue;
      ctx.bumpOwnedTreasureSellRefundBonusAtSlot?.(i, 1);
    }
    await wobbleTreasureHookContributor(ctx, ID);
  },
};
