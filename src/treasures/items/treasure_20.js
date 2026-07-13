import { describe, mult } from "../treasureDescription.js";
import {
  assignOwnedSlotTreasureBank,
  canMutateTreasureBankFromCtx,
  readTreasureBankSnapshot,
} from "../treasureBankHelpers.js";
import {
  getBasketballChargeProgress,
  getBasketballChargeVisualState,
  getBasketballWordsSubmittedFromCtx,
} from "../basketballProgress.js";

const ID = "20";

/** @type {import('../treasureTypes.js').TreasureBaseDef} */
export default {
  price: 4,
  rarity: "rare",
  description: describe("每拼写5个单词，具有一次", mult("x4"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep(ctx) {
    const n = getBasketballWordsSubmittedFromCtx(ctx.treasureRun, ctx);
    return getBasketballChargeVisualState(n) === "active" ? { multMul: 4 } : null;
  },
  getChargeVisualState(c) {
    const n = getBasketballWordsSubmittedFromCtx(c.treasureRun, c);
    return getBasketballChargeVisualState(n);
  },
  getChargeProgress(c) {
    const n = getBasketballWordsSubmittedFromCtx(c.treasureRun, c);
    return getBasketballChargeProgress(n);
  },
  onSuccessfulWordSubmit(ctx) {
    const rs = ctx.treasureRun;
    if (!rs) return;
    if (!canMutateTreasureBankFromCtx(ctx, ID)) return;
    const bank = readTreasureBankSnapshot(rs, ID, ctx);
    const before = Math.max(0, Math.floor(Number(bank?.posPackProgress) || 0));
    assignOwnedSlotTreasureBank(ctx, ID, { posPackProgress: before + 1 });
  },
};
