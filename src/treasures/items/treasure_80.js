import { describe, score } from "../treasureDescription.js";
import { addScoreAddBank, getScoreAddBank, patchCurrentBankDescription } from "../treasureBankHelpers.js";
import { normalizeLetterChar } from "../treasureLifecycleShared.js";

const ID = "80";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 8,
  rarity: "epic",
  description: describe("每当你拼写了字母b，获得", score("+8"), "分数"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  ...patchCurrentBankDescription(ID, "scoreAdd"),
  buildPostLetterStep(ctx) {
    const v = getScoreAddBank(ctx.treasureRun, ID);
    return v !== 0 ? { scoreAdd: v } : null;
  },
  getPerLetterScoreCue(ctx, part) {
    // 仅在该字母首轮计分时入账，避免重播轮（如配饰/额外轮）重复叠加银行。
    const visit = Math.max(0, Math.floor(Number(ctx?.scoringVisitIndex) || 0));
    if (visit > 0) return null;
    if (normalizeLetterChar(part?.letter) !== "b") return null;
    addScoreAddBank(ctx?.treasureRun, ID, 8);
    return { delta: 8, label: "+8" };
  },
};
