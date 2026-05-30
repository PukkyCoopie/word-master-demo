import { isBossTileDebuffed } from "../../game/bossTileDebuff.js";
import { describe, score } from "../treasureDescription.js";
import { patchCurrentBankDescription } from "../treasureBankHelpers.js";
import { normalizeLetterChar } from "../treasureLifecycleShared.js";

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
  perLetterScoreCueDepositsTreasureBank: true,
  buildPostLetterStep(ctx) {
    const add = countFirstPassBLetters(ctx) * SCORE_PER_B;
    return add > 0 ? { scoreAdd: add } : null;
  },
  getPerLetterScoreCue(ctx, part) {
    const visit = Math.max(0, Math.floor(Number(ctx?.scoringVisitIndex) || 0));
    if (visit > 0) return null;
    if (normalizeLetterChar(part?.letter) !== "b") return null;
    return { delta: SCORE_PER_B, label: `+${SCORE_PER_B}` };
  },
};
