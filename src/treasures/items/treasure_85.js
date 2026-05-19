import { describe } from "../treasureDescription.js";
import { tryOpenInRunPackOnPosProgress } from "../treasureInRunPackTriggers.js";

const ID = "85";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  description: describe("如果拼写的单词为副词，打开一个字母组合包"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onSuccessfulWordSubmit(ctx) {
    await tryOpenInRunPackOnPosProgress(ctx, {
      treasureId: ID,
      requireAdverb: true,
      packKind: "letter",
      requiredCount: 1,
    });
  },
};
