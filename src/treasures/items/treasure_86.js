import { describe, mult } from "../treasureDescription.js";
import { bankMultMulGain, getMultMulBank, patchCurrentBankDescription } from "../treasureBankHelpers.js";

const ID = "86";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 7,
  rarity: "rare",
  description: describe("每当进入关卡时，随机摧毁一个其他宝藏以获得", mult("x0.5"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  ...patchCurrentBankDescription(ID, "multMul"),
  buildPostLetterStep(ctx) {
    const m = getMultMulBank(ctx.treasureRun, ID, ctx);
    return m > 1 ? { multMul: m } : null;
  },
  async onLevelEnter(ctx) {
    const rng = ctx.rng ?? Math.random;
    const owned = ctx.ownedSlotTreasureIds ?? [];
    const sourceIx =
      typeof ctx.slotIndex === "number" && Number.isFinite(ctx.slotIndex)
        ? Math.floor(ctx.slotIndex)
        : -1;
    /** @type {number[]} */
    const candidates = [];
    for (let i = 0; i < owned.length; i += 1) {
      const tid = owned[i];
      if (!tid) continue;
      if (i === sourceIx) continue;
      if (ctx.isOwnedTreasureSlotNoSell?.(i)) continue;
      candidates.push(i);
    }
    if (!candidates.length) return;
    const victimIx = candidates[Math.floor(rng() * candidates.length)];
    const victimId = String(owned[victimIx] ?? "");
    if (!victimId) return;
    if (ctx.destroyOtherTreasureFromSource) {
      await ctx.destroyOtherTreasureFromSource(ID, victimId, victimIx);
    } else if (ctx.destroyTreasureSlotById) {
      await ctx.destroyTreasureSlotById(victimId, victimIx);
    } else {
      ctx.clearTreasureSlotLeaveGapById?.(victimId) ?? ctx.clearTreasureSlotById?.(victimId);
    }
    await bankMultMulGain(ctx, ID, 0.5);
  },
};
