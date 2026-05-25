import { isBossTileDebuffed } from "../../game/bossTileDebuff.js";
import { describe, score } from "../treasureDescription.js";
import { addScoreAddBank, getScoreAddBank, patchCurrentBankDescription } from "../treasureBankHelpers.js";
import { normalizeLetterChar } from "../treasureLifecycleShared.js";
import { ensureTreasureBank } from "../treasureRunState.js";

const ID = "80";
const SCORE_PER_B = 8;

/**
 * 本词首轮计分中的字母 b 数量（与 `getPerLetterScoreCue` 一致：不含 boss 弱化格、不含重播轮）。
 * @param {import('../treasureTypes.js').TreasureLogicContext} ctx
 */
function countFirstPassBLetters(ctx) {
  const parts = ctx.letterParts ?? [];
  const tiles = ctx.tiles ?? [];
  let n = 0;
  for (let i = 0; i < parts.length; i++) {
    if (tiles[i] && isBossTileDebuffed(tiles[i])) continue;
    if (normalizeLetterChar(parts[i]?.letter) !== "b") continue;
    n += 1;
  }
  return n;
}

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
    const rs = ctx.treasureRun;
    const bCount = countFirstPassBLetters(ctx);
    if (bCount > 0) addScoreAddBank(rs, ID, SCORE_PER_B * bCount);
    const v = getScoreAddBank(rs, ID);
    return v !== 0 ? { scoreAdd: v } : null;
  },
  getPerLetterScoreCue(ctx, part) {
    // 仅在该字母首轮计分时展示 +8；入账在 `buildPostLetterStep`，与字后「提供分数」同步。
    const visit = Math.max(0, Math.floor(Number(ctx?.scoringVisitIndex) || 0));
    if (visit > 0) return null;
    if (normalizeLetterChar(part?.letter) !== "b") return null;
    return { delta: SCORE_PER_B, label: `+${SCORE_PER_B}` };
  },
  async onSuccessfulWordSubmit(ctx) {
    const rs = ctx.treasureRun;
    if (!rs) return;
    ensureTreasureBank(rs, ID).scoreAdd = 0;
  },
};
