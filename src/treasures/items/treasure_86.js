import { describe, mult } from "../treasureDescription.js";
import { bankMultMulGain, patchCurrentBankDescription } from "../treasureBankHelpers.js";

const ID = "86";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 7,
  rarity: "rare",
  description: describe("每当进入一个新的关卡，获得", mult("x0.5"), "倍率并随机摧毁一个其他宝藏"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  ...patchCurrentBankDescription(ID, "multMul"),
  buildPostLetterStep(ctx) {
    const m = ctx.treasureRun?.banks?.[ID]?.multMul ?? 1;
    return m > 1 ? { multMul: m } : null;
  },
  async onLevelEnter(ctx) {
    await bankMultMulGain(ctx, ID, 0.5, "×0.5");
    const rng = ctx.rng ?? Math.random;
    const owned = ctx.ownedSlotTreasureIds ?? [];
    const candidates = [];
    for (let i = 0; i < owned.length; i += 1) {
      const tid = owned[i];
      if (tid && tid !== ID) candidates.push(tid);
    }
    if (!candidates.length) return;
    const victimId = candidates[Math.floor(rng() * candidates.length)];
    const runDestroy = () => {
      if (ctx.destroyOtherTreasureFromSource) {
        return ctx.destroyOtherTreasureFromSource(ID, victimId);
      }
      if (ctx.destroyTreasureSlotById) return ctx.destroyTreasureSlotById(victimId);
      ctx.clearTreasureSlotById?.(victimId);
      return undefined;
    };
    if (ctx.scheduleAfterGridTilesSettled) {
      ctx.scheduleAfterGridTilesSettled(runDestroy);
      return;
    }
    await runDestroy();
  },
};
