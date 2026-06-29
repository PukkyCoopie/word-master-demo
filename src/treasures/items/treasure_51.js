import { describe } from "../treasureDescription.js";
import { resolveSubmittedWordForHooks } from "../../game/resolvedWordTileMapping.js";
import { wordEndsWithSuffix } from "../../game/wordPosMatch.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 4,
  rarity: "common",
  description: describe("如果你拼写的单词以tion结尾，随机释放一个法术"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onSuccessfulWordSubmit(ctx) {
    const word = resolveSubmittedWordForHooks(ctx.resolvedWord, ctx.submittedScoringTiles);
    if (!wordEndsWithSuffix(word, "tion")) return;
    const slotIx = ctx.findOwnedTreasureSlotIndex?.("51") ?? -1;
    const runGrant = async () => {
      await ctx.requestInRunSpellGrant?.({
        treasureId: "51",
        treasureSlotIndex: slotIx >= 0 ? slotIx : undefined,
      });
    };
    if (typeof ctx.registerSubmitAfterWordLeaveFx === "function") {
      ctx.registerSubmitAfterWordLeaveFx(runGrant);
      return;
    }
    await runGrant();
  },
};
