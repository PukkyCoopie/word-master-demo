import { concept, describe, prob } from "../treasureDescription.js";
import { rollProbabilitySuccess } from "../treasureProbability.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "rare",
  description: describe("有", prob("1/4"), "的几率", concept("升级"), "拼写单词的长度等级"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  onSuccessfulWordSubmit(ctx) {
    const rng = ctx.rng ?? Math.random;
    if (!rollProbabilitySuccess(1, 4, rng, ctx.ownedSlotTreasureIds)) return;
    const len = Math.max(0, Math.round(Number(ctx.judgedWordLength) || 0));
    if (len < 3 || len > 16) return;
    ctx.bumpWordLengthLevel?.(len);
  },
};
