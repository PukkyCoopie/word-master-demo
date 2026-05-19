import { describe, mult } from "../treasureDescription.js";
import {
  addMultAddBank,
  getMultAddBank,
  patchCurrentBankDescription,
} from "../treasureBankHelpers.js";

const ID = "50";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 4,
  rarity: "common",
  description: describe("每拼写一个单词", mult("+1"), "倍率；每丢弃一次字母", mult("-1"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  ...patchCurrentBankDescription(ID, "multAdd"),
  buildPostLetterStep(ctx) {
    const v = getMultAddBank(ctx.treasureRun, ID);
    return v !== 0 ? { multAdd: v } : null;
  },
  onSuccessfulWordSubmit(ctx) {
    addMultAddBank(ctx.treasureRun, ID, 1);
  },
  onDiscardBatch(ctx) {
    addMultAddBank(ctx.treasureRun, ID, -1);
  },
};
