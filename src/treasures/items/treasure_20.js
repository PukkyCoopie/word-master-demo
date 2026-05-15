import { describe, mult } from "../treasureDescription.js";
import { getBasketballChargeProgress, getBasketballChargeVisualState } from "../basketballProgress.js";

/** @type {import('../treasureTypes.js').TreasureBaseDef} */
export default {
  price: 5,
  rarity: "epic",
  description: describe("每拼写5个单词，具有一次", mult("x4"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep(ctx) {
    return getBasketballChargeVisualState(ctx.basketballWordsSubmitted) === "active"
      ? { multMul: 4 }
      : null;
  },
  getChargeVisualState(c) {
    return getBasketballChargeVisualState(c.chargeWordsSubmitted);
  },
  getChargeProgress(c) {
    return getBasketballChargeProgress(c.chargeWordsSubmitted);
  },
  onSuccessfulWordSubmit(submitCtx) {
    submitCtx.incrementChargeWordSubmissionCount();
  },
};
