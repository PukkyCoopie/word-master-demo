import { describe, score } from "../treasureDescription.js";
import { addScoreAddBank, getScoreAddBank, patchCurrentBankDescription } from "../treasureBankHelpers.js";

const ID = "90";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  description: describe("你每有11个字母，", score("+12"), "分数"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  ...patchCurrentBankDescription(ID, "scoreAdd"),
  buildPostLetterStep(ctx) {
    const v = getScoreAddBank(ctx.treasureRun, ID);
    return v !== 0 ? { scoreAdd: v } : null;
  },
  onSuccessfulWordSubmit(ctx) {
    const rs = ctx.treasureRun;
    if (!rs) return;
    const len = Math.max(0, Math.round(Number(ctx.judgedWordLength) || 0));
    if (len <= 0) return;
    const before = Math.floor(rs.lettersScoredCount / 11);
    rs.lettersScoredCount += len;
    const after = Math.floor(rs.lettersScoredCount / 11);
    const gained = after - before;
    if (gained > 0) addScoreAddBank(rs, ID, gained * 12);
  },
};
