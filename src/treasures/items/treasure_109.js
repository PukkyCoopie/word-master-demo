import { describe } from "../treasureDescription.js";
import { resolveTreasureHookAnimSlotIndex } from "../../game/treasureBlueprintMirror.js";

const ID = "109";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  unlockPrerequisite: { type: "runSpellsCastMin", min: 5 },
  description: describe("每当进入关卡时，随机释放一个法术"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onLevelEnter(ctx) {
    const slotIx = resolveTreasureHookAnimSlotIndex(ctx) ?? ctx.findOwnedTreasureSlotIndex?.(ID) ?? -1;
    await ctx.requestInRunSpellGrant?.({
      treasureId: ID,
      treasureSlotIndex: slotIx >= 0 ? slotIx : undefined,
    });
  },
};
