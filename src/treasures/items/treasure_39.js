import { concept, describe, prob } from "../treasureDescription.js";
import { resolveLengthUpgradeLen } from "../../game/wordLengthBalance.js";
import { rollProbabilitySuccess } from "../treasureProbability.js";
import { playTreasureHookBubbleOnlyFx, wobbleTreasureHookContributor } from "../treasureBankHelpers.js";

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
    const len = resolveLengthUpgradeLen(ctx.judgedWordLength);
    if (len == null) return;
    if (ctx.skipSettlementFx === true) {
      const step =
        typeof ctx.buildInRunLengthUpgradeStep === "function" ? ctx.buildInRunLengthUpgradeStep(len) : null;
      if (step && typeof ctx.registerSubmitAccessoryUpgradeStep === "function") {
        ctx.registerSubmitAccessoryUpgradeStep(step);
        return;
      }
      ctx.bumpWordLengthLevel?.(len);
      return;
    }
    const runCue = async () => {
      await Promise.all([
        wobbleTreasureHookContributor(ctx, ID),
        playTreasureHookBubbleOnlyFx(ctx, ID, "升级", "upgrade"),
      ]);
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
