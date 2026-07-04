import { concept, describe } from "../treasureDescription.js";
import { wobbleTreasureHookContributor } from "../treasureBankHelpers.js";

const ID = "110";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 8,
  rarity: "rare",
  unlockPrerequisite: { type: "runUpgradesUsedMin", min: 5 },
  description: describe("商店中的", concept("升级"), "卡和升级包免费"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onShopEnter(ctx) {
    if (!ctx.treasureRun) return;
    ctx.treasureRun.shopUpgradesFree = (ctx.ownedSlotTreasureIds ?? []).includes(ID);
    if (!ctx.treasureRun.shopUpgradesFree) return;
    await wobbleTreasureHookContributor(ctx, ID);
  },
};
