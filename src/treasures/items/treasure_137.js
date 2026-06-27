import { describe } from "../treasureDescription.js";
import { getScoreAddBank } from "../treasureBankHelpers.js";
import { ensureTreasureBank } from "../treasureRunState.js";

const ID = "137";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 7,
  rarity: "rare",
  description: describe(
    "当你以超额得分完成关卡时，会储存超过的部分，并在下个关卡的第一次拼写时提供该值的一半",
  ),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  onLevelComplete(ctx) {
    const rs = ctx.treasureRun;
    if (!rs) return;
    const target = Math.max(0, Math.floor(Number(ctx.targetScore) || 0));
    const score = Math.max(0, Math.floor(Number(ctx.currentScore) || 0));
    const excess = Math.max(0, score - target);
    ensureTreasureBank(rs, ID).scoreAdd = excess;
    rs.level137BonusApplied = false;
  },
  buildPostLetterStep(ctx) {
    const rs = ctx.treasureRun;
    if (!rs || rs.level137BonusApplied || rs.levelFirstWordSubmitted) return null;
    const stored = getScoreAddBank(rs, ID);
    if (stored <= 0) return null;
    const award = Math.floor(stored / 2);
    if (award <= 0) return null;
    rs.level137BonusApplied = true;
    ensureTreasureBank(rs, ID).scoreAdd = 0;
    return { scoreAdd: award };
  },
};
