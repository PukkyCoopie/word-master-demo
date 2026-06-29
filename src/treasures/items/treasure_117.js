import { describe } from "../treasureDescription.js";

const ID = "117";

/** @param {string | null | undefined} spellId */
function resolveCdReplaySpellId(spellId) {
  const sid = String(spellId ?? "").trim();
  if (!sid || sid === "restart" || sid === "dice") return null;
  return sid;
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 10,
  rarity: "legendary",
  shopEligible: false,
  description: describe("在离开商店时，重复你释放的上一个法术卡"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  getOwnedDetailSpellReplayTargetId(ctx) {
    return resolveCdReplaySpellId(ctx.treasureRun?.lastSpellIdBeforeShopLeave);
  },

  async onShopLeave(ctx) {
    if (!(ctx.ownedSlotTreasureIds ?? []).includes(ID)) return;
    const sid = resolveCdReplaySpellId(ctx.treasureRun?.lastSpellIdBeforeShopLeave);
    if (!sid) return;
    const slotIndex = typeof ctx.hookSlotIndex === "number" ? ctx.hookSlotIndex : undefined;
    await ctx.replayLastSpellInRun?.(sid, { treasureSlotIndex: slotIndex });
  },
};
