import { concept, describe, prob } from "../treasureDescription.js";
import { rollProbabilitySuccess } from "../treasureProbability.js";

const ID = "39";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "rare",
  description: describe("有", prob("1/4"), "的几率", concept("升级"), "拼写单词的长度等级"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onSuccessfulWordSubmit(ctx) {
    const rng = ctx.rng ?? Math.random;
    if (!rollProbabilitySuccess(1, 4, rng, ctx.ownedSlotTreasureIds)) return;
    const len = Math.max(0, Math.round(Number(ctx.judgedWordLength) || 0));
    if (len < 3 || len > 16) return;
    const slotIx = Math.max(0, Math.floor(Number(ctx.hookSlotIndex) || 0));
    const runCue = async () => {
      const wobbleTask =
        typeof ctx.wobbleOwnedTreasureAtSlot === "function"
          ? ctx.wobbleOwnedTreasureAtSlot(slotIx)
          : typeof ctx.playOwnedTreasureWobbleOnlyFx === "function"
            ? ctx.playOwnedTreasureWobbleOnlyFx(ID)
            : Promise.resolve(ctx.wobbleOwnedTreasureById?.(ID));
      const bubbleTask =
        typeof ctx.playOwnedTreasureBubbleOnlyFxAtSlot === "function"
          ? ctx.playOwnedTreasureBubbleOnlyFxAtSlot(slotIx, "升级", "upgrade")
          : typeof ctx.playOwnedTreasureBubbleOnlyFx === "function"
            ? ctx.playOwnedTreasureBubbleOnlyFx(ID, "升级", "upgrade")
            : Promise.resolve(ctx.playOwnedTreasureBubbleFx?.(ID, "升级", "upgrade"));
      await Promise.all([bubbleTask, wobbleTask]);
    };
    if (typeof ctx.registerSubmitAccessoryUpgradeCue === "function") {
      ctx.registerSubmitAccessoryUpgradeCue(runCue);
      const step =
        typeof ctx.buildInRunLengthUpgradeStep === "function" ? ctx.buildInRunLengthUpgradeStep(len) : null;
      if (step && typeof ctx.registerSubmitAccessoryUpgradeStep === "function") {
        ctx.registerSubmitAccessoryUpgradeStep(step);
        return;
      }
      ctx.bumpWordLengthLevel?.(len);
      return;
    }
    const runFx = async () => {
      await runCue();
      if (typeof ctx.runSingleInRunLengthUpgradeFx === "function") {
        await ctx.runSingleInRunLengthUpgradeFx(len);
        return;
      }
      ctx.bumpWordLengthLevel?.(len);
    };
    if (typeof ctx.registerSubmitPostScoreClearFx === "function") {
      ctx.registerSubmitPostScoreClearFx(runFx);
      return;
    }
    await runFx();
  },
};
