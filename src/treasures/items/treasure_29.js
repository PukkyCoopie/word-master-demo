import { describe, mult, prob, riskText } from "../treasureDescription.js";
import { isTreasureHookBlueprintMirror } from "../../game/treasureBlueprintMirror.js";
import { rollProbabilityFailsSkip } from "../treasureProbability.js";

const ID = "29";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "common",
  description: describe(
    mult("+50"),
    "倍率",
    "；在关卡完成时",
    prob("1/5"),
    "的概率爆炸",
    { type: "br" },
    riskText("（放得离其他宝藏远一点…）"),
  ),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  bypassNoSellForSelfDestruct: true,
  resolveSelfDestructBubble() {
    return { text: "爆炸！", kind: "bomb-blast" };
  },
  buildPostLetterStep() {
    return { multAdd: 50 };
  },
  async onLevelComplete(ctx) {
    if (isTreasureHookBlueprintMirror(ctx)) return;
    const rng = ctx.rng ?? Math.random;
    if (rollProbabilityFailsSkip(1, 5, rng, ctx.ownedSlotTreasureIds)) return;
    if (ctx.treasureRun) {
      ctx.treasureRun.treasure29SelfDestructed = true;
      ctx.treasureRun.probabilityEffectTriggered = true;
    }
    const bombSlotIndex =
      typeof ctx.hookSlotIndex === "number" && ctx.hookSlotIndex >= 0
        ? ctx.hookSlotIndex
        : (ctx.findOwnedTreasureSlotIndex?.(ID) ?? -1);
    if (ctx.destroyBombBlastAtSlot && bombSlotIndex >= 0) {
      await ctx.destroyBombBlastAtSlot(bombSlotIndex);
      return;
    }
    if (ctx.destroyTreasureSlotById) await ctx.destroyTreasureSlotById(ID, bombSlotIndex >= 0 ? bombSlotIndex : null);
    else ctx.clearTreasureSlotById?.(ID);
  },
};
