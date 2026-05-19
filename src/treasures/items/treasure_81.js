import { describe } from "../treasureDescription.js";
import { tryOpenInRunPackOnWordMatch } from "../treasureInRunPackTriggers.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  description: describe("如果拼写的单词为动词且以ify结尾，打开一个法术组合包"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onSuccessfulWordSubmit(ctx) {
    await tryOpenInRunPackOnWordMatch(ctx, {
      treasureId: "81",
      suffix: "ify",
      posKey: "v",
      packKind: "spell",
    });
  },
};
