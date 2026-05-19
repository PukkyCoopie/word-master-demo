import { describe, score } from "../treasureDescription.js";
import { addScoreAddBank, getScoreAddBank, patchCurrentBankDescription } from "../treasureBankHelpers.js";
import { normalizeLetterChar } from "../treasureLifecycleShared.js";

const ID = "80";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 8,
  rarity: "epic",
  description: describe("每当你拼写了字母b，获得", score("+8"), "分数", "（当前+0）"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  ...patchCurrentBankDescription(ID, "scoreAdd"),
  buildPostLetterStep(ctx) {
    const v = getScoreAddBank(ctx.treasureRun, ID);
    return v !== 0 ? { scoreAdd: v } : null;
  },
  onSuccessfulWordSubmit(ctx) {
    let count = 0;
    for (const p of ctx.submittedLetters ?? []) {
      if (normalizeLetterChar(p?.letter) === "b") count += 1;
    }
    if (count > 0) addScoreAddBank(ctx.treasureRun, ID, count * 8);
  },
};
