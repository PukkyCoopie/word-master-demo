import { getWordLetterCount } from "../../composables/useScoring.js";
import { describe, money } from "../treasureDescription.js";
import { resolveTreasureHookAnimSlotIndex } from "../../game/treasureBlueprintMirror.js";

const ID = "58";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  description: describe(
    "如果每关拼写的第一个单词只有3个字母，从字母库中移除这3个字母并获得",
    money("3"),
  ),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onSuccessfulWordSubmit(ctx) {
    const rs = ctx.treasureRun;
    if (!rs || rs.levelFirstWordSubmitted) return;
    rs.levelFirstWordSubmitted = true;

    const tiles = ctx.submittedScoringTiles;
    const wordLen = getWordLetterCount(Array.isArray(tiles) ? tiles : [], ctx.resolvedWord);
    rs.levelFirstWordLength = wordLen;
    if (wordLen !== 3) return;

    ctx.removeDeckCardsForSubmittedWord?.(ctx.resolvedWord);

    const slotIndex = resolveTreasureHookAnimSlotIndex(ctx);
    const playLeave = ctx.playSubmitWordLetterRemoveAndRewardLeave;
    const register = ctx.registerSubmitWordLeaveFx;
    if (!playLeave || !register) {
      await ctx.playOwnedTreasureMoneyFx?.(ID, 3, slotIndex != null ? { slotIndex } : {});
      return;
    }
    register(async ({ slotEls, gridEls, duration }) => {
      await playLeave({
        treasureId: ID,
        ...(slotIndex != null ? { treasureSlotIndex: slotIndex } : {}),
        slotEls,
        gridEls,
        duration,
        moneyAmount: 3,
      });
    });
  },
};
