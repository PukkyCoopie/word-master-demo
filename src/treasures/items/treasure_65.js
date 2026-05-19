import { describe, score } from "../treasureDescription.js";
import { addScoreAddBank, getScoreAddBank } from "../treasureBankHelpers.js";
import { letterInCurrentDiscardGroup } from "../treasureRunState.js";

const ID = "65";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  description: describe("每当你弃掉一张abcde，获得", score("+3"), "分数", "（字母每回合都会变化）"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  patchDescription(ctx) {
    const g = String(ctx.discardLetterGroup ?? "abcde");
    return describe(`（当前组：${g.toUpperCase()}）`);
  },
  buildPostLetterStep(ctx) {
    const v = getScoreAddBank(ctx.treasureRun, ID);
    return v !== 0 ? { scoreAdd: v } : null;
  },
  onDiscardBatch(ctx) {
    const rs = ctx.treasureRun;
    if (!rs) return;
    const letters = ctx.discardedLetters ?? [];
    if (!letters.length) return;
    for (const p of letters) {
      if (!letterInCurrentDiscardGroup(p?.letter, rs)) return;
    }
    addScoreAddBank(rs, ID, 3);
  },
};
