import { describe } from "../treasureDescription.js";
import { tryOpenInRunPackOnWordMatch } from "../treasureInRunPackTriggers.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "rare",
  description: describe("如果拼写的单词为副词，打开一个字母组合包"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onSuccessfulWordSubmit(ctx) {
    await tryOpenInRunPackOnWordMatch(ctx, {
      treasureId: "85",
      requireAdverb: true,
      packKind: "letter",
    });
  },
};
